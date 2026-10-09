# 4장. 모든 화면 만들기
https://prokit-web.vercel.app/tutorials/claudle/screens/

## 이번 장에서 할 일

사이트맵의 모든 페이지를 [프리셋 팩](https://prokit-web.vercel.app/tutorials/reference/glossary/#만들기)(만들 서비스의 화면 구성, 기능 규칙, 디자인 노트, 예시 데이터, 그림을 묶어 둔 폴더)의 [예시 데이터](https://prokit-web.vercel.app/tutorials/reference/glossary/#만들기)(화면을 먼저 보기 위해 넣어 두는 가짜 데이터)와 그림으로 만들어요. **로그인과 저장 같은 기능은 아직 없고 화면만 있어요.** 고정이나 이름 바꾸기는 화면에서만 바뀌고, 새로고침하면 처음으로 돌아가요.

질문을 보내면 실제 AI 대신 프리셋 팩에 미리 써 둔 답을 골라 글자씩 흘려 보여 줘요([모의 응답](https://prokit-web.vercel.app/tutorials/reference/glossary/#만들기)). 그래서 AI 키가 없어도 대화가 어떻게 흐르는지 볼 수 있어요.

[프리셋 사이트](https://roadkwon-ai.github.io/pro-kit/claudle/)가 이 장의 완성 예시예요. 가장 오래 걸리는 장이에요.

## 1. 모든 페이지 만들기

3장에서 화면 구성을 고른 대화창에 보내요.

```prompt
사이트맵의 모든 페이지를 프리셋 팩의 예시 데이터(data)와 그림으로 만들어줘. 그림은 팩의 images 폴더에 있어.
답은 팩의 mock-replies.json 규칙으로 흘려 보여 줘.
푸터에는 팩에 적힌 연습용 안내 문구를 넣어줘.
로그인, 저장, 실제 AI 답 같은 기능은 다음에 만들 거야. 지금은 넣지 마.
```

에이전트는 이런 일을 해요.

- 프리셋 팩의 예시 데이터를 프로젝트에 복사해요.
- 프리셋 팩의 `images/`에 있는 그림을 `apps/web/public/images/`에 복사해요.
- 사이드바와 새 대화 화면, 대화 화면부터 만들어요. 답이 글자씩 흘러나오는 [스트리밍](https://prokit-web.vercel.app/tutorials/reference/glossary/#만들기)과 멈추기, 다시 시도, 복사를 붙여요. 이어서 검색 창, 프로젝트, 아티팩트, 설정 창, 소개, 로그인, 요금제까지 사이트맵의 모든 페이지를 차례로 만들어요.
- 페이지마다 데스크톱과 휴대폰 화면을 찍어 확인하고, 모든 링크와 버튼을 눌러 봐요.
- 디자인 리뷰([critique](https://prokit-web.vercel.app/tutorials/reference/glossary/#디자인))와 검사로 점수를 매기고 다듬어요.

중간에 멈추면 이렇게 보내세요.

```prompt
이어서 만들어줘.
```

> [!NOTE]
> 이 장에서 새로 보낸 대화는 내 브라우저에만 저장돼요. 다른 브라우저나 다른 컴퓨터에서는 안 보여요. 5장부터 DB에 저장해요.

## 2. 직접 보기

만드는 중이거나 다 만든 뒤에 내 브라우저로 볼 수 있어요.

```prompt
개발 서버 켜고 브라우저로 열 주소 알려줘.
```

알려 준 주소(보통 `http://localhost:3001`)는 소개 화면이에요. 로그인 카드의 버튼을 누르면(아무것도 넣지 않아도 돼요) 새 대화 화면으로 가요. 질문을 보내 보고, 사이드바의 예시 대화와 프로젝트도 열어 보세요. 창 너비를 줄여 휴대폰 크기에서도 보세요.

이런 질문을 보내면 답 모양이 달라져요. "SQL이 느려"는 코드가 있는 답, "두 방법을 비교해 줘"는 표가 있는 답, "여행 일정 짜 줘"는 목록이 있는 답이에요.

**이렇게 되면 성공**
- 보내기를 누르면 "생각 중" 표시 뒤 글자가 흘러나와요.
- 답이 흐르는 동안 `Esc`를 누르면 그 자리에서 멈추고, 나온 글은 남아요.
- `⌘K`(Windows는 `Ctrl+K`)로 검색 창이 열리고, `Esc`로 닫혀요.
- `⌘B`(Windows는 `Ctrl+B`)로 사이드바가 접히고 펼쳐져요. 휴대폰 크기에서는 메뉴 버튼으로 전체 화면 메뉴가 열려요.
- 모델 메뉴에서 `Quick`만 고를 수 있고, 잠긴 `Balanced`·`Deep`을 누르면 요금제 안내로 가요.
- `HTML 카운터 만들어 줘`라고 보내고 답 속 HTML 코드를 미리 보면 버튼이 있는 작은 화면이 열려요.
- 화면 아래나 사이드바에 연습용 안내 문구가 있어요.

![인사말과 큰 입력창이 있는 새 대화 화면](https://prokit-web.vercel.app/images/tutorials/02-claudle/claudle-new-desktop.webp)

![휴대폰 너비의 새 대화 화면: 사이드바가 접혀 왼쪽 위 버튼으로 열어요](https://prokit-web.vercel.app/images/tutorials/02-claudle/claudle-new-mobile.webp)

![답 속 HTML 코드를 오른쪽 창에서 미리 보는 대화 화면](https://prokit-web.vercel.app/images/tutorials/02-claudle/claudle-chat-desktop.webp)

![⌘K로 연 검색 창](https://prokit-web.vercel.app/images/tutorials/02-claudle/claudle-search-desktop.webp)

프리셋 사이트는 이런 모습이에요. 내 화면은 그림이 달라도 정상이에요.

## 3. 확인하고 마치기

다 만들면 에이전트가 결과를 직접 보고 확인해 달라고 해요. 볼 순서와 남은 문제를 함께 알려 줘요. 괜찮으면 `확인했어`라고 보내고, 고칠 곳이 있으면 이렇게 말하세요.

```prompt
휴대폰 크기에서 사이드바 메뉴가 안 열려. 고쳐줘.
```

확인하면 [라운드](https://prokit-web.vercel.app/tutorials/reference/glossary/#만들기)(기능 하나를 만들거나 요청한 것을 고치고 확인까지 마치는 작업 묶음)가 닫히고 에이전트가 이번 작업을 기록(커밋)해요.

<details>
<summary>막히면</summary>

- **그림을 못 찾는대요**: `그림은 옆 폴더 pro-kit의 packs/claudle/images에 있어`라고 보내세요.
- **답이 한 번에 나와요**: 컴퓨터의 "동작 줄이기" 설정이 켜져 있으면 연출 없이 한 번에 보여요. 정상이에요. 설정이 꺼져 있는데도 그러면 `답이 글자씩 흘러나오게 screens.md의 가짜 스트리밍대로 고쳐줘`라고 보내세요.
- **한글을 치다가 Enter를 누르면 글자가 반만 보내져요**: `한글 조합 중 Enter는 보내지 않게 고쳐줘`라고 보내세요.
- **중간에 멈췄어요**: `이어서 만들어줘`라고 보내세요. 사용량 한도에 걸렸으면 안내된 시간이 지난 뒤 `~/projects/claudle`에서 `claude --continue --dangerously-skip-permissions`(Codex는 `codex resume --last --yolo`)로 다시 열고 `이어서 해줘`라고 보내세요. 기다리는 법은 [5시간 한도에 걸리면](https://prokit-web.vercel.app/tutorials/reference/costs-and-keys/#5시간-한도에-걸리면)에 있어요.
- **로그인이나 저장, 실제 AI까지 만들려고 해요**: `로그인, 저장, 실제 AI 답은 다음에 만들 거야. 지금은 넣지 마`라고 보내세요.
- **예약된 작업이나 사용자 지정 같은 페이지가 빠졌어요**: `screens.md 사이트맵과 비교해서 빠진 페이지를 만들어줘`라고 보내세요.
- **화면이 고른 구성과 많이 달라요**: `새 대화 화면을 3장에서 고른 구성과 비교해서 다른 곳을 맞춰줘`라고 보내세요.
- **화면이 안 열려요**: `개발 서버가 켜져 있는지 확인하고 다시 켜줘`라고 보내세요.
- **화면에 Claudle이 남았어요(이름을 바꿨을 때)**: `팩은 고치지 말고, 화면과 제목, 메타 정보에 남은 팩의 서비스 이름을 내가 정한 이름으로 바꿔줘`라고 보내세요.

</details>

## 에이전트가 물어보면

| 질문 | 답 |
|---|---|
| 결과를 직접 보고 확인해 달라 | 알려 준 주소로 둘러본 뒤 `확인했어` 또는 고칠 곳 |
| 점수가 기준에 못 미칠 때 더 다듬을지 | `한 번 더 다듬어줘` 또는 `이대로 둬` |
| 스트리밍 마크다운에 쓸 도구를 설치할지 | `설치해줘` |

다음: [5장. 로그인과 대화 저장](https://prokit-web.vercel.app/tutorials/claudle/auth-chats/)
