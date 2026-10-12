# 병렬 실행과 검증 재사용 개선

2026-10-10 승인한 계획에 따라 두 템플릿의 실행·검증 계약과 프리셋 제작 작업공간의 기존 QA 도구를 보완한다. 품질 기준을 유지하며 독립 작업을 병렬 실행하고, 변경 영향이 없는 검사 증거만 재사용한다.

## 기준선과 범위

- pro-kit 기준 커밋: `fcbe2ef`. 기존 `.claude/settings.json`, `assets/`, `docs/prompts/`는 이번 변경에 넣지 않는다.
- samples 원본 아홉 파일의 사본과 SHA-256: `/Users/freelife/youtube/pro-kit-samples/backups/parallel-qa-baseline-20261010-094810/manifest.json`. samples 작업공간은 Git 저장소가 아니다.
- 변경 범위: 두 템플릿의 스킬·역할·관련 평가 입력, `qa.mjs`·`ui-audit.mjs`·`site-check.mjs`와 필요한 최소 공통 실행 코드, Claudle 검사 준비 상태, 관련 문서·안내와 홈페이지 문서 사본.
- 설치기, 기존 프로젝트 하네스, DB, 프리셋 제품 코드, 팩·릴리스·배포는 바꾸지 않는다. 기존 프로젝트에는 필요할 때 별도 H 라운드로 적용한다.
- 일반 사용자 흐름은 ego-browser와 agent-browser에 맡긴다. 기존 Playwright 배치 도구는 대량 페이지·너비 검사의 실행 수단이며 일반 브라우저 검증을 대체하지 않는다.

## 설계 근거

기존 [제작 시간 기록](../../../tutorials/reference/process-and-time.md#시간이-어디에-쓰이나요)의 메인 에이전트 시간 분배에서 전수 확인이 가장 큰 비중이었다. 이 값은 과거 제작 과정의 실측이며 이번 개선의 성과가 아니다.

- [Anthropic: Building effective agents](https://www.anthropic.com/engineering/building-effective-agents): 독립 작업의 분할과 결과 통합, 필요한 만큼의 구조.
- [Anthropic: Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system): 에이전트·도구 병렬화와 위임 비용. 연구 작업의 개선률을 개발 성과에 적용하지 않는다.
- [Playwright Best Practices](https://playwright.dev/docs/best-practices), [Parallelism](https://playwright.dev/docs/test-parallel), [Retries](https://playwright.dev/docs/test-retries): 상태 격리, 준비 조건 대기, 병렬 실행 상한과 flaky 구분.
- [Turborepo Caching](https://turborepo.dev/docs/crafting-your-repository/caching), [환경 변수](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables): 결정적인 입력과 환경이 같은 결과만 재사용.

공식 문서는 2026-10-10 확인했다. QA 작업공간의 실제 Playwright Core는 1.63.0이며 기존 패키지를 그대로 사용한다.

## 스킬과 에이전트 변경

두 템플릿 각각 스킬 세 개와 에이전트 세 개를 보완했다. 새 역할이나 스킬을 추가하지 않고, 공통 정본 `prokit-dev-cycle/references/execution-efficiency.md`에 배정·재사용·재시도 규칙을 모았다.

| 대상 | 실제 보완 | 효과 |
|---|---|---|
| `prokit-dev-cycle` | 행 실행에서 공통 효율 규칙을 읽도록 연결했다. 의존성·소유 파일·검사·산출물·완료 조건을 기준으로 배정한다 | 독립 작업은 병렬로, 공유 파일과 생성 출력은 순서대로 처리한다 |
| `prokit-verify` | 검사 재사용 조건을 연결하고, 검사 입력·공유 소비자가 바뀌거나 관련성을 모르면 재검사하도록 본문을 수정했다 | 영향 없는 통과 검사는 재사용하고 필요한 회귀검사는 유지한다 |
| `prokit-ui` | 공통 규칙을 연결하고, 중간 수정은 영향받은 화면만 재확인할 수 있게 했다. 시작·마감의 전체 링크·버튼 확인은 유지한다 | 작은 수정마다 전수검사를 반복하는 비용을 줄인다 |
| `prokit-implementer` | 공통 정본을 필수로 읽도록 연결했다. 병렬 구현자는 자신의 회귀검사를 맡고 프로젝트 전체 검사는 통합 lane에 둔다 | 여러 수행자의 중복 빌드와 공유 출력 충돌을 막는다 |
| `prokit-reviewer` | 같은 정본을 읽도록 연결했다. 전문 리뷰의 재사용 조건을 확인하고 최종 계약 게이트는 새로 수행한다 | 중복 전문 리뷰를 줄이면서 최종 검수를 유지한다 |
| `specialist-reviewer` | 위임 계약과 효율 정본을 함께 읽도록 연결했다. 기존의 내장 리뷰가 없을 때만 보완하는 역할을 유지한다 | 필요한 관점만 추가하고 같은 전체 리뷰를 되풀이하지 않는다 |

공통 정본의 운영 상한은 작업 단위 browser 넷·agent 둘·build 하나이며 중첩 worker까지 센다. 이는 코디네이터의 배정 규칙이고 기기 전체에 대한 강제 상한이 아니다. 실제 QA CLI는 worker 범위를 검사하고 guard 미지원 때 하나로 제한한다.

재검사 대상은 실패한 검사, 변경된 기능, 변경된 공통 코드의 소비자를 합친 범위다. 증거 재사용은 산출물·도구·조건·환경·기준선·신뢰한 실행 근거가 확인된 경우만 허용한다. 최초 실패와 flaky는 보존하고, 진단 재시도와 추가 재지시에는 각각 상한을 둔다.

## QA 도구와 문서 변경

- `qa.mjs`, `ui-audit.mjs`, `site-check.mjs`에 제한된 worker와 입력 순서 보존, 독립 browser context, 별도 실행 sidecar를 연결했다. 상태가 이어지는 `claudle-probe.mjs`는 한 worker로 유지했다.
- 공통 `batch-run.mjs`는 worker·출력 충돌, timeout·cleanup·flaky·누락과 resource guard 수명을 관리한다. 명령의 성공을 위임 권한이나 최종 승인으로 해석하지 않는다.
- site-check의 실패 종료 코드, 자원 측정 경합, 오류 때 브라우저·타이머 정리, 중단된 순회의 부분 결과와 실제 검사 범위를 보완했다.
- 일반 사용자 흐름은 ego-browser 우선·agent-browser 대안으로 유지했다. 기존 Playwright 묶음은 대량 배치 검사에 한정하고 새 프로젝트에 임의로 설치하거나 복사하지 않는다.
- README·CONTRIBUTING·관련 handbook·튜토리얼·두 VERIFICATION과 평가 입력을 맞췄다. pro-kit-web은 변경된 문서 사본을 동기화했으며 공개 배포는 하지 않았다.

## 검증 결과

| 항목 | 상태 | 근거 |
|---|---|---|
| 원본 보존 | 완료 | 원본 아홉 파일의 사본과 해시 |
| 실제 프로젝트 자원 시작 확인 | 완료 | 올곧·Claudle 모두 최신 resource helper의 읽기 전용 전체 측정 `ok`, unknown·timeout 없음. 관리한 경로만 측정하고 삭제하지 않았다 |
| 템플릿 계약 | 통과 | 두 템플릿 각각 264개 범위. 먼저 통과한 41개를 재사용하고 나머지 223개를 실행했다. quick validation은 변경 스킬 여섯 개 모두 통과했다 |
| QA 결정적 fixture | 통과 | 배치 일곱 사례와 실제 CLI 예외·부분 순회 네 사례. worker 상한·격리·순서·충돌·실패·timeout·cleanup·flaky·guard 시작/중간 실패를 확인했다. 변경 영향이 있는 사례만 다시 실행했다 |
| 실제 소규모 비교 | 통과 | 올곧 여덟 경로와 Claudle 네 경로. 콘솔 검사는 각 경로의 desktop/mobile, UI 점검은 각 경로의 상호작용을 비교했다. 결과 JSON이 각각 같고 실패·flaky·누락은 없었다 |
| 독립 검수 | 승인 | 정책을 적용한 여섯 결정 사례를 검토했다. 문서 조건과 코드의 오류 경로 지적을 보완하고, 영향받은 지적만 재검수해 미해결 항목이 없는 것을 확인했다 |
| 문서·홈페이지 사본 | 통과 | README·handbook·튜토리얼의 관련 부분을 보완했다. 문서 검사 61개와 홈페이지 handbook/tutorials 검사가 통과했다. 변경 후에는 영향받은 문서 검사만 다시 수행한다 |

통과한 절차는 입력이 바뀌지 않으면 다시 실행하지 않는다. 과거 위임 시나리오 전체의 반복 평가, 대형 파일 생성, 전역 설치, 전체 프리셋 재빌드·배포는 수행하지 않는다.

## 수용 조건과 한계

동일 검증 범위·동일 결함 검출·누락 없음·새로운 flaky 없음이 필수다. 실제 소규모 비교에서 병렬 실행이 직렬보다 최소 10% 짧을 때 해당 도구의 기본 worker를 둘로 수용하며, 미달하면 하나로 유지한다. worker 넷은 별도 필요가 생길 때만 확인한다.

기존 samples 프로젝트에는 resource guard가 설치되어 있지 않다. 이번 작업은 프로젝트 하네스를 덮어쓰지 않고, 명시적으로 선택한 최신 helper와 해당 프로젝트 루트를 사용해 읽기 전용으로 확인한다. 자동 정리는 하지 않는다. 일반 실행에서 helper를 확인할 수 없으면 미지원 상태를 기록하고 worker를 하나로 제한한다.

한 번의 비교는 해당 조건의 관측값이며 안정성 통계나 전체 제작 시간의 단축률이 아니다. 실제 실행하지 않은 호스트나 검사는 통과로 보고하지 않는다.

## 실제 비교

| 검사 | 대상 | 직렬 | worker 둘 | 감소율 |
|---|---|---:|---:|---:|
| 콘솔·요청 오류 검사 | 올곧 여덟 경로 × 두 너비 | 118.9초 | 61.0초 | 48.6% |
| 콘솔·요청 오류 검사 | Claudle 네 경로 × 두 너비 | 59.2초 | 31.7초 | 46.3% |
| 상호작용 점검 | 올곧 여덟 경로 | 67.4초 | 39.2초 | 41.8% |
| 상호작용 점검 | Claudle 네 경로 | 41.3초 | 24.5초 | 40.7% |

Node 실행 시작부터 종료까지 잰 값이며 자원 검사·브라우저 시작 비용을 포함한다. 사전 HTTP 확인과 정적 산출물 해시 확인은 측정 전에 끝냈다. 서로 다른 검사 배치의 측정은 겹치지 않았다. 네 비교 모두 결과 JSON이 같고 필수 품질 조건과 최소 감소율을 충족해 qa·ui-audit의 로컬 기본 worker 둘을 수용한다. guard를 지정하지 않았거나 사용할 수 없으면 실제 실행은 하나로 제한한다. site-check의 기존 기본값과 CI의 기본값은 유지하며 worker 넷으로 확대하는 비교는 하지 않았다.

자원 초기 상태 처리 수정이 첫 올곧 직렬 측정 도중 들어가 해당 한 건만 새 파일로 다시 측정했다. 이전 기록을 보존하고 최종 비교에서 제외했다. 나머지 직렬·병렬 비교는 수정 이후 같은 코드에서 실행했다.

Claudle의 상태를 이어 쓰는 probe는 한 worker로 유지한다. 실제 내보낸 화면에서 한글 조합·줄바꿈, 스트리밍 중지, 새로고침 뒤 저장, 검색·초점, 사이드바, 없는 대화, iframe 격리와 모바일을 열 가지 항목으로 확인했다. AI 응답만 임시 SSE fixture로 바꿨으며 실제 AI 서버나 운영 DB에는 요청하지 않았다. 첫 모의 fetch가 Request/URL 입력을 잘못 처리해 실패한 기록은 보존하고, fixture를 고친 뒤 열 가지 모두 통과했다. 부정 경로의 404 진단도 별도로 기록했다. 임시 정적 서버의 루트 favicon 요청도 404로 확인해 제품 결함과 구분했다. 이 probe는 실제 AI 서버와 전체 브라우저 오류 예산의 인수 증거를 대신하지 않는다.

## 원시 증거와 재사용

원시 로그·결과·측정 조건·코드 해시는 저장소 밖 `/Users/freelife/youtube/pro-kit-samples/checks/parallel-verification-20261010/`에 둔다. 핵심 파일은 `baseline.json`, `candidate.json`, `acceptance.json`, `clean-timings.json`, `olgot-clean-1-final-timing.json`, `ui-timings.json`, `guard-final.log`, `cli-errors-final.log`, `crawl-error.log`, `claudle-state-probe-diagnostic.log`이다. 이전 41개 대상 검사와 quick validation은 네이티브 수행자가 관측한 출력의 재구성 기록 `template-targeted.txt`로 회수했으며 원시 로그인 것처럼 표기하지 않는다. 나머지 템플릿 검사는 `neon-remaining-tests.log`·`supabase-remaining-tests.log`에 있다.

측정용 임시 스크립트와 로그를 pro-kit 저장소에 넣지 않는다. 사본 갱신은 로컬 반영이며 production 배포, 커밋·push, 팩 재발행을 의미하지 않는다. 원본 프리셋 제품과 설치 환경은 바꾸지 않았다.

## 최종 범위 확인

후속 요청에서 사용자는 기존 올곧·Claudle의 H 이행 대신 템플릿 개선 검수와 보고만 마무리하기로 정했다. 기존 작업 기록을 분석하고 개선을 검증하는 데 완성 프로젝트의 하네스 갱신은 필수 조건이 아니다. 이 보고서의 성능 관측과 원본 구현 검사 결과는 유지하며, 기존 프로젝트에 적용했다고 표시하지 않는다.

마감 확인에서는 원시 검사 기록과 현재 파일 해시를 대조했다. QA 코드와 테스트 일곱 파일은 `candidate.json`과 같았다. 두 템플릿의 기록된 스킬·에이전트·평가·검사 파일 해시도 같았다. 실행 효율 참조는 초기 해시 기록 뒤 최종 문구를 보완한 파일이므로 초기 해시와 같은 것으로 처리하지 않았으며, 기존 최종 공유 파일 검사와 설치 연결 검사 결과를 연결했다. 통과한 검사를 새로 실행한 것처럼 보고하지 않는다.

이행 준비 중 발생한 기존 변경 정리와 올곧 H 변경 복구는 [H 처리 기록](../2026-10-10-h-migration/README.md)에 구분한다. 이 보고서의 원본 제품 미변경 범위는 최초 병렬 실행 개선 작업을 가리킨다. 후속 기존 변경 커밋과 혼동하지 않는다.
