# UI SDK 도입 설계 (2026-11-20)

Vercel의 [UI SDK](https://github.com/vercel-labs/ui)(`@ui-sdk/core`와 프레임워크 어댑터, 스킬 `ui-sdk`)를 prokit 화면 작업에 들인다. 목표는 화면 에이전트(`prokit-ui-builder`)가 이 도구로 키보드·포커스·선택·드래그·ARIA가 필요한 상호작용을 직접 손으로 짜지 않고 만드는 것이다. 조사한 판은 저장소 `3647512`(2026-11-19), npm `@ui-sdk/react 0.1.0-beta.13`이다.

## 1. UI SDK가 주는 것

- 행동(behavior) 라이브러리: 키보드 탐색, 포커스, 선택, 닫기, 팝업, 드래그 앤 드롭과 그에 맞는 ARIA를 `@ui-sdk/core`에 두고 React·Vue·Svelte·Solid·Web Components 어댑터를 준다. 컴포넌트는 스타일이 없는 헤드리스이고, `data-slot`과 상태 속성(`data-open` 등)으로 꾸민다.
- 컴포넌트 약 50개: Button, Select, Combobox, Command, Dialog, Menu, Tabs, Tree, Token Input, Trigger Menu(멘션), Date·Time Input, Color Picker, Image Cropper, Waterfall, Resizable, Toast 등.
- 에이전트 스킬 `ui-sdk`(`npx skills add vercel-labs/ui --skill ui-sdk`): 경로 1(제공 컴포넌트로 화면), 경로 2(없는 컴포넌트를 `definePrimitive`·행동으로), 공통 마무리 3(에이전트 준비: `createAgent`, WebMCP, `data-agent-confirm`), 4(테스트: `@ui-sdk/core/testing`, vitest·jsdom). 문서는 설치된 패키지의 `docs/llms.txt`부터 읽게 한다.
- 베타다. Vercel 베타 약관을 따르고 API가 바뀔 수 있다. 라이선스는 Apache-2.0이다.

## 2. prokit와 겹치는 곳

| 영역 | 지금 prokit | UI SDK | 판단 |
|---|---|---|---|
| 기본 부품(버튼, 입력, 드롭다운, 대화상자, 툴팁) | `packages/ui`의 shadcn v4 부품(Base UI 위) | 같은 종류의 헤드리스 부품 | 겹친다. 바꾸지 않는다. 같은 종류의 헤드리스 라이브러리가 둘이면 포커스·포털·레이어 규칙이 둘이 되고 번들이 커진다 |
| shadcn·Base UI에 없는 행동(트리, 토큰 입력, 멘션 메뉴, 재정렬·칸 이동 드래그, 그리드 포커스, 색 고르기, 이미지 자르기, 날짜·시간 입력, 워터폴) | 손으로 짜거나 다른 라이브러리를 더한다 | 컴포넌트나 `@ui-sdk/core` 행동으로 있다 | 들인다. 손으로 `role="tree"`를 짜는 것보다 낫다 |
| 에이전트가 앱 화면을 조작(WebMCP, `createAgent`) | 없음 | 있다. 단 조작할 컨트롤이 모두 UI SDK 부품이어야 한다 | 제품 결정이다. 사용자가 원할 때만, ADR로 |
| 접근성 규칙(이름, 대비, 직접 짠 role 금지) | `prokit-ui` 규칙, 구현 전 바닥선, web-design-guidelines | 스킬의 "Rules for every path" | 같은 방향이다. 출처를 달아 바닥선에서 가리킨다 |
| 테스트 | B 라운드에는 테스트 행이 없다. 화면은 런타임 확인과 검증 증거 묶음으로 본다 | 모든 작업에 테스트를 요구한다 | 경로 2(새 행동)는 테스트를 요구하고, 경로 1은 러너가 있을 때만. prokit 규칙이 앞선다 |

## 3. 결정

1. 선택 묶음 `ui-sdk`로 둔다(`pnpm skills:setup --optional ui-sdk`). 기본 설치하지 않는다. 베타이고, 대부분의 화면은 shadcn 부품으로 충분하다.
2. 쓰는 때는 `prokit-ui` [UI SDK 지도](../../templates/prokit-next-neon/files/.agents/skills/prokit-ui/references/ui-sdk.md)의 표로 정한다. `packages/ui`에 있는 부품 종류는 shadcn을 쓰고, 없는 행동만 UI SDK로 `packages/ui`에 부품 하나로 더한다. 스타일은 `web.css` 없이 프로젝트 토큰과 Tailwind로 `data-slot`·상태 속성에 건다.
3. 맡는 쪽은 `prokit-ui-builder`이고 리뷰는 `prokit-reviewer`(ui)다. 배치 정본 `performers.skills`에 `ui-sdk`를 두 에이전트로 둔다(선택 묶음이어도 `agents:check`는 표에 에이전트를 적은 스킬이 배치에 있어야 한다고 본다. Main이 공식 스킬 일을 하지 않는 원칙과도 같다). 위임 지시에 `.agents/skills/ui-sdk/SKILL.md`, 고른 경로의 참조 파일, `ui-sdk.md`를 넣는다. audit은 `사용: ui-sdk`를 맡긴 에이전트가 읽은 기록과 대조한다.
4. 의존성(`@ui-sdk/core`, `@ui-sdk/react`)은 처음 쓰는 B 라운드의 `[design]` 행에서 결정하고 `packages/ui`에만 더한다. 판은 설치 때의 최신을 쓰고 고정하지 않는다(템플릿 규칙). 베타라 `docs/adr/`에 도입과 되돌리는 법을 남긴다.
5. 에이전트 준비(WebMCP, `createAgent`)는 사용자가 요청하거나 PRD에 있을 때만 한다. 되돌리기 어려운 동작(삭제, 결제, 발송)에 `data-agent-confirm`, 비밀 입력에 `data-agent-secret`을 다는 것은 보안 경계라 `prokit-reviewer(ui)`가 본다.
6. 테스트: 경로 2(새 행동·부품)는 `@ui-sdk/core/testing`으로 키보드·포커스·ARIA 테스트를 쓴다. `packages/ui`에 러너가 없으면 같은 위임에서 vitest·jsdom을 `packages/ui`에 더한다(`[design]`에 적는다). 경로 1은 러너가 있으면 쓰고, 없으면 검증 증거 묶음의 Tab 순서·키보드 확인으로 대신하고 그렇다고 보고한다.

## 4. 바꿀 파일

| 파일 | 내용 |
|---|---|
| `files/skills.manifest.json` | `optional.ui-sdk`(source `vercel-labs/ui`, skill `ui-sdk`) |
| `prokit-ui/references/ui-sdk.md`(새 파일) | 언제 쓰는지 표, 규칙, 위임 지시, 리뷰 관점, 테스트 |
| `prokit-ui/SKILL.md` | 개발 행과 공식 스킬 연결에서 지도로 연결 |
| `prokit-ui/references/build-floor.md` | 손으로 짠 role 금지 항목(출처: web-design-guidelines, ui-sdk) |
| `.claude/agents/prokit-ui-builder.md`, `prokit-reviewer.md` | ui-sdk를 받았을 때 읽을 것과 볼 것 |
| `AGENTS.md`(템플릿), `handbook/skills/optional-bundles.md` | 선택 묶음 표 |
| `tests/` | 매니페스트 묶음, 문서 연결 |

## 5. 검증

- 확인용 Better-T-Stack 프로젝트에서 `skills:setup --optional ui-sdk` 설치, `packages/ui`에 Tree와 재정렬 목록을 만들어 `check-types`·Biome·build, 브라우저로 키보드 조작 확인(시제품).
- 두 템플릿 테스트, handbook·공통 값·판 검사.
- 한계: 베타라 판이 바뀌면 문서 경로와 진입점이 바뀔 수 있다. Vue·Svelte·Solid 어댑터는 이 템플릿(React)에서 쓰지 않는다.
