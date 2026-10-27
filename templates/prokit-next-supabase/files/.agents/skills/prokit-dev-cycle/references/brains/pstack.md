# 두뇌: pstack

cursor/plugins의 pstack. React 코어팀 poteto가 쓰는 엄격한 엔지니어링 방식으로, 코드는 적게 쓰되 깊게 보고 실행 증거로 검증하는 것이 목표다. 중심은 `poteto-mode`다. 요청을 플레이북(기능, 버그 수정, 성능, 리팩터링, 시안, 여러 단계 계획 등)에 맞추고 그 단계를 할 일로 연 뒤 필요한 스킬을 부른다. Claude Code 플러그인 `pstack@cursor-plugins`만 있다. Codex·Antigravity·Grok Build는 지원하지 않아 기본 칸으로 진행한다.

스킬 대부분(`poteto-mode`, `in-your-own-words`, `architect`, `how` 등)이 사용자 호출 전용(`disable-model-invocation`)이라 Skill 도구가 거부한다. 거부되는 것이 정상이고, 그때 플러그인 설치본의 `SKILL.md`를 Read로 읽어 따르는 것이 이 두뇌를 쓰는 정해진 방법이다(우회가 아니다). 설치본은 `~/.claude/plugins/cache/cursor-plugins/pstack/<판>/skills/<이름>/SKILL.md`이고 판은 `claude plugin list --json`의 `pstack@cursor-plugins` `installPath`로 확인한다. 읽고 따랐으면 증거에 `사용: poteto-mode`처럼 적는다. 사용자에게 권할 때는 `/pstack:<이름>`으로 적는다.

| 단계 | Claude Code |
|---|---|
| 요구 확인 | 목표와 문제를 되짚을 때 `in-your-own-words`. 용어·설계 질문은 `grilling`이다 |
| 계획 | `poteto-mode`의 Feature(데이터 모양부터)·Multi-phase plan 플레이북. 함수 경계를 넘는 코드는 `architect`(호출부·타입·모듈 모양 먼저), 기존 흐름 파악은 `how` |
| 구현 | `poteto-mode` 플레이북의 구현 단계를 `prokit-implementer` 위임 지시에 넣는다. 값싼 로컬 테스트가 있으면 `tdd`, TypeScript 파일이면 `typescript-best-practices`도 넣는다 |
| 디버깅 (C) | `poteto-mode`의 Bug fix·Perf 플레이북(재현과 실행 증거부터). 측정값은 `benchmark-checklist`로 확인한다 |
| 리뷰 추가 관점 | `interrogate`(여러 모델이 diff를 깨 보려 한다), 작은 변경의 영향은 `blast-radius` |
| 설명 | 마지막 설명이 와닿지 않으면 `bro`, 이해가 목적이면 `teach` |

- 맡지 않는 단계(QA, 검증, 마무리)는 기본 칸이다.
- 단계 행은 `poteto-mode`의 `SKILL.md`와 맞는 플레이북 파일(같은 폴더의 `playbooks/`)을 위 경로에서 실제로 읽고 한다. 읽지 않고 이름만 적지 않는다.
- `poteto-mode`의 Never Block on the Human·Autonomy(묻지 않고 진행)는 쓰지 않는다. 결과를 바꾸는 갈림길과 `[confirm]`은 사용자에게 묻는다. 답 형식(Writing the reply)보다 프로킷 보고 형식과 `prokit-writing`이 우선한다.
- `architect`는 `arena` 병렬 탐색(worktree)을 건너뛰고 호출부·타입 스케치만 한다. `poteto-mode`의 `poteto-agent` 코드 위임과 worktree 격리는 `prokit-implementer` 위임으로 바꾼다.
- 플레이북의 commit·rebase·PR 단계와 커밋 전 `deslop`은 건너뛴다. Multi-phase plan은 PR 부분을 빼고 `docs/plans/`에 쓰며 Task 표는 dev-cycle 형식을 따른다.
- `comment-sicko`·`no-comments`가 지우자는 주석 가운데 `shortcut:`·`ponytail:` 주석은 남긴다.
- `poteto-mode`의 Opening a PR, Babysit, Shipping, Autonomous run, Orchestrate, Autopilot, Worktree cleanup 플레이북은 쓰지 않는다. 커밋·push는 `prokit-dev-cycle` 5절이고, 라운드는 `[confirm]`에서 사용자 확인을 기다린다.
- `arena`·`swarm`(같은 일을 여러 작업자에게 맡김)은 사용자가 요청할 때만 위임 프로토콜로 쓴다. 프로젝트에 스킬을 만드는 것(`create-verification-skill`, `automate-me`, `reflect`, `correct`)은 사용자가 요청할 때 H 라운드에서만 한다.
- `setup-pstack`은 모델이 스스로 부를 수 있지만 실행하지 않는다. 전역 `~/.claude/rules/pstack-models.md`를 쓴다. 비Claude 모델 지정은 세션 모델로 바뀐다.

## 에이전트
- Claude Code 전용 두뇌다: `pstack:poteto-agent`, `pstack:comment-sicko`. Codex·Antigravity·Grok Build는 없다.
- 둘 다 앞머리에 `tools:`가 없어 모든 도구를 받는다(`poteto-agent`는 원래 코드 작성 위임자다). 읽기 전용 보완 검토나 메모로만 쓴다(`comment-sicko`는 주석 검토).
- 쓰는 방법은 `process-routing.md`의 두뇌 에이전트 규칙을 따른다.
