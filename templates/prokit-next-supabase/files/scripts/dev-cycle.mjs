#!/usr/bin/env node
// dev-cycle 경량 러너: case | table | status | audit | close | secrets
// 절차 정본은 docs/dev-workflow.md, 판정 규칙은 .dev-cycle.json이다.
import { execFileSync, spawnSync } from "node:child_process";
import {
	appendFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	realpathSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
		`<!-- dev-cycle:start case=${meta.case} base=${meta.base ?? "none"} auth=${Boolean(meta.auth)} opened=${meta.opened} -->`,
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
	{ upgrade = false, title, write = false, now = new Date() } = {},
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
	if (active && upgrade) {
		const old = new Map(active.rows.map((r) => [r.text, r.evidence]));
		for (const r of rows) r.evidence = old.get(r.text) ?? "";
		const kept = new Set(rows.map((r) => r.text));
		// 새 케이스에 없는 이전 행(직접 추가한 행 포함)은 끝의 사용자 확인 행 앞에 둔다.
		const carried = active.rows
			.filter((r) => !kept.has(r.text))
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
		title: title ?? active?.title ?? "제목 없음",
	};
	const block = renderBlock(meta, rows, upgrade ? active.extra : []);
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

const rowProblem = (r) => confirmProblem(r) ?? evidenceProblem(r.evidence);

export function audit(root, config) {
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
	return {
		ok: problems.length === 0,
		problems,
		case: X,
		pathCase: cls.pathCase,
	};
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

export function close(
	root,
	config,
	now = new Date(),
	{ partial = false } = {},
) {
	const res = audit(root, config);
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
	const day = now.toISOString().slice(0, 10);
	const archivePath = join(root, config.archiveDir, `${day.slice(0, 7)}.md`);
	const archived = md
		.slice(active.start, active.end)
		.replace("<!-- dev-cycle:start ", `<!-- dev-cycle:archived closed=${day} `)
		.replace("## 활성 라운드: ", "## 라운드: ")
		.replace(END_TAG, "<!-- dev-cycle:archived-end -->");
	mkdirSync(dirname(archivePath), { recursive: true });
	appendFileSync(
		archivePath,
		`${existsSync(archivePath) ? "\n" : ""}${archived}\n`,
	);
	const before = md.slice(0, active.start).replace(/\s*$/, "");
	const after = md.slice(active.end).replace(/^\s*/, "");
	writeFileSync(
		todoPath,
		`${[before, after].filter(Boolean).join("\n\n").replace(/\s*$/, "")}\n`,
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
			for (const [label, re] of SECRET_PATTERNS)
				if (re.test(line)) hits.add(`${file}: ${label}`);
		}
	}
	return [...hits];
}

const USAGE =
	"사용법: dev-cycle <case | table [CASE] [--write] [--upgrade] [--title 제목] | status | audit | close [--partial] | secrets> [--json]";

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
			});
			print(
				r,
				rest.includes("--write")
					? `${config.todoPath}에 케이스 ${r.case} 대조표(${r.rows}행)를 썼다`
					: r.block,
			);
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
			const r = audit(root, config);
			print(
				r,
				r.ok
					? "audit 통과"
					: ["audit 실패:", ...r.problems.map((p) => `  ❌ ${p}`)].join("\n"),
			);
			return r.ok ? 0 : 1;
		}
		case "close": {
			const r = close(root, config, new Date(), {
				partial: rest.includes("--partial"),
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
		process.exitCode = main(process.argv.slice(2));
	} catch (e) {
		console.error(e.message);
		process.exitCode = e instanceof UsageError ? 2 : 1;
	}
}
