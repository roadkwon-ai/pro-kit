# v0.1.5 — Resource guard fixes and cross-environment locks

- 날짜: 2026-10-14 08:14 (KST)
- 이전 버전: v0.1.4
- 전체 변경: https://github.com/roadkwon-ai/pro-kit/compare/v0.1.4...v0.1.5

## Fixes

- 자원 guard 남은 한계 보완(lease·실행 뒤 추정·부팅 ID) (`717d06c`)
  - 다른 환경(컨테이너·다른 OS)의 lock은 lease로 판단한다. lock을 잡은 쪽이 2초마다 갱신하고 갱신이 6초 동안 멈추면 자동으로 회수한다
  - guard가 강제 종료돼도 남은 자식 그룹이나 Next가 살아 있으면 lease를 이어 간다
  - 새 컨테이너가 끝난 컨테이너의 pid 네임스페이스 번호를 다시 받아도 init 시작 시각으로 구분한다
  - macOS에서는 부팅을 kern.bootsessionuuid로 판단해 시계를 바꿔도 lock을 오판하지 않는다
  - 실행 뒤 전체 측정이 끝나지 않으면 실행 전 측정값과 다시 잰 이번 캐시·여유 공간으로 판정한다
  - 측정기가 디렉터리 여러 개를 동시에 읽어 컨테이너에 마운트한 큰 프로젝트도 더 빨리 잰다
  - 자식 그룹을 lock에 기록한 뒤에만 명령을 시작하고 회수 도중 남은 mutex는 한 단계 위 mutex로 푼다
  - dev:web 캐시의 소유 기록, 컨테이너 저장소 크기 표시, 남은 Next lock 보호를 더했다
  - delegation diff는 프로젝트 안의 절대 경로를 받고, dev-cycle은 라운드를 연 날짜를 한국 시간으로 적는다
  - supabase prokit-db 스킬에서 RLS 마이그레이션을 쓰는 법을 고쳤다
- 위임·자원 guard 결함 보완과 Better-T-Stack 표기 정리 (`3c3473c`)
  - ponytail 5.x 분류에 맞춰 리뷰 지적 처리 규칙(정확성·보안, 테스트 누락, 기존 문제, 속도, 간결성)을 다시 썼다
  - 위임 전후 대조 `dev-cycle delegation diff`를 더하고 exit 0이 아닌 검사는 완료 증거로 받지 않는다
  - `table --delegation`을 없애고 증거 파일 끝의 줄바꿈 하나는 허용한다
  - resource guard: 실행 중 측정 지연은 기록만 하고 여유 공간은 따로 확인한다
  - resource guard: CLI `clean`이 소유 기록으로 compiler cache를 정리하고 실행 중인 guard·Next가 있으면 거부한다
  - resource guard: 창 닫기(SIGHUP)를 처리하고 죽은 guard의 lock을 안전하게 회수한다
  - dev-cycle: 보조 스크립트가 없어도 `secrets`가 돌고, `resource` 오류는 exit 2, CLI `close`는 packet을 받지 않는다
  - dev-cycle: `audit --packet`이 packet의 문제를 함께 보여 준다
  - supabase: 검증 스킬에 `supabase db advisors`, 리뷰어에 RLS·`service_role` 항목을 더했다
  - 킷 이름으로 남은 BTS는 프로킷으로, 생성기 약자는 Better-T-Stack으로 고쳤다
  - 두 템플릿 VERIFICATION에 재현, 설치 실측, 독립 리뷰 결과를 기록했다
