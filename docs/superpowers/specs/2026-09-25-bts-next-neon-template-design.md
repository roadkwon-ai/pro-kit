# BTS Next.js + Neon 개발 템플릿 설계 (스킬·에이전트·dev-cycle)

작성일: 2026-09-25
상태: 대화에서 섹션 1~6과 추가 섹션(프로세스 스킬 라우팅) 승인 완료. 스펙 문서 검토 대기.
관련 자료:
- [Better-T-Stack 도구 검토](../../research/2026-09-20-better-t-stack-tooling-review.md)

## 1. 목표와 성공 기준

Better-T-Stack(이하 BTS)으로 만든 Next.js 풀스택 프로젝트에 **한 번 설치하면** 다음 네 가지가 갖춰지는 재사용 템플릿을 만든다.

1. Next.js·React·Neon·Better Auth·UI 공식 스킬이 프로젝트 범위에 설치되고, 버전이 lock 파일로 고정된다.
2. 공식 스킬을 언제 어떤 순서로 쓸지 지시하는 **프로젝트 전용 스킬 6개**가 들어간다. 스킬은 공식 스킬 내용을 복사하지 않고 연결과 프로젝트 규칙만 담는다.
3. 구현 에이전트와 읽기 전용 리뷰 에이전트가 Claude Code와 Codex 양쪽에 동일한 정의로 들어간다.
4. 변경 종류를 diff로 판정하고, 필수 단계의 증거 빈칸을 기계로 세는 **경량 dev-cycle**이 들어간다. UI 작업은 impeccable로 기획·설계·개발·리뷰한다.
5. 설계·계획·구현·디버깅·리뷰·QA·검증 단계마다 쓸 **프로세스 스킬**(superpowers 중심, gstack·OMC·OMX·mattpocock 보강)이 라우팅 표로 정해지고, 스킬이 없는 환경에서는 대체 절차로 동작한다.

성공 기준:

- 새 BTS 프로젝트에서 `install.sh` 한 번으로 위 구성이 끝나고, 두 번 실행해도 결과가 같다(멱등).
- 스킬 6개가 skill-creator 동작 eval에서 with-skill assertion 통과율 85% 이상을 기록하고, without-skill 기준선보다 뚜렷하게 높다.
- 트리거 eval에서 스킬별 정확도가 90% 이상이다. 미달한 스킬은 description 최적화를 거친 결과를 기록한다.
- 러너·에이전트 동기화 단위 테스트와 `install.sh` 스모크 테스트가 통과한다.
- 실행하지 못한 검증(Codex 실사용, 실제 Neon DB E2E 등)은 결과 문서에 미검증으로 남긴다.

## 2. 결정 기록

| 항목 | 결정 | 근거 |
|---|---|---|
| 사용 목적 | 여러 프로젝트에 복사하는 재사용 템플릿 | 사용자 선택 |
| DB | Neon (Lakebase Postgres) | 사용자 선택. Supabase 올인안을 검토했으나 이번에는 Neon을 쓰기로 함 |
| 인증 | BTS가 생성하는 자체 관리 Better Auth | BTS가 첫날부터 동작하는 코드를 생성하고, 공식 `neon-auth` 스킬도 "Better Auth가 동작하면 유지"를 권장함 |
| 보안 축 | 서버 코드의 세션·소유권 검사 + 2계정 격리 테스트 | RLS를 쓰지 않는 구성이므로 앱 코드가 마지막 방어선이 됨 |
| dev-cycle 무게 | 의존성 없는 경량 러너(case/table/status/audit/close) | kit의 판정 자동화와 빈칸 감사 효과를 유지하면서 무게를 줄임 |
| 배포 형태 | 이 저장소의 복사형 템플릿 + `install.sh` | 설치된 파일은 프로젝트 소유이며 자유롭게 수정·커밋한다 |
| 지원 도구 | Claude Code와 Codex 모두 완전 지원 | 사용자 선택 |
| 스킬 구성 | 오케스트레이터 1개 + 스택 래퍼 4개 + 검증 1개 | 공식 스킬을 정본으로 두고 연결만 담는 원칙에 가장 잘 맞음 |
| UI 리뷰어 에이전트 | 두지 않음 | impeccable `critique`가 독립 평가자 서브에이전트를 스스로 띄운다. 서브에이전트 안에서는 서브에이전트를 다시 띄울 수 없으므로, 전용 에이전트로 감싸면 평가 품질이 떨어짐 |
| 공식 스킬 설치기 | skills CLI의 프로젝트 범위 설치와 `skills-lock.json` | kit의 3,214줄 `install.py`를 대신함. 복원은 CLI 명령 한 줄 |
| BTS `skills` addon | 사용하지 않음 | 대화형 프롬프트가 뜨고, Neon 상위 스킬과 impeccable이 빠짐. 설치 목록은 `install.sh` 한 곳에서 관리 |
| 프로세스 스킬 우선순위 | superpowers가 1순위, gstack은 계획 리뷰·QA, OMC·OMX는 대규모 병렬 실행 대안, mattpocock은 도메인 모델링 | superpowers만 Claude·Codex 양쪽에 같은 이름으로 있음. gstack은 양쪽에 있으나 Codex에서 `gstack-` 접두어, OMC는 Claude 전용, OMX는 Codex 전용 |
| mattpocock/skills | `domain-modeling`, `grilling`, `grill-with-docs`만 프로젝트에 설치 | superpowers에 없는 고유 기능(용어 고정과 ADR). `tdd`·`diagnosing-bugs`는 superpowers와 트리거가 겹치고, `to-spec`·`code-review`·`triage`는 이슈 트래커 설정이 먼저 필요함 |
| 용어 정본 | 루트 `CONTEXT.md` + `docs/adr/` (`glossary.md`는 만들지 않음) | `domain-modeling` 형식을 따르며 mattpocock의 다른 스킬도 이 파일을 읽음. 코드 매핑은 `docs/domain/project.md`가 맡음 |

## 3. 대상 스택

### 3.1 생성 명령

```bash
pnpm create better-t-stack@latest my-app \
  --frontend next --backend self --runtime none \
  --database postgres --orm drizzle --db-setup docker \
  --auth better-auth --api orpc \
  --addons turborepo biome --package-manager pnpm
bash <이 저장소>/templates/bts-next-neon/install.sh my-app
```

`--db-setup docker`는 `pg` 드라이버와 `packages/db/docker-compose.yml`, 로컬 `DATABASE_URL`을 만든다. 개발은 로컬 컨테이너(Podman·Docker) Postgres에서 하고, 병합 전 검증과 운영은 Neon 브랜치에서 한다. 정확한 플래그는 README가 정본이다.

변경 기록(2026-09-25, 구현 후): 처음에는 `--db-setup neon`이었다. 그 생성물은 Neon 전용 HTTP 드라이버(`@neondatabase/serverless` + `drizzle-orm/neon-http`)라 로컬 Postgres에 붙지 않아, 로컬 개발 요구에 맞춰 `docker`로 바꿨다. 실측은 VERIFICATION.md의 "로컬 Podman DB 전환".

### 3.2 BTS가 생성하는 구조 (템플릿이 가정하는 레이아웃)

BTS 템플릿 소스(`packages/template-generator/templates/`)를 읽어 확인한 결과다.

| 경로 | 내용 |
|---|---|
| `apps/web` | Next.js 앱. `src/app/api/rpc/[[...rest]]/route.ts`(oRPC), `src/app/api/auth/[...all]/route.ts`(Better Auth), `src/app/login`, `src/app/dashboard`, `src/lib/auth-client.ts`, `src/utils/orpc.ts` |
| `apps/web/AGENTS.md` | Next.js가 `next dev` 때 생성·재생성한다. "`node_modules/next/dist/docs/`를 먼저 읽으라"는 규칙을 담는다 |
| `packages/api` | oRPC 라우터(`src/routers/`)와 context |
| `packages/auth` | Better Auth 서버 설정 |
| `packages/db` | Drizzle 스키마 `src/schema/`, 마이그레이션 `src/migrations/`, `drizzle.config.ts`. 환경변수는 varlock으로 로드 |
| `packages/ui` | shadcn 컴포넌트, `src/styles/globals.css`(디자인 토큰) |
| `packages/config` | 공용 tsconfig |

레이아웃이 다르면 `install.sh` 사전 점검이 경고하고, 사용자는 `.dev-cycle.json`의 경로 규칙을 고쳐 맞춘다.

## 4. 템플릿 구조와 설치

### 4.1 이 저장소의 템플릿 위치

```
templates/bts-next-neon/
  README.md                  사용법, 생성 명령, 설치 후 할 일
  install.sh                 install.mjs를 실행하는 bash 래퍼
  install.mjs                멱등 설치기 (외부 의존성 없음)
  files/                     새 프로젝트 루트에 복사되는 파일
    AGENTS.md                공통 규칙 정본 (Codex·Claude 공용)
    CLAUDE.md                @AGENTS.md + Claude 전용 몇 줄
    .agents/skills/bts-dev-cycle/ bts-web/ bts-api/ bts-db/ bts-ui/ bts-verify/
    .claude/agents/bts-implementer.md, bts-reviewer.md
    scripts/dev-cycle.mjs
    scripts/sync-agents.mjs
    .dev-cycle.json
    docs/dev-workflow.md     케이스별 절차 정본 (러너가 파싱)
    CONTEXT.md               용어 정본 (domain-modeling 형식)
    docs/adr/0001-bts-next-neon-stack.md  스택 결정 기록
    docs/domain/project.md
    tasks/todo.md
  tests/                     러너·동기화 단위 테스트, install 스모크 테스트
  evals/<skill>/evals.json   skill-creator 동작 eval
  evals/<skill>/triggers.json 트리거 eval 쿼리
  VERIFICATION.md            검증 결과와 미검증 한계
```

스킬 이름의 `bts-` 접두어는 사용자 전역의 `nextjs`, `supabase` 같은 스킬과 이름이 충돌하지 않도록 붙인다.

### 4.2 `install.sh` 동작

사용법: `install.sh <project-dir> [--diff] [--skip-skills]`. 설치기 본체는 `install.mjs`이고 `install.sh`는 그것을 실행하는 래퍼다. 대상 경로는 실재 경로(`realpath`)로 바꿔서 쓴다.

1. **사전 점검.** 대상이 git 저장소인지, `apps/web/package.json`에 `next` 의존성이 있는지, Node 20 이상과 pnpm이 있는지 확인한다. 하나라도 실패하면 exit 1로 중단한다. `packages/db/drizzle.config.ts`, `packages/api`, `packages/auth`가 없으면 경고만 하고 계속 진행한다.
2. **파일 복사.** `files/`의 각 파일을 다음 규칙으로 처리한다.
   - 대상에 파일이 없으면 복사한다.
   - 내용이 같으면 건너뛴다.
   - 내용이 다르면 **덮어쓰지 않고** 보고한다. `--diff`를 주면 차이를 출력한다.
   - 예외: 대상에 `AGENTS.md`나 `CLAUDE.md`가 이미 있고 템플릿 마커 블록(`<!-- bts-template:start -->` ~ `<!-- bts-template:end -->`)이 없으면, 그 블록을 파일 끝에 덧붙인다. 블록이 이미 있으면 건너뛴다.
3. **스킬 링크.** 각 `.agents/skills/bts-*`에 대해 `.claude/skills/bts-*` → `../../.agents/skills/bts-*` 상대 심볼릭 링크를 만든다. skills CLI가 공식 스킬을 설치하는 방식과 같다.
4. **명령과 기본 브랜치 기록.** `.dev-cycle.json`을 이번 실행에서 새로 복사한 경우에만 다음을 채운다.
   - `commands`: 루트 `package.json`의 scripts 중 존재하는 것(`check-types`, `build`, `test`, `db:generate`, `db:migrate`, `db:push`)으로 채운다. db 스크립트가 `turbo run <s> -F <pkg>` 형태면 `pnpm --filter <pkg> <s>`로 기록한다(turbo interactive 태스크는 TTY 없는 에이전트 셸에서 실패한다, Task 14에서 발견). `lint`는 `biome.json`·`biome.jsonc`가 있으면 `pnpm exec biome check .`(BTS의 `check`는 `--write`로 파일을 고치므로 쓰지 않는다), 없으면 `lint` 스크립트를 쓴다.
   - `defaultBranch`: `origin/HEAD`가 가리키는 브랜치, 없으면 로컬 `main`·`master` 중 먼저 있는 것, 그것도 없으면 현재 브랜치로 기록한다(BTS는 `master`로 초기화한다. 기능 브랜치에서 설치해도 그 브랜치를 기본 브랜치로 적지 않는다). 모두 없으면 템플릿 값 `main`을 그대로 둔다.
5. **npm 스크립트.** 루트 `package.json`에 `dev-cycle`, `agents:sync`, `agents:check`가 없으면 추가한다. 이미 있으면 그대로 둔다.
6. **biome 설정과 포맷.** 대상에 `biome.json`이 있으면 `files.includes`에 `!.agents/skills`와 `!skills-lock.json`을 추가한다. BTS의 `pnpm check`(`biome check --write .`)가 벤더 스킬을 고쳐 쓰면 `skills-lock.json`의 내용 해시가 깨지기 때문이다. `biome.jsonc`면 직접 추가하라는 경고만 출력한다. 이어서 이번에 복사한 `.mjs`·`.js`·`.json`과 수정한 `package.json`·`biome.json`을 프로젝트의 biome 설정으로 포맷한다(`node_modules/.bin/biome`이 없으면 건너뜀). BTS 원본 자체가 `biome check`를 통과하지 않으므로, 설치 검증 기준은 "원본 대비 biome 지적이 늘지 않을 것"이다.
7. **Codex 에이전트 생성.** `node scripts/sync-agents.mjs`를 실행해 `.codex/agents/*.toml`을 만든다.
8. **공식 스킬 설치.** 5장의 목록을 `npx -y skills@<고정 버전> add <source> --skill <names…> --agent claude-code codex -y`로 설치하고 `skills-lock.json`을 생성한다. skills CLI 버전은 구현 때 검증한 값(`skills@1.7.0`)으로 고정한다. `--skip-skills`를 주면 이 단계를 건너뛴다.
9. **`.gitignore`.** `tasks/evidence/` 줄이 없으면 추가한다.
10. **안내 출력.**
   - 브라우저 도구(`ego-browser`, 대안 `agent-browser`)가 있는지 보고하고, 없으면 설치 안내를 출력한다. 전역 설치는 자동으로 하지 않는다.
   - 전역 프로세스 스킬 감지 결과를 출력한다. Claude의 superpowers·gstack·OMC와 Codex의 superpowers·gstack·OMX 각각에 대해 있음/없음을 표시한다. 없어도 실패로 처리하지 않고, README의 권장 전역 설치 안내를 가리킨다.
   - 다음 할 일을 출력한다: `$impeccable hooks on`(개발자별 동의 필요), 첫 UI 라운드에서 `impeccable init`.

종료 코드: 0은 성공, 1은 사전 점검 실패 또는 Codex 에이전트 생성 실패, 2는 일부 공식 스킬 설치 실패다. exit 2일 때는 실패한 source 목록을 출력한다.

## 5. 설치할 공식 스킬

10개 upstream에서 21개 스킬을 프로젝트 범위로 설치하며, Claude Code는 `.claude/skills/`, Codex는 `.agents/skills/`에서 읽는다. 출처와 내용 해시는 `skills-lock.json`에 기록된다. 다른 환경에서는 `npx skills experimental_install`로 복원하고, 의도한 갱신은 `npx skills update -p`로 한다(dev-cycle 케이스 H).

| upstream | 스킬 | 쓰이는 곳 |
|---|---|---|
| `vercel/next.js` | `next-dev-loop`, `next-cache-components-adoption`, `next-cache-components-optimizer`, `next-partial-prefetching-adoption` | 런타임 검증, 캐시·프리패치 |
| `vercel-labs/agent-skills` | `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines` | React 구현·리뷰, UI 가이드라인 |
| `vercel-labs/agent-browser` | `agent-browser` | 브라우저 검증 대안: ego-browser를 쓸 수 없을 때, React 내부 상태 확인 (CLI는 별도 설치) |
| `shadcn/ui` | `shadcn` | UI 컴포넌트 |
| `better-auth/skills` | `better-auth-best-practices`, `better-auth-security-best-practices`, `email-and-password-best-practices` | 인증 |
| `neondatabase/agent-skills` | `neon`, `neon-postgres`, `neon-postgres-branches` | 연결, 마이그레이션, 개발 브랜치 |
| `supabase/agent-skills` | `supabase-postgres-best-practices` | 서비스에 무관한 Postgres 스키마·인덱스·쿼리 규칙 |
| `pbakaus/impeccable` | `impeccable` | UI/UX 기획·설계·개발·리뷰 |
| `vercel/turborepo` | `turborepo` | 모노레포 태스크 |
| `mattpocock/skills` | `domain-modeling`, `grilling`, `grill-with-docs` | 용어(`CONTEXT.md`)와 결정(ADR) 기록, 스펙 전 요구 심문 |

제외한 항목과 이유:
- Neon의 `neon-auth`: 자체 관리 Better Auth를 쓰기 때문이다.
- Neon의 functions, object-storage, ai-gateway, egress-optimizer와 better-auth의 organization, 2FA: 이번 범위의 기능이 아니다. 필요해지면 `install.sh` 목록에 한 줄을 추가한다.
- `next-upgrade`: upstream에 없다.
- mattpocock의 `tdd`, `diagnosing-bugs`: superpowers의 `test-driven-development`, `systematic-debugging`과 트리거가 겹친다. `to-spec`, `to-tickets`, `code-review`, `triage`: 이슈 트래커 설정(`setup-matt-pocock-skills`)이 먼저 필요하다.
- superpowers, gstack, OMC, OMX: 사용자 전역 설치 대상이라 프로젝트에 설치하지 않는다. 전역 스킬과 이름이 같은 프로젝트 스킬이 생기면 트리거가 모호해지기 때문이다(6.3).

## 6. 프로젝트 스킬 6개

### 6.1 공통 작성 원칙

- 공식 스킬 본문을 복사하지 않는다. "이 상황이면 이 공식 스킬의 이 절차를 읽는다"와 이 프로젝트의 경로·명령·금지사항만 담는다.
- SKILL.md는 150줄 이하로 쓰고, 긴 내용은 `references/`로 분리한다.
- description은 트리거 조건 중심으로 쓴다. 인접 스킬과 겹치는 영역은 "이 경우에는 쓰지 않는다"로 경계를 밝힌다. `bts-web`은 동작·구조, `bts-ui`는 모양·경험을 맡는다.
- 명령은 `.dev-cycle.json`의 `commands`를 따른다. 스킬 본문에 명령을 하드코딩하지 않는다.

### 6.2 스킬별 정의

| 스킬 | 트리거 | 연결하는 공식 스킬 | 담는 프로젝트 규칙 |
|---|---|---|---|
| `bts-dev-cycle` | 이 프로젝트에서 코드를 바꾸는 모든 작업: 기능, 버그, 리팩터, UI, 하네스 | 아래 5개 스킬, 두 에이전트, 6.3의 프로세스 스킬 | 8장 절차 전체와 6.3 라우팅 표. 커밋·push·배포는 사용자가 요청할 때만 |
| `bts-web` | `apps/web`의 라우팅, RSC 경계, 데이터 패칭, 캐시, 성능 | `next-dev-loop`, `vercel-react-best-practices`, `vercel-composition-patterns`, `next-cache-components-*`, `next-partial-prefetching-adoption`, `turborepo` | 코드 작성 전에 `apps/web/AGENTS.md`와 번들 Next 문서를 읽는다. Server Component가 기본이다. 클라이언트 데이터는 `src/utils/orpc.ts`와 TanStack Query를 쓴다. 비밀값과 서버 전용 모듈은 클라이언트 번들에 넣지 않는다. loading, empty, error, 비인가 상태를 구분한다. 새 상태관리나 UI 라이브러리는 근거 없이 추가하지 않는다 |
| `bts-api` | `packages/api`, `packages/auth`: 프로시저, 입력 검증, 세션, 권한 | `better-auth-best-practices`, `better-auth-security-best-practices`, `email-and-password-best-practices` | 사용자 데이터를 다루는 프로시저는 `protectedProcedure`가 기본이다. 소유자 id는 context의 세션에서만 가져오고 입력값을 신뢰하지 않는다. read, update, delete 조건에 소유자를 포함한다. 입력과 출력은 zod로 검증한다. 오류는 `ORPCError` 코드로 구분한다. 인증 설정이나 `packages/auth`를 바꾸면 security 리뷰가 필수다. `references/ownership-test.md`에 2계정 격리 테스트 패턴을 둔다 |
| `bts-db` | `packages/db`: 스키마, 마이그레이션, 인덱스, 쿼리 | `neon`, `neon-postgres`, `neon-postgres-branches`, `supabase-postgres-best-practices` | 스키마 변경 절차: `db:generate` → 생성 SQL 검토 → Neon 개발 브랜치에 적용 → 마이그레이션 커밋. 공유 브랜치에는 `db:push`를 금지한다. 파괴적 변경은 확장과 수축 2단계로 나눈다. 소유자 FK와 조회 조건 컬럼에 인덱스를 둔다. 시각은 `timestamptz`로 둔다. 앱은 pooled URL, 마이그레이션은 direct URL로 접속한다. 절차 상세는 `references/migration-flow.md` |
| `bts-ui` | 새 화면, 리디자인, 디자인 리뷰, 폴리시, UX 문구 | `impeccable`(주력), `web-design-guidelines`, `shadcn` | 9장 흐름. `PRODUCT.md`와 `DESIGN.md`가 정본이다. 토큰은 `packages/ui/src/styles/globals.css`에 둔다. shadcn 프리미티브와 토큰만 사용한다. 단계 매핑은 `references/impeccable-map.md` |
| `bts-verify` | 완료를 주장하기 전의 검사 선택, 증거 기록, 런타임·브라우저 확인 | `next-dev-loop`(`/_next/mcp`), 전역 `ego-browser`(대안 `agent-browser`) | 증거 종류(타입, 린트, 빌드, 단위, 격리, 런타임, 브라우저, 리뷰)를 구분해 기록한다. 실행하지 않은 검사를 통과로 적지 않는다. 스크린샷은 `tasks/evidence/<라운드>/`에 저장한다. 테스트 러너가 없으면 첫 D·E 라운드에서 vitest를 도입한다. 증거 형식은 `references/evidence.md` |

### 6.3 프로세스 스킬 라우팅 (`bts-dev-cycle`의 `references/process-routing.md`)

| 단계 | 1순위 (두 도구에서 이름이 같음) | 보강 | Claude 대안 | Codex 대안 | 스킬이 없을 때 |
|---|---|---|---|---|---|
| 요구 명확화 | superpowers `brainstorming` | `/grill-with-docs` (사용자가 호출, 용어와 ADR을 함께 기록) | OMC `deep-interview` | OMX `deep-interview` | 질문 목록을 만들어 사용자 확인을 받는다 |
| 계획 | superpowers `writing-plans` | 계획 리뷰: gstack `plan-eng-review`, UI가 있으면 `plan-design-review` | OMC `plan`·`ralplan` | OMX `plan`·`ralplan` | 계획 파일을 직접 쓴다 (파일별 단계와 검사) |
| 구현 | superpowers `subagent-driven-development`(`bts-implementer` 사용) + `test-driven-development` | — | OMC `team`·`ralph` (대규모 병렬) | OMX `team`·`ralph` | 대조표 행 순서대로 직접 구현한다 |
| 디버깅 (C) | superpowers `systematic-debugging` | gstack `investigate` | OMC `debug` | `gstack-investigate` | 재현 테스트 → 가설 → 수정 |
| 리뷰 | **`bts-reviewer` (필수)** + 지적 처리는 superpowers `receiving-code-review` | F 병합 전 추가 관점: gstack `review` | `/code-review` | OMX `code-review` | `bts-reviewer`만 |
| QA | `ego-browser`로 사용자 흐름 확인 (F, 보고만. 절차는 `bts-verify`의 `references/browser.md`) | gstack `qa-only`·`qa` (사용자가 요청할 때만) | 없음 | 없음 | ego-browser가 없으면 `agent-browser`로 같은 흐름을 확인하고 대안으로 적는다 |
| 검증 | superpowers `verification-before-completion` + `bts-verify` | — | OMC `verify` | — | `bts-verify` |
| 마무리 | superpowers `finishing-a-development-branch` | gstack `ship` (사용자가 요청할 때) | — | — | 선택지를 제시한다 |

Codex에서는 gstack 스킬 이름에 `gstack-` 접두어가 붙는다(`gstack-plan-eng-review`, `gstack-review`, `gstack-qa-only`, `gstack-investigate`, `gstack-ship`). 참고 파일에는 두 이름을 모두 적는다.

규칙:
1. 1순위가 현재 도구에 없으면 대안, 그것도 없으면 "스킬이 없을 때" 절차를 쓴다. 증거 칸에는 **실제로 쓴 스킬 이름**을 적고, 대안이나 대체 절차를 썼다면 그 사실을 함께 남긴다. 예: `writing-plans → docs/plans/2026-10-01-todo-due.md`.
2. OMC·OMX 모드(`autopilot`, `ralph`, `team` 등)는 실행 수단이다. 모드가 보고한 "완료"는 증거가 아니며, 완료 판정은 dev-cycle audit만 한다. 모드가 커밋·push·배포를 하게 두지 않는다. 라운드를 닫을 때 활성 모드를 취소한다.
3. `bts-reviewer`는 어떤 대안으로도 대체하지 않는다. gstack `review`나 `/code-review`는 추가 관점일 뿐 리뷰 행의 증거가 되지 않는다.
4. 전역 스킬은 필수가 아니다. 모든 단계는 "스킬이 없을 때" 절차만으로도 끝까지 진행할 수 있어야 한다.

## 7. 에이전트

정본은 `.claude/agents/*.md`다. `.codex/agents/*.toml`은 `sync-agents.mjs`가 생성한다. 지휘는 따로 에이전트를 두지 않고, `bts-dev-cycle`을 실행하는 메인 세션이 코디네이터로 맡는다.

| 에이전트 | 모델 (Claude) | 도구 | 역할 |
|---|---|---|---|
| `bts-implementer` | sonnet | Read, Write, Edit, Bash, Grep, Glob, Skill | 코디네이터가 지정한 정확한 파일 목록만 수정한다. 계층에 맞는 `bts-*` 스킬을 읽는다. 여러 인스턴스를 병렬로 돌릴 때는 파일이 겹치지 않아야 한다 |
| `bts-reviewer` | opus | Read, Grep, Glob, Bash, Skill | 읽기 전용 리뷰. Bash는 `git diff`, `git log`, `git show`, 검색 같은 읽기 명령에만 쓴다. 코디네이터가 focus를 지정한다: `code`(정확성, Next 경계), `security`(세션, 소유권, 비밀값, 인증 설정), `db`(마이그레이션 안전성, 인덱스, 파괴적 변경) |

### 7.1 리뷰어 응답 계약

최종 응답은 코드 펜스 없이 JSON 한 객체로 낸다.

```json
{
  "verdict": "approve | changes-required | blocked",
  "focus": "code | security | db",
  "max_severity": "none | low | medium | high | critical",
  "findings": [
    { "severity": "high", "file": "packages/api/src/routers/todo.ts", "line": 42,
      "evidence": "update 조건에 userId가 없다", "fix": "where에 eq(todo.userId, ctx.session.user.id) 추가" }
  ],
  "limitations": ["DB에 연결할 수 없어 마이그레이션 실행은 확인하지 못함"]
}
```

- `approve`는 high 이상의 지적이 없을 때만 낸다. diff나 파일을 읽을 수 없으면 `blocked`다.
- 코디네이터는 지적을 실측으로 확인한 뒤에만 반영하고, 기각할 때는 사유를 증거 칸에 적는다.
- high 이상 지적을 고쳤으면 같은 focus로 다시 리뷰한다.
- 리뷰어가 응답하지 않으면 지적 0건으로 취급하지 않고 `blocked`로 기록한다.

### 7.2 위임 규칙

- 리뷰의 독립성은 필수다. 대조표의 리뷰 행은 반드시 `bts-reviewer`가 수행하고, 구현한 쪽이 자기 변경을 승인하지 않는다.
- 구현 위임은 선택이다. A, C처럼 작은 변경은 코디네이터가 직접 수정해도 된다.
- 공용 파일(`AGENTS.md`, `.dev-cycle.json`, 각 `package.json`, 루트 설정)은 코디네이터만 수정한다.
- 리뷰어 에이전트는 서브에이전트를 띄우는 스킬(예: impeccable `critique`)을 실행하지 않는다. 그런 스킬은 메인 세션이 실행한다.

### 7.3 Codex 변환 규칙 (`sync-agents.mjs`)

- `name`, `description`을 옮기고, 본문을 `developer_instructions`로 옮긴다.
- Write나 Edit 도구가 없으면 `sandbox_mode = "read-only"`, 있으면 `"workspace-write"`로 변환한다.
- `model`은 생략해 Codex 세션 모델을 물려받게 한다.
- `--check`는 생성 결과가 파일과 다르면 exit 1을 낸다.
- TOML 필드명은 구현 시점의 Codex 공식 문서로 확인한다.
- Codex(0.157 확인)는 프로젝트가 신뢰(trusted) 상태일 때만 프로젝트의 `.codex/` 계층(`.codex/agents` 포함)을 읽는다. `.agents/skills`의 스킬은 신뢰와 무관하게 로드된다. README와 설치기 안내에 이 조건을 적는다.

## 8. dev-cycle

### 8.1 러너 명령 (`scripts/dev-cycle.mjs`, 외부 의존성 없음, Node 20+)

| 명령 | 동작 |
|---|---|
| `case` | 변경 파일을 규칙에 대조해 케이스, 파일별 근거, `auth` 플래그를 출력한다 |
| `table [CASE] --write [--upgrade]` | CASE를 생략하면 `case` 판정 결과를 쓴다. `docs/dev-workflow.md`에서 대조표를 만들어 `tasks/todo.md`에 쓴다. 활성 라운드가 있으면 거부한다(exit 2). `--upgrade`는 활성 라운드를 새 케이스로 교체하면서, 단계 문구가 같은 행의 증거를 보존한다 |
| `status` | 한 줄 요약: 케이스, 채운 칸 수/전체 칸 수, 다음 빈 행. 활성 라운드가 없으면 시작 방법을 안내한다 |
| `audit` | 8.5의 규칙을 검사한다. 위반이 있으면 목록을 출력하고 exit 1 |
| `close` | audit이 통과할 때만 활성 블록을 `tasks/archive/YYYY-MM.md`에 덧붙이고 `tasks/todo.md`에서 제거한다 |

모든 명령은 `--json` 출력을 지원한다(eval과 테스트용).

### 8.2 변경 파일과 기준점

- 변경 파일 = `git diff --name-only --relative <base>`(staged·unstaged 포함, 러너를 실행한 폴더 기준 경로) ∪ `git ls-files --others --exclude-standard`(untracked).
- 기준점: 활성 라운드 마커의 `base`를 쓴다. 마커의 `base`는 커밋 해시 형식(16진수 4~64자)이어야 하며, 아니면 거부한다(`todo.md`의 값이 git 옵션으로 해석되는 것을 막는다). 활성 라운드가 없으면 기본 브랜치 후보(`defaultBranch`, `origin/<defaultBranch>`, `main`, `master`)를 본다. 현재 브랜치가 후보 중 하나면 `HEAD`를 쓴다(push하지 않은 이전 커밋이 새 라운드에 섞이지 않게 한다). 아니면 후보 중 처음 존재하는 것과의 `git merge-base`를 쓰고, 없으면 `HEAD`를 쓴다.
- 새 라운드를 열 때 마커에 기록하는 `base`는 위 규칙으로 정한 SHA다.

### 8.3 `.dev-cycle.json`

```json
{
  "todoPath": "tasks/todo.md",
  "archiveDir": "tasks/archive",
  "workflowDoc": "docs/dev-workflow.md",
  "defaultBranch": "main",
  "rules": [
    { "case": "E", "match": "^packages/db/", "why": "DB 스키마·마이그레이션·연결" },
    { "case": "D", "match": "^(packages/api/|apps/web/src/app/api/)", "why": "서버·API" },
    { "case": "B", "match": "^(apps/web/src/(app|components)/|packages/ui/)", "why": "화면·UI" },
    { "case": "H", "match": "^(\\.agents/skills/|\\.claude/(agents|skills)/|\\.codex/agents/|skills-lock\\.json$|scripts/(dev-cycle|sync-agents)\\.mjs$|\\.dev-cycle\\.json$|docs/dev-workflow\\.md$)", "why": "하네스" }
  ],
  "authPaths": "^(packages/auth/|apps/web/src/app/api/auth/|apps/web/src/lib/auth-client\\.ts$|apps/web/src/(proxy|middleware|services|context|env\\.server)\\.ts$|packages/api/src/(index|context)\\.ts$|packages/db/src/schema/auth\\.ts$|(.*/)?\\.env\\.schema$)",
  "ui": { "auditMin": 16, "a11yMin": 3 },
  "commands": {}
}
```

- 파일마다 **위에서부터 처음 일치하는 규칙** 하나만 적용한다. 그래서 `apps/web/src/app/api/**`는 B가 아니라 D로 판정된다.
- `authPaths`는 인증 파일 자체만이 아니라 세션·권한 판단이 흐르는 곳(`packages/api/src/{index,context}.ts`의 `protectedProcedure`·컨텍스트, `apps/web/src/{proxy,middleware,services,context,env.server}.ts`, 인증 스키마, `.env.schema`)을 포함한다. 경로 밖의 권한 로직 변경은 러너가 잡지 못하므로 `bts-api` 불변식 7이 security 행을 직접 추가하게 한다.
- E 규칙은 `packages/db/` 전체다(스키마 외에 `relations.ts`, 연결 코드 `index.ts`도 DB 계층이다).
- H 규칙은 스킬 링크(`.claude/skills/`), Codex 에이전트(`.codex/agents/`), `skills-lock.json`도 하네스로 본다.
- `commands`는 설치 시 채워진다(4.2의 4단계). 키는 `typecheck`, `lint`, `build`, `test`, `dbGenerate`, `dbMigrate`, `dbPush`이며 값은 실행 문자열이다.

### 8.4 케이스 판정과 대조표 구성

레이어 케이스 집합 L = 변경 파일들이 판정된 {B, D, E}.

| 조건 | 케이스 |
|---|---|
| L이 비어 있고 H 파일도 없음 | A (경미) |
| L이 비어 있고 H 파일만 있음 | H (하네스) |
| L의 원소가 1개 | 그 케이스 |
| L의 원소가 2개 이상 | F (신규 기능) |
| 사람이 `table C`로 선언 | C (버그). 경로 판정 케이스의 `[verify]`·`[review]` 행을 합친다 |
| 사람이 `table F`로 선언 | F. 경로와 무관하게 B·D·E 행을 모두 포함한다 |

추가 규칙:
- 레이어 케이스와 H가 함께 있으면 판정 결과에 H 행을 덧붙인다.
- `authPaths`에 일치하는 파일이 있으면 `auth` 플래그가 서고, `[review] bts-reviewer(security)` 행이 없을 때 추가한다.
- 모든 대조표 끝에 `docs/dev-workflow.md`의 `### 공통` 행을 붙인다.

`docs/dev-workflow.md` 형식 (러너가 파싱):

```markdown
### E. DB
- 스키마 수정 + dbGenerate, 생성 SQL 검토 → 마이그레이션 파일 경로와 요약
- [verify] Neon 개발 브랜치에 dbMigrate 적용 → 브랜치 이름과 출력 요약
- 파괴적 변경 여부 판단 → 없음 또는 2단계 계획
- [review] bts-reviewer(db) → verdict, max_severity, 반영·기각 내역

### F. 신규 기능
- 스펙 작성 (brainstorming, 선택: /grill-with-docs, UI가 있으면 shape 브리프 링크) → 사용한 스킬과 스펙 경로
- 구현 계획 (writing-plans) → 사용한 스킬과 계획 경로
- [review] 계획 리뷰 (plan-eng-review, UI가 있으면 plan-design-review) → 결과 요약 또는 N/A: 사유
- 구현 방식 (subagent-driven-development + test-driven-development) → 사용한 스킬과 위임 내역
- @include E D B
- [verify] next-dev-loop 통합 런타임 확인 → 확인한 경로와 결과
- [review] bts-reviewer(code) → verdict 요약
- [verify] 사용자 흐름 QA (ego-browser(없으면 agent-browser), 보고만) → 확인한 흐름과 결과 요약

### C. 버그
- 재현 테스트 작성, 실패 확인 (systematic-debugging) → 테스트 이름과 실패 출력
- 수정 → 커밋 또는 diff 요약
- [verify] 재현 테스트 통과 → 통과 출력
- @inherit verify review
```

- 각 행은 `- [태그] 단계 → 증거 형식` 형태다. 태그는 없어도 된다.
- `@include X Y`는 해당 케이스들의 행을 그 위치에 순서대로 펼친다. 같은 문구의 행은 한 번만 넣는다.
- `@inherit verify review`는 경로 판정 케이스의 `[verify]`·`[review]` 행을 펼친다. 경로 판정이 A면 아무것도 넣지 않는다.

케이스별 필수 행(초기값, 프로젝트가 문서에서 조정):

| 케이스 | 행 (순서대로, `;`로 구분) |
|---|---|
| A | `[verify]` 타입·린트 검사 |
| B | 9.2의 10개 행 |
| C | 위 예시 |
| D | zod 입출력 계약; 구현; `[verify]` 2계정 격리 테스트; `[verify]` 타입·린트·테스트; `[review]` bts-reviewer(code) |
| E | 위 예시 |
| F | 위 예시 |
| H | `[verify]` `agents:check`; `[verify]` `pnpm dev-cycle case·status` 실행 확인(설치된 프로젝트에는 러너 테스트가 없다. 정본은 템플릿 `files/docs/dev-workflow.md`); 스킬을 바꿨으면 skill-creator eval 재실행 또는 미실행 사유 |
| 공통 | 문서 영향(`CONTEXT.md`, `docs/adr/`, `docs/domain/project.md`) 갱신 또는 `N/A: 사유` |

audit 통과는 행으로 두지 않는다. audit이 자기 행을 검사하는 순환을 피하기 위해 `close`의 전제 조건으로만 강제한다.

첫 D·E 라운드에서 테스트 러너가 없으면, 코디네이터가 D 행 앞에 "vitest 도입(최초 1회)" 행을 추가한다. 이 규칙은 `bts-verify`와 `bts-dev-cycle`에 적는다.

### 8.5 대조표 형식과 audit 규칙

```markdown
<!-- dev-cycle:start case=F base=3f2a9c1 auth=false opened=2026-09-25 -->
## 활성 라운드: F — Todo 마감일
| # | 단계 | 증거 |
|---|---|---|
| 1 | 스펙 작성 (brainstorming …) → 사용한 스킬과 스펙 경로 | brainstorming → docs/superpowers/specs/2026-09-25-todo-due.md |
| 2 | [verify] Neon 개발 브랜치에 dbMigrate 적용 → 브랜치 이름과 출력 요약 | |
<!-- dev-cycle:end -->
```

audit이 실패로 판정하는 경우:
1. 증거 칸이 비어 있다.
2. 증거가 형식만 채운 값이다: `✓`, `✔`, `-`, `ok`, `done`, `todo`, `tbd`(대소문자 무관), 또는 공백을 뺀 길이가 4자 미만이다.
3. `N/A`에 `: 사유`가 없다. `blocked`·`미실행`에 `: 사유`가 없다. (`blocked: 사유`, `미실행: 사유`는 채운 칸으로 본다. 그런 행이 남은 라운드는 audit을 통과해도 "부분 완료"로 보고한다.)
4. 현재 diff로 다시 판정한 레이어 집합이 활성 라운드 케이스가 다루는 레이어를 벗어난다. 예를 들어 B 라운드인데 E 파일이 생겼다면 `table <상향 케이스> --write --upgrade`를 안내한다. C와 F는 선언 케이스이므로 C는 경로 판정 케이스의 행이 모두 있는지 보고, F는 이 상향 검사를 생략한다. 5의 누락 행 검사(security, H 행)는 F에도 적용한다. 라운드 도중 인증·하네스 파일이 생기면 F도 그 행이 필요하다. 상향 경고와 누락 행 경고는 한 번에 하나만 나올 수 있다. 권장 조치인 `--upgrade`가 현재 diff로 행을 다시 만들면서 둘 다 해소하고, 남은 것은 다음 audit이 보고한다.
5. 현재 diff에 `authPaths` 파일이 있는데 security 리뷰 행이 없다.
6. `.claude/agents/`가 있는데 `sync-agents --check`가 실패한다.

## 9. UI/UX: impeccable 중심 흐름

### 9.1 단계 매핑

| 단계 | impeccable | 산출물과 게이트 |
|---|---|---|
| 기획 (프로젝트당 1회) | `init` | `PRODUCT.md`: 사용자, 목적, 포지셔닝, 브랜드 약속, 접근성. B·F 첫 라운드에서 없으면 먼저 실행 |
| 시각 방향 (1회, 리디자인 시 다시) | new-work → 마감에서 `document` | 첫 새 작업에서 시각 세계를 정하고, 만든 화면을 바탕으로 마감 때 `DESIGN.md`를 기록한다(impeccable new-work 5절. 시작 전에 만들지 않는다). BTS 기본 shadcn 룩은 정체성이 아니라 출발점이다. 토큰은 `packages/ui/src/styles/globals.css`에 반영 |
| 설계 (새 화면·흐름마다) | `shape <feature>` | 코드 없이 확정 브리프. 사용자 확인 게이트. F 케이스는 스펙에 브리프를 링크 |
| 개발 | new-work + `craft-floor` | 편집 직전에 품질 하한선을 로드. 브리프에 따라 `layout`, `typeset`, `clarify`, `harden`, `onboard`, `adapt`를 필요할 때만 사용. shadcn 프리미티브와 토큰만 사용 |
| 편집 중 자동 검사 | `hooks on` (개발자별 1회) | 편집마다 detector가 즉시 규칙을 검사하고, 세션 종료 시 전체 규칙으로 한 번 더 검사. Claude는 `.claude/settings.local.json`, Codex는 `.codex/hooks.json` |
| 리뷰 | `critique` + `audit` + `web-design-guidelines` | 메인 세션에서 실행. critique는 독립 평가자로 Design Health 점수와 P0/P1을, audit은 5개 차원 20점 만점 점수를 낸다 |
| 마감 | `polish` → 재확인 1회 | 수정은 한 번에 모아서 하고 재확인은 최대 1회. 무한 폴리시 루프를 막는다 |
| 정본 갱신 | `document` | 토큰이나 컴포넌트가 바뀌었으면 `DESIGN.md` 갱신. 덮어쓰기 전에 갱신·덮어쓰기·병합 중 하나를 묻는다 |

### 9.2 B 케이스 대조표 (docs/dev-workflow.md 초기값)

1. impeccable `context` 실행(`.agents/skills/impeccable/scripts/impeccable context`). `PRODUCT.md`가 없으면 `init`, `DESIGN.md`는 새 작업이면 마감에서 기록 → 출력 요약
2. `shape` 브리프 확정. 기존 화면 개선이면 `N/A: 사유` → 브리프 경로
3. 구현 → 변경 파일 요약
4. `[verify]` 타입·린트·빌드 → 명령과 결과
5. `[verify]` ego-browser(없으면 agent-browser)로 desktop·mobile 스크린샷 → 경로
6. `[review]` `critique` → Design Health 점수, P0/P1 목록
7. `[review]` `audit` → 점수(/20), 접근성 점수
8. 수정과 `polish`를 한 번에 → 반영 내역
9. `[verify]` 재확인 1회 → 스크린샷과 점수
10. `DESIGN.md` 갱신 여부 → 갱신 내역 또는 `N/A: 사유`

통과 기준(기본값): P0/P1은 해결하거나 사유를 적고 보류한다. audit ≥ `ui.auditMin`(16), 접근성 ≥ `ui.a11yMin`(3). audit 점수는 사람이 판정해 증거 칸에 적는다. 러너는 점수를 파싱하지 않는다.

## 10. 설치되는 문서 골격

| 파일 | 내용 |
|---|---|
| `AGENTS.md` | 약 80줄 이하. 도메인 문서 링크(`CONTEXT.md`, `docs/adr/`, `docs/domain/project.md`), 스택 요약, 작업 원칙(가정 공개, 가장 단순한 구현, 좁은 변경 범위, 검증 가능한 완료), "코드 변경은 `bts-dev-cycle`을 거친다", 계층별 스킬 표, 보안 불변식(세션 기반 소유자, 클라이언트 비밀값 금지, generate 기반 마이그레이션), 에이전트 사용 규칙 |
| `CLAUDE.md` | `@AGENTS.md`, Claude 전용 차이(에이전트 호출 방식) |
| `CONTEXT.md` | `domain-modeling`의 CONTEXT 형식 골격: 컨텍스트 이름, 한두 문장 설명, `## Language` 아래 용어·정의·`_Avoid_` |
| `docs/adr/0001-bts-next-neon-stack.md` | 이 스펙의 스택 결정(Neon, 자체 관리 Better Auth, 서버 소유권 검사 + 격리 테스트, Drizzle generate 기반 마이그레이션)을 ADR 형식으로 기록 |
| `docs/domain/project.md` | 서비스 한 줄 요약, 사용자, 화면·URL, 데이터 모델과 코드 매핑(테이블·필드·라우트), 권한, 범위 밖 항목의 빈 골격 |
| `docs/dev-workflow.md` | 8.4의 케이스 블록과 사람용 설명 |
| `tasks/todo.md` | `# 작업` 제목과 활성 라운드 자리 |

## 11. 검수와 테스트

### 11.1 fixture 프로젝트

스크래치 영역에 3.1의 명령으로 BTS 프로젝트를 만든다. 외부 계정 없이 돌리기 위해 fixture만 `--db-setup none`으로 생성하고, `pnpm install`까지 실행한다(번들 Next 문서를 읽을 수 있어야 함). 그 위에 `install.sh`를 실행한다. 이 fixture가 `install.sh` 스모크 테스트를 겸한다:
- 복사된 파일, `.claude/skills/bts-*` 링크, `skills-lock.json`, `.codex/agents/*.toml`, npm 스크립트를 검사한다.
- 두 번째 실행에서 변경이 없는지(멱등성) 확인한다.

사용한 BTS 버전과 skills CLI 버전을 `VERIFICATION.md`에 기록한다.

### 11.2 정적 검사 (결정적, 매번 실행)

- skill-creator `quick_validate.py`로 6개 스킬의 frontmatter와 이름 규칙을 검사한다.
- `node --test templates/bts-next-neon/tests/`로 다음을 검사한다:
  - 경로별 케이스 판정, 규칙 우선순위, F 승격, H 병합, auth 플래그
  - `@include`와 `@inherit` 확장
  - audit 규칙 1~6, `--upgrade`의 증거 보존, `close` 조건
- `sync-agents` 단위 테스트: 생성 결과, sandbox 변환, 정본 수정 뒤 `--check`가 실패하는지.

### 11.3 동작 eval (skill-creator 표준 절차)

스킬마다 `evals/<skill>/evals.json`에 현실적인 프롬프트 2~3개를 넣는다. fixture 안에서 with-skill과 without-skill 기준선을 병렬로 실행한 뒤 다음 순서로 반복 개선한다.
1. grader 채점
2. `aggregate_benchmark`
3. `generate_review` viewer로 사용자가 결과를 확인
4. 피드백 반영

| 스킬 | 대표 assertion |
|---|---|
| `bts-dev-cycle` | `case`를 먼저 실행한다. 대조표를 만든다. audit 통과 전에는 완료를 선언하지 않는다. 버그 요청에는 `systematic-debugging`을, 신규 기능에는 `brainstorming`을 먼저 쓴다. 증거 칸에 실제로 쓴 스킬 이름을 적는다 |
| `bts-api` | `protectedProcedure`를 쓴다. 소유자 id를 세션에서 가져온다. where 조건에 소유자가 있다. 격리 테스트를 작성하거나 제안한다 |
| `bts-db` | `db:push`가 아니라 `db:generate`를 쓴다. Neon 개발 브랜치 절차를 쓴다. 파괴적 변경을 2단계로 나눈다 |
| `bts-web` | 번들 Next 문서를 먼저 읽는다. 서버·클라이언트 경계를 지킨다. 네 가지 상태를 구분한다 |
| `bts-ui` | `impeccable context`를 실행한다. 새 화면은 코드보다 `shape`를 먼저 한다. `critique`와 `audit`을 실행한다 |
| `bts-verify` | 실행하지 않은 검사를 통과로 적지 않는다. 증거 형식을 지킨다 |

목표: with-skill assertion 통과율 85% 이상, 기준선보다 뚜렷하게 높을 것.

### 11.4 트리거 eval과 description 최적화

- 스킬마다 쿼리 20개를 만든다. 트리거되어야 할 쿼리 8~10개와, 헷갈리기 쉬워서 트리거되면 안 되는 쿼리 8~10개를 섞는다. `bts-web`↔`bts-ui`, `bts-api`↔`bts-db` 경계를 집중적으로 다룬다.
- 쿼리 목록은 skill-creator HTML 템플릿에서 사용자가 검토한 뒤 측정한다.
- `run_loop.py` 최적화는 `claude -p` 호출 비용이 크므로 정확도 90% 미만 스킬에만 실행한다.
- 측정 방식(구현 중 확정): skill-creator `run_eval.py`를 그대로 쓰면 결과가 description 품질을 재지 못한다. (1) fixture의 `AGENTS.md`가 모든 변경을 `bts-dev-cycle`로 보내 계층 스킬은 늦게 로드되고, (2) 첫 도구 호출만 채점하는데 모델은 탐색(Bash·Read)부터 하는 일이 많으며, (3) 병렬 워커가 `.claude/commands`를 공유해 다른 쿼리의 임시 명령을 호출하면 미탐으로 잡힌다. 그래서 다음처럼 측정한다.
  - **격리 측정(정확도 지표)**: fixture 복사본에서 `AGENTS.md`·`CLAUDE.md`와 대상 스킬 링크를 뺀다. `bts-dev-cycle` 외 스킬은 `bts-dev-cycle` 링크도 뺀다.
  - **창 판정**: 스크립트 사본을 패치해 도구 호출 8회 안의 첫 Skill 호출로 판정한다. Edit·Write·Agent 호출이나 8회 도달은 미트리거다. 임시 명령 사본 `<skill>-skill-*`은 어느 것이든 인정한다.
  - **라우팅 스모크(진입 경로)**: `AGENTS.md`가 있는 실제 fixture에서 변경 요청은 `bts-dev-cycle`이 첫 bts 스킬로 로드되고, 질문은 로드되지 않아야 한다. 계층 스킬 로드는 기준에 넣지 않는다. dev-cycle의 계획 행이 먼저 오기 때문이다.

### 11.5 독립 검수

- 작성 lane과 분리해 `plugin-dev:skill-reviewer`가 6개 스킬을 검토한다.
- 에이전트 정의, 러너, `install.sh`는 코드 리뷰어가 읽기 전용으로 검토한다.
- 지적은 실측으로 확인한 뒤 반영하고, 기각한 지적은 사유를 `VERIFICATION.md`에 남긴다.

### 11.6 Codex와 외부 리소스

- skill-creator 스크립트는 Claude 전용이다. Codex CLI가 설치되어 있으면 `codex exec`로 스킬 인식과 에이전트 로드를 스모크 테스트한다. 없으면 미검증으로 기록한다.
- 실제 Neon DB에 연결하는 E2E 라운드(마이그레이션 적용, 격리 테스트 실행)는 외부 리소스를 만들어야 하므로, 실행 시점에 사용자 승인을 따로 받는다. 승인되지 않으면 미검증으로 기록한다.

## 12. 범위 밖

- Supabase 프로필과 두 프로필 동시 지원
- Neon Auth(Managed), Neon Functions, Object Storage, AI Gateway
- CI 파이프라인(GitHub Actions) 연동, SessionStart 훅, 템플릿 자체의 버전·릴리스 관리, 플러그인 마켓플레이스 배포
- 배포(Vercel) 스킬과 배포 절차
- kit의 todo 3층 관리, 백로그 상한, 종결 축 6개, auditor 에이전트

## 13. 위험과 대응

| 위험 | 대응 |
|---|---|
| upstream 공식 스킬이 바뀌어 동작이 달라짐 | `skills-lock.json`으로 고정한다. 갱신은 H 케이스로 진행하고 eval을 다시 실행한다 |
| BTS 생성 구조가 바뀌어 경로 규칙이 어긋남 | `install.sh` 사전 점검이 경고한다. 규칙은 `.dev-cycle.json`에서 수정한다 |
| 사용자 전역 스킬(예: `vercel:nextjs`, `supabase`)과 트리거가 겹침 | `bts-*` description에 "이 프로젝트" 조건을 명시하고, `AGENTS.md`의 계층별 스킬 표로 우선순위를 밝힌다 |
| skills CLI의 `experimental_install` 명령 이름이 바뀜 | `install.sh`를 다시 실행하면 같은 결과가 나온다. README에 대체 방법을 적는다 |
| impeccable hook이 Codex에서 신뢰 확인을 요구함 | 설치 안내에 `/hooks` 검토 단계를 적는다 |
| eval 비용 | 동작 eval은 스킬당 2~3개 프롬프트로 제한하고, description 최적화는 기준 미달 스킬에만 실행한다 |
| 다른 머신에 전역 프로세스 스킬이 없음 | 6.3의 "스킬이 없을 때" 절차로 진행하고, `install.sh`가 감지 결과를 알려 준다 |
| OMC·OMX 상태 파일(`.omc/`, `.omx/`)이 대조표와 경쟁 | 완료 판정 정본은 대조표 하나로 정하고(6.3 규칙 2), 라운드 종료 시 모드를 취소한다 |
| eval 환경과 사용자 환경의 전역 스킬 차이 | eval은 이 머신(전역 스킬 설치됨)에서 돌리므로, 전역 스킬이 없는 환경의 동작은 `VERIFICATION.md`에 미검증으로 남긴다 |

## 14. 조사 출처

| 자료 | 확인 내용 |
|---|---|
| BTS CLI 옵션 문서 <https://www.better-t-stack.dev/docs/cli/options> | `--auth`에 Supabase가 없음, `--db-setup neon`·`--backend self` 존재 |
| BTS `apps/cli/src/helpers/addons/skills-setup.ts` | `skills` addon이 `npx skills@latest add`로 설치하는 스킬 목록과 조건 |
| BTS `packages/template-generator/templates/` | 3.2의 생성 구조 |
| `neondatabase/agent-skills` 커밋 `80164a2` (2026-09-23) | Neon 스킬 8개와 `neon-auth`의 "기존 Better Auth 유지" 권장 |
| `vercel-labs/skills` `src/local-lock.ts` | 프로젝트 범위 `skills-lock.json`, `experimental_install` 복원 |
| 설치된 impeccable `SKILL.md`와 `reference/` | 명령 체계, `PRODUCT.md`·`DESIGN.md`, critique의 독립 평가자 구조, hooks 위치 |
| 참고 kit 분석 | 케이스·대조표·audit 개념, 리뷰어 분리, 과잉 설계 목록 |
| `mattpocock/skills` 커밋 `c55ee46` (2026-09-18) | 스킬 34개 목록, `domain-modeling`의 CONTEXT·ADR 형식, `to-spec`·`code-review`의 이슈 트래커 의존 |
| 이 머신의 설치 현황 (2026-09-25) | superpowers(Claude·Codex), gstack(Claude, Codex는 `gstack-` 접두어), OMC(Claude), OMX v0.21.6(Codex), codex-cli 0.156.0 |

실제 스킬 리비전은 구현 시 생성되는 `skills-lock.json`이 기록한다. 이 표의 값은 조사 시점 식별용이며 호환성을 보장하지 않는다.

변경 기록(2026-09-26, 사용자 결정): 브라우저 검증과 QA 흐름 확인은 ego-browser(ego lite, macOS)를 먼저 쓰고, 쓸 수 없는 환경(macOS 외, CI, Codex 샌드박스, 창 표시 불가)에서만 agent-browser로 대신한다. `next-dev-loop`는 `/_next/mcp` 진단에만 쓴다. gstack `qa-only`·`qa`는 사용자가 요청할 때만 쓴다.
