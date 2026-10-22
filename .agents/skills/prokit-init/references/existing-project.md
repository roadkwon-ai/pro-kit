# 기존 프로젝트 도입 상세

`prokit-init` 7절의 상세다. 절차의 정본은 루트 `AGENTS.md`의 "기존 프로젝트에 도입하기"이고, 이 파일은 질문 문구, 초기 분석 점검, 기록 틀을 둔다.

## 1. 유형 신호
| 요청·폴더에서 보이는 것 | 유형 후보 |
|---|---|
| "새로 만들어줘", PRD만 있고 대상 폴더가 없음 | `new` |
| PRD, 화면 정의서, 디자인 시스템 문서, 프로토타입(HTML, Figma 내보내기, Vite·CRA 시안)만 있음. 운영 배포·DB 마이그레이션·실사용자 흔적이 없음 | `early` |
| `package.json`에 `next`가 있고 배포 설정(Vercel, Docker, CI의 배포 단계), DB 마이그레이션, 운영 환경 변수 흔적이 있음 | `operating` |
| Next.js가 아닌 서비스(PHP, Django, Rails, Spring, Express, React SPA, Vue 등)를 Next.js로 옮기려 함 | `migration` |
| `.dev-cycle.json`이나 `AGENTS.md`의 `<!-- prokit-template:start -->` 블록이 이미 있음 | 도입이 아니다. 이미 프로킷을 쓰는 프로젝트라 루트 `AGENTS.md`의 "기존 프로젝트에 템플릿 갱신 반영"(`install.sh --diff`, 그 프로젝트의 H 라운드)으로 안내하고 끝낸다 |

신호가 섞이면(예: 배포는 됐지만 실사용자가 없다) 가까운 두 유형을 추천과 함께 묻는다.

## 2. 초기 분석(읽기 전용)
대상 폴더에 쓰지 않는다. 비밀값은 읽어도 출력하지 않고 "있음"만 적는다. 설치, 빌드, 테스트 실행, 서버 실행을 하지 않는다.

| 항목 | 보는 법 |
|---|---|
| git | `git -C <경로> status --short --branch`, `git -C <경로> log --oneline -5`, 브랜치 목록, 원격 |
| 스택 | 모든 `package.json`(루트, `apps/*`, `packages/*`)의 의존성, 그 밖의 언어 파일(`composer.json`, `requirements.txt`, `pyproject.toml`, `Gemfile`, `pom.xml`, `go.mod`), 프레임워크 설정 파일 |
| Better-T-Stack 구조 | `apps/web/package.json`의 `next`, `packages/api`, `packages/auth`, `packages/db/drizzle.config.ts`, `bts.jsonc` |
| 규모와 구조 | `git -C <경로> ls-files | wc -l`, 두 단계 폴더 구조, 진입점 |
| 기획 자료 | PRD, 화면 정의서, 디자인 시스템 문서, ADR, README의 위치와 요약 |
| 디자인 | 디자인 토큰·테마 파일, 컴포넌트 라이브러리, `DESIGN.md` 유무, 프로토타입 화면 수 |
| 데이터·인증 | DB 종류, 스키마·마이그레이션 도구, 인증 방식 |
| 테스트·배포 | 테스트 러너와 테스트 파일 수, CI 설정, 배포 대상 |
| 위험 | 추적 중인 `.env*`, 커밋하지 않은 변경, 운영 데이터에 닿는 스크립트 |

요약 틀(대화로 보여 준다. 적용하면 `docs/prokit/intake.md`에 그대로 옮긴다):

```text
초기 분석 요약 (<경로>)
- 유형 판단: <유형>. 근거: <한두 가지>
- 스택: <언어·프레임워크·판>, 패키지 관리자 <…>, Better-T-Stack 구조 <예/아니오>
- 규모: 파일 <n>개, 주요 폴더 <…>
- 기획 자료: <있는 것과 경로>
- 디자인: <디자인 시스템·토큰·DESIGN.md 유무>
- 데이터·인증: <…>
- 테스트·배포: <…>
- 위험: <…>
- 적용 방식 제안: <early 같은 폴더 / operating 하네스 먼저(`--adopt`, 하네스만 설치) / operating Better-T-Stack / migration 새 폴더>
```

## 3. 유형이 맞지 않을 때
초기 분석이 고른 유형과 다르면 적용하기 전에 근거와 함께 다시 묻는다.
- operating인데 `next`가 없음 → migration을 권한다.
- early인데 운영 배포와 실사용 데이터 흔적이 있음 → operating을 권한다.
- migration인데 이미 Next.js → operating을 권한다.

## 4. 맞춤 설정의 유형별 항목
| 유형 | 더 정할 것 | 기본 |
|---|---|---|
| early | 템플릿(DB가 드러나지 않으면 묻는다), 프로젝트 이름(같은 폴더에 만들므로 폴더 이름이 패키지 이름이 된다. 소문자 kebab-case가 아니면 바꿀 이름을 묻고, 동의를 받아 적용 전에 폴더 이름을 바꾼다. 경로가 바뀐다고 알린다) | 같은 폴더, `prokit/setup`. 기획 자료는 폴더 구조를 그대로 `docs/` 아래로 옮긴다 |
| operating | 적용 방식(Better-T-Stack 구조이고 DB가 Postgres와 Drizzle이면 그대로, 아니면 하네스 먼저), 템플릿(그대로 적용할 때만. 실제 DB가 Supabase면 `prokit-next-supabase`, Neon이나 일반 Postgres면 `prokit-next-neon`. 코드에서 드러나지 않으면 묻는다), 작업 브랜치 | 작업 브랜치: `기본 브랜치에 병합 (추천)` 또는 `prokit/setup에서 계속`. 계속을 고르면 나중에 기본 브랜치에 병합할 때 `.dev-cycle.json`의 `defaultBranch`를 기본 브랜치로 되돌린다(그 프로젝트의 H 라운드). 하네스 먼저(adopt)는 DB 계층을 설치하지 않아 템플릿 차이가 없으므로 템플릿을 묻지 않고 `prokit-next-neon`의 `install.sh`를 쓴다 |
| migration | 템플릿, 새 프로젝트 이름과 위치 | `../<이름>`, 기존 코드는 그대로 |

스킬 구성 추천은 PRD와 초기 분석을 함께 신호로 쓴다(`brains/README.md`의 추천 기준). 유형만으로 두뇌를 정하지 않는다. 사용자가 원한다고 말한 것이나 분석에서 보이는 필요가 신호다. 예: 변경마다 합의와 기록을 남기고 싶다고 하면 `openspec`, 규제·계약처럼 문서를 꼼꼼히 남겨야 하는 대규모 전환이면 `spec-kit`, 해결 기록을 쌓아 재사용하고 싶다고 하면 `compound-engineering`. 그런 신호가 약하거나 두 줄 이상 비슷하게 맞으면 `none`이다.

질문은 두 번에 나눈다(한 번에 4개까지). ① 유형별 항목(위 표에서 정할 것과, 필요하면 템플릿·이름·위치) ② 스킬 구성 네 질문(`prokit-init` 4절). 맡긴 항목과 이미 정한 항목은 빼고, 남는 질문이 없으면 묻지 않는다.

## 5. 동의 질문
설정을 확정한 뒤 한 번 묻는다(Claude Code는 AskUserQuestion. 선택지 `시작 (추천)`, `지금은 하지 않음`).
- early: "지금 프로젝트에 Next.js를 적용하고, 프로토타입을 프로킷 개발 환경으로 옮겨 구현을 이어 갈까요? 새 브랜치에서 기획 자료를 docs/로, 프로토타입을 prototype/으로 옮긴 뒤 같은 폴더에 Better-T-Stack을 만들어요."
- operating: "프로킷을 안전하게 적용하려면 정밀 분석부터 해야 해요. 새 브랜치(prokit/setup)에 하네스를 설치하고, 새 세션에서 정밀 분석을 시작할까요? 앱 코드는 바꾸지 않아요."
- migration: "Next.js 전환을 시작할까요? 안정적으로 전환하려면 지금 프로젝트를 먼저 정밀 분석해요. 새 폴더에 Next.js 프로젝트를 만들고 기존 코드와 배포는 그대로 둬요."

"지금은 하지 않음"이면 아무것도 바꾸지 않고 초기 분석 요약과 고른 설정을 보고한 뒤 끝낸다. 나중에 같은 요청으로 다시 시작하면 된다고 알린다.

## 6. 안전 점검(동의 뒤, 적용 전)
- 대상이 git 저장소가 아니면: early는 지금 자료 그대로 `git init`과 첫 커밋을 한 뒤 시작한다. operating은 되돌릴 기준이 없으므로 멈추고 "git으로 관리하지 않는 프로젝트예요. 지금 상태를 첫 커밋으로 남기고 시작할까요?"를 묻는다. 동의하면 `git init`과 첫 커밋을 하고, 아니면 끝낸다. migration은 기존 코드를 읽기만 하므로 git이 아니어도 된다(보고에 적는다).
- `git init`을 했으면 첫 커밋 전에 추적되지 않은 파일 가운데 비밀값과 생성물(`.env*`, `node_modules/`, `.next/`, `dist/`, 10MB가 넘는 파일)을 이름만 보여 준다. `.gitignore`가 없거나 그 항목이 빠졌으면 해당 항목(`.env*`와 `!.env.example`, `node_modules/` 등)을 더하고 확인을 받은 뒤 커밋한다. 비밀값은 한 번 커밋하면 이력에 남는다.
- (early, operating) 작업 트리에 커밋하지 않은 변경이 있으면 멈추고 알린다. 사용자가 정리한 뒤 다시 한다. migration의 기존 코드는 읽기만 하므로 막지 않고 보고에 적는다.
- 지금 브랜치가 기본 브랜치가 아니면 알리고, 그 브랜치에서 갈라도 되는지 묻는다.
- `prokit/setup` 브랜치가 이미 있으면 이어 쓸지, 다른 이름(`prokit/setup-2`)을 쓸지 묻는다.
- 추적 중인 `.env*` 비밀 파일이 있으면 파일 이름만 알린다(값은 출력하지 않는다). 프로킷은 이 파일을 고치지 않는다.

## 7. 기록 틀
`docs/prokit/intake.md`:

```markdown
# 도입 기록

- 날짜: <YYYY-MM-DD>
- 유형: <early|operating|migration>. <한 줄 설명>
- 대상: <경로>, 브랜치 <이름>
- 기존 코드(전환): <경로 또는 없음>
- PRD·기획 자료: <경로 목록 또는 없음>

## 초기 분석 요약
<2절의 요약 그대로>

## 확정한 설정
- 템플릿·적용 방식: <…>
- 두뇌: <이름(주), 이름> / 과설계 방지: <…> / 추가 스킬: <…> / 응답 방식: <…> / 화면 디자인 보조: <…>

## 동의
- 질문: "<5절의 문구>"
- 답: 시작 (사용자, <YYYY-MM-DD>)

## 디자인 방향
(첫 화면 작업에서 prokit-ui가 묻고 적는다)
```

`docs/first-request.md`(다음 세션이 이어 갈 요청. 사용자가 처음 보낸 요청은 아래에 그대로 붙인다):

```text
prokit-analyzer로 이 프로젝트를 정밀 분석해 docs/prokit/analysis.md에 남기고, 그 결과로 진행 계획(docs/plans/, tasks/plan.md)을 세워 확인받은 뒤 Task별로 진행해줘. 목표: <early: 프로토타입을 프로킷 개발 환경으로 옮겨 구현 | operating: 프로킷 적용과 구조 맞추기 | migration: <기존 스택>에서 Next.js로 단계 전환>.

원래 요청:
<사용자의 처음 요청 그대로>
```
