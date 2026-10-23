# `.dev-cycle.json` 설정 읽기

> 한눈에: `.dev-cycle.json`은 프로젝트 루트에 있는 설정 파일이에요. 어떤 파일을 고치면 어떤 케이스(작업 크기)로 볼지, 어떤 검사 명령을 쓸지, 화면 점수 기준은 몇 점인지를 담아요. 설치기와 에이전트가 채우고, 사용자는 읽어 보기만 해요. 바꿀 때는 에이전트에게 H 라운드로 시켜요.

## 왜 알아두면 좋나요

`pnpm dev-cycle case`가 "이번 변경은 케이스 E예요"라고 말할 때, **그 판단은 이 파일의 경로 규칙에서 나와요.** 에이전트가 왜 리뷰를 더 하는지, 왜 이 명령으로 검사하는지, 왜 화면 점수가 16점이어야 하는지가 궁금하면 이 파일을 보면 돼요. 이 쪽은 읽는 법만 알려 줘요. 용어를 모르겠으면 [처음 보는 용어](../../tutorials/reference/glossary.md#만들기)를 먼저 보세요.

> [!WARNING]
> 이 파일은 직접 고치지 않아요. 잘못 고치면 큰 변경이 가벼운 변경으로 판정돼 검사가 줄어들 수 있어요. 바꾸고 싶으면 에이전트에게 "`.dev-cycle.json`의 ○○를 바꾸고 싶어. H 라운드로 해줘"라고 말하세요. `.dev-cycle.json`은 H 경로여서 바꾸는 라운드에 리뷰 행이 붙어요([케이스와 대조표](../concepts/cases.md)).

## 키 한눈에 보기

에이전트가 왜 그렇게 판정하고 검사하는지 궁금할 때 이 표에서 키를 찾아보세요. 아래는 neon 템플릿의 `.dev-cycle.json`과 설치기가 더하는 키예요. "채우는 쪽"은 처음 값을 누가 넣는지예요.

> [!TIP]
> 처음에는 `rules`, `ui`, `commands` 세 키만 읽어도 돼요. 케이스, 화면 점수 기준, 검사 명령이 여기서 나와요.

| 키 | 뜻 | 예시 | 채우는 쪽 |
|---|---|---|---|
| `brain` | 두뇌(요구 정리, 계획, 구현을 이끄는 스킬 묶음). 하나면 문자열, 여럿이면 배열이고 첫 값이 주 두뇌예요 | `"none"`, `["openspec", "superpowers"]` | 설치기(`--brain`), 나중에는 `pnpm skills:setup --brain` |
| `simplicity` | 과설계 방지 스킬 하나 | `"none"`, `"ponytail"` | 설치기(`--simplicity`), 나중에는 `pnpm skills:setup --simplicity` |
| `todoPath` | 진행 중인 대조표와 할 일 파일 | `"tasks/todo.md"` | 템플릿 |
| `archiveDir` | 닫은 라운드와 완료 기록을 보관하는 폴더 | `"tasks/archive"` | 템플릿 |
| `workflowDoc` | 케이스별 대조표 행의 정본 문서 | `"docs/dev-workflow.md"` | 템플릿 |
| `planPath` | 진행 계획의 Task 표. 파일에 안 적혀 있으면 기본값을 써요 | `"tasks/plan.md"` | 기본값 |
| `defaultBranch` | 케이스 판정의 기준이 되는 브랜치. 이 브랜치와 비교해서 바뀐 파일을 세요 | `"main"` | 설치기가 프로젝트의 기본 브랜치를 찾아 적어요. 기존 프로젝트는 `--default-branch`로 정해요 |
| `rules` | 파일 경로로 케이스를 정하는 규칙 목록 | 아래 설명 | 템플릿 |
| `authPaths` | 인증과 권한에 닿는 경로. 걸리면 보안 리뷰 행이 더 붙어요 | 아래 설명 | 템플릿 |
| `ui` | 화면 작업의 통과 점수 기준 | `{ "auditMin": 16, "a11yMin": 3 }` | 템플릿 |
| `commands` | 검사에 쓰는 명령 | 아래 설명 | 설치기가 찾아 적고, 에이전트가 더해요 |
| `resources` | 캐시와 임시 폴더를 감시하는 정책 | `{ "roots": [] }` | 템플릿, 필요하면 H 라운드 |
| `projectType` | 프로젝트 유형 | `"new"`, `"early"`, `"operating"`, `"migration"` | 설치기(`--project-type`). 기존 프로젝트를 들였을 때 적혀요 |
| `adopt` | 하네스만 설치한 프로젝트 표시 | `true` | 설치기(`--adopt`) |
| `legacy.path` | 전환 프로젝트에서 읽기 전용으로 참조하는 기존 코드 경로 | `"../old-php"` | 설치기(`--legacy`) |

> [!NOTE]
> 값이 처음부터 모두 채워지는 것은 아니에요. `--project-type`을 주지 않은 새 프로젝트에는 `projectType`, `adopt`, `legacy`가 없어요. `--project-type new`를 줬다면 `projectType`만 적혀요. `adopt`와 `legacy`는 기존 프로젝트를 들였을 때만 생겨요.

## 케이스를 정하는 `rules`

`rules`는 "이 경로의 파일이 바뀌면 이 케이스로 봐요"라는 규칙 목록이에요. 각 규칙은 `case`(케이스 글자), `match`(경로를 맞춰 보는 정규식), `why`(이유)로 이뤄져요. **바뀐 파일마다 위에서부터 보다가 처음 맞는 규칙 하나만 써요.**

```json
{ "case": "E", "match": "^packages/db/", "why": "DB 스키마·마이그레이션·연결" }
```

예를 들어 이런 변경을 했다고 해 봐요.

| 바뀐 파일 | 맞는 규칙 | 계층 |
|---|---|---|
| `packages/db/src/schema/todo.ts` | E (`^packages/db/`) | E |
| `packages/api/src/routers/todo.ts` | D (`^(packages/api/\|apps/web/src/app/api/)`) | D |
| `apps/web/src/components/todo-list.tsx` | B (`^(apps/web/src/(app\|components)/\|packages/ui/)`) | B |

- 한 계층(E, D, B 중 하나)만 바뀌면 그 글자가 케이스예요.
- 계층이 둘 이상 바뀌면 케이스 F예요. 위 예시는 세 계층을 모두 건드려서 F예요.
- 계층 파일은 없고 하네스 파일(H 규칙)만 바뀌면 H예요. 계층과 함께 바뀌면 케이스는 그 계층 그대로이고 H 행이 더 붙어요(`(+H)` 표시).
- 어느 규칙에도 맞지 않으면 A(경미한 변경)예요.

그래서 똑같이 한 줄을 고쳐도 `README`는 A, `packages/db/` 안의 파일은 E가 돼요. 계층의 케이스 설명은 [케이스와 대조표](../concepts/cases.md)에 있어요. 하네스(H) 규칙에는 다음 경로가 들어 있어요.

- 스킬과 에이전트 폴더
- `.dev-cycle.json` 자신
- 빌드·배포 설정(`next.config`, `vercel.json`, `.github/workflows/`, `turbo.json`)
- 작업공간 설정(루트 `package.json`, `biome.json`, `tsconfig.json`)

`--adopt` 프로젝트는 설치기가 이 규칙을 그 프로젝트에 맞게 바꾸고, 규칙 밖의 코드는 계층을 알 수 없어서 무거운 F로 봐요.

> [!WARNING]
> 케이스를 낮추려고 `rules`를 고치는 것은 허용하지 않아요. 리뷰어가 지적해요.

케이스를 높이고 싶으면 `pnpm dev-cycle table <케이스> --upgrade`를 써요.

## `authPaths`: 인증에 닿는 경로

`authPaths`도 정규식 하나예요. 바뀐 파일이 이 경로에 맞으면 케이스는 그대로 두고 대조표에 보안 리뷰 행이 하나 더 붙어요(`case`가 `(+auth: security 리뷰 행 추가)`로 표시돼요). 템플릿 기본값은 `packages/auth/`, `apps/web/src/app/api/auth/`, 로그인 클라이언트, 미들웨어, `.env.schema` 같은 경로예요.

## `ui`: 화면 점수 기준

화면 작업(케이스 B, B를 포함하는 F)의 통과선이에요. audit 총점은 20점 만점에 <!-- v:devCycle.ui.auditMin -->16<!-- /v -->점(`auditMin`), 접근성 점수는 4점 만점에 <!-- v:devCycle.ui.a11yMin -->3<!-- /v -->점(`a11yMin`) 이상이어야 해요. 못 미치면 에이전트가 완료로 보고하지 않고 더 다듬을지 물어요([증거와 audit, 사용자 확인](../concepts/audit-and-confirm.md)). **기준을 낮추려고 이 값을 고치지 않아요.**

## `commands`: 검사 명령

에이전트가 검사 행을 채울 때 쓰는 명령 목록이에요. 설치기가 프로젝트의 `package.json`을 보고 찾을 수 있는 것을 적어요.

| 키 | 하는 일 | 예 |
|---|---|---|
| `typecheck` | 타입 검사 | `pnpm check-types` |
| `lint` | 파일을 고치지 않는 린트 | `pnpm exec biome check .` |
| `build` | 빌드 | `pnpm build` |
| `test` | 테스트. 테스트 러너가 없으면 비어 있고, 처음 D·E 라운드에서 vitest를 도입하며 등록해요 | `pnpm test` |
| `dbGenerate` | 마이그레이션 만들기 | `pnpm --filter @my-app/db db:generate` |
| `dbMigrate` | 마이그레이션 적용 | `pnpm --filter @my-app/db db:migrate` |

**없는 키는 그 프로젝트에서 실행할 수 없는 검사예요.** 에이전트는 없는 검사를 한 것처럼 적지 않아요([명령 모음](commands.md)).

## `resources`: 자원 감시

`resources.roots`에 경로를 적으면 캐시와 임시 폴더의 크기를 감시해요. 적은 경로는 감시만 할 뿐, 자동으로 지워도 된다는 뜻은 아니에요. 항목마다 `path`, `kind`, `lifetime`을 적고, 비어 있으면 기본 정책을 써요. 한도와 정리 조건은 [위임과 자원 관리](../concepts/delegation-and-resources.md)에 있어요.

## 자세히

### 설치기가 파일을 어떻게 다루나요

- `.dev-cycle.json`은 설치기가 첫 복사 뒤 프로젝트 값으로 채우는 파일이라서 "템플릿과 다름"으로 보이지 않고 `--diff`에도 나오지 않아요. 템플릿의 새 판을 반영할 때는 템플릿의 `files/.dev-cycle.json`과 직접 비교해요([기존 프로젝트에 갱신 반영](../templates/update-existing.md)).
- 이미 `.dev-cycle.json`이 있는 프로젝트에 다시 설치해도 이 파일은 새로 복사하지 않고, 경로 규칙과 `commands`는 그대로 둬요. 다시 실행할 때 새로 기록하는 것은 `projectType`, `adopt`, `legacy.path`, `defaultBranch`(`--default-branch`를 줬을 때), 그리고 고른 `brain`, `simplicity`뿐이에요.
- `defaultBranch`는 설치기가 `origin/HEAD`, `main`, `master`, 지금 브랜치 순으로 찾아요. 도입 브랜치(`prokit/setup`)에서 계속 작업할 때는 `--default-branch`로 기준 브랜치를 정하고, 나중에 기본 브랜치에 병합하면 H 라운드에서 되돌려요([기존 프로젝트에 도입하기](../start/adopt.md)).

### 이 파일을 바꾸는 흔한 이유

| 하고 싶은 일 | 어떻게 요청하나요 |
|---|---|
| 새 폴더가 계층으로 판정되게 하기 | "`services/` 폴더가 바뀌면 D로 판정되게 해줘. H 라운드로" |
| 테스트·빌드 명령 바꾸기 | "`commands.test`를 ○○ 명령으로 바꿔줘" |
| 두뇌나 과설계 방지 스킬 바꾸기 | "두뇌 바꿔줘". 에이전트가 `pnpm skills:setup --brain …`을 써서 이 파일에 기록해요([두뇌와 선택 스킬](../skills/brains.md)) |

## 관련 문서

- [케이스 A\~F·H와 대조표](../concepts/cases.md)
- [고쳐도 되는 파일](what-to-edit.md)
- [설치된 프로젝트의 폴더 구조](project-structure.md)
