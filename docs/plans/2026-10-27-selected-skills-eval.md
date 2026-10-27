# 고른 스킬 실사용 검수 계획 (2026-10-27)

두뇌 9개, 과설계 방지 3개, 화면 선택 묶음(taste, motion)을 실제로 설치한 프로젝트에서 dev-cycle이 그 스킬을 단계마다 부르는지 확인한다. 9af280d1(두뇌 스킬 연결 보완)의 audit 검사는 이름만 보는 자기 신고라, 실제 세션이 스킬을 부르는지는 아직 확인하지 않았다.

## 1. 확인할 것
- 설치: 고른 스킬이 설치되고(`skills:check`·`agents:check` exit 0), 고르지 않은 전역 플러그인은 꺼진다.
- 이름: 두뇌 파일·`process-routing.md`의 백틱 이름이 설치된 실제 스킬·에이전트 이름(frontmatter `name`)과 맞는다.
- 실사용: 단계 행에서 고른 두뇌 스킬을 Skill 도구로 부르거나 `SKILL.md`를 읽고, 증거에 `사용: <이름>`을 적는다. 고르지 않은 두뇌·과설계 방지 스킬은 부르지 않는다.
- 과설계 방지: 코드 리뷰 행에서 역할 표의 검토(`ponytail-review`, `caveman-review`, karpathy focus)를 쓰고 `prokit-reviewer(code)`는 따로 한다.
- 화면 묶음: `prokit-ui`가 taste·motion 스킬을 고른 화면에만 쓰고 impeccable 흐름은 그대로다.
- 하지 않을 것을 하지 않는다: 커밋·push, `[confirm]` 자동 통과, 두뇌 에이전트의 파일 쓰기, `tasks/todo.md`·`tasks/plan.md` 덮어쓰기.

- 전환: 두뇌·과설계 방지·추가 스킬·선택 묶음(taste 등)을 언제든 바꾸고, 더하고, 빼서 순수 AI(`--brain none --simplicity none`, 선택 묶음 없음)나 기본 prokit 스킬만으로 돌아갈 수 있다. 바꾼 뒤 남은 설치본·플러그인 켜기·끄기 항목이 없고, dev-cycle(status, table, audit, 라우팅)이 바뀐 구성을 바로 따른다.

## 1-1. 확인한 결함과 보완안 (전환)
코드를 읽어 확인했고, 4단계 전환 매트릭스로 재현한 뒤 고친다.

| 결함 | 근거 | 보완안 |
|---|---|---|
| 열린 라운드 중에 구성을 바꾸면 설치기가 바꾼 파일(`.agents/skills/`, `skills-lock.json`, `.claude/settings.json`, `.dev-cycle.json`)이 diff에 섞여 audit이 케이스를 H로 올린다. `prokit-skills-manage`는 그래서 "라운드를 먼저 닫는다"고 한다 | `.dev-cycle.json` rules의 H 정규식 | `skills:setup`이 열린 라운드를 알아보고 마커에 구성 변경(`skills=<전>→<후>`)을 적는다. audit은 마커에 적힌 변경이면 설치기 관리 경로를 케이스 판정에서 빼고, 그 파일은 라운드 커밋에 함께 넣는다. 라운드를 닫지 않고 바꿀 수 있게 `prokit-skills-manage` 3절을 고친다 |
| 라운드 중에 두뇌를 바꾸면 전에 채운 단계 행 증거(`사용: <이전 두뇌 스킬>`)가 audit에서 거부된다 | `brainProblem`이 지금 `brain`만 본다 | 마커에 라운드를 열 때의 두뇌와 바꾼 두뇌를 차례로 적고(`brains=a,b`), 그 안의 두뇌 이름을 모두 받는다 |
| 바꾼 뒤 같은 세션에 이전 플러그인 스킬·훅 안내(예: ponytail 모드)가 남는다. 지침은 새 세션을 열라고만 한다 | `prokit-skills-manage` 9절, CLI 2.1.311에 `/reload-plugins`·`/reload-skills`가 있다 | 바꾼 직후 `/reload-plugins`를 안내하고, 다시 불러오기 전까지는 세션의 스킬 목록·훅 안내가 아니라 `.dev-cycle.json`과 `pnpm skills:check`를 따른다는 규칙을 `AGENTS.md`·`CLAUDE.md`·`prokit-dev-cycle`에 둔다. 훅이 다시 걸리는지는 실측한다 |
| 선택 묶음을 빼면 그 묶음을 가리키는 안내가 남는지 | `prokit-ui`는 `.agents/skills/design-taste-frontend/`가 있을 때만 taste를 내놓는다(확인) | 매트릭스에서 빼고 나서 `prokit-ui`가 taste 선택지를 내놓지 않는지 본다 |

impeccable은 `prokit-ui`가 의존하는 기본 설치라 선택 묶음이 아니다. `--drop impeccable`은 지금처럼 거부하고 이유를 보여 주는지만 본다.

## 2. 단계
1. **정적 검수**: 두뇌 파일 이름을 설치본과 대조하는 스크립트. 독립 리뷰 에이전트 둘이 두뇌 파일·라우팅·에이전트 지침을 upstream 스킬 내용과 맞춰 읽기 전용으로 검토한다(프로킷 규칙과 부딪히는 지시, 빠진 단계, 틀린 이름).
2. **설치 매트릭스**: 기본 fixture(neon, Better-T-Stack 최신, 이 저장소 HEAD 템플릿, `--brain none --simplicity none`, eval 시드)를 만들고, 복사본마다 `pnpm skills:setup`으로 구성을 바꾼다.

   | fixture | brain | simplicity | 그 밖 |
   |---|---|---|---|
   | b-superpowers | superpowers | ponytail | |
   | b-agent-skills | agent-skills | ponytail | |
   | b-pstack | pstack | caveman | |
   | b-gstack | gstack | karpathy | |
   | b-oh-my | oh-my | none | |
   | b-mattpocock | mattpocock | caveman | `--matt tdd,diagnosing-bugs,codebase-design` |
   | b-openspec | openspec | karpathy | |
   | b-spec-kit | spec-kit | ponytail | |
   | b-compound | compound-engineering | caveman | |
   | b-none | none | none | 기준선 |
   | u-taste | none | ponytail | `--optional taste` |
   | u-motion | none | ponytail | `--optional motion` |

3. **행동 eval**: fixture 안에서 `claude -p`를 실제 세션처럼 돌린다(플러그인·훅·프로젝트 설정 그대로). 격리는 기능 팩 저장소의 eval 실행기와 같은 네 겹(환경 변수, 저장된 로그인 차단, 명령 차단, OS 샌드박스)이다. 질문으로 멈추면 "추천대로 진행" 답으로 최대 4번 이어 간다.
   - S1 F 스펙·계획(시나리오 44를 두뇌마다): 요구 명확화·계획 단계. b-* 10개.
   - S2 C 버그 수정, `[confirm]`까지: 디버깅·구현 단계와 코드 리뷰 행의 과설계 방지 검토. b-* 9개.
   - S3 B 화면: u-taste(목록 화면 다시 디자인), u-motion(완료할 때 목록 전환). 2개.
4. **전환 매트릭스**(스크립트, 모델 호출 없음): fixture 하나에서 차례로 바꾸고 단계마다 `skills:check`·`agents:check` exit 0, 남은 설치본·`enabledPlugins`·`settings.local.json` 끄기 항목, `skills-lock.json`, `dev-cycle status`의 두뇌 줄, audit의 이름 규칙을 본다. 순서: none → superpowers+ponytail → agent-skills+caveman(둘 다 바꿈) → `--optional taste` 더함 → openspec+karpathy → `--drop taste` → 두뇌 둘(`compound-engineering,mattpocock`) → none+none(순수 AI). 라운드 중 전환: F 라운드를 superpowers로 열어 스펙 행을 채운 뒤 agent-skills로 바꾸고 audit·케이스·증거가 어떻게 되는지 본다(보완 전후). 세션 반영: `claude -p` 세션 안에서 바꾸고 같은 세션에서 `/reload-plugins` 뒤 스킬 목록과 단계 행 선택이 바뀌는지 본다.
5. **채점**: 대화 기록(stream-json)의 Skill·Read·Agent·Bash 호출, 최종 `tasks/todo.md`, `pnpm dev-cycle audit`, git 상태를 스크립트로 본다. 이름만 적고 방법을 따르지 않은 경우는 채점 에이전트가 본다. skill-creator `aggregate_benchmark`와 viewer로 보여 준다.
6. **보완**: 1-1의 결함과 실패한 항목의 원인을 두뇌 파일·라우팅·SKILL.md·audit에서 고치고, 그 fixture만 다시 돌린다. 결과는 두 템플릿의 `VERIFICATION.md`에 적는다.

## 3. 만들지 않는 것
- Codex·Antigravity 실행: Claude Code만 돌린다. Codex는 다음 회차(OMX·Codex 플러그인 실측이 따로 필요).
- 두뇌 여럿(배열) 조합: 단위 테스트로 본다.
- 운영 DB·배포·원격 저장소: fixture는 로컬에서만 쓰고 push하지 않는다.
- 실행기를 템플릿 설치물에 넣는 것: 저장소 `evals/selected-skills/`에만 둔다.

## 4. 결과 (2026-10-27)
결과와 수치는 두 템플릿의 `VERIFICATION.md` "고른 스킬 실사용 검수와 자유로운 전환"에 있다. 1-1의 결함 셋과 함께 실행 중에 찾은 결함을 고쳤다.
- 증거만 적고 부르지 않음: 두뇌가 맡는 단계의 내장 거부, 내장 사유의 두뇌 스킬 이름 거부, 단계 행마다 부를 스킬 안내, Claude Code 훅의 부른 스킬 기록과 audit 대조.
- 과설계 방지 검토 결과 요구.
- 폴더를 옮긴 project 플러그인 미등록 검사.
- `--drop all`.

남은 일:
- 편집 전에 열린 라운드를 확인하는 훅(dev-cycle 진입 누락).
- 여러 번 반복 실행(`--runs`)으로 편차 줄이기.
- Codex 실행.
