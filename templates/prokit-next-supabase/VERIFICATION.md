# 검증 기록

> 기록 속 vX.Y.Z와 커밋 해시는 공개 전 비공개 이력(2026-10-08 공개 때 이력을 새로 시작)의 것이다.

템플릿을 실제로 설치하고 돌려 본 결과와, 검증하지 못한 한계를 적는다. 모든 값은 2026-09-27에 측정한 실측값이다. fixture는 세션 스크래치에서 만들었으므로 이 문서에는 수치와 판정만 남긴다. 스킬·에이전트·dev-cycle 러너의 공통 부분은 [bts-next-neon의 VERIFICATION.md](../prokit-next-neon/VERIFICATION.md)에서 검증한 것과 같은 파일이다(`tests/shared-files.test.mjs`가 바이트 동일성을 검사한다).

## 환경
| 항목 | 버전 |
|---|---|
| OS | macOS 26.5.2 (Darwin 25.5.0) |
| Node | v24.19.0 |
| pnpm | 12.6.0 |
| git | 2.55.0 |
| create-better-t-stack | 3.44.1 (Next.js 16.3.6, drizzle-orm·drizzle-kit 1.0.0-rc.4, better-auth 1.7.5) |
| Supabase CLI | 2.117.0 (로컬 Postgres 17.6) |
| 컨테이너 | Podman 6.0.2 (`podman-machine-default`, libkrun), Docker CLI 없음 |
| skills CLI | 1.7.0 |
| Claude Code | 2.1.283 |
| oh-my-codex | 0.21.6 |

fixture 생성 명령은 README의 "새 프로젝트 시작"과 같다(`--db-setup supabase --manual-db`, `--install`).

## 단위 테스트
`node --test 'templates/bts-next-supabase/tests/*.test.mjs'` → **107 통과, 0 실패**(아래 Vercel 배포와 환경별 `.env` 무시 추가 뒤). neon과 같은 공통 테스트 외에 `template-docs.test.mjs`가 Supabase 생성 옵션, E 케이스 행(로컬 적용, advisors, 스테이징), AGENTS.md의 RLS 불변식, `bts-db`의 `pgTable.withRLS`·`ENABLE ROW LEVEL SECURITY`, `bts-db`에 Neon 문구가 없음을 검사한다. 스킬 6개 모두 skill-creator `quick_validate.py` 통과.

## BTS `--db-setup supabase` 생성물
- `packages/db/src/index.ts`는 `drizzle-orm/node-postgres`(`pg`)다. neon 템플릿의 `--db-setup docker`와 같은 드라이버다.
- `apps/web/.env`에 `DATABASE_URL`, `DIRECT_URL` = `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.
- docker-compose 파일과 `db:start` 스크립트는 만들지 않는다. `--manual-db`면 `supabase init`·`start`도 실행하지 않는다.
- `supabase init`이 만드는 `supabase/config.toml`의 `project_id`는 디렉터리 이름 `"db"`다. 모든 BTS 프로젝트가 같은 값이므로 README와 migration-flow에 프로젝트 이름으로 바꾸라고 적었다. `supabase/.gitignore`가 `.temp`(link 정보), `.branches`를 무시한다.

## 로컬 Supabase DB와 RLS (Podman)
| 검사 | 결과 |
|---|---|
| `DOCKER_HOST=unix://<podman 소켓>` + `supabase start -x <DB 외 13개>` | 28초, 컨테이너 `supabase_db_<project_id>` healthy, `127.0.0.1:54322` |
| `db:generate` | `src/migrations/<시각>_<이름>/migration.sql` + `snapshot.json` (drizzle-kit rc 폴더 형식) |
| 인증 테이블만 적용한 뒤 `supabase db advisors --local --type security` | ERROR 6건: `rls_disabled_in_public` 4건(user, session, account, verification), `sensitive_columns_exposed` 2건(account: access_token·password·refresh_token, session: token) |
| `drizzle-kit generate --custom --name=enable_rls_auth` + `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` 4줄 → `db:migrate` | 적용 성공, advisors `No issues found`, `--fail-on error` exit 0 |
| RLS 없는 `public` 테이블을 하나 만든 뒤 advisors `--fail-on error` | `--local`, `--db-url` 모두 exit 1, 해당 테이블 지적 |
| 역할 | `postgres`: superuser 아님, `rolbypassrls = t`, 네 테이블의 소유자. `anon`·`authenticated`: bypassrls 없음 |
| `set role anon; select count(*) from public.user` | 0 (실제 1행) — 정책 없는 RLS가 Data API 역할을 막는다 |
| RLS를 켠 상태에서 `pnpm --filter web dev` → `POST /api/auth/sign-up/email`, `GET /api/auth/get-session` | 둘 다 HTTP 200, `user`·`session` 각 1행 |
| `drizzle-kit push`(`db:push`), `schemaFilter` 없음 | 적용 전에 멈췄다(exit 2). 계획에 Supabase 내부 스키마 `auth`, `storage`, `realtime`, `_realtime`, `vault`, `extensions`, `supabase_functions` 삭제(데이터 손실 확인 15건)가 들어 있었다 |
| `drizzle-kit push`, `schemaFilter: ["public"]` | 인증 테이블 4개에 `DISABLE ROW LEVEL SECURITY`를 적용했다(스키마 파일에 RLS가 없으므로). 그래서 Supabase 템플릿은 `db:push`를 로컬에서도 금지한다. 시험 뒤 RLS를 다시 켜고 설정을 되돌렸다 |
| 테스트 DB: `podman exec supabase_db_<id> createdb -U postgres <이름>_test` → `DATABASE_URL=<테스트 URL> db:migrate` | 적용 성공, 네 테이블 RLS 켜짐. 이 DB에는 `anon` 권한이 없어 advisors가 검출하지 않으므로, advisors는 개발 DB에 돌리도록 적었다 |

## fixture 설치 (스킬 실제 설치)
최종 템플릿으로 BTS 원본 커밋에서 다시 설치한 결과다.

| 검사 | 결과 |
|---|---|
| `install.sh` 종료 코드 | 0 (스킬 CLI·`claude`·`omx` 실제 실행) |
| 스킬 | 35개 설치(도메인 19 + Codex 전용 superpowers 15, skill-creator 1). `.agents/skills` 41개(bts 6 포함), `.claude/skills` 25개(도메인 19 + bts 6, Codex 전용은 링크하지 않음), `skills-lock.json` 35항목 |
| Claude 플러그인 | `.claude/settings.json`에 마켓플레이스 2개(`claude-plugins-official`, `omc`)와 플러그인 3개 선언, `claude plugin install --scope project` 3개 성공 |
| OMX | `.codex/skills` 24, `.codex/agents` 20(OMX 18 + bts 2), `.codex/prompts` 32. 셋은 git이 추적하고 `.codex/config.toml`·`hooks.json`은 OMX가 쓴 `.gitignore`로 제외된다. `AGENTS.md`는 그대로다 |
| `pnpm skills:check` / `agents:check` / `check-types` | 모두 exit 0 |
| 멱등성 | 커밋한 뒤 두 번째 실행: exit 0, 스킬 새 설치 0개, "복사 0, 동일 25, 유지(템플릿과 다름) 없음", 작업 트리 변경 0 (12초) |
| biome | 템플릿이 더한 파일(`scripts/*.mjs`, `skills.manifest.json`, `.dev-cycle.json`, `package.json`, `biome.json`) 지적 0. drizzle-kit이 만든 마이그레이션 `snapshot.json` 2개는 포맷 지적이 있다(BTS·drizzle 생성물, neon 템플릿과 같은 기존 한계) |
| 사용자 전역 설정 | 설치 뒤에도 `known_marketplaces.json`의 `claude-plugins-official` source가 `github`(원래 형식) 그대로다 |
| dev-cycle | `packages/db` 변경 → `case` E, `table E`가 로컬 Supabase 적용·advisors·스테이징 행을 낸다 |

## 빈 Claude 설정에서의 플러그인 설치
`CLAUDE_CONFIG_DIR`를 빈 디렉터리로 두고 실행했다.
- `claude-plugins-official`을 선언하지 않으면 `superpowers@claude-plugins-official` 설치가 `Plugin "superpowers" not found in marketplace "claude-plugins-official"`로 실패했다. 새 사용자 설정에는 공식 마켓플레이스가 등록되어 있지 않다. 매니페스트에 `claude-plugins-official`(github `anthropics/claude-plugins-official`)과 `omc`(git URL)를 모두 선언하도록 고쳤다.
- 고친 뒤 `scripts/skills-setup.mjs`가 세 플러그인(superpowers, skill-creator, oh-my-claudecode)을 모두 project scope로 설치했다. PATH에 `omx`가 없어서 `--check`는 exit 1(OMX 설정 없음)로 끝났다. 의도한 동작이다.
- 이미 github 형식으로 등록된 마켓플레이스를 git URL로 다시 `marketplace add`하면 사용자 전역 `known_marketplaces.json`의 source 형식이 git으로 바뀌었다. 그래서 매니페스트는 settings의 source 객체를 그대로 두고, github이면 `owner/repo`로 등록한다. 시험 중 바뀐 전역 항목은 `owner/repo`로 다시 등록해 원래 형식으로 되돌렸다.

## 독립 리뷰 (Opus, 읽기 전용)
critical·high 0건, medium 5건, low 6건. 모두 직접 확인한 뒤 반영했다.
- 스테이징 URL 확인용 `sed`가 형식이 맞지 않는 URL(앞 공백, 대문자 스킴)을 비밀번호째 출력했다 → `sed -nE '…#p'`로 바꿔 맞지 않으면 아무것도 출력하지 않게 했다(샘플 5개로 확인).
- `claude plugin install`이 사용자가 `false`로 끈 플러그인을 다시 켤 수 있었다 → `false`인 플러그인은 설치하지 않는다(테스트 추가).
- 이미 등록된 마켓플레이스를 다시 `marketplace add`하면 사용자 전역 source 형식이 바뀔 수 있었다 → `claude plugin marketplace list --json`에 있는 이름은 건너뛰고, 등록할 때는 프로젝트 선언의 source를 쓴다(스텁 테스트와 실제 `claude`로 확인).
- `omx`가 없는 기기(Claude만 쓰는 개발자)에서 `skills:check`가 늘 exit 1이었다 → `omx`가 PATH에 있을 때만 OMX 설정을 누락으로 센다.
- AGENTS.md는 "없으면 설치", process-routing은 "요청할 때 설치"로 어긋났다 → AGENTS.md를 "확인해 보고, 설치는 사용자가 요청할 때"로 맞췄다.
- 심볼릭 링크 경로(macOS `/tmp`)로 실행하면 `skills-setup.mjs`, `dev-cycle.mjs`, `sync-agents.mjs`가 아무것도 하지 않고 exit 0이었다(재현함, 기존 두 스크립트에도 있던 결함) → 진입점 판별을 `realpathSync(argv[1]) === fileURLToPath(import.meta.url)`로 바꿨다.
- `--diff`가 스킬 설치까지 실행했다 → `--diff`는 스킬·플러그인 설치를 건너뛴다. 설치기에 `--with-global` 전달과 exit 2 전달 테스트를 더했다.
- 기타: 공통 파일 테스트는 형제 템플릿이 없으면 skip으로 보이게, README에 gstack `./setup`의 전역 훅 등록을 적었다.

## bts 스킬 구성 검수 (2026-09-27 추가)
읽기 전용 독립 리뷰 두 갈래(스킬 단위 `plugin-dev:skill-reviewer`, 하네스 전체 OMC critic)의 지적을 코드와 실행으로 확인한 뒤 반영했다. 스킬 description, 참조 문서 링크, 매니페스트의 스킬 이름, web↔ui·api↔db 떠넘김 문구는 문제가 없었다.

고친 것:
- **설치기가 금지 명령을 기록**: `.dev-cycle.json`에 `commands.dbPush`를 넣었다(쓰는 스킬이 없고 supabase는 금지). 기록하지 않는다. 새 BTS 프로젝트에 실제로 설치해 확인했다: exit 0, 스킬 35개, commands에 dbPush 없음, `skills:check`·`agents:check`·`check-types` exit 0.
- **검사 행렬 불일치**
  - B: ego-browser로 바꿀 때 빠진 next-dev-loop 런타임 확인을 스크린샷 행에 되살렸다.
  - E: 타입·린트 행을 넣었다.
  - C: 경로 판정이 A일 때(`packages/auth`만 바꾼 경우 등) 타입·린트 행이 없었다. 러너가 A의 verify 행도 상속한다.
  - `bts-verify`의 H 최소 검사에 `skills:check`와 skill eval을 넣었다.
- **문서 갱신 시점**: 리뷰 행이 표 끝의 문서 영향 확인 행보다 앞에 있어, 리뷰어가 갱신 전 문서를 봤다. 문서는 그 계층을 구현하는 행에서 고치게 했다(`bts-dev-cycle`, `bts-api`, `bts-web`). 리뷰어는 code focus에서 `CONTEXT.md`와 `project.md`를 읽는다.
- **`bts-api` 예제**: update 입력은 `title` 필수인데, 격리 테스트 예제는 `completed`만 넘겼다. 두 필드를 선택으로 하고 refine을 붙였다. fixture에서 `check-types`로 확인했고, 일부러 넣은 타입 오류가 잡히는 것도 확인했다.
- **blocked 남용**: 라운드 안에서 준비할 수 있는 것(테스트 러너, 로컬 테스트 DB)이 없다는 이유로는 blocked를 쓰지 않게 했다. SQL로 조건을 흉내 낸 확인은 격리 테스트로 인정하지 않는다.
- **close**: `blocked`·`미실행` 칸이 있으면 `close --partial` 없이 닫지 않는다. 러너에 넣고 테스트를 추가했으며, 검사를 빼면 테스트가 실패하는 것을 확인했다. 백틱이나 따옴표로 감싼 `blocked:`도 같은 표시로 읽는다.
- **`bts-db` migration-flow**
  - `--custom` 마이그레이션은 스냅샷을 갱신하지 않는다. 재현: 스키마에 컬럼을 더하고 `--custom`으로 만들면, 다음 `db:generate`가 같은 `ADD COLUMN`을 다시 만든다.
  - expand 단계에서는 새 컬럼에 NOT NULL을 걸지 않는다.
  - 스냅샷을 손으로 고치지 않는다.
- **그 밖의 문구**
  - 세션 시작에 `tasks/lessons.md`를 읽는다.
  - C 라운드의 재현 수단을 적었다.
  - 고쳐 달라는 요청은 분석만 하는 날에도 라운드를 연다.
  - UI 점수가 기준에 못 미칠 때의 처리를 적었다.
  - 전체 lint의 기존 지적은 기준과 비교해 적는다. BTS 생성 코드는 설치 직후 `biome check .`가 75건이고, `--write` 뒤에도 a11y 4건이 남는다.
  - 증거 형식표에 `미실행`을 넣었다.
  - `/code-review`가 Claude Code 내장 명령임을 밝혔다.
- **eval 하네스**: `seed/apply.sh`의 워크스페이스 이름 하드코딩, `verify-round.sh`의 BSD 전용 `sed -i ''`, 라우터에 연결되지 않던 `todoCount`를 고쳤다. 새 fixture에서 실행해 확인했다.
- **테스트**: 네 가지 검사를 더했다(전체 86개).
  - 공식 스킬 연결 표의 이름이 매니페스트에 있는지
  - `references/` 파일이 SKILL.md에서 링크되는지
  - 문서 갱신 지시가 있는지
  - H 검사 문구가 있는지

고치지 않은 것:
- **audit이 리뷰 행 증거 형식과 UI 점수를 강제하는 것**: my-app의 실제 증거는 형식이 다양하다(`최종16/20,a11y3/4`, `B18/20`). 또 F 라운드의 db 리뷰 행에는 정당한 N/A가 있다. 강제하면 정상 라운드를 막으므로 스킬 문구로 두었다.
- **`AGENTS.md` 맨 앞 개발 원칙(plan mode, check in)**: 사용자가 넣은 원칙이라 그대로 두었다. A 라운드 eval에서는 확인 질문 없이 끝까지 닫았다.

### 동작 eval (Supabase fixture)
fixture는 다음 순서로 만들었다: README 명령으로 BTS 생성 → 현재 템플릿 설치 → eval 시드 → 첫 마이그레이션과 인증 테이블 RLS → 커밋.

실행마다 복사본을 만들고 `project_id`와 포트를 바꿔 로컬 Supabase DB를 따로 띄웠다(최대 9개 동시). 실행은 Sonnet 5 서브에이전트, 채점은 Opus 5.5가 맡았다. 서브에이전트 안에서는 `bts-reviewer`를 부를 수 없으므로, 리뷰 행의 blocked는 정상이다.

`bts-db`는 이번이 첫 측정이다. without_skill은 `bts-db`만 뺀 같은 프로젝트다(`AGENTS.md`는 그대로). 점수는 현재 체크 항목 5개 기준이다(eval-1에는 뒤에 2개를 더했다).

| eval | 스킬 있음 (수정 전) | 스킬 없음 | 스킬 있음 (수정 후) |
|---|---|---|---|
| 1. 마감일 컬럼 | 5/5 | 4/5 | 5/5, 5/5 (두 번 실행. 뒤에 더한 격리 테스트 항목으로는 첫 번째 실패, 두 번째 통과) |
| 2. 운영 중 컬럼 이름 변경 | 2/5 | 4/5 | 5/5 |
| 3. 사용자별 note 테이블 | 4/5 | 5/5 | 다시 돌리지 않음 |

- **수정 전 합계: 스킬 있음 73%, 스킬 없음 87%.** Supabase 보안 규칙(RLS, `db:push` 금지, 마이그레이션만)이 `AGENTS.md`에도 있어서, 기준선이 체크 항목 대부분을 맞혔다.
- 체크 항목 밖의 차이는 다음과 같다.
  - 스킬 있음은 세 실행 모두 대조표를 열었고, `--filter` 명령을 썼고, `CONTEXT.md`와 `project.md`를 고쳤다.
  - 스킬 없음은 세 실행 모두 대조표를 열지 않았다. 루트 `pnpm db:generate`는 turbo 대화형 태스크라 실패해서 다시 실행했다. eval-2에서는 drizzle 스냅샷을 python으로 직접 고쳤다.
- **스킬 있음 eval-2가 낮았던 이유**: 위 migration-flow 결함 두 가지 때문이다. 고친 뒤 5/5가 됐다.
- **스킬 있음 eval-1의 격리 테스트**: 첫 실행은 `blocked: 러너 없음`, 두 번째는 SQL 흉내로 처리했다. blocked 정의와 러너 도입 이유를 고친 뒤 세 번째 실행에서 vitest를 도입했고, 격리 테스트 3건이 통과했다.

다른 스킬의 회귀 실행 결과:

| eval | 결과 |
|---|---|
| bts-api 1: update 프로시저 | 5/5. 테스트 DB를 만들어 격리 테스트 4건 통과, `project.md` API 표 갱신 |
| bts-dev-cycle 3: A 라운드 | 4/4. audit 통과 뒤 close |
| bts-dev-cycle 2: C, 분석만 | 3/5 → 수정 후 5/5. 첫 실행은 코드를 안 바꾸는 날이라며 라운드를 열지 않았다. 수정 후에는 C 라운드를 열고 `systematic-debugging`을 쓰고 security 행을 넣었다 |
| bts-verify 1: 증거 채우기 | 수정 후 4/4. vitest를 도입해 격리 테스트 4건 통과, 리뷰 행을 스스로 approve하지 않음 |

- 수정 뒤 실행 하나가 blocked 행이 있는데도 사용자 동의 없이 close했다. 그래서 러너가 `--partial`을 요구하게 했다.
- 채점자의 지적에 따라 판별력이 약한 assertion을 보강했다. 대상은 `bts-db` eval 1·2, `bts-api` eval 1, `bts-dev-cycle` eval 2, `bts-verify` eval 1이다.

## agent-browser 기본 설치와 Windows(WSL2) 안내 (2026-09-27 추가)
### 바꾼 것
- **agent-browser CLI 기본 설치**: 매니페스트 전역 항목에 `auto: true`를 두었다. 기본 설치와 `pnpm skills:setup`이 `--with-global` 없이도 agent-browser CLI가 없거나 0.31.1(next-dev-loop 하한) 미만이면 `npm install -g agent-browser@latest && agent-browser install`을 실행한다. 이 설치의 실패는 경고로만 알리고 exit 0을 유지한다(없어도 dev-cycle은 진행된다). `--with-global`로 요청한 설치의 실패는 전과 같이 exit 2다. `--check`는 설치하지 않는다. ego lite는 macOS 전용이고 Windows판은 대기 목록 단계라서, 다른 OS와 CI에서는 agent-browser가 유일한 브라우저 도구다.
- **`@latest`**: agent-browser 0.31 이후 버전은 `engines.node >=24`를 적는다. Node 24 미만의 npm은 태그 없이 설치하면 engines가 맞는 0.27.0을 고른다(Ubuntu의 Node 22.20, macOS의 Node 20.19 실측). `@latest`를 붙이면 EBADENGINE 경고만 내고 0.38.1을 설치한다. Node 20에서 페이지 열기와 텍스트 읽기가 동작했다. 그래서 검사도 `command -v`가 아니라 버전 비교(`sort -V`, macOS BSD sort와 GNU sort 모두 확인)로 바꿨다.
- **Windows 셸 가드**: `install.mjs` 사전 점검과 `skills-setup.mjs`가 `win32`면 WSL2를 안내하고 아무것도 하지 않는다. Windows 셸에서는 `pnpm`·`npx`가 `.cmd`라서 `spawnSync`로 띄우지 못하고, `sh -c`, 심볼릭 링크, bash 문법 스킬도 전제가 맞지 않는다.
- **문서**: 템플릿 README에 Windows 절(WSL2, Supabase CLI `.deb`, Podman 5 이상과 소켓·`DOCKER_HOST`, systemd, Docker Desktop, `agent-browser install --with-deps`)을 넣었다. `bts-db` migration-flow에 Linux·WSL의 `DOCKER_HOST`와 Podman 4.x의 `supabase stop` 실패를, `bts-verify`에 Chrome 시스템 라이브러리 누락 처리를 적었다. 루트 README·AGENTS.md도 맞췄다.
- **테스트**: 다섯 가지 검사를 더했다(전체 91개). 자동 설치와 경고 처리, Windows 가드 두 곳, 실제 매니페스트 검사식의 버전 판정(0.27.0·0.31.0 거부, 0.31.1 이상 통과), README Windows 절의 필수 안내다.

### WSL2 흉내 검증
Windows 기기가 없어서 Podman 머신 안에 privileged Ubuntu 컨테이너를 띄우고, 그 안에서 일반 사용자로 rootless Podman을 썼다. 중첩 컨테이너라 systemd가 없다. 그래서 소켓은 `podman system service`로 띄웠고, 헬스체크 타이머는 반복 실행으로 대신했다. 저장소 드라이버는 vfs, cgroup 관리자는 cgroupfs다.

| 항목 | Ubuntu 24.04 (Podman 4.9.3) | Ubuntu 26.04 (Podman 5.7.0) |
|---|---|---|
| Supabase CLI 2.117.0 `start -x …` (DB만) | 통과. DB healthy, `select 1` | 통과 |
| `supabase stop` | 실패: `failed to list containers: template … .Label` | 통과 |
| 이미지 받기 | 전체 경로 이미지라 레지스트리 설정 없이 됨 | 같음 |

- 처음 24.04 실행은 소켓 디렉터리를 만들지 않아 API 서비스가 뜨지 못한 잘못된 실행이었다. 소켓을 확인한 뒤 다시 돌린 결과가 위 표다.
- agent-browser(x64 에뮬레이션 Ubuntu 24.04, Node 22): `agent-browser install`만으로는 Chrome이 `libglib-2.0.so.0` 없음으로 뜨지 않았고, `--with-deps` 뒤 라이브러리 오류가 사라졌다. 페이지 열기는 qemu에서 Chrome이 signal 6으로 죽어 확인하지 못했다.
- macOS에서는 격리한 npm 전역 경로와 HOME으로 설치 명령을 실행했다. 0.38.1과 Chrome 154가 설치됐고, 페이지 열기·텍스트 읽기·스크린샷이 동작했다.

### 실제 설치 (새 BTS 프로젝트, neon 템플릿)
- `install.sh` exit 0. 스킬 37개 설치, Claude 플러그인과 OMX 설정 완료. 이 기기의 agent-browser 0.31.1은 새 검사식에서 "있음"으로 판정되어 설치를 건너뛰었다.
- 같은 프로젝트에서 agent-browser가 없게 만든 PATH(npm 전역 경로와 HOME은 scratchpad)로 `skills-setup.mjs`를 실행했다. agent-browser만 자동 설치하고, OMX CLI·gstack은 안내만 했다(exit 0).
- `skills:check`, `agents:check`, `check-types` 모두 exit 0. 확인 뒤 project scope 플러그인 3개를 지웠다.

### 독립 리뷰 (Opus, 읽기 전용)
CRITICAL·HIGH는 없었고 MEDIUM 3건, LOW 3건을 모두 반영했다.
- **npm 밖의 옛 agent-browser**: brew 등으로 설치한 0.31.1 미만이 PATH 앞에 있으면 자동 설치가 매번 돌고 경고한다. 올리는 방법을 `hint`로 보여 준다. 이 경우의 반복 설치는 그대로 두었다(한계).
- **`pnpm dlx`와 `--with-global`**: README가 권한 `pnpm dlx supabase`를 쓰면 `--with-global`이 Homebrew 없음으로 exit 2가 된다. `.deb`로 먼저 설치하라고 적었다.
- **`registries.conf` 덧붙이기**: 두 번 실행하면 키가 중복되어 Podman이 설정을 읽지 못한다. 파일이 없을 때만 만들게 바꿨다(neon README).
- **문서와 테스트 보완**
  - "없으면 설치"를 "없거나 0.31.1 미만이면"으로 고쳤다.
  - `--skip-skills`가 자동 설치도 건너뛴다고 적었다.
  - process-routing 설치 위치에 agent-browser를 더했다.
  - install 테스트는 `npm` 스텁으로 실제 전역 설치를 막았다.
  - Windows 가드 테스트는 스텁 PATH의 별도 프로세스로 옮겼고, 가드를 끄면 실패하는 것을 확인했다.

## Vercel 배포 (2026-09-27 추가)
공식 스킬 검토, 스크립트와 스킬, 실측한 Vercel CLI 동작, 독립 리뷰는 [bts-next-neon의 VERIFICATION.md](../prokit-next-neon/VERIFICATION.md#vercel-배포-2026-09-27-추가)에 적었다. 공유 파일이라 두 템플릿에 똑같이 들어간다. 테스트는 107개가 통과한다.

Supabase에서 따로 확인한 것(새 BTS 프로젝트에 이 템플릿을 설치하고 임시 Supabase 프로젝트 하나를 스테이징·운영 대신 썼다):
- 설치: 스킬 38개, `skills:check` exit 0. `supabase init` 뒤 `project_id`를 바꾸고 인증 테이블과 `enable_rls_auth` 마이그레이션을 만들었다.
- `supabase link`가 `supabase/.temp/pooler-url`에 비밀번호 없는 session pooler 주소(`postgres.<ref>@aws-0-ap-northeast-2.pooler.supabase.com:5432`)를 남긴다. 비밀번호를 넣은 주소로 `db:migrate`를 적용했고, `supabase db advisors --db-url … --type security --fail-on error`는 `No issues found`였다.
- migration-flow의 명령대로 포트만 6543으로 바꾼 주소를 Preview·Production `DATABASE_URL`에 넣었다. 확인 줄은 `postgres.<ref> aws-0-ap-northeast-2.pooler.supabase.com 6543`을 출력했다.
- production 배포 전에 develop을 실행하자 "production 배포가 아직 없다"로 exit 1이었다(첫 배포 방지).
- production, develop 배포 모두 exit 0이었고 경고가 없었다. production `get-session` 200. develop은 일반 `curl` 302, `vercel curl` 200이었고, 고정 주소에서 가입·로그인 200이었다(transaction pooler 6543 + node-postgres).
- 확인 뒤 Supabase 프로젝트, Vercel 프로젝트, 비밀번호를 담았던 임시 파일, project scope 플러그인을 지웠다.
- 한계: 스테이징과 운영을 서로 다른 프로젝트로 나눈 배포는 하지 않았다. 두 환경이 같은 DB를 썼다.

## 공식 스킬 재검토 (2026-09-27 추가)
공식 저장소 다섯 곳과의 대조, 더한 스킬과 넣지 않은 스킬의 이유는 [bts-next-neon의 VERIFICATION.md](../prokit-next-neon/VERIFICATION.md#공식-스킬-재검토-2026-09-27-추가)에 적었다. 이 템플릿에는 `next-partial-prefetching-optimizer`(`bts-web`)를 더했고, `vercel-react-view-transitions`는 선택 묶음 `motion`으로 두어 공식 스킬이 22개에서 23개가 됐다. Neon 전용인 `neon-postgres-egress-optimizer`는 넣지 않는다. 선택 묶음(`ops`: `vercel-optimize`, `motion`, `mobile`)과 `--optional` 동작도 같은 절에 있다. Neon 부가 기능은 Neon 프로젝트가 있어야 쓰므로 이 템플릿의 `ops`에는 넣지 않았다. `supabase/agent-skills`의 두 스킬(`supabase`, `supabase-postgres-best-practices`)은 이미 모두 설치하고 `bts-db`에 연결해 두었다.

## impeccable 훅 켜기 경로 (2026-09-28 추가)
### 발견
이 템플릿으로 만든 실사용 프로젝트 A에서 안내대로 Claude Code의 `impeccable` 스킬 인자로 `hooks on`을 실행했다. 그 뒤 Stop 훅이 끝날 때마다 `Cannot find module '<프로젝트>/.claude/skills/impeccable/scripts/hook.mjs'`로 실패했다. 편집 훅(PostToolUse)도 같은 명령이라 매번 조용히 실패했다. 이 기기에는 개인(전역) impeccable 스킬(`~/.claude/skills/impeccable`, Node 스크립트 방식)이 따로 있었고, Claude Code 2.1.283은 같은 이름의 프로젝트 스킬 대신 그 스킬을 불러왔다(불러온 스킬의 base directory로 확인). 그 스킬의 `hook-admin.mjs`는 훅 명령을 `${CLAUDE_PROJECT_DIR}/.claude/skills/impeccable/scripts/hook.mjs`로 적는다. 하지만 템플릿이 설치하는 impeccable(엔진 0.1.6)은 네이티브 엔진 실행기라 `scripts/hook.mjs`가 없다.

### 바꾼 것
`bts-ui`의 `SKILL.md`와 `references/impeccable-map.md`, 두 템플릿 README "설치한 뒤" 4번, `install.mjs`의 "다음 할 일", 루트 `AGENTS.md`·`README.md`를 고쳤다. 훅은 프로젝트 루트에서 `.agents/skills/impeccable/scripts/impeccable hooks on`으로 켜고 스킬 호출로는 켜지 않는다. 켠 뒤 `.claude/settings.local.json`의 훅 명령을 확인한다.

### 확인
| 검사 | 결과 |
|---|---|
| 실사용 프로젝트 A에서 `.agents/skills/impeccable/scripts/impeccable hooks on` | `.claude/settings.local.json`의 PostToolUse(`Edit\|Write`)와 Stop 명령이 `"${CLAUDE_PROJECT_DIR}/.claude/skills/impeccable/scripts/impeccable" hook`으로 바뀜. `.codex/hooks.json`은 원래부터 `.agents/skills/impeccable/scripts/impeccable hook`이라 그대로 |
| Stop 이벤트 JSON을 stdin으로 넣어 훅 명령 모의 실행 | exit 0 |
| PostToolUse 이벤트(`apps/web/src/app/layout.tsx` Edit)로 모의 실행 | exit 0, `additionalContext`에 스캔 결과(`No deterministic design-quality issues found`) |
| `node --test` (두 템플릿) | 각각 108 통과, 0 실패 |
| 실제 BTS 프로젝트(실사용 프로젝트 A 사본, `node_modules` 제외)에 `install.sh --skip-skills` | exit 0, "다음 할 일" 3번에 새 안내가 나옴. `install.mjs`는 두 템플릿이 바이트 동일(`shared-files.test.mjs`)이라 supabase 템플릿으로만 돌렸다 |

### 한계
- 개인 스킬이 같은 이름의 프로젝트 스킬보다 먼저 불리는 것은 이 기기의 세션 한 번에서 관찰했다. 공식 문서의 우선순위와 대조하지는 않았다.
- 새 BTS 프로젝트를 생성해 설치하는 전체 흐름은 다시 돌리지 않았다. 바뀐 것이 출력 문구 한 줄이라, 기존 BTS 프로젝트 사본에 `--skip-skills`로 설치해 출력만 확인했다.

## Biome 기준선 정리 (2026-09-28 추가)
### 발견
이 템플릿으로 만든 실사용 프로젝트 A에서 코드를 바꾸지 않았는데 검증 행의 `pnpm exec biome check .`가 실패해 원인부터 찾아야 했다. 원인은 세 가지다.
- BTS 3.44.1 생성물 자체가 Biome를 통과하지 못한다. 새로 만든 프로젝트에서 `biome check .`가 오류 83건을 낸다(대부분 포맷과 import 순서). `--write` 뒤에도 shadcn 컴포넌트의 a11y 오류 4건이 남는다(`label.tsx`의 `noLabelWithoutControl`, `input-group.tsx`의 `useSemanticElements` 2건과 `useKeyWithClickEvents` 1건).
- 다시 생성되는 파일이 검사 대상에 있다. drizzle-kit 마이그레이션(`snapshot.json`), `auth:generate`가 다시 쓰는 `schema/auth.ts`, varlock이 설치·실행 때마다 다시 쓰는 `apps/web/src/env.ts`와 `packages/db/src/env.ts`(git이 무시하는 파일)다. 한 번 포맷해도 `db:generate`나 `pnpm install` 뒤 지적이 돌아온다.
- 템플릿 파일(`files/scripts/*.mjs`, neon의 `skills.manifest.json`)이 BTS Biome 형식(한 줄 80자)과 달랐다. 설치기가 복사한 뒤 포맷하므로 설치한 프로젝트와 늘 달랐다. 그래서 `--diff`가 `dev-cycle.mjs`, `skills-setup.mjs`, `vercel-deploy.mjs`를 포맷 차이만으로 "유지(템플릿과 다름)"로 보고했다. `vercel-deploy.mjs`에는 `useTemplate` 정보 지적도 1건 있었다.

작업 중 하나를 더 찾았다. `--diff`는 문서에 "차이만 보여 준다"고 적혀 있었지만 없는 파일 복사, AGENTS.md·CLAUDE.md 덧붙임, `package.json`·`.gitignore`·`biome.json` 항목 추가, 스킬 링크, Codex 에이전트 동기화를 실제로 했다.

### 바꾼 것
- `install.mjs` `ensureBiomeConfig`(이전 이름 `ensureBiomeIgnores`): `biome.json`의 `files.includes`에 생성물 4개(`!packages/db/src/migrations`, `!packages/db/src/schema/auth.ts`, `!apps/web/src/env.ts`, `!packages/db/src/env.ts`)를 더한다. `overrides`로 shadcn의 `label.tsx`와 `input-group.tsx` 두 파일에서만 a11y 규칙 3개를 끈다. upstream 코드라 고쳐 써도 `shadcn add --overwrite`가 되돌리기 때문이다. 폴더 전체를 끄지 않은 것은 `bts-ui`가 프로젝트 컴포넌트도 `packages/ui`에 두게 하기 때문이다. 두 파일 중 하나를 가리키는 override가 이미 있으면 건드리지 않는다.
- `install.mjs` `--diff`: 파일을 쓰지 않는 미리 보기로 바꿨다. 템플릿과 다른 파일의 diff와 함께 복사할 파일, `package.json`·`.gitignore`·`biome.json`에 더할 항목을 "추가 예정"으로 보여 준다. 반영은 그 프로젝트의 라운드에서 `install.sh <프로젝트> --skip-skills`로 한다(루트 `AGENTS.md` "기존 프로젝트에 템플릿 갱신 반영", 두 템플릿 README, 루트 README 옵션 표).
- 새 프로젝트 절차: 커밋 전에 `pnpm check`로 BTS 코드의 포맷과 정렬(import, Tailwind 클래스)을 한 번 정리하고 `pnpm exec biome check .`가 exit 0인지 확인한다. 루트 `AGENTS.md` 8·9번, `README.md` 흐름도와 "직접 하기" 5번, 두 템플릿 README "설치한 뒤" 2번, `install.mjs` "다음 할 일" 1번에 넣었다. 설치기가 BTS 코드를 직접 고치지 않는 것은 "설치기는 기존 파일을 덮어쓰지 않는다"를 지키기 위해서다.
- `bts-verify`: 전체 lint가 exit 0에서 시작한다고 바꿨다. 기준과 비교하는 절차는 정리하지 않은 기존 프로젝트용으로 남겼다.
- 템플릿 파일 형식: 두 템플릿의 `files/scripts/dev-cycle.mjs`, `skills-setup.mjs`, `vercel-deploy.mjs`와 neon의 `skills.manifest.json`을 BTS Biome 형식으로 맞췄다. 공백과 쉼표만 바뀌었다. `vercel-deploy.mjs`의 문자열 연결 한 곳은 템플릿 리터럴로 바꿨다(만드는 문자열은 같다). 루트 `AGENTS.md` "템플릿 수정 규칙"에 이 형식 규칙을 적었다.

### 확인
| 검사 | 결과 |
|---|---|
| `node --test` (두 템플릿) | 각각 108 통과, 0 실패. biome 테스트는 생성물 제외, 두 파일 override, 기존 override 보존을 본다. `--diff` 테스트는 새 프로젝트에 돌려도 파일이 하나도 바뀌지 않고 추가 예정 항목이 나오는지 본다 |
| 새 BTS 3.44.1 프로젝트(README 명령 그대로, supabase·neon 각각)에 `install.sh --skip-skills` | 설치 전 `biome check .` 오류 83건 → 설치 뒤 `pnpm check` → `pnpm exec biome check .` exit 0. 경고 2건과 정보 1건은 남는다(BTS의 `dashboard.tsx` 쓰지 않는 매개변수와 빈 fragment, `mode-toggle.tsx` 쓰지 않는 import) |
| 이어서 `db:generate`, `pnpm env:generate` | 각각 뒤에 `biome check .` exit 0 (생성물 제외가 동작) |
| `pnpm check-types`, `pnpm build`(supabase) | 둘 다 exit 0 |
| 커밋 뒤 두 번째 설치 | exit 0, "복사 0, 동일 28, 유지(템플릿과 다름) 없음", 작업 트리 변경 0. 전에는 neon의 `skills.manifest.json`이 "템플릿과 다름"으로 나왔다 |
| 실사용 프로젝트 A 사본에 `--diff` | 파일을 쓰지 않음. 전에는 `scripts/*.mjs` 3개가 포맷 차이로 나왔다. 이제 `dev-cycle.mjs`, `skills-setup.mjs`는 동일하고 `vercel-deploy.mjs`는 실제로 바뀐 한 줄만 나온다. `biome.json 추가 예정`에 생성물 4개와 override가 나온다 |
| 같은 사본에 `install.sh --skip-skills` 뒤 `biome check --write .` | 바뀐 설정 파일은 `biome.json`뿐이고, `biome check .` exit 0(경고 2, 정보 2) |
| 독립 리뷰(`oh-my-claudecode:code-reviewer`, 읽기 전용) | COMMENT, high 0. medium 2건(실사용 프로젝트 A R01 계획의 기대값, `--diff`가 규칙 끄기까지 적용)과 low 4건(override 범위, 함수 이름, 문장 쉼표, 문서 표기)을 반영했다. 재포맷이 공백·쉼표만 바꿨는지는 리뷰어가 HEAD 파일을 같은 Biome로 포맷해 바이트 비교로 확인했다 |

### 한계
- 사용자가 설치기가 넣은 override를 지우면 다음 설치 때 다시 들어간다. `files.includes` 항목과 같은 방식이다.
- `files/`의 형식 규칙은 테스트가 검사하지 않는다(이 저장소에 Biome가 없다). 규칙을 어기면 다음 `--diff`에 포맷 차이로 드러난다.
- BTS 버전을 올리면 생성 직후 오류 수와 남는 a11y 지적이 달라질 수 있다. 버전을 올릴 때 이 절을 다시 확인한다.

## 릴리스와 버전 관리 (2026-09-28 추가)
### 요청
이 템플릿으로 만든 프로젝트도 배포할 때 `release/`에 릴리스 노트를 쓰고 GitHub Release를 만들며, 버전을 관리한다. 지침만으로는 에이전트가 빠뜨릴 수 있으므로 스크립트가 막게 한다.

### 바꾼 것
- `files/scripts/release.mjs`(공유, 새 파일): 이 저장소의 `scripts/release.mjs`를 프로젝트용으로 옮겼다. `pnpm release [--title]`가 마지막 `vX.Y.Z` 태그 이후 커밋으로 다음 버전(SemVer. 첫 릴리스 `0.1.0`, `!`·`BREAKING CHANGE:`는 major, `feat:`는 minor, 그 밖은 patch)을 정하고 `release/<YYYYMMDD-HHmm>-<제목>.md`에 노트를 쓴다. `pnpm release --publish <노트>`는 노트와 루트·`apps/web`의 `package.json` `version`을 `chore(release): vX.Y.Z`로 커밋하고, annotated 태그를 달아 기본 브랜치와 함께 `push --atomic`한 뒤 `gh release create -R <owner/repo> --verify-tag --notes-file`로 GitHub Release를 만든다. 원본과 다른 점은 다음과 같다.
  - 기본 브랜치를 `.dev-cycle.json`에서 읽는다(`master` 프로젝트).
  - 커밋하기 전에 노트 위치(`release/` 아래 `.md`), GitHub `origin`, `gh auth status`, 같은 버전 태그(시작할 때 `origin`의 태그를 받는다)를 확인한다.
  - 커밋·태그·push 중 어디서 실패해도 커밋, 태그, `version`을 되돌리고 노트는 추적하지 않는 파일로 남긴다. Release만 실패하면 exit 2와 다시 만들 명령을 출력한다.
  - 태그 이후 머지 커밋만 있으면 그 머지를 노트에 적는다(릴리스할 수 없어 배포가 막히지 않게).
- `files/scripts/vercel-deploy.mjs`(공유): production은 HEAD에 `v*` 태그(여럿이면 가장 높은 버전)가 있고, `origin`의 그 태그가 HEAD를 가리키고(`git ls-remote`, annotated 태그는 `^{}` 줄), `gh release view -R <owner/repo>`가 성공해야 배포한다. 배포 요약에 릴리스 버전을 붙인다. develop은 바뀌지 않았다.
- `install.mjs`(공유): `package.json`에 `release` 스크립트를 더한다.
- 문서: `bts-deploy`에 "릴리스 (production 배포마다)" 절(버전 규칙, 노트 검수, 사용자 동의 뒤 발행, 실패 처리), 배포 순서·되돌리기·보고·git 연결 경고. `AGENTS.md`(스킬 표, 불변식, 서브에이전트에 맡기지 않음), `CLAUDE.md`(릴리스 발행 동의를 AskUserQuestion으로), 두 템플릿 README, 루트 README(구성 표, 도식, 배포 절, 디렉터리), 루트 `AGENTS.md` 10번 보고 항목.
- 순서를 "배포 전 릴리스"로 정했다(사용자 선택). 배포 스크립트가 릴리스 없는 production을 막으므로 빠질 수 없다. 배포 뒤에 릴리스하면 에이전트가 배포 뒤 멈출 때 빠진다. 대신 배포가 실패한 릴리스도 남는다. 고친 코드는 새 patch 릴리스로 배포한다.

### 확인
| 검사 | 결과 |
|---|---|
| `node --test` (두 템플릿) | 각각 117 통과, 0 실패. 새 `release.test.mjs` 8개(버전 규칙, 노트, `setVersion`, 발행 전체 흐름과 두 번째·머지만 있는 릴리스, 커밋 전 검사 6가지, 이미 있는 태그, push·Release 실패 되돌리기)와 배포 게이트 테스트 1개(태그 없음, 로컬에만 있는 태그, 옮긴 태그, Release 없음, GitHub가 아닌 origin, develop은 보지 않음) |
| 루트 `node --test scripts/release.test.mjs` | 6 통과 |
| BTS 3.44.1 사본(실사용 프로젝트 A 첫 커밋, 기본 브랜치 `master`)에 `install.sh --skip-skills` | exit 0. `package.json scripts 추가`에 `release`. 다시 `--diff`: "동일 29, 유지(템플릿과 다름) 없음". 설치한 `scripts/*.mjs` `biome check` exit 0 |
| 같은 사본에서 `pnpm release` → `--publish` (origin은 GitHub 주소, fetch·push는 `insteadOf`로 로컬 bare 저장소, `gh`는 스텁) | v0.1.0: 노트(커밋 본문 bullet 포함), 노트와 루트 `package.json`(`version` 추가) 커밋, `master`와 태그 push, `gh release create`. fix 커밋 뒤 v0.1.1: 두 `package.json`이 0.1.1이고 바뀐 줄은 `version` 한 줄(원래 들여쓰기 유지). 새 커밋이 없으면 "릴리스할 커밋이 없다" |
| 같은 사본에서 게이트 (Vercel CLI는 스텁) | 릴리스 전 `pnpm vercel:deploy production --check`는 "HEAD에 릴리스 태그가 없다"로 exit 1. feat 커밋을 v0.2.0으로 발행한 뒤 exit 0 "릴리스 v0.2.0". `gh release view v0.2.0 -R example/relverify` 호출 |
| 독립 리뷰 (`oh-my-claudecode:code-reviewer`, 읽기 전용) | 1차 REQUEST CHANGES. high 1건(버전 파일을 쓴 뒤 커밋·태그 단계에서 실패하면 되돌리지 않음), medium 4건(게이트가 태그 이름만 믿음, `gh`에 저장소를 지정하지 않음, Vercel git 연결이 게이트를 우회, 성공 메시지가 `--check`를 건너뜀), low 6건(노트 위치, `--publish=`, 복구 명령의 제목·인용, 머지 커밋만 있을 때 막힘, 태그를 받지 않음)을 모두 반영하고 테스트를 더했다. 재검토 APPROVE. 새로 나온 low 2건(터미널 없는 세션에서 원격 호출이 멈출 수 있음, `vercel-deploy.mjs`가 `release.mjs`를 import함)도 반영했다(자격 증명·ssh 확인을 묻지 않고 조회는 30초 제한, 두 파일이 한 쌍이라는 주석) |

### 한계
- 실제 GitHub Release 생성과 Vercel production 배포는 하지 않았다(외부에 공개된다). `gh`와 Vercel CLI는 스텁으로, push는 로컬 bare 저장소로 확인했다.
- 게이트는 태그와 GitHub Release가 있는지만 본다. 노트를 사용자가 읽을 설명으로 다듬는 일은 `bts-deploy` 절차(에이전트 검수와 사용자 동의)가 맡는다.
- `vercel deploy`를 직접 실행하거나 Vercel git 연결(push마다 자동 배포)을 켜면 게이트를 거치지 않는다. 스킬은 둘 다 쓰지 않게 하고, git 연결을 켤 때는 이 점을 알리게 한다.
- `origin`이 GitHub가 아니면 production을 배포할 수 없다.
- 확인하는 동안 실수로 `origin`의 GitHub 주소(존재하지 않는 저장소)로 `ls-remote`가 한 번 나갔다. 조회만 실패했고 다른 영향은 없다.

## 라운드 마무리와 Node 24 (2026-09-28 추가)
### 요청
실사용 프로젝트 A 세션이 사용자 결정(2026-09-28, v0.2.2 기준)을 전해 세 가지를 맡겼다. 새 프로젝트가 실사용 프로젝트 A의 R01 같은 정비 라운드 없이 시작하게 하는 것이 목적이다.
1. 모든 대조표에 `[confirm] 사용자 확인` 행을 붙이고, audit이 그 행의 N/A를 거부한다.
2. 라운드 종료 기본값: 사용자 확인 → audit·close → 커밋·push → 릴리스 → production 배포. 배포는 사용자가 건너뛸(PASS) 수 있다.
3. Node 24 이상. Node 20은 2026-04-30에 지원이 끝났고, Vercel은 2026-10-01부터 Node 20으로 새 배포를 만들지 않는다([Vercel changelog](https://vercel.com/changelog/node-js-20-is-being-deprecated)).

### 바꾼 것
- `files/docs/dev-workflow.md`: `### 공통`에 `[confirm] 사용자 확인 (… N/A 불가) → 확인한 내용과 날짜` 행을 더했다. 작성 규칙에 N/A 불가와 종료 절차 위치를 적었다. 실사용 프로젝트 A R01 계획의 F "원본 대조" 행은 그 프로젝트 전용이라 넣지 않았다.
- `files/scripts/dev-cycle.mjs`(공유):
  - `confirmProblem(row)`: 행 문구가 `[confirm]`으로 시작하고 증거가 건너뛰기 표시면 문제로 본다. 건너뛰기 표시는 N/A 변형(`NA`, `N / A`, `**N/A**`, `(N/A)`), `PASS`, `blocked`, `미실행`, `TODO`, `TBD`, `pending`, `skip…`, `생략`, `해당 없음`, `대기`로 시작하는 증거와, `대기`나 `대기 중`으로 끝나는 증거다. 대소문자와 앞의 따옴표·백틱·강조 기호는 따지지 않는다. `blocked`·`미실행`도 막으므로 `close --partial`로 넘길 수 없다.
  - audit과 status가 이 검사를 `evidenceProblem`보다 먼저 한다. 그래서 사유 없는 `N/A`도 확인 행 규칙으로 알리고, status의 "다음" 행도 건너뛴 확인 행을 가리킨다. 다른 행의 `N/A: 사유`는 그대로 허용한다.
  - `table --upgrade`: 새 케이스에 없는 이전 행과 직접 추가한 행을 표 끝이 아니라 `[confirm]` 행 바로 앞에 둔다. 확인 행이 늘 마지막에 온다.
- `bts-dev-cycle` 5절(두 템플릿): 다음 순서로 마무리한다.
  1. OMC·OMX 모드 취소
  2. audit으로 `[confirm]`만 남았는지 확인
  3. 사용자 확인. 에이전트가 스스로 넘기지 않는다. 사용자가 보지 않고 닫자고 하면 그 말과 날짜를 적는다.
  4. audit 통과
  5. 마무리 선택
  6. close. 닫기 전에 `git diff --name-only <base>`와 추적하지 않는 파일로 이 라운드의 파일 목록을 적는다. `case`는 규칙에 걸린 파일만 보여 주므로 쓰지 않는다.
  7. 커밋·push. 그 목록 가운데 이 라운드 파일과 `tasks/`만 커밋하고, Conventional Commits 제목과 본문 bullet로 쓴다.
  8. 고르면 `bts-deploy` 배포 순서. `--check`에서 릴리스만 남으면 릴리스(발행 동의)를 하고, 운영 DB는 따로 동의를 받고, 배포 뒤 `get-session`을 확인한다.
  9. 보고
- 5절의 마무리 선택:
  - 먼저 배포할 수 있는지 본다. 조건은 기본 브랜치, GitHub `origin`, `gh auth status`, 그리고 `pnpm vercel:deploy production --check`에서 커밋 전 변경과 릴리스 말고 모두 통과하는 것이다. 하나라도 안 되면 묻지 않고 커밋·push만 한다. 이때 `배포 PASS: 준비 안 됨(<항목>)`을 적는다.
  - 모두 되면 한 번 묻는다. 선택지는 "릴리스하고 production 배포 (기본)"와 "커밋·push만 (배포 PASS)"이고, PASS를 고르면 `배포 PASS: 사용자 선택`을 적는다.
  - Vercel Git 연결로 production 자동 배포를 켜 둔 프로젝트는 push가 곧 배포라 검사와 "DB 먼저"를 건너뛴다. 그래서 준비 안 됨으로 본다. 묻지 않고 커밋만 하고 `배포 PASS: 준비 안 됨(Git 자동 배포)`을 적는다. 연결 여부는 `docs/adr/`의 기록으로 판단한다. `bts-deploy`에 연결과 자동 배포 결정을 ADR로 남기라고 적었다.
- `references/process-routing.md`(공유): 마무리 행을 `bts-dev-cycle` 5절로 바꿨다. 구현 스킬이 끝에서 부르는 `finishing-a-development-branch`를 라운드 끝으로 보지 않는다는 규칙을 더했다.
- `files/AGENTS.md`(두 템플릿):
  - 코드 변경 절차를 고쳤다.
  - 보안 불변식은 두 가지를 바꿨다. 운영 DB는 라운드 끝 배포에서 적용 목록을 보고 동의할 때를 포함한다. 커밋, push, 릴리스, 배포는 사용자가 요청할 때와 라운드 끝에만 한다.
  - 에이전트 절에는 라운드 끝 마무리 선택도 사용자 확인이 필요하다고 적었다.
  - 줄 수는 neon 107, supabase 108이다.
- `files/CLAUDE.md`(공유): AskUserQuestion으로 물을 것에 라운드 끝 마무리를 더했다.
- `bts-deploy`(공유):
  - 배포 시점에 라운드 끝 선택을 더하고, 커밋 시점에 관한 두 문장을 맞췄다.
  - git 연결과 production 자동 배포 결정은 `docs/adr/`에 남긴다고 적었다.
  - 준비 3번에 Vercel 프로젝트 Node.js 24.x를 적었다.
  - exit 2의 흔한 원인에 Node.js 20.x를 더했다.
- `bts-db/references/migration-flow.md`(두 템플릿): 운영 적용 동의에 라운드 끝 배포를 포함했다.
- `bts-verify`(두 템플릿): 완료 보고에 `[confirm]` 행은 예외라고 적었다. `references/evidence.md`에 사용자 확인 증거 형식과 "증거가 아닌 것"(확인 행의 건너뛰기 표시)을 더했다.
- `evals/bts-dev-cycle/evals.json` eval 3:
  - 원래는 비대화형 실행에서 `close`까지 기대했다.
  - 이제는 audit이나 status로 `[confirm]`만 남았는지 본다. 확인 행을 N/A나 에이전트 자신의 확인으로 채우지 않는다. 사용자에게 확인을 요청하고, 확인 전에는 완료라고 하거나 닫지 않는다.
- Node 24: 두 템플릿 README 준비물, 루트 README 배지와 빠른 시작, 루트 `AGENTS.md` 3번을 올렸다. `engines`와 `.nvmrc`는 넣지 않았다.
  - BTS 3.44.1이 만든 `package.json`에는 `engines`가 없다(실사용 프로젝트 A로 확인). 설치기는 `package.json`에 scripts만 더한다.
  - Vercel에서 쓰는 버전은 Project Settings가 정하고, `engines.node`는 그 설정을 덮어쓴다. 그래서 `bts-deploy`에 Project Settings 24.x를 적는 것으로 했다.
- 문서:
  - 루트 README: 빠른 시작 안내, "그냥 AI에게 맡길 때와 다른 점" 표, 요청 흐름·전체 흐름·dev-cycle 라운드 도식, `bts-deploy` 행, 배포 절, "사용자가 결정하는 일" 문장.
  - 템플릿 README: "설치한 뒤" 6번, Vercel 배포 절.

### 확인
| 검사 | 결과 |
|---|---|
| `node --test` (두 템플릿) | 각각 123 통과, 0 실패. 새로 더하거나 고친 테스트는 다음과 같다. `confirmProblem` 단위(건너뛰기 표시 22가지 거부, 실제 확인과 "NAS"·"Passkey"로 시작하는 증거, 문구 중간의 `[confirm]`, 다른 행의 N/A 허용). audit·status 통합(A 대조표를 모두 `N/A: 사유`로 채우고 확인 행은 `N/A`이면 문제는 확인 행 1건뿐이고 status의 다음 행이 그 행, close 거부, 확인을 채우면 통과). 확인 행의 `blocked`·`미실행`은 `close --partial`(함수와 CLI)로도 닫히지 않음. 모든 케이스 대조표(auth·H 추가 포함)가 확인 행 하나로 끝남. `--upgrade` 뒤 수동 행이 확인 행 바로 앞. 문서 일관성(5절의 선택지·PASS 기록·준비 조건·Git 연결과 ADR·파일 목록, AGENTS.md, CLAUDE.md, `bts-deploy`, process-routing 마무리 행, `bts-verify`와 evidence.md의 확인 행 예외). README 준비물 Node 24 |
| 변이 검사 | `confirmProblem`이 늘 `null`을 돌려주게 하면 새 audit 테스트 2개, `--upgrade`의 splice를 push로 되돌리면 table 테스트 1개, `rowProblem` 순서를 바꾸면 audit 테스트 1개가 실패했다. 모두 되돌린 뒤 통과 |
| `dev-cycle.mjs` 형식 | 실사용 프로젝트 A의 `biome.json`과 Biome 2.5.14로 scratchpad 사본에 `biome check --write`: "No fixes applied", 원본과 같음 |
| 독립 리뷰 (`oh-my-claudecode:code-reviewer`, 읽기 전용) | 1차 REQUEST CHANGES: high 1, medium 7, low 9. 반영한 것은 다음과 같다. Git 자동 배포가 켜진 프로젝트의 push, 질문 전 배포 준비 확인, `--check` 뒤 릴리스, process-routing 마무리 행, 확인 행의 `blocked`·`미실행`과 `--partial` 우회, 모드 취소 시점, 확인 전 audit, `--upgrade` 행 순서, 사유 없는 N/A 메시지, 건너뛰기 변형, 커밋 범위, Codex 표현, 운영 DB 동의 문구, 남은 옛 문장, README 순서, 테스트 보강. 2차 REQUEST CHANGES: 스크립트와 테스트는 승인. 남은 지적은 Git 자동 배포에서 기본 선택도 먼저 push하는 문제(high), 커밋 목록을 `case`로 뽑으면 규칙 밖 파일(README, CONTEXT.md 등)이 빠지는 문제(medium, 재현됨), low 5건이다. Git 자동 배포는 준비 안 됨으로 처리하고 ADR 기록으로 판단하게 했다. 파일 목록은 닫기 전 `git diff --name-only <base>`와 추적하지 않는 파일로 뽑게 했다. 대기 표시(`TODO`, `pending`, `대기`)를 거부하고, 문서 표현을 코드와 맞추고, `bts-verify` 예외를 추가했다. 수정한 확인 행이 두 번 옮겨지는 low 1건은 설계상 허용이라 그대로 두었다. 3차 APPROVE(high·medium 없음) |

### 한계
- 러너가 강제하는 것은 `[confirm]` 행의 건너뛰기 표시 거부와 행 순서뿐이다. 준비 조건 확인, 마무리 질문, PASS 기록, 커밋 범위, 릴리스·배포 순서는 스킬 절차다. 에이전트가 따르는지는 eval을 다시 돌려 재지 않았다(eval 3의 기대값만 바꿨다).
- 사용자가 실제로 확인했는지는 러너가 알 수 없다. 에이전트가 확인 행을 거짓 문장으로 채우면 리뷰와 사용자 보고로만 드러난다.
- 기본값이 "릴리스하고 production 배포"라 문서만 고친 A 라운드도 기본 선택이면 patch 릴리스와 배포가 된다(사용자 결정대로). 매 라운드 묻기 때문에 PASS를 고를 수 있다.
- Vercel Git 연결 여부는 CLI 출력이 아니라 `docs/adr/`의 기록으로 판단한다. 이 변경 전에 Git을 연결한 프로젝트는 기록이 없어 자동 배포가 꺼진 것으로 보게 된다. 템플릿 갱신을 옮길 때 연결 여부를 확인해 ADR을 남긴다.
- `대기`나 `대기 중`으로 끝나는 증거는 실제 확인이어도 거부된다(예: `…확인(날짜), 배포는 대기`). 확인 문장을 다르게 끝맺으면 된다.
- `install.mjs`와 `skills-setup.mjs`는 바뀌지 않아 실제 BTS 프로젝트 설치는 다시 하지 않았다. 바뀐 파일은 모두 기존 프로젝트에 이미 있는 파일이다. 그래서 `install.sh --diff`에서 "유지(템플릿과 다름)"로 나오고 직접 옮겨야 한다.

## 외부 스킬 업데이트 (2026-09-28 추가)
### 요청
- 템플릿이 설치하는 공식 외부 스킬(`skills.manifest.json`)의 새 버전을 스킬을 쓸 때 주기적으로 한 번에 확인하고, 있으면 모두 업데이트하게 한다. 템플릿으로 만든 앱에서도 스킬이 계속 최신이어야 한다. gstack-upgrade(주기 확인, 묻기·자동·미루기·끄기)를 참고한다.
- vercel-labs/next-skills의 `handle-legacy-api` 브랜치에 남은 `next-best-practices`, `next-cache-components`, `next-upgrade`를 받아 두고 계속 업데이트하며 쓸 만한지 검토한다.

### 바꾼 것
- `files/scripts/skills-setup.mjs`(공유), `--update` 모드(`pnpm skills:update`):
  - 매니페스트 기본 스킬과, 선택 묶음 중 설치한 스킬을 확인한다. 저장소마다 GitHub `git/trees/HEAD?recursive=1`을 한 번 부르고, `skills-lock.json`의 `skillPath` 폴더와 설치본(`.agents/skills/<이름>`)을 파일별 git blob SHA로 비교한다.
  - skills CLI가 복사하지 않는 것(`metadata.json`, `.git`, `__pycache__`, `__pypackages__`)과 링크 자리(디렉터리 링크면 그 아래)는 비교하지 않는다. 로컬에만 있는 숨김 파일(`.DS_Store`, `.omc/`)도 비교하지 않는다.
  - 상태는 최신, 업데이트, 빠짐, 원격에서 없어짐(폴더가 없거나 저장소가 404) 네 가지다. 폴더만 옮긴 스킬은 업데이트로 보고 다시 설치한다.
  - 적용하면 업데이트와 빠진 스킬만 설치(`setup`과 같은 `npx skills@1.7.0 add … --agent <매니페스트 agents>`)하고 한 번 더 비교한다. 원격에서 없어진 스킬은 지우지 않는다.
  - 옵션은 `--check`(확인만), `--if-due`(하루 한 번, 알릴 것만 출력, 설치 안 함), `--snooze`(24시간 → 48시간 → 7일, 목록이 바뀌면 다시 알림), `--mode ask|auto|off`다.
  - 확인 결과와 설정은 `node_modules/.cache/skills-update.json`에 둔다. 저장소 일부가 실패하면 나머지 결과를 기록하고, 실패한 저장소의 스킬은 이전 결과를 유지한 채 한 시간 뒤 다시 본다. `UPSTREAM_GONE`은 목록이 바뀔 때만 알린다. 외부 스킬이 하나도 설치되지 않았으면(`--skip-skills`) 업데이트로 알리지 않는다.
  - exit는 0 최신, 1 남은 것 있음, 2 설치 실패나 실행 오류, 3 확인 실패다.
  - 토큰은 `gh auth token --hostname github.com`이 있으면 쓰고, 401이면 토큰 없이 다시 읽는다.
- `files/scripts/dev-cycle.mjs`(공유): `status`는 진행 중인 라운드가 없고 `skills-setup.mjs`가 `--if-due`를 알 때만(옛 판은 모르는 옵션을 무시하고 설치를 해 버린다) `--update --if-due`를 불러 출력 줄을 붙인다(`--json`은 `skillsUpdate`). 확인 스크립트가 실패하면 `CHECK_FAILED`로 알린다. 출력 줄은 `→ 라운드를 열기 전에 bts-skills-update 스킬 1절을 따른다`로 끝난다.
- `install.mjs`(공유): `package.json` scripts에 `skills:update`를 더한다.
- 새 스킬 `files/.agents/skills/bts-skills-update/SKILL.md`(공유, 본문 58줄):
  - 명령과 exit 코드를 적었다.
  - 직접 요청이면 묻지 않고 업데이트하고, 확인만 요청하면 결과를 보고한 뒤 묻는다. 알림 줄별 처리와 `mode=ask` 선택지 네 개(지금 업데이트, 항상 자동, 나중에, 다시 묻지 않기)를 적었다.
  - 원격에서 없어진 스킬은 원본 README에서 옮긴 곳을 찾아 대체 후보를 알린다.
  - 업데이트는 케이스 H 라운드로 한다. `.md`가 아닌 변경(훅이 바로 실행하는 스크립트)과 되돌아가는 로컬 수정을 검토하고 `[confirm]`에서 보여 준다.
  - `npx skills update`를 쓰지 않는 이유와 대상이 아닌 것을 적었다.
- `bts-dev-cycle` 0절(두 템플릿): 1단계의 `status`가 스킬 업데이트도 확인하고, 알림 줄이 나오면 라운드를 열기 전에 `bts-skills-update` 1절을 따르게 했다.
- `files/AGENTS.md`(두 템플릿, 줄 수 그대로), `files/CLAUDE.md`(공유, AskUserQuestion 목록), 템플릿 README(설치되는 것, 명령 표), 루트 README(스킬 8개, 빠른 시작 안내와 예시 프롬프트, bts 스킬 표, 스킬 명령, 스킬 설치 구조 문단과 도식, 디렉터리 구조).
- `evals/bts-skills-update/`(`evals.json` 3개, `triggers.json` 18개, 공유 `seed.sh`). 다른 스킬 eval이 업데이트 알림에 걸려 멈추지 않게 공유 `evals/seed/apply.sh`가 fixture의 확인을 끈다.

### next-skills 검토
- `main`은 README만 남기고 "Next.js 스킬은 vercel/next.js로 옮겼다"고 안내한다(2026-06-16 제거, 06-22 안내).
  - `next-cache-components`는 `next-cache-components-optimizer`, `next-cache-components-adoption`으로 나뉘었다. 둘 다 이미 매니페스트에 있다.
  - `next-best-practices`는 스킬이 아니게 됐다. Next.js 16.3+의 번들 문서(`next/dist/docs/`)와 `next dev`가 만드는 `AGENTS.md`/`CLAUDE.md`가 대신한다.
  - `next-upgrade`도 스킬이 아니게 됐다. 번들 문서의 업그레이드 가이드와 `npx @next/codemod@latest upgrade`가 대신한다.
- `handle-legacy-api`는 병합되지 않은 브랜치다. 마지막 커밋은 2026-02-16("mirgate unstable_cache to cc api")이고, 제거 전 `main`보다 1 앞서고 4 뒤처진다.
- 생성 앱(실사용 프로젝트 A)은 Next.js 16.3.6이다. `apps/web/AGENTS.md`에 `next dev`가 쓴 규칙 블록이 있고, 번들 문서에 `upgrading/`, `migrating-to-cache-components.md` 등이 있다. `bts-web`은 이 두 가지를 매번 읽는다.
- 결론: 받지 않는다.
- 재검토(사용자 요청: 내용이 좋아 보이니 받아서 검토): `next-cache-components`는 adoption·optimizer가 있어 빼고(사용자 결정), `next-best-practices`만 받았다.
  - 설치: `npx skills@1.7.0 add 'vercel-labs/next-skills#handle-legacy-api' --skill next-best-practices`가 fixture 사본에 설치되고 lock에 `"ref": "handle-legacy-api"`를 남긴다. `skills:update`는 기본 브랜치만 보므로 쓰려면 `ref` 지원을 더해야 한다.
  - 내용: 독립 리뷰(Opus 5.5)가 참고 문서 19개를 설치된 Next 16.3.6 번들 문서와 대조했다. 16.3에서 코드가 깨지거나 보안 결함이 생기는 high 8건, oRPC 규칙과의 충돌 2건이 나왔다. 그중 4건은 Next 소스로 직접 다시 확인했다.
    - `export const proxyConfig`: `next/dist`에서 읽는 곳이 0건이다. 번들 문서는 `export const config`다.
    - `revalidateTag('posts')`: `revalidate.d.ts`에서 `profile`이 필수다.
    - Server Component 안의 `dynamic(…, { ssr: false })`: `lazy-loading.md`에서 "not allowed"다.
    - `unauthorized()`: `experimental.authInterrupts`가 필요한데 스킬에 언급이 없다.
    - 충돌: `data-patterns.md`가 변경은 Server Action으로, 조회는 Route Handler와 `useEffect` fetch로 하라고 한다(`bts-web`은 oRPC와 TanStack Query만 쓴다). 소유권 검사 없는 Server Action 예시도 있다.
    - 나머지는 대부분 번들 문서, `next-dev-loop`, `vercel-react-best-practices`와 겹친다.
  - 결론: 설치하지 않는다(기본 설치와 선택 묶음 모두). 번들 문서는 설치한 `next`와 함께 갱신되지만, 이 브랜치는 멈춰 있고 이미 16.3과 어긋난다.
  - 대신 `bts-web`의 공식 스킬 연결 표 아래에 한 줄을 더했다(사용자 선택): 외부 스킬 지침이 번들 문서와 다르면 번들 문서를 따르고 어긋난 곳을 보고한다. description은 그대로라 트리거를 다시 재지 않았고, 행동 eval도 돌리지 않았다. 두 템플릿 `node --test`는 139 통과다.
  - 브랜치가 갱신되지 않으므로 주기 업데이트의 의미가 없다.
  - 설치한 Next 버전에 맞춘 공식 문서와 어긋나는 옛 지침(예: v15 기준 codemod 목록)이 섞일 수 있다.
  - 새 확인 기능은 이런 스킬을 "원격에서 없어짐"으로 알리고, 원본 README의 이전 안내를 찾아 대체 후보를 제시한다(eval 3).

### 확인
| 검사 | 결과 |
|---|---|
| `node --test` (두 템플릿) | 각각 139 통과, 0 실패(이전 123). 더한 테스트: 판정 단위(복사 제외, 숨김, `__pycache__`, 파일·디렉터리 링크, 옮김, 루트 이동, 없어짐, 소문자 `skill.md`). `--check`(선택 묶음은 설치한 것만, 저장소당 한 번, 토큰 없으면 인증 헤더 없음). `--if-due`(하루 캐시, 미루기 3단계와 목록 변경, auto·off, 잘못된 mode). 일부 저장소 실패(403·네트워크 오류·깨진 lock은 CHECK_FAILED와 1시간 재시도, 나머지 결과 유지, 미루기 유지, 복구 뒤 없어짐 재알림 없음, 매니페스트에서 뺀 스킬은 이전 결과에서도 뺌, 확인한 스킬이 모두 빠짐이어도 이전 결과 유지). 404는 없어짐. 미설치 프로젝트는 조용함. 적용(바뀐 것만 매니페스트 agents로, Codex 전용은 Claude 링크 없음, 없어진 스킬 유지, 미루기 삭제, Windows 거부). 설치 실패 exit 2, 재확인 실패 exit 3과 캐시. CLI 연결. `dev-cycle status` 연동(라운드 없을 때만, `--json`, 옛 스크립트는 실행 안 함, 실패 알림). 설치 테스트는 확인을 끄고 네트워크를 쓰지 않음. 문서 일관성(0절, 스크립트 출력 토큰과 스킬, AGENTS.md, README). 매니페스트 source는 owner/repo |
| 변이 검사 | 1차 9가지(숨김·metadata·링크 무시, 하루 캐시, 미루기, 미루기 단계, 없어진 스킬 설치, 실패를 최신으로 기록, 선택 묶음 전부 확인)와 2차 12가지(로컬 복사 제외, 디렉터리 링크, `skillPath`, 루트 이동, 404, 실패 시 결과 버림, 없어짐 매번 알림, 실패해도 하루 캐시, exit 3, 오류의 저장소명, 라운드 중 확인, status 연동 제거)와 3차 2가지(이전 결과의 매니페스트 필터, 일부 실패 때 미설치 판정)를 모두 테스트가 잡았다 |
| 형식 | `skills-setup.mjs`, `dev-cycle.mjs`를 fixture의 `biome.json`으로 `biome check --write`한 뒤 가져왔다. 두 템플릿의 공유 파일은 바이트가 같다 |
| 실제 BTS 설치 (scratchpad fixture) | README 명령으로 BTS 3.44.1 생성 → `install.sh`(exit 0, `skills:update` 스크립트 추가, 스킬 39개 설치) → `--skip-skills`로 새 스킬 추가와 링크. GitHub 실측: `pnpm skills:update --check` 39개 모두 최신, 2.4초. 한 스킬을 고친 뒤 `pnpm dev-cycle status`가 `UPDATE_AVAILABLE … vercel-composition-patterns`를 붙이고, `pnpm skills:update`가 그 스킬만 다시 설치(7초, exit 0), 다시 확인하니 최신. 같이 넣은 `skill-creator/scripts/__pycache__`는 업데이트로 잡지 않았다. Codex 전용 스킬은 `.claude/skills`에 생기지 않았다. 미루기, 끄기, 캐시도 실제 프로젝트에서 확인했다. 확인 중 shadcn/ui 조회가 한 번 일시 실패했고 그 저장소만 `CHECK_FAILED`, 나머지는 결과대로 나왔다 |
| neon 저장소 | 템플릿 설치는 하지 않았다. `neondatabase/agent-skills` 트리가 잘리지 않고(306항목) 매니페스트 스킬 폴더가 모두 있음을 확인했다 |
| 동작 eval (supabase fixture, 조건마다 1회) | 아래 표 |
| 독립 리뷰 (`oh-my-claudecode:code-reviewer`, 읽기 전용) | 1차 REQUEST CHANGES(high 1, medium 7, low 8). 반영: 로컬 `__pycache__`·`metadata.json` 오탐(실데이터로 재현), 디렉터리 링크, 404와 일부 실패, 없어짐 반복 알림, 재확인 실패 뒤 캐시와 exit, 스크립트 변경 검토, eval 재현 시드, `skillPath` 비교, 오류 메시지, 토큰 호스트, 로컬 수정 안내, 미루기 표, source 형식. 2차 REQUEST CHANGES(high 1, medium 4, low 5). 반영: 옛 `skills-setup.mjs`와 새 `dev-cycle.mjs`가 섞이면 `status`가 전체 설치를 실행하는 문제(재현), 설치 테스트의 실제 GitHub 호출, 일부 실패 때 미루기가 풀리는 문제, 다른 eval의 업데이트 알림, exit 2 설명, 확인 스크립트 실패 알림, 응답 본문 오류, 미설치 프로젝트. 3차 APPROVE(high·medium 없음, `VERIFICATION.md`를 쓰는 조건). 남은 low 4건 중 매니페스트에서 뺀 스킬의 이전 결과, 일부 실패 때 미설치 판정, `seed.sh` 실행 순서는 반영했다. 실패한 확인 스크립트가 먼저 낸 출력을 버리는 문제는 `--if-due`가 끝에서만 출력해 지금은 잃는 것이 없어 두었다 |

| eval | 스킬 있음 1차 | 2차 | 3차 | 스킬 없음 |
|---|---|---|---|---|
| 1. 업데이트 요청 | 5/5 | 1/5 | 5/5 | 4/5 |
| 2. 다른 작업 중 주기 알림 | 2/4 | 4/4 | 2/4 | 2/4 |
| 3. 원격에서 없어진 스킬(next-best-practices) | 5/5 | 6/6 | 6/6 | 4/6 |

- 스킬 없음(옛 템플릿)은 1차에 한 번 돌리고 2·3차에 그대로 썼다. 두 실행 모두 `npx skills update -p -y`로 39개를 다시 설치해 평균 456초가 걸렸다(스킬 있음 146~193초). eval 1에서는 Codex 전용 스킬 링크 16개가 `.claude/skills`에 생겨 에이전트가 직접 지웠고, impeccable은 경로 충돌로 건너뛰었으며, 원본에 없는 `metadata.json`이 두 개 생겼다. eval 3에서는 바뀌지 않은 스킬까지 lock이 바뀌었다.
- 1차 eval 2: 에이전트가 `bts-dev-cycle`의 별도 `--if-due` 단계를 건너뛰었다. 그래서 확인을 에이전트가 늘 실행하는 `status` 안으로 옮기고 출력 줄에 다음 할 일을 붙였다. 2차 eval 2는 4/4다.
- 2차 eval 1: 사용자가 업데이트를 요청했는데 `status`의 `mode=ask` 알림을 따라 다시 물었다. 스킬 1절에서 직접 요청과 알림을 나눈 뒤 3차에 5/5가 됐다.
- 3차 eval 2: README 오타를 사소한 문서 수정으로 보고 `bts-dev-cycle` 없이 바로 고쳐 확인 자체가 없었다. 주기 확인은 `bts-dev-cycle`의 `status`에 걸려 있어 이 스킬을 부르지 않으면 돌지 않는다(아래 한계).
- 스킬과 상관없이 통과하는 항목(설치본 유지, 다른 브랜치에서 다시 받지 않음, 최종 상태의 Codex 링크 없음)이 있다. 판별력은 명령, 최신 상태, H 라운드, 파일 무변경에서 나온다.

### 한계
- 주기 확인은 진행 중인 라운드가 없을 때의 `pnpm dev-cycle status`에만 걸려 있다. 에이전트가 `bts-dev-cycle`을 부르지 않고 바로 고치면 확인하지 않는다(3차 eval 2). 질문 답변처럼 라운드를 열지 않는 대화에서도 확인하지 않는다.
- eval은 조건마다 한 번 돌렸고, 서브에이전트가 Claude Code 세션을 흉내 낸 것이다(프로젝트 플러그인과 훅은 불러오지 않았다). 편차는 모른다. neon 템플릿으로는 eval을 돌리지 않았다.
- vercel·vercel-labs 스킬은 skills CLI가 skills.sh 스냅샷으로 설치한다. 스냅샷이 GitHub보다 늦으면 다시 설치해도 업데이트로 남는다. 재확인 결과로 보고하고 다음 확인에 맡긴다.
- `core.autocrlf`나 원본 `.gitattributes`의 `eol=crlf`로 clone 설치 파일의 줄 끝이 바뀌면 모든 스킬이 업데이트로 보일 수 있다. 확인하지 않았다.
- 토큰이 없으면 GitHub API는 시간당 60회다. 한 번 확인에 저장소 수(12~13)만큼, 적용은 그 두 배와 skills CLI 자체 호출을 쓴다. 트리가 10만 항목을 넘어 잘리면 그 저장소는 확인 실패로 둔다(현재 가장 큰 vercel/next.js는 약 4.9만).
- 매니페스트의 GitHub `owner/repo` 스킬만 본다. lock의 `ref`는 쓰지 않고 기본 브랜치 HEAD와 비교한다. 매니페스트에 없는 스킬과 `bts-*` 스킬, Claude 플러그인, 전역 도구는 대상이 아니다.
- 업데이트는 로컬에서 고친 외부 스킬을 덮어쓴다(스킬 4번의 diff 검토로만 다룬다). 훅이 실행하는 스크립트(impeccable)는 아래 "보안 리뷰 지적 반영" 절의 설치 전 검토로 다룬다.
- 알림 설정과 확인 결과는 기기별 `node_modules/.cache`에 있어 `node_modules`를 지우면 기본값(ask)으로 돌아간다. `UPSTREAM_GONE`은 한 번만 알리므로 `status --json`을 다른 도구가 먼저 읽으면 사람에게 보이지 않을 수 있다.
- `status`는 하루에 한 번 GitHub를 부른다(저장소마다 20초 제한, 병렬).

## 보안 리뷰 지적 반영: Git 자동 배포와 스크립트 변경 (2026-09-28 추가)
### 요청
실사용 프로젝트 A의 R01(템플릿 v0.4.0 반영)에서 `bts-reviewer(security)`가 템플릿 파일의 low 2건을 찾아 전달했다(실사용 프로젝트 A 커밋 `f0a6924`). 사용자는 두 건 모두 권장안으로 고치기로 했다.
1. 라운드 끝 push에서 Git 자동 배포 예외를 `docs/adr/`의 기록으로만 알아본다. 기록이 없으면 push가 릴리스하지 않은 커밋의 production 배포가 된다.
2. `mode=auto`면 새 외부 스킬을 설치한 뒤에 diff를 본다. 훅이 스킬 스크립트를 바로 실행하면 검토 전에 새 코드가 돈다.

### 바꾼 것
**Git 자동 배포**
- 실측: Vercel CLI 60.1.1의 `vercel link --yes --project <이름>`은 새 프로젝트를 만들 때 git 원격이 있으면 묻지 않고 그 저장소를 연결한다(CLI 소스의 `resolveGitConnectIntent`: `--yes`나 비대화형이면 확인하지 않는다). 이미 있는 프로젝트에 연결할 때는 Git을 건드리지 않는다. `bts-deploy` 준비 절차가 이 명령을 쓰므로 리뷰가 본 것보다 걸리기 쉽다.
- `vercel-deploy.mjs production`(`--check` 포함)은 `vercel api /v9/projects/<id>`로 Git 연결을 읽는다.
  - `link`가 있고 `gitProviderOptions.createDeployments`가 `disabled`가 아니면 `Git 자동 배포가 켜져 있다`로 보고한다.
  - 읽지 못하면 `Git 자동 배포 여부를 확인하지 못했다`로 보고한다. 둘 다 준비 안 됨이다.
  - CLI 없음, 연결 안 됨, 로그인 필요에서 먼저 멈춰도, 연결한 기기거나 릴리스한 적이 있으면(`v*` 태그, 커밋된 `release/`) `(Git 자동 배포 여부도 확인하지 못했다)`를 붙인다.
  - `VERCEL_ORG_ID`와 `VERCEL_PROJECT_ID`가 둘 다 있으면 CLI처럼 `.vercel/project.json`보다 먼저 쓴다.
- `bts-deploy`
  - link 출력에 `Connecting GitHub repository`가 있었고 사용자가 Git 연결을 요청하지 않았으면 `vercel git disconnect --yes`로 끊는다.
  - 릴리스 `--publish` 전에도 `production --check`에 `Git 자동 배포`가 없어야 한다.
  - 스크립트가 인정하는 끄는 방법은 Vercel 프로젝트의 Git 설정뿐이다.
- `bts-dev-cycle` 5절: push하기 전에 `production --check`를 항상 실행하고, `Git 자동 배포`가 나오면 커밋만 한다.

**스크립트가 바뀐 외부 스킬**
- 원격 스킬 폴더와 설치본을 비교할 때 바뀐 파일 목록을 모은다. `.md`가 아닌 파일이 바뀐 스킬이 있으면 `--if-due`는 auto여도 `mode=ask … (스크립트 변경: …)`로 알린다.
- `--check`는 그런 스킬마다 원격 저장소, 폴더, 검토 고정값, 파일별 blob을 보여 주고 고정값을 기록한다. 검토 고정값은 폴더의 원격 파일 목록을 한 값으로 줄인 것이다. 에이전트는 `gh api repos/<저장소>/git/blobs/<sha>`로 설치 전에 읽는다. contents API는 1MB가 한도라 쓰지 않는다.
- 이름 없이 `pnpm skills:update`를 실행하면 스크립트 변경 스킬을 `보류`로 남긴다.
- `pnpm skills:update <이름>`은 원격이 검토 고정값 그대로일 때만 설치한다. 아니면 `설치 거부`(exit 2)이고 이유를 함께 보여 준다(검토 기록 없음, 원격이 바뀜, 같은 이름 폴더가 여럿). 설치한 뒤에는 설치본이 그 판인지 다시 보고, 다르면 `설치본이 검토한 판과 다르다`(exit 2)로 알린다.
- 그 밖의 변경
  - 모르는 옵션은 exit 2로 끝낸다. `--chek` 같은 오타가 검토 없는 전체 설치가 되지 않게 한다.
  - 폴더를 옮겼거나 lock에 경로가 없으면 이름으로 찾는다. 후보가 여럿이면 고정값을 두지 않는다.
  - 링크가 있는 스킬은 무엇이든 바뀌면 링크 자리도 바뀐 파일로 본다.
  - 빠진 스킬은 실제 원격 파일 목록으로 판정한다.
  - v0.4.0 캐시(`scripts` 없음)는 바로 다시 확인한다. 미루기 키에 스크립트 변경을 넣었다.
- `bts-skills-update` 2절
  1. 설치 전 확인: blob을 읽는다. 버전 파일과 압축 파일은 사용자가 정한다. 의심스러운 스킬은 뺀다.
  2. `.md`만 바뀐 스킬을 설치한다.
  3. 검토한 스크립트 변경 스킬을 이름을 지정해 설치한다.
  4. 설치 뒤 diff를 본다. SKILL.md의 `hooks`, `allowed-tools`, `` !`명령` ``도 스크립트처럼 본다.

### 확인
| 검사 | 결과 |
|---|---|
| `node --test` (두 템플릿) | 각각 150 통과, 0 실패(이전 139). Git 검사: 켜짐, push 배포만 끔, 읽기 실패, 오류 응답, 개인 계정, 환경변수 우선, GitLab 이름, develop 제외, 먼저 멈춘 경우(연결한 기기, 태그, 태그 없는 clone의 `release/`, 연결도 릴리스도 없음), `project.json`이 `null`. 스크립트 변경: 파일 목록과 링크, 옮긴 폴더, 이름이 겹치는 폴더, 고정값, auto 알림, 보류, 기록 없음·원격 변경 거부, 설치 뒤 불일치, 모르는 옵션과 `--`, 옛 캐시, 미루기 키 |
| 변이 검사 | 1차 13가지(Git 검사 6, 스크립트 변경·이름 지정 7), 리뷰 반영 뒤 12가지와 8가지. 모두 테스트가 잡았다. 처음에 놓친 2가지(연결했지만 릴리스 전인 기기, 미루기 키)는 테스트를 더해 잡았다 |
| 형식 | 두 스크립트를 fixture의 `biome.json`으로 `biome check --write`한 뒤 가져왔다. 두 템플릿의 공유 파일은 바이트가 같다 |
| 실제 Vercel (테스트용 프로젝트 `bts-git-link-probe`를 만들고 지웠다) | `link --yes`가 새 프로젝트를 만들며 "Connecting GitHub repository"를 실행했다(계정에 저장소 쓰기 권한이 없어 연결은 실패). `vercel api`: 연결 없는 프로젝트는 `link` 키 없음, `createDeployments: enabled`. 없는 프로젝트는 출력 없이 exit 1. `vercel git disconnect`는 연결이 없으면 exit 1. 새 스크립트는 이 프로젝트에서 Git 오류 없이 다른 준비 항목만 보고했다 |
| 실제 BTS 프로젝트 (scratchpad fixture) | impeccable 스크립트를 로컬에서 바꿔 시험했다. 확인한 것은 다음과 같다. `--check`의 고정값과 blob 줄. 문서의 blob diff 명령(바꾼 두 줄만 나온다). auto일 때 `status`가 `mode=ask`. 이름 없이 실행하면 보류(exit 1). 이름을 지정하면 설치(exit 0)되고 39개 모두 최신. `--chek`과 모르는 이름은 exit 2. `-- --check`. 연결도 릴리스도 없는 프로젝트의 `production --check`에는 여부 문구가 붙지 않는다 |
| 동작 eval (supabase fixture, 조건마다 1회) | 아래 표 |
| 독립 리뷰 (`oh-my-claudecode:code-reviewer`, 읽기 전용) | 1차 REQUEST CHANGES(high 0, medium 6, low 10). 반영했다: push 전 항상 검사, `--publish` 검사, 검토 고정값, 링크, 모르는 옵션, 환경변수 우선, 옛 캐시, 문서. 2차 APPROVE(medium 2, low 9). 권고한 설치 뒤 검증과 `release/` 근거를 넣고, low 대부분(거부 이유, 캐시 실패, `null`, 미루기 키, `--`, 문서)을 반영했다 |

| eval | 새 스킬 | 이전 스킬(v0.4.0) |
|---|---|---|
| 1. 업데이트 요청(회귀) | 5/5 | 3차 5/5 |
| 4. 직접 요청 + 스크립트 변경 | 5/5, 보류 흐름 반영 뒤 재실행 5/5 | 5/5 |
| 5. auto + 스크립트 변경 + 다른 작업(README 오타) | 4/4 | 3/4 |

- eval 4에서는 이전 스킬도 설치 전에 원격 파일을 읽었다. `--check` 출력의 "스크립트 변경(설치 전에 원격 파일을 본다)" 줄을 따랐다. 판별력은 스크립트 출력에서 나오고, 스킬 문서는 순서와 명령을 정한다.
- eval 5에서 이전 스킬은 스크립트가 낮춘 `mode=ask`를 따라 물었다. 하지만 "지금 업데이트"를 설치한 뒤 diff를 보는 것으로 안내했다. 새 스킬은 설치 전에 원격 파일을 본다고 안내했다.
- 재실행(보류와 이름 지정 설치 흐름)에서 에이전트는 `--check`가 보여 준 blob으로 읽고, 이름 없이 실행해 보류를 본 뒤 `pnpm skills:update impeccable`로 설치했다.

### 한계
- 연결도 릴리스도 없는 기기는 Git 자동 배포를 알 수 없다. 대시보드에서 Git으로 가져왔지만 이 저장소에 link나 릴리스 기록이 없는 경우다. GitHub Deployments로 신호를 얻을 수 있지만 넣지 않았다.
- 실제로 Git이 연결된 Vercel 프로젝트의 `link` 응답과 `git disconnect --yes`는 확인하지 못했다(계정에 테스트 저장소 쓰기 권한이 없었다). 연결된 상태는 CLI 소스, API 필드, 스텁 테스트로만 봤다. `vercel api`는 베타 명령이라 바뀌면 "확인하지 못했다"로 멈춘다(push하지 않는 쪽).
- `vercel.json`의 `git.deploymentEnabled`와 Ignored Build Step은 읽지 않는다. 이렇게 끈 프로젝트도 준비 안 됨으로 나온다.
- 검토 고정값은 `--check`가 보여 준 판의 기록이지 사람이 검토했다는 증거가 아니다. 설치 직전 확인과 skills CLI의 받기 사이에 몇 초가 비지만, 설치 뒤 비교가 잡는다. 폴더 밖을 가리키는 링크 대상은 고정값에 없어, 링크 대상만 바뀌면 놓친다.
- `.md`만 바뀐 업데이트는 auto로 설치된다. SKILL.md의 `hooks`, `allowed-tools`, 명령 주입은 설치 뒤 diff(4번)에서 본다.
- eval은 조건마다 한 번, supabase fixture로만 돌렸다. eval 1은 새 스킬만 다시 돌렸다.

## ponytail을 개발과 리뷰에 연결 (2026-09-28 추가)
### 요청
사용자가 bts 스킬이 개발과 리뷰에 ponytail을 쓰도록 되어 있는지 검토를 요청했다. 연결은 없었다. 설치 목록(매니페스트), `bts-dev-cycle`, `process-routing.md`, `docs/dev-workflow.md`, 에이전트 정의 어디에도 ponytail이 없었다. 이 기기에서 ponytail이 작동한 것은 사용자 전역 설치(Claude, Codex) 때문이었다. 템플릿 스크립트의 `ponytail:` 주석 4곳도 뜻을 설명하는 곳이 없었다. 사용자는 "설치 + 라우팅 연결"(대조표 행은 늘리지 않는다)을 골랐다. 1차 반영 뒤 독립 리뷰가 REQUEST CHANGES를 냈고, 사용자는 Codex도 확인하라고 요청했다. 훅의 전역 부작용을 확인한 뒤 사용자는 Claude 쪽을 플러그인으로 유지하고 문서화하기로 했다.

### 바꾼 것
- 매니페스트: Claude 플러그인 `ponytail@ponytail`(마켓플레이스 `ponytail`, github `DietrichGebert/ponytail`)과 Codex 스킬 `ponytail`, `ponytail-review`를 superpowers와 같은 방식으로 넣었다. Claude 플러그인은 스킬 6개를 모두 제공하지만 라우팅은 `ponytail`과 `ponytail-review`만 한다.
- `process-routing.md`: 구현 보강에 ponytail 모드, 리뷰 보강에 `bts-reviewer(code)`와 함께 `ponytail-review`를 넣고, 설치 위치와 도구별 이름을 맞췄다. 규칙 1에서 `ponytail-review`는 추가 관점이다. 규칙 6은 다음을 정한다.
  - 모드를 켜는 방법: Claude는 플러그인 훅, Codex는 구현 전과 위임할 때 `ponytail` 스킬
  - 우선순위: ponytail보다 `AGENTS.md`, `bts-*`, 대조표가 우선한다. 대조표 행(vitest 도입, 격리 테스트), 구현 전 질문, 보고 형식, 보안 검사, 입력 검증, 데이터 손실을 막는 오류 처리는 줄이지 않는다.
  - `ponytail:` 주석 관례
  - `ponytail-review`: Skill 도구로 부르고, `git diff <base>`와 새 파일 내용을 넘긴다. `bts-reviewer`의 범위를 나누지 않고, 이번 라운드 diff 안에서 동작이 같은 것만 반영한다. 증거 칸은 리뷰어 결과 뒤에 덧붙이고, ponytail이 없으면 `없음`으로 적는다.
- `bts-dev-cycle` 4절: 리뷰 행과 구현 모드·우선순위를 두 줄로 넣었다. 참조 문서에만 두었을 때 1차 eval에서 한 실행이 그 문서를 읽지 않았다.
- `CLAUDE.md`: `ponytail:ponytail-review`는 Skill 도구로 부른다. statusline 설정 제안이 와도 전역 `~/.claude/settings.json`은 사용자가 요청할 때만 바꾼다.
- `bts-skills-update`: Claude 플러그인 목록에 ponytail을 더했다. 훅이 있는 플러그인은 업데이트 전에 `hooks/` 변경을 본다.
- 템플릿 README: 설치 표와 신뢰 안내, 그리고 훅 3종, 전역 파일, statusline 제안, 끄는 방법, 업데이트 전 확인을 적었다. 루트 README는 설치 목록과 도식을 맞췄다.
- eval 4(리뷰)와 eval 5(구현), 시드 `evals/bts-dev-cycle/seed.sh`(공유 목록에 추가)를 더했다.
- 테스트: 매니페스트(플러그인, 마켓플레이스, Codex 스킬)와 문서(라우팅, 우선순위, 리뷰어 범위, 추가 관점, `CLAUDE.md`, README 표와 전역 파일 안내)를 검사한다.

### 확인
| 검사 | 결과 |
|---|---|
| `node --test` (두 템플릿) | 각각 151 통과, 0 실패 |
| 변이 검사 | 매니페스트 3가지(플러그인, Codex 스킬, 마켓플레이스 저장소)와 문서 4가지(4절 우선순위, 4절 리뷰어 범위, 규칙 6 우선순위 반전, 기존 코드 가드) 모두 테스트가 잡았다 |
| 형식 | 매니페스트를 fixture의 `biome.json`으로 검사했다. 고칠 것 없음 |
| 실제 BTS 프로젝트 (supabase fixture 복사본) | 설치 전 `skills:check`는 `DietrichGebert/ponytail: ponytail, ponytail-review`와 `marketplace ponytail, ponytail@ponytail`을 누락으로 보고했다(exit 1). `skills:setup`은 Codex 스킬 2개를 `.agents/skills`에만 설치했고(`.claude/skills`에는 없다), settings에 선언을 더하고 `claude plugin install --scope project` 4개를 성공했다. 이 기기에는 ponytail 마켓플레이스가 이미 있어 마켓플레이스 등록은 건너뛰었다. lock의 `skillPath`는 `skills/ponytail/SKILL.md`라 저장소의 `.openclaw/skills/` 사본과 헷갈리지 않는다. 이어서 `skills:check`는 41개 모두 있음, `skills:update --check`는 업데이트 0개였다. OMX setup은 복사한 fixture의 `.codex/hooks.json`이 원본 경로를 가리켜 거부됐다(이번 변경과 관계없다). 확인 뒤 project scope 플러그인 4개를 지웠다(모두 exit 0) |
| 새 기기 흉내 (빈 `CLAUDE_CONFIG_DIR`) | 마켓플레이스가 하나도 없는 Claude 설정으로 v0.4.1 fixture에 최신 매니페스트를 넣고 `skills:setup`을 실행했다. 설치 전 settings에는 ponytail 선언이 없었다. 실행 뒤 `claude-plugins-official`, `omc`, `ponytail` 마켓플레이스를 등록했고, 플러그인 4개(ponytail 포함)를 이 프로젝트의 project scope로 설치했으며, settings에 선언이 더해졌다. exit 2는 위와 같은 OMX 복사본 문제다. 확인 뒤 임시 설정 폴더와 fixture를 지웠다 |
| 훅 코드 (ponytail 4.10.0) | SessionStart가 `~/.claude/.ponytail-active`와 `~/.claude/.ponytail-statusline-nudged`를 쓰고, statusline이 없으면 첫 세션에 설정 제안을 넣는다. `/ponytail-review` 슬래시 명령은 모드를 review로 바꾼다. 네트워크와 외부 명령 실행은 없다 |
| 동작 eval (supabase fixture, 설정마다 2회) | 아래 표 |
| 독립 리뷰 (`oh-my-claudecode:code-reviewer`, 읽기 전용) | 1차 REQUEST CHANGES(high 0, medium 6, low 8). 반영했다: README 설치 표, `bts-skills-update` 플러그인 목록, 우선순위 규칙, 훅 부작용 문서화, 이 절의 서술 정정, 업데이트 전 `hooks/` 확인, ponytail이 없을 때의 처리, Codex 위임, 시드 import 확인, eval 기준 보강, 문서 테스트, 증거 칸 순서 |

| eval | 환경 | 새 스킬 | 이전 스킬(v0.4.1) |
|---|---|---|---|
| 4. 코드 리뷰 행(과설계 시드) | Claude (이 기기, 전역 ponytail 켜짐) | 8/8, 8/8 | 5/8, 5/8 |
| 4 | Codex (`--ignore-user-config`) | 8/8, 8/8 | 5/8, 5/8 |
| 5. 구현(zod가 이미 하는 요청) | Claude (이 기기, 전역 ponytail 켜짐) | 6/6, 6/6 | 5/6, 5/6 |
| 5 | Codex (`--ignore-user-config`) | 6/6, 6/6 | 4/6, 5/6 |
| 4 | Claude 실제 환경 (전역 ponytail 제거, `claude -p`, project scope 플러그인) | 8/8, 8/8 | 5/8, 5/8 |
| 4 | Codex 실제 환경 (전역 ponytail 제거, 사용자 설정, 프로젝트 신뢰) | 8/8, 8/8 | 5/8, 5/8 |
| 5 | Claude 실제 환경 | 6/6, 6/6 | 5/6, 5/6 |
| 5 | Codex 실제 환경 | 5/6, 6/6 | 5/6, 5/6 |

- 표는 최종 문서로 만든 fixture의 결과다. eval 4 기준선은 스킬과 요청이 같아서 이전 실행(Claude 2차, Codex 1차)을 새 기준 8개로 다시 채점했다.
- 중간 과정
  - Claude 1차: 연결을 참조 문서에만 두었을 때 새 스킬 한 실행이 `process-routing.md`를 읽지 않아 `ponytail-review`를 건너뛰었다(3/6). 그래서 4절에 한 줄을 넣었다. 1차 기준선은 fixture에 ponytail 스킬이 남아 오염됐다. 그래서 v0.4.1 fixture로 다시 만들었다.
  - Codex 1차(우선순위 규칙 전): 새 스킬 두 실행 모두 ponytail을 읽은 뒤 대조표 필수 행(vitest 도입)을 넣지 않았다. 리뷰에서는 한 실행이 `bts-reviewer`에게 정확성만 맡겨 리뷰어가 지적 0건으로 approve를 냈고, 중복 지적은 ponytail 목록에만 있었다(다른 실행의 리뷰어는 중복을 low로 지적했다). 그래서 우선순위와 리뷰어 범위 규칙, 이를 보는 eval 기준을 더했다. 최종 판에서는 새 스킬 네 실행 모두 vitest 행을 넣었고, 리뷰어가 범위를 유지하며 중복을 지적했다.
  - Claude eval 5의 이전 스킬은 훅으로 켜진 ponytail 모드에서 두 실행 모두 vitest 행을 뺐다. Codex 이전 스킬도 ponytail 없이 한 번 뺐다.
- 판별하는 기준은 eval 4의 `ponytail-review` 호출, 새 파일 줄 지적, 증거 칸 순서와 eval 5의 vitest 행, 구현 전 ponytail이다. 대부분 절차를 따랐는지 보는 기준이다. 핵심 지적(title.ts 삭제)과 기존 trim 발견은 두 설정 모두 했다.
- 실제 환경 실행: 이 기기의 전역 ponytail(Claude user scope 플러그인, Codex 플러그인)을 지우고 돌렸다. Claude는 fixture마다 `skills:setup`으로 플러그인을 project scope에 설치한 뒤 그 디렉터리에서 `claude -p`로 실행했다. 사전 확인에서 새 스킬 fixture만 ponytail 훅과 스킬 6개가 켜졌고, 두 fixture 모두 `bts-reviewer`를 서브에이전트로 쓸 수 있었다. eval 4의 네 실행은 모두 실제 `bts-reviewer` 서브에이전트를 불렀고, 새 스킬은 `Skill(ponytail:ponytail-review)`을 불렀다. Codex는 사용자 설정 그대로 fixture만 신뢰(`projects.<경로>.trust_level`)로 두었다. `agent_name` 오류는 다시 나지 않았다.
- 실제 환경의 eval 5에서는 ponytail이 없는 Claude 기준선도 vitest 행을 넣었다. 앞선 Claude 기준선이 이 행을 뺀 것은 전역 훅으로 ponytail이 켜진 채 우선순위 규칙이 없었기 때문으로 보인다. Codex 새 스킬 한 실행은 vitest를 한 번도 언급하지 않고 0행을 빠뜨렸다. Codex 이전 스킬도 앞 회차에 한 번 뺐으므로 ponytail과 관계없는 규칙 누락이다.
- 새 스킬은 평균 약 30초를 더 썼다(Codex는 토큰도 약 2만 더). Claude eval 4 기준선은 다른 세션의 실행을 복사한 것이라 시간 비교에서 뺀다.

### 한계
- 앞선 회차(Claude 서브에이전트 eval)는 전역 ponytail 훅이 켜진 채 돌았다. 실제 환경 회차에서 전역을 지우고 다시 돌려 모드 효과와 우선순위 규칙을 함께 확인했다. 확인 뒤 이 기기의 전역 ponytail은 다시 설치했다(Claude user scope 플러그인, Codex 플러그인). 이 기기의 Codex 홈은 `~/.codex`가 아니라 셸의 `CODEX_HOME`(orca 계정 폴더)이다.
- Codex의 서브에이전트 호출은 JSON 이벤트에 `wait`만 남는다. 리뷰어에게 무엇을 맡겼는지는 실행이 남긴 증거 파일로 확인했다.
- 새 기기의 첫 세션 statusline 제안은 대화형 세션이 필요해 실행하지 않았다. `.claude/settings.local.json`으로 이 프로젝트에서만 끄는 방법은 Claude Code 설정 우선순위를 따른 안내이고, 실행해 확인하지 않았다.
- 훅은 전역 파일을 쓰고, 모드 파일이 전역이라 다른 프로젝트 세션에도 영향을 준다. SubagentStart는 `bts-reviewer`(security, db)에도 ponytail 규칙을 넣는다. README에 적었고 막지는 않았다.
- 플러그인은 버전을 고정하지 않는다(OMC와 같다). 업데이트는 `skills:update`의 설치 전 검토 밖이라 `hooks/` 변경을 사람이 본다.
- `ponytail:` 주석을 모아 할 일로 넘기는 절차(`ponytail-debt`)는 없다.
- eval은 eval 4·5를 설정마다 2회, supabase fixture로만 돌렸다. `bts-dev-cycle` eval 1~3과 `bts-skills-update` eval("대상이 아닌 것" 한 줄만 바뀌었다)은 다시 돌리지 않았다.
- Codex 커스텀 역할: 신뢰한 프로젝트의 eval 4 네 실행은 모두 세션 기록(`$CODEX_HOME/sessions`)에 `spawn_agent(agent_type="bts-reviewer")`가 남았다. 신뢰를 뺀 실행(`--ignore-user-config`)에서는 커스텀 역할이 불리지 않았다. JSON 이벤트(`codex exec --json`)에는 역할 이름이 나오지 않는다.
- 실제 환경의 Claude 세 실행이 vitest 도입 행을 실행하면서 `.dev-cycle.json`의 `commands.test`를 고쳤다. 그러자 diff가 H(하네스)로도 판정돼 `--upgrade`가 H 행을 붙였고, 직접 추가한 vitest 행이 표 끝 `[confirm]` 앞으로 옮겨졌다(3절에 적힌 동작이다). ponytail과 관계없는 dev-cycle 동작이라 이번에는 고치지 않았다.
- eval 5는 0행(vitest 도입)이 있는지만 보고, 그 행을 실행하거나 `blocked: 사유`로 적었는지는 보지 않는다. Codex는 두 설정 모두 0행을 비운 채 1·2행을 채웠다(ponytail과 관계없는 행 순서 문제).

## 빈 release/ 폴더 오탐 (2026-09-28 추가)
실사용 프로젝트 A가 v0.5.1을 반영하면서 찾아 전달했다(low). `vercel-deploy.mjs production`은 CLI 없음, 연결 안 됨, 로그인 필요로 먼저 멈출 때 릴리스 기록이 있으면 `(Git 자동 배포 여부도 확인하지 못했다)`를 붙인다. 이때 `release/` 폴더가 있기만 하면 기록으로 봤다. 노트를 쓴 뒤 지워 빈 폴더만 남은 기기에서는 연결도 릴리스도 없는데 이 문구가 붙었고, 라운드 끝 push가 막혔다. 위 절이 적은 대로 커밋된 노트가 있을 때만 기록으로 보도록 `git ls-files release`로 바꿨다. 테스트에 빈 폴더와 커밋하지 않은 노트를 더했고, 예전 코드로 되돌리면 실패한다. 두 템플릿 모두 `node --test` 151 통과다.

## GitHub Release 제목 중복 (2026-09-28 추가)
`release.mjs --publish`가 노트 파일을 그대로 Release 본문으로 올렸다. 노트 첫 줄 `# vX.Y.Z — 제목`은 Release 제목과 같아서, GitHub 화면에 제목이 두 번 보였다(이 저장소의 v0.1.0~v0.5.2에서 확인). 이제 첫 줄을 뺀 노트를 stdin으로 넘긴다(`gh release create … --notes-file -`). 실패할 때 출력하는 재시도 명령(`release.mjs`, `vercel-deploy.mjs`)도 `tail -n +2 <노트> | gh release create … --notes-file -`로 바꿨다. 노트 제목 정규식에서 `m` 플래그를 빼, 오류 문구대로 제목이 첫 줄에 있어야 발행한다. 테스트의 gh 스텁이 stdin 본문을 적고, 그 본문이 노트에서 첫 줄만 뺀 것과 같은지 본다. 예전 코드로 되돌리면 실패한다. `gh release edit --notes-file -`로 이 저장소의 Release 10개를 같은 방식으로 고쳤다. 고치기 전에 본문이 노트 파일과 같은지 확인했다. gh가 stdin 본문을 읽는 것도 이 작업에서 실측했다. 독립 리뷰는 APPROVE였다. LOW 1건(개행이 없는 한 줄 노트면 제목을 빼지 못한다)은 커밋 해시 검사에서 먼저 막혀 그대로 뒀다. 두 템플릿 모두 `node --test` 151 통과다.

## 보안 리뷰 지적 반영: 배포 제외, 선택 환경변수, 전역 설치 고정, 커밋 전 비밀값 검사, turbo 에이전트 블록 (2026-09-28 추가)
`.vercelignore`, `vercel-deploy.mjs`의 선택 환경변수, agent-browser 버전 고정, `pnpm dev-cycle secrets`, 설치기의 turbo `agentGuidance`를 고쳤다(공유 파일, 공통 테스트, 두 템플릿의 매니페스트·`bts-dev-cycle`·README). 내용과 실제 BTS 프로젝트 확인은 [bts-next-neon의 VERIFICATION.md](../prokit-next-neon/VERIFICATION.md#보안-리뷰-지적-반영-배포-제외-선택-환경변수-전역-설치-고정-커밋-전-비밀값-검사-turbo-에이전트-블록-2026-09-28-추가)에 적었다. 이어서 받은 코드 리뷰 지적(비밀값 검사의 `.env`·diff 읽기, turbo CRLF와 경고, `@optional=false`)도 같은 절에 적었다. 이 템플릿에 직접 관계된 것은 `.vercelignore`의 `**/supabase/.temp`다. `supabase link`가 `packages/db/supabase/.temp`에 남기는 project-ref와 pooler 주소가 CLI 배포에 올라가지 않게 한다. supabase fixture에서는 설치를 다시 하지 않았다. 설치기 변경은 두 템플릿에서 같다.

## dev-cycle 오류 예산, 시나리오 QA와 발견 수정, 공통화 행 (2026-09-29 추가)
`bts-verify`, `bts-dev-cycle`, `process-routing.md`, `docs/dev-workflow.md`의 공통 규칙을 고쳤다(`4fb16dd`). 배경과 확인 내용은 [bts-next-neon의 VERIFICATION.md](../prokit-next-neon/VERIFICATION.md#dev-cycle-오류-예산-시나리오-qa와-발견-수정-공통화-행-2026-09-29-추가)에 적었다. supabase fixture에서는 새 F 행을 돌리지 않았다.

## 용어집 이름 변경 실제 설치 확인 (2026-09-30 추가)
`964e3e5`(`CONTEXT.md` → `GLOSSARY.md`)를 v0.6.0 릴리스 전에 확인했다. BTS 3.44.1로 새로 만든 neon 프로젝트에 `install.sh`를 실행했다(exit 0). 설치 결과에 `GLOSSARY.md`가 있고 `CONTEXT.md`는 없다. `node_modules`와 `.git`을 뺀 프로젝트 전체에서 `CONTEXT.md` 참조는 OMX `deep-interview`(`.codex/skills`)의 "있으면 읽는다" 예시 하나뿐이라 충돌하지 않는다. 원격에서 받은 `domain-modeling`은 `GLOSSARY.md`와 `GLOSSARY-FORMAT.md`를 쓴다. 설치기 다음 할 일 4번에도 `GLOSSARY.md`가 나온다. `skills:check`와 `agents:check`는 exit 0이다. 확인이 끝난 뒤 project scope 플러그인 4개를 지우고 확인용 프로젝트를 삭제했다. supabase 템플릿은 따로 설치하지 않았다. 바뀐 설치기와 `files/GLOSSARY.md`는 두 템플릿에서 바이트가 같다(shared-files 테스트).

## 스킬 연결 점검과 보강 (2026-09-30 추가)
공식 스킬이 dev-cycle의 제자리에서 불리도록 공유 파일과 이 템플릿의 파일을 고쳤다.
- 공유 파일: `CLAUDE.md`, `bts-ui`, `bts-web`, `bts-deploy`, `bts-skills-update`, `impeccable-map.md`, `skills.test.mjs`
- 이 템플릿의 파일: `docs/dev-workflow.md`, `bts-dev-cycle`, `bts-verify`, `evidence.md`, 에이전트 2개, `AGENTS.md`, `template-docs.test.mjs`

E 행은 `supabase-postgres-best-practices`(컬럼 타입·제약·인덱스·RLS)와 `supabase` 스킬의 보안 체크리스트를 가리킨다. 찾은 결함, 측정 방법, before/after 수치는 [bts-next-neon의 VERIFICATION.md](../prokit-next-neon/VERIFICATION.md#스킬-연결-점검과-보강-2026-09-30-추가)에 있다. 이 템플릿의 `node --test`는 157개 통과다. 동작 run은 neon fixture에서만 돌렸다.

## 공식 스킬 최신판 점검과 agent-browser 0.38.1 (2026-09-30 추가)
원격 HEAD의 스킬 이름, bts 스킬이 가리키는 내용, 고정 버전을 점검하고 agent-browser를 0.38.1로 올렸다. 방법과 결과는 [bts-next-neon의 VERIFICATION.md](../prokit-next-neon/VERIFICATION.md#공식-스킬-최신판-점검과-agent-browser-0381-2026-09-30-추가)에 있다. 이 템플릿만의 항목은 다음과 같다.
- `supabase`와 `supabase-postgres-best-practices`는 HEAD(2026-09-28)에 그대로 있고, E 행이 가리키는 보안 체크리스트(6절)도 있다.
- Supabase CLI 최신은 2.118.0이다. 하한 2.117과 `pnpm dlx supabase@2.117.0` 대안은 그대로 둔다. 실제 `supabase start`·`db advisors`로 검증한 판이 2.117.0이다.

## 설치할 때의 최신판 받기 (2026-09-30 추가)
새 프로젝트가 BTS, skills CLI, 플러그인, agent-browser CLI의 최신판을 받도록 바꿨다. 방법과 결과는 [bts-next-neon의 VERIFICATION.md](../prokit-next-neon/VERIFICATION.md#설치할-때의-최신판-받기-2026-09-30-추가)에 있다. 이 템플릿만의 항목은 다음과 같다.
- `--db-setup supabase --manual-db`로도 3.44.1과 3.44.2의 생성물이 같다. 실제 생성과 설치에서 스킬 41개, 검사 6개, `skills:update --check`(업데이트 0개)가 모두 통과했다.
- Supabase CLI를 설치하지 않고 쓰는 대안과 Homebrew가 없을 때의 안내는 `supabase@latest`로 바꿨다. 하한 2.117은 `db advisors`를 확인한 판이라 그대로 둔다.

## 공식 스킬 문서와 플러그인 업데이트 안내 (2026-09-30 추가)
루트 README의 "공식 스킬" 절, `bts-skills-update`(공유 파일)와 템플릿 README의 Claude 플러그인 업데이트 순서를 [bts-next-neon의 VERIFICATION.md](../prokit-next-neon/VERIFICATION.md#공식-스킬-문서와-플러그인-업데이트-안내-2026-09-30-추가)에 적었다. 이 템플릿의 공식 도메인 스킬은 23개이고, 그중 dev-cycle 행에 이름이 나오는 것은 10개다. `supabase` 스킬은 E advisors 행의 보안 체크리스트로 읽는다. 스킬 연결 점검 보고서는 [docs/reports/2026-09-30-skill-wiring-check.html](../../docs/reports/2026-09-30-skill-wiring-check.html)에 있다.

## Codex 스킬 연결 검수와 선행 행 보강 (2026-09-30 추가)
공통 수정과 전체 방법은 [Neon 검증 기록](../prokit-next-neon/VERIFICATION.md#codex-스킬-연결-검수와-선행-행-보강-2026-09-30-추가), 시나리오·증거·한계는 [Codex 검수 보고서](../../docs/reports/2026-09-30-codex-skill-wiring-check.html)에 있다. Vitest 선행 행 누락 방지, `--upgrade`의 첫 행 보존, Codex 스킬 읽기·실행 대안, eval 5 강화와 회귀 테스트를 함께 반영했다.

Supabase DB 사례는 수정한 판으로 실행했다. BTS 3.44.2, Codex CLI 0.159.0, gpt-6-astra/medium, Supabase CLI 2.118.0, Podman DB 전용 스택이다. 기대 항목 7/7을 프로젝트판으로 읽었고 실제 `bts-implementer`·`bts-reviewer(code/db)`를 호출했다. Vitest 도입 → RED → 스키마·마이그레이션 → 로컬 적용 → GREEN 순서를 확인했다.

- 우선순위 기본값·제약·기존 행 보존·정렬·인덱스 계획·계정 격리·비로그인 거부: **2개 파일, 6 tests passed, skipped 0**. 메인이 전용 DB로 다시 실행해 6개 통과를 확인했다.
- 초기 인덱스의 NULL 정렬 옵션으로 Sort가 생기는 것을 검출해 회귀 테스트를 더하고 후속 마이그레이션으로 보정했다. 적용한 마이그레이션은 수정하지 않았다. 작은 fixture의 강제 인덱스 계획이므로 운영 플래너 선택을 보증하지 않는다.
- 로컬 `supabase db advisors --local --type security --fail-on error`: exit 0, **No issues found**. public 테이블 중 RLS 미적용 0개. 메인이 재실행해 같은 결과를 확인했다.
- 타입 검사 5개·전체 Biome·변경 파일 검사 통과. 기존 warning 2개/info 1개는 유지. `db:generate` 재실행은 `No schema changes`다.
- DB·코드 리뷰 승인, Vitest 첫 행 유지, audit은 의도적으로 비운 `[confirm]` 하나만 남았다. 원격 스테이징·배포는 하지 않았다.
- 두 템플릿 단위 테스트는 각각 **160 통과, 0 실패**. 공유 파일 동일성·형식·구문 검사·독립 코드 리뷰도 통과했다.

이 결과는 Supabase E 작업 한 번에 대한 검증이다. 나머지 7개 공통 시나리오를 Supabase에서 모두 다시 실행한 것은 아니며, 전체 로컬 스택·원격 RLS·Codex App UI·훅 활성 상태는 포함하지 않는다.

평가 정리: 두 베이스 프로젝트의 project scope Claude 플러그인 각 4개를 제거했다(8회 모두 exit 0). 평가용 브라우저·개발 서버·Postgres 컨테이너를 종료했고 Supabase는 `supabase stop`으로 중지했다. 임시 Codex 프로필 2개도 제거했다. 사용자 Codex `config.toml`과 저장소의 미추적 `.claude/settings.json`은 보존했다.

## 디자인 스타일 카탈로그와 디자인 스킬 검토 (2026-09-30 추가)
`use-design-md` 추가, `bts-ui`의 디자인 카탈로그 스타일 선택(공유 파일), B 행 문구 변경과 검토 판단은 [bts-next-neon의 VERIFICATION.md](../prokit-next-neon/VERIFICATION.md#디자인-스타일-카탈로그와-디자인-스킬-검토-2026-09-30-추가)에 적었다. 이 템플릿의 공식 도메인 스킬은 24개가 됐다. 행동 확인은 neon fixture에서만 했다.

## Google DESIGN.md 명세 검토 (2026-09-30 추가)
`impeccable-map.md`의 "DESIGN.md 검사"(명세 CLI의 lint·diff), getdesign.md 후보 목록 결함 수정, B 행 증거 문구 변경(공유 파일과 `docs/dev-workflow.md`)과 채택하지 않은 것은 [bts-next-neon의 VERIFICATION.md](../prokit-next-neon/VERIFICATION.md#google-designmd-명세-검토-2026-09-30-추가)에 적었다. 행동 확인은 neon fixture에서만 했다.

## DESIGN.md 효과 측정 (2026-09-30 추가)
서비스 4개를 `DESIGN.md`가 있을 때와 브랜드 이름·대표 색만 줄 때로 나눠 만든 A/B 측정, 그 과정에서 고친 공유 파일(`impeccable-map.md`의 대표 색 확인과 글자 크기 토큰 규칙)은 [bts-next-neon의 VERIFICATION.md](../prokit-next-neon/VERIFICATION.md#designmd-효과-측정-2026-09-30-추가)에 적었다. 측정은 neon fixture에서만 했다.

## 디자인 카탈로그 추가와 랜딩페이지 샘플 (2026-09-30 추가)
디자인 카탈로그에 awesome-design-md와 Refero Styles를 더한 것(`impeccable-map.md`, 공유 파일), 설치기 `.gitignore`의 impeccable 작업 파일 항목(공유 파일 `install.mjs`), 랜딩 샘플 4개 실행과 찾은 결함은 [bts-next-neon의 VERIFICATION.md](../prokit-next-neon/VERIFICATION.md#디자인-카탈로그-추가와-랜딩페이지-샘플-2026-09-30-추가)에 적었다. 샘플 실행은 neon fixture에서만 했다.

## 샘플 리디자인과 시각 자산 단계 (2026-09-30 추가)
`bts-ui`의 리디자인 절차와 시각 자산 단계(`SKILL.md`, `impeccable-map.md`, 공유 파일), 템플릿 README 7번 보강, 샘플 8개 리디자인과 정적 HTML 내보내기, 찾은 결함은 [bts-next-neon의 VERIFICATION.md](../prokit-next-neon/VERIFICATION.md#샘플-리디자인과-시각-자산-단계-2026-09-30-추가)에 적었다. 샘플 실행은 neon fixture에서만 했다.

## 샘플을 사이트맵 전체 페이지로 넓히기 (2026-10-01 추가)
`bts-ui`의 사이트맵·상호작용·이름과 문구 규칙과 인물 사진 규칙(`SKILL.md`, `impeccable-map.md`, 공유 파일), 샘플 8개를 모든 페이지로 넓힌 실행, 작업공간 손실과 복구, 찾은 결함은 [bts-next-neon의 VERIFICATION.md](../prokit-next-neon/VERIFICATION.md#샘플을-사이트맵-전체-페이지로-넓히기-2026-10-01-추가)에 적었다. 샘플 실행은 neon fixture에서만 했다.

## 화면만 프로젝트, HTML 내보내기, 키 훅 (2026-10-02 추가)
`scripts/export-html.mjs`, `scripts/load-keys.mjs`, 설치기의 `export:html`·`/html/`·키 훅·`!html`, `bts-ui` "화면만 프로젝트" 절과 `references/screen-only.md`(모두 공유 파일), `gpt-image` 스킬(공식 스킬 25개)의 실제 확인과 찾은 결함은 [bts-next-neon의 VERIFICATION.md](../prokit-next-neon/VERIFICATION.md#화면만-프로젝트-html-내보내기-키-훅-2026-10-02-추가)에 적었다. 화면만 프로젝트는 neon 템플릿으로만 만들므로 실행은 neon fixture에서만 했다. supabase는 두 템플릿 테스트(175개)로 공유 파일이 같은지와 설치기 동작을 확인했다.

## 디자인 카탈로그 세 곳 늘 찾기 (2026-10-05 추가)
`impeccable-map.md`(공유)의 카탈로그 절차 보완(세 곳 늘 찾기, 브랜드 지목 때 웹 검색, Refero 받기 대체 경로)과 실제 확인은 [bts-next-neon의 VERIFICATION.md](../prokit-next-neon/VERIFICATION.md#디자인-카탈로그-세-곳-늘-찾기-2026-10-05-추가)에 적었다.

## 이름 바꾸기: bts-* → prokit-*, bts-starter-kit → pro-kit (2026-10-06 추가)
템플릿·스킬·에이전트·마커 이름을 `prokit-*`로, 저장소 이름을 `pro-kit`으로 바꿨다. 이 절 위의 기록은 그때 이름을 그대로 두고, 디렉터리가 바뀐 링크만 고쳤다. 설치기의 옛 마커 인식과 옛 이름 경고(공유 파일), 테스트(두 템플릿 각각 177 통과), 한계는 [prokit-next-neon의 VERIFICATION.md](../prokit-next-neon/VERIFICATION.md#이름-바꾸기-bts---prokit--bts-starter-kit--pro-kit-2026-10-06-추가)에 적었다. 이 템플릿만의 항목은 ADR 이름 `docs/adr/0001-prokit-next-supabase-stack.md`다.

## 사이트 하단 제작 표시 (2026-10-07 추가)
프로킷으로 만든 사이트는 하단에 "이 사이트도 프로킷으로 만들었어요", 프로킷 로고, 프로킷 사이트 주소, GitHub 주소를 둔다(사용자 결정 2026-10-07. 2026-10-08 선택으로 바꿈, 아래 절).

### 바꾼 것
- `files/apps/web/src/components/prokit-credit.tsx`: `<ProkitCredit />`. 프로킷 사이트 푸터의 한 줄과 같은 모양(심볼 20px, 프로킷 사이트로 가는 밑줄 링크 "이 사이트도 프로킷으로 만들었어요", GitHub 링크, text-sm). 심볼은 글자 색(`currentColor`)으로 칠하고 몸통을 mask로 비워 바탕색이 비친다. 주소는 `PROKIT_LINKS` 한 곳. 두 템플릿 공통 파일. 처음 판(주소를 글자로 보이는 두 링크, text-xs)은 같은 날 사용자와 정해 바꿨다.
- `prokit-ui` "규칙"에 제작 표시(필수. 2026-10-08 선택으로 바꿈, 아래 절), `references/screen-only.md`에 내보내기 exit 3.
- `scripts/export-html.mjs`: 쪽마다 문구와 GitHub 주소를 보고, 없는 쪽이 있으면 경로를 알리고 `html/`을 만들지 않고 exit 3(`missingCredit`). 처음에는 첫 페이지만 봤고, 같은 날 사용자 결정(모든 쪽 하단)으로 넓혔다. 문구는 태그를 걷어 내고 본다("프로킷"을 감싼 span, React의 `<!-- -->`). 프로킷 사이트 주소는 옮길 수 있어 보지 않는다.

### 실제 확인 (2026-10-07)
- 컴포넌트를 BTS 프로젝트(`../pro-kit-samples/ws/goru`)의 `apps/web/src/components/`에 잠시 넣고 `tsc --noEmit -p apps/web` exit 0, 그 프로젝트의 `biome.json`으로 `biome check` 통과. 확인 뒤 파일을 지웠다(두 판 모두).
- 심볼을 흰 바탕·검은 바탕·남색 바탕에 그려 원본 심볼(`brand/web/prokit-symbol.svg`)·반전(`prokit-symbol-inverse.svg`)과 같게 보이는 것을 Chrome 스크린샷으로 확인했다.
- `node --test 'templates/<템플릿>/tests/*.test.mjs'` 두 템플릿 모두 178개 통과(새 테스트: 제작 표시 검사, 공통 파일 목록).

- 심볼 mask id를 표시마다 `useId`로 따로 둔다. 고정 id면 한 쪽에 표시가 둘이고 하나가 가려질 때(모바일 메뉴) 보이는 쪽 심볼이 사각형으로 나온다(ullim 프리셋에서 발견, Chrome에서 재현). goru 프리셋에 넣어 `tsc` exit 0, 정적 내보내기와 site-check 문제 0, 내보낸 HTML의 mask id가 `prokit-credit-_S_3_`처럼 표시마다 붙는 것을 확인했다.

### 한계
- 새로 설치한 프로젝트에서 처음부터 화면을 만들고 `pnpm export:html`이 표시를 확인하는 전체 흐름은 아직 돌리지 않았다. 기존 프리셋에 넣는 라운드에서 확인한다.
- MIT라서 사용자가 표시를 지우는 것을 막을 수는 없다. 템플릿 기본값과 내보내기 검사로 빠뜨리지 않게만 한다.

## Antigravity·Grok Build (2026-10-08 추가)
사용자 요청으로 설치한 프로젝트를 Google Antigravity와 xAI Grok Build에서도 쓰게 했다.

### 바꾼 것
- `scripts/sync-agents.mjs`: `.claude/agents`(정본)에서 `.codex/agents/*.toml`과 함께 Antigravity용 `.agents/agents/*.md`를 만든다. 메인 에이전트로 고르지 않게 `mainAgent: false`를 적는다. 쓰기 도구가 없는 에이전트(리뷰어)에는 공식 문서 예시의 `view_file`, `grep_search`, `run_command`만 준다. 문서에 도구 전체 목록이 없고 틀린 이름은 서브에이전트를 멈추게 할 수 있어서다. 모델은 적지 않아 세션 모델을 쓴다. `--check`가 두 생성물을 모두 본다. Grok Build는 `.claude/agents`를 그대로 읽어 생성물이 없다.
- 스킬 문서: `prokit-dev-cycle`(구현 전 `ponytail` 읽기, `process-routing.md`의 도구별 이름), `prokit-ui`(impeccable 훅이 돌지 않음, 이미지 도구 `generate_image`·`image_gen`, 세션을 연 뒤 넣은 키), `impeccable-map.md`.
- `install.mjs`의 다음 할 일 안내, README "설치한 뒤" 3번.
- `.dev-cycle.json`: H 케이스 경로에 `.agents/agents/`를 더했다(생성물만 바뀌어도 하네스 변경으로 본다).
- 테스트: sync-agents(생성물, 고아 정리, tools 줄, description이 YAML에서 원문대로 읽히는지), install(생성물), template-docs(안내 문구), dev-cycle-classify(`.agents/agents` → H).

### 실제 확인 (2026-10-08)
- 새 BTS 프로젝트(scratchpad)에 neon 템플릿을 설치했다. supabase 템플릿은 따로 설치하지 않았다(바꾼 설치 파일과 스크립트는 두 템플릿에서 바이트가 같다). `pnpm agents:check` "에이전트 정의 일치", `.agents/agents`에 두 에이전트가 생겼고, 생성물은 그 프로젝트의 Biome에서 고칠 것이 없었다.
- Antigravity CLI 1.3.1: `agy -p`로 물어 `AGENTS.md`, 서브에이전트 2개, prokit 스킬 8개를 읽는 것을 확인했다. 같은 프로젝트 복사본에서 `agy -p … --dangerously-skip-permissions`로 첫 화면 제목 바꾸기를 dev-cycle로 맡겼다(15분). 케이스 B 대조표를 열고 1~12행을 채웠다. 구현은 `prokit-implementer`, 리뷰는 `prokit-reviewer`(approve, 지적 0)를 서브에이전트로 불렀다. check-types·biome·build exit 0, 1440·390 스크린샷, critique 36/40, audit 20/20. `pnpm dev-cycle audit`은 요청대로 확인 직전에서 멈춰 #13 [confirm]만 비었다고 실패했다. 기본 포트가 차 있어 개발 서버를 3000으로 띄웠다가 껐다.
- Grok Build 1.0.46: 신뢰하지 않은 폴더에서는 `grok inspect`에 에이전트만 보이고 프로젝트 규칙과 스킬이 없다. `grok --trust`로 연 폴더에서는 `AGENTS.md`·`CLAUDE.md`, 에이전트 2개, prokit 스킬 8개, `.claude/settings.json` 훅을 읽었다. 같은 라운드를 맡기자 `prokit-dev-cycle`을 읽고 케이스 B 대조표를 연 뒤 `prokit-ui`와 `impeccable context`까지 진행했고, 82초 만에 무료 사용량 한도("free Grok Build usage limit")로 멈췄다. 유료 요금제(SuperGrok)는 쓰지 않았다. Grok Build는 Claude 호환이 기본으로 켜져 있어, 이 측정에는 사용자 전역 Claude 플러그인(OMC, superpowers 등)과 `~/.claude/CLAUDE.md`가 함께 실려 있었다.
- `node --test 'templates/<템플릿>/tests/*.test.mjs'` 두 템플릿 모두 통과.

### 한계
- Grok Build의 구현 위임, 리뷰 서브에이전트, audit은 확인하지 못했다.
- 두 도구로 pro-kit 저장소에서 새 프로젝트를 만드는 흐름(저장소 `AGENTS.md` "템플릿으로 새 프로젝트 만들기")은 돌리지 않았다.
- 이미지 도구(`generate_image`, `image_gen`)로 comp를 그리는 화면 라운드는 돌리지 않았다.
- 키 불러오기: Antigravity에는 세션 시작 훅이 없다. Grok Build가 `.claude/settings.json`의 세션 시작 훅을 실제로 실행하는지는 보지 않았다. 두 도구 모두 `load-keys -- <명령>` 대체 경로를 안내한다.
- impeccable 편집 훅: Antigravity에서는 돌지 않는다. Grok Build는 신뢰한 폴더에서 `.claude/settings.local.json` 훅을 읽지만 실제로 도는지는 확인하지 않았다. 두 도구 모두 화면을 고친 뒤 critique의 detector로 확인하게 안내한다.

## MIT 확정과 제작 표시 선택 (2026-10-08 추가)
- 라이선스: 같은 날 목적별 이용 조건(제작 표시, 수탁 제한)을 검토해 루트 LICENSE와 두 `files/licenses/PROKIT-LICENSE.txt`에 넣었다가, 사용자 최종 결정으로 표준 MIT로 확정했다. 유료 고객 개발·수정·재판매를 허용하고 저작권 표시·허가문을 보존한다.
- 루트 LICENSE와 두 `files/licenses/PROKIT-LICENSE.txt`는 표준 MIT 전문이 바이트 단위로 같다. 생성 앱의 적용 경로는 `PROKIT-SCOPE.md`가 구분한다(제공 원본의 고지와 사용자 독자 작성분·수정분의 권리). 각 템플릿의 실제 `copyFiles`를 임시 프로젝트에 실행해 두 안내 파일 복사, 정본 전문 일치, 기존 앱 LICENSE 보존을 확인했다.
- 외부 스킬은 manifest와 skills CLI로 원본 출처에서 설치하는 방식을 유지한다. 설치 목록·스킬 라우팅·설치 실행 코드는 바꾸지 않았다. 원본 조건과 라이선스를 확인하지 못한 두 출처는 루트 `THIRD_PARTY_NOTICES.md`에서 구분한다.
- 제작 표시 컴포넌트는 선택해서 쓸 수 있다. UI 규칙·문서의 필수 표시 안내와 `export-html.mjs`의 제작 표시 누락 exit 3 분기를 제거했다. 원문 저작권·허가문 보존은 선택 홍보 표시와 별개다.
- 기존 결과물 보존을 유지한다. 첫 페이지가 없으면 exit 1로 멈추고, 비밀값이 들어가면 기존 유출 검사로 exit 2로 막는다.
- 변경 전 신규 내보내기 테스트에서 표시 없는 결과의 성공 기대(0)와 첫 페이지 누락의 일반 실패 기대(1)가 각각 실제 exit 3으로 실패함을 확인한 뒤 구현했다.
- 변경 후 전체 테스트: Neon 181/181, Supabase 181/181, 루트 scripts 16/16 PASS, 모두 fail 0.
- 내보내기 통합 테스트는 실제 `main`의 복사·검사·출력 교체를 실행한다. 느린 pnpm 설치·Next 빌드는 통제된 결과 fixture로 대체하며, 이 변경을 확인하기 위한 실제 Next 앱 빌드는 실행하지 않았다.
- `node --check`로 두 내보내기 스크립트 문법을 확인하고 정본 사본·공통 파일 일치·상대 링크·diff를 점검한다. 이번에 외부 스킬 신규 설치·DB·공개 배포는 실행하지 않았다.
- 이 검증은 파일 전달·기존 동작·문서 정합성에 관한 것이다. 전체 원본의 상업 이용 적합성이나 법적 집행 가능성을 보장하는 검증은 아니다.

## 릴리스 버전 규칙: 기본 patch, --minor (2026-10-08 추가)
- 요청: 설치되는 `files/scripts/release.mjs`(공유)의 버전 규칙을 이 저장소 `scripts/release.mjs`와 같게 맞춘다. 첫 릴리스 `0.1.0`, 기본 patch(`feat:` 포함), `--minor`를 줄 때만 minor, `!`·`BREAKING CHANGE:`는 0.x 동안 minor이고 1.0 이상이면 major다. 1.0.0은 자동으로 만들지 않는다.
- 바꾼 것: `nextVersion`이 `{ minor }` 옵션을 받고, `main`이 `--minor`를 읽는다. `--publish`의 버전 일치 검사는 `--minor` 여부 둘 다 받아 준다. 같은 규칙으로 두 README, `prokit-deploy`·`prokit-dev-cycle` 스킬, handbook(`deploy/release.md`, `reference/commands.md`, `concepts/dev-cycle.md`)을 고쳤다.
- 확인: `tests/release.test.mjs`(공유)의 버전 기대값을 새 규칙으로 고치고(기본 patch, `--minor`, 0.x의 `!`는 minor, 1.x의 `!`는 major) 실패하는 것을 본 뒤 구현했다. CLI 시나리오는 `feat:` 커밋의 기본 노트가 patch(v0.1.1)이고 `--minor` 노트가 minor(v0.2.0)로 발행되는 것까지 거친다. `tests/template-docs.test.mjs`는 릴리스 절이 `--minor`를 안내하고 `feat:`를 minor로 적지 않는지 본다.
- 결과: Neon 181/181, Supabase 181/181, `scripts/handbook.test.mjs` 7/7, `scripts/release.test.mjs` 6/6, 모두 fail 0.
- 한계: 앞선 "릴리스와 버전 관리 (2026-09-28 추가)" 절의 `feat:`는 minor 설명은 당시 기록이라 고치지 않았다. 이미 설치한 프로젝트는 "템플릿 변경 반영" 절차로 `release.mjs`와 스킬 문서를 받는다.

## 공개 전 정비 (2026-10-08 추가)
- 설치기 사전 점검(`install.mjs`, 공유): Node 20 미만만 막던 것을 22.20 미만에서 멈추고 24 미만이면 권장 경고만 내도록 바꿨다. 22.20은 skills CLI 1.7.1의 `engines`(create-better-t-stack 3.44.3은 22.12, Next 16.4는 20.9)다. agent-browser 0.38.2는 `engines`에 24 이상을 적지만 Node 22.23.3에서 `npm i`(EBADENGINE 경고만)와 `--version`이 됐다. 같은 Node 22.23.3에서 두 템플릿 테스트(각 183)와 저장소 scripts 테스트가 모두 통과했다. `preflight`가 Node 판을 셋째 인자로 받아 `install.test.mjs`에서 20.19.0·22.19.0은 멈추고, 22.20.0은 경고, 24.0.0은 경고 없이 통과하는지 본다. 테스트를 먼저 고쳐 실패를 본 뒤 고쳤다.
- `tests/shared-files.test.mjs`: 공통 파일에 `files/licenses/PROKIT-LICENSE.txt`를 더하고, 저장소 루트 `LICENSE`와 바이트가 같은지 본다.
- `files/licenses/PROKIT-SCOPE.md`: 목적별 조건 시절의 "기존 MIT 사본의 조건" 문장을 지웠다.
- `files/scripts/skills-setup.mjs`(공유)의 주석과 `skills-setup.test.mjs` 테스트 이름에 남은 옛 판 번호를 날짜로 바꿨다.
- README: 공식 스킬, Codex superpowers, 프로젝트 스킬, 에이전트 수에 값 표시(`node scripts/doc-values.mjs`)를 달고, UI/UX 링크를 `handbook/design/ui-flow.md`로 옮겼다.
- 이 기록과 저장소 공개 파일의 실제 프로젝트 이름을 일반 이름(`my-app`, "실사용 프로젝트 A")으로 바꿨다.
- 결과: `node --test 'templates/<템플릿>/tests/*.test.mjs'` 두 템플릿 모두 183/183 통과.

## 미검증 항목
- **스킬 연결 보강의 Supabase 범위**: 위 Codex 검수에서 DB 사례를 추가 확인했다. 공통 7개 시나리오 전체를 Supabase fixture에서 다시 실행한 것은 아니다.
- **Supabase 전체 로컬 스택**: Podman으로 DB만 띄워 확인했다. Studio·Auth·REST 등 전체 서비스를 Podman에서 띄우는 것은 확인하지 않았다(앱은 쓰지 않는다).
- **원격 Supabase(스테이징·운영)**: 임시 프로젝트 하나로 `supabase link`, session pooler URL로 `db:migrate`, `advisors --db-url`, transaction pooler(6543)에서 배포한 앱의 가입·로그인을 확인했다(위 Vercel 배포 절). 스테이징과 운영을 서로 다른 프로젝트로 나눈 운영 흐름은 확인하지 않았다.
- **스킬 동작 eval 범위**: `bts-db` eval 3개와 회귀 eval 4개만 돌렸고, 실행은 조건마다 1회라 편차는 모른다. `bts-web`·`bts-ui` eval, 수정 뒤 `bts-db` eval-3, 트리거 eval(description은 바꾸지 않았다)은 다시 돌리지 않았다. eval 프롬프트는 스킬 경로를 직접 주고, 스킬 있음 쪽 프롬프트에만 다른 스킬 이름이 예시로 들어 있다. 그래서 대조표 사용 여부의 차이를 모두 스킬 효과로 볼 수는 없다.
- **`--with-global`로 깨끗한 기기에 전역 도구 설치**: 이 기기에는 모든 전역 도구가 이미 있어 설치 경로는 단위 테스트(스텁)로만 확인했다. gstack `./setup`은 bun과 전역 훅 등록을 동반한다.
- **Docker 엔진**: Podman으로만 확인했다.
- **실제 Windows**: WSL2 흉내 검증만 했다. 실제 WSL2의 systemd 소켓(`systemctl --user enable --now podman.socket`), Windows 브라우저에서 WSL 개발 서버 접속, Docker Desktop의 WSL 통합, x64 Linux에서 agent-browser 화면 확인, Windows 셸 가드의 실제 실행(단위 테스트만)은 확인하지 않았다.
- **도메인 문서 운용 지침**: 동작 eval에서 스킬을 쓴 실행 대부분이 `CONTEXT.md` 용어와 `project.md` API·데이터 모델 표(`용어` 칸 포함)를 고쳤다. 화면이 있는 F 라운드에서 주요 흐름·화면 표를 고치는지, `bts-reviewer`가 용어 어긋남을 실제로 잡는지는 보지 않았다.
- **새 F 행 전체 라운드**: 스펙 테스트 시나리오, 공통화·리팩토링 점검, 시나리오 QA와 발견 수정·재QA를 템플릿으로 새로 만든 프로젝트에서 처음부터 돌린 라운드는 없다. my-app은 이미 진행한 T1 라운드의 QA를 새 규칙으로 다시 돌렸다.
