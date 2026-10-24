# 명령 모음

> 한눈에: 프로킷이 설치된 프로젝트와 pro-kit 저장소에서 쓰는 명령을 모았어요. 평소에는 에이전트가 알아서 실행하니 외우지 않아도 돼요. 직접 확인하고 싶을 때 찾아보세요.

## 내가 직접 칠 일은 거의 없어요

> [!IMPORTANT]
> 평소에는 말로 요청하면 에이전트가 명령을 실행해요. 사용자가 직접 쳐 볼 만한 것은 아래 표 정도예요.

**먼저 `pnpm dev-cycle status`와 `pnpm skills:check`만 알아 두면 돼요.** 모든 명령은 프로젝트 폴더의 터미널에서 실행해요.

| 명령 | 언제 | 무엇을 알 수 있나요 |
|---|---|---|
| `pnpm dev-cycle status` | 지금 어디까지 했는지 궁금할 때 | 열린 라운드, 채운 칸 수, 다음 할 일 |
| `pnpm skills:check` | 스킬이 제대로 설치됐는지 볼 때 | 빠진 스킬이나 플러그인 |
| `pnpm dev:web` | 화면을 내 브라우저로 볼 때 | 개발 서버 주소(보통 `http://localhost:3001`) |
| `pnpm export:html` | 화면만 프로젝트를 HTML 파일로 내보낼 때 | `html/` 폴더(보통은 "HTML로 내보내줘"라고 말해요) |
| `.agents/skills/impeccable/scripts/impeccable hooks on` | 새 프로젝트에서 처음 한 번(켜 두면 화면을 고칠 때마다 디자인 검사가 돌아요) | 훅이 켜졌다는 출력 |

> [!TIP]
> `pnpm dev-cycle status`는 라운드가 없으면 여는 법을 알려 줘요. `--json`을 붙이면 결과를 JSON으로 출력해요.

아래는 필요할 때 찾아보는 전체 목록이에요. 용어는 [처음 보는 용어](../../tutorials/reference/glossary.md#도구)에 있어요.

## 설치된 프로젝트

### dev-cycle

라운드를 열고 채우고 닫을 때 쓰는 명령이에요. 대부분 에이전트가 실행하고, 사용자는 `status`로 상태만 봐요.

| 명령 | 하는 일 |
|---|---|
| `pnpm dev-cycle status` | 진행 중인 라운드의 케이스, 채운 칸 수, 다음 행<!-- edition:pro -->, 진행 계획의 다음 Task를<!-- /edition --><!-- edition:ui 을 --> 보여 줘요.<!-- edition:pro --> 전환 프로젝트는 기존 코드 경로도 보여 줘요.<!-- /edition --> 라운드가 없으면 여는 법을 알려 주고, 외부 스킬의 새 버전도 하루 한 번 확인해요 |
| `pnpm dev-cycle case` | 현재 diff의 케이스 판정 |
| `pnpm dev-cycle table <케이스> --write --title "<요약>"` | 대조표를 열어요. `--upgrade`를 붙이면 더 무거운 케이스로 올려요. D·E·F에서 그 계층 패키지에 `test` 스크립트가 없으면 vitest 도입 행이 맨 앞에 자동으로 들어가요 |
| `pnpm dev-cycle table <케이스> --write --title "T1 …" --task T1` | 진행 계획의 Task 라운드를 열어요. 앞 Task가 완료나 제외가 아니면 열리지 않고, 대조표 맨 앞에 세부 계획과 계획 리뷰 행이 붙어요(케이스 F는 세부 계획 행만) | <!-- edition:pro -->
| `pnpm dev-cycle table A --write --title "정밀 분석과 진행 계획" --plan` | 진행 계획을 세우거나 고치는 라운드를 열어요. 맨 앞에 정밀 분석(기존 프로젝트만), 계획 문서와 Task 표, 계획 리뷰 행이 붙어요. audit은 `tasks/plan.md`에 진행 계획 블록이 있는지 봐요 | <!-- edition:pro -->
| `pnpm dev-cycle table <케이스> --write --title "<요약>" --no-task` | 진행 계획을 확정하기 전인 기존 프로젝트에서, 사용자가 먼저 하라고 한 급한 버그 수정, 템플릿 갱신 반영, 스킬 구성 변경 라운드를 열어요. 그 밖의 라운드는 진행 계획을 확정해야 열려요 | <!-- edition:pro -->
| `pnpm dev-cycle plan [--json]` | `tasks/plan.md`의 Task 표, 다음에 열 Task, 문제를 보여 줘요. 진행 계획 라운드 중에는 사용자 확인에 적을 Task 구성의 지문(`sig=`)도 보여요. 문제가 있으면 exit 1이에요 | <!-- edition:pro -->
| `pnpm dev-cycle audit` | 빈 칸, 건너뛸 수 없는 칸, 케이스 상향을 검사해요. 화면 리뷰 행은 이번 라운드의 critique 기록(`.impeccable/critique/`)과 audit 보고서(`tasks/evidence/ui-audit-*.md`)의 점수와 맞는지 <!-- edition:pro -->대조하고, 진행 계획의 지문(`sig=`)과 Task 상태도 확인<!-- /edition --><!-- edition:ui 대조 -->해요 |
| `pnpm dev-cycle archive [--title "제목"]` | 진행 중인 라운드는 그대로 두고, 끝낸 일반 할 일과 백로그만 보관해요. 끝나지 않은 항목과 코드 예시는 남기고, 끝난 하위 항목은 상위 항목의 맥락과 함께 기록해요 |
| `pnpm dev-cycle evidence <행 번호> --file <증거 파일>` | 진행 중인 대조표에서 지정한 행의 증거 칸을 증거 파일(프로젝트 안의 한 줄짜리 일반 파일) 내용으로 바꿔요(끝 줄바꿈 하나는 허용해요). 표 머리, stage, 다른 행, 메모, 코드 블록은 그대로 둬요 |
| `pnpm dev-cycle close` | audit과 실제 사용자 확인을 마친 뒤 라운드를 닫아요. 대조표와 끝낸 일반 할 일·백로그는 KST 날짜 파일로 보관해요. `blocked`나 `미실행` 칸이 있으면 사용자가 동의한 뒤 `close --partial`로 닫아요 |
| `pnpm dev-cycle secrets` | 커밋 전에 스테이징한 변경에서 비밀값을 찾아요. 걸리면 exit 1, 검사를 실행하지 못하면 exit 2예요 |
| `pnpm dev-cycle guard --staged` | 커밋할 때 설치기가 건 git pre-commit 훅이 불러요. 코드나 하네스를 바꿨는데 진행 중인 라운드도, 함께 커밋하는 닫은 라운드 기록(`tasks/archive/`)도 없으면 커밋을 막아요(exit 1). 프로킷 설치 커밋은 통과해요 |
| `pnpm dev-cycle guard --since <커밋>` | 그 커밋 뒤의 코드·하네스 변경에 닫은 라운드 기록이 있는지 봐요. 없으면 exit 1이에요. `pnpm release`가 불러요 | <!-- edition:pro -->

<!-- edition:pro -->
`table`과 `evidence`의 옵션에는 이런 제한이 있어요.

- `--plan`은 케이스 A로만 열어요(`--upgrade`와 함께 쓰는 경우는 예외예요).
- `--plan`, `--task`, `--no-task`는 서로 함께 쓰지 못해요.
- `--task`는 `--upgrade`와 함께 쓰지 못하고(상향은 지금 라운드의 Task를 그대로 써요), 진행 계획에 지문(`sig=`)이 있어야 열려요.
- 열린 라운드가 진행 계획 라운드가 아니면 `--plan`을 거부하니 `close`로 닫은 뒤 새로 열어요.
- `evidence`는 진행 계획 라운드의 `[confirm]` 행을 지문(`sig=`) 없이, 또는 앞 행이 끝나기 전에 채우려 하면 거부해요.
<!-- /edition -->

라운드가 무엇이고 어떻게 도는지는 [dev-cycle](../concepts/dev-cycle.md)에 있어요.

증거 파일은 이렇게 다뤄요.

- 프로젝트 안의 일반 파일이고 비어 있지 않은 한 줄이어야 해요. FIFO, 심볼릭 링크, 헤더가 섞인 입력과 프로젝트 밖 경로는 받지 않아요.
- `tasks/evidence/`에는 위임 실행 전후의 기록과 환경·자원 도우미 스크립트(helper)가 낸 실제 결과를 각각 한 번만 남겨요.
- 자원 보호에 쓰는 내부 값(private guard token, owner receipt)은 파일, 명령 출력, 증거 칸에 넣지 않아요.

### 스킬과 에이전트

스킬을 설치하고 확인하고 갱신할 때 보는 표예요. **설치 상태만 보려면 `pnpm skills:check`를 쓰세요. 이 명령은 아무것도 설치하지 않아요.**

| 명령 | 하는 일 |
|---|---|
| `pnpm skills:setup` | `skills.manifest.json`대로 빠진 스킬, 플러그인, OMX 설정, agent-browser CLI를 설치해요. `--with-global`을 붙이면 나머지 전역 도구도 설치해요. 모르는 인자(오타 등)를 주면 설치하지 않고 exit 2로 멈추고, `--help`는 사용법만 보여 줘요 |
| `pnpm skills:setup --brain <이름>[,…]` | 두뇌를 고르거나 바꿔요. 여러 개는 쉼표로 잇고 첫 번째가 주 두뇌예요. 고르지 않은 설치본은 정리해요(openspec·spec-kit의 도구 파일은 지우지만 `openspec/`, `specs/`, `.specify/memory/` 문서는 남겨요) |
| `pnpm skills:setup --drop <스킬 또는 묶음>[,…]` | mattpocock 추가 스킬이나 선택 묶음을 지워요 |
| `pnpm skills:setup --optional <묶음>` | 선택 스킬 묶음(<!-- v:optional.namesCode -->`ops`, `motion`, `mobile`, `i-have-adhd`, `taste`<!-- /v -->)을 설치해요. 여러 개는 쉼표로 이어요(`ops,motion`) |
| `pnpm skills:check` | 설치하지 않고 상태만 확인해요. 프로젝트 범위 항목이 빠졌으면 exit 1이에요 |
| `pnpm skills:update --check` | 설치한 외부 스킬을 GitHub 원본과 비교해 새 버전이 있는지만 알려 줘요 |
| `pnpm skills:update [<이름>...]` | 바뀐 스킬과 빠진 스킬만(이름을 주면 그 스킬만) 다시 설치해요 |
| `pnpm agents:sync` | `.claude/agents`를 바탕으로 `.codex/agents`(Codex)와 `.agents/agents`(Antigravity)를 만들어요 |
| `pnpm agents:check` | 정본(`.claude/agents`)과 생성물이 같은지 검사해요 |
| `claude plugin update <플러그인> --scope project` | Claude 플러그인을 업데이트해요(`skills:update`는 플러그인을 올리지 않아요) |
| `codex plugin marketplace upgrade ponytail` | 과설계 방지 스킬로 ponytail을 골랐을 때 Ponytail 원본 GitHub marketplace의 사본(snapshot)을 새로 받아요. 이 명령만으로는 플러그인이 갱신된 것이 아니에요. 사용자가 원하고 플러그인을 끄지 않았다면, 훅과 코드를 먼저 검토한 뒤 `codex plugin add ponytail@ponytail`을 실행하고 `codex plugin list --json`으로 설치된 판을 확인해요. 훅 신뢰와 새 세션 열기는 따로 해야 해요 |

Codex 네이티브 Ponytail은 `pnpm skills:setup --with-global`을 실행할 때만 설치를 시도해요. 기본 실행과 `--check`는 Codex 사용자 설정을 바꾸지 않아요. 네이티브 플러그인이 없으면 오류가 아니라 선택 기능의 상태로 알려 줘요. 프로젝트 스킬의 필수 누락과 플러그인·훅 상태를 구분하는 방법은 [설치와 업데이트 구조](../skills/install-and-update.md)에 있어요.

### 위임과 자원

에이전트에게 일을 나눠 줄 때와 캐시·임시 폴더 같은 자원을 지킬 때 보는 표예요. 직접 칠 일은 거의 없어요.

| 명령 | 하는 일 |
|---|---|
| `pnpm dev-cycle resource check` | 현재 작업에 연결된 관리 자원을 빠르게 재서 JSON으로 보고해요. <!-- edition:pro -->컨테이너 엔진(Podman·Docker)이 보고한 이미지·컨테이너·볼륨 크기도 `containers`로 보여 줘요(예산에 넣지 않고 지우지도 않아요). <!-- /edition -->정상·경고는 exit 0, 예산 초과는 exit 1(측정이 불완전해도 여유 공간이 차단 한계 이하면 1), 측정 불완전은 exit 2예요 |
| `pnpm dev-cycle resource run --kind <이름> -- <명령>` | 명령을 실행하고, 실행 전후로 자원을 확인해요. 실행 중에는 예산 초과일 때만 멈추고, 측정이 늦거나 실패하면 기록만 해요(여유 공간은 측정이 늦어도 따로 확인해요). 실행 뒤 전체 측정이 끝나지 않으면 실행 전 측정값에 이번 캐시와 여유 공간을 다시 잰 값을 더해 판정해요. 자원이 막혔거나, 측정이 불완전하거나, 정리 중이면 exit 75예요. 명령을 실행했다면 그 명령의 종료 코드를 그대로 돌려줘요(명령을 찾지 못하면 127이에요) |
| `pnpm dev-cycle resource clean [--apply]` | 끝난 guard 실행이 만든 컴파일러 캐시(Turbopack) 가운데 지울 후보만 보여 줘요. 후보는 소유 기록이 있고, 같은 디렉터리이고, 실행과 자식 프로세스가 끝난 것이 확인된 캐시예요(강제 종료로 끝을 적지 못한 기록은 guard와 자식 그룹이 모두 끝났는지로 확인해요). `--apply`는 실행 중인 guard나 Next dev·build가 없을 때만 지워요(다른 환경의 guard는 lease로 판단해요). 지우기를 거부하면 exit 1이에요 |
| `pnpm dev-cycle delegation capture` | 위임 전 작업 트리의 기준 스냅샷을 JSON으로 남겨요 |
| `pnpm dev-cycle delegation diff <기준 파일> [--scope <글롭>]` | 기준 스냅샷 뒤의 변경을 보여 주고, 배정한 글롭(`apps/web/src/**`) 밖 변경이나 커밋이 있으면 exit 1로 알려요. git이 무시하는 파일은 대조하지 않아요. 리뷰·QA처럼 파일을 바꾸면 안 되는 단계는 `--scope` 없이 써요. 기준 파일을 읽을 수 없으면 exit 2예요 |
| `pnpm dev-cycle delegation resolve <스킬 참조 또는 상대 경로>` | 실제 스킬 원본의 위치와 내용 해시를 확인해요. 신뢰한 inspection과 실제 host adapter가 이 계약을 지금 실행에 묶지 못하면 inspection-only로 보고하고 exit 1로 막아요 |
| `pnpm dev-cycle delegation validate <패킷>` | 완료 패킷의 실제 변경, 증거, 허용 경로, 부작용, 환경 지문을 검사해요 |
| `pnpm dev-cycle delegation accept` | 지정한 영향 검사와 새 Codex 읽기 전용 리뷰를 직접 실행해, 로컬에서 기술적으로 받아들여도 되는지 검증해요. 사용자 확인과 라운드 close는 따로 해요 |

새 프로젝트에서는 `dev`, `dev:web`, `build`가 자원 보호 래퍼를 거쳐 실행돼요. 원래 명령은 내부 `prokit:original:<이름>`으로 보관해요. 자원 경계와 정리 조건은 [위임과 자원 관리](../concepts/delegation-and-resources.md)에 있어요.

> [!WARNING]
> 이미 설치된 프로젝트에서는 설치기가 원래 명령을 바꾸지 않아요. 바꾸려면 케이스 H 라운드에서 원본과 증거를 확인한 뒤에 전환해요.

### package.json의 짧은 이름

설치기가 `package.json`에 더하는 `scripts` 이름이에요. 아래는 그 이름이 부르는 실제 명령이에요.

| 이름(앞에 `pnpm`을 붙여 실행해요) | 부르는 명령 |
|---|---|
| `dev-cycle` | `node scripts/dev-cycle.mjs` |
| `resource:check`, `resource:run`, `resource:clean` | `node scripts/resource-guard.mjs`에 `check`, `run`, `clean` |
| `delegation:capture`, `delegation:validate` | `node scripts/delegation.mjs`에 `capture`, `validate` |
| `agents:sync`, `agents:check` | `node scripts/sync-agents.mjs`, 같은 명령에 `--check` |
| `skills:setup`, `skills:check`, `skills:update` | `node scripts/skills-setup.mjs`, `--check`, `--update` |
| `vercel:deploy`, `export:html`, `release` | `node scripts/vercel-deploy.mjs`, `export-html.mjs`, `release.mjs` | <!-- edition:ui | `export:html` | `node scripts/export-html.mjs` | --> <!-- edition:pro -->

`pnpm vercel:deploy`의 옵션은 `--check`(배포하지 않고 준비 상태와 새 마이그레이션만 보기) 하나예요. 하네스만 설치한 `--adopt` 프로젝트에는 `vercel:deploy`, `export:html`, `release`가 없어요. <!-- edition:pro -->

### 화면, 배포<!-- edition:pro -->, 릴리스<!-- /edition -->

화면을 보고 내보내거나 배포할 때 보는 표예요. **배포<!-- edition:pro -->와 릴리스<!-- /edition -->는 요청할 때만 하는 일이라 에이전트가 사용자에게 먼저 물어요.**

| 명령 | 하는 일 |
|---|---|
| `pnpm dev:web` | 개발 서버로 화면 보기 |
| `pnpm export:html [--base /<하위 경로>]` | 화면을 정적 HTML로 내보내 `html/`에 두기. 서버 전용 `.env` 값이 결과물에 들어가면 exit 2. 제작 표시는 선택 사항 |
| `pnpm dlx serve html` | 내보낸 HTML 보기 |
| `pnpm vercel:deploy develop`, `production` | Vercel 배포. `--check`는 준비 상태와 새 마이그레이션만 보기 | <!-- edition:pro -->
| `pnpm release [--title "<영어 제목>"] [--minor]` | 다음 버전(기본 patch, 큰 묶음이면 `--minor`)과 `release/` 노트 만들기 | <!-- edition:pro -->
| `pnpm release --publish <노트>` | version 커밋, 태그, push, GitHub Release 만들기 | <!-- edition:pro -->

### 검사

에이전트가 검사 행을 채울 때 쓰는 명령이에요.

| 명령 | 하는 일 |
|---|---|
| `pnpm check-types` | 타입 검사 |
| `pnpm exec biome check .` | 린트(파일은 고치지 않아요) |
| `pnpm check` | 포맷과 정렬을 고쳐 쓰기. 검증 증거로는 쓰지 않아요 |
| `pnpm dlx @google/design.md lint DESIGN.md` | `DESIGN.md` 스펙 검사 |

## pro-kit 저장소

프로젝트를 새로 만들거나 템플릿을 설치할 때 pro-kit 폴더에서 쓰는 명령이에요. 설치한 프로젝트 안에서는 쓰지 않아요.

| 명령 | 하는 일 |
|---|---|
| `/prokit-init <PRD 파일 경로나 내용>`, `/prokit-init [프로젝트 경로]` | 새 프로젝트를 만들<!-- edition:pro -->거나 기존 프로젝트에 프로킷을 들여요(기존 프로젝트는 PRD가 없어도 돼요)<!-- /edition --><!-- edition:ui 어요 -->. 새 프로젝트는 PRD를 보고 두뇌와 스킬을 추천해 고르게 한 뒤 아래 설치까지 해요. PRD가 없으면 먼저 받고, 끝내 없으면 만들지 않아요. Claude Code 기준이고, Codex에서는 `$prokit-init`이에요. pro-kit 폴더에서 연 세션에서만 불러요([두뇌와 선택 스킬](../skills/brains.md)) |
| `bash templates/<템플릿>/install.sh <프로젝트>` | 템플릿을 설치해요. 옵션은 `--brain`, `--simplicity`, `--matt`, `--optional`, `--diff`, `--skip-skills`, `--with-global`<!-- edition:pro -->, 기존 프로젝트용 `--project-type`, `--legacy`, `--adopt`, `--default-branch`<!-- /edition -->예요([설치기와 옵션](../templates/installer.md)) |
| `node scripts/pack.mjs <이름> --zip <경로>` | 크레딧으로 받은 프리셋 팩 zip의 sha256을 확인한 뒤 `packs/<이름>/`에 풀기 |
| `node scripts/pack.mjs <이름> --zip <경로>` | 미리 받아 둔 팩 zip을 같은 확인을 거쳐 `packs/<이름>/`에 풀기 |

## 자세히

- 프로젝트마다 실제로 쓰는 검사 명령은 `.dev-cycle.json`의 `commands`(typecheck, lint, build, test, dbGenerate, dbMigrate)에 있어요. 없는 키는 그 프로젝트에서 실행할 수 없는 검사예요.
- DB 명령은 패키지에서 실행해요. 예: `pnpm --filter @my-app/db db:generate`, `pnpm --filter @my-app/db db:migrate`. <!-- edition:pro -->
- 명령 표의 정본은 템플릿 README의 "설치된 프로젝트에서 자주 쓰는 명령"([neon](../../templates/prokit-next-neon/README.md#설치된-프로젝트에서-자주-쓰는-명령) · [supabase](../../templates/prokit-next-supabase/README.md#설치된-프로젝트에서-자주-쓰는-명령))이에요. supabase는 `supabase start`, `stop`, `status`와 `supabase db advisors` 같은 DB 명령이 더 있어요. <!-- edition:pro -->
- 기존 프로젝트에 도입하는 흐름은 [기존 프로젝트에 도입하기](../start/adopt.md), Task와 진행 계획은 [정밀 분석과 진행 계획](../concepts/project-plan.md)에 있어요. <!-- edition:pro -->

## 관련 문서

- [dev-cycle 라운드](../concepts/dev-cycle.md)
- [정밀 분석과 진행 계획](../concepts/project-plan.md)
- [설치와 업데이트 구조](../skills/install-and-update.md)
- [설치된 프로젝트의 폴더 구조](project-structure.md)
