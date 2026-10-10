#!/usr/bin/env node
// 프로젝트 안에서만 캐시·임시 파일을 보수적으로 측정하고 실행을 보호한다.
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
	closeSync,
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	openSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	statfsSync,
	writeFileSync,
} from "node:fs";
import { arch, homedir, platform, release, tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
	isMainThread,
	parentPort,
	Worker,
	workerData,
} from "node:worker_threads";

const GiB = 1024 ** 3;
const CAPTURE_LIMIT = 1024 * 1024;
const managedHandles = new Map();
const activeLocks = new Map();
const ownedCleanContexts = new Map();

export const DEFAULT_RESOURCE_POLICY = Object.freeze({
	roots: [],
	cache: { warn: 20 * GiB, block: 40 * GiB },
	environment: { warn: 10 * GiB },
	environmentGrowth: { absolute: 2 * GiB, ratio: 0.25 },
	total: { warn: 40 * GiB, block: 80 * GiB },
	free: { warn: 20 * GiB, block: 10 * GiB },
	fast: { timeoutMs: 30_000, workerTimeoutMs: 10_000 },
	full: { timeoutMs: 300_000, workerTimeoutMs: 30_000 },
});

const CATEGORY_NAMES = [
	"buildCache",
	"nextOutput",
	"nodeModules",
	"pythonVenv",
	"managedTemp",
	"residual",
];

function category() {
	return { logicalBytes: 0, allocatedBytes: 0, files: 0, symlinks: 0 };
}

function emptyMeasurement(roots, mode) {
	return {
		roots,
		mode,
		categories: Object.fromEntries(
			CATEGORY_NAMES.map((name) => [name, category()]),
		),
		filesystems: [],
		sharedUnknown: true,
		unknown: false,
		timedOut: false,
	};
}

function mergedPolicy(policy = {}) {
	return {
		...DEFAULT_RESOURCE_POLICY,
		...policy,
		cache: { ...DEFAULT_RESOURCE_POLICY.cache, ...policy.cache },
		environment: {
			...DEFAULT_RESOURCE_POLICY.environment,
			...policy.environment,
		},
		environmentGrowth: {
			...DEFAULT_RESOURCE_POLICY.environmentGrowth,
			...policy.environmentGrowth,
		},
		total: { ...DEFAULT_RESOURCE_POLICY.total, ...policy.total },
		free: { ...DEFAULT_RESOURCE_POLICY.free, ...policy.free },
		fast: { ...DEFAULT_RESOURCE_POLICY.fast, ...policy.fast },
		full: { ...DEFAULT_RESOURCE_POLICY.full, ...policy.full },
		roots: Array.isArray(policy.roots) ? policy.roots : [],
	};
}

export async function readPolicy(root) {
	const path = join(root, ".dev-cycle.json");
	if (!existsSync(path)) return mergedPolicy();
	try {
		return mergedPolicy(JSON.parse(readFileSync(path, "utf8")).resources);
	} catch (error) {
		throw new Error(
			`.dev-cycle.json resources를 읽을 수 없다: ${error.message}`,
		);
	}
}

function classify(path, root, inherited) {
	const parts = relative(root, path).split("\\").join("/").split("/");
	const nextIndex = parts.lastIndexOf(".next");
	if (nextIndex >= 0 && parts.slice(nextIndex + 1).includes("cache"))
		return "buildCache";
	if (nextIndex >= 0) return "nextOutput";
	if (parts.at(-1) === "node_modules") return "nodeModules";
	if (parts.at(-2) === ".turbo" && parts.at(-1) === "cache")
		return "buildCache";
	if (existsSync(join(path, "pyvenv.cfg"))) return "pythonVenv";
	if (parts.at(-2) === ".prokit" && parts.at(-1) === "resource-tmp")
		return "managedTemp";
	return inherited;
}

function allocatedBytes(stat) {
	if (typeof stat.blocks === "number") return stat.blocks * 512;
	return Math.ceil(stat.size / 4096) * 4096;
}

function safeRoot(root) {
	const absolute = resolve(root);
	if (absolute === resolve(homedir()))
		throw new Error("홈 디렉터리는 측정하거나 정리할 수 없다");
	const stat = lstatSync(absolute);
	if (!stat.isDirectory() || stat.isSymbolicLink())
		throw new Error(`안전한 프로젝트 루트가 아니다: ${root}`);
	if (dirname(absolute) === absolute)
		throw new Error("파일시스템 루트는 측정하거나 정리할 수 없다");
	return { path: realpathSync(absolute), stat };
}

const RESOURCE_KINDS = new Set([
	"workspace",
	"buildCache",
	"nextOutput",
	"nodeModules",
	"pythonVenv",
	"managedTemp",
]);

function rootDescriptor(input) {
	if (typeof input === "string")
		return { path: input, kind: "workspace", lifetime: "project" };
	if (
		!input ||
		typeof input.path !== "string" ||
		!RESOURCE_KINDS.has(input.kind)
	)
		throw new Error("resources.roots 항목이 올바르지 않다");
	const lifetime = input.lifetime ?? "project";
	if (!["project", "temporary"].includes(lifetime))
		throw new Error("resources.roots lifetime이 올바르지 않다");
	return { path: input.path, kind: input.kind, lifetime };
}

function measureLocal({ roots, mode }) {
	const result = emptyMeasurement(roots, mode);
	const seenFiles = new Set();
	const filesystems = new Set();
	const inputs = roots
		.map((input) => rootDescriptor(input))
		.sort((left, right) => {
			const leftWorkspace = left.kind === "workspace" ? 1 : 0;
			const rightWorkspace = right.kind === "workspace" ? 1 : 0;
			return (
				leftWorkspace - rightWorkspace || right.path.length - left.path.length
			);
		});
	for (const descriptor of inputs) {
		let root;
		try {
			root = safeRoot(descriptor.path).path;
		} catch (error) {
			result.unknown = true;
			result.errors = [...(result.errors ?? []), error.message];
			continue;
		}
		try {
			const fs = statfsSync(root);
			const key = `${fs.type}:${fs.bsize}:${fs.blocks}`;
			if (!filesystems.has(key)) {
				filesystems.add(key);
				result.filesystems.push({
					root,
					freeBytes: Number(fs.bavail) * Number(fs.bsize),
					totalBytes: Number(fs.blocks) * Number(fs.bsize),
				});
			}
		} catch {
			result.unknown = true;
		}
		const visit = (
			path,
			inherited = descriptor.kind === "workspace"
				? "residual"
				: descriptor.kind,
		) => {
			let entries;
			try {
				entries = readdirSync(path, { withFileTypes: true });
			} catch {
				result.unknown = true;
				return;
			}
			const current = classify(path, root, inherited);
			for (const entry of entries) {
				const child = join(path, entry.name);
				let stat;
				try {
					stat = lstatSync(child);
				} catch {
					result.unknown = true;
					continue;
				}
				if (stat.isSymbolicLink()) {
					result.categories.residual.symlinks += 1;
					continue;
				}
				if (stat.isDirectory()) {
					visit(child, current);
					continue;
				}
				if (!stat.isFile()) continue;
				const identity = `${stat.dev}:${stat.ino}`;
				if (seenFiles.has(identity)) continue;
				seenFiles.add(identity);
				const bucket = result.categories[current];
				bucket.logicalBytes += stat.size;
				bucket.allocatedBytes += allocatedBytes(stat);
				bucket.files += 1;
			}
		};
		visit(root);
	}
	return result;
}

export async function measureResources({
	roots,
	mode = "fast",
	activeTargets = [],
	timeoutMs,
} = {}) {
	const scanRoots = activeTargets.length > 0 ? activeTargets : (roots ?? []);
	if (scanRoots.length === 0) throw new Error("측정할 프로젝트 루트가 없다");
	const policy = mergedPolicy();
	const limit = timeoutMs ?? policy[mode]?.workerTimeoutMs;
	if (!isMainThread) return measureLocal({ roots: scanRoots, mode });
	return await new Promise((resolveMeasurement) => {
		const worker = new Worker(new URL(import.meta.url), {
			// 엔트리 전용(--test, --input-type)과 런처 내부 플래그는 전달하지 않는다.
			// 권한 경계 플래그는 worker에도 그대로 적용한다.
			execArgv: process.execArgv.filter((flag) =>
				/^(--permission|--allow-|--deny-)/.test(flag),
			),
			workerData: { resourceGuardMeasure: true, roots: scanRoots, mode },
		});
		let done = false;
		const finish = (result) => {
			if (done) return;
			done = true;
			clearTimeout(timer);
			resolveMeasurement(result);
		};
		const timer = setTimeout(() => {
			worker.terminate().finally(() => {
				const result = emptyMeasurement(scanRoots, mode);
				result.timedOut = true;
				result.unknown = true;
				finish(result);
			});
		}, limit);
		worker.once("message", finish);
		worker.once("error", (error) => {
			const result = emptyMeasurement(scanRoots, mode);
			result.unknown = true;
			result.errors = [error.message];
			finish(result);
		});
	});
}

function sumCategories(measurement, names) {
	return names.reduce(
		(sum, name) => sum + (measurement.categories?.[name]?.logicalBytes ?? 0),
		0,
	);
}

export async function checkResources(root, options = {}) {
	const policy = options.policy
		? mergedPolicy(options.policy)
		: await readPolicy(root);
	const configuredRoots = policy.roots.map((entry) => ({
		...entry,
		path: resolve(root, entry.path),
	}));
	const measurement =
		options.measurement ??
		(await measureResources({
			roots: options.roots ?? [root, ...configuredRoots],
			activeTargets: options.activeTargets,
			mode: options.mode ?? "fast",
			timeoutMs:
				options.timeoutMs ?? policy[options.mode ?? "fast"].workerTimeoutMs,
		}));
	if (measurement.unknown || measurement.timedOut)
		return {
			status: "unknown",
			measurement,
			reasons: ["측정이 완전하지 않다"],
		};
	const cache = sumCategories(measurement, ["buildCache"]);
	const environments = {
		nodeModules: measurement.categories?.nodeModules?.logicalBytes ?? 0,
		pythonVenv: measurement.categories?.pythonVenv?.logicalBytes ?? 0,
	};
	const total = sumCategories(
		measurement,
		CATEGORY_NAMES.filter((name) => name !== "residual"),
	);
	const free = Math.min(...measurement.filesystems.map((fs) => fs.freeBytes));
	const reasons = [];
	const reaches = (value, limit) => (limit === 0 ? value >= 0 : value >= limit);
	let block = false;
	let warn = false;
	if (reaches(cache, policy.cache.block)) {
		block = true;
		reasons.push("캐시 차단 한계 초과");
	} else if (reaches(cache, policy.cache.warn)) {
		warn = true;
		reasons.push("캐시 경고 한계 초과");
	}
	for (const [kind, bytes] of Object.entries(environments)) {
		if (bytes >= policy.environment.warn) {
			warn = true;
			reasons.push(`${kind} 환경 경고 한계 초과`);
		}
	}
	const growth = [];
	for (const reference of options.environmentRefs ?? []) {
		const afterBytes = environments[reference.kind];
		if (!Number.isFinite(reference.beforeBytes) || afterBytes === undefined)
			continue;
		const addedBytes = Math.max(0, afterBytes - reference.beforeBytes);
		const limit = Math.max(
			policy.environmentGrowth.absolute,
			reference.beforeBytes * policy.environmentGrowth.ratio,
		);
		growth.push({
			kind: reference.kind,
			beforeBytes: reference.beforeBytes,
			afterBytes,
			addedBytes,
			limit,
		});
		if (addedBytes >= limit) {
			warn = true;
			reasons.push(`${reference.kind} 재설치 성장 경고 한계 초과`);
		}
	}
	const newHeavy =
		options.isNewHeavy ?? ["build", "heavy"].includes(options.kind);
	if (newHeavy && reaches(total, policy.total.block)) {
		block = true;
		reasons.push("신규 무거운 작업 총량 차단 한계 초과");
	} else if (total >= policy.total.warn) {
		warn = true;
		reasons.push("총량 경고 한계 초과");
	}
	if (free <= policy.free.block) {
		block = true;
		reasons.push("여유 공간 차단 한계 이하");
	} else if (free <= policy.free.warn) {
		warn = true;
		reasons.push("여유 공간 경고 한계 이하");
	}
	return {
		status: block ? "block" : warn ? "warn" : "ok",
		measurement,
		reasons,
		usage: { cache, environments, total, free, growth },
	};
}

function lockPath(root, kind) {
	if (!/^[a-z0-9_-]+$/i.test(kind))
		throw new Error("허용하지 않는 guard 종류다");
	return join(root, ".prokit", "resource-guard", `${kind}.lock`);
}

function processIsAlive(pid) {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

function verifiedParentLock(safe, kind, parent) {
	if (!parent || typeof parent !== "object") return null;
	if (
		parent.root !== safe.path ||
		parent.rootDev !== safe.stat.dev ||
		parent.rootIno !== safe.stat.ino ||
		parent.kind !== kind ||
		!parent.token ||
		!processIsAlive(parent.pid)
	)
		return null;
	try {
		const saved = JSON.parse(readFileSync(lockPath(safe.path, kind), "utf8"));
		return saved.token === parent.token &&
			saved.pid === parent.pid &&
			saved.root === safe.path &&
			saved.kind === kind
			? saved
			: null;
	} catch {
		return null;
	}
}

function acquireLock(root, kind, runId, parent) {
	const safe = safeRoot(root);
	const key = `${safe.path}:${kind}`;
	const nested = activeLocks.get(key);
	if (nested) {
		if (parent?.token !== nested.token)
			throw new Error(`${kind} guard가 이미 실행 중이거나 상태가 불명확하다`);
		nested.references += 1;
		return { ...nested, nested: true };
	}
	const verifiedParent = verifiedParentLock(safe, kind, parent);
	if (verifiedParent)
		return { ...verifiedParent, path: lockPath(safe.path, kind), shared: true };
	const path = lockPath(safe.path, kind);
	mkdirSync(dirname(path), { recursive: true });
	let fd;
	try {
		fd = openSync(path, "wx", 0o600);
	} catch {
		throw new Error(`${kind} guard가 이미 실행 중이거나 상태가 불명확하다`);
	}
	const owner = {
		root: safe.path,
		rootDev: safe.stat.dev,
		rootIno: safe.stat.ino,
		kind,
		runId,
		pid: process.pid,
		token: randomUUID(),
	};
	writeFileSync(fd, JSON.stringify(owner));
	closeSync(fd);
	const lock = { ...owner, path, references: 1 };
	activeLocks.set(key, lock);
	return lock;
}

function releaseLock(lock) {
	if (lock.shared) return;
	const key = `${lock.root}:${lock.kind}`;
	const current = activeLocks.get(key);
	if (!current) return;
	current.references -= 1;
	if (current.references > 0) return;
	try {
		const saved = JSON.parse(readFileSync(current.path, "utf8"));
		if (saved.runId === current.runId && saved.pid === process.pid)
			rmSync(current.path);
	} finally {
		activeLocks.delete(key);
	}
}

function appendBounded(current, chunk, limit) {
	const bytes = Buffer.concat([current, chunk]);
	return bytes.length <= limit ? bytes : bytes.subarray(0, limit);
}

function terminateOwnedChild(child) {
	if (child.exitCode !== null || child.killed) return;
	try {
		if (process.platform !== "win32" && child.pid)
			process.kill(-child.pid, "SIGTERM");
		else child.kill("SIGTERM");
	} catch {
		child.kill("SIGTERM");
	}
}

function killOwnedChild(child) {
	try {
		if (process.platform !== "win32" && child.pid)
			process.kill(-child.pid, "SIGKILL");
		else if (child.exitCode === null && !child.killed) child.kill("SIGKILL");
	} catch {
		if (child.exitCode === null && !child.killed) child.kill("SIGKILL");
	}
}

function processGroupEnded(pid) {
	if (!pid || process.platform === "win32") return false;
	try {
		process.kill(-pid, 0);
		return false;
	} catch (error) {
		return error.code === "ESRCH";
	}
}

function childGroupEnded(child) {
	return process.platform === "win32"
		? child.exitCode !== null
		: processGroupEnded(child.pid);
}

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

async function finishOwnedGroup(child, graceMs) {
	if (childGroupEnded(child)) return true;
	await wait(graceMs);
	if (!childGroupEnded(child)) killOwnedChild(child);
	for (let attempt = 0; attempt < 40; attempt += 1) {
		if (childGroupEnded(child)) return true;
		await wait(25);
	}
	return childGroupEnded(child);
}

const STANDARD_COMPILER_CACHES = {
	build: ["apps/web/.next/cache/turbopack"],
	dev: ["apps/web/.next/dev/cache/turbopack"],
};

function safeChildPath(root, relativePath) {
	const path = resolve(root, relativePath);
	const inside = relative(root, path);
	if (!inside || inside.startsWith("..") || inside.includes(`..${sep}`))
		return null;
	let current = root;
	for (const part of inside.split(sep)) {
		current = join(current, part);
		if (!existsSync(current)) continue;
		const stat = lstatSync(current);
		if (
			stat.isSymbolicLink() ||
			!realpathSync(current).startsWith(`${root}${sep}`)
		)
			return null;
	}
	return path;
}

function prepareCompilerCaches(root, kind, runId, options, events) {
	const safe = safeRoot(root);
	if (options.compilerCacheRoots?.length) {
		events.push("unowned-compiler-cache-root");
		return [];
	}
	const contexts = [];
	for (const relativePath of STANDARD_COMPILER_CACHES[kind] ?? []) {
		const path = safeChildPath(safe.path, relativePath);
		if (!path || existsSync(path)) {
			events.push("existing-or-unsafe-compiler-cache");
			continue;
		}
		mkdirSync(path, { recursive: true });
		const stat = lstatSync(path);
		if (
			!stat.isDirectory() ||
			stat.isSymbolicLink() ||
			realpathSync(path) !== path
		) {
			events.push("existing-or-unsafe-compiler-cache");
			continue;
		}
		const context = {
			compilerCachePath: path,
			token: randomUUID(),
			runId,
			root: safe.path,
			rootDev: safe.stat.dev,
			rootIno: safe.stat.ino,
			parent: dirname(path),
			parentDev: lstatSync(dirname(path)).dev,
			parentIno: lstatSync(dirname(path)).ino,
			dev: stat.dev,
			ino: stat.ino,
			markerPath: join(
				safe.path,
				".prokit",
				"resource-guard",
				`compiler-${runId}-${randomUUID()}.json`,
			),
			leaseEnded: false,
			childrenEnded: false,
		};
		mkdirSync(dirname(context.markerPath), { recursive: true });
		writeFileSync(
			context.markerPath,
			JSON.stringify({
				origin: "resource-guard-compiler-cache",
				root: safe.path,
				rootDev: safe.stat.dev,
				rootIno: safe.stat.ino,
				runId,
				token: context.token,
			}),
		);
		ownedCleanContexts.set(context.token, context);
		contexts.push(context);
	}
	return contexts;
}

function finishCompilerCaches(contexts, groupEnded) {
	for (const context of contexts) {
		context.childrenEnded = groupEnded;
		context.leaseEnded = true;
	}
}

async function runChild(root, options, events, policy) {
	return await new Promise((resolveRun, rejectRun) => {
		const child = spawn(options.command, options.args, {
			cwd: options.cwd ?? root,
			env: { ...process.env, ...options.env },
			stdio: options.captureOutput
				? ["ignore", "pipe", "pipe"]
				: (options.stdio ?? "inherit"),
			detached: process.platform !== "win32",
		});
		options.onChildSpawn?.(child);
		let stdout = Buffer.alloc(0);
		let stderr = Buffer.alloc(0);
		let interrupted = false;
		let resourceExceeded = false;
		let checking = false;
		let killTimer = null;
		const limit = options.captureLimit ?? CAPTURE_LIMIT;
		const stopOwnedGroup = (event) => {
			if (interrupted) return;
			interrupted = true;
			events.push(event);
			terminateOwnedChild(child);
			killTimer = setTimeout(() => {
				if (!childGroupEnded(child)) killOwnedChild(child);
			}, options.killGraceMs ?? 100);
		};
		child.stdout?.on("data", (chunk) => {
			stdout = appendBounded(stdout, chunk, limit);
		});
		child.stderr?.on("data", (chunk) => {
			stderr = appendBounded(stderr, chunk, limit);
		});
		const scan = async (scanOptions, event) => {
			if (checking || interrupted) return;
			checking = true;
			try {
				const status = await checkResources(root, scanOptions);
				if (status.status === "warn") events.push(`${event}-warn`);
				if (status.status === "block" || status.status === "unknown") {
					resourceExceeded = true;
					stopOwnedGroup(
						status.status === "unknown"
							? "resource-measurement-unknown"
							: "resource-budget-exceeded",
					);
				}
			} catch {
				resourceExceeded = true;
				stopOwnedGroup("resource-measurement-unknown");
			} finally {
				checking = false;
			}
		};
		const fastInterval =
			options.scanIntervalMs ?? policy[options.mode ?? "fast"].timeoutMs;
		const fullInterval = options.fullIntervalMs ?? policy.full.timeoutMs;
		let lastFullAt = Date.now();
		const monitor = setInterval(() => {
			if (checking || interrupted) return;
			const fullDue = Date.now() - lastFullAt >= fullInterval;
			void scan(
				fullDue ? options.fullInventoryOptions : options,
				fullDue ? "full-inventory" : "fast-inventory",
			).finally(() => {
				if (fullDue) lastFullAt = Date.now();
			});
		}, fastInterval);
		const timer = options.commandTimeoutMs
			? setTimeout(() => {
					stopOwnedGroup("guard-timeout");
				}, options.commandTimeoutMs)
			: null;
		const signalHandlers = new Map(
			["SIGINT", "SIGTERM"].map((signal) => [
				signal,
				() => stopOwnedGroup(`guard-${signal.toLowerCase()}`),
			]),
		);
		for (const [signal, handler] of signalHandlers)
			process.once(signal, handler);
		const removeSignalHandlers = () => {
			for (const [signal, handler] of signalHandlers)
				process.removeListener(signal, handler);
		};
		child.once("error", (error) => {
			clearInterval(monitor);
			if (timer) clearTimeout(timer);
			if (killTimer) clearTimeout(killTimer);
			removeSignalHandlers();
			rejectRun(error);
		});
		child.once("close", (code) => {
			clearInterval(monitor);
			if (timer) clearTimeout(timer);
			removeSignalHandlers();
			const groupWasActive = !childGroupEnded(child);
			void finishOwnedGroup(child, options.killGraceMs ?? 100).then(
				(groupEnded) => {
					if (killTimer) clearTimeout(killTimer);
					resolveRun({
						exitCode:
							interrupted || groupWasActive || !groupEnded ? 75 : (code ?? 1),
						stdout: stdout.toString(),
						stderr: stderr.toString(),
						resourceExceeded,
						groupEnded,
						groupWasActive,
					});
				},
			);
		});
	});
}

async function checkedResources(root, options) {
	try {
		return await checkResources(root, options);
	} catch (error) {
		return {
			status: "unknown",
			measurement: null,
			reasons: [`측정 설정을 읽을 수 없다: ${error.message}`],
		};
	}
}

export async function runGuarded(root, options = {}) {
	const { command, args = [], kind = "run" } = options;
	if (!command) throw new Error("실행할 command가 없다");
	const runId = randomUUID();
	let lock;
	const events = [];
	try {
		lock = acquireLock(root, kind, runId, options.nestedParent);
		const guardOptions = { ...options, command, args, kind };
		const inventoryOptions = {
			...guardOptions,
			mode: "full",
			activeTargets: [],
		};
		const policy = options.policy
			? mergedPolicy(options.policy)
			: await readPolicy(root);
		const temporaryHandle = options.temporaryHandle;
		const bindTemporaryChild = (child) => {
			if (
				!temporaryHandle ||
				managedHandles.get(temporaryHandle?.token) !== temporaryHandle ||
				![temporaryHandle.sourceRoot, temporaryHandle.path].includes(
					safeRoot(root).path,
				) ||
				!child.pid
			)
				return;
			temporaryHandle.children.push(child.pid);
			if (process.platform !== "win32") temporaryHandle.groups.push(child.pid);
		};
		let caches = prepareCompilerCaches(root, kind, runId, options, events);
		const before = await checkedResources(root, inventoryOptions);
		if (before.status === "block" || before.status === "unknown") {
			finishCompilerCaches(caches, true);
			for (const context of caches) {
				await cleanResources(root, {
					apply: true,
					ownershipContext: context,
					guardLock: lock,
				});
			}
			return {
				exitCode: 75,
				stdout: "",
				stderr: "",
				events,
				before,
				after: before,
				runId,
			};
		}
		let runningOptions = {
			...guardOptions,
			onChildSpawn: bindTemporaryChild,
			mode: "fast",
			fullInventoryOptions: inventoryOptions,
			activeTargets: caches.map((context) => ({
				path: context.compilerCachePath,
				kind: "buildCache",
				lifetime: "temporary",
			})),
		};
		let result = await runChild(root, runningOptions, events, policy);
		finishCompilerCaches(caches, result.groupEnded);
		if (!result.groupEnded) events.push("child-group-active");
		let after = await checkedResources(root, inventoryOptions);
		if (after.status === "unknown") {
			result.exitCode = 75;
			return { ...result, events, before, after, runId };
		}
		if (result.resourceExceeded || after.status === "block") {
			if (!result.groupEnded) result.exitCode = 75;
			for (const context of caches) {
				await cleanResources(root, {
					apply: true,
					ownershipContext: context,
					guardLock: lock,
				});
			}
			const afterClean = await checkedResources(root, inventoryOptions);
			if (
				result.groupEnded &&
				(afterClean.status === "ok" || afterClean.status === "warn")
			) {
				events.push("resource-retry");
				caches = prepareCompilerCaches(root, kind, runId, options, events);
				runningOptions = {
					...guardOptions,
					onChildSpawn: bindTemporaryChild,
					mode: "fast",
					fullInventoryOptions: inventoryOptions,
					activeTargets: caches.map((context) => ({
						path: context.compilerCachePath,
						kind: "buildCache",
						lifetime: "temporary",
					})),
				};
				result = await runChild(root, runningOptions, events, policy);
				finishCompilerCaches(caches, result.groupEnded);
				if (!result.groupEnded) events.push("child-group-active");
				after = await checkedResources(root, inventoryOptions);
				if (
					after.status === "unknown" ||
					result.resourceExceeded ||
					after.status === "block"
				)
					result.exitCode = 75;
			} else {
				after = afterClean;
				result.exitCode = 75;
			}
		}
		return { ...result, events, before, after, runId };
	} finally {
		if (lock) releaseLock(lock);
	}
}

function ownedCompilerCache(root, context) {
	if (!context?.compilerCachePath || !context?.token || !context?.runId)
		return null;
	if (ownedCleanContexts.get(context.token) !== context) return null;
	const safe = safeRoot(root);
	const path = resolve(context.compilerCachePath);
	const marker = context.markerPath;
	if (!path.startsWith(`${safe.path}/`) || !existsSync(marker)) return null;
	try {
		const stat = lstatSync(path);
		const parent = lstatSync(dirname(path));
		const owner = JSON.parse(readFileSync(marker, "utf8"));
		if (
			stat.isSymbolicLink() ||
			owner.origin !== "resource-guard-compiler-cache" ||
			owner.root !== safe.path ||
			owner.rootDev !== safe.stat.dev ||
			owner.rootIno !== safe.stat.ino ||
			owner.runId !== context.runId ||
			owner.token !== context.token ||
			parent.isSymbolicLink() ||
			parent.dev !== context.parentDev ||
			parent.ino !== context.parentIno ||
			stat.dev !== context.dev ||
			stat.ino !== context.ino
		)
			return null;
		return { safe, path, owner };
	} catch {
		return null;
	}
}

export async function cleanResources(root, options = {}) {
	const owned = ownedCompilerCache(root, options.ownershipContext);
	const candidates = owned ? [owned.path] : [];
	if (!options.apply) return { applied: false, candidates };
	if (!owned)
		return {
			applied: false,
			candidates,
			reason: "검증된 compiler cache 소유권이 없다",
		};
	if (
		!options.ownershipContext.leaseEnded ||
		!options.ownershipContext.childrenEnded
	)
		return {
			applied: false,
			candidates,
			reason: "실행 lease 또는 자식 종료 증명이 없다",
		};
	const lock = acquireLock(owned.safe.path, "clean", randomUUID());
	try {
		const locks = join(owned.safe.path, ".prokit", "resource-guard");
		for (const name of readdirSync(locks)) {
			if (!name.endsWith(".lock")) continue;
			if (name === "clean.lock") continue;
			if (name !== `${options.guardLock?.kind}.lock`)
				return { applied: false, candidates, reason: "실행 중인 guard가 있다" };
			try {
				const owner = JSON.parse(readFileSync(join(locks, name), "utf8"));
				if (
					owner.runId !== options.guardLock.runId ||
					owner.token !== options.guardLock.token ||
					owner.pid !== process.pid
				)
					return {
						applied: false,
						candidates,
						reason: "guard 소유권이 다르다",
					};
			} catch {
				return {
					applied: false,
					candidates,
					reason: "guard 소유권을 읽을 수 없다",
				};
			}
		}
		rmSync(owned.path, { recursive: true, force: false });
		rmSync(options.ownershipContext.markerPath, { force: false });
		return { applied: true, candidates };
	} finally {
		releaseLock(lock);
	}
}

function fingerprintFiles(root) {
	return [
		"package.json",
		"pnpm-lock.yaml",
		"package-lock.json",
		"yarn.lock",
		"pyproject.toml",
		"requirements.txt",
	]
		.map((name) => join(root, name))
		.filter(existsSync)
		.map((path) => [relative(root, path), readFileSync(path)]);
}

export async function environmentFingerprint(root, options = {}) {
	const safe = safeRoot(root).path;
	const hash = createHash("sha256");
	hash.update(
		JSON.stringify({
			platform: platform(),
			release: release(),
			arch: arch(),
			runtime: process.version,
			groups: process.getgroups?.() ?? [],
		}),
	);
	for (const [name, content] of fingerprintFiles(safe)) {
		hash.update(name);
		hash.update(content);
	}
	for (const item of options.installConfig ?? []) hash.update(String(item));
	for (const item of options.localDependencies ?? []) hash.update(String(item));
	const value = hash.digest("hex");
	return {
		value,
		root: safe,
		reusable: false,
		candidateOnly: true,
		health: "unknown",
	};
}

export async function createManagedTemporary(root, options = {}) {
	const safe = safeRoot(root);
	const runId = options.runId ?? randomUUID();
	const parent = resolve(
		options.parent ?? join(tmpdir(), "prokit-resource-guard"),
	);
	if (
		parent === resolve(homedir()) ||
		dirname(parent) === parent ||
		parent === safe.path ||
		parent.startsWith(`${safe.path}/`) ||
		safe.path.startsWith(`${parent}/`)
	)
		throw new Error("관리 임시 부모는 소스와 분리된 안전한 디렉터리여야 한다");
	mkdirSync(parent, { recursive: true });
	const actualParent = safeRoot(parent);
	const path = mkdtempSync(join(actualParent.path, `${runId}-`));
	const stat = lstatSync(path);
	const handle = {
		path,
		token: randomUUID(),
		runId,
		sourceRoot: safe.path,
		root: safe.path,
		rootDev: safe.stat.dev,
		rootIno: safe.stat.ino,
		parent: actualParent.path,
		parentDev: actualParent.stat.dev,
		parentIno: actualParent.stat.ino,
		dev: stat.dev,
		ino: stat.ino,
		origin: "resource-guard",
		children: [],
		groups: [],
	};
	managedHandles.set(handle.token, handle);
	writeFileSync(
		join(path, ".resource-guard-owner.json"),
		JSON.stringify({ runId, token: handle.token, pid: process.pid }),
	);
	return handle;
}

function childrenEnded(handle) {
	return (
		handle.children.every((pid) => !processIsAlive(pid)) &&
		handle.groups.every((pid) => processGroupEnded(pid))
	);
}

export async function disposeManagedTemporary(handle, options = {}) {
	const owned = managedHandles.get(handle?.token);
	if (!owned || owned !== handle)
		return { disposed: false, reason: "현재 실행의 관리 핸들이 아니다" };
	if (!options.artifactTransferred)
		return { disposed: false, reason: "결과 이전 증명이 없다" };
	if (!childrenEnded(handle))
		return { disposed: false, reason: "소유 자식이 아직 실행 중이다" };
	try {
		const root = safeRoot(handle.sourceRoot);
		const parent = safeRoot(handle.parent);
		const stat = lstatSync(handle.path);
		if (
			root.stat.dev !== handle.rootDev ||
			root.stat.ino !== handle.rootIno ||
			parent.stat.dev !== handle.parentDev ||
			parent.stat.ino !== handle.parentIno ||
			dirname(handle.path) !== parent.path ||
			stat.dev !== handle.dev ||
			stat.ino !== handle.ino ||
			stat.isSymbolicLink()
		)
			return {
				disposed: false,
				reason: "루트 또는 임시 경로의 소유권이 달라졌다",
			};
	} catch (error) {
		return { disposed: false, reason: error.message };
	}
	try {
		rmSync(handle.path, { recursive: true, force: false });
		managedHandles.delete(handle.token);
		return { disposed: true };
	} catch (error) {
		return { disposed: false, reason: error.message };
	}
}

export async function main(argv = process.argv.slice(2), root = process.cwd()) {
	const [command = "check", ...args] = argv;
	if (command === "check") {
		const result = await checkResources(root);
		console.log(JSON.stringify(result));
		return result.status === "ok" || result.status === "warn"
			? 0
			: result.status === "block"
				? 1
				: 2;
	}
	if (command === "clean") {
		const result = await cleanResources(root, {
			apply: args.includes("--apply"),
		});
		console.log(JSON.stringify(result));
		return 0;
	}
	if (command === "run") {
		const separator = args.indexOf("--");
		const guardArgs = separator < 0 ? args : args.slice(0, separator);
		const commandArgs = separator < 0 ? [] : args.slice(separator + 1);
		if (commandArgs.length === 0)
			throw new Error("run 뒤에 -- command를 넣어야 한다");
		let kind = "run";
		for (let index = 0; index < guardArgs.length; index += 1) {
			if (guardArgs[index] !== "--kind" || !guardArgs[index + 1])
				throw new Error("run 옵션은 --kind <이름>만 지원한다");
			kind = guardArgs[index + 1];
			index += 1;
		}
		const result = await runGuarded(root, {
			command: commandArgs[0],
			args: commandArgs.slice(1),
			kind,
		});
		return result.exitCode;
	}
	throw new Error(`알 수 없는 resource guard 명령: ${command}`);
}

if (!isMainThread && workerData?.resourceGuardMeasure) {
	parentPort.postMessage(measureLocal(workerData));
} else if (
	isMainThread &&
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	main()
		.then((code) => {
			process.exitCode = code;
		})
		.catch((error) => {
			console.error(error.message);
			process.exitCode = 2;
		});
}
