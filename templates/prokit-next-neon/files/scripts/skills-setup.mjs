#!/usr/bin/env node
// skills.manifest.json대로 에이전트 스킬·플러그인을 이 프로젝트 scope에 설치한다. install.sh와 `pnpm skills:setup`이 부른다.
// 사용법: node scripts/skills-setup.mjs [--check] [--with-global] [--brain <이름|none>] [--simplicity <이름|none>]
//                                       [--matt <스킬>[,<스킬>]] [--optional <묶음>[,<묶음>]]
//   --check        설치하지 않고 상태만 본다. 파일을 쓰지 않는다. 프로젝트 scope 항목이 빠졌거나
//                  고르지 않은 두뇌·과설계 방지 스킬이 남아 있으면 exit 1.
//   --with-global  check가 실패한 전역 도구(manifest.global, 고른 두뇌의 global)를 먼저 설치한다.
//                  auto: true인 전역 도구는 이 플래그 없이도 없으면 설치한다(실패는 경고로만 알린다).
//   --brain, --simplicity  고르는 항목(manifest.brains, manifest.simplicity)을 .dev-cycle.json에 기록하고,
//                  그 항목에서 고르지 않은 설치본을 skills-lock.json 출처·플러그인 ID·OMX 기록·init marker로 찾아 지운 뒤 고른 것을 설치한다.
//                  두뇌만 여럿을 쉼표로 받는다(--brain openspec,superpowers. 첫 값이 주 두뇌). 하나면 문자열, 여럿이면 배열로 기록한다.
//                  인자가 없으면 기록된 값(없으면 none)을 설치하고 다른 것은 알리기만 한다. 고른 두뇌의 전역 도구는 --brain을 줄 때 설치한다.
//   --matt         mattpocock 추가 스킬(manifest.mattpocock.pool)을 설치한다. 기록하지 않는다(설치본이 선택이다).
//   --optional     기본으로 설치하지 않는 선택 스킬 묶음(manifest.optional)도 설치한다. --check와 쓰면 그 묶음도 검사한다.
//   --drop         mattpocock 추가 스킬이나 선택 묶음을 지운다(--drop tdd,taste). skills-lock.json 출처가 맞는 설치본만 지운다.
//                  --drop all은 설치한 추가 스킬과 선택 묶음을 모두 지운다(--brain none --simplicity none --drop all이면 순수 AI).
//   이 기기 전역에 켜진 고르지 않은 플러그인과 gstack 개인 스킬은 .claude/settings.local.json으로 이 프로젝트에서만 끈다.
// exit: 0 정상, 1 --check 누락이나 충돌, 2 설치 실패나 모르는 이름
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
	rmSync,
	writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, noteSkillsChange } from "./dev-cycle.mjs";

const run = (cmd, args, opts = {}) =>
	spawnSync(cmd, args, { encoding: "utf8", ...opts });
const sh = (script, opts) => run("sh", ["-c", script], opts);
const onPath = (cmd) => sh(`command -v ${cmd}`).status === 0;
const firstLine = (r) =>
	`${r.stderr ?? ""}${r.stdout ?? ""}`.trim().split("\n")[0] ||
	(r.error ? r.error.message : `exit ${r.status}`);
// OMX 프로젝트 설정은 기기마다 한다(.codex/config.toml·hooks.json은 git이 무시). 이 파일이 그 흔적이다.
const OMX_MARK = ".omx/setup-scope.json";
// omx uninstall은 --scope도 기록도 없으면 user 범위(전역 ~/.codex)를 지운다. 범위를 늘 명시한다.
// --purge는 .omx/ 전체(plans, notepad, 기억)를 지워 쓰지 않는다. 없으면 기록(setup-scope.json)만 지운다.
const OMX_REMOVE = ["uninstall", "--scope", "project"];
// 고르는 항목. 고르지 않으면 none(기본 AI)이다. 카탈로그 항목은 같은 모양이라 같은 코드로 다룬다.
// multi: 여럿을 고를 수 있다(두뇌). 과설계 방지 스킬은 규칙이 엇갈려 하나만 쓴다.
const SLOTS = [
	{
		catalog: "brains",
		key: "brain",
		flag: "--brain",
		label: "두뇌",
		multi: true,
	},
	{
		catalog: "simplicity",
		key: "simplicity",
		flag: "--simplicity",
		label: "과설계 방지",
	},
];
const GUIDE = ".agents/skills/prokit-dev-cycle/references/brains/README.md";
const SETUP_FLAGS = ["--check", "--with-global"];
const SETUP_VALUE_FLAGS = [
	"--brain",
	"--simplicity",
	"--matt",
	"--optional",
	"--drop",
];
const SETUP_USAGE = `사용법: pnpm skills:setup [--check] [--with-global] [--brain <이름>[,<이름>]|none] [--simplicity <이름|none>] [--matt <스킬>[,…]] [--optional <묶음>[,…]] [--drop <스킬|묶음>[,…]]
       pnpm skills:update [<이름>...] [--check | --if-due | --snooze | --mode ask|auto|off]
고르는 기준: ${GUIDE}`;

const argValue = (argv, flag) => {
	const at = argv.indexOf(flag);
	return at < 0 ? undefined : (argv[at + 1] ?? "");
};
const readJson = (p, fallback) => {
	if (!existsSync(p)) return fallback;
	try {
		return JSON.parse(readFileSync(p, "utf8"));
	} catch (e) {
		throw new Error(`${p}: ${e.message}`);
	}
};
const hasSkill = (root, s) =>
	existsSync(join(root, ".agents/skills", s, "SKILL.md"));
// skills-lock.json의 source는 owner/repo다(2026-10-20 skills 1.7.4 실측).
const sameSource = (a, b) =>
	typeof a === "string" && a.toLowerCase() === b.toLowerCase();
const described = (entries) =>
	entries.map(([k, v]) => `${k}(${v.description})`).join(", ");

// --brain·--simplicity·--matt·--optional·--drop 값을 읽는다. 잘못된 값이면 error에 사용법을 담는다.
export function readChoices(argv, manifest) {
	const picked = { matt: [], optional: [], drop: [] };
	// --brain=x는 아래에서 보지 못해 조용히 무시된다.
	const eq = argv.find((a) =>
		/^--(brain|simplicity|matt|optional|drop)=/.test(a),
	);
	if (eq)
		return { error: `사용법: ${eq.replace("=", " ")}처럼 = 없이 띄어 쓴다` };
	// 두 번 주면 첫 값만 읽혀 나머지가 조용히 빠진다.
	const twice = [
		"--brain",
		"--simplicity",
		"--matt",
		"--optional",
		"--drop",
	].find((f) => argv.filter((a) => a === f).length > 1);
	if (twice)
		return { error: `사용법: ${twice}는 한 번만 쓰고 여러 값은 쉼표로 잇는다` };
	for (const s of SLOTS) {
		const v = argValue(argv, s.flag);
		if (v === undefined) continue;
		const catalog = manifest[s.catalog] ?? {};
		const names = [...new Set(s.multi ? v.split(",") : [v])];
		const ok = (n) => n === "none" || Object.hasOwn(catalog, n);
		// none은 혼자만 쓴다. 빈 이름(쉼표만)도 받지 않는다.
		if (!names.every(ok) || (names.length > 1 && names.includes("none")))
			return {
				error: `사용법: ${s.flag} <이름>${s.multi ? "[,<이름>]" : ""}. ${s.label}: ${described([["none", { description: "기본 AI" }], ...Object.entries(catalog)])} (설명: ${GUIDE})`,
			};
		picked[s.key] = names.length === 1 ? names[0] : names;
	}
	const pool = manifest.mattpocock?.pool ?? [];
	const optional = manifest.optional ?? {};
	for (const [flag, key, ok, usage] of [
		[
			"--matt",
			"matt",
			(x) => pool.includes(x),
			`사용법: --matt <스킬>[,<스킬>]. 추가 스킬: ${pool.join(", ") || "없음"} (제외한 스킬과 이유: ${GUIDE})`,
		],
		[
			"--optional",
			"optional",
			(x) => Object.hasOwn(optional, x),
			`사용법: --optional <묶음>[,<묶음>]. 묶음: ${described(Object.entries(optional)) || "없음"}`,
		],
		[
			"--drop",
			"drop",
			(x) => pool.includes(x) || Object.hasOwn(optional, x),
			`사용법: --drop <추가 스킬|선택 묶음>[,…] 또는 --drop all. 추가 스킬: ${pool.join(", ") || "없음"}. 묶음: ${Object.keys(optional).join(", ") || "없음"}. 필수 스킬과 공식 스킬은 지우지 않는다`,
		],
	]) {
		const v = argValue(argv, flag);
		if (v === undefined) continue;
		// --drop all: 설치한 추가 스킬과 선택 묶음을 모두 지운다(--brain none --simplicity none과 함께 쓰면 순수 AI).
		const all = key === "drop" && v === "all";
		const list = all
			? [...pool, ...Object.keys(optional)]
			: v.split(",").filter(Boolean);
		if (!list.length || !list.every(ok)) return { error: usage };
		picked[key] = list;
		if (all) picked.dropAll = true;
	}
	const both = picked.drop.filter(
		(x) => picked.matt.includes(x) || picked.optional.includes(x),
	);
	if (both.length)
		return { error: `사용법: ${both.join(", ")}를 더하면서 지울 수 없다` };
	return picked;
}

// 선택값을 .dev-cycle.json에 쓴다. 키 값만 바꾸거나 맨 앞에 더해 설치기가 맞춘 Biome 형식을 지킨다.
export function recordChoices(root, picked) {
	const p = join(root, ".dev-cycle.json");
	let text = readFileSync(p, "utf8");
	// 맨 앞에 더하므로 거꾸로 돌아야 brain이 먼저 온다.
	for (const { key } of [...SLOTS].reverse()) {
		const v = picked[key];
		if (v === undefined) continue;
		const before = JSON.parse(text);
		// 두뇌를 여럿 고르면 배열이다. 한 줄로 쓴다(Biome 형식).
		const value = Array.isArray(v)
			? `[${v.map((x) => `"${x}"`).join(", ")}]`
			: `"${v}"`;
		const re = new RegExp(`"${key}":\\s*(?:"[^"]*"|\\[[^\\]]*\\])`);
		text = re.test(text)
			? text.replace(re, `"${key}": ${value}`)
			: text.replace(/^\{\n/, `{\n\t"${key}": ${value},\n`);
		// 그 키 말고 다른 값(같은 이름의 하위 키 등)이 바뀌었으면 쓰지 않는다.
		const want =
			key in before ? { ...before, [key]: v } : { [key]: v, ...before };
		if (JSON.stringify(JSON.parse(text)) !== JSON.stringify(want))
			throw new Error(`.dev-cycle.json에 ${key}를 쓰지 못했다`);
	}
	writeFileSync(p, text);
}

// init 설치본(openspec, spec-kit)은 그 도구가 만든 파일(marker)로 판정한다.
const initDone = (root, init, every = true) =>
	init.marker[every ? "every" : "some"]((p) => existsSync(join(root, p)));

// 항목에서 고르지 않은 후보가 이 프로젝트에 남긴 설치본. 스킬은 이름이 아니라 skills-lock.json 출처로 판정한다.
function leftovers(root, slot, lock, enabled) {
	return Object.entries(slot.catalog)
		.filter(([name]) => !slot.names.includes(name))
		.map(([name, item]) => ({
			name,
			item,
			plugins: (item.claude?.plugins ?? []).filter((p) => enabled[p] === true),
			skills: (item.skills ?? [])
				.map((e) => ({
					e,
					names: e.skills.filter(
						(s) => hasSkill(root, s) && sameSource(lock[s]?.source, e.source),
					),
				}))
				.filter((x) => x.names.length),
			omx: Boolean(item.omx) && existsSync(join(root, OMX_MARK)),
			init: Boolean(item.init) && initDone(root, item.init, false),
		}))
		.filter((f) => f.plugins.length || f.skills.length || f.omx || f.init);
}
const describe = (f) =>
	`${f.name}(${[
		...(f.plugins.length ? [`플러그인 ${f.plugins.join(", ")}`] : []),
		...(f.skills.length
			? [`스킬 ${f.skills.flatMap((x) => x.names).join(", ")}`]
			: []),
		...(f.omx ? ["OMX 설정"] : []),
		...(f.init ? ["도구 파일"] : []),
	].join(", ")})`;

// 두뇌가 만든 문서(openspec/, specs/ 등)는 지우지 않는다. 다른 두뇌로 넘길 때 인계 자료다.
function cleanup(root, cli, found, failures, out) {
	for (const f of found) {
		if (f.init) {
			const r = sh(f.item.init.remove, { cwd: root });
			const still = f.item.init.marker.filter((p) => existsSync(join(root, p)));
			if (r.status !== 0 || still.length)
				failures.push(
					`정리 ${f.name}${still.length ? ` (남음: ${still.join(", ")})` : `: ${firstLine(r)}`}`,
				);
			const kept = (f.item.init.keep ?? []).filter((p) =>
				existsSync(join(root, p)),
			);
			if (kept.length)
				out.push(`남김: ${f.name}의 문서 ${kept.join(", ")} (인계 자료)`);
		}
		for (const { e, names } of f.skills) {
			const r = run("npx", ["-y", cli, "remove", "--skill", ...names, "-y"], {
				cwd: root,
				stdio: "inherit",
				env: { ...process.env, CI: "true" },
			});
			// skills CLI는 없는 이름을 조용히 넘긴다. 폴더로 다시 확인한다.
			const still = names.filter((s) => hasSkill(root, s));
			if (r.status !== 0 || still.length)
				failures.push(
					`정리 ${e.source}${still.length ? ` (남음: ${still.join(", ")})` : ""}`,
				);
		}
		if (onPath("claude"))
			for (const p of f.plugins)
				run("claude", ["plugin", "uninstall", p, "--scope", "project"], {
					cwd: root,
				});
		if (!f.omx) continue;
		if (!onPath("omx")) {
			failures.push(
				"OMX 정리: omx 없음 → npm install -g oh-my-codex 뒤 다시 실행한다",
			);
			continue;
		}
		const r = run("omx", OMX_REMOVE, { cwd: root });
		if (r.status !== 0) failures.push(`OMX 정리: ${firstLine(r)}`);
		// uninstall이 남기는 OMX 장부. .codex/config.toml의 model 줄과 .gitignore 줄은 남는다(git 무시 파일, 보고서 참고).
		else rmSync(join(root, ".codex/.omx"), { recursive: true, force: true });
	}
}

// dir(예: ~/.claude/skills/gstack)이 설치한 개인 스킬: 그 폴더, 이름에 폴더 이름이 든 것, SKILL.md가 그 안을 가리키는 것.
function userSkills(home, rel) {
	const dir = join(home, rel);
	if (!existsSync(dir)) return [];
	const real = realpathSync(dir);
	return readdirSync(dirname(dir))
		.filter((n) => {
			const md = join(dirname(dir), n, "SKILL.md");
			if (!existsSync(md)) return false;
			return (
				n.includes(basename(dir)) ||
				realpathSync(md).startsWith(`${real}${sep}`)
			);
		})
		.sort();
}

// 이 기기 전역에 켜져 있지만 이 프로젝트에서 고르지 않은 것을 개인 설정(.claude/settings.local.json)으로 끈다.
// 고른 것을 끄는 항목은 지운다. local이 project보다 우선이라 남기면 고른 것이 꺼진 채로 남는다.
// 사용자가 local에 직접 켠 값은 그대로 둔다. 전역 파일은 쓰지 않는다.
function personalOff(root, manifest, chosen, home, write) {
	const user =
		readJson(join(home, ".claude/settings.json"), {}).enabledPlugins ?? {};
	const others = chosen.flatMap((c) =>
		Object.entries(c.catalog)
			.filter(([n]) => !c.names.includes(n))
			.map(([, i]) => i),
	);
	const mine = chosen.flatMap((c) => c.items);
	const pluginsOf = (items) => items.flatMap((i) => i.claude?.plugins ?? []);
	const skillsOf = (items) =>
		items.flatMap((i) => (i.userSkills ? userSkills(home, i.userSkills) : []));
	const keep = new Set(pluginsOf(mine));
	const p = join(root, ".claude/settings.local.json");
	const local = readJson(p, {});
	local.enabledPlugins ??= {};
	local.skillOverrides ??= {};
	const plugins = local.enabledPlugins;
	const skills = local.skillOverrides;
	const off = [
		...new Set([
			...pluginsOf(others),
			...Object.keys(manifest.claude.conflicts ?? {}),
		]),
	].filter((x) => user[x] === true && !keep.has(x) && !(x in plugins));
	const offSkills = skillsOf(others).filter((x) => !(x in skills));
	let changed = off.length + offSkills.length;
	for (const x of off) plugins[x] = false;
	for (const x of offSkills) skills[x] = "off";
	for (const x of keep)
		if (plugins[x] === false) {
			delete plugins[x];
			changed++;
		}
	for (const x of skillsOf(mine))
		if (skills[x] === "off") {
			delete skills[x];
			changed++;
		}
	for (const k of ["enabledPlugins", "skillOverrides"])
		if (!Object.keys(local[k]).length) delete local[k];
	if (write && changed) {
		mkdirSync(dirname(p), { recursive: true });
		writeFileSync(p, `${JSON.stringify(local, null, 2)}\n`);
	}
	const names = [
		...off,
		...(offSkills.length ? [`개인 스킬 ${offSkills.join(", ")}`] : []),
	].join(", ");
	const lines = names
		? [
				write
					? `전역: 이 프로젝트에서 끔 ${names} (.claude/settings.local.json)`
					: `전역: 이 프로젝트에서 끌 것 ${names} → pnpm skills:setup`,
			]
		: [];
	// 프로젝트 설정으로 끌 수 없는 전역 흔적(전역 CLAUDE.md 블록, Codex 전역 스킬)은 알리기만 한다.
	const traces = chosen.flatMap((c) =>
		Object.entries(c.catalog)
			.filter(([n]) => !c.names.includes(n))
			.flatMap(([n, i]) =>
				(i.userTraces ?? [])
					.filter((t) => {
						const f = join(home, t.path);
						return (
							existsSync(f) &&
							(!t.contains || readFileSync(f, "utf8").includes(t.contains))
						);
					})
					.map((t) => `${n}(~/${t.path})`),
			),
	);
	if (traces.length)
		lines.push(
			`전역 경고: ${traces.join(", ")} → 프로젝트 설정으로 끌 수 없다. AGENTS.md 규칙대로 쓰지 않는다`,
		);
	return lines;
}

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
// on: 고른 두뇌·과설계 방지 스킬의 플러그인(false였어도 켠다). off: 정리한 플러그인(false로 남겨 user scope 설치도
// 이 프로젝트에서 끈다). drop: 고르지 않은 후보만 쓰던 마켓플레이스 선언.
// ~/.claude/plugins/installed_plugins.json에서 이 폴더(또는 user scope)에 설치 기록이 없는 플러그인. 파일이 없으면 보지 않는다.
export function unregisteredPlugins(
	root,
	plugins,
	configDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"),
) {
	let installed;
	try {
		installed = readJson(
			join(configDir, "plugins/installed_plugins.json"),
			{},
		).plugins;
	} catch {
		return [];
	}
	if (!installed) return [];
	const here = realpathSync(root);
	const same = (p) => {
		try {
			return realpathSync(p) === here;
		} catch {
			return false;
		}
	};
	return plugins.filter(
		(id) =>
			![]
				.concat(installed[id] ?? [])
				.some(
					(i) => i.scope === "user" || (i.projectPath && same(i.projectPath)),
				),
	);
}

export function mergeClaudeSettings(
	root,
	claude,
	{ write = true, on = [], off = [], drop = [] } = {},
) {
	const p = join(root, ".claude/settings.json");
	const cur = existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {};
	const added = [];
	let changed = false;
	cur.extraKnownMarketplaces ??= {};
	for (const name of drop)
		if (name in cur.extraKnownMarketplaces) {
			delete cur.extraKnownMarketplaces[name];
			changed = true;
		}
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
	for (const plugin of on) {
		if (cur.enabledPlugins[plugin] === true) continue;
		cur.enabledPlugins[plugin] = true;
		added.push(plugin);
	}
	for (const plugin of off) {
		if (cur.enabledPlugins[plugin] === false) continue;
		cur.enabledPlugins[plugin] = false;
		changed = true;
	}
	if (write && (added.length || changed)) {
		mkdirSync(dirname(p), { recursive: true });
		writeFileSync(p, `${JSON.stringify(cur, null, 2)}\n`);
	}
	return { added, settings: cur };
}

const codexSourceMatches = (source, expected) => {
	if (source?.sourceType !== "git" || typeof source.source !== "string")
		return false;
	const clean = (value) =>
		value
			.toLowerCase()
			.replace(/^git\+/, "")
			.replace(/^git@github\.com:/, "")
			.replace(/^ssh:\/\/git@github\.com\//, "")
			.replace(/^https:\/\/(?:www\.)?github\.com\//, "")
			.replace(/\.git\/?$/, "")
			.replace(/\/$/, "");
	return clean(source.source) === clean(expected);
};

const codexUnsupported = (r) =>
	/(?:unknown|unrecognized) (?:command|subcommand|option)|not supported/i.test(
		`${r.stderr ?? ""}${r.stdout ?? ""}`,
	);

function codexPluginStatus(root, codex, withGlobal, failures) {
	if (!onPath("codex"))
		return "Codex 플러그인(global): codex 없음 → Codex를 설치한 뒤 pnpm skills:setup --with-global";
	const json = (args) => {
		const r = run("codex", args, { cwd: root });
		if (r.status !== 0)
			return { error: firstLine(r), unsupported: codexUnsupported(r) };
		try {
			return { value: JSON.parse(r.stdout) };
		} catch (e) {
			return { error: `JSON: ${e.message}` };
		}
	};
	const markets = json(["plugin", "marketplace", "list", "--json"]);
	if (markets.error) {
		const state = markets.unsupported
			? "지원하지 않음"
			: `조회 실패: ${markets.error}`;
		if (withGlobal && !markets.unsupported)
			failures.push(`Codex 플러그인 ${state}`);
		return `Codex 플러그인(global): ${state}`;
	}
	if (!markets.value || !Array.isArray(markets.value.marketplaces)) {
		const state = "조회 실패: JSON marketplaces 배열 없음";
		if (withGlobal) failures.push(`Codex 플러그인 ${state}`);
		return `Codex 플러그인(global): ${state}`;
	}
	const plugins = json(["plugin", "list", "--json"]);
	if (plugins.error) {
		const state = plugins.unsupported
			? "지원하지 않음"
			: `조회 실패: ${plugins.error}`;
		if (withGlobal && !plugins.unsupported)
			failures.push(`Codex 플러그인 ${state}`);
		return `Codex 플러그인(global): ${state}`;
	}
	if (!plugins.value || !Array.isArray(plugins.value.installed)) {
		const state = "조회 실패: JSON installed 배열 없음";
		if (withGlobal) failures.push(`Codex 플러그인 ${state}`);
		return `Codex 플러그인(global): ${state}`;
	}
	const marketplace = markets.value.marketplaces.find(
		(m) => m?.name === codex.marketplace.name,
	);
	if (
		marketplace &&
		!codexSourceMatches(marketplace.marketplaceSource, codex.marketplace.source)
	) {
		const state = `source mismatch: ${codex.marketplace.name}`;
		if (withGlobal) failures.push(`Codex 플러그인 ${state}`);
		return `Codex 플러그인(global): ${state}`;
	}
	const plugin = plugins.value.installed.find(
		(p) => codex.plugins.includes(p?.pluginId) && p.installed,
	);
	if (plugin) {
		if (
			!codexSourceMatches(plugin.marketplaceSource, codex.marketplace.source)
		) {
			const state = `${plugin.pluginId} 출처 확인 안 됨`;
			if (withGlobal) failures.push(`Codex 플러그인 ${state}`);
			return `Codex 플러그인(global): ${state}`;
		}
		return `Codex 플러그인(global): ${plugin.pluginId} ${plugin.enabled === false ? "비활성(사용자 선택 보존)" : "설치됨"}`;
	}
	if (!withGlobal)
		return `Codex 플러그인(global): ${codex.plugins.join(", ")} 설치 안 함 → pnpm skills:setup --with-global`;
	const command = (args, label) => {
		const r = run("codex", args, { cwd: root });
		if (r.status === 0) return true;
		if (codexUnsupported(r)) return "unsupported";
		failures.push(`Codex 플러그인 ${label}: ${firstLine(r)}`);
		return false;
	};
	if (marketplace) {
		const updated = command(
			["plugin", "marketplace", "upgrade", codex.marketplace.name, "--json"],
			`marketplace ${codex.marketplace.name} 갱신`,
		);
		if (updated === "unsupported")
			return "Codex 플러그인(global): marketplace upgrade 지원하지 않음 → Codex를 갱신한 뒤 다시 실행한다";
		if (!updated) return "Codex 플러그인(global): 설치 실패";
	} else {
		const added = command(
			["plugin", "marketplace", "add", codex.marketplace.source, "--json"],
			`marketplace ${codex.marketplace.source}`,
		);
		if (added === "unsupported")
			return "Codex 플러그인(global): marketplace add 지원하지 않음 → Codex를 갱신한 뒤 다시 실행한다";
		if (!added) return "Codex 플러그인(global): 설치 실패";
	}
	for (const name of codex.plugins) {
		const installed = command(["plugin", "add", name, "--json"], name);
		if (installed === "unsupported")
			return "Codex 플러그인(global): plugin add 지원하지 않음 → Codex를 갱신한 뒤 다시 실행한다";
		if (!installed) return "Codex 플러그인(global): 설치 실패";
	}
	return `Codex 플러그인(global): ${codex.plugins.join(", ")} 설치 완료 → /hooks 신뢰를 확인하고 새 세션에서 사용한다`;
}

// mode: "check"는 설치하지 않는다. "auto"는 auto: true인 도구만, "all"(--with-global)은 install이 있는 도구를 모두 설치한다.
// 끝내 없는 도구는 absent에 담는다.
function installGlobal(list, mode, failures, warnings, absent = []) {
	const lines = [];
	for (const g of list) {
		// 그 도구(codex 등)가 없는 기기에는 그 도구용 항목을 설치하지도 누락으로 세지도 않는다.
		if (g.tool && !onPath(g.tool)) {
			lines.push(`${g.name} 건너뜀(${g.tool} 없음)`);
			continue;
		}
		let ok = sh(g.check).status === 0;
		if (!ok && g.install && (mode === "all" || (mode === "auto" && g.auto))) {
			console.log(`전역 설치: ${g.name} → ${g.install}`);
			const r = sh(g.install, { stdio: "inherit" });
			ok = r.status === 0 && sh(g.check).status === 0;
			// 기본 실행의 자동 설치는 없어도 dev-cycle이 진행되는 도구라, 실패해도 설치 전체를 멈추지 않는다.
			if (!ok) (mode === "all" ? failures : warnings).push(`전역 ${g.name}`);
		}
		if (!ok) absent.push(g);
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
	if (argv.includes("--help") || argv.includes("-h")) {
		console.log(SETUP_USAGE);
		return 0;
	}
	const check = argv.includes("--check");
	const withGlobal = argv.includes("--with-global");
	const manifest = JSON.parse(
		readFileSync(join(root, "skills.manifest.json"), "utf8"),
	);
	const picked = readChoices(argv, manifest);
	if (picked.error) {
		console.error(picked.error);
		return 2;
	}
	// 모르는 인자(오타, 값 없는 이름)를 버리면 고른 것 없이 기본 설치가 그대로 돈다.
	const unknown = argv.filter(
		(a, i) =>
			a !== "--" &&
			!SETUP_FLAGS.includes(a) &&
			!SETUP_VALUE_FLAGS.includes(a) &&
			!SETUP_VALUE_FLAGS.includes(argv[i - 1]),
	);
	if (unknown.length) {
		console.error(`모르는 인자: ${unknown.join(" ")}\n${SETUP_USAGE}`);
		return 2;
	}
	if (check && picked.drop.length) {
		console.error("사용법: --drop은 --check와 함께 쓰지 않는다");
		return 2;
	}
	const cfgPath = join(root, ".dev-cycle.json");
	let cfg;
	try {
		cfg = readJson(cfgPath, {});
	} catch (e) {
		console.error(`.dev-cycle.json을 읽을 수 없다: ${e.message}`);
		return 2;
	}
	const record = SLOTS.some((s) => s.key in picked);
	if (record && !check && !existsSync(cfgPath)) {
		console.error(
			"선택을 기록할 .dev-cycle.json이 없다 → install.sh로 템플릿을 먼저 설치한다",
		);
		return 2;
	}
	// 기록이 없는 기존 프로젝트는 none으로 읽는다. 인자로 준 항목만 정리한다(clean).
	// 기록은 하나면 문자열, 여럿(두뇌)이면 배열이다. names는 고른 순서(첫 값이 주 두뇌)다.
	const chosen = SLOTS.map((s) => {
		const catalog = manifest[s.catalog] ?? {};
		// 손으로 고친 기록의 중복은 한 번만 센다. 빈 배열은 none이다.
		const names = [
			...new Set([].concat(picked[s.key] ?? cfg[s.key] ?? "none")),
		];
		if (!names.length) names.push("none");
		const items = names
			.filter((n) => Object.hasOwn(catalog, n))
			.map((n) => catalog[n]);
		return { ...s, catalog, names, items, clean: s.key in picked };
	});
	const optional = manifest.optional ?? {};
	const matt = manifest.mattpocock;
	// adopt(하네스만 설치한 기존 Next.js 프로젝트)는 Better-T-Stack 전용 스킬(stack)을 받지 않는다.
	const entries = [
		...manifest.skills.filter((e) => !(cfg.adopt === true && e.stack)),
		...picked.optional.flatMap((g) => optional[g].skills),
		...(picked.matt.length
			? [{ source: matt.source, agents: matt.agents, skills: picked.matt }]
			: []),
		...chosen.flatMap((c) => c.items.flatMap((i) => i.skills ?? [])),
	];
	const failures = [];
	const warnings = [];
	const missing = [];
	const out = [];

	let lock = {};
	let enabled = {};
	try {
		lock = readJson(join(root, "skills-lock.json"), {}).skills ?? {};
	} catch (e) {
		// 출처를 모르면 정리할 설치본을 찾지 못한다. 조용히 넘기지 않는다.
		(check ? missing : failures).push(`skills-lock.json 읽기: ${e.message}`);
	}
	try {
		enabled =
			readJson(join(root, ".claude/settings.json"), {}).enabledPlugins ?? {};
	} catch {} // 깨진 파일은 아래 Claude 단계가 실패로 보고한다.
	for (const c of chosen) c.found = leftovers(root, c, lock, enabled);
	const cleaning = chosen.filter((c) => c.clean && c.found.length);
	if (!check) {
		if (record) recordChoices(root, picked);
		if (cleaning.length)
			out.push(
				`정리: ${cleaning.flatMap((c) => c.found.map(describe)).join(", ")}`,
			);
		cleanup(
			root,
			manifest.skillsCli,
			cleaning.flatMap((c) => c.found),
			failures,
			out,
		);
		// --drop: 추가 스킬과 선택 묶음. 같은 이름이라도 다른 출처에서 받은 스킬은 지우지 않는다.
		const dropEntries = picked.drop.map((name) => ({
			name,
			entries: manifest.mattpocock?.pool?.includes(name)
				? [{ ...manifest.mattpocock, skills: [name] }]
				: optional[name].skills,
		}));
		const dropping = dropEntries
			.map(({ name, entries: es }) => ({
				name,
				plugins: [],
				skills: es
					.map((e) => ({
						e,
						names: e.skills.filter(
							(x) => hasSkill(root, x) && sameSource(lock[x]?.source, e.source),
						),
					}))
					.filter((x) => x.names.length),
			}))
			.filter((d) => d.skills.length);
		const absentDrop = picked.drop.filter(
			(n) => !dropping.some((d) => d.name === n),
		);
		if (dropping.length) {
			out.push(`제거: ${dropping.map(describe).join(", ")}`);
			cleanup(root, manifest.skillsCli, dropping, failures, out);
		}
		if (absentDrop.length && !picked.dropAll)
			out.push(
				`제거할 것 없음: ${absentDrop.join(", ")} (설치되지 않았거나 다른 출처)`,
			);
	}

	const globals = installGlobal(
		manifest.global,
		check ? "check" : withGlobal ? "all" : "auto",
		failures,
		warnings,
	);
	// 고른 두뇌의 전역 도구(gstack, OMX CLI)는 --brain을 줬거나 --with-global일 때만 설치한다.
	const slotGlobal = chosen.flatMap((c) =>
		c.items.flatMap((i) =>
			(i.global ?? []).map((g) => ({ ...g, clean: c.clean })),
		),
	);
	const absent = [];
	const slotGlobals = installGlobal(
		slotGlobal,
		!check && (withGlobal || slotGlobal.some((g) => g.clean)) ? "all" : "check",
		failures,
		warnings,
		absent,
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
	// 프로젝트를 init하는 두뇌(openspec, spec-kit). 그 두뇌의 전역 도구가 없으면 실행하지 않고 안내한다.
	const initLines = [];
	for (const c of chosen)
		for (const [i, item] of c.items.entries()) {
			const init = item.init;
			if (!init || initDone(root, init)) continue;
			const name = c.names.filter((n) => Object.hasOwn(c.catalog, n))[i];
			if (check) {
				missing.push(
					`${c.label} ${name} 프로젝트 파일(${init.marker.join(", ")})`,
				);
				continue;
			}
			const need = (item.global ?? []).filter((g) =>
				absent.some((a) => a.name === g.name),
			);
			if (need.length) {
				initLines.push(
					`${name} 프로젝트 설정: ${need.map((g) => g.name).join(", ")} 없음 → ${need[0].hint ?? need[0].install}`,
				);
				continue;
			}
			console.log(`프로젝트 설정: ${name} → ${init.run}`);
			const r = sh(init.run, {
				cwd: root,
				stdio: "inherit",
				env: { ...process.env, ...init.env },
			});
			const ok = r.status === 0 && initDone(root, init);
			if (!ok) failures.push(`${name} 프로젝트 설정`);
			initLines.push(`${name} 프로젝트 설정: ${ok ? "완료" : "실패"}`);
		}
	const total = entries.reduce((n, e) => n + e.skills.length, 0);
	out.push(...initLines);
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
	// 고른 두뇌의 전역 도구가 없으면 누락이다. 그 도구(codex 등)가 없는 기기의 항목은 installGlobal이 건너뛴다.
	if (check) for (const g of absent) missing.push(`전역 ${g.name}`);
	if (matt)
		out.push(
			`mattpocock 추가: ${matt.pool.filter((s) => hasSkill(root, s)).join(", ") || "없음"} (설치: pnpm skills:setup --matt <스킬>)`,
		);

	// 기본 플러그인에 고른 항목의 마켓플레이스를 더한다. 고르지 않은 후보만 쓰던 마켓플레이스는 정리할 때 뺀다.
	const mine = chosen.flatMap((c) => c.items);
	const claude = {
		marketplaces: Object.assign(
			{},
			manifest.claude.marketplaces,
			...mine.map((i) => i.claude?.marketplaces ?? {}),
		),
		plugins: manifest.claude.plugins,
	};
	const on = mine.flatMap((i) => i.claude?.plugins ?? []);
	const drop = chosen
		.filter((c) => c.clean)
		.flatMap((c) =>
			Object.entries(c.catalog)
				.filter(([n]) => !c.names.includes(n))
				.flatMap(([, i]) => Object.keys(i.claude?.marketplaces ?? {})),
		)
		.filter((m) => !(m in claude.marketplaces));
	const off = cleaning.flatMap((c) => c.found.flatMap((f) => f.plugins));
	try {
		const { added, settings } = mergeClaudeSettings(root, claude, {
			write: !check,
			on,
			off,
			drop,
		});
		if (check && added.length)
			missing.push(`.claude/settings.json: ${added.join(", ")}`);
		// 선언만으로는 켜지지 않는다. Claude Code는 project scope 설치를 폴더 경로별로 기록하므로
		// 폴더를 옮기거나 복사했거나 다른 기기에서 받으면 선언이 있어도 세션에 플러그인이 없다.
		const unregistered = check
			? unregisteredPlugins(
					root,
					[...claude.plugins, ...on].filter(
						(p) => settings.enabledPlugins[p] !== false,
					),
				)
			: [];
		if (unregistered.length)
			missing.push(
				`Claude 플러그인 미등록: ${unregistered.join(", ")} (이 폴더에 설치 기록이 없어 세션에 켜지지 않는다 → pnpm skills:setup)`,
			);
		let line = `Claude 플러그인(project): .claude/settings.json ${check ? (added.length ? `선언 누락 ${added.join(", ")}` : "선언 있음") : added.length ? `선언 추가 ${added.join(", ")}` : off.length ? "" : "선언 변화 없음"}${!check && off.length ? `${added.length ? ", " : ""}끔 ${off.join(", ")}` : ""}${unregistered.length ? `, 이 폴더에 미등록 ${unregistered.join(", ")}` : ""}`;
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
				for (const name of Object.keys(claude.marketplaces)) {
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
				for (const plugin of [...claude.plugins, ...on]) {
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
	for (const i of mine)
		if (i.codex)
			out.push(
				codexPluginStatus(root, i.codex, withGlobal && !check, failures),
			);

	const omxArgs = mine.find((i) => i.omx)?.omx;
	if (omxArgs) {
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
			const r = run("omx", omxArgs, { cwd: root });
			if (r.status !== 0 || !done()) failures.push(`OMX: ${firstLine(r)}`);
			out.push(
				`OMX(project): omx ${omxArgs.join(" ")} → ${r.status === 0 ? "완료" : "실패"}`,
			);
		} else {
			out.push(
				"OMX(project): omx 없음 → npm install -g oh-my-codex 뒤 pnpm skills:setup --brain oh-my (또는 --with-global)",
			);
		}
	}

	// 두 항목의 상태. 고르지 않은 설치본은 --check에서 충돌(누락)이고, 인자 없는 설치에서는 알리기만 한다.
	let now = {};
	try {
		now =
			readJson(join(root, ".claude/settings.json"), {}).enabledPlugins ?? {};
	} catch {}
	const state = (item) => {
		const parts = [
			...(item.skills ?? []).flatMap((e) =>
				e.skills.map((s) => !missingSkills(root, { ...e, skills: [s] }).length),
			),
			...(item.claude?.plugins ?? []).map((p) => now[p] === true),
			...(item.omx && onPath("omx") ? [existsSync(join(root, OMX_MARK))] : []),
			...(item.global ?? [])
				.filter((g) => !g.tool || onPath(g.tool))
				.map((g) => !absent.some((a) => a.name === g.name)),
			...(item.init ? [initDone(root, item.init)] : []),
		];
		const have = parts.filter(Boolean).length;
		const none = Object.entries(item.hosts ?? {})
			.filter(([, v]) => v === "none")
			.map(([h]) => h);
		return `${have === parts.length ? "설치됨" : have ? "일부" : "없음"}${none.length ? `, ${none.join("·")}는 기본 AI` : ""}`;
	};
	for (const c of chosen) {
		const unknown = c.names.filter(
			(n) => n !== "none" && !Object.hasOwn(c.catalog, n),
		);
		let line = `${c.label}: 없음(기본 AI)`;
		if (unknown.length) {
			line = `${c.label}: ${unknown.join(", ")}(매니페스트에 없음) → pnpm skills:setup ${c.flag} <이름>`;
			(check ? missing : failures).push(`${c.label} ${unknown.join(", ")}`);
		} else if (c.items.length) {
			const main = c.names.length > 1 ? "주, " : "";
			line = `${c.label}: ${c.names.map((n, i) => `${n}(${i ? "" : main}${state(c.catalog[n])})`).join(", ")}`;
		}
		const left = c.clean && !check ? [] : c.found;
		if (left.length) {
			line += `, 고르지 않은 설치본: ${left.map(describe).join(", ")} → pnpm skills:setup ${c.flag} <이름|none>으로 고르면 정리된다(기록: ${c.names.join(",")})`;
			if (check) missing.push(`${c.label} 충돌`);
		}
		out.push(line);
		// 세션 시작 훅이나 전역 지시로 진행 순서를 강제하는 두뇌가 둘 이상이면 지시가 서로 덮어쓴다.
		const forcing = c.names.filter((n) => c.catalog[n]?.forces);
		if (forcing.length > 1)
			out.push(
				`경고: 진행 순서를 강제하는 두뇌 ${forcing.join(", ")}를 함께 골랐다. 지시가 서로 덮어쓸 수 있어 주 두뇌(${c.names[0]})를 따르고 나머지 두뇌의 강제 지시는 따르지 않는다 (${GUIDE})`,
			);
	}
	// 개인 설정 파일이 깨졌으면 쓰지 않고 알리기만 한다(설치 결과 요약은 그대로 보인다).
	try {
		out.push(...personalOff(root, manifest, chosen, homedir(), !check));
	} catch (e) {
		out.push(`전역 경고: 개인 설정을 읽지 못해 건너뜀: ${e.message}`);
	}

	out.push(`전역 도구: ${globals.join(", ") || "없음"}`);
	if (slotGlobals.length) out.push(`두뇌 전역 도구: ${slotGlobals.join(", ")}`);
	if (warnings.length)
		out.push(
			`경고: ${warnings.join("; ")} 설치 실패 → 위 출력을 보고 직접 설치한다 (없어도 dev-cycle은 진행된다)`,
		);
	// 구성을 바꿨으면 지금 세션에 다시 불러오는 법을 알리고, 열린 라운드가 있으면 그 라운드에 적는다(라운드를 닫지 않고 이어 간다)
	if (
		!check &&
		(record ||
			picked.optional.length ||
			picked.matt.length ||
			picked.drop.length)
	) {
		out.push(
			"세션: Claude Code는 /reload-plugins로 바뀐 플러그인·스킬·훅을 지금 세션에 불러온다(새 세션도 된다). 다시 불러오기 전에는 세션의 스킬 목록·훅 안내가 아니라 .dev-cycle.json과 pnpm skills:check를 따른다",
		);
		const todo = join(root, cfg.todoPath ?? "tasks/todo.md");
		const label = (v) => [v ?? "none"].flat().join(",");
		const changed =
			label(picked.brain ?? cfg.brain) !== label(cfg.brain) ||
			(picked.simplicity ?? cfg.simplicity ?? "none") !==
				(cfg.simplicity ?? "none") ||
			picked.optional.length ||
			picked.matt.length ||
			picked.drop.length;
		// 실패한 설치는 라운드에 적지 않는다(구성이 반쯤 바뀐 채라 exit 2를 보고 다시 실행한다)
		if (
			changed &&
			!failures.length &&
			existsSync(todo) &&
			readFileSync(todo, "utf8").includes("<!-- dev-cycle:start ")
		)
			try {
				const before = { brain: cfg.brain, simplicity: cfg.simplicity };
				const after = {
					brain: picked.brain ?? cfg.brain,
					simplicity: picked.simplicity ?? cfg.simplicity,
				};
				if (noteSkillsChange(root, loadConfig(root), { before, after }))
					out.push(
						"라운드: 열린 라운드에 스킬 구성 변경을 적었다 → 닫지 않고 이어 간다. 설치기가 바꾼 파일은 케이스 판정에서 빠지고, 남은 단계 행은 새 구성으로 한다",
					);
			} catch (e) {
				out.push(`경고: 열린 라운드에 구성 변경을 적지 못했다: ${e.message}`);
			}
	}
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
			out.set(
				relative(base, p).split(sep).join("/"),
				localBlobs(readFileSync(p)),
			);
	}
	return out;
}

// 설치 CLI는 원본의 .gitattributes(eol=crlf 등)대로 줄 끝을 바꿔 쓴다. git이 저장하는 blob은 LF로
// 정규화한 내용이므로 CRLF를 LF로 바꾼 blob도 같은 판으로 본다.
export function localBlobs(buf) {
	const raw = gitBlob(buf);
	const text = buf.toString("latin1");
	if (!text.includes("\r\n")) return [raw];
	return [raw, gitBlob(Buffer.from(text.replaceAll("\r\n", "\n"), "latin1"))];
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

// local: 설치본의 {상대 경로 → git blob sha 목록(localBlobs)}. 돌려주는 값: 원격과 다른 파일의 상대 경로 목록(같으면 빈 목록).
export function changedFiles(remote, local) {
	const changed = [...remote.files]
		.filter(([rel, sha]) => !local.get(rel)?.includes(sha))
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

// 기본으로 설치하지 않는 것: 선택 묶음, mattpocock 추가 스킬, 두뇌·과설계 방지 후보.
const extraEntries = (manifest) => [
	...Object.values(manifest.optional ?? {}).flatMap((o) => o.skills),
	...(manifest.mattpocock
		? [
				{
					source: manifest.mattpocock.source,
					agents: manifest.mattpocock.agents,
					skills: manifest.mattpocock.pool,
				},
			]
		: []),
	...SLOTS.flatMap((s) =>
		Object.values(manifest[s.catalog] ?? {}).flatMap((i) => i.skills ?? []),
	),
];

// 매니페스트 기본 스킬 전부와, 기본 밖 항목 중 설치한 스킬을 원격과 비교한다.
// 기본 밖 항목은 같은 이름을 다른 출처에서 받았을 수 있어 lock 출처가 맞을 때만 본다.
// 확인하지 못한 저장소는 failed에 담고, 나머지 저장소 결과는 그대로 돌려준다.
export async function findUpdates(root, manifest, { fetch, token }) {
	const lockPath = join(root, "skills-lock.json");
	const lock = existsSync(lockPath)
		? (JSON.parse(readFileSync(lockPath, "utf8")).skills ?? {})
		: {};
	const extra = extraEntries(manifest).map((e) => ({
		...e,
		skills: e.skills.filter(
			(s) => hasSkill(root, s) && sameSource(lock[s]?.source, e.source),
		),
	}));
	// adopt 프로젝트는 Better-T-Stack 전용 스킬(stack)을 설치하지 않으므로 빠짐으로 알리지 않는다.
	const adopt = readJson(join(root, ".dev-cycle.json"), {}).adopt === true;
	const base = manifest.skills.filter((e) => !(adopt && e.stack));
	const entries = [...base, ...extra].filter((e) => e.skills.length);
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
			[...manifest.skills, ...extraEntries(manifest)].flatMap((e) => e.skills),
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
