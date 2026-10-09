# 12장. 배포(선택)
https://prokit-web.vercel.app/tutorials/claudle/deploy/

> [!NOTE]
> **선택 장이에요.** 내 컴퓨터에서만 쓸 거면 11장에서 끝내도 돼요.
>
> 인터넷에 올리려면 [GitHub](https://prokit-web.vercel.app/tutorials/reference/glossary/#올리기), [Vercel](https://prokit-web.vercel.app/tutorials/reference/glossary/#올리기), [Neon](https://prokit-web.vercel.app/tutorials/reference/glossary/#올리기) 계정이 필요하고, 셋 다 무료 요금제로 시작할 수 있어요([배포 비용](https://prokit-web.vercel.app/tutorials/reference/costs-and-keys/#배포-비용)). Vercel 무료 요금제(Hobby)는 상업용이 아닌 개인 용도예요.

## 이번 장에서 할 일

Claudle을 [배포](https://prokit-web.vercel.app/tutorials/reference/glossary/#올리기)(인터넷에 올려 누구나 들어올 수 있게 하는 일)해요. 데이터는 Neon에 만든 [운영 DB](https://prokit-web.vercel.app/tutorials/reference/glossary/#올리기)(인터넷에 두고 배포한 서비스가 쓰는 DB)에 저장하고, 화면과 서버는 Vercel에 올려요. 운영 주소에는 [릴리스](https://prokit-web.vercel.app/tutorials/reference/glossary/#올리기)(버전 번호를 붙여 기록하는 일)한 코드만 올라가요.

올라가는 건 코드와 그림이에요. 그림은 4장에서 [프리셋 팩](https://prokit-web.vercel.app/tutorials/reference/glossary/#만들기)(만들 서비스의 화면 구성, 기능 규칙, 디자인 노트, 예시 데이터, 그림을 묶어 둔 폴더)에서 프로젝트에 넣어 둔 거예요. 모두 합쳐도 1MB가 안 돼요.

AI 답은 [7장](https://prokit-web.vercel.app/tutorials/claudle/ai-reply/)에서 넣은 `KILO_API_KEY`를 운영에도 넣으면 실제 답이고, 넣지 않으면 모의 응답으로 공개돼요. 둘 다 돈이 들지 않아요.

| 누가 | 할 일 |
|---|---|
| 나(브라우저) | GitHub, Vercel, Neon 가입. 로그인 명령이 연 창에서 로그인하고 허락 |
| 나(터미널) | 에이전트가 알려 준 도구 설치 명령과 로그인 명령 실행 |
| 나(대화창) | 프롬프트 보내기, 릴리스와 운영 DB 적용에 동의 |
| 에이전트 | GitHub 저장소 만들기, Neon DB 만들고 연결, Vercel 연결과 설정(`KILO_API_KEY` 포함), 릴리스, DB 적용, 배포와 확인 |

> [!WARNING]
> DB 주소(연결 문자열), 비밀번호, `KILO_API_KEY`, [토큰](https://prokit-web.vercel.app/tutorials/reference/glossary/#계정과-비용)은 **대화창에 붙여 넣지 마세요.** 에이전트도 이런 값을 화면이나 파일에 남기지 않고 Vercel에 바로 넣어요.

## 1. 계정과 도구 준비하기

GitHub과 Vercel 가입은 [배포하기의 계정 만들기](https://prokit-web.vercel.app/tutorials/reference/deploy/#2-계정과-토큰-만들기)에서 1번 단계만 하면 돼요. Neon은 [neon.com](https://neon.com)에서 무료 요금제로 가입하세요. 이 장에서는 토큰 대신 로그인 명령으로 연결하니 토큰은 만들지 않아도 돼요.

가입을 마치면 11장의 확인을 마친 에이전트에 보내요.

```prompt
배포 준비를 할 거야. 코드는 GitHub, 운영 DB는 Neon, 배포는 Vercel에 둘 거야.
필요한 도구와 로그인 상태를 확인하고, 내가 직접 할 일을 먼저 알려줘.
```

에이전트는 터미널용 도구인 GitHub CLI(`gh`), Vercel CLI, Neon CLI가 있는지, 로그인했는지 봐요. 없는 도구의 설치 명령과 로그인 명령은 에이전트가 알려 주고, 실행은 내가 해요. **알려 준 명령은 새 터미널 창에서 직접 실행하세요.**

에이전트가 `! vercel login`처럼 `!`로 시작하는 명령을 줄 때가 있어요. Claude Code라면 대화창에 그대로 입력하고, Codex라면 새 터미널 창에서 `!` 없이 실행하세요.

로그인 명령(`gh auth login`, `vercel login`, `neon login`)은 브라우저를 열어요. 열린 창에서 로그인하고 허락을 누르세요. 다 하면 대화창에 `다 했어. 다시 확인해줘`라고 보내세요.

**이렇게 되면 성공**
- 에이전트가 세 도구가 모두 있고 로그인돼 있다고 알려 줘요.
- 알려 준 계정 이름이 내가 가입한 계정과 같아요.

<details>
<summary>막히면</summary>

- **비밀번호를 입력하라고 해요**: 설치에 컴퓨터 비밀번호가 필요할 때예요. 새 터미널 창에서 직접 실행하고, 끝나면 `설치했어. 이어서 해줘`라고 보내세요.
- **`gh auth login`이 여러 가지를 물어요**: 기본 선택대로 엔터를 누르면 돼요. 터미널에 나온 코드를 열린 브라우저 창에 입력하세요.
- **로그인 명령이 브라우저를 열지 않아요**: 터미널에 나온 주소를 브라우저에 붙여 넣고, 터미널에 나온 코드를 입력하세요.
- **다른 계정으로 로그인됐어요**: `Vercel에 다른 계정으로 로그인돼 있어. 로그아웃하는 명령 알려줘`처럼 보내고, 알려 준 명령을 실행한 뒤 다시 로그인하세요.

</details>

## 2. 코드를 GitHub에 올리기

운영에는 GitHub에 버전 기록을 남긴 코드만 올라가요. 그래서 먼저 GitHub에 저장소를 만들어 이 프로젝트와 연결해요. 에이전트는 이 연결을 `origin`이라고 불러요.

`[claudle]`은 프로젝트 폴더 이름이에요. 폴더 이름을 바꿨다면 이 장의 `[claudle]`도 모두 내 폴더 이름으로 바꾸세요.

```prompt
GitHub에 [claudle] 비공개 저장소를 만들어서 이 프로젝트와 origin으로 연결하고, 지금까지 커밋을 올려줘.
```

비공개 저장소의 코드는 나만 볼 수 있어요. 연결한 뒤부터는 [라운드](https://prokit-web.vercel.app/tutorials/reference/glossary/#만들기)(기능 하나를 만들거나 요청한 것을 고치고 확인까지 마치는 작업 묶음)가 끝날 때마다 커밋이 GitHub에도 올라가요.

**이렇게 되면 성공**
- GitHub의 내 저장소 목록에 `claudle` 저장소가 생기고, 지금까지 한 커밋이 보여요.
- 저장소 이름 옆에 Private 표시가 있어요.

<details>
<summary>막히면</summary>

- **같은 이름의 저장소가 이미 있대요**: `저장소 이름을 claudle-app으로 해줘`처럼 다른 이름을 보내세요.
- **GitHub에 로그인이 안 돼 있대요**: 새 터미널 창에서 `gh auth login`을 실행하고, 끝나면 `로그인했어. 이어서 해줘`라고 보내세요.

</details>

## 3. 운영 DB 만들기

Neon에 운영 DB를 만들고 이 프로젝트와 연결해요.

```prompt
Neon에 [claudle] 프로젝트를 만들어서 이 프로젝트에 연결해줘.
develop 배포에 쓸 DB도 따로 만들어줘.
연결하면 생기는 .neon 파일은 .gitignore에 넣고, DB 주소는 파일로 받지 마.
```

에이전트는 Neon에 프로젝트를 만들고 이 프로젝트와 연결해요. [develop](https://prokit-web.vercel.app/tutorials/reference/glossary/#올리기)(운영에 올리기 전에 먼저 보는 확인용 주소)에 쓸 DB는 운영 DB에서 갈라 만들어요. 연결 정보 파일(`.neon`)은 `.gitignore`에 넣어 내 컴퓨터에만 두고 GitHub에는 올리지 않아요.

아직 DB에 표는 없어요. 표는 5단계에서 운영에 처음 배포할 때 만들어요. 개발은 지금처럼 내 컴퓨터의 DB로 해요.

**이렇게 되면 성공**
- [Neon 웹사이트](https://console.neon.tech)에 `claudle` 프로젝트가 보여요.
- 그 프로젝트의 Branches 목록에 `develop`이 있어요.

<details>
<summary>막히면</summary>

- **Neon에 로그인이 안 돼 있대요**: 새 터미널 창에서 `neon login`을 실행하고, 끝나면 `로그인했어. 이어서 해줘`라고 보내세요.
- **DB 주소를 보여 주려고 해요**: `Esc`로 멈추고 `DB 주소는 화면에 보여 주지 말고 이어서 해줘`라고 보내세요.

</details>

## 4. Vercel 연결하기

Vercel에 프로젝트를 만들고 이 프로젝트와 연결해 배포 준비를 마쳐요.

```prompt
Vercel 배포 준비해줘. Vercel 프로젝트 이름은 [claudle]로 해줘.
운영과 develop에 넣을 환경변수도 넣어줘. KILO_API_KEY는 .env의 값을 화면에 보이지 않게 넣어줘.
```

에이전트는 이런 순서로 일해요. 준비만 하고 배포는 하지 않아요.

1. Vercel에 프로젝트를 만들어 이 프로젝트와 연결하고, 웹 앱 폴더(`apps/web`)를 올리게 설정해요.
2. Vercel이 GitHub 저장소를 저절로 연결했으면 끊어요. 연결돼 있으면 GitHub에 올릴 때마다 검사 없이 운영에 배포되기 때문이에요.
3. 운영과 develop에 [환경변수](https://prokit-web.vercel.app/tutorials/reference/glossary/#올리기)(DB 주소, 로그인용 비밀값, 서비스 주소처럼 배포한 서비스가 쓰는 설정값)를 따로 넣어요. `KILO_API_KEY`도 화면에 보이지 않게 넣어요.
4. 배포 준비를 검사해요. 릴리스는 첫 배포 때 하니 그 밖의 항목은 모두 준비돼야 해요.
5. 첫 배포는 운영으로 해야 한다고 알려 줘요. Vercel이 프로젝트의 첫 배포를 운영으로 만들기 때문이에요.

**이렇게 되면 성공**
- 에이전트가 배포 준비 검사에서 릴리스 말고는 모두 준비됐다고 알려 줘요.
- 운영 주소(`https://claudle.vercel.app` 같은 모양)와 develop 주소가 정해져요.
- [Vercel 웹사이트](https://vercel.com/dashboard)의 내 프로젝트 목록에 `claudle`이 생겨요.

<details>
<summary>막히면</summary>

- **주소 이름이 이미 쓰이고 있대요**: `vercel.app` 주소 이름은 모든 Vercel 사용자가 함께 써서 겹칠 수 있어요. `추천대로 다른 이름으로 해줘`라고 보내세요.
- **Vercel에 로그인이 안 돼 있대요**: 새 터미널 창에서 `vercel login`을 실행하고, 끝나면 `로그인했어. 이어서 해줘`라고 보내세요.
- **Git 자동 배포가 켜져 있대요**: `Vercel 프로젝트의 GitHub 연결을 끊어줘`라고 보내세요.

</details>

## 5. 운영에 첫 배포하기

운영 주소에 처음으로 올려요.

```prompt
운영에 배포해줘.
```

운영 배포에는 릴리스가 함께 들어 있어요. 운영 DB는 처음에 비어 있어서, 가입한 사람마다 빈 대화 목록에서 시작해요. 에이전트는 이런 순서로 일해요.

1. 배포 준비를 다시 검사해요.
2. `pnpm release`로 다음 버전을 정하고, 지금까지 바뀐 점을 적은 릴리스 노트를 `release/` 폴더에 써요. 첫 버전은 `v0.1.0`이에요.
3. 노트를 다듬고 버전과 함께 보여 주며 동의를 받아요. 동의하면 노트를 커밋하고 버전 태그를 붙여 GitHub에 올린 뒤 GitHub Release를 만들어요.
4. 운영 DB에 적용할 [마이그레이션](https://prokit-web.vercel.app/tutorials/reference/glossary/#만들기)(DB의 표를 만들거나 바꾸는 기록) 목록을 보여 주며 동의를 받고 적용해요. 새 코드가 새 표를 쓰니 DB를 먼저 바꿔요.
5. Vercel에 운영으로 배포하고, 운영 주소에서 로그인 기능이 응답하는지 확인해요.
6. 운영 주소, 버전, 되돌리는 명령을 보고해요.

**이렇게 되면 성공**
- 운영 주소를 휴대폰에서 열면 소개 화면이 보여요.
- 가입하고 질문을 보내면 답이 흘러요. 키를 넣었다면 실제 답, 아니면 모의 응답이에요.
- GitHub 저장소의 Releases에 `v0.1.0`이 생겨요.

운영 주소에서 가입한 계정은 운영 DB에 저장돼요. **내 컴퓨터의 DB와는 따로라서 개발할 때 만든 계정으로는 로그인할 수 없어요.**

<details>
<summary>막히면</summary>

- **같은 버전 태그가 이미 있대요**: `GitHub에서 최신 기록을 받고 릴리스 노트를 다시 만들어줘`라고 보내세요.
- **빌드가 Node.js 버전 때문에 실패했대요**: [Vercel 웹사이트](https://vercel.com/dashboard)에서 프로젝트를 열고 Settings → Build and Deployment의 Node.js Version을 24.x로 바꾸세요. 그다음 `Node.js 버전 바꿨어. 다시 배포해줘`라고 보내세요.
- **운영 주소에서 로그인이 안 돼요**: 배포할 때마다 새로 생기는 긴 주소(프로젝트 이름 뒤에 알 수 없는 글자가 붙은 주소)에서는 로그인이 안 돼요. 에이전트가 알려 준 운영 주소로 여세요.
- **운영 주소가 예상과 다르대요**: 이미 쓰인 이름이라 Vercel이 주소 끝에 글자를 붙였을 때예요. `운영 주소를 실제 주소로 고치고 다시 배포해줘`라고 보내세요.
- **운영에서 답이 계속 모의 응답이에요**: 운영 환경변수에 `KILO_API_KEY`가 없을 때예요. `운영에 KILO_API_KEY를 화면에 보이지 않게 넣고 다시 배포해줘`라고 보내세요. 환경변수를 바꾸면 다시 배포해야 반영돼요.
- **운영에서 바로 "오늘 쓸 수 있는 사용량을 다 썼어요"가 나와요**: 하루 200번은 서비스 전체가 나눠 써요. 방문자가 많으면 금방 차요. 다음 날 다시 쓸 수 있어요.
- **배포한 뒤 문제가 생겼어요**: `운영 배포를 직전 배포로 되돌려줘`라고 보내세요. 앱만 되돌리고 DB와 릴리스는 그대로 둬요. 고친 코드는 새 버전으로 다시 올려요.
- 그 밖의 문제는 [막혔을 때](https://prokit-web.vercel.app/tutorials/reference/troubleshooting/)를 보세요.

</details>

## 6. 고친 뒤 다시 올리기

배포 준비를 마치면 라운드가 끝날 때마다 에이전트가 마무리를 골라 달라고 해요. "릴리스하고 production 배포"를 고르면 새 버전으로 운영에 올리고, "커밋·push만"을 고르면 GitHub에만 올려요. 운영에 올리지 않은 변경은 다음 릴리스에 함께 담겨요.

운영에 올리기 전에 develop 주소에서 먼저 보고 싶으면 이렇게 보내세요.

```prompt
develop에 배포해줘.
```

develop에 올릴 때는 릴리스를 만들지 않아요. develop 주소는 Vercel에 로그인한 브라우저에서만 열려요.

**이렇게 되면 성공**
- 에이전트가 develop 주소(`https://claudle-develop.vercel.app` 같은 모양)를 알려 줘요.
- Vercel에 로그인한 브라우저로 열면 고친 화면이 보여요.

<details>
<summary>막히면</summary>

- **develop 주소를 여니 Vercel 로그인 화면이 나와요**: 정상이에요. 내 Vercel 계정으로 로그인하면 열려요.
- **운영에 배포한 적이 없어서 develop에 올릴 수 없대요**: 5단계를 먼저 하세요.

</details>

## 7. (팁) 하루 한도를 나눠 쓰는 법

> [!WARNING]
> 공개 주소에서는 하루 200번을 **방문자 모두가 나눠 써요.** 누가 많이 쓰면 다른 사람은 그날 "오늘 쓸 수 있는 사용량을 다 썼어요" 안내만 보게 돼요. 키를 넣지 않으면 모든 방문자가 모의 응답을 봐요.

무료 AI 공급자는 Kilo 말고도 여럿 있어요. 공급자마다 무료 한도가 따로라서, 한 곳이 한도에 걸리면 다음 곳으로 넘기는 **릴레이**를 두면 더 오래 실제 답을 줄 수 있어요.

릴레이는 선택이에요. 공급자마다 가입하고 키를 만들어야 하고, 무료 범위를 넘지 않게 지켜야 해요.

```prompt
Kilo가 한도에 걸리면 다른 무료 AI 공급자로 넘겨 답하는 릴레이를 만들고 싶어. 무료 범위만 쓰는 공급자 후보와 가입할 곳, 키 이름을 먼저 정리해줘.
가격이 0인 모델만 부르고, 공급자가 유료로 바뀌면 부르지 않게 해줘. 키는 내가 직접 넣을게.
```

## 에이전트가 물어보면

배포는 중간에 내 동의가 필요한 곳이 많아요. 선택지 창에서 답하는 법은 [질문에 답하는 법](https://prokit-web.vercel.app/tutorials/reference/claude-code-and-codex/#질문에-답하는-법)에 있어요.

| 질문 | 답 |
|---|---|
| Vercel 팀이 여러 개일 때 어느 팀에 만들지 | 쓸 팀 |
| Vercel이나 Neon 프로젝트 이름이 맞는지 | `좋아` 또는 원하는 이름 |
| Neon 프로젝트를 둘 지역 | `추천대로 해줘` |
| 첫 배포는 운영이 된다는 안내 | 5단계 프롬프트를 보내요 |
| 릴리스 버전과 노트를 확인해 달라 | 읽어 보고 `좋아, 릴리스해줘` 또는 고칠 곳 |
| 운영 DB에 적용할 마이그레이션 목록 | `적용해줘` |
| 운영에 `KILO_API_KEY`를 넣을지 | 실제 답으로 공개하려면 `넣어줘`, 모의 응답으로 공개하려면 `넣지 마` |
| 라운드 끝 마무리("릴리스하고 production 배포"와 "커밋·push만") | 바로 운영에 올리려면 `릴리스하고 production 배포`, 아니면 `커밋·push만` |

## 다 만들었어요

여기까지 왔으면 Claudle을 다 만든 거예요. [소개](https://prokit-web.vercel.app/tutorials/claudle/)에서 장 목록을 다시 볼 수 있어요. 막히거나 궁금한 말이 있으면 [막혔을 때](https://prokit-web.vercel.app/tutorials/reference/troubleshooting/), [처음 보는 용어](https://prokit-web.vercel.app/tutorials/reference/glossary/), [에이전트별 차이](https://prokit-web.vercel.app/tutorials/reference/claude-code-and-codex/)에서 찾아보세요.
