---
name: prokit-dev-cycle
description: >-
  이 BTS(Better-T-Stack) Next.js + Supabase 프로젝트에서 코드, 스키마, 화면, 설정, 스킬을 바꾸는
  모든 작업의 진입점. 기능 추가, 버그 수정, 리팩터, 화면 변경, API나 DB 변경, 스킬이나 에이전트
  수정 요청을 받으면 구현을 시작하기 전에 이 스킬로 케이스를 판정하고 dev-cycle 대조표를 연다.
  만들어줘, 추가해줘, 고쳐줘, 버그, 바꿔줘, 리팩터, 기능 개발, 작업 시작, 다 됐어, 완료 처리
  같은 요청에 사용한다. 코드를 바꾸지 않는 질문 답변이나 코드 읽기에는 쓰지 않는다.
---

# BTS 개발 사이클

코드를 바꾸는 작업은 모두 **라운드** 하나로 진행한다. 라운드는 `tasks/todo.md`에 붙는 대조표 하나이고, 모든 행의 증거 칸이 채워지고 `pnpm dev-cycle audit`이 통과해야 끝난다.

## 0. 시작
1. `pnpm dev-cycle status`로 진행 중인 라운드가 있는지 본다. 있으면 그 라운드를 이어서 진행한다. 없으면 status가 외부 스킬의 새 버전도 확인한다(원격은 하루에 한 번). `UPDATE_AVAILABLE`, `UPSTREAM_GONE`, `CHECK_FAILED` 줄이 붙어 나오면 라운드를 열기 전에 `prokit-skills-update`의 1절을 따른다.
2. `AGENTS.md`, `GLOSSARY.md`, `docs/domain/project.md`, `tasks/lessons.md`(있으면)를 읽는다.
3. 요청을 한 문장으로 다시 쓰고, 결과를 바꾸는 모호함이 있으면 구현 전에 묻는다.

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
| H | 스킬, 에이전트, dev-cycle 자체 변경 |

- 새 기능 요청은 F, 버그 제보는 C로 선언한다. 애매하면 더 무거운 케이스를 고른다.
- 고치거나 만들어 달라는 요청이면, 이번에는 원인 분석이나 스펙·계획까지만 하라고 해도 라운드를 연다. 분석 결과와 재현 계획은 블록 안 메모나 `tasks/evidence/`에 남기고, 행의 증거 칸은 그 행을 실제로 끝냈을 때만 채운다. 다음 세션이 `pnpm dev-cycle status`로 이어받는다. 코드를 바꾸지 않는 질문이나 설명 요청에만 라운드를 열지 않는다.
- 인증 민감 경로(`packages/auth`, `api/auth`, `services.ts`, `.env.schema` 등)를 건드리면 security 리뷰 행이 자동으로 붙는다.
- 러너는 diff에 인증 민감 경로가 생긴 뒤에야 이 행을 붙인다. 그 전이라도 수정 대상이 인증 경로이거나 로그인, 세션, 권한 문제라면 대조표를 연 직후 `| <다음 번호> | [review] prokit-reviewer(security) → verdict, max_severity, 반영·기각 내역 |  |` 행을 직접 추가한다(번호 칸은 숫자여야 러너가 행으로 읽는다). 수정 전에 원인 분석부터 하는 단계여도 추가하고, 보고에 "수정 라운드에서 security 리뷰가 필요하다"고 적는다.

## 2. 대조표 열기
```bash
pnpm dev-cycle table <케이스> --write --title "<요청 요약>"
```
케이스를 생략하면 diff 판정 결과를 쓴다. 아직 파일을 바꾸기 전이면 판정이 A이므로 요청 기준 케이스를 반드시 적는다. `--write` 없이 실행하면 미리 보기만 한다.

대조표를 연 직후, D·E 또는 서버·DB 버그의 C라면 프로젝트의 테스트 명령과 러너 설정부터 확인한다. 러너가 없으면 3절의 `vitest 도입` 행을 첫 행 앞에 추가하고 처리한 뒤 계약·구현 행으로 간다. 기존 코드가 요청을 이미 충족하거나 사용자가 "구현 행까지만" 요청해도 이 선행 행을 빼거나 검증 단계로 미루지 않는다. 전역에 Bun 같은 실행 파일이 있는 것만으로 프로젝트 테스트 러너가 준비된 것은 아니다. 설치가 실제로 막히면 시도한 명령과 오류를 `blocked: 사유`로 남기고, 이에 의존하는 행을 완료로 채우지 않는다.

## 3. 행 실행
- 위에서부터 순서대로 수행하고, 끝낸 행마다 `tasks/todo.md`의 증거 칸을 채운다. 첫 증거를 적기 전에 `prokit-verify`를 불러 검사 고르기(lint 기준 비교 포함)와 증거 형식을 따른다: 실행한 명령과 결과, 산출물 경로, 사용한 스킬 이름. `✓`, `ok`, `done`만 적는 것은 증거가 아니다. 해당 없는 행은 `N/A: 사유`로 적는다. 표 끝의 `[confirm]` 행은 예외다(5절).
- 계층별 스킬: 화면 동작은 `prokit-web`, 화면 모양과 UX는 `prokit-ui`, API와 인증은 `prokit-api`, DB는 `prokit-db`, 검사와 증거는 `prokit-verify`.
- 문서는 그 계층을 구현하는 행에서 함께 고친다. 새 용어는 `domain-modeling`을 읽고 그 형식(`GLOSSARY-FORMAT.md`)으로 `GLOSSARY.md`에, 새 화면·프로시저·테이블은 `docs/domain/project.md`의 해당 표와 `용어` 칸에 넣는다. 그래야 뒤의 리뷰 행이 문서까지 함께 본다. 표 끝의 `문서 영향 확인` 행에는 고친 내역이나 `N/A: 사유`를 적는다.
- 행 문구에 괄호로 적힌 스킬(프로세스 스킬 `systematic-debugging`, 외부 스킬 `supabase-postgres-best-practices` 등)은 그 행을 할 때 실제로 불러 쓰거나 읽고, 증거 칸에 `사용: systematic-debugging`처럼 이름을 적는다. 외부 스킬은 `.agents/skills/<이름>/SKILL.md`를 읽는다(`AGENTS.md` 계층별 스킬). 계층 스킬의 "공식 스킬 연결" 표에 해당하는 상황이 오면 괄호에 없어도 같다.
- 설계, 계획, 구현, 디버깅, 리뷰, QA, 검증에 쓸 프로세스 스킬은 [references/process-routing.md](references/process-routing.md)의 표를 따른다. 1순위 스킬이 없으면 대안을, 그것도 없으면 표의 대체 절차를 쓰고, 증거 칸에 실제로 쓴 것을 적는다.
- D나 E 행이 있거나 C의 재현 대상이 서버·DB 코드인데 테스트 러너가 아직 없으면, 대조표 첫 행 앞에 `| 0 | vitest 도입(최초 1회) → 설정 파일과 실행 결과 |  |` 행을 직접 추가한다. 이 행은 `package.json`과 `turbo.json`을 고치므로 `prokit-implementer`에 맡기지 않고 코디네이터가 직접 한다. `turbo.json`은 `turborepo` 스킬이 가리키는 설치된 turbo의 번들 문서를 읽고 고친다. 러너 도입은 요청 범위를 넓히는 일이 아니다. 격리 테스트 행을 채울 방법이 이것뿐이라 이 라운드에서 한다. 화면 버그처럼 단위 테스트로 재현하기 어려우면 브라우저로 재현한 흐름과 스크린샷(`prokit-verify`의 `references/browser.md`)을 C의 재현 증거로 적는다.
- 작업 중 다른 계층을 건드리게 되면 `pnpm dev-cycle audit`이 케이스 상향을 알려 준다. 안내대로 `pnpm dev-cycle table <새 케이스> --write --upgrade`를 실행한다. 이미 채운 증거, 직접 추가한 행, 블록 안 메모는 보존된다. 다만 직접 추가한 행과 새 케이스에 없는 이전 행은 `vitest 도입(최초 1회) → 설정 파일과 실행 결과` 행을 제외하고 표 끝의 `[confirm]` 행 바로 앞으로 옮겨지고 번호가 다시 매겨지며, 그 Vitest 행은 첫 행에 남는다.

## 4. 에이전트
- 리뷰 행(`prokit-reviewer(...)`)은 반드시 `prokit-reviewer` 에이전트에 맡긴다. 프롬프트에 focus(`code`, `security`, `db`), 대조표 마커의 base SHA, 검토할 파일 목록, 대조표 경로를 준다. 응답 JSON은 증거 칸에 요약한다. 예: `prokit-reviewer(code): approve, max=low, 지적 2 (반영 1, 기각 1: 재현 안 됨)`. 응답의 `skills_read`에 focus 스킬(`prokit-reviewer` 절차 1)이 빠졌으면 읽고 다시 리뷰하게 한다.
- 지적은 직접 확인한 뒤에만 고친다. high 이상 지적을 고쳤으면 같은 focus로 다시 리뷰한다. 응답이 없거나 JSON이 깨졌으면 `blocked`로 적는다.
- `prokit-reviewer(code)` 행에는 `ponytail-review`로 과설계 목록도 받는다. `prokit-reviewer`에 주는 focus와 범위는 줄이지 않는다(과설계를 ponytail에만 맡기지 않는다). 새 파일은 `git diff`에 나오지 않으니 내용을 함께 넘긴다. 증거 칸은 `prokit-reviewer(code):` 결과로 시작하고 그 뒤에 `ponytail-review: net -12 lines, 반영 2, 기각 1`처럼 덧붙인다. ponytail이 없으면 `ponytail-review: 없음`으로 적는다.
- 설계·계획·구현·리뷰에 ponytail을 쓴다. 구간별 방법(스펙의 "만들지 않는 것" 절, 리뷰가 있는 곳마다 `ponytail-review`)은 규칙 6에 있다. 구현은 ponytail 모드로 한다(Claude는 플러그인 훅이 켠다. Codex·Antigravity·Grok Build는 구현 전에 `ponytail` 스킬을 읽고, 위임할 때 `prokit-implementer`에도 읽게 한다). ponytail 규칙보다 이 스킬, `AGENTS.md`, 대조표가 우선한다. vitest 도입 행, 격리 테스트, 구현 전 질문은 줄이지 않는다. 기준은 [references/process-routing.md](references/process-routing.md) 규칙 6.
- 구현을 위임할 때는 `prokit-implementer`에 정확한 파일 목록, 읽을 `prokit-*` 스킬, 완료 조건을 준다. 병렬로 위임할 때는 파일이 겹치지 않게 나눈다. `AGENTS.md`, `.dev-cycle.json`, `package.json`, 루트 설정은 직접 고친다.
- impeccable `critique`처럼 서브에이전트를 스스로 띄우는 스킬은 메인 세션에서 실행한다.

## 5. 종료
라운드는 사용자 확인 → audit·close → 커밋·push → (사용자가 고르면) 릴리스와 production 배포 순서로 마무리한다. `[confirm]`과 audit은 건너뛰지 않는다.

1. 지원되는 OMC나 OMX 모드를 실제로 썼다면 여기서 취소한다. 모드가 보고한 완료는 증거가 아니고, 모드가 켜져 있으면 사용자 답을 기다리지 못한다.
2. superpowers `verification-before-completion`을 불러(없으면 `prokit-verify` 원칙만) `pnpm dev-cycle audit`으로 남은 문제가 표 끝의 `[confirm]` 행뿐인지 본다. 다른 행이 남았거나 케이스 상향이 나오면 먼저 끝낸다. 사용자가 확인할 것은 마지막 결과다.
3. **사용자 확인** (`[confirm]` 행): 결과를 보여 주고(화면이면 주소와 스크린샷, 기능이면 써 볼 순서) 사용자의 답을 기다린다. 화면이 있으면 개발 서버를 백그라운드로 띄워 주소가 응답하는지 확인한 뒤 요청하고, 사용자가 답할 때까지 끄지 않는다. 테스트 순서(F는 스펙의 테스트 시나리오)와 알려진 문제(남은 오류, 미룬 지적)를 함께 준다. 사용자가 직접 보거나 써 보고 확인하면 확인한 내용과 날짜를 적는다. 고칠 것이 나오면 고치고 해당 행을 다시 채운 뒤 다시 확인받는다. 이 행은 N/A·PASS·blocked·미실행·대기로 채울 수 없다(audit이 거부하고 `close --partial`로도 닫히지 않는다). 에이전트가 스스로 넘기지 않는다. 사용자가 결과를 보지 않고 닫자고 하면 그 말과 날짜를 그대로 적는다(예: `사용자: 확인 없이 닫는다(2026-10-01)`).
4. `pnpm dev-cycle audit`이 통과해야 한다. 실패 항목이 남아 있으면 완료라고 말하지 않는다. audit은 `blocked: 사유`와 `미실행: 사유`를 채운 칸으로 본다. 아직 하지 않은 작업을 그렇게 적어 audit을 넘기지 않는다(`blocked`·`미실행`의 뜻은 `prokit-verify` 원칙을 따른다). 그런 행이 있으면 "부분 완료(blocked N건, 미실행 M건)"로 보고하고, 사용자가 그대로 닫자고 할 때만 `pnpm dev-cycle close --partial`로 닫는다.
5. **마무리 선택**: 먼저 배포할 수 있는지 본다. `pnpm vercel:deploy production --check`는 아래 조건과 상관없이 항상 실행한다(push해도 되는지가 여기서 정해진다). 기본 브랜치에 있고, GitHub `origin`이 있고, `gh auth status`가 통과하고, `pnpm vercel:deploy production --check`에서 커밋하지 않은 변경과 릴리스 말고는 모두 통과해야 한다(Vercel 연결 포함). 하나라도 안 되면 묻지 않고 커밋·push까지만 하고, 대조표 블록 안(표 아래)에 `배포 PASS: 준비 안 됨(<항목>)`을 적는다. 모두 되면 한 번 묻는다(Claude Code는 AskUserQuestion). 선택지는 "릴리스하고 production 배포 (기본)"와 "커밋·push만 (배포 PASS)"다. PASS면 `배포 PASS: 사용자 선택`을 적는다. 릴리스하지 않은 변경은 다음 릴리스에 함께 담긴다.
   - `production --check` 출력에 `Git 자동 배포`가 있거나(Vercel 프로젝트의 Git 연결이 push마다 배포를 만든다. 이 기기에서 확인하지 못한 경우 포함) `docs/adr/`에 자동 배포를 켠 기록(`prokit-deploy` 되돌리기 절)이 있으면, 기본 브랜치 push가 곧 production 배포라 검사와 "DB 먼저"를 건너뛴다. 준비 안 됨으로 보고 묻지 않는다. 커밋만 하고 push하지 않으며 `배포 PASS: 준비 안 됨(Git 자동 배포)`을 적는다. 스크립트가 알려 준 대로 연결을 끊거나(`vercel git disconnect --yes`), 이 기기에서 Vercel 연결과 로그인을 해 확인할 수 있게 한 뒤 push하라고 안내한다.
6. 닫기 전에 이 라운드에서 미룬 지적(보류·후속)을 `tasks/todo.md`의 dev-cycle 블록 밖 백로그에 한 줄씩 옮긴다. 닫은 대조표에만 남은 지적은 다시 찾지 않는다. 그다음 이 라운드의 파일 목록을 적어 둔다: `git diff --name-only <대조표 마커의 base>`와 `git ls-files --others --exclude-standard`. 이어서 `pnpm dev-cycle close`로 대조표를 `tasks/archive/`로 옮긴다.
7. **커밋·push**: 6번 목록 가운데 이 라운드에서 바꾼 파일과 `tasks/`만 스테이징해 커밋한다. 커밋 전에 `pnpm dev-cycle secrets`를 실행한다. exit 1이면 커밋·push하지 않는다. 걸린 값을 지우거나 그 파일을 스테이징에서 빼고, 다시 실행해 통과하면 커밋한다. 걸린 파일과 변수 이름만 보고한다(값은 옮겨 적지 않는다). exit 2는 검사를 실행하지 못한 것이다(비밀값 발견 아님). 커밋하지 말고 출력을 보고한다. 라운드와 관계없는 변경은 커밋하지 않고 보고한다. 제목은 Conventional Commits 접두어(`feat:`, `fix:`, `docs:` …)로, 변경 요약은 본문 `- ` 항목으로 쓴다. 릴리스 노트의 절이 여기서 정해지고, 제목에 느낌표를 붙이면(`feat!:`) 깨지는 변경으로 버전을 올린다. 이어서 push한다(5번에서 `Git 자동 배포`가 나왔으면 하지 않는다). `origin`이 없으면 커밋만 한다.
8. **릴리스와 production 배포** (고른 경우만): `prokit-deploy`의 "배포 순서"를 따른다. `--check`에서 릴리스 항목만 남으면 "릴리스" 절(노트 작성 → 검수 → 버전과 노트를 보여 주고 발행 동의 → `--publish`)로 릴리스하고 다시 `--check`한다. 운영 DB에 적용할 마이그레이션은 목록을 보여 주고 따로 동의를 받는다. 배포한 뒤 `/api/auth/get-session`을 확인한다.
9. 사용자에게 결과, 실행한 검사, 실행하지 못한 검사와 이유, 커밋과 push, 릴리스와 배포 결과(또는 배포 PASS와 이유)를 보고한다.

라운드 끝이 아닐 때 커밋, push, 릴리스, 배포는 사용자가 요청할 때만 한다.
