# 두뇌: spec-kit

github/spec-kit. 헌법(프로젝트 원칙) → 스펙 → 명확화 → 계획 → 작업 목록 → 구현 순서를 꼼꼼히 밟는 스펙 주도형이다. 요구가 크고 엄격해 문서를 단계마다 남겨야 하는 프로젝트에 맞는다. 설치기가 `uvx --from specify-cli specify init`으로 프로젝트에 설치하므로 설치할 때만 uv가 필요하다. 실행 중에는 프로젝트의 `.specify/scripts`만 쓴다.

- Claude Code: 스킬 10개(`.claude/skills/speckit-*`, `/speckit-specify`처럼 부른다)
- Codex: 스킬 10개(`.agents/skills/speckit-*`, `$speckit-specify`)
- Antigravity·Grok Build: `.agents/skills`의 같은 스킬
- 설치기는 `--integration-options='--events false'`로 설치해 `.claude/settings.json`에 훅을 쓰지 않는다. `AGENTS.md`·`CLAUDE.md`도 고치지 않는다(`agent-context` 확장은 설치하지 않는다).

| 단계 | Claude Code | Codex·Antigravity·Grok Build |
|---|---|---|
| 원칙(프로젝트당 1회) | `/speckit-constitution`으로 `.specify/memory/constitution.md`를 쓴다. `AGENTS.md`·`prokit-*` 규칙과 부딪히는 원칙은 넣지 않는다 | `speckit-constitution` |
| 요구 명확화 | `/speckit-specify`로 `specs/<번호>-<이름>/spec.md`를 쓰고, 모호하면 `/speckit-clarify` | `speckit-specify`, `speckit-clarify` |
| 계획 | `/speckit-plan`(`plan.md`, `research.md`, `data-model.md`), `/speckit-tasks`(`tasks.md`), 품질 점검 `/speckit-checklist`, 일관성 확인 `/speckit-analyze` | `speckit-plan`, `speckit-tasks`, `speckit-checklist`, `speckit-analyze` |
| 구현 | `/speckit-implement`로 `tasks.md`를 차례로 처리한다. 위임은 `prokit-implementer`로 하고 행마다 대조표 증거를 남긴다 | `speckit-implement`. Codex는 네이티브 `prokit-implementer` |
| 남은 일 확인 | `/speckit-converge`가 코드와 스펙을 비교해 남은 일을 `tasks.md`에 더한다. 리뷰 행을 대신하지 않는다 | `speckit-converge` |

- 맡지 않는 단계(디버깅, 리뷰 추가 관점, QA, 검증)는 기본 칸이다. 용어·설계 질문은 `grilling`·`domain-modeling`이다.
- `/speckit-specify`는 질문을 3개로 줄이고 나머지를 가정으로 채운다. 가정 가운데 결과를 바꾸는 것은 `/speckit-clarify`나 `grilling`으로 확인한다. `/speckit-plan`이 연구 서브에이전트를 띄우려 하면 메인이 직접 조사한다. `/speckit-implement`가 `.gitignore` 등 범위 밖 파일을 고치려 하면 하지 않는다.
- `/speckit-taskstoissues`는 쓰지 않는다. 작업을 GitHub 이슈로 게시하는데, 프로킷은 진행을 대조표와 `tasks/plan.md`에 둔다.
- `git` 확장(기능 브랜치 자동 생성)은 설치하지 않는다. 브랜치와 커밋은 `prokit-dev-cycle` 5절을 따른다.
- 프로킷 스펙·계획 경로 대신 `specs/<번호>-<이름>/`을 써도 된다. 대조표 증거에 그 경로를 적는다. 진행 계획의 Task 하나가 스펙 하나가 되게 나누면 추적이 쉽다.
- 다른 두뇌로 바꾸면 설치기가 스킬과 `.specify/`의 도구 파일만 지우고 `specs/`와 `.specify/memory/`(헌법)는 인계 자료로 남긴다. 다시 고르면 남긴 문서를 그대로 쓴다.

## 에이전트
- 없음. 이 두뇌는 에이전트나 프롬프트 틀을 주지 않는다. 서브에이전트는 `prokit-*`와 `specialist-reviewer`만 쓴다.
