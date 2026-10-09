# 마이그레이션 흐름 (로컬 DB → Neon 브랜치)

일상 개발은 로컬 컨테이너 Postgres에서 하고, 병합 전에 Neon 개발 브랜치에서 한 번 더 확인한다. Neon CLI와 MCP 명령의 정확한 문법은 설치된 `neon-postgres-branches`, `neon-postgres` 스킬을 따른다.

## 로컬 DB
- 시작: `packages/db`에서 `podman compose up -d`. Docker를 쓰면 `pnpm --filter @<프로젝트>/db db:start`(스크립트가 `docker compose`를 부른다). Linux·WSL의 Podman이 `short-name "postgres:18" did not resolve`로 멈추면 사용자에게 `~/.config/containers/registries.conf`에 `unqualified-search-registries = ["docker.io"]`를 넣어 달라고 요청한다(사용자 설정 파일이라 에이전트가 바꾸지 않는다).
- 포트: compose의 `ports` 왼쪽 값이 호스트 포트다. 같은 포트를 쓰는 Postgres(Homebrew 등)가 이미 있으면 컨테이너는 오류 없이 뜨지만 `localhost` 접속은 기존 서버로 간다. `lsof -nP -iTCP:<포트> -sTCP:LISTEN`에 `postgres` 프로세스가 보이면 README의 `DB_PORT` 방식(compose `"${DB_PORT:-5432}:5432"` + `packages/db/.env`)으로 포트를 바꾸고 `apps/web/.env`의 `DATABASE_URL`도 맞춘다.
- 테스트 DB: 같은 컨테이너에 따로 만든다. `podman exec <컨테이너> createdb -U postgres <이름>_test` → URL은 `postgresql://postgres:<compose 비밀번호>@localhost:<호스트 포트>/<이름>_test`
- 초기화: `podman compose down -v`는 볼륨까지 지운다. 사용자가 요청할 때만 쓴다.

## 순서
1. **스키마 수정**: `packages/db/src/schema/<이름>.ts`. 새 파일이면 `schema/index.ts`에서 export한다.
2. **생성**: `commands.dbGenerate`(예: `pnpm --filter @<프로젝트>/db db:generate`) → `packages/db/src/migrations/<시각>_<이름>/`에 `migration.sql`과 스냅샷이 생긴다. SQL을 직접 써야 하면(데이터 복사 등) `pnpm --filter @<프로젝트>/db exec drizzle-kit generate --custom --name=<이름>`으로 빈 마이그레이션을 만든다. `--custom`은 스냅샷을 갱신하지 않는다. drizzle 스키마로 표현할 수 있는 변경(컬럼, 테이블, 인덱스)은 스키마 파일을 고쳐 `dbGenerate`로 만들고, 스키마로 표현할 수 없는 SQL(데이터 복사, 트리거·함수)만 `--custom`에 넣는다. 마이그레이션을 다 만든 뒤 `dbGenerate`를 한 번 더 실행해 새 마이그레이션이 생기지 않는지(`No schema changes`) 확인한다.
3. **검토**: 생성 SQL을 읽는다. 의도하지 않은 `DROP`, 타입 축소, 기존 행이 있는 테이블에 기본값 없는 `NOT NULL` 추가, 빠진 인덱스, FK의 `ON DELETE`를 확인한다.
4. **로컬 적용**: `commands.dbMigrate`(예: `pnpm --filter @<프로젝트>/db db:migrate`). `apps/web/.env`의 로컬 URL을 쓴다. 테스트 DB에도 `DATABASE_URL='<로컬 테스트 DB URL>'`을 붙여 적용한다.
   루트 `pnpm db:*`는 turbo interactive 태스크라 TTY 없는 에이전트 셸에서 `Cannot run interactive task`로 실패하므로 `--filter`로 패키지 스크립트를 직접 부른다. drizzle-kit 출력에는 대상이 나오지 않으므로 실행 전에 대상을 확인한다: 로컬이면 호스트:포트가 compose 컨테이너의 것인지(`podman ps`의 포트 매핑, Docker면 `docker ps`), Neon이면 엔드포인트 호스트(`ep-…`)가 개발 브랜치의 것인지.
5. **병합 전 Neon 확인**: `dev/<작업명>` 브랜치를 만들고(`neon-postgres-branches`, 실데이터가 민감하면 schema-only) **direct** 연결 문자열로 적용한다.
   ```bash
   url="$(neon cs dev/<작업명>)" && printf '%s\n' "$url" | sed -nE 's#^[a-z]+://([^/]*@)?([^/:?]*).*#\2#p'   # 호스트만 출력해 확인
   DATABASE_URL="$url" pnpm --filter @<프로젝트>/db db:migrate                            # commands.dbMigrate
   ```
   브랜치 이름을 빠뜨리면 `neon cs`는 기본(운영) 브랜치 URL을 준다. 출력한 호스트가 개발 브랜치의 것인지 확인한 뒤에 둘째 줄을 실행한다. 첫 줄이 아무것도 출력하지 않으면 URL 형식이 예상과 다른 것이다. URL을 그대로 출력해 확인하지 말고 멈춘다(비밀번호가 기록에 남는다). 두 줄은 따로 실행한다. 셸이 변수를 유지하지 않으면 둘째 줄의 `$url` 자리에 `$(neon cs dev/<작업명>)`를 다시 쓴다. varlock은 프로세스 환경변수를 `.env`보다 우선한다. 프로젝트가 아직 Neon에 연결되지 않았으면(루트에 `.neon` 없음) 이 단계는 대조표에 `N/A: Neon 미연결(.neon 없음)`으로 적고, 연결한 뒤 첫 병합 전에 한다.
6. **증거**: 대조표에 대상(로컬 호스트:포트 또는 Neon 브랜치 이름)과 `db:migrate` 출력 요약을 적는다. 연결 문자열과 비밀번호는 적지 않는다.
7. **정리**: 작업이 병합되면 Neon 개발 브랜치를 지우거나 만료를 설정한다.
8. **운영 적용**: 병합·배포 때 운영 브랜치에 같은 방법(호스트 확인 → `commands.dbMigrate`)으로 적용한다. 운영 DB이므로 사용자가 직접 하거나, 사용자가 명시적으로 요청할 때만 한다(라운드 끝 production 배포에서 적용할 목록을 보여 주고 동의를 받은 경우 포함).

## 배포 환경 (Vercel)
배포 절차는 `prokit-deploy` 스킬이 맡는다. 여기에는 환경별 DB만 적는다.

| 배포 대상 | DB | Vercel `DATABASE_URL` | 배포 전 적용 |
|---|---|---|---|
| develop (Preview) | 오래 두는 `develop` 브랜치 | `develop`의 pooled 주소 | 5번과 같은 방법으로 `develop`에 적용 |
| production | 기본(운영) 브랜치 | 운영 브랜치의 pooled 주소 | 8번 |

- `develop` 브랜치는 처음 한 번 운영 브랜치에서 만든다(`neon-postgres-branches`). 작업별 `dev/<작업명>` 브랜치(5번)는 그대로 쓰고 병합 뒤 지운다.
- 서버리스 앱은 pooled 주소(`-pooler`)를 쓰고, 마이그레이션은 direct 주소(`neon cs <브랜치>`)로 한다. Vercel에는 값이 출력되지 않게 셸 변수로 넘긴다. 느린 명령을 `vercel env add`에 바로 파이프로 넘기면 값이 비어 실패한다. 두 줄은 따로 실행한다.
  ```bash
  neon cs develop --pooled | sed -nE 's#^[a-z]+://([^/]*@)?([^/:?]*).*#\2#p'      # 호스트만 출력해 develop 브랜치의 -pooler 호스트인지 확인한다
  url="$(neon cs develop --pooled)" && printf '%s' "$url" | vercel env add DATABASE_URL preview --sensitive --yes
  ```
  production은 `develop` 대신 운영 브랜치 이름, `preview` 대신 `production`으로 같은 두 줄을 실행한다. 브랜치 이름을 빠뜨리면 기본(운영) 브랜치 URL이 나온다. 첫 줄이 아무것도 출력하지 않으면 URL을 그대로 출력하지 말고 멈춘다.

## 파괴적 변경: expand → contract
예: `todo.title`을 `todo.name`으로 바꾸기 (운영 데이터가 있을 때)
1. **expand 라운드**: 스키마에 `name`을 nullable로 더해 `dbGenerate`로 마이그레이션을 만들고, 기존 값을 복사하는 SQL(`UPDATE todo SET name = title WHERE name IS NULL`)은 `--custom` 마이그레이션으로 따로 만든다. 새 코드는 `name`에 쓰고 읽되, 배포 전환 동안 `title`도 채운다. 아직 떠 있는 옛 코드는 `title`만 쓰므로 이 단계에서 `name`에 `NOT NULL`을 걸지 않는다.
2. **contract 라운드**: 모든 코드가 `name`만 쓰는 것이 배포된 뒤, 전환 중에 옛 코드가 넣은 행을 한 번 더 복사하고 `name`을 `NOT NULL`로 바꾸고 `title`을 삭제한다. 마이그레이션은 폴더 이름의 시각 순서로 적용되므로 복사용 `--custom`을 먼저 만들고, 그다음 스키마를 고쳐 `dbGenerate`한다.
drizzle-kit이 rename인지 묻더라도, 운영 데이터가 있으면 한 번의 rename 대신 위 두 단계를 쓴다.

## db:push를 쓰는 경우
로컬 DB나 버릴 개인 브랜치에서 스키마를 빠르게 실험할 때만 쓴다. 실험이 끝나면 `db:generate`로 정식 마이그레이션을 만들고, 깨끗한 로컬 테스트 DB와 병합 전 Neon 개발 브랜치에 다시 적용해 확인한다. push로 바꾼 DB에는 마이그레이션 기록이 없어 다음 `db:migrate`가 이미 있는 테이블의 CREATE에서 실패한다. 그 DB는 사용자에게 알리고 비운 뒤(`podman compose down -v`는 사용자 확인 후) 다시 `db:migrate`한다.
