<!-- 두 템플릿 README "설치되는 것" 표에서 프로세스 스킬 행부터 문서 골격 행까지(공식 스킬 행만 템플릿마다 다르다). 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다. 인자: db(neon 또는 supabase. 선택 스킬 행의 ops 묶음 스킬 키) -->
| 프로세스 스킬 (Claude) | `.claude/settings.json`의 project scope 플러그인 | superpowers, skill-creator, OMC(oh-my-claudecode), ponytail(과설계 방지 모드와 리뷰) |
| 프로세스 스킬 (Codex) | `.agents/skills/`(superpowers {{v:skills.codex.superpowers}}개, skill-creator, ponytail·ponytail-review), `.codex/skills`·`agents`·`prompts`(OMX) | Claude와 같은 단계를 Codex에서 쓴다 |
| 스킬 설치 목록과 스크립트 | `skills.manifest.json`, `scripts/skills-setup.mjs` | 위 스킬 전체를 프로젝트에 설치·확인·업데이트. 팀원도 `pnpm skills:setup`으로 같은 상태를 만든다 |
| 선택 스킬 (기본 설치 안 함) | `skills.manifest.json`의 `optional` | 필요할 때 `pnpm skills:setup --optional <묶음>`으로 설치한다. `ops`(운영): {{v:optional.ops.skillsCode.{{db}}}}. `motion`(화면 전환): {{v:optional.motion.skillsCode}}. `mobile`(React Native·Expo 앱을 따로 만들 때): {{v:optional.mobile.skillsCode}} |
| 프로젝트 스킬 {{v:prokit.skills.count}}개 | `.agents/skills/prokit-*` | dev-cycle 지휘, web, api, db, ui, verify, deploy, 외부 스킬 업데이트(skills-update) |
| 화면만 프로젝트 | `scripts/export-html.mjs`, `scripts/load-keys.mjs`, `.claude/settings.json`의 SessionStart 훅 | DB 없이 만든 화면을 정적 HTML로 내보내기(`pnpm export:html`), 프로젝트나 작업 폴더 `.env`의 `OPENAI_API_KEY`를 Claude Code 세션 셸 환경에 불러오기, 배포 토큰(`GH_TOKEN`·`VERCEL_TOKEN`)은 배포 명령에만 넣기(`node scripts/load-keys.mjs -- <명령>`) |
| Vercel 배포와 릴리스 | `scripts/vercel-deploy.mjs`, `scripts/release.mjs`, `.vercelignore` | develop·production 배포 전 검사와 배포, production 배포 전 릴리스(버전 태그, `release/` 노트, GitHub Release), 로컬 `.env` 업로드 차단 |
| 에이전트 {{v:prokit.agents.count}}개 | `.claude/agents/`(정본), `.codex/agents/`·`.agents/agents/`(생성물) | 구현, 읽기 전용 리뷰 |
| dev-cycle | `scripts/dev-cycle.mjs`, `.dev-cycle.json`, `docs/dev-workflow.md`, `tasks/` | 케이스 판정, 대조표, audit |
| 문서 골격 | `AGENTS.md`, `CLAUDE.md`, `GLOSSARY.md`, `docs/adr/`, `docs/domain/project.md` | 개발 원칙과 공통 규칙(`CLAUDE.md`는 `@AGENTS.md`로 읽음), 용어, 결정, 개관 |
