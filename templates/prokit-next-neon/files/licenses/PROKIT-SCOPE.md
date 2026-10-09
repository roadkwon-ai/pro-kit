# 프로킷 적용 파일과 외부 구성 요소

프로킷 자체 코드·스킬·문서의 MIT 사본은 [PROKIT-LICENSE.txt](PROKIT-LICENSE.txt)다. 이 안내는 프로킷 템플릿에서 전달한 파일을 구분하기 위한 것이다. 생성 앱 전체의 라이선스를 정하거나 사용자 작성 코드의 권리를 프로킷에 이전하지 않는다.

## 템플릿에서 전달한 파일

아래 경로 중 프로킷이 제공한 원본 부분은 MIT다. 수정·결합하여 재배포할 때에는 원본 부분의 저작권 표시·허가문을 유지한다. 사용자 독자 작성분이나 수정분 전체의 라이선스를 MIT로 강제하지 않는다. 파일 안의 제3자 원본·인용 부분은 원래 조건을 따른다.

- `.agents/skills/prokit-api/SKILL.md`
- `.agents/skills/prokit-api/references/ownership-test.md`
- `.agents/skills/prokit-db/SKILL.md`
- `.agents/skills/prokit-db/references/migration-flow.md`
- `.agents/skills/prokit-deploy/SKILL.md`
- `.agents/skills/prokit-dev-cycle/SKILL.md`
- `.agents/skills/prokit-dev-cycle/references/process-routing.md`
- `.agents/skills/prokit-skills-update/SKILL.md`
- `.agents/skills/prokit-ui/SKILL.md`
- `.agents/skills/prokit-ui/references/impeccable-map.md`
- `.agents/skills/prokit-ui/references/screen-only.md`
- `.agents/skills/prokit-verify/SKILL.md`
- `.agents/skills/prokit-verify/references/browser.md`
- `.agents/skills/prokit-verify/references/evidence.md`
- `.agents/skills/prokit-web/SKILL.md`
- `.claude/agents/prokit-implementer.md`
- `.claude/agents/prokit-reviewer.md`
- `.dev-cycle.json`
- `.vercelignore`
- `AGENTS.md`
- `CLAUDE.md`
- `GLOSSARY.md`
- `apps/web/src/components/prokit-credit.tsx`
- `docs/adr/0001-prokit-next-neon-stack.md`
- `docs/dev-workflow.md`
- `docs/domain/project.md`
- `scripts/dev-cycle.mjs`
- `scripts/export-html.mjs`
- `scripts/load-keys.mjs`
- `scripts/release.mjs`
- `scripts/skills-setup.mjs`
- `scripts/sync-agents.mjs`
- `scripts/vercel-deploy.mjs`
- `skills.manifest.json`
- `tasks/todo.md`
- `licenses/PROKIT-LICENSE.txt`
- `licenses/PROKIT-SCOPE.md`

## 별도로 설치하거나 생성되는 부분

- Better-T-Stack으로 생성한 코드, 런타임 패키지, 사용자 독자 작성 코드는 생성·작성 경위에 따른 조건을 적용한다. 프로킷을 사용했다는 이유만으로 전체 앱에 프로킷 조건이 적용되지 않는다.
- `skills.manifest.json`의 외부 스킬·플러그인·전역 도구는 해당 원본 출처에서 별도로 설치된다. 매니페스트·설치 스크립트와 외부 스킬 원문은 서로 다른 자료다. 외부 원문에는 프로킷의 MIT를 적용하지 않는다.
- 설치 시점의 원본 라이선스·고지·서비스 조건을 유지한다. 라이선스 전문을 확인한 원본의 조건 안에서 이용하는 데 별도 개별 허락은 필요하지 않다. 설치 안내만으로 모든 상업 이용·수정·재배포 권한이 확인되는 것은 아니다.
- 2026-10-08 확인 결과 Better Auth skills와 GENEXIS-AI GPT Image Skill은 공개 설치 안내가 있으나 명시적 소스 라이선스는 미확인이다. 이 안내로 사용 금지 또는 포괄적 상업 허락을 확정하지 않는다.
- 외부 원문을 포함한 프로젝트를 다른 사람에게 전달하거나 공개할 때에는 그 원본의 적용 조건을 별도로 확인한다. 프로킷의 MIT는 외부 원본의 허락을 대신하지 않는다.

원본 출처·확인 판·고지는 [프로킷 제3자 안내](https://github.com/roadkwon-ai/pro-kit/blob/main/THIRD_PARTY_NOTICES.md)에 있다. 이 주소의 최신 안내와 실제 설치 판이 다를 수 있으므로 설치된 원본의 LICENSE/NOTICE를 함께 확인한다.
