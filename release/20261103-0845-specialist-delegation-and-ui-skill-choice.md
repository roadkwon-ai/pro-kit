# v0.3.5 — Specialist delegation and UI skill choice

- 날짜: 2026-11-03 08:45 (KST)
- 이전 버전: v0.3.4
- 전체 변경: https://github.com/roadkwon-ai/pro-kit/compare/v0.3.4...v0.3.5

## Features

- UI 스킬로 hallmark와 기본 AI를 고르고 프로젝트 중간에 바꿀 수 있게 함 (`dcf35e4`)
  - UI 스킬 카탈로그에 hallmark(Nutlope/hallmark)와 none(기본 AI)을 더함. --ui-skill은 여럿을 받고 첫 값을 주 UI 스킬로 봄
  - none은 Anthropic frontend-design을 설치하고 prokit-ui의 none-map.md와 게슈탈트 지침(gestalt.md)으로 디자인하고 디자인 리뷰 행에 게슈탈트 위반 수를 적음
  - 스킬마다 할 일은 references/<이름>-map.md 한 파일에 두고, 카탈로그의 모든 두뇌와 UI 스킬에 이 파일이 있는지 테스트가 봄
  - skills:setup이 스킬을 지울 때 그 스킬이 켠 훅을 .claude/settings.local.json과 .codex/hooks.json에서 뺌
  - 설치 뒤 안내는 매니페스트의 next를 읽고, OMX 검사는 두뇌 항목의 omx 값으로 봄
  - hallmark 렌더 검사는 따로 받은 puppeteer-core 폴더를 HALLMARK_PUPPETEER로 주고, 기준 커밋과 비교해 새 FAIL만 봄
  - UI 스킬을 바꿔도 PRODUCT.md, DESIGN.md, 브리프, 토큰을 그대로 쓰고 카탈로그에 없는 두뇌·UI 스킬을 더하는 법을 prokit-skills-manage에 적음
  - handbook, prokit-init, THIRD_PARTY_NOTICES와 두 템플릿 VERIFICATION.md를 맞춤
- F 라운드 계층별 위임과 계층 편집 경계, 훅 없는 호스트의 degraded를 더함 (`0792797`)
  - 구현 행의 N/A·blocked를 막을지는 그 행 문구에 적힌 계층 에이전트의 계층만 보고 정한다(화면만 바꾼 F에서 DB 구현 행을 N/A로 둘 수 없던 결함)
  - 계층 에이전트를 여럿 적은 행(F 구현 방식)은 diff에 든 계층마다 그 계층 에이전트에게 위임하라고 요구한다. 인증 파일은 서버 몫이다
  - 열린 라운드에서 계층 에이전트가 다른 계층 파일을 편집하면 edit-guard가 막는다
  - 훅 기록이 없는 라운드(훅을 설치하지 않는 호스트)는 degraded: Main 직접(<호스트>)를 받고, 코드·DB 리뷰를 요구한다
  - prokit-api-builder·prokit-db-builder 모델을 inherit로 바꾸고, 작은 변경도 Main이 직접 하지 않는다는 결정과 이유를 delegation.md에 적는다
- Codex와 Antigravity에서도 위임 기록과 Main 계층 편집 막기를 Claude Code와 같게 함 (`9fb0574`)
  - Codex 훅 입력의 agent_type(turn_id가 있는 입력)으로 서브에이전트 읽기·편집을 기록하고 Main의 apply_patch 계층 편집을 막음
  - Antigravity는 invoke_subagent의 TypeName을 .prokit/agent-sessions.jsonl에 적고, 다음에 시작한 서브에이전트 대화(세션 시작 훅이나 첫 도구 호출)를 그 이름에 묶음. 요청이 있는 대화는 Main으로 봄
  - Antigravity 쓰기 에이전트 정의에 실측한 도구 목록을 넣음(tools를 빼면 도구가 없어 파일을 쓰지 못했음)
  - .agents/hooks.json에 SessionStart(agent-start)를 더하고 편집 matcher에 write_file·edit_file, 읽기 matcher에 invoke_subagent를 더함
  - prokit-dev-cycle, delegation.md, handbook, AGENTS.md 갱신 반영 목록, VERIFICATION.md(세 도구 실측)를 맞춤
- 공식 스킬을 맡은 전문 에이전트에 위임하고 audit과 편집 훅으로 확인함 (`d39f094`)
  - 계층 수행자 prokit-ui-builder·prokit-api-builder·prokit-db-builder와 실행 확인 prokit-runtime-checker를 더함. prokit-implementer는 하네스와 계층 밖 일, prokit-reviewer는 focus별 공식 스킬을 맡음
  - 배치 정본 skills.manifest.json performers와 배치를 관리하는 prokit-skills-assign 스킬을 더함
  - audit은 그 행에서 위임한 에이전트의 기록만 셈(읽은 프로젝트 판 공식 스킬과 그 행에서 일한 기록)
  - 열린 라운드에서 Main이 Claude Code 편집 도구로 계층 코드를 고치면 edit-guard가 막고, 허락한 편집을 기록함
  - 계층 코드가 바뀐 라운드의 구현 행은 N/A·blocked로 둘 수 없음
  - agents:check가 performers와 에이전트 정의의 공식 스킬 표, prokit-* 연결 표를 양방향으로 대조함
  - UI 판은 Pro 전용 에이전트를 performers에서 뺌
  - handbook, 템플릿 README, delegation.md, 두뇌 문서, VERIFICATION.md를 맞춤

## Fixes

- 고르지 않은 UI 스킬의 전역 사본을 알리고 한글 제목 줄바꿈 규칙을 수행자와 리뷰어에 전함 (`77b809c`)
  - skills.manifest.json의 UI 스킬 항목에 userSkills·userTraces를 더해 고르지 않은 개인 스킬은 이 프로젝트에서 끄고 Codex 전역 사본은 경고함
  - prokit-ui 규칙과 prokit-reviewer ui focus에 한글 제목 word-break: keep-all을 더함
  - hallmark-map이 Codex에 맞지 않는 Harnesses 표 대신 대조표대로 위임하게 하고 .hallmark/salt·.gitignore를 커밋하라고 적음
  - Antigravity hallmark 라운드(12행, [confirm], close까지) 결과를 VERIFICATION.md에 기록
- Codex가 출력을 버린 스킬 읽기와 Antigravity 부분 읽기를 끝까지 읽은 것으로 세지 않음 (`e5707c2`)
  - 스킬 읽기 기록: 출력을 /dev/null로 버린 명령 조각의 SKILL.md 경로는 세지 않음(stderr만 버린 2>/dev/null은 셈)
  - Antigravity read_file의 EndLine이 파일 끝에 닿지 않은 SKILL.md 읽기를 부분 읽기로 남기고 audit이 경고함
  - VERIFICATION.md: UI 스킬 선택·전환을 Codex(hallmark)와 Antigravity(기본 AI) 실제 세션으로 다시 돌린 결과와 한계
- 디자인 리뷰·감사 행 문구에서 UI 스킬 이름을 빼고 기본 AI 파일 목록을 맞춤 (`77ef9bc`)
  - 디자인 리뷰·감사 행은 스킬 이름 대신 prokit-ui의 references/<주 UI 스킬>-map.md를 가리키고, dev-workflow.md에 UI 스킬 이름이 없는지 테스트가 봄
  - 기존 프로젝트 갱신 절차(AGENTS.md, handbook update-existing), licenses/PROKIT-SCOPE.md, handbook prokit-ui 참조 표, design-flow.md 링크에 none-map.md와 gestalt.md를 더함
  - audit-and-confirm, ui-flow, prokit-ui 리뷰 보고 항목에 기본 AI의 게슈탈트 위반 수를 적음
- 이름이나 포트로 골라 프로세스를 끄는 셸 명령을 훅이 막고 audit 안내의 겹친 에이전트 이름을 뺌 (`ee88f7e`)
  - 테스트 프로젝트 실측에서 prokit-runtime-checker가 pkill -f next-server로 같은 기기의 다른 저장소 개발 서버를 모두 끔
  - 새 PreToolUse 훅 dev-cycle shell-guard: Claude Code·Codex Bash의 pkill·killall과 pgrep·lsof 결과를 넘긴 kill을 exit 2로 막음. 설치기가 .claude/settings.json에, skills:setup이 .codex/hooks.json에 더함
  - prokit-runtime-checker 정의와 prokit-verify references/browser.md에 PID·프로세스 그룹만 끄라는 규칙을 적음
  - 위임:에 같은 에이전트를 두 번 적은 행에서 안내에 이름이 겹쳐 나오던 것을 고침
  - VERIFICATION.md에 테스트 프로젝트 A·B·C 실측과 결과를 적음
- 리뷰어를 맡긴 쪽으로 보는 범위를 좁히고 플러그인으로 부른 공식 스킬도 셈 (`0d080ac`)
  - 리뷰어는 행 문구에 이름이 있거나 증거에 위임: prokit-reviewer로 적은 행에서만 맡긴 쪽으로 본다(구현 행의 "리뷰어 지적 반영"은 아니다)
  - 맡은 스킬을 읽지 않았다는 경고는 수행 에이전트에게만 낸다(리뷰어 필수 스킬은 리뷰 행 검사가 본다)
  - 매니페스트가 Claude 플러그인으로도 설치하는 공식 스킬(skill-creator)은 <플러그인>:<이름> Skill 호출도 센다
  - prokit-dev-cycle SKILL.md, handbook official-skills.md, VERIFICATION.md에 반영 결과와 고친 내용을 적는다
- 증거에 적은 스크린샷을 아무도 열어 보지 않았으면 audit이 경고함 (`a2328b2`)
  - skill-log 훅이 tasks/evidence/의 이미지를 Read·read_file·view_file로 연 기록을 남긴다
  - audit이 증거에 적은 tasks/evidence/ 스크린샷({a,b} 묶음과 * 포함) 가운데 열어 본 기록이 없는 것을 경고한다(막지 않는다)
  - prokit-runtime-checker 보고 형식과 prokit-verify browser.md에 열어 본 스크린샷만 적고 경로를 tasks/evidence/부터 적는 규칙을 더한다
- 리뷰어와 위임 에이전트의 스킬 기록을 세고 다시 채운 행은 처음 채운 순서로 봄 (`d4cc46b`)
  - 같은 행에 계층 에이전트와 리뷰어를 함께 맡기면 증거에 이름이 나온 prokit-reviewer가 읽은 공식 스킬(리뷰어가 맡은 것)도 센다
  - 공식 스킬이 아닌 prokit-* 스킬은 Main과 그 행에서 위임한 에이전트가 읽은 기록을 센다
  - 사용: 목록을 가운뎃점으로 이어 적어도 이름마다 대조한다
  - 행 순서는 처음 채운 시각으로 보고, --upgrade도 처음 채운 시각을 옮긴다(앞 행을 다시 채워도 뒤 행이 무효가 되지 않는다)
  - F 구현 방식 행은 다른 행에서 위임한 계층 에이전트가 일한 기록을 그 행에서 본다
  - 공식 스킬 SKILL.md를 Read limit으로 앞부분만 읽으면 audit이 경고한다
  - 서버 규칙의 actions 파일을 .ts·.js로 줄이고 루트 AGENTS.md·CLAUDE.md를 하네스 규칙에 넣는다
  - prokit-verify browser.md에 테스트 계정을 만들 수 없을 때의 절차를 더하고 VERIFICATION.md에 T7 보고 대조와 재실행 결과를 적는다
- 행 이름과 리뷰 focus의 필수 공식 스킬을 맡는 쪽이 읽었는지 막고 조건부 스킬은 경고로 보임 (`66026e3`)
  - audit: 행 일 이름(첫 괄호 앞)에 나온 공식 스킬은 맡는 쪽이 그 라운드에서 읽은 기록이 있어야 한다(훅 기록이 없으면 사용:에 적는다)
  - audit: prokit-reviewer(ui·security·db) 행은 focus 표에서 언제가 붙지 않은 설치된 스킬을 리뷰어가 읽어야 한다
  - audit 경고: 일한 에이전트가 맡은 공식 스킬을 읽지 않았거나 Main이 맡긴 공식 스킬을 직접 읽음(캐시·프리패치 스킬은 Next 설정을 켰을 때만)
  - 리뷰어 정의: focus를 맡으면 표의 스킬을 읽고 언제가 붙은 스킬만 그 상황에서 읽는다. web-design-guidelines도 SKILL.md를 먼저 읽는다
  - prokit-web 연결 표와 화면 에이전트 정의: 캐시·프리패치 스킬을 켠 프로젝트의 라우트·링크 변경에 연결
  - 다섯 실측의 공식 스킬 활용 감사를 VERIFICATION.md에 기록
- 사용자 확인을 정해진 질문으로 받고 끝까지 이어 가게 하고 서버 판정을 넓힘 (`a60faee`)
  - [confirm]: Claude Code는 AskUserQuestion, 다른 도구는 대화로 같은 선택지 세 개(확인했고 다음으로, 고칠 것이 있다, 확인 없이 닫는다)를 묻고, 확인을 받으면 audit·close·마무리 선택·커밋을 이어서 함(진행 계획이 있으면 다음 Task)
  - 답을 받을 수 없는 비대화 실행은 이 행을 채우지 않고 확인 질문과 이어 갈 명령을 보고하고 멈춤
  - 서버(D) 판정에 앱 폴더의 메타데이터 라우트(sitemap·robots·manifest), 서버 액션 파일 actions.ts, route.tsx를 더하고 prokit-api 구조 절에 적음
  - 셸 편집 경고의 바이너리 확장자에 bmp·tiff·mp3·mov·wav·ogg·pdf를 더함
- 실행 확인 에이전트가 띄운 개발 서버를 보고 전에 닫게 하고 다섯 세션 실측을 기록함 (`0c9cd1d`)
  - prokit-runtime-checker: 이 위임에서 띄운 서버(nohup·& 포함)는 띄울 때 적은 PID로 보고 전에 끄고, 원래 떠 있던 서버는 끄지 않음
  - 세 도구(Claude Code, Codex, Antigravity)와 세 두뇌로 같은 기능 요청을 [confirm] 직전까지 돌린 결과를 VERIFICATION.md에 기록함
- 앱 폴더의 서버 파일을 서버 계층으로 보고 셸 편집 경고에서 바이너리를 뺌 (`137bfd7`)
  - 서버(D) 규칙에 앱 폴더의 route 핸들러와 instrumentation을 더함(화면 규칙을 넓힌 뒤 화면으로 판정되던 것)
  - 셸 편집 경고에서 글꼴·이미지 같은 바이너리 자산을 빼고, 생성 명령 결과면 그대로 두라고 안내함
  - 운영 프로젝트 재반영 실측 결과를 VERIFICATION.md에 기록함
- 운영 프로젝트 실측 감사로 찾은 계층 경계 빈틈을 막음 (`94726c2`)
  - 화면 규칙 B를 apps/web/src 전체로 넓히고 인증 파일은 계속 서버 몫으로 둠
  - --upgrade가 문구만 바뀐 행을 단계 이름으로 짝지어 증거와 채운 시각을 옮김
  - prokit-runtime-checker는 tasks/evidence/ 밖을 쓰지 못하게 편집 훅이 막음
  - 편집 기록 없는 계층 파일(셸 편집)을 audit이 경고로 알림
  - 위임 안내 예시를 diff 계층 에이전트나 prokit-implementer로 보임
  - --diff가 프로젝트가 채우는 파일(GLOSSARY.md, docs/domain/project.md, tasks/todo.md 등)의 diff를 보이지 않음
  - CLAUDE.md: 매니페스트에 든 prokit-* 공식 스킬은 Read로 읽게 함
  - prokit-skills-update에 설계 행 예시, 위임 지시와 prokit-implementer에 편집 도구 규칙을 더함
  - F 구현 행 안내를 계층마다 위임으로 고치고 VERIFICATION.md에 실측과 고친 내용을 적음
- 계층 파일은 그 계층 에이전트만 고치게 하고 세 도구 실측을 기록함 (`b41832a`)
  - 열린 라운드에서 prokit-implementer 등 계층 밖 서브에이전트가 계층 파일을 고치려 하면 편집 훅이 막는다(계층 밖 파일은 그대로 고친다)
  - 계층 편집 경계 테스트 단언과 delegation.md 문장을 맞춘다
  - Claude Code·Codex·Antigravity 실측(계층별 기록, 교차 편집 차단, 실제 기록으로 본 audit의 계층별 위임·degraded 판정)을 VERIFICATION.md에 적는다
- Antigravity 대화 묶기에서 Main 편집 차단 우회와 기록 오인을 막음 (`4457433`)
  - 요청(lastUserInput)이 있는 도구 호출은 묶인 대화여도 Main으로 보고 계층 편집을 막는다
  - 묶지 못한 서브에이전트 대화의 스킬 읽기는 Main 몫으로 남기지 않는다
  - 동시에 시작한 대화가 같은 call을 잡지 않게 묶는 동안 .prokit/agent-sessions.lock으로 잠근다(10초 넘은 잠금은 치운다)
  - 세 경우를 테스트 단언으로 더하고 VERIFICATION.md에 독립 리뷰 결과와 한계를 적는다
- 템플릿 설치기가 turbo.json globalPassThroughEnv에 프록시 변수를 넣음 (`07c7c1b`)
  - turbo 2.11.7 엄격 환경 변수 모드에서 HTTPS_PROXY 등이 작업에 넘어가지 않아(실측) 프록시 뒤(회사망, Codex 샌드박스)에서 next/font/google 받기가 실패하던 문제
  - ensureTurboProxyEnv: "$schema" 뒤에 HTTP_PROXY·HTTPS_PROXY·NO_PROXY(소문자 포함 6개)를 넣는다. 이미 globalPassThroughEnv가 있으면 고치지 않고 빠진 변수를 직접 더하라고 알린다. adopt는 건드리지 않는다

## Docs

- 게슈탈트 원칙 기반 UI 개선 지침 원문을 더함 (`99b9127`)
  - docs/guideline/gestalt-design-guide.md: AI가 화면을 진단하고 고칠 때 따르는 게슈탈트 원칙 지침
- 사용자 확인 뒤 라운드 마무리 경로 실측을 기록함 (`7bbb609`)
  - 사용자가 시험 화면을 써 본 뒤 준 확인으로 f-cc가 audit·close·커밋까지 다시 묻지 않고 마친 결과
- 계층별 위임과 편집 경계를 handbook과 용어집에 맞춤 (`97e6ab9`)
  - 계층 파일은 그 계층 에이전트만 고치고 prokit-implementer는 하네스·계층 밖만 맡는다고 적음
  - F는 DB, 서버·API, 화면 순서로 계층마다 맡기고 훅 없는 도구는 degraded로 적는다고 적음
  - 셸 편집은 편집 훅이 보지 못해 audit이 경고로 알리고 실행 확인 에이전트는 tasks/evidence/에만 쓴다고 적음
  - brains, installer(스킬 수), what-is-prokit, 용어집의 옛 수행자 설명을 고침
  - 갱신 반영 절차에 --upgrade, 위임 전 설계 행, 덮어써도 되는 파일 판별을 더함
  - 지원 도구 쪽에 2026-11-01 세 도구 확인 범위를 더함

## Tests

- 바쁜 기계에서만 실패하던 테스트 다섯 건을 고침 (`bdd9e3a`)
  - FIFO 증거 테스트의 spawnSync 시간 제한을 250ms에서 10초로 늘림(node 시작보다 짧았음)
  - 시간 초과 재실행 테스트가 자식이 실제로 시작한 뒤에만 판정하게 함
  - 리스 테스트가 touch 자식이 첫 mtime을 바꾼 뒤 시작하게 함
  - review 임시 폴더 테스트가 자기 TMPDIR만 세게 함

## Maintenance

- 홈페이지 주소를 https://prokit.highvalue.kr로 바꿈 (`fad462d`)
  - site-links.json home·pages를 새 주소로 바꾸고 doc-values로 문서 값을 다시 씀(handbook·tutorials·README·템플릿 prokit-credit)
  - site-links.mjs가 지난 기록(docs/superpowers/)과 주소 치환 시험 글(scripts/*.test.mjs)을 바꾸지 않게 함
