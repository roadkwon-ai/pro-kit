---
name: prokit-db
description: >-
  이 Better-T-Stack 프로젝트의 packages/db(Drizzle ORM + Postgres, 개발은 로컬 Podman·Docker 컨테이너, 병합 전 검증과 운영은 Neon)를
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
이 스킬은 Main이 DB 계층(스키마, 마이그레이션, 로컬·원격 DB) 일을 나누고 맡기고 검수할 때 쓴다. 표의 공식 스킬 가운데 맡는 에이전트가 있는 것은 Main이 읽지 않는다. 위임 지시(packet)에 스킬 이름과 경로(`.agents/skills/<이름>/SKILL.md`)를 넣어 그 에이전트가 읽고 따르게 하고, 보고의 "읽은 스킬"과 스킬 기록으로 실제로 읽었는지 본 뒤 "Main 검수" 칸을 확인한다. 맡는 에이전트가 Main인 스킬은 외부 DB에 적용하는 일이라 Main이 직접 읽고 한다. 배치의 정본은 `skills.manifest.json`의 `performers`이고 바꾸는 일은 `prokit-skills-assign`이 맡는다(절차는 `prokit-dev-cycle`의 [위임과 전문 스킬 프로토콜](../prokit-dev-cycle/references/delegation.md) "공식 스킬 위임").

| 상황 | 공식 스킬 | 맡는 에이전트 | Main 검수 |
|---|---|---|---|
| 컬럼 타입, 제약, 인덱스, 쿼리 작성과 튜닝 | `supabase-postgres-best-practices` (서비스와 무관한 Postgres 규칙) | `prokit-db-builder`. 리뷰는 `prokit-reviewer`(db) | 생성 SQL 검토(데이터 손실, 파괴적 변경)와 FK 인덱스가 보고에 있는지 |
| 연결(pooled와 direct), 마이그레이션 운영, 검색 | `neon-postgres` (먼저 상위 `neon`) | `prokit-db-builder`. 리뷰는 `prokit-reviewer`(db) | 상위 `neon`도 읽었는지, 연결 문자열이 출력·파일에 없는지 |
| 병합 전 검증용 브랜치 만들기와 리셋 | `neon-postgres-branches` (먼저 상위 `neon`) | Main(원격 브랜치에 적용하는 일) | 브랜치 이름과 적용 출력 |
| DB 비용, 데이터 전송량(egress), 과다 조회 점검 | `neon-postgres-egress-optimizer` (먼저 상위 `neon`. 운영 DB 통계 조회와 `pg_stat_statements` 설치·초기화는 사용자가 요청할 때만 한다) | `prokit-db-builder`. 리뷰는 `prokit-reviewer`(db) | 개선안에 규칙 이름과 바뀐 쿼리가 있는지 |
| Neon 부가 기능: 오래 도는 함수, 파일 저장, LLM 호출 | `neon-functions`, `neon-object-storage`, `neon-ai-gateway` (선택 묶음 `ops`. 새 서비스 의존이 생기므로 도입 전에 사용자에게 묻고 `docs/adr/`에 남긴다) | 도입을 정한 뒤 `prokit-skills-assign`으로 배치한다 | `docs/adr/` 기록 |

## 위임
외부 전문 스킬이나 수행자에게 DB 작업을 넘길 때만 [위임과 전문 스킬 프로토콜](../prokit-dev-cycle/references/delegation.md)을 읽는다. 실제 provider의 scope·의존성·side effect를 확인하고, Drizzle 마이그레이션과 DB별 운영 계약은 유지한다.

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
