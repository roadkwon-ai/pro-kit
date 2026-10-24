# 에이전트 규칙 (pro-kit-ui)

이 저장소는 프로킷 UI 스킬셋이다. Better-T-Stack Next.js 프로젝트에 화면 작업용 AI 에이전트 개발 환경을 설치하는 템플릿 하나(`templates/prokit-next-neon`), 프리셋 팩 도구(`scripts/pack.mjs`, `scripts/apply-pack.mjs`), 사람이 읽는 문서(`handbook/`, `tutorials/`)를 둔다. 정본은 [pro-kit](<!-- v:link.repo -->https://github.com/roadkwon-ai/pro-kit<!-- /v -->)이고, 이 저장소는 그 생성기가 만든 읽기 전용 사본이다. 이 저장소의 파일은 고치지 않는다. 템플릿 결함을 찾으면 새 프로젝트에서만 고치고 넘어가지 말고 사용자에게 보고한다.

## UI 스킬셋이 하는 일
- 화면만 만드는 프로젝트를 만든다. DB 없이 예시 데이터로 화면을 만들고, HTML로 내보내고, 요청하면 GitHub Pages나 Vercel에 올린다. 화면 프리셋 팩으로 시작할 수 있다.
- 서버 스킬(API, DB, 배포)과 그 절차는 들어 있지 않다. 로그인·저장 같은 실제 서비스, "실제 서비스로 바꿀 거야", 클론 코딩, 기존 프로젝트 도입, Supabase 템플릿 요청은 Pro 스킬셋(`pro-kit`)이 필요하다고 알리고 멈춘다.

## 템플릿으로 새 프로젝트 만들기
"화면만 만들어줘", "템플릿으로 프로젝트 만들어줘"처럼 요청받으면 아래 순서로 초기 구성까지 마친다. PRD를 받고 그 PRD로 스킬 구성(두뇌, 과설계 방지 스킬, mattpocock 추가 스킬, 응답 방식, 화면 디자인 보조)을 추천해 고르게 하는 일은 먼저 `prokit-init` 스킬(`.agents/skills/prokit-init/SKILL.md`)을 읽고 따른다. 프로젝트 유형은 늘 새 프로젝트(`new`)다. PRD가 없으면 init하지 않는다. 카탈로그와 추천 기준의 정본은 `templates/prokit-next-neon/files/.agents/skills/prokit-dev-cycle/references/brains/README.md`다.

1. **템플릿과 이름**: 템플릿은 `prokit-next-neon`이고 묻지 않는다. 요청에 폴더 이름이 있으면(예: "[living] 폴더로") 그 이름을 쓰고, 없으면 묻는다(소문자 kebab-case. 패키지 이름이 `@<이름>/db` 등이 된다). PRD(`/prokit-init`의 인자로 준 파일이나 내용, 붙여 넣은 글, 요청의 서비스 설명, 요청에 적힌 프리셋 팩)가 없으면 다른 질문보다 먼저 받는다. 그래도 받지 못하면 PRD가 필수인 이유를 알리고 만들지 않고 끝낸다. 스킬 구성은 `prokit-init`의 묻는 조건대로 묻거나 정한다. 질문에 답할 수 없는 흐름이면 두뇌와 과설계 방지 스킬은 `none`, 추가 스킬, 응답 방식, 화면 디자인 보조는 설치하지 않고 보고에 추천과 설치 명령을 적는다.
2. **위치**: 이 저장소 밖에 만든다. 기본은 이 저장소의 상위 디렉터리(`../<이름>`)이고, 사용자가 경로를 주면 그곳이다. 대상 디렉터리가 이미 있으면 멈추고 묻는다.
3. **준비물 확인**: Node <!-- v:node.min -->22.20<!-- /v --> 이상(<!-- v:node.recommended -->24<!-- /v --> 권장. <!-- v:node.min -->22.20<!-- /v -->보다 낮으면 설치기가 멈추고, <!-- v:node.recommended -->24<!-- /v -->보다 낮으면 경고만 한다), pnpm, git. 컨테이너 엔진은 확인하지 않는다. 고른 두뇌의 준비물도 본다(gstack은 Bun, Spec Kit은 설치할 때 uv). "없는 준비물은 설치해줘"는 전역 설치 요청으로 보고 빠진 준비물을 설치한다. 그 밖의 전역 설치는 사용자가 요청할 때만 한다. 비밀번호가 필요한 명령은 실행하지 않고 사용자에게 준다. gstack 본체, OMX CLI, OpenSpec CLI는 그 두뇌를 고르면 설치기가 전역에 설치하므로 미리 확인하지 않는다. Windows는 WSL2의 Ubuntu 셸에서만 진행한다(`uname -r`에 `microsoft`가 보인다). PowerShell이나 Git Bash 같은 Windows 셸이면 WSL2 설치를 안내하고 멈춘다.
4. **생성**: `pnpm create`는 `--dir`·`-C`를 따르지 않고 지금 디렉터리에 만든다. 그래서 상위 디렉터리를 서브셸로 지정해 실행하고 옵션을 바꾸지 않는다.
   ```bash
   (cd <상위 절대 경로> && pnpm create better-t-stack@latest <이름> \
     --frontend next --backend self --runtime none \
     --database postgres --orm drizzle --db-setup docker \
     --auth better-auth --payments none --api orpc \
     --addons turborepo biome --examples none \
     --web-deploy none --server-deploy none \
     --package-manager pnpm --git --install)
   ```
5. **템플릿 설치**: `bash <이 저장소>/templates/prokit-next-neon/install.sh <프로젝트 경로> --brain <값> --simplicity <값>`. `none`도 명시한다. 추가 스킬은 `--matt <스킬>[,<스킬>]`, i-have-adhd는 `--optional i-have-adhd`, taste-skill은 `--optional taste`를 더한다(둘 다면 `--optional i-have-adhd,taste`). `--with-global`은 사용자가 전역 도구 설치를 요청할 때만 붙인다(전역 설정과 훅을 바꾼다). 기본 실행도 <!-- v:policy.agentBrowser.da -->agent-browser CLI가 없거나 npm 최신판보다 낮으면 전역에 최신판을 설치한다<!-- /v -->. 설치했거나 실패 경고가 나오면 보고에 적는다. exit 0이 아니면 출력을 보고하고 멈춘다.
6. **로컬 DB**: 화면만 프로젝트라 띄우지 않는다.
7. **첫 마이그레이션**: 만들지 않는다.
8. **확인**: 새 프로젝트에서 `pnpm check`를 한 번 실행해 Better-T-Stack이 만든 코드의 포맷과 정렬(import, Tailwind 클래스)을 정리한다. 이어서 `pnpm skills:check`, `pnpm agents:check`, `pnpm check-types`, `pnpm exec biome check .`가 exit 0인지 본다.
9. **커밋**: 먼저 새 프로젝트 `AGENTS.md` 맨 위(`<!-- prokit-template:start -->` 앞)에 한 줄을 넣는다: `` > 화면만 프로젝트: DB 없이 예시 데이터로 화면만 만든다. 규칙은 `prokit-ui`의 "화면만 프로젝트" 절이다. `` 그다음 새 프로젝트의 기본 브랜치에 설치 결과, 8번의 포맷 정리, PRD(`docs/prd.md` 또는 `docs/first-request.md`. `prokit-init` 5절)를 커밋한다. 예: `chore: dev-cycle 하네스와 프로젝트 규칙 초기 설정`. 원격 저장소 생성과 push는 요청할 때만 한다.
10. **보고**: 다음을 보고한다.
    - 프로젝트 경로, 8번 결과, 개발 서버로 보는 법(`pnpm dev:web`), HTML로 내보내기(`pnpm export:html` 또는 "HTML로 내보내줘"), 배포("GitHub Pages에 배포해줘", "Vercel에 배포해줘")
    - 스킬 구성: 고른 두뇌·과설계 방지 스킬·추가 스킬·응답 방식·화면 디자인 보조와 `pnpm skills:check`의 해당 줄, 설치기가 이 프로젝트에서 끈 전역 플러그인과 남은 전역 경고, 건너뛴 추천과 나중에 설치하는 명령(`prokit-init` 6절)
    - 이미지 그리기: <!-- v:agents.imageTools -->Codex, Antigravity, Grok Build<!-- /v -->는 자체 이미지 도구로 그린다. Claude Code는 ChatGPT로 로그인한 Codex CLI(`gpt-image` 스킬)나 `OPENAI_API_KEY`(프로젝트나 작업 폴더의 `.env`. 세션을 열 때 훅이 불러온다)가 있어야 그린다. 없으면 배치도로 진행한다
    - 사용자가 할 일: 새 에이전트 세션에서 신뢰 질문에 동의, 프로젝트 루트에서 `.agents/skills/impeccable/scripts/impeccable hooks on`(스킬 호출로 켜지 않는다), `GLOSSARY.md`·`docs/domain/project.md` 채우기, 필요할 때 선택 스킬 묶음 설치(`pnpm skills:setup --optional <묶음>`)
    - 로그인·저장 같은 실제 서비스로 바꾸려면 Pro 스킬셋이 필요하다는 것(아래 "Pro 스킬셋으로 올리기")

초기 구성이 끝나면 이 저장소 세션에서 새 프로젝트의 화면 개발을 이어 가지 않는다. 새 프로젝트의 스킬, 에이전트, dev-cycle 규칙은 그 프로젝트에서 연 새 세션에서만 불러온다. 보고할 때 새 프로젝트에서 세션을 열라고 안내한다.

### 작업 폴더에서 시작했을 때
세션을 이 저장소 밖(작업 폴더, 예: `~/projects`)에서 열고 "pro-kit-ui를 받고 그 안의 AGENTS.md대로"처럼 요청한 경우다. 위 절차의 "이 저장소"는 받은 폴더다.
- 받기: 요청에 받을 폴더 이름이 있으면 그 이름, 없으면 `pro-kit-ui`로 받는다(`git clone https://github.com/roadkwon-ai/pro-kit-ui <폴더>`). 그 폴더가 이미 있으면 새로 받지 않고 `git -C <폴더> pull --ff-only`로 최신으로 맞춘다. 로컬 변경이 있어 실패하면 멈추고 알린다. 그 폴더의 `origin`이 다른 저장소(Pro 스킬셋 `pro-kit` 등)면 받지도 고치지도 않고 멈춰서 알린다.
- 프리셋 팩: 요청에 `packs/<이름>` 프리셋 팩이 나오면 받은 뒤 `node <폴더>/scripts/pack.mjs <이름>`으로 그 팩만 받는다. `tutorials/packs.json`의 zip을 받아 sha256을 확인하고 `<폴더>/packs/<이름>/`에 푼다(이미 같은 판이면 그대로 둔다). 요청에 사용자가 받아 둔 팩 zip 경로가 있으면 `--zip <경로>`를 붙여 그 zip을 같은 확인을 거쳐 푼다. 그 zip이 없거나 sha256이 다르면(옛 판) 그 zip은 쓰지 않고 `--zip` 없이 다시 받은 뒤 보고에 적는다. `tutorials/packs.json`의 `published: false` 항목은 원격으로 받지 않는다. 실패하면 출력을 보고하고 멈춘다.
- 위치: 기본값 `../<이름>`은 작업 폴더 안, 받은 폴더 옆이다.
- 첫 요청 저장: 요청에 서비스 요청이 있으면 저장소 받기, 팩 zip 경로, 프로젝트 만들기 지시를 뺀 나머지(서비스 컨셉부터 끝까지. "다 만들면 HTML 파일로 내보내줘"와 배포 요청 포함)를 새 프로젝트의 `docs/first-request.md`에 적고 9번 커밋에 넣는다. 문장은 바꾸지 않고, 바꿀 곳 표시인 `[ ]` 괄호만 뗀다.
- impeccable 훅: 10번의 사용자 할 일 중 `impeccable hooks on`은 에이전트가 9번 커밋 전에 새 프로젝트 루트에서 `.agents/skills/impeccable/scripts/impeccable hooks on`으로 직접 실행한다. 켠 뒤 `.claude/settings.local.json`의 훅 명령이 `…/scripts/impeccable" hook`인지 확인하고, 생긴 `.impeccable/config.json`을 9번 커밋에 넣는다(`settings.local.json`은 개인 설정이라 넣지 않는다).
- 보고 끝에 새 폴더에서 이어 갈 한 줄을 준다: `cd <프로젝트 절대 경로> && <지금 에이전트를 여는 명령> "docs/first-request.md의 요청대로 이어서 해줘"`. Antigravity는 `agy -i "<요청>"`, Grok Build는 `grok --trust "<요청>"`으로 연다. 지금 세션을 묻지 않고 진행하는 모드로 열었으면 같은 옵션을 붙인다(<!-- v:agent.claude.yoloCode -->`claude --dangerously-skip-permissions`<!-- /v -->, <!-- v:agent.codex.yoloCode -->`codex --yolo`<!-- /v -->, <!-- v:agent.agy.yoloCode -->`agy --dangerously-skip-permissions`<!-- /v -->, <!-- v:agent.grok.yoloCode -->`grok --permission-mode bypassPermissions`<!-- /v -->). 새 폴더에서 열어야 그 프로젝트의 규칙, 스킬, 에이전트가 켜진다고 함께 알린다.
- 이 세션에서 화면을 이어 만들지 않는다. 배포 요청("GitHub Pages에 배포해줘", "Vercel에 배포해줘")도 `docs/first-request.md`에 넣어 두면 프로젝트 세션이 화면을 다 만든 뒤 `prokit-ui`의 배포 절차로 한다. 원격 저장소와 프로젝트를 만드는 것까지 요청한 것으로 본다.

## 기존 프로젝트에 템플릿 갱신 반영
"템플릿 변경을 <프로젝트>에 반영해줘"라고 요청하면 `bash templates/prokit-next-neon/install.sh <프로젝트> --diff`로 차이를 본다(파일을 쓰지 않는다). `.dev-cycle.json`은 템플릿의 `files/.dev-cycle.json`과 직접 비교한다. 옮길 항목을 정리해 보고하고, 실제 반영은 그 프로젝트에서 연 세션이 dev-cycle 케이스 H 라운드로 한다(`install.sh <프로젝트> --skip-skills`로 없는 파일과 설정 항목을 더하고, 템플릿과 다른 파일은 직접 옮긴다).

## Pro 스킬셋으로 올리기
UI 스킬셋으로 만든 프로젝트를 실제 서비스로 바꾸려면 Pro 스킬셋(`pro-kit`)을 받고, 그 폴더에서 연 세션에 "템플릿 변경을 <프로젝트>에 반영해줘"라고 요청한다. Pro의 `--diff`가 빠진 서버 스킬과 Pro 문단이 든 파일을 보여 주고, 그 프로젝트 세션이 H 라운드로 옮긴다. 그 뒤 "실제 서비스로 바꿀 거야"라고 요청한다.
