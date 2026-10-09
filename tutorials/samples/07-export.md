# 7장. HTML로 내보내기
https://prokit-web.vercel.app/tutorials/samples/07-export/

## 이번 장에서 할 일

만든 화면을 HTML 파일로 내보내요. 개발 서버 없이 간단한 파일 서버로 열 수 있고, 폴더째 다른 사람에게 보내거나 인터넷에 올릴 수 있어요.

## 1. 내보내기

```prompt
HTML 파일로 내보내줘
```

에이전트가 `pnpm export:html`을 실행해요. 프로젝트 파일은 그대로 두고, 복사본을 만들어 정적 HTML로 바꾼 뒤 결과를 프로젝트의 `html` 폴더에 넣어요. 몇 분 걸려요.

**이렇게 되면 성공**
- 프로젝트 폴더에 `html` 폴더가 생기고, 안에 `index.html`이 있어요.
- 에이전트가 결과를 여는 방법을 알려 줘요.

## 2. 내 컴퓨터에서 열기

`index.html`을 더블클릭하면 그림과 링크가 깨져요. 간단한 파일 서버로 열어야 해요.

```prompt
내보낸 HTML 띄우고 열 주소 알려줘.
```

터미널에서 직접 하려면 프로젝트 폴더에서 입력하세요. 끌 때는 `Ctrl + C`를 누르세요.

```bash
pnpm dlx serve html
```

## 3. 다른 사람에게 보여 주기

- **파일로 보내기**: `html` 폴더를 압축해서 보내요. 받는 사람도 2단계처럼 파일 서버로 열어야 해서 그 컴퓨터에도 Node가 있어야 해요. 없으면 인터넷에 올려 주소를 보내는 편이 쉬워요.
- **인터넷에 올리기**: GitHub Pages나 Vercel에 올려 주소를 보내요. [배포하기](https://prokit-web.vercel.app/tutorials/reference/deploy/)에서 계정과 토큰을 준비한 뒤 보내세요. `[ ]` 안은 올릴 곳(`GitHub Pages` 또는 `Vercel`)이에요. GitHub Pages의 하위 경로(`/<프로젝트 이름>/`)에 맞춰 내보내는 일도 에이전트가 해요.

```prompt
[GitHub Pages]에 배포해줘
```

<details>
<summary>막히면</summary>

- **빌드 오류가 났어요**: 에이전트가 고쳐 줘요. 멈췄으면 `이 오류 해결하고 다시 내보내줘`라고 보내세요.
- **비밀값이 들어 있어 멈췄대요**: 화면 파일이 `.env`의 비밀값을 읽고 있다는 뜻이에요. `어떤 파일이 비밀값을 쓰는지 알려 주고, 화면에서 빼줘`라고 보내세요. 값을 대화창에 붙여 넣지 마세요.
- **페이지 하나가 빠졌어요**: `내보낸 html에 /stats 페이지가 없어. 확인해줘`처럼 빠진 경로를 알려 주세요.

</details>

## 다음에 할 수 있는 것

- [다듬기](https://prokit-web.vercel.app/tutorials/samples/refine/): 스타일, 문구, 사진을 더 다듬어요. 고친 뒤에는 다시 `HTML 파일로 내보내줘`. 배포했다면 `고친 화면을 다시 배포해줘`.
- [실제 서비스로 만들기](https://prokit-web.vercel.app/tutorials/samples/real-service/): 로그인과 저장이 되는 진짜 서비스로 바꿔요.
- [프리셋으로 만들어 보기](https://prokit-web.vercel.app/tutorials/samples/#프리셋으로-만들어-보기): 프리셋들이 어떻게 만들어졌는지 보고, 그 컨셉으로도 만들어 봐요.
