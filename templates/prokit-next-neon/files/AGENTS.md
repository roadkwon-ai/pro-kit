<!-- prokit-template:start -->
# 에이전트 공통 규칙

이 프로젝트는 Better-T-Stack으로 만든 Next.js 풀스택 앱이다. Next.js App Router(`apps/web`), oRPC(`packages/api`), Better Auth(`packages/auth`), Drizzle + Postgres(`packages/db`<!-- edition:pro -->, 개발은 로컬 컨테이너, 운영은 Neon<!-- /edition -->), shadcn UI(`packages/ui`), Turborepo, pnpm, Biome를 쓴다.

## Workflow Orchestration

### 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- 한 작업 단위에는 검증한 수행 흐름 하나만 쓴다. 전문 스킬·수행자 선택과 evidence packet은 `prokit-dev-cycle`의 위임 프로토콜을 따른다.
- 메인은 대조표와 런타임만 관리한다. 외부 수행자는 commit, push, 배포, DB 적용, 토큰·비밀값 출력을 맡지 않는다.

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

`tasks/todo.md`의 계획과 진행은 dev-cycle 라운드 바깥에 적고, 라운드의 증거·검증·사용자 확인은 `prokit-dev-cycle`이 관리한다. 두뇌의 계획 도구가 `tasks/plan.md`나 `tasks/todo.md`에 쓰려 하면(agent-skills `/plan`의 기본값) 계획은 `docs/plans/`에 쓴다.

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## 먼저 읽을 문서
- `GLOSSARY.md`: 도메인 용어 정본. 코드, 문서, 대화에서 이 용어를 쓴다.
- `docs/domain/project.md`: 서비스의 현재 모습. 권한, 주요 흐름, 기능, 화면과 URL, API, 데이터 모델. 표의 `용어` 칸이 `GLOSSARY.md` 용어와 코드 이름을 잇는다. 갱신은 해당 절을 고치는 것이고 날짜별 기록을 덧붙이지 않는다.
- `docs/adr/`: 되돌리기 어려운 결정과 그 이유
- `apps/web/AGENTS.md`: Next.js가 생성하는 버전별 규칙
- `tasks/plan.md`(있으면): 진행 계획의 Task 표. 기존 프로젝트를 들였으면 `docs/prokit/`(도입 기록, 정밀 분석)도 읽는다 <!-- edition:pro -->

## 작업 원칙
1. 가정은 드러내고, 결과를 바꾸는 모호함은 구현 전에 묻는다.
2. 요구한 동작에 필요한 가장 단순한 구현을 고른다.
3. 변경 범위를 좁게 유지하고 관계없는 코드를 고치지 않는다.
4. 완료는 검증 가능한 동작으로 말한다. 실행하지 않은 검사를 통과라고 하지 않는다.

## 코드 변경 절차
코드나 설정을 바꾸는 작업은 `prokit-dev-cycle` 스킬(`.agents/skills/prokit-dev-cycle/SKILL.md`)로 시작한다. 먼저 `pnpm dev-cycle status`로 열린 라운드와 진행 계획을 본다. `pnpm dev-cycle case`로 판정하고, `pnpm dev-cycle table <케이스> --write --title "<요약>"`로 대조표를 열고(케이스는 요청 기준으로 고른다. 아직 diff가 없으면 `case`는 A로 나온다), 행을 실행한 뒤 `pnpm dev-cycle audit`과 `close`로 닫는다. 표 끝의 `[confirm]` 행은 사용자가 결과를 확인해야 채운다(N/A·blocked 같은 건너뛰기 불가). 닫은 뒤의 커밋·push, 릴리스, 배포는 `prokit-dev-cycle`의 "5. 종료"를 따른다. 절차 정본은 `docs/dev-workflow.md`다. 위임은 `references/delegation.md`의 provider 검증과 packet 계약을 따른다.<!-- edition:pro --> 정밀 분석과 진행 계획(`docs/plans/`, `tasks/plan.md`)은 문서만 바꿔도 진행 계획 라운드(`--plan`)로 세우고, 그 Task는 `--task <Task>`로 연다(`prokit-dev-cycle` 6절). 기존 프로젝트는 진행 계획을 확정하기 전에는 `--task` 없는 라운드도 열리지 않는다(사용자가 계획 전에 하라고 한 급한 버그 수정, 템플릿 갱신 반영, 스킬 구성 변경만 `--no-task`로 연다).<!-- /edition -->

## 계층별 스킬
| 작업 | 스킬 |
|---|---|
| 라우팅, RSC 경계, 데이터 패칭, 캐시, 성능 | `prokit-web` | <!-- edition:pro -->
| 화면 모양, UX, 디자인 스타일과 `DESIGN.md`, 디자인 리뷰 (impeccable) | `prokit-ui` |
| oRPC 프로시저, Better Auth, 권한과 소유권 | `prokit-api` | <!-- edition:pro -->
| Drizzle 스키마, 마이그레이션, 로컬 DB, Neon | `prokit-db` | <!-- edition:pro -->
| 검사 선택, 증거 기록, 런타임 확인 | `prokit-verify` |
| Vercel 배포(develop, production), production 릴리스(버전, 노트, GitHub Release), 배포 환경변수, 되돌리기 | `prokit-deploy` | <!-- edition:pro -->

전역이나 이 프로젝트에 같은 분야 스킬(예: `nextjs`, `supabase`, 배포의 `deploy-to-vercel`)이 있어도 이 프로젝트에서는 위 `prokit-*`를 먼저 따른다. `prokit-*`가 읽으라고 하는 외부 스킬(공식 스킬 연결 표, `impeccable` 등)은 그 상황이 오면 실제로 읽고, 이 프로젝트에 설치된 판(`.agents/skills/<이름>/SKILL.md`)을 읽는다. 읽은 스킬은 그 행의 증거에 적는다. 설계, 계획, 디버깅, 리뷰, QA에 쓸 프로세스 스킬은 `prokit-dev-cycle`의 라우팅 표를 따른다.

선택 스킬 묶음(`skills.manifest.json`의 `optional`)은 기본으로 설치하지 않는다. 요청이 아래 분야인데 스킬이 없으면(`pnpm skills:check`가 묶음별 상태를 보여 준다) 사용자에게 `pnpm skills:setup --optional <묶음>` 설치를 제안한다. 설치해도 위 `prokit-*`를 먼저 따른다.

| 묶음 | 분야 | 스킬 | 관련 prokit 스킬 |
|---|---|---|---|
| `ops` | 배포한 서비스의 비용·성능 점검 | `vercel-optimize` | `prokit-deploy` | <!-- edition:pro -->
| `ops` | Neon의 오래 도는 함수, 파일 저장, LLM 호출. 새 서비스 의존이라 도입 전에 묻고 `docs/adr/`에 남긴다 | `neon-functions`, `neon-object-storage`, `neon-ai-gateway` | `prokit-db` | <!-- edition:pro -->
| `motion` | 화면 전환, 공유 요소 애니메이션 | `vercel-react-view-transitions` | `prokit-ui` |
| `mobile` | React Native·Expo 모바일 앱. 이 프로젝트는 웹 앱만 있으므로 앱을 더하는 결정은 먼저 묻고 `docs/adr/`에 남긴다 | `vercel-react-native-skills` | `prokit-dev-cycle` |
| `i-have-adhd` | 행동 중심 짧은 응답(다음 행동 먼저, 번호 단계, 다음 할 일 하나). 사용자가 `/i-have-adhd`로 켤 때만 쓰고 대화 응답에만 적용한다 | `i-have-adhd` | `prokit-dev-cycle` |
| `taste` | 화면 디자인 보조(taste-skill). 갤러리 사이트에서 뽑은 방향, 공개 아카이브 사진, 실제 브라우저 검사로 화면을 만든다. 사용자가 고른 화면에만 쓰고 impeccable 흐름은 그대로다 | `design-taste-frontend` | `prokit-ui` |

## 두뇌와 선택 스킬
이 프로젝트의 두뇌(요구 정리, 계획, 구현 진행, 디버깅을 주도하는 스킬 묶음)는 `.dev-cycle.json`의 `brain`, 과설계 방지 스킬은 `simplicity`다. 둘 다 `none`이면 지금 세션의 에이전트가 `prokit-dev-cycle`의 내장 절차와 간결성 규칙으로 그 역할을 맡는다. 다른 값이면 `.agents/skills/prokit-dev-cycle/references/brains/`의 해당 파일과 `references/process-routing.md`의 역할 표를 따른다. 과설계 방지 스킬은 하나만 쓴다. 두뇌는 하나를 권하고, 여럿(배열. 첫 값이 주 두뇌)이면 `references/brains/README.md`의 단계 표로 단계마다 맡을 두뇌를 정한다. 전역 설치나 플러그인으로 고르지 않은 스킬(superpowers, OMC, OMX, gstack, OpenSpec, Spec Kit, Compound Engineering, ponytail, caveman, karpathy-guidelines 등)이 보이거나 세션 시작 훅이 그 스킬을 먼저 쓰라고 해도 고르지 않는다. 용어와 설계 결정은 두뇌와 상관없이 `grilling` 형식으로 묻고 `domain-modeling`으로 기록한다. 설치된 mattpocock 추가 스킬과 i-have-adhd는 `pnpm skills:check`에 보인다. 고른 스킬의 규칙이 이 파일, `prokit-*`, 대조표, 보고 형식과 부딪히면 뒤의 것이 우선하고, caveman 응답 압축과 i-have-adhd는 대화 응답에만 쓴다. 바꾸는 일(추가·변경·제거)은 언제든(열린 라운드가 있으면 그 라운드에서) `prokit-skills-manage`를 따라 `pnpm skills:setup --brain <이름|none>`(여럿이면 `--brain <이름>,<이름>`), `--simplicity <이름|none>`, `--matt <스킬>`, `--optional <묶음>`, `--drop <스킬이나 묶음>`(순수 AI는 `--brain none --simplicity none --drop all`)으로 한다. Claude Code는 바꾼 뒤 `/reload-plugins`로 다시 불러오고, 그 전에는 세션에 남은 이전 스킬·훅 안내가 아니라 `.dev-cycle.json`을 따른다(고르는 기준은 `references/brains/README.md`).

## 보안 불변식
- 사용자 데이터를 다루는 프로시저는 `protectedProcedure`를 쓰고, 소유자 id는 세션에서만 가져와 where 조건에 넣는다. <!-- edition:pro -->
- 비밀값과 서버 전용 모듈은 클라이언트 번들로 보내지 않는다. 배포 환경의 값은 Vercel 환경변수에만 두고 `.env.production` 같은 파일, 출력, 커밋에 남기지 않는다. 새 변수는 `apps/web/.env.schema`에 선언한다.<!-- edition:pro --> 배포 환경 값은 `prokit-deploy`로 넣는다.<!-- /edition --> 커밋 전에는 `pnpm dev-cycle secrets`로 스테이징한 변경을 검사하고, exit 1이면 커밋하지 않는다.
- 스키마 변경은 `db:generate`로 만든 마이그레이션으로만 한다. 공유 DB 브랜치에는 `db:push`를 쓰지 않는다. <!-- edition:pro -->
- 운영 DB와 실사용자 데이터는 사용자가 요청할 때만 다룬다(라운드 끝 배포에서 적용할 마이그레이션 목록을 보고 동의할 때 포함). <!-- edition:pro -->
- 커밋, push, 릴리스, 배포는 사용자가 요청할 때와 라운드 끝(`prokit-dev-cycle` 5절: 사용자 확인 → audit·close → 커밋·push<!-- edition:pro --> → 사용자가 고르면 릴리스와 production 배포. 운영 중인 기존 프로젝트는 커밋까지<!-- /edition -->)에만 한다.<!-- edition:pro --> production은 릴리스(`pnpm release`: 버전 태그, `release/` 노트, GitHub Release)한 커밋만 배포한다(`prokit-deploy`).<!-- /edition -->

## 에이전트
- `prokit-analyzer`: 읽기 전용 정밀 분석. 기존 프로젝트를 들일 때와 진행 계획을 세우기 전에 쓴다. <!-- edition:pro -->
- `prokit-implementer`: 코디네이터가 지정한 파일만 구현한다.
- `prokit-reviewer`: 읽기 전용 통합 리뷰. focus는 plan, code, security, db이고 실제 계약·evidence hash·통합 수용 여부를 JSON으로 응답한다.
- `specialist-reviewer`: provider에 내장 리뷰가 없을 때만 전문 산출물을 읽기 전용으로 검토한다. 일반 코드 리뷰를 반복하지 않는다.
- 리뷰는 구현한 쪽이 아니라 `prokit-reviewer`가 한다. Codex는 `spawn_agent`의 `agent_type`으로 부른다. <!-- edition:pro -->`prokit-analyzer`·<!-- /edition -->`prokit-reviewer`·`specialist-reviewer`는 `fork_turns: "none"`으로 띄워 메인 대화를 넘기지 않고(독립 분석·리뷰), 필요한 입력(초점, 기준 SHA, 파일 목록, evidence packet hash)은 메시지에 모두 넣는다. 고른 두뇌 파일(`references/brains/<이름>.md`)의 "에이전트" 절에 있는 에이전트는 읽기 전용 보완 검토로만 쓴다. 쓰는 쪽이 아니고 최종 게이트는 `prokit-reviewer`다.
- 배포, 릴리스, 운영 DB 적용은 서브에이전트에 맡기지 않는다. 라운드 끝 마무리 선택, 릴리스 발행 동의, 운영 DB 적용 동의처럼 중간에 사용자 확인이 필요하다.
- 스킬이나 플러그인이 없다고 나오면 `pnpm skills:check`로 확인해 보고한다. 설치(`pnpm skills:setup`, 네트워크와 설정 파일 변경)는 사용자가 요청할 때 한다. 목록 정본은 `skills.manifest.json`이다. 외부 스킬의 새 버전 확인과 업데이트(`pnpm skills:update`)는 `prokit-skills-update`를 따른다. 진행 중인 라운드가 없으면 `pnpm dev-cycle status`가 하루 한 번 확인한다.
<!-- prokit-template:end -->
