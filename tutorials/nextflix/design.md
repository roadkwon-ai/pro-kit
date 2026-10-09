# 3장. 디자인 정하기
https://prokit-web.vercel.app/tutorials/nextflix/design/

## 이번 장에서 할 일

[프리셋 팩](https://prokit-web.vercel.app/tutorials/reference/glossary/#만들기)(만들 서비스의 화면 구성, 기능 규칙, 디자인 노트, 예시 데이터, 그림을 묶어 둔 폴더)의 디자인 노트(`design-notes.md`)에 적힌 주소에서 [`DESIGN.md`](https://prokit-web.vercel.app/tutorials/reference/glossary/#디자인)(색, 글꼴, 간격 규칙을 적은 파일)를 받아 고쳐 써요. 받는 원문은 디자인 카탈로그 Refero Styles에 있는 넷플릭스 스타일이에요. 로그인 전 첫 화면을 잰 것이라 로그인 후 둘러보기 화면에 맞게 고치고 **로고, 빨강, 서체처럼 브랜드를 알아보게 하는 것은 바꿔요.**

그다음 홈 화면 구성 세 가지 가운데 하나를 골라요. 기본은 [구성도](https://prokit-web.vercel.app/tutorials/reference/glossary/#디자인)(고르기 페이지가 직접 그리는 화면 구성 그림)로 고르고, 원하면 [시안](https://prokit-web.vercel.app/tutorials/reference/glossary/#디자인)(comp. 완성 화면을 미리 그린 그림)을 그려서 골라요.

> [!TIP]
> 시안을 그리고 싶을 때 Codex, Antigravity, Grok Build는 준비할 것이 없어요. Claude Code는 이미지 API 연결이 필요해서 이 장의 프롬프트를 보내기 전에 [1장 3단계](https://prokit-web.vercel.app/tutorials/nextflix/create-project/#3-선택-시안을-그리려면)를 해 두세요. 준비한 뒤 `claude --continue`로 다시 열면 2장의 대화가 이어져요. 처음에 옵션을 붙여 열었다면 같은 옵션을 붙여 `claude --continue --dangerously-skip-permissions`로 여세요.

## 1. DESIGN.md 받아 고치기

2장과 같은 대화창에 보내요.

```prompt
디자인은 프리셋 팩의 design-notes.md에 적힌 주소에서 DESIGN.md를 받아서 써줘.
받은 다음 design-notes.md의 "받은 뒤 고칠 것"대로 고쳐줘.
화면 배치는 프리셋 팩의 screens.md와 배치도(wireframes)를 따라줘.
다 고치면 홈 화면 구성을 고르게 해줘. 시안은 그리지 말고 구성도로 보여 줘.
화면은 고른 뒤 다음 요청에 만들어줘.
```

시안을 그려서 고르고 싶으면 넷째 줄의 `시안은 그리지 말고 구성도로 보여 줘.`를 `시안을 그려서 보여 줘.`로 바꿔 보내세요.

[배치도](https://prokit-web.vercel.app/tutorials/reference/glossary/#디자인)는 프리셋 팩에 들어 있는 화면 배치 그림이에요. 에이전트는 이런 순서로 일해요.

1. 브라우저 도구로 Refero 페이지를 열고 "Download DESIGN.md" 버튼으로 받아요. 안 되면 페이지에 있는 원문을 써요.
2. "받은 뒤 고칠 것"대로 고쳐요. 바탕과 버튼은 로그인 후 화면에 맞추고, 강조색은 비슷한 계열의 다른 빨강, 서체는 Pretendard, 로고는 서비스 이름 글자로 바꿔요.
3. 명세 검사기로 확인하고, 원래 서비스 이름과 색 코드가 남지 않았는지 찾아봐요.

고친 내용을 확인하려면 이렇게 물어보세요.

```prompt
DESIGN.md에서 바탕, 버튼 모양, 서체, 로고를 어떻게 정했는지 알려줘.
```

**이렇게 되면 성공**
- 프로젝트 폴더에 `DESIGN.md`가 생겨요.
- 위 질문에 에이전트가 바탕은 어두운 회색, 버튼은 알약 모양이라고 답해요.
- 원래 서비스의 이름, 빨강 색 코드, 서체 이름이 남지 않았다고 알려 줘요.

<details>
<summary>막히면</summary>

- **DESIGN.md를 받지 못했대요**: 디자인 노트에는 다른 주소가 하나 더 있어서 에이전트가 그쪽도 시도해요. 둘 다 안 되면 에이전트가 알려 준 페이지를 브라우저로 열고, "Download DESIGN.md" 버튼으로 받은 파일을 프로젝트 폴더에 넣으세요. 그다음 `DESIGN.md를 프로젝트 폴더에 넣었어. 이어서 고쳐줘`라고 보내세요.
- **검사에서 경고가 나왔대요**: 오류가 아니면 괜찮아요. 쓰지 않는 값이 있다는 경고는 그대로 둬도 돼요.
- **원래 서비스 이름이나 색이 남았대요**: `design-notes.md "받은 뒤 고칠 것"의 3번(원문 정리)대로 다시 고치고 4번(확인)으로 확인해줘`라고 보내세요.
- **스타일 후보 1~3위를 다시 보여 줘요**: `프리셋 팩에 적힌 주소의 스타일로 해줘`라고 답하세요.
- **프리셋 팩을 못 찾는대요**: `프리셋 팩은 옆 폴더 pro-kit의 packs/nextflix에 있어. 없으면 pro-kit 폴더에서 node scripts/pack.mjs nextflix 명령으로 받아줘`라고 보내세요. pro-kit 폴더가 2026-10-08 전에 받은 것이라 팩 받기가 멈추면 `그 폴더 이름을 pro-kit-old로 바꾸고 새로 받아줘`라고 보내세요.

</details>

## 2. 화면 구성 고르기

`DESIGN.md`를 고치면 에이전트가 서체 파일을 받고, 브라우저에 화면 구성 고르기 페이지를 열어요. 홈 화면 카드 세 장이 나와요. 기본은 카드마다 구성도(에이전트는 배치도나 wireframe이라고 부르기도 해요)가 나오고, 시안을 그리게 했다면 시안이 나와요.

배치는 프리셋 팩의 배치도로 정해져 있어서 세 장은 같은 배치 안에서 세부가 조금씩 달라요. 마음에 드는 카드를 눌러 고르세요.

> [!NOTE]
> 고르기 페이지에는 THE ROLL(이번에 뽑힌 추천), re-roll(다시 뽑기) 같은 영어 표시가 있어요. 카드만 고르면 돼요.

시안을 그리면 이런 그림이 나와요. 프리셋을 만들 때 이 세 장을 받았어요.

![Nextflix 시안 A](https://prokit-web.vercel.app/images/tutorials/01-nextflix/nextflix-comp-a.webp)

![Nextflix 시안 B](https://prokit-web.vercel.app/images/tutorials/01-nextflix/nextflix-comp-b.webp)

![Nextflix 시안 C](https://prokit-web.vercel.app/images/tutorials/01-nextflix/nextflix-comp-c.webp)

대화창에 적어 보내도 돼요. 여러 안을 섞고 싶으면 두 번째처럼 보내세요. 두 번째의 [빌보드](https://prokit-web.vercel.app/tutorials/reference/glossary/#디자인)는 홈 맨 위의 큰 대표 작품 화면이에요.

```prompt
A안으로 해줘.
```

```prompt
A안으로 하되, 빌보드의 글자 배치는 B안처럼 해줘.
```

**이렇게 되면 성공**
- 시안을 그렸다면 바탕이 어두운 회색이고 버튼이 알약 모양이에요. 그림은 프로젝트의 `.impeccable/mocks/` 폴더에 남아요.
- 에이전트가 고른 구성을 기록하고, 화면은 다음 요청을 받아 만들겠다고 알려 줘요.

고른 다음 [4장](https://prokit-web.vercel.app/tutorials/nextflix/screens/)의 프롬프트를 보내면 모든 페이지를 만들기 시작해요.

<details>
<summary>막히면</summary>

- **고르기 페이지가 안 열려요**: `화면 구성 고르기 페이지 주소를 알려줘`라고 보내세요.
- **시안을 그리게 했는데 구성도가 나왔어요**: Claude Code에 이미지 API 연결이 없으면 그래요. 구성도로 골라도 끝까지 만들 수 있어요. 시안을 원하면 [1장 3단계](https://prokit-web.vercel.app/tutorials/nextflix/create-project/#3-선택-시안을-그리려면)를 하고 다시 여세요.
- **시안을 그리지 말라고 했는데 그렸어요**: 그대로 골라도 돼요. 멈추려면 `Esc`를 누르고 `시안은 그리지 말고 구성도로 보여 줘`라고 보내세요.
- **세 장이 거의 같아 보여요**: 배치가 정해져 있어서 그래요. 마음에 드는 하나를 고르면 돼요.
- **고르자마자 화면을 만들기 시작했어요**: 그대로 두되, 바로 [4장](https://prokit-web.vercel.app/tutorials/nextflix/screens/#1-모든-페이지-만들기) 1단계 프롬프트를 보내 조건을 알려 주세요.

</details>

## 더 해 보기

### 다른 스타일로 바꾸기

> [!TIP]
> 화면 구조는 그대로 두고 `DESIGN.md`만 다른 스타일로 바꿀 수 있어요. 아래 프롬프트를 이 장 1단계 프롬프트 대신 보내세요. 화면을 다 만든 뒤에 바꾸면 리디자인이 되어 시간이 더 걸려요.

| 스타일 | 카탈로그 | 주소 |
|---|---|---|
| Disney+ | Refero Styles | https://styles.refero.design/style/e586b296-bfac-4e93-add2-daa384712b39 |
| HBO Max | Refero Styles | https://styles.refero.design/style/898f0127-d235-4832-bf33-ab21104f0529 |
| Spotify | awesome-design-md | https://getdesign.md/spotify/design-md |

`[ ]` 안의 주소를 표에서 고른 주소로 바꾸세요. 디자인 노트의 "받은 뒤 고칠 것"은 넷플릭스 원문에 맞춘 것이라 쓰지 않아요.

```prompt
디자인은 [https://styles.refero.design/style/e586b296-bfac-4e93-add2-daa384712b39] 에서 DESIGN.md를 받아서 써줘.
원래 브랜드의 로고, 색, 전용 서체는 쓰지 말고 비슷한 계열로 바꿔줘.
화면 배치는 프리셋 팩의 screens.md와 배치도(wireframes)를 따라줘.
색, 서체, 반경, 버튼 모양은 받은 DESIGN.md를 따르고, design-notes.md와 screens.md의 색·반경 값은 쓰지 마. screens.md에서는 배치, 크기, 움직임만 따라줘.
다 고치면 홈 화면 구성을 고르게 해줘. 시안은 그리지 말고 구성도로 보여 줘.
화면은 고른 뒤 다음 요청에 만들어줘.
```

### 원래 서비스를 보고 더 맞추기

> [!TIP]
> 기본 흐름에는 없는 선택 팁이에요. 넷플릭스 계정과 [ego lite](https://lite.ego.app/)(macOS 브라우저)가 있어야 해요. 4장에서 화면을 다 만든 뒤에 보내세요.

ego lite를 설치하고 넷플릭스에 로그인해 프로필을 골라 두세요. 알림 권한을 물으면 "차단"을 고르세요. 미리 보기 영상이 자동으로 재생되면서 넷플릭스의 예고편 기록에 남을 수 있어요.

```prompt
ego lite에 내가 로그인해 둔 넷플릭스를 직접 보고 배치, 크기, 간격, 움직임이 프리셋 팩과 다른 곳을 찾아서 맞춰줘.
넷플릭스에서는 보기만 하고 재생, 찜, 평가, 설정 변경은 하지 마. 계정 정보가 보이는 화면은 찍지 마.
```

> [!WARNING]
> 에이전트는 넷플릭스를 읽기만 해요. 맞추는 건 배치, 크기, 간격, 움직임뿐이고 로고, 색, 서체, 그림, 문구는 가져오지 않아요. 계정 이름이나 결제 정보가 보이는 화면을 찍으려 하면 `Esc`로 멈추세요.

## 에이전트가 물어보면

| 질문 | 답 |
|---|---|
| 스타일 1~3위 중 무엇으로 할지 | `프리셋 팩에 적힌 주소의 스타일로 해줘` |
| 대표 색을 원본대로 쓸지 바꿀지 | `design-notes.md대로 바꿔줘` |
| 화면 구성 카드 중 무엇으로 할지 | 브라우저에서 카드를 눌러 고르기. 섞고 싶으면 대화창에 적기 |
| 시안을 그리게 했는데 이미지를 그릴 수 없어서 구성도로 고를지 | `그렇게 해줘. 이미지 없이 고를게`. 시안을 그리고 싶으면 [1장 3단계](https://prokit-web.vercel.app/tutorials/nextflix/create-project/#3-선택-시안을-그리려면)를 하고 다시 열기 |

다음: [4장. 모든 화면 만들기](https://prokit-web.vercel.app/tutorials/nextflix/screens/)
