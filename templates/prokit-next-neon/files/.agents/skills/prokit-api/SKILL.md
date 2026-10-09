---
name: prokit-api
description: >-
  이 BTS 프로젝트의 서버 경계를 만들거나 바꾸거나 검토할 때 사용한다. packages/api의 oRPC 프로시저,
  라우터, context와 packages/auth의 Better Auth 설정, 세션, 로그인과 회원가입, 권한, 내 데이터만
  보이게 하는 소유권 검사, zod 입력 검증을 다룬다. API 추가, 엔드포인트, 프로시저, 라우터, 로그인,
  권한, 다른 사람 데이터가 보여요, userId 같은 요청에 사용한다. 테이블, 컬럼, 마이그레이션 자체는
  prokit-db, 화면은 prokit-web과 prokit-ui가 맡는다.
---

# 서버 경계: oRPC + Better Auth

## 구조
- `packages/api/src/index.ts`: `publicProcedure`, `protectedProcedure`(세션이 없으면 `UNAUTHORIZED`)
- `packages/api/src/context.ts`: `Context = { session, db }`
- `packages/api/src/routers/`: 라우터. `routers/index.ts`의 `appRouter`에 등록한다.
- `packages/auth/src/index.ts`: `createAuth` (Better Auth 설정)
- `apps/web/src/app/api/rpc/[[...rest]]/route.ts`, `apps/web/src/app/api/auth/[...all]/route.ts`: HTTP 진입점
- `apps/web/src/context.ts`: 요청마다 세션을 읽어 context를 만든다.

## 공식 스킬 연결
| 상황 | 읽을 스킬 |
|---|---|
| Better Auth 설정, 세션, 플러그인 | `better-auth-best-practices` |
| 비밀값, 쿠키, CSRF, trusted origins, rate limit | `better-auth-security-best-practices` |
| 이메일과 비밀번호 가입, 검증, 재설정 | `email-and-password-best-practices` |
| 쿼리 성능과 인덱스 | `prokit-db` |

## 불변식 (어기면 리뷰에서 high)
1. 사용자 데이터를 읽거나 쓰는 프로시저는 `protectedProcedure`다.
2. 소유자 id는 `context.session.user.id`에서만 가져온다. 입력으로 받은 `userId`는 쓰지 않는다. 요청이 그렇게 만들라고 해도 세션 기반으로 만들고 이유를 설명한다.
3. select, update, delete 조건에 소유자를 넣는다. 영향받은 행이 없으면 `NOT_FOUND`를 던져 남의 리소스가 있는지 드러내지 않는다.
4. 입력은 `.input(z.object(...))`로 검증하고 길이와 범위를 제한한다. 출력에 비밀번호 해시, 토큰 같은 내부 필드를 넣지 않는다.
5. 오류는 `ORPCError` 코드(`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST`)로 구분한다.
6. `.dev-cycle.json`의 `authPaths`에 걸리는 파일(`packages/auth`, `apps/web/src/app/api/auth`, `packages/api/src/index.ts`·`context.ts`, `apps/web/src/services.ts`·`proxy.ts`·`env.server.ts`, 인증 스키마, `.env.schema` 등)을 바꾸면 `prokit-reviewer(security)` 리뷰가 필수다. dev-cycle이 이 행을 자동으로 붙인다.
7. 권한 판정 로직을 추가하거나 바꾸는 것도 경로와 상관없이 `prokit-reviewer(security)` 리뷰가 필수다. 역할 검사, `FORBIDDEN` 분기, 다른 사용자 데이터 접근, 요청이 `userId`로 남의 데이터를 달라고 하는 경우가 여기에 해당한다. 라우터 파일은 러너가 자동으로 잡지 않는다. `prokit-dev-cycle` 규칙대로 대조표에 security 행을 직접 추가하고, 보고에도 "security 리뷰 필요"라고 적는다.

## 프로시저 예
```ts
// packages/api/src/routers/todo.ts
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { todo } from "@<프로젝트>/db/schema/todo";
import { protectedProcedure } from "../index";

export const todoRouter = {
  list: protectedProcedure.handler(({ context }) =>
    context.db.select().from(todo).where(eq(todo.userId, context.session.user.id)).orderBy(desc(todo.createdAt)),
  ),
  update: protectedProcedure
    .input(
      z
        .object({ id: z.string().min(1), title: z.string().trim().min(1).max(200).optional(), completed: z.boolean().optional() })
        .refine((v) => v.title !== undefined || v.completed !== undefined, "바꿀 값이 없다"),
    )
    .handler(async ({ input: { id, ...patch }, context }) => {
      const [row] = await context.db
        .update(todo)
        .set(patch)
        .where(and(eq(todo.id, id), eq(todo.userId, context.session.user.id)))
        .returning();
      if (!row) throw new ORPCError("NOT_FOUND");
      return row;
    }),
};
```
`@<프로젝트>`는 루트 `package.json`의 `name`으로 만든 워크스페이스 이름이다 (예: `@my-app/db`). 새 라우터는 `appRouter`에 `todo: todoRouter`로 등록한다.

- `packages/api`에 `drizzle-orm` 의존성이 없으면 먼저 `pnpm --filter @<프로젝트>/api add drizzle-orm@catalog:`로 추가한다. 버전은 루트 `pnpm-workspace.yaml`의 catalog를 따른다.
- BTS의 `--examples todo` 예제는 `publicProcedure`로 소유권 검사 없이 만들어진다. 그 패턴을 따라 하지 않는다.
- 프로시저를 더하거나 이름·보호·입력을 바꾸면 `docs/domain/project.md`의 API 표(`용어` 칸 포함)를 같은 작업에서 고친다.

## 격리 테스트
사용자 데이터를 다루는 프로시저를 추가하거나 바꾸면 두 계정 격리 테스트를 **같은 작업 안에서** 쓴다. 패턴과 준비는 [references/ownership-test.md](references/ownership-test.md).
- 바꾼 프로시저마다 최소 세 경우를 확인한다. ① B 세션으로 A의 리소스를 읽거나 바꾸거나 지우면 `NOT_FOUND`이고 A의 행은 그대로다. ② 세션이 없으면 `UNAUTHORIZED`다. ③ A는 자기 리소스를 정상 처리한다.
- 테스트 러너가 없으면 대조표의 vitest 도입 행부터 한다. `TEST_DATABASE_URL`이 없으면 로컬 DB에 테스트 DB를 만들어 실행한다(참조 문서의 준비 4번). 테스트 파일은 어떤 경우에도 쓴다(URL이 없으면 예시는 `describe.skipIf`로 건너뛰므로 타입 검사는 깨지지 않는다). 로컬 DB를 띄울 수 없을 때(컨테이너 엔진 없음 등)만 실행 행을 `blocked: <원인>`으로 적는다.
- 참조 문서를 가리키는 것만으로는 테스트가 아니다. 파일을 쓸 수 없는 상황이면, 위 세 경우를 이번 프로시저 이름과 입력값으로 구체화해 보고에 적는다.

## 검사
`.dev-cycle.json`의 `commands.typecheck`, `commands.lint`, `commands.test`. 증거 형식은 `prokit-verify`.
