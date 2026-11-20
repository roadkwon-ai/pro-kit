# v0.3.11 — Round feedback: carried reads and copy-only rounds

- 날짜: 2026-11-20 10:42 (KST)
- 이전 버전: v0.3.10
- 전체 변경: https://github.com/roadkwon-ai/pro-kit/compare/v0.3.10...v0.3.11

## Features

- 실사용 라운드 피드백 반영(이어 쓰기 기록, 문구만 라운드, 감독 오탐) (`b4fd5df`)
  - 이어 쓰기: 같은 에이전트나 같은 Main 세션이 압축 없이 이어서 일하면 audit이 앞서 읽은 스킬을 이번 라운드에 읽은 것으로 센다. 세션을 시작하기 전부터 압축 훅(`compact-log`)이 있고 스킬 파일이 그 뒤 바뀌지 않았을 때만 센다
  - 이어 쓴 수행자가 명령만 돌려도 그 라운드에서 일한 것으로 센다
  - 문구만 바꾼 화면 라운드: 디자인 감사·휴대폰 스크롤 행을 `N/A: 문구만`으로 두고 critique B를 건너뛴다. `prokit-reviewer(code)`가 `문구만: 확인`으로 판정해야 audit이 받는다
  - `supervise`: 마지막 기록이 5분 넘게 없어 끝났을 가능성이 큰 에이전트에는 예산 초과 신호를 내지 않는다
  - 검증 증거 묶음: `/_next/mcp`가 404를 돌려주면 `get_errors`를 "해당 없는 검사"로 따로 알린다

## Docs

- UI 디자인 스킬 조사 문서 두 편 추가 (`0f8cb7e`)
  - `docs/guideline/261102_design-skills.md`: Hallmark와 주요 AI 디자인 스킬 비교(2026-11-02 자료)
  - `docs/guideline/261103_dante-design-skills.md`: AI 슬롭을 줄이는 디자인 스킬 7개 영상 정리와 저장소 분석(2026-11-03 자료)
