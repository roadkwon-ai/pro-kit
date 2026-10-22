# 설치된 프로젝트의 폴더 구조

> 한눈에: 프로젝트 폴더에는 앱 코드와 함께 에이전트가 읽는 규칙과 작업 기록이 들어 있어요. 평소에는 열어 볼 일이 없고, 어떤 파일이 무슨 일을 하는지 궁금할 때 찾아보면 돼요.

## 폴더 한눈에 보기

오른쪽 괄호는 파일을 만든 쪽이에요(Better-T-Stack 또는 템플릿).

<!-- b:project-structure-tree -->
```text
my-app/
├── apps/web/                   Next.js App Router: 화면, /api/rpc, /api/auth          (Better-T-Stack)
├── packages/
│   ├── api/                    oRPC 라우터, protectedProcedure                        (Better-T-Stack)
│   ├── auth/                   Better Auth 설정                                       (Better-T-Stack)
│   ├── db/                     Drizzle 스키마·마이그레이션                            (Better-T-Stack)
│   │                           neon: docker-compose.yml, supabase: supabase/config.toml
│   ├── ui/                     shadcn 컴포넌트                                        (Better-T-Stack)
│   └── config/                 공유 tsconfig                                          (Better-T-Stack)
├── bts.jsonc, turbo.json, biome.json, pnpm-workspace.yaml                             (Better-T-Stack)
├── AGENTS.md, CLAUDE.md, GLOSSARY.md                                                   (템플릿)
├── .agents/skills/             prokit-* 10개, 공식 도메인 스킬, mattpocock·skill-creator, 고른 두뇌·과설계 방지 스킬(Codex·Antigravity·Grok Build)
├── .agents/agents/             에이전트 생성물(Antigravity)
├── .claude/                    agents/(정본), skills/(링크), settings.json(플러그인, 키 훅)
├── .codex/                     agents/(생성물), skills·prompts(OMX)
├── scripts/                    dev-cycle.mjs, sync-agents.mjs, skills-setup.mjs, delegation.mjs, resource-guard.mjs,
│                               vercel-deploy.mjs, release.mjs, export-html.mjs, load-keys.mjs
├── release/                    production 배포마다 릴리스 노트 (pnpm release)
├── skills.manifest.json, skills-lock.json, .dev-cycle.json, .vercelignore
├── .impeccable/                impeccable 기록(critique/*.md 등. 화면을 리뷰하면 생기고 커밋해요)
├── docs/                       dev-workflow.md, adr/, domain/project.md, plans/(진행 계획),
│                               prokit/(기존 프로젝트를 들였을 때: intake.md 도입 기록, analysis.md 정밀 분석)
└── tasks/                      todo.md(남은 할 일·진행 중 대조표), plan.md(진행 계획의 Task 표, 있으면),
                                archive/(날짜별 완료 기록·README 색인)
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
| `docs/prokit/intake.md`, `docs/prokit/analysis.md`, `docs/first-request.md` | 기존 프로젝트 도입 기록, 정밀 분석 결과, 새 세션에서 이어 갈 첫 요청. 도입했을 때만 생겨요 | [기존 프로젝트에 도입하기](../start/adopt.md) |
| `tasks/plan.md`, `docs/plans/` | 진행 계획의 Task 표와 계획 문서 | [정밀 분석과 진행 계획](../concepts/project-plan.md) |
| `openspec/`, `specs/`, `.specify/` | openspec·spec-kit 두뇌를 골랐을 때만 생기는 명세 문서. 두뇌를 바꿔도 문서는 남겨요 | [두뇌와 선택 스킬](../skills/brains.md) |
| `tasks/todo.md`, `tasks/archive/`, `tasks/evidence/` | 남은 일반 할 일·백로그와 진행 중 대조표, 날짜별 완료 기록과 색인, 스크린샷과 `ui-audit-*.md` 같은 증거(`tasks/evidence/`는 git이 무시해요) | [증거와 audit, 사용자 확인](../concepts/audit-and-confirm.md) |
| `skills.manifest.json`, `skills-lock.json` | 설치할 스킬 목록과 설치한 판 | [설치와 업데이트 구조](../skills/install-and-update.md) |
| `.claude/agents/`, `.codex/agents/`, `.agents/agents/` | 구현 수행자, 전문 리뷰어, 최종 리뷰어, 정밀 분석(`prokit-analyzer`)의 정본과 생성물(Codex용, Antigravity용) | [위임 에이전트와 리뷰 에이전트](../concepts/agent-roles.md) |
| `scripts/delegation.mjs`, `scripts/resource-guard.mjs`, `.prokit/` | 위임 패킷의 실제 변경 검증과 자원 보호. `.prokit/` 실행 상태는 Git과 Biome에서 제외해요 | [위임과 자원 관리](../concepts/delegation-and-resources.md) |
| `.vercelignore` | 배포에서 비밀값 파일을 빼요 | [비밀값 지키기](../deploy/secrets.md) |
| `release/` | 릴리스 노트 | [버전과 릴리스](../deploy/release.md) |

### 화면을 만들면 생기는 파일

| 파일 | 하는 일 |
|---|---|
| `PRODUCT.md` | 제품 맥락(impeccable `init` 인터뷰 결과) |
| `DESIGN.md` | 디자인 값(토큰)과 이유 |
| `docs/preset-design.json` | 프리셋에서 받은 디자인 설정이나 요청한 변경의 선택 기록. 서체 파일·굵기·라이선스, 모드별 토큰과 초기 언어·모드를 `DESIGN.md`와 맞춰요 |
| `docs/briefs/site-map.md`, `docs/briefs/<화면>.md` | 사이트맵과 화면 설계(브리프) |
| `apps/web/src/fonts/`, `apps/web/public/images/` | 자체 호스팅 서체와 이미지 |
| `html/` | `pnpm export:html` 결과(git이 무시해요) |

화면만 프로젝트는 루트 `AGENTS.md` 맨 위에 "화면만 프로젝트" 한 줄이 있고, 작업 폴더에서 시작했다면 `docs/first-request.md`에 첫 요청이 있어요([화면만 프로젝트와 HTML 내보내기](../design/screen-only.md)).

Codex 네이티브 Ponytail 플러그인은 `--with-global`에서만 사용자 환경에 설치해요. 이 프로젝트의 `.codex/` 생성물과 플러그인 설치·훅 허용 상태는 따로 확인해요([설치와 업데이트 구조](../skills/install-and-update.md)).

완성팩을 적용하는 작업은 `.agents/skills/prokit-pack-use/`가 맡아요. `preset-manifest.json`이 있으면 지원 환경·수정 범위·비교 자료를 읽고, 소스 무결성 목록과 실제 파일을 대조해요. 공식 프리셋의 원본 조사·COPY 역할은 일반 사용자 템플릿에 포함하지 않아요([담당 구분](../design/preset-publication.md#담당-구분)).

하네스만 설치한 기존 Next.js 프로젝트(`--adopt`)에는 이 구조 가운데 하네스 파일만 들어가요. `packages/` 계층, `scripts/`의 배포·내보내기·릴리스 도구, `release/`는 없어요([설치기와 옵션](../templates/installer.md#기존-프로젝트에-설치하기)).

## 관련 문서

- [앱 구조](../templates/app-structure.md)
- [템플릿이 더하는 것](../templates/what-it-adds.md)
- [명령 모음](commands.md)
