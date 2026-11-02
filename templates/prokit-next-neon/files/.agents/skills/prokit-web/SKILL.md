---
name: prokit-web
description: >-
  이 Better-T-Stack Next.js 프로젝트의 apps/web 동작과 구조를 만들거나 바꾸거나 검토할 때 사용한다. App Router
  라우팅, 페이지와 레이아웃, Server Component와 Client Component 경계, oRPC와 TanStack Query 데이터
  패칭, 로그인 보호 페이지, 캐시와 프리패치, 로딩과 오류 상태, 렌더링 성능을 다룬다. 페이지 추가,
  데이터 불러오기, use client, 서버 컴포넌트, 리다이렉트, 캐시, 느려요 같은 요청에 사용한다. 색,
  타이포, 레이아웃 같은 시각 디자인과 UX 판단은 prokit-ui, 프로시저와 인증 로직은 prokit-api, 테이블과
  마이그레이션은 prokit-db가 맡는다.
---

# apps/web 동작과 구조

## 먼저 읽기
1. `apps/web/AGENTS.md`를 매번 읽는다. 작업이 작아도 읽는다. Next.js가 생성하는 규칙이고, 이 프로젝트의 Next 버전은 학습 데이터와 다를 수 있다고 알려 준다.
2. 쓰거나 바꾸는 Next API(`page`/`layout`, `redirect`, `headers`, `params`, `Link`, 캐시, `loading`/`error` 파일 등)의 문서를 `apps/web/node_modules/next/dist/docs/`에서 찾아 읽는다. 예: `grep -rl "redirect" apps/web/node_modules/next/dist/docs/01-app | head`. 문서는 Read로 읽고(audit이 기록과 대조한다) 경로를 `prokit-web`을 적은 행의 증거에 적는다(예: `사용: prokit-web(apps/web/node_modules/next/dist/docs/01-app/…/redirect.md)`). 쓰거나 바꾼 Next API가 없으면 `Next 문서: N/A: 사유`로 적는다.
3. 바꿀 경로 주변 파일, `apps/web/src/utils/orpc.ts`, 보호 페이지 예시인 `apps/web/src/app/dashboard/page.tsx`.

## 공식 스킬 연결
이 스킬은 Main이 화면 계층(라우팅, RSC 경계, 데이터 패칭, 캐시, 성능) 일을 나누고 맡기고 검수할 때 쓴다. 표의 공식 스킬은 Main이 읽지 않는다. 위임 지시(packet)에 스킬 이름과 경로(`.agents/skills/<이름>/SKILL.md`)를 넣어 맡는 에이전트가 읽고 따르게 하고, 보고의 "읽은 스킬"과 스킬 기록으로 실제로 읽었는지 본 뒤 "Main 검수" 칸을 확인한다. 배치의 정본은 `skills.manifest.json`의 `performers`이고 바꾸는 일은 `prokit-skills-assign`이 맡는다(절차는 `prokit-dev-cycle`의 [위임과 전문 스킬 프로토콜](../prokit-dev-cycle/references/delegation.md) "공식 스킬 위임").

| 상황 | 공식 스킬 | 맡는 에이전트 | Main 검수 |
|---|---|---|---|
| 컴포넌트와 훅 작성, 리렌더, 번들 크기, 요청 워터폴 | `vercel-react-best-practices` | `prokit-ui-builder`. 리뷰는 `prokit-reviewer`(code) | 보고에 적은 규칙 이름(async-parallel, rerender-memo 등)이 바뀐 코드와 맞는지 |
| 재사용할 컴포넌트 API, props가 불어나는 컴포넌트, 합성 설계 | `vercel-composition-patterns` | `prokit-ui-builder`. 리뷰는 `prokit-reviewer`(plan·code) | 합성 결정이 계획·브리프의 재사용 결정과 같은지 |
| `use cache`와 Cache Components 도입 또는 점검. 켠 프로젝트(`next.config`의 `cacheComponents`)에서 라우트·데이터 패칭을 더하거나 바꿀 때와 빌드의 blocking route 오류 | `next-cache-components-adoption`, `next-cache-components-optimizer` | `prokit-ui-builder` | 캐시 경계와 읽은 Next 번들 문서 경로가 보고에 있는지 |
| 링크 프리패치 전략: Partial Prefetching 도입, 도입 뒤 링크별 조정. 켠 프로젝트(`partialPrefetching`)에서 링크를 더하거나 바꿀 때 | `next-partial-prefetching-adoption`, `next-partial-prefetching-optimizer` | `prokit-ui-builder` | 링크별 결정과 확인 결과가 보고에 있는지 |
| 바꾼 동작이 실제 앱에서 도는지 확인 | `next-dev-loop` (절차는 `prokit-verify`) | `prokit-runtime-checker` | 확인한 경로, 오류 예산 0 |
| turbo 태스크·패키지 의존·환경 변수 캐시 입력 | `turborepo` | 그 계층의 수행자, `turbo.json`은 `prokit-implementer`. 리뷰는 `prokit-reviewer` | 바뀐 환경 변수가 캐시 입력에 들어갔는지 |

이 스킬들의 지침이 번들 문서(`apps/web/node_modules/next/dist/docs/`)와 다르면 번들 문서를 따르고, 어긋난 곳을 보고에 적는다. 외부 스킬은 설치한 Next 버전보다 늦게 갱신될 수 있다.

느림, 깜빡임, 번들 크기, 캐시, 프리패치를 다루면 원인 분석이나 개선안도 `prokit-ui-builder`에 맡긴다. 위임 지시에 `vercel-react-best-practices`, 캐시면 `next-cache-components-*`, 링크 이동이면 `next-partial-prefetching-*`를 넣는다. 원인과 개선안에는 해당 규칙 이름(예: async-parallel, rerender-memo)을 붙여 보고받고, 개발 서버의 동작은 `prokit-runtime-checker`가 `next-dev-loop`의 `/_next/mcp`로 본다.

## 재사용과 설정 결정

구조를 정하기 전에 [재사용과 설정 설계](../prokit-dev-cycle/references/reuse-design.md)를 따른다. 기존 컴포넌트·유틸·환경 변수 검증과 소비자를 먼저 확인하고 계획에 결정 경로를 남긴다. React 합성은 `vercel-composition-patterns`의 해당 규칙을 적용하되 단순 재사용에 Provider를 추가하지 않는다. `turbo.json`이나 환경 변수 캐시 입력을 바꾸면 `turborepo`가 가리키는 설치판 문서를 읽는다.

외부 전문 스킬이나 수행자를 쓸 때만 [위임과 전문 스킬 프로토콜](../prokit-dev-cycle/references/delegation.md)을 읽는다. provider의 실제 내용과 scope를 확인하고, RSC 경계·환경 변수·기존 소비자 계약은 넘긴 패킷에도 명시한다.

## 규칙
- 화면만 프로젝트(루트 `AGENTS.md` 맨 위 표시)면 아래 데이터 패칭·보호 페이지 규칙 대신 `prokit-ui`의 "화면만 프로젝트" 절을 따른다.
- Server Component가 기본이다. `"use client"`는 상태, 이벤트, 브라우저 API가 필요한 가장 작은 컴포넌트에만 붙인다.
- 클라이언트 데이터는 `orpc` 유틸과 TanStack Query로 부른다. 조회는 `useQuery(orpc.<라우터>.<프로시저>.queryOptions({ input }))`, 변경은 `useMutation(orpc.<라우터>.<프로시저>.mutationOptions())` 뒤에 관련 쿼리를 무효화한다. `/api/rpc`를 fetch로 직접 부르지 않는다.
- 서버 전용 모듈(`src/services.ts`, `src/env.server.ts`, DB와 auth 인스턴스)을 Client Component에서 import하지 않는다. 비밀값은 `.env.schema`에서 `@public`이 아닌 값으로 두고 클라이언트로 넘기지 않는다.
- 보호 페이지는 서버에서 세션을 확인하고 `redirect("/login")`한다. `dashboard/page.tsx`처럼 `auth.api.getSession({ headers: await headers() })`를 쓴다. 클라이언트 리다이렉트만으로 보호하지 않는다.
- 데이터를 보여 주는 화면은 loading, empty, error, 비인가(로그인 필요) 상태를 각각 구분해 보여 준다. 개수·합계 카드도 예외가 아니다. 0건이면 숫자 0만 두지 말고 빈 상태 분기를 두어 안내 문구와 다음 행동(예: 할 일 추가 링크)을 보여 준다.
- UI 프리미티브는 `packages/ui`의 shadcn 컴포넌트를 쓴다. 새 UI 라이브러리나 상태관리 라이브러리는 근거 없이 추가하지 않는다.
- 새 화면이나 새 흐름(페이지 추가 포함)은 코드 전에 `prokit-ui`의 shape 브리프 게이트를 먼저 통과한다. 이 스킬의 예시는 브리프가 확정된 뒤의 구현 방식이다.
- API 계약이 바뀌면 `prokit-api`를, 화면 모양이 바뀌면 `prokit-ui`를 함께 읽는다.
- 페이지를 더하거나 URL·보호 여부를 바꾸면 `docs/domain/project.md`의 화면과 URL 표를, 사용자 흐름이 바뀌면 주요 흐름을 같은 작업에서 고친다.

## 예: 로그인 사용자 전용 목록 페이지
```tsx
// apps/web/src/app/todos/page.tsx (Server Component)
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../services";
import TodoList from "./todo-list";

export default async function TodosPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  return <TodoList />;
}
```
```tsx
// apps/web/src/app/todos/todo-list.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { orpc } from "@/utils/orpc";

export default function TodoList() {
  const todos = useQuery(orpc.todo.list.queryOptions());
  if (todos.isPending) return <p>불러오는 중…</p>;
  if (todos.isError) return <p role="alert">목록을 불러오지 못했습니다.</p>;
  if (todos.data.length === 0) return <p>아직 할 일이 없습니다. <Link href="/todos/new">할 일 추가</Link></p>;
  return <ul>{todos.data.map((t) => <li key={t.id}>{t.title}</li>)}</ul>;
}
```
import 별칭(`@/`)이 없으면 상대 경로를 쓴다. 모양과 문구는 `prokit-ui` 단계에서 다듬는다.

## 검사
`.dev-cycle.json`의 `commands.typecheck`, `commands.lint`, `commands.build`. 런타임 확인은 `prokit-verify`.
