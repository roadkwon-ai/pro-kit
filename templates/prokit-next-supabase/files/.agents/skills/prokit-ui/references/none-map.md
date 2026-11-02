# 기본 AI 단계 매핑

UI 스킬을 고르지 않았을 때(`.dev-cycle.json`의 `uiSkill`이 `none`) 기본 AI가 디자인 단계마다 하는 일과 기록이다. 기준은 두 가지다.
- `frontend-design`([anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design), Apache-2.0): 시각 방향과 만드는 법. `pnpm skills:setup --ui-skill none`이 `.agents/skills/frontend-design/`에 설치한다.
- [gestalt.md](gestalt.md): 화면이 의도한 덩어리로 묶여 보이는지 진단하고 고치는 규칙.

스킬과 상관없는 절차(`PRODUCT.md`, 카탈로그, 사이트맵, 시각 자산, DESIGN.md 검사)는 [design-flow.md](design-flow.md)에 있다.

## 읽는 법
- `.agents/skills/frontend-design/SKILL.md`를 Read로 읽는다. Skill 도구로 부르지 않는다. 같은 이름의 개인 스킬이나 플러그인판이 먼저 뜰 수 있다(`CLAUDE.md`). Codex, Antigravity, Grok Build도 같은 파일을 읽는다.
- 리뷰와 마감 전에 [gestalt.md](gestalt.md)를 읽는다.
- `frontend-design`이 설치되지 않았으면(`pnpm skills:check`의 `UI 스킬:` 줄) 게슈탈트 지침과 design-flow만으로 하고, 보고에 설치 명령(`pnpm skills:setup --ui-skill none`)을 적는다.

## 프로젝트 규칙이 앞선다
- **순서**: `prokit-ui`가 정한다(기획 → 시각 방향 → 사이트맵과 브리프 확인 → 시각 자산 → 구현 → 리뷰·감사 → 다듬기). `frontend-design`의 "주제를 정해 확인받기"는 기획 질문과 한 번에 묻는다. 브리프 확인 전에는 코드를 쓰지 않는다.
- **정한 디자인**: `DESIGN.md`가 있으면 그것이 시각 세계다. `frontend-design`의 "새롭고 과감한 선택"은 새 작업에서 `DESIGN.md`가 없을 때만 한다. 기능을 더하는 라운드는 `DESIGN.md`의 토큰과 `packages/ui` 컴포넌트를 그대로 쓴다.
- **토큰과 서체**: 색은 `packages/ui/src/styles/globals.css`의 shadcn 변수로, 서체는 design-flow "서체"(`next/font`, 한글 서체)로 둔다. 원시 hex와 임의 Tailwind 값은 쓰지 않는다.
- **글**: 화면 문구는 `frontend-design`의 "More on writing in design"과 design-flow "이름과 문구"를 따른다. 쓰는 사람 쪽 말, 능동형, 오류와 빈 화면에서 다음 행동을 알려 준다.

## 단계별 상세
| 단계 | 할 일 | 산출물 |
|---|---|---|
| 맥락 | `PRODUCT.md`, `DESIGN.md`, `frontend-design` `SKILL.md`를 읽는다 | 없음 |
| 기획 | `PRODUCT.md`가 없으면 design-flow "PRODUCT.md"대로 묻는다. 주제, 쓰는 사람, 화면의 주된 일을 초안으로 함께 보여 준다(`frontend-design` "Ground your designs in the subject matter") | `PRODUCT.md` |
| 시각 방향 | `DESIGN.md`가 있으면 그것. 없으면 카탈로그 1\~3위와 "카탈로그 없이 직접 정하기"를 낸다. 직접 정하기는 `frontend-design`의 두 단계다. ① 계획: 색 4\~6개(이름과 hex), 서체와 역할, 배치 개념(한 문장과 ASCII 와이어프레임, 정렬), 이 화면만의 원칙. ② 브리프에 비춰 검토: 계획의 축이 흔한 기본값("For calibration"의 다섯 가지)과 겹치면 고치고 무엇을 왜 고쳤는지 적는다 | 브리프의 "시각 방향" 절 |
| 설계 | 사이트맵과 화면마다 브리프를 쓴다. 브리프에 게슈탈트 0단계(목적, 주인공 하나, 의도한 그룹과 개수)를 적는다 | `docs/briefs/site-map.md`, `docs/briefs/<화면>.md` |
| 개발 | `prokit-ui-builder`에 맡긴다. 위임 지시에 브리프, `DESIGN.md`, 읽을 파일(`frontend-design` `SKILL.md`, [gestalt.md](gestalt.md) 3절)을 넣는다. 그룹 안쪽 간격은 좁게, 그룹 사이는 2배 이상 넓게 잡는다 | 코드 |
| 리뷰 | 메인 세션에서 데스크톱·모바일 스크린샷(`prokit-runtime-checker`)을 보고 게슈탈트 1절 작업 순서와 4절 점검표로 진단한다. 이어서 `frontend-design`의 자기 비평을 한다(흔한 기본값이 남았나, 장식 하나를 뺄 수 있나, 대담함을 한 곳에만 썼나). 보고서는 게슈탈트 6절 형식으로 `tasks/evidence/ui-review-<YYYYMMDD-HHmm>.md`에 저장하고 맨 위에 `게슈탈트 위반 N`(발견한 문제 수)을 적는다 | 리뷰 보고서 |
| 감사 | `web-design-guidelines`를 `prokit-reviewer`(ui)에 맡기고 `tasks/evidence/ui-audit-<YYYYMMDD-HHmm>.md`에 저장한다 | 감사 보고서 |
| 마감 | 고칠 것을 한 번에 모아 `prokit-ui-builder`에 맡긴다. 고치는 수단은 약한 것부터 쓴다(간격 → 색·모양 → 박스 → 선). 게슈탈트 5절 금지 사항(문구·데이터 임의 변경, 브랜드 색·서체 무시, 주인공 둘)을 지킨다. 재확인은 1회 | 정리된 코드 |
| 정본 갱신 | 계획의 토큰(색, 서체, 간격)을 `DESIGN.md`에 명세 형식으로 쓰고 design-flow "DESIGN.md 검사"를 한다. 덮어쓰기 전에 묻는다 | `DESIGN.md` |

## 통과 기준
- 게슈탈트 필수 3문항이 모두 "예"다. 덩어리 수가 의도한 그룹 수와 같고, 같은 일을 하는 것은 같은 모양이며 주인공 하나만 튀고, 지금 볼 것과 나중에 볼 것이 구분된다.
- 게슈탈트 위반은 고치거나 사유를 적고 보류한다. 고치면서 박스·선·색이 늘지 않았는지 본다.
- `web-design-guidelines` 위반은 고치거나 사유를 적는다.
- 점수 기준(`ui.auditMin`·`ui.a11yMin`)은 impeccable 점수에만 쓰므로 여기서는 보지 않는다.

## B 케이스 행별 증거 예시
| 행 | 증거 예시 |
|---|---|
| 디자인 맥락 확인 | `PRODUCT.md 없음, DESIGN.md 없음, frontend-design SKILL.md 읽음 → 기획 질문과 스타일 후보(카탈로그 2개, 직접 정하기) 질문, 사용자 직접 정하기 선택(2026-11-02)` |
| 화면 브리프 확정 | `docs/briefs/landing.md (주인공: 예약 버튼, 의도한 그룹 4, 사용자 확인 2026-11-02)` 또는 `N/A: 버튼 간격만 조정` |
| 구현 | `apps/web/src/app/page.tsx 외 3개, globals.css 토큰 5개, 서체 Pretendard(local)` |
| 디자인 리뷰 | `게슈탈트 위반 3(근접성 2, 유사성 1), 덩어리 6→4, tasks/evidence/ui-review-20261102-1530.md` |
| 디자인 감사 | `web-design-guidelines 위반 2, tasks/evidence/ui-audit-20261102-1540.md` |
| 수정과 다듬기 | `위반 5건 반영(간격 3, 버튼 모양 1, 대비 1)` |
| 재확인 | `게슈탈트 위반 0, 덩어리 4(의도 4), 스크린샷 갱신` |
| DESIGN.md 갱신 | `계획 토큰을 명세 형식으로 씀 → 색 5개, 서체 2개, lint 오류 0` 또는 `N/A: 토큰 변화 없음` |
