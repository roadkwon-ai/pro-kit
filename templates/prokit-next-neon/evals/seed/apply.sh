#!/usr/bin/env bash
# eval용 시드: todo 스키마·라우터, drizzle-orm 의존성, README 오타를 넣고 커밋한다.
# 시드 파일의 워크스페이스 이름 @fixture-full은 대상 프로젝트 이름(루트 package.json의 name)으로 바꾼다.
set -euo pipefail
dir="$1"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -R "$here/files/." "$dir/"
cd "$dir"
# 다른 스킬 eval이 외부 스킬 업데이트 알림에 걸려 멈추지 않게 이 fixture에서는 확인을 끈다
node scripts/skills-setup.mjs --update --mode off >/dev/null
name="$(node -p 'require("./package.json").name')"
perl -pi -e "s#\@fixture-full/#\@${name}/#g" packages/api/src/routers/todo.ts
pnpm --filter "@${name}/api" add drizzle-orm@catalog: >/dev/null
printf '\n이 프로젝트는 Nextjs로 만들었다.\n' >> README.md
pnpm exec biome check --write packages/api/src packages/db/src >/dev/null 2>&1 || true
git add -A && git commit -qm "eval seed: todo"
