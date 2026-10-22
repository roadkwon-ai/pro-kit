<!-- 두 템플릿 README "옵션" 절의 옵션 목록과 설치기가 덮어쓰지 않는다는 문단. 인자: cli(--with-global이 설치하는 DB CLI 이름. Neon 또는 Supabase) -->
- `--diff`: 미리 보기. 템플릿과 다른 기존 파일의 차이, 복사할 파일, `package.json`·`.gitignore`·`biome.json`·`turbo.json`·`.claude/settings.json`에 더할 항목을 보여 주고 파일은 쓰지 않는다. 스킬·플러그인 설치도 하지 않는다.
- `--skip-skills`: 스킬·플러그인·OMX 설치와 agent-browser CLI 자동 설치(`scripts/skills-setup.mjs`)를 건너뛴다. `--brain`·`--simplicity` 값은 `.dev-cycle.json`에 기록만 하고 나중에 `pnpm skills:setup`이 그 값을 설치한다. `--matt`·`--optional`은 기록하지 않으므로 나중에 `pnpm skills:setup`에 다시 준다.
- `--brain <이름>[,<이름>]|none`: 두뇌를 고른다(superpowers, agent-skills, pstack, gstack, oh-my, mattpocock, openspec, spec-kit, compound-engineering). 하나를 권하고, 여럿이면 쉼표로 잇는다(첫 값이 주 두뇌. `.dev-cycle.json`에 배열로 기록한다). 기본은 `none`(기본 AI)이다. mattpocock은 따로 설치하는 것이 없고 `--matt`로 고른 추가 스킬과 함께 쓴다. openspec은 고를 때 OpenSpec CLI를 전역에 설치하고, spec-kit은 설치할 때 uv가 필요하다.
- `--simplicity <이름|none>`: 과설계 방지 스킬을 하나 고른다(ponytail, caveman, karpathy). 기본은 `none`(하네스 간결성 규칙)이다.
- `--matt <스킬>[,<스킬>]`: mattpocock 추가 스킬을 설치한다(tdd, research 등).
- `--optional <묶음>[,<묶음>]`: 선택 스킬 묶음을 설치한다(ops, motion, mobile, i-have-adhd, taste).
- 고르는 기준과 선택지 설명은 `.agents/skills/prokit-dev-cycle/references/brains/README.md`에 있다. 모르는 값이면 아무것도 쓰지 않고 exit 1로 멈춘다.
- `--project-type <new|early|operating|migration>`: 프로젝트 유형을 `.dev-cycle.json`의 `projectType`에 기록한다. 기존 프로젝트 도입 절차(pro-kit 저장소 `AGENTS.md`의 "기존 프로젝트에 도입하기")가 쓴다. early면 `biome.json`에서 `prototype/`을 뺀다.
- `--legacy <경로>`: 전환(`migration`)에서 기존 코드 경로를 `.dev-cycle.json`의 `legacy.path`에 기록한다. 안내용이고 `pnpm dev-cycle status`가 보여 준다.
- `--adopt`: Better-T-Stack 구조가 아닌 운영 중인 Next.js 프로젝트에 하네스만 설치한다(dev-cycle, 에이전트, `prokit-dev-cycle`·`prokit-verify`·`prokit-web`·`prokit-ui`·`prokit-skills-update`·`prokit-skills-manage`). 기존 스택·폴더·스크립트는 바꾸지 않고 Better-T-Stack 전용 스킬과 배포·내보내기·릴리스 스크립트는 넣지 않는다. ESLint flat config(`eslint.config.*`)가 있으면 `globalIgnores`에 벤더 스킬(`.agents/**`)과 하네스 스크립트만 더한다. Biome 2 `biome.json`이 있으면 `files.includes`에 하네스·벤더 파일(`.agents`, `.claude`, `.codex`, 하네스 스크립트와 설정) 제외만 더한다. 그대로 두면 설치만으로 `lint`가 실패해서다. 넣을 자리를 찾지 못하면(옛 `.eslintrc`, Biome 1, `biome.jsonc`) 직접 넣으라고 경고한다. 계층 경로 규칙은 정밀 분석 뒤 첫 H Task에서 맞춘다.
- `--default-branch <브랜치>`: dev-cycle의 기준 브랜치를 기록한다. 기존 프로젝트 도입처럼 `prokit/setup` 브랜치에서 설치할 때 쓴다(병합할 기본 브랜치, 또는 도입 브랜치에서 계속하면 `prokit/setup`). 빼면 `origin/HEAD`, `main`, `master`, 지금 브랜치 순으로 정한다.
- `--with-global`: 없는 전역 도구(agent-browser CLI, Vercel CLI, {{cli}} CLI, 고른 두뇌의 gstack·OMX CLI·OpenSpec CLI)를 전역에 설치한 뒤 프로젝트 설치를 한다. ponytail을 골랐고 Codex plugin CLI가 Ponytail 원본 GitHub marketplace 설치를 지원할 때만 Ponytail 네이티브 플러그인도 설치한다. 이 설치는 Codex 사용자 설정과 캐시를 바꾼다. 이미 설치된 플러그인은 다시 설치하거나 자동으로 올리지 않는다. 훅 신뢰는 별도다.

설치기는 기존 파일을 덮어쓰지 않는다. `AGENTS.md`, `CLAUDE.md`가 이미 있으면 템플릿 블록을 끝에 한 번만 덧붙인다. 여러 번 실행해도 결과가 같다.
