# 컨셉으로 화면 만들기 교재 설계 (로드맵 14번)

작성일: 2026-10-02
상태: 대화에서 승인(2026-10-02). 공통 교재 1권 + 샘플 쪽 8개, bts-starter-kit 수정을 먼저 한다.
상위 설계: [튜토리얼 교재 설계](2026-10-01-bts-starter-kit-tutorials-design.md) · 할 일: [로드맵](../plans/2026-10-01-tutorials-roadmap.md) 14번

용어: 독자에게 보이는 글에서는 "교재" 대신 "튜토리얼", "표지" 대신 "첫 쪽"이라고 쓴다(2026-10-02 사용자 결정). 이 문서의 "교재"는 같은 뜻이다.

## 1. 방향

- 샘플을 똑같이 복제하는 교재가 아니다. 독자가 컨셉 한두 문장으로 자기만의 서비스 화면(HTML)을 만들게 한다. 갤러리의 샘플 8개는 같은 과정으로 나온 결과 예시다.
- 샘플을 만들 때 스타일과 대표 색은 정하지 않고 bts-ui 추천을 받았다. 이름·헤드라인·사진은 결과를 보고 따로 다듬기 요청을 했다. 다만 기획 문서(`PRODUCT.md`)와 첫 브리프는 시연자가 미리 썼고(`VERIFICATION.md` 843·915행), dev-cycle 대조표는 빼고 만들었다. 교재는 컨셉 → 에이전트 질문에 답하기 → 다듬기 순서로 쓰고, 샘플 쪽의 "실제로 거친 과정"에는 이 차이를 그대로 적는다(2026-10-02 교재 검토).
- 샘플은 neon 템플릿을 설치한 프로젝트에서 DB를 띄우지 않고 예시 데이터로 화면만 만든 뒤 정적 HTML로 내보냈다. bts-ui 스킬(스타일 추천, 시안, critique)이 그 프로젝트 안에 설치되므로 화면만 만들 때도 템플릿 프로젝트를 만든다.
- 실제 서비스(로그인, DB 저장)로 만드는 프롬프트는 화면만 만드는 프롬프트와 따로 둔다.

## 2. 교재 구성 (`tutorials/samples/`)

```
tutorials/samples/
├── README.md          표지. 맨 위에 샘플로 만들어 보기(샘플 8개 표), 이어서 가장 쉬운 방법(프롬프트 하나), 다듬기·장별로 자세히·실제 서비스 안내
├── 01-<주제>.md …     ③ 장별로 자세히
├── refine.md          ② 다듬기 프롬프트
├── real-service.md    ④ 실제 서비스로 만들기
├── <샘플>.md ×8       샘플 쪽
└── assets/            스크린샷(.webp), 도식
```

### 2.1 가장 쉬운 방법 (표지 맨 위. 2026-10-02 사용자 피드백으로 바꿈)
사용자 의도: 비개발자도 프롬프트 하나로 bts-starter-kit의 하네스(규칙, 스킬, 에이전트)를 거쳐 전문가 수준의 결과를 얻는다는 점이 이 kit을 쓰는 이유다. 설치와 단계가 많으면 kit을 쓸 이유가 없다. 표지와 허브 소개에 이 점을 강조한다.
- 시작하기는 에이전트 설치와 로그인만. 작업 폴더 `~/projects`에서 `claude --dangerously-skip-permissions`(Codex `codex --yolo`)로 연다. 보안 주의는 `reference/claude-code-and-codex.md` "묻지 않고 진행하게 열기"가 정본
- 프롬프트 하나: kit 주소 + "그 안의 AGENTS.md대로 화면만 만들 프로젝트를 bts-starter-kit 옆에 [living] 폴더로"(위치를 프롬프트에도 적는다. 사용자 피드백) + "DB는 쓰지 않아. 없는 준비물은 설치해주고, 화면을 다 만들면 HTML 파일로 내보내줘" + 서비스 컨셉 세 줄
- 2단계 제목은 "프롬프트 하나로 프로젝트 시작하기"이고, 첫 문단은 "이 프롬프트로 바로 프로젝트를 시작할 수 있어요. 작업 폴더 `~/projects`에서 연 Claude Code나 Codex에 붙여 넣어 보세요"로 편의성을 먼저 말한 뒤 바꿀 곳(서비스 한 줄)을 알린다. 허브가 이 문단을 첫 프롬프트 위에 그대로 보여 준다(사용자 피드백: "프롬프트 하나 보내기"는 임팩트가 약하고 어색했다)
- 프롬프트에서 바꿀 곳은 `[ ]`로 표시한다: 프로젝트 이름 `[living]`, 서비스 `[누가 쓰고 무엇을 하는 서비스인지]`(사용자 피드백). "그 안의 AGENTS.md대로"는 남긴다: 세션이 kit 밖(작업 폴더)에서 열려 kit의 `AGENTS.md`·`CLAUDE.md`를 시작할 때 읽지 않는다(Claude Code는 하위 폴더 파일을 읽을 때에야, Codex는 저장소 루트부터 연 폴더까지만 읽는다)
- 작업 폴더 구조를 표로 보인다: `~/projects`(여기서 열고 보낸다), `~/projects/bts-starter-kit`, `~/projects/living`(kit 안이 아니라 옆)
- 배포는 선택이다. 2단계 프롬프트 바로 아래 보이는 문단이 갈림길을 알린다: 관심 없으면 그대로 보내 HTML로 받고, 바로 올리려면 참고 자료 `reference/deploy.md`(배포하기)에서 준비한 뒤 거기 있는 배포 프롬프트로 시작한다. 허브는 이 문단을 첫 프롬프트 카드 아래 보여 준다(사용자 피드백 4차: 허브에 작업 폴더와 배포 안내가 없었다)
- `reference/deploy.md`(배포하기): 고르기(GitHub Pages 주소·공개 저장소, Vercel 주소·Hobby 비상업·코드 비공개), 계정과 토큰(GitHub classic PAT `repo`, Vercel Full Account 토큰), 작업 폴더 `.env`에 `GH_TOKEN`·`VERCEL_TOKEN`, 배포 프롬프트 네 개(처음부터 배포까지: 첫 프롬프트의 마지막 줄만 `[GitHub Pages]에 배포해줘` / 이미 만든 화면 / 고친 뒤 다시 / 내리기), 성공 기준, 막히면. CLI는 에이전트가 설치한다(3.6)
- 에이전트가 kit을 받고 같은 작업 폴더에 빈 프로젝트를 만든 뒤, 새 폴더에서 이어 갈 한 줄을 준다(3.1). 사용자는 `/exit` 뒤 그 줄을 붙여 넣는다
- 한 번 다시 여는 이유: Claude Code와 Codex 모두 프로젝트의 AGENTS.md·CLAUDE.md, 스킬, 하위 에이전트, project scope 플러그인(superpowers, oh-my-claudecode 등), 훅을 세션을 열 때 그 폴더에서만 읽는다. 작업 폴더 세션이 화면까지 이어 만들면 하네스 없이 만들어져 품질이 떨어진다(사용자 원칙: 품질을 정하는 단계는 줄이지 않는다)
- 에이전트의 질문은 "짧은 프롬프트를 자세한 요청으로 채우는 과정"으로 안내한다(서비스 질문, 스타일 1~3위와 대표 색, 이름, 사이트맵·설계, 화면 구성 고르기, 기준 미달 때 더 다듬을지, `[confirm]`)
- 다음에 할 때(2026-10-02 사용자 요청): 다른 프로젝트는 작업 폴더에서 같은 프롬프트(이름과 서비스만 바꿈)로 만든다. 만든 프로젝트를 고치거나 본격적으로 개발할 때는 그 프로젝트 폴더에서 에이전트를 연다. 시작하기 5단계와 다듬기 쪽 첫머리에도 같은 규칙을 적는다
- 번호 체계를 줄인다(critique P2): 표지 제목에서 ①~④를 빼고 이름(가장 쉬운 방법, 다듬기, 장별로 자세히, 실제 서비스로 만들기)으로 부른다

### 2.2 ② 다듬기 프롬프트 (`refine.md`)
"살펴보기 → 자세히 요청하기 → 만든 뒤 고치기" 순서로 둔다. 샘플을 만들 때 실제로 한 요청은 그렇다고 표시한다(어느 샘플인지 함께).

**1. 살펴볼 곳** (2026-10-02 확인)

| 곳 | 주소 | 볼 수 있는 것 | 요청하는 법 |
|---|---|---|---|
| Refero Styles | https://styles.refero.design | 해외 웹사이트 1,300여 곳. 스타일마다 미리 보기, 분위기 한 줄, 색 팔레트, 글자 크기 단계, 컴포넌트. 분류 11개(AI 스타트업, 핀테크, 쇼핑몰, 다크 모드, 미니멀, 에디토리얼, 생산성 앱, 서체 조합 등) | 스타일 페이지 주소 붙여 넣기 |
| getdesign.md | https://getdesign.md | 해외 제품 70여 개(AI, 개발자 도구, 핀테크, 커머스, 자동차, 1990년대 웹). 색, 서체, 레이아웃, 모서리, 컴포넌트 | 브랜드 이름이나 주소 |
| getdesign.kr | https://www.getdesign.kr | 한국 서비스 22개(토스, 당근, 배달의민족, 원티드, 여기어때 등). 색, 서체, 간격, 모서리, 그림자, 모션, 컴포넌트 | "토스처럼" |
| 서체 | https://fonts.google.com/?subset=korean , https://noonnu.cc | 무료 한글 서체. 눈누는 서체마다 상업 이용 범위를 확인한다 | 서체 이름 |

에이전트는 이 세 카탈로그에서만 스타일을 받는다. 목록에 없는 브랜드를 말하면 없다고 알려 준다(bts-ui 규칙).

**2. 살펴본 것을 프롬프트로 옮기기**: 정할 수 있는 것과 예시 문장
- 스타일 통째로: 스타일 페이지 주소, "토스처럼"
- 스타일 하나를 바탕으로 일부만 바꾸기: "바탕은 Monzo로 하고 대표 색만 홍시색으로"
- 대표 색: 원본 그대로, 제품 색으로(같은 업종이면 원래 브랜드와 헷갈리지 않게)
- 분위기와 컨셉: "따뜻하고 다정하게, 장난스럽지 않게", 「잡지 표지처럼 큰 사진과 굵은 제목」(PACECREW), 「관제실 모니터처럼 어두운 화면에 숫자를 크게」(Uptrail)
- 서체: 제목·본문·숫자를 나눠서. 「제목은 아주 굵은 고딕(Wanted Sans), 본문은 Pretendard」, 「인용 문구는 명조(Hahmlet)」(울림), 「숫자와 코드는 고정폭(JetBrains Mono)」(Uptrail)
- 구도와 밀도: 「이번 달 돈의 흐름이 날짜 순서로 보이게」(고루), "데스크톱 폭을 넓게", "여백 넉넉하게, 카드 모서리 크게"
- 사진과 그림: "사람 사진 위주로", "사진 없이 숫자와 그래프로", 일러스트인지 사진인지
- 움직임: "조용하게, 숫자가 올라가는 효과 정도만", "스크롤하면 사진이 천천히 나타나게"
- 기기와 문구: "휴대폰 화면 먼저", "해요체로 친근하게, 과장 없이"

**3. 한 번에 자세히 요청하기**: 컨셉 + 이름 + 페이지 + 스타일(주소) + 대표 색 + 서체 + 구도. 예는 고루(Refero Monzo, 홍시색, Wanted Sans·Pretendard, 날짜 순서 구도, 페이지 7개). 한 블록 10줄 이내.

**4. 만든 뒤 고치기**
- 스타일: 다른 스타일로 바꾸기, 다른 계열 후보 더 보기, 카탈로그 없이 직접 정하기, 「대표 색을 우리 서비스 색으로」, 「제목 서체가 가늘고 작아. 더 굵고 크게」(랜딩 샘플 리디자인), 다크 모드
- 이름과 문구: 「비슷한 서비스를 조사한 이름 후보와 같은 이름 앱 확인」(고루), 「헤드라인 후보 다시. 전기요금 부담이 준다는 내용을 넣어」(AFTERGLOW), 「'원고'를 '대본'으로 모두 바꾸기」(울림)
- 구도와 화면: 시안 다시 그리기, 「A안에 아래쪽은 B안처럼」(고루), 「평범한 관리자 화면 같아. 글자가 작고 위계가 약하고 데스크톱 폭을 못 써. 리디자인해줘」(앱 샘플 4개), 휴대폰에서 쓰기 편하게
- 페이지와 동작: 페이지 더하기, 모달·햄버거 메뉴·전환 효과, 모든 링크·버튼 확인
- 사진(OpenAI 키): 특정 사진 다시 만들기, 「인물 사진을 원본 크기로 보고 팔다리·손가락이 이상한 것 다시 만들기」(PACECREW 7장, 울림·제철상자 4장씩), 키가 없을 때 사진 없는 구성
- 확인과 마무리: 검증, 디자인 리뷰 뒤 큰 문제부터 고치기, HTML로 내보내기

### 2.3 ③ 장별로 자세히
가장 쉬운 방법에서 에이전트가 알아서 하는 과정을 단계로 나눈다. bts-starter-kit을 직접 받은 상태(시작하기 "직접 준비하기": 에이전트에게 부탁, git clone, ZIP)에서 시작한다. 장마다 결과를 보고 고를 수 있다. 장 형식은 상위 설계 5.2~5.4절을 따른다.

| 장 | 내용 |
|---|---|
| 1 | 화면만 만드는 프로젝트 만들기 |
| 2 | 컨셉 알려 주기: 서비스 질문에 답해 `PRODUCT.md`가 생긴다 |
| 3 | 디자인 고르기: 스타일 1~3위, 카탈로그 둘러보기, 대표 색, 이름·헤드라인 후보 |
| 4 | 화면 설계 확인: 사이트맵과 페이지별 브리프 |
| 5 | 화면 만들기: 시안 고르기, 첫 화면, 나머지 화면 |
| 6 | 검사와 다듬기: 검증, critique·polish, ②로 이어지기 |
| 7 | HTML로 내보내기와 보는 법 |

### 2.4 ④ 실전 프로젝트로 개발하기 (`real-service.md`)
①~③과 구분해 표지 아래쪽에 둔다. 화면만 만든 프로젝트를 로그인과 DB 저장이 되는 실제 서비스로 바꾸는 길이다(2026-10-02 사용자 결정으로 시작 프롬프트만 두던 안을 늘렸다). 프롬프트는 bts-starter-kit 절차(생성, dev-cycle, 배포)와 대조해 쓰고 끝까지 실행해 보지는 않는다.

| 장 | 내용 | 프롬프트 예 |
|---|---|---|
| 4-1 | neon과 supabase 고르기: 차이와 준비물(supabase는 Supabase CLI 추가) | |
| 4-2 | 실전 프로젝트로 바꾸기. neon: 화면만 만든 프로젝트를 그대로 이어 간다. supabase: 새 프로젝트를 만들고 화면과 디자인을 옮겨 온다 | neon "이 프로젝트를 실제 서비스로 바꿀 거야. 로컬 DB 띄우고 첫 마이그레이션 해줘" · supabase "supabase 템플릿으로 goru 프로젝트 만들어줘" → "../living에서 만든 화면과 디자인을 옮겨줘" |
| 4-3 | 서비스 규칙 알려 주기: 용어와 권한(누가 무엇을 보는지) | "회원은 자기 집의 지출만 봐. 이 내용으로 GLOSSARY.md와 docs/domain/project.md를 채워줘" |
| 4-4 | 기능 만들기: 로그인, 저장, 핵심 기능을 하나씩. 스펙 확인 → 구현 → 직접 써 보고 확인 | "지출을 추가하고 수정하면 DB에 저장되게 해줘" |
| 4-5 | 검증과 배포. 계정(Vercel, 원격 DB, GitHub)이 필요하다고 먼저 밝힌다 | "지금까지 만든 거 검증해줘" · "Vercel 배포 준비해줘" · "운영에 배포해줘" |

처음부터 끝까지 유명 서비스를 본떠 기능 장을 따라가는 길은 1~13번 교재가 맡는다.

### 2.5 샘플 쪽 (8개)
페이지가 적은 순서: 고루, 울림, 하루공부, AFTERGLOW, 핏슬롯, 제철상자, PACECREW, Uptrail.

2026-10-02 사용자 피드백 5차: 샘플마다 튜토리얼이 있다는 게 보여야 한다. 첫 쪽 맨 위 절을 "샘플로 만들어 보기"(샘플 8개 표 + 내 컨셉으로 만들기 안내)로 두고 "가장 쉬운 방법"을 그 바로 아래에 둔다(샘플을 골라도 1·3·4단계는 같다). 이어서 할 수 있는 것, 장별로 자세히, 시간과 비용, 만든 기록은 그 아래. 사이드바 묶음과 이동 경로의 이름도 "샘플" 대신 "샘플로 만들어 보기"(상단 메뉴 "샘플"(갤러리)과 겹치지 않게. "튜토리얼 따라하기"는 튜토리얼이 겹치고 '똑같이 따라 만든다'로 읽혀 쓰지 않는다). 허브 튜토리얼 목록은 샘플 8개를 그림과 함께 보인다. 샘플 쪽 컨셉 프롬프트 아래에 에이전트 여는 법(1단계)과 보낸 다음(3·4단계)으로 가는 문단을 둔다.

- 완성 화면(스크린샷, 갤러리·실제 사이트 링크)
- 그 샘플의 컨셉 프롬프트: 첫 쪽 첫 프롬프트와 같은 완성 프롬프트이고 `[<slug>]` 폴더와 `[컨셉]`만 다르다. 작업 폴더에서 그대로 보내면 시작된다(2026-10-02 사용자 요청. 갤러리 `/work/<slug>/`의 "튜토리얼로 만들기" 창이 이 프롬프트를 보여 준다)
- 실제로 거친 과정: 추천받은 스타일 1~3위와 고른 것, 대표 색, 이름·헤드라인이 바뀐 과정, 다시 만든 사진, 페이지 수와 AI 이미지 수
- (2026-10-05 B 단계에서 바꿈) 프롬프트 셋: 샘플과 똑같이 만들기(에셋 팩, 이름 칸), 에셋 팩으로 나만의 서비스 만들기(이름·바꿀 것 칸), 이 컨셉으로 처음부터 만들기(위 컨셉 프롬프트). "비슷하게 만들고 싶을 때"는 지웠다. 설계는 [샘플 에셋 팩](2026-10-05-sample-asset-packs-design.md) 5절
- 실전으로 만들 때: 필요한 데이터, 기능 요청 프롬프트 3~5개, 외부 서비스가 필요한 기능 표시(핏슬롯 결제, 울림 음성 합성, Uptrail 배포 알림 등), 기능화 난이도(하루공부가 가장 쉽고 Uptrail이 가장 어렵다)
- 근거: 샘플 프로젝트(`../bts-samples/ws/<샘플>/`), 포트폴리오 데이터(`samples.json`), 대화 기록. 울림 `DESIGN.md`는 옛 Sequel 판, 제철상자는 본문이 잘렸고, PACECREW는 원문 빨강 그대로라 색은 포트폴리오 데이터와 `globals.css`로 확인한다.

## 3. bts-starter-kit 수정 (먼저 한다)

①과 ④가 실제 절차와 맞으려면 아래가 필요하다. 2026-10-02 대화에서 이 설계를 승인받았다("compact 하고 진행하자").

조사로 확인한 사실:
- 설치기(`install.mjs`)는 컨테이너를 쓰지 않는다. DB가 필요한 것은 생성 절차의 준비물 확인(컨테이너 엔진), 6단계(로컬 DB), 7단계(첫 마이그레이션)뿐이다.
- BTS 기본 앱의 `src/app/api/auth/[...all]/route.ts`, `src/app/api/rpc/[[...rest]]/route.ts`, `src/app/dashboard/`(서버 세션)는 정적 내보내기를 막는다. `components/user-menu.tsx`(authClient)는 DB가 없으면 오류를 낸다. 기본 `next.config.ts`는 `typedRoutes`, `reactCompiler`와 varlock 플러그인(`export default withVarlock(nextConfig)`)이다. proxy·middleware는 없다.
- `.dev-cycle.json`의 `authPaths`(auth-client, services, env.server 등)를 건드리면 라운드가 무거워진다. 화면만 작업은 이 경로를 고치지 않고 화면에서 쓰지 않기만 한다.
- 샘플 때 쓴 내보내기 스크립트: `../bts-samples/tools/export.sh`(복사본에서 api·dashboard 삭제, `next.config.ts`의 `export default` 앞에 `Object.assign(nextConfig, { output: "export", trailingSlash: true, basePath, images: { loader: "custom", loaderFile } , typescript: { ignoreBuildErrors: true } })` 삽입, basePath를 붙이는 이미지 로더, `.env` 서버 값 유출 검사).

### 3.1 생성 절차 "화면만" 갈래 (루트 `AGENTS.md`)
- 조건: "화면만", "DB는 쓰지 않아", "HTML만" 같은 요청
- 템플릿은 neon으로 정하고 묻지 않는다
- 건너뛴다: 3단계의 컨테이너 엔진·Podman 머신 확인, 6단계 로컬 DB, 7단계 첫 마이그레이션. 9단계 커밋에는 설치 결과와 포맷 정리만 들어간다
- 새 프로젝트 `AGENTS.md` 맨 위(템플릿 블록 밖)에 "화면만 프로젝트" 표시 한 줄(규칙은 `bts-ui` "화면만 프로젝트" 절이라고 가리킨다)
- 보고: 개발 서버로 보는 법, HTML 내보내기(`pnpm export:html` 또는 "HTML로 내보내줘"), 실제 서비스로 바꾸는 법
- 루트 README 빠른 시작에 화면만 요청 예시를 넣는다
- **작업 폴더에서 시작하기**(2026-10-02): 세션이 kit 밖(작업 폴더)에서 열려 kit을 받은 뒤 그 `AGENTS.md`를 읽고 따르는 경우도 같은 절차로 동작하게 쓴다("이 저장소"는 받은 kit 폴더). 위치 기본값 `../<이름>`은 그대로라 프로젝트가 kit과 같은 작업 폴더에 생긴다
  - 요청에 서비스 요청이 있으면 kit 받기·프로젝트 생성 지시를 뺀 나머지(컨셉부터 끝까지, "다 만들면 HTML 파일로 내보내줘" 포함)를 새 프로젝트의 `docs/first-request.md`에 그대로 적고 9단계 커밋에 넣는다
  - 이 흐름에서는 10단계의 사용자 할 일 중 `impeccable hooks on`을 생성한 에이전트가 프로젝트 루트에서 스크립트 경로로 직접 실행하고(스킬 호출 아님) 훅 명령을 확인한다. 원격 DB·배포 할 일은 "실제 서비스로 바꿀 때"로 미룬다고 보고한다
  - 보고 끝에 새 폴더에서 이어 갈 한 줄을 준다: `cd <프로젝트 절대 경로> && <지금 에이전트를 여는 명령> "docs/first-request.md의 요청대로 이어서 해줘"`. 지금 세션이 묻지 않고 진행하는 모드면 같은 옵션을 붙인다(`--dangerously-skip-permissions`, `--yolo`)
  - 받은 kit 폴더가 이미 있으면 새로 받지 않고 그대로 쓴다(git으로 받은 폴더면 `git pull --ff-only`로 최신으로 맞춘다. 로컬 변경이 있으면 멈추고 알린다)
  - "없는 준비물은 설치해줘"는 전역 설치 요청으로 본다. 비밀번호가 필요한 명령은 실행하지 않고 사용자에게 준다
  - 요청 끝이 "GitHub Pages에 배포해줘"나 "Vercel에 배포해줘"면 `docs/first-request.md`에 그대로 넣는다. 프로젝트 세션이 화면을 다 만든 뒤 3.6대로 배포한다. 원격 저장소·프로젝트 생성을 요청한 것으로 본다

### 3.2 새 프로젝트 규칙 (두 템플릿 공통 스킬, 바이트 동일)
- `bts-ui` "화면만 프로젝트" 절:
  - 예시 데이터로 채운다. 로그인이 필요한 화면은 예시 사용자로 로그인한 상태로 보여 준다
  - 서버나 DB를 부르는 BTS 기본 부품(헤더 사용자 메뉴, `/dashboard`, 로그인 폼의 authClient)을 화면에 쓰지 않는다. `authPaths` 파일은 고치지 않는다
  - HTML로 내보낼 수 있게 짓는다: 동적 경로는 `generateStaticParams`로 값을 모두 낸다, 쿼리 값은 클라이언트에서 Suspense 안에서 읽는다, 서버 전용 API(`headers`, `cookies`)를 화면에서 쓰지 않는다
  - "HTML로 내보내줘" → `pnpm export:html`
  - "실제 서비스로 바꿀 거야" → 컨테이너 엔진 확인 → 로컬 DB(템플릿 README "로컬 DB 시작") → 첫 마이그레이션 → `AGENTS.md`의 표시 지우기 → 커밋(첫 마이그레이션이 다음 라운드 diff에 섞이지 않게. 생성 절차 9단계와 같은 이유) → 이후 기능은 dev-cycle
  - 화면 작업도 지금처럼 dev-cycle 라운드(케이스 B)로 한다. 끝의 `[confirm]`(사용자 확인)과 audit 기준 미달 때의 질문이 나온다. 교재 ①의 질문 표에 이 둘을 적었다
- `bts-web` 한 줄: 화면만 프로젝트면 데이터 패칭·보호 페이지 규칙 대신 `bts-ui`의 그 절을 따른다

### 3.3 `pnpm export:html` (두 템플릿 공통 `files/scripts/export-html.mjs`)
- 설치기가 `package.json` 스크립트에 `"export:html": "node scripts/export-html.mjs"`를 더한다(`install.mjs` 스크립트 목록). `.gitignore`에 `/html/`
- 동작: 프로젝트를 임시 폴더로 복사(`node_modules`, `.next`, `out`, `.git`, `.turbo`, `html` 제외) → 복사본에 `pnpm install --prefer-offline` → `apps/web/src/app/api`, `apps/web/src/app/dashboard` 삭제 → `next.config.ts` 덧쓰기 → `next build` → `apps/web/out`을 프로젝트의 `html/`로
- `--base /경로`: 하위 경로용 basePath와 이미지 로더
- 비밀값 검사: `.env`의 서버 전용 값이 결과물에 있으면 멈춘다(값은 출력하지 않는다)
- `html/`에 빈 `.nojekyll`을 만든다(GitHub Pages의 Jekyll이 `_next/`를 빼지 않게. `VERIFICATION.md` 1006행)
- 끝에 보는 법(`pnpm dlx serve html`)을 출력한다
- 프로젝트 파일은 바꾸지 않는다(④의 neon 이어 가기를 위해)
- 구현 때 확인해 정한 것(2026-10-02, BTS 3.44.2, Next 16.3.8): 복사본은 시스템 임시 폴더에 둔다(`node_modules/.cache` 아래에 두면 Turbopack이 앱 소스를 처리하지 못하고 panic). varlock Next 플러그인이 빌드 결과의 비밀값을 먼저 잡아 빌드를 멈추므로 그 출력(`Config item key`)도 exit 2로 받는다. 내보낸 결과에 `/dashboard` 링크나 authClient가 남으면 경고한다(개발 서버에서는 경로가 살아 있어 드러나지 않는다. orpc는 BTS `providers.tsx`가 import만 해도 들어가 헛경보라 보지 않는다). 설치기가 `biome.json`에 `!html`을 더한다(biome은 `.gitignore`를 따르지 않아 내보낸 뒤 `biome check .`가 실패했다)
- BTS `biome.json` 형식(탭, 80자)으로 둔다. 공유 파일 목록(`tests/shared-files.test.mjs`의 `SHARED`)에 더한다

### 3.5 이미지 생성과 키 (2026-10-02 사용자 요청, 같은 날 피드백으로 고침)
- 사실(확인): impeccable `generate-image`는 셸 환경 변수 `OPENAI_API_KEY`만 읽는다("OPENAI_API_KEY is not set; use the harness-native image tool instead"). `.env` 파일은 읽지 않는다. impeccable은 하네스 자체 이미지 도구를 먼저 쓰라고 하고(init.md 112행, new-work.md 111행), `impeccable context`의 `IMAGE_GEN_AVAILABLE`은 키만 본다.
- 사실(확인): gpt-image 스킬(https://github.com/GENEXIS-AI/gpt-image-skill, `gpt-image/SKILL.md`)은 ChatGPT 구독으로 그린다. 하네스 자체 image_gen이 있으면 그것을, 없으면(Claude Code) `scripts/gpt_image.mjs`로 Codex CLI(ChatGPT 로그인, Node 22+)를 불러 그린다. API 키와 Images API는 쓰지 않는다. gpt-image-api는 이 컴퓨터의 `~/.claude/skills`에만 있는 스킬(공개 저장소 없음)이고 `OPENAI_API_KEY`로 Images API를 부르는데, kit에는 같은 일을 하는 impeccable `generate-image`가 이미 있다. 두 스킬 모두 지금 kit 설치 목록(`skills.manifest.json`)에 없다.
- 사용자 안내(교재): Codex는 준비 없이 그린다. Claude Code는 ChatGPT 유료 요금제(Codex CLI 설치와 ChatGPT 로그인, gpt-image 스킬) 또는 유료 OpenAI API 키 중 하나가 필요하다. 키는 작업 폴더(kit의 상위 폴더, 예: `~/projects`) `.env`에 편집기로 적어 저장만 한다. 프롬프트를 보내기 전(kit을 받기 전)에 준비할 수 있고, 배포 토큰도 같은 파일에 둔다(2026-10-02 사용자 피드백으로 kit 루트 `.env`에서 옮김). 셸로 불러오는 단계는 없다(macOS 전용 명령 없이 Windows도 같다).
- 고칠 것:
  - 두 템플릿 `skills.manifest.json`에 gpt-image(GENEXIS-AI/gpt-image-skill)를 project scope로 더한다. skills CLI로 하위 폴더 스킬이 설치되고 `scripts/gpt_image.mjs`가 동작하는지 실제 설치로 확인한다. gpt-image-api는 넣지 않는다(공개 출처 없음, impeccable이 같은 일을 한다).
  - `bts-ui` SKILL.md 시각 자산 행과 규칙, `impeccable-map.md` "이미지": 그리는 길의 순서 ① 하네스 자체 이미지 도구(Codex image_gen) ② `OPENAI_API_KEY`가 있으면 `impeccable generate-image`(키를 넣은 것을 API 사용 동의로 본다) ③ Codex CLI가 ChatGPT로 로그인되어 있으면 gpt-image 스킬 ④ 없으면 배치도와 이미지 없는 구성.
  - 키 읽기(2026-10-02 실험으로 정함): impeccable은 `.env`를 읽지 않는다(`.env`에 키가 있고 셸 변수가 없으면 "OPENAI_API_KEY is not set"이 나오고, `impeccable context`에 `IMAGE_GEN_AVAILABLE`이 없다. 셸 변수로 넣으면 `IMAGE_GEN_AVAILABLE`과 gpt-image-2.5-flare 안내가 나온다). Claude Code의 SessionStart 훅이 `$CLAUDE_ENV_FILE`에 `export` 줄을 쓰면 그 세션의 모든 Bash 명령에 변수가 들어간다(훅 있음 `KEY_PRESENT`, 훅 없음 `KEY_MISSING`으로 확인). 그래서 설치기가 프로젝트 `.claude/settings.json`에 SessionStart 훅(공유 스크립트 `scripts/load-keys.*`)을 넣는다:
    - 이름 셋만 다룬다: `OPENAI_API_KEY`, `GH_TOKEN`, `VERCEL_TOKEN`. 훅은 `OPENAI_API_KEY`만 세션 환경에 넣는다(코드 리뷰 반영: 배포 토큰이 세션 내내 있으면 `gh`·`vercel`·`release.mjs`가 사용자 로그인 대신 `.env` 토큰으로 조용히 돈다). 배포 토큰은 `-- <명령>` 모드로 배포 명령에만 넣는다. 셸에 없는 이름만, 프로젝트 루트 `.env`, 다음으로 프로젝트의 상위 폴더 `.env`(작업 폴더 흐름에서는 프로젝트가 kit 옆에 생기므로 작업 폴더다. kit 경로를 따로 기록하지 않는다. 구현 때 정함)에서 그 이름의 한 줄을 읽어 `$CLAUDE_ENV_FILE`에 쓴다. 값을 출력하지 않는다. 파일이나 값이 없으면 아무것도 하지 않는다
    - 훅이 없을 때(Codex, 세션을 연 뒤 넣은 키): `node scripts/load-keys.mjs -- <명령>`이 같은 순서로 찾은 키를 그 명령 하나에만 넣어 실행한다(구현 때 더함. 셸 스니펫으로 `.env`를 읽지 않게)
    - 세션을 열 때 읽으므로, 연 뒤에 키를 넣었으면 다시 열어야 한다(교재에 적음)
    - Codex는 자체 image_gen이 먼저라 키를 넘기지 않는다
    - bts-ui에는 훅이 없는 경우(옛 설치)를 위해 "셸에 키가 없고 `.env`에 있으면 한 번의 셸 실행 안에서 불러와 쓴다"를 남긴다
  - 루트 `AGENTS.md` 생성 절차 10단계 보고와 루트 README(UI/UX 표 "셸에 `OPENAI_API_KEY`", 빠른 시작): Codex, Codex CLI+gpt-image, `.env` 안내.
  - 루트 `.env.example`(2026-10-02 추가. 작업 폴더에 `.env`를 만들어 필요한 줄만 옮겨 적는 안내, `OPENAI_API_KEY`·`GH_TOKEN`·`VERCEL_TOKEN`)과 `.gitignore`(이미 `.env` 무시, `.env.example` 허용).

### 3.6 화면만 프로젝트 배포 (2026-10-02 사용자 요청)
- 요청: "GitHub Pages에 배포해줘", "Vercel에 배포해줘"(첫 요청 끝이나 나중에 프로젝트 세션에서). 원격 생성 요청으로 본다
- 토큰: `GH_TOKEN`, `VERCEL_TOKEN`. 셸에 없으면(Codex, 옛 설치) 프로젝트 `.env`, 작업 폴더 `.env` 순서로 한 번의 셸 실행 안에서 불러와 쓴다. 값을 출력하거나 다른 파일에 쓰지 않는다. 없으면 교재의 "배포하기" 쪽(`tutorials/reference/deploy.md`)을 안내하고 멈춘다(대화창에 붙여 넣으라고 하지 않는다)
- CLI: `gh`, `vercel`이 없으면 설치한다(macOS `brew install gh`, Ubuntu·WSL은 gh 공식 apt 절차, `npm i -g vercel`). 비밀번호가 필요한 명령은 사용자에게 준다
- GitHub Pages: 저장소 이름은 프로젝트 이름, 공개(무료 계정은 공개 저장소만 Pages. 코드가 공개된다고 보고). `pnpm export:html --base /<저장소>` → `html/`(`.nojekyll` 포함)을 `gh-pages` 브랜치로 push, 기본 브랜치도 push → `gh api -X POST repos/<owner>/<repo>/pages`로 `gh-pages` `/`를 출처로 켠다 → 주소가 200인지 확인하고 보고. `GH_TOKEN`만 있을 때 git push 인증 방법(`gh auth setup-git --hostname github.com --force` 등)은 실제 확인으로 정한다(문서에 미확인)
- Vercel: `pnpm export:html` → `html/`을 프로젝트 이름의 임시 폴더로 복사해 `vercel deploy <폴더> --prod --yes`로 올린다(`VERCEL_TOKEN` 환경 변수를 CLI가 읽는다. CLI는 폴더 이름으로 프로젝트를 찾거나 만든다). 출력한 운영 주소가 200인지 확인하고 보고
- 확인(사실, 공식 문서 2026-10-02): classic PAT는 `repo` 하나로 공개 저장소 생성, push, Pages API가 된다. `gh`는 `GH_TOKEN`을 자동으로 쓴다. Vercel CLI는 `--token` 또는 `VERCEL_TOKEN`을 읽는다. Vercel Hobby는 무료, 개인 비상업 용도. 정적 폴더 경로를 인자로 주는 `vercel deploy <폴더>` 형태는 실제로 확인한다
- 다시 배포("고친 화면을 다시 배포해줘"): 같은 저장소·Vercel 프로젝트에 올려 주소를 유지한다
- 내리기("배포한 사이트를 내려줘"): 끄거나 지울 것을 먼저 보여 주고 묻는다. GitHub Pages는 `gh api -X DELETE repos/<owner>/<repo>/pages`로 사이트만 끈다(classic `repo`로 된다. 저장소 삭제는 `delete_repo` 권한이 필요해 사용자가 GitHub 설정에서 직접 한다고 안내). Vercel은 `vercel project rm <이름>`
- 실제 배포 확인은 사용자 계정과 토큰이 필요하므로 사용자 허락을 받고 한다. 확인용 저장소와 Vercel 프로젝트는 끝나면 지운다
- 사전 확인(2026-10-02, 사용자 허락, `~/.zshrc`의 `GITHUB_TOKEN`(fine-grained)·`VERCEL_TOKEN`, 정적 파일 3개로 `bts-deploy-check`를 만들고 확인 뒤 저장소와 프로젝트를 지움):
  - GitHub: `gh repo create <이름> --public` → `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push <https 주소> gh-pages`로 전역 git 설정을 바꾸지 않고 push했다(활성 계정은 환경 변수 토큰. 같은 계정의 keyring 로그인도 있어 완전히 분리해 확인한 것은 아니다). `gh-pages` 브랜치를 push하면 Pages가 저절로 켜져 `POST …/pages`는 409 "already enabled"를 준다(성공으로 본다). 약 30초 뒤 `https://<아이디>.github.io/<이름>/`과 `_next/` 아래 파일이 200(`.nojekyll`)
  - Vercel(CLI 60.1.1): `vercel deploy <폴더> --prod --yes`가 `VERCEL_TOKEN` 환경 변수만으로 동작하고 폴더 이름으로 프로젝트를 만든다. 누구나 여는 주소는 stderr의 "Aliased" `https://<프로젝트>.vercel.app`(200)이다. stdout(JSON)의 배포별 주소는 Deployment Protection 때문에 302(로그인)라 보고에 쓰지 않는다. 올린 폴더 안에 `.vercel/`이 생긴다
  - 그래서 `html/`을 그대로 올리면 프로젝트 이름이 `html`이 된다. 프로젝트 이름으로 올리는 방법(`vercel link --yes --project <이름>` 뒤 배포, 또는 이름 붙인 임시 폴더)은 kit 구현 때 실제로 정한다
  - 지우기: `vercel project rm <이름>`(확인 질문에 y), `gh repo delete <owner>/<이름> --yes`
- 문서: `bts-ui` "화면만 프로젝트" 절과 `references/screen-only.md`(화면 규칙, 내보내기, 배포, 실제 서비스로 바꾸기. 공유 파일), 템플릿 README, `VERIFICATION.md`

### 3.4 확인과 문서
- 테스트: `node --test 'templates/<템플릿>/tests/*.test.mjs'` 두 템플릿 모두, 스크립트 단위 테스트(설정 덧쓰기, 복사 제외)
- 실제 확인(scratchpad): BTS 프로젝트를 화면만으로 만들고(DB 없이) 화면 하나를 바꾼 뒤 `export:html` → 결과를 띄워 페이지 확인 → 실전 전환(DB, 마이그레이션). 끝나면 project scope 플러그인 제거와 컨테이너 정리
- 문서: 루트 README(빠른 시작), 두 템플릿 README(자주 쓰는 명령, 설치한 뒤), `VERIFICATION.md`
- 릴리스 v0.9.0(feat). push는 사용자 요청을 받고 릴리스 절차로

## 4. 사이트 틀 (포트폴리오에 추가)

- `/tutorials/`: 허브. 첫 화면의 주 행동은 교재의 첫 프롬프트 복사다. 시작하기(설치, 로그인, 작업 폴더에서 열기)는 그 위에 접힌 상자로 두고 필요할 때 펼친다(2026-10-02 사용자 피드백). 아래에 교재, 참고 자료
- `/tutorials/start/`, `/tutorials/reference/<쪽>/`
- `/tutorials/samples/`: 표지("샘플로 만들어 보기"가 맨 위, 바로 아래 "가장 쉬운 방법". 2.5), 장 페이지, 다듬기, 실제 서비스, 샘플 쪽
- 장 페이지: 데스크톱 왼쪽 장 목록, 모바일 시트, 프롬프트 카드(복사, Claude Code·Codex 탭, 고른 탭 기억), 진행 체크(브라우저 저장), 이전·다음
- 기존 화면: 헤더 "튜토리얼" 메뉴, `/work/<샘플>/`의 "이 샘플처럼 만들어 보기"(샘플 쪽으로)
- 원본은 `tutorials/`의 마크다운이다. 빌드할 때 읽어 HTML로 만든다(마크다운 변환 라이브러리 하나 추가). bts-ui 절차로 포트폴리오 사이트맵과 브리프를 먼저 쓰고 확인받는다.

## 5. 순서

1. 시범: 공통 교재(표지, ①~④, 장)와 **고루 쪽 하나만**, 사이트 틀 → 사용자가 구성을 본다(2026-10-02 결정: 8개를 한 번에 만들지 않는다. 같은 날 "먼저 Sample 1개만 먼저 제작 진행하고 튜토리얼 페이지 구성도 기획/설계 및 제작"으로 시범을 bts-starter-kit 수정보다 먼저 한다)
2. bts-starter-kit 수정 → 확인 → 릴리스(push는 요청을 받고). 교재가 이 수정을 전제로 하므로 게시 전에 끝낸다
3. 확인을 받은 뒤 샘플 쪽 7개
4. 검수(0번 공통 기반 포함, korean-skills 세 스킬) → 사이트 반영(push는 요청을 받고) → `tutorials/README.md` 목록과 루트 README "학습 자료" 링크

## 6. 하지 않는 것

- 샘플과 똑같이 나오게 값을 강요하는 프롬프트. 스타일·색을 정하는 요청은 ②의 선택지로만 둔다.
- 샘플 사이트 자체의 수정
- 교재 프롬프트를 끝까지 실행해 확인하는 일(표지 "만든 기록"에 밝힌다). bts-starter-kit 수정은 실제 설치로 확인한다.

## 7. 참고 사실 (샘플 쪽 재료, 2026-10-02 조사)

공통:
- 8개 모두 기능 없는 화면 샘플이다. DB는 Better Auth 기본 테이블 4개뿐이고 화면은 예시 데이터와 브라우저 저장소로 돈다. 처음 들어오면 예시 사용자로 로그인된 상태다.
- 만든 순서: 첫 화면(측정 시안·랜딩) → 리디자인(카탈로그 3곳 추천, comp 3장, AI 이미지) → 사이트로 넓히기(사이트맵, 브리프, 페이지별 comp, 전체 구현) → 사진 다시 만들기. 에이전트 비용 샘플당 $68~$181(API 환산).
- 원래 요청 원문: `~/.claude/projects/` 아래 세션 기록. 랜딩 `-private-tmp-…-scratchpad-lp-ws-<옛이름>`, 리디자인 `…-rd-ws-<옛이름>`, 앱 측정 `…-ab-ws-<샘플>-A`, 넓히기 `-Users-freelife-youtube-bts-samples-ws-<샘플>`. 앱 리디자인 요청 공통 틀: "<이름> 첫 화면(`/`)을 리디자인해줘. … 지금 시안은 …. 포트폴리오 수준으로 … 스타일은 Refero Styles, awesome-design-md, getdesign.kr에서 추천해줘 … 서체는 자체 호스팅 … DB는 띄우지 않아." 넓히기 요청: "<이름> 샘플을 첫 화면 하나가 아니라 실제로 돌아가는 서비스처럼 모든 페이지를 갖춘 사이트로 넓히려고 해."
- 랜딩 샘플의 `PRODUCT.md`와 랜딩 브리프는 시연자가 미리 썼다(`templates/bts-next-neon/VERIFICATION.md` 915행 부근, 이름·헤드라인 1033~1038행).
- 수치 정본: 포트폴리오 `../bts-samples/ws/portfolio/apps/web/src/data/samples.json`(페이지, AI 이미지, 스타일, 색, 서체, critique).

| 샘플 | 페이지 | AI 이미지 | 추천 1~3위 → 고른 것 | 대표 색 | 서체 | 이름·문구 변화 | 실전 기능과 외부 서비스 |
|---|---|---|---|---|---|---|---|
| 고루 `goru` | 7 | 5 | Refero Monzo · 당근 SEED · Monarch → Monzo([주소](https://styles.refero.design/style/e8a1d114-6924-4f03-acd2-996dd30f15a6)), comp A "9월 타임라인"(아래 두 단은 B) | 홍시색 #c9421d(원문 Hot Coral) | Wanted Sans, Pretendard | 같이살림 → Evenly → 고루(App Store 동명 앱). 이전 판 토스 스타일 critique 20/32 → 30/40 | 지출 CRUD, 잔액·최소 송금(`lib/settle.ts` 재사용 가능), 정산 완료, 초대 코드. 외부 없음(알림 메일만). 집 단위 권한 |
| 울림 `ullim` | 11 | 41 | Refero MasterClass · Runway · Fable → MasterClass(1차는 Sequel) | 원본 마젠타 #e32652 | Black Han Sans, Hahmlet, Pretendard | H1 "글에 목소리를 입히다" → "한 줄의 대본도, 마음을 울리는 목소리로", 원고 → 대본(70곳) | 프로젝트·문장 저장, TTS API, 파일 저장소, 정기결제, 소셜 로그인. `DESIGN.md`는 옛 Sequel 판이라 색은 `globals.css` 기준 |
| 하루공부 `studyday` | 14 | 3 | getdesign.md Wise · Refero Bento · Clay → Wise, comp A "이번 주 무대" | 원본 라임 #9fe870 | Wanted Sans, Pretendard | 이전 판 팀스파르타 스타일 17/28 → 33/40 | 시험 계획, 하루 분량 분배, 할 일 체크, 집중 기록(`lib/derive.ts`). 외부 없음. 기능화 가장 쉬움 |
| AFTERGLOW `afterglow` | 17 | 22 | Refero ORYZO AI · bugatti · Lamborghini → ORYZO AI(1차는 Apple) | 원본 Ember #dc5000 | Wanted Sans, Pretendard | 해담 → AFTERGLOW, H1 "해는 졌고, 전기는 남았습니다" → "전기요금은 가볍게, 정전에도 든든하게"(사용자가 전기요금 부담 언급 요청) | 상담 신청 저장, 절감 계산(`model.ts`), 기기 IoT 데이터, 푸시·문자 |
| 핏슬롯 `fitslot` | 20 | 18 | Refero sweetgreen · Oakâme · MasterClass → sweetgreen, comp C "시간 기둥" | 원본 Deep Forest #00473c(라임은 예약 버튼) | SUIT, Pretendard | 이전 판 당근 스타일 25/40 → 28/40 | 예약(정원·수강권 차감 트랜잭션), 대기, 취소(4시간 전), 수강권 구매(결제 PG), .ics |
| 제철상자 `jecheol` | 21 | 32 | Refero Oakâme · Telescope · Hungry Tiger → Oakâme(1차는 Fable) | 사과 빨강 #ba2b28(원문에 대표 색 없음) | Wanted Sans, Pretendard | H1 "지금 사과가 제일 맛있어요"(넓히기 요청에서 확정) | 정기결제·빌링키, 주소 검색, 건너뛰기 마감 계산, 메일·문자. `DESIGN.md` 본문 잘림 |
| PACECREW `pacecrew` | 22 | 46 | getdesign.md Vodafone · Lightship · Hungry Tiger → Vodafone, comp B "잡지 표지"(1차는 Flying Papers) | 형광 노랑 #f4ed36(원문 빨강) | Wanted Sans, Pretendard | 발맞춤 → PACECREW, H1 "내 페이스, 내 크루." 인물 사진 7장 다시 생성 | 크루 매칭·가입, 레이스 신청, 기록 연동, 지도 API, SMS. `DESIGN.md`는 원문 빨강 그대로 |
| Uptrail `uptrail` | 22 | 2 | Refero Default · 리멤버 · ClickHouse → Default, comp B "관제 벽" | 원본 Signal Blue #3b82f6 | Pretendard, JetBrains Mono | 이전 판 구름 Vapor 스타일 19/32 → 28/40 | 지표 수집(크론), 배포 웹훅, 알림 채널, 롤백 API. 외부 연동 가장 많음 |
