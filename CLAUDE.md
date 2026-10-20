@AGENTS.md

## Claude Code 전용
- 템플릿(`prokit-next-neon`, `prokit-next-supabase`), 프로젝트 이름, 위치를 물을 때는 AskUserQuestion을 쓴다. 한 번에 묻는다. PRD는 `/prokit-init <PRD 파일 경로나 내용>`의 인자나 대화로 받는다(끝내 없으면 init하지 않고 끝낸다). 스킬 구성은 `prokit-init` 4절 순서대로 AskUserQuestion으로 묻는다. 두뇌·과설계 방지 스킬·응답 방식·화면 디자인 보조를 한 번에 묻고, 두뇌가 정해지면 mattpocock 추가 스킬을 여러 선택 질문으로 묻는다. 선택지마다 한 줄 설명을 `description`에 넣고, 추천한 선택지에는 ` (추천)`을 붙여 앞에 둔다.
- 오래 걸리는 명령은 Bash `timeout`을 넉넉히(최대 600000) 주거나 `run_in_background`로 실행한다. 예: 의존성까지 설치하는 `pnpm create better-t-stack … --install`, 이미지를 처음 받는 `supabase start`.
- 새 프로젝트 경로에서 실행할 명령은 `cd`를 섞지 말고 절대 경로로 준다. 예: `pnpm --dir <프로젝트 절대 경로> skills:check`. 셸이 템플릿 디렉터리에 머물지 않게 한다(AGENTS.md 템플릿 수정 규칙).
