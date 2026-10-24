# 실행 효율과 재검증

위임의 출처·권한·패킷 계약은 [delegation.md](delegation.md), 증거의 형식은 `prokit-verify`가 정한다. 이 문서는 같은 계약을 반복하지 않고 작업 분할과 검사 재사용만 정한다.

## 적용 대상과 범위

- 읽기 전용 분석, 템플릿 하네스 보완<!-- edition:pro -->, 기존 프로젝트 이행<!-- /edition -->은 별도 작업이다. 사용자가 완성 사이트에 H 반영·build·수정 작업을 명시하지 않으면 그 사이트에는 하지 않는다. 대상 프로젝트의 하네스 수정을 명시했다면 그 프로젝트의 H 라운드는 그대로 쓴다.

## 작업 분할

- 독립 작업은 의존성, 소유 파일, 완료 조건, 산출물과 검사를 배정한다. 작은 관련 작업은 같은 수행자에게 묶고, 같은 파일·생성 산출물·소비자를 건드리면 순서대로 처리한다. Main은 조정·통합·최종 게이트만 맡고 전문 구현을 대신 쓰지 않는다.
- 구현자는 자신이 바꾼 동작의 배정된 회귀 검사만 한다. `.dev-cycle.json`의 `commands`에 등록된 전역 검사를 각 수행자가 자동으로 반복하지 않는다. 프로젝트 전체 typecheck·lint·build는 통합 뒤 한 번의 통합 lane에서 한다. UI의 impeccable `critique`·`audit`은 메인 세션에서만 실행한다.
- provider가 실제로 지원하는 capability만 쓴다. 내장 review coverage는 재사용하고 빈 계약만 보완한 뒤, `prokit-reviewer`의 fresh final gate를 항상 거친다. 읽기 전용 artifact는 write authority가 아니다.
- 병렬 작업은 서로 겹치지 않는 쓰기 범위만 쓴다. CI의 QA worker는 기본 하나로 두고, browser 4, agent 2, build 1을 한 작업의 상한으로 잡으며 중첩 worker도 센다. 이 상한은 host 전체 용량을 보장하지 않는다. guard나 worker 지원이 없으면 독립 읽기 browser만 하나로 제한하고 `unsupported`로 기록한다. 실제 자원 측정이 `unknown` 또는 `block`이면 새 batch를 시작하지 않는다. authority나 실행 권한이 unknown이면 병렬 수를 낮춰도 실행하지 않는다.
- 같은 frozen artifact를 읽는 독립 review와 QA는 병렬로 할 수 있다. batch의 planned·executed·missing coverage와 receipt를 구분해 남긴다. 일반 런타임 확인은 ego-browser를 우선하고 agent-browser를 기록한 대안으로만 쓴다. Playwright는 이미 승인한 batch에만 쓰며 일반 대안으로 넓히지 않는다.

## 검사와 증거

- 같은 artifact·도구·조건·환경·baseline·trusted receipt가 모두 알려져 같을 때만 그 검증을 재사용한다. 하나라도 unknown이면 관련 범위를 다시 검사한다. 최초 baseline은 유효한 초기 검사가 있을 때만 생략하며, 새 사이트·layout·token·route는 관련 전체를 검사한다. dev 런타임 증거와 정적 build 증거는 서로 대신하지 않는다.
- 재검사는 이전 검사가 실패했거나, 해당 검사 입력이 바뀌었거나, 바뀐 공유 의존성의 소비자가 있을 때 한다. stale `.next/types` 오류는 먼저 원인을 확인하고 필요한 생성물만 새로 고치며, 무관한 전체 build로 덮지 않는다.
- 첫 실패의 raw output은 보관한다. flaky 가능성은 진단 목적의 재시도 한 번만 허용하고, 재시도가 성공해도 첫 실패를 PASS로 바꾸지 않는다. 추가 재지시는 provider를 바꿔도 기존 추가 재지시 횟수를 합쳐 총 두 번을 넘기지 않으며, provider의 더 낮은 상한이 있으면 그것을 따른다. 그 뒤에는 `blocked`로 남긴다.
