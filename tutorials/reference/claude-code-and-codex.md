# 에이전트별 차이
https://prokit-web.vercel.app/tutorials/reference/claude-code-and-codex/

튜토리얼의 프롬프트는 지원하는 에이전트 4개(Claude Code, Codex, Antigravity, Grok Build) 중 어디에 붙여 넣어도 돼요. pro-kit이 네 에이전트에 같은 규칙과 스킬을 설치하기 때문이에요. 다른 점은 설치, 조작, 질문하는 방식 정도예요.

튜토리얼은 Claude Code와 Codex로 확인했어요. 아래 표와 튜토리얼의 명령도 이 두 에이전트 기준이에요. Antigravity와 Grok Build는 [Antigravity와 Grok Build](https://prokit-web.vercel.app/tutorials/reference/claude-code-and-codex/#antigravity와-grok-build)를 보세요. 에이전트마다 읽는 파일은 문서의 [지원하는 에이전트](https://github.com/roadkwon-ai/pro-kit/blob/main/handbook/start/supported-agents.md)에 있어요.

| 항목 | Claude Code | Codex |
|---|---|---|
| 만든 곳 | Anthropic | OpenAI |
| 필요한 계정 | Claude 유료 요금제(Pro, Max, Team, Enterprise) 또는 Claude Console | ChatGPT 유료 요금제(Plus, Pro, Business, Edu, Enterprise) |
| 설치 | `curl -fsSL https://claude.ai/install.sh \| bash` | `curl -fsSL https://chatgpt.com/codex/install.sh \| sh` |
| 열기 | `claude` | `codex` |
| 묻지 않고 진행하게 열기 | `claude --dangerously-skip-permissions` | `codex --yolo` |
| 닫기 | `/exit` | `/quit` |
| 하던 일 멈추기 | `Esc` | `Esc` |
| 지난 대화 이어 하기 | `claude --continue` | `codex resume` |
| 업데이트 | `claude update` | `codex update` |
| 이미지 그리기(시안, 사진) | ChatGPT 유료 요금제와 Codex CLI, 또는 유료 OpenAI API 키가 있어야 그려요([이미지 그리기](https://prokit-web.vercel.app/tutorials/reference/costs-and-keys/#이미지-그리기)) | 자체 도구(image_gen)로 준비 없이 그려요 |

## 질문에 답하는 법

- **Claude Code**는 질문을 선택지로 보여 줘요. 방향키로 고르고 엔터를 누르세요. 원하는 답이 없으면 직접 입력하는 칸을 고르면 돼요.
- **Codex**는 보통 글로 물어봐요. 대화창에 답을 써서 보내세요.

어느 쪽이든 튜토리얼의 질문 표(소개 쪽의 질문 표, 장마다 있는 "에이전트가 물어보면")에 고를 답이 있어요. 잘 모르겠으면 `추천대로 해줘`라고 보내도 돼요.

## 허락을 구할 때

옵션 없이 열면 에이전트가 명령을 실행하거나 파일을 바꾸기 전에 허락을 구해요. 무엇을 하려는지 한 줄씩 보여 주니 읽어 보고 허락하세요. 이해가 안 되면 "이 명령이 뭘 하는지 쉽게 설명해줘"라고 물어보면 돼요.

## 묻지 않고 진행하게 열기

튜토리얼에는 설치하고 검사하는 명령이 많아서, 명령마다 허락하다 보면 오래 걸려요. 그래서 튜토리얼에서는 **묻지 않고 진행하는 옵션**을 붙여 에이전트를 열어요.

| 에이전트 | 여는 명령 |
|---|---|
| Claude Code | `claude --dangerously-skip-permissions` |
| Codex | `codex --yolo` |
| Antigravity | `agy --dangerously-skip-permissions` |
| Grok Build | `grok --permission-mode bypassPermissions` |

Claude Code는 이 옵션으로 처음 열 때 경고 화면이 나와요. 읽어 보고 `Yes, I accept`를 고르세요.

옵션 이름에 "dangerously(위험하게)"가 들어간 데는 이유가 있어요. 이 옵션으로 연 에이전트는 묻지 않고 파일을 바꾸거나 지우고, 프로그램을 설치하고, 인터넷에서 파일을 받아요. 폴더 안에서 열어도 폴더 밖까지 보호되지는 않아요. 컴퓨터 전체에 프로그램을 설치하거나 홈 폴더의 파일을 바꾸는 일도 묻지 않고 해요. Codex의 `--yolo`는 허락 질문과 함께 격리 장치(샌드박스)도 꺼요.

> [!WARNING]
> - **작업 폴더(`~/projects`)나 그 안의 프로젝트 폴더에서만 여세요.** 홈 폴더나 중요한 문서가 있는 폴더에서는 열지 마세요.
> - 출처를 모르는 프롬프트나 저장소 주소는 붙여 넣지 마세요. 그 안에 숨은 명령도 묻지 않고 실행돼요.
> - 키나 비밀번호는 대화창에 붙여 넣지 마세요.
> - 에이전트가 이상한 일을 하면 `Esc`로 바로 멈추세요.
> - 회사 컴퓨터라면 보안 규칙을 먼저 확인하세요.
>
> 걱정되면 옵션 없이 `claude`(Codex는 `codex`)로 여세요. 명령마다 허락을 물어서 느리지만 더 안전해요. 튜토리얼의 프롬프트는 어느 쪽으로 열어도 똑같이 쓸 수 있어요.

## 폴더를 믿을지 물을 때

프로젝트 폴더에서 처음 열면 "이 폴더를 믿을지" 물어요. 튜토리얼에서 만든 폴더라면 "예"를 고르세요. 믿어야 pro-kit이 설치한 에이전트와 플러그인이 켜져요.

## 스킬 이름을 몰라도 돼요

pro-kit에는 화면 디자인, 기능 개발, 검사, 배포를 돕는 스킬(에이전트용 작업 설명서)이 들어 있어요. 평소 말로 부탁하면 에이전트가 맞는 스킬을 알아서 불러요. 직접 부르고 싶을 때만 Claude Code는 `/스킬이름`, Codex는 `$스킬이름`을 써요(예: `/prokit-ui`, `$prokit-ui`).

## Antigravity와 Grok Build

Google Antigravity와 xAI Grok Build도 Codex처럼 pro-kit의 `AGENTS.md` 규칙과 `.agents/skills`의 스킬을 읽어요. 그래서 튜토리얼의 프롬프트를 그대로 보내면 돼요. 다만 튜토리얼 전체를 이 둘로 따라 해 보지는 않았어요. Antigravity로는 첫 화면 제목을 바꾸는 라운드를 내가 확인하기 직전까지 진행해 봤고, Grok Build로는 규칙과 스킬을 읽고 라운드를 여는 데까지 확인했어요(2026-10-08).

| 구분 | Antigravity | Grok Build |
|---|---|---|
| 만든 곳 | Google | xAI |
| 열기 | `agy` | `grok --trust` |
| 요청과 함께 열기 | `agy -i "<요청>"` | `grok --trust "<요청>"` |
| 묻지 않고 진행하게 열기 | `agy --dangerously-skip-permissions` | `grok --permission-mode bypassPermissions` |
| 이미지 그리기(시안, 사진) | 자체 도구(generate_image)로 준비 없이 그려요 | 자체 도구(image_gen)로 준비 없이 그려요 |

- **설치와 로그인**: 각 도구의 공식 안내를 따르세요. 튜토리얼의 [시작하기](https://prokit-web.vercel.app/tutorials/start/)는 Claude Code와 Codex로 설명해요.
- **새 폴더에서 이어 가기**: 작업 폴더에서 첫 프롬프트를 보내면 에이전트가 이어 갈 한 줄을 지금 쓰는 에이전트의 명령으로 알려 줘요. 예: `cd ~/projects/living && agy -i "docs/first-request.md의 요청대로 이어서 해줘"`
- **폴더 신뢰**: Grok Build는 폴더를 믿어야 규칙과 스킬을 읽어요. `--trust`를 붙여 열면 묻지 않고 믿어요.
- **디자인 검사기 훅**: Antigravity에서는 화면 파일을 고칠 때마다 도는 디자인 검사기 훅이 돌지 않아요. 화면을 고친 뒤 에이전트가 디자인 리뷰(critique)로 따로 확인해요.
- 닫기, 하던 일 멈추기, 지난 대화 이어 하기는 각 도구의 안내를 보세요.

## 튜토리얼과 결과가 달라도 괜찮아요

같은 프롬프트라도 에이전트, 모델, 그날의 판단에 따라 디자인과 문구가 조금씩 달라져요. 튜토리얼의 스크린샷은 한 예시예요. 각 튜토리얼 소개 쪽의 "만든 기록"에 어떤 에이전트로 만들었는지 적어 두었어요.
