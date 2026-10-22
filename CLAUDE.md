@AGENTS.md

## Claude Code 전용
- 프로젝트 유형(새 프로젝트, 초기 프로젝트, 운영 중인 Next.js, 전환)이 요청에서 분명하지 않으면 다른 질문보다 먼저 AskUserQuestion으로 묻는다(`prokit-init`의 "먼저: 프로젝트 유형"). 기존 프로젝트의 동의 질문도 AskUserQuestion으로 한다.
- 템플릿(`prokit-next-neon`, `prokit-next-supabase`), 프로젝트 이름, 위치를 물을 때는 AskUserQuestion을 쓴다. 한 번에 묻는다. PRD는 `/prokit-init <PRD 파일 경로나 내용>`의 인자나 대화로 받는다(끝내 없으면 init하지 않고 끝낸다). 스킬 구성은 `prokit-init` 4절 순서대로 AskUserQuestion으로 묻는다. 두뇌·과설계 방지 스킬·응답 방식·화면 디자인 보조를 한 번에 묻고, 두뇌는 하나를 권하되 `다른 두뇌 보기·여럿 고르기`를 고르면 세 묶음의 여러 선택 질문으로 묻고, 둘 이상이면 주 두뇌를 한 번 더 묻는다. 두뇌가 정해지면 mattpocock 추가 스킬을 여러 선택 질문으로 묻는다. 선택지마다 한 줄 설명을 `description`에 넣고, 추천한 선택지에는 ` (추천)`을 붙여 앞에 둔다.
- 오래 걸리는 명령은 Bash `timeout`을 넉넉히(최대 600000) 주거나 `run_in_background`로 실행한다. 예: 의존성까지 설치하는 `pnpm create better-t-stack … --install`, 이미지를 처음 받는 `supabase start`.
- 새 프로젝트 경로에서 실행할 명령은 `cd`를 섞지 말고 절대 경로로 준다. 예: `pnpm --dir <프로젝트 절대 경로> skills:check`. `pnpm create`는 예외다(AGENTS.md 4번의 서브셸). 셸이 템플릿 디렉터리에 머물지 않게 한다(AGENTS.md 템플릿 수정 규칙).
