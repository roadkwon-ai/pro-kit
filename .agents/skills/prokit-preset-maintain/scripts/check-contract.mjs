import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const usage =
	"check-contract.mjs --web <pro-kit-web> --kit <pro-kit> [--slug <name>] [--static-root <dir>] [--zip <file>] [--baseline <file>]";
const hash = (value) => createHash("sha256").update(value).digest("hex");

function fail(message) {
	return { status: "blocked", systemStatus: "unknown", reason: message };
}

function parseArgs(args) {
	const options = {};
	const names = {
		"--web": "web",
		"--kit": "kit",
		"--slug": "slug",
		"--static-root": "staticRoot",
		"--zip": "zip",
		"--baseline": "baseline",
	};
	for (let index = 0; index < args.length; index += 1) {
		const name = args[index];
		const key = names[name];
		if (!key || !args[index + 1] || options[key] !== undefined)
			throw new Error(`사용법: ${usage}`);
		options[key] =
			key === "slug" ? args[index + 1] : path.resolve(args[index + 1]);
		index += 1;
	}
	if (!options.web || !options.kit) throw new Error(`사용법: ${usage}`);
	options.baseline ??= path.join(here, "../references/contract-baseline.json");
	return options;
}

function readBaseline(file) {
	if (!existsSync(file) || lstatSync(file).isSymbolicLink())
		throw new Error("계약 기준선 파일이 없거나 안전하지 않습니다");
	let baseline;
	try {
		baseline = JSON.parse(readFileSync(file, "utf8"));
	} catch {
		throw new Error("계약 기준선 JSON을 읽을 수 없습니다");
	}
	if (!/^[a-f0-9]{64}$/.test(baseline.contractFingerprint ?? ""))
		throw new Error("계약 기준선 형식이 올바르지 않습니다");
	const files = validContractFiles(baseline.contractFiles);
	if (!files) throw new Error("계약 기준선 파일 목록이 올바르지 않습니다");
	if (hash(JSON.stringify(files)) !== baseline.contractFingerprint)
		throw new Error("계약 기준선 지문이 파일 목록과 일치하지 않습니다");
	return { ...baseline, contractFiles: files };
}

function validContractFiles(files) {
	if (!Array.isArray(files) || files.length === 0) return null;
	const paths = new Set();
	for (const file of files) {
		if (
			typeof file?.path !== "string" ||
			!file.path ||
			!/^pro-kit(?:-web|-samples)?\//.test(file.path) ||
			!/^[a-f0-9]{64}$/.test(file.sha256 ?? "") ||
			paths.has(file.path)
		)
			return null;
		paths.add(file.path);
	}
	return [...files].toSorted((left, right) =>
		left.path.localeCompare(right.path),
	);
}

function changedFiles(current, baseline) {
	const previous = new Map(baseline.contractFiles.map((file) => [file.path, file.sha256]));
	const now = new Map(current.contractFiles.map((file) => [file.path, file.sha256]));
	return [...new Set([...previous.keys(), ...now.keys()])]
		.filter((file) => previous.get(file) !== now.get(file))
		.toSorted();
}

function runContract(options) {
	const script = path.join(options.web, "scripts/preset-contract.mjs");
	if (!existsSync(script) || lstatSync(script).isSymbolicLink())
		return { error: "pro-kit-web의 preset-contract.mjs를 찾을 수 없습니다" };
	const args = [script, "--kit", options.kit];
	for (const [option, value] of [
		["--slug", options.slug],
		["--static-root", options.staticRoot],
		["--zip", options.zip],
	])
		if (value) args.push(option, value);
	const child = spawnSync(process.execPath, args, {
		encoding: "utf8",
		shell: false,
	});
	if (child.error) return { error: `등록 검사 실행 실패: ${child.error.message}` };
	let current;
	try {
		current = JSON.parse(child.stdout);
	} catch {
		return { error: "등록 검사가 JSON 결과를 반환하지 않았습니다" };
	}
	if (child.status === 1 && current.status === "failed") return { current };
	if (child.status !== 0 || current.status !== "ok")
		return { error: "등록 검사의 종료 상태가 올바르지 않습니다", current };
	const files = validContractFiles(current.contractFiles);
	if (
		!/^[a-f0-9]{64}$/.test(current.contractFingerprint ?? "") ||
		!files ||
		hash(JSON.stringify(files)) !== current.contractFingerprint
	)
		return { error: "등록 검사의 계약 결과 형식이 올바르지 않습니다" };
	current.contractFiles = files;
	return { current };
}

export function checkContract(args) {
	let options;
	try {
		options = parseArgs(args);
	} catch (error) {
		return fail(error.message);
	}
	const checked = runContract(options);
	if (checked.error)
		return {
			...fail(checked.error),
			...(checked.current ? { registration: checked.current } : {}),
		};
	if (checked.current.status === "failed")
		return {
			status: "blocked",
			systemStatus: "unknown",
			reason: "등록 검사가 실패했습니다",
			registration: checked.current,
		};
	let baseline;
	try {
		baseline = readBaseline(options.baseline);
	} catch (error) {
		return { ...fail(error.message), registration: checked.current };
	}
	const changes = changedFiles(checked.current, baseline);
	const unchanged =
		changes.length === 0 &&
		checked.current.contractFingerprint === baseline.contractFingerprint;
	return {
		status: unchanged ? "ok" : "review-required",
		systemStatus: unchanged ? "unchanged" : "changed",
		registration: checked.current,
		baseline: {
			contractFingerprint: baseline.contractFingerprint,
			contractFiles: baseline.contractFiles,
		},
		changedFiles: changes,
	};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const result = checkContract(process.argv.slice(2));
	console.log(JSON.stringify(result));
	process.exitCode = result.status === "ok" ? 0 : result.status === "review-required" ? 1 : 2;
}
