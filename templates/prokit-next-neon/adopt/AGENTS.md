<!-- prokit-template:start -->
# 에이전트 공통 규칙

이 프로젝트는 운영 중이던 Next.js 프로젝트에 프로킷 하네스만 먼저 설치했다(`.dev-cycle.json`의 `adopt: true`). 기존 스택과 폴더 구조는 그대로다. 스택, 계층별 경로, 테스트·빌드·배포 방법의 정본은 정밀 분석(`docs/prokit/analysis.md`)과 진행 계획(`tasks/plan.md`)이다. 정밀 분석 전이면 `docs/first-request.md`의 요청대로 `prokit-analyzer`로 먼저 분석한다.

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

`tasks/todo.md`의 계획과 진행은 dev-cycle 라운드 바깥에 적고, 라운드의 증거·검증·사용자 확인은 `prokit-dev-cycle`이 관리한다. 두뇌의 계획 도구가 `tasks/plan.md`나 `tasks/todo.md`에 쓰려 하면(agent-skills `/plan`의 기본값) 계획은 `docs/plans/`에 쓴다. 진행 계획의 Task 표는 `tasks/plan.md`다.

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## 먼저 읽을 문서
- `docs/prokit/intake.md`: 도입 기록. 유형, 초기 분석 요약, 확정한 설정, 디자인 방향
- `docs/prokit/analysis.md`: 정밀 분석(있으면). 스택, 계층별 경로 대응표, 테스트·빌드·배포 방법, 위험
- `tasks/plan.md`: 진행 계획의 Task 표(있으면)
- `GLOSSARY.md`: 도메인 용어 정본
- `docs/domain/project.md`: 서비스의 현재 모습
- `docs/adr/`(있으면): 되돌리기 어려운 결정과 그 이유

## 작업 원칙
1. 가정은 드러내고, 결과를 바꾸는 모호함은 구현 전에 묻는다.
2. 요구한 동작에 필요한 가장 단순한 구현을 고른다.
3. 변경 범위를 좁게 유지하고 관계없는 코드를 고치지 않는다. 운영 중인 코드라 동작을 바꾸는 변경은 회귀 검사와 함께 한다.
4. 완료는 검증 가능한 동작으로 말한다. 실행하지 않은 검사를 통과라고 하지 않는다.

## 코드 변경 절차
코드나 설정을 바꾸는 작업은 `prokit-dev-cycle` 스킬(`.agents/skills/prokit-dev-cycle/SKILL.md`)로 시작한다. 먼저 `pnpm dev-cycle status`로 열린 라운드와 진행 계획을 본다. `pnpm dev-cycle case`로 판정하고, `pnpm dev-cycle table <케이스> --write --title "<요약>"`로 대조표를 열고, 행을 실행한 뒤 `pnpm dev-cycle audit`과 `close`로 닫는다. 정밀 분석과 진행 계획(`docs/plans/`, `tasks/plan.md`)은 문서만 바꿔도 진행 계획 라운드(`--plan`)로 세우고, 그 Task는 `--task <Task>`로 연다. 앞 Task가 끝나야 다음 Task를 열 수 있다. 진행 계획을 확정하기 전에는 `--task` 없는 라운드도 열리지 않는다(사용자가 계획 전에 하라고 한 급한 버그 수정, 템플릿 갱신 반영, 스킬 구성 변경만 `--no-task`로 연다). 표 끝의 `[confirm]` 행은 사용자가 결과를 확인해야 채운다. 절차 정본은 `docs/dev-workflow.md`다.

정밀 분석 뒤 첫 Task(케이스 H)에서 `.dev-cycle.json`의 경로 규칙(`rules`, `authPaths`)과 `docs/dev-workflow.md`의 행을 이 프로젝트 구조에 맞춘다. 그 전에는 규칙 밖 코드 변경을 무거운 케이스(F)로 본다.

## 계층별 스킬
| 작업 | 스킬 |
|---|---|
| 라우팅, 렌더링 경계, 데이터 패칭, 캐시, 성능 | `prokit-web` |
| 화면 모양, UX, 디자인 스타일과 `DESIGN.md`, 디자인 리뷰 (impeccable) | `prokit-ui` |
| 검사 선택, 증거 기록, 런타임 확인 | `prokit-verify` |
| 두뇌·과설계 방지·추가 스킬·선택 묶음 바꾸기 | `prokit-skills-manage` |

Better-T-Stack 전용 계층 스킬(`prokit-api`, `prokit-db`, `prokit-deploy`)은 설치하지 않았다. API, 인증, DB, 배포는 이 프로젝트의 기존 방식을 따르고 정밀 분석의 대응표로 확인한다. 완성팩 활용(`prokit-pack-use`), 화면만 프로젝트의 HTML 내보내기(`pnpm export:html`), 배포·릴리스 스크립트, `apps/web/.env.schema`도 없다. 복사한 스킬이 이것들을 가리키면 건너뛰고 대응표의 기존 방식을 쓴다. 테스트 러너 도입과 테스트 DB(`prokit-verify`가 가리키는 `prokit-api`의 `references/ownership-test.md`)는 이 프로젝트의 기존 테스트 설정과 DB를 기준으로 첫 H Task에서 정한다. `prokit-web`·`prokit-ui`가 가리키는 `apps/web`, `packages/ui` 같은 경로는 대응표의 실제 경로로 바꿔 읽는다. `prokit-*`가 읽으라고 하는 외부 스킬은 이 프로젝트에 설치된 판(`.agents/skills/<이름>/SKILL.md`)을 읽고, 읽은 스킬은 그 행의 증거에 적는다.

## 두뇌와 선택 스킬
이 프로젝트의 두뇌(요구 정리, 계획, 구현 진행, 디버깅을 주도하는 스킬 묶음)는 `.dev-cycle.json`의 `brain`, 과설계 방지 스킬은 `simplicity`다. 둘 다 `none`이면 지금 세션의 에이전트가 `prokit-dev-cycle`의 내장 절차와 간결성 규칙으로 그 역할을 맡는다. 다른 값이면 `.agents/skills/prokit-dev-cycle/references/brains/`의 해당 파일과 `references/process-routing.md`의 역할 표를 따른다. 과설계 방지 스킬은 하나만 쓴다. 두뇌는 하나를 권하고, 여럿(배열. 첫 값이 주 두뇌)이면 `references/brains/README.md`의 단계 표로 단계마다 맡을 두뇌를 정한다. 전역 설치나 플러그인으로 고르지 않은 스킬이 보이거나 세션 시작 훅이 그 스킬을 먼저 쓰라고 해도 고르지 않는다. 용어와 설계 결정은 두뇌와 상관없이 `grilling` 형식으로 묻고 `domain-modeling`으로 기록한다. 바꾸는 일은 `prokit-skills-manage`로 한다.

## 보안 불변식
- 비밀값과 서버 전용 모듈은 클라이언트 번들로 보내지 않는다. 비밀값은 출력, 파일, 커밋에 남기지 않는다. 커밋 전에는 `pnpm dev-cycle secrets`로 스테이징한 변경을 검사하고, exit 1이면 커밋하지 않는다.
- 스키마 변경은 이 프로젝트의 마이그레이션 도구로만 한다.
- 운영 DB와 실사용자 데이터는 사용자가 요청할 때만 다룬다. 커밋은 라운드 끝에, push와 배포는 사용자가 요청할 때만 한다. 배포는 이 프로젝트의 기존 절차를 따른다.

## 에이전트
- `prokit-analyzer`: 읽기 전용 정밀 분석. 도입할 때와 큰 Task를 계획하기 전에 쓴다.
- `prokit-implementer`: 코디네이터가 지정한 파일만 구현한다.
- `prokit-reviewer`: 읽기 전용 통합 리뷰. focus는 plan, code, security, db이고 실제 계약·evidence hash·통합 수용 여부를 JSON으로 응답한다.
- `specialist-reviewer`: provider에 내장 리뷰가 없을 때만 전문 산출물을 읽기 전용으로 검토한다.
- Codex는 `spawn_agent`의 `agent_type`으로 부른다. `prokit-analyzer`·`prokit-reviewer`·`specialist-reviewer`는 `fork_turns: "none"`으로 띄워 메인 대화를 넘기지 않고(독립 분석·리뷰), 필요한 입력(초점, 기준 SHA, 파일 목록, evidence packet hash)은 메시지에 모두 넣는다.
- 배포와 운영 DB 적용은 서브에이전트에 맡기지 않는다.
- 스킬이나 플러그인이 없다고 나오면 `pnpm skills:check`로 확인해 보고한다. 설치는 사용자가 요청할 때 한다. 목록 정본은 `skills.manifest.json`이다. 외부 스킬 업데이트는 `prokit-skills-update`를 따른다.
<!-- prokit-template:end -->
