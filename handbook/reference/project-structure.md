# 설치된 프로젝트의 폴더 구조

> 한눈에: 프로젝트 폴더에는 앱 코드와 함께 에이전트가 읽는 규칙과 작업 기록이 들어 있어요. 평소에는 열어 볼 일이 없고, 어떤 파일이 무슨 일을 하는지 궁금할 때 찾아보면 돼요.

## 폴더 한눈에 보기

오른쪽 괄호는 파일을 만든 쪽이에요(BTS 또는 템플릿).

<!-- b:project-structure-tree -->
```text
my-app/
├── apps/web/                   Next.js App Router: 화면, /api/rpc, /api/auth          (BTS)
├── packages/
│   ├── api/                    oRPC 라우터, protectedProcedure                        (BTS)
│   ├── auth/                   Better Auth 설정                                       (BTS)
│   ├── db/                     Drizzle 스키마·마이그레이션                            (BTS)
│   │                           neon: docker-compose.yml, supabase: supabase/config.toml
│   ├── ui/                     shadcn 컴포넌트                                        (BTS)
│   └── config/                 공유 tsconfig                                          (BTS)
├── bts.jsonc, turbo.json, biome.json, pnpm-workspace.yaml                             (BTS)
├── AGENTS.md, CLAUDE.md, GLOSSARY.md                                                   (템플릿)
├── .agents/skills/             prokit-* 8개, 공식 도메인 스킬, superpowers·skill-creator·ponytail(Codex·Antigravity·Grok Build)
├── .agents/agents/             에이전트 생성물(Antigravity)
├── .claude/                    agents/(정본), skills/(링크), settings.json(플러그인, 키 훅)
├── .codex/                     agents/(생성물), skills·prompts(OMX)
├── scripts/                    dev-cycle.mjs, sync-agents.mjs, skills-setup.mjs, vercel-deploy.mjs, release.mjs,
│                               export-html.mjs, load-keys.mjs
├── release/                    production 배포마다 릴리스 노트 (pnpm release)
├── skills.manifest.json, skills-lock.json, .dev-cycle.json, .vercelignore
├── docs/                       dev-workflow.md, adr/, domain/project.md
└── tasks/                      todo.md(진행 중 대조표), 닫은 라운드는 archive/
```
<!-- /b -->

## 자세히

### 에이전트가 읽고 쓰는 파일

| 파일 | 하는 일 | 자세히 |
|---|---|---|
| `AGENTS.md`, `CLAUDE.md` | 개발 원칙과 공통 규칙. `CLAUDE.md`는 `@AGENTS.md`로 같은 지침을 읽어요 | [하네스 엔지니어링](../concepts/harness.md) |
| `GLOSSARY.md` | 용어집. 새 용어는 라운드에서 바로 기록해요 | [dev-cycle 라운드](../concepts/dev-cycle.md) |
| `docs/domain/project.md` | 프로젝트 소개. 화면, 프로시저, 테이블 표 | [만든 뒤 개발하기](../start/after-create.md) |
| `docs/adr/` | 설계 결정 기록 | |
| `docs/dev-workflow.md` | 케이스별 대조표 행의 정본 | [케이스 <!-- v:devCycle.cases.range -->A\~F·H<!-- /v -->와 대조표](../concepts/cases.md) |
| `.dev-cycle.json` | 케이스 판정 경로, 인증 경로, 검사 명령, 화면 점수 기준 | [케이스 <!-- v:devCycle.cases.range -->A\~F·H<!-- /v -->와 대조표](../concepts/cases.md) |
| `tasks/todo.md`, `tasks/archive/`, `tasks/evidence/` | 진행 중 대조표와 백로그, 닫은 라운드, 스크린샷 같은 증거 | [증거와 audit, 사용자 확인](../concepts/audit-and-confirm.md) |
| `skills.manifest.json`, `skills-lock.json` | 설치할 스킬 목록과 설치한 판 | [설치와 업데이트 구조](../skills/install-and-update.md) |
| `.claude/agents/`, `.codex/agents/`, `.agents/agents/` | 구현·리뷰 에이전트 정본과 생성물(Codex용, Antigravity용) | [구현 에이전트와 리뷰 에이전트](../concepts/agent-roles.md) |
| `.vercelignore` | 배포에서 비밀값 파일을 빼요 | [비밀값 지키기](../deploy/secrets.md) |
| `release/` | 릴리스 노트 | [버전과 릴리스](../deploy/release.md) |

### 화면을 만들면 생기는 파일

| 파일 | 하는 일 |
|---|---|
| `PRODUCT.md` | 제품 맥락(impeccable `init` 인터뷰 결과) |
| `DESIGN.md` | 디자인 값(토큰)과 이유 |
| `docs/briefs/site-map.md`, `docs/briefs/<화면>.md` | 사이트맵과 화면 설계(브리프) |
| `apps/web/src/fonts/`, `apps/web/public/images/` | 자체 호스팅 서체와 이미지 |
| `html/` | `pnpm export:html` 결과(git이 무시해요) |

화면만 프로젝트는 루트 `AGENTS.md` 맨 위에 "화면만 프로젝트" 한 줄이 있고, 작업 폴더에서 시작했다면 `docs/first-request.md`에 첫 요청이 있어요([화면만 프로젝트와 HTML 내보내기](../design/screen-only.md)).

## 관련 문서

- [앱 구조](../templates/app-structure.md)
- [템플릿이 더하는 것](../templates/what-it-adds.md)
- [명령 모음](commands.md)
