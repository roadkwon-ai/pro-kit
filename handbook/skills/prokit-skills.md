# prokit 스킬 <!-- v:prokit.skills.count -->10<!-- /v -->개

> 한눈에: 프로킷 전용 스킬 <!-- v:prokit.skills.count -->10<!-- /v -->개는 이 프로젝트에서 일하는 방법을 에이전트에게 알려 주는 작업 설명서예요. 스킬 이름을 몰라도 돼요. "할 일에 마감일 붙여줘"처럼 평소 말로 요청하면 에이전트가 맞는 스킬을 스스로 불러와요.

## <!-- v:prokit.skills.count -->10<!-- /v -->개의 스킬

| 스킬 | 맡는 일 | 이런 요청에 쓰여요 | 지키게 하는 것 |
|---|---|---|---|
| `prokit-dev-cycle` | 작업과 검사 배정·감독·통합. 요청을 케이스로 나누고 대조표를 열어요 | 만들어줘, 고쳐줘, 바꿔줘, 완료 처리 | 공식 전문 스킬을 연결하고 모든 단계의 증거·최종 검수·`audit` 통과를 확인 |
| `prokit-pack-use` | 완성팩 복원·개인화·실전 개발 | 이 팩으로 만들어줘, 프리셋처럼 유지해줘 | 팩 무결성과 충돌 확인, 실제 복원·실행 검사, 완성 프리셋 대비 화면·모션 유지 |
| `prokit-web` | 화면 동작(라우팅, 데이터 불러오기, 캐시) | 페이지 추가, 로그인한 사람만, 느려요 | 로그인 확인은 서버에서, 로딩·빈·오류 상태 구분, 서버 비밀값은 브라우저로 보내지 않기 |
| `prokit-ui` | 화면 모양과 사용 경험(impeccable) | 디자인해줘, 예쁘게, 접근성 점검 | 새 디자인의 스타일 후보 추천·완성팩의 제공 디자인 유지, `DESIGN.md` 스펙 검사(lint), 코드 전에 브리프 확인, 선택 묶음 `taste`가 있으면 고른 화면에 taste-skill 방향·검사 보태기, 디자인 토큰만 사용, 점수 기준(audit <!-- v:devCycle.ui.auditMin -->16<!-- /v -->/20) |
| `prokit-api` | 서버 API, 로그인, 권한 | API 추가, 남의 데이터가 보여요 | 로그인 필수, 자기 데이터만 접근, 입력 검증, 2계정 격리 테스트 |
| `prokit-db` | 테이블과 마이그레이션 | 컬럼 추가, 테이블 만들기, 쿼리가 느려요 | 마이그레이션 파일로만 변경, 로컬 → 병합 전(기본 브랜치에 합치기 전) → 운영 순서, 데이터를 잃을 수 있는 변경은 두 단계. Supabase는 모든 테이블에 RLS(행 단위 접근 제한) |
| `prokit-verify` | 영향 검사 선택, 담당자·재사용 조건 확인과 증거 기록 | 검증해줘, 테스트 돌려, 끝났어? | 실행하지 않은 검사는 통과로 적지 않고, 전문 증거 재사용과 새 최종 검수를 구분 |
| `prokit-deploy` | Vercel 배포(develop, production)와 되돌리기 | develop에 올려줘, 운영에 배포해줘, 롤백해줘 | 요청하거나 라운드 끝에서 고를 때만 배포, DB 먼저 적용, 로컬 `.env`는 올리지 않고 배포 값은 Vercel 환경변수에만, 운영은 기본 브랜치에서만 |
| `prokit-skills-update` | 에이전트가 쓰는 이미 고른 외부 스킬을 최신으로 업데이트 | 스킬 업데이트해줘, 스킬 최신이야? | 작업을 시작할 때 하루 한 번 새 버전 확인, 업데이트는 물어보고 한 라운드로 커밋, 원격에서 없어진 스킬은 지우지 않고 알림 |
| `prokit-skills-manage` | 두뇌, 과설계 방지 스킬, mattpocock 추가 스킬, 선택 묶음을 진행 중에 바꾸기·더하기·빼기 | 두뇌를 openspec으로 바꿔줘, tdd 스킬 빼줘, 선택 스킬 묶음 더해줘 | 열린 라운드를 닫은 뒤 H 라운드로 처리, 바뀐 구성을 보여 주고 확인받은 뒤 커밋, 필수 mattpocock 3개와 공식 스킬은 지우지 않음 ([두뇌와 선택 스킬](brains.md#바꾸기)) |

프로킷 스킬은 프로젝트 계약과 진행 관리를 맡아요. 일반 기술 지식과 전문 구현·설계·리뷰는 작업에 맞는 외부 스킬에 연결하고, 실제 결과를 확인해 재지시하거나 최종 수용해요. 스킬 선택과 증거 경계는 [위임과 자원 관리](../concepts/delegation-and-resources.md)에 있어요.

## 스킬끼리 이어지는 방식

- **진입점은 `prokit-dev-cycle`**: 코드를 바꾸는 요청은 모두 여기서 시작해요. 케이스를 정하고 대조표를 열어요([dev-cycle 라운드](../concepts/dev-cycle.md)).
- **계층 스킬**: 행을 실행할 때 화면 동작은 `prokit-web`, 화면 모양과 사용 경험은 `prokit-ui`, API와 인증은 `prokit-api`, DB는 `prokit-db`, 검사와 증거는 `prokit-verify`를 불러요.
- **공식 스킬 연결**: 분야별 스킬(web, ui, api, db, verify)과 dev-cycle 대조표의 각 행은 그 단계에서 읽을 공식 스킬(Next.js, React, Better Auth, shadcn, impeccable, Neon 또는 Supabase, Vercel)을 정해 둬요([공식 스킬과 연결](official-skills.md)).
- **외부 스킬도 연결해요**: 기본 공식 스킬 외에 현재 접근 가능한 사용자 지정·프로젝트별 스킬도 선택할 수 있어요. 문서 작업에는 필요한 문서·글쓰기·한국어 검수 단계를 연결하고, 내장 리뷰와 겹치는 검토는 반복하지 않아요.
- **개발 자원을 함께 봐요**: `prokit-dev-cycle`은 관리하는 개발·빌드·설치·검증 작업에서 자원 상태를 확인해요. 명령은 [명령 모음](../reference/commands.md#위임과-자원)에 있어요.
- **배포는 따로**: 배포 요청은 코드를 바꾸지 않으므로 라운드 없이 `prokit-deploy`가 메인 세션에서 맡아요.

완성팩 작업은 `prokit-pack-use`가 다운로드·무결성 확인·복원 계획 검사·실제 복원을 거쳐 개인화와 실전 개발로 연결해요. 화면과 모션은 완성 프리셋을 기준으로 비교해요. 원본 사이트 조사와 COPY 제작은 별도 비공개 저장소 `pro-kit-preset-skills`가 맡아요([담당 구분](../design/preset-publication.md#담당-구분)). `prokit-skills-update`는 이미 고른 스킬을 최신으로 올리는 일만 맡고, 고른 구성을 바꾸는 일은 `prokit-skills-manage`가 맡아요. `prokit-skills-update`는 프로젝트 스킬 갱신과 네이티브 플러그인·훅 상태를 [설치와 업데이트 구조](install-and-update.md)대로 따로 확인해요.

## 자세히

- **위치**: 설치된 프로젝트의 `.agents/skills/prokit-*/SKILL.md`예요. Claude Code는 `.claude/skills/`의 링크로 같은 파일을 읽어요.
- **기존 프로젝트에 도입할 때**: `install.sh --adopt`는 Better-T-Stack이 아닌 Next.js 프로젝트에 `prokit-dev-cycle`, `prokit-verify`, `prokit-web`, `prokit-ui`, `prokit-skills-update`, `prokit-skills-manage`만 복사해요. Better-T-Stack 전용 스킬은 건너뛰어요([기존 프로젝트에 도입하기](../start/adopt.md)).
- **에이전트**: 스킬과 별개로 읽기 전용 정밀 분석을 맡는 `prokit-analyzer`를 포함해 프로젝트 에이전트가 <!-- v:prokit.agents.count -->4<!-- /v -->개예요([에이전트 역할](../concepts/agent-roles.md)).
- **Next.js는 설치된 판의 문서부터**: `node_modules/next/dist/docs`를 먼저 읽게 해요. 에이전트가 학습한 옛 API를 그대로 쓰는 일을 줄이려는 거예요.
- **효과**: 같은 요청을 스킬이 있을 때와 없을 때로 나눠 체크 항목으로 채점했어요. 스킬이 있을 때 `prokit-dev-cycle` <!-- v:eval.dev-cycle.with -->93<!-- /v -->%(없을 때 <!-- v:eval.dev-cycle.without -->27<!-- /v -->%), `prokit-ui` <!-- v:eval.ui.with -->100<!-- /v -->%(<!-- v:eval.ui.without -->12<!-- /v -->%)였어요. 스킬별 수치는 [검증 결과](../reference/verification.md)에 있어요.
- **스킬을 고치는 일**: `prokit-*` 스킬을 바꾸는 작업은 케이스 H 라운드로 하고, 스킬 본문을 바꿨으면 skill-creator eval을 다시 돌려요([케이스 <!-- v:devCycle.cases.range -->A\~F·H<!-- /v -->와 대조표](../concepts/cases.md)).

## 관련 문서

- [공식 스킬과 연결](official-skills.md)
- [선택 스킬 묶음](optional-bundles.md)
- [하네스 엔지니어링](../concepts/harness.md)
- [UI/UX 흐름](../design/ui-flow.md)
