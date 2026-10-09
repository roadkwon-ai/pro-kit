# 증거 형식

대조표의 증거 칸은 다음 사람이 같은 결과를 다시 확인할 수 있을 만큼 구체적이어야 한다. 한 칸에는 한 줄로 적고, 길면 `tasks/evidence/<라운드 제목>/`에 파일로 두고 경로를 적는다.

| 종류 | 형식 | 예 |
|---|---|---|
| 명령 | `<명령> → exit <코드>[, 첫 오류]` | `pnpm check-types → exit 0` |
| 테스트 | `<러너> <대상> → <n> passed[, <m> failed]` | `vitest todo.isolation → 3 passed` |
| 마이그레이션 | `<로컬 호스트:포트 또는 Neon 브랜치> ← <마이그레이션> 적용 → <요약>` | `localhost:5433 ← 20261001_add_due_at 적용 → ok`, `dev/todo-due ← 20261001_add_due_at 적용 → ok` |
| 런타임 | `next-dev-loop <경로> → <관찰>` | `next-dev-loop /todos → 200, 콘솔 오류 0` |
| 오류 예산 | `<경로>: 콘솔 <n>, 오버레이 Issues <n>, get_errors <n>, 서버 로그 <n>[, 의도한 <상태> <n>(<경로>)][, 알려진 문제 <n>]` (F QA는 ego-browser와 agent-browser를 따로) | `/todos: 콘솔 0, 오버레이 Issues 0, get_errors 0, 서버 로그 0 (ego·agent 모두)`, `/nope: 콘솔 0, 오버레이 Issues 0, get_errors 0, 서버 로그 0, 의도한 404 1(/nope)` |
| QA 시나리오 | `<시나리오 번호·이름> → 통과/실패(<관찰>)` | `S3 새로 고침 뒤 테마 유지 → 통과(다크)` |
| 스크린샷 | `<경로들>` | `tasks/evidence/todo-list/desktop.png, mobile.png` |
| 리뷰 | `prokit-reviewer(<focus>): <verdict>, max=<등급>, 지적 <n> (반영 <a>, 기각 <b>: 사유)` | `prokit-reviewer(db): approve, max=none, 지적 0` |
| UI 평가 | `critique <점수>, P0 <n>, P1 <n>` / `audit <점수>/20, 접근성 <점수>/4` | `audit 17/20, 접근성 4/4` |
| 스킬 사용 | `<스킬> → <산출물>` | `brainstorming → docs/superpowers/specs/2026-10-01-todo-due.md` |
| 외부 스킬 | `사용: <스킬>(<적용한 규칙>)` | `사용: vercel-react-best-practices(async-parallel), shadcn` |
| 대안 사용 | `대안: <스킬·도구> (<1순위> 없음) → <산출물>` | `대안: OMC plan (superpowers 없음) → .omc/plans/todo.md`, `대안: agent-browser (ego-browser 창 표시 불가) → tasks/evidence/todo-list/` |
| 사용자 확인 (`[confirm]` 행) | `<사용자가 확인한 내용>(<날짜>)` | `사용자가 /todos에서 마감일을 넣고 지난 항목 표시를 확인(2026-10-01)` |
| 해당 없음 | `N/A: <사유>` | `N/A: 스키마 변화 없음` |
| 막힘 | `blocked: <사유>` | `blocked: 브라우저 도구 없음(ego-browser·agent-browser)` |
| 미실행 | `미실행: <사유>` | `미실행: 사용자 요청으로 범위 제외(2026-10-01)`, `미실행: 3행이 blocked라 적용 불가` |

## 증거가 아닌 것
- `✓`, `✔`, `-`, `ok`, `done`, `todo`, `tbd`, `완료`처럼 형식만 채운 값, 또는 공백을 뺀 길이가 4자 미만인 값 (dev-cycle audit이 거부한다)
- 사유 없는 `N/A`
- `[confirm]` 행의 `N/A`·`PASS`·`blocked`·`미실행`·`대기` (dev-cycle audit이 거부한다)
- 실행하지 않은 검사를 다른 검사 결과로 대신한 것 (예: 빌드 통과를 격리 테스트 통과로 적기)
- `오류 0(…은 제외)`처럼 원인을 추정해 뺀 오류 수 (깨끗한 프로필로 원인을 가르고 고치거나 알려진 문제로 보고한다)
- `skipped`로 끝난 테스트
- 프로시저를 호출하지 않고 SQL로 조건을 흉내 낸 확인을 격리 테스트로 적은 것
- OMC나 OMX 모드의 "완료" 보고
