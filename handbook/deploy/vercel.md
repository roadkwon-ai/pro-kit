# Vercel 배포와 되돌리기

> 한눈에: 서비스 프로젝트는 내 컴퓨터의 Vercel CLI로 확인용(develop)과 운영(production)에 배포해요. 배포 전에 검사를 통과해야 하고, 새 DB 변경이 있으면 DB에 먼저 적용해요. 보고에는 이전 배포로 되돌리는 명령도 들어 있어요.

처음 올린다면 [처음 배포하기](first-deploy.md)를 먼저 보세요. 이 쪽의 낯선 말(Preview, alias, pooler, expand → contract)은 맨 아래 "용어 풀이"에 있어요.

## 두 가지 배포

| 대상 | Vercel 환경 | DB | 명령 |
|---|---|---|---|
| develop | Preview + 고정 주소(alias) | 병합 전 확인용 원격 DB (neon `develop` 브랜치, supabase 스테이징 프로젝트) | `pnpm vercel:deploy develop` |
| production | Production | 운영 DB | `pnpm release` 뒤 `pnpm vercel:deploy production` (기본 브랜치의 릴리스한 커밋만) |

> [!IMPORTANT]
> production은 기본 브랜치에서 `pnpm release`로 릴리스한 커밋만 배포해요. 릴리스하지 않은 커밋은 스크립트가 막아요.

프로젝트에서 연 세션에 "develop에 배포해줘", "운영에 배포해줘"처럼 요청하면 `prokit-deploy` 스킬이 준비 확인부터 배포 뒤 확인까지 해요. 배포는 사용자가 요청했을 때, 그리고 기능 라운드를 마치고 사용자가 "릴리스하고 production 배포"를 골랐을 때만 해요.

[기존 프로젝트에 들였다면](../start/adopt.md) 라운드를 마칠 때 이 선택을 묻지 않고 커밋까지만 하는 경우가 있어요. 하네스만 설치해 `vercel:deploy` 스크립트가 없는 `--adopt` 프로젝트, 그리고 배포 방법을 아직 프로킷에 맞추지 않은 운영 중 프로젝트예요.

```mermaid
flowchart LR
  R["production만: pnpm release<br/>버전 · release/ 노트 검수<br/>--publish: 태그 · push · GitHub Release"] --> C
  C["--check<br/>CLI · 연결 · 커밋 · 환경변수 · 릴리스 검사<br/>지난 배포 이후 새 마이그레이션"] --> M{"새 마이그레이션"}
  M -->|있음| DB["대상 DB에 먼저 적용<br/>운영은 사용자 동의 뒤"]
  M -->|없음| D["pnpm vercel:deploy 대상"]
  DB --> D
  D --> V["고정 주소에서 확인<br/>/api/auth/get-session 200"]
  V --> RPT["보고<br/>배포 URL · DB 적용 결과<br/>되돌리기 명령"]
```

## 배포 순서

1. **검사**: `pnpm vercel:deploy <대상> --check`로 준비 상태와 지난 배포 이후 새 마이그레이션을 봐요. 커밋하지 않은 변경, 빠진 환경변수, production의 기본 브랜치와 릴리스, Vercel Git 자동 배포를 검사해서 하나라도 걸리면 배포하지 않아요.
2. **DB 먼저**: 새 마이그레이션이 있으면(첫 배포처럼 지난 배포 기록이 없으면 전체) 배포 전에 대상 DB에 적용해요. develop DB에는 바로 적용하고, 운영 DB는 적용할 목록을 보여 주고 동의를 받은 뒤 적용해요.
3. **배포**: `pnpm vercel:deploy <대상>`.
4. **확인**: 고정 주소에서 `/api/auth/get-session`이 200인지 봐요. 운영 데이터를 만드는 확인(가입, 글쓰기)은 하지 않아요.
5. **보고**: 배포 URL, 릴리스(production만), DB 적용 결과, 확인 결과, 되돌리기 명령을 알려 줘요.

> [!WARNING]
> DB는 배포보다 먼저 적용해요. 새 코드가 새 컬럼을 쓰므로 순서가 바뀌면 배포 직후 오류가 나요. 컬럼이나 테이블을 지우는 변경만은 새 코드를 먼저 배포하고 그다음 적용해요.

**이렇게 되면 성공**

- 고정 주소에서 `/api/auth/get-session`이 200이에요.
- 보고에 배포 URL, DB 적용 결과, 되돌리기 명령이 있어요.

## 되돌리기

| 대상 | 명령 |
|---|---|
| production | 스크립트가 출력한 `vercel rollback <이전 배포 URL>`. Hobby 요금제는 직전 production 배포로만 되돌릴 수 있어요 |
| develop | `vercel alias set <이전 배포 URL> <고정 주소>` |

- 되돌린 뒤에는 새 production 배포가 운영 주소에 자동으로 연결되지 않아요. 고친 배포는 `vercel promote <배포 URL>`로 운영 주소에 올려요.
- production을 되돌린 뒤 고친 코드는 새 patch 릴리스로 배포해요.
- 데이터를 잃을 수 있는 DB 변경은 두 번(expand → contract)에 나눠 해요. 그래야 앱만 되돌려도 서비스가 동작해요.
- 되돌리기도 배포라서 사용자가 요청할 때만 해요.

> [!WARNING]
> production을 되돌려도 릴리스(태그, 노트, GitHub Release)는 지우지 않아요. DB 마이그레이션도 되돌리지 않아요.

## 자세히

### 처음 한 번 준비

Vercel 계정, 원격 DB, GitHub 저장소가 필요해요. "Vercel 배포 준비해줘"라고 하면 에이전트가 순서를 안내해요. 사용자가 직접 할 일은 Vercel CLI 설치와 `vercel login`, `gh auth login`, GitHub 원격 저장소 만들기예요. 연결 명령과 환경변수(`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`)를 값이 출력되지 않게 넣는 법은 템플릿 README의 "Vercel 배포"([neon](../../templates/prokit-next-neon/README.md#vercel-배포) · [supabase](../../templates/prokit-next-supabase/README.md#vercel-배포))에 있어요.

인증이 실패해도 에이전트는 바로 다시 로그인하라고 하지 않아요. 먼저 이 프로젝트와 사용자가 믿고 쓰는 키 설정을 어디서, 어떤 순서로 불러오는지 확인해요. 이 일은 `prokit-deploy`가 `scripts/load-keys.mjs`와 공식 `vercel-cli-with-tokens` 스킬로 해요.

키가 있는지, 지금 세션의 키와 다른지만 보고 값은 출력하지 않아요. 키를 불러온 뒤에도 실제 권한 확인을 통과해야 배포해요.

- Vercel은 프로젝트의 첫 배포를 production으로 만들어서 production부터 배포해요. 스크립트는 production 배포가 없으면 develop을 막아요.
- `vercel link`가 GitHub 저장소까지 연결하면 기본 브랜치에 push하는 순간 production에 배포돼서 릴리스 검사를 거치지 않아요. 그래서 새 Vercel 프로젝트를 만들며 저장소가 연결됐으면 연결을 끊어요(`vercel git disconnect --yes`). push마다 자동 배포하는 방식은 사용자가 요청할 때만 쓰고, 결정은 `docs/adr/`에 남겨요.

### develop 주소로 보기

Better Auth는 `BETTER_AUTH_URL`만 기준으로 삼아서 배포마다 생기는 고유 URL에서는 로그인이 실패해요. develop은 고정 주소로 열어요. Preview에는 Vercel 배포 보호가 걸려 있어서 Vercel에 로그인한 브라우저로 보거나 `vercel curl https://<고정 주소>/…`로 확인해요.

### 쓰지 않는 도구

로그인 없이 `.env`까지 외부에 올리는 `vercel-deploy-claimable`, 커밋과 push까지 하는 gstack(두뇌)의 `ship`과 `land-and-deploy`, Vercel 플러그인의 `/vercel:deploy`는 이 프로젝트에서 쓰지 않아요.

### 용어 풀이

| 말 | 뜻 |
|---|---|
| Preview | Vercel이 production이 아닌 배포에 붙이는 이름이에요. develop 배포가 여기에 해당해요 |
| 고정 주소(alias) | 배포마다 바뀌는 임시 주소 대신 늘 같은 이름으로 열리는 주소예요 |
| 풀러(pooler) 주소 | 서버리스 앱이 DB에 많이 연결해도 견디게 중간에서 연결을 모아 주는 DB 주소예요. 배포 환경의 `DATABASE_URL`에는 이 주소를 써요 |
| expand → contract | 데이터를 잃을 수 있는 DB 변경(컬럼 이름 바꾸기, 지우기)을 두 번에 나눠 하는 방법이에요. 먼저 새 컬럼을 더해(expand) 옛 코드와 새 코드가 모두 돌게 하고, 새 코드만 남은 뒤 옛 컬럼을 지워요(contract) |
| rollback, promote | 이전 배포로 되돌리기(rollback), 특정 배포를 운영 주소에 올리기(promote)예요 |

### 화면만 프로젝트는 다른 길

화면만 프로젝트는 이 절차를 쓰지 않고 `pnpm export:html`로 만든 정적 HTML을 올려요([GitHub Pages 배포](github-pages.md)).

## 관련 문서

- [버전과 릴리스](release.md)
- [비밀값 지키기](secrets.md)
- [dev-cycle 라운드](../concepts/dev-cycle.md)
- [비용과 키](../../tutorials/reference/costs-and-keys.md#배포-비용)
