# 두뇌: mattpocock

mattpocock/skills를 두뇌로 쓴다. 따로 설치하는 플러그인이나 전역 도구가 없다. 필수 3개(`domain-modeling`, `grilling`, `grill-with-docs`)와 `--matt`로 고른 추가 스킬이 단계마다 방법을 맡는다. 스킬은 서로 독립된 기법이라 순서를 강제하지 않는다. 개발자가 진행을 쥐고 그 단계에 맞는 기법을 쓴다. 모든 도구가 같은 스킬을 읽는다(Claude Code `.claude/skills`, Codex·Antigravity·Grok Build `.agents/skills`).

실행은 두뇌 없음(`none`)에 추가 스킬을 더한 것과 같다. 다른 점은 고를 때다. 겹치는 두뇌가 없으니 추가 스킬 14개를 모두 후보로 놓고 PRD에 맞는 것을 고른다.

| 단계 | 스킬(설치된 것만) |
|---|---|
| 요구 명확화 | `grilling`(묶음별 질문과 추천 답)으로 인터뷰하고 결과를 스펙에 적는다. 사용자가 직접 하려면 `/grill-with-docs`, 결정권자가 따로 있으면 `/to-questionnaire`를 제안한다 |
| 계획 | `codebase-design`(모듈 경계·인터페이스), `prototype`(버리는 시안으로 상태·화면 확인), `research`(외부 API·규정 조사를 문서로) |
| 구현 | `tdd`(테스트 먼저)를 `prokit-implementer` 위임 지시에 넣는다 |
| 디버깅 (C) | `diagnosing-bugs` |
| 리뷰 추가 관점 | `code-review`(스펙 축). `prokit-reviewer` 게이트를 대신하지 않는다 |
| F 공통화 | `/improve-codebase-architecture`로 구조 개선 후보를 제안한다 |
| 외부 설정 | `wizard`(사람이 할 외부 설정 단계 안내)<!-- edition:pro -->. 배포는 `prokit-deploy`다<!-- /edition --> |
| H(규칙·스킬 수정) | `writing-for-agents` |
| 마무리·인계 | `/handoff`(세션을 넘길 때), `pr`(팀이 PR로 병합할 때만. 기본은 커밋·push) |
| 설명 | `/teach`, `/wait-what` |

- 설치하지 않은 스킬의 단계와 QA, 검증, 마무리 절차는 기본 칸이다.
- 앞에 `/`를 붙인 사용자 호출 스킬은 에이전트가 대신 실행하지 않고 그 단계에서 명령을 제안한다.
- 추가 스킬을 더하거나 빼는 일은 H 라운드에서 `pnpm skills:setup --matt <스킬>`로 한다. 다른 두뇌로 바꿔도 추가 스킬은 지우지 않는다.
- 증거 칸에는 `사용: grilling → docs/specs/…`처럼 적는다. 설치하지 않은 단계는 `사용: 내장(계획): 사유`로 적는다.

## 에이전트
- 없음. 이 두뇌는 에이전트나 프롬프트 틀을 주지 않는다. 서브에이전트는 `prokit-*`와 `specialist-reviewer`만 쓴다.
