# build-awwwards-quality-sites 보조 (선택 묶음 `awwwards`)

`.agents/skills/build-awwwards-quality-sites/`가 있을 때만 읽는다. 원본은 [MengTo/Skills](https://github.com/MengTo/Skills)의 `build-awwwards-quality-sites`(MIT)다. 스크롤 스토리텔링과 모션이 중심인 브랜드·쇼케이스 페이지를 위한 지침으로 아트 디렉션, 정직한 에셋, 히어로, 모션 시스템, Three.js, 거부 목록, 검증의 일곱 절이다. 묶음이 없는데 사용자가 원하면 `pnpm skills:setup --optional awwwards` 설치를 제안한다.

## 언제 쓰나
- 종류는 원칙 보조다. 스스로 디자인 방향을 정하지 않고 "설치된 웹 디자인 스킬 하나를 골라 따르라"고 한다. 그 스킬은 주 UI 스킬이다(방향 보조를 고른 화면이면 그 보조). 그래서 방향 보조와 함께 쓴다.
- 브랜드 소개, 포트폴리오, 행사, 제품 출시 페이지에서 사용자가 "어워드급", "몰입감 있게", "스크롤 스토리텔링"을 원했거나 "awwwards로"라고 한 화면, 브리프의 `보조:` 줄에 `awwwards`가 있는 화면에 쓴다. 앱 화면(대시보드, 설정, 목록)에는 쓰지 않는다.

## 프로젝트 규칙이 앞선다
- 새 의존성 GSAP·ScrollTrigger와 스크롤 엔진 하나(Lenis나 Locomotive 중 하나), Three.js는 브리프에서 사용자가 고른 경우만 더하고 `docs/adr/`에 이유를 남긴다. 고르지 않았으면 CSS와 `<ViewTransition>`으로 만든다(`prokit-ui` "개발").
- 페이지 전환은 `prokit-ui`의 `<ViewTransition>` 규칙이 앞선다. 스크롤 엔진은 한 페이지에서 하나만 초기화한다.
- 제목을 단어 단위로 나눠 드러내는 효과는 한글에서 어절 단위로 나눈다. 접근성 이름은 나누지 않은 문장 그대로 둔다(스킬 규칙과 같다).
- 아이콘은 `components.json`의 `iconLibrary`를 쓴다. 스킬의 Iconify Solar는 그 라이브러리에 없는 아이콘만 쓴다.
- 사진과 생성 이미지는 `prokit-ui` "이미지 그리기" 순서와 출처 규칙을 따른다. 스킬의 "SVG나 CSS로 일러스트를 그리지 않는다", "가짜 후기·로고 월 금지"는 프로젝트 규칙과 같다.
- 결과물을 "수상작"이라고 부르지 않는다(스킬 규칙과 같다).

## 단계 대응
| `prokit-ui` 단계 | build-awwwards-quality-sites | 남기는 곳 |
|---|---|---|
| 설계 | 코딩 전에 쓰는 "compact direction"(비주얼 논지, 히어로 초점 에셋, 서체 위계, 색 시스템, 섹션 순서, 모션 서사, 스크롤 엔진, Three.js 여부, 에셋 출처 계획)을 브리프의 모션 계획 절로 쓰고 확인받는다 | 브리프 |
| 시각 자산 | 히어로의 정적 첫 프레임(JS·WebGL 없이 완결)과 에셋 출처를 정한다 | 브리프, 출처 줄 |
| 개발 | 위임 지시에 `.agents/skills/build-awwwards-quality-sites/SKILL.md`와 브리프의 모션 계획을 넣는다. 히어로는 애니메이션이 끝나기 전에도 CTA를 누를 수 있어야 한다. reduced-motion에서는 스무스 스크롤과 scrub을 끄고 최종 상태를 바로 보인다 | 대조표 구현 행 |
| 리뷰 | 주 UI 스킬의 리뷰 뒤 거부 목록(장식용 그라디언트 블롭, 장식용 벤토, 남발한 글래스, 서사 없는 모션)과 검증 절(프로덕션 빌드, 키보드·터치, JS 없는 상태, 스크롤 엔진 하나)을 확인한다. 브라우저 확인은 `prokit-verify`가 한다 | 리뷰 보고서에 `awwwards 거부 목록 걸림 N, 검증 미충족 N` |
