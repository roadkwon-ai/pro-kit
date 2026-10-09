<!-- prokit-template:start -->
# 에이전트 공통 규칙

이 프로젝트는 Better-T-Stack으로 만든 Next.js 풀스택 앱이다. Next.js App Router(`apps/web`), oRPC(`packages/api`), Better Auth(`packages/auth`), Drizzle + Postgres(`packages/db`, 개발은 로컬 컨테이너, 운영은 Neon), shadcn UI(`packages/ui`), Turborepo, pnpm, Biome를 쓴다.

## Workflow Orchestration

### 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One tack per subagent for focused execution

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

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## 먼저 읽을 문서
- `GLOSSARY.md`: 도메인 용어 정본. 코드, 문서, 대화에서 이 용어를 쓴다.
- `docs/domain/project.md`: 서비스의 현재 모습. 권한, 주요 흐름, 기능, 화면과 URL, API, 데이터 모델. 표의 `용어` 칸이 `GLOSSARY.md` 용어와 코드 이름을 잇는다. 갱신은 해당 절을 고치는 것이고 날짜별 기록을 덧붙이지 않는다.
- `docs/adr/`: 되돌리기 어려운 결정과 그 이유
- `apps/web/AGENTS.md`: Next.js가 생성하는 버전별 규칙

## 작업 원칙
1. 가정은 드러내고, 결과를 바꾸는 모호함은 구현 전에 묻는다.
2. 요구한 동작에 필요한 가장 단순한 구현을 고른다.
3. 변경 범위를 좁게 유지하고 관계없는 코드를 고치지 않는다.
4. 완료는 검증 가능한 동작으로 말한다. 실행하지 않은 검사를 통과라고 하지 않는다.

## 코드 변경 절차
코드나 설정을 바꾸는 작업은 `prokit-dev-cycle` 스킬로 시작한다. `pnpm dev-cycle case`로 판정하고, `pnpm dev-cycle table <케이스> --write --title "<요약>"`로 대조표를 열고(케이스는 요청 기준으로 고른다. 아직 diff가 없으면 `case`는 A로 나온다), 행을 실행한 뒤 `pnpm dev-cycle audit`과 `close`로 닫는다. 표 끝의 `[confirm]` 행은 사용자가 결과를 확인해야 채운다(N/A·blocked 같은 건너뛰기 불가). 닫은 뒤의 커밋·push, 릴리스, 배포는 `prokit-dev-cycle`의 "5. 종료"를 따른다. 절차 정본은 `docs/dev-workflow.md`다. `tasks/todo.md`의 계획(Task Management)은 dev-cycle 라운드 블록(`<!-- dev-cycle:start`~`<!-- dev-cycle:end -->`) 바깥에 적고 블록은 지우지 않는다.

## 계층별 스킬
| 작업 | 스킬 |
|---|---|
| 라우팅, RSC 경계, 데이터 패칭, 캐시, 성능 | `prokit-web` |
| 화면 모양, UX, 디자인 스타일과 `DESIGN.md`, 디자인 리뷰 (impeccable) | `prokit-ui` |
| oRPC 프로시저, Better Auth, 권한과 소유권 | `prokit-api` |
| Drizzle 스키마, 마이그레이션, 로컬 DB, Neon | `prokit-db` |
| 검사 선택, 증거 기록, 런타임 확인 | `prokit-verify` |
| Vercel 배포(develop, production), production 릴리스(버전, 노트, GitHub Release), 배포 환경변수, 되돌리기 | `prokit-deploy` |

전역이나 이 프로젝트에 같은 분야 스킬(예: `nextjs`, `supabase`, 배포의 `deploy-to-vercel`)이 있어도 이 프로젝트에서는 위 `prokit-*`를 먼저 따른다. `prokit-*`가 읽으라고 하는 외부 스킬(공식 스킬 연결 표, `impeccable` 등)은 그 상황이 오면 실제로 읽고, 이 프로젝트에 설치된 판(`.agents/skills/<이름>/SKILL.md`)을 읽는다. 읽은 스킬은 그 행의 증거에 적는다. 설계, 계획, 디버깅, 리뷰, QA에 쓸 프로세스 스킬은 `prokit-dev-cycle`의 라우팅 표를 따른다.

선택 스킬 묶음(`skills.manifest.json`의 `optional`)은 기본으로 설치하지 않는다. 요청이 아래 분야인데 스킬이 없으면(`pnpm skills:check`가 묶음별 상태를 보여 준다) 사용자에게 `pnpm skills:setup --optional <묶음>` 설치를 제안한다. 설치해도 위 `prokit-*`를 먼저 따른다.

| 묶음 | 분야 | 스킬 | 관련 prokit 스킬 |
|---|---|---|---|
| `ops` | 배포한 서비스의 비용·성능 점검 | `vercel-optimize` | `prokit-deploy` |
| `ops` | Neon의 오래 도는 함수, 파일 저장, LLM 호출. 새 서비스 의존이라 도입 전에 묻고 `docs/adr/`에 남긴다 | `neon-functions`, `neon-object-storage`, `neon-ai-gateway` | `prokit-db` |
| `motion` | 화면 전환, 공유 요소 애니메이션 | `vercel-react-view-transitions` | `prokit-ui` |
| `mobile` | React Native·Expo 모바일 앱. 이 프로젝트는 웹 앱만 있으므로 앱을 더하는 결정은 먼저 묻고 `docs/adr/`에 남긴다 | `vercel-react-native-skills` | `prokit-dev-cycle` |

## 보안 불변식
- 사용자 데이터를 다루는 프로시저는 `protectedProcedure`를 쓰고, 소유자 id는 세션에서만 가져와 where 조건에 넣는다.
- 비밀값과 서버 전용 모듈은 클라이언트 번들로 보내지 않는다. 배포 환경의 값은 Vercel 환경변수에만 두고 `.env.production` 같은 파일, 출력, 커밋에 남기지 않는다. 새 변수는 `apps/web/.env.schema`에 선언하고 배포 환경 값은 `prokit-deploy`로 넣는다. 커밋 전에는 `pnpm dev-cycle secrets`로 스테이징한 변경을 검사하고, exit 1이면 커밋하지 않는다.
- 스키마 변경은 `db:generate`로 만든 마이그레이션으로만 한다. 공유 DB 브랜치에는 `db:push`를 쓰지 않는다.
- 운영 DB와 실사용자 데이터는 사용자가 요청할 때만 다룬다(라운드 끝 배포에서 적용할 마이그레이션 목록을 보고 동의할 때 포함). 커밋, push, 릴리스, 배포는 사용자가 요청할 때와 라운드 끝(`prokit-dev-cycle` 5절: 사용자 확인 → audit·close → 커밋·push → 사용자가 고르면 릴리스와 production 배포)에만 한다. production은 릴리스(`pnpm release`: 버전 태그, `release/` 노트, GitHub Release)한 커밋만 배포한다(`prokit-deploy`).

## 에이전트
- `prokit-implementer`: 코디네이터가 지정한 파일만 구현한다.
- `prokit-reviewer`: 읽기 전용 리뷰. focus는 code, security, db이고 JSON으로 응답한다.
- 리뷰는 구현한 쪽이 아니라 `prokit-reviewer`가 한다.
- 배포, 릴리스, 운영 DB 적용은 서브에이전트에 맡기지 않는다. 라운드 끝 마무리 선택, 릴리스 발행 동의, 운영 DB 적용 동의처럼 중간에 사용자 확인이 필요하다.
- 스킬이나 플러그인이 없다고 나오면 `pnpm skills:check`로 확인해 보고한다. 설치(`pnpm skills:setup`, 네트워크와 설정 파일 변경)는 사용자가 요청할 때 한다. 목록 정본은 `skills.manifest.json`이다. 외부 스킬의 새 버전 확인과 업데이트(`pnpm skills:update`)는 `prokit-skills-update`를 따른다. 진행 중인 라운드가 없으면 `pnpm dev-cycle status`가 하루 한 번 확인한다.
<!-- prokit-template:end -->
