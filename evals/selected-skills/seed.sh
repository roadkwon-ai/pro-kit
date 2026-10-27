#!/usr/bin/env bash
# 고른 스킬 eval 시드: 템플릿 eval 시드(todo) 위에 vitest(packages/api, 루트 test, commands.test)와
# 완료율 함수(빈 목록이면 NaN인 버그)를 넣고 커밋한다. 사용법: seed.sh <프로젝트> <템플릿 경로>
set -euo pipefail
dir="$1"; tpl="$2"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$tpl/evals/seed/apply.sh" "$dir"
cp -R "$here/seed/." "$dir/"
cd "$dir"
name="$(node -p 'require("./package.json").name')"
pnpm --filter "@${name}/api" add -D vitest >/dev/null
node -e '
const fs=require("fs");
const j=(p)=>JSON.parse(fs.readFileSync(p,"utf8")), w=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,"\t")+"\n");
const api=j("packages/api/package.json"); api.scripts={...api.scripts,test:"vitest run"}; w("packages/api/package.json",api);
const root=j("package.json"); root.scripts={...root.scripts,test:"turbo test"}; w("package.json",root);
const t=j("turbo.json"); t.tasks={...t.tasks,test:{cache:false}}; w("turbo.json",t);
const d=j(".dev-cycle.json"); d.commands={...d.commands,test:"pnpm test"}; w(".dev-cycle.json",d);'
pnpm exec biome check --write packages/api/src package.json turbo.json >/dev/null 2>&1 || true
pnpm --filter "@${name}/api" test >/dev/null
git add -A && git commit -qm "eval seed: vitest, completionRate"
