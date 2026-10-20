# 두뇌와 선택 스킬

> 한눈에: 프로젝트마다 "어떤 순서로 진행할지"(두뇌)와 "얼마나 작게 만들지"(과설계 방지 스킬)를 하나씩 고르거나 고르지 않을 수 있어요. **아무것도 고르지 않으면 지금 쓰는 에이전트가 프로킷 내장 절차로 진행해요.** 새 프로젝트를 만들 때 `prokit-init` 스킬이 PRD를 먼저 받고, PRD에 맞는 것에 추천 표시를 붙여 물어봐요. PRD가 없으면 init하지 않아요.

## 고르는 네 가지

| 구분 | 고르는 수 | 기본 | 고르는 명령 |
|---|---|---|---|
| 두뇌 | 0\~1 | 없음(기본 AI) | `pnpm skills:setup --brain <이름>` |
| 과설계 방지 스킬 | 0\~1 | 없음(기본 AI) | `pnpm skills:setup --simplicity <이름>` |
| mattpocock 추가 스킬 | 0개 이상 | 설치 안 함 | `pnpm skills:setup --matt <스킬>` |
| 응답 방식(i-have-adhd) | 0\~1 | 설치 안 함 | `pnpm skills:setup --optional i-have-adhd` |

## 새 프로젝트에서 고르는 순서

1. **PRD 주기**: PRD 파일이나 붙여 넣은 글, 요청 속 서비스 설명(누가 쓰는지와 핵심 기능), 프리셋 팩 중 하나가 있어야 해요. pro-kit 폴더에서 에이전트를 열었다면 스킬을 부르면서 줄 수도 있어요(Claude Code는 `/prokit-init <PRD 파일 경로나 내용>`, Codex는 `$prokit-init …`). 없으면 에이전트가 맨 먼저 PRD를 달라고 해요. 그래도 주지 않으면 PRD가 왜 필요한지 알리고 프로젝트를 만들지 않은 채 끝나요.
2. **추천 보기**: 에이전트가 PRD로 두뇌 일곱 개(없음 포함) 가운데 하나를 추천하고 근거 문장을 보여 줘요.
3. **고르기**: 두뇌, 과설계 방지 스킬, 응답 방식을 한 번에 골라요. 추천한 선택지에 `(추천)`이 붙어 맨 앞에 있어요. 처음 질문에 없는 두뇌는 `다른 두뇌 보기`로 골라요.
4. **추가 스킬 고르기**: mattpocock 추가 스킬 <!-- v:mattpocock.pool.count -->14<!-- /v -->개를 여러 개 골라요. PRD에 맞는 스킬에 `(추천)`이 붙어 있어요.

이미 정한 항목(예: "두뇌는 superpowers")은 다시 묻지 않고, "알아서 골라줘"처럼 맡긴 항목은 추천대로 설치해요.

## 하나만 고르는 이유

두뇌와 과설계 방지 스킬은 둘 이상 함께 두면 지시가 서로 덮어써요. 그래서 하나만 설치하고, 고른 값을 `.dev-cycle.json`의 `brain`·`simplicity`에 적어 둬요. 대조표, 위임 검증, `prokit-reviewer` 최종 리뷰, audit, 사용자 확인, `prokit-deploy` 배포는 무엇을 골라도 그대로예요.

## 두뇌

| 이름 | 이럴 때 골라요 | 쓰는 도구 |
|---|---|---|
| 없음(기본 AI) | 지금 에이전트가 프로킷 내장 절차로 진행해요. 충돌이 없고 가장 가벼워요 | 모든 도구 |
| `superpowers` | 설계 합의, 계획, 테스트 먼저, 작업별 리뷰를 강하게 거는 규율형이에요 | Claude Code, Codex, Antigravity, Grok Build |
| `agent-skills` | 스펙부터 출시까지 보안·성능·접근성 기준을 단계별 명령으로 걸어요 | Claude Code, Codex, Antigravity, Grok Build |
| `gstack` | 무엇을 만들지 검토하는 제품 판단, 디자인, 실사용 QA가 강해요. 전역 설치(Bun)가 필요해요 | Claude Code, Codex |
| `oh-my` | 여러 세션에 걸친 큰 작업을 자동·병렬 모드로 돌려요(Claude Code는 OMC, Codex는 OMX) | Claude Code, Codex(전역 OMX CLI 필요) |
| `pstack` | React 코어팀 poteto의 엄격한 엔지니어링 방식이에요. `poteto-mode`가 일에 맞는 플레이북(기능, 버그, 성능, 리팩터, 시안)을 골라 코드는 적게 쓰고 실행 증거로 검증해요 | Claude Code만 |
| `mattpocock` | 늘 설치하는 mattpocock 3개에 PRD에 맞는 추가 스킬을 골라 단계마다 기법으로 써요. 개발자가 진행을 쥐고 필요한 기법만 더해요 | Claude Code, Codex, Antigravity, Grok Build |

두뇌를 지원하지 않는 도구로 같은 프로젝트를 열면 그 도구는 내장 절차로 진행해요. 용어와 설계 결정을 묻고 적는 일은 두뇌와 상관없이 `grilling`·`domain-modeling`이 맡아요.

## 과설계 방지 스킬

| 이름 | 이럴 때 골라요 |
|---|---|
| `ponytail` (추천) | 늘 켜지는 미니멀 모드로 가장 작게 만들고, 구현 diff를 `ponytail-review`로 점검해요. 가장 활발히 갱신 중이에요 |
| `caveman` | 새 기능·버그·리팩터마다 간결 패턴을 쓰고 한 줄 리뷰를 받아요. `/caveman`으로 답변도 짧게 줄여요. 압축 규칙은 영어 기준이에요 |
| `karpathy` (andrej-karpathy-skills) | 카파시의 네 원칙(코딩 전 생각, 단순함, 정밀 수정, 검증 목표) 지침 하나예요. 가장 유명하지만 최근 갱신은 적어요 |
| 없음(기본 AI) | 따로 설치하지 않고 프로킷 내장 간결성 규칙(재사용 순서, "만들지 않는 것")으로 진행해요 |

고른 스킬이 계획의 간결성 기준, 구현 diff 보완 검토, 공통화 점검을 맡아요. diff를 검토하는 스킬이 없는 karpathy와 "없음"은 `prokit-reviewer`가 간결성까지 함께 봐요. 어느 쪽이든 스킬이 없다는 이유로 리뷰 행을 막지 않아요.

## mattpocock 스킬과 응답 방식

- **늘 설치**: `domain-modeling`, `grilling`, `grill-with-docs`. 용어와 설계 질문에 써요.
- **고르면 설치**: <!-- v:mattpocock.pool.count -->14<!-- /v -->개예요. 구현·설계(`tdd`, `codebase-design`, `prototype`, `improve-codebase-architecture`), 디버깅·검토(`diagnosing-bugs`, `code-review`, `pr`, `writing-for-agents`), 조사·외부 설정(`research`, `wizard`, `to-questionnaire`), 인계·학습(`handoff`, `teach`, `wait-what`)으로 나눠 물어봐요. 목록에는 모두 나오고 PRD에 맞는 스킬에 `(추천)`이 붙어요. 고른 두뇌가 같은 일을 하는 스킬은 추천하지 않아요(두뇌가 `mattpocock`이면 빼지 않아요).
- **i-have-adhd**: 다음 행동부터, 번호 단계로, 다음 할 일 하나로 짧게 답해요. `/i-have-adhd`로 켤 때만 쓰고 대화 답에만 적용해요. 켜기 전에는 평소 답 그대로라 새 프로젝트에서는 설치를 추천해요.

## 바꾸기

열린 라운드를 닫은 뒤 그 프로젝트의 H 라운드에서 바꿔요.

```bash
pnpm skills:setup --brain superpowers --simplicity ponytail   # 고른 것을 기록하고 설치, 고르지 않은 설치본은 지운다
pnpm skills:setup --brain none                                 # 두뇌를 빼고 내장 절차로 돌아간다
pnpm skills:setup --matt tdd,research                          # 추가 스킬을 더한다(기록하지 않는다)
pnpm skills:check                                              # 고르지 않은 두뇌·과설계 방지 스킬이 남아 있으면 exit 1
```

## 자세히

- **정리 기준**: `--brain`이나 `--simplicity`를 주면 그 항목에서 고르지 않은 설치본을 이름이 아니라 출처로 찾아 지워요. 스킬은 `skills-lock.json`의 출처, 플러그인은 ID, OMX는 `.omx/setup-scope.json`으로 판정해요. 추가 스킬과 선택 묶음은 지우지 않아요.
- **전역 설치본**: 이 컴퓨터 전역에 켜진 고르지 않은 플러그인(예: superpowers, ponytail)과 gstack 개인 스킬은 `.claude/settings.local.json`(커밋하지 않는 개인 설정)으로 이 프로젝트에서만 꺼요. impeccable과 같은 일을 하는 `frontend-design` 플러그인도 같아요. 전역 `~/.claude/CLAUDE.md`의 OMC 블록과 Codex 전역 스킬은 끌 수 없어 경고만 해요.
- **전역 설치가 필요한 두뇌**: gstack과 OMX CLI는 정식 설치가 전역뿐이라 그 두뇌를 고를 때만 설치해요. 다른 두뇌로 바꿔도 전역 설치본은 지우지 않아요.
- **정본**: 선택지 설명, 추천 기준, 두뇌별 단계 이름은 설치된 프로젝트의 `.agents/skills/prokit-dev-cycle/references/brains/`에 있어요. 고른 과설계 방지 스킬이 맡는 일은 같은 폴더의 `process-routing.md` 규칙 6 역할 표예요.

## 관련 문서

- [공식 스킬과 연결](official-skills.md)
- [선택 스킬 묶음](optional-bundles.md)
- [설치와 업데이트 구조](install-and-update.md)
- [기존 프로젝트에 갱신 반영](../templates/update-existing.md)
