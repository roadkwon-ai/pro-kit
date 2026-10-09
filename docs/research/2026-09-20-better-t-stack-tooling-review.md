# Next.js 데모 튜토리얼의 스킬·플러그인 검토

조사일: 2026-09-20  
범위: 지정된 외부 자료, 로컬 리서치, `references/nextjs-supabase-fullstack-kit`의 구성과 지침.  
상태: 읽기 전용 조사에 근거한 추천. 설치·생성·호환성 실행 검증 결과가 아니다.

## 결론

첫 과정은 **소수의 기술 스킬, 짧은 프로젝트 규칙, 단계별 완료 기준**으로 구성한다. 기능 하나를 끝내는 개발 주기를 먼저 경험하고, 같은 절차를 반복하는 단계에서 프로젝트 전용 스킬로 묶는 방식이 적합하다. 전체 플러그인 키트는 고급 실습으로 분리한다.

스킬·플러그인·에이전트는 다음처럼 구분해서 설명한다.

| 용어 | 역할 | 이 과정의 사용 예 |
| --- | --- | --- |
| 지침 파일 | 프로젝트의 공통 약속 | `AGENTS.md`, 도구별 `CLAUDE.md` |
| 스킬 | 특정 작업의 수행 방법·참고 자료 | React 구현 검토, DB 설계 검토 |
| 플러그인 | 재사용 기능을 설치 가능한 묶음으로 배포 | 여러 스킬·도구 연결을 함께 제공 |
| 에이전트 | 한 작업을 수행하는 주체 | 구현 담당, 별도의 읽기 전용 검토 담당 |
| 개발 주기 | 기능 하나를 끝내는 순서 | 범위 확인→구현→검증→문서 갱신 |

Codex 공식 문서도 로컬 스킬 작성과 플러그인을 통한 배포를 구분한다. 동명의 스킬이 여러 위치에 있으면 자동으로 하나로 병합되지 않으므로 기존 설치를 먼저 확인한다. [공식 스킬 문서](https://developers.openai.com/codex/skills/)

## 1. Vercel 자료

사용자가 지정한 [`vercel-labs/skills`](https://github.com/vercel-labs/skills)는 스킬 설치·검색 CLI다. 실제 React 관련 콘텐츠는 [`vercel-labs/agent-skills`](https://github.com/vercel-labs/agent-skills)에 있다.

추천하는 시작 구성은 `vercel-react-best-practices`와 `web-design-guidelines`다. 컴포넌트의 합성 설계가 복잡해졌을 때 `vercel-composition-patterns`를 추가한다. 웹 과정에 React Native 스킬을 필수로 넣을 이유는 없다.

React 스킬의 예제에 다른 라이브러리가 등장해도 기존 tRPC·TanStack Query를 교체하거나 예제의 의존성을 자동 추가하지 않는다. 해당 원칙이 현재 코드에 적용되는지 판단해야 한다.

설치 후보 명령은 다음과 같다. **아래 명령은 이번 조사에서 실행하지 않았다.** 최종 실습 본문에는 실행 검증한 CLI 버전·스킬 리비전과 도구별 명령을 기록한다.

```bash
npx skills list
npx skills add vercel-labs/agent-skills --list
npx skills add vercel-labs/agent-skills \
  --skill vercel-react-best-practices web-design-guidelines \
  --agent codex
```

현재 사용자 환경에는 같은 역할의 스킬이 이미 다수 노출되어 있다. 중복 설치를 기본 행동으로 안내하지 않는다. 새로운 독자의 환경과 작성자의 설치 환경도 구분한다.

## 2. Supabase 자료

[`supabase/agent-skills`](https://github.com/supabase/agent-skills)는 Supabase 조직의 저장소다. 조사 시점에는 `supabase`와 `supabase-postgres-best-practices`를 제공한다.

- 일반 PostgreSQL만 사용한다면 Postgres 스킬을 DB 단계에서 활용한다.
- Supabase 제품을 실제로 사용할 때 범용 Supabase 스킬을 추가한다.
- SQLite를 사용하는 별도 과정에 PostgreSQL 전용 규칙을 그대로 강제하지 않는다.

Better-T-Stack의 DB 호스팅 선택과 인증 제공자 선택은 구분해야 한다. Supabase PostgreSQL을 쓴다는 이유로 Supabase Auth가 필수라고 설명하지 않는다. [BTS 옵션](https://www.better-t-stack.dev/docs/cli/options)

마이그레이션은 한 도구를 기준으로 관리한다. Drizzle이 관리하는 테이블을 Supabase SQL 편집기와 별도 선언형 스키마로 각각 변경하는 흐름은 본문에 섞지 않는다. 실제 DB 역할에 따른 RLS 적용 여부와 서버 소유권 검사도 별도로 검증한다.

## 3. 내부 nextjs-supabase-fullstack-kit

키트의 로컬 README와 dev-cycle 스킬을 확인했다. 이 문서는 키트를 실행해 인증한 결과가 아니라 내부 구현·지침을 읽고 비교한 결과다.

가져올 만한 요소:

- 변경 파일을 근거로 필요한 검토를 고르는 방식.
- 작업 시작과 종료 시점의 체크리스트.
- 구현과 읽기 전용 검토의 역할 분리.
- 용어가 확정될 때 도메인 문서를 갱신하는 원칙.
- 검증 근거가 없는 완료 표시를 걸러내는 감사 절차.

그대로 가져오기 전에 조정할 요소:

| 요소 | 확인 내용 | 튜토리얼 반영 |
| --- | --- | --- |
| 인증·데이터 접근 | Supabase 중심 규칙과 기본 인증 선택을 포함한다 | Better Auth·서버 ORM 경계에 맞춰 선별 적용 |
| 스킬·에이전트 호출 | Claude 플러그인 이름을 사용하는 호출이 있다 | Codex·Claude 호출 블록 분리 |
| 설치·동기화 | Claude 설치본을 기준으로 Codex 미러를 생성하는 체계다 | 원본과 생성물을 구분하고 생성물 수동 편집 금지 |
| 감사 러너 | Git 비교 기준과 정해진 진행표 형식을 사용한다 | 학습 초기에는 작은 체크리스트로 시작 |
| 기능 수 | 여러 도메인·외부 서비스용 스킬을 포함한다 | 본문 기능과 관계있는 것만 선택 |

특히 참고 저장소의 `AGENTS.md`에 있는 “Codex에는 … 플러그인 스킬이 없다” 같은 설명을 현재 Codex 전체의 사실로 재사용하지 않는다. 실제 호스트 기능과 최신 공식 문서를 기준으로 지원 범위를 확인한다. [Codex 공식 스킬·플러그인 설명](https://developers.openai.com/codex/skills/)

추천은 **패턴을 차용한 경량 개발 주기**다. 기능을 추가할 때마다 두 필수 문서를 읽고, 작은 범위로 구현·검증하고, 바뀐 용어·경로·모델·역량을 갱신한다. 전체 키트 설치와 동기화는 본 과정을 완주한 뒤 비교한다.

## 4. Karpathy 관련 스킬

[`multica-ai/andrej-karpathy-skills`](https://github.com/multica-ai/andrej-karpathy-skills)는 Karpathy의 관찰을 바탕으로 제삼자가 정리한 자료다. Karpathy 본인이 배포한 공식 스킬이라는 근거는 확인하지 못했다.

다음 원칙을 프로젝트 규칙에 짧게 반영하는 것은 유용하다.

1. 불명확한 가정은 공개하고 중요한 모호성은 해소한다.
2. 요구한 동작에 필요한 가장 단순한 구현을 선택한다.
3. 변경 범위를 좁히고 관계없는 코드를 고치지 않는다.
4. 완료 기준을 검증 가능한 동작으로 표현한다.

조사한 README에는 사용자 지정 저장소명과 다른 소유자의 설치 예제가 남아 있고, `curl -o CLAUDE.md` 방식은 기존 지침을 덮어쓸 수 있다. 설치 블록을 그대로 복사하지 않고 원칙을 검토해 병합하도록 안내한다. [조사한 README 리비전](https://github.com/multica-ai/andrej-karpathy-skills/blob/2c606141936f1eeef17fa3043a72095b4765b9c2/README.md)

## 5. hqman의 CLAUDE.md Gist

[지정된 Gist](https://gist.github.com/hqman/e29cb6386c539d795767e8c3fd2c959b)는 계획, 하위 에이전트, 교훈 기록, 검증, 자율적 버그 수정 규칙을 담고 있다. 제목은 Boris Cherny의 지침이라고 소개하지만 본문에서 원저작 출처를 확인할 수 없어 공식성은 확인되지 않았다.

본 과정에는 완료 전 검증, 재발한 오류의 원인을 공통 규칙에 반영, 구체적인 작업 추적을 선별해 적용한다. 비단순 작업마다 계획 모드·하위 에이전트를 일괄 요구하는 부분은 brainstorming·OMX·개발 주기와 중복될 수 있다. 계획과 진행 상태의 기준 문서를 하나로 정한다.

`AGENTS.md`·`CLAUDE.md`·개발 주기 스킬에 같은 규칙을 각각 복사하면 수정 시점이 어긋날 수 있다. 공통 규칙, 도구별 차이, 상세 참고 자료를 나누되 서로 링크한다.

## 6. Skillstead 도식

[`kyungseo/skillstead`](https://github.com/kyungseo/skillstead)는 작업별로 스킬을 선택할 수 있는 모음이다. 이 환경에서는 `svg-infographic` 0.8.3을 확인했다. 조사 시점 upstream README는 해당 스킬 0.12.0을 표시했으므로 설치본을 최신 버전이라고 소개하지 않는다.

현재 설치본으로 편집 가능한 SVG, 문서용 2배 PNG, 검사·렌더 기록을 만드는 구성을 추천한다. 이 작업을 위해 사용자 전역 스킬을 자동 업데이트할 필요는 없다. 렌더에는 Node와 사용 가능한 Chromium 계열 브라우저가 필요하다.

최종 튜토리얼의 도식은 학습 순서, 웹·API·DB 경계, 인증·소유권, 사용자 흐름, AI 요청·실패 처리, 문서 갱신 주기를 중심으로 한다. 그림이 늘어나는 것보다 각 그림이 설명할 질문을 명확히 하는 것이 중요하다.

## 7. 필수 문서의 위치와 유지 방식

실습 앱의 기준 경로는 `docs/domain/glossary.md`, `docs/domain/project.md`다. 용어집은 한글·영문·정의·실제 코드 매핑을 제공하고, 개관은 서비스·플로우·스택·URL·모델·9개 역량·설계 원칙·범위 밖 항목을 제공한다.

작업 시작 프롬프트는 두 문서를 먼저 읽게 한다. 단계 종료 프롬프트는 변경한 용어·테이블·URL·권한·역량이 있는지 확인하게 한다. 바뀌었으면 같은 작업에서 문서를 갱신하고, 바뀌지 않았으면 진행표에 그 이유를 기록한다.

문서의 존재를 검사하는 도구만으로 의미의 정확성이 보장되는 것은 아니다. 최종 검토에서 코드·스키마·테스트와 문서 내용을 대조해야 한다.

## 8. 출처와 확인 범위

| 자료 | 조사 시점 확인 리비전 |
| --- | --- |
| Skills CLI | `7407f3893ad4dceab546ac002c3ef806e4000c73` |
| Vercel agent-skills | `063bee94c3f4df8453406c830b0a7df0f2860278` |
| Supabase agent-skills | `8331f910845103c08d51f6ca1d86ebb7d1f745e3` |
| Karpathy 관련 자료 | `2c606141936f1eeef17fa3043a72095b4765b9c2` |
| hqman Gist | `47e5cc85bfd4d051b080b7f12f80e549281e5a50` |

위 값은 조회한 소스를 식별하기 위한 기록이며 호환성 보장이나 릴리스 버전을 뜻하지 않는다. 원문·로컬 자료를 읽었지만 설치 명령 전체, fullstack-kit 동기화, 앱 생성·실행·배포는 이번 조사에서 수행하지 않았다.

추가 직접 출처:

- [Vercel React 스킬](https://github.com/vercel-labs/agent-skills/blob/063bee94c3f4df8453406c830b0a7df0f2860278/skills/react-best-practices/SKILL.md)
- [Web Design Guidelines](https://github.com/vercel-labs/agent-skills/blob/063bee94c3f4df8453406c830b0a7df0f2860278/skills/web-design-guidelines/SKILL.md)
- [Supabase 스킬 README](https://github.com/supabase/agent-skills/blob/8331f910845103c08d51f6ca1d86ebb7d1f745e3/README.md)
- [Supabase 스키마 변경 절차](https://github.com/supabase/agent-skills/blob/8331f910845103c08d51f6ca1d86ebb7d1f745e3/skills/supabase/SKILL.md#making-and-committing-schema-changes)
