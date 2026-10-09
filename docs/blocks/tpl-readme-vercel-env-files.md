<!-- 두 템플릿 README "Vercel 배포" 절의 .env.development·.env.production 금지 문단과 "처음 한 번" 명령 코드 블록 -->
배포 값을 `.env.development`나 `.env.production`에 두지 않는다. 이 파일은 `.vercelignore`에 걸려 배포에 올라가지 않는다. 또 varlock은 이 파일을 `NODE_ENV`로 고르는데 Vercel은 Preview도 `NODE_ENV=production`으로 빌드하므로, 파일로는 develop과 production을 나눌 수 없다. 결국 쓰이지 않는 비밀값 사본이 되고, 에이전트가 읽으면 값이 대화 기록에 남는다. 설치기는 루트와 `packages/*`의 `.env.*`도 git이 무시하게 한다(`.env.schema`는 커밋한다).

처음 한 번(프로젝트 루트에서):
```bash
vercel login                                           # 사용자가 직접
vercel link --yes --project <이름> --scope <팀>        # Vercel 프로젝트가 없으면 만든다
git diff .gitignore                                    # link가 더한 `+.env*` 한 줄만 보이면 다음 줄을 실행한다
git checkout -- .gitignore && rm -f .env.local         # link 전에 루트 .env.local이 없었을 때만 지운다(VERCEL_OIDC_TOKEN)
vercel git disconnect --yes                            # link 출력에 "Connecting GitHub repository"가 있었을 때만(push가 곧 production 배포가 되지 않게)
vercel project update <이름> --root-directory apps/web --framework nextjs --yes
```
