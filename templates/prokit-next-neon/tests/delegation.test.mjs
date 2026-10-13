import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	realpathSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
	captureSnapshot,
	main,
	observeProvider,
	resolveProvider,
	reviewReuseKey,
	validateDelegationPacket,
} from "../files/scripts/delegation.mjs";

function repo() {
	const root = mkdtempSync(join(tmpdir(), "delegation-"));
	const git = (...args) =>
		execFileSync("git", args, { cwd: root, encoding: "utf8" });
	const write = (path, value = "x\n") => {
		mkdirSync(join(root, path, ".."), { recursive: true });
		writeFileSync(join(root, path), value);
	};
	git("init", "-q", "-b", "main");
	git("config", "user.email", "test@example.com");
	git("config", "user.name", "test");
	write("src/original.txt");
	git("add", ".");
	git("commit", "-qm", "initial");
	return { root, git, write };
}

function provider(name, overrides = {}) {
	const content = overrides.content ?? `# ${name}\n`;
	const hash = overrides.contentHash ?? sha256(content);
	return {
		name,
		origin: "https://skills.example.test/catalog",
		canonicalLocation: `skill://${name}`,
		contentHash: hash,
		scope: "project",
		type: "skill",
		mode: "read-only",
		host: "local",
		dependencies: [],
		capabilities: [],
		content,
		...overrides,
	};
}

function sha256(value) {
	return execFileSync(
		process.execPath,
		[
			"-e",
			"const c=require('crypto');process.stdout.write(c.createHash('sha256').update(process.argv[1]).digest('hex'))",
			String(value),
		],
		{ encoding: "utf8" },
	).trim();
}

function context(overrides = {}) {
	return {
		scope: "project",
		resolver: (ref) => ({
			...ref,
		}),
		availableTools: ["node"],
		allowedCapabilities: ["filesystem:read"],
		allowedSideEffects: [],
		allowedHosts: ["local"],
		allowedModes: ["read-only"],
		cwd: "/workspace",
		environment: { node: "24", platform: "darwin" },
		environmentFingerprint: "trusted-environment",
		runnerReceipts: [{ command: "node --test", exitCode: 0 }],
		verifyReceipt: (bindings) => ({
			ok: true,
			identityDigest: bindings.identityDigest,
			key: bindings.key,
			effects: bindings.effects,
		}),
		verifyAuthority: (bindings) => ({
			ok: true,
			key: bindings.key,
			reused: false,
		}),
		approvedPaths: ["src/**"],
		...overrides,
	};
}

function packet(baseline, overrides = {}) {
	return {
		taskId: "task-1",
		runId: "run-1",
		status: "complete",
		selectedProviders: [],
		allowedPaths: ["src/**"],
		constraints: [],
		environmentRefs: ["node"],
		environmentFingerprint: "trusted-environment",
		changes: [],
		evidence: {
			report: "src/original.txt changed",
			commands: [
				{
					command: "node --test",
					exitCode: 0,
					executed: true,
					taskId: "task-1",
					runId: "run-1",
					argv: ["node", "--test"],
					cwd: "/workspace",
					environmentFingerprint: "trusted-environment",
					before: baseline.manifestHash,
					after: baseline.manifestHash,
					artifacts: [],
					effects: [],
					identityDigest: "test-receipt",
				},
			],
			coverage: { changed: 1 },
			limitations: [],
			artifacts: [],
			focus: ["src"],
			snapshot: baseline.manifestHash,
		},
		reviewCoverage: [],
		unresolved: [],
		sideEffects: [],
		nextAction: null,
		contracts: ["contract"],
		mainGate: { reviewer: "prokit-reviewer", reused: false },
		baseline,
		...overrides,
	};
}

function changes(before, after) {
	const previous = new Map(before.entries.map((entry) => [entry.path, entry]));
	const current = new Map(after.entries.map((entry) => [entry.path, entry]));
	return [...new Set([...previous.keys(), ...current.keys()])]
		.sort()
		.flatMap((path) => {
			const oldEntry = previous.get(path);
			const newEntry = current.get(path);
			if (JSON.stringify(oldEntry) === JSON.stringify(newEntry)) return [];
			return [
				{
					path,
					kind: !oldEntry ? "added" : !newEntry ? "deleted" : "modified",
					before: oldEntry ?? null,
					after: newEntry ?? null,
				},
			];
		});
}

test("사용자 exact ref가 프로젝트 정본·접근 가능한 동명 skill보다 우선한다", () => {
	const user = provider("lint", {
		origin: "custom",
		canonicalLocation: "skill://user/lint",
	});
	const project = provider("lint", {
		canonicalLocation: "skill://project/lint",
		content: "# project lint\n",
	});
	const accessible = provider("lint", {
		canonicalLocation: "skill://global/lint",
	});
	const found = resolveProvider(
		{ name: "lint", origin: "custom", canonicalLocation: "skill://user/lint" },
		context({
			userProviders: [user],
			projectProviders: [project],
			providers: [accessible],
		}),
	);
	assert.equal(found.ok, true);
	assert.equal(found.source, "user");
	assert.equal(found.provider.canonicalLocation, "skill://user/lint");
	assert.notEqual(project.contentHash, user.contentHash);
});

test("manifest 등록은 실행 whitelist가 아니며 local custom provider도 검증한다", () => {
	const custom = provider("local", {
		origin: "local-custom",
		canonicalLocation: "file:///workspace/.agents/skills/local/SKILL.md",
	});
	const found = resolveProvider(
		"local",
		context({ providers: [custom], manifest: [] }),
	);
	assert.equal(found.ok, true);
	assert.equal(found.source, "accessible");
});

test("resolver가 준 실제 content와 readonly metadata를 함께 검증한다", () => {
	const skill = provider("safe");
	const badHash = resolveProvider(
		"safe",
		context({
			providers: [skill],
			resolver: () => ({ ...skill, content: "changed\n" }),
		}),
	);
	assert.equal(badHash.ok, false);
	assert.match(badHash.reason, /contentHash/);
	const badMetadata = resolveProvider(
		"safe",
		context({
			providers: [skill],
			resolver: () => ({ ...skill, origin: "other" }),
		}),
	);
	assert.equal(badMetadata.ok, false);
	assert.match(badMetadata.reason, /origin/);
});

test("누락·순환 dependency와 지원하지 않는 capability/tool/side effect를 거부한다", () => {
	const missing = provider("missing", { dependencies: ["absent"] });
	assert.equal(
		resolveProvider("missing", context({ providers: [missing] })).ok,
		false,
	);
	const a = provider("a", { dependencies: ["b"] });
	const b = provider("b", { dependencies: ["a"] });
	assert.match(
		resolveProvider("a", context({ providers: [a, b] })).reason,
		/순환/,
	);
	const cap = provider("cap", { capabilities: ["network"] });
	assert.match(
		resolveProvider("cap", context({ providers: [cap] })).reason,
		/capability/,
	);
	const tool = provider("tool", { tools: ["docker"] });
	assert.match(
		resolveProvider("tool", context({ providers: [tool] })).reason,
		/tool/,
	);
	const effect = provider("effect", { sideEffects: ["deploy"] });
	assert.match(
		resolveProvider("effect", context({ providers: [effect] })).reason,
		/side effect/,
	);
});

test("plugin/resource URI는 주어진 resolver로만 읽고 filename escape를 거부한다", () => {
	const plugin = provider("plugin", {
		canonicalLocation: "plugin://safe/resource",
	});
	assert.equal(
		resolveProvider("plugin", context({ providers: [plugin] })).ok,
		true,
	);
	const escapedProvider = provider("escape", {
		canonicalLocation: "../secret/SKILL.md",
	});
	assert.equal(
		resolveProvider("escape", context({ providers: [escapedProvider] })).ok,
		false,
	);
});

test("snapshot은 tracked/untracked의 hash·mode·link와 initial dirty 기준을 보존한다", () => {
	const { root, git, write } = repo();
	write("src/original.txt", "initial dirty\n");
	const baseline = captureSnapshot(root);
	write("src/new.txt", "new\n");
	symlinkSync("new.txt", join(root, "src/link.txt"));
	git("mv", "src/original.txt", "src/renamed.txt");
	chmodSync(join(root, "src/renamed.txt"), 0o755);
	const snapshot = captureSnapshot(root);
	assert.equal(
		baseline.entries.find((entry) => entry.path === "src/original.txt").hash,
		sha256("initial dirty\n"),
	);
	assert.match(
		baseline.entries.find((entry) => entry.path === "src/original.txt").status,
		/M/,
	);
	assert.equal(
		snapshot.entries.find((entry) => entry.path === "src/link.txt").kind,
		"link",
	);
	assert.equal(
		snapshot.entries.find((entry) => entry.path === "src/renamed.txt").mode,
		"755",
	);
	assert.equal(
		snapshot.entries.find((entry) => entry.path === "src/new.txt").tracked,
		false,
	);
	const task = packet(baseline);
	task.changes = changes(baseline, snapshot);
	task.evidence.commands[0].after = snapshot.manifestHash;
	const result = validateDelegationPacket(root, task, context({ baseline }));
	assert.equal(result.ok, true, result.problems.join("\n"));
	assert.deepEqual(
		result.actualChanges.map((change) => change.path),
		["src/link.txt", "src/new.txt", "src/original.txt", "src/renamed.txt"],
	);
});

test("전체 실제 delta와 새 untracked·scope 밖 파일은 packet 주장과 무관하게 차단한다", () => {
	const { root, write } = repo();
	const baseline = captureSnapshot(root);
	write("src/ok.txt");
	write("secrets.txt");
	const result = validateDelegationPacket(
		root,
		packet(baseline, { changes: ["src/ok.txt"] }),
		context({ baseline }),
	);
	assert.equal(result.ok, false);
	assert.ok(result.problems.some((problem) => problem.includes("secrets.txt")));
});

test("artifact hash와 packet 환경 fingerprint가 실제 상태와 다르면 실패한다", () => {
	const { root, write } = repo();
	const baseline = captureSnapshot(root);
	write("src/report.txt", "evidence\n");
	const env = context();
	const result = validateDelegationPacket(
		root,
		packet(baseline, {
			environmentFingerprint: "forged",
			evidence: {
				...packet(baseline).evidence,
				artifacts: [{ path: "src/report.txt", hash: "forged" }],
			},
		}),
		{ ...env, baseline },
	);
	assert.equal(result.ok, false);
	assert.ok(
		result.problems.some((problem) =>
			problem.includes("environmentFingerprint"),
		),
	);
	assert.ok(
		result.problems.some((problem) => problem.includes("artifact hash")),
	);
});

test("실패·blocked·unresolved와 재사용된 prokit gate를 PASS로 바꾸지 않는다", () => {
	const { root } = repo();
	const baseline = captureSnapshot(root);
	for (const status of ["failed", "blocked", "incomplete"]) {
		const result = validateDelegationPacket(
			root,
			packet(baseline, { status, nextAction: "fix" }),
			context({ baseline }),
		);
		assert.equal(result.ok, false, status);
	}
	const result = validateDelegationPacket(
		root,
		packet(baseline, {
			unresolved: ["test failure"],
			reviewCoverage: [{ reviewer: "prokit-reviewer", reused: true }],
		}),
		context({ baseline }),
	);
	assert.equal(result.ok, false);
	assert.ok(result.problems.some((problem) => problem.includes("prokit")));
});

test("실패한 검사(exit 1)는 같은 receipt가 있어도 완료 증거가 아니다", () => {
	const { root } = repo();
	const baseline = captureSnapshot(root);
	const run = (exitCode) => {
		const task = packet(baseline);
		task.evidence.commands[0].exitCode = exitCode;
		return validateDelegationPacket(
			root,
			task,
			context({
				baseline,
				runnerReceipts: [{ command: "node --test", exitCode }],
			}),
		);
	};
	assert.equal(run(0).completionReady, true);
	const failed = run(1);
	assert.equal(failed.ok, false);
	assert.equal(failed.completionReady, false);
	assert.ok(failed.problems.some((problem) => problem.includes("exit 1")));
});

test("diff CLI는 기준 snapshot 뒤 배정 밖 변경·커밋을 exit 1로, 읽을 수 없는 입력을 exit 2로 알린다", () => {
	const { root, git, write } = repo();
	const log = console.log;
	const error = console.error;
	let output = "";
	console.log = (value) => {
		output = value;
	};
	console.error = () => {};
	const diff = (...args) => {
		const code = main(["diff", ...args], root);
		return { code, result: code === 2 ? null : JSON.parse(output) };
	};
	try {
		assert.equal(main(["capture"], root), 0);
		// gitignore 밖의 기준 파일도 자기 자신은 변경으로 세지 않는다.
		const captured = output;
		write("before.json", captured);
		write("src/original.txt", "changed\n");
		write("src/new.txt");
		let r = diff("before.json", "--scope", "src/**");
		assert.equal(r.code, 0);
		assert.equal(r.result.baseline, JSON.parse(captured).manifestHash);
		assert.deepEqual(r.result.changed, [
			{ path: "src/new.txt", kind: "added" },
			{ path: "src/original.txt", kind: "modified" },
		]);
		write("README.md", "outside\n");
		r = diff("before.json", "--scope", "src/**");
		assert.equal(r.code, 1);
		assert.deepEqual(r.result.outside, ["README.md"]);
		// scope 없이 부르면 리뷰·QA처럼 어떤 변경도 허용하지 않는다.
		r = diff("before.json");
		assert.equal(r.code, 1);
		assert.equal(r.result.outside.length, 3);
		rmSync(join(root, "src/original.txt"));
		r = diff("before.json", "--scope", "src/**");
		assert.ok(
			r.result.changed.some(
				({ path, kind }) => path === "src/original.txt" && kind === "deleted",
			),
		);
		git("add", "README.md");
		git("commit", "-qm", "수행자 커밋");
		r = diff("before.json", "--scope", "**");
		assert.equal(r.code, 1);
		assert.equal(r.result.headChanged, true);
		assert.equal(diff("missing.json").code, 2);
		// 수행자가 entries만 고치고 manifestHash를 남겨도 기준 파일로 받지 않는다.
		const forged = JSON.parse(captured);
		forged.entries = forged.entries.filter(
			({ path }) => path !== "src/original.txt",
		);
		for (const broken of [
			"null",
			'{"valid":true,"entries":{}}',
			JSON.stringify(forged),
		]) {
			write("broken.json", broken);
			assert.equal(diff("broken.json").code, 2, broken);
		}
		assert.equal(diff("before.json", "--scope", "../x").code, 2);
		assert.equal(diff("before.json", "--scope").code, 2);
	} finally {
		console.log = log;
		console.error = error;
	}
});

test("review reuse key는 제품·증거·기준·focus·contract·provider·reviewer·환경을 모두 묶고 self 결과는 제외한다", () => {
	const { root } = repo();
	const baseline = captureSnapshot(root);
	const external = provider("external");
	const task = packet(baseline, { selectedProviders: ["external"] });
	const validation = validateDelegationPacket(
		root,
		task,
		context({
			baseline,
			providers: [external],
		}),
	);
	assert.equal(validation.ok, true, validation.problems.join("\n"));
	const base = {
		kind: "external",
		validation,
		base: "base",
		baseline: validation.baselineHash,
		focus: ["src"],
		contracts: ["contract"],
		reviewerProfile: "external",
	};
	const key = reviewReuseKey(base);
	for (const [field, value] of Object.entries({
		base: "b2",
		baseline: "b3",
		focus: ["other"],
		contracts: ["other"],
		reviewerProfile: "other",
	})) {
		assert.notEqual(reviewReuseKey({ ...base, [field]: value }), key, field);
	}
	for (const [field, value] of Object.entries({
		productHash: "p2",
		evidencePacketHash: "e2",
		providerActualHashes: ["p3"],
		environmentFingerprint: "e3",
	})) {
		assert.notEqual(
			reviewReuseKey({
				...base,
				validation: { ...base.validation, [field]: value },
			}),
			key,
			field,
		);
	}
	assert.equal(
		reviewReuseKey({ ...base, reviewerProfile: "prokit-reviewer" }),
		null,
	);
	const { root: evidenceRoot } = repo();
	const evidenceBaseline = captureSnapshot(evidenceRoot);
	const first = validateDelegationPacket(
		evidenceRoot,
		packet(evidenceBaseline, {
			evidence: {
				...packet(evidenceBaseline).evidence,
				reviewerResults: [{ reviewer: "self", output: "one" }],
			},
		}),
		context({ baseline: evidenceBaseline, reviewerId: "self" }),
	);
	const second = validateDelegationPacket(
		evidenceRoot,
		packet(evidenceBaseline, {
			evidence: {
				...packet(evidenceBaseline).evidence,
				reviewerResults: [{ reviewer: "self", output: "two" }],
			},
		}),
		context({ baseline: evidenceBaseline, reviewerId: "self" }),
	);
	assert.equal(first.evidencePacketHash, second.evidencePacketHash);
});

test("packet은 Main context의 baseline·ownership·runner receipt를 넓힐 수 없다", () => {
	const { root, write } = repo();
	const trustedBaseline = captureSnapshot(root);
	write("secrets.txt", "outside\n");
	const forgedBaseline = captureSnapshot(root);
	const result = validateDelegationPacket(
		root,
		packet(forgedBaseline, { allowedPaths: ["**"] }),
		context({
			baseline: trustedBaseline,
			approvedPaths: ["src/**"],
			runnerReceipts: [],
		}),
	);
	assert.equal(result.ok, false);
	assert.ok(result.problems.some((problem) => problem.includes("baseline")));
	assert.ok(result.problems.some((problem) => problem.includes("secrets.txt")));
	assert.ok(result.problems.some((problem) => problem.includes("receipt")));
});

test("provider 실제 계약은 identity·mode·host·권한 전체를 resolver로 확인한다", () => {
	const skill = provider("strict", { capabilities: ["filesystem:read"] });
	const result = resolveProvider(
		"strict",
		context({
			providers: [skill],
			resolver: () => {
				const { host, ...actual } = skill;
				return actual;
			},
		}),
	);
	assert.equal(result.ok, false);
	assert.match(result.reason, /mode|host|capabilities/);
});

test("git 실패·빈 snapshot과 external proof 없는 reuse는 완료로 승인하지 않는다", () => {
	const root = mkdtempSync(join(tmpdir(), "delegation-no-git-"));
	const empty = captureSnapshot(root);
	const invalid = validateDelegationPacket(
		root,
		packet(empty),
		context({
			baseline: empty,
			approvedPaths: ["src/**"],
			runnerReceipts: [{ command: "node --test", exitCode: 0 }],
		}),
	);
	assert.equal(invalid.ok, false);
	assert.ok(invalid.problems.some((problem) => problem.includes("git")));
	assert.equal(reviewReuseKey({ reviewerProfile: "external" }), null);
	assert.equal(
		reviewReuseKey({
			kind: "external",
			validation: {
				ok: true,
				productHash: "product",
				evidencePacketHash: "evidence",
				providerActualHashes: ["provider"],
				environmentFingerprint: "env",
				baselineHash: "baseline",
				authorityVerified: true,
				authorityProofKey: "proof",
			},
			base: "base",
			baseline: "baseline",
			focus: ["src"],
			contracts: ["contract"],
			reviewerProfile: "external",
		}),
		null,
	);
});

test("같은 tier의 동명 provider는 모호하면 거부하고 resolver만으로 직접 위치를 받는다", () => {
	const first = provider("same", { canonicalLocation: "skill://first" });
	const second = provider("same", { canonicalLocation: "skill://second" });
	assert.equal(
		resolveProvider("same", context({ providers: [first, second] })).ok,
		false,
	);
	const direct = provider("direct", {
		canonicalLocation: "file:///workspace/custom/SKILL.md",
	});
	const found = resolveProvider(
		direct.canonicalLocation,
		context({
			resolver: (ref) =>
				ref.canonicalLocation === direct.canonicalLocation ? direct : null,
		}),
	);
	assert.equal(found.ok, true);
});

test("가짜 성공 receipt와 빈 coverage는 완료 증거가 될 수 없다", () => {
	const { root } = repo();
	const baseline = captureSnapshot(root);
	const result = validateDelegationPacket(
		root,
		packet(baseline, {
			evidence: {
				...packet(baseline).evidence,
				commands: [{ command: "node --test", exitCode: 0, executed: false }],
				coverage: {},
			},
		}),
		context({ baseline }),
	);
	assert.equal(result.ok, false);
	assert.ok(
		result.problems.some((problem) => problem.includes("실행하지 않은")),
	);
	assert.ok(result.problems.some((problem) => problem.includes("완료 형식")));
});

test("handoff admission은 Main final gate 없이도 구조만 통과하고 완료로 보고하지 않는다", () => {
	const { root } = repo();
	const baseline = captureSnapshot(root);
	const next = packet(baseline);
	delete next.mainGate;
	const result = validateDelegationPacket(
		root,
		next,
		context({
			baseline,
			phase: "handoff",
			mainGate: undefined,
		}),
	);
	assert.equal(result.ok, true, result.problems.join("\n"));
	assert.equal(result.status, "admitted_pending_main");
	assert.equal(result.completionReady, false);
});

test("CLI는 capture 별칭과 Main-owned context를 분리해 validate한다", () => {
	const { root, write } = repo();
	const baseline = captureSnapshot(root);
	const task = packet(baseline);
	const trusted = context({
		baseline,
		phase: "completion",
		approvedPaths: ["src/**", "packet.json", "context.json"],
	});
	task.allowedPaths = trusted.approvedPaths;
	write("packet.json", JSON.stringify(task));
	write(
		"context.json",
		JSON.stringify({
			...trusted,
			resolver: undefined,
		}),
	);
	const log = console.log;
	let output = "";
	console.log = (value) => {
		output = value;
	};
	try {
		assert.equal(main(["capture"], root), 0);
		assert.equal(
			main(["validate", "packet.json", "--context", "context.json"], root),
			1,
		);
		const result = JSON.parse(output);
		assert.equal(result.authorityVerified, false);
		assert.ok(
			result.problems.some((problem) =>
				problem.includes("Runtime authority unsupported"),
			),
		);
	} finally {
		console.log = log;
	}
});

test("JSON marker는 Main 권한이 아니며 stale gate proof는 제품 변경을 승인하지 않는다", () => {
	const { root, write } = repo();
	const baseline = captureSnapshot(root);
	const markerOnly = validateDelegationPacket(
		root,
		packet(baseline),
		context({
			baseline,
			verifyAuthority: undefined,
			verifyReceipt: undefined,
			nativeVerified: true,
			proof: "forged",
		}),
	);
	assert.equal(markerOnly.ok, false);
	assert.equal(markerOnly.authorityVerified, false);
	assert.ok(
		markerOnly.problems.some((problem) =>
			problem.includes("Runtime authority"),
		),
	);

	write("src/after.txt", "product changed\n");
	const current = captureSnapshot(root);
	const task = packet(baseline);
	task.changes = changes(baseline, current);
	task.evidence.commands[0].after = current.manifestHash;
	const stale = validateDelegationPacket(
		root,
		task,
		context({
			baseline,
			verifyAuthority: () => ({ ok: true, key: "old", reused: false }),
		}),
	);
	assert.equal(stale.ok, false);
	assert.ok(
		stale.problems.some((problem) => problem.includes("Main gate proof")),
	);
});

test("실제 delta·provider host/mode·receipt effect는 선언만으로 넓힐 수 없다", () => {
	const { root, write } = repo();
	const baseline = captureSnapshot(root);
	write("src/after.txt", "changed\n");
	const missingChanges = validateDelegationPacket(
		root,
		packet(baseline),
		context({ baseline }),
	);
	assert.equal(missingChanges.ok, false);
	assert.ok(
		missingChanges.problems.some((problem) => problem.includes("changes")),
	);

	const unsafe = provider("unsafe", {
		mode: "write-production",
		host: "production-root",
	});
	const current = captureSnapshot(root);
	const task = packet(baseline, { selectedProviders: ["unsafe"] });
	task.changes = changes(baseline, current);
	task.evidence.commands[0].after = current.manifestHash;
	const result = validateDelegationPacket(
		root,
		task,
		context({
			baseline,
			providers: [unsafe],
			verifyReceipt: (bindings) => ({
				ok: true,
				identityDigest: bindings.identityDigest,
				key: bindings.key,
				effects: ["gh release"],
			}),
		}),
	);
	assert.equal(result.ok, false);
	assert.ok(
		result.problems.some((problem) => problem.includes("provider mode")),
	);
	assert.ok(result.problems.some((problem) => problem.includes("sideEffects")));
});

test("dependency provider도 Main host/mode 정책을 통과해야 한다", () => {
	const { root } = repo();
	const baseline = captureSnapshot(root);
	const child = provider("child", {
		mode: "write-production",
		host: "production-root",
	});
	const parent = provider("parent", { dependencies: ["child"] });
	const task = packet(baseline, { selectedProviders: ["parent"] });
	const result = validateDelegationPacket(
		root,
		task,
		context({
			baseline,
			providers: [parent, child],
		}),
	);
	assert.equal(result.ok, false);
	assert.ok(
		result.problems.some((problem) => problem.includes("provider mode")),
	);
});

test("review reuse는 symbol을 복사하거나 결과를 바꿔도 검증한 canonical 값만 쓴다", () => {
	const { root } = repo();
	const baseline = captureSnapshot(root);
	const external = provider("external");
	const validation = validateDelegationPacket(
		root,
		packet(baseline, { selectedProviders: ["external"] }),
		context({ baseline, providers: [external] }),
	);
	const input = {
		kind: "external",
		validation,
		base: "base",
		baseline: validation.baselineHash,
		focus: ["src"],
		contracts: ["contract"],
		reviewerProfile: "external",
	};
	const key = reviewReuseKey(input);
	const copied = { ...validation, productHash: "forged" };
	assert.equal(reviewReuseKey({ ...input, validation: copied }), null);
	validation.productHash = "forged";
	assert.equal(reviewReuseKey(input), key);
});

test("completion gate와 receipt proof는 모든 canonical binding을 요구한다", () => {
	const { root } = repo();
	const baseline = captureSnapshot(root);
	const task = packet(baseline, {
		contracts: [],
		mainGate: { reused: false },
	});
	let receiptBindings;
	const result = validateDelegationPacket(
		root,
		task,
		context({
			baseline,
			verifyReceipt: (bindings) => {
				receiptBindings = bindings;
				return {
					ok: true,
					identityDigest: bindings.identityDigest,
					key: bindings.key,
					effects: bindings.effects,
				};
			},
		}),
	);
	assert.equal(result.ok, false);
	assert.ok(result.problems.some((problem) => problem.includes("reviewer")));
	assert.ok(result.problems.some((problem) => problem.includes("contracts")));
	assert.equal(receiptBindings.command, "node --test");
	assert.equal(receiptBindings.exitCode, 0);
	assert.equal(receiptBindings.executed, true);
});

test("self reviewer 태그가 붙은 실제 command·artifact는 증거 해시에 남는다", () => {
	const { root, git, write } = repo();
	write("src/alt.txt", "alt\n");
	git("add", "src/alt.txt");
	git("commit", "-qm", "artifact");
	const baseline = captureSnapshot(root);
	const external = provider("external");
	const first = packet(baseline, { selectedProviders: ["external"] });
	first.evidence.commands[0].reviewer = "self";
	first.evidence.artifacts = [
		{
			path: "src/original.txt",
			hash: sha256("x\n"),
			reviewer: "self",
		},
	];
	first.evidence.commands[0].artifacts = first.evidence.artifacts;
	const second = packet(baseline, { selectedProviders: ["external"] });
	second.evidence.commands[0] = {
		...second.evidence.commands[0],
		command: "node --test alt",
		argv: ["node", "--test", "alt"],
		reviewer: "self",
	};
	second.evidence.artifacts = [
		{
			path: "src/alt.txt",
			hash: sha256("alt\n"),
			reviewer: "self",
		},
	];
	second.evidence.commands[0].artifacts = second.evidence.artifacts;
	const common = { baseline, providers: [external], reviewerId: "self" };
	const left = validateDelegationPacket(root, first, context(common));
	const right = validateDelegationPacket(
		root,
		second,
		context({
			...common,
			runnerReceipts: [{ command: "node --test alt", exitCode: 0 }],
		}),
	);
	assert.equal(left.ok, true, left.problems.join("\n"));
	assert.equal(right.ok, true, right.problems.join("\n"));
	assert.notEqual(left.evidencePacketHash, right.evidencePacketHash);
	assert.notEqual(left.authorityProofKey, right.authorityProofKey);
	const reuse = (validation) =>
		reviewReuseKey({
			kind: "external",
			validation,
			base: "base",
			baseline: validation.baselineHash,
			focus: ["src"],
			contracts: ["contract"],
			reviewerProfile: "external",
		});
	assert.notEqual(reuse(left), reuse(right));
});

test("설치·로컬 skill은 lock을 출처 힌트로만 관측하고 inspection 없이는 실행하지 않는다", () => {
	const { root, git, write } = repo();
	write(".agents/skills/brainstorming/SKILL.md", "# Brainstorming\n");
	write(".agents/skills/oneoff/SKILL.md", "# One-off\n");
	write(
		"skills-lock.json",
		JSON.stringify({
			skills: {
				brainstorming: {
					source: "obra/superpowers",
				},
			},
		}),
	);
	git("add", ".");
	git("commit", "-qm", "skills");
	const observed = observeProvider("brainstorming", { root, scope: "project" });
	assert.equal(observed.ok, true);
	assert.equal(observed.observation.origin, "obra/superpowers");
	assert.equal("lockHashMatches" in observed.observation, false);
	const oneoff = observeProvider("oneoff", { root, scope: "project" });
	assert.equal(oneoff.ok, true);
	assert.match(oneoff.observation.origin, /^local:/);
	const inspectOnly = resolveProvider("brainstorming", {
		...context({ root, scope: "project", inspectOnly: true }),
	});
	assert.equal(inspectOnly.ok, false);
	assert.equal(inspectOnly.observed, true);
	assert.equal(inspectOnly.executable, false);
	assert.equal(inspectOnly.inspectionOnly, true);
	assert.equal(
		resolveProvider("brainstorming", context({ root, scope: "project" })).ok,
		false,
	);
	const executable = resolveProvider(
		"brainstorming",
		context({
			root,
			scope: "project",
			requestedScope: "project",
			actualRuntime: { mode: "read-only", host: "local" },
			inspectSource: (observation) => ({
				name: observation.name,
				origin: observation.origin,
				canonicalLocation: observation.canonicalLocation,
				contentHash: observation.contentHash,
				scope: "project",
				type: "skill",
				mode: "read-only",
				host: "local",
				dependencies: [],
				capabilities: [],
				tools: [],
				sideEffects: [],
			}),
		}),
	);
	assert.equal(executable.ok, true);
	assert.equal(executable.source, "observed");
	write("policy.json", JSON.stringify({ scope: "project" }));
	const log = console.log;
	let output = "";
	console.log = (value) => {
		output = value;
	};
	try {
		assert.equal(
			main(["resolve", "brainstorming", "--context", "policy.json"], root),
			1,
		);
	} finally {
		console.log = log;
	}
	const cli = JSON.parse(output);
	assert.equal(cli.inspectionOnly, true);
	assert.equal(cli.observation.contentHash, observed.observation.contentHash);
});

test("관측 경로 이탈·변조 lock·미승인 mode은 실행 provider가 될 수 없다", () => {
	const { root, write } = repo();
	write(".agents/skills/local/SKILL.md", "# Local\n");
	write(
		"skills-lock.json",
		JSON.stringify({
			skills: { local: { source: "custom", computedHash: "forged" } },
		}),
	);
	assert.equal(observeProvider("../secret/SKILL.md", { root }).ok, false);
	const changed = observeProvider("local", { root, scope: "project" });
	assert.equal(changed.observation.origin, "custom");
	assert.equal("lockHashMatches" in changed.observation, false);
	const selected = resolveProvider(
		"local",
		context({
			root,
			scope: "project",
			requestedScope: "project",
			actualRuntime: { mode: "write-production", host: "production-root" },
			inspectSource: (observation) => ({
				name: observation.name,
				origin: observation.origin,
				canonicalLocation: observation.canonicalLocation,
				contentHash: observation.contentHash,
				scope: "project",
				type: "skill",
				mode: "write-production",
				host: "production-root",
				dependencies: [],
				capabilities: [],
				tools: [],
				sideEffects: [],
			}),
		}),
	);
	assert.equal(selected.ok, false);
	assert.match(selected.reason, /mode|host/);
});

test("snapshot bindings는 real root·git root·head·환경 지문을 함께 캡처한다", () => {
	const { root } = repo();
	const snapshot = captureSnapshot(root);
	assert.equal(snapshot.bindings.root, realpathSync(root));
	assert.equal(snapshot.bindings.gitRoot, realpathSync(root));
	assert.equal(snapshot.bindings.head, snapshot.git.head);
	assert.match(snapshot.bindings.environmentFingerprint, /^[a-f0-9]{64}$/);
});

test("하위 폴더 capture도 Git 최상위 전체 delta를 기준으로 한다", () => {
	const { root, git, write } = repo();
	write("root.txt", "root\n");
	write("nested/sub.txt", "sub\n");
	git("add", ".");
	git("commit", "-qm", "nested");
	const nested = join(root, "nested");
	const baseline = captureSnapshot(nested);
	assert.equal(baseline.bindings.root, realpathSync(root));
	assert.equal(baseline.bindings.sourceRoot, realpathSync(nested));
	assert.ok(baseline.entries.some((entry) => entry.path === "root.txt"));
	assert.ok(baseline.entries.some((entry) => entry.path === "nested/sub.txt"));
	write("root.txt", "outside changed\n");
	const result = validateDelegationPacket(
		nested,
		packet(baseline),
		context({ baseline, approvedPaths: ["nested/**"] }),
	);
	assert.equal(result.ok, false);
	assert.ok(result.problems.some((problem) => problem.includes("root.txt")));
});
