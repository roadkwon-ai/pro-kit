---
name: prokit-deploy
description: >-
  이 BTS 프로젝트를 Vercel에 배포하거나 배포 환경을 준비·관리할 때 사용한다. 로컬 Vercel CLI로
  develop(Preview 배포 + 고정 주소)과 production을 배포하고, Vercel 프로젝트 연결(모노레포 apps/web),
  환경별 환경변수(DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL), 배포 전 원격 DB 마이그레이션 순서,
  production 배포 전 릴리스(SemVer 버전 태그, release/ 노트, GitHub Release), 배포 확인, 되돌리기를 다룬다.
  배포해줘, develop에 올려줘, 운영 반영, 프로덕션 배포, 릴리스해줘, 버전 올려줘, 릴리스 노트, vercel 연결,
  배포 환경변수 넣어줘, 롤백해줘 같은 요청에 사용한다. 코드 변경은 prokit-dev-cycle, 마이그레이션 작성은
  prokit-db가 맡는다.
---

# Vercel 배포

배포는 사용자가 요청하거나, 라운드 끝(`prokit-dev-cycle` 5절)에서 사용자가 "릴리스하고 production 배포"를 골랐을 때만 한다. 대상을 말하지 않으면 develop이다. production은 사용자가 운영이나 production을 명시하거나 라운드 끝에서 고를 때만 배포한다.

Vercel CLI의 일반 사용법(설치, 로그인, 토큰, `vercel env`·`domains`·`logs` 명령)은 아래 "공식 스킬 연결"의 스킬을 따른다. 이 스킬에는 공식 스킬이 다루지 않는 이 스택의 절차만 있다. 둘이 다르면 이 스킬을 따른다.

## 환경
| 대상 | Vercel 환경 | 주소 | DB | 명령 |
|---|---|---|---|---|
| develop | Preview | Preview `BETTER_AUTH_URL`의 고정 주소(alias) | 병합 전 확인용 원격 DB | `pnpm vercel:deploy develop` |
| production | Production | Production `BETTER_AUTH_URL`(프로덕션 도메인) | 운영 DB | `pnpm release` 뒤 `pnpm vercel:deploy production` |

- 두 환경의 DB와 `DATABASE_URL`을 넣는 법은 `.agents/skills/prokit-db/references/migration-flow.md`의 "배포 환경" 절에 있다. 배포 준비를 확인하거나 안내할 때는 이 절을 읽고 DB 항목을 그 기준으로 보고한다.
- 배포 주소의 정본은 그 환경의 `BETTER_AUTH_URL`이다. Better Auth는 이 origin만 신뢰하므로(`trustedOrigins`), 배포마다 생기는 고유 URL(`<프로젝트>-<해시>-<팀>.vercel.app`)에서는 로그인이 실패한다. 확인은 고정 주소에서 한다.
- 배포는 `pnpm vercel:deploy`(`scripts/vercel-deploy.mjs`)로만 한다. 스크립트는 CLI, 연결, 로그인, 커밋하지 않은 변경, production의 기본 브랜치와 릴리스(HEAD를 가리키는 `origin`의 `vX.Y.Z` 태그와 그 GitHub Release), production의 Vercel Git 자동 배포(켜져 있거나 확인하지 못하면 준비 안 됨), `apps/web/.env.schema`의 필수 변수를 검사하고, 하나라도 걸리면 exit 1로 멈춘다. `--check`는 검사만 하고 지난 배포 이후 새 마이그레이션을 보여 준다.

## 공식 도구를 그대로 쓰지 않는 이유
확인한 CLI 동작(Vercel CLI 60.1)과 공식 도구의 안내가 다르다.
- `vercel deploy`는 `.gitignore`를 따르지 않고 작업 트리를 그대로 올린다. git이 무시하는 `apps/web/.env`(로컬 비밀값)도 올라간다. 저장소 루트의 `.vercelignore`가 막는다. Vercel 플러그인의 `/vercel:deploy`는 "커밋하지 않은 변경은 배포에 포함되지 않는다"고 안내하지만 사실과 반대다.
- 프로젝트의 첫 배포는 `--prod` 없이도 production이 된다. 스크립트는 production 배포가 없으면 develop을 막는다.
- `vercel-deploy-claimable`은 `node_modules`와 `.git`만 빼고 프로젝트를 로그인 없이 외부 서비스에 올린다. `.env`도 함께 나간다. 쓰지 않는다.
- `deploy-to-vercel`의 흐름 중 확인 없는 `vercel link`, `git add . && git commit && git push` 배포, 로그인 없는 배포(`resources/deploy.sh`, claim URL), "배포 URL을 확인하지 않는다"는 따르지 않는다. 연결은 사용자가 요청할 때, 커밋은 요청할 때와 라운드 끝(`prokit-dev-cycle` 5절)에 하고, 배포는 확인까지 한다.
- `vercel-cli-with-tokens`의 토큰 찾기 중 토큰 값을 출력하는 명령(`grep '^VERCEL_TOKEN=' .env`, `printenv VERCEL_TOKEN`, `echo $VERCEL_TOKEN`)은 쓰지 않는다. 있는지만 `grep -q`나 `test -n "$VERCEL_TOKEN"`의 exit로 본다.
- gstack `ship`, `land-and-deploy`, `setup-deploy`는 커밋, push, PR 병합을 하거나 `CLAUDE.md`를 고치므로 배포에 쓰지 않는다.

## 준비 (프로젝트마다 한 번, 사용자가 요청할 때)
1. **CLI와 로그인**: `vercel --version`, `vercel whoami`. 없거나 실패하면 `deploy-to-vercel`의 설치·로그인 안내를 사용자에게 전한다. 전역 설치와 `vercel login`은 사용자가 한다. 토큰만 쓰는 환경(CI, Codex 샌드박스)은 `vercel-cli-with-tokens`를 따른다. 이때는 `VERCEL_ORG_ID`와 `VERCEL_PROJECT_ID`를 함께 두면 스크립트가 연결된 것으로 본다.
2. **팀과 프로젝트 이름**: 팀이 둘 이상이면(`vercel teams list --format json`) 사용자에게 고르게 한다. Vercel 계정에 새 프로젝트가 생기므로 프로젝트 이름도 확인받는다.
3. **연결**: 저장소 루트에서 실행한다.
   ```bash
   vercel link --yes --project <이름> --scope <팀>     # 프로젝트가 없으면 만든다
   git diff .gitignore                                  # link가 더한 `+.env*` 한 줄만 보이면 다음 줄로 되돌린다
   git checkout -- .gitignore && rm -f .env.local       # link 전에 루트 .env.local이 없었을 때만 지운다
   vercel git disconnect --yes                          # link 출력에 "Connecting GitHub repository"가 있었을 때만
   vercel project update <이름> --root-directory apps/web --framework nextjs --yes
   ```
   `vercel link --yes`는 새 프로젝트를 만들 때 git 원격이 있으면 묻지 않고 그 저장소를 연결한다(CLI 60.1, 실측). 출력에 `Connecting GitHub repository`가 나온다. 연결되면 기본 브랜치 push가 곧 production 배포라 릴리스 검사와 "DB 먼저"를 거치지 않으므로, 사용자가 Git 연결을 요청하지 않았으면 바로 끊는다(연결에 실패했으면 "No Git repository connected"로 끝난다). 이미 있는 프로젝트에 연결할 때는 Git을 건드리지 않으니 끊지 않는다(일부러 켠 연결일 수 있다). `vercel link`는 `.gitignore`에 `.env*`를 더해 앞으로 만들 `.env.schema`까지 무시하게 하고, 이 앱이 쓰지 않는 `VERCEL_OIDC_TOKEN`을 루트 `.env.local`에 받는다. `.vercel/`은 기기별 연결 정보라 커밋하지 않는다(BTS `.gitignore`에 있다). 팀원은 1번과 3번의 앞 세 줄만 한다. Vercel 프로젝트의 Node.js 버전(Project Settings → Build and Deployment)은 24.x로 둔다. 20.x면 2026-10-01부터 새 배포가 실패한다.
4. **환경변수**: Preview와 Production에 따로 넣는다. 값은 출력과 파일에 남기지 않는다.
   | 변수 | 넣는 법 |
   |---|---|
   | `DATABASE_URL` | 그 환경 DB의 서버리스용 풀러 주소. migration-flow "배포 환경" 절 |
   | `BETTER_AUTH_SECRET` | `s="$(openssl rand -base64 32)" && printf '%s' "$s" \| vercel env add BETTER_AUTH_SECRET <preview 또는 production> --sensitive --yes`. 환경마다 다른 값 |
   | `BETTER_AUTH_URL` | `vercel env add BETTER_AUTH_URL preview --value https://<고정 주소> --type config --yes`. production은 프로덕션 도메인. 스크립트가 읽어야 하므로 비밀(`--sensitive`)로 넣지 않는다 |
   - develop 고정 주소는 `<프로젝트>-develop.vercel.app`처럼 정한다. `*.vercel.app` 이름은 모든 계정이 함께 쓰므로 이미 쓰인 이름이면 배포의 alias 단계가 실패한다. 그러면 다른 이름으로 바꾼다.
   - production 도메인은 첫 production 배포 때 붙는다. 보통 `<프로젝트>.vercel.app`이고, 이미 쓰인 이름이면 접미사가 붙는다. 실제 주소가 다르면 스크립트가 배포 뒤 경고한다. 그러면 `--force`로 값을 고치고 다시 배포한다. 커스텀 도메인을 쓰면 그 주소를 넣는다.
   - 값을 만드는 명령을 `vercel env add`에 바로 파이프로 넘기면, 명령이 느릴 때 값이 비어 `missing_value`로 실패한다. 셸 변수에 먼저 담고 `printf '%s' "$url" | vercel env add …`로 넘긴다.
   - `.env.schema`에 변수를 더하면 두 환경에도 넣는다. 빠진 변수는 스크립트가 알려 준다. 바로 위 주석에 `@optional`(또는 `@required=false`)을 단 변수는 스크립트가 필수로 세지 않는다. 그 기능을 쓰는 환경에만 넣고, Preview에는 production 키 대신 사용량을 제한한 별도 키를 쓴다. 비밀값을 `--value`로 넘기지 않는다(셸 기록에 남는다). `vercel env pull`은 쓰지 않는다(값을 파일로 받는다).
   - 배포 값을 `.env.development`·`.env.production` 같은 파일에 두지 않는다. 배포에 올라가지 않고(`.vercelignore`), varlock이 이 파일을 `NODE_ENV`로 고르는데 Vercel은 Preview도 production으로 빌드하므로 두 환경을 나누지 못한다.
5. **릴리스 준비**: GitHub `origin` 원격과 `gh auth status`. 원격 저장소 생성과 `gh auth login`은 사용자가 한다(원격 생성은 요청할 때만).
6. `pnpm vercel:deploy production --check`로 확인한다. 릴리스 항목은 첫 배포 때 해결한다. `develop --check`는 첫 production 배포 뒤에 통과한다.
7. **첫 배포는 production**: Vercel이 프로젝트의 첫 배포를 production으로 만들기 때문이다. 사용자에게 이것을 알리고, 사용자가 production 배포를 요청하면 아래 순서(릴리스 `v0.1.0`, 운영 DB 적용 포함)로 진행한다. 준비를 요청받았다고 배포하지 않는다.

## 릴리스 (production 배포마다)
production은 릴리스한 커밋만 배포한다. 배포 스크립트가 `origin`의 `vX.Y.Z` 태그가 HEAD를 가리키는지와 그 GitHub Release를 확인하므로 릴리스를 빼고는 배포되지 않는다(로컬 태그만 있거나 태그를 옮기면 멈춘다). develop은 릴리스하지 않는다. production 배포 요청에는 릴리스가 포함된다고 사용자에게 알린다.
- **버전**: SemVer이고 정본은 git 태그 `vX.Y.Z`다. 마지막 태그 이후 커밋으로 정한다. 첫 릴리스 `0.1.0`, 기본은 patch(`feat:`, `fix:`, `docs:`, `chore:` … 모두). `--minor`를 줄 때만 minor이고, 큰 묶음(새 화면 묶음, 독자가 따로 반영해야 하는 구조 변경)이면 에이전트가 보고에 "minor 추천"을 적고 사용자가 정한다. 제목에 느낌표(`feat!:`)가 붙거나 본문에 `BREAKING CHANGE:`가 있으면 0.x 동안은 minor(`0.<minor+1>.0`), 1.0 이상이면 major. 1.0.0은 사용자가 정할 때만 만든다(자동으로 만들지 않는다). 루트와 `apps/web`의 `package.json` `version`은 릴리스 커밋에서 태그를 따라간다. 손으로 고치지 않는다.
- **노트**: 커밋이 종류별 절(Features, Fixes, Docs, Maintenance 등)로 모이고, 커밋 본문의 `- ` 항목이 함께 옮겨진다. 그래서 커밋 제목은 Conventional Commits 접두어로, 변경 요약은 본문 bullet로 쓴다.

1. `pnpm release --title "<영어 제목>"`(사용자가 minor로 정했으면 `--minor`를 더한다): 다음 버전을 정하고 `release/<YYYYMMDD-HHmm>-<제목>.md`에 노트를 쓴다. 커밋하지 않는다. "릴리스할 커밋이 없다"가 나오면 HEAD가 이미 릴리스한 커밋이므로 4번으로 간다.
2. 노트를 검수한다. 사용자가 읽을 변경 설명으로 다듬고 어색한 한국어를 바로잡는다(korean-skills가 있으면 `humanizer` → `style-guide` → `grammar-checker` 순서). 첫 줄(버전과 제목), 커밋 해시, 링크는 바꾸지 않는다.
3. 버전과 노트를 사용자에게 보여 주고 동의를 받은 뒤(큰 묶음이면 "minor 추천"을 함께 적는다. minor로 정하면 노트를 지우고 `--minor`로 다시 만든다) `pnpm release --publish <노트>`를 실행한다. `--publish`는 기본 브랜치를 push하므로, 그 전에 `pnpm vercel:deploy production --check` 출력에 `Git 자동 배포`가 없어야 한다(있으면 push가 곧 검사와 "DB 먼저" 없는 production 배포다. 연결을 끊거나 확인할 수 있게 한 뒤 발행한다). 기본 브랜치에서 노트와 `package.json` version을 `chore(release): vX.Y.Z`로 커밋하고, 태그를 달아 기본 브랜치와 함께 push한 뒤 GitHub Release(본문 = 노트)를 만든다.
   - GitHub 원격이 없거나, `gh` 로그인이 안 됐거나, 같은 버전 태그가 이미 있으면(다른 곳에서 먼저 릴리스했다. `git pull` 뒤 노트를 다시 만든다) 커밋하기 전에 멈춘다. 스크립트가 시작할 때 `origin`의 태그를 받는다.
   - push가 실패하면 커밋과 태그를 되돌린다(노트는 남는다). `git pull` 뒤 다시 `--publish`한다.
   - Release만 실패하면(exit 2, 태그는 push됨) 출력된 `gh release create` 명령으로 다시 만든다.
   - 노트를 쓴 뒤 커밋이 늘었거나 검수하다 커밋 해시를 지웠으면 멈춘다. 노트를 지우고 1번부터 한다.
4. 아래 "배포 순서"로 production을 배포한다.

`release/` 노트, `chore(release)` 커밋, `v*` 태그는 이 절차로만 만든다. 배포가 실패해 코드를 고쳤으면 새 patch 릴리스를 만들어 배포한다.

## 배포 순서
1. `pnpm vercel:deploy <대상> --check`를 실행한다. "준비 안 됨"이면 그 항목부터 해결한다. production의 릴리스 항목은 다른 항목을 모두 해결한 뒤 "릴리스" 절로 해결하고 다시 `--check`한다. 커밋하지 않은 변경은 사용자가 커밋을 요청할 때만 커밋한다(라운드 끝은 `prokit-dev-cycle` 5절에서 이미 커밋했다).
2. **DB 먼저**: 출력에 새 마이그레이션이 1개 이상이거나 "지난 배포 기록 없음"이 나오면, 배포 전에 대상 DB에 `commands.dbMigrate`를 적용한다(migration-flow "배포 환경" 절). develop DB에는 바로 적용한다. 운영 DB는 적용할 마이그레이션 목록을 보여 주고 사용자가 동의한 뒤 적용한다. 새 코드는 새 컬럼을 쓰므로 순서가 바뀌면 배포 직후 오류가 난다. 예외로, 열·테이블을 지우는 contract 마이그레이션은 새 코드를 먼저 배포하고 그다음 적용한다(migration-flow의 expand → contract).
3. `pnpm vercel:deploy <대상>`을 실행한다. 빌드 로그는 stderr로 나온다. exit 2면 `vercel inspect <배포 URL> --logs`로 원인을 본다. 흔한 원인은 환경변수 형식(varlock 검사), 타입 오류(`commands.typecheck`로 로컬에서 재현), 2026-10-01 이후 Vercel 프로젝트의 Node.js 20.x(Project Settings에서 24.x로 바꾼다)다.
4. **확인**: 고정 주소에서 `/api/auth/get-session`이 200인지 본다.
   - develop: Preview에는 Vercel 배포 보호가 걸려 있어 일반 `curl`은 Vercel 로그인으로 보내는 302를 받는다. `access-protected-vercel-deployment`에 따라 `vercel curl https://<고정 주소>/api/auth/get-session -- -s -o /dev/null -w '%{http_code}'`로 확인한다. 전체 URL을 넘겨야 한다(`--deployment <고정 주소>`로 주면 보호를 넘지 못한다). 화면은 Vercel에 로그인한 브라우저로 본다.
   - production: `curl -s -o /dev/null -w '%{http_code}' https://<도메인>/api/auth/get-session`. 가입이나 글쓰기처럼 운영 데이터를 만드는 확인은 하지 않는다.
5. **보고**: 대상, 커밋, 릴리스(버전, 노트 파일, GitHub Release 주소. production만), 배포 URL, 주소, DB 적용 결과(대상 DB와 마이그레이션 수), 확인 결과, 스크립트가 출력한 되돌리기 명령.

## 되돌리기
- production: 스크립트가 출력한 `vercel rollback <이전 배포 URL>`. Hobby 플랜은 직전 production 배포로만 되돌릴 수 있다. 되돌린 뒤에는 새 production 배포가 운영 주소를 자동으로 가져가지 않으므로, 고친 배포를 `vercel promote <배포 URL>`로 올린다(스크립트가 주소가 옮겨지지 않았다고 경고한다).
- develop: `vercel alias set <이전 배포 URL> <고정 주소>`.
- production을 되돌려도 릴리스(태그, 노트, GitHub Release)는 지우지 않는다. 고친 코드는 새 patch 릴리스로 배포한다.
- DB 마이그레이션은 되돌리지 않는다. 앱만 되돌려도 동작하도록 파괴적 변경은 expand → contract로 나눈다.
- 되돌리기도 배포다. 사용자가 요청할 때만 한다.
- git 연결(push마다 자동 배포)은 사용자가 요청할 때만 한다. 연결하면 기본 브랜치 push(릴리스의 `--publish` 포함)가 곧 production 배포가 되어, 이 스크립트의 검사(릴리스, 환경변수)와 "DB 먼저" 순서를 거치지 않는다. 연결하기 전에 이것을 알리고, 연결하면 push 배포를 끌지(Vercel 프로젝트의 Git 설정. API의 `gitProviderOptions.createDeployments`가 `disabled`) 사용자와 정한다. 연결과 자동 배포 결정은 `docs/adr/`에 남긴다. push 배포가 켜져 있으면 `production --check`가 `Git 자동 배포`로 보고하고, 라운드 끝(`prokit-dev-cycle` 5절)과 릴리스 발행은 push하지 않는다. 스크립트가 인정하는 끄는 방법은 Vercel 프로젝트의 Git 설정뿐이다. `vercel.json`의 `git.deploymentEnabled`나 Ignored Build Step으로 끈 프로젝트도 준비 안 됨으로 나오므로 연결을 끊는다. push마다 production에 배포하는 방식은 이 템플릿의 릴리스·배포 절차와 함께 쓰지 않는다.

## 공식 스킬 연결
| 상황 | 읽을 스킬 |
|---|---|
| CLI 설치, 로그인, 팀 고르기 | `deploy-to-vercel` (위에서 따르지 않는다고 한 부분은 빼고) |
| 토큰 인증, 환경변수·도메인·로그 명령 | `vercel-cli-with-tokens` |
| 배포 보호가 걸린 Preview 확인 | `access-protected-vercel-deployment` |
| 배포한 프로젝트의 비용·성능 점검(Vercel 지표 기반) | `vercel-optimize` (선택 묶음 `ops`. 경로별 권고에는 유료 Observability Plus가 필요하다) |
| 서버리스 연결과 prepared statement | `prokit-db` (그 안의 Neon·Supabase·Postgres 스킬 연결) |
