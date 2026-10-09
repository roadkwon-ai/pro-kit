# 지원하는 에이전트
https://prokit-web.vercel.app/docs/start/supported-agents/

> 한눈에: 프로킷을 설치한 프로젝트는 Claude Code, Codex, Antigravity, Grok Build 중 어느 것으로 열어도 같은 규칙과 스킬로 일해요. 도구마다 읽는 파일 위치와 여는 명령만 조금 달라요.

## 도구별로 읽는 것

| | Claude Code | Codex | Antigravity | Grok Build |
|---|---|---|---|---|
| 규칙 | `CLAUDE.md`(`@AGENTS.md`로 `AGENTS.md`를 읽어요) | `AGENTS.md` | `AGENTS.md` | `AGENTS.md`, `CLAUDE.md` |
| 스킬 | `.claude/skills`(`.agents/skills`로 가는 링크) | `.agents/skills` | `.agents/skills` | `.agents/skills` |
| 서브에이전트 | `.claude/agents`(정본) | `.codex/agents`(생성물) | `.agents/agents`(생성물) | `.claude/agents` |
| 이미지 그리기 | `OPENAI_API_KEY`가 있으면 impeccable `generate-image`, 없으면 ChatGPT로 로그인한 Codex CLI(`gpt-image` 스킬) | 자체 도구 `image_gen` | 자체 도구 `generate_image` | 자체 도구 `image_gen` |
| 여는 명령 | `claude` | `codex` | `agy -i "<요청>"` | `grok --trust "<요청>"` |
| 묻지 않고 진행하게 열 때 | `claude --dangerously-skip-permissions` | `codex --yolo` | `agy --dangerously-skip-permissions` | `grok --permission-mode bypassPermissions` |

생성물은 `pnpm agents:sync`가 `.claude/agents`에서 만들어요. 그림을 그릴 길이 없으면 배치도로 구성을 골라요([UI/UX 흐름](https://prokit-web.vercel.app/docs/design/ui-flow/#이미지-그리기)). 묻지 않고 진행하게 여는 옵션은 위험도 함께 알고 써요([묻지 않고 진행하게 열기](https://prokit-web.vercel.app/tutorials/reference/claude-code-and-codex/#묻지-않고-진행하게-열기)).

## 자세히

### 신뢰 질문

새 프로젝트를 처음 열면 도구가 이 폴더를 믿을지 물어요. 동의해야 프로젝트 설정이 켜져요.

- Claude Code: 프로젝트 플러그인(superpowers, skill-creator, OMC, ponytail)
- Codex: `.codex/agents`의 구현·리뷰 에이전트. 스킬은 신뢰하지 않아도 보여요
- Grok Build: 규칙과 스킬. 신뢰하지 않은 폴더에서는 에이전트만 보여요. `grok --trust`로 열면 묻지 않고 신뢰해요

### 쓰지 않는 것과 대신하는 것

Antigravity는 Claude 플러그인 훅, OMC, OMX, gstack, impeccable 편집 훅을 쓰지 않아요. 그 자리는 Codex와 같은 대체 절차(설치된 프로젝트의 `.agents/skills/prokit-dev-cycle/references/process-routing.md`)가 맡고, 화면을 고친 뒤에는 critique의 detector로 확인해요.

Grok Build는 Claude 호환이 기본으로 켜져 있어 사용자 전역의 Claude 플러그인과 훅, `~/.claude/CLAUDE.md`, `~/.claude/skills`도 함께 불러와요. 신뢰한 폴더에서는 프로젝트 `.claude/settings.json`과 `settings.local.json`의 훅도 읽어요. 이 훅이 실제로 도는지는 확인하지 않았으므로, Grok Build에서도 화면을 고친 뒤 critique의 detector로 확인해요.

### 확인한 범위

2026-10-08에 Antigravity CLI 1.3.1과 Grok Build 1.0.46으로 확인했어요.

- Antigravity는 새로 설치한 프로젝트에서 첫 화면 제목을 바꾸는 라운드(케이스 B)를 사용자 확인 직전까지 진행했어요. `prokit-implementer`와 `prokit-reviewer`를 서브에이전트로 불렀고, `pnpm dev-cycle audit`에는 사용자 확인 행만 남았어요.
- Grok Build는 규칙, 스킬, 에이전트를 읽고 대조표를 여는 데까지 확인했어요. 리뷰와 audit은 무료 사용량 한도에 걸려 확인하지 못했어요.

기록은 템플릿의 `VERIFICATION.md`에 있어요([neon](https://github.com/roadkwon-ai/pro-kit/blob/main/templates/prokit-next-neon/VERIFICATION.md#antigravitygrok-build-2026-10-08-추가) · [supabase](https://github.com/roadkwon-ai/pro-kit/blob/main/templates/prokit-next-supabase/VERIFICATION.md#antigravitygrok-build-2026-10-08-추가)).

## 관련 문서

- [준비물](https://prokit-web.vercel.app/docs/start/requirements/)
- [구현 에이전트와 리뷰 에이전트](https://prokit-web.vercel.app/docs/concepts/agent-roles/)
- [Claude Code와 Codex](https://prokit-web.vercel.app/tutorials/reference/claude-code-and-codex/)
- [자주 묻는 질문](https://prokit-web.vercel.app/docs/reference/faq/)
