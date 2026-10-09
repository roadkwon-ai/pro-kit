import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { nextVersion, parseCommits, releaseTitle, renderNote, slug, stamp } from "./release.mjs";

const SCRIPT = fileURLToPath(new URL("./release.mjs", import.meta.url));
const c = (subject, body = "", parents = "p") => `x${subject.length}\x1f${parents}\x1f${subject}\x1f${body}\x1e`;

test("버전: 첫 릴리스 0.1.0, 기본은 patch(feat도), --minor면 minor, !와 BREAKING CHANGE는 major(0.x에서는 minor)", () => {
  assert.equal(nextVersion(null, parseCommits(c("docs: a"))), "0.1.0");
  assert.equal(nextVersion(null, parseCommits(c("feat: a")), { minor: true }), "0.1.0");
  assert.equal(nextVersion("v0.1.0", parseCommits(c("feat: a") + c("fix: b"))), "0.1.1");
  assert.equal(nextVersion("v0.1.4", parseCommits(c("feat: a") + c("fix: b")), { minor: true }), "0.2.0");
  assert.equal(nextVersion("v1.2.3", parseCommits(c("docs: a")), { minor: true }), "1.3.0");
  assert.equal(nextVersion("v1.2.3", parseCommits(c("feat!: a")), { minor: true }), "2.0.0");
  assert.equal(nextVersion("v0.2.3", parseCommits(c("docs: a") + c("prokit-next-neon: b"))), "0.2.4");
  assert.equal(nextVersion("v1.2.3", parseCommits(c("feat(api)!: a"))), "2.0.0");
  assert.equal(nextVersion("v0.11.0", parseCommits(c("refactor!: a"))), "0.12.0");
  assert.equal(nextVersion("v0.11.0", parseCommits(c("fix: a", "BREAKING CHANGE: x"))), "0.12.0");
  assert.equal(nextVersion("v1.2.3", parseCommits(c("fix: a", "BREAKING CHANGE: x"))), "2.0.0");
});

test("릴리스 커밋은 빼고, 머지 커밋은 표시한다", () => {
  const cs = parseCommits(c("chore(release): v0.1.0") + c("Merge branch x", "", "p q") + c("fix: a"));
  assert.deepEqual(cs.map((x) => [x.subject, x.merge]), [["Merge branch x", true], ["fix: a", false]]);
});

test("자동 제목: 커밋 종류 순서로 만든다", () => {
  assert.equal(releaseTitle(parseCommits(c("docs: a") + c("feat: b"))), "Features and docs update");
  assert.equal(releaseTitle(parseCommits(c("chore: a"))), "Maintenance update");
  assert.equal(slug("  Dev principles: AGENTS.md / v2!  "), "dev-principles-agents-md-v2");
});

test("파일명 시각은 KST 년월일-시분", () => {
  assert.equal(stamp(new Date("2026-07-28T07:38:00Z")), "20260728-1638");
  assert.equal(stamp(new Date("2026-12-31T15:05:00Z")), "20270101-0005");
});

test("노트: 종류별 절, 본문 bullet, 트레일러 제외, 비교 링크", () => {
  const commits = parseCommits(c("feat: 스킬 추가", "- 첫째\n  이어짐\n- 둘째\n\n본문 문단\nCo-Authored-By: A <a@b>") + c("docs: 문서"));
  const note = renderNote({ version: "0.2.0", prevTag: "v0.1.0", title: "T", date: new Date("2026-09-27T10:00:00Z"), commits, repo: "o/r" });
  assert.match(note, /^# v0\.2\.0 — T\n/);
  assert.match(note, /- 날짜: 2026-09-27 19:00 \(KST\)/);
  assert.match(note, /compare\/v0\.1\.0\.\.\.v0\.2\.0/);
  assert.match(note, /## Features\n\n- 스킬 추가 \(`x\d+`\)\n {2}- 첫째 이어짐\n {2}- 둘째\n\n## Docs\n\n- 문서/);
  assert.doesNotMatch(note, /Co-Authored-By|본문 문단/);
});

test("CLI: 노트를 쓰고, 검수한 노트를 --publish로 커밋, 태그, push, gh release. 어긋난 노트와 push 실패는 막는다", () => {
  const root = mkdtempSync(join(tmpdir(), "release-"));
  const dir = join(root, "work");
  const bin = join(root, "bin");
  mkdirSync(bin);
  writeFileSync(join(bin, "gh"), `#!/bin/sh\nprintf '%s\\n' "$@" > "${join(root, "gh-args")}"\ncat > "${join(root, "gh-notes")}"\n`);
  chmodSync(join(bin, "gh"), 0o755);
  execFileSync("git", ["init", "-q", "--bare", join(root, "remote.git")]);
  mkdirSync(dir);
  const g = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" }).trim();
  g("init", "-q", "-b", "main");
  g("config", "user.email", "t@t");
  g("config", "user.name", "t");
  g("remote", "add", "origin", join(root, "remote.git"));
  g("commit", "-q", "--allow-empty", "-m", "feat: 첫 기능");
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
  const write = (...args) => run(...args).stdout.match(/→ (release\/\S+)/)[1];
  const remote = (...a) => execFileSync("git", a, { cwd: join(root, "remote.git"), encoding: "utf8" }).trim();

  const first = write("--title", "First cut");
  assert.match(first, /^release\/\d{8}-\d{4}-first-cut\.md$/);
  assert.equal(g("status", "--porcelain"), "?? release/");
  writeFileSync(join(dir, first), readFileSync(join(dir, first), "utf8").replace("첫 기능", "첫 번째 기능"));
  assert.equal(run("--publish", first).status, 0);
  assert.equal(remote("rev-parse", "main"), g("rev-parse", "HEAD"));
  assert.equal(remote("tag", "-l"), "v0.1.0");
  assert.equal(g("log", "-1", "--format=%s"), "chore(release): v0.1.0");
  assert.match(g("show", `HEAD:${first}`), /첫 번째 기능/);
  assert.deepEqual(readFileSync(join(root, "gh-args"), "utf8").trim().split("\n"), ["release", "create", "v0.1.0", "--verify-tag", "--title", "v0.1.0 — First cut", "--notes-file", "-"]);
  // Release 제목과 겹치는 노트 첫 줄은 본문에서 뺀다
  assert.equal(readFileSync(join(root, "gh-notes"), "utf8"), g("show", `HEAD:${first}`).replace(/^# v0\.1\.0 — First cut\n/, "") + "\n");

  assert.match(run().stdout, /릴리스할 커밋이 없다/);

  g("commit", "-q", "--allow-empty", "-m", "fix: 고침");
  const stale = write();
  assert.match(readFileSync(join(dir, stale), "utf8"), /^# v0\.1\.1 — Fixes update/);
  g("commit", "-q", "--allow-empty", "-m", "fix: 또 고침");
  assert.match(run("--publish", stale).stderr, /맞지 않는다/);
  rmSync(join(dir, stale));

  const second = write();
  g("switch", "-q", "-c", "feature");
  assert.match(run("--publish", second).stderr, /main 브랜치에서 실행한다/);
  g("switch", "-q", "main");
  g("remote", "set-url", "origin", join(root, "missing.git"));
  const head = g("rev-parse", "HEAD");
  const failed = run("--publish", second);
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /되돌렸다/);
  assert.equal(g("rev-parse", "HEAD"), head);
  assert.equal(g("tag", "-l", "v0.1.1"), "");
  assert.equal(g("status", "--porcelain"), `?? ${second}`);

  // --minor로 만든 노트도 발행된다
  g("remote", "set-url", "origin", join(root, "remote.git"));
  rmSync(join(dir, second));
  const minor = write("--minor");
  assert.match(readFileSync(join(dir, minor), "utf8"), /^# v0\.2\.0 — Fixes update/);
  assert.equal(run("--publish", minor).status, 0);
  assert.equal(remote("tag", "-l", "v0.2.0"), "v0.2.0");
});
