# 배포하기
https://prokit-web.vercel.app/tutorials/reference/deploy/

만든 화면을 인터넷에 올려 주소를 만드는 일을 배포라고 해요. 주소만 보내면 누구나 휴대폰이나 다른 컴퓨터에서 내 화면을 볼 수 있어요. **배포는 선택이에요.** 내 컴퓨터에서 보기만 할 거면 하지 않아도 돼요.

내가 할 일은 계정과 토큰을 만들어 `.env` 파일에 넣는 것까지예요. 배포 프로그램(GitHub CLI, Vercel CLI) 설치, 올리기, 주소 확인은 배포 프롬프트를 받은 에이전트가 해요. 준비는 처음 한 번만 하면 돼요.

> [!NOTE]
> 이 쪽은 화면만 만든 프로젝트([컨셉으로 화면 만들기](https://prokit-web.vercel.app/tutorials/samples/))를 올리는 법이에요. 로그인과 저장이 되는 실제 서비스는 [실제 서비스로 만들기](https://prokit-web.vercel.app/tutorials/samples/real-service/)에서 Vercel로 올려요.

## 1. 어디에 올릴지 고르기

둘 다 무료로 시작할 수 있어요. 하나만 고르세요.

- **GitHub Pages**: 주소가 `https://<GitHub 아이디>.github.io/<프로젝트 이름>/`이에요. 무료 계정은 공개 저장소에서만 쓸 수 있어서, 내 GitHub에 공개 저장소가 생기고 프로젝트 코드도 공개돼요.
- **Vercel**: 주소가 `https://<프로젝트 이름>.vercel.app` 같은 모양이에요. 정확한 주소는 에이전트가 알려 줘요. 내보낸 화면 파일만 올라가고 프로젝트 코드는 올라가지 않아요. 무료 Hobby 요금제는 개인적인 비상업 용도예요.

코드가 공개돼도 괜찮으면 GitHub Pages, 코드를 공개하고 싶지 않으면 Vercel을 고르세요. 요금과 조건은 바뀔 수 있으니 각 사이트에서 확인하세요([배포 비용](https://prokit-web.vercel.app/tutorials/reference/costs-and-keys/#배포-비용)).

## 2. 계정과 토큰 만들기

토큰은 에이전트가 내 계정으로 배포할 수 있게 해 주는 열쇠예요. 고른 곳 하나만 만들면 돼요.

### GitHub Pages로 올릴 때

1. [github.com](https://github.com/signup)에서 가입하세요.
2. 오른쪽 위 프로필 사진을 누르고 Settings → 왼쪽 맨 아래 Developer settings → Personal access tokens → Tokens (classic) → Generate new token → Generate new token (classic) 순서로 누르세요.
3. Note 칸에 알아볼 이름(예: `pro-kit`)을 적고 Expiration에서 짧은 기간(예: 30일)을 고르세요. Select scopes에서 `repo`에만 체크하고 맨 아래 Generate token을 누르세요.
4. 나온 토큰(`ghp_`로 시작)을 복사하세요. 이 화면을 떠나면 다시 볼 수 없어요.

### Vercel로 올릴 때

1. [vercel.com](https://vercel.com/signup)에서 Hobby 요금제로 가입하세요. GitHub 계정으로 가입해도 돼요.
2. [토큰 쪽](https://vercel.com/account/tokens)을 여세요. 계정 설정(Settings)의 Tokens예요.
3. 토큰 이름을 적고 Scope는 내 계정(Full Account), 만료 기간은 짧게(예: 30일) 고른 뒤 Create를 누르세요.
4. 나온 토큰(`vcp_`로 시작)을 복사하세요. 다시 볼 수 없어요.

## 3. 토큰 넣기

작업 폴더 `~/projects`의 `.env` 파일에 적어요. 이미지용 OpenAI 키를 넣는 파일과 같아요([이미지 그리기](https://prokit-web.vercel.app/tutorials/reference/costs-and-keys/#이미지-그리기)).

1. VS Code에서 **파일 → 폴더 열기**로 `~/projects` 폴더를 열어요. Windows는 Ubuntu 터미널에 `code ~/projects`를 입력하면 열려요.
2. 왼쪽 파일 목록에서 새 파일을 만들고 이름을 `.env`로 정해요. 이미 있으면 그 파일을 열어요.
3. 고른 곳의 줄을 적고 저장해요. 따옴표와 띄어쓰기 없이 붙여요.
   - GitHub Pages: `GH_TOKEN=ghp_여기에복사한토큰`
   - Vercel: `VERCEL_TOKEN=vcp_여기에복사한토큰`

작업 폴더는 git 저장소가 아니라서 이 파일은 GitHub에 올라가지 않아요. 배포 프롬프트를 보내기 전에 넣어 두세요. 에이전트를 연 뒤에 넣었다면 닫았다가 같은 폴더에서 다시 여세요.

> [!TIP]
> 1~2번은 에이전트에게 부탁해도 돼요. 작업 폴더에서 연 에이전트에게 `이 폴더에 .env 파일을 만들고 VS Code로 열어줘`라고 보내고, 열린 파일에 토큰을 직접 붙여 넣으세요.

> [!WARNING]
> 토큰은 비밀번호와 같아요. **대화창에 붙여 넣지 마세요.** 화면 캡처나 GitHub에도 남기지 마세요. `repo` 권한의 GitHub 토큰은 내 저장소를 모두 바꿀 수 있어요. 만료 기간을 짧게 두고, 다 쓰면 토큰을 만든 쪽에서 지우세요.

## 4. 배포 프롬프트 보내기

### 처음부터 배포까지 한 번에

아직 프로젝트를 만들지 않았다면 이 프롬프트로 시작해요. [컨셉으로 화면 만들기의 첫 프롬프트](https://prokit-web.vercel.app/tutorials/samples/#2-프롬프트-하나로-프로젝트-시작하기)와 같고 마지막 줄만 달라요. 작업 폴더 `~/projects`에서 연 에이전트에게 보내세요. 바꿀 곳은 `[ ]` 안 세 군데예요. 프로젝트 폴더 이름, 누가 쓰고 무엇을 하는 서비스인지, 올릴 곳(`GitHub Pages` 또는 `Vercel`)이에요.

```prompt
https://github.com/roadkwon-ai/pro-kit 을 이 폴더에 받고, 그 안의 AGENTS.md대로 화면만 만들 프로젝트를 pro-kit 옆에 [living] 폴더로 만들어줘.
DB는 쓰지 않아. 없는 준비물은 설치해줘.
[같이 사는 사람들이 함께 쓴 생활비를 적고, 월말에 누가 누구에게 얼마를 보내면 되는지 알려 주는 서비스]를 만들고 싶어.
필요한 화면을 모두 예시 데이터로 만들어줘. 로그인이나 저장 같은 기능은 빼고 화면만 만들어.
디자인 스타일은 서비스에 어울리는 걸로 추천해주고, 다 만들면 [GitHub Pages]에 배포해줘.
```

그다음은 컨셉으로 화면 만들기와 같아요. 에이전트가 알려 준 한 줄로 새 폴더에서 이어 가고, 질문에 답하면 돼요([알려 준 한 줄로 이어 가기](https://prokit-web.vercel.app/tutorials/samples/#3-알려-준-한-줄로-이어-가기)). 화면을 모두 만든 뒤 에이전트가 배포하고 주소를 알려 줘요.

### 이미 만든 화면 올리기

프로젝트 폴더(예: `~/projects/living`)에서 연 에이전트에게 보내세요. `[ ]` 안은 올릴 곳이에요.

```prompt
[GitHub Pages]에 배포해줘
```

### 고친 뒤 다시 올리기

[다듬기](https://prokit-web.vercel.app/tutorials/samples/refine/)로 화면을 고쳤으면 다시 올려요. 같은 주소에 새 화면이 올라가요.

```prompt
고친 화면을 다시 배포해줘
```

### 내리기

더 보여 줄 필요가 없으면 내려요. 에이전트가 무엇을 끄거나 지울지 먼저 보여 주고 물어봐요.

```prompt
배포한 사이트를 내려줘
```

- **GitHub Pages**: 사이트를 꺼요. 저장소와 코드는 남아요. 저장소까지 지우려면 GitHub에서 그 저장소의 Settings 맨 아래 Delete this repository를 눌러 직접 지우세요. 토큰에는 저장소를 지우는 권한이 없어요.
- **Vercel**: Vercel의 프로젝트를 지워요. 주소도 함께 없어져요.

**이렇게 되면 성공**
- 에이전트가 배포한 주소를 알려 줘요.
- 휴대폰에서 그 주소를 열어도 내 서비스의 첫 화면이 보여요.
- 메뉴와 버튼을 누르면 다른 페이지가 열리고, 그림과 글꼴이 깨지지 않아요.

<details>
<summary>막히면</summary>

- **토큰이 없다고 멈췄어요**: `.env`가 작업 폴더 `~/projects`에 있는지, 줄 이름이 `GH_TOKEN`이나 `VERCEL_TOKEN`인지 확인하세요. 고쳤으면 `다시 배포해줘`라고 보내세요. 토큰을 대화창에 붙여 넣지 마세요.
- **토큰 권한이 없거나 만료됐대요**: 새 토큰을 만들어 `.env`의 값을 바꾸세요. GitHub 토큰은 `repo`에 체크했는지 확인하세요.
- **주소를 열면 404가 나와요**: GitHub Pages는 처음 올린 뒤 1분쯤 지나야 열려요. 잠시 뒤 새로 고침하세요. 계속 404면 `배포한 주소가 404야. 확인해줘`라고 보내세요.
- **글만 나오고 그림과 모양이 깨져요**: `배포한 주소에서 그림과 스타일이 깨져. 확인하고 다시 배포해줘`라고 보내세요.
- **Vercel 주소를 여니 로그인 화면이 나와요**: 배포할 때마다 생기는 긴 주소는 보호돼 있어요. 에이전트가 알려 준 `<프로젝트 이름>.vercel.app` 주소를 여세요.
- **같은 이름의 저장소가 이미 있대요**: 내 GitHub에 같은 이름의 저장소가 있을 때예요. `저장소 이름을 living-site로 해서 배포해줘`처럼 다른 이름을 알려 주세요. 주소도 그 이름으로 바뀌어요.
- **비밀번호를 입력하라고 해요**: 프로그램 설치에 컴퓨터 비밀번호가 필요할 때예요. 에이전트가 알려 준 명령을 새 터미널 창에서 직접 실행하고, 끝나면 대화창에 `설치했어. 이어서 해줘`라고 보내세요.

</details>
