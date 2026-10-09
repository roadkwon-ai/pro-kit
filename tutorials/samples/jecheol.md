# 제철상자

제철 농산물 정기배송 서비스예요. 전국 산지 농가에서 그 주에 가장 맛있는 제철 채소와 과일을 골라 2주마다 상자로 보내 줘요. 상자마다 농부 이야기와 레시피 카드가 들어가요. 첫 화면 문구는 "지금 사과가 제일 맛있어요"예요.

![제철상자 첫 화면](assets/jecheol-home-desktop.webp)

[프리셋 사이트 열기](https://roadkwon-ai.github.io/pro-kit/jecheol/) · [프로킷 사이트에서 모든 페이지 보기](https://prokit-web.vercel.app/work/jecheol/)

| 항목 | 내용 |
|---|---|
| 페이지 | <!-- v:preset.jecheol.pages -->21<!-- /v -->개: 첫 화면, 이번 상자, 농부 이야기, 농부 상세 4개, 레시피 카드, 레시피 상세 4개, 첫 상자 주문, 로그인, 내 구독, 배송지, 주문 내역, 구독 해지, 고객센터, 이용약관, 개인정보처리방침 |
| 스타일 | <!-- v:preset.jecheol.design.src1 -->Refero Styles<!-- /v -->의 [<!-- v:preset.jecheol.design.rec1 -->Oakâme<!-- /v -->](https://styles.refero.design/style/a6791bc8-c49d-4e7a-a09d-877afcd04c25) |
| 대표 색 | <!-- v:preset.jecheol.design.color -->사과 빨강<!-- /v --> <!-- v:preset.jecheol.design.hexCode -->`#ba2b28`<!-- /v --> |
| 서체 | 제목 Wanted Sans, 본문 Pretendard |
| AI로 그린 그림 | <!-- v:preset.jecheol.design.images -->32<!-- /v -->장 |
| 검사 | 버튼과 링크 <!-- v:preset.jecheol.design.clicks -->121<!-- /v -->번 눌러 봄. 없는 페이지 0, 콘솔 오류 0 |

## 프리셋 팩으로 만들어 보기

<!-- b:preset-pack name=jecheol -->
작업 폴더 `~/projects`에서 연 에이전트에 이 프롬프트를 보내면 제철상자 프리셋과 같은 서비스를 만들어요. [프리셋 팩](https://github.com/roadkwon-ai/pro-kit-packs/releases/tag/pack-jecheol)의 화면 구성, 디자인, 예시 데이터, 그림을 그대로 써서 AI 그림을 새로 그리지 않아요. `[ ]` 안의 이름만 바꾸면 이름만 다른 서비스가 나와요. 팩을 써도 AI가 만들기 때문에 100% 똑같지는 않을 수 있어요.

```prompt
https://github.com/roadkwon-ai/pro-kit 을 이 폴더에 받고, 그 안의 AGENTS.md대로 화면만 만들 프로젝트를 pro-kit 옆에 [jecheol] 폴더로 만들어줘.
DB는 쓰지 않아. 없는 준비물은 설치해줘.
옆 폴더 pro-kit의 packs/jecheol에 프리셋 팩을 받아줘.
그 팩대로 제철상자 프리셋과 똑같은 서비스를 만들 거야. 이름은 [제철상자].
팩의 README.md 순서대로 하고, 팩은 고치지 마. 이름을 바꿨으면 팩의 이름 대신 내가 정한 이름을 써.
디자인, 화면 구성, 그림은 팩에 있는 것을 써. 스타일 추천, 시안, 새 그림은 만들지 마.
모든 페이지를 팩의 스크린샷과 같게 만들고, 다 만들면 HTML 파일로 내보내줘.
```

> [!IMPORTANT]
> **프롬프트만 보내면 에이전트가 이 프리셋 팩을 자동으로 받아 설치해요. 따로 받지 않아도 돼요.**
>
> 직접 받으려면 [jecheol-pack.zip](https://github.com/roadkwon-ai/pro-kit-packs/releases/download/pack-jecheol/jecheol-pack.zip)(18.2MB, [릴리스](https://github.com/roadkwon-ai/pro-kit-packs/releases/tag/pack-jecheol))을 받고, 프롬프트 끝에 `프리셋 팩 zip은 [~/Downloads/jecheol-pack.zip]에 받아 뒀어.` 한 줄을 더하세요. 에이전트가 그 zip이 최신 판인지 확인하고, 옛 판이면 새로 받아요.
<!-- /b -->

<!-- b:preset-next-steps -->
에이전트를 아직 열지 않았으면 [1. 작업 폴더에서 에이전트 열기](README.md#1-작업-폴더에서-에이전트-열기)부터 하세요. 프롬프트를 보낸 다음에는 [3. 알려 준 한 줄로 이어 가기](README.md#3-알려-준-한-줄로-이어-가기)와 [4. 답하며 요청을 자세히 채우기](README.md#4-답하며-요청을-자세히-채우기)를 따라가면 돼요.
<!-- /b -->

<details>
<summary>막히면</summary>

<!-- b:trouble-pack name=jecheol -->
- **프리셋 팩을 못 찾는대요**: `프리셋 팩은 옆 폴더 pro-kit의 packs/jecheol에 있어. 없으면 pro-kit 폴더에서 node scripts/pack.mjs jecheol 명령으로 받아줘`라고 보내세요. pro-kit 폴더가 2026-10-08 전에 받은 것이라 팩 받기가 멈추면 `그 폴더 이름을 pro-kit-old로 바꾸고 새로 받아줘`라고 보내세요.
<!-- /b -->

</details>

## 프리셋 팩으로 나만의 서비스 만들기

<!-- b:preset-remix name=jecheol folder=sea-box title="제철바다" changes="상품은 제철 수산물, 대표 색은 바다 파랑" topic="주제는 제철 수산물 정기배송" -->
제철상자의 [프리셋 팩](https://github.com/roadkwon-ai/pro-kit-packs/releases/tag/pack-jecheol)을 바탕으로 이름, 색, 페이지, 주제를 바꿔 나만의 서비스를 만들어요. 화면 구성과 디자인이 정해져 있어서 처음부터 만들 때보다 빠르고, 맞지 않는 그림만 같은 화풍으로 다시 그려요.

```prompt
https://github.com/roadkwon-ai/pro-kit 을 이 폴더에 받고, 그 안의 AGENTS.md대로 화면만 만들 프로젝트를 pro-kit 옆에 [sea-box] 폴더로 만들어줘.
DB는 쓰지 않아. 없는 준비물은 설치해줘.
옆 폴더 pro-kit의 packs/jecheol에 프리셋 팩을 받아줘.
그 팩을 바탕으로 나만의 서비스를 만들 거야. 이름은 [제철바다].
바꿀 것: [상품은 제철 수산물, 대표 색은 바다 파랑]
팩의 README.md와 CUSTOMIZE.md를 보고, 바꾸는 것에 맞춰 다시 할 일만 해줘. 다시 그릴 그림은 팩의 prompts.json을 고쳐 같은 화풍으로 그려줘.
팩은 고치지 말고, 바꾸지 않는 것은 팩대로 해. 다 만들면 HTML 파일로 내보내줘.
```

`바꿀 것`에는 이렇게 적어요.
- 색이나 서체: `대표 색은 짙은 파랑, 제목 서체는 더 둥글게`
- 페이지: `[페이지 이름] 페이지는 빼줘` 또는 `[페이지 이름] 페이지를 더해줘`
- 주제: `주제는 제철 수산물 정기배송`

무엇을 바꾸면 무엇을 다시 하는지는 팩의 `CUSTOMIZE.md`에 있어요. **그림을 다시 그리려면 이미지를 그릴 수 있는 에이전트가 필요해요**([이미지 그리기](../reference/costs-and-keys.md#이미지-그리기)). 그릴 수 없으면 원래 그림을 그대로 써요.

팩 zip을 미리 받아 두었다면 [프리셋 팩으로 만들어 보기](#프리셋-팩으로-만들어-보기)처럼 이 프롬프트 끝에도 zip 경로 한 줄을 더하세요.
<!-- /b -->

## 이 컨셉으로 처음부터 만들기

<!-- b:preset-scratch-intro -->
작업 폴더 `~/projects`에서 연 에이전트에 이 프롬프트를 그대로 보내면 **바로** 시작돼요. [가장 쉬운 방법](README.md#가장-쉬운-방법)의 프롬프트와 같고, `[ ]` 안만 이 프리셋의 폴더 이름과 컨셉이에요. 원하는 대로 바꿔도 돼요.
<!-- /b -->

<!-- b:screen-prompt folder=jecheol concept="1~2인 가구 직장인이 제철 채소와 과일을 2주마다 상자로 받아 보고, 건너뛰기와 해지도 쉽게 할 수 있는 정기배송 서비스" -->
```prompt
https://github.com/roadkwon-ai/pro-kit 을 이 폴더에 받고, 그 안의 AGENTS.md대로 화면만 만들 프로젝트를 pro-kit 옆에 [jecheol] 폴더로 만들어줘.
DB는 쓰지 않아. 없는 준비물은 설치해줘.
[1~2인 가구 직장인이 제철 채소와 과일을 2주마다 상자로 받아 보고, 건너뛰기와 해지도 쉽게 할 수 있는 정기배송 서비스]를 만들고 싶어.
필요한 화면을 모두 예시 데이터로 만들어줘. 로그인이나 저장 같은 기능은 빼고 화면만 만들어.
디자인 스타일은 서비스에 어울리는 걸로 추천해주고, 다 만들면 HTML 파일로 내보내줘.
```
<!-- /b -->

<!-- b:preset-scratch-note -->
**같은 컨셉이라도 이름, 스타일, 화면은 매번 다르게 나와요.** 프리셋에 가깝게 만들려면 [프리셋 팩으로 만들어 보기](#프리셋-팩으로-만들어-보기)를 쓰세요.
<!-- /b -->

<!-- b:preset-next-steps -->
에이전트를 아직 열지 않았으면 [1. 작업 폴더에서 에이전트 열기](README.md#1-작업-폴더에서-에이전트-열기)부터 하세요. 프롬프트를 보낸 다음에는 [3. 알려 준 한 줄로 이어 가기](README.md#3-알려-준-한-줄로-이어-가기)와 [4. 답하며 요청을 자세히 채우기](README.md#4-답하며-요청을-자세히-채우기)를 따라가면 돼요.
<!-- /b -->

## 시간과 비용

<!-- b:preset-time-line name=jecheol -->
위 "프리셋 팩으로 만들어 보기" 프롬프트로 만들 때 **한 번에 완성하면 약 2시간\~4시간(여러 번 고쳐 달라고 하면 약 6시간까지)** 걸리고, 토큰은 최소 **약 280만**(캐시 포함 약 1.4억)이 들어요. 팩 없이 [이 컨셉으로 처음부터](#이-컨셉으로-처음부터-만들기) 만들 때는 한 번에 완성하면 약 2시간 55분\~5시간 50분(여러 번 고쳐 달라고 하면 약 8시간 45분까지) 걸리고, 토큰은 최소 약 410만이 들어요.
<!-- /b -->

<!-- b:revise-time-detail -->
<details>
<summary>자세히 보기: 고쳐 달라고 하면 왜 늘어날까요</summary>

| 과정 | 하는 일 | 더 드는 시간 |
|---|---|---|
| 고치기 | 요청을 읽고 고칠 곳을 찾아 고쳐요 | 약 2\~12분 |
| 검사 | 타입 검사, 포맷, 빌드 | 약 1\~3분 |
| 모든 페이지 다시 확인 | 고친 부품이 다른 페이지를 깨지 않았는지 봐요 | 13쪽 약 5분, 203쪽 약 6\~37분 |
| 리뷰 에이전트 | 크게 고쳤으면 고친 코드를 한 번 더 검토해요 | 약 4\~10분 |
| 마무리 | 기록, 검사, 커밋. 마지막에 한 번만 해요 | 약 1\~15분 |

**한 군데를 고치면 약 10분, 두 군데면 약 28\~43분이 더 들어요.** 마무리 검토(디자인 리뷰, 리뷰 에이전트, 모든 페이지 다시 확인)를 한 번 더 하면 2\~3시간이 더 들어요. 프리셋을 만들 때 잰 값이고, 내가 결과를 보고 확인하는 시간은 따로예요. [고쳐 달라고 할 때마다 더 드는 시간](../reference/process-and-time.md#고쳐-달라고-할-때마다-더-드는-시간)

</details>
<!-- /b -->

<!-- b:limit-line name=jecheol -->
Claude Pro · ChatGPT Plus(Codex): 가능 (5시간 한도에 약 1번 걸려요) · [5시간 한도란?](../reference/costs-and-keys.md#5시간-한도에-걸리면)
<!-- /b -->

<!-- b:cost-note -->
시간의 앞 숫자와 토큰은 순조롭게 한 번에 끝날 때의 최솟값이에요. 토큰도 시간처럼 쓰는 AI와 고쳐 달라는 횟수에 따라 2~3배까지 늘 수 있어요. [읽는 법](../reference/costs-and-keys.md#시간과-비용-읽는-법) · [실제로 걸린 시간 자세히](../reference/process-and-time.md)
<!-- /b -->

<details>
<summary>단계별 예상</summary>

<!-- b:preset-stage-intro -->
칸마다 시간 · 토큰 · API 요금 환산이고, 순조롭게 한 번에 끝날 때의 최솟값이에요. 합계의 시간에만 한 번에 완성할 때의 범위와 여러 번 고칠 때를 붙였어요.
<!-- /b -->

| 단계 | 프리셋 팩으로 | 처음부터(내 컨셉으로) |
|---|---|---|
| 준비: pro-kit 받기, 프로젝트 만들기 | <!-- v:cost.stage.setup.time -->5분<!-- /v --> · <!-- v:cost.tokens.1 -->5.5만<!-- /v --> · 1달러 | <!-- v:cost.stage.setup.time -->5분<!-- /v --> · <!-- v:cost.tokens.1 -->5.5만<!-- /v --> · 1달러 |
| 기획: 서비스 질문, 이름, 사이트맵 | <!-- v:cost.stage.plan.pack.time -->5분<!-- /v --> · <!-- v:cost.tokens.1.5 -->8.3만<!-- /v --> · 2달러 | <!-- v:cost.stage.plan.scratch.time -->10분<!-- /v --> · <!-- v:cost.tokens.3 -->17만<!-- /v --> · 3달러 |
| 디자인: DESIGN.md (처음부터는 스타일 추천 1~3위 포함) | <!-- v:cost.stage.design.pack.time -->5분<!-- /v --> · <!-- v:cost.tokens.2 -->11만<!-- /v --> · 2달러 | <!-- v:cost.stage.design.scratch.time -->8분<!-- /v --> · <!-- v:cost.tokens.3.5 -->19만<!-- /v --> · 4달러 |
| 화면 구성 | 팩의 스크린샷을 따라요 | 시안 3장 <!-- v:cost.stage.mockup.time -->10분<!-- /v --> · <!-- v:cost.tokens.3 -->17만<!-- /v --> · 3달러 |
| 그림 <!-- v:preset.jecheol.design.images -->32<!-- /v -->장 | 팩에서 받기 <!-- v:cost.stage.packImages.time -->1분<!-- /v --> | <!-- v:preset.jecheol.stages.images.time -->16분<!-- /v --> · 53만 · 10달러 |
| 첫 화면 | <!-- v:cost.stage.first.pack.time -->10분<!-- /v --> · <!-- v:cost.tokens.4 -->22만<!-- /v --> · 4달러 | <!-- v:cost.stage.first.scratch.time -->15분<!-- /v --> · <!-- v:cost.tokens.6 -->33만<!-- /v --> · 6달러 |
| 나머지 페이지 <!-- v:preset.jecheol.pages.rest -->20<!-- /v -->개 | <!-- v:preset.jecheol.stages.rest.pack.time -->1시간 20분<!-- /v --> · <!-- v:cost.tokens.35 -->190만<!-- /v --> · 35달러 | <!-- v:preset.jecheol.stages.rest.scratch.time -->1시간 40분<!-- /v --> · <!-- v:cost.tokens.40 -->220만<!-- /v --> · 40달러 |
| 검사와 디자인 리뷰 | <!-- v:preset.jecheol.stages.check.time -->11분<!-- /v --> · 34만 · 6달러 | <!-- v:preset.jecheol.stages.check.time -->11분<!-- /v --> · 34만 · 6달러 |
| HTML 내보내기 | <!-- v:cost.stage.export.time -->2분<!-- /v --> · <!-- v:cost.tokens.0.5 -->2.8만<!-- /v --> · 1달러 미만 | <!-- v:cost.stage.export.time -->2분<!-- /v --> · <!-- v:cost.tokens.0.5 -->2.8만<!-- /v --> · 1달러 미만 |
| (선택) GitHub Pages 배포 | <!-- v:cost.stage.pages.time -->5분<!-- /v --> · <!-- v:cost.tokens.1 -->5.5만<!-- /v --> · 1달러 | <!-- v:cost.stage.pages.time -->5분<!-- /v --> · <!-- v:cost.tokens.1 -->5.5만<!-- /v --> · 1달러 |
| 합계(배포 빼고) | <!-- v:preset.jecheol.pack.time.cell -->약 2시간\~4시간 (여러 번 고치면 약 6시간까지)<!-- /v --> · 약 <!-- v:preset.jecheol.pack.tokens -->280만<!-- /v -->(캐시 포함 약 <!-- v:preset.jecheol.pack.cached -->1.4억<!-- /v -->) · 약 <!-- v:preset.jecheol.pack.usd -->50<!-- /v -->달러 | <!-- v:preset.jecheol.scratch.time.cell -->약 2시간 55분\~5시간 50분 (여러 번 고치면 약 8시간 45분까지)<!-- /v --> · 약 <!-- v:preset.jecheol.scratch.tokens -->410만<!-- /v -->(캐시 포함 약 <!-- v:preset.jecheol.scratch.cached -->2.1억<!-- /v -->) · 약 <!-- v:preset.jecheol.scratch.usd -->75<!-- /v -->달러 |

<!-- b:preset-cost-detail -->
프리셋 팩으로 나만의 서비스를 만들면 다시 그리는 그림 장당 약 30초, 약 1.7만 토큰이 더 들어요. 주제를 바꾸면 기획에 5분, 약 8.3만 토큰이 더 들어요.

모두 실제로 잰 단위값으로 어림한 예상이에요. 시안과 AI 그림을 OpenAI API 키로 그리면 이미지 요금이 따로 들어요. ChatGPT 요금제로 그리면 그 사용량 안이에요.
<!-- /b -->

</details>

<details>
<summary>만든 사람이 실제로 쓴 값</summary>

<!-- b:preset-actual-line name=jecheol -->
제철상자 프리셋을 만들 때는 첫 화면 리디자인과 모든 페이지로 넓히기에 약 3시간 25분, 약 830만 토큰(캐시 포함 약 4.1억, API 요금 환산 약 150달러)이 들었어요. **사이트에 실으려고 다시 디자인하고 다듬은 값이라 위 예상보다 커요.** 버린 첫 초안과 나중의 문구 바꾸기는 넣지 않았어요.
<!-- /b -->

</details>

## 실제로 거친 과정

제철상자는 한 번에 나오지 않았어요. 결과를 보고 몇 번 다시 요청했어요.

| 단계 | 한 일 | 결과 |
|---|---|---|
| 1. 기획 | 서비스 설명(`PRODUCT.md`)과 첫 화면 설계를 미리 적었어요. 스타일과 색은 적지 않았어요. 원하는 인상만 "계절 잡지"라고 적었어요 | 이름은 제철상자 |
| 2. 첫 판 | 추천 후보(Fable, Monocle, sweetgreen)와 직접 정하기 중 1위 Fable을 고르고 대표 색을 가을 붉은빛으로 바꿨어요 | 디자인 리뷰 22/28 |
| 3. 리디자인 | "제목 서체가 가늘고 평범하고, 농산물 그림이 클립아트 같아서 싸 보여"라고 [다시 요청](refine.md#스타일과-색)했어요. 추천 1~3위(<!-- v:preset.jecheol.design.rec1 -->Oakâme<!-- /v -->, <!-- v:preset.jecheol.design.rec2 -->Telescope<!-- /v -->, <!-- v:preset.jecheol.design.rec3 -->Hungry Tiger<!-- /v -->) 중 1위 <!-- v:preset.jecheol.design.rec1 -->Oakâme<!-- /v -->를 골랐어요. Oakâme에는 대표 색이 없어서 첫 판의 사과 빨강 `#ba2b28`을 더했어요. 시안 3장 중 Oakâme 시안을 그대로 골랐어요 | 시안을 따라 첫 화면 완성 |
| 4. 넓히기 | 첫 화면 하나를 모든 페이지를 갖춘 사이트로 넓혔어요. 사이트맵과 페이지별 시안 16장을 확인하고, 에이전트가 미리 정한 내용(토요일 배송 선택지, 농부 한 명과 레시피 하나 추가)도 그대로 받아들였어요. 첫 화면 문구 "지금 사과가 제일 맛있어요"는 이 요청에서 정해 줬어요. 주소 찾기 창, 건너뛰기 확인 창, 구독 해지 흐름까지 동작해요 | 페이지 <!-- v:preset.jecheol.pages -->21<!-- /v -->개 |
| 5. 마무리 | 링크·버튼 검사, 디자인 리뷰, 다듬기. 손가락이 엉킨 사진 등 4장을 다시 만들었어요 | 디자인 리뷰 <!-- v:preset.jecheol.design.critique -->35<!-- /v -->/40 |

![제철상자 휴대폰 첫 화면](assets/jecheol-home-mobile.webp)

## 실제 서비스로 만들 때

제철상자는 정기결제, 주소 검색, 메일·문자 알림까지 외부 서비스가 세 종류 필요하고, 그중 2주마다 자동으로 돈이 빠지는 정기결제가 가장 까다로워요.

<!-- b:preset-real-service -->
바꾸는 순서는 [실제 서비스로 만들기](real-service.md)를 따르고, **기능은 아래 요청을 하나씩 보내세요.**
<!-- /b -->

**필요한 데이터**: 구독(상자 크기, 받는 요일, 첫 상자를 받은 날, 건너뛴 회차, 빼고 싶은 품목, 상태), 배송지(주소, 상세 주소, 받는 분, 연락처, 공동현관 출입 방법, 메모), 결제 수단(카드 번호 대신 결제 서비스가 주는 자동결제용 열쇠, 빌링키), 주문(받는 날, 회차, 금액, 상태), 이번 상자·농부·레시피(모두에게 공개)

**지킬 규칙**: 회원은 자기 구독과 배송지, 주문만 봐요. 받는 날 이틀 전 자정(목요일 상자는 화요일, 토요일 상자는 목요일)이 건너뛰기, 크기·요일 바꾸기, 해지의 마감이에요. 마감이 지난 상자는 바꿀 수 없어요. 카드 번호는 저장하지 않아요.

```prompt
구독, 배송지, 주문을 DB에 저장하게 해줘. 회원은 자기 데이터만 볼 수 있어야 해.
```

```prompt
주문 화면에서 상자 크기, 받는 요일, 배송지를 고르면 구독이 만들어지게 해줘. 결제는 결제 서비스의 테스트 모드로 하고, 카드 번호는 저장하지 말고 빌링키만 저장해줘.
```

```prompt
배송지를 입력할 때 주소 검색 서비스로 주소를 찾아서 채우게 해줘.
```

```prompt
내 구독 화면의 건너뛰기를 저장하고, 받는 날 이틀 전 자정이 지난 상자는 건너뛰기와 요일 바꾸기가 안 되게 해줘. 마감 시각은 서버에서 계산해줘.
```

```prompt
마감 시각이 지나면 저장해 둔 빌링키로 건너뛰지 않은 상자의 금액을 결제하고, 결제가 되면 주문 내역에 넣어줘.
```

```prompt
결제가 되거나 상자를 건너뛰면 메일과 문자로 알려줘.
```

> [!TIP]
> 제철상자 프리셋은 화면만 만들 때 이미 회차와 마감 날짜를 계산하는 코드(`apps/web/src/lib/store.ts`의 `slots`)와 그 확인 파일(`apps/web/src/lib/schedule.check.ts`)을 만들어 두었어요. 내 프로젝트에도 비슷한 계산 코드가 있으면 새로 만들지 말고 그대로 쓰자고 하세요.

정기결제에는 결제 대행 서비스(PG)의 계정과 정기결제 사용 승인, API 키가 필요해요. 주소 검색은 주소 검색 서비스의 키, 메일은 메일 발송 서비스 계정, 문자는 문자 발송 서비스 계정과 등록한 발신번호가 필요해요. 처음에는 결제를 테스트 모드로 두고, 알림은 메일부터 붙여 보세요.
