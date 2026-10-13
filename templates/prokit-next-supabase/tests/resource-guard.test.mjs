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
import { tmpdir } from "node:os";
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
							[guard, "run", "--kind", "dev", "--", process.execPath, "-e", child],
							{ cwd: root, stdio: "ignore" },
						).on("close", done);
					}),
			),
		);
		// 실행한 하나는 0, 나머지는 lock을 못 잡아 2다. 성공한 실행이 다른 코드로 끝나지 않는다.
		assert.ok(codes.every((code) => code === 0 || code === 2), String(codes));
		assert.ok(codes.includes(0), `round ${round}: 죽은 lock을 회수하지 못했다`);
		const spans = readFileSync(join(root, "spans"), "utf8").trim().split("\n");
		const starts = spans.filter((line) => line.endsWith("start")).length;
		assert.equal(starts, codes.filter((code) => code === 0).length);
		let depth = 0;
		for (const line of spans) {
			depth += line.endsWith("start") ? 1 : -1;
			assert.ok(depth <= 1, `round ${round}: 실행이 겹쳤다\n${spans.join("\n")}`);
		}
	}
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
	writeFileSync(join(records, "dev.lock"), JSON.stringify({ pid: process.pid }));
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
	assert.deepEqual(
		readdirSync(records).filter((file) => !file.endsWith(".lock")),
		[],
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
	const orphan = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
		detached: true,
		stdio: "ignore",
	});
	t.after(() => {
		try {
			process.kill(-orphan.pid, "SIGKILL");
		} catch {}
	});
	writeFileSync(
		join(records, "dev.lock"),
		JSON.stringify({ pid: 2 ** 22 + 1, token: "orphan", childPgid: orphan.pid }),
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
	await assert.rejects(
		runGuarded(root, { command: process.execPath, kind: "clean" }),
		/clean은 guard 종류로/,
	);
	// 회수 도중 죽은 guard의 .recover가 남으면 그 kind는 막히고, 안내대로 clean --apply가 푼다.
	const dead = { pid: 2 ** 22 + 1, token: "dead" };
	writeFileSync(join(records, "dev.lock"), JSON.stringify(dead));
	writeFileSync(join(records, "dev.lock.recover"), JSON.stringify(dead));
	writeFileSync(join(records, "dev.lock.new-old"), "{}");
	writeFileSync(join(records, "dev.lock.recover.new-old"), "{}");
	writeFileSync(join(records, "dev.lock.new-fresh"), "{}");
	const old = new Date(Date.now() - 120_000);
	utimesSync(join(records, "dev.lock.new-old"), old, old);
	utimesSync(join(records, "dev.lock.recover.new-old"), old, old);
	await assert.rejects(run(), /resource clean --apply로 남은 회수 기록/);
	await cleanResources(root, { apply: true });
	assert.equal(existsSync(join(records, "dev.lock.recover")), false);
	assert.equal(existsSync(join(records, "dev.lock.new-old")), false);
	assert.equal(existsSync(join(records, "dev.lock.recover.new-old")), false);
	assert.ok(existsSync(join(records, "dev.lock.new-fresh")));
	assert.equal((await run()).exitCode, 0);
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
