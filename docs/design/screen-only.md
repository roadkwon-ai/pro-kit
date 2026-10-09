# 화면만 프로젝트와 HTML 내보내기
https://prokit-web.vercel.app/docs/design/screen-only/

> 한눈에: 화면만 프로젝트는 DB 없이 예시 데이터로 모든 화면을 만드는 프로젝트예요. 버튼과 링크는 실제로 반응하고, 다 만들면 HTML 파일로 내보내거나 GitHub Pages나 Vercel에 올릴 수 있어요. 실제 서비스로는 나중에 바꿔도 돼요.

## 무엇이 다른가요

| | 화면만 프로젝트 | 서비스 프로젝트 |
|---|---|---|
| 만들 때 | 로컬 DB와 첫 마이그레이션 없이 만들어요. 템플릿은 `prokit-next-neon`이에요 | 로컬 DB를 띄우고 첫 마이그레이션까지 해요 |
| 표시 | 루트 `AGENTS.md` 맨 위에 "화면만 프로젝트" 한 줄 | 없음 |
| 데이터 | 예시 데이터(`apps/web/src/lib/`의 `demo.ts` 등) | DB |
| 작업 방식 | dev-cycle 라운드(대개 케이스 B). `prokit-ui`의 단계와 규칙을 모두 따라요 | dev-cycle 라운드(케이스 A\~F·H) |
| 결과물 | `pnpm export:html`로 정적 HTML | Vercel 배포 |

새 프로젝트 `AGENTS.md` 맨 위에 들어가는 한 줄이에요.

```markdown
> 화면만 프로젝트: DB 없이 예시 데이터로 화면만 만든다. 규칙은 `prokit-ui`의 "화면만 프로젝트" 절이다.
```

작업 폴더에서 시작한 프로젝트는 `docs/first-request.md`의 요청으로 첫 라운드를 열어요([빠른 시작: 화면만 만들기](https://prokit-web.vercel.app/docs/start/quickstart-screens/)).

## 화면 규칙

- **예시 데이터로 채워요**: 로그인이 필요한 화면은 예시 사용자로 로그인한 상태로 보여 주고, 로그인·가입 화면은 제출하면 예시 사용자로 들어가는 예시 화면으로 만들어요.
- **버튼이 실제로 반응해요**: 체크, 상태 바꾸기, 추가 같은 동작은 화면 상태나 브라우저 저장소(`localStorage`)로 흉내 내요.
- **서버를 부르는 부품은 빼요**: 헤더의 사용자 메뉴와 `/dashboard` 링크, 로그인·가입 폼의 `authClient`, `orpc` 호출은 화면에 쓰지 않아요. 첫 화면을 만들 때 BTS 기본 헤더와 로그인 화면을 제품 화면으로 바꿔요.
- **인증 파일은 그대로 둬요**: `auth-client.ts`, `packages/auth/` 같은 인증 경로 파일은 고치지 않아요. 실제 서비스로 바꿀 때 그대로 써요.
- **HTML로 내보낼 수 있게 지어요**: 동적 경로는 `generateStaticParams`로 값을 모두 내고, 쿼리 값은 클라이언트 컴포넌트에서 읽어요. `headers`, `cookies`, `redirect`, route handler, server action은 쓰지 않아요. 이미지는 `apps/web/public/` 아래에 두고 `next/image`로 불러요.
- **제작 표시는 선택 사항이에요**: 출처를 알리고 싶으면 사이트 푸터에 `<ProkitCredit />`를 넣어요. 프로킷 심볼과 홈페이지·GitHub 링크를 제공하며 템플릿이 `apps/web/src/components/prokit-credit.tsx`를 설치해 둬요. 표시 여부·문구·배치를 조정할 수 있어요. MIT의 저작권·허가문 보존 조건은 이 홍보 표시와 별개예요.
- **마감 전 확인은 두 번**: 개발 서버와 `pnpm export:html` 결과 양쪽에서 모든 링크와 버튼을 눌러 봐요. 개발 서버에서는 `/dashboard`와 `/api`가 살아 있어 남은 BTS 부품이 드러나지 않기 때문이에요.

## HTML로 내보내기

"HTML로 내보내줘"라고 하면 `pnpm export:html`을 실행해요. 프로젝트 파일은 바꾸지 않고, 임시 복사본에서 `/api`와 `/dashboard`를 빼고 빌드해 결과를 `html/`(git이 무시해요)에 둬요.

```bash
pnpm export:html                 # html/에 정적 HTML을 만든다
pnpm dlx serve html              # 만든 HTML을 브라우저로 본다
pnpm export:html --base /living  # GitHub Pages처럼 하위 경로에 올릴 때
```

| 결과 | 뜻 |
|---|---|
| exit 0 | 내보내기 성공 |
| exit 1 | 사용법 오류나 설치·빌드 실패. 빌드 실패면 출력 끝을 보고 화면 규칙을 어긴 곳을 고쳐요 |
| exit 2 | `.env`의 서버 전용 값이 결과물에 들어갔어요. 출력에 나온 변수를 화면 코드에서 쓰지 않게 고쳐요. 값은 출력되지 않아요 |

"지운 서버 경로를 부르는 부품이 화면에 남아 있다" 경고가 나오면 화면 규칙대로 그 부품을 빼요.

## 자세히

### 배포

배포는 "GitHub Pages에 배포해줘", "Vercel에 배포해줘"처럼 요청할 때만 해요. 화면 라운드가 닫힌 뒤(`[confirm]` 뒤) 메인 세션에서 하고, 원격 저장소나 Vercel 프로젝트를 만드는 것까지 요청한 것으로 봐요. 풀스택 배포(`pnpm vercel:deploy`)는 쓰지 않아요. 순서는 [GitHub Pages 배포](https://prokit-web.vercel.app/docs/deploy/github-pages/)에 있어요.

### 실제 서비스로 바꾸기

"실제 서비스로 바꿀 거야"라고 하면 이 순서로 해요.

1. 컨테이너 엔진(Podman 또는 Docker)이 있는지 봐요. 없으면 설치를 안내하고 멈춰요.
2. `prokit-db`를 따라 로컬 DB를 띄우고, 인증 테이블의 첫 마이그레이션을 만들어 적용해요.
3. 루트 `AGENTS.md` 맨 위의 "화면만 프로젝트" 표시를 지워요.
4. 기본 브랜치에 커밋해요. 첫 마이그레이션이 다음 라운드 diff에 섞이면 audit이 더 무거운 케이스를 요구해요.
5. 로그인, 저장 같은 기능과 예시 데이터를 DB에서 읽게 바꾸는 일은 dev-cycle 라운드로 해요.

## 관련 문서

- [빠른 시작: 화면만 만들기](https://prokit-web.vercel.app/docs/start/quickstart-screens/)
- [UI/UX 흐름](https://prokit-web.vercel.app/docs/design/ui-flow/)
- [GitHub Pages 배포](https://prokit-web.vercel.app/docs/deploy/github-pages/)
- [튜토리얼: 컨셉으로 화면 만들기](https://prokit-web.vercel.app/tutorials/samples/)
