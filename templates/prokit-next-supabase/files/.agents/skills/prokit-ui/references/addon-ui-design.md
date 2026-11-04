# ui-design 보조 (선택 묶음 `ui-design`)

`.agents/skills/law-of-proximity/`가 있을 때만 읽는다. 원본은 [Owl-Listener/designer-skills](https://github.com/Owl-Listener/designer-skills)(MIT)의 `ui-design` 플러그인에 든 열아홉 스킬이다. 설치기는 skills CLI로 스킬만 받으므로 플러그인 명령(`/design-screen`, `/type-system`, `/color-palette`, `/responsive-audit`, `/platform-audit`)은 없다. 그 명령이 묶던 스킬은 아래 "명령 대신 읽는 스킬"대로 읽는다. 묶음이 없는데 사용자가 원하면 `pnpm skills:setup --optional ui-design` 설치를 제안한다.

## 언제 쓰나
- 종류는 검수 보조다. 다른 보조와 함께 쓴다. 각 스킬의 설명에 "언제 쓰고 언제 다른 스킬을 쓸지"가 적혀 있다.
- 설치되어 있으면 브리프를 쓰는 화면마다 쓴다. 설계 단계에서 간격·그리드·타입·색 체계를 정하고, 리뷰 단계에서 정돈과 반응형을 본다. 화면 수가 많은 앱(대시보드, 관리, 목록)에 특히 맞다. 다른 보조나 주 UI 스킬이 간격을 봤어도 리뷰 결과(`ui-design 지적 N`)나 `ui-design 미실행: 사유`를 적는다(audit이 디자인 리뷰 행 증거에서 찾는다).
- 게슈탈트 법칙은 기본 AI용 [게슈탈트 지침](gestalt.md)과 같은 축이다. 주 UI 스킬이 `none`이면 그 지침이 정본이고 이 스킬들은 법칙별 상세로 읽는다.

| 묶음 | 스킬 |
|---|---|
| 게슈탈트·지각 법칙 | `law-of-proximity`, `law-of-similarity`, `law-of-closure`, `law-of-continuity`, `law-of-figure-ground`, `law-of-common-region`, `von-restorff-effect`, `aesthetic-usability` |
| 시스템 | `visual-hierarchy`, `spacing-system`, `typography-scale`, `readable-measure`, `layout-grid`, `color-system`, `dark-mode-design`, `responsive-design`, `platform-conventions`, `data-visualization`, `illustration-style` |

## 명령 대신 읽는 스킬
| 하려는 일 | 읽는 스킬 |
|---|---|
| 화면 설계(옛 `/design-screen`) | `layout-grid`, `visual-hierarchy`, `typography-scale`, `color-system`, `spacing-system`, `responsive-design`, `dark-mode-design` |
| 타입 체계(옛 `/type-system`) | `typography-scale`, `visual-hierarchy`, `responsive-design`, `spacing-system`, `layout-grid` |
| 팔레트(옛 `/color-palette`) | `color-system`, `dark-mode-design`, `data-visualization` |
| 반응형 점검(옛 `/responsive-audit`) | `responsive-design`, `layout-grid`, `typography-scale`, `spacing-system`, `visual-hierarchy` |
| 플랫폼 관례 점검(옛 `/platform-audit`) | `platform-conventions`, `responsive-design` |

스킬 설명이 다른 플러그인의 스킬(`jakobs-law`, `theming-system`, `icon-system` 등)을 가리켜도 설치하지 않는다. 필요하면 사용자에게 알린다.

## 프로젝트 규칙이 앞선다
- 간격, 타입 크기, 색, 다크 모드 값은 `DESIGN.md`와 `globals.css` 토큰이 정본이다. 스킬로 정한 체계는 마감의 정본 갱신에서 토큰으로 옮기고, 코드에는 토큰만 쓴다.
- 반응형 점검의 화면 찍기와 너비는 `prokit-verify`가 한다.

## 단계 대응
| `prokit-ui` 단계 | ui-design | 남기는 곳 |
|---|---|---|
| 설계 | 새 화면이 체계(간격, 타입, 그리드, 색)를 새로 정해야 하면 "화면 설계"나 "타입 체계", "팔레트"의 스킬로 정해 브리프에 적는다. `DESIGN.md`에 이미 있으면 다시 정하지 않는다 | 브리프 |
| 리뷰 | 주 UI 스킬의 리뷰 뒤 "반응형 점검"과 게슈탈트 법칙으로 덩어리, 정렬, 강조 하나를 본다. 지적은 법칙 이름과 함께 적는다 | 리뷰 보고서에 `ui-design 지적 N`과 법칙 이름 |
| 정본 갱신 | 정한 체계를 `DESIGN.md`와 토큰에 merge한다(덮어쓰기 전에 묻는다) | `DESIGN.md` |
