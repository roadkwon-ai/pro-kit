<!-- handbook/reference/project-structure.md "폴더 한눈에 보기"의 폴더 트리. 스킬 수는 값으로 채운다 -->
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
├── .agents/skills/             prokit-* {{v:prokit.skills.count}}개, 공식 도메인 스킬, superpowers·skill-creator·ponytail(Codex·Antigravity·Grok Build)
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
