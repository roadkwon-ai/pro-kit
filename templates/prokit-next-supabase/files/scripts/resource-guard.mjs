#!/usr/bin/env node
// 프로젝트 안에서만 캐시·임시 파일을 보수적으로 측정하고 실행을 보호한다.
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
	closeSync,
	existsSync,
	linkSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	openSync,
	readdirSync,
	readFileSync,
	readlinkSync,
	realpathSync,
	renameSync,
	rmSync,
	statfsSync,
	utimesSync,
	writeFileSync,
} from "node:fs";
import { lstat, readdir, statfs } from "node:fs/promises";
import { arch, homedir, platform, release, tmpdir, uptime } from "node:os";
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

function classify(path, root, inherited, entries) {
	const parts = relative(root, path).split("\\").join("/").split("/");
	const nextIndex = parts.lastIndexOf(".next");
	if (nextIndex >= 0 && parts.slice(nextIndex + 1).includes("cache"))
		return "buildCache";
	if (nextIndex >= 0) return "nextOutput";
	if (parts.at(-1) === "node_modules") return "nodeModules";
	if (parts.at(-2) === ".turbo" && parts.at(-1) === "cache")
		return "buildCache";
	if (entries.some((entry) => entry.name === "pyvenv.cfg")) return "pythonVenv";
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

// 컨테이너의 공유 폴더(virtiofs)처럼 호출마다 왕복이 긴 파일 시스템도 제한 시간 안에 재도록
// 디렉터리 여러 개를 동시에 읽는다. 디렉터리와 링크는 readdir 형식으로 가려 파일만 lstat한다.
const MEASURE_CONCURRENCY = 16;

async function measureLocal({ roots, mode }) {
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
	// root는 차례로 잰다. 좁은 root를 먼저 재야 겹친 파일이 그 종류로 한 번만 세진다.
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
		const pending = [
			[root, descriptor.kind === "workspace" ? "residual" : descriptor.kind],
		];
		const visit = async ([path, inherited]) => {
			let entries;
			try {
				entries = await readdir(path, { withFileTypes: true });
			} catch (error) {
				// 측정 중에 사라진 디렉터리는 공간을 쓰지 않는다.
				if (error.code !== "ENOENT") result.unknown = true;
				return;
			}
			const current = classify(path, root, inherited, entries);
			// 아주 큰 디렉터리도 한 번에 너무 많은 lstat을 걸지 않게 나눠 읽는다.
			for (let start = 0; start < entries.length; start += 256)
				await Promise.all(
					entries.slice(start, start + 256).map(async (entry) => {
						const child = join(path, entry.name);
						if (entry.isSymbolicLink()) {
							result.categories.residual.symlinks += 1;
							return;
						}
						if (entry.isDirectory()) {
							pending.push([child, current]);
							return;
						}
						if (!entry.isFile()) return;
						let stat;
						try {
							stat = await lstat(child);
						} catch (error) {
							if (error.code !== "ENOENT") result.unknown = true;
							return;
						}
						if (!stat.isFile()) return;
						const identity = `${stat.dev}:${stat.ino}`;
						if (seenFiles.has(identity)) return;
						seenFiles.add(identity);
						const bucket = result.categories[current];
						bucket.logicalBytes += stat.size;
						bucket.allocatedBytes += allocatedBytes(stat);
						bucket.files += 1;
					}),
				);
		};
		await new Promise((done) => {
			let active = 0;
			const pump = () => {
				while (active < MEASURE_CONCURRENCY && pending.length > 0) {
					active += 1;
					visit(pending.pop())
						.catch(() => {
							result.unknown = true;
						})
						.finally(() => {
							active -= 1;
							pump();
						});
				}
				if (active === 0) done();
			};
			pump();
		});
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
	if (!isMainThread) return await measureLocal({ roots: scanRoots, mode });
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

// 측정이 막힌 파일 시스템에서 main thread가 멈추지 않게 비동기 statfs에 시간 제한을 둔다.
async function minFreeBytes(roots, timeoutMs) {
	let timer;
	const timeout = new Promise((resolveTimeout) => {
		timer = setTimeout(() => resolveTimeout([]), timeoutMs);
	});
	const sizes = Promise.all(
		roots.map((input) =>
			Promise.resolve(input)
				.then((entry) => statfs(rootDescriptor(entry).path))
				.then(
					(fs) => Number(fs.bavail) * Number(fs.bsize),
					// 잴 수 없는 root는 건너뛴다. 모두 못 재면 unknown으로 남는다.
					() => Number.POSITIVE_INFINITY,
				),
		),
	);
	try {
		return Math.min(...(await Promise.race([sizes, timeout])));
	} catch {
		return Number.POSITIVE_INFINITY;
	} finally {
		clearTimeout(timer);
	}
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
	const configuredRoots = policy.roots.map((entry) =>
		typeof entry === "string"
			? resolve(root, entry)
			: { ...entry, path: resolve(root, entry.path) },
	);
	const measurement =
		options.measurement ??
		(await measureResources({
			roots: options.roots ?? [root, ...configuredRoots],
			activeTargets: options.activeTargets,
			mode: options.mode ?? "fast",
			timeoutMs:
				options.timeoutMs ?? policy[options.mode ?? "fast"].workerTimeoutMs,
		}));
	if (measurement.unknown || measurement.timedOut) {
		// 크기 측정이 늦거나 실패해도 여유 공간은 statfs 한 번으로 확인한다.
		const free = await minFreeBytes(
			options.roots ?? [root, ...configuredRoots],
			policy[options.mode ?? "fast"].workerTimeoutMs,
		);
		return free <= policy.free.block
			? {
					status: "block",
					measurement,
					reasons: ["측정이 완전하지 않다", "여유 공간 차단 한계 이하"],
					usage: { free },
				}
			: { status: "unknown", measurement, reasons: ["측정이 완전하지 않다"] };
	}
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
	} catch (error) {
		// 다른 사용자(sudo·컨테이너 root)의 프로세스는 EPERM이지만 살아 있다.
		return error.code === "EPERM";
	}
}

// 재부팅 전에 남은 lock은 pid가 다시 쓰였어도 죽은 것으로 본다. 시계를 바꿔도 그대로인 부팅
// 표시를 쓴다: Linux·WSL은 boot_id, macOS는 kern.bootsessionuuid, 그 밖은 부팅 시각(초)이다.
let currentBoot;
function bootMark() {
	if (currentBoot !== undefined) return currentBoot;
	try {
		currentBoot = readFileSync(
			"/proc/sys/kernel/random/boot_id",
			"utf8",
		).trim();
	} catch {
		const session =
			process.platform === "darwin"
				? spawnSync("/usr/sbin/sysctl", ["-n", "kern.bootsessionuuid"], {
						encoding: "utf8",
						timeout: 5_000,
					}).stdout?.trim()
				: "";
		currentBoot = session || Math.round(Date.now() / 1000 - uptime());
	}
	return currentBoot;
}

// lock 주인이 사는 환경. Linux(컨테이너 포함)는 pid 네임스페이스도 적는다. 컨테이너를 다시
// 띄우면 끝난 네임스페이스의 번호가 다시 쓰이므로 그 네임스페이스 init(pid 1)의 시작 시각을 붙인다.
let currentMark;
function ownerMark() {
	if (currentMark) return currentMark;
	currentMark = { os: process.platform, boot: bootMark() };
	try {
		currentMark.ns = readlinkSync("/proc/self/ns/pid");
		const init = readFileSync("/proc/1/stat", "utf8");
		currentMark.ns += `@${init.slice(init.lastIndexOf(")") + 2).split(" ")[19]}`;
	} catch {
		// 네임스페이스를 읽지 못하면 있는 만큼만 적는다.
	}
	return currentMark;
}

// 다른 OS(macOS 호스트와 Linux 컨테이너)나 다른 pid 네임스페이스의 pid로는 생사를 알 수 없다.
function foreignOwner(owner) {
	const here = ownerMark();
	if (owner.os !== undefined && owner.os !== here.os) return true;
	// 재부팅(boot_id가 바뀜)했으면 그 전 네임스페이스의 프로세스도 모두 끝났다.
	return owner.ns !== undefined && owner.ns !== here.ns && sameBoot(owner.boot);
}

function sameBoot(mark) {
	if (mark === undefined) return true;
	// 부팅 시각(초)만 적은 옛 형식은 부팅 시각으로 비교한다.
	if (typeof mark === "number")
		return Math.abs(mark - Math.round(Date.now() / 1000 - uptime())) <= 60;
	// 이쪽이 부팅 ID를 읽지 못했으면 비교하지 않고 pid 확인에 맡긴다.
	const now = bootMark();
	return typeof now !== "string" || mark === now;
}

// 다른 환경에서는 pid로 생사를 알 수 없어, lock 주인은 살아 있는 동안 따로 띄운 sh가 lock을
// LEASE_MS마다 건드린다(lease). guard, 자식 그룹, 그 종류가 띄운 Next 중 하나라도 살아 있으면
// 이어 간다. 그래서 guard만 멈추거나(Ctrl+Z) 강제 종료돼도 남은 자식이 lease를 지킨다. lock이
// 다른 실행의 것으로 바뀌면(token) 멈춘다. pid가 없는 build lock은 연 프로세스(lsof -t)로 보고,
// lsof가 없거나 -t를 모르면(BusyBox) 끝난 것으로 본다.
const LEASE_MS = 2_000;
const MAX_LEASE_MS = 10_000;
const LEASE_SCRIPT = `alive() {
	grep -q "\\"token\\":\\"$4\\"" "$2" 2>/dev/null || return 1
	kill -0 "$1" 2>/dev/null && return 0
	g=$(sed -n 's/.*"childPgid":\\([0-9][0-9]*\\).*/\\1/p' "$2" 2>/dev/null)
	[ -n "$g" ] && kill -0 -"$g" 2>/dev/null && return 0
	[ -n "$3" ] && [ -e "$3" ] || return 1
	n=$(sed -n 's/.*"pid": *\\([0-9][0-9]*\\).*/\\1/p' "$3" 2>/dev/null)
	if [ -n "$n" ]; then kill -0 "$n" 2>/dev/null; return; fi
	o=$(lsof -t "$3" 2>/dev/null)
	[ -n "$o" ] && [ -z "$(printf '%s' "$o" | tr -d '0-9\\n')" ]
}
while alive "$@"; do touch -c "$2"; sleep ${LEASE_MS / 1000}; done`;
const leases = new Map();
// 회수자가 잡고 있는 .recover. 다른 환경을 기다리는 동안 이것도 lease를 잇는다.
const heldRecovers = new Set();
const SLEEP = new Int32Array(new SharedArrayBuffer(4));

function startLease(lock) {
	if (process.platform === "win32") return;
	const next = NEXT_LOCKS[lock.kind]
		? join(lock.root, NEXT_LOCKS[lock.kind])
		: "";
	try {
		const lease = spawn(
			"/bin/sh",
			[
				"-c",
				LEASE_SCRIPT,
				"prokit-lease",
				String(process.pid),
				lock.path,
				next,
				lock.token,
			],
			{ detached: true, stdio: "ignore" },
		);
		lease.on("error", () => withdrawLease(lock));
		lease.on("exit", () => withdrawLease(lock));
		lease.unref();
		leases.set(lock.token, lease);
	} catch {
		withdrawLease(lock);
	}
}

// lease가 없거나 실행 중에 끝났으면 lock에서 lease를 지운다. 다른 환경은 그 lock을 확인할 수
// 없는 것(산 것)으로 본다. 끝나는 lease를 그대로 두면 다른 환경이 살아 있는 lock을 회수한다.
function withdrawLease(lock) {
	if (activeLocks.get(`${lock.root}:${lock.kind}`) !== lock) return;
	lock.lease = undefined;
	try {
		const { lease, ...saved } = JSON.parse(readFileSync(lock.path, "utf8"));
		if (saved.token !== lock.token || lease === undefined) return;
		const temp = `${lock.path}.new-${randomUUID()}`;
		writeFileSync(temp, JSON.stringify(saved), { mode: 0o600 });
		renameSync(temp, lock.path);
	} catch {
		// 이미 풀린 lock은 고칠 것이 없다.
	}
}

function stopLease(lock) {
	const lease = leases.get(lock.token);
	leases.delete(lock.token);
	if (!lease?.pid || lease.exitCode !== null || lease.signalCode !== null)
		return;
	try {
		process.kill(-lease.pid, "SIGTERM");
	} catch {
		// 그사이 끝난 lease는 멈출 것이 없다.
	}
}

function leaseMark(path) {
	try {
		const stat = lstatSync(path);
		return `${stat.ino}:${stat.mtimeMs}`;
	} catch {
		return null;
	}
}

// 다른 환경의 lock이 lease 간격의 세 배 동안 그대로면 그쪽 guard·자식·Next가 모두 끝난 것이다.
// 시계를 비교하지 않고 이쪽에서 바뀌는지만 보므로 두 환경의 시계가 달라도 된다.
function leaseExpired(path, owner) {
	if (!Number.isInteger(owner.lease) || owner.lease <= 0) return false;
	const before = leaseMark(path);
	if (before === null) return true;
	const total = Math.min(owner.lease, MAX_LEASE_MS) * 3;
	process.stderr.write(
		`다른 환경(컨테이너·다른 OS)의 lock이 이어지는지 ${Math.ceil(total / 1000)}초 동안 본다: ${path}\n`,
	);
	for (let waited = 0; waited < total; ) {
		const step = Math.min(LEASE_MS, total - waited);
		Atomics.wait(SLEEP, 0, 0, step);
		waited += step;
		const now = new Date();
		for (const held of heldRecovers)
			try {
				utimesSync(held, now, now);
			} catch {
				// 그사이 사라진 .recover는 이을 것이 없다.
			}
	}
	const after = leaseMark(path);
	return after === null || after === before;
}

function lockOwnerAlive(owner, path) {
	// 다른 환경의 주인은 lease로만 판단한다. lease가 없으면 확인할 수 없어 산 것으로 둔다.
	if (foreignOwner(owner)) return !(path && leaseExpired(path, owner));
	if (!sameBoot(owner.boot)) return false;
	if (processIsAlive(owner.pid)) return true;
	// guard가 강제 종료돼도 detached로 띄운 자식 그룹은 남아 있을 수 있다.
	return (
		Number.isInteger(owner.childPgid) && !processGroupEnded(owner.childPgid)
	);
}

// owner를 다 쓴 임시 파일을 hard link로 올린다. 빈 lock이 보이는 순간이 없다.
function createLock(path, owner) {
	const temp = `${path}.new-${owner.token}`;
	writeFileSync(temp, JSON.stringify(owner), { flag: "wx", mode: 0o600 });
	try {
		linkSync(temp, path);
	} catch (error) {
		if (error.code === "EEXIST") throw error;
		// hard link를 못 쓰는 파일 시스템. 쓰다 실패하면 빈 lock을 남기지 않는다.
		const fd = openSync(path, "wx", 0o600);
		try {
			writeFileSync(fd, JSON.stringify(owner));
		} catch (writeError) {
			rmSync(path, { force: true });
			throw writeError;
		} finally {
			closeSync(fd);
		}
	} finally {
		rmSync(temp, { force: true });
	}
}

// 죽은 guard(창 닫기·강제 종료)가 남긴 lock은 .recover mutex를 잡은 동안 다시 확인하고 지운다.
// lock을 지우는 쪽은 회수자(mutex로 하나)와 살아 있는 주인뿐이라, 확인한 lock이 그대로 지워진다.
// 회수자가 그 안에서 죽어 남은 mutex는 한 단계 위 mutex(.recover.recover)로 같은 방식으로 회수한다.
function removeStaleLock(path, depth = 0) {
	const recover = `${path}.recover`;
	// 회수자는 다른 환경을 기다리는 동안 .recover를 건드린다(leaseExpired). 다른 환경은 같은
	// lease 기준으로 회수 도중 죽은 회수자를 알아본다.
	const owner = {
		pid: process.pid,
		token: randomUUID(),
		...ownerMark(),
		...(process.platform === "win32" ? {} : { lease: LEASE_MS }),
	};
	try {
		createLock(recover, owner);
	} catch (error) {
		if (error.code !== "EEXIST" || depth >= 2) return false;
		if (!removeStaleLock(recover, depth + 1)) return false;
		try {
			createLock(recover, owner);
		} catch {
			return false;
		}
	}
	heldRecovers.add(recover);
	try {
		if (lockOwnerAlive(JSON.parse(readFileSync(path, "utf8")), path))
			return false;
		rmSync(path);
		return true;
	} catch (error) {
		// 주인이 그사이 lock을 풀었다. 다시 만드는 쪽도 link라 배타적이다.
		return error.code === "ENOENT";
	} finally {
		heldRecovers.delete(recover);
		rmSync(recover, { force: true });
	}
}

// 회수자가 남은 자식 그룹을 알아보게 lock에 적는다.
function recordChildGroup(lock, pid) {
	if (lock.nested || lock.shared || !pid || process.platform === "win32")
		return;
	const { path, references, ...owner } = lock;
	const temp = `${path}.new-${randomUUID()}`;
	writeFileSync(temp, JSON.stringify({ ...owner, childPgid: pid }), {
		mode: 0o600,
	});
	renameSync(temp, path);
}

// 끝난 주인의 lock은 이 자리에서 회수한다. 다른 환경의 남은 lock을 실행마다 기다리지 않는다.
function liveLock(root, kind) {
	const path = lockPath(root, kind);
	try {
		if (JSON.parse(readFileSync(path, "utf8")).pid === process.pid)
			return false;
	} catch {
		return false;
	}
	return !removeStaleLock(path) && existsSync(path);
}

function foreignHint(path) {
	try {
		const owner = JSON.parse(readFileSync(path, "utf8"));
		if (foreignOwner(owner))
			return Number.isInteger(owner.lease)
				? ". 다른 환경(컨테이너·다른 OS)의 guard가 실행 중이다. 그쪽 실행이 끝난 뒤 다시 실행한다"
				: `. 다른 환경(컨테이너·다른 OS)의 guard가 만든 lock이라 생사를 확인할 수 없다. 그쪽 실행이 끝났으면 ${path}을 지운다`;
	} catch {
		// 그사이 풀린 lock은 안내할 것이 없다.
	}
	return "";
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
	const owner = {
		root: safe.path,
		rootDev: safe.stat.dev,
		rootIno: safe.stat.ino,
		kind,
		runId,
		pid: process.pid,
		token: randomUUID(),
		...ownerMark(),
		...(process.platform === "win32" ? {} : { lease: LEASE_MS }),
	};
	try {
		createLock(path, owner);
	} catch (error) {
		if (error.code !== "EEXIST")
			throw new Error(
				`${kind} guard lock을 만들 수 없다: ${error.code ?? error.message}`,
			);
		let created = false;
		// turbo는 작업마다 process group을 따로 만들어, guard와 turbo가 함께 강제 종료되면
		// Next가 자식 그룹 밖에 남는다. Next를 띄우는 종류는 그 Next가 끝난 뒤에만 회수한다.
		const nextLeft =
			NEXT_LOCKS[kind] && nextRunning(safe.path, [NEXT_LOCKS[kind]]);
		if (!nextLeft && removeStaleLock(path)) {
			try {
				createLock(path, owner);
				created = true;
			} catch (retryError) {
				// EEXIST는 그사이 다른 guard가 lock을 잡은 것이다.
				if (retryError.code !== "EEXIST")
					throw new Error(
						`${kind} guard lock을 만들 수 없다: ${retryError.code ?? retryError.message}`,
					);
			}
		}
		if (!created)
			throw new Error(
				`${kind} guard가 이미 실행 중이거나 상태가 불명확하다${
					nextLeft
						? `. Next가 아직 실행 중이다(${NEXT_LOCKS[kind]}). 그 Next를 끈 뒤 다시 실행한다`
						: existsSync(`${path}.recover`)
							? ". 실행 중인 guard가 없으면 pnpm dev-cycle resource clean --apply로 남은 회수 기록을 지운다"
							: foreignHint(path)
				}`,
			);
	}
	const lock = { ...owner, path, references: 1 };
	activeLocks.set(key, lock);
	startLease(lock);
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
	} catch {
		// 이미 없어진 lock은 풀 것이 없다.
	} finally {
		stopLease(current);
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

// dev:web은 lock 이름에 ':'를 쓸 수 없어 dev-web으로 실행한다(install.mjs).
const STANDARD_COMPILER_CACHES = {
	build: ["apps/web/.next/cache/turbopack"],
	dev: ["apps/web/.next/dev/cache/turbopack"],
	"dev-web": ["apps/web/.next/dev/cache/turbopack"],
};

// 종류마다 그 실행이 띄우는 Next가 실행 중에 두는 lock(Next 16).
const NEXT_LOCKS = {
	build: "apps/web/.next/lock",
	dev: "apps/web/.next/dev/lock",
	"dev-web": "apps/web/.next/dev/lock",
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
		context.marker = {
			origin: "resource-guard-compiler-cache",
			root: safe.path,
			rootDev: safe.stat.dev,
			rootIno: safe.stat.ino,
			runId,
			token: context.token,
			path: relativePath,
			dev: stat.dev,
			ino: stat.ino,
			leaseEnded: false,
			childrenEnded: false,
			// 강제 종료로 끝을 적지 못해도 clean이 guard와 자식 그룹의 생사로 판단한다.
			pid: process.pid,
			...ownerMark(),
		};
		mkdirSync(dirname(context.markerPath), { recursive: true });
		writeMarker(context.markerPath, context.marker);
		ownedCleanContexts.set(context.token, context);
		contexts.push(context);
	}
	return contexts;
}

// 쓰다 끊겨 깨진 기록이 남지 않게 임시 파일을 다 쓴 뒤 바꾼다.
function writeMarker(path, marker) {
	const temp = `${path}.new-${randomUUID()}`;
	writeFileSync(temp, JSON.stringify(marker));
	renameSync(temp, path);
}

function recordCacheGroup(contexts, pid) {
	if (!pid || process.platform === "win32") return;
	for (const context of contexts) {
		context.marker = { ...context.marker, childPgid: pid };
		writeMarker(context.markerPath, context.marker);
	}
}

function finishCompilerCaches(contexts, groupEnded) {
	for (const context of contexts) {
		context.childrenEnded = groupEnded;
		context.leaseEnded = true;
		// 실행이 끝난 뒤의 CLI clean은 이 기록으로만 실행·자식 종료를 확인한다.
		if (existsSync(context.markerPath))
			writeMarker(context.markerPath, {
				...context.marker,
				leaseEnded: true,
				childrenEnded: groupEnded,
			});
	}
}

async function runChild(root, options, events, policy) {
	return await new Promise((resolveRun, rejectRun) => {
		// 자식 그룹을 lock에 적은 뒤에만 명령을 시작한다. guard가 그 전에 죽으면 fd 3이
		// 닫혀 명령은 시작하지 않고 끝나므로 회수자가 모르는 자식이 남지 않는다.
		const gated = process.platform !== "win32";
		const stdio = options.captureOutput
			? ["ignore", "pipe", "pipe"]
			: (options.stdio ?? "inherit");
		const child = gated
			? spawn(
					"/bin/sh",
					[
						"-c",
						'read -r _ <&3 || exit 1; exec 3<&-; exec "$@"',
						"prokit-guard",
						options.command,
						...options.args,
					],
					{
						cwd: options.cwd ?? root,
						env: { ...process.env, ...options.env },
						stdio: [
							...(typeof stdio === "string" ? [stdio, stdio, stdio] : stdio),
							"pipe",
						],
						detached: true,
					},
				)
			: spawn(options.command, options.args, {
					cwd: options.cwd ?? root,
					env: { ...process.env, ...options.env },
					stdio,
				});
		child.stdio[3]?.on("error", () => {});
		try {
			options.onChildSpawn?.(child);
		} catch (error) {
			// 그룹을 적지 못한 명령은 시작하지 않는다(fd 3이 닫혀 sh가 끝난다).
			child.stdio[3]?.destroy();
			throw error;
		}
		child.stdio[3]?.end("\n");
		let stdout = Buffer.alloc(0);
		let stderr = Buffer.alloc(0);
		let interrupted = false;
		let resourceExceeded = false;
		let checking = false;
		let killTimer = null;
		const limit = options.captureLimit ?? CAPTURE_LIMIT;
		// 신호나 시간 초과로 멈춘 명령은 예산 정리 뒤에도 다시 실행하지 않는다.
		let stopped = false;
		const stopByUser = (event) => {
			if (interrupted) events.push(event);
			stopped = true;
			stopOwnedGroup(event);
		};
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
			// 실행 중 측정 지연·오류(unknown)로는 끄지 않는다. 확인된 예산 초과만 끈다.
			try {
				const status = await checkResources(root, scanOptions);
				if (status.status === "warn" || status.status === "unknown")
					events.push(`${event}-${status.status}`);
				if (status.status === "block") {
					resourceExceeded = true;
					stopOwnedGroup("resource-budget-exceeded");
				}
			} catch {
				events.push(`${event}-unknown`);
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
					stopByUser("guard-timeout");
				}, options.commandTimeoutMs)
			: null;
		const signalHandlers = new Map(
			["SIGINT", "SIGTERM", "SIGHUP"].map((signal) => [
				signal,
				() => stopByUser(`guard-${signal.toLowerCase()}`),
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
						stopped,
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

// 실행 뒤 전체 측정이 제한 시간 안에 끝나지 않으면 실행 전 전체 측정에 이 실행이 만든
// compiler cache를 다시 재어 더하고, 여유 공간은 statfs로 다시 읽어 같은 기준으로 판정한다.
// 이 실행이 다른 곳(이미 있던 캐시 포함)에 쓴 양은 빠지지만 여유 공간에는 드러나고, 다음
// 실행 전 검사가 전체를 다시 잰다. 이것마저 못 재면 null(unknown 그대로)이다.
async function estimatedAfter(root, before, targets, options, policy) {
	if (!before?.measurement || before.measurement.unknown) return null;
	// 명령이 지운 캐시(예: rm -rf .next)는 0이다.
	const activeTargets = targets.filter((target) => existsSync(target.path));
	let owned = null;
	if (activeTargets.length > 0) {
		owned = await measureResources({
			roots: [root],
			activeTargets,
			mode: "fast",
			timeoutMs: policy.fast.workerTimeoutMs,
		});
		if (owned.unknown) return null;
	}
	const roots = before.measurement.filesystems.map((fs) => fs.root);
	const free = await minFreeBytes(roots, policy.fast.workerTimeoutMs);
	if (roots.length === 0 || !Number.isFinite(free)) return null;
	const measurement = structuredClone(before.measurement);
	const cache = measurement.categories.buildCache;
	const added = owned?.categories.buildCache ?? category();
	cache.logicalBytes += added.logicalBytes;
	cache.allocatedBytes += added.allocatedBytes;
	cache.files += added.files;
	measurement.filesystems = [{ root: roots[0], freeBytes: free }];
	measurement.estimated = true;
	return await checkedResources(root, { ...options, measurement });
}

export async function runGuarded(root, options = {}) {
	const { command, args = [], kind = "run" } = options;
	if (!command) throw new Error("실행할 command가 없다");
	if (kind === "clean") throw new Error("clean은 guard 종류로 쓸 수 없다");
	const runId = randomUUID();
	let lock;
	const events = [];
	try {
		lock = acquireLock(root, kind, runId, options.nestedParent);
		// 정리 중에는 캐시를 쓰는 실행을 시작하지 않는다. clean도 살아 있는 guard가 있으면 멈춘다.
		if (liveLock(lock.root, "clean"))
			return {
				exitCode: 75,
				stdout: "",
				stderr: "",
				events: ["resource-clean-running"],
				before: null,
				after: null,
				runId,
			};
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
			recordChildGroup(lock, child.pid);
			recordCacheGroup(caches, child.pid);
			// 호출자는 이 실행에서 실제 child가 시작됐는지만 관측한다.
			options.onChildSpawn?.(child);
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
		const cleanOwned = async (context) => {
			try {
				await cleanResources(root, {
					apply: true,
					ownershipContext: context,
					guardLock: lock,
				});
			} catch {
				events.push("resource-clean-skipped");
			}
		};
		let caches = prepareCompilerCaches(root, kind, runId, options, events);
		const before = await checkedResources(root, inventoryOptions);
		const afterRun = async (activeTargets) => {
			const full = await checkedResources(root, inventoryOptions);
			if (full.status !== "unknown") return full;
			const estimate = await estimatedAfter(
				root,
				before,
				activeTargets,
				inventoryOptions,
				policy,
			);
			if (!estimate || estimate.status === "unknown") return full;
			events.push("after-inventory-estimated");
			return estimate;
		};
		if (before.status === "block" || before.status === "unknown") {
			finishCompilerCaches(caches, true);
			for (const context of caches) await cleanOwned(context);
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
		let after = await afterRun(runningOptions.activeTargets);
		if (after.status === "unknown") {
			result.exitCode = 75;
			return { ...result, events, before, after, runId };
		}
		if (result.resourceExceeded || after.status === "block") {
			if (!result.groupEnded) result.exitCode = 75;
			for (const context of caches) await cleanOwned(context);
			const afterClean = await checkedResources(root, inventoryOptions);
			if (
				!result.stopped &&
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
				after = await afterRun(runningOptions.activeTargets);
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

// 끝난 guard 실행이 남긴 compiler cache는 디스크의 소유 기록으로 찾는다. 표준 경로이고
// 그때 만든 디렉터리(dev/ino)이며 실행과 자식이 끝났다고 기록됐거나, 강제 종료로 기록이
// 끊겼어도 guard와 자식 그룹이 모두 끝난 것만 후보다.
function recordedCompilerCaches(safe) {
	const dir = join(safe.path, ".prokit", "resource-guard");
	const standard = new Set(Object.values(STANDARD_COMPILER_CACHES).flat());
	const markers = [];
	const candidates = new Set();
	// 주인이 살아 있거나 확인할 수 없는(다른 환경) 기록은 지우지 않고 다음 clean이 다시 본다.
	const keep = [];
	if (!existsSync(dir))
		return { markers, candidates: [], keep, trash: [], leftovers: [] };
	const names = readdirSync(dir);
	for (const name of names) {
		if (!/^compiler-.+\.json$/.test(name)) continue;
		const markerPath = join(dir, name);
		markers.push(markerPath);
		try {
			const owner = JSON.parse(readFileSync(markerPath, "utf8"));
			if (
				owner.origin !== "resource-guard-compiler-cache" ||
				!standard.has(owner.path)
			)
				continue;
			if (
				owner.root !== safe.path ||
				owner.rootDev !== safe.stat.dev ||
				owner.rootIno !== safe.stat.ino
			) {
				// 다른 환경(마운트 경로·장치가 다르다)의 기록은 여기서 같은 디렉터리인지 확인할 수
				// 없어 그 환경의 clean이 정리하게 남긴다.
				if (foreignOwner(owner)) keep.push(markerPath);
				continue;
			}
			const ended = owner.leaseEnded === true && owner.childrenEnded === true;
			if (
				!ended &&
				Number.isInteger(owner.pid) &&
				markerOwnerAlive(owner, dir)
			) {
				keep.push(markerPath);
				continue;
			}
			if (!ended && !Number.isInteger(owner.pid)) continue;
			const path = safeChildPath(safe.path, owner.path);
			const stat = path && existsSync(path) ? lstatSync(path) : null;
			if (
				stat?.isDirectory() &&
				!stat.isSymbolicLink() &&
				stat.dev === owner.dev &&
				stat.ino === owner.ino
			)
				candidates.add(path);
		} catch {
			// 읽을 수 없는 기록은 소유 증명이 아니다.
		}
	}
	const trash = names
		.filter((name) => name.startsWith("trash-"))
		.map((name) => join(dir, name));
	const leftovers = names.filter(
		(name) =>
			name.includes(".new-") ||
			(name.includes(".lock.") && name.endsWith(".recover")),
	);
	return { markers, candidates: [...candidates], keep, trash, leftovers };
}

// 다른 환경의 기록은 lease를 잇는 lock으로만 판단한다. 같은 실행의 lock이 남아 있는 동안은
// 산 것으로 두고, clean은 lease가 끊긴 lock을 먼저 회수하므로 그 뒤에는 정리 후보가 된다.
function markerOwnerAlive(owner, dir) {
	if (!foreignOwner(owner)) return lockOwnerAlive(owner);
	return readdirSync(dir).some((name) => {
		if (!name.endsWith(".lock")) return false;
		try {
			return (
				JSON.parse(readFileSync(join(dir, name), "utf8")).runId === owner.runId
			);
		} catch {
			return true;
		}
	});
}

// guard 밖에서 실행 중인 Next(dev·build)도 이 캐시를 쓴다. Next 16은 실행 중에
// .next/lock(build)과 .next/dev/lock(dev, pid 포함)을 두고 끝나면 지운다.
// 비정상 종료한 Next는 lock 파일을 남긴다. dev lock은 pid로, pid가 없는 build lock은
// 파일을 연 프로세스(lsof)로 확인한다. lsof를 쓸 수 없으면 실행 중으로 본다.
function nextRunning(root, files = Object.values(NEXT_LOCKS)) {
	for (const file of new Set(files)) {
		const path = join(root, file);
		if (!existsSync(path)) continue;
		let pid;
		try {
			pid = JSON.parse(readFileSync(path, "utf8") || "{}").pid;
		} catch {
			return true;
		}
		if (Number.isInteger(pid)) {
			if (processIsAlive(pid)) return true;
			continue;
		}
		const open = spawnSync("lsof", ["-t", path], {
			encoding: "utf8",
			timeout: 10_000,
		});
		if (open.error || open.status > 1 || open.stdout.trim()) return true;
	}
	return false;
}

async function cleanRecordedCaches(root, apply) {
	const safe = safeRoot(root);
	const preview = recordedCompilerCaches(safe);
	if (
		!apply ||
		preview.markers.length + preview.trash.length + preview.leftovers.length ===
			0
	)
		return { applied: false, candidates: preview.candidates };
	const refuse = (reason) => ({
		applied: false,
		candidates: preview.candidates,
		reason,
	});
	const dir = join(safe.path, ".prokit", "resource-guard");
	const moveToTrash = () => {
		// 회수 도중 죽은 guard가 남긴 .recover는 guard와 같은 회수 절차로 지우고, 오래된 lock
		// 임시 파일은 아무도 바꾸지 않으니 바로 지운다.
		for (const name of recordedCompilerCaches(safe).leftovers) {
			const file = join(dir, name);
			try {
				if (name.endsWith(".recover")) removeStaleLock(file);
				else if (Date.now() - lstatSync(file).mtimeMs > 60_000) rmSync(file);
			} catch {
				// 읽을 수 없거나 그사이 사라진 파일은 그대로 둔다.
			}
		}
		for (const name of readdirSync(dir)) {
			if (!name.endsWith(".lock") || name === "clean.lock") continue;
			const file = join(dir, name);
			let owner;
			try {
				owner = JSON.parse(readFileSync(file, "utf8"));
			} catch {
				return refuse("guard 소유권을 읽을 수 없다");
			}
			if (!foreignOwner(owner)) {
				if (lockOwnerAlive(owner)) return refuse("실행 중인 guard가 있다");
				continue;
			}
			// lease가 끊긴 다른 환경의 lock은 회수해 두어 그 실행의 기록을 정리 후보로 만든다.
			if (removeStaleLock(file) || !existsSync(file)) continue;
			return refuse(
				existsSync(`${file}.recover`)
					? `${name}을 회수하는 중이거나 회수 기록(${name}.recover)이 남아 있다. 잠시 뒤 다시 실행한다`
					: Number.isInteger(owner.lease)
						? `다른 환경(컨테이너·다른 OS)의 guard가 실행 중이다(${name})`
						: `다른 환경(컨테이너·다른 OS)의 guard가 만든 ${name}이 있다. 그쪽 실행이 끝났으면 지운 뒤 다시 실행한다`,
			);
		}
		if (nextRunning(safe.path))
			return refuse("실행 중인 Next dev·build가 있다. 끈 뒤 다시 실행한다");
		const found = recordedCompilerCaches(safe);
		for (const path of found.candidates) {
			try {
				renameSync(path, join(dir, `trash-${randomUUID()}`));
			} catch (error) {
				if (error.code !== "EXDEV") throw error;
				rmSync(path, { recursive: true, force: true });
			}
		}
		// 살아 있는 guard가 없으니 남은 기록(실행이 끊긴 것, 옛 형식)은 더 쓸 데가 없다.
		for (const marker of found.markers)
			if (!found.keep.includes(marker)) rmSync(marker, { force: true });
		return { applied: true, candidates: found.candidates };
	};
	// lock 안에서는 옮기기만 한다. 지우다 끊겨도 lock이 남지 않고 다음 clean이 마저 지운다.
	const lock = acquireLock(safe.path, "clean", randomUUID());
	let result;
	try {
		result = moveToTrash();
	} finally {
		releaseLock(lock);
	}
	// trash는 clean만 만들고 아무도 쓰지 않으니 거부했을 때도 지운다.
	for (const trash of recordedCompilerCaches(safe).trash)
		rmSync(trash, { recursive: true, force: true });
	return result;
}

export async function cleanResources(root, options = {}) {
	if (!options.ownershipContext)
		return await cleanRecordedCaches(root, options.apply);
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
	const locks = join(owned.safe.path, ".prokit", "resource-guard");
	const trash = join(locks, `trash-${randomUUID()}`);
	const moveToTrash = () => {
		for (const name of readdirSync(locks)) {
			if (!name.endsWith(".lock") || name === "clean.lock") continue;
			let owner;
			try {
				owner = JSON.parse(readFileSync(join(locks, name), "utf8"));
			} catch {
				return {
					applied: false,
					candidates,
					reason: "guard 소유권을 읽을 수 없다",
				};
			}
			if (name !== `${options.guardLock?.kind}.lock`) {
				// CLI clean과 같은 기준: 죽은 guard가 남긴 다른 종류의 lock은 막지 않는다.
				if (lockOwnerAlive(owner, join(locks, name)))
					return {
						applied: false,
						candidates,
						reason: "실행 중인 guard가 있다",
					};
			} else if (
				owner.runId !== options.guardLock.runId ||
				owner.token !== options.guardLock.token ||
				owner.pid !== process.pid
			)
				return { applied: false, candidates, reason: "guard 소유권이 다르다" };
		}
		try {
			renameSync(owned.path, trash);
		} catch (error) {
			if (error.code !== "EXDEV") throw error;
			rmSync(owned.path, { recursive: true, force: true });
		}
		rmSync(options.ownershipContext.markerPath, { force: false });
		return { applied: true, candidates };
	};
	const lock = acquireLock(owned.safe.path, "clean", randomUUID());
	let result;
	try {
		result = moveToTrash();
	} finally {
		releaseLock(lock);
	}
	rmSync(trash, { recursive: true, force: true });
	return result;
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

const DECIMAL_UNITS = { "": 1, k: 1e3, K: 1e3, M: 1e6, G: 1e9, T: 1e12 };

// 컨테이너 이미지·볼륨은 엔진이 관리하므로 지우지 않고 엔진이 보고한 크기만 보여 준다.
// podman은 바이트(RawSize)를, docker는 십진 단위 글("1.2GB")을 준다.
function containerStorage() {
	const bytes = (raw, text) => {
		if (Number.isFinite(raw)) return raw;
		const [, value, unit] = /^([\d.]+)\s*([kKMGT]?)B/.exec(text ?? "") ?? [];
		return value === undefined
			? null
			: Math.round(Number(value) * DECIMAL_UNITS[unit]);
	};
	for (const engine of ["podman", "docker"]) {
		const df = spawnSync(engine, ["system", "df", "--format", "json"], {
			encoding: "utf8",
			timeout: 10_000,
		});
		// 응답하지 않는 엔진은 기다리지 않는다(docker가 podman 별칭이면 또 멈춘다).
		if (df.error?.code === "ETIMEDOUT") return null;
		if (df.error || df.status !== 0) continue;
		try {
			const text = df.stdout.trim();
			const rows = text.startsWith("[")
				? JSON.parse(text)
				: text.split("\n").map((line) => JSON.parse(line));
			return {
				engine,
				types: rows.map((row) => ({
					type: row.Type,
					bytes: bytes(row.RawSize, row.Size),
					reclaimableBytes: bytes(row.RawReclaimable, row.Reclaimable),
				})),
			};
		} catch {
			// 형식을 모르는 엔진 출력은 다음 엔진으로 넘어간다.
		}
	}
	return null;
}

export async function main(argv = process.argv.slice(2), root = process.cwd()) {
	const [command = "check", ...args] = argv;
	if (command === "check") {
		const result = await checkResources(root);
		console.log(JSON.stringify({ ...result, containers: containerStorage() }));
		return result.status === "ok" || result.status === "warn"
			? 0
			: result.status === "block"
				? 1
				: 2;
	}
	if (command === "clean") {
		// 출력은 늘 JSON이라 dev-cycle 공통 --json은 그대로 받는다.
		if (args.some((arg) => !["--apply", "--json"].includes(arg)))
			throw new Error("clean 옵션은 --apply(와 --json)만 지원한다");
		const result = await cleanResources(root, {
			apply: args.includes("--apply"),
		});
		console.log(JSON.stringify(result));
		return result.reason ? 1 : 0;
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
	measureLocal(workerData).then((result) => parentPort.postMessage(result));
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
