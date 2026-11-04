# 두뇌와 과설계 방지 흐름

> 한눈에: 고른 두뇌는 대조표의 단계 행(요구 명확화, 계획, 구현, 디버깅, 리뷰 관점, QA, 검증, 완료 기록)에서 일하는 방법을 바꾸고, 과설계 방지 스킬은 설계부터 리뷰까지 “얼마나 작게 만들지”를 지켜요. **무엇을 골라도 대조표, `prokit-reviewer` 최종 리뷰, audit은 그대로예요.** 고르는 법은 [두뇌와 선택 스킬](brains.md)에 있어요.

## 흐름

라운드 하나에서 두뇌와 과설계 방지 스킬이 붙는 곳이에요. `+` 뒤가 그 단계에 보태는 스킬이에요. 두뇌가 맡지 않는 단계는 프로킷 내장 절차(기본 칸)로 하고, 과설계 방지 스킬을 고르지 않아도 내장 간결성 규칙은 늘 지켜요.

```mermaid
---
config:
  flowchart:
    wrappingWidth: 230
---
flowchart TB
  R["요청<br/>“할 일에 마감일을 붙여줘”"] --> DC["prokit-dev-cycle<br/>케이스 판정 · 대조표 열기"]
  DC --> S1["요구 명확화<br/>+ 두뇌의 요구 스킬<br/>· 간결성 사다리"]
  S1 --> S2["계획<br/>+ 두뇌의 계획 스킬<br/>· 계획 간결성 기준"]
  S2 --> PR["계획 리뷰<br/>prokit-reviewer(plan)"]
  PR --> S3["구현<br/>수행 에이전트에 위임<br/>+ 위임 지시에 두뇌의 구현 스킬"]
  S3 --> S4["디버깅(C)<br/>+ 두뇌의 디버깅 스킬"]
  S4 --> RV["리뷰<br/>prokit-reviewer(code) 게이트<br/>+ 과설계 방지 보완 검토<br/>+ 두뇌의 리뷰 관점"]
  RV --> FX["지적 처리<br/>다시 확인한 지적만 반영"]
  FX --> QA["QA(F)<br/>+ 두뇌의 QA 스킬"]
  QA --> V["검증<br/>prokit-verify + 두뇌의 검증 스킬"]
  V --> DN["완료 기록<br/>+ 두뇌의 스펙 보관<br/>· 배운 것 기록"]
  DN --> AU["사용자 확인 · audit · close<br/>증거의 스킬 이름과<br/>읽은 기록 대조"]
  classDef opt stroke-dasharray: 5 5
  class S4,QA,DN opt
```

- 점선 단계는 케이스나 두뇌에 따라 있어요. 디버깅은 버그 수정(C), QA는 F 케이스에 있고, 완료 기록은 그 단계를 맡는 두뇌(openspec, spec-kit, compound-engineering)를 골랐을 때만 해요.
- 과설계 방지 스킬은 단계 하나가 아니라 라운드 내내 켜져 있어요. 계획 리뷰와 리뷰에서 그 스킬의 기준으로 한 번 더 봐요([과설계 방지 스킬이 하는 일](#과설계-방지-스킬이-하는-일)).

## 구조

`prokit-dev-cycle`이 `.dev-cycle.json`에 적힌 구성을 읽고, 단계 행마다 어느 파일의 방법을 쓸지 정해요. 메인 세션이 그 스킬을 부르거나 위임 지시에 넣고, 쓴 스킬 이름은 대조표 증거로 모여 audit이 훅 기록과 대조해요. 점선 테두리는 고른 구성에 따라 있을 때만 쓰는 선택이에요.

```mermaid
---
config:
  flowchart:
    wrappingWidth: 150
    rankSpacing: 30
---
flowchart TB
  CFG[".dev-cycle.json<br/>brain · simplicity"] --> DC["prokit-dev-cycle<br/>대조표 단계 행"]
  DC --> BF["두뇌 파일<br/>brains/두뇌.md"]
  DC --> PRT["process-routing.md"]
  BF ~~~ PRT
  BF --> MAIN["메인 세션<br/>스킬 부르기 · 위임<br/>지적 처리"]
  PRT --> MAIN
  MAIN --> W
  subgraph W["일을 맡기고 검토하는 곳"]
    IMP["수행 에이전트<br/>구현"]
    SIM["과설계 방지<br/>리뷰"]
    BA["두뇌 에이전트<br/>읽기 전용 검토"]
    REV["prokit-reviewer<br/>plan · code<br/>게이트"]
    IMP ~~~ SIM ~~~ BA
    BA --> REV
  end
  W --> EV["대조표 증거<br/>사용: 스킬<br/>반영 a, 기각 b"]
  EV --> AU["dev-cycle audit<br/>스킬 이름과<br/>읽은 기록 대조"]
  classDef opt stroke-dasharray: 5 5
  class SIM,BA opt
```

수행 에이전트, 과설계 방지 리뷰, `prokit-reviewer`가 낸 결과가 대조표 증거로 모여요. 두뇌 에이전트의 검토는 `prokit-reviewer`로 이어져요.

| 파일 | 하는 일 |
|---|---|
| `.dev-cycle.json`의 `brain`, `simplicity` | 고른 두뇌(하나면 이름, 여럿이면 목록. 첫 값이 주 두뇌)와 과설계 방지 스킬이에요. `none`이면 기본 칸으로 진행해요 |
| `prokit-dev-cycle/references/process-routing.md` | 두뇌가 없을 때 단계마다 하는 기본 방법(기본 칸), 무엇을 골라도 지키는 간결성 규칙, 과설계 방지 스킬마다 맡는 일(역할 표)이 있어요 |
| `prokit-dev-cycle/references/brains/<두뇌>.md` | 그 두뇌가 맡는 단계의 스킬 이름, 프로킷에서 건너뛰는 단계(커밋, 브랜치, PR 등), 두뇌가 주는 에이전트가 있어요 |
| `prokit-dev-cycle/references/brains/README.md` | 두뇌 목록, 여럿일 때 단계를 나누는 단계 표, PRD로 추천하는 기준이 있어요 |
| `.prokit/skills-used.jsonl` | 훅이 스킬 호출과 `SKILL.md` 읽기를 남기는 기록이에요. 커밋하지 않아요 |

## 단계마다 어느 두뇌를 쓰나

단계 행을 시작할 때 아래 순서로 방법을 정해요. 두뇌가 하나여도 같아요.

```mermaid
---
config:
  flowchart:
    wrappingWidth: 160
    rankSpacing: 30
---
flowchart TB
  ROW["단계 행<br/>예: 계획 단계"] --> Q1(["목록 순서에서<br/>이 단계를 맡는<br/>두뇌가 있나요"])
  Q1 -->|"있어요"| B["그 첫 두뇌의 스킬<br/>사용: 스킬 이름"]
  Q1 -->|"없어요"| Q2(["이 단계를 맡는<br/>추가 스킬이<br/>설치됐나요"])
  B -->|"쓸 수 없으면"| BL["blocked: 사유"]
  BL ~~~ Q2
  Q2 -->|"있어요"| M["mattpocock 추가 스킬<br/>사용: 스킬(추가 스킬)"]
  Q2 -->|"없어요"| D["기본 칸(내장 절차)<br/>사용: 내장(단계): 사유"]
  M ~~~ D
  classDef opt stroke-dasharray: 5 5
  class BL opt
```

아래 표에서 ●가 그 두뇌가 맡는 단계예요. 빈칸 단계는 다음 두뇌나 기본 칸으로 넘어가요.

| 두뇌 | 요구 명확화 | 계획 | 구현 | 디버깅 | 리뷰 관점 | QA | 검증 | 완료 기록 |
|---|---|---|---|---|---|---|---|---|
| superpowers | ● | ● | ● | ● | ● 지적 처리 | | ● | |
| agent-skills | ● | ● | ● | ● | ● | ● 보조 | | |
| gstack | ● 제품 판단 | ● 리뷰 보강 | | ● | ● | ● | | |
| oh-my | ● | ● | ● | ● | ● | | ● | |
| pstack | ● 요구 확인 | ● | ● | ● | ● | | | |
| mattpocock | ● | 고른 추가 스킬 | 고른 추가 스킬 | 고른 추가 스킬 | 고른 추가 스킬 | | | |
| openspec | ● | ● | ● | | | | | ● 스펙 보관 |
| spec-kit | ● | ● | ● | | | | | ● 남은 일 확인 |
| compound-engineering | ● | ● | ● | ● | ● | | | ● 배운 것 |

- **예**: `--brain openspec,superpowers`면 요구 명확화, 계획, 구현, 완료 기록은 openspec이, 디버깅, 리뷰 지적 처리, 검증은 superpowers가 맡아요. 둘 다 맡지 않는 QA는 기본 칸이에요.
- **겹치면**: 두 두뇌가 같은 단계를 맡으면 목록 앞의 두뇌만 써요. 사용자가 뒤 두뇌의 스킬을 직접 부르면 그 요청을 따라요.
- **함께 고르지 않는 두뇌**: superpowers, gstack, oh-my는 세션 시작 훅이나 전역 지시로 진행 순서를 강제해서 둘 이상 고르지 않아요.

## 두뇌마다 단계에서 하는 일

두뇌가 맡는 단계만 그렸어요. 이름은 Claude Code에서 부르는 이름이고 플러그인 접두어(`superpowers:` 등)는 뺐어요. 다른 도구에서 쓰는 이름은 설치된 프로젝트의 `brains/<두뇌>.md`에 있어요. 점선 테두리는 고른 추가 스킬이 있거나 마무리 점검처럼 필요할 때만 써요.

### 진행 규율: superpowers와 agent-skills

superpowers는 설계 합의, 계획, 테스트 먼저, 작업별 리뷰를 강하게 걸어요. agent-skills는 스펙부터 출시까지 보안·성능·접근성 기준을 단계별 명령(`/spec`, `/plan`, `/build`, `/test`, `/review`, `/ship`)으로 걸어요.

```mermaid
---
config:
  flowchart:
    wrappingWidth: 280
---
flowchart TB
  subgraph AS["agent-skills"]
    AS1["요구 명확화<br/>spec-driven-development"] --> AS2["계획<br/>planning-and-task-breakdown"]
    AS2 --> AS3["구현<br/>incremental-implementation<br/>+ test-driven-development"]
    AS3 --> AS4["디버깅(C)<br/>debugging-and-error-recovery"]
    AS4 --> AS5["리뷰 관점<br/>code-review-and-quality<br/>security-and-hardening<br/>performance-optimization"]
    AS5 --> AS6["QA 보조<br/>browser-testing-with-devtools"]
    AS6 --> AS7["마무리 점검<br/>shipping-and-launch"]
  end
  subgraph SP["superpowers"]
    SP1["요구 명확화<br/>brainstorming"] --> SP2["계획<br/>writing-plans"]
    SP2 --> SP3["구현<br/>subagent-driven-development<br/>+ test-driven-development"]
    SP3 --> SP4["디버깅(C)<br/>systematic-debugging"]
    SP4 --> SP5["리뷰 지적 처리<br/>receiving-code-review"]
    SP5 --> SP6["검증<br/>verification-before-completion<br/>+ prokit-verify"]
  end
  AS ~~~ SP
  classDef opt stroke-dasharray: 5 5
  class AS7 opt
```

### 진행 규율: pstack과 mattpocock

pstack(Claude Code만)은 `poteto-mode`가 일에 맞는 플레이북을 골라 코드는 적게 쓰고 실행 증거로 검증해요. mattpocock은 늘 설치하는 `grilling`으로 요구를 묻고, 나머지 단계는 고른 추가 스킬로 해요.

```mermaid
---
config:
  flowchart:
    wrappingWidth: 260
---
flowchart TB
  subgraph MP["mattpocock"]
    MP1["요구 명확화<br/>grilling(늘 설치)"] --> MP2["계획<br/>codebase-design · prototype<br/>research"]
    MP2 --> MP3["구현<br/>tdd"]
    MP3 --> MP4["디버깅(C)<br/>diagnosing-bugs"]
    MP4 --> MP5["리뷰 관점<br/>code-review"]
    MP5 --> MP6["인계<br/>handoff · pr"]
  end
  subgraph PS["pstack"]
    PS1["요구 확인<br/>in-your-own-words"] --> PS2["계획<br/>poteto-mode 플레이북<br/>+ architect · how"]
    PS2 --> PS3["구현<br/>플레이북의 구현 단계<br/>+ tdd<br/>+ typescript-best-practices"]
    PS3 --> PS4["디버깅(C)<br/>Bug fix · Perf 플레이북<br/>+ benchmark-checklist"]
    PS4 --> PS5["리뷰 관점<br/>interrogate · blast-radius"]
  end
  MP ~~~ PS
  classDef opt stroke-dasharray: 5 5
  class MP2,MP3,MP4,MP5,MP6 opt
```

### 스펙 주도: openspec과 spec-kit

둘 다 구현 전에 문서로 합의하고 끝나면 스펙에 남겨요. openspec은 변경마다 제안을 만들어 가볍게, spec-kit은 원칙부터 작업 목록까지 꼼꼼히 밟아요.

```mermaid
---
config:
  flowchart:
    wrappingWidth: 230
---
flowchart TB
  subgraph SK["spec-kit"]
    SK0["원칙(프로젝트당 한 번)<br/>/speckit-constitution"] --> SK1["요구 명확화<br/>/speckit-specify<br/>/speckit-clarify"]
    SK1 --> SK2["계획<br/>/speckit-plan<br/>/speckit-tasks<br/>/speckit-checklist<br/>/speckit-analyze"]
    SK2 --> SK3["구현<br/>/speckit-implement"]
    SK3 --> SK4["남은 일 확인<br/>/speckit-converge"]
  end
  subgraph OS["openspec"]
    OS1["요구 명확화<br/>/opsx:explore<br/>→ /opsx:propose<br/>proposal · design · tasks"] --> OS2["계획<br/>design.md · tasks.md<br/>고칠 때 /opsx:update"]
    OS2 --> OS3["구현<br/>/opsx:apply<br/>tasks.md를 차례로"]
    OS3 --> OS4["완료 기록<br/>/opsx:archive<br/>openspec/specs/에 반영"]
  end
  SK ~~~ OS
```

### 제품·장기 실행·학습: gstack, oh-my, compound-engineering

gstack은 무엇을 만들지 검토하는 제품 판단과 실사용 QA가, oh-my는 큰 작업의 병렬·반복 실행이, compound-engineering은 배운 것을 `docs/solutions/`에 쌓는 일이 강해요.

```mermaid
---
config:
  flowchart:
    wrappingWidth: 200
---
flowchart TB
  subgraph OM["oh-my"]
    OM1["요구 명확화<br/>deep-interview"] --> OM2["계획<br/>omc-plan · ralplan"]
    OM2 --> OM3["구현<br/>수행 에이전트 위임<br/>큰 병렬은 team<br/>반복은 ralph"]
    OM3 --> OM4["디버깅(C)<br/>trace"]
    OM4 --> OM5["리뷰 관점<br/>omc-review"]
    OM5 --> OM6["검증<br/>verify + prokit-verify"]
  end
  subgraph GS["gstack"]
    GS1["요구(제품 판단)<br/>office-hours<br/>plan-ceo-review"] --> GS2["계획 리뷰 보강<br/>plan-eng-review<br/>plan-design-review"]
    GS2 --> GS3["디버깅(C)<br/>investigate"]
    GS3 --> GS4["리뷰 관점<br/>review · design-review<br/>cso"]
    GS4 --> GS5["QA<br/>qa-only(보고만)"]
  end
  OM ~~~ GS
```

```mermaid
---
config:
  flowchart:
    wrappingWidth: 200
---
flowchart TB
  subgraph CE["compound-engineering"]
    CE1["요구 명확화<br/>/ce-brainstorm"] --> CE2["계획<br/>/ce-plan<br/>docs/solutions/ 읽기"]
    CE2 --> CE3["구현<br/>/ce-work"]
    CE3 --> CE4["디버깅(C)<br/>/ce-debug"]
    CE4 --> CE5["리뷰 관점<br/>/ce-code-review<br/>/ce-simplify-code"]
    CE5 --> CE6["QA 보조<br/>/ce-test-browser"]
    CE6 --> CE7["배운 것 기록<br/>/ce-compound"]
  end
```

어느 두뇌든 프로킷 라운드 안에서는 이렇게 써요.

- **하지 않는 일**: 두뇌 스킬이 스스로 커밋, 브랜치, worktree, PR을 만들거나 리뷰하면서 바로 고치라고 해도 건너뛰어요.<!-- edition:pro --> 배포는 두뇌의 출시 명령이 아니라 `prokit-deploy`로 해요.<!-- /edition -->
- **끝의 기준**: 두뇌의 실행 모드(oh-my의 `ralph`, `team` 등)가 끝났다고 보고해도 증거가 아니에요. 라운드가 끝났는지는 `pnpm dev-cycle audit`만 판정해요. 구현 스킬이 끝에 브랜치 마무리를 불러도 대조표의 다음 행으로 가요.
- **구현**: 늘 그 계층 수행 에이전트가 해요. 두뇌의 구현 스킬 이름은 위임 지시에 적혀 수행 에이전트가 따라요.

## 과설계 방지 스킬이 하는 일

과설계 방지 스킬은 “얼마나 작게, 어디까지 고칠지”를 정해요. 아래 사다리, “만들지 않는 것” 절, `shortcut:` 주석, 지적 처리는 무엇을 골라도 지키는 하네스 규칙이고, 고른 스킬이 그 위에 기준과 리뷰를 더해요.

### 늘 지키는 사다리

스펙의 범위와 구조를 정할 때마다 위에서부터 물어요. 보안, 입력 검증, 접근성, 사용자가 요청한 것은 사다리로 빼지 않아요.

```mermaid
---
config:
  flowchart:
    wrappingWidth: 190
    rankSpacing: 30
---
flowchart TB
  Q0(["지금 필요한가요<br/>아니요: 만들지 않아요"]) -->|"예"| Q1(["이미 코드에 있나요<br/>예: 그대로 써요"])
  Q1 -->|"아니요"| Q2(["표준 라이브러리에 있나요<br/>예: 그대로 써요"])
  Q2 -->|"아니요"| Q3(["플랫폼 기능에 있나요<br/>예: 그대로 써요"])
  Q3 -->|"아니요"| Q4(["설치된 의존성에 있나요<br/>예: 그대로 써요"])
  Q4 -->|"아니요"| NEW["새 코드<br/>가장 짧게 동작하는 해법"]
```

- 첫 질문의 답이 아니요면 만들지 않아요. 스펙의 만들지 않는 것에 뺀 것과 다시 넣을 조건을 적어요.
- 뒤의 네 질문 가운데 하나라도 답이 예면 있는 것을 그대로 써요. 모두 아니요일 때만 새 코드를 써요.

일부러 한계를 둔 단순화는 코드에 `shortcut:` 주석으로 한계와 넘으면 할 일을 적어요.

### 스킬마다 맡는 일

고른 스킬이 계획 간결성 기준, 구현 diff 보완 검토, F 케이스의 공통화·리팩토링 행을 맡아요. diff를 검토하는 스킬이 없는 karpathy와 없음(기본 AI)은 `prokit-reviewer(code)`가 간결성까지 함께 봐요.

```mermaid
---
config:
  flowchart:
    wrappingWidth: 190
---
flowchart TB
  subgraph CV["caveman"]
    CV1["일에 맞는 작업 스킬<br/>새 기능 lean-build<br/>버그 surgical-patch"] --> CV2["계획 기준<br/>lean-build<br/>(C는 surgical-patch)"]
    CV2 --> CV3["구현 diff 보완 검토<br/>caveman-review"]
    CV3 --> CV4["F 공통화<br/>safe-refactor"]
  end
  subgraph PT["ponytail"]
    PT1["늘 켜짐<br/>ponytail 모드<br/>(플러그인 훅)"] --> PT2["계획 기준<br/>ponytail"]
    PT2 --> PT3["구현 diff 보완 검토<br/>ponytail-review"]
    PT3 --> PT4["F 공통화<br/>ponytail-review"]
    PT4 --> PT5["요청할 때만<br/>ponytail-audit · debt<br/>help · gain"]
  end
  CV ~~~ PT
  classDef opt stroke-dasharray: 5 5
  class PT5 opt
```

```mermaid
---
config:
  flowchart:
    wrappingWidth: 200
---
flowchart TB
  subgraph NO["없음(기본 AI)"]
    NO1["하네스 규칙만"] --> NO2["계획 기준<br/>하네스 사다리"]
    NO2 --> NO3["구현 diff 검토<br/>prokit-reviewer(code)<br/>focus에 간결성"]
    NO3 --> NO4["F 공통화<br/>하네스 공통화 범위<br/>+ prokit-reviewer(code)"]
  end
  subgraph KP["karpathy"]
    KP1["코드 작업 때<br/>karpathy-guidelines"] --> KP2["계획 기준<br/>karpathy-guidelines"]
    KP2 --> KP3["구현 diff 검토<br/>prokit-reviewer(code)<br/>focus에 간결성"]
    KP3 --> KP4["F 공통화<br/>prokit-reviewer(code)<br/>+ 정밀 수정 원칙"]
  end
  NO ~~~ KP
```

- 계획 기준은 `prokit-reviewer(plan)`이 계획을 볼 때 읽어요. 코드 diff용 보완 검토가 계획 리뷰를 대신하지 않아요.
- 보완 검토는 `prokit-reviewer(code)` 게이트를 대신하지 않아요. 결과는 리뷰 행 증거 뒤에 `ponytail-review: 반영 2(Must fix 1), 기각 1, 백로그 1`처럼 덧붙여요.
- 고른 스킬의 규칙이 `AGENTS.md`, `prokit-*`, 대조표와 부딪히면 프로킷 쪽이 먼저예요. 대조표 행, 구현 전 질문, 보안 검사, 입력 검증은 줄이지 않아요.

### 리뷰 지적 처리

보완 검토와 `prokit-reviewer`의 지적은 같은 기준으로 처리해요. 이번 라운드가 만든 문제만 이 라운드에서 고치고, 잘 돌던 기존 코드는 간결성 지적을 이유로 고치지 않아요.

```mermaid
---
config:
  flowchart:
    wrappingWidth: 200
---
flowchart TB
  Q(["리뷰 지적이 코드에서<br/>다시 확인되나요"]) -->|"예"| K
  Q -->|"아니요"| X["근거를 적고 기각"]
  K ~~~ X
  subgraph K["확인된 지적의 처리"]
    K1["정확성 · 보안<br/>데이터 손실 · 부하<br/>회귀 테스트를 먼저<br/>더하고 고쳐요"]
    K2["테스트 누락<br/>이번 diff의 로직이면<br/>테스트 하나를 더해요"]
    K3["이번 라운드가<br/>만들지 않은 문제<br/>tasks/todo.md 백로그"]
    K4["속도<br/>측정 근거가 있을 때만<br/>고치고 없으면 백로그"]
    K5["간결성<br/>이번 diff 안에서<br/>동작이 같은 것만 반영"]
    K1 ~~~ K2 ~~~ K3 ~~~ K4 ~~~ K5
  end
```

## 관련 문서

- [스킬 구조 한눈에](skill-map.md)
- [두뇌와 선택 스킬](brains.md)
- [공식 스킬과 연결](official-skills.md)
- [대조표와 라운드](../concepts/dev-cycle.md)
- [케이스](../concepts/cases.md)
- [에이전트 역할](../concepts/agent-roles.md)
