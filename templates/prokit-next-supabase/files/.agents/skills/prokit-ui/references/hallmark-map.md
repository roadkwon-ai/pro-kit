# hallmark 단계 매핑

주 UI 스킬이 hallmark일 때(`.dev-cycle.json`의 `uiSkill` 첫 값이 `hallmark`) 단계마다 쓰는 명령과 기록이다. 원본은 [Nutlope/hallmark](https://github.com/Nutlope/hallmark)(MIT)이고 `.agents/skills/hallmark/`에 설치된다. 스킬과 상관없는 절차(카탈로그, 사이트맵, 시각 자산, DESIGN.md 검사)는 [design-flow.md](design-flow.md)에 있다.

## 어디에 맞나
- 새로 만드는 웹 페이지(랜딩, 소개, 가격, 행사, 포트폴리오)에 가장 강하다. AI가 만든 듯한 기본값을 막는 바닥 규칙(Floor), 화면마다 다른 테마 배정, `sloplint` 검사가 핵심이다.
- 일하는 화면(대시보드, 관리, 설정, 목록)은 hallmark의 앱 화면 범위로 한다(`references/flow.md` "App screens", `sloplint --scope app`). 버튼·카드 하나는 컴포넌트 범위다(`--scope component`).
- MVP를 만들고 기능을 하나씩 늘리는 서비스에 잘 맞는다. 첫 MVP에서 핵심 화면을 만들 때 테마를 한 번 배정하고, 기능을 더하는 라운드는 정한 디자인을 지키며 새 화면만 더한다(아래 "기능을 더할 때"). hallmark는 화면 디자인 품질을 맡는다. 요구 정리, 백엔드, 테스트, 배포는 두뇌와 `prokit-*`가 맡는다.
- hallmark는 이름이 불리지 않으면 기존 디자인을 고치지 않는다. `prokit-ui`가 이 지도의 단계를 맡기면 hallmark를 이름으로 부른 것이다(리디자인은 `redesign <대상>`, 진단은 `audit <대상>`).

## 읽고 실행하는 법
- Claude Code는 `.agents/skills/hallmark/SKILL.md`를 Read로 읽고 그 절차대로 한다. Skill 도구로 부르면 개인 전역 hallmark(`npx skills add … -g`)가 먼저 뜰 수 있다(`CLAUDE.md`). Codex는 `$hallmark`, Antigravity와 Grok Build는 같은 `SKILL.md`를 읽는다. hallmark `references/flow.md` "Harnesses" 표는 Codex에 서브에이전트가 없다고 보고 리뷰를 같은 대화에서 하라고 적는다. 이 프로젝트의 Codex는 서브에이전트(`spawn_agent`)를 쓰므로 위임과 리뷰는 그 표가 아니라 대조표대로 한다.
- 아래 `<skill>`은 `.agents/skills/hallmark`다. 스크립트는 프로젝트 루트에서 `node <skill>/scripts/<이름>.mjs`로 실행한다.
- 화면을 찍는 검사(`sloplint --render`, `capture.mjs`)는 Chrome과 `puppeteer-core`가 있어야 돈다. `puppeteer-core`는 둘 중 하나로 둔다. 전역(`npm install -g puppeteer-core`)이거나, 프로젝트 밖 폴더에 받고(`npm install --prefix <폴더> puppeteer-core`) 실행할 때 `HALLMARK_PUPPETEER=<폴더>`를 주는 것이다(hallmark 스크립트가 이 변수를 먼저 본다). 프로젝트 의존성에는 더하지 않는다. 둘 다 없으면 정적 검사만 돌고 그렇다고 출력한다. 이때는 render 통과로 적지 않고, 화면은 `prokit-runtime-checker`의 스크린샷으로 본다. 전역 설치와 폴더 받기는 사용자가 요청할 때만 한다.

## 프로젝트 규칙이 앞선다
hallmark의 흐름이 이 프로젝트 규칙과 부딪히면 프로젝트 쪽을 따른다.
- **순서**: `prokit-ui`가 정한다(기획 → 시각 방향 → 사이트맵과 브리프 확인 → 시각 자산 → 구현 → 리뷰·감사 → 다듬기). hallmark 1단계 "Ask once"의 네 질문(재료, 대상, 쓰임, 어조)은 기획 질문, 스타일 질문, 브리프 확인과 한 번에 묻는다. 답이 없을 때 추정해 바로 만드는 길("go ahead")은 브리프 확인 전에 코드를 쓰지 않는 규칙보다 앞서지 않는다.
- **토큰**: 정본은 `DESIGN.md`와 `packages/ui/src/styles/globals.css`의 shadcn 변수다. `theme.mjs scaffold`가 쓰는 `tokens.css`·`base.css`는 그대로 두지 않는다. 토큰 값은 globals.css의 shadcn 변수로 옮기고(hallmark도 "reuse the project's token names"라고 한다), `base.css`의 바닥 규칙(`overflow-x: clip`, `:focus-visible`, `prefers-reduced-motion`)은 globals.css의 `@layer base`로 옮긴다. 원시 hex와 임의 Tailwind 값 금지는 그대로다.
- **도장**: hallmark 바닥 규칙 15번의 도장 주석(테마, 비평 줄, waive 줄)은 `packages/ui/src/styles/globals.css` 맨 위에 둔다. `sloplint`가 이 주석을 읽는다.
- **DESIGN.md**: 루트에 있으면 hallmark는 테마를 배정하지 않고 그 체계를 따른다(사전 점검 1번 신호). 카탈로그에서 받은 `DESIGN.md`도 같다.
- **서체**: 테마 파일의 서체는 고르되 받는 법은 design-flow "서체"(`next/font`)를 따르고 `<link>`·`@import`로 부르지 않는다. 한글 본문·제목은 design-flow의 한글 서체에서 테마 인상에 가까운 것을 고른다.
- **사진**: hallmark 사진 목록(`theme.mjs photos`, 위키미디어 공용)은 `prokit-ui` 규칙 "이미지 그리기" ④(배치도)로 가기 전에 쓴다. 출처는 푸터와 보고에 적고, 찾은 사진을 그 서비스의 제품, 사람, 공간으로 내세우지 않는다. 시안 이미지(`references/comp.md`, 9번 신호)는 셸에 `TOGETHER_API_KEY`가 있을 때만 hallmark가 쓴다. 비용은 사용자의 Together AI 계정에 청구된다.
- **편집 훅**: `scripts/install-hook.mjs`는 공유 파일 `.claude/settings.json`에 이 기기의 절대 경로를 쓰므로 실행하지 않는다. 검사는 7단계 sweep의 `sloplint`로 한다.
- **기록**: `.hallmark/log.json`(다음 배정이 같은 조합을 피하게 하는 기록), `.hallmark/salt`(테마 배정이 이 프로젝트에서 늘 같은 패를 내게 하는 값), hallmark가 만든 `.hallmark/.gitignore`는 커밋한다. `.hallmark/shots/`와 `preflight.json`은 설치기가 `.gitignore`에 넣었다.

## 기능을 더할 때
- `DESIGN.md`가 있으면 테마를 다시 배정하지 않는다(`theme.mjs deal`을 돌리지 않는다). 사전 점검이 `DESIGN.md`를 읽고 그 체계를 따른다. 테마를 바꾸는 일은 사용자가 리디자인을 요청할 때만 `redesign <대상>`으로 한다.
- 첫 MVP의 `DESIGN.md`에는 최소 토큰(색, 서체, 간격)만 적는다. 사용자 검증 전에는 컴포넌트 규칙까지 고정하지 않는다. 검증 뒤 방향이 정해지면 정본 갱신 단계(lock 내용을 명세 형식으로)로 확정한다.
- 기존 페이지의 디자인, 라우팅, 기능은 그대로 두고 새 기능에 필요한 컴포넌트만 더한다. 이미 있는 `packages/ui` 컴포넌트와 토큰을 먼저 쓴다(`prokit-ui` "컴포넌트와 토큰 재사용").
- 리뷰와 감사는 새 화면 범위로 한다(`sloplint <새 파일·폴더>`). 반응형, 접근성, 기존 화면과 어긋나지 않는지를 본다.

## 이미지
위 "사진"을 따른다. 시안을 먼저 그리는 절차는 `references/comp.md`(9번 신호), 사진과 제품 화면을 고르는 법은 `references/imagery.md`다.

## 단계별 상세
| 단계 | 명령 | 산출물 | 주의 |
|---|---|---|---|
| 맥락 | 0단계 사전 점검: `DESIGN.md`, 브랜드, `package.json`·globals.css, 실행 중인 개발 서버 | 사전 점검 요약(`.hallmark/preflight.json`) | 실패하면 `PRODUCT.md`와 `DESIGN.md`를 직접 읽고 없는 내용을 지어내지 않는다 |
| 기획 | 1단계 "Ask once"와 design-flow "PRODUCT.md" | `PRODUCT.md` | 프로젝트당 1회. 사용자 답을 받기 전에는 만들지 않는다. 재료(스크린샷, 실제 숫자, 인용, 로고)가 없으면 지어내지 않고 빈 자리로 둔다(바닥 규칙 8번) |
| 시각 방향 | `DESIGN.md`가 있으면 그것. 없으면 카탈로그 1\~3위와 "hallmark 테마 배정"(`node <skill>/scripts/theme.mjs deal --genre <장르> --prompt "<요청>" --log .hallmark/log.json`이 낸 셋)을 스타일 질문의 선택지로 낸다 | 고른 카탈로그 스타일이나 테마 slug | 테마를 고르면 `references/themes/<slug>.md`와 그 그림만 읽는다. 테마로 정한 시각 세계는 마감의 정본 갱신에서 `DESIGN.md`로 기록한다 |
| 설계 | 2단계 Shape(재료 목록, 할 일, `theme.mjs draw`)와 5단계 Picks 블록 | 사이트맵 `docs/briefs/site-map.md`, 브리프 `docs/briefs/<화면>.md`(Picks 블록 포함) | 사용자 확인 뒤 구현한다. design-flow "사이트맵과 상호작용"을 따른다 |
| 시각 자산 | 서체는 design-flow, 사진은 `theme.mjs photos "<주제>" --theme <slug>`, 실제 제품 화면은 `scripts/capture.mjs` | `apps/web/public/images/<화면>/`, 푸터 출처 | 위 "사진" |
| 개발 | 4단계 Load와 6단계 Build(히어로 먼저, `references/patterns.md`) | 코드 | `prokit-ui-builder` 위임 지시에 `SKILL.md`의 "The Floor"(바닥 규칙), 읽을 references 목록, 고른 테마 파일, 위 "프로젝트 규칙이 앞선다"를 넣는다. 히어로 리뷰(`--stage hero`, 새 맥락)는 Main이 서브에이전트로 띄운다 |
| 리뷰 | 7단계 Sweep: `node <skill>/scripts/sloplint.mjs <바꾼 파일·폴더> --genre <장르> --render --url http://localhost:<포트>/<경로>`(앱 화면은 `--scope app`), `references/gates.md` 5절의 판단 게이트, 마감 리뷰(`references/review-finish.md`, 새 맥락 서브에이전트) | `sloplint: N FAIL, N REFLEX, N WARN` 요약 줄, 마감 리뷰의 첫 낱말(`ship`·`fix`·`rebuild`·`recapture`) | 기록 파일을 남기지 않으므로 `sloplint` 출력 전체와 마감 리뷰 결과를 `tasks/evidence/ui-review-<YYYYMMDD-HHmm>.md`에 저장한다. 마감 리뷰는 메인 세션에서 띄운다 |
| 감사 | `audit <대상>`(`references/redesign.md`): 게이트별 지적 보고, 파일은 바꾸지 않는다. 이어서 `web-design-guidelines`는 `prokit-reviewer`(ui) | 감사 보고 | 감사 보고, 마지막 `sloplint` 요약 줄, `web-design-guidelines` 위반 목록을 `tasks/evidence/ui-audit-<YYYYMMDD-HHmm>.md`에 저장한다 |
| 마감 | 지적 반영: 바닥 규칙(Floor) 지적은 고치고, Reflex는 고치거나 도장에 waive 사유를 적고, Finish는 답한다 | 정리된 코드 | 고치는 일은 `prokit-ui-builder`에 맡긴다. 재확인은 1회 |
| 정본 갱신 | `lock the system`(`references/design-md.md`)이 정하는 내용을 [DESIGN.md 명세](https://github.com/google-labs-code/design.md) 형식으로 쓴다 | `DESIGN.md` | hallmark의 `design.md` 형식(머리 없는 절)은 쓰지 않는다. 이미 있으면 덮어쓰지 않고 merge하고, design-flow "DESIGN.md 검사"를 한다 |

## 통과 기준
- `sloplint`의 FAIL이 0이고 REFLEX는 고쳤거나 도장에 waive 사유가 있다. hallmark도 "Nothing ships with an open FAIL or an open REFLEX"라고 한다.
- `packages/ui/src/styles/globals.css`를 검사 대상에 넣으면 Better-T-Stack이 만든 shadcn 기본 `.dark` 블록이 FAIL로 잡힌다(그 블록을 테마로 읽지 못한다). 같은 명령을 기준 커밋(`git stash`가 아니라 `git worktree`나 `git show <base>:<파일>`로 꺼낸 사본)에도 돌려 기준 FAIL 수를 함께 적고, 통과 기준은 이번 변경에서 생긴 FAIL 0이다. 증거 예: `sloplint 31 FAIL(모두 기준 커밋과 같은 .dark 블록, 이번 변경 0)`.
- 마감 리뷰의 첫 낱말이 `ship`이거나, `fix`의 지적을 반영하고 재확인했다.
- `web-design-guidelines` 위반은 고치거나 사유를 적고 보류한다.
- 화면을 찍는 검사가 돌지 않았으면 통과로 적지 않는다. 정적 검사 결과와 `render 미실행: <사유>`를 적는다.
- `.dev-cycle.json`의 `ui.auditMin`·`ui.a11yMin`은 impeccable 점수 기준이라 hallmark에는 쓰지 않는다.

## B 케이스 행별 증거 예시
| 행 | 증거 예시 |
|---|---|
| 디자인 맥락 확인 | `hallmark 사전 점검 → PRODUCT.md 없음, DESIGN.md 없음 → 기획 질문과 스타일 후보(카탈로그 2개, 테마 Coral·Grid·Newsprint) 질문, 사용자 테마 Coral 선택(2026-11-02)` |
| 화면 브리프 확정 | `docs/briefs/landing.md (Picks: Workbench, 테마 Coral, 사용자 확인 2026-11-02)` 또는 `N/A: 버튼 간격만 조정` |
| 구현 | `apps/web/src/app/page.tsx 외 4개, globals.css 토큰 6개와 도장, 서체 Pretendard(local), 사진 2장(위키미디어 공용, 푸터 출처)` |
| 디자인 리뷰 | `sloplint 0 FAIL, 1 REFLEX(47b waive), 3 WARN, 마감 리뷰 ship, tasks/evidence/ui-review-20261102-1530.md` |
| 디자인 감사 | `hallmark audit Floor 0 FAIL, Reflex 1, web-design-guidelines 위반 2, tasks/evidence/ui-audit-20261102-1540.md` |
| 수정과 다듬기 | `위반 2건 반영, REFLEX 47b 사유 기록` |
| 재확인 | `sloplint 0 FAIL, 0 REFLEX, 스크린샷 갱신` |
| DESIGN.md 갱신 | `lock 내용을 명세 형식으로 씀 → 색 토큰 6개, lint 오류 0` 또는 `N/A: 토큰 변화 없음` |
