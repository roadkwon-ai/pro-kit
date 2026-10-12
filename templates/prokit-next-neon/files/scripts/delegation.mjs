#!/usr/bin/env node
// 위임 입력은 metadata가 아니라
// resolver가 돌려 준 실제 내용으로 검증한다.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	existsSync,
	lstatSync,
	readFileSync,
	readlinkSync,
	realpathSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const hash = (value) =>
	createHash("sha256")
		.update(
			typeof value === "string" || Buffer.isBuffer(value)
				? value
				: stable(value),
		)
		.digest("hex");

const validationRegistry = new WeakMap();

function stable(value) {
	if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
	if (value && typeof value === "object") {
		const pairs = Object.keys(value)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${stable(value[key])}`);
		return `{${pairs.join(",")}}`;
	}
	return JSON.stringify(value);
}

function safePath(path) {
	return (
		typeof path === "string" &&
		path.length > 0 &&
		!path.includes("\0") &&
		!path.startsWith("/") &&
		!path.split(/[\\/]/).includes("..")
	);
}

function safeLocation(location) {
	if (typeof location !== "string" || !location || location.includes("\0")) {
		return false;
	}
	try {
		const url = new URL(location);
		return !url.pathname.split("/").includes("..");
	} catch {
		return safePath(location);
	}
}

function isInside(root, path) {
	const rel = relative(root, path);
	return (
		rel && !rel.startsWith(`..${sep}`) && rel !== ".." && !rel.startsWith("../")
	);
}

function localSkillPath(ref) {
	if (typeof ref === "object") return ref.path ?? ref.canonicalLocation ?? null;
	return typeof ref === "string" && (ref.includes("/") || ref.endsWith(".md"))
		? ref
		: null;
}

function skillName(ref) {
	if (typeof ref === "object" && ref.name) return ref.name;
	if (typeof ref !== "string" || ref.includes("/")) return null;
	return ref.includes(":") ? ref.slice(ref.lastIndexOf(":") + 1) : ref;
}

function readSkillsLock(root) {
	const path = join(root, "skills-lock.json");
	if (!existsSync(path)) return {};
	try {
		return JSON.parse(readFileSync(path, "utf8")).skills ?? {};
	} catch {
		return {};
	}
}

function allowedRealPath(root, path, context) {
	const roots = [root, ...(context.accessibleRoots ?? [])].flatMap((item) => {
		try {
			return [realpathSync(item)];
		} catch {
			return [];
		}
	});
	return roots.some(
		(candidate) => path === candidate || isInside(candidate, path),
	);
}

export function observeProvider(skillRef, context = {}) {
	const root = context.root ? resolve(context.root) : null;
	if (!root || !existsSync(root)) {
		return { ok: false, reason: "관측 root가 없다" };
	}
	const direct = localSkillPath(skillRef);
	const name =
		skillName(skillRef) ?? (direct ? basename(dirname(direct)) : null);
	const requested = direct
		? resolve(root, direct)
		: name
			? resolve(root, ".agents", "skills", name, "SKILL.md")
			: null;
	if (!requested || !isInside(root, requested)) {
		return { ok: false, reason: "skill path escape" };
	}
	if (!existsSync(requested)) {
		return { ok: false, reason: "skill 파일이 없다" };
	}
	let actual;
	try {
		actual = realpathSync(requested);
	} catch {
		return { ok: false, reason: "skill realpath를 읽을 수 없다" };
	}
	if (!allowedRealPath(root, actual, context)) {
		return { ok: false, reason: "skill realpath가 허용 root 밖이다" };
	}
	let content;
	try {
		if (!lstatSync(actual).isFile()) throw new Error("not file");
		content = readFileSync(actual, "utf8");
	} catch {
		return { ok: false, reason: "skill content를 읽을 수 없다" };
	}
	const lock = readSkillsLock(root)[name] ?? {};
	const contentHash = hash(content);
	const origin =
		(typeof skillRef === "object" && skillRef.origin) ||
		lock.actualRepoSource ||
		lock.source ||
		`local:${relative(root, requested)}`;
	return {
		ok: true,
		content,
		observation: {
			name,
			origin,
			canonicalLocation: `file://${actual}`,
			contentHash,
			requestedScope: context.requestedScope ?? context.scope ?? null,
			path: requested,
			realpath: actual,
		},
	};
}

function inspectedProvider(observation, content, context) {
	if (typeof context.inspectSource !== "function") return null;
	const inspected = context.inspectSource({ ...observation, content }, context);
	if (!inspected || inspected.contentHash !== observation.contentHash) {
		return null;
	}
	if (
		inspected.origin !== observation.origin ||
		inspected.canonicalLocation !== observation.canonicalLocation ||
		inspected.name !== observation.name
	)
		return null;
	for (const field of [
		"dependencies",
		"capabilities",
		"tools",
		"sideEffects",
	]) {
		if (!Array.isArray(inspected[field])) return null;
	}
	const runtime = context.actualRuntime;
	if (
		!runtime ||
		inspected.host !== runtime.host ||
		inspected.mode !== runtime.mode
	) {
		return null;
	}
	if (!scopeMatches(inspected, observation.requestedScope)) return null;
	return { ...inspected, content };
}

function scopeMatches(provider, wanted) {
	const scopes = Array.isArray(provider.scope)
		? provider.scope
		: [provider.scope];
	return !wanted || scopes.includes("any") || scopes.includes(wanted);
}

function sameIdentity(provider, ref) {
	if (ref.name != null && provider.name !== ref.name) return false;
	for (const key of [
		"origin",
		"canonicalLocation",
		"contentHash",
		"scope",
		"type",
		"mode",
	]) {
		if (ref[key] != null && stable(provider[key]) !== stable(ref[key])) {
			return false;
		}
	}
	return true;
}

function candidates(context, source) {
	const names = {
		user: ["userProviders", "userRefs"],
		project: ["projectProviders", "projectSkills"],
		accessible: ["providers", "accessibleProviders"],
		default: ["defaultProviders", "defaults"],
	};
	return names[source].flatMap((name) => context[name] ?? []);
}

function findProvider(ref, context) {
	const wanted =
		typeof ref === "string"
			? /:\/\//.test(ref)
				? { canonicalLocation: ref }
				: { name: ref }
			: ref;
	if (!wanted?.name && !wanted?.canonicalLocation) return null;
	if (!wanted.name && wanted.canonicalLocation && context.resolver) {
		const provider = context.resolver(wanted, context);
		if (provider?.canonicalLocation === wanted.canonicalLocation) {
			return { provider, source: "direct" };
		}
	}
	for (const source of ["user", "project", "accessible", "default"]) {
		const matches = candidates(context, source).filter(
			(candidate) =>
				sameIdentity(candidate, wanted) &&
				scopeMatches(candidate, wanted.scope ?? context.scope),
		);
		if (matches.length > 1) return { ambiguous: true, source };
		if (matches.length === 1) return { provider: matches[0], source };
	}
	return null;
}

function validateProvider(provider, context, stack = []) {
	for (const field of [
		"name",
		"origin",
		"canonicalLocation",
		"contentHash",
		"scope",
		"type",
		"mode",
		"host",
	]) {
		if (provider[field] == null || provider[field] === "") {
			return { ok: false, reason: `provider ${field}가 없다` };
		}
	}
	if (!safeLocation(provider.canonicalLocation)) {
		return { ok: false, reason: "canonicalLocation filename escape" };
	}
	const resolver = context.resolver;
	if (/^(plugin|resource):/.test(provider.canonicalLocation) && !resolver) {
		return { ok: false, reason: "plugin/resource는 resolver가 필요하다" };
	}
	const actual = resolver
		? resolver(provider, context)
		: { content: provider.content };
	if (!actual || typeof actual.content !== "string") {
		return {
			ok: false,
			reason: "resolver가 읽기 전용 content를 주지 않았다",
		};
	}
	for (const field of [
		"name",
		"origin",
		"canonicalLocation",
		"scope",
		"type",
		"mode",
		"host",
	]) {
		if (
			actual[field] == null ||
			stable(actual[field]) !== stable(provider[field])
		) {
			return { ok: false, reason: `resolver ${field}가 metadata와 다르다` };
		}
	}
	if (hash(actual.content) !== provider.contentHash) {
		return { ok: false, reason: "실제 contentHash가 선언과 다르다" };
	}
	const allowedCapabilities = new Set(context.allowedCapabilities ?? []);
	if (context.allowedTypes && !context.allowedTypes.includes(provider.type)) {
		return { ok: false, reason: `지원하지 않는 type: ${provider.type}` };
	}
	for (const capability of provider.capabilities ?? []) {
		if (!allowedCapabilities.has(capability)) {
			return {
				ok: false,
				reason: `허용하지 않은 capability: ${capability}`,
			};
		}
	}
	for (const field of [
		"capabilities",
		"tools",
		"sideEffects",
		"dependencies",
	]) {
		if (stable(actual[field] ?? []) !== stable(provider[field] ?? [])) {
			return {
				ok: false,
				reason: `resolver ${field}가 metadata와 다르다`,
			};
		}
	}
	const tools = new Set(context.availableTools ?? []);
	for (const tool of provider.tools ?? []) {
		if (!tools.has(tool)) {
			return { ok: false, reason: `지원하지 않는 tool: ${tool}` };
		}
	}
	const effects = new Set(context.allowedSideEffects ?? []);
	for (const effect of provider.sideEffects ?? []) {
		if (!effects.has(effect)) {
			return { ok: false, reason: `허용 밖 side effect: ${effect}` };
		}
	}
	if (
		!new Set(context.allowedModes ?? []).has(provider.mode) ||
		!new Set(context.allowedHosts ?? []).has(provider.host)
	) {
		return { ok: false, reason: "허용 밖 provider mode 또는 host" };
	}
	const id = `${provider.origin}|${provider.canonicalLocation}|${provider.name}`;
	if (stack.includes(id)) {
		return {
			ok: false,
			reason: `dependency 순환: ${[...stack, id].join(" → ")}`,
		};
	}
	const dependencies = [];
	for (const dependency of provider.dependencies ?? []) {
		const found = findProvider(dependency, context);
		if (!found || found.ambiguous) {
			const name =
				typeof dependency === "string" ? dependency : dependency.name;
			return { ok: false, reason: `dependency가 없다: ${name}` };
		}
		const checked = validateProvider(found.provider, context, [...stack, id]);
		if (!checked.ok) return checked;
		dependencies.push(checked.actualHash);
	}
	return {
		ok: true,
		provider: { ...provider, content: undefined },
		actualHash: hash({
			name: provider.name,
			origin: provider.origin,
			canonicalLocation: provider.canonicalLocation,
			contentHash: provider.contentHash,
			scope: provider.scope,
			type: provider.type,
			mode: provider.mode,
			host: provider.host,
			capabilities: provider.capabilities ?? [],
			tools: provider.tools ?? [],
			sideEffects: provider.sideEffects ?? [],
			dependencies,
		}),
	};
}

export function resolveProvider(skillRef, context = {}) {
	let found = findProvider(skillRef, context);
	if (!found && context.root) {
		const observed = observeProvider(skillRef, context);
		if (!observed.ok) return observed;
		const provider = inspectedProvider(
			observed.observation,
			observed.content,
			context,
		);
		if (!provider) {
			return {
				ok: false,
				observed: true,
				executable: false,
				inspectionOnly: true,
				reason: "requires-source-inspection",
				observation: observed.observation,
			};
		}
		found = { provider, source: "observed" };
	}
	if (!found) return { ok: false, reason: "scope에 맞는 provider가 없다" };
	if (found.ambiguous) {
		return { ok: false, reason: `${found.source} provider가 모호하다` };
	}
	const checked = validateProvider(found.provider, context);
	return checked.ok ? { ...checked, source: found.source } : checked;
}

function git(root, args) {
	try {
		return execFileSync("git", args, {
			cwd: root,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		});
	} catch {
		return null;
	}
}

function pathsFromGit(root) {
	const split = (value) => (value ?? "").split("\0").filter(Boolean);
	const trackedOutput = git(root, ["ls-files", "-z"]);
	const untrackedOutput = git(root, [
		"ls-files",
		"-z",
		"--others",
		"--exclude-standard",
	]);
	if (trackedOutput == null || untrackedOutput == null) return null;
	const tracked = split(trackedOutput);
	const untracked = split(untrackedOutput);
	return new Map([
		...tracked.map((path) => [path, true]),
		...untracked.map((path) => [path, false]),
	]);
}

function statusByPath(data) {
	const result = new Map();
	const parts = data.split("\0");
	for (let index = 0; index < parts.length; index += 1) {
		const part = parts[index];
		if (!part) continue;
		const code = part.slice(0, 2);
		const path = part.slice(3);
		result.set(path, code);
		if (/[RC]/.test(code) && parts[index + 1]) result.set(parts[++index], code);
	}
	return result;
}

function snapshotEntry(root, path, tracked, statuses) {
	const fullPath = resolve(root, path);
	if (!fullPath.startsWith(`${resolve(root)}${sep}`)) {
		throw new Error("snapshot path escape");
	}
	try {
		const stat = lstatSync(fullPath);
		const mode = (stat.mode & 0o7777).toString(8);
		if (stat.isSymbolicLink()) {
			const link = readlinkSync(fullPath);
			return {
				path,
				tracked,
				status: statuses.get(path) ?? "",
				kind: "link",
				mode,
				link,
				hash: hash(`link:${link}`),
			};
		}
		if (!stat.isFile()) {
			return {
				path,
				tracked,
				status: statuses.get(path) ?? "",
				kind: "other",
				mode,
				hash: null,
			};
		}
		return {
			path,
			tracked,
			status: statuses.get(path) ?? "",
			kind: "file",
			mode,
			hash: hash(readFileSync(fullPath)),
		};
	} catch {
		return {
			path,
			tracked,
			status: statuses.get(path) ?? "",
			kind: "missing",
			mode: null,
			hash: null,
		};
	}
}

export function captureSnapshot(root, options = {}) {
	const requestedRoot = resolve(root);
	let sourceRoot = requestedRoot;
	try {
		sourceRoot = realpathSync(requestedRoot);
	} catch {}
	let cwdReal = process.cwd();
	try {
		cwdReal = realpathSync(cwdReal);
	} catch {}
	const gitRoot =
		git(sourceRoot, ["rev-parse", "--show-toplevel"])?.trim() ?? null;
	let gitRootReal = gitRoot;
	try {
		if (gitRoot) gitRootReal = realpathSync(gitRoot);
	} catch {}
	const fullRoot = gitRootReal ?? sourceRoot;
	const paths = gitRootReal ? pathsFromGit(fullRoot) : null;
	const statusOutput = gitRootReal
		? git(fullRoot, ["status", "--porcelain=v1", "-z"])
		: null;
	const head = gitRootReal
		? (git(fullRoot, ["rev-parse", "--verify", "HEAD"])?.trim() ?? null)
		: null;
	const valid = Boolean(paths && statusOutput != null && head);
	const statuses = valid ? statusByPath(statusOutput) : new Map();
	const entries = (paths ? [...paths] : [])
		.map(([path, tracked]) => snapshotEntry(fullRoot, path, tracked, statuses))
		.sort((left, right) => left.path.localeCompare(right.path));
	const snapshot = {
		root: options.includeRoot ? fullRoot : null,
		bindings: {
			root: fullRoot,
			sourceRoot,
			gitRoot: gitRootReal,
			cwd: cwdReal,
			head,
			environmentFingerprint: hash({
				node: process.version,
				platform: process.platform,
				arch: process.arch,
			}),
		},
		valid,
		errors: valid ? [] : ["git snapshot을 확인할 수 없다"],
		git: {
			head,
			tracked: entries.filter((entry) => entry.tracked).length,
			untracked: entries.filter((entry) => !entry.tracked).length,
		},
		entries,
	};
	return { ...snapshot, manifestHash: hash(snapshot) };
}

function changedEntries(baseline, current) {
	const before = new Map(
		(baseline?.entries ?? []).map((entry) => [entry.path, entry]),
	);
	const after = new Map(current.entries.map((entry) => [entry.path, entry]));
	return [...new Set([...before.keys(), ...after.keys()])]
		.sort()
		.flatMap((path) => {
			const oldEntry = before.get(path);
			const newEntry = after.get(path);
			if (stable(oldEntry) === stable(newEntry)) return [];
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

function globMatches(path, pattern) {
	if (!safePath(pattern)) return false;
	const escaped = pattern
		.split("**")
		.map((part) =>
			part
				.split("*")
				.map((piece) => piece.replace(/[|\\{}()[\]^$+?.]/g, "\\$&"))
				.join("[^/]*"),
		)
		.join(".*");
	return new RegExp(`^${escaped}$`).test(path);
}

function isSubsetPath(candidate, owner) {
	if (!safePath(candidate) || !safePath(owner)) return false;
	if (candidate === owner) return true;
	if (!owner.endsWith("/**")) return false;
	const prefix = owner.slice(0, -2);
	return candidate.startsWith(prefix);
}

function normalizeChanges(changes) {
	return changes.map((change) => ({
		path: change.path,
		kind: change.kind,
		before: change.before,
		after: change.after,
	}));
}

function environmentFingerprint(context) {
	return hash(
		context.environment ?? {
			node: process.version,
			platform: process.platform,
			arch: process.arch,
		},
	);
}

function checkArtifacts(root, artifacts, problems) {
	for (const artifact of artifacts ?? []) {
		if (!artifact?.path || !safePath(artifact.path)) {
			problems.push("evidence artifact path가 안전하지 않다");
			continue;
		}
		try {
			const stat = lstatSync(resolve(root, artifact.path));
			if (!stat.isFile() || stat.isSymbolicLink())
				throw new Error("not a file");
			if (hash(readFileSync(resolve(root, artifact.path))) !== artifact.hash) {
				problems.push(`artifact hash가 다르다: ${artifact.path}`);
			}
		} catch {
			problems.push(`artifact를 읽을 수 없다: ${artifact.path}`);
		}
	}
}

function checkReceipts(commands, receipts, problems) {
	if (!Array.isArray(receipts)) {
		problems.push("Main runner receipt가 없다");
		return;
	}
	for (const command of commands ?? []) {
		if (command.executed === false || !Number.isInteger(command.exitCode)) {
			problems.push("실행하지 않은 command를 성공으로 보고했다");
			continue;
		}
		const receipt = receipts.find(
			(item) =>
				item.command === command.command && item.exitCode === command.exitCode,
		);
		if (!receipt || receipt.executed === false) {
			problems.push(`Main runner receipt가 없다: ${command.command}`);
		}
	}
}

function checkProviderPolicy(provider, context, problems) {
	const modes = new Set(context.allowedModes ?? []);
	const hosts = new Set(context.allowedHosts ?? []);
	if (!modes.has(provider.mode)) {
		problems.push(`허용 밖 provider mode: ${provider.mode}`);
	}
	if (!hosts.has(provider.host)) {
		problems.push(`허용 밖 provider host: ${provider.host}`);
	}
}

function receiptBindings(command, packet, context, baseline, snapshot) {
	const bindings = {
		taskId: packet.taskId,
		runId: packet.runId,
		command: command.command,
		argv: command.argv,
		exitCode: command.exitCode,
		executed: command.executed,
		cwd: context.cwd,
		environmentFingerprint:
			context.environmentFingerprint ?? environmentFingerprint(context),
		before: baseline.manifestHash,
		after: snapshot.manifestHash,
		artifacts: command.artifacts ?? [],
		effects: command.effects,
		identityDigest: command.identityDigest,
	};
	return { ...bindings, key: hash(bindings) };
}

function checkTrustedReceipts(
	packet,
	context,
	baseline,
	snapshot,
	evidence,
	problems,
) {
	const actualEffects = new Set();
	for (const command of evidence.commands ?? []) {
		const bindings = receiptBindings(
			command,
			packet,
			context,
			baseline,
			snapshot,
		);
		for (const field of [
			"taskId",
			"runId",
			"command",
			"argv",
			"exitCode",
			"executed",
			"cwd",
			"environmentFingerprint",
			"before",
			"after",
			"artifacts",
			"effects",
			"identityDigest",
		]) {
			if (
				command[field] == null ||
				stable(command[field]) !== stable(bindings[field])
			) {
				problems.push(`receipt binding이 다르다: ${field}`);
			}
		}
		if (typeof context.verifyReceipt !== "function") continue;
		const proof = context.verifyReceipt(bindings, command, packet);
		if (
			!proof?.ok ||
			proof.identityDigest !== command.identityDigest ||
			proof.key !== bindings.key
		) {
			problems.push(`trusted receipt 검증 실패: ${command.command}`);
		}
		for (const effect of proof?.effects ?? []) actualEffects.add(effect);
	}
	if (typeof context.verifyReceipt !== "function") {
		if (context.phase !== "handoff") {
			problems.push("Runtime receipt authority unsupported");
		}
		return;
	}
	if (
		stable([...actualEffects].sort()) !==
		stable([...(packet.sideEffects ?? [])].sort())
	) {
		problems.push("packet sideEffects가 실제 receipt와 다르다");
	}
}

function authorityBindings(
	packet,
	snapshot,
	evidencePacketHash,
	providerActualHashes,
	environment,
) {
	const bindings = {
		taskId: packet.taskId,
		runId: packet.runId,
		baseline: packet.baseline?.manifestHash,
		currentProduct: snapshot.manifestHash,
		evidencePacketHash,
		providerActualHashes,
		environmentFingerprint: environment,
		reviewer: packet.mainGate?.reviewer,
		focus: packet.evidence?.focus,
		contracts: packet.contracts,
	};
	return { ...bindings, key: hash(bindings) };
}

function checkAuthority(bindings, packet, context, problems) {
	if (context.phase === "handoff") return false;
	if (typeof context.verifyAuthority !== "function") {
		if (context.phase !== "handoff") {
			problems.push("Runtime authority unsupported");
		}
		return false;
	}
	if (packet.mainGate?.reused !== false) {
		problems.push("Main gate는 재사용할 수 없다");
		return false;
	}
	if (
		!packet.mainGate.reviewer ||
		!Array.isArray(packet.contracts) ||
		!packet.contracts.length ||
		!Array.isArray(packet.evidence?.focus) ||
		!packet.evidence.focus.length
	) {
		problems.push("Main gate reviewer·focus·contracts가 없다");
		return false;
	}
	const proof = context.verifyAuthority(bindings, packet, context);
	if (!proof?.ok || proof.reused !== false || proof.key !== bindings.key) {
		problems.push("Main gate proof가 현재 결속과 다르다");
		return false;
	}
	return true;
}

export function validateDelegationPacket(root, packet = {}, context = {}) {
	const problems = [];
	const baseline = context.baseline;
	if (!baseline?.valid || !baseline.entries) {
		problems.push("Main baseline snapshot이 없다");
	}
	if (packet.baseline?.manifestHash !== baseline?.manifestHash) {
		problems.push("packet baseline이 Main baseline과 다르다");
	}
	const snapshot = captureSnapshot(root);
	if (!snapshot.valid) problems.push("git snapshot을 확인할 수 없다");
	if (
		!baseline?.bindings?.root ||
		baseline.bindings.root !== snapshot.bindings.root ||
		baseline.bindings.gitRoot !== snapshot.bindings.gitRoot
	) {
		problems.push("baseline root binding이 현재 Git root와 다르다");
	}
	const actualChanges = changedEntries(baseline, snapshot);
	if (packet.status !== "complete") {
		problems.push(`완료되지 않은 status: ${packet.status ?? "없음"}`);
	}
	if ((packet.unresolved ?? []).length) {
		problems.push("unresolved 항목이 남아 있다");
	}
	const selectedProviders = [];
	for (const selected of packet.selectedProviders ?? []) {
		const checked = resolveProvider(selected, context);
		if (!checked.ok) {
			problems.push(`provider 검증 실패: ${checked.reason}`);
		} else {
			selectedProviders.push(checked);
			checkProviderPolicy(checked.provider, context, problems);
		}
	}
	const allowed = context.approvedPaths ?? [];
	const claimedPaths = packet.allowedPaths ?? [];
	if (!allowed.length || allowed.some((path) => !safePath(path))) {
		problems.push("approved ownership path가 안전하지 않다");
	}
	if (
		!Array.isArray(claimedPaths) ||
		claimedPaths.some(
			(path) => !allowed.some((owner) => isSubsetPath(path, owner)),
		)
	) {
		problems.push("packet ownership이 Main ownership을 넓힌다");
	}
	for (const change of actualChanges) {
		if (!allowed.some((pattern) => globMatches(change.path, pattern))) {
			problems.push(`승인 밖 실제 변경: ${change.path}`);
		}
	}
	if (
		stable(normalizeChanges(packet.changes ?? [])) !==
		stable(normalizeChanges(actualChanges))
	) {
		problems.push("packet changes가 실제 delta와 다르다");
	}
	const effects = new Set(context.allowedSideEffects ?? []);
	for (const effect of packet.sideEffects ?? []) {
		if (!effects.has(effect)) problems.push(`허용 밖 side effect: ${effect}`);
	}
	const actualEnvironmentFingerprint =
		context.environmentFingerprint ?? environmentFingerprint(context);
	if (
		!packet.environmentFingerprint ||
		packet.environmentFingerprint !== actualEnvironmentFingerprint
	) {
		problems.push("environmentFingerprint가 실제 환경과 다르다");
	}
	const evidence = packet.evidence ?? {};
	for (const field of [
		"report",
		"commands",
		"coverage",
		"limitations",
		"artifacts",
		"focus",
		"snapshot",
	]) {
		if (evidence[field] == null) problems.push(`evidence ${field}가 없다`);
	}
	if (
		!Array.isArray(evidence.commands) ||
		!evidence.commands.length ||
		!Array.isArray(evidence.focus) ||
		!evidence.focus.length ||
		!Array.isArray(evidence.limitations) ||
		!Array.isArray(evidence.artifacts) ||
		!evidence.coverage ||
		typeof evidence.coverage !== "object" ||
		!Object.keys(evidence.coverage).length
	) {
		problems.push("evidence 완료 형식이 아니다");
	}
	if (evidence.snapshot !== baseline?.manifestHash) {
		problems.push("evidence snapshot이 Main baseline과 다르다");
	}
	checkReceipts(evidence.commands, context.runnerReceipts, problems);
	checkArtifacts(resolve(root), evidence.artifacts, problems);
	checkTrustedReceipts(packet, context, baseline, snapshot, evidence, problems);
	for (const review of packet.reviewCoverage ?? []) {
		if (/prokit/i.test(review.reviewer ?? "") && review.reused) {
			problems.push("prokit gate는 재사용할 수 없다");
		}
	}
	// reviewerResults는 자기 평가이므로 key에 넣지 않는다.
	// 실행 증거는 그대로 둔다.
	const cleanEvidence = evidence;
	const evidencePacketHash = hash({
		report: cleanEvidence.report,
		commands: cleanEvidence.commands,
		coverage: cleanEvidence.coverage,
		limitations: cleanEvidence.limitations,
		artifacts: cleanEvidence.artifacts,
		focus: cleanEvidence.focus,
		snapshot: cleanEvidence.snapshot,
		environmentFingerprint: actualEnvironmentFingerprint,
	});
	const providerActualHashes = selectedProviders.map((item) => item.actualHash);
	const bindings = authorityBindings(
		packet,
		snapshot,
		evidencePacketHash,
		providerActualHashes,
		actualEnvironmentFingerprint,
	);
	const authorityVerified = checkAuthority(bindings, packet, context, problems);
	const pendingAuthority = !authorityVerified && context.phase === "handoff";
	const result = {
		ok: problems.length === 0,
		status: problems.length
			? "blocked"
			: pendingAuthority
				? "admitted_pending_main"
				: "complete",
		completionReady: problems.length === 0 && authorityVerified,
		authorityVerified,
		authorityProofKey: authorityVerified ? bindings.key : null,
		problems,
		snapshot,
		actualChanges,
		productHash: snapshot.manifestHash,
		baselineHash: baseline?.manifestHash ?? null,
		providerActualHashes,
		evidencePacketHash,
		environmentFingerprint: actualEnvironmentFingerprint,
	};
	validationRegistry.set(
		result,
		Object.freeze({
			ok: result.ok,
			authorityVerified: result.authorityVerified,
			authorityProofKey: result.authorityProofKey,
			productHash: result.productHash,
			baselineHash: result.baselineHash,
			evidencePacketHash: result.evidencePacketHash,
			providerActualHashes: Object.freeze([...result.providerActualHashes]),
			environmentFingerprint: result.environmentFingerprint,
		}),
	);
	return result;
}

export function reviewReuseKey(input = {}) {
	const validation = validationRegistry.get(input.validation);
	if (
		input.kind !== "external" ||
		!validation ||
		!validation.ok ||
		!validation.authorityVerified ||
		!validation.authorityProofKey ||
		input.isProkitGate ||
		/prokit/i.test(input.reviewerProfile ?? "")
	) {
		return null;
	}
	const required = [
		"productHash",
		"evidencePacketHash",
		"environmentFingerprint",
		"baselineHash",
	];
	if (
		required.some((key) => !validation[key]) ||
		validation.baselineHash !== input.baseline ||
		!Array.isArray(validation.providerActualHashes) ||
		!validation.providerActualHashes.length ||
		!Array.isArray(input.focus) ||
		!input.focus.length ||
		!Array.isArray(input.contracts) ||
		!input.contracts.length ||
		![
			input.base,
			input.baseline,
			input.focus,
			input.contracts,
			input.reviewerProfile,
		].every(Boolean)
	) {
		return null;
	}
	return hash({
		productHash: validation.productHash,
		evidencePacketHash: validation.evidencePacketHash,
		base: input.base,
		baseline: input.baseline,
		focus: input.focus,
		contracts: input.contracts,
		providerActualHashes: validation.providerActualHashes,
		reviewerProfile: input.reviewerProfile,
		environmentFingerprint: validation.environmentFingerprint,
	});
}

export function main(argv = process.argv.slice(2), root = process.cwd()) {
	if (argv[0] === "snapshot" || argv[0] === "capture") {
		console.log(JSON.stringify(captureSnapshot(root), null, 2));
		return 0;
	}
	if (argv[0] === "resolve" && argv[1] && argv[2] === "--context" && argv[3]) {
		if (!safePath(argv[3])) return 2;
		const context = JSON.parse(readFileSync(resolve(root, argv[3]), "utf8"));
		context.root = root;
		context.inspectOnly = true;
		const result = resolveProvider(argv[1], context);
		console.log(JSON.stringify(result, null, 2));
		return result.ok ? 0 : 1;
	}
	if (argv[0] === "validate" && argv[1] && argv[2] === "--context" && argv[3]) {
		if (!safePath(argv[1]) || !safePath(argv[3])) return 2;
		const packet = JSON.parse(readFileSync(resolve(root, argv[1]), "utf8"));
		const context = JSON.parse(readFileSync(resolve(root, argv[3]), "utf8"));
		context.phase ??= "handoff";
		if (!context.resolver && Array.isArray(context.actualProviders)) {
			context.resolver = (ref) =>
				context.actualProviders.find((provider) => sameIdentity(provider, ref));
		}
		const result = validateDelegationPacket(root, packet, context);
		console.log(JSON.stringify(result, null, 2));
		return result.ok ? 0 : 1;
	}
	console.error(
		"usage: delegation.mjs capture|snapshot | " +
			"resolve <skill-ref> --context <scope-policy.json> | " +
			"validate <packet.json> --context <main-context.json>",
	);
	return 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	process.exitCode = main();
}
