#!/usr/bin/env node
// 화면만 프로젝트를 정적 HTML로 내보낸다. `pnpm export:html`이 부른다.
// 프로젝트 파일은 바꾸지 않는다. 임시 폴더에 복사본을 만들어 정적 내보내기를 막는 서버 경로를 지우고,
// next.config.ts에 내보내기 설정을 덧쓴 뒤 빌드해 결과(apps/web/out)를 프로젝트의 html/로 옮긴다.
// 사용법: node scripts/export-html.mjs [--base /<하위 경로>]
//   --base  GitHub Pages처럼 하위 경로에 올릴 때(예: --base /my-app). 페이지와 이미지 경로 앞에 붙는다.
// exit: 0 정상, 1 사용법 오류·빌드 실패, 2 비밀값이 결과물에 들어감(html/을 만들지 않는다)
import { spawnSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
// 같은 .env 파서와 키 이름을 쓴다. 둘은 함께 설치된다.
import { envFiles, KEYS, readEnv } from "./load-keys.mjs";

const run = (cmd, args, opts = {}) =>
	spawnSync(cmd, args, {
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
		...opts,
	});

// 어느 깊이에서든 복사하지 않는 이름. 의존성은 복사본에서 다시 설치한다.
const SKIP_NAMES = new Set([
	"node_modules",
	".next",
	".turbo",
	".git",
	".omc",
	".omx",
]);
// 이 경로만 복사하지 않는다(내보낸 결과물)
const SKIP_PATHS = new Set(["html", join("apps", "web", "out")]);
// 정적 내보내기를 막는 BTS 기본 서버 경로: 인증·RPC 핸들러, 서버 세션을 읽는 대시보드
export const SERVER_ROUTES = [
	join("apps", "web", "src", "app", "api"),
	join("apps", "web", "src", "app", "dashboard"),
];
const LOADER = "export-image-loader.js";
// next build가 읽는 파일과 다른 패키지의 값. 작업 폴더 .env는 load-keys의 envFiles가 더한다.
const ENV_FILES = ["", "apps/web/", "packages/db/"].flatMap((dir) =>
	[".env", ".env.local", ".env.production", ".env.production.local"].map(
		(f) => `${dir}${f}`,
	),
);

export function copyFilter(root) {
	return (src) => {
		const rel = relative(root, src);
		if (SKIP_PATHS.has(rel)) return false;
		return !rel.split(sep).some((p) => SKIP_NAMES.has(p));
	};
}

// BTS next.config.ts(`const nextConfig` + `export default withVarlock(nextConfig)`)의 export 앞에 덧쓴다.
// ponytail: 설정 변수 이름이 nextConfig일 때만 고친다. 다른 모양이면 멈추고 알린다.
export function patchNextConfig(text, base = "") {
	if (!/^const nextConfig\b/m.test(text) || !/^export default /m.test(text))
		throw new Error(
			"apps/web/next.config.ts에 `const nextConfig`와 `export default`가 없다. 설정을 덧쓸 자리를 찾지 못했다",
		);
	const override = {
		output: "export",
		trailingSlash: true,
		...(base ? { basePath: base } : {}),
		images: { loader: "custom", loaderFile: `./${LOADER}` },
		// 지운 서버 경로를 가리키던 타입(typedRoutes 등)이 빌드를 막지 않게 한다. 타입 검사는 pnpm check-types가 맡는다.
		typescript: { ignoreBuildErrors: true },
	};
	return text.replace(
		/^export default /m,
		`Object.assign(nextConfig, ${JSON.stringify(override)});\nexport default `,
	);
}

// basePath는 next/image의 문자열 경로에 붙지 않으므로 로더가 붙인다.
export const imageLoader = (base = "") =>
	`const base = ${JSON.stringify(base)};\nexport default function loader({ src }) {\n\treturn src.startsWith("/") && !src.startsWith("//") && !src.startsWith(\`\${base}/\`) ? base + src : src;\n}\n`;

// .env.schema에서 공개로 표시하지 않은 변수의 값(BTS 스키마는 @defaultSensitive=true)을 비밀값으로 본다.
// 표시는 위 주석 줄이나 같은 줄 끝 주석의 @public 또는 @sensitive=false다.
// ponytail: 8자 미만 값(true, 3000)과 계정 정보 없는 http(s) 주소는 화면 글자와 겹쳐 헛경보가 나므로 뺀다.
export function secretValues(root) {
	const schemaPath = join(root, "apps/web/.env.schema");
	const schema = existsSync(schemaPath) ? readFileSync(schemaPath, "utf8") : "";
	const pub = new Set(
		[...schema.matchAll(/((?:^#.*\r?\n)*)^([A-Z][A-Z0-9_]*)=([^\r\n]*)/gm)]
			.filter((m) => /@public\b|@sensitive\s*=\s*false\b/.test(m[1] + m[3]))
			.map((m) => m[2]),
	);
	const secrets = new Map();
	for (const file of [
		...ENV_FILES.map((f) => join(root, f)),
		envFiles(root)[1],
	]) {
		for (const [key, value] of Object.entries(readEnv(file))) {
			if (key.startsWith("NEXT_PUBLIC_") || pub.has(key)) continue;
			if (value.length < 8 || /^https?:\/\/[^@\s]*$/.test(value)) continue;
			secrets.set(value, key);
		}
	}
	return secrets;
}

function files(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
	);
}

// 결과물에 비밀값이 든 변수 이름. 값은 돌려주지 않는다.
export function findLeaks(dir, secrets) {
	const found = new Set();
	for (const f of files(dir)) {
		const buf = readFileSync(f);
		// HTML에서는 &가 &amp;로 바뀐다(예: Neon 주소의 ?sslmode=require&channel_binding=…)
		for (const [value, key] of secrets)
			if (buf.includes(value) || buf.includes(value.replaceAll("&", "&amp;")))
				found.add(key);
	}
	return [...found].sort();
}

// 지운 서버 경로를 부르는 BTS 기본 부품이 남은 곳. 빌드는 되지만 내보낸 사이트에서 그 링크와 요청은 404가 된다.
export function staleRefs(dir, base = "") {
	const pages = [];
	const clients = new Set();
	for (const f of files(dir)) {
		if (!/\.(html|js)$/.test(f)) continue;
		const text = readFileSync(f, "utf8");
		if (f.endsWith(".html") && text.includes(`href="${base}/dashboard`))
			pages.push(f);
		// ponytail: orpc 클라이언트는 BTS providers.tsx가 import만 해도 들어가므로 보지 않는다(부르지 않으면 404가 없다)
		if (text.includes('"/api/auth"'))
			clients.add("로그인 클라이언트(authClient)");
	}
	return [
		...(pages.length ? [`/dashboard 링크(페이지 ${pages.length}개)`] : []),
		...[...clients].sort(),
	];
}

function leaked(keys) {
	console.error(
		`오류: 서버 전용 값이 결과물에 들어 있다: ${keys.join(", ")}. 화면 코드에서 이 값을 쓰는 곳을 고친다. html/은 만들지 않았다`,
	);
	return 2;
}

export function parseArgs(argv) {
	let base = "";
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		let raw;
		if (a === "--base") raw = argv[++i] ?? "";
		else if (a.startsWith("--base=")) raw = a.slice(7);
		else return { error: `모르는 인자: ${a}` };
		base = raw.replace(/\/+$/, "");
		if (!/^\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*$/.test(base))
			return {
				error: `--base는 /로 시작하는 하위 경로다(예: --base /my-app): ${raw}`,
			};
	}
	return { base };
}

export function main(argv, root = process.cwd()) {
	const args = parseArgs(argv);
	if (args.error) {
		console.error(`오류: ${args.error}`);
		console.error("사용법: pnpm export:html [--base /<하위 경로>]");
		return 1;
	}
	const { base } = args;
	const config = join(root, "apps/web/next.config.ts");
	if (!existsSync(config)) {
		console.error(
			"오류: apps/web/next.config.ts가 없다. 프로젝트 루트에서 실행한다",
		);
		return 1;
	}
	let patched;
	try {
		patched = patchNextConfig(readFileSync(config, "utf8"), base);
	} catch (e) {
		console.error(`오류: ${e.message}`);
		return 1;
	}

	// 복사본은 node_modules 밖에 둔다. Turbopack은 node_modules 경로의 앱 소스를 처리하지 못한다(Next 16.3 실측).
	// .env 사본이 들어 있으므로 성공·실패와 상관없이 지운다.
	const work = mkdtempSync(join(tmpdir(), "export-html-"));
	try {
		return build(root, work, base, patched);
	} finally {
		rmSync(work, { recursive: true, force: true });
	}
}

function build(root, work, base, patched) {
	cpSync(root, work, {
		recursive: true,
		filter: copyFilter(root),
		verbatimSymlinks: true,
	});
	for (const r of SERVER_ROUTES)
		rmSync(join(work, r), { recursive: true, force: true });
	writeFileSync(join(work, "apps/web/next.config.ts"), patched);
	writeFileSync(join(work, "apps/web", LOADER), imageLoader(base));

	// 이미지 키와 배포 토큰은 정적 빌드에 필요 없다. 화면 코드가 읽어 결과물에 넣지 못하게 뺀다.
	const env = {
		...process.env,
		NEXT_PUBLIC_BASE_PATH: base,
		NEXT_TELEMETRY_DISABLED: "1",
	};
	for (const k of KEYS) delete env[k];
	console.log("복사본에 의존성 설치 중…");
	const install = run("pnpm", ["install", "--prefer-offline"], {
		cwd: work,
		env,
	});
	if (install.status !== 0) {
		console.error(
			`${install.stdout}${install.stderr}`
				.trim()
				.split("\n")
				.slice(-20)
				.join("\n"),
		);
		console.error("오류: pnpm install 실패");
		return 1;
	}
	console.log("정적 HTML 빌드 중…");
	const next = run("pnpm", ["exec", "next", "build"], {
		cwd: join(work, "apps/web"),
		env,
	});
	const log = `${next.stdout}${next.stderr}`;
	// varlock이 빌드 결과에서 비밀값을 찾으면 변수 이름만 알리고 빌드를 멈춘다
	const varlockLeaks = [
		...new Set(
			[...log.matchAll(/Config item key: ([A-Z0-9_]+)/g)].map((m) => m[1]),
		),
	];
	if (varlockLeaks.length) return leaked(varlockLeaks);
	if (next.status !== 0) {
		console.error(log.trim().split("\n").slice(-40).join("\n"));
		console.error(
			"오류: next build 실패. 화면만 프로젝트 규칙(prokit-ui)대로 동적 경로는 generateStaticParams, 서버 전용 API는 쓰지 않았는지 본다",
		);
		return 1;
	}

	const out = join(work, "apps/web/out");
	const leaks = findLeaks(out, secretValues(root));
	if (leaks.length) return leaked(leaks);
	if (!existsSync(join(out, "index.html"))) {
		console.error(
			"오류: 정적 결과에 첫 페이지(index.html)가 없다. html/은 만들지 않았다",
		);
		return 1;
	}
	const html = join(root, "html");
	rmSync(html, { recursive: true, force: true });
	cpSync(out, html, { recursive: true });
	// GitHub Pages의 Jekyll이 _next/ 폴더를 빼지 않게 한다
	writeFileSync(join(html, ".nojekyll"), "");

	const stale = staleRefs(html, base);
	if (stale.length)
		console.log(
			`경고: 지운 서버 경로를 부르는 부품이 화면에 남아 있다: ${stale.join(", ")}. 내보낸 사이트에서는 404가 난다. 화면만 프로젝트 규칙(prokit-ui)대로 화면에서 뺀다`,
		);
	const pages = files(html).filter((f) => f.endsWith(".html")).length;
	console.log(`html/: HTML ${pages}개${base ? ` (하위 경로 ${base})` : ""}`);
	console.log(
		base
			? `${base} 아래에 올릴 결과다. 내 컴퓨터에서 보려면 --base 없이 다시 내보낸 뒤 pnpm dlx serve html`
			: "보는 법: pnpm dlx serve html → 출력된 주소(기본 http://localhost:3000)",
	);
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
