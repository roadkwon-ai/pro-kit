# impeccable 단계 매핑

주 UI 스킬이 impeccable일 때(`.dev-cycle.json`의 `uiSkill` 첫 값이 `impeccable`이거나 기록이 없을 때) 단계마다 쓰는 명령과 기록이다. 스킬과 상관없는 절차(카탈로그, 사이트맵, 시각 자산, DESIGN.md 검사)는 [design-flow.md](design-flow.md)에 있다.

## 모드
impeccable은 화면마다 모드를 고른다. 앱 화면(대시보드, 목록, 설정, 편집기)은 **Operate**, 랜딩과 가격 페이지는 **Persuade**, 문서와 도움말은 **Read**다. 모드는 화면의 surface brief에 남고, 제품 전체가 아니라 화면 기준으로 정한다.

## 단계별 상세
| 단계 | 명령 | 산출물 | 주의 |
|---|---|---|---|
| 기획 | `init` (별칭 `teach`) | `PRODUCT.md` (Platform, Stack, Users, Purpose, Positioning, Brand Commitments, Principles, Accessibility) | 프로젝트당 1회. 이미 있으면 다시 만들지 않는다 |
| 시각 방향 | 카탈로그: `use-design-md` → new-work. 직접: new-work → 마감에서 `document`<!-- edition:pro -->. 기존 디자인 유지: [design-flow.md](design-flow.md) "기존 디자인으로 DESIGN.md 만들기"<!-- /edition --> | `DESIGN.md` (토큰 frontmatter + 섹션) | 카탈로그에서 고르면 받은 파일이 시각 세계다. impeccable은 이미 있는 `DESIGN.md`를 정해진 세계로 보고 세계를 다시 고르지 않는다(new-work 2·3절). [design-flow.md](design-flow.md) "디자인 카탈로그에서 고르기"를 따른다. 직접 정하는 새 세계는 만든 뒤 마감에서 기록한다(new-work 5절). Better-T-Stack은 기본 화면이 있으므로 seed 모드를 쓰지 않는다. 기존 화면을 넓히는 작업이면 `DESIGN.md`가 없어도 막지 않는다. 기존 `DESIGN.md`를 조용히 덮어쓰지 않는다 |
| 설계 | `shape <기능>` | 사이트맵 `docs/briefs/site-map.md`와 확정된 브리프 `docs/briefs/<화면>.md` (코드 없음) | 사용자 확인 또는 한 번의 수정 뒤 멈춘다. [design-flow.md](design-flow.md) "사이트맵과 상호작용"을 따른다 |
| 시각 자산 | 서체 받기, comp-led면 `generate-image`로 comp와 plate | `apps/web/src/fonts/`, `apps/web/public/images/<화면>/`, `.impeccable/mocks/` | [design-flow.md](design-flow.md) "시각 자산"과 아래 "이미지"를 따른다 |
| 개발 | new-work, 필요 시 `layout`, `typeset`, `colorize`, `clarify`, `harden`, `onboard`, `adapt`, `animate`, 밋밋하면 `bolder` | 코드 | 편집 직전에 `reference/craft-floor.md`를 로드한다 |
| 리뷰 | `critique <대상>` | Design Health 점수, P0~P3 지적, `.impeccable/critique/`에 기록 | 독립 평가자 두 명을 서브에이전트로 띄우므로 메인 세션에서 실행한다 |
| 리뷰 | `audit <대상>` | 접근성, 성능, 테마, 반응형, 일관성 각 0~4점, 합계 20점 | 권장 후속 명령 목록을 준다. 기록을 남기지 않으므로 보고서 전체와 web-design-guidelines 위반 목록을 `tasks/evidence/ui-audit-<YYYYMMDD-HHmm>.md`에 저장하고 증거에 그 경로를 적는다 |
| 리뷰 | `web-design-guidelines` 스킬 | Vercel Web Interface Guidelines 위반 목록 (`file:line`) | 규칙을 원격에서 받아 온다. 받지 못하면 그렇다고 적는다 |
| 마감 | `polish <대상>` | 정리된 코드 | critique 결과를 입력으로 쓴다. 검증은 한 번 모아서 하고 재확인은 1회 |
| 정본 갱신 | `document` | `DESIGN.md` 갱신 | refresh, overwrite, merge 중 무엇을 할지 사용자에게 묻는다. 카탈로그에서 들여온 파일은 merge만 한다. 쓴 뒤 [design-flow.md](design-flow.md) "DESIGN.md 검사"를 한다 |
| 관리 | `hooks on`, `hooks status`, `doctor` | 편집 detector, 설정 점검 | `CONTEXT_STALE` 안내는 보고만 하고 사용자가 요청할 때 고친다. `hooks`는 스킬 호출 대신 `.agents/skills/impeccable/scripts/impeccable hooks <동작>`으로 실행한다(`prokit-ui` 규칙) |

Claude Code에서는 `.agents/skills/impeccable/SKILL.md`를 Read로 읽고 그 절차대로 명령을 실행한다(예: `critique apps/web/src/app/todos`). Skill 도구로 부르면 개인 전역 impeccable이 먼저 뜰 수 있다(`CLAUDE.md`). Codex에서는 `$impeccable critique apps/web/src/app/todos`처럼 부른다. Antigravity와 Grok Build도 같은 `SKILL.md`를 읽고 그 절차대로 실행한다.

## 통과 기준
- critique의 P0와 P1은 해결하거나 사유를 적고 보류한다.
- audit 총점은 `.dev-cycle.json`의 `ui.auditMin` 이상, 접근성 점수는 `ui.a11yMin` 이상이다(기본값은 `prokit-ui` 규칙 "통과 기준").

## 이미지
- comp-led 절차는 new-work 6절과 `reference/visualize.md`다.
- 셸에 `OPENAI_API_KEY`가 있으면 `impeccable context`가 `IMAGE_GEN_AVAILABLE`을 알린다. 이때 `generate-image`의 기본 모델은 `gpt-image-2.5-flare`이고 비용은 사용자의 OpenAI API 계정에 청구된다. 다른 길로 그릴 때는 context가 이 값을 알리지 않아도 comp-led로 진행한다.

## 리디자인
진단은 `critique`다. impeccable은 리디자인에서 옛 모양을 반례로 본다("Redesign replaces"). 절차는 [design-flow.md](design-flow.md) "리디자인"이다.

## B 케이스 행별 증거 예시
| 행 | 증거 예시 |
|---|---|
| 디자인 맥락 확인 | `impeccable context → PRODUCT.md 있음, DESIGN.md 없음 → 후보 greeting·remember·직접 정하기 중 사용자 greeting 선택(2026-10-01), use-design-md로 받아 DESIGN.md 저장, lint 오류 0 경고 0(primary 추가)` 또는 `… → 직접 정하기, 마감에서 document` |
| 화면 브리프 확정 | `shape → docs/briefs/todos.md (사용자 확인 2026-10-01)` 또는 `N/A: 버튼 간격만 조정` |
| 구현 | `apps/web/src/app/todos/*.tsx 3개, packages/ui 토큰 1개, 서체 Pretendard(local)·Hahmlet(google), plate 3장(gpt-image-2.5-flare), 모션 2개(reduced-motion 끔)` |
| 타입·린트·빌드 | `pnpm check-types → exit 0, pnpm exec biome check . → exit 0, pnpm build → exit 0` |
| 런타임·스크린샷 | `next-dev-loop /todos → get_errors 0, tasks/evidence/todo-list/desktop.png, mobile.png, agent-browser로 링크 12개·버튼 20개 누름 → 404 0, 반응 없는 버튼 0` |
| 디자인 리뷰 | `Design Health 31/40, P0 0, P1 2 (빈 상태 문구, 대비), .impeccable/critique/2026-10-22T12-30-00Z__apps-web-src-app-todos.md` |
| 디자인 감사 | `audit 15/20, 접근성 3/4, tasks/evidence/ui-audit-20261022-1230.md → 기준 미달, polish에서 해결` |
| 수정과 다듬기 | `P1 2건 반영, 대비 토큰 조정` |
| 재확인 | `audit 17/20, 접근성 4/4, 스크린샷 갱신` |
| DESIGN.md 갱신 | `document merge → 색 토큰 1개 추가, lint 오류 0, diff removed 없음`(카탈로그에서 들여온 파일) 또는 `N/A: 토큰 변화 없음` |
