# BTS Next.js + Neon 개발 템플릿

<!-- b:tpl-readme-license -->
> **사용 조건**: 프로킷 자체 코드·스킬·문서는 [MIT License](../../LICENSE)로 제공한다. 상업적 이용, 유료 고객 개발, 수정·재판매와 비공개 제품 개발을 허용하며, 재배포할 때 저작권 표시와 허가문을 함께 유지해야 한다. 원본 출처에서 별도로 설치되는 외부 스킬에는 [원래 조건](../../THIRD_PARTY_NOTICES.md)이 적용된다. 설치기는 생성 프로젝트에 `licenses/PROKIT-LICENSE.txt`와 적용 경로 안내를 전달하며, BTS 자체 LICENSE는 덮어쓰지 않는다.
<!-- /b -->

Better-T-Stack으로 만든 Next.js 풀스택 프로젝트(oRPC, Drizzle, Better Auth, Postgres: 개발은 로컬 컨테이너, 운영은 Neon)에 AI 에이전트 개발 환경을 한 번에 설치한다. 설계 근거는 [스펙](../../docs/superpowers/specs/2026-09-25-bts-next-neon-template-design.md), 검증 결과와 한계는 [VERIFICATION.md](VERIFICATION.md)에 있다.

## 설치되는 것
| 구성 | 위치 | 역할 |
|---|---|---|
| 공식 스킬 <!-- v:skills.official.neon -->28<!-- /v -->개 | `.agents/skills/`, `.claude/skills/`(링크), `skills-lock.json` | Next.js, React, Neon, Better Auth, shadcn, impeccable, ChatGPT 요금제 이미지(`gpt-image`), 디자인 카탈로그(`use-design-md`), turborepo, Postgres 규칙, domain-modeling, Vercel 배포(`deploy-to-vercel`, `vercel-cli-with-tokens`, `access-protected-vercel-deployment`) |
| 프로세스 스킬 (Claude) | `.claude/settings.json`의 project scope 플러그인 | superpowers, skill-creator, OMC(oh-my-claudecode), ponytail(과설계 방지 모드와 리뷰) |
| 프로세스 스킬 (Codex) | `.agents/skills/`(superpowers <!-- v:skills.codex.superpowers -->15<!-- /v -->개, skill-creator, ponytail·ponytail-review), `.codex/skills`·`agents`·`prompts`(OMX) | Claude와 같은 단계를 Codex에서 쓴다 |
| 스킬 설치 목록과 스크립트 | `skills.manifest.json`, `scripts/skills-setup.mjs` | 위 스킬 전체를 프로젝트에 설치·확인·업데이트. 팀원도 `pnpm skills:setup`으로 같은 상태를 만든다 |
| 선택 스킬 (기본 설치 안 함) | `skills.manifest.json`의 `optional` | 필요할 때 `pnpm skills:setup --optional <묶음>`으로 설치한다. `ops`(운영): <!-- v:optional.ops.skillsCode.neon -->`vercel-optimize`, `neon-functions`, `neon-object-storage`, `neon-ai-gateway`<!-- /v -->. `motion`(화면 전환): <!-- v:optional.motion.skillsCode -->`vercel-react-view-transitions`<!-- /v -->. `mobile`(React Native·Expo 앱을 따로 만들 때): <!-- v:optional.mobile.skillsCode -->`vercel-react-native-skills`<!-- /v --> |
| 프로젝트 스킬 <!-- v:prokit.skills.count -->8<!-- /v -->개 | `.agents/skills/prokit-*` | dev-cycle 지휘, web, api, db, ui, verify, deploy, 외부 스킬 업데이트(skills-update) |
| 화면만 프로젝트 | `scripts/export-html.mjs`, `scripts/load-keys.mjs`, `.claude/settings.json`의 SessionStart 훅 | DB 없이 만든 화면을 정적 HTML로 내보내기(`pnpm export:html`), 프로젝트나 작업 폴더 `.env`의 `OPENAI_API_KEY`를 Claude Code 세션 셸 환경에 불러오기, 배포 토큰(`GH_TOKEN`·`VERCEL_TOKEN`)은 배포 명령에만 넣기(`node scripts/load-keys.mjs -- <명령>`) |
| Vercel 배포와 릴리스 | `scripts/vercel-deploy.mjs`, `scripts/release.mjs`, `.vercelignore` | develop·production 배포 전 검사와 배포, production 배포 전 릴리스(버전 태그, `release/` 노트, GitHub Release), 로컬 `.env` 업로드 차단 |
| 에이전트 <!-- v:prokit.agents.count -->2<!-- /v -->개 | `.claude/agents/`(정본), `.codex/agents/`·`.agents/agents/`(생성물) | 구현, 읽기 전용 리뷰 |
| dev-cycle | `scripts/dev-cycle.mjs`, `.dev-cycle.json`, `docs/dev-workflow.md`, `tasks/` | 케이스 판정, 대조표, audit |
| 문서 골격 | `AGENTS.md`, `CLAUDE.md`, `GLOSSARY.md`, `docs/adr/`, `docs/domain/project.md` | 개발 원칙과 공통 규칙(`CLAUDE.md`는 `@AGENTS.md`로 읽음), 용어, 결정, 개관 |

## 준비물
- Node <!-- v:node.min -->22.20<!-- /v --> 이상(<!-- v:node.recommended -->24<!-- /v --> 권장), pnpm, git. <!-- v:node.min -->22.20<!-- /v -->은 skills CLI가 요구하는 하한이라 설치기는 그보다 낮으면 멈추고, <!-- v:node.recommended -->24<!-- /v --> 미만이면 권장 경고만 낸다. Node 20은 <!-- v:node.eol -->2026-04-30<!-- /v -->에 지원이 끝났다. Vercel 프로젝트의 Node.js는 <!-- v:vercel.node -->24.x<!-- /v -->로 둔다(Vercel은 <!-- v:vercel.node20Stop -->2026-10-01<!-- /v -->부터 Node 20으로 새 배포를 만들지 않는다).
- Podman(또는 Docker)과 compose provider: 로컬 개발 DB. `podman compose`는 외부 provider(docker-compose나 podman-compose)를 부르므로 둘 중 하나가 있어야 한다. macOS는 `podman machine init`, `podman machine start`를 먼저 한다. Windows는 아래 [Windows](#windows) 절을 따른다. `docker` 명령이 없으면 `podman compose`를 쓴다.
- Neon CLI(<!-- v:cli.neon.installCode -->`npm install -g neon`<!-- /v -->): 병합 전 검증 브랜치와 운영 DB. 로컬 개발만 할 때는 없어도 된다.
- Vercel CLI(<!-- v:cli.vercel.installCode -->`npm install -g vercel`<!-- /v -->)와 Vercel 계정: develop·production 배포([Vercel 배포](#vercel-배포)). 배포하지 않으면 없어도 된다.
- 브라우저 검증: [ego lite](https://lite.ego.app/)(macOS)를 먼저 쓴다. 설치한 뒤 앱에서 첫 실행 설정을 마치면 `ego-browser` 명령과 전역 `ego-browser` 스킬이 생긴다. 스크린샷을 찍는 동안 ego lite 창이 화면에 보여야 한다. ego lite를 쓸 수 없는 환경(Windows·Linux, CI, Codex 샌드박스, 창을 띄울 수 없을 때)과 React 내부 상태 확인에는 agent-browser CLI를 쓴다. 설치기가 <!-- v:policy.agentBrowser.da -->agent-browser CLI가 없거나 npm 최신판보다 낮으면 전역에 최신판을 설치한다<!-- /v -->(`npm install -g agent-browser@latest && agent-browser install`. Homebrew로 설치했으면 `brew upgrade agent-browser`). agent-browser 스킬 본문은 CLI가 주므로(`agent-browser skills get core`) CLI 판이 곧 스킬 판이다. 태그 없이 설치하면 Node 24 미만 npm이 0.27.0을 고르므로 `@latest`를 붙인다. npm 레지스트리에 닿지 않으면 next-dev-loop 하한 0.31.1로 검사한다.
- 설치기가 프로젝트 scope에 자동으로 넣는 것: 공식 스킬, superpowers·skill-creator·OMC·ponytail(Claude 플러그인), superpowers·skill-creator·ponytail(Codex 스킬), OMX 스킬·에이전트·프롬프트(`omx`가 있을 때). 목록 정본은 `files/skills.manifest.json`이다. 단계별로 무엇을 쓰는지는 `.agents/skills/prokit-dev-cycle/references/process-routing.md`.
- ponytail(Claude 플러그인)은 훅 3개(SessionStart, SubagentStart, UserPromptSubmit)로 세션과 서브에이전트에 과설계를 막는 규칙을 넣는다. project scope로 설치해도 전역 파일 `~/.claude/.ponytail-active`(모드)와 `~/.claude/.ponytail-statusline-nudged`를 쓴다. statusline이 없으면 첫 세션에 전역 statusline 설정을 제안하는데, 원할 때만 받는다. 모드 파일이 전역이라 한 세션에서 "stop ponytail"로 끄면 다른 프로젝트 세션에도 적용된다. 이 프로젝트에서만 끄려면 `.claude/settings.local.json`의 `enabledPlugins`에 `"ponytail@ponytail": false`를 둔다. 플러그인 업데이트(`claude plugin update`, `/plugin`)는 설치 전 검토를 거치지 않으므로 먼저 저장소의 `hooks/` 변경을 본다. Codex에는 훅 없이 스킬(`ponytail`, `ponytail-review`)만 설치한다.
- 전역에만 설치되는 도구: agent-browser CLI, OMX CLI(`oh-my-codex`), gstack(upstream이 전역 설치만 지원한다. Claude·Codex 모두), Vercel CLI, Neon CLI, ego lite. 기본 실행에서도 <!-- v:policy.agentBrowser.da -->agent-browser CLI가 없거나 npm 최신판보다 낮으면 전역에 최신판을 설치한다<!-- /v -->(실패하면 경고만 하고 계속한다). 나머지는 기본 실행이 없는 것과 설치 명령만 알려 주고, `--with-global`을 주면 ego lite를 뺀 나머지 중 없는 것만 전역 설치한다(gstack은 bun이 필요하고 `./setup`이 `~/.claude/settings.json`에 전역 훅을 등록한다). 모두 없어도 dev-cycle은 process-routing의 "스킬이 없을 때" 절차로 진행된다.

### Windows
<!-- b:tpl-readme-windows-intro -->
WSL2의 Ubuntu 안에서 설치하고 개발한다. 설치기와 스킬이 bash, 심볼릭 링크, Linux·macOS 명령을 쓰기 때문에 PowerShell, 명령 프롬프트, Git Bash에서 실행하면 설치기가 WSL2를 안내하고 멈춘다.
<!-- /b -->
1. PowerShell에서 `wsl --install`을 실행하고(기본 배포판은 Ubuntu 최신 LTS) 재부팅한 뒤 Ubuntu 사용자를 만든다. 아래 명령과 이후 명령은 모두 Ubuntu 셸에서 실행한다.
2. Node(nvm 같은 사용자 설치. `npm install -g`에 sudo가 필요 없다), pnpm, git, Claude Code·Codex를 WSL 안에 설치한다. 이 저장소와 새 프로젝트는 WSL 홈(`~/`)에 둔다. `/mnt/c` 아래는 파일 접근이 느리고 개발 서버가 파일 변경을 늦게 알아챈다.
3. 로컬 DB용 컨테이너 엔진을 하나 고른다.
   - Podman(무료, macOS와 같은 명령): `sudo apt install podman podman-compose`. Linux에서는 `podman machine`이 필요 없다. Ubuntu의 Podman은 `postgres:18` 같은 짧은 이미지 이름을 찾지 못하므로 처음 한 번 `test -e ~/.config/containers/registries.conf || { mkdir -p ~/.config/containers && echo 'unqualified-search-registries = ["docker.io"]' > ~/.config/containers/registries.conf; }`를 실행한다. 파일이 이미 있으면 그 줄을 파일 맨 위에 직접 넣는다(같은 키가 두 번 있으면 Podman이 설정 파일을 읽지 못하고, `[[registry]]` 표 아래에 넣으면 적용되지 않는다).
   - Docker Desktop: Windows에 WSL 2 백엔드로 설치하고 Settings → Resources → WSL integration에서 Ubuntu를 켠다. 로컬 DB는 `db:start`로 띄운다. 직원 250명 이상이거나 연 매출 1천만 달러 이상인 조직이 업무에 쓰려면 유료 구독이 필요하다.
4. 브라우저 검증은 agent-browser로 한다(ego lite는 macOS 전용이다). 설치기가 agent-browser CLI를 설치한 뒤 처음 한 번 `agent-browser install --with-deps`로 Chrome이 쓰는 시스템 라이브러리를 설치한다(sudo 암호를 묻는다).

## 새 프로젝트 시작
```bash
pnpm create better-t-stack@latest my-app \
  --frontend next --backend self --runtime none \
  --database postgres --orm drizzle --db-setup docker \
  --auth better-auth --payments none --api orpc \
  --addons turborepo biome --examples none \
  --web-deploy none --server-deploy none \
  --package-manager pnpm --git --install
bash <이 저장소>/templates/prokit-next-neon/install.sh my-app              # 전역 도구까지 설치하려면 --with-global
```
생성기(`@latest`), 공식 스킬, Claude 플러그인은 템플릿에 복사해 두지 않고 설치할 때의 최신판을 받는다.
`--db-setup docker`는 일반 Postgres 드라이버(`pg`), `packages/db/docker-compose.yml`, 로컬 `DATABASE_URL`을 만든다. 같은 드라이버가 Neon에도 그대로 붙는다. `--db-setup neon`은 Neon 전용 HTTP 드라이버(`@neondatabase/serverless`)를 생성해 로컬 Postgres에 붙지 않으므로 쓰지 않는다.

로컬 DB 시작:
```bash
cd my-app/packages/db
podman compose up -d        # Docker면 pnpm --filter @my-app/db db:start
```
compose 파일은 호스트 <!-- v:port.neonDb -->5432<!-- /v --> 포트를 쓴다. 이미 <!-- v:port.neonDb -->5432<!-- /v -->를 쓰는 Postgres(Homebrew 등)가 있으면 컨테이너는 오류 없이 뜨지만 <!-- v:port.neonDb.addrCode -->`localhost:5432`<!-- /v --> 접속은 기존 서버로 간다. 먼저 `lsof -nP -iTCP:5432 -sTCP:LISTEN`로 확인한다. 사용 중이면 compose의 `ports`를 한 번 `"${DB_PORT:-5432}:5432"`로 바꿔 커밋하고(다른 개발자는 그대로 5432), 개인 포트는 git이 무시하는 `packages/db/.env`에 `DB_PORT=5433`으로 둔 뒤 `apps/web/.env`의 `DATABASE_URL` 포트도 5433으로 바꾼다.

Neon 연결(병합 전 검증과 운영): 프로젝트 루트에서 `neon link --project-id <id> --no-env-pull --no-config`로 연결한다. `--no-env-pull`이 없으면 연결한 브랜치(대개 운영)의 비밀번호 포함 URL이 루트 `.env.local`에 기록된다. 운영 URL은 파일로 받지 않는다. `neon link`가 만드는 `.neon`(조직·프로젝트·브랜치 ID)은 개인 설정이므로 `.gitignore`에 추가한다. 개발 중에는 `apps/web/.env`를 로컬 DB로 두고, Neon URL은 명령마다 환경변수로 넘긴다(`prokit-db`의 migration-flow).

<!-- b:tpl-readme-screen-only -->
화면만 만들 때("화면만", "DB는 쓰지 않아")는 neon 템플릿으로 만들고, 로컬 DB 시작과 아래 1번(첫 마이그레이션)을 건너뛴다. 절차는 루트 [AGENTS.md](../../AGENTS.md)의 "화면만 만들기", 화면 규칙과 HTML 내보내기·배포·실제 서비스로 바꾸기는 `prokit-ui`의 `references/screen-only.md`에 있다.
<!-- /b -->

설치한 뒤:
1. 로컬 DB를 띄우고 `pnpm --filter @my-app/db db:generate`로 첫 마이그레이션(인증 테이블)을 만든 뒤 `pnpm --filter @my-app/db db:migrate`로 적용한다. BTS가 만든 프로젝트 `README.md`의 `pnpm run db:push` 단계는 따르지 않는다. 스키마 변경은 마이그레이션으로만 한다(`AGENTS.md` 보안 불변식).
2. `pnpm check`로 BTS가 만든 코드의 포맷과 정렬(import, Tailwind 클래스)을 한 번 정리하고 `pnpm exec biome check .`가 exit 0인지 확인한다. 다시 생성되는 파일(마이그레이션, `schema/auth.ts`, varlock의 `src/env.ts`)과 `pnpm export:html`이 만든 `html/`은 설치기가 `biome.json` 검사 대상에서 뺐다. shadcn의 `label.tsx`·`input-group.tsx`는 upstream 코드라 두 파일에서만 a11y 규칙 3개를 껐다. 설치된 turbo가 2.11.5 이상이면 설치기가 `turbo.json`에 `"agentGuidance": false`를 넣는다. turbo가 AI 에이전트를 감지하면 루트 `AGENTS.md`에 규칙 블록을 쓰고 커밋해 두라고 지시하기 때문이다. 2.11.4 이하는 이 키를 거부하므로 넣지 않는다(나중에 turbo를 올리면 `prokit-skills-update`의 turbo 절). 이어서 설치 결과, 포맷 정리, 첫 마이그레이션을 기본 브랜치(`main` 또는 `master`)에 커밋한다. 커밋하지 않고 첫 라운드를 열면 설치한 파일 전체가 라운드 diff에 섞여 `audit`이 케이스 F 상향을 요구한다. 기능 브랜치에 커밋해도 마찬가지다. 라운드 기준이 기본 브랜치와의 merge-base이기 때문이다.
3. 새 에이전트 세션을 연다. 스킬과 에이전트는 새 세션부터 보인다. Claude Code는 프로젝트를 신뢰해야 `.claude/settings.json`의 project 플러그인(superpowers, skill-creator, OMC, ponytail)을 켠다. Codex는 프로젝트를 신뢰(trusted)해야 `.codex/agents`의 에이전트를 불러온다. 첫 실행 때 묻는 신뢰 질문에 동의한다. 스킬은 신뢰하지 않아도 보인다. Antigravity는 `AGENTS.md`, `.agents/skills`, `.agents/agents`(`pnpm agents:sync`가 `.claude/agents`에서 만든다)를 그대로 읽는다. Grok Build는 `AGENTS.md`·`CLAUDE.md`, `.agents/skills`, `.claude/agents`를 읽지만 폴더를 신뢰해야 규칙과 스킬을 불러온다(첫 실행 질문에 동의하거나 `grok --trust`). 두 도구는 Codex처럼 스킬의 `SKILL.md`를 읽어 적용한다. Antigravity는 Claude 플러그인 훅·OMC·OMX·gstack·impeccable 편집 훅을 쓰지 않는다. Grok Build는 Claude 호환이 기본으로 켜져 있어 사용자 전역의 Claude 플러그인·훅, `~/.claude/CLAUDE.md`, `~/.claude/skills`도 불러오고, 신뢰한 폴더에서는 프로젝트 `.claude/settings.json`·`settings.local.json`의 훅도 읽는다(그 훅이 실제로 도는지는 확인하지 않았다).
4. 개발자마다 한 번 프로젝트 루트에서 `.agents/skills/impeccable/scripts/impeccable hooks on`을 실행한다. 스킬 호출(`$impeccable hooks on`, Claude Code의 `impeccable` 스킬 인자)로 켜지 않는다. 개인(전역) impeccable 스킬이 있으면 Claude Code가 그쪽을 불러와 이 프로젝트에 없는 `scripts/hook.mjs`를 훅 명령으로 적고, Stop 훅이 매번 `MODULE_NOT_FOUND`로 실패한다. 켠 뒤 `.claude/settings.local.json`의 훅 명령이 `…/scripts/impeccable" hook`인지 확인한다.
5. `GLOSSARY.md`와 `docs/domain/project.md`를 채운다.
6. "…을 만들어줘"처럼 요청하면 `prokit-dev-cycle`이 라운드를 연다. 라운드는 사용자가 결과를 확인해야 닫힌다(`[confirm]` 행, N/A·blocked 불가). 확인을 요청할 때는 개발 서버를 띄운 채 테스트 순서와 알려진 문제를 함께 준다. 확인 뒤 배포까지 할지 묻고, 닫은 뒤 커밋·push와 (고르면) 릴리스·production 배포를 한다. 배포 준비가 안 됐으면 묻지 않고 커밋·push까지만 한다. 커밋 전에는 `pnpm dev-cycle secrets`로 스테이징한 변경의 비밀값을 검사한다(`prokit-dev-cycle` 5절).
7. 첫 화면이나 리디자인을 요청하면 `prokit-ui`가 디자인 카탈로그(getdesign.kr, awesome-design-md, Refero Styles)에서 서비스에 맞는 스타일 1~3위와 "직접 정하기"를 추천한다. Refero 원문은 페이지 버튼으로 만들어지므로 agent-browser로 받는다. 고른 원문은 `DESIGN.md`로 저장하고(Refero는 토큰 앞머리를 붙여) Google 명세 CLI로 검사한다(`pnpm dlx @google/design.md lint DESIGN.md`, 설치 없이 실행). 구현 전에 서체 파일을 받아 자체 호스팅하고(`apps/web/src/fonts/` 또는 `next/font/google`), 사진·일러스트가 필요한 화면은 이미지를 그릴 수 있으면 comp와 plate 이미지로 만든다. 그리는 길은 Codex 자체 이미지 도구, `OPENAI_API_KEY`(impeccable `generate-image`. 비용은 사용자의 OpenAI API 계정), ChatGPT로 로그인한 Codex CLI(`gpt-image` 스킬) 순서이고, 모두 없으면 배치도로 구성을 고른다. 키는 프로젝트나 작업 폴더(프로젝트의 상위 폴더)의 `.env`에 두면 Claude Code 세션을 열 때 훅(`scripts/load-keys.mjs`)이 셸 환경에 불러온다. 연 뒤에 넣었으면 세션을 다시 연다. 키는 커밋하는 파일에 적지 않는다. 리디자인은 지금 화면을 찍고 critique한 결과를 브리프의 "버릴 것"으로 삼는다. 화면을 만들기 전에 사이트맵(`docs/briefs/site-map.md`)에 링크와 버튼이 이어지는 곳을 모두 적고, 404나 "준비 중" 없이 모든 링크와 버튼이 동작하게 만든다. 제품 이름이나 첫 화면 헤드라인을 새로 정할 때는 비슷한 서비스를 조사해 후보 3\~4개를 내고 사용자가 고른다. 흐름과 측정 결과는 루트 README의 [UI/UX 디자인](../../handbook/design/ui-flow.md)에 있다.

<!-- b:tpl-readme-clone -->
팀원이 이 프로젝트를 클론했을 때: `pnpm install` 뒤 `pnpm skills:setup`을 한 번 실행한다(스킬 파일은 커밋되어 있으므로 빠진 것만 받는다. Claude 플러그인을 받고, OMX 기기별 설정을 만들고, agent-browser CLI가 없거나 npm 최신판보다 낮으면 전역에 최신판을 설치한다). 전역 도구까지 맞추려면 `pnpm skills:setup --with-global`. 상태만 보려면 `pnpm skills:check`(`omx`가 없는 기기는 OMX를 누락으로 세지 않는다).
<!-- /b -->

<!-- b:tpl-readme-update-existing -->
이미 설치한 프로젝트에 템플릿 갱신을 반영하려면 `install.sh <프로젝트> --diff`로 차이와 더할 항목을 본다(`--diff`는 파일을 쓰지 않는다). 없는 파일과 설정 항목은 `install.sh <프로젝트> --skip-skills`로 더하고(템플릿 파일은 덮어쓰지 않고 설정 파일에는 항목만 더한다), 템플릿과 다른 파일은 직접 옮긴다. `.dev-cycle.json`은 설치기가 값을 채우는 파일이라 `--diff`에 나오지 않으므로 템플릿의 `files/.dev-cycle.json`과 직접 비교한다.
<!-- /b -->

## Vercel 배포
<!-- b:tpl-readme-vercel-intro -->
로컬 Vercel CLI로 develop(Preview 배포 + 고정 주소)과 production을 배포한다. 절차 정본은 `prokit-deploy` 스킬이다. 에이전트에게 "develop에 배포해줘", "운영에 배포해줘"처럼 요청하면 이 스킬을 따른다. Vercel 연결과 운영 DB 적용은 사용자가 요청할 때만 한다. 배포는 요청할 때와, 라운드 끝에서 사용자가 "릴리스하고 production 배포"를 고를 때 한다(`prokit-dev-cycle` 5절).
<!-- /b -->

| 대상 | Vercel 환경 | DB | 명령 |
|---|---|---|---|
| develop | Preview + 고정 주소(alias) | Neon `develop` 브랜치 | `pnpm vercel:deploy develop` |
| production | Production | Neon 운영 브랜치 | `pnpm release` 뒤 `pnpm vercel:deploy production` (기본 브랜치의 릴리스한 커밋만) |

<!-- b:tpl-readme-vercel-env-rule -->
환경변수 값은 환경마다 한 곳에만 둔다. 파일에 두는 것은 로컬 값뿐이다.
<!-- /b -->

| 환경 | 앱 환경변수 | 마이그레이션할 때 DB 주소 |
|---|---|---|
| 로컬 | `apps/web/.env` | 같은 파일 |
| develop | Vercel Preview 환경변수 | `neon cs develop`으로 그때 받는다 |
| production | Vercel Production 환경변수 | `neon cs <운영 브랜치>`로 그때 받는다 |

<!-- b:tpl-readme-vercel-env-files -->
배포 값을 `.env.development`나 `.env.production`에 두지 않는다. 이 파일은 `.vercelignore`에 걸려 배포에 올라가지 않는다. 또 varlock은 이 파일을 `NODE_ENV`로 고르는데 Vercel은 Preview도 `NODE_ENV=production`으로 빌드하므로, 파일로는 develop과 production을 나눌 수 없다. 결국 쓰이지 않는 비밀값 사본이 되고, 에이전트가 읽으면 값이 대화 기록에 남는다. 설치기는 루트와 `packages/*`의 `.env.*`도 git이 무시하게 한다(`.env.schema`는 커밋한다).

처음 한 번(프로젝트 루트에서):
```bash
vercel login                                           # 사용자가 직접
vercel link --yes --project <이름> --scope <팀>        # Vercel 프로젝트가 없으면 만든다
git diff .gitignore                                    # link가 더한 `+.env*` 한 줄만 보이면 다음 줄을 실행한다
git checkout -- .gitignore && rm -f .env.local         # link 전에 루트 .env.local이 없었을 때만 지운다(VERCEL_OIDC_TOKEN)
vercel git disconnect --yes                            # link 출력에 "Connecting GitHub repository"가 있었을 때만(push가 곧 production 배포가 되지 않게)
vercel project update <이름> --root-directory apps/web --framework nextjs --yes
```
<!-- /b -->
<!-- b:tpl-readme-vercel-deploy url="pooled 주소(`-pooler`)" -->
이어서 Preview와 Production에 `DATABASE_URL`(pooled 주소(`-pooler`)), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`(develop 고정 주소와 프로덕션 도메인. config 형식)을 넣는다. 값이 출력되지 않게 넣는 명령은 `prokit-deploy` 스킬의 준비 절과 `prokit-db` migration-flow의 "배포 환경" 절에 있다. Vercel은 프로젝트의 첫 배포를 `--prod` 없이도 production으로 만들므로 production부터 배포한다. 스크립트는 production 배포가 없으면 develop을 막는다. production을 되돌린(`vercel rollback`) 뒤에는 새 production 배포가 운영 주소를 가져가지 않으므로 `vercel promote <배포 URL>`로 올린다.

배포할 때마다 `pnpm vercel:deploy <대상> --check`로 준비 상태와 지난 배포 이후 새 마이그레이션을 본다. 새 마이그레이션이 있으면 대상 DB에 먼저 적용하고 배포한다. 스크립트는 커밋하지 않은 변경, 빠진 환경변수, production의 기본 브랜치와 릴리스, Vercel Git 자동 배포를 검사하고 되돌리기 명령을 출력한다. `vercel link --yes`는 새 프로젝트를 만들 때 git 원격이 있으면 묻지 않고 저장소를 연결한다. 연결되면 기본 브랜치 push가 곧 production 배포라 릴리스 검사를 거치지 않으므로 끊는다.

production은 릴리스한 커밋만 배포한다. `pnpm release`가 마지막 `vX.Y.Z` 태그 이후 커밋으로 다음 버전을 정하고(SemVer: 첫 릴리스 `0.1.0`, 기본 patch(`feat:` 포함), 사용자가 큰 묶음으로 정하면 `--minor`로 minor, `!`나 `BREAKING CHANGE:`는 0.x 동안 minor이고 1.0 이상이면 major) `release/<YYYYMMDD-HHmm>-<영어 제목>.md`에 노트를 쓴다. 에이전트가 노트를 검수하고 사용자가 동의하면 `pnpm release --publish <노트>`가 노트와 루트·`apps/web`의 `package.json` version을 `chore(release): vX.Y.Z`로 커밋하고, 태그를 달아 기본 브랜치와 함께 push한 뒤 GitHub Release를 만든다. 배포 스크립트는 HEAD에 태그와 그 GitHub Release가 없으면 production을 배포하지 않는다. GitHub `origin` 원격과 `gh auth login`이 필요하다. 커밋 제목은 Conventional Commits 접두어로 쓴다(노트의 절이 여기서 정해지고, `!`는 깨지는 변경으로 버전을 올린다).
<!-- /b -->

<!-- b:tpl-readme-vercel-notes -->
- `vercel deploy`는 `.gitignore`를 따르지 않고 작업 트리를 그대로 올린다. 설치기가 넣은 `.vercelignore`가 `apps/web/.env`, `.neon`(Neon 연결 정보), `.codex`(로컬 경로가 든 OMX 설정), `supabase/.temp`(Supabase CLI 연결 정보), `*.pem`, `*.local`, `*.local.*`(`settings.local.json` 등)을 뺀다. 지우지 않는다.
- Better Auth는 `BETTER_AUTH_URL`만 신뢰하므로 배포마다 생기는 고유 URL에서는 로그인이 실패한다. develop은 고정 주소로 연다. Preview에는 Vercel 배포 보호가 걸려 있으므로 Vercel에 로그인한 브라우저로 보거나 `vercel curl https://<고정 주소>/…`로 확인한다.
- 전역에 `vercel-deploy-claimable` 스킬이 있으면 이 프로젝트에서 쓰지 않는다. 로그인 없이 `.env`까지 외부 서비스에 올린다. Vercel 플러그인의 `/vercel:deploy`와 gstack `ship`·`land-and-deploy`도 쓰지 않는다(`prokit-deploy`의 "공식 도구를 그대로 쓰지 않는 이유").
<!-- /b -->

## 옵션
<!-- b:tpl-readme-options cli="Neon" -->
- `--diff`: 미리 보기. 템플릿과 다른 기존 파일의 차이, 복사할 파일, `package.json`·`.gitignore`·`biome.json`·`turbo.json`·`.claude/settings.json`에 더할 항목을 보여 주고 파일은 쓰지 않는다. 스킬·플러그인 설치도 하지 않는다.
- `--skip-skills`: 스킬·플러그인·OMX 설치와 agent-browser CLI 자동 설치(`scripts/skills-setup.mjs`)를 건너뛴다. 나중에 `pnpm skills:setup`으로 한다.
- `--with-global`: 없는 전역 도구(OMX CLI, gstack, agent-browser CLI, Vercel CLI, Neon CLI)를 전역에 설치한 뒤 프로젝트 설치를 한다.

설치기는 기존 파일을 덮어쓰지 않는다. `AGENTS.md`, `CLAUDE.md`가 이미 있으면 템플릿 블록을 끝에 한 번만 덧붙인다. 여러 번 실행해도 결과가 같다.
<!-- /b -->

## 설치된 프로젝트에서 자주 쓰는 명령
| 명령 | 하는 일 |
|---|---|
| `pnpm dev-cycle case` | 현재 diff의 케이스 판정 |
| `pnpm dev-cycle table <케이스> --write --title "<요약>"` | 대조표 열기 |
| `pnpm dev-cycle status`, `audit`, `close` | 진행 확인, 빈 칸 검사, 라운드 닫기 (`blocked`·`미실행` 칸이 있으면 사용자가 동의한 뒤 `close --partial`) |
| `pnpm dev-cycle secrets` | 라운드 끝 커밋 전에 스테이징한 변경에서 로컬 `.env*`(루트, `apps/web`, `packages/db`. `.env.schema`·`.env.example` 제외)의 비밀값과 흔한 키 형식(개인 키, `sk-`, GitHub 토큰 등)을 찾는다. 값은 출력하지 않는다. 걸리면 exit 1, 검사를 실행하지 못하면 exit 2 |
| `pnpm agents:sync`, `pnpm agents:check` | `.claude/agents`에서 `.codex/agents`(Codex)·`.agents/agents`(Antigravity) 생성, 차이 검사 |
| `pnpm skills:setup` | `skills.manifest.json`대로 빠진 스킬·플러그인·OMX 설정과 agent-browser CLI를 설치 (`--with-global`이면 나머지 전역 도구도) |
| `pnpm skills:check` | 설치하지 않고 상태만 확인. 프로젝트 scope 항목이 빠졌으면 exit 1. 선택 묶음은 상태만 보여 준다 |
| `pnpm skills:update` | 설치한 외부 스킬을 GitHub 원본과 파일 단위로 비교해 바뀐 스킬과 빠진 스킬만 다시 설치한다. `--check`는 확인만 하고, 스크립트나 설정 파일이 바뀐 스킬은 그 파일을 보여 준다(설치 전에 원격 내용을 읽는다). `pnpm skills:update <이름>...`은 그 스킬만 설치한다. 스크립트가 바뀐 스킬은 `--check`로 검토한 뒤 이름을 지정해야 설치되고, 그사이 원격이 바뀌면 설치하지 않는다. 진행 중인 라운드가 없을 때 `pnpm dev-cycle status`가 `--if-due`로 하루 한 번 확인하고, 새 버전이 있으면 업데이트할지 묻는다(`prokit-skills-update`). 업데이트는 케이스 H 라운드로 커밋한다 |
| `pnpm skills:setup --optional <묶음>` | 선택 스킬 묶음(<!-- v:optional.namesCode -->`ops`, `motion`, `mobile`<!-- /v -->)을 설치. 여러 개는 쉼표로 잇는다(`ops,motion`) |
| `pnpm export:html [--base /<하위 경로>]` | 화면을 정적 HTML로 내보내 `html/`에 둔다(git 무시). 프로젝트 파일은 바꾸지 않고 임시 복사본에서 `/api`·`/dashboard`를 빼고 빌드한다. 서버 전용 `.env` 값이 결과물에 들어가면 exit 2. 보기: `pnpm dlx serve html`. GitHub Pages처럼 하위 경로에 올릴 때 `--base` |
| `pnpm vercel:deploy develop`, `production` | Vercel 배포. `--check`는 준비 상태와 새 마이그레이션만 본다 |
| `pnpm release [--title "<영어 제목>"] [--minor]`, `pnpm release --publish <노트>` | production 배포 전 릴리스. 다음 버전과 `release/` 노트를 만들고, `--publish`가 version 커밋, 태그, push, GitHub Release를 만든다 |
| `claude plugin update <플러그인> --scope project` | Claude 플러그인 업데이트. `pnpm skills:update`는 플러그인을 올리지 않는다. `claude plugin marketplace update <마켓플레이스>`로 목록을 받고 플러그인 저장소의 `hooks/` 변경을 본 뒤 올린다. 세션을 다시 열어야 적용된다(`prokit-skills-update`) |

## 템플릿 자체 개발
<!-- b:tpl-readme-dev me="prokit-next-neon" other="prokit-next-supabase" josa="와" -->
- 테스트: `node --test 'templates/prokit-next-neon/tests/*.test.mjs'` (저장소 루트에서 실행. 디렉터리 인자는 Node 24에서 동작하지 않는다)
- 공유 파일을 [prokit-next-supabase](../prokit-next-supabase/README.md)와 같게 두는 규칙은 [AGENTS.md "템플릿 수정 규칙"](../../AGENTS.md#템플릿-수정-규칙)에 있다(`tests/shared-files.test.mjs`가 검사한다).
- 스킬 eval 입력: `templates/prokit-next-neon/evals/` (skill-creator 형식)
- `tests/skills.test.mjs`는 skill-creator(`SKILL_CREATOR_DIR`로 지정 가능)와 `python3`가 필요하다.
<!-- /b -->
