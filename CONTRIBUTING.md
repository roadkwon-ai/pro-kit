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

문서 원본 `handbook/`은 묶음 <!-- v:handbook.sections.count -->7<!-- /v -->개, 쪽 <!-- v:handbook.pages.count -->35<!-- /v -->개입니다. 템플릿 하나의 안쪽은 이렇습니다. 설치된 프로젝트의 구조는 [폴더 구조](handbook/reference/project-structure.md)에 있습니다.

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

규칙의 원문은 [AGENTS.md "템플릿 수정 규칙"](AGENTS.md#템플릿-수정-규칙)입니다. 요약하면 저장소 루트에서 작업하고, 공유 파일은 두 템플릿에서 바이트가 같게 두고, 설치기를 바꾸면 실제 Better-T-Stack 프로젝트에 설치해 확인하고, 검증 결과는 템플릿의 `VERIFICATION.md`에 적습니다. 이미 만든 프로젝트에 변경을 옮기는 절차는 [AGENTS.md](AGENTS.md#기존-프로젝트에-템플릿-갱신-반영)와 [갱신 반영](handbook/templates/update-existing.md)에 있습니다. 설계 문서는 [docs/superpowers/specs](docs/superpowers/specs/)에 있습니다.

### 스킬·에이전트 계약을 바꿀 때

- 일반 기술 지침을 프로킷에 다시 쓰기 전에 현재 외부 전문 스킬의 역할을 확인합니다. 프로킷에는 프로젝트 계약, 위임·진행 관리와 최종 검수에 필요한 규칙을 남깁니다([위임과 자원 관리](handbook/concepts/delegation-and-resources.md)).
- 계획에는 기존 코드와 소비자, 공통 설정·환경 변수의 정본, 재사용하거나 분리할 이유를 적습니다. 한 번만 쓰는 구조를 미리 공통화하지 않습니다([계획 리뷰](handbook/concepts/agent-roles.md#리뷰가-보는-것)).
- 스킬과 라우팅, 에이전트와 생성 프로필, 평가 입력, 연결 문서 중 영향받는 곳을 함께 맞춥니다. 두 템플릿의 공유 파일을 일치시키고, 설치기를 바꿨으면 실제 Better-T-Stack 설치도 확인합니다.
- 검증은 변경 영향을 기준으로 고릅니다. 이전 통과 증거는 출처·계약·환경·입력이 그대로인 범위에서만 재사용하고, 미통과 항목과 영향받은 검사를 다시 합니다. 이전 기록을 덮어쓰거나 확인하지 못한 환경을 통과로 바꾸지 않습니다.
- 병렬 배정은 파일·생성 출력·상태의 소유권을 분리하고, 중첩 worker까지 실행 수에 포함합니다. 실패 원시 결과와 실제 경과시간은 보존하며, 재시도 성공을 최초 성공으로 합치지 않습니다([배정과 검증 기준](handbook/concepts/delegation-and-resources.md#독립-작업을-나눠서-확인하기), [이번 검증 기록](docs/reports/2026-10-10-parallel-verification/README.md)).
- 결과와 한계는 각 템플릿의 `VERIFICATION.md`에 적고, 상세 기록은 `docs/reports/`에서 연결합니다. 현재 결정은 [재사용 설계](docs/reports/2026-10-09-reuse-design-review/README.md), [위임·자원 인수](docs/reports/2026-10-09-orchestration-resources/README.md), [Karpathy 미도입 검토](docs/reports/2026-10-09-karpathy-skill-adoption/README.md)에 있습니다.

### 프리셋 디자인을 바꿀 때

공식 프리셋의 원본 조사, COPY 제작, 충실도 검수, 프로킷 웹 게시는 비공개 저장소 `roadkwon-ai/pro-kit-preset-skills`의 스킬이 맡고, 조율은 `pro-kit-web`에서 합니다. 이 저장소에는 그 스킬과 역할을 설치하지 않습니다. 사용자 프로젝트는 `prokit-pack-use`로 완성팩을 복원하고, 요청한 콘텐츠와 기능을 바꾼 뒤 완성 프리셋과 비교합니다([완성팩 활용과 담당 구분](handbook/design/preset-publication.md)).

팩 설정을 적용할 때는 두 템플릿의 `prokit-ui/references/preset-settings.md`를 따릅니다. 팩 활용 규칙은 두 템플릿과 연결 문서에 함께 반영하고, 프리셋 제작 규칙은 제작 스킬 정본에서 고칩니다. 팩 문서와 교재는 검증된 기술 사실을 문서 담당에게 인계합니다.

## 문서

- 문서 쪽을 쓰거나 구조를 바꿀 때는 `prokit-docs`, 문장을 쓰고 다듬을 때는 `prokit-writing` 스킬을 씁니다. 두 스킬의 원본은 `roadkwon-ai/pro-kit-docs-skills` 저장소이고, 이 저장소에는 `.agents/skills`에 설치한 사본을 커밋합니다. 스킬을 갱신할 때는 저장소 루트에서 `npx -y skills@latest add roadkwon-ai/pro-kit-docs-skills -a claude-code -a codex -y`를 다시 실행하고 바뀐 파일을 커밋합니다. 이 원본은 pro-kit 관리용이며, 템플릿으로 만든 프로젝트에는 문서 스킬을 임의로 복사하지 않습니다. 저장소 루트에는 이 두 스킬만 둡니다. 공식·외부 스킬은 템플릿으로 만든 프로젝트에 설치하고, 이 저장소에서 검증에 필요하면 잠시 설치했다가 끝나면 스킬 폴더와 `skills-lock.json` 항목을 지웁니다.
- 루트 `README.md`에는 요약과 링크만 둡니다. 상세는 `handbook/`, `tutorials/`, 템플릿 README에 쓰고 README에서 링크합니다.
- `handbook/`의 순서는 문서 홈과 묶음마다 `README.md`의 쪽 표가 정합니다. 쪽은 `# 제목`, 빈 줄, `> 한눈에: …`로 시작합니다.
- 홈페이지는 문서 쪽마다 마크다운 복사, AI로 보내기, `<쪽>.md` 주소, 도식 내려받기를 붙입니다. 새 문서 묶음을 더하면 홈페이지에도 붙는지 확인합니다([AGENTS.md](AGENTS.md#템플릿-수정-규칙)).
- 두 곳 이상에 쓰는 값(프리셋 수, 에이전트 목록, 쪽 수, Node 최소 판, 공개 주소 등)은 `<!-- v:키 -->값<!-- /v -->` 표시로, 여러 줄 글은 `docs/blocks/<이름>.md` 묶음과 `<!-- b:이름 … -->`·`<!-- /b -->` 표시로 쓰고 `node scripts/doc-values.mjs`로 채웁니다. 목록이나 표 중간이라 표시를 달 수 없는 글은 표시 없이 같은 글로 두고 `scripts/doc-values.cases.mjs`의 CASES에 더합니다. 키 목록은 `--list`, 어긋남 확인은 `--check`입니다. 같은 글이 표시 없이 두 문서에 남으면 `node --test scripts/doc-values.test.mjs`의 중복 검사가 잡고, 정당한 반복만 `docs/dupes-allow.txt`에 이유와 함께 둡니다. 표시 밖 맨시간(분·시간·초)도 같은 테스트가 잡고, 값이 아닌 시간만 `docs/time-allow.txt`에 둡니다. 모든 값을 홈페이지용 JSON으로 내보내려면 `--json <파일>`입니다. 목록과 규칙은 [docs/common-values.md](docs/common-values.md)입니다.
- `dev-cycle evidence` 명령과 위임·자원 문서를 고칠 때는 명령의 입력 제약과 증거 경계만 적습니다. private guard token·owner receipt를 예시나 로그에 넣지 않고, 메타데이터 캐시를 Main 승인 권위처럼 설명하지 않습니다. 템플릿 스킬·역할·API 본문은 해당 작업의 동결 범위 밖이면 바꾸지 않습니다.
- 공개 주소의 정본은 `site-links.json`입니다. `node scripts/site-links.mjs set <home|pages|repo|packs> <새 주소>`가 추적 파일 전체의 주소를 바꾼 뒤 `node scripts/doc-values.mjs`를 돌립니다.

## 릴리스

버전은 SemVer이고 정본은 git 태그 `vX.Y.Z`입니다. `main`은 `git push` 대신 이 절차로 push합니다. 버전 규칙과 단계의 원문은 [AGENTS.md "버전과 릴리스"](AGENTS.md#버전과-릴리스)입니다.

1. **노트 작성**: `node scripts/release.mjs --title "<짧은 영어 제목>"`. 큰 묶음이면 사용자가 정해 `--minor`를 줍니다. 커밋하지 않습니다.
2. **한국어 검수**: [korean-skills](https://github.com/DaleSeo/korean-skills)의 `humanizer` → `style-guide` → `grammar-checker` 순서로 노트를 고칩니다.
3. **발행**: `node scripts/release.mjs --publish <노트 파일>`. 노트 커밋, 태그와 `main` push, GitHub Release까지 합니다.

로그인한 `gh`, `origin` 원격, korean-skills가 필요합니다. `main`이 아니거나 커밋하지 않은 변경이 있거나 노트를 쓴 뒤 커밋이 늘면 `--publish`가 멈춥니다. 이때는 노트를 지우고 1단계부터 다시 합니다. push가 실패하면 릴리스 커밋과 태그를 되돌리고 검수한 노트는 남기므로 `git pull` 뒤 다시 `--publish`합니다. `scripts/release.mjs`를 고치면 `node --test scripts/release.test.mjs`를 실행하고 이 절을 맞춥니다. 설치된 프로젝트의 릴리스는 [버전과 릴리스](handbook/deploy/release.md)입니다.

## 프리셋 팩 인덱스

팩 제작·조립·발행은 `pro-kit-preset-skills`의 `prokit-preset-create`와 `prokit-preset-publish`가 맡습니다. 이 저장소는 소비자 인덱스 `tutorials/packs.json`과 받기 도구 `scripts/pack.mjs`만 유지합니다. 미게시 팩은 `published: false`로 구분하고 공개 다운로드 대상으로 안내하지 않습니다. ZIP 해시는 최종 파일을 기준으로 외부 인덱스에 기록하며, 팩 안에 자기 ZIP 해시를 반복해서 넣지 않습니다.

완성팩을 사용자 프로젝트에 적용할 때는 `prokit-pack-use`를 따릅니다. 받기·SHA256 확인 뒤 `scripts/apply-pack.mjs`의 `--check`로 복원 계획과 충돌을 확인하고, 실제 적용 후 설치·빌드·화면을 검사합니다. 다운로드 성공이나 파일 해시 일치만으로 화면 품질이 검증됐다고 판단하지 않습니다.
