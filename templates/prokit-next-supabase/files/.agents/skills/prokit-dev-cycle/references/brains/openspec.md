# 두뇌: openspec

Fission-AI/OpenSpec. 변경마다 제안(무엇을, 왜), 설계, 작업 목록을 먼저 합의하고 적용한 뒤 스펙으로 보관하는 가벼운 스펙 주도형이다. 단계 문이 없어 어느 문서든 언제든 고칠 수 있고, 이미 있는 프로젝트에 붙이기 쉽다. 스킬이 실행 중에 `openspec` CLI를 부르므로 이 두뇌를 고를 때만 전역 CLI(`npm install -g @fission-ai/openspec@latest`)를 설치하고, 프로젝트에서 `openspec init --tools claude,codex,antigravity`를 실행한다.

- Claude Code: 스킬 6개(`.claude/skills/openspec-*`)와 명령 `/opsx:propose` 등(`.claude/commands/opsx/`)
- Codex: 스킬 6개(`.agents/skills/openspec-*`, `$openspec-propose`처럼 부른다)
- Antigravity: 같은 스킬과 명령 `/opsx-propose` 등(`.agents/workflows/`)
- Grok Build: `.agents/skills`의 같은 스킬
- 훅은 없고 `AGENTS.md`·`CLAUDE.md`를 고치지 않는다.

| 단계 | Claude Code | Codex·Antigravity·Grok Build |
|---|---|---|
| 요구 명확화 | 생각이 흐리면 `/opsx:explore`, 정리되면 `/opsx:propose <이름>`으로 `openspec/changes/<이름>/`에 `proposal.md`·`design.md`·`tasks.md`와 스펙 변경분을 만든다 | `openspec-explore`, `openspec-propose` |
| 계획 | 같은 변경의 `design.md`와 `tasks.md`. 고칠 때는 `/opsx:update` | `openspec-update-change` |
| 구현 | `/opsx:apply`로 `tasks.md`를 차례로 처리한다. 위임은 `prokit-implementer`로 하고 행마다 대조표 증거를 남긴다 | `openspec-apply-change`. Codex는 네이티브 `prokit-implementer` |
| 완료 기록 | 라운드를 닫기 전에 `/opsx:archive`로 변경을 `openspec/changes/archive/`로 옮기고 스펙(`openspec/specs/`)에 반영한다. 스펙만 맞출 때는 `/opsx:sync` | `openspec-archive-change`, `openspec-sync-specs` |

- 맡지 않는 단계(디버깅, 리뷰 추가 관점, QA, 검증)는 기본 칸이다. 용어·설계 질문은 `grilling`·`domain-modeling`이다.
- `openspec-propose`는 계획 문서만 만들고 멈춘다. 같은 요청에서 구현으로 넘어가지 않는 규칙은 프로킷 순서(요구 → `prokit-reviewer(plan)` → 구현)와 맞는다. 대조표 증거에 `openspec/changes/<이름>/` 경로를 적는다.
- 프로킷 스펙·계획 경로(`docs/specs/`, `docs/plans/`) 대신 `openspec/changes/<이름>/`을 써도 된다. 진행 계획(`tasks/plan.md`)의 Task 하나가 변경 하나가 되게 나누면 추적이 쉽다.
- CLI는 기본으로 사용 통계(명령 이름과 판)를 보낸다. 끄려면 셸 설정에 `OPENSPEC_TELEMETRY=0`을 둔다. 설치기는 전역 설정을 바꾸지 않는다.
- 다른 두뇌로 바꾸면 설치기가 생성 스킬·명령만 지우고 `openspec/`(스펙과 변경 기록)은 인계 자료로 남긴다.

## 에이전트
- 없음. 이 두뇌는 에이전트나 프롬프트 틀을 주지 않는다. 서브에이전트는 `prokit-*`와 `specialist-reviewer`만 쓴다.
