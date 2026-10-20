# 두뇌: superpowers

obra/superpowers. 설계 합의, 계획, 테스트 먼저, 작업별 리뷰를 강하게 거는 규율형이다. Claude Code는 플러그인 `superpowers@claude-plugins-official`(세션 시작 훅이 `using-superpowers`를 주입한다), Codex·Antigravity·Grok Build는 `.agents/skills`의 스킬 15개를 쓴다. Codex 경로에는 세션 시작 훅이 없다.

| 단계 | Claude Code | Codex·Antigravity·Grok Build |
|---|---|---|
| 요구 명확화 | `superpowers:brainstorming` | `brainstorming` |
| 계획 | `superpowers:writing-plans` | `writing-plans` |
| 구현 | `superpowers:subagent-driven-development`(`prokit-implementer` 사용) + `superpowers:test-driven-development` | `subagent-driven-development` + `test-driven-development`. Codex는 네이티브 `prokit-implementer` |
| 디버깅 (C) | `superpowers:systematic-debugging` | `systematic-debugging` |
| 리뷰 지적 처리 | `superpowers:receiving-code-review`(반영 기준은 규칙 6 지적 처리) | `receiving-code-review` |
| 검증 | `superpowers:verification-before-completion` + `prokit-verify` | `verification-before-completion` + `prokit-verify` |
| 마무리 | `superpowers:finishing-a-development-branch`는 기능 브랜치·worktree를 정리할 때만(병합·PR은 사용자가 고른다) | `finishing-a-development-branch` 같음 |

- 맡지 않는 단계(QA)는 기본 칸이다. 용어·설계 질문은 `grilling`·`domain-modeling`이다.
- 세션 시작 훅이 "모든 일에 스킬을 먼저 쓰라"고 해도 `AGENTS.md`와 `prokit-dev-cycle`의 순서(대조표, 위임 검증, 리뷰 게이트)가 우선한다.
- 스펙과 계획은 스킬 기본 경로(`docs/superpowers/specs/`, `docs/superpowers/plans/`)에 써도 되고, 대조표 증거에 경로를 적는다.
- 구현 스킬이 끝에서 `finishing-a-development-branch`를 불러도 라운드 끝이 아니다(라우팅 규칙 4).
- 태스크 리뷰 원장은 `subagent-driven-development`의 원장이다. 요약은 구현 방식 행에 적는다(규칙 6 리뷰).
- 같은 이름의 `test-driven-development`가 agent-skills에도 있다. 두뇌를 바꿀 때 설치기는 `skills-lock.json` 출처로 구분해 지운다.
