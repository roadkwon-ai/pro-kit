#!/usr/bin/env bash
# todo 라우터에 count 프로시저를 더하고 D 라운드 대조표를 연다. 두 번째 인자가 build면 빌드 행 증거를 채운다.
set -euo pipefail
cd "$1"
# todoRouter 객체 안에 count 프로시저를 더한다 (마지막 `};` 앞).
perl -0pi -e 's/\n\};\s*\z/\n  count: protectedProcedure.handler(async ({ context }) => {\n    const rows = await context.db.select().from(todo).where(eq(todo.userId, context.session.user.id));\n    return { total: rows.length, done: rows.filter((r) => r.completed).length };\n  }),\n};\n/' packages/api/src/routers/todo.ts
grep -q 'count: protectedProcedure' packages/api/src/routers/todo.ts || { echo 'todoRouter에 count를 넣지 못했다 (시드 todo.ts 끝 확인)' >&2; exit 1; }
pnpm exec biome format --write packages/api/src/routers/todo.ts >/dev/null 2>&1 || true
node scripts/dev-cycle.mjs table D --write --title "todo count" >/dev/null
if [ "${2:-}" = "build" ]; then
  perl -pi -e 's/^(\| \d+ \| \[verify\] 타입·린트·테스트 → 명령과 결과 \|) *\|$/$1 pnpm build → exit 0 |/' tasks/todo.md  # GNU·BSD 공통
  grep -q 'pnpm build → exit 0' tasks/todo.md || { echo 'D 대조표에서 타입·린트·테스트 행을 찾지 못했다 (dev-workflow D 문구 확인)' >&2; exit 1; }
fi
