# impeccable 단계 매핑

## 모드
impeccable은 화면마다 모드를 고른다. 앱 화면(대시보드, 목록, 설정, 편집기)은 **Operate**, 랜딩과 가격 페이지는 **Persuade**, 문서와 도움말은 **Read**다. 모드는 화면의 surface brief에 남고, 제품 전체가 아니라 화면 기준으로 정한다.

## 단계별 상세
| 단계 | 명령 | 산출물 | 주의 |
|---|---|---|---|
| 기획 | `init` (별칭 `teach`) | `PRODUCT.md` (Platform, Stack, Users, Purpose, Positioning, Brand Commitments, Principles, Accessibility) | 프로젝트당 1회. 이미 있으면 다시 만들지 않는다 |
| 시각 방향 | 카탈로그: `use-design-md` → new-work. 직접: new-work → 마감에서 `document` | `DESIGN.md` (토큰 frontmatter + 섹션) | 카탈로그에서 고르면 받은 파일이 시각 세계다. impeccable은 이미 있는 `DESIGN.md`를 정해진 세계로 보고 세계를 다시 고르지 않는다(new-work 2·3절). 아래 "디자인 카탈로그에서 고르기"를 따른다. 직접 정하는 새 세계는 만든 뒤 마감에서 기록한다(new-work 5절). BTS는 기본 화면이 있으므로 seed 모드를 쓰지 않는다. 기존 화면을 넓히는 작업이면 `DESIGN.md`가 없어도 막지 않는다. 기존 `DESIGN.md`를 조용히 덮어쓰지 않는다 |
| 설계 | `shape <기능>` | 사이트맵 `docs/briefs/site-map.md`와 확정된 브리프 `docs/briefs/<화면>.md` (코드 없음) | 사용자 확인 또는 한 번의 수정 뒤 멈춘다. 아래 "사이트맵과 상호작용"을 따른다 |
| 시각 자산 | 서체 받기, comp-led면 `generate-image`로 comp와 plate | `apps/web/src/fonts/`, `apps/web/public/images/<화면>/`, `.impeccable/mocks/` | 아래 "시각 자산"을 따른다 |
| 개발 | new-work, 필요 시 `layout`, `typeset`, `colorize`, `clarify`, `harden`, `onboard`, `adapt`, `animate`, 밋밋하면 `bolder` | 코드 | 편집 직전에 `reference/craft-floor.md`를 로드한다 |
| 리뷰 | `critique <대상>` | Design Health 점수, P0~P3 지적, `.impeccable/critique/`에 기록 | 독립 평가자 두 명을 서브에이전트로 띄우므로 메인 세션에서 실행한다 |
| 리뷰 | `audit <대상>` | 접근성, 성능, 테마, 반응형, 일관성 각 0~4점, 합계 20점 | 권장 후속 명령 목록을 준다 |
| 리뷰 | `web-design-guidelines` 스킬 | Vercel Web Interface Guidelines 위반 목록 (`file:line`) | 규칙을 원격에서 받아 온다. 받지 못하면 그렇다고 적는다 |
| 마감 | `polish <대상>` | 정리된 코드 | critique 결과를 입력으로 쓴다. 검증은 한 번 모아서 하고 재확인은 1회 |
| 정본 갱신 | `document` | `DESIGN.md` 갱신 | refresh, overwrite, merge 중 무엇을 할지 사용자에게 묻는다. 카탈로그에서 들여온 파일은 merge만 한다. 쓴 뒤 아래 "DESIGN.md 검사"를 한다 |
| 관리 | `hooks on`, `hooks status`, `doctor` | 편집 detector, 설정 점검 | `CONTEXT_STALE` 안내는 보고만 하고 사용자가 요청할 때 고친다. `hooks`는 스킬 호출 대신 `.agents/skills/impeccable/scripts/impeccable hooks <동작>`으로 실행한다(`prokit-ui` 규칙) |

Claude Code에서는 `.agents/skills/impeccable/SKILL.md`를 Read로 읽고 그 절차대로 명령을 실행한다(예: `critique apps/web/src/app/todos`). Skill 도구로 부르면 개인 전역 impeccable이 먼저 뜰 수 있다(`CLAUDE.md`). Codex에서는 `$impeccable critique apps/web/src/app/todos`처럼 부른다. Antigravity와 Grok Build도 같은 `SKILL.md`를 읽고 그 절차대로 실행한다.

## 디자인 카탈로그에서 고르기
`DESIGN.md`가 없고 화면이 아직 BTS 기본 화면뿐인 첫 새 작업, 또는 시각 세계를 바꾸는 리디자인에서 쓴다. 좁은 개선이나 이미 만든 화면을 넓히는 작업에서는 쓰지 않는다. 그때는 있는 `DESIGN.md`나 만든 화면을 따른다(impeccable: "Missing DESIGN.md alone does not make a project greenfield"). 카탈로그는 셋이다.

| 카탈로그 | 범위 | 후보 목록 | 원문 | 미리 보기 |
|---|---|---|---|---|
| getdesign.kr | 한국 서비스 | `https://www.getdesign.kr/llms.txt` (분야, 한 줄 설명) | `https://www.getdesign.kr/services/<slug>/DESIGN.md` | `https://www.getdesign.kr/services/<slug>` |
| awesome-design-md (getdesign.md의 원본 저장소) | 해외 제품. AI, 개발자 도구, 핀테크, 커머스, 자동차, 1990년대 웹 | `https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/README.md`의 Collection 절 (분야별 제목, 한 줄 설명) | `https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/<slug>/DESIGN.md` | `https://getdesign.md/<slug>/design-md` |
| Refero Styles | 해외 제품 웹사이트 1,300개 이상. 랜딩, 가격, 브랜드 페이지처럼 시각 연출이 큰 화면에 특히 강하다 | 분류 페이지 `https://styles.refero.design/design-styles/<분류>`. 분류 목록은 `https://styles.refero.design/sitemaps/collections.xml` | 페이지의 "Download DESIGN.md" 버튼 (3번) | `https://styles.refero.design/style/<id>` |

1. **후보 추리기**: `PRODUCT.md`(없으면 요청 내용)에서 서비스 분야, 주 화면의 모드(Operate, Persuade, Read), 정보 밀도, 어조, UI 언어를 뽑는다.
   - 목록은 `curl -s`로 받는다. 화면 유형과 관계없이 세 카탈로그를 모두 본다. 화면 유형은 순위에만 쓴다: 한국어 서비스는 getdesign.kr, 해외 제품 톤이나 개발자 도구는 awesome-design-md, 랜딩·가격·브랜드 페이지(Persuade)나 강한 시각 연출은 Refero 후보를 앞에 둔다. 보고에 카탈로그마다 본 목록과 찾은 후보를 적는다.
   - awesome-design-md: `<slug>`는 항목 링크(`https://getdesign.md/<slug>/design-md`)에서 뽑고, 후보 원문 frontmatter의 `description`으로 확인한다. frontmatter가 없는 파일은 토큰을 산문에서 옮겨야 하므로 추천 후보에서 뒤로 둔다. `getdesign.md/<slug>/design-md`는 없는 slug에도 빈 화면을 200으로 준다. 있는지는 README 목록과 원문 주소(없으면 404)로 판단한다.
   - Refero: 분류 페이지 전부(`collections.xml`의 `design-styles/` 주소)에서 `/style/<id>` 링크와 짧은 설명을 뽑고, 후보의 `/style/<id>` 페이지를 `curl`로 받아 설명, Brand 색, 서체를 확인한다. 사이트 검색은 robots.txt가 막은 `/api/`를 불러서 돌아가므로 쓰지 않는다.
   - 브랜드를 지목하면("넷플릭스처럼") 세 카탈로그 모두에서 그 브랜드를 찾는다: getdesign.kr `llms.txt`, awesome-design-md README, Refero 분류 페이지 전부.
     - Refero 분류 페이지에는 스타일 일부만 실리고, 분류 이름이 실제 화면 성격과 다를 수 있다(예: Netflix는 "에디토리얼" 분류에만 있다). 분류에 없으면 웹 검색 `site:styles.refero.design <브랜드> design system`으로 `/style/<id>`를 찾는다. 페이지 제목이 브랜드 이름이 아닐 수 있으니(Disney+는 "Watch new Originals") 원문 본문의 브랜드 이름으로 확인한다.
     - 찾은 원문이 1위다. 같은 브랜드의 스타일이 여럿이면 모두 후보로 두고 원문 첫머리의 기준 화면과 추출일을 함께 적는다.
     - 세 곳 모두 없으면 "카탈로그에 없음"이라고 적고 같은 분야 후보를 낸다.
   - 목록에 없는 브랜드는 지어내지 않는다.
2. **묻기**: 1~3위를 한 질문으로 제시한다.
   - 후보마다 카탈로그 이름, 이유 한 줄(화면 유형, 밀도, 색 전략, 서체), 미리 볼 주소(위 표)를 붙인다.
   - 대표 색과 서체는 후보 원문에서 확인한 값으로 적는다. frontmatter에 `colors.primary`가 없으면 본문 Colors 절이 브랜드 색이라고 한 값을 적고(Refero는 Color Palette의 Brand), 그것도 없으면 "원문에 대표 색 없음"이라고 적는다. 사용자는 이 값을 보고 대표 색을 정한다.
   - "카탈로그 없이 impeccable로 정하기"를 선택지에 넣는다.
   - 같은 질문에서 대표 색을 원본대로 쓸지 제품 색으로 바꿀지 묻는다. 같은 업종에서 원본 색을 그대로 쓰면 원래 브랜드와 헷갈린다.
   - 사용자가 추천대로 하라고 하면 1위를 쓴다.
3. **받기**: `.agents/skills/use-design-md/SKILL.md`를 읽고 그 절차로 원문(위 표)을 받는다. 토큰 값이 바뀌면 안 되므로 WebFetch 대신 `curl`을 쓴다.
   - Refero는 원문 주소가 없다. 버튼을 누르면 브라우저가 파일을 만든다. `agent-browser --session refero-<id> open https://styles.refero.design/style/<id>` 다음 `agent-browser --session refero-<id> download '[aria-label="Download DESIGN.md"]' /tmp/refero-<id>.md`로 받고 그 세션을 닫는다. 세션과 파일 이름에 `<id>`를 넣는 것은 다른 에이전트가 동시에 다른 스타일을 받을 때 페이지와 파일이 섞이지 않게 하려는 것이다. 받지 못하면 `curl`로 받은 페이지 HTML의 DESIGN.md 탭 `<pre><code>` 내용을 쓴다. HTML 엔티티와 `\n`(줄바꿈 이스케이프)을 풀면 버튼으로 받은 파일과 같다. 그것도 없으면 사용자에게 그 페이지의 버튼으로 받아 프로젝트 루트에 두라고 요청하고 멈춘다.
4. **저장**: 프로젝트 루트에 `DESIGN.md`로 둔다.
   - `name`은 제품 이름으로 바꾸고 카탈로그 메타(`slug`, `logo`, `created_at`, `last_updated`)는 지운다. frontmatter 바로 아래에 출처 주소와 받은 날짜를 한 줄 적는다.
   - 로고와 원래 브랜드·디자인 시스템 이름은 화면에 쓰지 않는다(`use-design-md`의 `references/apply-guide.md` 6절).
   - Refero 원문에는 Google 명세 frontmatter가 없다(lint: `No YAML content found`). 본문은 두고 맨 위에 frontmatter를 만든다. 값은 본문 표에서 그대로 옮기고 표에 없는 값은 만들지 않는다. `colors`는 Tokens — Colors 표(Brand 색이 `primary`, 나머지는 표 이름을 kebab-case로), `typography`는 Type Scale 표, `rounded`는 Border Radius 표(`50%` 같은 `%` 값은 명세 단위가 아니라 옮기지 않는다), `spacing`은 Spacing Scale 표, `components`는 Components 절에서 값이 적힌 것이다. 제목 줄(`# <브랜드> — Style Reference`)은 제품 이름으로 바꾼다. `Similar Brands` 절(다른 브랜드 이름)과 `Quick Start` 절(shadcn 변수 대신 `--color-<이름>`, `--text-<역할>` 토큰을 새로 만드는 예시)은 지운다.
   - 전용 서체는 파일이 적은 대체 서체나 공개 서체로 바꾼다. Refero는 서체마다 `Substitute`를 적어 둔다.
   - 아이콘은 원래 브랜드의 세트 대신 `packages/ui/components.json`의 `iconLibrary`를 쓴다.
   - 저장한 뒤 아래 "DESIGN.md 검사"의 lint를 실행한다.
5. **적용**: 첫 구현 행에서 토큰을 `packages/ui/src/styles/globals.css`의 shadcn 변수로 옮긴다(apply-guide 1~3절). 글자 크기 토큰은 새 이름(`--text-body-md`)을 만들지 않고 Tailwind 기본 이름(`--text-sm` 등)의 값을 바꾼다. `cn()`은 모르는 `text-<이름>`을 글자색으로 보고, 같은 요소의 색 클래스와 겹치면 지운다(`cn("text-body-md text-muted-foreground")` → `text-muted-foreground`). 이후 impeccable은 이 파일을 정해진 세계로 보고 shape와 구현을 이어 간다. 마감의 `document`는 파일을 덮어쓰지 않고 merge로 프로젝트가 바꾼 토큰만 더한다.

## 리디자인
시각 세계를 바꾸는 요청이다. impeccable은 리디자인에서 제품 사실, 문구, 기능은 지키고 옛 모양은 반례로 본다("Redesign replaces").
1. **지금 화면 진단**: 개발 서버에서 데스크톱(1440×900)과 모바일(390×844) 스크린샷을 찍고 `critique`한다. 스크린샷은 `tasks/evidence/<화면>/before-*.png`에 둔다.
2. **새 세계 고르기**: 위 "디자인 카탈로그에서 고르기"로 1~3위를 낸다. 옛 모양과 같은 계열만 내지 않는다.
3. **브리프**: `shape`의 브리프에 "버릴 것"(critique 약점, 옛 모양의 특징)과 "지킬 것"(제품 사실, 문구, 기능, 접근성)을 적고, 아래 "시각 자산" 계획을 더한다.
4. **구현과 확인**: 시각 자산을 준비하고 구현한 뒤 critique, polish, 재확인을 한다. 보고에는 전후 스크린샷을 나란히 두고 critique 점수 변화를 적는다. 카탈로그에서 새로 받은 `DESIGN.md`는 옛 파일을 대신한다.

## 사이트맵과 상호작용
화면 하나를 만들어도 그 화면에서 나가는 길은 모두 실제로 이어져야 한다. 눌렀는데 404가 나거나 "준비 중"이 뜨면 화면 전체가 미완성으로 보인다.

1. **사이트맵**: 브리프보다 먼저 `docs/briefs/site-map.md`를 쓴다. 페이지마다 경로, 목적, 주요 내용, 들어오고 나가는 링크, 버튼과 그 동작을 적는다. 헤더·사이드바 메뉴, 푸터 링크, 아바타(프로필), 첫 화면의 주요 버튼이 가는 곳을 빠짐없이 적는다. 서비스 흐름(예: 둘러보기 → 가입 → 첫 사용 → 설정)에 필요한 페이지는 요청에 없어도 후보로 올리고, 빼는 페이지는 이유를 적는다.
2. **링크와 버튼**: 모두 실제 페이지나 실제 동작으로 이어진다. 이번 범위에서 만들지 않는 페이지는 링크를 두지 않는다. 404, "준비 중" 배지, "샘플이라 동작하지 않는다"는 안내, `#`만 걸린 링크를 두지 않는다. 데이터가 필요한 동작은 `prokit-web`, `prokit-api`로 서버와 잇는다. 서버를 만들지 않는 시안이면 예시 데이터와 클라이언트 상태로 동작하게 하고 브리프에 그렇게 적는다. 폼은 빈 값과 잘못된 값에 오류 문구를 보여 주고, 제출하면 완료 상태로 바뀐다.
3. **상호작용 계획**: 아래 요소를 어디에 쓰는지 브리프에 적는다. 모달, 드로어, 툴팁, 드롭다운은 `packages/ui`의 shadcn 프리미티브를 쓴다.
4. **확인**: 마감 전에 개발 서버에서 페이지마다 데스크톱과 모바일 스크린샷을 찍는다. 브라우저(`agent-browser`)로 모든 링크와 버튼을 눌러 404, 콘솔 오류, 반응 없는 버튼이 없는지 본다. 모바일 햄버거 메뉴와 모달도 열고 닫아 본다.

| 요소 | 쓰는 곳 |
|---|---|
| hover, focus-visible | 누를 수 있는 모든 요소. 카드는 살짝 떠오르거나 테두리 색이 바뀐다 |
| 툴팁 | 아이콘만 있는 버튼, 줄여 쓴 값, 그래프의 점과 막대, 처음 보는 용어 |
| 모달 | 되돌리기 어려운 동작의 확인(삭제, 해지, 결제), 짧은 입력(초대, 새로 만들기) |
| 드로어·시트 | 목록 항목의 상세와 편집, 모바일의 필터 |
| 햄버거 메뉴 | 모바일에서 헤더 메뉴가 3개 이상일 때. Esc와 바깥 클릭으로 닫고, 열린 동안 포커스를 메뉴 안에 둔다 |
| 사이드바 | 앱 화면의 데스크톱 주 메뉴. 접으면 아이콘에 툴팁을 단다. 모바일에서는 하단 탭이나 햄버거 메뉴로 바꾼다 |
| 토스트 | 저장, 복사, 신청처럼 끝난 일을 알릴 때 |

## 이름과 문구
- 화면 문구는 소리 내어 읽어도 자연스러운 한국어로 쓴다. 번역투("\~에 대해", "\~를 통해"), 명사 나열, 억지 대구, 과장된 AI 유행어("혁신적인", "차세대")를 쓰지 않는다. 버튼 문구는 동사로 끝낸다(예: "정산하기", "무료로 시작하기").
- 제품 이름이 아직 없거나, 첫 화면 헤드라인을 새로 쓰거나, 사용자가 이름이나 문구를 바꾸려 하면 후보를 뽑아 고르게 한다.
  1. 같은 분야 서비스 8\~12곳(국내와 해외)의 이름과 실제 헤드라인을 웹에서 확인하고, 잘 통하는 패턴을 2\~4줄로 정리한다.
  2. 후보 3~4개를 만든다. 후보마다 이름, 헤드라인(큰 글자로 한두 줄), 그 아래 한 문장, 고른 이유를 붙인다. 이름은 한국어와 영어를 모두 후보로 올린다. 분야에 따라 영어 이름이 더 어울리기도 한다. 지금 이름을 두고 문구만 바꾸는 후보도 하나 넣는다.
  3. 이름 후보는 같은 분야나 가까운 분야의 알려진 제품과 겹치는지 웹에서 검색한다. 겹치면 빼고 다른 후보를 낸다. 상표 등록 여부는 확인하지 못했다고 적는다.
  4. 스타일 선택, 브리프 확인과 함께 한 번에 묻는다. 고른 이름은 `PRODUCT.md`의 Brand Commitments와 화면 전체(메타데이터, 헤더, 푸터, 이미지 alt)에 반영한다.

## 시각 자산
구현 전에 서체, 이미지, 아이콘, 모션을 정해 브리프에 적는다. 기본 서체, 가는 제목, CSS 도형으로 흉내 낸 그림이 화면을 가장 싸 보이게 한다.

### 서체
- 역할마다 하나씩 3개 이하로 둔다: 본문(한글 고딕), 제목(표시 서체), 필요하면 숫자·코드. 카탈로그 `DESIGN.md`의 서체가 전용 서체면 아래 공개 서체에서 인상이 가까운 것을 고른다. 라틴 전용 서체는 impeccable의 서체 선택을 따른다.
- 한글 서체 후보. 모두 상업 사용과 웹 임베딩이 되는 OFL이다.

  | 받는 곳 | 서체 |
  |---|---|
  | GitHub `orioncactus/pretendard` | Pretendard. 중립 고딕, 가변 45~930. 본문 기본. 전체 가변 판 2MB(`packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2`), 한국어 subset 정적 판은 굵기당 약 270KB(`packages/pretendard/dist/web/static/woff2-subset/Pretendard-<굵기>.subset.woff2`, 한글 2,780자). 문구가 정해진 랜딩은 쓰는 굵기의 subset 판, 사용자 입력을 보여 주는 화면은 전체 가변 판. `PretendardStd`는 한글이 없는 라틴 전용 판이라 한국어 화면에 쓰지 않는다 |
  | GitHub `sun-typeface/SUIT` | SUIT. 기하학적 고딕, 가변 (릴리스 `SUIT-Variable-woff2.zip`) |
  | GitHub `wanteddev/wanted-sans` | Wanted Sans. 폭이 넓고 굵은 제목에 강한 고딕 (`packages/wanted-sans/fonts/webfonts/variable/complete/woff2/WantedSansVariable.woff2`) |
  | Google Fonts | 명조: Hahmlet(가변 100~900), Noto Serif KR, Gowun Batang, Nanum Myeongjo, Song Myung. 굵은 제목: Black Han Sans, Do Hyeon, Gasoek One, Bagel Fat One. 둥근·손글씨: Jua, Dongle, Gaegu, Nanum Pen Script. 고딕: IBM Plex Sans KR, Gothic A1, Asta Sans |

- **받기**: Google Fonts에 있는 서체는 `next/font/google`로 부른다. 빌드할 때 파일을 받아 자체 호스팅하고, 한글 서체도 `subsets: ["latin"]`이면 나머지 글자는 unicode-range 조각으로 필요할 때 받는다. 그 밖의 서체는 woff2(가변 우선)를 `apps/web/src/fonts/`에 받아 라이선스 파일(`OFL.txt`)과 함께 두고 `next/font/local`로 부른다. CDN `<link>`나 CSS `@import`로 부르지 않는다. Pretendard와 SUIT는 OFL에 Reserved Font Name이 있어 글자를 줄이거나 고친 파일에 원래 이름을 쓸 수 없다. 배포처가 낸 파일을 그대로 쓴다.
- **Persuade 첫 화면의 제목**은 화면에서 가장 큰 요소다. 데스크톱 72\~160px, 모바일 40\~64px를 `clamp()`로 잇는다. 한글 제목은 자간 -0.02\~-0.05em, 행간 1.05\~1.2, `word-break: keep-all`, `text-wrap: balance`로 둔다. 굵기 300 이하의 한글 고딕은 제목에 쓰지 않는다. Operate 화면은 본문 14\~16px에 숫자는 `tabular-nums`다.

### 이미지
- 이미지를 그릴 수 있으면 새 화면을 comp-led로 만든다. 방향 comp를 먼저 그려 확인받고, comp를 재어 구현하며, 사진·일러스트·제품 영역은 plate 이미지로 만든다(new-work 6절, `reference/visualize.md`). 그리는 길의 순서(하네스 이미지 도구 → `OPENAI_API_KEY`와 `impeccable generate-image` → Codex CLI와 `gpt-image` 스킬 → 배치도)와 키 읽기는 `prokit-ui` 규칙 "이미지 그리기"와 "키"를 따른다.
- 셸에 `OPENAI_API_KEY`가 있으면 `impeccable context`가 `IMAGE_GEN_AVAILABLE`을 알린다. 이때 `generate-image`의 기본 모델은 `gpt-image-2.5-flare`이고 비용은 사용자의 OpenAI API 계정에 청구된다. 다른 길로 그릴 때는 context가 이 값을 알리지 않아도 comp-led로 진행한다.
- 화면에 쓰는 이미지는 `apps/web/public/images/<화면>/`에 webp(`cwebp -q 82` 또는 macOS `sips`)로 두고 `next/image`로 부른다. `width`와 `height`(또는 `fill`과 `sizes`), `alt`를 주고 첫 화면 대표 이미지에는 `priority`를 준다.
- 실존 인물, 브랜드 로고, 읽히는 글자는 이미지에 넣지 않는다. 글자는 HTML로 올린다.
- 사람이 나오는 사진은 팔다리가 붙거나 늘어나고, 옷끈이 엉키기 쉽다. 프롬프트에 자세를 구체적으로 적는다(어느 다리가 바닥을 딛고 어느 손이 어디를 잡는지). "앉아서 하는 풋워크"처럼 서로 맞지 않는 자세는 쓰지 않는다. 해부학 조건(팔 둘·다리 둘, 손가락 다섯, 자연스러운 관절과 비율, 장비나 다른 사람과 섞이지 않음)과 단순한 옷을 함께 적는다. 후보를 2장 이상 만들고, 사람 부분을 원본 크기로 잘라 확인한 뒤 고른다. 다리를 모아 옆에서 찍어 다리가 하나로 보이는 구도도 다시 만든다.

### 아이콘
`packages/ui/components.json`의 `iconLibrary` 한 벌에서 고르고, 한 화면에서 선 굵기와 크기를 맞춘다. 아이콘만 있는 버튼에는 `aria-label`을 준다.

### 모션
- Persuade 화면: 첫 화면 등장(1초 안), 스크롤에 따른 섹션 등장, 제품이 하는 일을 보여 주는 연출 하나(파형, 숫자, 전후 비교)를 `animate`로 만든다. Operate 화면: 상태 변화와 피드백에만 150~250ms로 쓴다.
- 페이지가 여럿이면 목록의 순차 등장, 숫자 올라가기, 탭·필터 전환, 모달·드로어 열림, 완료 상태, 페이지 사이 전환도 계획한다. 페이지 전환은 React `<ViewTransition>`으로 만든다(`SKILL.md` 개발 행).
- CSS(`@keyframes`, `animation-timeline: view()`)와 IntersectionObserver를 먼저 쓰고, 애니메이션 라이브러리는 CSS로 안 되는 연출에만 더한다. `transform`과 `opacity`만 움직인다.
- `prefers-reduced-motion: reduce`에서는 움직임을 끄고 최종 상태를 보여 준다.

## DESIGN.md 검사
`DESIGN.md`는 Google [DESIGN.md 명세](https://github.com/google-labs-code/design.md)를 따른다(impeccable `document`, getdesign.kr, awesome-design-md. Refero 원문은 저장할 때 frontmatter를 붙여 맞춘다). impeccable은 명세 검사기를 돌리지 않으므로 `DESIGN.md`를 쓰거나 고친 뒤 프로젝트 루트에서 명세의 CLI로 확인한다. 설치하지 않고 실행하며, 실행이 실패하면 그렇다고 적고 막지 않는다.

- **lint**: `pnpm dlx @google/design.md lint DESIGN.md`. 결과별 처리는 다음과 같다.
  - `missing-primary`: 대표 색(사용자가 제품 색을 골랐으면 그 색)을 `colors.primary`로 더한다. shadcn `--primary`로 옮길 값이다.
  - `token-like-ignored`, `unknown-key`: 명세 밖에 놓여 무시되는 토큰이다. 명세 자리(`components` 등)로 옮긴다.
  - `contrast-ratio`: 그 색 쌍을 globals.css로 옮길 때 WCAG AA에 맞추고 대조표에 적는다.
  - `rounded`의 `%` 값 오류: getdesign.kr 원문은 카탈로그가 알려진 한계로 적어 둔 값이라 바꾸지 않는다. Refero에서 옮긴 frontmatter라면 그 값을 뺀다.
  - `section-order`: 절을 명세 순서(Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts)로 옮긴다. 내용은 바꾸지 않는다.
  - `No YAML content found`: frontmatter가 없다. 저장 단계의 Refero 방식으로 만든다.
  - `orphaned-tokens`, 명세에 없는 하위 토큰 경고, info: 카탈로그가 일부러 넓게 둔 것이라 고치지 않는다.
- **diff** (카탈로그에서 들여온 파일에 `document` merge를 할 때): 실행 전에 `cp DESIGN.md /tmp/DESIGN.before.md`로 이전 판을 두고, 끝난 뒤 `pnpm dlx @google/design.md diff /tmp/DESIGN.before.md DESIGN.md`를 실행한다. 토큰 묶음마다 `removed`가 비어 있어야 merge다. 비어 있지 않으면 지워진 토큰을 되살리고 보고한다. `regression`은 lint 건수만 비교하므로 이 확인을 대신하지 않는다.

## B 케이스 행별 증거 예시
| 행 | 증거 예시 |
|---|---|
| impeccable context 실행 | `impeccable context → PRODUCT.md 있음, DESIGN.md 없음 → 후보 greeting·remember·직접 정하기 중 사용자 greeting 선택(2026-10-01), use-design-md로 받아 DESIGN.md 저장, lint 오류 0 경고 0(primary 추가)` 또는 `… → 직접 정하기, 마감에서 document` |
| shape 브리프 확정 | `shape → docs/briefs/todos.md (사용자 확인 2026-10-01)` 또는 `N/A: 버튼 간격만 조정` |
| 구현 | `apps/web/src/app/todos/*.tsx 3개, packages/ui 토큰 1개, 서체 Pretendard(local)·Hahmlet(google), plate 3장(gpt-image-2.5-flare), 모션 2개(reduced-motion 끔)` |
| 타입·린트·빌드 | `pnpm check-types → exit 0, pnpm exec biome check . → exit 0, pnpm build → exit 0` |
| 런타임·스크린샷 | `next-dev-loop /todos → get_errors 0, tasks/evidence/todo-list/desktop.png, mobile.png, agent-browser로 링크 12개·버튼 20개 누름 → 404 0, 반응 없는 버튼 0` |
| critique | `Design Health 31/40, P0 0, P1 2 (빈 상태 문구, 대비)` |
| audit | `audit 15/20, 접근성 3/4 → 기준 미달, polish에서 해결` |
| 수정과 polish | `P1 2건 반영, 대비 토큰 조정` |
| 재확인 | `audit 17/20, 접근성 4/4, 스크린샷 갱신` |
| DESIGN.md 갱신 | `document merge → 색 토큰 1개 추가, lint 오류 0, diff removed 없음`(카탈로그에서 들여온 파일) 또는 `N/A: 토큰 변화 없음` |
