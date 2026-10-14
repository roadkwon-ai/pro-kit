# v0.1.7 — Keep source guard state out of HTML export copies

- 날짜: 2026-10-14 18:17 (KST)
- 이전 버전: v0.1.6
- 전체 변경: https://github.com/roadkwon-ai/pro-kit/compare/v0.1.6...v0.1.7

## Fixes

- 정적 내보내기 복사본에 원본 guard 상태(.prokit)를 넣지 않음 (`11dde0f`)
  - export-html이 .prokit도 복사하지 않아 원본에서 도는 정리·실행의 lock이 복사본 guard를 막지 않게 했다
  - 두 템플릿 공통 테스트에 원본 lock이 있어도 내보내기가 끝나는지, guard가 복사본의 next build를 막으면(exit 75) 이유를 알리는지 보는 테스트를 더했다
  - guard 차단 오류 문구의 조사를 고쳤다(`next build을` → `next build 실행을`)
  - neon VERIFICATION에 고치기 전 코드로 재현한 결과를 적었다
