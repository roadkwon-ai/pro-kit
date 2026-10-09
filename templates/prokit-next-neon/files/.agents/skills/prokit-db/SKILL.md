---
name: prokit-db
description: >-
  이 BTS 프로젝트의 packages/db(Drizzle ORM + Postgres, 개발은 로컬 Podman·Docker 컨테이너, 병합 전 검증과 운영은 Neon)를
  만들거나 바꾸거나 검토할 때 사용한다. 테이블, 컬럼, 관계 추가, 스키마 변경, 마이그레이션 생성과 적용, 인덱스, 느린 쿼리,
  로컬 DB 컨테이너, Neon 개발 브랜치, DATABASE_URL 연결 문제를 다룬다. 테이블 추가, 컬럼 추가, 마이그레이션, 스키마,
  인덱스, 쿼리가 느려요, 로컬 DB 띄우기, podman compose, Neon 브랜치, db push 같은 요청에 사용한다.
  프로시저의 권한과 소유권 로직은 prokit-api가 맡는다.
---

# DB: Drizzle + Postgres (개발은 로컬 컨테이너, 병합 전 검증과 운영은 Neon)

## 구조
- 스키마: `packages/db/src/schema/*.ts`(`schema/index.ts`에서 export), 관계: `packages/db/src/relations.ts`
- 마이그레이션: `packages/db/src/migrations/` (drizzle-kit 생성물, 커밋 대상)
- 인증 테이블 `packages/db/src/schema/auth.ts`는 `pnpm auth:generate`가 만든다. 손으로 고치지 않는다.
- 연결: `packages/db/src/index.ts`의 `createDb`(드라이버 `pg`), 환경변수 `DATABASE_URL`(varlock `.env.schema`, 값은 `apps/web/.env`)
- 개발 DB: `packages/db/docker-compose.yml`의 로컬 Postgres. `apps/web/.env`의 `DATABASE_URL`은 이 로컬 DB를 가리킨다. 띄우는 법과 포트 충돌은 [references/migration-flow.md](references/migration-flow.md)의 로컬 DB 절.

## 공식 스킬 연결
| 상황 | 읽을 스킬 |
|---|---|
| 컬럼 타입, 제약, 인덱스, 쿼리 작성과 튜닝 | `supabase-postgres-best-practices` (서비스와 무관한 Postgres 규칙) |
| 연결(pooled와 direct), 마이그레이션 운영, 검색 | `neon-postgres` (먼저 상위 `neon`) |
| 병합 전 검증용 브랜치 만들기와 리셋 | `neon-postgres-branches` |
| DB 비용, 데이터 전송량(egress), 과다 조회 점검 | `neon-postgres-egress-optimizer` (운영 DB 통계 조회와 `pg_stat_statements` 설치·초기화는 사용자가 요청할 때만 한다) |
| Neon 부가 기능: 오래 도는 함수, 파일 저장, LLM 호출 | `neon-functions`, `neon-object-storage`, `neon-ai-gateway` (선택 묶음 `ops`. 새 서비스 의존이 생기므로 도입 전에 사용자에게 묻고 `docs/adr/`에 남긴다) |

## 스키마 변경 절차
1. 스키마 파일을 고친다. 새 테이블은 `schema/index.ts`에서 export한다.
2. `.dev-cycle.json`의 `commands.dbGenerate`(예: `pnpm --filter @<프로젝트>/db db:generate`)로 SQL 마이그레이션을 만든다. 루트 `pnpm db:generate`는 turbo interactive 태스크라 TTY 없는 에이전트 셸에서 실패하므로 쓰지 않는다.
3. 생성된 SQL을 읽고 의도하지 않은 `DROP`, 타입 축소, 데이터 손실이 없는지 확인한다.
4. **로컬 개발 DB**에 `commands.dbMigrate`로 적용하고, 앱과 테스트로 확인한다.
5. **병합 전**에 Neon 개발 브랜치에 한 번 더 적용한다. 브랜치의 direct URL을 환경변수로 넘겨 `commands.dbMigrate`를 실행한다. 절차는 [references/migration-flow.md](references/migration-flow.md).
6. 마이그레이션 파일을 스키마 변경과 함께 커밋 대상으로 둔다.

## 금지
- 공유 브랜치(main, production)에 `db:push`를 쓰지 않는다. `db:push`는 로컬 DB나 버릴 개인 브랜치에서 실험할 때만 쓴다.
- `packages/db`의 DB 드라이버를 `@neondatabase/serverless`(neon-http)로 바꾸지 않는다. 로컬 Postgres에 붙지 않는다.
- 이미 적용된 마이그레이션 파일을 고치지 않는다. 고칠 일이 있으면 새 마이그레이션을 만든다. drizzle 스냅샷(`snapshot.json`)을 손으로 고치거나 마이그레이션 폴더를 직접 만들지 않는다. 스키마 파일을 고치고 `dbGenerate`로 만든다(`--custom`이 만든 빈 `migration.sql`에 SQL을 쓰는 것은 된다).
- 운영 DB, 실제 사용자 데이터, 연결 문자열의 비밀번호는 사용자의 명시적 요청 없이 다루지 않는다.

## 설계 규칙
- 사용자 소유 테이블에는 `userId`(`text`, `user.id` FK, `onDelete` 동작 명시)와 그 인덱스를 둔다. 소유권 검사는 `prokit-api`가 한다.
- 시각 컬럼은 `timestamp("created_at", { withTimezone: true }).defaultNow().notNull()` 형태로 둔다.
- 조회 조건과 정렬에 쓰는 컬럼에는 인덱스를 둔다. 여러 컬럼 조건이면 복합 인덱스를 검토한다.
- 파괴적 변경(컬럼 삭제, 이름 변경, 타입 축소)은 expand와 contract 두 단계로, 각각 별도 마이그레이션과 별도 라운드로 나눈다. 예는 [references/migration-flow.md](references/migration-flow.md).
- Neon에서는 앱이 pooled 연결 문자열, 마이그레이션이 direct 연결 문자열을 쓴다 (`neon-postgres`의 연결 절). 로컬 컨테이너에는 구분이 없다.
- 새 도메인 용어는 `GLOSSARY.md`에, 되돌리기 어려운 구조 결정은 `docs/adr/`에 남긴다 (`domain-modeling`). 테이블을 더하거나 바꾸면 `docs/domain/project.md` 데이터 모델 표의 `용어` 칸까지 고친다.

## 예: 사용자 소유 테이블
```ts
// packages/db/src/schema/todo.ts
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const todo = pgTable(
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
