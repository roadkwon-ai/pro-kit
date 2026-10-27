<!-- prokit-template:start -->
@AGENTS.md

## Claude Code 전용
- 에이전트는 Agent 도구로 부른다: `subagent_type`은 `prokit-analyzer`, `prokit-implementer`, `prokit-reviewer`, provider에 내장 리뷰가 없을 때만 `specialist-reviewer`다. provider를 고르면 먼저 `prokit-dev-cycle`의 위임 프로토콜로 실제 내용·hash·scope를 검증한다. 리뷰 프롬프트에는 focus, 기준 SHA(`tasks/todo.md` 마커의 base), 파일 목록, evidence packet hash를 넣는다. 고른 두뇌 파일(`references/brains/<이름>.md`)의 "에이전트" 절에 있는 에이전트는 읽기 전용 보완 검토로만 쓴다. 쓰는 쪽이 아니고 최종 게이트는 `prokit-reviewer`다.
- impeccable `critique`처럼 서브에이전트를 스스로 띄우는 스킬은 메인 세션에서 실행한다.
- 고른 두뇌(`.dev-cycle.json`의 `brain`)의 스킬 이름은 `.agents/skills/prokit-dev-cycle/references/brains/<이름>.md`를 따른다. 고르지 않은 두뇌의 스킬은 전역에 있어도 부르지 않는다.
- `prokit-*`가 읽으라고 하는 외부 스킬(`impeccable`, `vercel-react-best-practices`, `next-dev-loop` 등)은 Skill 도구로 부르지 말고 Read로 `.agents/skills/<이름>/SKILL.md`를 읽는다. Skill 도구는 같은 이름의 개인 스킬(`~/.claude/skills`)이 있으면 그것을 먼저 불러온다. `prokit-*`와 플러그인 스킬(고른 두뇌·과설계 방지 스킬의 플러그인)은 Skill 도구로 부른다.
- 과설계 방지 스킬로 ponytail을 골랐으면 변경 리뷰는 Skill 도구 또는 `/ponytail-review`로 한 번만 부른다. 전역 `~/.claude/settings.json`은 사용자가 요청할 때만 바꾼다.
- caveman 응답 압축(`/caveman`)과 `/i-have-adhd`는 사용자가 켤 때만 쓰고 대화 응답에만 적용한다. 파일, 대조표 증거, AskUserQuestion 질문, 라운드 보고 형식은 줄이지 않는다.
- 사용자가 고를 것(진행 계획 확인, 외부 스킬 업데이트 알림, 두뇌·과설계 방지 스킬과 추가 스킬 변경, 선택 스킬 묶음 설치, 디자인 방향과 스타일(`prokit-ui`))은 AskUserQuestion으로 묻는다.
<!-- prokit-template:end -->
