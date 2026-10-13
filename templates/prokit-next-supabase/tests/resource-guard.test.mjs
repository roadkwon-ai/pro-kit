import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import {
	chmodSync,
	closeSync,
	existsSync,
	linkSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	openSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	symlinkSync,
	utimesSync,
	writeFileSync,
} from "node:fs";
import { tmpdir, uptime } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
	checkResources,
	cleanResources,
	createManagedTemporary,
	DEFAULT_RESOURCE_POLICY,
	disposeManagedTemporary,
	environmentFingerprint,
	main,
	measureResources,
	readPolicy,
	runGuarded,
} from "../files/scripts/resource-guard.mjs";

const scratch = () => mkdtempSync(join(tmpdir(), "prokit-resource-"));
const write = (root, path, text) => {
	const file = join(root, path);
	mkdirSync(file.slice(0, file.lastIndexOf("/")), { recursive: true });
	writeFileSync(file, text);
	return file;
};
// 그 프로젝트의 lock을 잇는 lease 프로세스 수.
const leaseProcesses = (root) => {
	const ps = spawnSync("ps", ["-A", "-ww", "-o", "command="], {
		encoding: "utf8",
	});
	if (ps.error)
		throw new Error(`ps로 lease 프로세스를 셀 수 없다: ${ps.error.message}`);
	return ps.stdout
		.split("\n")
		.filter(
			(line) =>
				line.includes("prokit-lease") && line.includes(realpathSync(root)),
		).length;
};
// 다른 환경의 guard가 lease를 잇는 것처럼 파일을 계속 건드린다. 검사 쪽이 기다리는 동안에도
// 돌도록 따로 띄운다.
const touchEvery = (file) =>
	spawn(
		process.execPath,
		[
			"-e",
			`setInterval(() => { const now = new Date(); require("node:fs").utimesSync(${JSON.stringify(file)}, now, now); }, 30)`,
		],
		{ stdio: "ignore" },
	);

test("측정: 중첩 항목·하드 링크는 한 번만, 자식 심볼릭 링크는 따르지 않는다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const cache = write(root, ".next/cache/a.bin", "cache");
	linkSync(cache, join(root, ".next/cache/a-copy.bin"));
	write(root, ".next/server/page.js", "output");
	write(root, "node_modules/pkg/index.js", "dependency");
	symlinkSync(tmpdir(), join(root, ".next/cache/outside"));

	const result = await measureResources({ roots: [root], mode: "fast" });
	assert.equal(result.timedOut, false);
	assert.equal(result.categories.buildCache.logicalBytes, 5);
	assert.equal(result.categories.nextOutput.logicalBytes, 6);
	assert.equal(result.categories.nodeModules.logicalBytes, 10);
	assert.equal(result.categories.residual.symlinks, 1);
	assert.ok(result.filesystems.length >= 1);
});

test("예산: 경고·차단·불명확 결과를 구분하고 신규 heavy만 총량 제한한다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	write(root, ".next/cache/a", "1234");
	const policy = {
		...DEFAULT_RESOURCE_POLICY,
		cache: { warn: 2, block: 100 },
		total: { warn: 2, block: 3 },
		free: { warn: 0, block: 0 },
	};
	const old = await checkResources(root, { policy, isNewHeavy: false });
	assert.equal(old.status, "warn");
	const fresh = await checkResources(root, { policy, isNewHeavy: true });
	assert.equal(fresh.status, "block");
	const unknown = await checkResources(root, {
		policy,
		measurement: { unknown: true, categories: {}, filesystems: [] },
	});
	assert.equal(unknown.status, "unknown");
});

test("측정이 불완전해도 여유 공간이 차단 한계 이하면 block이다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const measurement = {
		unknown: true,
		timedOut: true,
		categories: {},
		filesystems: [],
	};
	const all = Number.MAX_SAFE_INTEGER;
	const low = await checkResources(root, {
		measurement,
		policy: { free: { warn: all, block: all } },
	});
	assert.equal(low.status, "block");
	assert.ok(low.reasons.includes("여유 공간 차단 한계 이하"));
	assert.ok(Number.isFinite(low.usage.free));
	const enough = await checkResources(root, {
		measurement,
		policy: { free: { warn: 0, block: 0 } },
	});
	assert.equal(enough.status, "unknown");
});

test("정책은 .dev-cycle.json resources에서만 읽고, 지문은 건강 증명 없이는 후보다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	write(root, ".dev-cycle.json", '{"resources":{"cache":{"warn":7}}}');
	assert.equal((await readPolicy(root)).cache.warn, 7);
	write(root, "package.json", '{"name":"one"}');
	const first = await environmentFingerprint(root);
	assert.equal(first.reusable, false);
	assert.equal(first.health, "unknown");
	const reused = await environmentFingerprint(root, {
		previous: first,
		health: "success",
	});
	assert.equal(reused.reusable, false);
	assert.equal(reused.candidateOnly, true);
});

test("지문은 설치 입력이 달라지고, 관리 임시는 실제 핸들로만 폐기한다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	write(root, "package.json", '{"name":"one"}');
	const first = await environmentFingerprint(root);
	write(root, "package.json", '{"name":"two"}');
	assert.notEqual((await environmentFingerprint(root)).value, first.value);

	const handle = await createManagedTemporary(root, { runId: "test" });
	assert.ok(existsSync(handle.path));
	assert.equal(handle.path.startsWith(`${root}/`), false);
	assert.equal(
		(await disposeManagedTemporary(handle, { artifactTransferred: false }))
			.disposed,
		false,
	);
	assert.ok(existsSync(handle.path));
	assert.equal(
		(await disposeManagedTemporary(handle, { artifactTransferred: true }))
			.disposed,
		true,
	);
	assert.equal(existsSync(handle.path), false);
});

test("정리는 기본 dry-run이며 일반 node_modules cache는 절대 지우지 않는다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	write(root, "node_modules/.cache/compiler/a", "x");
	const preview = await cleanResources(root);
	assert.equal(preview.applied, false);
	assert.ok(existsSync(join(root, "node_modules/.cache")));
	const applied = await cleanResources(root, { apply: true });
	assert.equal(applied.applied, false);
	assert.ok(existsSync(join(root, "node_modules/.cache")));
	const forged = join(root, "compiler-cache");
	write(
		root,
		"compiler-cache/.resource-guard-owner.json",
		'{"origin":"resource-guard-compiler-cache"}',
	);
	const fake = await cleanResources(root, {
		apply: true,
		ownershipContext: {
			compilerCachePath: forged,
			token: "forged",
			runId: "forged",
			leaseEnded: true,
			childrenEnded: true,
		},
	});
	assert.equal(fake.applied, false);
	assert.ok(existsSync(forged));
});

test("guard는 자식 종료 코드를 보존하고 차단 시 자식을 시작하지 않는다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const exited = await runGuarded(root, {
		command: process.execPath,
		args: [
			"-e",
			"process.stdout.write('out'); process.stderr.write('err'); process.exit(3)",
		],
		captureOutput: true,
	});
	assert.equal(exited.exitCode, 3);
	assert.equal(exited.stdout, "out");
	assert.equal(exited.stderr, "err");
	const blocked = await runGuarded(root, {
		command: process.execPath,
		args: ["-e", "process.exit(9)"],
		policy: {
			...DEFAULT_RESOURCE_POLICY,
			total: { warn: 0, block: 0 },
			free: { warn: 0, block: 0 },
		},
		isNewHeavy: true,
	});
	assert.equal(blocked.exitCode, 75);
	const interrupted = await runGuarded(root, {
		command: process.execPath,
		args: ["-e", "setInterval(() => {}, 1000)"],
		commandTimeoutMs: 25,
	});
	assert.equal(interrupted.exitCode, 75);
	assert.deepEqual(interrupted.events, ["guard-timeout"]);
});

test("guard는 자신이 만든 compiler cache만 정리하고 같은 명령을 한 번 재시도한다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	mkdirSync(join(root, "apps/web"), { recursive: true });
	const script = [
		"const fs = require('node:fs');",
		"const n = 'attempt';",
		"if (!fs.existsSync(n)) {",
		"  fs.writeFileSync(n, '1');",
		"  fs.writeFileSync('apps/web/.next/cache/turbopack/payload', 'x'.repeat(2048));",
		"  setInterval(() => {}, 1000);",
		"} else { fs.writeFileSync(n, '2'); }",
	].join(" ");
	const result = await runGuarded(root, {
		command: process.execPath,
		args: ["-e", script],
		kind: "build",
		scanIntervalMs: 25,
		policy: {
			...DEFAULT_RESOURCE_POLICY,
			cache: { warn: 100, block: 100 },
			total: { warn: 100, block: 100 },
			free: { warn: 0, block: 0 },
		},
	});
	assert.equal(result.exitCode, 0);
	assert.ok(result.events.includes("resource-retry"));
	assert.equal(
		existsSync(join(root, "apps/web/.next/cache/turbopack/payload")),
		false,
	);
	assert.equal(readFileSync(join(root, "attempt"), "utf8"), "2");
});

test("예산 초과로 끄는 중에 온 신호도 기록해 명령을 다시 실행하지 않는다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	mkdirSync(join(root, "apps/web"), { recursive: true });
	const script = [
		"const fs = require('node:fs');",
		"fs.appendFileSync('runs', 'x');",
		"fs.writeFileSync('apps/web/.next/cache/turbopack/payload', 'x'.repeat(2048));",
		"process.on('SIGTERM', () => fs.writeFileSync('got-term', '1'));",
		"setInterval(() => {}, 1000);",
	].join(" ");
	const pending = runGuarded(root, {
		command: process.execPath,
		args: ["-e", script],
		kind: "build",
		scanIntervalMs: 25,
		killGraceMs: 1000,
		policy: {
			...DEFAULT_RESOURCE_POLICY,
			cache: { warn: 100, block: 100 },
			total: { warn: 2 ** 50, block: 2 ** 50 },
			free: { warn: 0, block: 0 },
		},
	});
	for (let i = 0; i < 400 && !existsSync(join(root, "got-term")); i += 1)
		await new Promise((resolveWait) => setTimeout(resolveWait, 25));
	// guard가 예산 초과로 SIGTERM을 보낸 뒤 grace 동안 창을 닫는다.
	process.emit("SIGHUP");
	const result = await pending;
	assert.equal(result.exitCode, 75);
	assert.ok(result.events.includes("resource-budget-exceeded"));
	assert.ok(result.events.includes("guard-sighup"));
	assert.ok(!result.events.includes("resource-retry"));
	assert.equal(readFileSync(join(root, "runs"), "utf8"), "x");
});

test("죽은 lock을 여러 guard가 동시에 회수해도 한 번에 하나만 실행한다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const guard = new URL("../files/scripts/resource-guard.mjs", import.meta.url)
		.pathname;
	const records = join(root, ".prokit/resource-guard");
	mkdirSync(records, { recursive: true });
	const child = [
		"const fs = require('node:fs');",
		"fs.appendFileSync('spans', `${Date.now()} start\\n`);",
		"setTimeout(() => fs.appendFileSync('spans', `${Date.now()} end\\n`), 150);",
	].join(" ");
	for (let round = 0; round < 15; round += 1) {
		writeFileSync(
			join(records, "dev.lock"),
			JSON.stringify({ pid: 2 ** 22 + 1, token: `dead-${round}` }),
		);
		rmSync(join(root, "spans"), { force: true });
		const codes = await Promise.all(
			Array.from(
				{ length: 6 },
				() =>
					new Promise((done) => {
						spawn(
							process.execPath,
							[
								guard,
								"run",
								"--kind",
								"dev",
								"--",
								process.execPath,
								"-e",
								child,
							],
							{ cwd: root, stdio: "ignore" },
						).on("close", done);
					}),
			),
		);
		// 실행한 하나는 0, 나머지는 lock을 못 잡아 2다. 성공한 실행이 다른 코드로 끝나지 않는다.
		assert.ok(
			codes.every((code) => code === 0 || code === 2),
			String(codes),
		);
		assert.ok(codes.includes(0), `round ${round}: 죽은 lock을 회수하지 못했다`);
		const spans = readFileSync(join(root, "spans"), "utf8").trim().split("\n");
		const starts = spans.filter((line) => line.endsWith("start")).length;
		assert.equal(starts, codes.filter((code) => code === 0).length);
		let depth = 0;
		for (const line of spans) {
			depth += line.endsWith("start") ? 1 : -1;
			assert.ok(
				depth <= 1,
				`round ${round}: 실행이 겹쳤다\n${spans.join("\n")}`,
			);
		}
	}
});

test("자식 그룹을 lock과 소유 기록에 적은 뒤에만 명령을 시작하고, 그 전에 guard가 죽으면 시작하지 않는다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const records = join(realpathSync(root), ".prokit/resource-guard");
	const policy = { ...DEFAULT_RESOURCE_POLICY, free: { warn: 0, block: 0 } };
	const started = "require('node:fs').writeFileSync('started', 'x')";
	let seen;
	let owner;
	// pnpm dev:web의 guard 종류(dev-web)도 dev 캐시의 소유 기록을 남긴다.
	const result = await runGuarded(root, {
		command: process.execPath,
		args: ["-e", started],
		kind: "dev-web",
		policy,
		onChildSpawn: (child) => {
			const until = Date.now() + 300;
			while (Date.now() < until);
			const [marker] = readdirSync(records).filter((name) =>
				name.startsWith("compiler-"),
			);
			const lock = JSON.parse(
				readFileSync(join(records, "dev-web.lock"), "utf8"),
			);
			owner = { os: lock.os, boot: lock.boot, lease: lock.lease };
			seen = {
				started: existsSync(join(root, "started")),
				lock: lock.childPgid,
				marker: JSON.parse(readFileSync(join(records, marker), "utf8"))
					.childPgid,
				pid: child.pid,
			};
		},
	});
	assert.equal(result.exitCode, 0);
	assert.deepEqual(seen, {
		started: false,
		lock: seen.pid,
		marker: seen.pid,
		pid: seen.pid,
	});
	// 시계를 바꿔도 그대로인 부팅 표시와 다른 환경이 지켜볼 lease 간격을 적는다.
	assert.equal(owner.os, process.platform);
	assert.equal(owner.lease, 2000);
	if (process.platform === "darwin")
		assert.equal(
			owner.boot,
			spawnSync("sysctl", ["-n", "kern.bootsessionuuid"], {
				encoding: "utf8",
			}).stdout.trim(),
		);
	if (process.platform === "linux")
		assert.equal(
			owner.boot,
			readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim(),
		);
	assert.ok(existsSync(join(root, "started")));
	// 정상으로 끝난 실행은 lease 프로세스를 남기지 않는다.
	assert.equal(leaseProcesses(root), 0);
	rmSync(join(root, "started"));
	// 그룹을 적는 쪽이 실패하면 명령을 시작하지 않고 실패를 알린다(멈추지 않는다).
	await assert.rejects(
		runGuarded(root, {
			command: process.execPath,
			args: ["-e", started],
			kind: "verify",
			policy,
			onChildSpawn: () => {
				throw new Error("record failed");
			},
		}),
		/record failed/,
	);
	await new Promise((resolveWait) => setTimeout(resolveWait, 300));
	assert.equal(existsSync(join(root, "started")), false);
	// guard가 그룹을 적고 명령을 풀어 주기 전에 강제 종료되면 명령은 실행되지 않는다.
	const guard = new URL("../files/scripts/resource-guard.mjs", import.meta.url)
		.href;
	const killer = [
		`const { runGuarded } = await import(${JSON.stringify(guard)});`,
		"await runGuarded(process.cwd(), {",
		`command: process.execPath, args: ["-e", ${JSON.stringify(started)}], kind: "dev",`,
		"policy: { free: { warn: 0, block: 0 } },",
		"onChildSpawn: (child) => {",
		"require('node:fs').writeFileSync('child.pid', String(child.pid));",
		"process.kill(process.pid, 'SIGKILL');",
		"} });",
	].join(" ");
	rmSync(join(root, "apps"), { recursive: true, force: true });
	await new Promise((done) =>
		spawn(
			process.execPath,
			["--input-type=commonjs", "-e", `(async () => { ${killer} })()`],
			{ cwd: root, stdio: "ignore" },
		).on("close", done),
	);
	const pid = Number(readFileSync(join(root, "child.pid"), "utf8"));
	// 거둬지기 전의 좀비 그룹은 macOS에서 EPERM이라 ESRCH가 될 때까지 기다린다.
	for (let attempt = 0; attempt < 200; attempt += 1) {
		try {
			process.kill(-pid, 0);
		} catch (error) {
			if (error.code === "ESRCH") break;
		}
		await new Promise((resolveWait) => setTimeout(resolveWait, 25));
	}
	assert.throws(() => process.kill(-pid, 0), { code: "ESRCH" });
	assert.equal(existsSync(join(root, "started")), false);
	// 끝을 적지 못한 소유 기록도 guard와 자식 그룹이 끝났으니 clean 후보다.
	const devCache = realpathSync(
		join(root, "apps/web/.next/dev/cache/turbopack"),
	);
	assert.deepEqual((await cleanResources(root)).candidates, [devCache]);
	// 남은 lock도 같은 기준으로 회수한다.
	assert.equal(
		(
			await runGuarded(root, {
				command: process.execPath,
				args: ["-e", "0"],
				kind: "dev",
				policy,
			})
		).exitCode,
		0,
	);
});

test("lease는 guard가 강제 종료돼도 남은 자식 그룹과 Next dev가 끝날 때까지 lock을 건드린다", async (t) => {
	if (process.platform === "win32") return t.skip("lease는 POSIX에서만 쓴다");
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const guard = new URL("../files/scripts/resource-guard.mjs", import.meta.url)
		.pathname;
	const lock = join(realpathSync(root), ".prokit/resource-guard/dev.lock");
	write(root, ".dev-cycle.json", '{"resources":{"free":{"warn":0,"block":0}}}');
	const runner = spawn(
		process.execPath,
		[
			guard,
			"run",
			"--kind",
			"dev",
			"--",
			process.execPath,
			"-e",
			"setInterval(() => {}, 1000)",
		],
		{ cwd: root, stdio: "ignore" },
	);
	const kills = [];
	t.after(() => {
		for (const pid of kills)
			try {
				process.kill(pid, "SIGKILL");
			} catch {}
	});
	let owner;
	for (let attempt = 0; attempt < 200 && !owner?.childPgid; attempt += 1) {
		await new Promise((resolveWait) => setTimeout(resolveWait, 25));
		try {
			owner = JSON.parse(readFileSync(lock, "utf8"));
		} catch {}
	}
	kills.push(-owner.childPgid, owner.pid);
	const mark = () => {
		try {
			return lstatSync(lock).mtimeMs;
		} catch {
			return null;
		}
	};
	// 한 번 바뀌면 바로 true, 6초 안에 바뀌지 않으면 false다(주기 2초, 부하가 있어도 넉넉하게).
	const touched = async () => {
		const before = mark();
		for (let waited = 0; waited < 6_000; waited += 100) {
			await new Promise((resolveWait) => setTimeout(resolveWait, 100));
			if (mark() !== before) return true;
		}
		return false;
	};
	assert.equal(await touched(), true);
	// guard만 강제 종료돼도 자식 그룹이 살아 있는 동안 lease가 이어진다.
	process.kill(owner.pid, "SIGKILL");
	await new Promise((resolveWait) => runner.once("close", resolveWait));
	assert.equal(await touched(), true);
	// 그 종류가 띄운 Next dev가 남아 있어도 이어 간다(turbo가 Next를 다른 그룹에 둔다).
	const next = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
		detached: true,
		stdio: "ignore",
	});
	kills.push(next.pid);
	write(root, "apps/web/.next/dev/lock", JSON.stringify({ pid: next.pid }));
	process.kill(-owner.childPgid, "SIGKILL");
	assert.equal(await touched(), true);
	// 모두 끝나면 lease도 끝난다.
	next.kill("SIGKILL");
	for (
		let waited = 0;
		waited < 10_000 && leaseProcesses(root) > 0;
		waited += 100
	)
		await new Promise((resolveWait) => setTimeout(resolveWait, 100));
	assert.equal(leaseProcesses(root), 0);
	assert.equal(await touched(), false);
});

test("lease가 실행 중에 끝나면 lock에서 lease를 지워 다른 환경이 회수하지 않게 한다", async (t) => {
	if (process.platform === "win32") return t.skip("lease는 POSIX에서만 쓴다");
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const guard = new URL("../files/scripts/resource-guard.mjs", import.meta.url)
		.pathname;
	const lock = join(realpathSync(root), ".prokit/resource-guard/verify.lock");
	write(root, ".dev-cycle.json", '{"resources":{"free":{"warn":0,"block":0}}}');
	const runner = spawn(
		process.execPath,
		[
			guard,
			"run",
			"--kind",
			"verify",
			"--",
			process.execPath,
			"-e",
			"setInterval(() => {}, 1000)",
		],
		{ cwd: root, stdio: "ignore" },
	);
	let owner;
	for (let attempt = 0; attempt < 200 && !owner?.childPgid; attempt += 1) {
		await new Promise((resolveWait) => setTimeout(resolveWait, 25));
		try {
			owner = JSON.parse(readFileSync(lock, "utf8"));
		} catch {}
	}
	t.after(() => {
		try {
			process.kill(-owner.childPgid, "SIGKILL");
		} catch {}
	});
	assert.equal(owner.lease, 2000);
	const [line] = spawnSync("ps", ["-A", "-ww", "-o", "pid=,command="], {
		encoding: "utf8",
	})
		.stdout.split("\n")
		.filter(
			(entry) => entry.includes("prokit-lease") && entry.includes(owner.token),
		);
	process.kill(Number.parseInt(line, 10), "SIGKILL");
	for (let attempt = 0; attempt < 100; attempt += 1) {
		await new Promise((resolveWait) => setTimeout(resolveWait, 25));
		owner = JSON.parse(readFileSync(lock, "utf8"));
		if (owner.lease === undefined) break;
	}
	assert.equal(owner.lease, undefined);
	assert.ok(Number.isInteger(owner.childPgid));
	runner.kill("SIGTERM");
	await new Promise((resolveWait) => runner.once("close", resolveWait));
});

test("강제 종료로 끝을 적지 못한 compiler cache는 남은 자식 그룹이 끝난 뒤에만 정리한다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const records = join(realpathSync(root), ".prokit/resource-guard");
	mkdirSync(records, { recursive: true });
	const cache = join(realpathSync(root), "apps/web/.next/cache/turbopack");
	mkdirSync(cache, { recursive: true });
	writeFileSync(join(cache, "payload"), "x");
	const stat = lstatSync(cache);
	const orphan = spawn(
		process.execPath,
		["-e", "setInterval(() => {}, 1000)"],
		{
			detached: true,
			stdio: "ignore",
		},
	);
	t.after(() => {
		try {
			process.kill(-orphan.pid, "SIGKILL");
		} catch {}
	});
	const marker = {
		origin: "resource-guard-compiler-cache",
		root: realpathSync(root),
		rootDev: lstatSync(root).dev,
		rootIno: lstatSync(root).ino,
		runId: "killed",
		token: "killed",
		path: "apps/web/.next/cache/turbopack",
		dev: stat.dev,
		ino: stat.ino,
		leaseEnded: false,
		childrenEnded: false,
		pid: 2 ** 22 + 1,
		childPgid: orphan.pid,
	};
	writeFileSync(join(records, "compiler-killed.json"), JSON.stringify(marker));
	// pid가 없는 옛 기록은 판단하지 않는다.
	writeFileSync(
		join(records, "compiler-old.json"),
		JSON.stringify({ ...marker, pid: undefined, childPgid: undefined }),
	);
	// 다른 환경(컨테이너)의 기록은 그 실행의 lock이 lease를 잇는 동안 남긴다.
	const foreign = { ns: "pid:[1]", runId: "container" };
	writeFileSync(
		join(records, "compiler-container.json"),
		JSON.stringify({ ...marker, ...foreign, childPgid: undefined }),
	);
	// 마운트 경로가 다른 환경의 기록은 같은 디렉터리인지 확인할 수 없어 그쪽 clean에 남긴다.
	writeFileSync(
		join(records, "compiler-elsewhere.json"),
		JSON.stringify({ ...marker, ...foreign, root: "/w", rootDev: 46 }),
	);
	const containerLock = join(records, "dev.lock");
	writeFileSync(
		containerLock,
		JSON.stringify({ ...foreign, pid: 7, token: "container", lease: 100 }),
	);
	const lease = touchEvery(containerLock);
	t.after(() => lease.kill("SIGKILL"));
	assert.deepEqual((await cleanResources(root)).candidates, []);
	process.kill(-orphan.pid, "SIGKILL");
	await new Promise((resolveWait) => orphan.once("exit", resolveWait));
	assert.deepEqual((await cleanResources(root)).candidates, [cache]);
	assert.match(
		(await cleanResources(root, { apply: true })).reason,
		/다른 환경.*실행 중이다\(dev\.lock\)/,
	);
	assert.ok(existsSync(cache));
	lease.kill("SIGKILL");
	await new Promise((resolveWait) => lease.once("exit", resolveWait));
	const temp = join(records, "compiler-killed.json.new-old");
	writeFileSync(temp, "{");
	const old = new Date(Date.now() - 120_000);
	utimesSync(temp, old, old);
	assert.equal((await cleanResources(root, { apply: true })).applied, true);
	assert.equal(existsSync(cache), false);
	// lease가 끊긴 lock은 회수하고, 그 실행의 기록·옛 기록·쓰다 끊긴 임시 파일을 지운다.
	assert.deepEqual(readdirSync(records), ["compiler-elsewhere.json"]);
});

test("CLI check는 컨테이너 엔진이 보고한 저장소 크기를 함께 보여 준다", (t) => {
	const root = scratch();
	const bin = scratch();
	t.after(() => {
		rmSync(root, { recursive: true, force: true });
		rmSync(bin, { recursive: true, force: true });
	});
	const guard = new URL("../files/scripts/resource-guard.mjs", import.meta.url)
		.pathname;
	const engine = (name, body) =>
		writeFileSync(join(bin, name), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
	const check = () => {
		const out = spawnSync(process.execPath, [guard, "check"], {
			cwd: root,
			encoding: "utf8",
			env: { ...process.env, PATH: bin },
		});
		assert.equal(out.status, 0, out.stderr);
		return JSON.parse(out.stdout).containers;
	};
	assert.equal(check(), null);
	// podman이 응답하지 않으면(머신 꺼짐) docker의 십진 단위 글을 바이트로 바꾼다.
	engine("podman", "exit 125");
	engine(
		"docker",
		`printf '%s\\n' '{"Type":"Images","Size":"1.5GB","Reclaimable":"500MB (33%)"}' '{"Type":"Local Volumes","Size":"0B","Reclaimable":"0B (0%)"}'`,
	);
	assert.deepEqual(check(), {
		engine: "docker",
		types: [
			{ type: "Images", bytes: 1_500_000_000, reclaimableBytes: 500_000_000 },
			{ type: "Local Volumes", bytes: 0, reclaimableBytes: 0 },
		],
	});
	engine(
		"podman",
		`printf '%s' '[{"Type":"Images","RawSize":547075368,"RawReclaimable":60006148,"Size":"547.1MB"}]'`,
	);
	assert.deepEqual(check(), {
		engine: "podman",
		types: [{ type: "Images", bytes: 547075368, reclaimableBytes: 60006148 }],
	});
});

test("신호나 시간 초과로 끈 명령은 끝난 뒤 예산을 넘어도 다시 실행하지 않는다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	mkdirSync(join(root, "apps/web"), { recursive: true });
	const script = [
		"const fs = require('node:fs');",
		"fs.appendFileSync('runs', 'x');",
		"fs.writeFileSync('apps/web/.next/cache/turbopack/payload', 'x'.repeat(2048));",
		"setInterval(() => {}, 1000);",
	].join(" ");
	const result = await runGuarded(root, {
		command: process.execPath,
		args: ["-e", script],
		kind: "build",
		commandTimeoutMs: 500,
		scanIntervalMs: 60_000,
		policy: {
			...DEFAULT_RESOURCE_POLICY,
			cache: { warn: 100, block: 100 },
			total: { warn: 2 ** 50, block: 2 ** 50 },
			free: { warn: 0, block: 0 },
		},
	});
	assert.equal(result.exitCode, 75);
	assert.ok(result.events.includes("guard-timeout"));
	assert.ok(!result.events.includes("resource-retry"));
	assert.equal(readFileSync(join(root, "runs"), "utf8"), "x");
});

test("CLI run은 --kind를 guard에 전달한다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	write(
		root,
		".dev-cycle.json",
		'{"resources":{"total":{"warn":0,"block":0},"free":{"warn":0,"block":0}}}',
	);
	const command = [process.execPath, "-e", "process.exit(9)"];
	assert.equal(await main(["run", "--kind", "dev", "--", ...command], root), 9);
	assert.equal(
		await main(["run", "--kind", "build", "--", ...command], root),
		75,
	);
});

test("guard는 정책 루트를 유지한 채 지정한 하위 작업 디렉터리에서 실행한다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	mkdirSync(join(root, "apps/web"), { recursive: true });
	const result = await runGuarded(root, {
		command: process.execPath,
		args: ["-e", "require('node:fs').writeFileSync('cwd.txt', process.cwd())"],
		cwd: join(root, "apps/web"),
		captureOutput: true,
	});
	assert.equal(result.exitCode, 0);
	assert.equal(existsSync(join(root, "apps/web/cwd.txt")), true);
	assert.equal(existsSync(join(root, "cwd.txt")), false);
});

test("관리 임시 작업트리의 자식도 handle에 묶어 종료 뒤에만 폐기한다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const handle = await createManagedTemporary(root, { runId: "child-bind" });
	const result = await runGuarded(handle.path, {
		command: process.execPath,
		args: ["-e", "process.exit(0)"],
		temporaryHandle: handle,
	});
	assert.equal(result.exitCode, 0);
	assert.equal(handle.children.length, 1);
	assert.equal(
		(await disposeManagedTemporary(handle, { artifactTransferred: true }))
			.disposed,
		true,
	);
});

test("정상 child 종료 뒤 기록된 손자 process group이 살아 있으면 관리 임시 폴더를 폐기하지 않는다", async (t) => {
	const root = scratch();
	let grandchild;
	t.after(() => {
		try {
			if (grandchild) process.kill(-grandchild.pid, "SIGTERM");
		} catch {}
		rmSync(root, { recursive: true, force: true });
	});
	const handle = await createManagedTemporary(root, { runId: "group-live" });
	const result = await runGuarded(handle.path, {
		command: process.execPath,
		args: ["-e", "process.exit(0)"],
		temporaryHandle: handle,
	});
	assert.equal(result.exitCode, 0);
	assert.equal(result.groupEnded, true);
	grandchild = spawn("sh", ["-c", "sleep 10"], {
		detached: true,
		stdio: "ignore",
	});
	grandchild.unref();
	handle.groups.push(grandchild.pid);
	assert.equal(
		(await disposeManagedTemporary(handle, { artifactTransferred: true }))
			.disposed,
		false,
	);
	process.kill(-grandchild.pid, "SIGTERM");
	await new Promise((resolve) => setTimeout(resolve, 25));
	assert.equal(
		(await disposeManagedTemporary(handle, { artifactTransferred: true }))
			.disposed,
		true,
	);
});

test("Better-T-Stack 하위 캐시·의존성·실제 venv와 명시 nested root를 분류한다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	write(root, "apps/web/.next/dev/cache/a", "cache");
	write(root, "apps/web/.next/server/a", "output");
	write(root, "packages/api/node_modules/pkg/a", "module");
	write(root, ".turbo/cache/a", "turbo");
	write(root, "packages/python/pyvenv.cfg", "home = python");
	write(root, "packages/python/lib/a", "venv");
	write(root, "packages/env/a", "source");
	write(root, "generated-cache/a", "nested");
	const measured = await measureResources({
		roots: [root, { path: join(root, "generated-cache"), kind: "buildCache" }],
	});
	assert.equal(measured.categories.buildCache.logicalBytes, 16);
	assert.equal(measured.categories.nextOutput.logicalBytes, 6);
	assert.equal(measured.categories.nodeModules.logicalBytes, 6);
	assert.equal(measured.categories.pythonVenv.logicalBytes, 17);
	assert.equal(measured.categories.residual.logicalBytes, 6);

	const targeted = await measureResources({
		roots: [root],
		activeTargets: [
			{ path: join(root, "generated-cache"), kind: "buildCache" },
		],
	});
	assert.equal(targeted.categories.buildCache.logicalBytes, 6);
	assert.equal(targeted.categories.nodeModules.logicalBytes, 0);
});

test("환경 한계는 node_modules와 venv를 합산하지 않고 재설치 성장은 경고한다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	write(root, "node_modules/pkg/a", "123456");
	write(root, ".venv/pyvenv.cfg", "x");
	write(root, ".venv/lib/a", "12345");
	const policy = {
		...DEFAULT_RESOURCE_POLICY,
		environment: { warn: 10 },
		environmentGrowth: { absolute: 2, ratio: 0.25 },
		total: { warn: 100, block: 200 },
		free: { warn: 0, block: 0 },
	};
	const separate = await checkResources(root, { policy });
	assert.equal(separate.status, "ok");
	const grown = await checkResources(root, {
		policy,
		environmentRefs: [{ kind: "nodeModules", beforeBytes: 0 }],
	});
	assert.equal(grown.status, "warn");
	assert.match(grown.reasons.join("\n"), /재설치 성장/);
});

test("살아 있는 같은 child group은 grace 뒤 소유 PGID만 종료한다", async (t) => {
	const root = scratch();
	let grandchild;
	t.after(() => {
		if (grandchild) {
			try {
				process.kill(grandchild, "SIGTERM");
			} catch {}
		}
		rmSync(root, { recursive: true, force: true });
	});
	mkdirSync(join(root, "apps/web"), { recursive: true });
	const script = [
		"const fs = require('node:fs');",
		"const { spawn } = require('node:child_process');",
		"fs.writeFileSync('apps/web/.next/cache/turbopack/payload', 'x'.repeat(2048));",
		"const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });",
		"fs.writeFileSync('grandchild', String(child.pid));",
		"child.unref();",
	].join(" ");
	const result = await runGuarded(root, {
		command: process.execPath,
		args: ["-e", script],
		kind: "build",
		scanIntervalMs: 1_000,
		policy: {
			...DEFAULT_RESOURCE_POLICY,
			cache: { warn: 100, block: 100 },
			total: { warn: 100, block: 100 },
			free: { warn: 0, block: 0 },
		},
	});
	grandchild = Number(readFileSync(join(root, "grandchild"), "utf8"));
	assert.equal(result.exitCode, 75);
	assert.equal(result.groupEnded, true);
	assert.throws(() => process.kill(grandchild, 0));
	assert.ok(existsSync(join(root, "apps/web/.next/cache/turbopack/payload")));
});

test("guard가 만든 cache 경로가 바뀌면 새 디렉터리를 지우지 않는다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	mkdirSync(join(root, "apps/web"), { recursive: true });
	const script = [
		"const fs = require('node:fs');",
		"const base = 'apps/web/.next/cache';",
		"fs.renameSync(base + '/turbopack', base + '/user-cache');",
		"fs.mkdirSync(base + '/turbopack');",
		"fs.writeFileSync(base + '/turbopack/user-data', 'x'.repeat(2048));",
		"setInterval(() => {}, 1000);",
	].join(" ");
	const result = await runGuarded(root, {
		command: process.execPath,
		args: ["-e", script],
		kind: "build",
		scanIntervalMs: 25,
		policy: {
			...DEFAULT_RESOURCE_POLICY,
			cache: { warn: 100, block: 100 },
			total: { warn: 100, block: 100 },
			free: { warn: 0, block: 0 },
		},
	});
	assert.equal(result.exitCode, 75);
	assert.ok(existsSync(join(root, "apps/web/.next/cache/turbopack/user-data")));
	// 뒤에 CLI clean을 해도 바뀐 디렉터리는 소유 기록과 맞지 않아 지우지 않는다.
	assert.deepEqual((await cleanResources(root)).candidates, []);
	await cleanResources(root, { apply: true });
	assert.ok(existsSync(join(root, "apps/web/.next/cache/turbopack/user-data")));
});

test("끝난 guard가 남긴 compiler cache는 디스크 소유 기록을 확인한 뒤에만 CLI clean이 지운다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	mkdirSync(join(root, "apps/web"), { recursive: true });
	const result = await runGuarded(root, {
		command: process.execPath,
		args: [
			"-e",
			"require('node:fs').writeFileSync('apps/web/.next/cache/turbopack/payload', 'x')",
		],
		kind: "build",
		policy: { ...DEFAULT_RESOURCE_POLICY, free: { warn: 0, block: 0 } },
	});
	assert.equal(result.exitCode, 0);
	const cache = realpathSync(join(root, "apps/web/.next/cache/turbopack"));
	const records = join(root, ".prokit/resource-guard");
	const [name] = readdirSync(records).filter((file) =>
		file.startsWith("compiler-"),
	);
	const marker = JSON.parse(readFileSync(join(records, name), "utf8"));
	assert.equal(marker.leaseEnded, true);
	assert.equal(marker.childrenEnded, true);
	// 표준 경로가 아닌 기록과 실행이 끝나지 않은 기록은 소유 증명이 아니다.
	write(root, "src/keep.js", "keep");
	const src = lstatSync(join(root, "src"));
	writeFileSync(
		join(records, "compiler-forged.json"),
		JSON.stringify({ ...marker, path: "src", dev: src.dev, ino: src.ino }),
	);
	mkdirSync(join(root, "apps/web/.next/dev/cache/turbopack"), {
		recursive: true,
	});
	const running = lstatSync(join(root, "apps/web/.next/dev/cache/turbopack"));
	writeFileSync(
		join(records, "compiler-running.json"),
		JSON.stringify({
			...marker,
			path: "apps/web/.next/dev/cache/turbopack",
			dev: running.dev,
			ino: running.ino,
			leaseEnded: false,
		}),
	);
	assert.deepEqual(await cleanResources(root), {
		applied: false,
		candidates: [cache],
	});
	writeFileSync(
		join(records, "dev.lock"),
		JSON.stringify({ pid: process.pid }),
	);
	const busy = await cleanResources(root, { apply: true });
	assert.equal(busy.applied, false);
	assert.match(busy.reason, /실행 중인 guard/);
	assert.ok(existsSync(join(cache, "payload")));
	rmSync(join(records, "dev.lock"));
	// guard 밖에서 실행 중인 Next도 lock으로 알아보고 멈춘다. build lock에는 pid가 없어
	// 파일을 연 프로세스를 lsof로 본다.
	const buildLock = write(root, "apps/web/.next/lock", "");
	const held = openSync(buildLock, "r");
	const building = await cleanResources(root, { apply: true });
	closeSync(held);
	assert.match(building.reason, /실행 중인 Next/);
	// 비정상 종료한 Next가 남긴(아무도 열지 않은) build lock은 막지 않는다. lsof가 없으면 막는다.
	if (spawnSync("lsof", ["-v"]).error) rmSync(buildLock);
	write(root, "apps/web/.next/dev/lock", JSON.stringify({ pid: process.pid }));
	assert.match((await cleanResources(root, { apply: true })).reason, /Next/);
	// 끝난 dev의 lock(죽은 pid)은 막지 않는다. 지우다 끊긴 휴지통도 마저 지운다.
	write(root, "apps/web/.next/dev/lock", JSON.stringify({ pid: 2 ** 22 + 1 }));
	write(root, ".prokit/resource-guard/trash-left/old", "x");
	assert.deepEqual(await cleanResources(root, { apply: true }), {
		applied: true,
		candidates: [cache],
	});
	assert.equal(existsSync(cache), false);
	assert.equal(existsSync(join(records, "trash-left")), false);
	// 주인(이 테스트 프로세스)이 살아 있는 기록만 남는다.
	assert.deepEqual(
		readdirSync(records).filter((file) => !file.endsWith(".lock")),
		["compiler-running.json"],
	);
	// 기록만 지우고 그 기록이 가리키던 다른 디렉터리는 지우지 않는다.
	assert.ok(existsSync(join(root, "src/keep.js")));
	assert.ok(existsSync(join(root, "apps/web/.next/dev/cache/turbopack")));
});

test("죽은 프로세스가 남긴 lock은 회수하고, 정리 중에는 guard가 실행을 시작하지 않는다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const records = join(realpathSync(root), ".prokit/resource-guard");
	mkdirSync(records, { recursive: true });
	const policy = { ...DEFAULT_RESOURCE_POLICY, free: { warn: 0, block: 0 } };
	const run = () =>
		runGuarded(root, {
			command: process.execPath,
			args: ["-e", "process.exit(0)"],
			kind: "dev",
			policy,
		});
	// 창을 닫아 guard가 죽은 경우: pid가 없는 프로세스의 lock
	writeFileSync(
		join(records, "dev.lock"),
		JSON.stringify({ pid: 2 ** 22 + 1, token: "dead" }),
	);
	assert.equal((await run()).exitCode, 0);
	assert.equal(existsSync(join(records, "dev.lock")), false);
	// 살아 있는 lock은 그대로 막는다.
	writeFileSync(
		join(records, "dev.lock"),
		JSON.stringify({ pid: process.pid, token: "live" }),
	);
	await assert.rejects(run(), /이미 실행 중/);
	// guard가 죽어도 남은 자식 그룹이 살아 있으면 회수하지 않는다.
	const orphan = spawn(
		process.execPath,
		["-e", "setInterval(() => {}, 1000)"],
		{
			detached: true,
			stdio: "ignore",
		},
	);
	t.after(() => {
		try {
			process.kill(-orphan.pid, "SIGKILL");
		} catch {}
	});
	writeFileSync(
		join(records, "dev.lock"),
		JSON.stringify({
			pid: 2 ** 22 + 1,
			token: "orphan",
			childPgid: orphan.pid,
		}),
	);
	await assert.rejects(run(), /이미 실행 중/);
	process.kill(-orphan.pid, "SIGKILL");
	await new Promise((resolveWait) => orphan.once("exit", resolveWait));
	assert.equal((await run()).exitCode, 0);
	// 재부팅 전에 남은 lock은 그 pid를 지금 다른 프로세스가 써도 죽은 것으로 본다.
	writeFileSync(
		join(records, "dev.lock"),
		JSON.stringify({ pid: process.ppid, token: "old-boot", boot: 0 }),
	);
	assert.equal((await run()).exitCode, 0);
	// 부팅 시각(초)만 적은 옛 형식도 지금 부팅이면 pid로 판단한다(부팅 ID와 섞여도).
	writeFileSync(
		join(records, "dev.lock"),
		JSON.stringify({
			pid: process.ppid,
			token: "old-format",
			boot: Math.round(Date.now() / 1000 - uptime()),
		}),
	);
	await assert.rejects(run(), /이미 실행 중/);
	rmSync(join(records, "dev.lock"));
	// guard와 turbo가 함께 강제 종료돼 다른 process group의 Next만 남았으면 회수하지 않는다.
	writeFileSync(
		join(records, "dev.lock"),
		JSON.stringify({ pid: 2 ** 22 + 1, token: "turbo-killed" }),
	);
	const nextLock = write(
		root,
		"apps/web/.next/dev/lock",
		JSON.stringify({ pid: process.pid }),
	);
	await assert.rejects(
		run(),
		/Next가 아직 실행 중이다\(apps\/web\/\.next\/dev\/lock\)/,
	);
	// 다른 종류의 Next(여기서는 dev)는 build의 회수를 막지 않는다.
	writeFileSync(
		join(records, "build.lock"),
		JSON.stringify({ pid: 2 ** 22 + 1, token: "build-killed" }),
	);
	assert.equal(
		(
			await runGuarded(root, {
				command: process.execPath,
				args: ["-e", "0"],
				kind: "build",
				policy,
			})
		).exitCode,
		0,
	);
	rmSync(nextLock);
	assert.equal((await run()).exitCode, 0);
	await assert.rejects(
		runGuarded(root, { command: process.execPath, kind: "clean" }),
		/clean은 guard 종류로/,
	);
	// 회수 도중 죽은 guard의 .recover(와 그 위 단계)는 다음 guard가 한 단계 위 mutex로 회수한다.
	const dead = { pid: 2 ** 22 + 1, token: "dead" };
	writeFileSync(join(records, "dev.lock"), JSON.stringify(dead));
	writeFileSync(join(records, "dev.lock.recover"), JSON.stringify(dead));
	writeFileSync(
		join(records, "dev.lock.recover.recover"),
		JSON.stringify(dead),
	);
	assert.equal((await run()).exitCode, 0);
	assert.deepEqual(
		readdirSync(records).filter((name) => name.includes(".lock")),
		[],
	);
	// 세 단계까지 모두 죽은 채 막히면 clean --apply를 안내하고, clean이 한 번에 푼다.
	writeFileSync(join(records, "dev.lock"), JSON.stringify(dead));
	for (const level of [
		".recover",
		".recover.recover",
		".recover.recover.recover",
	])
		writeFileSync(join(records, `dev.lock${level}`), JSON.stringify(dead));
	await assert.rejects(
		run(),
		/resource clean --apply로 남은 회수 기록을 지운다/,
	);
	await cleanResources(root, { apply: true });
	assert.equal((await run()).exitCode, 0);
	assert.deepEqual(
		readdirSync(records).filter((name) => name.includes(".lock")),
		[],
	);
	// 살아 있는 회수자의 .recover는 건드리지 않는다.
	writeFileSync(join(records, "dev.lock"), JSON.stringify(dead));
	writeFileSync(
		join(records, "dev.lock.recover"),
		JSON.stringify({ pid: process.ppid, token: "recovering" }),
	);
	await assert.rejects(run(), /이미 실행 중/);
	assert.ok(existsSync(join(records, "dev.lock.recover")));
	// clean --apply도 같은 절차로 죽은 .recover를, 오래된 임시 파일은 바로 지운다.
	writeFileSync(join(records, "dev.lock.recover"), JSON.stringify(dead));
	writeFileSync(join(records, "dev.lock.new-old"), "{}");
	writeFileSync(join(records, "dev.lock.recover.new-old"), "{}");
	writeFileSync(join(records, "dev.lock.new-fresh"), "{}");
	const old = new Date(Date.now() - 120_000);
	utimesSync(join(records, "dev.lock.new-old"), old, old);
	utimesSync(join(records, "dev.lock.recover.new-old"), old, old);
	await cleanResources(root, { apply: true });
	assert.equal(existsSync(join(records, "dev.lock.recover")), false);
	assert.equal(existsSync(join(records, "dev.lock.new-old")), false);
	assert.equal(existsSync(join(records, "dev.lock.recover.new-old")), false);
	assert.ok(existsSync(join(records, "dev.lock.new-fresh")));
	assert.equal((await run()).exitCode, 0);
	rmSync(join(records, "dev.lock.new-fresh"));
	// clean.lock과 그 .recover가 함께 죽은 채 남아도 clean이 스스로 푼다.
	writeFileSync(join(records, "clean.lock"), JSON.stringify(dead));
	writeFileSync(join(records, "clean.lock.recover"), JSON.stringify(dead));
	assert.equal((await cleanResources(root, { apply: true })).reason, undefined);
	assert.deepEqual(
		readdirSync(records).filter((name) => name.includes(".lock")),
		[],
	);
	// 재부팅 전 lock은 네임스페이스가 달라도 죽은 것이다(boot_id를 읽는 Linux만).
	if (process.platform === "linux") {
		writeFileSync(
			join(records, "dev.lock"),
			JSON.stringify({ ...dead, boot: "old-boot-id", ns: "pid:[1]" }),
		);
		assert.equal((await run()).exitCode, 0);
	}
	// 컨테이너(다른 pid 네임스페이스)의 lock은 생사를 알 수 없어 회수하지 않고 지울 파일을 안내한다.
	const foreign = { pid: 2 ** 22 + 1, token: "container", ns: "pid:[1]" };
	writeFileSync(join(records, "dev.lock"), JSON.stringify(foreign));
	await assert.rejects(
		run(),
		/다른 환경\(컨테이너·다른 OS\).*dev\.lock을 지운다/,
	);
	write(root, ".prokit/resource-guard/trash-left/old", "x");
	assert.match(
		(await cleanResources(root, { apply: true })).reason,
		/다른 환경.*dev\.lock이 있다/,
	);
	rmSync(join(records, "dev.lock"));
	assert.equal((await run()).exitCode, 0);
	// lease를 잇는 다른 환경의 lock은 실행 중으로 보고, lease가 끊기면 회수한다.
	writeFileSync(
		join(records, "dev.lock"),
		JSON.stringify({ ...foreign, lease: 100 }),
	);
	const lease = touchEvery(join(records, "dev.lock"));
	t.after(() => lease.kill("SIGKILL"));
	await assert.rejects(
		run(),
		/다른 환경\(컨테이너·다른 OS\)의 guard가 실행 중이다/,
	);
	lease.kill("SIGKILL");
	await new Promise((resolveWait) => lease.once("exit", resolveWait));
	assert.equal((await run()).exitCode, 0);
	assert.equal(existsSync(join(records, "dev.lock")), false);
	// 다른 환경에서 회수하다 죽은 .recover도 lease가 끊겼으면 한 단계 위에서 회수한다.
	writeFileSync(
		join(records, "dev.lock"),
		JSON.stringify({ ...foreign, lease: 100 }),
	);
	writeFileSync(
		join(records, "dev.lock.recover"),
		JSON.stringify({ ...foreign, token: "recovering", lease: 100 }),
	);
	assert.equal((await run()).exitCode, 0);
	assert.deepEqual(
		readdirSync(records).filter((name) => name.includes(".lock")),
		[],
	);
	// 다른 환경의 끝난 clean.lock은 실행할 때 회수해 다음 실행이 다시 기다리지 않는다.
	writeFileSync(
		join(records, "clean.lock"),
		JSON.stringify({ ...foreign, token: "cleaning", lease: 100 }),
	);
	assert.equal((await run()).exitCode, 0);
	assert.equal(existsSync(join(records, "clean.lock")), false);
	// 쓸 수 없는 lock 폴더는 "이미 실행 중"이 아니라 실제 원인을 알린다(root는 권한을 무시한다).
	if (process.getuid?.() !== 0) {
		chmodSync(records, 0o500);
		try {
			await assert.rejects(run(), /lock을 만들 수 없다: EACCES/);
		} finally {
			chmodSync(records, 0o700);
		}
	}
	writeFileSync(
		join(records, "clean.lock"),
		JSON.stringify({ pid: process.ppid, token: "cleaning" }),
	);
	const blocked = await run();
	assert.equal(blocked.exitCode, 75);
	assert.deepEqual(blocked.events, ["resource-clean-running"]);
	assert.equal(existsSync(join(records, "dev.lock")), false);
});

test("중간 symlink 아래에는 compiler cache를 만들지 않는다", async (t) => {
	const root = scratch();
	const outside = scratch();
	t.after(() => {
		rmSync(root, { recursive: true, force: true });
		rmSync(outside, { recursive: true, force: true });
	});
	symlinkSync(outside, join(root, "apps"));
	const result = await runGuarded(root, {
		command: process.execPath,
		args: ["-e", "process.exit(0)"],
		kind: "build",
	});
	assert.equal(result.exitCode, 0);
	assert.ok(result.events.includes("existing-or-unsafe-compiler-cache"));
	assert.equal(existsSync(join(outside, "web/.next/cache/turbopack")), false);
});

test("SIGTERM을 무시하는 소유 자식도 grace 뒤 종료한다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const result = await runGuarded(root, {
		command: process.execPath,
		args: [
			"-e",
			"process.on('SIGTERM', () => {}); setInterval(() => {}, 1000)",
		],
		commandTimeoutMs: 10,
		killGraceMs: 10,
	});
	assert.equal(result.exitCode, 75);
	assert.ok(result.events.includes("guard-timeout"));
	assert.equal(result.groupEnded, true);
});

test("실행 중 정책 파일이 깨져도 child를 끄지 않고, 끝난 뒤 측정이 unknown이면 75를 반환한다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	write(root, ".dev-cycle.json", '{"resources":{}}');
	const result = await runGuarded(root, {
		command: process.execPath,
		args: [
			"-e",
			"require('node:fs').writeFileSync('.dev-cycle.json', '{'); setTimeout(() => process.exit(0), 300)",
		],
		scanIntervalMs: 10,
		killGraceMs: 10,
	});
	assert.equal(result.exitCode, 75);
	assert.ok(result.events.includes("fast-inventory-unknown"));
	assert.ok(!result.events.includes("resource-budget-exceeded"));
	assert.ok(!result.events.some((event) => event.startsWith("guard-")));
	assert.equal(result.resourceExceeded, false);
	assert.equal(result.after.status, "unknown");
});

test("실행 전 측정이 끝나지 않으면 명령을 시작하지 않고 75를 반환한다", async (t) => {
	if (process.getuid?.() === 0) return t.skip("root는 읽기 권한을 무시한다");
	const root = scratch();
	t.after(() => {
		chmodSync(join(root, "locked"), 0o700);
		rmSync(root, { recursive: true, force: true });
	});
	mkdirSync(join(root, "locked"));
	chmodSync(join(root, "locked"), 0o000);
	const result = await runGuarded(root, {
		command: process.execPath,
		args: ["-e", "require('node:fs').writeFileSync('started', 'x')"],
		kind: "build",
		policy: { ...DEFAULT_RESOURCE_POLICY, free: { warn: 0, block: 0 } },
	});
	assert.equal(result.exitCode, 75);
	assert.equal(result.before.status, "unknown");
	assert.equal(existsSync(join(root, "started")), false);
	assert.ok(!result.events.includes("after-inventory-estimated"));
});

test("실행 뒤 전체 측정이 끝나지 않으면 실행 전 측정과 이번 캐시로 판정한다", async (t) => {
	if (process.getuid?.() === 0) return t.skip("root는 읽기 권한을 무시한다");
	const root = scratch();
	t.after(() => {
		if (existsSync(join(root, "locked")))
			chmodSync(join(root, "locked"), 0o700);
		rmSync(root, { recursive: true, force: true });
	});
	const policy = { ...DEFAULT_RESOURCE_POLICY, free: { warn: 0, block: 0 } };
	// 명령이 읽을 수 없는 폴더를 남겨 실행 뒤 전체 측정을 unknown으로 만든다.
	const build = [
		"-e",
		[
			"const fs = require('node:fs');",
			"fs.writeFileSync('apps/web/.next/cache/turbopack/out', 'x'.repeat(10));",
			"fs.mkdirSync('locked'); fs.chmodSync('locked', 0o000);",
			"process.exit(7);",
		].join(" "),
	];
	const kept = await runGuarded(root, {
		command: process.execPath,
		args: build,
		kind: "build",
		policy,
	});
	assert.equal(kept.exitCode, 7);
	assert.ok(kept.events.includes("after-inventory-estimated"));
	assert.equal(kept.after.measurement.estimated, true);
	assert.equal(kept.after.usage.cache, 10);
	// 명령이 자기 캐시를 지웠으면 그 캐시는 0으로 본다.
	chmodSync(join(root, "locked"), 0o700);
	rmSync(join(root, "locked"), { recursive: true });
	rmSync(join(root, "apps"), { recursive: true });
	const removed = await runGuarded(root, {
		command: process.execPath,
		args: [
			"-e",
			"const fs = require('node:fs'); fs.rmSync('apps', { recursive: true }); fs.mkdirSync('locked'); fs.chmodSync('locked', 0o000);",
		],
		kind: "build",
		policy,
	});
	assert.equal(removed.exitCode, 0);
	assert.ok(removed.events.includes("after-inventory-estimated"));
	assert.equal(removed.after.usage.cache, 0);
	// 추정이 예산을 넘으면 이번 캐시를 정리한다. 정리 뒤에도 전체를 못 재면 75다.
	chmodSync(join(root, "locked"), 0o700);
	rmSync(join(root, "locked"), { recursive: true });
	const blocked = await runGuarded(root, {
		command: process.execPath,
		args: build,
		kind: "build",
		policy: { ...policy, cache: { warn: 5, block: 5 } },
	});
	assert.equal(blocked.exitCode, 75);
	assert.ok(blocked.events.includes("after-inventory-estimated"));
	assert.equal(existsSync(join(root, "apps/web/.next/cache/turbopack")), false);
});

test("실행 중 측정이 늦어도(unknown) 감싼 장기 실행 명령을 끄지 않는다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const result = await runGuarded(root, {
		command: process.execPath,
		args: ["-e", "setTimeout(() => process.exit(0), 300)"],
		kind: "dev",
		// fast 측정만 1ms 제한이라 실행 중 측정은 모두 시간 초과(unknown)가 된다.
		policy: { fast: { timeoutMs: 20, workerTimeoutMs: 1 } },
		killGraceMs: 10,
	});
	assert.equal(result.exitCode, 0);
	assert.ok(result.events.includes("fast-inventory-unknown"));
	assert.ok(!result.events.some((event) => event.startsWith("guard-")));
	assert.ok(["ok", "warn"].includes(result.after.status));
});

test("실행 중 full inventory가 환경 성장을 한 번 감지하고 겹치지 않게 예약한다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const result = await runGuarded(root, {
		command: process.execPath,
		args: [
			"-e",
			[
				"const fs = require('node:fs');",
				"fs.mkdirSync('node_modules/pkg', { recursive: true });",
				"fs.writeFileSync('node_modules/pkg/a', 'x'.repeat(16));",
				"setTimeout(() => fs.rmSync('node_modules', { recursive: true }), 180);",
				"setTimeout(() => process.exit(0), 260);",
			].join(" "),
		],
		fullIntervalMs: 15,
		scanIntervalMs: 15,
		policy: {
			...DEFAULT_RESOURCE_POLICY,
			environment: { warn: 1_000 },
			environmentGrowth: { absolute: 2, ratio: 0.25 },
			free: { warn: 0, block: 0 },
		},
		environmentRefs: [{ kind: "nodeModules", beforeBytes: 0 }],
	});
	assert.equal(result.exitCode, 0);
	assert.ok(result.events.includes("full-inventory-warn"));
	assert.equal(existsSync(join(root, "node_modules")), false);
});
