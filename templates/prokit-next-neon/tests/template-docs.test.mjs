import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { TEMPLATE, TEMPLATE_FILES } from "./helpers.mjs";

const read = (rel) => readFileSync(join(TEMPLATE_FILES, rel), "utf8");
const START = "<!-- prokit-template:start -->";
const END = "<!-- prokit-template:end -->";

test("AGENTS.md·CLAUDE.md는 마커로 감싸고 AGENTS.md는 110줄 이하", () => {
  for (const f of ["AGENTS.md", "CLAUDE.md"]) {
    const s = read(f).trim();
    assert.ok(s.startsWith(START) && s.endsWith(END), f);
  }
  assert.ok(read("AGENTS.md").split("\n").length <= 110);
  assert.match(read("CLAUDE.md"), /^@AGENTS\.md$/m);
});

test("AGENTS.md는 개발 원칙(Workflow Orchestration·Task Management·Core Principles)을 메인 지침으로 먼저 둔다", () => {
  const s = read("AGENTS.md");
  const at = ["## Workflow Orchestration", "## Task Management", "## Core Principles", "## 먼저 읽을 문서"].map((h) => s.indexOf(h));
  assert.ok(at.every((i, n) => i >= 0 && (n === 0 || i > at[n - 1])), String(at));
  assert.equal(existsSync(join(TEMPLATE_FILES, "DEVELOPMENT.md")), false, "개발 원칙은 AGENTS.md에만 둔다");
});

test("AGENTS.md는 모든 prokit 스킬, 선택 스킬 묶음, 문서 정본을 가리킨다", () => {
  const s = read("AGENTS.md");
  // 선택 묶음 표가 매니페스트와 어긋나지 않게 한다(mobile처럼 prokit 스킬이 가리키지 않는 묶음은 이 표가 유일한 안내다)
  const optional = Object.entries(JSON.parse(read("skills.manifest.json")).optional).flatMap(([k, v]) => [`| \`${k}\` |`, ...v.skills.flatMap((e) => e.skills)]);
  for (const k of ["prokit-dev-cycle", "prokit-web", "prokit-ui", "prokit-api", "prokit-db", "prokit-verify", "prokit-deploy", "prokit-skills-update", ...optional, "GLOSSARY.md", "docs/adr/", "docs/domain/project.md", "docs/dev-workflow.md"]) {
    assert.ok(s.includes(k), k);
  }
});

test("스킬 설치: README가 --with-global과 skills 명령을, AGENTS.md가 skills:setup을 안내한다", () => {
  const readme = readFileSync(join(TEMPLATE_FILES, "..", "README.md"), "utf8");
  for (const k of ["--with-global", "pnpm skills:setup", "pnpm skills:check", "pnpm skills:update", "skills.manifest.json"]) assert.ok(readme.includes(k), k);
  assert.match(read("AGENTS.md"), /pnpm skills:setup/);
  assert.match(read(".agents/skills/prokit-dev-cycle/references/process-routing.md"), /pnpm skills:check/);
});

test("도메인 문서 골격이 있다", () => {
  assert.match(read("GLOSSARY.md"), /^## Language$/m);
  assert.match(read("docs/adr/0001-prokit-next-neon-stack.md"), /Better Auth/);
  assert.match(read("docs/domain/project.md"), /## 데이터 모델과 코드 매핑/);
  assert.ok(existsSync(join(TEMPLATE_FILES, "tasks/todo.md")));
  assert.equal(existsSync(join(TEMPLATE_FILES, "docs/domain/glossary.md")), false);
});

test("도메인 문서 운용: project.md 표의 용어 칸이 용어와 코드를 잇고, F 스펙과 리뷰가 용어집을 챙긴다", () => {
  const p = read("docs/domain/project.md");
  for (const k of ["## 주요 흐름", "## 기능", "| 프로시저 | 용어 |", "| 테이블 | 용어 |", "날짜별 절"]) assert.ok(p.includes(k), k);
  const defs = read("GLOSSARY.md").split(/^\*\*/m).slice(1).join("");
  assert.ok(!defs.includes("`"), "GLOSSARY.md 용어 정의에 코드 이름을 넣지 않는다");
  assert.match(read("docs/dev-workflow.md").split("### F.")[1].split("###")[0], /domain-modeling/);
  assert.match(read(".claude/agents/prokit-reviewer.md"), /GLOSSARY\.md.*docs\/domain\/project\.md/);
  // 문서는 그 계층을 구현하는 행에서 고친다(리뷰가 함께 보게)
  for (const s of ["prokit-dev-cycle", "prokit-web", "prokit-api", "prokit-db"]) assert.match(read(`.agents/skills/${s}/SKILL.md`), /docs\/domain\/project\.md/, s);
  assert.match(read(".agents/skills/prokit-verify/SKILL.md"), /`pnpm skills:check`/, "H 최소 검사는 dev-workflow H 행과 같다");
});

test("DB: 로컬 컨테이너용 pg 드라이버로 생성하고, 로컬 적용과 병합 전 Neon 적용을 모두 요구한다", () => {
  const readme = readFileSync(join(TEMPLATE_FILES, "..", "README.md"), "utf8");
  const create = readme.split("pnpm create better-t-stack")[1].split("```")[0];
  assert.match(create, /--db-setup docker\b/);
  assert.doesNotMatch(create, /--db-setup neon\b/);
  const e = read("docs/dev-workflow.md").split("### E.")[1].split("###")[0];
  assert.match(e, /\[verify\] 타입·린트 검사/);
  assert.match(e, /\[verify\] 로컬 개발 DB에 dbMigrate/);
  assert.match(e, /\[verify\] 병합 전 Neon 개발 브랜치에 dbMigrate/);
});

test("브라우저 검증: ego-browser를 먼저 쓰고, 없을 때만 agent-browser로 대체하며 대체 사실을 적는다", () => {
  const b = read("docs/dev-workflow.md").split("### B.")[1].split("###")[0];
  assert.match(b, /\[verify\] next-dev-loop 런타임 확인과 ego-browser\(없으면 agent-browser\)로 desktop·mobile 스크린샷/);
  const verify = read(".agents/skills/prokit-verify/SKILL.md");
  assert.match(verify, /references\/browser\.md/);
  assert.match(verify, /대안: agent-browser \(ego-browser 없음\)/);
  const recipe = read(".agents/skills/prokit-verify/references/browser.md");
  assert.match(recipe, /ego-browser nodejs/);
  assert.match(recipe, /Emulation\.setDeviceMetricsOverride/);
});

test("Windows: README가 WSL2에서 하는 절차와 Linux에서 필요한 설정을 안내한다", () => {
  const readme = readFileSync(join(TEMPLATE, "README.md"), "utf8");
  const win = readme.split("\n### Windows\n")[1]?.split("\n## ")[0] ?? "";
  assert.match(win, /wsl --install/);
  assert.match(win, /agent-browser install --with-deps/, "새 Ubuntu에는 Chrome이 쓰는 시스템 라이브러리가 없다");
  assert.match(win, /unqualified-search-registries = \["docker.io"\]/, "Ubuntu의 Podman은 postgres:18 같은 짧은 이름을 못 찾는다");
});

test("Vercel 배포: README 절차, DB 환경 매핑, 스킬 우선순위가 실측과 맞는다", () => {
  const readme = readFileSync(join(TEMPLATE, "README.md"), "utf8");
  const dep = readme.split("\n## Vercel 배포\n")[1]?.split("\n## ")[0] ?? "";
  assert.match(dep, /pnpm vercel:deploy develop/);
  assert.match(dep, /--root-directory apps\/web/, "모노레포는 Root Directory를 apps/web로 둬야 빌드된다");
  assert.match(dep, /git checkout -- \.gitignore/, "vercel link가 .gitignore에 .env*를 더한다");
  // vercel link --yes는 새 프로젝트를 만들 때 git 원격을 묻지 않고 연결한다(CLI 60.1 실측). push가 곧 production 배포가 되지 않게 끊는다
  assert.match(dep, /vercel git disconnect --yes/);
  assert.ok(read(".agents/skills/prokit-deploy/SKILL.md").includes("vercel git disconnect --yes"));
  assert.match(dep, /production부터 배포/, "Vercel은 첫 배포를 production으로 만든다");
  assert.match(dep, /\.vercelignore/);
  const flow = read(".agents/skills/prokit-db/references/migration-flow.md").split("\n## 배포 환경 (Vercel)\n")[1] ?? "";
  assert.match(flow, /neon cs develop --pooled/);
  assert.match(flow, /url="\$\(neon cs/, "느린 명령을 vercel env add에 바로 파이프하면 값이 빈다");
  const skill = read(".agents/skills/prokit-deploy/SKILL.md");
  for (const s of ["vercel-deploy-claimable", "/vercel:deploy", "land-and-deploy"]) assert.ok(skill.includes(s), `prokit-deploy가 ${s}를 쓰지 않는다고 적어야 한다`);
  // production은 릴리스한 커밋만 배포한다. 스킬, README, AGENTS.md가 같은 절차를 가리킨다
  const rel = skill.split("\n## 릴리스 (production 배포마다)\n")[1]?.split("\n## ")[0] ?? "";
  for (const k of ["pnpm release --title", "pnpm release --publish", "BREAKING CHANGE:", "`package.json` `version`", "gh release create", "동의", "Git 자동 배포"]) assert.ok(rel.includes(k), `릴리스 절: ${k}`);
  assert.ok(rel.includes("--minor") && !rel.includes("`feat:`는 minor"), "릴리스 절: 기본 patch, --minor를 줄 때만 minor");
  assert.match(dep, /pnpm release --publish/);
  assert.match(read("AGENTS.md"), /릴리스\(`pnpm release`/);
});

test("라운드 마무리: [confirm] 행과 마무리 선택을 워크플로, 스킬, 규칙 문서가 같게 가리킨다", () => {
  assert.match(read("docs/dev-workflow.md").split("\n### 공통\n")[1], /^- \[confirm\] 사용자 확인 .*N\/A 불가/m);
  const end = read(".agents/skills/prokit-dev-cycle/SKILL.md").split("\n## 5. 종료\n")[1] ?? "";
  for (const k of ["[confirm]", "AskUserQuestion", "릴리스하고 production 배포 (기본)", "커밋·push만 (배포 PASS)", "배포 PASS: 사용자 선택", "배포 PASS: 준비 안 됨", "production --check", "gh auth status", "Git 연결", "Git 자동 배포", "vercel git disconnect --yes", "항상 실행한다", "docs/adr/", "git diff --name-only", "Conventional Commits", "발행 동의", "따로 동의"]) {
    assert.ok(end.includes(k), `5절: ${k}`);
  }
  assert.match(read("AGENTS.md"), /라운드 끝\(`prokit-dev-cycle` 5절/);
  assert.match(read("CLAUDE.md"), /라운드 끝 마무리/);
  assert.match(read(".agents/skills/prokit-verify/SKILL.md"), /`\[confirm\]` 행은 예외다/);
  assert.match(read(".agents/skills/prokit-verify/references/evidence.md"), /`\[confirm\]` 행의 `N\/A`/);
  assert.match(read(".agents/skills/prokit-deploy/SKILL.md"), /라운드 끝\(`prokit-dev-cycle` 5절\)/);
  // 구현 스킬이 부르는 finishing-a-development-branch가 라운드 끝을 대신하지 않는다
  const routing = read(".agents/skills/prokit-dev-cycle/references/process-routing.md");
  assert.match(routing, /^\| 마무리 \| `prokit-dev-cycle` 5절/m);
  assert.match(routing, /finishing-a-development-branch`를 부르더라도 라운드 끝이 아니다/);
});

test("Node: README 준비물이 설치기와 같은 하한(22.20)과 권장(24)을 적는다", () => {
  // 공통 값 표시(<!-- v:키 -->…<!-- /v -->)를 뗀 글로 본다
  const readme = readFileSync(join(TEMPLATE, "README.md"), "utf8").replace(/<!-- (?:v:[\w.-]+|\/v) -->/g, "");
  assert.match(readme.split("\n## 준비물\n")[1], /^- Node 22\.20 이상\(24 권장\)/);
  assert.doesNotMatch(readme, /Node 20 이상/);
});

test("스킬 업데이트: prokit-dev-cycle 시작이 주기 확인을 부르고, prokit-skills-update가 스크립트 출력을 모두 다룬다", () => {
  const start = read(".agents/skills/prokit-dev-cycle/SKILL.md").split("\n## 0. 시작\n")[1].split("\n## 1.")[0];
  assert.match(start, /`pnpm dev-cycle status`[^\n]*`UPDATE_AVAILABLE`[^\n]*`prokit-skills-update`/);
  const skill = read(".agents/skills/prokit-skills-update/SKILL.md");
  const script = read("scripts/skills-setup.mjs");
  for (const k of ["UPDATE_AVAILABLE mode=", "UPSTREAM_GONE", "CHECK_FAILED", "--if-due", "--snooze", "--mode", "스크립트 변경", "보류", "설치 거부", "검토 고정값"]) {
    assert.ok(script.includes(k), `스크립트: ${k}`);
    assert.ok(skill.includes(k), `스킬: ${k}`);
  }
  for (const k of ["케이스 H", "[confirm]", "`npx skills update`는 쓰지 않는다", "AskUserQuestion", "설치 전 확인", "pnpm skills:update <이름>...", "gh api \"repos/<저장소>/git/blobs/<sha>\""]) assert.ok(skill.includes(k), k);
  assert.match(read("AGENTS.md"), /`prokit-skills-update`/);
});

test("ponytail: 5.1 기능, 일회성 리뷰, 신뢰 훅과 fallback 라우팅이 맞는다", () => {
  const routing = read(".agents/skills/prokit-dev-cycle/references/process-routing.md");
  const cycle = read(".agents/skills/prokit-dev-cycle/SKILL.md");
  const update = read(".agents/skills/prokit-skills-update/SKILL.md");
  for (const name of ["ponytail", "ponytail-review", "ponytail-audit", "ponytail-debt", "ponytail-help", "ponytail-gain"]) assert.match(routing, new RegExp(name));
  assert.match(routing, /provider가 낸 전문 review coverage는 재사용/);
  assert.match(cycle, /실제 coverage와 같은 reuse key/);
  assert.match(cycle, /ponytail 규칙보다 이 스킬, `AGENTS\.md`, 대조표가 우선한다\. vitest 도입 행/);
  assert.match(routing, /ponytail 규칙이 `AGENTS\.md`, `prokit-\*`, 대조표와 부딪히면 뒤의 것이 우선한다\. 대조표 행\(vitest 도입/);
  assert.match(routing, /provider 내장 review coverage를 재사용하고[^\n]*`ponytail-review`[^\n]*gstack `review`/);
  assert.match(routing, /잘 돌던 기존 코드를 고칠 근거로 쓰지 않는다/);
  assert.match(routing, /\$ponytail:ponytail-review.*먼저/);
  assert.match(routing, /같은 diff에 함께 쓰지 않으며.*off.*다시 켜지 않는다/);
  assert.match(cycle, /trusted 프로젝트에서 `\/hooks` 허용과 새 세션/);
  assert.match(read("CLAUDE.md"), /Skill 도구 또는 `\/ponytail-review`로 한 번만/);
  assert.match(read("CLAUDE.md"), /일회성이며 세션을 영구 review 모드로 바꾸지 않는다/);
  assert.match(update, /marketplace를 갱신하기 전에.*`hooks\/`와 코드를 검토/);
  assert.match(update, /Codex 네이티브 ponytail 플러그인/);
  assert.match(update, /다시 설치·자동 업데이트하지 않는다/);
  const m = JSON.parse(read("skills.manifest.json"));
  assert.ok(m.claude.plugins.includes("ponytail@ponytail"));
  const readme = readFileSync(join(TEMPLATE, "README.md"), "utf8");
  assert.match(readme, /^\| 프로세스 스킬 \(Claude\) \|[^\n]*ponytail/m);
  assert.match(readme, /^\| 프로세스 스킬 \(Codex\) \|[^\n]*ponytail/m);
  assert.match(readme, /ponytail-audit.*ponytail-debt.*ponytail-help.*ponytail-gain/);
  assert.match(readme, /PLUGIN_DATA/);
  assert.match(readme, /`\/hooks`/);
});

test("검증 보강: 오류 예산 0, QA 시나리오와 발견 수정, 공통화 행, ponytail 리뷰 구간, 확인 때 서버 유지", () => {
  const wf = read("docs/dev-workflow.md");
  const b = wf.split("### B.")[1].split("###")[0];
  const f = wf.split("### F.")[1].split("###")[0];
  assert.match(b, /오류 예산\(콘솔·개발 오버레이·get_errors·서버 로그, 환경 탓도 빼지 않음\)/);
  assert.match(b, /^- \[review\] prokit-reviewer\(code\) →/m);
  assert.match(f, /인수 조건·테스트 시나리오 절/);
  assert.match(f, /^- 공통화·리팩토링·최적화 점검 \(/m);
  assert.match(f, /^- \[verify\] 사용자 흐름 QA \(스펙의 테스트 시나리오 전부/m);
  assert.match(f, /^- QA 발견 수정과 재QA \(/m);
  assert.match(f, /QA 발견 수정과 재QA \([^\n]*타입·린트·빌드·테스트[^\n]*prokit-reviewer\(code\)와 ponytail-review/, "QA 뒤 수정도 재검사·재리뷰");
  assert.match(f, /공통화·리팩토링·최적화 점검 \(이번 라운드가 바꾼 파일과 같은 디렉터리/, "공통화 범위는 바꾼 파일의 디렉터리");
  assert.ok(f.indexOf("공통화·리팩토링") < f.indexOf("전체 diff 최종 리뷰"), "공통화는 최종 리뷰 앞");
  assert.ok(f.indexOf("사용자 흐름 QA") < f.indexOf("QA 발견 수정과 재QA"), "발견 수정은 QA 뒤");
  const verify = read(".agents/skills/prokit-verify/SKILL.md");
  assert.match(verify, /\*\*오류 예산은 0이다\.\*\*/);
  assert.match(verify, /suppressHydrationWarning/);
  assert.match(read(".agents/skills/prokit-verify/references/evidence.md"), /오류 0\(…은 제외\)/);
  assert.match(read(".agents/skills/prokit-verify/references/browser.md"), /스펙의 테스트 시나리오\(F\)를 모두 돈다/);
  const cycle = read(".agents/skills/prokit-dev-cycle/SKILL.md");
  assert.match(cycle, /개발 서버를 백그라운드로 띄워[^\n]*끄지 않는다/);
  assert.match(cycle, /미룬 지적[^\n]*백로그/);
  const routing = read(".agents/skills/prokit-dev-cycle/references/process-routing.md");
  assert.match(routing, /SDD 태스크 리뷰\(태스크마다/);
  assert.match(routing, /공통화: F의 공통화·리팩토링 행/);
  for (const doc of [wf, cycle, routing, verify]) assert.doesNotMatch(doc, /TASK|로드맵/, "프로젝트 전용 개념이 템플릿에 없다");
});

test("스킬 연결: 행이 외부 스킬을 이름으로 부르고, 외부 스킬은 프로젝트 판을 읽으며, 에이전트가 읽은 스킬을 보고한다", () => {
  const wf = read("docs/dev-workflow.md");
  const part = (c) => wf.split(`### ${c}.`)[1].split("###")[0];
  assert.match(part("B"), /^- 구현 \([^\n]*shadcn[^\n]*vercel-react-best-practices/m);
  assert.match(part("B"), /^- \[review\] impeccable audit과 web-design-guidelines/m);
  assert.match(part("D"), /^- 구현 \([^\n]*test-driven-development[^\n]*better-auth-best-practices/m);
  assert.match(part("E"), /^- 스키마 수정 \+ dbGenerate[^\n]*supabase-postgres-best-practices/m);
  assert.match(part("F"), /^- 구현 계획 \(writing-plans, 바꿀 계층의 prokit-\* 스킬과 그 공식 스킬 연결 표/m);
  assert.match(wf, /^- 문서 영향 확인 \(GLOSSARY\.md와 docs\/adr\/는 domain-modeling 형식/m);
  // Claude Code의 Skill 도구는 같은 이름의 개인 스킬을 먼저 불러오고, shadcn은 모노레포 루트에서 로드가 실패한다(실측)
  assert.match(read("AGENTS.md"), /이 프로젝트에 설치된 판\(`\.agents\/skills\/<이름>\/SKILL\.md`\)을 읽는다/);
  assert.match(read("CLAUDE.md"), /Skill 도구로 부르지 말고 Read로 `\.agents\/skills\/<이름>\/SKILL\.md`를 읽는다/);
  assert.match(read(".agents/skills/prokit-ui/SKILL.md"), /`\.agents\/skills\/shadcn\/SKILL\.md`를 읽고/);
  const cycle = read(".agents/skills/prokit-dev-cycle/SKILL.md");
  assert.match(cycle, /첫 증거를 적기 전에 `prokit-verify`를 불러/);
  assert.match(cycle, /`domain-modeling`을 읽고 그 형식/);
  assert.match(cycle, /`turbo\.json`은 `turborepo` 스킬/);
  assert.match(cycle, /superpowers `verification-before-completion`을 불러/);
  assert.match(read(".agents/skills/prokit-web/SKILL.md"), /느림, 깜빡임, 번들 크기, 캐시, 프리패치를 다루면[^\n]*`vercel-react-best-practices`를 읽고/);
  assert.match(read(".claude/agents/prokit-reviewer.md"), /"skills_read":\[/);
  assert.match(read(".claude/agents/prokit-implementer.md"), /^- 읽은 스킬: /m);
});

test("증거는 setter가 활성 대조표의 한 행에 넣는다", () => {
  const cycle = read(".agents/skills/prokit-dev-cycle/SKILL.md");
  const evidence = read(".agents/skills/prokit-verify/references/evidence.md");
  for (const doc of [cycle, evidence]) assert.match(doc, /pnpm dev-cycle evidence <행 번호> --file <증거 파일>/);
  assert.match(cycle, /대조표 셀을 수동으로 stage 문자열로 고치지 않는다/);
  assert.match(evidence, /활성 대조표의 유일한 행/);
});

test("위임: provider는 매니페스트가 아니라 실제 계약을 검증하고, 전문 리뷰는 보완만 한다", () => {
  const protocol = read(".agents/skills/prokit-dev-cycle/references/delegation.md");
  for (const field of ["taskId", "selectedProviders", "environmentFingerprint", "reviewCoverage", "sideEffects", "nextAction"]) {
    assert.match(protocol, new RegExp(field));
  }
  assert.match(protocol, /skills\.manifest\.json.*선택 허용 목록이 아니다/);
  assert.match(protocol, /pnpm dev-cycle delegation resolve <skill-ref\|relative-path>/);
  assert.match(protocol, /inspection-only라 새 실행 권한을 주지 않지만.*read-only 전문 텍스트 생산을 금지하지는 않는다/);
  assert.match(protocol, /dependencies·capabilities·tools·sideEffects 배열을 전문 본문에 근거해 명시/);
  assert.match(protocol, /기계 metadata가 없다는 이유만으로 결론을 만들지 않되/);
  assert.match(protocol, /실제 의존성·필요 tool·side effect·permission이 unknown이거나 범위 밖 쓰기면 `blocked`/);
  assert.match(protocol, /`verifyReceipt`·`verifyAuthority`·fresh `prokit-reviewer` final gate/);
  assert.match(protocol, /같은 task\/run\/root의 accepted native call/);
  assert.match(protocol, /canonical location.*content hash.*scope.*의존성.*capability.*side effect/);
  assert.match(protocol, /현재 선택 후보와 필수 의존 체인만 검증/);
  assert.match(protocol, /더 낮은 후보와 무관한 전문 본문·profile은 읽거나 hash하지 않는다/);
  assert.match(protocol, /출처·content hash 사실만 다시 읽지 않고 재사용/);
  assert.match(protocol, /task 계약·host\/mode·권한·환경이 모두 같을 때만 재사용/);
  assert.match(protocol, /바뀌거나 unknown이면 항상 재검증하고 Main final gate를 다시 거친다/);
  assert.match(protocol, /작업 전후 한 번씩만 호출/);
  assert.match(protocol, /manifest hash, 항목 수, artifact 경로만/);
  assert.match(protocol, /git이 제외한 설치 환경을 다시 순회하지 않고/);
  assert.match(protocol, /lock·owner·nonce 파일과 환경·proof payload는 직접 읽거나 출력하지 않고/);
  assert.match(protocol, /check 또는 clean dry-run summary에서 bool·hash·reason만/);
  assert.match(protocol, /`git rev-parse --show-toplevel`의 realpath/);
  assert.match(protocol, /새 임시 프로젝트·복사본·cwd 이동을 만들지 않고/);
  assert.match(protocol, /runtime·lock·group fingerprint health를 확인해 재사용/);
  assert.match(protocol, /실제 descriptor/);
  assert.match(protocol, /provider content metadata를 조립해 확정하지 않는다/);
  assert.match(protocol, /no rolloutfound.*직접 쓰지 않는다/);
  assert.match(protocol, /accepted runtime receipt가 같은 `agent_type`을 확인할 때만 주장/);
  assert.match(protocol, /`userProviders`\/`userRefs`.*`defaultProviders`\/`defaults` 순서/);
  assert.match(protocol, /`actualProviders`는 content를 포함한 read observation/);
  assert.match(protocol, /이름 없는 exact `canonicalLocation`만 resolver로 direct 선택/);
  assert.match(protocol, /content 없이 `ok`, `provider`, `actualHash`, `source`만 요약/);
  assert.match(protocol, /logical `prokit-implementer` profile/);
  assert.match(protocol, /receipt가 없으면 확인된 builtin `<type>` \+ logical `prokit-implementer` profile/);
  assert.match(protocol, /exact type이 필수인 작업은 `blocked`/);
  assert.match(protocol, /declared read-only는 텍스트 artifact 생성·검토에는 충분/);
  assert.match(protocol, /현재 write scope가 있을 때만 approved path에 exact byte를 검증·통합/);
  assert.match(protocol, /Main이 read-only면 artifact을 회수·보고만/);
  const implementer = read(".claude/agents/prokit-implementer.md");
  assert.match(implementer, /승인 루트에서만 일한다/);
  assert.match(implementer, /accepted runtime receipt가 확인할 때만 보고/);
  assert.match(implementer, /logical profile 또는 unverified 상태를 그대로 보고/);
  assert.match(read(".claude/agents/prokit-reviewer.md"), /승인 루트, focus, 기준 SHA/);
  assert.match(protocol, /최대 두 번 재지시/);
  assert.match(protocol, /미검사를 PASS로 바꾸지 않는다/);
  assert.match(protocol, /실행 전에는.*완료 패킷을 검증하지 않는다/);
  assert.match(protocol, /실행 뒤에만.*Main runner receipt/);
  assert.match(protocol, /Main의 baseline·approvedPaths·runner receipt와 실제 delta/);
  assert.match(protocol, /task·run·제품·증거·provider·환경/);
  const reviewer = read(".claude/agents/prokit-reviewer.md");
  assert.match(reviewer, /evidence_hash/);
  assert.match(reviewer, /integration_acceptance/);
  const specialist = read(".claude/agents/specialist-reviewer.md");
  assert.match(specialist, /내장 리뷰가 없을 때만/);
  assert.match(specialist, /일반 코드 리뷰를 반복하지/);
  for (const name of ["prokit-api", "prokit-db", "prokit-deploy", "prokit-ui", "prokit-verify", "prokit-web", "prokit-skills-update"]) {
    assert.match(read(`.agents/skills/${name}/SKILL.md`), /위임과 전문 스킬 프로토콜/);
  }
});


test("Codex: 라운드 진입에서 테스트 선행 행을 확인하고 지원되는 실행 경로를 안내한다", () => {
  const cycle = read(".agents/skills/prokit-dev-cycle/SKILL.md");
  const opening = cycle.split("## 2. 대조표 열기")[1].split("## 3. 행 실행")[0];
  assert.match(opening, /vitest 도입/);
  assert.match(opening, /이미.*충족/);
  assert.match(opening, /구현 행까지만/);
  const routing = read(".agents/skills/prokit-dev-cycle/references/process-routing.md");
  const implementation = routing.split("\n").find((l) => l.startsWith("| 구현 |"));
  assert.doesNotMatch(implementation.split("|")[5], /ralph/);
  assert.match(routing, /Codex.*SKILL\.md/);
  assert.match(routing, /tmux/);
});

test("Antigravity·Grok Build: Codex처럼 SKILL.md를 읽고, 서브에이전트·이미지 도구·키·신뢰 길을 안내한다", () => {
  const routing = read(".agents/skills/prokit-dev-cycle/references/process-routing.md");
  assert.match(routing, /Antigravity.*Grok Build.*SKILL\.md/);
  assert.match(routing, /\.agents\/agents/);
  const cycle = read(".agents/skills/prokit-dev-cycle/SKILL.md");
  assert.match(cycle, /다른 도구의 활성화와 fallback은 `process-routing\.md`의 선택 규칙/);
  const ui = read(".agents/skills/prokit-ui/SKILL.md");
  assert.match(ui, /Antigravity `generate_image`/);
  assert.match(ui, /Grok Build `image_gen`/);
  assert.match(ui, /셸에 없는데 `\.env`에 있으면\(Codex·Antigravity·Grok Build/);
  const installer = readFileSync(join(TEMPLATE, "install.mjs"), "utf8");
  assert.match(installer, /Antigravity는 \.agents\/agents/);
  assert.match(installer, /Grok Build는 폴더를 신뢰해야/);
});
