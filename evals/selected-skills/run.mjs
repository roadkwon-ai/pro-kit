#!/usr/bin/env node
// 고른 스킬(두뇌·과설계 방지·화면 선택 묶음) 실사용 eval. 계획: docs/plans/2026-10-27-selected-skills-eval.md
// 구성마다 fixture를 만들고, 그 안에서 `claude -p`를 실제 세션처럼(사용자·프로젝트·로컬 설정, 플러그인, 훅) 돌린다.
//   node evals/selected-skills/run.mjs base <이름> <템플릿 폴더>        WS/fx/<이름>에 Better-T-Stack + 템플릿 + 시드(이미 있으면 둔다)
//   node evals/selected-skills/run.mjs prep [--base base] [--suffix ""] [fixture…]   base 사본에 scenarios.json의 구성을 설치
//   node evals/selected-skills/run.mjs behavior <회차> [--scenario 1,2] [--fixtures a,b] [--suffix -old] [--jobs 4] [--go-reply]
//     --go-reply: [confirm]까지 온 뒤에도 진행 지시(reply)를 한 번 더 보낸다. 진행 지시를 확인으로 적지 않는지 본다
//   node evals/selected-skills/run.mjs grade <회차>
// WS는 PKSS_WORKSPACE(기본 os.tmpdir()/pro-kit-selected-skills), 모델은 PKSS_MODEL(기본 claude-sonnet-5-5).
// PKSS_AGENT=agy면 Antigravity CLI(`agy -p`, 이어 가기 `--conversation`)로 돌린다. 모델은 PKSS_AGY_MODEL(기본: agy 기본 모델).
// PKSS_AGENT=codex면 `codex exec --json`(이어 가기 `exec resume`)으로 돌린다. 실행 파일은 PKSS_CODEX_BIN(기본 codex), 모델은 사용자 설정.
// 채점은 세션 출력의 도구 호출에 프로젝트 훅 기록(.prokit/skills-used.jsonl)의 읽기를 더해 본다(서브에이전트 읽기 포함).
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { grade, rowsOf } from "./checks.mjs";

const ROOT = resolve(import.meta.dirname, "../..");
const HERE = import.meta.dirname;
const WS = resolve(process.env.PKSS_WORKSPACE ?? join(tmpdir(), "pro-kit-selected-skills"));
const AGENT = process.env.PKSS_AGENT ?? "claude";
const MODEL = AGENT === "agy" ? (process.env.PKSS_AGY_MODEL ?? "agy-default") : AGENT === "codex" ? "codex-user-default" : (process.env.PKSS_MODEL ?? "claude-sonnet-5-5");
const CONF = JSON.parse(readFileSync(join(HERE, "scenarios.json"), "utf8"));
const [cmd, ...rest] = process.argv.slice(2);
const opt = (name, def) => {
	const i = rest.indexOf(`--${name}`);
	return i >= 0 ? rest[i + 1] : def;
};
const positional = rest.filter((a, i) => !a.startsWith("--") && !rest[i - 1]?.startsWith("--"));
const sh = (cwd, file, args, extra = {}) => spawnSync(file, args, { cwd, encoding: "utf8", maxBuffer: 64 << 20, ...extra });
const git = (dir, ...args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8" });
const json = (p, v) => {
	mkdirSync(dirname(p), { recursive: true });
	writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`);
};
// fixture 준비(시드·설치 커밋)는 eval 입력이라 pre-commit guard를 끈 채로 커밋한다. eval 실행 중에는 훅이 그대로다.
const NOHOOKS = join(WS, ".nohooks");
const commit = (dir, msg) => {
	mkdirSync(NOHOOKS, { recursive: true });
	git(dir, "add", "-A");
	git(dir, "-c", `core.hooksPath=${NOHOOKS}`, "-c", "user.name=eval", "-c", "user.email=eval@localhost", "commit", "-qm", msg, "--allow-empty");
};

// 격리: pro-kit-feature-packs evals/run.mjs와 같은 네 겹(환경 변수, 저장된 로그인, 명령 차단, OS 샌드박스).
// 사용자 설정은 읽는다(전역 플러그인을 프로젝트에서 끄는 설치기 동작까지 실제처럼 본다).
const DROP = /TOKEN|SECRET|PASSWORD|_KEY|DATABASE_URL|_DSN|POSTGRES|^(CLAUDECODE|SSH_AUTH_SOCK|NEON_.*|PROKIT_.*|ADMIN_.*|SUPABASE_.*|VERCEL_.*|GOOGLE_.*|BETTER_AUTH_.*)$/;
const KEEP = /^ANTHROPIC_/;
const DENY = ["Bash(gh:*)", "Bash(git push*)", "Bash(git remote*)", "Bash(git -C * push*)", "Bash(git -C * remote*)", "Bash(git -c * push*)", "Bash(*vercel*)", "Bash(pnpm release*)", "Bash(*direnv*)", "Bash(neon:*)", "Bash(*neonctl*)", "Bash(*skills:setup*)", "Bash(*skills-setup.mjs*--brain*)", "Bash(*skills-setup.mjs*--simplicity*)", "Bash(*skills-setup.mjs*--matt*)", "Bash(*skills-setup.mjs*--optional*)", "Bash(*skills-setup.mjs*--drop*)", "Bash(*skills-setup.mjs*--update*)"];
const HOME_SECRET_DIRS = ["~/.ssh", "~/.config", "~/.aws", "~/Library/Application Support/com.vercel.cli"];
const HOME_SECRET_FILES = ["~/.netrc", "~/.npmrc"];
const SANDBOX = {
	sandbox: {
		enabled: true,
		failIfUnavailable: true,
		allowUnsandboxedCommands: false,
		filesystem: { denyRead: [dirname(ROOT), ...HOME_SECRET_DIRS, ...HOME_SECRET_FILES], allowRead: [WS], allowWrite: [join(homedir(), "Library/pnpm"), join(homedir(), "Library/Caches/pnpm")] },
		network: { allowedDomains: ["registry.npmjs.org", "ui.shadcn.com", "github.com", "codeload.github.com", "raw.githubusercontent.com", "objects.githubusercontent.com", "fonts.googleapis.com", "fonts.gstatic.com"], strictAllowlist: true, allowLocalBinding: true },
	},
};
const READ_DENY = ["Read(//**/.envrc)", `Read(/${dirname(ROOT)}/**/.env)`, ...HOME_SECRET_DIRS.map((p) => `Read(${p}/**)`), ...HOME_SECRET_FILES.map((p) => `Read(${p})`)];
const SAFE = join(WS, ".no-credentials");
const env = {
	...Object.fromEntries(Object.entries(process.env).filter(([k]) => KEEP.test(k) || !DROP.test(k))),
	GH_CONFIG_DIR: join(SAFE, "gh"),
	GIT_CONFIG_NOSYSTEM: "1",
	GIT_CONFIG_GLOBAL: join(SAFE, "gitconfig"),
	GIT_SSH_COMMAND: "ssh -F /dev/null -o IdentitiesOnly=yes -o IdentityAgent=none -i /dev/null",
	XDG_CONFIG_HOME: join(SAFE, "config"),
	XDG_DATA_HOME: join(SAFE, "data"),
	npm_config_manage_package_manager_versions: "false",
	pnpm_config_manage_package_manager_versions: "false",
	// turbo는 Vercel CLI 인증 파일(~/Library/Application Support/com.vercel.cli)을 읽으려다 샌드박스에 막혀 멈춘다.
	// 설정 폴더를 빈 폴더로 바꾸고 로컬 캐시만 쓴다.
	TURBO_CONFIG_DIR_PATH: join(SAFE, "turbo"),
	VERCEL_CONFIG_DIR_PATH: join(SAFE, "vercel"),
	TURBO_CACHE: "local:rw",
	TURBO_TELEMETRY_DISABLED: "1",
};
function prepareSafe() {
	for (const d of ["gh", "config", "data", "turbo", "vercel"]) mkdirSync(join(SAFE, d), { recursive: true });
	writeFileSync(join(SAFE, "gitconfig"), "[user]\n\tname = eval\n\temail = eval@localhost\n[core]\n\tautocrlf = input\n");
}

// base: 생성 명령은 템플릿 README 그대로(neon). 이미 있으면 다시 만들지 않는다.
function base(name, tpl) {
	const dir = join(WS, "fx", name);
	if (existsSync(join(dir, ".dev-cycle.json"))) return console.log(`${name}: 이미 있음`);
	mkdirSync(join(WS, "fx"), { recursive: true });
	const args = ["create", "better-t-stack@latest", name, "--frontend", "next", "--backend", "self", "--runtime", "none", "--database", "postgres", "--orm", "drizzle", "--db-setup", "docker", "--auth", "better-auth", "--payments", "none", "--api", "orpc", "--addons", "turborepo", "biome", "--examples", "none", "--web-deploy", "none", "--server-deploy", "none", "--package-manager", "pnpm", "--git", "--install"];
	for (const [file, a, cwd] of [["pnpm", args, join(WS, "fx")], ["bash", [join(tpl, "install.sh"), dir, "--brain", "none", "--simplicity", "none"], WS]]) {
		const r = sh(cwd, file, a, { stdio: "inherit" });
		if (r.status !== 0) throw new Error(`${file} 실패`);
	}
	sh(dir, "pnpm", ["check"]);
	commit(dir, "prokit install");
	git(dir, "config", "core.hooksPath", NOHOOKS);
	git(dir, "config", "user.name", "eval");
	git(dir, "config", "user.email", "eval@localhost");
	const r = sh(dir, "bash", [join(HERE, "seed.sh"), dir, tpl]);
	git(dir, "config", "--unset", "core.hooksPath");
	if (r.status !== 0) throw new Error(`seed 실패: ${r.stderr}`);
}

// prep: base 사본에 구성을 설치하고 설치 확인 결과를 남긴다(설치 자체가 전환 검사의 첫 단계).
function prep() {
	const from = join(WS, "fx", opt("base", "base"));
	const suffix = opt("suffix", "");
	const names = positional.length ? positional : Object.keys(CONF.fixtures);
	for (const n of names) {
		const dir = join(WS, "fx", n + suffix);
		rmSync(dir, { recursive: true, force: true });
		cpSync(from, dir, { recursive: true, verbatimSymlinks: true });
		const setup = sh(dir, "node", ["scripts/skills-setup.mjs", ...CONF.fixtures[n]]);
		const check = sh(dir, "pnpm", ["--silent", "skills:check"]);
		const agents = sh(dir, "pnpm", ["--silent", "agents:check"]);
		const log = `$ skills:setup ${CONF.fixtures[n].join(" ")} → exit ${setup.status}\n${setup.stdout}${setup.stderr}\n$ skills:check → exit ${check.status}\n${check.stdout}${check.stderr}\n$ agents:check → exit ${agents.status}\n${agents.stdout}${agents.stderr}`;
		writeFileSync(join(WS, "fx", `${n}${suffix}.setup.log`), log);
		commit(dir, `eval config: ${CONF.fixtures[n].join(" ")}`);
		console.log(`${n}${suffix}: setup ${setup.status}, skills:check ${check.status}, agents:check ${agents.status}`);
	}
}

function claude(dir, prompt, resume, budget) {
	return new Promise((done) => {
		const args = ["-p", prompt, "--output-format", "stream-json", "--verbose", "--setting-sources", "user,project,local", "--strict-mcp-config", "--model", MODEL, "--permission-mode", "bypassPermissions", "--max-budget-usd", String(budget ?? CONF.budgetUsd), "--disallowedTools", ...DENY, ...READ_DENY, "--settings", JSON.stringify(SANDBOX)];
		if (resume) args.push("--resume", resume);
		const p = spawn("claude", args, { cwd: dir, env, stdio: ["ignore", "pipe", "pipe"] });
		const events = [];
		let buf = "";
		let stop = null;
		const timer = setTimeout(() => {
			stop = "timeout";
			p.kill("SIGTERM");
		}, 2_400_000);
		p.stdout.on("data", (d) => {
			buf += d;
			for (let i = buf.indexOf("\n"); i >= 0; i = buf.indexOf("\n")) {
				const line = buf.slice(0, i).trim();
				buf = buf.slice(i + 1);
				try {
					if (line) events.push(JSON.parse(line));
				} catch {}
			}
		});
		p.stderr.on("data", () => {});
		p.on("close", () => {
			clearTimeout(timer);
			done({ events, stop, result: events.findLast((e) => e.type === "result") });
		});
	});
}

// Antigravity: stream-json의 step_update(도구)와 result를 Claude 꼴(result.session_id·result·subtype)로 맞춘다
function agy(dir, prompt, resume) {
	return new Promise((done) => {
		const args = ["-p", prompt, "--output-format", "stream-json", "--dangerously-skip-permissions", "--sandbox"];
		if (process.env.PKSS_AGY_MODEL) args.push("--model", process.env.PKSS_AGY_MODEL);
		if (resume) args.push("--conversation", resume);
		const p = spawn("agy", args, { cwd: dir, env, stdio: ["ignore", "pipe", "pipe"] });
		const events = [];
		let buf = "";
		let stop = null;
		const timer = setTimeout(() => {
			stop = "timeout";
			p.kill("SIGTERM");
		}, 2_400_000);
		p.stdout.on("data", (d) => {
			buf += d;
			for (let i = buf.indexOf("\n"); i >= 0; i = buf.indexOf("\n")) {
				const line = buf.slice(0, i).trim();
				buf = buf.slice(i + 1);
				try {
					if (line) events.push(JSON.parse(line));
				} catch {}
			}
		});
		p.stderr.on("data", () => {});
		p.on("close", () => {
			clearTimeout(timer);
			const r = events.findLast((e) => e.event === "result")?.result;
			const id = r?.conversation_id ?? events.find((e) => e.conversation_id)?.conversation_id;
			done({ events, stop, result: r && { session_id: id, result: r.response, subtype: r.status === "SUCCESS" ? "success" : String(r.status).toLowerCase(), total_cost_usd: 0, usage: { input_tokens: r.usage?.input_tokens, output_tokens: r.usage?.output_tokens } } });
		});
	});
}
// Codex: JSONL의 thread.started(id)·item.completed(agent_message)를 Claude 꼴로 맞춘다. stdin을 닫아야 끝난다.
// 샌드박스: workspace-write에서는 Node의 os.uptime이 EPERM이라 pnpm·turbo·next가 돌지 않는다(0.164.0-alpha.11.1 실측).
// 그래서 11-03 손 실측처럼 샌드박스 없이 돌리고 격리는 환경 변수(비밀값 빼기)에 맡긴다. 훅 신뢰는 /hooks 대신 --dangerously-bypass-hook-trust
const rollSeen = new Map();
function codex(dir, prompt, resume) {
	return new Promise((done) => {
		const opts = ["--json", "--dangerously-bypass-hook-trust", "--skip-git-repo-check", "--dangerously-bypass-approvals-and-sandbox"];
		const args = resume ? ["exec", "resume", ...opts, resume, prompt] : ["exec", ...opts, prompt];
		const p = spawn(process.env.PKSS_CODEX_BIN ?? "codex", args, { cwd: dir, env, stdio: ["ignore", "pipe", "pipe"] });
		const events = [];
		let buf = "";
		let stop = null;
		const timer = setTimeout(() => {
			stop = "timeout";
			p.kill("SIGTERM");
		}, 2_400_000);
		p.stdout.on("data", (d) => {
			buf += d;
			for (let i = buf.indexOf("\n"); i >= 0; i = buf.indexOf("\n")) {
				const line = buf.slice(0, i).trim();
				buf = buf.slice(i + 1);
				try {
					if (line) events.push(JSON.parse(line));
				} catch {}
			}
		});
		p.stderr.on("data", () => {});
		p.on("close", () => {
			clearTimeout(timer);
			const id = resume ?? events.find((e) => e.type === "thread.started")?.thread_id;
			// exec --json은 spawn_agent를 내보내지 않는다. 세션 기록(rollout)에서 이번 턴 뒤로 붙은 호출을 가져온다(지시 본문은 암호화돼 이름만)
			const home = process.env.CODEX_HOME ?? join(homedir(), ".codex");
			const roll = id && sh(home, "find", ["sessions", "-name", `*${id}.jsonl`]).stdout.split("\n").filter(Boolean)[0];
			if (roll) for (const l of readFileSync(join(home, roll), "utf8").split("\n").slice(rollSeen.get(id) ?? 0)) {
				try {
					const pl = JSON.parse(l).payload;
					if (pl?.type === "function_call" && pl.name === "spawn_agent") events.push({ codexSpawn: JSON.parse(pl.arguments) });
				} catch {}
			}
			if (roll) rollSeen.set(id, readFileSync(join(home, roll), "utf8").split("\n").length - 1);
			const msg = events.filter((e) => e.type === "item.completed" && e.item?.type === "agent_message").at(-1)?.item?.text;
			const failed = events.some((e) => e.type === "turn.failed");
			const u = events.findLast((e) => e.type === "turn.completed")?.usage ?? {};
			done({ events, stop, result: id && { session_id: id, result: msg, subtype: failed ? "error" : "success", total_cost_usd: 0, usage: { input_tokens: u.input_tokens, output_tokens: u.output_tokens } } });
		});
	});
}
const session = (dir, prompt, resume, budget) => (AGENT === "agy" ? agy(dir, prompt, resume) : AGENT === "codex" ? codex(dir, prompt, resume) : claude(dir, prompt, resume, budget));

// 도구 호출을 Claude 꼴({ name, input })로 모은다. checks.mjs는 Read file_path, Bash command, Agent subagent_type·prompt를 본다
const AGY_TOOL = { read_file: "Read", view_file: "Read", run_command: "Bash", invoke_subagent: "Agent", write_file: "Write", write_to_file: "Write", edit_file: "Edit", replace_file_content: "Edit", multi_replace_file_content: "Edit" };
function toolsOf(events) {
	const out = [];
	for (const e of events) {
		if (e.type === "assistant") for (const c of e.message?.content ?? []) if (c.type === "tool_use") out.push({ name: c.name, input: c.input });
		// Codex: 셸 명령(읽기도 셸이다), 파일 바꾸기, 서브에이전트(spawn_agent·collab 도구)
		const it = e.type === "item.completed" ? e.item : null;
		if (it?.type === "command_execution") out.push({ name: "Bash", input: { command: it.command } });
		if (it?.type === "file_change") for (const c of it.changes ?? []) out.push({ name: "Edit", input: { file_path: c.path } });
		if (e.codexSpawn) out.push({ name: "Agent", input: { subagent_type: e.codexSpawn.agent_type, prompt: "(Codex: 지시 본문은 세션 기록에 암호화돼 있다)" } });
		const u = e.step_update;
		// invoke_subagent는 기다리지 않고 돌아와 ACTIVE 줄만 남는다. 다른 도구는 DONE 줄 하나만 센다
		if (u?.step_type === "tool" && u.tool_info && (u.tool_name === "invoke_subagent" ? u.state === "ACTIVE" : u.state === "DONE")) {
			const t = u.tool_info.parameters ?? {};
			const name = AGY_TOOL[u.tool_name] ?? u.tool_name;
			const file = t.Path ?? t.AbsolutePath ?? t.TargetFile ?? t.file_path;
			out.push({ name, input: { ...t, ...(file ? { file_path: file } : {}), ...(t.CommandLine ? { command: t.CommandLine } : {}), ...(name === "Agent" ? { subagent_type: t.TypeName, prompt: JSON.stringify(t) } : {}) } });
		}
	}
	return out;
}
// 훅이 남긴 스킬 파일 읽기(서브에이전트 포함)를 Read로 더한다. 세션 출력에 서브에이전트 도구가 없는 호스트를 위해
const hookReads = (copy) => (existsSync(join(copy, ".prokit/skills-used.jsonl")) ? readFileSync(join(copy, ".prokit/skills-used.jsonl"), "utf8").split("\n").filter(Boolean).flatMap((l) => { try { const j = JSON.parse(l); return j.skill ? [{ name: "Read", input: { file_path: `.agents/skills/${j.skill}/${j.ref ?? "SKILL.md"}` }, hook: true, agentType: j.agentType }] : []; } catch { return []; } }) : []);

function reached(dir, stop) {
	const p = join(dir, "tasks/todo.md");
	if (!existsSync(p)) return false;
	const rows = rowsOf(readFileSync(p, "utf8"));
	if (!rows.length) return false;
	if (stop.rows) return stop.rows.every((name) => rows.some((r) => r.text.startsWith(name) && r.evidence));
	return rows.filter((r) => !r.text.startsWith("[confirm]")).every((r) => r.evidence);
}

// ~/.claude/plugins/installed_plugins.json을 여러 작업이 동시에 고치면 서로 덮어쓴다. 등록·해제는 한 번에 하나만 한다.
let chain = Promise.resolve();
const serial = (f) => (chain = chain.then(f, f));

async function pool(items, jobs, f) {
	let next = 0;
	await Promise.all(Array.from({ length: Math.min(jobs, items.length) }, async () => {
		while (next < items.length) await f(items[next++]);
	}));
}
let portSeq = 0;
const runDirOf = (iter, sc, config) => join(WS, `iteration-${iter}`, `eval-${sc.id}-${sc.name}`, config, "run-1");

async function behavior(iter) {
	prepareSafe();
	const only = opt("scenario")?.split(",").map(Number);
	const fx = opt("fixtures")?.split(",");
	const suffix = opt("suffix", "");
	const scs = CONF.scenarios.filter((s) => !only || only.includes(s.id));
	const jobs = scs.flatMap((sc) => sc.fixtures.filter((f) => !fx || fx.includes(f)).map((f) => ({ sc, f })));
	for (const sc of scs) json(join(WS, `iteration-${iter}`, `eval-${sc.id}-${sc.name}`, "eval_metadata.json"), { eval_id: sc.id, eval_name: sc.name, prompt: sc.prompt, assertions: [] });
	await pool(jobs, Number(opt("jobs", 4)), async ({ sc, f }) => {
		const config = f + suffix;
		// 다른 호스트로 돌린 결과는 결과 폴더와 사본 이름에 호스트를 붙여 Claude 결과와 나란히 둔다
		const label = AGENT === "claude" ? config : `${config}-${AGENT}`;
		const runDir = runDirOf(iter, sc, label);
		const copy = join(WS, "runs", `${iter}-${sc.id}-${label}`);
		rmSync(copy, { recursive: true, force: true });
		cpSync(join(WS, "fx", config), copy, { recursive: true, verbatimSymlinks: true });
		// 이 기기의 3001은 다른 개발 서버가 쓸 수 있고 사본도 동시에 돈다. 사본마다 웹 포트를 따로 준다(인증 주소도 같이)
		const port = String(Number(process.env.PKSS_PORT_BASE ?? 3200) + ++portSeq);
		for (const f of ["apps/web/package.json", "apps/web/.env", "apps/web/src/utils/orpc.ts"]) {
			const p = join(copy, f);
			if (existsSync(p)) writeFileSync(p, readFileSync(p, "utf8").replace(/--port 3001\b/g, `--port ${port}`).replace(/localhost:3001\b/g, `localhost:${port}`));
		}
		commit(copy, `eval port ${port}`);
		// 샌드박스는 Turbopack 파일 감시(FSEvents)를 막아 세션 안에서는 개발 서버가 뜨지 않는다.
		// 사용자 기기처럼 서버를 샌드박스 밖에서 미리 띄워 둔다(세션이 띄우려 하면 Next가 이미 도는 서버 주소를 알려 준다)
		const dev = spawn("pnpm", ["dev"], { cwd: join(copy, "apps/web"), env: process.env, detached: true, stdio: "ignore" });
		for (let i = 0; i < 90 && sh(copy, "curl", ["-s", "-o", "/dev/null", "-m", "5", `http://localhost:${port}/`]).status !== 0; i++) await new Promise((r) => setTimeout(r, 2000));
		// Claude Code는 project scope 플러그인을 폴더 경로별로 기록한다. 사본 경로에도 등록해야 세션에 켜진다(끝나면 지운다).
		const plugins = AGENT === "claude" ? Object.entries(JSON.parse(readFileSync(join(copy, ".claude/settings.json"), "utf8")).enabledPlugins ?? {}).filter(([, v]) => v).map(([k]) => k) : [];
		await serial(() => { for (const id of plugins) sh(copy, "claude", ["plugin", "install", id, "--scope", "project"]); });
		const baseSha = git(copy, "rev-parse", "HEAD").trim();
		const t0 = Date.now();
		const turns = [];
		let sid;
		let goSent = !rest.includes("--go-reply");
		for (let t = 0; t < CONF.maxTurns; t++) {
			const r = await session(copy, t === 0 ? sc.prompt : CONF.reply, sid, sc.budgetUsd);
			turns.push(r);
			sid = r.result?.session_id ?? r.events.find((e) => e.session_id)?.session_id;
			if (r.stop || !sid || r.result?.subtype === "error_max_budget_usd") break;
			if (reached(copy, sc.stop)) {
				if (goSent || !sc.stop.confirm) break;
				goSent = true;
			}
		}
		spawnSync("pkill", ["-f", copy]);
		try { process.kill(-dev.pid); } catch {}
		for (const pid of sh(copy, "lsof", ["-t", "-nP", `-iTCP:${port}`, "-sTCP:LISTEN"]).stdout.split("\n").filter(Boolean)) try { process.kill(Number(pid)); } catch {}
		const events = turns.flatMap((r) => r.events);
		const tools = [...toolsOf(events), ...hookReads(copy)];
		// audit·diff는 등록을 지우기 전에 남긴다. 해제가 .claude/settings.json의 enabledPlugins를 바꾼다
		const audit = sh(copy, "node", ["scripts/dev-cycle.mjs", "audit"]);
		mkdirSync(join(runDir, "outputs"), { recursive: true });
		writeFileSync(join(runDir, "outputs", "response.md"), turns.map((r, i) => `## 턴 ${i + 1}\n\n${r.result?.result ?? "(응답 없음)"}`).join("\n\n"));
		const todo = join(copy, "tasks/todo.md");
		writeFileSync(join(runDir, "outputs", "todo.md"), existsSync(todo) ? readFileSync(todo, "utf8") : "(없음)\n");
		writeFileSync(join(runDir, "outputs", "audit.txt"), `exit ${audit.status}\n${audit.stdout}${audit.stderr}`);
		git(copy, "add", "-A", "-N");
		writeFileSync(join(runDir, "outputs", "changes.diff"), git(copy, "diff", baseSha, "--", ".", ":!.omc", ":!.omx", ":!node_modules") || "(바뀐 파일 없음)\n");
		await serial(() => { for (const id of plugins) sh(copy, "claude", ["plugin", "uninstall", id, "--scope", "project"]); });
		writeFileSync(join(runDir, "transcript.jsonl"), events.map((e) => JSON.stringify(e)).join("\n"));
		writeFileSync(join(runDir, "transcript.md"), [`## Eval Prompt\n\n${sc.prompt}\n\n## Tool calls\n`, ...tools.map((x) => `- ${x.name}: ${JSON.stringify(x.input).slice(0, 400)}`), "\n## Final response\n", turns.at(-1)?.result?.result ?? "(없음)"].join("\n"));
		const cost = turns.reduce((s, r) => s + (r.result?.total_cost_usd ?? 0), 0);
		const ms = Date.now() - t0;
		const tok = turns.reduce((s, r) => { const u = r.result?.usage ?? {}; return s + (u.input_tokens ?? 0) + (u.output_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0); }, 0);
		json(join(runDir, "timing.json"), { total_tokens: tok, duration_ms: ms, total_duration_seconds: Math.round(ms / 100) / 10, total_cost_usd: Math.round(cost * 100) / 100, turns: turns.length, stop: turns.at(-1)?.stop ?? turns.at(-1)?.result?.subtype ?? null });
		const initEv = events.find((e) => e.type === "system" && e.subtype === "init") ?? {};
		const init = { plugins: (initEv.plugins ?? []).map((p) => p.name ?? p), skills: initEv.skills ?? initEv.slash_commands ?? [] };
		json(join(runDir, "run.json"), { init, copy, base: baseSha, fixture: f, suffix, scenario: sc.id, agent: AGENT, model: MODEL, tools, commits: git(copy, "log", "--oneline", `${baseSha}..HEAD`).trim() });
		const s = gradeRun(sc, runDir);
		console.log(`eval-${sc.id} ${label}: ${s.passed}/${s.total} (${Math.round(ms / 1000)}s, $${cost.toFixed(2)}, 턴 ${turns.length})`);
	});
}

function gradeRun(sc, runDir) {
	const meta = JSON.parse(readFileSync(join(runDir, "run.json"), "utf8"));
	const g = grade({ sc, meta, runDir, conf: CONF });
	json(join(runDir, "grading.json"), { ...g, execution_metrics: { total_tool_calls: meta.tools.length } });
	return g.summary;
}

function regrade(iter) {
	for (const sc of CONF.scenarios) {
		const d = join(WS, `iteration-${iter}`, `eval-${sc.id}-${sc.name}`);
		if (!existsSync(d)) continue;
		for (const config of readdirSync(d).filter((c) => existsSync(join(d, c, "run-1/run.json")))) {
			// Codex·Antigravity는 도구 호출 정규화를 고친 뒤에도 다시 뽑게 대화 기록에서 새로 만든다(turn으로 이은 회차는 그대로 둔다)
			const runJson = join(d, config, "run-1/run.json");
			const meta = JSON.parse(readFileSync(runJson, "utf8"));
			if (meta.agent && meta.agent !== "claude" && !meta.turnTools) {
				const events = readFileSync(join(d, config, "run-1/transcript.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
				json(runJson, { ...meta, tools: [...toolsOf(events), ...hookReads(meta.copy)] });
			}
			const s = gradeRun(sc, join(d, config, "run-1"));
			console.log(`eval-${sc.id} ${config}: ${s.passed}/${s.total}`);
		}
	}
}

if (process.argv[1] === import.meta.filename) {
	if (cmd === "probe") {
		// 샌드박스 확인: fixture 사본에서 명령 하나를 돌리게 하고 결과만 본다
		prepareSafe();
		const copy = join(WS, "runs", "probe");
		rmSync(copy, { recursive: true, force: true });
		cpSync(join(WS, "fx", rest[0]), copy, { recursive: true, verbatimSymlinks: true });
		const r = await session(copy, `다음 명령만 실행하고 종료 코드와 마지막 오류 줄을 그대로 보고해. 다른 일은 하지 마: ${rest.slice(1).join(" ")}`);
		console.log(r.result?.result, r.result?.total_cost_usd);
		process.exit(0);
	}
	if (cmd === "turn") {
		// 이미 돈 사본에서 한 턴만 더 돌리고 같은 채점을 한다(예: 샌드박스 밖에서 찍은 스크린샷을 주고 리뷰 행만 다시).
		//   node run.mjs turn <회차> <시나리오 id> <사본 폴더 이름(runs/ 아래)> "<프롬프트>"
		prepareSafe();
		const [iter, id, name, prompt] = rest;
		const sc = CONF.scenarios.find((s) => s.id === Number(id));
		const copy = join(WS, "runs", name);
		const meta0 = JSON.parse(readFileSync(join(WS, `iteration-${name.split("-")[0]}`, `eval-${sc.id}-${sc.name}`, name.split("-").slice(2).join("-"), "run-1", "run.json"), "utf8"));
		const runDir = runDirOf(iter, sc, meta0.fixture);
		const r = await session(copy, prompt, undefined, sc.budgetUsd);
		const tools = toolsOf(r.events);
		const audit = sh(copy, "node", ["scripts/dev-cycle.mjs", "audit"]);
		mkdirSync(join(runDir, "outputs"), { recursive: true });
		writeFileSync(join(runDir, "outputs", "response.md"), r.result?.result ?? "(응답 없음)");
		writeFileSync(join(runDir, "outputs", "todo.md"), readFileSync(join(copy, "tasks/todo.md"), "utf8"));
		writeFileSync(join(runDir, "outputs", "audit.txt"), `exit ${audit.status}\n${audit.stdout}${audit.stderr}`);
		writeFileSync(join(runDir, "outputs", "changes.diff"), (git(copy, "add", "-A", "-N"), git(copy, "diff", "HEAD", "--", ".", ":!node_modules")));
		writeFileSync(join(runDir, "transcript.jsonl"), r.events.map((e) => JSON.stringify(e)).join("\n"));
		json(join(runDir, "eval_prompt.json"), { prompt });
		json(join(runDir, "timing.json"), { total_duration_seconds: null, total_cost_usd: Math.round((r.result?.total_cost_usd ?? 0) * 100) / 100, stop: r.stop ?? r.result?.subtype ?? null });
		// 앞 회차 도구 호출도 합쳐 채점한다(브리프·구현 단계는 앞 회차에서 했다)
		json(join(runDir, "run.json"), { ...meta0, tools: [...meta0.tools.filter((t) => !t.hook), ...tools, ...hookReads(copy)], turnTools: tools.length });
		const s = gradeRun(sc, runDir);
		console.log(`eval-${sc.id} ${name} turn: ${s.passed}/${s.total} ($${(r.result?.total_cost_usd ?? 0).toFixed(2)})`);
		process.exit(0);
	}
	if (cmd === "base") base(rest[0], resolve(rest[1]));
	else if (cmd === "prep") prep();
	else if (cmd === "behavior") await behavior(rest[0]);
	else if (cmd === "grade") regrade(rest[0]);
	else {
		console.error("사용법: 파일 머리 주석");
		process.exit(2);
	}
}
