---
name: prokit-db
description: >-
  이 BTS 프로젝트의 packages/db(Drizzle ORM + Supabase Postgres, 개발은 로컬 Supabase 스택, 병합 전 검증은
  원격 스테이징, 운영은 Supabase)를 만들거나 바꾸거나 검토할 때 사용한다. 테이블, 컬럼, 관계 추가, 스키마 변경,
  마이그레이션 생성과 적용, RLS 켜기, 인덱스, 느린 쿼리, supabase start·stop, Supabase advisors, 스테이징
  적용, DATABASE_URL 연결 문제를 다룬다. 테이블 추가, 컬럼 추가, 마이그레이션, 스키마, 인덱스, 쿼리가 느려요,
  로컬 DB 띄우기, supabase start, RLS, Data API, db push 같은 요청에 사용한다. 프로시저의 권한과 소유권 로직은
  prokit-api가 맡는다.
---

# DB: Drizzle + Supabase Postgres (개발은 로컬 Supabase 스택, 병합 전 검증은 스테이징, 운영은 Supabase)

## 구조
- 스키마: `packages/db/src/schema/*.ts`(`schema/index.ts`에서 export), 관계: `packages/db/src/relations.ts`
- 마이그레이션: `packages/db/src/migrations/` (drizzle-kit 생성물, 커밋 대상). 이것이 유일한 마이그레이션 정본이다. `packages/db/supabase/migrations/`는 비워 둔다.
- 인증 테이블 `packages/db/src/schema/auth.ts`는 `pnpm auth:generate`가 만든다. 손으로 고치지 않는다.
- 연결: `packages/db/src/index.ts`의 `createDb`(드라이버 `pg`), 환경변수 `DATABASE_URL`(varlock `.env.schema`, 값은 `apps/web/.env`)
- 로컬 DB: `packages/db/supabase/config.toml`의 Supabase 로컬 스택. Postgres는 `127.0.0.1:54322`(사용자 `postgres`). 띄우는 법, 포트, 테스트 DB는 [references/migration-flow.md](references/migration-flow.md)의 로컬 DB 절.
- Supabase Auth(`auth` 스키마), supabase-js, Data API는 쓰지 않는다. 인증은 Better Auth의 `public.user` 등이다.

## 공식 스킬 연결
| 상황 | 읽을 스킬 |
|---|---|
| 컬럼 타입, 제약, 인덱스, RLS, 쿼리 작성과 튜닝 | `supabase-postgres-best-practices` |
| Supabase CLI, 로컬 스택, 연결 문자열, advisors, 보안 체크리스트 | `supabase` (supabase-js·Supabase Auth 예시는 이 프로젝트에 적용하지 않는다) |

## 스키마 변경 절차
1. 스키마 파일을 고친다. 새 테이블은 `pgTable.withRLS(...)`로 만들고 `schema/index.ts`에서 export한다.
2. `.dev-cycle.json`의 `commands.dbGenerate`(예: `pnpm --filter @<프로젝트>/db db:generate`)로 SQL 마이그레이션을 만든다. 루트 `pnpm db:generate`는 turbo interactive 태스크라 TTY 없는 에이전트 셸에서 실패하므로 쓰지 않는다.
3. 생성된 SQL을 읽는다. 의도하지 않은 `DROP`, 타입 축소, 데이터 손실이 없는지, 새 테이블마다 `ENABLE ROW LEVEL SECURITY`가 있는지 확인한다.
4. **로컬 Supabase DB**에 `commands.dbMigrate`로 적용하고, 앱과 테스트로 확인한다.
5. `supabase db advisors`로 보안 lint를 본다(RLS 미적용 테이블 0건). 명령은 [references/migration-flow.md](references/migration-flow.md).
6. **병합 전**에 원격 스테이징에 한 번 더 적용한다. 스테이징 URL을 환경변수로 넘겨 `commands.dbMigrate`를 실행한다.
7. 마이그레이션 파일을 스키마 변경과 함께 커밋 대상으로 둔다.

## RLS 규칙
- `public`은 Supabase Data API에 노출되는 스키마다. 여기 있는 모든 테이블은 RLS를 켠다. Better Auth의 `user`, `session`, `account`, `verification`도 포함한다(세션 토큰, 비밀번호 해시가 들어 있다).
- 정책(`create policy`)은 만들지 않는다. 정책이 없으면 `anon`·`authenticated`는 행을 읽지도 쓰지도 못한다. 앱은 테이블 소유자인 `postgres` 역할로 접속하므로 영향이 없다.
- RLS는 Data API 차단용이다. 사용자별 데이터 격리는 `prokit-api`의 소유권 검사와 격리 테스트가 한다. RLS가 있다고 where 조건의 소유자 검사를 빼지 않는다.
- Drizzle 테이블: `pgTable.withRLS("todo", {...})`. drizzle-orm 1.0에서 `.enableRLS()`는 deprecated다.
- Better Auth 테이블(`auth.ts`는 생성물이라 고치지 않는다): 커스텀 마이그레이션으로 켠다.
  ```bash
  pnpm --filter @<프로젝트>/db exec drizzle-kit generate --custom --name=enable_rls_auth
  ```
  생성된 빈 SQL 파일에 다음을 쓴다.
  ```sql
  ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
  ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
  ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
  ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
  ```
  Better Auth 플러그인이 테이블을 더하면 같은 방법으로 켠다.
- 뷰는 `security_invoker = true`로 만들고, `SECURITY DEFINER` 함수는 `public`에 두지 않는다(`supabase` 스킬의 보안 체크리스트).

## 금지
- `db:push`는 로컬 Supabase DB에서도 쓰지 않는다. Supabase 내부 스키마(`auth`, `storage` 등)를 지우는 변경을 만들고, `public`만 보게 해도 인증 테이블 RLS를 끈다. 실험도 `db:generate` → `db:migrate`로 한다([references/migration-flow.md](references/migration-flow.md)의 db:push 절).
- `supabase db push`, `supabase migration new`, `supabase db diff`로 스키마를 바꾸지 않는다. 정본이 둘이 된다.
- `supabase db reset`과 `supabase stop --no-backup`은 로컬 데이터를 지운다. 사용자가 요청할 때만 쓰고, `db reset` 뒤에는 `commands.dbMigrate`를 다시 실행한다(`db reset`은 비어 있는 `supabase/migrations`만 적용한다).
- supabase-js, `@supabase/ssr`, Supabase Auth를 들이지 않는다. 필요하면 ADR을 먼저 쓴다.
- `service_role`·secret 키, DB 비밀번호, 연결 문자열을 클라이언트 코드, `NEXT_PUBLIC_` 변수, 증거 칸에 두지 않는다.
- 이미 적용된 마이그레이션 파일을 고치지 않는다. 고칠 일이 있으면 새 마이그레이션을 만든다. drizzle 스냅샷(`snapshot.json`)을 손으로 고치거나 마이그레이션 폴더를 직접 만들지 않는다. 스키마 파일을 고치고 `dbGenerate`로 만든다(`--custom`이 만든 빈 `migration.sql`에 SQL을 쓰는 것은 된다).
- 운영 DB, 실제 사용자 데이터는 사용자의 명시적 요청 없이 다루지 않는다.

## 설계 규칙
- 사용자 소유 테이블에는 `userId`(`text`, `user.id` FK, `onDelete` 동작 명시)와 그 인덱스를 둔다. 소유권 검사는 `prokit-api`가 한다.
- 시각 컬럼은 `timestamp("created_at", { withTimezone: true }).defaultNow().notNull()` 형태로 둔다.
- 조회 조건과 정렬에 쓰는 컬럼에는 인덱스를 둔다. 여러 컬럼 조건이면 복합 인덱스를 검토한다.
- 파괴적 변경(컬럼 삭제, 이름 변경, 타입 축소)은 expand와 contract 두 단계로, 각각 별도 마이그레이션과 별도 라운드로 나눈다. 예는 [references/migration-flow.md](references/migration-flow.md).
- 원격 Supabase에서는 앱이 transaction pooler(6543), 마이그레이션이 direct 또는 session pooler(5432) 연결 문자열을 쓴다. 로컬 스택에는 구분이 없다.
- 새 도메인 용어는 `GLOSSARY.md`에, 되돌리기 어려운 구조 결정은 `docs/adr/`에 남긴다 (`domain-modeling`). 테이블을 더하거나 바꾸면 `docs/domain/project.md` 데이터 모델 표의 `용어` 칸까지 고친다.

## 예: 사용자 소유 테이블
```ts
// packages/db/src/schema/todo.ts
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const todo = pgTable.withRLS(
  "todo",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    completed: boolean("completed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (t) => [index("todo_user_id_created_at_idx").on(t.userId, t.createdAt)],
);
```
