# 프로세스 스킬 라우팅

단계마다 1순위를 먼저 쓴다. 현재 도구에 없으면 같은 줄의 대안, 그것도 없으면 "스킬이 없을 때" 절차를 쓴다. 대조표 증거 칸에는 실제로 쓴 스킬 이름을 적고, 대안이나 대체 절차를 썼다면 그 사실도 적는다 (예: `대안: OMC plan (superpowers 없음) → .omc/plans/todo-due.md`).

| 단계 | 1순위 (Claude·Codex 같은 이름) | 보강 | Claude 대안 | Codex 대안 | 스킬이 없을 때 |
|---|---|---|---|---|---|
| 요구 명확화 | superpowers `brainstorming` | ponytail 사다리로 범위 줄이기(규칙 6), `domain-modeling`(새 용어를 `GLOSSARY.md`에 바로 기록), `/grill-with-docs` (사용자가 호출, 용어와 ADR을 함께 기록) | OMC `deep-interview` | OMX `deep-interview` | 질문 목록을 만들어 사용자 확인을 받는다 |
| 계획 | superpowers `writing-plans` | 계획 리뷰: gstack `plan-eng-review`, UI가 있으면 `plan-design-review`, 계획 문서에 `ponytail-review`(규칙 6) | OMC `plan`, `ralplan` | OMX `plan`, `ralplan` | 파일별 단계와 검사를 적은 계획 파일을 직접 쓴다 |
| 구현 | superpowers `subagent-driven-development`(`prokit-implementer` 사용) + `test-driven-development` | ponytail 모드(규칙 6) | OMC `team`, `ralph` (대규모 병렬) | Codex 네이티브 `prokit-implementer`, OMX `team`(tmux 런타임이 있을 때만) | 대조표 행 순서대로 직접 구현한다 |
| 디버깅 (C) | superpowers `systematic-debugging` | gstack `investigate` | OMC `debug` | `gstack-investigate` | 재현 테스트 → 가설 → 수정 |
| 리뷰 | **`prokit-reviewer`(필수)** + 지적 처리는 superpowers `receiving-code-review` | `prokit-reviewer(code)`와 함께 `ponytail-review`(과설계만, 규칙 6). 추가 관점(증거 대체 불가): F 병합 전 gstack `review`, Claude Code 내장 `/code-review`, OMX `code-review` | 없음 | 없음 | `prokit-reviewer`만 |
| QA | `ego-browser`로 스펙의 테스트 시나리오 전부 확인 (F, 보고만. 발견은 다음 행에서 고치고 다시 확인한다. 절차는 `prokit-verify`의 `references/browser.md`) | gstack `qa-only`·`qa` (사용자가 요청할 때만) | 없음 | 없음 | ego-browser가 없으면 `agent-browser`로 같은 흐름을 확인하고 대안으로 적는다 |
| 검증 | superpowers `verification-before-completion` + `prokit-verify` | 없음 | OMC `verify` | 없음 | `prokit-verify` |
| 마무리 | `prokit-dev-cycle` 5절(사용자 확인 → audit·close → 커밋·push → 고르면 릴리스·production 배포) | superpowers `finishing-a-development-branch`는 기능 브랜치·worktree를 정리할 때만(병합·PR은 사용자가 고른다) | 없음 | 없음 | 5절 그대로 |

## 설치 위치
- 프로젝트 scope(설치기와 `pnpm skills:setup`이 설치): superpowers·skill-creator·OMC·ponytail(Claude 플러그인, `.claude/settings.json`), superpowers·skill-creator·ponytail(Codex, `.agents/skills`), OMX(`.codex/skills`, `.codex/agents`, `.codex/prompts`).
- 전역만 가능: gstack(Claude `~/.claude/skills/gstack`, Codex `~/.codex/skills/gstack`), ego-browser, agent-browser CLI, Vercel CLI(배포, `prokit-deploy`). `pnpm skills:setup --with-global`이 gstack을 설치한다. agent-browser CLI는 없거나 npm 최신판보다 낮으면 `--with-global` 없이도 최신판을 설치한다.
- 표의 스킬이 보이지 않으면 `pnpm skills:check`로 무엇이 빠졌는지 확인한다. 설치는 사용자가 요청할 때 `pnpm skills:setup`으로 한다.

## 도구별 이름
- Claude Code: superpowers는 `superpowers:<이름>`(예: `superpowers:writing-plans`), ponytail은 `ponytail:<이름>`(예: `ponytail:ponytail-review`), gstack은 접두어 없이(`plan-eng-review`, `review`, `qa-only`, `investigate`, `ship`), OMC는 `oh-my-claudecode:<이름>`.
- Codex: 스킬은 해당 `SKILL.md`를 읽어 적용한다(Skill 도구를 요구하지 않는다). superpowers와 ponytail은 `<이름>` 그대로, gstack은 `gstack-<이름>`(예: `gstack-plan-eng-review`, `gstack-review`, `gstack-qa-only`, `gstack-investigate`, `gstack-ship`), OMX는 `<이름>` 그대로.
- Antigravity·Grok Build: Codex처럼 스킬은 해당 `SKILL.md`를 읽어 적용하고, superpowers와 ponytail은 `.agents/skills`의 `<이름>` 그대로다. OMC·OMX·gstack은 쓰지 않는다(Grok Build는 Claude 호환이 기본으로 켜져 있어 전역 OMC·gstack이 보일 수 있지만 Claude Code용 설치본이라 고르지 않는다). 표의 "Codex 대안" 칸 중 네이티브 `prokit-implementer`만 쓰고, 없으면 "스킬이 없을 때" 절차를 쓴다. 서브에이전트는 Antigravity가 `.agents/agents`(`pnpm agents:sync`가 만든다), Grok Build가 `.claude/agents`를 읽는다. 사용자가 고를 것은 대화로 묻는다.

Codex App이나 tmux 밖에서는 OMX `team`을 자동으로 시작하지 않는다. 네이티브 서브에이전트가 있으면 `prokit-implementer`로 위임하고, 없으면 표의 직접 실행 절차를 쓴다. 현재 OMX가 설치하지 않는 `ralph`·`ultrawork`는 전역에 옛 스킬이 남아 있어도 대안으로 고르지 않는다.

## 규칙
1. 대조표의 리뷰 행 증거는 `prokit-reviewer`만 채울 수 있다. `ponytail-review`, gstack `review`, `/code-review`, OMX `code-review`는 추가 관점이다.
2. 실제로 사용한 OMC·OMX 모드(OMC `ralph`, OMX `team` 등)는 실행 수단이다. 모드의 완료 보고는 증거가 아니며, 완료 판정은 `pnpm dev-cycle audit`만 한다. 모드가 커밋, push, 배포를 하게 두지 않고, 라운드를 닫을 때 모드를 취소한다.
3. gstack `qa`, `ship`처럼 코드를 고치거나 배포하는 스킬은 사용자가 요청할 때만 쓴다. 배포는 `prokit-deploy` 절차(`pnpm vercel:deploy`)로 하고 gstack `ship`, `land-and-deploy`, `setup-deploy`로 하지 않는다.
4. 구현 스킬(`subagent-driven-development`, `executing-plans`)이 끝에서 `finishing-a-development-branch`를 부르더라도 라운드 끝이 아니다. 병합·push·PR 선택지를 따르지 않고 대조표의 다음 행으로 간다.
5. 전역 스킬이 하나도 없어도 "스킬이 없을 때" 절차만으로 라운드를 끝까지 진행할 수 있어야 한다.
6. ponytail
   - 설계: 스펙의 범위와 구조를 정할 때마다 사다리(지금 필요한가 → 이미 코드에 있는가 → 표준 라이브러리 → 플랫폼 기능 → 설치된 의존성 → 새 코드)를 먼저 적용한다. 스펙에 "만들지 않는 것" 절을 두고, 뺀 것과 다시 넣을 조건을 한 줄씩 적는다. 보안, 입력 검증, 접근성, 사용자가 요청한 것은 빼지 않는다.
   - 계획: 계획 리뷰 행에서 계획 문서(새 파일, 추상화, 의존성, 설정)에 `ponytail-review`를 돌린다. 반영할 지적은 계획을 고친 뒤 구현한다. 증거는 계획 리뷰 결과 뒤에 `ponytail-review(계획): net -N lines, 반영 a, 기각 b`로 덧붙인다.
   - 구현은 ponytail 모드로 가장 짧게 동작하는 해법을 고른다. Claude는 플러그인 훅이 세션과 서브에이전트에 켠다. Codex·Antigravity·Grok Build는 구현 전에 `ponytail` 스킬을 읽고, 구현을 위임하면 `prokit-implementer`에도 읽게 한다.
   - ponytail 규칙이 `AGENTS.md`, `prokit-*`, 대조표와 부딪히면 뒤의 것이 우선한다. 대조표 행(vitest 도입, 격리 테스트 등), 구현 전 질문, 보고 형식은 줄이지 않는다. 보안 검사, 입력 검증, 데이터 손실을 막는 오류 처리도 줄이지 않는다.
   - 일부러 한계를 둔 단순화는 `ponytail:` 주석에 한계와 넘으면 할 일을 적는다.
   - 리뷰: `ponytail-review`는 리뷰가 있는 곳마다 돈다. 계획 리뷰(위), SDD 태스크 리뷰(태스크마다 리뷰 패키지 diff에), `prokit-reviewer(code)` 행, F의 공통화·리팩토링 행이다. 메인 세션 맥락을 아끼려면 리뷰 서브에이전트가 읽게 하고 결과 줄만 받는다(Claude는 Skill 도구, Codex는 프로젝트의 `SKILL.md` 읽기). 라운드 중에는 커밋하지 않으므로 SDD 리뷰 패키지는 태스크 시작 전 작업 트리 스냅샷(임시 인덱스로 만든 `git write-tree`)과의 diff로 만든다. 태스크별 결과는 SDD 원장에, 요약은 구현 방식 행에 `ponytail-review(태스크): 반영 a, 기각 b`로 적는다.
   - 공통화: F의 공통화·리팩토링 행의 범위는 이번 라운드가 바꾼 파일과 같은 디렉터리다. 반복의 한쪽이 이번 diff일 때만 뽑고, 나머지는 백로그로 보낸다.
   - `ponytail-review`는 과설계(`delete`·`stdlib`·`native`·`yagni`·`shrink`)만 나열하고 고치지 않는다. Claude는 Skill 도구로 부른다(`/ponytail-review` 슬래시 명령은 세션의 ponytail 모드를 review로 바꿔 둔다). 기준 SHA를 스스로 잡지 못하므로 `git diff <대조표 마커의 base>` 출력과 새 파일(`git ls-files --others --exclude-standard`, diff에 나오지 않는다)의 내용을 함께 준다.
   - `ponytail-review`는 `prokit-reviewer`의 일을 나누지 않는다. `prokit-reviewer(code)`에는 focus와 범위를 그대로 주고 불필요한 복잡도도 보게 한다.
   - 나열된 항목은 이번 라운드 diff 안(F의 공통화 행은 위 범위 안)에서 동작이 같음을 확인한 것만 반영하고, 그 밖의 잘 돌던 기존 코드를 고칠 근거로 쓰지 않는다.
   - 결과는 `prokit-reviewer(code)` 행 증거에서 리뷰어 결과 뒤에 덧붙인다(예: `ponytail-review: net -12 lines, 반영 2, 기각 1`). ponytail이 설치되어 있지 않으면(`pnpm skills:check`) `ponytail-review: 없음`으로 적고 넘어간다.
