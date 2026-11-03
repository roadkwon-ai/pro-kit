# v0.3.6 — Docs sync and adopt Antigravity hooks

- 날짜: 2026-11-03 09:59 (KST)
- 이전 버전: v0.3.5
- 전체 변경: https://github.com/roadkwon-ai/pro-kit/compare/v0.3.5...v0.3.6

## Fixes

- --adopt 설치에 Antigravity 훅 파일을 더함 (`935b4ab`)
  - ADOPT_ONLY에 .agents/hooks.json이 없어 하네스만 설치한 프로젝트는 Antigravity에서 편집 막기·스킬 기록·서브에이전트 묶기 훅이 돌지 않았음
  - adopt 설치 테스트에 이 파일과 훅이 부르는 스크립트를 보는 단언을 더함
  - handbook 설치기 쪽의 adopt 파일 모양에 이 파일을 더하고 두 템플릿 VERIFICATION.md에 실제 Next.js 앱 설치 확인을 적음

## Docs

- 전문 에이전트 위임, 훅, UI 스킬 선택을 handbook·튜토리얼·템플릿 README에 맞춤 (`5807020`)
  - 핵심 개념: 훅(edit-guard, skill-log, shell-guard, pre-commit) 절, audit 막기·경고 목록, 위임·degraded 증거, 리뷰어 focus 스킬, [confirm] 세 선택지
  - 템플릿: 설치기 훅과 turbo 프록시, --diff·--ui-skill none, 훅 신뢰, .hallmark 커밋 파일, 갱신 반영 절
  - 스킬과 에이전트: 공식 스킬 표를 performers와 다시 대조, UI 판 prokit 스킬 7개, 두뇌 에이전트, 지운 스킬의 훅 정리
  - 디자인: UI 스킬 세 가지와 전환, 화면 일 분담, hallmark 렌더 검사, 한글 제목 keep-all, 스크린샷 열기
  - 레퍼런스·시작하기·튜토리얼: 폴더 구조, 명령, H 규칙, 검증 표, FAQ, 용어집, UI 판 스킬·에이전트 수
  - AGENTS.md: 사용자가 할 일에 Codex /hooks와 Antigravity 폴더 신뢰 조건
  - docs/guideline 원문 위치를 CONTRIBUTING 구조에 더함
