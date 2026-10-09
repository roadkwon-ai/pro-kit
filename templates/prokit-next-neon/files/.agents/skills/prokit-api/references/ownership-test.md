# 2계정 격리 테스트

사용자 데이터를 다루는 프로시저를 추가하거나 바꾸면 이 패턴으로 테스트를 쓴다. 다른 계정의 데이터를 읽거나 고치거나 지울 수 없고, 로그인하지 않으면 거절된다는 것을 **실제 Postgres**에서 확인한다.

## 준비 (최초 1회, 대조표의 vitest 도입 행)
1. `pnpm --filter @<프로젝트>/api add -D vitest`
2. `packages/api/package.json` scripts에 `"test": "vitest run"`, 루트 `package.json`에 `"test": "turbo run test"`를 추가한다.
3. `turbo.json`의 `tasks`에 `"test": { "cache": false }`를 추가하고, `globalEnv`에 `"TEST_DATABASE_URL"`을 추가한다 (turbo는 선언하지 않은 환경변수를 태스크에 넘기지 않는다).
4. 로컬 컨테이너에 테스트 DB를 만들고(`podman exec <컨테이너> createdb -U postgres <이름>_test`) 그 URL(`postgresql://postgres:<compose 비밀번호>@localhost:<호스트 포트>/<이름>_test`)을 `TEST_DATABASE_URL`로 둔다. 개발 DB와 운영 DB URL은 쓰지 않는다. 스키마는 `DATABASE_URL="$TEST_DATABASE_URL"`를 붙여 `commands.dbMigrate`(예: `pnpm --filter @<프로젝트>/db db:migrate`)로 적용한다. 병합 전 확인을 Neon에서 하려면 Neon 테스트 브랜치(`neon-postgres-branches`)의 direct URL을 같은 방식으로 넘긴다.
5. `.dev-cycle.json`의 `commands.test`에 `"pnpm test"`를 기록한다.

## 테스트 예
```ts
// packages/api/src/routers/todo.isolation.test.ts
import { createRouterClient } from "@orpc/server";
import { createDb } from "@<프로젝트>/db";
import { user } from "@<프로젝트>/db/schema/auth";
import { todo } from "@<프로젝트>/db/schema/todo";
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Context } from "../context";
import { appRouter } from "./index";

const url = process.env.TEST_DATABASE_URL;
// URL이 없으면 연결하지 않는 자리표시자를 넘기고 스위트를 건너뛴다 (드라이버에 따라 빈 URL은 import 시점에 거절된다).
const db = createDb({ DATABASE_URL: url ?? "postgresql://skip@localhost/skip" });
const A = `iso-a-${Date.now()}`;
const B = `iso-b-${Date.now()}`;
const as = (id: string | null) =>
  createRouterClient(appRouter, {
    context: { db, session: id ? ({ user: { id } } as NonNullable<Context["session"]>) : null },
  });

describe.skipIf(!url)("todo 소유권 격리", () => {
  beforeAll(async () => {
    const now = new Date();
    await db.insert(user).values(
      [A, B].map((id) => ({ id, name: id, email: `${id}@test.local`, emailVerified: false, createdAt: now, updatedAt: now })),
    );
  });
  afterAll(async () => {
    await db.delete(todo).where(inArray(todo.userId, [A, B]));
    await db.delete(user).where(inArray(user.id, [A, B]));
  });

  it("B는 A의 할 일을 목록에서 볼 수 없다", async () => {
    const created = await as(A).todo.create({ title: "A의 할 일" });
    const list = await as(B).todo.list();
    expect(list.map((t) => t.id)).not.toContain(created.id);
  });

  it("B는 A의 할 일을 고치거나 지울 수 없다", async () => {
    const created = await as(A).todo.create({ title: "A의 할 일" });
    await expect(as(B).todo.update({ id: created.id, title: "탈취" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(as(B).todo.delete({ id: created.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const mine = await as(A).todo.list();
    expect(mine.find((t) => t.id === created.id)?.title).toBe("A의 할 일");
  });

  it("A는 자기 할 일을 고치고 지울 수 있다", async () => {
    const created = await as(A).todo.create({ title: "A의 할 일" });
    const updated = await as(A).todo.update({ id: created.id, completed: true });
    expect(updated.completed).toBe(true);
    await as(A).todo.delete({ id: created.id });
    const mine = await as(A).todo.list();
    expect(mine.map((t) => t.id)).not.toContain(created.id);
  });

  it("로그인하지 않으면 모든 프로시저가 UNAUTHORIZED", async () => {
    const unauthorized = { code: "UNAUTHORIZED" };
    await expect(as(null).todo.list()).rejects.toMatchObject(unauthorized);
    await expect(as(null).todo.create({ title: "x" })).rejects.toMatchObject(unauthorized);
    await expect(as(null).todo.update({ id: "x", title: "x" })).rejects.toMatchObject(unauthorized);
    await expect(as(null).todo.delete({ id: "x" })).rejects.toMatchObject(unauthorized);
  });
});
```

- 프로시저 이름(`create`, `list`, `update`, `delete`)과 `user` 테이블 컬럼은 실제 코드에 맞춘다. `user` 컬럼은 `packages/db/src/schema/auth.ts`를 확인한다.
- `TEST_DATABASE_URL`이 없으면 테스트가 **skipped**로 끝난다. skipped는 통과가 아니다. 대조표에는 `4 passed`처럼 실제로 실행된 결과만 적는다.
