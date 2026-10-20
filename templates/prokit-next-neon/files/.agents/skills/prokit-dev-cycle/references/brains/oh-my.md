# 두뇌: oh-my (OMC·OMX)

여러 세션에 걸친 큰 작업을 자동·병렬 모드로 돌린다. Claude Code는 OMC 플러그인 `oh-my-claudecode@omc`, Codex는 전역 OMX CLI(`npm install -g oh-my-codex`. Codex가 있는 기기에만 설치한다)와 프로젝트 설정 `omx setup --scope project --no-merge-agents`(`.codex/skills`, `.codex/agents`, `.codex/prompts`, `.omx/`)를 쓴다. Antigravity·Grok Build는 지원하지 않아 기본 칸으로 진행한다.

| 단계 | Claude Code(OMC) | Codex(OMX) |
|---|---|---|
| 요구 명확화 | `oh-my-claudecode:deep-interview` | `deep-interview` |
| 계획 | `oh-my-claudecode:omc-plan`, 합의 계획은 `ralplan` | `plan`, `ralplan` |
| 구현 | 기본은 `prokit-implementer` 위임. 대규모 병렬만 `team`, 끝까지 반복은 `ralph` | 네이티브 `prokit-implementer`. `team`은 tmux 런타임이 있을 때만 |
| 디버깅 (C) | `oh-my-claudecode:trace` | `analyze`(읽기 전용 조사) |
| 리뷰 추가 관점 | `oh-my-claudecode:omc-review` | `code-review` |
| 검증 | `oh-my-claudecode:verify` + `prokit-verify` | `prokit-verify` |

- 맡지 않는 단계(QA, 마무리)는 기본 칸이다. 용어·설계 질문은 `grilling`·`domain-modeling`이다.
- 모드(`autopilot`, `ralph`, `team`, `ultragoal` 등)의 완료 보고는 증거가 아니다. 완료 판정은 `pnpm dev-cycle audit`만 한다. 모드가 커밋, push, 배포를 하게 두지 않는다.
- 라운드를 닫을 때 실제로 쓴 모드를 취소한다(Claude `oh-my-claudecode:cancel`, Codex `cancel`). 켜져 있으면 사용자 답을 기다리지 못한다.
- `omc-setup`은 실행하지 않는다. 기본값이 전역 `~/.claude/CLAUDE.md`를 덮어쓴다. 전역 `CLAUDE.md`에 OMC 블록이 이미 있으면 다른 두뇌를 고른 프로젝트에서도 읽힌다(설치기가 경고만 한다).
- Codex App이나 tmux 밖에서는 OMX `team`을 자동으로 시작하지 않는다. OMX가 설치하지 않는 `ralph`·`ultrawork`는 전역에 옛 스킬이 남아 있어도 고르지 않는다.
- 다른 두뇌로 바꾸면 설치기가 `omx uninstall --scope project`로 OMX 프로젝트 설정을 지운다. `--purge`는 쓰지 않아 `.omx/`의 작업 기록(plans, notepad, state)은 남는다. 필요 없으면 직접 지운다. `.gitignore`에 OMX가 더한 줄과 `.codex/config.toml`의 `model` 줄(git이 무시하는 파일)은 남는다. 폴더를 복사·이동한 프로젝트는 훅 신뢰 기록의 절대 경로 때문에 `omx setup`·`uninstall`이 실패할 수 있다. 그때는 `.codex/config.toml`의 옛 경로 `[hooks.state."…"]` 항목을 지우고 다시 실행한다.
