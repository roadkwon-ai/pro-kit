# 비밀값 지키기

> 한눈에: DB 비밀번호나 API 키 같은 비밀값은 저장소와 배포 파일에 남기지 않아요. 내 컴퓨터의 값은 GitHub에 올라가지 않는 파일에, 인터넷에 올린 서비스의 값은 Vercel 설정에만 둬요. 저장(커밋)하기 전과 올리기 전에 한 번 더 검사해요.

## 값을 두는 곳

환경변수 값은 환경마다 한 곳에만 둬요. 파일에 두는 값은 로컬 값뿐이에요.

| 환경 | 앱 환경변수 |
|---|---|
| 로컬 | `apps/web/.env` (git이 무시해요) |
| develop | Vercel Preview 환경변수 |
| production | Vercel Production 환경변수 |

배포 값을 `.env.development`나 `.env.production`에 두지 않아요. 이 파일은 `.vercelignore`에 걸려 배포에 올라가지 않고, Vercel은 Preview도 `NODE_ENV=production`으로 빌드해서 파일로는 develop과 운영을 나눌 수도 없어요. 쓰이지 않는 비밀값 사본만 남고, 에이전트가 그 파일을 읽으면 값이 대화 기록에 남아요.

## 막는 장치

| 장치 | 하는 일 |
|---|---|
| `.gitignore`의 `.env.*` | 루트와 `packages/*`의 `.env.*`를 git이 무시해요(`.env.schema`는 커밋해요) |
| `.vercelignore` | `vercel deploy`는 `.gitignore`를 따르지 않고 작업 폴더를 그대로 올려요. 설치기가 넣는 `.vercelignore`가 로컬 `.env`, `.neon`, `.codex`, `supabase/.temp`, `*.pem`, `*.local`, `*.local.*` 등을 빼요 |
| `pnpm dev-cycle secrets` | 커밋 전에 스테이징한 변경에서 로컬 `.env*`의 비밀값과 흔한 키 형식(개인 키, `sk-`, GitHub 토큰 등)을 찾아요. 값은 출력하지 않아요. 걸리면 exit 1이라 커밋하지 않아요 |
| `pnpm vercel:deploy … --check` | 빠진 환경변수까지 배포 준비를 검사하고 걸리면 배포하지 않아요 |
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
