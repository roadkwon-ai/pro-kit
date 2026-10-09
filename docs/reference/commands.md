# 명령 모음
https://prokit-web.vercel.app/docs/reference/commands/

> 한눈에: 프로킷이 설치된 프로젝트와 pro-kit 저장소에서 쓰는 명령을 모았어요. 평소에는 에이전트가 알아서 실행하니 외우지 않아도 돼요. 직접 확인하고 싶을 때 찾아보세요.

## 설치된 프로젝트

### dev-cycle

| 명령 | 하는 일 |
|---|---|
| `pnpm dev-cycle status` | 진행 중인 라운드의 케이스, 채운 칸 수, 다음 행 확인. 라운드가 없으면 여는 법을 알려 주고, 외부 스킬 새 버전도 하루 한 번 확인 |
| `pnpm dev-cycle case` | 현재 diff의 케이스 판정 |
| `pnpm dev-cycle table <케이스> --write --title "<요약>"` | 대조표 열기. `--upgrade`는 더 무거운 케이스로 올리기 |
| `pnpm dev-cycle audit` | 빈 칸, 건너뛸 수 없는 칸, 케이스 상향 검사 |
| `pnpm dev-cycle close` | 대조표를 `tasks/archive/`로 옮겨 라운드 닫기. `blocked`나 `미실행` 칸이 있으면 사용자가 동의한 뒤 `close --partial` |
| `pnpm dev-cycle secrets` | 커밋 전에 스테이징한 변경에서 비밀값 찾기. 걸리면 exit 1, 검사를 실행하지 못하면 exit 2 |

`--json`을 붙이면 결과를 JSON으로 출력해요. 라운드가 무엇이고 어떻게 도는지는 [dev-cycle](https://prokit-web.vercel.app/docs/concepts/dev-cycle/)에 있어요.

### 스킬과 에이전트

| 명령 | 하는 일 |
|---|---|
| `pnpm skills:setup` | `skills.manifest.json`대로 빠진 스킬, 플러그인, OMX 설정과 agent-browser CLI 설치. `--with-global`이면 나머지 전역 도구도 |
| `pnpm skills:setup --optional <묶음>` | 선택 스킬 묶음(`ops`, `motion`, `mobile`) 설치. 여러 개는 쉼표로(`ops,motion`) |
| `pnpm skills:check` | 설치하지 않고 상태만 확인. 프로젝트 범위 항목이 빠졌으면 exit 1 |
| `pnpm skills:update --check` | 설치한 외부 스킬을 GitHub 원본과 비교해 새 버전만 알려 주기 |
| `pnpm skills:update [<이름>...]` | 바뀐 스킬과 빠진 스킬만(또는 지정한 스킬만) 다시 설치 |
| `pnpm agents:sync` | `.claude/agents`에서 `.codex/agents`(Codex)와 `.agents/agents`(Antigravity) 만들기 |
| `pnpm agents:check` | 정본과 생성물이 맞는지 검사 |
| `claude plugin update <플러그인> --scope project` | Claude 플러그인 업데이트(`skills:update`는 플러그인을 올리지 않아요) |

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
| `bash templates/<템플릿>/install.sh <프로젝트>` | 템플릿 설치. `--diff`, `--skip-skills`, `--with-global`([설치기와 옵션](https://prokit-web.vercel.app/docs/templates/installer/)) |
| `node scripts/pack.mjs <이름>` | 프리셋 팩을 받아 sha256을 확인한 뒤 `packs/<이름>/`에 풀기 |
| `node scripts/pack.mjs <이름> --zip <경로>` | 미리 받아 둔 팩 zip을 같은 확인을 거쳐 `packs/<이름>/`에 풀기 |

## 자세히

- 프로젝트마다 실제로 쓰는 검사 명령은 `.dev-cycle.json`의 `commands`(typecheck, lint, build, test, dbGenerate, dbMigrate)에 있어요. 없는 키는 그 프로젝트에서 실행할 수 없는 검사예요.
- DB 명령은 패키지에서 실행해요. 예: `pnpm --filter @my-app/db db:generate`, `pnpm --filter @my-app/db db:migrate`.
- 명령 표의 정본은 템플릿 README의 "설치된 프로젝트에서 자주 쓰는 명령"([neon](https://github.com/roadkwon-ai/pro-kit/blob/main/templates/prokit-next-neon/README.md#설치된-프로젝트에서-자주-쓰는-명령) · [supabase](https://github.com/roadkwon-ai/pro-kit/blob/main/templates/prokit-next-supabase/README.md#설치된-프로젝트에서-자주-쓰는-명령))이에요. supabase는 `supabase start`, `stop`, `status`와 `supabase db advisors` 같은 DB 명령이 더 있어요.

## 관련 문서

- [dev-cycle 라운드](https://prokit-web.vercel.app/docs/concepts/dev-cycle/)
- [설치와 업데이트 구조](https://prokit-web.vercel.app/docs/skills/install-and-update/)
- [설치된 프로젝트의 폴더 구조](https://prokit-web.vercel.app/docs/reference/project-structure/)
