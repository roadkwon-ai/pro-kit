# 두뇌·과설계 방지 스킬 선택 설치와 prokit-init

## 현재 결정

2026-10-20부터 템플릿은 진행을 주도하는 스킬 묶음(두뇌)과 과설계 방지 스킬을 기본 설치하지 않는다. 프로젝트마다 두뇌 하나, 과설계 방지 스킬 하나를 고르거나 고르지 않는다. 고르지 않으면 지금 세션의 에이전트가 `prokit-dev-cycle`의 내장 절차와 간결성 규칙으로 그 역할을 맡는다. 새 프로젝트를 만들 때는 저장소 루트의 `prokit-init` 스킬이 PRD를 먼저 받고(없으면 init하지 않는다), PRD로 추천을 만들어 선택지마다 한 줄 설명과 `(추천)` 표시를 붙여 묻는다.

- 두뇌: superpowers, agent-skills, pstack, gstack, oh-my(OMC·OMX), mattpocock 중 하나 또는 none. mattpocock은 따로 설치하는 것 없이 필수 3개와 고른 추가 스킬이 두뇌 역할을 한다. gstack과 OMX CLI만 그 두뇌를 고를 때 전역 설치를 허용한다.
- 과설계 방지 스킬: ponytail(추천), caveman, karpathy(andrej-karpathy-skills) 중 하나 또는 none. 고른 스킬이 지금까지 ponytail이 맡던 역할(계획 기준, 구현 diff 보완 검토, 공통화 점검)을 대신한다. none이면 `prokit-reviewer(code)` focus가 간결성까지 보고, 리뷰 행을 `blocked`로 두지 않는다.
- mattpocock `domain-modeling`·`grilling`·`grill-with-docs`는 하네스로 늘 설치한다. 나머지 14개는 `--matt`로 고르는 추가 스킬이다.
- i-have-adhd는 선택 묶음 `i-have-adhd`다. 새 프로젝트에서는 설치를 추천한다(`/i-have-adhd`로 켤 때만 동작한다).
- Anthropic `frontend-design`은 템플릿에 넣지 않는다. impeccable이 이 스킬에서 출발해 더 많은 일을 한다. 전역에 켜져 있으면 설치기가 그 프로젝트에서만 끈다.
- taste-skill은 impeccable 대체로 두지 않았다. 선택 묶음으로 보조하는 설계는 다음 작업으로 남겼다(설계 문서 11절).

설계와 결정 근거는 [설계 문서](../../plans/2026-10-20-prokit-brain-selection.md)에 있다. 2026-10-09의 [Karpathy 미도입 검토](../2026-10-09-karpathy-skill-adoption/README.md)는 "기본 지침은 ponytail 하나"였고, 이번에 "기본 설치 없음, 과설계 방지 스킬 하나를 고름(ponytail 추천)"으로 바뀌었다.

## 바꾼 것

| 영역 | 내용 |
|---|---|
| 매니페스트 | `brains`, `simplicity`, `mattpocock.pool`, `optional["i-have-adhd"]`, `claude.conflicts`를 더했다. 기본 `skills`·`claude`에서 superpowers·OMC·ponytail을 빼고, 최상위 `codex`·`omx`와 전역 OMX CLI·gstack을 해당 항목으로 옮겼다 |
| `.dev-cycle.json` | `brain`, `simplicity`(기본 `none`). 키가 없는 기존 프로젝트는 `none`으로 읽는다 |
| `skills-setup.mjs` | `--brain`·`--simplicity`·`--matt` 인자, 기록(Biome 형식 유지), 출처 기준 정리(스킬은 `skills-lock.json` source, 플러그인은 ID, OMX는 `.omx/setup-scope.json`), 전역 설치본을 `.claude/settings.local.json`으로 끄기, `--check`의 충돌 판정, `--update` 범위 확장 |
| `install.mjs` | 값 인자 파싱과 복사 전 검증, `--skip-skills`여도 기록, `.gitignore`에 `.claude/settings.local.json` |
| 워크플로 문서 | `process-routing.md`를 기본(기본 AI) 칸과 과설계 방지 역할 표로 다시 썼다. 두뇌별 단계 이름은 `references/brains/<이름>.md`, 카탈로그·선택지 설명·추천 기준은 `references/brains/README.md`가 정본이다. `dev-workflow.md` 행은 두뇌 스킬 이름 대신 단계 이름을 쓴다 |
| evals | `prokit-dev-cycle` 40개(none일 때 리뷰어 focus, caveman일 때 F 공통화 행 2개 추가). 1\~38은 `--simplicity ponytail` 설치를 전제로 적었다 |
| 루트 | `prokit-init` 스킬과 평가 9개, `AGENTS.md` 절차의 선택 인자, 이 저장소의 두뇌 none(`.claude/settings.json`에서 superpowers·OMC 끔) |
| 문서 | handbook 새 쪽 [두뇌와 선택 스킬](../../../handbook/skills/brains.md)과 관련 쪽, 두 템플릿 README, 제3자 고지 |

## 실측

2026-10-20, macOS(darwin arm64), Node v24.22.0, pnpm 12.14.0, Claude Code 2.1.304, codex-cli 0.163.0, skills CLI 1.7.4, oh-my-codex 0.21.17, create-better-t-stack 3.47.0.

### 구현 전 확인

- skills CLI `remove --skill <이름들> -y`는 `.agents/skills` 폴더, `.claude/skills` 링크, lock 항목을 함께 지운다. 없는 이름은 exit 0으로 조용히 넘기므로 설치기는 지운 뒤 폴더로 다시 확인한다. lock의 `source`는 `owner/repo`다.
- `.claude/settings.local.json`의 `enabledPlugins: false`는 user scope 플러그인(superpowers, frontend-design)의 스킬·명령·세션 시작 훅까지 그 프로젝트에서 껐다. `skillOverrides: "off"`는 gstack 개인 스킬을 숨겼다. 새 세션의 init 이벤트로 확인했다.
- OMX 제거는 `omx uninstall --scope project`로 한다. 범위를 주지 않으면 user 범위(전역 `~/.codex`)가 대상이 될 수 있다(소스 확인). `--purge`는 `.omx/` 전체(plans, notepad, project-memory, state)를 지워 쓰지 않는다. 없으면 `.omx/setup-scope.json`·`hud-config.json`만 지워 설치기의 OMX 감지가 풀린다. `.gitignore`에 OMX가 더한 줄과 `.codex/config.toml`의 `model` 줄은 남는다.
- caveman의 `lean-build`가 말하는 "Native Core"는 CLI 전용이라 설치하지 않는다. 그 자리는 하네스 간결성 규칙이 맡는다고 역할 표에 적었다.

### 실제 Better-T-Stack 프로젝트 설치

| 시나리오 | 결과 |
|---|---|
| S1 인자 없이 설치 | 기본 스킬 29개와 skill-creator만 설치. `두뇌: 없음(기본 AI)`, `과설계 방지: 없음(기본 AI)`. 전역에 켜진 superpowers·OMC·ponytail·frontend-design과 gstack 개인 스킬 54개를 `.claude/settings.local.json`으로 끔. `skills:check`·`agents:check` exit 0, `.dev-cycle.json`·매니페스트·스크립트 Biome 검사 통과 |
| S2 `--brain superpowers --simplicity ponytail --matt tdd --optional i-have-adhd` | 23개 설치, superpowers·ponytail 플러그인 project scope 설치, local의 두 끄기 항목 지움. `skills:check` exit 0 |
| S3 `--simplicity caveman` | ponytail 플러그인 제거 뒤 project `false`, 스킬 6개 출처로 제거, caveman 5개 설치, 전역 ponytail을 local로 끔 |
| S4·S5 `--simplicity karpathy` → `none` | 이전 항목을 출처로 지우고 `.claude/skills` 링크와 쓰지 않는 marketplace 선언까지 정리. 매번 `skills:check` exit 0 |
| S6 `--brain oh-my` → `none` | OMC 플러그인과 `omx setup` 뒤 OMX 에이전트 18개·스킬 24개 설정. `none`으로 바꾸면 `omx uninstall`로 지우고 `prokit-*` 에이전트 3개는 남음. `agents:check` exit 0. 리뷰 뒤 `--purge`를 빼고 다시 해 보니 `.omx/plans`·`logs`·`state`가 남고 `skills:check` exit 0 |
| S7 옛 구성(키 없음, superpowers·OMC·OMX·ponytail 설치) | `skills:check`가 두 항목 모두 충돌로 exit 1. `--brain none --simplicity ponytail`이 superpowers·OMC·OMX를 지우고 빠진 ponytail 스킬을 채움. 이후 exit 0 |
| S8 `--brain agent-skills` → `pstack` → `gstack` → `none` | agent-skills는 플러그인과 Codex용 스킬 25개, pstack은 플러그인만 설치. 바꿀 때마다 이전 플러그인을 지우고 project `false`, 스킬은 lock 출처로 25개 모두 제거, 쓰지 않는 marketplace 선언 정리. gstack은 이 기기의 전역 본체(Claude·Codex)를 `있음`으로 보고 local의 개인 스킬 끄기 54개를 지움. `none`으로 바꾸면 54개를 다시 끔. 매번 `skills:check`·`agents:check` exit 0 |

확인용 project scope 플러그인은 `claude plugin uninstall --scope project`로 지웠다. 설치기가 `--scope project`로 더한 marketplace(`addy-agent-skills`, `cursor-plugins`)는 사용자 marketplace 목록에도 남아 확인 뒤 `claude plugin marketplace remove`로 지웠다. DB 컨테이너는 띄우지 않았다.

### prokit-init 평가

skill-creator 방식으로 7개 요청을 스킬 있음·없음으로 각각 실행했다(읽기 전용 계획 평가). 검증 항목 통과율은 스킬 있음 100%, 없음 79%였다. 스킬 있음이 평균 44초, 토큰 약 2.4만 적게 썼다.

- 차이가 난 곳: 스킬 없이 "템플릿으로 todo 앱 만들어줘"는 템플릿·이름만 묻고 스킬 구성을 묻지 않았다. 화면만 요청에서는 보고에 추천과 설치 명령이 없었다.
- 기준선도 강했다. 작업 트리에 설계 문서와 `brains/README.md`가 있어 기준선 4개가 그것을 읽었다. PRD 기반 추천 두 개(eval 4·5)는 양쪽 모두 통과했다.
- 평가 뒤 "일부만 맡긴 요청"(예: "matt 스킬도 골라줘") 규칙을 스킬에 한 줄 더했다.

2차 평가는 피드백을 반영한 스킬로 새 요청 9개를 돌렸다(스킬 있음만, 읽기 전용 계획). PRD가 없거나 건너뛴 요청 3개는 모두 PRD를 요청하며 멈췄다. 실시간 칸반 PRD는 `pstack (추천)`을 첫 선택지로 냈고, `다른 두뇌 보기`까지 합쳐 일곱 개가 모두 나왔다. 두뇌를 mattpocock으로 정한 요청은 추가 스킬 14개를 네 묶음 여러 선택으로 모두 내고 `tdd`·`research`에 `(추천)`을 붙였다. 응답 방식은 모두 `i-have-adhd (추천)`이었다. 세 실행이 "작업 폴더 흐름이 아니면 PRD가 새 프로젝트에 남지 않는다"고 짚어, PRD를 `docs/prd.md`(또는 `docs/first-request.md`)에 남겨 첫 커밋에 넣게 했다.

3차 검수는 같은 9개 요청을 2차 피드백 전 스킬과 나란히 돌렸다. 통과율은 지금 스킬 100%, 이전 스킬 64%였다. 이전 스킬은 한 항목만 정해도 나머지를 묻지 않았고, pstack을 추천하지 않았으며, 응답 방식에 SKIP을 추천했다. 이어서 독립 리뷰가 찾은 어긋남을 고쳤다. 과설계 방지 선택지 이름과 설치 값(`andrej-karpathy-skills`→`karpathy`)을 맞췄고, 맡긴 항목도 고른 값과 근거를 알리게 했다. 추가 스킬을 고르지 않는 방법(Other에 "없음")을 안내하고, PRD가 없어 멈추던 튜토리얼 프롬프트 두 곳을 고쳤다. 고친 스킬과 고치기 전 스킬을 다시 비교하자 통과율은 100%와 98%였다. 차이는 추가 스킬을 고르지 않는 방법의 안내 하나다. 두 비교 모두 이전 스킬 실행도 고친 `AGENTS.md`와 `brains/README.md`를 읽었으므로 SKILL.md 변경만의 효과다.

PRD 입력 단계도 보완했다. `/prokit-init <PRD 파일 경로나 내용>`의 인자를 먼저 PRD로 본다(Claude Code는 인자를 스킬 끝에 `ARGUMENTS:` 줄로 넘기고, 입력 칸에 `argument-hint`를 보여 준다). 인자와 요청에 없으면 첫 단계로 PRD를 한 번 요청하고, 그 뒤 답에도 없으면 PRD가 필수인 이유와 다시 시작하는 명령을 알리고 끝낸다. PRD 관련 요청 4개(없음, 건너뜀, 파일 인자, 요청 뒤에도 없음)를 보완 전 스킬과 나란히 돌리자 통과율은 100%와 75%였다. 차이는 "요청 뒤에도 없음"에서 났다. 보완 전 스킬은 같은 안내를 되풀이하며 기다렸다. 첫 실행에서 요청에 "PRD는 없어"가 있으면 요청 단계를 건너뛰고 바로 끝내는 경우가 나와, 이 경우에도 요청을 한 번 보내도록 고친 뒤 다시 돌렸다.

이어서 실제 Claude Code 세션으로 확인했다. 빈 작업 폴더에 지금 작업 트리 사본을 두고, PRD 없이 "pro-kit 받고 AGENTS.md대로 neon으로 memo-app 만들어줘"를 보냈다. 세션은 PRD 요청 하나만 보냈고, "없어"라는 답에는 종료 안내로 끝내며 아무것도 만들지 않았다. 고칠 곳 두 가지도 나왔다. 하나는 작업 폴더에서 연 세션에는 `/prokit-init`이 등록되지 않는데, 종료 안내가 그 명령으로 다시 시작하라고 한 것이다. 다른 하나는 `pull --ff-only`를 PRD 단계 뒤로 미룬 것이다. 작업 폴더 세션이면 처음 요청에 PRD를 붙여 다시 보내라고 안내하고, pro-kit 받기는 PRD 단계보다 먼저 하도록 고쳤다.

고친 뒤 같은 세션 방식으로 PRD를 넣은 요청("neon으로 study-planner 만들어줘. 고등학생과 대학생이 과목별 주간 계획을 세우고 …")을 끝까지 돌렸다. 세션은 `pull --ff-only`를 먼저 하고 PRD를 다시 묻지 않았다. 질문 화면은 두 번이었다. 첫 화면은 두뇌(`없음(기본 AI) (추천)`, superpowers, mattpocock, `다른 두뇌 보기`), 과설계 방지 스킬, 응답 방식을 함께 물었다. 둘째 화면은 추가 스킬 네 묶음을 여러 선택으로 물었고, `tdd`만 고르고 나머지 세 묶음은 비워 제출해도 그대로 진행했다. 설치 명령은 `--brain none --simplicity ponytail --matt tdd --optional i-have-adhd`였다. 5432와 5433이 쓰이고 있어 `DB_PORT=5434`로 DB를 띄웠고, 첫 마이그레이션(인증 테이블 4개), 네 검사(exit 0), `docs/first-request.md`를 포함한 커밋까지 마쳤다. 세션이 템플릿 폴더 안으로 `cd`해 사본에 `.omc/`가 생긴 일이 한 번 있었고, 세션이 찾아 지웠다.

## 사용자 피드백 반영

평가 뷰어 대신 대화로 받은 피드백을 반영했다.

- **PRD 필수**: `prokit-init`은 PRD를 먼저 받는다. PRD 파일, 붙여 넣은 글, 요청의 서비스 설명(누가 쓰는지와 핵심 기능), 요청에 적힌 프리셋 팩을 PRD로 본다. 없으면 PRD를 요청하고, 건너뛰면 init하지 않는다. 튜토리얼 1장 요청문(`b:clone-create-prompt`)은 프리셋 팩을 PRD로 쓰게 고쳤고, 빠른 시작과 루트 README 예시에 PRD를 넣었다.
- **pstack이 빠져 보이던 문제**: 처음 질문에 없는 두뇌를 묻는 `다른 두뇌 보기`가 superpowers, agent-skills, gstack, oh-my만 냈고, "새 프로젝트에는 pstack을 추천하지 않는다" 규칙도 있었다. 원본 README를 다시 보니 pstack의 중심은 `poteto-mode`(기능·버그·성능·리팩터·시안 플레이북으로 적게 쓰고 실행 증거로 검증)라 새 프로젝트에도 맞는다. 설명과 추천 신호를 고치고, 첫 질문 세 개와 `다른 두뇌 보기` 네 개로 일곱 개가 모두 나오게 했다.
- **mattpocock 두뇌**: 매니페스트 `brains.mattpocock`(설치 항목 없음)과 `brains/mattpocock.md`를 더했다. "용어가 흐리고 기법만 보강" 신호의 추천이 `none` + 추가 스킬에서 `mattpocock`으로 바뀌었다. 다른 두뇌로 바꿔도 추가 스킬은 지우지 않는다.
- **추가 스킬 여러 선택**: 두뇌가 정해지면 추가 스킬 14개를 네 묶음 여러 선택 질문으로 늘 묻고, 추천한 스킬에 `(추천)`을 붙여 앞에 둔다. 두뇌와 겹치는 스킬도 목록에 남기고 설명에 겹침을 적는다.
- **응답 방식**: i-have-adhd를 추천한다. 길고 자세한 설명을 원한 사용자만 SKIP을 추천한다.
- **실제 확인**: 확인용 프로젝트에서 `--brain mattpocock --matt research,wizard`가 기록되고 `skills:check` exit 0이었다. `--brain none`으로 바꿔도 추가 스킬은 남았다.

## 독립 리뷰

구현 뒤 읽기 전용 리뷰를 따로 받았다(판정 changes-required). 고친 것은 이렇다.

- **OMX 작업 기록 삭제(high)**: `omx uninstall --purge`가 `.omx/` 전체를 지웠다. 옛 기본 구성(OMX 설치)에서 문서대로 두뇌를 바꾸면 git이 무시하는 plans·notepad·기억이 복구할 수 없게 사라졌다. `--purge`를 빼고, 테스트 스텁이 `--purge` 유무를 구분해 `.omx/plans`가 남는지 본다.
- **깨진 개인 설정**: 전역 `~/.claude/settings.json`이나 `.claude/settings.local.json`이 깨져 있으면 명령 전체가 요약 없이 죽었다. 이제 그 단계만 건너뛰고 `전역 경고:` 줄에 파일 경로를 적는다. 깨진 파일은 덮어쓰지 않는다. 홈 경로는 `HOME`이 없어도 `os.homedir()`로 찾는다.
- **조용히 무시되던 입력**: `--brain=값` 형식은 사용법 오류로 멈춘다. 기존 프로젝트의 옛 판 `skills-setup.mjs`가 남아 `--brain`을 모르면 설치기가 경고하고, 루트 `AGENTS.md`의 이행 절차에 스크립트와 매니페스트를 먼저 옮기라고 적었다. 깨진 `skills-lock.json`은 정리 감지를 끄는 대신 실패(`--check`는 누락)로 알린다.
- **문서**: 설치기 옵션 설명이 `--matt`·`--optional`도 기록한다고 읽혔다. 기록은 두뇌·과설계 방지 스킬만 하고 나머지는 `pnpm skills:setup`에 다시 준다고 고쳤다.
- **작은 것**: 기록값이 `constructor` 같은 내장 이름이면 매니페스트에 없는 값으로 본다. `.dev-cycle.json` 기록은 그 키 말고 다른 값이 바뀌면 쓰지 않는다. `skills:update`는 lock 출처가 맞는 기본 밖 스킬만 본다(이름만 같은 사용자 스킬을 덮어쓰지 않게). 전역 도구가 없는 gstack은 `설치됨`으로 보이지 않고, 그 도구(codex 등)가 없는 기기에는 그 도구용 전역 항목을 설치하지 않는다.

## 한계

- gstack 본체는 이 기기에 이미 있어 `--with-global`로 새로 받는 경로(Bun, git clone)는 확인하지 않았다.
- `/i-have-adhd`와 `/caveman`이 skills CLI 설치본에서 사용자 명령으로 불리는지는 대화형 세션에서 확인하지 않았다. caveman의 `caveman` 스킬은 `disable-model-invocation`이 없어 모델이 스스로 켤 수 있다. 규칙은 "사용자가 켤 때만"이다.
- mattpocock `code-review`·`prototype`·`research`는 하네스 내장 명령과 이름이 겹친다(원본 저자도 인정). 어느 쪽이 불리는지는 확인하지 않았다.
- 폴더를 복사하거나 옮긴 프로젝트는 OMX 훅 신뢰 기록의 절대 경로 때문에 `omx setup`·`uninstall`이 실패할 수 있다. 설치기는 실패로 보고만 한다.
- 전역 `~/.claude/CLAUDE.md`의 OMC 블록, gstack 전역 훅, Codex 전역 스킬은 프로젝트 설정으로 끌 수 없어 경고만 한다.
- caveman과 karpathy는 매니페스트에 Claude 플러그인 ID가 없어, 사용자가 전역 플러그인으로 따로 설치했으면 설치기가 찾거나 끄지 못한다. 실제 플러그인 ID는 확인하지 않았다.
- oh-my 설치본을 지울 때 `omx`가 없으면 OMX 정리만 실패로 멈춘다(기록과 플러그인 끄기는 이미 반영된다). `omx`를 설치하고 같은 명령을 다시 실행하면 이어서 지운다.
- Grok Build의 프로젝트 스킬 경로(`.grok/skills`)가 지금 문서의 설명과 다르다는 공식 문서가 있다. 이번 범위 밖이라 따로 확인할 항목으로 남겼다.
