# 케이스 A\~F·H와 대조표
https://prokit-web.vercel.app/docs/concepts/cases/

> 한눈에: 작업을 시작할 때 그 종류(케이스)를 정해요. 화면만 바꾸는지, 서버나 데이터 저장 방식까지 바꾸는지에 따라 챙길 검사가 달라서 종류마다 확인 목록이 미리 정해져 있어요. 작업 중 범위가 넓어지면 **더 무거운 케이스로 올려요**.

## 케이스 일곱 가지

| 케이스 | 언제 | 판정 경로 | 대조표의 대표 행 |
|---|---|---|---|
| A | 문서나 설정처럼 규칙에 걸리지 않는 경미한 변경 | 아래 경로 밖 | 타입·린트 검사 |
| B | 화면, 컴포넌트, 스타일 | `apps/web/src/app`, `apps/web/src/components`, `packages/ui` | impeccable 브리프, 스크린샷과 오류 예산 0, critique·audit, 코드 리뷰(+ponytail) |
| C | 버그 수정 | 경로와 상관없이 선언 | 재현 테스트 먼저 작성, 수정 뒤 통과 |
| D | 서버와 API | `packages/api`, `apps/web/src/app/api` | zod 계약, 2계정 격리 테스트, 코드 리뷰 |
| E | DB 스키마와 마이그레이션 | `packages/db` | 생성 SQL 검토, 로컬 적용, 병합 전 원격 적용, DB 리뷰 |
| F | 화면·API·DB 중 둘 이상에 걸친 새 기능 | 두 계층 이상, 또는 새 기능으로 선언 | 스펙(테스트 시나리오 포함)과 계획, 계획 리뷰, E·D·B 행 전체, 전체를 실제로 실행해 확인, 공통화·리팩토링, 최종 리뷰, 시나리오 QA와 발견 수정 |
| H | 스킬, 에이전트, dev-cycle 자체 | `.agents/skills/`, `.agents/agents/`, `.claude/agents/`, `skills.manifest.json`, `scripts/dev-cycle.mjs`, `docs/dev-workflow.md` 등 | `agents:check`, `skills:check`, 스킬 eval |

모든 대조표 끝에는 공통 행 두 개가 붙어요. 문서 영향 확인(`GLOSSARY.md`, `docs/adr/`, `docs/domain/project.md`, 미룬 지적은 백로그로)과 사용자 확인(`[confirm]`)이에요.

## 판정과 상향

- **판정**: `pnpm dev-cycle case`는 지금 바뀐 파일을 `.dev-cycle.json`의 경로 규칙(`rules`)에 맞춰 판정해요. 아직 파일을 바꾸기 전이면 판정이 A로 나오므로 요청을 보고 케이스를 골라 `table`에 적어요.
- **선언**: 새 기능 요청은 F, 버그 제보는 C로 선언해요. 애매하면 더 무거운 케이스를 골라요.
- **상향**: 작업 중 다른 계층을 건드리면 `pnpm dev-cycle audit`이 케이스를 올리라고 알려 줘요. `pnpm dev-cycle table <새 케이스> --write --upgrade`를 실행하면 이미 채운 증거, 직접 추가한 행, 메모를 그대로 두고 새 케이스의 행을 더해요.
- **보안 리뷰 자동 추가**: 로그인과 관련된 경로(`packages/auth`, `apps/web/src/app/api/auth/` 등, `.dev-cycle.json`의 `authPaths`)를 건드리면 `[review] prokit-reviewer(security)` 행이 자동으로 붙어요. 아직 파일을 바꾸기 전이라도 로그인, 세션, 권한 문제라면 대조표를 연 직후 이 행을 직접 더해요.
- **테스트 러너 먼저**: D·E 행이 있는 대조표(F 포함)나 서버·DB 코드를 고치는 C에서 테스트 러너가 없으면 첫 행 앞에 `vitest 도입(최초 1회)` 행을 더해요. 격리 테스트 행을 채울 방법이 이것뿐이라서 요청 범위를 넓히는 일로 보지 않아요.

## 자세히

### 대조표 행의 정본

케이스별 행은 설치된 프로젝트의 `docs/dev-workflow.md`에 있어요. `scripts/dev-cycle.mjs`가 이 문서를 읽어 대조표를 만들어요. 행 형식은 `- [태그] 단계 → 증거 형식`이에요.

| 표시 | 뜻 |
|---|---|
| `[verify]` | 검사 행. 실행한 명령과 결과가 증거예요 |
| `[review]` | 리뷰 행. `prokit-reviewer`나 impeccable critique 같은 리뷰 결과가 증거예요 |
| `[confirm]` | 사용자 확인 행. N/A나 blocked로 넘길 수 없어요 |
| `@include E D B` | 다른 케이스의 행을 그 자리에 펼쳐요(F가 E·D·B를 포함하는 방식) |
| `@inherit verify review` | 경로로 판정된 케이스에서 검사·리뷰 행만 가져와요(C가 쓰는 방식) |

### 케이스별 행

- **A. 경미**: 타입·린트 검사.
- **B. UI**: impeccable context와 `PRODUCT.md`·`DESIGN.md` 확인(`PRODUCT.md`가 없으면 impeccable init, `DESIGN.md`가 없고 BTS 기본 화면뿐이면 스타일 1~3위와 직접 정하기 중 사용자 선택) → impeccable shape 브리프 확정 → 구현 → 타입·린트·빌드 → 런타임 확인과 desktop·mobile 스크린샷(오류 예산) → impeccable critique → impeccable audit과 web-design-guidelines 검사 → 수정과 polish → 재확인 → `prokit-reviewer(code)` → `DESIGN.md` 갱신 여부.
- **C. 버그**: 재현 테스트 작성과 실패 확인 → 수정 → 재현 테스트 통과 → 판정된 케이스의 검사·리뷰 행.
- **D. 서버·API**: zod 입출력 계약 → 구현(격리 테스트부터) → 2계정 격리 테스트 → 타입·린트·테스트 → `prokit-reviewer(code)`.
- **E. DB**: 스키마 수정과 생성 SQL 검토 → 타입·린트 → 로컬 개발 DB에 적용 → 병합 전 원격 DB에 적용(neon은 Neon 개발 브랜치) → 파괴적 변경 판단(없음 또는 2단계 계획) → `prokit-reviewer(db)`. supabase는 새 테이블의 RLS 확인, 로컬 `supabase db advisors` 보안 검사, 병합 전 Supabase 스테이징 적용과 advisors가 더 붙어요.
- **F. 새 기능**: 스펙(만들지 않는 것, 인수 조건, 테스트 시나리오) → 구현 계획 → 계획 리뷰 → 구현 방식 → E·D·B 행 → 통합 런타임 확인 → 공통화·리팩토링·최적화 점검 → 전체 diff 최종 리뷰 → 사용자 흐름 QA → QA 발견 수정과 재QA.
- **H. 하네스**: `pnpm agents:check` → `pnpm skills:check` → `pnpm dev-cycle case`·`status` 실행 확인 → 스킬을 바꿨으면 skill-creator eval 재실행.

행의 전체 문구(괄호 안의 스킬과 증거 형식)는 템플릿의 [`docs/dev-workflow.md`](https://github.com/roadkwon-ai/pro-kit/blob/main/templates/prokit-next-neon/files/docs/dev-workflow.md)에서 볼 수 있어요. 프로젝트에 맞게 행을 고쳐도 되고, 고치는 일 자체가 케이스 H예요.

### 첫 라운드가 무거워지는 경우

프로젝트를 만든 뒤 설치 결과와 첫 마이그레이션을 기본 브랜치에 커밋하지 않으면 그 파일이 첫 라운드의 diff에 섞여 실제 작업보다 무거운 케이스로 판정돼요. 라운드는 기본 브랜치와 갈라진 지점(merge-base)부터 바뀐 것을 보므로 기능 브랜치에 커밋해도 해결되지 않아요([빠른 시작: 서비스 만들기](https://prokit-web.vercel.app/docs/start/quickstart-service/)).

## 관련 문서

- [dev-cycle 라운드](https://prokit-web.vercel.app/docs/concepts/dev-cycle/)
- [증거와 audit, 사용자 확인](https://prokit-web.vercel.app/docs/concepts/audit-and-confirm/)
- [구현 에이전트와 리뷰 에이전트](https://prokit-web.vercel.app/docs/concepts/agent-roles/)
- [UI/UX 흐름](https://prokit-web.vercel.app/docs/design/ui-flow/)
