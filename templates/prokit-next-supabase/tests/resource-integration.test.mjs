import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { TEMPLATE_FILES } from "./helpers.mjs";

const GUARD = join(TEMPLATE_FILES, "scripts/resource-guard.mjs");
const DELEGATION = join(TEMPLATE_FILES, "scripts/delegation.mjs");
const DEV_CYCLE = join(TEMPLATE_FILES, "scripts/dev-cycle.mjs");

function repo() {
	const root = mkdtempSync(join(tmpdir(), "prokit-resource-integration-"));
	const git = (...args) =>
		execFileSync("git", args, { cwd: root, encoding: "utf8" });
	git("init", "-q", "-b", "main");
	git("config", "user.email", "test@example.com");
	git("config", "user.name", "test");
	mkdirSync(join(root, "src"));
	writeFileSync(join(root, "src", "index.js"), "export {};\n");
	git("add", ".");
	git("commit", "-qm", "initial");
	return root;
}

test("resource CLI는 check·run·clean의 종료 계약을 지키고 delegation snapshot을 남긴다", (t) => {
	const root = repo();
	t.after(() => rmSync(root, { recursive: true, force: true }));

	const check = spawnSync(process.execPath, [GUARD, "check"], {
		cwd: root,
		encoding: "utf8",
	});
	assert.equal(check.status, 0, check.stderr);
	assert.match(check.stdout, /"status":"(?:ok|warn)"/);

	const run = spawnSync(
		process.execPath,
		[
			GUARD,
			"run",
			"--kind",
			"verify",
			"--",
			process.execPath,
			"-e",
			"process.exit(7)",
		],
		{ cwd: root, encoding: "utf8" },
	);
	assert.equal(run.status, 7, run.stderr);

	const clean = spawnSync(process.execPath, [GUARD, "clean"], {
		cwd: root,
		encoding: "utf8",
	});
	assert.equal(clean.status, 0, clean.stderr);
	assert.match(clean.stdout, /"applied":false/);

	const snapshot = spawnSync(process.execPath, [DELEGATION, "snapshot"], {
		cwd: root,
		encoding: "utf8",
	});
	assert.equal(snapshot.status, 0, snapshot.stderr);
	assert.ok(JSON.parse(snapshot.stdout).manifestHash);
});

test("dev-cycle resource·delegation 명령은 원본 CLI의 종료 코드와 snapshot을 전달한다", (t) => {
	const root = repo();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const check = spawnSync(process.execPath, [DEV_CYCLE, "resource", "check"], {
		cwd: root,
		encoding: "utf8",
	});
	assert.equal(check.status, 0, check.stderr);
	const run = spawnSync(
		process.execPath,
		[
			DEV_CYCLE,
			"resource",
			"run",
			"--kind",
			"verify",
			"--",
			process.execPath,
			"-e",
			"process.exit(7)",
		],
		{ cwd: root, encoding: "utf8" },
	);
	assert.equal(run.status, 7, run.stderr);
	const capture = spawnSync(
		process.execPath,
		[DEV_CYCLE, "delegation", "capture"],
		{ cwd: root, encoding: "utf8" },
	);
	assert.equal(capture.status, 0, capture.stderr);
	assert.ok(JSON.parse(capture.stdout).manifestHash);
});

test("dev-cycle delegation resolve는 현재 git root의 실제 skill만 관측한다", (t) => {
	const root = repo();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	mkdirSync(join(root, ".agents/skills/brainstorming"), { recursive: true });
	writeFileSync(join(root, ".agents/skills/brainstorming/SKILL.md"), "# Brainstorming\n");
	writeFileSync(join(root, "skills-lock.json"), JSON.stringify({ skills: { brainstorming: { source: "local-test" } } }));
	const result = spawnSync(
		process.execPath,
		[DEV_CYCLE, "delegation", "resolve", "brainstorming"],
		{ cwd: join(root, "src"), encoding: "utf8" },
	);
	assert.equal(result.status, 1, result.stderr);
	const observed = JSON.parse(result.stdout);
	assert.equal(observed.inspectionOnly, true);
	assert.equal(observed.executable, false);
	assert.equal(observed.observation.name, "brainstorming");
	assert.match(observed.observation.canonicalLocation, /^file:\/\//);
	assert.equal(
		spawnSync(
			process.execPath,
			[DEV_CYCLE, "delegation", "resolve", "../outside"],
			{ cwd: join(root, "src"), encoding: "utf8" },
		).status,
		2,
	);
});

test("dev-cycle delegation capture는 하위 cwd에서도 git root 전체를 결속한다", (t) => {
	const root = repo();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	writeFileSync(join(root, "root.txt"), "root\n");
	writeFileSync(join(root, "src/sub.txt"), "sub\n");
	const result = spawnSync(
		process.execPath,
		[DEV_CYCLE, "delegation", "capture"],
		{ cwd: join(root, "src"), encoding: "utf8" },
	);
	assert.equal(result.status, 0, result.stderr);
	const snapshot = JSON.parse(result.stdout);
	assert.equal(snapshot.bindings.root, realpathSync(root));
	assert.equal(snapshot.bindings.gitRoot, realpathSync(root));
	assert.equal(snapshot.bindings.cwd, realpathSync(join(root, "src")));
	assert.deepEqual(
		snapshot.entries.filter((entry) => !entry.tracked).map((entry) => entry.path),
		["root.txt", "src/sub.txt"],
	);
});
