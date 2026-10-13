# 프로세스 스킬 라우팅

이 표는 사용자가 출처를 고르지 않았을 때의 기본 라우팅이다. 선택은 사용자 명시 출처, 프로젝트 정본, 실제 접근 가능한 외부 제공자, 표의 검증한 기본 대안 순서로 한다. 대조표 증거 칸에는 실제로 쓴 제공자와 대안을 적는다.

| 단계 | 1순위 (Claude·Codex 같은 이름) | 보강 | Claude 대안 | Codex 대안 | 스킬이 없을 때 |
|---|---|---|---|---|---|
| 요구 명확화 | superpowers `brainstorming` | ponytail 사다리로 범위 줄이기(규칙 6), `domain-modeling`(새 용어를 `GLOSSARY.md`에 바로 기록), `/grill-with-docs` (사용자가 호출, 용어와 ADR을 함께 기록) | OMC `deep-interview` | OMX `deep-interview` | 질문 목록을 만들어 사용자 확인을 받는다 |
| 계획 | superpowers `writing-plans` | 재사용·설정 결정(아래 참조), 필수 계획 리뷰 `prokit-reviewer(plan)`. gstack `plan-eng-review`·`plan-design-review`는 있을 때 보강 | OMC `plan`, `ralplan` | OMX `plan`, `ralplan` | Main은 계획 표를 관리하고, 검증한 계획 수행자가 파일별 단계와 검사를 쓴다. 없으면 `blocked` |
| 구현 | superpowers `subagent-driven-development`(`prokit-implementer` 사용) + `test-driven-development` | ponytail 모드(규칙 6) | OMC `team`, `ralph` (대규모 병렬) | Codex 네이티브 `prokit-implementer`, OMX `team`(tmux 런타임이 있을 때만) | 검증한 대안 수행자에게 대조표 행 순서대로 맡긴다. 없으면 `blocked`로 남기고 Main이 직접 구현하지 않는다 |
| 디버깅 (C) | superpowers `systematic-debugging` | gstack `investigate` | OMC `debug` | `gstack-investigate` | 검증한 디버깅 수행자가 재현 테스트 → 가설 → 수정을 맡긴다. 없으면 `blocked` |
| 리뷰 | **`prokit-reviewer` 계약 게이트(필수)** + 지적 처리는 superpowers `receiving-code-review`(ponytail 지적의 반영 기준은 규칙 6의 지적 처리) | provider 내장 review coverage를 재사용하고, 비어 있는 계약에만 `ponytail-review`를 보강한다. 추가 관점(증거 대체 불가): F 병합 전 gstack `review`, Claude Code 내장 `/code-review`, OMX `code-review` | 없음 | 없음 | 검증한 `prokit-reviewer`가 없으면 `blocked` |
| QA | `ego-browser`로 스펙의 테스트 시나리오 전부 확인 (F, 보고만. 발견은 다음 행에서 고치고 다시 확인한다. 절차는 `prokit-verify`의 `references/browser.md`) | gstack `qa-only`·`qa` (사용자가 요청할 때만) | 없음 | 없음 | ego-browser가 없으면 `agent-browser`로 같은 흐름을 확인하고 대안으로 적는다 |
| 검증 | superpowers `verification-before-completion` + `prokit-verify` | 없음 | OMC `verify` | 없음 | `prokit-verify` |
| 마무리 | `prokit-dev-cycle` 5절(사용자 확인 → audit·close → 커밋·push → 고르면 릴리스·production 배포) | superpowers `finishing-a-development-branch`는 기능 브랜치·worktree를 정리할 때만(병합·PR은 사용자가 고른다) | 없음 | 없음 | 5절 그대로 |

## 설치 위치
- 프로젝트 scope(설치기와 `pnpm skills:setup`이 설치): superpowers·skill-creator·OMC·ponytail(Claude 플러그인, `.claude/settings.json`), superpowers·skill-creator·ponytail·ponytail-review·ponytail-audit·ponytail-debt·ponytail-help·ponytail-gain(Codex, `.agents/skills`), OMX(`.codex/skills`, `.codex/agents`, `.codex/prompts`). `--with-global`은 지원할 때만 Ponytail 원본 GitHub marketplace와 네이티브 ponytail 플러그인을 설치한다. CLI가 없거나 명령을 지원하지 않으면 프로젝트 스킬로 계속하고, 실제 설치 명령이 실패하면 exit 2로 멈춘다. 기본 설치와 `pnpm skills:check`에서 네이티브 플러그인은 선택 상태다.
- 전역만 가능: gstack(Claude `~/.claude/skills/gstack`, Codex `~/.codex/skills/gstack`), ego-browser, agent-browser CLI, Vercel CLI(배포, `prokit-deploy`). `pnpm skills:setup --with-global`이 gstack을 설치한다. agent-browser CLI는 없거나 npm 최신판보다 낮으면 `--with-global` 없이도 최신판을 설치한다.
- 표의 스킬이 보이지 않으면 `pnpm skills:check`로 무엇이 빠졌는지 확인한다. 설치는 사용자가 요청할 때 `pnpm skills:setup`으로 한다.

## 도구별 이름
- Claude Code: superpowers는 `superpowers:<이름>`(예: `superpowers:writing-plans`), ponytail은 `ponytail:<이름>`(예: `ponytail:ponytail-review`), gstack은 접두어 없이(`plan-eng-review`, `review`, `qa-only`, `investigate`, `ship`), OMC는 `oh-my-claudecode:<이름>`.
- Codex: 스킬은 해당 `SKILL.md`를 읽어 적용한다(Skill 도구를 요구하지 않는다). 사용 가능한 네이티브 `$ponytail:ponytail-review`를 먼저 쓰고, 없을 때만 프로젝트 `ponytail-review/SKILL.md`를 읽는다. 둘을 같은 diff에 함께 쓰지 않으며, 사용자가 ponytail을 `off`로 두면 fallback으로 다시 켜지 않는다. superpowers와 나머지 ponytail 스킬은 `<이름>` 그대로, gstack은 `gstack-<이름>`(예: `gstack-plan-eng-review`, `gstack-review`, `gstack-qa-only`, `gstack-investigate`, `gstack-ship`), OMX는 `<이름>` 그대로.
- Antigravity·Grok Build: Codex처럼 스킬은 해당 `SKILL.md`를 읽어 적용하고, superpowers와 ponytail은 `.agents/skills`의 `<이름>` 그대로다. OMC·OMX·gstack은 쓰지 않는다(Grok Build는 Claude 호환이 기본으로 켜져 있어 전역 OMC·gstack이 보일 수 있지만 Claude Code용 설치본이라 고르지 않는다). 네이티브 `prokit-implementer`가 없으면 검증한 대안 수행자를 찾고, 없으면 `blocked`로 남긴다. 서브에이전트는 Antigravity가 `.agents/agents`(`pnpm agents:sync`가 만든다), Grok Build가 `.claude/agents`를 읽는다. 사용자가 고를 것은 대화로 묻는다.

Codex App이나 tmux 밖에서는 OMX `team`을 자동으로 시작하지 않는다. 네이티브 서브에이전트가 있으면 `prokit-implementer`로 위임하고, 없으면 검증한 대안 수행자를 찾는다. 대안도 없으면 `blocked`로 남기며 Main이 직접 구현하지 않는다. 현재 OMX가 설치하지 않는 `ralph`·`ultrawork`는 전역에 옛 스킬이 남아 있어도 대안으로 고르지 않는다.

## Provider와 리뷰 연결

provider 선택·검증·packet 필드는 [delegation.md](delegation.md)가 정본이다. SDD와 Impeccable이 남긴 리뷰 coverage는 재사용하고, 누락한 전문 계약만 보완한다. provider에 내장 리뷰 coverage가 없을 때만 `specialist-reviewer`를 부른다. `prokit-reviewer`는 실제 계약, evidence hash, 통합 수용 여부를 보고하며 같은 전체 코드 리뷰를 되풀이하지 않되 fresh final gate는 항상 수행한다. provider가 없거나 증거가 부족하면 필요한 근거를 최대 두 번 요청한 뒤 `blocked`, `parked`, `degraded` 중 실제 상태를 보고한다.

## 규칙
1. 대조표의 리뷰 행 증거는 `prokit-reviewer`만 채울 수 있다. `ponytail-review`, gstack `review`, `/code-review`, OMX `code-review`는 추가 관점이다.
2. 실제로 사용한 OMC·OMX 모드(OMC `ralph`, OMX `team` 등)는 실행 수단이다. 모드의 완료 보고는 증거가 아니며, 완료 판정은 `pnpm dev-cycle audit`만 한다. 모드가 커밋, push, 배포를 하게 두지 않고, 라운드를 닫을 때 모드를 취소한다.
3. gstack `qa`, `ship`처럼 코드를 고치거나 배포하는 스킬은 사용자가 요청할 때만 쓴다. 배포는 `prokit-deploy` 절차(`pnpm vercel:deploy`)로 하고 gstack `ship`, `land-and-deploy`, `setup-deploy`로 하지 않는다.
4. 구현 스킬(`subagent-driven-development`, `executing-plans`)이 끝에서 `finishing-a-development-branch`를 부르더라도 라운드 끝이 아니다. 병합·push·PR 선택지를 따르지 않고 대조표의 다음 행으로 간다.
5. 전역 스킬이 없어도 프로젝트·로컬·플러그인·리소스 제공자를 실제로 검증해 쓴다. 검증한 수행자가 없으면 해당 행은 `blocked`이며 Main이 대신 구현하지 않는다.
6. ponytail
   - 설계: 스펙의 범위와 구조를 정할 때마다 사다리(지금 필요한가 → 이미 코드에 있는가 → 표준 라이브러리 → 플랫폼 기능 → 설치된 의존성 → 새 코드)를 먼저 적용한다. 스펙에 "만들지 않는 것" 절을 두고, 뺀 것과 다시 넣을 조건을 한 줄씩 적는다. 보안, 입력 검증, 접근성, 사용자가 요청한 것은 빼지 않는다.
   - 계획: [reuse-design.md](reuse-design.md)에 따라 기존 경로·소비자, 소유 위치, 환경 변수·설정 영향과 회귀 검사를 남긴다. `ponytail` 사다리를 적용한 계획은 `prokit-reviewer(plan)`이 검토한다. gstack이 없어도 수행하며, 지적은 계획 문서를 고쳐 반영하거나 근거로 기각한 뒤 구현한다. 코드 diff용 `ponytail-review`에 계획 리뷰 역할을 대신 맡기지 않는다.
   - 구현은 ponytail 모드로 가장 짧게 동작하는 해법을 고른다. 실제 코드와 호출자·테스트·설정·export를 읽어 범위를 확인하고, 원본 map은 참고로만 쓴다. Claude는 플러그인 훅이 세션과 서브에이전트에 켠다. Codex 네이티브 플러그인은 trusted 프로젝트에서 `/hooks`로 허용한 뒤 새 세션부터 확인한다. Codex·Antigravity·Grok Build의 활성화와 fallback은 "도구별 이름"의 선택 규칙 하나를 따른다.
   - ponytail 규칙이 `AGENTS.md`, `prokit-*`, 대조표와 부딪히면 뒤의 것이 우선한다. 대조표 행(vitest 도입, 격리 테스트 등), 구현 전 질문, 보고 형식은 줄이지 않는다. 보안 검사, 입력 검증, 데이터 손실을 막는 오류 처리도 줄이지 않는다.
   - 일부러 한계를 둔 단순화는 `shortcut:` 주석에 한계와 넘으면 할 일을 적는다. 기존 `ponytail:` 주석은 보존하고 필요할 때 `ponytail-debt`와 함께 모은다.
   - 리뷰: provider가 낸 전문 review coverage는 재사용한다. `ponytail-review`는 그 coverage에 없는 구현 diff 계약에만 쓴다. SDD 태스크 리뷰(태스크마다 provider coverage의 빈 계약만)와 F의 공통화·리팩토링 행도 같다. 메인 세션 맥락을 아끼려면 리뷰 서브에이전트가 읽게 하고 결과 줄만 받는다(Claude는 Skill 도구, Codex는 프로젝트의 `SKILL.md` 읽기). 라운드 중에는 커밋하지 않으므로 SDD 리뷰 패키지는 태스크 시작 전 작업 트리 스냅샷(임시 인덱스로 만든 `git write-tree`)과의 diff로 만든다. 태스크별 결과는 SDD 원장에, 요약은 구현 방식 행에 `ponytail-review(태스크): 반영 a, 기각 b`로 적는다.
   - 공통화: F의 공통화·리팩토링 행의 범위는 이번 라운드가 바꾼 파일과 같은 디렉터리 및 계획에서 확인한 공통 모듈의 소비자다. 반복의 한쪽이 이번 diff이고 같은 책임으로 함께 바뀔 때만 뽑고, 나머지는 백로그로 보낸다.
   - `ponytail-review`는 정확성·안전·부하·테스트·성능·간결성 순으로 검토하고 고치지 않는다. branch·parser·보안 변경은 작은 회귀 검사를 남긴다. 생략하면 이유와 위험을 보고한다. 지적의 등급은 설치판의 분류(5.x는 Must fix·Should fix·Nice to have)를 그대로 쓰고, 반영 여부는 아래 "지적 처리"를 따른다. Claude는 Skill 도구나 `/ponytail-review`로 한 번만 부르고, 둘 다 일회성이라 세션을 영구 review 모드로 바꾸지 않는다. Codex는 위의 하나의 경로만 쓴다. 기준 SHA를 스스로 잡지 못하므로 `git diff <대조표 마커의 base>` 출력과 새 파일(`git ls-files --others --exclude-standard`, diff에 나오지 않는다)의 내용을 함께 준다.
   - `ponytail-review`는 `prokit-reviewer`의 계약 게이트를 대신하지 않는다. `prokit-reviewer(code)`에는 focus와 범위를 그대로 주되 provider가 이미 검증한 전문 review를 반복하지 않고, 실제 계약·evidence hash·통합 수용 여부를 본다.
   - 지적 처리: 지적마다 리뷰가 든 구체 사례를 실제 코드에서 다시 확인하고, 재현되지 않으면 근거를 적어 기각한다. 확인한 지적은 종류에 따라 처리한다.
     - 정확성·보안·데이터 손실·예상 부하 지적은 동작을 바꾸는 수정이다. 실패하는 회귀 테스트를 먼저 더한 뒤 이 라운드에서 고친다. 이번 변경이 깨뜨린 호출자는 diff 밖이어도 이 라운드에서 고친다.
     - 테스트 누락 지적(위험한 새 로직인데 깨지면 실패하는 테스트가 없음)은 이번 diff의 로직이면 그 테스트 하나를 더해 반영한다.
     - 이번 라운드가 만들지 않은 기존 문제는 고치지 않고 `tasks/todo.md` 백로그로 보낸다. 보안 문제면 라운드 보고에도 적는다.
     - 속도 지적은 측정한 근거(빌드 출력, 프로파일, 시간 측정)가 있을 때만 고친다. 근거가 없으면 백로그로 보낸다.
     - 간결성 지적(delete·reuse·stdlib·yagni·merge·split)은 이번 라운드 diff 안(F의 공통화 행은 위 범위 안)에서 동작이 같음을 확인한 것만 반영한다. 잘 돌던 기존 코드를 고칠 근거로 쓰지 않는다.
   - 결과는 `prokit-reviewer(code)` 행 증거에서 coverage 뒤에 보완 결과를 덧붙인다(예: `ponytail-review: 반영 2(Must fix 1), 기각 1, 백로그 1, Lean -12 lines`). `ponytail-audit`·`ponytail-debt`·`ponytail-help`·`ponytail-gain`은 요청 시 읽기 전용 보조 기능이며 매 라운드 의무화하거나 장부·백로그를 자동으로 고치지 않는다. `gain`은 upstream benchmark라 프로젝트 절감값으로 보고하지 않는다. ponytail이 설치되어 있지 않으면(`pnpm skills:check`) `specialist-reviewer` 보완 또는 `blocked` 사유를 적는다.
