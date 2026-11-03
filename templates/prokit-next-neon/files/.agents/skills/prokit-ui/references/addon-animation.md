# 애니메이션 보조 (선택 묶음 `animation`)

`.agents/skills/animate/`가 있을 때만 읽는다. 원본은 [emilkowalski/skills](https://github.com/emilkowalski/skills)(MIT)의 다섯 스킬이다. 묶음이 없는데 사용자가 원하면 `pnpm skills:setup --optional animation` 설치를 제안한다.

| 스킬 | 하는 일 |
|---|---|
| `emil-design-eng` | UI 다듬기와 애니메이션 결정 원칙(빈도, 목적, easing, 시간 순서), 컴포넌트 규칙. 리뷰는 Before·After·Why 표로 낸다 |
| `animate` | 애니메이션 하나를 일곱 단계 순서로 정해 만든다: 움직여야 하나, 목적, 도구, 속성, 곡선과 시간, 중단과 퇴장, 움직임 줄이기 |
| `improve-animations` | 코드베이스의 모션을 감사해 우선순위 표를 내고, 사용자가 고른 항목만 실행 계획으로 쓴다. 소스는 고치지 않는다 |
| `apple-design` | 스프링, 제스처, 드래그 속도 이어받기, 러버밴딩, 재질과 깊이. 시트·스와이프가 많은 화면에 맞다 |
| `animation-vocabulary` | "팝오버 열릴 때 통통 튀는 거" 같은 설명을 정확한 용어로 바꾼다. 브리프의 모션 계획과 위임 지시를 쓸 때 쓴다 |

## 언제 쓰나
- 종류는 모션 보조다. 방향 보조와 함께 쓴다.
- 설치되어 있으면 모션을 넣거나 고치는 화면의 설계·개발 단계에 쓴다. 마감의 모션 감사(`improve-animations`)는 사용자가 "애니메이션 다듬어줘", "모션 점검해줘"라고 하거나 브리프에 모션 감사가 있을 때 한다.
- 효과가 가장 큰 곳은 앱의 작은 기능 요소(폼 제출, 토스트, 드롭다운, 호버, 드로어)다. 랜딩의 스크롤 연출은 `awwwards` 보조가 맡는다.

## 프로젝트 규칙이 앞선다
- 화면 전환과 공유 요소 애니메이션은 `prokit-ui`의 `<ViewTransition>` 규칙이 앞선다(선택 묶음 `motion`).
- 이름이 같은 impeccable의 `animate` 명령과 이 묶음의 `animate` 스킬은 다르다. 이 묶음이 설치되어 있으면 모션 설계와 구현 지시는 이 스킬(`.agents/skills/animate/SKILL.md`)로 하고, impeccable 지도의 개발 단계에서 `animate` 명령은 부르지 않는다.
- 곡선과 시간은 `globals.css` 토큰으로 둔다(`--ease-out` 같은 변수). 임의 Tailwind 값을 새로 넣지 않는다.
- `animate`의 도구 순서(CSS transition, `@starting-style`, CSS animation, WAAPI, Motion)를 따르고, 새 의존성(`motion`)은 앞 도구로 안 될 때만 브리프에 적고 확인받아 더한다. `animate`가 부르라고 하는 `pick-ui-library`, `review-animations`, `find-animation-opportunities`는 설치하지 않는다. 필요하면 사용자에게 알린다.
- `improve-animations`의 계획 파일은 스킬이 말하는 `plans/` 대신 `docs/plans/animations/NNN-<slug>.md`에 쓴다. `execute`(worktree에서 다른 에이전트가 실행)는 쓰지 않는다. 고른 계획은 이 프로젝트의 라운드에서 `prokit-ui-builder`에 위임한다.
- 첫 응답으로 정해진 한 줄만 내는 스킬(`emil-design-eng`, `animate`, `apple-design`)은 질문 없이 불리면 그 줄만 낸다. 부를 때 대상과 할 일을 함께 준다.

## 단계 대응
| `prokit-ui` 단계 | 애니메이션 보조 | 남기는 곳 |
|---|---|---|
| 설계 | 브리프의 모션 계획을 `animate` 1\~2단계(움직여야 하나, 목적)로 거른다. 하루 수백 번 쓰는 동작(단축키, 커맨드 팔레트)은 움직이지 않는다. 남긴 모션은 `animation-vocabulary`의 용어로 적는다 | 브리프의 모션 계획 |
| 개발 | 위임 지시에 `.agents/skills/animate/SKILL.md`(제스처·시트가 있으면 `apple-design/SKILL.md`도)를 넣는다. 움직임 줄이기 대응은 처음부터 함께 만든다 | 대조표 구현 행 |
| 리뷰 | 모션을 바꾼 화면이면 `.agents/skills/emil-design-eng/SKILL.md`를 읽고 그 리뷰 형식(Before·After·Why 표)과 끝의 체크리스트로 본다 | 리뷰 보고서에 `motion 지적 N` |
| 마감 | 모션 감사를 요청받았으면 `improve-animations`로 감사하고, 우선순위 표를 사용자에게 보여 고르게 한 뒤 계획을 쓴다. 계획 실행은 다음 라운드의 위임이다 | `docs/plans/animations/` |
