# 1장. 프로젝트 만들기

## 이번 장에서 할 일

<!-- b:clone-create-intro name=nextflix -->
pro-kit으로 Nextflix 프로젝트를 만들어요. 이 장에서 만드는 건 **빈 프로젝트**예요. 서비스를 담을 틀과 규칙, 스킬, 전문 에이전트, 내 컴퓨터에 켠 [DB](../reference/glossary.md#만들기)(서비스의 데이터를 저장하는 곳)만 들어 있고, 내 서비스는 2~3장에서 기획과 디자인을 한 뒤 4장부터 화면을 만들어요.
<!-- /b -->

<!-- b:clone-create-easy-note auth=05-auth-profiles.md -->
> [!NOTE]
> [가장 쉬운 방법](README.md#가장-쉬운-방법)으로 시작했다면 1~4장은 에이전트가 이미 했어요. [5장](05-auth-profiles.md)으로 가세요.
<!-- /b -->

## 1. 프로젝트 만들기

<!-- b:clone-create-where name=nextflix neun=는 -->
**pro-kit 폴더(`~/projects/pro-kit`)에서 연 에이전트에 붙여 넣으세요([시작하기](../start/README.md#pro-kit-폴더에서-열기)의 "pro-kit 폴더에서 열기").**

`[nextflix]`는 프로젝트 폴더 이름이에요. 영어 소문자와 `-`로 바꿔도 돼요. 폴더 이름을 바꿨다면 이후 명령의 `nextflix`도 내 폴더 이름으로 바꿔요.
<!-- /b -->

<!-- b:clone-create-prompt name=nextflix -->
```prompt
neon 템플릿으로 [nextflix] 프로젝트 만들어줘.
```

neon 템플릿은 pro-kit의 두 템플릿 가운데 하나예요. 개발할 때는 내 컴퓨터의 DB를 쓰고, 배포할 때는 [Neon](../reference/glossary.md#올리기)(인터넷에 있는 DB 서비스)에 올리는 구성이에요.

에이전트는 이런 순서로 일해요. 옵션 없이 열었다면 명령마다 허락을 물어요. 읽어 보고 허락하세요.

1. 준비물(Node 22.20 이상, pnpm, git, Docker 또는 Podman)이 있는지 확인해요. 없으면 설치 방법을 알려 주고 멈춰요.
2. 최신 Better-T-Stack(웹 서비스의 기본 틀을 한 번에 만들어 주는 도구)으로 웹 프로젝트를 만들고, pro-kit을 설치해요. 에이전트 규칙, 스킬, 검사 도구가 들어가요.
3. 내 컴퓨터에 DB를 켜고, 로그인 정보를 담을 표를 만드는 첫 [마이그레이션](../reference/glossary.md#만들기)(DB의 표를 만들거나 바꾸는 기록)을 적용해요.
4. 코드 모양을 정리하고 검사한 뒤 첫 기록(커밋)을 남겨요.

**이렇게 되면 성공**
- 보고에 프로젝트 위치(`~/projects/nextflix`)와 로컬 DB 주소, DB를 끄는 명령이 나와요.
- 검사가 모두 통과했다고 알려 줘요.
- 새 프로젝트 폴더에서 에이전트를 새로 열라고 안내해요.

보고에는 내가 할 일도 함께 나와요. 이 튜토리얼에서는 이렇게 하면 돼요.

| 보고에 나오는 할 일 | 언제 하나요 |
|---|---|
| 새 세션에서 폴더를 믿을지 묻는 질문에 동의 | 이 장 2단계 |
| `impeccable hooks on` 실행 | 이 장 2단계 |
| `GLOSSARY.md`, `docs/domain/project.md` 채우기 | `GLOSSARY.md`는 2장에서 에이전트가 채워요. `docs/domain/project.md`는 화면과 기능을 만들 때 에이전트가 함께 채워요 |
| [원격 DB](../reference/glossary.md#올리기)(인터넷에 둔 DB) 연결, 배포 준비 | [12장](12-deploy.md)(선택) |
| 선택 스킬 묶음 설치 | 지금은 넘어가요 |
| 이미지 그리기 | 이 장 3단계(선택). 시안을 그릴 때만 해요 |
<!-- /b -->

<details>
<summary>막히면</summary>

<!-- b:clone-create-trouble name=nextflix -->
- **준비물이 없다고 멈췄어요**: `없는 준비물은 설치해줘`라고 보내세요. 비밀번호가 필요한 명령은 에이전트가 알려 준 대로 새 터미널 창에서 직접 실행하고, 끝나면 `설치했어. 이어서 해줘`라고 보내세요.
- **Docker나 Podman이 없대요**: 이 튜토리얼은 DB를 써서 꼭 필요해요. [Docker Desktop](https://www.docker.com/products/docker-desktop/)을 받아 설치하고 앱을 켜 둔 뒤 `설치했어. 이어서 해줘`라고 보내세요. Windows는 [Windows 준비](../reference/windows.md#2-docker-desktop-설치-실제-서비스로-만들-때만)를 보세요.
- **Podman 머신이 꺼져 있거나 없대요**: 꺼져 있으면 에이전트가 켜요. 없으면 에이전트가 알려 준 명령(`podman machine init`)을 터미널에서 실행하고, 끝나면 `만들었어. 이어서 해줘`라고 보내세요.
- **5432 포트가 이미 쓰이고 있대요**: 내 컴퓨터의 다른 DB가 같은 번호(포트)를 쓰고 있을 때예요. 에이전트가 보통 다른 번호로 바꿔요. 멈췄다면 `DB 포트가 겹친대. 다른 포트로 바꿔줘`라고 보내세요.
- **같은 이름의 폴더가 이미 있대요**: `nextflix2라는 이름으로 만들어줘`처럼 다른 이름을 보내세요.
- **Windows에서 WSL을 쓰라며 멈췄어요**: [Windows 준비](../reference/windows.md)대로 Ubuntu 창에서 다시 하세요.
- 그 밖의 문제는 [막혔을 때](../reference/troubleshooting.md)를 보세요.
<!-- /b -->

</details>

## 2. 새 폴더에서 에이전트 열기

<!-- b:clone-create-reopen -->
**새 프로젝트의 규칙, 스킬, 전문 에이전트는 그 폴더에서 에이전트를 열어야 켜져요.** 2장부터는 모두 이 폴더에서 해요. 대화창에 `/exit`(Codex는 `/quit`)를 입력해 닫고, 터미널에 입력하세요.
<!-- /b -->

<!-- b:open-with-hooks folder=nextflix -->
```bash
cd ~/projects/nextflix
.agents/skills/impeccable/scripts/impeccable hooks on
claude --dangerously-skip-permissions   # Codex는 codex --yolo
```
<!-- /b -->

<!-- b:clone-create-hooks -->
두 번째 줄은 화면 파일을 고칠 때마다 디자인 검사기가 결과를 알려 주게 켜는 명령이에요. 처음 한 번만 하면 돼요. 폴더를 믿을지 물으면 "예"를 고르세요([폴더를 믿을지 물을 때](../reference/claude-code-and-codex.md#폴더를-믿을지-물을-때)).

Codex로 열었다면 대화창에 `/hooks`를 입력해 디자인 검사기 훅을 믿는다고 확인하세요.
<!-- /b -->

## 3. (선택) 시안을 그리려면

<!-- b:clone-create-mockup-prep pic="작품 그림" home="홈 화면" -->
작품 그림은 [프리셋 팩](../reference/glossary.md#만들기)(만들 서비스의 화면 구성, 기능 규칙, 디자인 노트, 예시 데이터, 그림을 묶어 둔 폴더)에서 받고, 3장의 홈 화면 구성은 [구성도](../reference/glossary.md#디자인)(고르기 페이지가 직접 그리는 화면 구성 그림)로 골라요. **기본 흐름에는 AI로 그릴 그림이 없어서 이 단계는 건너뛰어도 돼요.**

구성도 대신 시안(완성 화면을 미리 그린 그림)을 그려서 고르고 싶을 때만 준비하세요.

- **Codex, Antigravity, Grok Build**: 자체 이미지 도구로 그려서 준비할 것이 없어요.
- **Claude Code**: 스스로 그리지 못해서 이미지 API 연결이 필요해요. 둘 중 하나를 준비하세요.
  - **유료 OpenAI API 키가 있으면**: 작업 폴더 `~/projects`에 `.env` 파일을 만들고 키를 적어 저장하세요. 그린 장수만큼 내 OpenAI 계정에 요금이 나와요.
  - **ChatGPT 유료 요금제가 있으면**: Codex CLI를 설치하고 ChatGPT로 로그인해 두세요.

방법은 [이미지 그리기](../reference/costs-and-keys.md#이미지-그리기)에 있어요. 준비를 마치면 에이전트를 닫았다가 2단계처럼 다시 여세요. 2장을 시작하기 전에 해 두면 대화를 끊지 않고 3장까지 갈 수 있어요.
<!-- /b -->

## 에이전트가 물어보면

<!-- b:clone-create-qa -->
| 질문 | 답 |
|---|---|
| 프로젝트를 어디에 만들지 | 기본 위치(pro-kit 옆) 그대로 |
| 명령을 실행해도 되는지 | 내용을 읽어 보고 허락 |
| 이 폴더를 믿을지(새 폴더에서 처음 열 때) | 예 |

다음: [2장. 서비스 기획](02-plan.md)
<!-- /b -->
