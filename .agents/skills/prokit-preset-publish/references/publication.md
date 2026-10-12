# 반영 정본과 소비자

이 절차는 프로킷 관리 작업에만 적용한다. 실제 저장소의 AGENTS와 명령 구현이 정본이며 경로·옵션이 다르면 현재 코드와 사용자 지시를 확인한다. 새 게시 엔진이나 범용 앱 프리셋 컴포넌트를 만들지 않는다.

## 등록 전에 확인할 것

| 정본 | 쓰는 곳과 작업 |
|---|---|
| pro-kit-web `apps/web/src/data/samples.json` | 프리셋 레코드·presentation 표시값·groups와 iconKey·tagGroups·clones, 페이지·디자인·실제 검사 결과와 공개·보관 여부 |
| pro-kit-web `apps/web/src/lib/samples.ts`, `home-cards.ts` | JSON에서 파생하는 기존 export와 공통 카드 변환. 표시값을 별도 slug 맵으로 복제하지 않는다 |
| pro-kit-web `preset-preview-profiles.ts`, `preset-design.ts`, 공통 설정 부품 | 기존 의미 색상·서체 매핑. 공유 부품 변경이면 실제 소비자의 검사도 선택한다 |
| pro-kit `doc-values.json` | 프리셋 사실·공개 상태·예상치와 일부 관측. 값은 `scripts/doc-values.mjs`로 공급한다 |
| pro-kit `tutorials/packs.json` | 팩 릴리스·주소·SHA-256·bytes·공개 여부. 프리미엄 저장소 구분은 기존 규칙을 따른다 |
| pro-kit `tutorials/samples/<이름>.md`, 목록 README | 원본 문서·이미지·만들기 안내. 클론은 기존 튜토리얼 과정의 README와 COURSES 슬롯을 사용한다 |
| pro-kit-samples `packs/<이름>` | 실제 디자인·번역·폰트 라이선스·생성물·맞춤 안내·검증한 재현 소스 |
| pro-kit-samples `tools/publish.sh`, `publish-root.sh` | 보호된 내보내기와 공유 미리보기. 전역 slug 목록은 기존 프로필에서 읽는다 |

여러 정본을 하나의 과도한 범용 데이터 모델로 합치지 않는다. 서로 다른 책임은 유지하고 `presets:check`로 등록 누락과 공개 상태 불일치를 검사한다. 일반 프리셋과 클론 교재의 경로·대표 그림을 같은 고정 규칙으로 강제하지 않는다.

## 카탈로그 추가·수정·보관·복구

pro-kit-web의 `pnpm presets:catalog --help`와 `scripts/preset-catalog.mjs`를 먼저 확인한다. 이 명령은 일반 프리셋 레코드를 관리한다. 그룹·태그 사전과 클론 설정은 같은 JSON에 있지만 현재 CLI의 편집 대상은 아니다.

| 요청 | 명령과 입력 |
|---|---|
| 현재값 확인 | `pnpm presets:catalog show --slug <이름>` |
| 신규 등록·레코드 전체 교체 | `pnpm presets:catalog upsert --file <레코드.json>` |
| 카테고리·제목·설명·표시값 수정 | `pnpm presets:catalog update --slug <이름> --file <수정.json>` |
| 목록에서 내리기·복구 | `pnpm presets:catalog archive --slug <이름>`, `pnpm presets:catalog restore --slug <이름>` |

변경 명령의 기본값은 저장하지 않는 미리 보기다. 결과와 입력을 검토한 뒤 같은 명령에 `--write`를 붙이면 검증한 JSON을 원자적으로 저장한다. 새 레코드는 `published:false`로 등록하며, 기존 레코드의 `published`는 이 명령으로 바꾸지 않는다.

`update`는 `group`, `name`, `field`, `headline`, `purpose`, `presentation`만 받는다. `presentation`의 `tags`, `cardImage`, `badge`, `styleNote`, `purposeText`, `dark`와 `badge` 안의 일부 값은 기존 값에 병합한다. 카테고리·태그는 등록된 사전에서 고르고, 필수 이름·설명은 비우지 않는다. `headline`이 없는 기존 프리셋은 null을 유지할 수 있다. 새 사전 값을 더하면 공통 필터·아이콘 대응·관련 검사를 함께 확인한다.

`archive`는 `archived:true`로 개발·운영 카탈로그와 교재 노출에서 제외한다. 공개 여부·팩·자산·원본은 남기고 `restore`는 보관 표시만 해제한다. 원격에 이미 올라간 정적 파일을 지우거나 기존 링크를 차단하는 명령은 아니다. 물리 삭제나 외부 게시 요청은 해당 소유자와 별도 범위로 처리한다.

카테고리는 사용자 지정값을 우선한다. 제품 안의 일부 강의·상점 기능만 보고 사이트 전체를 다른 분류로 바꾸지 않는다. 기존 레코드는 `show`로 읽은 뒤 요청한 필드만 `update`하고 slug·페이지·검증 수치·공개 상태를 보존한다. 카탈로그의 이름 변경을 제품 브랜드 교체로 확대하지 않는다. 같은 뜻으로 이름·설명을 인용하는 교재나 공통 값에 영향이 있으면 변경 사실을 prokit-docs에 인계하고, 의미가 다른 문구를 자동으로 덮어쓰지 않는다.

편집·보관 요청만이면 원본 재조사·이미지 재생성·제품 구현·팩 재조립을 자동으로 시작하지 않는다. 변경 필드와 공통 소비자를 검사한다. 실제 저장을 검증할 때에는 저장 전후 값과 화면 반영을 대조하고, 임시 시험값을 사용했으면 다른 수정이 없는지 확인해 원래 값으로 복구한다. 파일 저장만 확인한 시험은 브라우저 반영·DB 저장·외부 게시 통과로 보고하지 않는다.

편집 뒤 공통 `samples.ts` export → `home-cards.ts` → `HomeCard`·`work/[slug]`·미리보기·교재 소비자를 대조한다. 신규 프리셋 때문에 카드나 상세 페이지를 복제하지 않는다. `validatePresetCatalog`와 `changePresetCatalog`는 직렬화 가능한 레코드의 검증·변경 함수이며, 향후 DB 저장 계층에서도 재사용할 경계다. 현재 저장소는 JSON이며 DB 저장 API·관리 화면·권한·동시 편집 처리를 제공하지 않는다.

카탈로그 저장만으로 등록은 끝나지 않는다. CSS 미리보기 프로필, pro-kit의 공통 값·팩 목록·교재와 모든 페이지의 실제 스크린샷을 각 정본에서 준비하고 아래 로컬 반영 검사를 수행한다. 인수 시 카테고리 이동과 태그 필터, 제목·설명의 카드·상세 반영, 보관·복구의 목록·직접 주소·교재 노출, 준비본의 운영 제외를 확인한다. dry-run 무변경, 잘못된 입력 거부, 다른 레코드 보존은 격리 fixture로 검사한다.

## 로컬 반영

1. 신규 프로젝트 초기 구성과 실제 제작은 prokit-preset-create가 조율하며 원본 대비 검수는 prokit-preset-verify가 맡는다. 기존 다른 프리셋이나 사용자 제품에 H 이행을 덧붙이지 않는다.
2. 모든 사이트맵 페이지·링크·버튼·폼·이미지와 설정 지원을 실제 검사한 결과를 회수한다. 기능 성공만으로 레퍼런스 충실도를 수용하지 않는다. 실사 이미지가 필요한 자리를 도형이나 빈칸으로 바꾸지 말고, 생성 스킬이 만든 파일·프롬프트·모델·해시·배치 결과를 확인한다. 기존에 수용한 생성물은 다시 만들지 않는다.
3. 카탈로그 사실과 팩을 실제 결과에 맞춘다. 생성물 총수와 이번 생성·재사용 수를 구분한다. 검증하지 않은 기능·점수·시간·토큰은 선언하지 않는다. 공개 메타데이터와 팩에서 비밀값·로컬 절대 경로를 제거하며 필요한 원시 증거는 공개 산출물 밖에 보존한다.
4. 공통 카드를 재사용하고 실제 화면을 데스크톱·태블릿·모바일과 전체 화면용으로 촬영한다. 다른 너비의 스크린샷을 잘라서 실제 촬영으로 표시하지 않는다. 기존 `cardImage`, `shot`, `fullShot` 경로와 WebP 방식을 따른다.
5. 보호된 프로젝트 `export:html --base /pro-kit/<이름>`으로 내보낸다. 원본 dev 명령·서버를 유지하고 설치 환경·venv·캐시·비밀 파일을 임시 내보내기로 복사하지 않는다. 환경 지문과 guard는 기존 도구를 쓴다.
6. pro-kit-web의 `preset-preview:prepare`를 명시한 로컬 정적 root와 slug에 실행해 기존 공유 수신기를 연결한다. 이것은 공식 프리셋 게시본에만 적용하고 일반 HTML 내보내기에는 추가하지 않는다.
7. `pnpm presets:check --slug <이름> --static-root <출력 root> --zip <로컬 팩>`으로 등록·정적 표식·팩 해시와 크기를 확인한다. 이 CLI는 제품 QA를 실행하지 않으며 출력물의 모든 동작을 검증하지 않는다. ZIP은 기존 `pack.mjs --zip`과 팩 검사 도구로 재현 자료도 대조한다.
8. 원본 문서는 pro-kit에서 고치고 공통 값을 채운다. web에서 `tutorials:sync`·`handbook:sync`·관련 문서 검사로 사본을 반영한다. 새 문서 페이지의 마크다운·AI 메뉴·도식 내려받기는 기존 문서 틀과 검사를 쓴다.

## 외부 게시

외부 게시가 허가되었는지 현재 요청과 배포 보류부터 확인한다. 준비 완료가 게시 허가는 아니다. 실제 공개 팩·정적 프리셋·웹 카탈로그·문서·스크린샷이 같은 결과물을 가리키게 하고, 공개 상태는 실제 원격 결과와 맞춘다.

보관한 프리셋은 개발·운영 모두에서 숨긴다. 운영 빌드의 카드·상세·교재 경로는 `published:false`도 제외하고 로컬 개발에서만 보관하지 않은 준비본을 표시한다. 외부 게시 전 `pnpm presets:check --public --static-root <게시 root>`로 준비본·보관본 정적 폴더가 섞였는지 확인한다. 있으면 삭제하지 말고 게시를 차단하고 현재 사용자 요청과 해당 산출물 소유권부터 확인한다. `publish-root.sh`도 같은 검사를 내보내기 전에 수행한다.

팩 릴리스는 pro-kit AGENTS의 팩 절차, Vercel과 릴리스는 pro-kit-web의 `prokit-deploy`, Pages는 기존 gh-pages 절차에 맡긴다. 기존 `dirty` 상태이거나 옛 `origin`을 가리키는 Pages 체크아웃 전체를 커밋하거나 다른 변경을 포함하지 않는다. 릴리스·push로 자동 배포될 수 있는 Git 연결도 해당 배포 스킬이 확인한다.

실제 공개 프리셋에는 원격 다운로드가 동작하는 팩과 교재 흐름이 필요하다. 전체 제작 시간·토큰·비용이 unknown인 것은 별도 측정 상태로 설명하고 다른 프리셋의 수치로 메우지 않는다. 기존 실측·예상 집계에서 미측정 프리셋은 제외하되 공개 사실 자체와 혼동하지 않는다.

README 대표 예시 수를 늘리지 않는다. 프로킷 웹·튜토리얼 목록·gh-pages 표·팩 저장소 목록 중 적용 대상만 갱신한다. 모든 외부 작업은 실제 로그와 결과를 회수하며 원격 확인이 불가능하면 `미검증`으로 남긴다.

## 기존 제작·게시 정본에서 이동한 운영 절차

아래는 pro-kit AGENTS의 제작 전용 절차를 이 책임 영역으로 이동한 것이다. 코드와 주소 값은 해당 저장소 정본을 따르며 외부 발행은 현재 사용자 권한 확인 뒤에만 수행한다.

- 프리셋(프로킷 사이트와 README 대표 예시)은 첫 화면 하나가 아니라 사이트맵의 모든 페이지를 갖춘 사이트로 만든다. 링크와 버튼이 모두 동작하고 404나 "준비 중"이 없어야 한다(`prokit-ui` "사이트맵과 상호작용"). 제작 표시(`<ProkitCredit />`: 프로킷 심볼, 홈페이지·GitHub 링크)는 선택 사항이다. 사용자가 원하는 표시 여부를 따르고 미표시를 내보내기 실패 사유로 삼지 않는다(`prokit-ui` "규칙"). 프로킷 홈페이지나 GitHub 주소가 바뀌면 `node scripts/site-links.mjs set <home|pages|repo|packs> <새 주소>`로 바꾼다. 주소의 정본은 루트 `site-links.json`이고, 이 명령이 문서와 <!-- v:templates.count.ko -->두<!-- /v --> 템플릿의 `PROKIT_LINKS`(`files/apps/web/src/components/prokit-credit.tsx`, 공통 파일)까지 한 번에 바꾼다. 스크립트를 고치면 `node --test scripts/site-links.test.mjs`를 실행한다. 이어서 그 `prokit-credit.tsx`를 프리셋 작업공간(`../pro-kit-samples/ws/<프리셋>`. `portfolio`는 빼고), 튜토리얼 작업공간(`../pro-kit-samples/tutorials/<과정>`)에 그대로 복사한 뒤 다시 내보낸다. 홈페이지는 비공개 저장소 `roadkwon-ai/pro-kit-web`(로컬 `../pro-kit-web`)이 원본이고 Vercel에 배포한다. 홈페이지는 이 부품 대신 자체 바닥글을 쓰므로 복사하지 않고, 주소 상수만 `../pro-kit-web/apps/web/src/lib/site.ts`에서 고친다(`pnpm tutorials:check`가 `site-links.json`과 같은지 본다). 이미 받은 독자 프로젝트는 "템플릿 변경 반영" 절차로 같은 파일을 받는다. 같은 계정 안에서 경로가 바뀔 때만 옛 경로에 새 주소로 보내는 안내 페이지를 남긴다(옛 계정의 Pages는 저장소와 함께 지운다). 정적 HTML은 `main`에 넣지 않고 `gh-pages` 브랜치의 `<이름>/`에 둔다. GitHub Pages가 `https://roadkwon-ai.github.io/pro-kit/<이름>/`로 올린다. 프리셋을 다시 만들면 `basePath: "/pro-kit/<이름>"`로 내보내 그 브랜치에 push하고, 그 브랜치 `README.md` 표를 함께 바꾼다. README에는 대표 예시 4개만 두고 새 프리셋은 README에 더하지 않는다. 새 프리셋은 프로킷 사이트, `tutorials/samples/README.md` 목록(클론은 `tutorials/README.md`), `gh-pages` 브랜치 README 표에 더한다(README 카드는 `scripts/doc-values.test.mjs`가 지킨다). 대표 예시를 다시 만들면 `docs/assets/` 이미지도 바꾼다. 브랜치 루트는 홈페이지 사본이다. `../pro-kit-web`에서 `pnpm pages:export`(basePath `/pro-kit`)로 내보내 두고, 사용자가 내리라고 할 때까지 유지한다(옛 모아 보기 작업공간 `../pro-kit-samples/ws/portfolio`는 얼렸다). 프리셋 화면이 바뀌면 `../pro-kit-web`에서 프리셋 데이터와 스크린샷을 갱신해 Vercel과 그 사본에 함께 올린다. 만든 프로젝트와 내보내기 스크립트는 저장소에 넣지 않는다. 프리셋 작업공간은 며칠에 걸쳐 쓰므로 재부팅 때 지워지는 `/tmp`(scratchpad)가 아니라 저장소 밖의 영구 폴더(예: `../pro-kit-samples`)에 둔다.

- 튜토리얼 프리셋 팩은 이 저장소에 넣지 않고 팩마다 zip 하나로 별도 공개 저장소 `roadkwon-ai/pro-kit-packs`(로컬 `../pro-kit-packs`)의 릴리스에 올린다. 프리미엄 팩(pro-kit-web `samples.json`의 프리셋/클론 `presentation.badge.premium: true`로 분류)은 따로 공개 저장소 `roadkwon-ai/pro-kit-premium-packs`(로컬 `../pro-kit-premium-packs`)에 올린다(사용자 결정 2026-10-09). 아래 명령의 `--repo`와 팩 목록 표는 그 팩이 든 저장소의 것을 쓴다. 문서의 팩 링크는 값 `pack.<이름>.release`(packs.json 주소에서 만든다)로 쓴다. 팩이 늘어도 사용자는 필요한 팩만 받는다. 저장소에는 목록 `tutorials/packs.json`(릴리스, 주소, sha256, 크기)만 두고, 받기는 `node scripts/pack.mjs <이름>`(`packs/<이름>/`에 푼다. `packs/`는 git에 넣지 않는다)이다. 팩마다 릴리스는 최신판 하나만 두고 이름을 바꾸지 않는다. 태그는 `pack-<이름>`(예: `pack-nextflix`), 첨부는 팩 폴더 전체(글, `data/`, `images/`, `shots/`, `style-ref/`)를 묶은 `<이름>-pack.zip` 하나다. 팩 원본은 프리셋 작업공간 `../pro-kit-samples/packs/<이름>/`에 두고 `../pro-kit-samples/tools/pack-zip.mjs`로 묶는다. `gh release create pack-<이름> <zip> --repo roadkwon-ai/pro-kit-packs --target main --title "<이름> 프리셋 팩" --notes "<무엇이 들었나>"`로 올리고, 노트 파일과 `chore(release)` 커밋은 만들지 않는다. 팩을 더하거나 크기가 바뀌면 팩 저장소 `README.md`의 팩 목록 표도 맞춘다. 올린 뒤 `node scripts/pack.mjs <이름>`으로 받아 원본과 같은지 확인한다. 팩을 바꾸면(글 한 줄이라도) 먼저 `gh release delete pack-<이름> --repo roadkwon-ai/pro-kit-packs --cleanup-tag -y`로 옛 릴리스와 태그를 지우고 같은 이름으로 다시 올린 뒤, `tutorials/packs.json`의 `sha256`과 `bytes`를 바꿔 `main`에 반영한다. 다시 올린 때부터 `main`에 반영할 때까지는 옛 목록으로 받으면 sha256이 달라 받기가 멈추므로, 둘 사이를 짧게 둔다. 번호를 붙인 판(`pack-<이름>-<판>`)은 만들지 않는다. 팩 목록과 공개 상태는 현재 `tutorials/packs.json`을 기준으로 확인한다. 옛 목록을 가진 사본은 새 저장소의 목록으로 갱신한 뒤 받는다. `scripts/pack.mjs`를 고치면 `node --test scripts/pack.test.mjs`를 실행한다.
