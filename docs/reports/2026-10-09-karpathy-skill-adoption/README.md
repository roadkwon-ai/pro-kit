# karpathy-guidelines 도입 재검토

## 현재 결정

`karpathy-guidelines`는 현재 도입하지 않는다. 프로킷의 메인 행동 지침은 Ponytail 단독으로 유지하고, 전문 스킬 위임 체인과 최종 `prokit-reviewer` 계약도 그대로 유지한다.

이 결정은 Karpathy 지침이 나쁘다는 뜻이 아니다. 이미 쓰는 계획·구현·리뷰 지침이 네 원칙을 실질적으로 다루며, 새 지침을 더하면 효과가 확인되기 전에 해석 부담과 중복만 늘어난다. 이번은 검토 기록이며 manifest, 기본 활성화, 설치, 플러그인, `CLAUDE.md`를 바꾸지 않았다.

이 결론은 독립 검토에서 critical·high·medium 0건으로 승인됐다. 검토는 원칙의 겹침과 현재 미도입 결론을 확인했으며, 효과 점수를 만들거나 도입을 승인하지는 않았다.

## 업스트림 사실

`karpathy-guidelines`는 Andrej Karpathy의 관찰을 제삼자가 정리한 외부 커뮤니티 행동 지침이다. 공식 스킬이나 전문 수행자·리뷰어·자원 관리 도구로 분류하지 않는다. 원문은 가정 명시, 최소 구현, 필요한 범위만 변경, 검증 가능한 목표라는 네 원칙을 담는다. [고정 리비전의 SKILL.md](https://github.com/multica-ai/andrej-karpathy-skills/blob/2c606141936f1eeef17fa3043a72095b4765b9c2/skills/karpathy-guidelines/SKILL.md#L1-L67)

- 조사 기준 시각: 2026-10-09 23:04 KST
- source: `multica-ai/andrej-karpathy-skills`
- 고정 커밋: `2c606141936f1eeef17fa3043a72095b4765b9c2`
- SKILL.md SHA-256: `6e22cc54cb02a5e98ae42d06d9d7292db0c1b43894831b32879beb0166b2aea7`
- 조사 당시 stars 217,648개, forks 21,936개. 인기도는 효과·안전성·공식성의 증거가 아니다.

README·frontmatter·플러그인 manifest는 MIT를 선언한다. 반면 고정 트리에는 독립 `LICENSE` 파일이 없고 GitHub API의 `license`는 `null`이었다. 이는 조사 사실일 뿐 재배포 조건의 법적 결론은 아니다. [저장소 API](https://api.github.com/repos/multica-ai/andrej-karpathy-skills), [고정 트리](https://api.github.com/repos/multica-ai/andrej-karpathy-skills/git/trees/2c606141936f1eeef17fa3043a72095b4765b9c2?recursive=1)

## 기존 적용 범위와 중복

| Karpathy 원칙 | 이미 적용하는 근거 | 판단 |
|---|---|---|
| Think Before Coding | `superpowers:brainstorming` 19\~36, 129\~136, 209\~214은 사용자 진술과 가정을 분리하고, 이미 있는 맥락을 다시 묻지 않으며, 2\~3개 접근법과 절충을 요구한다 | 이미 적용한다 |
| Simplicity First | Ponytail 5.1.0 27\~35와 `writing-plans` 10, 25\~30은 재사용 사다리, 최소 해결책, 필요한 파일만 바꾸는 계획을 요구한다 | Ponytail과 계획 단계가 더 구체적이다 |
| Surgical Changes | Ponytail 21, 34\~40과 [위임 계약](../../../templates/prokit-next-neon/files/.agents/skills/prokit-dev-cycle/references/delegation.md) 27\~29는 영향 범위·승인 경로·실제 delta를 묶는다 | 기존 사용자 변경을 보존한다 |
| Goal-Driven Execution | `writing-plans` 34\~49와 위임 계약 29, 35는 독립 검사가 있는 작업과 실제 명령·증거·`blocked` 처리를 요구한다 | 이미 적용한다 |

환경 변수 정본, 공통 설정, 프리셋 재사용, 캐시·venv 감시는 Karpathy의 역할이 아니다. [재사용과 설정 설계](../../../templates/prokit-next-neon/files/.agents/skills/prokit-dev-cycle/references/reuse-design.md) 7\~29와 기존 shared-code 점검이 이 범위를 더 구체적으로 다룬다.

템플릿은 이 외부 지침을 복사하지 않는다. [프로세스 스킬 라우팅](../../../templates/prokit-next-neon/files/.agents/skills/prokit-dev-cycle/references/process-routing.md) 7\~14, 38\~49가 brainstorming, writing-plans, Ponytail, 구현자와 최종 리뷰어를 현재 체인으로 연결한다.

이 비교는 원칙의 존재 여부만 확인했다. 실제 작업의 품질, 토큰, 질문 수, 지연이 동등하거나 개선되는지는 측정하지 않았다. 따라서 현재 원칙을 덮어쓰거나 새로운 평가 작업을 시작할 근거는 없다.

해결할 수 없는 충돌은 확인하지 못했다. 다만 별도로 더하면 불확실하면 멈추고 묻기라는 표현을 넓게 해석해, 현재의 중요한 모호성만 묻고 명확한 작업은 진행한다는 운영과 충돌할 수 있다. 불가능한 예외 처리를 생략한다는 표현도 실제 신뢰 경계의 검증을 줄이는 근거가 될 수 있다. 이 해석 부담만으로 기본 활성화의 이득은 확인되지 않았다.

## 현재 운영

프로킷은 사용자 명시 출처, 프로젝트 정본, 접근 가능한 외부 제공자, 검증한 기본 대안 순서로 선택한다. manifest는 설치 목록일 뿐 실행 허용 목록이 아니다. 실제 사용은 출처·내용 해시·범위·의존성·부작용·host/mode를 확인하고, 근거가 없으면 `blocked`로 남긴다. [외부 스킬 선택 계약](../../../templates/prokit-next-neon/files/.agents/skills/prokit-dev-cycle/references/delegation.md)

그러나 이 일반 선택 규칙은 현재 Karpathy 지침을 자동 선택한다는 뜻이 아니다. 현재 기본은 Ponytail 단독이고, Main 행동 가드와 전문 위임 체인을 계속 쓴다. 별도 행동 지침을 복사하거나 새 framework, option, 평가 묶음을 만들지 않는다. `karpathy-guidelines`의 installation, activation, manifest 등록, 전역 설정 변경도 하지 않는다.

이 보고서는 외부 스킬을 현재 작업에 쓰도록 승인하지 않는다. 실제 선택은 실행 시점의 source inspection, host·mode, 권한과 프로젝트 계약을 다시 확인해야 한다.

## 재검토 조건

다음이 실제 산출물에서 반복되어 기존 계약의 누락으로 확인될 때만 재검토한다.

1. 계획이 사용자 진술과 가정·대안을 구분하지 않는다.
2. 채택 근거 없이 불필요한 추상화나 무관한 변경을 반복한다.
3. 검증 계획이나 실제 검사 증거를 반복해서 빠뜨린다.

그때도 먼저 기존 계획·리뷰 계약이 이 세 정보를 확인하는 작은 fixture를 보강한다. 그 검사로도 같은 누락이 남고 사용자가 실행 요청에서 비교를 명시하면 Karpathy one-off 비교를 별도 수행할 수 있다. 무조건 36회 또는 24개×5항목×3회의 새 평가를 시작하지 않는다. 기존 평가 기준을 약화하지 않으며, provider·계약·reviewer·host/mode·환경·입력에서 실제로 달라진 범위만 다시 검증한다.

## 한계

설치·호스트 실행·효과 점수는 확인하지 않았다. 인기도만으로는 도입 이득을 판단할 수 없다. 독립 `LICENSE` 파일 부재와 실제 개선 효과가 남은 확인 항목이다.
