# v0.1.6 — Move preset production records out of pro-kit

- 날짜: 2026-10-14 15:44 (KST)
- 이전 버전: v0.1.5
- 전체 변경: https://github.com/roadkwon-ai/pro-kit/compare/v0.1.5...v0.1.6

## Maintenance

- 루트 Neon 스킬 사본을 지우고 루트 스킬 규칙과 검사를 더함 (`fe03043`)
  - 저장소 루트의 Neon 공식 스킬 사본(.agents·.claude), skills-lock 항목, Apache 2.0 고지 사본과 THIRD_PARTY_NOTICES의 해당 절을 지운다
  - Neon 스킬은 템플릿 설치 목록에 따라 사용자 프로젝트에만 설치된다
  - 루트에는 prokit-docs·prokit-writing만 두고 검증에 필요한 스킬은 잠시 설치했다가 지운다는 규칙을 AGENTS.md·CONTRIBUTING.md에 적는다
  - 루트에 다른 스킬·역할이나 skills-lock 항목이 추적되면 실패하는 테스트를 더한다
- 남은 프리셋 제작 기록과 루트 스킬 사본 정리 (`3fd29c7`)
  - 보고서(슬라이드랩 제작 실측, 프리셋 디자인 설정과 제작 기본 기능, 슬라이드랩 게시 실행 검증)와 디자인 평가 JSON을 pro-kit-preset-skills로 옮긴다
  - 프리셋 디자인 설정 설계·계획, 폰트 조사, 샘플 에셋 팩 설계·계획과 템플릿 VERIFICATION의 제작 규칙 이력 두 절을 pro-kit-preset-skills로 옮긴다
  - 쓰는 곳이 없는 루트 prokit-pack-use·prokit-ui·prokit-verify 사본을 지운다(정본은 templates/*/files)
  - handbook UI/UX 흐름·검증 결과·공식 스킬 쪽과 AGENTS.md에서 제작 규칙을 덜고 활용 안내와 담당 안내만 남긴다
- 프리셋 제작 스킬·역할과 제작 기록을 pro-kit-preset-skills로 이전 (`a172b4c`)
  - prokit-preset-* 제작 스킬 5개와 제작 역할 3개(.agents·.claude·.codex)의 옛 사본, skills-lock 항목을 지운다
  - 제작 스킬 검증, 슬라이드랩 원본 충실도, 게시 준비 보고서를 pro-kit-preset-skills로 옮기고 그 보고서를 가리키던 링크는 경로를 적은 글로 바꾼다
  - handbook 프리셋 쪽을 "완성팩 활용과 담당 구분"으로 줄이고 CONTRIBUTING·AGENTS·README의 제작 설명을 담당 안내로 바꾼다
