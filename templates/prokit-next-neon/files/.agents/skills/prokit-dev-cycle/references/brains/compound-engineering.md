# 두뇌: compound-engineering

EveryInc/compound-engineering-plugin. "일 하나가 다음 일을 더 쉽게 만들어야 한다"는 복리형이다. 브레인스토밍 → 계획 → 작업 → 간결화 → 리뷰 → 배운 것 기록(`docs/solutions/`) 순서로 돌고, 다음 계획이 그 기록을 읽는다. 힘의 80%를 계획과 리뷰에 쓴다.

- Claude Code: 플러그인 `compound-engineering@compound-engineering-plugin`(project scope. 훅과 MCP 서버가 없다). `/ce-plan`처럼 부르고, Skill 도구 이름은 `compound-engineering:ce-plan`이다
- Codex·Antigravity·Grok Build: skills CLI로 받은 핵심 스킬 14개(`.agents/skills/ce-*`)
- 전역 플러그인(Codex·Antigravity·Grok Build용)은 설치하지 않는다.

| 단계 | Claude Code | Codex·Antigravity·Grok Build |
|---|---|---|
| 요구 명확화 | `/ce-brainstorm`. 아이디어 고르기는 `/ce-ideate` | `ce-brainstorm`, `ce-ideate` |
| 계획 | `/ce-plan`(이전 `docs/solutions/` 기록을 읽는다). 문서 검토는 `/ce-doc-review` | `ce-plan`, `ce-doc-review` |
| 구현 | `/ce-work`. 위임은 `prokit-implementer`로 하고 행마다 대조표 증거를 남긴다. 시안은 `/ce-prototype` | `ce-work`, `ce-prototype`. Codex는 네이티브 `prokit-implementer` |
| 디버깅 (C) | `/ce-debug` | `ce-debug` |
| 리뷰 추가 관점 | `/ce-code-review`, 간결화 `/ce-simplify-code`, 성능 `/ce-optimize` | 같은 이름 |
| 배운 것 기록 | 라운드를 닫기 전에 `/ce-compound`로 이번 일에서 배운 것을 `docs/solutions/`에 남긴다. 오래된 기록 정리는 `/ce-compound-refresh` | `ce-compound`, `ce-compound-refresh` |

- 맡지 않는 단계(QA, 검증)는 기본 칸이다. 용어·설계 질문은 `grilling`·`domain-modeling`이다. `tasks/lessons.md`에는 사용자 지적에서 나온 규칙만, `docs/solutions/`에는 해결 기록을 둔다.
- Claude 플러그인에는 커밋·push·PR·worktree 스킬(`ce-commit`, `ce-commit-push-pr`, `ce-babysit-pr`, `ce-resolve-pr-feedback`, `ce-worktree`)과 자동 실행 `lfg`가 들어 있다. 쓰지 않는다. 커밋·push는 `prokit-dev-cycle` 5절로 한다<!-- edition:pro -->. 배포는 `prokit-deploy`로 한다<!-- /edition -->(라우팅 규칙 3).
- `/ce-setup`은 실행하지 않는다. 승인을 받아 `AGENTS.md`·`CLAUDE.md`·`.gitignore`를 고친다. 설정이 필요하면 H 라운드에서 `.compound-engineering/config.yaml`만 직접 둔다.
- 간결화(`ce-simplify-code`)는 과설계 방지 스킬의 검토와 겹친다. 과설계 방지 스킬을 골랐으면 규칙 6 역할 표의 검토를 먼저 쓴다.
- `/ce-plan`의 계획과 진행 계획 문서가 같은 `docs/plans/`에 생긴다. 진행 계획의 정본은 `tasks/plan.md`의 `doc=`가 가리키는 파일이고, Task 세부 계획 증거에는 `/ce-plan`이 만든 파일 경로를 적는다.
- 다른 두뇌로 바꾸면 설치기가 플러그인과 스킬만 지우고 `docs/plans/`, `docs/solutions/`, `.compound-engineering/`은 인계 자료로 남긴다.

## 에이전트
- 에이전트는 없다(플러그인이 일부러 뺐다). 스킬 안의 `references/agents/*.md`(예: `ce-plan`의 조사 에이전트 틀)와 `references/personas/*.md`(예: `ce-code-review`의 리뷰어 관점)를 서브에이전트에 넘긴다.
- 조사 틀은 계획 단계의 읽기 전용 조사에, 리뷰어 관점은 `specialist-reviewer`의 위임 지시에 넣는다. 구현은 `prokit-implementer`가 한다.
- Codex·Antigravity·Grok Build: 스킬과 함께 틀이 오므로 같은 방식으로 읽어 넣는다.
- 쓰는 방법은 `process-routing.md`의 두뇌 에이전트 규칙을 따른다.
