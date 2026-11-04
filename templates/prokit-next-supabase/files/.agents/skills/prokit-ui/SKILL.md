---
name: prokit-ui
description: >-
  이 Better-T-Stack 프로젝트의 화면 모양과 사용자 경험을 기획하고 설계하고 구현하고 리뷰할 때 사용한다. 새 화면과
  페이지 디자인, 사이트맵과 페이지 구성, 링크·버튼 동작, 모달·툴팁·햄버거 메뉴·사이드바 같은 상호작용,
  리디자인, 레이아웃, 타이포, 색, 간격, 빈 상태와 온보딩, UX 문구, 서비스 이름과 헤드라인 후보, 반응형,
  접근성, 디자인 리뷰와 폴리시, 디자인 토큰과 DESIGN.md, 디자인 스타일 고르기를 다룬다. 화면 만들어줘, 디자인,
  예쁘게, UI 개선, UX, 디자인 리뷰, 접근성 점검, polish, 토스처럼·당근 스타일로, taste로, hallmark로, 랜딩, 레퍼런스대로,
  애니메이션, 화면 비평 같은 요청에 사용하며 고른 UI 스킬(impeccable, hallmark)의 단계 지도와 설치한 화면 디자인 보조의 guide로 진행한다. 데이터
  패칭, 라우팅, 렌더링 경계 같은 동작 문제는 다루지 않는다.
---

# UI/UX

## 위임
디자인·접근성 전문 스킬이나 수행자를 쓸 때만 [위임과 전문 스킬 프로토콜](../prokit-dev-cycle/references/delegation.md)을 읽는다. 실제 접근 가능한 provider의 범위와 side effect를 확인하고, 사이트맵·상호작용·오류 예산 계약은 유지한다.

병렬 작업, UI 소비자 회귀 검사와 기존 review coverage 재사용은 [실행 효율과 재검증](../prokit-dev-cycle/references/execution-efficiency.md)을 따른다. UI 스킬의 리뷰·감사(impeccable `critique`·`audit`, hallmark 마감 리뷰)는 메인 세션에서만 한다.

정본은 `PRODUCT.md`(제품 맥락)와 `DESIGN.md`(시각 시스템)다. 토큰은 `packages/ui/src/styles/globals.css`, 컴포넌트는 `packages/ui/src/components`(shadcn)에 있다.

## UI 스킬
고른 UI 스킬은 `.dev-cycle.json`의 `uiSkill`이다(하나면 문자열, 여럿이면 배열이고 첫 값이 주 UI 스킬이다. 기록이 없으면 `impeccable`). 디자인 단계(맥락, 기획, 시각 방향, 설계, 리뷰, 감사, 마감, 정본 갱신)는 주 UI 스킬의 지도를 따른다.

| 주 UI 스킬 | 지도 |
|---|---|
| `impeccable` | [references/impeccable-map.md](references/impeccable-map.md) |
| `hallmark` | [references/hallmark-map.md](references/hallmark-map.md) |
| 그 밖에 더한 UI 스킬 | `references/<이름>-map.md`(더하는 법은 `prokit-skills-manage` "카탈로그에 없는 두뇌·UI 스킬 더하기") |
| `none`(기본 AI) | [references/none-map.md](references/none-map.md). `frontend-design`과 [게슈탈트 지침](references/gestalt.md)으로 한다 |

스킬과 상관없는 절차(`PRODUCT.md`, 디자인 카탈로그, 리디자인, 사이트맵과 상호작용, 이름과 문구, 시각 자산, DESIGN.md 검사)는 [references/design-flow.md](references/design-flow.md)다. 두 번째 이후 UI 스킬은 사용자가 그 화면에 그 스킬을 지목했을 때만 쓴다("hallmark로", "impeccable로"). 그 화면도 대조표 단계와 증거는 주 UI 스킬 지도를 따르고, 지목한 스킬의 검사는 더하는 검사이지 대신하지 않는다. 고르지 않은 UI 스킬은 전역에 있어도 쓰지 않는다. 바꾸는 일은 `prokit-skills-manage`가 `pnpm skills:setup --ui-skill <이름>[,<이름>]|none`으로 한다.

UI 스킬을 바꾸거나 빼도 `PRODUCT.md`, `DESIGN.md`(명세 형식), `docs/briefs/`, globals.css 토큰은 그대로 이어진다. 어느 스킬에도 묶이지 않은 정본이라 새 주 UI 스킬이나 기본 AI가 이어 쓴다. 새 스킬로 시각 방향을 다시 고르거나 테마를 다시 배정하지 않는다(사용자가 리디자인을 요청할 때만). 이전 스킬의 작업 기록(`.impeccable/`, `.hallmark/` 등)은 지우지 않고 새 스킬의 근거로도 쓰지 않는다. 스킬이 스스로 등록한 훅(impeccable `hooks on`)은 `pnpm skills:setup`이 그 스킬을 지울 때 함께 뺀다.

## 화면 디자인 보조
선택 묶음 가운데 `skills.manifest.json`의 항목에 `guide`가 있는 묶음이 화면 디자인 보조다. 설치 상태는 `pnpm skills:check`의 `선택 스킬:` 줄로 본다. 보조는 주 UI 스킬을 대신하지 않고 그 단계에 더한다. 쓰기 전에 그 묶음의 `guide` 파일을 읽고 그 단계 대응을 따른다(스킬 자체의 순서가 아니다). 고르는 기준과 추천 조합은 `prokit-dev-cycle`의 `references/brains/README.md` "화면 디자인 보조"다.

| 묶음 | 종류 | 언제 쓰나 | guide |
|---|---|---|---|
| `landing` | 방향 | 행동 하나를 이끄는 랜딩·가입·가격 화면 | [addon-landing.md](references/addon-landing.md) |
| `tastemaker` | 방향 | 사용자가 레퍼런스 이미지·화면을 준 화면, 고정한 스타일을 이어 쓰는 새 화면 | [addon-tastemaker.md](references/addon-tastemaker.md) |
| `taste` | 방향 | "taste로"라고 했거나 스타일 질문에서 taste 방향을 고른 화면 | [taste.md](references/taste.md) |
| `web-design-engineer` | 원칙 | 스타일 레시피를 지목한 화면("Linear처럼")의 방향, 설치되어 있으면 리뷰의 5개 차원 채점 | [addon-web-design-engineer.md](references/addon-web-design-engineer.md) |
| `awwwards` | 원칙 | 스크롤 스토리텔링·모션이 중심인 브랜드·쇼케이스 화면 | [addon-awwwards.md](references/addon-awwwards.md) |
| `animation` | 모션 | 설치되어 있으면 모션을 넣거나 고치는 화면, 요청한 모션 감사 | [addon-animation.md](references/addon-animation.md) |
| `visual-critique` | 검수 | 설치되어 있으면 디자인 리뷰마다(7개 차원 비평). 주 UI 스킬이 impeccable이면 요청할 때만 | [addon-visual-critique.md](references/addon-visual-critique.md) |
| `ui-design` | 검수 | 설치되어 있으면 브리프를 쓰는 화면마다(간격·타입·그리드 체계를 정하는 설계와 리뷰) | [addon-ui-design.md](references/addon-ui-design.md) |

- 방향 보조(위 표에서 종류가 방향인 보조와 방향으로 쓰는 `web-design-engineer`)는 한 화면에 하나만 쓴다. 방향 규칙이 서로 달라 함께 쓰면 서체·모션·구성이 엇갈린다. 원칙·모션·검수 보조는 함께 쓴다.
- 브리프에 `보조: <묶음>[, <묶음>]` 줄로 그 화면에 쓰는 보조를 모두 적는다. 위 표에서 "설치되어 있으면" 쓰는 모션·검수 보조도 이 화면의 설계·리뷰에 쓰면 넣는다(리뷰 단계는 이 줄을 보고 보조 절을 더한다). 종류가 검수인 보조(`visual-critique`, `ui-design`)는 설치되어 있으면 브리프를 쓰는 화면마다 넣는다(언제 쓰나 칸의 예외만 뺀다. `visual-critique`는 주 UI 스킬이 impeccable이면 요청할 때만). 주 UI 스킬의 리뷰가 비슷한 것을 봤다는 이유로 빼지 않는다. audit은 브리프 줄의 보조와 설치한 검수 보조마다 디자인 리뷰 행 증거에서 그 결과 문구나 `<보조> 미실행: 사유`를 찾고, 결과를 적은 보조는 이 라운드에 그 보조 스킬을 읽은 기록도 찾는다(읽지 않고 적은 결과는 받지 않는다). 방향 보조는 사용자가 지목했거나 화면 성격이 위 "언제 쓰나"에 맞을 때 넣고, 맞는 방향 보조가 둘이면 스타일 질문에서 고르게 한다.
- 우선순위는 프로젝트 규칙(`AGENTS.md`, 이 스킬의 규칙, `DESIGN.md`, 토큰) → 주 UI 스킬의 단계·증거·통과 기준 → 보조다. 보조의 검사와 점수는 더하는 것이고 주 UI 스킬의 리뷰·감사를 대신하지 않는다. 거꾸로 주 UI 스킬의 리뷰가 같은 차원을 봤어도 브리프에 적은 보조를 건너뛰지 않는다. 보조의 결과는 주 UI 스킬의 리뷰 보고서에 절을 따로 두어 함께 남긴다. 리뷰 보고서가 스킬이 만드는 기록(impeccable `.impeccable/critique/`)이면 보조 결과는 `tasks/evidence/ui-review-<YYYYMMDD-HHmm>.md`에 따로 두고 증거에 두 경로를 함께 적는다. 대조표 증거에는 주 UI 스킬의 결과를 먼저 적고 보조 결과는 guide의 문구 그대로 붙인다. audit은 증거의 `N FAIL`, `위반 N`, `N/M`을 주 UI 스킬의 결과로 읽으므로 보조 결과를 이 꼴로 쓰지 않는다.
- guide의 단계를 할 때는 그 칸이 가리키는 스킬 파일을 그 단계에서 읽는다. guide는 연결 지도라 요약만 보고 채점하거나 형식을 흉내 내지 않는다.
- guide가 토큰으로 옮긴다고 한 값은 `packages/ui/src/styles/globals.css`가 화면 계층이라 `prokit-ui-builder`에 맡겨 옮기고, `DESIGN.md`는 Main이 쓴다.
- 보조 스킬 다수가 UI 작업이면 스스로 불리게 쓰여 있다. 그 화면의 `보조:` 줄에 없는 보조가 불리면 그 절차를 따르지 않고 이 스킬의 흐름대로 한다.
- 보조 스킬은 Main이 읽는다. 개발 단계에서 따를 보조 스킬은 위임 지시에 `.agents/skills/<이름>/SKILL.md` 경로를 넣어 `prokit-ui-builder`가 읽게 한다.
- 카탈로그에 없는 보조를 더하는 일은 `prokit-skills-manage`의 "카탈로그에 없는 두뇌·UI 스킬 더하기"다(묶음 항목과 `guide` 파일 하나씩).

## 시작할 때마다
주 UI 스킬의 맥락 단계를 한 번 한다. impeccable은 프로젝트 루트에서 `.agents/skills/impeccable/scripts/impeccable context`를 실행한다(대상이 정해져 있으면 `--target <경로>`). hallmark는 `SKILL.md` 0단계 사전 점검을 한다. 다른 UI 스킬은 그 지도의 맥락 단계를 한다. UI 스킬이 없으면 `PRODUCT.md`, `DESIGN.md`, `.agents/skills/frontend-design/SKILL.md`를 읽는다. 출력의 지시를 따른다. 실행이 실패하면 `PRODUCT.md`와 `DESIGN.md`를 직접 읽고 없는 내용을 지어내지 않는다.

그다음 요청이 어느 쪽인지 정한다. 이 판정이 코드를 언제 쓸 수 있는지를 정한다.
- **새 작업**: 새 화면, 새 흐름, "새로 디자인", 리디자인, 화면 전체의 모양을 바꾸는 요청. 내용이 거의 없는 Better-T-Stack 기본 화면을 제품 화면으로 채우거나 다시 구성하는 요청도 새 작업이다.
- **좁은 개선**: 기존 화면(Better-T-Stack 기본 화면 포함)의 구성은 그대로 두고 간격, 문구, 상태 하나, 카드나 컴포넌트 하나를 고치거나 더하는 요청. 판단 기준은 요청의 범위이지 화면이 얼마나 비어 있는지가 아니다. 새 영역·섹션을 만들거나 카드·컴포넌트를 둘 이상 더하면 새 작업이다. 애매하면 새 작업으로 본다. 좁은 개선은 `PRODUCT.md`가 없어도 기획 단계 없이 진행한다. impeccable context 출력의 `SCOPED_EXISTING_ALLOWED`는 이 경우에만 해당한다.

완성 프리셋 팩이 제공되면 `prokit-pack-use`를 먼저 읽고 복원한 제품을 시각 기준으로 삼는다. 팩의 PRODUCT.md·DESIGN.md·사이트맵과 승인된 사용자 요청이 있으면 init·스타일 선택·브리프 재승인을 반복하지 않고 변경 범위만 기록한다. 레퍼런스 URL 조사·COPY와 공식 프리셋 제작은 별도 `pro-kit-preset-skills`의 `prokit-preset-create`가 담당한다. 해당 제작 스킬이 정한 명세로 기술 구현을 맡을 때도 시각 방향을 다시 고르지 않는다. 일반 서비스의 새 UI·접근성·반응형 구현은 이 스킬을 계속 따른다.

새 작업이면 코드보다 먼저 아래를 한다.
1. `PRODUCT.md`가 없으면(impeccable context가 `BUILD_INIT_REQUIRED`나 `PRODUCT_INIT_REQUIRED`처럼 init을 요구하면) 기획 단계부터 한다(impeccable `init`. 다른 UI 스킬이나 UI 스킬이 없으면 [design-flow.md](references/design-flow.md) "PRODUCT.md"). 기획은 사용자 인터뷰이므로 질문을 사용자에게 보낸다. <!-- edition:pro -->기존 프로젝트면 PRD, `docs/prokit/intake.md`, `docs/prokit/analysis.md`에서 찾은 답을 질문마다 초안으로 함께 보여 주고 확인받는다.<!-- /edition --><!-- edition:ui PRD에서 찾은 답을 질문마다 초안으로 함께 보여 주고 확인받는다. --> 찾지 못한 답은 지어내지 않는다.
2. **기존 프로젝트의 디자인 방향(한 번만)**: `.dev-cycle.json`의 `projectType`이 `early`·`operating`·`migration`이고 `docs/prokit/intake.md`의 "디자인 방향" 절에 답이 없으면(init이 남긴 괄호 안내 줄은 답이 아니다), 이어 갈 기존 디자인이 있는지 본다. 근거는 디자인 토큰·테마 파일, 디자인 시스템 문서, 프로토타입, 운영 화면이다(정밀 분석의 "디자인 자산" 절. migration은 `legacy.path`의 기존 화면). 근거가 없으면 묻지 않고 그 절에 `이어 갈 기존 디자인 없음`과 날짜를 적은 뒤 3번 스타일 고르기로 간다. 근거가 있으면 스타일을 고르게 하기 전에 먼저 묻는다: "지금 디자인(디자인 시스템, 화면)을 그대로 이어 갈까요, 다른 스타일로 리디자인할까요?" 선택지는 `기존 디자인 유지 (추천)`와 `리디자인`이다. 답과 날짜를 그 절에 적는다(파일이 없으면 `# 도입 기록`과 그 절만 만든다). <!-- edition:pro -->
   - 유지: 스타일 후보를 내지 않는다. `DESIGN.md`가 있으면 그것이 시각 세계다. 없으면 기존 디자인(운영 화면의 토큰과 컴포넌트, 디자인 시스템 문서, 프로토타입)을 분석해 `DESIGN.md`를 만든다([references/design-flow.md](references/design-flow.md) "기존 디자인으로 DESIGN.md 만들기"). <!-- edition:pro -->
   - 리디자인: 3번의 스타일 고르기와 design-flow "리디자인"을 따른다. <!-- edition:pro -->
   - `projectType`이 없거나 `new`면 이 질문을 하지 않는다. <!-- edition:pro -->
3. 새 프로젝트에서 `DESIGN.md`가 없고 화면이 아직 Better-T-Stack 기본 화면뿐이면, 또는 사용자가 시각 세계를 바꾸는 리디자인을 요청하<!-- edition:pro -->거나 2번에서 리디자인을 고르<!-- /edition -->면 디자인 스타일을 고르게 한다. 새 프로젝트에 이미 만든 화면이 있으면 `DESIGN.md`가 없어도 그 화면이 시각 세계이므로 묻지 않는다. 디자인 카탈로그에서 서비스에 맞는 스타일 1~3개를 추천 순위로 추리고, "카탈로그 없이 주 UI 스킬로 정하기"(hallmark는 테마 배정 셋. UI 스킬이 없으면 "카탈로그 없이 직접 정하기")를 함께 내놓는다. 방향 보조 묶음이 설치되어 있고 그 화면에 맞으면 그 선택지도 내놓는다(`taste`는 "taste-skill로 방향 뽑기", `tastemaker`는 "레퍼런스로 스타일 고정", `web-design-engineer`는 지목한 스타일 레시피. 위 "화면 디자인 보조"). 사용자가 브랜드를 지목했으면("토스처럼") 세 카탈로그에서 그 브랜드를 찾아 1위로 둔다. 없으면 지어내지 않고 "카탈로그에 없음"이라고 알린다. 절차는 [references/design-flow.md](references/design-flow.md)의 "디자인 카탈로그에서 고르기"를 따른다.
4. 사이트맵 `docs/briefs/site-map.md`를 먼저 쓰고, 주 UI 스킬의 설계 단계(impeccable `shape <기능>`, hallmark Shape와 Picks 블록)로 화면마다 브리프를 `docs/briefs/<화면>.md`에 쓴 뒤 사용자 확인을 요청한다. 사이트맵에는 화면에서 나가는 링크와 버튼이 모두 어디로 이어지는지 적는다. 브리프에는 상호작용(hover, 툴팁, 모달, 드로어, 햄버거 메뉴, 사이드바), 서체, 이미지, 아이콘, 모션 계획을 적는다(design-flow "사이트맵과 상호작용", "시각 자산"). 제품 이름이나 첫 화면 헤드라인을 새로 정해야 하면 후보를 함께 낸다(design-flow "이름과 문구"). 스타일 선택, 이름·문구 후보, 브리프 확인은 한 번에 묻는다.

리디자인이면 1번 전에 지금 화면을 데스크톱과 모바일로 찍고 주 UI 스킬의 리뷰 단계로 진단한다. 진단 결과와 약점은 브리프의 "버릴 것"에, 제품 사실·문구·기능은 "지킬 것"에 적는다. 옛 모양은 다듬을 출발점이 아니라 반례다(design-flow "리디자인").

이번 턴의 결과물은 init 질문, <!-- edition:pro -->디자인 방향 질문(기존 프로젝트), <!-- /edition -->스타일 후보, 브리프다. 여기서 멈춘다. 사용자 답을 받기 전에는 `PRODUCT.md`를 만들지 않는다. 추정으로 채운 `PRODUCT.md`가 있으면 UI 스킬이 기획을 끝난 것으로 보고 다음 세션에서 인터뷰를 건너뛴다. 사용자에게 물을 수 없는 환경이어도 가정으로 코드를 쓰지 않는다. 질문과 브리프 초안을 남기고 멈추는 것이 올바른 결과다.

## 컴포넌트와 토큰 재사용

브리프의 구현 경계를 정할 때 [재사용과 설정 설계](../prokit-dev-cycle/references/reuse-design.md)를 읽는다. 기존 `packages/ui` 프리미티브·토큰과 앱 컴포넌트의 실제 소비자를 확인하고 재사용·조합·분리 결정을 브리프나 계획에 남긴다. 겉모양이 비슷해도 책임·디자인·변경 이유가 다르면 합치지 않는다. 합성 API가 필요하면 `vercel-composition-patterns` 규칙을 따르고<!-- edition:pro -->(`prokit-web`의 연결)<!-- /edition -->, 프리미티브 추가는 아래 shadcn 절차를 유지한다.

## 단계
| 단계 | 할 일 | impeccable / hallmark |
|---|---|---|
| 기획 (프로젝트당 1회) | 새 작업을 시작할 때 `PRODUCT.md`가 없으면 먼저 만든다(좁은 개선은 기획 없이 진행) | `init` / 1단계 Ask once와 design-flow "PRODUCT.md" |
| 시각 방향 (1회, 리디자인 때 다시) | 첫 새 작업에서 시각 세계를 정한다. <!-- edition:pro -->기존 프로젝트는 디자인 방향 질문부터 하고, 유지면 기존 디자인으로 `DESIGN.md`를 만든다(카탈로그를 쓰지 않는다). <!-- /edition -->카탈로그 스타일을 고르면 받아서 `DESIGN.md`로 두고 그 세계로 만든다. 직접 정하면 만든 화면을 바탕으로 마감 때 `DESIGN.md`를 기록한다. 이때 시작 전에 `DESIGN.md`를 지어내지 않는다. Better-T-Stack 기본 shadcn 룩은 출발점일 뿐 정체성이 아니다 | 카탈로그: `use-design-md` → new-work. 직접: new-work → 마감에서 `document` / 카탈로그나 테마 배정(`theme.mjs deal`) → 마감에서 정본 갱신 |
| 설계 (새 화면과 흐름마다) | 코드 없이 사이트맵과 브리프를 만들고 사용자 확인을 받는다 | `shape <기능>` / Shape와 Picks 블록 |
| 시각 자산 (새 화면마다) | 구현 전에 브리프의 서체 파일을 받아 자체 호스팅한다. 이미지를 그릴 수 있으면(아래 규칙 "이미지 그리기") comp를 먼저 만들고 사진·일러스트는 plate 이미지로 만든다. 상세는 design-flow "시각 자산" | 이미지: comp-led new-work(`visualize`, `generate-image`) / 사진 목록(`theme.mjs photos`), 제품 화면 찍기(`capture.mjs`) |
| 개발 | 코드는 `prokit-ui-builder`가 쓴다(아래 "공식 스킬 연결"). 위임 지시에 브리프, `DESIGN.md`, 편집 직전에 읽을 주 UI 스킬의 파일(impeccable `reference/craft-floor.md`, hallmark `SKILL.md`의 "The Floor"와 고른 테마 파일), 이 칸의 단계 지시를 넣는다. 화면 전환과 공유 요소 애니메이션은 React `<ViewTransition>`으로 만든다. 선택 묶음 `motion`(`.agents/skills/vercel-react-view-transitions/`)이 있으면 그 `SKILL.md`를 읽고 따르고, 없으면 `pnpm skills:setup --optional motion`을 제안한다 | new-work, 브리프에 따라 필요할 때만 `layout`, `typeset`, `colorize`, `clarify`, `harden`, `onboard`, `adapt`, `animate` / 4단계 Load와 6단계 Build |
| 리뷰 | 주 UI 스킬의 리뷰·감사는 메인 세션에서 실행한다. 서브에이전트 안에서 실행하지 않는다. 코드 검사는 `prokit-reviewer`(ui)에 맡겨 `web-design-guidelines`로 하고 결과를 별도 절로 보고한다. 리뷰 기록은 지도대로 남기고(impeccable은 `.impeccable/critique/`, 기록을 남기지 않는 스킬은 `tasks/evidence/ui-review-<YYYYMMDD-HHmm>.md`), 감사와 `web-design-guidelines` 결과는 `tasks/evidence/ui-audit-<YYYYMMDD-HHmm>.md`에 저장해 대조표 증거에 결과와 경로를 적는다(`dev-cycle audit`이 이번 라운드 파일인지와 결과를 대조한다) | `critique`, `audit` / `sloplint`와 마감 리뷰, `audit <대상>`. 둘 다 + `web-design-guidelines` |
| 마감 | 고칠 것을 한 번에 모아 `prokit-ui-builder`에 맡겨 적용하고 재확인은 1회만 한다(Main은 화면 코드를 직접 고치지 않는다) | `polish` / Floor 고침, Reflex 고침이나 waive |
| 정본 갱신 | 토큰이나 컴포넌트가 바뀌었을 때. 덮어쓰기 전에 사용자에게 묻는다. 카탈로그에서 들여온 `DESIGN.md`는 덮어쓰지 않고 merge로 바뀐 토큰만 더한다. `DESIGN.md`를 쓰거나 고친 뒤에는 명세 lint로 확인한다(design-flow "DESIGN.md 검사") | `document` / lock 내용을 명세 형식으로 |

단계별 상세, B 케이스 행별 증거 예시, 통과 기준은 주 UI 스킬 지도(`references/<이름>-map.md`. [impeccable-map.md](references/impeccable-map.md), [hallmark-map.md](references/hallmark-map.md), 기본 AI는 [none-map.md](references/none-map.md))에 있다. 위 표의 오른쪽 칸은 impeccable과 hallmark 지도의 요약이다.

## UI 스킬이 없을 때
`uiSkill`이 `none`이면 외부 UI 스킬 없이 기본 AI가 [references/none-map.md](references/none-map.md)대로 디자인 단계를 한다. 시각 방향과 만드는 법은 `frontend-design`(`pnpm skills:setup --ui-skill none`이 설치한다), 화면을 진단하고 고치는 규칙은 [게슈탈트 지침](references/gestalt.md)이다. 단계와 대조표 행은 UI 스킬이 있을 때와 같다. 디자인 리뷰 행은 게슈탈트 점검 보고서(`게슈탈트 위반 N`)로, 디자인 감사 행은 `web-design-guidelines` 보고서(`위반 N`)로 채운다.

## 공식 스킬 연결
이 스킬은 Main이 화면 일을 정하고(주 UI 스킬의 단계, 브리프, `DESIGN.md`) 코드와 검사를 맡기고 검수할 때 쓴다. 맡는 에이전트가 있는 공식 스킬은 Main이 읽지 않는다. 위임 지시(packet)에 스킬 이름과 경로(`.agents/skills/<이름>/SKILL.md`)를 넣어 그 에이전트가 읽고 따르게 하고, 보고의 "읽은 스킬"과 스킬 기록으로 실제로 읽었는지 본 뒤 "Main 검수" 칸을 확인한다. 배치의 정본은 `skills.manifest.json`의 `performers`이고 바꾸는 일은 `prokit-skills-assign`이 맡는다.

| 상황 | 공식 스킬 | 맡는 에이전트 | Main 검수 |
|---|---|---|---|
| `packages/ui` 부품 조합·추가 | `shadcn` | `prokit-ui-builder`. 리뷰는 `prokit-reviewer`(code·ui) | 부품이 `packages/ui`에 있고 토큰만 쓰는지 |
| 컴포넌트와 훅 작성 | `vercel-react-best-practices` | `prokit-ui-builder`. 리뷰는 `prokit-reviewer`(code) | 보고의 규칙 이름이 바뀐 코드와 맞는지 |
| 화면 코드의 웹 인터페이스 지침 검사 | `web-design-guidelines` | `prokit-reviewer`(ui) | 위반 `file:line` 목록과 위반 수가 audit 보고서에 있는지 |
| 화면 확인, 스크린샷, 링크와 버튼 누르기 | `agent-browser`, `next-dev-loop`(절차는 `prokit-verify`) | `prokit-runtime-checker` | 페이지마다 확인 결과, 오류 예산 0, 스크린샷 경로 |
| 디자인 단계(맥락, 기획, 설계, 리뷰, 감사, 마감, 정본 갱신) | 주 UI 스킬(`impeccable`, `hallmark`) | Main(서브에이전트를 띄우고 기록을 남긴다) | 위 표의 기록 파일과 결과 |
| 디자인 카탈로그 받기, 이미지 그리기 | `use-design-md`, `gpt-image` | Main(사용자 선택과 생성 도구가 필요하다) | 고른 스타일, 생성 파일 경로 |

## 규칙
- 새 작업은 브리프가 확정되기 전에 코드를 쓰지 않는다. 좁은 개선만 브리프 없이 진행하고, 대조표에 `N/A: 좁은 개선(버튼 간격)`처럼 적는다.
- 리뷰만 요청받으면 코드를 고치지 않는다. 보고에는 주 UI 스킬의 리뷰·감사 결과(impeccable은 critique 점수와 P0~P3, audit 총점과 접근성 점수. hallmark는 `sloplint`의 FAIL·REFLEX·WARN 수와 마감 리뷰. UI 스킬이 없으면 게슈탈트 위반 수와 덩어리 수), `web-design-guidelines` 위반(`file:line`), 기록 파일과 보고서 경로를 넣는다. 독립 평가자를 띄울 수 없는 환경이면 축소 모드로 했다고 밝힌다.
- 고비용 최종 리뷰 전에는 evidence packet에서 현재 변경 범위와 필수 audit·a11y 평가 항목·소스 조건을 먼저 대조한다. 현재 변경 범위의 평가는 이전 점수로 대신하지 않고, 주관 시각 점수와 정본 audit/a11y 점수도 환산·혼용하지 않으며 누락한 증거만 보완해 통과한 검사를 반복하지 않는다.
- 링크와 버튼은 모두 실제 페이지나 실제 동작(모달, 드로어, 상태 바꾸기, 복사, 폼 제출 뒤 완료 화면)으로 이어진다. 404, "준비 중", `#`만 걸린 링크, 눌러도 반응이 없는 버튼을 두지 않는다. 이번에 만들지 않는 페이지로 가는 링크는 화면에 두지 않는다. 팩이 제공하는 URL 미설정 샘플은 비대화형 카드로 유지할 수 있으며, 클릭 가능한 가짜 링크나 임의 모달로 바꾸지 않는다. 새 작업은 시작과 마감에 브라우저로 페이지마다 모든 링크와 버튼을 눌러 확인하고, 중간 수정은 영향받은 화면만 다시 확인할 수 있다(design-flow "사이트맵과 상호작용").
- 한글 제목(페이지·섹션·카드 제목)은 `word-break: keep-all`(Tailwind `break-keep`)로 어절 단위로 줄을 바꾼다. 없으면 "시계 대 / 신"처럼 낱말 중간에서 끊긴다. 데스크톱과 모바일 스크린샷에서 확인한다(제목 크기와 행간은 design-flow "Persuade 첫 화면의 제목").
- 색, 간격, 반경, 그림자는 토큰으로만 쓴다. 원시 hex 값이나 임의 Tailwind 값(`bg-[#123456]`, `mt-[13px]`)을 새로 넣지 않는다.
- shadcn 프리미티브는 `packages/ui`의 것을 쓴다. 있는 컴포넌트를 조합하거나 새 컴포넌트를 더할 때는 `prokit-ui-builder`가 `.agents/skills/shadcn/SKILL.md`를 읽고 그 절차로 `packages/ui`에 추가한다. Claude Code의 Skill 도구로 부르면 로드할 때 루트에서 `npx shadcn@latest info`를 실행해 `monorepo_root`로 실패한다. shadcn CLI는 `pnpm --filter @<프로젝트>/ui exec shadcn <명령>`(예: `info --json`)으로 `packages/ui`에 설치된 버전을 실행한다.
- 통과 기준: 주 UI 스킬 지도의 "통과 기준"을 따른다. impeccable이면 critique의 P0와 P1은 해결하거나 사유를 적고 보류한다. audit 총점은 `.dev-cycle.json`의 `ui.auditMin`(기본 16/20) 이상, 접근성 점수는 `ui.a11yMin`(기본 3/4) 이상이다. 재확인 뒤에도 기준에 못 미치면 완료로 보고하지 않는다. 결과와 남은 지적을 보고하고 추가 다듬기를 할지 사용자에게 묻는다. 그대로 두자고 하면 재확인 행에 `기준 미달 수용(사용자, <날짜>): audit 15/20`처럼 적는다.
- 편집 중 자동 검사(impeccable을 골랐을 때): 개발자마다 한 번 프로젝트 루트에서 `.agents/skills/impeccable/scripts/impeccable hooks on`을 실행하면 UI 파일을 고칠 때마다 detector가 결과를 알려 준다. 스킬 호출(`$impeccable hooks on`, Claude Code의 `impeccable` 스킬 인자 `hooks on`)로 켜지 않는다. 개인(전역) impeccable 스킬이 따로 있으면 Claude Code가 그쪽을 불러오고, 그 스크립트는 이 프로젝트의 impeccable에 없는 `scripts/hook.mjs`를 훅 명령으로 적는다. 그러면 Stop 훅과 편집 훅이 매번 `MODULE_NOT_FOUND`로 실패한다. 켠 뒤 `.claude/settings.local.json`의 훅 명령이 `…/scripts/impeccable" hook`인지 확인한다. Codex에서는 `/hooks`에서 신뢰를 확인한다. Antigravity에서는 이 훅이 돌지 않는다(impeccable이 훅을 `.claude/settings.local.json`과 Codex 설정에만 쓴다). Grok Build는 신뢰한 폴더에서 `.claude/settings.local.json`의 훅도 읽지만 이 훅이 도는지는 확인하지 않았다. 두 도구에서는 화면을 고친 뒤 critique의 detector로 확인한다. hallmark의 편집 훅은 쓰지 않는다(hallmark-map "프로젝트 규칙이 앞선다").
- 이미지 그리기: 그리는 길을 이 순서로 고른다. ① 하네스 자체 이미지 도구(Codex `image_gen`, Antigravity `generate_image`, Grok Build `image_gen`). ② impeccable을 골랐고 셸에 `OPENAI_API_KEY`가 있으면 `impeccable generate-image`(키를 넣은 것을 OpenAI API 사용 동의로 본다. 비용은 사용자의 OpenAI 계정에 청구된다). ③ Codex CLI가 ChatGPT로 로그인되어 있으면 `gpt-image` 스킬(`.agents/skills/gpt-image/SKILL.md`. ChatGPT 요금제 사용량을 쓴다. 이 스킬의 `bootstrap`은 전역 스킬 링크와 Codex CLI를 설치하므로 사용자가 요청할 때만 한다). ④ 모두 없으면 배치도로 구성을 고른다. 어느 길이든 comp-led 절차(design-flow "이미지"와 주 UI 스킬 지도의 "이미지")는 같고 그림만 그 도구로 그린다. ④에서는 사진·일러스트 자리를 CSS 도형이나 이모지로 흉내 내지 않는다. 사용자에게 이미지를 받거나 이미지 없이도 서는 구성으로 만든다.
- 사용자 요청이나 승인된 브리프에 생성 이미지가 있으면 실제 생성·화면 연결·출처·검수 증거를 회수한다. 이를 임의로 "SVG로 충분"이나 "생성 불필요"라는 사용자 승인으로 바꾸지 않는다. 수행자에 이미지 도구가 없으면 코디네이터가 접근 가능한 이미지 도구로 위임하고, 대안도 없으면 해당 자산을 미완료로 남긴다. 아이콘·정확한 글자가 필요한 슬라이드 같은 벡터 자산은 그대로 재사용하며, 생성 이미지를 실제 인물·행사·성과의 증거로 표현하지 않는다.
- 팩 기반 작업은 완성 프리셋과 같은 뷰포트·설정·스크롤·hover 상태에서 비교한다. 개인화 밖 영역의 자산·서체·레이아웃·모션을 유지하며 기능 QA 통과로 시각 비교를 대신하지 않는다. 검증은 `prokit-verify`의 팩 기준 비교를 따른다.
- 키: Claude Code는 세션을 열 때 훅(`scripts/load-keys.mjs`)이 프로젝트 `.env`, 작업 폴더(프로젝트의 상위 폴더) `.env` 순서로 `OPENAI_API_KEY`를 셸 환경에 넣는다. 셸에 없는데 `.env`에 있으면(Codex·Antigravity·Grok Build, 세션을 연 뒤 넣은 키) `node scripts/load-keys.mjs -- <명령>`으로 그 명령에만 넣는다. 배포 토큰(`GH_TOKEN`, `VERCEL_TOKEN`)은 늘 이 방법으로 배포 명령에만 넣는다. 키 값은 출력(`printenv`, `echo`, `cat .env` 포함), 다른 파일, 커밋에 남기지 않고 대화창에 붙여 넣으라고 하지 않는다. 있는지만 볼 때는 `node scripts/load-keys.mjs -- sh -c 'test -n "$GH_TOKEN"'`처럼 exit로 본다.
- 화면 디자인 보조(taste-skill 포함)는 위 "화면 디자인 보조"대로 쓴다. 그 화면의 `보조:` 줄에 없는 보조가 불려도 이 흐름대로 하고, 쓰는 보조는 부르기 전에 그 `guide`를 읽는다. 순서, `DESIGN.md`, 토큰 규칙, 주 UI 스킬의 리뷰·감사와 통과 기준은 그대로다.
- 데이터 상태(loading, empty, error, 비인가)의 모양과 문구를 설계한다<!-- edition:pro -->(동작은 `prokit-web`과 함께)<!-- /edition -->.
- 제작 표시(선택): 출처를 알리고 싶으면 하단에 `apps/web/src/components/prokit-credit.tsx`의 `<ProkitCredit />`를 사용한다. 프로킷 심볼, 홈페이지로 가는 "이 사이트도 프로킷으로 만들었어요" 링크, GitHub 링크를 제공한다. MIT는 사이트에 이 홍보 표시를 유지할 의무를 부과하지 않는다. 사용자가 표시를 제외하거나 문구·모양을 조정하도록 요청하면 따른다. 표시를 쓰는 경우 위치·크기·간격은 사이트 디자인과 접근성에 맞춰 조정한다. 프로킷 주소는 이 파일의 `PROKIT_LINKS`에 있다. MIT의 저작권·허가문 보존 조건은 홍보 표시와 별도로 지킨다.

## 완성팩 설정 적용
팩의 지원 설정과 사용자 요청을 적용할 때 [references/preset-settings.md](references/preset-settings.md)를 읽는다. 팩에 없는 테마·언어를 공식 제작 기본값이라는 이유로 자동 추가하지 않는다. 원본 COPY·공식 기본 기능·카탈로그 등록은 `pro-kit-preset-skills`의 create/research/verify/publish가 전담한다.

## 화면만 프로젝트
루트 `AGENTS.md` 맨 위에 "화면만 프로젝트" 표시가 있으면 DB 없이 예시 데이터로 화면만 만든다. 화면 작업은 지금처럼 dev-cycle 라운드(대개 케이스 B)로 하고 위 단계와 규칙을 모두 따른다. 작업 폴더에서 시작한 프로젝트는 `docs/first-request.md`의 요청이 첫 라운드의 요청이다. 더할 화면 규칙, HTML 내보내기(`pnpm export:html`), GitHub Pages·Vercel 배포, 실제 서비스로 바꾸기는 [references/screen-only.md](references/screen-only.md)를 따른다.
