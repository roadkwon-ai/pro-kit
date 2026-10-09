#!/usr/bin/env node
// 로컬 Vercel CLI로 develop(Preview 배포 + 고정 주소)과 production을 배포한다. `pnpm vercel:deploy`가 부른다.
// 프로젝트 연결, 환경변수 준비, 배포 전 DB 적용 순서는 prokit-deploy 스킬에 있다.
// 사용법: node scripts/vercel-deploy.mjs <develop|production> [--check]
//   develop     Preview로 배포하고, Preview 환경 BETTER_AUTH_URL의 호스트를 alias로 붙인다.
//   production  기본 브랜치(.dev-cycle.json defaultBranch)의 릴리스한 커밋(scripts/release.mjs)만 --prod로 배포한다.
//   --check     배포하지 않고 준비 상태와 지난 배포 이후 새 마이그레이션만 본다.
// exit: 0 정상, 1 준비 안 됨·사용법 오류, 2 배포·alias 실패
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// release.mjs와 한 쌍이다. 템플릿 갱신을 옮길 때 함께 옮긴다. import해도 실행되지 않는다(isMain).
import { githubRepo, NET_ENV, sh } from "./release.mjs";

const run = (cmd, args, opts = {}) =>
	spawnSync(cmd, args, {
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
		...opts,
	});
const json = (r) => {
	try {
		return JSON.parse(r.stdout);
	} catch {
		return null;
	}
};
const TARGETS = { develop: "preview", production: "production" };
const MIGRATIONS = "packages/db/src/migrations";
// vercel env run이 Vercel 값보다 먼저 쓰는 루트 파일(@next/env 개발 모드, CLI 60.1 소스)
const LOCAL_ENV_FILES = [
	".env",
	".env.local",
	".env.development",
	".env.development.local",
];

// apps/web/.env.schema에서 값이 비어 있는 변수는 배포 환경이 채워야 한다(@defaultRequired=true). 스키마가 없으면 null.
// 바로 위 주석 줄에 @optional(@optional=false는 필수)이나 @required=false가 있는 변수는 뺀다(아직 쓰지 않는 유료 API 키를 모든 환경에 넣게 하지 않는다).
// ponytail: 파일 머리의 @defaultRequired=false는 보지 않는다(BTS 스키마는 true).
export function requiredEnv(root) {
	const p = join(root, "apps/web/.env.schema");
	if (!existsSync(p)) return null;
	return [
		...readFileSync(p, "utf8").matchAll(
			/((?:^#.*\r?\n)*)^([A-Z][A-Z0-9_]*)=[ \t]*\r?$/gm,
		),
	]
		.filter(
			(m) =>
				!/@optional\b(?!\s*=\s*false\b)|@required\s*=\s*false\b/.test(m[1]),
		)
		.map((m) => m[2]);
}

export function main(argv, root = process.cwd()) {
	const [name, ...extra] = argv.filter((a) => !a.startsWith("-"));
	const env = TARGETS[name];
	// 모르는 플래그를 버리면 --chek 같은 오타가 검사 없는 실제 배포가 된다.
	if (
		!env ||
		extra.length ||
		argv.some((a) => a.startsWith("-") && a !== "--check")
	) {
		console.error("사용법: pnpm vercel:deploy <develop|production> [--check]");
		return 1;
	}
	const vercel = (args, opts) => run("vercel", args, { cwd: root, ...opts });
	const git = (...args) => run("git", args, { cwd: root });
	const gitOut = (...args) => git(...args).stdout?.trim() ?? "";
	// 토큰만 쓰는 환경(CI)은 VERCEL_ORG_ID와 VERCEL_PROJECT_ID가 연결을 대신한다(둘 다 있어야 한다. CLI도 둘 다 있으면 이 값을 먼저 쓴다).
	const envIds = process.env.VERCEL_ORG_ID && process.env.VERCEL_PROJECT_ID;
	const linked = envIds || existsSync(join(root, ".vercel/project.json"));
	// 연결한 기기거나 릴리스한 적이 있으면(production 배포가 있다) Vercel 프로젝트가 있다. 여기서 멈추면 Git 자동 배포도 모른다.
	// 릴리스 노트(release/)는 커밋되므로 태그를 받지 않은 clone(--depth, --no-tags)에도 남는다.
	const unsure =
		name === "production" &&
		(linked ||
			gitOut("ls-files", "release") ||
			gitOut("tag", "--list", "v[0-9]*"))
			? " (Git 자동 배포 여부도 확인하지 못했다)"
			: "";
	if (vercel(["--version"]).status !== 0) {
		console.error(
			`준비 안 됨: Vercel CLI 없음 → npm install -g vercel (또는 pnpm skills:setup --with-global)${unsure}`,
		);
		return 1;
	}
	if (!linked) {
		console.error(
			`준비 안 됨: Vercel 프로젝트에 연결되지 않았다(.vercel/project.json 없음) → prokit-deploy 스킬의 준비 절차${unsure}`,
		);
		return 1;
	}
	if (vercel(["whoami"]).status !== 0) {
		console.error(
			`준비 안 됨: Vercel 로그인 필요 → 사용자가 vercel login을 실행한다${unsure}`,
		);
		return 1;
	}

	const errors = [];
	// Vercel 프로젝트의 Git 연결이 배포를 만들면 기본 브랜치 push(릴리스 --publish 포함)가 곧 production 배포라
	// 이 스크립트의 검사와 "DB 먼저"를 거치지 않는다. vercel link --yes는 새 프로젝트를 만들 때 git 원격이 있으면
	// 묻지 않고 연결한다(CLI 60.1 소스, 실측). 확인하지 못해도 연결된 것으로 본다(prokit-dev-cycle 5절이 push하지 않는다).
	if (name === "production") {
		let ids = {
			projectId: process.env.VERCEL_PROJECT_ID,
			orgId: process.env.VERCEL_ORG_ID,
		};
		if (!envIds)
			try {
				ids =
					JSON.parse(
						readFileSync(join(root, ".vercel/project.json"), "utf8"),
					) ?? {};
			} catch {}
		const team = ids.orgId?.startsWith("team_") ? `?teamId=${ids.orgId}` : "";
		const project =
			ids.projectId &&
			json(vercel(["api", `/v9/projects/${ids.projectId}${team}`]));
		const link = project?.link;
		if (!project?.id)
			errors.push(
				"Git 자동 배포 여부를 확인하지 못했다(vercel api로 프로젝트를 읽지 못했다) → 네트워크, vercel whoami, 연결한 팀(scope)을 확인한다",
			);
		else if (
			link &&
			project.gitProviderOptions?.createDeployments !== "disabled"
		)
			errors.push(
				`Git 자동 배포가 켜져 있다(${link.type} ${[link.org ?? link.projectNamespace ?? link.owner, link.repo ?? link.projectName ?? link.slug].filter(Boolean).join("/")}: 기본 브랜치 push가 곧 production 배포다) → 사용자가 Git 연결을 요청하지 않았으면 vercel git disconnect --yes`,
			);
	}
	// vercel deploy는 .gitignore를 따르지 않는다. .vercelignore가 없으면 로컬 비밀값이 든 apps/web/.env가 올라간다.
	const ignorePath = join(root, ".vercelignore");
	if (
		!existsSync(ignorePath) ||
		!/^\.env\r?$/m.test(readFileSync(ignorePath, "utf8"))
	)
		errors.push(
			".vercelignore에 `.env` 줄이 없다(로컬 .env가 배포 소스에 올라간다) → 템플릿의 files/.vercelignore를 옮긴다",
		);
	// CLI 배포는 git 커밋이 아니라 작업 트리를 올린다. 커밋하지 않은 변경이 배포에 섞이지 않게 한다.
	if (gitOut("status", "--porcelain"))
		errors.push(
			"커밋하지 않은 변경이 있다(CLI 배포는 작업 트리를 그대로 올린다)",
		);
	const branch = gitOut("branch", "--show-current");
	let defaultBranch = "main";
	const cfgPath = join(root, ".dev-cycle.json");
	if (existsSync(cfgPath)) {
		try {
			defaultBranch =
				JSON.parse(readFileSync(cfgPath, "utf8")).defaultBranch || "main";
		} catch (e) {
			errors.push(`.dev-cycle.json을 읽지 못했다: ${e.message}`);
		}
	}
	if (name === "production" && branch !== defaultBranch)
		errors.push(
			`production은 기본 브랜치(${defaultBranch})에서만 배포한다 (현재 ${branch || "detached HEAD"})`,
		);
	// production은 릴리스한 커밋만 배포한다. 배포마다 release/ 노트, 버전 태그, GitHub Release가 남는다(scripts/release.mjs).
	let release = "";
	if (name === "production") {
		release = gitOut(
			"tag",
			"--points-at",
			"HEAD",
			"--list",
			"v[0-9]*",
			"--sort=-v:refname",
		).split("\n")[0];
		const repo = githubRepo(gitOut("config", "--get", "remote.origin.url"));
		if (!release)
			errors.push(
				"HEAD에 릴리스 태그(vX.Y.Z)가 없다(production은 릴리스한 커밋만 배포한다) → prokit-deploy 스킬의 릴리스 절(pnpm release)",
			);
		else if (!repo)
			errors.push(
				"origin이 GitHub 저장소가 아니다(릴리스를 확인할 수 없다) → prokit-deploy 스킬의 준비 절",
			);
		else {
			// 로컬 태그 이름만 믿지 않는다. origin의 태그가 HEAD를 가리켜야 push한 릴리스다(annotated 태그는 ^{} 줄이 커밋이다).
			const ref = `refs/tags/${release}`;
			const r = run(
				"git",
				["ls-remote", "--tags", "origin", ref, `${ref}^{}`],
				{
					cwd: root,
					env: NET_ENV,
					timeout: 30000,
				},
			);
			const lines = (r.stdout ?? "").trim().split("\n").filter(Boolean);
			const remote = (lines.find((l) => l.endsWith("^{}")) ?? lines[0])?.split(
				"\t",
			)[0];
			const title = gitOut(
				"tag",
				"-l",
				"--format=%(contents:subject)",
				release,
			);
			const note = gitOut(
				"grep",
				"-l",
				`^# ${release} — `,
				"HEAD",
				"--",
				"release/",
			)
				.split("\n")[0]
				.replace(/^HEAD:/, "");
			if (r.status !== 0)
				errors.push(
					`origin의 태그 ${release}를 확인하지 못했다(네트워크, 권한) → git ls-remote --tags origin ${release}`,
				);
			else if (remote !== gitOut("rev-parse", "HEAD"))
				errors.push(
					`origin의 태그 ${release}가 HEAD를 가리키지 않는다(push하지 않았거나 태그가 옮겨졌다) → pnpm release --publish로 발행한 커밋에서 배포한다`,
				);
			// -R: 원격이 여럿이면 gh가 origin이 아닌 upstream 등을 고를 수 있다.
			else if (
				run(
					"gh",
					["release", "view", release, "-R", repo, "--json", "tagName"],
					{
						cwd: root,
					},
				).status !== 0
			)
				errors.push(
					`GitHub Release ${release}를 확인하지 못했다(gh 없음, 로그인 안 됨, Release 없음) → gh auth status로 확인하고, Release가 없으면 tail -n +2 ${sh(note || `release/<${release} 노트>`)} | gh ${["release", "create", release, "-R", repo, "--verify-tag", "--title", title, "--notes-file", "-"].map(sh).join(" ")}`,
				);
		}
	}

	const required = requiredEnv(root);
	if (!required)
		errors.push("apps/web/.env.schema가 없어 필수 환경변수를 검사할 수 없다");
	const envs = json(vercel(["env", "ls", env, "--format", "json"]))?.envs;
	// 브랜치 전용 Preview 변수는 브랜치를 지정하지 않은 이 배포에 쓰이지 않으므로 세지 않는다.
	const have = envs?.filter((e) => !e.gitBranch).map((e) => e.key);
	if (!have) errors.push(`${env} 환경변수 목록을 읽지 못했다`);
	// BETTER_AUTH_URL은 스키마와 상관없이 이 스크립트가 주소로 쓴다.
	const missing = have
		? [...new Set(["BETTER_AUTH_URL", ...(required ?? [])])].filter(
				(k) => !have.includes(k),
			)
		: [];
	if (missing.length)
		errors.push(
			`${env} 환경변수 없음: ${missing.join(", ")} → prokit-deploy 스킬의 환경변수 절`,
		);

	// 배포 주소의 정본은 그 환경의 BETTER_AUTH_URL이다(Better Auth가 이 origin만 신뢰한다). config 형식이어야 읽힌다.
	// vercel env run은 비밀값을 넘기지 않고 파일도 남기지 않지만, 루트 .env 파일과 실행 환경의 값이 Vercel 값보다 먼저다.
	for (const f of LOCAL_ENV_FILES) {
		const p = join(root, f);
		if (
			existsSync(p) &&
			/^\s*(export\s+)?BETTER_AUTH_URL\s*=/m.test(readFileSync(p, "utf8"))
		)
			errors.push(
				`루트 ${f}에 BETTER_AUTH_URL이 있다(Vercel 값 대신 읽힌다) → 루트에서 지운다(앱 값은 apps/web/.env)`,
			);
	}
	const { BETTER_AUTH_URL: _local, ...cleanEnv } = process.env;
	const authUrl = (target) => {
		const r = vercel(
			[
				"env",
				"run",
				"-e",
				target,
				"--",
				process.execPath,
				"-p",
				"process.env.BETTER_AUTH_URL || ''",
			],
			{ env: cleanEnv },
		);
		if (r.status !== 0)
			return {
				error: `${target} 환경변수를 읽지 못했다(vercel env run exit ${r.status})`,
			};
		const url = r.stdout.trim().split("\n").pop() ?? "";
		try {
			return { url, host: new URL(url).host };
		} catch {
			return {
				error: `${target} BETTER_AUTH_URL을 읽지 못했다 → 비밀이 아닌 config로 다시 넣는다(vercel env add BETTER_AUTH_URL ${target} --value <주소> --type config --force)`,
			};
		}
	};
	let url = "";
	let host = "";
	if (have?.includes("BETTER_AUTH_URL")) {
		const a = authUrl(env);
		if (a.error) errors.push(a.error);
		else ({ url, host } = a);
		// 두 주소가 같으면 develop alias가 운영 도메인을 Preview 배포(Preview DB)로 바꾼다.
		if (name === "develop" && host && authUrl("production").host === host)
			errors.push(
				`Preview BETTER_AUTH_URL이 production과 같다(${host}) → develop 고정 주소를 따로 둔다`,
			);
	}

	// 지난 배포: 그 주소가 지금 가리키는 배포. 새 마이그레이션은 그 커밋과 HEAD 사이에서 센다.
	const ls = (target, ...opts) =>
		json(
			vercel([
				"ls",
				"--environment",
				target,
				"--format",
				"json",
				"--limit",
				"100",
				...opts,
			]),
		)?.deployments ?? [];
	const prevUrl = host
		? json(vercel(["inspect", host, "--format", "json"]))?.url
		: undefined;
	const prevSha =
		prevUrl && ls(env).find((d) => d.url === prevUrl)?.meta?.gitCommitSha;
	// Vercel은 프로젝트의 첫 배포를 --prod 없이도 production으로 만든다. develop이 운영 환경변수로 올라가지 않게 막는다.
	if (
		name === "develop" &&
		have &&
		!ls("production", "--status", "READY").length
	)
		errors.push(
			"production 배포가 아직 없다(Vercel은 첫 배포를 production으로 만든다) → production을 먼저 배포한다",
		);

	let migrations =
		"지난 배포 기록 없음 → 대상 DB에 마이그레이션 전체를 적용한다";
	if (prevSha) {
		const short = prevSha.slice(0, 7);
		if (git("cat-file", "-e", `${prevSha}^{commit}`).status !== 0) {
			// 다른 사람이 배포한 커밋을 아직 받지 않았다.
			const m = `지난 배포 커밋 ${short}이 로컬에 없다 → git fetch 뒤 다시 확인한다`;
			if (name === "production") errors.push(m);
			else migrations = m;
		} else {
			const ancestor =
				git("merge-base", "--is-ancestor", prevSha, "HEAD").status === 0;
			// 조상이 아닌 커밋을 production에 올리면 운영 코드가 과거나 다른 갈래로 바뀐다.
			if (!ancestor && name === "production")
				errors.push(
					`지난 production 배포 커밋(${short})이 HEAD의 조상이 아니다 → 기본 브랜치를 최신으로 맞춘 뒤 배포한다`,
				);
			// 새로 생긴 마이그레이션 폴더만 센다. -z는 한글 이름을 따옴표로 감싸지 않고 그대로 준다.
			// --no-renames: 비슷한 파일(drizzle snapshot.json 등)이 지워진 폴더에서 옮겨 온 것으로 잡혀 빠지지 않게 한다.
			const dirs = [
				...new Set(
					gitOut(
						"diff",
						"-z",
						"--name-only",
						"--no-renames",
						"--diff-filter=A",
						prevSha,
						"HEAD",
						"--",
						MIGRATIONS,
					)
						.split("\0")
						.filter(Boolean)
						.map(
							(f) =>
								dirname(f)
									.slice(MIGRATIONS.length + 1)
									.split("/")[0],
						)
						.filter(Boolean), // 폴더 바로 아래 파일(.gitkeep 등)은 마이그레이션이 아니다
				),
			];
			migrations = `지난 배포(${short}) 이후 새 마이그레이션 ${dirs.length}개${dirs.length ? `: ${dirs.join(", ")}` : ""}${ancestor ? "" : " (지난 배포가 HEAD의 조상이 아니다: 대상 DB에 다른 브랜치의 마이그레이션이 있을 수 있다)"}`;
		}
	}

	const sha = gitOut("rev-parse", "--short", "HEAD");
	if (errors.length) {
		for (const e of errors) console.error(`준비 안 됨: ${e}`);
		return 1;
	}
	const summary = `${name} → ${url} (Vercel ${env}, 브랜치 ${branch}, 커밋 ${sha}${release ? `, 릴리스 ${release}` : ""})`;
	if (argv.includes("--check")) {
		console.log(`준비됨: ${summary}\n${migrations}`);
		return 0;
	}

	console.log(`배포: ${summary}`);
	const d = vercel(
		[
			"deploy",
			"--yes",
			"--format",
			"json",
			...(name === "production" ? ["--prod"] : []),
		],
		{ stdio: ["ignore", "pipe", "inherit"] },
	);
	const dep = json(d)?.deployment;
	if (d.status !== 0 || !dep?.url) {
		console.error(
			`배포 실패 → 빌드 로그: vercel inspect ${dep?.url ?? "<배포 URL>"} --logs`,
		);
		return 2;
	}
	// Vercel은 Preview 배포의 target을 null로 돌려준다(CLI 60.1 실측).
	if ((dep.target ?? "preview") !== env) {
		console.error(
			`배포 대상이 다르다: ${dep.target} (기대 ${env}) → vercel inspect ${dep.url}로 확인하고, production이 바뀌었으면 vercel rollback으로 되돌린다`,
		);
		return 2;
	}
	if (name === "develop") {
		const a = vercel(["alias", "set", dep.url, host], { stdio: "inherit" });
		if (a.status !== 0) {
			console.error(
				`alias 실패: ${host} → 다른 계정이 쓰는 이름이면 Preview BETTER_AUTH_URL을 다른 주소로 바꾼다`,
			);
			return 2;
		}
	}
	// 주소가 새 배포를 가리키는지 본다. Preview 배포의 inspect에는 수동 alias가 나오지 않으므로(aliases: null) 주소 쪽을 inspect한다.
	const now = json(vercel(["inspect", host, "--format", "json"]))?.url;
	if (now !== dep.url.replace(/^https:\/\//, ""))
		console.error(
			`경고: ${host}가 이 배포를 가리키지 않는다(지금 ${now ?? "없음"}) → 로그인이 실패한다. BETTER_AUTH_URL을 실제 주소로 고친다${name === "production" ? `. 되돌리기(rollback) 뒤라면 vercel promote ${dep.url}로 운영 주소를 옮긴다` : ""}`,
		);
	const back = prevUrl
		? name === "production"
			? `vercel rollback ${prevUrl}`
			: `vercel alias set ${prevUrl} ${host}`
		: "이전 배포 없음";
	console.log(
		[`배포 URL: ${dep.url}`, `주소: ${url}`, `되돌리기: ${back}`].join("\n"),
	);
	return 0;
}

// 실재 경로로 비교한다. 심볼릭 링크 경로(macOS /tmp 등)로 실행하면 argv와 import.meta.url이 달라진다.
const isMain = () => {
	try {
		return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
	} catch {
		return false;
	}
};
if (isMain()) process.exitCode = main(process.argv.slice(2));
