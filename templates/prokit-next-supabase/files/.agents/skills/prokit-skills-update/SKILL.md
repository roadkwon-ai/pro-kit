---
name: prokit-skills-update
description: >-
  이 BTS(Better-T-Stack) 프로젝트가 skills.manifest.json으로 설치한 외부 스킬(Next.js, Vercel,
  shadcn, Better Auth, DB, superpowers, impeccable 등)을 GitHub 원본과 비교해 새 버전을 확인하고
  한 번에 업데이트한다. `pnpm dev-cycle status`나 `pnpm skills:update --if-due`가 UPDATE_AVAILABLE,
  UPSTREAM_GONE, CHECK_FAILED를 출력했을 때, 그리고 스킬 업데이트해줘, 스킬 최신인지 확인해줘,
  스킬 버전 올려줘, npx skills update 같은 요청에 사용한다. prokit-* 스킬 갱신(템플릿 새 버전),
  새 스킬 추가, Claude 플러그인과 전역 도구(gstack 등) 업데이트에는 쓰지 않는다.
---

# BTS 스킬 업데이트

`pnpm skills:setup`이 받은 외부 스킬은 `.agents/skills/`에 복사되어 커밋된다. 원격 저장소가 바뀌어도 저절로 따라가지 않으므로 이 스킬로 확인하고 한 번에 올린다. 판정은 `skills-lock.json`의 `skillPath`가 가리키는 GitHub 폴더와 설치본을 파일 단위로 비교한다. GitHub API를 저장소마다 한 번 부른다.

## 명령
| 명령 | 하는 일 |
|---|---|
| `pnpm skills:update --check` | 지금 확인만 한다. `.md`가 아닌 파일(스크립트, 설정)이 바뀐 스킬은 `스크립트 변경` 줄에 원격 저장소, 폴더, 검토 고정값, 파일별 blob을 보여 주고 그 판을 기록한다 |
| `pnpm skills:update` | 확인하고, 바뀐 스킬과 빠진 스킬을 다시 설치한 뒤 한 번 더 비교한다. 스크립트가 바뀐 스킬은 `보류`로 남긴다 |
| `pnpm skills:update <이름>...` | 그 스킬만 설치한다. 스크립트가 바뀐 스킬은 원격이 `--check`로 기록한 판 그대로일 때만 설치하고, 아니면 `설치 거부`(exit 2) |
| `pnpm --silent skills:update --if-due` | 하루에 한 번만 확인하고 알릴 것이 있을 때만 출력한다. 설치하지 않는다. 진행 중인 라운드가 없으면 `pnpm dev-cycle status`가 이것을 불러 결과를 붙인다 |
| `pnpm skills:update --snooze` | 지금 알림을 미룬다(24시간 → 48시간 → 7일). 업데이트 목록이 바뀌면 다시 알린다 |
| `pnpm skills:update --mode ask\|auto\|off` | 알림 방식. 묻기(기본), 묻지 않고 업데이트, 확인 끄기. auto여도 스크립트가 바뀐 업데이트는 `mode=ask`로 알린다 |

- exit 0은 모두 최신이다. 1은 업데이트할 스킬, 빠진 스킬, 원격에서 없어진 스킬이 남았다는 뜻이다. 2는 설치 실패, 설치 거부, 실행 오류(모르는 옵션 포함), 3은 확인 실패(설치는 끝났을 수 있다)다. 출력을 그대로 보고한다.
- 확인 결과와 알림 설정은 이 기기의 `node_modules/.cache/skills-update.json`에만 둔다. 커밋하지 않고, `node_modules`를 지우면 기본값으로 돌아간다.
- 토큰이 없으면 GitHub API는 시간당 60회까지다. `gh auth login`이 되어 있으면 그 토큰을 쓴다.
- `npx skills update`는 쓰지 않는다. 에이전트를 지정하지 않고 모든 스킬을 다시 설치해서, 이 기기에서 찾은 모든 에이전트 폴더에 스킬을 연결한다. 그러면 Codex 전용인 superpowers 스킬이 Claude 플러그인과 겹치고, 바뀌지 않은 스킬까지 lock과 파일이 흔들린다. `pnpm skills:update`는 바뀐 스킬만 매니페스트의 `agents`대로 설치한다.

## 1. 요청과 알림 처리
- 사용자가 업데이트를 직접 요청했으면("스킬 업데이트해줘", "최신이면 업데이트해줘") 알림 방식과 상관없이 묻지 않는다. `pnpm skills:update --check` 결과를 보여 주고 바로 2절을 한다. 원격에서 없어진 스킬은 아래 표대로 알린다.
- 확인만 요청했으면 `--check` 결과를 보고하고, 업데이트할 스킬이 있으면 지금 업데이트할지 한 번 묻는다.
- 다른 작업 중에 `pnpm dev-cycle status`나 `--if-due`의 알림으로 알게 되었으면 줄마다 아래대로 한다. 여러 줄이 함께 나올 수 있다.

| 출력 | 할 일 |
|---|---|
| `UPDATE_AVAILABLE mode=ask …` | 스킬 목록을 보여 주고 한 번 묻는다(Claude Code는 AskUserQuestion). 선택지는 아래. 목록 뒤에 `(스크립트 변경: …)`이 붙으면 auto여도 이 줄이 나온다. 그 스킬은 설치 전에 원격 파일을 본다고(2절 2번) 함께 알린다 |
| `UPDATE_AVAILABLE mode=auto …` | 묻지 않고 2절을 한다 |
| `UPSTREAM_GONE …` | 원격 저장소에서 그 스킬이 없어졌다(이름이 바뀌었거나 옮겼거나 저장소가 사라졌다). 업데이트로는 고칠 수 없고, 목록이 바뀔 때만 다시 알린다. 원본 저장소 README에 옮긴 곳이 적혀 있는지 본다(`gh api repos/<source>/readme --jq .content \| base64 -d`). 예를 들어 vercel-labs/next-skills는 스킬을 vercel/next.js로 옮겼고 일부는 Next.js 번들 문서로 대신한다고 적어 두었다. 설치본은 그대로 쓸 수 있지만 더 갱신되지 않는다고 알리고, 찾은 대체 후보를 함께 알린다. 지우지 않는다. `skills.manifest.json`을 고치는 일은 사용자가 요청할 때 H 라운드로 한다 |
| `CHECK_FAILED …` | 적힌 저장소만 확인하지 못했다. 한 줄로 알리고 다른 줄을 처리한다. 그 저장소가 최신이라고 말하지 않는다. 한 시간 뒤 다시 확인한다 |

`mode=ask` 선택지:
- **지금 업데이트 (기본)**: 2절을 먼저 끝내고 원래 작업으로 돌아간다.
- **항상 자동으로**: `pnpm skills:update --mode auto`를 실행하고 2절로 간다.
- **나중에**: `pnpm skills:update --snooze`를 실행하고 원래 작업을 한다.
- **다시 묻지 않기**: `pnpm skills:update --mode off`를 실행하고, 다시 켜는 명령(`--mode ask`)을 알려 준다.

## 2. 업데이트 라운드
스킬 파일과 `skills-lock.json`이 바뀌므로 케이스 H 라운드 하나로 한다. 진행 중인 라운드가 있으면 그 라운드를 먼저 닫는다. 다른 작업과 diff가 섞이면 audit이 더 무거운 케이스를 요구하고 리뷰 범위도 흐려진다. 확인 결과 바꿀 스킬이 없으면(원격에서 없어진 스킬만 있으면) 라운드를 열지 않는다.

1. `pnpm dev-cycle table H --write --title "외부 스킬 업데이트"`
2. **설치 전 확인**: `pnpm skills:update --check`를 실행한다. `스크립트 변경` 줄에 나온 파일은 설치하기 전에 원격 내용을 읽는다. impeccable처럼 훅이 스킬 폴더의 스크립트를 바로 실행하는 스킬은 설치되는 즉시 새 스크립트가 돌기 때문이다. 이 실행이 보여 준 판이 검토 고정값으로 기록된다.
   - `blob <sha>`: `gh api "repos/<저장소>/git/blobs/<sha>" --jq .content | base64 -d | diff .agents/skills/<이름>/<파일> -` (새 파일이면 diff 없이 읽는다)
   - `원격에서 지움`: 로컬 파일이 무엇이었는지만 본다. `링크`: `gh api "repos/<저장소>/contents/<폴더>/<파일>"`로 대상 경로를 보고 그 파일을 읽는다.
   - `VERSION`처럼 설치 뒤 바이너리를 내려받게 하는 파일이 바뀌었거나, 원래 압축된 파일(`*.min.js`, `*.umd.js`)이면 diff로 판단할 수 없다. 출처와 바뀐 버전을 알리고 사용자가 정한다.
   - 의심스러운 변경(네트워크 전송, 비밀값 읽기, 전역 설정 변경, 난독화된 코드)이 있는 스킬은 빼고, 이유를 보고에 적는다.
3. `pnpm skills:update`로 `.md`만 바뀐 스킬(빠진 스킬 포함)을 설치한다. 스크립트가 바뀐 스킬은 빠진 것이라도 `보류`로 남는다. 2번에서 문제없다고 본 스크립트 변경 스킬은 `pnpm skills:update <이름>...`으로 설치한다. `설치 거부`는 이유를 함께 보여 준다. 검토 기록 없음이나 원격이 바뀜이면 2번부터 다시 하고, 같은 이름의 폴더가 여럿이면 보고한다. 뺀 스킬이 남으면 exit 1이 정상이다. 설치 실패나 설치 거부(exit 2)여도 설치된 스킬이 있으면 4번을 먼저 한 뒤 보고한다. 확인 실패(exit 3)면 확인하지 못한 저장소를 보고에 적는다. 다시 설치했는데도 업데이트로 남은 스킬은 원격 스냅샷이 늦은 것일 수 있다. 보고하고 다음 확인에 맡긴다.
4. 바뀐 내용을 본다: `git diff --stat -- .agents/skills skills-lock.json`. 외부 스킬의 내용은 곧 에이전트 지시이고 스크립트는 그대로 실행된다.
   - 바뀐 스킬마다 `SKILL.md` diff를 훑는다. 이 프로젝트 규칙과 부딪히는 지시가 새로 생겼는지 본다(예: `db:push` 권장, 다른 배포 방법, 전역 설치). 부딪혀도 `AGENTS.md`와 `prokit-*`가 우선이고, 부딪히는 곳은 보고에 적는다. frontmatter의 `hooks`·`allowed-tools`와 본문에서 느낌표 바로 뒤에 백틱으로 감싼 명령(동적 컨텍스트)은 스킬을 부를 때 실행되므로 스크립트처럼 본다.
   - `.md`가 아닌 파일은 스크립트가 설치 뒤 원격과 다시 비교한다. `설치본이 검토한 판과 다르다`가 나오거나 문제가 보이면 이번 업데이트를 되돌린다. `git status --short -- .agents/skills .claude/skills skills-lock.json`으로 이번에 생긴 변경만 있는지 보고, `git checkout -- .agents/skills .claude/skills skills-lock.json`과 새로 생긴 스킬 폴더·링크 삭제로 되돌린 뒤 문제없는 스킬만 이름을 지정해 다시 설치한다.
   - 이 프로젝트에서 직접 고쳐 둔 외부 스킬이면 업데이트가 그 수정을 지운다. 지워진 수정이 있으면 보고한다.
5. 행을 채운다. `pnpm agents:check`, `pnpm skills:check`, `pnpm dev-cycle case`·`status`의 출력을 적는다. skill-creator eval 행은 `N/A: 외부 스킬만 갱신(prokit-* 변경 없음)`, 문서 영향 행은 바뀐 문서가 없으면 `N/A: 외부 스킬 갱신`이다.
6. `[confirm]` 행: 업데이트한 스킬 목록, 스킬별 바뀐 줄 수, 2번과 4번에서 본 주의점(뺀 스킬 포함)을 보여 주고 확인받는다.
7. `prokit-dev-cycle` 5절대로 닫고 커밋한다. 커밋 제목 예: `chore: 외부 스킬 업데이트 (next-dev-loop, shadcn)`. 앱 코드는 바뀌지 않았으므로 마무리 질문에서 배포는 필요 없다고 함께 알린다.

## turbo와 turborepo 스킬
`turborepo` 스킬은 지침을 설치된 `turbo` 패키지의 번들 문서(`node_modules/turbo/docs/`, turbo 2.11.5부터 들어 있다)로 넘긴다. 그래서 turbo 버전이 스킬 내용을 정하고, 이 문서는 `skills-lock.json`의 비교 대상이 아니다.
- turbo가 2.11.5 미만이면 새 스킬이 가리키는 문서가 없다. 알리고, turbo는 사용자가 요청할 때 올린다. `pnpm add -D -w turbo@<버전>`이 `pnpm-workspace.yaml`에 최소 릴리스 경과 기간 예외(`minimumReleaseAgeExclude`)를 더하면 그 목록을 보고한다.
- turbo를 올릴 때는 올리기 전 `node_modules/turbo/docs`를 스크래치 디렉터리에 복사해 두고, 올린 뒤 `diff -r`로 바뀐 페이지를 2절 4번처럼 에이전트 지시로 보고 훑는다. 문서의 `npx skills add` 같은 설치 안내는 따르지 않는다(`AGENTS.md`의 스킬 설치 규칙).
- turbo 2.11.5 이상은 AI 에이전트가 turbo를 실행하면 루트 `AGENTS.md`에 `BEGIN/END:turborepo-agent-rules` 블록을 쓰고 커밋해 두라고 지시한다. 루트 `turbo.json`에 `"agentGuidance": false`가 없으면 넣고, 생긴 블록은 지운다. 2.11.4 이하는 이 키를 모르는 키로 거부하므로 turbo를 올린 뒤에 넣는다(설치기도 지원하는 turbo에서만 넣는다).

## 대상이 아닌 것
- `prokit-*` 스킬: 템플릿 저장소(pro-kit)의 새 버전으로 갱신한다. 그 저장소 `AGENTS.md`의 "기존 프로젝트에 템플릿 갱신 반영" 절차를 따른다.
- 매니페스트에 없는 스킬(`npx skills add`로 직접 더한 것): 확인하지 않는다. 계속 쓸 스킬이면 `skills.manifest.json`에 더한다(H 라운드).
- Claude 플러그인(superpowers, skill-creator, oh-my-claudecode, ponytail): `pnpm skills:update`는 올리지 않는다. 네 플러그인 모두 훅이 있어 올리는 즉시 새 코드가 돌고, 이 경로는 설치 전 검토를 거치지 않는다. 사용자가 요청하면 `claude plugin marketplace update <마켓플레이스>`(`skills.manifest.json`의 `claude.marketplaces`)로 목록을 받고, 플러그인 저장소의 `hooks/` 변경을 본 뒤 `claude plugin update <플러그인> --scope project`로 올린다. 새 프로젝트는 설치할 때 마켓플레이스를 갱신하므로 최신판을 받는다. 올린 플러그인은 세션을 다시 열어야 적용된다. 커밋할 파일이 없으므로 라운드를 열지 않는다.
- 전역 도구: gstack은 `/gstack-upgrade`, 그 밖은 `pnpm skills:check`가 보여 주는 설치 안내를 따른다.
