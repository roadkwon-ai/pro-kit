# v0.3.10 — Screen round speedup and UI SDK bundle

- 날짜: 2026-11-20 02:58 (KST)
- 이전 버전: v0.3.9
- 전체 변경: https://github.com/roadkwon-ai/pro-kit/compare/v0.3.9...v0.3.10

## Features

- 화면 라운드 병목 개선과 UI SDK 선택 묶음 (`f406eb6`)
  - 검증 증거 묶음: `pnpm dev-cycle packet capture|seal|check`로 런타임 확인이 표준 뷰포트·라이트·다크 스크린샷과 측정(가로 넘침, 터치 영역, 대비, 콘솔, Tab 순서, get_errors)을 한 번 찍어 봉인하고, 리뷰·감사·재확인은 그 묶음을 읽는다. audit은 묶음의 hash와 라운드, 찍은 뒤에 화면을 고친 기록이 있는지 대조한다
  - 병렬 행: `table --write`·`status`가 함께 시작할 수 있는 행을 알리고, 같은 병렬 묶음의 행은 서로 앞 행으로 보지 않는다
  - 위임: 같은 계층·파일 범위의 후속 일과 재확인은 수행자를 이어 쓰고(SendMessage), 큰 위임은 나누며, 역할별 모델·노력도 기본값과 사용자 설정 우선 규칙을 둔다
  - 감독: `pnpm dev-cycle supervise`로 진행 중인 하위 에이전트의 활동을 요약하고, 위임 예산, 실행 중 지시 따르기, 결과에 영향이 없는 일을 생략하는 판정을 둔다
  - 구현 전 바닥선: 마감 한 바퀴를 만들던 반복 지적을 출처와 함께 10개 항목으로 `prokit-ui/references/build-floor.md`에 둔다
  - 러너 성능: audit 한 번에 여러 번 하던 훅 기록 파싱과 git 파일 목록 계산을 한 번으로 줄였다(audit 약 40% 단축)
  - UI SDK: 선택 묶음 `ui-sdk`(vercel-labs/ui)와 `prokit-ui/references/ui-sdk.md`를 더했다. shadcn에 없는 상호작용(트리, 토큰 입력, 재정렬 드래그, 날짜·색 입력)과 WebMCP만 UI SDK로 만들고, `prokit-ui-builder`·`prokit-reviewer`에 배치한다
  - 검증 기록: 두 템플릿 VERIFICATION, `docs/reports/2026-11-20-b-round-speedup`, `docs/plans/2026-11-20-ui-sdk-adoption.md`
