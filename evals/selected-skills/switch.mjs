#!/usr/bin/env node
// 전환 매트릭스: fixture 하나에서 두뇌·과설계 방지·추가 스킬·선택 묶음을 차례로 바꾸고, 단계마다
// 설치 확인, 남은 설치본, 플러그인 켜기·끄기, dev-cycle의 두뇌 줄을 본다. 라운드 중 전환도 본다. 모델은 부르지 않는다.
//   PKSS_WORKSPACE=… node evals/selected-skills/switch.mjs [--base base] [--out switch] [--scripts <템플릿 files 폴더>]
//   --scripts: fixture의 scripts/dev-cycle.mjs·skills-setup.mjs를 그 폴더의 판으로 바꿔 고친 판을 본다
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const WS = resolve(process.env.PKSS_WORKSPACE ?? join(tmpdir(), "pro-kit-selected-skills"));
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d);
const dir = join(WS, "fx", opt("out", "switch"));
const sh = (cmd, a) => spawnSync(cmd, a, { cwd: dir, encoding: "utf8", maxBuffer: 64 << 20 });
const read = (p) => (existsSync(join(dir, p)) ? readFileSync(join(dir, p), "utf8") : "");
const readJ = (p) => {
	try {
		return JSON.parse(read(p));
	} catch {
		return {};
	}
};
const ls = (p) => (existsSync(join(dir, p)) ? readdirSync(join(dir, p)) : []);

const STEPS = [
	["--brain", "superpowers", "--simplicity", "ponytail"],
	["--brain", "agent-skills", "--simplicity", "caveman"],
	["--optional", "taste"],
	["--brain", "openspec", "--simplicity", "karpathy"],
	["--drop", "taste"],
	["--brain", "spec-kit", "--matt", "tdd"],
	["--brain", "compound-engineering,mattpocock", "--simplicity", "ponytail"],
	["--brain", "oh-my"],
	["--brain", "none", "--simplicity", "none", "--drop", "tdd"],
];

function state() {
	const m = readJ("skills.manifest.json");
	const cfg = readJ(".dev-cycle.json");
	const brains = [cfg.brain ?? "none"].flat().filter((b) => b !== "none");
	const simp = cfg.simplicity ?? "none";
	const enabled = Object.entries(readJ(".claude/settings.json").enabledPlugins ?? {}).filter(([, v]) => v).map(([k]) => k);
	const disabled = Object.entries(readJ(".claude/settings.local.json").enabledPlugins ?? {}).filter(([, v]) => v === false).map(([k]) => k);
	const agentsSkills = new Set(ls(".agents/skills"));
	const claudeSkills = new Set(ls(".claude/skills"));
	const lock = new Set(Object.keys(readJ("skills-lock.json").skills ?? {}));
	const problems = [];
	// 고르지 않은 것의 설치본·플러그인이 남았는지
	const groups = [
		...Object.entries(m.brains ?? {}).map(([k, v]) => ({ kind: "brain", name: k, picked: brains.includes(k), v })),
		...Object.entries(m.simplicity ?? {}).map(([k, v]) => ({ kind: "simplicity", name: k, picked: simp === k, v })),
		...Object.entries(m.optional ?? {}).map(([k, v]) => ({ kind: "optional", name: k, picked: null, v })),
	];
	for (const g of groups) {
		const skills = (g.v.skills ?? []).flatMap((s) => s.skills.filter((x) => !lock.has(x) || readJ("skills-lock.json").skills[x].source === s.source));
		const plugins = g.v.claude?.plugins ?? [];
		const present = skills.filter((s) => agentsSkills.has(s) || claudeSkills.has(s) || lock.has(s));
		const on = plugins.filter((p) => enabled.includes(p));
		const markers = (g.v.init?.marker ?? []).filter((p) => existsSync(join(dir, p)));
		if (g.picked === false && (present.length || on.length || markers.length)) problems.push(`고르지 않은 ${g.kind} ${g.name}가 남음: ${[...present, ...on, ...markers].join(", ")}`);
		if (g.picked === true) {
			if (plugins.length && on.length !== plugins.length) problems.push(`고른 ${g.name}의 플러그인이 켜지지 않음: ${plugins.join(", ")}`);
			if (g.v.init?.marker && !markers.length) problems.push(`고른 ${g.name}의 도구 파일 없음`);
			// Codex용 스킬 목록이 있으면 설치돼야 한다
			const codex = (g.v.skills ?? []).flatMap((s) => s.skills);
			if (codex.length && present.length < codex.length) problems.push(`고른 ${g.name}의 스킬 일부 없음: ${codex.filter((s) => !present.includes(s)).join(", ")}`);
		}
		if (g.picked === true && plugins.some((p) => disabled.includes(p))) problems.push(`고른 ${g.name}의 플러그인이 local에서 꺼짐`);
	}
	return { brains, simp, enabled, disabled, problems };
}

function step(label, a) {
	const r = a ? sh("node", ["scripts/skills-setup.mjs", ...a]) : { status: null, stdout: "", stderr: "" };
	const check = sh("pnpm", ["--silent", "skills:check"]);
	const agents = sh("pnpm", ["--silent", "agents:check"]);
	const status = sh("node", ["scripts/dev-cycle.mjs", "status"]);
	const s = state();
	const brainLine = `${status.stdout}`.split("\n").find((l) => l.startsWith("두뇌:")) ?? "(두뇌 줄 없음: 열린 라운드 없음)";
	const out = {
		label,
		args: a?.join(" ") ?? "",
		setup: r.status,
		setupWarn: `${r.stdout}${r.stderr}`.split("\n").filter((l) => /^(경고|실패|제거|정리|남김):/.test(l.trim())),
		skillsCheck: check.status,
		checkLines: check.stdout.split("\n").filter((l) => /^(두뇌|과설계 방지|mattpocock 추가|선택 스킬|충돌|전역 경고)/.test(l)),
		agentsCheck: agents.status,
		brains: s.brains,
		simplicity: s.simp,
		enabledPlugins: s.enabled,
		localDisabled: s.disabled,
		brainLine,
		problems: s.problems,
	};
	console.log(`${label} [${out.args}] setup=${out.setup} skills:check=${out.skillsCheck} agents:check=${out.agentsCheck} 문제 ${s.problems.length}${s.problems.length ? `\n  - ${s.problems.join("\n  - ")}` : ""}`);
	return out;
}

rmSync(dir, { recursive: true, force: true });
cpSync(join(WS, "fx", opt("base", "base")), dir, { recursive: true, verbatimSymlinks: true });
if (opt("scripts")) for (const f of ["dev-cycle.mjs", "skills-setup.mjs"]) cpSync(join(resolve(opt("scripts")), "scripts", f), join(dir, "scripts", f));
const log = [step("시작(none)")];
STEPS.forEach((a, i) => log.push(step(`${i + 1}`, a)));

// 라운드 중 전환: superpowers로 F 라운드를 열고 스펙 행을 채운 뒤 agent-skills로 바꾼다
log.push(step("R0", ["--brain", "superpowers", "--simplicity", "ponytail"]));
sh("git", ["add", "-A"]);
sh("git", ["-c", "core.hooksPath=/dev/null", "-c", "user.name=eval", "-c", "user.email=eval@localhost", "commit", "-qm", "switch: superpowers"]);
const open = sh("node", ["scripts/dev-cycle.mjs", "table", "F", "--write", "--title", "우선순위"]);
mkdirSync(join(dir, "docs/specs"), { recursive: true });
writeFileSync(join(dir, "docs/specs/2026-10-27-priority.md"), "# 우선순위\n");
const rows = [...read("tasks/todo.md").matchAll(/^\|\s*(\d+)\s*\|\s*스펙 작성/gm)];
mkdirSync(join(dir, "tasks/evidence"), { recursive: true });
writeFileSync(join(dir, "tasks/evidence/spec.txt"), "사용: superpowers:brainstorming → docs/specs/2026-10-27-priority.md\n");
const fill = sh("node", ["scripts/dev-cycle.mjs", "evidence", rows[0]?.[1] ?? "1", "--file", "tasks/evidence/spec.txt"]);
const before = sh("node", ["scripts/dev-cycle.mjs", "audit"]);
log.push(step("R1 라운드 중 전환", ["--brain", "agent-skills", "--simplicity", "caveman"]));
const after = sh("node", ["scripts/dev-cycle.mjs", "audit"]);
const pick = (t) => t.split("\n").filter((l) => /상향|케이스|두뇌|스펙 작성|H/.test(l)).slice(0, 12);
const mid = { open: open.status, fill: `${fill.status} ${fill.stdout.trim()}${fill.stderr.trim()}`, auditBefore: pick(before.stdout + before.stderr), auditAfter: pick(after.stdout + after.stderr) };
console.log("라운드 중 전환\n  전환 전 audit:\n    " + mid.auditBefore.join("\n    ") + "\n  전환 뒤 audit:\n    " + mid.auditAfter.join("\n    "));
writeFileSync(join(WS, `${opt("out", "switch")}.json`), `${JSON.stringify({ steps: log, midRound: mid }, null, 2)}\n`);
