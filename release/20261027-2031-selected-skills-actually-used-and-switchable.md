# v0.3.3 — Selected skills actually used and switchable

- 날짜: 2026-10-27 20:31 (KST)
- 이전 버전: v0.3.2
- 전체 변경: https://github.com/roadkwon-ai/pro-kit/compare/v0.3.2...v0.3.3

## Features

- 편집 차단·스킬 기록 훅을 Codex와 Antigravity에서도 돌게 함 (`fa017e6`)
  - edit-guard: Codex apply_patch(패치 본문의 파일 줄)와 Antigravity edit_file 등도 본다. Antigravity는 stdout decision으로 답하고 허용도 늘 적는다(출력이 없으면 도구가 막힌다)
  - skill-log: Codex는 Bash 명령 속 SKILL.md 경로를, Antigravity는 read_file·view_file 경로를 남긴다
  - skills:setup이 기기마다 .codex/hooks.json에 두 훅을 병합하고(OMX 등 다른 항목은 그대로 둔다), 템플릿에 .agents/hooks.json을 더했다. 두 파일은 하네스(H)로 본다
  - 실측: Codex 0.164.0과 agy 1.4.5 모두 S2가 [confirm]만 남기고 audit을 통과했고, 라운드 없는 편집은 막혔다. 결과는 VERIFICATION.md
- 라운드 없는 편집을 막고 확인 전 audit 문제를 바로 알리게 dev-cycle 보완 (`139d2db`)
  - Claude Code PreToolUse 훅(dev-cycle edit-guard): 열린 라운드 없이 코드·하네스 파일을 Edit·Write로 고치면 막는다. 설치기가 settings.json에 더한다
  - evidence: 행을 채울 때마다 그 행의 audit 거부, 케이스 상향, 빠진 필수 행을 "먼저 할 일:"로 알린다
  - audit: 진행 지시("진행해", "추천대로")만 적은 [confirm] 증거를 거부한다
  - selected-skills eval: 표 칸 속 \| 파싱, audit-confirm-only 판정, 두뇌 이름 접두어 비교, 플러그인 해제 전 audit 기록을 고치고 모든 회차를 다시 채점
  - VERIFICATION.md: S2 3회(v5)·1회(v6) 결과와 다시 채점한 수치
- 고른 스킬을 실제로 부르고 언제든 바꾸게 dev-cycle·설치기 보완 (`f2f48bb`)
  - 단계 행: 두뇌가 맡는 단계의 내장을 거부(쓸 수 없으면 blocked)하고 내장 사유에 든 두뇌 스킬 이름도 거부한다. table·status가 단계 행마다 부를 스킬을 안내한다
  - 부른 스킬 기록: Claude Code PostToolUse 훅(dev-cycle skill-log)이 Skill 호출과 SKILL.md Read를 .prokit/skills-used.jsonl에 남기고 audit이 단계 행·과설계 방지 검토 증거와 대조
  - 과설계 방지 검토: ponytail·caveman·karpathy를 골랐으면 코드 리뷰 행에 그 결과를 요구
  - 라운드 중 구성 전환: 마커에 brains·skills 기록, 설치기가 다루는 이름만 케이스 판정에서 빼고 전환 전 두뇌 이름도 받음
  - skills-setup: --drop all(순수 AI), /reload-plugins 안내, 폴더 경로에 설치 기록이 없는 project 플러그인 미등록 검사, Codex 전역 ponytail 흔적 경고, spec-kit feature.json 정리
  - 두뇌 파일 9개, 라우팅, prokit-ui, skills-manage, implementer, AGENTS.md, handbook: 두뇌 스킬의 커밋·브랜치·자동 수정·자율 진행 단계 차단, 사용자 호출 전용 스킬 읽기, 전환 안내
  - evals/selected-skills: 두뇌 9·과설계 방지 3·taste·motion 실제 세션 eval과 전환 매트릭스. 결과는 VERIFICATION.md
- 두뇌 스킬을 단계마다 실제로 쓰게 audit과 대조표 보완 (`9af280d`)
  - audit: 두뇌를 고르면 단계 행 증거가 두뇌 파일의 이름, 설치한 추가 스킬, 단계·사유가 있는 내장 중 하나여야 한다(하네스 이름 제외, 이름만 보는 자기 신고)
  - status·table --write에 고른 두뇌와 두뇌 파일 줄을 보여 준다
  - B·D·E 구현 행에 구현 단계를 붙이고 H에 구현 행을 더했다(설치만 한 H는 N/A)
  - 두뇌 파일 9개에 에이전트 절: 두뇌가 주는 에이전트는 읽기 전용 보완 검토로만 쓰고 최종 게이트는 prokit-reviewer
  - prokit-implementer는 위임 지시의 두뇌 스킬을 먼저 읽는다. CLAUDE.md·AGENTS.md, process-routing, handbook 네 쪽, eval 시나리오 44도 맞췄다
  - 계획: docs/plans/2026-10-27-brain-wiring.md

## Fixes

- Codex로 진행한 라운드를 앞 라운드의 Claude Code 스킬 기록과 대조하지 않게 함 (`c9a22a3`)
  - table --write가 새 라운드를 열 때 기록 파일(.prokit/skills-used.jsonl)에 시작 줄을 남기고, audit은 그 뒤 기록만 이 라운드의 것으로 본다
  - 이 라운드 기록이 하나도 없으면(Codex처럼 훅이 없는 도구) 자기 신고로 본다. 전에는 같은 프로젝트에서 Claude Code를 한 번 쓰면 Codex 라운드의 단계 행이 모두 막혔다
  - VERIFICATION.md와 handbook 두뇌 쪽 설명도 맞췄다
- UI 판에서 Pro 전용 팩과 정밀 분석 에이전트를 뺌 (`50df38e`)
  - editions.json의 proPacks(nextflix, claudle)를 판의 tutorials/packs.json에서 뺀다. 목록에 없는 이름은 판 검사가 잡는다
  - prokit-analyzer.md를 판에서 빼고 표시와 허용 목록 줄을 지웠다
  - what-is-prokit 파일 구조 도식에 판 전용 도식을 두고, AGENTS.md·CONTRIBUTING.md의 판 목록 설명에 proPacks를 더했다
- karpathy 검토를 리뷰어가 직접 읽고 audit이 기록을 대조하게 함 (`f75a770`)
  - prokit-reviewer: simplicity가 karpathy면 focus에 이름이 없어도 karpathy-guidelines를 읽고 skills_read에 적는다
  - process-routing 역할 표를 실제 행동(focus에 간결성)에 맞춤
  - audit: karpathy도 ponytail·caveman처럼 이 라운드에 karpathy-guidelines를 부른 기록을 대조
  - AGENTS.md taste 행: 쓰기 전에 prokit-ui와 references/taste.md를 읽는다(u-taste 한 실행이 prokit-ui를 건너뛰었다)
  - eval: taste 안내를 Bash로 읽은 것도 채점, v9\~v11 결과를 VERIFICATION.md에 기록
- 버그 수정 라운드의 구현 행과 이름 뒤 구두점을 audit이 바르게 보게 함 (`e03c29c`)
  - 디버깅 단계 행이 있는 표(C를 D·E로 올린 라운드)의 구현 행은 디버깅 단계 방법을 따른다. audit, table --write 안내, status 안내가 같은 판정을 쓴다
  - `사용: ce-debug.`처럼 이름 뒤에 붙은 마침표·조사를 이름에서 뗀다
  - eval: 채점기에 같은 규칙을 반영하고 [confirm] 뒤 진행 지시를 한 번 더 보내는 run.mjs --go-reply를 더함
  - S2 v7·v8·진행 지시 확인 결과를 VERIFICATION.md와 계획 문서에 기록

## Maintenance

- prokit-writing 갱신(기능 팩 저장소 추가) (`23a64c3`)
  - roadkwon-ai/pro-kit-docs-skills d008084로 다시 설치했다. 저장소 목록과 문체 표에 pro-kit-feature-packs가 들어갔다
  - skills-lock.json의 두 문서 스킬 출처를 로컬 경로에서 github로 맞췄다(CONTRIBUTING.md 갱신 방법)
