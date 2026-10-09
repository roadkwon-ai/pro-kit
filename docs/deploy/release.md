# 버전과 릴리스
https://prokit-web.vercel.app/docs/deploy/release/

> 한눈에: 운영에 배포하기 전에는 버전 번호를 붙이고 바뀐 내용을 노트로 남겨요. 버전은 기본 patch이고 큰 묶음일 때만 사용자가 minor로 정하며, 노트는 에이전트가 다듬은 뒤 사용자 동의를 받아 발행해요. 배포 스크립트는 릴리스하지 않은 커밋을 운영에 올리지 않아요.

## 순서

1. **노트 쓰기**: `pnpm release --title "<영어 제목>"`이 마지막 `vX.Y.Z` 태그 이후 커밋을 보고 다음 버전을 정한 뒤 `release/<YYYYMMDD-HHmm>-<제목>.md`에 노트를 써요. 사용자가 큰 묶음이라 minor로 정했으면 `--minor`를 더해요. 커밋하지 않아요.
2. **검수**: 에이전트가 노트를 사용자가 읽을 변경 설명으로 다듬어요. korean-skills가 있으면 `humanizer` → `style-guide` → `grammar-checker` 순서로 고쳐요. 첫 줄(버전과 제목), 커밋 해시, 링크는 바꾸지 않아요.
3. **동의와 발행**: 버전과 노트를 보여 주고(큰 묶음이면 에이전트가 "minor 추천"을 함께 적어요) 동의를 받은 뒤 `pnpm release --publish <노트>`를 실행해요. 노트와 `package.json` version을 `chore(release): vX.Y.Z`로 커밋하고, 태그를 달아 기본 브랜치와 함께 push한 뒤 GitHub Release를 만들어요.
4. **배포**: production을 배포해요([Vercel 배포와 되돌리기](https://prokit-web.vercel.app/docs/deploy/vercel/)).

운영 배포를 요청하면 릴리스도 함께 해요. develop은 릴리스하지 않아요.

## 버전 규칙

버전은 SemVer이고 정본은 git 태그 `vX.Y.Z`예요. 1.0.0은 사용자가 정할 때만 만들고, 자동으로 올리지 않아요.

| 조건 | 버전 |
|---|---|
| 첫 릴리스 | `0.1.0` |
| `pnpm release --minor`로 만들 때(큰 묶음. 사용자가 정해요) | minor |
| 제목에 `!`(`feat!:`)가 붙거나 본문에 `BREAKING CHANGE:` | 0.x 동안 minor, 1.0 이상이면 major |
| 그 밖(`feat:`, `fix:`, `docs:`, `chore:` …) | patch |

노트에는 커밋이 종류별 절(Features, Fixes, Docs, Maintenance 등)로 모이고, 커밋 본문의 `- ` 항목이 함께 옮겨져요. 그래서 커밋 제목은 Conventional Commits 접두어로, 변경 요약은 본문 bullet로 써요. 라운드를 닫을 때 에이전트도 이 형식으로 커밋해요.

## 자세히

### 릴리스 없이는 운영 배포가 안 돼요

배포 스크립트는 `origin`의 `vX.Y.Z` 태그가 HEAD를 가리키는지와 그 GitHub Release가 있는지 확인해요. 없으면 production을 배포하지 않아요. 그래서 노트가 빠지지 않아요. 로컬 태그만 있거나 태그를 옮기면 멈춰요.

### 필요한 것

GitHub `origin` 원격과 `gh auth login`이 필요해요. pro-kit 저장소의 릴리스와 준비물이 같아요.

### 멈추는 경우

- GitHub 원격이 없거나 `gh` 로그인이 안 됐거나 같은 버전 태그가 이미 있으면 커밋하기 전에 멈춰요. 다른 곳에서 먼저 릴리스했다면 `git pull` 뒤 노트를 다시 만들어요.
- push가 실패하면 커밋과 태그를 되돌려요(노트는 남아요). `git pull` 뒤 다시 `--publish`해요.
- GitHub Release만 실패하면(exit 2, 태그는 push된 상태) 출력된 `gh release create` 명령으로 다시 만들어요.
- 노트를 쓴 뒤 커밋이 늘었거나 검수하다 커밋 해시를 지웠으면 멈춰요. 노트를 지우고 처음부터 해요.
- "릴리스할 커밋이 없다"가 나오면 HEAD가 이미 릴리스한 커밋이에요. 바로 배포로 가요.

`--publish`는 기본 브랜치를 push하므로 그 전에 `pnpm vercel:deploy production --check` 출력에 `Git 자동 배포`가 없어야 해요. 있으면 push가 곧 검사 없는 production 배포가 돼요.

`release/` 노트, `chore(release)` 커밋, `v*` 태그는 이 절차로만 만들어요. 배포가 실패해 코드를 고쳤으면 새 patch 릴리스를 만들어 배포해요.

## 관련 문서

- [Vercel 배포와 되돌리기](https://prokit-web.vercel.app/docs/deploy/vercel/)
- [dev-cycle 라운드](https://prokit-web.vercel.app/docs/concepts/dev-cycle/)
- [명령 모음](https://prokit-web.vercel.app/docs/reference/commands/)
