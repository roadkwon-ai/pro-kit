import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
	existsSync,
	linkSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
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

test("BTS 하위 캐시·의존성·실제 venv와 명시 nested root를 분류한다", async (t) => {
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

test("실행 중 정책 파일이 깨지면 측정 오류로 child를 종료하고 75를 반환한다", async (t) => {
	const root = scratch();
	t.after(() => rmSync(root, { recursive: true, force: true }));
	write(root, ".dev-cycle.json", '{"resources":{}}');
	const result = await runGuarded(root, {
		command: process.execPath,
		args: [
			"-e",
			"require('node:fs').writeFileSync('.dev-cycle.json', '{'); setInterval(() => {}, 1000)",
		],
		scanIntervalMs: 10,
		killGraceMs: 10,
	});
	assert.equal(result.exitCode, 75);
	assert.ok(result.events.includes("resource-measurement-unknown"));
	assert.equal(result.after.status, "unknown");
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
