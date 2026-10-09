# Better-T-Stack Next.js 튜토리얼 제작·검증 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 초보자가 설명을 읽고 커맨드·프롬프트·스킬을 직접 한 단계씩 실행해 로그인·대시보드·개인 Todo·AI 채팅 앱을 완성하는 한국어 튜토리얼을 제작하고, 실행 가능한 기준 코드와 검증 근거를 함께 제공한다.

**Architecture:** 문서 작성자는 승인된 조합을 별도 실습 폴더에서 생성·검증하고, 독자는 그 작업을 작은 실습 단위로 따라간다. 기능별 기준 코드와 변경 패치를 제공해 AI 출력이 달라도 비교·복구할 수 있게 한다. 모든 실습은 프로젝트 개관·용어집 읽기로 시작하고 코드·문서·검증 결과를 맞추는 것으로 끝난다.

**Tech Stack:** Next.js App Router / TypeScript / Hono / Node.js / tRPC / TanStack Query / Better Auth / Drizzle / PostgreSQL / Docker / pnpm / Turborepo / AI SDK·Google provider / Skillstead SVG·PNG.

**Spec:** [승인된 설계안](../specs/2026-09-20-better-t-stack-nextjs-tutorial-design.md)

**상태:** Native 제작 완료. 단계별 기준 코드·문서·도식·검증 기록을 제공했다. 외부 서비스와 새 에이전트 세션의 전체 재현은 실행 기록에 구분했다.

## Global Constraints

- 산출물은 한국어이며, 독자가 명령·프롬프트·스킬을 직접 순서대로 실행한다.
- 앱 이름은 Better Tasks Lab, 디렉터리 이름은 `better-tasks-lab`이다.
- 본문 환경은 macOS·Linux·Windows WSL의 Bash/Zsh다. 직접 검증하지 않은 운영체제의 성공을 주장하지 않는다.
- Codex와 Claude Code 중 하나로 완주할 수 있게 한다. 서로 다른 호출 문법과 입력 위치를 표시한다.
- 가상 계정과 학습용 데이터만 사용한다. 기존 DB·실제 계정·사용자의 전역 지침을 덮어쓰지 않는다.
- 기본 과정은 로컬에서 완주한다. 실제 AI 호출과 외부 배포는 별도 검증 상태를 기록한다.
- AI 사용 제한의 학습 기본값은 사용자당 UTC 하루 20회, 입력 메시지당 2,000자, 전송 대화 최대 20개 메시지, 출력 최대 1,000토큰이다.
- AI 호출을 DB에서 원자적으로 예약하며 provider 실패·중단도 예약 1회를 소비한다. 실패 후 자동 재시도는 기본으로 하지 않는다.
- AI 대화 영구 저장, 관리자 UI, 주문·결제·배송·사진 요청·다국어는 본 과정 범위 밖이다.
- 필수 문서는 실습 앱의 `docs/domain/glossary.md`, `docs/domain/project.md`다.
- 공통 지침 정본은 `AGENTS.md`이며 `CLAUDE.md`는 공통 지침 참조와 도구별 차이를 담는다.
- 생성기 `3.44.0`을 첫 검증 후보로 사용한다. 실제 생성물과 버전을 확인하고 lockfile을 보관한다.
- 스킬 예제를 이유로 인증·ORM·API·상태 관리 도구를 임의로 교체하지 않는다.
- 기존 `boilerplate/better-t-stack/tutorial/`와 `references/`는 읽기 전용 참고 자료로 유지한다.
- 앱·가이드용 의존성 외에 새 테스트 프레임워크나 문서 사이트 프레임워크를 추가하지 않는다. 검사는 Node 표준 라이브러리와 기존 도구를 우선 사용한다.
- 현재 작업 폴더는 Git 저장소가 아니다. 문서 커밋을 위해 임의로 전체 폴더를 저장소로 만들지 않는다. 기준 앱의 단계 이력은 별도 작업 폴더에 만든 Git 저장소에서 관리한다.

## Review Focus

1. **다른 터미널·공백 경로:** 새 터미널에서 경로 변수가 사라지거나 가이드 경로에 공백이 있어도 재개 안내를 따라 올바른 앱에서 실행할 수 있어야 한다. 작업 1·2·11에서 재현한다.
2. **잘못된 단계·기존 파일:** 이미 수정한 앱에 기준 코드를 적용하거나 패치를 두 번 적용하면 변경 전에 멈춰야 한다. 작업 2·11에서 `git apply --check`로 검증한다.
3. **교차 계정 ID·소유자 위조:** 다른 계정의 Todo ID와 임의의 `userId`를 보내도 데이터가 노출·변경되지 않아야 한다. 작업 6에서 검증한다.
4. **AI 동시 요청·UTC 경계·실패:** 동시에 한도를 넘겨 요청하거나 provider가 실패해도 호출 예약 규칙이 유지되어야 한다. 작업 8·9에서 검증한다.
5. **쿠키·배포·모의 provider:** 로컬 HTTP와 배포 HTTPS의 인증 경계를 구분하고, 모의 provider 결과를 실제 AI 성공으로 기록하거나 운영 기본값으로 노출하지 않아야 한다. 작업 4·8·10에서 검증한다.

---

## 1. 실행 담당자와 독자의 작업을 구분한다

**이 계획의 실행 담당자**는 튜토리얼·기준 코드·검증 기록을 만든다. 기준 코드를 먼저 만들더라도 독자가 시작하는 앱에는 빈 생성기 결과만 존재해야 한다.

**독자**는 각 장의 작은 실습을 직접 수행한다. “전체 앱을 완성해줘” 프롬프트나 최종 코드 전체 복사만으로 본문 과정을 대신하지 않는다. 기준 코드는 비교·복구·빠른 미리보기 경로에서 별도로 제공한다.

실행 순서는 작업 1→2→3→4→5→6→7→8→9→10→11→12다. 한 장의 작은 실습은 설명을 읽고 행동 하나를 실행한 뒤 확인할 수 있는 크기로 나눈다. 설치·빌드처럼 오래 걸리는 명령의 실행 시간은 고정하지 않는다.

## 2. 파일 구조와 책임

산출물 루트는 `boilerplate/better-t-stack/nextjs-demo-tutorial/`다. 아래 표의 경로는 모두 이 루트 기준이다.

| 파일·폴더 | 책임 |
| --- | --- |
| `README.md` | 진입점, 학습 지도, 목차, 입력 위치, 완료 수준 |
| `00-overview.md` | 앱 소개, 9개 capability, 범위와 학습 순서 |
| `01-environment.md` | 개발 도구·에이전트·터미널 준비 |
| `02-scaffold.md` | 생성기 실행, 옵션 해설, 생성 결과 확인 |
| `03-first-run.md` | 환경변수, PostgreSQL, 첫 웹·API 실행 |
| `04-docs-and-skills.md` | 필수 문서, 프로젝트 규칙, 스킬 설치·확인 |
| `05-authentication.md` | 계정·세션·보호 화면·보호 API |
| `06-todo-ui.md` | 샘플 Todo 화면과 상태 처리 |
| `07-todo-api.md` | DB·마이그레이션·CRUD·소유권 |
| `08-dashboard.md` | 실제 연결, 캐시 갱신, 집계 |
| `09-ai-ui.md` | 키 없는 모의 스트림, 실패·중단 UI |
| `10-ai-integration.md` | 실제 provider, 인증·입력·사용량 제한 |
| `11-verification.md` | 통합 검사, 문서 대조, 오류 복구 |
| `12-deployment.md` | 호스팅 DB, 배포 환경, 실제 URL 검증 |
| `13-feature-cycle.md` | 필터 기능으로 개발 주기 반복 |
| `prompt-map.md` | 순서별 프롬프트 위치, 입력 도구, 재개·복구 안내 |
| `troubleshooting.md` | 오류 증상→확인 명령→수정→재검사 |
| `appendices/skills-and-plugins.md` | 조사 결과, 도구별 설치, 전체 키트 비교 |
| `appendices/generated-examples.md` | `todo ai` 예제 생성과 본 과정의 차이 |
| `appendices/chat-history.md` | 대화 저장 확장의 모델·권한·검증 요구사항 |
| `templates/AGENTS.md`, `templates/CLAUDE.md` | 복사 가능한 프로젝트 지침 |
| `templates/docs/domain/glossary.md` | 아홉 범주의 초기 용어집 |
| `templates/docs/domain/project.md` | 서비스·구조·URL·모델·역량 개관 |
| `templates/docs/TASKS.md` | 완료 실습, 검사 결과, 다음 시작점 |
| `templates/skills/better-tasks-cycle/SKILL.md` | 배운 개발 주기를 재사용하는 프로젝트 스킬 |
| `reference/base/` | 생성·초기 설치를 확인한 기준 뼈대와 lockfile; 비밀값·생성 캐시 제외 |
| `reference/patches/` | 단계별 기준 변경, 각 단계의 문서 갱신 포함 |
| `reference/README.md` | 기준 코드 실행, 단계 적용·비교·복구 방법 |
| `reference/checkpoints.json` | 패치 순서·선행 단계·해시·완료 검사 명령 |
| `verification/versions.json` | 검증 버전·생성 옵션·스킬 출처·리비전 |
| `verification/file-map.md` | 생성물에서 확인한 경로·scripts·환경변수·라우트 |
| `verification/commands.json` | 실습 ID별 cwd·명령·기대 결과·실행 상태 |
| `verification/results.md` | 실제 실행·정적 검사·미검증 영역 |
| `scripts/check-guide.mjs` | 문서 구조·링크·앵커·펜스·블록 검사 |
| `assets/` | SVG 원본·PNG·검증용 화면 캡처 |
| `diagrams.md` | 도식의 메시지·원본·렌더 명령·검증 기록 |

기준 앱 작업 폴더는 산출물 밖의 `.work/better-tasks-reference/`를 사용한다. 결과 배포물에 `.env`, `.git`, `node_modules`, 빌드 캐시, 실제 DB 볼륨, 실제 토큰·키를 포함하지 않는다.

기준 앱에 추가하는 학습용 파일의 책임은 다음과 같다. 생성된 기존 경로·import·script는 작업 1에서 확인한 뒤 `file-map.md`에 기록한다.

| 기준 앱 경로 | 책임 |
| --- | --- |
| `packages/db/src/schema/todo.ts` | `todos` 테이블·인덱스 |
| `packages/db/src/schema/ai-usage.ts` | 사용자·UTC 날짜별 사용량 |
| `packages/api/src/routers/todo.ts` | 개인 Todo CRUD·집계 |
| `apps/web/src/components/todos/todo-workspace.tsx` | Todo 목록·입력·상태 표시 |
| `apps/web/src/app/todos/page.tsx` | Todo 페이지 진입 |
| `apps/web/src/components/chat/chat-workspace.tsx` | 메시지·스트림·오류·중단 UI |
| `apps/web/src/app/ai/page.tsx` | AI 페이지 진입 |
| `apps/server/src/routes/ai.ts` | 세션·입력·한도·스트림 요청 경계 |
| `apps/server/src/lib/ai-provider.ts` | 모의·Google provider 선택과 스트림 생성 |
| `apps/server/src/lib/ai-limits.ts` | 제한값·UTC 일자·호출 예약 |
| `scripts/verify-api.mjs` | 격리된 테스트 환경에서 HTTP 검증 실행 |
| `scripts/http-smoke.mjs` | 실제 HTTP 인증·Todo·AI 응답 단언 |
| `scripts/tests/ai-limits.test.mjs` | 직접 호출 가능한 단위 테스트가 필요할 때 사용하는 Node 테스트 |

## 3. 본문의 한 실습 형식

모든 작은 실습에 `07-03` 같은 고유 ID를 붙인다. 장 전체가 아닌 실습 단위로 재개한다.

```markdown
### 07-03. 내 할 일 목록 조회하기

**목표:** 로그인한 계정의 Todo만 조회합니다.
**먼저 이해하기:** 로그인 여부와 데이터 소유권 검사는 서로 다릅니다.
**시작 조건:** 07-02 완료, 웹·API·DB 실행 중.
**입력 위치:** Codex 또는 Claude Code 대화창.
**작업 폴더:** 생성한 better-tasks-lab 루트.

복사용 프롬프트 → 사용할 스킬 → 생성·변경 파일 설명 → 직접 확인 순서.

**기대 결과:** A 계정에서 만든 Todo가 B 계정의 목록에 나오지 않습니다.
**실패 시:** 로그인 쿠키와 목록 조회의 userId 조건을 확인하는 복구 절로 이동합니다.
**기록:** 변경한 용어·API 매핑과 다음 실습 ID를 기록합니다.
```

위 블록은 편집 형식의 예다. 완성 본문에는 “복사용 프롬프트” 자리에 실제 프롬프트 전문과 실행 명령을 넣는다. 모든 실습에 억지로 스킬 호출을 추가하지 않는다. 필요한 스킬이 없는 명령 실습은 `별도 스킬 호출 없음`이라고 안내하고, 설치된 기능을 모르는 상태에서는 일반 프롬프트 대안을 제공한다.

---

## 작업 1. 검증 가능한 생성 기준과 첫 실행 만들기

**Files:** `.work/better-tasks-reference/`, `verification/versions.json`, `verification/file-map.md`, `verification/results.md`, `01-environment.md`, `02-scaffold.md`, `03-first-run.md`.

**Interfaces:** 입력은 승인 스택과 기존 조사 자료다. 출력은 실제 생성 옵션, 버전, 웹·API 포트, 환경변수 파일, 실행 scripts와 초기 동작 기록이다. 이후 작업은 `file-map.md`의 실측 경로를 기준으로 한다.

- [x] **1.1 도구 상태 확인.** `node --version`, `pnpm --version`, `git --version`, `docker version`, `docker compose version`을 각각 실행하고 설치 유무와 Docker daemon 접근 여부를 기록한다. 설치되지 않은 도구가 있으면 지원되는 설치 경로를 확인하되 기존 버전을 임의로 교체하지 않는다.
- [x] **1.2 고정 CLI 계약 확인.** `npx -y create-better-t-stack@3.44.0 --help`의 실제 출력으로 아래 생성 옵션을 대조한다. CLI에 `--yes`를 추가하지 않는다. 명령은 이 계획에서 아직 실행 검증되지 않은 후보임을 유지한다.

```bash
npx -y create-better-t-stack@3.44.0 better-tasks-lab \
  --frontend next --backend hono --runtime node \
  --database postgres --orm drizzle --api trpc \
  --auth better-auth --payments none \
  --addons turborepo biome --examples none \
  --db-setup docker --web-deploy none --server-deploy none \
  --package-manager pnpm --no-install --no-git --disable-analytics
```

- [x] **1.3 별도 빈 폴더에서 생성.** 대상 디렉터리가 없는지 확인한 뒤 생성하고, `package.json`, `bts.jsonc`, workspace manifest, `.env.schema` 또는 `.env.example`, Docker Compose 설정을 읽는다. 이미 있는 폴더는 덮어쓰지 않는다.
- [x] **1.4 의존성 설치와 기준 기록.** `pnpm install`을 실행한다. 생성기 버전과 설치된 패키지 버전을 구분해 기록하고 lockfile을 보존한다. 실패 시 로그의 직접 원인을 확인해 같은 승인 스택 안에서 해결한다. 생성기 후보 변경이 필요하면 이유와 새 실측 결과를 기록한다.
- [x] **1.5 로컬 DB와 환경 설정.** 생성된 Compose의 프로젝트 이름·볼륨·포트를 확인한다. 테스트·학습 DB는 이 앱 전용으로 사용한다. 5432가 점유되어 있으면 기존 컨테이너를 중지하지 않고 새 포트와 연결 문자열을 함께 설정한다. secret은 `openssl rand -hex 32`로 생성한다.
- [x] **1.6 초기 마이그레이션과 실행.** 실제 scripts로 DB 준비 후 웹·API를 실행한다. 홈, 연결 상태, 로그인 진입 화면을 확인한다. DB·웹·서버 중 하나를 중지했을 때의 증상을 구분해 기록한다.
- [x] **1.7 작은 실습으로 작성.** 01장은 터미널·Git·Node·pnpm·Docker·에이전트 준비를 각각 나눈다. 02장은 폴더→생성→옵션 해설→설치→폴더 읽기, 03장은 환경변수→DB→API→웹→실패 확인으로 나눈다.
- [x] **1.8 회귀 조건 확인.** 두 번째 터미널에서 앱 경로를 다시 찾아 동일한 scripts를 실행할 수 있는지 확인한다. 가이드 경로에 공백을 포함한 복사본으로 경로 설정 안내를 검증한다.

**통과 기준:** 실제 첫 실행 근거와 버전·파일·명령 매핑이 있고, 학습 앱과 기존 프로세스·DB를 구분한다. Docker가 없거나 시작할 수 없어 DB 동작을 확인하지 못하면 해당 검증은 미완료로 남긴다.

## 작업 2. 기준 코드와 단계별 비교 경로 확보

**Files:** `reference/base/`, `reference/patches/`, `reference/checkpoints.json`, `reference/README.md`.

**Interfaces:** 작업 1의 생성물을 소비한다. 출력은 깨끗한 시작 스냅샷과 순서가 지정된 패치다. 새로운 패치는 해당 기능을 검증한 작업이 끝날 때마다 추가한다.

- [x] **2.1 기준 앱 내부에만 Git 이력 생성.** `.gitignore`에서 `.env`, 캐시, 의존성, DB 볼륨 제외를 확인하고 기준 앱 루트에서 `git init` 후 파일을 명시적으로 stage한다. 커밋 작성자 설정이 없으면 전역 설정을 바꾸지 않고 커밋 불가 사유를 기록한다.
- [x] **2.2 초기 소스를 보관.** 생성·초기 설치가 확인된 파일만 `reference/base/`에 복사한다. 프로젝트 이름·workspace namespace·lockfile을 유지한다. `.env.example`에는 가짜 값과 입력 위치만 담는다.
- [x] **2.3 패치 계약 작성.** `checkpoints.json`은 `id`, `previous`, `patch`, `sha256`, `checks` 필드를 사용한다. 시작 단계는 `base`; 이후 단계는 `05-auth`, `06-todo-ui`, `07-todo-api`, `08-dashboard`, `09-ai-ui`, `10-ai`, `13-filter`다. 해당 패치가 실제로 생긴 뒤에만 항목을 추가한다.
- [x] **2.4 기준 폴더 준비 안내 작성.** 독자가 수정 중인 앱에 덮어쓰지 않도록 별도의 빈 디렉터리로 기준 코드를 복사하는 예시를 제공한다. `TUTORIAL_ROOT`는 가이드 위치, `REFERENCE_ROOT`는 비교 앱 위치로 구분한다.
- [x] **2.5 패치 검사 후 적용.** 순서를 지킨 예시를 제공한다. 파일이 이미 수정되었거나 선행 단계가 없으면 검사를 통과하지 못하므로 적용하지 않는다.

```bash
git apply --check "$TUTORIAL_ROOT/reference/patches/05-auth.patch"
git apply "$TUTORIAL_ROOT/reference/patches/05-auth.patch"
pnpm install --frozen-lockfile
```

- [x] **2.6 재적용 실패 확인.** 일회용 기준 복사본에 같은 패치를 두 번 검사해 두 번째가 실패하는지 확인한다. 패치 대상 줄을 수정한 복사본에도 `--check`가 실패하고 작업 파일이 바뀌지 않는지 확인한다.
- [x] **2.7 비교 방법 설명.** 완성 코드를 복사하는 대신 자신의 파일과 해당 단계의 파일을 비교하는 방법, 환경변수는 직접 설정해야 하는 이유, 다음 단계 패치를 먼저 적용하면 안 되는 이유를 설명한다.

**통과 기준:** 기준 코드를 학습 앱과 별개로 재구성할 수 있고, 잘못된 패치 적용 시 수정 전에 멈춘다. 패치 명령의 성공과 앱의 동작 검증을 구분한다.

## 작업 3. 프로젝트 문서·규칙·스킬 준비

**Files:** `04-docs-and-skills.md`, `templates/AGENTS.md`, `templates/CLAUDE.md`, `templates/docs/domain/glossary.md`, `templates/docs/domain/project.md`, `templates/docs/TASKS.md`, `appendices/skills-and-plugins.md`.

**Interfaces:** 작업 1의 실제 스택·경로와 조사 보고서를 소비한다. 후속 기능 프롬프트는 두 필수 문서와 진행표의 경로를 일관되게 사용한다.

- [x] **3.1 용어집 작성.** 승인된 9개 범주에 한글·영문·정의·코드 매핑·적용 상태 열을 둔다. Todo, Session, Ownership, Stream, Quota는 서로 혼동하지 않도록 예시를 포함한다. 아직 없는 테이블은 `예정`으로 표시한다.
- [x] **3.2 개관 작성.** 한 줄 요약·사용자·핵심 가치·방문자/사용자 흐름·운영자 흐름·스택·URL·모델·C01~C09·설계 원칙·범위 밖 항목을 채운다. 관리자 UI와 대화 영구 저장이 없다는 사실을 명시한다.
- [x] **3.3 규칙 작성.** 아래 최소 규칙을 `AGENTS.md`에 넣고 도구별 설치·발견 경로는 공식 자료와 실제 환경에서 확인한다. `CLAUDE.md`에는 동일 규칙 전체를 복제하지 않는다.

```text
작업을 시작하기 전에 docs/domain/project.md와 docs/domain/glossary.md를 읽는다.
현재 실습 ID와 완료 조건을 docs/TASKS.md에서 확인한다.
이번 프롬프트가 요청한 작은 실습 하나만 수행한다.
인증·ORM·API·상태 관리 도구를 스킬 예제에 맞춰 바꾸지 않는다.
동작을 검증한 뒤 용어·테이블·경로·권한·capability 변경을 두 문서에 반영한다.
문서 변경이 없으면 그 이유와 검사 결과를 docs/TASKS.md에 기록한다.
다음 실습을 자동으로 시작하지 않고 이번 실습 결과를 설명한다.
```

- [x] **3.4 설치 블록 작성.** 기존 스킬 조회→제공 스킬 조회→선택 설치→발견 확인 순서로 작성한다. Vercel React·UI 검수, PostgreSQL 스킬을 먼저 다루고 Supabase·전체 키트는 선택 과정으로 표시한다. 이 작성 환경의 전역 설치를 독자에게 전제하지 않는다.
- [x] **3.5 도구별 블록 확인.** Codex와 Claude의 스킬 호출 문법을 각각 표시한다. 일반 프롬프트 대안을 제공하고, 터미널에 스킬 호출 문자열을 넣지 않도록 입력 위치를 강조한다.
- [x] **3.6 읽기 프롬프트 작성.** 독자가 두 문서를 복사한 뒤 에이전트에 서비스 요약·9개 역량·범위 밖 항목을 설명하도록 요청하는 완전한 프롬프트를 제공한다. 코드를 만들라는 요청은 포함하지 않는다.
- [x] **3.7 문서 갱신 연습.** ‘할 일’을 Todo로 일관되게 사용하는 예시와, 기능이 없는데 완료로 표시하지 않는 예시를 넣는다. `photo_requests`·`order_items`가 이 앱의 실제 모델로 남지 않았는지 검색한다.

**통과 기준:** 두 필수 문서가 내용이 채워진 템플릿으로 존재하고, 복사·확인·갱신까지 독자가 직접 할 수 있다. 스킬 설치 후보와 실제 설치 검증 결과를 구분한다.

## 작업 4. 인증과 보호 경계를 강의로 만들기

**Files:** `05-authentication.md`, 기준 앱의 생성된 인증 설정·보호 페이지·서버 세션 컨텍스트, `scripts/http-smoke.mjs`, `reference/patches/05-auth.patch`.

**Interfaces:** 생성된 Better Auth 설정을 유지한다. HTTP 검사는 가입·로그인 응답의 쿠키를 계정별로 보관하고, 이후 API 호출에 정확히 전달한다. 브라우저 확인도 별도로 수행한다.

- [x] **4.1 인증 흐름 읽기.** 생성된 가입·로그인·로그아웃·세션 조회 코드를 따라 실제 파일과 URL을 `file-map.md`에 기록한다.
- [x] **4.2 5개 실습 작성.** 회원가입→로그인 실패→세션 유지→로그아웃→보호 화면·API 접근을 각각 나누어 프롬프트·브라우저 행동·기대 결과를 제공한다.
- [x] **4.3 서버 거절 검증.** 로그인하지 않은 보호 API 요청이 실패하는 검사를 먼저 실행한다. 화면 메뉴를 숨기는 것만으로 통과시키지 않는다. 로그아웃 후 과거 쿠키로 접근해도 거절하는지 확인한다.
- [x] **4.4 쿠키·CORS 설명.** 웹·API origin, credentials, trusted origins, HTTP·HTTPS 쿠키 옵션의 역할을 생성 설정과 연결해 설명한다. `localhost`와 `127.0.0.1`을 섞은 경우를 오류 복구 예시로 둔다.
- [x] **4.5 입력 실패 확인.** 잘못된 이메일·짧은 비밀번호·중복 가입의 실제 응답을 기록하고 입력값이 이유 없이 사라지지 않는지 확인한다. 비밀번호를 로그에 남기지 않는다.
- [x] **4.6 검증 후 단계 보관.** 타입·관련 HTTP 검사·브라우저 흐름을 확인하고 인증 용어·경로·C02/C03 상태를 갱신한 뒤 패치를 생성한다.

**통과 기준:** 화면과 API의 보호 경계를 독자가 각각 확인하고, 쿠키가 왜 필요한지 코드·요청·동작으로 설명할 수 있다.

## 작업 5. Todo 샘플 화면을 작은 실습으로 작성

**Files:** `06-todo-ui.md`, 기준 앱 `apps/web/src/components/todos/todo-workspace.tsx`, `apps/web/src/app/todos/page.tsx`, `reference/patches/06-todo-ui.patch`.

**Interfaces:** UI의 데이터 계약은 `Todo { id: string; title: string; completed: boolean; createdAt: string; updatedAt: string }`다. HTTP JSON 경계의 시각은 ISO 문자열로 맞춘다. DB 필드는 실제 드라이버 매핑을 확인해 일관되게 변환한다.

- [x] **5.1 정적 목록 구현 프롬프트 작성.** 가상 Todo 3개를 표시하고 `샘플 화면 · 아직 DB에 저장되지 않습니다`를 노출한다.
- [x] **5.2 입력 폼 실습 작성.** 제목 입력·등록·빈 값·공백만 있는 값·등록 중 상태를 순서대로 다룬다. 본문 예제 제목 상한은 200자로 정하고 API와 공유한다.
- [x] **5.3 수정·완료·삭제 실습 작성.** 세 동작을 각각 별도 실습과 프롬프트로 나눈다. 버튼을 누르면 어떤 상태가 바뀌는지 설명한다.
- [x] **5.4 실패 상태 만들기.** 빈 목록, 로딩, 실패 후 다시 시도, 긴 제목, 모바일 폭을 실제 화면에서 확인한다. 샘플 오류와 실제 서버 오류를 구분한다.
- [x] **5.5 UI 검수 실행.** 기존 Vercel React·UI 검수 스킬을 해당 작업에 한정해 사용하고 키보드·레이블·포커스를 확인한다.
- [x] **5.6 기준과 문서 갱신.** 아직 C04가 DB까지 완성되지 않았다는 상태를 개관에 기록하고 검증한 화면과 패치를 저장한다.

**통과 기준:** 독자가 화면 상태를 직접 조작할 수 있고 샘플 데이터의 한계를 이해한다. DB 연결을 먼저 해야만 UI 장을 진행할 수 있게 만들지 않는다.

## 작업 6. Todo 저장·CRUD·소유권 검증 만들기

**Files:** `07-todo-api.md`, 기준 앱 `packages/db/src/schema/todo.ts`, `packages/api/src/routers/todo.ts`, 실제 라우터·스키마 export 파일, `scripts/verify-api.mjs`, `scripts/http-smoke.mjs`, `reference/patches/07-todo-api.patch`.

**Interfaces:** 제안 라우터 계약은 `todo.list`, `todo.create({title})`, `todo.update({id,title})`, `todo.setCompleted({id,completed})`, `todo.remove({id})`, `todo.stats`다. `stats`는 `{total,completed,remaining}`을 반환한다. `userId`는 클라이언트 입력으로 받지 않고 세션에서 얻는다. 타인 또는 존재하지 않는 ID는 동일한 `NOT_FOUND`, 미인증은 `UNAUTHORIZED`, 잘못된 입력은 `BAD_REQUEST`로 처리한다.

- [x] **6.1 스키마 설명·마이그레이션 실습 작성.** Todo→인증 사용자 외래 키, 사용자별 조회 인덱스, 기본값, snake_case/camelCase 매핑을 설명한다. PostgreSQL 스킬을 읽고 실제 생성 schema의 ID 타입을 먼저 확인한다.
- [x] **6.2 검증 환경 격리.** 학습 DB와 구분한 일회용 PostgreSQL 컨테이너·랜덤 포트·고유 Compose 프로젝트에서 검사한다. 생성한 컨테이너 ID만 종료·정리하며 실패 중에도 기존 DB를 건드리지 않는다.
- [x] **6.3 실패 검사를 먼저 준비.** Node 표준 `assert/strict`로 아래 동작을 실제 HTTP 요청 결과에 대조하는 검사를 작성한다. 아직 API가 없으면 검사가 실패하는 것을 확인한다.

```javascript
import assert from 'node:assert/strict';

export function assertTodoIsolation({
  created, accountBTodos, foreignUpdateError, foreignDeleteError,
  afterUnauthorizedChange, stats,
}) {
  assert.equal(created.title, '첫 번째 실습');
  assert.equal(created.completed, false);
  assert.deepEqual(accountBTodos, []);
  assert.equal(foreignUpdateError.code, 'NOT_FOUND');
  assert.equal(foreignDeleteError.code, 'NOT_FOUND');
  assert.equal(afterUnauthorizedChange.title, '첫 번째 실습');
  assert.deepEqual(stats, { total: 3, completed: 1, remaining: 2 });
}
```

위 변수는 실제 HTTP 응답에서 얻은 값이어야 한다. 상수를 넣어 통과시키지 않는다. tRPC 응답의 실제 직렬화 형태는 생성 client·adapter를 읽고 처리한다.

- [x] **6.4 목록 API 실습 작성·구현.** 사용자의 Todo만 조회하고 안정적인 정렬을 사용한다. A·B 계정의 목록 격리를 검사한다.
- [x] **6.5 등록 API 실습 작성·구현.** 제목을 trim하고 1~200자만 허용한다. 임의의 `userId`를 보낸 요청이 다른 사용자 소유 행을 만들 수 없는지 검사한다.
- [x] **6.6 수정·완료 API 각각 구현.** ID와 세션 사용자 조건을 함께 적용한다. A의 ID를 B가 요청한 경우와 존재하지 않는 ID의 응답을 비교한다.
- [x] **6.7 삭제 API 실습 작성·구현.** 삭제 전후 목록·집계를 확인하고 타인 ID로 삭제할 수 없는지 검사한다.
- [x] **6.8 재시작·지속성 확인.** 새로고침뿐 아니라 API를 재시작한 뒤에도 저장 결과가 남는지 확인한다.
- [x] **6.9 문서·패치 갱신.** 실제 테이블·필드·프로시저명을 용어집과 개관에 반영하고 각 API를 따로 요청하는 프롬프트를 넣는다.

**통과 기준:** 두 계정 격리와 입력 검사를 포함한 CRUD가 실제 PostgreSQL에서 통과한다. ID를 알아냈다는 이유로 타인 데이터에 접근할 수 없다.

## 작업 7. 실제 화면 연결과 대시보드 완성

**Files:** `08-dashboard.md`, 기준 앱 Todo UI·생성된 dashboard 페이지, `reference/patches/08-dashboard.patch`.

**Interfaces:** 작업 6의 프로시저와 DTO를 소비한다. 화면 입력 필드나 조회 라이브러리를 다른 방식으로 바꾸지 않는다.

- [x] **7.1 목록 연결 실습.** 샘플 목록을 실제 query로 바꾸고 로딩·실패·빈 목록을 재확인한다.
- [x] **7.2 등록 연결 실습.** mutation 성공 후 목록·집계를 갱신한다. 실패하면 입력값을 유지하고 오류를 표시한다.
- [x] **7.3 수정·완료·삭제 연결.** 세 작업 각각에 프롬프트와 브라우저 확인 절차를 제공한다. 중복 클릭 중 UI 상태와 서버 결과를 확인한다.
- [x] **7.4 대시보드 실습.** 직접 만든 Todo 3개 중 1개 완료 시 전체 3·완료 1·남은 2를 표시한다. 다른 계정은 0·0·0인지 확인한다.
- [x] **7.5 브라우저 흐름 검증.** 로그인→등록→수정→완료→삭제→새로고침→로그아웃을 실제로 수행한다. 각 단계의 예상 숫자를 본문에 기록한다.
- [x] **7.6 샘플 제거·기록.** 실제 저장으로 바뀐 화면에서 샘플 표시를 제거하고 C04~C06 근거와 패치를 저장한다.

**통과 기준:** 독자가 브라우저에서 수행한 변경과 DB·목록·대시보드 결과가 일치하며, 실패 입력을 다시 작성할 필요가 없다.

## 작업 8. 키 없이 AI UI와 스트림 수명주기 검증

**Files:** `09-ai-ui.md`, 기준 앱 AI 화면·route·provider 파일, `reference/patches/09-ai-ui.patch`.

**Interfaces:** `AI_PROVIDER=mock|google`로 실행 모드를 명시한다. `mock`은 개발·테스트 환경에서만 허용하고 production에서 명시적으로 거절한다. 실제 스트림 프로토콜·client 함수는 검증한 AI SDK 버전의 공식 문서를 사용한다.

- [x] **8.1 SDK 계약 확인.** 설치할 직접 의존성·client/server 스트림 프로토콜·중단 방법·출력 제한 필드명을 공식 문서로 확인하고 버전을 고정한다. SDK 버전이 다른 예제를 합치지 않는다.
- [x] **8.2 모의 provider 구현.** 실제 provider 비용 없이 고정 텍스트를 여러 조각으로 반환한다. 외부 네트워크를 호출하지 않으며 화면에 모의 모드를 표시한다.
- [x] **8.3 메시지 표시 실습.** 입력→전송 중→스트리밍→완료 상태를 각각 설명하고 프롬프트를 나눈다.
- [x] **8.4 중단 실습.** 응답 도중 중단 버튼을 누르면 client 요청을 중단하고 서버 provider 호출에도 취소 신호를 전달한다. 이미 받은 메시지와 중단 상태는 UI에서 구분한다.
- [x] **8.5 실패·재시도 실습.** 테스트 provider에서 첫 조각 전 실패와 일부 출력 후 실패를 재현한다. 입력·부분 응답을 보존하고 자동 재시도하지 않는다.
- [x] **8.6 새로고침·환경 확인.** 대화 영구 저장이 없음을 화면과 개관에 명시한다. production에서 mock을 선택한 설정이 거절되는 검사도 추가한다.
- [x] **8.7 근거 보관.** mock 성공을 실제 Google 응답으로 기록하지 않는다. 해당 화면·오류·중단 결과와 패치를 저장한다.

**통과 기준:** 키 없이 UI·중단·실패 상태를 검증할 수 있고, 모의 모드의 존재와 제한이 독자에게 드러난다.

## 작업 9. AI 인증·사용량·실제 provider 연결

**Files:** `10-ai-integration.md`, 기준 앱 AI route·provider·limits, `packages/db/src/schema/ai-usage.ts`, HTTP 검사, `reference/patches/10-ai.patch`.

**Interfaces:** 세션과 입력 검사를 통과한 요청만 사용량을 예약한다. 사용량 키는 `(user_id, utc_date)`다. 입력은 user/assistant 텍스트 메시지로 제한하고 client가 system 지침이나 임의 도구 호출을 주입하지 못하게 한다. 호출 한도는 비용의 절대 상한이 아니다.

- [x] **9.1 서버 검증 경계 작성.** 미로그인, 21개 메시지, 2,001자 텍스트, 잘못된 role, 잘못된 body를 각각 거절하고 provider 호출 수가 0인지 검사한다. 요청 전체 body 크기 제한도 별도로 설정·기록한다.
- [x] **9.2 DB 사용량 모델 구현.** 사용자·UTC 날짜 unique, 원자적 증가, 한도 조건을 갖춘다. 단순 SELECT 후 UPDATE 경쟁 조건을 만들지 않는다.
- [x] **9.3 한도 경합 검사 작성.** 새 사용자에게 동시 요청 21개를 보내 20개만 예약되는지, 19회 사용 후 동시 2개 요청에서 하나만 예약되는지 확인한다.

```javascript
import assert from 'node:assert/strict';

export function assertQuotaResults({
  acceptedRequests, rejectedRequests, providerInvocations,
  usageAfterProviderFailure, usageBeforeProviderFailure,
}) {
  assert.equal(acceptedRequests.length, 20);
  assert.equal(rejectedRequests.length, 1);
  assert.equal(providerInvocations, 20);
  assert.equal(usageAfterProviderFailure, usageBeforeProviderFailure + 1);
  assert.equal(new Date('2026-09-20T23:59:59Z').toISOString().slice(0, 10), '2026-09-20');
  assert.equal(new Date('2026-09-21T00:00:00Z').toISOString().slice(0, 10), '2026-09-21');
}
```

실제 예약 함수의 UTC 날짜를 테스트 시계로 제어해 경계 전후 서로 다른 행을 사용하는지도 검사한다. 위 날짜 문자열 검사만으로 DB 날짜 전환이 검증됐다고 주장하지 않는다.

- [x] **9.4 실패·중단 정책 검증.** provider 실패나 중단 이후에도 예약이 유지됨을 검사한다. 네트워크 자동 재시도 때문에 호출이 중복되지 않는지 확인한다.
- [x] **9.5 실제 연결 실습 작성.** Google 키 발급 위치·서버 환경변수·모델 선택·필수 계정 작업·응답 확인을 설명한다. 모델 이름·환경변수 이름은 검증 버전의 공식 자료로 확인한다. 키를 `NEXT_PUBLIC_*`에 넣지 않는다.
- [x] **9.6 실제 호출 여부 기록.** 사용 가능한 명시적 테스트 자격정보와 실행 권한이 있으면 최소 요청으로 확인한다. 없으면 실제 호출은 미검증으로 표시하고 모의 검증·실제 실행 가이드는 완성한다. 키를 찾아 다른 프로젝트에서 가져오지 않는다.
- [x] **9.7 문서·패치 갱신.** Quota·UTC day·reserved request 정의, 실패 시 차감 정책, 제한값, 실제/모의 실행 상태를 반영한다.

**통과 기준:** provider 이전에 인증·입력·한도 검사가 이뤄지고 동시성 검사가 통과한다. 실제 호출 성공은 실제 결과가 있을 때만 기록한다.

## 작업 10. 배포·문제 해결·재사용 실습 작성

**Files:** `11-verification.md`, `12-deployment.md`, `13-feature-cycle.md`, `troubleshooting.md`, `templates/skills/better-tasks-cycle/SKILL.md`, 부록 3개, `reference/patches/13-filter.patch`.

**Interfaces:** 기본 앱과 C01~C08의 검증 결과를 소비한다. 배포는 호스팅 DB·웹/API URL·인증 origin·secret·AI mode를 함께 설정한다. Supabase로 확장해도 Better Auth와 Drizzle 관리 기준을 유지한다.

- [x] **10.1 통합 검사 순서 작성.** DB 준비→API 검사→타입→린트→빌드→브라우저→문서 대조의 실제 명령과 실패 시 중단 조건을 정리한다. 자동 수정 명령과 읽기 전용 검사 명령을 구분한다.
- [x] **10.2 배포 경로 하나를 검증 기준으로 선정.** 승인된 스택을 유지하는 Vercel 배포 방식의 현재 공식 설정을 확인하고 정확한 명령·프로젝트 구조·DB 연결을 기재한다. 외부 배포를 자동 실행하는 것과 독자용 절차 작성은 구분한다.
- [x] **10.3 배포 후 체크 작성.** HTTPS URL에서 로그인 유지·보호 API·Todo 저장·집계·AI 제한을 확인한다. 키나 배포 계정이 없으면 실제 배포 검증만 미완료로 남긴다. 의존성 설치나 빌드 성공을 배포 성공으로 표현하지 않는다.
- [x] **10.4 문제 해결표 작성.** 잘못된 cwd, pnpm 미설치, Docker 미실행, 포트 충돌, DB 접속 실패, 환경변수 타입 오류, 쿠키 불일치, 401, 타인 ID 404, 429, AI 키 누락, 중단 상태, 패치 충돌을 각각 다룬다. 각 항목은 확인→원인별 수정→재검사 명령을 포함한다.
- [x] **10.5 필터 확장 실습.** 목록 필터 `all|active|completed`를 작업 카드→실패 검사→API·UI→재검사→문서 갱신으로 완성한다. 기본 3개 중 1개 완료 fixture에서 전체 3·남은 2·완료 1을 확인한다. B 계정 격리도 유지한다.
- [x] **10.6 프로젝트 스킬 작성.** 13장 전까지 독자가 배운 작업 주기를 `better-tasks-cycle` 스킬로 묶고 Codex·Claude 설치 위치·발견·호출·일반 프롬프트 대안을 제공한다. 호출 한 번이 여러 장을 건너뛰어 앱을 완성하도록 하지 않는다.
- [x] **10.7 비교 부록 작성.** fullstack-kit 채택 조건·호환 조정·중복 규칙 제거, 생성 예제를 쓰는 대체 출발점, 대화 영구 저장 확장의 데이터·소유권·삭제·실패 기준을 설명한다. 실제 구현되지 않은 부록 기능을 완성 목록에 올리지 않는다.

**통과 기준:** 로컬 완주와 외부 연동의 완료 기준이 분리되고, 독자가 같은 작은 개발 주기로 새 기능 하나를 완성할 수 있다.

## 작업 11. 도식·명령·프롬프트 전체를 학습 순서로 대조

**Files:** `assets/`, `diagrams.md`, `prompt-map.md`, `verification/commands.json`, `scripts/check-guide.mjs`, 문서 전반.

**Interfaces:** 각 실습 ID는 하나의 장·입력 위치·선행 조건·완료 결과와 연결된다. 도식은 문서·기준 코드와 같은 모델·경로·역할을 표현한다.

- [x] **11.1 도식 6종 제작.** 학습 지도, 웹/API/DB 구성, 사용자·운영자 흐름, Todo 소유권 요청, AI 검사·예약·스트림, 문서 갱신 주기를 Skillstead로 작성한다. 기존 갱신 주기 도식은 재사용한다.
- [x] **11.2 SVG·PNG 검증.** 설치된 `svg-infographic`의 source lint와 canonical renderer를 사용한다. 각 PNG를 전체·원본 해상도로 보고 한글·화살표·잘림을 확인한다. 도식별 실제 도구 버전과 결과를 기록한다.
- [x] **11.3 명령 대장 작성.** `commands.json`에는 각 블록의 `stepId`, `inputSurface`, `cwd`, `command`, `expected`, `status`, `evidence`를 기록한다. 상태는 `planned|static-checked|executed-pass|executed-fail|not-run-external` 중 하나다.
- [x] **11.4 문서 검사기 작성.** Node 표준 라이브러리로 로컬 링크·이미지·앵커·코드 펜스·실습 ID 중복을 검사한다. bash 블록은 `bash -n`을 통해 구문만 확인하고 실행 성공과 구분한다. 예시로 의도된 제외 용어를 단순 검색해 오류로 처리하지 않는다.
- [x] **11.5 전체 프롬프트 읽기.** 기능별 프롬프트마다 읽을 문서, 작업 범위, 스킬, 완료 기준, 기록, 다음 실습 자동 시작 금지가 들어 있는지 확인한다. 같은 작업을 사용자가 명령으로 했으면 에이전트에는 중복 실행 대신 확인만 요청하게 한다.
- [x] **11.6 첫 실행·재개 모의 진행.** 새 셸, 공백이 있는 가이드 경로, 이미 존재하는 앱 폴더, 이전 단계 미완료 상태에서 안내가 올바른 다음 행동을 제시하는지 확인한다.
- [x] **11.7 깨끗한 기준 복사본으로 순서 검증.** base에서 패치를 하나씩 적용하고 lockfile 설치·단계별 검사를 반복한다. 마지막 완성 상태만 검사하지 않는다.
- [x] **11.8 실제 에이전트 재현 범위 기록.** 사용 가능한 도구에서 Todo 목록 같은 작은 실습 하나를 새 대화로 수행해 프롬프트 의미를 확인한다. 로그인·도구 제한으로 실행하지 못하면 정적 검토만 수행했다고 기록한다. 모든 프롬프트를 새 세션에서 실행한 것처럼 쓰지 않는다.

검사 명령의 계약:

```bash
node scripts/check-guide.mjs
```

기대 결과는 오류 0개·종료 코드 0이다. 링크가 끊어진 임시 fixture에서는 0이 아닌 종료 코드를 내는지 검사한다. 산출물 원본에 일부러 결함을 남기지 않는다.

**통과 기준:** 실습 순서에 맞는 입력·파일·검증 연결이 있고, 명령·스킬·프롬프트를 어느 창에 넣는지 독자가 추측할 필요가 없다.

## 작업 12. 진입 문서·검증 보고서와 최종 검토

**Files:** `README.md`, `00-overview.md`, `verification/results.md`, `reference/README.md`, 이 계획의 체크박스.

**Interfaces:** 앞선 산출물과 실제 검사 기록을 소비한다. 최종 보고는 파일 존재, 정적 검증, 앱 실행, 실제 AI, 배포를 구분한다.

- [x] **12.1 첫 화면 작성.** 독자가 README에서 학습 결과·준비물·실행 위치·시작 장·완료 상태를 바로 찾도록 한다. 최종 코드 미리보기는 본문과 별도 선택 경로로 둔다.
- [x] **12.2 00장 완성.** 전체 기능과 원본 데모의 차이, 9개 capability, 가상 계정·로컬 범위, API 키와 배포가 필요한 구간을 설명한다.
- [x] **12.3 최종 결과표 작성.** 버전, OS, DB 실행 방식, 명령, 종료 코드, 브라우저 확인, 실제 AI·배포 유무, 알려진 제한을 기록한다. 테스트 데이터나 오류 로그에 비밀값이 없는지 검사한다.
- [x] **12.4 문서 의미 대조.** 용어집의 매핑과 실제 schema·route, 개관의 역량 상태와 테스트·화면, 도식의 역할·흐름이 일치하는지 검토한다.
- [x] **12.5 독립 최종 검토.** 구현에 참여하지 않은 검토자가 처음 읽는 독자 관점에서 선행 조건 누락·복사 불가 명령·한 프롬프트의 과도한 범위·허위 완료 주장·기준 코드 드리프트를 확인한다. 발견 사항은 근거와 함께 수정한다.
- [x] **12.6 필요한 검사만 재실행.** 문서 수정은 관련 정적 검사, 동작 수정은 해당 API·브라우저 검사와 영향받는 품질 검사를 다시 실행한다.
- [x] **12.7 인계.** README·프롬프트 지도·용어집·개관·기준 코드·검증 결과의 실제 파일 링크를 제공한다. 독자가 시작할 첫 실습을 명시하고 외부 연동 미검증 범위를 숨기지 않는다.

**통과 기준:** 요청된 강의형 본문·커맨드·프롬프트·스킬 안내·도식·필수 문서·기준 코드가 모두 있고, 결과 주장에 맞는 검증 근거를 제공한다. 남은 검증은 원인과 범위를 구체적으로 기록한다.

## 4. 실습 세분화의 최소 기준

| 장 | 독자가 따로 실행할 작은 실습 |
| --- | --- |
| 00 | 완성 목표 읽기 / 기본·확장 범위 확인 |
| 01 | 터미널 위치 / Git / Node / pnpm / Docker / 에이전트 준비 |
| 02 | 새 폴더 / 생성 명령 / 옵션 해설 / 설치 / 생성 구조 읽기 |
| 03 | 환경변수 / DB 실행 / 스키마 / API 실행 / 웹 실행 / 연결 실패 구분 |
| 04 | 용어집 복사 / 개관 복사 / 공통 규칙 / 도구별 지침 / 스킬 확인·설치 / 문서 읽기 요청 |
| 05 | 가입 / 로그인 실패 / 세션 / 로그아웃 / 보호 화면 / 보호 API |
| 06 | 목록 / 등록 폼 / 제목 수정 / 완료 변경 / 삭제 / 상태·접근성 |
| 07 | 스키마 / 마이그레이션 / 목록 / 등록 / 수정 / 완료 / 삭제 / 소유권 |
| 08 | 실제 목록 / 등록 연결 / 수정·완료·삭제 연결 / 캐시 / 대시보드 / 계정 전환 |
| 09 | 모의 모드 / 메시지 / 전송 / 스트림 / 중단 / 실패 / 새로고침 |
| 10 | 인증 / 입력 / 사용량 / 동시성 / 실제 키·모델 / 실제 호출 / 실패 처리 |
| 11 | API / 타입 / 린트 / 빌드 / 브라우저 / 문서 대조 / 재개 |
| 12 | DB 호스팅 / 웹·API 설정 / 환경변수 / 배포 / HTTPS 인증 / 실제 흐름 |
| 13 | 작업 카드 / 실패 검사 / 필터 구현 / 회귀 검사 / 문서 갱신 / 스킬로 반복 |

독자의 완료 조건은 “AI가 끝났다고 답함”이 아니다. 각 실습에 적힌 명령·화면·응답·DB 결과를 확인해야 한다.

## 5. 계획 자체 검토

| 승인 설계의 요구 | 담당 작업 |
| --- | --- |
| 한국어 강의형 설명·명령·프롬프트·스킬 | 작업 1·3~10·11, 공통 실습 형식 |
| Next.js·Hono·Drizzle·PostgreSQL·Better Auth | 작업 1·4·6 |
| 9개 capability | 작업 3~10·12 |
| 두 필수 문서와 반복 갱신 | 작업 3, 작업 4~10의 단계 패치, 작업 12 |
| Vercel·Supabase·내부 키트·외부 지침 비교 | 작업 3·10 |
| Skillstead 도식 | 작업 11 |
| 기준 코드·복구·재개 | 작업 2·10·11 |
| 버전 고정·정적 검사·실행 검증 | 작업 1·2·11·12 |
| 실제 AI·외부 배포 경계 | 작업 9·10·12 |
| 사용자 직접 단계별 실습 | 공통 실습 형식, 모든 장의 실습 세분화, 작업 11 |

계획에서 확정하는 것은 산출물·작업 순서·행동 계약·검증 기준이다. 생성기·SDK의 실제 파일·버전별 문법은 작업 1·8에서 근거를 확보한 뒤 본문에 확정한다. 이를 검증 없이 추측해 제품 코드를 계획에 고정하지 않는다.

## 6. 실행 방식 제안

**권장: Native.** 같은 세션에서 한 작성자가 기준 앱과 강의 문장을 함께 맞추고, 마지막에 독립 검토를 받는다. 각 장이 앞선 단계의 파일·데이터·용어에 의존하므로 일관성을 유지하기 좋다.

**대안: Subagent-driven.** 작업마다 새 구현 담당과 별도 검토 담당을 배정한다. 중간 검토가 촘촘하지만 각 담당자에게 생성물·진행 단계·문서 계약을 전달하는 비용이 추가된다.

어느 방식을 택해도 독자가 직접 진행하는 튜토리얼의 구성은 같다. 실행 방식 선택은 튜토리얼 제작 과정에만 적용한다.

## 실행 결과

완성 가이드, 검증 기록, 독립 검토와 수정을 확인한다. 후속 검토에서11.8의 독립 학습자 구현과 PostgreSQL18.6 컨테이너 검증을 수행했다. 스킬 설치도 고정 리비전으로 검증했다. 모든 모델의 동일 출력은 보장하지 않으며 실제 Google·Supabase·Vercel 외부 연동은 미검증이다. 이 제한을 포함해 문서 제작 작업을 인계한다.
