# 브라우저 관측 계약

원본 연구는 비공개 작업 증거에 `reference-contract.json`으로 보관한다. 팩에는 원본 raw 조사 대신 완성 프리셋 비교 기준만 제공한다.

각 요소에는 `id`, `page`, `state`, `kind`(layout/type/color/image/motion/interaction), `required`, `observation`(extracted/measured/unknown), `values`, `evidence`(파일·해시), `productLocator`, `allowedDifferences`를 기록한다. 파일 경로는 증거 루트 기준 상대경로다. ID는 페이지·요소·상태를 식별하며 중복하지 않는다.

페이지별 전체 섹션 목록을 먼저 작성한다. 실제 화면 폭과 DPR, URL, locale·theme, 준비 조건(서체·이미지), scroll 위치와 조작 순서를 함께 남긴다. 넓은 화면·모바일뿐 아니라 레이아웃이 바뀌는 지점을 확인한다. 긴 전체 캡처와 읽을 수 있는 섹션 캡처를 함께 쓴다.

모션에는 trigger, duration, delay, easing, distance, repeat, reentry와 timestamp별 관측을 남긴다. 코드에서 확인된 값과 화면에서 측정한 값의 신뢰도를 섞지 않는다. 효과가 없다는 결론도 실제 휠 스크롤·hover·재진입을 확인한 근거가 필요하다.

독립 순회자는 같은 URL을 처음부터 확인한다. 제공된 목록의 체크뿐 아니라 발견한 추가 ID와 미관측 상태를 보고한다. 이 검토 전에는 목록을 완전하다고 선언하지 않는다.

## 구조를 유지하는 관측

브랜드·콘텐츠 교체는 구조·사진 슬롯·자식 순서·내비게이션 목적·글자 행수를 바꾸는 허가가 아니다. DOM child 순서, 텍스트 line box, 자산의 부모·형제·행 위치, 링크의 실제 목적지와 도착 요소를 관측한다. 레이아웃·자산·텍스트·링크별 source ID에 이 값과 실제 computed style을 연결한다. 요소 개수나 특정 문구를 정규식으로 찾는 대신 브라우저의 실제 구조·측정값을 사용한다.

requiredMeasures로 layout·textrow·assetSlot·navigationRefs 중 필요한 비교를 지정한다. 구현자는 동일 환경의 actual 값을 다시 추출하고 source ID별 차이를 첫 통합본에 넣는다. 독립 검수자가 이 측정을 별도로 확인한다. 승인한 콘텐츠 변경이 예상치 못한 줄바꿈을 만든 경우도 구조 차이로 다룬다.

같은 Ego TaskSpace에 동시에 native input을 보내지 않는다. Main이 소유 페이지·단계를 배정하고 한 수행자의 브라우저 입력이 끝난 뒤 다음 수행자로 넘긴다. 다른 수행자는 그동안 파일·코드 작업을 진행한다.

## 측정 대상과 동적 상태

선언한 selector를 그대로 신뢰하지 않는다. 원본·제품에서 실제 matchCount를 확인하고 0이면 해당 측정을 미확인으로 남긴다. 여러 요소가 잡히면 비교할 요소를 식별한다. bbox는 양쪽 모두 content 또는 outer 중 같은 대상을 측정하고 viewport와 document.clientWidth를 함께 남긴다. 서로 다른 wrapper 폭을 맞추려고 글꼴을 축소하지 않는다.

모션은 선언된 효과 이름뿐 아니라 전체 target 목록과 제품의 실제 연결을 대응한다. locale·데이터 변경으로 DOM이 교체되면 새 노드를 재관측하고, 스크롤 진입 뒤 표시되는지 확인한다. 최초 언어에서 보였다는 결과를 다른 언어의 새 노드에 재사용하지 않는다.

전환 직후 값과 완료 값을 구분한다. carousel 등의 첫 프레임이 identity transform인 것만으로 결함을 판정하지 않는다. 실제 transitionend 또는 위치가 안정된 상태를 확인한 뒤 목적 슬라이드·최종 위치를 비교한다. 이벤트가 발생하지 않는 reduced-motion 상태에서는 안정된 최종 위치로 판단한다.

텍스트 대상별 실제 fontSize·fontWeight·lineHeight·letterSpacing과 spacing을 추출해 첫 자체 비교의 source 값으로 고정한다. 가독성·style polish라는 이유로 요청하지 않은 수치 변경을 허용하지 않는다. 자체 서체 alias는 실제 font file/face 로딩 증거로 대응한다.

## 연결된 구매 흐름

카드 href 목록에서 조사를 끝내지 않는다. 같은 브랜드의 내부 구매·신청 목적지를 따라 별도 checkout 화면과 plan 같은 query 상태를 inventory에 포함하고 범위에 반영한다. 실제 제출·외부 PG 송신 없이 제공된 화면·live DOM·클라이언트 코드로 UI를 조사할 수 있다. 실제 결제 기능 제외가 연결 페이지·결제 UI 제외를 뜻하지 않는다. 범위가 추가되면 이전 페이지 수·검수 결과를 새 범위 승인으로 재사용하지 않는다.

각 조작은 anchor·modal·navigation·action·external-link 중 관측한 유형과 목적을 기록한다. 원본의 판매 링크를 설명 모달로 바꾸는 것은 콘텐츠 개인화가 아니다. 원본 실인물·영상·외부 미디어 URL은 분석 증거이며 재사용 팩의 기본 콘텐츠로 자동 이식하지 않는다.

이미지에 제목·저자 같은 글자가 박혀 있으면 원본 관측과 제품 콘텐츠 정본을 구분해 기록한다. 제품 자산의 embedded title/author는 제품의 canonical 한국어 제목·저자에 바인딩하고 실제 이미지를 읽어 대조한다. 영어 소개 문구와 한국어 표지는 서로 다른 언어 정본이므로 번역문과 표지 글자를 직접 같게 만들지 않는다.

첨부 화면·제3자 창에서도 주 선택지 외의 기타·더보기·보조 dropdown을 별도 구성요소 ID로 기록한다. 닫힌 메뉴의 옵션이 미확인이어도 보이는 조작부를 삭제하지 않는다. 비실거래 샘플 조작부로 보존하고 옵션 미확인을 표시한다. 관측하지 않은 지원 목록·정책·실제 거래를 만들어 채우지 않는다.

모바일은 첫 화면과 overflow 여부뿐 아니라 아래쪽 각 섹션 높이와 대표 row·phase·cell을 기존 layout 관측으로 대조한다. 실제 computed padding·border·grid, 날짜의 inline 배치와 줄수를 기록한다. 원본과 다른 예시 문구로 늘어난 높이와 CSS 구조 차이로 늘어난 높이를 구분한다. 모바일 override 선언이 있어도 selector 우선순위 때문에 적용되지 않을 수 있으므로 실제 computed 값을 기준으로 삼는다.

이번 Ego 런타임에서는 CLI 중단 뒤에도 host 브라우저 script가 계속되어 다음 수집과 경합한 사례가 있다. UI 수행자가 한 명이어도 활성 browser script는 하나씩 실행하고, 이전 tool의 최종 완료·host 작업 종료를 확인한 뒤 짧은 context 단위로 순차 진행한다.
Timeout·Ctrl+C를 취소 완료로 추정하지 않으며, 알 수 없는 취소 API나 전체 브라우저 종료로 처리하지 않는다. 실행 상태 JSON은 진단 자료이며 실행·권한 증명이 아니다.


## 가상화할 정보 슬롯

원본 전체 순회에서 본문뿐 아니라 푸터·정책·반복 사업자 정보도 관측한다. 필요한 source ID에 `contentSlots:[{key,value,mode}]`를 순서대로 붙인다. mode는 가상 이름·사업자·연락처의 `fictional`, 소셜 이름·정책 항목처럼 의미를 그대로 유지할 `preserve`, 사용자 입력용 빈 URL의 `unconfigured`다. 원본 정보는 비공개 연구 증거에만 보관한다. 제품은 같은 key 순서의 실제 `{key,value}`로 대응하고 기존 layout·navigationRefs 관측으로 배치와 링크 목적도 검수한다. 원본에서 보이지 않은 항목을 필수 슬롯으로 만들어 내지 않는다.

새 가상화 보고서는 schemaVersion:2의 contentInventory에 관측 대상 ID와 slots의 key·mode 순서를 먼저 고정한다. reference나 contentSlots가 삭제되어도 이 inventory와 불일치로 검출되도록 보존한다. 목록 자체의 누락은 독립 원본 순회로 확인한다. 출처 URL은 SOURCES·provenance에 남기고 사용자용 운영 링크의 빈 설정과 구분한다.

반복 사업자 정보도 페이지마다 라벨·구분자·줄 배치·실제 자간을 관측한다. 공통 데이터로 묶을 값과 페이지별 표시 구조를 구분하고, 관측 전에 일정한 수의 푸터 변형을 가정하지 않는다.
