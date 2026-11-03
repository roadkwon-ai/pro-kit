# web-design-engineer 보조 (선택 묶음 `web-design-engineer`)

`.agents/skills/web-design-engineer/`가 있을 때만 읽는다. 원본은 [ConardLi/garden-skills](https://github.com/ConardLi/garden-skills)의 `web-design-engineer`(MIT)다. "좋은 디자인은 무에서 시작하지 않는다"는 원칙으로 실제 레퍼런스에 기대어 방향을 잡고, 스타일 레시피(`references/style-recipes/`), 실패 패턴, 5개 차원 채점을 담았다. 묶음이 없는데 사용자가 원하면 `pnpm skills:setup --optional web-design-engineer` 설치를 제안한다.

## 언제 쓰나
- 종류는 원칙 보조다. 두 가지로 쓴다.
  - 방향: 사용자가 스타일 레시피의 이름을 지목했거나("Linear처럼", "Stripe Press처럼") 요청이 모호해 방향이 필요한 화면. 이때는 방향 보조로 세고, 한 화면에 방향 보조는 하나만 쓴다(`prokit-ui` "화면 디자인 보조").
  - 지목한 이름이 디자인 카탈로그(design-flow "디자인 카탈로그에서 고르기", `use-design-md`)에도 있으면 카탈로그의 `DESIGN.md`가 방향이다. 이때 레시피는 방향 보조로 세지 않고, 카탈로그에 없는 값(모션, 밀도)만 참고한다.
  - 채점: 설치되어 있으면 리뷰 단계에서 5개 차원 채점을 더한다. 채점은 다른 보조와 함께 쓴다.
- 이 스킬은 페이지, 대시보드, 프로토타입, 비평까지 스스로 불린다. 위 두 경우가 아니면 `prokit-ui` 흐름대로 한다.

## 프로젝트 규칙이 앞선다
- 스킬의 결과물은 CDN을 쓰는 단일 HTML 파일이다(인라인 Babel, Tailwind·Lucide CDN 금지, `Landing Page.html` 같은 파일). 이 프로젝트에서는 HTML 파일을 만들지 않는다. 코드는 Next.js App Router, `packages/ui`의 shadcn, 토큰으로 `prokit-ui-builder`가 쓴다.
- 스킬이 요구하는 디자인 시스템 선언(팔레트, 서체, 간격, 반경, 그림자, 모션)은 브리프의 절로 쓰고 확인받는다. 확정한 값은 토큰과 `DESIGN.md`로 둔다. `brand-spec.md`를 따로 만들지 않는다.
- 색은 토큰으로만 쓴다. 스킬의 `oklch()` 확장 색은 토큰 정의에서만 쓴다.
- 금지 서체 목록과 "색 넷 이하, 서체 둘 이하"는 참고 기준이다. 한글 서체는 design-flow "서체"를 따른다.
- 아이콘은 `components.json`의 `iconLibrary`를 쓴다. `[icon]` 자리 표시는 남기지 않는다.
- 브라우저 검수는 `prokit-verify`(`prokit-runtime-checker`)가 한다. 스킬의 `yt-dlp`·`ffmpeg` 에셋 수집은 사용자가 요청할 때만 쓴다.

## 단계 대응
| `prokit-ui` 단계 | web-design-engineer | 남기는 곳 |
|---|---|---|
| 시각 방향 | 레시피를 지목했으면 `references/style-recipes/INDEX.md`에서 그 레시피를 찾아 팔레트, 서체, 간격, 반경, 그림자, 모션 값을 스타일 질문의 선택지로 낸다. 없으면 지어내지 않고 "레시피에 없음"이라고 알린다. 모호하면 Design Direction Advisor처럼 서로 다른 계열의 방향 셋을 낸다 | 브리프에 레시피 이름이나 방향과 고른 이유 |
| 설계 | Design Read와 다섯 다이얼(시각 변주, 모션, 밀도 등 1\~10)을 브리프에 적는다 | 브리프 |
| 개발 | 고른 레시피의 값을 토큰으로 옮긴 뒤 위임 지시에 `.agents/skills/web-design-engineer/SKILL.md`와 그 레시피 파일 경로를 넣는다 | 대조표 구현 행 |
| 리뷰 | 주 UI 스킬의 리뷰 뒤 `SKILL.md`의 "Step 7: Critique"와 `references/critique-guide.md`(꼴, 가중치, 기준)를 읽고 5개 차원(철학 일치, 시각 위계, 완성도, 기능성, 독창성. 각 0\~10)을 채점하고 유지할 점, 심각도순 수정, Quick Win 셋을 받는다 | 리뷰 보고서에 `web-design-engineer 철학 N, 위계 N, 완성도 N, 기능성 N, 독창성 N` |
