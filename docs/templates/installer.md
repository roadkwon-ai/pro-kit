# 설치기와 옵션
https://prokit-web.vercel.app/docs/templates/installer/

> 한눈에: 템플릿은 명령 하나로 새 프로젝트에 설치돼요. 이미 있는 파일은 건드리지 않고, 여러 번 실행해도 결과가 같아요. 설치한 뒤에는 DB 준비, 코드 정리와 저장(커밋), 새 대화 열기 순서로 마무리해요.

## 실행하기

```bash
bash <pro-kit>/templates/prokit-next-neon/install.sh my-app       # supabase면 prokit-next-supabase
```

| 옵션 | 동작 |
|---|---|
| (없음) | 파일 복사, `package.json` 스크립트 추가, Claude Code 키 훅(`.claude/settings.json`) 추가, 이 프로젝트에 스킬·플러그인 설치와 OMX 설정(`omx`가 있을 때), agent-browser CLI(없거나 npm 최신판보다 낮으면 기본으로 최신판을 설치) |
| `--diff` | 미리 보기예요. 템플릿과 다른 기존 파일의 차이, 복사할 파일, `package.json`·`.gitignore`·`biome.json`·`turbo.json`·`.claude/settings.json`에 더할 항목을 보여 주고, 파일은 쓰지 않아요. 스킬·플러그인도 설치하지 않아요 |
| `--skip-skills` | 스킬·플러그인·OMX 설치와 agent-browser CLI 자동 설치를 건너뛰어요. 나중에 `pnpm skills:setup`으로 해요 |
| `--with-global` | 전역 도구(OMX CLI, gstack, agent-browser CLI, Vercel CLI, Neon CLI 또는 Supabase CLI) 중 없는 것을 설치한 뒤 프로젝트 설치를 이어 가요 |

- `AGENTS.md`, `CLAUDE.md`가 이미 있으면 템플릿 블록을 끝에 한 번만 덧붙여요.
- `--with-global`은 전역 설정과 훅을 바꾸므로 사용자가 전역 도구 설치를 요청할 때만 붙여요. gstack은 bun이 필요하고, 설치하면서 `~/.claude/settings.json`에 전역 훅을 등록해요. `--with-global`은 Supabase CLI를 Homebrew로만 설치해요.
- Windows의 PowerShell이나 Git Bash에서 실행하면 WSL2를 안내하고 멈춰요.

## 설치한 뒤 할 일

에이전트가 따르는 규칙의 원문은 [AGENTS.md의 "템플릿으로 새 프로젝트 만들기"](https://github.com/roadkwon-ai/pro-kit/blob/main/AGENTS.md#템플릿으로-새-프로젝트-만들기)이고, 명령은 템플릿 README "새 프로젝트 시작"의 "설치한 뒤"([neon](https://github.com/roadkwon-ai/pro-kit/blob/main/templates/prokit-next-neon/README.md#새-프로젝트-시작), [supabase](https://github.com/roadkwon-ai/pro-kit/blob/main/templates/prokit-next-supabase/README.md#새-프로젝트-시작))가 정본이에요.

1. **첫 마이그레이션**: 로컬 DB를 띄우고 `db:generate`로 인증 테이블 마이그레이션을 만든 뒤 `db:migrate`로 적용해요. supabase는 적용 전에 `enable_rls_auth` 커스텀 마이그레이션(인증 테이블의 RLS 켜기)을 더하고, 적용 뒤 `supabase db advisors --local --type security`가 `No issues found`인지 확인해요. BTS가 만든 프로젝트 `README.md`의 `db:push` 단계는 따르지 않아요. 화면만 프로젝트는 건너뛰어요.
2. **포맷 정리와 커밋**: `pnpm check`로 BTS가 만든 코드의 포맷과 정렬을 한 번 정리하고 `pnpm exec biome check .`가 exit 0인지 봐요. 설치 결과, 포맷 정리, 첫 마이그레이션을 기본 브랜치에 커밋해요.
3. **새 세션 열기**: 스킬과 에이전트는 새 세션부터 보여요. 첫 실행 때 묻는 신뢰 질문에 동의해야 프로젝트 설정이 켜져요. Claude Code는 플러그인, Codex는 에이전트, Grok Build는 규칙과 스킬이에요(`grok --trust`로 열면 묻지 않고 신뢰해요). Antigravity는 `AGENTS.md`, `.agents/skills`, `.agents/agents`를 그대로 읽어요([지원하는 에이전트](https://prokit-web.vercel.app/docs/start/supported-agents/#신뢰-질문)).
4. **화면 디자인 검사 켜기**: 개발자마다 한 번, 프로젝트 루트에서 `.agents/skills/impeccable/scripts/impeccable hooks on`을 실행해요. 켠 뒤 `.claude/settings.local.json`의 훅 명령이 `…/scripts/impeccable" hook`인지 확인해요.
5. **프로젝트 소개 채우기**: `GLOSSARY.md`와 `docs/domain/project.md`를 채워요.
6. **첫 요청**: "…을 만들어줘"처럼 요청하면 `prokit-dev-cycle`이 라운드를 열어요([dev-cycle 라운드](https://prokit-web.vercel.app/docs/concepts/dev-cycle/)).

## 자세히

### 설치기가 하는 일

- `templates/<템플릿>/files/` 아래 파일(스킬, 에이전트, dev-cycle, 문서 골격, 스크립트)을 프로젝트에 복사해요.
- `package.json`에 스크립트(`dev-cycle`, `skills:*`, `agents:*`, `export:html`, `vercel:deploy` 등)를 더해요.
- 다시 생성되는 파일(마이그레이션, `schema/auth.ts`, varlock의 `src/env.ts`)과 `pnpm export:html`이 만든 `html/`을 `biome.json` 검사 대상에서 빼요.
- 설치된 turbo가 2.11.5 이상이면 `turbo.json`에 `"agentGuidance": false`를 넣어요. turbo가 AI 에이전트를 감지하면 루트 `AGENTS.md`에 규칙 블록을 쓰고 커밋하라고 지시하기 때문이에요.
- `scripts/skills-setup.mjs`로 `skills.manifest.json`의 스킬과 플러그인을 이 프로젝트에 설치해요([설치와 업데이트 구조](https://prokit-web.vercel.app/docs/skills/install-and-update/)).

### 첫 커밋이 중요한 이유

커밋하지 않고 첫 라운드를 열면 설치한 파일 전체가 라운드 diff에 섞여 `audit`이 더 무거운 케이스(템플릿 README의 예는 F)로 올리라고 요구해요. 라운드 기준이 기본 브랜치와의 merge-base라서 기능 브랜치에 커밋해도 마찬가지예요.

### 화면 디자인 검사를 스킬로 켜지 않는 이유

개인(전역) impeccable 스킬이 있을 때 스킬 호출(`$impeccable hooks on`, Claude Code의 `impeccable` 스킬 인자)로 켜면 Claude Code가 그쪽을 불러와 이 프로젝트에 없는 `scripts/hook.mjs`를 훅 명령으로 적어요. 그러면 Stop 훅이 매번 `MODULE_NOT_FOUND`로 실패해요.

### 팀원이 클론했을 때

`pnpm install` 뒤 `pnpm skills:setup`을 한 번 실행해요. 스킬 파일은 이미 커밋돼 있어서 빠진 것만 받아요. 전역 도구까지 맞추려면 `pnpm skills:setup --with-global`, 상태만 보려면 `pnpm skills:check`예요.

## 관련 문서

- [빠른 시작: 서비스 만들기](https://prokit-web.vercel.app/docs/start/quickstart-service/)
- [기존 프로젝트에 갱신 반영](https://prokit-web.vercel.app/docs/templates/update-existing/)
- [설치와 업데이트 구조](https://prokit-web.vercel.app/docs/skills/install-and-update/)
- [명령 모음](https://prokit-web.vercel.app/docs/reference/commands/)
