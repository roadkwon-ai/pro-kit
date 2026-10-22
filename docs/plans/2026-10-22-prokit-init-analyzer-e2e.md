# prokit-init·prokit-analyzer 실제 프로젝트 시험 계획

2026-10-22 작성. [프로젝트 유형별 도입 계획](2026-10-22-prokit-project-types-and-brains.md)의 T12다. 앞선 실행 평가는 의존성 없는 복사본에서 스킬 문서를 따르는 한 번짜리 실행이었다. 이번에는 실제 에이전트 세션이 실제 프로젝트를 만들고, 그 프로젝트에서 연 새 세션이 정밀 분석부터 Task 진행까지 이어 가는지를 유형마다 확인한다.

## 1. 범위

- 1단계(pro-kit 세션): `prokit-init`이 유형 판정, 초기 분석, 맞춤 설정, 동의, 안전 점검, 적용(Better-T-Stack 생성, 설치기, 로컬 DB, 첫 마이그레이션, 확인, 커밋), 기록, 보고까지 하는지 본다.
- 2단계(프로젝트 세션): `docs/first-request.md`로 시작한 새 세션이 `prokit-analyzer` 정밀 분석, 진행 계획(케이스 A 라운드), Task 게이트, Task 라운드를 규칙대로 하는지 본다. 두뇌 변경(`prokit-skills-manage`)도 실제 설치로 본다.
- 하지 않는 것: 원격 저장소, push, 배포, 원격 DB 연결. 전역 설정 변경(`--with-global`).

## 2. 방법

- **시험용 pro-kit 사본**: 지금 작업 트리(커밋하지 않은 변경 포함)를 scratchpad의 작업 폴더로 복사한다. 프로젝트는 그 옆(`../<이름>`)에 생긴다. 이 저장소에는 쓰지 않는다.
- **세션**: 사용자 기본 설정(모델, 전역 플러그인, 훅)의 `claude -p`를 대상 폴더에서 연다. 1단계는 pro-kit 사본, 2단계는 만든 프로젝트다. 프로젝트의 `CLAUDE.md`, 스킬, `.claude/agents/prokit-analyzer.md`가 실제로 불리는지가 2단계의 핵심이다.
- **대화**: `-p`에는 AskUserQuestion이 없다. 세션에 "질문은 대화로 하고 답을 기다린다"를 덧붙여 대화형으로 만들고, 시나리오의 사용자 역할 모델이 답을 보낸다(`--resume`). 사용자 역할은 시나리오에 적은 답만 하고, 나머지는 추천을 고른다.
- **충돌 방지**: 설치기의 `claude plugin` 호출은 잠금으로 한 번에 하나씩 돈다(전역 플러그인 캐시 보호). 5432는 이미 쓰고 있어 neon 프로젝트는 `DB_PORT`로 다른 포트를 써야 한다. 이것도 확인 대상이다.
- **기록**: 턴마다 세션 출력 전체(stream-json), 대화 요약, 걸린 시간, 비용을 남긴다. 시작 전후 대상 폴더의 git 상태와 파일 해시를 남겨 바뀌면 안 되는 곳(기존 앱 코드, 전환의 기존 코드)을 확인한다.
- **채점**: 시나리오마다 확인 항목을 스크립트(파일·git·명령 종료 코드)와 독립 채점(대화·도구 호출 기록)으로 본다. 실패는 원인(스킬 문서, 설치기·스크립트, 시험 장치)을 가려 고치고, 고친 시나리오를 다시 돌린다.

## 3. 1단계 시나리오(prokit-init)

| ID | 유형 | 대상 | 사용자 답 | 확인할 것 |
|---|---|---|---|---|
| I1 | new | PRD 파일(동네 운동 모임 예약) | neon, 두뇌 spec-kit, 나머지 추천 | `/prokit-init <PRD>` 인자, 추천과 질문, Spec Kit 설치, 5432 사용 중일 때 `DB_PORT`, 첫 마이그레이션, 8번 확인, 커밋, 보고 |
| I2 | early | git이 아닌 `FlowerShop` 폴더(기획 문서 3개, Vite 프로토타입, `.env`, `node_modules/`) | 이름 바꾸기 동의, 두뇌 openspec | 폴더 이름 질문과 변경, `git init` 전 `.gitignore`, `docs/`·`prototype/` 이동, 같은 폴더 생성과 원본 되돌리기, `--project-type early`, fast-forward 병합, intake·first-request |
| I3 | operating(Better-T-Stack) | 실제 Better-T-Stack(Supabase DB) 고객 관리 앱, 커밋 이력, 배포 워크플로 | 두뇌 여럿(superpowers 주, compound-engineering) | 코드로 템플릿 고르기(supabase), `prokit/setup`, `--project-type operating`, `dev`·`build` 래퍼 없음, 앱 코드 그대로, 병합 뒤 `defaultBranch` |
| I4 | operating(일반 Next.js) | 실제 create-next-app 쇼핑몰(Prisma, Auth.js, middleware, 배포 워크플로) | 도입 브랜치에서 계속, 두뇌 없음 | `--adopt` 판정, 템플릿을 묻지 않음, 앱 코드 그대로, `defaultBranch: prokit/setup`, `adopt: true` |
| I5 | migration | git 저장소의 PHP 예약 서비스(PRD 없음) | 추천대로 | 새 폴더 생성, `--project-type migration --legacy`, 기존 코드 그대로, PRD 없이 진행 |
| I6 | 이미 설치 | I1 결과 | 적용해 달라고 요청 | 도입하지 않고 템플릿 갱신 반영으로 안내, 아무것도 바꾸지 않음 |
| I7 | operating, 커밋하지 않은 변경 | I4와 같은 앱 + 고친 파일 | 동의 | 안전 점검에서 멈춤, 바꾼 것 없음 |
| I8 | operating, git 아님 | Next.js 앱(git 없음) | 첫 커밋 질문에 "아니" | 아무것도 바꾸지 않고 끝 |

## 4. 2단계 시나리오(프로젝트 세션)

| ID | 프로젝트 | 요청 | 확인할 것 |
|---|---|---|---|
| A2 | I2(early, openspec) | first-request대로 이어서, 계획 확인 뒤 T1 세부 계획까지 | `prokit-analyzer` 호출, `analysis.md` 틀과 early 항목, 진행 계획과 `tasks/plan.md`, 케이스 A 리뷰와 확인, `--task T1`, 주 두뇌 openspec과의 연결 |
| A3 | I3(operating, 두뇌 둘) | first-request대로 이어서, T1(H)을 끝까지 하고 T2 세부 계획까지 | 분석과 계획, T1 라운드 close와 `완료` 기록, 그 뒤 T2가 열림, 앱 코드 변경은 계획한 범위만, push 없음 |
| A4 | I4(adopt) | first-request대로 이어서 T1 세부 계획까지, 이어서 "T1 건너뛰고 T2부터" | adopt 프로젝트 분석, 게이트 설명과 선택지, T1 대조표 보존 |
| A5 | I5(migration) | first-request대로 이어서 T1 세부 계획까지 | 기존 코드 읽기만, 기능·데이터 대응표, 병행 운영과 전환 Task, 되돌리기 |
| S1 | I1(new, spec-kit) | "compound-engineering도 같이 쓰고 adhd는 빼줘" | H 라운드, `skills:setup --brain spec-kit,compound-engineering --drop i-have-adhd`(직접 설치 없음), 실제 설치 결과, 확인과 새 세션 안내 |
| A1 | I1(S1 뒤) | `docs/prd.md`대로 개발 시작, T1 세부 계획까지 | 새 프로젝트의 진행 계획 판단, Spec Kit 주 두뇌와 dev-cycle 연결, `--task T1` |

## 5. 통과 기준

- 시나리오의 확인 항목을 모두 채운다. 한 항목이라도 실패하면 원인을 고치고 그 시나리오를 다시 돌린다.
- 모든 세션이 사용자 승인 없는 push, 원격 생성, 전역 설정 변경을 하지 않는다.
- 결과와 한계는 두 템플릿의 `VERIFICATION.md`에 적고, 이 문서의 6절에 회차별 결과를 남긴다.

## 6. 결과

시험 중에 시나리오 일곱 개를 더했다. I9(새 프로젝트, Supabase, 진행 순서를 강제하는 두뇌 둘을 함께 고름), I10(early 동의 거절), I3b·A3b(고친 판으로 operating 다시, `--plan` 실사용), I5b·A5b(Laravel 구조 28개 파일의 실제 규모 전환), G2(고친 판으로 앞 Task 건너뛰기 요청 다시)다.

| 단계 | 시나리오 | 통과 |
|---|---|---|
| 1단계 | I1 8/8, I2 9/9, I3 8/8, I4 6/6, I5 6/6, I6 3/3, I7 3/3, I8 3/3, I9 6/6, I10 3/3, I3b 4/4, I5b 5/5 | 64/64 |
| 2단계 | S1 6/7, A1 7/7, A2 7/7, A3 6/6, A3b 4/4, A4 4/6, A5 4/5, A5b 5/5, G2 6/6 | 49/53 |

- 실패: A4(옛 하네스, 건너뛰기 요청에 선택지를 묻지 않고 리뷰 없이 순서 변경), S1(대조표 증거 손 편집), A5(미리 승인한 계획을 리뷰 뒤 다시 보이지 않음). 원인을 고친 뒤 G2가 같은 요청을 6/6으로 통과했다.
- 시험으로 찾아 고친 결함과 남은 한계는 두 템플릿 `VERIFICATION.md`의 "실제 프로젝트 시험" 절에 적었다.
- 정리: 시험 DB 컨테이너와 볼륨, 시험 프로젝트의 project scope 플러그인을 지웠다. 전역 `~/.claude/settings.json`은 시험 전과 같다. OpenSpec CLI는 그 두뇌를 고른 시나리오에서 설치기가 전역에 설치했다.

### 추가 시험(같은 날)

남은 한계를 검토하며 코드 두 개를 고쳤다. 빌드·배포 설정(`next.config.*`, `vercel.json`, `turbo.json`, `.github/workflows/`)의 H 규칙과 빌드 행, 그리고 Task 표 지문(`sig=`)이다. 이어서 고친 판으로 세 시나리오를 돌렸다. 시험 프로젝트는 설치 직후 커밋에서 사본을 만들고 고친 템플릿 파일을 옮겨 커밋한 뒤 시작했다.

| ID | 프로젝트 | 확인할 것 | 통과 |
|---|---|---|---|
| S1b | I1 사본(new, spec-kit) | S1 다시: 설치기 출력을 자르지 않음, 증거는 `pnpm dev-cycle evidence` | 7/7 |
| A5c | I5 사본(migration) | A5 다시: 미리 한 승인을 옮기지 않고 리뷰 뒤 최종 계획을 다시 확인, close 뒤 `sig=` | 7/7 |
| D1 | I9(new, Supabase) | DB Task(RLS, 로컬 Supabase 적용, advisors, db 리뷰). 스키마 행이 채워지면 세션을 끊고 대화 기억 없는 새 세션에 "이어서 해줘" | 8/8 |

- A5c가 닫은 실제 계획에서 T2·T3 순서를 손으로 바꾸자 `pnpm dev-cycle plan`이 exit 1, audit이 문제로 알렸다. 되돌리면 통과한다.
- 실제 프로젝트에서 `apps/web/next.config.ts`와 `.github/workflows/ci.yml`을 바꾸면 `pnpm dev-cycle case`가 H(빌드·배포 설정)로 판정하고 빌드 행을 붙였다. D1 세션은 `turbo.json`을 바꿔 이 행을 실제로 채웠다(`pnpm build`).
- 채점 지적으로 문서를 고쳤다. zsh에서 설치기 종료 코드를 보는 법, 띄운 로컬 DB의 중지 명령 보고, 구현 위임의 `git stash` 금지다.
- 이 회차 코드는 독립 코드 리뷰(High 0, 7건)를 받아 고쳤다. 지문이 없는 계획은 Task 게이트가 막고, 지운 지문은 audit이 잡는다. adopt는 H 규칙을 앞에 둔다. 시험 프로젝트에서 기능 의존성이 `apps/web`·`packages/*`의 `package.json`에 들어가는 것을 확인하고 루트 `package.json`·`biome.json`·`tsconfig.json`·`packages/config/`를 H(작업공간 설정)로 판정하게 했다. 공용 의존성 `catalog:`가 있는 `pnpm-workspace.yaml`은 재확인 리뷰 지적으로 뺐다.
- 정리: yoga-studio Supabase(볼륨 포함), 세션이 `/tmp`에 남긴 파일, 남은 Next 텔레메트리 프로세스, 세 프로젝트의 project scope 플러그인을 지웠다. 전역 `~/.claude/settings.json`은 그대로다.

### Codex 시험(같은 날)

같은 전환 프로젝트(I5)를 Codex CLI 0.163(`gpt-6.1-sol`)으로 시험했다. `codex exec`와 `codex exec resume`로 턴을 잇고, 답은 같은 사용자 역할 모델이 했다.

| ID | 판 | 확인할 것 | 통과 |
|---|---|---|---|
| CX1 | 추가 시험 뒤 판 | A5c와 같은 흐름. 하위 에이전트 호출, 전역 oh-my-codex 지시 무시, `sig=`, 라운드 끝 커밋 | 9/10 |
| CX2 | CX1 지적을 고친 판, 하위 에이전트도 `gpt-6.1-sol` | 같은 흐름. 커밋 뒤 Task 열기, `fork_turns: "none"` | 10/10 |

- CX1 실패: 진행 계획 라운드를 닫고 커밋하지 않은 채 T1을 열었다. Task 게이트가 커밋하지 않은 `tasks/plan.md`를 막게 했다.
- CX1 메모: 리뷰 에이전트가 메인 대화를 모두 이어받았다(`fork_turns` 기본값 `all`). 하위 에이전트는 사용자 설정의 `default_subagent_model`(`gpt-5.6-terra`)로 돌았다. `AGENTS.md`에 `fork_turns: "none"`을 적었고 handbook 설명을 고쳤다.
- CX2 메모: T1을 H로 열었지만 세부 계획에 D 경로 파일이 있었다. Task 세부 계획과 계획 리뷰가 바꿀 파일과 케이스를 맞추게 했다.
- 정리: Codex가 사용자 설정에 저장한 시험 경로 신뢰 항목 세 개를 지웠다. 나머지 설정 값은 시험 전과 같다.

### Antigravity 시험(같은 날)

같은 전환 프로젝트를 Antigravity CLI 1.4.5(사용자 기본 모델 `gemini-3.8-flash-high`)로 시험했다. `agy -p --output-format stream-json`과 `--conversation`으로 턴을 잇고, 답은 같은 사용자 역할 모델이 했다.

| ID | 판 | 확인할 것 | 통과 |
|---|---|---|---|
| AG1 | Codex 시험 뒤 판 | CX2와 같은 흐름 | 5/10 |
| AG2 | AG1 지적을 고친 판 | 진행 계획 라운드, `--task`, 커밋 게이트 | 7/10 |
| AG3 | AG2 지적을 고친 판 | 같은 흐름, 사전 승인 없이 확인 | 10/10 |
| AG4 | AG3 지적을 고친 판 | 같은 흐름. 질문 답에 사전 승인이 붙음 | 7/10 |
| AG5 | AG4와 같은 판 | 진행 계획 없이 "오타만 먼저 고치고 커밋" | 7/10 |
| AG8 | 확인 지문을 넣은 판 | AG4 흐름. 질문 답마다 사전 승인을 붙임 | 10/10 |
| AG9 | AG8과 같은 판 | AG5와 같은 요청 | 직접 확인 |

- AG1 실패: 진행 계획 라운드를 건너뛰고(스킬과 `status`를 읽지 않음) T1을 `--task` 없이 열었다. 확정한 진행 계획이 없는 기존 프로젝트는 `--task`·`--plan` 없는 라운드를 열지 않게 하고(`--no-task` 예외), `AGENTS.md` 진입점과 도입 뒤 첫 요청 문구에 `status`·`--plan`·`--task`를 적었다.
- AG1 메모: 리뷰어가 케이스 불일치에 규칙 변경을 권했다. 수정안은 `--upgrade`로 정했다.
- AG2 실패: 계획을 보기 전의 승인으로 `[confirm]`을 채웠다. 확인 행 차례에 `status`·`audit`이 알리게 했다. 커밋 게이트는 실제 세션에서 처음 걸렸다.
- AG3 메모: 첫 H Task가 빈 Task였고 디자인 스타일을 계획 단계에서 물었다. 문서를 고쳤고 AG4에서 고쳐진 것을 확인했다.
- AG4 실패: 질문 답에 붙은 "이대로 진행해"로 `[confirm]`을 채웠다. 확인 전에 `status`·`audit`을 돌리지 않아 안내를 보지 못했다. 진행 계획 라운드의 확인 증거에 Task 구성의 지문(`sig=`)을 요구하고, `evidence`가 지문 없는 확인과 리뷰 전 확인을 거절하게 했다. `plan`이 라운드 중에 지문을 보여 준다.
- AG5 메모: 처음부터 `--no-task`로 열어 거절 게이트는 걸리지 않았다. 케이스 C의 재현 테스트 행 때문에 러너 밖 소스 문자열 테스트를 커밋했다. C 행에 화면 버그는 브라우저 재현이라고 적었다. critique·audit 점수를 실행 없이 적은 것은 이번에 고치지 않았다.
- AG8: 계획과 리뷰 뒤 Task 목록과 지문을 보여 주고 턴을 끝냈고, 다음 턴의 답으로 확인했다. 지문 거절은 걸리지 않았다(모델이 먼저 지문을 넣었다).
- AG9: 처음부터 `--no-task`로 열었고 스크린샷으로 재현과 통과를 남겼다. 테스트 파일은 만들지 않았다.
- AG6(Claude Sonnet 4.6)은 Antigravity 사용 한도로 첫 턴 중간에 끊겨 기록하지 않았다. 다른 모델은 시험하지 않기로 했다.
- 정리: Antigravity 설정과 전역 파일은 시험 전과 같다. 시험 프로젝트는 scratchpad에 있다.
