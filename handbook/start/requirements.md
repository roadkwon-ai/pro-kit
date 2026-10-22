# 준비물

> 한눈에: 프로킷으로 프로젝트를 만들려면 컴퓨터에 몇 가지 프로그램이 있어야 해요. 화면만 만들 때는 Node, pnpm, git이면 되고, 로그인과 DB까지 갖춘 서비스를 만들 때는 내 컴퓨터에 DB를 띄울 프로그램이 더 필요해요. Windows에서는 Windows 안에서 Linux를 쓰게 해 주는 기능(WSL2)의 Ubuntu에서 진행해요.

## 무엇이 필요한가요

| 준비물 | 화면만 만들기 | 서비스 (neon) | 서비스 (supabase) | 쓰는 곳 |
|---|---|---|---|---|
| AI 에이전트 (<!-- v:agents.list -->Claude Code, Codex, Antigravity, Grok Build<!-- /v --> 중 하나. [지원하는 에이전트](supported-agents.md)) | 필요 | 필요 | 필요 | 요청하고 개발하기 |
| Node <!-- v:node.min -->22.20<!-- /v --> 이상(<!-- v:node.recommended -->24<!-- /v --> 권장) | 필요 | 필요 | 필요 | 앱과 설치기 실행 |
| pnpm | 필요 | 필요 | 필요 | 패키지 설치와 명령 실행 |
| git | 필요 | 필요 | 필요 | pro-kit 받기, 커밋 |
| 컨테이너 엔진 (Podman 또는 Docker) | 필요 없음 | 필요 (compose provider 포함) | 필요 | 내 컴퓨터의 개발용 DB |
| Supabase CLI <!-- v:supabaseCli.min -->2.117<!-- /v --> 이상 | 필요 없음 | 필요 없음 | 필요 | Supabase 로컬 스택 |

필요할 때만 있으면 되는 것도 있어요.

| 도구 | 언제 |
|---|---|
| Neon CLI (<!-- v:cli.neon.installCode -->`npm install -g neon`<!-- /v -->) | neon 템플릿에서 원격 DB를 쓸 때. 로컬 개발만 할 때는 없어도 돼요 |
| 원격 Supabase 프로젝트 두 개 (스테이징, 운영) | supabase 템플릿에서 병합 전 검증과 운영 DB를 쓸 때 |
| Vercel CLI (<!-- v:cli.vercel.installCode -->`npm install -g vercel`<!-- /v -->)와 Vercel 계정 | develop과 운영에 배포할 때 |
| ego lite (macOS) | 브라우저로 화면을 확인할 때 먼저 쓰는 도구 |
| agent-browser CLI | ego lite를 쓸 수 없을 때의 브라우저 확인 도구. <!-- v:policy.agentBrowser.cell -->없거나 npm 최신판보다 낮으면 기본으로 최신판을 설치<!-- /v --> |
| Bun | 두뇌 gstack을 고를 때 |
| uv | 두뇌 Spec Kit을 설치할 때만 |
| tmux | 두뇌 oh-my의 OMX `team`(Codex)을 돌릴 때. 없어도 진행은 멈추지 않고 에이전트가 보고에 적어요 |
| OpenSpec CLI (npm) | 두뇌 OpenSpec을 고를 때. 설치기가 전역에 설치해요 |

앱 스택, CLI 도구, 외부 서비스 전체는 [쓰는 기술과 도구](../reference/tech-stack.md)에 모았어요. 에이전트 설치와 로그인은 튜토리얼 [시작하기](../../tutorials/start/README.md)에 있어요. 요금제는 [비용과 키](../../tutorials/reference/costs-and-keys.md)를 보세요.

## 각 준비물이 왜 필요한가요

| 준비물 | 무엇인가요 | 왜 필요한가요 |
|---|---|---|
| AI 에이전트 | 대화로 부탁하면 코드를 쓰고 명령을 실행해 주는 AI | 내 요청을 받아 일하는 주인공이에요([용어](../../tutorials/reference/glossary.md#도구)) |
| Node | 자바스크립트로 만든 프로그램을 내 컴퓨터에서 실행하는 환경 | 만들 앱과 pro-kit의 설치기가 이 위에서 돌아요 |
| pnpm | 앱이 가져다 쓰는 패키지(남이 만든 코드 묶음)를 설치하고 명령을 실행하는 도구 | 프로젝트를 설치하고 `pnpm check` 같은 검사 명령을 실행해요 |
| git | 파일이 바뀐 기록을 저장하는 도구 | pro-kit을 받고, 작업 결과를 커밋(기록 한 번)으로 남겨요 |
| 컨테이너 엔진(Podman 또는 Docker) | 프로그램을 격리된 상자(컨테이너)에 담아 돌리는 프로그램 | 내 컴퓨터 안에 개발용 DB를 띄워서 운영 DB를 건드리지 않고 개발해요 |
| Supabase CLI | Supabase를 내 컴퓨터에서 돌리는 명령 도구 | supabase 템플릿의 로컬 개발 환경을 띄워요 |
| Vercel CLI | Vercel에 서비스를 올리는 명령 도구 | develop과 운영에 배포할 때 써요 |
| ego lite, agent-browser CLI | 에이전트가 브라우저를 열어 화면을 보게 하는 도구 | 만든 화면을 실제로 열어 스크린샷을 찍고 오류를 확인해요 |

## 에이전트에게 확인을 맡기기

내 컴퓨터에 무엇이 있는지 몰라도 돼요. 에이전트에게 맡기면 설치된 것과 빠진 것을 알려 줘요. 튜토리얼 [시작하기의 "에이전트에게 부탁하기"](../../tutorials/start/README.md#pro-kit-받기)에 복사해 쓸 프롬프트가 있어요. 확인하고, 없는 것은 무엇을 설치할지 먼저 보여 준 뒤 내가 허락하면 설치해요. 비밀번호를 묻는 명령은 내가 터미널에서 직접 실행하게 명령만 알려 줘요.

에이전트의 답은 이런 모양이에요(예시).

```text
Node 24.1 있음, pnpm 있음, git 있음.
Podman은 있지만 머신이 꺼져 있어요. 서비스를 만들 때 켜야 해요.
Supabase CLI는 없어요. supabase 템플릿을 쓸 때만 필요해요.
```

## 자세히

### 에이전트가 먼저 확인해요

프로젝트를 만들어 달라고 하면 에이전트가 준비물부터 확인해요([AGENTS.md](../../AGENTS.md) "템플릿으로 새 프로젝트 만들기" 3번).

- 빠진 것이 있으면 설치 명령을 알려 주고 멈춰요. 전역 설치는 사용자가 요청할 때만 해요.
- 화면만 만들 때는 컨테이너 엔진을 확인하지 않아요. 요청에 "없는 준비물은 설치해줘"가 있으면 빠진 Node <!-- v:node.min -->22.20<!-- /v --> 이상, pnpm, git을 에이전트가 설치해요. 비밀번호가 필요한 명령은 실행하지 않고 사용자에게 알려 줘요.
- Node는 <!-- v:node.min -->22.20<!-- /v --> 이상이면 돼요. 이보다 낮으면 설치기가 멈춰요(새 프로젝트를 만들고 스킬을 받는 도구가 요구하는 하한이에요). 새로 설치한다면 지금 LTS인 <!-- v:node.recommended -->24<!-- /v -->를 받으세요. <!-- v:node.recommended -->24<!-- /v --> 미만이면 설치기가 권장 경고만 내요. Node 20은 <!-- v:node.eol -->2026-04-30<!-- /v -->에 지원이 끝났어요. Vercel에 배포할 때는 프로젝트의 Node.js를 <!-- v:vercel.node -->24.x<!-- /v -->로 둬요.

### 컨테이너 엔진

- neon 템플릿은 compose로 로컬 Postgres를 띄워요. `podman compose`는 외부 provider(docker-compose나 podman-compose)를 부르므로 둘 중 하나가 있어야 해요.
- macOS에서 Podman을 쓰면 머신을 먼저 켜야 해요(`podman machine init`, `podman machine start`). 에이전트는 머신이 멈춰 있으면 켜고 보고하고, 머신이 없으면 `podman machine init`을 안내하고 멈춰요. Linux와 WSL의 Podman에는 머신이 없어요.
- supabase 템플릿에서 Podman을 쓰면 Supabase CLI를 쓰는 셸마다 `DOCKER_HOST`를 설정해요. 값은 macOS와 Linux·WSL이 달라요(템플릿 README [준비물](../../templates/prokit-next-supabase/README.md#준비물)).

### 브라우저 확인 도구

- macOS에서는 [ego lite](https://lite.ego.app/)를 먼저 써요. 스크린샷을 찍는 동안 ego lite 창이 화면에 보여야 해요.
- Windows, Linux, CI, Codex 샌드박스처럼 ego lite를 쓸 수 없는 곳에서는 agent-browser CLI를 써요. <!-- v:policy.agentBrowser.yo -->agent-browser CLI는 없거나 npm 최신판보다 낮으면 기본으로 최신판을 설치해요<!-- /v -->.

### 전역에만 설치되는 도구

agent-browser CLI, Vercel CLI, Neon CLI 또는 Supabase CLI, ego lite는 프로젝트가 아니라 컴퓨터 전체에 설치돼요. 두뇌 gstack, OMX CLI(`oh-my-codex`), OpenSpec CLI도 전역이지만 그 두뇌를 고를 때만 설치해요. <!-- v:policy.agentBrowser.yo -->agent-browser CLI는 없거나 npm 최신판보다 낮으면 기본으로 최신판을 설치해요<!-- /v -->. 나머지는 기본 실행에서 없는 것과 설치 명령만 알려 주고, `--with-global`을 주면 ego lite를 뺀 나머지 중 없는 것만 설치해요([설치기와 옵션](../templates/installer.md)). 모두 없어도 dev-cycle은 진행돼요.

### Windows

Windows에서는 WSL2의 Ubuntu 안에서 설치하고 개발해요. 설치기와 스킬이 bash와 Linux 명령을 쓰기 때문이에요. PowerShell이나 Git Bash에서 실행하면 설치기가 WSL2를 안내하고 멈춰요. 설치 순서는 [Windows 준비](../../tutorials/reference/windows.md)와 템플릿 README의 Windows 절([neon](../../templates/prokit-next-neon/README.md#windows) · [supabase](../../templates/prokit-next-supabase/README.md#windows))에 있어요.

## 관련 문서

- [처음 한 시간](first-hour.md)
- [지원하는 에이전트](supported-agents.md)
- [빠른 시작: 화면만 만들기](quickstart-screens.md)
- [빠른 시작: 서비스 만들기](quickstart-service.md)
- [템플릿 고르기](../templates/choose.md)
- [Windows 준비](../../tutorials/reference/windows.md)
