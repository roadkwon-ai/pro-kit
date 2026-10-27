# 두뇌 스킬 연결 보완 계획

2026-10-27 초안, 같은 날 계획 리뷰(prokit-reviewer plan: changes-required, high 1·medium 4·low 5)를 반영해 고쳤다. 아직 구현하지 않았다. 9절의 결정을 사용자에게 받은 뒤 구현한다.

## 1. 배경

pro-kit-web은 2026-10-27 두뇌를 `agent-skills`로 바꿨다. 그 뒤 연 라운드 여섯 개(스킬 구성 변경, 템플릿 v0.3.2 반영, 포트 변경, 진행 계획, T1 기능 팩 저장소, prokit-writing 재설치)에서 agent-skills의 스킬과 에이전트는 한 번도 불리지 않았다. 사용자가 이를 짚었고 원인을 확인했다.

1. **단계 이름이 붙은 행이 적다.** 행 문구의 단계 이름("요구 명확화 단계", "계획 단계", "구현 단계", "디버깅 단계", "고른 두뇌의 계획 방법")이 `process-routing.md`를 거쳐 `brains/<이름>.md`의 스킬로 이어진다.
   - 이 이름은 C(디버깅), F(요구 명확화·계획·구현), 진행 계획 행과 Task 계획 행에만 있다.
   - B·D·E의 구현 행과 H·A에는 단계 이름이 없다. 여섯 라운드는 A와 H였다. T1은 저장소 하나를 새로 만든 큰 작업인데도 H라 구현 단계를 거치지 않았다.
2. **실행기가 두뇌를 모른다.** `scripts/dev-cycle.mjs`는 `.dev-cycle.json`의 `brain`을 읽지 않는다.
   - audit은 단계 행이 채워졌는지만 본다.
   - 진행 계획 라운드의 계획 행 증거는 "agent-skills planning-and-task-breakdown 방식"이었지만 그 스킬은 불리지 않았다.
3. **두뇌가 주는 에이전트가 연결되어 있지 않다.** agent-skills 플러그인은 `agent-skills:code-reviewer`, `agent-skills:security-auditor`, `agent-skills:test-engineer`, `agent-skills:web-performance-auditor`를 준다.
   - 두뇌 파일, `process-routing.md`, `delegation.md` 어디에도 이 이름이 없다.
   - 템플릿 `CLAUDE.md`와 `adopt/CLAUDE.md` 5행은 서브에이전트 종류를 `prokit-analyzer`, `prokit-implementer`, `prokit-reviewer`, `specialist-reviewer`로 한정한다.
4. **세션이 두뇌를 떠올릴 계기가 약하다.** `prokit-dev-cycle` 0절이 `brain`을 읽으라고 하지만 `status`·`table` 출력에는 두뇌가 나오지 않는다.

두뇌별 에이전트 현황(2026-10-27 플러그인 캐시와 매니페스트 조사):

| 두뇌 | 함께 오는 에이전트 | Codex·Antigravity |
|---|---|---|
| agent-skills | `agent-skills:code-reviewer`, `security-auditor`, `test-engineer`, `web-performance-auditor`. 앞머리에 `tools:`가 없어 모든 도구를 받는다 | 없음(스킬만) |
| superpowers | 없음. 스킬 안의 프롬프트 틀(`subagent-driven-development/implementer-prompt.md`, `task-reviewer-prompt.md`, `requesting-code-review/code-reviewer.md`)을 범용 서브에이전트에 넘긴다 | 스킬과 함께 틀이 온다 |
| compound-engineering | 없음(일부러 뺐다). 스킬 안의 `references/agents/*.md`, `references/personas/*.md`를 넘긴다 | 스킬과 함께 온다 |
| oh-my | OMC 에이전트 19개 | Codex는 OMX가 `.codex/agents`를 만든다. Antigravity 없음 |
| pstack | `poteto-agent`, `comment-sicko` | 없음(Claude 전용 두뇌) |
| gstack, mattpocock, openspec, spec-kit | 없음 | 없음 |

## 2. 목표

1. 두뇌를 고른 프로젝트에서 단계 행의 증거는 고른 두뇌의 방법 이름, 추가 스킬 이름, 사유가 있는 내장 중 하나여야 audit을 통과한다. 이름만 맞추는 자기 신고라는 한계는 handbook에 적는다.
2. 화면(B), 서버(D), DB(E), 하네스(H)의 구현 행도 구현 단계를 거친다.
3. 두뇌가 주는 에이전트를 읽기 전용 보완 검토로 쓴다. 하네스의 필수 게이트(`prokit-reviewer`, 대조표, audit, `[confirm]`)는 그대로다.
4. 세션이 라운드를 열고 이어받을 때마다 고른 두뇌와 두뇌 파일 경로를 본다.

## 3. 만들지 않는 것

- **두뇌별 자체 에이전트 사본.** 에이전트가 있는 두뇌는 플러그인이 함께 설치하고, 없는 두뇌는 일부러 프롬프트 틀로 대신한다. 두뇌 9개 × 도구 4종의 사본은 원본이 바뀔 때마다 어긋난다.
- **두뇌 에이전트를 쓰는 쪽으로 쓰기.** 파일 쓰기는 Main이나 `prokit-implementer`만 한다. 한 작업 단위에 수행 흐름은 하나다(`delegation.md`).
- `prokit-reviewer`를 두뇌 리뷰어로 바꾸기.
- 대화 기록으로 스킬 호출을 검증하기. audit은 대조표와 파일만 본다.
- 실행기가 `brains/README.md` 단계 표(●)를 읽어 단계 주인을 정하기. 표와 두뇌 파일이 어긋나는 곳이 있다(예: gstack 계획 칸). 주인 규칙은 `process-routing.md`의 안내로 둔다.
- Task 라운드 전용 구현 행(`TASK_BUILD_ROW`) 실행기 코드. 행 문구에 단계 이름을 붙이는 D2가 더 작고 Task가 아닌 라운드도 덮는다.
- 두뇌가 진행 순서를 쥐는 구조. dev-cycle이 진행을 쥐고 두뇌는 단계의 방법을 맡는다(`2026-10-20-prokit-brain-selection.md` 2절).

## 4. 설계

### D1. audit 두뇌 증거 검사
- 단계 행: 행 문구에 `요구 명확화 단계`, `계획 단계`, `구현 단계`, `디버깅 단계`, `고른 두뇌의 계획 방법` 중 하나가 든 행. `테스트 먼저`만으로는 단계 행으로 보지 않는다(D2로 구현 행에 `구현 단계`를 붙인다).
- `brain`이 `none`이 아니면(문자열이나 배열) 단계 행의 증거는 다음 중 하나를 담는다. 지금 문서의 꼴을 하나로 맞춘 것이다.
  - `사용: <이름>`: `<이름>`이 고른 두뇌 파일(`brains/<이름>.md`) 중 하나에 백틱으로 적혀 있다. 플러그인 접두어(`agent-skills:planning-and-task-breakdown`), 명령(`/opsx:propose`, `/speckit-plan`), 도구별 이름(`gstack-investigate`)을 새 자료 없이 모두 덮는다.
  - `사용: <스킬>(추가 스킬)`: `skills-lock.json`이나 매니페스트 `mattpocock.pool`에 있는 이름.
  - `사용: 내장(<단계>): <사유>`: 사유는 비울 수 없다.
- `N/A:`·`blocked:`·`미실행:`은 지금 규칙대로 둔다. 모르는 두뇌 이름은 오류로 알리고 예외를 던지지 않는다.
- 검사는 `roundRowProblem`에 붙는다. audit과 status가 같은 판정을 쓰므로 status가 알리는 "다음 행"도 함께 바뀐다(의도한 동작).
- 같은 변경에서 꼴 예시를 고친다: `prokit-dev-cycle` SKILL.md 55행, `process-routing.md` 22행, `mattpocock.md`의 증거 예.

### D2. 구현 행에 단계 이름
- 두 템플릿의 `docs/dev-workflow.md`에서 B·D·E 구현 행에 `구현 단계`를 붙인다. neon 판은 판 표시를 지킨다. 이 파일은 공유 파일이 아니라 두 판을 따로 고친다.
- H 블록에 단계 이름이 붙은 구현 행을 하나 더한다. 설치만 바꾸는 H(스킬 구성 변경·업데이트)는 `N/A: 사유`로 채운다.
- 행 문구가 바뀌므로 진행 중 라운드는 `--upgrade`가 필요하다(8절).

### D3. 두뇌 파일 "에이전트" 절
- 9개 두뇌 파일마다 "에이전트" 절을 둔다. 함께 오는 에이전트나 프롬프트 틀의 이름(접두어 포함), 쓰는 단계, 도구별 제공 여부를 적는다. 없으면 "없음"이다.
- 쓰는 방법:
  - 읽기 전용 보완 검토나 메모만 맡긴다(리뷰 관점, 테스트 설계 메모). 파일을 쓰지 말라고 지시한다.
  - 위임 전후 snapshot capture·diff를 `--scope` 없이 해서 쓰기가 없었는지 본다(`delegation.md`의 리뷰 규칙).
  - 결과는 `prokit-reviewer` 최종 게이트의 입력이고 게이트를 대신하지 않는다.
- agent-skills 예:
  - `agent-skills:security-auditor`: security 리뷰 행의 보완 관점이다.
  - `agent-skills:test-engineer`: 테스트 먼저 단계의 테스트 설계 메모만 맡는다. 테스트 파일은 `prokit-implementer`가 쓴다.
  - `agent-skills:web-performance-auditor`: 성능 행의 보완 관점이다.
  - `agent-skills:code-reviewer`: 과설계 방지 스킬의 검토와 겹치면 하나만 쓴다.
  - Codex·Antigravity는 같은 관점의 스킬(`security-and-hardening` 등)을 읽는다.
- superpowers·compound-engineering은 프롬프트 틀을 `prokit-implementer`·`specialist-reviewer` 위임 지시에 넣는 방법을 적는다.
- 템플릿 `CLAUDE.md`·`adopt/CLAUDE.md` 5행, `AGENTS.md` "에이전트" 절에 한 줄을 더한다: "고른 두뇌 파일의 에이전트 절에 있는 에이전트는 읽기 전용 보완 검토로만 쓴다. 쓰는 쪽이 아니고 최종 게이트는 `prokit-reviewer`다." `AGENTS.md` 110줄 제한 테스트를 지킨다.

### D4. 위임 지시에 두뇌 스킬
- `prokit-implementer.md`에 "코디네이터가 위임 지시에 적은 두뇌 스킬을 먼저 읽는다"를 더한다. 지금은 TDD 스킬만 적혀 있다.
- `process-routing.md` 구현 칸과 `prokit-dev-cycle` 4절에 위임 지시의 필수 항목으로 "그 단계의 두뇌 스킬"을 더한다.

### D5. status·table 출력에 두뇌
- `pnpm dev-cycle status`와 `table --write` 출력에 한 줄을 더한다: `두뇌: agent-skills → 단계 행은 .agents/skills/prokit-dev-cycle/references/brains/agent-skills.md`. `none`이면 `두뇌: 없음(기본 칸)`이다.

## 5. 바꿀 파일

공유 파일(`tests/shared-files.test.mjs`)은 두 템플릿에서 바이트가 같아야 한다. `dev-workflow.md`는 공유 파일이 아니다.

| 파일 | 변경 |
|---|---|
| `files/scripts/dev-cycle.mjs` | D1 검사(`roundRowProblem`에 연결), D5 출력 |
| `tests/dev-cycle-audit.test.mjs`, `dev-cycle-table.test.mjs`, `dev-cycle-plan.test.mjs` | D1(두뇌 문자열·배열·모르는 이름, 두뇌 파일 이름·추가 스킬·내장 사유 없음), D2(바뀐 행 문구, H 구현 행 N/A), D5 |
| `files/docs/dev-workflow.md`(neon 판 표시 유지, supabase 따로) | D2 |
| `files/.agents/skills/prokit-dev-cycle/SKILL.md` | 3절 D1 꼴(55행 예 고침), 4절 D4 |
| `files/.agents/skills/prokit-dev-cycle/references/process-routing.md` | 22행 꼴, 구현 칸 D4, 에이전트 절 안내 |
| `files/.agents/skills/prokit-dev-cycle/references/brains/*.md`(9개) | D3 에이전트 절, mattpocock 증거 예 |
| `files/.claude/agents/prokit-implementer.md` | D4 |
| `files/CLAUDE.md`, `adopt/CLAUDE.md`, `files/AGENTS.md`, `adopt/AGENTS.md` | D3 한 줄 |
| `evals/prokit-dev-cycle` | 스킬 변경에 따른 eval(H의 skill-creator 행) |
| `handbook/skills/brains.md`, `handbook/concepts/harness.md`, `concepts/audit-and-confirm.md`, `concepts/agent-roles.md` | 단계마다 두뇌를 쓰는 방법, audit 검사와 자기 신고 한계, 두뇌 에이전트의 자리. Task·진행 계획 글은 `<!-- edition:pro -->` 표시 |
| `templates/*/VERIFICATION.md` | 검증 결과 |

- `editions/ui-allow.txt`는 다른 세션이 고치는 중이다. 이 작업에서 고칠 일이 생기면 그 변경과 맞춘다.
- `.codex/agents`, `.agents/agents`는 템플릿에 없고 프로젝트에서 만든다. pro-kit-web 반영 H 라운드에서 `pnpm agents:sync`를 돌린다(audit이 `--check`로 지킨다).

## 6. 단계와 검사

1. D1·D5: `dev-cycle.mjs`와 테스트. `node --test 'templates/prokit-next-neon/tests/*.test.mjs'`와 supabase 판.
2. D2: 두 `dev-workflow.md`와 테스트.
3. D3·D4: 두뇌 파일, `process-routing.md`, `SKILL.md`, 에이전트, `CLAUDE.md`·`AGENTS.md`. `tests/skills.test.mjs`, `tests/template-docs.test.mjs`, `tests/shared-files.test.mjs`. `evals/prokit-dev-cycle`.
4. handbook: `node --test scripts/handbook.test.mjs scripts/edition.test.mjs scripts/doc-values.test.mjs`.
5. 실제 확인: scratchpad에 템플릿으로 새 프로젝트를 만들고 `brain: agent-skills`로 F 라운드를 연다.
   - `사용: 내장`만 적은 단계 행을 audit이 거부하는지 본다.
   - 두뇌 파일 이름(`agent-skills:planning-and-task-breakdown`)과 `사용: 내장(계획): <사유>`는 받는지 본다.
   - `table`·`status`에 두뇌 줄이 나오는지 본다.
   - 확인 뒤 project scope 플러그인을 지우고 DB 컨테이너를 정리한다.
6. 독립 리뷰: 구현 diff를 끝나고 한 번 받는다.

## 7. 반영

1. pro-kit 릴리스(`AGENTS.md` "버전과 릴리스"). audit 규칙과 행 문구가 바뀌어 기존 프로젝트가 템플릿 갱신을 반영해야 하므로 minor를 추천한다. 사용자가 정한다.
2. pro-kit-web에 "기존 프로젝트에 템플릿 갱신 반영" 절차로 H 라운드를 연다. 그 라운드에서 `pnpm agents:sync`를 돌린다.
3. pro-kit-web T2(구글 로그인, F)부터 새 규칙으로 진행한다.

## 8. 위험

- **진행 중 라운드:** 행 문구(D2)와 audit(D1)이 바뀌어 갱신 전에 연 라운드는 `필수 행 누락`이나 증거 꼴 오류가 난다. 갱신 전에 닫거나 `--upgrade`한다. 반영 절차에 적는다.
- **자기 신고:** `사용: <이름>`은 이름이 두뇌 파일에 있으면 통과한다. 실제로 불렀는지는 보지 않는다.
- **두뇌 에이전트의 쓰기:** 도구 제한이 없는 에이전트가 지시를 어기고 파일을 쓸 수 있다. 위임 전후 snapshot diff로 잡고, 쓰기가 나오면 결과를 버리고 `blocked`로 남긴다.
- **pro-kit 작업 트리:** 다른 세션의 변경 9개 파일(edition, analyzer 등)이 있다. 이 작업은 그 파일을 건드리지 않고 커밋은 이 작업 파일만 한다. 템플릿 `prokit-analyzer.md`는 그 세션이 고치는 중이라 대상에서 뺀다.

## 9. 결정 (사용자 2026-10-27)

1. **내장:** `사용: 내장(<단계>): <사유>`를 허용하고 사유를 강제한다.
2. **구현 행 단계 이름(D2):** B·D·E 구현 행과 H에 구현 단계를 붙인다.
3. **두뇌 에이전트(D3):** 읽기 전용 보완 검토로만 쓴다.
4. **릴리스 버전:** patch(v0.3.3).
