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
