import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { TEMPLATE } from "./helpers.mjs";

// prokit-next-neon과 prokit-next-supabase에서 바이트가 같아야 하는 파일. 한쪽만 고치면 이 테스트가 실패한다.
// DB 계층(prokit-db, E 케이스, ADR, README 등)은 템플릿마다 다르므로 여기에 넣지 않는다.
export const SHARED = [
  "install.mjs",
  "install.sh",
  "files/.dev-cycle.json",
  "files/.vercelignore",
  "files/CLAUDE.md",
  "files/GLOSSARY.md",
  "files/tasks/todo.md",
  "files/scripts/dev-cycle.mjs",
  "files/scripts/skills-setup.mjs",
  "files/scripts/sync-agents.mjs",
  "files/scripts/vercel-deploy.mjs",
  "files/scripts/release.mjs",
  "files/scripts/export-html.mjs",
  "files/scripts/load-keys.mjs",
  "files/apps/web/src/components/prokit-credit.tsx",
  "files/licenses/PROKIT-LICENSE.txt",
  "files/.agents/skills/prokit-api/SKILL.md",
  "files/.agents/skills/prokit-deploy/SKILL.md",
  "files/.agents/skills/prokit-dev-cycle/references/process-routing.md",
  "files/.agents/skills/prokit-ui/SKILL.md",
  "files/.agents/skills/prokit-ui/references/impeccable-map.md",
  "files/.agents/skills/prokit-ui/references/screen-only.md",
  "files/.agents/skills/prokit-verify/references/browser.md",
  "files/.agents/skills/prokit-web/SKILL.md",
  "files/.agents/skills/prokit-skills-update/SKILL.md",
  "evals/seed/apply.sh",
  "evals/seed/verify-round.sh",
  "evals/prokit-skills-update/seed.sh",
  "evals/prokit-dev-cycle/seed.sh",
  "tests/helpers.mjs",
  "tests/dev-cycle-audit.test.mjs",
  "tests/dev-cycle-classify.test.mjs",
  "tests/dev-cycle-table.test.mjs",
  "tests/install.test.mjs",
  "tests/shared-files.test.mjs",
  "tests/skills-setup.test.mjs",
  "tests/skills.test.mjs",
  "tests/sync-agents.test.mjs",
  "tests/vercel-deploy.test.mjs",
  "tests/release.test.mjs",
  "tests/export-html.test.mjs",
  "tests/load-keys.test.mjs",
];

const self = resolve(TEMPLATE);
const parent = dirname(self);
const siblings = readdirSync(parent).filter((n) => n !== basename(self) && existsSync(join(parent, n, "install.mjs")));

test("공통 파일이 형제 템플릿과 바이트가 같다", { skip: siblings.length === 0 && "형제 템플릿 없음" }, () => {
  for (const sib of siblings) {
    const diff = SHARED.filter((f) => !readFileSync(join(self, f)).equals(readFileSync(join(parent, sib, f))));
    assert.deepEqual(diff, [], `${basename(self)}와 ${sib}가 다르다 — 한쪽 수정을 다른 쪽에도 복사한다`);
  }
});

const rootLicense = join(parent, "..", "LICENSE");
test("PROKIT-LICENSE.txt가 저장소 루트 LICENSE와 바이트가 같다", { skip: !existsSync(rootLicense) && "저장소 루트 LICENSE 없음" }, () => {
  assert.ok(readFileSync(join(self, "files/licenses/PROKIT-LICENSE.txt")).equals(readFileSync(rootLicense)), "루트 LICENSE를 고치면 두 템플릿의 PROKIT-LICENSE.txt에 복사한다");
});
