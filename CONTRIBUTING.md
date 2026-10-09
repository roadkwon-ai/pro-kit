# 기여하기 (저장소 관리자용)

pro-kit 저장소를 고치고 릴리스하는 사람을 위한 안내입니다. 프로킷을 쓰는 방법은 [README](README.md)와 [문서](handbook/README.md)에 있습니다. 규칙의 원문은 [AGENTS.md](AGENTS.md)이고, 여기에는 요약과 링크만 둡니다.

## 저장소 구조

```text
pro-kit/
├── AGENTS.md, CLAUDE.md        에이전트 규칙 (새 프로젝트 만드는 절차, 템플릿 수정, 릴리스)
├── README.md, CONTRIBUTING.md, LICENSE, THIRD_PARTY_NOTICES.md
├── templates/
│   ├── prokit-next-neon/       Neon 템플릿
│   └── prokit-next-supabase/   Supabase 템플릿
├── handbook/                   문서 원본 (프로킷 사이트 /docs의 원본)
├── tutorials/                  비개발자용 튜토리얼 (사이트 /tutorials/의 원본). packs.json: 프리셋 팩 목록
├── scripts/                    release.mjs, pack.mjs, site-links.mjs, doc-values.mjs와 테스트
├── site-links.json, doc-values.json   공개 주소와 공통 값의 정본
├── docs/                       assets/(README 이미지), blocks/(공통 글 묶음), reports/(측정 보고서), superpowers/(설계 스펙과 계획)
├── release/                    릴리스 노트 (릴리스마다 추가)
├── .env.example                작업 폴더 .env 예시 (이미지 키, 배포 토큰)
└── packs/                      받은 프리셋 팩 (scripts/pack.mjs. git에 넣지 않음)
```

문서 원본 `handbook/`은 묶음 <!-- v:handbook.sections.count -->7<!-- /v -->개, 쪽 <!-- v:handbook.pages.count -->33<!-- /v -->개입니다. 템플릿 하나의 안쪽은 이렇습니다. 설치된 프로젝트의 구조는 [폴더 구조](handbook/reference/project-structure.md)에 있습니다.

```text
templates/prokit-next-supabase/
├── install.sh, install.mjs     설치 진입점과 본체 (옵션은 handbook/templates/installer.md)
├── README.md                   템플릿 사용 설명 (명령의 정본)
├── VERIFICATION.md             검증 결과와 한계
├── files/                      설치 대상 프로젝트에 복사되는 파일 (스킬, 에이전트, scripts, 문서 골격, skills.manifest.json)
├── evals/                      스킬 eval 입력 (skill-creator 형식)
└── tests/                      node --test 테스트
```

## 테스트

저장소 루트에서 실행합니다. 디렉터리 인자는 Node 24에서 동작하지 않으므로 글롭을 따옴표로 감쌉니다.

```bash
node --test 'templates/prokit-next-neon/tests/*.test.mjs'
node --test 'templates/prokit-next-supabase/tests/*.test.mjs'
node --test scripts/*.test.mjs        # release, pack, site-links, doc-values, handbook(README와 CONTRIBUTING.md 링크 포함)
```

## 템플릿 수정 흐름

규칙의 원문은 [AGENTS.md "템플릿 수정 규칙"](AGENTS.md#템플릿-수정-규칙)입니다. 요약하면 저장소 루트에서 작업하고, 공유 파일은 두 템플릿에서 바이트가 같게 두고, 설치기를 바꾸면 실제 BTS 프로젝트에 설치해 확인하고, 검증 결과는 템플릿의 `VERIFICATION.md`에 적습니다. 이미 만든 프로젝트에 변경을 옮기는 절차는 [AGENTS.md](AGENTS.md#기존-프로젝트에-템플릿-갱신-반영)와 [갱신 반영](handbook/templates/update-existing.md)에 있습니다. 설계 문서는 [docs/superpowers/specs](docs/superpowers/specs/)에 있습니다.

## 문서

- 문서 쪽을 쓰거나 구조를 바꿀 때는 `prokit-docs`, 문장을 쓰고 다듬을 때는 `prokit-writing` 스킬을 씁니다. 두 스킬의 원본은 `roadkwon-ai/pro-kit-docs-skills` 저장소이고, 이 저장소에는 `.agents/skills`에 설치한 사본을 커밋합니다. 스킬을 갱신할 때는 저장소 루트에서 `npx -y skills@latest add roadkwon-ai/pro-kit-docs-skills -a claude-code -a codex -y`를 다시 실행하고 바뀐 파일을 커밋합니다.
- 루트 `README.md`에는 요약과 링크만 둡니다. 상세는 `handbook/`, `tutorials/`, 템플릿 README에 쓰고 README에서 링크합니다.
- `handbook/`의 순서는 문서 홈과 묶음마다 `README.md`의 쪽 표가 정합니다. 쪽은 `# 제목`, 빈 줄, `> 한눈에: …`로 시작합니다.
- 홈페이지는 문서 쪽마다 마크다운 복사, AI로 보내기, `<쪽>.md` 주소, 도식 내려받기를 붙입니다. 새 문서 묶음을 더하면 홈페이지에도 붙는지 확인합니다([AGENTS.md](AGENTS.md#템플릿-수정-규칙)).
- 두 곳 이상에 쓰는 값(프리셋 수, 에이전트 목록, 쪽 수, Node 최소 판, 공개 주소 등)은 `<!-- v:키 -->값<!-- /v -->` 표시로, 여러 줄 글은 `docs/blocks/<이름>.md` 묶음과 `<!-- b:이름 … -->`·`<!-- /b -->` 표시로 쓰고 `node scripts/doc-values.mjs`로 채웁니다. 목록이나 표 중간이라 표시를 달 수 없는 글은 표시 없이 같은 글로 두고 `scripts/doc-values.cases.mjs`의 CASES에 더합니다. 키 목록은 `--list`, 어긋남 확인은 `--check`입니다. 같은 글이 표시 없이 두 문서에 남으면 `node --test scripts/doc-values.test.mjs`의 중복 검사가 잡고, 정당한 반복만 `docs/dupes-allow.txt`에 이유와 함께 둡니다. 표시 밖 맨시간(분·시간·초)도 같은 테스트가 잡고, 값이 아닌 시간만 `docs/time-allow.txt`에 둡니다. 모든 값을 홈페이지용 JSON으로 내보내려면 `--json <파일>`입니다. 목록과 규칙은 [docs/common-values.md](docs/common-values.md)입니다.
- 공개 주소의 정본은 `site-links.json`입니다. `node scripts/site-links.mjs set <home|pages|repo|packs> <새 주소>`가 추적 파일 전체의 주소를 바꾼 뒤 `node scripts/doc-values.mjs`를 돌립니다.

## 릴리스

버전은 SemVer이고 정본은 git 태그 `vX.Y.Z`입니다. `main`은 `git push` 대신 이 절차로 push합니다. 버전 규칙과 단계의 원문은 [AGENTS.md "버전과 릴리스"](AGENTS.md#버전과-릴리스)입니다.

1. **노트 작성**: `node scripts/release.mjs --title "<짧은 영어 제목>"`. 큰 묶음이면 사용자가 정해 `--minor`를 줍니다. 커밋하지 않습니다.
2. **한국어 검수**: [korean-skills](https://github.com/DaleSeo/korean-skills)의 `humanizer` → `style-guide` → `grammar-checker` 순서로 노트를 고칩니다.
3. **발행**: `node scripts/release.mjs --publish <노트 파일>`. 노트 커밋, 태그와 `main` push, GitHub Release까지 합니다.

로그인한 `gh`, `origin` 원격, korean-skills가 필요합니다. `main`이 아니거나 커밋하지 않은 변경이 있거나 노트를 쓴 뒤 커밋이 늘면 `--publish`가 멈춥니다. 이때는 노트를 지우고 1단계부터 다시 합니다. push가 실패하면 릴리스 커밋과 태그를 되돌리고 검수한 노트는 남기므로 `git pull` 뒤 다시 `--publish`합니다. `scripts/release.mjs`를 고치면 `node --test scripts/release.test.mjs`를 실행하고 이 절을 맞춥니다. 설치된 프로젝트의 릴리스는 [버전과 릴리스](handbook/deploy/release.md)입니다.

## 프리셋 팩 올리기

튜토리얼 프리셋 팩은 이 저장소에 넣지 않고 팩마다 zip 하나로 별도 저장소 [pro-kit-packs](https://github.com/roadkwon-ai/pro-kit-packs)의 릴리스에 올립니다. 프리미엄 팩은 [pro-kit-premium-packs](https://github.com/roadkwon-ai/pro-kit-premium-packs)에 올리고, 아래 명령의 `--repo`를 그 저장소로 바꿉니다. 규칙과 옛 저장소 정리의 원문은 [AGENTS.md "버전과 릴리스"](AGENTS.md#버전과-릴리스)입니다. 명령만 모으면 이렇습니다.

1. 팩 원본(`../pro-kit-samples/packs/<이름>/`)을 `../pro-kit-samples/tools/pack-zip.mjs`로 `<이름>-pack.zip`에 묶습니다.
2. `gh release create pack-<이름> <zip> --repo roadkwon-ai/pro-kit-packs --target main --title "<이름> 프리셋 팩" --notes "<무엇이 들었나>"`로 올립니다.
3. 팩을 바꾸면 `gh release delete pack-<이름> --repo roadkwon-ai/pro-kit-packs --cleanup-tag -y`로 옛 릴리스를 지우고 다시 올린 뒤, `tutorials/packs.json`의 `sha256`과 `bytes`를 바꿔 `main`에 반영합니다.
4. 올린 뒤 `node scripts/pack.mjs <이름>`으로 받아 원본과 같은지 확인합니다. `scripts/pack.mjs`를 고치면 `node --test scripts/pack.test.mjs`를 실행합니다.
