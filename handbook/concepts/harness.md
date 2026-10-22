# 하네스 엔지니어링

> 한눈에: 하네스는 에이전트가 정해진 순서와 검사를 지키며 일하게 만드는 규칙, 스킬, 자동 검사의 묶음이에요. 에이전트에게 "잘해 줘"라고 부탁하는 대신 해야 할 일과 확인할 일을 파일과 명령으로 정해 둬요. **그래서 누가 요청하든 에이전트가 같은 순서로 일해요.**

## 하네스를 이루는 것

템플릿을 설치하면 프로젝트에 다섯 가지가 생겨요.

| 부분 | 파일 | 하는 일 |
|---|---|---|
| 규칙 문서 | `AGENTS.md`, `CLAUDE.md`, `GLOSSARY.md`, `docs/domain/project.md` | 에이전트가 시작할 때 읽는 개발 원칙과 공통 규칙, 용어집, 프로젝트 소개. `CLAUDE.md`는 `@AGENTS.md`로 같은 지침을 읽어요 |
| 스킬 | `.agents/skills/prokit-*` <!-- v:prokit.skills.count -->10<!-- /v -->개와 공식 스킬 | 분야마다 일하는 법을 알려 줘요. 대조표의 행마다 그 단계에서 읽을 공식 스킬이 정해져 있어요 |
| 역할 나누기 | `.claude/agents/prokit-implementer.md`, `specialist-reviewer.md`, `prokit-analyzer.md`, `prokit-reviewer.md` | 코디네이터가 수행자와 읽기 전용 분석·리뷰를 나눠 맡겨요. `prokit-reviewer(...)` 통합 리뷰 행은 최종 리뷰어만 채울 수 있어요 |
| 대조표와 audit | `scripts/dev-cycle.mjs`, `.dev-cycle.json`, `docs/dev-workflow.md`, `tasks/` | 작업을 케이스로 나누고 케이스별 대조표를 연 뒤 빈칸이 없는지 검사해요. 큰 일은 `tasks/plan.md`의 진행 계획으로 Task를 나누고, 앞 Task가 끝나야 다음 Task 라운드가 열려요 |
| 자동 검사 | `.dev-cycle.json`의 `commands`, `pnpm skills:check`, `pnpm agents:check`, `pnpm dev-cycle secrets`, `pnpm vercel:deploy … --check` | 타입, 린트, 빌드, 테스트, 스킬과 에이전트 상태, 비밀값, 배포 준비를 명령으로 확인해요. 실행한 결과가 곧 증거예요 |

## 요청이 흘러가는 길

코드를 바꾸는 작업은 `prokit-dev-cycle`에서 시작해요. 요청이 어떤 케이스인지 정하고 대조표를 연 다음, 행마다 분야별 스킬과 프로세스 스킬을 불러 써요. 코디네이터는 실제 출처와 범위를 확인한 전문 공급자를 `prokit-implementer`에 연결하고, 공급자 자체의 내장 리뷰가 없을 때만 `specialist-reviewer`에 보완 검토를 맡겨요. 최종 통합 리뷰는 `prokit-reviewer`가 매번 해요.

배포 요청은 코드를 바꾸지 않으므로 라운드를 열지 않고 `prokit-deploy`가 맡아요. 배포와 운영 DB 적용은 중간에 사용자 동의가 필요해서 서브에이전트(보조 에이전트)에 맡기지 않고 메인 세션에서 해요. 선택 묶음에 해당하는 분야인데 스킬이 없으면 에이전트가 설치를 제안해요.

```mermaid
flowchart TD
  REQ["사용자 요청<br/>…을 만들어줘 · 고쳐줘"] --> DC["prokit-dev-cycle<br/>케이스 판정 · 대조표"]
  RULES["AGENTS.md · GLOSSARY.md<br/>docs/domain/project.md"] -.->|시작할 때 읽는다| DC
  DC --> LAYER["계층 스킬<br/>prokit-web · prokit-ui · prokit-api · prokit-db · prokit-verify"]
  LAYER --> OFF["공식 도메인 스킬<br/>Next.js · React · Better Auth · shadcn<br/>impeccable · Neon 또는 Supabase · Vercel"]
  DC -.->|대조표 행이 읽을 스킬을 지정| OFF
  DREQ["배포 요청<br/>develop에 올려줘 · 운영 배포"] --> DEP["prokit-deploy<br/>메인 세션에서 --check → DB → 배포 → 확인"]
  DEP --> OFF
  LAYER -.->|그 분야일 때| OPT["선택 스킬 묶음<br/>ops · motion · mobile · i-have-adhd · taste<br/>없으면 설치 제안"]
  DEP -.->|비용·성능 점검| OPT
  DC --> PROC["두뇌 · 과설계 방지 스킬(고른 것만)<br/>없으면 내장 절차와 간결성 규칙"]
  DC --> IMP["prokit-implementer<br/>검증한 전문 공급자 수행"]
  IMP -.->|내장 리뷰 없음| SREV["specialist-reviewer<br/>전문 계약 읽기 전용 검토"]
  IMP --> REV["prokit-reviewer<br/>최종 통합 리뷰<br/>plan · code · security · db"]
  SREV --> REV
  DC -->|모든 행의 증거를 채운 뒤| AUD["pnpm dev-cycle audit"]
  AUD --> CLOSE["pnpm dev-cycle close"]
```

## 자세히

- **프로세스 스킬 고르기**: 설계, 계획, 구현, 디버깅, 리뷰, QA, 검증에 쓸 프로세스 스킬은 설치된 프로젝트의 `.agents/skills/prokit-dev-cycle/references/process-routing.md`에 표로 정리돼 있어요. 단계마다 1순위 스킬, Claude와 Codex의 대안, 스킬이 없을 때의 절차가 적혀 있어요. 필요한 전문 스킬이 없으면 검증한 대안을 찾고, 대안도 없으면 막힌 이유를 남겨요.
- **과설계 막기**: 스펙에 "만들지 않는 것" 절을 두고, 계획은 `prokit-reviewer(plan)`이 재사용·설정 결정까지 검토해요. 고른 과설계 방지 스킬(ponytail 추천, caveman, karpathy)이 계획 기준과 구현 diff 검토를 맡고, 고르지 않으면 내장 간결성 규칙과 `prokit-reviewer`가 맡아요. 어떤 스킬의 규칙보다 `prokit-dev-cycle`, `AGENTS.md`, 대조표가 우선해요([두뇌와 선택 스킬](../skills/brains.md)).
- **하네스를 고치는 일**: 스킬, 에이전트, dev-cycle 자체와 빌드·배포·작업공간 설정을 바꾸는 작업도 라운드로 해요. 케이스 H예요([케이스 <!-- v:devCycle.cases.range -->A\~F·H<!-- /v -->와 대조표](cases.md)). 대조표 행의 정본인 `docs/dev-workflow.md`는 프로젝트에 맞게 고쳐도 되고, 고치는 일 자체가 케이스 H 변경이에요.
- **새 세션도 같은 규칙으로**: 규칙 문서와 대조표가 파일로 남아 있어서 새 세션은 `pnpm dev-cycle status`로 진행 중인 라운드를 이어받아요. 닫은 라운드와 완료한 일반 할 일은 `tasks/archive/README.md`에서 찾고, `tasks/todo.md`에는 남은 항목만 남아요.
- **공급자와 자원 경계**: 매니페스트는 설치할 항목의 정본이에요. 실제 공급자 선택은 출처·내용 해시·범위·의존성·부작용을 확인하고 정해요. 현재 작업에 연결된 프로젝트·워크트리·관리 임시 폴더만 보수적으로 재고, 전역 정리나 영구 환경 삭제는 하지 않아요. [위임과 자원 관리](delegation-and-resources.md)에서 이유와 증거를 확인해요.

## 관련 문서

- [dev-cycle 라운드](dev-cycle.md)
- [위임 에이전트와 리뷰 에이전트](agent-roles.md)
- [위임과 자원 관리](delegation-and-resources.md)
- [prokit 스킬 <!-- v:prokit.skills.count -->10<!-- /v -->개](../skills/prokit-skills.md)
- [공식 스킬과 연결](../skills/official-skills.md)
- [템플릿이 더하는 것](../templates/what-it-adds.md)
