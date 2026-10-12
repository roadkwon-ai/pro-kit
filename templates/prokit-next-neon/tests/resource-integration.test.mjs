import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from "node:fs";
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
	writeFileSync(
		join(root, ".agents/skills/brainstorming/SKILL.md"),
		"# Brainstorming\n",
	);
	writeFileSync(
		join(root, "skills-lock.json"),
		JSON.stringify({ skills: { brainstorming: { source: "local-test" } } }),
	);
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
	assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
	const snapshot = JSON.parse(result.stdout);
	assert.equal(snapshot.bindings.root, realpathSync(root));
	assert.equal(snapshot.bindings.gitRoot, realpathSync(root));
	assert.equal(snapshot.bindings.cwd, realpathSync(join(root, "src")));
	assert.deepEqual(
		snapshot.entries
			.filter((entry) => !entry.tracked)
			.map((entry) => entry.path),
		["root.txt", "src/sub.txt"],
	);
});

function accept(root, options = {}) {
	const base = execFileSync("git", ["rev-parse", "HEAD"], {
		cwd: root,
		encoding: "utf8",
	}).trim();
	const check = options.check ?? [process.execPath, "-e", "process.exit(0)"];
	const providers = options.providers ?? [".claude/agents/prokit-reviewer.md"];
	const artifacts = options.artifacts ?? ["src/index.js"];
	const scopes = options.scopes ?? ["**"];
	const scopeArgs = scopes.flatMap((scope) => ["--scope", scope]);
	const providerArgs = providers.flatMap((provider) => [
		"--provider",
		provider,
	]);
	const artifactArgs = artifacts.flatMap((artifact) => [
		"--artifact",
		artifact,
	]);
	return spawnSync(
		process.execPath,
		[
			DEV_CYCLE,
			"delegation",
			"accept",
			"--base",
			base,
			...scopeArgs,
			"--focus",
			"src",
			"--contract",
			"technical acceptance",
			...providerArgs,
			...artifactArgs,
			"--check",
			JSON.stringify(check),
			...(options.extra ?? []),
		],
		{
			cwd: root,
			encoding: "utf8",
			env: { ...process.env, PATH: `${join(root, "bin")}:${process.env.PATH}` },
		},
	);
}

function reviewer(root) {
	mkdirSync(join(root, ".claude", "agents"), { recursive: true });
	mkdirSync(join(root, "bin"), { recursive: true });
	writeFileSync(
		join(root, ".claude", "agents", "prokit-reviewer.md"),
		"# prokit-reviewer source\n",
	);
	writeFileSync(
		join(root, "bin", "codex"),
		`#!/usr/bin/env node
import { existsSync, writeFileSync } from "node:fs";
const output = process.argv[process.argv.indexOf("--output-last-message") + 1];
const input = JSON.parse(process.argv.at(-1).split("\\n").at(-1));
if (existsSync("malformed-reviewer")) writeFileSync(output, "true");
else {
  if (existsSync("mutating-reviewer")) writeFileSync("src/index.js", "reviewer changed source\\n");
  if (existsSync("mutating-provider")) writeFileSync(".prokit/prokit-reviewer.md", "changed provider\\n");
  if (existsSync("mutating-artifact")) writeFileSync(".prokit/final.json", "changed artifact\\n");
  if (existsSync("live-child")) {
    const { spawn } = await import("node:child_process");
    spawn(process.execPath, ["-e", "setTimeout(() => {}, 2000)"], { stdio: "ignore" }).unref();
  }
  const rejected = existsSync("rejecting-reviewer");
  const highFinding = existsSync("high-finding");
  writeFileSync(output, JSON.stringify({ verdict: rejected ? "changes-required" : "approve", focus: "code", skills_read: [], actual_contract: input.contracts, integration_acceptance: rejected ? "changes-required" : "accept", max_severity: rejected ? "high" : "none", findings: rejected || highFinding ? [{ severity: "high", file: "src/index.js", line: 1, evidence: "fixture", fix: "fix" }] : [], limitations: highFinding ? ["fixture limitation"] : [], reused: false, ...input, provider_sources: input.provider_sources.map(({ name, ...source }) => ({ ...source, name })), artifacts: input.artifacts.map(({ path, ...artifact }) => ({ ...artifact, path })) }));
}
`,
	);
	chmodSync(join(root, "bin", "codex"), 0o755);
}

test("delegation accept는 명시 argv의 check·fresh reviewer를 guard로 실행해 기술 인수만 완료한다", (t) => {
	const root = repo();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	writeFileSync(join(root, "src", "index.js"), "export const ok = true;\n");
	reviewer(root);
	const result = accept(root);
	assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
	const output = JSON.parse(result.stdout);
	assert.equal(output.status, "complete");
	assert.equal(output.technicalAcceptance, "complete");
	assert.equal(output.userConfirmation, "pending");
	assert.equal(output.checks[0].executed, true);
	assert.equal(output.reviewer.reused, false);
	assert.equal(output.providerSources[0].contentHash.length, 64);
});

test("delegation accept는 실패 check·malformed reviewer·reviewer source 변경을 거부한다", (t) => {
	const failed = repo();
	t.after(() => rmSync(failed, { recursive: true, force: true }));
	writeFileSync(join(failed, "src", "index.js"), "changed\n");
	reviewer(failed);
	let result = accept(failed, {
		check: [process.execPath, "-e", "process.exit(3)"],
	});
	assert.equal(result.status, 1);
	assert.match(JSON.parse(result.stdout).problems[0], /check 실패/);

	const malformed = repo();
	t.after(() => rmSync(malformed, { recursive: true, force: true }));
	writeFileSync(join(malformed, "src", "index.js"), "changed\n");
	reviewer(malformed);
	writeFileSync(join(malformed, "malformed-reviewer"), "yes\n");
	result = accept(malformed);
	assert.equal(result.status, 1);
	assert.match(JSON.parse(result.stdout).problems[0], /JSON/);

	const rejected = repo();
	t.after(() => rmSync(rejected, { recursive: true, force: true }));
	writeFileSync(join(rejected, "src", "index.js"), "changed\n");
	reviewer(rejected);
	writeFileSync(join(rejected, "rejecting-reviewer"), "yes\n");
	result = accept(rejected);
	assert.equal(result.status, 1);
	assert.match(
		JSON.parse(result.stdout).problems[0],
		/기술 인수를 approve하지 않았다/,
	);

	const mutating = repo();
	t.after(() => rmSync(mutating, { recursive: true, force: true }));
	writeFileSync(join(mutating, "src", "index.js"), "changed\n");
	reviewer(mutating);
	writeFileSync(join(mutating, "mutating-reviewer"), "yes\n");
	result = accept(mutating);
	assert.equal(result.status, 1);
	assert.match(
		JSON.parse(result.stdout).problems[0],
		/reviewer가 product를 변경/,
	);

	result = accept(failed, { extra: ["--context", "forged.json"] });
	assert.equal(result.status, 2);
	assert.match(result.stderr, /사용법/);
});

test("delegation accept는 high finding·scope 밖 변경·ignored provider/artifact 변경·남은 child를 거부한다", (t) => {
	const high = repo();
	t.after(() => rmSync(high, { recursive: true, force: true }));
	writeFileSync(join(high, "src", "index.js"), "changed\n");
	reviewer(high);
	writeFileSync(join(high, "high-finding"), "yes\n");
	let result = accept(high);
	assert.equal(result.status, 1);
	const output = JSON.parse(result.stdout);
	assert.match(output.problems[0], /high·critical/);
	assert.equal(output.reviewer.findings[0].severity, "high");
	assert.deepEqual(output.reviewer.limitations, ["fixture limitation"]);

	const outside = repo();
	t.after(() => rmSync(outside, { recursive: true, force: true }));
	writeFileSync(join(outside, "src", "index.js"), "changed\n");
	writeFileSync(join(outside, "outside.txt"), "outside\n");
	reviewer(outside);
	result = accept(outside, { scopes: ["src/**"] });
	assert.equal(result.status, 1);
	assert.match(JSON.parse(result.stdout).problems[0], /scope 밖/);

	const ignored = (name) => {
		const root = repo();
		t.after(() => rmSync(root, { recursive: true, force: true }));
		writeFileSync(join(root, ".git", "info", "exclude"), ".prokit/\n");
		writeFileSync(join(root, "src", "index.js"), "changed\n");
		reviewer(root);
		mkdirSync(join(root, ".prokit"), { recursive: true });
		writeFileSync(join(root, ".prokit", "final.json"), "original artifact\n");
		writeFileSync(join(root, name), "yes\n");
		return root;
	};
	const artifact = ignored("mutating-artifact");
	result = accept(artifact, { artifacts: [".prokit/final.json"] });
	assert.equal(result.status, 1);
	assert.match(JSON.parse(result.stdout).problems[0], /지정 artifact/);

	const provider = ignored("mutating-provider");
	writeFileSync(
		join(provider, ".prokit", "prokit-reviewer.md"),
		"# ignored reviewer\n",
	);
	result = accept(provider, {
		providers: [".prokit/prokit-reviewer.md"],
		artifacts: [".prokit/final.json"],
	});
	assert.equal(result.status, 1);
	assert.match(JSON.parse(result.stdout).problems[0], /provider source/);

	const child = repo();
	t.after(() => rmSync(child, { recursive: true, force: true }));
	writeFileSync(join(child, "src", "index.js"), "changed\n");
	reviewer(child);
	writeFileSync(join(child, "live-child"), "yes\n");
	result = accept(child);
	assert.equal(result.status, 1);
	assert.match(JSON.parse(result.stdout).problems[0], /fresh Codex reviewer/);
});

test("남은 reviewer child가 있으면 임시 review output은 child 종료 전 지우지 않는다", async (t) => {
	const root = repo();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	writeFileSync(join(root, "src", "index.js"), "changed\n");
	reviewer(root);
	writeFileSync(join(root, "live-child"), "yes\n");
	const before = new Set(
		readdirSync(tmpdir()).filter((name) =>
			name.startsWith("prokit-accept-review-"),
		),
	);
	const result = accept(root);
	assert.equal(result.status, 1);
	const retained = readdirSync(tmpdir())
		.filter((name) => name.startsWith("prokit-accept-review-"))
		.filter((name) => !before.has(name));
	assert.equal(retained.length, 1, result.stdout);
	await new Promise((done) => setTimeout(done, 2_100));
	rmSync(join(tmpdir(), retained[0]), { recursive: true, force: true });
});
