import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
	closeSync,
	existsSync,
	fchmodSync,
	fstatSync,
	fsyncSync,
	ftruncateSync,
	lstatSync,
	mkdirSync,
	openSync,
	writeSync,
} from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const usage =
	"record-command.mjs --out <new-evidence.json> --phase <phase> -- <command> [args...]";
const hash = (value) => createHash("sha256").update(value).digest("hex");

function parseArgs(args) {
	const divider = args.indexOf("--");
	if (divider < 1 || divider === args.length - 1) throw new Error(`사용법: ${usage}`);
	const options = {};
	for (let index = 0; index < divider; index += 1) {
		const name = args[index];
		const key = name === "--out" ? "out" : name === "--phase" ? "phase" : null;
		if (!key || !args[index + 1] || options[key] !== undefined)
			throw new Error(`사용법: ${usage}`);
		options[key] = args[index + 1];
		index += 1;
	}
	if (!options.out || !options.phase) throw new Error(`사용법: ${usage}`);
	return {
		out: path.resolve(options.out),
		phase: options.phase,
		command: args.slice(divider + 1),
	};
}

function writeReceipt(descriptor, receipt) {
	const bytes = Buffer.from(`${JSON.stringify(receipt)}\n`);
	ftruncateSync(descriptor, 0);
	let offset = 0;
	while (offset < bytes.length)
		offset += writeSync(descriptor, bytes, offset, bytes.length - offset, offset);
	fsyncSync(descriptor);
}

function ownsReceiptPath(file, descriptor) {
	try {
		const opened = fstatSync(descriptor);
		const current = lstatSync(file);
		return (
			current.isFile() &&
			current.dev === opened.dev &&
			current.ino === opened.ino &&
			current.uid === opened.uid
		);
	} catch {
		return false;
	}
}

export async function recordCommand(args) {
	let options;
	try {
		options = parseArgs(args);
	} catch (error) {
		return { exitCode: 2, error: error.message };
	}
	if (existsSync(options.out))
		return { exitCode: 2, error: "증거 파일은 새 경로여야 합니다" };
	try {
		mkdirSync(path.dirname(options.out), { recursive: true, mode: 0o700 });
	} catch (error) {
		return { exitCode: 2, error: `증거 폴더를 만들 수 없습니다: ${error.message}` };
	}
	const startedAt = new Date().toISOString();
	const started = performance.now();
	const commandSHA = hash(JSON.stringify(options.command));
	const initial = { phase: options.phase, status: "running", startedAt, commandSHA };
	let descriptor;
	try {
		descriptor = openSync(options.out, "wx", 0o600);
		fchmodSync(descriptor, 0o600);
		writeReceipt(descriptor, initial);
	} catch (error) {
		if (descriptor !== undefined) closeSync(descriptor);
		return { exitCode: 2, error: `증거 파일을 만들 수 없습니다: ${error.message}` };
	}
	let child;
	try {
		child = spawn(options.command[0], options.command.slice(1), {
			shell: false,
			stdio: "inherit",
		});
	} catch (error) {
		const receipt = {
			...initial,
			status: "failed",
			endedAt: new Date().toISOString(),
			wallMs: Math.round(performance.now() - started),
			exitCode: null,
			signal: null,
		};
		if (!ownsReceiptPath(options.out, descriptor)) {
			closeSync(descriptor);
			return { exitCode: 1, error: "증거 파일 경로의 소유 상태가 바뀌었습니다" };
		}
		writeReceipt(descriptor, receipt);
		closeSync(descriptor);
		return { exitCode: 1 };
	}
	let parentSignal = null;
	const forward = (signal) => {
		parentSignal ??= signal;
		if (!child.killed) child.kill(signal);
	};
	const onSigint = () => forward("SIGINT");
	const onSigterm = () => forward("SIGTERM");
	process.once("SIGINT", onSigint);
	process.once("SIGTERM", onSigterm);
	const [exitCode, signal] = await new Promise((resolve) => {
		child.once("error", () => resolve([null, null]));
		child.once("close", (code, closeSignal) => resolve([code, closeSignal]));
	});
	process.removeListener("SIGINT", onSigint);
	process.removeListener("SIGTERM", onSigterm);
	const endedAt = new Date().toISOString();
	const interrupted = Boolean(parentSignal || signal);
	const receipt = {
		...initial,
		status: interrupted ? "interrupted" : exitCode === 0 ? "succeeded" : "failed",
		endedAt,
		wallMs: Math.round(performance.now() - started),
		exitCode,
		signal: signal ?? parentSignal,
	};
	if (!ownsReceiptPath(options.out, descriptor)) {
		closeSync(descriptor);
		return { exitCode: 1, error: "증거 파일 경로의 소유 상태가 바뀌었습니다" };
	}
	writeReceipt(descriptor, receipt);
	closeSync(descriptor);
	return {
		exitCode:
			receipt.status === "succeeded" ? 0 : exitCode && exitCode !== 0 ? exitCode : 1,
	};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const result = await recordCommand(process.argv.slice(2));
	if (result.error) process.stderr.write(`${result.error}\n`);
	process.exitCode = result.exitCode;
}
