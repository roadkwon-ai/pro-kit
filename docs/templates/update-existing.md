# 기존 프로젝트에 갱신 반영
https://prokit-web.vercel.app/docs/templates/update-existing/

> 한눈에: 템플릿이 바뀌어도 이미 만든 프로젝트는 그대로예요. 바뀐 내용을 옮기려면 차이를 미리 보고 옮길 것을 정리한 뒤, 그 프로젝트에서 새로 연 대화에서 작업 한 번(라운드)으로 반영해요. 그 프로젝트가 스스로 고친 내용은 덮어쓰지 않아요.

## 순서

pro-kit 폴더에서 "템플릿 변경을 <프로젝트>에 반영해줘"처럼 요청하면 에이전트가 1~3번을 하고, 4번과 5번은 그 프로젝트에서 연 세션에서 하도록 안내해요([AGENTS.md](https://github.com/roadkwon-ai/pro-kit/blob/main/AGENTS.md) "기존 프로젝트에 템플릿 갱신 반영").

1. **차이 보기**: `bash templates/<템플릿>/install.sh <프로젝트> --diff`로 차이를 봐요. 파일을 쓰지 않고, 템플릿과 다른 파일의 diff, 복사할 파일, `package.json`·`.gitignore`·`biome.json`·`turbo.json`·`.claude/settings.json`에 더할 항목을 보여 줘요.
2. **`.dev-cycle.json` 따로 보기**: 설치기가 값을 채우는 파일이라 `--diff`에 나오지 않아요. 템플릿의 `files/.dev-cycle.json`과 직접 비교해요.
3. **옮길 항목 정리**: 옮길 항목을 정리해 보고해요. 그 프로젝트가 스스로 고친 내용(예: `DB_PORT` 변수화)은 옮길 항목에서 빼요.
4. **옛 이름 옮기기** (프로젝트 세션): 아래 "옛 이름이 남아 있을 때"를 먼저 해요.
5. **라운드로 반영** (프로젝트 세션): 실제 반영은 그 프로젝트에서 연 세션이 dev-cycle 케이스 H 라운드로 해요. 라운드에서는 `install.sh <프로젝트> --skip-skills`로 없는 파일과 설정 항목을 더하고(템플릿 파일은 덮어쓰지 않고 설정 파일에는 항목만 더해요), 템플릿과 다른 파일은 직접 옮겨요.

## 자세히

### 옛 이름이 남아 있을 때

| 옛 이름 | 새 이름 | 옮기는 법 |
|---|---|---|
| `CONTEXT.md` | `GLOSSARY.md` | 반영할 때 먼저 `git mv CONTEXT.md GLOSSARY.md`로 옮긴 뒤 참조를 고쳐요. 옮기지 않으면 `install.sh --skip-skills`가 빈 `GLOSSARY.md`를 따로 만들어요 |
| `bts-*` 스킬·에이전트·템플릿 (2026-10-06 이전) | `prokit-*` | 아래 순서로 옮겨요. 옮기지 않으면 `install.sh --skip-skills`가 `prokit-*`를 따로 만들어 두 벌이 돼요 |

`bts-*`에서 `prokit-*`로 옮기는 순서예요. `--diff`가 `옛 이름이 남아 있다`로 알려 줘요.

1. 열린 dev-cycle 라운드가 있으면 먼저 닫아요. `audit`이 옛 리뷰 행을 누락으로 보기 때문이에요.
2. `.agents/skills/bts-*`, `.claude/agents/bts-*.md`, `docs/adr/0001-bts-next-<DB>-stack.md`를 `git mv`로 `prokit-*`로 옮겨요.
3. `.claude/skills/bts-*` 링크를 지워요.
4. `AGENTS.md`·`CLAUDE.md`의 `bts-template` 마커와 문서의 `bts-*` 참조를 고쳐요.
5. `pnpm agents:sync`로 `.codex/agents`와 `.agents/agents`를 다시 만들어요.

### 공식 스킬은 따로 업데이트해요

템플릿 갱신 반영은 템플릿이 설치한 파일과 설정을 옮기는 일이에요. 공식 스킬의 새 버전은 그 프로젝트에서 `pnpm skills:update`로 받아요([설치와 업데이트 구조](https://prokit-web.vercel.app/docs/skills/install-and-update/)).

## 관련 문서

- [설치기와 옵션](https://prokit-web.vercel.app/docs/templates/installer/)
- [케이스 A\~F·H와 대조표](https://prokit-web.vercel.app/docs/concepts/cases/)
- [설치와 업데이트 구조](https://prokit-web.vercel.app/docs/skills/install-and-update/)
