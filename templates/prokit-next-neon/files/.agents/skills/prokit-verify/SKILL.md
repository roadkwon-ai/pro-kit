---
name: prokit-verify
description: >-
  이 BTS 프로젝트에서 작업이 끝났다고 말하기 전, 또는 dev-cycle 대조표의 증거 칸을 채울 때 사용한다.
  어떤 검사를 돌릴지 고르고, 실행하고, 결과를 증거로 기록한다. 타입 검사, 린트, 빌드, 테스트, 2계정
  격리 테스트, next-dev-loop 런타임 확인, ego-browser 스크린샷, 리뷰 결과 기록을 다룬다. 검증해줘,
  확인해줘, 테스트 돌려, 잘 되는지 봐줘, 완료 처리, 증거 채워줘, 빌드 통과했으니 끝 같은 요청에
  사용한다. 기능 구현과 버그 수정 자체는 prokit-dev-cycle과 계층 스킬이, 코드와 보안 리뷰는 prokit-reviewer
  에이전트가 맡는다.
---

# 검증과 증거

원칙: **실행하지 않은 검사는 통과가 아니다.** 결과를 얻지 못했으면 `blocked: 사유` 또는 `미실행: 사유`로 적는다. `blocked`는 에이전트가 이번 세션에서 해소할 수 없는 원인(외부 DB·서비스, 권한, 개발 서버를 띄울 수 없는 환경, 도구 미설치·버전 미달, 리뷰어 응답 실패나 서브에이전트를 쓸 수 없는 환경)에 쓴다. 여기서 도구는 사용자 허락 없이 설치할 수 없는 전역 도구와 CLI다. 테스트 러너(vitest 도입 행)와 로컬 테스트 DB처럼 라운드 안에서 준비하게 되어 있는 것이 없다는 이유로는 blocked를 쓰지 않고, 그 준비부터 한다. `미실행`은 사용자가 범위에서 뺀 단계나, 앞 단계가 blocked여서 할 수 없는 뒤 단계에 쓴다. 다른 검사가 통과했다고 해서 실행하지 못한 검사를 통과로 합치지 않는다.

## 검사 고르기
명령은 `.dev-cycle.json`의 `commands`에 있다. 없는 키는 실행할 수 없는 검사다.

| 바뀐 것 | 최소 검사 |
|---|---|
| 모든 코드 | `commands.typecheck`, `commands.lint` |
| 화면과 라우트 | 모든 코드 검사 + `commands.build`, 런타임 확인, desktop과 mobile 스크린샷 |
| 프로시저와 인증 | 모든 코드 검사 + `commands.test`, **2계정 격리 테스트** |
| 스키마 | 모든 코드 검사 + 로컬 개발 DB에 `commands.dbMigrate` 적용 출력(병합 전에는 Neon 개발 브랜치에도). 사용자 소유 테이블이면 그 테이블을 쓰는 프로시저의 2계정 격리 테스트도(D 행) |
| 스킬, 에이전트, dev-cycle | `pnpm agents:check`, `pnpm skills:check`, `pnpm dev-cycle case`, `pnpm dev-cycle status`. 스킬 본문을 바꿨으면 skill-creator eval 재실행 |

여러 행에 해당하면 해당하는 행의 검사를 모두 한다.

`commands.lint`는 파일을 고치지 않는 검사(`pnpm exec biome check .`)다. `pnpm check`는 `--write`로 파일을 고치므로 검증 증거로 쓰지 않는다. 설치 절차에서 BTS가 만든 코드를 한 번 정리하고, 다시 생성되는 파일(마이그레이션, `schema/auth.ts`, varlock의 `src/env.ts`)은 `biome.json`에서 빼므로 전체 lint는 exit 0에서 시작한다. 전체 lint가 실패하면 이번 변경이 만든 지적으로 보고 고친다. 설치 뒤 정리를 하지 않아 기존 지적이 남은 프로젝트라면 이번에 바꾼 파일만 `pnpm exec biome check <파일들>`로 다시 검사해 그 결과를 증거로 적고, 전체 결과는 기준과 비교해 `전체 exit 1: 기존 지적 N건(기준과 같음)`처럼 함께 적는다. 기준 수는 라운드를 열 때 전체 lint를 한 번 돌려 블록 메모에 적어 둔다. 비교하려고 작업 트리를 `git stash`로 되돌리지 않는다. 이번 변경이 만든 지적은 고친다. 바꾼 파일에 원래 있던 지적(BTS가 만든 JSON 포맷 등)은 그대로 두고 기준과 같은 수인지만 적는다. 한꺼번에 고치면 변경과 무관한 diff가 섞인다.

## 런타임과 브라우저
- `pnpm dev`(web은 포트 3001)를 띄우고, `next-dev-loop` 스킬의 `/_next/mcp` 절차로 Next 진단을 본다. ego-browser를 쓸 때는 next-dev-loop의 agent-browser 요구 사항, preflight 1단계(agent-browser 열기), 종료 절차를 건너뛰고 `/_next/mcp` 확인과 도구만 쓴다. `get_errors`·`get_page_metadata`에 필요한 브라우저 세션은 ego-browser로 연 페이지가 채운다. 이 경우 agent-browser가 없는 것은 blocked 사유가 아니다. Next.js 16.3 이상(Turbopack)이 필요하다. 못 맞추면 `blocked: next-dev-loop 요구 미달(Next 16.2)`처럼 적는다. 업그레이드는 사용자가 요청할 때만 한다.
- 실제 화면은 **ego-browser**로 확인한다. 절차는 [references/browser.md](references/browser.md).
- `ego-browser` 명령이 없거나(macOS 외, CI, Codex 샌드박스) 창을 띄울 수 없으면 `agent-browser`와 `next-dev-loop`의 브라우저 절차로 바꾸고, 증거에 `대안: agent-browser (ego-browser 없음)` 또는 `대안: agent-browser (ego-browser 창 표시 불가)`를 적는다. 기록 없이 도구를 바꾸지 않는다. 둘 다 쓸 수 없으면 `blocked: 브라우저 도구 없음(ego-browser·agent-browser)` 또는 `blocked: ego-browser 창 표시 불가, agent-browser 없음`. Linux·WSL에서 agent-browser의 Chrome이 `error while loading shared libraries`로 뜨지 않으면 사용자에게 `agent-browser install --with-deps`(sudo)를 요청하고, 그 전까지는 `blocked: agent-browser Chrome 시스템 라이브러리 없음`으로 적는다.
- 스크린샷은 `tasks/evidence/<라운드 제목>/`에 저장하고 경로를 증거로 적는다. desktop(1440px)과 mobile(390px)을 함께 찍는다.
- Next MCP 진단(프레임워크의 시각)과 화면 확인(사용자의 시각)은 다른 증거다. 하나로 다른 하나를 대신하지 않는다.
- **오류 예산은 0이다.** 확인한 화면마다 브라우저 콘솔의 오류와 경고, 개발 오버레이의 Issues, `/_next/mcp`의 `get_errors`, 개발 서버 로그의 오류를 센다. 서버를 새로 띄운 뒤의 첫 로드도 본다. 느린 첫 컴파일 때만 나는 수화 오류가 있기 때문이다. 브라우저 확장이나 자동화 도구 탓으로 보이는 항목도 빼지 않는다. 깨끗한 프로필(agent-browser)에서 재현해 원인을 가르고, 사용자 브라우저(ego-browser)에서 보이면 고친다. 예를 들어 확장이 수화 전에 `<body>`에 넣는 속성은 `<body suppressHydrationWarning>`로 막는다. 고칠 수 없으면 `[confirm]` 보고에 알려진 문제로 적는다. 결함에서 빼는 것은 하나뿐이다. 시나리오가 일부러 보낸 요청(없는 주소, 권한 없는 호출)이 받은 4xx에 브라우저가 남기는 `Failed to load resource` 줄과 그 거절의 서버 로그다. 이것도 경로와 상태를 따로 적는다. F의 QA는 ego-browser와 agent-browser 양쪽에서 센다.

## 테스트 러너
- 테스트 러너가 없으면 첫 D·E 라운드나 서버·DB 코드를 고치는 C 라운드에서 vitest를 도입한다. 대조표에 `vitest 도입(최초 1회)` 행을 추가하고, 루트 `test` 스크립트와 `.dev-cycle.json`의 `commands.test`를 함께 등록한다. 절차는 `.agents/skills/prokit-api/references/ownership-test.md`에 있다.
- 격리 테스트는 개발·운영 DB가 아닌 전용 테스트 DB(`TEST_DATABASE_URL`: 로컬 컨테이너의 `<이름>_test`, 병합 전 확인은 Neon 테스트 브랜치)에서 돈다. `skipped`로 끝난 테스트는 통과가 아니다. 프로시저를 거치지 않고 SQL로 같은 조건을 흉내 낸 수동 확인도 격리 테스트를 대신하지 못한다. 격리 테스트는 프로시저를 두 계정의 세션으로 호출한다.

## 증거 적는 법
형식은 [references/evidence.md](references/evidence.md). 요약하면 다음과 같다.
- 명령: `pnpm check-types → exit 0`. 실패면 첫 오류 한 줄을 적는다.
- 테스트: `vitest todo.isolation → 3 passed`.
- 리뷰: `prokit-reviewer(code): approve, max=low, 지적 2 (반영 1, 기각 1: 재현 안 됨)`.
- 스킬 사용: `writing-plans → docs/superpowers/plans/…`. 대안을 썼으면 `대안: OMC plan (superpowers 없음)`. 외부 스킬을 읽었으면 적용한 규칙과 함께 적는다(`사용: supabase-postgres-best-practices(schema-data-types)`).
- 같은 명령을 여러 행이 요구하면(F의 타입·린트 행 등) 한 번 실행하고 뒤 행에는 `6행과 같음: pnpm check-types → exit 0`처럼 적는다. 그사이 코드가 바뀌었으면 다시 실행한다.
- `✓`, `ok`, `done`, `완료`만 적거나 공백을 뺀 4자 미만으로 적는 것은 증거가 아니다. 해당 없으면 `N/A: 사유`.
- 비밀값, 토큰, 연결 문자열, 실사용자 데이터는 증거에 복사하지 않는다.

## 완료 보고
완료 처리를 요청받으면 먼저 `pnpm dev-cycle audit`으로 남은 빈 칸을 확인해 사용자에게 보고한다. 이번 세션에서 실제로 실행한 검사 칸과, 원칙에 맞는 `blocked`·`N/A` 칸만 채운다. 하지 않은 작업(스펙, 구현, 리뷰 등)을 `blocked:`·`미실행:`으로 적어 audit을 넘기지 않는다. 사용자가 그 단계를 범위에서 빼겠다고 명시하면 `미실행: 사용자 요청으로 범위 제외(<날짜>)`로 적는다. 표 끝의 `[confirm]` 행은 예외다. 사용자가 확인한 내용과 날짜만 적고 N/A·blocked·미실행으로 채우지 않는다(`prokit-dev-cycle` 5절).

`pnpm dev-cycle audit`이 통과한 뒤에만 완료라고 말한다. audit은 `blocked:`·`미실행:` 칸도 채운 것으로 보므로, 그런 행이 있으면 "부분 완료(blocked N건, 미실행 M건)"로 보고한다. 보고에는 실행한 검사와 결과, 실행하지 못한 검사와 이유를 넣는다. superpowers `verification-before-completion`이 있으면 함께 따른다.
