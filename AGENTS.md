# 에이전트 규칙 (pro-kit)

이 저장소는 Better-T-Stack Next.js 프로젝트에 AI 에이전트 개발 환경을 설치하는 템플릿 <!-- v:templates.count.ko -->두<!-- /v --> 개(`templates/prokit-next-neon`, `templates/prokit-next-supabase`)와 학습 자료를 둔다. 템플릿 개요는 `README.md`와 `handbook/templates/`, 이 저장소를 관리하는 방법은 `CONTRIBUTING.md`, 명령과 옵션의 정본은 각 템플릿의 `README.md`다. 다만 두 템플릿 README가 함께 쓰는 글은 `docs/blocks/tpl-readme-*`가 원본이다(아래 "템플릿 수정 규칙"의 공통 값 항목).

## 이 작업공간의 인증과 환경 로딩
- 인증과 Git 작성자 정보의 정본은 부모 `/Users/freelife/youtube/.envrc`다. GitHub의 `GH_TOKEN`·`GITHUB_TOKEN`, Git의 `GIT_AUTHOR_NAME`·`GIT_AUTHOR_EMAIL`·`GIT_COMMITTER_NAME`·`GIT_COMMITTER_EMAIL`, Vercel의 `VERCEL_TOKEN`과 그 밖의 작업용 값은 이 파일에서 불러온다. 저장소별 `.envrc`는 부모 설정을 이어받고, 비어 있는 별칭 변수로 이미 불러온 값을 덮어쓰지 않는다.
- 인증이 필요한 명령은 대상 저장소에서 `direnv exec . <명령>`으로 실행한다. 실행 전에 필요한 변수의 존재 여부만 확인한다. direnv가 차단되면 사용자가 지정한 `.envrc`의 변경 내용을 확인하고 `direnv allow <해당 경로>`로 로딩을 갱신한 뒤 다시 확인한다. 환경 전체나 비밀값은 출력하지 않는다.
- Git HTTPS가 다른 자격 증명을 쓰면 명령에만 `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' <명령>`을 적용해 로딩한 GitHub 토큰을 사용한다. 전역 인증 설정을 바꾸거나 토큰을 원격 URL·명령 인자·파일·커밋에 넣지 않는다. Git 작성자 정보는 인증 토큰과 별도로 확인한다.
- 실패 시 환경 미로딩, direnv 차단, 토큰 만료·권한 부족, 원격 주소 오류, 네트워크 오류를 구분한다. 먼저 읽기 전용 저장소 조회로 접근을 확인하고, 옛 계정 원격 주소는 `site-links.json`과 현재 저장소 정본을 대조한다. 로딩을 확인하기 전에 토큰이 없다고 단정하거나 로그인·토큰 재발급을 요청하지 않는다. 이 확인은 push·릴리스·배포 권한을 대신하지 않는다.

## 프로킷을 설치한 다른 저장소
- 루트에 `.dev-cycle.json`이 있는 저장소(pro-kit-web, 템플릿으로 만든 프로젝트 등)의 코드, 설정, 화면, 문서를 고쳐 달라는 요청은 이 세션에서 하지 않는다. 그 저장소의 스킬, 에이전트, dev-cycle 규칙은 그 폴더에서 연 세션에서만 불러오기 때문이다. 이 세션에서 고치면 라운드, 화면 검사, 독립 리뷰를 모두 건너뛴다.
- 그 저장소의 worktree, scratchpad 사본, 임시 clone도 같은 저장소로 본다.
- 요청을 받으면 고치기 전에 멈추고, 요청을 정리한 프롬프트와 이어 갈 한 줄(`cd <저장소 절대 경로> && claude "<요청>"`)을 준다. 다른 에이전트를 쓰면 그 에이전트를 여는 명령으로 바꾼다. 읽기만 하는 조사(파일 읽기, 검색, 화면 보기)는 이 세션에서 해도 된다.
- 사용자가 이유를 듣고도 이 세션에서 하라고 하면, 그 저장소의 `AGENTS.md`와 `docs/dev-workflow.md`를 먼저 읽고 그 규칙대로 라운드를 열고 닫는다(`pnpm --dir <저장소> dev-cycle …`). 리뷰는 그 저장소의 리뷰어 정의(`.claude/agents/prokit-reviewer.md`)를 읽혀 맡긴다.

## 템플릿으로 새 프로젝트 만들기
"템플릿으로 프로젝트 만들어줘"처럼 새 프로젝트를 요청받으면 아래 순서로 초기 구성까지 마친다. 명령은 선택한 템플릿 README의 "새 프로젝트 시작"과 "설치한 뒤"를 그대로 따르고 옵션을 바꾸지 않는다. PRD를 받고 그 PRD로 스킬 구성(두뇌, 과설계 방지 스킬, mattpocock 추가 스킬, 응답 방식, 화면 디자인 보조)을 추천해 고르게 하는 일은 먼저 `prokit-init` 스킬(`.agents/skills/prokit-init/SKILL.md`)을 읽고 따른다. PRD가 없으면 init하지 않는다. 카탈로그와 추천 기준의 정본은 템플릿의 `files/.agents/skills/prokit-dev-cycle/references/brains/README.md`다.

1. **템플릿 선택**: `prokit-next-neon` 또는 `prokit-next-supabase`. 요청에 DB가 드러나지 않으면 추측하지 말고 묻는다. 차이는 `handbook/templates/choose.md`의 비교표로 설명한다. 프로젝트 이름(소문자 kebab-case. 패키지 이름이 `@<이름>/db` 등이 된다)이 없으면 함께 묻는다. PRD(`/prokit-init`의 인자로 준 파일이나 내용, 붙여 넣은 글, 요청의 서비스 설명, 요청에 적힌 프리셋 팩. `prokit-init` 0절)가 없으면 다른 질문보다 먼저 받는다. 그래도 받지 못하면 PRD가 필수인 이유를 알리고 만들지 않고 끝낸다. 스킬 구성은 PRD로 만든 추천을 보여 주고 `prokit-init`의 묻는 조건대로 묻거나 정한다. 질문에 답할 수 없는 흐름이면 두뇌와 과설계 방지 스킬은 `none`, 추가 스킬, 응답 방식, 화면 디자인 보조는 설치하지 않고 보고에 추천과 설치 명령을 적는다.
2. **위치**: 이 저장소 밖에 만든다. 기본은 이 저장소의 상위 디렉터리(`../<이름>`. 예: `../my-app`)이고, 사용자가 경로를 주면 그곳이다. 이 저장소 안(`templates/` 등)에는 만들지 않는다. 대상 디렉터리가 이미 있으면 멈추고 묻는다.
3. **준비물 확인**: Node <!-- v:node.min -->22.20<!-- /v --> 이상(<!-- v:node.recommended -->24<!-- /v --> 권장. <!-- v:node.min -->22.20<!-- /v -->보다 낮으면 설치기가 멈추고, <!-- v:node.recommended -->24<!-- /v -->보다 낮으면 경고만 한다), pnpm, git, 컨테이너 엔진. supabase면 Supabase CLI <!-- v:supabaseCli.min -->2.117<!-- /v --> 이상도 확인한다. 고른 두뇌의 준비물도 본다(gstack은 Bun, Spec Kit은 설치할 때 uv). 빠진 것이 있으면 설치 명령을 알려 주고 멈춘다. 전역 설치는 사용자가 요청할 때만 한다. gstack 본체, OMX CLI, OpenSpec CLI는 그 두뇌를 고르면 설치기가 전역에 설치하므로 미리 확인하지 않는다. oh-my의 OMX `team`은 tmux가 있어야 돌지만, 없어도 멈추지 않고 보고에 적는다. Windows는 WSL2의 Ubuntu 셸에서만 진행한다(`uname -r`에 `microsoft`가 보인다). PowerShell이나 Git Bash 같은 Windows 셸이면 템플릿 README의 Windows 절을 안내하고 멈춘다. macOS의 Podman은 머신 상태를 따로 본다(`podman machine list`). 머신이 멈춰 있으면 `podman machine start`로 켜고 보고에 적는다. 머신이 없으면 `podman machine init`을 안내하고 멈춘다. Linux·WSL의 Podman에는 머신이 없다.
4. **생성**: 상위 디렉터리에서 README의 `pnpm create better-t-stack@latest <이름> …` 명령을 실행한다. `pnpm create`는 `--dir`·`-C`를 따르지 않고 지금 디렉터리에 만든다. 그래서 `(cd <상위 절대 경로> && pnpm create better-t-stack@latest <이름> …)`처럼 서브셸에서 실행한다. neon은 `--db-setup docker`, supabase는 `--db-setup supabase --manual-db`다.
5. **템플릿 설치**: `bash <이 저장소>/templates/<템플릿>/install.sh <프로젝트 경로> --brain <값> --simplicity <값>`. `none`도 명시한다. 추가 스킬은 `--matt <스킬>[,<스킬>]`, i-have-adhd는 `--optional i-have-adhd`, taste-skill은 `--optional taste`를 더한다(둘 다면 `--optional i-have-adhd,taste`). `--with-global`은 사용자가 전역 도구 설치를 요청할 때만 붙인다(전역 설정과 훅을 바꾼다). 과설계 방지로 ponytail을 고르고 이 옵션을 줄 때만 Codex Ponytail 네이티브 플러그인을 설치한다. 기본 실행도 <!-- v:policy.agentBrowser.da -->agent-browser CLI가 없거나 npm 최신판보다 낮으면 전역에 최신판을 설치한다<!-- /v -->. 설치했거나 실패 경고가 나오면 보고에 적는다. exit 0이 아니면 출력을 보고하고 멈춘다.
6. **로컬 DB 시작** (README "로컬 DB 시작"):
   - neon: `lsof -nP -iTCP:5432 -sTCP:LISTEN`로 포트를 먼저 확인한다. 사용 중이면 README의 `DB_PORT` 방식으로 바꾼다. 이어서 `packages/db`에서 `podman compose up -d`(Docker면 `db:start`).
   - supabase: Podman이면 `DOCKER_HOST`를 먼저 설정한다(macOS와 Linux·WSL의 값이 다르다. 템플릿 README 준비물). `packages/db`에서 `supabase init`을 실행하고, `supabase/config.toml`의 `project_id = "db"`를 프로젝트 이름으로 바꾼 뒤 README의 `supabase start -x …`로 DB만 띄운다. `apps/web/.env`에 `DATABASE_URL`이 없으면(`--manual-db`는 넣지 않는다) README대로 로컬 주소를 더한다.
7. **첫 마이그레이션** (README "설치한 뒤" 1번): `db:generate`로 인증 테이블 마이그레이션을 만들고 `db:migrate`로 적용한다. supabase는 적용 전에 `enable_rls_auth` 커스텀 마이그레이션(`prokit-db` 스킬의 RLS 규칙)을 추가하고, 적용 뒤 `supabase db advisors --local --type security`가 `No issues found`인지 확인한다. Better-T-Stack이 만든 README의 `db:push` 단계는 따르지 않는다.
8. **확인**: 새 프로젝트에서 `pnpm check`를 한 번 실행해 Better-T-Stack이 만든 코드의 포맷과 정렬(import, Tailwind 클래스)을 정리한다. 이어서 `pnpm skills:check`, `pnpm agents:check`, `pnpm check-types`, `pnpm exec biome check .`가 exit 0인지 본다.
9. **커밋**: 새 프로젝트의 기본 브랜치에 설치 결과, 8번의 포맷 정리, 첫 마이그레이션, PRD(`docs/prd.md` 또는 `docs/first-request.md`. `prokit-init` 5절)를 커밋한다(supabase는 `packages/db/supabase/`도). 예: `chore: dev-cycle 하네스와 프로젝트 규칙 초기 설정`. 커밋하지 않으면 설치 파일과 첫 마이그레이션(케이스 E)이 첫 dev-cycle 라운드의 diff에 섞인다. 그러면 audit이 실제 작업보다 무거운 케이스(예: F)로 상향을 요구한다. 원격 저장소 생성과 push는 요청할 때만 한다.
10. **보고**: 다음을 보고한다.
    - 프로젝트 경로, 템플릿, 로컬 DB 주소와 중지 명령, 8번 결과
    - 스킬 구성: 고른 두뇌·과설계 방지 스킬·추가 스킬·응답 방식·화면 디자인 보조와 `pnpm skills:check`의 해당 줄, 설치기가 이 프로젝트에서 끈 전역 플러그인과 남은 전역 경고, 건너뛴 추천과 나중에 설치하는 명령(`prokit-init` 6절)
    - 이미지 그리기: <!-- v:agents.imageTools -->Codex, Antigravity, Grok Build<!-- /v -->는 자체 이미지 도구로 그린다. Claude Code는 ChatGPT로 로그인한 Codex CLI(`gpt-image` 스킬)나 `OPENAI_API_KEY`(프로젝트나 작업 폴더의 `.env`. 세션을 열 때 훅이 불러온다)가 있어야 그린다. 없으면 배치도로 진행한다
    - 사용자가 할 일: 새 에이전트 세션에서 신뢰 질문에 동의, 프로젝트 루트에서 `.agents/skills/impeccable/scripts/impeccable hooks on`(스킬 호출로 켜지 않는다. 템플릿 README "설치한 뒤" 4번), `GLOSSARY.md`·`docs/domain/project.md` 채우기, 원격 DB 연결(README), 배포할 때 Vercel 준비와 production 릴리스 준비(GitHub `origin` 원격, `gh auth login`. production은 `pnpm release`로 버전 태그, `release/` 노트, GitHub Release를 만든 커밋만 배포한다. README "Vercel 배포". 새 프로젝트 세션에서 `prokit-deploy`로 한다), 필요할 때 선택 스킬 묶음 설치(`pnpm skills:setup --optional <묶음>`. `handbook/skills/optional-bundles.md`)

원격 DB 연결(`neon link`, `supabase link`), Vercel 연결(`vercel link`)과 배포, 원격 프로젝트 생성은 요청할 때만 한다. 연결 문자열과 비밀번호는 파일과 출력에 남기지 않는다.

초기 구성이 끝나면 이 저장소 세션에서 새 프로젝트의 기능 개발을 이어 가지 않는다. 새 프로젝트의 스킬, 에이전트, dev-cycle 규칙은 그 프로젝트에서 연 새 세션에서만 불러온다. 보고할 때 새 프로젝트에서 세션을 열라고 안내한다.

### 화면만 만들기
"화면만", "DB는 쓰지 않아", "HTML만"처럼 요청하면 위 순서를 이렇게 바꾼다.
- 1번: 템플릿은 `prokit-next-neon`으로 정하고 묻지 않는다. 요청에 폴더 이름이 있으면(예: "[living] 폴더로") 그 이름을 쓴다.
- 3번: 컨테이너 엔진과 Podman 머신은 확인하지 않는다. "없는 준비물은 설치해줘"는 전역 설치 요청으로 보고 빠진 준비물(Node <!-- v:node.min -->22.20<!-- /v --> 이상, pnpm, git)을 설치한다. 비밀번호가 필요한 명령은 실행하지 않고 사용자에게 준다.
- 6번(로컬 DB)과 7번(첫 마이그레이션)은 건너뛴다. 9번 커밋에는 설치 결과, 포맷 정리, PRD만 들어간다.
- 9번 커밋 전에 새 프로젝트 `AGENTS.md` 맨 위(`<!-- prokit-template:start -->` 앞)에 한 줄을 넣는다: `` > 화면만 프로젝트: DB 없이 예시 데이터로 화면만 만든다. 규칙은 `prokit-ui`의 "화면만 프로젝트" 절이다. ``
- 10번 보고: 로컬 DB 주소 대신 개발 서버로 보는 법(`pnpm dev:web`), HTML로 내보내기(`pnpm export:html` 또는 "HTML로 내보내줘"), 실제 서비스로 바꾸는 법("실제 서비스로 바꿀 거야")을 알린다. 원격 DB 연결과 배포 준비는 실제 서비스로 바꿀 때 할 일로 미룬다.

### 작업 폴더에서 시작했을 때
세션을 이 저장소 밖(작업 폴더, 예: `~/projects`)에서 열고 "pro-kit을 받고 그 안의 AGENTS.md대로"처럼 요청한 경우다. 위 절차의 "이 저장소"는 받은 pro-kit 폴더다.
- 받기: 작업 폴더에 `pro-kit`이 없으면 `git clone https://github.com/roadkwon-ai/pro-kit`으로 받는다. 있으면 새로 받지 않고 그대로 쓴다. git으로 받은 폴더면 `git -C pro-kit pull --ff-only`로 최신으로 맞추고, 로컬 변경이 있어 실패하면 멈추고 알린다. 옛 사본은 이어 받을 수 없다(2026-10-08 저장소를 `roadkwon-ai`로 옮기며 이력을 새로 시작했다). 옛 이름 `bts-starter-kit` 폴더만 있거나, `pro-kit`의 `origin`이 옛 주소(`github.com/roadkwonai/pro-kit`)이거나 이력이 달라 `pull --ff-only`가 실패하면 멈추고, 그 폴더 이름을 `pro-kit-old`로 바꾼 뒤 새로 받으라고 알린다.
- 프리셋 팩: 요청에 `packs/<이름>` 프리셋 팩이 나오면 pro-kit을 받은 뒤 `node pro-kit/scripts/pack.mjs <이름>`으로 그 팩만 받는다. `tutorials/packs.json`의 zip을 받아 sha256을 확인하고 `pro-kit/packs/<이름>/`에 푼다(이미 같은 판이면 그대로 둔다). 요청에 사용자가 받아 둔 팩 zip 경로가 있으면 `--zip <경로>`를 붙여 그 zip을 같은 확인을 거쳐 푼다. 그 zip이 없거나 sha256이 다르면(옛 판) 그 zip은 쓰지 않고 `--zip` 없이 다시 받은 뒤 보고에 적는다. 실패하면 출력을 보고하고 멈춘다.
- 미게시 팩: `tutorials/packs.json`의 `published: false` 항목은 원격으로 받지 않는다. 사용자가 준 로컬 zip을 `--zip`으로 검증할 수 있지만, 파일이 없거나 sha256이 다르면 원격 최신판으로 대체하지 않고 결과를 보고한다. 로컬 확인 명령은 `node scripts/pack.mjs <이름> --zip <경로>`다.
- 위치: 기본값 `../<이름>`은 작업 폴더 안, pro-kit 옆이다.
- 첫 요청 저장: 요청에 서비스 요청이 있으면 pro-kit 받기, 팩 zip 경로, 프로젝트 만들기 지시를 뺀 나머지(서비스 컨셉부터 끝까지. "다 만들면 HTML 파일로 내보내줘"와 배포 요청 포함)를 새 프로젝트의 `docs/first-request.md`에 적고 9번 커밋에 넣는다. 문장은 바꾸지 않고, 바꿀 곳 표시인 `[ ]` 괄호만 뗀다.
- impeccable 훅: 10번의 사용자 할 일 중 `impeccable hooks on`은 에이전트가 9번 커밋 전에 새 프로젝트 루트에서 `.agents/skills/impeccable/scripts/impeccable hooks on`으로 직접 실행한다(스킬 호출로 켜지 않는다). 켠 뒤 `.claude/settings.local.json`의 훅 명령이 `…/scripts/impeccable" hook`인지 확인하고, 생긴 `.impeccable/config.json`을 9번 커밋에 넣는다(`settings.local.json`은 개인 설정이라 넣지 않는다).
- 보고 끝에 새 폴더에서 이어 갈 한 줄을 준다: `cd <프로젝트 절대 경로> && <지금 에이전트를 여는 명령> "docs/first-request.md의 요청대로 이어서 해줘"`. Antigravity는 `agy -i "<요청>"`, Grok Build는 `grok --trust "<요청>"`으로 연다(Grok은 새 폴더를 신뢰해야 규칙과 스킬을 읽는다). 지금 세션을 묻지 않고 진행하는 모드로 열었으면 같은 옵션을 붙인다(<!-- v:agent.claude.yoloCode -->`claude --dangerously-skip-permissions`<!-- /v -->, <!-- v:agent.codex.yoloCode -->`codex --yolo`<!-- /v -->, <!-- v:agent.agy.yoloCode -->`agy --dangerously-skip-permissions`<!-- /v -->, <!-- v:agent.grok.yoloCode -->`grok --permission-mode bypassPermissions`<!-- /v -->). 새 폴더에서 열어야 그 프로젝트의 규칙, 스킬, 에이전트가 켜진다고 함께 알린다.
- 이 세션에서 화면을 이어 만들지 않는다(위 "초기 구성이 끝나면" 규칙). 배포 요청("GitHub Pages에 배포해줘", "Vercel에 배포해줘")도 `docs/first-request.md`에 넣어 두면 프로젝트 세션이 화면을 다 만든 뒤 `prokit-ui`의 배포 절차로 한다. 원격 저장소와 프로젝트를 만드는 것까지 요청한 것으로 본다.

적용하다 템플릿 결함을 찾으면 새 프로젝트에서만 고치고 넘어가지 않는다. 먼저 보고하고, 사용자가 원하면 이 저장소의 템플릿을 고친다.

## 기존 프로젝트에 도입하기
이미 진행하던 프로젝트에 프로킷을 들이는 요청("이 프로젝트에 프로킷 적용해줘", "프로토타입을 프로킷으로 개발하고 싶어", "PHP 서비스를 Next.js로 옮기고 싶어")은 `prokit-init`의 유형 선택부터 한다. 유형은 새 프로젝트(`new`, 위 절차), 초기 프로젝트(`early`: PRD·화면 정의서·디자인 시스템·프로토타입만 있고 개발 환경이 없다), 운영 중인 Next.js(`operating`: 개발·운영 중인 Next.js 프로젝트), 전환(`migration`: 다른 언어·프레임워크에서 Next.js로)이다. Next.js가 아닌 운영 프로젝트는 전환이다. 질문 문구와 기록 틀은 `prokit-init`의 `references/existing-project.md`, 설계와 결정 근거는 `docs/plans/2026-10-22-prokit-project-types-and-brains.md`다.

1. **자료와 초기 분석**: 대상 경로와 PRD·기획 자료(있으면)를 받는다. 이 유형들은 PRD가 필수가 아니다. 지금 세션의 기본 AI가 대상 폴더를 읽기만 하며 초기 분석을 하고 요약을 보여 준다. 동의를 받기 전에는 대상 폴더에 아무것도 쓰지 않는다.
2. **맞춤 설정**: 초기 분석과 PRD로 템플릿, 적용 방식, 작업 브랜치, 스킬 구성(두뇌는 하나를 권하되 여럿 가능)을 추천하고 `prokit-init`의 묻는 법대로 확정한다.
3. **동의**: 유형별 동의 질문을 한 번 한다. 하지 않겠다고 하면 바꾼 것 없이 초기 분석 요약과 고른 설정만 보고하고 끝낸다.
4. **안전 점검**: early와 operating은 커밋하지 않은 변경이 있으면 멈춘다. 지금 브랜치, `prokit/setup` 브랜치가 이미 있는지, 추적 중인 `.env*` 비밀 파일(이름만)을 확인한다. 대상이 git 저장소가 아니면 early는 `git init`과 첫 커밋으로 시작하고, operating은 지금 상태를 첫 커밋으로 남길지 묻는다(아니면 끝낸다). migration의 기존 코드는 읽기만 하므로 git이 아니어도 된다. `git init`을 했으면 첫 커밋 전에 `.env*`·`node_modules/` 같은 파일을 이름만 보여 주고 `.gitignore`에 더해 확인받는다(`prokit-init`의 `references/existing-project.md` 6절).
5. **적용**:
   - early: 같은 폴더에서 한다. git 저장소가 아니면 `git init`과 첫 커밋을 하고 `prokit/setup` 브랜치를 만든다. 루트에는 `.git`만 남기고 기획 자료는 `docs/`로, 프로토타입 코드와 그 설정은 `prototype/`으로 `git mv`해 커밋한다. 상위 폴더에서 위 4번의 `pnpm create better-t-stack@latest <폴더 이름> …` 명령에 `--no-git --directory-conflict merge`를 붙여(`--git` 대신) 그 폴더에 만들고, 바로 `git checkout -- docs prototype`으로 옮긴 파일의 원본을 되돌린다(Better-T-Stack이 폴더 전체를 포맷한다). `install.sh <경로> --project-type early --default-branch <병합할 기본 브랜치> …`(설치기가 `biome.json`에서 `prototype/`을 뺀다) 뒤 위 6\~9번을 하고, `prokit/setup`을 기본 브랜치에 fast-forward로 병합한다.
   - operating: 같은 폴더의 `prokit/setup` 브랜치에서 한다. Better-T-Stack 구조이고 DB가 Postgres와 Drizzle이면 실제 DB에 맞는 템플릿으로 `install.sh <경로> --project-type operating …`, 아니면 `install.sh <경로> --adopt …`(기존 스택과 폴더는 그대로 두고 하네스만 설치한다). 앱 코드는 바꾸지 않는다. 확인은 위 8번에서 `pnpm check`를 빼고(앱 코드의 포맷이 바뀐다), 그 프로젝트의 검사(lint, 타입 검사, 테스트)를 설치 전과 뒤에 돌려 비교한다. 설치 뒤에만 실패하면 설치 결함이니 멈추고 보고한다. 원래 있던 지적은 고치지 않고 보고에 적어 정밀 분석의 H Task로 넘긴다. 사용자가 고른 대로 기본 브랜치에 fast-forward로 병합하거나(추천) 도입 브랜치에서 계속한다. 설치 명령에는 `--default-branch`를 늘 붙인다. 병합하면 `prokit/setup`을 만들기 전의 기본 브랜치, 계속하면 `prokit/setup`이다(빼면 설치기가 `origin/HEAD`·`main`·`master`를 찾지 못할 때 지금 브랜치 `prokit/setup`을 기준으로 적는다). 계속했다가 나중에 기본 브랜치에 병합하면 `.dev-cycle.json`의 `defaultBranch`를 기본 브랜치로 되돌린다(그 프로젝트의 H 라운드. 진행 계획을 확정하기 전이면 `--no-task`).
   - migration: 새 폴더(기본 `../<이름>`)에 위 1\~9번으로 만들고(1번의 PRD는 없어도 된다) 설치 명령에 `--project-type migration --legacy <기존 코드 경로>`를 더한다. 기존 코드와 그 배포·CI는 건드리지 않는다.
   - 설치 명령에는 고른 스킬 구성(`--brain <이름>[,<이름>]`, `--simplicity` 등)을 위 5번처럼 붙인다. push와 원격 저장소 생성은 요청할 때만 한다.
6. **도입 기록과 다음 요청**: `docs/prokit/intake.md`(유형, 초기 분석 요약, 확정한 설정, 동의 질문과 답, 빈 "디자인 방향" 절)와 `docs/first-request.md`(정밀 분석부터 이어 갈 요청과 원래 요청)를 적용 커밋에 넣는다.
7. **보고**: 위 10번 보고에 유형, 적용 방식과 브랜치(병합 여부), 설치기가 `유지(템플릿과 다름)`로 남긴 파일, 다음 세션 한 줄(`cd <프로젝트 절대 경로> && <에이전트 명령> "docs/first-request.md의 요청대로 이어서 해줘"`)을 더한다.

그 뒤는 그 프로젝트에서 연 새 세션이 한다. `prokit-analyzer`로 정밀 분석을 하고, 두뇌가 진행 계획(`tasks/plan.md`)을 세우고, Task마다 라운드를 연다(`pnpm dev-cycle table … --task T<n>`. 앞 Task가 끝나야 다음 Task가 열린다). 절차는 템플릿 `prokit-dev-cycle` 6절이다. 이 저장소 세션에서 이어 가지 않는다.

## 기존 프로젝트에 템플릿 갱신 반영
"템플릿 변경을 <프로젝트>에 반영해줘" 같은 요청은 다음 순서로 한다.
1. `bash templates/<템플릿>/install.sh <프로젝트> --diff`로 차이를 본다. `--diff`는 파일을 쓰지 않고, 템플릿과 다른 파일의 diff, 복사할 파일, `package.json`·`.gitignore`·`biome.json`·`turbo.json`·`.claude/settings.json`에 더할 항목을 보여 준다.
2. `.dev-cycle.json`은 설치기가 값을 채우는 파일이라 `--diff`에 나오지 않는다. 템플릿의 `files/.dev-cycle.json`과 직접 비교한다.
3. 옮길 항목을 정리해 보고한다. 그 프로젝트가 스스로 고친 내용(예: `DB_PORT` 변수화)은 옮길 항목에서 뺀다.
4. 용어집 파일 이름은 `GLOSSARY.md`다(`domain-modeling` 새 판). 그 프로젝트가 아직 `CONTEXT.md`를 쓰면 반영할 때 먼저 `git mv CONTEXT.md GLOSSARY.md`로 옮긴 뒤 참조를 고친다. 옮기지 않으면 `install.sh --skip-skills`가 빈 `GLOSSARY.md`를 따로 만든다.
5. 스킬, 에이전트, 템플릿 이름은 `prokit-*`다(2026-10-06 이전, 저장소 이름이 `bts-starter-kit`이던 때는 `bts-*`). 옛 이름이 남아 있으면 `--diff`가 `옛 이름이 남아 있다`로 알린다. 열린 dev-cycle 라운드가 있으면 먼저 close한다(audit이 옛 리뷰 행을 누락으로 본다). 반영할 때 먼저 `.agents/skills/bts-*`, `.claude/agents/bts-*.md`, `docs/adr/0001-bts-next-<DB>-stack.md`를 `git mv`로 `prokit-*`로 옮긴다. 이어서 `.claude/skills/bts-*` 링크를 지우고, `AGENTS.md`·`CLAUDE.md`의 `bts-template` 마커와 문서의 `bts-*` 참조를 고친 뒤 `pnpm agents:sync`로 `.codex/agents`를 다시 만든다. 옮기지 않으면 `install.sh --skip-skills`가 `prokit-*`를 따로 만들어 두 벌이 된다.
6. 두뇌와 과설계 방지 스킬은 고른 것만 설치한다(2026-10-20부터. 그 전 판은 superpowers·OMC·OMX·ponytail을 기본 설치했다). `.dev-cycle.json`에 `brain`·`simplicity`가 없는 프로젝트는 둘 다 `none`으로 읽혀 `pnpm skills:check`가 남은 설치본을 충돌로 알린다. 열린 라운드를 닫은 뒤 H 라운드에서 템플릿의 `scripts/skills-setup.mjs`와 `skills.manifest.json`을 먼저 옮긴다(`install.sh --skip-skills`는 이 두 파일을 덮어쓰지 않고, 옛 판 스크립트는 `--brain`을 모른 채 그냥 끝난다). 이어서 `pnpm skills:setup --brain <이름|none> --simplicity <이름|none>`으로 고르면 고르지 않은 설치본을 지운다. 지금 구성과 가장 가깝게 두려면 `--brain superpowers --simplicity ponytail`, 가볍게 가려면 `--brain none --simplicity ponytail`이다. 고르는 기준은 템플릿 `brains/README.md`다. 반영한 뒤의 구성 변경("두뇌 바꿔줘" 등)은 그 프로젝트의 `prokit-skills-manage` 스킬이 H 라운드로 한다(v0.3.0에서 생긴 스킬이라 그 전에 만든 프로젝트는 `install.sh --skip-skills`가 더해 준다).
7. 실제 반영은 기본적으로 그 프로젝트에서 연 세션이 dev-cycle 케이스 H 라운드로 한다(도입한 프로젝트가 아직 진행 계획을 확정하지 않았으면 `--no-task`를 붙여 연다). 그 세션에서 진행하도록 안내한다. 라운드에서는 `install.sh <프로젝트> --skip-skills`로 없는 파일과 설정 항목을 더하고(템플릿 파일은 덮어쓰지 않고 설정 파일에는 항목만 더한다), 템플릿과 다른 파일은 직접 옮긴다.
8. v0.3.0 전에 만든 프로젝트는 새 파일(`prokit-analyzer`, `prokit-skills-manage`, `prokit-dev-cycle`의 `project-plan.md`·`analysis.md`)을 `--skip-skills`가 더하고, `scripts/dev-cycle.mjs`·`scripts/skills-setup.mjs`·`skills.manifest.json`·`prokit-*` 스킬 문서·`AGENTS.md`/`CLAUDE.md` 템플릿 블록은 7번처럼 직접 옮긴다. `.dev-cycle.json`에는 빌드·배포 설정과 작업공간 설정을 H로 보는 규칙을 더한다. 진행 계획과 Task 게이트는 `projectType`이 `early`·`operating`·`migration`일 때만 켜지므로, 기존 프로젝트로 다룰 때는 `--skip-skills --project-type <유형>`으로 기록한다(handbook `templates/update-existing.md` "v0.3.0 이전에 만든 프로젝트").

## 템플릿 수정 규칙
- 공식 프리셋의 원본 조사·COPY·제작·합격 기준과 등록·게시·카탈로그·Pages 반영은 비공개 `pro-kit-preset-skills`와 pro-kit-web이 맡는다. 이 저장소와 일반 사용자 템플릿에는 제작·게시 스킬과 역할, 제작 기록을 두지 않는다. 이 저장소와 사용자 템플릿은 완성팩을 `prokit-pack-use`로 활용해 화면·실전 개발을 수행하고 완성 프리셋 대비 품질을 검수한다. 담당 구분은 [완성팩 활용과 담당 구분](handbook/design/preset-publication.md)에 있다.
- 팩 활용에서는 검증된 팩의 서체·토큰·자산·모션·설정을 재사용한다. 사용자 선택값이 있으면 변경 범위를 기록하고 비변경 영역을 재검사한다. 실전 서비스에는 제작용 선택 팔레트·설정 견본·프로킷 미리보기 수신기를 넣지 않는다. 소비자 설정 구현과 품질 확인은 템플릿 `prokit-ui/references/preset-settings.md`를 따른다.
- 팩 활용 작업은 스타일을 다시 선택하거나 원본 사이트를 다시 조사하지 않는다. 팩의 실행 소스·기준 화면·모션 상태·호환성·맞춤화 항목을 먼저 확인한다. 기술 구현 전 재사용·설정 판단은 `prokit-dev-cycle/references/reuse-design.md`와 `prokit-reviewer(plan)`으로 검토한다.
- 완료한 프로젝트 계획·백로그는 `pnpm dev-cycle archive`로 `tasks/archive/YYYY-MM-DD-제목.md`에 옮긴다. `close`도 완료 항목을 함께 보관한다. 진행 중 대조표·미완료 항목은 유지하고, 기록 목록은 `tasks/archive/README.md`에서 본다. 날짜는 KST이며 기존 월별 기록은 보존한다.
- 위임은 설치 목록만으로 허용하지 않는다. 사용자 명시 출처, 프로젝트 정본, 실제 접근 가능한 제공자를 내용·출처·지문·범위·의존성·부작용으로 확인하고, 실제 변경·명령 종료 코드·산출물 해시를 패킷에 남긴다. `--context` JSON은 검사 자료이지 Main 승인 증명이 아니다. 최종 게이트는 Main 런타임의 검증된 콜백이나 실제 host adapter가 현재 task·run·제품·증거·공급자·환경·리뷰어 식별자에 묶어야 한다. 내장 전문 리뷰는 그 범위만 재사용하고 최종 `prokit-reviewer` 게이트는 매번 수행한다. 근거가 없으면 `unknown` 또는 `blocked`로 남기며 PASS로 바꾸지 않는다. 이 경계를 위해 별도 인증 서버나 등록 서비스를 더하지 않는다.
- 대조표 증거는 `pnpm dev-cycle evidence <행 번호> --file <증거 파일>`로 해당 행만 바꾼다. 증거 파일은 프로젝트 안 일반 한 줄 파일이며 FIFO·심볼릭 링크·프로젝트 밖 경로는 받지 않는다. 위임 capture artifact는 `tasks/evidence/`에 실행 전후를 각각 한 번만 남기고, 환경·자원 helper 결과와 private guard token·owner receipt는 작업 본문·출력·증거 칸에서 분리한다.
- 자원 정책의 실행 정본은 새 프로젝트 `.dev-cycle.json`의 `resources`다. 등록한 roots는 감시 범위일 뿐 자동 삭제 권한이 아니다. 프로젝트 밖·전역 캐시·영구 환경은 지우지 않고, 관리한 임시 폴더도 생성 핸들·소유권·실행 종료·결과 전달을 확인한 경우에만 정리한다. 새 프로젝트의 `dev`·`dev:web`·`build`를 보호 명령으로 바꿀 때는 원본 별칭과 실제 증거를 남긴 H 라운드에서만 한다.
- 테스트는 저장소 루트에서 `node --test 'templates/<템플릿>/tests/*.test.mjs'`로 실행한다. <!-- v:templates.count.ko -->두<!-- /v --> 템플릿 모두 통과해야 한다.
- 공유 파일은 <!-- v:templates.count.ko -->두<!-- /v --> 템플릿에서 바이트가 같아야 한다(`install.mjs`, `install.sh`, `files/scripts/*.mjs`, 공통 스킬 문서, 공통 테스트). 한쪽을 고치면 다른 쪽에 복사한다. `tests/shared-files.test.mjs`가 이를 검사한다.
- 설치할 스킬과 플러그인 목록의 정본은 `templates/<템플릿>/files/skills.manifest.json`이다.
- 검증 결과와 한계는 그 템플릿의 `VERIFICATION.md`에 적는다. 측정 보고서(HTML 등)는 `docs/reports/<날짜>-<이름>`으로 두고 `VERIFICATION.md`에서 링크한다. 측정 스크립트, 로그, 확인용 프로젝트는 저장소에 넣지 않는다.
- 사이트 주소 정본은 `site-links.json`이고 주소 변경 도구·저작권 조건은 기존 구현을 따른다. 팩 사용자는 검증된 프리셋의 모든 페이지와 동작을 유지하고 원래 서비스를 재조사하지 않는다.
- `files/` 아래 `.mjs`·`.json`은 Better-T-Stack `biome.json` 형식(탭 들여쓰기, 한 줄 80자)으로 둔다. 설치기가 복사한 뒤 Biome로 포맷하므로, 형식이 다르면 설치한 프로젝트와 늘 달라져 `--diff`가 포맷 차이로 가득 찬다. 고친 파일은 Better-T-Stack 프로젝트에서 `pnpm exec biome check --write <파일>`로 맞춘 뒤 가져온다.
- `install.mjs`나 `scripts/skills-setup.mjs`를 바꾸면 테스트와 별도로 실제 Better-T-Stack 프로젝트에 설치해 확인한다. 이 확인용 프로젝트는 scratchpad나 임시 디렉터리에 만든다.
- 확인용 설치도 그 경로에 project scope Claude 플러그인을 등록한다. 확인이 끝나면 그 디렉터리에서 `claude plugin uninstall <플러그인> --scope project`로 지운다. 띄운 DB 컨테이너도 정리한다.
- 이 저장소 루트의 `.agents/skills`·`.claude/skills`에는 관리용 문서 스킬 `prokit-docs`·`prokit-writing`(`skills-lock.json`으로 받는다)과 이 저장소 자체 스킬 `prokit-init`(새 프로젝트 초기 설정)만 둔다. 공식·외부 스킬은 템플릿으로 만든 프로젝트에, 프리셋 제작 스킬과 역할은 담당 저장소에 설치한다. 이 저장소에서 테스트·검증에 필요하면 잠시 설치하고, 끝나면 스킬 폴더와 `skills-lock.json` 항목을 지워 원래 상태로 돌린다.
- 새 프로젝트는 설치하는 시점의 최신판을 받는다. Better-T-Stack은 `@latest`, skills CLI는 `skills@latest`로 실행하고, 공식 스킬은 원본 저장소의 최신 커밋에서 받는다. Claude 플러그인은 마켓플레이스를 갱신한 뒤 설치하고, agent-browser CLI는 npm 최신판을 쓴다. 템플릿에 이 버전들을 고정하거나 공식 스킬 파일을 복사해 두지 않는다(`files/.agents/skills`에는 `prokit-*`만 둔다). 새 판 때문에 생성이나 설치가 깨지면 템플릿을 고치고, 확인한 판을 `VERIFICATION.md`에 적는다.
- 템플릿의 명령, 포트, 스킬 수, 설치 구성을 바꾸면 `handbook/`의 비교표(`templates/choose.md`), 도식, 폴더 구조(`reference/project-structure.md`)와 이 파일의 절차도 맞춘다. 공식 스킬을 더하거나 빼거나 그 스킬을 읽는 곳(dev-cycle 행, `prokit-*` 연결 표, 에이전트)을 바꾸면 `handbook/skills/official-skills.md`의 표도 맞춘다. 호출률과 활용도 수치는 다시 잰 경우에만 바꾸고, 잰 날짜와 판을 함께 적는다.
- 루트 `README.md`에는 요약과 링크만 둔다. 상세는 `handbook/`, `tutorials/`, 템플릿 README에 쓰고 README에서 링크한다.
- 이 저장소 세션의 두뇌는 없음(기본 AI)이고 과설계 방지 스킬은 ponytail이다(`.claude/settings.json`). 전역 `~/.claude/CLAUDE.md`의 OMC 블록이나 전역 플러그인 훅이 OMC·superpowers·gstack 스킬을 먼저 쓰라고 해도 이 저장소 작업에는 쓰지 않는다.
- 셸 작업 디렉터리를 템플릿 안에 두지 않는다. OMC 훅이 그 자리에 `.omc/`를 만들어 템플릿 파일에 섞인다. 명령은 저장소 루트에서 절대 경로나 상대 경로로 실행한다.
- 문서 원본은 `handbook/`(사이트 `/docs`)이다. 문서 홈 `handbook/README.md`의 묶음 표와 묶음마다 `README.md`의 쪽 표가 순서의 정본이고, 쪽은 `# 제목`, 빈 줄, `> 한눈에: …`로 시작한다. 템플릿의 명령, 스킬, 구성을 바꾸면 관련 handbook 쪽도 맞추고 `node --test scripts/handbook.test.mjs`를 실행한다. 비용과 키, Windows, 문제 해결, 용어 풀이는 `tutorials/`로 링크하고 다시 쓰지 않는다. 홈페이지(pro-kit-web)는 `handbook/`과 `tutorials/`의 모든 문서 쪽에 마크다운 복사와 AI로 보내기(ChatGPT·Claude) 메뉴, `<쪽>.md` 주소, 도식 내려받기를 붙인다(pro-kit-web의 규칙과 검사가 지킨다). 새 문서 묶음을 더하면 pro-kit-web에서도 같은 것이 붙는지 확인한다. 문서 쪽을 쓰거나 구조를 바꾸면 `prokit-docs`, 문장을 쓰고 다듬으면 `prokit-writing` 스킬을 따른다. 두 스킬은 이 저장소 `.agents/skills`에 있다(원본은 `roadkwon-ai/pro-kit-docs-skills`, 갱신 방법은 `CONTRIBUTING.md`의 "문서" 절). 이 저장소를 관리할 때는 이 정본을 갱신해 쓰고, 템플릿으로 만든 프로젝트에는 `prokit-docs`·`prokit-writing`을 임의로 복사하지 않는다.
- 공통 값과 글은 `docs/common-values.md` 목록과 `node scripts/doc-values.mjs`로 관리한다. 새로 두 곳 이상에 쓰는 값이나 글, 자주 바뀌는 값은 목록에 올리고(정본은 `site-links.json`, `doc-values.json`, `docs/blocks/`, 템플릿·handbook 파일에서 센 값) 문서에는 그 목록의 표시로 쓴다. 값은 정본에서만 바꾸고 `node scripts/doc-values.mjs`로 채운다. 고친 뒤 `node --test scripts/doc-values.test.mjs`를 실행한다. 같은 글은 중복 검사 테스트가 잡는다. 정당한 반복은 `docs/dupes-allow.txt`에 이유와 함께 둔다. 시간도 두 곳 이상에 쓰거나 자주 바뀌면 값 키로 쓴다. 표시 밖 맨시간은 시간 검사 테스트가 잡고, 값이 아닌 시간(한 곳뿐인 제작 기록, 만들 서비스의 규칙, 기다림 안내)만 `docs/time-allow.txt`에 이유와 함께 둔다. 템플릿 README의 묶음 글은 `docs/blocks/tpl-readme-*`를 고친다. 표시를 단 묶음은 원본을 고치고 `node scripts/doc-values.mjs`로 채운다. 목록이나 표 중간이라 표시 없이 둔 묶음(`scripts/doc-values.cases.mjs`의 CASES)은 README에 표시가 없으니 원본과 두 README를 함께 고친다. README만 고치면 테스트가 깨진다.

## 버전과 릴리스
- 버전은 SemVer이고 정본은 git 태그 `vX.Y.Z`다. 파일에 버전을 따로 적지 않는다.
- 릴리스는 로컬에서 세 단계로 한다. 버전 규칙은 기본 patch(`feat` 포함), `--minor`를 줄 때만 minor, `!`나 `BREAKING CHANGE:`는 major(0.x 동안은 minor. 1.0.0은 사용자가 정할 때만), 첫 릴리스는 `0.1.0`이다. minor는 큰 묶음(새 템플릿, 새 튜토리얼 과정, 독자가 템플릿 갱신을 반영해야 하는 설치 구조 변경)일 때 에이전트가 보고에 "minor 추천"을 적고 사용자가 정한다.
  1. `node scripts/release.mjs --title "<짧은 영어 제목>"`(사용자가 minor로 정했으면 `--minor`): 마지막 태그 이후 커밋으로 다음 버전을 정하고 노트를 `release/<YYYYMMDD-HHmm(KST)>-<영어 제목>.md`로 쓴다. 커밋하지 않는다. `--title`을 빼면 커밋 종류로 제목을 만든다(예: `Features and docs update`).
  2. 노트를 `prokit-writing`의 검수 절차로 고쳐 어색한 한국어와 용어를 노트 파일에서 바로잡는다. 이 단계는 건너뛰지 않는다. [korean-skills](https://github.com/DaleSeo/korean-skills)의 `humanizer` → `style-guide` → `grammar-checker`를 차례로 적용하고 프로킷 예외(어미 섞기 끄기, 짧은 가운뎃점 나열 두기)를 지킨다. 첫 줄(버전과 영어 제목), 커밋 해시, 링크, 코드 식별자, 뜻은 바꾸지 않는다. 스킬이 없으면 `npx skills add DaleSeo/korean-skills -g -a claude-code -a codex -y`로 설치를 안내하고 멈춘다(Antigravity CLI는 `~/.gemini/antigravity-cli/skills/`에 링크한다).
  3. `node scripts/release.mjs --publish <노트 파일>`: `main`에서 노트를 커밋하고(`chore(release): vX.Y.Z`), 태그와 `main`을 push한 뒤 GitHub Release를 만든다. 검수에서 고친 내용을 보고에 요약한다.
- 커밋 제목은 Conventional Commits 접두어(`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)로 쓴다. 이 접두어가 노트의 절을 정하고, `!`나 `BREAKING CHANGE:`는 버전도 올린다(위 버전 규칙). 본문의 `- ` 항목은 노트에 그대로 옮겨지므로 변경 요약을 bullet로 적는다.
- 사용자가 `main` push를 요청하면 `git push` 대신 이 절차로 push한다. `release/` 노트, `chore(release)` 커밋, `v*` 태그는 이 절차로만 만든다.
- `scripts/release.mjs`를 고치면 `node --test scripts/release.test.mjs`를 실행하고 `CONTRIBUTING.md`의 "릴리스" 절을 맞춘다.
- 팩 제작·재발행·등록·발행은 `pro-kit-preset-skills`가 맡는다. 이 저장소에는 소비자 인덱스 `tutorials/packs.json`과 받기 도구 `scripts/pack.mjs`를 유지한다. 완성팩은 SHA256으로 확인하고 `scripts/apply-pack.mjs --pack <팩 폴더> --project <프로젝트> --check`로 실제 복원 계획과 충돌을 확인한다. 문서와 교재는 pro-kit-docs-skills가 검증된 명령·지원 기능으로 작성한다. 기존 팩은 임의 재발행하지 않는다.
