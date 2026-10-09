# 개발 절차 (dev-cycle)

이 문서는 `scripts/dev-cycle.mjs`가 읽는 **케이스별 절차 정본**이다. 프로젝트에 맞게 행을 고쳐도 된다. 이 문서를 고치는 일 자체가 케이스 H(하네스) 변경이다.

## 작성 규칙

- 케이스 블록은 `### <문자>. <이름>` 제목으로 시작하고, `### 공통` 블록은 모든 대조표 끝에 붙는다.
- 블록 안에서 `- `로 시작하는 줄만 행이 된다. 설명은 이 절처럼 `##` 제목 아래에 쓴다.
- 행 형식은 `- [태그] 단계 → 증거 형식`이다. `verify`·`review` 태그 행은 C 케이스가 상속한다.
- `@include X Y`는 다른 케이스의 행을 그 자리에 펼친다. `@inherit verify review`는 경로로 판정된 케이스에서 해당 태그 행만 가져온다. 같은 문구의 행은 한 번만 들어간다.
- 인증 민감 경로(`.dev-cycle.json`의 `authPaths`)를 건드리면 러너가 `[review] prokit-reviewer(security)` 행을 자동으로 붙인다.
- `[confirm]` 행(사용자 확인)은 증거 칸을 N/A·PASS·blocked·미실행·대기 같은 건너뛰기 표시로 채울 수 없다. audit이 거부하고 `close --partial`로도 닫히지 않는다. 라운드를 닫은 뒤의 커밋·push, 릴리스, 배포는 `prokit-dev-cycle`의 "5. 종료"를 따른다.

## 케이스

### A. 경미
- [verify] 타입·린트 검사 (commands.typecheck, commands.lint) → 명령과 결과 요약

### B. UI
- impeccable context 실행, PRODUCT.md·DESIGN.md 확인 (새 작업이면: PRODUCT.md가 없을 때 impeccable init, DESIGN.md가 없고 BTS 기본 화면뿐일 때 디자인 카탈로그 스타일 1~3위와 직접 정하기 중 사용자 선택. 카탈로그는 use-design-md로 받고, 직접 정하면 마감에서 기록) → 출력 요약, 고른 스타일, DESIGN.md lint 결과
- impeccable shape 브리프 확정 (좁은 개선이면 N/A: 사유) → 브리프 경로
- 구현 (prokit-ui, prokit-web, 컴포넌트 조합·추가는 shadcn, 컴포넌트·훅 작성은 vercel-react-best-practices) → 변경 파일 요약, 사용한 스킬
- [verify] 타입·린트·빌드 → 명령과 결과
- [verify] next-dev-loop 런타임 확인과 ego-browser(없으면 agent-browser)로 desktop·mobile 스크린샷 → 확인한 경로, 오류 예산(콘솔·개발 오버레이·get_errors·서버 로그, 환경 탓도 빼지 않음) 수, tasks/evidence/ 경로
- [review] impeccable critique → Design Health 점수, P0/P1 목록
- [review] impeccable audit과 web-design-guidelines 코드 검사 → 점수(/20), 접근성 점수, web-design-guidelines 위반 수
- 수정과 impeccable polish를 한 번에 → 반영 내역
- [verify] 재확인 1회 → 스크린샷 경로와 점수
- [review] prokit-reviewer(code) → verdict, max_severity, 반영·기각 내역
- DESIGN.md 갱신 여부 (impeccable document. 카탈로그에서 들여온 파일은 merge와 diff 확인) → 갱신 내역과 lint 결과 또는 N/A: 사유

### C. 버그
- 재현 테스트 작성, 실패 확인 (systematic-debugging) → 테스트 이름과 실패 출력
- 수정 → 변경 파일 요약
- [verify] 재현 테스트 통과 → 통과 출력
- @inherit verify review

### D. 서버·API
- zod 입출력 계약 정의 (prokit-api) → 프로시저 이름과 스키마 위치
- 구현 (protectedProcedure, 세션 기반 소유자, test-driven-development로 격리 테스트부터, Better Auth 설정은 better-auth-best-practices) → 변경 파일 요약, 사용한 스킬
- [verify] 2계정 격리 테스트 → 테스트 이름과 통과 출력
- [verify] 타입·린트·테스트 → 명령과 결과
- [review] prokit-reviewer(code) → verdict, max_severity, 반영·기각 내역

### E. DB
- 스키마 수정 + dbGenerate, 생성 SQL 검토, 새 테이블 RLS 확인 (prokit-db, 컬럼 타입·제약·인덱스·RLS는 supabase-postgres-best-practices) → 마이그레이션 파일 경로와 요약, 사용한 스킬
- [verify] 타입·린트 검사 (commands.typecheck, commands.lint) → 명령과 결과 요약
- [verify] 로컬 Supabase DB에 dbMigrate 적용 → 호스트:포트와 출력 요약
- [verify] supabase db advisors 보안 검사 (로컬, supabase 스킬의 보안 체크리스트) → RLS 미적용 테이블 0건 등 결과 요약
- [verify] 병합 전 Supabase 스테이징에 dbMigrate 적용과 advisors → 프로젝트 ref, 출력 요약, advisors 결과 또는 N/A: Supabase 미연결(packages/db/supabase/.temp/project-ref 없음)
- 파괴적 변경 여부 판단 → 없음 또는 2단계 계획
- [review] prokit-reviewer(db) → verdict, max_severity, 반영·기각 내역

### F. 신규 기능
- 스펙 작성 (brainstorming + ponytail 사다리로 범위 줄이기, 스펙에 '만들지 않는 것' 절과 인수 조건·테스트 시나리오 절(정상·빈·오류·경계 상태, 너비·테마·키보드), 새 용어는 domain-modeling으로 GLOSSARY.md에 바로 기록, 선택: /grill-with-docs, UI가 있으면 impeccable shape 브리프 링크) → 사용한 스킬, 스펙 경로, 추가·변경한 용어
- 구현 계획 (writing-plans, 바꿀 계층의 prokit-* 스킬과 그 공식 스킬 연결 표를 읽고 계획의 스키마·API·화면 결정에 반영) → 사용한 스킬과 계획 경로
- [review] 계획 리뷰 (plan-eng-review, UI가 있으면 plan-design-review, ponytail-review로 계획의 과설계 확인) → 결과 요약, ponytail-review 반영·기각 또는 N/A: 사유
- 구현 방식 (subagent-driven-development + test-driven-development, ponytail 모드) → 사용한 스킬과 위임 내역
- @include E D B
- [verify] next-dev-loop 통합 런타임 확인 → 확인한 경로와 결과
- 공통화·리팩토링·최적화 점검 (이번 라운드가 바꾼 파일과 같은 디렉터리에 ponytail-review, 한쪽이 이번 diff인 반복 코드·UI는 공통 모듈·packages/ui로 뽑고 나머지는 백로그로, 한 번만 쓰는 추상화는 걷어 냄, 빌드 출력의 라우트 크기와 새 의존성·글꼴·이미지 확인) → 반영 내역, 재확인(타입·린트·테스트·화면) 결과, 미룬 항목과 기록 위치
- [review] prokit-reviewer(code) 전체 diff 최종 리뷰 → verdict, max_severity, 반영·기각 내역
- [verify] 사용자 흐름 QA (스펙의 테스트 시나리오 전부를 ego-browser(없으면 agent-browser)로, 오류 예산은 깨끗한 프로필(agent-browser)로도, 보고만) → 시나리오별 통과·실패, 오류 예산 수
- QA 발견 수정과 재QA (문제와 개선점을 고친 뒤 타입·린트·빌드·테스트를 다시 돌리고, 수정 diff에 prokit-reviewer(code)와 ponytail-review를 받고, 실패한 시나리오와 오류 예산을 다시 확인. 발견이 없으면 N/A: 사유) → 수정 내역, 재검사·재리뷰·재QA 결과

### H. 하네스
- [verify] pnpm agents:check → 출력
- [verify] pnpm skills:check → 출력
- [verify] pnpm dev-cycle case·status 실행 확인 → 출력 요약
- 스킬을 바꿨으면 skill-creator eval 재실행 → 벤치마크 경로 또는 N/A: 사유

### 공통
- 문서 영향 확인 (GLOSSARY.md와 docs/adr/는 domain-modeling 형식, docs/domain/project.md, 미룬 지적은 tasks/todo.md 백로그로) → 갱신 내역 또는 N/A: 사유
- [confirm] 사용자 확인 (결과를 사용자에게 보여 주고 사용자가 직접 보거나 써 본 뒤 확인한다. N/A 불가) → 확인한 내용과 날짜
