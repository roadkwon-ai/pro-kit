---
name: prokit-web
description: >-
  이 BTS Next.js 프로젝트의 apps/web 동작과 구조를 만들거나 바꾸거나 검토할 때 사용한다. App Router
  라우팅, 페이지와 레이아웃, Server Component와 Client Component 경계, oRPC와 TanStack Query 데이터
  패칭, 로그인 보호 페이지, 캐시와 프리패치, 로딩과 오류 상태, 렌더링 성능을 다룬다. 페이지 추가,
  데이터 불러오기, use client, 서버 컴포넌트, 리다이렉트, 캐시, 느려요 같은 요청에 사용한다. 색,
  타이포, 레이아웃 같은 시각 디자인과 UX 판단은 prokit-ui, 프로시저와 인증 로직은 prokit-api, 테이블과
  마이그레이션은 prokit-db가 맡는다.
---

# apps/web 동작과 구조

## 먼저 읽기
1. `apps/web/AGENTS.md`를 매번 읽는다. 작업이 작아도 읽는다. Next.js가 생성하는 규칙이고, 이 프로젝트의 Next 버전은 학습 데이터와 다를 수 있다고 알려 준다.
2. 쓰거나 바꾸는 Next API(`page`/`layout`, `redirect`, `headers`, `params`, `Link`, 캐시, `loading`/`error` 파일 등)의 문서를 `apps/web/node_modules/next/dist/docs/`에서 찾아 읽는다. 예: `grep -rl "redirect" apps/web/node_modules/next/dist/docs/01-app | head`. 읽은 문서 경로는 보고나 대조표 증거에 적는다.
3. 바꿀 경로 주변 파일, `apps/web/src/utils/orpc.ts`, 보호 페이지 예시인 `apps/web/src/app/dashboard/page.tsx`.

## 공식 스킬 연결
| 상황 | 읽을 스킬 |
|---|---|
| 컴포넌트와 훅 작성, 리렌더, 번들 크기, 요청 워터폴 | `vercel-react-best-practices` |
| props가 불어나는 컴포넌트, 합성 설계 | `vercel-composition-patterns` |
| `use cache`와 Cache Components 도입 또는 점검 | `next-cache-components-adoption`, `next-cache-components-optimizer` |
| 링크 프리패치 전략: Partial Prefetching 도입, 도입 뒤 링크별 조정 | `next-partial-prefetching-adoption`, `next-partial-prefetching-optimizer` |
| 바꾼 동작이 실제 앱에서 도는지 확인 | `next-dev-loop` (절차는 `prokit-verify`) |
| turbo 태스크와 패키지 의존 | `turborepo` |

이 스킬들의 지침이 번들 문서(`apps/web/node_modules/next/dist/docs/`)와 다르면 번들 문서를 따르고, 어긋난 곳을 보고에 적는다. 외부 스킬은 설치한 Next 버전보다 늦게 갱신될 수 있다.

느림, 깜빡임, 번들 크기, 캐시, 프리패치를 다루면 원인 분석이나 개선안을 쓰기 전에 `vercel-react-best-practices`를 읽고, 캐시면 `next-cache-components-*`, 링크 이동이면 `next-partial-prefetching-*`도 읽는다(`.agents/skills/<이름>/SKILL.md`). 원인과 개선안에는 해당 규칙 이름(예: async-parallel, rerender-memo)을 붙이고, 개발 서버의 동작은 `next-dev-loop`의 `/_next/mcp`로 본다.

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
