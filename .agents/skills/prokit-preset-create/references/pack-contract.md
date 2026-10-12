# 완성팩 인계 계약 v1

`preset-manifest.json`의 `schemaVersion`은 1이다. 다음 필드를 담는다.

- `slug`, `routes:[{path,title}]`
- `compatibility:{template,nextMajor,pnpmMajor,screenOnly}`
- `settings:{locales,themes}`
- `sourceManifest:"source-manifest.json"`, `removedFiles:"removed-files.json"`
- `productFingerprint`: source-manifest의 `{path,sha256}` 목록을 path의 코드포인트 순서로 정렬하고 각 `path + '\0' + sha256 + '\n'`을 이어 SHA256으로 계산한다.
- `baselines:[{id,route,viewport:{width,height},locale,theme,prepare,screenshot,checks,allowedDifferences}]`: prepare는 재현할 실제 조작 순서다. 최종 제품의 화면·모션 체크를 포함한다.
- `customization:[{path,fields}]`: 수정 가능한 콘텐츠와 경로다.
- 선택 `scaffoldFiles:{relativePath:expectedDefaultSHA256}`: 생성 기본 파일을 안전하게 덮어쓸 때의 예상 해시다.

source-manifest에는 실행 소스·런타임 자산만 담고 문서·manifest 자기값·ZIP·원본 제작 하네스·스킬·개인 env·캐시·node_modules를 제외한다. 문서·ZIP을 fingerprint에 넣어 순환하지 않는다. 경로는 상대경로로 하고 루트 탈출·심볼릭 링크 외부 참조를 거부한다.

완성 프리셋에서 검증한 비교 기준을 팩에 담는다. 원본 관측 허용 차이를 소비자 앱에서 새롭게 적용하지 않는다. consumer는 이 프리셋 기준으로 동일 경로·뷰포트·준비·조작 상태를 재현한다.

제품 검수 → prokit-docs로 기술 사실·승인 캡처 인계 → 문서 검토 → ZIP → 별도 환경의 실제 적용·빌드·실행·비교 → 외부 인덱스에 ZIP 해시를 기록한다. pro-kit의 기존 팩 도구를 사용하고 preset 제작 전용 도구를 소비자 팩에 복사하지 않는다.

## 프로킷 웹 카탈로그 인계

웹 등록을 요청받았으면 현재 prokit-preset-publish의 등록 계약과 `samples.json` 레코드를 기준으로 입력을 준비한다. slug·카테고리·이름·분야·제목·설명, `presentation`의 태그·카드 그림·배지·스타일 설명·화면 설명·어두운 첫 화면 여부, 페이지 id·주소·query와 실제 검증 사실을 넘긴다. 카테고리는 사용자 지정값을 우선하고, 미지정이면 제품의 주목적을 기준으로 정한다. 강의가 있다는 이유만으로 학원으로 분류하지 않는다. 그룹·태그는 현재 사전에 있는지 대조한다.

첫 화면·각 페이지의 데스크톱/태블릿/모바일 그림, 전체 첫 화면 그림과 CSS 미리보기 프로필·교재·팩 목록의 준비 상태도 연결한다. 미평가 점수·미측정 시간은 추정값으로 채우지 않는다. 등록에 필요한 파일이나 사실이 없으면 누락으로 인계한다.

이 자료는 게시 담당에게 넘기는 관리 입력이다. 소비자 팩의 manifest v1을 바꾸거나 카탈로그 편집 CLI·웹 관리 하네스를 런타임 소스에 넣지 않는다. 팩 검수와 웹 등록·원격 게시 판정은 각각의 범위로 보고한다.
