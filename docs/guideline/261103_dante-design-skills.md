# AI 슬롭을 줄여주는 디자인 스킬 7개

https://www.youtube.com/watch?v=7n5blXWRv0Y

> 영상 스크립트(`ai-slop-script.md`)와 각 GitHub 저장소의 실제 `SKILL.md`를 함께 보고 정리했습니다. (저장소 확인 기준일: 2026-11-03)
> 각 항목의 **🎬 영상**은 영상에서 소개한 내용이고, **🔍 분석**은 저장소를 직접 읽고 덧붙인 내용입니다.

## 왜 스킬이 필요한가 (영상 요지)

- 요즘 모델은 디자인을 꽤 잘하지만, **모델마다 반복하는 고유한 패턴**이 있어서 보면 바로 티가 납니다. 스킬은 모델을 그 패턴 밖으로 끌어내는 도구입니다.
- 소개된 스킬은 모두 경력 많은 디자이너들이 직접 써서 효과를 본 워크플로를 재사용할 수 있게 묶어 둔 것입니다.
- **Claude 설정에 한 번 추가하면 Claude Design에서도 그대로 쓰입니다.** Claude Code, Codex 같은 다른 에이전트에서도 똑같이 동작합니다.
- 사용법은 공통입니다. `/스킬이름`을 부르고 원하는 사이트를 프롬프트로 설명하면 됩니다. 대부분 바로 만들지 않고 질문부터 던집니다.

## 한눈에 보기

| # | 저장소 | 핵심 스킬 | 분류 | 한 줄 요약 |
|---|---|---|---|---|
| ① | Emil Kowalski | emil-design-eng · animate · improve-animations | 생성 + 감사 | UI 폴리시와 애니메이션 결정 순서 |
| ② | ConardLi | web-design-engineer | 생성 + 채점 | 실제 레퍼런스에 기댄 고품질 비주얼, 5개 차원 점수 |
| ③ | elayadesign | landing-page-design | 생성 | 전환(CTA) 중심 랜딩 페이지 시스템 |
| ④ | Meng To | build-awwwards-quality-sites | 생성 | 스크롤 스토리텔링, 수상작 수준 모션 |
| ⑤ | Jakub Krehel | interface-review · better-layout | 리뷰 | 변경 전후 회귀 검토, 여백·정렬 정밀 점검 |
| ⑥ | codeswithroh | tastemaker | 생성 + 메모리 | 레퍼런스 픽셀에서 디자인 값을 뽑아 프로젝트 전체에 고정 |
| ⑦ | Owl-Listener | visual-critique · ui-design | 리뷰 | 7개 차원 비평, 이름 붙은 지각 법칙별 스킬 |

### 추천 조합 (워크플로 순서)

1. **처음 만들 때**: ② web-design-engineer, ⑥ tastemaker, ① emil-design-eng 중 하나로 시작합니다. 목적이 분명하면 ③ 랜딩 페이지나 ④ 어워즈급 사이트를 고릅니다.
2. **모션 다듬기**: ① improve-animations로 감사하고 계획을 받은 뒤 그 계획을 실행합니다.
3. **리뷰 루프**: ⑦ `/critique-screen` 또는 ② 5개 차원 채점으로 점수를 받고 고친 뒤 다시 돌립니다.
4. **마무리 정밀 점검**: ⑤ better-layout(여백·정렬)과 interface-review(직전 변경이 뭔가를 망가뜨렸는지).

> ⚠️ 생성형 스킬(②③④⑥)은 디자인 방향과 시각 규칙이 서로 다르므로 **한 작업에 하나만** 쓰는 편이 안전합니다. ④도 "관련 없는 미학 시스템을 섞지 말라"고 명시합니다.

### 공통 설치 방법

```bash
# 대부분의 저장소가 지원하는 skills CLI (에이전트 무관)
npx skills add <owner>/<repo>                     # 목록을 보여 주고 고르게 함
npx skills add <owner>/<repo> --skill <스킬이름>    # 특정 스킬만
```

Claude Code 플러그인 마켓플레이스를 지원하는 저장소는 `/plugin marketplace add <owner>/<repo>`로 등록한 뒤 `/plugin`에서 골라 설치합니다.

---

## ① Emil Kowalski — skills (16개)

https://github.com/emilkowalski/skills · 설치: `npx skills add emilkowalski/skills`

Sonner(React 토스트 라이브러리) 제작자의 디자인 엔지니어링 철학을 스킬로 만든 묶음입니다. 영상 제작자가 실제 작업에서 가장 많이 쓴다고 한 세 개는 **emil-design-eng, animate, improve-animations**입니다.

### emil-design-eng
https://github.com/emilkowalski/skills/tree/main/skills/emil-design-eng

- **🎬 영상**: 보기 좋은 UI 컴포넌트를 만들고 애니메이션을 붙이는 방법이 들어 있어 **디자인을 처음 시작할 때** 쓰기 좋습니다. 질문을 먼저 하고, 답하면 만들기 시작합니다. 영상의 첫 결과물은 모노톤 미니멀 스타일이었는데 애니메이션이 덜 다듬어졌고 타이밍이 맞지 않는 곳이 있었습니다. 그래서 다음 단계로 improve-animations를 썼습니다.
- **🔍 분석** (약 680줄, 묶음에서 가장 큼):
  - 철학: "취향은 타고나는 게 아니라 훈련된다", "보이지 않는 디테일이 쌓인다", "아름다움은 지렛대다".
  - **애니메이션 결정 프레임워크**: 애니메이션을 넣을지 → 목적 → easing → 속도 순으로 결정합니다.
  - 컴포넌트 원칙: 버튼은 즉각 반응해야 하고, `scale(0)`에서 시작하지 않으며, 팝오버는 트리거 위치를 기준으로 펼쳐지고, 툴팁은 연속 호버 시 지연을 생략합니다. 진입 효과에는 `@starting-style`을 씁니다.
  - clip-path 활용(탭 색 전환, 길게 눌러 삭제, 스크롤 이미지 리빌, 비교 슬라이더), 드래그·제스처(모멘텀 dismiss, 경계 감쇠, 멀티터치 방지).
  - 성능(transform/opacity만 애니메이트), 접근성(`prefers-reduced-motion`, 터치 기기 hover), 디버깅(슬로 모션, 프레임 단위, 실기기 테스트).
  - 리뷰 출력 형식이 정해져 있고 마지막에 체크리스트가 있습니다.

### animate
https://github.com/emilkowalski/skills/tree/main/skills/animate

- **🎬 영상**: 애니메이션을 처음부터 만드는 스킬입니다. **결정 순서가 정해져 있다**는 점이 특징이며, "애초에 움직여야 하는지"부터 "어떻게 사라지는지"까지 이어지는 이 순서가 결과를 가릅니다.
- **🔍 분석** — 7단계 빌드 순서:
  1. **움직여야 하나?** 사용 빈도로 판단합니다. 하루 100회 이상(키보드 단축키, 커맨드 팔레트)은 **애니메이션 금지**, 하루 수십 회는 거의 안 보이게, 가끔 쓰는 것(모달·드로어·토스트)은 표준, 드물거나 첫 경험(온보딩·성공)에만 "즐거움"을 씁니다.
  2. **목적 지정**: 피드백, 공간 일관성, 상태 표시, 급변 완화, 설명, 즐거움 가운데 하나로 이름을 붙이지 못하면 만들지 않습니다.
  3. **도구 선택**: CSS transition → `@starting-style` → CSS animation → WAAPI → Motion 순으로, 동작하는 것 중 가장 싼 것을 고릅니다.
  4. **속성**: transform/opacity만 씁니다. `scale(0)` 대신 `scale(0.9~0.97)`에 opacity 0을 함께 줍니다.
  5. **easing·duration**: 진입·퇴장은 ease-out, UI에 ease-in은 금지입니다. 기본 곡선은 `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`이고, UI 애니메이션은 300ms 미만으로 둡니다(버튼 100~160ms, 드롭다운 150~250ms, 모달 200~500ms).
  6~7. 중단(interrupt) 처리와 퇴장 방식까지 정합니다.
  - 핵심 규칙: "애니메이션을 안 만드는 것도 성공"이고, 선택지를 메뉴처럼 늘어놓지 말고 결정한 뒤 이유를 한 줄로 적습니다. reduced-motion 대응은 처음부터 같이 넣습니다.

### improve-animations
https://github.com/emilkowalski/skills/tree/main/skills/improve-animations

- **🎬 영상**: 이미 만든 코드베이스의 모든 움직임을 훑어 **우선순위를 매긴 감사 결과와 실행 계획**을 내놓습니다. 소스 코드는 건드리지 않고 계획만 세우므로, 그 계획을 그대로 실행시키면 됩니다. 영상에서는 적용 후 움직임이 스크롤과 맞아떨어지고 의도가 훨씬 분명해 보였습니다.
  - 단, 랜딩 페이지에서 가장 효과가 큰 건 스크롤 기반 애니메이션이라 차이가 크지 않았습니다. **진짜 위력은 앱의 기능적인 작은 요소**에서 나옵니다. 예를 들어 레스토랑 사이트에서는 폼 제출 모션과 호버 그래픽이 붙어 상호작용하는 느낌이 크게 좋아졌습니다.
- **🔍 분석**:
  - 4단계 흐름: ① 정찰(스택, 모션 라이브러리, 기존 easing 토큰, 사용 빈도 지도) → ② 8개 카테고리 병렬 감사(목적·빈도, easing·duration, 물리성·원점, 중단 가능성, 성능, 접근성, 일관성·토큰, 놓친 기회) → ③ 검증 후 영향÷노력 순 표로 제시하고 **사용자 선택을 기다림** → ④ `plans/NNN-slug.md`로 계획 작성.
  - 계획은 **"컨텍스트도 취향도 없는 실행자"를 기준**으로 씁니다. 정확한 cubic-bezier 값, 파일 경로, 코드 발췌를 모두 넣기 때문에 더 저렴한 모델에게 실행을 맡겨도 됩니다.
  - 옵션: `quick` / `deep`(감사 깊이), `performance` 같은 카테고리 지정, `plan <설명>`(감사 생략), `execute <plan>`(격리된 worktree에서 실행한 뒤 review-animations 기준으로 판정), `reconcile`(완료된 계획 정리).

### apple-design
https://github.com/emilkowalski/skills/tree/main/skills/apple-design

- **🎬 영상**: Apple이 자사 제품에 쓰는 디자인 원칙을 다른 웹사이트에도 적용할 수 있게 만든 스킬입니다.
- **🔍 분석**: 17개 섹션으로, 지연 제거, 1:1 직접 조작, **중단 가능성(가장 중요한 원칙)**, 스프링, 드래그→애니메이션 속도 이어받기, 모멘텀 예측, 러버밴딩, 반투명 재질과 깊이, 모션·사운드·햅틱, 타이포그래피(optical sizing, tracking, leading), 8가지 디자인 기초를 다룹니다. 제스처나 시트, 스와이프가 많은 UI에 특히 잘 맞습니다.

### animation-vocabulary
https://github.com/emilkowalski/skills/tree/main/skills/animation-vocabulary

- **🎬 영상**: 애매하게 설명한 애니메이션을 모델이 알아듣는 정확한 용어로 바꿔 줍니다.
- **🔍 분석**: 역방향 용어 사전입니다. 예를 들어 "팝오버 열릴 때 통통 튀는 거"는 *Pop in*, "iOS 고무줄 스크롤"은 *Rubber-banding*으로 바꿔 줍니다. 진입·퇴장, 시퀀싱, 스크롤, 피드백, easing, 스프링, 루핑, 폴리시, 성능 등 12개 카테고리로 나뉘어 있습니다. 비슷한 용어(Clip-path와 Mask, Pop in과 Bounce)는 차이를 대비해 알려 줍니다. **다른 스킬에 줄 프롬프트를 다듬을 때** 함께 쓰기 좋습니다.

### 🔍 영상에 안 나온 나머지 스킬

| 스킬 | 용도 |
|---|---|
| review-animations | 모션 코드 리뷰. 기본은 지적하는 쪽이고, 승인은 받을 만할 때만 줍니다 |
| find-animation-opportunities | 움직여야 하는데 안 움직이는 곳 찾기(읽기 전용, 정확한 값까지 제안) |
| remove-animations | 불필요한 모션 제거. "앱이 느리게 느껴진다"고 할 때 씁니다. 빼기만 합니다 |
| animation-performance | 프레임 드롭 원인 찾기, 레이아웃·페인트·컴포지트 파이프라인 |
| break-ui | 긴 이름, 이모지, 0개·초대형 숫자 같은 최악의 데이터로 UI 스트레스 테스트 |
| mobile-native | 웹앱을 폰에서 네이티브처럼 느끼게 하는 CSS·메타 태그 수정(100vh 버그, 입력 줌 등) |
| prototype | 서로 확실히 다른 여러 버전을 만들고 비주얼 피커로 비교 |
| pick-ui-library | 작업에 맞는 검증된 라이브러리 추천(명시적으로 호출할 때만 동작) |
| ask-sonner, animate-expo, write-swift | Sonner 가이드, React Native·Expo 애니메이션, Swift 작성법 |

---

## ② ConardLi — garden-skills (6개)

https://github.com/ConardLi/garden-skills · 설치: `npx skills add ConardLi/garden-skills -s web-design-engineer`

### web-design-engineer
https://github.com/ConardLi/garden-skills/tree/main/skills/web-design-engineer

- **🎬 영상**: 묶음에서 가장 중요한 스킬이며, 최상급 디자인 엔지니어처럼 디자인하는 방법이 들어 있습니다. **기능이 아니라 비주얼을 압도적으로 만드는 데만 집중합니다.**
  - 동작: 요구사항이 명확해질 때까지 함께 정리하고 → 참고할 실제 디자인을 찾습니다. 원칙은 **"좋은 디자인은 무(無)에서 시작하지 않는다"**입니다.
  - 디자인 판단 기준, 디자인이 망가지는 패턴, Apple·Linear 같은 사이트의 스타일 레시피가 레퍼런스로 들어 있습니다.
  - 결과물은 Claude Design 단독 버전보다 흥미롭고 꼼꼼했습니다. **이미 디자인이 있으면 영역별로 점수를 매겨** 주므로 만점이 나올 때까지 다듬고 다시 돌릴 수 있습니다.
- **🔍 분석**:
  - 워크플로: 사실 확인 → 요구사항 → 디자인 컨텍스트 수집 → **Design Read와 5개 다이얼 보정**(시각 변주도, 모션, 밀도 등을 1~10으로) → 디자인 시스템을 먼저 선언 → **v0 초안을 일찍 보여 줌** → 전체 빌드 → 검증 → 비평.
  - **스타일 레시피 26종**(`references/style-recipes/`): linear, apple-hig, raycast, vercel-mesh, stripe-press, aesop, muji-kenya-hara, dieter-rams-braun, pentagram, tufte-dataink, bloomberg-terminal, y2k-retrofuturism 등. "Linear 스타일로"처럼 말하면 해당 레시피의 팔레트, 타이포, 여백, radius, 그림자, 모션 값을 그대로 가져다 씁니다.
  - **5개 차원 채점**(각 0~10): 철학 일치도, 시각 위계(제목:본문 비율 2.5배 이상), 완성도(8pt 그리드, 색 4개 이하, 폰트 2개 이하), 기능성("지웠을 때 나빠지나?"), 독창성. 결과로 유지할 점, 심각도순 수정 사항, Quick Win 3개를 줍니다.
  - 레퍼런스가 없으면 **Design Direction Advisor**로 넘어갑니다. 질문 10개 대신 서로 다른 학파에서 고른 방향 3개를 제시합니다(에디토리얼·미니멀, 모던 툴 SaaS, 브루탈리스트 등).
  - 안티 클리셰 규칙: 기본적으로 이모지를 쓰지 않고, 브랜드 스펙이 쓰는 경우만 예외입니다. 기존 사이트를 고칠 때는 확장 / 보존 리디자인 / 전면 리디자인 중 무엇인지 먼저 분류합니다.
  - 대상: 페이지, 대시보드, 프로토타입, 슬라이드, 데이터 시각화. 백엔드나 CLI는 범위 밖입니다.

### 🔍 묶음의 나머지 스킬
영상의 "영상 프레젠테이션, 이미지 같은 것"에 해당합니다. beautiful-article(소재를 단일 HTML 기사로), web-video-presentation(클릭으로 넘기는 16:9 영상형 웹 프레젠테이션), motion-showreel(코드로 만드는 모션 영상, MP4 출력), gpt-image-2(이미지 프롬프트 템플릿 80여 개), kb-retriever(로컬 지식베이스 검색).

---

## ③ elayadesign — ai-design-skills

https://github.com/elayadesign/ai-design-skills · 설치: `npx skills add elayadesign/ai-design-skills --skill landing-page-design`

### landing-page-design
https://github.com/elayadesign/ai-design-skills/tree/main/skills/landing-page-design

- **🎬 영상**: 랜딩 페이지 하나만 보고 만든 단일 스킬이며, 모든 내용이 파일 하나에 들어 있습니다. 아이디어를 **비주얼 시스템**(색, 타입, 여백 규칙)으로 바꿔 줍니다.
  - 핵심 생각: **"랜딩 페이지는 홈페이지가 아니다."** 홈페이지는 여러 방문자를 상대하지만, 랜딩 페이지는 들어온 사람이 **하나의 행동**을 하게 만드는 데 집중합니다.
  - 모델이 흔히 놓치는 **SEO**까지 챙깁니다. 질문부터 하며, 결과물은 진짜 브랜드 같았고 구매 전환율이 높아 보였습니다.
- **🔍 분석** — Part A(전략)를 끝낸 뒤 Part B(시각)로 넘어갑니다:
  - **A1 인테이크**: 주요 행동 하나, 오퍼, ICP, 전환을 막는 반대 이유 Top 3, 유입 경로, 증거 자료를 **한 번에 묶어서** 묻습니다. 답이 없으면 가정을 한 줄로 밝히고 진행합니다.
  - **A2 페이지 구조**(12블록): 첫 화면(헤드라인, 서브헤드, CTA, 증거 1개, 히어로 비주얼) → 중반(문제→해결, 혜택 3~5개, 3단계 사용법, 사회적 증거) → 하단(FAQ 6~12개, 위험 제거 장치, 상단과 같은 최종 CTA).
  - **A3 레이아웃 4종**: 클래식 히어로, 롱폼 스토리, 미니멀 전환형, 비교 페이지("X vs Y" 검색 대응).
  - **A4 전환 규칙**: 광고 메시지와 히어로 일치, 첫 화면 경쟁 CTA 금지, 기능보다 혜택, 구체적 수치("주간 리포트 4시간 → 15분"), 위험 제거(무료 체험, 언제든 해지 등).
  - **A5 카피**: 헤드라인 공식("{고통} 없이 {결과}"), CTA는 동사와 받는 것으로 씁니다("Learn more"와 "Submit"은 금지).
  - **A7 SEO와 AEO**(AI 답변 엔진 최적화까지).
  - **Part B 시각 시스템**: 타입 스케일, 여백, radius, 다크모드 배경색, 히어로, 아이콘, 모션, 상태, **필수 "태그라인 리빌" 섹션**.
  - 기존 사이트 개선용으로는 같은 제작자의 `redesign-existing-projects` 스킬을 따로 권장합니다. 묶음에는 Figma MCP용 `figma-designer`도 있습니다.

---

## ④ Meng To — Skills (web-design 90여 개 외)

https://github.com/MengTo/Skills · ⚠️ README에 공식 설치 안내가 아직 없습니다("추후 추가"). 필요한 스킬 폴더를 `~/.claude/skills/`에 직접 복사하세요.

오래 활동한 디자이너로, 몰입감 있는 **스크롤 기반 스토리텔링** 디자인으로 유명합니다. 스킬 전체가 "보기 좋은 것"보다 **이야기를 하는 고품질 디자인**을 목표로 합니다. 🔍 저장소에는 web-design 외에도 3d, game, illustration, media, ui, workflow 카테고리가 있습니다.

### build-awwwards-quality-sites
https://github.com/MengTo/Skills/tree/main/agent-skills/web-design/build-awwwards-quality-sites

- **🎬 영상**: Awwwards 수상작들이 가진 원칙과 디테일을 정리한 스킬입니다. Claude는 혼자서 그 수준으로 디자인하지 않기 때문에 스킬이 원칙을 작업 과정에 넣어 방향을 끌고 갑니다. 원칙뿐 아니라 **사이트를 비싸 보이게 만드는 실제 기법과 효과**도 들어 있습니다. 결과물은 은은한 애니메이션 배경과 **스크롤 기반 스토리텔링**을 갖춰 수상작처럼 구성됐습니다.
- **🔍 분석**(약 65줄로 짧지만 밀도가 높음) — 7단계:
  1. **아트 디렉션**: 레퍼런스는 위계, 페이싱, 대비 같은 상위 특성만 추출하고 에셋이나 코드는 복제하지 않습니다. 코딩 전에 비주얼 논지, 히어로 초점, 섹션 순서, 모션 내러티브를 한 번에 정리합니다.
  2. **정직한 에셋**: 모델이 SVG나 CSS로 일러스트를 그리지 않습니다. 아바타는 실제 사진만 쓰고(이니셜이나 실루엣은 금지), 아이콘은 Iconify Solar를 씁니다. 근거 없는 로고 월은 넣지 않습니다.
  3. **히어로**: GSAP 인트로 시퀀스를 쓰되 애니메이션이 끝나기 전에도 CTA는 쓸 수 있어야 합니다. JS나 WebGL 없이도 완전한 정적 첫 프레임을 갖춥니다.
  4. **모션 시스템**: GSAP를 기본으로 하고, 스무스 스크롤은 **Lenis와 Locomotive 중 정확히 하나만** 써서 ScrollTrigger와 연동합니다. 제목은 단어 단위로 절제된 stagger로 드러냅니다. reduced-motion에서는 애니메이션을 줄이는 게 아니라 최종 상태를 바로 보여 줍니다.
  5. **Three.js는 목적이 있을 때만**: DPR 상한, 화면 밖에서 렌더링 정지, 리소스 해제, 정적 포스터 대체.
  6. **거부 목록**: 흔한 그라디언트 블롭, 장식용 벤토 그리드, 남발된 글래스, 가짜 후기, 지어낸 파트너십, 서사 없는 모션.
  7. **검증**: 프로덕션 빌드, 키보드·터치, JS 없는 상태, 스크롤 엔진이 하나만 초기화됐는지 확인합니다. 결과물을 "수상작"이라고 부르지 않습니다.

### video-to-superprompt
https://github.com/MengTo/Skills/tree/main/agent-skills/codex/video-to-superprompt

- **🎬 영상**: 웹사이트 화면 녹화를 받아 에이전트용 프롬프트로 바꿔 줍니다.
- **🔍 분석**: `ffprobe`와 `ffmpeg`로 프레임을 추출한 뒤 스토리, 레이아웃, 모션, 비주얼, 기술 재구성, 접근성·성능의 6개 층위로 분석합니다. 그다음 에셋 맵과 **섹션별 해부**(목적, 레이아웃, 애니메이션, 스크롤, 라이브러리, reduced-motion 대체)가 담긴 단일 프롬프트를 씁니다. "예쁘게", "비슷한 애니메이션" 같은 모호한 표현은 금지하고, 핀 고정 섹션, 스크럽 타임라인, `video.currentTime` 같은 정확한 메커니즘 이름을 쓰게 합니다. 출력은 프롬프트만, 기사, 구현 브리프, 에셋 생성 팩 중에서 고릅니다. 마음에 드는 사이트를 녹화해 ④나 ② 스킬의 입력으로 쓰면 좋습니다. ※ 경로상 `codex` 폴더에 있지만 SKILL.md 형식이라 Claude에서도 쓸 수 있습니다.

---

## ⑤ Jakub Krehel — skills (14개)

https://github.com/jakubkrehel/skills · 설치: `npx skills add jakubkrehel/skills` 또는 `/plugin marketplace add jakubkrehel/skills` 후 `/plugin install interfaces@interfaces`

- **🎬 영상**: 다른 묶음은 스킬 하나가 사이트 전체를 처리하지만, 이 묶음은 **영역별로 쪼개져** 있습니다(타이포그래피, 색, 접근성이 각각 스킬).
- **🔍 분석**: `better-*` 스킬이 영역별 규칙을 맡고, `better-interface`가 이를 모아 심각도와 판정을 내리는 구조입니다. 그래서 리뷰 스킬을 쓰려면 **better-interface도 함께 설치해야** 합니다.

### interface-review
https://github.com/jakubkrehel/skills/tree/main/skills/interface-review

- **🎬 영상**: 디자인의 모든 측면을 빠짐없이 검토하고 점수를 매겨 줍니다. **GitHub에 연결하면** 변경 전후를 비교해 "전에는 되던 게 마지막 수정 이후로 안 된다"를 짚고 **어떤 변경 때문에 망가졌는지**까지 알려 줍니다. 애니메이션, 접근성, 반응형까지 보고 목록으로 뽑아 줍니다.
- **🔍 분석**:
  - 화면이 아니라 **변경(브랜치, PR, 커밋 전 수정)을 리뷰**합니다. `/interface-review pr 482`처럼 대상을 지정할 수 있습니다.
  - 범위 결정: 기본 브랜치보다 앞선 커밋과 미커밋 변경 → 미커밋 변경만 → 둘 다 없으면 **임의로 HEAD~1을 고르지 않고 물어봅니다**.
  - 바뀐 파일만 보지 않고 그 파일이 렌더되는 화면(직접 import하는 곳, 최대 5곳)까지 넓혀서 봅니다.
  - 디프에서 **삭제된 줄(-)을 읽어** 회귀를 찾고, 모든 지적을 `Introduced` / `Regression` / `Pre-existing` 중 하나로 분류합니다(`git blame`으로 판별).
  - PR 설명이나 이슈와 대조해 **미완성 변경**을 찾습니다. 예를 들어 새 variant에 hover/focus/disabled 상태가 빠졌거나, 번역 키가 누락된 경우입니다.
  - 읽기 전용입니다. checkout, stash, switch를 하지 않습니다.

### better-layout
https://github.com/jakubkrehel/skills/tree/main/skills/better-layout

- **🎬 영상**: 영상 제작자가 꼽은 **Claude Design이 실제로 약한 지점**인 여백, 위치, 요소 간 정렬을 아주 꼼꼼히 봅니다. 예를 들어 "이 날짜는 지금보다 공간이 몇 px 더 필요하다"까지 잡아냅니다. 사이트가 극적으로 바뀌지는 않지만 실제 디자인 원칙에 맞게 정확해집니다.
- **🔍 분석** — 주요 규칙:
  - 그룹은 선이 아니라 여백으로 나눕니다. **그룹 사이 간격은 그룹 내부 간격의 2배 이상**입니다(내부 8px이면 사이 16px 이상).
  - 좌우 대신 논리 속성(`margin-inline-start`)을 써서 RTL을 지원하고, 시각 순서와 DOM 순서를 일치시킵니다.
  - 뷰당 주요 액션은 하나만 두고, 보조 액션이 3개를 넘으면 메뉴로 넣습니다. 숨은 콘텐츠는 16~32px 정도 보이게(peek) 합니다.
  - 테두리 없는 컨트롤 사이는 24px, 테두리 있는 컨트롤 사이는 12px로 둡니다. 브레이크포인트는 기기 프리셋이 아니라 콘텐츠 기준으로 정하고, 컨테이너 쿼리를 우선합니다.
  - 탐지 표(바로 쓸 수 있음): `1fr`이 넘칠 때는 `minmax(0, 1fr)`, `100vw` 대신 `100%`, 모바일 `100vh` 대신 `100dvh`, sticky 헤더에는 `scroll-padding-block-start`, safe-area를 쓰려면 `viewport-fit=cover`.
  - 320px 너비나 200% 줌에서 잘리거나 겹치면 무조건 HIGH입니다. 결과는 심각도 / 위치 / Before / After / 이유 표로 줍니다.

### 🔍 나머지 스킬
better-accessibility(WCAG 2.2), better-colors(팔레트와 대비 측정), better-typography, better-ui(radius, 그림자, 광학 정렬), better-writing(UI 카피), better-interface(종합 리뷰), break(시나리오별 스트레스 테스트), state-machine(컴포넌트의 모든 상태 렌더), variant(변형 여러 개 만들고 고르기), build-design(Figma나 이미지를 기존 토큰으로 구현), explain-interface(URL이나 스크린샷이 어떻게 만들어졌는지 설명), teardown(기술 일러스트).

---

## ⑥ codeswithroh — tastemaker

https://github.com/codeswithroh/tastemaker · 설치(Claude Code 권장): `/plugin marketplace add codeswithroh/tastemaker` 후 `/plugin install tastemaker@codeswithroh`

- **🎬 영상**: 목적은 모델이 내놓는 뻔한 기본값을 피하는 것인데, **방식이 특별합니다**.
  - 보통 모델은 레퍼런스 이미지를 받으면 텍스트 요약으로 바꿔 두지만, 이 스킬은 **스크립트로 레퍼런스 픽셀에서 정확한 디자인 값을 뽑아 구조화된 형태로 저장**합니다. 그래서 말로 옮기며 사라지는 디테일이 남습니다.
  - 여러 방향으로 변주를 만들어 보는 일처럼 에이전트가 직접 할 필요 없는 일은 스크립트가 맡습니다.
  - 여기서 내린 결정이 화면 하나로 끝나지 않고 **프로젝트 전체로 이어집니다**. "모델에게 취향을 지어 준다"는 표현을 씁니다.
  - 영상의 결과물은 급하게 만든 느낌이 전혀 없었고 요청한 분위기와 잘 맞았습니다.
- **🔍 분석**:
  - 세 가지 아이디어: ① 설명이 아니라 **실제 픽셀**에 근거, ② 다시 도출하지 말고 **기억**, ③ PRD나 스펙에 있는 화면에만 집중.
  - **메모리 계층**: 현재 요청 > `.tastemaker/style-lock.md`(프로젝트 스타일 고정) > `.tastemaker/decisions.log` > `~/.tastemaker/profile.md`(여러 프로젝트에 걸친 개인 취향). 스타일이 한 번 잠기면 다음 화면에서도 같은 토큰을 씁니다.
  - **4가지 모드**: `build`(기본), `study`(좋아하는 디자인의 DNA 추출), `audit`("왜 AI가 만든 것 같지?"에 번호 붙은 게이트로 채점), `comps`(코드 없이 시안만).
  - `scripts/extract_palette.py`로 이미지에서 대표 색을 결정적으로 추출하고, 레퍼런스가 없으면 앱 아이디어의 무드 키워드로 팔레트를 새로 생성합니다.
  - **직접 그리지 말고 가져다 씀**: 차트, 벤토, 가격표는 shadcn 호환 레지스트리에서 가져옵니다(직접 만들면 슬롭 신호가 되기 때문). 먼저 스택을 확인해서 정적 HTML 프로젝트에 `npx shadcn`을 쓰는 일을 막습니다.
  - **한국어 같은 비라틴 문자를 먼저 확인**하고 폰트 페어링 방식을 바꿉니다. 한국어 사이트라면 장점입니다.
  - 선택 사항으로 브루탈리스트, 미니멀 같은 미학 모드가 있고, 하위 스킬 `ideagram`은 unDraw 일러스트를 브랜드 색으로 바꿔 씁니다.
  - 영상의 "앞에서 정리한 스타일 요구사항을 같이 줬다"는 이 메모리 구조를 활용한 사용법입니다.

---

## ⑦ Owl-Listener — designer-skills

https://github.com/Owl-Listener/designer-skills · 설치: `/plugin marketplace add Owl-Listener/designer-skills` → `/plugin` → **Discover** 탭에서 원하는 컬렉션만 선택 (Gemini CLI도 지원)

- **🎬 영상**: **실제 연구에 근거**합니다. 디자이너들이 기준으로 삼는 이름 붙은 법칙마다 스킬이 따로 있고, "사람들이 왜 사이트를 보다 나가는가" 같은 주제도 다룹니다. **전부 설치할 필요 없이** 필요한 것만 고르면 되며, 영상 제작자는 아래 두 가지를 넣었습니다.
- **🔍 분석**: 전체 규모는 플러그인 33개, 스킬 273개, 커맨드 76개입니다(design-research, design-systems, interaction-design, ux-strategy 등). 접근성 쪽은 별도 저장소 `Owl-Listener/inclusive-design-skills`에 있습니다.

### visual-critique (스킬 7개 + 커맨드 2개)
https://github.com/Owl-Listener/designer-skills/tree/main/visual-critique

- **🎬 영상**: 화면 하나를 7개 차원으로 나눠 봅니다. 차원마다 스킬이 있고, **커맨드 하나로 7개가 한 번에** 돌아갑니다.
- **🔍 분석**:
  - 7개 스킬: `critique-visual-hierarchy`(시선 진입점과 흐름), `critique-brand-consistency`(mood.md, voice.md, tokens.md 대조), `critique-composition`(균형, 여백, 리듬, 게슈탈트), `critique-typography`, `critique-color`(대비, 의미색), `critique-affordance`(클릭 가능해 보이는지, CTA 명확성), `critique-information-density`(인지 부하, 점진적 노출).
  - **`/critique-screen [화면 이름, Figma URL, 스크린샷]`**: 7개를 모두 돌린 뒤 **P1(출시 전 필수) / P2(이번 스프린트) / P3(여력이 될 때)**로 묶은 수정 목록을 주고, 가장 강한 차원과 가장 약한 차원을 요약합니다.
  - 브랜드 일관성 비평은 mood.md 같은 브랜드 파일이 있을 때만 의미가 있습니다.
  - UX 흐름용 `/critique-ux` 커맨드도 있습니다.

### ui-design (스킬 19개 + 커맨드 5개)
https://github.com/Owl-Listener/designer-skills/tree/main/ui-design

- **🎬 영상**: 사람의 눈이 실제로 디자인을 어떻게 보고 이해하는지에 대한 법칙이 하나씩 스킬로 들어 있습니다. 리뷰를 돌리면 문제를 순위대로 정리해 주고, 법칙을 적용하면 사이트가 확실히 정돈됩니다.
- **🔍 분석**:
  - **게슈탈트·지각 법칙 8개**: 근접(law-of-proximity), 유사(similarity), 폐쇄(closure), 연속(continuity), 전경-배경(figure-ground), 공통 영역(common-region), 폰 레스토르프 효과(von-restorff, 하나만 달라 보여야 기억됨), 심미적 사용성 효과(aesthetic-usability).
  - **시스템 스킬 11개**: visual-hierarchy, spacing-system, typography-scale, readable-measure(가독 줄 길이), layout-grid, color-system, dark-mode-design, responsive-design, platform-conventions, data-visualization, illustration-style.
  - 커맨드: `/design-screen`, `/type-system`, `/color-palette`, `/responsive-audit`, `/platform-audit`.
  - 각 법칙 스킬의 설명에 "언제 쓰고 언제 다른 스킬을 쓸지"가 적혀 있습니다. 예를 들어 근접은 여백만으로 그룹을 만들 때, 공통 영역은 공간이 좁아 컨테이너로 묶어야 할 때 씁니다.
