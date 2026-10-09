#!/usr/bin/env node
// skills.manifest.json대로 에이전트 스킬·플러그인을 이 프로젝트 scope에 설치한다. install.sh와 `pnpm skills:setup`이 부른다.
// 사용법: node scripts/skills-setup.mjs [--check] [--with-global] [--optional <묶음>[,<묶음>]]
//   --check        설치하지 않고 상태만 본다. 프로젝트 scope 항목이 빠졌으면 exit 1.
//   --with-global  check가 실패한 전역 도구(manifest.global)를 먼저 설치한다.
//                  auto: true인 전역 도구는 이 플래그 없이도 없으면 설치한다(실패는 경고로만 알린다).
//   --optional     기본으로 설치하지 않는 선택 스킬 묶음(manifest.optional)도 설치한다. --check와 쓰면 그 묶음도 검사한다.
// exit: 0 정상, 1 --check 누락, 2 설치 실패나 모르는 묶음
//
// 사용법: node scripts/skills-setup.mjs --update [<이름>...] [--check | --if-due | --snooze | --mode ask|auto|off]
//   설치한 외부 스킬을 GitHub 원본 폴더와 파일 단위로 비교해 바뀐 스킬과 빠진 스킬만 다시 설치한다(`pnpm skills:update`).
//   <이름>을 주면 그 스킬만 다시 설치한다. .md가 아닌 파일이 바뀐 스킬은 알림 방식이 auto여도 묻고(mode=ask),
//   --check로 원격 파일을 검토한 뒤 이름을 지정해야 설치한다. 원격이 검토한 판과 다르면 설치하지 않는다(exit 2).
//   --check   확인만 한다. exit 1: 업데이트·빠짐·원격에서 없어짐, 2: 설치 실패나 실행 오류, 3: 확인 실패
//   --if-due  하루에 한 번만 확인하고 알릴 것이 있을 때만 출력한다(pnpm dev-cycle status가 부른다). 설치하지 않는다.
//   --snooze  지금 알림을 미룬다(24시간 → 48시간 → 7일). --mode는 알림 방식(ask 기본, auto, off)을 정한다.
//   확인 결과와 설정은 이 기기의 node_modules/.cache/skills-update.json에만 둔다.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	realpathSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const run = (cmd, args, opts = {}) =>
	spawnSync(cmd, args, { encoding: "utf8", ...opts });
const sh = (script, opts) => run("sh", ["-c", script], opts);
const onPath = (cmd) => sh(`command -v ${cmd}`).status === 0;
const firstLine = (r) =>
	`${r.stderr ?? ""}${r.stdout ?? ""}`.trim().split("\n")[0] ||
	(r.error ? r.error.message : `exit ${r.status}`);
// OMX 프로젝트 설정은 기기마다 한다(.codex/config.toml·hooks.json은 git이 무시). 이 파일이 그 흔적이다.
const OMX_MARK = ".omx/setup-scope.json";

const addSkills = (root, cli, e, names) =>
	run(
		"npx",
		[
			"-y",
			cli,
			"add",
			e.source,
			"--skill",
			...names,
			"--agent",
			...e.agents,
			"-y",
		],
		{ cwd: root, stdio: "inherit", env: { ...process.env, CI: "true" } },
	);

export function missingSkills(root, entry) {
	return entry.skills.filter(
		(s) =>
			!existsSync(join(root, ".agents/skills", s, "SKILL.md")) ||
			(entry.agents.includes("claude-code") &&
				!existsSync(join(root, ".claude/skills", s, "SKILL.md"))),
	);
}

// 없는 선언만 더한다. 사용자가 false로 끈 플러그인과 다른 키는 그대로 둔다. 추가한 항목과 병합 결과를 돌려준다.
// marketplaces 값은 settings의 source 객체 그대로다({source:"github",repo} 또는 {source:"git",url}).
export function mergeClaudeSettings(root, claude, { write = true } = {}) {
	const p = join(root, ".claude/settings.json");
	const cur = existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {};
	const added = [];
	cur.extraKnownMarketplaces ??= {};
	for (const [name, source] of Object.entries(claude.marketplaces)) {
		if (cur.extraKnownMarketplaces[name]) continue;
		cur.extraKnownMarketplaces[name] = { source };
		added.push(`marketplace ${name}`);
	}
	cur.enabledPlugins ??= {};
	for (const plugin of claude.plugins) {
		if (plugin in cur.enabledPlugins) continue;
		cur.enabledPlugins[plugin] = true;
		added.push(plugin);
	}
	if (write && added.length) {
		mkdirSync(dirname(p), { recursive: true });
		writeFileSync(p, `${JSON.stringify(cur, null, 2)}\n`);
	}
	return { added, settings: cur };
}

// mode: "check"는 설치하지 않는다. "auto"는 auto: true인 도구만, "all"(--with-global)은 install이 있는 도구를 모두 설치한다.
function installGlobal(manifest, mode, failures, warnings) {
	const lines = [];
	for (const g of manifest.global) {
		let ok = sh(g.check).status === 0;
		if (!ok && g.install && (mode === "all" || (mode === "auto" && g.auto))) {
			console.log(`전역 설치: ${g.name} → ${g.install}`);
			const r = sh(g.install, { stdio: "inherit" });
			ok = r.status === 0 && sh(g.check).status === 0;
			// 기본 실행의 자동 설치는 없어도 dev-cycle이 진행되는 도구라, 실패해도 설치 전체를 멈추지 않는다.
			if (!ok) (mode === "all" ? failures : warnings).push(`전역 ${g.name}`);
		}
		lines.push(
			ok ? `${g.name} 있음` : `${g.name} 없음 → ${g.hint ?? g.install}`,
		);
	}
	return lines;
}

export function main(argv, root = process.cwd(), platform = process.platform) {
	// sh, 심볼릭 링크, npx·claude 실행 파일을 전제한다. Windows 셸에서는 npx.cmd를 띄우지 못해 설치가 엉뚱하게 실패한다.
	if (platform === "win32") {
		console.error("Windows에서는 WSL2(Ubuntu) 안에서 실행한다");
		return 2;
	}
	const check = argv.includes("--check");
	const withGlobal = argv.includes("--with-global");
	const manifest = JSON.parse(
		readFileSync(join(root, "skills.manifest.json"), "utf8"),
	);
	const optional = manifest.optional ?? {};
	const at = argv.indexOf("--optional");
	const picked = at < 0 ? [] : (argv[at + 1] ?? "").split(",").filter(Boolean);
	if (at >= 0 && (!picked.length || picked.some((g) => !(g in optional)))) {
		const groups = Object.entries(optional).map(
			([k, v]) => `${k}(${v.description})`,
		);
		console.error(
			`사용법: --optional <묶음>[,<묶음>]. 묶음: ${groups.join(", ") || "없음"}`,
		);
		return 2;
	}
	const entries = [
		...manifest.skills,
		...picked.flatMap((g) => optional[g].skills),
	];
	const failures = [];
	const warnings = [];
	const missing = [];
	const out = [];

	const globals = installGlobal(
		manifest,
		check ? "check" : withGlobal ? "all" : "auto",
		failures,
		warnings,
	);

	let installed = 0;
	for (const e of entries) {
		const miss = missingSkills(root, e);
		if (!miss.length) continue;
		if (check) {
			missing.push(`${e.source}: ${miss.join(", ")}`);
			continue;
		}
		const r = addSkills(root, manifest.skillsCli, e, miss);
		const still = missingSkills(root, e);
		installed += miss.length - still.length;
		if (r.status !== 0 || still.length)
			failures.push(
				`${e.source}${still.length ? ` (없음: ${still.join(", ")})` : ""}`,
			);
	}
	const total = entries.reduce((n, e) => n + e.skills.length, 0);
	out.push(
		check
			? `스킬(프로젝트): ${total}개 중 ${missing.length ? `누락 — ${missing.join("; ")}` : "모두 있음"}`
			: `스킬(프로젝트): ${total}개, 이번에 설치 ${installed}개 (skills-lock.json)`,
	);
	// 선택 묶음은 없어도 누락으로 세지 않는다. 상태만 보여 준다.
	const states = Object.entries(optional).map(([k, v]) => {
		const n = v.skills.reduce((s, e) => s + e.skills.length, 0);
		const have =
			n - v.skills.reduce((s, e) => s + missingSkills(root, e).length, 0);
		return `${k} ${have === n ? "있음" : have ? `일부(${have}/${n})` : "설치 안 함"}`;
	});
	if (states.length)
		out.push(
			`선택 스킬: ${states.join(", ")} (설치: pnpm skills:setup --optional <묶음>)`,
		);

	try {
		const { added, settings } = mergeClaudeSettings(root, manifest.claude, {
			write: !check,
		});
		if (check && added.length)
			missing.push(`.claude/settings.json: ${added.join(", ")}`);
		let line = `Claude 플러그인(project): .claude/settings.json ${check ? (added.length ? `선언 누락 ${added.join(", ")}` : "선언 있음") : added.length ? `선언 추가 ${added.join(", ")}` : "선언 변화 없음"}`;
		if (!check) {
			if (onPath("claude")) {
				const bad = [];
				// 이미 등록된 마켓플레이스는 다시 등록하지 않는다. 다른 형식으로 다시 등록하면 사용자 전역 source가 바뀐다.
				let known = [];
				try {
					known = JSON.parse(
						run("claude", ["plugin", "marketplace", "list", "--json"], {
							cwd: root,
						}).stdout,
					).map((m) => m.name);
				} catch {}
				for (const name of Object.keys(manifest.claude.marketplaces)) {
					// 등록된 마켓플레이스는 받아 둔 목록이 오래됐을 수 있다. 최신으로 받은 뒤 설치해야 플러그인도 최신판이 된다.
					if (known.includes(name)) {
						const r = run("claude", ["plugin", "marketplace", "update", name], {
							cwd: root,
						});
						if (r.status !== 0)
							bad.push(`marketplace ${name} 갱신: ${firstLine(r)}`);
						continue;
					}
					// 프로젝트 선언(사용자가 바꿨으면 그 값)대로 등록한다. github이면 owner/repo.
					const src = settings.extraKnownMarketplaces[name].source;
					const arg = src.repo ?? src.url ?? src.path;
					const r = run(
						"claude",
						["plugin", "marketplace", "add", arg, "--scope", "project"],
						{ cwd: root },
					);
					if (r.status !== 0) bad.push(`marketplace ${arg}: ${firstLine(r)}`);
				}
				for (const plugin of manifest.claude.plugins) {
					// 사용자가 false로 끈 플러그인은 설치하지 않는다. install이 enabledPlugins를 true로 되돌린다.
					if (settings.enabledPlugins[plugin] === false) continue;
					const r = run(
						"claude",
						["plugin", "install", plugin, "--scope", "project"],
						{ cwd: root },
					);
					if (r.status !== 0) bad.push(`${plugin}: ${firstLine(r)}`);
				}
				failures.push(...bad.map((b) => `Claude 플러그인 ${b}`));
				line += bad.length ? `, 설치 실패 ${bad.length}건` : ", 설치 완료";
			} else {
				line +=
					", claude 없음 → Claude Code에서 프로젝트를 신뢰하면 플러그인 설치를 묻는다";
			}
		}
		out.push(line);
	} catch (e) {
		const msg = `.claude/settings.json을 읽을 수 없다: ${e.message}`;
		(check ? missing : failures).push(msg);
		out.push(`Claude 플러그인(project): ${msg}`);
	}

	if (manifest.omx) {
		const done = () => existsSync(join(root, OMX_MARK));
		if (check) {
			// omx가 없는 기기(Claude만 쓰는 개발자)는 누락으로 세지 않는다.
			if (done()) out.push("OMX(project): 설정됨");
			else if (onPath("omx")) {
				missing.push(`OMX 프로젝트 설정 없음 (${OMX_MARK})`);
				out.push("OMX(project): 설정 안 됨 → pnpm skills:setup");
			} else {
				out.push(
					"OMX(project): omx 없음 → Codex를 쓰면 npm install -g oh-my-codex 뒤 pnpm skills:setup",
				);
			}
		} else if (onPath("omx")) {
			const r = run("omx", manifest.omx, { cwd: root });
			if (r.status !== 0 || !done()) failures.push(`OMX: ${firstLine(r)}`);
			out.push(
				`OMX(project): omx ${manifest.omx.join(" ")} → ${r.status === 0 ? "완료" : "실패"}`,
			);
		} else {
			out.push(
				"OMX(project): omx 없음 → npm install -g oh-my-codex 뒤 pnpm skills:setup (또는 --with-global)",
			);
		}
	}

	out.push(`전역 도구: ${globals.join(", ") || "없음"}`);
	if (warnings.length)
		out.push(
			`경고: ${warnings.join("; ")} 설치 실패 → 위 출력을 보고 직접 설치한다 (없어도 dev-cycle은 진행된다)`,
		);
	if (failures.length) out.push(`실패: ${failures.join("; ")}`);
	if (check && missing.length) out.push(`누락: ${missing.join("; ")}`);
	console.log(out.join("\n"));
	if (failures.length) return 2;
	return check && missing.length ? 1 : 0;
}

const STATE = "node_modules/.cache/skills-update.json";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const SNOOZE = [
	[DAY, "24시간"],
	[2 * DAY, "48시간"],
	[7 * DAY, "7일"],
];
// skills CLI가 복사하지 않는 것(metadata.json, .git 등)은 양쪽 모두 비교하지 않는다.
// 로컬에 생긴 것(파이썬 __pycache__, 다른 도구가 남긴 metadata.json)도 스킬 내용이 아니다.
const NOT_COPIED = new Set([".git", "__pycache__", "__pypackages__"]);
const notCopied = (rel) => {
	const parts = rel.split("/");
	return (
		parts.at(-1) === "metadata.json" ||
		parts.slice(0, -1).some((d) => NOT_COPIED.has(d))
	);
};
const gitBlob = (buf) =>
	createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");

function localFiles(dir, base = dir, out = new Map()) {
	for (const e of readdirSync(dir, { withFileTypes: true })) {
		const p = join(dir, e.name);
		if (e.isDirectory()) localFiles(p, base, out);
		else if (e.isFile())
			out.set(relative(base, p).split(sep).join("/"), gitBlob(readFileSync(p)));
	}
	return out;
}

// tree: GitHub git/trees 응답의 tree. skillPath: lock에 적힌 SKILL.md 경로.
// 돌려주는 값: 원격 스킬 폴더 {folder, files: 상대 경로 → blob sha, links, pin}. 원격에 그 스킬이 없으면 null.
// 폴더를 옮겼거나 lock에 경로가 없으면 이름으로 찾는다(다시 설치하면 새 경로로 받는다).
export function remoteSkill(tree, skillPath, name) {
	const blobs = tree.filter((t) => t.type === "blob");
	const byName = blobs.filter((t) =>
		`/${t.path}`.endsWith(`/${name}/SKILL.md`),
	);
	const path = blobs.some((t) => t.path === skillPath)
		? skillPath
		: byName[0]?.path;
	if (!path) return null;
	const folder = dirname(path);
	const prefix = folder === "." ? "" : `${folder}/`;
	const inside = blobs.filter((t) => t.path.startsWith(prefix));
	const files = new Map();
	const links = [];
	for (const t of inside) {
		const rel = t.path.slice(prefix.length);
		if (notCopied(rel)) continue;
		// 설치는 심볼릭 링크를 따라가 복사하므로 링크 자리(디렉터리 링크면 그 아래)는 비교하지 않는다.
		if (t.mode === "120000") links.push(rel);
		else files.set(rel, t.sha);
	}
	// 검토 고정값: 폴더의 원격 파일 전체를 한 값으로 줄인다. 무엇이든 바뀌면 달라진다.
	// 이름으로 찾았는데 후보가 여럿이면 skills CLI가 어느 폴더를 설치할지 모르므로 고정값을 두지 않는다.
	// ponytail: 폴더 밖을 가리키는 링크의 대상은 고정값에 들어가지 않는다.
	const pin =
		path !== skillPath && byName.length > 1
			? null
			: createHash("sha1")
					.update(JSON.stringify(inside.map((t) => [t.path, t.sha])))
					.digest("hex")
					.slice(0, 12);
	return { folder, files, links, pin };
}

// local: 설치본의 {상대 경로 → git blob sha}. 돌려주는 값: 원격과 다른 파일의 상대 경로 목록(같으면 빈 목록).
export function changedFiles(remote, local) {
	const changed = [...remote.files]
		.filter(([rel, sha]) => local.get(rel) !== sha)
		.map(([rel]) => rel);
	for (const rel of local.keys()) {
		if (remote.files.has(rel) || notCopied(rel)) continue;
		if (remote.links.some((l) => rel === l || rel.startsWith(`${l}/`)))
			continue;
		// 로컬에만 있는 숨김 파일(.DS_Store, 도구가 만든 .omc/ 등)은 스킬 내용이 아니다.
		if (rel.split("/").some((s) => s.startsWith("."))) continue;
		changed.push(rel);
	}
	// 링크 대상은 비교하지 못한다. 다른 것이 바뀌면 링크 자리도 바뀐 것으로 본다(대상이 스크립트일 수 있다).
	// ponytail: 링크 대상만 바뀌면 놓친다. 링크 blob을 받아 대상 경로를 풀면 잡을 수 있다.
	return changed.length ? [...changed, ...remote.links] : changed;
}
// .md가 아닌 파일(스크립트, 설정)이 바뀐 스킬은 설치 전에 원격 내용을 본다. impeccable처럼
// 훅이 스킬 폴더의 스크립트를 바로 실행하면, 설치한 뒤 diff를 보면 이미 늦다.
const scripted = (i) => i.files?.some((f) => !f.endsWith(".md"));

// 저장소가 없으면(404: 지웠거나 비공개로 바꿨다) null을 돌려준다.
async function fetchTree(source, fetch, token) {
	const get = (auth) =>
		fetch(`https://api.github.com/repos/${source}/git/trees/HEAD?recursive=1`, {
			headers: {
				Accept: "application/vnd.github+json",
				"User-Agent": "prokit-skills-update",
				...(auth && { Authorization: `Bearer ${auth}` }),
			},
			signal: AbortSignal.timeout(20_000),
		});
	let body;
	try {
		let r = await get(token);
		// 만료된 토큰이면 공개 저장소는 토큰 없이 다시 읽는다.
		if (token && r.status === 401) r = await get();
		if (r.status === 404) return null;
		if (!r.ok) {
			const limit = r.headers.get("x-ratelimit-remaining") === "0";
			throw new Error(
				`GitHub ${r.status}${limit ? " (API 한도 초과, gh auth login이면 한도가 늘어난다)" : ""}`,
			);
		}
		body = await r.json();
	} catch (e) {
		throw new Error(`${source}: ${e.message}`);
	}
	// ponytail: 한 번에 받는 트리(10만 항목)가 잘리면 확인 실패로 둔다. 필요해지면 폴더별 트리로 나눈다.
	if (body.truncated) throw new Error(`${source}: 트리가 커서 잘렸다`);
	return body.tree;
}

// 매니페스트 기본 스킬 전부와, 선택 묶음 중 설치한 스킬을 원격과 비교한다.
// 확인하지 못한 저장소는 failed에 담고, 나머지 저장소 결과는 그대로 돌려준다.
export async function findUpdates(root, manifest, { fetch, token }) {
	const optional = Object.values(manifest.optional ?? {})
		.flatMap((o) => o.skills)
		.map((e) => ({
			...e,
			skills: e.skills.filter((s) =>
				existsSync(join(root, ".agents/skills", s, "SKILL.md")),
			),
		}));
	const entries = [...manifest.skills, ...optional].filter(
		(e) => e.skills.length,
	);
	const lockPath = join(root, "skills-lock.json");
	const lock = existsSync(lockPath)
		? (JSON.parse(readFileSync(lockPath, "utf8")).skills ?? {})
		: {};
	const trees = new Map();
	for (const e of entries)
		if (!trees.has(e.source))
			trees.set(
				e.source,
				fetchTree(e.source, fetch, token).catch((err) => err),
			);
	const items = [];
	const failed = [];
	for (const e of entries) {
		const tree = await trees.get(e.source);
		if (tree instanceof Error) {
			if (!failed.includes(tree.message)) failed.push(tree.message);
			continue;
		}
		const miss = missingSkills(root, e);
		for (const name of e.skills) {
			const remote = tree && remoteSkill(tree, lock[name]?.skillPath, name);
			const dir = join(root, ".agents/skills", name);
			// 폴더가 없으면 원격 파일이 모두 새 파일이다.
			const files =
				remote &&
				changedFiles(remote, existsSync(dir) ? localFiles(dir) : new Map());
			const state = !remote
				? "gone"
				: miss.includes(name)
					? "missing"
					: files.length
						? "outdated"
						: "ok";
			items.push({ e, name, state, files, remote, installed: existsSync(dir) });
		}
	}
	return { items, failed };
}

// 토큰이 없으면 GitHub API를 시간당 60회까지 쓴다(한 번 확인에 저장소 수만큼). gh는 GH_TOKEN도 따른다.
const ghToken = () =>
	(onPath("gh") &&
		run("gh", ["auth", "token", "--hostname", "github.com"]).stdout?.trim()) ||
	undefined;

const names = (items, ...states) =>
	items.filter((i) => states.includes(i.state)).map((i) => i.name);
const NEXT = " → 라운드를 열기 전에 prokit-skills-update 스킬 1절을 따른다";
const UPDATE_FLAGS = ["--update", "--check", "--if-due", "--snooze", "--mode"];
const pending = (i) => ["outdated", "missing"].includes(i.state);

// exit: 0 모두 최신, 1 업데이트·빠짐·원격에서 없어짐이 남음, 2 설치 실패나 실행 오류, 3 확인 실패(설치는 끝났을 수 있다)
export async function update(args, root = process.cwd(), deps = {}) {
	// pnpm skills:update -- --check처럼 넘겨도 같다.
	const argv = args.filter((a) => a !== "--");
	const {
		fetch = globalThis.fetch,
		now = Date.now(),
		add = addSkills,
		platform = process.platform,
	} = deps;
	// gh 실행은 실제로 원격을 볼 때만 한다(--if-due는 대부분 캐시만 본다).
	const token = () => deps.token ?? ghToken();
	if (platform === "win32") {
		console.error("Windows에서는 WSL2(Ubuntu) 안에서 실행한다");
		return 2;
	}
	// 모르는 옵션을 버리면 --chek 같은 오타가 검토 없는 설치가 된다.
	const wrong = argv.filter(
		(a) => a.startsWith("-") && !UPDATE_FLAGS.includes(a),
	);
	if (wrong.length) {
		console.error(
			`모르는 옵션: ${wrong.join(" ")} → pnpm skills:update [<이름>...] [--check | --if-due | --snooze | --mode ask|auto|off]`,
		);
		return 2;
	}
	const statePath = join(root, STATE);
	let state = {};
	try {
		state = JSON.parse(readFileSync(statePath, "utf8"));
	} catch {}
	const save = () => {
		mkdirSync(dirname(statePath), { recursive: true });
		writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
	};
	const at = argv.indexOf("--mode");
	if (at >= 0) {
		const mode = argv[at + 1];
		if (!["ask", "auto", "off"].includes(mode)) {
			console.error("사용법: --mode ask|auto|off");
			return 2;
		}
		state.mode = mode;
		save();
		console.log(`스킬 업데이트 알림: ${mode}`);
		return 0;
	}
	if (argv.includes("--snooze")) {
		const level =
			state.snooze && state.snooze.key === state.key
				? Math.min(state.snooze.level + 1, SNOOZE.length)
				: 1;
		const [ms, label] = SNOOZE[level - 1];
		state.snooze = { key: state.key, level, until: now + ms };
		save();
		console.log(`스킬 업데이트 알림을 ${label} 미룬다`);
		return 0;
	}
	// 확인한 저장소의 결과는 기록한다. 실패한 저장소가 있으면 한 시간 뒤 다시 본다.
	// 확인하지 못한 저장소의 스킬은 이전 결과를 유지한다(다시 설치한 것은 뺀다). 그래야 미루기와 한 번만 하는 알림이 흔들리지 않는다.
	// 외부 스킬이 하나도 설치되지 않았으면(--skip-skills) 업데이트가 아니라 pnpm skills:setup 몫이다.
	const record = (manifest, items, failed, reinstalled = []) => {
		const checked = new Set(items.map((i) => i.name));
		const known = new Set(
			[
				...manifest.skills,
				...Object.values(manifest.optional ?? {}).flatMap((o) => o.skills),
			].flatMap((e) => e.skills),
		);
		const keep = (list) =>
			failed.length
				? (list ?? []).filter(
						(n) => known.has(n) && !checked.has(n) && !reinstalled.includes(n),
					)
				: [];
		const none =
			!failed.length && items.length && items.every((i) => !i.installed);
		state.updates = none
			? []
			: [...names(items, "outdated", "missing"), ...keep(state.updates)].sort();
		const script = items
			.filter((i) => pending(i) && scripted(i))
			.map((i) => i.name);
		state.scripts = none ? [] : [...script, ...keep(state.scripts)].sort();
		state.gone = none
			? []
			: [...names(items, "gone"), ...keep(state.gone)].sort();
		// 같은 스킬에 스크립트 변경이 새로 생기면 미뤘어도 다시 알린다.
		state.key = [
			...state.updates,
			...state.gone,
			...state.scripts.map((n) => `${n}(스크립트)`),
		]
			.sort()
			.join(",");
		state.nextCheck = now + (failed.length ? HOUR : DAY);
	};
	const check = async (auth) => {
		const manifest = JSON.parse(
			readFileSync(join(root, "skills.manifest.json"), "utf8"),
		);
		return {
			manifest,
			...(await findUpdates(root, manifest, { fetch, token: auth })),
		};
	};

	if (argv.includes("--if-due")) {
		if (state.mode === "off") return 0;
		const out = [];
		// 2026-09-28 스크립트 검토를 더하기 전의 캐시에는 변경 기록(scripts)이 없어 auto로 잘못 알릴 수 있으니 바로 다시 본다.
		if (!(now < state.nextCheck) || !state.scripts) {
			try {
				const { manifest, items, failed } = await check(token());
				record(manifest, items, failed);
				// 실패를 최신으로 착각하지 않게 알린다. 같은 실패는 한 시간에 한 번만 보인다.
				if (failed.length) out.push(`CHECK_FAILED ${failed.join("; ")}`);
			} catch (e) {
				state.nextCheck = now + HOUR;
				// 옛 캐시(scripts 없음)가 매번 다시 확인하지 않게 채운다. 모르는 업데이트는 스크립트 변경으로 본다.
				state.scripts ??= state.updates ?? [];
				out.push(`CHECK_FAILED ${e.message}`);
			}
		}
		const { snooze } = state;
		const snoozed = snooze && snooze.key === state.key && now < snooze.until;
		if (state.updates?.length && !snoozed) {
			const scripts = (state.scripts ?? []).filter((n) =>
				state.updates.includes(n),
			);
			out.push(
				`UPDATE_AVAILABLE mode=${scripts.length ? "ask" : (state.mode ?? "ask")} ${state.updates.length}: ${state.updates.join(", ")}${scripts.length ? ` (스크립트 변경: ${scripts.join(", ")})` : ""}${NEXT}`,
			);
		}
		// 원격에서 없어진 스킬은 업데이트로 고칠 수 없으니 목록이 바뀔 때만 알린다.
		const gone = (state.gone ?? []).join(",");
		if (gone && gone !== state.goneShown)
			out.push(
				`UPSTREAM_GONE ${state.gone.length}: ${state.gone.join(", ")}${NEXT}`,
			);
		state.goneShown = gone;
		save();
		if (out.length) console.log(out.join("\n"));
		return 0;
	}

	const auth = token();
	let { manifest, items, failed } = await check(auth);
	const only = argv.filter((a) => !a.startsWith("-"));
	const unknown = only.filter((n) => !items.some((i) => i.name === n));
	if (unknown.length) {
		console.error(
			`매니페스트에 없거나 설치하지 않은 스킬: ${unknown.join(", ")}${failed.length ? ` (확인 실패: ${failed.join("; ")})` : ""}`,
		);
		return 2;
	}
	// --check가 보여 준 판을 검토 고정값으로 남긴다. 스크립트가 바뀐 스킬은 이름을 지정하고, 원격이 그 판 그대로일 때만 설치한다.
	if (argv.includes("--check"))
		state.pins = Object.fromEntries(
			items
				.filter((i) => pending(i) && scripted(i))
				.map((i) => [i.name, i.remote.pin]),
		);
	const bad = [];
	const updated = [];
	const held = [];
	const refused = [];
	const pinned = {};
	const drift = [];
	if (!argv.includes("--check")) {
		for (const e of new Set(items.map((i) => i.e))) {
			const want = [];
			for (const i of items.filter(
				(x) =>
					x.e === e && pending(x) && (!only.length || only.includes(x.name)),
			)) {
				if (!scripted(i)) want.push(i.name);
				else if (!only.includes(i.name)) held.push(i.name);
				else if (!i.remote.pin)
					refused.push(
						`${i.name}: 원격에 같은 이름의 폴더가 여럿이라 검토할 판을 정할 수 없다(skills-lock.json의 skillPath 확인)`,
					);
				else if (!state.pins?.[i.name])
					refused.push(`${i.name}: 검토 기록 없음(먼저 --check)`);
				else if (state.pins[i.name] !== i.remote.pin)
					refused.push(
						`${i.name}: 검토한 뒤 원격이 바뀌었다(--check부터 다시)`,
					);
				else {
					want.push(i.name);
					pinned[i.name] = i.remote.pin;
				}
			}
			if (!want.length) continue;
			const r = add(root, manifest.skillsCli, e, want);
			(r.status === 0 ? updated : bad).push(...want);
		}
		if (updated.length) console.log(`다시 설치: ${updated.join(", ")}`);
		if (updated.length || bad.length) {
			// 설치 뒤 다시 비교한다. 원격 스냅샷이 늦으면 업데이트로 남을 수 있다.
			({ items, failed } = await check(auth));
		}
		// 스크립트 변경 스킬은 설치본이 검토한 판인지 다시 본다(받기 직전에 바뀐 원격, 다른 폴더에서 받은 설치).
		for (const [name, pin] of Object.entries(pinned)) {
			const i = items.find((x) => x.name === name);
			if (
				updated.includes(name) &&
				i &&
				(i.state !== "ok" || i.remote.pin !== pin)
			)
				drift.push(name);
		}
		delete state.snooze;
	}
	record(manifest, items, failed, updated);
	save();
	const n = (s) => names(items, s);
	const lines = [
		`${argv.includes("--check") ? "스킬 업데이트 확인" : "스킬 업데이트"}: ${items.length}개 중 업데이트 ${n("outdated").length}개, 빠짐 ${n("missing").length}개, 원격에서 없어짐 ${n("gone").length}개`,
	];
	if (n("outdated").length)
		lines.push(`  업데이트: ${n("outdated").join(", ")}`);
	if (n("missing").length) lines.push(`  빠짐: ${n("missing").join(", ")}`);
	for (const i of items.filter((x) => pending(x) && scripted(x))) {
		const { folder, files, links, pin } = i.remote;
		lines.push(
			`  스크립트 변경(설치 전에 원격 파일을 본다): ${i.name} ← ${i.e.source} ${folder} (검토 고정값 ${pin})`,
		);
		for (const f of i.files.filter((x) => !x.endsWith(".md")))
			lines.push(
				`    ${f}: ${files.has(f) ? `blob ${files.get(f)}` : links.includes(f) ? "링크(대상을 따로 본다)" : "원격에서 지움"}`,
			);
	}
	if (held.length)
		lines.push(
			`  보류(스크립트 변경은 이름을 지정해야 설치한다): ${held.join(", ")} → --check로 원격 파일을 검토한 뒤 pnpm skills:update ${held.join(" ")}`,
		);
	if (refused.length) lines.push(`  설치 거부: ${refused.join("; ")}`);
	if (drift.length)
		lines.push(
			`  설치본이 검토한 판과 다르다: ${drift.join(", ")} → 되돌리고(prokit-skills-update 2절 4번) --check부터 다시 한다`,
		);
	for (const i of items.filter((x) => x.state === "gone"))
		lines.push(
			`  원격에서 없어짐: ${i.name} (${i.e.source}) → 설치본은 쓸 수 있지만 더 갱신되지 않는다. 원본 저장소 README에서 옮긴 곳을 찾아 매니페스트의 대체 스킬을 정한다`,
		);
	if (bad.length) lines.push(`  설치 실패: ${bad.join(", ")}`);
	if (failed.length)
		lines.push(`  확인 실패(위 숫자에 빠짐): ${failed.join("; ")}`);
	console.log(lines.join("\n"));
	if (bad.length || refused.length || drift.length) return 2;
	if (failed.length) return 3;
	return names(items, "outdated", "missing", "gone").length ? 1 : 0;
}

// 실재 경로로 비교한다. 심볼릭 링크 경로(macOS /tmp 등)로 실행하면 argv와 import.meta.url이 달라진다.
const isMain = () => {
	try {
		return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
	} catch {
		return false;
	}
};
if (isMain()) {
	const argv = process.argv.slice(2);
	(argv.includes("--update")
		? update(argv)
		: Promise.resolve().then(() => main(argv))
	).then(
		(code) => {
			process.exitCode = code;
		},
		(e) => {
			console.error(e.message);
			process.exitCode = 2;
		},
	);
}
