import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), "..");
export const TEMPLATE_FILES = join(TEMPLATE, "files");

export function makeRepo({ branch = "main", commit = true, name = "dc-" } = {}) {
  const root = mkdtempSync(join(tmpdir(), name));
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
  const write = (rel, content = "x\n") => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), content);
  };
  git("init", "-q", "-b", branch);
  git("config", "user.email", "test@example.com");
  git("config", "user.name", "test");
  git("config", "core.quotePath", "true");
  cpSync(join(TEMPLATE_FILES, ".dev-cycle.json"), join(root, ".dev-cycle.json"));
  mkdirSync(join(root, "docs"), { recursive: true });
  cpSync(join(TEMPLATE_FILES, "docs/dev-workflow.md"), join(root, "docs/dev-workflow.md"));
  write("README.md");
  if (commit) {
    git("add", "-A");
    git("commit", "-qm", "init");
  }
  return { root, git, write };
}

// impeccable critique가 남기는 기록 파일(.impeccable/critique/<시각>__<대상>.md)을 만들고 그 행의 증거를 돌려준다.
export function critiqueRecord(root, total = 31, name = "2026-10-22T12-30-00Z__apps-web.md") {
  mkdirSync(join(root, ".impeccable/critique"), { recursive: true });
  writeFileSync(join(root, ".impeccable/critique", name), `---\ntotal_score: ${total}\nmax_score: 40\np0_count: 0\n---\n본문\n`);
  return `Design Health ${total}/40, P0 0, P1 0, .impeccable/critique/${name}`;
}

// audit·web-design-guidelines 보고서를 tasks/evidence/에 저장하고 그 행의 증거를 돌려준다.
export function auditRecord(root, total = 17, name = "ui-audit-20261022-1230.md") {
  mkdirSync(join(root, "tasks/evidence"), { recursive: true });
  writeFileSync(join(root, "tasks/evidence", name), `## Audit Health Score\n| **Total** | | **${total}/20** | Good |\n`);
  return `audit ${total}/20, 접근성 4/4, web-design-guidelines 위반 0건, tasks/evidence/${name}`;
}
