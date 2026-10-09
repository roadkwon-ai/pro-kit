import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { TEMPLATE_FILES, makeRepo } from "./helpers.mjs";

const SCRIPT = join(TEMPLATE_FILES, "scripts/release.mjs");
const { nextVersion, parseCommits, releaseTitle, renderNote, setVersion, slug, stamp } = await import(SCRIPT);
const c = (subject, body = "", parents = "p") => `x${subject.length}\x1f${parents}\x1f${subject}\x1f${body}\x1e`;

test("버전: 첫 릴리스 0.1.0, 기본은 patch(feat도), --minor면 minor, !와 BREAKING CHANGE는 major(0.x에서는 minor)", () => {
	assert.equal(nextVersion(null, parseCommits(c("docs: a"))), "0.1.0");
	assert.equal(nextVersion(null, parseCommits(c("feat: a")), { minor: true }), "0.1.0");
	assert.equal(nextVersion("v0.1.0", parseCommits(c("feat: a") + c("fix: b"))), "0.1.1");
	assert.equal(nextVersion("v0.1.4", parseCommits(c("feat: a") + c("fix: b")), { minor: true }), "0.2.0");
	assert.equal(nextVersion("v1.2.3", parseCommits(c("docs: a")), { minor: true }), "1.3.0");
	assert.equal(nextVersion("v1.2.3", parseCommits(c("feat!: a")), { minor: true }), "2.0.0");
	assert.equal(nextVersion("v0.2.3", parseCommits(c("docs: a") + c("initial commit"))), "0.2.4");
	assert.equal(nextVersion("v1.2.3", parseCommits(c("feat(api)!: a"))), "2.0.0");
	assert.equal(nextVersion("v0.11.0", parseCommits(c("refactor!: a"))), "0.12.0");
	assert.equal(nextVersion("v0.11.0", parseCommits(c("fix: a", "BREAKING CHANGE: x"))), "0.12.0");
	assert.equal(nextVersion("v1.2.3", parseCommits(c("fix: a", "BREAKING CHANGE: x"))), "2.0.0");
});

test("릴리스 커밋은 빼고 머지 커밋은 표시한다. 자동 제목은 커밋 종류 순서, 파일명 시각은 KST", () => {
	const cs = parseCommits(c("chore(release): v0.1.0") + c("Merge branch x", "", "p q") + c("fix: a"));
	assert.deepEqual(cs.map((x) => [x.subject, x.merge]), [["Merge branch x", true], ["fix: a", false]]);
	assert.equal(releaseTitle(parseCommits(c("docs: a") + c("feat: b"))), "Features and docs update");
	assert.equal(releaseTitle(parseCommits(c("chore: a"))), "Maintenance update");
	assert.equal(slug("  Login: OAuth / v2!  "), "login-oauth-v2");
	assert.equal(stamp(new Date("2026-12-31T15:05:00Z")), "20270101-0005");
});

test("노트: 종류별 절, 본문 bullet, 트레일러 제외, 비교 링크", () => {
	const commits = parseCommits(c("feat: 로그인", "- 첫째\n  이어짐\n- 둘째\n\n본문 문단\nCo-Authored-By: A <a@b>") + c("docs: 문서"));
	const note = renderNote({ version: "0.2.0", prevTag: "v0.1.0", title: "T", date: new Date("2026-09-27T10:00:00Z"), commits, repo: "o/r" });
	assert.match(note, /^# v0\.2\.0 — T\n\n- 날짜: 2026-09-27 19:00 \(KST\)/);
	assert.match(note, /compare\/v0\.1\.0\.\.\.v0\.2\.0/);
	assert.match(note, /## Features\n\n- 로그인 \(`x\d+`\)\n {2}- 첫째 이어짐\n {2}- 둘째\n\n## Docs\n\n- 문서/);
	assert.doesNotMatch(note, /Co-Authored-By|본문 문단/);
});

test("package.json version: 있으면 바꾸고 없으면 name 뒤에 넣는다. 들여쓰기는 파일을 따른다", () => {
	assert.equal(setVersion('{\n\t"name": "app",\n\t"private": true\n}\n', "0.2.0"), '{\n\t"name": "app",\n\t"version": "0.2.0",\n\t"private": true\n}\n');
	assert.equal(setVersion('{\n  "name": "web",\n  "version": "0.1.0",\n  "private": true\n}\n', "1.0.0"), '{\n  "name": "web",\n  "version": "1.0.0",\n  "private": true\n}\n');
});

// gh 스텁: auth status와 release create의 종료 코드를 환경변수로 정하고, create 인자를 적는다.
const GH = `#!/bin/sh
[ "$1" = auth ] && exit "\${STUB_GH_AUTH_EXIT:-0}"
printf '%s\\n' "$@" > "$STUB_GH_ARGS"
cat > "$STUB_GH_ARGS.notes"
exit "\${STUB_GH_EXIT:-0}"
`;
const ORIGIN = "https://github.com/o/r.git";

function setup() {
	const repo = makeRepo({ name: "release-" });
	const aux = mkdtempSync(join(tmpdir(), "release-aux-"));
	const bare = join(aux, "remote.git");
	execFileSync("git", ["init", "-q", "--bare", bare]);
	// origin은 GitHub 주소로 두고 fetch·push는 로컬 bare 저장소로 보낸다
	repo.git("remote", "add", "origin", ORIGIN);
	repo.git("config", "--add", `url.${bare}.insteadOf`, ORIGIN);
	mkdirSync(join(aux, "bin"));
	writeFileSync(join(aux, "bin/gh"), GH);
	chmodSync(join(aux, "bin/gh"), 0o755);
	repo.write("package.json", '{\n\t"name": "app",\n\t"private": true\n}\n');
	repo.write("apps/web/package.json", '{\n\t"name": "web",\n\t"version": "0.1.0",\n\t"private": true\n}\n');
	repo.git("add", "-A");
	repo.git("commit", "-qm", "feat: 첫 기능");
	const git = (...a) => repo.git(...a).trim();
	const run = (args, env = {}) =>
		spawnSync(process.execPath, [SCRIPT, ...args], {
			cwd: repo.root,
			encoding: "utf8",
			env: { ...process.env, PATH: `${join(aux, "bin")}:${process.env.PATH}`, STUB_GH_ARGS: join(aux, "gh-args"), ...env },
		});
	const note = (...args) => run(args).stdout.match(/→ (release\/\S+)/)[1];
	const remote = (...a) => execFileSync("git", a, { cwd: bare, encoding: "utf8" }).trim();
	const version = (f) => JSON.parse(git("show", `HEAD:${f}`)).version;
	return { ...repo, git, bare, run, note, remote, version, ghArgs: () => readFileSync(join(aux, "gh-args"), "utf8").trim().split("\n"), ghNotes: () => readFileSync(join(aux, "gh-args.notes"), "utf8") };
}

test("CLI: 노트를 쓰고, 검수한 노트를 --publish로 version 커밋, 태그, push, GitHub Release까지 한다", () => {
	const s = setup();
	const first = s.note("--title", "First cut");
	assert.match(first, /^release\/\d{8}-\d{4}-first-cut\.md$/);
	assert.equal(s.git("status", "--porcelain"), "?? release/");
	const path = join(s.root, first);
	assert.match(readFileSync(path, "utf8"), /^# v0\.1\.0 — First cut\n[\s\S]*이전 버전: 없음 \(첫 릴리스\)/);
	writeFileSync(path, readFileSync(path, "utf8").replace("첫 기능", "첫 번째 기능"));
	const r = s.run(["--publish", first]);
	assert.equal(r.status, 0, r.stderr);
	assert.match(r.stdout, /v0\.1\.0 — First cut 릴리스 완료\. 다음: pnpm vercel:deploy production --check/);
	assert.equal(s.remote("rev-parse", "main"), s.git("rev-parse", "HEAD"));
	assert.equal(s.remote("tag", "-l"), "v0.1.0");
	assert.equal(s.git("log", "-1", "--format=%s"), "chore(release): v0.1.0");
	assert.match(s.git("show", `HEAD:${first}`), /첫 번째 기능/);
	assert.match(s.git("show", "HEAD:package.json"), /^\t"name": "app",\n\t"version": "0\.1\.0",$/m);
	assert.equal(s.version("apps/web/package.json"), "0.1.0");
	assert.deepEqual(s.ghArgs(), ["release", "create", "v0.1.0", "-R", "o/r", "--verify-tag", "--title", "v0.1.0 — First cut", "--notes-file", "-"]);
	// Release 제목과 겹치는 노트 첫 줄은 본문에서 뺀다
	assert.equal(s.ghNotes(), readFileSync(path, "utf8").replace(/^# v0\.1\.0 — First cut\n/, ""));
	assert.equal(s.git("status", "--porcelain"), "");
	assert.match(s.run([]).stdout, /릴리스할 커밋이 없다 \(마지막 태그 v0\.1\.0\)/);

	// 다음 릴리스: feat도 기본은 patch. 두 package.json이 태그를 따라가고, 노트에 비교 링크가 붙는다
	s.git("commit", "-q", "--allow-empty", "-m", "feat: 둘째 기능");
	const second = s.note();
	assert.match(readFileSync(join(s.root, second), "utf8"), /^# v0\.1\.1 — Features update\n[\s\S]*github\.com\/o\/r\/compare\/v0\.1\.0\.\.\.v0\.1\.1/);
	assert.equal(s.run(["--publish", second]).status, 0);
	assert.deepEqual([s.version("package.json"), s.version("apps/web/package.json")], ["0.1.1", "0.1.1"]);
	assert.equal(s.remote("tag", "-l"), "v0.1.0\nv0.1.1");

	// --minor로 만든 노트는 minor로 올리고, 발행 검사도 받아 준다
	s.git("commit", "-q", "--allow-empty", "-m", "feat: 셋째 기능");
	const third = s.note("--minor");
	assert.match(readFileSync(join(s.root, third), "utf8"), /^# v0\.2\.0 — Features update/);
	assert.equal(s.run(["--publish", third]).status, 0);
	assert.deepEqual([s.version("package.json"), s.version("apps/web/package.json")], ["0.2.0", "0.2.0"]);
	assert.equal(s.remote("tag", "-l"), "v0.1.0\nv0.1.1\nv0.2.0");

	// 머지 커밋만 늘었으면(머지한 쪽이 릴리스 커밋뿐) 그 머지로 릴리스한다. 릴리스 없이 배포가 막히지 않게
	s.git("switch", "-q", "-c", "side");
	s.git("commit", "-q", "--allow-empty", "-m", "chore(release): side");
	s.git("switch", "-q", "main");
	s.git("merge", "-q", "--no-ff", "-m", "Merge branch 'side'", "side");
	const merged = s.note();
	assert.match(readFileSync(join(s.root, merged), "utf8"), /^# v0\.2\.1 — Maintenance update\n[\s\S]*- Merge branch 'side'/);
	assert.equal(s.run(["--publish", merged]).status, 0);
});

test("--publish는 어긋난 노트, 기본 브랜치 밖, 커밋 안 한 변경, gh 로그인 안 됨, GitHub가 아닌 origin이면 커밋하지 않는다", () => {
	const s = setup();
	assert.match(s.run(["--bogus"]).stderr, /사용법/);
	// 빈 값은 새 노트를 쓰지 않고 멈춘다. 노트는 release/ 아래에만 둔다
	assert.match(s.run(["--publish="]).stderr, /release\/ 아래 \.md/);
	s.write("notes/x.md", "# v0.1.0 — X\n");
	assert.match(s.run(["--publish", "notes/x.md"]).stderr, /release\/ 아래 \.md/);
	assert.match(s.run(["--publish", join(tmpdir(), "x.md")]).stderr, /release\/ 아래 \.md/);
	rmSync(join(s.root, "notes"), { recursive: true });
	const stale = s.note();
	s.git("commit", "-q", "--allow-empty", "-m", "fix: 고침");
	assert.match(s.run(["--publish", stale]).stderr, /맞지 않는다/);
	rmSync(join(s.root, stale));
	const n = s.note();
	const head = s.git("rev-parse", "HEAD");
	s.git("switch", "-q", "-c", "feature");
	assert.match(s.run(["--publish", n]).stderr, /기본 브랜치\(main\)에서 실행한다 \(현재 feature\)/);
	s.git("switch", "-q", "main");
	s.write("README.md", "changed\n");
	assert.match(s.run(["--publish", n]).stderr, /커밋하지 않은 변경/);
	s.git("checkout", "--", "README.md");
	assert.match(s.run(["--publish", n], { STUB_GH_AUTH_EXIT: "1" }).stderr, /gh auth login/);
	s.git("config", "--add", `url.${s.bare}.insteadOf`, "https://gitlab.com/o/r.git");
	s.git("remote", "set-url", "origin", "https://gitlab.com/o/r.git");
	assert.match(s.run(["--publish", n]).stderr, /GitHub 저장소가 아니다/);
	assert.equal(s.git("rev-parse", "HEAD"), head);
	assert.equal(s.git("tag", "-l"), "");
	assert.equal(s.git("status", "--porcelain"), "?? release/");
});

test("같은 버전 태그가 이미 있으면(다른 곳에서 먼저 릴리스) 커밋을 만들기 전에 멈춘다. 원격 태그도 fetch로 받아 본다", () => {
	const s = setup();
	const n = s.note();
	const head = s.git("rev-parse", "HEAD");
	// 다른 클론이 더 새 커밋에서 같은 버전을 먼저 발행해 원격에만 태그가 있다(HEAD에서 닿지 않는다)
	s.git("switch", "-q", "-c", "other");
	s.git("commit", "-q", "--allow-empty", "-m", "fix: 다른 클론");
	s.git("tag", "-a", "v0.1.0", "-m", "other");
	s.git("push", "-q", "origin", "v0.1.0");
	s.git("switch", "-q", "main");
	s.git("branch", "-qD", "other");
	s.git("tag", "-d", "v0.1.0");
	const r = s.run(["--publish", n]);
	assert.equal(r.status, 1);
	assert.match(r.stderr, /태그 v0\.1\.0가 이미 있다.*git pull/);
	assert.equal(s.git("rev-parse", "HEAD"), head);
	assert.equal(s.git("status", "--porcelain"), "?? release/", "package.json을 건드리지 않는다");
});

test("push가 실패하면 릴리스 커밋, 태그, version을 되돌리고 노트는 남긴다. Release 실패는 exit 2와 다시 만들 명령", () => {
	const s = setup();
	const n = s.note("--title", "First cut");
	const head = s.git("rev-parse", "HEAD");
	const hook = join(s.bare, "hooks/pre-receive");
	writeFileSync(hook, "#!/bin/sh\nexit 1\n");
	chmodSync(hook, 0o755);
	const failed = s.run(["--publish", n]);
	assert.equal(failed.status, 1);
	assert.match(failed.stderr, /되돌렸다/);
	assert.equal(s.git("rev-parse", "HEAD"), head);
	assert.equal(s.git("tag", "-l"), "");
	assert.equal(s.git("status", "--porcelain"), "?? release/", "올린 package.json version도 되돌린다");
	rmSync(hook);
	const noRelease = s.run(["--publish", n], { STUB_GH_EXIT: "1" });
	assert.equal(noRelease.status, 2);
	assert.match(noRelease.stderr, /태그 v0\.1\.0는 push됨.*tail -n \+2 release\/\S+ \| gh release create v0\.1\.0 -R o\/r --verify-tag --title 'v0\.1\.0 — First cut' --notes-file -/);
	assert.equal(s.remote("tag", "-l"), "v0.1.0");
});
