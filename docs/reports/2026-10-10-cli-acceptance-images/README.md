# 실제 CLI 기술 인수와 생성 이미지 누락 보완

2026-10-10 슬라이드랩의 생성 이미지와 Prokit의 실제 CLI 기술 인수를 보완했다. 최종 관리 실행은 exit 0, `technicalAcceptance: complete`, fresh `prokit-reviewer`는 `approve`·max `none`·findings 빈 배열이었다. 사용자 확인은 별도로 pending이며 라운드를 닫지 않았다.

## 연결 누락과 최소 보완

기존 CLI는 JSON context를 읽지만 최종 검증기는 함수형 receipt·authority를 요구해 실제 실행 연결이 없었다. 승인 JSON이나 합성 콜백을 허용하는 방식으로 해결하지 않았다. 두 템플릿의 기존 `dev-cycle.mjs`에 `delegation accept`를 연결하고, 기존 resource guard와 delegation 검증기를 재사용했다.

Main이 명시한 검사 argv를 셸 없이 실행하고, 관측한 실제 Codex 실행 파일을 고정해 읽기 전용 fresh 리뷰를 실행한다. 현재 source·ownership scope·provider 원본·환경·지정 artifact를 대조한 뒤 메모리에서만 완료를 검증한다. 출력 파일은 다음 프로세스의 승인 증명이 아니며 보호된 작업이나 외부 provider의 권한을 추가하지 않는다.

초안 독립 검수에서 임의 리뷰 명령의 승인 JSON 반사, 빈 provider 결속, 내부 scope 확대, 낮은 max 요약으로 high finding 은폐, artifact를 검사별 관측으로 소급 기록하는 문제가 발견됐다. 임의 리뷰 명령을 제거하고 실제 Codex로 고정했다. provider와 명시 scope를 최종 검증에 연결하고 high finding 자체를 차단하며, artifact는 전체 검사 뒤 관측한 최종 증거로만 결속했다. 결과의 findings·limitations도 보존한다.

새 서버·등록 서비스·인증 키 저장소·테스트 프레임워크·외부 스킬 설치는 추가하지 않았다. 현재 실제 실행 확인은 로컬 macOS의 Codex에 한정하며 다른 호스트의 실제 동작을 통과로 세지 않는다.

## 이미지 생성이 빠진 원인과 보완

상위 코디네이터가 전용 세션 지시에 “SVG 우선, 사진이 꼭 필요할 때만 생성”을 넣고 브리프에 사진·comp 생성이 불필요하다고 적었다. 이것은 인간 사용자가 이미지 생성을 제외했다고 확인한 근거가 아니다. 작업 본문과 브리프의 “승인” 표시를 실제 사용자 선택과 혼동하지 않는다.

`prokit-ui`는 요청한 생성 이미지의 실제 생성·소비자 연결·출처·검수 증거를 요구하도록 보완했다. 수행자에 도구가 없으면 접근 가능한 코디네이터 도구로 위임한다. `prokit-reviewer`도 요청과 실제 자산을 대조한다. 아이콘·정확한 글자가 필요한 슬라이드 SVG는 재사용하며 모든 프리셋에 사진을 강제하지 않는다.

built-in `image_gen`으로 히어로용 입체 슬라이드와 인물 없는 편집 책상 이미지 두 장을 생성했다. 기존 SVG 슬라이드·학습 자료와 상호작용은 보존했다. AI 생성 예시임을 표시하고 원본·프롬프트·해시·WebP와 재현팩을 함께 기록했다.

| 자산 | 원본 PNG | 화면용 WebP |
|---|---:|---:|
| 히어로 슬라이드 | 1,813,588바이트 | 70,356바이트 |
| 워크숍 편집 책상 | 2,240,375바이트 | 154,730바이트 |

두 이미지의 원본 대비 화면용 파일 합계는 약 94.45% 작다. SVG보다 빠르다거나 Core Web Vitals가 개선됐다는 측정은 아니다. 최종 프롬프트와 원본은 외부 확인 폴더 `generated/`에, 화면용 자산은 프로젝트 `apps/web/public/images/slidelab/`에 있다.

## 실제 실행과 선택적 재검수

| 실제 검사 | 결과 | 명령 경과시간 |
|---|---|---:|
| 변경 source·설정의 린트 | exit 0 | 0.14초 |
| web 타입 | exit 0 | 2.36초 |
| 정상 빌드 | exit 0, 개발 서버 유지 | 8.31초 |
| 정적 내보내기 | exit 0 | 21.08초 |
| 반응형 너비 검사 | 예정·실행 14개, 실패·누락·flaky 없음 | 5.30초 |
| 정적 오류 검사 | 예정·실행 2개, 실패·누락·flaky 없음 | 11.38초 |
| 정적 접근성 | 예정·실행 2개, 위반 없음 | 4.89초 |

위 시간은 각 실제 명령의 monotonic clock이며 병렬 시간이나 모델 대기를 합산한 전체 작업 시간이 아니다. 앞선 worker1/2 속도 비교와 기존 전체 시나리오는 반복하지 않았다.

첫 실제 Codex 리뷰는 모바일 갤러리 캡처가 빈 배경임을 직접 확인해 changes-required로 인수를 거절했다. 제품 전체 화면에는 이미지가 있어 지속적인 제품 결함으로 단정하지 않았다. 이미지 decode와 두 paint frame 뒤 캡처하도록 해당 증거만 수정하고 첫 실패를 보존했다.

두 번째 관리 실행은 통과한 검사들을 재실행하지 않았다. 현재 source snapshot·package/lock·원본 command receipt·전체 정적 파일 해시가 동일함을 대조하고 모바일 캡처만 실제 실행했다. 기존 receipt는 재사용 증거이며 현재 빌드 실행으로 소급 승격하지 않았다. fresh Codex 재검수에서 미해결 지적 없이 승인됐고 현재 runtime 검증도 complete로 끝났다.

CLI 전체 관측 시간은 첫 실행 약 207.30초, 증거 수정 후 실행 약 197.24초다. 모델·도구 대기와 자원 검사 등을 포함하므로 스킬이나 전체 개발 시간의 개선률로 사용하지 않는다.

## 검증 범위와 산출물

관련 CLI fixture와 artifact·receipt·위조 경로, 공유 파일·에이전트 생성 검사, skill-creator 형식과 생성 자산 행동 검수를 확인했다. fixture의 Codex stub은 연결·차단 경계의 테스트이며 실제 semantic review 성공으로 보고하지 않는다. 실제 Codex는 위 슬라이드랩 실행에서 별도로 확인했다. 전체 과거 템플릿 검사와 성능 비교를 다시 실행하지 않았다. 실제 성공 뒤 마지막 실패 경로의 리뷰 임시폴더 수명도 보완했고, 해당 edge 검사만 통과를 확인했다. 정상 종료 경로는 변하지 않아 이미 통과한 실제 CLI·UI·빌드·QA는 재사용했다.

- 프로젝트: `/Users/freelife/youtube/pro-kit-samples/ws/slidelab`
- 미리보기: `http://localhost:3112/`, 정적 `http://127.0.0.1:8112/pro-kit/slidelab/`
- 최종 기술 인수: 프로젝트 `tasks/evidence/cli-followup/acceptance-retry.json`
- 최초 거절 기록: 외부 확인 폴더 `first-acceptance.json`
- 실제 검사·재사용 대조·화면 증거: 프로젝트 `tasks/evidence/cli-followup/`
- 최종 로컬 ZIP: `/Users/freelife/youtube/pro-kit-samples/checks/slidelab-20261010-followup/slidelab-pack.zip`
- ZIP: 9,566,459바이트, SHA-256 `e4595045327df706c46b80efec99e760c3385f707352b547e91a14945aaa1c90`

원시 source baseline·코드 경계 검수·CLI fixture·이미지 생성·이행 자료는 `/Users/freelife/youtube/pro-kit-samples/checks/slidelab-20261010-followup/`에 있다. 사용자 confirm·close·커밋·push·공개 카탈로그·배포는 실행하지 않았다. 다른 호스트, 실기기·스크린리더와 Core Web Vitals는 미검증이다.
