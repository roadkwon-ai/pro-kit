#!/usr/bin/env node
// pack.mjs로 검증·다운로드한 팩의 소스를 프로젝트에 복원한다. 설치·빌드는 호출자가 수행한다.
import { createHash } from "node:crypto";
import {
	lstatSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	realpathSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, parse, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const hashPattern = /^[a-f0-9]{64}$/;
const harnessScripts = new Set([
	"dev-cycle.mjs",
	"skills-setup.mjs",
	"sync-agents.mjs",
	"resource-guard.mjs",
	"delegation.mjs",
	"load-keys.mjs",
	"release.mjs",
	"vercel-deploy.mjs",
]);
function stat(path) {
	try {
		return lstatSync(path);
	} catch (e) {
		if (e.code === "ENOENT") return null;
		throw e;
	}
}
function safeRelative(path, protectedPath = true) {
	if (
		typeof path !== "string" ||
		!path ||
		/[\\:]/.test(path) ||
		[...path].some((character) => character.charCodeAt(0) < 32) ||
		path.split("/").some((p) => !p || p === "." || p === "..")
	)
		throw new Error(`안전하지 않은 경로: ${path}`);
	const parts = path.split("/");
	if (
		protectedPath &&
		(parts.some(
			(p) =>
				/^\.env/i.test(p) ||
				["AGENTS.MD", "CLAUDE.MD", "GEMINI.MD"].includes(p.toUpperCase()) ||
				[
					".agents",
					".claude",
					".codex",
					".git",
					".omx",
					".impeccable",
					".cursor",
					".gemini",
					".grok",
					"node_modules",
				].includes(p.toLowerCase()),
		) ||
			["tasks", ".dev-cycle.json", "skills.manifest.json"].includes(
				parts[0].toLowerCase(),
			) ||
			(parts[0].toLowerCase() === "scripts" &&
				harnessScripts.has(parts[1]?.toLowerCase())))
	)
		throw new Error(`보호된 환경·하네스 경로: ${path}`);
	return path;
}
// 각 부모를 lstat으로 확인해 깨진 링크도 누락 파일로 취급하지 않는다.
function inspect(path) {
	const absolute = resolve(path);
	const root = parse(absolute).root;
	let at = root;
	for (const part of relative(root, absolute).split("/")) {
		at = join(at, part);
		const info = stat(at);
		if (info?.isSymbolicLink()) throw new Error(`심볼릭 링크 금지: ${at}`);
		if (info && at !== absolute && !info.isDirectory())
			throw new Error(`디렉터리가 아닌 부모: ${at}`);
	}
	return stat(absolute);
}
function json(root, name, optional = false) {
	const path = join(root, safeRelative(name, false));
	const info = inspect(path);
	if (!info && optional) return null;
	if (!info?.isFile()) throw new Error(`일반 JSON 파일 필요: ${path}`);
	return JSON.parse(readFileSync(path, "utf8"));
}
function filesIn(root, prefix = "") {
	if (!inspect(root)?.isDirectory())
		throw new Error(`source 디렉터리 필요: ${root}`);
	return readdirSync(root).flatMap((name) => {
		const path = join(root, name);
		const key = `${prefix}${name}`;
		const info = inspect(path);
		if (info.isDirectory()) return filesIn(path, `${key}/`);
		if (!info.isFile()) throw new Error(`일반 파일 필요: ${key}`);
		return [key];
	});
}
function canonicalRoot(path) {
	const absolute = resolve(path);
	const info = stat(absolute);
	if (info?.isSymbolicLink()) throw new Error(`심볼릭 링크 금지: ${absolute}`);
	if (info) return realpathSync(absolute);
	return join(
		canonicalRoot(dirname(absolute)),
		absolute.slice(dirname(absolute).length + 1),
	);
}
function requireValue(ok, field) {
	if (!ok) throw new Error(`잘못된 v1 manifest: ${field}`);
}
const nonempty = (value) =>
	typeof value === "string" && value.trim().length > 0;
function list(value, field, allowEmpty = false) {
	requireValue(Array.isArray(value) && (allowEmpty || value.length > 0), field);
	return value;
}
function unique(values, field) {
	requireValue(new Set(values).size === values.length, `${field} 중복`);
}
function routePath(path) {
	requireValue(
		typeof path === "string" && path.startsWith("/") && !/[?#%\\]/.test(path),
		"route.path",
	);
	if (path !== "/") safeRelative(path.slice(1).replace(/\/$/, ""), false);
	return path === "/" ? "/" : path.replace(/\/$/, "");
}
function validateManifest(manifest, pack, sourcePaths) {
	requireValue(
		typeof manifest.slug === "string" &&
			/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(manifest.slug),
		"slug",
	);
	const routes = list(manifest.routes, "routes").map((route) => {
		requireValue(nonempty(route?.title), "route.title");
		return routePath(route.path);
	});
	unique(routes, "routes");
	const compatibility = manifest.compatibility;
	requireValue(
		compatibility &&
			["prokit-next-neon", "prokit-next-supabase"].includes(
				compatibility.template,
			),
		"compatibility.template",
	);
	for (const key of ["nextMajor", "pnpmMajor"])
		requireValue(
			Number.isInteger(compatibility[key]) && compatibility[key] > 0,
			`compatibility.${key}`,
		);
	requireValue(
		typeof compatibility.screenOnly === "boolean",
		"compatibility.screenOnly",
	);
	for (const [key, allowed] of [
		["locales", ["ko", "en"]],
		["themes", ["system", "light", "dark"]],
	]) {
		const values = list(manifest.settings?.[key], `settings.${key}`);
		requireValue(
			values.every((value) => allowed.includes(value)),
			`settings.${key}`,
		);
		unique(values, `settings.${key}`);
	}
	const baselines = list(manifest.baselines, "baselines").map((baseline) => {
		requireValue(nonempty(baseline?.id), "baseline.id");
		requireValue(routes.includes(routePath(baseline.route)), "baseline.route");
		for (const key of ["width", "height"])
			requireValue(
				Number.isInteger(baseline.viewport?.[key]) &&
					baseline.viewport[key] > 0,
				`baseline.viewport.${key}`,
			);
		requireValue(
			manifest.settings.locales.includes(baseline.locale) &&
				manifest.settings.themes.includes(baseline.theme),
			"baseline settings",
		);
		for (const key of ["prepare", "checks", "allowedDifferences"])
			requireValue(
				list(baseline[key], `baseline.${key}`, key !== "checks").every(
					(value) =>
						nonempty(value) ||
						(value !== null &&
							typeof value === "object" &&
							!Array.isArray(value)),
				),
				`baseline.${key} entries`,
			);
		const screenshot = safeRelative(baseline.screenshot, false);
		const path = join(pack, screenshot);
		requireValue(inspect(path)?.isFile(), `baseline.screenshot: ${screenshot}`);
		const sha256 = digest(readFileSync(path));
		if (baseline.screenshotSha256 !== undefined)
			requireValue(
				hashPattern.test(baseline.screenshotSha256) &&
					baseline.screenshotSha256 === sha256,
				"baseline.screenshotSha256",
			);
		return { id: baseline.id, route: baseline.route, screenshot, sha256 };
	});
	unique(
		baselines.map((item) => item.id),
		"baseline.id",
	);
	const customization = list(manifest.customization, "customization", true);
	for (const item of customization) {
		safeRelative(item?.path);
		requireValue(
			sourcePaths.includes(item.path),
			"customization.path source 없음",
		);
		const fields = list(item.fields, "customization.fields");
		requireValue(fields.every(nonempty), "customization.fields");
		unique(fields, "customization.fields");
	}
	unique(
		customization.map((item) => item.path.normalize("NFC").toLowerCase()),
		"customization.path",
	);
	return baselines;
}
// 단일 major의 정확한 버전·caret·tilde만 판정한다. 범위·workspace·catalog는 추측하지 않는다.
function knownMajor(version) {
	if (typeof version !== "string") return null;
	const match = version.match(
		/^[~^]?(\d+)(?:\.\d+){0,2}(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/,
	);
	return match ? Number(match[1]) : null;
}
function targetCompatibility(project, declared) {
	const rootPackage = json(project, "package.json", true);
	const webPackage = json(project, "apps/web/package.json", true);
	const cycle = json(project, ".dev-cycle.json", true);
	const versions = [rootPackage, webPackage]
		.flatMap((pkg) => [pkg?.dependencies?.next, pkg?.devDependencies?.next])
		.filter((value) => value !== undefined);
	const majors = versions.map(knownMajor);
	const pnpm = rootPackage?.packageManager?.match(/^pnpm@(.+)$/)?.[1];
	let template = typeof cycle?.template === "string" ? cycle.template : null;
	const instructions = join(project, "AGENTS.md");
	if (!template && inspect(instructions)?.isFile()) {
		template =
			readFileSync(instructions, "utf8").match(
				/^(?:>\s*)?(?:template|템플릿):\s*`?(prokit-next-(?:neon|supabase))`?\s*$/m,
			)?.[1] ?? null;
	}
	const actual = {
		template,
		nextMajor:
			majors.length && majors.every((value) => value === majors[0])
				? majors[0]
				: null,
		pnpmMajor: knownMajor(pnpm),
	};
	for (const key of ["template", "nextMajor", "pnpmMajor"]) {
		const values = key === "nextMajor" ? majors : [actual[key]];
		if (values.some((value) => value !== null && value !== declared[key]))
			throw new Error(
				`대상 프로젝트 호환 불일치: ${key} (팩 ${declared[key]})`,
			);
	}
	const unknown = Object.keys(actual).filter((key) => actual[key] === null);
	return {
		status: unknown.length ? "unknown" : "matched",
		declared,
		actual,
		unknown,
	};
}
export function applyPack({ pack, project, check = false }) {
	if (!pack || !project) throw new Error("--pack과 --project가 필요합니다");
	pack = canonicalRoot(pack);
	project = canonicalRoot(project);
	const target = inspect(project);
	if (target && !target.isDirectory())
		throw new Error("project는 디렉터리여야 합니다");
	const manifest = json(pack, "preset-manifest.json", true);
	if (
		stat(join(pack, "preset-manifest.json")) &&
		(!manifest || typeof manifest !== "object" || Array.isArray(manifest))
	)
		throw new Error("preset-manifest는 객체여야 합니다");
	if (manifest && manifest.schemaVersion !== 1)
		throw new Error(`지원하지 않는 schemaVersion: ${manifest.schemaVersion}`);
	if (
		manifest &&
		(manifest.sourceManifest !== "source-manifest.json" ||
			manifest.removedFiles !== "removed-files.json")
	)
		throw new Error("지원하지 않는 manifest 파일 계약");
	const entries = json(pack, "source-manifest.json");
	if (!Array.isArray(entries) || entries.length === 0)
		throw new Error("source-manifest는 비어 있지 않은 배열이어야 합니다");
	const seen = new Set();
	const source = join(pack, "source");
	const buffers = new Map();
	for (const entry of entries) {
		const path = safeRelative(entry?.path);
		const folded = path.normalize("NFC").toLowerCase();
		if (seen.has(folded)) throw new Error(`중복 경로: ${path}`);
		seen.add(folded);
		if (!hashPattern.test(entry.sha256))
			throw new Error(`잘못된 sha256: ${path}`);
		if (!inspect(join(source, path))?.isFile())
			throw new Error(`source 파일 없음: ${path}`);
		const body = readFileSync(join(source, path));
		if (digest(body) !== entry.sha256)
			throw new Error(`source sha256 불일치: ${path}`);
		buffers.set(path, body);
	}
	const actual = filesIn(source).sort();
	const declared = entries.map((e) => e.path).sort();
	if (JSON.stringify(actual) !== JSON.stringify(declared))
		throw new Error("source 파일과 무결성 목록 불일치");
	const fingerprint = digest(
		[...entries]
			.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
			.map((e) => `${e.path}\0${e.sha256}\n`)
			.join(""),
	);
	if (manifest && manifest.productFingerprint !== fingerprint)
		throw new Error("product fingerprint 불일치");
	const baselines = manifest ? validateManifest(manifest, pack, declared) : [];
	const compatibility = manifest
		? targetCompatibility(project, manifest.compatibility)
		: { status: "unknown", unknown: ["legacy-manifest"] };
	const scaffold = manifest?.scaffoldFiles ?? {};
	if (
		typeof scaffold !== "object" ||
		Array.isArray(scaffold) ||
		scaffold === null
	)
		throw new Error("scaffoldFiles는 경로와 SHA256 객체여야 합니다");
	for (const [path, hash] of Object.entries(scaffold)) {
		safeRelative(path);
		if (!hashPattern.test(hash))
			throw new Error(`잘못된 scaffold sha256: ${path}`);
	}
	const removed = json(pack, "removed-files.json", !manifest) ?? [];
	if (!Array.isArray(removed))
		throw new Error("removed-files는 경로 배열이어야 합니다");
	const writes = [];
	const deletes = [];
	const unchanged = [];
	const conflicts = [];
	for (const entry of entries) {
		const info = inspect(join(project, entry.path));
		if (!info) {
			writes.push(entry.path);
			continue;
		}
		if (!info.isFile() || info.nlink > 1) {
			conflicts.push(entry.path);
			continue;
		}
		const hash = digest(readFileSync(join(project, entry.path)));
		if (hash === entry.sha256) unchanged.push(entry.path);
		else if (hash === scaffold[entry.path]) writes.push(entry.path);
		else conflicts.push(entry.path);
	}
	for (const name of removed) {
		const path = safeRelative(name);
		const folded = path.normalize("NFC").toLowerCase();
		if (seen.has(folded)) throw new Error(`중복 source/삭제 경로: ${path}`);
		seen.add(folded);
		const info = inspect(join(project, path));
		if (!info) continue;
		if (
			!info.isFile() ||
			info.nlink > 1 ||
			digest(readFileSync(join(project, path))) !== scaffold[path]
		)
			conflicts.push(path);
		else deletes.push(path);
	}
	if (conflicts.length)
		throw new Error(
			`사용자 파일 충돌 — 적용하지 않음:\n${conflicts.join("\n")}`,
		);
	// shortcut: 동시 작성·I/O 실패의 원자적 롤백은 지원하지 않는다. 공유 작업에 쓰려면 잠금과 트랜잭션 복원을 추가한다.
	if (!check) {
		for (const path of writes) {
			mkdirSync(dirname(join(project, path)), { recursive: true });
			writeFileSync(join(project, path), buffers.get(path));
		}
		for (const path of deletes) unlinkSync(join(project, path));
	}
	return {
		project,
		check,
		writes,
		deletes,
		unchanged,
		productFingerprint: fingerprint,
		supported: manifest
			? {
					slug: manifest.slug,
					routes: manifest.routes,
					settings: manifest.settings,
				}
			: null,
		compatibility,
		baselines,
		qualityBaseline: manifest
			? "declared-not-visually-verified"
			: "legacy-unverified",
	};
}
if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	try {
		const args = process.argv.slice(2);
		const options = {};
		for (let i = 0; i < args.length; i++) {
			const flag = args[i];
			if (flag === "--check") options.check = true;
			else if (
				["--pack", "--project"].includes(flag) &&
				args[i + 1] &&
				!args[i + 1].startsWith("--")
			)
				options[flag.slice(2)] = args[++i];
			else throw new Error(`알 수 없거나 값이 없는 옵션: ${flag}`);
		}
		console.log(JSON.stringify(applyPack(options), null, 2));
	} catch (e) {
		console.error(e.message);
		process.exitCode = 1;
	}
}
