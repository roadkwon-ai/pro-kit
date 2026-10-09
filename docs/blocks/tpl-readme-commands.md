<!-- 두 템플릿 README "설치된 프로젝트에서 자주 쓰는 명령" 표의 앞 열두 행(표 머리는 빼고). 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다. 뒤의 행은 템플릿마다 달라 따로 두고, 같은 마지막 행은 `tpl-readme-commands-plugin`이다 -->
| `pnpm dev-cycle case` | 현재 diff의 케이스 판정 |
| `pnpm dev-cycle table <케이스> --write --title "<요약>"` | 대조표 열기 |
| `pnpm dev-cycle status`, `audit`, `close` | 진행 확인, 빈 칸 검사, 라운드 닫기 (`blocked`·`미실행` 칸이 있으면 사용자가 동의한 뒤 `close --partial`) |
| `pnpm dev-cycle secrets` | 라운드 끝 커밋 전에 스테이징한 변경에서 로컬 `.env*`(루트, `apps/web`, `packages/db`. `.env.schema`·`.env.example` 제외)의 비밀값과 흔한 키 형식(개인 키, `sk-`, GitHub 토큰 등)을 찾는다. 값은 출력하지 않는다. 걸리면 exit 1, 검사를 실행하지 못하면 exit 2 |
| `pnpm agents:sync`, `pnpm agents:check` | `.claude/agents`에서 `.codex/agents`(Codex)·`.agents/agents`(Antigravity) 생성, 차이 검사 |
| `pnpm skills:setup` | `skills.manifest.json`대로 빠진 스킬·플러그인·OMX 설정과 agent-browser CLI를 설치 (`--with-global`이면 나머지 전역 도구도) |
| `pnpm skills:check` | 설치하지 않고 상태만 확인. 프로젝트 scope 항목이 빠졌으면 exit 1. 선택 묶음은 상태만 보여 준다 |
| `pnpm skills:update` | 설치한 외부 스킬을 GitHub 원본과 파일 단위로 비교해 바뀐 스킬과 빠진 스킬만 다시 설치한다. `--check`는 확인만 하고, 스크립트나 설정 파일이 바뀐 스킬은 그 파일을 보여 준다(설치 전에 원격 내용을 읽는다). `pnpm skills:update <이름>...`은 그 스킬만 설치한다. 스크립트가 바뀐 스킬은 `--check`로 검토한 뒤 이름을 지정해야 설치되고, 그사이 원격이 바뀌면 설치하지 않는다. 진행 중인 라운드가 없을 때 `pnpm dev-cycle status`가 `--if-due`로 하루 한 번 확인하고, 새 버전이 있으면 업데이트할지 묻는다(`prokit-skills-update`). 업데이트는 케이스 H 라운드로 커밋한다 |
| `pnpm skills:setup --optional <묶음>` | 선택 스킬 묶음({{v:optional.namesCode}})을 설치. 여러 개는 쉼표로 잇는다(`ops,motion`) |
| `pnpm export:html [--base /<하위 경로>]` | 화면을 정적 HTML로 내보내 `html/`에 둔다(git 무시). 프로젝트 파일은 바꾸지 않고 임시 복사본에서 `/api`·`/dashboard`를 빼고 빌드한다. 서버 전용 `.env` 값이 결과물에 들어가면 exit 2. 보기: `pnpm dlx serve html`. GitHub Pages처럼 하위 경로에 올릴 때 `--base` |
| `pnpm vercel:deploy develop`, `production` | Vercel 배포. `--check`는 준비 상태와 새 마이그레이션만 본다 |
| `pnpm release [--title "<영어 제목>"] [--minor]`, `pnpm release --publish <노트>` | production 배포 전 릴리스. 다음 버전과 `release/` 노트를 만들고, `--publish`가 version 커밋, 태그, push, GitHub Release를 만든다 |
