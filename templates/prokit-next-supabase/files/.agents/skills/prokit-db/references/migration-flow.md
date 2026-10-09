# 마이그레이션 흐름 (로컬 Supabase → 스테이징 → 운영)

일상 개발은 로컬 Supabase 스택에서 하고, 병합 전에 원격 스테이징 프로젝트에서 한 번 더 확인한다. Supabase CLI 문법과 원격 연결 문자열의 종류는 설치된 `supabase` 스킬을 따른다. 명령은 모두 `packages/db`에서 실행한다(`supabase/config.toml`이 있는 곳).

## 로컬 DB
- 컨테이너 엔진: Podman이면 셸마다 `DOCKER_HOST`를 먼저 설정한다. macOS(`podman machine start` 이후)는 `export DOCKER_HOST="unix://$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}')"`, Linux·WSL(`systemctl --user enable --now podman.socket` 이후)은 `export DOCKER_HOST="unix://$XDG_RUNTIME_DIR/podman/podman.sock"`이다. Docker면 필요 없다. Podman 4.x(Ubuntu 24.04)에서는 `supabase stop`이 `failed to list containers`로 실패한다. 그러면 사용자에게 알리고 Podman 5 이상이나 Docker를 안내한다.
- 처음 한 번: `supabase init`이 없으면 실행한다. `supabase/config.toml`의 `project_id`는 기본값이 디렉터리 이름 `"db"`다. 한 기기에서 BTS 프로젝트를 여럿 띄우면 컨테이너 이름(`supabase_db_<project_id>`)과 포트가 겹치므로 프로젝트 이름으로 바꿔 커밋한다. 다른 Supabase 프로젝트가 이미 54322를 쓰면 `[db] port`도 바꾸고 `apps/web/.env`의 `DATABASE_URL`을 맞춘다.
- 시작: 앱은 Postgres만 쓰므로 DB만 띄운다.
  ```bash
  supabase start -x gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
  ```
  Studio가 필요하면 `-x` 목록에서 `studio,postgres-meta`를 뺀다. 상태와 URL은 `supabase status`.
- 연결: `postgresql://postgres:postgres@127.0.0.1:54322/postgres` (BTS가 `apps/web/.env`에 넣어 둔 값).
- 중지: `supabase stop`(데이터 유지). `supabase stop --no-backup`과 `supabase db reset`은 로컬 데이터를 지우므로 사용자가 요청할 때만 쓴다. `db reset`은 비어 있는 `supabase/migrations`만 적용하므로 끝나면 `commands.dbMigrate`를 다시 실행한다.
- 테스트 DB: 같은 컨테이너에 따로 만든다. `podman exec supabase_db_<project_id> createdb -U postgres <이름>_test`(Docker면 `docker exec`) → URL은 `postgresql://postgres:postgres@127.0.0.1:54322/<이름>_test`

## 순서
1. **스키마 수정**: `packages/db/src/schema/<이름>.ts`. 새 테이블은 `pgTable.withRLS`로 만들고 `schema/index.ts`에서 export한다.
2. **생성**: `commands.dbGenerate`(예: `pnpm --filter @<프로젝트>/db db:generate`) → `packages/db/src/migrations/<시각>_<이름>/`에 `migration.sql`과 스냅샷이 생긴다. SQL을 직접 써야 하면(인증 테이블 RLS, 데이터 복사) `pnpm --filter @<프로젝트>/db exec drizzle-kit generate --custom --name=<이름>`으로 빈 마이그레이션을 만든다. `--custom`은 스냅샷을 갱신하지 않는다. drizzle 스키마로 표현할 수 있는 변경(컬럼, 테이블, 인덱스, `withRLS` 테이블)은 스키마 파일을 고쳐 `dbGenerate`로 만들고, 스키마로 표현할 수 없는 SQL(데이터 복사, 인증 테이블 RLS, 트리거·함수)만 `--custom`에 넣는다. 마이그레이션을 다 만든 뒤 `dbGenerate`를 한 번 더 실행해 새 마이그레이션이 생기지 않는지(`No schema changes`) 확인한다.
3. **검토**: 생성 SQL을 읽는다. 의도하지 않은 `DROP`, 타입 축소, 기존 행이 있는 테이블에 기본값 없는 `NOT NULL` 추가, 빠진 인덱스, FK의 `ON DELETE`, 새 테이블의 `ENABLE ROW LEVEL SECURITY`를 확인한다.
4. **로컬 적용**: `commands.dbMigrate`(예: `pnpm --filter @<프로젝트>/db db:migrate`). `apps/web/.env`의 로컬 URL을 쓴다. 테스트 DB에도 `DATABASE_URL='<로컬 테스트 DB URL>'`을 붙여 적용한다. varlock은 프로세스 환경변수를 `.env`보다 우선한다.
   루트 `pnpm db:*`는 turbo interactive 태스크라 TTY 없는 에이전트 셸에서 `Cannot run interactive task`로 실패하므로 `--filter`로 패키지 스크립트를 직접 부른다. drizzle-kit 출력에는 대상이 나오지 않으므로 실행 전에 대상 호스트:포트가 로컬 스택(`supabase status`의 DB URL)인지 확인한다.
5. **보안 검사**: `supabase db advisors --local --type security --fail-on error`. RLS를 켜지 않은 `public` 테이블이 있으면 `rls_disabled_in_public`, 토큰·비밀번호 컬럼이 드러나면 `sensitive_columns_exposed`가 ERROR로 나오고 exit 1이다. 결과가 `No issues found`여야 다음 단계로 간다. 개발 DB(`postgres`)에 돌린다. `createdb`로 만든 테스트 DB에는 Supabase의 `anon` 권한이 없어 advisors가 검출하지 않는다.
6. **병합 전 스테이징 확인**: 운영과 다른 Supabase 프로젝트(스테이징)에 적용한다. Supabase Branching을 쓰는 팀이면 개발 브랜치를 스테이징으로 쓴다. 한 번 `supabase link --project-ref <스테이징 ref>`로 연결한다(`supabase/.temp/project-ref`에 기록되고 git이 무시한다). 연결 문자열은 사용자가 셸 환경변수 `STAGING_DATABASE_URL`로 준다(대시보드 Connect의 session pooler, 포트 5432). 파일에 적지 않는다.
   ```bash
   printf '%s\n' "$STAGING_DATABASE_URL" | sed -nE 's#^[a-z]+://([^:@/]*)[^/]*@([^/:?]*).*#\1 \2#p'; cat supabase/.temp/project-ref   # 사용자 이름의 ref와 호스트만 출력해 확인
   DATABASE_URL="$STAGING_DATABASE_URL" pnpm --filter @<프로젝트>/db db:migrate                                        # commands.dbMigrate
   supabase db advisors --db-url "$STAGING_DATABASE_URL" --type security --fail-on error
   ```
   첫 줄에 나온 `postgres.<ref>`의 ref가 스테이징 ref(`project-ref`)와 같은지 확인한 뒤에 둘째 줄을 실행한다. 첫 줄이 아무것도 출력하지 않으면 URL 형식이 예상과 다른 것이다. URL을 그대로 출력해 확인하지 말고 멈춘다(비밀번호가 기록에 남는다). 세 줄은 따로 실행한다. 프로젝트가 아직 스테이징에 연결되지 않았으면(`supabase/.temp/project-ref` 없음) 이 단계는 대조표에 `N/A: Supabase 미연결(packages/db/supabase/.temp/project-ref 없음)`으로 적고, 연결한 뒤 첫 병합 전에 한다. 연결은 됐는데 URL이 없으면 `blocked: STAGING_DATABASE_URL 없음`이다.
7. **증거**: 대조표에 대상(로컬 호스트:포트 또는 스테이징 ref)과 `db:migrate` 출력 요약, advisors 결과를 적는다. 연결 문자열과 비밀번호는 적지 않는다.
8. **운영 적용**: 병합·배포 때 운영 프로젝트에 같은 방법(ref 확인 → `commands.dbMigrate` → advisors `--db-url`)으로 적용한다. 연결 문자열은 사용자가 셸 환경변수 `PROD_DATABASE_URL`(운영의 session pooler, 5432)로 준다. 이때 URL의 ref는 `project-ref`(스테이징)가 아니라 사용자가 알려 준 운영 ref와 비교한다. 운영 DB이므로 사용자가 직접 하거나, 사용자가 명시적으로 요청할 때만 한다(라운드 끝 production 배포에서 적용할 목록을 보여 주고 동의를 받은 경우 포함).

## 원격 연결 문자열
| 용도 | 종류 | 포트 |
|---|---|---|
| 서버리스 앱(Vercel 등)의 `DATABASE_URL` | transaction pooler (`postgres.<ref>@aws-…pooler.supabase.com`) | 6543 |
| 마이그레이션, 장기 실행 서버 | session pooler(IPv4) 또는 direct(`db.<ref>.supabase.co`, IPv6) | 5432 |
transaction pooler에서는 이름 붙인 prepared statement(Drizzle `.prepare("이름")`)를 쓰지 않는다.

## 배포 환경 (Vercel)
배포 절차는 `prokit-deploy` 스킬이 맡는다. 여기에는 환경별 DB만 적는다.

| 배포 대상 | DB | Vercel `DATABASE_URL` | 배포 전 적용 |
|---|---|---|---|
| develop (Preview) | 스테이징 프로젝트 | 스테이징의 transaction pooler(6543) | 6번 |
| production | 운영 프로젝트 | 운영의 transaction pooler(6543) | 8번 |

- 사용자가 셸 환경변수로 준 session pooler URL(스테이징 `STAGING_DATABASE_URL`, 운영 `PROD_DATABASE_URL`)과 transaction pooler는 호스트가 같고 포트만 다르다. 포트를 바꿔 넣고, 넣기 전에 사용자 이름·호스트·포트만 출력해 확인한다(`postgres.<ref>`, `…pooler.supabase.com`, `6543`).
  ```bash
  printf '%s' "$STAGING_DATABASE_URL" | sed -E 's#(pooler\.supabase\.com):5432/#\1:6543/#' | sed -nE 's#^[a-z]+://([^:@/]*)[^/]*@([^/:?]*):([0-9]+).*#\1 \2 \3#p'
  printf '%s' "$STAGING_DATABASE_URL" | sed -E 's#(pooler\.supabase\.com):5432/#\1:6543/#' | vercel env add DATABASE_URL preview --sensitive --yes      # 운영은 PROD_DATABASE_URL, production
  ```
  두 줄은 따로 실행한다. 첫 줄이 아무것도 출력하지 않거나 포트가 6543이 아니면 URL 형식이 예상과 다른 것이다. URL을 그대로 출력하지 말고 둘째 줄을 실행하지 않는다.

## 파괴적 변경: expand → contract
예: `todo.title`을 `todo.name`으로 바꾸기 (운영 데이터가 있을 때)
1. **expand 라운드**: 스키마에 `name`을 nullable로 더해 `dbGenerate`로 마이그레이션을 만들고, 기존 값을 복사하는 SQL(`UPDATE todo SET name = title WHERE name IS NULL`)은 `--custom` 마이그레이션으로 따로 만든다. 새 코드는 `name`에 쓰고 읽되, 배포 전환 동안 `title`도 채운다. 아직 떠 있는 옛 코드는 `title`만 쓰므로 이 단계에서 `name`에 `NOT NULL`을 걸지 않는다.
2. **contract 라운드**: 모든 코드가 `name`만 쓰는 것이 배포된 뒤, 전환 중에 옛 코드가 넣은 행을 한 번 더 복사하고 `name`을 `NOT NULL`로 바꾸고 `title`을 삭제한다. 마이그레이션은 폴더 이름의 시각 순서로 적용되므로 복사용 `--custom`을 먼저 만들고, 그다음 스키마를 고쳐 `dbGenerate`한다.
drizzle-kit이 rename인지 묻더라도, 운영 데이터가 있으면 한 번의 rename 대신 위 두 단계를 쓴다.

## db:push를 쓰지 않는다
Supabase DB에는 로컬이라도 `db:push`(`drizzle-kit push`)를 쓰지 않는다(2026-09-27 로컬 스택에서 확인).
- `drizzle.config.ts`에 `schemaFilter`가 없으면 push가 DB 전체를 스키마와 비교해 Supabase 내부 스키마(`auth`, `storage`, `realtime`, `vault`, `extensions` 등)를 지우는 변경을 만들고 데이터 손실 확인을 요구한다.
- `schemaFilter: ["public"]`를 넣어도 Better Auth 테이블은 스키마 파일에 RLS가 없으므로 `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`를 적용한다.
스키마를 빠르게 실험할 때도 `db:generate` → `db:migrate`로 로컬에 적용하고, 버릴 실험이면 마이그레이션 폴더를 지운 뒤 사용자에게 알리고 `supabase db reset`(데이터 삭제) → `db:migrate`로 되돌린다.
