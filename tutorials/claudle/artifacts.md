# 10장. 아티팩트
https://prokit-web.vercel.app/tutorials/claudle/artifacts/

## 이번 장에서 할 일

답에 HTML이나 SVG 코드가 있으면 "미리 보기" 버튼을 달고, 누르면 오른쪽 창에서 실제로 돌려 봐요. 이렇게 답에서 바로 써 볼 수 있는 결과물을 [아티팩트](https://prokit-web.vercel.app/tutorials/reference/glossary/#만들기)라고 불러요.

**미리 보기 창은 모델이 만든 코드를 돌리니 안전하게 막아 둬요.** 창 안의 코드는 내 로그인 정보나 브라우저 저장 값을 읽을 수 없고, 바깥 인터넷으로 요청도 보내지 못해요.

## 1. 미리 보기 만들기

9장의 확인을 마친 에이전트에 보내요.

```prompt
답의 html·svg 코드 블록을 프리셋 팩 features.md "아티팩트 미리 보기"대로 오른쪽 창에서 미리 보게 해줘.
창 안의 코드는 이 사이트의 저장 값과 로그인 정보를 읽지 못하고 바깥으로 요청도 못 하게 같은 절대로 막아줘.
```

에이전트는 이런 순서로 일해요.

1. [스펙](https://prokit-web.vercel.app/tutorials/reference/glossary/#만들기)(기능의 범위와 동작을 적은 문서)을 보여 주며 확인을 받아요.
2. 답의 코드 블록 아래에 "미리 보기" 버튼을 달고, 오른쪽 창(4장에서 만든 뷰어)에 이어요.
3. 창을 막는 설정(샌드박스와 외부 요청 차단)을 넣고, 창 안 코드가 사이트의 저장 값을 읽으려 하면 실패하는지 자동 테스트로 확인해요.
4. 리뷰를 마치면 개발 서버를 켜 두고 확인을 요청해요.

새 대화에서 `HTML 카운터 만들어 줘`라고 보내면 키가 없어도 모의 응답으로 HTML 카운터가 와요. 그 답으로 확인하세요.

**이렇게 되면 성공**
- HTML 코드 블록 아래에 "미리 보기"가 생기고, 누르면 오른쪽 창에서 버튼이 눌리는 카운터가 돌아요.
- 창 안 코드가 이 사이트의 저장 값(`localStorage`)을 읽으려 하면 오류가 나요.
- 바깥 주소의 스크립트를 불러오는 코드는 창 안에서 돌지 않아요.
- 이 두 가지는 눈으로 보기 어려워요. 에이전트가 보고하는 자동 테스트 결과로 확인해요.

괜찮으면 `확인했어`라고 보내세요.

<details>
<summary>막히면</summary>

- **창 안 코드가 사이트 저장 값을 읽을 수 있어요**: 가장 흔한 실수예요. `미리 보기 iframe의 sandbox에서 allow-same-origin을 빼줘. features.md "아티팩트 미리 보기"대로`라고 보내세요.
- **미리 보기가 하얗게 나와요**: 바깥 주소의 스크립트를 쓰는 코드라 막혔을 수 있어요. 정상이에요. 한 파일 안에 든 코드만 돌아요.
- **프리셋 팩을 못 찾거나, 앞 장 작업을 이어서 하려 하거나, 중간에 멈췄어요**: [5장의 막히면](https://prokit-web.vercel.app/tutorials/claudle/auth-chats/#3-직접-써-보고-확인하기)과 같아요.
- 그 밖의 문제는 [막혔을 때](https://prokit-web.vercel.app/tutorials/reference/troubleshooting/)를 보세요.

</details>

## 에이전트가 물어보면

5장처럼 [라운드](https://prokit-web.vercel.app/tutorials/reference/glossary/#만들기)(기능 하나를 만들거나 요청한 것을 고치고 확인까지 마치는 작업 묶음) 하나로 진행되고, 끝에 직접 써 보고 확인해 달라고 해요. [4장](https://prokit-web.vercel.app/tutorials/claudle/screens/#에이전트가-물어보면)과 [5장](https://prokit-web.vercel.app/tutorials/claudle/auth-chats/#에이전트가-물어보면) 표의 질문(디자인 점수, 스킬 업데이트 등)도 나올 수 있어요. 선택지 창에서 답하는 법은 [질문에 답하는 법](https://prokit-web.vercel.app/tutorials/reference/claude-code-and-codex/#질문에-답하는-법)에 있어요.

| 질문 | 답 |
|---|---|
| 아티팩트를 따로 DB에 저장할지 | `저장하지 말고 답의 코드 블록에서 바로 그려줘` |
| 보안 리뷰에서 나온 지적을 어떻게 할지 | `추천대로 해줘` |
| 직접 써 보고 확인해 달라 | 카운터를 눌러 본 뒤 `확인했어` 또는 고칠 곳 |

다음: [11장. 검사와 다듬기](https://prokit-web.vercel.app/tutorials/claudle/check/)
