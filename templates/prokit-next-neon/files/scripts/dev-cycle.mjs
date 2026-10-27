#!/usr/bin/env node
// dev-cycle 경량 러너: case | table | status | audit | close | archive | plan | secrets | guard
// 절차 정본은 docs/dev-workflow.md, 판정 규칙은 .dev-cycle.json이다.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
	appendFileSync,
	closeSync,
	existsSync,
	lstatSync,
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
import { tmpdir } from "node:os";
import {
	basename,
	dirname,
	isAbsolute,
	join,
	relative,
	resolve,
	sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

const DEFAULTS = {
	todoPath: "tasks/todo.md",
	archiveDir: "tasks/archive",
	planPath: "tasks/plan.md",
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

// secrets·table 같은 명령은 위임·자원 스크립트가 빠지거나 깨져도 돌아야 한다.
// 불러오지 못하면 그 스크립트의 함수를 부르는 명령만 exit 2로 실패한다.
async function helperScript(name, exports) {
	try {
		return await import(`./${name}`);
	} catch (error) {
		const fail = () => {
			throw new UsageError(
				`scripts/${name}를 불러올 수 없다: ${error.message.split("\n")[0]}`,
			);
		};
		return Object.fromEntries(exports.map((key) => [key, fail]));
	}
}
const {
	captureSnapshot,
	main: delegationMain,
	observeProvider,
	resolveProvider,
	validateDelegationPacket,
} = await helperScript("delegation.mjs", [
	"captureSnapshot",
	"main",
	"observeProvider",
	"resolveProvider",
	"validateDelegationPacket",
]);
const { main: resourceMain, runGuarded } = await helperScript(
	"resource-guard.mjs",
	["main", "runGuarded"],
);

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
	// 설정 브랜치가 없을 때(Better-T-Stack은 master로 초기화한다) 기능 브랜치의 커밋이 diff에서 빠지지 않도록 후보를 차례로 본다.
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
	// case F 규칙: 계층을 알 수 없는 코드(adopt 프로젝트의 규칙 밖 코드)는 무거운 F로 본다.
	let wide = false;
	for (const file of files) {
		const rule = rules.find((r) => r.re.test(file));
		const isAuth = authRe ? authRe.test(file) : false;
		if (isAuth) auth = true;
		if (!rule && !isAuth) continue;
		if (rule?.case === "H") harness = true;
		else if (rule?.case === "F") wide = true;
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
		wide || list.length > 1
			? "F"
			: list.length === 1
				? list[0]
				: harness
					? "H"
					: "A";
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
		// 판(edition) 표시 같은 HTML 주석은 대조표 행 글에 옮기지 않는다.
		const text = m[1].replace(/<!--.*?-->/g, "");
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
		`<!-- dev-cycle:start case=${meta.case} base=${meta.base ?? "none"} auth=${Boolean(meta.auth)} opened=${meta.opened}${meta.task ? ` task=${meta.task}` : ""}${meta.notask ? " notask=true" : ""}${meta.brains ? ` brains=${meta.brains}` : ""}${meta.skills ? " skills=true" : ""} -->`,
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

// 진행 계획(tasks/plan.md): Task 하나가 라운드 하나다. 앞 Task가 모두 완료·제외여야 다음 Task 라운드를 연다.
const PLAN_START_RE = /<!-- dev-cycle:plan(?: (.*?))? -->/;
const PLAN_END = "<!-- dev-cycle:plan-end -->";
export const TASK_STATES = ["대기", "진행", "완료", "제외"];
// 서버·DB를 처음 고치는 라운드의 테스트 러너 준비 행. --upgrade 뒤에도 첫 행에 남는다.
export const VITEST_ROW = "vitest 도입(최초 1회) → 설정 파일과 실행 결과";
// 이 케이스의 행이 테스트를 쓰는 패키지. 그 package.json에 test 스크립트가 없으면 table이 VITEST_ROW를 넣는다.
const TEST_PACKAGE = { D: "packages/api", E: "packages/db", F: "packages/api" };
// Task 라운드는 그 Task의 세부 계획과 계획 리뷰부터 한다. 케이스 행에 계획 리뷰가 이미 있으면(F) 리뷰 행은 더하지 않는다.
export const TASK_PLAN_ROW =
	"[plan] Task 세부 계획 (진행 계획의 이 Task를 다시 설계하고 구체화: 바꿀 파일, 단계, 단계별 검사, 완료 조건. 고른 두뇌의 계획 방법) → 계획 문서 경로(.md). N/A 불가";
export const TASK_REVIEW_ROW =
	"[review] prokit-reviewer(plan) Task 세부 계획 리뷰 → prokit-reviewer(plan): approve, max=none|low|medium, 반영·기각 내역. N/A 불가";
const taskRows = (rows) => [
	TASK_PLAN_ROW,
	...(rows.some(
		(r) =>
			r.text !== TASK_REVIEW_ROW && r.text.includes("prokit-reviewer(plan)"),
	)
		? []
		: [TASK_REVIEW_ROW]),
];
const TASK_ID_RE = /^T\d+$/;
// 진행 계획 라운드(케이스 A, --plan): 정밀 분석(기존 프로젝트), 계획 문서와 Task 표, 계획 리뷰 행을 맨 앞에 둔다.
export const PLAN_ANALYSIS_ROW =
	"[analysis] 정밀 분석 (prokit-analyzer, 읽기 전용. 보고서를 docs/prokit/analysis.md에 쓴다) → 보고서 경로(.md). N/A 불가";
export const PLAN_DOC_ROW =
	"[plan] 진행 계획 문서와 Task 표 (고른 두뇌의 계획 방법, project-plan.md 형식) → 계획 문서 경로(.md)와 pnpm dev-cycle plan 결과. N/A 불가";
export const PLAN_REVIEW_ROW =
	"[review] prokit-reviewer(plan) 진행 계획 리뷰 → prokit-reviewer(plan): approve, max=none|low|medium, 반영·기각 내역. N/A 불가";
const EXISTING_TYPES = ["early", "operating", "migration"];
// 진행 계획 라운드의 확인은 계획을 보기 전에 받은 승인으로 채우기 쉽다(AG2). 그 행을 채울 차례에 status가 알린다.
const PLAN_CONFIRM_NOTE =
	'진행 계획 라운드: 리뷰를 반영한 최종 계획 요약(Task 목록, 만들지 않는 것, 리뷰로 바뀐 사용자 결정, pnpm dev-cycle plan이 보여 주는 지문 sig=)을 보여 주고 그 턴을 끝낸 뒤 받은 답과 그 지문으로 채운다. 계획을 보기 전에 받은 "진행해"는 확인이 아니다';
const PLAN_ROUND_CMD =
	'pnpm dev-cycle table A --write --title "정밀 분석과 진행 계획" --plan';
const NO_TASK_NOTE =
	"진행 계획에 없는 일을 사용자가 계획 전에 하라고 했을 때만(급한 버그 수정, 템플릿 갱신 반영, 스킬 구성 변경) --no-task를 붙여 연다";
// 케이스 행에 계획 리뷰가 이미 있으면(F로 올림) 계획 리뷰 행은 더하지 않는다.
const planRows = (config, rows) => [
	...(EXISTING_TYPES.includes(config.projectType) ? [PLAN_ANALYSIS_ROW] : []),
	PLAN_DOC_ROW,
	...(rows.some(
		(r) =>
			r.text !== PLAN_REVIEW_ROW && r.text.includes("prokit-reviewer(plan)"),
	)
		? []
		: [PLAN_REVIEW_ROW]),
];

export function parsePlan(md) {
	const start = md.search(PLAN_START_RE);
	if (start < 0) return null;
	const endAt = md.indexOf(PLAN_END, start);
	if (endAt < 0)
		throw new UsageError(
			"dev-cycle:plan-end 마커가 없다. 진행 계획 파일을 확인한다",
		);
	const block = md.slice(start, endAt);
	const attrs = block.match(PLAN_START_RE)[1] ?? "";
	const doc = attrs.match(/(?:^|\s)doc=(\S+)/)?.[1] ?? null;
	const sig = attrs.match(/(?:^|\s)sig=(\S+)/)?.[1] ?? null;
	const title = block.match(/^## 진행 계획: (.*)$/m)?.[1] ?? "";
	const tasks = [];
	for (const line of block.split(/\r?\n/)) {
		const cells = line
			.trim()
			.match(/^\|(.*)\|$/)?.[1]
			.split("|")
			.map((c) => c.trim());
		if (!cells || !TASK_ID_RE.test(cells[0] ?? "")) continue;
		tasks.push({
			id: cells[0],
			title: cells[1] ?? "",
			state: cells[2] ?? "",
			record: cells.slice(3).join("|"),
		});
	}
	return { doc, sig, title, tasks, start, end: endAt + PLAN_END.length };
}

// 진행 계획 라운드를 닫을 때 Task 구성(번호·제목·순서)의 지문을 계획 블록 머리에 적는다. 상태와 기록 칸은 넣지 않는다(close와 제외가 바꾼다).
// 부분 완료로 닫아도 적는다(사용자가 그 계획으로 가자고 한 것이다). Task 게이트는 지문이 있는 계획에서만 연다.
export const planSig = (tasks) =>
	createHash("sha256")
		.update(tasks.map((t) => `${t.id}\t${t.title}`).join("\n"))
		.digest("hex")
		.slice(0, 12);
function signPlan(md) {
	const plan = parsePlan(md);
	if (!plan) return null;
	const head = md.slice(plan.start).match(PLAN_START_RE);
	const attrs = (head[1] ?? "").replace(/(^|\s)sig=\S*/g, "").trim();
	return `${md.slice(0, plan.start)}<!-- dev-cycle:plan ${[attrs, `sig=${planSig(plan.tasks)}`].filter(Boolean).join(" ")} -->${md.slice(plan.start + head[0].length)}`;
}

const readPlan = (root, config) => {
	const p = join(root, config.planPath);
	return existsSync(p) ? readFileSync(p, "utf8") : null;
};

// 진행 계획 라운드의 확인은 사용자가 본 Task 구성에 묶는다. 지금 구성의 지문이 증거에 없으면 계획을 보기 전의 승인이거나 확인 뒤 계획이 바뀐 것이다(AG2·AG4).
function planConfirmProblem(root, config, evidence, needPlan = false) {
	const plan = parsePlan(readPlan(root, config) ?? "");
	// audit은 계획 블록이 없으면 따로 알린다. evidence는 확인할 계획이 없으니 거절한다.
	if (!plan)
		return needPlan
			? `확인할 진행 계획 블록이 ${config.planPath}에 아직 없다. 계획 문서와 Task 표, 계획 리뷰를 먼저 끝낸다`
			: null;
	const sig = planSig(plan.tasks);
	if (
		new RegExp(`(?:^|[^0-9A-Za-z_])sig=${sig}(?![0-9A-Za-z])`).test(
			String(evidence ?? ""),
		)
	)
		return null;
	return "증거에 사용자가 본 Task 구성의 지문(pnpm dev-cycle plan의 sig=)이 없거나 지금 구성과 다르다. 확인 뒤 계획이 바뀌었으면 바뀐 요약을 보여 주고 다시 확인받는다";
}
const isConfirm = (text) => /^\[confirm\]/i.test(text);
const isPlanRound = (active) =>
	active.rows.some((r) => r.text === PLAN_DOC_ROW);
// 화면 리뷰 점수는 실행 기록이 있어야 받는다. critique는 impeccable이 .impeccable/critique/<시각>__<대상>.md를
// 남기고, audit과 web-design-guidelines는 기록을 남기지 않아 보고서를 tasks/evidence/에 저장해 둔다.
const N_OF_M = /(\d+)\s*\/\s*(\d+)/g;
const UI_RECORDS = [
	{
		row: "[review] impeccable critique",
		re: /\.impeccable\/critique\/[\w.-]+\.md/,
		what: "critique가 남긴 기록 파일(.impeccable/critique/….md)",
		// 머리의 total_score/max_score와 같은 쌍이 하나라도 있어야 한다(날짜 10/22 같은 다른 N/M은 섞여도 된다).
		score: (pairs, text) => {
			const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
			const total = front.match(/^total_score:\s*(\d+)/m)?.[1];
			const max = front.match(/^max_score:\s*(\d+)/m)?.[1];
			if (!total)
				return "기록 파일 머리에 total_score가 없다. IMPECCABLE_CRITIQUE_META에 점수를 넣어 다시 저장한다";
			const shown = pairs.find((p) => p[2] === max) ?? pairs[0];
			if (!shown) return `증거에 critique 점수(${total}/${max ?? "?"})가 없다`;
			return pairs.some((p) => p[1] === total && (!max || p[2] === max))
				? null
				: `점수가 기록 파일과 다르다: 증거 ${shown[1]}/${shown[2]}, 파일 ${total}/${max ?? "?"}`;
		},
	},
	{
		row: "[review] impeccable audit",
		re: /tasks\/evidence\/[\w.-]+\.md/,
		what: "audit·web-design-guidelines 보고서를 저장한 파일(tasks/evidence/ui-audit-<시각>.md)",
		// 증거의 총점(N/20)이 보고서에도 있어야 한다. 보고서는 **17/20**처럼 굵게 쓰기도 한다.
		score: (pairs, text) => {
			const totals = pairs.filter((p) => p[2] === "20");
			if (!totals.length) return "증거에 audit 총점(N/20)이 없다";
			return totals.some((p) =>
				new RegExp(`(?<!\\d)${p[1]}[*\\s]*/[*\\s]*20(?!\\d)`).test(text),
			)
				? null
				: `보고서에 증거의 총점 ${totals[0][1]}/20이 없다`;
		},
	},
];

// 이번 라운드의 기록인지 본다. 기능 브랜치의 base는 갈라진 지점이라 오래됐을 수 있어, base 커밋 시각과
// 라운드를 연 날(KST) 가운데 늦은 쪽보다 뒤에 쓴 파일이어야 한다.
function roundStart(root, meta) {
	const day = Date.parse(`${meta.opened}T00:00:00+09:00`) || 0;
	if (!meta.base || !SHA_RE.test(meta.base)) return day;
	try {
		const ct = git(root, ["show", "-s", "--format=%ct", meta.base]).trim();
		return Math.max(day, Number(ct) * 1000 || 0);
	} catch {
		return day;
	}
}

function uiRecordProblem(root, meta, r) {
	const kind = UI_RECORDS.find((k) => r.text.startsWith(k.row));
	if (!kind) return null;
	const value = bare(r.evidence);
	if (/^(blocked|미실행|n\/a)\s*:/i.test(value)) return null;
	const file = value.match(kind.re)?.[0];
	if (!file)
		return `증거에 ${kind.what} 경로를 적는다. 실행하지 않은 리뷰의 점수는 받지 않는다`;
	const path = join(root, file);
	if (!existsSync(path)) return `기록 파일이 없다: ${file}`;
	if (statSync(path).mtimeMs < roundStart(root, meta))
		return `기록 파일이 이번 라운드보다 오래됐다: ${file}. 이번 변경으로 다시 실행한다`;
	const problem = kind.score(
		[...value.replace(file, "").matchAll(N_OF_M)],
		readFileSync(path, "utf8"),
	);
	return problem && `${problem} (${file})`;
}

// 두뇌를 고르면 단계 행은 그 두뇌의 방법으로 한다. 증거의 `사용:` 이름이 고른 두뇌 파일에 백틱으로 적혀 있거나,
// 추가 스킬이거나, 사유가 있는 내장이어야 한다. 이름만 본다(실제로 불렀는지는 보지 않는 자기 신고다).
const STAGE_RE =
	/요구 명확화 단계|계획 단계|구현 단계|디버깅 단계|고른 두뇌의 계획 방법/;
export const BRAINS_DIR = ".agents/skills/prokit-dev-cycle/references/brains";
const brainsOf = (config) =>
	[config.brain ?? "none"].flat().filter((b) => b && b !== "none");
const readJson = (p) => {
	try {
		return JSON.parse(readFileSync(p, "utf8"));
	} catch {
		return null;
	}
};

// 단계 행이 맡는 단계를 고른 두뇌 파일의 단계 표(첫 칸)에서 찾고, 그 칸(Claude Code 열)의 스킬 이름을 돌려준다.
// 두뇌가 여럿이면 목록 순서로 그 단계를 맡는 첫 두뇌다. 맡는 두뇌가 없으면 null(기본 칸).
const STAGES = [
	{ re: /요구 명확화 단계/, label: (l) => l.startsWith("요구") },
	{ re: /계획 단계|고른 두뇌의 계획 방법/, label: (l) => l === "계획" },
	{ re: /구현 단계/, label: (l) => l === "구현" },
	{ re: /디버깅 단계/, label: (l) => l.startsWith("디버깅") },
];
// 버그 수정 라운드(디버깅 단계 행이 있는 표)를 D·E로 올리면 붙는 구현 행은 그 수정이라 디버깅 단계 방법을 따른다.
export function brainStageSkills(root, brains, text, rows = []) {
	const bugfix =
		/구현 단계/.test(text) && rows.some((r) => /디버깅 단계/.test(r.text));
	const stage = STAGES.find((s) => s.re.test(bugfix ? "디버깅 단계" : text));
	if (!stage) return null;
	for (const b of brains) {
		const p = join(root, BRAINS_DIR, `${b}.md`);
		if (!existsSync(p)) continue;
		for (const line of readFileSync(p, "utf8").split("\n")) {
			const cells = line.split("|").map((c) => c.trim());
			if (cells.length < 4 || !stage.label(cells[1].replace(/\s*\(.*\)$/, "")))
				continue;
			// mattpocock은 설치한 스킬만 그 단계를 맡는다.
			// 스킬·명령 이름만 본다(파일 경로, 하네스 이름, 사용자가 요청할 때만 켜는 실행 모드는 뺀다).
			const names = [...cells[2].matchAll(/`([^`\s]+)`/g)]
				.map((m) => m[1])
				.filter((n) => /^[/$]?[a-z][a-z0-9-]*(:[a-z0-9-]+)?$/.test(n))
				.filter(
					(n) =>
						!/^(prokit-|specialist-reviewer$|team$|ralph$|autopilot$|ultragoal$)/.test(
							n,
						) &&
						(b === "mattpocock" ||
							!/^(grilling|domain-modeling|grill-with-docs)$/.test(n)),
				)
				.filter(
					(n) =>
						b !== "mattpocock" ||
						[".claude/skills", ".agents/skills"].some((d) =>
							existsSync(join(root, d, n.replace(/^\//, ""))),
						),
				);
			if (names.length) return { brain: b, names };
		}
	}
	return null;
}

function brainProblem(root, config, active) {
	const now = brainsOf(config);
	if (!now.length) return () => null;
	const brains = [
		...new Set([...now, ...(active?.meta.brains?.split(",") ?? [])]),
	].filter((b) => b !== "none");
	const missing = brains.filter(
		(b) => !existsSync(join(root, BRAINS_DIR, `${b}.md`)),
	);
	// 두뇌 파일이 함께 적은 하네스 이름(prokit-*, specialist-reviewer, 필수 mattpocock 스킬)은 두뇌 방법이 아니다.
	// 필수 mattpocock 스킬은 mattpocock 두뇌일 때만 그 두뇌의 방법이다.
	const harness = brains.includes("mattpocock")
		? /^(prokit-|specialist-reviewer$|blocked$|none$)/
		: /^(prokit-|specialist-reviewer$|blocked$|none$|grilling$|domain-modeling$|grill-with-docs$)/;
	// 표기만 다른 이름(`agent-skills:idea-refine`·`idea-refine`, `/speckit-plan`·`$speckit-plan`)은 같은 이름이다.
	// 접두어가 있으면 그 두뇌 파일에 나온 접두어여야 한다(다른 두뇌의 같은 이름 스킬을 받지 않는다).
	const bareName = (n) =>
		n
			.replace(/^[/$]+/, "")
			.split(":")
			.at(-1);
	const prefixOf = (n) =>
		n
			.replace(/^[/$]+/, "")
			.split(":")
			.slice(0, -1)
			.join(":");
	const tokens = brains
		.filter((b) => !missing.includes(b))
		.flatMap((b) => [
			...readFileSync(join(root, BRAINS_DIR, `${b}.md`), "utf8").matchAll(
				/`([^`\s]+)`/g,
			),
		])
		.map((m) => m[1]);
	const names = new Set(tokens.map(bareName).filter((n) => !harness.test(n)));
	const prefixes = new Set(tokens.map(prefixOf).filter(Boolean));
	const brainName = (u) =>
		names.has(bareName(u)) && (!prefixOf(u) || prefixes.has(prefixOf(u)));
	// 추가 스킬은 이 프로젝트에 설치한(skills-lock.json) mattpocock 추가 스킬만 받는다.
	const pool = readJson(join(root, "skills.manifest.json"))?.mattpocock?.pool;
	const extras = new Set(
		Object.keys(readJson(join(root, "skills-lock.json"))?.skills ?? {}).filter(
			(n) => !pool || pool.includes(n),
		),
	);
	const logged = skillsLogged(root, active);
	const how = `사용: <${BRAINS_DIR}/${brains[0]}.md에 백틱으로 적힌 이름>, 사용: <스킬>(추가 스킬), 사용: 내장(<단계>): <사유> 중 하나로 적는다`;
	return (r) => {
		if (!STAGE_RE.test(r.text)) return null;
		const value = bare(r.evidence);
		if (/^(blocked|미실행|n\/a)\s*:/i.test(value)) return null;
		if (missing.length)
			return `고른 두뇌의 파일이 없다: ${missing.map((b) => `${BRAINS_DIR}/${b}.md`).join(", ")} (.dev-cycle.json의 brain 확인)`;
		// 이름 뒤에 붙은 마침표·조사(`사용: ce-debug.`, `ce-debug로`)는 이름이 아니다.
		const used = [...value.matchAll(/사용:\s*`?([^\s,;`()]+)`?/g)]
			.map((m) => m[1].replace(/[^A-Za-z0-9_-]+$/, ""))
			.filter(Boolean);
		const extra = [
			...value.matchAll(/사용:\s*`?([^\s,;`()]+)`?\s*\(추가 스킬\)/g),
		].map((m) => m[1]);
		const hits = [
			...used.filter(brainName),
			...extra.filter((u) => extras.has(u)),
		];
		if (hits.length) {
			const miss = logged && hits.filter((u) => !logged.has(bareName(u)));
			return miss && miss.length === hits.length
				? `증거의 ${hits.join(", ")}를 이 라운드에서 부른 기록이 없다(${SKILL_LOG}). ${LOG_HINT}`
				: null;
		}
		const reason = value.match(/사용:\s*내장\([^)]+\)\s*:\s*(\S.*)/)?.[1];
		if (reason === undefined)
			return `두뇌(${brains.join(", ")})를 골랐으면 단계 행 증거에 그 방법을 ${how}`;
		// 두뇌가 맡는 단계는 내장으로 넘기지 않는다. 그 스킬을 쓸 수 없으면 blocked다.
		const cover = brainStageSkills(root, now, r.text, active?.rows);
		if (cover)
			return `이 단계는 두뇌 ${cover.brain}이 맡는다(${cover.names.join(", ")}). 작은 변경이어도 그 스킬을 불러(Claude Code는 Skill 도구, 다른 도구는 SKILL.md를 읽는다) 사용: <이름>으로 적고, 쓸 수 없으면 blocked: 사유로 적는다`;
		// 두뇌 스킬의 방법을 쓰고 내장이라고 적지 않는다.
		const named = [...names].filter(
			(n) =>
				/^[a-z][a-z0-9-]{3,}$/.test(n) &&
				new RegExp(`(^|[^a-z0-9-])${n}([^a-z0-9-]|$)`).test(reason),
		);
		return named.length
			? `내장 사유에 두뇌 스킬 이름(${named.join(", ")})이 있다. 그 방법을 썼으면 스킬을 불러 사용: <이름>으로 적는다`
			: null;
	};
}

// 열린 라운드 중의 스킬 구성 전환(pnpm skills:setup). 설치기가 마커에 brains(라운드 동안 고른 두뇌)와 skills=true를 적고
// 메모 한 줄을 남긴다. 그 라운드의 케이스 판정은 설치기가 바꾼 파일을 빼고, 단계 행은 전환 전 두뇌 이름도 받는다.
// 설치기가 다루는 것만 뺀다: skills-lock.json에 기록됐거나 skills.manifest.json에 있는 스킬 폴더, 두뇌 도구(init)가 만드는
// 스킬(openspec-*, speckit-*), OMX가 만드는 .codex 파일. 이름이 없는 손으로 만든 스킬과 prokit-*는 그대로 하네스 변경이다.
function installerNames(root) {
	const m = readJson(join(root, "skills.manifest.json")) ?? {};
	const groups = [
		...(m.skills ?? []),
		...Object.values(m.optional ?? {}).flatMap((o) => o.skills ?? []),
		...[m.brains, m.simplicity].flatMap((c) =>
			Object.values(c ?? {}).flatMap((i) => i.skills ?? []),
		),
	];
	const skills = new Set([
		...groups.flatMap((g) => g.skills ?? []),
		...(m.mattpocock?.pool ?? []),
		...Object.keys(readJson(join(root, "skills-lock.json"))?.skills ?? {}),
	]);
	const items = [
		m,
		...[m.brains, m.simplicity].flatMap((c) => Object.values(c ?? {})),
	];
	const plugins = new Set(items.flatMap((i) => i.claude?.plugins ?? []));
	const markets = new Set(
		items.flatMap((i) => Object.keys(i.claude?.marketplaces ?? {})),
	);
	// init 정리 명령의 `.claude/skills/openspec-*` 꼴에서 접두어를 뽑는다
	const initPrefixes = Object.values(m.brains ?? {}).flatMap((b) =>
		[
			...(b.init?.remove ?? "").matchAll(/\.claude\/skills\/([a-z0-9-]+)-\*/g),
		].map((x) => x[1]),
	);
	return {
		skills,
		plugins,
		markets,
		initPrefixes,
		omx: Boolean(m.brains?.["oh-my"]?.omx),
	};
}
function installerFile(root, base, file, names) {
	const dir = file.match(
		/^(?:\.agents|\.claude|\.codex)\/skills\/([^/]+)(?:\/|$)/,
	)?.[1];
	if (dir)
		return (
			!dir.startsWith("prokit-") &&
			(names.skills.has(dir) ||
				names.initPrefixes.some((x) => dir.startsWith(`${x}-`)))
		);
	if (file === "skills-lock.json") return true;
	if (
		/^\.codex\/(prompts\/|agents\/(?!prokit-|specialist-reviewer))/.test(file)
	)
		return names.omx;
	const keys = {
		".claude/settings.json": ["enabledPlugins", "extraKnownMarketplaces"],
		".dev-cycle.json": ["brain", "simplicity"],
	}[file];
	if (!keys || !base) return false;
	try {
		const now = JSON.parse(readFileSync(join(root, file), "utf8"));
		// `./`: 상위 저장소의 하위 폴더에서도 현재 폴더 기준 경로로 읽는다
		const then = JSON.parse(git(root, ["show", `${base}:./${file}`]));
		// 플러그인·마켓플레이스 키는 매니페스트에 있는 이름만 받는다(손으로 더한 마켓플레이스는 하네스 변경)
		if (file === ".claude/settings.json") {
			const ok = (k, set) =>
				Object.keys(now[k] ?? {}).every(
					(x) => set.has(x) || isDeepStrictEqual(now[k][x], then[k]?.[x]),
				);
			if (
				!ok("enabledPlugins", names.plugins) ||
				!ok("extraKnownMarketplaces", names.markets)
			)
				return false;
		}
		for (const k of keys) {
			delete now[k];
			delete then[k];
		}
		return isDeepStrictEqual(now, then);
	} catch {
		return false;
	}
}
const roundFiles = (root, active) => {
	const files = changedFiles(root, active?.meta.base ?? null);
	if (active?.meta.skills !== "true") return files;
	const names = installerNames(root);
	return files.filter((f) => !installerFile(root, active.meta.base, f, names));
};

export function noteSkillsChange(root, config, { before, after }) {
	const p = join(root, config.todoPath);
	const md = existsSync(p) ? readFileSync(p, "utf8") : "";
	const active = md && parseActive(md);
	if (!active) return false;
	const list = (v) => [v ?? "none"].flat().filter((b) => b && b !== "none");
	const brains = [
		...new Set([
			...(active.meta.brains?.split(",") ?? list(before.brain)),
			...list(after.brain),
		]),
	];
	const label = (v) => [v ?? "none"].flat().join(",") || "none";
	const change = [
		label(before.brain) !== label(after.brain) &&
			`두뇌 ${label(before.brain)} → ${label(after.brain)}`,
		(before.simplicity ?? "none") !== (after.simplicity ?? "none") &&
			`과설계 방지 ${before.simplicity ?? "none"} → ${after.simplicity ?? "none"}`,
	].filter(Boolean);
	const note = `스킬 구성 변경(${archiveDay(new Date())}): ${change.join(", ") || "추가 스킬·선택 묶음"}. 이 라운드의 남은 단계 행은 새 구성으로 한다(Claude Code는 /reload-plugins로 다시 불러온다)`;
	const head = md
		.slice(active.start)
		.match(START_RE)[0]
		.replace(/ (brains|skills)=\S+/g, "")
		.replace(
			" -->",
			`${brains.length ? ` brains=${brains.join(",")}` : ""} skills=true -->`,
		);
	const block = md.slice(active.start, active.end).replace(START_RE, head);
	const at = block.lastIndexOf(END_TAG);
	if (block.includes(note)) {
		writeFileSync(p, md.slice(0, active.start) + block + md.slice(active.end));
		return true;
	}
	writeFileSync(
		p,
		md.slice(0, active.start) +
			`${block.slice(0, at)}${note}\n${block.slice(at)}` +
			md.slice(active.end),
	);
	return true;
}

// 부른 스킬 기록: Claude Code 훅이 Skill 호출과 SKILL.md Read를 .prokit/skills-used.jsonl에 남긴다(git이 무시하는 폴더).
// 기록 파일이 있으면 audit이 단계 행·리뷰 행 증거의 스킬 이름을 이 라운드의 기록과 대조한다. 없으면(Codex 등) 자기 신고다.
export const SKILL_LOG = ".prokit/skills-used.jsonl";
export function logSkill(root, input) {
	const e = JSON.parse(input);
	const t = e.tool_input ?? {};
	const name =
		e.tool_name === "Skill"
			? t.skill
			: e.tool_name === "Read"
				? String(t.file_path ?? "").match(/([^/\\]+)[/\\]SKILL\.md$/)?.[1]
				: null;
	if (!name) return;
	mkdirSync(join(root, ".prokit"), { recursive: true });
	appendFileSync(
		join(root, SKILL_LOG),
		`${JSON.stringify({ t: new Date().toISOString(), skill: String(name) })}\n`,
	);
}
// 라운드를 연 날(KST) 이후 기록의 스킬 이름(접두어·`/` 없이). 기록 파일이 없으면 null.
function skillsLogged(root, active) {
	const p = join(root, SKILL_LOG);
	if (!existsSync(p)) return null;
	const since = Date.parse(
		`${active?.meta.opened ?? "1970-01-01"}T00:00:00+09:00`,
	);
	const out = new Set();
	for (const line of readFileSync(p, "utf8").split("\n")) {
		try {
			const e = JSON.parse(line);
			if (Date.parse(e.t) >= since)
				out.add(
					String(e.skill)
						.replace(/^[/$]+/, "")
						.split(":")
						.at(-1),
				);
		} catch {}
	}
	return out;
}
const LOG_HINT =
	"Claude Code는 Skill 도구로 부르거나(사용자 호출 전용이면 그 SKILL.md를 Read로 읽는다) 다시 진행한 뒤 적는다. Bash cat으로 읽은 것은 기록되지 않는다";

// 고른 과설계 방지 스킬의 구현 diff 보완 검토는 prokit-reviewer(code) 행 증거 뒤에 덧붙인다(process-routing 규칙 6).
const SIMPLICITY_LABEL = {
	ponytail: {
		re: /ponytail-review\s*:/,
		label: "ponytail-review: …",
		skill: "ponytail-review",
	},
	caveman: {
		re: /caveman-review\s*:/,
		label: "caveman-review: …",
		skill: "caveman-review",
	},
	karpathy: {
		re: /karpathy/i,
		label: "간결성(karpathy 기준, prokit-reviewer focus): …",
	},
};
function simplicityProblem(root, config, active) {
	const want = SIMPLICITY_LABEL[config.simplicity];
	if (!want) return () => null;
	const logged = skillsLogged(root, active);
	return (r) => {
		if (!/^\[review\] prokit-reviewer\(code\)/.test(r.text)) return null;
		const value = bare(r.evidence);
		if (!value || /^(blocked|미실행|n\/a)\s*:/i.test(value)) return null;
		if (!want.re.test(value))
			return `고른 과설계 방지(${config.simplicity})의 보완 검토 결과를 덧붙인다: ${want.label}`;
		if (want.skill && logged && !logged.has(want.skill))
			return `${want.skill}를 이 라운드에서 부른 기록이 없다(${SKILL_LOG}). ${LOG_HINT}`;
		return null;
	};
}

// audit과 status가 같은 판정을 쓴다. 진행 계획 라운드의 확인 행은 지문까지 본다.
const roundRowProblem = (root, config, active) => {
	const planRound = isPlanRound(active);
	const brain = brainProblem(root, config, active);
	const simplicity = simplicityProblem(root, config, active);
	return (r) =>
		rowProblem(r) ??
		uiRecordProblem(root, active.meta, r) ??
		brain(r) ??
		simplicity(r) ??
		(planRound && isConfirm(r.text)
			? planConfirmProblem(root, config, r.evidence)
			: null);
};

// 완료의 증거는 기록 칸의 마지막 보관 파일이다. 보관 마커가 그 Task이고 partial이 아니어야 한다.
function recordProblem(root, config, t) {
	const last = t.record
		.split(/[,\s]+/)
		.filter(Boolean)
		.at(-1);
	if (!last) return "기록 칸에 보관 파일이 없다";
	const abs = resolve(root, last);
	const dir = resolve(root, config.archiveDir);
	if (!abs.startsWith(`${dir}${sep}`) || !existsSync(abs))
		return `기록 ${last}이 ${config.archiveDir} 아래의 파일이 아니다`;
	const marker =
		readFileSync(abs, "utf8").match(/<!-- dev-cycle:archived (.*?) -->/)?.[1] ??
		"";
	if (!new RegExp(`(^| )task=${t.id}( |$)`).test(marker))
		return `기록 ${last}은 ${t.id}의 라운드가 아니다`;
	if (/(^| )partial=true( |$)/.test(marker))
		return `기록 ${last}은 부분 완료(close --partial)다. 같은 Task를 다시 열어 끝낸다`;
	return null;
}

export function planCheck(root, config) {
	const md = readPlan(root, config);
	if (md === null) return null;
	const plan = parsePlan(md);
	// 다른 도구가 쓴 계획 문서(agent-skills /plan의 기본 경로가 tasks/plan.md다)는 진행 계획으로 보지 않는다. 라운드를 막지 않고 알린다.
	if (!plan)
		return {
			plan: null,
			problems: [],
			next: null,
			note: `${config.planPath}에 dev-cycle:plan 블록이 없다(진행 계획이 아닌 문서로 본다)`,
		};
	const problems = [];
	const seen = new Set();
	let open = false;
	for (const t of plan.tasks) {
		const at = `${t.id} "${t.title}"`;
		if (seen.has(t.id)) problems.push(`${t.id}가 두 번 있다`);
		seen.add(t.id);
		if (!TASK_STATES.includes(t.state)) {
			problems.push(
				`${at}: 상태는 ${TASK_STATES.join("·")} 중 하나다 (지금 "${t.state}")`,
			);
			continue;
		}
		const done = t.state === "완료" || t.state === "제외";
		// 제외는 하지 않기로 한 결정이라 앞 Task가 남아 있어도 적을 수 있다.
		if ((t.state === "완료" || t.state === "진행") && open)
			problems.push(`${at}: 앞 Task가 끝나지 않았는데 ${t.state}이다`);
		if (!done) open = true;
		if (t.state === "완료") {
			const p = recordProblem(root, config, t);
			if (p) problems.push(`${at}: 완료인데 ${p}`);
		}
		if (t.state === "제외" && !/^제외\s*:/.test(t.record))
			problems.push(
				`${at}: 제외는 기록 칸에 "제외: 사유 (사용자, 날짜)"를 적는다`,
			);
	}
	// 진행 계획 라운드가 열려 있으면 고치는 중이다. 지문이 없는 계획은 Task 게이트가 막고, Task를 시작했는데 없으면 지운 것이다.
	const planRound = () =>
		parseActive(readTodo(root, config) ?? "")?.rows.some(
			(r) => r.text === PLAN_DOC_ROW,
		);
	const diff = `git diff ${config.planPath}`;
	if (plan.sig && plan.sig !== planSig(plan.tasks) && !planRound())
		problems.push(
			`Task 구성(번호·제목·순서)이 마지막 진행 계획 라운드 뒤에 바뀌었다. 먼저 손으로 고친 것을 되돌린다(${diff}). 계획을 바꿔야 하면 열린 라운드를 닫은 뒤 진행 계획 라운드(pnpm dev-cycle table A --write --title "진행 계획 고치기" --plan)에서 고친다. 제외는 상태와 기록 칸만 바꾼다`,
		);
	if (
		!plan.sig &&
		plan.tasks.some((t) => t.state === "진행" || t.state === "완료") &&
		!planRound()
	)
		problems.push(
			`Task를 시작한 진행 계획에 지문(sig=)이 없다. 지웠으면 되돌린다(${diff}). 처음부터 없었으면 열린 라운드를 닫은 뒤 진행 계획 라운드로 확정한다(pnpm dev-cycle table A --write --title "진행 계획" --plan)`,
		);
	if (plan.tasks.filter((t) => t.state === "진행").length > 1)
		problems.push("진행 중인 Task가 둘 이상이다. Task는 하나씩 끝낸다");
	if (!plan.tasks.length)
		problems.push("Task 행이 없다 (| T1 | 제목 | 대기 | |)");
	const next =
		plan.tasks.find((t) => t.state === "대기" || t.state === "진행") ?? null;
	return { plan, problems, next };
}

// Task 행의 상태와 기록만 바꾼 진행 계획 글을 돌려준다. 계획 블록 밖의 줄(예시 표 등)은 그대로 둔다.
function taskText(md, config, id, { state, record }) {
	const plan = parsePlan(md);
	const cur = plan?.tasks.find((t) => t.id === id);
	if (!cur)
		throw new UsageError(`${config.planPath}에서 ${id} 행을 찾지 못했다`);
	const re = new RegExp(
		`^(\\s*\\|\\s*${id}\\s*\\|[^|\\r\\n]*\\|)[^|\\r\\n]*\\|[^\\r\\n]*$`,
		"m",
	);
	const rec = record
		? [cur.record, record].filter(Boolean).join(", ")
		: cur.record;
	const block = md
		.slice(plan.start, plan.end)
		.replace(re, `$1 ${state} |${rec ? ` ${rec} ` : " "}|`);
	return md.slice(0, plan.start) + block + md.slice(plan.end);
}
function writeTask(root, config, id, change) {
	const p = join(root, config.planPath);
	writeFileSync(p, taskText(readFileSync(p, "utf8"), config, id, change));
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
		now = new Date(),
		task,
		plan = false,
		noTask = false,
	} = {},
) {
	const md = readTodo(root, config) ?? "# 작업\n";
	const active = parseActive(md);
	if (plan && task !== undefined)
		throw new UsageError(
			"--plan과 --task는 함께 쓰지 않는다. 진행 계획 라운드는 --plan, Task 라운드는 --task로 연다",
		);
	if (noTask && (plan || task !== undefined))
		throw new UsageError("--no-task는 --plan·--task와 함께 쓰지 않는다");
	if (plan && active && !active.rows.some((r) => r.text === PLAN_DOC_ROW))
		throw new UsageError(
			"--plan은 진행 계획 라운드에만 쓴다. 열린 라운드를 close로 닫은 뒤 새로 연다",
		);
	if (write && active && !upgrade)
		throw new UsageError(
			"활성 라운드가 이미 있다. close로 닫거나 --upgrade를 쓴다",
		);
	if (upgrade && !active)
		throw new UsageError("--upgrade할 활성 라운드가 없다");
	if (task !== undefined) {
		if (upgrade)
			throw new UsageError(
				"--upgrade는 지금 라운드의 Task를 그대로 쓴다. --task를 빼고 실행한다",
			);
		const chk = planCheck(root, config);
		if (!chk?.plan)
			throw new UsageError(
				`--task를 쓰려면 진행 계획(${config.planPath})이 있어야 한다${chk?.note ? `: ${chk.note}` : ""}`,
			);
		const at = chk.plan.tasks.findIndex((t) => t.id === task);
		if (at < 0) throw new UsageError(`진행 계획에 ${task}가 없다`);
		if (chk.problems.length)
			throw new UsageError(
				`진행 계획에 문제가 있다 → pnpm dev-cycle plan: ${chk.problems.join("; ")}`,
			);
		if (!chk.plan.sig)
			throw new UsageError(`진행 계획에 지문(sig=)이 없다. ${PLAN_UNSIGNED}`);
		const waiting = chk.plan.tasks
			.slice(0, at)
			.filter((t) => t.state !== "완료" && t.state !== "제외");
		if (waiting.length)
			throw new UsageError(
				`앞 Task가 끝나지 않았다: ${waiting.map((t) => `${t.id}(${t.state})`).join(", ")} → 그 Task를 먼저 끝낸다. 사용자가 미루자고 하면 제외할지, 진행 계획 라운드(--plan)에서 순서를 바꿀지 묻는다`,
			);
		if (!["대기", "진행"].includes(chk.plan.tasks[at].state))
			throw new UsageError(`${task}는 이미 ${chk.plan.tasks[at].state}이다`);
		// 앞 라운드가 남긴 계획 변경(지문, Task 상태)을 커밋하지 않으면 이 Task의 diff와 커밋에 섞인다.
		if (
			write &&
			git(root, ["status", "--porcelain", "--", config.planPath]).trim()
		)
			throw new UsageError(
				`${config.planPath}에 커밋하지 않은 변경이 있다. 앞 라운드(진행 계획이나 앞 Task)의 결과를 커밋한 뒤 연다(prokit-dev-cycle 5. 종료)`,
			);
	}
	// Task 게이트는 --task로 열 때만 본다. Task 일을 --task 없이 여는 실수는 알린다(버그 수정·하네스 변경은 --task 없이 연다).
	// 진행 계획 라운드가 열려 있으면 그 라운드에서 이어 가므로 알리지 않는다.
	const planOpen = active?.rows.some((r) => r.text === PLAN_DOC_ROW);
	const plain = task === undefined && !upgrade && !plan && !planOpen;
	const chk = plain ? planCheck(root, config) : null;
	const pending = chk?.next;
	// 기존 프로젝트는 진행 계획을 확정하기 전에 일을 그냥 라운드로 열지 못하게 한다. 계획에 없는 일을 사용자가 먼저 하라고 했으면 --no-task로 연다.
	const signed = chk?.plan?.sig && chk.plan.sig === planSig(chk.plan.tasks);
	const unplanned =
		plain && !noTask && !signed && EXISTING_TYPES.includes(config.projectType)
			? `확정한 진행 계획이 없다(${config.planPath}의 dev-cycle:plan 블록과 지문). 기존 프로젝트는 정밀 분석과 진행 계획 라운드부터 연다 → ${PLAN_ROUND_CMD}. 경로 규칙·하네스 맞추기와 기능 일은 진행 계획의 Task로 한다. ${NO_TASK_NOTE}`
			: null;
	if (write && unplanned) throw new UsageError(unplanned);
	const warning =
		pending && active?.meta.task !== pending.id
			? `경고: 진행 계획에 끝나지 않은 Task가 있다(${pending.id} ${pending.state}). 이 라운드가 그 Task의 일이면 ${active ? "열린 라운드를 닫은 뒤 " : ""}--task ${pending.id}로 연다. 버그 수정·하네스 변경이면 그대로 진행한다`
			: unplanned && `경고: ${unplanned}`;
	const base = active ? active.meta.base : resolveBase(root, config);
	const cls = classify(
		active ? roundFiles(root, active) : changedFiles(root, base),
		config,
	);
	const key = caseKey ?? cls.pathCase;
	if (!CASES.includes(key))
		throw new UsageError(
			`알 수 없는 케이스: ${key} (가능: ${CASES.join(", ")})`,
		);
	if (plan && !upgrade && key !== "A")
		throw new UsageError(
			`--plan은 케이스 A(계획 문서만 바꾸는 라운드)로 연다. 지금 diff 판정은 ${cls.pathCase}다`,
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
		const vitest = carried.findIndex((r) => r.text === VITEST_ROW);
		if (vitest >= 0) rows.unshift(carried.splice(vitest, 1)[0]);
		const at = rows.findIndex((r) => r.tag === "confirm");
		rows.splice(at < 0 ? rows.length : at, 0, ...carried);
	}
	// 그 package.json이 없는 폴더 구조(도입 프로젝트)와 C는 prokit-dev-cycle 2절대로 직접 넣는다.
	const testPkg =
		TEST_PACKAGE[key] && join(root, TEST_PACKAGE[key], "package.json");
	const hasTest = (file) => {
		try {
			return Boolean(JSON.parse(readFileSync(file, "utf8")).scripts?.test);
		} catch {
			return true; // 읽을 수 없는 package.json이면 판단하지 않고 넣지 않는다
		}
	};
	if (
		testPkg &&
		existsSync(testPkg) &&
		!rows.some((r) => r.text === VITEST_ROW) &&
		!hasTest(testPkg)
	)
		rows.unshift({ text: VITEST_ROW, evidence: "" });
	// Task 라운드: 세부 계획·계획 리뷰 행을 맨 앞에 둔다. --upgrade로 옮겨 온 같은 행의 증거는 지킨다.
	if (task ?? active?.meta.task) {
		const old = new Map((active?.rows ?? []).map((r) => [r.text, r.evidence]));
		for (let i = rows.length - 1; i >= 0; i--)
			if ([TASK_PLAN_ROW, TASK_REVIEW_ROW].includes(rows[i].text))
				rows.splice(i, 1);
		rows.unshift(
			...taskRows(rows).map((text) => ({
				text,
				evidence: old.get(text) ?? "",
			})),
		);
	}
	if (plan || active?.rows.some((r) => r.text === PLAN_DOC_ROW)) {
		const old = new Map((active?.rows ?? []).map((r) => [r.text, r.evidence]));
		const fixed = planRows(config, rows);
		for (let i = rows.length - 1; i >= 0; i--)
			if (
				[PLAN_ANALYSIS_ROW, PLAN_DOC_ROW, PLAN_REVIEW_ROW].includes(
					rows[i].text,
				)
			)
				rows.splice(i, 1);
		rows.unshift(
			...fixed.map((text) => ({ text, evidence: old.get(text) ?? "" })),
		);
	}
	const meta = {
		case: key,
		base,
		auth: cls.auth || Boolean(active?.meta.auth),
		opened: active?.meta.opened ?? archiveDay(now),
		title: title ?? active?.title ?? "제목 없음",
		task: task ?? active?.meta.task,
		notask: noTask || active?.meta.notask === "true",
		brains: active?.meta.brains,
		skills: active?.meta.skills === "true",
	};
	const block = renderBlock(meta, rows, upgrade ? extra : []);
	if (write) {
		if (task !== undefined) writeTask(root, config, task, { state: "진행" });
		const next = active
			? md.slice(0, active.start) + block + md.slice(active.end)
			: `${md.replace(/\s*$/, "")}\n\n${block}\n`;
		const p = join(root, config.todoPath);
		mkdirSync(dirname(p), { recursive: true });
		writeFileSync(p, next);
	}
	return {
		case: key,
		base,
		rows: rows.length,
		auth: meta.auth,
		block,
		...(warning ? { warning } : {}),
	};
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
		throw new UsageError(
			"증거 파일은 프로젝트 밖을 가리킬 수 없다. tasks/evidence/에 두고 다시 실행한다",
		);
	let stat;
	try {
		stat = statSync(file);
	} catch (error) {
		throw new UsageError(`증거 파일을 확인할 수 없다: ${error.message}`);
	}
	if (!stat.isFile()) throw new UsageError("증거 파일은 일반 파일이어야 한다");
	if (stat.size > EVIDENCE_MAX_BYTES)
		throw new UsageError("증거 파일이 너무 크다");
	// echo와 편집기가 붙이는 끝 줄바꿈 하나는 한 줄로 본다.
	const evidence = readFileSync(file, "utf8").replace(/\r?\n$/, "");
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
	if (
		isPlanRound(active) &&
		isConfirm(line.slice(marks[1] + 1, marks[2]).trim())
	) {
		// 분석·계획·계획 리뷰가 끝나기 전의 확인은 최종 계획을 본 확인이 아니다.
		const early = active.rows.find(
			(r) =>
				([PLAN_ANALYSIS_ROW, PLAN_DOC_ROW].includes(r.text) ||
					r.text.includes("prokit-reviewer(plan)")) &&
				rowProblem(r),
		);
		const p =
			confirmProblem({ text: "[confirm]", evidence }) ??
			(early
				? `${early.text.split(" ")[0]} 행이 아직 끝나지 않았다. 정밀 분석·계획 문서·계획 리뷰를 끝낸 뒤 최종 요약을 보여 준다`
				: planConfirmProblem(root, config, evidence, true));
		if (p)
			throw new UsageError(
				`진행 계획 라운드의 확인 행: ${p} — ${PLAN_CONFIRM_NOTE}`,
			);
	}
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

// "진행해", "추천대로 해" 같은 진행 지시만 적은 확인. 결과를 봤다는 말이나 확인 없이 닫자는 말이 같이 있으면 받는다
const GO_ONLY_RE =
	/추천(?:한)?\s*대로|진행(?:하라|해\s*줘|해라|하자)|계속(?:하라|해\s*줘|해라)/;
const SEEN_RE = /확인\s*없이|확인했|확인함|써\s*보고|써\s*봤|봤다|봤음/;

export function confirmProblem(row) {
	if (!/^\[confirm\]/i.test(row.text)) return null;
	const value = bare(row.evidence);
	if (SKIP_RE.test(value.replace(/^[*_(\s]+/, "")))
		return "사용자 확인 행은 N/A·PASS·blocked·미실행으로 넘길 수 없다 (사용자가 확인한 내용과 날짜)";
	if (GO_ONLY_RE.test(value) && !SEEN_RE.test(value))
		return "진행 지시(진행해·추천대로)는 확인이 아니다. 결과를 보여 주고 사용자가 확인한 내용, 또는 확인 없이 닫자는 말과 날짜를 적는다";
	return null;
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
		return "계획 리뷰 증거는 prokit-reviewer(plan): approve, max=none|low|medium 결과여야 한다 (N/A 불가). 예: prokit-reviewer(plan): approve, max=low, 반영 3건";
	if (r.text === TASK_PLAN_ROW && !/\S+\.md\b/.test(value))
		return "Task 세부 계획 증거는 계획 문서 경로(.md)다 (N/A 불가)";
	if (
		[PLAN_ANALYSIS_ROW, PLAN_DOC_ROW].includes(r.text) &&
		!/\S+\.md\b/.test(value)
	)
		return "정밀 분석·진행 계획 증거는 문서 경로(.md)다 (N/A 불가)";
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
	const planRound = isPlanRound(active);
	const problemOf = roundRowProblem(root, config, active);
	active.rows.forEach((r, i) => {
		const p = problemOf(r);
		if (p)
			problems.push(
				`#${i + 1} ${r.text}: ${p}${planRound && isConfirm(r.text) ? ` — ${PLAN_CONFIRM_NOTE}` : ""}`,
			);
	});
	const X = active.meta.case;
	const cls = classify(roundFiles(root, active), config);
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
	const plan = planCheck(root, config);
	if (plan) for (const p of plan.problems) problems.push(`진행 계획: ${p}`);
	if (active.rows.some((r) => r.text === PLAN_DOC_ROW)) {
		if (!plan?.plan)
			problems.push(
				`진행 계획 라운드인데 ${config.planPath}에 진행 계획 블록이 없다${plan?.note ? ` (${plan.note})` : ""}`,
			);
		for (const text of planRows(config, active.rows))
			if (!active.rows.some((r) => r.text === text))
				problems.push(
					`필수 행 누락: ${text} → pnpm dev-cycle table ${active.meta.case} --write --upgrade --plan`,
				);
	}
	if (active.meta.task) {
		for (const text of taskRows(active.rows))
			if (!active.rows.some((r) => r.text === text))
				problems.push(
					`필수 행 누락: ${text} → pnpm dev-cycle table ${active.meta.case} --write --upgrade`,
				);
		const t = plan?.plan?.tasks.find((x) => x.id === active.meta.task);
		if (!t)
			problems.push(
				`진행 계획에 이 라운드의 Task ${active.meta.task}가 없다${plan?.note ? ` (${plan.note})` : ""}`,
			);
		else if (t.state !== "진행")
			problems.push(
				`이 라운드의 Task ${t.id}가 진행 상태가 아니다(지금 ${t.state})`,
			);
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
		// 완료 판정이 막혀도 packet 자체의 문제를 함께 보여 줘야 고칠 수 있다.
		if (completion)
			problems.push(
				`위임 완료 검증 실패: ${[completion, ...(result.problems ?? [])].join("; ")}`,
			);
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

// 다음 Task를 여는 명령. 그 Task의 라운드가 열려 있으면 이어 가고, 다른 라운드가 열려 있으면 먼저 닫는다.
// open: 열린 라운드가 없으면 null, 있으면 { task }. 지문이 없는 계획은 진행 계획 라운드로 먼저 확정한다.
const PLAN_UNSIGNED =
	'Task는 진행 계획 라운드를 닫아 확정한 계획에서만 연다 → pnpm dev-cycle table A --write --title "진행 계획" --plan';
const nextCmd = (t, open, sig) =>
	open?.task === t.id
		? "열린 라운드에서 이어 간다"
		: !open && !sig
			? `지문(sig=) 없음. ${PLAN_UNSIGNED}`
			: `${open ? "열린 라운드를 닫은 뒤 " : ""}pnpm dev-cycle table <케이스> --write --title "${t.id} …" --task ${t.id}`;

// 진행 계획과 전환의 기존 코드 경로를 status 끝에 한 줄씩 붙인다.
function planLines(root, config, open) {
	const chk = planCheck(root, config);
	const lines = [];
	if (chk?.plan) {
		const done = chk.plan.tasks.filter(
			(t) => t.state === "완료" || t.state === "제외",
		).length;
		lines.push(
			`진행 계획: ${done}/${chk.plan.tasks.length} 끝남 — ${chk.next ? `다음 ${chk.next.id} "${chk.next.title}"(${chk.next.state}) → ${nextCmd(chk.next, open, chk.plan.sig)}` : "모든 Task가 끝났다"}${chk.problems.length ? ` — 문제 ${chk.problems.length}건(pnpm dev-cycle plan)` : ""}`,
		);
	} else if (chk)
		lines.push(
			`진행 계획: ${chk.note}${!open && EXISTING_TYPES.includes(config.projectType) ? ` → 진행 계획 라운드에서 project-plan.md 형식으로 다시 쓴다: ${PLAN_ROUND_CMD}` : ""}`,
		);
	else if (!open && EXISTING_TYPES.includes(config.projectType))
		lines.push(
			`진행 계획: 아직 없다 → 정밀 분석과 진행 계획부터: ${PLAN_ROUND_CMD}. ${NO_TASK_NOTE}`,
		);
	if (config.legacy?.path)
		lines.push(`기존 코드(읽기 전용 참조): ${config.legacy.path}`);
	return lines;
}

// 라운드를 열고 이어받을 때 고른 두뇌와 그 두뇌 파일을 보여 준다.
const brainLine = (config) => {
	const b = brainsOf(config);
	return b.length
		? `두뇌: ${b.join(", ")} → 단계 행은 ${b.map((x) => `${BRAINS_DIR}/${x}.md`).join(", ")}의 방법으로 한다`
		: "두뇌: 없음(기본 칸)";
};

// table --write 출력: 단계 행마다 부를 두뇌 스킬
function stageGuide(root, config) {
	const brains = brainsOf(config);
	const md = brains.length && readTodo(root, config);
	const active = md && parseActive(md);
	if (!active) return "";
	const lines = active.rows
		.map((r, i) => [i + 1, brainStageSkills(root, brains, r.text, active.rows)])
		.filter(([, c]) => c)
		.map(([n, c]) => `  #${n}: ${c.names.join(", ")} (${c.brain})`);
	return lines.length
		? `\n단계 행에서 먼저 부를 두뇌 스킬(Claude Code는 Skill 도구, 다른 도구는 SKILL.md):\n${lines.join("\n")}`
		: "";
}

export function status(root, config) {
	const s = statusOfRound(root, config);
	const extra = planLines(root, config, s.active ? { task: s.task } : null);
	const lines = [s.line, ...(s.active ? [brainLine(config)] : []), ...extra];
	return { ...s, planLines: extra, line: lines.join("\n") };
}

function statusOfRound(root, config) {
	const md = readTodo(root, config);
	const active = md && parseActive(md);
	if (!active) {
		return {
			active: false,
			line: '활성 라운드 없음 — pnpm dev-cycle case로 판정한 뒤 pnpm dev-cycle table <케이스> --write --title "<요약>"으로 연다 (케이스는 요청 기준, 아직 diff가 없으면 판정은 A)',
		};
	}
	const problemOf = roundRowProblem(root, config, active);
	const filled = active.rows.filter((r) => !problemOf(r)).length;
	const next = active.rows.find(problemOf)?.text ?? null;
	const cover =
		next && brainStageSkills(root, brainsOf(config), next, active.rows);
	const line = `라운드 ${active.meta.case}${active.meta.task ? `(${active.meta.task})` : active.meta.notask === "true" ? "(--no-task)" : ""} "${active.title}" — ${filled}/${active.rows.length}칸 — 다음: ${next ?? "audit 후 close"}${next && isConfirm(next) && isPlanRound(active) ? ` — ${PLAN_CONFIRM_NOTE}` : ""}${cover ? ` — 이 행은 두뇌 ${cover.brain}의 ${cover.names.join(", ")}를 먼저 불러서 한다` : ""}`;
	return {
		active: true,
		case: active.meta.case,
		task: active.meta.task,
		filled,
		total: active.rows.length,
		next,
		line,
	};
}

// 라운드를 연 날과 아카이브 날짜는 릴리스 노트와 같은 한국 시간으로 쓴다.
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
		.replace(
			"<!-- dev-cycle:start ",
			`<!-- dev-cycle:archived closed=${day} ${partial && (blocked || skipped) ? "partial=true " : ""}`,
		)
		.replace("## 활성 라운드: ", "## 라운드: ")
		.replace(END_TAG, "<!-- dev-cycle:archived-end -->");
	const before = md.slice(0, active.start).replace(/\s*$/, "");
	const after = md.slice(active.end).replace(/^\s*/, "");
	const remaining = `${[before, after].filter(Boolean).join("\n\n").replace(/\s*$/, "")}\n`;
	const completed = completedOutsideRound(remaining);
	// 진행 계획의 Task 라운드면 보관 파일을 기록하고, 부분 완료가 아니면 그 Task를 끝낸다.
	// 계획 글은 보관하기 전에 만든다. 만들지 못하면(행을 못 찾음) 라운드를 닫지 않는다.
	const task = active.meta.task;
	const planFile = join(root, config.planPath);
	const planNext = task
		? taskText(readFileSync(planFile, "utf8"), config, task, {
				state: partial && (blocked || skipped) ? "진행" : "완료",
				record: relative(root, archivePath).split(sep).join("/"),
			})
		: active.rows.some((r) => r.text === PLAN_DOC_ROW) && existsSync(planFile)
			? signPlan(readFileSync(planFile, "utf8"))
			: null;
	archiveTodo(
		root,
		config,
		completed.todo,
		archivePath,
		`# ${active.title}\n\n${archived}\n${archiveLinks(completed.archived, todoPath, archivePath)}`,
	);
	if (planNext !== null) writeFileSync(planFile, planNext);
	return { ok: true, archivePath, task };
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

// 커밋·릴리스 전 검사: 코드·하네스 변경이 dev-cycle 라운드를 거쳤는지 본다.
// --staged는 pre-commit 훅이(활성 라운드, 함께 커밋하는 닫은 라운드 기록, 설치 커밋이면 통과),
// --since <ref>는 release.mjs가 부른다(그 사이 더한 닫은 라운드 기록이 있어야 통과).
const ROUND_RECORD = "<!-- dev-cycle:archived ";
export function guard(root, config, since) {
	const range = since ? [`${since}..HEAD`] : ["--cached"];
	const names = (...filter) =>
		splitZ(
			git(root, [
				"-c",
				"core.quotePath=false",
				"diff",
				"-z",
				"--name-only",
				"--no-renames",
				"--relative",
				...filter,
				...range,
				"--",
			]),
		);
	const cls = classify(names(), config);
	if (cls.pathCase === "A" && !cls.auth)
		return { ok: true, why: "코드 변경 없음" };
	const added = names("--diff-filter=A");
	if (!since && added.includes(".dev-cycle.json"))
		return { ok: true, why: "프로킷 설치 커밋" };
	const dir = `${config.archiveDir.replace(/\/+$/, "")}/`;
	const record = added.find(
		(f) =>
			f.startsWith(dir) &&
			f.endsWith(".md") &&
			!f.endsWith("/README.md") &&
			git(root, ["show", `${since ? "HEAD" : ""}:${f}`]).includes(ROUND_RECORD),
	);
	if (record) return { ok: true, why: `라운드 기록 ${record}` };
	const md = !since && readTodo(root, config);
	if (md && parseActive(md)) return { ok: true, why: "활성 라운드" };
	return {
		ok: false,
		pathCase: cls.pathCase,
		files: cls.evidence.map((e) => e.file),
	};
}

// 편집 전 확인(Claude Code PreToolUse 훅): 열린 라운드 없이 코드·하네스 파일을 고치려 하면 막을 사유, 아니면 null.
// pre-commit guard는 커밋할 때에야 알려서, 라운드를 건너뛰고 다 고친 뒤에 알게 된다. Bash로 고치는 것은 보지 않는다.
export function editGuard(root, config, input) {
	const t = input?.tool_input ?? {};
	const file = t.file_path ?? t.notebook_path;
	if (typeof file !== "string" || !file) return null;
	const abs = resolve(input.cwd ?? root, file);
	// 있는 가장 가까운 상위 폴더까지 실제 경로로 바꾼다. 프로젝트 폴더가 심볼릭 링크 너머여도(macOS /var 등) 같은 파일로 본다
	const real = (p) => {
		for (
			let d = p, rest = "";
			;
			rest = join(basename(d), rest), d = dirname(d)
		) {
			try {
				return join(realpathSync(d), rest);
			} catch {
				if (dirname(d) === d) return p;
			}
		}
	};
	const rel = [relative(root, abs), relative(real(root), real(abs))].find(
		(r) => r && !/^\.\.([/\\]|$)/.test(r) && !isAbsolute(r),
	);
	if (!rel) return null;
	const cls = classify([rel.split(sep).join("/")], config);
	if (cls.pathCase === "A" && !cls.auth) return null;
	const md = readTodo(root, config);
	if (md && parseActive(md)) return null;
	return `dev-cycle: 열린 라운드 없이 ${rel}(케이스 ${cls.pathCase} 경로)를 고치려 한다. prokit-dev-cycle대로 pnpm dev-cycle status를 보고 pnpm dev-cycle table <케이스> --write --title "<요약>"로 라운드를 연 뒤 고친다. 코드를 바꾸지 않는 요청이면 이 파일을 고치지 않는다.`;
}

const USAGE =
	"사용법: dev-cycle <case | table [CASE] [--write] [--upgrade] [--title 제목] [--task T번호 | --plan | --no-task] | evidence <행 번호> --file <증거 파일> | status | plan | audit [--packet 파일 --context 파일] | resource <check|run|clean> | delegation <capture|diff|resolve|validate|accept> | close [--partial] | archive | secrets | guard --staged | guard --since <ref>> [--json]";

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

const digest = (value) =>
	createHash("sha256")
		.update(typeof value === "string" ? value : JSON.stringify(value))
		.digest("hex");

const sameJson = (left, right) => isDeepStrictEqual(left, right);

function acceptUsage() {
	return "사용법: dev-cycle delegation accept --base <commit> --scope <경로/**> --focus <경로> --contract <계약> --provider <프로젝트 안 prokit-reviewer source> [--provider <프로젝트 안 source>] [--artifact <프로젝트 안 file>] --check <JSON argv 배열> [--check <JSON argv 배열>]";
}

function acceptArgv(value, flag) {
	let argv;
	try {
		argv = JSON.parse(value);
	} catch {
		throw new UsageError(`${flag}는 JSON argv 배열이어야 한다`);
	}
	if (
		!Array.isArray(argv) ||
		argv.length === 0 ||
		argv.some((arg) => typeof arg !== "string" || !arg || arg.includes("\0"))
	) {
		throw new UsageError(
			`${flag}는 비어 있지 않은 문자열 argv 배열이어야 한다`,
		);
	}
	return argv;
}

function acceptOptions(args) {
	const out = {
		scopes: [],
		focus: [],
		contracts: [],
		providers: [],
		artifacts: [],
		checks: [],
	};
	for (let index = 0; index < args.length; index += 1) {
		const flag = args[index];
		const value = args[index + 1];
		if (
			![
				"--base",
				"--scope",
				"--focus",
				"--contract",
				"--provider",
				"--artifact",
				"--check",
			].includes(flag) ||
			value == null ||
			value.startsWith("--")
		) {
			throw new UsageError(acceptUsage());
		}
		index += 1;
		if (flag === "--base") {
			if (out.base) throw new UsageError("--base는 한 번만 지정한다");
			out.base = value;
		} else if (flag === "--scope") out.scopes.push(value);
		else if (flag === "--focus") out.focus.push(value);
		else if (flag === "--contract") out.contracts.push(value);
		else if (flag === "--provider") out.providers.push(value);
		else if (flag === "--artifact") out.artifacts.push(value);
		else if (flag === "--check") out.checks.push(acceptArgv(value, flag));
	}
	if (
		!out.base ||
		!SHA_RE.test(out.base) ||
		!out.scopes.length ||
		!out.focus.length ||
		!out.contracts.length ||
		!out.checks.length
	) {
		throw new UsageError(acceptUsage());
	}
	for (const value of [...out.scopes, ...out.focus, ...out.artifacts]) {
		if (
			!value ||
			value.includes("\0") ||
			value.startsWith("/") ||
			value.split(/[\\/]/).includes("..")
		) {
			throw new UsageError("scope·focus는 프로젝트 안 경로여야 한다");
		}
	}
	if (out.contracts.some((value) => !value.trim() || value.includes("\0")))
		throw new UsageError("contract는 비어 있지 않은 문자열이어야 한다");
	if (
		!out.providers.some((value) =>
			/(?:^|[\\/])prokit-reviewer\.md$/.test(value),
		)
	)
		throw new UsageError("--provider에 현재 prokit-reviewer source를 넣는다");
	return out;
}

function observeAcceptArtifacts(root, paths) {
	const project = resolve(root);
	const artifacts = paths.map((path) => {
		const full = resolve(project, path);
		if (!full.startsWith(`${project}${sep}`))
			throw new UsageError("artifact는 프로젝트 안 파일이어야 한다");
		try {
			const stat = lstatSync(full);
			if (!stat.isFile() || stat.isSymbolicLink())
				throw new Error("not regular file");
			return {
				path,
				hash: createHash("sha256").update(readFileSync(full)).digest("hex"),
			};
		} catch {
			throw new UsageError(`artifact를 읽을 수 없다: ${path}`);
		}
	});
	if (
		new Set(artifacts.map((artifact) => artifact.path)).size !==
		artifacts.length
	)
		throw new UsageError("같은 artifact를 두 번 지정할 수 없다");
	return artifacts;
}

function observeAcceptProviders(root, refs) {
	const providers = refs.map((ref) => {
		const observed = observeProvider(ref, {
			root,
			accessibleRoots: [root],
			requestedScope: "project",
		});
		if (!observed.ok)
			throw new UsageError(`provider source를 관측할 수 없다: ${ref}`);
		return {
			ref,
			name: observed.observation.name,
			origin: observed.observation.origin,
			canonicalLocation: observed.observation.canonicalLocation,
			contentHash: observed.observation.contentHash,
		};
	});
	if (
		new Set(providers.map((provider) => provider.canonicalLocation)).size !==
		providers.length
	)
		throw new UsageError("같은 provider source를 두 번 지정할 수 없다");
	return providers;
}

const providerSource = ({ ref, ...provider }) => provider;

function validationProviders(sources) {
	return sources.map((source, index) => ({
		name: `local-source-${index + 1}`,
		origin: source.origin,
		canonicalLocation: source.canonicalLocation,
		contentHash: source.contentHash,
		scope: "project",
		type: "source",
		mode: "read-only",
		host: "local",
		capabilities: [],
		tools: [],
		sideEffects: [],
		dependencies: [],
	}));
}

function acceptedScope(path, scopes) {
	return scopes.some((scope) => {
		if (scope === "**") return true;
		if (scope.endsWith("/**")) return path.startsWith(scope.slice(0, -2));
		return path === scope;
	});
}

async function guardedAcceptCommand(root, argv, kind) {
	let spawned = false;
	const result = await runGuarded(root, {
		command: argv[0],
		args: argv.slice(1),
		kind,
		captureOutput: true,
		onChildSpawn: () => {
			spawned = true;
		},
	});
	return {
		argv,
		command: argv.join(" "),
		exitCode: result.exitCode,
		executed: spawned,
		stdout: result.stdout,
		stderr: result.stderr,
		resource: {
			before: result.before?.status ?? "unknown",
			after: result.after?.status ?? "unknown",
			events: result.events ?? [],
			groupWasActive: result.groupWasActive === true,
		},
	};
}

function codexRuntime() {
	try {
		const executable = realpathSync(
			execFileSync("which", ["codex"], { encoding: "utf8" }).trim(),
		);
		return {
			executable,
			hash: createHash("sha256").update(readFileSync(executable)).digest("hex"),
		};
	} catch {
		throw new UsageError("Codex CLI 실행 파일을 관측할 수 없다");
	}
}

function reviewerSchema() {
	const properties = {
		verdict: {
			type: "string",
			enum: ["approve", "changes-required", "blocked"],
		},
		focus: { type: "string", enum: ["plan", "code", "security", "db"] },
		skills_read: { type: "array", items: { type: "string" } },
		actual_contract: { type: "array", items: { type: "string" } },
		evidence_hash: { type: "string" },
		integration_acceptance: {
			type: "string",
			enum: ["accept", "changes-required", "blocked"],
		},
		max_severity: {
			type: "string",
			enum: ["none", "low", "medium", "high", "critical"],
		},
		findings: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				required: ["severity", "file", "line", "evidence", "fix"],
				properties: {
					severity: {
						type: "string",
						enum: ["none", "low", "medium", "high", "critical"],
					},
					file: { type: "string" },
					line: { type: "integer", minimum: 1 },
					evidence: { type: "string" },
					fix: { type: "string" },
				},
			},
		},
		limitations: { type: "array", items: { type: "string" } },
		reused: { type: "boolean" },
		product_hash: { type: "string" },
		provider_actual_hashes: { type: "array", items: { type: "string" } },
		provider_sources: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				required: ["name", "origin", "canonicalLocation", "contentHash"],
				properties: {
					name: { type: "string" },
					origin: { type: "string" },
					canonicalLocation: { type: "string" },
					contentHash: { type: "string" },
				},
			},
		},
		artifacts: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				required: ["path", "hash"],
				properties: { path: { type: "string" }, hash: { type: "string" } },
			},
		},
		environment_fingerprint: { type: "string" },
		bound_focus: { type: "array", items: { type: "string" } },
		contracts: { type: "array", items: { type: "string" } },
		changed: { type: "array", items: { type: "string" } },
		reviewer_runtime: {
			type: "object",
			required: ["executable", "hash"],
			additionalProperties: false,
			properties: {
				executable: { type: "string" },
				hash: { type: "string" },
			},
		},
	};
	return {
		type: "object",
		additionalProperties: false,
		required: Object.keys(properties),
		properties,
	};
}

async function runCodexReviewer(root, expected, sources) {
	const runtime = expected.reviewer_runtime;
	const temp = mkdtempSync(join(tmpdir(), "prokit-accept-review-"));
	let safeToDispose = false;
	const schema = join(temp, "schema.json");
	const output = join(temp, "review.json");
	writeFileSync(schema, JSON.stringify(reviewerSchema()));
	const reviewerSource = sources.find((source) =>
		/(?:^|[\\/])prokit-reviewer\.md$/.test(source.ref),
	);
	const reviewInput = expected;
	const prompt = [
		"현재 프로젝트의 읽기 전용 기술 인수 검토를 수행한다.",
		`프로필 source: ${reviewerSource.ref}`,
		"프로필과 changed·focus·contract·artifact를 읽고 수정하지 않는다.",
		"최종 응답은 output schema에 맞는 JSON 하나여야 한다. binding 값은 그대로 반환하되, 결함·불확실성이 있으면 verdict와 integration_acceptance를 changes-required 또는 blocked로 정직하게 낸다.",
		JSON.stringify(reviewInput),
	].join("\n");
	try {
		const run = await guardedAcceptCommand(
			root,
			[
				runtime.executable,
				"exec",
				"--ephemeral",
				"--sandbox",
				"read-only",
				"--cd",
				resolve(root),
				"--output-schema",
				schema,
				"--output-last-message",
				output,
				prompt,
			],
			"verify",
		);
		safeToDispose =
			!run.resource.groupWasActive &&
			!run.resource.events.includes("child-group-active");
		return existsSync(output)
			? { ...run, stdout: readFileSync(output, "utf8") }
			: { ...run, stdout: "" };
	} finally {
		if (safeToDispose) rmSync(temp, { recursive: true, force: true });
	}
}

function receiptFor(
	run,
	taskId,
	runId,
	before,
	after,
	environmentFingerprint,
	artifacts,
) {
	return {
		command: run.command,
		argv: run.argv,
		exitCode: run.exitCode,
		executed: run.executed,
		taskId,
		runId,
		cwd: process.cwd(),
		environmentFingerprint,
		before,
		after,
		artifacts,
		effects: [],
		identityDigest: digest({
			argv: run.argv,
			exitCode: run.exitCode,
			executed: run.executed,
			resource: run.resource,
		}),
	};
}

function reviewProblem(output, expected) {
	if (!output || typeof output !== "object" || Array.isArray(output))
		return "reviewer 결과가 JSON 객체가 아니다";
	const keys = [
		"verdict",
		"focus",
		"skills_read",
		"actual_contract",
		"evidence_hash",
		"integration_acceptance",
		"max_severity",
		"findings",
		"limitations",
		"reused",
		"product_hash",
		"provider_actual_hashes",
		"provider_sources",
		"artifacts",
		"environment_fingerprint",
		"bound_focus",
		"contracts",
		"changed",
		"reviewer_runtime",
	];
	if (
		Object.keys(output).length !== keys.length ||
		keys.some((key) => !(key in output))
	)
		return "reviewer 결과 schema가 정확하지 않다";
	if (
		output.verdict !== "approve" ||
		output.integration_acceptance !== "accept"
	)
		return "prokit-reviewer가 기술 인수를 approve하지 않았다";
	if (!Array.isArray(output.findings) || !Array.isArray(output.limitations))
		return "reviewer findings·limitations 형식이 아니다";
	if (
		output.findings.some((finding) =>
			["high", "critical"].includes(finding?.severity),
		)
	)
		return "reviewer high·critical finding이 남아 있다";
	if (
		!["none", "low", "medium"].includes(output.max_severity) ||
		output.reused !== false
	)
		return "reviewer fresh verdict가 아니다";
	for (const key of [
		"product_hash",
		"evidence_hash",
		"provider_actual_hashes",
		"provider_sources",
		"artifacts",
		"environment_fingerprint",
		"bound_focus",
		"contracts",
		"changed",
		"reviewer_runtime",
	]) {
		if (!sameJson(output[key], expected[key]))
			return `reviewer ${key} binding이 다르다`;
	}
	return null;
}

export async function acceptDelegation(root, args) {
	const options = acceptOptions(args);
	const base = commitOf(root, options.base);
	if (!base) throw new UsageError("--base가 현재 저장소의 commit이 아니다");
	const changed = changedFiles(root, base);
	if (!changed.length)
		return {
			ok: false,
			status: "blocked",
			problems: ["--base 이후 실제 변경이 없다"],
			userConfirmation: "pending",
		};
	const outside = changed.filter(
		(path) => !acceptedScope(path, options.scopes),
	);
	if (outside.length) {
		return {
			ok: false,
			status: "blocked",
			problems: [`명시 scope 밖 실제 변경: ${outside.join(", ")}`],
			userConfirmation: "pending",
		};
	}
	const initial = captureSnapshot(root);
	if (!initial.valid)
		return {
			ok: false,
			status: "blocked",
			problems: ["현재 source snapshot을 확인할 수 없다"],
			userConfirmation: "pending",
		};
	const providers = observeAcceptProviders(root, options.providers);
	const selectedProviders = validationProviders(providers);
	const environment = {
		node: process.version,
		platform: process.platform,
		arch: process.arch,
	};
	const environmentFingerprint = digest(environment);
	const taskId = `local-${initial.bindings.head}`;
	const runId = randomUUID();
	const checks = [];
	for (const argv of options.checks) {
		const run = await guardedAcceptCommand(root, argv, "verify");
		checks.push(run);
		if (
			!run.executed ||
			run.exitCode !== 0 ||
			run.resource.before === "unknown" ||
			run.resource.after === "unknown" ||
			run.resource.events.includes("child-group-active") ||
			run.resource.groupWasActive
		) {
			return {
				ok: false,
				status: "blocked",
				problems: [`check 실패 또는 guard 차단: ${run.command}`],
				checks: checks.map(({ stdout, stderr, ...item }) => item),
				userConfirmation: "pending",
			};
		}
	}
	const beforeReview = captureSnapshot(root);
	if (beforeReview.manifestHash !== initial.manifestHash) {
		return {
			ok: false,
			status: "blocked",
			problems: ["check가 source를 변경했다"],
			userConfirmation: "pending",
		};
	}
	if (!sameJson(observeAcceptProviders(root, options.providers), providers)) {
		return {
			ok: false,
			status: "blocked",
			problems: ["check가 선택 provider source를 변경했다"],
			userConfirmation: "pending",
		};
	}
	const artifacts = observeAcceptArtifacts(root, options.artifacts);
	const checkReceipts = checks.map((run) =>
		receiptFor(
			run,
			taskId,
			runId,
			initial.manifestHash,
			beforeReview.manifestHash,
			environmentFingerprint,
			[],
		),
	);
	const evidenceHash = digest(checkReceipts);
	const expectedReview = {
		product_hash: beforeReview.manifestHash,
		evidence_hash: evidenceHash,
		provider_actual_hashes: providers.map((provider) => provider.contentHash),
		provider_sources: providers.map(providerSource),
		artifacts,
		environment_fingerprint: environmentFingerprint,
		bound_focus: options.focus,
		contracts: options.contracts,
		changed,
		reviewer_runtime: codexRuntime(),
	};
	const reviewRun = await runCodexReviewer(root, expectedReview, providers);
	if (
		!reviewRun.executed ||
		reviewRun.exitCode !== 0 ||
		reviewRun.resource.before === "unknown" ||
		reviewRun.resource.after === "unknown" ||
		reviewRun.resource.events.includes("child-group-active") ||
		reviewRun.resource.groupWasActive
	) {
		return {
			ok: false,
			status: "blocked",
			problems: ["fresh Codex reviewer 실행 실패 또는 guard 차단"],
			userConfirmation: "pending",
		};
	}
	let review;
	try {
		review = JSON.parse(reviewRun.stdout.trim());
	} catch {
		return {
			ok: false,
			status: "blocked",
			problems: ["reviewer stdout이 JSON이 아니다"],
			userConfirmation: "pending",
		};
	}
	const reviewFailure = reviewProblem(review, expectedReview);
	if (reviewFailure)
		return {
			ok: false,
			status: "blocked",
			problems: [reviewFailure],
			reviewer: {
				verdict: review.verdict,
				maxSeverity: review.max_severity,
				findings: review.findings,
				limitations: review.limitations,
			},
			userConfirmation: "pending",
		};
	const afterReview = captureSnapshot(root);
	if (afterReview.manifestHash !== beforeReview.manifestHash) {
		return {
			ok: false,
			status: "blocked",
			problems: ["reviewer가 product를 변경했다"],
			userConfirmation: "pending",
		};
	}
	if (!sameJson(observeAcceptProviders(root, options.providers), providers)) {
		return {
			ok: false,
			status: "blocked",
			problems: ["reviewer가 선택 provider source를 변경했다"],
			userConfirmation: "pending",
		};
	}
	if (!sameJson(observeAcceptArtifacts(root, options.artifacts), artifacts)) {
		return {
			ok: false,
			status: "blocked",
			problems: ["reviewer가 지정 artifact를 변경했다"],
			userConfirmation: "pending",
		};
	}
	if (!sameJson(codexRuntime(), review.reviewer_runtime)) {
		return {
			ok: false,
			status: "blocked",
			problems: ["reviewer 실행 파일 binding이 다르다"],
			userConfirmation: "pending",
		};
	}
	const reviewerReceipt = receiptFor(
		reviewRun,
		taskId,
		runId,
		initial.manifestHash,
		afterReview.manifestHash,
		environmentFingerprint,
		[],
	);
	const commands = [...checkReceipts, reviewerReceipt];
	const packet = {
		taskId,
		runId,
		status: "complete",
		selectedProviders,
		allowedPaths: options.scopes,
		constraints: [],
		environmentRefs: ["node", "platform", "arch"],
		environmentFingerprint,
		changes: [],
		evidence: {
			report: "local CLI technical acceptance",
			commands,
			coverage: { changed: changed.length, checks: checks.length, reviewer: 1 },
			limitations: [
				"OS·native host identity와 protected-area authority, 외부 provider의 실행 권한은 이 local CLI가 증명하지 않는다",
			],
			artifacts,
			focus: options.focus,
			snapshot: initial.manifestHash,
		},
		reviewCoverage: [{ reviewer: "prokit-reviewer", reused: false }],
		unresolved: [],
		sideEffects: [],
		nextAction: "user confirmation pending",
		contracts: options.contracts,
		mainGate: { reviewer: "prokit-reviewer", reused: false },
		baseline: initial,
	};
	const receiptIndex = new Map(
		commands.map((command) => [command.identityDigest, command]),
	);
	const validation = validateDelegationPacket(root, packet, {
		baseline: initial,
		cwd: process.cwd(),
		environment,
		environmentFingerprint,
		runnerReceipts: commands,
		approvedPaths: options.scopes,
		allowedSideEffects: [],
		allowedHosts: ["local"],
		allowedModes: ["read-only"],
		allowedTypes: ["source"],
		availableTools: [],
		providers: selectedProviders,
		resolver: (provider) => {
			const source = providers.find(
				(item) => item.canonicalLocation === provider.canonicalLocation,
			);
			if (!source) return null;
			const current = observeAcceptProviders(root, [source.ref])[0];
			return {
				...provider,
				content: readFileSync(new URL(current.canonicalLocation), "utf8"),
			};
		},
		verifyReceipt: (bindings, command) => {
			const actual = receiptIndex.get(command.identityDigest);
			return actual === command
				? {
						ok: true,
						identityDigest: bindings.identityDigest,
						key: bindings.key,
						effects: [],
					}
				: { ok: false };
		},
		verifyAuthority: (bindings, checkedPacket) => {
			const current =
				checkedPacket === packet &&
				bindings.taskId === taskId &&
				bindings.runId === runId &&
				bindings.baseline === initial.manifestHash &&
				bindings.currentProduct === afterReview.manifestHash &&
				bindings.reviewer === "prokit-reviewer" &&
				sameJson(bindings.focus, options.focus) &&
				sameJson(bindings.contracts, options.contracts) &&
				review.reused === false &&
				review.product_hash === afterReview.manifestHash &&
				sameJson(review.artifacts, artifacts) &&
				review.integration_acceptance === "accept";
			return current
				? { ok: true, key: bindings.key, reused: false }
				: { ok: false };
		},
	});
	if (!validation.ok || !validation.completionReady) {
		return {
			ok: false,
			status: "blocked",
			problems: validation.problems,
			userConfirmation: "pending",
		};
	}
	return {
		ok: true,
		status: "complete",
		technicalAcceptance: "complete",
		userConfirmation: "pending",
		base,
		changed,
		productHash: validation.productHash,
		environmentFingerprint,
		checks: checks.map(({ stdout, stderr, ...item }) => item),
		reviewer: {
			reviewer: "prokit-reviewer",
			verdict: review.verdict,
			maxSeverity: review.max_severity,
			reused: false,
			findings: review.findings,
			limitations: review.limitations,
		},
		providerSources: providers.map(providerSource),
		artifacts,
		limitations: packet.evidence.limitations,
	};
}

export function main(argv, root = process.cwd()) {
	const [cmd, ...rest] = argv;
	const json = rest.includes("--json");
	const titleAt = rest.indexOf("--title");
	const title = titleAt >= 0 ? rest[titleAt + 1] : undefined;
	const taskAt = rest.indexOf("--task");
	const positional = rest.filter(
		(a, i) =>
			!a.startsWith("--") &&
			(titleAt < 0 || i !== titleAt + 1) &&
			(taskAt < 0 || i !== taskAt + 1),
	);
	// Claude Code PostToolUse 훅(Skill|Read). 어떤 오류도 세션을 막지 않게 조용히 끝낸다.
	if (cmd === "skill-log") {
		try {
			logSkill(process.env.CLAUDE_PROJECT_DIR || root, readFileSync(0, "utf8"));
		} catch {}
		return 0;
	}
	// Claude Code PreToolUse 훅(Edit|Write|MultiEdit|NotebookEdit). exit 2는 그 편집을 막고 stderr를 에이전트에게 보인다.
	// 입력이 깨졌거나 프로킷 설정을 읽지 못하면 막지 않는다.
	if (cmd === "edit-guard") {
		let why = null;
		try {
			const dir = process.env.CLAUDE_PROJECT_DIR || root;
			why = editGuard(
				dir,
				loadConfig(dir),
				JSON.parse(readFileSync(0, "utf8")),
			);
		} catch {}
		if (why) console.error(why);
		return why ? 2 : 0;
	}
	const config = loadConfig(root);
	const print = (obj, text) =>
		console.log(json ? JSON.stringify(obj, null, 2) : text);
	switch (cmd) {
		case "case": {
			const md = readTodo(root, config);
			const active = md && parseActive(md);
			const base = active ? active.meta.base : resolveBase(root, config);
			const cls = classify(
				active ? roundFiles(root, active) : changedFiles(root, base),
				config,
			);
			const head = `${cls.pathCase}${cls.auth ? " (+auth: security 리뷰 행 추가)" : ""}${cls.harness && cls.pathCase !== "H" ? " (+H)" : ""} — base ${base ?? "none"}`;
			const lines = cls.evidence.map(
				(e) =>
					`  ${e.case ?? "-"}${e.auth ? "+auth" : ""}  ${e.file}  (${e.why ?? "인증 민감 경로"})`,
			);
			print({ ...cls, base }, [head, ...lines].join("\n"));
			return 0;
		}
		case "table": {
			const task = taskAt >= 0 ? rest[taskAt + 1] : undefined;
			if (taskAt >= 0 && !TASK_ID_RE.test(task ?? ""))
				throw new UsageError(
					'사용법: dev-cycle table <케이스> --write --title "<요약>" --task T<번호>',
				);
			const r = writeTable(root, config, positional[0], {
				upgrade: rest.includes("--upgrade"),
				title,
				write: rest.includes("--write"),
				task,
				plan: rest.includes("--plan"),
				noTask: rest.includes("--no-task"),
			});
			const text = rest.includes("--write")
				? `${config.todoPath}에 케이스 ${r.case} 대조표(${r.rows}행)를 썼다\n${brainLine(config)}${stageGuide(root, config)}`
				: r.block;
			print(r, r.warning ? `${text}\n${r.warning}` : text);
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
			// 행을 채울 때마다 이 행의 audit 거부, 케이스 상향, 빠진 필수 행을 알린다. [confirm]을 묻기 전에 고쳐야 한다
			const first = audit(root, config).problems.filter(
				(p) =>
					p.startsWith(`#${r.row} `) ||
					/^(케이스 상향 필요|필수 행 누락)/.test(p),
			);
			print(
				{ ...r, first },
				[
					`행 ${r.row} 증거를 갱신했다`,
					...first.map((p) => `먼저 할 일: ${p}`),
				].join("\n"),
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
			// resource-guard CLI처럼 실행 오류는 exit 2다(exit 1은 예산 초과).
			return Promise.resolve()
				.then(() => resourceMain(rest, root))
				.catch((error) => {
					throw new UsageError(error.message);
				});
		case "delegation": {
			if (rest[0] === "accept") {
				return acceptDelegation(root, rest.slice(1)).then((result) => {
					console.log(JSON.stringify(result, null, 2));
					return result.ok ? 0 : 1;
				});
			}
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
			// packet 완료 판정은 Main runtime 검증기가 있어야 하므로 CLI close는 packet을 받지 않는다.
			if (rest.some((arg) => !["--partial", "--json"].includes(arg)))
				throw new UsageError("사용법: dev-cycle close [--partial] [--json]");
			const r = close(root, config, new Date(), {
				partial: rest.includes("--partial"),
			});
			print(
				r,
				r.ok
					? `라운드를 닫았다 → ${r.archivePath}${r.task ? ` (진행 계획 ${r.task} 갱신)` : ""}`
					: ["close 거부:", ...r.problems.map((p) => `  ❌ ${p}`)].join("\n"),
			);
			return r.ok ? 0 : 1;
		}
		case "plan": {
			if (rest.some((a) => a !== "--json"))
				throw new UsageError("사용법: dev-cycle plan [--json]");
			const chk = planCheck(root, config);
			if (!chk) {
				print(
					{ plan: null },
					`진행 계획 없음 (${config.planPath})${EXISTING_TYPES.includes(config.projectType) ? ` → ${PLAN_ROUND_CMD}` : ""}`,
				);
				return 0;
			}
			// 파일이 없으면 진행 계획을 쓰지 않는 프로젝트다(0). 있는데 블록이 없으면 형식을 잘못 쓴 것이다(1).
			if (!chk.plan) {
				print(
					chk,
					`진행 계획 없음: ${chk.note}${EXISTING_TYPES.includes(config.projectType) ? ` → ${PLAN_ROUND_CMD}` : ""}`,
				);
				return 1;
			}
			const todo = readTodo(root, config);
			const active = todo && parseActive(todo);
			const open = active ? { task: active.meta.task } : null;
			const rows = (chk.plan?.tasks ?? []).map(
				(t) =>
					`  ${t.id} ${t.state} ${t.title}${t.record ? ` — ${t.record}` : ""}`,
			);
			const confirmSig =
				active && isPlanRound(active) ? planSig(chk.plan.tasks) : null;
			if (confirmSig)
				rows.push(
					`  지문: sig=${confirmSig} — 진행 계획 라운드의 [confirm]은 이 Task 목록과 지문을 사용자에게 보여 주고 받은 답에 지문을 함께 적는다`,
				);
			print(
				confirmSig ? { ...chk, confirmSig } : chk,
				[
					`진행 계획: ${chk.plan?.title ?? ""}${chk.plan?.doc ? ` (${chk.plan.doc})` : ""}`,
					...rows,
					chk.next
						? `다음: ${chk.next.id} "${chk.next.title}" → ${nextCmd(chk.next, open, chk.plan.sig)}`
						: "모든 Task가 끝났다",
					...chk.problems.map((p) => `  ❌ ${p}`),
				].join("\n"),
			);
			return chk.problems.length ? 1 : 0;
		}
		case "guard": {
			const args = rest.filter((a) => a !== "--json");
			const staged = args.length === 1 && args[0] === "--staged";
			if (
				!staged &&
				!(
					args.length === 2 &&
					args[0] === "--since" &&
					!args[1].startsWith("-")
				)
			)
				throw new UsageError(
					"사용법: dev-cycle guard --staged | --since <ref> [--json]",
				);
			const since = staged ? undefined : commitOf(root, args[1]);
			if (!staged && !since)
				throw new UsageError(`커밋을 찾을 수 없다: ${args[1]}`);
			const r = guard(root, config, since);
			const shown = r.files?.slice(0, 10).map((f) => `  ${f}`) ?? [];
			if (r.files?.length > 10) shown.push(`  … 외 ${r.files.length - 10}개`);
			print(
				r,
				r.ok
					? `dev-cycle guard 통과 (${r.why})`
					: [
							staged
								? `dev-cycle guard: 열린 dev-cycle 라운드 없이 코드·하네스 변경(케이스 ${r.pathCase})을 커밋하려 한다.`
								: `dev-cycle guard: ${args[1]} 뒤의 코드·하네스 변경(케이스 ${r.pathCase})에 닫은 라운드 기록(${config.archiveDir}/)이 없다.`,
							...shown,
							staged
								? `이 프로젝트에서 연 세션에서 pnpm dev-cycle table로 라운드를 열어 진행하거나, close로 닫은 라운드 기록(${config.archiveDir}/)과 함께 커밋한다. 훅을 건너뛰는 git commit --no-verify는 사용자가 허락할 때만 쓴다.`
								: "이 변경을 라운드로 검토하고 close로 닫은 기록을 커밋한 뒤 다시 릴리스한다.",
						].join("\n"),
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
