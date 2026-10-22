# 두뇌: agent-skills

addyosmani/agent-skills. 스펙부터 출시까지 보안·성능·접근성 기준을 단계별 명령으로 건다. Claude Code는 플러그인 `agent-skills@addy-agent-skills`(명령 `/spec`, `/plan`, `/build`, `/test`, `/review`, `/code-simplify`, `/ship` 등), Codex·Antigravity·Grok Build는 `.agents/skills`의 스킬 25개를 쓴다. 훅은 배선되어 있지 않다.

| 단계 | Claude Code | Codex·Antigravity·Grok Build |
|---|---|---|
| 요구 명확화 | `agent-skills:spec-driven-development`(`/spec`). 아이디어가 흐리면 `idea-refine`, 인터뷰는 `interview-me` | `spec-driven-development`, `idea-refine`, `interview-me` |
| 계획 | `agent-skills:planning-and-task-breakdown`(`/plan`). 인터페이스는 `api-and-interface-design` | 같은 이름 |
| 구현 | `agent-skills:incremental-implementation`(`/build`) + `test-driven-development`(`/test`). 위임은 `prokit-implementer` | 같은 이름. Codex는 네이티브 `prokit-implementer` |
| 디버깅 (C) | `agent-skills:debugging-and-error-recovery` | `debugging-and-error-recovery` |
| 리뷰 추가 관점 | `code-review-and-quality`(`/review`), 보안 `security-and-hardening`, 성능 `performance-optimization` | 같은 이름 |
| QA 보조 | `browser-testing-with-devtools` | 같은 이름 |
| 마무리 | `shipping-and-launch`(`/ship`)는 출시 점검 목록으로만 쓴다 | 같은 이름 |

- 맡지 않는 단계(검증)는 기본 칸이다. 용어·설계 질문은 `grilling`·`domain-modeling`이다.
- `/ship`·`shipping-and-launch`가 배포·커밋을 안내해도 배포는 `prokit-deploy`, 커밋·push는 `prokit-dev-cycle` 5절로 한다.
- `git-workflow-and-versioning`의 커밋 규칙, `documentation-and-adrs`의 ADR 형식이 프로킷 규칙(Conventional Commits 접두어, `domain-modeling` 형식)과 다르면 프로킷 규칙을 따른다.
- `code-simplification`(`/code-simplify`)은 간결성 보완 검토와 겹친다. 과설계 방지 스킬을 골랐으면 규칙 6 역할 표의 검토를 먼저 쓴다.
- `/plan`(`planning-and-task-breakdown`)은 기본으로 `tasks/plan.md`와 `tasks/todo.md`에 쓴다. 프로킷에서 두 파일은 dev-cycle의 진행 계획 Task 표와 대조표다. 계획 문서는 `docs/plans/<날짜>-<주제>.md`에, 할 일은 그 문서의 Task 목록에 쓰게 한다(그 스킬은 프로젝트 규칙이 정한 위치를 따른다). 이미 썼다면 내용을 `docs/plans/`로 옮기고 `tasks/plan.md`는 진행 계획 블록만 남긴다.
- 같은 이름의 `test-driven-development`가 superpowers에도 있다. 두뇌를 바꿀 때 설치기는 `skills-lock.json` 출처로 구분해 지운다.
