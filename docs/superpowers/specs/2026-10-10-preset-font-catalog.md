# 프리셋 무료 웹폰트 조사 목록

## 범위와 확인 기준

[프리셋 디자인 설정과 미리보기 팔레트 설계](2026-10-10-preset-design-controls-design.md)에서 참조하는 폰트 조사 자료다. 사용자 첨부 자료와 제작자·배포자 공식 문서를 확인했다. 확인일은 2026-10-10이며, 초기 후보와 추가 후보는 인기 순위가 아니다.

용도는 공식 설명을 바탕으로 한 편집 제안이다. 한글·영문 지원과 사용 조건은 공식 설명, 라이선스, 배포 메타데이터를 근거로 적었다. 폰트 파일은 내려받지 않았으므로 실제 글리프 범위와 화면 품질을 검사한 결과는 아니다.

## 공통 라이선스 조건

아래 후보는 모두 [SIL Open Font License 1.1(OFL) 공식 전문](https://openfontlicense.org/open-font-license-official-text/)에 따른 무료 웹 임베드와 조건부 재배포를 허용한다. 글꼴을 웹페이지에 표시하거나 소프트웨어와 함께 배포할 수 있다. 폰트 파일을 재배포할 때는 해당 파일의 저작권 고지와 라이선스 전문을 보존한다.

폰트 자체의 단독 판매와 라이선스 변경은 허용되지 않는다. 폰트를 수정해 배포할 때는 예약된 글꼴 이름(Reserved Font Name) 조건도 따른다. 이 조건은 폰트로 작성한 일반 문서에 같은 라이선스를 적용하라는 뜻이 아니다.

표의 자체 호스팅 가능은 이 조건을 지킨 원본 파일의 배포를 뜻한다. 공식 사이트에서 사용하는 자산 URL도 장기 공개 CDN 제공을 보장하는 계약으로 보지 않는다.

## 초기 후보 12종

본문, 관리자 화면, 커머스 제목, 명조, 영문 UI를 비교할 수 있도록 추렸다. 굵기 범위는 확인한 CSS나 공식 배포 메타데이터 기준이다.

| 폰트 | 한글·영문 지원 | 굵기 | 제안 용도 | OFL·공식 출처 | 웹 배포와 자체 호스팅 | 확인일·한계 |
|---|---|---|---|---|---|---|
| Pretendard | 한글·영문 | 가변 100\~900, 기본 9종 | 범용 본문·SaaS·관리자 | [공식 배포·라이선스](https://github.com/orioncactus/pretendard) | [가변 동적 서브셋 CSS](https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css), 원본 자체 호스팅 가능 | 2026-10-10. 공식 README의 CSS 예제는 v1.3.9다. |
| SUIT | 한글·영문 | 가변 100\~900 | UI 본문·데이터 화면 | [제작자 배포·라이선스](https://github.com/sun-typeface/SUIT) | [제작자 저장소의 가변 CSS](https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/variable/woff2/SUIT-Variable.css), 공식 WOFF2 배포본 자체 호스팅 가능 | 2026-10-10. CSS의 `@2`는 패치 버전 고정 주소가 아니다. 현재 README는 설치·다운로드를 안내한다. |
| SUITE | 한글·영문 | 가변 300\~900 | 기하학적 제목·랜딩 | [제작자 배포·라이선스](https://github.com/sun-typeface/SUITE) | [공식 안내 가변 CSS](https://cdn.jsdelivr.net/gh/sun-typeface/SUITE@2/fonts/variable/woff2/SUITE-Variable.css), 원본 자체 호스팅 가능 | 2026-10-10. CSS의 `@2`는 패치 버전 고정 주소가 아니다. |
| Wanted Sans | 한글·영문 | 가변 400\~1000, 기본 7종 | 스타트업 본문·제목 | [공식 설명·라이선스](https://github.com/wanteddev/wanted-sans/blob/main/packages/wanted-sans/README.md) | [가변 동적 서브셋 CSS](https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.min.css), 원본 자체 호스팅 가능 | 2026-10-10. 공식 웹폰트 문서는 v1.0.3을 가리킨다. |
| Gmarket Sans | 한글·영문 | Light·Medium·Bold | 커머스·브랜드 제목 | [G마켓 공식 배포·OFL 안내](https://corp.gmarket.com/fonts/) | [공식 사이트의 Medium WOFF2](https://script.gmarket.com/fonts/GmarketSansMedium.woff2), 공식 배포본 자체 호스팅 가능 | 2026-10-10. WOFF2 HEAD는 200, CORS는 `*`다. 장기 공개 CDN 지원 문서는 확인하지 못했다. |
| Noto Sans KR | 한글·영문 | 가변 100\~900 | 중립적 본문·다국어 UI | [Google 공식 배포·OFL·메타데이터](https://github.com/google/fonts/tree/main/ofl/notosanskr) | [Google CSS](https://fonts.googleapis.com/css2?family=Noto+Sans+KR&display=swap), 원본 자체 호스팅 가능 | 2026-10-10. 예시 CSS는 기본 굵기만 요청한다. 실제 사용 굵기를 별도로 지정한다. |
| IBM Plex Sans KR | 한글·영문 | Thin·ExtraLight·Light·Regular·Medium·SemiBold·Bold | 기술 서비스·정보 화면 | [IBM 공식 배포](https://github.com/IBM/plex), [Google 공식 배포·OFL](https://github.com/google/fonts/tree/main/ofl/ibmplexsanskr) | [Google CSS](https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR&display=swap), 공식 배포본 자체 호스팅 가능 | 2026-10-10. IBM은 최신판을 받을 때 자사 저장소를 안내한다. Google 배포판과 같다고 단정하지 않는다. |
| NanumSquare Neo | 한글·영문 | Light·Regular·Bold·ExtraBold·Heavy, 가변 제공 | 서비스·기업 사이트 | [네이버 공식 소개](https://campaign.naver.com/nanumsquare_neo/), [네이버 OFL 전문](https://help.naver.com/service/30016/contents/18088?lang=ko&osType=PC) | [공식 CSS](https://hangeul.pstatic.net/hangeul_static/css/nanum-square-neo.css), [Regular WOFF2](https://hangeul.pstatic.net/hangeul_static/webfont/NanumSquareNeo/NanumSquareNeoTTF-bRg.woff2), 원본 자체 호스팅 가능 | 2026-10-10. 공식 CSS가 굵기별로 다른 family 이름을 선언한다. WOFF2 HEAD는 200, CORS는 `*`다. |
| MaruBuri | 한글·영문. 영문 확장 글리프 범위 미검사 | ExtraLight·Light·Regular·SemiBold·Bold | 매거진·브랜드·긴 글 | [네이버 공식 배포](https://hangeul.naver.com/font/maru), [네이버 OFL 전문](https://help.naver.com/service/30016/contents/18088?lang=ko&osType=PC) | [공식 CSS](https://hangeul.pstatic.net/hangeul_static/css/maru-buri.css), 원본 자체 호스팅 가능 | 2026-10-10. 공식 CSS가 굵기별로 다른 family 이름을 선언한다. Regular WOFF2 HEAD는 200, CORS는 `*`다. |
| Inter | 영문 지원, 한글 없음 | 가변 100\~900 | 영문 SaaS·관리자 | [제작자 소개·OFL·사용법](https://rsms.me/inter/) | [제작자 CSS](https://rsms.me/inter/inter.css), 원본 자체 호스팅 가능 | 2026-10-10. 공식 다운로드 안내는 4.1이다. 한글 대체 폰트가 필요하다. |
| Geist | 영문 지원, 한글 없음 | 가변 100\~900 | 영문 제품 UI·제목 | [Vercel 공식 배포·OFL](https://github.com/vercel/geist-font), [Google 언어·굵기 메타데이터](https://github.com/google/fonts/tree/main/ofl/geist) | [Google CSS](https://fonts.googleapis.com/css2?family=Geist&display=swap), 원본 자체 호스팅 가능 | 2026-10-10. 한글 대체 폰트가 필요하다. |
| Manrope | 영문 지원, 한글 없음 | 가변 200\~800 | 영문 브랜드·제품 UI | [Google 공식 배포·OFL·메타데이터](https://github.com/google/fonts/tree/main/ofl/manrope) | [Google CSS](https://fonts.googleapis.com/css2?family=Manrope&display=swap), 원본 자체 호스팅 가능 | 2026-10-10. 한글 대체 폰트가 필요하다. |

## 추가 후보 5종

추가 후보도 OFL을 확인했다. 초기 목록과의 용도 중복, 외부 로딩 조건, 제공 굵기의 차이를 검토한 뒤 추가할 수 있다.

| 폰트 | 한글·영문 지원 | 굵기 | 제안 용도 | OFL·공식 출처 | 웹 배포와 자체 호스팅 | 확인일·한계 |
|---|---|---|---|---|---|---|
| LINE Seed KR | 한글·영문 | Thin·Regular·Bold | 친근한 브랜드·커뮤니티 | [공식 소개·OFL 안내](https://seed.line.me/index_kr.html) | [공식 ZIP](https://seed.line.me/src/images/fonts/LINE_Seed_Sans_KR.zip), [공식 사이트의 Regular WOFF2](https://seed.line.me/src/fonts/LINESeedSansKR-Rg.woff2). 공식 배포본 자체 호스팅 가능 | 2026-10-10. WOFF2 HEAD는 200이나 CORS 허용 헤더가 없다. 프로킷에서 직접 외부 로딩이 된다고 보장하지 않는다. |
| Spoqa Han Sans Neo | 한글·영문 | 확인한 CSS 기준 100·300·400·500·700 | 숫자·커머스·본문 | [공식 설명·OFL](https://spoqa.github.io/spoqa-han-sans/), [공식 저장소](https://github.com/spoqa/spoqa-han-sans) | [공식 CSS](https://spoqa.github.io/spoqa-han-sans/css/SpoqaHanSansNeo.css), 원본 자체 호스팅 가능 | 2026-10-10. 기본 CSS는 한글 서브셋을 사용한다. 드문 글자의 대체 표시를 확인해야 한다. |
| Gowun Batang | 한글·영문 | Regular·Bold | 명조·콘텐츠 | [Google 공식 배포·OFL·메타데이터](https://github.com/google/fonts/tree/main/ofl/gowunbatang) | [Google CSS](https://fonts.googleapis.com/css2?family=Gowun+Batang&display=swap), 원본 자체 호스팅 가능 | 2026-10-10. 실제 제공 굵기만 사용하고 없는 굵기의 합성 표시는 별도로 확인한다. |
| Gowun Dodum | 한글·영문 | Regular | 부드러운 브랜드·소개 | [Google 공식 배포·OFL·메타데이터](https://github.com/google/fonts/tree/main/ofl/gowundodum) | [Google CSS](https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap), 원본 자체 호스팅 가능 | 2026-10-10. Regular만 제공한다. 굵은 제목에 사용할 때 합성 굵기를 의도한 것인지 확인한다. |
| DM Sans | 영문 지원, 한글 없음 | 가변 100\~1000 | 영문 본문·제품 UI | [Google 공식 배포·OFL·메타데이터](https://github.com/google/fonts/tree/main/ofl/dmsans) | [Google CSS](https://fonts.googleapis.com/css2?family=DM+Sans&display=swap), 원본 자체 호스팅 가능 | 2026-10-10. 한글 대체 폰트가 필요하다. |

## 배포 주소와 버전 해석

- Pretendard와 Wanted Sans의 표에 적은 버전은 공식 문서가 안내한 CSS 주소다. 모든 후보의 최신 릴리스 버전을 비교한 결과는 아니다.
- [Inter 공식 다운로드](https://rsms.me/inter/download/)는 4.1을 안내한다. 공식 CSS가 반환하는 WOFF2 주소에서도 같은 버전 문자열을 확인했다.
- Google CSS API와 네이버 CSS는 내용이 바뀔 수 있는 서비스 주소다. 자체 호스팅할 때는 실제 받은 원본의 버전·출처·해시·라이선스를 함께 기록해야 한다.
- [Google CSS API 공식 문서](https://developers.google.com/fonts/docs/css2)에 따라 필요한 굵기와 `display`를 지정한다. 표의 간단한 Google URL은 기본 굵기만 요청하며, 그대로 모든 굵기를 제공하는 주소로 취급하지 않는다.
- Google API는 브라우저에 따라 반환 형식을 바꾼다. 이번 일반 HTTP 요청에서는 TTF 주소가 반환되었으므로 고정 WOFF2 주소를 추정해 적지 않았다.

## 미리보기 적용 시 확인할 사항

### 한국어와 영어

Inter·Manrope·Geist·DM Sans에는 한글이 없다. 선택기에 `Inter + Pretendard`, `Geist + SUIT`처럼 한글 대체 폰트까지 포함한 조합을 표시하면 실제 적용 범위를 알 수 있다. 이 조합은 예시이며 프리셋별 최종 선택은 DESIGN.md에 기록한다.

언어 지원 메타데이터는 언어별 모든 이름과 기호가 들어 있다는 보장이 아니다. 실제 프리셋의 문장, 숫자, 문장부호, 드문 한글을 넣어 누락과 대체 표시를 확인해야 한다.

### 굵기와 로딩

네이버 공식 CSS는 `NanumSquareNeoBold`, `MaruBuriSemiBold`처럼 굵기마다 다른 family 이름을 선언한다. 단일 family에 `font-weight`만 바꾸면 원하는 굵기가 적용되지 않을 수 있다. 공식 family 이름을 따르거나 원본 WOFF2를 굵기별 `@font-face`로 연결한다.

Gmarket Sans의 확인된 파일 호스트는 `script.gmarket.com`이다. 같은 경로를 `script.gmarket.co.kr`로 요청했을 때는 404였다. LINE Seed는 공식 파일이 응답해도 교차 출처 허용 헤더가 없어 공식 배포본의 자체 호스팅 경로를 먼저 준비한다.

선택한 미리보기 폰트만 불러온다. 불러오기에 실패했을 때 원래 폰트와 한글 대체 폰트가 유지되는지 확인한다. 공식 라이선스 확인과 실제 브라우저 적용 성공은 별개의 검사다.

## 확인한 범위와 남은 검사

공식 문서·라이선스·텍스트 CSS·Google 배포 메타데이터를 읽었다. 표에 적은 CSS의 HTTP 응답과 Gmarket Sans, LINE Seed KR, NanumSquare Neo, MaruBuri 일부 WOFF2의 HEAD 응답을 확인했다. 폰트 바이너리와 ZIP은 내려받지 않았다.

브라우저 렌더링, 실제 글리프 범위, 폰트별 파일 크기, 모든 굵기의 로딩, 모바일 화면 품질은 검사하지 않았다. 정적 HTML 내보내기와 오프라인 로딩도 구현 후 검사해야 한다. 이 자료는 카탈로그 기획과 공식 출처 확인의 근거이며 배포 완료 증거가 아니다.

사용자 첨부 자료의 에스코어 드림, KoPubWorld, 배민, 넥슨 등은 이번 우선 조사 범위에 포함하지 않았다. DESIGN.md 참고 사이트의 폰트도 사이트에서 사용한다는 사실만으로 재배포를 허용한다고 판단하지 않는다. 추가 등록 전에 개별 공식 라이선스와 웹 배포 경로를 확인해야 한다.
