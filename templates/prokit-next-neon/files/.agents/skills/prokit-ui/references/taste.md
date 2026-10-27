# taste-skill 보조 (선택 묶음 `taste`)

`.agents/skills/design-taste-frontend/`(선택 묶음 `taste`)가 있을 때만 읽는다. 원본은 [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)의 `design-taste-frontend`다. 갤러리 사이트를 분석한 라이브러리에서 방향을 뽑고, 실제 브라우저 검사와 스크린샷 비평으로 AI가 만든 듯한 기본 화면을 피하게 한다. 묶음이 없는데 사용자가 원하면 `pnpm skills:setup --optional taste` 설치를 제안한다.

## 언제 쓰나
- 사용자가 그 화면에 taste를 고른 경우만 쓴다. 요청에 "taste로", "taste-skill로"가 있거나, 시각 방향 질문에서 "taste-skill로 방향 뽑기"를 고른 화면이다. 고른 기록은 브리프에 적는다.
- 고르지 않은 화면에서 `design-taste-frontend`가 불려도 그 절차를 따르지 않고 `prokit-ui` 흐름대로 한다. taste-skill은 "디자인", "리디자인" 요청이면 스스로 불리게 쓰여 있다.
- 화면 종류는 taste 기준을 따른다. 읽고 스크롤하는 페이지(랜딩, 소개, 포트폴리오, 행사)는 SKILL.md의 page run, 일하는 화면(대시보드, 관리, 설정, 목록)은 `references/app-screens.md`의 app run이다.

## 우선순위
- 순서는 `prokit-ui`가 정한다: init → 시각 방향 → 사이트맵과 브리프 확인 → 시각 자산 → 구현 → critique·audit → polish. taste의 "애매하면 묻지 말고 정한 뒤 한 줄로 알린다"는 브리프 확인 전에 코드를 쓰지 않는 규칙보다 앞서지 않는다.
- `DESIGN.md`, 토큰 규칙(원시 hex와 임의 Tailwind 값 금지), `packages/ui`의 shadcn 프리미티브, `iconLibrary`, 접근성 기준이 taste house rule과 부딪히면 프로젝트 쪽을 따른다. 그 규칙만 `inspect.mjs --allow <규칙>`으로 풀고 브리프와 보고에 적는다.
- critique·audit과 통과 기준(`ui.auditMin`, `ui.a11yMin`)은 impeccable 그대로다. taste 검사는 그 앞에 더하는 검사이고 대신하지 않는다.

## 실행 환경
- 명령은 프로젝트 루트에서 `TASTE_SKILL_HISTORY=.taste-skill/history.json`을 붙여 실행한다. 붙이지 않으면 `draw.mjs`가 홈 폴더의 `~/.taste-skill/history.json`에 기록한다. 작업 파일은 `.taste-skill/`에 둔다(설치기가 `.gitignore`에 넣는다).
- 아래 `<skill>`은 `.agents/skills/design-taste-frontend`다. `inspect.mjs`는 Node 22 이상과 Chrome·Edge·Chromium 중 하나가 있어야 돈다. 표준 위치에 없으면 `CHROME_PATH`로 실행 파일을 준다. 브라우저가 없으면 `lint.mjs`만 돌리고 화면은 `prokit-verify`의 브라우저로 찍은 뒤, 검사를 못 했다고 보고에 적는다.
- `assets.mjs`는 네트워크가 필요하고 키는 쓰지 않는다.

## 단계 대응
| `prokit-ui` 단계 | taste | 남기는 곳 |
|---|---|---|
| 시각 방향 | page: `node <skill>/scripts/draw.mjs --sector <분야> --brief "<한 줄>" --sections <역할들> --options 3`으로 방향 셋을 받아 스타일 질문의 선택지(이름과 이유 한 줄)로 낸다. 고르면 같은 인자에 `--direction <id>`를 붙여 시트를 받는다. app: `draw.mjs --app --kind <종류> --brief "<제품>" --out .taste-skill/app`. 카탈로그 `DESIGN.md`가 있거나 브랜드 색·서체가 정해져 있으면 `--keep palette,type`으로 구성만 받는다 | 시트는 `.taste-skill/direction.json`, 방향 id와 고른 이유는 브리프. `DESIGN.md`는 "직접 정하기"처럼 마감 `document`로 기록한다 |
| 설계 | SKILL.md 1단계 인벤토리(그 서비스에만 있는 것 8~12개), 2단계 argument(섹션마다 주장과 증거), 4단계 idea 문장과 live thing, 5단계 copy deck | shape 브리프의 절로 넣는다. 사용자 확인 뒤에 구현한다 |
| 시각 자산 | 서체: 라틴 서체는 시트대로 고르되 받는 법은 impeccable-map "서체"의 받기(`next/font`)를 따르고 시트의 `<link>`는 쓰지 않는다. 한글 본문·제목은 impeccable-map "서체"의 한글 서체에서 시트 인상에 가까운 것을 고른다. 이미지: `prokit-ui` "이미지 그리기"의 ①~③이 없으면 ④ 배치도로 가기 전에 `node <skill>/scripts/assets.mjs "<인벤토리 검색어>"`로 공개 아카이브 사진을 찾고 `--get <ref> --to apps/web/public/images/<화면>`으로 받는다 | 출처 줄(`assets.mjs --credits --to <같은 폴더>`)은 푸터와 보고. 찾은 사진을 그 서비스의 제품, 사람, 공간으로 내세우지 않는다 |
| 개발 | 시트와 `references/`의 `type.md`, `colour.md`, `layout.md`, `motion.md`를 따른다. `motion.md`가 권하는 새 의존성(gsap, lenis, three)은 요청 범위일 때만 더하고, 페이지 전환은 `prokit-ui`의 `<ViewTransition>` 규칙이 우선한다. `assets/`의 CSS·JS는 그대로 복사하지 않고 토큰과 shadcn 컴포넌트로 옮긴다 | 대조표 구현 행에 방향 id |
| 리뷰 | `node <skill>/scripts/lint.mjs <이번 화면의 파일이나 폴더>`와 `inspect.mjs <개발 서버 주소> --out .taste-skill/inspect`(app은 `--app`). FAIL을 고친 뒤 impeccable `critique`·`audit`을 한다. 이번 범위 밖 파일(`packages/ui`, Better-T-Stack 기본 화면)에서 걸린 것은 고치지 않고 보고에 적는다 | 대조표 critique 행 증거에 `taste inspect FAIL 0, WARN <수>`를 함께 적는다(critique 점수와 `.impeccable/critique/` 기록 파일 경로는 그대로 적는다) |

리디자인이면 critique 전에 `inspect.mjs <주소> --out .taste-skill/before`로 지금 화면을 재고, 마감 뒤 `--out .taste-skill/after`로 다시 재어 전후를 보고한다.
