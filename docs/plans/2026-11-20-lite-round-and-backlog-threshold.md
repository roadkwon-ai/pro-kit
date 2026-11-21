# 작은 화면 변경 경량 경로와 백로그 문턱

- 상태: neon·supabase 템플릿에 구현했다. tts-pilot-app은 MG-17 L을 닫고 후속 H 반영에서 같은 화면을 재측정했다.
- 근거: tts-pilot-app 실사용 피드백(2026-11-20, `tasks/prokit-perf-log.md` MG-01~MG-18, v0.1.1..v0.1.2 커밋 이력)
- 사용자 결정(2026-11-20): A(경량 경로, D·F 포함), B(백로그 라운드 리뷰 제한), C(백로그 기록 문턱)를 반영한다. G(Main 직접 수정)는 경량 경로에서만 허용한다. E(반복 읽기 줄이기)는 하지 않는다.

## 문제

사용자 원문: "prokit 으로 진행하면서 사소한것도 다 감독하면서 처리하다보니 토큰소모가 너무 심하고 너무 과도하게 처리하는거같아"

1. 변경 크기와 상관없이 같은 B 대조표를 탄다.
   - MG-15는 클래스 한 줄 변경인데 16분이 걸렸다. ui-builder 188초/14회, 실행 확인 217초/33회(4폭 × 4상태), reviewer ui·code, critique A·B, 사용자 질문 3번을 거쳤다.
   - B 라운드 하나에 Agent 호출이 7~10회 든다.
2. 리뷰가 백로그를 끝없이 만든다.
   - MG-01부터 MG-18까지 거의 모든 라운드가 다음 MG를 낳았다. 백로그를 고치는 라운드에서도 critique A가 새로 채점하며 P2·P3를 더 낸다(MG-14의 출처는 "1024 간격 1px").
   - `tasks/todo.md`의 체크하지 않은 항목은 305개이고, 그중 미룬 지적이 236개다. 194개에는 심각도 표시가 없고, 실제로 쓰는 데 걸리는 P1·P2는 약 20건이다.
3. 실행 확인 범위가 변경 크기에 비례하지 않는다. 클래스 한 줄에도 묶음 10 뷰포트를 찍는다.
4. 라운드마다 사용자 질문이 3번 넘게 나온다([confirm]과 마무리 선택).

## 지금 구조(설계 입력)

- 케이스는 `docs/dev-workflow.md`의 `### <글자>` 블록이다. `parseWorkflow`가 읽고 `buildRows`가 행을 만든다. 글자는 대문자 하나라야 한다(`/^###\s+(공통|[A-Z])/`).
- `classify(files, config)`는 `.dev-cycle.json`의 `rules`로 계층(E·D·B)을 세어 A·B·D·E·F·H를 낸다. 파일 수나 줄 수는 보지 않는다.
- audit은 표 케이스 X와 diff 판정이 다르면 "케이스 상향 필요"를 낸다(`!["C","F"].includes(X) && ![X,"A"].includes(pathCase)`).
- 비슷한 선례: 문구만 라운드(v0.3.11 `copyOnlyProblem`). 행을 `N/A: 문구만`으로 두려면 diff가 `COPY_SOURCE`만이고 `prokit-reviewer(code)`가 `문구만: 확인`으로 판정해야 한다.
- Main 직접 수정 선례: 서브에이전트가 없는 호스트의 `degraded: Main 직접(<호스트>)`. 이 경우 fresh `prokit-reviewer(code)`를 받는다.
- 미룬 지적은 `prokit-dev-cycle` 5절 6번이 닫기 전에 `tasks/todo.md` 백로그로 옮긴다. 심각도 표시와 문턱 규칙은 없다.

## A. 경량 경로(새 케이스 L)

### 케이스

`docs/dev-workflow.md`에 `### L. 작은 화면 변경`을 더한다. B와 따로 둔 이유: 행 목록이 크게 달라서 `N/A`를 여러 행에 적게 하는 것보다 짧은 표가 Main 비용이 적다. 문구만 라운드도 L로 흡수할 수 있는지는 구현 때 판단한다(흡수하면 `copyOnlyProblem`과 `COPY_ROWS`를 걷어 낸다).

행 초안:

1. 구현 (위임: prokit-ui-builder. Main 직접 수정 예외는 아래 G) → 변경 파일 요약
2. [verify] 타입·린트·빌드 → 명령과 결과
3. [verify] 영향 범위 실행 확인 (prokit-runtime-checker. 바뀐 요소가 보이는 폭 1~2개와 상태 1~2개만. 묶음 capture는 찍지 않는다) → 확인한 폭·상태, 오류 예산 수
4. [review] prokit-reviewer(code) 한 번 (목표 해소와 회귀만 본다. 디자인 리뷰·감사·critique를 대신한다) → verdict, max_severity, `경량: 확인`
5. [confirm] 사용자 확인과 마무리 선택을 한 질문으로 → 사용자 답

빼는 것: 디자인 맥락·브리프·재사용 설계 행, 묶음 capture, 휴대폰 스크롤, 디자인 리뷰(critique A·B), 디자인 감사, 마감, 재확인, DESIGN.md 갱신.

### 판정과 audit

- 조건(모두 만족): 계층이 B 하나, 바뀐 파일 1~2개, 더하고 뺀 줄 합 30줄 이하, `packages/ui` 아래 파일 없음, 새 파일(특히 `page.tsx`·`layout.tsx`·새 경로) 없음, 의존성·설정 파일 없음. 수치는 `.dev-cycle.json`에 둘지 상수로 둘지 구현 때 정한다.
- `classify`가 조건을 만족하면 `liteOk: true`를 함께 낸다. `case` 명령은 B 판정일 때 "L로 열 수 있다"를 알린다.
- 표가 L인데 diff가 조건을 넘으면 audit이 "케이스 상향 필요: B"를 낸다. 상향 판정식에 L을 B의 가벼운 형태로 넣는다(L 표 + `pathCase` B + `liteOk` false → 상향).
- 4행 리뷰 증거에 `경량: 확인`이 있어야 받는다(리뷰어가 diff가 경량 조건에 맞고 새 흐름이 아님을 판정). `경량: 아님`이면 B로 상향하게 한다. 문구만의 판정 정규식을 재사용한다.

### D. 측정 범위

- 3행 문구와 `prokit-verify/references/browser.md`에 "경량 라운드는 바뀐 요소가 보이는 폭·상태만" 기본값을 적는다.
- B 정식 경로의 10 뷰포트 묶음은 그대로 둔다.

### F. 사용자 질문 합치기

- L의 [confirm]은 결과 확인과 마무리 선택(커밋만, 커밋·push 등)을 한 AskUserQuestion으로 묻는다. `prokit-dev-cycle` 5절과 템플릿 `CLAUDE.md`의 AskUserQuestion 항목에 L 예외를 적는다.

## G. Main 직접 수정(L에서만)

- L의 1행은 `위임: prokit-ui-builder(…)` 또는 `Main 직접: <바꾼 줄 요약>`을 받는다.
- `Main 직접`이면 4행 리뷰가 fresh `prokit-reviewer(code)`여야 한다(이어 쓴 리뷰어 거부). 기존 `degraded` 검사와 같은 방식으로 본다.
- 편집 훅(`edit-guard`)은 열린 L 라운드에서 Main의 화면 파일 편집을 막지 않는다. 지금 막는 규칙이 어디서 케이스를 보는지 구현 때 확인한다.
- `AGENTS.md`의 "메인은 구현을 직접 하지 않는다"와 `prokit-ui`·`delegation.md`에 L 예외를 적는다.

## B. 백로그 수정 라운드의 리뷰 범위

- 백로그 항목 하나를 고치는 라운드(표 제목이나 `--task`로 표시. 표시 방법은 구현 때 정한다)에서 리뷰어 판정은 둘이다: 그 항목이 해소됐는가, 새 회귀(P0·P1)가 생겼는가.
- 새로 찾은 P2 이하는 백로그에 올리지 않고 라운드 보고나 참고 파일에만 남긴다.
- 고칠 곳: `prokit-reviewer.md`의 지시 꼴, `impeccable-map.md`·`hallmark-map.md`·`none-map.md`의 재채점 안내(백로그 라운드는 새 채점을 하지 않는다), `prokit-dev-cycle` 5절.

## C. 백로그 기록 문턱

- `tasks/todo.md` 백로그에는 P1·P2(쓰는 데 실제로 걸리는 것)와 사용자가 요청한 항목만 올린다. 한 줄마다 심각도 표시(`[P1]`, `[P2]`, `[요청]`)를 붙인다.
- P3·관찰·"의견 듣고 정함"은 `docs/backlog-notes.md`(새 참고 파일)로 보낸다. 템플릿에 빈 파일을 둘지는 구현 때 정한다.
- 라운드 보고에 "미룬 지적: 백로그 n, 참고 m"을 적는다.
- 러너 검사(선택): `close` 때 dev-cycle 블록 밖에 새로 더한 백로그 줄에 심각도 표시가 없으면 경고한다.
- 고칠 곳: `prokit-dev-cycle` 5절 6번, `execution-efficiency.md`, 보고 꼴.

## 하지 않는 것(E)

- 압축 뒤에도 같은 세션의 읽기를 인정하는 것: 압축하면 스킬 내용이 맥락에서 빠지므로 읽은 근거가 약해진다. v0.3.11의 "압축 없이 이어 쓴 경우만" 규칙을 유지한다.
- 4행 `사용:` 표기를 러너가 자동으로 채우는 것: 증거가 자기 신고에서 기록 복사로 바뀌어 "읽고 따랐다"는 확인이 사라진다.

## 고칠 파일(예상)

- `templates/*/files/docs/dev-workflow.md`: L 블록
- `templates/*/files/scripts/dev-cycle.mjs`(공유): `classify`의 `liteOk`, 상향 판정, L 4행 `경량:` 판정, `Main 직접` 검사, edit-guard 예외, close의 심각도 경고(선택)
- `templates/*/files/.agents/skills/prokit-dev-cycle/SKILL.md`, `references/execution-efficiency.md`, `references/delegation.md`
- `templates/*/files/.agents/skills/prokit-ui/SKILL.md`와 `references/*-map.md`
- `templates/*/files/.agents/skills/prokit-verify/references/browser.md`
- `templates/*/files/.claude/agents/prokit-reviewer.md`
- `templates/*/files/AGENTS.md`·`CLAUDE.md` 템플릿 블록
- `templates/*/tests/`: 판정(조건 경계: 파일 3개, 31줄, packages/ui, 새 파일), 상향, `경량:` 판정, Main 직접 + fresh 리뷰, 심각도 경고
- `handbook/`(dev-cycle 케이스 표와 도식), `VERIFICATION.md`, `docs/blocks/` 공통 글이 케이스 목록을 담고 있으면 그곳도

## 검증

- 두 템플릿 테스트, 저장소 문서 테스트(handbook, edition, doc-values)
- 실제 Better-T-Stack 프로젝트에 설치해 L 라운드 하나를 열고 닫아 본다(`install.mjs`는 바뀌지 않으면 생략 가능)
- 반영한 프로젝트(tts-pilot-app)에서 클래스 한 줄 라운드의 시간·Agent 수를 MG-15(16분, Agent 7~10회)와 비교한다

## 구현 결정

1. 파일 수와 줄 수는 러너 상수로 둔다. 대조표·진행 계획, 실행 증거, 백로그 참고 기록은 변경 수에서 뺀다. 삭제·이름 변경·바이너리와 스테이징에만 남아 있는 변경도 확인한다.
2. B의 문구만 절차를 유지한다. L에서 범위를 넘으면 변경 계층에 맞는 정식 대조표로 올리고 기존 L 증거는 참고로 남긴다.
3. 백로그 라운드는 제목의 `백로그: <항목>`으로 표시한다. B의 디자인 채점은 생략하며 접근성 회귀 검사는 수행한다.
4. `docs/backlog-notes.md`는 필요할 때 만든다. `close`는 `tasks/todo.md`에서 백로그 제목 아래 새 미완료 항목에 `[P1]`, `[P2]`, `[요청]` 표시가 없으면 경고한다.
