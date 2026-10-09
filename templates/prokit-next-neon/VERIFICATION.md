# 검증 기록

> 기록 속 vX.Y.Z와 커밋 해시는 공개 전 비공개 이력(2026-10-08 공개 때 이력을 새로 시작)의 것이다.

템플릿을 실제로 설치하고 돌려 본 결과와, 검증하지 못한 한계를 적는다. 모든 값은 2026-09-25에 측정한 실측값이다. 측정 산출물(fixture, eval 작업 공간, 트리거 로그)은 세션 스크래치에 있었으므로 이 문서에는 수치와 판정만 남긴다.

## 환경
| 항목 | 버전 |
|---|---|
| OS | macOS 26.5.2 (Darwin 25.5.0) |
| Node | v24.19.0 |
| pnpm | 12.6.0 |
| git | 2.55.0 |
| Python | 3.14.7 |
| create-better-t-stack | 3.44.1 (Next.js 16.3.6) |
| skills CLI | 1.7.0 (`install.mjs`의 `SKILLS_CLI`) |
| Claude Code | 2.1.282 (동작 eval 실행: Sonnet 5 서브에이전트, 채점: Opus 5.5, 트리거 eval: `claude -p` 기본 모델) |
| codex-cli | 0.157.0 |

fixture 생성 명령은 README의 "새 프로젝트 시작"과 같다. 다만 외부 DB를 만들지 않으려고 `--db-setup none`으로 생성했다.

## 단위 테스트
`node --test 'templates/bts-next-neon/tests/*.test.mjs'` → **63 통과, 0 실패** (러너 분류·대조표·audit, 에이전트 동기화, 설치기, 스킬 정적 검사, 문서 규칙). 독립 리뷰 반영 전에는 49개였고, 리뷰와 재리뷰를 반영하면서 회귀 테스트 11개를 추가했다. 최종 리뷰 반영 때 3개를 더 추가했다.

스킬 6개 모두 skill-creator `quick_validate.py` → `Skill is valid!`. SKILL.md 본문은 모두 150줄 이하다(최대 76줄).

## fixture 설치
| 검사 | 결과 |
|---|---|
| `install.sh` 종료 코드 | 0 |
| `.agents/skills` | 27개 (공식 21 + bts 6) |
| `skills-lock.json` 항목 | 21개 |
| `.claude/skills` 링크 | 27개 |
| `.dev-cycle.json` | 기본 브랜치 `master`(BTS가 master로 초기화), commands: typecheck, lint, build, dbGenerate, dbMigrate, dbPush (2026-09-27부터 dbPush는 기록하지 않는다) |
| 멱등성 | 두 번째 실행 뒤 작업 트리 변경 0 |
| `pnpm check-types` | exit 0 |
| `pnpm agents:check` | 에이전트 정의 일치 |
| `biome check` | **BTS 원본 자체가 실패한다**(생성 직후 68개 파일에서 지적). 그래서 기준을 "원본 대비 지적이 늘지 않을 것"으로 바꿨다. 설치 뒤 새 지적 0, 오히려 2개 줄었다 |
| `pnpm check`(`biome check --write .`) | 템플릿 파일과 벤더 스킬을 고쳐 쓰지 않는다. 설치기가 `biome.json`의 `files.includes`에 `!.agents/skills`, `!skills-lock.json`을 넣기 때문이다. 넣지 않으면 벤더 스킬 파일 약 906개가 다시 포맷되어 lock의 내용 해시가 깨진다 |
| 러너 스모크 | `case` → E, 대조표 5행, 빈 칸에서 audit exit 1, 정리 뒤 활성 라운드 없음 |

## 스킬 동작 eval (skill-creator 표준 절차)
with_skill은 스킬을 쓴 실행, without_skill은 스킬 없이 같은 프롬프트를 준 기준선이다. 실행은 Sonnet 5, 채점은 스킬마다 Opus 5.5 채점자 한 명이 맡았다. eval 정의는 `evals/<skill>/evals.json`에 있다.

| 스킬 | eval 수(assertion) | iteration | 최종 with_skill | without_skill |
|---|---|---|---|---|
| bts-dev-cycle | 3 (14) | 2 | 93% | 27% |
| bts-api | 2 (8) | 3 | 100% | 56% |
| bts-db | 2 (7) | 1 | 100% | 38% |
| bts-web | 2 (8) | 2 | 88% | 62% |
| bts-ui | 2 (8) | 2 | 100% | 12% |
| bts-verify | 2 (7) | 1 | 100% | 71% |

모든 스킬이 목표(85% 이상, 기준선보다 뚜렷이 높음)를 넘었다. 사용자 피드백 파일(`feedback.json`)은 제출되지 않았고, skill-creator 규칙에 따라 "문제없음"으로 보고 벤치마크와 채점 근거만으로 반복했다.

iteration 중 고친 주요 원인은 다음과 같다.
- bts-ui가 존재하지 않는 `context.mjs`를 안내했다. impeccable 0.1.6의 런처 `scripts/impeccable context`로 바꿨다.
- "새로 디자인" 요청이 init·shape를 건너뛰었다. 새 작업과 좁은 개선을 구분하고, 새 작업은 브리프를 만든 뒤 멈추게 했다.
- 분석만 한 라운드에 security 행이 없었다.
- 격리 테스트를 언급만 했다.
- 번들 Next 문서를 읽지 않았다.
- 러너 버그: `table C --write`처럼 `--title` 없이 쓰면 케이스 인자를 버렸다. 고치고 회귀 테스트를 넣었다.

남은 실패: bts-web eval-1의 빈 상태 구분이 iteration-2에서만 빠졌다. iteration-1은 통과했으므로 편차로 판단했다.

## 트리거 정확도 (description)
skill-creator `run_eval.py`를 그대로 쓰면 description 품질을 잴 수 없었다. 1차 측정은 전 스킬 10/20이었고 무효로 처리했다. 원인은 세 가지다.
- `AGENTS.md`가 모든 변경을 `bts-dev-cycle`로 보낸다.
- 첫 도구 호출만 채점한다.
- 병렬 워커가 `.claude/commands`를 공유해 다른 쿼리의 임시 명령을 부르면 미탐으로 잡힌다.

그래서 스펙 11.4의 방식으로 다시 쟀다.
- 격리 복사본에서 쟀다: `AGENTS.md`·`CLAUDE.md`와 대상 링크를 뺐고, 계층 스킬이면 `bts-dev-cycle` 링크도 뺐다.
- 도구 호출 8회 창으로 판정했다.
- 쿼리마다 3회, 쿼리는 20개(트리거 10, 비트리거 10)다.

| 스킬 | 정확도 | 오탐 | 놓친 쿼리 (대신 고른 것) |
|---|---|---|---|
| bts-dev-cycle | 95% | 0 | "README 섹션 추가" → 스킬 없이 바로 편집 2/3 |
| bts-web | 95% | 0 | "Cache Components 켜서…" → `next-cache-components-adoption` |
| bts-api | 90% | 0 | "Better Auth에 GitHub 로그인" → `better-auth-best-practices`, "API 입력값 검증" → 창 안에 스킬 호출 없음 |
| bts-db | 95% | 0 | "Neon 개발 브랜치…" → `neon-postgres-branches` |
| bts-ui | 95% | 0 | "모바일 카드 삐져나옴" → `bts-web` 1/3 |
| bts-verify | 95% | 0 | "next-dev-loop로…" → `next-dev-loop` |

모두 90% 이상이라 `run_loop.py` 최적화는 돌리지 않았다. 최적화 전후 값은 같다. 놓친 쿼리 대부분은 공식 스킬 이름을 직접 댄 요청이다. bts 스킬이 결국 그 공식 스킬로 안내하므로 결함으로 보지 않았다.

**라우팅 스모크**(`AGENTS.md`가 있는 실제 fixture, 쿼리당 1회): **9/9 통과**. 변경 요청 7건은 모두 첫 도구 호출에서 `bts-dev-cycle`을 불렀고, 질문 2건은 불러오지 않았다.

## 독립 리뷰
작성 lane과 분리해 두 리뷰어가 병렬로 검토했다(모두 Opus 5.5). 지적은 모두 코드 확인이나 재현으로 실측한 뒤 판정했다.

### 스킬 리뷰 (`plugin-dev:skill-reviewer`, 19건)
반영:
- AGENTS.md와 `status` 안내가 `table --write`를 케이스 없이 적었다. 파일을 바꾸기 전이면 A 대조표가 열린다. 두 곳 모두 `table <케이스> --write --title`로 고쳤다.
- `blocked:`·`미실행:` 칸도 audit이 채운 칸으로 본다. bts-dev-cycle과 bts-verify에 "그런 행이 있으면 부분 완료로 보고하고, 사용자가 원할 때만 close"를 넣었다.
- bts-verify의 검사표가 "위 +"로 이어져 API 변경에도 스크린샷을 요구하는 것처럼 읽혔다. 각 행을 "모든 코드 검사 +"로 명시했다.
- DESIGN.md를 작업 시작 때 만들라고 안내했다. impeccable new-work 5절은 새 시각 세계의 DESIGN.md를 마감 때 만든 화면에서 기록하라고 한다. 그에 맞췄다.
- bts-web만 로드되면 새 페이지를 바로 만들 수 있었다. 새 화면이면 bts-ui의 shape 게이트를 먼저 통과하도록 했다.
- `next-dev-loop`의 버전 하한(Next 16.3+, agent-browser 0.31.1+)을 못 맞추면 `blocked`로 적게 했다. 현재 BTS는 Next 16.3.6이라 충족한다.
- E 규칙이 schema·migrations만 잡아 `relations.ts`와 연결 코드가 A로 판정됐다. `^packages/db/`로 넓혔다.
- 그 밖의 작은 문구를 고쳤다:
  - H 검사에 `dev-cycle case`를 추가했다.
  - `--upgrade`가 수동 행을 끝으로 옮긴다고 명시했다.
  - bts-api의 인증 경로 목록이 `authPaths`와 달라 맞췄다.
  - 명령 증거를 `→ exit 0`으로 통일했다.
  - `hooks on`의 Claude 호출 형식을 함께 적었다.
  - 리뷰 행의 대안 칸을 보강 칸으로 옮겼다.
  - ownership-test 경로를 전체 경로로 적었다.
  - "분석만 하는 라운드" 문구를 고쳤다.
  - vitest 도입은 코디네이터가 직접 한다고 적었다.

기각:
- "`SCOPED_EXISTING_ALLOWED`, `BUILD_INIT_REQUIRED`는 impeccable에 없는 지시어다": 리뷰어는 정적 파일만 검색했다. `impeccable context`를 실제로 실행하면 두 지시어가 모두 출력된다.
- "완료 처리"(dev-cycle·verify), "느려요"(web·db)가 겹친다: 측정 결과 오탐 0, 정확도 90% 이상이다. description을 바꾸면 재측정이 필요하므로 두었다.
- 증거의 `|`는 `\|`로 적게 문서화하라: 문서 대신 러너가 이스케이프 안 된 `|`를 처리하게 고쳤다(아래).

### 코드 리뷰 (`oh-my-claudecode:code-reviewer`, 15건)
반영(모두 회귀 테스트 추가):
- 상위 저장소의 하위 폴더에서 실행하면 `git diff` 경로가 저장소 루트 기준이라 규칙이 안 맞았다. `--relative`로 고쳤다.
- 설정의 기본 브랜치(`main`)가 없으면 HEAD로 물러나, 기능 브랜치의 커밋이 diff에서 빠졌다. 이제 `origin/<b>`, `main`, `master` 순으로 찾는다. 설치기도 기능 브랜치에서 설치하면 main·master를 먼저 기록한다.
- **보안**: `tasks/todo.md` 마커의 `base=--output=…`가 git 옵션으로 해석되어 임의 파일을 쓸 수 있었다. base를 16진수 커밋 해시로 제한하고 ref 앞에 `--end-of-options`를 붙였다.
- 손으로 적은 증거의 이스케이프 안 된 `|`(`pnpm test | tail`)가 잘렸고 `--upgrade` 때 영구히 사라졌다. 남는 칸을 증거로 합친다.
- `--upgrade`가 블록 안 메모와 번호가 숫자가 아닌 행을 지웠다. 이제 그대로 옮긴다.
- `CDPATH`가 설정되어 있으면 `install.sh`가 스크립트 경로를 잘못 만들었다.
- 설치기 문제 셋을 고쳤다:
  - 깨진 스킬 링크가 있으면 멈췄다. 이제 충돌로 보고한다.
  - 루트 `package.json`이 없으면 파일을 복사한 뒤에야 실패했다. 이제 사전 점검에서 멈춘다.
  - 에이전트 `name`을 검사하지 않아 경로가 탈출하거나 중복 이름이 덮어써졌다.
- `close`가 사용자 메모의 빈 줄까지 줄였다.
- `.dev-cycle.json`의 JSON·정규식 오류가 원시 예외로 나왔다.

기각·보류:
- 커밋 없는 저장소에서 연 라운드는 첫 커밋 뒤에도 base가 none으로 남는다. 기각했다. 그 라운드에서는 모든 파일이 실제로 이번 변경이다.
- audit의 케이스 상향이 계층 간 "옆 이동"일 때(B로 열었는데 diff가 H뿐)의 의미는 설계 문제라 보류했다. 현재는 `--upgrade`를 안내하고, 사용자가 판단한다.
- 이미 알려진 Minor(security 행 중복 판정이 부분 문자열, 선언한 A에도 H 행, `n/a1` 허용)는 동작에 영향이 작아 두었다.

반영 후 수정 diff만 따로 재리뷰했다(Opus 5.5). 결과는 아래 "재리뷰"에 적는다.

### 재리뷰
주장한 수정 12건 중 11건이 확인되었다. 새로 나온 지적은 다음과 같이 처리했다.
- **회귀(반영)**: 기본 브랜치 후보에 `origin/<branch>`를 넣자, `main` 위에서 push하지 않은 이전 커밋이 새 라운드 diff에 섞였다. 기본 브랜치 위에서는 예전처럼 HEAD를 쓰게 고치고 테스트를 추가했다.
- **반영**:
  - CRLF 줄바꿈이나 `| --- |`로 다시 정렬한 표 머리를 메모로 오인했다.
  - `--end-of-options`를 오래된 git(2.25 등)의 `rev-parse`가 몰라서 모든 라운드가 F로 판정될 위험이 있었다. 제거했다. 옵션 주입은 `-` 시작 ref 거르기와 커밋 해시 검사가 막는다.
  - 사유 없는 `blocked`가 audit을 통과했다. 이제 `blocked: 사유`를 요구한다.
  - 끝의 빈 칸이 증거에 `|`로 붙었다.
  - `null`인 `package.json`이 사전 점검을 통과했다.
  - 대소문자만 다른 에이전트 이름이 macOS에서 같은 파일로 겹쳤다.
  - CDPATH 테스트가 절대 경로로 실행해 회귀를 잡지 못했다. 상대 경로로 바꾸고, 옛 스크립트에서 실패하는 것을 확인했다.
- **수용한 한계(LOW)**:
  - 끝 마커와 같은 줄에 적은 메모는 `--upgrade` 때 사라진다.
  - 옮겨진 `| 9a |` 행은 빈 줄 뒤에 붙어 표 밖에 렌더링된다. 빈 줄이 없으면 GFM이 메모 줄을 표 행으로 합치기 때문에 이렇게 두었다.
  - `rules`가 배열이 아니거나 `match`가 없는 설정 오류는 원시 예외로 나온다.
- **의도대로 둠**: E 규칙을 `^packages/db/`로 넓혀서 `packages/db/package.json` 변경도 E가 된다. 그런 라운드에서는 마이그레이션 행을 `N/A: 사유`로 적는다. 연결 코드와 `relations.ts`를 A로 놓치는 것보다 낫다고 판단했다.

## Codex 스모크
`codex exec --sandbox read-only`(codex-cli 0.157.0)를 fixture 복사본에서 실행했다.
- 계획의 프롬프트: exit 0. 스킬 6개(`bts-api`, `bts-db`, `bts-dev-cycle`, `bts-ui`, `bts-verify`, `bts-web`)와 에이전트 2개(`bts-implementer`, `bts-reviewer`)를 나열했다. 파일 변경은 0건이다. 다만 Codex가 `rg`로 파일을 읽어서 답했으므로, 이것만으로는 로더가 인식했다는 증거가 되지 않는다.
- 도구 없이 세션 컨텍스트만 보고 답하게 했다:
  - 스킬: 6개 모두 사용 가능 목록에 있다.
  - 에이전트: 사용자의 기본 Codex 설정에서는 생성 가능 목록에 **없었다**. 프로젝트가 신뢰(trusted)되지 않았기 때문이다. `-c projects.<경로>.trust_level=trusted` 덮어쓰기도 프로젝트 계층을 읽게 하지 못했다.
  - 프로젝트를 신뢰로 등록한 임시 `CODEX_HOME`에서는 프로젝트 `.codex/config.toml`의 표지를 읽었고, `bts-implementer`와 `bts-reviewer`가 생성 가능 목록에 나타났다.

결론: Codex는 신뢰된 프로젝트에서만 `.codex/agents`를 읽는다. 스킬은 신뢰와 무관하게 로드된다. README 설치 후 1단계와 설치기 안내에 이 조건을 적었다.

## 실제 Neon DB E2E (Task 14)
사용자 승인(neon-new)을 받고 새 BTS 프로젝트(`fixture-neon`)를 만들었다. `--db-setup neon --db-setup-options '{"mode":"auto","neon":{"method":"neon-new"}}'`로 가입 없는 claimable DB를 받았다(2026-09-28 만료, 엔드포인트 `ep-holy-bonus-b5dhfadc`). 현재 템플릿을 설치하고 eval 시드를 적용한 뒤, `bts-dev-cycle` 절차대로 F 라운드 "todo 수정·삭제 프로시저 + 첫 마이그레이션 + 2계정 격리 테스트"를 끝까지 진행했다.

| 단계 | 결과 |
|---|---|
| 마이그레이션 생성 | `20260925120702_special_goliath/migration.sql`: 테이블 5개 생성, 인덱스 4, FK 3(ON DELETE CASCADE) |
| 적용 | direct URL로 `db:migrate` → `migrations applied successfully` |
| 격리 테스트 (vitest 5.0.1, 실제 Neon) | TDD로 진행: 먼저 1 failed(`update is not a function`), 구현 뒤 **4 passed**. `TEST_DATABASE_URL`이 없으면 4 skipped |
| HTTP 런타임 | `next dev`에서 두 계정을 가입시켜 확인: 비로그인 401, B가 A의 할 일을 수정·삭제하면 404, B 목록 0건, A 본인 수정·삭제 200, 빈 update 400 |
| 리뷰 (`claude -p --agent bts-reviewer`) | db approve(지적 0). security approve(low 2, 둘 다 반영). code는 changes-required(medium 2 반영, low 1 기각) → 재리뷰 approve(low 1 기각) |
| audit·close | `.dev-cycle.json` 변경 때문에 H 행 누락이 나왔고, `--upgrade`로 해소했다. 증거와 직접 추가한 행은 보존되어 끝으로 옮겨졌다. audit 통과 → close → `tasks/archive/2026-09.md` |

라운드는 **부분 완료**로 닫았다. 미실행 3건은 스펙·계획·계획 리뷰 행이고, Task 14 범위 밖이다. blocked 1건은 Neon 개발 브랜치다. neon-new DB는 계정이 없어 브랜치를 만들 수 없으므로, 버릴 claimable DB의 기본 브랜치에 적용했다.

E2E에서 찾아 고친 템플릿 결함:
1. **루트 `pnpm db:*`가 에이전트 셸에서 실패**: BTS의 `db:generate`·`db:migrate`·`db:push`는 turbo interactive 태스크다. TTY가 없으면 `Cannot run interactive task … without Terminal UI`로 끝나고, `TURBO_UI=true`로도 풀리지 않는다. 설치기는 이제 `turbo run <s> -F <pkg>` 형태를 알아보고 `commands.dbGenerate` 등을 `pnpm --filter <pkg> <s>`로 기록한다. 테스트를 추가했고, 실제 BTS 복사본에 재설치해 기록된 명령이 비대화형으로 동작함을 확인했다. `bts-db`, `migration-flow.md`, `ownership-test.md`도 이 명령을 안내한다.
2. **`ownership-test.md` 예제가 URL 없이 skip되지 않음**: `createDb({ DATABASE_URL: "" })`를 부르면 `neon()`이 import 시점에 예외를 던진다. 그래서 문서의 "skipped로 끝난다"가 사실이 아니었다(실행하면 Test Files 1 failed, no tests). 연결하지 않는 자리표시자 URL로 바꿔 4 skipped를 확인했다.
3. **`ownership-test.md` 예제가 `bts-api`의 세 경우 규칙을 다 담지 못함**: update·delete에 대한 본인 성공 케이스와 비로그인 케이스가 없었다. code·security 리뷰가 모두 지적했다. 예제에 두 케이스를 추가했다.

<details><summary>닫은 대조표 (tasks/archive/2026-09.md)</summary>

<!-- dev-cycle:archived closed=2026-09-25 case=F base=cc3e64ee286dafdcfb3f38f239bf41b58d58417d auth=false opened=2026-09-25 -->
## 라운드: F — todo 수정·삭제 프로시저 + 첫 마이그레이션 + 2계정 격리 테스트
| # | 단계 | 증거 |
|---|---|---|
| 1 | 스펙 작성 (brainstorming, 선택: /grill-with-docs, UI가 있으면 impeccable shape 브리프 링크) → 사용한 스킬과 스펙 경로 | 미실행: Task 14 E2E 범위(DB·API·리뷰·audit 경로 검증). 요구사항은 템플릿 계획 Task 14 Step 3으로 대체, brainstorming 미사용 |
| 2 | 구현 계획 (writing-plans) → 사용한 스킬과 계획 경로 | 미실행: 위와 같음. writing-plans 미사용, 계획은 템플릿 계획 Task 14 |
| 3 | [review] 계획 리뷰 (plan-eng-review, UI가 있으면 plan-design-review) → 결과 요약 또는 N/A: 사유 | 미실행: 계획 문서가 없어 plan-eng-review 대상 없음 (E2E 범위) |
| 4 | 구현 방식 (subagent-driven-development + test-driven-development) → 사용한 스킬과 위임 내역 | 사용: test-driven-development 방식으로 코디네이터 직접 구현(위임 없음, subagent-driven 미사용: 파일 2개 규모). 격리 테스트 먼저 작성 → 실제 Neon에서 1 failed(update is not a function) 확인 → 구현 → 통과 |
| 5 | 스키마 수정 + dbGenerate, 생성 SQL 검토 (bts-db) → 마이그레이션 파일 경로와 요약 | 스키마는 시드(todo.ts) 그대로, `pnpm --filter @fixture-neon/db db:generate`(루트 `pnpm db:generate`는 TTY 없는 셸에서 turbo interactive 오류로 실패) → packages/db/src/migrations/20260925120702_special_goliath/migration.sql: CREATE TABLE account·session·user·verification·todo, 인덱스 4, FK 3(ON DELETE CASCADE). DROP·ALTER COLUMN 없음 |
| 6 | [verify] Neon 개발 브랜치에 dbMigrate 적용 → 브랜치 이름과 출력 요약 | blocked: Neon 개발 브랜치 생성 불가(neon-new claimable DB는 계정·API 키가 없어 neonctl branches 사용 불가). 대신 버릴 claimable DB 기본 브랜치(ep-holy-bonus-b5dhfadc, direct)에 `DATABASE_URL=<direct> pnpm --filter @fixture-neon/db db:migrate` → migrations applied successfully |
| 7 | 파괴적 변경 여부 판단 → 없음 또는 2단계 계획 | 없음: 첫 마이그레이션, 전부 CREATE (bts-reviewer(db)도 파괴적 변경 없음 확인) |
| 8 | [review] bts-reviewer(db) → verdict, max_severity, 반영·기각 내역 | bts-reviewer(db): approve, max=none, 지적 0. limitations: 기존 db:push 테이블 존재 시 CREATE 충돌 가능(이 DB는 새 DB라 해당 없음), auth timestamp 무타임존은 auth:generate 산출물이라 제외 |
| 9 | zod 입출력 계약 정의 (bts-api) → 프로시저 이름과 스키마 위치 | todo.update 입력 z.object({id: string 1..64, title?: trim 1..200, completed?: boolean}).refine(title 또는 completed 필수), todo.delete 입력 {id: string 1..64}. 위치 packages/api/src/routers/todo.ts |
| 10 | 구현 (protectedProcedure, 세션 기반 소유자) → 변경 파일 요약 | packages/api/src/routers/todo.ts: update·delete 추가, 둘 다 protectedProcedure, where and(eq(todo.id,id), eq(todo.userId, context.session.user.id)), 행 없으면 ORPCError NOT_FOUND |
| 11 | [verify] 2계정 격리 테스트 → 테스트 이름과 통과 출력 | packages/api/src/routers/todo.isolation.test.ts (ownership-test.md 패턴): `TEST_DATABASE_URL=<neon direct> pnpm test` → 4 passed (B 목록 차단, B 수정·삭제 NOT_FOUND+A 행 유지, A 본인 수정·삭제 성공, 비로그인 list·create·update·delete UNAUTHORIZED). URL 없으면 4 skipped |
| 12 | [verify] 타입·린트·테스트 → 명령과 결과 | `pnpm check-types` → 5 successful. `pnpm exec biome check packages/api/src .dev-cycle.json package.json packages/api/package.json turbo.json` → 지적 0 (전체 `biome check .`는 BTS 원본 지적으로 원래 실패, 기준 75→73 증가 없음). `pnpm test` → 4 passed |
| 13 | [review] bts-reviewer(code) → verdict, max_severity, 반영·기각 내역 | bts-reviewer(code): 1차 changes-required, max=medium, 지적 3 (반영 2: update·delete 본인 성공·비로그인 케이스, 기각 1: 테스트의 tsc 빌드 포함은 타입 검사 유지 목적) → 재리뷰 approve, max=low (기각 1: 빈 update BAD_REQUEST는 24행 HTTP에서 400 확인) |
| 14 | impeccable context 실행, PRODUCT.md·DESIGN.md 확인 (PRODUCT.md 없으면 impeccable init, DESIGN.md는 새 작업이면 마감에서 기록) → 출력 요약 | N/A: 화면 변경 없음 (API·DB만) |
| 15 | impeccable shape 브리프 확정 (좁은 개선이면 N/A: 사유) → 브리프 경로 | N/A: 화면 변경 없음 |
| 16 | 구현 (bts-ui, bts-web) → 변경 파일 요약 | N/A: 화면 변경 없음 |
| 17 | [verify] 타입·린트·빌드 → 명령과 결과 | N/A: 화면 변경 없음 (타입·린트는 12행) |
| 18 | [verify] next-dev-loop + agent-browser로 desktop·mobile 스크린샷 → tasks/evidence/ 경로 | N/A: 화면 변경 없음 |
| 19 | [review] impeccable critique → Design Health 점수, P0/P1 목록 | N/A: 화면 변경 없음 |
| 20 | [review] impeccable audit → 점수(/20), 접근성 점수 | N/A: 화면 변경 없음 |
| 21 | 수정과 impeccable polish를 한 번에 → 반영 내역 | N/A: 화면 변경 없음 |
| 22 | [verify] 재확인 1회 → 스크린샷 경로와 점수 | N/A: 화면 변경 없음 |
| 23 | DESIGN.md 갱신 여부 (impeccable document) → 갱신 내역 또는 N/A: 사유 | N/A: 화면 변경 없음 |
| 24 | [verify] next-dev-loop 통합 런타임 확인 → 확인한 경로와 결과 | 대체 절차(next-dev-loop 대신 dev 서버 + curl): apps/web `pnpm dev`(3001, varlock .env) → POST /api/rpc/healthCheck OK, 비로그인 todo/list 401, /api/auth/sign-up/email 두 계정 200, A create 200, B update·delete A의 id → 404 NOT_FOUND, B list 0건, A update(completed)·delete 200, 빈 update 400 |
| 25 | [review] bts-reviewer(code) 전체 diff 최종 리뷰 → verdict, max_severity, 반영·기각 내역 | bts-reviewer(code) 재리뷰가 전체 diff(todo.ts, 테스트, package.json, turbo.json, .dev-cycle.json, migration.sql) 대상: approve, max=low, 지적 1 기각(13행과 같음) |
| 26 | [verify] 사용자 흐름 QA (qa-only) → 보고서 요약 또는 대체 절차 결과 | N/A: 사용자 화면 변경 없음 (API 흐름은 24행 HTTP E2E로 확인) |
| 27 | [verify] pnpm agents:check → 출력 | `pnpm agents:check` → 에이전트 정의 일치 |
| 28 | [verify] pnpm dev-cycle case·status 실행 확인 → 출력 요약 | `pnpm dev-cycle case` → F (+H), base cc3e64e, H는 .dev-cycle.json(commands.test 추가). `pnpm dev-cycle status` → 라운드 F 29/32칸 |
| 29 | 스킬을 바꿨으면 skill-creator eval 재실행 → 벤치마크 경로 또는 N/A: 사유 | N/A: 스킬 파일 변경 없음 (.dev-cycle.json commands.test 한 줄만) |
| 30 | 문서 영향 확인 (CONTEXT.md, docs/adr/, docs/domain/project.md) → 갱신 내역 또는 N/A: 사유 | N/A: E2E fixture라 CONTEXT.md·docs/domain/project.md가 자리표시자 상태, ADR 대상 결정 없음 |
| 31 | vitest 도입(최초 1회) → 설정 파일과 실행 결과 | packages/api devDeps vitest ^5.0.1, scripts.test=vitest run, 루트 test=turbo run test, turbo.json tasks.test{cache:false}+globalEnv TEST_DATABASE_URL, .dev-cycle.json commands.test=pnpm test. TEST_DATABASE_URL=neon-new claimable DB direct URL (계정 없어 테스트 브랜치 생성 불가, 버릴 DB 사용). `pnpm test` → 4 passed |
| 32 | [review] bts-reviewer(security) → verdict, max_severity, 반영·기각 내역 | bts-reviewer(security): approve, max=low, 지적 2 (반영 2: update·delete 비로그인·본인 성공 케이스 추가, id max(64)) |
<!-- dev-cycle:archived-end -->

</details>

참고(하네스): eval 시드 `todo.ts`가 `@fixture-full/db`를 하드코딩해서 다른 이름의 fixture에서는 import를 고쳐야 했다. 템플릿 설치물에는 영향이 없다.

## 최종 전체 리뷰 (fable)
기준 079c1ce부터 a8d7b21까지 전체를 리뷰했다. 결과는 "With fixes", Critical 0, Important 2, Minor 7이다. 요청한 확인 3건(`parseActive`의 `|` 수정, Task 14 수정, `base=` 보안 수정)은 모두 올바르다고 확인됐다.
- **반영(341f1fd)**:
  - 템플릿 러너 스크립트와 `.dev-cycle.json`을 BTS biome 규칙으로 미리 포맷했다. 그래서 재설치해도 "템플릿과 다름"이 뜨지 않고 `--diff`가 실제 차이만 보인다. `.dev-cycle.json`은 설치기가 채우는 파일로 따로 보고한다.
  - 스펙 8.2·4.2·8.4를 코드에 맞췄다.
  - 증거의 `||`가 ` |  | `로 바뀌던 문제를 고쳤다. 이제 원문을 그대로 잘라 쓴다.
  - 그 밖에 `git diff`에 `--`를 넣었고, `apps/web/package.json`이 깨졌을 때 한 줄 오류로 끝나게 했다. README의 설치 경로와 테스트 전제를 고쳤고, bts-ui의 init 지시어 문구를 일반화했다.
  - 테스트는 63/63이다.
- **기각(한계)**:
  - CRLF `todo.md`에서 `--upgrade`하면 블록만 LF로 쓰인다. 읽기는 CRLF를 견디고 Windows는 미검증 범위다.
  - eval 하네스 `evals/seed/verify-round.sh`가 BSD `sed -i ''`를 쓴다. 템플릿 개발용이라 설치물에는 영향이 없다. (2026-09-27 해소: `perl -pi`로 바꿨다)
- 이미 설치한 프로젝트는 설치기가 기존 파일을 덮어쓰지 않으므로 템플릿 수정이 자동으로 반영되지 않는다(스펙 12의 버전 관리 범위 밖). 예를 들어 Task 14 fixture의 `.dev-cycle.json`에는 수정 전 `pnpm db:generate`가 남아 있다. README 안내대로 `--diff`로 보고 직접 옮긴다.

## 로컬 Podman DB 전환 (2026-09-25 추가)
개발 중에는 Podman 로컬 DB를 쓰겠다는 사용자 요청으로 생성 옵션을 `--db-setup neon`에서 `--db-setup docker`로 바꿨다.

**바꾼 이유.** `--db-setup neon` 생성물은 `@neondatabase/serverless` + `drizzle-orm/neon-http`(HTTP 드라이버)라 로컬 Postgres에 붙지 않는다(`fixture-neon`의 `packages/db/src/index.ts`). `--db-setup docker`는 `pg` + `drizzle-orm/node-postgres`, `packages/db/docker-compose.yml`(postgres:18), `db:start/stop/watch/down` 스크립트, 로컬 `DATABASE_URL`을 만든다. `pg`는 Neon에도 그대로 붙는다.

**실측(`fx-docker`, BTS 3.44.1 `--db-setup docker`, 템플릿 설치, `fixture-neon`의 todo 라운드 코드 이식).**
| 확인 | 결과 |
|---|---|
| `docker` 명령 | 없음. `db:start`(`docker compose up -d`)는 이 기기에서 실패한다. `podman compose up -d`(외부 provider docker-compose v2.40.0)로 띄웠다. |
| 포트 5432 충돌 | Homebrew `postgresql@16`이 127.0.0.1:5432를 쓰는 상태에서 컨테이너가 오류 없이 `0.0.0.0:5432`로 떴다. `localhost:5432`·`127.0.0.1:5432` 접속은 모두 Homebrew 서버로 갔다(`role "postgres" does not exist`). 문서에 포트 확인 절차를 넣었다. |
| 5433으로 변경 후 | `localhost:5433` → PostgreSQL 18.6 (컨테이너) |
| `pnpm --filter @fx-docker/db db:generate` / `db:migrate` | 생성 성공, `Using 'pg' driver` → migrations applied successfully (개발 DB, 테스트 DB `fx_test`) |
| 2계정 격리 테스트 | URL 없음: 4 skipped. `TEST_DATABASE_URL`=로컬 `fx_test`: **4 passed** |
| HTTP (next dev) | 가입 200, `todo/create` 200, `todo/list` 200(본인 1건), 비로그인 `todo/list` 401 |
| `pg` → Neon | 같은 격리 테스트를 Task 14 neon-new DB(`ep-holy-bonus-b5dhfadc`)에 `pg`로 실행: pooled(`-pooler`) 4 passed, direct 4 passed |
| `check-types` | 5/5 성공 |
| `biome check .` | 실패. BTS 원본 자체가 실패하는 기존 사항(환경 절)이며 DB 전환과 무관하다. README 명령 그대로 만든 `fx-install`에서 원본 83 errors → 템플릿 설치 뒤 81 errors로 늘지 않았다. |
| README 명령 그대로 생성(`--db-setup docker --install`) | `fx-install`: 생성·의존성 설치 한 번에 성공, `node-postgres` 드라이버, `packages/db/docker-compose.yml`, 템플릿 설치(복사 24, 충돌 없음), `check-types` 5/5, `pnpm dev-cycle case` 동작 |

**템플릿 변경.** README(생성 명령, 로컬 DB 시작, 포트 충돌, Neon 연결), `bts-db`(description·절차·금지: neon-http 드라이버로 바꾸지 않기), `migration-flow.md`(로컬 DB 절, 로컬 적용 → 병합 전 Neon 적용), `ownership-test.md`(테스트 DB = 로컬 컨테이너), `bts-verify` 스키마 행, `dev-workflow.md` E 케이스(로컬 적용 행 + 병합 전 Neon 행, Neon 미연결이면 `N/A: Neon 미연결`), ADR 0001, AGENTS.md. `bts-db` description을 바꿨으므로 트리거 eval을 앞 절과 같은 방식(격리 복사본, 도구 호출 8회 창, 쿼리당 3회)으로 다시 쟀다. 쿼리 2개를 추가했다(트리거: "로컬에서 podman으로 DB 띄우고 마이그레이션 적용해줘", 비트리거: "맥에 podman 설치하는 방법 알려줘"). 결과 **22/22**(이전 20개 기준 95%). 동작 eval(`evals/bts-db/evals.json`)은 다시 돌리지 않았다.

회귀 테스트 1개 추가(`template-docs.test.mjs`: README가 `--db-setup docker`를 쓰고 E 케이스에 두 적용 행이 있다). README를 `neon`으로 되돌리면 실패하는 것을 확인했다.

**독립 리뷰(Opus 5.5, `code-reviewer`).** changes-required, high 1 · medium 3 · low 5. 모두 실측으로 확인하고 반영했다.
- high: README의 `neon link`가 기본값(`--env-pull`)으로 운영 브랜치의 비밀번호 포함 URL을 루트 `.env.local`에 쓴다(이 저장소 루트에서 실제로 일어났다). `--no-env-pull --no-config`로 바꾸고, `.neon`을 `.gitignore`에 넣으라고 안내했다.
- medium: `bts-verify`의 "Neon 테스트 브랜치" 전제 문구, Neon 적용 명령이 URL을 인라인 치환해 호스트를 확인할 틈이 없던 문제(호스트 출력 줄을 분리하고, `@`가 든 비밀번호에도 맞는 정규식으로 바꿨다), 준비물 누락(compose provider, `podman machine`).
- low: 증거 형식의 로컬 예, pooled/direct가 Neon 한정이라는 표시, 테스트 DB URL 예, `docker ps`, 포트는 `"${DB_PORT:-5432}:5432"` + `packages/db/.env`(`podman compose config`로 확인), `N/A: Neon 미연결(.neon 없음)`, 운영 적용 단계(사용자 전용), 회귀 테스트 정규식 강화.

## 남은 항목 검증 (2026-09-25 추가)
"미검증 항목" 가운데 Windows를 뺀 나머지를 모두 실행했다.

### 동작 eval 재실행
현재 템플릿으로 새 fixture를 만들었다(README 명령 그대로 `--db-setup docker --install` → 템플릿 설치 → eval 시드). 이 fixture에서 13개 eval의 with_skill을 다시 돌렸다. 실행은 Sonnet 5, 채점은 Opus 5.5다. without_skill 기준선은 스킬과 무관하므로 다시 돌리지 않았다. `bts-db` eval-1의 네 번째 assertion은 구간 F 방침에 맞춰 "로컬 개발 DB 적용과 병합 전 Neon 개발 브랜치 적용을 모두 안내"로 바꿨다.

| 스킬 | 이전 | 재실행 | 수정 뒤 |
|---|---|---|---|
| bts-dev-cycle | 93% | 14/14 (100%) | — |
| bts-api | 100% | 8/8 (100%) | — |
| bts-db | 100% | 7/7 (100%) | — |
| bts-web | 88% | 7/8 (88%) | eval-1 4/4 → 8/8 (100%) |
| bts-ui | 100% | 8/8 (100%) | eval-1 assertion 추가 뒤 5/5 |
| bts-verify | 100% | 6/7 (86%) | eval-2 3/3 → 7/7 (100%) |

실패에서 찾아 고친 것:
- **bts-web 빈 상태**: "할 일 개수 카드" eval에서 0건을 "0 / 0"으로만 보여 주고 빈 상태 분기를 두지 않았다. iteration-2에서도 같은 이유로 실패했으니 편차가 아니라 규칙이 약했던 것이다. 개수·합계 카드도 0건이면 안내 문구와 다음 행동을 보여 주도록 규칙을 구체화했다.
- **bts-web와 bts-ui 충돌**: 위를 고친 뒤 재실행에서 에이전트가 bts-ui의 새 작업 게이트("내용이 거의 없는 BTS 기본 화면을 채우는 것도 새 작업")에 걸려 코드를 쓰지 않았다(1/4). bts-web는 새 화면·새 흐름만 게이트 대상으로 본다. 판단 기준을 "요청의 범위"로 정했다. 기존 화면(BTS 기본 화면 포함)에 카드나 컴포넌트 하나를 더하는 요청은 좁은 개선이다. 기본 화면을 제품 화면으로 채우거나 다시 구성하는 요청은 새 작업이다. 재실행: bts-web 4/4, bts-ui "새로 디자인" eval은 여전히 게이트에서 멈춤 4/4.
- **bts-verify 빈 칸 메우기**: "빌드 통과했으니 완료 처리해 줘" eval에서 아직 하지 않은 구현 행을 `blocked: 범위 밖`으로 채워 audit을 통과시켰다(close는 하지 않았다). 완료 요청이면 먼저 audit을 돌려 빈 칸을 보고하고, 하지 않은 작업을 `blocked:`·`미실행:`으로 채우지 않도록 했다. `bts-dev-cycle`의 완료 절차에도 같은 문장을 넣었다.

- **bts-ui 추정 PRODUCT.md**: 재실행 가운데 하나가 사용자 답 없이 추정으로 `PRODUCT.md`를 만들었다. 기존 assertion은 통과했지만, impeccable은 그 파일을 보고 init을 끝난 것으로 판단해 다음 세션에서 인터뷰를 건너뛴다(채점자가 `impeccable context`로 확인). 사용자 답을 받기 전에는 `PRODUCT.md`를 만들지 않도록 하고, eval-1에 "사용자 답을 받기 전에 PRODUCT.md를 추정으로 만들지 않았다" assertion을 추가했다. 재실행 5/5.

**독립 리뷰(Opus 5.5)**: medium 3, low 4 → 모두 반영 → 재리뷰 승인(새 low 4 중 3건 반영, 1건은 재실행으로 해소).
- `blocked`·`미실행` 정의를 `bts-verify` 원칙에 한 번만 둔다. `blocked`는 에이전트가 이번 세션에서 해소할 수 없는 원인(외부 DB·서비스, 권한, 개발 서버를 띄울 수 없는 환경, 도구 미설치·버전 미달, 리뷰어 응답 실패나 서브에이전트를 쓸 수 없는 환경). `미실행`은 사용자가 범위에서 뺀 단계(`미실행: 사용자 요청으로 범위 제외(<날짜>)`)나 앞 단계가 blocked여서 할 수 없는 뒤 단계. 이 정의가 없으면 "사용자가 그대로 닫자고 할 때 close" 경로가 막힌다(close는 audit을 먼저 돌린다).
- 부분 완료 보고를 "blocked N건, 미실행 M건"으로.
- 좁은 개선은 `PRODUCT.md`가 없어도 init 없이 진행한다(`bts-ui` 단계표, `dev-workflow.md` B행). 새 영역·섹션이나 카드·컴포넌트 둘 이상은 새 작업, 애매하면 새 작업.
- `bts-web` 예제의 빈 상태에 다음 행동 링크를 넣었다.
- 위 수정 뒤 bts-web eval-1, bts-ui eval-1, bts-verify eval-2를 다시 돌려 모두 통과했다(4/4, 5/5, 3/3).
- Task 14 archive의 `미실행: … 범위` 행은 옛 규칙으로 닫은 라운드의 기록이라 그대로 둔다. 지금 규칙으로는 사용자 범위 제외 표기를 쓴다.

description은 바꾸지 않았으므로 트리거 eval은 다시 돌리지 않았다.

### 전역 프로세스 스킬이 없는 환경 + Codex 실제 라운드
실제 앱(`my-app`) 복사본 두 개에서 같은 요청("healthCheck가 `{ status, time }`을 돌려주고 홈 화면에 서버 응답 시각 표시")을 끝까지 진행했다. 질문은 금지했고, 개발 서버·브라우저·외부 DB 단계는 `blocked`로 적게 했으며, close까지 요구했다.

| 확인 | Claude Code | Codex (codex-cli 0.157.0) |
|---|---|---|
| 전역 스킬 제거 방법 | `claude -p --setting-sources project,local`: 사용자 설정의 플러그인(superpowers·OMC)과 `~/.claude/skills`(gstack)가 빠진다. 세션의 스킬 목록으로 확인 | 임시 `CODEX_HOME`(auth와 신뢰 설정만) + 임시 `HOME`: `~/.agents/skills/superpowers`도 빠진다. 스킬 목록으로 확인 |
| 라운드 | F(+H, vitest 최초 도입), 32행 | F, 29행 |
| 대체 절차 | superpowers 없음 → 스펙·계획 직접 작성, 테스트 먼저 작성해 실패 확인 뒤 구현 | 같은 대체 절차(코디네이터 직접 구현) |
| 리뷰 | `bts-reviewer`(code) 서브에이전트: approve, low 4 (반영 2, 기각 2) | `.codex/agents`의 `bts-reviewer`(code): approve, 지적 0 |
| 검사 (직접 재확인) | `check-types` 5/5, `pnpm test` 1 passed, `build` exit 0 | `check-types` 5/5. vitest 설치와 `build`는 Codex 샌드박스에 네트워크가 없어 blocked로 기록 |
| audit·close | 통과 → `tasks/archive/2026-09.md` (부분 완료: blocked 6, 미실행 1) | 통과 → archive (부분 완료: blocked 11) |

Codex는 처음 두 번 pnpm을 쓰지 못했다. 원인은 템플릿이 아니라 격리 방법이었다. Codex는 `zsh -lc`로 명령을 돌리는데 임시 `HOME`에 `.zprofile`이 없어 Homebrew의 pnpm 대신 Corepack shim이 잡혔고, 샌드박스가 그 다운로드를 막았다. 이 상태에서도 Codex는 `node scripts/dev-cycle.mjs`로 라운드를 끝까지 진행했다. 임시 `HOME`에 `brew shellenv` 한 줄을 넣은 세 번째 실행에서는 `pnpm dev-cycle`을 정상으로 썼다.

### Neon 개발·테스트 브랜치
사용자 승인을 받고 실제 계정의 Neon 프로젝트에서 `migration-flow.md` 5단계를 문서 그대로 따랐다(`fx-docker`, `pg` 드라이버, todo 라운드 코드).
- `neon link --no-env-pull --no-config` → `.neon`만 생성, `.env.local` 없음.
- `neon branches create --name dev/template-verify`, `test/template-verify`.
- 호스트 확인 줄: 개발 브랜치 `ep-rough-band-…`, 운영 `ep-autumn-block-…`로 서로 다름을 확인한 뒤 적용.
- `DATABASE_URL="$(neon cs dev/template-verify)" pnpm --filter @fx-docker/db db:migrate` → applied. 테스트 브랜치도 같은 방법으로 적용.
- 격리 테스트 `TEST_DATABASE_URL=<테스트 브랜치 direct>` → **4 passed**.
- 테이블: 두 브랜치에 5개, **운영 브랜치에는 없음**(운영 무변경).
- 7단계 정리: 두 브랜치를 삭제했다. 남은 브랜치는 production 하나다.

### Docker CLI의 `db:start`
이 기기에는 Docker Desktop이 없다. Docker CLI 29.8.1 정적 바이너리를 스크래치에만 받아 Podman API 소켓(`DOCKER_HOST`)과 기존 docker-compose v2.40.0 플러그인에 연결했다. `fx-install`에서 README의 `DB_PORT` 방식(5434)으로 바꾼 뒤:
- `pnpm --filter @fx-install/db db:start` → 컨테이너 Started, `0.0.0.0:5434`
- `db:generate` → `db:migrate` → 테이블 4개(컨테이너 안 `psql`로 확인)
- `db:stop` → Exited, `db:down` → 컨테이너·네트워크 제거
BTS가 만든 `docker compose` 스크립트와 `DB_PORT` 보간이 Docker CLI에서 그대로 동작함을 확인했다. Docker Desktop 엔진 자체는 쓰지 않았다.

### 브라우저 단계가 있는 실제 라운드
이 문서를 정리하다가, 개발 서버와 브라우저를 쓰는 단계(스크린샷, impeccable critique·audit, QA)를 실제 라운드에서 끝까지 돌린 기록이 없다는 것을 확인했다. Task 14는 화면 변경이 없어 N/A였고, 런타임은 curl로 대신했다. 그래서 `my-app` 복사본에서 같은 요청(healthCheck 시각 표시)을 개발 서버와 브라우저를 허용하고 두 번 진행했다(로컬 DB 5433, 전역 스킬 있음).

| 확인 | 1차: 이전 템플릿(agent-browser) | 2차: ego-browser 템플릿 |
|---|---|---|
| 케이스 | F(+H), 32행, blocked·미실행 0 | F(+H), 32행, blocked·미실행 0 |
| 스크린샷 | agent-browser: desktop·mobile·끊김·최종 | ego-browser: desktop·mobile·끊김·라이트 테마·수정 뒤 |
| critique | 19/40 → polish(P1 2건 반영: 장애 뒤 "Connected" 유지, 390px 가로 넘침) | 18/32 → 22/32 (P1 2건 중 1건 반영, 1건 보류) |
| audit | 12/20 → 15/20 (기준 16에 1점 미달, 남은 감점은 BTS 기본 코드) | 16/20, 접근성 3/4 (기준 충족) |
| QA | gstack qa-only 99/100, 콘솔 오류 0 | gstack qa-only (자체 브라우저) |
| 리뷰·close | bts-reviewer approve ×2 → audit 통과 → close | bts-reviewer approve ×2 → audit 통과 → close |

두 라운드 모두 BTS 기본 화면의 문제를 찾았다(390px에서 ASCII 로고 때문에 페이지가 495px로 넓어짐, h1 없음, 오류 토스트의 retry가 다시 요청하지 않음). 이번 변경 범위 밖이라 고치지 않았다.

### ego-browser 전환 (2026-09-26, 사용자 결정)
브라우저 검증과 QA 흐름 확인은 ego-browser(ego lite 앱, macOS)를 먼저 쓰고, 쓸 수 없을 때만 agent-browser로 대신한다. `next-dev-loop`는 `/_next/mcp` 진단에만 쓴다. gstack `qa-only`·`qa`는 사용자가 요청할 때만 쓴다.

실측:
- ego lite 창이 화면에 보이지 않으면 `Page.captureScreenshot`이 시간 초과로 끝난다(세 가지 옵션 모두). 창을 띄운 뒤에는 된다. 창을 띄운 직후 첫 desktop 캡처가 한 번 시간 초과되어 재시도 1회를 넣었다.
- `taskSpace`의 페이지는 override 전 viewport가 0×0이다. `Emulation.setDeviceMetricsOverride`로 1440×900, 390×844를 지정한다.
- `references/browser.md`의 스크립트를 문서 그대로(자리표시자만 채워) 실제 앱에 두 번 실행했다: 1440×900, 390×844 PNG.
- 개발 서버만 있고 브라우저가 없으면 `/_next/mcp`의 `get_errors`가 "No browser sessions connected"를 돌려준다. ego-browser로 페이지를 연 뒤에는 `get_errors`(`sessionErrors: []`)와 `get_page_metadata`가 동작한다. agent-browser 없이 next-dev-loop 진단을 쓸 수 있다.
- 가로로 넘치는 페이지는 모바일 에뮬레이션에서 `innerWidth`가 390이 아니라 495로 나온다. 절차에 "390보다 크면 가로 넘침 결함"으로 적었다.
- 2차 라운드는 ego-browser로 스크린샷과 흐름을 확인했다(ego 명령 12회). 이 라운드는 next-dev-loop 문구를 고치기 전 템플릿이라 next-dev-loop에는 agent-browser를 함께 썼다. 이후 "ego-browser를 쓸 때는 next-dev-loop의 agent-browser 요구를 건너뛰고 `/_next/mcp`만 쓴다"를 넣었다.
- **3차 라운드(최종 템플릿, QA 포함)**: 브라우저는 ego-browser만 썼다(명령 19회, agent-browser 0회). next-dev-loop는 `/_next/mcp`만 쓰고 브라우저 세션은 ego 페이지가 맡았다(`get_errors` 오류 0, `get_page_metadata` 확인). desktop·mobile 스크린샷에서 mobile `innerWidth` 495를 가로 넘침 결함으로 기록하고 고친 뒤 390으로 재확인했다. QA는 ego-browser로 흐름 4개(로딩→실패, ko-KR·뉴욕 시간대 390px, 재조회 실패, 복구)를 보고만 하며 확인하고 스크린샷 5장을 남겼다. critique 15/24 → 18/24(바뀐 휴리스틱만 재채점), audit 14/20 → 15/20(접근성 3/4). audit 통과(blocked·미실행 0) → close.
- bts-verify description을 바꿨으므로 트리거를 다시 쟀다: 19/20(95%, 이전과 같음, 놓친 쿼리도 같은 "next-dev-loop로…").
- 독립 리뷰(Opus 5.5): high 1(next-dev-loop가 agent-browser 없으면 멈추라고 함 → 위 실측으로 해소), medium 4(spaceId를 먼저 출력하고 override를 finally로 해제, finish 예시를 spaceId로, 증거 표기 `대안: agent-browser (ego-browser 없음|창 표시 불가)`, 실제 프로필 보호 규칙: localhost만·소셜 로그인 금지·쿠키 삭제 금지), low 2(설치기의 agent-browser 설치 안내, blocked 문구) 모두 반영.

## 실제 프로젝트(my-app) 적용 피드백 (2026-09-27 추가)
설치한 하네스 파일 20개는 템플릿과 같았다. 실제 개발 중에 드러난 다음 문제를 템플릿에 반영했다.
- **설치 직후 커밋**: 설치 결과를 커밋하지 않고 첫 라운드를 열면 `audit`이 `케이스 상향 필요: 현재 diff 판정은 F`로 실패했다. 기능 브랜치에 커밋해도 기준이 merge-base라 해결되지 않는다. README의 설치한 뒤 절차와 설치기의 다음 할 일에 기본 브랜치 커밋을 넣었다.
- **도구 상태 폴더**: OMC(`.omc/`), OMX(`.omx/`), impeccable hooks(`.impeccable/hook.*.json`)가 프로젝트에 상태 파일을 쓴다. 설치기가 `.gitignore`에 `.omc/`, `.omx/`를 추가한다(`.omc`, `/.omc/`처럼 표기가 달라도 이미 있는 항목으로 본다). BTS `biome.json`은 `vcs.useIgnoreFile: false`여서 gitignore와 상관없이 이 파일 7개가 `biome check .` 지적에 더해졌다. `BIOME_IGNORES`에 `!**/.omc`, `!**/.omx`, `!**/.impeccable`을 추가했다. Biome 2.5.14로 중첩된 `apps/web/.omc`까지 제외되는 것을 확인했다.
- **shadcn CLI**: 루트에서 `npx shadcn@latest info --json`을 실행하면 `monorepo_root` 오류가 났다. `bts-ui`에 `pnpm --filter @<프로젝트>/ui exec shadcn <명령>`을 적었다(실제 앱에서 exit 0 확인).
- **BTS README의 `db:push`**: 생성된 프로젝트 README가 `pnpm run db:push`를 안내해 "스키마 변경은 마이그레이션으로만" 규칙과 충돌한다. 템플릿 README의 설치한 뒤 1번에 따르지 않도록 적었다.
- 테스트: `node --test 'templates/bts-next-neon/tests/*.test.mjs'` → 67 pass. `.gitignore` 표기 정규화 테스트 1개를 추가했다.

## 프로젝트 scope 스킬 자동 설치 (2026-09-27 추가)
설치기가 공식 스킬만 받던 것을, bts 스킬이 부르는 내부 스킬 전체를 프로젝트 scope에 설치하도록 바꿨다. 목록 정본은 `files/skills.manifest.json`, 설치는 `files/scripts/skills-setup.mjs`(설치기가 부르고 팀원은 `pnpm skills:setup`)다. 설계는 [스펙](../../docs/superpowers/specs/2026-09-27-bts-next-supabase-and-project-skills-design.md). 같은 날 만든 [bts-next-supabase](../prokit-next-supabase/VERIFICATION.md)와 설치기·스크립트·공통 테스트가 바이트 단위로 같다.
- 단위 테스트: `node --test 'templates/bts-next-neon/tests/*.test.mjs'` → **81 통과, 0 실패**. 추가: `skills-setup.test.mjs` 9개(스텁 `npx`·`claude`·`omx`로 설치·멱등·도구 없음·`--with-global`·실패 exit 2·깨진 settings.json 보존, 실제 매니페스트 규칙), OMX 에이전트와 `agents:check` 공존, H 규칙 경로, `shared-files.test.mjs`.
- fixture(BTS 3.44.1 `--db-setup docker`, 원본 커밋에서 최종 템플릿으로 설치, 스킬 CLI·`claude`·`omx` 실제 실행):

| 검사 | 결과 |
|---|---|
| `install.sh` 종료 코드 | 0 |
| 스킬 | 37개 설치(도메인 21 + Codex 전용 superpowers 15, skill-creator 1). `.agents/skills` 43개, `.claude/skills` 27개(Codex 전용은 링크하지 않음), `skills-lock.json` 37항목 |
| Claude 플러그인 | `.claude/settings.json`에 마켓플레이스 2개와 플러그인 3개(superpowers, skill-creator, oh-my-claudecode) 선언, project scope 설치 3개 성공 |
| OMX | `omx setup --scope project --no-merge-agents` → `.codex/skills` 24, `.codex/agents` 20(OMX 18 + bts 2). `AGENTS.md`는 그대로다. `--merge-agents`는 "묻지 말고 끝까지 실행"하라는 257줄 블록을 AGENTS.md에 넣어(CLAUDE.md가 `@AGENTS.md`로 읽는다) 쓰지 않는다 |
| `pnpm skills:check` / `agents:check` / `check-types` | 모두 exit 0 |
| 멱등성 | 커밋 뒤 두 번째 실행: 새 설치 0, "동일 25, 유지(템플릿과 다름) 없음", 작업 트리 변경 0 |
| biome | BTS 원본 83 errors → 설치 뒤 81 errors (새 지적 0) |

- 빈 `CLAUDE_CONFIG_DIR`에서는 `claude-plugins-official`이 등록되어 있지 않아 superpowers 설치가 실패했다. 매니페스트에 공식 마켓플레이스도 선언하도록 고친 뒤 세 플러그인 모두 설치됐다. 마켓플레이스는 사용자 전역 등록과 같은 형식(github이면 `owner/repo`)으로 등록한다. git URL로 다시 등록하면 전역 `known_marketplaces.json`의 source 형식이 바뀌는 것을 확인했기 때문이다.
- 독립 리뷰(Opus) 지적 11건을 반영했다. 설치 스크립트 관련: 끈 플러그인 재활성화 방지, 등록된 마켓플레이스 재등록 방지, `omx` 없는 기기의 `skills:check`, AGENTS.md 설치 규칙, `--diff`는 설치 안 함, 심볼릭 링크 경로에서 `dev-cycle.mjs`·`sync-agents.mjs`·`skills-setup.mjs`가 아무것도 하지 않던 결함(재현 후 수정). 상세는 [bts-next-supabase VERIFICATION](../prokit-next-supabase/VERIFICATION.md#독립-리뷰-opus-읽기-전용).
- 미검증: 깨끗한 기기에서 `--with-global`로 전역 도구(OMX CLI, gstack, agent-browser, Neon CLI)를 실제로 설치하는 경로. 이 기기에는 모두 있어 스텁 테스트로만 확인했다.

## bts 스킬 구성 검수 (2026-09-27 추가)
공통 스킬, 러너, 설치기의 변경과 동작 eval 결과는 [bts-next-supabase의 VERIFICATION.md](../prokit-next-supabase/VERIFICATION.md#bts-스킬-구성-검수-2026-09-27-추가)에 적었다. 공유 파일이라 두 템플릿에 똑같이 들어간다. 테스트는 86개가 통과한다.

neon에만 고친 것:
- **URL 확인 `sed`**: `migration-flow.md`의 Neon 브랜치 URL 확인 `sed`는 형식이 맞지 않으면 비밀번호가 든 URL 전체를 출력했다. `sed -nE '…#p'`로 바꾸고, 출력이 없으면 멈추게 했다(supabase에서 먼저 고친 결함).
- **`--custom` 안내**: SQL을 직접 쓰는 `--custom` 마이그레이션 안내와 스냅샷 주의를 옮겨 적었다.
- **push 뒤 되돌리기**: `db:push`로 실험한 DB는 마이그레이션 기록이 없어 다음 `db:migrate`가 실패한다. 이 DB를 되돌리는 방법을 적었다.
- **증거 예시**: 마이그레이션 이름을 drizzle-kit rc 형식(`<시각>_<이름>`)으로 맞췄다.

neon fixture에서는 동작 eval과 재설치를 다시 하지 않았다. 설치기 변경은 dbPush 한 줄이고 두 템플릿에서 같다.

## agent-browser 기본 설치와 Windows(WSL2) 안내 (2026-09-27 추가)
설치기와 `skills-setup.mjs` 변경, WSL2 흉내 검증은 [bts-next-supabase의 VERIFICATION.md](../prokit-next-supabase/VERIFICATION.md#agent-browser-기본-설치와-windowswsl2-안내-2026-09-27-추가)에 적었다. 실제 설치 확인은 새 BTS 프로젝트에 이 neon 템플릿을 설치해 했다. 테스트는 91개가 통과한다.

neon에만 해당하는 것:
- **Ubuntu Podman의 짧은 이미지 이름**: BTS가 만든 compose 파일의 `image: postgres:18`을 Ubuntu 24.04(Podman 4.9.3, podman-compose 1.0.6)와 26.04(Podman 5.7.0, podman-compose 1.5.0)의 Podman이 `short-name "postgres:18" did not resolve`로 받지 못했다. macOS의 Podman 머신은 docker.io를 기본 검색 레지스트리로 둬서 드러나지 않았다. `~/.config/containers/registries.conf`에 `unqualified-search-registries = ["docker.io"]`를 넣은 뒤에는 두 버전 모두에서 `podman compose up -d`가 통과했다(Postgres 18.6, `pg_isready`, 호스트 5432). 템플릿 README Windows 절과 `bts-db` migration-flow에 적었다. compose 파일은 BTS 생성물이라 설치기가 고치지 않는다.

## Vercel 배포 (2026-09-27 추가)
### 바꾼 것
- **공식 스킬 검토**: 공식 저장소(Vercel `vercel-labs/agent-skills`와 Vercel 플러그인 `vercel/vercel-plugin`, Next.js `vercel-labs/next-skills`와 `vercel/next.js`, `supabase/agent-skills`, `neondatabase/agent-skills`)와 이 기기의 전역 스킬을 모두 확인했다. 웹앱을 Vercel에 올리는 스킬은 Vercel 것뿐이다. Neon의 `neon deploy`는 Neon 인프라와 Functions 배포이고, Supabase·Next.js 스킬에는 Vercel 배포가 없다. 아래 실측 함정은 어느 공식 스킬도 다루지 않는다.
- **설치 목록**: `deploy-to-vercel`, `vercel-cli-with-tokens`(`vercel-labs/agent-skills`), `access-protected-vercel-deployment`(`vercel/vercel-plugin`)를 더했다. 전역 Vercel CLI는 `--with-global`로 설치한다. Vercel 플러그인 전체, 전역의 `vercel-deploy-claimable`, gstack `ship`·`land-and-deploy`·`setup-deploy`는 넣지 않았다. 이유는 `bts-deploy`의 "공식 도구를 그대로 쓰지 않는 이유" 절에 있다.
- **환경변수 보관과 git 무시**: 배포 값은 Vercel 환경변수(Preview, Production)에만 둔다. DB 주소는 Neon CLI나 셸 환경변수로 그때 받는다. 환경별 `.env` 파일에 두지 않는 이유(배포에 올라가지 않음, varlock `@currentEnv=$NODE_ENV`라 Preview와 Production을 나누지 못함)를 README와 `bts-deploy`에 적었다. BTS는 `apps/web/.gitignore`에서만 `.env*`를 무시한다. 루트는 `.env`와 `.env*.local`, `packages/*`는 `.env`와 `.env.*.local`만 무시한다. 새 BTS 프로젝트에서 `git check-ignore`로 루트 `.env.production`·`.env.development`와 `packages/db/.env.production`이 무시되지 않는 것을 확인했다. 설치기가 루트 `.gitignore`에 `.env.*`, `!.env.schema`, `!.env.example`을 더한다. `--skip-skills`로 설치한 뒤에는 그 파일들과 `packages/db/.env.staging`이 무시되고, `apps/web/.env.schema`, `packages/db/.env.schema`는 커밋 대상으로 남았다. 다시 설치해도 줄이 늘지 않았다. 패턴을 새로 더할 때 `!` 줄을 그 뒤에 다시 쓰는지 테스트가 검사한다(되돌리면 실패).
- **얇은 프로젝트 스킬과 스크립트**: `bts-deploy`(85줄)에는 공식 스킬이 다루지 않는 이 스택의 절차와 금지 목록만 두었다. `scripts/vercel-deploy.mjs`(`pnpm vercel:deploy <develop|production> [--check]`)가 배포 전 검사, develop 고정 주소(alias), 첫 배포 방지, 지난 배포 이후 새 마이그레이션 계산, 되돌리기 안내를 한다. `.vercelignore`, `bts-db` migration-flow의 "배포 환경" 절, README "Vercel 배포" 절도 더했다.

### 실측한 Vercel CLI 60.1.1 동작
| 동작 | 대응 |
|---|---|
| `vercel deploy`는 `.gitignore`를 따르지 않는다. `--dry`의 업로드 목록에 git이 무시하는 `apps/web/.env`가 있었다 | `.vercelignore`(`.env`, `.env.*`, `!.env.schema`와 `.turbo`·`.omc` 등). 스크립트가 `.env` 줄을 검사한다. 넣은 뒤 `--dry`에서 `apps/web/.env`, `.turbo`, `.omc`가 빠지고 `.env.schema`는 올라갔다 |
| 첫 배포는 `--prod` 없이도 production이 된다(출력: "This is the project's first deployment, so it was assigned to production") | READY production 배포가 없으면 스크립트가 develop을 막는다 |
| `vercel link --yes --project <새 이름>`이 프로젝트를 만들고, `.gitignore`에 `.env*`를 더하고, 루트 `.env.local`에 `VERCEL_OIDC_TOKEN`을 쓴다 | 준비 절차에서 되돌린다 |
| Root Directory 없이 연결하면 "No framework detected" | `vercel project update --root-directory apps/web --framework nextjs` 뒤 turbo 빌드(4 태스크) 성공 |
| 비대화 모드의 `vercel deploy` 표준 출력은 JSON이고, Preview 배포의 `target`은 `null`이다 | JSON을 읽고 `null`을 preview로 본다(처음 실배포에서 대상 불일치로 잘못 멈춰 고쳤다) |
| Preview 배포를 `inspect`하면 수동 alias가 `aliases`에 없다(`null`). 주소를 `inspect`하면 가리키는 배포가 나온다 | 배포 뒤 주소 쪽을 `inspect`한다(처음에는 잘못된 경고를 내서 고쳤다) |
| `env ls --format json`의 config 값은 암호화된 값이다. `env run`은 config 값만 넘기고 sensitive 값은 넘기지 않으며 파일을 남기지 않는다. 실행 환경에 같은 이름 변수가 있으면 그 값이 Vercel 값보다 먼저다(`BETTER_AUTH_URL=https://local.example`로 확인) | `BETTER_AUTH_URL`은 config로 넣는다. 스크립트가 실행 환경 값을 떼고, 루트 `.env*` 파일에 있으면 멈춘다 |
| 느린 명령(`neon cs`)을 `vercel env add`에 바로 파이프하면 `missing_value`로 실패한다 | 셸 변수에 담아 넘긴다 |
| `vercel ls --format json`의 `meta.gitCommitSha`에 배포 커밋이 있다 | 지난 배포 이후 새 마이그레이션을 센다 |
| Preview 배포 보호: 일반 `curl`은 302, `vercel curl https://<고정 주소>/…`는 200, `vercel curl --deployment <고정 주소>`는 302 | 확인 명령에 전체 URL을 쓴다 |
| Better Auth: 배포 고유 URL에서 로그인하면 403 `INVALID_ORIGIN`, 고정 주소에서는 200 | develop은 고정 주소로 확인한다 |
| `vercel rollback` 뒤의 `--prod` 배포는 운영 주소를 가져가지 않는다(팀 alias만 붙는다). `vercel promote` 뒤 옮겨졌다 | 스크립트가 경고와 함께 `vercel promote`를 안내한다 |

### 실제 배포 (새 BTS 프로젝트, neon 템플릿)
- `install.sh` exit 0, 공식 스킬 3개를 포함해 스킬 40개가 설치됐다. `skills:check` exit 0.
- 임시 Neon 프로젝트(`main`, `develop` 브랜치)와 임시 Vercel 프로젝트(Hobby 팀)를 만들어 문서 절차대로 연결하고 환경변수 6개를 넣었다. 값은 출력하지 않았다.
- `--check`가 지난 배포 이후 새 마이그레이션 1개를 찾았다. `main`과 `develop`에 direct 주소로 `db:migrate`를 적용한 뒤 production, develop 순서로 배포했다. production `/api/auth/get-session` 200. develop은 `vercel curl`로 가입·로그인 200이었고, 가입한 사용자는 `develop`에 1명, `main`에 0명이었다(환경별 DB 분리).
- 두 번째 develop 배포에서 `--check`는 지난 develop 배포 커밋을 찾아 "새 마이그레이션 0개"를 냈고, 되돌리기 명령은 직전 배포를 가리켰다.
- 리뷰 반영 뒤 다시 확인: 운영 주소를 셸에 export한 상태에서도 develop 주소를 정확히 읽었다. rollback 뒤 production 배포에서 promote 안내가 나왔고, 안내대로 promote하니 운영 주소가 돌아왔다(`get-session` 200).
- 확인 뒤 Vercel 프로젝트, Neon 프로젝트, project scope 플러그인을 지웠다. 로컬 DB는 띄우지 않았다.

### 독립 리뷰 (Opus, 읽기 전용)
HIGH 2, MEDIUM 9, LOW 12건을 받았다. `deploy-to-vercel`을 빼자는 제안(MEDIUM)만 빼고 모두 반영했다. `deploy-to-vercel`은 사용자 결정으로 설치하고, 템플릿 `AGENTS.md` 스킬 표 아래에 배포는 `bts-deploy`를 먼저 따른다고 적었다.
- **HIGH**: 실행 환경의 `BETTER_AUTH_URL`이 Vercel 값보다 먼저 읽혀 develop alias가 운영 도메인에 붙을 수 있었다. 실행 환경 값을 떼고, 루트 `.env*` 파일을 검사하고, develop 주소가 production과 같으면 멈춘다. `--chek` 같은 모르는 플래그를 버려 오타가 실제 배포가 될 수 있었다. 이제 사용법 오류로 멈춘다.
- **MEDIUM**: `.vercelignore` 범위 확대와 검사. 마이그레이션 계산을 새로 생긴 폴더만, 한글 이름(`-z`), 이름 변경 감지 끄기(`--no-renames`. drizzle `snapshot.json`이 비슷해 새 폴더가 옮겨 온 것으로 잡혔다)로 고쳤다. 지난 production 배포 커밋이 로컬에 없거나 조상이 아니면 멈춘다. 준비 절차가 요청 없는 production 배포로 읽히던 문구, DB URL 확인을 건너뛰게 하던 예시, 토큰 줄을 출력하는 명령, rollback 뒤 promote를 고쳤다.
- **LOW**: 쓰지 않는 함수 삭제, 스키마 없음·CRLF·`env run` 실패·`.dev-cycle.json` 파싱 실패 처리, 대상 불일치 때 되돌리기 안내, `maxBuffer`, 문서 불일치(`PROD_DATABASE_URL`, 전역 도구 목록).
- 테스트: `vercel-deploy.test.mjs` 12개. 각 검사를 하나씩 빼면 해당 테스트가 실패하는 것을 확인했다. 전체 107개가 통과한다(아래 환경별 `.env` 무시 테스트 포함).

### 한계
- 커스텀 도메인, Pro 플랜, 팀이 여러 개인 계정, 토큰만 쓰는 CI 환경에서는 실행하지 않았다.
- `bts-deploy` 동작 eval은 돌리지 않았다(사용자 결정). 스킬이 요청에 맞게 불리는지와 Codex에서의 동작은 모른다.
- develop 화면은 Vercel에 로그인한 브라우저로 본다. ego-browser·agent-browser로 배포 보호를 넘는 방법은 확인하지 않았다.
- 여러 기능 브랜치가 develop DB 하나를 함께 쓰면 늦게 온 옛 시각 마이그레이션을 drizzle이 건너뛸 수 있다. 스크립트가 세는 수는 git 기준이지 DB 상태가 아니다.

## 공식 스킬 재검토 (2026-09-27 추가)
사용자가 준 공식 저장소 다섯 곳(`supabase/agent-skills`, `vercel-labs/next-skills`의 `handle-legacy-api` 브랜치, `vercel/next.js`의 canary `skills/`, `vercel-labs/agent-skills`, `neondatabase/agent-skills`)의 현재 스킬 목록을 `gh api`로 받아 매니페스트, `bts-*`의 공식 스킬 연결과 대조했다.

### 더한 것
| 스킬 | 템플릿 | 연결한 곳 | 이유 |
|---|---|---|---|
| `next-partial-prefetching-optimizer` | 두 템플릿 | `bts-web` 프리패치 행 | 2026-09-10에 upstream에 추가됐다. Partial Prefetching 도입(`-adoption`) 뒤 링크별로 무엇을 미리 받을지 조정한다. Cache Components는 도입·조정 둘 다 넣었는데 이것만 빠져 있었다. Next.js 16.3 이상이 필요하고 BTS 3.44.1은 `next ^16.3.4`다 |
| `vercel-react-view-transitions` | 두 템플릿 | `bts-ui` 개발 행 | React `<ViewTransition>`으로 화면 전환과 공유 요소 애니메이션을 만드는 법. 움직임을 넣을지는 impeccable `animate`로 정한다. 처음에는 기본으로 넣었다가, 사용자 요청으로 아래 선택 묶음 `motion`으로 옮겼다 |
| `neon-postgres-egress-optimizer` | neon | `bts-db` 공식 스킬 연결 | Neon 요금의 데이터 전송량(egress) 원인 쿼리를 `pg_stat_statements`로 찾고 `SELECT *`, 페이지 나누기 누락 등을 고친다. 운영 DB 통계 조회와 확장 설치·초기화는 요청할 때만 한다고 행에 적었다 |

### 넣지 않은 것
- `vercel-labs/next-skills`: 기본 브랜치(`main`)에는 `skills/`가 없고 README가 `vercel/next.js`로 옮겼다고 안내한다. `handle-legacy-api`는 2026-02-16 이후 멈춘 작업 브랜치다. 옛 `next-cache-components`는 이미 넣은 `next-cache-components-adoption`·`-optimizer`로 나뉘었다. `next-best-practices`와 `next-upgrade`는 더 이상 스킬이 아니고, Next.js 16.3 이상의 내장 문서(`next/dist/docs/`)와 `next dev`가 만드는 `apps/web/AGENTS.md`가 대신한다. 템플릿 `AGENTS.md`의 "먼저 읽을 문서"가 이 파일을 가리킨다. 업그레이드는 `npx @next/codemod@latest upgrade`.
- `neon-auth`: "로그인 추가" 요청에 Neon 관리형 Better Auth를 기본으로 권한다. 이 스택은 직접 운영하는 Better Auth라 안내가 부딪힌다.
- `neon-functions`, `neon-object-storage`, `neon-ai-gateway`, `vercel-optimize`, `vercel-react-native-skills`: 기본으로는 넣지 않고 아래 선택 묶음으로 둔다.
- `writing-guidelines`: Vercel 영문 문서의 문체 검토라 해당하지 않는다.
- `supabase`: supabase 템플릿에만 넣는다. neon 템플릿은 서비스와 무관한 Postgres 규칙으로 `supabase-postgres-best-practices`만 쓴다.

### 확인
- 공식 스킬 수: neon 24개 → 27개, supabase 22개 → 24개. 이어서 `vercel-react-view-transitions`를 선택 묶음으로 옮겨 neon 26개, supabase 23개가 됐다. 템플릿 README와 루트 README 비교표를 고쳤다.
- 실제 설치: 새 BTS 프로젝트 두 개(neon, supabase의 첫 커밋 복제본)에 `install.sh`를 스킬 설치까지 실행했다. 둘 다 exit 0이었다. 새 스킬은 `.agents/skills/`와 `.claude/skills/` 링크에 모두 생겼고, `name`은 매니페스트 이름과 같았다. `pnpm skills:check`는 neon "43개 중 모두 있음", supabase "40개 중 모두 있음"으로 exit 0이었다(Codex용 스킬 포함). 확인 뒤 두 디렉터리에서 project scope 플러그인 3개를 `claude plugin uninstall`로 지웠고(모두 exit 0) 디렉터리를 삭제했다. DB는 띄우지 않았다.
- 테스트: 두 템플릿 107개 통과. `skills.test.mjs`가 `bts-*`의 공식 스킬 연결 표에 적힌 스킬이 매니페스트에 있는지 검사한다.

### 선택 스킬 묶음
운영 환경을 꾸릴 때나 특정 기능을 만들 때만 쓰는 스킬은 기본으로 설치하지 않고, 매니페스트의 `optional`에 묶음으로 둔다. `pnpm skills:setup --optional <묶음>[,<묶음>]`이 기본 스킬과 함께 그 묶음을 설치한다. 기본 실행과 `--check`는 선택 묶음을 누락으로 세지 않고 `선택 스킬: ops 있음, motion 설치 안 함, mobile 일부(1/2)`처럼 상태만 보여 준다. `--check --optional <묶음>`은 그 묶음도 검사한다. 모르는 묶음 이름이면 아무것도 설치하지 않고 묶음 목록을 보여 준 뒤 exit 2다.

| 묶음 | neon | supabase | 연결한 곳 |
|---|---|---|---|
| `ops` | `vercel-optimize`, `neon-functions`, `neon-object-storage`, `neon-ai-gateway` | `vercel-optimize` | `bts-deploy`(비용·성능 점검), `bts-db`(Neon 부가 기능. 새 서비스 의존이라 도입 전에 묻고 ADR에 남긴다) |
| `motion` | `vercel-react-view-transitions` | 같음 | `bts-ui` 개발 행 |
| `mobile` | `vercel-react-native-skills` | 같음 | 없음. 이 템플릿은 웹 앱만 만들므로 React Native·Expo 앱을 따로 만들 때 쓴다 |

- Neon 부가 기능은 Neon 프로젝트가 있어야 쓰므로 supabase 템플릿의 `ops`에는 넣지 않았다.
- 템플릿 `AGENTS.md`의 계층별 스킬 아래에 묶음 표(묶음, 분야, 스킬, 관련 bts 스킬)를 두었다. 요청이 그 분야인데 스킬이 없으면 사용자에게 `--optional` 설치를 제안한다. 설치는 네트워크와 파일 변경이 있으므로 사용자가 요청할 때 한다. `mobile`은 어느 `bts-*`도 가리키지 않아 이 표가 유일한 안내이므로, `template-docs` 테스트가 매니페스트의 묶음과 스킬이 모두 표에 있는지 본다(`motion` 행을 지우면 실패한다).
- 배포 규칙도 항상 읽는 문서로 올렸다. `AGENTS.md` 보안 불변식에 "배포 값은 Vercel 환경변수에만, 새 변수는 `.env.schema`에", 에이전트 절에 "배포와 운영 DB 적용은 서브에이전트에 맡기지 않는다(중간에 사용자 동의가 필요)"를 넣었다. `CLAUDE.md`에는 AskUserQuestion으로 물을 것, Vercel 플러그인 `/vercel:deploy`와 배포 에이전트를 쓰지 않을 것, 배포 명령의 timeout, 대화형 `vercel login`을 `!`로 넘기는 법을 적었다.
- `skills-setup.test.mjs`에 선택 묶음 테스트를 더했다(기본 설치 제외, 상태 표시, `--optional` 설치, 일부 설치 표시, 모르는 묶음). 매니페스트 테스트는 기본과 선택 묶음 사이의 이름 중복도 막는다. 선택 묶음을 기본으로 설치하게 바꾸거나 상태 줄을 빼면 이 테스트가 실패한다. 전체 108개 통과.
- 실제 설치: 새 BTS 프로젝트 두 개(첫 커밋 복제본)에 `install.sh`를 실행한 뒤 `--optional ops,motion,mobile`을 실행했다.

  | 단계 | neon | supabase |
  |---|---|---|
  | 기본 설치 뒤 `--check` | "42개 중 모두 있음", 선택 묶음 모두 "설치 안 함", exit 0 | "39개 중 모두 있음", exit 0 |
  | `--optional ops,motion,mobile` | exit 0, 6개 설치, 선택 묶음 모두 "있음" | exit 0, 3개 설치 |
  | `--check --optional ops,motion,mobile` | "48개 중 모두 있음", exit 0 | "42개 중 모두 있음", exit 0 |

  새 스킬은 모두 `.agents/skills/`와 `.claude/skills/` 링크에 생겼고 `name`이 매니페스트와 같았다. `skills-lock.json`에도 기록됐다(개수는 Codex용 스킬 포함). 확인 뒤 project scope 플러그인 3개를 두 디렉터리에서 지웠고(모두 exit 0) 디렉터리를 삭제했다.

## impeccable 훅 켜기 경로 (2026-09-28 추가)
공유 파일(`install.mjs`, `bts-ui`의 `SKILL.md`, `references/impeccable-map.md`)과 README "설치한 뒤" 4번을 supabase 템플릿과 같게 고쳤다. 훅은 프로젝트 루트에서 `.agents/skills/impeccable/scripts/impeccable hooks on`으로 켜고 스킬 호출로는 켜지 않는다. 개인(전역) impeccable 스킬이 있으면 Claude Code가 그 스킬을 불러와 이 템플릿의 impeccable에 없는 `scripts/hook.mjs`를 훅 명령으로 적기 때문이다. 발견 경위와 확인 결과는 [bts-next-supabase의 VERIFICATION.md](../prokit-next-supabase/VERIFICATION.md#impeccable-훅-켜기-경로-2026-09-28-추가)에 적었다. 이 템플릿의 `node --test`는 108 통과, 0 실패다.

## Biome 기준선 정리 (2026-09-28 추가)
발견, 바꾼 것, 한계는 [bts-next-supabase의 VERIFICATION.md](../prokit-next-supabase/VERIFICATION.md#biome-기준선-정리-2026-09-28-추가)에 적었다(생성물 제외, shadcn 두 파일의 a11y override, 파일을 쓰지 않는 `--diff`, 템플릿 파일 형식). 새 BTS 프로젝트(`--db-setup docker`)에서도 결과가 같다. 설치 전 `biome check .` 오류 83건이 `pnpm check` 뒤 exit 0이 되고, `db:generate`와 `pnpm env:generate` 뒤에도 exit 0이다. `check-types`는 exit 0이다. 커밋 뒤 두 번째 설치는 "유지(템플릿과 다름) 없음"이다. 이 템플릿은 `files/skills.manifest.json`도 Biome 형식으로 맞췄다. 전에는 설치기가 설치 뒤 포맷해 두 번째 설치에서 "템플릿과 다름"으로 나왔다.

## 릴리스와 버전 관리 (2026-09-28 추가)
생성한 프로젝트의 production 배포는 릴리스(`pnpm release`: SemVer 버전 태그, `release/` 노트, `package.json` `version`, GitHub Release)한 커밋만 한다. 공유 파일(`files/scripts/release.mjs`, `files/scripts/vercel-deploy.mjs`, `install.mjs`, `bts-deploy`, `CLAUDE.md`, 공통 테스트)이라 두 템플릿에 똑같이 들어간다. 바꾼 것, 확인, 독립 리뷰, 한계는 [bts-next-supabase의 VERIFICATION.md](../prokit-next-supabase/VERIFICATION.md#릴리스와-버전-관리-2026-09-28-추가)에 적었다. 이 템플릿의 `node --test`는 117 통과, 0 실패다.

## 라운드 마무리와 Node 24 (2026-09-28 추가)
세 가지를 바꿨다. 첫째, 모든 대조표가 `[confirm] 사용자 확인` 행으로 끝나고 audit·status가 그 행의 N/A·PASS·blocked·미실행·대기 같은 건너뛰기 표시를 거부한다. 둘째, 라운드 끝은 사용자 확인 → audit·close → 커밋·push → 사용자가 고르면 릴리스와 production 배포로 마무리한다. 셋째, 준비물을 Node 24 이상으로 올렸다. 공유 파일(`files/scripts/dev-cycle.mjs`, `files/CLAUDE.md`, `bts-deploy`, `bts-dev-cycle/references/process-routing.md`, 공통 테스트)과 두 템플릿이 따로 가진 파일(`files/docs/dev-workflow.md`, `bts-dev-cycle`, `files/AGENTS.md`, `bts-db/references/migration-flow.md`, `bts-verify`, README, `evals/bts-dev-cycle`, `tests/template-docs.test.mjs`)을 같은 내용으로 고쳤다. 요청, 바꾼 것, 확인, 한계는 [bts-next-supabase의 VERIFICATION.md](../prokit-next-supabase/VERIFICATION.md#라운드-마무리와-node-24-2026-09-28-추가)에 적었다. 이 템플릿의 `node --test`는 123 통과, 0 실패다.

## 외부 스킬 업데이트 (2026-09-28 추가)
`pnpm skills:update`와 새 스킬 `bts-skills-update`로, 설치한 외부 스킬을 GitHub 원본과 파일 단위로 비교해 바뀐 스킬만 매니페스트의 에이전트대로 다시 설치한다. 진행 중인 라운드가 없을 때 `pnpm dev-cycle status`가 하루 한 번 확인하고, 새 버전이 있으면 업데이트할지 묻는다(지금, 항상 자동, 나중에, 다시 묻지 않기). 공유 파일(`files/scripts/skills-setup.mjs`, `files/scripts/dev-cycle.mjs`, `install.mjs`, `files/CLAUDE.md`, 새 스킬, `evals/seed/apply.sh`, `evals/bts-skills-update/seed.sh`, 공통 테스트)과 두 템플릿이 따로 가진 파일(`bts-dev-cycle`, `files/AGENTS.md`, README, `evals/bts-skills-update`, `tests/template-docs.test.mjs`)을 같은 내용으로 고쳤다. 이 템플릿에서는 설치를 다시 하지 않았다. 대신 neon 전용 저장소 `neondatabase/agent-skills`의 트리가 잘리지 않고 매니페스트 스킬 폴더가 모두 있음을 확인했다. 요청, 바꾼 것, next-skills 검토, 확인, 한계는 [bts-next-supabase의 VERIFICATION.md](../prokit-next-supabase/VERIFICATION.md#외부-스킬-업데이트-2026-09-28-추가)에 적었다. 이 템플릿의 `node --test`는 139 통과, 0 실패다.

## 보안 리뷰 지적 반영: Git 자동 배포와 스크립트 변경 (2026-09-28 추가)
실사용 프로젝트 A의 security 리뷰가 찾은 low 2건을 고쳤다.
- **Git 자동 배포**: `vercel link --yes`가 새 프로젝트를 만들며 git 원격을 묻지 않고 연결하는 것을 실측했다. 대응은 세 가지다.
  - `pnpm vercel:deploy production --check`가 `vercel api`로 Git 연결을 읽고, 켜져 있거나 확인하지 못하면 `Git 자동 배포`로 준비 안 됨을 보고한다.
  - `bts-deploy` 준비 절차에서 그 연결을 끊는다.
  - `bts-dev-cycle` 5절과 릴리스 발행은 push하기 전에 이 검사를 거친다.
- **스크립트가 바뀐 외부 스킬**: 알림, 설치, 검증을 다음과 같이 바꿨다.
  - auto여도 묻는다.
  - `--check`가 파일별 blob과 검토 고정값을 보여 준다.
  - 이름을 지정했고 원격이 검토한 판 그대로일 때만 설치하고, 설치 뒤 다시 대조한다.

공유 파일(`files/scripts/vercel-deploy.mjs`, `files/scripts/skills-setup.mjs`, `bts-deploy`, `bts-skills-update`, eval 파일, 공통 테스트)과 `bts-dev-cycle`, README, `tests/template-docs.test.mjs`를 두 템플릿에서 같은 내용으로 고쳤다. 실측, 리뷰, eval, 한계는 [bts-next-supabase의 VERIFICATION.md](../prokit-next-supabase/VERIFICATION.md#보안-리뷰-지적-반영-git-자동-배포와-스크립트-변경-2026-09-28-추가)에 적었다. 이 템플릿의 `node --test`는 150 통과, 0 실패다.

## ponytail을 개발과 리뷰에 연결 (2026-09-28 추가)
ponytail이 템플릿에 연결되어 있지 않았다(사용자 전역 설치로만 작동했다). 매니페스트에 Claude 플러그인 `ponytail@ponytail`과 Codex 스킬 `ponytail`, `ponytail-review`를 넣었다. `process-routing.md`의 구현·리뷰 보강과 규칙 6(우선순위, 리뷰어 범위 유지, `ponytail-review` 입력과 반영 기준), `bts-dev-cycle` 4절, `CLAUDE.md`, `bts-skills-update`, README의 훅 부작용 안내를 고쳤다. 공유 파일(`process-routing.md`, `CLAUDE.md`, `bts-skills-update`, `evals/bts-dev-cycle/seed.sh`, 공통 테스트)과 두 템플릿이 따로 가진 파일(매니페스트, `bts-dev-cycle`, `evals/bts-dev-cycle/evals.json`, README, `tests/template-docs.test.mjs`)을 같은 내용으로 고쳤다. 이 템플릿에서는 설치와 eval을 다시 하지 않았다. 바뀐 것은 두 템플릿에 같은 ponytail 항목뿐이다. 설치 확인, 훅 확인, Claude·Codex eval, 한계는 [bts-next-supabase의 VERIFICATION.md](../prokit-next-supabase/VERIFICATION.md#ponytail을-개발과-리뷰에-연결-2026-09-28-추가)에 적었다. 이 템플릿의 `node --test`는 151 통과, 0 실패다.

## 빈 release/ 폴더 오탐 (2026-09-28 추가)
`vercel-deploy.mjs`가 빈 `release/` 폴더도 릴리스 기록으로 보던 것을 커밋된 노트(`git ls-files release`)만 보도록 고쳤다(공유 파일과 공통 테스트). 내용은 [bts-next-supabase의 VERIFICATION.md](../prokit-next-supabase/VERIFICATION.md#빈-release-폴더-오탐-2026-09-28-추가)에 적었다. 이 템플릿의 `node --test`는 151 통과, 0 실패다.

## GitHub Release 제목 중복 (2026-09-28 추가)
`release.mjs --publish`가 노트 첫 줄(`# vX.Y.Z — 제목`)까지 Release 본문에 올려 제목이 두 번 보이던 것을 고쳤다. 첫 줄을 뺀 노트를 stdin으로 넘기고, 재시도 명령도 같은 방식으로 바꿨다(공유 파일 `release.mjs`, `vercel-deploy.mjs`와 공통 테스트). 내용은 [bts-next-supabase의 VERIFICATION.md](../prokit-next-supabase/VERIFICATION.md#github-release-제목-중복-2026-09-28-추가)에 적었다. 이 템플릿의 `node --test`는 151 통과, 0 실패다.

## 보안 리뷰 지적 반영: 배포 제외, 선택 환경변수, 전역 설치 고정, 커밋 전 비밀값 검사, turbo 에이전트 블록 (2026-09-28 추가)
my-app에 v0.5.3을 반영하면서 받은 `bts-reviewer(security)` 지적(low 5건)과, turbo 2.11.5로 올린 라운드의 지적(medium 1건, low 1건)을 템플릿에 반영했다.
- `.vercelignore`(공유): `.neon`(Neon org·project·branch id), `.codex`(로컬 절대 경로와 OMX 지시가 든 설정), `*.pem`, `*.local`을 더했다. git은 무시하지만 CLI 배포에는 올라가던 파일이다.
- `vercel-deploy.mjs`의 `requiredEnv`(공유): 바로 위 주석 줄에 `@optional`이나 `@required=false`가 있는 변수는 필수에서 뺀다. 전에는 값이 빈 변수를 모두 필수로 세서, 아직 쓰지 않는 유료 API 키(`@optional @sensitive`)도 Preview까지 넣어야 배포 검사를 통과했다. `bts-deploy` 환경변수 절에 안내를 더했다. 테스트에 빈 줄로 떨어진 주석과 CRLF 경우를 더했다.
- agent-browser 자동 전역 설치: `npm install -g agent-browser@latest`를 `@0.31.1`(next-dev-loop 하한)로 고정했다. `--with-global` 없이도 도는 설치라 검토하지 않은 새 판을 받지 않게 했다. 없거나 낮으면 설치하는 동작(`auto`)은 그대로다.
- 커밋 전 비밀값 검사: 러너(공유)에 `pnpm dev-cycle secrets`를 더하고 `bts-dev-cycle` 5절 7번에서 커밋 전에 실행하게 했다. 스테이징한 변경(`git diff --cached`)에서 로컬 `.env`(루트, `apps/web`, `packages/db`)의 값 가운데 이름이 비밀처럼 보이는 변수(`SECRET`, `TOKEN`, `PASSWORD`, `KEY`, `DATABASE_URL`로 끝남, 8자 이상, localhost 주소 제외)와 흔한 형식 5개(개인 키, `sk-`, GitHub 토큰, AWS 액세스 키, 비밀번호 12자 이상인 Postgres 주소)를 찾는다. 값은 출력하지 않고 파일과 변수 이름만 보여 준다.
- turbo `agentGuidance`: turbo 2.11.5부터 AI 에이전트가 turbo를 실행하면 루트 `AGENTS.md`에 `BEGIN/END:turborepo-agent-rules` 블록을 쓰고 "커밋해 두라"고 지시한다. 커밋 규칙과 부딪혀서 설치기(공유)가 `turbo.json`의 `"$schema"` 뒤에 `"agentGuidance": false`를 넣는다. 2.11.3과 2.11.4는 이 키를 `Found an unknown key 'agentGuidance'`로 거부하므로(실측), 설치된 turbo의 `schema.json`에 키가 있을 때만 넣는다. `--diff`는 `turbo.json 추가 예정`을 보여 준다. `bts-skills-update`에 turbo 절을 더했다: turborepo 스킬은 지침을 turbo 번들 문서로 넘기므로 turbo를 올릴 때 바뀐 문서를 지시 변경으로 보고, 블록이 생겼으면 지운다.

**검증.** 두 템플릿에서 `skills.test.mjs`를 뺀 테스트 136개가 통과했다(`skills.test.mjs`는 python3와 skill-creator가 필요해 돌리지 않았다). 설치기 변경은 실제 BTS 3.44.1 프로젝트(README 생성 명령, 스크래치 디렉터리, `--skip-skills`)로 확인했다.
- 생성 직후 turbo는 2.11.4였다(2.11.5는 pnpm 최소 릴리스 경과 기간 안). 설치 뒤 `turbo.json`에 변경이 없고 `pnpm check-types`가 5/5 통과했다.
- `pnpm add -D -w turbo@2.11.5` 뒤 `--diff`가 `turbo.json 추가 예정: "agentGuidance": false`를 보였다. 설치하자 `"$schema"` 바로 뒤에 한 줄이 들어갔고, `pnpm check-types` 5/5, `pnpm build` 4/4, `AGENTS.md`의 블록은 0이었다. 다시 `--diff`하면 `없음`이다.
- 대조: 그 줄을 지우고 `turbo run check-types --dry=json`을 실행하자 `AGENTS.md`에 블록이 생겼다(Claude Code 셸, `CLAUDECODE` 설정됨).
- 확인용 프로젝트는 지웠다. DB 컨테이너는 띄우지 않았고, `--skip-skills`라 플러그인도 등록하지 않았다.

**코드 리뷰 지적 반영.** 위 변경의 독립 리뷰 지적(medium 2건, low 11건)을 고쳤다(공유 파일, 공통 테스트).
- `secrets`의 `.env` 읽기(medium): 정규식의 `\s`가 줄바꿈을 넘었다. 그래서 값이 빈 줄(`KEY=`) 다음 줄 전체를 그 값으로 삼켰고, 다음 변수는 검사에서 빠졌다. 이제 한 줄 안에서만 맞춘다.
  - 따옴표 값은 따옴표 안만 쓰고, 따옴표 없는 값은 ` #` 뒤 주석을 뗀다. 전에는 주석이 붙은 값이 diff와 맞지 않아 놓쳤다.
  - 루트, `apps/web`, `packages/db`의 `.env*` 파일을 모두 읽는다(`.env.local`, `.env.development.local` 등). 커밋하는 `.env.schema`와 `.env.example`은 뺀다. 백틱으로 감싼 값도 따옴표 값처럼 읽는다.
  - 이름 규칙에 `DATABASE_URL*`, `POSTGRES_URL*`, `DIRECT_URL`을 더했다.
  - 소문자로만 된 값(`changeme` 등)은 자리표시자로 보고 넘긴다. 소문자 암구호(`correct-horse-battery-staple` 같은)도 함께 넘기는 한계가 있고, 코드 주석에 적었다.
- `secrets`의 diff 읽기(medium): 1MB를 넘는 스테이징 diff에서 `ENOBUFS`로 멈추고 exit 1로 끝났다. exit 1은 비밀값 발견과 같은 코드다. 이제 `git()`의 버퍼를 256MB로 늘렸고, 검사를 실행하지 못하면 exit 2와 "비밀값 발견 아님"을 낸다.
  - `++ `로 시작하는 추가 줄을 파일 머리 줄(`+++ `)로 읽고 검사하지 않던 것을 `diff --git`·`@@` 상태로 가렸다.
  - `diff.mnemonicPrefix`, `diff.noprefix`, `core.quotePath`, textconv 같은 사용자 git 설정과 관계없이 같은 형식으로 읽도록 `-c core.quotePath=false --src-prefix=a/ --dst-prefix=b/ --no-textconv`를 준다.
  - 공백이 든 경로 뒤에 git이 붙이는 탭을 뗀다.
  - `--text`를 주어 `-diff` 속성이나 NUL 바이트 때문에 바이너리로 취급되는 파일도 내용을 본다.
  - 하위 폴더에서 실행해도 저장소 루트(`git rev-parse --show-toplevel`)의 `.env`를 읽는다.
  - `bts-dev-cycle` 7번에 "값을 지우거나 스테이징에서 빼고 다시 실행해 통과하면 커밋"과 exit 2 처리를 적었다.
- `requiredEnv`: `@optional=false`를 선택 변수로 세던 것을 필수로 센다.
- 설치기 turbo:
  - CRLF `turbo.json`에서 아무 말 없이 넘어가던 것을 고쳐, 파일의 줄바꿈 그대로 넣는다.
  - 넣어야 하는데 자리를 못 찾으면(주석이 든 `turbo.json`, `"$schema"` 없음) 파일을 두고 `--diff`와 설치 출력에 경고를 낸다. 중첩 객체의 `"$schema"` 줄 뒤에 들어가는 경우도 쓰지 않고 경고한다(turbo가 모르는 키로 거부하므로 최상위에 들어갔는지 확인한다).
- `.vercelignore`: `**/supabase/.temp`(`supabase link`가 남기는 project-ref와 pooler 주소)와 `*.local.*`(`.claude/settings.local.json` 등)을 더했다. 같은 패턴을 `git check-ignore`로 대신 확인했다.
  - `packages/db/supabase/.temp`와 루트 `supabase/.temp`, `settings.local.json`, `.env.local`, `*.pem`은 빠진다.
  - `.env.schema`, 앱 소스, supabase `migrations`·`config.toml`은 남는다.
  - 실제 `vercel deploy`의 업로드 목록은 보지 않았다.

**검증(리뷰 반영).** 두 템플릿에서 `skills.test.mjs`를 뺀 테스트 138개가 통과했다(새 테스트 2개).
- 새 테스트가 고친 곳을 잡는지 확인했다.
  - scratch 복사본에서 secrets 수정 15곳을 하나씩 예전 코드로 되돌리면 매번 테스트가 실패한다.
  - turbo CRLF, 중첩 `"$schema"`, `@optional=false`도 예전 코드에서 실패한다.
  - 처음에는 `diff.noprefix`로 시험했다. 이 설정에서는 머리 줄에 접두어가 없어 예전 코드도 맞는 경로를 냈다. 그래서 `i/` 접두어를 붙이는 `diff.mnemonicPrefix`로 바꾸고, 단언을 줄 앞(`❌ `)에 고정했다.
- 실제 BTS 3.44.1 프로젝트(scratch, `--skip-skills`)에서 다음을 확인했다.
  - 생성 직후 turbo는 2.11.4였다. `turbo.json`은 그대로였고 `check-types`는 5/5였다.
  - `turbo@2.11.5`로 올린 뒤 `turbo.json`을 CRLF로 바꾸고 설치했다. `"$schema"` 뒤에 CRLF 줄 하나가 들어갔고, LF만 쓴 줄은 0이었다. `check-types`는 5/5, `AGENTS.md` 블록은 0이었다.
  - 주석을 넣은 `turbo.json`은 turbo가 그대로 읽는다(`--dry=json` exit 0). 설치기는 `--diff`와 설치 모두 경고를 냈고, 파일은 바이트 그대로였다.
  - `pnpm dev-cycle secrets`는 깨끗할 때 exit 0이었다. BTS가 만든 `BETTER_AUTH_SECRET` 값을 문서에 넣어 스테이징하자 파일과 변수 이름만 보여 주고 exit 1로 끝났다.
  - 확인용 프로젝트는 지웠다.
- 고친 뒤 다시 독립 리뷰를 받았다. 결과는 APPROVE, low 7건이었다. 그 가운데 5건(`--text`, 백틱, `.env*` 전체, 하위 폴더 실행, 중첩 `"$schema"`)을 위 목록에 반영했다. 남긴 것은 두 가지다. 소문자 암구호는 알려진 한계로 적었다. 따옴표로 감싼 경로의 역슬래시는 보고 문구에만 남고 검사에는 영향이 없다.
- 설치기에 중첩 검사를 더한 뒤 BTS 3.44.1 프로젝트를 다시 만들고 turbo 2.11.5에서 설치했다. 키는 최상위 `"$schema"` 뒤에 들어갔고, `check-types`는 5/5, `AGENTS.md` 블록은 0이었다. 확인용 프로젝트는 지웠다.

**반영하지 않은 것.** `.claude/settings.json`의 서드파티 마켓플레이스(omc, ponytail)를 ref로 고정하는 것. CLI는 `claude plugin marketplace add owner/repo#ref`를 지원하지만, `settings.json`의 `extraKnownMarketplaces`에 쓸 ref 필드는 공식 문서에 없다. 실험하려면 사용자 전역 플러그인 등록 정보(`~/.claude/plugins`)를 바꿔야 해서 하지 않았다. 지금은 `bts-skills-update`의 "대상이 아닌 것"(플러그인 업데이트 전 `hooks/` 검토)으로 대신한다.

동작·트리거 eval은 다시 돌리지 않았다. `bts-dev-cycle`, `bts-deploy`, `bts-skills-update`의 본문만 바뀌었고 description은 그대로다.

## dev-cycle 오류 예산, 시나리오 QA와 발견 수정, 공통화 행 (2026-09-29 추가)
my-app의 T1 라운드(케이스 F)에서 겪은 일을 규칙으로 옮겼다(`4fb16dd`, my-app `1dd4cda`). 런타임 확인에서 수화 경고 1건을 봤는데, 자동화 브라우저가 `<body>`에 넣은 속성 탓으로 보고 "콘솔 오류 0(…은 제외)"로 적었다. 사용자는 같은 경고를 자기 브라우저의 개발 오버레이에서 봤다. 원인은 브라우저 확장이 수화 전에 넣는 속성이었고, `<body suppressHydrationWarning>`로 막았다(재현 스크립트로 수정 전 1건, 수정 뒤 0건). 같은 라운드에서 `[confirm]`을 요청할 때 개발 서버를 띄워 두지 않았다. QA는 보고만 하는 행이라 발견을 고치고 다시 확인하는 행이 없었고, 미룬 P3 지적은 닫힌 대조표에만 남았다.

바꾼 것: `bts-verify`의 오류 예산 0(콘솔, 개발 오버레이, `get_errors`, 서버 로그. 시나리오가 일부러 보낸 요청의 4xx만 따로 적는다), B의 코드 리뷰 행, F의 스펙 테스트 시나리오 절, 공통화·리팩토링·최적화 점검 행, 시나리오 QA와 발견 수정·재QA 행, `[confirm]` 때 개발 서버 유지, 닫기 전 미룬 지적의 백로그 이동, 리뷰가 있는 모든 곳의 `ponytail-review`.

확인: template-docs 테스트에 새 규칙의 회귀 검사를 더했다(두 템플릿 각각 156개 통과). my-app은 T1 QA를 새 규칙으로 다시 돌렸다(깨끗한 프로필과 사용자 프로필 양쪽, 시나리오 통과 12, 개선점 2, 실패 0). 템플릿으로 새로 만든 프로젝트에서 새 F 행 전체를 처음부터 돌린 라운드는 아직 없다(미검증 항목).

## 용어집 이름 변경 실제 설치 확인 (2026-09-30 추가)
`964e3e5`(`CONTEXT.md` → `GLOSSARY.md`)를 v0.6.0 릴리스 전에 확인했다. BTS 3.44.1로 새로 만든 neon 프로젝트에 `install.sh`를 실행했다(exit 0). 설치 결과에 `GLOSSARY.md`가 있고 `CONTEXT.md`는 없다. `node_modules`와 `.git`을 뺀 프로젝트 전체에서 `CONTEXT.md` 참조는 OMX `deep-interview`(`.codex/skills`)의 "있으면 읽는다" 예시 하나뿐이라 충돌하지 않는다. 원격에서 받은 `domain-modeling`은 `GLOSSARY.md`와 `GLOSSARY-FORMAT.md`를 쓴다. 설치기 다음 할 일 4번에도 `GLOSSARY.md`가 나온다. `skills:check`와 `agents:check`는 exit 0이다. 확인이 끝난 뒤 project scope 플러그인 4개를 지우고 확인용 프로젝트를 삭제했다.

## 스킬 연결 점검과 보강 (2026-09-30 추가)
bts 스킬과 공식 스킬(Vercel, Next.js, Neon, Supabase, Better Auth, shadcn 등)이 dev-cycle 라운드의 제자리에서 실제로 불리는지 쟀다. BTS 3.44.1로 만든 새 프로젝트에 v0.6.1 템플릿을 설치하고 eval 시드를 넣은 fixture를 썼다. 사용자가 새 세션에 칠 법한 요청 7개를 `claude -p`(Opus 5.5)로 실행했다. 이 기기의 전역 스킬과 플러그인은 그대로 두었다. before는 v0.6.1이고, after는 같은 fixture에 이번 변경 파일 13개만 덮어쓴 것이다. 설정마다 두 번씩 돌렸다. 채점 기준은 개선하기 전에 고정했다. 시나리오마다 그 단계에서 불려야 할 스킬 목록이고, 모두 55개 항목이다. 로그에서 Skill 도구 호출, 스킬 폴더 파일 읽기, CLI 사용, 에이전트 호출을 뽑아 대조했다. 서브에이전트 안의 호출도 셌다.

찾은 결함:
- **`bts-skills-update`가 Skill 도구로 로드되지 않았다.** 본문 예시 `` !`명령` ``을 Claude Code가 로드할 때 셸 명령으로 실행하고 `command not found`로 실패했다. 문구를 바꾸고 `skills.test.mjs`에 bts 스킬 본문의 느낌표+백틱 금지를 넣었다.
- **공식 `shadcn` 스킬은 모노레포 루트에서 로드되지 않는다.** 로드할 때 루트에서 `npx shadcn@latest info --json`을 실행하고 `monorepo_root`로 실패한다.
- **전역 스킬이 프로젝트에 고정한 공식 스킬을 가린다.** Skill 도구는 같은 이름이면 개인 스킬(`~/.claude/skills`)을 먼저 불러온다. 이 기기에서는 프로젝트 도메인 스킬 34개 가운데 12개가 가려졌다(`impeccable`, `next-dev-loop`, `supabase-postgres-best-practices`, `vercel-react-best-practices`, `web-design-guidelines`, `agent-browser` 등).

before에서 본 경향: dev-cycle 행 문구에 이름이 있는 스킬은 거의 항상 불렸다. 계층 스킬의 "공식 스킬 연결" 표에만 있는 스킬은 대부분 무시됐다. 예는 다음과 같다.
- B의 `shadcn`·`vercel-react-best-practices`
- D의 `test-driven-development`·`turborepo`
- 인증 설정의 `better-auth-best-practices`·`email-and-password-best-practices`
- 성능 분석의 Next·React 공식 스킬 4종

E에서는 `bts-verify`를 읽지 않아, bts-verify가 금지한 `git stash`로 lint 기준을 비교했다. db 리뷰어도 절차 1의 `supabase-postgres-best-practices`를 읽지 않았다.

바꾼 것:
- `docs/dev-workflow.md`: B·D·E·F·공통 행에 그 상황의 공식 스킬 이름을 넣었다.
  - B 구현: `shadcn`, `vercel-react-best-practices`
  - B audit: `web-design-guidelines`
  - D 구현: `test-driven-development`, `better-auth-best-practices`
  - E 스키마: `supabase-postgres-best-practices`
  - E Neon 행: `neon-postgres-branches`
  - F 계획: 바꿀 계층의 `bts-*`와 그 공식 스킬 연결 표
  - 공통 문서 행: `domain-modeling` 형식
- `bts-dev-cycle`:
  - 첫 증거를 적기 전에 `bts-verify`를 부른다.
  - 새 용어는 `domain-modeling` 형식으로 적는다.
  - 괄호 안 스킬의 범위를 외부 스킬까지 넓혔다.
  - `turbo.json`은 `turborepo` 스킬이 가리키는 번들 문서를 따른다.
  - 확인을 요청하기 전에 `verification-before-completion`을 부른다.
  - 리뷰 응답의 `skills_read`를 확인한다.
- `AGENTS.md`·`CLAUDE.md`: `bts-*`가 가리키는 외부 스킬은 그 상황에서 실제로 읽는다. 이 프로젝트가 고정한 `.agents/skills/<이름>/SKILL.md`를 읽고 행 증거에 적는다. Claude Code는 Skill 도구 대신 Read로 읽는다.
- `bts-reviewer`: 외부 스킬은 프로젝트 경로로 읽는다. React 코드가 바뀌면 `vercel-react-best-practices`를 읽는다. 응답 JSON에 `skills_read`를 넣는다.
- `bts-implementer`: 지정한 스킬의 공식 스킬 연결 표에서 해당 스킬을 읽고, 보고에 "읽은 스킬"을 적는다.
- `bts-web`: 느림·깜빡임·번들·캐시·프리패치는 분석 전에 `vercel-react-best-practices`와 해당 Next 스킬을 읽는다. 원인과 개선안에 규칙 이름을 붙인다.
- `bts-ui`·`impeccable-map.md`: shadcn·impeccable을 프로젝트 경로로 읽는다.
- `bts-verify`·`evidence.md`: 외부 스킬 증거 형식을 더했다.
- `bts-deploy`: 준비 확인 때 migration-flow의 배포 환경 절을 읽는다.
- 테스트: `template-docs.test.mjs`에 스킬 연결 회귀 검사를 더했다.

결과(기대 스킬 호출률, run별 통과 항목과 두 run 평균):

| 시나리오 | before | after |
|---|---|---|
| F 스펙·계획·계획 리뷰 | 11, 9 / 12 (83%) | 12, 12 / 12 (100%) |
| E 스키마·마이그레이션·DB 리뷰 | 4, 4 / 6 (67%) | 6, 6 / 6 (100%) |
| D 프로시저·격리 테스트·코드 리뷰 | 5, 5 / 8 (63%) | 8, 8 / 8 (100%) |
| B 화면 구현·런타임·디자인 리뷰 | 10, 10 / 12 (83%) | 12, 12 / 12 (100%) |
| 성능 원인 분석(Next 캐시·프리패치) | 1, 1 / 7 (14%) | 5, 5 / 7 (71%) |
| D 인증 설정·보안 리뷰 | 5, 5 / 7 (71%) | 6, 7 / 7 (93%) |
| 배포 준비 확인 | 3, 3 / 3 (100%) | 3, 3 / 3 (100%) |
| 합계 | 76 / 110 (69%) | 105 / 110 (95%) |

그 밖의 지표는 다음과 같다.
- **공식 스킬 항목만의 호출률**: 13/36(36%)에서 35/36(97%)으로 올랐다.
- **프로젝트에 설치된 외부 스킬을 프로젝트 판에서 읽은 비율**: 8/19(42%)에서 60/60(100%)으로 올랐다. gstack·ego-browser처럼 전역에만 있는 도구는 뺐다.
- **dev-cycle 행에 이름이 나오는 공식 도메인 스킬 수**: neon은 26개 중 5개에서 11개로, supabase는 23개 중 5개에서 10개로 늘었다.
- **14 run에서 한 번 이상 읽힌 공식 도메인 스킬 수**: 26개 중 7개에서 15개로 늘었다. after에서 읽히지 않은 11개는 요청에 그 상황이 없었다. 원격 Neon 브랜치(`neon` 4종), 실제 배포(Vercel 배포 3종), `vercel-composition-patterns`, 설계 질문(`grill-with-docs`, `grilling`)이 해당한다. `agent-browser`는 ego lite를 먼저 써서 읽히지 않았다.
- **after에서 남은 누락 5건**:
  - 성능 분석의 dev-cycle 라운드와 `systematic-debugging`, 각각 2회. 요청이 "개선안 정리까지"라 라운드를 열지 않았다. 공식 스킬 4종은 두 run 모두 읽었다.
  - 인증 run-1의 `better-auth-best-practices` 1회.
- **비용과 시간**: 일곱 시나리오를 한 번씩 도는 데 드는 값이 before $41.9·86분에서 after $51.3·103분으로 늘었다(+22%, +19%).

확인: 두 템플릿 `node --test` 157개 통과. 새로 넣은 두 검사는 v0.6.1 판에서 실패하고 지금 판에서 통과한다. after fixture에서 `bts-skills-update`와 `bts-deploy`가 Skill 도구로 프로젝트 판에서 정상 로드된다. 보고서(차트, 시나리오별 기대 항목과 증거, 비용)는 [docs/reports/2026-09-30-skill-wiring-check.html](../../docs/reports/2026-09-30-skill-wiring-check.html)에 두었다. 측정 스크립트와 로그는 세션 스크래치에 있었으므로 남기지 않았다.

한계:
- 설정마다 run은 두 번뿐이다.
- 채점 기준은 판단이 들어간 목록이다. 성능 분석 요청("개선안 정리까지")에 dev-cycle 라운드와 `systematic-debugging`을 기대한 두 항목은 해석이 갈린다.
- 배포 준비 시나리오는 before도 만점이라 차이를 가르지 못했다.
- 전역 스킬이 많은 이 기기 하나에서만 쟀다.
- before 인증 run-1과 B run-2는 같은 웹 포트를 함께 써서, 화면 검증 품질은 비교하지 않았다.
- 스킬을 읽었는지를 셌고, 읽은 내용을 제대로 적용했는지는 증거 칸과 보고로 일부만 봤다.

## 공식 스킬 최신판 점검과 agent-browser 0.38.1 (2026-09-30 추가)
템플릿은 공식 스킬 파일을 담지 않는다. 설치할 때마다 매니페스트의 원격 저장소 HEAD를 받으므로 새 프로젝트는 그때의 최신판을 받는다. 그래서 이번 점검은 "지금 받는 판이 bts 스킬과 맞는가"와 "템플릿이 고정한 버전이 최신인가"를 봤다.

- **이름**: 두 매니페스트의 원격 14곳(선택 묶음 포함) HEAD 트리에서 스킬을 찾았다. 빠진 스킬은 없다. vercel-labs/agent-skills(`react-best-practices` 등)와 better-auth/skills(`best-practices` 등)는 폴더 이름이 스킬 이름과 다르지만 frontmatter `name`은 매니페스트와 같다. lock의 `skillPath`로 비교하므로 `skills:update`에도 영향이 없다.
- **설치본과 HEAD 차이**: 2026-09-29에 설치한 프로젝트와 비교하면 `impeccable`만 7개 파일이 바뀌었다(참조 문서 6개, `scripts/VERSION`). 기존 프로젝트는 그 프로젝트 세션에서 `pnpm skills:update`(`bts-skills-update`)로 올린다.
- **bts 스킬이 가리키는 내용**: HEAD에 모두 있다. `vercel-react-best-practices`의 async-parallel·rerender-memo 규칙, `next-dev-loop`의 `/_next/mcp`, `domain-modeling`의 `GLOSSARY-FORMAT.md`, `supabase`의 보안 체크리스트, `turborepo`의 번들 문서 안내, impeccable 스크립트가 해당한다. `shadcn`은 로드할 때 여전히 `npx shadcn@latest info --json`을 실행하므로 Read 규칙을 유지한다. `neon`·`neon-functions` 본문의 `` process.env.X!` ``는 Claude Code가 명령으로 보지 않는다. 이름을 바꾼 사본을 Skill 도구로 불러 정상 로드를 확인했다(haiku).
- **버전**: skills CLI 1.7.0과 turbo 2.11.5는 최신이다. agent-browser는 0.31.1에서 0.38.1로 올렸다(설치 버전과 검사 하한 모두). agent-browser 스킬은 본문을 CLI가 주는 안내 스텁이라(`agent-browser skills get core`) CLI 판이 곧 스킬 판이다. HEAD 스텁은 0.31.1에 없는 `derive-client`, `protected-vercel-deployments`, `webmcp-gen`을 가리킨다. 0.32.0~0.38.1 릴리스 노트에는 명령 제거나 이름 변경이 없다. 대시보드 origin 검증과 domain allowlist가 강화됐고, 데몬이 1시간 유휴 뒤 종료하는 기본값이 생겼다.
- **0.38.1 확인**: scratch Next 16.3.7 앱에 로컬 설치로 `next-dev-loop` 절차를 돌렸다. `session id --scope worktree`, `--restore --enable react-devtools open`, `snapshot -i`, `click`, `react tree --json`, `react renders start/stop`, `vitals`, `screenshot`, `--restore close`, `/_next/mcp` `tools/list`(9개)가 모두 동작했다. `react tree`의 텍스트 출력이 `✓ Done`뿐인 것은 0.31.1도 같다. 전역 설치 경로(`npm install -g agent-browser@0.38.1`)는 이 기기에서 실행하지 않았다.
- **올리지 않은 것**: BTS 3.44.2는 Vercel web·server 배포 템플릿 수정을 담고 있어, 두 템플릿을 실제로 생성·설치해 다시 검증한 뒤 따로 올린다. Next는 BTS가 정한다(현재 최신 16.3.7).

두 템플릿 `node --test` 157개 통과.

## 설치할 때의 최신판 받기 (2026-09-30 추가)
새 프로젝트는 템플릿에 적힌 버전이 아니라 설치하는 시점의 최신판을 받는다.

- **바꾼 것**: BTS 생성 명령은 `@latest`로, 매니페스트의 `skillsCli`는 `skills@latest`로 바꿨다. agent-browser CLI는 `npm view`로 확인한 npm 최신판보다 낮으면 올린다. Homebrew 설치본은 `brew upgrade`로, 그 밖에는 `npm install -g agent-browser@latest`로 올린다. 레지스트리에 닿지 않으면 next-dev-loop 하한인 0.31.1로 검사한다. Claude 플러그인은 등록된 마켓플레이스를 `claude plugin marketplace update`로 새로 받은 뒤 설치한다. 전에는 받아 둔 목록이 오래됐으면 옛 판을 설치했다. Supabase CLI를 설치하지 않고 쓰는 대안은 `pnpm dlx supabase@latest`로 바꿨다.
- **그대로 둔 것**: 공식 스킬은 원래 템플릿에 복사하지 않고 원격 HEAD에서 받았다. `files/.agents/skills`에는 `bts-*` 8개만 있다. `--with-global` 도구(OMX, Vercel, Neon, gstack)는 설치 명령에 버전을 적지 않아 설치할 때 최신판을 받는다. 이미 설치된 전역 도구를 올리는 것은 agent-browser뿐이다. 스킬 본문을 CLI가 주기 때문이다.
- **BTS 3.44.2**: 두 템플릿 옵션으로 3.44.1과 3.44.2를 같은 이름으로 만들어 비교했다. `.env`의 무작위 값과 `bts.jsonc`의 `version`·`createdAt`을 빼면 같다. 3.44.2의 변경(Vercel web·server 배포 템플릿)은 `--web-deploy none --server-deploy none`에 닿지 않는다.
- **실제 생성과 설치**: scratchpad에서 두 템플릿을 `pnpm create better-t-stack@latest …`(3.44.2, Next `^16.3.4`)로 만들고 `install.sh`를 실행했다. 설치는 exit 0이다. 스킬 44개(supabase는 41개), 플러그인 4개, OMX가 설치됐다. 마켓플레이스 3곳은 설치 중에 갱신됐다(`known_marketplaces.json`의 `lastUpdated`). `pnpm check`, `skills:check`, `agents:check`, `check-types`, `biome check .`이 모두 exit 0이고, `skills:update --check`는 업데이트 0개다. 로컬 DB와 마이그레이션은 생성물이 3.44.1과 같아 다시 하지 않았다. 확인한 뒤 project scope 플러그인과 디렉터리를 지웠다.
- **이 기기의 agent-browser**: `~/.local/bin/agent-browser`가 fullstack-kit이 설치한 0.31.1을 가리켜 Homebrew의 0.38.1을 가리고 있었다. 이 링크와 같은 곳의 `impeccable` 링크(은퇴한 3.x npm CLI)를 지웠다. 이제 `agent-browser`는 `/opt/homebrew/bin`의 0.38.1(npm 최신판)이고 검사를 통과한다. 템플릿은 fullstack-kit을 쓰지 않는다. `references/`에 둔 참고 자료일 뿐이다.

두 템플릿 `node --test` 158개 통과.

## 공식 스킬 문서와 플러그인 업데이트 안내 (2026-09-30 추가)
- **루트 README**: "공식 스킬" 절을 더했다. 설치되는 공식 스킬 표(분야, 출처, 읽는 `bts-*`와 dev-cycle 행), 호출률 차트와 스킬별 표, 활용도(연결 위치, 한 번 이상 읽힌 스킬 수)를 담았다. 수치는 위 "스킬 연결 점검과 보강" 절과 그 보고서에서 가져왔다. 연결 위치는 두 템플릿 `files/`의 하네스 문서를 다시 훑어 그 절의 T0~T3 집계와 같은지 확인했다(neon T3 11·T2 14·T0 1, supabase T3 10·T2 12·T0 1).
- **Claude 플러그인 업데이트**: 기존 프로젝트의 플러그인은 `pnpm skills:update`가 올리지 않는다. 네 플러그인 모두 훅이 있어 올리는 즉시 새 코드가 돌기 때문이다. `bts-skills-update`와 템플릿 README에 `claude plugin marketplace update` → `hooks/` 변경 확인 → `claude plugin update <플러그인> --scope project` 순서를 적었다. scratchpad에서 project scope로 설치한 `ponytail@ponytail`에 이 명령을 실행해 보니, 최신판이면 `already at the latest version (4.10.0)`을 출력하고 exit 0으로 끝났다. `.claude/settings.json`은 바뀌지 않았다. 확인한 뒤 플러그인을 지웠다. project scope 자동 갱신(`extraKnownMarketplaces`의 `autoUpdate`)은 공식 문서에 사용자(`/plugin`)나 관리 설정에서 켜는 방법만 나와 쓰지 않았다.
- **템플릿 README**: `bts-skills-update`가 금지한 `npx skills update -p`와 `npx skills experimental_install` 행을 지우고 플러그인 업데이트 행으로 바꿨다. 빠진 스킬 복원은 `pnpm skills:setup`, 갱신은 `pnpm skills:update`가 맡는다.

## Codex 스킬 연결 검수와 선행 행 보강 (2026-09-30 추가)
Claude 결과를 Codex에 그대로 적용할 수 있는지 실제 CLI로 확인했다. 기준은 `be84bcc`이며, BTS 3.44.2로 만든 두 프로젝트에 현재 템플릿을 설치했다. Codex CLI 0.159.0, gpt-6-astra/medium(OMX 프로젝트 설정), OMX 0.21.6, Next 16.3.6, Node 24.19.0, pnpm 12.6.0을 사용했다. 기존 자연어 시나리오 7개, Supabase DB 1개, 전역 스킬 제외 전·후 2개, DB 재실행 1개로 총 11번 실행했다. 상세 프롬프트·기대 항목·설치본 해시·판정은 [Codex 검수 보고서](../../docs/reports/2026-09-30-codex-skill-wiring-check.html)에 있다.

### 발견과 수정
- 스킬 읽기와 규칙 적용은 달랐다. 전역 스킬을 끈 D 실행은 기존 `.trim()`이 요구를 충족한다며 Vitest 선행 행을 생략했다. 라운드를 연 직후 러너를 확인하고, 기존 구현 재사용·구현까지만 요청한 경우에도 선행 행을 처리하도록 `bts-dev-cycle` 2절을 보강했다. 재실행은 Vitest 설치·러너 기동 뒤 계약·구현을 기록했다. `--passWithNoTests`는 러너 기동일 뿐 기능 통과로 세지 않았다.
- 실제 D·인증 실행에서 `--upgrade`가 Vitest 행을 뒤로 밀었다. `dev-cycle.mjs`가 정해진 Vitest 선행 행만 맨 앞에 보존하도록 고쳤다. 나머지 수동 행·증거·메모·마지막 confirm은 유지한다. 기존 코드에서 실패하는 회귀 테스트를 먼저 확인했다. 실제 D 결과에 수정 스크립트를 다시 적용해 모든 증거 보존과 첫 행 복귀, confirm만 남는 audit을 확인했다.
- 현재 OMX 설치 목록에 없는 `ralph`·`ultrawork` 대신 Codex 네이티브 구현자와 tmux에서의 `team`으로 대안을 정리했다. Codex는 Skill 도구 대신 프로젝트 `SKILL.md`를 읽는다고 명시했다. Claude의 구현 대안은 유지했다.
- eval 5는 행 존재뿐 아니라 선행 처리와 실제 명령·오류 증거를 확인하도록 강화했다. 공유 변경은 두 템플릿에 똑같이 반영했다.

### 결과
| 시나리오 | 읽기/호출 | 적용과 한계 |
|---|---|---|
| F 스펙·계획 | 12/12 | 실제 계획 리뷰와 지적 반영, 애플리케이션 코드 무변경 |
| D API | 8/8 | 실제 구현자·code/security 리뷰어, RED 7 실패 → GREEN 7 통과. 메인 재실행도 7 통과. 대조표 이동 결함 수정 확인 |
| E DB 초기 | 6/6 | 평가 안내의 원격 연결 금지를 npm 설치 금지로 오해해 Bun으로 대체. 정상 완료로 인정하지 않음 |
| E DB 재실행 | 기대 항목 충족 | 안내 명확화·진입 보강 후 Vitest 선행 도입, 실제 DB 5개 테스트·DB/code 리뷰 통과. 메인 재실행도 5 통과 |
| B 화면 | 12/12 | 정상·빈·오류·재시도, desktop/mobile, 타입·린트·빌드·독립 리뷰 통과. 완료 수 3/2는 응답 대체로 확인 |
| 성능 분석 | 6/7 | Next·React·디버깅·런타임 스킬 사용. 분석만 요청해 dev-cycle은 열지 않음. 로그인된 대시보드 깜빡임·운영 성능은 미측정 |
| 인증 | 7/7 | 실제 인증 handler·Postgres 테스트 4개와 HTTP 429 확인. 메모리 저장소·직접 접속 IP 헤더 우회는 운영 전 해결할 한계로 남김 |
| 배포 준비 | 3/3 | bts-deploy와 DB migration-flow 참조를 읽고 미연결 판정. 원격 연결·배포·파일 변경 없음 |
| Supabase DB | 7/7 | Vitest 선행 도입, 실제 DB 테스트 6개·RLS·advisors·DB/code 리뷰 통과. 메인 재실행도 6 통과, advisors `No issues found` |

원시 메인·서브에이전트 세션의 읽기 명령·출력·역할과 산출물을 독립 검수했다. `skills_read` 자기보고만으로 통과시키지 않았다. 전역 스킬 제외는 임시 프로필의 `skills.config`와 플러그인 비활성화로 했고 `codex debug prompt-input`에서 프로젝트 스킬 루트 두 곳만 남는 것을 확인했다. 사용자 `config.toml`, `HOME`, `CODEX_HOME`은 바꾸지 않았다.

검증: 두 템플릿 전체 테스트 **각각 160 통과, 0 실패**(기존 158). 수정 MJS Biome·구문 검사, JSON 파싱, 공유 파일 동일성, `git diff --check` 통과. 독립 코드 리뷰는 수정 필요 지적 0건이다. 설치기와 매니페스트는 바꾸지 않았다.

한계: 기본 시나리오는 1회씩이고 전역 제외도 D 대표 사례만 확인했다. 평가에서는 복사본 훅의 절대 경로 간섭을 피하려고 hooks와 무관한 MCP 서버를 껐다. 훅 활성 상태·Codex App UI·원격 DB·실제 배포는 미검증이다. API 경로에 DB 회귀 테스트를 추가해 F(+H)로 상향된 경우 무관한 UI 행을 사유 있는 N/A로 기록했으며 분류 정책은 바꾸지 않았다. audit 자체는 실제 스킬 읽기나 실행 이력을 보증하지 않는다. 호출률을 전체 품질의 성공률로 해석하지 않는다.

평가 정리: 두 베이스 프로젝트의 project scope Claude 플러그인 각 4개를 제거했다(8회 모두 exit 0). 평가용 브라우저·개발 서버·Postgres 컨테이너를 종료했고 Supabase는 `supabase stop`으로 중지했다. 임시 Codex 프로필 2개도 제거했다. 사용자 Codex `config.toml`과 저장소의 미추적 `.claude/settings.json`은 보존했다.

## 디자인 스타일 카탈로그와 디자인 스킬 검토 (2026-09-30 추가)
사용자가 프로젝트마다 getdesign.kr의 DESIGN.md(shopping-pilot은 토스, my-app은 원티드)를 직접 복사해 쓰고 있었다. 템플릿에는 DESIGN.md가 고정돼 있지 않았다. 서비스에 맞는 스타일을 추천받아 고르는 흐름을 넣었다. 함께 디자인 스킬 병행, impeccable 명령 활용, 기술 스택 지침 여부를 검토했다.

### 바꾼 것
- `use-design-md`(CaesiumY/ko-design-md, MIT)를 기본 설치에 더했다. getdesign.kr이 제공하는 소비자 스킬이다. 공식 도메인 스킬은 neon 27개, supabase 24개가 됐다. 같은 저장소의 `design-md`(카탈로그 작성용)는 받지 않는다.
- `bts-ui`: 새 작업에서 `DESIGN.md`가 없고 화면이 BTS 기본 화면뿐이거나 리디자인이면 스타일을 고르게 한다.
  - 두 카탈로그(getdesign.kr, getdesign.md)에서 1~3위를 추리고 "카탈로그 없이 impeccable로 정하기"를 함께 내놓는다. 브리프 확인과 한 번에 묻는다.
  - 이미 만든 화면이 있으면 묻지 않는다. impeccable도 "Missing DESIGN.md alone does not make a project greenfield"라고 한다.
  - 절차는 `impeccable-map.md`의 "디자인 카탈로그에서 고르기"에 있다. 받기, 저장, 브랜드 요소 바꾸기, 토큰 적용을 다룬다.
  - 들여온 `DESIGN.md`는 마감의 `document`에서 merge만 한다.
  - 개발 행의 명령 목록에 `colorize`를 넣어 `impeccable-map.md`와 맞췄다.
- `docs/dev-workflow.md` B 첫 행과 마지막 행의 문구, 템플릿 `CLAUDE.md`의 AskUserQuestion 대상, 루트·템플릿 README의 스킬 수와 표도 고쳤다.

### 확인한 것
- **카탈로그 주소**:
  - getdesign.kr은 `https://www.getdesign.kr/llms.txt`에 22개 항목이 분야와 한 줄 설명으로 있다. `/services/<slug>/DESIGN.md`(toss, greeting, remember)는 200이다. `/services/`가 빠진 주소(`getdesign.kr/toss/DESIGN.md`)는 404다.
  - getdesign.md는 `sitemap.xml`에 `/<slug>/design-md` 미리보기 76개와 `/design-md/<slug>` 566개가 있다. 원문 `/design-md/<slug>/DESIGN.md`(200 `text/markdown`)가 있는 것은 미리보기가 있는 76개다(linear.app, notion). 처음에는 566개 쪽에서 이름을 뽑게 적었다. 아래 "Google DESIGN.md 명세 검토"에서 바로잡았다.
  - 약관: getdesign.kr은 로고와 서체의 권리가 각 브랜드에 있다고 밝힌다. getdesign.md 약관은 제3자 로고·워드마크를 제품에 복사하는 것과 소비자 혼동을 금지한다. 그래서 로고와 브랜드 이름은 가져오지 않는다. 전용 서체는 공개 서체로 바꾸고, 대표 색은 사용자에게 묻는다.
- **설치**: `npx -y skills@latest add CaesiumY/ko-design-md --skill use-design-md --agent claude-code codex -y`를 실행하면 `.agents/skills/use-design-md`만 설치된다(Claude Code는 링크).
- **impeccable 4.4.0**(업스트림 main과 SKILL.md가 같다): new-work 2절이 "DESIGN.md settles the visual world"라고 한다. 미리 놓인 파일을 정해진 세계로 본다는 뜻이다. my-app에서 `impeccable context`와 `doctor --json`은 카탈로그 원티드 DESIGN.md를 경고 없이 읽었다(`workspace-context-inherited` 안내 1건).
- **행동 확인**:
  - 조건: `claude -p`, Opus 5.5를 썼다. fixture는 my-app 첫 설치 커밋(BTS 기본 화면)에 지금의 `bts-ui`, `dev-workflow.md`, `use-design-md`를 넣고 `DESIGN.md`를 지운 것이다. 요청은 "홈 화면(/)을 서비스 소개 페이지로 새로 디자인해서 만들어줘."였다.

  | PRODUCT.md | 결과 |
  |---|---|
  | 스타일 지정 없음 | B 대조표를 열었다. getdesign.kr 목록과 getdesign.md sitemap을 curl로 본 뒤 1~3위(bezier, remember, vapor-ui)와 이유·미리보기 주소, 직접 정하기, 대표 색 질문, 브리프(`docs/briefs/home.md`)를 냈다. 코드 없이 멈췄다. $1.46 |
  | "원티드 스타일" 지정 | 지정된 원티드를 1위로 하나만 냈다. 대표 색 선택과 직접 정하기, 브리프 확인을 함께 물었다. 코드 없이 멈췄다. $1.68 |

  - 같은 fixture에 "보관함" 화면(DB·API가 필요하다)을 요청하면 F로 분류돼 범위부터 물었다. `bts-ui` 단계까지 가지 않았고, 이 판단은 맞다.
  - 한계: 조건마다 1회만 돌렸다. 비대화형이라 AskUserQuestion 대신 글로 물었다. 사용자가 고른 뒤의 받기·저장·토큰 적용·마감 merge는 돌리지 않았다.

### 채택하지 않은 것
- **taste-skill**(Leonxlnx/taste-skill): 넣지 않았다.
  - 적용 범위가 다르다. 스스로 "Not dashboards, not data tables, not multi-step product UI"라고 밝힌다.
  - 절차가 부딪힌다. taste-skill은 짧은 방향 선언 뒤 바로 코드를 쓰고, `bts-ui`는 shape 브리프 확인 전에는 코드를 쓰지 않는다.
  - 서체가 부딪힌다. taste-skill이 권하는 Outfit을 impeccable은 반사적 선택 목록에 올려 두었다.
  - 아이콘이 부딪힌다. taste-skill은 `lucide-react`를 "Discouraged"로 두는데, shadcn 기본값이 lucide다.
  - 예시 코드가 임의 Tailwind 값을 쓴다.
  - 기본 스킬이 v2 실험판이다.
  - 함께 설치하면 "디자인", "리디자인" 요청에 두 스킬이 모두 불린다.
- **기술 스택 지침**(Tailwind, Lucide, Zod, zustand): 템플릿에 따로 적지 않았다.
  - BTS가 생성할 때 Tailwind v4, `lucide-react`(`packages/ui/components.json`의 `iconLibrary: lucide`), zod, TanStack Query를 설치한다.
  - 공식 스킬이 이 설정을 따르게 한다. shadcn 스킬은 설정된 `iconLibrary`를 쓰고 lucide를 가정하지 말라고 한다. impeccable은 이모지 아이콘을 금지하고 아이콘 계열을 하나로 통일하게 한다. vercel-react-best-practices는 lucide import를 최적화한다.
  - 상태 라이브러리는 `bts-web`의 "근거 없이 추가하지 않는다"가 맡는다.
  - 이름을 템플릿에 적어 두면 생성기나 공식 스킬이 바뀔 때 어긋난다.
- **impeccable 선택 명령**(extract, bolder, quieter, distill, delight, overdrive, optimize, live, generate): 연결하지 않았다. impeccable의 routing 메뉴와 audit의 후속 명령이 안내한다. dev-cycle이 보장할 단계는 아니다.

두 템플릿 `node --test` 158개 통과(이 변경만 적용한 상태).

## Google DESIGN.md 명세 검토 (2026-09-30 추가)
사용자 요청으로 [google-labs-code/design.md](https://github.com/google-labs-code/design.md)를 검토했다. 명세는 `alpha`, CLI `@google/design.md`는 0.4.0(2026-07-27)이다. 이 저장소는 DESIGN.md 형식 명세와 lint·diff·export CLI를 낸다.

### 판단
- **형식과 작성 원칙은 이미 쓰고 있다.**
  - impeccable `document`는 이 명세를 따른다고 밝힌다(`reference/document.md` 3행). 8개 절 순서, 토큰 스키마, 컴포넌트 하위 토큰 8개를 그대로 쓴다.
  - 두 카탈로그의 파일도 같은 명세를 따른다(`use-design-md`의 `references/endpoints.md` 2b절).
  - 명세의 PHILOSOPHY는 형용사 대신 구체적인 레퍼런스를 쓰고 Do's and Don'ts를 의도해서 쓰라고 한다. impeccable new-work(구체적인 시각 체계 7개 나열)와 document(Named Rules)가 이미 다룬다. 그래서 작성 지침은 더하지 않았다.
- **검사기는 쓰지 않고 있었다.** impeccable은 명세대로 쓰기만 하고 lint를 돌리지 않는다. `doctor`의 `design-md-drift`는 커밋 수만 센다. 그래서 lint와 diff를 더했다.

### 바꾼 것
- `impeccable-map.md`에 "DESIGN.md 검사" 절을 더했다.
  - 카탈로그 파일을 저장한 뒤와 `document`로 쓴 뒤 `pnpm dlx @google/design.md lint DESIGN.md`를 실행한다. 설치하지 않고 실행하며 판을 고정하지 않는다. 실행이 실패하면 기록만 하고 막지 않는다.
  - 규칙별 처리:
    - `missing-primary`: 대표 색을 `colors.primary`로 더한다.
    - `token-like-ignored`, `unknown-key`: 명세가 정한 자리로 옮긴다.
    - `contrast-ratio`: globals.css로 옮길 때 AA에 맞춘다.
    - `rounded`의 `%` 오류와 `orphaned-tokens`: 그대로 둔다.
  - 카탈로그 파일을 merge할 때는 실행 전 판을 `/tmp`에 두고, diff로 `removed`가 비었는지 본다. HEAD와 비교하지 않는다. 첫 라운드에서 카탈로그를 들여오고 바로 merge하면 HEAD에 파일이 없기 때문이다.
- **결함 수정**:
  - 문제: 카탈로그 후보 1단계가 getdesign.md 이름을 sitemap의 `/design-md/<slug>`에서 뽑게 적혀 있었다. 566개 중 551개는 원문이 없는 분석 요청 페이지라 원문 주소가 404다. 앞 절의 행동 확인에서는 1~3위가 모두 getdesign.kr이라 이 경로를 거치지 않았다.
  - 수정: 원문이 있는 `/<slug>/design-md` 76개에서 뽑게 고쳤다. frontmatter가 없는 파일은 추천 후보에서 뒤로 둔다.
- `bts-ui`의 정본 갱신 행과 `docs/dev-workflow.md` B 첫 행·마지막 행의 증거에 lint 결과를 넣었다. 마지막 행에는 diff 확인도 넣었다.

### 확인한 것
- **카탈로그 전체 lint** (0.4.0):

  | 카탈로그 | 파일 | 결과 |
  |---|---|---|
  | getdesign.kr | 22 | 오류가 있는 파일 6개(모두 `rounded`의 `50%`·`42%`. bezier는 파일 안에 "공식 린터 에러, 값은 유지"라고 적어 두었다), `missing-primary` 13, `contrast-ratio` 1(teamsparta 2쌍), 경고 없음 5(toss, class101, krds, samsung-one-ui, socar) |
  | getdesign.md | 76 | 오류가 있는 파일 1(글꼴 굵기 값), `contrast-ratio` 42, 명세에 없는 컴포넌트 하위 토큰 경고 22, frontmatter 없음 8(kraken, spotify, tesla 등 산문만 있는 옛 형식) |

- **저장 흉내**: greeting에 저장 단계를 적용하니 오류 0, 경고 0이었다(이름 교체, 메타 삭제, 출처 줄, `primary` 추가).
- **merge 흉내**:
  - 토큰 하나를 지우고 하나를 바꾸면 diff가 `removed: [gray25]`, `modified: [primary]`를 낸다.
  - `regression`은 false였다. lint 건수만 비교하기 때문이다.
- **실행 방식**:
  - `pnpm dlx @google/design.md lint`는 pnpm 12.6에서 동작한다.
  - `diff`는 stdin(`-`)을 받지 않는다. 그래서 이전 판을 파일로 둔다.
- **참고**: my-app의 `DESIGN.md`(원티드)는 lint 경고 두 가지를 낸다. `missing-primary`, 그리고 본문 yaml 블록의 `job-card`가 명세 밖 키라 무시된다는 경고다. 그 프로젝트는 고치지 않았다.
- **행동 확인**:
  - 조건: `claude -p`, Opus 5.5를 썼다. fixture는 앞 절과 같고 바뀐 공유 파일과 `dev-workflow.md`만 넣었다.

  | 턴 | 요청 | 결과 |
  |---|---|---|
  | 1 | "첫 화면(작업실 홈)을 Linear 스타일로 새로 디자인해줘." | 대조표 B를 열었다. sitemap의 `/<slug>/design-md` 항목에서 이름을 뽑았다. linear.app, raycast 원문을 curl로 확인하고 1위 Linear, 2위 Raycast, 3위 그리팅을 냈다. 미리보기 주소, 직접 정하기, 대표 색 질문, 브리프 초안도 함께 냈다. 코드 없이 멈췄다. $1.39 |
  | 2 | "1위, 원본 색, 다크 전용, 브리프 확인. 받기·저장·검사까지만" | `use-design-md` 절차대로 `https://getdesign.md/design-md/linear.app/DESIGN.md`를 curl로 받았다(200). 이름과 전용 서체(Geist로)를 바꾸고 출처 줄을 넣어 저장했다. 원문과 비교해 토큰이 그대로인지 확인했다. lint는 exit 0, 오류 0이었다. `orphaned-tokens` 9건은 두었다. `contrast-ratio` 1건(호버 버튼 2.87:1)은 globals.css로 옮길 때 AA에 맞추도록 브리프와 대조표에 적었다. $2.45 |

  - 한계:
    - 턴마다 1회만 돌렸다.
    - 2턴은 요청에서 구현 전에 멈추게 했다. 토큰 적용과 마감의 `document` merge·diff는 돌리지 않았다.

### 채택하지 않은 것
- **`export --format css-tailwind`**:
  - 원티드 파일에서 `@theme`에 `--color-blue-800` 같은 원시 램프 212줄을 낸다.
  - 이 출력은 Tailwind 기본 팔레트 이름(`blue`, `gray`, `neutral`)을 덮어쓴다. shadcn 의미 변수(`--primary` 등)도 거치지 않는다.
  - 그래서 `bts-ui`의 "토큰으로만" 규칙, `use-design-md` apply-guide의 의미 변수 매핑과 맞지 않는다.
  - `dtcg`와 `json-tailwind`는 쓸 곳이 없다.
- **stitch-skills**(google-labs-code/stitch-skills): Stitch MCP 서버와 Stitch 프로젝트가 있어야 한다. `extract-design-md`는 impeccable `document` 스캔 모드와 겹치고, `shadcn-ui`는 공식 shadcn 스킬과 겹친다.
- **`design:lint` 스크립트**: `package.json`에 넣으려면 설치기를 고쳐야 한다. `pnpm dlx`로 충분하다.
- **CLI 판 고정**: 명세가 `alpha`라 형식과 규칙이 바뀔 수 있다. 템플릿 정책대로 최신판을 쓰고, 실행이 실패해도 막지 않게 했다.

두 템플릿 `node --test` 160개 통과.

## DESIGN.md 효과 측정 (2026-09-30 추가)
DESIGN.md가 결과를 얼마나 바꾸는지 A/B로 쟀다. 보고서는 [DESIGN.md 효과 측정](../../docs/reports/2026-09-30-design-md-effect.html), 샘플 이미지는 `docs/assets/design-samples/`에 있다.

### 방법
- 서비스 4개를 기획했다: 같이살림(공동 생활비 정산), 핏슬롯(필라테스 수업 예약), Uptrail(개발팀 서비스 모니터링), 하루공부(시험 학습 플래너). 서비스마다 `PRODUCT.md`와 브리프 2개(첫 화면 `/`, 두 번째 화면)를 미리 썼고, 브리프에는 시각 스타일을 적지 않았다.
- fixture: 이 템플릿을 설치한 BTS 프로젝트(my-app 사본, 기본 화면만 있음)를 서비스 × 조건으로 8개 복사했다. `apps/web/.env`에는 가짜 로컬 값만 넣었고 DB는 띄우지 않았다.
- A: 첫 턴에 "<제품>의 첫 화면을 새로 디자인해줘"로 추천을 받고 멈춤 → 같은 세션에서 고른 순위와 대표 색을 답하고 "받아 저장·검사한 다음 구현" → 커밋 → 새 세션에서 두 번째 화면.
- B: 새 세션에서 같은 브리프로 "<브랜드> 느낌으로, 대표 색은 <hex>"라고 요청하고 카탈로그와 `DESIGN.md`는 쓰지 않게 했다. 두 번째 화면도 새 세션에서 같은 말로 요청했다.
- 두 조건 모두 `claude -p --model claude-opus-5-5 --permission-mode bypassPermissions`다. 측정용으로 대조표 채우기, critique·audit·polish, 리뷰 에이전트, 커밋을 빼고 구현 → `check-types`·biome → 개발 서버 스크린샷까지만 시켰다.
- 측정: 사본마다 `next build`와 `next start`를 돌리고 Chrome 헤드리스(playwright-core, 설치된 Chrome)로 1440×900과 390×844를 찍었다. 데스크톱 화면의 계산된 스타일(글자·배경·테두리·SVG 색, 반경, 글자 크기, 서체)을 A가 저장한 `DESIGN.md` 토큰과 비교했다. B도 같은 파일과 비교했다. axe-core(WCAG 2.2 AA), impeccable `detect --no-config --no-design-system`, 화면 코드의 원시 색 값과 임의 Tailwind 값(`git diff -w`, `apps/web/src`)도 셌다.
- 블라인드 평가: Opus 5.5에 두 조건의 스크린샷을 X·Y로만 주고 목표 `DESIGN.md`와 브리프를 기준으로 충실도, 일관성, 완성도, 명료성, 종합을 1~10점으로 매기게 했다. 서비스마다 좌우를 바꿔 두 번씩 돌렸다.

### 추천과 선택
| 서비스 | 추천 1~3위 (에이전트) | 사용자 선택 | A의 lint |
|---|---|---|---|
| 같이살림 | 토스, 당근, 직접 정하기 | 1위 토스, 제품 색 #12805C | 오류 0, 경고 0 |
| 핏슬롯 | 토스, 쏘카, 당근, 직접 정하기 | 3위 당근, 제품 색 #0F766E | 오류 0, 경고 0 |
| Uptrail | 그리팅, 구름 Vapor, 채널톡 Bezier, 직접 정하기 | 2위 Vapor, 원본 색 | `missing-primary` → primary 추가 → 0, 0 |
| 하루공부 | 토스, 팀스파르타, 코드잇, 직접 정하기 | 2위 팀스파르타, 제품 색 #4F46E5 | 오류 0, 경고 32(미사용 토큰 30, 쓰지 않는 알약의 대비 2). 보조 글자색을 AA로 한 단계 진하게 옮김 |

샘플 스타일이 겹치지 않게 선택을 골랐다. 네 추천 모두 후보마다 이유와 미리 보기 주소를 붙였고, 같은 업종이면 제품 색을 권했다.

### 결과
| 지표 (8화면) | A: DESIGN.md 있음 | B: 브랜드 이름·대표 색만 |
|---|---|---|
| 목표 팔레트 일치율 (색 사용 중 ΔE2000 3 이내) | 99.3% | 71.1% |
| 글자 크기 토큰 일치율 (±0.5px) | 100% | 77.4% |
| 서체가 토큰과 같은 서비스 (토큰이 있는 3개) | 3/3 | 1/3 (Inter, Pretendard를 골랐다) |
| 모서리 반경 일치율 (알약·원형 제외) | 100% | 87.7% |
| 두 번째 화면이 첫 화면 색을 따른 비율 | 95.0% | 96.9% |
| 화면당 쓴 색 수 (ΔE 1.5 이내는 한 색) | 9.6 | 11.5 |
| 원시 색 값, 임의 색 클래스 | 0 | 0 |
| axe 위반 | 0 | 2 (색 대비) |
| impeccable detect | 6 (평평한 글자 위계 3, 카드 안 카드 3) | 2 (Inter 2) |
| 블라인드 종합 / 충실도 / 명료성 | 6승 / 8승 / 1승 | 2승 / 0승 / 4승 |
| 서비스당 비용·시간 | $10.34 · 24.1분 (추천 $0.95, 첫 화면 $6.34, 두 번째 $3.05) | $7.19 · 21.5분 (첫 화면 $4.45, 두 번째 $2.74) |

- DESIGN.md는 목표 시스템을 그대로 재현하게 한다. B가 이긴 서비스는 Uptrail 하나였고, 평가자는 B가 저하된 서비스를 맨 위로 올리고 직전 배포를 배너에 적어 과업이 더 빨리 읽힌다고 봤다. 충실도는 여기서도 A였다.
- 두 번째 화면의 일관성은 차이가 없었다. B도 첫 화면 코드를 읽고 따라갔다. DESIGN.md의 일관성 효과는 이 측정 범위(화면 2개, 같은 저장소)에서는 드러나지 않았다.
- A의 detect 지적은 원문(토스·당근의 촘촘한 글자 단계, 팀스파르타의 카드 안 목록)을 따른 결과다. 리뷰 단계에서 판단한다.
- 비용: 에이전트 실행 20회 $70.15, 블라인드 평가 8회 $6.74.

### 찾은 결함과 수정
1. **추천 글의 대표 색**: Uptrail 추천이 Vapor의 대표 색을 "거의 검정(#171717)"이라고 적었다. 원문의 브랜드 primary는 Blue 500(#2A72E5)이다. 이 설명으로 B에 색 힌트를 줬다가 알아차리고 Uptrail B를 처음부터 다시 돌렸다(버린 실행의 비용은 기록되지 않았다). `impeccable-map.md` 2단계에 "대표 색과 서체는 후보 원문에서 확인한 값으로 적는다. `colors.primary`가 없으면 본문 Colors 절이 브랜드 색이라고 한 값"을 더했다.
2. **새 글자 크기 토큰과 `cn()`**: 같이살림 A 실행이 찾았다. BTS의 `cn`(0.2.6, tailwind-merge 방식)은 모르는 `text-<이름>`을 글자색으로 본다. `cn("text-body-md text-muted-foreground")`가 `"text-muted-foreground"`를 돌려주는 것을 fixture에서 확인했다. `impeccable-map.md` 5단계에 글자 크기는 Tailwind 기본 이름(`--text-sm` 등)의 값을 바꾸라고 적었다.
3. **관찰, 토스 쏠림**: 한국어 서비스 4개 중 3개에서 토스가 1위였다. 이유는 저마다 타당했고 2·3위에 분야가 맞는 후보가 들어와 규칙은 바꾸지 않았다.
4. **측정 환경**: fixture에 설치 절차 8번(`pnpm check`)을 빠뜨려 작업 전부터 biome 오류가 85건 있었다. 실행마다 저장소 전체를 포맷하거나(64개 파일) 그대로 둬서 비용·시간에 잡음이 섞였다. 템플릿 결함은 아니다. 페이지 두 개는 외부 서체 CSS 때문에 `networkidle`에 닿지 않아 `load` 뒤 최대 15초 대기로 다시 찍었다.

### 한계
서비스 4개를 조건마다 한 번씩만 돌렸다. neon 템플릿, 한 기기, Opus 5.5만 썼다. B는 브랜드 이름과 대표 색 hex까지 받은 강한 기준선이다. 리뷰와 polish를 뺐고, 평가자도 Claude다. B를 목표에 맞추는 수정 라운드의 비용은 재지 않았다.

## 디자인 카탈로그 추가와 랜딩페이지 샘플 (2026-09-30 추가)
사용자가 앱 화면 샘플은 랜딩 샘플로 쓰기에 너무 단순하다며, [Refero Styles](https://styles.refero.design)처럼 화려한 랜딩 스타일을 추천 후보에 넣어 달라고 했다. 이어서 [awesome-design-md](https://github.com/VoltAgent/awesome-design-md)도 후보를 뽑는 곳으로 더해 달라고 했다. 두 곳을 조사해 `bts-ui`의 카탈로그를 셋으로 늘렸다. 그 흐름으로 랜딩 4개를 만들었고, 그 과정에서 찾은 결함을 고쳤다. 이미지는 `docs/assets/landing-samples/`에 있다.

### 조사
- **awesome-design-md**: getdesign.md의 원본 저장소다(VoltAgent, MIT, 홈페이지가 getdesign.md). `design-md/<slug>/DESIGN.md` 74개가 있고, `claude`의 원문은 getdesign.md 원문과 바이트까지 같다. README의 Collection 절은 분야 10개(AI, 개발자 도구, 백엔드, 생산성, 디자인 도구, 핀테크, 커머스, 미디어, 자동차, 1990년대 웹)로 73개 항목을 한 줄 설명과 함께 싣는다(`slack`은 파일만 있다). getdesign.md 사이트맵 미리보기 76개 중 `discord`, `mobbin`은 저장소에 원문이 없다. 그래서 후보 목록을 사이트맵 대신 이 README로 바꾸고, 원문은 GitHub raw에서 받게 했다. 미리 보기 주소는 getdesign.md 그대로다.
- **Refero Styles**:
  - 사이트맵 기준 스타일 1,342개가 있다(사이트 표기는 2,000개 이상). 분류 페이지 `/design-styles/<분류>`(분류 11개, 목록은 `sitemaps/collections.xml`)와 `/ai-agents/*`가 서버에서 스타일 이름, 짧은 설명, `/style/<id>` 링크를 그린다. 스타일 페이지도 설명, 색(Brand, Accent, Neutrals), 서체를 서버에서 그린다.
  - 사이트 검색(`?q=`)은 브라우저 안에서만 돌아 `curl`로는 결과가 없다.
  - DESIGN.md는 원문 주소가 없다. "Download DESIGN.md" 버튼을 누르면 브라우저가 페이지 데이터로 파일을 만든다(네트워크 요청은 조회수 기록 한 건뿐). `agent-browser download '[aria-label="Download DESIGN.md"]' <경로>`로 받아지는 것을 확인했다(agent-browser 0.38.1, 기본 창 1280×577).
  - 원문 형식은 "Style Reference"다. 표(Tokens — Colors, Type Scale, Spacing Scale, Border Radius, Shadows)와 산문(Components, Do's and Don'ts, Surfaces, Elevation, Imagery, Layout, Agent Prompt Guide, Similar Brands, Quick Start의 CSS·Tailwind 예시)으로 되어 있고 YAML frontmatter가 없다. 명세 lint는 `No YAML content found` 경고 하나만 낸다. 표 값으로 frontmatter를 붙이면 경고는 `section-order` 하나(Do's and Don'ts가 Elevation보다 앞)로 준다. 서체마다 `Substitute`(공개 대체 서체)가 적혀 있다.
  - robots.txt는 AI 수집 봇(ClaudeBot, anthropic-ai, GPTBot 등)을 사이트 전체에서 막고, 모든 봇에 `/api/`, `/extract/` 등을 막는다. 사이트는 "Cursor, Claude Code, Codex, v0, Lovable에서 쓰는 DESIGN.md"를 내세운다. 그래서 흐름은 사용자가 요청했을 때 분류 페이지와 후보 스타일 페이지만 읽는다. 파일은 사용자가 고른 한 개만 페이지 버튼으로 받는다. 검색과 `/api/`는 쓰지 않는다.
  - 공식 Refero MCP(`api.refero.design/mcp`, refero_skill 플러그인)는 유료 계정과 OAuth가 있어야 실시간 조회가 된다. 그래서 기본 흐름에 넣지 않았다. 스타일을 긁어 오는 비공식 MCP도 쓰지 않는다.

### 바꾼 것
- `impeccable-map.md`(공유 파일) "디자인 카탈로그에서 고르기":
  - 카탈로그 셋을 표로 정리했다(범위, 후보 목록, 원문, 미리 보기).
  - 1단계: 랜딩·가격·브랜드 페이지(Persuade)나 강한 연출을 원하면 Refero도 본다. 분류 페이지에서 후보를 뽑고 스타일 페이지에서 색과 서체를 확인한다.
  - 3단계: Refero는 `agent-browser --session refero-<id>`로 열어 `/tmp/refero-<id>.md`로 받는다. 받지 못하면 사용자에게 직접 받아 달라고 한다.
  - 4단계: Refero 원문에 frontmatter를 붙이는 방법을 적었다. 표 값을 그대로 옮기고, 표에 없는 값과 `%` 반경은 넣지 않는다. `Similar Brands`와 `Quick Start`는 지운다.
  - DESIGN.md 검사: lint의 `section-order`, `No YAML content found` 처리를 더했다.
- 설치기 `.gitignore`: impeccable README("Keeping .impeccable out of git")가 권하는 블록에서 live 모드 줄을 뺀 6줄을 더했다. 스크린샷(`*.png`, `review/`), 훅 캐시, 개인 설정, 질문 파일이다. live 모드 파일은 impeccable이 `.git/info/exclude`에 직접 쓴다. `critique/*.md`, `config.json`, `design.json`은 공유 산출물이라 무시하지 않는다. 테스트에 `git check-ignore`로 두 쪽을 확인하는 경우를 더했다. 샘플 fixture 사본에 `install.sh --diff`와 `--skip-skills`를 실행해 6줄이 더해지는 것, 두 번째 실행에서 중복이 생기지 않는 것, `.impeccable/critique/*.md`만 추적 대상으로 남는 것을 확인했다.
- 루트 README: "스타일 추천 1~3위"에 카탈로그 표를 넣었다. "랜딩페이지 샘플" 절, 흐름 그림, 원칙 표, 공식 스킬 표, 빠른 시작 예시 프롬프트도 고쳤다. 템플릿 README "설치한 뒤" 7번도 고쳤다.

### 랜딩페이지 샘플 실행
- fixture: 앞 절의 fixture를 복사했다. 이번 `impeccable-map.md`, 템플릿 `AGENTS.md`, 설치기의 biome override를 반영하고 `pnpm check`를 해 `biome check .`가 exit 0인 상태로 커밋했다.
- 서비스 4개를 기획했다. 울림(AI 내레이션 스튜디오), 제철상자(제철 농산물 정기배송), 발맞춤(동네 러닝 크루 매칭), 해담(가정용 태양광 배터리)이다. `PRODUCT.md`의 Brand Commitments에는 원하는 인상만 적었다(극적인 시네마틱, 계절 잡지, 스포츠 포스터, 갤러리 조명 아래 하드웨어). 랜딩 브리프(`docs/briefs/landing.md`, 섹션 10~12개)는 확정 상태로 두었다. 사진과 외부 이미지는 쓰지 않고 그림을 CSS·SVG로 만들게 했다.
- 첫 턴: "<제품>의 랜딩페이지(`/`)를 새로 디자인해줘. … 디자인 스타일을 먼저 골라야 하면 추천해줘." 같은 세션의 둘째 턴에서 순위와 대표 색을 답했다. 둘째 턴은 "받아 저장하고 검사한 다음 브리프대로 구현, critique 한 번, P0·P1을 polish"다. 대조표 채우기, audit, web-design-guidelines, 리뷰 에이전트, document, 커밋은 뺐다. 모두 `claude -p --model claude-opus-5-5 --permission-mode bypassPermissions`이고 4개를 동시에 돌렸다.
- 확인: `next build`와 `next start` 뒤 Chrome 헤드리스로 1440×900 첫 화면, 1440 전체, 390 전체를 찍고 axe-core를 돌렸다.

| 서비스 | 추천 1~3위 (에이전트) | 사용자 선택 | lint | critique | 비용·시간 |
|---|---|---|---|---|---|
| 울림 | Sequel, Slash, Ciridae (모두 Refero), 직접 정하기 | 1위, 원본 색 | 오류 1(`50%` 반경), 경고 2(미사용 토큰) | 22/32, P0 0, P1 2 → 고침 | $10.01 · 20.3분 |
| 제철상자 | Fable, Monocle, sweetgreen (모두 Refero), 직접 정하기 | 1위, 제품 색 #ba2b28 | 오류 0, 경고 4(미사용 토큰) | 22/28, P0 0, P1 2 → 1건 고침, 1건 일부(원문의 하늘색 띠는 `DESIGN.md`를 바꿔야 해서 사용자에게 물음) | $9.79 · 22.0분 |
| 발맞춤 | Flying Papers (Refero), The Verge (awesome-design-md), Hungry Tiger (Refero), 직접 정하기 | 1위, 원본 팔레트(형광 노랑을 주 버튼으로) | 오류 0, 경고 6(미사용 토큰) | 23/32, P0 0, P1 2 → 고침 | $12.53 · 28.8분 |
| 해담 | ORYZO AI (Refero), Apple (awesome-design-md), teenage engineering (Refero), 직접 정하기 | 2위, 제품 색 #a65e00 | 오류 0, 경고 8(미사용 토큰 7, 투명 배경 대비 1) | 27/36, P0 0, P1 2 → 고침 | $12.69 · 28.7분 |

- 4개 모두 세 카탈로그를 `curl`로 읽었다. 1위는 모두 Refero였고, 후보마다 카탈로그, 이유, 원문의 대표 색과 서체, 미리 보기 주소를 붙였다. 같은 업종 브랜드(ElevenLabs, Nike, Tesla, sweetgreen은 3위로 두고 원본 색을 쓰면 헷갈린다고 적음)는 스스로 빼거나 주의를 달았다. awesome-design-md의 The Verge에는 frontmatter가 없어 뒤로 둔다고 적었다(규칙대로).
- Refero 3개는 agent-browser로 받아 frontmatter, 제품 이름, 출처 줄을 붙이고 `Similar Brands`와 `Quick Start`를 지웠다. 절 순서도 명세대로 옮겼다. 한글이 없는 원문 서체는 에이전트가 한글 서체와 짝지었다(Noto Sans KR·Noto Serif KR, Hahmlet, Gasoek One·IBM Plex Sans KR, 시스템 한글 스택).
- 4개 모두 `check-types`와 `biome check .`가 exit 0이고, 빌드 뒤 axe 위반 0, 가로 넘침 0이다. 랜딩에서 BTS 기본 헤더를 빼려고 3개는 `login`·`dashboard`를 `(app)` 경로 그룹으로 옮겼고, 1개는 `/`에서 헤더를 숨겼다. 주소는 그대로다.
- 비용: 에이전트 실행 8회 $45.02. 시간은 추천 턴의 실행 시간과 구현 턴의 벽시계 시간을 더했다.

### 찾은 결함과 수정
1. **Refero 받기의 경로 충돌**: 처음 규칙은 모든 세션이 `/tmp/refero-DESIGN.md`로 받게 했다. 동시에 돌린 제철상자와 발맞춤이 다른 세션이 받은 Sequel 파일을 읽었고, 둘 다 알아채고 다시 받았다. 기본 브라우저 세션도 공유돼, 다른 에이전트가 연 페이지에서 버튼을 누를 수 있었다. 세션과 파일 이름에 스타일 id를 넣게 고치고(`--session refero-<id>`, `/tmp/refero-<id>.md`), 받은 뒤 세션을 닫게 했다. 고친 명령으로 다시 받아지는 것을 확인했다.
2. **`.impeccable/`이 추적되지 않은 파일로 남음**: 4개 모두 critique 기록과 리뷰 스크린샷이 `git status`에 떴고, 에이전트 3개가 이를 보고했다. 설치기 `.gitignore` 보강(위)으로 고쳤다.
3. **`%` 반경을 frontmatter로 옮김**: 울림이 원형 반경 `50%`를 `rounded`에 옮겨 lint 오류가 났다. 에이전트는 기존 규칙("`%` 값 오류는 카탈로그의 알려진 한계라 바꾸지 않는다")을 따라 그대로 두었다. 이 규칙은 getdesign.kr 원문을 두고 쓴 것이다. 옮겨 만든 frontmatter에는 `%` 값을 넣지 않게 4단계와 lint 처리를 고쳤다.
4. **측정 환경**: fixture 사본에 빌드용 가짜 `apps/web/.env`가 빠져(gitignore) 첫 빌드가 varlock 검사로 실패했다. 앞 절의 가짜 값 파일을 복사해 다시 빌드했다. 템플릿 결함은 아니다.

### 한계
서비스마다 한 번씩만 돌렸다. neon 템플릿, 한 기기, Opus 5.5만 썼다. critique 평가자도 Claude이고, audit, web-design-guidelines, 재확인은 뺐다. 사용자 선택은 샘플의 스타일이 겹치지 않고 awesome-design-md 경로도 거치게 골랐다(해담은 2위). Refero 받기는 페이지 버튼의 `aria-label`에 기댄다. Refero가 화면을 바꾸면 사용자에게 직접 받아 달라고 하는 경로로 넘어간다.

## 샘플 리디자인과 시각 자산 단계 (2026-09-30 추가)
사용자가 앱 화면·랜딩 샘플 8개의 완성도가 부족하다고 했다. 요청은 다음과 같았다.
- 서체를 받아 쓰고, 큰 글씨를 크고 강하게 만든다.
- 필요한 곳에 애니메이션과 아이콘, AI 이미지를 쓴다.
- 리디자인 절차로 다시 만들고, 샘플마다 정적 HTML로 배포한다(처음 요청은 Vercel, 이어서 GitHub Pages로 바꿨다).

이전 판을 진단해 흐름의 빈 곳을 채우고, 그 흐름으로 8개를 다시 만들었다. 결과는 루트 README "UI/UX 디자인"과 GitHub Pages(`gh-pages` 브랜치)에 있다.

### 진단
- **그림**: 이전 fixture의 `PRODUCT.md`는 "사진과 외부 이미지를 쓰지 않고 CSS·SVG로 그린다"였다. 그래서 농산물과 제품이 도형 클립아트가 됐다.
- **이미지 경로**: impeccable 4.4는 셸 환경에 `OPENAI_API_KEY`가 있으면 `impeccable context`가 `IMAGE_GEN_AVAILABLE`을 알린다. 그러면 새 화면을 comp-led로 만든다(방향 comp → comp 측정 → plate 이미지, `impeccable generate-image`, 기본 `gpt-image-2.5-flare`). 이전 실행은 키가 없어 code-led였고, `bts-ui`에도 이 경로가 적혀 있지 않았다.
- **서체**: 에이전트는 `next/font/google`의 Noto 계열을 가는 굵기로 골랐다. `bts-ui`에는 한글 서체 후보, 받는 방법, 첫 화면 제목의 크기 기준이 없었다.
- **리디자인 절차**: 리디자인에서 지금 화면을 찍고 진단하는 단계가 없었다.

### 바꾼 것
- `bts-ui` SKILL.md(공유 파일):
  - 리디자인이면 지금 화면을 찍어 critique하고, 브리프에 "버릴 것"과 "지킬 것"을 적는다.
  - 브리프에 서체·이미지·아이콘·모션 계획을 넣는다. 단계 표에 "시각 자산" 행을 더했다.
  - 이미지 과금과 키 규칙을 더했다. 키는 셸 환경에만 두고, 키가 없으면 도형이나 이모지로 흉내 내지 않는다.
- `impeccable-map.md`(공유 파일):
  - "리디자인" 절과 "시각 자산" 절을 더했다.
  - 서체: OFL 한글 서체 표(Pretendard, SUIT, Wanted Sans, Google Fonts 한글 서체)와 받는 방법(`next/font/google` 또는 woff2와 OFL을 `apps/web/src/fonts/`에 둔 `next/font/local`)을 적었다. Reserved Font Name 주의와 Persuade 첫 화면 제목 크기도 적었다.
  - 이미지: comp-led 경로, webp와 `next/image`, 인물·로고·글자 금지를 적었다.
  - 아이콘은 `iconLibrary` 한 벌, 모션은 CSS 우선이고 reduced-motion에서 끈다.
  - 단계 표에 시각 자산 행과 `bolder`를 더하고, 증거 예시를 고쳤다.
- 템플릿 README "설치한 뒤" 7번: 서체 자체 호스팅, `OPENAI_API_KEY`, 리디자인 critique를 더했다.
- 루트 README 샘플 절·흐름 그림·단계 표·추천 예, 루트 AGENTS.md(샘플 정적 HTML 규칙), `gh-pages` 브랜치(정적 HTML 8개와 안내).

### 샘플 실행
- fixture:
  - 랜딩 4개는 앞 절의 작업공간(구현본)을 복제해 "before" 커밋을 만들었다.
  - 앱 4개는 이전 코드가 남아 있지 않았다. 앞 절의 base를 복제하고 `PRODUCT.md`, 브리프, 이전 시안 스크린샷(`tasks/evidence/home/before-*.png`)을 두었다.
  - 모두 `bts-ui` 두 파일을 이번 판으로 바꿨다. 실행하는 셸에 `OPENAI_API_KEY`를 환경 변수로 넘겼고 파일에는 쓰지 않았다.
- 턴:
  - 첫 턴: "<제품> 랜딩페이지(`/`)를 리디자인해줘. 지금은 제목 서체가 가늘고 작아서 …" 형태의 불만과 요구(카탈로그 3곳 추천, 큰 글씨, 애니메이션, 아이콘, AI 이미지 허용, 서체 자체 호스팅)를 줬다.
  - 둘째 턴: 스타일과 대표 색을 답하고 comp 3장을 요청했다. 랜딩 3개는 첫 턴에서 스타일 후보마다 첫 화면 comp를 이미 그려서, 그 comp로 바로 구현을 요청했다.
  - 셋째 턴: comp를 고르고 구현, critique, polish, 재확인을 요청했다.
  - 넷째 턴: 사람이 본 결함을 짚어 수정을 요청했다(샘플당 최대 1회).
  - 대조표, 커밋, 리뷰 에이전트, document는 뺐다. 모두 `claude -p --model claude-opus-5-5 --permission-mode bypassPermissions`로 8개를 동시에 돌렸다.
- 확인: 작업공간 사본에서 `/`만 남기고 `output: "export"`로 빌드했다. 정적 서버에서 Chrome으로 1440×900 첫 화면, 1440과 390 전체 페이지를 찍고 axe를 돌렸다. 콘솔 오류, 실패한 요청, 깨진 이미지, 로드 실패한 서체도 셌다.

| 서비스 | 추천 1~3위 (에이전트) | 선택 | critique 이전 판 → 새 판 | 화면용 AI 이미지 | 비용 · 시간 |
|---|---|---|---|---|---|
| 울림 | MasterClass (Refero), Runway (awesome-design-md), Fable (Refero) | 1위, 원본 색, 스타일 comp | 22/32 → 23/32 | 11 | $25.87 · 47분 |
| 제철상자 | Oakâme, Telescope, Hungry Tiger (모두 Refero) | 1위, #ba2b28, 스타일 comp | 26/32 → 24/32(구현 직후, 재확인 채점 없음) | 16 | $20.17 · 49분 |
| 발맞춤 | Vodafone (awesome-design-md), Lightship, Hungry Tiger (Refero) | 1위, #f4ed36, comp B | 19/28 → 25/28 | 16 | $32.36 · 64분 |
| 해담 | ORYZO AI (Refero), bugatti (awesome-design-md), Lamborghini (Refero) | 1위, 원본 색, 스타일 comp | 23/32 → 28/32 | 7 | $28.18 · 56분 |
| 같이살림 | Monzo (Refero), 당근 SEED (getdesign.kr), Monarch (Refero) | 1위, #c9421d, comp A | 20/32 → 28/40 | 2 | $27.49 · 56분 |
| 핏슬롯 | sweetgreen, Oakâme, MasterClass (모두 Refero) | 1위, 원본 색, comp C | 25/40 → 31/40 | 9 | $21.86 · 49분 |
| Uptrail | Default (Refero), 리멤버 (getdesign.kr), ClickHouse (awesome-design-md) | 1위, 원본 색, comp B | 19/32 → 19/28 | 1 | $20.10 · 45분 |
| 하루공부 | Wise (awesome-design-md), Bento (Refero), Clay (awesome-design-md) | 1위, 원본 색, comp A | 17/28 → 20/28 | 1 | $18.83 · 50분 |

- 8개 모두 첫 턴에 지금 화면(앱은 이전 스크린샷)을 critique하고 브리프에 "버릴 것"과 "지킬 것", 시각 자산 계획을 적었다. 이전 판과 같은 계열(토스, Sequel 계열, Notion 등)은 스스로 뺐다. 3개는 `PRODUCT.md`의 "사진 금지" 줄을 사용자 허용대로 고쳤다.
- critique 점수는 사용성 휴리스틱이고, 해당 없는 항목을 빼서 분모가 다르다. 울림 에이전트도 "시각적 완성도의 향상은 잘 반영되지 않는다"고 적었다. 비교 이미지는 `docs/assets/redesign-before-after.webp`에 있다.
- 서체는 8개 모두 파일로 받아 `next/font/local`로 자체 호스팅했다(울림은 Black Han Sans와 Hahmlet을 `next/font/google`로 더함). Pretendard와 SUIT는 배포처 파일을 그대로 썼고, 쓰는 글자로 줄인 것은 RFN이 없는 Wanted Sans뿐이다.
- 정적 HTML 8개: axe 위반 0, 가로 넘침 0, 서체·이미지 로드 실패 0, 런타임 오류 0이다. 남은 404는 샘플에 없는 화면으로 가는 링크의 prefetch다. 사이트당 2.2~7.9MB, 합계 31MB다. GitHub Pages에 올린 뒤 실제 주소 8곳에서도 같은 결과였다.
- 비용: 에이전트 30턴 $194.86(샘플 평균 $24.36, 52분). OpenAI 이미지 비용은 따로 청구되고 여기서 세지 않았다.

### 찾은 결함과 수정
1. **Pretendard Std를 한국어 판으로 잘못 적음**: 처음 표에 `PretendardStd`를 "한국어 표준 2,350자 판"이라고 적고, 랜딩 4개에 그 판으로 바꾸라고 요청했다. 실제로는 한글이 0자인 라틴 전용 판이다(글리프 2,640개를 직접 셌다). 요청을 받은 에이전트 4개가 모두 파일을 열어 확인했다. 그리고 배포처의 한국어 subset 정적 판(`dist/web/static/woff2-subset`, 한글 음절 2,780자, 굵기당 약 270KB)으로 대신했다. 표를 이 판으로 고치고, Std는 한국어 화면에 쓰지 않는다고 적었다.
2. **서버에서 `searchParams`로 상태를 고르는 페이지는 정적 내보내기가 안 됨**: Uptrail(`?state=clear`)과 같이살림(`?demo=`)이다. 정적 HTML이 필요한 샘플에서만 걸리는 일이라 템플릿 규칙은 바꾸지 않았다. 수정 턴에서 클라이언트가 Suspense 안에서 읽게 고쳤고, 두 샘플 모두 `/`가 정적(○)으로 빌드된다.
3. **제철상자 구현 턴의 재확인 누락**: 에이전트가 백그라운드 캡처를 기다리며 턴을 끝내 `claude -p` 세션이 닫혔다. 그래서 polish 뒤 재확인 채점이 빠졌다. 사람이 없는 실행에서만 생기는 한계라 템플릿은 바꾸지 않았다.
4. **측정 환경**:
   - 앱 작업공간에 빌드용 가짜 `apps/web/.env`가 없어 내보내기 빌드가 varlock 검사에서 멈췄다. 랜딩 작업공간의 가짜 값 파일을 복사했다.
   - 내보내기 설정의 `images.unoptimized`는 `getImageProps`의 `srcSet`을 비운다. 그래서 `<picture>`의 데스크톱 사진이 빠졌다. 원본 주소를 돌려주는 커스텀 로더로 바꿨다.
   - 앞선 캡처에서 끄지 못한 정적 서버가 같은 포트로 옛 파일을 냈다.
   - GitHub Pages 프로젝트 사이트는 `/bts-starter-kit/` 아래에서 열려서 루트 경로(`/_next/`, `/images/`) 파일을 찾지 못한다. `basePath: "/bts-starter-kit/<이름>"`로 다시 내보냈다. `next/image`의 문자열 `src`에는 basePath가 붙지 않아서 이미지 로더가 붙인다. `.nojekyll`이 없으면 Jekyll이 `_next/`를 뺀다.

### 한계
- 서비스마다 한 번씩만 돌렸다. neon 템플릿, 한 기기, Opus 5.5, impeccable 4.4.0만 썼다.
- 스타일·comp 고르기와 수정 요청은 시연자가 했다. 수정 요청은 사람이 본 결함을 짚은 것이라 흐름만의 결과가 아니다.
- critique 평가자도 Claude이고, 사용성 점수라 시각 완성도를 재지 못한다.
- 앱 4개는 이전 코드가 없어 스크린샷을 반례로 삼아 새로 만들었다.

## 샘플을 사이트맵 전체 페이지로 넓히기 (2026-10-01 추가)
사용자가 샘플에서 "준비 중" 페이지와 404(같이살림의 정산, 프로필 등)를 짚었다. 요청은 다음과 같았다.
- 샘플마다 링크된 모든 페이지를 구현하고, 버튼은 모두 동작하게 한다.
- hover, 툴팁, 모달, 햄버거 메뉴, 사이드바, 애니메이션을 넣는다.
- 어색한 이름과 첫 화면 문구는 비슷한 서비스를 조사해 후보를 낸 뒤 사용자가 고른다.
- 앞으로의 UI 기획·설계에도 이 기준이 들어가게 한다.

### 바꾼 것
- `bts-ui` SKILL.md(공유 파일):
  - 새 작업은 사이트맵 `docs/briefs/site-map.md`를 먼저 쓰고 화면마다 브리프를 쓴다.
  - 링크와 버튼은 모두 실제 페이지나 동작(모달, 드로어, 상태 바꾸기, 복사, 완료 화면)으로 잇는다. 404, "준비 중", `#`만 걸린 링크, 반응 없는 버튼은 두지 않는다. 마감 전에 페이지마다 모든 링크와 버튼을 눌러 본다.
  - 제품 이름이나 첫 화면 헤드라인을 정해야 하면 후보를 함께 낸다.
- `impeccable-map.md`(공유 파일):
  - "사이트맵과 상호작용" 절: 사이트맵, 링크와 버튼, 상호작용 계획(hover·focus-visible, 툴팁, 모달, 드로어·시트, 햄버거 메뉴, 사이드바, 토스트), 확인 방법을 적었다.
  - "이름과 문구" 절: 비슷한 서비스 8~12개 조사, 후보 3~4개, 겹치는 이름 확인, 한 번에 묻기를 적었다.
  - 시각 자산의 이미지 항목에 인물 사진 규칙을 더했다. 자세를 구체적으로 적고, 서로 맞지 않는 자세는 피하고, 해부학 조건을 넣고, 후보를 2장 이상 만들어 사람 부분을 원본 크기로 확인한다.
- 템플릿 README "설치한 뒤" 7번, 루트 README UI/UX 흐름·단계 표·샘플 절, 루트 AGENTS.md 샘플 규칙(사이트맵 전체, 영구 작업 폴더)을 맞췄다.

### 이름과 문구
- 이름: 비슷한 서비스를 조사해 후보를 받았다. 발맞춤은 PACECREW, 해담은 AFTERGLOW가 됐다. 같이살림은 Evenly로 정했다가, 세션이 App Store에서 같은 분야 앱 "Evenly: Split & Settle Money"를 찾아 다시 후보 10개를 받고 고루가 됐다. 울림과 제철상자는 이름을 지켰다.
- 첫 화면 문구:
  - 처음 고른 문구 중 AFTERGLOW("해는 졌고, 전기는 남았습니다")와 울림("글에 목소리를 입히다")은 사용자가 다시 바꾸자고 했다.
  - AFTERGLOW는 기능형과 안심형 후보 두 벌을 거절한 뒤, "태양광 충전으로 전기요금 부담이 준다"는 내용을 넣어 달라고 했다. 그래서 "전기요금은 가볍게, 정전에도 든든하게"를 골랐다.
  - 울림은 TTS 서비스(타입캐스트, 클로바더빙, ElevenLabs, Murf) 카피를 조사한 후보에서 "한 줄의 대본도, 마음을 울리는 목소리로"를 골랐다. 사용자의 지적대로 사이트 전체의 "원고"를 "대본"으로 바꿨다(70곳, 조사 포함).
  - 후보는 korean-skills(humanizer → style-guide → grammar-checker)로 검토했다. 정전 대비를 "즉시 복구"로 쓰면 뜻이 틀린다(끊긴 전기가 돌아오는 것이 아니라 배터리로 넘어감)는 점도 이때 바로잡았다.

### 샘플 실행
- 턴: 사이트맵·브리프·페이지별 comp와 이름 반영(R4) → 모든 페이지 구현과 검증(R5). 모두 `claude -p --model claude-opus-5-5 --permission-mode bypassPermissions`이고 사용량 한도 때문에 4개씩 돌렸다.
- 정적 내보내기:
  - `output: "export"`, `trailingSlash: true`, `basePath: "/bts-starter-kit/<이름>"`로 빌드했다. 동적 경로는 `generateStaticParams`를 쓰고, 쿼리는 클라이언트에서 읽는다.
  - 로그인이 필요한 화면은 예시 사용자로 로그인한 상태로 열린다.
- 확인:
  - 정적 결과물을 같은 하위 경로로 띄우고, Playwright로 사이트 안 링크를 따라가며 상태 코드, 콘솔 오류, 실패한 요청, 없는 앵커를 셌다.
  - 페이지마다 보이는 버튼을 하나씩 눌러 화면이 바뀌는지 봤다. 주소, 대화상자·메뉴·툴팁, ARIA 상태, 스크롤, 포커스, 인쇄, 파일 선택, 숫자를 뺀 본문 글자를 비교한다.

| 서비스 | 페이지 | 누른 버튼 | 문제 | critique | 에이전트 비용 |
|---|---|---|---|---|---|
| 울림 | 11 | 270 | 0 | 29/40 | $177.35 |
| 제철상자 | 21 | 121 | 0 | 35/40 | $159.44 |
| PACECREW | 22 | 84(세션 확인 479) | 0 | 31/40, audit 17/20 | $181.36 |
| AFTERGLOW | 17 | 277 | 0 | 29/40 | $132.76 |
| 고루 | 7 | 64(세션 확인 294) | 0 | 30/40 | $82.88 |
| 핏슬롯 | 18 | 149 | 0 | 28/40 | $100.35 |
| Uptrail | 21 | 279 | 0 | 28/40 | $73.41 |
| 하루공부 | 14 | 181 | 0 | 33/40 | $67.71 |

- 비용은 샘플마다 첫 리디자인부터 이번 라운드와 아래 복구 세션까지 합친 값이다(모두 $975.26). OpenAI 이미지 비용은 따로다.
- 로그인한 상태로 돌았기 때문에 로그아웃해야 나오는 화면(고루 로그인, 핏슬롯 로그인·가입, Uptrail 로그인)은 순회에 들지 않았다. 표의 핏슬롯·Uptrail 페이지 수는 순회한 수다. 2026-10-01에 네 화면을 따로 열어 버튼 10개를 눌렀고 문제는 0이다. 정적 경로로 세면 핏슬롯 20, Uptrail 22, 모두 134페이지다.
- gh-pages 루트(`https://roadkwonai.github.io/bts-starter-kit/`)에 샘플 8개를 모아 보는 페이지를 두었다(2026-10-01). 같은 `bts-ui` 흐름(14islands 스타일, 방향 comp 고르기)으로 만들었고, 내보낸 결과에서 페이지 10개와 링크 285개가 200, 콘솔 오류 0이다.
- gh-pages에 올린 뒤 실제 주소에서도 8개 모두 200으로 열리고, 옛 주소(`balmatchum`, `haedam`, `living`)는 루트 `404.html`이 새 주소로 보낸다.
- 상호작용은 따로 셌다(130페이지):
  - 버튼을 눌러 모달이 열린 횟수는 샘플마다 11~114번이고, 드로어·시트는 3~63번이다.
  - 툴팁은 트리거가 보이는 페이지에서 마우스를 올리면 뜬다. 고루의 복사 버튼처럼 누른 뒤 "복사했어요"로만 뜨는 툴팁도 있다.
  - 모바일(390px)에서는 머리글 메뉴 버튼이 메뉴를 연다. 고루는 하단 탭 막대를 쓰고, 로그인·가입과 신청 단계 화면은 메뉴 대신 홈, 나가기, 로그인·가입 같은 링크만 둔다.
  - 페이지를 열고 스크롤하는 동안 애니메이션이 도는 페이지는 128개다. 나머지 둘(제철상자 주문, 하루공부 집중 모드)은 작업 화면이라 상태가 바뀔 때만 움직인다.

### 찾은 결함과 수정
1. **headless 세션이 백그라운드 결과를 기다리다 끝남**: `claude -p`는 답을 마치면 끝나서 백그라운드로 띄운 에이전트와 명령의 결과를 받지 못한다. 세션이 "…기다립니다"로 끝나 마지막 검증이 빠졌다. 이어 가는 프롬프트에 "에이전트와 긴 명령은 포그라운드로"를 넣어 해결했다. 사람이 없는 실행에서만 생기는 일이라 템플릿은 바꾸지 않았다.
2. **내보내기 basePath가 덮임**: 세션이 `next.config.ts`에 환경 변수 기반 basePath·output·images 설정을 따로 넣어, 맨 앞에 넣은 내보내기 설정을 덮었다. `export default` 바로 앞에서 `Object.assign(nextConfig, {...})`로 덮어쓰게 바꿨다.
3. **AI 인물 사진의 해부학 결함**: 사용자가 핏슬롯의 바렐(다리가 사다리까지 늘어남), 리포머(두 다리가 하나로 붙음), 체어(등 끈이 엉킴) 사진을 짚었다. 원인은 자세가 흐린 프롬프트("deep flowing stretch")와 서로 맞지 않는 자세("앉아서 하는 풋워크")였다.
   - 핏슬롯 사진 16장을 자세와 해부학 조건을 적은 프롬프트로 다시 만들었다. 강사 전신 사진은 얼굴 사진을 참고 이미지로 넣어 같은 인물로 만들었다.
   - 다른 샘플도 사람 사진을 원본 크기로 확인해 바꿨다. PACECREW 7장(짝이 다른 신발, 붙은 다리, 엉킨 하네스), 제철상자 4장(엉킨 손가락, 빠진 사진), 울림 4장(헤드폰·운동복의 상표 모양, 손가락 사이 펜), 고루 1장(손 세 개)이다.
   - `impeccable-map.md`에 인물 사진 규칙을 더했다.
4. **작업공간 손실과 복구**:
   - 머신 재부팅으로 `/private/tmp`의 scratchpad가 지워져, 샘플 작업공간 8개, 내보내기, 측정 스크립트가 모두 사라졌다. 저장소의 변경은 남아 있었다.
   - 세션 기록(`~/.claude/projects/`의 jsonl)을 시간순으로 다시 실행해 되살렸다:
     - Write(전체 내용), Edit(`originalFile`과 치환), 전체 Read 스냅숏을 적용했다.
     - Bash 명령은 세션별 작업 위치를 따라가며 zsh로 다시 실행했다. 빌드, 브라우저, 서버, 프로세스 종료, push는 셸 함수로 막았다.
     - Bash 결과의 `bashEditDiff`(셸이 바꾼 파일의 hunk)로 실행 결과를 맞췄다.
     - 예전 경로는 새 폴더(`../bts-samples/ws/<이름>`)로 가는 링크로 연결했다.
   - 재생기에서 고친 것:
     - 커밋 상태가 달라 `git rm`·`git mv`가 실패하면 파일만 옮기거나 지운다.
     - 새로 만든 파일의 hunk(0,0)를 기존 내용 위에 붙이지 않는다.
     - 실패로 끝난 셸 명령도 앞부분의 변경은 일어났으므로 다시 실행한다.
     - 샘플마다 `/tmp`를 따로 쓴다.
   - 남은 어긋남(빠진 서체·이미지, 겹친 경로, 맞지 않은 파일 수십 개)은 세션 기록을 새 경로의 프로젝트로 복사해 `--resume`으로 이은 세션이 고치고 검증을 끝냈다. 생성 이미지는 같은 프롬프트로 다시 만들어 그림이 예전과 다르다.
   - 루트 AGENTS.md에 샘플 작업공간은 영구 폴더에 둔다는 규칙을 더했다.

### 한계
- 서비스마다 한 번씩만 돌렸다. neon 템플릿, 한 기기, Opus 5.5, impeccable 4.4만 썼다.
- critique 평가자도 Claude다.
- 반응 없는 버튼 판정은 화면 신호를 비교하는 휴리스틱이다. 걸린 것은 사람이 다시 눌러 확인했다.
- 인물 사진 점검은 Claude가 본 것이라 놓친 결함이 있을 수 있다.
- 복구한 작업공간은 손실 직전과 똑같지 않다. 그 차이는 이어 간 세션이 빌드, 화면, 링크·버튼 검사로 확인한 범위에서만 맞췄다.

## 화면만 프로젝트, HTML 내보내기, 키 훅 (2026-10-02 추가)
튜토리얼 "컨셉으로 화면 만들기"가 전제하는 동작을 더했다(설계 `docs/superpowers/specs/2026-10-02-sample-tutorials-design.md` 3절). 비개발자가 작업 폴더에서 프롬프트 하나를 보내면 kit 받기부터 DB 없는 프로젝트 생성까지 가고, 새 폴더에서 이어 화면을 만든 뒤 HTML로 내보낸다.

### 바꾼 것
- 루트 `AGENTS.md`: "화면만 만들기"(neon 고정, 컨테이너 엔진·로컬 DB·첫 마이그레이션 건너뜀, 새 프로젝트 `AGENTS.md` 맨 위 표시 줄, 보고 내용)와 "작업 폴더에서 시작했을 때"(kit 받기·재사용, `docs/first-request.md`, 커밋 전 impeccable 훅, 이어 갈 한 줄).
- `scripts/export-html.mjs`(공유, `pnpm export:html [--base /경로]`): 임시 폴더 복사본에서 `/api`·`/dashboard`를 빼고 `next.config.ts`에 정적 내보내기 설정을 덧쓴 뒤 빌드해 `html/`(`.nojekyll` 포함)에 둔다. 서버 전용 값이 결과물에 들어가면 exit 2, 남은 BTS 서버 부품(`/dashboard` 링크, authClient)은 경고.
- `scripts/load-keys.mjs`(공유): 셸에 없는 키를 프로젝트 `.env` → 상위 폴더(작업 폴더) `.env`에서 읽는다. 값은 출력하지 않는다. 훅으로는 `OPENAI_API_KEY`만 `$CLAUDE_ENV_FILE`에 쓰고, `-- <명령>`이면 `OPENAI_API_KEY`·`GH_TOKEN`·`VERCEL_TOKEN`을 그 명령에만 넣어 실행한다. 배포 토큰은 배포 명령에만 쓴다.
- `install.mjs`(공유): `export:html` 스크립트, `.gitignore`의 `/html/`, `.claude/settings.json`의 SessionStart 훅(다른 키·훅 보존, 한 번만), `biome.json`의 `!html`.
- `bts-ui`(공유): "화면만 프로젝트" 절과 `references/screen-only.md`(화면 규칙, 내보내기, GitHub Pages·Vercel 배포·다시 배포·내리기, 실제 서비스로 바꾸기), 이미지 그리는 길의 순서(하네스 도구 → `OPENAI_API_KEY` → Codex CLI와 `gpt-image` → 배치도)와 키 규칙. `impeccable-map.md` 이미지 절, `bts-web` 한 줄.
- `skills.manifest.json`: `gpt-image`(GENEXIS-AI/gpt-image-skill). 공식 스킬 28개(supabase 25개).
- 테스트: `export-html.test.mjs`(8), `load-keys.test.mjs`(6), `install.test.mjs` 추가 항목. 두 템플릿 176개 통과.

### 실제 확인
환경: macOS 26.5.2, Node 24.19.0, pnpm 12.8.1, BTS 3.44.2, Next 16.3.8(Turbopack), varlock 1.18.0, biome 2.5.15, Claude Code 2.1.287, Codex CLI 0.160.0.
- 설치: scratchpad에 BTS 프로젝트를 만들고 설치기를 기본 실행했다. `gpt-image`가 하위 폴더 스킬로 `scripts/gpt_image.mjs`까지 설치되고 `.claude/skills` 링크가 생겼다. `gpt_image.mjs doctor --json`은 `ready: true`(ChatGPT 로그인)다. 실제 이미지는 그리지 않았다(사용량). 키 훅은 플러그인 선언과 함께 병합됐다. `skills:check`, `agents:check`, `check-types`, `biome check .` 모두 exit 0.
- 내보내기: 기본 프로젝트 13초, HTML 5개. 동적 경로(`generateStaticParams`), 쿼리 값(`useSearchParams` + Suspense), `public/` 이미지를 넣은 화면을 루트와 하위 경로(`--base /shotcheck`) 두 가지로 내보내 띄웠다. 그림(하위 경로가 붙은 주소), 쿼리 값, 동적 경로 이동이 모두 동작했다.
- 비밀값: `BETTER_AUTH_SECRET`를 화면에 넣은 페이지로 시험했다. varlock Next 플러그인이 빌드 결과에서 먼저 찾아 빌드를 멈추고, 스크립트는 변수 이름만 알리며 exit 2로 끝났다. 출력에 값은 없었고 임시 복사본은 지워졌다.
- 남은 서버 부품: BTS 기본 헤더(사용자 메뉴의 `/api/auth/get-session`, `/dashboard` 링크)가 남은 채 내보내면 페이지마다 404가 3번 났다. 개발 서버에서는 두 경로가 살아 있어 드러나지 않는다. 경고가 페이지 7개를 알렸고, 규칙대로 헤더와 로그인 화면을 예시 화면으로 바꾸니 경고, 404, 콘솔 오류가 모두 0이 됐다.
- 키 훅: 작업 폴더 `.env`에 가짜 `OPENAI_API_KEY`·`GH_TOKEN`을 두고 프로젝트에서 `claude -p`로 세션을 열었다. 세션 셸에는 `OPENAI_API_KEY`만 있고 `GH_TOKEN`은 없었으며, `node scripts/load-keys.mjs -- <명령>`으로 실행한 명령 안에서만 `GH_TOKEN`이 보였다.
- 실제 서비스로 바꾸기: Podman 머신을 켜고, 5432를 Homebrew Postgres가 쓰고 있어 README의 `DB_PORT`(5433) 방식으로 로컬 DB를 띄운 뒤 `db:generate`·`db:migrate`로 인증 테이블을 적용하고 표시 줄을 지워 커밋했다. 확인 뒤 컨테이너와 볼륨을 지우고 머신을 껐다.
- 작업 폴더에서 시작(E2E): 지금 작업본을 git 정보 없이 작업 폴더의 `bts-starter-kit`으로 두고, 튜토리얼 2단계 프롬프트를 `claude -p`로 그대로 보냈다(3.9분, $1.18). 기존 kit 폴더를 그대로 썼고, neon으로 DB 없이 만들고, 표시 줄과 `docs/first-request.md`를 커밋하고, impeccable 훅을 켜고, `--dangerously-skip-permissions`를 붙인 이어 갈 한 줄을 줬다. 화면은 이 세션에서 만들지 않았다.

### 찾은 결함과 수정
1. **복사본을 `node_modules/.cache` 아래에 두면 Turbopack panic**: "Expected process result to be a module". Turbopack이 `node_modules` 경로의 앱 소스를 처리하지 않는다. 시스템 임시 폴더로 옮겼다. 그 전에는 `cpSync`가 원본 안의 대상을 거부하는 문제도 있었다.
2. **varlock 유출 검사가 먼저 빌드를 멈춤**: 처음에는 일반 빌드 실패(exit 1)로 보고했다. 출력의 `Config item key`를 읽어 exit 2와 같은 안내로 바꿨다.
3. **`html/`이 biome 검사에 들어감**: 설치기가 만든 `biome.json`은 `.gitignore`를 따르지 않아, 내보낸 뒤 `pnpm exec biome check .`(dev-cycle lint 행)가 `html/`의 JS·HTML 때문에 exit 1이었다. 설치기가 `!html`을 더한다.
4. **orpc 클라이언트 경고는 헛경보**: BTS `providers.tsx`가 `utils/orpc`를 import만 해도 결과물에 들어간다. 부르지 않으면 404가 없으므로 경고에서 뺐다.
5. **코드 리뷰(독립 리뷰어, CRITICAL·HIGH 0, MEDIUM 4, LOW 9) 반영**:
   - 처음에는 훅이 배포 토큰까지 세션 환경에 넣었다. 그러면 모든 프로젝트의 `gh`(`release.mjs`의 GitHub Release 포함)와 `vercel`이 사용자의 로그인 대신 `.env` 토큰으로 조용히 돌고, 설치 스크립트들도 토큰을 물려받는다. 그래서 훅은 `OPENAI_API_KEY`만 넣고, 배포 토큰은 `-- <명령>`으로 배포 명령에만 넣게 바꿨다.
   - 내보내기의 설치·빌드 환경에서 세 키를 빼고, 작업 폴더 `.env`와 `.env.production*`도 유출 검사에 넣었다. HTML의 `&amp;`도 찾는다. 실패해도 임시 복사본(`.env` 사본 포함)을 지운다(`try/finally`).
   - `.env` 줄 끝 주석, `--base //`, 프로토콜 상대 이미지 주소, `--` 없이 준 인자, 실행 못 한 명령, 예상과 다른 `settings.json` 모양(설치가 중간에 멈추던 것), 스키마 같은 줄의 `@public`·`@sensitive=false`를 고쳤다.
   - `.vercelignore`에 `/html`, 문서의 `--diff` 항목에 `.claude/settings.json`, 토큰 값을 출력하는 명령(`printenv`, `echo`) 금지와 exit로 있는지 보는 법, `gpt-image`의 `bootstrap`(전역 설치)은 요청할 때만, gh-pages 커밋의 git 사용자 정보를 더했다.
6. **E2E에서 본 것**: `docs/first-request.md`에 프롬프트의 `[ ]` 표시가 그대로 들어갔고, impeccable 훅을 커밋 뒤에 켜서 `.impeccable/config.json`이 커밋되지 않고 남았다. 루트 `AGENTS.md`에 괄호를 떼고 적기, 훅을 커밋 전에 켜고 `config.json`을 커밋에 넣기를 적었다. 고친 뒤 새 작업 폴더에서 다시 돌린 E2E(3.2분, $0.90)는 괄호 없이 적고 `config.json`까지 커밋해 작업 트리가 깨끗했다. 만든 프로젝트에서 새로 연 세션에 화면 규칙을 물으면 `bts-ui` 절에서 `references/screen-only.md`를 찾아 화면 규칙, 내보내기, GitHub Pages 배포 절차를 맞게 요약했다($0.50).

### 한계
- 새 폴더에서 이어 가는 두 번째 세션(화면 설계부터 내보내기까지)은 끝까지 돌리지 않았다. 질문에 답해야 하는 흐름이라 사람이 없는 실행으로는 끝까지 갈 수 없다. 화면을 만드는 절차는 샘플 8개에서 확인한 `bts-ui` 흐름 그대로다.
- E2E의 kit은 git 정보 없는 복사본이라 `git pull --ff-only` 갈래는 보지 않았다. GitHub에서 처음 받는 갈래도 이 변경이 올라간 뒤에야 볼 수 있다.
- `gpt-image`로 실제 이미지를 그리지는 않았다. Windows(WSL2)는 확인하지 않았다.
- 배포 절차(`references/screen-only.md`의 GitHub Pages·Vercel 배포, 다시 배포, 내리기)는 실제 계정으로 돌리지 않았다. 2026-10-02 사전 확인(설계 3.6: 정적 파일 3개로 Pages API, `gh auth git-credential` push, `vercel deploy <폴더>`)만 있고, 특히 새 임시 폴더에서 `vercel deploy --yes`를 다시 할 때 같은 이름의 프로젝트에 붙는지는 보지 않았다.

## 디자인 카탈로그 세 곳 늘 찾기 (2026-10-05 추가)
튜토리얼 1번(넷플릭스) 리서치에서 사용자가 getdesign.kr·getdesign.md를 보지 않고 Refero 원문도 버튼으로 받지 않은 것을 지적했다. 원인은 튜토리얼 설계와 리서치 지시가 Refero만 적은 것이지만, `bts-ui` 절차에도 빈틈이 있었다.

### 바꾼 것
- `impeccable-map.md`(공유) "디자인 카탈로그에서 고르기" 1번: 화면 유형과 관계없이 세 카탈로그를 모두 보고 화면 유형은 순위에만 쓴다(전에는 Refero를 랜딩·강한 연출일 때만 봤다). 브랜드를 지목하면 세 곳 모두에서 찾고, Refero 분류에 없으면 웹 검색 `site:styles.refero.design <브랜드> design system`으로 찾는다. 같은 브랜드의 스타일이 여럿이면 모두 후보로 둔다. `getdesign.md/<slug>/design-md`가 없는 slug에도 200을 준다는 주의를 더했다.
- 같은 파일 3번: `agent-browser` 다운로드가 실패하면 `curl`로 받은 페이지의 DESIGN.md 탭 `<pre><code>`를 쓴다.
- `bts-ui/SKILL.md`(공유) 새 작업 2번: 브랜드를 지목하면 세 카탈로그에서 찾아 1위로 두고, 없으면 "카탈로그에 없음"이라고 알린다.
- 독립 리뷰(MEDIUM 3, LOW 6): 대체 경로의 `\n` 풀기, 같은 절의 중복 문장, 설계 문서의 "3절대로"(절대로로 읽힘), Refero 범위 문구, 긴 항목 나누기, SKILL.md·README와 맞추기를 반영했다. getdesign.kr 수(README 22개는 2026-09-30, 이번 23개)는 날짜가 달라 그대로 뒀다.
- 루트 README "스타일 추천 1~3위", 튜토리얼 설계 3·6절, 로드맵 서비스별 체크리스트.

### 실제 확인 (2026-10-04)
- getdesign.kr `llms.txt` 서비스 23개, awesome-design-md README에 넷플릭스 없음(원문 주소 404). `getdesign.md/netflix/design-md`와 없는 slug `zzznotreal123`이 둘 다 200, 약 31.7KB로 같은 빈 화면이었다.
- Refero 분류 페이지 11개에 실린 스타일은 12~24개씩이다(사이트맵 1,342개). Netflix(`32959012…`)는 `editorial-websites`에만 있고 `dark-mode-websites`에는 없다. Netflix Spain(`0e4d933c…`)은 어느 분류에도 없다. 웹 검색 `Netflix design system site:styles.refero.design` 결과에 두 스타일과 Disney+(`e586b296…`, 페이지 제목 "Watch new Originals")가 나왔다.
- 두 넷플릭스 스타일을 절차대로 `agent-browser … download '[aria-label="Download DESIGN.md"]'`로 받은 파일이 `curl`로 받은 페이지 `<pre><code>` 내용(HTML 엔티티와 `\n`만 풂)과 바이트까지 같았다.

### 한계
- 고친 절차로 새 프로젝트에서 에이전트가 브랜드 지목 요청을 처리하는지는 돌려 보지 않았다(문서 변경. 두 템플릿 테스트로 공유 파일이 같은지만 확인).
- 웹 검색 결과는 검색 엔진에 따라 다를 수 있다. Codex의 웹 검색으로는 확인하지 않았다.

## 이름 바꾸기: bts-* → prokit-*, bts-starter-kit → pro-kit (2026-10-06 추가)
저장소 이름을 `pro-kit`으로, 템플릿·스킬·에이전트 이름을 `prokit-*`로 바꿨다. 이 절 위의 기록은 그때 이름(`bts-*`, `bts-starter-kit`)을 그대로 두고, 디렉터리가 바뀐 링크만 고쳤다.
- 이름: 템플릿 디렉터리 `prokit-next-neon`·`prokit-next-supabase`, 프로젝트 스킬 8개(`prokit-api`, `prokit-db`, `prokit-deploy`, `prokit-dev-cycle`, `prokit-skills-update`, `prokit-ui`, `prokit-verify`, `prokit-web`)와 그 eval, 에이전트 `prokit-reviewer`·`prokit-implementer`, ADR `docs/adr/0001-prokit-next-<DB>-stack.md`, 마커 `<!-- prokit-template:start -->`. 저장소 주소, clone 명령, GitHub Pages 주소(`roadkwonai.github.io/pro-kit/`), `basePath` 예, 에셋 팩 받기 주소도 바꿨다.
- 그대로 둔 것: Better-T-Stack(`bts.jsonc`, `create better-t-stack`, "BTS가 만든 코드"), `release/` 노트, `docs/reports/`, `docs/superpowers/`, 작업공간 `../bts-samples`(같은 날 `../pro-kit-samples`로 이름을 바꿈).
- 설치기(`install.mjs`, 공유): 옛 마커 `<!-- bts-template:start -->`가 있는 `AGENTS.md`·`CLAUDE.md`에는 블록을 덧붙이지 않는다(새 마커와 같이 "유지(템플릿과 다름)"로 보고). 대상에 옛 이름(`.agents/skills/bts-*`, `.claude/agents/bts-*.md`, `docs/adr/0001-bts-*`)이 있으면 `--diff`와 설치 출력에 `경고: 옛 이름이 남아 있다`를 낸다. 옮기는 절차는 저장소 `AGENTS.md`의 "기존 프로젝트에 템플릿 갱신 반영" 5번이다.
- 테스트: `node --test` 두 템플릿 각각 177 통과, 0 실패. `scripts/release.test.mjs` 6 통과. `install.test.mjs`에 옛 마커 블록과 옛 이름 경고 테스트를 더했다.
- 포맷: `files/`의 `.mjs`·`.json`을 Biome 2.5.14(BTS `biome.json`)로 검사했다. 이름이 길어져 `scripts/dev-cycle.mjs`의 한 줄이 80자를 넘어 다시 포맷했다.
- 환경: Node 24.21.0, pnpm 12.9.1, macOS.

### 한계
- 실제 BTS 프로젝트에 새 설치기로 설치하는 확인(`pnpm create better-t-stack@latest` → `install.sh` → `skills:check`·`agents:check`·`check-types`·`biome check`)과, 옛 설치기로 설치한 프로젝트에 다시 설치하는 확인은 돌리지 못했다. 작업한 에이전트 세션이 작업 디렉터리 밖의 git 명령을 막았다(BTS `--git`, 설치기의 `git rev-parse`). 설치 경로는 가짜 BTS 프로젝트로 설치하는 `install.test.mjs`로만 확인했다.
- GitHub Pages의 샘플은 `basePath: "/bts-starter-kit/<이름>"`로 내보낸 그대로다. 저장소 이름을 바꾸면 `/pro-kit/<이름>/`에서 `_next/` 파일 경로가 맞지 않으므로 `basePath: "/pro-kit/<이름>"`로 다시 내보내야 한다. 이번 작업은 `gh-pages` 브랜치를 건드리지 않았다.
- 해소(2026-10-06): 프리셋을 `basePath: "/pro-kit/<이름>"`로 다시 내보내 `gh-pages`에 올렸다.
- 문서의 PNG·WebP 이미지 안에 보이는 옛 이름은 바꾸지 않았다.

## 사이트 하단 제작 표시 (2026-10-07 추가)
프로킷으로 만든 사이트는 하단에 "이 사이트도 프로킷으로 만들었어요", 프로킷 로고, 프로킷 사이트 주소, GitHub 주소를 둔다(사용자 결정 2026-10-07. 2026-10-08 선택으로 바꿈, 아래 절).

### 바꾼 것
- `files/apps/web/src/components/prokit-credit.tsx`: `<ProkitCredit />`. 프로킷 사이트 푸터의 한 줄과 같은 모양(심볼 20px, 프로킷 사이트로 가는 밑줄 링크 "이 사이트도 프로킷으로 만들었어요", GitHub 링크, text-sm). 심볼은 글자 색(`currentColor`)으로 칠하고 몸통을 mask로 비워 바탕색이 비친다. 주소는 `PROKIT_LINKS` 한 곳. 두 템플릿 공통 파일. 처음 판(주소를 글자로 보이는 두 링크, text-xs)은 같은 날 사용자와 정해 바꿨다.
- `prokit-ui` "규칙"에 제작 표시(필수. 2026-10-08 선택으로 바꿈, 아래 절), `references/screen-only.md`에 내보내기 exit 3.
- `scripts/export-html.mjs`: 쪽마다 문구와 GitHub 주소를 보고, 없는 쪽이 있으면 경로를 알리고 `html/`을 만들지 않고 exit 3(`missingCredit`). 처음에는 첫 페이지만 봤고, 같은 날 사용자 결정(모든 쪽 하단)으로 넓혔다. 문구는 태그를 걷어 내고 본다("프로킷"을 감싼 span, React의 `<!-- -->`). 프로킷 사이트 주소는 옮길 수 있어 보지 않는다.

### 실제 확인 (2026-10-07)
- 컴포넌트를 BTS 프로젝트(`../pro-kit-samples/ws/goru`)의 `apps/web/src/components/`에 잠시 넣고 `tsc --noEmit -p apps/web` exit 0, 그 프로젝트의 `biome.json`으로 `biome check` 통과. 확인 뒤 파일을 지웠다(두 판 모두).
- 심볼을 흰 바탕·검은 바탕·남색 바탕에 그려 원본 심볼(`brand/web/prokit-symbol.svg`)·반전(`prokit-symbol-inverse.svg`)과 같게 보이는 것을 Chrome 스크린샷으로 확인했다.
- `node --test 'templates/<템플릿>/tests/*.test.mjs'` 두 템플릿 모두 178개 통과(새 테스트: 제작 표시 검사, 공통 파일 목록).

- 심볼 mask id를 표시마다 `useId`로 따로 둔다. 고정 id면 한 쪽에 표시가 둘이고 하나가 가려질 때(모바일 메뉴) 보이는 쪽 심볼이 사각형으로 나온다(ullim 프리셋에서 발견, Chrome에서 재현). goru 프리셋에 넣어 `tsc` exit 0, 정적 내보내기와 site-check 문제 0, 내보낸 HTML의 mask id가 `prokit-credit-_S_3_`처럼 표시마다 붙는 것을 확인했다.

### 한계
- 새로 설치한 프로젝트에서 처음부터 화면을 만들고 `pnpm export:html`이 표시를 확인하는 전체 흐름은 아직 돌리지 않았다. 기존 프리셋에 넣는 라운드에서 확인한다.
- MIT라서 사용자가 표시를 지우는 것을 막을 수는 없다. 템플릿 기본값과 내보내기 검사로 빠뜨리지 않게만 한다.

## Antigravity·Grok Build (2026-10-08 추가)
사용자 요청으로 설치한 프로젝트를 Google Antigravity와 xAI Grok Build에서도 쓰게 했다.

### 바꾼 것
- `scripts/sync-agents.mjs`: `.claude/agents`(정본)에서 `.codex/agents/*.toml`과 함께 Antigravity용 `.agents/agents/*.md`를 만든다. 메인 에이전트로 고르지 않게 `mainAgent: false`를 적는다. 쓰기 도구가 없는 에이전트(리뷰어)에는 공식 문서 예시의 `view_file`, `grep_search`, `run_command`만 준다. 문서에 도구 전체 목록이 없고 틀린 이름은 서브에이전트를 멈추게 할 수 있어서다. 모델은 적지 않아 세션 모델을 쓴다. `--check`가 두 생성물을 모두 본다. Grok Build는 `.claude/agents`를 그대로 읽어 생성물이 없다.
- 스킬 문서: `prokit-dev-cycle`(구현 전 `ponytail` 읽기, `process-routing.md`의 도구별 이름), `prokit-ui`(impeccable 훅이 돌지 않음, 이미지 도구 `generate_image`·`image_gen`, 세션을 연 뒤 넣은 키), `impeccable-map.md`.
- `install.mjs`의 다음 할 일 안내, README "설치한 뒤" 3번.
- `.dev-cycle.json`: H 케이스 경로에 `.agents/agents/`를 더했다(생성물만 바뀌어도 하네스 변경으로 본다).
- 테스트: sync-agents(생성물, 고아 정리, tools 줄, description이 YAML에서 원문대로 읽히는지), install(생성물), template-docs(안내 문구), dev-cycle-classify(`.agents/agents` → H).

### 실제 확인 (2026-10-08)
- 새 BTS 프로젝트(scratchpad)에 neon 템플릿을 설치했다. `pnpm agents:check` "에이전트 정의 일치", `.agents/agents`에 두 에이전트가 생겼고, 생성물은 그 프로젝트의 Biome에서 고칠 것이 없었다.
- Antigravity CLI 1.3.1: `agy -p`로 물어 `AGENTS.md`, 서브에이전트 2개, prokit 스킬 8개를 읽는 것을 확인했다. 같은 프로젝트 복사본에서 `agy -p … --dangerously-skip-permissions`로 첫 화면 제목 바꾸기를 dev-cycle로 맡겼다(15분). 케이스 B 대조표를 열고 1~12행을 채웠다. 구현은 `prokit-implementer`, 리뷰는 `prokit-reviewer`(approve, 지적 0)를 서브에이전트로 불렀다. check-types·biome·build exit 0, 1440·390 스크린샷, critique 36/40, audit 20/20. `pnpm dev-cycle audit`은 요청대로 확인 직전에서 멈춰 #13 [confirm]만 비었다고 실패했다. 기본 포트가 차 있어 개발 서버를 3000으로 띄웠다가 껐다.
- Grok Build 1.0.46: 신뢰하지 않은 폴더에서는 `grok inspect`에 에이전트만 보이고 프로젝트 규칙과 스킬이 없다. `grok --trust`로 연 폴더에서는 `AGENTS.md`·`CLAUDE.md`, 에이전트 2개, prokit 스킬 8개, `.claude/settings.json` 훅을 읽었다. 같은 라운드를 맡기자 `prokit-dev-cycle`을 읽고 케이스 B 대조표를 연 뒤 `prokit-ui`와 `impeccable context`까지 진행했고, 82초 만에 무료 사용량 한도("free Grok Build usage limit")로 멈췄다. 유료 요금제(SuperGrok)는 쓰지 않았다. Grok Build는 Claude 호환이 기본으로 켜져 있어, 이 측정에는 사용자 전역 Claude 플러그인(OMC, superpowers 등)과 `~/.claude/CLAUDE.md`가 함께 실려 있었다.
- `node --test 'templates/<템플릿>/tests/*.test.mjs'` 두 템플릿 모두 통과.

### 한계
- Grok Build의 구현 위임, 리뷰 서브에이전트, audit은 확인하지 못했다.
- 두 도구로 pro-kit 저장소에서 새 프로젝트를 만드는 흐름(저장소 `AGENTS.md` "템플릿으로 새 프로젝트 만들기")은 돌리지 않았다.
- 이미지 도구(`generate_image`, `image_gen`)로 comp를 그리는 화면 라운드는 돌리지 않았다.
- 키 불러오기: Antigravity에는 세션 시작 훅이 없다. Grok Build가 `.claude/settings.json`의 세션 시작 훅을 실제로 실행하는지는 보지 않았다. 두 도구 모두 `load-keys -- <명령>` 대체 경로를 안내한다.
- impeccable 편집 훅: Antigravity에서는 돌지 않는다. Grok Build는 신뢰한 폴더에서 `.claude/settings.local.json` 훅을 읽지만 실제로 도는지는 확인하지 않았다. 두 도구 모두 화면을 고친 뒤 critique의 detector로 확인하게 안내한다.

## MIT 확정과 제작 표시 선택 (2026-10-08 추가)
- 라이선스: 같은 날 목적별 이용 조건(제작 표시, 수탁 제한)을 검토해 루트 LICENSE와 두 `files/licenses/PROKIT-LICENSE.txt`에 넣었다가, 사용자 최종 결정으로 표준 MIT로 확정했다. 유료 고객 개발·수정·재판매를 허용하고 저작권 표시·허가문을 보존한다.
- 루트 LICENSE와 두 `files/licenses/PROKIT-LICENSE.txt`는 표준 MIT 전문이 바이트 단위로 같다. 생성 앱의 적용 경로는 `PROKIT-SCOPE.md`가 구분한다(제공 원본의 고지와 사용자 독자 작성분·수정분의 권리). 각 템플릿의 실제 `copyFiles`를 임시 프로젝트에 실행해 두 안내 파일 복사, 정본 전문 일치, 기존 앱 LICENSE 보존을 확인했다.
- 외부 스킬은 manifest와 skills CLI로 원본 출처에서 설치하는 방식을 유지한다. 설치 목록·스킬 라우팅·설치 실행 코드는 바꾸지 않았다. 원본 조건과 라이선스를 확인하지 못한 두 출처는 루트 `THIRD_PARTY_NOTICES.md`에서 구분한다.
- 제작 표시 컴포넌트는 선택해서 쓸 수 있다. UI 규칙·문서의 필수 표시 안내와 `export-html.mjs`의 제작 표시 누락 exit 3 분기를 제거했다. 원문 저작권·허가문 보존은 선택 홍보 표시와 별개다.
- 기존 결과물 보존을 유지한다. 첫 페이지가 없으면 exit 1로 멈추고, 비밀값이 들어가면 기존 유출 검사로 exit 2로 막는다.
- 변경 전 신규 내보내기 테스트에서 표시 없는 결과의 성공 기대(0)와 첫 페이지 누락의 일반 실패 기대(1)가 각각 실제 exit 3으로 실패함을 확인한 뒤 구현했다.
- 변경 후 전체 테스트: Neon 181/181, Supabase 181/181, 루트 scripts 16/16 PASS, 모두 fail 0.
- 내보내기 통합 테스트는 실제 `main`의 복사·검사·출력 교체를 실행한다. 느린 pnpm 설치·Next 빌드는 통제된 결과 fixture로 대체하며, 이 변경을 확인하기 위한 실제 Next 앱 빌드는 실행하지 않았다.
- `node --check`로 두 내보내기 스크립트 문법을 확인하고 정본 사본·공통 파일 일치·상대 링크·diff를 점검한다. 이번에 외부 스킬 신규 설치·DB·공개 배포는 실행하지 않았다.
- 이 검증은 파일 전달·기존 동작·문서 정합성에 관한 것이다. 전체 원본의 상업 이용 적합성이나 법적 집행 가능성을 보장하는 검증은 아니다.

## 릴리스 버전 규칙: 기본 patch, --minor (2026-10-08 추가)
- 요청: 설치되는 `files/scripts/release.mjs`(공유)의 버전 규칙을 이 저장소 `scripts/release.mjs`와 같게 맞춘다. 첫 릴리스 `0.1.0`, 기본 patch(`feat:` 포함), `--minor`를 줄 때만 minor, `!`·`BREAKING CHANGE:`는 0.x 동안 minor이고 1.0 이상이면 major다. 1.0.0은 자동으로 만들지 않는다.
- 바꾼 것: `nextVersion`이 `{ minor }` 옵션을 받고, `main`이 `--minor`를 읽는다. `--publish`의 버전 일치 검사는 `--minor` 여부 둘 다 받아 준다. 같은 규칙으로 두 README, `prokit-deploy`·`prokit-dev-cycle` 스킬, handbook(`deploy/release.md`, `reference/commands.md`, `concepts/dev-cycle.md`)을 고쳤다.
- 확인: `tests/release.test.mjs`(공유)의 버전 기대값을 새 규칙으로 고치고(기본 patch, `--minor`, 0.x의 `!`는 minor, 1.x의 `!`는 major) 실패하는 것을 본 뒤 구현했다. CLI 시나리오는 `feat:` 커밋의 기본 노트가 patch(v0.1.1)이고 `--minor` 노트가 minor(v0.2.0)로 발행되는 것까지 거친다. `tests/template-docs.test.mjs`는 릴리스 절이 `--minor`를 안내하고 `feat:`를 minor로 적지 않는지 본다.
- 결과: Neon 181/181, Supabase 181/181, `scripts/handbook.test.mjs` 7/7, `scripts/release.test.mjs` 6/6, 모두 fail 0.
- 한계: 앞선 "릴리스와 버전 관리 (2026-09-28 추가)" 절의 `feat:`는 minor 설명은 당시 기록이라 고치지 않았다. 이미 설치한 프로젝트는 "템플릿 변경 반영" 절차로 `release.mjs`와 스킬 문서를 받는다.

## 공개 전 정비 (2026-10-08 추가)
- 설치기 사전 점검(`install.mjs`, 공유): Node 20 미만만 막던 것을 22.20 미만에서 멈추고 24 미만이면 권장 경고만 내도록 바꿨다. 22.20은 skills CLI 1.7.1의 `engines`(create-better-t-stack 3.44.3은 22.12, Next 16.4는 20.9)다. agent-browser 0.38.2는 `engines`에 24 이상을 적지만 Node 22.23.3에서 `npm i`(EBADENGINE 경고만)와 `--version`이 됐다. 같은 Node 22.23.3에서 두 템플릿 테스트(각 183)와 저장소 scripts 테스트가 모두 통과했다. `preflight`가 Node 판을 셋째 인자로 받아 `install.test.mjs`에서 20.19.0·22.19.0은 멈추고, 22.20.0은 경고, 24.0.0은 경고 없이 통과하는지 본다. 테스트를 먼저 고쳐 실패를 본 뒤 고쳤다.
- `tests/shared-files.test.mjs`: 공통 파일에 `files/licenses/PROKIT-LICENSE.txt`를 더하고, 저장소 루트 `LICENSE`와 바이트가 같은지 본다.
- `files/licenses/PROKIT-SCOPE.md`: 목적별 조건 시절의 "기존 MIT 사본의 조건" 문장을 지웠다.
- `files/scripts/skills-setup.mjs`(공유)의 주석과 `skills-setup.test.mjs` 테스트 이름에 남은 옛 판 번호를 날짜로 바꿨다.
- README: 공식 스킬, Codex superpowers, 프로젝트 스킬, 에이전트 수에 값 표시(`node scripts/doc-values.mjs`)를 달고, UI/UX 링크를 `handbook/design/ui-flow.md`로 옮겼다.
- 이 기록과 저장소 공개 파일의 실제 프로젝트 이름을 일반 이름(`my-app`, "실사용 프로젝트 A")으로 바꿨다.
- 결과: `node --test 'templates/<템플릿>/tests/*.test.mjs'` 두 템플릿 모두 183/183 통과.

## 미검증 항목
- **DESIGN.md merge 뒤 diff**: 흉내 낸 파일로만 확인했다. 실제 라운드 마감의 `document` merge에서 에이전트가 이전 판을 두고 diff를 돌리는지는 보지 않았다.
- **DESIGN.md와 리뷰 단계**: 효과 측정은 critique·audit·polish를 뺐다. 랜딩 샘플에서는 critique와 polish를 한 번씩 돌렸다. 제철상자의 critique는 원문 색(하늘색 띠)을 지적했고, 에이전트는 `DESIGN.md`를 바꾸는 일이라 사용자에게 물었다. audit, web-design-guidelines, 재확인까지 한 전체 리뷰 단계와, 원문이 impeccable detect 규칙과 부딪히는 경우(평평한 글자 위계, 카드 안 카드)의 판단은 보지 않았다.
- **Codex에서 Refero 받기**: agent-browser로 받는 경로는 Claude Code에서만 확인했다. Codex 샌드박스에서 브라우저를 띄울 수 있는지는 보지 않았다.
- **스킬 연결 보강의 Supabase 범위**: 위 Codex 검수에서 DB 사례를 추가 확인했다. 공통 7개 시나리오 전체를 Supabase fixture에서 다시 실행한 것은 아니다.
- **Windows**: WSL2에서 쓰게 하고 Windows 셸은 설치기가 막는다. 실제 WSL2는 확인하지 않았다(supabase 검증 기록의 미검증 항목). `bts-ui`의 `impeccable.cmd` 안내는 쓸 일이 없어져 지웠다.
- **Docker Desktop 엔진**: `db:start`는 Docker CLI + Podman 엔진으로 확인했다. Docker Desktop 자체에서는 돌리지 않았다.
- **Codex에서 ego-browser**: Codex 샌드박스에서는 ego-browser를 쓸 수 없다고 보고 agent-browser 대안으로 정했다. 실제로 시도하지는 않았다.
- **Codex 샌드박스의 네트워크 제한**: `--sandbox workspace-write`에서는 의존성 설치와 네트워크가 필요한 빌드가 막힌다. 템플릿 문제는 아니지만, Codex로 새 의존성을 들이는 라운드는 네트워크를 허용한 설정에서 돌려야 한다.
- **도메인 문서 운용 지침**: Supabase fixture의 동작 eval에서 `CONTEXT.md`와 `project.md` 표 갱신을 확인했다(supabase 검증 기록). neon fixture와, 화면이 있는 F 라운드에서는 보지 않았다.
- **새 F 행 전체 라운드**: 스펙 테스트 시나리오, 공통화·리팩토링 점검, 시나리오 QA와 발견 수정·재QA를 템플릿으로 새로 만든 프로젝트에서 처음부터 돌린 라운드는 없다. my-app은 이미 진행한 T1 라운드의 QA를 새 규칙으로 다시 돌렸다.
