# Nextflix 범위 넓히기 인계 (Codex용)

> Claude Code 세션에서 정한 내용을 Codex가 이어 가도록 정리한 문서다. 이 문서와 저장소 `AGENTS.md`만 보고 진행한다. 정한 것은 다시 묻지 않는다. 문서에 없는 세부는 리서치(`../bts-samples/research/nextflix/`)를 근거로 정하고, 정한 것을 이 문서 끝 "진행 기록"에 한 줄씩 적는다.

## 배경

- 원래 계획 `docs/superpowers/plans/2026-10-05-nextflix-tutorial.md`는 Task 1~16을 마쳤다. Task 17(공개: 커밋, 팩 그림 릴리스, `main` 릴리스, gh-pages)만 남았고, 사용자가 요청할 때만 한다. 저장소에는 아직 아무것도 커밋하지 않았다(`git status`의 `tutorials/01-nextflix/`, 계획·설계 문서 등).
- 사용자가 샘플을 실제 넷플릭스와 비교해 보고 "웹에서 되는 것 전부, 흉내만 내도록 모두 추가"를 요청했다(2026-10-05). 설계 문서 2절이 "넣지 않는 것"과 "팁으로만"으로 뺀 항목을 모두 넣는다.
- 샘플 사이트는 교재 4장(화면만, 예시 데이터)까지다. 5~12장은 교재 글만 있고 실행하지 않는다. 새 기능도 같다. 4장 샘플에는 화면으로 넣고, 5장 이후에 할 일은 `pack/features.md`와 해당 장 글에 규칙으로 적는다.

## 지켜야 할 것

- 원래 계획의 Global Constraints를 그대로 따른다: 넷플릭스 로고·빨강·서체·작품 그림과 문구 금지, 안내 문구 "넷플릭스와 관계없는 연습용 서비스예요. 데이터는 모두 예시예요.", 교재 프롬프트에 값 넣지 않기, 해요체와 korean-skills 세 단계, 정적 내보내기(상세 창은 쿼리 `t`).
- git과 gh 명령 앞에 `set -a; . /Users/freelife/youtube/.envrc; set +a`를 붙인다(작성자 roadkwonai). 다른 계정과 토큰은 쓰지 않는다. 토큰 값과 `OPENAI_API_KEY`(`bts-starter-kit/.env`)는 출력하거나 파일에 남기지 않는다.
- 커밋, push, 릴리스는 사용자가 요청할 때만 한다. 샘플·포트폴리오 작업공간 커밋도 사용자가 화면을 확인한 뒤에 한다.
- 셸 작업 디렉터리를 `templates/`나 `tutorials/01-nextflix/pack/` 안에 두지 않는다(저장소 루트에서 경로로 실행).
- 템플릿을 건드리면 `node --test 'templates/<템플릿>/tests/*.test.mjs'` 두 템플릿 모두 통과(지금 176/176).
- **흉내의 안전선**
  - 결제: 카드 번호, 유효기간, CVC 같은 결제 정보 입력 칸을 어디에도 두지 않는다. 공개 사이트라 실제 카드 번호를 칠 수 있다. 결제 수단은 예시 카드(•••• 4242 등) 중에서 고르는 방식만 쓴다.
  - 메일: 추가 회원 초대, 알림, 프로필 이전에서 실제 메일을 보내지 않는다. 화면 안 알림으로만 보여 준다(Resend 발송은 팁으로만).
  - 광고: 실제 브랜드나 지어낸 회사 광고를 만들지 않는다. 이 서비스의 다른 작품·게임 홍보만 광고로 쓴다.
  - 새 그림도 실제 인물, 실제 작품, 글자, 로고를 넣지 않는다(`tools/pack-images.mjs`의 RULES).

## 넣을 것과 흉내 방법

"4장"은 샘플에 들어갈 화면 상태, "5장 이후"는 `features.md`와 장 글에 적을 규칙이다.

| # | 항목 | 4장(화면) | 5장 이후 | 데이터·그림 |
|---|---|---|---|---|
| 1 | 계정 보안 | `/account` 왼쪽 메뉴 5개(개요, 멤버십, 보안, 디바이스, 프로필). 보안: 이메일, 비밀번호 바꾸기 폼(지금·새·확인, 8자 이상, 화면 안에서만) | 5장: Better Auth `changePassword`, "다른 디바이스에서 로그아웃" 선택 | — |
| 2 | 디바이스 | 로그인한 디바이스 목록(이름, 마지막 사용, "이 디바이스"), 디바이스별 로그아웃, 다른 모든 디바이스에서 로그아웃 | 5장: `listSessions`, `revokeSession`, `revokeOtherSessions`. 이름은 user agent로 | `site.json` `devices` |
| 3 | 가구 판정 | 디바이스 절의 "이용 가구" 상자(지정 TV), "이용 가구 밖" 기기에 "임시 코드 받기"(4자리, 15분) | 화면만(모든 장) | `devices`에 표시 |
| 4 | 결제 | 가입에 "결제 수단 고르기" 단계(예시 카드·계좌 고르기, 입력 칸 없음), 멤버십에 다음 결제일·결제 수단·결제 내역 표, 결제 수단 바꾸기(예시 중 고르기) | 화면 상태만(요금제처럼 저장하지 않음) | `site.json` `billing` |
| 5 | 추가 회원 | 멤버십에 자리 표(스탠다드 1, 프리미엄 2, 광고형 없음), 자리 사기 → 이름·이메일 → "초대함(예시)" | 화면만. 메일 없음 | 가격 4,000/5,000원(리서치 04) |
| 6 | 광고 | 요금제를 광고형으로 바꾸면 재생 전 광고 구간(15초 카운트다운, 건너뛰기 없음, "광고 · 0:15"). 광고형은 재생 속도 버튼 숨김, 일부 작품 "광고형 요금제로는 볼 수 없어요" | 10장 규칙에 같은 조건 | `titles[].adTierUnavailable`(2편) |
| 7 | 재생: 음성·자막 | 컨트롤 줄에 "음성 및 자막" 패널(음성 목록, 자막 목록과 끄기). 고른 자막은 같은 방문의 다음 회차에도 이어짐 | 프로필 설정에 자막 언어·자막 모양(크기, 배경) 저장 | `pack/data/subtitles/*.vtt`, `videos[].audioLanguage`, `videos[].subtitles` |
| 8 | 재생 속도 | 0.5x, 0.75x, 1x(보통), 1.25x, 1.5x 패널. 방문마다 1x | 저장 안 함 | — |
| 9 | 게임 | 헤더 메뉴 "게임" → `/games`(빌보드, 줄). 게임 3개는 브라우저에서 실제로 됨: 작품 퀴즈(그림 보고 제목 4지선다), 포스터 짝 맞추기, 빌보드 슬라이딩 퍼즐. `/games/<slug>` | 화면만. 점수 저장 안 함 | `data/games.json`, 게임 그림(카드 3, 빌보드 1) |
| 10 | 언어별로 찾아보기 | 헤더 메뉴 → `/browse/language`. 선택 상자(원어·더빙·자막, 언어, 정렬)와 격자 | 6장: 같은 필터를 DB 질의로 | `titles[].languages` `{original, dubbing[], subtitles[]}` |
| 11 | 프로필 이전 | 프로필 메뉴 → `/profiles/transfer`. 안내 → 옮길 프로필 → 새 이메일·비밀번호 → 완료(화면 안에서만). 메인 프로필은 옮길 수 없음 | 5장: 새 계정을 만들고 `profile.userId`를 옮김(찜·평가·기록이 따라감) | — |
| 12 | 고객 센터 | 프로필 메뉴와 푸터 → `/help`(검색, 인기 주제, 분류), `/help/<slug>` 글. 로그인 여부에 따라 머리줄이 바뀜(작품 쪽과 같은 방식) | 정적 그대로 | `data/help.json`(팩 규칙을 우리 말로 15편 안팎) |
| 13 | 예고편 | 상세 창 "예고편 및 다른 영상" 절(카드 그림 + 재생 표시 + 이름). 누르면 창 위 16:9에서 소리 켜고 재생 | 6장 데이터 모델에 포함 | `titles[].trailers` `[{name, videoId, start, end}]`(회차 영상 구간) |
| 14 | 시청한 예고편 줄 | `/my`에 줄 추가(이어 보기, 찜, 시청한 예고편, 좋아요 순) | 10장: 미리 보기·예고편을 5초 넘게 보면 기록 | `rows.json` `my`에 예시 |
| 15 | 미리 보기 자동 재생 | 빌보드·hover 창·상세 창이 첫 예고편 구간을 음소거로 자동 재생. 빌보드는 끝나면 그림과 "다시 재생". 음소거 상태는 셋이 함께. 움직임 줄이기면 정지 그림. 재생 중에는 영상 출처 표기를 작게 보여 줌 | 같음 | `trailers` 재사용 |
| 16 | 다운로드 | 상세 창 회차·영화에 저장 버튼(진행 표시 → 저장됨), `/my`에 "저장한 콘텐츠"와 `/my/downloads` 관리. 광고형은 월 15개 제한 | 8장: 찜처럼 프로필별로 저장 | — |
| 17 | 세로 영상 피드 | `/clips`: 9:16 클립을 위아래로 넘김(스냅, ↑↓ 키, 지금 클립만 음소거 재생), 찜·작품 보기·링크 복사. 홈에 "클립" 줄(9:16 카드) | 화면만 | `data/clips.json`(12개, 영상 구간). 썸네일은 포스터 그림 |
| 18 | 라이브 | 라이브 작품 2편(지어낸 생방송. 하나는 "지금 라이브", 하나는 "곧 시작" + 알림 받기). 재생은 되감기·진행 막대 없이 "라이브" 배지, 시청자 수 글자 | 화면만 | `titles`에 `kind: "live"` 2편, 새 그림(카드·포스터·빌보드) |
| 19 | 맞춤 썸네일 | 대표 작품 8편에 다른 카드 그림 2장씩. 프로필마다 다른 그림(4장은 프로필 순서로 고름) | 6장 이후: 프로필이 많이 본 분위기에 맞는 그림 | `images.cardAlt`, 새 그림 16장 |
| 20 | AI 검색 | 검색 쪽 "AI로 찾기" 전환. "웃기고 짧은 거" 같은 문장을 규칙표로 분위기·장르·종류에 맞추고, "이렇게 이해했어요" 칩과 결과를 보여 줌 | 7장: 규칙표가 기본. 실제 LLM은 팁 | `data/ai-search.json` |
| 21 | TOP 10 집계 | 4장은 예시 순서 그대로 | 10장: 최근 7일 재생 기록으로 시리즈·영화 따로 집계. 기록이 없으면 예시 순서 | — |
| 22 | 알림 만들기 | 4장은 예시 알림 그대로 | 8장: 알림 받기 한 공개 예정 작품이 공개되면, 라이브가 시작되면 알림 행을 만듦. 메일은 팁 | — |
| 23 | 어린이 프로필과 등급 상한 | 예시 프로필 "어린이"를 어린이 프로필로(상한 12). 둘러보기·검색에서 상한 넘는 작품 숨김, 헤더에 "키즈" 표시, 프로필 메뉴에서 계정·프로필 관리 숨기고 "어린이 프로필 나가기". 프로필 편집에 관람 등급(전체, 7, 12, 15, 19)과 어린이 프로필 켜기 | 5장: `profile.kids`, `profile.maxAge`, 질의에 조건 | `site.json` `profiles` |
| 24 | 프로필 잠금 PIN | 프로필 편집에 PIN 4자리 켜기·끄기. 잠긴 프로필을 고르면 PIN 입력(4칸). 예시 "민호"를 잠그고 입력 화면에 "예시 PIN은 1234예요" | 5장: PIN 해시 저장 | `profiles[].pin` 예시 |
| 25 | 시청 기록 숨기기 | 계정 → 프로필별 "시청 기록" → `/account/history?p=<id>`: 날짜·작품·회차 목록, 항목 숨기기, 모두 숨기기(확인 창). 숨긴 작품은 이어 보기에서 빠짐 | 10장: 기록 행에 숨김 표시 | `site.json` `history` 예시 |

- 헤더 메뉴는 넷플릭스와 같은 7개: 홈, 시리즈, 영화, 게임, 요즘 대세, 나의 {이름}, 언어별로 찾아보기. 클립과 라이브는 메뉴가 아니라 홈 줄로 들어간다. 반응형 접힘(6절 표)은 리서치 02 10절 값을 따르되, 우리 글자 길이로 한 줄에 안 들어가면 실측해 줄이고 팩에 적는다.
- 프로필 메뉴 순서: 다른 프로필 → 프로필 관리 → 프로필 이전 → 계정 → 고객 센터 → 구분선 → 로그아웃(리서치 02 8절).
- 설계 문서 "팁으로만"의 "다른 스타일로 바꾸기", "ego lite로 더 맞추기"는 그대로 팁이다.

## 확인해 둔 사실

- **자막 원본**
  - Sintel: `https://durian.blender.org/wp-content/content/subtitles/sintel_<en|es|fr|de|nl|it|pt|pl|ru>.srt`
  - Tears of Steel: `https://download.blender.org/demo/movies/ToS/subtitles/TOS-<en|es|de|nl|it|ru|no>.srt`(프랑스어는 `TOS-fr-Goofy.srt`라 쓰지 않는다)
  - 둘 다 영화와 같은 CC BY 3.0이다. 한국어 자막은 없으니 영어판을 번역해 만들고, `SOURCES.md`에 "원본 자막 번역"으로 표기한다.
  - `videos.json`의 영상(video.blender.org)과 시간이 맞는지 먼저 확인한다. Sintel은 14:48로 맞다.
  - video.blender.org API의 `/captions`는 10편 모두 비어 있다. 나머지 8편은 대사가 거의 없어 자막 없이 "끄기"만 둔다.
- **팩 그림**
  - `tools/pack-images.mjs`(impeccable `generate-image`, 기본 모델 gpt-image-2.5-flare, cwebp 자르기와 용량 한도)로 만들었다. Codex 자체 이미지 도구를 써도 되지만, 크기·용량·이름 규칙은 같아야 한다.
  - 원본은 `../bts-samples/research/nextflix/pack-images/src`, 결과는 `out`, zip은 `nextflix-images.zip`이다.
  - 릴리스 `pack-nextflix-1`은 아직 올리지 않았다. 그래서 같은 태그로 zip을 다시 만들고 `pack/images.json`의 `sha256`, `bytes`, `files`만 바꾸면 된다.
- **검사 도구**(`../bts-samples/tools/`)
  - `pack-check.mjs`: 지금 `PASS 작품 48, 회차 161, 그림 112, 영상 10`
  - `nextflix-probe.mjs`: R3 검사 8개
  - 그 밖에 `site-check.mjs`, `export.sh`, `publish.sh nextflix`, `publish-root.sh`, `root-check.mjs`(`tools/`에서 실행)
- **샘플 작업공간**: `../bts-samples/tutorials/nextflix`, 마지막 커밋은 9383e9f(R2·R3)다. 라운드 프롬프트는 `../bts-samples/prompts/nextflix-R*.txt`다.
  - `tools/run.sh`는 Claude Code를 헤드리스로 돌린다.
  - Codex로 라운드를 돌리려면 그 폴더에서 `codex exec`로 같은 프롬프트를 실행하고, 로그를 `../bts-samples/logs/nextflix-R4-codex.*`로 남긴다.
- **포트폴리오**: `../bts-samples/ws/portfolio`, 마지막 커밋은 4e3fe7d(R17)다. 교재 글을 `scripts/sync-tutorials.mjs`로 복사해 싣는다.
- **로컬 미리보기**: `python3 -m http.server 8090`을 `../bts-samples/pages`에서 띄운다. 샘플은 `/bts-starter-kit/nextflix/`에 있다.
- **SDD 기록**: `.superpowers/sdd/2026-10-05-nextflix-tutorial/progress.md`(git 무시)에 원래 계획의 판정 53개가 있다.

## 진행 순서

1. **설계 고치기**
   - `docs/superpowers/specs/2026-10-05-nextflix-tutorial-design.md` 2절 범위를 바꾼다. 위 표의 항목을 "넣는 것"으로 옮기고, 흉내인 항목은 "흉내(화면만)"로 따로 적는다.
   - 3절 사이트맵에 새 경로(`/games`, `/games/<slug>`, `/browse/language`, `/clips`, `/help`, `/help/<slug>`, `/profiles/transfer`, `/my/downloads`, `/account/history`)를 더한다.
   - 4.2절 장 표의 "팩에서 쓰는 것"도 맞춘다.
2. **팩 고치기**
   - `screens.md`: 사이트맵, 헤더 메뉴, 프로필 메뉴, 화면별 절, 인터랙션, 반응형, 빈 상태, 8절 정적 규칙, 9절 [추정] 목록.
   - `features.md`: 항목별 규칙과 5장 이후 데이터 모델 힌트.
   - `data/*.json`과 새 데이터 파일, `data/subtitles/`.
   - `wireframes/watch.svg`: 음성·자막, 속도 버튼과 광고·라이브 상태.
   - 새 그림 약 23장(게임 4, 라이브 6, 맞춤 썸네일 16 중 필요한 만큼)을 만들고 zip과 `images.json`을 갱신한다. `SOURCES.md`도 고친다.
   - `pack-check.mjs`가 새 데이터를 검사하게 고쳐 PASS를 만든다. 링크·프롬프트 검사도 PASS여야 한다.
   - 끝나면 따로 리뷰한다. 같은 세션이 스스로 승인하지 않는다.
3. **샘플 R4**
   - `prompts/nextflix-R4.txt`를 쓴다. 바뀐 팩 절과 위 표를 가리키는 짧은 지시와, 4장 규칙(화면 안 상태, 저장 없음)을 넣는다.
   - 라운드를 돌린다. 기존 R3 확인 사항이 깨지지 않아야 한다.
   - `nextflix-probe.mjs`에 새 검사를 더한다: 메뉴 7개, 게임 3개 동작, 자막 켜기, 속도 바꾸기, 광고형 광고 구간, 라이브 진행 막대 없음, PIN 화면, 어린이 프로필 숨김, 언어 필터, AI 검색 칩, 클립 넘기기.
   - 이어서 site-check(모든 링크·버튼), widths, axe, 이름 바꾸기 검사를 돌린다.
   - 사용자에게 화면을 확인받은 뒤 R4c로 감사, 라운드 닫기, 샘플 작업공간 커밋(roadkwonai)을 한다.
4. **교재 고치기**
   - README "무엇을 만드나요"(새 기능, 흉내라는 점), 팁 목록(어린이·PIN·기록 숨기기가 기능으로 옮겨 감), "만든 기록"(R4는 범위를 넓힌 라운드이고 도구와 비용을 따로 적는다)을 고친다.
   - 4장 캡션, 5·6·7·8·10장에 위 표의 "5장 이후" 규칙을 넣는다. 프롬프트 블록은 10줄 이내, 값 없이 팩을 가리킨다.
   - 바뀐 화면 그림(`assets/*.webp`)을 다시 찍는다.
   - korean-skills 세 단계를 거치고, 링크·프롬프트 검사를 PASS로 만든다. 끝나면 따로 리뷰한다.
5. **포트폴리오 R18**: 교재 글을 다시 맞추고(sync), 샘플 화면을 다시 찍는다. 사용자 확인 뒤 커밋한다.
6. **공개**: 원래 계획 Task 17을 사용자가 요청할 때 한다. 순서는 팩 릴리스(새 sha256 확인)와 gh-pages를 `main` 릴리스보다 먼저 하거나 함께 한다.

## 진행 기록

- 2026-10-05 Claude Code: 범위와 흉내 방법을 정하고, 자막 원본 주소를 확인하고, 이 문서를 썼다. 저장소와 팩은 아직 고치지 않았다.

- 2026-10-05 Codex: 기존 미커밋 결과를 보존해 지정된 현재 체크아웃에서 이어 간다. 별도 worktree·커밋을 만들지 않고 진행 기록은 이 문서를 정본으로 쓴다(사용자의 현재 경로·커밋 금지 지시 우선).
- 2026-10-05 Codex: 그림 수는 항목별 합계인 26장(게임 4 + 라이브 6 + 대체 카드 16)으로 확정했다. 기존 112장과 합쳐 138장이다. 라이브는 기존 시리즈·영화 분류와 TOP 10에 섞지 않는다.
- 2026-10-05 Codex: 1단계 설계에 25개 확장 항목, 화면만 흉내 내는 안전선, 신규 9개 경로, 장별 팩 연결과 자막·그림 구성을 반영했다. 다음은 2단계 팩이며, R4 시작 전 보고하고 멈춘다.

- 2026-10-05 Codex: 추가 회원 자리는 기본 요금제별 0·1·2개로, 4,000/5,000원은 추가 회원의 광고형/광고 없는 옵션으로 분리했다(리서치 04).
- 2026-10-05 Codex: 어린이 상한은 검색·목록뿐 아니라 상세·재생 직접 주소에도 적용한다. 언어 필터는 작품의 예시 메타이고 실제 음성·자막은 videos.json 트랙을 따른다.
- 2026-10-05 Codex: 프로필 이전은 현재 계정 재인증·새 계정 소유 확인 후 이름/slot 충돌을 검사해 원자적으로 옮긴다. 맞춤 썸네일은 본 분위기를 우선하고 기록이 없으면 profile.slot으로 고른다.
- 2026-10-05 Codex: 자막은 공식 SRT 16개와 한국어 번역 2개로 구성했다. 나머지 8편은 자막이 없고, API 언어가 확인된 Wing It!은 en, 나머지 7편은 원본 오디오(und)를 쓴다. VTT 파싱·원본 시각 일치·영상 길이 범위는 확인했으며 청취 동기 검사는 하지 않았다.
- 2026-10-05 Codex: 새 라이브는 moonlit-busking/물결지붕 야간 합주, rainy-day-letter/빗방울 서랍의 편지로 정했다. 기존 ‘달빛 버스킹’과 가까운 실제 공연이 검색돼 제목을 바꿨고 새 제목과 같은 검색 결과는 확인되지 않았다. 새 출연자·제작자 이름은 추가하지 않았다.

- 2026-10-05 Codex: 팩 그림 138장 zip을 만들었다(기존 112장 바이트 유지). 7,421,683바이트, SHA-256 `73ba9c64ce7bb6c52b81f501fb3ba874817e5a74f7c1285cd07807616f867918`. 공개 전 로컬 산출물이며 릴리스에 올리지 않았다.
- 2026-10-05 Codex: 팩 중간 검증은 `node ../bts-samples/tools/pack-check.mjs tutorials/01-nextflix/pack` PASS(작품50/회차161/그림138/영상10), `node --test ../bts-samples/tools/pack-check.test.mjs` PASS(2개), 링크·프롬프트 PASS(문서17/블록36), watch.svg XML PASS. 독립 검토를 시작했으며 아직 2단계 승인이나 R4 실행은 하지 않았다.
- 2026-10-05 Codex: screens/features/SOURCES를 humanizer → style-guide → grammar-checker 순서로 검수했다. 고정 수치·링크·코드 식별자·해요체를 유지했고 추가 언어 교정은 0건이었다. 문서 축약 중 빠진 기존 재생·검색·DB 계약은 원본과 대조해 복원했다.

- 2026-10-05 Codex: 작성에 참여하지 않은 pack_review(gpt-6-astra)가 25개 항목을 검토했다. Critical 0, Important 10으로 1차 판정은 수정 필요였다. 공개 예정·이어 보기·어린이/PIN·맞춤 카드·자막 공개 경로·AI 규칙·클립 소속·씨앗 FK·배치도 우선순위·광고/미리보기 상태 누락을 모두 보완하고 지적 해소 확인을 요청했다.
- 2026-10-05 Codex: 공개 예정은 latest의 next-week 5편으로 판정하며, 시작 전 라이브 1편까지 빼면 정적 재생 후보는 44편이다. 4장에서는 명시한 유효 e → 예시 이어 보기 → 첫 회차 순서로 시작하되 잘못된 e는 첫 회차로 보낸다.
- 2026-10-05 Codex: 카드 그림은 4장 프로필 배열 index % 3으로 기본/대체1/대체2를 고른다. 6장 이후 moods[0]/moods[1]를 대체1/2와 연결하고 기록이 없으면 (slot - 1) % 3을 쓴다.
- 2026-10-05 Codex: VTT는 public/data/subtitles에 복사하고 공개 URL은 basePath + '/' + src로 만든다. 클립 줄은 정적으로 합성해 작품 FK 씨앗에서 제외한다. 본문과 배치도가 다르면 screens.md를 따른다.
- 2026-10-05 Codex: AI 검색은 같은 필드 OR·서로 다른 필드 AND로 정하고 ‘웃기고 짧은 거’에 분위기·길이 칩이 모두 붙도록 보완했다. 클립 03/05/09/10의 영상은 연결 작품 회차에 속하도록 바꿨다.
- 2026-10-05 Codex: 잘못된 클립 소속을 기존 검사기가 PASS시키는 회귀 실패를 확인한 뒤 소속·빈 퀴즈·AI 필터 값 검사 등을 보완했다. 다시 실행한 팩 검사와 회귀 2개(정상 팩 및 8개 변형 사례)는 PASS다.
- 2026-10-05 Codex: 검토 수정분을 korean-skills 순서로 다시 검수했다(humanizer 0건, style-guide 2건: design-notes 해요체, grammar-checker 0건). 실제 자막 청취, 클립 설명과 실제 영상 장면의 일치, R4 브라우저 동작·접근성·반응형은 아직 확인하지 않았다.

- 2026-10-05 Codex: 다운로드 한도는 리서치 04에 따라 광고형 월 15개와 광고 없는 요금제의 동시 보관 100개로 구분했다. `maxStoredDownloads`와 `downloadsPerMonth`를 분리했으며 실제 기기 판정 없이 프로필별 예시로 단순화했다. 언어 선택은 원어/더빙/자막의 세 기준으로 명시했다.

- 2026-10-05 Codex: **1·2단계 완료, 첫 중단 지점에 도달했다.** 별도 pack_review 에이전트가 Important 10개와 Minor 수정의 해소를 읽기 전용으로 확인해 승인했고, 다운로드 한도 정정 뒤에도 승인을 유지했다. 커밋·push·릴리스·샘플 R4 실행은 하지 않았다.
- 2026-10-05 Codex: 최종 검사 명령은 `node ../bts-samples/tools/pack-check.mjs tutorials/01-nextflix/pack` PASS(50/161/138/10), `node --test ../bts-samples/tools/pack-check.test.mjs` PASS(2/2), `xmllint --noout tutorials/01-nextflix/pack/wireframes/*.svg` PASS(8개), 원래 계획 Task 9 Step 3의 링크·프롬프트 검사(팩 문서까지 확장) PASS(17문서/36블록)다. 이미지 zip 138개 규격·용량·내용·해시도 PASS다.
- 2026-10-05 Codex: 다음은 3단계 샘플 R4다. 새 페이지·25개 상태와 게임, 기존 R3 유지, probe/site-check/widths/axe/이름 바꾸기 검사를 합쳐 약 3~5시간으로 추정한다(도구 대기·수정 반복에 따라 달라짐). `codex login status`는 ChatGPT 로그인으로 확인했다. 비용은 구독 포함 사용량·크레딧 기준이라 실행 전 정확한 금액을 산정할 수 없다. 포함량 안이면 추가 구매 없이 실행하며, API 키 방식으로 전환하거나 크레딧을 구매하지 않는다. API 가격은 구독 작업 비용 추정에 쓰지 않는다([공식 요금 안내](https://learn.chatgpt.com/docs/pricing)).
- 2026-10-05 Codex: R4에서는 공개 전인 릴리스 URL 대신 검증된 로컬 `../bts-samples/research/nextflix/pack-images/nextflix-images.zip`을 사용한다. 새 그림 생성은 필요 없다. R4 검사가 끝나면 두 번째 중단 지점에서 로컬 주소와 확인 순서를 보고하고, 사용자가 화면을 확인하기 전 R4c·커밋·4단계로 넘어가지 않는다.
- 2026-10-05 Codex: 사용자가 ‘진행해’로 R4 시작을 요청했다. `prompts/nextflix-R4.txt`를 작성하고 샘플 폴더의 별도 Codex 실행 세션에 구현·프로젝트 검사·독립 리뷰를 맡긴다. 이 세션은 외부 probe 확장과 최종 전수 검사를 담당하며 [confirm]·audit·close·커밋은 화면 확인 뒤까지 남겨 둔다.
- 2026-10-05 Codex: R4 구현 전 기존 `nextflix-probe.mjs` 8개를 정적 샘플에서 다시 실행해 PASS를 확인했다(`logs/nextflix-R4-baseline-probe.json`). 새 게임·언어·클립·도움말 경로는 HTTP 404여서 확장 전 실패 기준을 확보했다. 외부 검사 도구 확장은 별도 r4_probe 에이전트가 맡고 샘플 파일은 건드리지 않는다.
- 2026-10-05 Codex: 전수 검사에 `site-check.mjs`의 START 시작 경로를 더하고 줄의 transform·scrollLeft도 반응 판정에 포함했다. 같은 기존 browse의 버튼 19개를 전후 검사해 ‘다음 작품’ dead 오탐 1건이 0건으로 바뀜을 확인했다. 새 시작 경로로 기존 45페이지를 탐색하고 아직 없는 games/help의 404도 잡았다.
- 2026-10-05 Codex: R4 실행 세션은 `01a10a58-b7aa-7980-a425-58ac4f2c345d`, 로그는 `logs/nextflix-R4-codex.jsonl`, 최종 보고 경로는 `logs/nextflix-R4-codex.final.txt`다. 외부 probe는 기존 회귀에 9~19단계를 더했고 문법 검사는 PASS다. 구현 전 R3 대상으로 새 요구가 실패하는 RED를 확보했으며, R4의 최종 GREEN·전수 링크/버튼·폭·axe·이름 검사는 아직 남았다.
- 2026-10-05 Codex: 개발용 localhost:3001 probe는 Chromium이 같은 포트의 IPv4 `my-app`으로 연결해 다른 프로젝트를 검사한 무효 결과였다. lsof cwd로 IPv6의 nextflix PID와 IPv4의 별도 프로젝트를 구분했고, `http://[::1]:3001`로 R4 개발 검사를 다시 실행한다. 다른 프로젝트 프로세스는 중지하지 않는다.
- 2026-10-05 Codex: R4의 보호 화면은 프로필 선택 전에 안내만 렌더링한다. 외부 검사도 실제 ‘프로필 고르기 → 지우 → 뒤로 두 번’의 SPA 흐름으로 메모리를 유지해 원래 경로를 검사하도록 `tools/screen-profile.mjs`를 공용으로 쓰게 했다. `qa.mjs`·`site-check.mjs`는 `BTS_SCREEN_PROFILE=지우`로 켜며 probe도 같은 도우미를 쓴다. 아직 최종 런타임 통과 판정은 아니다.
- 2026-10-05 Codex: Ego 브라우저 UI 재확인이 사용자 제어 hard-stop(`The user has taken control of this task space`)으로 중단됐다. ego-browser SKILL.md의 ‘Stop when the user takes control … Do not retry or route around the stop’에 따라 추가 브라우저 실행을 중지하고 사용자에게 같은 공간 재개를 요청했다. 재개 답변 전에는 타입·lint·빌드·내보내기와 정적 검증만 진행한다. R4 완료나 두 번째 중단 지점 도달로 보지 않는다.
- 2026-10-05 Codex: R4 구현 세션은 25항목·신규9종 경로를 반영해 HTML134를 내보냈고 독립 코드 재검토는 approve/max=none이다. 마지막 타입·lint·빌드·내보내기·Next 진단은 PASS이며 lint는 기존 경고1·정보1이다. UI 재확인은 잠정 audit14/20·a11y2/4로 미승인이다. 상세 인계는 샘플 `tasks/evidence/nextflix-R4/REPORT.md`, 미검증 시나리오와 TaskSpace14/p1·p3를 보존했다.
- 2026-10-05 Codex: 브라우저 재개 대기 중 이름 검사 사본의 name 한 값을 Zoomflix로 바꿔 HTML134 전체와 모든 산출물을 검사했다. 초기 사본 빌드는 개발용 NODE_ENV를 주입해 React 훅 오류가 났으며 production 빌드 환경으로 고쳐 PASS를 확인했다. 남은 내부 CSS nextflix-player 두 곳은 같은 R4 실행 세션에서 watch-player로 바꿨고, 다시 내보낸 모든 파일의 nextflix 대소문자 무시 검색은 0건·HTML134 모두 새 이름으로 PASS다. 스타일 연결·타입·lint·빌드·내보내기·독립 리뷰를 같은 세션에서 재확인 중이며 브라우저 검사는 실행하지 않았다.
- 2026-10-05 Codex: 이름 표시 정정의 역치환 원본 일치·스타일 연결, 타입·lint·빌드·내보내기는 재확인 PASS, 독립 code-reviewer가 설치된 bts-reviewer 검토 절차를 읽어 approve/지적0으로 확인했다(해당 역할 이름 직접 호출은 지원되지 않아 절차를 적용한 읽기 전용 리뷰로 수행). 8090의 최신 HTML134·JS 옛 식별자0건·응답 바이트 일치도 PASS다. `logs/nextflix-R4-name-fix.final.txt`와 `logs/nextflix-R4-name-check.txt`에 증거가 있다. UI 재확인·최종 probe19·전수 링크/버튼·widths·axe는 사용자 브라우저 재개 답변 전까지 미완료이며, 다음은 TaskSpace14의 같은 공간 재개 후 그 검사다. R4c·커밋·4단계는 여전히 하지 않았다.
- 2026-10-05 Codex: 사용자가 ‘최종 화면 검사 까지 완료해’로 브라우저 재개와 R4 최종 검사 완료를 요청했다. takeOverTaskSpace(14)로 같은 공간 ownership=agent를 확인했고, R4 실행 세션을 `prompts/nextflix-R4-final-qa.txt`로 이어 UI 재확인·흐름·독립 감사와 필요 수정을 맡겼다. 부모는 최신 정적 산출물의 probe19와 전수 도구 검사를 시작한다. R4c·커밋·4단계 전에 사용자 화면 확인 지점에서 멈추는 규칙은 유지한다.
- 2026-10-05 Codex: 외부 probe를 실제 역할·정렬 선택지·SPA 방문 기록과 맞춰 보완해 19/19 PASS를 얻었다. 광고 후에도 속도 숨김/rate1, 광고형 제한, 클립 키·휠과 15초 안정 재생을 확인했다. 정상 Next route announcer의 role=alert는 재생 실패로 오인하지 않도록 실제 오류 문구와 구분했다. 반응형은 28종×14너비=392 PASS다.
- 2026-10-05 Codex: axe56쌍 중 시청 기록 중첩 main과 모바일 라이브 조작부/출처 겹침을 발견해 기존 main을 재사용하고 모바일 조작부만 위로 옮겼다. 132쪽/1271버튼 최초 site-check의 40445건은 브라우저의 루트 favicon 요청으로 좁혀 RootLayout에 basePath favicon 링크를 유지하게 고쳤다. 부모 최소수정3개는 별도 code-reviewer가 approve/max=none으로 검토했고, 재내보내기 뒤 axe4/4·favicon clean6/6 PASS다. 모든 최종 전수 검사와 독립 UI 재확인은 계속 진행 중이다.
- 2026-10-05 Codex: 최신 정적 결과의 site-check 전수 132쪽/1271버튼 STRICT PASS(콘솔·실패 요청·깨진 링크·dead0), axe56/56 PASS, 변경 화면 추가 너비70/70 PASS, probe19/19 PASS를 확보했다(`logs/nextflix-R4-final-*-v2.*`). 깨끗한 창 clean28종×2너비=56/56도 PASS다. 독립 UI 재검사에서 자막/컨트롤 겹침을 찾아 실제 영상 크기에 맞춰 자막 영역과 대비를 고쳤고, 자동 다음 회차 끄기가 무시되는 종료 처리도 기존 설정을 쓰게 고쳐 on/off 재검사했다. 현재 실행 세션은 최종 독립 UI·코드 리뷰와 최신 내보내기/증거 정리를 마무리 중이다.
- 2026-10-05 Codex: 추가 회원은 기본 요금제별 허용 자리0/1/2만 유지하도록 정했고, 현재 비밀번호도8자 이상을 검증한다. 자막 크기는14/16/20px이며 네이티브 VTT를 유지하고 영상/컨트롤 영역에 맞춰 cue를 배치한다. 화면 회전으로 활성 cue 위치가 갱신되지 않던 문제는 같은 track의 바뀐 cue만 remove/add해 고쳤다. 자동 다음 회차 설정은 카운트다운과 onEnded 양쪽에 적용한다. 클립 재진입은 같은 방문의 항목/스크롤 위치를 유지한다.
- 2026-10-05 Codex: **3단계 R4 구현·최종 검사 완료, 두 번째 중단 지점이다.** 독립 UI Audit17/20·접근성3/4·Design Health34/40, 관찰 범위 P0/P1 0건이며 최신 독립 코드 리뷰 approve/max=none이다. 게임/PIN/키즈/가입·보안·결제예시/추가회원·기기/이전·기록/자막·배속·광고/라이브/다운로드15·100 한도와 회전·재시도까지 실제 UI로 PASS를 얻었다. 타입·lint(기존경고1/정보1)·카탈로그·빌드·HTML134 내보내기·최신 Next 진단0건도 PASS다.
- 2026-10-05 Codex: 최신 정적 결과 외부 probe19/19, 전체132쪽/1271버튼 STRICT PASS, widths392+변경70+최종재생42 PASS, axe56+최종8 PASS, clean56+최종8 PASS, 이름 사본134HTML/모든산출물옛이름0 PASS다. 합산 증거는 샘플 `tasks/evidence/nextflix-R4/final-qa/PARENT-CHECKS.md`, 실제 UI/독립 리뷰는 `QA-REPORT.md`다. 개발 중 단발 React 오류2건과 외부 영상 지연은 로그에 보존했고 최종 새 방문 오류는0건으로 확인했다.
- 2026-10-05 Codex: 사용자 확인 주소는 `http://localhost:8090/bts-starter-kit/nextflix/profiles/`다. 지우 선택→홈/언어/AI→게임3/클립→계정의예시수단·기기·기록→요금제/자막·배속·광고·라이브→민호PIN1234/어린이 순서로 확인한다. [confirm]은 비워 뒀고 R4c·audit/close·커밋·push·릴리스·4단계 교재·R18은 아직 하지 않았다. 샘플 HEAD는9383e9f 그대로다. 다음 작업은 사용자 화면 확인 뒤 요청한 R4c다.

- 2026-10-05 Claude Code: 사용자가 R4 화면을 열어 본 뒤 "남은작업 순서대로 모두 진행해"로 R4 확인과 공개까지 맡겼다. 이어받아 R4c를 새 Claude Code 세션으로 돌렸다(audit 통과, 샘플 커밋 `c792ec9`, 남은 변경 0, push 없음).
- 2026-10-05 Claude Code: 4단계 교재 고치기를 마쳤다(첫 쪽, 4~10장, 그림 7장 다시 찍음). 어린이·PIN은 5장 본문으로, 시청 기록 숨기기는 10장 본문으로 옮기고 6~10장 프롬프트가 등급 상한을 지키게 했다. 독립 리뷰 Important 2(만든 기록의 확인 범위, 9장·10장 등급 상한 줄)와 Minor 8을 고쳤다. 링크·프롬프트 검사와 pack-check PASS. 팩 빈 곳 3개(요금제 저장 위치, 공개 예정 공개 방법, TOP 10이 10편보다 적을 때)는 Minor로 판정하고 팩은 고치지 않았다.
- 2026-10-05 Claude Code: 5단계 포트폴리오 R18을 마쳤다(tutorials:check 39쪽, 빌드·내보내기, axe·폭·링크·버튼 PASS, 허브 목록 간격만 고침). 이어서 6단계 공개(원래 계획 Task 17)를 진행한다. `.claude/settings.json`은 개인 플러그인 설정이라 커밋하지 않는다.
