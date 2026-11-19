# UI SDK 지도

선택 묶음 `ui-sdk`(`pnpm skills:setup --optional ui-sdk`)를 설치한 프로젝트에서 화면의 상호작용을 [UI SDK](https://ui-sdk.dev/docs)로 만들 때 읽는다. UI SDK는 키보드 탐색, 포커스, 선택, 닫기, 팝업, 드래그와 그 ARIA를 행동으로 주는 헤드리스 라이브러리이고 베타다. 만드는 법의 정본은 설치된 스킬 `.agents/skills/ui-sdk/SKILL.md`와 그 `references/`다. 여기에는 이 프로젝트에서 언제 쓰고 누가 무엇을 읽는지만 적는다.

## 언제 쓰나

| 화면에 필요한 것 | 쓰는 것 |
|---|---|
| `packages/ui`에 이미 있는 종류(버튼, 입력, 체크박스, 드롭다운 메뉴, 대화상자, 툴팁 등) | shadcn 부품 그대로. UI SDK로 바꾸지 않는다(헤드리스 라이브러리가 둘이 되면 포커스·포털·레이어 규칙이 갈린다) |
| shadcn 레지스트리에 있는 부품(Select, Tabs, Accordion, Popover, Calendar 등)을 처음 더할 때 | shadcn 절차(`prokit-ui` 규칙). 같은 화면의 다른 부품과 맞춘다 |
| shadcn·Base UI에 없는 행동: 트리, 토큰 입력, 멘션·슬래시 메뉴(Trigger Menu), 목록 재정렬과 칸 사이 이동 드래그(`createReorder`, `createTransfer`), 좌석 같은 그리드 포커스(`createGridFocus`), 색 고르기, 이미지 자르기, 날짜·시간 입력, 워터폴 | UI SDK 컴포넌트, 없으면 `@ui-sdk/core` 행동으로 만든 부품(스킬의 경로 2) |
| 에이전트가 앱 화면을 읽고 조작하게 하는 기능(WebMCP, `createAgent`) | 사용자가 요청했거나 PRD에 있을 때만. 조작할 컨트롤이 모두 UI SDK 부품이어야 하므로 범위를 브리프에 적고 `docs/adr/`에 남긴다 |
| 프리미티브 기반 전체를 UI SDK로 바꾸기 | 이 지도로 하지 않는다. 사용자가 정하면 H 라운드와 ADR로 한다 |

애매하면 shadcn을 먼저 본다. 손으로 `role="tree"`, `"listbox"`, `"menu"`, `"grid"`를 짜야 하는 상황이 UI SDK를 쓸 때다.

## 설계 행(`[design]`)에 남길 것

- 쓰는 컴포넌트·행동과 쓰는 까닭(위 표의 어느 줄인지).
- 처음 쓰는 라운드면 `@ui-sdk/core`와 `@ui-sdk/react`를 `packages/ui`에만 더한다는 결정(`pnpm --filter @<프로젝트>/ui add @ui-sdk/core @ui-sdk/react`). 설치 때의 최신을 받는다. 베타 판은 pnpm이 정확한 판으로 적으므로, 올릴 때는 그 판의 문서를 다시 읽고 이 지도의 "확인한 것"을 다시 본다. 베타라 `docs/adr/`에 도입 까닭과 되돌리는 법(UI SDK를 빼면 그 부품을 shadcn 레지스트리의 부품이나 다른 검증된 헤드리스 라이브러리로 바꾸는 범위. `role=`로 직접 짜는 것은 대안이 아니다)을 적는다.
- 설치 때 pnpm이 패키지에 든 에이전트 스킬 사본의 승인을 물으면 승인하지 않는다. 스킬은 선택 묶음으로 설치한 `.agents/skills/ui-sdk` 한 벌만 쓴다(두 벌이면 판이 갈린다).
- 부품 파일 위치: `packages/ui/src/components/<이름>.tsx`. 앱 화면은 그 부품을 가져다 쓴다. 함수를 prop으로 넘기는 부품(`renderToken`, 렌더 함수)은 그 파일 맨 위에 `"use client"`를 둔다. Tree처럼 함수를 넘기지 않는 부품은 서버 컴포넌트에서 그대로 렌더된다. 부품은 쓰는 화면에서만 가져온다(트리·토큰 입력·멘션 메뉴를 한 화면에 쓰면 그 화면 JS가 gzip 약 68KB 늘었다).
- 스타일: 기본 모양 `@ui-sdk/core/web.css`는 쓰지 않는다. 프로젝트 토큰과 Tailwind로 `data-slot`과 상태 속성(`data-open`, `data-selected`, `data-pressed` 등)에 건다. `packages/ui/src/styles/globals.css` 맨 위에 `@layer ui-sdk;`를 `@import "tailwindcss"`보다 먼저 둔다(스킬 규칙). shadcn이 정의한 `data-selected:` 변형은 `[data-selected="true"]`라 UI SDK의 `data-selected=""`에 맞지 않는다. 선택 상태는 `data-[selected]:`로 쓴다(다른 상태 변형 open·closed·disabled는 그대로 맞는다). 요소를 그리지 않는 루트(TokenInput)는 `className`을 받지 않으니 감싸는 `div`에 준다. 부품이 주는 CSS 변수(트리의 `--tree-level`)로 계산하는 들여쓰기는 프로젝트 간격 토큰을 곱해 쓰고, 픽셀·rem 값을 새로 지어내지 않는다(`prokit-ui` 토큰 규칙).
- 테스트: 아래 "테스트" 절의 어느 경우인지.

## 위임 지시

`prokit-ui-builder`에 맡긴다. 지시에 다음을 넣는다.

- `.agents/skills/ui-sdk/SKILL.md`와 고른 경로의 참조(경로 1 `references/build-interface.md`, 경로 2 `references/create-component.md`, 스타일 `references/styles.md`, 테스트 `references/testing.md`, 에이전트 준비를 하면 `references/agent-ready.md`), 이 지도.
- 설치된 판의 문서부터 읽게 한다: `packages/ui/node_modules/@ui-sdk/react/docs/llms.txt`를 먼저 읽고 필요한 컴포넌트 쪽(`docs/components/<이름>.md`)만 읽는다. `docs/core.md`는 크니 경로 2에서 제목으로 찾아 읽는다. `dist/*.js`는 읽지 않는다.
- 구현 전 바닥선([build-floor.md](build-floor.md))과 shadcn 규칙. UI SDK 스킬의 규칙(진입점마다 가져오기, 모든 컨트롤에 이름, 상태 속성으로 꾸미기, 직접 짠 role 금지)은 바닥선과 같은 방향이다. 부딪히면 이 프로젝트의 규칙(`AGENTS.md`, `prokit-ui`, 토큰)이 앞선다.
- 보고에 넣을 것: 읽은 스킬과 참조(`ui-sdk(build-interface, styles)`처럼), 쓴 경로(1·2), 쓴 컴포넌트·행동, 테스트 명령과 exit, 스킬의 "When you're done"에서 확인하지 못한 것.

증거는 `위임: prokit-ui-builder(사용: ui-sdk(<읽은 참조>), …)`다. 배치 정본(`skills.manifest.json`의 `performers.skills`)이 `ui-sdk`를 `prokit-ui-builder`와 `prokit-reviewer`에 맡기므로, audit은 그 행에서 맡긴 에이전트가 이 라운드에 읽은 기록만 센다. Main이 읽은 기록은 세지 않는다.

## 테스트

UI SDK 스킬은 모든 작업에 테스트를 요구한다. 이 프로젝트에서는 이렇게 맞춘다.

- 경로 2(새 부품·행동)는 `@ui-sdk/core/testing`으로 키보드·포커스·ARIA 테스트를 쓴다. 행동 자체가 이 부품의 가치라서다. `packages/ui`에 테스트 러너가 없으면 같은 위임에서 vitest와 jsdom을 `packages/ui`에 더한다(`[design]`에 적는다. 배정 범위는 `packages/ui`).
- 경로 1(제공 컴포넌트를 조합)은 `packages/ui`나 `apps/web`에 러너가 있으면 연결 테스트(이름, 값, 콜백, 닫은 뒤 포커스)를 쓴다. 러너가 없으면 검증 증거 묶음의 Tab 순서와 런타임 확인의 키보드 조작으로 대신하고, 보고에 `테스트: 러너 없음, 묶음 Tab 순서·키보드 확인으로 대신`이라고 적는다.
- 색 대비는 jsdom이 보지 못한다. 검증 증거 묶음의 대비 측정이 본다.

## 리뷰와 검사

- `prokit-reviewer(ui)`: diff에 `@ui-sdk/` 가져오기가 있으면 `.agents/skills/ui-sdk/SKILL.md`의 "Rules for every path"로 함께 본다. 진입점 대신 패키지 루트·`internal/*` 가져오기, 이름 없는 컨트롤, 인라인 상태 스타일·생성된 id 의존, 같은 화면에서 shadcn과 UI SDK로 같은 종류의 부품을 둘 다 쓴 곳을 지적한다.
- 에이전트 준비를 했으면: 삭제·결제·발송처럼 되돌리기 어려운 동작에 `data-agent-confirm`, 비밀 입력에 `data-agent-secret`, 에이전트가 보면 안 되는 영역에 `data-agent-hidden`이 있는지 본다. `details.source === "agent"`인 변경을 서버 쪽 권한 검사 없이 믿는 코드는 security 관점으로 지적한다. 화면 속성은 사람 확인을 부르는 표시일 뿐 권한 경계가 아니다.
- 런타임 확인과 검증 증거 묶음은 그대로다. UI SDK 부품의 키보드 조작(화살표, Home·End, Escape, 입력 중 글자로 찾기)은 묶음에 없는 상호작용이라 평가자가 브라우저로 직접 본다.

## 이 템플릿에서 확인한 것

2026-11-20, Better-T-Stack 최신(Next 16, React 19, Tailwind 4, shadcn v4·Base UI)에 `@ui-sdk/core`·`@ui-sdk/react` `0.1.0-beta.10`을 넣어 확인했다.

- `pnpm skills:setup --optional ui-sdk`가 `.agents/skills/ui-sdk`(`SKILL.md`와 참조 7개)를 설치하고 `pnpm skills:check`가 `ui-sdk 있음`을 보였다.
- 설치된 문서: `packages/ui/node_modules/@ui-sdk/react/docs/llms.txt` 74KB, `docs/` 전체 2.5MB, `docs/core.md` 389KB. 그래서 목차부터 읽고 필요한 쪽만 읽는다.
- `packages/ui`에 Tree와 멘션 토큰 입력을 만들어 shadcn Button·DropdownMenu와 한 화면에 두었다. `check-types`, `biome check .`, `build`가 exit 0이고, 브라우저 콘솔 오류 0, 하이드레이션 경고 0이었다. 트리는 Tab, 화살표(펼치기·접기·이동), Enter(선택), Home·End가 맞게 움직였다.
- vitest·jsdom을 `packages/ui`에 넣는 데 약 4분이 걸렸고, 스킬의 에이전트 테스트(이름으로 찾고 고르기)와 트리 패턴 검사가 통과했다. 입력의 `aria-label`을 지우면 에이전트 테스트가 실패했다.
- 에이전트 브리지(`createAgent`, WebMCP)는 UI SDK 부품만 본다. 같은 화면의 shadcn 버튼·메뉴는 에이전트에게 보이지 않는다. 에이전트 준비를 하는 화면은 에이전트가 쓸 컨트롤을 UI SDK 부품으로 만든다(브리프에 범위를 적는다).
- 확인하지 않은 것: 라이트 테마 대비, 오른쪽에서 왼쪽 배치, `createReorder` 재정렬 목록.
