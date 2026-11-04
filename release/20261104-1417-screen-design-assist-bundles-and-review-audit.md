# v0.3.7 — Screen design assist bundles and review audit

- 날짜: 2026-11-04 14:17 (KST)
- 이전 버전: v0.3.6
- 전체 변경: https://github.com/roadkwon-ai/pro-kit/compare/v0.3.6...v0.3.7

## Features

- 화면 디자인 보조 묶음 일곱 개와 추천 조합을 더함 (`1eff168`)
  - 선택 묶음 landing, tastemaker, web-design-engineer, awwwards, animation, visual-critique, ui-design을 더함(원본은 MIT, 확인한 커밋은 THIRD_PARTY_NOTICES에 적음)
  - 매니페스트 optional.<묶음>.guide가 있는 묶음을 화면 디자인 보조로 다룸. 묶음을 더하거나 빼려면 매니페스트 항목과 prokit-ui/references/addon-<묶음>.md 하나씩만 바꾸고 스크립트는 그대로 둠
  - prokit-ui에 화면 디자인 보조 절을 더함: 종류(방향, 원칙, 모션, 검수), 한 화면에 방향 보조 하나, 브리프 보조 줄, 우선순위, 스스로 불렸을 때 물러서기
  - 묶음마다 단계 지도에서 원본 규칙과 프로젝트 규칙(한글 서체, 토큰, 의존성, 계획 폴더, 플러그인 명령)이 부딪히는 곳을 정리함
  - brains/README에 추천 조합 다섯(기본, 랜딩, 레퍼런스, 쇼케이스, 앱 정돈)을 두고 prokit-init이 UI 스킬 뒤에 조합을 묻게 함
  - 설치기 안내 줄을 guide로 만들고 Biome 제외에 .tastemaker를 더함. prokit-skills-manage에 조합 적용과 보조 추가법, Biome 제외 안내를 더함
- 프로젝트 에이전트가 계층을 함께 맡는 performers.layers를 더함 (`ac0e2a2`)
  - skills.manifest.json performers에 선택 항목 layers(계층 B·D·E마다 더할 에이전트)를 두어 프로젝트 전용 에이전트도 그 계층 파일을 고치고 위임받게 함
  - 편집 훅, audit의 행 위임 판정과 계층별 위임 누락 검사가 layers를 읽음. agents:check는 계층 이름이 아니거나 performers.agents에 없는 에이전트를 알림
  - 스킬 기록 안내(LOG_HINT)를 "공식 스킬이 아닌 prokit-*는 Skill 도구로"로 고쳐 CLAUDE.md와 맞춤
  - prokit-skills-assign, handbook 공식 스킬·에이전트 역할, 두 VERIFICATION.md에 쓰는 법과 확인을 적음

## Fixes

- 랜딩 메타데이터 채점 오탐을 고치고 addon-landing 개발 단계를 원본 A7에 맞춤 (`367ab30`)
  - eval 채점기가 시드 layout.tsx의 기존 metadata를 고친 것도 센다(Codex 랜딩 19/19, Claude 비교군 9/9로 정정)
  - addon-landing: 색인할 랜딩이면 title과 meta description을 넣고, JSON-LD는 FAQ가 있을 때만 더한다. 리뷰는 meta tags 항목을 diff에서 확인하고 센다
  - VERIFICATION: 메타데이터를 실제로 빠뜨린 것은 Antigravity뿐이고, 리뷰에 체크리스트 미충족 0이라고 적었음을 기록
- Codex·Antigravity 실측으로 화면 디자인 보조 리뷰를 audit이 확인하게 하고 eval 실행기를 더함 (`fd8f269`)
  - audit: 디자인 리뷰 행 증거에 브리프 `보조:` 줄의 보조마다 결과 문구나 `<보조> 미실행: 사유`를 요구한다
  - audit: prokit-ui 표에서 종류가 검수인 보조(visual-critique, ui-design)는 설치되어 있으면 브리프 줄에 없어도 요구한다(impeccable 예외는 표의 "언제 쓰나" 칸을 따른다)
  - audit: 훅 기록이 있는 라운드에서 결과를 적은 보조는 그 묶음 스킬을 읽은 기록을 요구한다
  - audit: 과설계 방지 보완 검토는 prokit-reviewer의 읽기도 센다(Codex 리뷰어가 네이티브 ponytail 플러그인을 읽는 경우)
  - prokit-ui와 검수 보조 guide 두 개: 검수 보조는 설치되어 있으면 브리프를 쓰는 화면마다 쓴다
  - eval 실행기: PKSS_AGENT=codex|agy, PKSS_CODEX_BIN, PKSS_PORT_BASE, 훅 기록 읽기를 채점에 더하고 재채점이 도구 호출을 다시 뽑는다
  - VERIFICATION: Codex 0.164.0-alpha.11.1·Antigravity 1.4.12 실측 결과와 한계
- 화면 디자인 보조가 리뷰 단계까지 이어지게 행 문구와 guide를 고치고 행동 eval을 더함 (`61fa876`)
  - B 대조표의 브리프·구현·디자인 리뷰 행 문구에 보조 연결을 넣음(guide 읽기, 보조: 줄, 위임 지시의 스킬 경로, 리뷰 보고서의 보조 절과 미실행 사유)
  - prokit-ui 보조 규칙 보강: 설치한 모션·검수 보조도 보조 줄에, guide가 가리키는 스킬 파일을 그 단계에서 읽기, 주 UI 스킬 리뷰가 보조를 대신하지 않음, 증거 꼴, 토큰은 prokit-ui-builder가 옮김
  - guide: web-design-engineer는 카탈로그에 같은 이름이 있으면 채점만 하고 채점은 critique-guide를 읽고 함, animation은 impeccable animate와 구분하고 emil-design-eng로 리뷰, visual-critique는 hallmark 마감 리뷰가 대신하지 않음
  - prokit-ui-builder가 위임 지시에 적힌 UI 스킬·보조 스킬 파일도 읽고 보고함
  - 묶음 목록을 글자 그대로 비교하던 테스트를 구조 검사로 바꾸고 doc-values 기댓값을 매니페스트에서 읽음. prokit-init 직접 고르기 머리글을 종류대로 나눔
  - evals/selected-skills에 보조 시나리오 셋(랜딩 조합, 앱 정돈 조합, 물러서기), 사본별 포트, 샌드박스 밖 개발 서버, turn 명령을 더함
- Main 몫 행이 요구한 스킬 읽기를 맡긴 스킬 경고에서 빼고 셸 쓰기 한계 문장을 실제 범위로 고침 (`e8777de`)
  - 행을 맡을 에이전트와 맡긴 쪽 계산을 rowHands로 묶어 행 검사(mainOk)와 skillWarnings가 같이 쓴다
  - Main 몫 행(맡을 에이전트도 위임도 없는 행)이 행 문구로 요구한 스킬을 Main이 읽으면 "Main이 맡긴 공식 스킬을 직접 읽었다" 경고를 내지 않는다. 행 검사는 그 읽기를 요구하는데 경고가 나무라 두 메시지가 어긋났다
  - VERIFICATION.md의 셸 쓰기 한계를 실제 범위로 고친다: 경로 조각 결합과 glob은 놓치고, audit 경고는 기준 커밋에 있던 파일만 알리며 새로 만든 계층 파일은 잡지 못한다
  - prokit-dev-cycle SKILL.md와 handbook audit-and-confirm.md의 경고 항목에 이 예외를 적는다
- T24 감사 보고의 shell-guard 오탐, Main 몫 행 스킬 읽기, 위임 시각 기준, 증거 꼴 세부를 고침 (`157e7aa`)
  - shell-guard가 실제 쓰기 대상만 본다. 인터프리터에 넘긴 heredoc과 인라인 스크립트에서 경로 전체인 문자열만 쓰기 후보로 삼고 불러오기·읽기 인자와 node_modules는 뺀다
  - 맡길 에이전트가 없고 위임하지 않은 행은 Main 몫으로 보고 Main이 읽은 맡긴 공식 스킬도 센다(F의 Neon 브랜치 적용 행 회귀)
  - 위임 행은 같은 에이전트에 맡긴 앞 행이 있을 때만 그 뒤 다른 행을 기준으로 보고, 행 문구 스킬은 위임한 에이전트가 일을 시작하기 전 마지막 앞 행을 기준으로 본다
  - delegation diff가 대조표 파일을 변경에서 빼고, status가 리뷰 지시에 넣을 공식 스킬을 보인다
  - 증거 꼴: Next 문서 경로 끝 콜론을 떼고, 사용: 목록 끝의 두뇌 스킬을 읽고, 기록에 있는 비슷한 이름을 보이고, 참조 파일은 끝까지 읽은 기록만 센다
- T8 감사 보고의 scope 디렉터리, 증거 꼴, 셸 편집 경고, 스킬 읽기 시각 기준을 고침 (`373cdd8`)
  - delegation diff --scope에 디렉터리를 주면 그 아래 전체로 봄
  - table --write 출력에 audit이 읽는 증거 꼴을 보이고, 괄호를 붙인 ponytail-review(…):도 받음
  - 스킬 기록 안내를 경우마다 한 문장으로 나누고 공식 스킬 예를 적음
  - prokit-verify browser.md에 스크린샷 묶음(*)이 폴더의 파일을 모두 센다는 안내와 예를 더함
  - 편집 기록이 없는 계층 파일 경고는 첫 편집 기록 뒤에 바뀐 파일만 봄(라운드 도중 훅이 생긴 경우)
  - 행 문구 스킬과 위임 에이전트의 기준을 표에서 앞에 있는 행으로 좁히고, 앞 행을 채운 뒤에도 일한 에이전트(같은 agent_id)가 먼저 읽은 기록을 셈
- pnpm-workspace.yaml을 작업공간 설정 H로 잡고 Workflow 생성물을 Biome에서 뺌 (`9d6ee9f`)
  - .dev-cycle.json의 H 규칙 "작업공간 설정"에 pnpm-workspace.yaml을 더함(allowBuilds·minimumReleaseAgeExclude 같은 공급망 설정)
  - 설치기의 Biome 제외 목록에 !**/.well-known/workflow를 더함(Workflow SDK 생성물)
  - H 표 빌드·검사 행, prokit-dev-cycle 케이스 표, handbook dev-cycle-config의 목록과 테스트를 맞춤
- 셸로 계층 파일을 고치는 명령을 막고 delegation diff·리뷰 스킬 안내를 더함 (`2cec2fa`)
  - shell-guard가 리다이렉션, sed·perl -i, tee, cp·mv, 파일을 쓰는 python·node 스크립트로 계층 파일(화면·서버·DB, 인증)을 고치는 명령을 막음(performers가 있는 판만. 읽기·증거·생성·포맷·apply_patch는 통과)
  - delegation diff가 프로젝트 밖 기준 파일을 받으면 사용법 대신 이유와 둘 곳을 알림
  - table --write가 리뷰 행(ui·security·db)마다 리뷰 지시에 넣을 공식 스킬 경로(상위 스킬 포함)를 보여 줌
  - 계층 수행자 정의 셋, handbook 하네스·에이전트 역할·명령·설치기·고칠 파일, 두 VERIFICATION.md를 맞춤(pro-kit-trader T8 감사 보고)
- 맡은 공식 스킬 경고를 이번 diff의 상황으로 거름 (`3a7b40d`)
  - turborepo는 turbo.json·package.json, Better Auth 스킬 셋은 인증 파일을 바꾼 라운드에서만 "일한 에이전트가 읽지 않은 맡은 공식 스킬"로 알림(SKILL_SITUATIONS)
  - turbo 변경이 없는 H 라운드에서 prokit-implementer: turborepo 경고가 뜨던 것을 없앰(pro-kit-trader·pro-kit-web 보고)
  - 경고 테스트에 turbo.json 유무 단언을 더하고 handbook 공식 스킬 쪽과 두 VERIFICATION.md에 적음
- 원격에서 합쳐진 Neon 스킬 두 개를 neon-postgres로 바꿈 (`896012a`)
  - neondatabase/agent-skills #172가 neon-postgres-branches·neon-postgres-egress-optimizer를 neon-postgres(references/branching.md, egress-optimization.md)로 합쳐 새 설치가 없어진 스킬을 받으려 했음
  - skills.manifest.json의 neon 목록과 performers에서 두 스킬을 빼 공식 스킬이 27개에서 25개가 됨
  - dev-cycle.mjs db 리뷰 focus 스킬과 주석, dev-workflow.md E 병합 전 행을 neon-postgres로 고침
  - prokit-db 연결 표의 브랜치 행을 prokit-db-builder가 명령 정리, 원격 적용은 Main으로 바꾸고 migration-flow·ownership-test·db-builder·reviewer 정의·audit 테스트를 맞춤
  - handbook 공식 스킬 표·에이전트 역할·비교표와 두 VERIFICATION.md에 실제 설치 확인을 적음
- 옛 러너에 새 훅을 넣지 않고, 운영 프로젝트 보고 결함을 고침 (`023785d`)
  - 설치기가 프로젝트의 scripts/dev-cycle.mjs가 모르는 훅은 .claude/settings.json에 넣지 않고 --diff·설치 출력에 경고함(넣으면 모든 Bash·편집 호출이 막힘)
  - turbo.json에 항목을 더하면 Biome 포맷 대상에 넣음
  - dev-cycle.mjs: 공식 스킬은 Read로 읽으라는 기록 안내, 설계 증거에서 읽지 못한 필드를 알리는 메시지, CLAUDE_PROJECT_DIR를 구조 분해로 읽어 noUndeclaredEnvVars 경고를 없앰
  - skills-setup.mjs: CLAUDE_CONFIG_DIR 읽기를 헬퍼로 옮겨 같은 경고를 없앰
  - CLAUDE.md에 Skill 목록에 보이는 공식 스킬도 Read로 읽는다는 안내를 더함
  - 계층 수행 에이전트 정의에 편집 도구로만 고치는 규칙을 더함
  - prokit-api와 dev-cycle-config에 force-static 메타데이터 라우트(sitemap 등) 판정 안내를 더함
  - 갱신 반영 절차(AGENTS.md 7번, handbook update-existing)에 러너를 먼저 옮기는 순서를 적고 두 VERIFICATION.md에 확인을 기록함

## Docs

- 화면 디자인 보조 리뷰 audit, 검수 보조 사용 범위, 랜딩 메타데이터를 handbook에 반영 (`f7f53a3`)
  - audit: 브리프 `보조:` 줄과 설치한 검수 보조마다 디자인 리뷰 증거의 결과나 `<보조> 미실행: 사유`, 결과를 적은 보조의 스킬 읽기 기록을 확인하는 항목을 더함
  - 두뇌와 선택 스킬: 검수 보조는 브리프를 쓰는 화면마다 리뷰에 쓴다는 것과 과설계 방지 리뷰가 prokit-reviewer의 읽기도 센다는 것을 고침
  - 선택 스킬 묶음·화면 흐름: 검수 보조 리뷰와 landing의 메타데이터 단계를 적음
  - brains README(두 템플릿): 검수 보조 사용 범위 한 줄을 더함
