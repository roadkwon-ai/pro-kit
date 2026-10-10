#!/usr/bin/env node
// dev-cycle 경량 러너: case | table | status | audit | close | archive | secrets
// 절차 정본은 docs/dev-workflow.md, 판정 규칙은 .dev-cycle.json이다.
import { execFileSync, spawnSync } from "node:child_process";
import {
	closeSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	openSync,
	readdirSync,
	readFileSync,
	realpathSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
	main as delegationMain,
	resolveProvider,
	validateDelegationPacket,
} from "./delegation.mjs";
import { main as resourceMain } from "./resource-guard.mjs";

const DEFAULTS = {
	todoPath: "tasks/todo.md",
	archiveDir: "tasks/archive",
	workflowDoc: "docs/dev-workflow.md",
	defaultBranch: "main",
	rules: [],
	authPaths: null,
	ui: { auditMin: 16, a11yMin: 3 },
	commands: {},
};
export const CASES = ["A", "B", "C", "D", "E", "F", "H"];
const LAYERS = ["E", "D", "B"];

export class UsageError extends Error {}

export function loadConfig(root) {
	const p = join(root, ".dev-cycle.json");
	let cfg = {};
	try {
		cfg = existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {};
	} catch (e) {
		throw new UsageError(`.dev-cycle.json을 읽을 수 없다: ${e.message}`);
	}
	return { ...DEFAULTS, ...cfg };
}

function git(root, args) {
	return execFileSync("git", args, {
		cwd: root,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "ignore"],
		// 기본 1MB를 넘는 diff(secrets의 스테이징 변경)에서 ENOBUFS로 멈추지 않게 한다.
		maxBuffer: 256 * 1024 * 1024,
	});
}

const splitZ = (s) => s.split("\0").filter(Boolean);

// 기준점은 todo.md에서 다시 읽히므로 git 옵션(--output=… 등)으로 해석되지 않게 형식을 제한한다.
const SHA_RE = /^[0-9a-f]{4,64}$/;
const commitOf = (root, ref) => {
	try {
		// --end-of-options는 쓰지 않는다: 오래된 git(2.25 등)의 rev-parse가 모른다. '-'로 시작하는 ref는 호출 전에 거른다.
		return git(root, [
			"rev-parse",
			"--verify",
			"--quiet",
			`${ref}^{commit}`,
		]).trim();
	} catch {
		return null;
	}
};

export function resolveBase(root, config) {
	if (!commitOf(root, "HEAD")) return null;
	const branch = git(root, ["branch", "--show-current"]).trim();
	// 설정 브랜치가 없을 때(BTS는 master로 초기화한다) 기능 브랜치의 커밋이 diff에서 빠지지 않도록 후보를 차례로 본다.
	const candidates = [
		...new Set([
			config.defaultBranch,
			`origin/${config.defaultBranch}`,
			"main",
			"master",
		]),
	];
	// 기본 브랜치 위에서는 push하지 않은 이전 커밋이 새 라운드에 섞이지 않도록 HEAD를 쓴다.
	if (
		branch &&
		candidates.some((c) => c === branch || c === `origin/${branch}`)
	)
		return commitOf(root, "HEAD");
	for (const ref of candidates) {
		if (!ref || ref === branch || ref.startsWith("-")) continue;
		const c = commitOf(root, ref);
		if (c) return git(root, ["merge-base", "HEAD", c]).trim();
	}
	return commitOf(root, "HEAD");
}

export function changedFiles(root, base) {
	if (base && !SHA_RE.test(base))
		throw new UsageError(`기준점이 커밋 해시가 아니다: ${base}`);
	const untracked = splitZ(
		git(root, ["ls-files", "-z", "--others", "--exclude-standard"]),
	);
	// --relative: 상위 저장소의 하위 폴더에서 실행해도 ls-files처럼 현재 폴더 기준 경로를 쓴다.
	const tracked = base
		? splitZ(
				git(root, [
					"diff",
					"-z",
					"--name-only",
					"--no-renames",
					"--relative",
					base,
					"--",
				]),
			)
		: splitZ(git(root, ["ls-files", "-z"]));
	return [...new Set([...tracked, ...untracked])].sort();
}

export function classify(files, config) {
	const re = (src, where) => {
		try {
			return new RegExp(src);
		} catch (e) {
			throw new UsageError(
				`.dev-cycle.json ${where} 정규식 오류: ${e.message}`,
			);
		}
	};
	const rules = config.rules.map((r) => ({
		...r,
		re: re(r.match, `rules(${r.case})`),
	}));
	const authRe = config.authPaths ? re(config.authPaths, "authPaths") : null;
	const layers = new Set();
	const evidence = [];
	let harness = false;
	let auth = false;
	for (const file of files) {
		const rule = rules.find((r) => r.re.test(file));
		const isAuth = authRe ? authRe.test(file) : false;
		if (isAuth) auth = true;
		if (!rule && !isAuth) continue;
		if (rule?.case === "H") harness = true;
		else if (rule) layers.add(rule.case);
		evidence.push({
			file,
			case: rule?.case ?? null,
			why: rule?.why ?? null,
			auth: isAuth,
		});
	}
	const list = LAYERS.filter((c) => layers.has(c));
	const pathCase =
		list.length === 0
			? harness
				? "H"
				: "A"
			: list.length === 1
				? list[0]
				: "F";
	return { pathCase, layers: list, harness, auth, evidence };
}

export const SECURITY_ROW =
	"[review] prokit-reviewer(security) → verdict, max_severity, 반영·기각 내역";

export function parseWorkflow(md) {
	const blocks = {};
	let key = null;
	for (const line of md.split(/\r?\n/)) {
		const h = line.match(/^###\s+(공통|[A-Z])(?=[.\s]|$)/);
		if (h) {
			key = h[1] === "공통" ? "COMMON" : h[1];
			blocks[key] = [];
			continue;
		}
		if (/^#{1,2}\s/.test(line)) {
			key = null;
			continue;
		}
		const m = key && line.match(/^-\s+(.*\S)\s*$/);
		if (!m) continue;
		const text = m[1];
		const inc = text.match(/^@include\s+(.+)$/);
		const inh = text.match(/^@inherit\s+(.+)$/);
		if (inc) blocks[key].push({ include: inc[1].trim().split(/\s+/) });
		else if (inh) blocks[key].push({ inherit: inh[1].trim().split(/\s+/) });
		else blocks[key].push({ text, tag: text.match(/^\[(\w+)\]/)?.[1] ?? null });
	}
	return blocks;
}

export function buildRows(workflow, caseKey, cls) {
	if (!workflow[caseKey])
		throw new UsageError(`${caseKey} 케이스 블록이 워크플로 문서에 없다`);
	const expand = (key, stack) => {
		if (stack.includes(key))
			throw new UsageError(`@include 순환: ${[...stack, key].join(" → ")}`);
		const rows = [];
		for (const item of workflow[key] ?? []) {
			if (item.include) {
				for (const k of item.include) rows.push(...expand(k, [...stack, key]));
			} else if (item.inherit) {
				const src = cls.pathCase;
				if (src !== key) {
					rows.push(
						...expand(src, [...stack, key]).filter((r) =>
							item.inherit.includes(r.tag),
						),
					);
				}
			} else {
				rows.push({ text: item.text, tag: item.tag });
			}
		}
		return rows;
	};
	const out = [];
	const seen = new Set();
	const push = (r) => {
		if (seen.has(r.text)) return;
		seen.add(r.text);
		out.push(r);
	};
	expand(caseKey, []).forEach(push);
	if (cls.harness && caseKey !== "H") expand("H", []).forEach(push);
	if (
		cls.auth &&
		!out.some((r) => r.text.includes("prokit-reviewer(security)"))
	)
		push({ text: SECURITY_ROW, tag: "review" });
	expand("COMMON", []).forEach(push);
	return out;
}

const START_RE = /<!-- dev-cycle:start (.*?) -->/;
const END_TAG = "<!-- dev-cycle:end -->";
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|");

export function renderBlock(meta, rows, extra = []) {
	const lines = [
		`<!-- dev-cycle:start case=${meta.case} base=${meta.base ?? "none"} auth=${Boolean(meta.auth)} opened=${meta.opened}${meta.delegation ? ` delegation=${meta.delegation}` : ""} -->`,
		`## 활성 라운드: ${meta.case} — ${meta.title}`,
		"| # | 단계 | 증거 |",
		"|---|---|---|",
		...rows.map((r, i) => `| ${i + 1} | ${esc(r.text)} | ${esc(r.evidence)} |`),
		...(extra.length ? ["", ...extra] : []),
		END_TAG,
	];
	return lines.join("\n");
}

export function parseActive(md) {
	const start = md.search(START_RE);
	if (start < 0) return null;
	const endAt = md.indexOf(END_TAG, start);
	if (endAt < 0)
		throw new UsageError("dev-cycle:end 마커가 없다. tasks/todo.md를 확인한다");
	const end = endAt + END_TAG.length;
	const block = md.slice(start, end);
	const meta = Object.fromEntries(
		[...block.match(START_RE)[1].matchAll(/(\w+)=(\S+)/g)].map((m) => [
			m[1],
			m[2],
		]),
	);
	meta.auth = meta.auth === "true";
	if (meta.base === "none") meta.base = null;
	if (meta.base && !SHA_RE.test(meta.base))
		throw new UsageError(`마커의 base가 커밋 해시가 아니다: ${meta.base}`);
	const title = block.match(/^## 활성 라운드: \S+ — (.*)$/m)?.[1] ?? "";
	const rows = [];
	const extra = [];
	const lines = block.split(/\r?\n/).slice(1, -1);
	const layout = /^## 활성 라운드: |^\|\s*#\s*\||^\|[\s:|-]+\|$/;
	for (const line of lines) {
		if (!/^\|\s*\d+\s*\|/.test(line)) {
			// 번호 행이 아닌 줄(메모, 번호 없는 수동 행)은 --upgrade 때 그대로 옮긴다.
			if (line.trim() && !layout.test(line.trim())) extra.push(line);
			continue;
		}
		const t = line.trim();
		const [, afterNo, afterText] = [...t.matchAll(/(?<!\\)\|/g)].map(
			(m) => m.index,
		);
		const unesc = (s) => s.trim().replace(/\\\|/g, "|");
		// 손으로 적은 증거에는 이스케이프 안 된 `|`(예: pnpm test | tail, ||)가 들 수 있다.
		// 칸을 나눠 다시 붙이면 원문이 바뀌므로 셋째 칸 시작부터 줄 끝까지를 그대로 쓰고 끝의 `|`와 공백만 벗긴다.
		const rest =
			afterText === undefined
				? ""
				: t.slice(afterText + 1).replace(/(?:\s|(?<!\\)\|)+$/, "");
		rows.push({
			text: unesc(t.slice(afterNo + 1, afterText)),
			evidence: unesc(rest),
		});
	}
	return { meta, title, rows, extra, start, end };
}

export function readWorkflow(root, config) {
	return parseWorkflow(readFileSync(join(root, config.workflowDoc), "utf8"));
}

function readTodo(root, config) {
	const p = join(root, config.todoPath);
	return existsSync(p) ? readFileSync(p, "utf8") : null;
}

export function writeTable(
	root,
	config,
	caseKey,
	{
		upgrade = false,
		title,
		write = false,
		delegation = false,
		now = new Date(),
	} = {},
) {
	const md = readTodo(root, config) ?? "# 작업\n";
	const active = parseActive(md);
	if (write && active && !upgrade)
		throw new UsageError(
			"활성 라운드가 이미 있다. close로 닫거나 --upgrade를 쓴다",
		);
	if (upgrade && !active)
		throw new UsageError("--upgrade할 활성 라운드가 없다");
	const base = active ? active.meta.base : resolveBase(root, config);
	const cls = classify(changedFiles(root, base), config);
	const key = caseKey ?? cls.pathCase;
	if (!CASES.includes(key))
		throw new UsageError(
			`알 수 없는 케이스: ${key} (가능: ${CASES.join(", ")})`,
		);
	const rows = buildRows(readWorkflow(root, config), key, cls).map((r) => ({
		...r,
		evidence: "",
	}));
	const extra = [...(active?.extra ?? [])];
	if (active && upgrade) {
		const old = new Map(active.rows.map((r) => [r.text, r.evidence]));
		for (const r of rows) r.evidence = old.get(r.text) ?? "";
		const kept = new Set(rows.map((r) => r.text));
		// 새 케이스에 없는 이전 행(직접 추가한 행 포함)은 끝의 사용자 확인 행 앞에 둔다.
		const carried = active.rows
			.filter((r) => !kept.has(r.text))
			.filter((r) => {
				if (
					rows.some((row) => row.text.includes("prokit-reviewer(plan)")) &&
					r.text.startsWith("[review] 계획 리뷰 (plan-eng-review,")
				) {
					extra.push(
						`- 이전 계획 리뷰(참고, 재검토 필요): ${r.evidence || "증거 없음"}`,
					);
					return false;
				}
				return true;
			})
			.map((r) => ({ text: r.text, evidence: r.evidence }));
		const vitest = carried.findIndex(
			(r) => r.text === "vitest 도입(최초 1회) → 설정 파일과 실행 결과",
		);
		if (vitest >= 0) rows.unshift(carried.splice(vitest, 1)[0]);
		const at = rows.findIndex((r) => r.tag === "confirm");
		rows.splice(at < 0 ? rows.length : at, 0, ...carried);
	}
	const meta = {
		case: key,
		base,
		auth: cls.auth || Boolean(active?.meta.auth),
		opened: active?.meta.opened ?? now.toISOString().slice(0, 10),
		delegation:
			active?.meta.delegation ?? (delegation ? "required" : undefined),
		title: title ?? active?.title ?? "제목 없음",
	};
	const block = renderBlock(meta, rows, upgrade ? extra : []);
	if (write) {
		const next = active
			? md.slice(0, active.start) + block + md.slice(active.end)
			: `${md.replace(/\s*$/, "")}\n\n${block}\n`;
		const p = join(root, config.todoPath);
		mkdirSync(dirname(p), { recursive: true });
		writeFileSync(p, next);
	}
	return { case: key, base, rows: rows.length, auth: meta.auth, block };
}

const EVIDENCE_MAX_BYTES = 64 * 1024;
const TABLE_HEADER_RE = /^\|\s*#\s*\|\s*단계\s*\|\s*증거\s*\|\s*$/;
const TABLE_SEPARATOR_RE = /^\|[\s:|-]+\|$/;

function splitLines(text) {
	const lines = [];
	let offset = 0;
	for (const match of text.matchAll(/\r\n|\r|\n/g)) {
		lines.push({ line: text.slice(offset, match.index), offset });
		offset = match.index + match[0].length;
	}
	if (offset < text.length) lines.push({ line: text.slice(offset), offset });
	return lines;
}

function evidenceRow(block, row) {
	const candidates = [];
	let fence = null;
	let header = false;
	let table = false;
	for (const item of splitLines(block)) {
		const marker = item.line.match(/^\s*(`{3,}|~{3,})/)?.[1];
		if (marker) {
			if (!fence) fence = marker;
			else if (marker[0] === fence[0] && marker.length >= fence.length)
				fence = null;
			continue;
		}
		if (fence) continue;
		if (TABLE_HEADER_RE.test(item.line)) {
			header = true;
			table = false;
			continue;
		}
		if (header && TABLE_SEPARATOR_RE.test(item.line)) {
			table = true;
			continue;
		}
		if (!/^\|/.test(item.line)) {
			table = false;
			continue;
		}
		if (table && new RegExp(`^\\|\\s*${row}\\s*\\|.*$`).test(item.line))
			candidates.push(item);
	}
	if (candidates.length !== 1)
		throw new UsageError(
			`활성 대조표에 행 번호 ${row}이 정확히 하나 있어야 한다`,
		);
	return candidates[0];
}

// 증거 셀은 표 전체를 다시 렌더하지 않고 해당 행의 마지막 셀만 바꾼다.
// 한 줄 입력만 받아 Markdown 표·메모·코드 블록의 구조를 보존한다.
export function setEvidence(root, config, row, evidenceFile) {
	if (!Number.isSafeInteger(row) || row < 1)
		throw new UsageError("행 번호는 1 이상의 정수여야 한다");
	const md = readTodo(root, config);
	const active = md && parseActive(md);
	if (!active) throw new UsageError("활성 라운드가 없다");
	if (!evidenceFile || evidenceFile.startsWith("--"))
		throw new UsageError("--file 뒤에 프로젝트 안 증거 파일을 넣는다");
	const base = realpathSync(root);
	const requested = resolve(base, evidenceFile);
	let file;
	try {
		file = realpathSync(requested);
	} catch (error) {
		throw new UsageError(`증거 파일을 읽을 수 없다: ${error.message}`);
	}
	if (!file.startsWith(`${base}${sep}`))
		throw new UsageError("증거 파일은 프로젝트 밖을 가리킬 수 없다");
	let stat;
	try {
		stat = statSync(file);
	} catch (error) {
		throw new UsageError(`증거 파일을 확인할 수 없다: ${error.message}`);
	}
	if (!stat.isFile()) throw new UsageError("증거 파일은 일반 파일이어야 한다");
	if (stat.size > EVIDENCE_MAX_BYTES)
		throw new UsageError("증거 파일이 너무 크다");
	const evidence = readFileSync(file, "utf8");
	if (!evidence.trim()) throw new UsageError("증거 파일이 비어 있다");
	if (evidence.includes("\0"))
		throw new UsageError("증거 파일에 NUL 문자가 있다");
	if (/[\r\n]/.test(evidence))
		throw new UsageError("증거 파일은 한 줄이어야 한다");
	if (
		Buffer.byteLength(evidence) > EVIDENCE_MAX_BYTES ||
		statSync(file).size > EVIDENCE_MAX_BYTES
	)
		throw new UsageError("증거 파일이 너무 크다");
	const block = md.slice(active.start, active.end);
	const { line, offset: lineOffset } = evidenceRow(block, row);
	const marks = [...line.matchAll(/(?<!\\)\|/g)].map((match) => match.index);
	if (marks.length < 4)
		throw new UsageError(`행 번호 ${row}의 표 형식이 올바르지 않다`);
	const replaced = `${line.slice(0, marks[2] + 1)} ${esc(evidence)} ${line.slice(marks.at(-1))}`;
	const replaceAt = active.start + lineOffset;
	writeFileSync(
		join(root, config.todoPath),
		`${md.slice(0, replaceAt)}${replaced}${md.slice(replaceAt + line.length)}`,
	);
	return { row, evidence };
}

const PLACEHOLDERS = new Set(["✓", "✔", "-", "ok", "done", "todo", "tbd"]);

// 증거를 `blocked: x`처럼 따옴표·백틱으로 감싸도 같은 표시로 읽는다.
const bare = (e) =>
	String(e ?? "")
		.trim()
		.replace(/^[`'"]+/, "");

export function evidenceProblem(e) {
	const v = bare(e);
	if (!v) return "증거 칸이 비어 있다";
	if (/^n\/a(?![a-z])/i.test(v))
		return /^n\/a\s*:\s*\S/i.test(v) ? null : "N/A에 사유가 없다 (N/A: 사유)";
	if (/^(blocked|미실행)(?![a-z])/i.test(v))
		return /^(blocked|미실행)\s*:\s*\S/i.test(v)
			? null
			: "blocked·미실행에 사유가 없다 (blocked: 사유)";
	if (PLACEHOLDERS.has(v.toLowerCase()) || v.replace(/\s/g, "").length < 4)
		return "형식만 채운 증거다";
	return null;
}

// 사용자 확인 행([confirm])은 N/A·PASS·blocked·미실행·대기 같은 건너뛰기 표시로 채울 수 없다.
// 사용자가 결과를 확인해야 라운드를 닫는다(close --partial로도 넘기지 못한다).
const SKIP_RE =
	/^(?:(?:n\s*\/?\s*a|pass|blocked|todo|tbd|pending)(?![a-z])|skip|미실행|생략|해당\s*없|대기)|대기(?:\s*중)?$/i;

export function confirmProblem(row) {
	if (!/^\[confirm\]/i.test(row.text)) return null;
	return SKIP_RE.test(bare(row.evidence).replace(/^[*_(\s]+/, ""))
		? "사용자 확인 행은 N/A·PASS·blocked·미실행으로 넘길 수 없다 (사용자가 확인한 내용과 날짜)"
		: null;
}

const rowProblem = (r) => {
	const problem = confirmProblem(r) ?? evidenceProblem(r.evidence);
	if (problem) return problem;
	const value = bare(r.evidence);
	if (/^(blocked|미실행)\s*:\s*\S/i.test(value)) return null;
	if (
		r.text.includes("prokit-reviewer(plan)") &&
		!/^prokit-reviewer\(plan\):\s*approve,\s*max=(none|low|medium)(?:,|$)/.test(
			value,
		)
	)
		return "계획 리뷰 증거는 prokit-reviewer(plan): approve, max=none|low|medium 결과여야 한다 (N/A 불가)";
	if (
		r.text.startsWith("[design]") &&
		!["기존", "결정", "설정", "검증"].every((field) =>
			new RegExp(`(?:^|;\\s*)${field}:\\s*[^;\\s]`).test(value),
		)
	)
		return "설계 증거에 기존: 경로·소비자; 결정: 재사용·분리; 설정: 환경 변수·설정 영향; 검증: 회귀 검사를 적는다";
	return null;
};

export function audit(
	root,
	config,
	{ delegationPacket, delegationContext } = {},
) {
	const md = readTodo(root, config);
	const active = md && parseActive(md);
	if (!active)
		return {
			ok: false,
			problems: [
				'활성 라운드가 없다 — pnpm dev-cycle table <케이스> --write --title "<요약>"으로 연다',
			],
		};
	const problems = [];
	active.rows.forEach((r, i) => {
		const p = rowProblem(r);
		if (p) problems.push(`#${i + 1} ${r.text}: ${p}`);
	});
	const X = active.meta.case;
	const cls = classify(changedFiles(root, active.meta.base), config);
	if (!["C", "F"].includes(X) && ![X, "A"].includes(cls.pathCase)) {
		problems.push(
			`케이스 상향 필요: 현재 diff 판정은 ${cls.pathCase} → pnpm dev-cycle table ${cls.pathCase} --write --upgrade`,
		);
	} else {
		const have = new Set(active.rows.map((r) => r.text));
		for (const r of buildRows(readWorkflow(root, config), X, cls)) {
			if (!have.has(r.text))
				problems.push(
					`필수 행 누락: ${r.text} → pnpm dev-cycle table ${X} --write --upgrade`,
				);
		}
	}
	if (existsSync(join(root, ".claude/agents"))) {
		const r = spawnSync(
			process.execPath,
			[join(root, "scripts/sync-agents.mjs"), "--check"],
			{ cwd: root, encoding: "utf8" },
		);
		if (r.status !== 0)
			problems.push(
				`에이전트 정의 불일치 — pnpm agents:sync 실행: ${`${r.stdout}${r.stderr}`.trim()}`,
			);
	}
	if (active.meta.delegation === "required" && !delegationPacket)
		problems.push(
			"위임 라운드는 현재 완료 attest 패킷과 Main runtime 검증이 필요하다",
		);
	if (delegationPacket) {
		let result;
		const runtime = delegationContext?.trustedMainRuntime;
		try {
			result = validateDelegationPacket(
				root,
				delegationPacket,
				runtime ? { ...delegationContext, ...runtime } : delegationContext,
			);
		} catch (error) {
			problems.push(`위임 증거 검증을 실행하지 못했다: ${error.message}`);
			return { ok: false, problems, case: X, pathCase: cls.pathCase };
		}
		const completion = delegationCompletionProblem(result, runtime);
		if (completion) problems.push(`위임 완료 검증 실패: ${completion}`);
		else if (!result.ok)
			problems.push(`위임 증거 검증 실패: ${result.problems.join("; ")}`);
	}
	return {
		ok: problems.length === 0,
		problems,
		case: X,
		pathCase: cls.pathCase,
	};
}

export function delegationCompletionProblem(result, runtime) {
	if (!result?.ok || result.status !== "complete" || !result.completionReady)
		return "완료 가능한 Main 검증 결과가 아니다";
	if (
		!runtime ||
		typeof runtime.verifyAuthority !== "function" ||
		typeof runtime.verifyReceipt !== "function"
	)
		return "Main runtime 권위·receipt 검증기가 없다";
	return null;
}

export function status(root, config) {
	const md = readTodo(root, config);
	const active = md && parseActive(md);
	if (!active) {
		return {
			active: false,
			line: '활성 라운드 없음 — pnpm dev-cycle case로 판정한 뒤 pnpm dev-cycle table <케이스> --write --title "<요약>"으로 연다 (케이스는 요청 기준, 아직 diff가 없으면 판정은 A)',
		};
	}
	const filled = active.rows.filter((r) => !rowProblem(r)).length;
	const next = active.rows.find(rowProblem)?.text ?? null;
	const line = `라운드 ${active.meta.case} "${active.title}" — ${filled}/${active.rows.length}칸 — 다음: ${next ?? "audit 후 close"}`;
	return {
		active: true,
		case: active.meta.case,
		filled,
		total: active.rows.length,
		next,
		line,
	};
}

// 아카이브 날짜는 릴리스 노트와 같은 한국 시간으로 쓴다.
const archiveDay = (now) =>
	new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(now);

function archiveFile(root, config, day, title) {
	const slug =
		title
			.normalize("NFKC")
			.replace(/[^\p{L}\p{N}]+/gu, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 64) || "완료-기록";
	const dir = join(root, config.archiveDir);
	mkdirSync(dir, { recursive: true });
	let file = join(dir, `${day}-${slug}.md`);
	for (let n = 2; existsSync(file); n++)
		file = join(dir, `${day}-${slug}-${n}.md`);
	return file;
}

function replaceArchiveFile(file, text) {
	const dir = mkdtempSync(join(dirname(file), ".dev-cycle-"));
	try {
		const tmp = join(dir, "content");
		writeFileSync(tmp, text);
		renameSync(tmp, file);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

function archiveIndex(root, config) {
	const dir = join(root, config.archiveDir);
	const files = readdirSync(dir)
		.filter((f) => f.endsWith(".md") && f !== "README.md")
		.sort((a, b) => b.localeCompare(a, "ko", { numeric: true }));
	const rows = files.map((file) => {
		const title =
			readFileSync(join(dir, file), "utf8").match(/^#{1,6} (.+)$/m)?.[1] ??
			file;
		const day = file.match(/^\d{4}-\d{2}(?:-\d{2})?/)?.[0] ?? "";
		return `| ${day} | [${esc(title)}](${file}) |`;
	});
	replaceArchiveFile(
		join(dir, "README.md"),
		"# 완료 작업 기록\n\n닫은 라운드와 완료한 todo·백로그를 보관한다. 날짜는 정리한 날이다. 기존 월별 기록은 그대로 둔다.\n\n| 날짜 | 제목 |\n|---|---|\n" +
			rows.join("\n") +
			"\n",
	);
}

// 링크 대상은 그대로 유지하고, 코드 안의 예시는 바꾸지 않는다.
function archiveLinks(text, from, to) {
	let fence = null;
	return text
		.split(/(?<=\n)/)
		.map((line) => {
			const marker = line.match(/^[ \t]*(\x60{3,}|~{3,})/)?.[1];
			if (marker) {
				if (!fence) fence = marker;
				else if (marker[0] === fence[0] && marker.length >= fence.length)
					fence = null;
				return line;
			}
			if (fence) return line;
			return line.replace(
				/(\x60+).*?\1|(!?\[[^\]\n]*\]\()(<[^>\n]+>|(?:[^\s()]|\([^()\n]*\))+)([^)\n]*\))/g,
				(all, code, prefix, href, suffix) => {
					if (code) return all;
					const wrapped = href.startsWith("<");
					const path = wrapped ? href.slice(1, -1) : href;
					if (/^(?:[a-z][\w+.-]*:|\/|#)/i.test(path)) return all;
					const cut = path.search(/[?#]/);
					const target = cut < 0 ? path : path.slice(0, cut);
					const tail = cut < 0 ? "" : path.slice(cut);
					return (
						prefix +
						(wrapped ? "<" : "") +
						relative(dirname(to), resolve(dirname(from), target)).replaceAll(
							"\\",
							"/",
						) +
						tail +
						(wrapped ? ">" : "") +
						suffix
					);
				},
			);
		})
		.join("");
}

function completedText(text) {
	const lines = text.split(/(?<=\n)/);
	let fence = null;
	const outside = lines.map((line) => {
		const marker = line.match(/^[ \t]*(\x60{3,}|~{3,})/)?.[1];
		if (marker) {
			if (!fence) fence = marker;
			else if (marker[0] === fence[0] && marker.length >= fence.length)
				fence = null;
			return false;
		}
		return !fence;
	});
	const groups = [{ start: 0, level: 0, heading: "", parents: [] }];
	const headings = [];
	for (let i = 0; i < lines.length; i++) {
		const h = outside[i] && lines[i].match(/^(#{1,3}) (.+)\s*$/);
		if (!h) continue;
		const level = h[1].length;
		headings.length = level - 1;
		const parents = headings.filter(Boolean).slice(1);
		headings.push(h[2].trim());
		groups.push({ start: i, level, heading: lines[i], parents });
	}
	const moved = [];
	const remove = new Set();
	let count = 0;
	for (let g = 0; g < groups.length; g++) {
		const group = groups[g];
		const end = groups[g + 1]?.start ?? lines.length;
		const tasks = [];
		for (let i = group.start; i < end; i++) {
			const task =
				outside[i] &&
				lines[i].match(/^([ \t]*)[-*+][ \t]+\[([ xX])\][ \t]+(.*)/);
			if (task)
				tasks.push({
					start: i,
					indent: task[1].length,
					checked: task[2].toLowerCase() === "x",
					label: task[3],
				});
		}
		if (!tasks.length) continue;
		const context = group.parents.length
			? `> 묶음: ${group.parents.join(" / ")}\n\n`
			: "";
		const codeExample = outside.slice(group.start, end).some((value) => !value);
		if (group.level > 1 && !codeExample && tasks.every((t) => t.checked)) {
			moved.push(context + lines.slice(group.start, end).join(""));
			for (let i = group.start; i < end; i++) remove.add(i);
			count += tasks.length;
			continue;
		}
		for (const task of tasks) {
			task.end = end;
			for (let i = task.start + 1; i < end; i++) {
				if (!outside[i]) {
					if (
						outside[i - 1] &&
						/^[ \t]*(\x60{3,}|~{3,})/.test(lines[i]) &&
						(lines[i].match(/^[ \t]*/)?.[0].length ?? 0) <= task.indent
					) {
						task.end = i;
						break;
					}
					continue;
				}
				const next = lines[i].match(/^([ \t]*)[-*+] /);
				if (next && next[1].length <= task.indent) {
					task.end = i;
					break;
				}
				if (
					lines[i - 1].trim() === "" &&
					lines[i].trim() &&
					(lines[i].match(/^[ \t]*/)?.[0].length ?? 0) <= task.indent
				) {
					task.end = i;
					break;
				}
			}
		}
		let header = false;
		for (const task of tasks) {
			if (remove.has(task.start) || !task.checked) continue;
			const children = tasks.filter(
				(t) => t.start >= task.start && t.start < task.end,
			);
			if (children.some((t) => !t.checked)) continue;
			if (!header) {
				moved.push(`${context + group.heading}\n`);
				header = true;
			}
			const parents = tasks.filter(
				(t) =>
					t.start < task.start && t.end > task.start && t.indent < task.indent,
			);
			if (parents.length)
				moved.push(
					`> 상위 항목: ${parents.map((t) => t.label).join(" / ")}\n\n`,
				);
			moved.push(
				lines
					.slice(task.start, task.end)
					.map((line) =>
						line.slice(
							Math.min(task.indent, line.match(/^[ \t]*/)?.[0].length ?? 0),
						),
					)
					.join(""),
			);
			for (let i = task.start; i < task.end; i++) remove.add(i);
			count += children.length;
		}
	}
	return {
		todo: lines.filter((_, i) => !remove.has(i)).join(""),
		archived: moved.join("\n"),
		count,
	};
}

function completedOutsideRound(md) {
	const active = parseActive(md);
	if (!active) return completedText(md);
	const before = completedText(md.slice(0, active.start));
	const after = completedText(md.slice(active.end));
	return {
		todo: before.todo + md.slice(active.start, active.end) + after.todo,
		archived: before.archived + after.archived,
		count: before.count + after.count,
	};
}

function archiveTodo(root, config, content, file, archived) {
	const todoPath = join(root, config.todoPath);
	const indexPath = join(root, config.archiveDir, "README.md");
	const original = readFileSync(todoPath, "utf8");
	const oldIndex = existsSync(indexPath)
		? readFileSync(indexPath, "utf8")
		: null;
	const link = `[완료 기록](${relative(dirname(todoPath), indexPath).replaceAll("\\", "/")})`;
	let todo = content;
	if (!todo.includes(link)) {
		todo = todo.replace(/^(#[^\n]*\n)/, `$1\n${link}\n`);
		if (!todo.includes(link)) todo = `# 작업\n\n${link}\n\n${todo}`;
	}
	let created = false;
	try {
		const fd = openSync(file, "wx");
		created = true;
		try {
			writeFileSync(fd, archived);
		} finally {
			closeSync(fd);
		}
		archiveIndex(root, config);
		replaceArchiveFile(todoPath, todo);
	} catch (error) {
		if (created) {
			// 복구가 실패하면 새 기록을 남겨 데이터가 사라지지 않게 한다.
			try {
				if (readFileSync(todoPath, "utf8") !== original)
					replaceArchiveFile(todoPath, original);
				if (oldIndex === null) rmSync(indexPath, { force: true });
				else if (readFileSync(indexPath, "utf8") !== oldIndex)
					replaceArchiveFile(indexPath, oldIndex);
				rmSync(file);
			} catch (recovery) {
				throw new AggregateError(
					[error, recovery],
					"아카이브 복구 실패: todo와 보관 파일을 확인하세요",
				);
			}
		}
		throw error;
	}
}

export function archiveCompleted(
	root,
	config,
	now = new Date(),
	{ title = "완료 항목 정리" } = {},
) {
	const todoPath = join(root, config.todoPath);
	const md = readFileSync(todoPath, "utf8");
	const result = completedOutsideRound(md);
	if (!result.count) return { ok: true, completed: 0, archivePath: null };
	const day = archiveDay(now);
	const file = archiveFile(root, config, day, title);
	archiveTodo(
		root,
		config,
		result.todo,
		file,
		`# ${title}\n\n- 정리 날짜: ${day} (KST)\n- 원본: ${config.todoPath}\n\n${archiveLinks(result.archived, todoPath, file)}`,
	);
	return { ok: true, completed: result.count, archivePath: file };
}
export function close(
	root,
	config,
	now = new Date(),
	{ partial = false, delegationPacket, delegationContext } = {},
) {
	const res = audit(root, config, { delegationPacket, delegationContext });
	if (!res.ok) return res;
	const todoPath = join(root, config.todoPath);
	const md = readFileSync(todoPath, "utf8");
	const active = parseActive(md);
	// blocked·미실행은 audit이 채운 칸으로 보지만 완료는 아니다. 사용자가 그대로 닫자고 할 때만 --partial로 닫는다.
	const count = (re) =>
		active.rows.filter((r) => re.test(bare(r.evidence))).length;
	const blocked = count(/^blocked\s*:/i);
	const skipped = count(/^미실행\s*:/);
	if ((blocked || skipped) && !partial)
		return {
			ok: false,
			problems: [
				`부분 완료(blocked ${blocked}건, 미실행 ${skipped}건) — 사용자에게 보고하고, 그대로 닫자고 하면 pnpm dev-cycle close --partial`,
			],
		};
	const day = archiveDay(now);
	const archivePath = archiveFile(root, config, day, active.title);
	const archived = md
		.slice(active.start, active.end)
		.replace("<!-- dev-cycle:start ", `<!-- dev-cycle:archived closed=${day} `)
		.replace("## 활성 라운드: ", "## 라운드: ")
		.replace(END_TAG, "<!-- dev-cycle:archived-end -->");
	const before = md.slice(0, active.start).replace(/\s*$/, "");
	const after = md.slice(active.end).replace(/^\s*/, "");
	const remaining = `${[before, after].filter(Boolean).join("\n\n").replace(/\s*$/, "")}\n`;
	const completed = completedOutsideRound(remaining);
	archiveTodo(
		root,
		config,
		completed.todo,
		archivePath,
		`# ${active.title}\n\n${archived}\n${archiveLinks(completed.archived, todoPath, archivePath)}`,
	);
	return { ok: true, archivePath };
}

// 커밋 전 검사: 스테이징한 변경에 로컬 .env의 비밀값이나 흔한 키 형식이 들어 있는지 본다. 값은 출력하지 않는다.
// 루트·apps/web·packages/db의 .env와 .env.* 파일을 읽는다. 커밋하는 .env.schema·.env.example은 뺀다.
const ENV_DIRS = ["", "apps/web", "packages/db"];
const ENV_FILE_RE = /^\.env(\.(?!schema$|example$)[\w.-]+)?$/;
// 이름이 비밀처럼 보이는 변수만 본다. 로컬 기본값(localhost 주소 등)은 비밀이 아니고 문서에도 흔히 나온다.
const SECRET_NAME_RE =
	/(SECRET|TOKEN|PASSWORD|KEY|DATABASE_URL\w*|POSTGRES_URL\w*|DIRECT_URL)$/;
// ponytail: 흔한 형식 몇 개만 본다. 더 넓게 잡으려면 gitleaks 같은 전용 도구를 쓴다.
const SECRET_PATTERNS = [
	["개인 키", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
	["sk- 형식 API 키", /\bsk-[A-Za-z0-9_-]{20,}/],
	["GitHub 토큰", /\bgh[pousr]_[A-Za-z0-9]{30,}/],
	["AWS 액세스 키", /\bAKIA[0-9A-Z]{16}\b/],
	["비밀번호가 든 DB 주소", /postgres(?:ql)?:\/\/[^:@\s/]+:[^@\s]{12,}@/],
];

function envSecrets(root) {
	const out = [];
	for (const dir of ENV_DIRS) {
		const d = join(root, dir);
		if (!existsSync(d)) continue;
		for (const f of readdirSync(d, { withFileTypes: true })) {
			if (!(f.isFile() || f.isSymbolicLink()) || !ENV_FILE_RE.test(f.name))
				continue;
			const rel = dir ? `${dir}/${f.name}` : f.name;
			// 줄 안에서만 맞춘다(\s는 줄바꿈을 넘어 빈 값 다음 줄을 값으로 삼킨다).
			const re =
				/^[ \t]*(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=[ \t]*(.*?)[ \t]*\r?$/gm;
			const text = readFileSync(join(d, f.name), "utf8");
			for (const [, name, raw] of text.matchAll(re)) {
				// 따옴표 값은 따옴표 안만, 따옴표 없는 값은 " #" 뒤 주석을 뺀다.
				const value =
					raw.match(/^(['"`])(.*?)\1/)?.[2] ?? raw.replace(/[ \t]+#.*$/, "");
				if (
					SECRET_NAME_RE.test(name) &&
					value.length >= 8 &&
					// ponytail: 소문자로만 된 값(changeme, development 등)은 자리표시자로 보고 넘긴다.
					// 소문자 암구호(correct-horse-battery-staple 같은)도 함께 넘기는 한계가 있다.
					!/^[a-z._-]+$/.test(value) &&
					!/localhost|127\.0\.0\.1/.test(value)
				)
					out.push({ name: `${rel}의 ${name}`, value });
			}
		}
	}
	return out;
}

export function stagedSecrets(root) {
	const env = envSecrets(root);
	const hits = new Set();
	let file = null;
	let inHunk = false;
	// 사용자 git 설정(noprefix, mnemonicPrefix, quotePath, textconv)과 관계없이 같은 형식으로 읽는다.
	// --text: -diff 속성이나 NUL 바이트로 바이너리 취급되는 파일도 내용을 본다.
	const diff = git(root, [
		"-c",
		"core.quotePath=false",
		"diff",
		"--cached",
		"--no-color",
		"--no-ext-diff",
		"--no-textconv",
		"--text",
		"--src-prefix=a/",
		"--dst-prefix=b/",
		"-U0",
	]);
	for (const line of diff.split("\n")) {
		// "+++ " 머리줄은 파일마다 첫 @@ 앞에만 온다. 그 뒤의 "+++ "는 "++ "로 시작하는 추가 줄이다.
		if (line.startsWith("diff --git ")) inHunk = false;
		else if (line.startsWith("@@")) inHunk = true;
		else if (!inHunk && line.startsWith("+++ "))
			file = line
				.slice(4)
				.replace(/\t$/, "")
				.replace(/^"(.*)"$/, "$1")
				.replace(/^b\//, "");
		else if (inHunk && line.startsWith("+")) {
			for (const e of env)
				if (line.includes(e.value)) hits.add(`${file}: ${e.name} 값`);
			// 문법 강조 번들의 정확한 식별자만 제외하고 실제 env 값은 원문에서 검사한다.
			const secretLine = line.replace(
				/(?<![A-Za-z0-9_-])erilog-sk-prompt-state-selector(?![A-Za-z0-9_-])/g,
				"",
			);
			for (const [label, re] of SECRET_PATTERNS)
				if (re.test(secretLine)) hits.add(`${file}: ${label}`);
		}
	}
	return [...hits];
}

const USAGE =
	"사용법: dev-cycle <case | table [CASE] [--write] [--upgrade] [--delegation] [--title 제목] | evidence <행 번호> --file <증거 파일> | status | audit [--packet 파일 --context 파일] | resource <check|run|clean> | delegation <capture|validate> | close [--partial] [--packet 파일 --context 파일] | secrets> [--json]";

function readDelegationJson(root, path, flag) {
	if (!path || path.startsWith("--"))
		throw new UsageError(`${flag} 뒤에 프로젝트 안 JSON 파일을 넣는다`);
	const base = resolve(root);
	const file = resolve(base, path);
	if (!file.startsWith(`${base}${sep}`))
		throw new UsageError(`${flag} 파일은 프로젝트 밖을 가리킬 수 없다`);
	try {
		return JSON.parse(readFileSync(file, "utf8"));
	} catch (error) {
		throw new UsageError(`${flag} JSON을 읽을 수 없다: ${error.message}`);
	}
}

export function sourceBoundRoot(root) {
	const cwd = realpathSync(root);
	let gitRoot;
	let head;
	try {
		gitRoot = realpathSync(git(cwd, ["rev-parse", "--show-toplevel"]).trim());
		head = git(gitRoot, ["rev-parse", "--verify", "HEAD"]).trim();
	} catch (error) {
		throw new UsageError(
			`현재 작업 경로의 git root를 확인할 수 없다: ${error.message}`,
		);
	}
	return {
		root: gitRoot,
		gitRoot,
		cwd,
		head,
		environment: {
			node: process.version,
			platform: process.platform,
			arch: process.arch,
		},
		requestedScope: "project",
		scope: "project",
		inspectOnly: true,
	};
}

export function main(argv, root = process.cwd()) {
	const [cmd, ...rest] = argv;
	const json = rest.includes("--json");
	const titleAt = rest.indexOf("--title");
	const title = titleAt >= 0 ? rest[titleAt + 1] : undefined;
	const positional = rest.filter(
		(a, i) => !a.startsWith("--") && (titleAt < 0 || i !== titleAt + 1),
	);
	const config = loadConfig(root);
	const print = (obj, text) =>
		console.log(json ? JSON.stringify(obj, null, 2) : text);
	switch (cmd) {
		case "case": {
			const md = readTodo(root, config);
			const active = md && parseActive(md);
			const base = active ? active.meta.base : resolveBase(root, config);
			const cls = classify(changedFiles(root, base), config);
			const head = `${cls.pathCase}${cls.auth ? " (+auth: security 리뷰 행 추가)" : ""}${cls.harness && cls.pathCase !== "H" ? " (+H)" : ""} — base ${base ?? "none"}`;
			const lines = cls.evidence.map(
				(e) =>
					`  ${e.case ?? "-"}${e.auth ? "+auth" : ""}  ${e.file}  (${e.why ?? "인증 민감 경로"})`,
			);
			print({ ...cls, base }, [head, ...lines].join("\n"));
			return 0;
		}
		case "table": {
			const r = writeTable(root, config, positional[0], {
				upgrade: rest.includes("--upgrade"),
				title,
				write: rest.includes("--write"),
				delegation: rest.includes("--delegation"),
			});
			print(
				r,
				rest.includes("--write")
					? `${config.todoPath}에 케이스 ${r.case} 대조표(${r.rows}행)를 썼다`
					: r.block,
			);
			return 0;
		}
		case "evidence": {
			const fileAt = rest.indexOf("--file");
			if (
				fileAt !== 1 ||
				rest.length !== 3 + (json ? 1 : 0) ||
				(json && rest.at(-1) !== "--json")
			)
				throw new UsageError(
					"사용법: dev-cycle evidence <행 번호> --file <증거 파일> [--json]",
				);
			const r = setEvidence(root, config, Number(rest[0]), rest[2]);
			print(r, `행 ${r.row} 증거를 갱신했다`);
			return 0;
		}
		case "status": {
			const s = status(root, config);
			// 새 라운드를 열기 전에 외부 스킬 새 버전을 하루 한 번 확인한다(prokit-skills-update).
			// 옛 skills-setup.mjs는 모르는 옵션을 무시하고 설치를 해 버리므로 --if-due를 아는 판만 부른다.
			const upd = join(root, "scripts/skills-setup.mjs");
			if (
				!s.active &&
				existsSync(upd) &&
				readFileSync(upd, "utf8").includes('"--if-due"')
			) {
				const r = spawnSync(process.execPath, [upd, "--update", "--if-due"], {
					cwd: root,
					encoding: "utf8",
					timeout: 60_000,
				});
				const failed = r.error || r.status !== 0;
				const why = `${r.error?.message ?? r.stderr ?? ""}`
					.trim()
					.split("\n")[0];
				const notice = failed
					? `CHECK_FAILED skills:update --if-due: ${why || `exit ${r.status}`}`
					: r.stdout?.trim();
				if (notice) s.skillsUpdate = notice.split("\n");
			}
			print(s, [s.line, ...(s.skillsUpdate ?? [])].join("\n"));
			return 0;
		}
		case "audit": {
			const packetAt = rest.indexOf("--packet");
			const contextAt = rest.indexOf("--context");
			const allowed = new Set(["--json", "--packet", "--context"]);
			const values = new Set(
				[packetAt, contextAt]
					.filter((index) => index >= 0)
					.map((index) => index + 1),
			);
			if (
				rest.some((arg, index) => !allowed.has(arg) && !values.has(index)) ||
				packetAt >= 0 !== contextAt >= 0
			)
				throw new UsageError(
					"사용법: dev-cycle audit [--packet 파일 --context 파일] [--json]",
				);
			const r = audit(root, config, {
				delegationPacket:
					packetAt >= 0
						? readDelegationJson(root, rest[packetAt + 1], "--packet")
						: undefined,
				delegationContext:
					contextAt >= 0
						? readDelegationJson(root, rest[contextAt + 1], "--context")
						: undefined,
			});
			print(
				r,
				r.ok
					? "audit 통과"
					: ["audit 실패:", ...r.problems.map((p) => `  ❌ ${p}`)].join("\n"),
			);
			return r.ok ? 0 : 1;
		}
		case "resource":
			return Promise.resolve(resourceMain(rest, root));
		case "delegation": {
			if (rest[0] === "capture" || rest[0] === "snapshot") {
				if (rest.length !== 1)
					throw new UsageError("사용법: dev-cycle delegation capture|snapshot");
				return Promise.resolve(
					delegationMain(rest, sourceBoundRoot(root).root),
				);
			}
			if (rest[0] === "resolve") {
				if (
					rest.length !== 2 ||
					!rest[1] ||
					rest[1].startsWith("--") ||
					rest[1].split(/[\\/]/).includes("..")
				)
					throw new UsageError(
						"사용법: dev-cycle delegation resolve <skill-ref|상대 경로>",
					);
				const result = resolveProvider(rest[1], sourceBoundRoot(root));
				console.log(JSON.stringify(result, null, 2));
				return result.ok ? 0 : 1;
			}
			return Promise.resolve(delegationMain(rest, root));
		}
		case "archive": {
			if (
				positional.length ||
				(titleAt >= 0 && (!title?.trim() || title.startsWith("--"))) ||
				rest.some(
					(a, i) =>
						!(titleAt >= 0 && i === titleAt + 1) &&
						a !== "--title" &&
						a !== "--json",
				)
			)
				throw new UsageError(
					"사용법: dev-cycle archive [--title 제목] [--json]",
				);
			const r = archiveCompleted(root, config, new Date(), { title });
			print(
				r,
				r.completed
					? `완료 항목 ${r.completed}개를 옮겼다 → ${r.archivePath}`
					: "옮길 완료 항목 없음",
			);
			return 0;
		}
		case "close": {
			const packetAt = rest.indexOf("--packet");
			const contextAt = rest.indexOf("--context");
			const values = new Set(
				[packetAt, contextAt]
					.filter((index) => index >= 0)
					.map((index) => index + 1),
			);
			if (
				rest.some(
					(arg, index) =>
						!["--partial", "--packet", "--context", "--json"].includes(arg) &&
						!values.has(index),
				) ||
				packetAt >= 0 !== contextAt >= 0
			)
				throw new UsageError(
					"사용법: dev-cycle close [--partial] [--packet 파일 --context 파일] [--json]",
				);
			const r = close(root, config, new Date(), {
				partial: rest.includes("--partial"),
				delegationPacket:
					packetAt >= 0
						? readDelegationJson(root, rest[packetAt + 1], "--packet")
						: undefined,
				delegationContext:
					contextAt >= 0
						? readDelegationJson(root, rest[contextAt + 1], "--context")
						: undefined,
			});
			print(
				r,
				r.ok
					? `라운드를 닫았다 → ${r.archivePath}`
					: ["close 거부:", ...r.problems.map((p) => `  ❌ ${p}`)].join("\n"),
			);
			return r.ok ? 0 : 1;
		}
		case "secrets": {
			let hits;
			try {
				// 하위 폴더에서 실행해도 저장소 루트의 .env를 읽는다.
				hits = stagedSecrets(
					git(root, ["rev-parse", "--show-toplevel"]).trim(),
				);
			} catch (e) {
				// exit 1(비밀값 발견)과 구분한다.
				console.error(
					`비밀값 검사를 실행하지 못했다(비밀값 발견 아님): ${e.message.split("\n")[0]}`,
				);
				return 2;
			}
			print(
				{ ok: hits.length === 0, hits },
				hits.length
					? [
							"비밀값으로 보이는 것이 스테이징되어 있다 — 커밋·push하지 말고 스테이징에서 빼고 보고한다(값은 출력하지 않는다):",
							...hits.map((h) => `  ❌ ${h}`),
						].join("\n")
					: "비밀값 검사 통과 (스테이징한 변경)",
			);
			return hits.length ? 1 : 0;
		}
		default:
			console.error(USAGE);
			return 2;
	}
}

// 실재 경로로 비교한다. 심볼릭 링크 경로(macOS /tmp 등)로 실행하면 argv와 import.meta.url이 달라진다.
const isMain = () => {
	try {
		return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
	} catch {
		return false;
	}
};
if (isMain()) {
	try {
		const result = main(process.argv.slice(2));
		if (result && typeof result.then === "function")
			result
				.then((code) => {
					process.exitCode = code;
				})
				.catch((error) => {
					console.error(error.message);
					process.exitCode = error instanceof UsageError ? 2 : 1;
				});
		else process.exitCode = result;
	} catch (e) {
		console.error(e.message);
		process.exitCode = e instanceof UsageError ? 2 : 1;
	}
}
