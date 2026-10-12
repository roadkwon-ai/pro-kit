# 화면만 프로젝트

루트 `AGENTS.md` 맨 위에 "화면만 프로젝트" 표시가 있는 프로젝트의 규칙이다. pro-kit 생성 절차가 "화면만" 요청에서 로컬 DB와 마이그레이션 없이 만든 프로젝트다. `prokit-ui`의 단계와 규칙을 모두 따르고 아래를 더한다.

## 화면 규칙
- 모든 화면을 예시 데이터로 채운다. 예시 데이터와 계산은 `apps/web/src/lib/`(예: `demo.ts`)에 모은다. 로그인이 필요한 화면은 예시 사용자로 로그인한 상태로 보여 주고, 로그인·가입 화면은 제출하면 예시 사용자로 들어가는 예시 화면으로 만든다.
- 체크, 상태 바꾸기, 추가 같은 동작은 화면 상태나 브라우저 저장소(`localStorage`)로 흉내 내서 버튼이 실제로 반응하게 한다.
- 서버나 DB를 부르는 BTS 기본 부품을 화면에 쓰지 않는다: 헤더의 사용자 메뉴(`components/user-menu.tsx`)와 `/dashboard` 링크, 로그인·가입 폼의 `authClient`, `orpc` 호출. 첫 화면을 만들 때 BTS 기본 헤더와 로그인 화면을 제품 화면으로 바꾼다. `/dashboard`와 `/api` 파일은 지우지 않아도 된다(내보내기가 뺀다).
- `.dev-cycle.json`의 `authPaths` 파일(`auth-client.ts`, `services.ts`, `env.server.ts`, `packages/auth/` 등)은 고치지 않는다. 실제 서비스로 바꿀 때 그대로 쓴다.
- HTML로 내보낼 수 있게 짓는다.
  - 동적 경로(`[slug]`)는 `generateStaticParams`로 값을 모두 낸다.
  - 쿼리 값(`?tab=`)은 클라이언트 컴포넌트에서 `useSearchParams`로 읽고 `<Suspense>`로 감싼다.
  - `headers`, `cookies`, `redirect`, route handler, server action을 쓰지 않는다.
  - 이미지는 `apps/web/public/` 아래에 두고 `next/image`로 부른다. 하위 경로에 올릴 때 내보내기가 경로 앞에 붙인다. CSS `url()`이나 `<img>`에 `/`로 시작하는 경로를 직접 쓰지 않는다.
- 마감 전 확인(`prokit-ui` 규칙의 모든 링크와 버튼 누르기)은 개발 서버와 함께 `pnpm export:html` 결과에서도 한다. 개발 서버에서는 `/dashboard`와 `/api`가 살아 있어 남은 BTS 부품이 드러나지 않는다.

## HTML로 내보내기
"HTML로 내보내줘"는 `pnpm export:html`이다. 프로젝트 파일은 바꾸지 않는다. 임시 복사본에서 `/api`와 `/dashboard`를 빼고 정적 내보내기 설정으로 빌드해 결과를 `html/`(git이 무시한다)에 둔다.
- 보는 법: `pnpm dlx serve html`을 띄우고 출력된 주소를 사용자에게 알린다.
- exit 1: 빌드 실패. 출력 끝을 보고 위 화면 규칙을 어긴 곳을 고친다.
- exit 2: `.env`의 서버 전용 값이 결과물에 들어갔다. 출력에 나온 변수를 화면 코드에서 쓰지 않게 고친다. 값은 출력되지 않는다.
- 프로킷 제작 표시는 선택 사항이며 표시가 없는 쪽도 내보낸다.
- "경고: 지운 서버 경로를 부르는 부품이 화면에 남아 있다"가 나오면 화면 규칙대로 그 부품을 뺀다.
- GitHub Pages처럼 하위 경로에 올릴 때는 `pnpm export:html --base /<저장소>`.

## 배포 (GitHub Pages, Vercel)
사용자가 요청할 때만 한다("GitHub Pages에 배포해줘", "Vercel에 배포해줘", `docs/first-request.md` 끝의 같은 말). 이 요청은 원격 저장소나 Vercel 프로젝트를 만들어도 된다는 뜻이다. 화면 라운드가 닫힌 뒤(`[confirm]` 뒤) 메인 세션에서 한다. 풀스택 배포(`prokit-deploy`, `pnpm vercel:deploy`)는 쓰지 않는다.

준비
- 토큰: GitHub Pages는 `GH_TOKEN`(GitHub classic 토큰, `repo` 권한), Vercel은 `VERCEL_TOKEN`. 프로젝트 `.env`나 작업 폴더 `.env`에 있는 토큰을 세션 환경에 넣지 않고, 아래의 `gh`, `git push`, `vercel` 명령마다 앞에 `node scripts/load-keys.mjs -- `를 붙여 그 명령에만 넣는다(여러 명령이면 `-- bash -c '…'`). `gh`와 `vercel`은 이 변수를 스스로 읽는다. 있는지는 `node scripts/load-keys.mjs -- sh -c 'test -n "$GH_TOKEN"'`의 exit로 본다. 없으면 멈추고, 토큰을 만들어 작업 폴더 `.env`에 넣은 뒤 다시 요청하라고 안내한다([배포하기](https://github.com/roadkwon-ai/pro-kit/blob/main/tutorials/reference/deploy.md)). 토큰을 대화창에 붙여 넣으라고 하지 않고, 값을 출력(`printenv`, `echo`, `cat .env` 포함)하거나 다른 파일에 쓰지 않는다.
- CLI: `gh`(GitHub Pages)나 `vercel`(Vercel)이 없으면 설치한다. 배포 요청에 이 설치가 들어 있다고 본다. macOS는 `brew install gh`, Ubuntu·WSL은 GitHub CLI 공식 apt 절차(https://github.com/cli/cli/blob/trunk/docs/install_linux.md), Vercel은 `npm install -g vercel`. 비밀번호가 필요한 명령(sudo)은 실행하지 않고 사용자에게 준다.

GitHub Pages
1. 저장소 이름은 프로젝트 폴더 이름, 계정은 `gh api user --jq .login`이다.
2. `pnpm export:html --base /<저장소>`.
3. `origin`이 없으면 `gh repo create <저장소> --public`으로 만들고 `git remote add origin https://github.com/<계정>/<저장소>.git`을 한다. 무료 계정은 공개 저장소에서만 Pages를 쓸 수 있어 코드가 공개된다. 보고에 적는다.
4. 기본 브랜치를 push한다: `git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push -u origin <기본 브랜치>`. 전역 git 설정을 바꾸지 않고 `GH_TOKEN`으로 push한다.
5. `html/`을 `gh-pages` 브랜치로 올린다. 임시 폴더에 `html/`의 내용(`.nojekyll` 포함)을 복사하고 `git init -b gh-pages`, 커밋한 뒤 4번과 같은 인증으로 `push -f https://github.com/<계정>/<저장소>.git gh-pages`. 커밋에는 프로젝트의 git 사용자 이름과 이메일을 쓴다(`git -c user.name=… -c user.email=… commit`).
6. `gh api -X POST repos/<계정>/<저장소>/pages -f 'source[branch]=gh-pages' -f 'source[path]=/'`. 409 "already enabled"는 `gh-pages`를 push해 이미 켜진 것이라 성공이다.
7. `https://<계정 소문자>.github.io/<저장소>/`가 200이 될 때까지 기다린다(보통 1분 안). 이 주소와 저장소 주소를 보고한다.

Vercel
1. `pnpm export:html`(하위 경로 없이).
2. 프로젝트 이름의 임시 폴더로 올린다. Vercel CLI는 올린 폴더 이름으로 프로젝트를 찾거나 만들므로 `html`을 그대로 올리지 않는다: `d=$(mktemp -d) && cp -R html "$d/<프로젝트 이름>" && vercel deploy "$d/<프로젝트 이름>" --prod --yes`.
3. 출력(stderr)의 "Aliased" 주소 `https://<프로젝트 이름>.vercel.app`이 200인지 확인하고 보고한다. stdout의 배포별 주소는 Deployment Protection 때문에 로그인 화면으로 가므로 보고에 쓰지 않는다. Hobby 요금제는 무료이고 개인 비상업 용도다.

다시 배포("고친 화면을 다시 배포해줘"): 같은 순서를 다시 한다. 같은 저장소의 `gh-pages`, 같은 이름의 Vercel 프로젝트에 올려 주소를 그대로 둔다.

내리기("배포한 사이트를 내려줘"): 끄거나 지울 것을 먼저 보여 주고 묻는다.
- GitHub Pages: `gh api -X DELETE repos/<계정>/<저장소>/pages`로 사이트만 끈다. 저장소 삭제에는 `delete_repo` 권한이 필요하므로 사용자가 저장소 Settings의 Danger Zone에서 직접 지운다고 안내한다.
- Vercel: `vercel project rm <프로젝트 이름>`.

## 실제 서비스로 바꾸기
"실제 서비스로 바꿀 거야"처럼 요청하면 이 순서로 한다.
1. 컨테이너 엔진(Podman 또는 Docker)이 있는지 본다. 없으면 설치를 안내하고 멈춘다.
2. `prokit-db`를 따라 로컬 DB를 띄우고, 인증 테이블의 첫 마이그레이션을 만들어 적용한다.
3. 루트 `AGENTS.md` 맨 위의 "화면만 프로젝트" 표시를 지운다.
4. 기본 브랜치에 커밋한다. 첫 마이그레이션이 다음 라운드 diff에 섞이면 audit이 더 무거운 케이스를 요구한다.
5. 로그인, 저장 같은 기능과 예시 데이터를 DB에서 읽게 바꾸는 일은 dev-cycle 라운드로 하고 `prokit-web`, `prokit-api`, `prokit-db`를 따른다.
