# 7장. 실제 AI 답
https://prokit-web.vercel.app/tutorials/claudle/ai-reply/

## 이번 장에서 할 일

Kilo AI Gateway의 무료 키를 넣으면 실제 AI 모델이 답하게 해요. **키가 없으면 지금처럼 [모의 응답](https://prokit-web.vercel.app/tutorials/reference/glossary/#만들기)으로 답하니, 이 장을 건너뛰어도 8장부터 그대로 이어 갈 수 있어요.**

함께 붙이는 것도 있어요. 답을 멈추면 그때까지 나온 글을 저장하고, 모델 메뉴에서는 무료 모델 `Quick`만 고르게 해요. 키 하나를 서비스 전체가 나눠 쓰니 하루에 답할 수 있는 수도 정해 둬요.

> [!WARNING]
> 무료 모델은 공급자가 대화를 기록하거나 학습에 쓸 수 있어요. 개인 정보나 회사 자료는 넣지 마세요. 이 안내는 입력창 아래에도 보여요.

## 1. Kilo 무료 키 만들기

[Kilo AI Gateway](https://kilo.ai/docs/gateway)는 여러 AI 모델을 한 주소로 부르게 해 주는 서비스([AI Gateway](https://prokit-web.vercel.app/tutorials/reference/glossary/#계정과-비용))예요. [무료 모델](https://prokit-web.vercel.app/tutorials/reference/glossary/#계정과-비용)은 가입만 하면 써요.

1. [app.kilo.ai](https://app.kilo.ai)에 무료로 가입하고 로그인해요.
2. API 키를 만들어요. 방법은 [Kilo 인증 문서의 API 키 절](https://kilo.ai/docs/getting-started/setup-authentication#kilo-gateway-api-key)(영어)에 있어요.
3. 요금제 화면에 Kilo Pass 같은 유료 상품이 보여도 결제하지 않아요. 이 장은 무료 모델만 써요.

키는 비밀번호처럼 다뤄요. **대화창에 키를 붙여 넣지 마세요.** 에이전트에게는 넣을 위치만 묻고, 키는 내가 직접 파일에 넣어요.

```prompt
실제 AI 답을 붙일 거야. KILO_API_KEY를 넣을 .env 파일 위치와 줄 모양만 알려줘. 키 값은 내가 직접 넣을게.
```

알려 준 파일을 편집기로 열고 `KILO_API_KEY=` 뒤에 키를 붙여 넣어 저장하세요. `.env` 파일은 git 기록에 들어가지 않아요. 12장에서 배포할 때 옮겨 넣는 `.env`의 값도 이 파일에 있어요.

키를 넣은 뒤에는 개발 서버를 다시 켜야 키를 읽어요.

## 2. 실제 AI 답 붙이기

키를 넣었으면(또는 키 없이 다른 것만 붙이려면) 에이전트에 보내요.

```prompt
답을 프리셋 팩 features.md "실제 AI와 사용량 한도"대로 만들어줘. 키가 있으면 Kilo 무료 모델, 없으면 지금 모의 응답 그대로야.
하루 한도와 안내 문구, 입력창 아래 안내도 같은 절대로 넣어줘.
모델 메뉴는 Quick만 고르고 나머지는 잠가줘. 멈추면 그때까지 나온 답을 저장해줘.
```

에이전트는 이런 순서로 일해요.

1. [스펙](https://prokit-web.vercel.app/tutorials/reference/glossary/#만들기)(기능의 범위와 동작을 적은 문서)을 보여 주며 확인을 받아요.
2. 키가 있는지 먼저 보고, 있으면 Kilo의 무료 모델로, 없으면 모의 응답으로 답을 흘려요.
3. 오늘 실제 모델이 한 답의 수를 세어, 한도가 차면 모델을 부르지 않고 안내를 보여요. Kilo가 한도에 걸렸다고 알려 줄 때도 같은 안내예요.
4. 키가 없을 때와 한도가 찼을 때를 가짜 서버로 흉내 내 자동 테스트로 확인해요. 키 값은 화면, 기록, 커밋 어디에도 남기지 않아요.
5. 리뷰를 마치면 개발 서버를 켜 두고 확인을 요청해요.

**이렇게 되면 성공**
- 키를 넣었다면 답 아래 "모의 응답" 표시가 사라지고, `Quick`으로 실제 답이 흘러요. 첫 글자까지 몇 초 걸릴 수 있어요.
- 모델 메뉴의 `Balanced`, `Deep`은 잠겨 있고, 누르면 요금제 안내로 가요.
- 답이 흐르는 동안 멈추면 그때까지 나온 글이 남고, 새로고침해도 저장돼 있어요.
- 키를 넣었다면 입력창 아래에 "무료 모델은 공급자가 대화를 기록할 수 있어요. 개인 정보는 넣지 마세요."가 보여요.

하루 한도는 서비스 전체에서 답 200번이에요. 한국 시각 0시에 다시 세요. 한도가 차면 답 자리에 "오늘 쓸 수 있는 사용량을 다 썼어요. 내일 다시 쓸 수 있어요."가 나와요.

괜찮으면 `확인했어`라고 보내세요.

<details>
<summary>막히면</summary>

- **보내자마자 "오늘 쓸 수 있는 사용량을 다 썼어요"가 나와요**: 그날 200번을 다 썼거나, Kilo의 무료 한도에 걸렸을 때예요. 내일 다시 해 보세요. 오늘 처음 보냈는데도 나오면 `한도 안내가 바로 나와. 오늘 답 수를 세는 곳과 Kilo 오류를 구분하는 곳을 확인해줘`라고 보내세요.
- **답이 오지 않거나 계속 모의 응답이에요**: `.env`의 키 줄에 오타나 빈칸이 없는지 보세요. 개발 서버를 다시 켜야 키를 읽어요. 그래도 안 되면 `Kilo 답이 안 와. features.md "함정 모음"대로 chat 방식으로 부르는지 확인해줘`라고 보내세요.
- **멈췄는데 답이 저장되지 않아요**: `멈춘 답이 저장되지 않아. features.md "중지"대로 사용량 집계를 기다리지 말고 바로 저장해줘`라고 보내세요.
- **대화창에 키를 붙여 넣었어요**: Kilo에서 그 키를 지우고 새로 만들어 `.env`에 넣으세요.
- **프리셋 팩을 못 찾거나, 앞 장 작업을 이어서 하려 하거나, 중간에 멈췄어요**: [5장의 막히면](https://prokit-web.vercel.app/tutorials/claudle/auth-chats/#3-직접-써-보고-확인하기)과 같아요.
- 그 밖의 문제는 [막혔을 때](https://prokit-web.vercel.app/tutorials/reference/troubleshooting/)를 보세요.

</details>

## 에이전트가 물어보면

5장처럼 [라운드](https://prokit-web.vercel.app/tutorials/reference/glossary/#만들기)(기능 하나를 만들거나 요청한 것을 고치고 확인까지 마치는 작업 묶음) 하나로 진행되고, 끝에 직접 써 보고 확인해 달라고 해요. [4장](https://prokit-web.vercel.app/tutorials/claudle/screens/#에이전트가-물어보면)과 [5장](https://prokit-web.vercel.app/tutorials/claudle/auth-chats/#에이전트가-물어보면) 표의 질문(디자인 점수, 스킬 업데이트 등)도 나올 수 있어요. 선택지 창에서 답하는 법은 [질문에 답하는 법](https://prokit-web.vercel.app/tutorials/reference/claude-code-and-codex/#질문에-답하는-법)에 있어요.

| 질문 | 답 |
|---|---|
| 키 값을 알려 달라 | 알려 주지 않아요. `키는 내가 .env에 직접 넣었어`라고 답해요 |
| 유료 모델이나 다른 공급자를 쓸지 | `무료 모델만 써줘` |
| 스펙을 확인해 달라 | 읽어 보고 `좋아, 진행해줘` 또는 고칠 곳 |
| 직접 써 보고 확인해 달라 | 질문을 보내 보고 한 번 멈춰 본 뒤 `확인했어` 또는 고칠 곳 |

다음: [8장. 대화 검색](https://prokit-web.vercel.app/tutorials/claudle/search/)
