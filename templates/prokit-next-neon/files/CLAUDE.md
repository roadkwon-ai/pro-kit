<!-- prokit-template:start -->
@AGENTS.md

## Claude Code 전용
- 에이전트는 Agent 도구로 부른다: `subagent_type`은 `prokit-implementer` 또는 `prokit-reviewer`. 리뷰 프롬프트에는 focus, 기준 SHA(`tasks/todo.md` 마커의 base), 파일 목록을 넣는다.
- impeccable `critique`처럼 서브에이전트를 스스로 띄우는 스킬은 메인 세션에서 실행한다.
- superpowers 스킬은 `superpowers:` 접두어로 부른다 (예: `superpowers:brainstorming`).
- `prokit-*`가 읽으라고 하는 외부 스킬(`impeccable`, `shadcn`, `vercel-react-best-practices`, `supabase-postgres-best-practices`, `next-dev-loop` 등)은 Skill 도구로 부르지 말고 Read로 `.agents/skills/<이름>/SKILL.md`를 읽는다. Skill 도구는 같은 이름의 개인 스킬(`~/.claude/skills`)이 있으면 그것을 먼저 불러온다(출력의 `Base directory`가 프로젝트 밖). `shadcn`은 로드할 때 루트에서 `npx shadcn@latest info`를 실행하는데 모노레포 루트라 실패해 아예 불러오지 못한다. `prokit-*`와 플러그인 스킬(superpowers, ponytail)은 Skill 도구로 부른다.
- ponytail 과설계 리뷰는 Skill 도구로 `ponytail:ponytail-review`를 부른다(`/ponytail-review` 슬래시 명령은 세션 모드를 review로 바꿔 둔다). ponytail 훅이 statusline 설정을 제안해도 전역 `~/.claude/settings.json`은 사용자가 요청할 때만 바꾼다.
- 사용자가 고를 것(라운드 끝 마무리: "릴리스하고 production 배포" 또는 "커밋·push만", 외부 스킬 업데이트 알림(`prokit-skills-update`), Vercel 팀과 프로젝트 이름, 릴리스 발행 동의, 운영 DB 적용 동의, 선택 스킬 묶음 설치, 디자인 카탈로그 스타일(`prokit-ui`))은 AskUserQuestion으로 묻는다.
- 배포는 메인 세션에서 `prokit-deploy`로 한다. Vercel 플러그인의 `/vercel:deploy`나 배포 에이전트(`vercel:deployment-expert` 등)에 맡기지 않는다. `pnpm vercel:deploy`는 원격 빌드를 기다리므로 Bash `timeout`을 넉넉히(최대 600000) 준다. `vercel login`처럼 대화형 명령은 사용자에게 `! vercel login`으로 실행하게 한다.
<!-- prokit-template:end -->
