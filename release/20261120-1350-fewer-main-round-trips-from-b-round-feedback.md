# v0.3.13 — Fewer Main round trips from B round feedback

- 날짜: 2026-11-20 13:50 (KST)
- 이전 버전: v0.3.12
- 전체 변경: https://github.com/roadkwon-ai/pro-kit/compare/v0.3.12...v0.3.13

## Fixes

- B 라운드 실측에서 Main이 되풀이한 왕복 줄이기(증거 파일 위치, 스킬 표기, 끝까지 읽기) (`e0454c1`)
  - 증거 파일: `evidence`가 프로젝트 밖 파일을 거절할 때 `tasks/evidence/row-<행>.txt`로 복사해 다시 실행하는 명령을 함께 알린다. `table --write` 안내에도 같은 줄을 더한다
  - 스킬 표기: 단계 행에서 두뇌, 과설계 방지, 행 문구 스킬의 표기가 함께 빠지면 하나씩 알리지 않고 한 메시지로 모두 알린다
  - 끝까지 읽기: `table --write` 안내에 `SKILL.md`는 `limit`·`offset` 없이 끝까지 읽는다는 줄을 더한다
  - 위임 문서의 `pnpm -s` 예시를 `pnpm --silent`로 바꾼다. `packageManager`로 pnpm 12.6.0을 고정한 프로젝트에서는 `-s`가 거부된다
  - handbook 갱신 반영 2단계: H 라운드를 먼저 열고, 그 라운드 안에서 러너부터 옮긴다
  - 러너 파일을 Better-T-Stack의 Biome 형식으로 맞춘다(동작 변경 없음)
