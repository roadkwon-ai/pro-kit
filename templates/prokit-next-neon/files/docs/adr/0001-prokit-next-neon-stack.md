# Neon + 자체 관리 Better Auth, 소유권은 서버 코드가 지킨다

이 프로젝트는 Better-T-Stack(Next.js, oRPC, Drizzle)으로 만들고, DB는 Postgres(개발은 로컬 컨테이너, 병합 전 검증과 운영은 Neon), 인증은 BTS가 생성하는 자체 관리 Better Auth를 쓴다. BTS 생성물을 그대로 살리고 인증 벤더 종속을 줄이기 위해 이 조합을 골랐다. RLS를 쓰지 않으므로 사용자 데이터 보호는 서버 프로시저의 세션 기반 소유권 검사와 2계정 격리 테스트가 맡고, 스키마 변경은 Drizzle `db:generate` 마이그레이션으로만 하며 로컬 DB에서 확인한 뒤 병합 전에 Neon 개발 브랜치에서 검증한다. DB 드라이버는 로컬과 Neon에 모두 붙는 `pg`(BTS `--db-setup docker` 생성물)를 쓴다.

## Considered Options
- Supabase Auth + RLS: DB가 마지막 방어선이 되지만 BTS가 생성하지 않아 연결 코드가 늘고 Supabase에 묶인다.
- Neon 전용 드라이버(`@neondatabase/serverless`, BTS `--db-setup neon` 생성물): 서버리스 HTTP 연결에 맞지만 로컬 Postgres에 붙지 않아 오프라인 개발이 막히고, 대화형 트랜잭션을 지원하지 않는다.
- Neon Auth (Managed Better Auth): 인증 상태가 DB 브랜치와 함께 복제되지만 플러그인 목록이 고정되고 BTS 생성 범위 밖이다.

## Consequences
- 새 프로시저마다 소유권 검사를 빠뜨릴 위험이 있다. dev-cycle D 케이스의 격리 테스트와 `prokit-reviewer(security)`로 막는다.
- 로컬 Postgres와 Neon의 차이(풀러, 확장 버전, 일시 정지 후 첫 연결)는 로컬에서 드러나지 않는다. 병합 전 Neon 개발 브랜치 적용으로 확인하고, 서버리스 배포에서는 Neon 풀러(`-pooler`) 주소를 쓴다.
