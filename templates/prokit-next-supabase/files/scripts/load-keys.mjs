#!/usr/bin/env node
// .env에 둔 이미지 생성 키와 배포 토큰을 필요한 곳에만 넣는다. 셸에 없는 이름만, 프로젝트 루트 .env →
// 작업 폴더(프로젝트의 상위 폴더) .env 순서로 찾는다. 값은 출력하지 않는다. export-html.mjs가 같은 파서를 쓴다.
// 사용법: node scripts/load-keys.mjs                     Claude Code SessionStart 훅(설치기가 .claude/settings.json에
//                                                         등록한다). OPENAI_API_KEY만 세션 셸 환경에 넣는다
//                                                         ($CLAUDE_ENV_FILE. 없으면 아무것도 하지 않는다)
//         node scripts/load-keys.mjs -- <명령> [인자…]   세 키를 그 명령 하나에만 넣어 실행한다. 배포 토큰은
//                                                         이 방법으로만 쓴다(gh·vercel·release가 세션 내내
//                                                         .env 토큰으로 돌지 않게). exit는 그 명령의 것
import { spawnSync } from "node:child_process";
import {
	appendFileSync,
	existsSync,
	readFileSync,
	realpathSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const KEYS = ["OPENAI_API_KEY", "GH_TOKEN", "VERCEL_TOKEN"];
const HOOK_KEYS = ["OPENAI_API_KEY"];
// 이 스크립트는 <프로젝트>/scripts/에 있다
const PROJECT = fileURLToPath(new URL("..", import.meta.url));

// 따옴표 값은 따옴표 안만, 따옴표 없는 값은 " #" 뒤 주석을 뗀다
export function parseValue(raw) {
	const q = raw.match(/^(['"])(.*?)\1\s*(?:#.*)?$/);
	return q ? q[2] : raw.replace(/\s+#.*$/, "");
}

export function readEnv(file) {
	const out = {};
	if (!existsSync(file)) return out;
	for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
		const m = line.match(
			/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/,
		);
		if (!m) continue;
		const value = parseValue(m[2]);
		if (value) out[m[1]] = value;
	}
	return out;
}

export const envFiles = (root) => [
	join(root, ".env"),
	join(dirname(resolve(root)), ".env"),
];

const quote = (v) => `'${v.replaceAll("'", "'\\''")}'`;

// 셸에 없는 키의 [이름, 값]
export function missingKeys(root, env, names = KEYS) {
	const found = envFiles(root).map(readEnv);
	return names
		.filter((name) => !env[name])
		.flatMap((name) => {
			const value = found.find((f) => f[name])?.[name];
			return value ? [[name, value]] : [];
		});
}

export const exportLines = (root, env) =>
	missingKeys(root, env, HOOK_KEYS).map(([n, v]) => `export ${n}=${quote(v)}`);

const USAGE = "사용법: node scripts/load-keys.mjs -- <명령> [인자…]";

export function main(argv = [], env = process.env) {
	const root = env.CLAUDE_PROJECT_DIR || PROJECT;
	const at = argv.indexOf("--");
	if (at >= 0) {
		const [cmd, ...args] = argv.slice(at + 1);
		if (!cmd) {
			console.error(USAGE);
			return 1;
		}
		const keys = Object.fromEntries(missingKeys(root, env));
		const r = spawnSync(cmd, args, {
			stdio: "inherit",
			env: { ...env, ...keys },
		});
		if (r.error) console.error(`실행하지 못했다: ${r.error.message}`);
		return r.status ?? 1;
	}
	if (argv.length) {
		console.error(USAGE);
		return 1;
	}
	// 훅: 세션 시작을 막지 않는다. 어떤 실패도 조용히 넘긴다.
	try {
		if (!env.CLAUDE_ENV_FILE) return 0;
		const lines = exportLines(root, env);
		if (lines.length)
			appendFileSync(env.CLAUDE_ENV_FILE, `${lines.join("\n")}\n`);
	} catch {}
	return 0;
}

const isMain = () => {
	try {
		return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
	} catch {
		return false;
	}
};
if (isMain()) process.exitCode = main(process.argv.slice(2));
