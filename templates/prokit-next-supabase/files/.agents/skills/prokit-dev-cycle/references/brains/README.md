# 두뇌와 선택 스킬 고르기

프로젝트에 설치하는 프로세스 스킬은 다섯 가지로 나뉜다. 이 파일이 카탈로그, 선택지 설명, 추천 기준의 정본이다. 새 프로젝트를 만들 때(pro-kit의 `prokit-init`)와 기존 프로젝트에서 바꿀 때 모두 이 파일을 쓴다.

| 구분 | 고르는 수 | 기록 | 기본 | 바꾸는 명령 |
|---|---|---|---|---|
| 두뇌 | 0개 이상(하나 추천) | `.dev-cycle.json`의 `brain`(여럿이면 배열, 첫 값이 주 두뇌) | `none`(기본 AI) | `pnpm skills:setup --brain <이름>[,<이름>]` 또는 `--brain none` |
| 과설계 방지 스킬 | 0~1 | `.dev-cycle.json`의 `simplicity` | `none`(기본 AI) | `pnpm skills:setup --simplicity <이름\|none>` |
| mattpocock 추가 스킬 | 0개 이상 | 설치본(`skills-lock.json`) | 없음 | `pnpm skills:setup --matt <스킬>[,<스킬>]` |
| 응답 방식 스킬 | 0~1 | 설치본 | 없음 | `pnpm skills:setup --optional i-have-adhd` |
| 화면 디자인 보조 | 0~1 | 설치본 | 없음 | `pnpm skills:setup --optional taste` |

- 하네스(`prokit-*` 스킬과 에이전트, dev-cycle 스크립트, 대조표·audit·`[confirm]`, 공식 도메인 스킬, skill-creator, mattpocock `domain-modeling`·`grilling`·`grill-with-docs`, 간결성 규칙)는 무엇을 골라도 그대로 설치하고 지킨다.
- 두뇌와 과설계 방지 스킬은 "어떻게 생각하고 진행하나", "얼마나 작게 만드나"만 바꾼다. 대조표 행, 위임 검증, `prokit-reviewer` 최종 게이트, `prokit-verify`, <!-- edition:pro -->`prokit-deploy` 배포 경로, <!-- /edition -->audit, `[confirm]`은 그대로다.
- 고른 스킬의 규칙이 `AGENTS.md`, `prokit-*`, 대조표, 보고 형식과 부딪히면 뒤의 것이 우선한다.

## 바꾸는 법
진행 중에 두뇌나 과설계 방지 스킬을 바꾸거나 더하거나 빼는 요청은 `prokit-skills-manage` 스킬이 받는다. 절차의 정본은 아래다.

1. 언제든 바꿀 수 있다. 열린 라운드가 없으면 H 라운드를 열고, 열린 라운드가 있으면 그 라운드에서 바로 바꾼다. 설치기가 대조표 마커에 바꾼 구성을 적고(`brains=…`, `skills=true`, 메모 한 줄), audit은 그 라운드에서 설치기가 바꾼 파일을 케이스 판정에서 빼며 바꾸기 전 두뇌 이름으로 채운 단계 행도 받는다. 남은 단계 행은 새 구성으로 한다.
2. `pnpm skills:setup --brain <이름>[,<이름>]`(또는 `--brain none`)이나 `--simplicity <이름|none>`을 실행한다. `--brain`에는 남길 두뇌 전부를 준다. 더할 때는 지금 목록 뒤에 새 두뇌를 붙이고(지금이 `none`이면 새 두뇌만), 뺄 때는 남길 것만 준다. 그 항목에서 고르지 않은 설치본(스킬은 `skills-lock.json` 출처, 플러그인은 ID, OMX는 `.omx/setup-scope.json`, OpenSpec·Spec Kit은 그 도구가 만든 파일)을 지우고 고른 것을 설치한다. 기록값과 같은 값을 줘도 남은 설치본을 정리한다. 추가 스킬과 선택 묶음은 두뇌를 바꿔도 남는다. 지우려면 `--drop <스킬이나 묶음>`을 준다. 순수 AI(두뇌·과설계 방지·추가 스킬·선택 묶음 없이 `prokit-*`와 필수·공식 스킬만)로 돌아가려면 `--brain none --simplicity none --drop all` 한 번이면 된다. 두뇌가 만든 문서(`openspec/`, `specs/`, `.specify/memory/`, `docs/solutions/`)도 지우지 않는다.
3. 이 기기 전역에 켜진 고르지 않은 플러그인과 gstack 개인 스킬은 `.claude/settings.local.json`으로 이 프로젝트에서만 끈다. 고른 것을 끄던 항목은 지운다. 전역 파일은 쓰지 않는다.
4. 두뇌를 바꾸면 이전 두뇌가 만든 산출물(확정한 요구, 설계, 계획 경로, 남은 일)을 대조표 메모와 `tasks/todo.md`로 넘겨 새 두뇌가 인터뷰·계획을 처음부터 반복하지 않게 한다.
5. `pnpm skills:check` exit 0, `pnpm agents:check`를 확인한다. Claude Code는 `/reload-plugins`로 지금 세션에 바뀐 플러그인·스킬·훅을 불러온다(새 세션도 된다). 다시 불러오기 전에는 세션의 스킬 목록·훅 안내가 아니라 `.dev-cycle.json`과 `pnpm skills:check`를 따른다.

## 두뇌
두뇌는 요구 정리, 계획, 구현 진행, 디버깅, 완료 확인의 순서와 방법을 스스로 주도한다. 하나를 추천한다. 여럿을 고를 수도 있다. 그때는 첫 두뇌가 주 두뇌이고, 단계마다 목록 순서에서 그 단계를 맡는 첫 두뇌를 쓴다(아래 "단계 표"). 진행 순서를 강제하는 두뇌(superpowers, gstack, oh-my. 세션 시작 훅이나 전역 지시를 쓴다)를 둘 이상 고르면 지시가 서로 덮어써서 설치기가 경고한다. 단계별 스킬 이름과 금지는 각 파일에 있다.

| 이름 | 선택지 설명(한 줄) | 맡는 단계 | Claude Code | Codex | Antigravity·Grok Build | 파일 |
|---|---|---|---|---|---|---|
| `none` | 지금 에이전트가 프로킷 내장 절차로 진행해요. 충돌이 없고 가장 가벼워요 | 없음(기본 칸) | 기본 AI | 기본 AI | 기본 AI | 없음 |
| `superpowers` | 설계 합의 → 계획 → 테스트 먼저 → 작업별 리뷰를 강하게 거는 규율형이에요 | 요구, 계획, 구현, 디버깅, 리뷰 지적 처리, 검증 | 플러그인(세션 시작 훅) | `.agents/skills` | `.agents/skills` | [superpowers.md](superpowers.md) |
| `agent-skills` (addyosmani) | 스펙부터 출시까지 보안·성능·접근성 기준을 단계별 명령으로 걸어요 | 요구, 계획, 구현, 디버깅, 리뷰 관점, 출시 점검 | 플러그인(명령 `/spec`~`/ship`) | `.agents/skills` | `.agents/skills` | [agent-skills.md](agent-skills.md) |
| `gstack` | 무엇을 만들지 검토하는 제품 판단, 디자인, 실사용 QA가 강해요. 전역 설치(Bun)가 필요해요 | 요구(제품 판단), 계획 리뷰, 디버깅, 리뷰 관점, QA | 전역 `~/.claude/skills/gstack` | 전역 `~/.codex/skills/gstack` | 지원 안 함(기본 AI) | [gstack.md](gstack.md) |
| `oh-my` | 여러 세션에 걸친 큰 작업을 자동·병렬 모드로 돌려요(Claude는 OMC, Codex는 OMX). Codex는 전역 CLI가 필요해요 | 요구, 계획, 구현(병렬), 디버깅, 리뷰 관점, 검증 | OMC 플러그인 | 전역 OMX CLI + 프로젝트 `omx setup` | 지원 안 함(기본 AI) | [oh-my.md](oh-my.md) |
| `pstack` | React 코어팀 poteto의 방식으로, 일에 맞는 플레이북을 골라 코드는 적게 쓰고 실행 증거로 검증해요. Claude Code만 지원해요 | 계획(데이터 모양·타입 먼저), 구현 방법, 디버깅·성능, 리뷰 관점 | 플러그인 | 지원 안 함(기본 AI) | 지원 안 함(기본 AI) | [pstack.md](pstack.md) |
| `mattpocock` | 필수 3개(용어·설계 질문과 기록)에 프로젝트에 맞는 mattpocock 추가 스킬을 골라 단계마다 기법으로 써요. 개발자가 진행을 쥐고 필요한 기법만 더해요 | 요구(인터뷰), 고른 추가 스킬이 맡는 단계(계획, 구현, 디버깅, 리뷰 관점, 인계) | `.claude/skills` | `.agents/skills` | `.agents/skills` | [mattpocock.md](mattpocock.md) |
| `openspec` | 변경마다 제안·설계·작업 목록을 먼저 합의하고 적용한 뒤 스펙으로 보관해요. 가볍고 이미 있는 프로젝트에 붙이기 좋아요. 전역 CLI(npm)가 필요해요 | 요구(변경 제안), 계획(설계·작업 목록), 구현(작업 적용), 완료 기록(스펙 보관) | 스킬과 명령 `/opsx:*` | `.agents/skills`(`$openspec-*`) | `.agents/skills`(Antigravity는 명령 `/opsx-*`도) | [openspec.md](openspec.md) |
| `spec-kit` | 헌법 → 스펙 → 명확화 → 계획 → 작업 목록 → 구현을 꼼꼼히 밟는 GitHub의 스펙 주도형이에요. 설치할 때 uv가 필요해요 | 요구(스펙·명확화), 계획(계획·작업 목록·일관성 분석), 구현, 남은 일 확인 | 스킬 `/speckit-*` | `.agents/skills`(`$speckit-*`) | `.agents/skills` | [spec-kit.md](spec-kit.md) |
| `compound-engineering` | 계획과 리뷰에 힘을 싣고, 끝낸 일에서 배운 것을 `docs/solutions/`에 쌓아 다음 작업을 쉽게 만들어요 | 요구(브레인스토밍), 계획, 구현, 디버깅, 리뷰 관점, 배운 것 기록 | 플러그인 | `.agents/skills`(핵심 스킬 14개) | `.agents/skills` | [compound-engineering.md](compound-engineering.md) |

- 지원하지 않는 도구로 같은 프로젝트를 열면 그 도구는 기본 칸으로 진행한다(`pnpm skills:check`의 두뇌 줄에 `codex는 기본 AI`처럼 보인다).
- 전역 설치는 gstack, OMX CLI, OpenSpec CLI만 허용한다. 그 두뇌를 고르고 `--brain`을 명시했거나 `--with-global`일 때만 설치한다. 다른 두뇌로 바꿔도 전역 설치본은 지우지 않는다(다른 프로젝트가 쓸 수 있다).
- OpenSpec과 Spec Kit은 그 도구가 프로젝트에 스킬과 도구 파일을 만든다(`openspec init`, `specify init`). 설치기는 그 파일로 설치 여부를 보고, 다른 두뇌로 바꾸면 도구 파일만 지우고 두뇌가 만든 문서는 남긴다.

### 단계 표
두뇌를 여럿 골랐을 때 단계마다 어느 두뇌를 쓸지 정하는 정본이다. ●는 그 두뇌가 맡는 단계, 빈칸은 맡지 않는 단계다. 목록 순서(첫 값이 주 두뇌)에서 ●인 첫 두뇌를 쓰고, 아무도 맡지 않으면 [process-routing.md](../process-routing.md)의 기본 칸이다. `mattpocock`은 고른 추가 스킬이 맡는 단계만 ●로 본다.

| 두뇌 | 요구 명확화 | 계획 | 구현 | 디버깅 | 리뷰 추가 관점 | QA | 검증 | 완료 기록 |
|---|---|---|---|---|---|---|---|---|
| `superpowers` | ● | ● | ● | ● | ●(지적 처리) | | ● | |
| `agent-skills` | ● | ● | ● | ● | ● | ●(보조) | | |
| `gstack` | ●(제품 판단) | ●(리뷰 보강) | | ● | ● | ● | | |
| `oh-my` | ● | ● | ● | ● | ● | | ● | |
| `pstack` | ●(요구 확인) | ● | ● | ● | ● | | | |
| `mattpocock` | ● | 추가 스킬 | 추가 스킬 | 추가 스킬 | 추가 스킬 | | | |
| `openspec` | ● | ● | ● | | | | | ●(스펙 보관) |
| `spec-kit` | ● | ● | ● | | | | | ●(남은 일 확인) |
| `compound-engineering` | ● | ● | ● | ● | ● | | | ●(배운 것) |

- 잘 맞는 조합: 스펙을 남기는 두뇌(openspec, spec-kit)를 주 두뇌로 두고, 그 두뇌가 맡지 않는 디버깅·리뷰를 다른 두뇌로 채운다. 예: `--brain openspec,superpowers`이면 요구·계획·구현은 openspec, 디버깅·검증은 superpowers다.
- 두 두뇌가 같은 단계를 맡으면 뒤의 두뇌는 그 단계에서 쓰지 않는다. 사용자가 그 두뇌의 스킬을 직접 부르면 그 요청을 따른다.
- mattpocock 두뇌는 따로 설치하는 것이 없다. 필수 3개와 `--matt`로 고른 추가 스킬이 두뇌 역할을 하므로 고를 때 추가 스킬을 함께 고른다. 다른 두뇌로 바꿔도 추가 스킬은 지우지 않는다.

## 과설계 방지 스킬
요청하지 않은 기능·추상화를 막고 가장 작게 완성하게 한다. 셋이 "얼마나 작게, 어디까지 고칠지"를 저마다 정해 하나만 쓴다. 고른 스킬이 하는 일은 [process-routing.md](../process-routing.md) 규칙 6의 역할 표가 정본이다.

| 이름(선택지) | 선택지 설명(한 줄) | 설치 | 켜지는 방식 | 프로젝트 밖에 쓰는 것 |
|---|---|---|---|---|
| `ponytail` (추천) | 늘 켜지는 미니멀 모드로 가장 작게 만들고, 구현 diff를 `ponytail-review`로 점검해요. 가장 활발히 갱신 중이에요 | Claude 플러그인 `ponytail@ponytail`, Codex·Antigravity·Grok용 스킬 6개. Codex 네이티브 플러그인은 `--with-global`일 때만 | 늘 켜짐(세션 시작·서브에이전트 훅). "stop ponytail"·"normal mode"로 끈다 | `~/.claude/.ponytail-active`, 턴별 CSV `~/.config/ponytail/band/`, statusline 제안(전역 설정은 사용자가 요청할 때만) |
| `caveman` | 작업별 간결 패턴(새 기능, 버그, 리팩터)과 한 줄 리뷰를 쓰고, `/caveman`으로 답변 토큰도 줄여요. 활발히 갱신 중이에요. 압축 규칙은 영어 기준이에요 | skills CLI 5개(`lean-build`, `surgical-patch`, `safe-refactor`, `caveman-review`, `caveman`) | 일이 맞으면 모델이 부른다. 응답 압축은 `/caveman`(Codex `$caveman`)으로 켜고 "stop caveman"으로 끈다 | 없음(플러그인·CLI를 쓰지 않는다) |
| `karpathy` (andrej-karpathy-skills) | 카파시의 네 원칙(코딩 전 생각, 단순함, 정밀 수정, 검증 목표) 지침 하나예요. 가장 유명하지만 최근 갱신은 적어요 | skills CLI `karpathy-guidelines` 하나 | 코드를 쓰거나 리뷰·리팩터할 때 모델이 부른다 | 없음 |
| `none` (SKIP) | 따로 설치하지 않고 프로킷 내장 간결성 규칙(재사용 순서, "만들지 않는 것")으로 진행해요 | 없음 | 하네스 규칙 | 없음 |

- 모호할 때: karpathy는 멈추고 묻는다. ponytail은 가장 작은 판을 만든다. caveman은 공개 범위·보안·데이터·과금·되돌리기 어려운 선택만 묻는다. 프로킷에서는 작업 원칙 1(결과를 바꾸는 모호함은 구현 전에 묻는다)이 우선한다.
- 수정 범위: karpathy는 요청한 곳만 고친다. ponytail은 깨지는 호출자·테스트까지 고친다. caveman `lean-build`는 맡은 계층까지 넓힌다. 프로킷에서는 이번 변경이 깨뜨린 호출자는 고친다(규칙 6 지적 처리).
- caveman에서 설치하지 않는 스킬: `ultracave`·`megacave`(더 센 압축, `megacave`는 한문), `caveman-compress`(`CLAUDE.md`·`AGENTS.md`를 다시 쓰고 내용을 모델 제공자에게 보낸다), `caveman-commit`(커밋 규칙과 부딪힌다), `investigate-first`(디버깅 단계와 겹친다), `verify-and-stop`(`prokit-verify`와 겹친다), <!-- edition:pro -->`migration`(DB 마이그레이션 스킬과 겹친다), <!-- /edition -->`cavecrew`(자체 서브에이전트), 클라우드·프록시·도움말 스킬(CLI·훅 전제). `caveman`이 `/caveman ultra`를 `ultracave`로 넘기라고 해도 설치하지 않았으니 쓰지 않는다.
- "normal mode" 한마디는 ponytail, caveman, i-have-adhd를 함께 끈다. 하나만 끄려면 "stop ponytail", "stop caveman", "stop adhd mode"를 쓴다.

## 응답 방식 스킬
| 이름 | 선택지 설명(한 줄) | 설치 | 켜는 법 |
|---|---|---|---|
| `i-have-adhd` (추천) | 다음 행동 먼저, 번호 단계, 다음 할 일 하나로 짧게 답해요. `/i-have-adhd`로 켜요. 스킬은 영어로 쓰여 있어요 | 선택 묶음 `i-have-adhd`(skills CLI) | 사용자 명령만: `/i-have-adhd`, Codex `$i-have-adhd`. "stop adhd mode"로 끈다 |
| SKIP | 지금 답변 방식을 그대로 써요 | 없음 | 없음 |

대화 응답에만 쓴다. "목록은 5개까지", "매 답 끝에 다음 할 일 하나"는 라운드 보고 형식과 부딪히면 보고 형식이 우선한다.

## 화면 디자인 보조
| 이름 | 선택지 설명(한 줄) | 설치 | 쓰는 법 |
|---|---|---|---|
| `taste` | 랜딩·소개 화면을 갤러리 사이트에서 뽑은 방향과 실제 브라우저 검사로 만들어요. 고른 화면에만 써요. 스킬은 영어로 쓰여 있어요 | 선택 묶음 `taste`(skills CLI `design-taste-frontend`) | 화면 작업에서 "taste로"라고 하거나 스타일 질문에서 "taste-skill로 방향 뽑기"를 고른다. 검사에 Chrome·Edge·Chromium이 필요하다 |
| SKIP | impeccable과 디자인 카탈로그로 화면을 만들어요 | 없음 | 없음 |

impeccable을 대신하지 않는다. 화면 작업 순서, `DESIGN.md`, critique·audit 통과 기준은 그대로이고 연결 규칙은 `prokit-ui`의 `references/taste.md`다.

## mattpocock 스킬
`domain-modeling`·`grilling`·`grill-with-docs`는 필수(하네스)다. 나머지는 서로 독립된 기법이라 PRD에 맞는 것만 추가로 고른다. "사용자" 호출 스킬은 모델이 스스로 부르지 않으므로, 에이전트가 대신 실행하지 않고 그 단계에서 명령(예: `/grill-with-docs`)을 제안한다. "겹치는 두뇌"는 그 두뇌가 같은 단계를 자기 스킬로 맡는다는 뜻이다. 추천에서 빼는 데만 쓰고 설치를 막지 않는다. 사용자가 겹치는 스킬을 원하면 겹친다는 점과 라우팅은 두뇌의 스킬을 먼저 쓴다는 점을 알리고 설치한다. 두뇌가 `mattpocock`이면 겹치는 두뇌가 없으므로 이 열을 보지 않는다.

| 스킬 | 호출 | 구분 | 프로킷에서 맡는 곳(선택지 설명) | 추가 신호(PRD·요청에서) | 겹치는 두뇌 |
|---|---|---|---|---|---|
| `domain-modeling` | 모델 | 필수 | `GLOSSARY.md`·ADR 형식, 새 용어와 설계 결정 기록 | | |
| `grilling` | 모델 | 필수 | 용어·도메인 규칙·설계 결정 질문(묶음별 질문과 추천 답). 두뇌가 없으면 요구 명확화 인터뷰도 맡는다 | | |
| `grill-with-docs` | 사용자 | 필수 | 사용자가 `/grill-with-docs`로 인터뷰하며 `GLOSSARY.md`·ADR을 함께 기록 | | |
| `tdd` | 모델 | 추가 | 테스트를 먼저 쓰고 구현해요(구현 단계, C의 재현 테스트) | 계산·상태 전이·권한·금액처럼 규칙 로직이 많음 | superpowers, agent-skills, pstack, oh-my(OMC) |
| `diagnosing-bugs` | 모델 | 추가 | 어려운 버그와 성능 퇴행을 재현부터 진단해요(C 케이스) | 외부 연동이 많거나 가져온 코드가 있어 원인 찾기 어려운 버그가 예상됨, 성능 목표가 있음 | superpowers, agent-skills, gstack, pstack, oh-my(OMC) |
| `codebase-design` | 모델 | 추가 | 모듈 경계와 인터페이스를 깊게 설계해요(`[design]` 행, F 공통화 행) | 패키지·모듈이 여럿이고 공용 API·공통 모듈 설계가 범위에 있음 | agent-skills, pstack |
| `prototype` | 모델 | 추가 | 버리는 시안으로 상태 모델·화면을 먼저 확인해요(B·F) | 화면·상호작용·상태 흐름이 새롭거나 PRD가 "느낌을 보고 정하자"는 수준 | oh-my(OMC), pstack |
| `research` | 모델 | 추가 | 외부 API·SDK·규정 조사 결과를 저장소 문서로 남겨요 | 외부 서비스·결제·지도·AI API 연동, 낯선 도메인 규칙이나 법규 | |
| `improve-codebase-architecture` | 사용자 | 추가 | 구조 개선 후보를 보고서로 뽑아요(F 공통화 행에서 제안) | 가져온 기존 코드가 있거나 대규모 리팩터가 범위에 있음(새 프로젝트는 보통 해당 없음) | oh-my(OMC) |
| `wizard` | 모델 | 추가 | 사람이 해야 하는 외부 설정 단계를 안내해요<!-- edition:pro -->. 배포 자체는 `prokit-deploy`가 맡아요<!-- /edition --> | OAuth 앱 등록, 결제 키, DNS, 외부 대시보드 설정이 여러 개 | |
| `to-questionnaire` | 사용자 | 추가 | 결정권자가 따로 있는 질문을 질문지로 만들어요 | 고객·기획자·법무 등 사용자 밖의 결정권자가 PRD에 있음 | |
| `handoff` | 사용자 | 추가 | 세션이나 두뇌를 넘길 때 인계 문서를 만들어요 | 여러 세션에 걸친 큰 범위, 여러 사람이 이어 받음 | |
| `teach` | 사용자 | 추가 | 배우면서 만드는 흐름으로 설명해요 | 학습 목적, 입문자, 튜토리얼 | pstack |
| `wait-what` | 사용자 | 추가 | 설명이 와닿지 않을 때 다시 설명해 달라고 해요 | `teach`와 같은 신호 | pstack |
| `writing-for-agents` | 모델 | 추가 | 프로젝트 전용 스킬·`AGENTS.md`를 고치는 H 라운드를 도와요 | 프로젝트 전용 스킬·에이전트 규칙을 만들 계획이 PRD에 있음 | superpowers, agent-skills, oh-my(OMC) |
| `code-review` | 모델 | 추가 | 스펙 대비 추가 관점 리뷰예요. `prokit-reviewer` 게이트를 대신하지 않는다 | 인수 조건이 길고 엄격해 스펙 축 검토를 따로 받고 싶음 | superpowers, agent-skills, gstack, pstack, oh-my |
| `pr` | 모델 | 추가 | PR 본문을 써요. 프로킷 기본 마무리는 기본 브랜치 커밋·push다 | 팀이 PR로 병합하는 흐름이 PRD에 있음 | |

설치하지 않는 스킬과 이유:
- `grill-me`: `grilling`을 부르는 한 줄짜리 명령이다. `grilling`이 "grill" 요청 문구로 바로 불린다.
- `to-spec`, `to-tickets`, `wayfinder`, `triage`, `setup-matt-pocock-skills`: 이슈 트래커에 스펙·티켓을 게시하고 저장소 설정(`docs/agents/`)을 만든다. 프로킷은 스펙·계획을 `docs/specs`·`docs/plans`에, 진행을 `tasks/todo.md` 대조표에 둔다.
- `implement`, `implement-spec`: 자체 구현 루프(작업별 worktree 병렬)다. 프로킷 구현은 대조표 행 단위 `prokit-implementer` 위임과 snapshot 대조다.
- `retro`: 회고 기록이 `tasks/lessons.md`와 겹친다.
- `ask-matt`: matt 스킬 전체 라우터라 설치하지 않은 스킬과 제외한 흐름으로 안내한다.
- 저장소의 `in-progress`·`misc` 폴더 스킬: 원본 `plugin.json`에 없는 작업 중 스킬이다.

`code-review`, `prototype`, `research`는 Claude Code 같은 하네스의 내장 명령과 이름이 겹친다(원본 저자도 인정). 어느 쪽이 불리는지 증거에 이름을 적는다. 표에 없는 새 스킬은 H 라운드에서 이 표와 매니페스트 `mattpocock.pool`을 고친 뒤 설치한다.

## 추천 기준
추천은 PRD로 만든다. 새 프로젝트는 PRD가 먼저 있어야 한다. PRD는 사용자가 준 PRD·스펙 파일, 붙여 넣은 글, 요청이나 `docs/first-request.md`의 서비스 설명(누가 쓰는지와 핵심 기능), 요청에 적힌 프리셋 팩이다. 이미 만든 프로젝트면 `docs/prd.md`나 `docs/first-request.md`(만들 때 받은 PRD)·`docs/domain/project.md`·`docs/specs/`·`GLOSSARY.md`다. <!-- edition:pro -->기존 프로젝트를 들일 때(초기, 운영 중, 전환)는 PRD가 없어도 된다. `prokit-init`의 초기 분석(대상 폴더의 코드, 문서, 화면 정의서, 디자인 시스템, 프로토타입)이나 `docs/prokit/intake.md`·`docs/prokit/analysis.md`를 PRD와 함께 신호로 본다. <!-- /edition -->두뇌 판단 기준은 "하네스가 이미 맡지 않는 가장 큰 부족함 하나"다. 하네스가 맡는 것(행별 테스트, `prokit-reviewer` 게이트, QA 행<!-- edition:pro -->, `prokit-deploy` 배포<!-- /edition -->, `GLOSSARY.md`·ADR과 용어·설계 질문, 간결성 규칙)은 추천 근거로 세지 않는다.

| PRD·스펙에서 보이는 신호 | 가장 큰 부족함 | 두뇌 추천 |
|---|---|---|
| 요구가 짧고 분명함, 화면만·프로토타입·튜토리얼·완성팩 적용, 계층 한두 개 | 없음. 하네스로 충분 | `none` |
| 핵심 개념·규칙·용어가 흐리고 사람이 정할 질문이 많음. 개발자가 진행 주도권을 쥐고 단계마다 기법만 골라 쓰고 싶음 | 요구 불명확·기법 부족 | `mattpocock` |
| 정확성·데이터 무결성이 중요한 기능이 많고, 설계 합의·테스트 먼저·작업별 리뷰 습관을 강하게 걸고 싶음 | 개발 규율 | `superpowers` |
| 운영할 제품이고 보안·성능·접근성·관측성 기준과 출시 후 점검이 요구됨. 팀이 같은 완료 기준을 써야 함 | 품질·출시 기준 | `agent-skills` |
| 무엇을 만들지(사용자 문제, 가치, 범위)부터 검토해야 하고 디자인·실사용 QA가 핵심 | 제품 판단·사용 경험 | `gstack` |
| 정확성·성능이 핵심인 기술적 깊이(복잡한 상태·동시성, 성능 목표, 재현이 어려운 버그)가 있고 코드를 적게 쓰고 실행 증거로 검증하길 원함. 가져온 기존 코드의 구조를 먼저 이해해야 할 때도 | 기술적 깊이·엄밀함 | `pstack` |
| 여러 세션에 걸친 큰 범위, 병렬 작업자, 장기 목표와 상태 추적 | 장기 실행 관리 | `oh-my` |
| 이미 있는 프로젝트<!-- edition:pro -->(운영 중, 초기)<!-- /edition -->에 변경 단위로 합의와 기록을 남기며 붙이고 싶음. 변경 제안을 사람이 먼저 확인해야 함 | 변경 합의·기록 | `openspec` |
| 요구가 크고 엄격해(규제, 계약, 대규모 전환) 원칙·스펙·계획·작업 목록을 단계마다 문서로 남겨야 함 | 스펙 문서화 | `spec-kit` |
| 오래 운영할 제품이고, 반복되는 문제와 결정을 기록해 다음 작업에 재사용하고 싶음. 리뷰를 여러 관점으로 깊게 받고 싶음 | 학습 축적 | `compound-engineering` |

- 신호가 약하거나 두 줄 이상이 비슷하게 맞으면 `none`을 추천한다.
- 두뇌는 하나를 추천한다. 사용자가 여럿을 원하면 단계 표에서 맡는 단계가 덜 겹치는 조합을 주 두뇌부터 제안하고, 진행 순서를 강제하는 두뇌(superpowers, gstack, oh-my)를 둘 이상 넣지 않는다.
- 지금 쓰는 도구가 그 두뇌를 지원하지 않으면 추천하지 않는다(위 두뇌 표).
- 추천 순서: ① 위 표로 두뇌 하나를 고른다. ② 추가 스킬의 신호를 PRD에 하나씩 대 보고 맞는 것을 모두 고르되, 고른 두뇌와 겹치는 것은 뺀다(두뇌가 `mattpocock`이면 빼지 않는다). 맞는 것이 없으면 추천 없음이다. ③ 과설계 방지 스킬, 응답 방식, 화면 디자인 보조를 아래로 고른다. ④ "두뇌 + 과설계 방지 스킬 + 추가 스킬(스킬마다 근거 신호 한 줄) + 응답 방식 + 화면 디자인 보조 + 설치하지 않는 스킬과 이유"를 한 번에 보여 준다.
- 과설계 방지 스킬은 선택지를 ponytail(추천), caveman, andrej-karpathy-skills, SKIP(기본 AI) 순서로 낸다. caveman은 토큰·비용 절감이나 짧은 답을 함께 원하거나 늘 켜지는 훅을 원하지 않을 때, karpathy는 이 지침을 이미 알고 선호하거나 짧은 지침 하나만 원할 때, SKIP은 외부 스킬을 줄이고 싶을 때 추천한다.
- 응답 방식은 i-have-adhd를 추천한다. `/i-have-adhd`로 켤 때만 동작해 설치해도 평소 답은 그대로이고, 필요할 때 짧은 행동 중심 답으로 바꿀 수 있다. 사용자가 길고 자세한 설명을 원한다고 했으면 SKIP을 추천한다.
- 화면 디자인 보조는 SKIP을 추천한다. PRD의 주 화면이 읽고 스크롤하는 공개 페이지(랜딩, 브랜드·제품 소개, 포트폴리오, 행사, 매장)이거나 "AI가 만든 티가 나지 않게", "어워드급"처럼 시각 완성도를 따로 요구하면 taste를 추천한다.
- 고르는 화면에는 추천한 것만이 아니라 모든 두뇌와 모든 추가 스킬을 내고, 추천한 것에 `(추천)`을 붙여 앞에 둔다. 고르는 것은 사용자다.
- 추천은 제안이다. 사용자가 고르거나 "알아서 골라줘"처럼 맡겼을 때만 설치한다. 답이 없거나 묻지 않는 흐름이면 두뇌·과설계 방지 스킬은 `none`, 추가 스킬·응답 방식 스킬·화면 디자인 보조는 설치하지 않고 보고에 추천과 설치 명령을 적는다.
