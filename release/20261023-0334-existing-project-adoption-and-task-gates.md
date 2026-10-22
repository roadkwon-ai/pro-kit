# v0.3.0 — Existing project adoption and task gates

- 날짜: 2026-10-23 03:34 (KST)
- 이전 버전: v0.2.3
- 전체 변경: https://github.com/roadkwon-ai/pro-kit/compare/v0.2.3...v0.3.0

## Features

- 기존 프로젝트 도입, 두뇌 3종, 진행 계획과 Task 게이트 (`259bc8a`)
  - prokit-init이 프로젝트 유형(새 프로젝트, 초기 프로젝트, 운영 중인 Next.js, 전환)을 먼저 정하고, 기존 프로젝트는 읽기 전용 초기 분석, 맞춤 설정, 유형별 동의, 안전 점검을 거쳐 적용한다
  - 설치기에 --project-type, --adopt(하네스만 설치), --legacy, --default-branch를 더했다. adopt는 추정 경로 규칙과 ESLint·Biome 무시 경로를 넣는다
  - 두뇌 OpenSpec, Spec Kit, Compound Engineering을 더하고 두뇌를 여럿 고를 수 있게 했다(첫 값이 주 두뇌)
  - 스킬 prokit-skills-manage(두뇌와 스킬 구성 변경)와 정밀 분석 에이전트 prokit-analyzer를 더했다
  - dev-cycle에 진행 계획 라운드(--plan), Task 라운드(--task)와 앞 Task가 끝나야 열리는 게이트, Task 표 지문(sig=)을 더했다
  - 빌드·배포 설정과 작업공간 설정(루트 package.json 등)을 H로 판정하고 H 표에 빌드·검사 행과 하네스 변경 리뷰 행을 더했다
  - 실제 에이전트 세션으로 유형별 도입과 프로젝트 세션을 시험하고 찾은 결함을 고쳤다(결과는 두 템플릿 VERIFICATION.md)
  - handbook에 기존 프로젝트 도입과 정밀 분석·진행 계획 쪽을 더하고 케이스, 설치기, 두뇌 문서를 맞췄다

## Fixes

- 채점 지적 보완으로 화면 리뷰 기록 대조와 테스트 러너 정리 (`90be78f`)
  - audit이 화면 리뷰 행의 실행 기록을 대조한다. critique는 .impeccable/critique 기록 파일과 머리의 점수, audit·web-design-guidelines는 tasks/evidence에 저장한 보고서와 총점(N/20)을 보고, 이번 라운드에 쓴 기록만 받는다
  - 브라우저 견본 스크립트가 콘솔 오류·경고, 잡히지 않은 오류, 모바일 가로 넘침을 직접 세어 결함 줄로 출력한다
  - 개발 서버를 띄우기 전에 3001 포트 점유를 확인하고, 다른 프로세스면 끄지 않고 사용자에게 알린다
  - table이 D·E·F 표를 열 때 그 계층 패키지에 test 스크립트가 없으면 vitest 도입 행을 맨 앞에 넣는다
  - prokit-verify와 project-plan.md의 테스트 러너 등록 위치를 맞췄다(E만 고치면 packages/db, 루트 등록은 첫 D Task)
  - prokit-analyzer는 판·개수·파일 이름을 연 파일에서만 옮기고, catalog:면 pnpm-workspace.yaml을 연다
  - handbook과 두 템플릿 VERIFICATION.md에 보완 내용과 남은 한계를 적었다
- Antigravity 실제 세션 시험으로 찾은 진행 계획 게이트와 확인 결함 수정 (`ddaa61d`)
  - 기존 프로젝트는 확정한 진행 계획(지문이 맞는 계획 블록) 없이 --task 없는 라운드를 열지 않는다. 사용자가 계획 전에 하라고 한 급한 버그 수정, 템플릿 갱신 반영, 스킬 구성 변경만 --no-task로 열고 notask=true와 status에 남긴다
  - AGENTS.md 코드 변경 절차와 도입 뒤 첫 요청 문구에 SKILL.md 경로, pnpm dev-cycle status, 진행 계획 라운드(--plan), Task 라운드(--task)를 적었다
  - 진행 계획 라운드의 [confirm] 증거에 사용자에게 보여 준 Task 구성의 지문(sig=)을 요구한다. 지문이 없거나 계획 블록·계획 리뷰 전이면 evidence가 거절하고, 확인 뒤 구성이 바뀌면 audit·status가 다시 확인을 요구한다. plan이 라운드 중에 지문을 보여 준다(--json은 confirmSig)
  - project-plan.md를 고쳤다. 질문 답에 붙은 "이대로 진행해"는 계획 확인으로 보지 않는다. 확인 요약에는 Task 목록, 만들지 않는 것, 바뀐 결정, 지문을 넣는다. 첫 H Task는 맞출 것이 있을 때만 두고 빈 Task는 만들지 않는다. 테스트 러너는 처음 D·E Task에서 들인다(E만이면 packages/db). 디자인 방향은 화면 Task에서 묻는다
  - prokit-reviewer plan focus는 계획의 케이스가 판정보다 가벼우면 --upgrade 수정안을 내고, 사용자 결정을 바꾼 곳을 표시하고, 빈 Task를 지적한다. prokit-analyzer는 경로를 상대 경로로 적고 운영 여부는 질문으로 남긴다
  - 케이스 C 재현 행은 프로젝트 테스트 러너로 돌린다. 화면 문구·모양 버그는 테스트 파일 없이 브라우저로 재현한다
  - VERIFICATION.md, handbook, E2E 계획 문서에 Antigravity 시험 AG1\~AG9 결과와 남은 한계를 적었다
- Codex 실제 세션 시험으로 찾은 Task 게이트와 하위 에이전트 결함 수정 (`786b966`)
  - Task 게이트가 tasks/plan.md에 커밋하지 않은 변경이 있으면 --task를 열지 않는다(앞 라운드를 닫은 뒤 커밋)
  - AGENTS.md에 Codex 분석·리뷰 에이전트를 fork_turns: "none"으로 띄우라고 적었다(메인 대화를 넘기지 않는 독립 리뷰)
  - Task 세부 계획과 prokit-reviewer(plan)이 바꿀 파일과 연 케이스를 맞추게 했다
  - handbook에 Codex 하위 에이전트가 사용자 설정의 default_subagent_model을 따른다고 고쳤다
  - Codex 시험 결과(CX1 9/10, CX2 10/10)를 두 템플릿 VERIFICATION.md와 시험 계획 문서에 적었다

## Docs

- 기존 프로젝트 도입, 진행 계획과 Task 게이트를 문서에 반영 (`9ff0993`)
  - README·CONTRIBUTING·handbook에 프로젝트 유형 점검(새·초기·운영 중·전환)과 기존 프로젝트 도입 흐름을 더했다
  - 정밀 분석 에이전트 prokit-analyzer, 진행 계획과 Task 게이트, --task·--plan·--no-task 라운드 설명을 맞췄다
  - 화면 리뷰 기록(.impeccable/critique, ui-audit 보고서) 대조와 오류 예산, vitest 도입 행을 audit·케이스·명령 쪽에 적었다
  - 두뇌 OpenSpec·Spec Kit 준비물(OpenSpec CLI, uv)과 전역 도구 설치 범위를 준비물·기술 스택·템플릿 README에 더했다
  - Codex·Antigravity 실제 세션 시험 결과를 지원 에이전트·검증 쪽에 기록하고, 용어집에 두뇌, 진행 계획, 정밀 분석, 도입을 더했다
