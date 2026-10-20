# 두뇌·과설계 방지·추가 스킬 선택 설치와 prokit-init 설계·실행 계획

2026-10-20 설계 확정. 같은 날 두 번 고쳤다.

- 2차: mattpocock 필수 스킬 세 개를 공식 스킬로 되돌리고, 나머지를 추가 스킬로 나눴다.
- 3차: ponytail·caveman·andrej-karpathy-skills를 "과설계 방지 스킬"로 묶었다. 이 중 하나를 고르면 그 스킬이 지금 ponytail이 맡는 역할을 대신하고, SKIP하면 기본 AI가 맡는다. i-have-adhd는 따로 고른다.

아직 구현하지 않았다. 9절의 사용자 결정을 반영했다.

## 1. 배경과 목표

지금 템플릿은 프로세스를 주도하는 스킬 묶음을 여러 개 함께 설치한다. superpowers(Claude 플러그인과 Codex 스킬)와 OMC(Claude 플러그인)는 프로젝트에 자동으로 들어가고, OMX는 `omx`가 있으면 프로젝트에 설정되며, gstack은 `--with-global`이면 전역에 들어간다. mattpocock의 `domain-modeling`·`grilling`·`grill-with-docs`와 ponytail도 기본 설치다. `process-routing.md`는 이들을 1순위·대안·보강으로 엮어 한 라운드 안에서 섞어 쓴다.

이 가운데 superpowers, OMC·OMX, gstack은 모두 "어떤 순서로 생각하고 진행할지"를 스스로 정한다. superpowers는 세션 시작 훅으로 brainstorming을 강제하고, OMC는 전역 `CLAUDE.md` 블록과 키워드 훅으로 autopilot·ralph를 띄우며, gstack도 자기 질문·계획 흐름을 요구한다. 함께 설치하면 지시가 서로 덮어쓴다. 과설계를 막는 스킬도 같은 문제가 있다. ponytail, caveman, andrej-karpathy-skills는 저마다 "얼마나 작게, 어디까지 고칠지"를 정하므로 둘 이상이면 규칙이 엇갈린다. 하네스(대조표, 위임 검증, `prokit-reviewer`, audit, 사용자 확인)가 충분히 단단해졌으므로 이 묶음 없이도 기본 AI가 진행을 맡을 수 있다.

목표는 다음과 같다.

1. 두뇌 스킬은 프로젝트마다 0개 또는 1개만 설치한다. 기본값은 0개(기본 AI)다.
2. 두뇌 스킬은 프로젝트 scope에만 설치한다. 템플릿이 고르지 않은 두뇌를 전역에 설치하는 경로를 없앤다. 예외는 정식 프로젝트 설치가 없는 gstack과 OMX CLI이며, 그 두뇌를 고른 경우에만 전역에 설치한다(D5).
3. 두뇌가 없으면 기본 AI가 `prokit-dev-cycle`의 내장 절차로 요구 정리·계획·구현 진행·디버깅·검증을 맡는다.
4. mattpocock의 `domain-modeling`·`grilling`·`grill-with-docs`는 공식 스킬(하네스)로 늘 설치한다. 용어·설계 질문은 두뇌와 상관없이 이 세 스킬로 한다.
5. mattpocock의 나머지 스킬은 추가 스킬이다. PRD에 맞는 것을 추천하고, 사용자가 고르면 설치하며, 건너뛰면 설치하지 않는다.
6. 과설계 방지 스킬(ponytail, caveman, andrej-karpathy-skills)은 프로젝트마다 0개 또는 1개만 설치한다. 추천 순서는 ponytail, caveman, karpathy다. 고른 스킬이 지금 ponytail이 맡는 역할(늘 지키는 간결성, 계획·구현 diff의 간결성 검토, 공통화 점검)을 대신한다. SKIP하면 기본 AI가 하네스의 간결성 규칙으로 그 역할을 맡는다.
7. i-have-adhd는 응답 방식 스킬로 따로 골라 설치하고, SKIP하면 넘어간다.
8. 새 프로젝트를 만들 때 `prokit-init` 스킬이 템플릿·이름·위치와 함께 두뇌·추가 스킬·과설계 방지 스킬·응답 방식을 묻는다. 선택지마다 짧은 설명을 붙인다. 요청·첫 요청 파일·PRD·스펙이 있으면 그 내용으로 추천을 만든다. 답이 없으면 어느 것도 설치하지 않는다.
9. 워크플로(dev-workflow 행, 라우팅), 스킬(`prokit-*`), 에이전트(`prokit-implementer` 등), 설치기, 문서를 이 방식으로 맞춘다.

## 2. 용어

| 용어 | 뜻 | 예 |
|---|---|---|
| 두뇌 | 요구 정리, 계획, 구현 진행, 디버깅, 완료 확인의 순서와 방법을 스스로 주도하는 스킬 묶음이나 런타임. 둘 이상이면 지시가 충돌한다 | superpowers, agent-skills, pstack, gstack, OMC·OMX |
| 기본 AI | 고른 스킬이 없을 때 그 역할을 맡는 지금 세션의 에이전트(Claude Code, Codex, Antigravity, Grok Build)와 그 네이티브 기능(plan mode, 서브에이전트, 질문 도구) | `brain: "none"`, `simplicity: "none"` |
| 과설계 방지 스킬 | 요청하지 않은 기능·추상화를 막고 가장 작게 완성하게 하는 스킬. 둘 이상이면 규칙이 엇갈려 하나만 쓴다 | ponytail, caveman, andrej-karpathy-skills |
| 하네스 | 고른 스킬과 상관없이 늘 설치하고 늘 지키는 프로킷 규칙과 도구 | `prokit-*` 스킬, `prokit-implementer`·`prokit-reviewer`·`specialist-reviewer`, dev-cycle 스크립트, 대조표·audit·`[confirm]`, 공식 도메인 스킬, skill-creator, mattpocock 필수 세 개, 간결성 규칙(`process-routing.md` 규칙 6) |
| 추가 스킬 | mattpocock/skills 중 필수 세 개 밖의 스킬. 서로 독립된 기법이라 PRD에 맞는 것만 고른다 | `tdd`, `prototype`, `research` |
| 응답 방식 스킬 | 대화 응답의 모양만 바꾸는 선택 스킬 | i-have-adhd |
| 단일 선택 항목 | 하나만 고르는 두 항목(두뇌, 과설계 방지 스킬). 설치기가 같은 방식으로 기록·설치·정리한다 | `.dev-cycle.json`의 `brain`, `simplicity` |

두뇌와 과설계 방지 스킬은 "어떻게 생각하고 진행하나", "얼마나 작게 만드나"만 바꾼다. 대조표 행, 위임 검증과 snapshot, `prokit-reviewer` 최종 게이트, `prokit-verify`, `pnpm dev-cycle audit`, `[confirm]`, `prokit-deploy` 배포 경로는 그대로다. 두뇌가 낸 완료 보고는 증거가 아니고, 두뇌의 배포·커밋 명령은 쓰지 않는다(지금 규칙 유지). 추가 스킬과 응답 방식 스킬도 이 하네스를 바꾸지 않는다(D11).

## 3. 후보와 설치 범위

2026-10-20에 각 저장소 README·설치 스크립트·`SKILL.md`·플러그인 manifest·훅 코드와 Claude Code·Codex 공식 문서를 읽어 확인했다. 과설계 방지·응답 방식 스킬 네 저장소는 얕게 받아 읽고 `skills add --list`로 스킬 목록만 확인했다(설치·실측은 하지 않음). "미확인"은 6절 5단계 실제 설치에서 확인한다.

### 3.1 두뇌

| 카탈로그 키 | 원본 | Claude Code 프로젝트 설치 | Codex 프로젝트 설치 | Antigravity | 전역 부작용·주의 |
|---|---|---|---|---|---|
| `none` | 없음 | 기본 AI | 기본 AI | 기본 AI | 없음 |
| `superpowers` | obra/superpowers | 플러그인 `superpowers@claude-plugins-official --scope project`. SessionStart 훅이 `using-superpowers`를 주입한다 | skills CLI `.agents/skills`(지금 방식, 훅 없음) | `.agents/skills` | 없음 |
| `agent-skills` | addyosmani/agent-skills | 플러그인 `agent-skills@addy-agent-skills --scope project`(`/spec`~`/ship` 명령 포함. skills CLI는 명령이 빠진다) | skills CLI `.agents/skills`(단일 스킬 설치 시 `references/` 누락 이슈 #361) | `.agents/skills` | 없음. 훅은 있으나 배선되지 않음 |
| `pstack` | cursor/plugins의 pstack | 플러그인 `pstack@cursor-plugins --scope project`(공식 Claude Code 어댑터, 비Claude 모델 지정은 세션 모델로 바뀐다) | 공식 지원 없음 → 기본 AI | 지원 없음 → 기본 AI | `/pstack:setup-pstack`은 `~/.claude/rules`에 쓴다. 프로킷에서는 실행하지 않는다 |
| `gstack` | garrytan/gstack | 전역 예외(D5): 정식 경로 `~/.claude/skills/gstack` + `./setup`. 저장소 벤더링(`./setup --local`)은 deprecated·비정식이라 쓰지 않는다 | 전역 예외: `./setup --host codex`(`~/.codex/skills/gstack`) | 지원 없음 | Bun 필요. 전역 설치가 `~/.claude/settings.json`에 훅을 등록하고 `~/.gstack` 상태·Playwright 캐시를 만든다. 팀 모드(`--team`)는 프로젝트 `CLAUDE.md`를 고치므로 쓰지 않는다. 다른 프로젝트에서는 D6로 숨긴다 |
| `oh-my` | OMC(Yeachan-Heo/oh-my-claudecode), OMX(Yeachan-Heo/oh-my-codex) | OMC 플러그인 `oh-my-claudecode@omc --scope project`. `omc-setup`은 실행하지 않는다(기본값이 `~/.claude/CLAUDE.md`를 덮어쓴다) | OMX CLI는 전역 예외(D5, `npm install -g oh-my-codex`), 설정은 프로젝트 `omx setup --scope project --no-merge-agents`(`.codex/`, `.omx/`. 지금 방식) | 지원 없음 | OMX `team`은 tmux 런타임 필요. `.codex/hooks.json`의 기기 절대경로는 git이 무시하는 파일에 든다 |

mattpocock은 두뇌 후보에서 뺐다. 필수 세 개는 하네스, 나머지는 추가 스킬이다(D7, D8).

### 3.2 과설계 방지 스킬, 응답 방식 스킬, 추가 스킬

| 키 | 원본 | 프로젝트 설치(Claude Code / Codex·Antigravity·Grok Build) | 켜지는 방식 | 프로젝트 밖에 쓰는 것·주의 | 라이선스·활동 |
|---|---|---|---|---|---|
| `ponytail` | DietrichGebert/ponytail | Claude 플러그인 `ponytail@ponytail --scope project`. 스킬 6개(`ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-help`, `ponytail-gain`)는 skills CLI(Codex·Antigravity·Grok용, 지금 방식). Codex 네이티브 플러그인은 `--with-global`일 때만(지금 방식) | 늘 켜짐. SessionStart 훅이 규칙과 코드 지도(`git ls-files` 기반, 2000자까지)를 주입하고 SubagentStart가 서브에이전트에도 켠다. "stop ponytail"·"normal mode"로 끄고 `/ponytail lite\|full\|ultra\|off`로 바꾼다 | `~/.claude/.ponytail-active`, 턴별 CSV `~/.config/ponytail/band/<프로젝트>.csv`(플러그인 `userConfig.ledger` 기본 켜짐), statusline 추가 제안(전역 설정은 사용자가 요청할 때만, 지금 규칙) | MIT. v5.3.2, 마지막 커밋 2026-10-18(최근 5개 모두 같은 날) |
| `caveman` | JuliusBrussee/caveman | skills CLI 다섯 개: `lean-build`(새 기능을 좁고 완전하게), `surgical-patch`(버그·작은 변경을 맡은 계층에서만), `safe-refactor`(동작을 지키며 구조 정리·통합), `caveman-review`(지적 한 줄씩 리뷰), `caveman`(응답 압축). Claude 플러그인과 `@caveman-ai/cli`는 쓰지 않는다 | 작업 스킬 셋과 `caveman-review`는 일이 맞으면 모델이 부른다. 응답 압축 `caveman`은 `/caveman`(Codex `$caveman`)으로 켜고 "stop caveman"으로 끈다. 늘 켜는 훅은 없다. 작업 스킬이 전제하는 "Native Core"(재사용 순서 규칙)는 CLI만 주입하므로, 프로킷에서는 하네스 간결성 규칙이 그 자리를 맡는다(두 규칙의 순서는 거의 같다) | 스킬만 설치하면 없음. 플러그인 훅은 응답 압축 규칙만 매 세션·서브에이전트에 주입하고 `~/.claude` 상태 파일과 statusline 제안을 쓴다. CLI는 다른 도구의 전역 설정·`ANTHROPIC_BASE_URL` 프록시·기본 켜진 원격 측정을 바꾼다 | Apache-2.0(3.0.0부터, `NOTICE`에 저작권 줄). v4.0.1, 마지막 커밋 2026-10-17 |
| `karpathy` | multica-ai/andrej-karpathy-skills(옛 `forrestchang/…` 주소는 301로 넘어간다) | skills CLI `karpathy-guidelines` 하나(`-a claude-code -a codex`). Claude 플러그인 `andrej-karpathy-skills@karpathy-skills`는 훅 없이 같은 스킬만 담아 쓰지 않는다 | 모델 호출(코드를 쓰거나 리뷰·리팩터할 때). 67줄, 네 원칙(코딩 전 생각, 단순함, 정밀 수정, 검증 목표) | 없음. README의 `CLAUDE.md` 덧붙이기(`curl … >> CLAUDE.md`)는 템플릿 마커 파일을 고치므로 쓰지 않는다 | LICENSE 파일 없음(README·`plugin.json`·`SKILL.md`는 MIT 표기, GitHub API `license: null`). 별 22만 개로 가장 유명하다. 마지막 커밋 2026-04-20. 2026-10-09 미도입 검토가 있다(`docs/reports/2026-10-09-karpathy-skill-adoption/`) |
| `i-have-adhd` | ayghri/i-have-adhd | skills CLI `i-have-adhd` 하나. 플러그인은 SessionStart 훅이 전역 파일(`~/.claude/.i-have-adhd-always`)이 있을 때만 동작해 쓰지 않는다 | 사용자 명령만(`disable-model-invocation: true`): `/i-have-adhd`, Codex `$i-have-adhd`. "stop adhd mode"·"normal mode"로 끈다 | 없음. 늘 켜기는 전역 파일(`~/.codex/AGENTS.md` 등)로만 되므로 쓰지 않는다 | MIT. v0.4.1, 마지막 커밋 2026-10-11 |
| mattpocock 추가 스킬 | mattpocock/skills(스킬 27개, plugin 1.3.1) | skills CLI 스킬 단위(`-a claude-code -a codex`). 플러그인은 전체 설치라 쓰지 않는다(원본 README도 둘 중 하나만 쓰라고 한다) | 스킬마다 모델 호출 또는 사용자 명령(5.8.2) | 없음 | MIT(이미 고지) |

caveman에서 설치하지 않는 스킬과 이유:

- `ultracave`·`megacave`: 더 센 압축이다. `megacave`는 한문으로 답한다.
- `caveman-compress`: `CLAUDE.md`·`AGENTS.md`를 제자리에서 다시 쓰고 그 내용을 모델 제공자에게 보낸다. 백업은 저장소 밖에 둔다.
- `caveman-commit`: 커밋 제목 접두어와 본문 bullet 규칙과 부딪힌다.
- `investigate-first`: 디버깅 단계라 두뇌·추가 스킬 `diagnosing-bugs`·내장 절차와 겹친다.
- `verify-and-stop`: `prokit-verify`·audit과 겹친다.
- `migration`: `prokit-db`의 마이그레이션 규칙과 겹친다.
- `cavecrew`: 자체 서브에이전트라 `prokit-implementer` 위임과 겹친다.
- 클라우드·프록시 스킬(`caveman-setup` 등), `caveman-help`·`caveman-stats`: CLI·훅을 전제한다.

세 과설계 방지 스킬이 서로 다른 점(하나만 쓰는 이유):

- 모호할 때: karpathy는 멈추고 묻는다. ponytail은 가장 작은 판을 만든다. caveman은 공개 범위·보안·데이터·과금·되돌리기 어려운 선택만 묻는다.
- 수정 범위: karpathy는 요청한 곳만 고친다. ponytail은 깨지는 호출자·테스트까지 고친다. caveman `lean-build`는 "한 파일·국소 패치에 억지로 넣지 말고 맡은 계층까지"라 ponytail의 "가장 짧은 diff"와 반대로 말한다.
- 테스트: karpathy는 고칠 때마다 재현 테스트를 쓰고, ponytail은 사소한 변경이면 생략한다.
- "normal mode"는 ponytail, caveman, i-have-adhd를 한꺼번에 끈다.

프로킷에서는 이 차이를 하네스 규칙이 정한다(D11). 하나만 설치하므로 프로젝트 안에서 규칙끼리 부딪히지는 않는다.

### 3.3 플랫폼 사실

- Claude Code의 프로젝트 scope는 활성화 범위다. 플러그인 본체는 사용자 캐시에, marketplace 등록은 사용자 설정에 들어간다. 프로젝트 `.claude/settings.json`의 `enabledPlugins`가 그 프로젝트에서의 사용 여부를 정한다.
- 우선순위는 user < project < local이다. 프로젝트나 `.claude/settings.local.json`에 `false`를 쓰면 user scope로 켠 플러그인도 그 프로젝트에서만 꺼진다(managed 설정이 강제한 것은 예외).
- `skillOverrides: {"<이름>": "off"}`로 `~/.claude/skills`의 개인 스킬을 이름 단위로 숨길 수 있다. 디렉터리 단위 일괄 숨김은 없다. 전역 `~/.claude/CLAUDE.md` 블록은 `claudeMdExcludes`로만 뺄 수 있고 파일 전체가 빠진다.
- Codex는 프로젝트 단위 스킬 비활성화가 없다(사용자 설정의 `skills.config`만 반영). 플러그인은 신뢰한 프로젝트의 `.codex/config.toml`에서 `enabled = false`로 끌 수 있다.
- 조사 중 따로 확인한 것: Grok Build의 프로젝트 스킬 경로는 `.grok/skills`이고 프로젝트 `.agents/skills`는 읽지 않는다는 공식 문서가 있다. 지금 템플릿 문서의 "Grok Build는 `.agents/skills`를 읽는다"와 다르다. 이번 범위 밖이며 따로 확인할 항목으로 남긴다.

## 4. 결정

| 번호 | 결정 | 이유 |
|---|---|---|
| D1 | 한 프로젝트에 두뇌는 `none` 또는 카탈로그 중 하나, 과설계 방지 스킬도 `none` 또는 셋 중 하나다. 기본은 둘 다 `none` | 충돌 방지, 사용자 요구 |
| D2 | 두 단일 선택 항목의 선택값은 `.dev-cycle.json`의 `brain`·`simplicity`에 두고, 카탈로그는 `skills.manifest.json`의 `brains`·`simplicity`에 둔다. 두 항목은 같은 코드로 기록·설치·정리한다. 추가 스킬과 응답 방식 스킬은 따로 기록하지 않는다. 설치 상태(`skills-lock.json`·`.agents/skills`)가 곧 선택이다(지금 선택 묶음과 같다) | 카탈로그는 템플릿 소유, 선택은 프로젝트 소유다. `.dev-cycle.json`은 설치기가 채우는 파일(`FILLED`)이라 `--diff` 잡음이 없다. 하나만 고르는 항목은 바꿀 때 이전 것을 지워야 해서 기록이 필요하고, 여러 개 고르는 항목은 필요 없다 |
| D3 | `pnpm skills:setup --brain <이름\|none>`, `--simplicity <이름\|none>`이 선택을 기록하고, 그 항목에서 고르지 않은 설치본을 D4 감지로 찾아 모두 지운 뒤 고른 것을 설치한다. 기록값과 같은 값을 줘도 같다. 그래서 키가 없는 기존 프로젝트도 한 번에 정리된다. 인자 없는 `skills:setup`은 기록된 것만 설치하고 다른 것은 지우지 않는다(보고만) | 지우는 동작은 사용자가 인자를 명시했을 때만 한다. "이전 기록값"만 지우면 기록이 없거나 틀린 기존 프로젝트가 정리되지 않는다 |
| D4 | `pnpm skills:check`는 두 항목의 줄을 보여 주고, 고르지 않은 두뇌나 과설계 방지 스킬이 프로젝트 scope에 있으면 누락과 같이 exit 1로 본다. 어느 항목의 설치본인지는 스킬 이름이 아니라 출처로 판정한다: `skills-lock.json`의 `source`, `.claude/settings.json`의 플러그인 ID, OMX의 `.omx/setup-scope.json` | H 라운드의 `skills:check` 행이 충돌을 잡게 한다. superpowers와 agent-skills처럼 같은 이름의 스킬(`test-driven-development`)을 가진 후보가 있다 |
| D5 | 템플릿의 무조건 `global` 목록에서 OMX CLI와 gstack을 빼서 각 두뇌 항목의 `global`로 옮긴다. 두뇌는 프로젝트 scope로 설치하되, gstack(Claude `~/.claude/skills/gstack`, Codex `~/.codex/skills/gstack`, Bun 필요)과 OMX CLI(`npm install -g oh-my-codex`)만 그 두뇌를 고른 경우에 전역 설치를 허용한다. 전역 설치는 `--brain <이름>`을 명시했거나 `--with-global`일 때만 하고, 그냥 `pnpm skills:setup`은 없다고 알리고 설치 명령만 보여 준다. 다른 두뇌로 바꿔도 전역 설치본은 지우지 않는다(다른 프로젝트가 쓸 수 있다). 그 밖에 프로젝트 scope로 설치할 수 없는 도구 조합(pstack의 Codex 등)은 "지원 안 함"으로 적고 기본 AI로 진행한다 | 사용자 요구 2와 결정 9-1 |
| D6 | 전역에 이미 있는 두뇌·과설계 방지 스킬은 감지해 보고하고, 개발자 개인 설정 `.claude/settings.local.json`(커밋하지 않음)으로 이 프로젝트에서만 끈다: 고르지 않은 user scope 플러그인(예: superpowers, OMC, ponytail, caveman)과 기본 설치 스킬과 같은 일을 하는 플러그인(매니페스트 `claude.conflicts`. 지금은 impeccable과 같은 일을 하는 `frontend-design@claude-plugins-official` 하나)은 `enabledPlugins: false`, `~/.claude/skills`의 gstack 스킬은 `skillOverrides: "off"`. 전역 `~/.claude/CLAUDE.md`의 OMC 블록과 Codex 전역 스킬은 끌 방법이 파일 전체 제외뿐이거나 없으므로 경고만 하고, `AGENTS.md` 규칙으로 고르지 않게 한다. 전역 파일은 쓰지 않는다 | 전역 설치는 기기마다 다르니 커밋 설정이 아닌 local 설정에 둔다. 우선순위상 local이 user를 덮는다(3.3). user scope ponytail이 켜져 있으면 caveman을 고른 프로젝트에서도 ponytail 훅이 돈다 |
| D7 | mattpocock의 `domain-modeling`·`grilling`·`grill-with-docs`는 하네스다(기본 `skills`에 그대로 둔다). 용어·도메인 규칙·되돌리기 어려운 설계 결정을 묻고 기록하는 일은 두뇌와 상관없이 `grilling`의 질문 형식(묶음별 질문과 추천 답)과 `domain-modeling` 기록으로 한다. `grill-me`는 `grilling`을 부르는 한 줄짜리 사용자 명령이라 설치하지 않는다 | 사용자 결정 9-5. `GLOSSARY.md`·ADR은 모든 라운드의 공통 문서 행이 쓰고, 용어·설계 질문의 형식은 두뇌가 바뀌어도 같아야 한다. `grilling`은 "grill" 요청 문구로 바로 불린다 |
| D8 | 추가 스킬은 `pnpm skills:setup --matt <스킬>[,<스킬>]`로 설치한다. 매니페스트 `mattpocock.pool`에는 설치할 수 있는 스킬 이름만 둔다. 신호, 호출 방식, 같은 일을 맡는 두뇌(겹침), 제외 이유는 추천 정본(D15)에만 둔다. 겹침은 추천에서 빼는 데만 쓴다. 사용자가 겹치는 스킬을 원하면 설치하고, 라우팅은 두뇌의 스킬을 먼저 쓴다(5.5 `process-routing.md`) | matt 스킬은 서로 독립된 기법이라 프로젝트마다 필요한 것이 다르다. 겹침 목록은 아직 실측하지 않은 값이라(10절) exit 코드나 삭제를 정하게 하지 않는다. 사용자가 고른 것을 막지 않는다 |
| D9 | ponytail은 기본 설치(`skills`, `claude.plugins`, `claude.marketplaces`, 최상위 `codex`)에서 빼고 `simplicity.ponytail`로 옮긴다. caveman·karpathy도 `simplicity`에 둔다. i-have-adhd는 지금 선택 묶음 `optional`에 `i-have-adhd` 묶음으로 더하고 `--optional`로 설치한다 | 사용자 요구(하나만 선택, SKIP 가능, i-have-adhd는 별도). 같은 구조를 다시 쓴다 |
| D10 | 간결성 규칙은 하네스다. `process-routing.md` 규칙 6의 사다리(지금 필요한가 → 코드에 있는가 → 표준 라이브러리 → 플랫폼 기능 → 설치된 의존성 → 새 코드), 스펙의 "만들지 않는 것" 절, `shortcut:` 주석과 기존 `ponytail:` 주석 보존, 공통화 범위, 지적 처리는 무엇을 골라도 지킨다. 그 위에서 지금 ponytail이 맡는 역할을 고른 과설계 방지 스킬이 맡고, `none`이면 기본 AI가 하네스 규칙으로 맡는다(5.6 역할 표). 어느 경우에도 리뷰 행을 "ponytail이 없다"는 이유로 `blocked`에 두지 않는다 | 사용자 요구 6. 지금 규칙 6의 "설치되어 있지 않으면 `blocked`" 문장은 선택 설치와 맞지 않는다 |
| D11 | 고른 스킬의 규칙이 `AGENTS.md`, `prokit-*`, 대조표, 보고 형식과 부딪히면 뒤의 것이 우선한다(지금 ponytail 규칙과 같은 문장). caveman 응답 압축(`caveman`)과 i-have-adhd는 대화 응답에만 적용한다. 파일(문서, 커밋 메시지, 대조표 증거, 보고서), 사용자에게 묻는 질문, 보안·데이터 손실 경고, 라운드 보고 형식은 줄이지 않는다. 늘 켜는 훅과 전역 파일은 ponytail 플러그인 말고는 쓰지 않는다 | 2026-10-09 Karpathy 미도입 검토의 해석 부담 지적(모호하면 멈추기, 예외 처리 생략), 응답 압축이 한국어 문서 규칙·보고 형식과 부딪힘 |
| D12 | `prokit-init`은 pro-kit 저장소 루트 스킬이다(`.agents/skills/prokit-init`, `.claude/skills` 링크). 새 프로젝트에는 설치하지 않는다 | 초기 설정은 pro-kit 세션에서 한다. 이미 만든 프로젝트의 변경은 그 프로젝트의 H 라운드와 `skills:setup` 인자가 맡는다 |
| D13 | 새 프로젝트 만들기 절차의 정본은 계속 루트 `AGENTS.md`다. `prokit-init`은 선택값 수집·검증·기본값과 추천을 맡고, 절차를 그 값으로 실행한다 | 같은 절차를 두 곳에 쓰지 않는다(중복 검사). 스킬을 못 읽는 에이전트도 `AGENTS.md`로 진행한다 |
| D14 | 변경은 설치 구성 변경이라 minor 릴리스를 추천한다. 기존 프로젝트는 H 라운드로 옮긴다(7절) | 저장소 릴리스 규칙 |
| D15 | 추천은 스크립트가 아니라 에이전트가 추천 기준표(5.8)를 적용해 한다. 두뇌·과설계 방지·추가·응답 방식 스킬의 카탈로그, 선택지 설명(5.7), 추천 기준의 정본은 템플릿의 `prokit-dev-cycle/references/brains/README.md` 한 곳이고, `prokit-init`은 그 파일을 읽는다 | PRD는 형식이 제각각이라 규칙 매칭이 맞지 않는다. 한 정본을 새 프로젝트 만들기와 기존 프로젝트 변경이 함께 쓴다 |
| D16 | 추천은 제안이다. 사용자가 고르거나 "알아서 골라줘"처럼 맡겼을 때만 설치한다. 답이 없거나 묻지 않는 흐름이면 두뇌·과설계 방지 스킬은 `none`, 추가 스킬·응답 방식 스킬은 설치하지 않는다. 맡긴 경우에는 추천을 그대로 쓴다(과설계 방지 스킬은 ponytail) | 사용자 요구(입력이 없으면 설치하지 않음, SKIP하면 넘어감) |
| D17 | 과설계 방지 스킬 질문의 선택지 순서는 ponytail(추천), caveman, andrej-karpathy-skills, SKIP(기본 AI)다 | 사용자 결정 9-6. ponytail과 caveman은 활발히 갱신되고(3.2) ponytail은 프로킷 규칙 6과 리뷰 계약이 이미 맞춰져 있다. karpathy는 갱신이 멈췄지만 사용자가 많아 고를 수 있게 둔다 |

## 5. 구조 설계

### 5.1 매니페스트

```jsonc
{
  "skillsCli": "skills@latest",
  "skills": [ /* 공식 도메인 스킬, mattpocock 필수 세 개(domain-modeling, grilling, grill-with-docs), skill-creator(Codex) */ ],
  "mattpocock": {
    "source": "mattpocock/skills",
    "agents": ["claude-code", "codex"],
    "pool": [ /* --matt로 설치할 수 있는 스킬 이름(5.8.2의 "추가" 행). 신호·겹침·제외 이유는 brains/README.md(D15) */ ]
  },
  "optional": {
    "ops": {}, "motion": {}, "mobile": {},          // 지금 도메인 묶음(그대로)
    "i-have-adhd": { "description": "행동 중심 짧은 응답(/i-have-adhd로 켠다)", "skills": [ /* ayghri/i-have-adhd: i-have-adhd */ ] }
  },
  "brains": {
    "<이름>": {
      "description": "한 줄 설명",
      "skills": [ /* skills CLI 항목. 기본 skills와 같은 모양 */ ],
      "claude": { "marketplaces": {}, "plugins": [] },
      "hosts": { "claude-code": "full", "codex": "none" /* full | experimental | none. none이면 그 도구는 기본 AI */ },
      "omx": [ /* oh-my만. 프로젝트 OMX 설정 인자 */ ],
      "global": [ /* gstack, oh-my(OMX CLI)만. manifest.global과 같은 모양. 그 두뇌를 고른 경우에만 본다(D5) */ ]
    }
  },
  "simplicity": {
    "ponytail": {
      "description": "늘 켜지는 미니멀 모드와 구현 diff 간결성 검토",
      "skills": [ /* Codex·Antigravity·Grok용 스킬 6개(지금 항목) */ ],
      "claude": { "marketplaces": { "ponytail": {} }, "plugins": ["ponytail@ponytail"] },
      "codex": { "marketplace": {}, "plugins": ["ponytail@ponytail"] }   // 네이티브, --with-global일 때만(지금 최상위 codex)
    },
    "caveman": { "description": "작업별 간결 패턴, 한 줄 리뷰, 응답 압축", "skills": [ /* lean-build, surgical-patch, safe-refactor, caveman-review, caveman */ ] },
    "karpathy": { "description": "카파시 네 원칙 지침", "skills": [ /* karpathy-guidelines */ ] }
  },
  "claude": {
    "marketplaces": { /* claude-plugins-official */ },
    "plugins": ["skill-creator@claude-plugins-official"],
    "conflicts": { "frontend-design@claude-plugins-official": "impeccable과 같은 일(impeccable의 출발점)" }   // 전역에 켜져 있으면 D6로 끈다
  },
  "global": [ /* agent-browser, Vercel CLI, ego-browser, Neon CLI 또는 Supabase CLI. OMX CLI·gstack 제거 */ ]
}
```

- 기본 `skills`·`claude`에서 superpowers, OMC, ponytail을 뺀다. superpowers·OMC는 `brains`로, ponytail은 `simplicity.ponytail`로 옮긴다(`claude.marketplaces`의 `ponytail`, 최상위 `codex` 포함). 최상위 `omx`는 `brains["oh-my"].omx`로 옮긴다.
- `brains`와 `simplicity` 항목은 같은 모양이다(`description`, `skills`, `claude`, 필요하면 `codex`·`hosts`·`omx`·`global`). 스크립트는 두 카탈로그를 같은 함수로 다룬다.
- mattpocock 필수 세 개는 기본 `skills`에 그대로 둔다(지금 항목 그대로).
- `brains` 키는 3.1의 `superpowers`, `agent-skills`, `pstack`, `gstack`, `oh-my`, `simplicity` 키는 `ponytail`, `caveman`, `karpathy`다. 두뇌 항목은 도구별 지원(`hosts`)을 적어, 지원하지 않는 도구는 기본 AI로 진행한다고 스크립트와 문서가 같은 값을 쓴다.
- `gstack`과 `oh-my`(OMX CLI) 항목의 `global` 배열은 지금 `global` 목록과 같은 모양(`name`, `check`, `install`, `hint`)이다.
- 설치기 `.gitignore` 항목에 `.claude/settings.local.json`을 더한다(D6의 개인 끄기 설정).

### 5.2 선택 저장

- 템플릿 `files/.dev-cycle.json`에 `"brain": "none"`, `"simplicity": "none"`을 더한다. 새 설치는 이 값이 기본이다.
- 추가 스킬과 응답 방식 스킬은 기록하지 않는다(D2). `install.sh`와 `skills:setup`에 준 인자대로 설치하고, 그 뒤에는 설치본이 선택이다. git에 들어가는 `.agents/skills`·`skills-lock.json`이 다른 기기에도 같은 선택을 옮긴다.
- `install.sh <프로젝트> --brain <이름> --simplicity <이름> --matt <스킬>[,…] --optional <묶음>[,…]`은 `.dev-cycle.json`에 두 선택값을 쓰고 같은 인자로 `skills-setup.mjs`를 부른다. `--skip-skills`와 함께 쓰면 두 값만 기록하고, 나중에 `pnpm skills:setup`이 그것을 설치한다(추가 스킬·응답 방식 스킬은 그때 인자로 다시 준다).
- 키가 없는 기존 설치본은 둘 다 `none`으로 읽는다. 그 프로젝트에 superpowers·OMC·ponytail이 남아 있으면 D4에 따라 `skills:check`가 충돌로 알리고 `pnpm skills:setup --brain <이름|none> --simplicity <이름|none>`을 안내한다(7절).

### 5.3 `scripts/skills-setup.mjs`

두 템플릿에서 바이트가 같은 공유 파일이다.

| 동작 | 내용 |
|---|---|
| 인자 | `--brain <이름\|none>`, `--simplicity <이름\|none>`, `--matt <스킬>[,<스킬>]`(`mattpocock.pool`에서 고른 것), `--optional <묶음>[,<묶음>]`(지금 인자, `i-have-adhd` 포함). 모르는 이름·묶음, `pool`에 없는 스킬은 고를 수 있는 목록과 함께 exit 2(제외 이유는 `brains/README.md`를 보라고 알린다) |
| 설치 대상 | 기본 `skills` + 이번에 고른 `optional` 묶음 + `--matt` 스킬 + 선택한 두뇌·과설계 방지 스킬의 `skills`. Claude 플러그인은 기본 + 선택한 두 항목의 `claude`. Codex 네이티브 플러그인은 선택한 항목의 `codex`를 `--with-global`일 때만(지금 ponytail 규칙). Codex 상태 줄도 그 항목이 있을 때만 낸다. OMX 프로젝트 설정은 두뇌가 `oh-my`일 때만 |
| 선택 묶음 상태 | 지금처럼 묶음마다 `있음`·`일부`·`설치 안 함`을 보여 준다. 없어도 누락으로 세지 않는다 |
| 추가 스킬 상태 | `.agents/skills`에 있는 `pool` 스킬을 설치된 추가 스킬로 본다. 줄: `mattpocock 추가: tdd, prototype` 또는 `mattpocock 추가: 없음`. 겹침은 판정하지 않는다(D8) |
| 두뇌의 전역 항목 | 선택한 두뇌의 `global`(gstack, OMX CLI)은 `--brain`을 명시했거나 `--with-global`일 때만 설치한다. 그 밖에는 `없음 → <설치 명령>`만 출력한다. `--check`는 두뇌 전역 항목이 없으면 누락으로 세되, 그 도구가 이 기기에 없으면 세지 않는다(예: `codex`가 없는 기기는 OMX CLI를 세지 않는다. 지금 OMX 규칙과 같다) |
| 고른 플러그인 켜기 | 선택한 두 항목의 플러그인은 `enabledPlugins`에 `true`를 명시한다(전에 `false`로 꺼 둔 이력이 있어도 다시 켠다). 그 플러그인·스킬을 끄려고 D6가 `.claude/settings.local.json`에 써 둔 항목(`enabledPlugins` false, gstack `skillOverrides` off)도 지운다. local이 project보다 우선이라 남겨 두면 고른 것이 꺼진 채로 남는다. 그 밖의 플러그인은 지금처럼 사용자가 `false`로 끈 값을 보존한다 |
| 정리(`--brain`·`--simplicity`를 줄 때마다, 그 항목만) | D4 감지로 찾은, 그 항목에서 고르지 않은 프로젝트 설치본을 모두 지운다(기록값과 같아도, D3): Claude `claude plugin uninstall <p> --scope project` 뒤 `enabledPlugins[p] = false`, 스킬 `npx skills remove --skill <이름들> -y`(`skills-lock.json` 출처가 그 후보인 것만), OMX는 `omx setup`이 쓴 프로젝트 파일(`.codex/skills`·`.codex/prompts`·OMX가 만든 `.codex/agents`·`.omx/`)을 `.omx/setup-scope.json` 기록 기준으로만 지운다(`pnpm agents:sync`가 만든 `prokit-*` 생성물은 남긴다). 정확한 OMX 제거 목록은 구현 때 설치본에서 확인한다. 추가 스킬과 선택 묶음은 지우지 않는다. gstack·OMX CLI 전역 설치본은 지우지 않고 D6로 숨긴다. 지운 목록을 출력한다 |
| 전역 감지 | `~/.claude/settings.json`의 `enabledPlugins`, `~/.claude/skills`에서 gstack을 가리키는 스킬, `~/.codex/skills`·`~/.agents/skills`의 후보 스킬 이름, `~/.claude/CLAUDE.md`의 OMC 블록을 본다. 설치할 때 고르지 않은 Claude user 플러그인(두뇌·과설계 방지 스킬), `claude.conflicts` 플러그인, gstack 개인 스킬은 `.claude/settings.local.json`에 끄는 항목을 더한다(D6, 다른 키 보존). `--check`는 쓰지 않고 감지 결과만 보여 준다. 나머지는 경고 줄만 낸다. 전역 파일은 쓰지 않는다. 시험은 `HOME`을 임시 폴더로 바꿔 한다 |
| `--check` | `두뇌: <이름>(설치됨\|일부\|없음)` 또는 `두뇌: 없음(기본 AI)`, `과설계 방지: <이름>(…)` 또는 `과설계 방지: 없음(기본 AI)`, 추가 스킬 줄, 선택 묶음 줄. 고르지 않은 두뇌나 과설계 방지 스킬이 프로젝트에 있으면 `누락`과 함께 exit 1. 전역 경고는 exit 코드에 넣지 않는다. 파일을 쓰지 않는다 |
| `--update` | `findUpdates`가 선택한 두 항목의 설치된 스킬과 설치된 추가 스킬도 비교한다(설치된 선택 묶음 스킬은 지금도 비교한다). `record`의 아는 스킬 목록에도 더한다 |

### 5.4 `install.mjs`

- `--brain <이름>`, `--simplicity <이름>`, `--matt <목록>`, `--optional <목록>` 값 인자를 받는다. 지금은 `--`로 시작하지 않는 인자를 모두 프로젝트 경로로 보므로 값 인자를 따로 파싱한다.
- 네 인자를 `skills-setup.mjs`에 그대로 넘긴다. `--diff`는 기록할 값과 설치·제거 예정만 보여 준다.
- 끝 안내의 "새 세션" 문구에서 플러그인 목록을 고른 두 항목에 맞게 바꾼다. caveman이나 i-have-adhd를 골랐으면 켜는 명령(`/caveman`, `/i-have-adhd`)을 함께 알린다.

### 5.5 워크플로와 스킬, 에이전트

| 파일(두 템플릿) | 바꿀 내용 |
|---|---|
| `prokit-dev-cycle/references/process-routing.md` | 표를 "단계 / 기본(두뇌 없음) / 산출물"로 다시 쓴다. 기본 칸은 5.6의 내장 절차다. 두뇌를 골랐으면 `references/brains/<이름>.md`가 해당 단계의 방법을 바꾸고, 두뇌가 맡지 않는 단계는 설치된 추가 스킬, 없으면 내장 절차가 맡는다고 적는다. 추가 스킬이 두뇌와 같은 단계를 맡으면 두뇌의 스킬을 먼저 쓴다(D8). 용어·설계 질문은 늘 `grilling`·`domain-modeling`(D7). OMC·OMX 대안 열, gstack 보강 칸, 설치 위치 절의 전역 gstack 문장, 도구별 이름 절의 두뇌 이름 규칙을 brains 파일로 옮긴다. 설치 위치 절(17줄)의 기본 설치 목록에서 superpowers·OMC·ponytail을 빼고 "두뇌·과설계 방지 스킬은 고른 것만"으로, `--with-global`의 네이티브 ponytail 문장은 "ponytail을 골랐으면"으로. 규칙 6은 "간결성(하네스)"과 5.6의 역할 표로 다시 쓴다(D10): 사다리·"만들지 않는 것"·`shortcut:`과 기존 `ponytail:` 주석 보존·공통화 범위·지적 처리는 하네스 쪽, 늘 켜는 모드·계획 기준·구현 diff 보완 검토·공통화 점검·읽기 전용 보조는 고른 스킬 쪽. ponytail 전용 문장(도구별 호출 이름, 일회성 리뷰, `ponytail-audit` 등)은 "ponytail을 골랐을 때" 아래로 모은다. "설치되어 있지 않으면 `blocked`" 문장은 지운다. 고른 스킬의 우선순위(D11)를 한 줄로 더한다 |
| `prokit-dev-cycle/references/brains/README.md` (새로) | 두뇌 카탈로그(무엇을 맡나, 도구별 지원, 프로젝트 설치 내용, 서로 충돌하는 지점), 과설계 방지 스킬 비교(3.2 요약)와 역할 표(5.6), 추가 스킬 표(5.8.2), 응답 방식 스킬, 선택지 설명 문안(5.7), 5.8 추천 기준표, 바꿀 때 인계 규칙. `prokit-init`과 기존 프로젝트 변경이 함께 읽는 정본 |
| `prokit-dev-cycle/references/brains/<이름>.md` (새로) | 두뇌마다 한 파일. 단계별 스킬 이름(Claude·Codex·Antigravity·Grok), 그 두뇌가 맡지 않는 단계(추가 스킬 또는 기본 유지), 금지(배포·커밋·자동 모드 지속), 라운드 끝 정리(모드 취소 등). 과설계 방지 스킬은 역할 표 한 장으로 충분해 파일을 따로 두지 않는다 |
| `prokit-dev-cycle/SKILL.md` | 0절에 두 선택값 확인(`.dev-cycle.json`의 `brain`·`simplicity`)과 설치된 추가 스킬 확인(`pnpm skills:check` 출력) 한 줄. 3절의 "괄호의 스킬" 규칙에 단계 이름 규칙을 더한다. `test-driven-development` 수행자 문구, 5절의 OMC·OMX 모드 취소와 `verification-before-completion`을 두뇌 조건으로 바꾼다. 67~68줄의 ponytail 문장은 "고른 과설계 방지 스킬(없으면 하네스 간결성 규칙)"로 바꾼다 |
| `docs/dev-workflow.md` | 행 문구의 두뇌 스킬 이름을 단계 이름으로 바꾼다. C `systematic-debugging` → 디버깅 단계, D `test-driven-development로` → 테스트 먼저, F `brainstorming`·`/grill-with-docs` → 요구 명확화 단계(용어는 `grilling`·`domain-modeling`), `writing-plans` → 계획 단계, `subagent-driven-development + test-driven-development` → 구현 단계(`prokit-implementer` 위임, 테스트 먼저), 계획 리뷰의 gstack 보강 → 선택한 두뇌의 계획 리뷰 보강. `ponytail 사다리` → 간결성 사다리, `ponytail 모드` → 간결성 규칙(고른 과설계 방지 스킬), `ponytail-review` → 간결성 검토(고른 스킬의 검토, 없으면 `prokit-reviewer(code)` focus). 62·65·66·69·72행이 대상이다(72행 "같은 Ponytail 검토를 중복 호출하지 않으며" 포함) |
| `prokit-dev-cycle/references/delegation.md`, `reuse-design.md` | SDD·gstack 예시를 두뇌 중립 표현으로 바꾼다. `reuse-design.md` 40·46·48줄의 `ponytail`·`ponytail-review`·`brainstorming`·`writing-plans`를 간결성 사다리·요구와 계획 단계·"고른 과설계 방지 스킬의 검토"로 |
| `prokit-verify/SKILL.md`, `references/evidence.md`, `references/browser.md` | 증거 예시(`writing-plans → docs/superpowers/plans/…`, `대안: OMC plan`)를 기본 AI 예시와 두뇌 예시로 바꾼다. `verification-before-completion` 문장을 두뇌 조건으로 |
| `prokit-skills-update/SKILL.md` | 79줄의 플러그인 목록(superpowers, skill-creator, oh-my-claudecode, ponytail)을 "skill-creator와 고른 두뇌·과설계 방지 스킬의 플러그인"으로, 마켓플레이스 위치(`claude.marketplaces`)를 "기본·`brains.<이름>.claude`·`simplicity.<이름>.claude`"로, gstack 업그레이드 문장을 두뇌 파일로, Codex 네이티브 ponytail 문장을 "ponytail을 골랐으면"으로. 업데이트 범위는 지금처럼 이미 설치된 스킬이다(새 스킬 추가는 범위 밖) |
| `prokit-deploy/SKILL.md` | gstack `ship` 금지는 "두뇌가 gstack이어도"로 유지 |
| `.claude/agents/prokit-implementer.md` | "`test-driven-development`대로" → "테스트를 먼저 쓰고 실패를 확인한 뒤 구현한다. 선택한 두뇌나 추가 스킬에 TDD 스킬(`tdd` 등)이 있으면 그 절차를 따른다". ponytail 문구는 "고른 과설계 방지 스킬(없으면 하네스 간결성 규칙)"으로 |
| `.claude/agents/prokit-reviewer.md` | plan이 읽는 것: `ponytail` → 5.6 역할 표의 계획 기준(고른 스킬, 없으면 하네스 사다리). code는 고른 스킬에 diff 검토가 없으면(karpathy, none) 간결성(delete·reuse·stdlib·yagni, karpathy면 그 단순함·정밀 수정 원칙)을 focus에 넣는다 |
| `CLAUDE.md` | superpowers 접두어 줄을 "선택한 두뇌의 호출 이름은 `references/brains/<이름>.md`"로. 플러그인 스킬 예시에서 superpowers 제거. ponytail 줄은 "ponytail을 골랐으면"으로. caveman 응답 압축·i-have-adhd는 대화 응답에만 쓴다는 한 줄(D11) |
| `AGENTS.md` | "두뇌와 선택 스킬" 절을 더한다(5.6 끝의 문안). 에이전트 절의 플러그인 문장 갱신 |
| `.vercelignore`, `export-html.mjs`, `.gitignore` 항목 | `.omc`·`.omx` 제외는 남긴다(두뇌를 골랐을 때 생긴다) |
| `scripts/dev-cycle.mjs`, `delegation.mjs` | 바꾸지 않는다. 후보 이름을 하드코딩하지 않는다(audit은 지금도 `ponytail-review` 문구를 검사하지 않는다) |
| evals(`prokit-dev-cycle`, `prokit-skills-update`) | brainstorming·systematic-debugging 기대를 "선택한 두뇌의 스킬, 추가 스킬 또는 내장 절차"로 바꾼다. `prokit-dev-cycle`의 위임·ponytail 시나리오 38개는 `simplicity: ponytail`을 전제로 적는다. 과설계 방지 스킬이 `none`인 프로젝트에서 리뷰 행을 `blocked`로 두지 않고 `prokit-reviewer(code)` 간결성 focus로 채우는 시나리오와, `caveman`일 때 F 공통화 행을 `safe-refactor`로 점검하는 시나리오를 더한다(40개) |
| tests | `skills-setup.test.mjs`: 카탈로그 모양(`brains`, `simplicity`, `mattpocock.pool`, `optional["i-have-adhd"]`), 두 항목의 설치·정리(키 없는 기존 프로젝트, 같은 값 재지정, 출처 기준 판정, 한 항목만 정리)·충돌·전역 감지·local 끄기 항목 해제, `--matt` 설치와 모르는 스킬 거부, `simplicity: ponytail`의 `--with-global` 네이티브 플러그인, ponytail이 기본 설치에서 빠짐. 74줄과 360~455줄의 최상위 `codex` 픽스처를 `simplicity.ponytail.codex`로 옮긴다. `install.test.mjs`: 네 인자의 파싱과 전달, OMX CLI 전역 안내 제거. `template-docs.test.mjs`: 라우팅·행 문구 정규식, 154~178줄과 193줄의 ponytail 검사를 역할 표 기준으로. `skills.test.mjs`: 평가 개수 40과 106줄의 위험도 high ID 목록(새 시나리오의 위험도에 따라) |

### 5.6 기본 AI의 내장 절차와 과설계 방지 역할

`process-routing.md`의 기본 칸이다. 두뇌를 골라도 그 두뇌가 맡지 않는 단계는 이 절차를 쓴다. 설치된 추가 스킬이 있으면 해당 단계의 방법으로 쓴다(괄호).

| 단계 | 기본 AI가 하는 일 | 산출물 |
|---|---|---|
| 요구 명확화 | 요청을 한 문장으로 다시 쓰고 결과를 바꾸는 모호함만 묻는다(Claude Code는 AskUserQuestion으로 한 번에 1~4개, 다른 도구는 대화). 묻는 형식은 `grilling`의 묶음별 질문과 추천 답이다. 간결성 사다리로 범위를 줄이고 새 용어는 `domain-modeling` 형식으로 `GLOSSARY.md`에 적는다. 사용자는 `/grill-with-docs`로 직접 시작할 수 있다 | `docs/specs/YYYY-MM-DD-<주제>.md`: 목표, 만들지 않는 것, 인수 조건, 테스트 시나리오 |
| 계획 | 파일별 단계, 위임 단위(파일이 겹치지 않게), 단계별 검사를 쓴다. Claude Code는 plan mode를 쓸 수 있다(설계 판단: `codebase-design`, 시안: `prototype`, 외부 조사: `research`) | `docs/plans/YYYY-MM-DD-<주제>.md`, `prokit-reviewer(plan)` |
| 구현 | 네이티브 서브에이전트 `prokit-implementer`에 대조표 행 단위로 위임한다. 테스트가 있으면 먼저 쓰고 실패를 확인한 뒤 구현한다(`tdd`). Main은 직접 구현하지 않는다(지금 규칙) | 위임 packet, snapshot diff |
| 디버깅 | 재현(실패하는 테스트나 브라우저 재현) → 가설을 하나씩 확인 → 근본 원인 수정 → 회귀 테스트. 같은 가설로 세 번 실패하면 멈추고 보고한다(`diagnosing-bugs`) | 재현 테스트 이름, 원인 한 줄 |
| 리뷰 | `prokit-reviewer` 게이트(지금 규칙) + 아래 역할 표의 구현 diff 보완 검토 | 리뷰 행 증거 |
| QA | ego-browser, 없으면 agent-browser(지금 규칙) | 시나리오별 결과 |
| 검증·마무리 | `prokit-verify`, `pnpm dev-cycle audit`, `[confirm]`, 5절 종료(지금 규칙) | audit 출력 |

증거 칸에는 `사용: 내장(요구 명확화) → docs/specs/…`, `사용: tdd(추가 스킬) → …`처럼 적는다.

과설계 방지 역할 표(규칙 6의 새 본문). 지금 ponytail이 맡는 역할을 고른 스킬이 대신한다. 첫 줄의 하네스 규칙은 무엇을 골라도 지킨다.

| 역할 | ponytail | caveman | karpathy | SKIP(기본 AI) |
|---|---|---|---|---|
| 늘 지키는 간결성(사다리, "만들지 않는 것", `shortcut:` 주석, 공통화 범위, 지적 처리) | 하네스 규칙 + ponytail 모드(플러그인 훅으로 늘 켜짐) | 하네스 규칙 + 일에 맞는 작업 스킬(새 기능 `lean-build`, 버그·작은 변경 `surgical-patch`) | 하네스 규칙 + `karpathy-guidelines`(코드 작업 때 모델이 부른다) | 하네스 규칙 |
| 계획 간결성 기준(`prokit-reviewer(plan)`이 읽는다) | `ponytail` | `lean-build` | `karpathy-guidelines` | 하네스 사다리 |
| 구현 diff 보완 검토(`prokit-reviewer(code)` 게이트는 따로 늘 한다) | `ponytail-review` | `caveman-review`(지적은 `lean-build`·`surgical-patch` 기준으로) | `prokit-reviewer(code)` focus에 karpathy 단순함·정밀 수정 원칙 | `prokit-reviewer(code)` focus에 간결성(delete·reuse·stdlib·yagni) |
| F 공통화·리팩토링 행 | `ponytail-review`(이번 diff와 공통 모듈 소비자) | `safe-refactor` | `prokit-reviewer(code)` + karpathy 정밀 수정 원칙 | 하네스 공통화 범위 + `prokit-reviewer(code)` |
| 읽기 전용 보조(요청할 때만) | `ponytail-audit`·`ponytail-debt`·`ponytail-help`·`ponytail-gain` | 없음 | 없음 | 없음 |

- 리뷰 행 증거 예: `ponytail-review: 반영 2, 기각 1`, `caveman-review: 반영 1`, `간결성(karpathy 기준, prokit-reviewer focus): 반영 1`, `간결성(내장, prokit-reviewer focus): 지적 없음`.
- 보완 검토의 지적 처리(정확성·보안은 실패 테스트 먼저, 기존 문제는 백로그, 속도는 측정 근거가 있을 때만, 간결성은 이번 diff 안에서 동작이 같을 때만)는 규칙 6의 하네스 쪽 그대로다.

템플릿 `AGENTS.md`에 넣을 문안:

> ## 두뇌와 선택 스킬
> 이 프로젝트의 두뇌(요구 정리, 계획, 구현 진행, 디버깅을 주도하는 스킬 묶음)는 `.dev-cycle.json`의 `brain`, 과설계 방지 스킬은 `simplicity`다. 둘 다 `none`이면 지금 세션의 에이전트가 `prokit-dev-cycle`의 내장 절차와 간결성 규칙으로 그 역할을 맡는다. 다른 값이면 `.agents/skills/prokit-dev-cycle/references/brains/`의 해당 파일과 역할 표를 따른다. 각 항목은 하나만 쓴다. 전역 설치나 플러그인으로 고르지 않은 스킬(superpowers, OMC, OMX, gstack, ponytail, caveman, karpathy-guidelines 등)이 보이거나 세션 시작 훅이 그 스킬을 먼저 쓰라고 해도 고르지 않는다. 용어와 설계 결정은 두뇌와 상관없이 `grilling` 형식으로 묻고 `domain-modeling`으로 기록한다. 설치된 mattpocock 추가 스킬과 i-have-adhd는 `pnpm skills:check`에 보인다. 고른 스킬의 규칙이 이 파일, `prokit-*`, 대조표, 보고 형식과 부딪히면 뒤의 것이 우선하고, caveman 응답 압축과 i-have-adhd는 대화 응답에만 쓴다. 바꾸는 일은 H 라운드에서 `pnpm skills:setup --brain <이름|none>`, `--simplicity <이름|none>`, `--matt <스킬>`, `--optional <묶음>`으로 한다.

### 5.7 `prokit-init` 스킬

```
.agents/skills/prokit-init/
├── SKILL.md               선택값, 묻는 법, 기본값, 추천 순서, 실행 순서, 보고
└── evals/evals.json       skill-creator 평가(아래)
(카탈로그·선택지 설명·추천 기준표는 templates/<템플릿>/files/.agents/skills/prokit-dev-cycle/references/brains/README.md를 읽는다. D15)
.claude/skills/prokit-init → ../../.agents/skills/prokit-init
```

- 트리거: "템플릿으로 프로젝트 만들어줘", "프로킷 초기 셋팅", "새 프로젝트 시작", "pro-kit 받고 AGENTS.md대로", "두뇌 스킬 골라서 프로젝트 만들어줘". 이미 만든 프로젝트의 기능 개발에는 쓰지 않는다.
- 받는 값과 기본값:

| 값 | 기본 | 묻는 조건 |
|---|---|---|
| 템플릿 | 없음(묻는다). 화면만 요청이면 `prokit-next-neon` | 요청에 DB가 드러나지 않을 때(지금 규칙) |
| 프로젝트 이름 | 없음(묻는다). 요청의 폴더 이름이 있으면 그것 | 없을 때 |
| 위치 | `../<이름>` | 함께 묻는다(지금 규칙) |
| PRD·스펙 | 없음 | 묻지 않는다. 요청 본문, 요청에 적힌 파일 경로, 작업 폴더 흐름의 첫 요청을 쓴다 |
| 두뇌 | `none` | 아래 "스킬 구성" 질문에서 |
| mattpocock 추가 스킬 | 설치 안 함 | 아래 "스킬 구성" 질문에서 |
| 과설계 방지 스킬 | `none` | 아래 "스킬 구성" 질문에서. 첫 선택지는 ponytail(추천) |
| 응답 방식(i-have-adhd) | 설치 안 함 | 아래 "스킬 구성" 질문에서 |
| 전역 도구(`--with-global`) | 안 함 | 요청할 때만(지금 규칙) |
| 선택 스킬 묶음(ops, motion, mobile) | 안 함 | 요청할 때만. 보고에 설치법을 적는다 |

- 스킬 구성을 묻는 조건은 아래 순서로 정한다.
  1. 요청이 스킬 구성을 하나라도 정했으면(예: "두뇌는 superpowers", "caveman으로") 묻지 않는다. 정한 것만 설치하고 나머지는 설치하지 않으며, 추천은 보고에 적는다.
  2. 요청이 "알아서 골라줘"처럼 맡겼으면 묻지 않고 추천대로 한다(D16).
  3. 템플릿·이름·위치처럼 어차피 물을 것이 있거나, "프로킷 초기 셋팅"·"스킬 골라서"처럼 초기 설정이나 선택 자체를 요청했으면 묻는다.
  4. 그 밖에(따로 물을 것이 없는 요청, 화면만 요청) 묻지 않고 아무것도 설치하지 않는다. 보고에 추천과 설치 명령을 적는다.
- 묻는 법(Claude Code): AskUserQuestion은 한 번에 질문 4개, 질문마다 선택지 4개까지다. 선택지마다 아래 "선택지 설명"의 한 줄을 `description`에 넣어 사용자가 보고 고를 수 있게 한다.
  1. 프로젝트 기본(필요할 때만): 템플릿·이름·위치를 한 번에 묻는다(루트 `CLAUDE.md`의 "한 번에 묻는다").
  2. 스킬 구성: PRD를 읽고 5.8로 추천을 만든 뒤 네 질문을 한 번에 묻는다. 질문 본문 첫 줄에 추천 근거를 한 줄로 적는다.

     | 질문(머리글) | 선택 | 선택지(순서대로) |
     |---|---|---|
     | 두뇌 | 하나 | `<추천> (추천)`, `없음(기본 AI)`, `다른 두뇌 보기`. 추천이 `none`이면 `없음(기본 AI) (추천)`, `다른 두뇌 보기` |
     | matt 추가 | 하나 | `추천 설치: <스킬들> (추천)`, `SKIP`, `목록에서 고르기`. 신호가 맞는 스킬이 없으면 `SKIP (추천)`, `목록에서 고르기` |
     | 과설계 방지 | 하나 | `ponytail (추천)`, `caveman`, `andrej-karpathy-skills`, `SKIP(기본 AI)` |
     | 응답 방식 | 하나 | `SKIP (추천)`, `i-have-adhd`. 5.8.3 신호가 있으면 `i-have-adhd (추천)`이 먼저 |

  3. 두뇌 이어 묻기(`다른 두뇌 보기`를 골랐을 때만): 나머지 두뇌를 한 질문으로 묻는다. 새 프로젝트는 pstack을 빼므로 superpowers, agent-skills, gstack, oh-my 네 개다.
  4. 추가 스킬 이어 묻기(`목록에서 고르기`를 골랐을 때만, 최종 두뇌가 정해진 뒤): 최종 두뇌와 겹치지 않는 추가 스킬을 네 묶음의 여러 선택 질문으로 한 번에 묻는다. 묶음마다 4개 이하다.

     | 머리글 | 스킬 |
     |---|---|
     | 구현·설계 | `tdd`, `codebase-design`, `prototype`, `improve-codebase-architecture` |
     | 디버깅·검토 | `diagnosing-bugs`, `code-review`, `pr`, `writing-for-agents` |
     | 조사·외부 설정 | `research`, `wizard`, `to-questionnaire` |
     | 인계·학습 | `handoff`, `teach`, `wait-what` |

     겹쳐서 빠진 스킬은 그 질문에서 뺀다. 남은 스킬이 하나면 그 묶음 질문에 `SKIP` 선택지를 더하고, 남은 것이 없으면 그 질문을 뺀다.
  - 최종 두뇌가 추천 두뇌와 다르고 추가 스킬로 `추천 설치`를 골랐으면, 추가 스킬 추천을 최종 두뇌 기준으로 다시 만든다. 새로 겹치는 스킬은 빼고, 추천 두뇌와 겹쳐서만 빠졌던 스킬은 신호가 맞으면 넣는다. 처음 추천과 달라진 점을 보고에 적는다.
  - 다른 도구는 같은 순서로 대화로 묻고, 선택지 설명도 함께 보여 준다.
- 선택지 설명(정본은 `brains/README.md`. 2026-10-20 기준, 활동 문구는 확인할 때마다 고친다):

  | 선택지 | 설명(한 줄) |
  |---|---|
  | 두뇌 `없음(기본 AI)` | 지금 에이전트가 프로킷 내장 절차로 진행해요. 충돌이 없고 가장 가벼워요 |
  | `superpowers` | 설계 합의 → 계획 → 테스트 먼저 → 작업별 리뷰를 강하게 거는 규율형이에요 |
  | `agent-skills` | 스펙부터 출시까지 보안·성능·접근성 기준을 단계별 명령으로 걸어요 |
  | `gstack` | 무엇을 만들지 검토하는 제품 판단, 디자인, 실사용 QA가 강해요. 전역 설치(Bun)가 필요해요 |
  | `oh-my` | 여러 세션에 걸친 큰 작업을 자동·병렬 모드로 돌려요(Claude는 OMC, Codex는 OMX). Codex는 전역 CLI가 필요해요 |
  | `pstack` | 기존 코드 구조를 분석하고 설계 대안을 비교해요. Claude Code만 지원해요 |
  | `ponytail` | 늘 켜지는 미니멀 모드로 가장 작게 만들고, 구현 diff를 `ponytail-review`로 점검해요. 가장 활발히 갱신 중이에요 |
  | `caveman` | 작업별 간결 패턴(새 기능, 버그, 리팩터)과 한 줄 리뷰를 쓰고, `/caveman`으로 답변 토큰도 줄여요. 활발히 갱신 중이에요. 압축 규칙은 영어 기준이에요 |
  | `andrej-karpathy-skills` | 카파시의 네 원칙(코딩 전 생각, 단순함, 정밀 수정, 검증 목표) 지침 하나예요. 가장 유명하지만 최근 갱신은 적어요 |
  | 과설계 방지 `SKIP(기본 AI)` | 따로 설치하지 않고 프로킷 내장 간결성 규칙(재사용 순서, "만들지 않는 것")으로 진행해요 |
  | `i-have-adhd` | 다음 행동 먼저, 번호 단계, 다음 할 일 하나로 짧게 답해요. `/i-have-adhd`로 켜요. 스킬은 영어로 쓰여 있어요 |
  | 응답 방식 `SKIP` | 지금 답변 방식을 그대로 써요 |
  | 추가 스킬 각각 | 5.8.2 표의 "프로킷에서 맡는 곳"을 한 줄로 줄인 문장(예: `tdd` 테스트를 먼저 쓰고 구현해요, `research` 외부 API·규정 조사를 문서로 남겨요) |

- 실행: 루트 `AGENTS.md` "템플릿으로 새 프로젝트 만들기" 1~10을 그대로 하되 5번 설치에 `--brain <값> --simplicity <값>`과 고른 `--matt`·`--optional`을 붙인다. 설치 전에 전역 두뇌·과설계 방지 스킬을 감지해 보고 목록을 만든다(지우지 않는다).
- 보고에 더할 것: 고른 두뇌·과설계 방지 스킬·추가 스킬·응답 방식과 이 프로젝트에 설치된 것, 끈 전역 플러그인, 남은 전역 경고, caveman이나 i-have-adhd를 골랐으면 켜는 명령과 대화 응답에만 쓴다는 점, 건너뛴 추천과 나중에 설치하는 명령(그 프로젝트 H 라운드에서 `pnpm skills:setup`의 해당 인자).
- 평가(skill-creator): 실제 프로젝트를 만들지 않는 읽기 전용 계획 평가로 한다. 기준선은 스킬 없는 실행이다. 프롬프트 예:
  1. "템플릿으로 todo 앱 만들어줘". DB가 정해지지 않았으니 프로젝트 기본과 스킬 구성을 두 번에 나눠 묻는다. 두뇌 추천은 none, 과설계 방지 첫 선택지는 ponytail이고 선택지마다 설명이 붙는다.
  2. "supabase 템플릿으로 ../shop 만들고 두뇌는 superpowers". 질문 없이 `--brain superpowers --simplicity none`으로 간다. 추가·응답 방식 스킬은 설치하지 않고 보고에 추천(ponytail 포함)을 적는다.
  3. "화면만 만들 거야. [living] 폴더로". 질문 없이 아무것도 설치하지 않는다.
  4. 보안·성능·관측성 요구가 긴 운영 서비스 PRD 파일을 주고 "두뇌랑 스킬은 알아서 골라줘".
     - 두뇌는 agent-skills를 추천하고 근거를 댄다.
     - 추가 스킬은 agent-skills와 겹치는 `tdd`·`diagnosing-bugs`·`code-review`를 빼고 고른다.
     - 과설계 방지는 ponytail, 응답 방식은 설치하지 않는다. 이 값들을 설치 명령에 반영한다.
  5. 용어가 흐리고 외부 결제 API·OAuth 설정이 많은 PRD에 "matt 스킬도 골라줘".
     - 두뇌는 none이다.
     - 추가 스킬은 신호에 맞춰 `research`·`wizard`·`tdd` 등을 근거와 함께 고르고, 제외 스킬은 이유를 밝혀 뺀다.
     - 고른 스킬을 `--matt`에 반영한다.
  6. 전역에 superpowers와 ponytail user 플러그인이 있는 상태에서 "neon으로 ../notes 만들고 caveman으로" 요청한다. superpowers와 ponytail을 local 설정으로 끄는 동작과 보고를 본다.
  7. "neon 템플릿으로 ../memo 만들고, 과설계 방지는 karpathy, adhd도 넣어줘". 질문 없이 `--simplicity karpathy --optional i-have-adhd`로 간다. 두뇌는 none, 추가 스킬은 설치하지 않는다. karpathy는 diff 검토 스킬이 없어 리뷰어 focus가 맡는다는 점과 i-have-adhd를 켜는 명령을 안내한다.

### 5.8 PRD·스펙 기반 추천

입력은 있는 것만 쓴다: 사용자 요청 본문, `docs/first-request.md`(작업 폴더에서 시작한 흐름), 사용자가 준 PRD·스펙 파일, 기존 프로젝트면 `docs/domain/project.md`·`docs/specs/`·`GLOSSARY.md`. 두뇌 판단 기준은 "이 프로젝트에서 하네스가 이미 맡지 않는 가장 큰 부족함 하나"다. 하네스가 맡는 것(행별 테스트, `prokit-reviewer` 게이트, QA 행, `prokit-deploy` 배포, `GLOSSARY.md`·ADR과 용어·설계 질문, 간결성 규칙)은 추천 근거로 세지 않는다.

| PRD·스펙에서 보이는 신호 | 가장 큰 부족함 | 두뇌 추천 |
|---|---|---|
| 요구가 짧고 분명함, 화면만·프로토타입·튜토리얼·완성팩 적용, 계층 한두 개 | 없음. 하네스로 충분 | `none` |
| 핵심 개념·규칙·용어가 흐리고 사람이 정할 질문이 많음. 개발자가 진행 주도권을 쥐고 기법만 보강하고 싶음 | 요구 불명확. 하네스의 `grilling`·`domain-modeling`이 맡는다 | `none` + 추가 스킬(5.8.2) |
| 정확성·데이터 무결성이 중요한 기능이 많고, 설계 합의·테스트 먼저·작업별 리뷰 습관을 강하게 걸고 싶음 | 개발 규율 | superpowers |
| 운영할 제품이고 보안·성능·접근성·관측성 기준과 출시 후 점검이 요구됨. 팀이 같은 완료 기준을 써야 함 | 품질·출시 기준 | agent-skills(addyosmani) |
| 무엇을 만들지(사용자 문제, 가치, 범위)부터 검토해야 하고 디자인·실사용 QA가 핵심 | 제품 판단·사용 경험 | gstack |
| 가져온 기존 코드가 크거나 복잡하고, 구조 이해와 설계 대안 비교가 먼저임 | 구조 불확실 | pstack |
| 여러 세션에 걸친 큰 범위, 병렬 작업자, 장기 목표와 상태 추적 | 장기 실행 관리 | oh-my(Claude Code는 OMC, Codex는 OMX) |

- 신호가 약하거나 두 줄 이상이 비슷하게 맞으면 `none`을 추천한다.
- 지금 쓰는 도구가 그 두뇌를 지원하지 않으면 추천하지 않는다(3.1 지원 표). 같은 프로젝트를 여러 도구로 쓰면, 두뇌를 지원하지 않는 도구는 기본 절차로 진행한다.
- 새 Better-T-Stack 프로젝트에는 기존 코드가 없으므로 pstack은 처음에는 추천하지 않고, 레거시를 들여오거나 큰 구조 변경이 생겼을 때 기존 프로젝트의 두뇌 변경으로 다룬다.
- 추천 결과는 두뇌 이름, 근거로 삼은 PRD 문장이나 신호 한두 개, 이번 프로젝트에서 그 두뇌가 맡을 단계, 하네스가 계속 맡는 것을 한 덩어리로 보여 준다.
- 기존 프로젝트: 사용자가 "두뇌 추천해줘", "두뇌 바꿔줘", "matt 스킬 더 필요한지 봐줘", "ponytail 대신 caveman 쓸래"라고 하면 그 프로젝트 세션이 같은 기준표로 추천하고, 고르면 H 라운드에서 `pnpm skills:setup`의 해당 인자로 바꾼다. 라운드 중간에는 바꾸지 않는다.
- 두뇌를 바꿀 때는 이전 두뇌가 만든 산출물(확정한 요구, 설계, 계획 경로, 남은 일)을 대조표 메모와 `tasks/todo.md`로 넘겨 새 두뇌가 인터뷰·계획을 처음부터 반복하지 않게 한다.

#### 5.8.1 추천 순서

1. 위 표로 두뇌 하나를 고른다.
2. 5.8.2 표의 추가 스킬 신호를 PRD에 하나씩 대 보고 맞는 것을 모두 고른다. 고른 두뇌가 같은 단계를 맡는 스킬("겹치는 두뇌" 열)은 뺀다. 맞는 것이 없으면 SKIP을 추천한다.
3. 5.8.3 표로 과설계 방지 스킬과 응답 방식을 고른다.
4. 추천을 "두뇌 + 과설계 방지 스킬 + 추가 스킬(스킬마다 근거 신호 한 줄) + 응답 방식 + 설치하지 않는 스킬과 이유"로 보여 준다. 사용자가 받아들이거나 맡기면 `--brain <이름> --simplicity <이름> --matt <목록> --optional <목록>`으로 설치한다. 사용자가 빼거나 더하면 그대로 따른다. 두뇌와 겹치는 추가 스킬을 더하면 겹친다는 점과 라우팅은 두뇌의 스킬을 먼저 쓴다는 점을 알리고 설치한다. 제외 스킬을 원하면 이유를 알리고, 그래도 원하면 H 라운드에서 매니페스트 `pool`과 이 표를 고친 뒤 설치한다(사용자 명시 출처 규칙).

#### 5.8.2 mattpocock 스킬 배치

2026-10-20 원본 `plugin.json`(1.3.1)과 각 `SKILL.md` 앞부분을 읽어 정했다. "사용자"는 `disable-model-invocation: true`라 모델이 스스로 부르지 않는 스킬이다. 프로킷은 이런 스킬을 에이전트가 Read로 읽어 대신 실행하지 않고, 해당 단계에서 사용자에게 명령(예: `/grill-with-docs`)을 제안한다. 사용자가 요청하면 그 흐름을 따른다. "겹치는 두뇌"는 그 두뇌가 같은 단계를 자기 스킬로 맡는다는 뜻이다. 추천에서 빼는 데만 쓰고 설치를 막지 않는다(D8). 이 열은 구현 0단계에서 각 두뇌의 실제 스킬 목록으로 확정한다.

| 스킬 | 호출 | 구분 | 프로킷에서 맡는 곳 | 추가 신호(PRD·요청에서) 또는 제외 이유 | 겹치는 두뇌 |
|---|---|---|---|---|---|
| `domain-modeling` | 모델 | 필수 | `GLOSSARY.md`·ADR 형식, 새 용어와 설계 결정 기록 | | |
| `grilling` | 모델 | 필수 | 용어·도메인 규칙·설계 결정 질문(묶음별 질문과 추천 답). 두뇌가 없으면 요구 명확화 인터뷰도 맡는다 | | |
| `grill-with-docs` | 사용자 | 필수 | 사용자가 `/grill-with-docs`로 인터뷰하며 `GLOSSARY.md`·ADR을 함께 기록 | | |
| `tdd` | 모델 | 추가 | 구현 단계의 테스트 먼저(`prokit-implementer`가 읽는다), C의 재현 테스트 | 계산·상태 전이·권한·금액처럼 규칙 로직이 많음 | superpowers, agent-skills, oh-my |
| `diagnosing-bugs` | 모델 | 추가 | 디버깅 단계(C 케이스, 성능 퇴행) | 외부 연동이 많거나 가져온 코드가 있어 원인 찾기 어려운 버그가 예상됨, 성능 목표가 있음 | superpowers, agent-skills, gstack, oh-my |
| `codebase-design` | 모델 | 추가 | `[design]` 행과 F 공통화 행의 모듈 경계·인터페이스 판단 | 패키지·모듈이 여럿이고 공용 API·공통 모듈 설계가 범위에 있음 | agent-skills, pstack |
| `prototype` | 모델 | 추가 | B·F에서 버리는 시안으로 상태 모델·화면을 먼저 확인 | 화면·상호작용·상태 흐름이 새롭거나 PRD가 "느낌을 보고 정하자"는 수준 | |
| `research` | 모델 | 추가 | 외부 API·SDK·규정 조사 결과를 저장소 Markdown으로 | 외부 서비스·결제·지도·AI API 연동, 낯선 도메인 규칙이나 법규 | oh-my |
| `improve-codebase-architecture` | 사용자 | 추가 | 구조 개선 후보 보고서. F 공통화 행에서 제안 | 가져온 기존 코드가 있거나 대규모 리팩터가 범위에 있음(새 프로젝트는 보통 해당 없음) | pstack |
| `wizard` | 모델 | 추가 | 사람이 해야 하는 외부 설정 단계 안내 스크립트. 배포 자체는 `prokit-deploy`가 맡는다 | OAuth 앱 등록, 결제 키, DNS, 외부 대시보드 설정이 여러 개 | |
| `to-questionnaire` | 사용자 | 추가 | 결정권자가 따로 있는 질문을 질문지로 만들어 보낸다 | 고객·기획자·법무 등 사용자 밖의 결정권자가 PRD에 있음 | |
| `handoff` | 사용자 | 추가 | 세션이나 두뇌를 넘길 때 인계 문서 | 여러 세션에 걸친 큰 범위, 여러 사람이 이어 받음 | |
| `teach` | 사용자 | 추가 | 사용자가 배우면서 만드는 흐름 | 학습 목적, 입문자, 튜토리얼 | |
| `wait-what` | 사용자 | 추가 | 설명이 와닿지 않을 때 다시 설명 요청 | `teach`와 같은 신호 | |
| `writing-for-agents` | 모델 | 추가 | 프로젝트 전용 스킬·`AGENTS.md`를 고치는 H 라운드 | 프로젝트 전용 스킬·에이전트 규칙을 만들 계획이 PRD에 있음 | superpowers |
| `code-review` | 모델 | 추가 | 스펙 대비 추가 관점만. `prokit-reviewer` 게이트를 대신하지 않는다 | 인수 조건이 길고 엄격해 스펙 축 검토를 따로 받고 싶음 | superpowers, agent-skills, gstack, oh-my |
| `pr` | 모델 | 추가 | PR 본문 작성. 프로킷 기본 마무리는 기본 브랜치 커밋·push다 | 팀이 PR로 병합하는 흐름이 PRD에 있음 | |
| `grill-me` | 사용자 | 제외 | | `grilling`을 부르는 한 줄짜리 명령이다. `grilling`이 "grill" 요청 문구로 바로 불린다 | |
| `to-spec`, `to-tickets`, `wayfinder`, `triage`, `setup-matt-pocock-skills` | 사용자 | 제외 | | 이슈 트래커에 스펙·티켓을 게시하고 저장소 설정(`docs/agents/`)을 만든다. 프로킷은 스펙·계획을 `docs/specs`·`docs/plans`에, 진행을 `tasks/todo.md` 대조표에 둔다 | |
| `implement`, `implement-spec` | 사용자 | 제외 | | 자체 구현 루프(작업별 worktree 병렬). 프로킷 구현은 대조표 행 단위 `prokit-implementer` 위임과 snapshot 대조다 | |
| `retro` | 사용자 | 제외 | | 회고 기록이 `tasks/lessons.md`와 겹친다 | |
| `ask-matt` | 사용자 | 제외 | | matt 스킬 전체 라우터라 설치하지 않은 스킬과 제외한 흐름으로 안내한다 | |

매니페스트의 `mattpocock.pool`은 이 표의 "추가" 행 이름이다. 신호·겹침·제외 이유의 정본은 이 표를 옮긴 `brains/README.md`다(D15). `pnpm skills:update`가 원격에서 없어진 스킬을 알리거나 사용자가 원본 변경 반영을 요청하면 H 라운드에서 이 표와 `pool`을 다시 맞춘다. 업데이트 도구는 새 스킬을 찾지 않으므로(지금 범위), 표에 없는 새 스킬은 정할 때까지 설치하지 않는다.

#### 5.8.3 과설계 방지 스킬과 응답 방식 추천

| 선택지 | 추천 조건 |
|---|---|
| ponytail | 늘 첫 선택지로 추천한다(D17). 새 기능이 많은 서비스, 공통화·리팩터 범위가 있으면 근거로 함께 적는다 |
| caveman | 두 번째 선택지. 사용자가 토큰·비용 절감, 짧은 답을 함께 원하거나, ponytail의 늘 켜지는 훅을 원하지 않을 때 추천한다. 응답 압축 규칙은 영어 기준이라 한국어 문장이 어색해질 수 있다고 알린다 |
| andrej-karpathy-skills | 세 번째 선택지. 사용자가 이 지침을 이미 알고 선호하거나 짧은 지침 하나만 원할 때. 구현 diff 검토 스킬이 없어 그 역할은 `prokit-reviewer` focus가 맡는다고 알린다 |
| SKIP(기본 AI) | 사용자가 외부 스킬을 줄이고 싶을 때. 하네스 간결성 규칙으로 진행한다 |
| i-have-adhd | 사용자가 짧은 행동 중심 답, 단계 번호, 다음 할 일 하나를 원할 때 추천한다. 그 밖에는 SKIP을 추천한다 |

### 5.9 루트 저장소와 문서

| 파일 | 바꿀 내용 |
|---|---|
| 루트 `AGENTS.md` | 새 프로젝트 절차 1번에 스킬 구성 질문, 3번 준비물에 고른 두뇌의 준비물(gstack은 Bun, oh-my는 Codex를 쓰면 `codex`와 OMX `team`용 tmux), 5번에 `--brain`·`--simplicity`·`--matt`·`--optional`과 "Codex Ponytail 네이티브 플러그인" 문장을 "ponytail을 고르고 `--with-global`일 때"로, 10번 보고에 고른 스킬 항목. 첫머리에 `prokit-init`을 읽으라는 한 줄. "루트 `.agents/skills`에는 `prokit-docs`·`prokit-writing`만" 규칙에 `prokit-init` 추가(같은 규칙을 가진 `CONTRIBUTING.md`와 루트 스킬 허용 목록을 검사하는 `scripts/doc-values.test.mjs`도). 템플릿 갱신 반영 절차에 이행(7절). "이 저장소는 두뇌 없음" 한 줄 |
| `CONTRIBUTING.md` | 루트 스킬 규칙에 `prokit-init`. 57줄의 "Karpathy 미도입 검토" 링크 옆에 이번 보고서를 더하고, 기본 지침을 ponytail 단독으로 둔다는 2026-10-09 결론이 "기본 설치 없음, 과설계 방지 스킬 하나를 고름(ponytail 추천, karpathy도 고를 수 있음)"으로 바뀌었다고 적는다 |
| 루트 `CLAUDE.md` | AskUserQuestion으로 묻는 값에 스킬 구성(두뇌, 추가 스킬, 과설계 방지, 응답 방식) 추가 |
| 루트 `.claude/settings.json` | pro-kit 저장소 자체는 두뇌 `none`(결정 9-3). `enabledPlugins`의 superpowers·OMC를 `false`로 바꿔 user scope 설치까지 이 저장소에서 끄고, 쓰지 않는 `omc` marketplace 선언을 뺀다. skill-creator·ponytail은 그대로 둔다(이 저장소의 과설계 방지 스킬은 ponytail) |
| `docs/blocks/tpl-readme-*` → 두 템플릿 README | 설치 표(프로세스 스킬 행 → 두뇌 행과 과설계 방지 스킬 행, 모두 선택), 준비물(전역 OMX·gstack 제거), 옵션(`--brain`·`--simplicity`·`--matt`·`--optional`), 클론 안내, 설치 뒤 단계, Vercel 주의 |
| handbook | `skills/official-skills.md`의 프로세스 스킬 절을 "하네스(mattpocock 필수 포함)", "두뇌(선택)", "과설계 방지 스킬(선택)", "추가 스킬(선택)"으로 나눈다. 새 쪽 `skills/brains.md`(고르기: 비교표, 선택지 설명, 언제 고르나, 충돌, 바꾸는 법). `skills/optional-bundles.md`에 `i-have-adhd` 묶음. ponytail을 기본 설치로 쓴 쪽을 선택 설치로 고친다: `start/what-is-prokit.md`·`supported-agents.md`·`after-create.md`·`requirements.md`·`quickstart-service.md`, `concepts/harness.md`(도식 포함)·`dev-cycle.md`·`cases.md`·`agent-roles.md`·`audit-and-confirm.md`, `templates/installer.md`·`choose.md`·`what-it-adds.md`·`update-existing.md`, `skills/README.md`·`install-and-update.md`(도식), `reference/commands.md`·`project-structure.md`·`tech-stack.md`·`verification.md`·`faq.md`, `deploy/vercel.md` |
| `docs/common-values.md`, `doc-values.json`, `scripts/doc-values.mjs` | `skills.codex.superpowers` 값 키의 정본 위치 변경(`brains.superpowers`), 두뇌 목록(`brains.names`)과 과설계 방지 스킬 목록(`simplicity.names`) 값 키 추가. `optional.count`·`optional.names`는 `i-have-adhd`가 더해져 3에서 4로 바뀌므로 그 값을 쓰는 문장의 뜻을 확인한다. ponytail 스킬 수처럼 기본 설치 수를 센 값이 있으면 정본 위치를 `simplicity.ponytail`로. NOTICES 출처 검사(`manifestSources`)가 `skills`·`optional`만 읽으므로 `brains`·`simplicity`·`mattpocock`의 출처도 읽게 한다 |
| `THIRD_PARTY_NOTICES.md` | 새 후보 저장소의 라이선스: addyosmani/agent-skills, cursor/plugins, garrytan/gstack, OMC·OMX, caveman(Apache-2.0, `NOTICE`), i-have-adhd(MIT), andrej-karpathy-skills(LICENSE 파일 없음, 저장소 표기 MIT라고 사실대로 적는다) |
| 두 템플릿 `VERIFICATION.md`, `docs/reports/2026-10-20-brain-selection/README.md` | 실제 설치 확인 기록 |

문서는 `prokit-docs`(쪽 구조), `prokit-writing`(문장 검수) 스킬로 쓴다.

## 6. 실행 계획

| 단계 | 할 일 | 끝났다고 보는 근거 |
|---|---|---|
| 0 | 3절 조사 확정, 9절 사용자 결정 (완료). 구현 전 실측(10절)을 scratchpad에서 한다 | 후보 표와 결정 확정, 10절 결과를 이 문서에 반영 |
| 1 | 매니페스트 `brains`·`simplicity`·`mattpocock`·`optional["i-have-adhd"]`, `.dev-cycle.json` `brain`·`simplicity`, `skills-setup.mjs`, `install.mjs`. 실패하는 테스트를 먼저 쓴다 | 두 템플릿 `node --test 'templates/<템플릿>/tests/*.test.mjs'` 통과, `shared-files` 바이트 일치 |
| 2 | 템플릿 워크플로·스킬·에이전트(5.5, 5.6), evals | `template-docs` 테스트 통과, `quick_validate`, `pnpm agents:check`(설치본) |
| 3 | `prokit-init` 초안 → skill-creator 평가(스킬 있음·없음 비교) → 사용자 검토 → 개선 반복 | 평가 뷰어 검토, 사용자 승인 |
| 4 | 루트 `AGENTS.md`·`CLAUDE.md`·`CONTRIBUTING.md`·설정, README 블록, handbook, 공통 값 | `node --test scripts/handbook.test.mjs`, `node --test scripts/doc-values.test.mjs`, `node scripts/doc-values.mjs` |
| 5 | 실제 Better-T-Stack 프로젝트(scratchpad)에 설치. 시나리오: 아무것도 고르지 않음, 두뇌 하나 + ponytail + 추가 스킬, ponytail → caveman → karpathy → none 차례로 바꾸기, 두뇌 바꾸기, 옛 구성(superpowers·OMC·ponytail 기본 설치, 키 없음)에서 `--brain none --simplicity ponytail` 정리, 전역 플러그인 끄기와 그것을 다시 고를 때 local 항목 해제, i-have-adhd 묶음. Biome 형식 확인 | `skills:check`·`agents:check`·`check-types`·`biome check` exit 0, 바꾼 뒤 이전 것의 흔적 없음, caveman·karpathy·i-have-adhd가 전역 파일을 만들지 않음(ponytail 플러그인의 기존 전역 파일은 기록만). 시험 플러그인 `claude plugin uninstall --scope project`로 정리 |
| 6 | 독립 리뷰(구현과 다른 lane), `VERIFICATION.md`와 보고서 | 리뷰 승인, 기록 |
| 7 | 릴리스는 사용자가 정할 때(minor 추천) | `node scripts/release.mjs` 절차 |

단계 1과 2는 서로 독립이라 파일이 겹치지 않게 나눠 병렬로 진행할 수 있다. 단계 3은 단계 1의 인자 이름(`--brain`, `--simplicity`, `--matt`, `--optional` 묶음 키)이 정해진 뒤 시작한다.

## 7. 기존 프로젝트 이행

1. 그 프로젝트의 열린 라운드를 닫는다(행 문구가 바뀌어 audit이 옛 행을 누락으로 본다).
2. 그 프로젝트 세션에서 H 라운드를 열고 `install.sh <프로젝트> --diff`로 차이를 본 뒤 `--skip-skills`로 반영한다.
3. 두뇌와 과설계 방지 스킬을 고른다. 지금 구성과 가장 가깝게 두려면 `pnpm skills:setup --brain superpowers --simplicity ponytail`, 가볍게 가려면 `--brain none --simplicity ponytail`이다. 이 명령이 OMC 플러그인·OMX 설정 등 고르지 않은 것을 지운다. caveman이나 karpathy로 바꾸면 ponytail 설치본도 지운다.
4. mattpocock 필수 세 개는 이미 설치돼 있어 할 일이 없다. 추가 스킬이 필요하면 `--matt`로 설치한다.
5. `pnpm skills:check` exit 0, `pnpm agents:check`, 커밋.

## 8. 위험과 한계

- 전역에 설치된 두뇌는 프로젝트 안에서 완전히 숨길 수 없을 수 있다(전역 스킬 폴더, 전역 `CLAUDE.md` 블록, 세션 시작 훅). 규칙으로 고르지 않게 하지만, 훅이 주입하는 지시와 프로젝트 규칙이 부딪히는 문제는 남는다. 보고에서 사용자가 전역 설치를 직접 정리할 수 있게 위치를 알린다.
- gstack을 고른 프로젝트가 하나라도 있으면 그 기기의 전역 gstack이 다른 프로젝트에도 보인다. 스킬은 D6의 `skillOverrides`로 숨기지만, gstack 전역 설치가 `~/.claude/settings.json`에 등록한 훅은 플러그인이 아니라 프로젝트 단위로 끌 수 없다. Codex의 `~/.codex/skills/gstack`도 프로젝트 단위로 끌 수 없다. `prokit-init`의 gstack 선택지 설명과 보고에 이 점을 적는다.
- 정리(`--brain`, `--simplicity`)는 프로젝트 파일을 지운다. git으로 되돌릴 수 있는 프로젝트 scope만 지우고, 지운 목록을 출력한다.
- 행 문구 변경은 진행 중 라운드와 맞지 않는다(7절 1번).
- 후보 저장소의 이름·설치 방식은 바뀔 수 있다. 확인한 판을 `VERIFICATION.md`에 적고 버전은 고정하지 않는다(저장소 규칙).
- 세 과설계 방지 스킬은 대신하는 정도가 다르다. ponytail은 훅으로 늘 켜져 구현 중에 범위를 줄이고 diff 검토 스킬도 있다. caveman은 작업 스킬이 일에 맞을 때만 불리고, 늘 켜지는 "Native Core"는 전역 CLI가 필요해 쓰지 않는다. karpathy는 지침 하나라 diff 검토를 리뷰어 focus가 맡는다. SKIP이면 하네스 규칙과 리뷰어만 남는다. 아무것도 고르지 않은 새 프로젝트에는 늘 켜지는 미니멀 모드가 없다. 그래서 `prokit-init`이 ponytail을 첫 선택지로 추천한다.
- ponytail 플러그인은 지금도 프로젝트 밖에 상태 파일과 턴별 CSV를 쓴다(3.2). 이번 변경으로 새로 생기는 부작용은 아니지만, 선택지 비교에 사실대로 적는다.
- caveman 응답 압축은 한국어 전용 규칙이 없다. 영어 기준 압축 규칙(관사 생략 등)이 한국어에서 어색한 문장을 만들 수 있다. 대화 응답에만 쓰고 파일과 보고에는 쓰지 않는다(D11).
- i-have-adhd의 "목록은 5개까지", "매 답 끝에 다음 할 일 하나"는 프로킷 라운드 보고 형식과 부딪힌다. 보고 형식이 우선한다(D11).
- "normal mode" 한마디가 ponytail, caveman, i-have-adhd를 함께 끈다. 보고와 handbook에 끄는 문구를 스킬별로 적는다.
- pro-kit 저장소 루트에서 OMC 플러그인을 꺼도(5.9) 전역 `~/.claude/CLAUDE.md`의 OMC 블록은 계속 읽힌다. 블록이 OMC 스킬·에이전트를 쓰라고 해도 이 저장소에서는 그 스킬이 없다. 루트 `AGENTS.md`에 "이 저장소는 두뇌 없음"을 적어 규칙으로 막는다(D6과 같은 한계).
- karpathy는 독립 LICENSE 파일이 없다. 템플릿은 파일을 복사하지 않고 원본에서 받으므로 재배포하지 않지만, 고지에는 사실대로 적는다. 2026-10-09 검토의 "모호하면 멈추고 묻기"와 "불가능한 예외 처리 생략" 해석 위험은 D11로 막는다.

## 9. 사용자 결정 (2026-10-20)

1. gstack과 OMX: 두뇌 가운데 이 둘만 전역 설치를 허용한다. 그 두뇌를 고른 경우에만 설치한다(D5, 3.1). 두뇌가 아닌 전역 도구(agent-browser, Vercel CLI 등)와 ponytail Codex 네이티브 플러그인(`--with-global`)은 지금 규칙 그대로다.
2. 이미 전역에 있는 두뇌: 개인 설정 `.claude/settings.local.json`으로 이 프로젝트에서만 끈다. 전역 파일은 건드리지 않고, 끌 수 없는 것은 경고한다(D6).
3. pro-kit 저장소 자체: 두뇌 `none`으로 맞춘다(5.9 루트 `.claude/settings.json`).
4. 진행 범위: 처음에는 설계만 완료했다. 구현은 6절 단계 0부터 진행한다.
5. mattpocock: `domain-modeling`·`grill-with-docs`·`grilling`은 용어·설계 질문에 필수라 공식 스킬로 포함한다. 그 밖의 스킬은 추천하고, 선택해 설치하거나 SKIP한다(D7, D8).
6. 과설계 방지 스킬: ponytail, caveman, andrej-karpathy-skills는 같은 계열이라 이 중 하나만 고르거나 SKIP한다. 추천 순서는 ponytail, caveman, karpathy다. 고른 스킬이 지금 ponytail의 역할을 대신하고, 모두 SKIP하면 기본 AI가 맡는다(D1, D9, D10, D17).
7. i-have-adhd: 별도 스킬로 고르고 SKIP할 수 있다(D9).
8. 선택지마다 짧은 설명을 붙여 살펴보고 고를 수 있게 한다(5.7).

## 10. 구현 전에 확인할 것

- OMX를 다른 두뇌로 바꿀 때 지울 프로젝트 파일 목록(`omx setup --scope project`의 실제 산출물과 `.omx/setup-scope.json` 내용).
- `npx skills remove --skill <이름들> -y`가 `skills-lock.json` 항목과 `.claude/skills` 링크를 함께 정리하는지.
- `.claude/settings.local.json`의 `enabledPlugins: false`와 `skillOverrides: "off"`가 실제 세션에서 user scope 플러그인과 gstack 개인 스킬을 숨기는지(새 세션 기준).
- superpowers Codex 플러그인 경로의 SessionStart 주입 여부(원본 README와 manifest가 다르다). 템플릿은 skills CLI 경로를 쓰므로 영향은 없지만 전역 감지 경고 문구에 반영한다.
- 5.8.2 "겹치는 두뇌" 열: superpowers·agent-skills·gstack·pstack·OMC·OMX의 실제 스킬 목록과 대조해 확정한다(추천용).
- 소유 판정(D4): 후보마다 `skills-lock.json`의 `source` 값, 플러그인 ID, OMX 기록 파일이 실제 설치본에서 어떻게 남는지. 같은 이름 스킬(`test-driven-development` 등)이 두 후보에 있는지.
- skills CLI 설치: `npx skills add <원본> --skill <이름> -a claude-code -a codex -y`가 `karpathy-guidelines`, caveman 다섯 스킬, `i-have-adhd`를 `.agents/skills`와 `.claude/skills`에 넣는지. caveman 저장소의 중복 사본(`plugins/caveman/skills/`)이나 `skills/generated/`가 섞이지 않는지.
- caveman 작업 스킬이 "Native Core"를 전제로 쓰인 부분(`lean-build`의 "Native Core's … mandatory")이 Core 없이 읽혀도 하네스 간결성 규칙으로 뜻이 통하는지. 통하지 않으면 역할 표에 "Core 대신 하네스 규칙 6을 읽는다"는 문장을 더한다.
- `i-have-adhd`의 `disable-model-invocation: true` 스킬이 skills CLI 설치본에서 `/i-have-adhd`로 불리는지(Claude Code), Codex에서 `$i-have-adhd`로 불리는지.
- `simplicity: ponytail`: 플러그인 선언과 Codex 스킬 6개, `--with-global`의 네이티브 플러그인이 지금 기본 설치와 같은 결과인지.
- Grok Build의 프로젝트 스킬 경로(`.grok/skills`)와 지금 템플릿 문서의 차이. 이번 범위 밖이므로 별도 항목으로 보고한다.

## 11. 이번 범위 밖 (다음 작업)

- taste-skill(Leonxlnx/taste-skill의 `design-taste-frontend`, v2.1.3, MIT) 검토, 2026-10-20. impeccable 대체 항목으로 두지 않는다.
  - init(`PRODUCT.md`), document(`DESIGN.md` 갱신), audit 20점, 편집 중 검사 훅, `generate-image`에 해당하는 기능이 없다.
  - 서체 조합 44개에 한글 서체가 없고, 금지 규칙(1px 테두리, 그림자, 보라색 등)이 shadcn 기본 컴포넌트·카탈로그 `DESIGN.md`와 부딪힌다. 전역 파일 `~/.taste-skill/history.json`도 쓴다.
  - 2.1.0~2.1.3이 10-18~19에 나와 아직 판이 흔들린다.
  - 사용자 결정: 두뇌·과설계 방지 구현을 먼저 끝낸다. 그 뒤 선택 묶음 `--optional taste`로 Persuade 화면만 보조하는 설계를 따로 한다(스타일 후보 하나, `inspect.mjs` 검사 행, 이미지 길에서 배치도 전 아카이브 사진). 대체 항목은 판이 안정되고, 빠지는 역할과 한글 서체를 `prokit-ui`가 맡는 설계가 선 뒤 다시 본다.
- Anthropic `frontend-design`(anthropics/skills, Apache-2.0, 71줄 지침) 검토, 2026-10-20. 템플릿에 넣지 않는다. impeccable이 이 스킬에서 출발해 `init`, 명령 24개, 검사 규칙 61개를 더했고, B 케이스 행을 채울 산출물이 없다. 전역 플러그인으로 켜져 있으면 UI 작업에서 impeccable과 함께 불려 `prokit-ui` 순서(사이트맵 → shape 브리프)와 엇갈리므로, 사용자 결정에 따라 매니페스트 `claude.conflicts`에 두고 D6로 그 프로젝트에서만 끈다(이번 구현 범위).
