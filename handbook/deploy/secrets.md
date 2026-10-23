# 비밀값 지키기

> 한눈에: 비밀값은 남이 알면 안 되는 값이에요. DB 비밀번호, API 키, 토큰이 대표적이고 `.env` 파일에 들어 있어요. 이 값은 저장소와 배포 파일에 남기지 않아요. 내 컴퓨터에서 쓰는 값은 GitHub에 올라가지 않는 파일에, 배포한 서비스의 값은 Vercel 설정에만 둬요. 저장(커밋)하기 전과 배포하기 전에 에이전트가 한 번 더 검사해요.

## 사용자가 지킬 것

비밀값은 `.env` 값, API 키(예: `OPENAI_API_KEY`), 배포 토큰(`GH_TOKEN`, `VERCEL_TOKEN`), DB 연결 주소처럼 알려지면 남이 내 계정이나 데이터를 쓸 수 있는 값이에요. 사용자가 하지 말아야 할 일은 이래요.

- 값을 대화창에 붙여 넣지 않아요. 에이전트도 값을 달라고 하지 않아요.
- 값을 GitHub, 메신저, 스크린샷에 올리지 않아요.
- `.env`를 커밋하거나 배포 폴더에 넣지 않아요.

> [!WARNING]
> 실수로 올렸다면 그 값을 발급한 서비스에서 바로 새 값으로 바꿔요(키 재발급). 파일에서 지우는 것만으로는 이미 알려진 값이 안전해지지 않아요.

## 값을 두는 곳

> [!IMPORTANT]
> 환경변수 값은 환경마다 한 곳에만 둬요. 파일에 두는 값은 로컬 값뿐이에요.

| 환경 | 앱 환경변수 |
|---|---|
| 로컬 | `apps/web/.env` (git이 무시해요) |
| develop | Vercel Preview 환경변수 |
| production | Vercel Production 환경변수 |

> [!WARNING]
> 배포 값을 `.env.development`나 `.env.production`에 두지 않아요. 이 파일은 `.vercelignore`에 걸려 배포에 올라가지 않아요. 또 Vercel은 Preview도 `NODE_ENV=production`으로 빌드해서, 파일로는 develop과 운영을 나눌 수도 없어요. 결국 쓰이지 않는 비밀값 사본만 남고, 에이전트가 그 파일을 읽으면 값이 대화 기록에 남아요.

값마다 두는 곳은 이래요.

| 값 | 두는 곳 |
|---|---|
| 앱 환경변수(`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) | 로컬은 `apps/web/.env`, 배포는 Vercel 환경변수예요 |
| 배포 토큰(`GH_TOKEN`, `VERCEL_TOKEN`) | 작업 폴더나 프로젝트의 `.env`예요. 명령마다 `node scripts/load-keys.mjs -- <명령>`으로 그 명령에만 넣어요 |
| 이미지 키(`OPENAI_API_KEY`) | 프로젝트나 작업 폴더의 `.env`예요 |
| 커밋하는 파일, 대화창, 대조표의 증거 칸 | 어떤 비밀값도 두지 않아요 |

## 막는 장치

| 장치 | 하는 일 |
|---|---|
| `.gitignore`의 `.env.*` | 루트와 `packages/*`의 `.env.*`를 git이 무시해요(`.env.schema`는 커밋해요) |
| `.vercelignore` | `vercel deploy`는 `.gitignore`를 따르지 않고 작업 폴더를 그대로 올려요. 설치기가 넣는 `.vercelignore`가 로컬 `.env`, `.neon`, `.codex`, `supabase/.temp`, `*.pem`, `*.local`, `*.local.*` 등을 빼요 |
| `pnpm dev-cycle secrets` | 커밋 전에 스테이징한 변경에서 로컬 `.env*`의 비밀값과 흔한 키 형식(개인 키, `sk-`, GitHub 토큰 등)을 찾아요. 값은 출력하지 않아요. 걸리면 exit 1이라 커밋하지 않아요 |
| `pnpm vercel:deploy … --check` | 빠진 환경변수를 포함해 배포 준비 상태를 검사하고, 걸리면 배포하지 않아요 |
| `pnpm export:html` | 화면만 프로젝트에서 서버 전용 `.env` 값이 결과물에 들어가면 exit 2로 멈춰요 |

## 자세히

### 에이전트가 지키는 것

- 연결 문자열과 비밀번호는 파일과 출력에 남기지 않아요. neon은 `neon link … --no-env-pull`로 연결해 비밀번호가 든 주소를 파일로 받지 않고, supabase는 연결 문자열을 파일에 적지 않아요.
- 대조표의 증거 칸에도 비밀값, 토큰, 연결 문자열을 옮겨 적지 않아요.
- `pnpm dev-cycle secrets`에 걸리면 걸린 파일과 변수 이름만 보고하고, 값을 지우거나 그 파일을 스테이징에서 뺀 뒤 다시 검사해요.
- 배포 토큰(`GH_TOKEN`, `VERCEL_TOKEN`)은 `node scripts/load-keys.mjs -- <명령>`으로 그 명령에만 넣어요. 값을 대화창에 붙여 넣으라고 하지 않아요.

### 이미지 키

`OPENAI_API_KEY`를 프로젝트나 작업 폴더의 `.env`에 두면 Claude Code 세션을 열 때 훅(`scripts/load-keys.mjs`)이 셸 환경에 불러와요. 키는 커밋하는 파일에 적지 않아요. 준비 방법은 [비용과 키](../../tutorials/reference/costs-and-keys.md#이미지-그리기)에 있어요.

## 관련 문서

- [Vercel 배포와 되돌리기](vercel.md)
- [증거와 audit, 사용자 확인](../concepts/audit-and-confirm.md)
- [GitHub Pages 배포](github-pages.md)
