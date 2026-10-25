# v0.3.2 — Yunseul preset tutorial and pack

- 날짜: 2026-10-25 15:27 (KST)
- 이전 버전: v0.3.1
- 전체 변경: https://github.com/roadkwon-ai/pro-kit/compare/v0.3.1...v0.3.2

## Docs

- 윤슬당한의원 프리셋 공개 교재와 팩 정보, 공통 값 반영 (`27b3dce`)
  - 윤슬당한의원 교재(프리미엄 팩 받기·ZIP 복원·나만의 서비스로 바꾸기, 예상 시간·토큰·비용)와 첫 화면 그림을 더했다
  - packs.json에 pack-yunseul 릴리스(19,709,222 bytes)를 공개로 등록하고 공통 값(팩 16, 화면 프리셋 14, 디자인 점수 목록)을 갱신했다
  - 검증 기록에 윤슬당의 측정 범위와 MaruBuri 서체를 적고 측정 보고서에 예상값 근거를 더했다

## Maintenance

- 쓰는 곳이 없는 공통 값 키 두 개를 지움 (`0c312d4`)
  - prokit.agents.count.ko와 optional.count.ko는 문서 어디에도 쓰이지 않아 계산과 목록 표에서 뺌
