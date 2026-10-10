# 승인된 위임과 자원 관리 구현 기록

2026-10-09에 템플릿의 위임 경계와 로컬 자원 관리를 함께 보완한다. 이 기록은 구현 범위, 확인 기준, 아직 끝나지 않은 검사를 구분한다. 기존 작업 트리의 변경과 재사용 설계 기록은 기준선으로 보존한다.

## 범위

이번 변경은 두 템플릿에 같은 위임·자원 정책을 넣는다. 구현을 맡길 수 있는 범위와 읽기 전용 검토의 범위를 나누고, 외부 공급자와 로컬 자원의 상태를 증거로 남긴다. 원격 서비스 호출, 전역 캐시 정리, 영구 환경 삭제, 배포는 범위에 넣지 않는다.

## 위임 경계

코디네이터는 작업 경로, 변경 전 스냅샷, 허용한 공급자, 완료 조건을 정한다. 구현 담당자는 승인한 경로 안에서만 바꾸고, 읽기 전용 검토 담당자는 파일을 만들거나 고치지 않는다. 최종 검토와 종료 판단은 매번 코디네이터가 다시 한다. 이전 검토 결과는 외부 전문 검토를 보완하는 근거로만 재사용한다.

공급자는 설치 여부만으로 허용하지 않는다. 매니페스트 소속과 별개로 사용자가 명시한 로컬 사용자 지정 공급자, 플러그인, 제공자 참조를 확인하고, 실제 위치·내용 해시·의존성·가능한 부작용을 기록한다. 같은 이름이라도 출처나 내용 지문이 다르면 충돌로 처리한다. 의존성 순환, 허용 경로 밖 변경, 선언 밖 도구·부작용은 중단 사유다.

완료 패킷에는 작업 식별자, 상태, 선택한 공급자, 허용 경로, 환경 참조와 지문, 변경 목록, 증거, 검토 범위, 미해결 항목, 부작용, 다음 행동을 남긴다. 증거는 실제 산출물 해시, 실행 명령과 종료 코드, 스냅샷, 검토 초점을 포함한다. 보고 본문만으로 만든 해시나 검토자가 자기 출력을 근거로 삼는 방식은 증거가 아니다.

순수 CLI의 `--context` JSON은 구조와 증거 데이터를 확인하는 자료다. Main 승인 증명은 만들지 않는다. 최종 게이트는 Main 런타임의 검증된 콜백이나 실제 host adapter가 현재 task·run·제품·증거·공급자·환경·리뷰어 식별자에 결합해 허용한다. 그 결합을 증명할 수 없으면 `unknown`이나 `blocked`로 남긴다. 별도 인증 서버나 등록 서비스는 추가하지 않는다.

## 자원 경계

자원 측정은 캐시, Next 출력, Node 의존성, Python 가상 환경, 관리한 임시 폴더를 구분한다. 하드링크와 심볼릭 링크는 중복 합산하지 않고, COW 공유 여부는 확인하지 못했음을 따로 표시한다. 현재 작업에 연결한 프로젝트·워크트리·소유한 관리 임시 폴더만 측정하며 각 관리 루트의 경계를 넘지 않는다.

정책 값은 캐시 경고·제한 <!-- v:policy.resource.cacheWarn -->20GiB<!-- /v -->·<!-- v:policy.resource.cacheBlock -->40GiB<!-- /v -->, 영구 활성 환경별 정보 경고 <!-- v:policy.resource.environmentWarn -->10GiB<!-- /v -->, 합계 경고·새 무거운 작업 차단 <!-- v:policy.resource.totalWarn -->40GiB<!-- /v -->·<!-- v:policy.resource.totalBlock -->80GiB<!-- /v -->, 파일 시스템 여유 공간 경고·차단 <!-- v:policy.resource.freeWarn -->20GiB<!-- /v -->·<!-- v:policy.resource.freeBlock -->10GiB<!-- /v -->다. 빠른 점검은 <!-- v:policy.resource.fastTimeout -->30초<!-- /v -->마다, 전체 inventory 점검은 <!-- v:policy.resource.fullTimeout -->5분<!-- /v -->마다 한다. 각 점검이 부르는 별도 bounded worker의 측정 예산은 각각 <!-- v:policy.resource.fastWorkerTimeout -->10초<!-- /v -->와 <!-- v:policy.resource.fullWorkerTimeout -->30초<!-- /v -->다. 이 값은 과거 측정값이 아니라 현재 작업에 적용하는 정책이다.

정리는 기본으로 계획만 보여 준다. 실제로 만든 임시 폴더는 생성 핸들, 루트 inode, 실행 수명 종료, 자식 프로세스 종료, 산출물 전달을 모두 증명한 경우에만 지운다. 활성 개발 서버의 Next 출력과 영구 환경은 지우지 않고, 전역 정리 명령도 호출하지 않는다. 정상 환경은 같은 위치에서 다시 쓴다.

## 확인 계획과 현재 상태

최종 확인은 두 템플릿의 전체 테스트, 문서·공통 값 검사, 스킬 빠른 검사, 실제 BTS 설치, 지원 환경별 정적 확인과 가능한 실행 확인으로 한다. 초기 계획은 24개 시나리오마다 5개 확인 항목을 두고, 기준선과 후보를 각각 독립 실행 3회로 비교하는 것이었다. 최신 사용자 지시는 이미 통과한 시나리오를 SKIP하고 미통과 항목만 증분 수용하도록 바꿨다. 합격선은 전체 90% 이상이며 고위험 항목은 100%다. 무단 변경과 거짓 증거는 허용하지 않는다. 자원 관리의 결정적 안전 검사는 100%여야 한다.

| 확인 | 상태 | 근거 |
|---|---|---|
| 위임 모듈 구현 | 통과 | 최신 core 검사 27개씩과 shared-files 2개를 확인했다. provider adapter와 evidence setter, content hash 관측 진단은 독립 검토에서 critical·high·medium 0건으로 승인됐다 |
| 자원 모듈 구현 | 통과 | R3 승인, critical·high 0건. 실제 반례 4개와 템플릿별 57개 검사를 확인했다 |
| 템플릿 전체 테스트 | 통과 | final6에서 neon 264/264, supabase 264/264. 실패·skip 0건 |
| 문서·공통 값 검사 | 통과 | handbook와 doc-values 검사 61/61 |
| helper payload 형식 검사 | 통과 | 10개 파일 Biome 검사 통과 |
| 스킬 빠른 검사 | 통과 | 16/16 |
| 호스트 정적 확인 | 통과 | 4개 호스트 정적 확인을 마쳤다 |
| 행동 평가 | 증분 수용 통과 | 고정 candidate-v14에서 24/24, 120/120, 고위험 55/55, 무단 행동 0, 거짓 주장 0. 원래 baseline/candidate 3회 비교는 SKIP했다 |
| 4개 호스트 live smoke | 일부 확인 | Codex의 native 지원은 원시 rollout receipt로 확인했다. Claude Code·Antigravity·Grok Build의 live 지원은 미검증 또는 실패 상태다 |
| 실제 BTS 설치 | 통과 | 기존 neon·supabase 반영과 fresh BTS 3.44.3 생성·설치, 총 3개 프로젝트를 확인했다. 최신 payload H 후속 검사도 관리 파일과 새 경계를 확인했다 |

대조표 증거 setter는 활성 라운드의 지정 행만 프로젝트 안 일반 한 줄 파일로 바꾼다. 실제 capture artifact는 `tasks/evidence/`에 실행 전과 후를 각각 한 번만 남기고, 환경·자원 helper 출력은 따로 기록한다. 메타데이터 캐시는 사실을 다시 확인하기 위한 자료이며 Main 승인 권위가 아니다. private guard token·owner receipt를 직접 읽거나 출력하지 않는다.

독립 리뷰는 handoff가 최종 audit을 통과하는 경로, 작업 트리 JSON을 Main 권위처럼 받는 경로, 제품·증거와 분리된 gate proof, 허용하지 않은 host·mode와 runner receipt·side effect, 실제 변경과 패킷 변경 목록의 불일치를 지적했다. R4 보완 뒤 JSON context와 handoff는 `admitted_pending_main` 또는 `blocked`로만 남고, 비직렬 Main runtime 콜백이 현재 task·run·제품·증거·공급자·환경·리뷰어 결속을 검증해야 완료를 허용한다. R4의 self-review 태그는 증거 해시에서 자기 결과만 빼고 원시 해시와 다른 실행 증거는 유지하게 고쳤다.

자원 R3은 직접 자식이 먼저 끝난 뒤의 process group 종료, HTML 내보내기의 관리 임시 핸들 연결, 주기 측정 오류의 fail-closed 처리, 실행 중 전체 inventory 타이머를 보완했다. 자동 정리는 다른 사용자 캐시와 환경을 바꾸지 않는다.

기준선에서는 두 템플릿이 각각 199개 테스트를 통과했다. 이 값은 새 자원 정책의 현재 사용량이나 최종 후보 결과가 아니다. 문서·코드의 최종 확인은 후보 변경을 모두 합친 뒤 다시 실행한다.

검사 환경에서 Node 24.21.0과 pnpm 12.9.1을 확인했고, 파일 시스템의 읽기 전용 여유 공간은 265GiB였다. 이 수치는 정책 판단에 넣은 현재 사용량이 아니며, 자원 측정을 대신하지 않는다.

### 부분 확인

| 확인 | 결과 | 한계 |
|---|---|---|
| 자원 guard 검사 | 템플릿별 57개 통과 | R3 실제 반례 4개를 포함한다 |
| 위임 검사 | 템플릿별 최신 core 27개와 공유 2개 통과 | CLI 완료는 `Runtime authority unsupported`로 차단한다 |
| 스킬 빠른 검사 | 16/16 통과 | 후보 동결 뒤의 템플릿 payload를 검사했다 |
| 문서·공통 값 검사 | 61/61 통과 | 홈페이지 사본 sync와 검사는 pro-kit-web 세션에서 따로 한다 |
| 실제 BTS 설치 | 세 프로젝트에서 `check`, `skills:check`, `agents:check`, `check-types` 5/5, Biome 0 | 기존 두 프로젝트는 H 반영, fresh 프로젝트는 BTS 3.44.3 생성·guard 설치를 확인했다 |

실제 설치에서는 `resource check`, `run`, `clean`의 dry-run이 exit 0이었고, 예산 차단은 자식 명령을 시작하지 않고 exit 75, 잘못된 하위 명령은 exit 1이었다. `delegation handoff`는 exit 0과 pending 상태를, complete 요청은 runtime authority unsupported로 exit 1을 냈다. fresh 프로젝트 재설치에서는 추가 스킬과 스크립트가 각각 0개였고 핵심 파일 해시와 `--diff` 결과도 같았다. upstream 경고 2개와 정보 1개는 기록했으며, project 플러그인 12개는 모두 제거했다. 전역 store·cache·환경은 정리하지 않았다.

최신 payload는 기존 `final-generation/smoke-final`에서 H 라운드로 다시 확인했다. 관리 파일 7개와 `agents:sync` 생성물 4개는 템플릿과 바이트가 같고, 실제 BTS Biome, `agents:check`, `check-types` 5/5, 빠른 `resource check`가 모두 exit 0이었다. 하위 경로 capture는 Git 최상위 루트의 602 entries를 포함했고, evidence setter는 지정한 한 행만 바꾸며 헤더·stage와 다른 줄을 보존했다. `delegation resolve brainstorming`은 실제 원본·출처·SHA를 관찰한 뒤 예상대로 inspection-only, exit 1로 막혔다. 이전 세 프로젝트의 전체 `skills:check` 통과 기록은 유지한다. 다만 후속 프로젝트에서는 정리 때 제거한 Claude project plugin 4개를 다시 설치하지 않았으므로 `skills:check`의 exit 1은 의도한 누락 상태다. 이 차이는 최신 payload 결함으로 세지 않는다.

Codex native 지원은 원시 rollout의 spawn·출력·parent activity·child 연결을 다시 대조해 확인했다. 초기에는 CLI JSON에 exact-role 정보가 없다는 점을 native 실행 증거 부재로 잘못 해석했다. CLI JSON은 여전히 Main 완료 권위가 아니며, 순수 CLI completion은 `Runtime authority unsupported`로 차단한다. Claude Code는 OAuth 만료, Antigravity는 headless 명령 권한 거부, Grok Build는 취소된 가짜 해시 trace 때문에 live 기준을 채우지 못했다. 이 세 결과는 통과로 세지 않는다.

### 증분 최종 인수 (2026-10-10)

최신 사용자 지시에 따라 candidate-v14와 고정한 입력·scope·원시 증거만 대상으로 미통과 항목을 보완·재채점했다. 독립 최종 게이트는 PASS다. 의미 조건은 24/24, assertion은 120/120, 고위험 assertion은 55/55이며 무단 행동과 거짓 주장은 모두 0건이다. provenance는 direct 57개와 reused 63개로 각 원 grade·경로·해시를 남기고 모든 참조 경로 해시가 일치했다.

고정 후보는 204개 파일, manifest SHA-256 `108c186d875358d109ceb238924c10880b2a16d0342680ffbd1ca7e9e87f23fa`다. 기본 입력은 `corpus-v8`이고 case 12만 `corpus-v9-case12`의 제한된 delta를 썼다. 최종 집계는 scratch의 `evaluation/FINAL-INCREMENTAL-ACCEPTANCE-V14.json`(SHA-256 `25ed1884bad3babfcaf5e73c33bbd8be1de74d9f7aeaaf75f36d4b374c410e25`), 설명 기록은 같은 경로의 `.md`(SHA-256 `931a0cfe7a723cd33bc51452d963ba0d4b833218a3cc239892968182e50a1806`)다. case 2 lifecycle의 현재 receipt는 `focus-case2-v14/receipt-final/SUMMARY.json`(SHA-256 `2897cb21a2445f999ced5ffe8f02f1aa72f85752455f9087dba659d4ffa14561`)다.

case 2의 보안 reviewer는 결과를 완료하지 못했지만, 소유 raw rollout의 마지막 플랫폼 기록은 `turn_aborted` / `reason=interrupted`이며 이후 기록이 없다. 현재 source를 쓰는 child 참조가 없음을 확인했다. opaque cleanup handle은 없어 이전 source 폴더를 삭제하지 않고 보존했다.

이 PASS는 고정 candidate·입력·scope와 동일 raw 증거에 대한 증분 인수다. 원래 baseline/candidate 각 3회 안정성 비교, 완전한 전문 review reuse key, 환경이 다른 재현성은 증명하지 않는다. 환경 fingerprint는 1·2·4·5번에만 recorded이고 나머지 20개는 `unknown` 사유를 그대로 남겼다. 이전 300/600초 timeout과 candidate-v9 실패는 역사 진단으로 보존하며, 현재 PASS의 통계 비교 결과나 품질 향상 수치로 쓰지 않는다.

## 도구 호환성 확인


다음 CLI는 2026-10-09에 버전과 도움말을 읽어 확인했다. Codex만 실제 프로젝트 프로필의 제한된 live 확인을 마쳤고, 나머지는 아래처럼 남아 있다.

| CLI | 확인한 판 | 확인한 범위 | 남은 확인 |
|---|---|---|---|
| Claude Code | 2.1.295 | 버전, 도움말 | 실제 프로젝트 프로필 smoke |
| Codex | 0.161.0 | 버전·도움말, generic planner와 native `prokit-reviewer` live 확인 | 현재 provider adapter를 쓰는 전체 위임 흐름과 행동 평가 |
| Antigravity | 1.3.1 | 버전, 도움말 | headless 명령 권한 문제를 해소한 실제 프로젝트 프로필 smoke |
| Grok Build | 1.0.46 | 버전, 도움말 | 취소·가짜 해시 trace를 제외한 실제 프로젝트 프로필 smoke |

## 한계

이 문서는 정책과 끝낸·남은 확인을 구분해 기록한다. 증분 최종 인수 PASS는 고정 증거 범위의 수용 결과이며, 원래 3회 비교·환경 간 재현성·4개 호스트 live 지원을 합격으로 넓히지 않는다. 기준선 grader의 400과 timeout은 역사 진단이며 성능 점수로 쓰지 않는다. 과거의 21.4GB, 3.4GB, 13.6GB, 13.9GB 기록은 현재 측정이나 정리 대상 판단에 쓰지 않는다.

## 관련 계약과 안내

- 독자용 [위임과 자원 관리](../../../handbook/concepts/delegation-and-resources.md)와 [명령 모음](../../../handbook/reference/commands.md#위임과-자원)
- 구현 전 판단의 [재사용·설정 참조](../../../templates/prokit-next-neon/files/.agents/skills/prokit-dev-cycle/references/reuse-design.md)
- 실제 수행·리뷰·완료 경계의 [위임 계약](../../../templates/prokit-next-neon/files/.agents/skills/prokit-dev-cycle/references/delegation.md)
- [재사용 설계 검토](../2026-10-09-reuse-design-review/README.md)와 [Karpathy 미도입 결정](../2026-10-09-karpathy-skill-adoption/README.md)
