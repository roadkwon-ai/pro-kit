# 프로세스 스킬 라우팅

이 표는 사용자가 출처를 고르지 않았을 때의 기본 라우팅이다. 선택은 사용자 명시 출처, 프로젝트 정본, 실제 접근 가능한 외부 제공자, 표의 검증한 기본 순서로 한다. 대조표 증거 칸에는 실제로 쓴 제공자와 대안을 적는다.

## 두뇌와 과설계 방지 스킬
- 이 프로젝트의 두뇌(요구 정리, 계획, 구현 진행, 디버깅을 주도하는 스킬 묶음)는 `.dev-cycle.json`의 `brain`, 과설계 방지 스킬은 `simplicity`다. 과설계 방지 스킬은 하나만 쓴다. 두뇌는 하나(문자열)나 여럿(배열. 첫 값이 주 두뇌)이다. `none`이면 지금 세션의 에이전트가 아래 표의 기본 칸과 규칙 6으로 그 역할을 맡는다.
- 두뇌를 골랐으면 [brains/](brains/)의 `<이름>.md`가 그 두뇌가 맡는 단계의 방법을 바꾼다. 두뇌가 여럿이면 단계마다 [brains/README.md](brains/README.md) "단계 표"에서 목록 순서로 그 단계를 맡는 첫 두뇌를 쓴다. 맡는 두뇌가 없는 단계는 설치된 추가 스킬, 없으면 기본 칸이다. 추가 스킬이 두뇌와 같은 단계를 맡으면 두뇌의 스킬을 먼저 쓴다. 카탈로그, 선택지 설명, 추천 기준, 바꾸는 법은 [brains/README.md](brains/README.md)다.
- 두뇌 에이전트 규칙: 두뇌 파일의 "에이전트" 절에서 직접 부르는 에이전트는 읽기 전용 보완 검토나 메모로만 쓴다. 부르기 전에 [delegation.md](delegation.md)의 provider 검증을 거치고, 프롬프트에 "파일을 쓰지 않는다"를 넣고, 전후에 `pnpm dev-cycle delegation capture`·`diff`를 `--scope` 없이 한다. 도구 제한이 없는 에이전트는 diff로 쓰기가 없음을 확인한 경우만 결과를 받고, 쓴 것이 있으면 결과를 버리고 `blocked`로 남긴다. 결과는 `prokit-reviewer` 최종 게이트의 입력이지 대체가 아니다. 구현 프롬프트 틀(superpowers `implementer-prompt.md` 등)은 `prokit-implementer` 위임 지시에 넣는 입력이다. 구현은 `prokit-implementer`가 하고, oh-my의 `team` 예외는 그 두뇌 파일을 따른다. 이름은 접두어를 붙여 적는다(예: `agent-skills:security-auditor`).
- 구성은 언제든 바꿀 수 있다(라운드 중이어도 된다. `prokit-skills-manage`). 바꾼 직후에는 `.dev-cycle.json`과 `pnpm skills:check`가 정본이다. Claude Code가 `/reload-plugins`로 다시 불러오기 전까지 세션에 남은 이전 스킬 목록과 이전 두뇌·과설계 방지 스킬의 훅 주입(`using-superpowers`, `<session-restore>`, ponytail 모드 등)은 따르지 않는다.
- 고르지 않은 두뇌와 과설계 방지 스킬은 쓰지 않는다. 전역 설치본이나 플러그인이 보이거나 세션 시작 훅이 그 스킬을 먼저 쓰라고 해도 같다. `pnpm skills:check`가 이 프로젝트에 남은 고르지 않은 설치본을 충돌로 알린다.
- 용어, 도메인 규칙, 되돌리기 어려운 설계 결정은 두뇌와 상관없이 `grilling` 형식(묶음별 질문과 추천 답)으로 묻고 `domain-modeling` 형식으로 `GLOSSARY.md`·`docs/adr/`에 적는다. 사용자는 `/grill-with-docs`로 직접 시작할 수 있다.

| 단계 | 기본(두뇌 없음, 기본 AI) | 산출물 |
|---|---|---|
| 요구 명확화 | 요청을 한 문장으로 다시 쓰고 결과를 바꾸는 모호함만 묻는다. Claude Code는 AskUserQuestion으로 한 번에 1~4개, 다른 도구는 대화로 묻는다. 묻는 형식은 `grilling`이다. 간결성 사다리(규칙 6)로 범위를 줄이고 새 용어는 `domain-modeling` 형식으로 바로 적는다 | `docs/specs/YYYY-MM-DD-<주제>.md`(목표, 만들지 않는 것, 인수 조건, 테스트 시나리오) |
| 계획 | 파일별 단계, 위임 단위(파일이 겹치지 않게), 단계별 검사를 쓴다. 재사용·설정 결정은 [reuse-design.md](reuse-design.md)를 따른다. Claude Code는 plan mode를 쓸 수 있다. 필수 계획 리뷰는 `prokit-reviewer(plan)`이다 | `docs/plans/YYYY-MM-DD-<주제>.md` |
| 구현 | 네이티브 서브에이전트 `prokit-implementer`에 대조표 행 단위로 위임한다. 위임 지시에 그 단계의 두뇌 스킬(위 두뇌 파일의 구현 칸)을 적는다. 테스트가 있으면 먼저 쓰고 실패를 확인한 뒤 구현한다. 검증한 수행자가 없으면 `blocked`로 남기고 Main이 직접 구현하지 않는다 | 위임 packet, snapshot diff |
| 디버깅 (C) | 재현(실패하는 테스트나 브라우저 재현) → 가설을 하나씩 확인 → 근본 원인 수정 → 회귀 테스트. 같은 가설로 세 번 실패하면 멈추고 보고한다 | 재현 테스트 이름, 원인 한 줄 |
| 리뷰 | **`prokit-reviewer` 계약 게이트(필수)** + 규칙 6 역할 표의 구현 diff 보완 검토. provider 내장 review coverage를 재사용하고 빈 계약만 보완한다 | 리뷰 행 증거 |
| QA | `ego-browser`로 스펙의 테스트 시나리오 전부 확인(F, 보고만. 발견은 다음 행에서 고치고 다시 확인한다. 절차는 `prokit-verify`의 `references/browser.md`). ego-browser가 없으면 `agent-browser`로 같은 흐름을 확인하고 대안으로 적는다 | 시나리오별 결과 |
| 검증 | `prokit-verify` | 검사 결과 |
| 마무리 | `prokit-dev-cycle` 5절(사용자 확인 → audit·close → 커밋·push<!-- edition:pro --> → 고르면 릴리스·production 배포<!-- /edition -->) | audit 출력 |

설치된 mattpocock 추가 스킬은 해당 단계의 방법으로 쓴다(`pnpm skills:check`의 `mattpocock 추가` 줄). 요구 명확화는 `to-questionnaire`(결정권자가 따로 있을 때), 계획은 `codebase-design`·`prototype`·`research`, 구현은 `tdd`, 디버깅은 `diagnosing-bugs`, 리뷰 추가 관점은 `code-review`, F 공통화는 `improve-codebase-architecture`, 사람이 할 외부 설정은 `wizard`, H(규칙·스킬 수정)는 `writing-for-agents`, 마무리는 `pr`·`handoff`, 설명은 `teach`·`wait-what`이다. 사용자 호출 스킬(`/to-questionnaire` 등)은 에이전트가 대신 실행하지 않고 사용자에게 명령을 제안한다. 증거 칸에는 `사용: <두뇌 파일에 백틱으로 적힌 이름>`, `사용: <스킬>(추가 스킬)`, `사용: 내장(<단계>): <사유>` 중 하나로 적는다(예: `사용: tdd(추가 스킬) → …`, `사용: 내장(요구 명확화): 두뇌에 없는 단계 → docs/specs/…`). 두뇌를 골랐으면 두뇌 파일 단계 표가 맡는 단계(요구 명확화·계획·구현·디버깅)는 작은 변경이어도 그 스킬로 한다. 행을 시작하기 전에 그 스킬을 Skill 도구로 부르고(Codex 등은 `SKILL.md`를 읽는다) 스킬 안에서 짧게 진행하며, 쓸 수 없으면 `blocked: 사유`다. audit은 맡는 단계의 내장을 거부한다. 내장은 두뇌가 맡지 않는 단계에만 사유와 함께 쓰고, 사유에 그 두뇌의 스킬 이름이 있으면 거부한다(그 방법을 썼으면 `사용: <이름>`이다). `pnpm dev-cycle status`의 다음 행 안내와 `table --write` 출력이 단계 행마다 부를 스킬을 보여 준다, 두뇌가 `none`이면 `사용: 내장(<단계>)`로 충분하지만 사유를 적어도 좋다. audit은 단계 행(`요구 명확화 단계`·`계획 단계`·`구현 단계`·`디버깅 단계`·`고른 두뇌의 계획 방법`)의 증거에서 이름이 맞는지 본다. Claude Code는 훅이 부른 스킬을 `.prokit/skills-used.jsonl`에 기록해 audit이 이 라운드에서 실제로 불렀는지도 대조하고, 기록이 없는 도구는 이름만 보는 자기 신고다.

## 설치 위치
- 프로젝트 scope(설치기와 `pnpm skills:setup`이 설치): skill-creator(Claude 플러그인, Codex는 `.agents/skills`), 공식 도메인 스킬, mattpocock `domain-modeling`·`grilling`·`grill-with-docs`. 두뇌와 과설계 방지 스킬은 고른 것만 설치한다(`pnpm skills:setup --brain <이름|none> --simplicity <이름|none>`). 추가 스킬은 `--matt <스킬>`, 응답 방식 i-have-adhd는 `--optional i-have-adhd`로 설치한다.
- 전역: ego-browser, agent-browser CLI, Vercel CLI(배포<!-- edition:pro -->, `prokit-deploy`<!-- /edition -->). 두뇌 gstack(Claude `~/.claude/skills/gstack`, Codex `~/.codex/skills/gstack`)과 OMX CLI는 그 두뇌를 고를 때만 설치한다. ponytail을 고르고 `--with-global`이면 지원할 때만 Ponytail 원본 GitHub marketplace와 Codex 네이티브 ponytail 플러그인을 설치한다. CLI가 없거나 명령을 지원하지 않으면 프로젝트 스킬로 계속하고, 실제 설치 명령이 실패하면 exit 2로 멈춘다. agent-browser CLI는 없거나 npm 최신판보다 낮으면 `--with-global` 없이도 최신판을 설치한다.
- 이 기기 전역에 켜진 고르지 않은 플러그인과 gstack 개인 스킬은 `pnpm skills:setup`이 `.claude/settings.local.json`(커밋하지 않는 개인 설정)으로 이 프로젝트에서만 끈다. 전역 `~/.claude/CLAUDE.md` 블록과 Codex 전역 스킬은 끌 수 없어 경고만 한다.
- 표의 스킬이 보이지 않으면 `pnpm skills:check`로 무엇이 빠졌는지 확인한다. 설치와 선택 변경은 사용자가 요청할 때 H 라운드에서 한다.

## 도구별 이름
- Claude Code: 플러그인 스킬은 `<플러그인>:<이름>`(예: `ponytail:ponytail-review`), skills CLI로 설치한 스킬은 이름 그대로 부른다. 고른 두뇌의 이름은 `brains/<이름>.md`를 따른다. Skill 도구가 사용자 호출 전용(`disable-model-invocation`)이라 거부하면 그 플러그인 설치본(`claude plugin list --json`의 `installPath`)의 `skills/<이름>/SKILL.md`를 Read로 읽어 따른다. 정해진 방법이고 우회가 아니다(pstack 대부분, OMC·Compound Engineering 일부).
- Codex: 스킬은 해당 `SKILL.md`를 읽어 적용한다(Skill 도구를 요구하지 않는다). 이름은 `.agents/skills`의 `<이름>` 그대로다.
- Antigravity·Grok Build: Codex처럼 스킬은 해당 `SKILL.md`를 읽어 적용하고, `.agents/skills`의 `<이름>` 그대로다. Claude Code 플러그인으로만 설치되는 두뇌(pstack)와 Claude Code용 전역 설치본(OMC, gstack)은 쓰지 않고 기본 칸으로 진행한다. Grok Build는 Claude 호환이 기본으로 켜져 있어 전역 OMC·gstack이 보일 수 있지만 고르지 않는다. 네이티브 `prokit-implementer`가 없으면 검증한 대안 수행자를 찾고, 없으면 `blocked`로 남긴다. 서브에이전트는 Antigravity가 `.agents/agents`(`pnpm agents:sync`가 만든다), Grok Build가 `.claude/agents`를 읽는다. 사용자가 고를 것은 대화로 묻는다.

## Provider와 리뷰 연결

provider 선택·검증·packet 필드는 [delegation.md](delegation.md)가 정본이다. 두뇌의 구현 스킬과 Impeccable이 남긴 리뷰 coverage는 재사용하고, 누락한 전문 계약만 보완한다. provider에 내장 리뷰 coverage가 없을 때만 `specialist-reviewer`를 부른다. `prokit-reviewer`는 실제 계약, evidence hash, 통합 수용 여부를 보고하며 같은 전체 코드 리뷰를 되풀이하지 않되 fresh final gate는 항상 수행한다. provider가 없거나 증거가 부족하면 필요한 근거를 최대 두 번 요청한 뒤 `blocked`, `parked`, `degraded` 중 실제 상태를 보고한다.

## 규칙
1. 대조표의 리뷰 행 증거는 `prokit-reviewer`만 채울 수 있다. 과설계 방지 스킬의 검토(`ponytail-review`, `caveman-review`), 두뇌의 리뷰 스킬, Claude Code 내장 `/code-review`, 추가 스킬 `code-review`는 추가 관점이다.
2. 두뇌의 실행 모드(OMC `ralph`, OMX `team` 등)는 실행 수단이다. 모드의 완료 보고는 증거가 아니며, 완료 판정은 `pnpm dev-cycle audit`만 한다. 모드가 커밋, push, 배포를 하게 두지 않고, 라운드를 닫을 때 모드를 취소한다.
3. 두뇌의 스킬 가운데 코드를 고치거나 커밋·배포하는 것(gstack `qa`, `ship` 등)은 사용자가 요청할 때만 쓴다. 두뇌 스킬 안의 단계도 같다. 스스로 커밋·브랜치·worktree·PR을 만들기, 리뷰하면서 코드를 바로 고치기(자동 수정), 이 세션이 직접 구현하는 선택지, 사용자에게 묻지 않고 진행하라는 지시, 코드를 외부 모델로 보내는 교차 검토는 두뇌 파일에 적혀 있지 않아도 건너뛴다. 스킬이 정한 산출물 경로는 써도 되고, 대조표 증거에 그 경로를 적는다. 배포는 <!-- edition:pro -->`prokit-deploy` 절차(`pnpm vercel:deploy`)로 하고 <!-- /edition -->두뇌의 배포·출시 명령으로 하지 않는다.
4. 두뇌의 구현 스킬이 끝에서 브랜치 마무리(병합·push·PR 선택지)를 부르더라도 라운드 끝이 아니다. 그 선택지를 따르지 않고 대조표의 다음 행으로 간다.
5. 전역 스킬이 없어도 프로젝트·로컬·플러그인·리소스 제공자를 실제로 검증해 쓴다. 검증한 수행자가 없으면 해당 행은 `blocked`이며 Main이 대신 구현하지 않는다.
6. 간결성. 아래 하네스 규칙은 무엇을 골라도 지킨다. 과설계 방지 스킬이 없다는 이유로 리뷰 행을 `blocked`로 두지 않는다.
   - 설계: 스펙의 범위와 구조를 정할 때마다 사다리(지금 필요한가 → 이미 코드에 있는가 → 표준 라이브러리 → 플랫폼 기능 → 설치된 의존성 → 새 코드)를 먼저 적용한다. 스펙에 "만들지 않는 것" 절을 두고, 뺀 것과 다시 넣을 조건을 한 줄씩 적는다. 보안, 입력 검증, 접근성, 사용자가 요청한 것은 빼지 않는다.
   - 계획: [reuse-design.md](reuse-design.md)에 따라 기존 경로·소비자, 소유 위치, 환경 변수·설정 영향과 회귀 검사를 남긴다. 사다리를 적용한 계획은 `prokit-reviewer(plan)`이 아래 역할 표의 계획 기준으로 검토한다. 두뇌의 계획 리뷰가 없어도 수행하며, 지적은 계획 문서를 고쳐 반영하거나 근거로 기각한 뒤 구현한다. 코드 diff용 보완 검토에 계획 리뷰 역할을 대신 맡기지 않는다.
   - 구현: 가장 짧게 동작하는 해법을 고른다. 실제 코드와 호출자·테스트·설정·export를 읽어 범위를 확인하고, 코드 지도는 참고로만 쓴다.
   - 고른 과설계 방지 스킬의 규칙이 `AGENTS.md`, `prokit-*`, 대조표와 부딪히면 뒤의 것이 우선한다. 대조표 행(vitest 도입, 격리 테스트 등), 구현 전 질문, 보고 형식은 줄이지 않는다. 보안 검사, 입력 검증, 데이터 손실을 막는 오류 처리도 줄이지 않는다.
   - 일부러 한계를 둔 단순화는 `shortcut:` 주석에 한계와 넘으면 할 일을 적는다. 기존 `ponytail:` 주석은 무엇을 골랐든 보존한다.
   - 리뷰: provider가 낸 전문 review coverage는 재사용한다. 역할 표의 구현 diff 보완 검토는 그 coverage에 없는 구현 diff 계약에만 쓴다. 두뇌 구현 스킬의 태스크 리뷰(태스크마다 provider coverage의 빈 계약만)와 F의 공통화·리팩토링 행도 같다. 메인 세션 맥락을 아끼려면 리뷰 서브에이전트가 읽게 하고 결과 줄만 받는다. 라운드 중에는 커밋하지 않으므로 태스크 리뷰 패키지는 태스크 시작 전 작업 트리 스냅샷(임시 인덱스로 만든 `git write-tree`)과의 diff로 만든다. 태스크별 결과는 두뇌의 원장에, 요약은 구현 방식 행에 `<검토>(태스크): 반영 a, 기각 b`로 적는다.
   - 공통화: F의 공통화·리팩토링 행의 범위는 이번 라운드가 바꾼 파일과 같은 디렉터리 및 계획에서 확인한 공통 모듈의 소비자다. 반복의 한쪽이 이번 diff이고 같은 책임으로 함께 바뀔 때만 뽑고, 나머지는 백로그로 보낸다.
   - 보완 검토는 정확성·안전·부하·테스트·성능·간결성 순으로 보고 고치지 않는다. branch·parser·보안 변경은 작은 회귀 검사를 남긴다. 생략하면 이유와 위험을 보고한다. 기준 SHA를 스스로 잡지 못하는 검토에는 `git diff <대조표 마커의 base>` 출력과 새 파일(`git ls-files --others --exclude-standard`, diff에 나오지 않는다)의 내용을 함께 준다.
   - 보완 검토는 `prokit-reviewer`의 계약 게이트를 대신하지 않는다. `prokit-reviewer(code)`에는 focus와 범위를 그대로 주되 provider가 이미 검증한 전문 review를 반복하지 않고, 실제 계약·evidence hash·통합 수용 여부를 본다.
   - 지적 처리: 지적마다 리뷰가 든 구체 사례를 실제 코드에서 다시 확인하고, 재현되지 않으면 근거를 적어 기각한다. 확인한 지적은 종류에 따라 처리한다.
     - 정확성·보안·데이터 손실·예상 부하 지적은 동작을 바꾸는 수정이다. 실패하는 회귀 테스트를 먼저 더한 뒤 이 라운드에서 고친다. 이번 변경이 깨뜨린 호출자는 diff 밖이어도 이 라운드에서 고친다.
     - 테스트 누락 지적(위험한 새 로직인데 깨지면 실패하는 테스트가 없음)은 이번 diff의 로직이면 그 테스트 하나를 더해 반영한다.
     - 이번 라운드가 만들지 않은 기존 문제는 고치지 않고 `tasks/todo.md` 백로그로 보낸다. 보안 문제면 라운드 보고에도 적는다.
     - 속도 지적은 측정한 근거(빌드 출력, 프로파일, 시간 측정)가 있을 때만 고친다. 근거가 없으면 백로그로 보낸다.
     - 간결성 지적(delete·reuse·stdlib·yagni·merge·split)은 이번 라운드 diff 안(F의 공통화 행은 위 범위 안)에서 동작이 같음을 확인한 것만 반영한다. 잘 돌던 기존 코드를 고칠 근거로 쓰지 않는다.
   - 결과는 `prokit-reviewer(code)` 행 증거에서 coverage 뒤에 보완 결과를 덧붙인다. 예: `ponytail-review: 반영 2(Must fix 1), 기각 1, 백로그 1`, `caveman-review: 반영 1`, `간결성(karpathy 기준, prokit-reviewer focus): 반영 1`, `간결성(내장, prokit-reviewer focus): 지적 없음`.

### 과설계 방지 역할 표
지금 ponytail이 맡던 역할을 고른 스킬이 대신한다. 첫 줄의 하네스 규칙은 무엇을 골라도 지킨다.

| 역할 | ponytail | caveman | karpathy | none(기본 AI) |
|---|---|---|---|---|
| 늘 지키는 간결성(사다리, "만들지 않는 것", `shortcut:` 주석, 공통화 범위, 지적 처리) | 하네스 규칙 + ponytail 모드(플러그인 훅으로 늘 켜짐) | 하네스 규칙 + 일에 맞는 작업 스킬(새 기능 `lean-build`, 버그·작은 변경 `surgical-patch`) | 하네스 규칙 + `karpathy-guidelines`(코드 작업 때 모델이 부른다) | 하네스 규칙 |
| 계획 간결성 기준(`prokit-reviewer(plan)`이 읽는다) | `ponytail` | `lean-build`(C는 `surgical-patch`) | `karpathy-guidelines` | 하네스 사다리 |
| 구현 diff 보완 검토(`prokit-reviewer(code)` 게이트는 따로 늘 한다) | `ponytail-review` | `caveman-review`(지적은 `lean-build`·`surgical-patch` 기준) | `prokit-reviewer(code)` focus에 간결성(리뷰어가 `karpathy-guidelines`를 읽고 단순함·정밀 수정 원칙으로 본다) | `prokit-reviewer(code)` focus에 간결성(delete·reuse·stdlib·yagni) |
| F 공통화·리팩토링 행 | `ponytail-review`(이번 diff와 공통 모듈 소비자) | `safe-refactor` | `prokit-reviewer(code)` + karpathy 정밀 수정 원칙 | 하네스 공통화 범위 + `prokit-reviewer(code)` |
| 읽기 전용 보조(요청할 때만) | `ponytail-audit`·`ponytail-debt`·`ponytail-help`·`ponytail-gain` | 없음 | 없음 | 없음 |

- 응답 압축 `caveman`과 i-have-adhd는 대화 응답에만 쓴다. 사용자가 `/caveman`·`/i-have-adhd`로 켤 때만 쓰고 에이전트가 스스로 켜지 않는다. 파일(문서, 커밋 메시지, 대조표 증거, 보고서), 사용자에게 묻는 질문, 보안·데이터 손실 경고, 라운드 보고 형식은 줄이지 않는다.

#### ponytail을 골랐을 때
- Claude는 플러그인 훅이 세션과 서브에이전트에 켠다. Codex 네이티브 플러그인은 trusted 프로젝트에서 `/hooks`로 허용한 뒤 새 세션부터 확인한다. Antigravity·Grok Build는 `.agents/skills`의 `<이름>` 그대로 읽는다.
- Codex는 사용 가능한 네이티브 `$ponytail:ponytail-review`를 먼저 쓰고, 없을 때만 프로젝트 `ponytail-review/SKILL.md`를 읽는다. 둘을 같은 diff에 함께 쓰지 않으며, 사용자가 ponytail을 `off`로 두면 fallback으로 다시 켜지 않는다.
- `ponytail-review` 지적의 등급은 설치판의 분류(5.x는 Must fix·Should fix·Nice to have)를 그대로 쓰고, 반영 여부는 위 지적 처리를 따른다. Claude는 Skill 도구나 `/ponytail-review`로 한 번만 부르고, 둘 다 일회성이라 세션을 영구 review 모드로 바꾸지 않는다.
- `ponytail-audit`·`ponytail-debt`·`ponytail-help`·`ponytail-gain`은 요청 시 읽기 전용 보조 기능이며 매 라운드 의무화하거나 장부·백로그를 자동으로 고치지 않는다. 기존 `ponytail:` 주석은 필요할 때 `ponytail-debt`로 모은다. `gain`은 upstream benchmark라 프로젝트 절감값으로 보고하지 않는다.

#### caveman을 골랐을 때
- 다섯 스킬 모두 skills CLI 설치본이다. 작업 스킬과 `caveman-review`는 일이 맞으면 모델이 부르고, Codex·Antigravity·Grok Build는 `SKILL.md`를 읽는다.
- `lean-build`가 말하는 "Native Core"는 설치하지 않는다(caveman CLI 전용). 그 자리는 위 하네스 규칙이 맡는다.
- `caveman-review` 지적은 한 줄 형식이고 반영 여부는 위 지적 처리를 따른다. `safe-refactor`는 F 공통화 행에서 동작을 지키며 구조를 정리할 때 쓰고, 범위는 위 공통화를 따른다.

#### karpathy를 골랐을 때
- `karpathy-guidelines`의 "모호하면 멈추고 묻기"는 결과를 바꾸는 모호함에만 적용한다. "불가능한 상황의 예외 처리 생략"은 신뢰 경계의 입력 검증과 데이터 손실을 막는 오류 처리에 적용하지 않는다.
- diff 검토 스킬이 없으므로 `prokit-reviewer(code)` focus에 단순함·정밀 수정 원칙을 넣는다.

#### 과설계 방지 스킬이 없을 때(none)
- 하네스 규칙으로 진행하고, 구현 diff 보완 검토는 `prokit-reviewer(code)` focus에 간결성(delete·reuse·stdlib·yagni)을 넣는다.
