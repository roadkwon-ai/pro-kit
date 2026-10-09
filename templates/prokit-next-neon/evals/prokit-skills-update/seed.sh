#!/usr/bin/env bash
# prokit-skills-update eval 시드. 템플릿을 설치하고 커밋한 프로젝트(원격과 같은 스킬 상태)에 eval별 조건을 만들고 커밋한다.
# 사용법: seed.sh <프로젝트> <eval id: 1|2|3|4|5>. evals/seed/apply.sh는 필요 없다(쓴다면 먼저 실행한다. 이 스크립트가 apply.sh가 끈 확인 상태를 지운다).
#   1: shadcn·turborepo 설치본을 옛 내용으로 바꾼다
#   2: shadcn을 옛 내용으로 바꾸고 README에 'Nextjs' 오타를 넣는다
#   3: 원격에서 없어진 next-best-practices(vercel-labs/next-skills)를 매니페스트·lock·설치본에 넣는다
#   4: shadcn과 impeccable 스크립트(scripts/live-browser.js)를 옛 내용으로 바꾼다(.md가 아닌 파일 변경)
#   5: 알림 방식을 auto로 두고, impeccable 스크립트를 옛 내용으로 바꾸고 README에 'Nextjs' 오타를 넣는다
set -euo pipefail
dir="$1"
cd "$dir"
rm -f node_modules/.cache/skills-update.json
drop_last_line() { perl -0pi -e 's/\n[^\n]*\n?\z/\n/' "$1"; }
case "$2" in
  1)
    drop_last_line .agents/skills/shadcn/SKILL.md
    printf '\n<!-- 이전 버전 -->\n' >> .agents/skills/turborepo/SKILL.md ;;
  2)
    drop_last_line .agents/skills/shadcn/SKILL.md
    printf '\n이 프로젝트는 Nextjs로 만들었다.\n' >> README.md ;;
  3)
    mkdir -p .agents/skills/next-best-practices
    printf -- '---\nname: next-best-practices\ndescription: Next.js best practices (vercel-labs/next-skills에서 받은 옛 스킬)\n---\n\n# Next.js Best Practices\n' > .agents/skills/next-best-practices/SKILL.md
    ln -s ../../.agents/skills/next-best-practices .claude/skills/next-best-practices
    node -e '
      const fs = require("node:fs");
      const m = JSON.parse(fs.readFileSync("skills.manifest.json", "utf8"));
      m.skills.splice(1, 0, { agents: ["claude-code", "codex"], source: "vercel-labs/next-skills", skills: ["next-best-practices"] });
      fs.writeFileSync("skills.manifest.json", `${JSON.stringify(m, null, "\t")}\n`);
      const l = JSON.parse(fs.readFileSync("skills-lock.json", "utf8"));
      l.skills["next-best-practices"] = { source: "vercel-labs/next-skills", sourceType: "github", skillPath: "skills/next-best-practices/SKILL.md", computedHash: "0".repeat(64) };
      fs.writeFileSync("skills-lock.json", `${JSON.stringify(l, null, 2)}\n`);' ;;
  4)
    drop_last_line .agents/skills/shadcn/SKILL.md
    printf '\n// 이전 버전\n' >> .agents/skills/impeccable/scripts/live-browser.js ;;
  5)
    mkdir -p node_modules/.cache && printf '{"mode":"auto"}\n' > node_modules/.cache/skills-update.json
    printf '\n// 이전 버전\n' >> .agents/skills/impeccable/scripts/live-browser.js
    printf '\n이 프로젝트는 Nextjs로 만들었다.\n' >> README.md ;;
  *) echo "eval id는 1~5" >&2; exit 2 ;;
esac
git add -A && git commit -qm "eval seed: prokit-skills-update $2"
