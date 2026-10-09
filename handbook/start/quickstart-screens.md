# 빠른 시작: 화면만 만들기

> 한눈에: DB 없이 화면만 먼저 만들어 볼 수 있어요. 작업 폴더에서 에이전트를 열고 프롬프트 하나를 보내면 pro-kit을 받는 일부터 모든 화면을 만들어 HTML 파일로 내보내는 일까지 이어져요. 코드를 몰라도 돼요.

## 흐름

1. **작업 폴더에서 에이전트 열기**: 프로젝트를 모아 둘 폴더(예: `~/projects`)에서 에이전트(<!-- v:agents.list -->Claude Code, Codex, Antigravity, Grok Build<!-- /v --> 중 하나)를 열어요.
2. **프롬프트 보내기**: 만들고 싶은 서비스를 한두 문장으로 적어 아래 프롬프트처럼 보내요.
3. **프로젝트 준비**: 에이전트가 pro-kit을 받아 DB 없는 프로젝트를 만들고, 전용 스킬과 검사 도구를 설치한 뒤 커밋해요. 끝나면 새 폴더에서 이어 갈 명령 한 줄을 알려 줘요.
4. **새 폴더에서 이어 가기**: 알려 준 한 줄로 새 폴더에서 에이전트를 열어요. 그 프로젝트의 규칙과 스킬은 새 폴더에서 열어야 켜져요.
5. **화면 만들기**: 화면 설계(사이트맵과 페이지), 디자인 스타일 추천과 `DESIGN.md`, 모든 페이지를 예시 데이터로 만들기, 검사, HTML 내보내기(`pnpm export:html`)까지 이어져요.

```text
https://github.com/roadkwon-ai/pro-kit 을 이 폴더에 받고, 그 안의 AGENTS.md대로 화면만 만들 프로젝트를 pro-kit 옆에 living 폴더로 만들어줘. DB는 쓰지 않아. 없는 준비물은 설치해줘. 같이 사는 사람들이 함께 쓴 생활비를 적고, 월말에 누가 누구에게 얼마를 보내면 되는지 알려 주는 서비스를 만들고 싶어. 필요한 화면을 모두 예시 데이터로 만들어줘. 로그인이나 저장 같은 기능은 빼고 화면만 만들어. 디자인 스타일은 서비스에 어울리는 걸로 추천해주고, 다 만들면 HTML 파일로 내보내줘.
```

단계별로 따라 하려면 튜토리얼 [컨셉으로 화면 만들기](../../tutorials/samples/README.md#가장-쉬운-방법)를 보세요. 프리셋과 같은 컨셉으로 만들어 볼 수도 있어요([프리셋으로 만들어 보기](../../tutorials/samples/README.md#프리셋으로-만들어-보기)).

## 자세히

### 프로젝트 준비 단계에서 에이전트가 하는 일

[AGENTS.md](../../AGENTS.md)의 "작업 폴더에서 시작했을 때"와 "화면만 만들기" 절을 따라요.

- **pro-kit 받기**: 작업 폴더에 `pro-kit`이 없으면 `git clone`으로 받고, 있으면 `git pull --ff-only`로 최신으로 맞춰요. 이어 받을 수 없는 옛 사본이면 멈추고 `pro-kit-old`로 이름을 바꾼 뒤 새로 받으라고 알려 줘요.
- **템플릿**: 화면만 만들 때는 `prokit-next-neon`으로 정하고 묻지 않아요. 로컬 DB와 첫 마이그레이션은 건너뛰어요.
- **첫 요청 저장**: 프롬프트에서 pro-kit 받기와 프로젝트 만들기 지시를 뺀 나머지(서비스 컨셉부터 끝까지)를 새 프로젝트의 `docs/first-request.md`에 적어요. 문장은 바꾸지 않아요.
- **화면만 프로젝트 표시**: 새 프로젝트의 `AGENTS.md` 맨 위에 "화면만 프로젝트" 한 줄을 넣어요. 그 프로젝트의 에이전트는 이 줄을 보고 DB 없이 화면만 만들어요([화면만 프로젝트와 HTML 내보내기](../design/screen-only.md)).
- **화면 디자인 검사 켜기**: `impeccable hooks on`을 에이전트가 직접 실행해요.
- **커밋과 보고**: 설치 결과와 포맷 정리를 커밋하고, 새 폴더에서 이어 갈 한 줄을 알려 줘요.

```bash
cd <프로젝트 절대 경로> && claude "docs/first-request.md의 요청대로 이어서 해줘"
```

다른 에이전트로 열었다면 `claude "…"` 대신 그 에이전트를 여는 명령이에요(Codex는 <!-- v:agent.codex.open -->codex<!-- /v -->, Antigravity는 <!-- v:agent.agy.open -->agy -i "<요청>"<!-- /v -->, Grok Build는 <!-- v:agent.grok.open -->grok --trust "<요청>"<!-- /v -->. [지원하는 에이전트](supported-agents.md)). 묻지 않고 진행하는 모드로 열었다면 같은 옵션(<!-- v:agent.claude.yoloCode -->`claude --dangerously-skip-permissions`<!-- /v -->, <!-- v:agent.codex.yoloCode -->`codex --yolo`<!-- /v -->, <!-- v:agent.agy.yoloCode -->`agy --dangerously-skip-permissions`<!-- /v -->, <!-- v:agent.grok.yoloCode -->`grok --permission-mode bypassPermissions`<!-- /v -->)이 붙어요([묻지 않고 진행하게 열기](../../tutorials/reference/claude-code-and-codex.md#묻지-않고-진행하게-열기)).

### 이렇게도 요청할 수 있어요

- pro-kit 폴더에서 에이전트를 열었다면 "화면만 만들 living 프로젝트 만들어줘"처럼 요청해도 돼요.
- 프롬프트 끝에 "GitHub Pages에 배포해줘"나 "Vercel에 배포해줘"를 붙이면 화면을 다 만든 뒤 인터넷에 올려요. 원격 저장소와 프로젝트 만들기까지 요청한 것으로 봐요. 토큰 준비는 [배포하기](../../tutorials/reference/deploy.md)에 있어요.
- 나중에 "실제 서비스로 바꿀 거야"라고 하면 로컬 DB와 첫 마이그레이션을 더해 로그인과 저장이 되는 개발로 이어져요.

## 관련 문서

- [준비물](requirements.md)
- [화면만 프로젝트와 HTML 내보내기](../design/screen-only.md)
- [UI/UX 흐름](../design/ui-flow.md)
- [GitHub Pages 배포](../deploy/github-pages.md)
- [튜토리얼: 컨셉으로 화면 만들기](../../tutorials/samples/README.md)
