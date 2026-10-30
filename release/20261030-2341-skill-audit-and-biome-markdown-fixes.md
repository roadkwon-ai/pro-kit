# v0.3.4 — Skill audit and Biome markdown fixes

- 날짜: 2026-10-30 23:41 (KST)
- 이전 버전: v0.3.3
- 전체 변경: https://github.com/roadkwon-ai/pro-kit/compare/v0.3.3...v0.3.4

## Fixes

- Biome 2.6의 마크다운 포맷이 대조표와 `AGENTS.md` 표를 매번 바꿔 lint가 실패하던 문제를 고침 (`730b6de`)
  - 설치기가 `biome.json` 제외 목록에 `!**/*.md`를 더함. adopt는 대조표가 있는 `!tasks`만 뺌
  - `tests/install.test.mjs`의 기대값을 맞추고 adopt 단언을 더함
  - `VERIFICATION.md`: 재현(Biome 2.6.4)과 실제 설치 확인(`pnpm check` 뒤와 대조표를 쓴 뒤 `biome check .` exit 0)
- 릴리스 스크립트(`scripts/release.mjs`) 변경을 dev-cycle 하네스(H)로 판정함 (`597fd74`)
  - 두 템플릿 `.dev-cycle.json` 하네스 규칙에 `release`를 더함(전에는 A로 판정됨)
  - `tests/dev-cycle-classify.test.mjs`에 `scripts/release.mjs`가 H인지 보는 단언을 더함
- audit이 그 행에서 Main이 읽은 스킬을 대조하고 배포가 검사 실패를 구분함 (`ad372d3`)
  - skill-log가 서브에이전트 호출(`agent_id`)과 스킬 폴더 참조 경로(`ref`)를 남기고, audit은 서브에이전트 기록을 세지 않는다
  - evidence가 행을 채운 시각과 행 문구를 남긴다. 행 문구에 이름만 적힌 스킬(외부 포함)과 "바꿀 계층의 prokit-*"(diff 계층)는 앞 행을 채운 뒤 읽은 기록이어야 한다(`--upgrade`로 번호가 바뀌어도 행 문구로 짝짓는다)
  - `사용:` 괄호에 적은 스킬 폴더 참조 파일을 읽은 기록과 대조하고, [design] 거부 이유와 두뇌 안내 문구를 고친다
  - vercel-deploy가 `checks_failed`를 받으면 develop은 READY를 기다려 경고한 뒤 이어 가고, production은 배포 URL·확인·되돌리기를 알리고 멈춘다
  - prokit-verify(외부 API 실제 응답 확인)·browser.md(되돌릴 수 없는 버튼 전 테스트 계정 확인)·prokit-deploy·prokit-dev-cycle 문서, CLAUDE.md(ponytail 호출 횟수), dev-workflow(위임 또는 직접 사유), handbook brains 반영
  - 테스트 5개 추가(두 템플릿 387/387)
- 스킬 사용 기록을 넓히고 `사용:` 목록 전체를 기록과 대조함 (`59ddb04`)
  - skill-log가 스킬 폴더의 참조 파일 Read와 Next 번들 문서(`next/dist/docs`) Read·Bash도 남긴다
  - audit이 모든 행의 `사용:` 목록, 행 문구의 prokit-* 계층 스킬, prokit-web의 Next 문서 경로를 기록과 대조한다
  - 기록은 30일만 두고 새 라운드를 열 때 지난 줄을 지운다
  - skills 테스트는 python3에 PyYAML이 없으면 uv 임시 환경으로 `quick_validate`를 돌린다
  - prokit-dev-cycle·prokit-web·prokit-verify 문서와 handbook brains에 기록 범위와 적는 꼴을 반영
- 편집 글에 `toolCall`이 든 Claude Code 편집을 edit-guard가 Antigravity 입력으로 보지 않게 함 (`e4416c2`)
  - 입력을 JSON으로 읽었으면 `toolCall` 키로만 Antigravity를 가린다. 문자열 검사는 깨진 입력에만 쓴다
  - 전에는 Edit의 `old_string` 등에 "toolCall"이 들면 deny JSON만 내고 exit 0이라 라운드 없는 편집이 통과했다
  - 테스트 추가(두 템플릿 381/381)
