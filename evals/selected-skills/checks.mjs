// 고른 스킬 eval 채점. 대화 기록의 도구 호출과 fixture의 최종 상태로 본다(이름을 적었는지가 아니라 실제로 불렀는지).
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
// 단계를 두뇌가 맡는지는 템플릿의 판정을 그대로 쓴다(두뇌 파일 단계 표)
import { brainStageSkills } from "../../templates/prokit-next-neon/files/scripts/dev-cycle.mjs";

// 대조표 행: | 번호 | 문구 | 증거 |
export function rowsOf(md) {
	const block = md.match(/<!-- dev-cycle:start[\s\S]*?<!-- dev-cycle:end -->/)?.[0] ?? "";
	return block
		.split("\n")
		// 칸 안의 \|는 구분자가 아니다
		.map((l) => l.match(/^\|\s*(\d+)\s*\|((?:[^|\\]|\\.)*)\|((?:[^|\\]|\\.)*)\|\s*$/))
		.filter(Boolean)
		.map((m) => ({ n: Number(m[1]), text: m[2].trim(), evidence: m[3].trim() }));
}

const BRAINS_DIR = ".agents/skills/prokit-dev-cycle/references/brains";
const STAGE_RE = /요구 명확화 단계|계획 단계|구현 단계|디버깅 단계|고른 두뇌의 계획 방법/;
// 고르지 않았으면 부르면 안 되는 이름(Skill 도구 이름 접두어나 스킬 폴더 이름)
const FOREIGN = {
	superpowers: [/^superpowers:/],
	"agent-skills": [/^agent-skills:/],
	pstack: [/^pstack:/],
	"oh-my": [/^oh-my-claudecode:/],
	"compound-engineering": [/^compound-engineering:/, /^ce-/],
	openspec: [/^openspec-/],
	"spec-kit": [/^speckit-/],
	gstack: [/^gstack/, /^(office-hours|plan-eng-review|plan-ceo-review|investigate|autoplan)$/],
};
const SIMPLICITY = { ponytail: [/^ponytail:/, /^ponytail/], caveman: [/^(lean-build|surgical-patch|safe-refactor|caveman-review|caveman)$/], karpathy: [/^karpathy-guidelines$/] };
const base = (n) => String(n).replace(/^\/+/, "").split(":").at(-1);
const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");

// 실제로 부른 스킬: Skill 도구 이름, 읽은 SKILL.md의 폴더 이름
function invoked(tools) {
	const out = new Set();
	for (const t of tools) {
		if (t.name === "Skill" && t.input?.skill) {
			out.add(t.input.skill);
			out.add(base(t.input.skill));
		}
		const p = String(t.input?.file_path ?? t.input?.command ?? "");
		for (const m of p.matchAll(/(?:^|[\s/;'"])([a-z0-9][a-z0-9-]*)\/SKILL\.md/g)) out.add(m[1]);
	}
	return out;
}

function brainNames(copy, brains) {
	const harness = brains.includes("mattpocock") ? /^(prokit-|specialist-reviewer$|blocked$|none$)/ : /^(prokit-|specialist-reviewer$|blocked$|none$|grilling$|domain-modeling$|grill-with-docs$)/;
	return new Set(brains.flatMap((b) => [...read(join(copy, BRAINS_DIR, `${b}.md`)).matchAll(/`([^`\s]+)`/g)].map((m) => m[1])).filter((n) => !harness.test(n)));
}

export function grade({ sc, meta, runDir }) {
	const copy = meta.copy;
	const cfg = JSON.parse(read(join(copy, ".dev-cycle.json")) || "{}");
	const brains = [cfg.brain ?? "none"].flat().filter((b) => b && b !== "none");
	const simplicity = cfg.simplicity ?? "none";
	const tools = meta.tools;
	const calls = invoked(tools);
	const names = brainNames(copy, brains);
	const lock = Object.keys(JSON.parse(read(join(copy, "skills-lock.json")) || "{}").skills ?? {});
	const todo = read(join(runDir, "outputs/todo.md"));
	const rows = rowsOf(todo);
	const audit = read(join(runDir, "outputs/audit.txt"));
	const bash = tools.filter((t) => t.name === "Bash").map((t) => String(t.input?.command ?? ""));
	const agents = tools.filter((t) => t.name === "Agent" || t.name === "Task");
	const ex = [];
	const add = (id, text, passed, evidence) => ex.push({ text: `[${id}] ${text}`, passed: Boolean(passed), evidence: String(evidence).slice(0, 600) });

	// 공통
	const init = meta.init ?? {};
	if (init.plugins) {
		const want = Object.entries(JSON.parse(read(join(copy, ".claude/settings.json")) || "{}").enabledPlugins ?? {}).filter(([, v]) => v).map(([k]) => k.split("@")[0]);
		const lacking = want.filter((w) => !init.plugins.includes(w));
		add("plugins-loaded", "선언한 project 플러그인이 세션에 로드됐다", !lacking.length, lacking.length ? `안 됨: ${lacking.join(", ")}` : init.plugins.filter((p) => want.includes(p)).join(", "));
	}
	add("round", "대조표를 열었다", rows.length > 0, rows.length ? `${rows.length}행` : "대조표 없음");
	add("no-commit", "커밋·push하지 않았다", !meta.commits && !bash.some((b) => /git (push|commit)/.test(b)), meta.commits || bash.filter((b) => /git (push|commit)/.test(b)).join(" | ") || "없음");
	const confirm = rows.find((r) => r.text.startsWith("[confirm]"));
	add("confirm-open", "[confirm] 행을 스스로 채우지 않았다", !confirm?.evidence, confirm ? confirm.evidence || "빈 칸" : "행 없음");
	const foreign = [...calls].filter((c) => Object.entries(FOREIGN).some(([b, res]) => !brains.includes(b) && res.some((r) => r.test(c))) || Object.entries(SIMPLICITY).some(([s, res]) => s !== simplicity && res.some((r) => r.test(c))));
	add("no-foreign", "고르지 않은 두뇌·과설계 방지 스킬을 부르지 않았다", !foreign.length, foreign.join(", ") || `부른 스킬: ${[...calls].filter((c) => !c.includes(":")).join(", ")}`);

	// 단계 행: 채운 단계 행마다 증거의 이름을 실제로 불렀는지
	const stage = rows.filter((r) => STAGE_RE.test(r.text) && r.evidence && !/^(blocked|미실행|n\/a)\s*:/i.test(r.evidence));
	if (sc.id <= 2) {
		if (!brains.length) {
			const ok = stage.length && stage.every((r) => /사용:\s*내장\(/.test(r.evidence));
			add("builtin", "두뇌 없음: 단계 행을 내장 절차로 적었다", ok, stage.map((r) => `${r.n}: ${r.evidence.slice(0, 120)}`).join(" / ") || "채운 단계 행 없음");
		} else {
			for (const r of stage) {
				const used = [...r.evidence.matchAll(/사용:\s*`?([^\s,;`()]+)`?/g)].map((m) => m[1].replace(/[^A-Za-z0-9_-]+$/, "")).filter(Boolean);
				const brainUsed = used.filter((u) => names.has(u) || [...names].some((n) => base(n) === base(u)));
				const extra = used.filter((u) => lock.includes(u) && /\(추가 스킬\)/.test(r.evidence));
				const real = [...brainUsed, ...extra].filter((u) => calls.has(u) || calls.has(base(u)));
				const builtin = /사용:\s*내장\([^)]+\)\s*:\s*\S/.test(r.evidence);
				const cover = brainStageSkills(copy, brains, r.text, rows);
				const ok = real.length > 0 || (builtin && !cover);
				add(`stage-${r.n}`, `단계 행 "${r.text.slice(0, 30)}"을 고른 두뇌 스킬로 실제로 진행했다(두뇌가 맡지 않는 단계는 내장)`, ok, `증거 이름 ${used.join(", ") || "없음"} / 실제 호출 ${real.join(", ") || "없음"}${builtin ? ` / 내장(${cover ? `두뇌가 맡음: ${cover.names.join(", ")}` : "두뇌가 맡지 않음"})` : ""}`);
			}
			add("stage-any", "채운 단계 행이 하나 이상 있다", stage.length > 0, `${stage.length}행`);
		}
		add("audit-brain", "audit에 두뇌 증거 문제가 없다", !/두뇌\(/.test(audit), audit.split("\n").filter((l) => /두뇌/.test(l)).join(" | ") || "없음");
		// 두뇌 에이전트는 읽기 전용 보완 검토로만: 썼으면 프롬프트에 쓰지 않는다는 말과 delegation diff가 있어야 한다
		const prefixes = { "agent-skills": "agent-skills:", "oh-my": "oh-my-claudecode:", pstack: "pstack:", "compound-engineering": "compound-engineering:" };
		const brainAgents = agents.filter((a) => brains.some((b) => prefixes[b] && String(a.input?.subagent_type ?? "").startsWith(prefixes[b])));
		const safe = brainAgents.every((a) => /파일을 (쓰지|수정하지|고치지) 않/.test(String(a.input?.prompt ?? ""))) && (!brainAgents.length || bash.some((b) => /delegation (diff|capture)/.test(b)));
		add("brain-agent-ro", "두뇌 에이전트를 쓰면 읽기 전용 규칙(쓰지 않는다·delegation diff)을 지켰다", safe, brainAgents.map((a) => a.input?.subagent_type).join(", ") || "두뇌 에이전트 안 씀");
	}
	if (sc.id === 1) {
		const changed = read(join(runDir, "outputs/changes.diff"));
		const code = [...changed.matchAll(/^diff --git a\/(\S+)/gm)].map((m) => m[1]).filter((f) => /^(apps|packages)\//.test(f));
		add("no-code", "스펙·계획까지만 하고 코드는 바꾸지 않았다", !code.length, code.join(", ") || "코드 변경 없음");
		const planOk = !/^diff --git a\/tasks\/plan\.md/m.test(changed) && /<!-- dev-cycle:start/.test(todo);
		add("plan-place", "계획은 docs/plans·두뇌 폴더에 두고 tasks/plan.md를 만들거나 대조표를 덮어쓰지 않았다", planOk, [...changed.matchAll(/^diff --git a\/(\S+)/gm)].map((m) => m[1]).filter((f) => !/^(\.claude|\.agents)\//.test(f)).join(", "));
	}
	if (sc.id === 2) {
		const reviewer = agents.find((a) => a.input?.subagent_type === "prokit-reviewer");
		add("reviewer", "prokit-reviewer를 불렀다", reviewer, reviewer ? String(reviewer.input?.prompt).slice(0, 200) : "없음");
		const p = String(reviewer?.input?.prompt ?? "");
		const simp = {
			ponytail: () => calls.has("ponytail:ponytail-review") || calls.has("ponytail-review"),
			caveman: () => calls.has("caveman-review"),
			// 리뷰어가 simplicity를 보고 karpathy-guidelines를 읽는다. 부른 기록은 audit이 대조한다
			karpathy: () => /간결성|karpathy/i.test(p),
			none: () => /간결성/.test(p),
		}[simplicity]?.();
		add("simplicity", `코드 리뷰 행에서 과설계 방지 역할 표의 검토(${simplicity})를 썼다`, simp, `simplicity=${simplicity}, 호출 ${[...calls].filter((c) => /ponytail|caveman|karpathy/.test(c)).join(", ") || "없음"}`);
		const t = read(join(copy, "packages/api/src/lib/completion.ts"));
		add("fix", "빈 목록에서 0을 돌려주게 고쳤다", /length\s*===\s*0|!todos\.length|todos\.length\s*\?|length\s*==\s*0/.test(t), t.slice(0, 300));
		const test = read(join(copy, "packages/api/src/lib/completion.test.ts"));
		add("regression-test", "빈 목록 회귀 테스트를 더했다", /\[\]\)/.test(test) || /빈|empty/i.test(test), test.slice(0, 300));
		const fails = audit.split("\n").filter((l) => l.includes("❌"));
		add("audit-confirm-only", "audit에 [confirm] 말고 남은 문제가 없다", fails.length > 0 && fails.every((l) => l.includes("[confirm]")), audit.slice(0, 400));
	}
	if (sc.id === 3) {
		add("taste-ref", "prokit-ui의 taste 안내를 읽었다", tools.some((t) => /prokit-ui\/references\/taste\.md/.test(String(t.input?.file_path ?? t.input?.command ?? ""))), "references/taste.md");
		add("taste-run", "design-taste-frontend를 실제로 썼다(SKILL.md 읽기나 스크립트 실행)", calls.has("design-taste-frontend") || bash.some((b) => /design-taste-frontend\/scripts\//.test(b)), bash.filter((b) => /taste/.test(b)).join(" | ").slice(0, 300) || "없음");
		add("impeccable", "impeccable 흐름도 그대로 썼다", calls.has("impeccable") || bash.some((b) => /impeccable/.test(b)), [...calls].join(", "));
	}
	if (sc.id === 4) {
		add("motion-ref", "vercel-react-view-transitions를 읽었다", calls.has("vercel-react-view-transitions"), [...calls].join(", "));
		const changed = read(join(runDir, "outputs/changes.diff"));
		add("motion-code", "ViewTransition(또는 View Transitions API)으로 구현했다", /ViewTransition|startViewTransition|view-transition/.test(changed), "diff 검색");
	}
	// 화면 디자인 보조(guide가 있는 선택 묶음): 설치한 사본만 보조 항목을 본다. 비교군(u-hallmark)은 공통 항목만
	if (sc.id >= 5) {
		const has = (name) => existsSync(join(copy, ".agents/skills", name));
		const touched = (re) => tools.some((t) => re.test(String(t.input?.file_path ?? t.input?.command ?? t.input?.path ?? "")));
		const filesIn = (dir, re) => (existsSync(join(copy, dir)) ? readdirSync(join(copy, dir)).filter((f) => re.test(f)).map((f) => read(join(copy, dir, f))) : []);
		const briefs = filesIn("docs/briefs", /\.md$/).join("\n");
		// 보조 결과 문구는 리뷰 보고서나 대조표 증거 칸 어느 쪽에 있어도 센다(prokit-ui: 증거 끝에 guide 문구를 붙인다)
		const reports = [...filesIn("tasks/evidence", /\.md$/), todo].join("\n");
		const changed = read(join(runDir, "outputs/changes.diff"));
		const changedFiles = [...changed.matchAll(/^diff --git a\/(\S+)/gm)].map((m) => m[1]);
		const addonLine = (name) => new RegExp(`보조\\**\\s*[:：][^\\n]*${name}`).test(briefs);
		const builder = agents.filter((a) => a.input?.subagent_type === "prokit-ui-builder").map((a) => String(a.input?.prompt ?? "")).join("\n");
		const fails = audit.split("\n").filter((l) => l.includes("❌"));
		add("audit-confirm-only", "audit에 [confirm] 말고 남은 문제가 없다", fails.length > 0 && fails.every((l) => l.includes("[confirm]")), fails.join(" | ") || audit.slice(0, 300));
		if (sc.id !== 7) add("hallmark", "주 UI 스킬 hallmark를 읽었다", calls.has("hallmark"), [...calls].filter((c) => !c.includes(":")).join(", "));
		// 화면 코드(tsx·ts)에 더한 고정 hex만 센다. 토큰 정의(globals.css)와 문서(DESIGN.md 등)는 뺀다
		const hexIn = changed.split(/^(?=diff --git )/m).filter((d) => /^diff --git a\/(apps\/web\/src|packages\/ui\/src\/components)\/\S+\.tsx?\s/.test(d)).flatMap((d) => d.split("\n").filter((l) => /^\+(?!\+)/.test(l) && /#[0-9a-fA-F]{6}\b/.test(l) && !/^\+\s*(\/\/|\*)/.test(l)));
		if (sc.id === 5) {
			add("cta", "주 행동 버튼 문구(무료로 시작)가 화면에 있다", /무료로 시작/.test(changed), "diff 검색");
			add("metadata", "랜딩 메타데이터(metadata)를 넣었다", /^\+.*export const metadata/m.test(changed), "diff 검색");
			if (has("landing-page-design")) {
				for (const g of ["landing", "visual-critique", "animation"]) add(`guide-${g}`, `addon-${g}.md를 읽었다`, touched(new RegExp(`addon-${g}\\.md`)), "도구 호출 경로");
				add("landing-skill", "landing-page-design을 실제로 읽었다", calls.has("landing-page-design"), "SKILL.md 읽기");
				// 반복문(for s in …; critique-$s/SKILL.md)으로 한 번에 읽은 것도 센다
				const DIMS = ["visual-hierarchy", "brand-consistency", "composition", "typography", "color", "affordance", "information-density"];
				const crit = DIMS.filter((d) => calls.has(`critique-${d}`) || bash.some((b) => /critique-\$\{?\w+\}?\/SKILL\.md/.test(b) && new RegExp(`\\b${d}\\b`).test(b))).map((d) => `critique-${d}`);
				add("critique-7", "critique 스킬 일곱 개를 모두 읽었다", crit.length >= 7, crit.join(", ") || "없음");
				add("brief-line", "브리프에 보조 줄(landing)을 적었다", addonLine("landing"), briefs.match(/.*보조.*/)?.[0] ?? "보조 줄 없음");
				add("review-landing", "리뷰 보고서에 landing 체크리스트 결과가 있다", /landing 체크리스트 미충족 \d+/.test(reports), reports.match(/.*landing 체크리스트.*/)?.[0] ?? "없음");
				add("review-critique", "리뷰 보고서에 visual-critique P1·P2·P3가 있다", /visual-critique P1 \d+, P2 \d+, P3 \d+/.test(reports), reports.match(/.*visual-critique.*/)?.[0] ?? "없음");
				add("emil-review", "motion 리뷰 전에 emil-design-eng를 읽었다", calls.has("emil-design-eng") || !/motion 지적/.test(reports), calls.has("emil-design-eng") ? "읽음" : "motion 리뷰 없음 또는 안 읽음");
				add("builder-animate", "위임 지시에 animate SKILL.md 경로를 넣었다", /animate\/SKILL\.md/.test(builder), builder ? "prokit-ui-builder 지시 검색" : "prokit-ui-builder 위임 없음");
				add("no-raw-hex", "화면 코드에 고정 hex를 넣지 않았다(landing Part B)", !hexIn.length, hexIn.slice(0, 3).join(" | ") || "없음");
			}
		}
		if (sc.id === 6) {
			for (const g of ["ui-design", "web-design-engineer"]) add(`guide-${g}`, `addon-${g}.md를 읽었다`, touched(new RegExp(`addon-${g}\\.md`)), "도구 호출 경로");
			add("wde-skill", "web-design-engineer SKILL.md를 실제로 읽었다", calls.has("web-design-engineer"), "SKILL.md 읽기");
			// 지목한 이름이 디자인 카탈로그에도 있으면 카탈로그가 방향이고 레시피는 참고만 한다(addon-web-design-engineer)
			add("recipe", "Linear 방향을 레시피 INDEX나 디자인 카탈로그(use-design-md)에서 찾았다", touched(/style-recipes\/INDEX\.md/) || calls.has("use-design-md"), touched(/style-recipes\/INDEX\.md/) ? "레시피 INDEX" : calls.has("use-design-md") ? "디자인 카탈로그" : "없음");
			add("wde-critique", "5개 차원 채점 전에 critique-guide를 읽었다", touched(/web-design-engineer\/references\/critique-guide\.md/), "도구 호출 경로");
			const laws = [...calls].filter((c) => /^(law-of-|visual-hierarchy|spacing-system|typography-scale|layout-grid|responsive-design|readable-measure|color-system)/.test(c));
			add("ui-design-skills", "ui-design 스킬을 하나 이상 읽었다", laws.length > 0, laws.join(", ") || "없음");
			add("brief-line", "브리프에 보조 줄(web-design-engineer, ui-design)을 적었다", addonLine("web-design-engineer") && addonLine("ui-design"), briefs.match(/.*보조.*/)?.[0] ?? "보조 줄 없음");
			add("review-wde", "리뷰 보고서에 5개 차원 점수가 있다", /철학 \d+, 위계 \d+, 완성도 \d+, 기능성 \d+, 독창성 \d+/.test(reports), reports.match(/.*철학 \d+.*/)?.[0] ?? "없음");
			add("review-ui-design", "리뷰 보고서에 ui-design 지적 수가 있다", /ui-design 지적 \d+/.test(reports), reports.match(/.*ui-design 지적.*/)?.[0] ?? "없음");
			add("no-html", "단일 HTML 파일을 만들지 않았다", !changedFiles.some((f) => /\.html$/.test(f)), changedFiles.filter((f) => /\.html$/.test(f)).join(", ") || "없음");
			add("sloplint-app", "sloplint를 앱 범위(--scope app)로 돌렸다", bash.some((b) => /sloplint/.test(b) && /--scope app/.test(b)), bash.filter((b) => /sloplint/.test(b)).join(" | ").slice(0, 300) || "없음");
			add("no-raw-hex", "화면 코드에 고정 hex를 넣지 않았다", !hexIn.length, hexIn.slice(0, 3).join(" | ") || "없음");
		}
		if (sc.id === 7) {
			add("no-landing", "고르지 않은 화면에서 landing-page-design을 쓰지 않았다", !calls.has("landing-page-design"), [...calls].filter((c) => !c.includes(":")).join(", "));
			add("no-landing-line", "브리프 보조 줄에 landing을 넣지 않았다", !addonLine("landing"), briefs.match(/.*보조.*/)?.[0] ?? "보조 줄 없음");
			add("scope", "첫 화면(page.tsx)은 바꾸지 않았다", !changedFiles.includes("apps/web/src/app/page.tsx"), changedFiles.filter((f) => f.startsWith("apps/")).join(", ") || "앱 변경 없음");
		}
	}
	const passed = ex.filter((e) => e.passed).length;
	return { expectations: ex, summary: { passed, failed: ex.length - passed, total: ex.length, pass_rate: ex.length ? Math.round((passed / ex.length) * 100) / 100 : 0 } };
}
