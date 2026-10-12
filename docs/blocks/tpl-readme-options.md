<!-- 두 템플릿 README "옵션" 절의 옵션 목록과 설치기가 덮어쓰지 않는다는 문단. 인자: cli(--with-global이 설치하는 DB CLI 이름. Neon 또는 Supabase) -->
- `--diff`: 미리 보기. 템플릿과 다른 기존 파일의 차이, 복사할 파일, `package.json`·`.gitignore`·`biome.json`·`turbo.json`·`.claude/settings.json`에 더할 항목을 보여 주고 파일은 쓰지 않는다. 스킬·플러그인 설치도 하지 않는다.
- `--skip-skills`: 스킬·플러그인·OMX 설치와 agent-browser CLI 자동 설치(`scripts/skills-setup.mjs`)를 건너뛴다. 나중에 `pnpm skills:setup`으로 한다.
- `--with-global`: 없는 전역 도구(OMX CLI, gstack, agent-browser CLI, Vercel CLI, {{cli}} CLI)를 전역에 설치한 뒤 프로젝트 설치를 한다. Codex plugin CLI가 Ponytail 원본 GitHub marketplace 설치를 지원할 때만 Ponytail 네이티브 플러그인도 설치한다. 이 설치는 Codex 사용자 설정과 캐시를 바꾼다. 이미 설치된 플러그인은 다시 설치하거나 자동으로 올리지 않는다. 훅 신뢰는 별도다.

설치기는 기존 파일을 덮어쓰지 않는다. `AGENTS.md`, `CLAUDE.md`가 이미 있으면 템플릿 블록을 끝에 한 번만 덧붙인다. 여러 번 실행해도 결과가 같다.
