# bts-next-supabase 템플릿과 프로젝트 scope 스킬 자동 설치 설계

## 목표
1. `templates/bts-next-neon`과 같은 구성(스킬 6, 에이전트 2, dev-cycle, 설치기, 테스트, eval)을 Supabase DB용으로 `templates/bts-next-supabase`에 만든다.
2. 두 템플릿 모두, bts 스킬이 부르는 내부 스킬(공식 도메인 스킬 + superpowers, OMC, OMX, skill-creator)을 설치 대상 프로젝트 scope에 자동으로 설치한다. 전역에만 설치할 수 있는 도구는 `--with-global`을 줄 때만 전역 설치한다.

## 사용자 결정 (2026-09-27)
- Supabase 구조: BTS 생성물을 유지한다. Drizzle + Better Auth + Supabase Postgres. Supabase Auth, supabase-js, `supabase/migrations`는 쓰지 않는다.
- 이름: `bts-next-supabase`. 스킬 이름(`bts-*`)은 neon과 같다.
- 전역 도구: 기본 실행은 프로젝트 scope만 설치하고, 없는 전역 도구는 설치 명령을 출력한다. `--with-global`이면 없는 것만 전역 설치한다.

## 확인한 사실 (2026-09-27 실측)
| 항목 | 결과 |
|---|---|
| BTS 3.44.1 `--db-setup supabase` | Drizzle `node-postgres`(`pg`) 드라이버, Better Auth 유지. `apps/web/.env`에 `DATABASE_URL`·`DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`. 자동 모드는 `packages/db`에서 `supabase init`, `supabase start`를 실행하고, `--manual-db`면 실행하지 않는다. docker-compose 파일은 만들지 않는다 |
| Drizzle | `drizzle-orm@1.0.0-rc.4`. RLS는 `pgTable.withRLS(...)`(`.enableRLS()`는 deprecated) |
| Supabase CLI 2.117 | `supabase db advisors`(보안·성능 lint), `supabase db query` 있음 |
| Claude 플러그인 | `claude plugin marketplace add <url> --scope project`, `claude plugin install <p>@<m> --scope project`가 비대화식으로 동작하고 `.claude/settings.json`에 `enabledPlugins`, `extraKnownMarketplaces`를 쓴다 |
| OMX 0.21.6 | `omx setup --scope project --no-merge-agents`: `.codex/skills`(24), `.codex/agents`(18 TOML), `.codex/prompts`(32), `.codex/config.toml`·`hooks.json`(기기별, OMX가 쓰는 `.gitignore`로 제외), `.omx/`. 기존 `AGENTS.md`는 건드리지 않는다. `--merge-agents`는 "묻지 말고 끝까지 실행" 지시가 든 257줄 블록을 AGENTS.md에 넣으므로 쓰지 않는다(CLAUDE.md가 `@AGENTS.md`로 읽는다) |
| `sync-agents.mjs` | 자기 헤더가 붙은 TOML만 고아로 지우므로 OMX 에이전트와 공존한다 |
| gstack | 전역 설치만 지원한다. upstream `gstack-team-init`은 프로젝트에 둔 사본을 지운다. `./setup`에는 bun이 필요하다 |
| skills CLI 1.7.0 | `obra/superpowers`(15 스킬), `anthropics/skills`(`skill-creator` 포함), `supabase/agent-skills`(`supabase`, `supabase-postgres-best-practices`)를 설치할 수 있다 |
| Supabase 보안 | `public`은 Data API에 노출되는 스키마다. Supabase 스킬은 노출 스키마의 모든 테이블에 RLS를 켜라고 한다. 앱은 테이블 소유자 `postgres`로 접속하므로 RLS를 켜도 앱 쿼리는 영향을 받지 않는다 |

## 설계

### 1. 프로젝트 scope 스킬 설치 (두 템플릿 공통)
- `files/skills.manifest.json`(템플릿마다 다름): 설치할 것의 정본.
  - `skills`: `{ agents, source, skills }` 목록. `agents`가 `["claude-code","codex"]`면 도메인 스킬(`.agents/skills` + `.claude/skills` 링크), `["codex"]`면 Codex 전용(superpowers, skill-creator). Claude는 이것들을 플러그인으로 받으므로 `.claude/skills`에 넣지 않는다(이름 중복 방지).
  - `claude.marketplaces`, `claude.plugins`: project scope 플러그인(superpowers, skill-creator, oh-my-claudecode).
  - `omx`: `omx` 인자 배열(`setup --scope project --no-merge-agents`).
  - `global`: `{ name, check, install?, hint? }`. `check`·`install`은 `sh -c` 문자열이다.
- `files/scripts/skills-setup.mjs`(두 템플릿에서 바이트 동일): 매니페스트를 읽어 설치한다. 설치기가 부르고, 팀원은 `pnpm skills:setup`으로 다시 부른다.
  - 기본: 없는 스킬만 `npx -y <skillsCli> add`로 설치 → `.claude/settings.json`에 플러그인 선언을 병합(있는 키는 유지) → `claude`가 있으면 marketplace add·plugin install(project) → `omx`가 있으면 `omx setup ...` → 전역 도구 상태 출력.
  - `--with-global`: 먼저 `check`가 실패한 `global` 항목의 `install`을 순서대로 실행한다.
  - `--check`: 아무것도 설치하지 않고 상태만 출력한다. 프로젝트 scope 항목이 빠졌으면 exit 1.
  - exit: 0 정상, 1 `--check` 누락, 2 설치 실패.
- `install.mjs`(두 템플릿에서 바이트 동일): `OFFICIAL_SKILLS`·`installOfficialSkills`·`detectProcessSkills`를 지우고 `scripts/skills-setup.mjs`를 실행한다. `--with-global`을 넘기고, `--skip-skills`면 실행하지 않는다. `skills:setup`, `skills:check` 스크립트를 추가하고 biome 검사 제외에 `!.claude`, `!.codex`를 더한다(도구가 다시 쓰는 파일).
- `.dev-cycle.json` H 규칙에 `skills.manifest.json`, `.claude/settings.json`, `.codex/(skills|prompts)/`, `scripts/skills-setup.mjs`를 더한다. `docs/dev-workflow.md` H 케이스에 `[verify] pnpm skills:check → 출력` 행을 더한다.

### 2. bts-next-supabase 템플릿
neon 템플릿을 복사하고 DB 계층만 바꾼다.
- 생성: `--db-setup supabase --manual-db`, 이어서 `packages/db`에서 `supabase init`, `supabase start`. Podman이면 `DOCKER_HOST`를 Podman 소켓으로 둔다.
- 로컬 DB: Supabase 로컬 스택 `127.0.0.1:54322`. `supabase db reset`은 `supabase/migrations`(비어 있음)만 적용하므로 Drizzle 스키마를 지운다. 쓴 뒤 `db:migrate`를 다시 실행한다. 사용자 요청 때만 쓴다.
- 마이그레이션: Drizzle `db:generate`/`db:migrate`만 쓴다. `supabase db push`, `supabase migration new`는 쓰지 않는다.
- `db:push`는 로컬에서도 금지한다(실측: `schemaFilter`가 없으면 Supabase 내부 스키마 삭제를 계획하고, `public`만 보면 인증 테이블 RLS를 끈다).
- 보안 불변식 추가: `public`의 모든 테이블은 RLS를 켠다(`pgTable.withRLS`, Better Auth 생성 테이블은 `drizzle-kit generate --custom` 마이그레이션의 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`). 정책은 두지 않는다(anon·authenticated 거부). 소유권은 여전히 서버 프로시저가 지킨다. `supabase db advisors`로 확인한다. `service_role`·secret 키와 DB 비밀번호는 클라이언트에 두지 않는다.
- 병합 전 검증: 원격 Supabase 스테이징 프로젝트(Branching을 쓰면 개발 브랜치)에 session pooler 또는 direct URL로 `db:migrate`. 연결 전이면 `N/A: Supabase 미연결(packages/db/supabase/.temp/project-ref 없음)`.
- 운영: 앱은 transaction pooler(6543), 마이그레이션은 direct 또는 session pooler(5432).
- 공식 스킬: neon 3개 대신 `supabase`, `supabase-postgres-best-practices` → 19개.
- 전역 도구: neon CLI 대신 Supabase CLI(`brew install supabase/tap/supabase`, 없으면 `pnpm dlx supabase`).

### 3. 드리프트 방지
템플릿마다 `tests/shared-files.test.mjs`(동일 파일)를 둔다. 형제 템플릿과 바이트가 같아야 하는 파일(`install.mjs`, `install.sh`, `files/scripts/*.mjs`, 공통 테스트 파일)을 비교한다. 공통 엔진을 별도 디렉터리로 빼지 않는다. 템플릿마다 독립 실행이 되고, 다른 템플릿만 고친 채 남는 일은 테스트가 막는다.

## 범위 밖
- Supabase Auth, supabase-js, Supabase MCP 설정 자동화.
- gstack을 프로젝트에 복사하는 것(upstream이 지원하지 않는다).
- skill 동작 eval 전체 재실행. `bts-db` 변경에 대한 eval 실행 여부는 VERIFICATION.md에 적는다.
