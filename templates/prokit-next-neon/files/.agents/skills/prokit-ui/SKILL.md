---
name: prokit-ui
description: >-
  이 BTS 프로젝트의 화면 모양과 사용자 경험을 기획하고 설계하고 구현하고 리뷰할 때 사용한다. 새 화면과
  페이지 디자인, 사이트맵과 페이지 구성, 링크·버튼 동작, 모달·툴팁·햄버거 메뉴·사이드바 같은 상호작용,
  리디자인, 레이아웃, 타이포, 색, 간격, 빈 상태와 온보딩, UX 문구, 서비스 이름과 헤드라인 후보, 반응형,
  접근성, 디자인 리뷰와 폴리시, 디자인 토큰과 DESIGN.md, 디자인 스타일 고르기를 다룬다. 화면 만들어줘, 디자인,
  예쁘게, UI 개선, UX, 디자인 리뷰, 접근성 점검, polish, 토스처럼·당근 스타일로 같은 요청에 사용하며
  impeccable을 주력으로 쓴다. 데이터
  패칭, 라우팅, 렌더링 경계 같은 동작 문제는 prokit-web이 맡는다.
---

# UI/UX: impeccable 중심

정본은 `PRODUCT.md`(제품 맥락)와 `DESIGN.md`(시각 시스템)다. 토큰은 `packages/ui/src/styles/globals.css`, 컴포넌트는 `packages/ui/src/components`(shadcn)에 있다.

## 시작할 때마다
프로젝트 루트에서 `.agents/skills/impeccable/scripts/impeccable context`를 한 번 실행한다. 대상이 정해져 있으면 `--target <경로>`를 붙인다. 출력의 지시를 따른다. 실행이 실패하면 `PRODUCT.md`와 `DESIGN.md`를 직접 읽고 없는 내용을 지어내지 않는다.

그다음 요청이 어느 쪽인지 정한다. 이 판정이 코드를 언제 쓸 수 있는지를 정한다.
- **새 작업**: 새 화면, 새 흐름, "새로 디자인", 리디자인, 화면 전체의 모양을 바꾸는 요청. 내용이 거의 없는 BTS 기본 화면을 제품 화면으로 채우거나 다시 구성하는 요청도 새 작업이다.
- **좁은 개선**: 기존 화면(BTS 기본 화면 포함)의 구성은 그대로 두고 간격, 문구, 상태 하나, 카드나 컴포넌트 하나를 고치거나 더하는 요청. 판단 기준은 요청의 범위이지 화면이 얼마나 비어 있는지가 아니다. 새 영역·섹션을 만들거나 카드·컴포넌트를 둘 이상 더하면 새 작업이다. 애매하면 새 작업으로 본다. 좁은 개선은 `PRODUCT.md`가 없어도 init 없이 진행한다. context 출력의 `SCOPED_EXISTING_ALLOWED`는 이 경우에만 해당한다.

새 작업이면 코드보다 먼저 세 가지를 한다.
1. `PRODUCT.md`가 없으면(context가 `BUILD_INIT_REQUIRED`나 `PRODUCT_INIT_REQUIRED`처럼 init을 요구하면) `init`부터 한다. init은 사용자 인터뷰이므로 질문을 사용자에게 보낸다.
2. `DESIGN.md`가 없고 화면이 아직 BTS 기본 화면뿐이면, 또는 사용자가 시각 세계를 바꾸는 리디자인을 요청하면 디자인 스타일을 고르게 한다. 이미 만든 화면이 있으면 `DESIGN.md`가 없어도 그 화면이 시각 세계이므로 묻지 않는다. 디자인 카탈로그에서 서비스에 맞는 스타일 1~3개를 추천 순위로 추리고, "카탈로그 없이 impeccable로 정하기"를 함께 내놓는다. 사용자가 브랜드를 지목했으면("토스처럼") 세 카탈로그에서 그 브랜드를 찾아 1위로 둔다. 없으면 지어내지 않고 "카탈로그에 없음"이라고 알린다. 절차는 [references/impeccable-map.md](references/impeccable-map.md)의 "디자인 카탈로그에서 고르기"를 따른다.
3. 사이트맵 `docs/briefs/site-map.md`를 먼저 쓰고, `shape <기능>`으로 화면마다 브리프를 `docs/briefs/<화면>.md`에 쓴 뒤 사용자 확인을 요청한다. 사이트맵에는 화면에서 나가는 링크와 버튼이 모두 어디로 이어지는지 적는다. 브리프에는 상호작용(hover, 툴팁, 모달, 드로어, 햄버거 메뉴, 사이드바), 서체, 이미지, 아이콘, 모션 계획을 적는다(impeccable-map "사이트맵과 상호작용", "시각 자산"). 제품 이름이나 첫 화면 헤드라인을 새로 정해야 하면 후보를 함께 낸다(impeccable-map "이름과 문구"). 스타일 선택, 이름·문구 후보, 브리프 확인은 한 번에 묻는다.

리디자인이면 1번 전에 지금 화면을 데스크톱과 모바일로 찍고 `critique`한다. 점수와 약점은 브리프의 "버릴 것"에, 제품 사실·문구·기능은 "지킬 것"에 적는다. 옛 모양은 다듬을 출발점이 아니라 반례다(impeccable-map "리디자인").

이번 턴의 결과물은 init 질문, 스타일 후보, 브리프다. 여기서 멈춘다. 사용자 답을 받기 전에는 `PRODUCT.md`를 만들지 않는다. 추정으로 채운 `PRODUCT.md`가 있으면 impeccable이 init을 끝난 것으로 보고 다음 세션에서 인터뷰를 건너뛴다. 사용자에게 물을 수 없는 환경이어도 가정으로 코드를 쓰지 않는다. 질문과 브리프 초안을 남기고 멈추는 것이 올바른 결과다.

## 단계
| 단계 | 할 일 | impeccable |
|---|---|---|
| 기획 (프로젝트당 1회) | 새 작업을 시작할 때 `PRODUCT.md`가 없으면 먼저 만든다(좁은 개선은 init 없이 진행) | `init` |
| 시각 방향 (1회, 리디자인 때 다시) | 첫 새 작업에서 시각 세계를 정한다. 카탈로그 스타일을 고르면 받아서 `DESIGN.md`로 두고 그 세계로 만든다. 직접 정하면 만든 화면을 바탕으로 마감 때 `DESIGN.md`를 기록한다. 이때 시작 전에 `DESIGN.md`를 지어내지 않는다. BTS 기본 shadcn 룩은 출발점일 뿐 정체성이 아니다 | 카탈로그: `use-design-md` → new-work. 직접: new-work → 마감에서 `document` |
| 설계 (새 화면과 흐름마다) | 코드 없이 사이트맵과 브리프를 만들고 사용자 확인을 받는다 | `shape <기능>` |
| 시각 자산 (새 화면마다) | 구현 전에 브리프의 서체 파일을 받아 자체 호스팅한다. 이미지를 그릴 수 있으면(아래 규칙 "이미지 그리기") comp를 먼저 만들고 사진·일러스트는 plate 이미지로 만든다. 상세는 impeccable-map "시각 자산" | 이미지: comp-led new-work(`visualize`, `generate-image`) |
| 개발 | 편집 직전에 impeccable의 `reference/craft-floor.md`를 읽는다. 브리프에 따라 필요할 때만 `layout`, `typeset`, `colorize`, `clarify`, `harden`, `onboard`, `adapt`, `animate`. 화면 전환과 공유 요소 애니메이션은 React `<ViewTransition>`으로 만들고 `vercel-react-view-transitions` 스킬(선택 묶음 `motion`)을 따른다 | new-work |
| 리뷰 | 메인 세션에서 실행한다. 서브에이전트 안에서 실행하지 않는다. `web-design-guidelines` 스킬로 코드도 검사해 결과를 별도 절로 보고한다 | `critique`, `audit` + `web-design-guidelines` |
| 마감 | 수정을 한 번에 모아 적용하고 재확인은 1회만 한다 | `polish` |
| 정본 갱신 | 토큰이나 컴포넌트가 바뀌었을 때. 덮어쓰기 전에 사용자에게 묻는다. 카탈로그에서 들여온 `DESIGN.md`는 덮어쓰지 않고 merge로 바뀐 토큰만 더한다. `DESIGN.md`를 쓰거나 고친 뒤에는 명세 lint로 확인한다(impeccable-map "DESIGN.md 검사") | `document` |

단계별 상세, B 케이스 행별 증거 예시, 통과 기준은 [references/impeccable-map.md](references/impeccable-map.md).

## 규칙
- 새 작업은 `shape` 브리프가 확정되기 전에 코드를 쓰지 않는다. 좁은 개선만 브리프 없이 진행하고, 대조표에 `N/A: 좁은 개선(버튼 간격)`처럼 적는다.
- 리뷰만 요청받으면 코드를 고치지 않는다. 보고에는 critique 점수와 P0~P3, audit 총점과 접근성 점수, `web-design-guidelines` 위반(`file:line`)을 넣는다. 독립 평가자를 띄울 수 없는 환경이면 축소 모드로 했다고 밝힌다.
- 링크와 버튼은 모두 실제 페이지나 실제 동작(모달, 드로어, 상태 바꾸기, 복사, 폼 제출 뒤 완료 화면)으로 이어진다. 404, "준비 중", `#`만 걸린 링크, 눌러도 반응이 없는 버튼을 두지 않는다. 이번에 만들지 않는 페이지로 가는 링크는 화면에 두지 않는다. 마감 전에 브라우저로 페이지마다 모든 링크와 버튼을 눌러 확인한다(impeccable-map "사이트맵과 상호작용").
- 색, 간격, 반경, 그림자는 토큰으로만 쓴다. 원시 hex 값이나 임의 Tailwind 값(`bg-[#123456]`, `mt-[13px]`)을 새로 넣지 않는다.
- shadcn 프리미티브는 `packages/ui`의 것을 쓴다. 있는 컴포넌트를 조합하거나 새 컴포넌트를 더할 때는 `.agents/skills/shadcn/SKILL.md`를 읽고 그 절차로 `packages/ui`에 추가한다. Claude Code의 Skill 도구로 부르면 로드할 때 루트에서 `npx shadcn@latest info`를 실행해 `monorepo_root`로 실패한다. shadcn CLI는 `pnpm --filter @<프로젝트>/ui exec shadcn <명령>`(예: `info --json`)으로 `packages/ui`에 설치된 버전을 실행한다.
- 통과 기준: critique의 P0와 P1은 해결하거나 사유를 적고 보류한다. audit 총점은 `.dev-cycle.json`의 `ui.auditMin`(기본 16/20) 이상, 접근성 점수는 `ui.a11yMin`(기본 3/4) 이상이다. 재확인 뒤에도 기준에 못 미치면 완료로 보고하지 않는다. 점수와 남은 지적을 보고하고 추가 polish를 할지 사용자에게 묻는다. 그대로 두자고 하면 재확인 행에 `기준 미달 수용(사용자, <날짜>): audit 15/20`처럼 적는다.
- 편집 중 자동 검사: 개발자마다 한 번 프로젝트 루트에서 `.agents/skills/impeccable/scripts/impeccable hooks on`을 실행하면 UI 파일을 고칠 때마다 detector가 결과를 알려 준다. 스킬 호출(`$impeccable hooks on`, Claude Code의 `impeccable` 스킬 인자 `hooks on`)로 켜지 않는다. 개인(전역) impeccable 스킬이 따로 있으면 Claude Code가 그쪽을 불러오고, 그 스크립트는 이 프로젝트의 impeccable에 없는 `scripts/hook.mjs`를 훅 명령으로 적는다. 그러면 Stop 훅과 편집 훅이 매번 `MODULE_NOT_FOUND`로 실패한다. 켠 뒤 `.claude/settings.local.json`의 훅 명령이 `…/scripts/impeccable" hook`인지 확인한다. Codex에서는 `/hooks`에서 신뢰를 확인한다. Antigravity에서는 이 훅이 돌지 않는다(impeccable이 훅을 `.claude/settings.local.json`과 Codex 설정에만 쓴다). Grok Build는 신뢰한 폴더에서 `.claude/settings.local.json`의 훅도 읽지만 이 훅이 도는지는 확인하지 않았다. 두 도구에서는 화면을 고친 뒤 critique의 detector로 확인한다.
- 이미지 그리기: 그리는 길을 이 순서로 고른다. ① 하네스 자체 이미지 도구(Codex `image_gen`, Antigravity `generate_image`, Grok Build `image_gen`). ② 셸에 `OPENAI_API_KEY`가 있으면 `impeccable generate-image`(키를 넣은 것을 OpenAI API 사용 동의로 본다. 비용은 사용자의 OpenAI 계정에 청구된다). ③ Codex CLI가 ChatGPT로 로그인되어 있으면 `gpt-image` 스킬(`.agents/skills/gpt-image/SKILL.md`. ChatGPT 요금제 사용량을 쓴다. 이 스킬의 `bootstrap`은 전역 스킬 링크와 Codex CLI를 설치하므로 사용자가 요청할 때만 한다). ④ 모두 없으면 배치도로 구성을 고른다. 어느 길이든 comp-led 절차(impeccable new-work 6절)는 같고 그림만 그 도구로 그린다. ④에서는 사진·일러스트 자리를 CSS 도형이나 이모지로 흉내 내지 않는다. 사용자에게 이미지를 받거나 이미지 없이도 서는 구성으로 만든다.
- 키: Claude Code는 세션을 열 때 훅(`scripts/load-keys.mjs`)이 프로젝트 `.env`, 작업 폴더(프로젝트의 상위 폴더) `.env` 순서로 `OPENAI_API_KEY`를 셸 환경에 넣는다. 셸에 없는데 `.env`에 있으면(Codex·Antigravity·Grok Build, 세션을 연 뒤 넣은 키) `node scripts/load-keys.mjs -- <명령>`으로 그 명령에만 넣는다. 배포 토큰(`GH_TOKEN`, `VERCEL_TOKEN`)은 늘 이 방법으로 배포 명령에만 넣는다. 키 값은 출력(`printenv`, `echo`, `cat .env` 포함), 다른 파일, 커밋에 남기지 않고 대화창에 붙여 넣으라고 하지 않는다. 있는지만 볼 때는 `node scripts/load-keys.mjs -- sh -c 'test -n "$GH_TOKEN"'`처럼 exit로 본다.
- 데이터 상태(loading, empty, error, 비인가)의 모양과 문구는 `prokit-web`과 함께 설계한다.
- 제작 표시(선택): 출처를 알리고 싶으면 하단에 `apps/web/src/components/prokit-credit.tsx`의 `<ProkitCredit />`를 사용한다. 프로킷 심볼, 홈페이지로 가는 "이 사이트도 프로킷으로 만들었어요" 링크, GitHub 링크를 제공한다. MIT는 사이트에 이 홍보 표시를 유지할 의무를 부과하지 않는다. 사용자가 표시를 제외하거나 문구·모양을 조정하도록 요청하면 따른다. 표시를 쓰는 경우 위치·크기·간격은 사이트 디자인과 접근성에 맞춰 조정한다. 프로킷 주소는 이 파일의 `PROKIT_LINKS`에 있다. MIT의 저작권·허가문 보존 조건은 홍보 표시와 별도로 지킨다.

## 화면만 프로젝트
루트 `AGENTS.md` 맨 위에 "화면만 프로젝트" 표시가 있으면 DB 없이 예시 데이터로 화면만 만든다. 화면 작업은 지금처럼 dev-cycle 라운드(대개 케이스 B)로 하고 위 단계와 규칙을 모두 따른다. 작업 폴더에서 시작한 프로젝트는 `docs/first-request.md`의 요청이 첫 라운드의 요청이다. 더할 화면 규칙, HTML 내보내기(`pnpm export:html`), GitHub Pages·Vercel 배포, 실제 서비스로 바꾸기는 [references/screen-only.md](references/screen-only.md)를 따른다.
