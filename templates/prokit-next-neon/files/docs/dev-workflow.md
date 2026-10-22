# 개발 절차 (dev-cycle)

이 문서는 `scripts/dev-cycle.mjs`가 읽는 **케이스별 절차 정본**이다. 프로젝트에 맞게 행을 고쳐도 된다. 이 문서를 고치는 일 자체가 케이스 H(하네스) 변경이다.

## 작성 규칙

- 케이스 블록은 `### <문자>. <이름>` 제목으로 시작하고, `### 공통` 블록은 모든 대조표 끝에 붙는다.
- 블록 안에서 `- `로 시작하는 줄만 행이 된다. 설명은 이 절처럼 `##` 제목 아래에 쓴다.
- 행 형식은 `- [태그] 단계 → 증거 형식`이다. `verify`·`review` 태그 행은 C 케이스가 상속한다.
- `@include X Y`는 다른 케이스의 행을 그 자리에 펼친다. `@inherit verify review`는 경로로 판정된 케이스에서 해당 태그 행만 가져온다. 같은 문구의 행은 한 번만 들어간다.
- 인증 민감 경로(`.dev-cycle.json`의 `authPaths`)를 건드리면 러너가 `[review] prokit-reviewer(security)` 행을 자동으로 붙인다.
- 러너가 맨 앞에 붙이는 행도 있다. D·E·F 표는 그 계층 패키지(`packages/api`, E는 `packages/db`)에 `test` 스크립트가 없으면 `vitest 도입(최초 1회)` 행, `--task`로 연 라운드는 Task 세부 계획과 그 리뷰 행, `--plan`으로 연 라운드는 정밀 분석(기존 프로젝트만)·진행 계획 문서·계획 리뷰 행이다. 이 행들은 이 문서에 적지 않는다.
- `[confirm]` 행(사용자 확인)은 증거 칸을 N/A·PASS·blocked·미실행·대기 같은 건너뛰기 표시로 채울 수 없다. audit이 거부하고 `close --partial`로도 닫히지 않는다. 라운드를 닫은 뒤의 커밋·push, 릴리스, 배포는 `prokit-dev-cycle`의 "5. 종료"를 따른다.
- 위임은 `prokit-dev-cycle`의 `references/delegation.md`를 따른다. provider의 실제 내용·hash·scope·의존성·capability·side effect와 snapshot·evidence packet을 확인한 뒤 한 작업 단위에 한 수행 흐름만 둔다. 고위험 미검사는 parked 또는 degraded로 남기며 PASS로 적지 않는다.

검사의 배정·재사용·재시도는 `prokit-dev-cycle/references/execution-efficiency.md`를 따른다. 구현자는 배정된 회귀 검사를 하고 전역 타입·린트·빌드는 통합 담당자가 실행한다. 이후 수정에서는 실패한 검사와 입력·공통 소비자가 바뀐 검사만 다시 확인하며, 전문 리뷰 증거를 재사용해도 `prokit-reviewer`의 현재 결과 최종 검수는 생략하지 않는다.

`pnpm dev-cycle archive [--title "제목"]`은 활성 라운드와 미완료 항목을 보존한 채 대조표 밖의 완료한 `[x]` 일반 할 일·백로그만 보관한다. 끝난 하위 항목에는 부모 문맥을 붙인다. `close`는 audit과 실제 사용자 확인 뒤에 대조표와 완료한 일반 할 일·백로그를 함께 KST 날짜의 `YYYY-MM-DD-제목.md`에 보관한다. 같은 이름은 `-2`부터 이어 붙이고, `tasks/archive/README.md` 색인과 `tasks/todo.md`의 색인 링크를 갱신한다. 기존 월별 기록은 보존한다.

## 케이스

### A. 경미
- [verify] 타입·린트 검사 (commands.typecheck, commands.lint) → 명령과 결과 요약

### B. UI
- impeccable context 실행, PRODUCT.md·DESIGN.md 확인 (새 작업이면: PRODUCT.md가 없을 때 impeccable init, 기존 프로젝트면 prokit-ui 2번의 디자인 방향(기존 디자인 근거가 있을 때만 한 번 묻고, 유지면 기존 디자인으로 DESIGN.md 작성), DESIGN.md가 없고 Better-T-Stack 기본 화면뿐이거나 리디자인이면 디자인 카탈로그 스타일 1~3위와 직접 정하기 중 사용자 선택. 카탈로그는 use-design-md로 받고, 직접 정하면 마감에서 기록) → 출력 요약, 디자인 방향(기존 프로젝트), 고른 스타일, DESIGN.md lint 결과
- impeccable shape 브리프 확정 (좁은 개선이면 N/A: 사유) → 브리프 경로
- [design] 재사용·설정 설계 점검 (prokit-dev-cycle의 references/reuse-design.md와 해당 공식 스킬) → 기존: 경로·소비자; 결정: 재사용·분리; 설정: 환경 변수·설정 영향; 검증: 회귀 검사
- 구현 (prokit-ui, prokit-web, 컴포넌트 조합·추가는 shadcn, 컴포넌트·훅 작성은 vercel-react-best-practices) → 변경 파일 요약, 사용한 스킬
- [verify] 타입·린트·빌드 → 명령과 결과
- [verify] next-dev-loop 런타임 확인과 ego-browser(없으면 agent-browser)로 desktop·mobile 스크린샷 → 확인한 경로, 오류 예산(콘솔·개발 오버레이·get_errors·서버 로그, 환경 탓도 빼지 않음) 수, tasks/evidence/ 경로
- [review] impeccable critique (대상은 화면 경로나 주소) → Design Health 점수, P0/P1 목록, .impeccable/critique/ 기록 파일 경로
- [review] impeccable audit과 web-design-guidelines 코드 검사 (두 결과를 tasks/evidence/ui-audit-<시각>.md에 저장) → 점수(/20), 접근성 점수, web-design-guidelines 위반 수, 보고서 경로
- 수정과 impeccable polish를 한 번에 → 반영 내역
- [verify] 재확인 1회 → 스크린샷 경로와 점수
- [review] prokit-reviewer(code) → verdict, max_severity, 반영·기각 내역
- DESIGN.md 갱신 여부 (impeccable document. 카탈로그에서 들여온 파일은 merge와 diff 확인) → 갱신 내역과 lint 결과 또는 N/A: 사유

### C. 버그
- 재현 테스트 작성, 실패 확인 (디버깅 단계. 프로젝트 테스트 러너로 돈다. 화면 문구·모양 버그는 테스트 파일을 만들지 않고 수정 전 화면을 브라우저로 재현한다) → 테스트 이름과 실패 출력, 또는 재현 스크린샷 경로
- 수정 → 변경 파일 요약
- [verify] 재현 테스트 통과 (화면 버그는 고친 뒤 같은 화면의 스크린샷) → 통과 출력 또는 스크린샷 경로
- @inherit verify review

### D. 서버·API
- [design] 재사용·설정 설계 점검 (prokit-dev-cycle의 references/reuse-design.md와 해당 공식 스킬) → 기존: 경로·소비자; 결정: 재사용·분리; 설정: 환경 변수·설정 영향; 검증: 회귀 검사
- zod 입출력 계약 정의 (prokit-api) → 프로시저 이름과 스키마 위치
- 구현 (protectedProcedure, 세션 기반 소유자, 테스트 먼저(격리 테스트부터), Better Auth 설정은 better-auth-best-practices) → 변경 파일 요약, 사용한 스킬
- [verify] 2계정 격리 테스트 → 테스트 이름과 통과 출력
- [verify] 타입·린트·테스트 → 명령과 결과
- [review] prokit-reviewer(code) → verdict, max_severity, 반영·기각 내역

### E. DB
- [design] 재사용·설정 설계 점검 (prokit-dev-cycle의 references/reuse-design.md와 해당 공식 스킬) → 기존: 경로·소비자; 결정: 재사용·분리; 설정: 환경 변수·설정 영향; 검증: 회귀 검사
- 스키마 수정 + dbGenerate, 생성 SQL 검토 (prokit-db, 컬럼 타입·제약·인덱스는 supabase-postgres-best-practices) → 마이그레이션 파일 경로와 요약, 사용한 스킬
- [verify] 타입·린트 검사 (commands.typecheck, commands.lint) → 명령과 결과 요약
- [verify] 로컬 개발 DB에 dbMigrate 적용 → 호스트:포트와 출력 요약
- [verify] 병합 전 Neon 개발 브랜치에 dbMigrate 적용 (neon-postgres-branches) → 브랜치 이름과 출력 요약 또는 N/A: Neon 미연결(.neon 없음)
- 파괴적 변경 여부 판단 → 없음 또는 2단계 계획
- [review] prokit-reviewer(db) → verdict, max_severity, 반영·기각 내역

### F. 신규 기능
- 스펙 작성 (요구 명확화 단계 + 간결성 사다리로 범위 줄이기, 스펙에 '만들지 않는 것' 절과 인수 조건·테스트 시나리오 절(정상·빈·오류·경계 상태, 너비·테마·키보드), 새 용어는 domain-modeling으로 GLOSSARY.md에 바로 기록, 용어·설계 질문은 grilling 형식(사용자는 /grill-with-docs), UI가 있으면 impeccable shape 브리프 링크) → 사용한 스킬, 스펙 경로, 추가·변경한 용어
- 구현 계획 (계획 단계, 바꿀 계층의 prokit-* 스킬과 그 공식 스킬 연결 표를 읽고 계획의 스키마·API·화면 결정에 반영) → 사용한 스킬과 계획 경로
- [design] 재사용·설정 설계 점검 (prokit-dev-cycle의 references/reuse-design.md와 해당 공식 스킬) → 기존: 경로·소비자; 결정: 재사용·분리; 설정: 환경 변수·설정 영향; 검증: 회귀 검사
- [review] prokit-reviewer(plan) 계획 리뷰 (간결성 사다리와 고른 과설계 방지 스킬의 계획 기준 적용, 재사용·설정 결정 검토. 고른 두뇌에 계획 리뷰가 있으면 보강) → prokit-reviewer(plan): approve, max=none|low|medium, 반영·기각 내역. N/A 불가
- 구현 방식 (구현 단계: prokit-implementer 위임과 테스트 먼저, 고른 과설계 방지 스킬의 간결성 규칙) → 사용한 스킬, provider 검증, snapshot·evidence packet hash, reviewCoverage와 위임 내역
- @include E D B
- [verify] next-dev-loop 통합 런타임 확인 → 확인한 경로와 결과
- 공통화·리팩토링·최적화 점검 (이번 라운드가 바꾼 파일과 같은 디렉터리·계획에서 확인한 공통 모듈의 소비자에 간결성 검토(고른 과설계 방지 스킬의 공통화 점검, 없으면 prokit-reviewer(code) focus), 한쪽이 이번 diff이고 같은 책임으로 함께 바뀌는 반복 코드·UI만 적절한 위치로 추출하고 나머지는 백로그로, 필요 없는 추상화는 걷어 냄, 빌드 출력의 라우트 크기와 새 의존성·글꼴·이미지 확인) → 반영 내역, 영향 재확인(타입·린트·테스트·화면) 결과, 미룬 항목과 기록 위치
- [review] prokit-reviewer(code) 전체 diff 최종 리뷰 → verdict, max_severity, 반영·기각 내역
- [verify] 사용자 흐름 QA (스펙의 테스트 시나리오 전부를 ego-browser(없으면 agent-browser)로, 오류 예산은 깨끗한 프로필(agent-browser)로도, 보고만) → 시나리오별 통과·실패, 오류 예산 수
- QA 발견 수정과 재QA (문제와 개선점을 고친 뒤 실패한 검사와 입력·공통 소비자가 바뀐 타입·린트·빌드·테스트를 다시 돌리고, 수정 diff에 fresh prokit-reviewer(code)와 간결성 검토를 받되 같은 검토를 중복 호출하지 않으며, 실패한 시나리오와 오류 예산을 다시 확인. 발견이 없으면 N/A: 사유) → 수정 내역, 영향 재검사·재리뷰·재QA 결과

### H. 하네스
- [design] 재사용·설정 설계 점검 (prokit-dev-cycle의 references/reuse-design.md와 해당 공식 스킬) → 기존: 경로·소비자; 결정: 재사용·분리; 설정: 환경 변수·설정 영향; 검증: 회귀 검사
- [verify] pnpm agents:check → 출력
- [verify] pnpm skills:check → 출력
- [verify] pnpm dev-cycle case·status 실행 확인 → 출력 요약
- [verify] 빌드·검사 (빌드·배포 설정(next.config, vercel.json·vercel.ts, turbo.json, .github/workflows·actions)이나 작업공간 설정(루트 package.json, biome.json, tsconfig.json, packages/config)을 바꿨으면 pnpm build와 타입·린트 검사(commands.typecheck, commands.lint). 아니면 N/A: 사유) → 명령과 결과 요약 또는 N/A: 사유
- [review] 하네스 변경 리뷰 (스크립트·CI·배포·작업공간 설정·.dev-cycle.json 규칙을 바꿨으면 prokit-reviewer(code). 스킬 설치·문서만 바꿨으면 N/A: 사유) → verdict, max_severity, 반영·기각 내역 또는 N/A: 사유
- 스킬을 바꿨으면 skill-creator eval 재실행 → 벤치마크 경로 또는 N/A: 사유

### 공통
- 문서 영향 확인 (GLOSSARY.md와 docs/adr/는 domain-modeling 형식, docs/domain/project.md, 미룬 지적은 tasks/todo.md 백로그로) → 갱신 내역 또는 N/A: 사유
- [confirm] 사용자 확인 (결과를 사용자에게 보여 주고 사용자가 직접 보거나 써 본 뒤 확인한다. N/A 불가) → 확인한 내용과 날짜
