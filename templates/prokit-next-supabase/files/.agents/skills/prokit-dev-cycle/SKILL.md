---
name: prokit-dev-cycle
description: >-
  이 Better-T-Stack Next.js + Supabase 프로젝트에서 코드, 스키마, 화면, 설정, 스킬을 바꾸는
  모든 작업의 진입점. 기능 추가, 버그 수정, 리팩터, 화면 변경, API나 DB 변경, 스킬이나 에이전트
  수정 요청을 받으면 구현을 시작하기 전에 이 스킬로 케이스를 판정하고 dev-cycle 대조표를 연다.
  만들어줘, 추가해줘, 고쳐줘, 버그, 바꿔줘, 리팩터, 기능 개발, 작업 시작, 다 됐어, 완료 처리
  같은 요청에 사용한다. 코드를 바꾸지 않는 질문 답변이나 코드 읽기에는 쓰지 않는다.
---

# 프로킷 개발 사이클

코드를 바꾸는 작업은 모두 **라운드** 하나로 진행한다. 라운드는 `tasks/todo.md`에 붙는 대조표 하나이고, 모든 행의 증거 칸이 채워지고 `pnpm dev-cycle audit`이 통과해야 끝난다.

일반 할 일이나 백로그에서 끝낸 항목만 정리할 때는 `pnpm dev-cycle archive [--title "제목"]`을 쓴다. 활성 라운드가 있어도 대조표 밖의 `[x]` 항목만 보관하고, 미완료 항목·활성 대조표·코드 예시는 그대로 둔다. 끝난 하위 항목은 부모 항목 문맥과 함께 보관한다. 기록은 `tasks/archive/README.md`에 모이고, `tasks/todo.md`에는 남은 항목과 이 색인 링크 하나만 남는다.

## 0. 시작
1. `pnpm dev-cycle status`로 진행 중인 라운드가 있는지 본다. 있으면 그 라운드를 이어서 진행한다. 없으면 status가 외부 스킬의 새 버전도 확인한다(원격은 하루에 한 번). `UPDATE_AVAILABLE`, `UPSTREAM_GONE`, `CHECK_FAILED` 줄이 붙어 나오면 라운드를 열기 전에 `prokit-skills-update`의 1절을 따른다.
2. `AGENTS.md`, `GLOSSARY.md`, `docs/domain/project.md`, `tasks/lessons.md`(있으면)를 읽는다. `.dev-cycle.json`의 `brain`·`simplicity`로 이 프로젝트의 두뇌와 과설계 방지 스킬을 확인한다(키가 없으면 `none`. `brain`이 배열이면 두뇌가 여럿이고 첫 값이 주 두뇌다). 진행 방법은 [references/process-routing.md](references/process-routing.md)의 기본 칸과 고른 두뇌의 [두뇌 파일](references/brains)(`<이름>.md`, 고르는 기준과 두뇌가 여럿일 때의 단계 표는 `README.md`), 설치된 추가 스킬(`pnpm skills:check`의 `mattpocock 추가` 줄)을 따른다. 구성을 바꾸는 요청은 `prokit-skills-manage`를 따른다.
3. 요청을 한 문장으로 다시 쓰고, 결과를 바꾸는 모호함이 있으면 구현 전에 묻는다.
4. 진행 계획(`tasks/plan.md`)이 있으면 `status`가 다음 Task를 함께 보여 준다. 진행 계획의 일은 6절을 따른다. 기존 프로젝트(`.dev-cycle.json`의 `projectType`이 `early`·`operating`·`migration`)인데 `docs/prokit/analysis.md`가 없으면 정밀 분석부터 한다(6절).
5. 수행자를 배정하기 전에 `pnpm dev-cycle resource check`로 현재 루트를 확인한다. 설치·새 Node 또는 Python 환경·수동 검증은 선택한 수행자가 `pnpm dev-cycle resource run --kind <install|pythonVenv|verify> -- <명령>`으로 실행한다. 명령 인자는 출력과 증거에 남으므로 비밀값(비밀번호, 토큰)은 인자로 넘기지 않고 환경 변수나 git이 무시하는 파일로 넘긴다. 새 무거운 작업에서 측정이 unknown이거나 차단되면 `blocked`다. dev·build·export의 기존 보호 경로는 다시 감싸지 않는다. 활성 환경은 크기만으로 지우지 않으며, 관리 임시는 실제 handle·전후 측정·결과 참조가 확인될 때만 정리한다.

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
| H | 스킬, 에이전트, dev-cycle 자체 변경. 빌드·배포 설정(`next.config.*`, `vercel.json`, `turbo.json`, `.github/workflows/`)과 작업공간 설정(루트 `package.json`, `biome.json`, `tsconfig.json`, `packages/config`)도 H다 |

- 새 기능 요청은 F, 버그 제보는 C로 선언한다. 애매하면 더 무거운 케이스를 고른다.
- 고치거나 만들어 달라는 요청이면, 이번에는 원인 분석이나 스펙·계획까지만 하라고 해도 라운드를 연다. 분석 결과와 재현 계획은 블록 안 메모나 `tasks/evidence/`에 남기고, 행의 증거 칸은 그 행을 실제로 끝냈을 때만 채운다. 다음 세션이 `pnpm dev-cycle status`로 이어받는다. 코드를 바꾸지 않는 질문이나 설명 요청에만 라운드를 열지 않는다.
- 인증 민감 경로(`packages/auth`, `api/auth`, `services.ts`, `.env.schema` 등)를 건드리면 security 리뷰 행이 자동으로 붙는다.
- 러너는 diff에 인증 민감 경로가 생긴 뒤에야 이 행을 붙인다. 그 전이라도 수정 대상이 인증 경로이거나 로그인, 세션, 권한 문제라면 대조표를 연 직후 `| <다음 번호> | [review] prokit-reviewer(security) → verdict, max_severity, 반영·기각 내역 |  |` 행을 직접 추가한다(번호 칸은 숫자여야 러너가 행으로 읽는다). 수정 전에 원인 분석부터 하는 단계여도 추가하고, 보고에 "수정 라운드에서 security 리뷰가 필요하다"고 적는다.

## 2. 대조표 열기
```bash
pnpm dev-cycle table <케이스> --write --title "<요청 요약>"
```
케이스를 생략하면 diff 판정 결과를 쓴다. 아직 파일을 바꾸기 전이면 판정이 A이므로 요청 기준 케이스를 반드시 적는다. `--write` 없이 실행하면 미리 보기만 한다.

대조표를 연 직후, D·E 또는 서버·DB 버그의 C라면 프로젝트의 테스트 명령과 러너 설정부터 확인한다. D·E·F 표는 그 계층 패키지(`packages/api`, E는 `packages/db`)에 `test` 스크립트가 없으면 `table`이 `vitest 도입` 행을 첫 행 앞에 넣는다. C이거나 그 패키지 폴더가 없는 구조인데 러너가 없으면 3절대로 직접 추가한다. 이 행을 처리한 뒤 계약·구현 행으로 간다. 기존 코드가 요청을 이미 충족하거나 사용자가 "구현 행까지만" 요청해도 이 선행 행을 빼거나 검증 단계로 미루지 않는다. 전역에 Bun 같은 실행 파일이 있는 것만으로 프로젝트 테스트 러너가 준비된 것은 아니다. 설치가 실제로 막히면 시도한 명령과 오류를 `blocked: 사유`로 남기고, 이에 의존하는 행을 완료로 채우지 않는다.

## 3. 행 실행
- 위에서부터 순서대로 수행하고, 끝낸 행의 현재 프로젝트 한 줄 증거 파일을 `tasks/evidence/`에 둔 뒤 `pnpm dev-cycle evidence <행 번호> --file <증거 파일>`로 채운다. 대조표 셀을 수동으로 stage 문자열로 고치지 않는다. 첫 증거를 적기 전에 `prokit-verify`를 불러 검사 고르기(lint 기준 비교 포함)와 증거 형식을 따른다: 실행한 명령과 결과, 산출물 경로, 사용한 스킬 이름. `✓`, `ok`, `done`만 적는 것은 증거가 아니다. 해당 없는 행은 `N/A: 사유`로 적는다. 표 끝의 `[confirm]` 행은 예외다(5절).
- 병렬 수행, 검사 재사용, 실패 뒤 재시도는 [실행 효율과 재검증](references/execution-efficiency.md)을 따른다.
- 계층별 스킬: 화면 동작은 `prokit-web`, 화면 모양과 UX는 `prokit-ui`, API와 인증은 `prokit-api`, DB는 `prokit-db`, 검사와 증거는 `prokit-verify`.
- 문서는 그 계층을 구현하는 행에서 함께 고친다. 새 용어는 `domain-modeling`을 읽고 그 형식(`GLOSSARY-FORMAT.md`)으로 `GLOSSARY.md`에, 새 화면·프로시저·테이블은 `docs/domain/project.md`의 해당 표와 `용어` 칸에 넣는다. 그래야 뒤의 리뷰 행이 문서까지 함께 본다. 표 끝의 `문서 영향 확인` 행에는 고친 내역이나 `N/A: 사유`를 적는다.
- 행 문구에 괄호로 적힌 스킬(외부 스킬 `supabase-postgres-best-practices` 등)은 그 행을 할 때 실제로 불러 쓰거나 읽고, 증거 칸에 `사용: supabase-postgres-best-practices`처럼 이름을 적는다. 괄호의 단계 이름(요구 명확화, 계획, 구현, 테스트 먼저, 디버깅, 간결성 검토)은 `process-routing.md`의 그 단계 방법(고른 두뇌 파일, 설치된 추가 스킬, 기본 칸)으로 하고, 증거 칸에 실제로 쓴 방법을 다음 꼴로 적는다: `사용: <두뇌 파일에 백틱으로 적힌 이름>`(예: `사용: superpowers:systematic-debugging`), `사용: <스킬>(추가 스킬)`, `사용: 내장(<단계>): <사유>`(두뇌를 골랐으면 사유 필수. 두뇌가 `none`이면 `사용: 내장(디버깅)`도 된다). 두뇌를 골랐으면 audit이 단계 행(행 문구에 `요구 명확화 단계`·`계획 단계`·`구현 단계`·`디버깅 단계`·`고른 두뇌의 계획 방법`이 든 행)의 증거 이름을 본다. 이름만 보는 자기 신고라 실제로 스킬을 불러 쓴다. 외부 스킬은 `.agents/skills/<이름>/SKILL.md`를 읽는다(`AGENTS.md` 계층별 스킬). 계층 스킬의 "공식 스킬 연결" 표에 해당하는 상황이 오면 괄호에 없어도 같다.
- 설계, 계획, 구현, 디버깅, 리뷰, QA, 검증의 [references/process-routing.md](references/process-routing.md) 표는 사용자 출처가 없을 때의 기본이다. 실제 선택은 위임 정본의 사용자 명시 출처 → 프로젝트 정본 → 접근 가능한 외부 제공자 → 검증한 표의 대안 순서로 하고, 증거 칸에 실제 제공자와 coverage를 적는다.
- `[design]` 행은 구현 전에 [references/reuse-design.md](references/reuse-design.md)를 따라 기존 경로·소비자, 재사용·분리 결정, 환경 변수·설정 영향, 회귀 검사를 계획·브리프 또는 증거 칸에 남긴다. F는 계층별 결정을 함께 점검한다. 증거는 참조의 `기존: …; 결정: …; 설정: …; 검증: …` 형식을 쓰며, 환경 변수·설정이 바뀌지 않아도 그 사실을 생략하지 않는다. A·C도 관련 변경이면 같은 기준을 쓰되 별도 설계 문서를 강제하지 않는다.
- 환경 변수 변경 계획은 숨김 파일 `apps/web/.env.schema`와 기존 검증·로더를 직접 읽고, 변수별 공개성·필수 여부·기본값·소비자·환경별 공급 위치를 기록한다. 계획 리뷰어도 같은 정본과 대조한다. 참조 문서를 읽었다는 기록으로 이 확인을 대신하지 않는다.
- D나 E 행이 있거나 C의 재현 대상이 서버·DB 코드인데 테스트 러너가 아직 없고 `table`이 이 행을 넣지 않았으면(C, 그 패키지 폴더가 없는 구조), 대조표 첫 행 앞에 `| 0 | vitest 도입(최초 1회) → 설정 파일과 실행 결과 |  |` 행을 직접 추가한다. `turbo.json`은 `turborepo` 스킬이 가리키는 설치판 문서를 기준으로 한다. Main은 `package.json`·`turbo.json`의 정확한 파일 범위를 배정하고, 선택한 수행자가 테스트 먼저 방식과 `turborepo` 스킬로 고친다. 명시 배정한 루트 설정은 이 기술 변경 권한에 포함된다. 검증한 수행자가 없으면 `blocked`로 남기고 Main이 구현하지 않는다. 러너 도입은 요청 범위를 넓히는 일이 아니다. 격리 테스트 행을 채울 방법이 이것뿐이라 이 라운드에서 한다. 화면 버그처럼 단위 테스트로 재현하기 어려우면 브라우저로 재현한 흐름과 스크린샷(`prokit-verify`의 `references/browser.md`)을 C의 재현 증거로 적는다.
- 작업 중 다른 계층을 건드리게 되면 `pnpm dev-cycle audit`이 케이스 상향을 알려 준다. 안내대로 `pnpm dev-cycle table <새 케이스> --write --upgrade`를 실행한다. 이미 채운 증거, 직접 추가한 행, 블록 안 메모는 보존된다. 다만 직접 추가한 행과 새 케이스에 없는 이전 행은 `vitest 도입(최초 1회) → 설정 파일과 실행 결과` 행을 제외하고 표 끝의 `[confirm]` 행 바로 앞으로 옮겨지고 번호가 다시 매겨지며, 그 Vitest 행은 첫 행에 남는다.

## 4. 에이전트
- 수행자나 외부 전문 스킬을 고를 때는 [위임과 전문 스킬 프로토콜](references/delegation.md)을 읽는다. 먼저 `pnpm dev-cycle delegation resolve <skill-ref|relative-path>`로 source를 관측하되 이는 inspection-only다. 현재 사용자 scope의 read-only 전문 텍스트 생산은 실제 source inspection과 같은 task/run/root의 accepted native call이 확인되면 선택 source를 읽어 artifact로 반환할 수 있다. 선택은 매니페스트 목록이 아니라 실제 접근한 내용의 출처·canonical location·hash·scope·의존성·capability·side effect 검증과 native runtime receipt로 정한다.
- 현재 로컬 Codex의 자동 기술 인수는 `pnpm dev-cycle delegation accept`로 필요한 검사와 fresh 리뷰를 직접 실행한다. 옵션과 source·artifact·권한 경계는 [관리된 CLI 기술 인수](references/delegation.md#관리된-cli-기술-인수)를 따른다. 출력된 기술 완료를 사용자 확인이나 다른 실행의 승인으로 재사용하지 않는다.
- 리뷰 행(`prokit-reviewer(...)`)은 반드시 `prokit-reviewer` 에이전트에 맡긴다. 프롬프트에 focus(`plan`, `code`, `security`, `db`), 대조표 마커의 base SHA, 검토할 파일 목록, 대조표 경로를 준다. 응답 JSON은 증거 칸에 요약한다. 예: `prokit-reviewer(code): approve, max=low, 지적 2 (반영 1, 기각 1: 재현 안 됨)`. 응답의 `skills_read`에 focus 스킬(`prokit-reviewer` 절차 1)이 빠졌으면 읽고 다시 리뷰하게 한다.
- 지적은 직접 확인한 뒤에만 고친다. high 이상 지적을 고쳤으면 같은 focus로 다시 리뷰한다. 응답이 없거나 JSON이 깨졌으면 `blocked`로 적는다.
- `prokit-reviewer(plan)`에는 스펙·계획·브리프와 재사용·설정 결정 위치, 실제 기존 파일 목록을 준다. 두뇌의 계획 리뷰가 없어도 이 리뷰는 수행하고 N/A로 넘기지 않는다. `changes-required`는 지적을 처리한 뒤 다시 리뷰하고, `blocked`이면 이에 의존하는 구현을 시작하지 않는다. 증거는 `prokit-reviewer(plan): approve, max=none|low|medium, 반영·기각 내역`으로 쓴다.
- `prokit-reviewer(code)` 행에서는 선택 provider의 내장 전문 review를 실제 coverage와 같은 reuse key로 확인해 재사용한다. 빈 focus만 과설계 방지 역할 표의 구현 diff 보완 검토나 `specialist-reviewer`로 보완한다. Main의 project contract final inspection은 매 라운드 수행한다. 새 파일은 `git diff`에 나오지 않으니 내용을 함께 넘긴다. 증거 칸은 `prokit-reviewer(code):` 결과로 시작하고 coverage·보완 결과(예: `ponytail-review: 반영 2(Must fix 1), 기각 1, 백로그 1, Lean -12 lines`)를 덧붙인다. 정확성·보안 지적을 간결성 규칙으로 기각하지 않는다(규칙 6의 지적 처리). 고른 과설계 방지 스킬에 diff 검토가 없으면(karpathy, none) `prokit-reviewer(code)` focus에 간결성을 넣고 `blocked`로 두지 않는다.
- 설계·계획·구현·리뷰의 간결성은 [references/process-routing.md](references/process-routing.md) 규칙 6이다. 하네스 규칙(스펙의 "만들지 않는 것" 절, 독립 계획 리뷰, 구현 diff 보완 검토)은 무엇을 골라도 지키고, 고른 과설계 방지 스킬(`simplicity`)이 역할 표대로 그 일을 맡는다. ponytail을 골랐으면 구현은 ponytail 모드로 한다(Claude는 플러그인 훅이 켠다. Codex 네이티브 플러그인은 trusted 프로젝트에서 `/hooks` 허용과 새 세션이 모두 필요하다). 고른 스킬의 규칙보다 이 스킬, `AGENTS.md`, 대조표가 우선한다. vitest 도입 행, 격리 테스트, 구현 전 질문은 줄이지 않는다.
- 구현을 위임할 때는 `prokit-implementer`에 정확한 파일 목록, 그 단계의 두뇌 스킬(`references/brains/<이름>.md`의 구현 칸. 고른 두뇌가 없으면 생략), 선택한 전문 스킬의 검증 결과, 재사용·설정 결정 위치, 완료 조건을 준다. 병렬로 위임할 때는 파일이 겹치지 않게 나눈다. `AGENTS.md`, `.dev-cycle.json`, `package.json`, 루트 설정은 메인이 맡는다. 메인이 파일을 명시해 배정한 경우만 수행자가 그 루트 설정을 고칠 수 있다.
- 위임한 쪽의 보고만 믿지 않는다. 수행자·리뷰어·QA를 부르기 전과 끝난 뒤 `pnpm dev-cycle delegation capture`·`diff`로 작업 트리를 대조하고, 배정 밖 변경이나 커밋이 나오면(exit 1) 그 결과를 통합하지 않고 재지시한다. 명령과 병렬 위임의 대조 방법은 위임 프로토콜의 "관측과 수행 범위"를 따른다.
- 두뇌 파일의 "에이전트" 절에 든 에이전트(예: `agent-skills:security-auditor`)는 읽기 전용 보완 검토로만 쓴다. 파일을 쓰지 않게 지시하고 전후 `delegation capture`·`diff`(`--scope` 없이)로 확인하며, 쓴 것이 있으면 결과를 버리고 `blocked`로 남긴다. 결과는 `prokit-reviewer` 게이트의 입력이지 대체가 아니다.
- impeccable `critique`처럼 서브에이전트를 스스로 띄우는 스킬은 메인 세션에서 실행한다.
- 정밀 분석은 읽기 전용 `prokit-analyzer`에 맡긴다. 도입 기록, 유형, 기존 코드 경로, 초점을 주고 돌려받은 보고서를 메인이 `docs/prokit/analysis.md`에 쓴다(6절).

## 5. 종료
라운드는 사용자 확인 → audit·close → 커밋·push → (사용자가 고르면) 릴리스와 production 배포 순서로 마무리한다. `[confirm]`과 audit은 건너뛰지 않는다.

1. 두뇌의 실행 모드(OMC·OMX 등)를 실제로 썼다면 여기서 취소한다(`references/brains/<이름>.md`). 모드가 보고한 완료는 증거가 아니고, 모드가 켜져 있으면 사용자 답을 기다리지 못한다.
2. 고른 두뇌의 검증 스킬(superpowers `verification-before-completion` 등)을 불러(두뇌가 없거나 검증 스킬이 없으면 `prokit-verify` 원칙만) `pnpm dev-cycle audit`으로 남은 문제가 표 끝의 `[confirm]` 행뿐인지 본다. 다른 행이 남았거나 케이스 상향이 나오면 먼저 끝낸다. 사용자가 확인할 것은 마지막 결과다.
3. **사용자 확인** (`[confirm]` 행): 결과를 보여 주고(화면이면 주소와 스크린샷, 기능이면 써 볼 순서) 사용자의 답을 기다린다. 화면이 있으면 개발 서버를 백그라운드로 띄워 주소가 응답하는지 확인한 뒤 요청하고, 사용자가 답할 때까지 끄지 않는다. 테스트 순서(F는 스펙의 테스트 시나리오)와 알려진 문제(남은 오류, 미룬 지적)를 함께 준다. 사용자가 직접 보거나 써 보고 확인하면 확인한 내용과 날짜를 적는다. 고칠 것이 나오면 고치고 해당 행을 다시 채운 뒤 다시 확인받는다. 이 행은 N/A·PASS·blocked·미실행·대기로 채울 수 없다(audit이 거부하고 `close --partial`로도 닫히지 않는다). 에이전트가 스스로 넘기지 않는다. 사용자가 결과를 보지 않고 닫자고 하면 그 말과 날짜를 그대로 적는다(예: `사용자: 확인 없이 닫는다(2026-10-01)`).
4. `pnpm dev-cycle audit`이 통과해야 한다. 실패 항목이 남아 있으면 완료라고 말하지 않는다. audit은 `blocked: 사유`와 `미실행: 사유`를 채운 칸으로 본다. 아직 하지 않은 작업을 그렇게 적어 audit을 넘기지 않는다(`blocked`·`미실행`의 뜻은 `prokit-verify` 원칙을 따른다). 그런 행이 있으면 "부분 완료(blocked N건, 미실행 M건)"로 보고하고, 사용자가 그대로 닫자고 할 때만 `pnpm dev-cycle close --partial`로 닫는다.
5. **마무리 선택**: `.dev-cycle.json`의 `adopt`가 true면(하네스만 설치한 기존 프로젝트) 이 프로젝트에 배포 스크립트가 없으므로 배포 확인과 릴리스를 하지 않는다. 묻지 않고 커밋까지 하고 push는 사용자가 요청할 때만 하며, 대조표 블록 안에 `배포 PASS: adopt(기존 배포 절차)`를 적는다. `projectType`이 `operating`인 Better-T-Stack 프로젝트도 기본 브랜치 push가 기존 CI·배포를 부를 수 있으므로, 정밀 분석 뒤 H Task에서 배포 방법을 `prokit-deploy`에 맞췄다고 `docs/adr/`에 기록하기 전까지는 같게 한다(`배포 PASS: 운영 중(기존 배포 절차)`). 그 밖에는 먼저 배포할 수 있는지 본다. `pnpm vercel:deploy production --check`는 아래 조건과 상관없이 항상 실행한다(push해도 되는지가 여기서 정해진다). 기본 브랜치에 있고, GitHub `origin`이 있고, `gh auth status`가 통과하고, `pnpm vercel:deploy production --check`에서 커밋하지 않은 변경과 릴리스 말고는 모두 통과해야 한다(Vercel 연결 포함). 하나라도 안 되면 묻지 않고 커밋·push까지만 하고, 대조표 블록 안(표 아래)에 `배포 PASS: 준비 안 됨(<항목>)`을 적는다. 모두 되면 한 번 묻는다(Claude Code는 AskUserQuestion). 선택지는 "릴리스하고 production 배포 (기본)"와 "커밋·push만 (배포 PASS)"다. PASS면 `배포 PASS: 사용자 선택`을 적는다. 릴리스하지 않은 변경은 다음 릴리스에 함께 담긴다.
   - `production --check` 출력에 `Git 자동 배포`가 있거나(Vercel 프로젝트의 Git 연결이 push마다 배포를 만든다. 이 기기에서 확인하지 못한 경우 포함) `docs/adr/`에 자동 배포를 켠 기록(`prokit-deploy` 되돌리기 절)이 있으면, 기본 브랜치 push가 곧 production 배포라 검사와 "DB 먼저"를 건너뛴다. 준비 안 됨으로 보고 묻지 않는다. 커밋만 하고 push하지 않으며 `배포 PASS: 준비 안 됨(Git 자동 배포)`을 적는다. 스크립트가 알려 준 대로 연결을 끊거나(`vercel git disconnect --yes`), 이 기기에서 Vercel 연결과 로그인을 해 확인할 수 있게 한 뒤 push하라고 안내한다.
6. 닫기 전에 이 라운드에서 미룬 지적(보류·후속)을 `tasks/todo.md`의 dev-cycle 블록 밖 백로그에 한 줄씩 옮긴다. 닫은 대조표에만 남은 지적은 다시 찾지 않는다. 재발 가능 원인이 확인됐으면 `tasks/lessons.md`, 정본 규칙·eval, 백로그 중 해당 위치에 반영했는지도 확인한다. 그다음 이 라운드의 파일 목록을 적어 둔다: `git diff --name-only <대조표 마커의 base>`와 `git ls-files --others --exclude-standard`. 이어서 `pnpm dev-cycle close`로 대조표와 완료한 일반 할 일·백로그를 함께 보관한다. audit과 실제 사용자 확인 규칙을 모두 지킨 뒤에만 닫을 수 있다. 파일 이름은 KST 날짜와 정규화한 라운드 제목으로 만든 `YYYY-MM-DD-제목.md`이며, 같은 이름이 있으면 `-2`, `-3`을 붙여 기존 기록을 보존한다. 기존 월별 기록은 바꾸지 않는다.
7. **커밋·push**: 6번 목록 가운데 이 라운드에서 바꾼 파일과 `tasks/`만 스테이징해 커밋한다. 커밋 전에 `pnpm dev-cycle secrets`를 실행한다. exit 1이면 커밋·push하지 않는다. 걸린 값을 지우거나 그 파일을 스테이징에서 빼고, 다시 실행해 통과하면 커밋한다. 걸린 파일과 변수 이름만 보고한다(값은 옮겨 적지 않는다). exit 2는 검사를 실행하지 못한 것이다(비밀값 발견 아님). 커밋하지 말고 출력을 보고한다. 라운드와 관계없는 변경은 커밋하지 않고 보고한다. 설치기가 건 pre-commit 훅(`pnpm dev-cycle guard --staged`)이 커밋을 막으면 close가 만든 라운드 기록(`tasks/archive/`)을 함께 스테이징했는지 본다. 훅을 건너뛰는 `--no-verify`는 사용자가 허락할 때만 쓴다. 제목은 Conventional Commits 접두어(`feat:`, `fix:`, `docs:` …)로, 변경 요약은 본문 `- ` 항목으로 쓴다. 릴리스 노트의 절이 여기서 정해지고, 제목에 느낌표를 붙이면(`feat!:`) 깨지는 변경으로 버전을 올린다. 이어서 push한다(5번에서 `Git 자동 배포`가 나왔거나, adopt나 운영 중이라 `배포 PASS: adopt(기존 배포 절차)`·`배포 PASS: 운영 중(기존 배포 절차)`를 적었으면 하지 않는다. 그때 push는 사용자가 요청할 때만 한다). `origin`이 없으면 커밋만 한다.
8. **릴리스와 production 배포** (고른 경우만): `prokit-deploy`의 "배포 순서"를 따른다. `--check`에서 릴리스 항목만 남으면 "릴리스" 절(노트 작성 → 검수 → 버전과 노트를 보여 주고 발행 동의 → `--publish`)로 릴리스하고 다시 `--check`한다. 운영 DB에 적용할 마이그레이션은 목록을 보여 주고 따로 동의를 받는다. 배포한 뒤 `/api/auth/get-session`을 확인한다.
9. 사용자에게 결과, 실행한 검사, 실행하지 못한 검사와 이유, 커밋과 push, 릴리스와 배포 결과(또는 배포 PASS와 이유)를 보고한다. 이 라운드에서 띄운 로컬 DB·개발 서버가 남아 있으면 주소와 중지 명령(`prokit-db`의 `references/migration-flow.md` "로컬 DB")도 알린다.

라운드 끝이 아닐 때 커밋, push, 릴리스, 배포는 사용자가 요청할 때만 한다.

## 6. 진행 계획과 Task
여러 라운드에 걸친 일(기존 프로젝트 도입, 전환, 큰 기능 묶음)은 진행 계획을 세워 Task로 나눈다. 절차의 정본은 [references/project-plan.md](references/project-plan.md), 정밀 분석 점검표는 [references/analysis.md](references/analysis.md)다.
1. 진행 계획 라운드를 `pnpm dev-cycle table A --write --title "<요약>" --plan`으로 연다. 맨 앞에 정밀 분석(기존 프로젝트만), 계획 문서와 Task 표, 계획 리뷰 행이 붙는다. 계획을 고칠 때도 이 명령으로 연다.
2. 기존 프로젝트면 `prokit-analyzer`로 정밀 분석을 하고 `docs/prokit/analysis.md`에 쓴다.
3. 주 두뇌(없으면 기본 AI)가 진행 계획 문서(`docs/plans/`)와 Task 표(`tasks/plan.md`)를 쓰고, `prokit-reviewer(plan)` 리뷰와 사용자 확인을 받는다. 확인은 최종 계획 요약(Task 목록과 지문 `sig=`)을 보여 주고 그 턴을 끝낸 뒤 받는다(`references/project-plan.md` 4).
4. Task마다 `pnpm dev-cycle table <케이스> --write --title "T<n> <요약>" --task T<n>`으로 연다. 맨 앞의 Task 세부 계획 행과 계획 리뷰 행(F는 케이스의 계획 리뷰 행)을 먼저 끝낸 뒤 구현·검수·테스트·보완을 한다. 앞 Task가 끝나지 않으면 다음 Task는 열리지 않는다. 기존 프로젝트는 계획을 확정(진행 계획 라운드를 닫아 `sig=`)하기 전에는 `--task` 없는 라운드도 열리지 않는다. 사용자가 계획 전에 하라고 한, 계획에 없는 일(급한 버그 수정, 템플릿 갱신 반영, 스킬 구성 변경)만 `--no-task`를 붙여 연다. 경로 규칙·하네스 맞추기와 기능 일은 진행 계획의 Task로 한다.
5. `close`가 Task를 `완료`로 기록한다. `pnpm dev-cycle plan`으로 상태와 문제를 본다.
