# 시작하기
https://prokit-web.vercel.app/tutorials/start/

튜토리얼을 시작하기 전에 딱 한 번 하는 준비예요. **에이전트 하나를 설치하고 로그인하면 끝이에요.** pro-kit을 받고 필요한 프로그램을 갖추는 일은 튜토리얼의 첫 프롬프트를 받은 에이전트가 해요.

> [!NOTE]
> 에이전트는 Claude Code, Codex, Antigravity, Grok Build 중 하나만 있으면 돼요. 이미 쓰는 요금제에 맞춰 고르세요. 이 쪽은 튜토리얼을 확인한 Claude Code와 Codex로 설명해요. 에이전트마다 필요한 요금제와 조작 차이, Antigravity와 Grok Build로 여는 법은 [에이전트별 차이](https://prokit-web.vercel.app/tutorials/reference/claude-code-and-codex/)에 있어요.

## 1. 준비할 것

| 무엇 | 설명 |
|---|---|
| 컴퓨터 | macOS, 또는 WSL2를 켠 Windows. Windows라면 [Windows 준비](https://prokit-web.vercel.app/tutorials/reference/windows/)를 먼저 하고 오세요 |
| 에이전트 요금제 | 쓰려는 에이전트의 유료 요금제. Claude Code는 Claude, Codex는 ChatGPT 요금제예요. 요금제 이름은 [에이전트별 차이](https://prokit-web.vercel.app/tutorials/reference/claude-code-and-codex/)에 있어요 |
| (선택) 이미지 그리기 준비 | Claude Code로 화면 시안과 사진을 AI로 그릴 때만 필요해요. ChatGPT 유료 요금제(Codex CLI로 그려요)나 유료 OpenAI API 키 중 하나이고, 튜토리얼의 첫 프롬프트를 보내기 전에 해요. Codex, Antigravity, Grok Build는 준비 없이 그려요. 없어도 튜토리얼을 끝까지 할 수 있어요. [이미지 그리기](https://prokit-web.vercel.app/tutorials/reference/costs-and-keys/#이미지-그리기) |

## 2. 터미널 열기

터미널은 글자로 컴퓨터에 명령하는 프로그램이에요. 이 튜토리얼에서 터미널에 직접 치는 명령은 몇 개뿐이고, 나머지는 에이전트에게 말로 부탁해요.

- **macOS**: `Command + Space`를 누르고 "터미널"을 입력한 뒤 엔터를 누르세요.
- **Windows**: 시작 메뉴에서 "Ubuntu"를 여세요(WSL2 준비를 마친 뒤).

## 3. 에이전트 설치하기

쓰려는 에이전트 하나만 설치하세요. 아래 명령을 복사해 터미널에 붙여 넣고 엔터를 누르면 돼요. Antigravity나 Grok Build는 [에이전트별 차이](https://prokit-web.vercel.app/tutorials/reference/claude-code-and-codex/#antigravity와-grok-build)를 보세요.

**Claude Code**

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Codex**

```bash
curl -fsSL https://chatgpt.com/codex/install.sh | sh
```

설치가 끝나면 터미널을 닫았다가 다시 열고, 버전이 나오는지 확인하세요.

```bash
claude --version   # Claude Code
codex --version    # Codex
```

<details>
<summary>막히면</summary>

- **`command not found`가 나와요**: 터미널을 완전히 닫고 다시 열어 보세요. 그래도 같으면 설치 명령을 한 번 더 실행하고, 마지막에 나오는 안내 문장(경로를 추가하라는 말)을 그대로 따라 하세요.
- **Homebrew를 쓰고 있어요**: `brew install --cask claude-code` 또는 `brew install --cask codex`로 설치해도 돼요.

</details>

## 4. 로그인하기

터미널에 에이전트 이름을 치면 처음 한 번 로그인 화면이 나와요.

```bash
claude   # Claude Code
codex    # Codex
```

- **Claude Code**: 브라우저가 열리면 Claude 계정으로 로그인하세요. 터미널에 로그인 성공 문구가 나오면 엔터를 누르세요.
- **Codex**: "Sign in with ChatGPT"를 고르고, 열린 브라우저에서 ChatGPT 계정으로 로그인하세요.

로그인이 끝나면 `/exit`(Codex는 `/quit`)를 입력해 에이전트를 닫으세요.

## 5. 작업 폴더에서 에이전트 열기

pro-kit과 튜토리얼에서 만드는 프로젝트는 모두 작업 폴더 `~/projects`에 생겨요. 터미널에 입력하세요.

```bash
mkdir -p ~/projects && cd ~/projects
claude --dangerously-skip-permissions   # Codex는 codex --yolo
```

`--dangerously-skip-permissions`(Codex는 `--yolo`)는 **명령마다 허락을 묻지 않고 진행하는 옵션**이에요. 설치하고 검사하는 명령이 많아서 편의상 이 옵션으로 열어요. Claude Code는 처음 한 번 경고 화면이 나와요. 읽어 보고 `Yes, I accept`를 고르세요. 폴더를 믿을지 물으면 "예"를 고르세요.

> [!WARNING]
> 이 옵션으로 연 에이전트는 묻지 않고 파일을 바꾸거나 지우고, 프로그램을 설치하고, 인터넷에서 파일을 받아요. 폴더 안에서 열어도 폴더 밖까지 보호되지는 않아요. Codex의 `--yolo`는 격리 장치(샌드박스)도 함께 꺼요. **작업 폴더나 그 안의 프로젝트 폴더에서만 열고**, 출처를 모르는 프롬프트나 저장소 주소는 붙여 넣지 마세요. 이상한 일을 하면 `Esc`로 바로 멈추세요. 걱정되면 옵션 없이 `claude`(Codex는 `codex`)로 여세요. 명령마다 허락을 물어서 느리지만 더 안전해요. 자세한 내용은 [묻지 않고 진행하게 열기](https://prokit-web.vercel.app/tutorials/reference/claude-code-and-codex/#묻지-않고-진행하게-열기)에 있어요.

이제 준비가 끝났어요. 고른 튜토리얼의 첫 프롬프트를 붙여 넣으세요. 예: [컨셉으로 화면 만들기의 첫 프롬프트](https://prokit-web.vercel.app/tutorials/samples/#2-프롬프트-하나로-프로젝트-시작하기)

> [!TIP]
> 작업 폴더는 **새 프로젝트를 만들 때** 에이전트를 여는 곳이에요. 만든 프로젝트를 고치거나 이어서 개발할 때는 그 프로젝트 폴더(예: `~/projects/living`)에서 에이전트를 여세요. 프로젝트의 규칙, 스킬, 전문 에이전트는 그 폴더에서 열어야 켜져요.

## 직접 준비하기 (선택)

에이전트에게 맡기지 않고 pro-kit을 직접 받거나, 필요한 프로그램을 먼저 갖춰 두고 싶을 때 해요. 튜토리얼의 "장별로 자세히"는 이렇게 준비한 상태에서 시작해요.

### pro-kit 받기

세 가지 방법 중 편한 것 하나를 고르세요.

**에이전트에게 부탁하기**: 5단계에서 연 에이전트에 붙여 넣으세요. 필요한 프로그램도 함께 확인해요.

```prompt
pro-kit을 쓰려고 해. 다음을 순서대로 해줘.
1. 내 컴퓨터에 Node 22.20 이상(24 권장), pnpm, git이 있는지 확인해줘. Docker(또는 Podman)는 실제 서비스를 만들 때만 필요하니 있는지만 알려줘.
2. 없는 게 있으면 무엇을 설치할지 먼저 보여주고, 내가 허락하면 설치해줘.
   비밀번호를 물어보는 명령은 내가 터미널에서 직접 실행하게 명령만 알려줘.
3. 다 갖춰지면 https://github.com/roadkwon-ai/pro-kit 저장소를 이 폴더 안에 pro-kit 폴더로 받아줘.
```

**터미널로 받기(git clone)**: 브라우저로 [pro-kit 저장소](https://github.com/roadkwon-ai/pro-kit)에 들어가 초록색 `Code` 버튼을 누르고 주소를 복사해요. 작업 폴더에서 `git clone` 뒤에 붙여 넣어요. macOS에서 git을 설치하라는 창이 뜨면 "설치"를 누르고, 끝나면 다시 입력하세요.

```bash
cd ~/projects
git clone https://github.com/roadkwon-ai/pro-kit.git
```

**ZIP으로 받기**: 같은 `Code` 버튼에서 `Download ZIP`을 누르고 받은 파일의 압축을 풀어요. 풀린 폴더(`pro-kit-main`)의 이름을 `pro-kit`으로 바꿔 작업 폴더(홈 폴더의 `projects`)로 옮겨요. ZIP으로 받으면 새 판이 나왔을 때 다시 받아야 해요. Windows(WSL)는 터미널로 받는 게 편해요.

**이렇게 되면 성공**
- `~/projects/pro-kit` 폴더가 생겨요.
- 에이전트에게 부탁했다면 준비물 세 가지(Node, pnpm, git)가 모두 있다고 알려 줘요.

<details>
<summary>막히면</summary>

- **Docker가 없대요**: 화면만 만들 때는 없어도 돼요. 실제 서비스를 만들 때 [docker.com](https://www.docker.com/products/docker-desktop/)에서 Docker Desktop을 받아 설치하고 앱을 켜 두세요(macOS는 메뉴 막대에 고래 아이콘이 보여요).
- **에이전트가 중간에 멈췄어요**: "하던 작업 이어서 해줘"라고 보내세요.
- **Podman 머신이 꺼져 있다고 해요**: "켜줘"라고 답하세요.
- **Neon CLI나 Vercel CLI가 없다고 해요**: 배포할 때만 필요해요. 지금은 넘어가도 돼요.
- 그 밖의 문제는 [막혔을 때](https://prokit-web.vercel.app/tutorials/reference/troubleshooting/)를 보세요.

</details>

### pro-kit 폴더에서 열기

pro-kit은 새 프로젝트를 만들어 주는 생성기예요. 생성기의 규칙을 에이전트가 읽도록, 그 폴더에서 에이전트를 새로 열어요. 대화창에 `/exit`(Codex는 `/quit`)를 입력해 닫은 뒤 터미널에 입력하세요.

```bash
cd ~/projects/pro-kit
claude --dangerously-skip-permissions   # Codex는 codex --yolo
```

폴더를 믿을지 물으면 "예"를 고르세요. 이제 고른 튜토리얼의 "장별로 자세히" 1장으로 가면 돼요.

## 알아 두면 좋은 조작

프롬프트는 붙여 넣고 엔터, 하던 일은 `Esc`로 멈춰요. 닫기와 지난 대화 이어 하기는 에이전트마다 명령이 달라요. 한눈에 보는 표는 [에이전트별 차이](https://prokit-web.vercel.app/tutorials/reference/claude-code-and-codex/)에 있어요.

> [!TIP]
> 사용량 한도에 걸리면 에이전트가 멈춰요. 안내된 시간이 지난 뒤 같은 폴더에서 에이전트를 열고 "하던 작업 이어서 해줘"라고 보내면 돼요. 자세한 내용은 [5시간 한도에 걸리면](https://prokit-web.vercel.app/tutorials/reference/costs-and-keys/#5시간-한도에-걸리면)에 있어요.
