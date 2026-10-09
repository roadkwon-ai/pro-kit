# bts-next-supabase 템플릿 + 프로젝트 scope 스킬 자동 설치 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supabase용 BTS 템플릿을 추가하고, 두 템플릿이 bts 스킬이 쓰는 모든 내부 스킬(도메인 스킬, superpowers, OMC, OMX, skill-creator)을 설치 대상 프로젝트 scope에 자동 설치하게 한다.

**Architecture:** 템플릿마다 `files/skills.manifest.json`(설치 목록 정본)을 두고, 두 템플릿에서 바이트가 같은 `files/scripts/skills-setup.mjs`가 그것을 읽어 설치한다. 설치기(`install.mjs`, 두 템플릿 동일)는 파일을 복사한 뒤 이 스크립트를 부르고, 팀원은 `pnpm skills:setup`으로 다시 부른다. `bts-next-supabase`는 neon 템플릿을 복사한 뒤 DB 계층 문서만 바꾸고, `tests/shared-files.test.mjs`가 공통 파일의 드리프트를 막는다.

**Tech Stack:** Node 20+ ESM(내장 모듈만), node:test, skills CLI 1.7.0, Claude Code plugin CLI, oh-my-codex 0.21.6, Better-T-Stack 3.44.1, Drizzle 1.0.0-rc.4, Supabase CLI 2.117.

**Spec:** `docs/superpowers/specs/2026-09-27-bts-next-supabase-and-project-skills-design.md`

## Global Constraints
- 스크립트는 Node 내장 모듈만 쓴다. 새 npm 의존성을 추가하지 않는다.
- `install.mjs`, `install.sh`, `files/scripts/*.mjs`, 공통 테스트(`tests/helpers.mjs`, `tests/dev-cycle-*.test.mjs`, `tests/sync-agents.test.mjs`, `tests/skills.test.mjs`, `tests/skills-setup.test.mjs`, `tests/shared-files.test.mjs`)는 두 템플릿에서 바이트가 같다.
- 설치기는 기존 파일을 덮어쓰지 않는다. `.claude/settings.json`은 없는 키만 더한다(사용자가 `false`로 둔 플러그인은 그대로 둔다).
- OMX는 `omx setup --scope project --no-merge-agents`로만 부른다. `--merge-agents`, `--force`를 쓰지 않는다.
- 전역 설치(`npm install -g`, `~/.claude/skills/gstack`)는 `--with-global`일 때만 하고, `check`가 실패한 항목만 한다.
- `AGENTS.md`는 80줄 이하, 스킬 본문은 150줄 이하, 문서는 한국어 평서문(기존 문체).
- 커밋과 push는 사용자가 요청할 때만 한다.
- 테스트 실행: 저장소 루트에서 `node --test 'templates/<템플릿>/tests/*.test.mjs'`.

## Review Focus
- 기존 `.claude/settings.json`이 있는 프로젝트: 다른 키(`env`, `permissions`)와 사용자가 끈 플러그인(`false`)이 보존되어야 한다 → Task 1 테스트.
- `claude`·`omx`·`npx`가 PATH에 없는 기기: 설치기가 실패하지 않고 선언만 쓴 뒤 설치 명령을 안내해야 한다 → Task 1 테스트.
- 두 번째 실행(멱등): 이미 있는 스킬은 네트워크 호출 없이 건너뛰어야 한다 → Task 1 테스트, Task 2 멱등 테스트.
- OMX가 쓴 `.codex/agents/*.toml`: `pnpm agents:check`가 고아로 보고하지 않아야 한다 → Task 2 테스트.
- Supabase 로컬 DB에서 RLS를 켠 뒤에도 앱(postgres 역할)의 Better Auth 가입·조회가 되어야 한다 → Task 6 fixture 검증.

---

### Task 1: `skills-setup.mjs`와 매니페스트 (neon 템플릿)

**Files:**
- Create: `templates/bts-next-neon/files/skills.manifest.json`
- Create: `templates/bts-next-neon/files/scripts/skills-setup.mjs`
- Test: `templates/bts-next-neon/tests/skills-setup.test.mjs`

**Interfaces:**
- Produces: `node scripts/skills-setup.mjs [--check] [--with-global]` (cwd = 프로젝트 루트). exit 0 정상, 1 `--check` 누락, 2 설치 실패.
- Produces: `export function missingSkills(root, entry): string[]`, `export function mergeClaudeSettings(root, claude): string[]`(추가한 키 목록), `export function main(argv, root): number`.
- 매니페스트 스키마:
  ```json
  {
    "skillsCli": "skills@1.7.0",
    "skills": [{ "agents": ["claude-code", "codex"], "source": "vercel/next.js", "skills": ["next-dev-loop"] }],
    "claude": { "marketplaces": { "omc": "https://github.com/Yeachan-Heo/oh-my-claudecode.git" }, "plugins": ["superpowers@claude-plugins-official"] },
    "omx": ["setup", "--scope", "project", "--no-merge-agents"],
    "global": [{ "name": "OMX CLI", "check": "command -v omx", "install": "npm install -g oh-my-codex" }, { "name": "ego-browser", "check": "command -v ego-browser", "hint": "https://lite.ego.app/ (macOS 앱)" }]
  }
  ```

- [ ] **Step 1: 실패하는 테스트 작성** — 임시 프로젝트에 테스트용 매니페스트를 쓰고, PATH 앞에 스텁(`npx`, `claude`, `omx`: 인자를 `$STUB_LOG`에 적고 기대 파일을 만든다)을 둔 채 `files/scripts/skills-setup.mjs`를 실행한다. 경우:
  1. 설치: shared 스킬은 `.agents/skills`와 `.claude/skills`에, codex 전용은 `.agents/skills`에만 생긴다. 기존 settings의 `env`와 `false` 플러그인이 보존되고 나머지 선언이 추가된다. `claude plugin install <p> --scope project`, `omx setup --scope project --no-merge-agents`가 호출된다. 두 번째 실행은 `npx`를 부르지 않는다. `--check`는 exit 0.
  2. 도구 없음: 스킬이 이미 있고 `claude`·`omx`가 PATH에 없으면 exit 0, settings 선언은 쓰고 출력에 `claude 없음`, `npm install -g oh-my-codex`가 있다. `--check`는 exit 1(`.omx/setup-scope.json` 없음).
  3. `--with-global`: `check`가 실패한 항목의 `install`만 실행하고, `install`이 없는 항목은 `hint`를 출력한다. 플래그가 없으면 아무것도 실행하지 않는다.
  4. 실패: 스텁 `claude`가 특정 플러그인에서 exit 1이면 전체 exit 2, 출력에 그 플러그인 이름.
  5. 실제 매니페스트 규칙: 스킬 이름 중복 없음, `agents`는 `claude-code`·`codex`만, codex 전용에 process-routing이 부르는 superpowers 8개(`brainstorming`, `writing-plans`, `subagent-driven-development`, `test-driven-development`, `systematic-debugging`, `receiving-code-review`, `verification-before-completion`, `finishing-a-development-branch`)와 `skill-creator`, 플러그인에 `superpowers@claude-plugins-official`, `oh-my-claudecode@omc`, `skill-creator@claude-plugins-official`.
- [ ] **Step 2: 실행해 실패 확인** — `node --test templates/bts-next-neon/tests/skills-setup.test.mjs` → 스크립트 없음으로 FAIL.
- [ ] **Step 3: 구현** — 스펙 1절 동작대로 쓴다. 순서: (`--with-global`이면 전역 설치) → 스킬 → Claude 선언 병합과 CLI 설치 → OMX → 전역 상태 출력. `npx`는 `CI=true`, `stdio: "inherit"`로 부른다. settings는 `JSON.stringify(v, null, 2)`로 쓰고 바뀐 것이 없으면 쓰지 않는다. settings JSON이 깨졌으면 그 단계를 실패로 보고하고 계속한다.
- [ ] **Step 4: 매니페스트 작성** — neon: 기존 `OFFICIAL_SKILLS` 21개(claude-code+codex) + `obra/superpowers` 15개와 `anthropics/skills`의 `skill-creator`(codex) + 플러그인 3개 + OMX + 전역(OMX CLI, gstack Claude, gstack Codex, agent-browser, ego-browser, Neon CLI).
- [ ] **Step 5: 통과 확인** — 같은 명령 → PASS.

### Task 2: 설치기 연결과 하네스 규칙 (neon 템플릿)

**Files:**
- Modify: `templates/bts-next-neon/install.mjs` (`OFFICIAL_SKILLS`, `SKILLS_CLI`, `installOfficialSkills`, `detectProcessSkills` 삭제, `runSkillsSetup` 추가, `--with-global`, 스크립트 2개, biome 제외 2개, 머리 주석 일반화)
- Modify: `templates/bts-next-neon/install.sh` (사용법 주석에 `--with-global`)
- Modify: `templates/bts-next-neon/files/.dev-cycle.json` (H 규칙)
- Modify: `templates/bts-next-neon/files/docs/dev-workflow.md` (H 행)
- Modify: `templates/bts-next-neon/tests/install.test.mjs`, `tests/dev-cycle-classify.test.mjs`, `tests/dev-cycle-table.test.mjs`

**Interfaces:**
- Consumes: Task 1의 `scripts/skills-setup.mjs` CLI.
- Produces: `install.sh <dir> [--diff] [--skip-skills] [--with-global]`, 프로젝트 스크립트 `skills:setup`, `skills:check`.

- [ ] **Step 1: 실패하는 테스트** — install.test: ① `package.json`에 `skills:setup`, `skills:check`가 추가된다 ② biome 제외 목록이 `[..., "!.claude", "!.codex"]` ③ `--skip-skills` 출력이 `pnpm skills:setup`을 안내한다 ④ OMX 모양의 `.codex/agents/executor.toml`(헤더 없음)을 둔 뒤 `node scripts/sync-agents.mjs --check`가 exit 0 ⑤ 공식 스킬 테스트는 `skills.manifest.json`의 claude-code 항목을 읽어 문서 언급을 검사한다. classify: `skills.manifest.json`, `.claude/settings.json`, `.codex/skills/x/SKILL.md`, `scripts/skills-setup.mjs`가 H. table: F 행 검사를 템플릿 중립 문구(`병합 전`)로, H에 `[verify] pnpm skills:check → 출력`.
- [ ] **Step 2: 실패 확인** — `node --test 'templates/bts-next-neon/tests/*.test.mjs'`.
- [ ] **Step 3: 구현** — install.mjs `main`에서 sync-agents 뒤에 `scripts/skills-setup.mjs`를 `stdio: "inherit"`로 실행(`--with-global` 전달, `--skip-skills`면 건너뜀). 실패(exit≠0)면 설치기 exit 2. 출력의 전역 프로세스 스킬 줄은 지운다(스크립트가 출력한다). H 규칙 정규식에 `skills\.manifest\.json$|\.claude/settings\.json$|\.codex/(skills|prompts)/|scripts/skills-setup\.mjs$`를 더한다.
- [ ] **Step 4: 통과 확인** — 같은 명령 → 전부 PASS.

### Task 3: neon 문서 갱신

**Files:** `templates/bts-next-neon/README.md`, `files/AGENTS.md`, `files/.agents/skills/bts-dev-cycle/references/process-routing.md`, `tests/template-docs.test.mjs`

- [ ] README: "설치되는 것" 표에 프로세스 스킬 행(Claude 플러그인 project scope, Codex superpowers·skill-creator, OMX `.codex/`), "준비물"의 권장 전역 스킬 문단을 "자동 설치되는 것과 전역 도구(`--with-global`)"로 교체, 옵션에 `--with-global`, 명령 표에 `pnpm skills:setup`, `pnpm skills:check`, 팀원 절차(클론 → `pnpm install` → `pnpm skills:setup` → Claude에서 프로젝트 신뢰).
- [ ] AGENTS.md: "에이전트" 절 아래 한 줄 — 프로세스 스킬이 없다고 나오면 `pnpm skills:check`로 확인하고 `pnpm skills:setup`으로 설치한다.
- [ ] process-routing: "도구별 이름" 앞에 "설치 위치" 절(프로젝트: 도메인 스킬, superpowers, OMC, skill-creator, OMX / 전역: gstack, ego-browser).
- [ ] template-docs.test: README 옵션에 `--with-global`, AGENTS.md가 `pnpm skills:setup`을 언급.
- [ ] `node --test 'templates/bts-next-neon/tests/*.test.mjs'` → PASS.

### Task 4: bts-next-supabase 복사와 드리프트 테스트

**Files:**
- Create: `templates/bts-next-supabase/**` (neon 복사, `VERIFICATION.md` 제외)
- Create: `templates/bts-next-neon/tests/shared-files.test.mjs`, `templates/bts-next-supabase/tests/shared-files.test.mjs` (동일)

- [ ] 복사: `rsync -a --exclude VERIFICATION.md --exclude .DS_Store templates/bts-next-neon/ templates/bts-next-supabase/`
- [ ] 드리프트 테스트: `templates/*/` 형제 중 `install.mjs`가 있는 디렉터리를 찾아, SHARED 목록 파일이 이 템플릿과 바이트가 같은지 비교한다. 형제가 없으면 skip이 아니라 통과(단일 템플릿 저장소 대비).
- [ ] 두 템플릿 테스트 모두 PASS(이 시점엔 내용이 같다).

### Task 5: Supabase 계층 내용

**Files (모두 `templates/bts-next-supabase/` 아래):** `files/skills.manifest.json`, `README.md`, `files/AGENTS.md`, `files/CLAUDE.md`(변경 없으면 유지), `files/docs/adr/0001-bts-next-supabase-stack.md`(neon ADR 삭제), `files/docs/dev-workflow.md`(E 케이스), `files/docs/domain/project.md`, `files/.agents/skills/bts-db/SKILL.md`, `bts-db/references/migration-flow.md`, `bts-api/references/ownership-test.md`, `bts-verify/SKILL.md`, `bts-verify/references/evidence.md`, `bts-dev-cycle/SKILL.md`(description), `files/.claude/agents/*.md`(description, db·security focus), `tests/template-docs.test.mjs`, `evals/**`(Neon 문구), `evals/seed/files/packages/db/src/schema/todo.ts`(`pgTable.withRLS`)

- [ ] 매니페스트: neon 3개 → `supabase/agent-skills`의 `supabase`, `supabase-postgres-best-practices`(19개). 전역의 Neon CLI → Supabase CLI(`brew install supabase/tap/supabase`, hint `pnpm dlx supabase@2.117.0`).
- [ ] dev-workflow E:
  ```
  - 스키마 수정 + dbGenerate, 생성 SQL 검토, 새 테이블 RLS 확인 (bts-db) → 마이그레이션 파일 경로와 요약
  - [verify] 로컬 Supabase DB에 dbMigrate 적용 → 호스트:포트와 출력 요약
  - [verify] supabase db advisors --local 보안 검사 → RLS 미적용 테이블 0건 등 결과 요약
  - [verify] 병합 전 Supabase 스테이징에 dbMigrate 적용 → 프로젝트 ref와 출력 요약 또는 N/A: Supabase 미연결(packages/db/supabase/.temp/project-ref 없음)
  - 파괴적 변경 여부 판단 → 없음 또는 2단계 계획
  - [review] bts-reviewer(db) → verdict, max_severity, 반영·기각 내역
  ```
- [ ] bts-db: 구조(로컬 Supabase 스택, `packages/db/supabase/config.toml`), 공식 스킬 연결(`supabase`, `supabase-postgres-best-practices`), RLS 규칙과 `pgTable.withRLS` 예, 인증 테이블 RLS 커스텀 마이그레이션, 금지(`supabase db push`·`migration new`·`db reset` 무단 사용, supabase-js 도입, service_role 노출). migration-flow: 로컬 스택 시작·중지·포트·Podman `DOCKER_HOST`·테스트 DB·`db reset` 주의, 순서(생성 → 검토 → 로컬 적용 → advisors → 스테이징 적용), 연결 문자열(transaction 6543 / session·direct 5432), expand→contract, db:push.
- [ ] template-docs.test: `--db-setup supabase`, E 행 4개(로컬, advisors, 스테이징), ADR 이름, AGENTS.md RLS 불변식.
- [ ] `node --test 'templates/bts-next-supabase/tests/*.test.mjs'`와 neon 테스트 → PASS.

### Task 6: 실제 설치 검증과 문서

**Files:** `README.md`(저장소 루트 링크), `templates/bts-next-supabase/VERIFICATION.md`(신규), `templates/bts-next-neon/VERIFICATION.md`(추가 절)

- [ ] BTS fixture 두 개를 스크래치에 생성(neon 템플릿은 `--db-setup docker`, supabase는 `--db-setup supabase --manual-db`), `--install`, git 커밋.
- [ ] 각각 `install.sh <fixture>` 실행(스킬 실제 설치, Claude CLI, OMX) → exit, `.agents/skills` 수, `.claude/settings.json`, `.codex/skills` 수, `pnpm skills:check` exit 0, `pnpm agents:check`, `pnpm check-types`, biome 새 지적 0, 두 번째 실행 멱등.
- [ ] supabase fixture: Podman으로 `supabase start`(필요한 서비스만), `db:generate`, 인증 테이블 RLS 커스텀 마이그레이션, `db:migrate`, `supabase db advisors --local` 결과, `rolbypassrls`·테이블 소유자 확인, dev 서버에서 가입 API가 되는지 확인.
- [ ] 스크래치 fixture의 project scope 플러그인 등록을 `claude plugin uninstall --scope project`로 정리.
- [ ] VERIFICATION 두 문서에 실측값과 못 한 검증을 적는다.

### Task 7: 독립 리뷰
- [ ] 코드·문서 리뷰를 별도 리뷰 에이전트에 맡기고, 지적은 직접 확인한 뒤 반영한다. 반영 후 두 템플릿 테스트 재실행.
