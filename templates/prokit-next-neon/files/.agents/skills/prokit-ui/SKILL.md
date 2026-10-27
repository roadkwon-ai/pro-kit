---
name: prokit-ui
description: >-
  이 Better-T-Stack 프로젝트의 화면 모양과 사용자 경험을 기획하고 설계하고 구현하고 리뷰할 때 사용한다. 새 화면과
  페이지 디자인, 사이트맵과 페이지 구성, 링크·버튼 동작, 모달·툴팁·햄버거 메뉴·사이드바 같은 상호작용,
  리디자인, 레이아웃, 타이포, 색, 간격, 빈 상태와 온보딩, UX 문구, 서비스 이름과 헤드라인 후보, 반응형,
  접근성, 디자인 리뷰와 폴리시, 디자인 토큰과 DESIGN.md, 디자인 스타일 고르기를 다룬다. 화면 만들어줘, 디자인,
  예쁘게, UI 개선, UX, 디자인 리뷰, 접근성 점검, polish, 토스처럼·당근 스타일로, taste로 같은 요청에 사용하며
  impeccable을 주력으로 쓴다. 데이터
  패칭, 라우팅, 렌더링 경계 같은 동작 문제는 다루지 않는다.
---

# UI/UX: impeccable 중심

## 위임
디자인·접근성 전문 스킬이나 수행자를 쓸 때만 [위임과 전문 스킬 프로토콜](../prokit-dev-cycle/references/delegation.md)을 읽는다. 실제 접근 가능한 provider의 범위와 side effect를 확인하고, 사이트맵·상호작용·오류 예산 계약은 유지한다.

병렬 작업, UI 소비자 회귀 검사와 기존 review coverage 재사용은 [실행 효율과 재검증](../prokit-dev-cycle/references/execution-efficiency.md)을 따른다. impeccable `critique`·`audit`은 메인 세션에서만 한다.

정본은 `PRODUCT.md`(제품 맥락)와 `DESIGN.md`(시각 시스템)다. 토큰은 `packages/ui/src/styles/globals.css`, 컴포넌트는 `packages/ui/src/components`(shadcn)에 있다.

## 시작할 때마다
프로젝트 루트에서 `.agents/skills/impeccable/scripts/impeccable context`를 한 번 실행한다. 대상이 정해져 있으면 `--target <경로>`를 붙인다. 출력의 지시를 따른다. 실행이 실패하면 `PRODUCT.md`와 `DESIGN.md`를 직접 읽고 없는 내용을 지어내지 않는다.

그다음 요청이 어느 쪽인지 정한다. 이 판정이 코드를 언제 쓸 수 있는지를 정한다.
- **새 작업**: 새 화면, 새 흐름, "새로 디자인", 리디자인, 화면 전체의 모양을 바꾸는 요청. 내용이 거의 없는 Better-T-Stack 기본 화면을 제품 화면으로 채우거나 다시 구성하는 요청도 새 작업이다.
- **좁은 개선**: 기존 화면(Better-T-Stack 기본 화면 포함)의 구성은 그대로 두고 간격, 문구, 상태 하나, 카드나 컴포넌트 하나를 고치거나 더하는 요청. 판단 기준은 요청의 범위이지 화면이 얼마나 비어 있는지가 아니다. 새 영역·섹션을 만들거나 카드·컴포넌트를 둘 이상 더하면 새 작업이다. 애매하면 새 작업으로 본다. 좁은 개선은 `PRODUCT.md`가 없어도 init 없이 진행한다. context 출력의 `SCOPED_EXISTING_ALLOWED`는 이 경우에만 해당한다.

완성 프리셋 팩이 제공되면 `prokit-pack-use`를 먼저 읽고 복원한 제품을 시각 기준으로 삼는다. 팩의 PRODUCT.md·DESIGN.md·사이트맵과 승인된 사용자 요청이 있으면 init·스타일 선택·브리프 재승인을 반복하지 않고 변경 범위만 기록한다. 레퍼런스 URL 조사·COPY와 공식 프리셋 제작은 별도 `pro-kit-preset-skills`의 `prokit-preset-create`가 담당한다. 해당 제작 스킬이 정한 명세로 기술 구현을 맡을 때도 시각 방향을 다시 고르지 않는다. 일반 서비스의 새 UI·접근성·반응형 구현은 이 스킬을 계속 따른다.

새 작업이면 코드보다 먼저 아래를 한다.
1. `PRODUCT.md`가 없으면(context가 `BUILD_INIT_REQUIRED`나 `PRODUCT_INIT_REQUIRED`처럼 init을 요구하면) `init`부터 한다. init은 사용자 인터뷰이므로 질문을 사용자에게 보낸다. <!-- edition:pro -->기존 프로젝트면 PRD, `docs/prokit/intake.md`, `docs/prokit/analysis.md`에서 찾은 답을 질문마다 초안으로 함께 보여 주고 확인받는다.<!-- /edition --><!-- edition:ui PRD에서 찾은 답을 질문마다 초안으로 함께 보여 주고 확인받는다. --> 찾지 못한 답은 지어내지 않는다.
2. **기존 프로젝트의 디자인 방향(한 번만)**: `.dev-cycle.json`의 `projectType`이 `early`·`operating`·`migration`이고 `docs/prokit/intake.md`의 "디자인 방향" 절에 답이 없으면(init이 남긴 괄호 안내 줄은 답이 아니다), 이어 갈 기존 디자인이 있는지 본다. 근거는 디자인 토큰·테마 파일, 디자인 시스템 문서, 프로토타입, 운영 화면이다(정밀 분석의 "디자인 자산" 절. migration은 `legacy.path`의 기존 화면). 근거가 없으면 묻지 않고 그 절에 `이어 갈 기존 디자인 없음`과 날짜를 적은 뒤 3번 스타일 고르기로 간다. 근거가 있으면 스타일을 고르게 하기 전에 먼저 묻는다: "지금 디자인(디자인 시스템, 화면)을 그대로 이어 갈까요, 다른 스타일로 리디자인할까요?" 선택지는 `기존 디자인 유지 (추천)`와 `리디자인`이다. 답과 날짜를 그 절에 적는다(파일이 없으면 `# 도입 기록`과 그 절만 만든다). <!-- edition:pro -->
   - 유지: 스타일 후보를 내지 않는다. `DESIGN.md`가 있으면 그것이 시각 세계다. 없으면 기존 디자인(운영 화면의 토큰과 컴포넌트, 디자인 시스템 문서, 프로토타입)을 분석해 `DESIGN.md`를 만든다([references/impeccable-map.md](references/impeccable-map.md) "기존 디자인으로 DESIGN.md 만들기"). <!-- edition:pro -->
   - 리디자인: 3번의 스타일 고르기와 impeccable-map "리디자인"을 따른다. <!-- edition:pro -->
   - `projectType`이 없거나 `new`면 이 질문을 하지 않는다. <!-- edition:pro -->
3. 새 프로젝트에서 `DESIGN.md`가 없고 화면이 아직 Better-T-Stack 기본 화면뿐이면, 또는 사용자가 시각 세계를 바꾸는 리디자인을 요청하<!-- edition:pro -->거나 2번에서 리디자인을 고르<!-- /edition -->면 디자인 스타일을 고르게 한다. 새 프로젝트에 이미 만든 화면이 있으면 `DESIGN.md`가 없어도 그 화면이 시각 세계이므로 묻지 않는다. 디자인 카탈로그에서 서비스에 맞는 스타일 1~3개를 추천 순위로 추리고, "카탈로그 없이 impeccable로 정하기"를 함께 내놓는다. 선택 묶음 `taste`(`.agents/skills/design-taste-frontend/`)가 있으면 "taste-skill로 방향 뽑기"도 내놓는다([references/taste.md](references/taste.md)). 사용자가 브랜드를 지목했으면("토스처럼") 세 카탈로그에서 그 브랜드를 찾아 1위로 둔다. 없으면 지어내지 않고 "카탈로그에 없음"이라고 알린다. 절차는 [references/impeccable-map.md](references/impeccable-map.md)의 "디자인 카탈로그에서 고르기"를 따른다.
4. 사이트맵 `docs/briefs/site-map.md`를 먼저 쓰고, `shape <기능>`으로 화면마다 브리프를 `docs/briefs/<화면>.md`에 쓴 뒤 사용자 확인을 요청한다. 사이트맵에는 화면에서 나가는 링크와 버튼이 모두 어디로 이어지는지 적는다. 브리프에는 상호작용(hover, 툴팁, 모달, 드로어, 햄버거 메뉴, 사이드바), 서체, 이미지, 아이콘, 모션 계획을 적는다(impeccable-map "사이트맵과 상호작용", "시각 자산"). 제품 이름이나 첫 화면 헤드라인을 새로 정해야 하면 후보를 함께 낸다(impeccable-map "이름과 문구"). 스타일 선택, 이름·문구 후보, 브리프 확인은 한 번에 묻는다.

리디자인이면 1번 전에 지금 화면을 데스크톱과 모바일로 찍고 `critique`한다. 점수와 약점은 브리프의 "버릴 것"에, 제품 사실·문구·기능은 "지킬 것"에 적는다. 옛 모양은 다듬을 출발점이 아니라 반례다(impeccable-map "리디자인").

이번 턴의 결과물은 init 질문, <!-- edition:pro -->디자인 방향 질문(기존 프로젝트), <!-- /edition -->스타일 후보, 브리프다. 여기서 멈춘다. 사용자 답을 받기 전에는 `PRODUCT.md`를 만들지 않는다. 추정으로 채운 `PRODUCT.md`가 있으면 impeccable이 init을 끝난 것으로 보고 다음 세션에서 인터뷰를 건너뛴다. 사용자에게 물을 수 없는 환경이어도 가정으로 코드를 쓰지 않는다. 질문과 브리프 초안을 남기고 멈추는 것이 올바른 결과다.

## 컴포넌트와 토큰 재사용

브리프의 구현 경계를 정할 때 [재사용과 설정 설계](../prokit-dev-cycle/references/reuse-design.md)를 읽는다. 기존 `packages/ui` 프리미티브·토큰과 앱 컴포넌트의 실제 소비자를 확인하고 재사용·조합·분리 결정을 브리프나 계획에 남긴다. 겉모양이 비슷해도 책임·디자인·변경 이유가 다르면 합치지 않는다. 합성 API가 필요하면 `vercel-composition-patterns` 규칙을 따르고<!-- edition:pro -->(`prokit-web`의 연결)<!-- /edition -->, 프리미티브 추가는 아래 shadcn 절차를 유지한다.

## 단계
| 단계 | 할 일 | impeccable |
|---|---|---|
| 기획 (프로젝트당 1회) | 새 작업을 시작할 때 `PRODUCT.md`가 없으면 먼저 만든다(좁은 개선은 init 없이 진행) | `init` |
| 시각 방향 (1회, 리디자인 때 다시) | 첫 새 작업에서 시각 세계를 정한다. <!-- edition:pro -->기존 프로젝트는 디자인 방향 질문부터 하고, 유지면 기존 디자인으로 `DESIGN.md`를 만든다(카탈로그를 쓰지 않는다). <!-- /edition -->카탈로그 스타일을 고르면 받아서 `DESIGN.md`로 두고 그 세계로 만든다. 직접 정하면 만든 화면을 바탕으로 마감 때 `DESIGN.md`를 기록한다. 이때 시작 전에 `DESIGN.md`를 지어내지 않는다. Better-T-Stack 기본 shadcn 룩은 출발점일 뿐 정체성이 아니다 | 카탈로그: `use-design-md` → new-work. 직접: new-work → 마감에서 `document` |
| 설계 (새 화면과 흐름마다) | 코드 없이 사이트맵과 브리프를 만들고 사용자 확인을 받는다 | `shape <기능>` |
| 시각 자산 (새 화면마다) | 구현 전에 브리프의 서체 파일을 받아 자체 호스팅한다. 이미지를 그릴 수 있으면(아래 규칙 "이미지 그리기") comp를 먼저 만들고 사진·일러스트는 plate 이미지로 만든다. 상세는 impeccable-map "시각 자산" | 이미지: comp-led new-work(`visualize`, `generate-image`) |
| 개발 | 편집 직전에 impeccable의 `reference/craft-floor.md`를 읽는다. 브리프에 따라 필요할 때만 `layout`, `typeset`, `colorize`, `clarify`, `harden`, `onboard`, `adapt`, `animate`. 화면 전환과 공유 요소 애니메이션은 React `<ViewTransition>`으로 만든다. 선택 묶음 `motion`(`.agents/skills/vercel-react-view-transitions/`)이 있으면 그 `SKILL.md`를 읽고 따르고, 없으면 `pnpm skills:setup --optional motion`을 제안한다 | new-work |
| 리뷰 | 메인 세션에서 실행한다. 서브에이전트 안에서 실행하지 않는다. `web-design-guidelines` 스킬로 코드도 검사해 결과를 별도 절로 보고한다. critique는 `.impeccable/critique/` 기록 파일을 남기고, audit과 `web-design-guidelines` 결과는 `tasks/evidence/ui-audit-<YYYYMMDD-HHmm>.md`에 저장해 대조표 증거에 점수와 경로를 적는다(`dev-cycle audit`이 이번 라운드 파일인지와 점수를 대조한다) | `critique`, `audit` + `web-design-guidelines` |
| 마감 | 수정을 한 번에 모아 적용하고 재확인은 1회만 한다 | `polish` |
| 정본 갱신 | 토큰이나 컴포넌트가 바뀌었을 때. 덮어쓰기 전에 사용자에게 묻는다. 카탈로그에서 들여온 `DESIGN.md`는 덮어쓰지 않고 merge로 바뀐 토큰만 더한다. `DESIGN.md`를 쓰거나 고친 뒤에는 명세 lint로 확인한다(impeccable-map "DESIGN.md 검사") | `document` |

단계별 상세, B 케이스 행별 증거 예시, 통과 기준은 [references/impeccable-map.md](references/impeccable-map.md).

## 규칙
- 새 작업은 `shape` 브리프가 확정되기 전에 코드를 쓰지 않는다. 좁은 개선만 브리프 없이 진행하고, 대조표에 `N/A: 좁은 개선(버튼 간격)`처럼 적는다.
- 리뷰만 요청받으면 코드를 고치지 않는다. 보고에는 critique 점수와 P0~P3, audit 총점과 접근성 점수, `web-design-guidelines` 위반(`file:line`), critique 기록 파일과 audit 보고서 경로를 넣는다. 독립 평가자를 띄울 수 없는 환경이면 축소 모드로 했다고 밝힌다.
- 고비용 최종 리뷰 전에는 evidence packet에서 현재 변경 범위와 필수 audit·a11y 평가 항목·소스 조건을 먼저 대조한다. 현재 변경 범위의 평가는 이전 점수로 대신하지 않고, 주관 시각 점수와 정본 audit/a11y 점수도 환산·혼용하지 않으며 누락한 증거만 보완해 통과한 검사를 반복하지 않는다.
- 링크와 버튼은 모두 실제 페이지나 실제 동작(모달, 드로어, 상태 바꾸기, 복사, 폼 제출 뒤 완료 화면)으로 이어진다. 404, "준비 중", `#`만 걸린 링크, 눌러도 반응이 없는 버튼을 두지 않는다. 이번에 만들지 않는 페이지로 가는 링크는 화면에 두지 않는다. 팩이 제공하는 URL 미설정 샘플은 비대화형 카드로 유지할 수 있으며, 클릭 가능한 가짜 링크나 임의 모달로 바꾸지 않는다. 새 작업은 시작과 마감에 브라우저로 페이지마다 모든 링크와 버튼을 눌러 확인하고, 중간 수정은 영향받은 화면만 다시 확인할 수 있다(impeccable-map "사이트맵과 상호작용").
- 색, 간격, 반경, 그림자는 토큰으로만 쓴다. 원시 hex 값이나 임의 Tailwind 값(`bg-[#123456]`, `mt-[13px]`)을 새로 넣지 않는다.
- shadcn 프리미티브는 `packages/ui`의 것을 쓴다. 있는 컴포넌트를 조합하거나 새 컴포넌트를 더할 때는 `.agents/skills/shadcn/SKILL.md`를 읽고 그 절차로 `packages/ui`에 추가한다. Claude Code의 Skill 도구로 부르면 로드할 때 루트에서 `npx shadcn@latest info`를 실행해 `monorepo_root`로 실패한다. shadcn CLI는 `pnpm --filter @<프로젝트>/ui exec shadcn <명령>`(예: `info --json`)으로 `packages/ui`에 설치된 버전을 실행한다.
- 통과 기준: critique의 P0와 P1은 해결하거나 사유를 적고 보류한다. audit 총점은 `.dev-cycle.json`의 `ui.auditMin`(기본 16/20) 이상, 접근성 점수는 `ui.a11yMin`(기본 3/4) 이상이다. 재확인 뒤에도 기준에 못 미치면 완료로 보고하지 않는다. 점수와 남은 지적을 보고하고 추가 polish를 할지 사용자에게 묻는다. 그대로 두자고 하면 재확인 행에 `기준 미달 수용(사용자, <날짜>): audit 15/20`처럼 적는다.
- 편집 중 자동 검사: 개발자마다 한 번 프로젝트 루트에서 `.agents/skills/impeccable/scripts/impeccable hooks on`을 실행하면 UI 파일을 고칠 때마다 detector가 결과를 알려 준다. 스킬 호출(`$impeccable hooks on`, Claude Code의 `impeccable` 스킬 인자 `hooks on`)로 켜지 않는다. 개인(전역) impeccable 스킬이 따로 있으면 Claude Code가 그쪽을 불러오고, 그 스크립트는 이 프로젝트의 impeccable에 없는 `scripts/hook.mjs`를 훅 명령으로 적는다. 그러면 Stop 훅과 편집 훅이 매번 `MODULE_NOT_FOUND`로 실패한다. 켠 뒤 `.claude/settings.local.json`의 훅 명령이 `…/scripts/impeccable" hook`인지 확인한다. Codex에서는 `/hooks`에서 신뢰를 확인한다. Antigravity에서는 이 훅이 돌지 않는다(impeccable이 훅을 `.claude/settings.local.json`과 Codex 설정에만 쓴다). Grok Build는 신뢰한 폴더에서 `.claude/settings.local.json`의 훅도 읽지만 이 훅이 도는지는 확인하지 않았다. 두 도구에서는 화면을 고친 뒤 critique의 detector로 확인한다.
- 이미지 그리기: 그리는 길을 이 순서로 고른다. ① 하네스 자체 이미지 도구(Codex `image_gen`, Antigravity `generate_image`, Grok Build `image_gen`). ② 셸에 `OPENAI_API_KEY`가 있으면 `impeccable generate-image`(키를 넣은 것을 OpenAI API 사용 동의로 본다. 비용은 사용자의 OpenAI 계정에 청구된다). ③ Codex CLI가 ChatGPT로 로그인되어 있으면 `gpt-image` 스킬(`.agents/skills/gpt-image/SKILL.md`. ChatGPT 요금제 사용량을 쓴다. 이 스킬의 `bootstrap`은 전역 스킬 링크와 Codex CLI를 설치하므로 사용자가 요청할 때만 한다). ④ 모두 없으면 배치도로 구성을 고른다. 어느 길이든 comp-led 절차(impeccable new-work 6절)는 같고 그림만 그 도구로 그린다. ④에서는 사진·일러스트 자리를 CSS 도형이나 이모지로 흉내 내지 않는다. 사용자에게 이미지를 받거나 이미지 없이도 서는 구성으로 만든다.
- 사용자 요청이나 승인된 브리프에 생성 이미지가 있으면 실제 생성·화면 연결·출처·검수 증거를 회수한다. 이를 임의로 "SVG로 충분"이나 "생성 불필요"라는 사용자 승인으로 바꾸지 않는다. 수행자에 이미지 도구가 없으면 코디네이터가 접근 가능한 이미지 도구로 위임하고, 대안도 없으면 해당 자산을 미완료로 남긴다. 아이콘·정확한 글자가 필요한 슬라이드 같은 벡터 자산은 그대로 재사용하며, 생성 이미지를 실제 인물·행사·성과의 증거로 표현하지 않는다.
- 팩 기반 작업은 완성 프리셋과 같은 뷰포트·설정·스크롤·hover 상태에서 비교한다. 개인화 밖 영역의 자산·서체·레이아웃·모션을 유지하며 기능 QA 통과로 시각 비교를 대신하지 않는다. 검증은 `prokit-verify`의 팩 기준 비교를 따른다.
- 키: Claude Code는 세션을 열 때 훅(`scripts/load-keys.mjs`)이 프로젝트 `.env`, 작업 폴더(프로젝트의 상위 폴더) `.env` 순서로 `OPENAI_API_KEY`를 셸 환경에 넣는다. 셸에 없는데 `.env`에 있으면(Codex·Antigravity·Grok Build, 세션을 연 뒤 넣은 키) `node scripts/load-keys.mjs -- <명령>`으로 그 명령에만 넣는다. 배포 토큰(`GH_TOKEN`, `VERCEL_TOKEN`)은 늘 이 방법으로 배포 명령에만 넣는다. 키 값은 출력(`printenv`, `echo`, `cat .env` 포함), 다른 파일, 커밋에 남기지 않고 대화창에 붙여 넣으라고 하지 않는다. 있는지만 볼 때는 `node scripts/load-keys.mjs -- sh -c 'test -n "$GH_TOKEN"'`처럼 exit로 본다.
- taste-skill(선택 묶음 `taste`)은 사용자가 고른 화면에만 쓴다. 고르지 않은 화면에서 불려도 이 흐름대로 한다. 고른 화면은 `design-taste-frontend`를 부르기 전에 [references/taste.md](references/taste.md)를 읽고 그 단계 대응을 따른다(taste-skill 자체 순서가 아니다). 순서, `DESIGN.md`, 토큰 규칙, critique·audit 통과 기준은 그대로다.
- 데이터 상태(loading, empty, error, 비인가)의 모양과 문구를 설계한다<!-- edition:pro -->(동작은 `prokit-web`과 함께)<!-- /edition -->.
- 제작 표시(선택): 출처를 알리고 싶으면 하단에 `apps/web/src/components/prokit-credit.tsx`의 `<ProkitCredit />`를 사용한다. 프로킷 심볼, 홈페이지로 가는 "이 사이트도 프로킷으로 만들었어요" 링크, GitHub 링크를 제공한다. MIT는 사이트에 이 홍보 표시를 유지할 의무를 부과하지 않는다. 사용자가 표시를 제외하거나 문구·모양을 조정하도록 요청하면 따른다. 표시를 쓰는 경우 위치·크기·간격은 사이트 디자인과 접근성에 맞춰 조정한다. 프로킷 주소는 이 파일의 `PROKIT_LINKS`에 있다. MIT의 저작권·허가문 보존 조건은 홍보 표시와 별도로 지킨다.

## 완성팩 설정 적용
팩의 지원 설정과 사용자 요청을 적용할 때 [references/preset-settings.md](references/preset-settings.md)를 읽는다. 팩에 없는 테마·언어를 공식 제작 기본값이라는 이유로 자동 추가하지 않는다. 원본 COPY·공식 기본 기능·카탈로그 등록은 `pro-kit-preset-skills`의 create/research/verify/publish가 전담한다.

## 화면만 프로젝트
루트 `AGENTS.md` 맨 위에 "화면만 프로젝트" 표시가 있으면 DB 없이 예시 데이터로 화면만 만든다. 화면 작업은 지금처럼 dev-cycle 라운드(대개 케이스 B)로 하고 위 단계와 규칙을 모두 따른다. 작업 폴더에서 시작한 프로젝트는 `docs/first-request.md`의 요청이 첫 라운드의 요청이다. 더할 화면 규칙, HTML 내보내기(`pnpm export:html`), GitHub Pages·Vercel 배포, 실제 서비스로 바꾸기는 [references/screen-only.md](references/screen-only.md)를 따른다.
