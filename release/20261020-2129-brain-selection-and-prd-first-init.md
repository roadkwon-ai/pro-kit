# v0.2.0 — Brain selection and PRD-first init

- 날짜: 2026-10-20 21:29 (KST)
- 이전 버전: v0.1.7
- 전체 변경: https://github.com/roadkwon-ai/pro-kit/compare/v0.1.7...v0.2.0

## Features

- prokit-init 스킬로 PRD를 받아 두뇌와 스킬을 추천 (`1311d78`)
  - 새 프로젝트를 만들 때 `prokit-init`이 PRD를 먼저 받고, 그 PRD로 두뇌, 과설계 방지 스킬, mattpocock 추가 스킬, 응답 방식을 추천해 고르게 한 뒤 설치까지 한다
  - PRD는 `/prokit-init <PRD 파일 경로나 내용>`의 인자, 붙여 넣은 글, 요청의 서비스 설명, 프리셋 팩으로 받는다. 없으면 첫 단계로 한 번 요청하고, 그래도 없으면 PRD가 필수인 이유를 알린 뒤 프로젝트를 만들지 않고 끝낸다
  - 작업 폴더에서 시작하면 pro-kit을 PRD 단계보다 먼저 받고, 다시 시작하는 법은 그 세션에서 실제로 되는 것만 안내한다
  - 루트 AGENTS.md·CLAUDE.md 절차와 CONTRIBUTING을 맞추고, 이 저장소 세션은 두뇌 없음과 ponytail로 둔다
  - 평가 12개(기대 결과 58개)를 더했다
- 두뇌와 과설계 방지 스킬을 프로젝트마다 고른 것만 설치 (`8fbf063`)
  - 설치기에 `--brain`, `--simplicity`(기본 `none`), `--matt`, `--optional`을 더하고 고른 값을 `.dev-cycle.json`의 `brain`·`simplicity`에 기록한다
  - 두뇌는 superpowers, agent-skills, gstack, oh-my, pstack, mattpocock 중 하나, 과설계 방지 스킬은 ponytail, caveman, karpathy 중 하나만 설치한다. 그 전 판은 superpowers·OMC·OMX·ponytail을 기본 설치했다
  - `pnpm skills:setup`으로 바꾸면 고르지 않은 설치본을 출처로 찾아 지우고, `pnpm skills:check`는 남은 설치본을 충돌로 알린다
  - 전역에 켜진 고르지 않은 플러그인과 gstack 개인 스킬은 `.claude/settings.local.json`으로 그 프로젝트에서만 끈다
  - mattpocock은 필수 3개(`domain-modeling`, `grilling`, `grill-with-docs`)를 늘 설치하고 추가 스킬 14개는 고를 때만 설치한다. 응답 방식 i-have-adhd는 선택 묶음이 됐다
  - 카탈로그와 추천 기준의 정본은 `prokit-dev-cycle/references/brains/`다. 두 템플릿 README, 검증 기록, 테스트를 함께 맞췄다

## Docs

- 두뇌 선택과 PRD로 시작하는 흐름을 문서에 반영 (`c165b09`)
  - 새 쪽 "두뇌와 선택 스킬"(`handbook/skills/brains.md`)을 더했다. 빠른 시작, 설치기, 공식 스킬, 폴더 구조, 명령 모음, FAQ, 검증 결과 쪽도 새 설치 구성에 맞췄다
  - README와 빠른 시작에 PRD가 꼭 있어야 하는 이유와 PRD가 없으면 프로젝트를 만들지 않고 끝나는 흐름을 적었다
  - 클론 튜토리얼 1장과 컨셉으로 화면 만들기 튜토리얼이 PRD(프리셋 팩이나 서비스 설명)로 두뇌와 스킬을 고르는 단계를 안내한다
  - 결정과 실측을 `docs/reports/2026-10-20-brain-selection/README.md`에 남겼다. 실제 Claude Code 세션으로 PRD 없이 끝나는 흐름과 PRD를 받아 커밋까지 만드는 흐름을 확인했다
