import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { guard, loadConfig, writeTable } from "../files/scripts/dev-cycle.mjs";
import { ensureGitHook } from "../install.mjs";
import { makeRepo, TEMPLATE_FILES } from "./helpers.mjs";

const SCRIPT = join(TEMPLATE_FILES, "scripts/dev-cycle.mjs");
const cli = (root, ...args) => spawnSync(process.execPath, [SCRIPT, "guard", ...args], { cwd: root, encoding: "utf8" });
// close가 남기는 라운드 기록(dev-cycle:archived 표시가 있다). archive 명령의 완료 항목 기록에는 이 표시가 없다.
const record = (title = "라운드") => `# ${title}\n\n<!-- dev-cycle:archived closed=2026-10-23 case=B -->\n## 라운드: ${title}\n<!-- dev-cycle:archived-end -->\n`;

test("--staged: 라운드 없이 코드·하네스·인증 경로를 커밋하면 막고, 문서만이면 통과한다", () => {
  const { root, git, write } = makeRepo();
  const config = loadConfig(root);
  write("docs/note.md");
  git("add", "-A");
  assert.deepEqual(guard(root, config), { ok: true, why: "코드 변경 없음" });
  for (const f of ["apps/web/src/app/page.tsx", "skills.manifest.json", "packages/auth/src/index.ts"]) {
    write(f);
    git("add", "-A");
    const r = guard(root, config);
    assert.equal(r.ok, false, f);
    assert.ok(r.files.includes(f), f);
    git("reset", "-q");
  }
  write("apps/web/src/app/page.tsx");
  git("add", "-A");
  const r = cli(root, "--staged");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /열린 dev-cycle 라운드 없이 코드·하네스 변경\(케이스 B\)을 커밋하려 한다/);
  assert.match(r.stdout, /^ {2}apps\/web\/src\/app\/page\.tsx$/m);
  assert.match(r.stdout, /--no-verify는 사용자가 허락할 때만/);
  assert.equal(JSON.parse(cli(root, "--staged", "--json").stdout).ok, false);
});

test("--staged: 활성 라운드, 함께 커밋하는 닫은 라운드 기록, 프로킷 설치 커밋은 통과한다", () => {
  const { root, git, write } = makeRepo();
  const config = loadConfig(root);
  write("apps/web/src/app/page.tsx");
  // archive 명령이 남긴 완료 항목 기록(라운드 표시 없음)은 라운드 기록이 아니다
  write("tasks/archive/2026-10-23-완료-항목.md", "# 완료 항목\n\n- [x] 일\n");
  git("add", "-A");
  assert.equal(guard(root, config).ok, false);
  write("tasks/archive/2026-10-23-화면.md", record("화면"));
  git("add", "-A");
  assert.deepEqual(guard(root, config), { ok: true, why: "라운드 기록 tasks/archive/2026-10-23-화면.md" });
  git("reset", "-q", "--", "tasks/archive");
  writeTable(root, config, "B", { write: true, title: "화면" });
  assert.deepEqual(guard(root, config), { ok: true, why: "활성 라운드" });
  assert.equal(cli(root, "--staged").status, 0);

  // Better-T-Stack 첫 커밋 뒤 설치 결과(.dev-cycle.json을 새로 더함)를 커밋할 때
  const fresh = makeRepo({ commit: false });
  fresh.write("apps/web/src/app/page.tsx");
  fresh.git("add", "README.md", "apps/web/src/app/page.tsx");
  fresh.git("commit", "-qm", "bts");
  fresh.write("apps/web/src/app/page.tsx", "y\n");
  fresh.git("add", "-A");
  assert.deepEqual(guard(fresh.root, loadConfig(fresh.root)), { ok: true, why: "프로킷 설치 커밋" });
});

test("--since: 그 사이 코드 변경에 닫은 라운드 기록이 있어야 통과한다(활성 라운드는 치지 않는다)", () => {
  const { root, git, write } = makeRepo();
  const config = loadConfig(root);
  const base = git("rev-parse", "HEAD").trim();
  write("docs/a.md");
  git("add", "-A");
  git("commit", "-qm", "docs");
  assert.equal(guard(root, config, base).ok, true);
  write("packages/db/src/schema/todo.ts");
  git("add", "-A");
  git("commit", "-qm", "feat: db");
  writeTable(root, config, "E", { write: true, title: "DB" });
  const r = cli(root, "--since", base);
  assert.equal(r.status, 1);
  assert.match(r.stdout, new RegExp(`${base} 뒤의 코드·하네스 변경\\(케이스 E\\)에 닫은 라운드 기록\\(tasks/archive/\\)이 없다`));
  write("tasks/archive/2026-10-23-DB.md", record("DB"));
  git("add", "tasks/archive");
  git("commit", "-qm", "chore: 라운드 기록");
  assert.deepEqual(guard(root, config, base), { ok: true, why: "라운드 기록 tasks/archive/2026-10-23-DB.md" });
  assert.match(cli(root, "--since", "HEAD~1").stdout, /통과 \(코드 변경 없음\)/, "기록 커밋만 보면 코드 변경이 없다");
});

test("CLI 사용법: --staged와 --since <커밋> 중 하나만 받는다", () => {
  const { root } = makeRepo();
  for (const args of [[], ["--staged", "--since", "HEAD"], ["--since"], ["--since", "--staged"], ["--since", "없는-브랜치"], ["--bogus"]]) {
    const r = cli(root, ...args);
    assert.equal(r.status, 2, args.join(" "));
    assert.match(r.stderr, /사용법: dev-cycle guard|커밋을 찾을 수 없다/, args.join(" "));
  }
});

test("install: pre-commit 훅을 걸고, 있으면 덮어쓰지 않으며, 저장소 루트가 아니면 건너뛴다. 훅은 실제 커밋을 막는다", () => {
  const { root, git, write } = makeRepo();
  mkdirSync(join(root, "scripts"));
  cpSync(SCRIPT, join(root, "scripts/dev-cycle.mjs"));
  git("add", "-A");
  git("commit", "-qm", "dev-cycle");
  assert.equal(ensureGitHook(root, { dryRun: true }), "added");
  const hook = join(root, ".git/hooks/pre-commit");
  assert.throws(() => statSync(hook), "미리 보기는 쓰지 않는다");
  assert.equal(ensureGitHook(root), "added");
  assert.equal(statSync(hook).mode & 0o111, 0o111);
  assert.equal(ensureGitHook(root), false, "이미 걸려 있으면 그대로");
  write("apps/web/src/app/page.tsx");
  git("add", "-A");
  const blocked = spawnSync("git", ["commit", "-qm", "feat: 화면"], { cwd: root, encoding: "utf8" });
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stdout + blocked.stderr, /열린 dev-cycle 라운드 없이/);
  writeTable(root, loadConfig(root), "B", { write: true, title: "화면" });
  assert.equal(spawnSync("git", ["commit", "-qm", "feat: 화면"], { cwd: root }).status, 0, "라운드를 열면 커밋된다");

  // guard를 모르는 옛 dev-cycle.mjs면 훅이 막지 않는다
  writeFileSync(join(root, "scripts/dev-cycle.mjs"), "process.exit(2);\n");
  write("apps/web/src/app/other.tsx");
  git("add", "-A");
  writeFileSync(join(root, "tasks/todo.md"), "# 작업\n");
  assert.equal(spawnSync("git", ["commit", "-qm", "feat: 옛 판"], { cwd: root }).status, 0);

  // husky 등 다른 pre-commit이 있으면 덮어쓰지 않고 경로를 돌려준다
  const other = makeRepo();
  const otherHook = join(other.root, ".git/hooks/pre-commit");
  writeFileSync(otherHook, "#!/bin/sh\nnpx lint-staged\n", { mode: 0o755 });
  assert.equal(ensureGitHook(other.root), otherHook);
  assert.equal(readFileSync(otherHook, "utf8"), "#!/bin/sh\nnpx lint-staged\n");

  // 상위 저장소의 하위 폴더와 git 저장소가 아닌 폴더는 건너뛴다
  mkdirSync(join(other.root, "sub"));
  assert.equal(ensureGitHook(join(other.root, "sub")), null);
  assert.equal(ensureGitHook(mkdtempSync(join(tmpdir(), "no-git-"))), null);
});
