# v0.3.12 — Copy-only JSON scope and session start guard

- 날짜: 2026-11-20 11:17 (KST)
- 이전 버전: v0.3.11
- 전체 변경: https://github.com/roadkwon-ai/pro-kit/compare/v0.3.11...v0.3.12

## Fixes

- 설정 JSON을 문구만으로 세는 일과 훅을 더하기 전에 연 세션의 이어 세기 막기 (`8b066bd`)
  - 문구만 판정: JSON은 `messages`·`locales`·`i18n`·`lang` 폴더 아래 파일만 화면 글자로 본다. `tsconfig.json` 같은 설정 JSON과 `*.config.*` 파일은 문구만으로 보지 않는다
  - 이어 세기: `compact-log`를 SessionStart 훅에도 걸어 세션 시작을 남긴다. 읽기 전 마지막 세션 시작이 훅을 더한 뒤일 때만 그 세션이 앞서 읽은 스킬을 잇는다. 압축 뒤 이어지는 세션 시작도 압축으로 본다
