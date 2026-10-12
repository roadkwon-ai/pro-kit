# 공식 프리셋 운영 미리보기

프로킷 웹의 부모 설정과 공식 프리셋을 연결할 때만 적용한다. 일반 사용자 프로젝트의 제품 기능에는 추가하지 않는다. 공식 프리셋의 언어·테마·서체 제작 계약은 prokit-preset-create가 소유한다. 완성팩의 설정 보존은 prokit-pack-use가 맡는다.

현재 pro-kit-web의 공통 preset-design·preset-preview·preset-font-loader·runtime·profiles와 설정 부품을 재사용한다. 선택 팔레트·서체 목록·폰트 로더를 프리셋마다 복제하지 않는다.

## 메시지와 실제 적용

프로킷 전용 팔레트는 프로킷 부모 사이트 안에만 둔다. 공식 프리셋에는 자기 서비스의 모드·언어 전환기와 프로킷 미리보기용 수신기를 둔다. 실전 서비스에는 이 수신기를 설치하거나 생성 프롬프트에 요구하지 않는다. 공식 프리셋의 설정만 iframe 내부의 의미 토큰과 번역 사전에 연결하며, 프리셋별 화면과 앱 로직을 공통화하지 않는다.

메시지 계약은 `prokit:preview:hello → prokit:preview:ready → prokit:preview:apply → prokit:preview:applied`이며 버전은 `1`이다. 모든 메시지에 프리셋 `slug`, 적용 요청에는 `requestId`를 넣는다. 지원 기능은 `font`, `palette`, `theme`, `locale`로 알린다. 옵션은 `bodyFont`, `headingFont`, `palette`, `theme(system|light|dark)`, `locale(ko|en)`다. 폰트·팔레트의 `original`은 프리셋 정본을 따른다.

부모 사이트의 실제 URL에서 확인한 정확한 origin만 허용한다. 수신 때 `event.source === window.parent`, origin, 버전, slug와 옵션 허용 목록을 확인한다. 응답 targetOrigin에도 확인한 origin을 쓰며 `*`를 쓰지 않는다. 외부에서 보낸 CSS·HTML·파일 URL을 실행하지 않는다.

`ready`에는 검증한 지원 기능만 반환한다. `applied`는 요청 식별자와 실제 적용한 옵션, `unsupported` 목록을 반환한다. 폰트·번역·토큰 적용이 끝나기 전에 성공을 회신하지 않는다. 부모도 iframe/source/origin/slug/version/requestId와 실제 옵션을 대조해야 적용 완료를 표시할 수 있다. 페이지 이동 뒤 연결을 다시 시작한다. 프리셋 헤더에서 직접 바꾼 모드·언어는 같은 버전의 `prokit:preview:settings` 알림으로 부모 설정과 동기화한다. 부모는 iframe 창·출처·프리셋과 모드·언어 허용 값을 확인한 뒤 현재 설정에 결합한다.

비동기 폰트·번역 준비와 실제 화면 적용을 분리한다. `prepareApply(options)`는 DOM을 바꾸지 않고 준비한 뒤 적용 함수를 반환한다. React 상태 적용이 비동기이면 실제 렌더가 끝날 때까지 기다린다. 적용 전과 응답 전에 요청이 최신이고 연결이 살아 있는지 확인한다. 모드 설정 함수의 참조가 바뀌어도 수신 연결을 다시 만들거나 이전 상태를 적용 결과로 반환하지 않는다. 이전 요청과 연결 종료 뒤의 준비 결과가 새 화면을 덮어쓰지 않아야 한다.

## 검증

공식 정적 결과물과 실제 부모 URL에서 지원 옵션을 확인한다. ready/applied의 응답과 html.lang, document.fonts, 실제 서체·토큰을 함께 대조한다. 존재하지 않는 CSS 변수에는 폴백을 두되, 원래 폰트가 적용되는 문제를 숨기지 않는다.

서체·팔레트 선택, 모드·언어 전환과 저장·입력 유지, 긴 영문 작은 화면, 키보드·초점·대비와 HTML 내보내기의 동일 동작을 확인한다. 잘못된 origin/source/slug/version/options·이전 응답은 거부한다. 검증 전 지원이라고 선언하지 않고 앱·카탈로그·팩의 자산 개수와 지원 기능을 일치시킨다. 원본 팩을 자동 재발행하지 않는다.

프리셋 자체의 국기 메뉴·테마 버튼이 동작해도 부모 설정과의 연결이 검증된 것은 아니다. 자식에서 바꾼 설정이 부모에 반영되고 부모에서 바꾼 설정이 실제 본문에 적용되는 두 방향을 각각 확인한다. 현재 공통 runtime이 native 설정 연결을 요구하면 그 정본의 표식·API를 사용한다. `locale`이 unsupported인데 프리셋 내부 메뉴만 동작하는 결과는 해당 두 범위를 분리해 보고하며 부모 언어 연동 완료로 표시하지 않는다.
