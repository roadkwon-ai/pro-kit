# 준비물
https://prokit-web.vercel.app/docs/start/requirements/

> 한눈에: 프로킷으로 프로젝트를 만들려면 컴퓨터에 몇 가지 프로그램이 있어야 해요. 화면만 만들 때는 Node, pnpm, git이면 되고, 로그인과 DB까지 갖춘 서비스를 만들 때는 내 컴퓨터에 DB를 띄울 프로그램이 더 필요해요. Windows에서는 Windows 안에서 Linux를 쓰게 해 주는 기능(WSL2)의 Ubuntu에서 진행해요.

## 무엇이 필요한가요

| 준비물 | 화면만 만들기 | 서비스 (neon) | 서비스 (supabase) | 쓰는 곳 |
|---|---|---|---|---|
| AI 에이전트 (Claude Code, Codex, Antigravity, Grok Build 중 하나. [지원하는 에이전트](https://prokit-web.vercel.app/docs/start/supported-agents/)) | 필요 | 필요 | 필요 | 요청하고 개발하기 |
| Node 22.20 이상(24 권장) | 필요 | 필요 | 필요 | 앱과 설치기 실행 |
| pnpm | 필요 | 필요 | 필요 | 패키지 설치와 명령 실행 |
| git | 필요 | 필요 | 필요 | pro-kit 받기, 커밋 |
| 컨테이너 엔진 (Podman 또는 Docker) | 필요 없음 | 필요 (compose provider 포함) | 필요 | 내 컴퓨터의 개발용 DB |
| Supabase CLI 2.117 이상 | 필요 없음 | 필요 없음 | 필요 | Supabase 로컬 스택 |

필요할 때만 있으면 되는 것도 있어요.

| 도구 | 언제 |
|---|---|
| Neon CLI (`npm install -g neon`) | neon 템플릿에서 원격 DB를 쓸 때. 로컬 개발만 할 때는 없어도 돼요 |
| 원격 Supabase 프로젝트 두 개 (스테이징, 운영) | supabase 템플릿에서 병합 전 검증과 운영 DB를 쓸 때 |
| Vercel CLI (`npm install -g vercel`)와 Vercel 계정 | develop과 운영에 배포할 때 |
| ego lite (macOS) | 브라우저로 화면을 확인할 때 먼저 쓰는 도구 |
| agent-browser CLI | ego lite를 쓸 수 없을 때의 브라우저 확인 도구. 없거나 npm 최신판보다 낮으면 기본으로 최신판을 설치 |

앱 스택, CLI 도구, 외부 서비스 전체는 [쓰는 기술과 도구](https://prokit-web.vercel.app/docs/reference/tech-stack/)에 모았어요. 에이전트 설치와 로그인은 튜토리얼 [시작하기](https://prokit-web.vercel.app/tutorials/start/)에 있어요. 요금제는 [비용과 키](https://prokit-web.vercel.app/tutorials/reference/costs-and-keys/)를 보세요.

## 자세히

### 에이전트가 먼저 확인해요

프로젝트를 만들어 달라고 하면 에이전트가 준비물부터 확인해요([AGENTS.md](https://github.com/roadkwon-ai/pro-kit/blob/main/AGENTS.md) "템플릿으로 새 프로젝트 만들기" 3번).

- 빠진 것이 있으면 설치 명령을 알려 주고 멈춰요. 전역 설치는 사용자가 요청할 때만 해요.
- 화면만 만들 때는 컨테이너 엔진을 확인하지 않아요. 요청에 "없는 준비물은 설치해줘"가 있으면 빠진 Node 22.20 이상, pnpm, git을 에이전트가 설치해요. 비밀번호가 필요한 명령은 실행하지 않고 사용자에게 알려 줘요.
- Node는 22.20 이상이면 돼요. 이보다 낮으면 설치기가 멈춰요(새 프로젝트를 만들고 스킬을 받는 도구가 요구하는 하한이에요). 새로 설치한다면 지금 LTS인 24를 받으세요. 24 미만이면 설치기가 권장 경고만 내요. Node 20은 2026-04-30에 지원이 끝났어요. Vercel에 배포할 때는 프로젝트의 Node.js를 24.x로 둬요.

### 컨테이너 엔진

- neon 템플릿은 compose로 로컬 Postgres를 띄워요. `podman compose`는 외부 provider(docker-compose나 podman-compose)를 부르므로 둘 중 하나가 있어야 해요.
- macOS에서 Podman을 쓰면 머신을 먼저 켜야 해요(`podman machine init`, `podman machine start`). 에이전트는 머신이 멈춰 있으면 켜고 보고하고, 머신이 없으면 `podman machine init`을 안내하고 멈춰요. Linux와 WSL의 Podman에는 머신이 없어요.
- supabase 템플릿에서 Podman을 쓰면 Supabase CLI를 쓰는 셸마다 `DOCKER_HOST`를 설정해요. 값은 macOS와 Linux·WSL이 달라요(템플릿 README [준비물](https://github.com/roadkwon-ai/pro-kit/blob/main/templates/prokit-next-supabase/README.md#준비물)).

### 브라우저 확인 도구

- macOS에서는 [ego lite](https://lite.ego.app/)를 먼저 써요. 스크린샷을 찍는 동안 ego lite 창이 화면에 보여야 해요.
- Windows, Linux, CI, Codex 샌드박스처럼 ego lite를 쓸 수 없는 곳에서는 agent-browser CLI를 써요. agent-browser CLI는 없거나 npm 최신판보다 낮으면 기본으로 최신판을 설치해요.

### 전역에만 설치되는 도구

agent-browser CLI, OMX CLI(`oh-my-codex`), gstack, Vercel CLI, Neon CLI 또는 Supabase CLI, ego lite는 프로젝트가 아니라 컴퓨터 전체에 설치돼요. agent-browser CLI는 없거나 npm 최신판보다 낮으면 기본으로 최신판을 설치해요. 나머지는 기본 실행에서 없는 것과 설치 명령만 알려 주고, `--with-global`을 주면 ego lite를 뺀 나머지 중 없는 것만 설치해요([설치기와 옵션](https://prokit-web.vercel.app/docs/templates/installer/)). 모두 없어도 dev-cycle은 진행돼요.

### Windows

Windows에서는 WSL2의 Ubuntu 안에서 설치하고 개발해요. 설치기와 스킬이 bash와 Linux 명령을 쓰기 때문이에요. PowerShell이나 Git Bash에서 실행하면 설치기가 WSL2를 안내하고 멈춰요. 설치 순서는 [Windows 준비](https://prokit-web.vercel.app/tutorials/reference/windows/)와 템플릿 README의 Windows 절([neon](https://github.com/roadkwon-ai/pro-kit/blob/main/templates/prokit-next-neon/README.md#windows) · [supabase](https://github.com/roadkwon-ai/pro-kit/blob/main/templates/prokit-next-supabase/README.md#windows))에 있어요.

## 관련 문서

- [지원하는 에이전트](https://prokit-web.vercel.app/docs/start/supported-agents/)
- [빠른 시작: 화면만 만들기](https://prokit-web.vercel.app/docs/start/quickstart-screens/)
- [빠른 시작: 서비스 만들기](https://prokit-web.vercel.app/docs/start/quickstart-service/)
- [템플릿 고르기](https://prokit-web.vercel.app/docs/templates/choose/)
- [Windows 준비](https://prokit-web.vercel.app/tutorials/reference/windows/)
