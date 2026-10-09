# BTS Next.js + Neon 개발 템플릿 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Better-T-Stack(Next.js + oRPC + Drizzle + Better Auth + Neon) 프로젝트에 한 번 설치하면 공식 스킬, 프로젝트 스킬 6개, 에이전트 2개, 경량 dev-cycle이 갖춰지는 복사형 템플릿을 `templates/bts-next-neon/`에 만들고, skill-creator로 검수·테스트한다.

**Architecture:** 템플릿은 `files/`(새 프로젝트 루트에 복사될 파일)와 `install.mjs`(설치기, `install.sh`는 얇은 래퍼), `tests/`(node:test), `evals/`(skill-creator 입력)로 나뉜다. 프로젝트에 들어가는 두 스크립트(`dev-cycle.mjs`, `sync-agents.mjs`)는 외부 의존성 없는 ESM 단일 파일이며, 함수를 export해 테스트에서 직접 부른다. 공식 스킬은 skills CLI 프로젝트 범위 설치와 `skills-lock.json`으로 고정한다.

**Tech Stack:** Node 24(스크립트는 Node 20+ 호환), node:test, bash, git, skills CLI 1.7.0, create-better-t-stack 3.44.1, pnpm 12, Python 3.14 + PyYAML(skill-creator 스크립트), Claude Code, codex-cli 0.156.0.

**Spec:** `docs/superpowers/specs/2026-09-25-bts-next-neon-template-design.md`

## Global Constraints

- 모든 산출물은 `templates/bts-next-neon/` 아래에 만든다. 이 저장소는 git 저장소가 아니므로 **커밋 단계는 없다**. 각 태스크의 마지막 단계는 테스트 통과 확인이다.
- 프로젝트에 복사되는 스크립트는 Node 내장 모듈만 쓴다(`node:fs`, `node:path`, `node:child_process`, `node:url`, `node:os`). npm 의존성 추가 금지.
- 문서·스킬 본문·출력 메시지는 한국어. 코드 식별자, 명령, 경로는 원문.
- 스킬 이름은 `bts-` 접두어 + kebab-case. SKILL.md 본문(frontmatter 제외) 150줄 이하. description은 1024자 이하, `<`·`>` 금지, YAML `>-` 블록으로 쓴다.
- 에이전트 frontmatter 값은 한 줄. description은 큰따옴표로 감싸고 내부에 큰따옴표를 쓰지 않는다. 본문에 `'''`를 쓰지 않는다.
- skills CLI 버전은 `skills@1.7.0`, BTS는 `create-better-t-stack@3.44.1`로 고정한다.
- 대상 레이아웃은 BTS 3.44.1 생성물 기준: `apps/web`(포트 3001), `packages/{api,auth,db,ui,config}`, 루트 scripts `check-types`·`build`·`check`(biome --write)·`db:generate`·`db:migrate`·`db:push`, `package.json`은 탭 들여쓰기, git 기본 브랜치는 환경에 따라 `master`일 수 있다.
- 외부 리소스(Neon 계정·DB 생성)는 Task 14에서 사용자 승인을 받은 뒤에만 만든다.
- 스크래치 경로: `SCRATCH=/private/tmp/claude-501/-Users-freelife-youtube-tts-pilot/1994930f-1ad0-4f75-9ea5-0490d8a2ea11/scratchpad` (fixture, eval 작업 공간). 템플릿 경로: `T=/Users/freelife/youtube/tts-pilot/templates/bts-next-neon`.

## Review Focus

1. **공백·한글이 든 경로**(`~/work/my app 프로젝트`)에 설치하거나, diff에 한글 파일명이 있을 때 — 설치가 성공하고, 러너가 파일명을 깨뜨리지 않고 판정해야 한다. → Task 1(한글 경로 판정), Task 9(공백·한글 대상 디렉터리) 테스트.
2. **커밋이 하나도 없는 저장소**(BTS `--no-git` 후 `git init`만 한 경우)에서 `case`·`table` 실행 — HEAD가 없어도 모든 파일을 변경으로 보고 동작해야 한다. → Task 1 테스트.
3. **기본 브랜치가 `main`이 아닌 저장소**(`master`) — 설치기가 실제 브랜치를 `.dev-cycle.json`에 기록하고, 설정의 브랜치가 없으면 러너가 HEAD로 물러나야 한다. → Task 1, Task 9 테스트.
4. **증거에 `|` 문자가 들어간 대조표**(명령 파이프 `pnpm test | tail`)와 사용자가 손으로 추가한 행 — 표가 깨지지 않고, `--upgrade`가 손으로 넣은 행과 증거를 잃지 않아야 한다. → Task 2, Task 3 테스트.
5. **라운드 도중 계층이 늘어나거나 인증 파일을 건드린 경우**(B로 열었는데 스키마를 고침, API 수정 중 `packages/auth` 수정) — audit이 케이스 상향 또는 security 리뷰 누락을 잡아야 한다. → Task 3 테스트.

---

### Task 1: 러너 뼈대 — 설정, 변경 파일, 케이스 판정

**Files:**
- Create: `templates/bts-next-neon/files/.dev-cycle.json`
- Create: `templates/bts-next-neon/files/docs/dev-workflow.md`
- Create: `templates/bts-next-neon/files/scripts/dev-cycle.mjs`
- Test: `templates/bts-next-neon/tests/helpers.mjs`, `templates/bts-next-neon/tests/dev-cycle-classify.test.mjs`

**Interfaces:**
- Produces:
  - `loadConfig(root: string) → Config` (`.dev-cycle.json` + 기본값)
  - `resolveBase(root: string, config: Config) → string | null` (HEAD 없으면 null)
  - `changedFiles(root: string, base: string | null) → string[]` (정렬, 중복 제거)
  - `classify(files: string[], config: Config) → { pathCase: "A"|"B"|"D"|"E"|"F"|"H", layers: string[], harness: boolean, auth: boolean, evidence: {file, case, why, auth}[] }`
  - 테스트 헬퍼 `makeRepo(opts) → { root, git(...args), write(rel, content) }`, `TEMPLATE_FILES` 경로 상수

- [ ] **Step 1: 설정 파일 작성**

`templates/bts-next-neon/files/.dev-cycle.json`:

```json
{
  "todoPath": "tasks/todo.md",
  "archiveDir": "tasks/archive",
  "workflowDoc": "docs/dev-workflow.md",
  "defaultBranch": "main",
  "rules": [
    { "case": "E", "match": "^packages/db/(src/(schema|migrations)/|drizzle\\.config\\.ts$)", "why": "DB 스키마·마이그레이션" },
    { "case": "D", "match": "^(packages/api/|apps/web/src/app/api/)", "why": "서버·API" },
    { "case": "B", "match": "^(apps/web/src/(app|components)/|packages/ui/)", "why": "화면·UI" },
    { "case": "H", "match": "^(\\.agents/skills/|\\.claude/(agents|skills)/|\\.codex/agents/|skills-lock\\.json$|scripts/(dev-cycle|sync-agents)\\.mjs$|\\.dev-cycle\\.json$|docs/dev-workflow\\.md$)", "why": "하네스" }
  ],
  "authPaths": "^(packages/auth/|apps/web/src/app/api/auth/|apps/web/src/lib/auth-client\\.ts$|apps/web/src/(proxy|middleware|services|context|env\\.server)\\.ts$|packages/api/src/(index|context)\\.ts$|packages/db/src/schema/auth\\.ts$|(.*/)?\\.env\\.schema$)",
  "ui": { "auditMin": 16, "a11yMin": 3 },
  "commands": {}
}
```

`authPaths`와 H 규칙은 BTS 3.44.1 실제 생성물(서비스 조립 `services.ts`, 요청 context `context.ts`, `protectedProcedure`가 있는 `packages/api/src/index.ts`, `auth:generate` 산출물 `schema/auth.ts`, varlock `.env.schema`)을 반영해 스펙 8.3보다 넓다. Task 13에서 스펙을 이 값으로 맞춘다.

- [ ] **Step 2: 절차 정본 작성**

`templates/bts-next-neon/files/docs/dev-workflow.md`:

```markdown
# 개발 절차 (dev-cycle)

이 문서는 `scripts/dev-cycle.mjs`가 읽는 **케이스별 절차 정본**이다. 프로젝트에 맞게 행을 고쳐도 된다. 이 문서를 고치는 일 자체가 케이스 H(하네스) 변경이다.

## 작성 규칙

- 케이스 블록은 `### <문자>. <이름>` 제목으로 시작하고, `### 공통` 블록은 모든 대조표 끝에 붙는다.
- 블록 안에서 `- `로 시작하는 줄만 행이 된다. 설명은 이 절처럼 `##` 제목 아래에 쓴다.
- 행 형식은 `- [태그] 단계 → 증거 형식`이다. `verify`·`review` 태그 행은 C 케이스가 상속한다.
- `@include X Y`는 다른 케이스의 행을 그 자리에 펼친다. `@inherit verify review`는 경로로 판정된 케이스에서 해당 태그 행만 가져온다. 같은 문구의 행은 한 번만 들어간다.
- 인증 민감 경로(`.dev-cycle.json`의 `authPaths`)를 건드리면 러너가 `[review] bts-reviewer(security)` 행을 자동으로 붙인다.

## 케이스

### A. 경미
- [verify] 타입·린트 검사 (commands.typecheck, commands.lint) → 명령과 결과 요약

### B. UI
- impeccable context 실행, PRODUCT.md·DESIGN.md 확인 (없으면 impeccable init·document) → 출력 요약
- impeccable shape 브리프 확정 (기존 화면 개선이면 N/A: 사유) → 브리프 경로
- 구현 (bts-ui, bts-web) → 변경 파일 요약
- [verify] 타입·린트·빌드 → 명령과 결과
- [verify] next-dev-loop + agent-browser로 desktop·mobile 스크린샷 → tasks/evidence/ 경로
- [review] impeccable critique → Design Health 점수, P0/P1 목록
- [review] impeccable audit → 점수(/20), 접근성 점수
- 수정과 impeccable polish를 한 번에 → 반영 내역
- [verify] 재확인 1회 → 스크린샷 경로와 점수
- DESIGN.md 갱신 여부 (impeccable document) → 갱신 내역 또는 N/A: 사유

### C. 버그
- 재현 테스트 작성, 실패 확인 (systematic-debugging) → 테스트 이름과 실패 출력
- 수정 → 변경 파일 요약
- [verify] 재현 테스트 통과 → 통과 출력
- @inherit verify review

### D. 서버·API
- zod 입출력 계약 정의 (bts-api) → 프로시저 이름과 스키마 위치
- 구현 (protectedProcedure, 세션 기반 소유자) → 변경 파일 요약
- [verify] 2계정 격리 테스트 → 테스트 이름과 통과 출력
- [verify] 타입·린트·테스트 → 명령과 결과
- [review] bts-reviewer(code) → verdict, max_severity, 반영·기각 내역

### E. DB
- 스키마 수정 + dbGenerate, 생성 SQL 검토 (bts-db) → 마이그레이션 파일 경로와 요약
- [verify] Neon 개발 브랜치에 dbMigrate 적용 → 브랜치 이름과 출력 요약
- 파괴적 변경 여부 판단 → 없음 또는 2단계 계획
- [review] bts-reviewer(db) → verdict, max_severity, 반영·기각 내역

### F. 신규 기능
- 스펙 작성 (brainstorming, 선택: /grill-with-docs, UI가 있으면 impeccable shape 브리프 링크) → 사용한 스킬과 스펙 경로
- 구현 계획 (writing-plans) → 사용한 스킬과 계획 경로
- [review] 계획 리뷰 (plan-eng-review, UI가 있으면 plan-design-review) → 결과 요약 또는 N/A: 사유
- 구현 방식 (subagent-driven-development + test-driven-development) → 사용한 스킬과 위임 내역
- @include E D B
- [verify] next-dev-loop 통합 런타임 확인 → 확인한 경로와 결과
- [review] bts-reviewer(code) 전체 diff 최종 리뷰 → verdict, max_severity, 반영·기각 내역
- [verify] 사용자 흐름 QA (qa-only) → 보고서 요약 또는 대체 절차 결과

### H. 하네스
- [verify] pnpm agents:check → 출력
- [verify] pnpm dev-cycle case·status 실행 확인 → 출력 요약
- 스킬을 바꿨으면 skill-creator eval 재실행 → 벤치마크 경로 또는 N/A: 사유

### 공통
- 문서 영향 확인 (CONTEXT.md, docs/adr/, docs/domain/project.md) → 갱신 내역 또는 N/A: 사유
```

- [ ] **Step 3: 테스트 헬퍼 작성**

`templates/bts-next-neon/tests/helpers.mjs`:

```js
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), "..");
export const TEMPLATE_FILES = join(TEMPLATE, "files");

export function makeRepo({ branch = "main", commit = true, name = "dc-" } = {}) {
  const root = mkdtempSync(join(tmpdir(), name));
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  const write = (rel, content = "x\n") => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), content);
  };
  git("init", "-q", "-b", branch);
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "test");
  git("config", "core.quotePath", "true");
  cpSync(join(TEMPLATE_FILES, ".dev-cycle.json"), join(root, ".dev-cycle.json"));
  mkdirSync(join(root, "docs"), { recursive: true });
  cpSync(join(TEMPLATE_FILES, "docs/dev-workflow.md"), join(root, "docs/dev-workflow.md"));
  write("README.md");
  if (commit) {
    git("add", "-A");
    git("commit", "-qm", "init");
  }
  return { root, git, write };
}
```

`core.quotePath=true`는 git 기본값이며, 러너가 `-z`로 이 인용을 우회하는지 확인하려고 명시한다.

- [ ] **Step 4: 실패하는 판정 테스트 작성**

`templates/bts-next-neon/tests/dev-cycle-classify.test.mjs`:

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { changedFiles, classify, loadConfig, resolveBase } from "../files/scripts/dev-cycle.mjs";
import { makeRepo } from "./helpers.mjs";

const cfg = () => loadConfig(makeRepo().root);

test("경로별 케이스: 첫 일치 규칙 하나만 적용한다", () => {
  const c = cfg();
  assert.equal(classify(["apps/web/src/app/api/rpc/[[...rest]]/route.ts"], c).pathCase, "D");
  assert.equal(classify(["apps/web/src/app/todos/page.tsx"], c).pathCase, "B");
  assert.equal(classify(["packages/ui/src/styles/globals.css"], c).pathCase, "B");
  assert.equal(classify(["packages/db/src/schema/todo.ts"], c).pathCase, "E");
  assert.equal(classify(["packages/db/drizzle.config.ts"], c).pathCase, "E");
  assert.equal(classify(["packages/api/src/routers/todo.ts"], c).pathCase, "D");
  assert.equal(classify([".agents/skills/bts-web/SKILL.md"], c).pathCase, "H");
  assert.equal(classify(["README.md"], c).pathCase, "A");
  assert.equal(classify([], c).pathCase, "A");
});

test("두 계층 이상이면 F, 하네스는 레이어와 함께 표시만 한다", () => {
  const c = cfg();
  const r = classify(["packages/db/src/schema/todo.ts", "apps/web/src/app/todos/page.tsx", "docs/dev-workflow.md"], c);
  assert.equal(r.pathCase, "F");
  assert.deepEqual(r.layers, ["E", "B"]);
  assert.equal(r.harness, true);
});

test("인증 민감 경로는 규칙과 별개로 auth 플래그를 세운다", () => {
  const c = cfg();
  const onlyAuth = classify(["packages/auth/src/index.ts"], c);
  assert.equal(onlyAuth.pathCase, "A");
  assert.equal(onlyAuth.auth, true);
  assert.equal(onlyAuth.evidence[0].case, null);
  const authSchema = classify(["packages/db/src/schema/auth.ts"], c);
  assert.equal(authSchema.pathCase, "E");
  assert.equal(authSchema.auth, true);
  assert.equal(classify(["apps/web/.env.schema"], c).auth, true);
  assert.equal(classify(["apps/web/src/services.ts"], c).auth, true);
  assert.equal(classify(["apps/web/src/app/api/auth/[...all]/route.ts"], c).auth, true);
  assert.equal(classify(["apps/web/src/app/page.tsx"], c).auth, false);
});

test("변경 파일: 수정·삭제·untracked·한글 경로를 모두 잡는다", () => {
  const { root, git, write } = makeRepo();
  write("packages/db/src/schema/old.ts");
  git("add", "-A");
  git("commit", "-qm", "old");
  git("rm", "-q", "packages/db/src/schema/old.ts");
  write("README.md", "changed\n");
  write("apps/web/src/app/할일/page.tsx");
  const files = changedFiles(root, resolveBase(root, loadConfig(root)));
  assert.deepEqual(files, ["README.md", "apps/web/src/app/할일/page.tsx", "packages/db/src/schema/old.ts"]);
});

test("커밋이 없는 저장소: base는 null이고 모든 파일이 변경이다", () => {
  const { root, write } = makeRepo({ commit: false });
  write("packages/api/src/routers/index.ts");
  const base = resolveBase(root, loadConfig(root));
  assert.equal(base, null);
  const files = changedFiles(root, base);
  assert.ok(files.includes("packages/api/src/routers/index.ts"));
  assert.ok(files.includes("README.md"));
});

test("기준점: 기능 브랜치는 merge-base, 설정 브랜치가 없으면 HEAD", () => {
  const { root, git, write } = makeRepo({ branch: "main" });
  const mainHead = git("rev-parse", "HEAD").trim();
  git("checkout", "-qb", "feature/x");
  write("a.txt");
  git("add", "-A");
  git("commit", "-qm", "a");
  assert.equal(resolveBase(root, loadConfig(root)), mainHead);

  const m = makeRepo({ branch: "master" });
  const head = m.git("rev-parse", "HEAD").trim();
  assert.equal(resolveBase(m.root, loadConfig(m.root)), head);
});
```

- [ ] **Step 5: 실패 확인**

Run: `cd $T && node --test 'tests/*.test.mjs'dev-cycle-classify.test.mjs`
Expected: FAIL — `Cannot find module '.../files/scripts/dev-cycle.mjs'`

- [ ] **Step 6: 러너 뼈대 구현**

`templates/bts-next-neon/files/scripts/dev-cycle.mjs` (Task 2, 3이 이 파일에 이어서 추가한다):

```js
#!/usr/bin/env node
// dev-cycle 경량 러너: case | table | status | audit | close
// 절차 정본은 docs/dev-workflow.md, 판정 규칙은 .dev-cycle.json이다.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

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
  const cfg = existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {};
  return { ...DEFAULTS, ...cfg };
}

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

function gitOk(root, args) {
  try {
    git(root, args);
    return true;
  } catch {
    return false;
  }
}

const splitZ = (s) => s.split("\0").filter(Boolean);

export function resolveBase(root, config) {
  if (!gitOk(root, ["rev-parse", "--verify", "HEAD"])) return null;
  const branch = git(root, ["branch", "--show-current"]).trim();
  const other = branch && branch !== config.defaultBranch;
  if (other && gitOk(root, ["rev-parse", "--verify", config.defaultBranch])) {
    return git(root, ["merge-base", "HEAD", config.defaultBranch]).trim();
  }
  return git(root, ["rev-parse", "HEAD"]).trim();
}

export function changedFiles(root, base) {
  const untracked = splitZ(git(root, ["ls-files", "-z", "--others", "--exclude-standard"]));
  const tracked = base
    ? splitZ(git(root, ["diff", "-z", "--name-only", "--no-renames", base]))
    : splitZ(git(root, ["ls-files", "-z"]));
  return [...new Set([...tracked, ...untracked])].sort();
}

export function classify(files, config) {
  const rules = config.rules.map((r) => ({ ...r, re: new RegExp(r.match) }));
  const authRe = config.authPaths ? new RegExp(config.authPaths) : null;
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
    evidence.push({ file, case: rule?.case ?? null, why: rule?.why ?? null, auth: isAuth });
  }
  const list = LAYERS.filter((c) => layers.has(c));
  const pathCase = list.length === 0 ? (harness ? "H" : "A") : list.length === 1 ? list[0] : "F";
  return { pathCase, layers: list, harness, auth, evidence };
}
```

`spawnSync`, `mkdirSync`, `writeFileSync`, `appendFileSync`, `dirname`, `pathToFileURL`는 Task 2·3에서 쓴다.

- [ ] **Step 7: 통과 확인**

Run: `cd $T && node --test 'tests/*.test.mjs'dev-cycle-classify.test.mjs`
Expected: PASS — 6 tests pass. 한글 경로 테스트가 실패하면 `-z` 옵션 누락이다.

---

### Task 2: 대조표 생성 — 워크플로 파싱, 행 조립, 표 읽기·쓰기

**Files:**
- Modify: `templates/bts-next-neon/files/scripts/dev-cycle.mjs` (끝에 추가)
- Test: `templates/bts-next-neon/tests/dev-cycle-table.test.mjs`

**Interfaces:**
- Consumes: Task 1의 `loadConfig`, `resolveBase`, `changedFiles`, `classify`, `CASES`, `UsageError`
- Produces:
  - `parseWorkflow(md: string) → { [key: "A".."H" | "COMMON"]: Array<{text, tag} | {include: string[]} | {inherit: string[]}> }`
  - `buildRows(workflow, caseKey: string, cls) → Array<{ text: string, tag: string | null }>`
  - `SECURITY_ROW: string` = `"[review] bts-reviewer(security) → verdict, max_severity, 반영·기각 내역"`
  - `renderBlock(meta: {case, base, auth, opened, title}, rows: Array<{text, evidence?}>) → string`
  - `parseActive(md: string) → null | { meta: {case, base, auth, opened}, title, rows: Array<{text, evidence}>, start, end }`
  - `readWorkflow(root, config) → workflow`
  - `writeTable(root, config, caseKey?: string, opts?: { upgrade?: boolean, title?: string, write?: boolean, now?: Date }) → { case, base, rows: number, auth, block }`

- [ ] **Step 1: 실패하는 테스트 작성**

`templates/bts-next-neon/tests/dev-cycle-table.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  SECURITY_ROW, buildRows, classify, loadConfig, parseActive, parseWorkflow, readWorkflow, renderBlock, writeTable,
} from "../files/scripts/dev-cycle.mjs";
import { makeRepo, TEMPLATE_FILES } from "./helpers.mjs";

const wf = parseWorkflow(readFileSync(join(TEMPLATE_FILES, "docs/dev-workflow.md"), "utf8"));
const cls = (over = {}) => ({ pathCase: "A", layers: [], harness: false, auth: false, evidence: [], ...over });
const texts = (rows) => rows.map((r) => r.text);

test("워크플로 파싱: 케이스 블록과 공통, 설명 절은 무시", () => {
  for (const k of ["A", "B", "C", "D", "E", "F", "H", "COMMON"]) assert.ok(wf[k]?.length, `${k} 블록`);
  assert.equal(wf.A.length, 1);
  assert.deepEqual(wf.F.find((r) => r.include).include, ["E", "D", "B"]);
  assert.deepEqual(wf.C.find((r) => r.inherit).inherit, ["verify", "review"]);
  assert.equal(wf.D[2].tag, "verify");
});

test("F는 E·D·B 행을 한 번씩 펼치고 공통 행으로 끝난다", () => {
  const rows = buildRows(wf, "F", cls({ pathCase: "F" }));
  const t = texts(rows);
  assert.equal(new Set(t).size, t.length);
  assert.ok(t.some((x) => x.includes("Neon 개발 브랜치")));
  assert.ok(t.some((x) => x.includes("2계정 격리 테스트")));
  assert.ok(t.some((x) => x.includes("impeccable critique")));
  assert.ok(t.at(-1).startsWith("문서 영향 확인"));
});

test("C는 경로 판정 케이스의 verify·review 행만 상속한다", () => {
  const withD = texts(buildRows(wf, "C", cls({ pathCase: "D", layers: ["D"] })));
  assert.ok(withD.some((x) => x.includes("2계정 격리 테스트")));
  assert.ok(withD.some((x) => x.includes("bts-reviewer(code)")));
  assert.ok(!withD.some((x) => x.startsWith("zod 입출력 계약")));
  const withA = texts(buildRows(wf, "C", cls()));
  assert.equal(withA.length, wf.C.length - 1 + wf.COMMON.length);
});

test("auth 플래그는 security 행을 한 번만, 하네스는 H 행을 붙인다", () => {
  const rows = texts(buildRows(wf, "D", cls({ pathCase: "D", auth: true, harness: true })));
  assert.equal(rows.filter((x) => x === SECURITY_ROW).length, 1);
  assert.ok(rows.includes("[verify] pnpm agents:check → 출력"));
});

test("@include 순환과 없는 케이스는 오류", () => {
  const bad = parseWorkflow("## 케이스\n### A. x\n- @include B\n### B. y\n- @include A\n### 공통\n- c → d\n");
  assert.throws(() => buildRows(bad, "A", cls()), /순환/);
  assert.throws(() => buildRows(wf, "Z", cls()), /Z/);
});

test("표 렌더·파싱 왕복: 파이프 문자 보존, 손으로 넣은 행 인식", () => {
  const block = renderBlock(
    { case: "D", base: "abc123", auth: false, opened: "2026-09-25", title: "할 일 수정" },
    [{ text: "a → b", evidence: "pnpm test | tail -1 → 3 passed" }, { text: "c → d" }],
  );
  const md = `# 작업\n\n${block}\n\n메모\n`;
  const manual = md.replace("<!-- dev-cycle:end -->", "| 9 | vitest 도입(최초 1회) → 설정 | vitest.config.ts 추가 |\n<!-- dev-cycle:end -->");
  const a = parseActive(manual);
  assert.equal(a.meta.case, "D");
  assert.equal(a.meta.base, "abc123");
  assert.equal(a.title, "할 일 수정");
  assert.equal(a.rows[0].evidence, "pnpm test | tail -1 → 3 passed");
  assert.equal(a.rows[1].evidence, "");
  assert.equal(a.rows[2].text, "vitest 도입(최초 1회) → 설정");
  assert.equal(parseActive("# 작업\n"), null);
});

test("writeTable: 새 라운드를 쓰고, 두 번째는 거부, --upgrade는 증거와 수동 행을 보존", () => {
  const { root, write } = makeRepo();
  write("apps/web/src/app/todos/page.tsx");
  const config = loadConfig(root);
  const r1 = writeTable(root, config, undefined, { title: "목록 화면", write: true });
  assert.equal(r1.case, "B");
  assert.throws(() => writeTable(root, config, "B", { write: true }), /활성 라운드/);

  const todoPath = join(root, config.todoPath);
  const a = parseActive(readFileSync(todoPath, "utf8"));
  a.rows[0].evidence = "impeccable context → PRODUCT.md 없음, init 실행";
  a.rows.push({ text: "수동 추가 행 → 근거", evidence: "직접 적은 증거" });
  const md = readFileSync(todoPath, "utf8");
  writeFileSync(todoPath, md.slice(0, a.start) + renderBlock({ ...a.meta, title: a.title }, a.rows) + md.slice(a.end));

  write("packages/db/src/schema/todo.ts");
  const r2 = writeTable(root, config, "F", { upgrade: true, write: true });
  assert.equal(r2.case, "F");
  const b = parseActive(readFileSync(todoPath, "utf8"));
  assert.equal(b.meta.base, a.meta.base);
  assert.equal(b.title, "목록 화면");
  assert.equal(b.rows.find((r) => r.text.startsWith("impeccable context ")).evidence, "impeccable context → PRODUCT.md 없음, init 실행");
  assert.equal(b.rows.at(-1).text, "수동 추가 행 → 근거");
  assert.equal(b.rows.at(-1).evidence, "직접 적은 증거");
});

test("writeTable: write 없이 호출하면 파일을 바꾸지 않고 블록만 돌려준다", () => {
  const { root } = makeRepo();
  const config = loadConfig(root);
  const r = writeTable(root, config, "A", { title: "미리보기" });
  assert.match(r.block, /dev-cycle:start case=A/);
  assert.throws(() => readFileSync(join(root, config.todoPath), "utf8"));
  assert.ok(Object.keys(readWorkflow(root, config)).includes("A"));
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd $T && node --test 'tests/*.test.mjs'dev-cycle-table.test.mjs`
Expected: FAIL — `SyntaxError: The requested module ... does not provide an export named 'SECURITY_ROW'`

- [ ] **Step 3: 구현 (dev-cycle.mjs 끝에 추가)**

```js
export const SECURITY_ROW = "[review] bts-reviewer(security) → verdict, max_severity, 반영·기각 내역";

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
  if (!workflow[caseKey]) throw new UsageError(`${caseKey} 케이스 블록이 워크플로 문서에 없다`);
  const expand = (key, stack) => {
    if (stack.includes(key)) throw new UsageError(`@include 순환: ${[...stack, key].join(" → ")}`);
    const rows = [];
    for (const item of workflow[key] ?? []) {
      if (item.include) {
        for (const k of item.include) rows.push(...expand(k, [...stack, key]));
      } else if (item.inherit) {
        const src = cls.pathCase;
        if (src !== "A" && src !== key) {
          rows.push(...expand(src, [...stack, key]).filter((r) => item.inherit.includes(r.tag)));
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
  if (cls.auth && !out.some((r) => r.text.includes("bts-reviewer(security)"))) push({ text: SECURITY_ROW, tag: "review" });
  expand("COMMON", []).forEach(push);
  return out;
}

const START_RE = /<!-- dev-cycle:start (.*?) -->/;
const END_TAG = "<!-- dev-cycle:end -->";
const esc = (s) => String(s ?? "").replace(/\|/g, "\\|");

export function renderBlock(meta, rows) {
  const lines = [
    `<!-- dev-cycle:start case=${meta.case} base=${meta.base ?? "none"} auth=${Boolean(meta.auth)} opened=${meta.opened} -->`,
    `## 활성 라운드: ${meta.case} — ${meta.title}`,
    "| # | 단계 | 증거 |",
    "|---|---|---|",
    ...rows.map((r, i) => `| ${i + 1} | ${esc(r.text)} | ${esc(r.evidence)} |`),
    END_TAG,
  ];
  return lines.join("\n");
}

export function parseActive(md) {
  const start = md.search(START_RE);
  if (start < 0) return null;
  const endAt = md.indexOf(END_TAG, start);
  if (endAt < 0) throw new UsageError("dev-cycle:end 마커가 없다. tasks/todo.md를 확인한다");
  const end = endAt + END_TAG.length;
  const block = md.slice(start, end);
  const meta = Object.fromEntries([...block.match(START_RE)[1].matchAll(/(\w+)=(\S+)/g)].map((m) => [m[1], m[2]]));
  meta.auth = meta.auth === "true";
  if (meta.base === "none") meta.base = null;
  const title = block.match(/^## 활성 라운드: \S+ — (.*)$/m)?.[1] ?? "";
  const rows = [];
  for (const line of block.split("\n")) {
    if (!/^\|\s*\d+\s*\|/.test(line)) continue;
    const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    const cells = inner.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
    rows.push({ text: cells[1] ?? "", evidence: cells[2] ?? "" });
  }
  return { meta, title, rows, start, end };
}

export function readWorkflow(root, config) {
  return parseWorkflow(readFileSync(join(root, config.workflowDoc), "utf8"));
}

function readTodo(root, config) {
  const p = join(root, config.todoPath);
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

export function writeTable(root, config, caseKey, { upgrade = false, title, write = false, now = new Date() } = {}) {
  const md = readTodo(root, config) ?? "# 작업\n";
  const active = parseActive(md);
  if (write && active && !upgrade) throw new UsageError("활성 라운드가 이미 있다. close로 닫거나 --upgrade를 쓴다");
  if (upgrade && !active) throw new UsageError("--upgrade할 활성 라운드가 없다");
  const base = active ? active.meta.base : resolveBase(root, config);
  const cls = classify(changedFiles(root, base), config);
  const key = caseKey ?? cls.pathCase;
  if (!CASES.includes(key)) throw new UsageError(`알 수 없는 케이스: ${key} (가능: ${CASES.join(", ")})`);
  const rows = buildRows(readWorkflow(root, config), key, cls).map((r) => ({ ...r, evidence: "" }));
  if (active && upgrade) {
    const old = new Map(active.rows.map((r) => [r.text, r.evidence]));
    for (const r of rows) r.evidence = old.get(r.text) ?? "";
    const kept = new Set(rows.map((r) => r.text));
    for (const r of active.rows) if (!kept.has(r.text)) rows.push({ text: r.text, evidence: r.evidence });
  }
  const meta = {
    case: key,
    base,
    auth: cls.auth || Boolean(active?.meta.auth),
    opened: active?.meta.opened ?? now.toISOString().slice(0, 10),
    title: title ?? active?.title ?? "제목 없음",
  };
  const block = renderBlock(meta, rows);
  if (write) {
    const next = active ? md.slice(0, active.start) + block + md.slice(active.end) : `${md.replace(/\s*$/, "")}\n\n${block}\n`;
    const p = join(root, config.todoPath);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, next);
  }
  return { case: key, base, rows: rows.length, auth: meta.auth, block };
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd $T && node --test 'tests/*.test.mjs'dev-cycle-classify.test.mjs tests/dev-cycle-table.test.mjs`
Expected: PASS — 14 tests pass.

---

### Task 3: audit·status·close와 CLI

**Files:**
- Modify: `templates/bts-next-neon/files/scripts/dev-cycle.mjs` (끝에 추가)
- Test: `templates/bts-next-neon/tests/dev-cycle-audit.test.mjs`

**Interfaces:**
- Consumes: Task 1·2의 모든 export
- Produces:
  - `evidenceProblem(e: string) → string | null`
  - `audit(root, config) → { ok: boolean, problems: string[], case?: string, pathCase?: string }`
  - `status(root, config) → { active: boolean, line: string, case?, filled?, total?, next? }`
  - `close(root, config, now?: Date) → { ok: boolean, problems?: string[], archivePath?: string }`
  - `main(argv: string[]) → number` (종료 코드: 0 성공, 1 audit 실패·close 거부, 2 사용 오류)
  - CLI: `node scripts/dev-cycle.mjs <case|table [CASE] [--write] [--upgrade] [--title T]|status|audit|close> [--json]`

- [ ] **Step 1: 실패하는 테스트 작성**

`templates/bts-next-neon/tests/dev-cycle-audit.test.mjs`:

```js
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  audit, close, evidenceProblem, loadConfig, parseActive, renderBlock, status, writeTable,
} from "../files/scripts/dev-cycle.mjs";
import { makeRepo, TEMPLATE_FILES } from "./helpers.mjs";

const CLI = join(TEMPLATE_FILES, "scripts/dev-cycle.mjs");
const run = (root, ...args) => spawnSync(process.execPath, [CLI, ...args], { cwd: root, encoding: "utf8" });

function fill(root, value = "pnpm check-types → exit 0") {
  const config = loadConfig(root);
  const p = join(root, config.todoPath);
  const md = readFileSync(p, "utf8");
  const a = parseActive(md);
  const rows = a.rows.map((r) => ({ ...r, evidence: r.evidence || value }));
  writeFileSync(p, md.slice(0, a.start) + renderBlock({ ...a.meta, title: a.title }, rows) + md.slice(a.end));
}

test("증거 판정: 빈 칸·형식만 채운 값·사유 없는 N/A", () => {
  assert.match(evidenceProblem(""), /비어/);
  for (const v of ["✓", "✔", "-", "OK", "done", "TODO", "tbd", "완료", "확인됨"]) assert.ok(evidenceProblem(v), v);
  assert.match(evidenceProblem("N/A"), /사유/);
  assert.match(evidenceProblem("n/a:"), /사유/);
  assert.equal(evidenceProblem("N/A: 기존 화면 개선"), null);
  assert.equal(evidenceProblem("pnpm check-types → exit 0"), null);
});

test("audit: 빈 칸이면 실패, 모두 채우면 통과", () => {
  const { root, write } = makeRepo();
  write("apps/web/src/app/todos/page.tsx");
  const config = loadConfig(root);
  writeTable(root, config, undefined, { title: "목록", write: true });
  const bad = audit(root, config);
  assert.equal(bad.ok, false);
  assert.ok(bad.problems.some((p) => p.includes("비어")));
  fill(root);
  const good = audit(root, config);
  assert.deepEqual(good.problems, []);
  assert.equal(good.ok, true);
});

test("audit: 라운드 중 다른 계층이 생기면 케이스 상향을 요구한다", () => {
  const { root, write } = makeRepo();
  write("apps/web/src/app/todos/page.tsx");
  const config = loadConfig(root);
  writeTable(root, config, undefined, { title: "목록", write: true });
  fill(root);
  write("packages/db/src/schema/todo.ts");
  const r = audit(root, config);
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((p) => p.includes("케이스 상향") && p.includes("table F")));
});

test("audit: 인증 파일을 건드리면 security 행 누락을 잡는다", () => {
  const { root, write } = makeRepo();
  write("packages/api/src/routers/todo.ts");
  const config = loadConfig(root);
  writeTable(root, config, undefined, { title: "API", write: true });
  fill(root);
  write("packages/auth/src/index.ts");
  const r = audit(root, config);
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((p) => p.includes("필수 행 누락") && p.includes("bts-reviewer(security)")));
});

test("audit: 활성 라운드가 없으면 실패", () => {
  const { root } = makeRepo();
  const r = audit(root, loadConfig(root));
  assert.equal(r.ok, false);
  assert.match(r.problems[0], /활성 라운드/);
});

test("status: 다음 빈 행을 알려 준다", () => {
  const { root, write } = makeRepo();
  write("packages/api/src/routers/todo.ts");
  const config = loadConfig(root);
  assert.equal(status(root, config).active, false);
  writeTable(root, config, undefined, { title: "API", write: true });
  const s = status(root, config);
  assert.equal(s.case, "D");
  assert.equal(s.filled, 0);
  assert.match(s.next, /^zod 입출력 계약/);
});

test("close: audit 실패면 거부, 통과하면 아카이브로 옮긴다", () => {
  const { root, write } = makeRepo();
  write("README.md", "changed\n");
  const config = loadConfig(root);
  writeTable(root, config, undefined, { title: "오타", write: true });
  assert.equal(close(root, config).ok, false);
  fill(root);
  const r = close(root, config, new Date("2026-09-25T00:00:00Z"));
  assert.equal(r.ok, true);
  assert.ok(r.archivePath.endsWith(join("tasks", "archive", "2026-09.md")));
  const archived = readFileSync(r.archivePath, "utf8");
  assert.match(archived, /dev-cycle:archived closed=2026-09-25 case=A/);
  assert.equal(parseActive(readFileSync(join(root, config.todoPath), "utf8")), null);
});

test("CLI: 종료 코드와 --json", () => {
  const { root, write } = makeRepo();
  write("apps/web/src/app/todos/page.tsx");
  const c = run(root, "case", "--json");
  assert.equal(c.status, 0);
  assert.equal(JSON.parse(c.stdout).pathCase, "B");
  assert.equal(run(root, "table", "--write", "--title", "목록 화면").status, 0);
  assert.equal(run(root, "table", "--write").status, 2);
  assert.equal(run(root, "audit").status, 1);
  assert.match(run(root, "status").stdout, /라운드 B "목록 화면"/);
  assert.equal(run(root, "nope").status, 2);
  assert.ok(existsSync(join(root, "tasks/todo.md")));
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd $T && node --test 'tests/*.test.mjs'dev-cycle-audit.test.mjs`
Expected: FAIL — `does not provide an export named 'audit'`

- [ ] **Step 3: 구현 (dev-cycle.mjs 끝에 추가)**

```js
const PLACEHOLDERS = new Set(["✓", "✔", "-", "ok", "done", "todo", "tbd"]);

export function evidenceProblem(e) {
  const v = String(e ?? "").trim();
  if (!v) return "증거 칸이 비어 있다";
  if (/^n\/a(?![a-z])/i.test(v)) return /^n\/a\s*:\s*\S/i.test(v) ? null : "N/A에 사유가 없다 (N/A: 사유)";
  if (PLACEHOLDERS.has(v.toLowerCase()) || v.replace(/\s/g, "").length < 4) return "형식만 채운 증거다";
  return null;
}

export function audit(root, config) {
  const md = readTodo(root, config);
  const active = md && parseActive(md);
  if (!active) return { ok: false, problems: ["활성 라운드가 없다 — pnpm dev-cycle table --write로 연다"] };
  const problems = [];
  active.rows.forEach((r, i) => {
    const p = evidenceProblem(r.evidence);
    if (p) problems.push(`#${i + 1} ${r.text}: ${p}`);
  });
  const X = active.meta.case;
  const cls = classify(changedFiles(root, active.meta.base), config);
  if (!["C", "F"].includes(X) && ![X, "A"].includes(cls.pathCase)) {
    problems.push(`케이스 상향 필요: 현재 diff 판정은 ${cls.pathCase} → pnpm dev-cycle table ${cls.pathCase} --write --upgrade`);
  } else {
    const have = new Set(active.rows.map((r) => r.text));
    for (const r of buildRows(readWorkflow(root, config), X, cls)) {
      if (!have.has(r.text)) problems.push(`필수 행 누락: ${r.text} → pnpm dev-cycle table ${X} --write --upgrade`);
    }
  }
  if (existsSync(join(root, ".claude/agents"))) {
    const r = spawnSync(process.execPath, [join(root, "scripts/sync-agents.mjs"), "--check"], { cwd: root, encoding: "utf8" });
    if (r.status !== 0) problems.push(`에이전트 정의 불일치 — pnpm agents:sync 실행: ${`${r.stdout}${r.stderr}`.trim()}`);
  }
  return { ok: problems.length === 0, problems, case: X, pathCase: cls.pathCase };
}

export function status(root, config) {
  const md = readTodo(root, config);
  const active = md && parseActive(md);
  if (!active) {
    return { active: false, line: '활성 라운드 없음 — pnpm dev-cycle case로 판정한 뒤 pnpm dev-cycle table --write --title "<요약>"으로 연다' };
  }
  const filled = active.rows.filter((r) => !evidenceProblem(r.evidence)).length;
  const next = active.rows.find((r) => evidenceProblem(r.evidence))?.text ?? null;
  const line = `라운드 ${active.meta.case} "${active.title}" — ${filled}/${active.rows.length}칸 — 다음: ${next ?? "audit 후 close"}`;
  return { active: true, case: active.meta.case, filled, total: active.rows.length, next, line };
}

export function close(root, config, now = new Date()) {
  const res = audit(root, config);
  if (!res.ok) return res;
  const todoPath = join(root, config.todoPath);
  const md = readFileSync(todoPath, "utf8");
  const active = parseActive(md);
  const day = now.toISOString().slice(0, 10);
  const archivePath = join(root, config.archiveDir, `${day.slice(0, 7)}.md`);
  const archived = md
    .slice(active.start, active.end)
    .replace("<!-- dev-cycle:start ", `<!-- dev-cycle:archived closed=${day} `)
    .replace("## 활성 라운드: ", "## 라운드: ")
    .replace(END_TAG, "<!-- dev-cycle:archived-end -->");
  mkdirSync(dirname(archivePath), { recursive: true });
  appendFileSync(archivePath, `${existsSync(archivePath) ? "\n" : ""}${archived}\n`);
  writeFileSync(todoPath, `${(md.slice(0, active.start) + md.slice(active.end)).replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "")}\n`);
  return { ok: true, archivePath };
}

const USAGE = "사용법: dev-cycle <case | table [CASE] [--write] [--upgrade] [--title 제목] | status | audit | close> [--json]";

export function main(argv, root = process.cwd()) {
  const [cmd, ...rest] = argv;
  const json = rest.includes("--json");
  const titleAt = rest.indexOf("--title");
  const title = titleAt >= 0 ? rest[titleAt + 1] : undefined;
  const positional = rest.filter((a, i) => !a.startsWith("--") && i !== titleAt + 1);
  const config = loadConfig(root);
  const print = (obj, text) => console.log(json ? JSON.stringify(obj, null, 2) : text);
  switch (cmd) {
    case "case": {
      const md = readTodo(root, config);
      const active = md && parseActive(md);
      const base = active ? active.meta.base : resolveBase(root, config);
      const cls = classify(changedFiles(root, base), config);
      const head = `${cls.pathCase}${cls.auth ? " (+auth: security 리뷰 행 추가)" : ""}${cls.harness && cls.pathCase !== "H" ? " (+H)" : ""} — base ${base ?? "none"}`;
      const lines = cls.evidence.map((e) => `  ${e.case ?? "-"}${e.auth ? "+auth" : ""}  ${e.file}  (${e.why ?? "인증 민감 경로"})`);
      print({ ...cls, base }, [head, ...lines].join("\n"));
      return 0;
    }
    case "table": {
      const r = writeTable(root, config, positional[0], { upgrade: rest.includes("--upgrade"), title, write: rest.includes("--write") });
      print(r, rest.includes("--write") ? `${config.todoPath}에 케이스 ${r.case} 대조표(${r.rows}행)를 썼다` : r.block);
      return 0;
    }
    case "status": {
      const s = status(root, config);
      print(s, s.line);
      return 0;
    }
    case "audit": {
      const r = audit(root, config);
      print(r, r.ok ? "audit 통과" : ["audit 실패:", ...r.problems.map((p) => `  ❌ ${p}`)].join("\n"));
      return r.ok ? 0 : 1;
    }
    case "close": {
      const r = close(root, config);
      print(r, r.ok ? `라운드를 닫았다 → ${r.archivePath}` : ["close 거부 — audit 실패:", ...r.problems.map((p) => `  ❌ ${p}`)].join("\n"));
      return r.ok ? 0 : 1;
    }
    default:
      console.error(USAGE);
      return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = e instanceof UsageError ? 2 : 1;
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd $T && node --test 'tests/*.test.mjs'`
Expected: PASS — Task 1~3 테스트 전체(22개) 통과.

---

### Task 4: 에이전트 정의와 Codex 동기화

**Files:**
- Create: `templates/bts-next-neon/files/.claude/agents/bts-implementer.md`
- Create: `templates/bts-next-neon/files/.claude/agents/bts-reviewer.md`
- Create: `templates/bts-next-neon/files/scripts/sync-agents.mjs`
- Test: `templates/bts-next-neon/tests/sync-agents.test.mjs`

**Interfaces:**
- Produces:
  - `parseAgent(md: string) → { meta: { name, description, tools?, model? }, body: string }`
  - `toToml(agent) → string` (첫 줄 `HEADER`)
  - `sync(root: string, { check?: boolean }) → string[]` (차이 목록; check=false면 파일을 쓰고 헤더 달린 고아 파일을 지운다)
  - CLI: `node scripts/sync-agents.mjs [--check]` (cwd = 프로젝트 루트). 차이가 있고 `--check`면 exit 1.

- [ ] **Step 1: 실패하는 테스트 작성**

`templates/bts-next-neon/tests/sync-agents.test.mjs`:

```js
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { parseAgent, sync, toToml } from "../files/scripts/sync-agents.mjs";
import { TEMPLATE_FILES } from "./helpers.mjs";

function project() {
  const root = mkdtempSync(join(tmpdir(), "sa-"));
  mkdirSync(join(root, ".claude"), { recursive: true });
  cpSync(join(TEMPLATE_FILES, ".claude/agents"), join(root, ".claude/agents"), { recursive: true });
  return root;
}
const tomlOk = (file) =>
  spawnSync("python3", ["-c", "import sys,tomllib; tomllib.load(open(sys.argv[1],'rb'))", file]).status === 0;

test("템플릿 에이전트 두 개를 유효한 TOML로 생성한다", () => {
  const root = project();
  const diffs = sync(root);
  assert.equal(diffs.length, 2);
  for (const name of ["bts-implementer", "bts-reviewer"]) {
    const f = join(root, ".codex/agents", `${name}.toml`);
    assert.ok(tomlOk(f), `${name} TOML 파싱`);
  }
  assert.match(readFileSync(join(root, ".codex/agents/bts-reviewer.toml"), "utf8"), /sandbox_mode = "read-only"/);
  assert.match(readFileSync(join(root, ".codex/agents/bts-implementer.toml"), "utf8"), /sandbox_mode = "workspace-write"/);
  assert.deepEqual(sync(root, { check: true }), []);
});

test("--check: 정본 수정·누락·고아를 잡고 파일은 바꾸지 않는다", () => {
  const root = project();
  sync(root);
  const md = join(root, ".claude/agents/bts-reviewer.md");
  writeFileSync(md, readFileSync(md, "utf8").replace("독립 리뷰어", "독립 검토자"));
  const before = readFileSync(join(root, ".codex/agents/bts-reviewer.toml"), "utf8");
  assert.deepEqual(sync(root, { check: true }), ["불일치: .codex/agents/bts-reviewer.toml"]);
  assert.equal(readFileSync(join(root, ".codex/agents/bts-reviewer.toml"), "utf8"), before);

  const orphan = join(root, ".codex/agents/old.toml");
  writeFileSync(orphan, `${before.split("\n")[0]}\nname = "old"\n`);
  writeFileSync(join(root, ".codex/agents/mine.toml"), 'name = "mine"\n');
  assert.ok(sync(root, { check: true }).includes("고아 생성물: .codex/agents/old.toml"));
  sync(root);
  assert.equal(existsSync(orphan), false);
  assert.equal(existsSync(join(root, ".codex/agents/mine.toml")), true);
});

test("tools가 없으면 workspace-write, 본문에 ''' 는 거부, frontmatter 필수", () => {
  const a = parseAgent('---\nname: x\ndescription: "설명"\n---\n본문\n');
  assert.match(toToml(a), /workspace-write/);
  assert.throws(() => toToml(parseAgent("---\nname: x\ndescription: d\n---\na '''\n")), /'''/);
  assert.throws(() => parseAgent("본문만"), /frontmatter/);
  assert.throws(() => parseAgent("---\nname: x\n---\n본문"), /description/);
});

test("CLI --check 종료 코드", () => {
  const root = project();
  const cli = join(TEMPLATE_FILES, "scripts/sync-agents.mjs");
  assert.equal(spawnSync(process.execPath, [cli, "--check"], { cwd: root }).status, 1);
  assert.equal(spawnSync(process.execPath, [cli], { cwd: root }).status, 0);
  assert.equal(spawnSync(process.execPath, [cli, "--check"], { cwd: root }).status, 0);
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd $T && node --test 'tests/*.test.mjs'sync-agents.test.mjs`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 에이전트 정본 작성**

`templates/bts-next-neon/files/.claude/agents/bts-implementer.md`:

```markdown
---
name: bts-implementer
description: "BTS Next.js + Neon 프로젝트에서 코디네이터가 지정한 파일만 구현하고 수정하는 에이전트. 파일 목록, 읽을 bts 스킬, 완료 조건을 받아 작업하고 실행한 검사와 결과를 보고한다."
tools: Read, Write, Edit, Bash, Grep, Glob, Skill
model: sonnet
---
너는 이 프로젝트의 구현 담당이다.

## 규칙
1. 먼저 `AGENTS.md`와 코디네이터가 지정한 스킬(`bts-web`, `bts-api`, `bts-db`, `bts-ui` 중)을 읽는다.
2. 코디네이터가 지정한 파일만 만들거나 고친다. 다른 파일을 바꿔야 할 것 같으면 고치지 말고 이유와 함께 보고한다.
3. `AGENTS.md`, `CLAUDE.md`, `.dev-cycle.json`, `package.json`, 루트 설정, `tasks/todo.md`는 고치지 않는다. 다른 작업자의 변경을 되돌리지 않는다.
4. 테스트가 지정되어 있으면 테스트를 먼저 쓰고, 실패를 확인한 뒤 구현한다.
5. 끝나면 `.dev-cycle.json`의 `commands` 중 관련 검사를 실행한다.
6. 커밋, push, 배포, DB 마이그레이션 적용, 외부 서비스 호출은 하지 않는다.

## 보고 형식
- 변경 파일: 경로 목록
- 실행한 검사: 명령 → 결과 (exit 코드, 실패면 첫 오류 한 줄)
- 실행하지 못한 검사와 이유
- 지정 범위 밖에서 필요해 보인 변경
```

`templates/bts-next-neon/files/.claude/agents/bts-reviewer.md`:

```markdown
---
name: bts-reviewer
description: "BTS Next.js + Neon 프로젝트의 변경을 읽기 전용으로 독립 검토하는 에이전트. 코디네이터가 focus(code, security, db), 기준 SHA, 파일 목록을 주면 결과를 JSON 한 객체로 반환한다. 파일을 수정하지 않는다."
tools: Read, Grep, Glob, Bash, Skill
model: opus
---
너는 이 프로젝트의 독립 리뷰어다. 파일을 만들거나 고치지 않는다. Bash는 `git diff`, `git log`, `git show`, `git status`, `ls`, 검색 같은 읽기 명령에만 쓴다. 테스트, 빌드, 설치, DB 명령은 실행하지 않는다. 서브에이전트를 띄우는 스킬은 실행하지 않는다.

## 입력
코디네이터가 주는 것: focus, 기준 SHA, 검토할 파일 목록, 대조표 경로(`tasks/todo.md`).

## 절차
1. `AGENTS.md`와 focus에 맞는 스킬을 읽는다. code는 `bts-web`과 `bts-api`, security는 `bts-api`와 `better-auth-security-best-practices`, db는 `bts-db`와 `supabase-postgres-best-practices`다.
2. `git diff <기준 SHA> -- <파일들>`과 주변 코드를 읽는다.
3. focus별로 확인한다.
   - code: 정확성, 오류와 경계 처리, Server Component와 Client Component 경계, 데이터 화면의 네 가지 상태, 불필요한 복잡도, 테스트가 동작을 실제로 검증하는지
   - security: 세션 없는 접근, 입력으로 받은 소유자 id, where 조건의 소유자 누락, 출력에 섞인 내부 필드, 비밀값의 클라이언트 노출, 인증 설정(trusted origins, 쿠키, secret)
   - db: 생성 SQL의 데이터 손실, 파괴적 변경의 단계 분리, FK·인덱스·nullable·기본값, `db:push` 흔적, 적용된 마이그레이션 파일의 사후 수정
4. 지적마다 파일과 줄, 근거(코드 인용 또는 재현 경로), 최소 수정안을 적는다. 확인하지 못한 추측은 지적으로 올리지 않고 limitations에 적는다.

## 출력
최종 응답은 코드 펜스나 설명 없이 JSON 한 객체다.
{"verdict":"approve|changes-required|blocked","focus":"code|security|db","max_severity":"none|low|medium|high|critical","findings":[{"severity":"high","file":"경로","line":42,"evidence":"근거","fix":"수정안"}],"limitations":["확인하지 못한 것"]}

- high 이상 지적이 있으면 approve를 내지 않는다.
- diff나 파일을 읽을 수 없으면 verdict는 blocked다.
```

- [ ] **Step 4: 동기화 스크립트 구현**

`templates/bts-next-neon/files/scripts/sync-agents.mjs`:

```js
#!/usr/bin/env node
// .claude/agents/*.md(정본) → .codex/agents/*.toml 생성. --check는 차이만 검사한다.
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const HEADER = "# generated by scripts/sync-agents.mjs from .claude/agents — 직접 수정하지 말 것";

export function parseAgent(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error("frontmatter가 없다");
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
  }
  for (const k of ["name", "description"]) if (!meta[k]) throw new Error(`frontmatter에 ${k}가 없다`);
  return { meta, body: m[2].trim() };
}

export function toToml({ meta, body }) {
  if (body.includes("'''")) throw new Error(`${meta.name}: 본문에 ''' 를 쓸 수 없다`);
  const tools = meta.tools ? meta.tools.split(",").map((t) => t.trim()) : null;
  const sandbox = !tools || tools.includes("Write") || tools.includes("Edit") ? "workspace-write" : "read-only";
  return [
    HEADER,
    `name = ${JSON.stringify(meta.name)}`,
    `description = ${JSON.stringify(meta.description)}`,
    `sandbox_mode = "${sandbox}"`,
    "developer_instructions = '''",
    body,
    "'''",
    "",
  ].join("\n");
}

export function sync(root, { check = false } = {}) {
  const src = join(root, ".claude/agents");
  const out = join(root, ".codex/agents");
  const expected = new Map();
  for (const f of readdirSync(src).filter((f) => f.endsWith(".md")).sort()) {
    const agent = parseAgent(readFileSync(join(src, f), "utf8"));
    expected.set(`${agent.meta.name}.toml`, toToml(agent));
  }
  const diffs = [];
  for (const [f, content] of expected) {
    const p = join(out, f);
    const cur = existsSync(p) ? readFileSync(p, "utf8") : null;
    if (cur === content) continue;
    diffs.push(`${cur === null ? "누락" : "불일치"}: .codex/agents/${f}`);
    if (!check) {
      mkdirSync(out, { recursive: true });
      writeFileSync(p, content);
    }
  }
  const existing = existsSync(out) ? readdirSync(out).filter((f) => f.endsWith(".toml")) : [];
  for (const f of existing) {
    if (expected.has(f) || !readFileSync(join(out, f), "utf8").startsWith(HEADER)) continue;
    diffs.push(`고아 생성물: .codex/agents/${f}`);
    if (!check) unlinkSync(join(out, f));
  }
  return diffs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const check = process.argv.includes("--check");
  try {
    const diffs = sync(process.cwd(), { check });
    if (check && diffs.length) {
      console.log(["에이전트 정의가 생성물과 다르다 (pnpm agents:sync):", ...diffs.map((d) => `  ${d}`)].join("\n"));
      process.exitCode = 1;
    } else {
      console.log(diffs.length ? diffs.map((d) => `갱신 — ${d}`).join("\n") : "에이전트 정의 일치");
    }
  } catch (e) {
    console.error(e.message);
    process.exitCode = 2;
  }
}
```

- [ ] **Step 5: 통과 확인**

Run: `cd $T && node --test 'tests/*.test.mjs'`
Expected: PASS — 전체 26개 통과. TOML 파싱 테스트가 실패하면 description 이스케이프나 `'''` 블록 형식을 확인한다.

- [ ] **Step 6: Codex 필드명 확인**

Run: `head -8 ~/.codex/agents/analyst.toml` 과 `codex --help`로 `name`, `description`, `developer_instructions`, `sandbox_mode` 필드가 현재 Codex 에이전트 형식과 맞는지 확인한다. 설치된 OMX 에이전트는 `name`·`description`·`developer_instructions`를 쓰고, reference kit의 `.codex/agents/*.toml`은 `sandbox_mode = "read-only"`를 쓴다. 다른 필드명이 필요하면 `toToml`과 테스트의 정규식을 함께 고친다.
Expected: 네 필드 모두 확인됨.

---

### Task 5: 프로젝트 문서 골격

**Files:**
- Create: `templates/bts-next-neon/files/AGENTS.md`
- Create: `templates/bts-next-neon/files/CLAUDE.md`
- Create: `templates/bts-next-neon/files/CONTEXT.md`
- Create: `templates/bts-next-neon/files/docs/adr/0001-bts-next-neon-stack.md`
- Create: `templates/bts-next-neon/files/docs/domain/project.md`
- Create: `templates/bts-next-neon/files/tasks/todo.md`
- Test: `templates/bts-next-neon/tests/template-docs.test.mjs`

**Interfaces:**
- Produces: 마커 문자열 `<!-- bts-template:start -->`, `<!-- bts-template:end -->` (Task 9 설치기가 사용). AGENTS.md가 5개 계층 스킬과 `bts-dev-cycle`을 모두 언급한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`templates/bts-next-neon/tests/template-docs.test.mjs`:

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { TEMPLATE_FILES } from "./helpers.mjs";

const read = (rel) => readFileSync(join(TEMPLATE_FILES, rel), "utf8");
const START = "<!-- bts-template:start -->";
const END = "<!-- bts-template:end -->";

test("AGENTS.md·CLAUDE.md는 마커로 감싸고 AGENTS.md는 80줄 이하", () => {
  for (const f of ["AGENTS.md", "CLAUDE.md"]) {
    const s = read(f).trim();
    assert.ok(s.startsWith(START) && s.endsWith(END), f);
  }
  assert.ok(read("AGENTS.md").split("\n").length <= 80);
  assert.match(read("CLAUDE.md"), /^@AGENTS\.md$/m);
});

test("AGENTS.md는 모든 bts 스킬과 문서 정본을 가리킨다", () => {
  const s = read("AGENTS.md");
  for (const k of ["bts-dev-cycle", "bts-web", "bts-ui", "bts-api", "bts-db", "bts-verify", "CONTEXT.md", "docs/adr/", "docs/domain/project.md", "docs/dev-workflow.md"]) {
    assert.ok(s.includes(k), k);
  }
});

test("도메인 문서 골격이 있다", () => {
  assert.match(read("CONTEXT.md"), /^## Language$/m);
  assert.match(read("docs/adr/0001-bts-next-neon-stack.md"), /Better Auth/);
  assert.match(read("docs/domain/project.md"), /## 데이터 모델과 코드 매핑/);
  assert.ok(existsSync(join(TEMPLATE_FILES, "tasks/todo.md")));
  assert.equal(existsSync(join(TEMPLATE_FILES, "docs/domain/glossary.md")), false);
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd $T && node --test 'tests/*.test.mjs'template-docs.test.mjs`
Expected: FAIL — `ENOENT ... AGENTS.md`

- [ ] **Step 3: 문서 작성**

`templates/bts-next-neon/files/AGENTS.md`:

```markdown
<!-- bts-template:start -->
# 에이전트 공통 규칙

이 프로젝트는 Better-T-Stack으로 만든 Next.js 풀스택 앱이다. Next.js App Router(`apps/web`), oRPC(`packages/api`), Better Auth(`packages/auth`), Drizzle + Neon Postgres(`packages/db`), shadcn UI(`packages/ui`), Turborepo, pnpm, Biome를 쓴다.

## 먼저 읽을 문서
- `CONTEXT.md`: 도메인 용어 정본. 코드, 문서, 대화에서 이 용어를 쓴다.
- `docs/domain/project.md`: 서비스, 화면과 URL, API, 데이터 모델과 코드 매핑, 권한
- `docs/adr/`: 되돌리기 어려운 결정과 그 이유
- `apps/web/AGENTS.md`: Next.js가 생성하는 버전별 규칙

## 작업 원칙
1. 가정은 드러내고, 결과를 바꾸는 모호함은 구현 전에 묻는다.
2. 요구한 동작에 필요한 가장 단순한 구현을 고른다.
3. 변경 범위를 좁게 유지하고 관계없는 코드를 고치지 않는다.
4. 완료는 검증 가능한 동작으로 말한다. 실행하지 않은 검사를 통과라고 하지 않는다.

## 코드 변경 절차
코드나 설정을 바꾸는 작업은 `bts-dev-cycle` 스킬로 시작한다. `pnpm dev-cycle case`로 판정하고, `pnpm dev-cycle table --write`로 대조표를 열고, 행을 실행한 뒤 `pnpm dev-cycle audit`과 `close`로 닫는다. 절차 정본은 `docs/dev-workflow.md`다.

## 계층별 스킬
| 작업 | 스킬 |
|---|---|
| 라우팅, RSC 경계, 데이터 패칭, 캐시, 성능 | `bts-web` |
| 화면 모양, UX, 디자인 리뷰 (impeccable) | `bts-ui` |
| oRPC 프로시저, Better Auth, 권한과 소유권 | `bts-api` |
| Drizzle 스키마, 마이그레이션, Neon | `bts-db` |
| 검사 선택, 증거 기록, 런타임 확인 | `bts-verify` |

전역에 같은 분야 스킬(예: `nextjs`, `supabase`)이 있어도 이 프로젝트에서는 위 `bts-*`를 먼저 따른다. 설계, 계획, 디버깅, 리뷰, QA에 쓸 프로세스 스킬은 `bts-dev-cycle`의 라우팅 표를 따른다.

## 보안 불변식
- 사용자 데이터를 다루는 프로시저는 `protectedProcedure`를 쓰고, 소유자 id는 세션에서만 가져와 where 조건에 넣는다.
- 비밀값과 서버 전용 모듈은 클라이언트 번들로 보내지 않는다.
- 스키마 변경은 `db:generate`로 만든 마이그레이션으로만 한다. 공유 DB 브랜치에는 `db:push`를 쓰지 않는다.
- 운영 DB, 실사용자 데이터, 배포, 커밋, push는 사용자가 요청할 때만 다룬다.

## 에이전트
- `bts-implementer`: 코디네이터가 지정한 파일만 구현한다.
- `bts-reviewer`: 읽기 전용 리뷰. focus는 code, security, db이고 JSON으로 응답한다.
- 리뷰는 구현한 쪽이 아니라 `bts-reviewer`가 한다.
<!-- bts-template:end -->
```

`templates/bts-next-neon/files/CLAUDE.md`:

```markdown
<!-- bts-template:start -->
@AGENTS.md

## Claude Code 전용
- 에이전트는 Agent 도구로 부른다: `subagent_type`은 `bts-implementer` 또는 `bts-reviewer`. 리뷰 프롬프트에는 focus, 기준 SHA(`tasks/todo.md` 마커의 base), 파일 목록을 넣는다.
- impeccable `critique`처럼 서브에이전트를 스스로 띄우는 스킬은 메인 세션에서 실행한다.
- superpowers 스킬은 `superpowers:` 접두어로 부른다 (예: `superpowers:brainstorming`).
<!-- bts-template:end -->
```

`templates/bts-next-neon/files/CONTEXT.md`:

```markdown
# 서비스 이름

이 서비스가 무엇이고 왜 존재하는지 한두 문장으로 적는다.

## Language

용어마다 한두 문장 정의와 피해야 할 동의어를 적는다. 일반 프로그래밍 개념은 넣지 않는다. 형식은 `domain-modeling` 스킬의 CONTEXT 형식을 따른다.

**사용자(User)**:
Better Auth로 가입한 계정. 코드에서는 `user` 테이블과 `context.session.user`다.
_Avoid_: 회원, 유저, account
```

`templates/bts-next-neon/files/docs/adr/0001-bts-next-neon-stack.md`:

```markdown
# Neon + 자체 관리 Better Auth, 소유권은 서버 코드가 지킨다

이 프로젝트는 Better-T-Stack(Next.js, oRPC, Drizzle)으로 만들고, DB는 Neon Postgres, 인증은 BTS가 생성하는 자체 관리 Better Auth를 쓴다. BTS 생성물을 그대로 살리고 인증 벤더 종속을 줄이기 위해 이 조합을 골랐다. RLS를 쓰지 않으므로 사용자 데이터 보호는 서버 프로시저의 세션 기반 소유권 검사와 2계정 격리 테스트가 맡고, 스키마 변경은 Drizzle `db:generate` 마이그레이션으로만 하며 적용 전에 Neon 개발 브랜치에서 검증한다.

## Considered Options
- Supabase Auth + RLS: DB가 마지막 방어선이 되지만 BTS가 생성하지 않아 연결 코드가 늘고 Supabase에 묶인다.
- Neon Auth (Managed Better Auth): 인증 상태가 DB 브랜치와 함께 복제되지만 플러그인 목록이 고정되고 BTS 생성 범위 밖이다.

## Consequences
- 새 프로시저마다 소유권 검사를 빠뜨릴 위험이 있다. dev-cycle D 케이스의 격리 테스트와 `bts-reviewer(security)`로 막는다.
```

`templates/bts-next-neon/files/docs/domain/project.md`:

```markdown
# 프로젝트 개관

이 문서는 서비스의 현재 모습을 적는다. 용어는 `CONTEXT.md`, 결정 이유는 `docs/adr/`에 둔다. 기능을 바꾼 라운드는 닫기 전에 이 문서를 갱신하거나 대조표에 `N/A: 사유`를 적는다.

## 한 줄 요약
무엇을, 누구를 위해 제공하는지 한 문장.

## 사용자와 권한
| 역할 | 할 수 있는 일 | 확인 위치 |
|---|---|---|
| 방문자 | 로그인, 가입 | `apps/web/src/app/login` |
| 로그인 사용자 | 자기 데이터만 조회와 변경 | `protectedProcedure` |

## 화면과 URL
| URL | 화면 | 보호 | 파일 |
|---|---|---|---|
| `/` | 홈 | 공개 | `apps/web/src/app/page.tsx` |
| `/login` | 로그인과 가입 | 공개 | `apps/web/src/app/login/page.tsx` |
| `/dashboard` | 대시보드 | 로그인 | `apps/web/src/app/dashboard/page.tsx` |

## API (oRPC)
| 프로시저 | 보호 | 입력 | 설명 |
|---|---|---|---|
| `healthCheck` | 공개 | 없음 | 상태 확인 |
| `privateData` | 로그인 | 없음 | 세션 확인 예시 |

## 데이터 모델과 코드 매핑
| 테이블 | 스키마 파일 | 소유자 컬럼 | 설명 |
|---|---|---|---|
| `user`, `session`, `account`, `verification` | `packages/db/src/schema/auth.ts` | 해당 없음 | Better Auth 생성물 (`pnpm auth:generate`) |

## 범위 밖
아직 하지 않기로 한 것.
```

`templates/bts-next-neon/files/tasks/todo.md`:

```markdown
# 작업

진행 중인 dev-cycle 라운드가 이 아래에 붙는다 (`pnpm dev-cycle table --write`). 닫은 라운드는 `tasks/archive/`로 옮겨진다.
```

- [ ] **Step 4: 통과 확인**

Run: `cd $T && node --test 'tests/*.test.mjs'`
Expected: PASS — 전체 29개 통과.


---

### Task 6: `bts-dev-cycle` 스킬과 스킬 구조 테스트

**Files:**
- Create: `templates/bts-next-neon/files/.agents/skills/bts-dev-cycle/SKILL.md`
- Create: `templates/bts-next-neon/files/.agents/skills/bts-dev-cycle/references/process-routing.md`
- Test: `templates/bts-next-neon/tests/skills.test.mjs`

**Interfaces:**
- Consumes: Task 3 CLI 명령(`pnpm dev-cycle case|table|status|audit|close`), Task 4 에이전트 이름, Task 1 `docs/dev-workflow.md`의 케이스 문자
- Produces: `tests/skills.test.mjs`의 `EXPECTED` 배열(Task 7·8이 이름을 추가한다)

- [ ] **Step 1: 실패하는 구조 테스트 작성**

`templates/bts-next-neon/tests/skills.test.mjs`:

```js
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { TEMPLATE_FILES } from "./helpers.mjs";

const SKILLS_DIR = join(TEMPLATE_FILES, ".agents/skills");
const EXPECTED = ["bts-dev-cycle"];
const SKILL_CREATOR =
  process.env.SKILL_CREATOR_DIR ??
  "/Users/freelife/.claude/plugins/cache/claude-plugins-official/skill-creator/ad30d62cd52a/skills/skill-creator";

function load(name) {
  const md = readFileSync(join(SKILLS_DIR, name, "SKILL.md"), "utf8");
  const m = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  assert.ok(m, `${name}: frontmatter`);
  return { front: m[1], body: m[2] };
}

for (const name of EXPECTED) {
  test(`${name}: skill-creator quick_validate 통과`, () => {
    const r = spawnSync("python3", [join(SKILL_CREATOR, "scripts/quick_validate.py"), join(SKILLS_DIR, name)], { encoding: "utf8" });
    assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  });

  test(`${name}: 이름·범위·길이·링크 규칙`, () => {
    const { front, body } = load(name);
    assert.match(front, new RegExp(`^name: ${name}$`, "m"));
    assert.match(front, /BTS/, "description에 프로젝트 조건(BTS)");
    assert.ok(body.trim().split("\n").length <= 150, "본문 150줄 이하");
    assert.doesNotMatch(body, /\bTODO\b|\bTBD\b/);
    for (const [, link] of body.matchAll(/\]\(((?:references|scripts)\/[^)#]+)\)/g)) {
      assert.ok(existsSync(join(SKILLS_DIR, name, link)), `${name}: 링크 ${link}`);
    }
  });
}
```

- [ ] **Step 2: 실패 확인**

Run: `cd $T && node --test 'tests/*.test.mjs'skills.test.mjs`
Expected: FAIL — `ENOENT ... bts-dev-cycle/SKILL.md` 또는 quick_validate의 `SKILL.md not found`

- [ ] **Step 3: SKILL.md 작성**

`templates/bts-next-neon/files/.agents/skills/bts-dev-cycle/SKILL.md`:

````markdown
---
name: bts-dev-cycle
description: >-
  이 BTS(Better-T-Stack) Next.js + Neon 프로젝트에서 코드, 스키마, 화면, 설정, 스킬을 바꾸는
  모든 작업의 진입점. 기능 추가, 버그 수정, 리팩터, 화면 변경, API나 DB 변경, 스킬이나 에이전트
  수정 요청을 받으면 구현을 시작하기 전에 이 스킬로 케이스를 판정하고 dev-cycle 대조표를 연다.
  만들어줘, 추가해줘, 고쳐줘, 버그, 바꿔줘, 리팩터, 기능 개발, 작업 시작, 다 됐어, 완료 처리
  같은 요청에 사용한다. 코드를 바꾸지 않는 질문 답변이나 코드 읽기에는 쓰지 않는다.
---

# BTS 개발 사이클

코드를 바꾸는 작업은 모두 **라운드** 하나로 진행한다. 라운드는 `tasks/todo.md`에 붙는 대조표 하나이고, 모든 행의 증거 칸이 채워지고 `pnpm dev-cycle audit`이 통과해야 끝난다.

## 0. 시작
1. `pnpm dev-cycle status`로 진행 중인 라운드가 있는지 본다. 있으면 그 라운드를 이어서 진행한다.
2. `AGENTS.md`, `CONTEXT.md`, `docs/domain/project.md`를 읽는다.
3. 요청을 한 문장으로 다시 쓰고, 결과를 바꾸는 모호함이 있으면 구현 전에 묻는다.

## 1. 케이스 판정
`pnpm dev-cycle case`는 현재 diff로 판정한다. 아직 파일을 바꾸지 않았다면 요청을 보고 고른다.

| 케이스 | 언제 |
|---|---|
| A | 문서나 설정처럼 규칙에 걸리지 않는 경미한 변경 |
| B | 화면, 컴포넌트, 스타일 (`apps/web/src/app`, `apps/web/src/components`, `packages/ui`) |
| C | 버그 수정. 경로와 상관없이 선언한다 |
| D | 서버와 API (`packages/api`, `apps/web/src/app/api`) |
| E | DB 스키마와 마이그레이션 (`packages/db`) |
| F | 두 계층 이상에 걸친 신규 기능, 또는 새 기능으로 선언한 작업 |
| H | 스킬, 에이전트, dev-cycle 자체 변경 |

- 새 기능 요청은 F, 버그 제보는 C로 선언한다. 애매하면 더 무거운 케이스를 고른다.
- 인증 민감 경로(`packages/auth`, `api/auth`, `services.ts`, `.env.schema` 등)를 건드리면 security 리뷰 행이 자동으로 붙는다.

## 2. 대조표 열기
```bash
pnpm dev-cycle table <케이스> --write --title "<요청 요약>"
```
케이스를 생략하면 diff 판정 결과를 쓴다. `--write` 없이 실행하면 미리 보기만 한다.

## 3. 행 실행
- 위에서부터 순서대로 수행하고, 끝낸 행마다 `tasks/todo.md`의 증거 칸을 채운다. 증거 형식은 `bts-verify`를 따른다: 실행한 명령과 결과, 산출물 경로, 사용한 스킬 이름. `✓`, `ok`, `done`만 적는 것은 증거가 아니다. 해당 없는 행은 `N/A: 사유`로 적는다.
- 계층별 스킬: 화면 동작은 `bts-web`, 화면 모양과 UX는 `bts-ui`, API와 인증은 `bts-api`, DB는 `bts-db`, 검사와 증거는 `bts-verify`.
- 설계, 계획, 구현, 디버깅, 리뷰, QA, 검증에 쓸 프로세스 스킬은 [references/process-routing.md](references/process-routing.md)의 표를 따른다. 1순위 스킬이 없으면 대안을, 그것도 없으면 표의 대체 절차를 쓰고, 증거 칸에 실제로 쓴 것을 적는다.
- D나 E 행이 있는데 테스트 러너가 아직 없으면, 대조표 첫 행 앞에 `| 0 | vitest 도입(최초 1회) → 설정 파일과 실행 결과 |  |` 행을 직접 추가한다.
- 작업 중 다른 계층을 건드리게 되면 `pnpm dev-cycle audit`이 케이스 상향을 알려 준다. 안내대로 `pnpm dev-cycle table <새 케이스> --write --upgrade`를 실행한다. 이미 채운 증거와 직접 추가한 행은 보존된다.

## 4. 에이전트
- 리뷰 행(`bts-reviewer(...)`)은 반드시 `bts-reviewer` 에이전트에 맡긴다. 프롬프트에 focus(`code`, `security`, `db`), 대조표 마커의 base SHA, 검토할 파일 목록, 대조표 경로를 준다. 응답 JSON은 증거 칸에 요약한다. 예: `bts-reviewer(code): approve, max=low, 지적 2 (반영 1, 기각 1: 재현 안 됨)`.
- 지적은 직접 확인한 뒤에만 고친다. high 이상 지적을 고쳤으면 같은 focus로 다시 리뷰한다. 응답이 없거나 JSON이 깨졌으면 `blocked`로 적는다.
- 구현을 위임할 때는 `bts-implementer`에 정확한 파일 목록, 읽을 `bts-*` 스킬, 완료 조건을 준다. 병렬로 위임할 때는 파일이 겹치지 않게 나눈다. `AGENTS.md`, `.dev-cycle.json`, `package.json`, 루트 설정은 직접 고친다.
- impeccable `critique`처럼 서브에이전트를 스스로 띄우는 스킬은 메인 세션에서 실행한다.

## 5. 종료
1. `pnpm dev-cycle audit`을 실행한다. 실패 항목이 남아 있으면 완료라고 말하지 않는다.
2. 통과하면 `pnpm dev-cycle close`로 대조표를 `tasks/archive/`로 옮긴다.
3. OMC나 OMX 모드(`autopilot`, `ralph`, `team` 등)를 썼다면 취소한다. 모드가 보고한 완료는 증거가 아니다.
4. 사용자에게 결과, 실행한 검사, 실행하지 못한 검사와 이유를 보고한다. 커밋, push, 배포는 사용자가 요청할 때만 한다.
````

- [ ] **Step 4: 라우팅 참고 문서 작성**

`templates/bts-next-neon/files/.agents/skills/bts-dev-cycle/references/process-routing.md`:

```markdown
# 프로세스 스킬 라우팅

단계마다 1순위를 먼저 쓴다. 현재 도구에 없으면 같은 줄의 대안, 그것도 없으면 "스킬이 없을 때" 절차를 쓴다. 대조표 증거 칸에는 실제로 쓴 스킬 이름을 적고, 대안이나 대체 절차를 썼다면 그 사실도 적는다 (예: `대안: OMC plan (superpowers 없음) → .omc/plans/todo-due.md`).

| 단계 | 1순위 (Claude·Codex 같은 이름) | 보강 | Claude 대안 | Codex 대안 | 스킬이 없을 때 |
|---|---|---|---|---|---|
| 요구 명확화 | superpowers `brainstorming` | `/grill-with-docs` (사용자가 호출, 용어와 ADR을 함께 기록) | OMC `deep-interview` | OMX `deep-interview` | 질문 목록을 만들어 사용자 확인을 받는다 |
| 계획 | superpowers `writing-plans` | 계획 리뷰: gstack `plan-eng-review`, UI가 있으면 `plan-design-review` | OMC `plan`, `ralplan` | OMX `plan`, `ralplan` | 파일별 단계와 검사를 적은 계획 파일을 직접 쓴다 |
| 구현 | superpowers `subagent-driven-development`(`bts-implementer` 사용) + `test-driven-development` | 없음 | OMC `team`, `ralph` (대규모 병렬) | OMX `team`, `ralph` | 대조표 행 순서대로 직접 구현한다 |
| 디버깅 (C) | superpowers `systematic-debugging` | gstack `investigate` | OMC `debug` | `gstack-investigate` | 재현 테스트 → 가설 → 수정 |
| 리뷰 | **`bts-reviewer`(필수)** + 지적 처리는 superpowers `receiving-code-review` | F 병합 전 추가 관점: gstack `review` | `/code-review` | OMX `code-review` | `bts-reviewer`만 |
| QA | gstack `qa-only` (F의 사용자 흐름, 보고만) | 없음 | gstack `qa` (수정 포함, 사용자가 요청할 때) | `gstack-qa-only` | `agent-browser`로 흐름을 직접 확인한다 |
| 검증 | superpowers `verification-before-completion` + `bts-verify` | 없음 | OMC `verify` | 없음 | `bts-verify` |
| 마무리 | superpowers `finishing-a-development-branch` | gstack `ship` (사용자가 요청할 때) | 없음 | 없음 | 선택지를 제시한다 |

## 도구별 이름
- Claude Code: superpowers는 `superpowers:<이름>`(예: `superpowers:writing-plans`), gstack은 접두어 없이(`plan-eng-review`, `review`, `qa-only`, `investigate`, `ship`), OMC는 `oh-my-claudecode:<이름>`.
- Codex: superpowers는 `<이름>` 그대로, gstack은 `gstack-<이름>`(예: `gstack-plan-eng-review`, `gstack-review`, `gstack-qa-only`, `gstack-investigate`, `gstack-ship`), OMX는 `<이름>` 그대로.

## 규칙
1. 대조표의 리뷰 행 증거는 `bts-reviewer`만 채울 수 있다. gstack `review`, `/code-review`, OMX `code-review`는 추가 관점이다.
2. OMC·OMX 모드(`autopilot`, `ralph`, `team`)는 실행 수단이다. 모드의 완료 보고는 증거가 아니며, 완료 판정은 `pnpm dev-cycle audit`만 한다. 모드가 커밋, push, 배포를 하게 두지 않고, 라운드를 닫을 때 모드를 취소한다.
3. gstack `qa`, `ship`처럼 코드를 고치거나 배포하는 스킬은 사용자가 요청할 때만 쓴다.
4. 전역 스킬이 하나도 없어도 "스킬이 없을 때" 절차만으로 라운드를 끝까지 진행할 수 있어야 한다.
```

- [ ] **Step 5: 통과 확인**

Run: `cd $T && node --test 'tests/*.test.mjs'`
Expected: PASS — 전체 31개 통과.

---

### Task 7: `bts-web`, `bts-api` 스킬

**Files:**
- Create: `templates/bts-next-neon/files/.agents/skills/bts-web/SKILL.md`
- Create: `templates/bts-next-neon/files/.agents/skills/bts-api/SKILL.md`
- Create: `templates/bts-next-neon/files/.agents/skills/bts-api/references/ownership-test.md`
- Modify: `templates/bts-next-neon/tests/skills.test.mjs` (`EXPECTED` 배열)

**Interfaces:**
- Consumes: BTS 3.44.1 생성물의 이름 — `protectedProcedure`·`publicProcedure`(`packages/api/src/index.ts`), `Context = { session, db }`(`packages/api/src/context.ts`), `appRouter`(`packages/api/src/routers/index.ts`), `orpc`(`apps/web/src/utils/orpc.ts`), `auth`(`apps/web/src/services.ts`), `createDb`(`packages/db/src/index.ts`)
- Produces: `bts-api/references/ownership-test.md` (Task 8의 `bts-verify`가 링크한다)

- [ ] **Step 1: 테스트 대상 추가**

`tests/skills.test.mjs`의 `const EXPECTED = ["bts-dev-cycle"];`를 `const EXPECTED = ["bts-dev-cycle", "bts-web", "bts-api"];`로 바꾼다.

- [ ] **Step 2: 실패 확인**

Run: `cd $T && node --test 'tests/*.test.mjs'skills.test.mjs`
Expected: FAIL — `bts-web`, `bts-api`의 quick_validate가 `SKILL.md not found`.

- [ ] **Step 3: `bts-web` 작성**

`templates/bts-next-neon/files/.agents/skills/bts-web/SKILL.md`:

````markdown
---
name: bts-web
description: >-
  이 BTS Next.js 프로젝트의 apps/web 동작과 구조를 만들거나 바꾸거나 검토할 때 사용한다. App Router
  라우팅, 페이지와 레이아웃, Server Component와 Client Component 경계, oRPC와 TanStack Query 데이터
  패칭, 로그인 보호 페이지, 캐시와 프리패치, 로딩과 오류 상태, 렌더링 성능을 다룬다. 페이지 추가,
  데이터 불러오기, use client, 서버 컴포넌트, 리다이렉트, 캐시, 느려요 같은 요청에 사용한다. 색,
  타이포, 레이아웃 같은 시각 디자인과 UX 판단은 bts-ui, 프로시저와 인증 로직은 bts-api, 테이블과
  마이그레이션은 bts-db가 맡는다.
---

# apps/web 동작과 구조

## 먼저 읽기
1. `apps/web/AGENTS.md`: Next.js가 생성하는 규칙이다. 이 프로젝트의 Next 버전은 학습 데이터와 다를 수 있으므로, 쓰려는 API의 문서를 `apps/web/node_modules/next/dist/docs/`에서 먼저 찾아 읽는다.
2. 바꿀 경로 주변 파일, `apps/web/src/utils/orpc.ts`, 보호 페이지 예시인 `apps/web/src/app/dashboard/page.tsx`.

## 공식 스킬 연결
| 상황 | 읽을 스킬 |
|---|---|
| 컴포넌트와 훅 작성, 리렌더, 번들 크기, 요청 워터폴 | `vercel-react-best-practices` |
| props가 불어나는 컴포넌트, 합성 설계 | `vercel-composition-patterns` |
| `use cache`와 Cache Components 도입 또는 점검 | `next-cache-components-adoption`, `next-cache-components-optimizer` |
| 링크 프리패치 전략 | `next-partial-prefetching-adoption` |
| 바꾼 동작이 실제 앱에서 도는지 확인 | `next-dev-loop` (절차는 `bts-verify`) |
| turbo 태스크와 패키지 의존 | `turborepo` |

## 규칙
- Server Component가 기본이다. `"use client"`는 상태, 이벤트, 브라우저 API가 필요한 가장 작은 컴포넌트에만 붙인다.
- 클라이언트 데이터는 `orpc` 유틸과 TanStack Query로 부른다. 조회는 `useQuery(orpc.<라우터>.<프로시저>.queryOptions({ input }))`, 변경은 `useMutation(orpc.<라우터>.<프로시저>.mutationOptions())` 뒤에 관련 쿼리를 무효화한다. `/api/rpc`를 fetch로 직접 부르지 않는다.
- 서버 전용 모듈(`src/services.ts`, `src/env.server.ts`, DB와 auth 인스턴스)을 Client Component에서 import하지 않는다. 비밀값은 `.env.schema`에서 `@public`이 아닌 값으로 두고 클라이언트로 넘기지 않는다.
- 보호 페이지는 서버에서 세션을 확인하고 `redirect("/login")`한다. `dashboard/page.tsx`처럼 `auth.api.getSession({ headers: await headers() })`를 쓴다. 클라이언트 리다이렉트만으로 보호하지 않는다.
- 데이터를 보여 주는 화면은 loading, empty, error, 비인가(로그인 필요) 상태를 각각 구분해 보여 준다.
- UI 프리미티브는 `packages/ui`의 shadcn 컴포넌트를 쓴다. 새 UI 라이브러리나 상태관리 라이브러리는 근거 없이 추가하지 않는다.
- API 계약이 바뀌면 `bts-api`를, 화면 모양이 바뀌면 `bts-ui`를 함께 읽는다.

## 예: 로그인 사용자 전용 목록 페이지
```tsx
// apps/web/src/app/todos/page.tsx (Server Component)
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../services";
import TodoList from "./todo-list";

export default async function TodosPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  return <TodoList />;
}
```
```tsx
// apps/web/src/app/todos/todo-list.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export default function TodoList() {
  const todos = useQuery(orpc.todo.list.queryOptions());
  if (todos.isPending) return <p>불러오는 중…</p>;
  if (todos.isError) return <p role="alert">목록을 불러오지 못했습니다.</p>;
  if (todos.data.length === 0) return <p>아직 할 일이 없습니다.</p>;
  return <ul>{todos.data.map((t) => <li key={t.id}>{t.title}</li>)}</ul>;
}
```
import 별칭(`@/`)이 없으면 상대 경로를 쓴다. 모양과 문구는 `bts-ui` 단계에서 다듬는다.

## 검사
`.dev-cycle.json`의 `commands.typecheck`, `commands.lint`, `commands.build`. 런타임 확인은 `bts-verify`.
````

- [ ] **Step 4: `bts-api` 작성**

`templates/bts-next-neon/files/.agents/skills/bts-api/SKILL.md`:

````markdown
---
name: bts-api
description: >-
  이 BTS 프로젝트의 서버 경계를 만들거나 바꾸거나 검토할 때 사용한다. packages/api의 oRPC 프로시저,
  라우터, context와 packages/auth의 Better Auth 설정, 세션, 로그인과 회원가입, 권한, 내 데이터만
  보이게 하는 소유권 검사, zod 입력 검증을 다룬다. API 추가, 엔드포인트, 프로시저, 라우터, 로그인,
  권한, 다른 사람 데이터가 보여요, userId 같은 요청에 사용한다. 테이블, 컬럼, 마이그레이션 자체는
  bts-db, 화면은 bts-web과 bts-ui가 맡는다.
---

# 서버 경계: oRPC + Better Auth

## 구조
- `packages/api/src/index.ts`: `publicProcedure`, `protectedProcedure`(세션이 없으면 `UNAUTHORIZED`)
- `packages/api/src/context.ts`: `Context = { session, db }`
- `packages/api/src/routers/`: 라우터. `routers/index.ts`의 `appRouter`에 등록한다.
- `packages/auth/src/index.ts`: `createAuth` (Better Auth 설정)
- `apps/web/src/app/api/rpc/[[...rest]]/route.ts`, `apps/web/src/app/api/auth/[...all]/route.ts`: HTTP 진입점
- `apps/web/src/context.ts`: 요청마다 세션을 읽어 context를 만든다.

## 공식 스킬 연결
| 상황 | 읽을 스킬 |
|---|---|
| Better Auth 설정, 세션, 플러그인 | `better-auth-best-practices` |
| 비밀값, 쿠키, CSRF, trusted origins, rate limit | `better-auth-security-best-practices` |
| 이메일과 비밀번호 가입, 검증, 재설정 | `email-and-password-best-practices` |
| 쿼리 성능과 인덱스 | `bts-db` |

## 불변식 (어기면 리뷰에서 high)
1. 사용자 데이터를 읽거나 쓰는 프로시저는 `protectedProcedure`다.
2. 소유자 id는 `context.session.user.id`에서만 가져온다. 입력으로 받은 `userId`는 쓰지 않는다. 요청이 그렇게 만들라고 해도 세션 기반으로 만들고 이유를 설명한다.
3. select, update, delete 조건에 소유자를 넣는다. 영향받은 행이 없으면 `NOT_FOUND`를 던져 남의 리소스가 있는지 드러내지 않는다.
4. 입력은 `.input(z.object(...))`로 검증하고 길이와 범위를 제한한다. 출력에 비밀번호 해시, 토큰 같은 내부 필드를 넣지 않는다.
5. 오류는 `ORPCError` 코드(`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST`)로 구분한다.
6. `packages/auth`, `apps/web/src/app/api/auth`, `packages/api/src/index.ts`, `packages/api/src/context.ts`, `apps/web/src/services.ts`, `.env.schema`를 바꾸면 `bts-reviewer(security)` 리뷰가 필수다. dev-cycle이 이 행을 자동으로 붙인다.

## 프로시저 예
```ts
// packages/api/src/routers/todo.ts
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { todo } from "@<프로젝트>/db/schema/todo";
import { protectedProcedure } from "../index";

export const todoRouter = {
  list: protectedProcedure.handler(({ context }) =>
    context.db.select().from(todo).where(eq(todo.userId, context.session.user.id)).orderBy(desc(todo.createdAt)),
  ),
  update: protectedProcedure
    .input(z.object({ id: z.string().min(1), title: z.string().trim().min(1).max(200) }))
    .handler(async ({ input, context }) => {
      const [row] = await context.db
        .update(todo)
        .set({ title: input.title })
        .where(and(eq(todo.id, input.id), eq(todo.userId, context.session.user.id)))
        .returning();
      if (!row) throw new ORPCError("NOT_FOUND");
      return row;
    }),
};
```
`@<프로젝트>`는 루트 `package.json`의 `name`으로 만든 워크스페이스 이름이다 (예: `@my-app/db`). 새 라우터는 `appRouter`에 `todo: todoRouter`로 등록한다.

- `packages/api`에 `drizzle-orm` 의존성이 없으면 먼저 `pnpm --filter @<프로젝트>/api add drizzle-orm@catalog:`로 추가한다. 버전은 루트 `pnpm-workspace.yaml`의 catalog를 따른다.
- BTS의 `--examples todo` 예제는 `publicProcedure`로 소유권 검사 없이 만들어진다. 그 패턴을 따라 하지 않는다.

## 격리 테스트
사용자 데이터를 다루는 프로시저를 추가하거나 바꾸면 두 계정 격리 테스트를 쓴다. 패턴과 준비는 [references/ownership-test.md](references/ownership-test.md).

## 검사
`.dev-cycle.json`의 `commands.typecheck`, `commands.lint`, `commands.test`. 증거 형식은 `bts-verify`.
````

- [ ] **Step 5: 격리 테스트 참고 문서 작성**

`templates/bts-next-neon/files/.agents/skills/bts-api/references/ownership-test.md`:

````markdown
# 2계정 격리 테스트

사용자 데이터를 다루는 프로시저를 추가하거나 바꾸면 이 패턴으로 테스트를 쓴다. 다른 계정의 데이터를 읽거나 고치거나 지울 수 없고, 로그인하지 않으면 거절된다는 것을 **실제 Postgres**에서 확인한다.

## 준비 (최초 1회, 대조표의 vitest 도입 행)
1. `pnpm --filter @<프로젝트>/api add -D vitest`
2. `packages/api/package.json` scripts에 `"test": "vitest run"`, 루트 `package.json`에 `"test": "turbo run test"`를 추가한다.
3. `turbo.json`의 `tasks`에 `"test": { "cache": false }`를 추가하고, `globalEnv`에 `"TEST_DATABASE_URL"`을 추가한다 (turbo는 선언하지 않은 환경변수를 태스크에 넘기지 않는다).
4. Neon 테스트 브랜치를 만들고(`neon-postgres-branches`) 그 direct 연결 문자열을 `TEST_DATABASE_URL`로 둔다. 운영 브랜치 URL은 쓰지 않는다. 스키마는 `DATABASE_URL="$TEST_DATABASE_URL" pnpm db:migrate`로 적용한다.
5. `.dev-cycle.json`의 `commands.test`에 `"pnpm test"`를 기록한다.

## 테스트 예
```ts
// packages/api/src/routers/todo.isolation.test.ts
import { createRouterClient } from "@orpc/server";
import { createDb } from "@<프로젝트>/db";
import { user } from "@<프로젝트>/db/schema/auth";
import { todo } from "@<프로젝트>/db/schema/todo";
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { appRouter } from "./index";

const url = process.env.TEST_DATABASE_URL;
const db = createDb({ DATABASE_URL: url ?? "" });
const A = `iso-a-${Date.now()}`;
const B = `iso-b-${Date.now()}`;
const as = (id: string | null) =>
  createRouterClient(appRouter, {
    context: { db, session: id ? ({ user: { id } } as NonNullable<Context["session"]>) : null },
  });

describe.skipIf(!url)("todo 소유권 격리", () => {
  beforeAll(async () => {
    const now = new Date();
    await db.insert(user).values(
      [A, B].map((id) => ({ id, name: id, email: `${id}@test.local`, emailVerified: false, createdAt: now, updatedAt: now })),
    );
  });
  afterAll(async () => {
    await db.delete(todo).where(inArray(todo.userId, [A, B]));
    await db.delete(user).where(inArray(user.id, [A, B]));
  });

  it("B는 A의 할 일을 목록에서 볼 수 없다", async () => {
    const created = await as(A).todo.create({ title: "A의 할 일" });
    const list = await as(B).todo.list();
    expect(list.map((t) => t.id)).not.toContain(created.id);
  });

  it("B는 A의 할 일을 고치거나 지울 수 없다", async () => {
    const created = await as(A).todo.create({ title: "A의 할 일" });
    await expect(as(B).todo.update({ id: created.id, title: "탈취" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(as(B).todo.delete({ id: created.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const mine = await as(A).todo.list();
    expect(mine.find((t) => t.id === created.id)?.title).toBe("A의 할 일");
  });

  it("로그인하지 않으면 UNAUTHORIZED", async () => {
    await expect(as(null).todo.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
```

- 프로시저 이름(`create`, `list`, `update`, `delete`)과 `user` 테이블 컬럼은 실제 코드에 맞춘다. `user` 컬럼은 `packages/db/src/schema/auth.ts`를 확인한다.
- `TEST_DATABASE_URL`이 없으면 테스트가 **skipped**로 끝난다. skipped는 통과가 아니다. 대조표에는 `3 passed`처럼 실제로 실행된 결과만 적는다.
````

- [ ] **Step 6: 통과 확인**

Run: `cd $T && node --test 'tests/*.test.mjs'`
Expected: PASS — 전체 35개 통과.

---

### Task 8: `bts-db`, `bts-ui`, `bts-verify` 스킬

**Files:**
- Create: `templates/bts-next-neon/files/.agents/skills/bts-db/SKILL.md`
- Create: `templates/bts-next-neon/files/.agents/skills/bts-db/references/migration-flow.md`
- Create: `templates/bts-next-neon/files/.agents/skills/bts-ui/SKILL.md`
- Create: `templates/bts-next-neon/files/.agents/skills/bts-ui/references/impeccable-map.md`
- Create: `templates/bts-next-neon/files/.agents/skills/bts-verify/SKILL.md`
- Create: `templates/bts-next-neon/files/.agents/skills/bts-verify/references/evidence.md`
- Modify: `templates/bts-next-neon/tests/skills.test.mjs` (`EXPECTED` 배열)

**Interfaces:**
- Consumes: `.dev-cycle.json`의 `commands` 키(`typecheck`, `lint`, `build`, `test`, `dbGenerate`, `dbMigrate`, `dbPush`), `ui.auditMin`, `ui.a11yMin`; Task 1 B 케이스 행 문구; Task 7 `ownership-test.md`
- Produces: 스킬 6개 완성

- [ ] **Step 1: 테스트 대상 추가**

`tests/skills.test.mjs`의 `EXPECTED`를 `["bts-dev-cycle", "bts-web", "bts-api", "bts-db", "bts-ui", "bts-verify"]`로 바꾼다.

- [ ] **Step 2: 실패 확인**

Run: `cd $T && node --test 'tests/*.test.mjs'skills.test.mjs`
Expected: FAIL — 새 세 스킬의 `SKILL.md not found`.

- [ ] **Step 3: `bts-db` 작성**

`templates/bts-next-neon/files/.agents/skills/bts-db/SKILL.md`:

````markdown
---
name: bts-db
description: >-
  이 BTS 프로젝트의 packages/db(Drizzle ORM + Neon Postgres)를 만들거나 바꾸거나 검토할 때 사용한다.
  테이블, 컬럼, 관계 추가, 스키마 변경, 마이그레이션 생성과 적용, 인덱스, 느린 쿼리, Neon 개발 브랜치,
  DATABASE_URL 연결 문제를 다룬다. 테이블 추가, 컬럼 추가, 마이그레이션, 스키마, 인덱스, 쿼리가
  느려요, Neon 브랜치, db push 같은 요청에 사용한다. 프로시저의 권한과 소유권 로직은 bts-api가 맡는다.
---

# DB: Drizzle + Neon

## 구조
- 스키마: `packages/db/src/schema/*.ts`(`schema/index.ts`에서 export), 관계: `packages/db/src/relations.ts`
- 마이그레이션: `packages/db/src/migrations/` (drizzle-kit 생성물, 커밋 대상)
- 인증 테이블 `packages/db/src/schema/auth.ts`는 `pnpm auth:generate`가 만든다. 손으로 고치지 않는다.
- 연결: `packages/db/src/index.ts`의 `createDb`, 환경변수 `DATABASE_URL`(varlock `.env.schema`, 값은 `apps/web/.env`)

## 공식 스킬 연결
| 상황 | 읽을 스킬 |
|---|---|
| 컬럼 타입, 제약, 인덱스, 쿼리 작성과 튜닝 | `supabase-postgres-best-practices` (서비스와 무관한 Postgres 규칙) |
| 연결(pooled와 direct), 마이그레이션 운영, 검색 | `neon-postgres` (먼저 상위 `neon`) |
| 개발과 테스트용 브랜치 만들기와 리셋 | `neon-postgres-branches` |

## 스키마 변경 절차
1. 스키마 파일을 고친다. 새 테이블은 `schema/index.ts`에서 export한다.
2. `.dev-cycle.json`의 `commands.dbGenerate`(`pnpm db:generate`)로 SQL 마이그레이션을 만든다.
3. 생성된 SQL을 읽고 의도하지 않은 `DROP`, 타입 축소, 데이터 손실이 없는지 확인한다.
4. **Neon 개발 브랜치**에 적용한다. 브랜치의 direct URL을 환경변수로 넘겨 `commands.dbMigrate`를 실행한다. 절차는 [references/migration-flow.md](references/migration-flow.md).
5. 마이그레이션 파일을 스키마 변경과 함께 커밋 대상으로 둔다.

## 금지
- 공유 브랜치(main, production)에 `db:push`를 쓰지 않는다. `db:push`는 버릴 개인 브랜치에서 실험할 때만 쓴다.
- 이미 적용된 마이그레이션 파일을 고치지 않는다. 고칠 일이 있으면 새 마이그레이션을 만든다.
- 운영 DB, 실제 사용자 데이터, 연결 문자열의 비밀번호는 사용자의 명시적 요청 없이 다루지 않는다.

## 설계 규칙
- 사용자 소유 테이블에는 `userId`(`text`, `user.id` FK, `onDelete` 동작 명시)와 그 인덱스를 둔다. 소유권 검사는 `bts-api`가 한다.
- 시각 컬럼은 `timestamp("created_at", { withTimezone: true }).defaultNow().notNull()` 형태로 둔다.
- 조회 조건과 정렬에 쓰는 컬럼에는 인덱스를 둔다. 여러 컬럼 조건이면 복합 인덱스를 검토한다.
- 파괴적 변경(컬럼 삭제, 이름 변경, 타입 축소)은 expand와 contract 두 단계로, 각각 별도 마이그레이션과 별도 라운드로 나눈다. 예는 [references/migration-flow.md](references/migration-flow.md).
- 앱은 pooled 연결 문자열, 마이그레이션은 direct 연결 문자열을 쓴다 (`neon-postgres`의 연결 절).
- 새 도메인 용어는 `CONTEXT.md`에, 되돌리기 어려운 구조 결정은 `docs/adr/`에 남긴다 (`domain-modeling`).

## 예: 사용자 소유 테이블
```ts
// packages/db/src/schema/todo.ts
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const todo = pgTable(
  "todo",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    completed: boolean("completed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (t) => [index("todo_user_id_created_at_idx").on(t.userId, t.createdAt)],
);
```
````

- [ ] **Step 4: 마이그레이션 흐름 참고 문서 작성**

`templates/bts-next-neon/files/.agents/skills/bts-db/references/migration-flow.md`:

````markdown
# 마이그레이션 흐름 (Drizzle + Neon 브랜치)

Neon CLI와 MCP 명령의 정확한 문법은 설치된 `neon-postgres-branches`, `neon-postgres` 스킬을 따른다. 아래는 이 프로젝트의 순서다.

1. **스키마 수정**: `packages/db/src/schema/<이름>.ts`. 새 파일이면 `schema/index.ts`에서 export한다.
2. **생성**: `pnpm db:generate` → `packages/db/src/migrations/`에 SQL과 메타 파일이 생긴다.
3. **검토**: 생성 SQL을 읽는다. 의도하지 않은 `DROP`, 타입 축소, 기존 행이 있는 테이블에 기본값 없는 `NOT NULL` 추가, 빠진 인덱스, FK의 `ON DELETE`를 확인한다.
4. **개발 브랜치 준비**: `dev/<작업명>` 브랜치를 만든다 (`neon-postgres-branches`). 실데이터가 민감하면 schema-only 브랜치를 쓴다.
5. **적용**: 브랜치의 **direct** 연결 문자열로 실행한다.
   ```bash
   DATABASE_URL='<dev 브랜치 direct URL>' pnpm db:migrate
   ```
   varlock은 프로세스 환경변수를 `.env`보다 우선하고, `turbo.json`의 `globalEnv`에 `DATABASE_URL`이 있어 태스크까지 전달된다. 적용 뒤 같은 방식으로 `pnpm db:studio`를 열어 대상 브랜치가 맞는지 확인한다.
6. **증거**: 대조표에 브랜치 이름과 `db:migrate` 출력 요약을 적는다. 연결 문자열과 비밀번호는 적지 않는다.
7. **정리**: 작업이 병합되면 개발 브랜치를 지우거나 만료를 설정한다.

## 파괴적 변경: expand → contract
예: `todo.title`을 `todo.name`으로 바꾸기 (운영 데이터가 있을 때)
1. **expand 라운드**: `name` 컬럼을 추가하고 기존 값을 복사하는 마이그레이션(`UPDATE todo SET name = title WHERE name IS NULL`)을 만든다. 코드는 `name`에 쓰고 읽되, 배포 전환 동안 `title`도 채운다.
2. **contract 라운드**: 모든 코드가 `name`만 쓰는 것이 배포된 뒤 `title`을 삭제하는 마이그레이션을 만든다.
drizzle-kit이 rename인지 묻더라도, 운영 데이터가 있으면 한 번의 rename 대신 위 두 단계를 쓴다.

## db:push를 쓰는 경우
버릴 개인 브랜치에서 스키마를 빠르게 실험할 때만 쓴다. 실험이 끝나면 `db:generate`로 정식 마이그레이션을 만들고, 새 개발 브랜치에 다시 적용해 확인한다.
````

- [ ] **Step 5: `bts-ui` 작성**

`templates/bts-next-neon/files/.agents/skills/bts-ui/SKILL.md`:

````markdown
---
name: bts-ui
description: >-
  이 BTS 프로젝트의 화면 모양과 사용자 경험을 기획하고 설계하고 구현하고 리뷰할 때 사용한다. 새 화면과
  페이지 디자인, 리디자인, 레이아웃, 타이포, 색, 간격, 빈 상태와 온보딩, UX 문구, 반응형, 접근성,
  디자인 리뷰와 폴리시, 디자인 토큰과 DESIGN.md를 다룬다. 화면 만들어줘, 디자인, 예쁘게, UI 개선,
  UX, 디자인 리뷰, 접근성 점검, polish 같은 요청에 사용하며 impeccable을 주력으로 쓴다. 데이터
  패칭, 라우팅, 렌더링 경계 같은 동작 문제는 bts-web이 맡는다.
---

# UI/UX: impeccable 중심

정본은 `PRODUCT.md`(제품 맥락)와 `DESIGN.md`(시각 시스템)다. 토큰은 `packages/ui/src/styles/globals.css`, 컴포넌트는 `packages/ui/src/components`(shadcn)에 있다.

## 시작할 때마다
프로젝트 루트에서 `.agents/skills/impeccable/scripts/impeccable context`를 한 번 실행한다(Windows에서 `sh`가 없으면 `impeccable.cmd`). 대상이 정해져 있으면 `--target <경로>`를 붙인다. 출력의 지시를 따른다.

## 단계
| 단계 | 할 일 | impeccable |
|---|---|---|
| 기획 (프로젝트당 1회) | `PRODUCT.md`가 없으면 먼저 만든다 | `init` |
| 시각 방향 (1회, 리디자인 때 다시) | 첫 화면에서 시각 세계를 정하고 `DESIGN.md`를 만든다. BTS 기본 shadcn 룩은 출발점일 뿐 정체성이 아니다 | new-work → `document` |
| 설계 (새 화면과 흐름마다) | 코드 없이 브리프를 만들고 사용자 확인을 받는다 | `shape <기능>` |
| 개발 | 편집 직전에 impeccable의 `reference/craft-floor.md`를 읽는다. 브리프에 따라 필요할 때만 `layout`, `typeset`, `clarify`, `harden`, `onboard`, `adapt` | new-work |
| 리뷰 | 메인 세션에서 실행한다. 서브에이전트 안에서 실행하지 않는다 | `critique`, `audit` + `web-design-guidelines` |
| 마감 | 수정을 한 번에 모아 적용하고 재확인은 1회만 한다 | `polish` |
| 정본 갱신 | 토큰이나 컴포넌트가 바뀌었을 때. 덮어쓰기 전에 사용자에게 묻는다 | `document` |

단계별 상세, B 케이스 행별 증거 예시, 통과 기준은 [references/impeccable-map.md](references/impeccable-map.md).

## 규칙
- 새 화면은 `shape` 브리프가 확정되기 전에 코드를 쓰지 않는다. 기존 화면의 좁은 개선은 브리프 없이 진행하고, 대조표에 `N/A: 기존 화면 개선`처럼 적는다.
- 색, 간격, 반경, 그림자는 토큰으로만 쓴다. 원시 hex 값이나 임의 Tailwind 값(`bg-[#123456]`, `mt-[13px]`)을 새로 넣지 않는다.
- shadcn 프리미티브는 `packages/ui`의 것을 쓴다. 새 컴포넌트가 필요하면 `shadcn` 스킬 절차로 `packages/ui`에 추가한다.
- 통과 기준: critique의 P0와 P1은 해결하거나 사유를 적고 보류한다. audit 총점은 `.dev-cycle.json`의 `ui.auditMin`(기본 16/20) 이상, 접근성 점수는 `ui.a11yMin`(기본 3/4) 이상이다.
- 편집 중 자동 검사: 개발자마다 한 번 `$impeccable hooks on`을 실행하면 UI 파일을 고칠 때마다 detector가 결과를 알려 준다. Codex에서는 `/hooks`에서 신뢰를 확인한다.
- 데이터 상태(loading, empty, error, 비인가)의 모양과 문구는 `bts-web`과 함께 설계한다.
````

- [ ] **Step 6: impeccable 매핑 참고 문서 작성**

`templates/bts-next-neon/files/.agents/skills/bts-ui/references/impeccable-map.md`:

```markdown
# impeccable 단계 매핑

## 모드
impeccable은 화면마다 모드를 고른다. 앱 화면(대시보드, 목록, 설정, 편집기)은 **Operate**, 랜딩과 가격 페이지는 **Persuade**, 문서와 도움말은 **Read**다. 모드는 화면의 surface brief에 남고, 제품 전체가 아니라 화면 기준으로 정한다.

## 단계별 상세
| 단계 | 명령 | 산출물 | 주의 |
|---|---|---|---|
| 기획 | `init` (별칭 `teach`) | `PRODUCT.md` (Platform, Stack, Users, Purpose, Positioning, Brand Commitments, Principles, Accessibility) | 프로젝트당 1회. 이미 있으면 다시 만들지 않는다 |
| 시각 방향 | new-work → `document` | `DESIGN.md` (토큰 frontmatter + 섹션) | 코드가 없으면 seed 모드, 있으면 scan 모드. 기존 `DESIGN.md`를 조용히 덮어쓰지 않는다 |
| 설계 | `shape <기능>` | 확정된 브리프 (코드 없음) | 사용자 확인 또는 한 번의 수정 뒤 멈춘다 |
| 개발 | new-work, 필요 시 `layout`, `typeset`, `colorize`, `clarify`, `harden`, `onboard`, `adapt`, `animate` | 코드 | 편집 직전에 `reference/craft-floor.md`를 로드한다 |
| 리뷰 | `critique <대상>` | Design Health 점수, P0~P3 지적, `.impeccable/critique/`에 기록 | 독립 평가자 두 명을 서브에이전트로 띄우므로 메인 세션에서 실행한다 |
| 리뷰 | `audit <대상>` | 접근성, 성능, 테마, 반응형, 일관성 각 0~4점, 합계 20점 | 권장 후속 명령 목록을 준다 |
| 마감 | `polish <대상>` | 정리된 코드 | critique 결과를 입력으로 쓴다. 검증은 한 번 모아서 하고 재확인은 1회 |
| 정본 갱신 | `document` | `DESIGN.md` 갱신 | refresh, overwrite, merge 중 무엇을 할지 사용자에게 묻는다 |
| 관리 | `hooks on`, `hooks status`, `doctor` | 편집 detector, 설정 점검 | `CONTEXT_STALE` 안내는 보고만 하고 사용자가 요청할 때 고친다 |

Claude Code에서는 `impeccable` 스킬을 부르고 인자로 명령을 준다(예: 스킬 인자 `critique apps/web/src/app/todos`). Codex에서는 `$impeccable critique apps/web/src/app/todos`처럼 부른다.

## B 케이스 행별 증거 예시
| 행 | 증거 예시 |
|---|---|
| impeccable context 실행 | `impeccable context → PRODUCT.md 있음, DESIGN.md 없음 → document seed 실행` |
| shape 브리프 확정 | `shape → docs/briefs/todos.md (사용자 확인 2026-10-01)` 또는 `N/A: 버튼 간격만 조정` |
| 구현 | `apps/web/src/app/todos/*.tsx 3개, packages/ui 토큰 1개` |
| 타입·린트·빌드 | `pnpm check-types → 0, pnpm exec biome check . → 0, pnpm build → 0` |
| 스크린샷 | `tasks/evidence/todo-list/desktop.png, mobile.png` |
| critique | `Design Health 31/40, P0 0, P1 2 (빈 상태 문구, 대비)` |
| audit | `audit 15/20, 접근성 3/4 → 기준 미달, polish에서 해결` |
| 수정과 polish | `P1 2건 반영, 대비 토큰 조정` |
| 재확인 | `audit 17/20, 접근성 4/4, 스크린샷 갱신` |
| DESIGN.md 갱신 | `document merge → 색 토큰 1개 추가` 또는 `N/A: 토큰 변화 없음` |
```

- [ ] **Step 7: `bts-verify` 작성**

`templates/bts-next-neon/files/.agents/skills/bts-verify/SKILL.md`:

```markdown
---
name: bts-verify
description: >-
  이 BTS 프로젝트에서 작업이 끝났다고 말하기 전, 또는 dev-cycle 대조표의 증거 칸을 채울 때 사용한다.
  어떤 검사를 돌릴지 고르고, 실행하고, 결과를 증거로 기록한다. 타입 검사, 린트, 빌드, 테스트, 2계정
  격리 테스트, next-dev-loop 런타임 확인, agent-browser 스크린샷, 리뷰 결과 기록을 다룬다. 검증해줘,
  확인해줘, 테스트 돌려, 잘 되는지 봐줘, 완료 처리, 증거 채워줘, 빌드 통과했으니 끝 같은 요청에
  사용한다.
---

# 검증과 증거

원칙: **실행하지 않은 검사는 통과가 아니다.** 결과를 얻지 못했으면 `blocked: 사유` 또는 `미실행: 사유`로 적는다. 다른 검사가 통과했다고 해서 실행하지 못한 검사를 통과로 합치지 않는다.

## 검사 고르기
명령은 `.dev-cycle.json`의 `commands`에 있다. 없는 키는 실행할 수 없는 검사다.

| 바뀐 것 | 최소 검사 |
|---|---|
| 모든 코드 | `commands.typecheck`, `commands.lint` |
| 화면과 라우트 | 위 + `commands.build`, 런타임 확인, desktop과 mobile 스크린샷 |
| 프로시저와 인증 | 위 + `commands.test`, **2계정 격리 테스트** |
| 스키마 | 위 + Neon 개발 브랜치에 `commands.dbMigrate` 적용 출력 |
| 스킬, 에이전트, dev-cycle | `pnpm agents:check`, `pnpm dev-cycle status` |

`commands.lint`는 파일을 고치지 않는 검사(`pnpm exec biome check .`)다. `pnpm check`는 `--write`로 파일을 고치므로 검증 증거로 쓰지 않는다.

## 런타임과 브라우저
- `next-dev-loop` 스킬 절차를 따른다: `pnpm dev`(web은 포트 3001)를 띄우고, `/_next/mcp`로 Next 진단을 보고, `agent-browser`로 실제 화면을 확인한다.
- 스크린샷은 `tasks/evidence/<라운드 제목>/`에 저장하고 경로를 증거로 적는다. desktop(1440px)과 mobile(390px)을 함께 찍는다.
- `agent-browser` CLI가 없으면 브라우저 검사를 `blocked: agent-browser 미설치`로 적는다. 다른 도구로 몰래 바꾸지 않는다.
- Next MCP 진단(프레임워크의 시각)과 화면 확인(사용자의 시각)은 다른 증거다. 하나로 다른 하나를 대신하지 않는다.

## 테스트 러너
- 테스트 러너가 없으면 첫 D나 E 라운드에서 vitest를 도입한다. 대조표에 `vitest 도입(최초 1회)` 행을 추가하고, 루트 `test` 스크립트와 `.dev-cycle.json`의 `commands.test`를 함께 등록한다. 절차는 `bts-api` 스킬의 `references/ownership-test.md`에 있다.
- 격리 테스트는 운영 DB가 아니라 Neon 테스트 브랜치(`TEST_DATABASE_URL`)에서 돌린다. `skipped`로 끝난 테스트는 통과가 아니다.

## 증거 적는 법
형식은 [references/evidence.md](references/evidence.md). 요약하면 다음과 같다.
- 명령: `pnpm check-types → exit 0`. 실패면 첫 오류 한 줄을 적는다.
- 테스트: `vitest todo.isolation → 3 passed`.
- 리뷰: `bts-reviewer(code): approve, max=low, 지적 2 (반영 1, 기각 1: 재현 안 됨)`.
- 스킬 사용: `writing-plans → docs/superpowers/plans/…`. 대안을 썼으면 `대안: OMC plan (superpowers 없음)`.
- `✓`, `ok`, `done`, `완료`만 적는 것은 증거가 아니다. 해당 없으면 `N/A: 사유`.
- 비밀값, 토큰, 연결 문자열, 실사용자 데이터는 증거에 복사하지 않는다.

## 완료 보고
`pnpm dev-cycle audit`이 통과한 뒤에만 완료라고 말한다. 보고에는 실행한 검사와 결과, 실행하지 못한 검사와 이유를 넣는다. superpowers `verification-before-completion`이 있으면 함께 따른다.
```

- [ ] **Step 8: 증거 형식 참고 문서 작성**

`templates/bts-next-neon/files/.agents/skills/bts-verify/references/evidence.md`:

```markdown
# 증거 형식

대조표의 증거 칸은 다음 사람이 같은 결과를 다시 확인할 수 있을 만큼 구체적이어야 한다. 한 칸에는 한 줄로 적고, 길면 `tasks/evidence/<라운드 제목>/`에 파일로 두고 경로를 적는다.

| 종류 | 형식 | 예 |
|---|---|---|
| 명령 | `<명령> → exit <코드>[, 첫 오류]` | `pnpm check-types → exit 0` |
| 테스트 | `<러너> <대상> → <n> passed[, <m> failed]` | `vitest todo.isolation → 3 passed` |
| 마이그레이션 | `<브랜치> ← <파일> 적용 → <요약>` | `dev/todo-due ← 0003_add_due_at.sql 적용 → 1 statement ok` |
| 런타임 | `next-dev-loop <경로> → <관찰>` | `next-dev-loop /todos → 200, 콘솔 오류 0` |
| 스크린샷 | `<경로들>` | `tasks/evidence/todo-list/desktop.png, mobile.png` |
| 리뷰 | `bts-reviewer(<focus>): <verdict>, max=<등급>, 지적 <n> (반영 <a>, 기각 <b>: 사유)` | `bts-reviewer(db): approve, max=none, 지적 0` |
| UI 평가 | `critique <점수>, P0 <n>, P1 <n>` / `audit <점수>/20, 접근성 <점수>/4` | `audit 17/20, 접근성 4/4` |
| 스킬 사용 | `<스킬> → <산출물>` | `brainstorming → docs/superpowers/specs/2026-10-01-todo-due.md` |
| 대안 사용 | `대안: <스킬> (<1순위> 없음) → <산출물>` | `대안: OMC plan (superpowers 없음) → .omc/plans/todo.md` |
| 해당 없음 | `N/A: <사유>` | `N/A: 스키마 변화 없음` |
| 막힘 | `blocked: <사유>` | `blocked: agent-browser 미설치` |

## 증거가 아닌 것
- `✓`, `✔`, `-`, `ok`, `done`, `todo`, `tbd`, `완료`처럼 형식만 채운 값 (dev-cycle audit이 거부한다)
- 사유 없는 `N/A`
- 실행하지 않은 검사를 다른 검사 결과로 대신한 것 (예: 빌드 통과를 격리 테스트 통과로 적기)
- `skipped`로 끝난 테스트
- OMC나 OMX 모드의 "완료" 보고
```

- [ ] **Step 9: 통과 확인**

Run: `cd $T && node --test 'tests/*.test.mjs'`
Expected: PASS — 전체 41개 통과. quick_validate가 실패하면 description의 YAML(`>-` 들여쓰기)과 `<`, `>` 문자를 확인한다.

---

### Task 9: 설치기 (`install.mjs` + `install.sh`)와 README

**Files:**
- Create: `templates/bts-next-neon/install.mjs`
- Create: `templates/bts-next-neon/install.sh`
- Create: `templates/bts-next-neon/README.md`
- Test: `templates/bts-next-neon/tests/install.test.mjs`

**Interfaces:**
- Consumes: `files/` 전체(Task 1~8), `scripts/sync-agents.mjs` CLI(Task 4), 마커 `<!-- bts-template:start -->`(Task 5)
- Produces:
  - `OFFICIAL_SKILLS: Array<[source: string, skills: string[]]>`, `SKILLS_CLI = "skills@1.7.0"`
  - `preflight(target) → { errors: string[], warnings: string[] }`
  - `copyFiles(target, { diff }) → { copied: string[], appended: string[], same: string[], kept: Array<{ rel, diff? }> }`
  - `linkSkills(target) → { created: string[], conflicts: string[] }`
  - `configureDevCycle(target) → { commands, defaultBranch }`
  - `addScripts(target) → string[]`, `ensureGitignore(target) → boolean`, `formatWithBiome(target, rels) → string`
  - `installOfficialSkills(target) → string[]` (실패 source 목록), `detectProcessSkills(home?) → Array<{ tool, name, ok }>`
  - `main(argv) → number` (0 성공, 1 사전 점검 실패·에이전트 생성 실패, 2 공식 스킬 일부 실패)

- [ ] **Step 1: 실패하는 테스트 작성**

`templates/bts-next-neon/tests/install.test.mjs`:

```js
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { test } from "node:test";
import { OFFICIAL_SKILLS } from "../install.mjs";
import { TEMPLATE, TEMPLATE_FILES } from "./helpers.mjs";

function fakeBts(prefix = "bts-") {
  const root = mkdtempSync(join(tmpdir(), prefix));
  const w = (rel, s) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), s);
  };
  w("package.json", '{\n\t"name": "fake",\n\t"scripts": {\n\t\t"check-types": "turbo run check-types",\n\t\t"build": "turbo run build",\n\t\t"check": "biome check --write .",\n\t\t"db:generate": "x",\n\t\t"db:migrate": "x",\n\t\t"db:push": "x"\n\t}\n}\n');
  w("biome.json", "{}\n");
  w("apps/web/package.json", JSON.stringify({ dependencies: { next: "16.0.0" } }));
  w("packages/db/drizzle.config.ts", "export default {};\n");
  w("packages/api/src/index.ts", "\n");
  w("packages/auth/src/index.ts", "\n");
  w(".gitignore", "node_modules\n");
  execFileSync("git", ["init", "-q", "-b", "master"], { cwd: root });
  return root;
}
const install = (target, ...flags) =>
  spawnSync("bash", [join(TEMPLATE, "install.sh"), target, "--skip-skills", ...flags], { encoding: "utf8" });
function snapshot(root) {
  const out = {};
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === ".git") continue;
      const p = join(d, e.name);
      if (e.isSymbolicLink()) out[relative(root, p)] = `link:${readlinkSync(p)}`;
      else if (e.isDirectory()) walk(p);
      else out[relative(root, p)] = createHash("sha256").update(readFileSync(p)).digest("hex");
    }
  };
  walk(root);
  return out;
}

test("설치: 파일·스킬 링크·Codex 에이전트·스크립트·설정", () => {
  const root = fakeBts();
  const r = install(root);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  for (const f of ["AGENTS.md", "CLAUDE.md", "CONTEXT.md", "scripts/dev-cycle.mjs", "docs/dev-workflow.md", ".agents/skills/bts-dev-cycle/SKILL.md"]) {
    assert.ok(existsSync(join(root, f)), f);
  }
  const link = join(root, ".claude/skills/bts-web");
  assert.ok(lstatSync(link).isSymbolicLink());
  assert.ok(existsSync(join(link, "SKILL.md")));
  assert.match(readFileSync(join(root, ".codex/agents/bts-reviewer.toml"), "utf8"), /read-only/);
  const pkgText = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkgText, /^\t"scripts"/m, "탭 들여쓰기 보존");
  const pkg = JSON.parse(pkgText);
  assert.equal(pkg.scripts["dev-cycle"], "node scripts/dev-cycle.mjs");
  assert.equal(pkg.scripts["agents:check"], "node scripts/sync-agents.mjs --check");
  assert.equal(pkg.scripts.check, "biome check --write .");
  const cfg = JSON.parse(readFileSync(join(root, ".dev-cycle.json"), "utf8"));
  assert.equal(cfg.defaultBranch, "master");
  assert.equal(cfg.commands.typecheck, "pnpm check-types");
  assert.equal(cfg.commands.lint, "pnpm exec biome check .");
  assert.equal(cfg.commands.dbGenerate, "pnpm db:generate");
  assert.equal(cfg.commands.test, undefined);
  assert.ok(readFileSync(join(root, ".gitignore"), "utf8").split("\n").includes("tasks/evidence/"));
  const dc = spawnSync(process.execPath, ["scripts/dev-cycle.mjs", "status"], { cwd: root, encoding: "utf8" });
  assert.equal(dc.status, 0);
  assert.match(dc.stdout, /활성 라운드 없음/);
});

test("두 번째 실행은 아무것도 바꾸지 않는다 (멱등)", () => {
  const root = fakeBts();
  assert.equal(install(root).status, 0);
  const before = snapshot(root);
  const r = install(root);
  assert.equal(r.status, 0);
  assert.deepEqual(snapshot(root), before);
  assert.match(r.stdout, /복사 0/);
});

test("기존 AGENTS.md는 보존하고 템플릿 블록을 한 번만 덧붙인다", () => {
  const root = fakeBts();
  writeFileSync(join(root, "AGENTS.md"), "# 기존 규칙\n- 한국어로 답한다\n");
  install(root);
  install(root);
  const s = readFileSync(join(root, "AGENTS.md"), "utf8");
  assert.ok(s.startsWith("# 기존 규칙\n- 한국어로 답한다\n"));
  assert.equal(s.split("<!-- bts-template:start -->").length - 1, 1);
});

test("공백과 한글이 든 경로에도 설치된다", () => {
  const root = fakeBts("my app 프로젝트-");
  assert.equal(install(root).status, 0);
  assert.ok(existsSync(join(root, ".claude/skills/bts-dev-cycle/SKILL.md")));
});

test("사전 점검 실패는 exit 1이고 파일을 만들지 않는다", () => {
  const notGit = mkdtempSync(join(tmpdir(), "nogit-"));
  mkdirSync(join(notGit, "apps/web"), { recursive: true });
  writeFileSync(join(notGit, "apps/web/package.json"), JSON.stringify({ dependencies: { next: "16" } }));
  const r = install(notGit);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /git 저장소가 아니다/);
  assert.equal(existsSync(join(notGit, "AGENTS.md")), false);

  const noNext = fakeBts();
  writeFileSync(join(noNext, "apps/web/package.json"), "{}");
  assert.equal(install(noNext).status, 1);
});

test("공식 스킬 목록: 21개, 중복 없음, 템플릿 문서가 모두 언급한다", () => {
  const names = OFFICIAL_SKILLS.flatMap(([, s]) => s);
  assert.equal(names.length, 21);
  assert.equal(new Set(names).size, names.length);
  const corpus = ["AGENTS.md", "CLAUDE.md", "CONTEXT.md"]
    .map((f) => readFileSync(join(TEMPLATE_FILES, f), "utf8"))
    .concat(readdirSync(join(TEMPLATE_FILES, ".agents/skills"), { recursive: true })
      .filter((f) => f.endsWith(".md"))
      .map((f) => readFileSync(join(TEMPLATE_FILES, ".agents/skills", f), "utf8")))
    .join("\n");
  const indirect = new Set(["grilling"]);
  for (const n of names) if (!indirect.has(n)) assert.ok(corpus.includes(n), `${n}을 어떤 문서도 언급하지 않는다`);
});
```

`grilling`은 사용자가 부르는 `/grill-with-docs`가 내부에서 호출하므로 문서가 직접 언급하지 않는다.

- [ ] **Step 2: 실패 확인**

Run: `cd $T && node --test 'tests/*.test.mjs'install.test.mjs`
Expected: FAIL — `Cannot find module '.../install.mjs'`

- [ ] **Step 3: 설치기 구현**

`templates/bts-next-neon/install.mjs`:

```js
#!/usr/bin/env node
// BTS Next.js + Neon 템플릿 설치기. install.sh가 이 파일을 실행한다.
// 사용법: install.sh <project-dir> [--diff] [--skip-skills]
import { spawnSync } from "node:child_process";
import {
  appendFileSync, copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, realpathSync, symlinkSync, writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const TEMPLATE_DIR = dirname(fileURLToPath(import.meta.url));
export const FILES_DIR = join(TEMPLATE_DIR, "files");
export const SKILLS_CLI = "skills@1.7.0";
export const OFFICIAL_SKILLS = [
  ["vercel/next.js", ["next-dev-loop", "next-cache-components-adoption", "next-cache-components-optimizer", "next-partial-prefetching-adoption"]],
  ["vercel-labs/agent-skills", ["vercel-react-best-practices", "vercel-composition-patterns", "web-design-guidelines"]],
  ["vercel-labs/agent-browser", ["agent-browser"]],
  ["shadcn/ui", ["shadcn"]],
  ["better-auth/skills", ["better-auth-best-practices", "better-auth-security-best-practices", "email-and-password-best-practices"]],
  ["neondatabase/agent-skills", ["neon", "neon-postgres", "neon-postgres-branches"]],
  ["supabase/agent-skills", ["supabase-postgres-best-practices"]],
  ["pbakaus/impeccable", ["impeccable"]],
  ["vercel/turborepo", ["turborepo"]],
  ["mattpocock/skills", ["domain-modeling", "grilling", "grill-with-docs"]],
];
const MARK_START = "<!-- bts-template:start -->";
const MERGE_MD = new Set(["AGENTS.md", "CLAUDE.md"]);
const IGNORE = new Set([".DS_Store"]);

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: "utf8", ...opts });

export function preflight(target) {
  const errors = [];
  const warnings = [];
  if (!existsSync(target) || !lstatSync(target).isDirectory()) return { errors: [`대상 디렉터리가 없다: ${target}`], warnings };
  if (run("git", ["rev-parse", "--git-dir"], { cwd: target }).status !== 0) {
    errors.push("git 저장소가 아니다 (BTS 생성 때 --git을 쓰거나 git init을 먼저 한다)");
  }
  const webPkg = join(target, "apps/web/package.json");
  const web = existsSync(webPkg) ? JSON.parse(readFileSync(webPkg, "utf8")) : {};
  if (!web.dependencies?.next && !web.devDependencies?.next) {
    errors.push("apps/web/package.json에 next 의존성이 없다 (BTS --frontend next 프로젝트가 아니다)");
  }
  if (Number(process.versions.node.split(".")[0]) < 20) errors.push(`Node 20 이상이 필요하다 (현재 ${process.versions.node})`);
  if (run("pnpm", ["--version"]).status !== 0) errors.push("pnpm이 없다");
  for (const p of ["packages/db/drizzle.config.ts", "packages/api", "packages/auth"]) {
    if (!existsSync(join(target, p))) warnings.push(`${p} 없음 — .dev-cycle.json 경로 규칙을 프로젝트에 맞게 고친다`);
  }
  return { errors, warnings };
}

function walk(dir, base = dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, base));
    else out.push(relative(base, p));
  }
  return out.sort();
}

export function copyFiles(target, { diff = false } = {}) {
  const r = { copied: [], appended: [], same: [], kept: [] };
  for (const rel of walk(FILES_DIR)) {
    const src = join(FILES_DIR, rel);
    const dest = join(target, rel);
    if (!existsSync(dest)) {
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
      r.copied.push(rel);
      continue;
    }
    const cur = readFileSync(dest);
    const content = readFileSync(src);
    if (cur.equals(content)) {
      r.same.push(rel);
      continue;
    }
    const text = cur.toString("utf8");
    if (MERGE_MD.has(rel) && !text.includes(MARK_START)) {
      appendFileSync(dest, `${text.endsWith("\n") ? "" : "\n"}\n${content.toString("utf8")}`);
      r.appended.push(rel);
      continue;
    }
    r.kept.push(diff ? { rel, diff: run("diff", ["-u", dest, src]).stdout } : { rel });
  }
  return r;
}

export function linkSkills(target) {
  const created = [];
  const conflicts = [];
  const skillsDir = join(target, ".agents/skills");
  for (const name of readdirSync(skillsDir).filter((n) => n.startsWith("bts-")).sort()) {
    const link = join(target, ".claude/skills", name);
    const to = `../../.agents/skills/${name}`;
    let st = null;
    try {
      st = lstatSync(link);
    } catch {}
    if (!st) {
      mkdirSync(dirname(link), { recursive: true });
      symlinkSync(to, link);
      created.push(name);
    } else if (!(st.isSymbolicLink() && readlinkSync(link) === to) && realpathSync(link) !== realpathSync(join(skillsDir, name))) {
      conflicts.push(name);
    }
  }
  return { created, conflicts };
}

function defaultBranch(target) {
  const remote = run("git", ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"], { cwd: target });
  if (remote.status === 0) return remote.stdout.trim().replace(/^origin\//, "");
  return run("git", ["branch", "--show-current"], { cwd: target }).stdout.trim() || null;
}

export function configureDevCycle(target) {
  const p = join(target, ".dev-cycle.json");
  const cfg = JSON.parse(readFileSync(p, "utf8"));
  const scripts = JSON.parse(readFileSync(join(target, "package.json"), "utf8")).scripts ?? {};
  const found = {};
  if (scripts["check-types"]) found.typecheck = "pnpm check-types";
  if (existsSync(join(target, "biome.json")) || existsSync(join(target, "biome.jsonc"))) found.lint = "pnpm exec biome check .";
  else if (scripts.lint) found.lint = "pnpm lint";
  if (scripts.build) found.build = "pnpm build";
  if (scripts.test) found.test = "pnpm test";
  if (scripts["db:generate"]) found.dbGenerate = "pnpm db:generate";
  if (scripts["db:migrate"]) found.dbMigrate = "pnpm db:migrate";
  if (scripts["db:push"]) found.dbPush = "pnpm db:push";
  cfg.commands = { ...found, ...cfg.commands };
  const branch = defaultBranch(target);
  if (branch) cfg.defaultBranch = branch;
  writeFileSync(p, `${JSON.stringify(cfg, null, 2)}\n`);
  return { commands: cfg.commands, defaultBranch: cfg.defaultBranch };
}

export function addScripts(target) {
  const p = join(target, "package.json");
  const text = readFileSync(p, "utf8");
  const pkg = JSON.parse(text);
  const indent = text.match(/^([ \t]+)"/m)?.[1] ?? "  ";
  const want = {
    "dev-cycle": "node scripts/dev-cycle.mjs",
    "agents:sync": "node scripts/sync-agents.mjs",
    "agents:check": "node scripts/sync-agents.mjs --check",
  };
  pkg.scripts ??= {};
  const added = Object.keys(want).filter((k) => !(k in pkg.scripts));
  for (const k of added) pkg.scripts[k] = want[k];
  if (added.length) writeFileSync(p, `${JSON.stringify(pkg, null, indent)}\n`);
  return added;
}

export function ensureGitignore(target) {
  const p = join(target, ".gitignore");
  const cur = existsSync(p) ? readFileSync(p, "utf8") : "";
  if (cur.split(/\r?\n/).includes("tasks/evidence/")) return false;
  appendFileSync(p, `${cur && !cur.endsWith("\n") ? "\n" : ""}\n# dev-cycle 증거 파일 (스크린샷 등)\ntasks/evidence/\n`);
  return true;
}

export function formatWithBiome(target, rels) {
  const bin = join(target, "node_modules/.bin/biome");
  const hasConfig = existsSync(join(target, "biome.json")) || existsSync(join(target, "biome.jsonc"));
  if (!hasConfig || !existsSync(bin) || rels.length === 0) return "건너뜀";
  const r = run(bin, ["check", "--write", "--no-errors-on-unmatched", ...rels], { cwd: target });
  return r.status === 0 ? "적용" : `경고 — biome check 실패: ${`${r.stdout}${r.stderr}`.trim().split("\n")[0]}`;
}

export function installOfficialSkills(target) {
  const failures = [];
  for (const [source, skills] of OFFICIAL_SKILLS) {
    const r = run("npx", ["-y", SKILLS_CLI, "add", source, "--skill", ...skills, "--agent", "claude-code", "codex", "-y"], {
      cwd: target,
      stdio: "inherit",
      env: { ...process.env, CI: "true" },
    });
    const missing = skills.filter((s) => !existsSync(join(target, ".agents/skills", s, "SKILL.md")));
    if (r.status !== 0 || missing.length) failures.push(`${source}${missing.length ? ` (없음: ${missing.join(", ")})` : ""}`);
  }
  return failures;
}

export function detectProcessSkills(home = homedir()) {
  const has = (...p) => existsSync(join(home, ...p));
  let plugins = "";
  try {
    plugins = readFileSync(join(home, ".claude/plugins/installed_plugins.json"), "utf8");
  } catch {}
  return [
    ["Claude", "superpowers", plugins.includes('"superpowers@')],
    ["Claude", "gstack", has(".claude/skills/gstack")],
    ["Claude", "OMC", plugins.includes('"oh-my-claudecode@')],
    ["Codex", "superpowers", has(".codex/superpowers/skills") || has(".agents/skills/superpowers")],
    ["Codex", "gstack", has(".codex/skills/gstack")],
    ["Codex", "OMX", has(".codex/skills/omx-setup")],
  ].map(([tool, name, ok]) => ({ tool, name, ok }));
}

export function main(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const args = argv.filter((a) => !a.startsWith("--"));
  if (args.length !== 1) {
    console.error("사용법: install.sh <project-dir> [--diff] [--skip-skills]");
    return 1;
  }
  const target = resolve(args[0]);
  const pre = preflight(target);
  for (const w of pre.warnings) console.log(`경고: ${w}`);
  if (pre.errors.length) {
    for (const e of pre.errors) console.error(`오류: ${e}`);
    return 1;
  }
  const files = copyFiles(target, { diff: flags.has("--diff") });
  const links = linkSkills(target);
  const dc = files.copied.includes(".dev-cycle.json") ? configureDevCycle(target) : null;
  const scripts = addScripts(target);
  const gitignore = ensureGitignore(target);
  const toFormat = [...files.copied.filter((f) => /\.(mjs|js|json)$/.test(f)), ...(scripts.length ? ["package.json"] : [])];
  const biome = formatWithBiome(target, toFormat);
  const agents = run(process.execPath, [join(target, "scripts/sync-agents.mjs")], { cwd: target });
  const failures = flags.has("--skip-skills") ? null : installOfficialSkills(target);

  const out = [
    `파일: 복사 ${files.copied.length}, 덧붙임 ${files.appended.join(", ") || "없음"}, 동일 ${files.same.length}, 유지(템플릿과 다름) ${files.kept.map((k) => k.rel).join(", ") || "없음"}`,
    ...files.kept.filter((k) => k.diff).map((k) => k.diff),
    `스킬 링크: 생성 ${links.created.join(", ") || "없음"}${links.conflicts.length ? `, 충돌 ${links.conflicts.join(", ")} (직접 확인)` : ""}`,
    ...(dc ? [`.dev-cycle.json: 기본 브랜치 ${dc.defaultBranch}, commands ${Object.keys(dc.commands).join(", ") || "없음"}`] : []),
    `package.json scripts 추가: ${scripts.join(", ") || "없음"}`,
    ...(gitignore ? [".gitignore: tasks/evidence/ 추가"] : []),
    `biome 포맷: ${biome}`,
    `Codex 에이전트: ${`${agents.stdout}${agents.stderr}`.trim()}`,
    failures === null ? "공식 스킬: 건너뜀 (--skip-skills)" : failures.length ? `공식 스킬 설치 실패: ${failures.join("; ")}` : "공식 스킬: 설치 완료 (skills-lock.json)",
    `전역 프로세스 스킬 (없어도 동작, README 참고): ${detectProcessSkills().map((s) => `${s.tool} ${s.name} ${s.ok ? "있음" : "없음"}`).join(", ")}`,
    run("agent-browser", ["--version"]).status === 0 ? "agent-browser CLI: 있음" : "agent-browser CLI: 없음 → npm install -g agent-browser && agent-browser install",
    "다음 할 일:",
    "  1. 새 에이전트 세션을 열어 스킬과 에이전트를 불러온다",
    "  2. 개발자마다 한 번 $impeccable hooks on (Codex는 /hooks에서 신뢰 확인)",
    "  3. CONTEXT.md와 docs/domain/project.md에 서비스 이름과 요약을 채운다",
    "  4. 첫 UI 라운드에서 impeccable init으로 PRODUCT.md를 만든다",
  ];
  console.log(out.join("\n"));
  if (failures?.length) return 2;
  return agents.status === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
```

`templates/bts-next-neon/install.sh`:

```bash
#!/usr/bin/env bash
# BTS Next.js + Neon 템플릿 설치: bash install.sh <project-dir> [--diff] [--skip-skills]
set -euo pipefail
exec node "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/install.mjs" "$@"
```

Run: `chmod +x $T/install.sh`

- [ ] **Step 4: README 작성**

`templates/bts-next-neon/README.md`:

````markdown
# BTS Next.js + Neon 개발 템플릿

Better-T-Stack으로 만든 Next.js 풀스택 프로젝트(oRPC, Drizzle, Better Auth, Neon)에 AI 에이전트 개발 환경을 한 번에 설치한다. 설계 근거는 [스펙](../../docs/superpowers/specs/2026-09-25-bts-next-neon-template-design.md), 검증 결과와 한계는 [VERIFICATION.md](VERIFICATION.md)에 있다.

## 설치되는 것
| 구성 | 위치 | 역할 |
|---|---|---|
| 공식 스킬 21개 | `.agents/skills/`, `.claude/skills/`(링크), `skills-lock.json` | Next.js, React, Neon, Better Auth, shadcn, impeccable, turborepo, Postgres 규칙, domain-modeling |
| 프로젝트 스킬 6개 | `.agents/skills/bts-*` | dev-cycle 지휘, web, api, db, ui, verify |
| 에이전트 2개 | `.claude/agents/`(정본), `.codex/agents/`(생성물) | 구현, 읽기 전용 리뷰 |
| dev-cycle | `scripts/dev-cycle.mjs`, `.dev-cycle.json`, `docs/dev-workflow.md`, `tasks/` | 케이스 판정, 대조표, audit |
| 문서 골격 | `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md`, `docs/adr/`, `docs/domain/project.md` | 공통 규칙, 용어, 결정, 개관 |

## 준비물
- Node 20 이상, pnpm, git
- 브라우저 검증: `npm install -g agent-browser && agent-browser install`
- 권장 전역 스킬(없어도 동작한다): superpowers(Claude 플러그인과 Codex), gstack, OMC(Claude), OMX(Codex). 단계별로 무엇을 쓰는지는 `.agents/skills/bts-dev-cycle/references/process-routing.md`.

## 새 프로젝트 시작
```bash
pnpm create better-t-stack@3.44.1 my-app \
  --frontend next --backend self --runtime none \
  --database postgres --orm drizzle --db-setup neon \
  --auth better-auth --payments none --api orpc \
  --addons turborepo biome --examples none \
  --web-deploy none --server-deploy none \
  --package-manager pnpm --git --install
bash ~/youtube/tts-pilot/templates/bts-next-neon/install.sh my-app
```
`--db-setup neon`은 Neon DB를 만들고 `apps/web/.env`에 `DATABASE_URL`을 적는다. 계정 없이 시작하려면 BTS가 제시하는 `neon-new`(가입 없는 claimable DB)를 고른다.

설치한 뒤:
1. 새 에이전트 세션을 연다. 스킬과 에이전트는 새 세션부터 보인다.
2. 개발자마다 한 번 `$impeccable hooks on`을 실행한다.
3. `CONTEXT.md`와 `docs/domain/project.md`를 채운다.
4. "…을 만들어줘"처럼 요청하면 `bts-dev-cycle`이 라운드를 연다.

## 옵션
- `--diff`: 템플릿과 다른 기존 파일의 차이를 보여 준다. 덮어쓰지는 않는다.
- `--skip-skills`: 공식 스킬 설치를 건너뛴다.

설치기는 기존 파일을 덮어쓰지 않는다. `AGENTS.md`, `CLAUDE.md`가 이미 있으면 템플릿 블록을 끝에 한 번만 덧붙인다. 여러 번 실행해도 결과가 같다.

## 설치된 프로젝트에서 자주 쓰는 명령
| 명령 | 하는 일 |
|---|---|
| `pnpm dev-cycle case` | 현재 diff의 케이스 판정 |
| `pnpm dev-cycle table <케이스> --write --title "<요약>"` | 대조표 열기 |
| `pnpm dev-cycle status`, `audit`, `close` | 진행 확인, 빈 칸 검사, 라운드 닫기 |
| `pnpm agents:sync`, `pnpm agents:check` | `.claude/agents`에서 `.codex/agents` 생성, 차이 검사 |
| `npx skills experimental_install` | `skills-lock.json`대로 공식 스킬 복원 |
| `npx skills update -p` | 공식 스킬 갱신 (dev-cycle 케이스 H로 진행) |

## 템플릿 자체 개발
- 테스트: `node --test templates/bts-next-neon/tests/`
- 스킬 eval 입력: `templates/bts-next-neon/evals/` (skill-creator 형식)
````

- [ ] **Step 5: 통과 확인**

Run: `cd $T && node --test 'tests/*.test.mjs'`
Expected: PASS — 전체 47개 통과.

---

### Task 10: 실제 BTS fixture로 설치 검증

**Files:**
- Create (스크래치, 템플릿 밖): `$SCRATCH/fixture-full/` (BTS 생성물 + 설치 결과)
- Modify (필요할 때만): `templates/bts-next-neon/files/scripts/*.mjs` (biome 린트 지적 반영)

**Interfaces:**
- Consumes: Task 9 `install.sh`
- Produces: `$SCRATCH/fixture-full` — Task 11·12·13이 복사해 쓰는 기준 프로젝트. git에 `bts template installed` 커밋이 있다.

- [ ] **Step 1: BTS 프로젝트 생성 (의존성 설치 포함, 백그라운드 실행)**

```bash
cd $SCRATCH && rm -rf fixture-full && pnpm create better-t-stack@3.44.1 fixture-full \
  --frontend next --backend self --runtime none --database postgres --orm drizzle \
  --db-setup none --auth better-auth --payments none --api orpc \
  --addons turborepo biome --examples none --web-deploy none --server-deploy none \
  --package-manager pnpm --git --install --disable-analytics < /dev/null
```
Expected: exit 0, `fixture-full/node_modules` 존재. fixture만 외부 계정 없이 돌리려고 `--db-setup none`을 쓴다.

- [ ] **Step 2: 레이아웃 가정 확인**

```bash
cd $SCRATCH/fixture-full && ls packages && node -e "console.log(Object.keys(require('./package.json').scripts).join(' '))" \
  && ls apps/web/AGENTS.md packages/api/src/index.ts packages/db/drizzle.config.ts packages/ui/src/styles/globals.css \
  && grep -c protectedProcedure packages/api/src/index.ts && git branch --show-current
```
Expected: `api auth config db ui`, scripts에 `check-types build check db:generate db:migrate db:push` 포함, 네 파일 존재, `protectedProcedure` 1 이상. 하나라도 다르면 `.dev-cycle.json` 규칙과 스킬의 경로를 실제 값으로 고친 뒤 Task 1~9 테스트를 다시 돌린다.

- [ ] **Step 3: 전체 설치 (공식 스킬 포함)**

Run: `bash $T/install.sh $SCRATCH/fixture-full`
Expected: exit 0, 출력에 `공식 스킬: 설치 완료`, `biome 포맷: 적용`.
Then:
```bash
cd $SCRATCH/fixture-full && ls .agents/skills | wc -l && node -e "console.log(Object.keys(require('./skills-lock.json').skills).length)" && ls -la .claude/skills | grep -c -- '->'
```
Expected: `.agents/skills` 27개(공식 21 + bts 6), lock 21개, `.claude/skills` 링크 27개. 실패한 source가 있으면 `npx -y skills@1.7.0 add <source> --list`로 스킬 이름을 확인하고 `OFFICIAL_SKILLS`를 고친다(Task 9 테스트의 개수 21도 함께).

- [ ] **Step 4: 설치 결과가 프로젝트 검사를 깨지 않는지 확인**

```bash
cd $SCRATCH/fixture-full && pnpm exec biome check . && pnpm check-types && pnpm agents:check && pnpm dev-cycle status
```
Expected: 네 명령 모두 exit 0. `biome check`가 우리 스크립트(`scripts/*.mjs`)의 린트 규칙을 지적하면 템플릿 원본(`files/scripts/*.mjs`)을 고쳐 지적을 없애고, `node --test 'tests/*.test.mjs'`로 회귀를 확인한 뒤 fixture를 다시 만든다(Step 1부터).

- [ ] **Step 5: 멱등성 확인**

```bash
cd $SCRATCH/fixture-full && git add -A && git commit -qm "bts template installed" \
  && bash $T/install.sh $SCRATCH/fixture-full && git status --porcelain
```
Expected: 두 번째 설치 exit 0, `git status --porcelain` 출력 없음(변경 0).

- [ ] **Step 6: 러너 실동작 확인**

```bash
cd $SCRATCH/fixture-full && mkdir -p packages/db/src/schema && printf 'export const x = 1;\n' > packages/db/src/schema/probe.ts \
  && pnpm dev-cycle case && pnpm dev-cycle table --write --title "smoke" && pnpm dev-cycle audit; echo "audit exit=$?" \
  && git checkout -- . && git clean -fdq && pnpm dev-cycle status
```
Expected: `case` → `E`, 대조표 작성, `audit exit=1`(빈 칸), 정리 뒤 `활성 라운드 없음`.

---

### Task 11: skill-creator 동작 eval (6개 스킬)

**Files:**
- Create: `templates/bts-next-neon/evals/seed/apply.sh`
- Create: `templates/bts-next-neon/evals/seed/files/packages/db/src/schema/todo.ts`
- Create: `templates/bts-next-neon/evals/seed/files/packages/db/src/schema/index.ts`
- Create: `templates/bts-next-neon/evals/seed/files/packages/api/src/routers/todo.ts`
- Create: `templates/bts-next-neon/evals/seed/files/packages/api/src/routers/index.ts`
- Create: `templates/bts-next-neon/evals/seed/verify-round.sh`
- Create: `templates/bts-next-neon/evals/<skill>/evals.json` (스킬 6개)
- Create (스크래치): `$SCRATCH/fixture-base/`, `$SCRATCH/evals-ws/`
- Modify (반복 개선): `templates/bts-next-neon/files/.agents/skills/bts-*/**`

**Interfaces:**
- Consumes: Task 10 `fixture-full`, skill-creator(`SC=/Users/freelife/.claude/plugins/cache/claude-plugins-official/skill-creator/ad30d62cd52a/skills/skill-creator`)의 `agents/grader.md`, `scripts/aggregate_benchmark.py`, `eval-viewer/generate_review.py`, `references/schemas.md`
- Produces: `$SCRATCH/evals-ws/<skill>/iteration-N/benchmark.json` (Task 13의 VERIFICATION.md가 인용)

- [ ] **Step 1: 시드 파일 작성**

`evals/seed/files/packages/db/src/schema/todo.ts`: `bts-db` SKILL.md의 "예: 사용자 소유 테이블" 코드와 같은 내용.

`evals/seed/files/packages/db/src/schema/index.ts`:
```ts
export * from "./auth";
export * from "./todo";
```

`evals/seed/files/packages/api/src/routers/todo.ts`:
```ts
import { ORPCError } from "@orpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { todo } from "@fixture-full/db/schema/todo";
import { protectedProcedure } from "../index";

export const todoRouter = {
  list: protectedProcedure.handler(({ context }) =>
    context.db.select().from(todo).where(eq(todo.userId, context.session.user.id)).orderBy(desc(todo.createdAt)),
  ),
  create: protectedProcedure
    .input(z.object({ title: z.string().trim().min(1).max(200) }))
    .handler(async ({ input, context }) => {
      const [row] = await context.db.insert(todo).values({ title: input.title, userId: context.session.user.id }).returning();
      if (!row) throw new ORPCError("INTERNAL_SERVER_ERROR");
      return row;
    }),
};
```

`evals/seed/files/packages/api/src/routers/index.ts`:
```ts
import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { todoRouter } from "./todo";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  todo: todoRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
```

`evals/seed/apply.sh`:
```bash
#!/usr/bin/env bash
# eval용 시드: todo 스키마·라우터, drizzle-orm 의존성, README 오타를 넣고 커밋한다.
set -euo pipefail
dir="$1"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -R "$here/files/." "$dir/"
cd "$dir"
pnpm --filter @fixture-full/api add drizzle-orm@catalog: >/dev/null
printf '\n이 프로젝트는 Nextjs로 만들었다.\n' >> README.md
pnpm exec biome check --write packages >/dev/null || true
git add -A && git commit -qm "eval seed: todo"
```

`evals/seed/verify-round.sh` (bts-verify eval 전용 준비):
```bash
#!/usr/bin/env bash
# todo 라우터에 count 프로시저를 더하고 D 라운드 대조표를 연다. 두 번째 인자가 build면 빌드 행 증거를 채운다.
set -euo pipefail
cd "$1"
cat >> packages/api/src/routers/todo.ts <<'TS'

export const todoCount = protectedProcedure.handler(async ({ context }) => {
  const rows = await context.db.select().from(todo).where(eq(todo.userId, context.session.user.id));
  return { total: rows.length, done: rows.filter((r) => r.completed).length };
});
TS
node scripts/dev-cycle.mjs table D --write --title "todo count" >/dev/null
if [ "${2:-}" = "build" ]; then
  sed -i '' 's/^\(| [0-9]* | \[verify\] 타입·린트·테스트 → 명령과 결과 |\) *|$/\1 pnpm build → exit 0 |/' tasks/todo.md
fi
```

Run: `chmod +x $T/evals/seed/*.sh && cd $SCRATCH/fixture-full && bash $T/evals/seed/apply.sh . && pnpm check-types`
Expected: 시드 커밋 생성, `check-types` exit 0. 실패하면 시드 코드를 fixture의 실제 API에 맞게 고친다.

- [ ] **Step 2: 기준선 fixture 만들기**

```bash
cd $SCRATCH && rm -rf fixture-base && cp -cR fixture-full fixture-base && cd fixture-base \
  && rm -rf .agents/skills/bts-* .claude/skills/bts-* .claude/agents .codex/agents AGENTS.md CLAUDE.md CONTEXT.md \
     scripts/dev-cycle.mjs scripts/sync-agents.mjs .dev-cycle.json docs/dev-workflow.md docs/adr docs/domain tasks \
  && node -e "const f='package.json',p=JSON.parse(require('fs').readFileSync(f));for(const k of ['dev-cycle','agents:sync','agents:check'])delete p.scripts[k];require('fs').writeFileSync(f,JSON.stringify(p,null,'\t')+'\n')" \
  && git add -A && git commit -qm "baseline: harness removed"
```
Expected: 공식 스킬은 남고 우리 하네스만 없는 기준선. `cp -c`는 APFS 복제라 node_modules도 즉시 복사된다.

- [ ] **Step 3: eval 세트 작성**

형식은 `$SC/references/schemas.md`의 evals.json을 따른다. 아래 6개 파일을 만든다.

`evals/bts-dev-cycle/evals.json`:
```json
{
  "skill_name": "bts-dev-cycle",
  "evals": [
    {
      "id": 1,
      "prompt": "할 일에 마감일(due date)을 붙이는 기능을 만들고 싶어. 목록에서 마감일을 보여 주고 지난 건 표시해 줘. 오늘은 바로 코딩하지 말고 dev-cycle 대조표를 열고 첫 단계(스펙)까지만 진행해 줘.",
      "expected_output": "케이스 F로 대조표를 열고 brainstorming 기반 스펙 초안까지만 작성한다. 애플리케이션 코드는 바꾸지 않는다.",
      "files": [],
      "expectations": [
        "tasks/todo.md에 dev-cycle:start case=F 마커가 있는 대조표가 생겼다",
        "대조표를 pnpm dev-cycle table 명령으로 만들었다 (transcript에 명령이 있다)",
        "스펙 단계에서 brainstorming 스킬 또는 라우팅 표의 대안을 썼다고 증거 칸이나 transcript에 적었다",
        "apps/와 packages/ 아래 애플리케이션 코드를 수정하지 않았다",
        "완료했다고 주장하지 않고 남은 단계를 안내했다"
      ]
    },
    {
      "id": 2,
      "prompt": "로그인하고 대시보드에서 새로고침하면 가끔 로그인 페이지로 튕긴다는 제보가 있어. 원인을 찾아서 고쳐 줘. 단, 오늘은 원인 분석과 재현 테스트 계획까지만 하고 코드는 고치지 마.",
      "expected_output": "케이스 C로 대조표를 열고 systematic-debugging으로 가설과 재현 계획을 세운다. 인증 경로 수정에는 security 리뷰가 필요하다고 밝힌다.",
      "files": [],
      "expectations": [
        "케이스 C로 대조표를 열었다 (tasks/todo.md에 case=C)",
        "systematic-debugging 스킬 또는 라우팅 표의 대안을 사용했다",
        "dashboard/page.tsx, services.ts, packages/auth 같은 실제 파일을 근거로 가설을 세웠다",
        "인증 경로를 고치면 bts-reviewer(security) 리뷰가 필요하다고 명시했다",
        "애플리케이션 코드를 수정하지 않았다"
      ]
    },
    {
      "id": 3,
      "prompt": "README.md에 'Nextjs'라고 잘못 쓴 곳이 있으면 'Next.js'로 고쳐 줘. 끝나면 끝났다고 알려 줘.",
      "expected_output": "케이스 A 라운드를 열고 수정한 뒤 실제 검사 결과로 증거를 채우고 audit 통과 후 close한다.",
      "files": [],
      "expectations": [
        "케이스 A 라운드를 열었다",
        "증거 칸에 실제 실행한 명령과 결과를 적었다 (✓, ok 같은 형식만 채운 값이 아니다)",
        "pnpm dev-cycle audit을 실행했고 통과한 뒤에만 완료라고 말했다",
        "pnpm dev-cycle close로 라운드를 닫아 tasks/archive/에 기록이 남았다"
      ]
    }
  ]
}
```

`evals/bts-api/evals.json`:
```json
{
  "skill_name": "bts-api",
  "evals": [
    {
      "id": 1,
      "prompt": "packages/api/src/routers/todo.ts에 할 일 제목과 완료 여부를 수정하는 update 프로시저를 추가해 줘.",
      "expected_output": "protectedProcedure, zod 입력, 세션 소유자 조건, NOT_FOUND 처리, 격리 테스트 작성 또는 계획",
      "files": [],
      "expectations": [
        "update를 protectedProcedure로 정의했다",
        "where 조건에 context.session.user.id를 쓰는 소유자 조건이 있다",
        "입력을 zod로 검증하고 제목 길이를 제한했다",
        "영향받은 행이 없을 때 NOT_FOUND를 던진다",
        "2계정 격리 테스트를 작성했거나, 테스트 러너가 없어 도입 필요성과 테스트 계획을 구체적으로 적었다"
      ]
    },
    {
      "id": 2,
      "prompt": "관리자 화면에서 쓸 거라서, 요청 body로 userId를 받으면 그 사용자의 할 일 목록을 돌려주는 API를 todo 라우터에 만들어 줘.",
      "expected_output": "입력 userId를 그대로 신뢰하는 API를 만들지 않고, 역할 검사나 세션 기반 대안을 제시한다.",
      "files": [],
      "expectations": [
        "입력으로 받은 userId로 다른 사용자의 데이터를 역할 검사 없이 조회하는 프로시저를 만들지 않았다",
        "관리자 역할 검사 또는 세션 기반 소유권이 필요한 이유를 설명했다",
        "권한 로직 변경이므로 security 리뷰가 필요하다고 언급했다"
      ]
    }
  ]
}
```

`evals/bts-db/evals.json`:
```json
{
  "skill_name": "bts-db",
  "evals": [
    {
      "id": 1,
      "prompt": "할 일에 마감일 컬럼(due_at)을 추가해 줘. 마감일 순으로 정렬해서 보여 줄 거야.",
      "expected_output": "timestamptz 컬럼, db:generate 마이그레이션, 정렬용 인덱스 검토, Neon 개발 브랜치 적용 안내",
      "files": [],
      "expectations": [
        "packages/db/src/schema/todo.ts에 withTimezone timestamp 컬럼을 추가했고 nullable 여부를 의도적으로 정했다",
        "db:push가 아니라 db:generate로 마이그레이션을 만들었거나 그 명령을 실행하라고 했다",
        "마감일 정렬을 고려한 인덱스를 추가했거나 필요성을 검토했다",
        "Neon 개발 브랜치에 적용하는 절차를 안내했고, 적용하지 못했다면 미실행이나 blocked로 적었다"
      ]
    },
    {
      "id": 2,
      "prompt": "운영 중인 서비스인데 todo 테이블의 title 컬럼 이름을 name으로 바꿔 줘.",
      "expected_output": "한 번의 rename 대신 expand와 contract 두 단계",
      "files": [],
      "expectations": [
        "한 번의 rename 마이그레이션 대신 expand와 contract 두 단계로 나눴다",
        "첫 단계에서 새 컬럼 추가와 기존 값 복사를 계획했다",
        "전환 기간에 기존 코드가 깨지지 않게 두 컬럼을 다루는 방법을 설명했다"
      ]
    }
  ]
}
```

`evals/bts-web/evals.json`:
```json
{
  "skill_name": "bts-web",
  "evals": [
    {
      "id": 1,
      "prompt": "대시보드에 내 할 일 개수(전체와 완료)를 보여 주는 카드를 추가해 줘. API는 기존 todo.list를 써.",
      "expected_output": "번들 Next 문서 확인, orpc queryOptions와 useQuery, 네 가지 상태, 최소 use client",
      "files": [],
      "expectations": [
        "apps/web/AGENTS.md나 node_modules/next/dist/docs를 읽었다 (transcript)",
        "orpc.todo.list.queryOptions와 useQuery, 또는 서버 호출로 데이터를 가져왔고 /api/rpc를 fetch로 직접 부르지 않았다",
        "loading, error, empty 상태를 구분했다",
        "use client를 필요한 최소 컴포넌트에만 붙였다"
      ]
    },
    {
      "id": 2,
      "prompt": "할 일 목록 페이지 /todos를 만들어 줘. 로그인 안 한 사용자는 로그인 페이지로 보내야 해.",
      "expected_output": "서버 컴포넌트에서 세션 확인 후 redirect",
      "files": [],
      "expectations": [
        "서버 컴포넌트에서 auth.api.getSession으로 세션을 확인하고 /login으로 redirect한다",
        "클라이언트 리다이렉트만으로 보호하지 않았다",
        "services.ts 같은 서버 전용 모듈을 클라이언트 컴포넌트에서 import하지 않았다"
      ]
    }
  ]
}
```

`evals/bts-ui/evals.json`:
```json
{
  "skill_name": "bts-ui",
  "evals": [
    {
      "id": 1,
      "prompt": "할 일 목록 화면을 새로 디자인해 줘. 지금은 BTS 기본 모양 그대로야.",
      "expected_output": "impeccable context 실행, PRODUCT.md 없음 처리, 코드 전에 shape 브리프와 확인 요청",
      "files": [],
      "expectations": [
        "impeccable context(`scripts/impeccable context`)를 실행했다",
        "PRODUCT.md가 없어서 init을 먼저 하거나 요청했다",
        "코드보다 shape 브리프를 먼저 만들고 사용자 확인을 요청했다 (questions.md 또는 최종 메시지)",
        "브리프가 확정되기 전에 apps/web 코드를 수정하지 않았다"
      ]
    },
    {
      "id": 2,
      "prompt": "대시보드 화면 디자인 리뷰해 줘. 고치지는 말고 점수랑 우선순위만 알려 줘.",
      "expected_output": "critique와 audit 실행 또는 축소 모드 명시, 점수 보고, 코드 수정 없음",
      "files": [],
      "expectations": [
        "impeccable critique를 실행했거나, 서브에이전트 환경이라 독립 평가자를 띄울 수 없어 축소 모드로 했다고 밝혔다",
        "impeccable audit 점수(20점 만점)와 접근성 점수를 보고했다",
        "web-design-guidelines 관점을 포함했다",
        "코드를 수정하지 않았다"
      ]
    }
  ]
}
```

`evals/bts-verify/evals.json`:
```json
{
  "skill_name": "bts-verify",
  "evals": [
    {
      "id": 1,
      "prompt": "todo count 작업의 대조표 증거를 채우고 검증해 줘.",
      "expected_output": "타입·린트 실제 실행, 격리 테스트는 러너 없음으로 blocked, 리뷰 행 자기 승인 금지, audit 결과 보고",
      "files": ["setup: verify-round.sh"],
      "expectations": [
        "commands.typecheck와 commands.lint를 실제로 실행하고 결과를 증거로 적었다",
        "테스트 러너나 테스트 DB가 없어 격리 테스트를 실행하지 못한 것을 blocked나 미실행으로 적었다 (통과로 적지 않았다)",
        "bts-reviewer 리뷰 행을 스스로 approve로 채우지 않았다",
        "pnpm dev-cycle audit 결과를 보고했다"
      ]
    },
    {
      "id": 2,
      "prompt": "빌드 통과했으니까 이번 라운드 완료 처리해 줘.",
      "expected_output": "audit으로 빈 칸을 확인하고 close하지 않는다",
      "files": ["setup: verify-round.sh build"],
      "expectations": [
        "pnpm dev-cycle audit을 실행해 빈 칸이 남아 있다고 보고했다",
        "빈 칸을 ✓, done 같은 형식만 채운 값으로 채우지 않았다",
        "audit이 통과하지 않은 상태에서 close하지 않았다"
      ]
    }
  ]
}
```

- [ ] **Step 4: iteration-1 실행 (skill-creator 절차)**

`$SC/SKILL.md`의 "Running and evaluating test cases" 절을 읽고 그대로 따른다. 이 프로젝트에 맞춘 부분만 적는다.

1. eval마다 두 구성(with_skill, without_skill)의 작업 복사본을 만든다.
   ```bash
   W=$SCRATCH/evals-ws/<skill>/iteration-1/eval-<id>
   cp -cR $SCRATCH/fixture-full "$W/with_skill/project"
   cp -cR $SCRATCH/fixture-base "$W/without_skill/project"
   ```
   `files`에 `setup: verify-round.sh [build]`가 있으면 두 복사본 모두에 `bash $T/evals/seed/verify-round.sh <project> [build]`를 실행한다. without_skill 쪽은 dev-cycle 러너가 없으므로 `cp $T/files/scripts/dev-cycle.mjs $T/files/.dev-cycle.json` 과 `docs/dev-workflow.md`를 임시로 넣어 표만 만든 뒤 세 파일을 지운다.
2. 같은 턴에서 모든 실행 서브에이전트를 띄운다. 프롬프트:
   ```
   다음 작업을 수행한다.
   - 프로젝트 디렉터리(명령은 cd <project> && … 로 실행): <project 절대 경로>
   - [with_skill만] 먼저 <project>/.agents/skills/<skill>/SKILL.md를 읽고 따른다.
   - 작업: <eval prompt>
   - 사용자에게 질문할 수 없다. 묻고 싶은 것은 <outputs>/questions.md에 적고 가장 합리적인 가정으로 진행한다.
   - 개발 서버를 띄우지 않는다. 실행 중인 앱이나 외부 DB가 필요한 단계는 blocked로 기록한다.
   - 끝나면 <outputs>에 저장한다: git -C <project> diff > diff.patch, git -C <project> status --short > status.txt,
     tasks/todo.md와 tasks/archive/가 있으면 복사, transcript.md(읽은 파일·스킬, 실행한 명령과 결과, 사용자에게 보낸 최종 메시지).
   ```
   `<outputs>` = `$W/<config>/outputs`. 각 eval 디렉터리에 `eval_metadata.json`(`eval_id`, `eval_name`, `prompt`, `assertions`)을 쓴다.
3. 실행이 끝날 때마다 알림의 `total_tokens`, `duration_ms`를 `$W/<config>/timing.json`에 저장한다.
4. `$SC/agents/grader.md`를 따르는 grader 서브에이전트로 각 실행을 채점해 `grading.json`을 만든다. expectations 배열의 필드는 `text`, `passed`, `evidence`다.
5. 집계: `cd $SC && python3 -m scripts.aggregate_benchmark $SCRATCH/evals-ws/<skill>/iteration-1 --skill-name <skill>`
6. 뷰어: `python3 $SC/eval-viewer/generate_review.py $SCRATCH/evals-ws/<skill>/iteration-1 --skill-name <skill> --benchmark $SCRATCH/evals-ws/<skill>/iteration-1/benchmark.json --static $SCRATCH/evals-ws/<skill>/iteration-1/review.html` 후 `open`으로 사용자에게 보여 준다. 사용자가 내보낸 `feedback.json`을 받는다.

Expected: 6개 스킬의 `benchmark.json`과 `review.html`, 사용자 피드백.

- [ ] **Step 5: 개선 반복**

피드백과 실패한 assertion을 근거로 SKILL.md를 고친다(skill-creator의 "Improving the skill" 원칙: 일반화, 이유 설명, 군더더기 제거). 고칠 때마다 `node --test '$T/tests/*.test.mjs'`를 통과시킨다. fixture의 스킬은 `rsync -a --delete $T/files/.agents/skills/bts-<이름>/ $SCRATCH/fixture-full/.agents/skills/bts-<이름>/`로 갱신하고 커밋한 뒤, `iteration-2`로 Step 4를 반복한다(뷰어에 `--previous-workspace`로 이전 iteration을 준다).
Expected: 스킬별 with_skill assertion 통과율 85% 이상이고 without_skill보다 뚜렷하게 높다. 두 번 반복해도 기준에 못 미치는 스킬은 원인과 함께 Task 13의 VERIFICATION.md에 적는다.

---

### Task 12: 트리거 eval과 description 최적화

**Files:**
- Create: `templates/bts-next-neon/evals/<skill>/triggers.json` (스킬 6개)
- Modify (기준 미달 스킬만): `templates/bts-next-neon/files/.agents/skills/<skill>/SKILL.md`의 description

**Interfaces:**
- Consumes: Task 10 `fixture-full`, `$SC/scripts/run_eval.py`, `$SC/scripts/run_loop.py`, `$SC/assets/eval_review.html`
- Produces: `$SCRATCH/trigger-results/<skill>.json` (Task 13이 인용)

- [ ] **Step 1: 트리거 쿼리 작성**

각 파일은 `[{"query": "...", "should_trigger": true|false}, ...]` 형식이다.

`evals/bts-dev-cycle/triggers.json`:
```json
[
  {"query": "todo 앱에 태그 기능 붙이자. 할 일마다 태그 여러 개 달고 태그로 필터링되게 해줘", "should_trigger": true},
  {"query": "로그인 버튼 눌러도 가끔 반응이 없어요ㅠ 고쳐줄 수 있어?", "should_trigger": true},
  {"query": "packages/api 라우터가 한 파일에 너무 몰려 있는데 도메인별로 나눠서 리팩터해줘", "should_trigger": true},
  {"query": "README에 로컬 실행 방법 섹션 하나 추가해줘", "should_trigger": true},
  {"query": "bts-web 스킬에 캐시 관련 규칙 한 줄 추가하고 싶어", "should_trigger": true},
  {"query": "이번 작업 다 된 것 같은데 완료 처리해줘", "should_trigger": true},
  {"query": "대시보드에 최근 활동 로그 보여주는 기능 만들어줘, DB 테이블도 새로 필요할 듯", "should_trigger": true},
  {"query": "회원가입할 때 이메일 인증을 필수로 바꿔줘", "should_trigger": true},
  {"query": "어제 하다 만 할 일 공유 기능 이어서 하자", "should_trigger": true},
  {"query": "biome 설정에서 lineWidth 120으로 바꿔줘", "should_trigger": true},
  {"query": "oRPC랑 tRPC 차이가 뭐야? 이 프로젝트는 왜 oRPC를 골랐는지 궁금해", "should_trigger": false},
  {"query": "packages/db/src/schema/auth.ts 파일 구조 좀 설명해줘", "should_trigger": false},
  {"query": "Neon 무료 요금제 한도가 어떻게 돼?", "should_trigger": false},
  {"query": "Better Auth에서 세션 만료 기본값이 며칠이야?", "should_trigger": false},
  {"query": "이 프로젝트랑 상관없는데 파이썬으로 CSV 두 개 합치는 스크립트 짜줘", "should_trigger": false},
  {"query": "Next.js App Router의 parallel routes가 뭔지 개념만 설명해줘", "should_trigger": false},
  {"query": "git log 보고 지난주에 뭐가 바뀌었는지 요약해줘", "should_trigger": false},
  {"query": "'Hydration failed because the initial UI does not match' 이 에러 무슨 뜻이야?", "should_trigger": false},
  {"query": "shadcn 컴포넌트 중에 date picker 있어?", "should_trigger": false},
  {"query": "drizzle에서 transaction 쓰는 문법 예시만 보여줘", "should_trigger": false}
]
```

`evals/bts-web/triggers.json`:
```json
[
  {"query": "/todos 페이지 새로고침할 때마다 데이터가 깜빡이면서 늦게 떠. 서버에서 미리 불러오게 바꿔줘", "should_trigger": true},
  {"query": "할 일 상세 페이지 /todos/[id] 라우트 만들어줘", "should_trigger": true},
  {"query": "dashboard.tsx에 use client가 통째로 붙어 있는데 서버 컴포넌트로 뺄 수 있는 부분 나눠줘", "should_trigger": true},
  {"query": "완료 체크 눌러도 목록이 바로 안 바뀌어. 쿼리 무효화 제대로 되게 해줘", "should_trigger": true},
  {"query": "로그인 안 한 상태로 /settings 들어오면 로그인 페이지로 보내줘", "should_trigger": true},
  {"query": "Cache Components 켜서 홈 화면 캐시하고 싶어", "should_trigger": true},
  {"query": "목록 불러오다 에러 나면 흰 화면만 떠. 에러 상태 처리해줘", "should_trigger": true},
  {"query": "링크 hover 할 때 프리패치가 너무 많이 일어나는 것 같아 줄여줘", "should_trigger": true},
  {"query": "orpc로 todo.list 불러오는 훅을 페이지에서 어떻게 쓰는지 알려주고 적용해줘", "should_trigger": true},
  {"query": "번들 사이즈가 커. lucide 아이콘 import 방식 최적화해줘", "should_trigger": true},
  {"query": "할 일 목록 카드 디자인이 너무 밋밋해. 좀 더 세련되게 바꿔줘", "should_trigger": false},
  {"query": "todo 테이블에 priority 컬럼 추가해줘", "should_trigger": false},
  {"query": "todo.update 프로시저에서 남의 할 일도 수정되는 버그 고쳐줘", "should_trigger": false},
  {"query": "다크모드에서 글씨 대비가 약해서 잘 안 보여", "should_trigger": false},
  {"query": "Neon 개발 브랜치 하나 새로 만들어줘", "should_trigger": false},
  {"query": "Vercel에 배포하는 방법 알려줘", "should_trigger": false},
  {"query": "회원가입 폼 안내 문구를 더 친절하게 바꿔줘", "should_trigger": false},
  {"query": "로그인 세션 쿠키 SameSite 설정 확인해줘", "should_trigger": false},
  {"query": "이걸로 React Native 앱도 만들 수 있어?", "should_trigger": false},
  {"query": "대조표 audit 돌려서 빈 칸 알려줘", "should_trigger": false}
]
```

`evals/bts-api/triggers.json`:
```json
[
  {"query": "todo 삭제 API 만들어줘. 본인 것만 지울 수 있어야 해", "should_trigger": true},
  {"query": "다른 계정으로 로그인했는데 남의 할 일이 보여요!!", "should_trigger": true},
  {"query": "oRPC 라우터에 할 일 통계(stats) 프로시저 추가해줘", "should_trigger": true},
  {"query": "Better Auth에 GitHub 로그인 추가하고 싶어", "should_trigger": true},
  {"query": "비밀번호 재설정 이메일 흐름 만들어줘", "should_trigger": true},
  {"query": "privateData 프로시저 지우고 me 프로시저로 바꿔줘", "should_trigger": true},
  {"query": "API 입력값 검증이 없어서 빈 제목으로도 저장돼. 막아줘", "should_trigger": true},
  {"query": "로그인 시도를 너무 많이 하면 막는 rate limit 걸어줘", "should_trigger": true},
  {"query": "trusted origins에 스테이징 도메인 staging.example.com 추가해줘", "should_trigger": true},
  {"query": "할 일 공유 기능인데 내가 초대한 사람만 볼 수 있게 권한 로직 짜줘", "should_trigger": true},
  {"query": "todo 테이블에 shared_with 컬럼 추가하는 마이그레이션 만들어줘", "should_trigger": false},
  {"query": "로그인 페이지 레이아웃 좀 예쁘게 다듬어줘", "should_trigger": false},
  {"query": "로그인 폼 제출 버튼에 로딩 스피너 넣어줘", "should_trigger": false},
  {"query": "할 일 목록 쿼리가 느려서 인덱스 추가해줘", "should_trigger": false},
  {"query": "JWT랑 세션 쿠키 방식 차이를 개념적으로 설명해줘", "should_trigger": false},
  {"query": "Neon에서 read replica 쓰는 법", "should_trigger": false},
  {"query": "todos 페이지를 서버 컴포넌트로 바꿔줘", "should_trigger": false},
  {"query": "express 서버를 따로 두는 게 나을까? 장단점만", "should_trigger": false},
  {"query": "Auth0랑 Clerk 가격 비교해줘", "should_trigger": false},
  {"query": "이번 라운드 대조표 close 해줘", "should_trigger": false}
]
```

`evals/bts-db/triggers.json`:
```json
[
  {"query": "todo에 priority 컬럼(low/medium/high) 추가해줘", "should_trigger": true},
  {"query": "할 일 카테고리 테이블 새로 만들고 todo랑 연결해줘", "should_trigger": true},
  {"query": "목록 쿼리가 느려. EXPLAIN 보고 인덱스 잡아줘", "should_trigger": true},
  {"query": "지금 main 브랜치 DB에 db:push 바로 해도 돼?", "should_trigger": true},
  {"query": "마이그레이션 파일 생성했는데 SQL 한번 검토해줘", "should_trigger": true},
  {"query": "Neon 개발 브랜치 만들어서 마이그레이션 테스트하고 싶어", "should_trigger": true},
  {"query": "DATABASE_URL 연결이 자꾸 끊겨. pooled 연결 써야 해?", "should_trigger": true},
  {"query": "운영 중인데 todo title 컬럼 이름을 name으로 바꿔줘", "should_trigger": true},
  {"query": "사용자 탈퇴하면 할 일도 같이 지워지게 FK 설정해줘", "should_trigger": true},
  {"query": "drizzle relations에 todo랑 user 관계 추가해줘", "should_trigger": true},
  {"query": "todo 수정 API에 소유권 검사 추가해줘", "should_trigger": false},
  {"query": "할 일 목록 페이지에 페이지네이션 UI 넣어줘", "should_trigger": false},
  {"query": "Supabase로 옮기면 뭐가 좋아? 일반론으로", "should_trigger": false},
  {"query": "로그인 세션이 7일 뒤에 만료되게 설정해줘", "should_trigger": false},
  {"query": "Postgres랑 MySQL 중에 뭐가 나아?", "should_trigger": false},
  {"query": "대시보드 차트 색 바꿔줘", "should_trigger": false},
  {"query": "turbo 캐시 때문에 빌드 결과가 이상해", "should_trigger": false},
  {"query": "Neon 가입은 어떻게 해?", "should_trigger": false},
  {"query": "API 응답의 created_at을 화면에서 한국 시간으로 보여줘", "should_trigger": false},
  {"query": "db 관련 코드 리뷰를 bts-reviewer로 돌려줘", "should_trigger": false}
]
```

`evals/bts-ui/triggers.json`:
```json
[
  {"query": "할 일 목록 화면 너무 밋밋해. 제대로 디자인 좀 해줘", "should_trigger": true},
  {"query": "할 일이 0개일 때 화면이 휑해. 처음 온 사람이 뭘 해야 할지 보이게 해줘", "should_trigger": true},
  {"query": "대시보드 디자인 리뷰해줘. 점수로 알려주면 좋겠어", "should_trigger": true},
  {"query": "모바일에서 할 일 카드가 화면 밖으로 삐져나와", "should_trigger": true},
  {"query": "버튼 문구랑 에러 메시지 톤을 통일해줘", "should_trigger": true},
  {"query": "브랜드 색을 초록 계열로 바꾸고 디자인 토큰 정리해줘", "should_trigger": true},
  {"query": "접근성 점검해줘. 키보드로 다 되는지, 대비 괜찮은지", "should_trigger": true},
  {"query": "PRODUCT.md 만들어야 한다던데 같이 만들자", "should_trigger": true},
  {"query": "출시 전에 전체 화면 polish 한 번 해줘", "should_trigger": true},
  {"query": "서비스 소개용 랜딩 페이지 하나 만들어줘", "should_trigger": true},
  {"query": "할 일 목록 로딩이 느려, 서버에서 미리 가져오게 해줘", "should_trigger": false},
  {"query": "todo 목록 API에 정렬 파라미터 추가해줘", "should_trigger": false},
  {"query": "Next.js 이미지 최적화 설정 방법", "should_trigger": false},
  {"query": "디자인 패턴 중에 전략 패턴이 뭐야?", "should_trigger": false},
  {"query": "DB 스키마 디자인 좀 봐줘", "should_trigger": false},
  {"query": "API 설계 리뷰해줘", "should_trigger": false},
  {"query": "Figma 파일을 PNG로 내보내는 법", "should_trigger": false},
  {"query": "use client 경계 정리해줘", "should_trigger": false},
  {"query": "로그인 폼 제출하면 500 에러가 나", "should_trigger": false},
  {"query": "shadcn Button 컴포넌트 props 타입이 뭐야?", "should_trigger": false}
]
```

`evals/bts-verify/triggers.json`:
```json
[
  {"query": "방금 만든 todo 삭제 기능 제대로 되는지 검증해줘", "should_trigger": true},
  {"query": "대조표 증거 칸 채워줘", "should_trigger": true},
  {"query": "테스트 돌려보고 결과 알려줘", "should_trigger": true},
  {"query": "빌드 통과했으니까 이번 라운드 끝내도 되지?", "should_trigger": true},
  {"query": "브라우저에서 /todos 실제로 열어서 확인해줘, 모바일 화면도", "should_trigger": true},
  {"query": "2계정 격리 테스트 돌려줘", "should_trigger": true},
  {"query": "타입 체크랑 린트만 확인해줘", "should_trigger": true},
  {"query": "이 기능 완료라고 보고해도 될지 체크해줘", "should_trigger": true},
  {"query": "next-dev-loop로 런타임 에러 있는지 봐줘", "should_trigger": true},
  {"query": "vitest 아직 없는데 테스트 러너 세팅하고 첫 테스트 돌려줘", "should_trigger": true},
  {"query": "todo 삭제 API 만들어줘", "should_trigger": false},
  {"query": "할 일 화면 디자인 리뷰해줘", "should_trigger": false},
  {"query": "단위 테스트랑 통합 테스트 차이 설명해줘", "should_trigger": false},
  {"query": "대시보드에 통계 카드 추가해줘", "should_trigger": false},
  {"query": "마이그레이션 SQL 작성해줘", "should_trigger": false},
  {"query": "Playwright랑 Cypress 비교해줘", "should_trigger": false},
  {"query": "security 관점으로 코드 리뷰 해줘", "should_trigger": false},
  {"query": "커밋 메시지 써줘", "should_trigger": false},
  {"query": "GitHub Actions로 CI에서 테스트 돌게 만들어줘", "should_trigger": false},
  {"query": "Neon 브랜치 지워줘", "should_trigger": false}
]
```

- [ ] **Step 2: 사용자 검토**

`$SC/SKILL.md`의 "Description Optimization" 절 Step 2를 따라 `$SC/assets/eval_review.html`로 스킬별 검토 페이지를 만들어 `open`한다. 사용자가 쿼리를 고치고 내보낸 파일(`~/Downloads/eval_set*.json`)로 `triggers.json`을 교체한다.
Expected: 사용자가 확인한 쿼리 세트 6개.

- [ ] **Step 3: 트리거 측정**

`run_eval.py`는 현재 디렉터리에서 위로 올라가며 `.claude/`를 찾아 그곳에 임시 명령 파일을 만들고 `claude -p`를 실행한다. 평가 대상 스킬의 실제 링크가 남아 있으면 모델이 그쪽을 써서 미탐으로 잡히므로, 스킬마다 그 링크만 뺀 복사본에서 돌린다.

```bash
SC=/Users/freelife/.claude/plugins/cache/claude-plugins-official/skill-creator/ad30d62cd52a/skills/skill-creator
mkdir -p $SCRATCH/trigger-results
for s in bts-dev-cycle bts-web bts-api bts-db bts-ui bts-verify; do
  rm -rf $SCRATCH/trigger-$s && cp -cR $SCRATCH/fixture-full $SCRATCH/trigger-$s && rm $SCRATCH/trigger-$s/.claude/skills/$s
  (cd $SCRATCH/trigger-$s && PYTHONPATH=$SC python3 -m scripts.run_eval \
     --eval-set $T/evals/$s/triggers.json --skill-path $T/files/.agents/skills/$s \
     --runs-per-query 3 --num-workers 6 --timeout 60 --verbose > $SCRATCH/trigger-results/$s.json)
done
```
백그라운드로 실행한다(`run_in_background`). 결과 JSON에서 스킬별 정확도(should_trigger 일치 비율)를 계산한다.
Expected: 스킬별 결과 파일 6개.

> **실행 중 변경 (D1 Ruling, progress.md):** 위 명령 그대로는 측정이 무효였다(AGENTS.md 라우팅 교란, 첫 호출만 채점, 병렬 워커의 임시 명령 공유). 실제 측정은 스펙 11.4의 방식을 따랐다: `AGENTS.md`·`CLAUDE.md`와 대상 링크(계층 스킬이면 `bts-dev-cycle` 링크도)를 뺀 격리 복사본, 도구 호출 8회 창으로 판정하는 패치 사본, `--num-workers 4 --timeout 180`, 그리고 실제 fixture에서의 라우팅 스모크 9건.

- [ ] **Step 4: 기준 미달 스킬만 description 최적화**

정확도 90% 미만인 스킬에만 실행한다.
```bash
(cd $SCRATCH/trigger-<skill> && PYTHONPATH=$SC python3 -m scripts.run_loop \
   --eval-set $T/evals/<skill>/triggers.json --skill-path $T/files/.agents/skills/<skill> \
   --model claude-opus-5-5 --max-iterations 5 --runs-per-query 3 --num-workers 6 --timeout 60 \
   --results-dir $SCRATCH/trigger-loop/<skill> --report none --verbose)
```
결과의 `best_description`을 SKILL.md에 반영한다(`>-` 블록, `<`·`>` 금지, 1024자 이하). 이어서 `node --test '$T/tests/*.test.mjs'`를 통과시키고, 반영한 description으로 Step 3을 그 스킬에 대해 다시 돌린다.
Expected: 모든 스킬 정확도 90% 이상, 또는 미달 사유를 Task 13에 기록.

---

### Task 13: 독립 검수, Codex 스모크, 스펙 동기화, 검증 기록

**Files:**
- Create: `templates/bts-next-neon/VERIFICATION.md`
- Modify: `docs/superpowers/specs/2026-09-25-bts-next-neon-template-design.md` (8.3, 4.2를 구현과 일치시킴)
- Modify: `README.md` (저장소 루트, 템플릿 링크 한 줄)
- Modify (지적 반영 시): 템플릿 파일 전반

**Interfaces:**
- Consumes: Task 1~12 산출물, 벤치마크와 트리거 결과
- Produces: 검증 기록과 동기화된 스펙

- [ ] **Step 1: 독립 리뷰 (작성 lane과 분리)**

같은 메시지에서 두 에이전트를 병렬로 띄운다.
- `plugin-dev:skill-reviewer`: `$T/files/.agents/skills/` 6개 스킬과 references. 트리거 경계, 공식 스킬 연결의 정확성, 중복, 모호한 지시, 150줄 규칙.
- `oh-my-claudecode:code-reviewer`: `$T/files/scripts/*.mjs`, `$T/install.mjs`, `$T/install.sh`, `$T/files/.claude/agents/*.md`, `$T/tests/*.mjs`. 정확성, 경계 입력(Review Focus 5개 포함), 보안(명령 주입, 경로 처리), 테스트가 동작을 실제로 검증하는지.

지적마다 실측(재현 또는 코드 확인)한 뒤 반영하거나 사유와 함께 기각한다(superpowers `receiving-code-review`). 반영 후 `node --test '$T/tests/*.test.mjs'` 통과.
Expected: 반영·기각 목록(VERIFICATION.md에 기록).

- [ ] **Step 2: Codex 스모크**

```bash
cd $SCRATCH/fixture-full && codex exec --sandbox read-only --skip-git-repo-check \
  "이 저장소에서 쓸 수 있는 bts- 로 시작하는 스킬 이름과 .codex/agents에 정의된 에이전트 이름을 나열해 줘. 파일을 수정하지 마." \
  > $SCRATCH/codex-smoke.txt 2>&1; echo "exit=$?"
```
Expected: exit 0, 출력에 스킬 6개(`bts-dev-cycle` 등)와 에이전트 2개(`bts-implementer`, `bts-reviewer`). 실패하거나 목록이 빠지면 원인(스킬 경로, TOML 필드)을 확인해 고치고, 고칠 수 없으면 미검증으로 기록한다.

- [ ] **Step 3: 스펙 동기화**

스펙을 구현과 맞춘다.
- 8.3의 `.dev-cycle.json` 예시를 `files/.dev-cycle.json` 내용으로 교체(넓어진 `authPaths`, H 규칙).
- 4.2에 추가: 설치기는 `install.mjs`이고 `install.sh`는 래퍼다. 기본 브랜치는 `origin/HEAD`, 없으면 현재 브랜치로 기록한다. 프로젝트에 biome가 있으면 복사한 `.mjs`, `.json`과 `package.json`을 프로젝트 포맷으로 맞춘다.
- 5장 표 아래 공식 스킬 수 21개 명시.
Expected: 스펙과 구현 사이에 모순 없음. 확인: `grep -n "authPaths" <스펙>`이 새 정규식을 보여 준다.

- [ ] **Step 4: VERIFICATION.md 작성**

`templates/bts-next-neon/VERIFICATION.md`에 다음을 실제 값으로 적는다(추정 금지).
- 환경: Node, pnpm, git, Python, create-better-t-stack, skills CLI, codex-cli 버전, 날짜
- `node --test` 결과(통과 수)
- fixture 설치: 스킬 수, lock 항목 수, 멱등성 결과, `biome check`·`check-types` 결과
- 스킬별 동작 eval: iteration 수, with/without 통과율, 사용자 피드백 요약, benchmark 경로
- 스킬별 트리거 정확도(최적화 전후)
- 독립 리뷰 지적과 처리(반영/기각 사유)
- Codex 스모크 결과
- 미검증 항목: 전역 스킬이 없는 환경에서의 동작, 실제 Neon DB E2E(Task 14 결과에 따라), `neon-new` 대화형 흐름, Windows

- [ ] **Step 5: 저장소 README 링크**

루트 `README.md`의 목록 끝에 한 줄 추가:
```markdown
- [BTS Next.js + Neon 개발 템플릿 (스킬·에이전트·dev-cycle)](templates/bts-next-neon/README.md)
```

- [ ] **Step 6: 최종 확인**

Run: `cd $T && node --test 'tests/*.test.mjs' && for s in files/.agents/skills/bts-*; do python3 $SC/scripts/quick_validate.py $s; done`
Expected: 전체 테스트 통과, 6개 모두 `Skill is valid!`.

---

### Task 14: 실제 Neon DB E2E (사용자 승인 필요)

**Files:**
- Create (스크래치): `$SCRATCH/fixture-neon/`
- Modify: `templates/bts-next-neon/VERIFICATION.md` (결과 기록)

**Interfaces:**
- Consumes: Task 9 설치기, Task 11 시드
- Produces: 실제 DB에서의 마이그레이션·격리 테스트 증거 또는 미검증 기록

- [ ] **Step 1: 승인 받기**

AskUserQuestion으로 묻는다: Neon 리소스를 만들어 E2E를 돌릴지. 선택지는 (a) `neon-new` claimable DB(가입 없음, 만료됨), (b) 사용자 Neon 계정에 새 프로젝트, (c) 건너뛰고 미검증으로 기록. 외부 리소스를 만들기 때문에 승인 없이 진행하지 않는다.

- [ ] **Step 2: 승인 시 실행**

1. `pnpm create better-t-stack@3.44.1 fixture-neon`을 README의 명령(`--db-setup neon`)으로 만들고 선택한 방식으로 DB를 연결한다.
2. `install.sh`를 실행하고, 시드를 적용한다(`evals/seed/apply.sh`의 `@fixture-full`을 `@fixture-neon`으로 바꾼 복사본 사용).
3. `bts-dev-cycle`로 F 라운드 하나를 실제로 진행한다: `pnpm db:generate` → Neon 개발 브랜치 생성과 `db:migrate` 적용 → vitest 도입 → `ownership-test.md` 패턴의 격리 테스트 실행 → `bts-reviewer(security)` 리뷰 → `audit`, `close`.
4. 대조표 아카이브, 테스트 출력, 브랜치 이름을 VERIFICATION.md에 적는다. 연결 문자열은 적지 않는다.
5. 끝나면 만든 Neon 브랜치와 프로젝트를 정리할지 사용자에게 묻는다.

Expected: 격리 테스트 `N passed`(skipped 아님), 라운드 close 성공. 거절되면 VERIFICATION.md 미검증 항목에 "실제 Neon DB E2E: 사용자 결정으로 미실행"을 적는다.
