<!-- 두 템플릿 README "Vercel 배포" 절 끝의 주의 목록 셋(.vercelignore, Better Auth 주소, 전역 배포 스킬) -->
- `vercel deploy`는 `.gitignore`를 따르지 않고 작업 트리를 그대로 올린다. 설치기가 넣은 `.vercelignore`가 `apps/web/.env`, `.neon`(Neon 연결 정보), `.codex`(로컬 경로가 든 OMX 설정), `supabase/.temp`(Supabase CLI 연결 정보), `*.pem`, `*.local`, `*.local.*`(`settings.local.json` 등)을 뺀다. 지우지 않는다.
- Better Auth는 `BETTER_AUTH_URL`만 신뢰하므로 배포마다 생기는 고유 URL에서는 로그인이 실패한다. develop은 고정 주소로 연다. Preview에는 Vercel 배포 보호가 걸려 있으므로 Vercel에 로그인한 브라우저로 보거나 `vercel curl https://<고정 주소>/…`로 확인한다.
- 전역에 `vercel-deploy-claimable` 스킬이 있으면 이 프로젝트에서 쓰지 않는다. 로그인 없이 `.env`까지 외부 서비스에 올린다. Vercel 플러그인의 `/vercel:deploy`와 gstack `ship`·`land-and-deploy`도 쓰지 않는다(`prokit-deploy`의 "공식 도구를 그대로 쓰지 않는 이유").
