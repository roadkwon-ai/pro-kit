# 명령 모음

> 한눈에: 프로킷이 설치된 프로젝트와 pro-kit 저장소에서 쓰는 명령을 모았어요. 평소에는 에이전트가 알아서 실행하니 외우지 않아도 돼요. 직접 확인하고 싶을 때 찾아보세요.

## 설치된 프로젝트

### dev-cycle

| 명령 | 하는 일 |
|---|---|
| `pnpm dev-cycle status` | 진행 중인 라운드의 케이스, 채운 칸 수, 다음 행 확인. 라운드가 없으면 여는 법을 알려 주고, 외부 스킬 새 버전도 하루 한 번 확인 |
| `pnpm dev-cycle case` | 현재 diff의 케이스 판정 |
| `pnpm dev-cycle table <케이스> --write --title "<요약>"` | 대조표 열기. `--upgrade`는 더 무거운 케이스로 올리기 |
| `pnpm dev-cycle audit` | 빈 칸, 건너뛸 수 없는 칸, 케이스 상향 검사 |
| `pnpm dev-cycle archive [--title "제목"]` | 활성 라운드는 그대로 두고 완료한 일반 할 일·백로그만 보관. 미완료 항목과 코드 예시는 남기고, 끝난 하위 항목은 부모 문맥과 함께 기록 |
| `pnpm dev-cycle evidence <행 번호> --file <증거 파일>` | 활성 대조표의 지정 행 증거 칸을 프로젝트 안 일반 한 줄 파일의 내용으로 바꿔요(끝 줄바꿈 하나는 허용해요). 표의 헤더·stage와 다른 행, 메모, 코드 블록은 그대로 둬요 |
| `pnpm dev-cycle close` | audit과 실제 사용자 확인 뒤 대조표와 완료한 일반 할 일·백로그를 KST 날짜의 파일로 보관해 라운드 닫기. `blocked`나 `미실행` 칸이 있으면 사용자가 동의한 뒤 `close --partial` |
| `pnpm dev-cycle secrets` | 커밋 전에 스테이징한 변경에서 비밀값 찾기. 걸리면 exit 1, 검사를 실행하지 못하면 exit 2 |

`--json`을 붙이면 결과를 JSON으로 출력해요. 라운드가 무엇이고 어떻게 도는지는 [dev-cycle](../concepts/dev-cycle.md)에 있어요.

증거 파일은 프로젝트 안의 일반 파일이고 비어 있지 않은 한 줄이어야 해요. FIFO, 심볼릭 링크, 헤더가 섞인 입력과 프로젝트 밖 경로는 받지 않아요. `tasks/evidence/`에는 실행 전후 산출물, 환경·자원 helper의 실제 결과를 각각 한 번만 남겨요. private guard token이나 owner receipt의 내용은 파일·명령 출력·증거 칸에 직접 넣지 않아요.

### 스킬과 에이전트

| 명령 | 하는 일 |
|---|---|
| `pnpm skills:setup` | `skills.manifest.json`대로 빠진 스킬, 플러그인, OMX 설정과 agent-browser CLI 설치. `--with-global`이면 나머지 전역 도구도 |
| `pnpm skills:setup --optional <묶음>` | 선택 스킬 묶음(<!-- v:optional.namesCode -->`ops`, `motion`, `mobile`<!-- /v -->) 설치. 여러 개는 쉼표로(`ops,motion`) |
| `pnpm skills:check` | 설치하지 않고 상태만 확인. 프로젝트 범위 항목이 빠졌으면 exit 1 |
| `pnpm skills:update --check` | 설치한 외부 스킬을 GitHub 원본과 비교해 새 버전만 알려 주기 |
| `pnpm skills:update [<이름>...]` | 바뀐 스킬과 빠진 스킬만(또는 지정한 스킬만) 다시 설치 |
| `pnpm agents:sync` | `.claude/agents`에서 `.codex/agents`(Codex)와 `.agents/agents`(Antigravity) 만들기 |
| `pnpm agents:check` | 정본과 생성물이 맞는지 검사 |
| `claude plugin update <플러그인> --scope project` | Claude 플러그인 업데이트(`skills:update`는 플러그인을 올리지 않아요) |
| `codex plugin marketplace upgrade ponytail` | Ponytail 원본 GitHub marketplace snapshot을 새로고침해요. 이 명령만으로 플러그인 갱신 완료를 판정하지 않아요. 사용자가 원하고 비활성화 상태가 아니면 hooks와 코드를 먼저 검토한 뒤 `codex plugin add ponytail@ponytail`을 실행하고 `codex plugin list --json`으로 설치판을 확인해요. 훅 신뢰와 새 세션은 별도예요 |

`pnpm skills:setup --with-global`에서만 Codex 네이티브 Ponytail 설치를 시도해요. 기본 실행과 `--check`는 Codex 사용자 설정을 바꾸지 않고, 네이티브 플러그인이 없어도 선택 기능의 상태로 알려 줘요. 프로젝트 스킬의 필수 누락과 플러그인·훅 상태를 구분하는 방법은 [설치와 업데이트 구조](../skills/install-and-update.md)에 있어요.

### 위임과 자원

| 명령 | 하는 일 |
|---|---|
| `pnpm dev-cycle resource check` | 현재 작업에 연결된 관리 자원을 빠르게 재서 JSON으로 보고해요. 컨테이너 엔진(Podman·Docker)이 보고한 이미지·컨테이너·볼륨 크기도 `containers`로 보여 줘요(예산에 넣지 않고 지우지 않아요). 정상·경고는 exit 0, 예산 초과는 exit 1(측정이 불완전해도 여유 공간이 차단 한계 이하면 1), 측정 불완전은 exit 2예요 |
| `pnpm dev-cycle resource run --kind <이름> -- <명령>` | 명령 전후 자원을 확인하고 실행해요. 실행 중에는 예산 초과일 때만 멈추고, 측정이 늦거나 실패하면 기록만 해요(여유 공간은 측정이 늦어도 따로 확인해요). 실행 뒤 전체 측정이 끝나지 않으면 실행 전 측정에 이번 캐시와 여유 공간을 다시 재서 판정해요. 자원 차단·측정 불완전·정리 중이면 exit 75이고, 실행했다면 자식 명령의 종료 코드를 그대로 돌려줘요(명령을 찾지 못하면 127이에요) |
| `pnpm dev-cycle resource clean [--apply]` | 끝난 guard 실행이 만든 compiler cache(Turbopack) 가운데 소유 기록·같은 디렉터리·실행과 자식 종료가 확인된 것만 후보로 보여 줘요(강제 종료로 종료를 적지 못한 기록은 guard와 자식 그룹이 모두 끝났는지로 확인해요). `--apply`는 실행 중인 guard나 Next dev·build가 없을 때만 지우고(다른 환경 guard는 lease로 판단해요), 거부하면 exit 1이에요 |
| `pnpm dev-cycle delegation capture` | 위임 전 작업 트리의 기준 스냅샷을 JSON으로 남겨요 |
| `pnpm dev-cycle delegation diff <기준 파일> [--scope <글롭>]` | 기준 스냅샷 뒤의 변경을 보여 주고, 배정한 글롭(`apps/web/src/**`) 밖 변경이나 커밋이 있으면 exit 1로 알려요. git이 무시하는 파일은 대조하지 않아요. 리뷰·QA처럼 파일을 바꾸면 안 되는 단계는 `--scope` 없이 써요. 기준 파일을 읽을 수 없으면 exit 2예요 |
| `pnpm dev-cycle delegation resolve <스킬 참조 또는 상대 경로>` | 실제 스킬 원본의 위치·내용 해시를 관찰해요. 신뢰한 inspection과 실제 host adapter가 계약을 현재 실행에 묶지 못하면 inspection-only로 보고하고 exit 1로 막아요 |
| `pnpm dev-cycle delegation validate <패킷>` | 완료 패킷의 실제 변경, 증거, 허용 경로, 부작용, 환경 지문을 검사해요 |
| `pnpm dev-cycle delegation accept` | 명시한 영향 검사와 새 Codex 읽기 전용 리뷰를 직접 실행해 로컬 기술 인수를 검증해요. 사용자 확인과 라운드 close는 별도예요 |

새 프로젝트에서는 `dev`, `dev:web`, `build`가 자원 보호 래퍼를 거쳐 실행돼요. 원래 명령은 내부 `prokit:original:<이름>`으로 보관해요. 이미 설치된 프로젝트는 설치기가 원래 명령을 바꾸지 않으므로, 케이스 H 라운드에서 원본과 증거를 확인한 뒤에만 전환해요. 자원 경계와 정리 조건은 [위임과 자원 관리](../concepts/delegation-and-resources.md)에 있어요.

### 화면, 배포, 릴리스

| 명령 | 하는 일 |
|---|---|
| `pnpm dev:web` | 개발 서버로 화면 보기 |
| `pnpm export:html [--base /<하위 경로>]` | 화면을 정적 HTML로 내보내 `html/`에 두기. 서버 전용 `.env` 값이 결과물에 들어가면 exit 2. 제작 표시는 선택 사항 |
| `pnpm dlx serve html` | 내보낸 HTML 보기 |
| `pnpm vercel:deploy develop`, `production` | Vercel 배포. `--check`는 준비 상태와 새 마이그레이션만 보기 |
| `pnpm release [--title "<영어 제목>"] [--minor]` | 다음 버전(기본 patch, 큰 묶음이면 `--minor`)과 `release/` 노트 만들기 |
| `pnpm release --publish <노트>` | version 커밋, 태그, push, GitHub Release 만들기 |

### 검사

| 명령 | 하는 일 |
|---|---|
| `pnpm check-types` | 타입 검사 |
| `pnpm exec biome check .` | 린트(파일은 고치지 않아요) |
| `pnpm check` | 포맷과 정렬을 고쳐 쓰기. 검증 증거로는 쓰지 않아요 |
| `pnpm dlx @google/design.md lint DESIGN.md` | `DESIGN.md` 스펙 검사 |

## pro-kit 저장소

| 명령 | 하는 일 |
|---|---|
| `bash templates/<템플릿>/install.sh <프로젝트>` | 템플릿 설치. `--diff`, `--skip-skills`, `--with-global`([설치기와 옵션](../templates/installer.md)) |
| `node scripts/pack.mjs <이름>` | 프리셋 팩을 받아 sha256을 확인한 뒤 `packs/<이름>/`에 풀기 |
| `node scripts/pack.mjs <이름> --zip <경로>` | 미리 받아 둔 팩 zip을 같은 확인을 거쳐 `packs/<이름>/`에 풀기 |

## 자세히

- 프로젝트마다 실제로 쓰는 검사 명령은 `.dev-cycle.json`의 `commands`(typecheck, lint, build, test, dbGenerate, dbMigrate)에 있어요. 없는 키는 그 프로젝트에서 실행할 수 없는 검사예요.
- DB 명령은 패키지에서 실행해요. 예: `pnpm --filter @my-app/db db:generate`, `pnpm --filter @my-app/db db:migrate`.
- 명령 표의 정본은 템플릿 README의 "설치된 프로젝트에서 자주 쓰는 명령"([neon](../../templates/prokit-next-neon/README.md#설치된-프로젝트에서-자주-쓰는-명령) · [supabase](../../templates/prokit-next-supabase/README.md#설치된-프로젝트에서-자주-쓰는-명령))이에요. supabase는 `supabase start`, `stop`, `status`와 `supabase db advisors` 같은 DB 명령이 더 있어요.

## 관련 문서

- [dev-cycle 라운드](../concepts/dev-cycle.md)
- [설치와 업데이트 구조](../skills/install-and-update.md)
- [설치된 프로젝트의 폴더 구조](project-structure.md)
