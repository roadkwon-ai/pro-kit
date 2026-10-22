<!-- handbook/reference/project-structure.md "폴더 한눈에 보기"의 폴더 트리. 스킬 수는 값으로 채운다 -->
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
├── .agents/skills/             prokit-* {{v:prokit.skills.count}}개, 공식 도메인 스킬, mattpocock·skill-creator, 고른 두뇌·과설계 방지 스킬(Codex·Antigravity·Grok Build)
├── .agents/agents/             에이전트 생성물(Antigravity)
├── .claude/                    agents/(정본), skills/(링크), settings.json(플러그인, 키 훅)
├── .codex/                     agents/(생성물), skills·prompts(OMX)
├── scripts/                    dev-cycle.mjs, sync-agents.mjs, skills-setup.mjs, delegation.mjs, resource-guard.mjs,
│                               vercel-deploy.mjs, release.mjs, export-html.mjs, load-keys.mjs
├── release/                    production 배포마다 릴리스 노트 (pnpm release)
├── skills.manifest.json, skills-lock.json, .dev-cycle.json, .vercelignore
├── .impeccable/                impeccable 기록(critique/*.md 등. 화면을 리뷰하면 생기고 커밋해요)
├── licenses/                   PROKIT-SCOPE.md, PROKIT-LICENSE.txt: 템플릿이 전한 파일의 MIT 범위 안내   (템플릿)
├── docs/                       dev-workflow.md, adr/, domain/project.md, plans/(진행 계획), briefs/(화면 설계),
│                               prokit/(기존 프로젝트를 들였을 때: intake.md 도입 기록, analysis.md 정밀 분석)
└── tasks/                      todo.md(남은 할 일·진행 중 대조표), plan.md(진행 계획의 Task 표, 있으면),
                                archive/(날짜별 완료 기록·README 색인), evidence/(스크린샷·화면 audit 보고서. git이 무시해요)
```
