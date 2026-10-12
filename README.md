# pro-kit 포트폴리오 (GitHub Pages)

[pro-kit](https://github.com/roadkwon-ai/pro-kit) README의 [UI/UX 디자인](https://github.com/roadkwon-ai/pro-kit#uiux-디자인) 프리셋를 정적 HTML로 내보낸 브랜치다. GitHub Pages가 이 브랜치 루트를 `https://roadkwon-ai.github.io/pro-kit/`로 올린다. 폴더 하나가 사이트 하나이고, 사이트마다 사이트맵의 모든 페이지가 들어 있다.

루트(`index.html`, `work/`, `pages/`, `tutorials/`, `images/`, `_next/`, `404.html`)는 프리셋를 모은 프리셋 목록과 튜토리얼이다: https://roadkwon-ai.github.io/pro-kit/ . 튜토리얼 내용의 원본은 pro-kit 저장소의 `tutorials/`다. 같은 `prokit-ui` 흐름으로 만든 Next.js 사이트를 `basePath: "/pro-kit"`로 내보낸 것이다. 샘플 화면이 바뀌면 그 스크린샷과 데이터도 다시 만들어 함께 올린다.

| 폴더 | 샘플 | 페이지 | 스타일 (카탈로그) | 서체 (자체 호스팅) | AI 이미지 |
|---|---|---|---|---|---|
| [`ullim`](https://roadkwon-ai.github.io/pro-kit/ullim/) | 울림 · AI 내레이션 스튜디오 | 11 | MasterClass (Refero) | Black Han Sans, Hahmlet, Pretendard | 41장 |
| [`jecheol`](https://roadkwon-ai.github.io/pro-kit/jecheol/) | 제철상자 · 제철 농산물 정기배송 | 21 | Oakâme (Refero) | Wanted Sans, Pretendard | 32장 |
| [`pacecrew`](https://roadkwon-ai.github.io/pro-kit/pacecrew/) | PACECREW · 동네 러닝 크루 매칭 | 22 | Vodafone (awesome-design-md) | Wanted Sans, Pretendard | 46장 |
| [`afterglow`](https://roadkwon-ai.github.io/pro-kit/afterglow/) | AFTERGLOW · 가정용 태양광 배터리 | 17 | ORYZO AI (Refero) | Wanted Sans, Pretendard | 22장 |
| [`goru`](https://roadkwon-ai.github.io/pro-kit/goru/) | 고루 · 공동 생활비 정산 | 7 | Monzo (Refero) | Wanted Sans, Pretendard | 5장 |
| [`fitslot`](https://roadkwon-ai.github.io/pro-kit/fitslot/) | 핏슬롯 · 필라테스 수업 예약 | 20 | sweetgreen (Refero) | SUIT, Pretendard | 18장 |
| [`uptrail`](https://roadkwon-ai.github.io/pro-kit/uptrail/) | Uptrail · 개발팀 서비스 모니터링 | 22 | Default (Refero) | Pretendard, JetBrains Mono | 2장 |
| [`studyday`](https://roadkwon-ai.github.io/pro-kit/studyday/) | 하루공부 · 시험 학습 플래너 | 14 | Wise (awesome-design-md) | Wanted Sans, Pretendard | 3장 |

| [`speaker-portfolio`](https://roadkwon-ai.github.io/pro-kit/speaker-portfolio/) | 스피커 포트폴리오 · 개인 브랜딩 | 6 | 레퍼런스 기반 가상 예시 | Pretendard Variable | 18장 |

페이지 수는 정적 경로 기준이다(상세 페이지 포함).

튜토리얼 샘플은 [튜토리얼](https://github.com/roadkwon-ai/pro-kit/tree/main/tutorials)을 따라 만든 결과 예시다. 그림은 튜토리얼 자료 팩의 그림 묶음(팩 릴리스)에서 받았다.

| 폴더 | 튜토리얼 샘플 | 페이지 | 스타일 (카탈로그) | 서체 (자체 호스팅) | AI 이미지 |
|---|---|---|---|---|---|
| [`nextflix`](https://roadkwon-ai.github.io/pro-kit/nextflix/) | Nextflix · 영상 구독 서비스([넷플릭스 같은 영상 구독 서비스 만들기](https://github.com/roadkwon-ai/pro-kit/tree/main/tutorials/01-nextflix) 4장) | 133 | Netflix Spain (Refero), 색과 서체를 바꿈 | Pretendard | 138장(자료 팩 `pack-nextflix-1`) |

## 다시 올리기
1. 샘플 프로젝트 사본에서 `output: "export"`, `trailingSlash: true`, `basePath: "/pro-kit/<이름>"`으로 빌드한다. 프로젝트 사이트는 `/pro-kit/` 아래에서 열려서, basePath가 없으면 `/_next/`와 `/images/` 파일을 찾지 못한다.
2. 빌드 결과(`out/`)로 이 브랜치의 `<이름>/`을 통째로 바꾸고 커밋해 push한다. 몇 분 뒤 Pages가 다시 올린다.
3. `.nojekyll`은 지우지 않는다. 없으면 Jekyll이 `_next/` 폴더를 빼서 스크립트와 서체가 모두 404가 된다.

## 로컬에서 보기
주소가 `/pro-kit/`로 시작하므로 같은 경로로 띄운다.

```bash
git clone -b gh-pages --single-branch https://github.com/roadkwon-ai/pro-kit.git site/pro-kit
python3 -m http.server 8080 -d site
# http://localhost:8080/pro-kit/ (샘플 모음), http://localhost:8080/pro-kit/ullim/
```

## 만든 방법
- 이 템플릿(neon)을 설치한 BTS 프로젝트에서 `prokit-ui` 흐름으로 만든 Next.js 사이트다.
  - 카탈로그 3곳에서 스타일을 추천받아 골랐다.
  - 사이트맵을 쓰고, 페이지마다 브리프와 comp(OpenAI 이미지로 그린 화면 시안)를 만들었다.
  - 서체, 이미지, 모션, 상호작용(모달, 툴팁, 햄버거 메뉴, 사이드바, 페이지 전환)을 넣어 모든 페이지를 구현하고, critique와 polish를 거쳤다.
- 링크와 버튼은 모두 실제 페이지나 동작으로 이어진다. 내보낸 결과를 이 하위 경로로 띄워 모든 페이지의 링크와 버튼을 눌렀다. 404, 콘솔 오류, 반응 없는 버튼은 0이다.
- 로그인, 마이페이지, 앱 화면은 서버 없이 브라우저 저장소로 흉내 낸다. 처음 열면 예시 사용자로 로그인한 상태다. 로그아웃하면 로그인 화면으로 가고, 다시 로그인하면 보던 화면으로 돌아온다.
- 내보내기에서는 서버 이미지 최적화 대신, 원본 파일 주소에 basePath를 붙이는 이미지 로더를 넣었다. `next/image`의 문자열 `src`에는 basePath가 저절로 붙지 않는다.
- 데이터는 모두 예시다. 인물과 사진은 AI로 만든 가상 이미지이고, 이미지 옆 `.json`에 생성 프롬프트가 있다. 사람이 나오는 사진은 원본 크기로 팔다리와 손을 확인했다.
