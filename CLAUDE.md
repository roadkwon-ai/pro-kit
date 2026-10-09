@AGENTS.md

## Claude Code 전용
- 템플릿(`prokit-next-neon`, `prokit-next-supabase`), 프로젝트 이름, 위치를 물을 때는 AskUserQuestion을 쓴다. 한 번에 묻는다.
- 오래 걸리는 명령은 Bash `timeout`을 넉넉히(최대 600000) 주거나 `run_in_background`로 실행한다. 예: 의존성까지 설치하는 `pnpm create better-t-stack … --install`, 이미지를 처음 받는 `supabase start`.
- 새 프로젝트 경로에서 실행할 명령은 `cd`를 섞지 말고 절대 경로로 준다. 예: `pnpm --dir <프로젝트 절대 경로> skills:check`. 셸이 템플릿 디렉터리에 머물지 않게 한다(AGENTS.md 템플릿 수정 규칙).
