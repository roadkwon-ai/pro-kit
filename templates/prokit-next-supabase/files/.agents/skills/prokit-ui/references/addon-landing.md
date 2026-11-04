# landing-page-design 보조 (선택 묶음 `landing`)

`.agents/skills/landing-page-design/`이 있을 때만 읽는다. 원본은 [elayadesign/ai-design-skills](https://github.com/elayadesign/ai-design-skills)의 `landing-page-design`(MIT)이다. 방문자가 행동 하나(가입, 구매, 신청)를 하게 만드는 랜딩의 전략(Part A: 인테이크, 페이지 구조, 레이아웃, 전환 카피, SEO·AEO)과 시각 규칙(Part B)을 담았다. 묶음이 없는데 사용자가 원하면 `pnpm skills:setup --optional landing` 설치를 제안한다.

## 언제 쓰나
- 종류는 방향 보조다. 한 화면에는 방향 보조를 하나만 쓴다(`prokit-ui` "화면 디자인 보조").
- 주 행동이 하나인 화면(랜딩, 가입 유도, 가격, 행사 신청)에 쓴다. 사용자가 "landing으로"라고 했거나 브리프의 `보조:` 줄에 `landing`이 있는 화면이다. 여러 방문자를 상대하는 홈, 로그인 뒤 앱 화면에는 쓰지 않는다.
- 이 스킬은 "모든 웹 UI 작업"에서 스스로 불리고 "이 파일이 프레임워크 기본값보다 앞선다"고 쓰여 있다. 이 프로젝트에서는 그 문장을 따르지 않는다. 고르지 않은 화면에서 불려도 `prokit-ui` 흐름대로 한다.

## 프로젝트 규칙이 앞선다
Part A(전략과 카피)는 그대로 쓴다. Part B(시각 규칙)는 `DESIGN.md`와 토큰이 정하지 않은 값만 참고한다.
- 서체 허용 목록(Geist, Manrope, Poppins)에는 한글 글자가 없다. 한글 본문과 제목은 [design-flow.md](design-flow.md) "서체"의 한글 서체를 쓴다.
- 고정 hex(다크 배경 여섯 색, 히어로 제목의 회색 텍스트 그라디언트)를 코드에 넣지 않는다. 쓰려면 토큰으로 정의하고 브리프에 적는다.
- 모션 곡선과 시간은 임의 Tailwind 값(`ease-[cubic-bezier(…)]`) 대신 `globals.css`의 토큰으로 둔다.
- 필수로 적힌 "Tagline reveal" 섹션은 브리프에서 사용자가 고를 때만 넣는다.
- 본문 하이픈 금지, sentence case, 한 단어 줄 금지는 영어 문구에만 적용한다. 한글 제목은 `prokit-ui` 규칙대로 `break-keep`이다.
- B10의 배포 요구(404, 개인정보·약관 링크, og 태그)는 이번 범위의 페이지만 만든다. 만들지 않는 페이지로 가는 링크는 두지 않는다(`prokit-ui` 규칙).
- 동반 스킬 `redesign-existing-projects`는 설치하지 않는다. 리디자인은 design-flow "리디자인"을 따른다.

## 단계 대응
| `prokit-ui` 단계 | landing-page-design | 남기는 곳 |
|---|---|---|
| 기획 | A1 인테이크(주 행동, 오퍼, 대상, 전환을 막는 이유 셋, 유입 경로, 증거)를 `PRODUCT.md` 질문과 한 번에 묻는다. 답이 없는 항목은 지어내지 않고 가정 한 줄로 적어 확인받는다 | `PRODUCT.md`, 브리프 |
| 설계 | A2 구조(첫 화면, 중반, 하단의 블록)와 A3 레이아웃 하나를 사이트맵과 브리프에 적는다. A5 헤드라인과 CTA 후보는 design-flow "이름과 문구"의 후보와 함께 낸다. 수치, 후기, 로고는 사용자가 준 것만 쓴다 | 브리프의 구조·카피 절 |
| 개발 | 브리프의 섹션 순서와 카피대로 만든다. 색인할 랜딩이면 A7대로 title과 meta description을 Next.js `metadata`로 넣는다(Better-T-Stack이 넣은 기본값인 프로젝트 이름을 남기지 않는다). FAQ가 있으면 FAQ 구조화 데이터를 JSON-LD로 더한다 | 대조표 구현 행 |
| 리뷰 | 주 UI 스킬의 리뷰 뒤 끝의 Quick checklist로 빠진 항목을 센다. meta tags처럼 코드로 볼 수 있는 항목은 diff에서 확인하고 센다 | 리뷰 보고서에 `landing 체크리스트 미충족 N`과 항목 |
