# 검증 입력

`verify-evidence.mjs`는 증거 JSON과 같은 디렉터리를 root로 쓴다. 파일은 `{path,sha256}` 상대경로·SHA256 쌍이며 외부 symlink와 루트 탈출을 거부한다. 제품 파일은 `--source-root <현재 제품>`을 지정해 현재 파일을 직접 해시 대조한다. 생략하면 보고 파일의 폴더를 사용하므로 스냅샷 평가에만 쓴다.

입력 v1:

- `schemaVersion:1`, `implementer`, `functional`, `accessibility`(pass/fail/unknown), `referenceUrls:[원본 URL]`, `productUrl`
- `sources:[{path,sha256}]`: 비교한 제품 실행 소스·자산의 제품 루트 상대경로와 당시 해시. 최종 판정은 현재 제품 루트와 대조한다.
- `reference:[{id,kind,observation,evidence}]`: kind는 image/motion 또는 다른 관측종류, observation은 extracted/measured/unknown. 모든 등록 요소를 필수 검수한다.
- `comparisons:[{id,productLocator,status,evidence,assetLoaded,motionObserved,frames}]`: 이미지에는 실제 로딩 확인, 모션에는 실제 관측 및 frames의 start/middle/end/reentry 증거 배열이 필요하다.
- `independentReview:{reviewer,artifact:{path,sha256}}`: 독립 검수자가 별도로 반환한 결과 JSON의 참조다. 문자열 이름과 inline pass만으로는 완전한 증거가 아니다.
- `requiredContexts:[id]`, `settings:[{id,themeButtons,themeMenu,themes,languageMenu,languageLabels,evidence}]`: 개발·모바일·다른 페이지·정적·부모미리보기 중 제품에 해당하는 모든 환경의 실제 DOM 검사다.

각 비교에는 실제 값과 차이·허용 차이·판정 근거도 보존한다. 도구가 수치·픽셀 유사도를 자동 판정하지 않으므로 검수자가 확인하지 않은 값을 pass로 적지 않는다. 해시가 맞아도 원본 목록의 완전성은 증명하지 못한다. independentReview의 원본 전체 순회 증거가 필요하다.

## 별도 독립 검수 결과

artifact JSON은 `schemaVersion:1`, `reviewer`, `referenceUrls`, `productUrl`, `scope:{ids,contexts}`, `sourcesFingerprint`, `results:{fidelity,functional,accessibility}`, `extraIds`, `evidence:[{path,sha256}]`를 담는다. 원본·제품 주소는 보고와 일치하고 scope는 보고의 모든 관측 ID·설정 context를 포함한다. extraIds는 독립 원본 순회에서 발견한 추가 요소이며 reference에도 반영한다. 추가 없음도 빈 배열로 명시한다. evidence 경로는 보고 JSON의 root 기준이다.

sourcesFingerprint는 sources를 path 코드포인트 순서로 정렬한 각 `path + '\0' + sha256 + '\n'` 연결의 SHA256이다. 독립 검수 결과도 동일 제품 파일 목록과 이 fingerprint를 사용한다. 구현자의 같은 증거 경로를 사용한 독립 관측은 거부한다. 서로 다른 경로의 같은 내용 해시는 duplicate-content-warning으로 기록하고 Main 검토 대상으로 남긴다. 추가 원본 관측과 제품 비교를 수행해 별도 증거를 반환한다.

출력 `status:evidence-complete`는 구조·해시·대응이 완전하다는 뜻이다. 미해결·미확인 결과는 `incomplete`다. `claimedResults`는 검수자가 보고한 값을 표시할 뿐 도구의 품질 합격이 아니다. `acceptance:requires-main-review`는 항상 유지한다. exit 0도 게시·품질 수용의 권한이 아니다.

JSON 파일·reviewer 이름·해시만으로 실제 작성자나 독립성을 인증할 수 없다. Main은 실제 수신한 독립 에이전트 응답, 검수 범위와 현재 제품 fingerprint를 직접 대조한 후 수용한다. 수신 기록은 메타데이터이며 권한을 만들지 않는다. 새 native 타입이 없어 기존 available 역할에 논리 프로필을 전달한 독립 검수도 가능하다. 역할 미노출은 기록하되 그 이유만으로 실제 독립 검수를 무효로 처리하지 않는다.

## 측정 비교

reference 항목의 `requiredMeasures`는 layout·textrow·assetSlot·navigationRefs 배열이다. 기본적으로 kind=layout/type/image/interaction은 각각 layout/textrow/assetSlot/navigationRefs를 요구한다. 더 필요한 비교를 requiredMeasures에 추가한다.

comparisons의 `measurements`에는 각 종류별 `{reference:{field:value},actual:{field:value},evidence:[{path,sha256}],allowedDifferences:[{field,reason}]}`를 담는다. 예: layout의 childOrder·display·gap, textrow의 실제 line box 행수, assetSlot의 parent·index·row, navigationRefs의 destination·targetExists. 실제 관측한 필드와 단위를 선택하고 원본·제품에서 동일하게 측정한다. 링크가 아닌 상호작용은 action·target·result를 navigationRefs에 기록한다.

도구는 값·배열 순서를 직접 비교하고 누락·차이를 incomplete로 남긴다. 측정 오차나 사용자 허용 차이는 해당 필드와 이유에만 적용한다. reason 자체가 승인의 증거는 아니며 Main이 승인 범위와 대조한다. 제목 문구·사진 수 같은 특정 사이트 문자열 검사는 하지 않는다. 별도 독립 리뷰 증거를 구현 측정 증거로 재사용하지 않는다.

실제 첫 초안에서 발견한 구조·슬롯·목적지 누락을 계기로 이 계약을 보완했다. 계약 수정 후 통과를 이전 초안의 첫 결과 성공으로 소급하지 않는다.

수치 측정 오차는 `tolerances:{field:{absolute,relative,reason}}`로 명시한다. layout·textrow의 유한 수치에만 적용하며 허용폭은 max(absolute, abs(reference)×relative)다. 예: 실제 화면 배치 4px 또는 1%는 absolute=4, relative=0.01, 글꼴 1px·자간 0.2px는 해당 필드 단위로 정한다. 이는 기본 일괄 허용값이 아니며 관측 방법·신뢰도에 맞춰 정한다. 행수·개수·인덱스·순서, 배열, assetSlot·navigationRefs에는 tolerance를 적용하지 않는다. 색·브랜드·가상 콘텐츠는 측정 전 같은 표현으로 정규화한 값과 raw 증거를 함께 남기고, 의도적 차이는 필드별 허용 차이로 검토한다.

## 실제 관측의 전제

layout 측정은 selector별 원본·제품 matchCount, 같은 bbox 대상(content/outer), viewport·clientWidth를 먼저 확인한다. 일치하지 않는 측정 대상을 치수 오차나 폰트 조정으로 보정하지 않는다. 모든 모션 target의 실제 연결과 locale·데이터 변경 후 새 DOM의 재진입·표시 상태를 확인한다. 선언된 target 목록만으로 실행을 증명하지 않는다.

영상은 관측한 ID·제목·순서와 실제 임베드를 대조한다. 설정 adapter.apply의 성공은 통합 증거다. 사용자 UI 증거에는 실제 메뉴 클릭·키보드 선택·Escape·초점 복귀·입력 보존을 별도로 포함한다.

애니메이션 시작 프레임을 종료 상태와 비교하지 않는다. carousel은 transitionend 또는 위치 안정 이후 목적 슬라이드와 최종 변환을 확인한다. 시작 identity matrix만으로 실패를 판정하지 않는다. 이런 관측 전제가 빠졌으면 미확인으로 기록하고 동일 상태를 다시 측정한다.

## 실제 관측 v1 필수 형식

각 measurements 종류의 reference·actual에는 실제 `selector`(빈 문자열 불가)와 양의 정수 `matchCount`를 각각 기록한다. 원본과 제품 selector는 달라도 되지만 양쪽 대상 수는 같아야 한다. matchCount는 tolerance·허용 차이로 건너뛰지 않는다.

- layout: `bboxKind:"content"|"outer"`, `bbox:{x,y,width,height}`, `viewport:{width,height}`, `clientWidth`. bbox는 유한 수치이고 width·height는 양수다. viewport와 clientWidth도 양수다. 양쪽 bboxKind·viewport·clientWidth는 엄격히 일치해야 한다.
- textrow: `rowCount`는 0 이상의 정수다. 선택 `rows`는 rowCount 길이의 `{x,y,width,height}` 배열이며 각 line box는 유한 좌표·양의 크기다.
- assetSlot: `parent`는 실제 부모 locator/식별자, `index`는 0 이상의 자식 인덱스다.
- navigationRefs: `destination`은 실제 링크 또는 조작 대상이며 `targetExists:true`로 실제 도착·대상 존재를 확인한다.

수치 tolerance는 x·y·width·height·gap·padding·paddingTop·paddingRight·paddingBottom·paddingLeft·fontSize·lineHeight·letterSpacing에만 적용한다. bbox의 네 치수는 해당 필드명으로 지정한다. 자유 이름 rowCount·itemCount·childIndex·sequenceOrder 등은 허용 목록에 없으므로 수치 오차로 무시되지 않는다. 배열 순서도 수치 tolerance 대상이 아니다. 명시 승인한 콘텐츠·구조 변경은 기존 필드별 allowedDifferences로만 설명하며 Main이 승인 범위를 확인한다. 위 필수 관측 조건은 문구와 달리 helper가 직접 검사한다. 실제 DOM 관측의 진위 인증과 최종 수용은 여전히 Main의 책임이다.

textrow에는 동일 텍스트 대상의 `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`도 양쪽 모두 필수다. computed px 문자열은 단위를 제거한 유한 수치로 기록한다. fontSize는 양수 px, fontWeight는 1~1000 수치(normal=400, bold=700으로 관측 정규화), lineHeight는 0 이상의 px 또는 `"normal"`, letterSpacing은 음수·0·양수 px 또는 `"normal"`이다. normal을 임의의 수치로 추정하지 않는다. 행수가 같아도 이 값의 차이는 비교하며 fontWeight는 수치 tolerance 대상이 아니다. fontSize·lineHeight·letterSpacing 수치 오차만 기존 명시 tolerance를 쓸 수 있다.

fontFamily는 Next 자체 alias 때문에 문자열 일치만 강제하지 않는다. 원본·제품의 실제 font file/face 로딩과 weight 범위를 별도 브라우저 증거로 확인한다. alias가 다르다는 이유로 다른 폰트를 합격시키거나, 이름이 같다는 이유로 실제 로딩을 생략하지 않는다.

각 settings context에는 실제 전환 뒤 본문에서 관측한 `translationSamples:[{selector,koText,enText}]`를 하나 이상 기록한다. selector와 양쪽 문구는 비어 있지 않고 KO/EN 문구가 달라야 한다. 브랜드 등 번역하지 않는 고정어를 샘플로 쓰지 않는다. 같은 context의 settings.evidence에는 두 언어 DOM 관측·캡처를 연결한다. 문구 차이만으로 전체 번역 품질을 증명할 수 없으므로 Main·독립 검수자는 기본 UI·본문·폼·메뉴·alt/aria 번역 키 범위와 실제 언어 스위치 후 입력·선택 유지, context 범위를 별도로 대조한다. 국기·document.lang·locale 저장이나 adapter 값만 바뀌는 결과는 번역 PASS가 아니다.

## 미설정 링크와 목적 보존

navigationRefs는 선택 `state:"ready"|"unconfigured"`를 지원한다. 생략하면 기존 ready 의미다. ready는 유효한 비어 있지 않은 destination·targetExists:true를 요구하고 명시 interactive:false나 가짜 #·javascript 주소를 거부한다. unconfigured는 destination:null·targetExists:null·interactive:false를 모두 요구한다. 실제 사용자 허용 차이와 별개로 이 형식 조건을 우회하지 않는다. 원본 ready와 샘플 unconfigured의 차이는 Main이 허용한 정확한 필드만 기록한다.

관측한 interactionType(anchor/modal/navigation/action/external-link)도 양쪽에 기록해 목적 변경을 비교한다. 원본 판매 링크를 모달로 바꾼 차이는 브랜드 교체 이유로 통과시키지 않는다. URL을 채운 상태에서는 실제 목적지, 같은 브랜드 checkout·plan query 상태까지 검수한다. 과거 두 페이지의 검수는 새 연결 페이지를 포함한 검수가 아니다.

실제 UI에서는 locale-independent 선택 key로 전환 전·다른 언어·원래 언어·복사 결과의 선택/입력 유지를 확인한다. translationSamples만으로 이 동작이나 전체 번역 품질을 증명하지 않는다. 공유 UI의 portal·props·전역 CSS 소비처를 포함한 대표 상태를 정적 출력에서도 관측한다.

embedded text가 있는 자산은 title/author 정본과 개별 이미지 시각 대조 증거를 남긴다. 한국어 표지는 canonical KO title/author와, 번역 본문은 번역 키와 각각 비교한다. 이미지 로딩·미감·다른 표지의 통과 결과를 문자 정확성 증거로 쓰지 않는다. 자동 OCR을 새로 도입할 필요 없이 실제 표시 이미지와 정본을 함께 읽고 불일치를 기록한다.

첨부·제3자 결제 창의 주 선택지가 맞더라도 기타·더보기·보조 dropdown 누락을 별도로 검사한다. 닫힌 메뉴 옵션은 unknown으로 남기되 보이는 조작부는 비실거래 샘플로 보존해야 한다. 미관측 옵션을 실제 지원 목록·정책·거래로 선언하지 않는다. 주 카드 수가 같다는 사실로 보조 조작부 누락을 상쇄하지 않는다.

반응형 충실도는 overflow 0·hydration 0·첫 화면 통과와 별도로 판단한다. 모바일 아래쪽 섹션 높이와 대표 row·phase·cell의 computed padding·border·grid·날짜 inline 줄수를 원본과 같은 조건에서 기존 layout 측정으로 비교한다. 모바일 override가 실제 적용되는지 selector 우선순위와 computed 값으로 확인한다. 예시 텍스트 길이 차이와 CSS 구조 원인을 분리하고, 전역 경고 정리 대신 관측된 원인과 영향 범위만 수정·재검사한다.

동일한 정적 화면을 독립적으로 다시 촬영하면 PNG 해시도 같을 수 있다. 다른 경로의 동일 SHA는 구조적 evidence-complete를 막지 않지만 quality·독립성 승인도 아니다. 파일을 복사해 다른 경로를 만든 것 역시 독립 관측의 증명이 아니다. Main이 실제 수신한 별도 수행자의 결과와 실행·촬영·관측 provenance를 대조한다. 이 경고가 없어도 JSON·해시·역할 이름으로 독립성을 인증할 수 없으며 acceptance는 requires-main-review를 유지한다.

이번 Ego 런타임에서는 CLI 중단 뒤에도 host 브라우저 script가 계속되어 다음 수집과 경합한 사례가 있다. UI 수행자가 한 명이어도 활성 browser script는 하나씩 실행하고, 이전 tool의 최종 완료·host 작업 종료를 확인한 뒤 짧은 context 단위로 순차 진행한다.
Timeout·Ctrl+C를 취소 완료로 추정하지 않으며, 알 수 없는 취소 API나 전체 브라우저 종료로 처리하지 않는다. 실행 상태 JSON은 진단 자료이며 실행·권한 증명이 아니다.

## 첨부만 확인할 수 있는 원본

kind는 layout·type·color·image·motion·interaction·screenshot-only 중 하나다. 알 수 없는 이름으로 필수 측정을 우회하지 않는다. 사용자 첨부 등 원본 DOM을 관측할 수 없는 정당한 시각 자료에 한해 screenshot-only를 사용한다. 일반 웹 원본의 측정을 생략하는 수단이 아니다.

이 종류는 reference에 원본 이미지 evidence, `visualScope:[보이는 관측 범위]`, `limitations:[미관측 범위]`를 요구한다. comparison에는 별도 제품 캡처 evidence와 실제 대조 내용 `visualReview`를 기록한다. 동일 파일을 원본·제품 캡처로 재사용하지 않는다. 예: 닫힌 기타 선택 조작부의 존재·모양은 비교하되 원본 DOM·viewport·DPR·닫힌 옵션·실거래는 미관측으로 명시한다. 숫자나 지원 목록을 지어내지 않는다.

helper는 `limitedCoverage`와 `visual-only-warning`을 반환한다. evidence-complete여도 명시한 제한 시각 범위의 자료가 있다는 뜻이며 DOM·숨은 상태까지 통과한 것이 아니다. Main은 실제 독립 시각 검수 결과와 이 범위를 대조한다. acceptance는 requires-main-review이며 기존 layout·type·image·interaction·motion 필수 측정은 그대로 유지한다.


## 가상 콘텐츠 슬롯 대조

가상화하는 source ID에는 `contentSlots:[{key,value,mode}]`를 추가한다. 원본 관측 value는 빈 문자열이 아니며 key는 고유하다. mode는 `fictional`(개인·업체·연락 정보 교체), `preserve`(항목명·목적 유지), `unconfigured`(빈 사용자 URL)다. 해당 comparison에는 제품에서 읽은 `contentSlots:[{key,value}]`를 같은 순서로 담는다. 예: 원본 footer의 businessName·representative·registration·address·phone·email 각각을 가상 값과 대응하고 social 이름은 preserve, URL은 unconfigured로 기록한다. 실제 원본에 없는 항목까지 강제하지 않는다.

helper는 누락·중복·순서 변경, preserve 값 변경, 비어 있지 않은 unconfigured URL, 동일 요소의 원본 fictional 값이 다른 슬롯에 남은 경우를 거부한다. allowedDifferences로 슬롯 누락을 상쇄하지 않는다. 제품 증거는 기존 comparison.evidence에 연결한다. helper는 목록 밖 누락이나 새로운 값의 실존 여부까지 추론하지 못한다. 독립 검수자가 원본 전체를 순회하고 예시 번호·예약 이메일·가상 주소·샘플 표시와 모든 페이지의 반복 정보를 확인한다. 이 검사는 layout·textrow·navigationRefs를 대신하지 않는다.


새 가상화 작업은 `schemaVersion:2`와 필수 `contentInventory:[{id,slots:[{key,mode}]}]`를 사용한다. 연구자가 관측한 가상화 대상 ID와 정보 슬롯의 순서·목적을 먼저 고정하고 reference.contentSlots에 연결한다. v2는 inventory 누락, 중복 ID·key, 원본 reference ID 삭제, 슬롯 삭제·순서·mode 불일치와 등록되지 않은 contentSlots를 거부한다. v1은 기존 보고서 및 원본 정보 유지 요청을 위한 형식이며, 새 가상화 검사를 통과하기 위해 v1로 낮추지 않는다. 독립 검수 JSON의 schemaVersion은 기존 1을 유지한다.

실정보 잔존 비교는 앞뒤 공백 제거와 Unicode NFC 정규화까지만 처리한다. 띄어쓰기·음역·이미지 속 글자 등 모든 우회를 탐지하지 않으며, inventory 자체의 원본 충실도도 증명하지 않는다. Main과 독립 조사자는 새 가상화 요청이 v2로 검사되었는지와 inventory가 실제 원본의 구성을 빠뜨리지 않았는지 확인한다. 출처용 원본 URL은 비공개 조사 및 SOURCES·provenance에 유지할 수 있다. 가상화 대상 운영자 링크와 출처 메타데이터를 구분하며 출처를 일괄 소거하지 않는다.
