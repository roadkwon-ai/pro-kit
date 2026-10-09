# prokit 스킬 8개
https://prokit-web.vercel.app/docs/skills/prokit-skills/

> 한눈에: 프로킷 전용 스킬 8개는 이 프로젝트에서 일하는 방법을 에이전트에게 알려 주는 작업 설명서예요. 스킬 이름을 몰라도 돼요. "할 일에 마감일 붙여줘"처럼 평소 말로 요청하면 에이전트가 맞는 스킬을 스스로 불러와요.

## 8개의 스킬

| 스킬 | 맡는 일 | 이런 요청에 쓰여요 | 지키게 하는 것 |
|---|---|---|---|
| `prokit-dev-cycle` | 작업 진행. 요청을 케이스로 나누고 대조표를 열어요 | 만들어줘, 고쳐줘, 바꿔줘, 완료 처리 | 모든 단계에 증거를 남기고 `audit`을 통과해야 완료 |
| `prokit-web` | 화면 동작(라우팅, 데이터 불러오기, 캐시) | 페이지 추가, 로그인한 사람만, 느려요 | 로그인 확인은 서버에서, 로딩·빈·오류 상태 구분, 서버 비밀값은 브라우저로 보내지 않기 |
| `prokit-ui` | 화면 모양과 사용 경험(impeccable) | 디자인해줘, 예쁘게, 접근성 점검 | 첫 화면 전에 디자인 스타일 후보 1~3개 추천, `DESIGN.md` 스펙 검사(lint), 코드 전에 브리프 확인, 디자인 토큰만 사용, 점수 기준(audit 16/20) |
| `prokit-api` | 서버 API, 로그인, 권한 | API 추가, 남의 데이터가 보여요 | 로그인 필수, 자기 데이터만 접근, 입력 검증, 2계정 격리 테스트 |
| `prokit-db` | 테이블과 마이그레이션 | 컬럼 추가, 테이블 만들기, 쿼리가 느려요 | 마이그레이션 파일로만 변경, 로컬 → 병합 전(기본 브랜치에 합치기 전) → 운영 순서, 데이터를 잃을 수 있는 변경은 두 단계. Supabase는 모든 테이블에 RLS(행 단위 접근 제한) |
| `prokit-verify` | 검사 선택과 증거 기록 | 검증해줘, 테스트 돌려, 끝났어? | 실행하지 않은 검사는 통과로 적지 않기 |
| `prokit-deploy` | Vercel 배포(develop, production)와 되돌리기 | develop에 올려줘, 운영에 배포해줘, 롤백해줘 | 요청하거나 라운드 끝에서 고를 때만 배포, DB 먼저 적용, 로컬 `.env`는 올리지 않고 배포 값은 Vercel 환경변수에만, 운영은 기본 브랜치에서만 |
| `prokit-skills-update` | 에이전트가 쓰는 외부 스킬 업데이트 | 스킬 업데이트해줘, 스킬 최신이야? | 작업을 시작할 때 하루 한 번 새 버전 확인, 업데이트는 물어보고 한 라운드로 커밋, 원격에서 없어진 스킬은 지우지 않고 알림 |

## 스킬끼리 이어지는 방식

- **진입점은 `prokit-dev-cycle`**: 코드를 바꾸는 요청은 모두 여기서 시작해요. 케이스를 정하고 대조표를 열어요([dev-cycle 라운드](https://prokit-web.vercel.app/docs/concepts/dev-cycle/)).
- **계층 스킬**: 행을 실행할 때 화면 동작은 `prokit-web`, 화면 모양과 사용 경험은 `prokit-ui`, API와 인증은 `prokit-api`, DB는 `prokit-db`, 검사와 증거는 `prokit-verify`를 불러요.
- **공식 스킬 연결**: 분야별 스킬(web, ui, api, db, verify)과 dev-cycle 대조표의 각 행은 그 단계에서 읽을 공식 스킬(Next.js, React, Better Auth, shadcn, impeccable, Neon 또는 Supabase, Vercel)을 정해 둬요([공식 스킬과 연결](https://prokit-web.vercel.app/docs/skills/official-skills/)).
- **배포는 따로**: 배포 요청은 코드를 바꾸지 않으므로 라운드 없이 `prokit-deploy`가 메인 세션에서 맡아요.

## 자세히

- **위치**: 설치된 프로젝트의 `.agents/skills/prokit-*/SKILL.md`예요. Claude Code는 `.claude/skills/`의 링크로 같은 파일을 읽어요.
- **Next.js는 설치된 판의 문서부터**: `node_modules/next/dist/docs`를 먼저 읽게 해요. 에이전트가 학습한 옛 API를 그대로 쓰는 일을 줄이려는 거예요.
- **효과**: 같은 요청을 스킬이 있을 때와 없을 때로 나눠 체크 항목으로 채점했어요. 스킬이 있을 때 `prokit-dev-cycle` 93%(없을 때 27%), `prokit-ui` 100%(12%)였어요. 스킬별 수치는 [검증 결과](https://prokit-web.vercel.app/docs/reference/verification/)에 있어요.
- **스킬을 고치는 일**: `prokit-*` 스킬을 바꾸는 작업은 케이스 H 라운드로 하고, 스킬 본문을 바꿨으면 skill-creator eval을 다시 돌려요([케이스 A\~F·H와 대조표](https://prokit-web.vercel.app/docs/concepts/cases/)).

## 관련 문서

- [공식 스킬과 연결](https://prokit-web.vercel.app/docs/skills/official-skills/)
- [선택 스킬 묶음](https://prokit-web.vercel.app/docs/skills/optional-bundles/)
- [하네스 엔지니어링](https://prokit-web.vercel.app/docs/concepts/harness/)
- [UI/UX 흐름](https://prokit-web.vercel.app/docs/design/ui-flow/)
