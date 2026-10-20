# 설치와 업데이트 구조

> 한눈에: 스킬 목록은 파일 하나에 모여 있고, 설치할 때 프로젝트에 빠진 것만 넣어요. 설치한 스킬은 프로젝트와 함께 저장돼요. 새 버전은 하루 한 번 확인해서 올릴지 물어요.

## 설치되는 길

```mermaid
flowchart TD
  M["skills.manifest.json"] --> S["scripts/skills-setup.mjs<br/>install.sh와 pnpm skills:setup이 실행"]
  S --> P1["공식 도메인 스킬<br/>.agents/skills + .claude/skills 링크"]
  S --> P2["Claude 플러그인<br/>.claude/settings.json<br/>skill-creator"]
  S -.->|"고른 두뇌·과설계 방지 스킬만<br/>(.dev-cycle.json brain · simplicity)"| SEL["두뇌: superpowers · agent-skills(addyosmani) · gstack · oh-my · pstack · mattpocock 중 하나<br/>과설계 방지: ponytail · caveman · karpathy 중 하나<br/>플러그인 또는 .agents/skills"]
  S -.->|"두뇌가 oh-my이고 omx CLI가 있을 때"| P4["OMX 프로젝트 설정<br/>.codex/skills · agents · prompts"]
  S -.->|"--matt 스킬일 때만"| MATT["mattpocock 추가 스킬<br/>.agents/skills + .claude/skills 링크"]
  S -.->|"--optional 묶음일 때만"| OPT["선택 스킬 묶음<br/>ops · motion · mobile · i-have-adhd · taste<br/>.agents/skills + .claude/skills 링크"]
  S -->|"없거나 최신판보다 낮으면"| AB["agent-browser CLI<br/>(전역)"]
  S -.->|"--with-global일 때만"| G["나머지 전역 도구<br/>Vercel CLI<br/>Neon CLI 또는 Supabase CLI"]
  S -.->|"고른 두뇌가 gstack·oh-my이고<br/>--brain을 줬거나 --with-global"| BG["두뇌 전역 도구<br/>gstack · OMX CLI"]
  S -.->|"ponytail을 고르고 --with-global + 지원 CLI"| CP["Codex 네이티브 Ponytail<br/>공식 marketplace · plugin<br/>선택 항목"]
  S -.->|"전역에 켜진 고르지 않은 플러그인"| LOC[".claude/settings.local.json<br/>이 프로젝트에서만 끔"]
  CHK["pnpm skills:check<br/>설치 없이 상태만 확인<br/>선택 묶음은 설치 여부만"] -.->|"같은 스크립트를 --check로 실행"| S
  UPD["pnpm skills:update<br/>GitHub 원본과 비교해 바뀐 스킬만 다시 설치<br/>prokit-dev-cycle 시작에서 하루 한 번 확인"] -.->|"같은 스크립트를 --update로 실행"| S
```

- **최신판을 받아요**: 공식 스킬은 템플릿에 복사해 두지 않고, 설치할 때 원본 저장소의 최신 커밋을 받아요(skills CLI도 `skills@latest`). Claude 플러그인은 마켓플레이스를 최신으로 받은 뒤 설치해요.
- **프로젝트 설치와 Codex 선택 설치는 달라요**: 프로젝트 스킬과 Claude 플러그인은 프로젝트 범위(project scope)에 들어가요. Codex 네이티브 Ponytail은 `--with-global`일 때만 사용자 설정에 공식 marketplace와 플러그인을 등록하는 선택 항목이에요. 기본 설치와 `pnpm skills:check`는 그 설정을 바꾸지 않아요.
- **전역 도구는 둘로 나뉘어요**: <!-- v:policy.agentBrowser.yo -->agent-browser CLI는 없거나 npm 최신판보다 낮으면 기본으로 최신판을 설치해요<!-- /v -->. 나머지 전역 도구는 `--with-global`을 줄 때만 설치해요.

## 설치 목록과 실제 선택은 달라요

매니페스트는 프로킷이 관리해 설치할 스킬 목록이에요. 현재 쓸 수 있는 외부 스킬을 한 번 선택했다고 이 목록을 바꾸지는 않아요. 반복해서 관리할 스킬만 출처·권한·지원 환경·행동 평가를 확인해 등록해요.

새 외부 스킬을 만드는 작업은 `skill-creator`를 적용하는 전문 수행자에게 맡겨요. 기본 선택과 결과 검수는 [위임과 자원 관리](../concepts/delegation-and-resources.md)를 따라요.

## 업데이트

설치한 외부 스킬은 프로젝트에 복사되어 커밋돼요. 그래서 원격 저장소가 바뀌어도 저절로 따라가지 않아요.

```bash
pnpm skills:update --check     # 설치한 외부 스킬을 GitHub 원본과 비교해 새 버전만 알려 준다
pnpm skills:update             # 바뀐 스킬과 빠진 스킬만 다시 설치한다
pnpm skills:update <이름>...   # 지정한 스킬만 다시 설치한다
```

- **하루 한 번 확인**: 진행 중인 라운드가 없을 때 `pnpm dev-cycle status`가 하루 한 번 새 버전을 확인해요(GitHub API를 저장소마다 한 번 호출). 새 버전이 있으면 `prokit-skills-update`가 업데이트할지 물어요(지금, 항상 자동, 나중에, 다시 묻지 않기).
- **케이스 H로 커밋**: 업데이트는 하네스를 바꾸는 일이라 케이스 H 라운드로 커밋해요.
- **비교 방법**: `pnpm skills:update`는 `skills-lock.json`에 적힌 GitHub 폴더와 설치본을 파일 단위로 비교하고, 바뀐 스킬만 목록에 적힌 에이전트(Claude, Codex)로 다시 설치해요.

## 자세히

### 스크립트가 바뀐 스킬은 먼저 읽어요

훅이 스킬 스크립트를 바로 실행하므로 스크립트나 설정 파일이 바뀐 스킬은 설치 전에 원격 파일을 먼저 읽어요. 알림 방식을 자동으로 둬도 이런 스킬은 물어요. `--check`로 검토한 그 판을 이름으로 지정해야 설치되고, 그사이 원격이 바뀌면 설치하지 않아요. 원격에서 없어진 스킬은 지우지 않고 알리기만 해요.

### 플러그인은 따로 올려요

Claude 플러그인은 `skills:update`가 업데이트하지 않아요. 네 플러그인 모두 훅이 있어서 업데이트하는 즉시 새 코드가 실행되기 때문이에요. 사용자가 요청하면 플러그인 저장소의 `hooks/` 변경을 먼저 보고 올려요.

```bash
claude plugin marketplace update <마켓플레이스>
claude plugin update <플러그인> --scope project   # 세션을 다시 열어야 적용된다
```

### Ponytail 훅과 Codex 네이티브 플러그인

과설계 방지 스킬로 ponytail을 고르면 Claude 플러그인이 훅 3개(SessionStart, SubagentStart, UserPromptSubmit)로 세션과 서브에이전트에 과설계를 막는 규칙을 넣어요. 상태는 `CLAUDE_CONFIG_DIR` 또는 `~/.claude` 아래에 두며, `CLAUDE_PROJECT_DIR`이 있으면 프로젝트 hash별 모드와 공유 플래그를 써요.

없으면 shared 상태를 써요. 같은 저장소의 세션은 모드를 함께 쓰므로 `stop ponytail`도 함께 적용돼요. 전역 helper 파일을 쓸 수 있지만 statusline 설정은 사용자가 원할 때만 바꿔요.

고르지 않았는데 전역에 켜져 있으면 설치기가 `.claude/settings.local.json`의 `enabledPlugins`에 `"ponytail@ponytail": false`를 넣어 이 프로젝트에서만 꺼요([두뇌와 선택 스킬](brains.md)).

시작 훅의 대략적 코드 지도는 재사용 후보를 찾는 참고 자료예요. 지도에 나온 항목은 실제 코드·호출자·테스트·설정·내보내기를 읽고 확인해요.

ponytail을 고르면 Codex는 프로젝트에 `ponytail`, `ponytail-review`, `ponytail-audit`, `ponytail-debt`, `ponytail-help`, `ponytail-gain` <!-- v:skills.codex.ponytail -->6<!-- /v -->개 스킬을 받아요. 지원하는 CLI에서 `--with-global`을 주면 공식 원본 marketplace와 네이티브 플러그인을 추가할 수 있어요. 설치된 플러그인의 출처와 비활성화 선택은 보존하며, 설치기가 다시 설치하거나 자동으로 올리지 않아요.

플러그인 설치와 훅 신뢰는 별개예요. Codex에서 `/hooks`로 현재 플러그인을 신뢰하고 새 세션을 연 뒤에만 자동 훅 실행을 기대할 수 있어요. 신뢰 기록을 대신 쓰거나 우회하지 않아요.

Codex 네이티브 플러그인을 쓸 수 있으면 `$ponytail:ponytail-review`처럼 이름공간으로 불러요. 없으면 프로젝트의 같은 스킬을 읽어요. 둘을 같은 검토에 함께 쓰지 않고, 사용자가 ponytail을 끈 상태면 대체 경로로 다시 켜지 않아요.

review는 한 번의 검토일 뿐 세션을 영구 review 모드로 바꾸지 않아요. audit·debt·help·gain은 요청할 때만 읽고 파일을 고치지 않아요.

### 상태 확인

`pnpm skills:check`는 설치하지 않고 상태만 봐요. 프로젝트 범위 항목이 빠졌으면 exit 1이에요. 선택 묶음과 Codex 네이티브 Ponytail은 상태만 보여 주며, 없어도 누락으로 세지 않아요. `omx`가 없는 기기도 OMX를 누락으로 세지 않아요.

## 관련 문서

- [공식 스킬과 연결](official-skills.md)
- [선택 스킬 묶음](optional-bundles.md)
- [설치기와 옵션](../templates/installer.md)
- [만든 뒤 개발하기](../start/after-create.md)
