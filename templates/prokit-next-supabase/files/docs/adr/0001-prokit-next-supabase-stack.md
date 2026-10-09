# Supabase Postgres + 자체 관리 Better Auth, 소유권은 서버 코드가 지키고 RLS는 Data API를 막는다

이 프로젝트는 Better-T-Stack(Next.js, oRPC, Drizzle)으로 만들고, DB는 Supabase Postgres(개발은 로컬 Supabase 스택, 병합 전 검증은 원격 스테이징, 운영은 Supabase)를 쓰며, 인증은 BTS가 생성하는 자체 관리 Better Auth를 쓴다. BTS 생성물을 그대로 살리고 인증 벤더 종속을 줄이기 위해 이 조합을 골랐다. 앱은 테이블 소유자 역할로 접속하므로 사용자 데이터 보호는 서버 프로시저의 세션 기반 소유권 검사와 2계정 격리 테스트가 맡는다. Supabase는 `public` 스키마를 Data API로 노출하므로 모든 `public` 테이블에 정책 없는 RLS를 켜서 `anon`·`authenticated` 접근을 막는다. 스키마 변경은 Drizzle `db:generate` 마이그레이션으로만 하고 로컬에서 확인한 뒤 병합 전에 스테이징에 적용한다.

## Considered Options
- Supabase Auth + RLS 정책 + supabase-js: DB가 마지막 방어선이 되지만 BTS가 생성하지 않아 인증·API·데이터 접근 코드를 모두 다시 써야 하고 Supabase에 묶인다.
- Supabase CLI 마이그레이션(`supabase/migrations`, `supabase db push`): Supabase Branching과 바로 연결되지만 Drizzle 스키마와 마이그레이션 정본이 둘이 된다.
- RLS 없이 Data API만 끄기: 대시보드 설정 하나에 보안이 걸리고, 설정이 다시 켜지면 Better Auth 테이블(세션, 계정)이 그대로 노출된다.

## Consequences
- 새 프로시저마다 소유권 검사를 빠뜨릴 위험이 있다. dev-cycle D 케이스의 격리 테스트와 `prokit-reviewer(security)`로 막는다.
- 새 테이블마다 RLS를 켜야 한다. Drizzle 테이블은 `pgTable.withRLS`, Better Auth가 생성한 테이블은 커스텀 마이그레이션으로 켜고, dev-cycle E 케이스의 `supabase db advisors` 행과 `prokit-reviewer(db)`로 확인한다.
- `supabase db reset`은 `supabase/migrations`만 다시 적용하므로 Drizzle 스키마가 지워진다. 쓴 뒤에는 `db:migrate`를 다시 실행한다.
- 로컬 스택과 원격 Supabase의 차이(풀러, 역할 권한, Data API 설정)는 로컬에서 드러나지 않는다. 병합 전 스테이징 적용으로 확인하고, 서버리스 배포에서는 transaction pooler(6543) 주소를 쓴다.
