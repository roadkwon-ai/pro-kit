---
name: prokit-skills-manage
description: >-
  이 Better-T-Stack 프로젝트(또는 하네스만 설치한 Next.js 프로젝트)에서 고른 스킬 구성을 진행 중에 바꿀 때 사용한다. 두뇌(여럿 가능: superpowers, agent-skills, pstack, gstack,
  oh-my, mattpocock, openspec, spec-kit, compound-engineering)를 바꾸거나 더하거나 빼고, 과설계 방지 스킬(ponytail,
  caveman, karpathy)을 바꾸고, mattpocock 추가 스킬과 선택 스킬 묶음(i-have-adhd, taste, ops, motion, mobile)을
  더하거나 지운다. "두뇌 바꿔줘", "openspec도 같이 쓰고 싶어", "superpowers 빼줘", "과설계 방지를 caveman으로",
  "tdd 스킬 추가해줘", "taste 지워줘", "스킬 구성 바꿔줘" 같은 요청에 쓴다. 이미 고른 스킬을 최신판으로 올리는 일은
  prokit-skills-update, prokit-* 스킬 갱신은 템플릿 저장소의 갱신 절차가 맡는다. 이번 세션에서만 잠시 끄는 일("stop ponytail",
  "stop caveman", "normal mode")에는 쓰지 않는다. 그것은 그 스킬의 끄기 명령이다.
---

# 프로킷 스킬 구성 바꾸기

고르는 기준, 카탈로그, 두뇌별 단계는 [두뇌와 선택 스킬](../prokit-dev-cycle/references/brains/README.md)이 정본이다. 이 스킬은 요청을 설치 명령으로 바꾸고 H 라운드로 안전하게 적용하는 절차만 둔다.

## 1. 지금 구성 보기
`pnpm skills:check`를 실행해 `두뇌:`, `과설계 방지:`, `mattpocock 추가:`, `선택 스킬:` 줄을 본다. 기록값은 `.dev-cycle.json`의 `brain`(하나면 문자열, 여럿이면 배열. 첫 값이 주 두뇌)과 `simplicity`다. 사용자에게 지금 구성을 한 줄씩 보여 준다.

## 2. 요청을 명령으로 바꾸기
| 요청 | 명령 |
|---|---|
| 두뇌를 다른 것으로 바꾸기 | `pnpm skills:setup --brain <새 두뇌>` |
| 두뇌 더하기 | `pnpm skills:setup --brain <지금 목록>,<새 두뇌>`(지금이 `none`이면 `--brain <새 두뇌>`). 지금 주 두뇌가 그대로 앞에 온다. 새 두뇌를 주 두뇌로 하려면 맨 앞에 둔다 |
| 두뇌 빼기 | `pnpm skills:setup --brain <남길 목록>`, 모두 빼면 `--brain none` |
| 과설계 방지 바꾸기·빼기 | `pnpm skills:setup --simplicity <이름\|none>` |
| 추가 스킬·선택 묶음 더하기 | `--matt <스킬>[,<스킬>]`, `--optional <묶음>[,<묶음>]` |
| 추가 스킬·선택 묶음 지우기 | `--drop <스킬이나 묶음>[,…]` |

- 한 번에 여러 항목을 바꿔도 된다(예: `--brain openspec --simplicity caveman --drop tdd`).
- 무엇을 고를지 사용자가 정하지 못했으면 정본의 "추천 기준"과 "단계 표"로 추천을 하나 만들어 근거 한 줄과 함께 묻는다(Claude Code는 AskUserQuestion, 추천에 ` (추천)`을 붙여 앞에 둔다). 근거는 `docs/prd.md`·`docs/first-request.md`<!-- edition:pro -->·`docs/prokit/intake.md`·`docs/prokit/analysis.md`<!-- /edition -->에서 찾는다. 두뇌는 하나를 권한다. 여럿을 원하면 맡는 단계가 덜 겹치는 조합을 제안하고, 진행 순서를 강제하는 두뇌(superpowers, gstack, oh-my)를 둘 이상 넣지 않는다.
- 필수 스킬(`domain-modeling`, `grilling`, `grill-with-docs`)과 공식 도메인 스킬은 하네스라 지우지 않는다. `--drop`도 받지 않는다.
- 고를 수 없는 이름(매니페스트에 없는 스킬)을 원하면 이유를 알리고, 계속 쓸 스킬이면 이 H 라운드에서 `skills.manifest.json`에 더한 뒤 설치한다.

## 3. 적용(H 라운드)
1. 열린 라운드가 있으면 먼저 닫는다. 라운드 중간에는 바꾸지 않는다. 진행 계획의 Task 라운드였다면 그 Task를 끝내거나 사용자 동의로 `close --partial`한다.
2. `pnpm dev-cycle table H --write --title "스킬 구성 변경: <요약>" --no-task`
3. 준비물을 알린다. 고른 두뇌에 전역 도구가 있으면 `--brain`을 줄 때 설치기가 전역에 설치한다(gstack은 Bun, OpenSpec은 npm 전역 CLI, oh-my는 Codex를 쓸 때 OMX CLI). 설치 전에 그 사실을 알리고 동의를 받는다. Spec Kit은 설치할 때 uv가 필요하다. 없으면 설치 안내를 주고 멈춘다.
4. 2절의 명령을 실행하고 출력의 `정리:`, `남김:`, `제거:`, `경고:`, `실패:` 줄을 그대로 보여 준다. 출력을 `tail` 등으로 자르지 않는다(앞쪽에 경고가 있을 수 있다). 종료 코드는 파이프 없이 `<명령> 2>&1; echo "exit=$?"`로 본다(zsh에는 `PIPESTATUS`가 없어 빈 값이 나온다). exit 2면 출력을 보고하고 멈춘다.
5. 두뇌를 바꾸거나 뺐으면 인계를 남긴다. 이전 두뇌가 만든 문서(`openspec/`, `specs/`, `.specify/memory/`, `docs/solutions/`, `docs/superpowers/` 등)와 진행 중인 계획·남은 일의 경로를 대조표 메모와 `tasks/todo.md`에 적는다. 새 두뇌는 그 문서를 읽고 이어 가며 인터뷰·계획을 처음부터 되풀이하지 않는다. 설치기는 이 문서들을 지우지 않는다.
6. 확인: `pnpm skills:check` exit 0과 바뀐 줄, `pnpm agents:check`, `git status --short`. 바뀐 것이 스킬·플러그인 파일(`.agents/`, `.claude/`, `.codex/`, `skills-lock.json`, `.dev-cycle.json`)과 고른 두뇌가 만든 파일(`openspec/`, `.specify/`, `specs/`)뿐인지 본다. 앱 코드가 바뀌었으면 멈추고 보고한다.
7. 행을 채운다. 증거는 `tasks/evidence/`의 한 줄 파일로 `pnpm dev-cycle evidence <행 번호> --file <파일>`로 채우고 표를 손으로 고치지 않는다. 구현 행은 `N/A: 스킬 구성만 변경`, skill-creator eval 행은 `N/A: 외부 스킬 구성만 변경(prokit-* 변경 없음)`, 문서 영향 행은 바뀐 문서가 없으면 `N/A: 스킬 구성 변경`이다. `[confirm]` 행에서 바뀐 구성(전과 후), 남긴 문서, 전역에 설치한 도구를 보여 주고 확인받는다.
8. `prokit-dev-cycle` 5절대로 닫고 커밋한다. 커밋 제목 예: `chore: 두뇌를 openspec으로 바꿈`. 앱 코드는 바뀌지 않았으므로 마무리 질문에서 배포는 필요 없다고 알린다.
9. 새 세션을 열어야 바뀐 플러그인과 훅이 적용된다고 알린다.

## 하지 않는 것
- `npx skills add`·`npx skills remove`·`claude plugin install`을 직접 실행하지 않는다. 설치기(`pnpm skills:setup`)가 출처와 기록을 함께 맞춘다.
- 전역 설치본(gstack, OMX CLI, OpenSpec CLI)과 이 기기 전역 설정은 지우거나 고치지 않는다. 다른 프로젝트가 쓸 수 있다. 이 프로젝트에서 끄는 일은 설치기가 `.claude/settings.local.json`으로 한다.
- 두뇌가 만든 문서를 지우지 않는다. 사용자가 원하면 따로 묻고 그 파일만 지운다.
