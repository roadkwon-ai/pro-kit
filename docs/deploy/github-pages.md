# GitHub Pages 배포
https://prokit-web.vercel.app/docs/deploy/github-pages/

> 한눈에: 화면만 만든 프로젝트는 HTML 파일로 내보내 GitHub Pages나 Vercel에 무료로 올릴 수 있어요. "GitHub Pages에 배포해줘"라고 하면 에이전트가 저장소가 없으면 만들어 올리고 주소를 알려 줘요. 필요한 토큰만 미리 작업 폴더의 `.env`에 넣어 두면 돼요.

## 이렇게 요청해요

| 할 일 | 요청 |
|---|---|
| 처음 올리기 | GitHub Pages에 배포해줘 · Vercel에 배포해줘 |
| 고친 화면 다시 올리기 | 고친 화면을 다시 배포해줘 |
| 내리기 | 배포한 사이트를 내려줘 |

처음 만들 때 프롬프트 끝에 "GitHub Pages에 배포해줘"를 붙여도 돼요. 그러면 화면을 다 만들고 라운드를 닫은 뒤에 올려요.

## 준비

| 올릴 곳 | 토큰 | 둘 곳 |
|---|---|---|
| GitHub Pages | `GH_TOKEN` (GitHub classic 토큰, `repo` 권한) | 작업 폴더나 프로젝트의 `.env` |
| Vercel | `VERCEL_TOKEN` | 작업 폴더나 프로젝트의 `.env` |

토큰을 만들고 넣는 법은 튜토리얼 [배포하기](https://prokit-web.vercel.app/tutorials/reference/deploy/)에 있어요. `gh`나 `vercel` 명령이 없으면 에이전트가 설치해요(배포 요청에 이 설치가 들어 있다고 봐요). 비밀번호가 필요한 명령(sudo)은 실행하지 않고 사용자에게 알려 줘요.

## GitHub Pages에 올리는 순서

1. 저장소 이름은 프로젝트 폴더 이름, 계정은 토큰의 계정이에요.
2. `pnpm export:html --base /<저장소>`로 하위 경로에 맞춘 HTML을 만들어요.
3. `origin`이 없으면 `gh repo create <저장소> --public`으로 공개 저장소를 만들어요. 무료 계정은 공개 저장소에서만 Pages를 쓸 수 있어서 코드가 공개돼요.
4. 기본 브랜치를 push해요.
5. `html/`의 내용을 `gh-pages` 브랜치로 올려요.
6. 저장소의 Pages를 `gh-pages` 브랜치로 켜요.
7. `https://<계정>.github.io/<저장소>/`가 열릴 때까지 기다린 뒤(보통 1분 안) 주소를 알려 줘요.

## 자세히

### Vercel에 올릴 때

`pnpm export:html`(하위 경로 없이)로 만든 HTML을 프로젝트 이름의 폴더로 올려요(`vercel deploy … --prod --yes`). 보고하는 주소는 `https://<프로젝트 이름>.vercel.app`이에요. Hobby 요금제는 무료이고 개인 비상업 용도예요. 서비스 프로젝트의 풀스택 배포(`pnpm vercel:deploy`)와는 다른 길이에요([Vercel 배포와 되돌리기](https://prokit-web.vercel.app/docs/deploy/vercel/)).

### 토큰을 다루는 방법

- 토큰은 세션 환경에 넣지 않고 `gh`, `git push`, `vercel` 명령마다 앞에 `node scripts/load-keys.mjs -- `를 붙여 그 명령에만 넣어요.
- 있는지는 `node scripts/load-keys.mjs -- sh -c 'test -n "$GH_TOKEN"'`의 종료 코드로만 봐요. 없으면 멈추고 토큰을 넣은 뒤 다시 요청하라고 안내해요.
- 토큰을 대화창에 붙여 넣으라고 하지 않고 값을 출력하거나 다른 파일에 쓰지 않아요.
- push는 전역 git 설정을 바꾸지 않고 그 명령에만 `GH_TOKEN` 인증을 써요.

### 다시 올리기와 내리기

- 다시 올리기는 같은 순서를 되풀이해요. 같은 저장소의 `gh-pages`, 같은 이름의 Vercel 프로젝트에 올려서 주소가 그대로예요.
- 내리기는 끄거나 지울 것을 먼저 보여 주고 물어요. GitHub Pages는 사이트만 끄고(`gh api -X DELETE repos/<계정>/<저장소>/pages`), 저장소 삭제는 사용자가 저장소 Settings의 Danger Zone에서 직접 해요. Vercel은 `vercel project rm <프로젝트 이름>`이에요.

## 관련 문서

- [화면만 프로젝트와 HTML 내보내기](https://prokit-web.vercel.app/docs/design/screen-only/)
- [빠른 시작: 화면만 만들기](https://prokit-web.vercel.app/docs/start/quickstart-screens/)
- [배포하기](https://prokit-web.vercel.app/tutorials/reference/deploy/)
- [비밀값 지키기](https://prokit-web.vercel.app/docs/deploy/secrets/)
