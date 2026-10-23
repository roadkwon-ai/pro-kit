# 두뇌: gstack

garrytan/gstack. 무엇을 만들지 검토하는 제품 판단, 디자인, 실사용 QA가 강하다. 정식 설치가 전역뿐이라 이 두뇌를 고를 때만 전역에 설치한다(Bun 필요). Claude Code는 `~/.claude/skills/gstack`, Codex는 `~/.codex/skills/gstack`이다(그 도구가 이 기기에 있을 때만 설치한다). Antigravity·Grok Build는 지원하지 않아 기본 칸으로 진행한다.

| 단계 | Claude Code | Codex |
|---|---|---|
| 요구 명확화(제품 판단) | `office-hours`, 범위 검토 `plan-ceo-review` | `gstack-office-hours`, `gstack-plan-ceo-review` |
| 계획 리뷰 보강 | `plan-eng-review`, UI는 `plan-design-review`(`prokit-reviewer(plan)` 뒤 추가 관점) | `gstack-plan-eng-review`, `gstack-plan-design-review` |
| 디버깅 (C) | `investigate` | `gstack-investigate` |
| 리뷰 추가 관점 | F 병합 전 `review`, 화면은 `design-review` | `gstack-review`, `gstack-design-review` |
| QA | `qa-only`(보고만). 고치는 `qa`는 사용자가 요청할 때만 | `gstack-qa-only`, `gstack-qa` |

- 맡지 않는 단계(계획 작성, 구현, 검증, 마무리)는 기본 칸이다. 용어·설계 질문은 `grilling`·`domain-modeling`이다.
- `ship`, `land-and-deploy`, `setup-deploy`는 커밋, push, PR 병합을 하거나 `CLAUDE.md`를 고치므로 쓰지 않는다.<!-- edition:pro --> 배포는 `prokit-deploy`다.<!-- /edition -->
- 팀 모드(`./setup --team`)는 프로젝트 `CLAUDE.md`를 고치므로 쓰지 않는다. 저장소 벤더링(`./setup --local`)도 쓰지 않는다.
- 전역 설치는 `~/.claude/settings.json`에 Stop 훅(timeline)을 등록하고 `~/.gstack` 상태를 만든다. 다른 프로젝트에서는 설치기가 gstack 개인 스킬을 `.claude/settings.local.json`의 `skillOverrides`로 끄지만, 훅과 Codex 전역 스킬은 끌 수 없다.
- 업데이트는 `/gstack-upgrade`(Codex `gstack-upgrade`)다. `pnpm skills:update`는 전역 도구를 올리지 않는다.
