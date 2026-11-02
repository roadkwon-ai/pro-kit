---
name: prokit-skills-assign
description: >-
  이 Better-T-Stack 프로젝트에서 공식 스킬(skills.manifest.json의 기본 설치 스킬)이 더해지거나 바뀌거나 빠졌을 때, 그 스킬을 어느 전문 에이전트(계층별 수행자,
  실행 확인, 구현, 리뷰어)와 어느 prokit-* 스킬의 공식 스킬 연결 표, 대조표 행에 둘지 판단해 다시 배치하고 관련 파일에 반영한다.
  prokit-skills-update가 업데이트 뒤 배치 점검을 넘겼을 때(새로 생긴 스킬, 원격에서 없어진 스킬, 하는 일이 바뀐 스킬),
  pnpm agents:check가 공식 스킬 배치 불일치를 알렸을 때, 그리고 새 공식 스킬 추가해줘, 이 스킬은 어느 에이전트가 써?,
  공식 스킬 배치 다시 해줘, 공식 스킬 빼줘 같은 요청에 쓴다. 이미 배치한 스킬을 최신판으로 올리는 일은 prokit-skills-update,
  두뇌·과설계 방지 스킬·추가 스킬·선택 묶음 바꾸기는 prokit-skills-manage가 맡는다.
---

# 프로킷 공식 스킬 배치

공식 스킬은 Main이 직접 읽고 일하지 않는다. 그 스킬로 일하는 전문 에이전트가 읽고 따르며, Main(`prokit-*` 스킬)은 위임하고 감독하고 검수한다. 이 스킬은 어떤 공식 스킬을 누가 맡는지(배치)를 정하고, 바뀐 배치를 관련 파일 모두에 반영한다.

## 배치 정본과 반영할 곳
| 파일 | 담는 것 |
|---|---|
| `skills.manifest.json`의 `skills` | 설치할 공식 스킬(설치 정본) |
| `skills.manifest.json`의 `performers.agents` | 대조표 행에서 위임받는 전문 에이전트 |
| `skills.manifest.json`의 `performers.skills` | 공식 스킬마다 그 스킬을 읽고 일하는 에이전트(배치 정본). audit은 이 표의 에이전트가 읽은 기록만 그 스킬을 쓴 것으로 센다. 여기에 없는 공식 스킬은 Main이 읽는다 |
| `.claude/agents/<에이전트>.md`의 "맡는 공식 스킬" 표(리뷰어는 "focus별 공식 스킬" 표) | 에이전트가 읽을 스킬과 그 상황 |
| `prokit-*`의 "공식 스킬 연결" 표 | 상황, 공식 스킬, 맡는 에이전트, Main 검수 항목 |
| `docs/dev-workflow.md`의 행 문구 | 그 행을 맡는 에이전트와 꼭 읽을 스킬 |

`pnpm agents:check`는 `performers`의 에이전트·스킬 이름이 실제 에이전트 정의와 매니페스트의 스킬을 가리키는지, 에이전트 정의의 공식 스킬 표와 `prokit-*` 연결 표의 맡는 에이전트 칸이 `performers`와 같은지 양쪽으로 본다. `pnpm agents:sync`는 Codex·Antigravity용 에이전트 정의를 다시 만든다.

## 1. 바뀐 것 찾기
- 업데이트 뒤(`prokit-skills-update`가 넘긴 경우): 그 보고와 `git diff --stat -- .agents/skills skills-lock.json`에서 새로 생긴 스킬 폴더, 원격에서 없어진 스킬(`UPSTREAM_GONE`), `SKILL.md`의 `description`이나 하는 일이 바뀐 스킬을 고른다. 글만 다듬은 업데이트는 배치를 바꾸지 않는다.
- 사용자가 공식 스킬을 더하거나 빼려 할 때: 스킬 이름과 출처(GitHub 저장소와 폴더)를 받는다. 출처가 없으면 묻는다.
- `pnpm agents:check`가 배치 줄을 냈을 때: 그 줄의 스킬과 에이전트.

## 2. 누가 맡을지 판단
스킬의 `SKILL.md`를 Read로 읽는다(새 스킬은 설치 전에 원격 파일을 `gh api`로 읽는다). 머리의 `description`과 `parent`, 본문이 시키는 일을 보고 아래 표로 정한다.

| 스킬이 시키는 일 | 맡는 쪽 |
|---|---|
| 화면 코드 규칙(컴포넌트, 훅, Next.js 캐시·프리패치, `packages/ui`) | `prokit-ui-builder`. 코드를 검사하는 기준도 되면 `prokit-reviewer`(code·ui)도 |
| 서버·인증 코드 규칙(oRPC, Better Auth) | 서버 계층 수행자. 검사 기준이면 `prokit-reviewer`(security)도 | <!-- edition:pro -->
| 스키마·쿼리 규칙 | DB 계층 수행자. 검사 기준이면 `prokit-reviewer`(db)도 | <!-- edition:pro -->
| 개발 서버·브라우저로 동작을 확인 | `prokit-runtime-checker` |
| 하네스·빌드·작업공간 설정 | `prokit-implementer` |
| 코드를 읽기만 하는 규칙 검사 | `prokit-reviewer`(맞는 focus) |
| 사용자에게 묻는 일(`grilling` 형식 질문, 용어 정리), 외부 서비스에 적용하는 일(원격 브랜치, 배포), 서브에이전트를 띄우거나 기록 파일을 남겨야 하는 일(UI 스킬 `impeccable`·`hallmark`) | Main. `performers.skills`에 넣지 않는다 |
| 다른 스킬의 상위 스킬(그 스킬 머리의 `parent`) | 하위 스킬을 맡는 쪽이 모두 읽을 수 있어야 한다. 하위 스킬을 맡는 쪽이 Main과 에이전트로 갈리면 `performers.skills`에 넣지 않는다 |

- 쓰는 쪽(수행자)과 검사하는 쪽(리뷰어)이 모두 쓰는 스킬이면 둘 다 둔다. 쓰는 쪽이 여러 계층이면 계층마다 둔다(예: `turborepo`).
- 어느 칸에도 맞지 않는 새 분야면 새 전문 에이전트가 필요한지 사용자에게 묻는다. 만들면 `prokit-implementer`의 공통 규칙과 보고 형식을 따르는 정의(`.claude/agents/<이름>.md`, "맡는 공식 스킬" 표 포함)를 만들고 `performers.agents`에 더한다.
- 판단 결과를 표(스킬, 시키는 일 한 줄, 지금 배치, 바꿀 배치, 이유)로 보여 주고 사용자에게 확인받는다(Claude Code는 AskUserQuestion). 사용자가 다르게 고르면 그대로 한다.

## 3. 반영 라운드
매니페스트, 에이전트 정의, 스킬 문서가 바뀌므로 케이스 H 라운드 하나로 한다. `prokit-skills-update`의 업데이트 라운드 안에서 넘겨받았으면 그 라운드에서 이어 한다. 아니면 진행 중인 라운드를 먼저 닫는다.

1. `pnpm dev-cycle table H --write --title "공식 스킬 배치" --no-task`
2. 구현 행: `prokit-implementer`에 맡긴다. 위임 지시에 확인받은 배치 표와 바꿀 파일(위 "반영할 곳"의 파일 중 해당하는 것)을 모두 적는다.
   - 더하기: 매니페스트 `skills`(새 스킬이면 설치 항목)와 `performers`, 맡는 에이전트의 표, 해당 `prokit-*` 연결 표, 그 스킬을 꼭 읽어야 하는 대조표 행이 있으면 그 행 문구.
   - 바꾸기: 옛 에이전트의 표와 `performers.skills`에서 빼고 새 쪽에 넣는다. 연결 표의 "맡는 에이전트" 칸을 고친다.
   - 빼기: 모든 곳에서 지운다. 설치본(`.agents/skills/<이름>`, `.claude/skills/<이름>` 링크, `skills-lock.json` 항목)은 사용자가 확인하면 지운다.
3. 새 스킬을 더했으면 `pnpm skills:setup`으로 설치한다(네트워크와 설정 파일 변경이라 사용자에게 먼저 알린다).
4. `pnpm agents:sync` 뒤 `pnpm agents:check`, `pnpm skills:check`, `pnpm dev-cycle case`·`status`를 돌려 행을 채운다.
5. 리뷰 행은 `prokit-reviewer`(code)에 매니페스트와 바꾼 정의·문서를 맡긴다. `prokit-*` 스킬 본문을 바꿨으면 skill-creator eval 행을 한다.
6. `[confirm]` 행: 배치 표의 전과 후를 보여 주고 확인받는다.
7. `prokit-dev-cycle` 5절대로 닫고 커밋한다. 커밋 제목 예: `chore: 공식 스킬 배치 (shadcn → prokit-ui-builder)`.

## 대상이 아닌 것
- 배치한 스킬을 최신판으로 올리기: `prokit-skills-update`
- 두뇌·과설계 방지 스킬·추가 스킬·선택 묶음을 더하거나 바꾸거나 지우기: `prokit-skills-manage`
- `prokit-*` 스킬과 에이전트의 템플릿 새 판: 템플릿 저장소(pro-kit)의 갱신 절차
