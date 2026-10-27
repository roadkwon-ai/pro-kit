#!/usr/bin/env node
// 고른 스킬(두뇌·과설계 방지·화면 선택 묶음) 실사용 eval. 계획: docs/plans/2026-10-27-selected-skills-eval.md
// 구성마다 fixture를 만들고, 그 안에서 `claude -p`를 실제 세션처럼(사용자·프로젝트·로컬 설정, 플러그인, 훅) 돌린다.
//   node evals/selected-skills/run.mjs base <이름> <템플릿 폴더>        WS/fx/<이름>에 Better-T-Stack + 템플릿 + 시드(이미 있으면 둔다)
//   node evals/selected-skills/run.mjs prep [--base base] [--suffix ""] [fixture…]   base 사본에 scenarios.json의 구성을 설치
//   node evals/selected-skills/run.mjs behavior <회차> [--scenario 1,2] [--fixtures a,b] [--suffix -old] [--jobs 4] [--go-reply]
//     --go-reply: [confirm]까지 온 뒤에도 진행 지시(reply)를 한 번 더 보낸다. 진행 지시를 확인으로 적지 않는지 본다
//   node evals/selected-skills/run.mjs grade <회차>
// WS는 PKSS_WORKSPACE(기본 os.tmpdir()/pro-kit-selected-skills), 모델은 PKSS_MODEL(기본 claude-sonnet-5-5).
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { grade, rowsOf } from "./checks.mjs";

const ROOT = resolve(import.meta.dirname, "../..");
const HERE = import.meta.dirname;
const WS = resolve(process.env.PKSS_WORKSPACE ?? join(tmpdir(), "pro-kit-selected-skills"));
const MODEL = process.env.PKSS_MODEL ?? "claude-sonnet-5-5";
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

function claude(dir, prompt, resume) {
	return new Promise((done) => {
		const args = ["-p", prompt, "--output-format", "stream-json", "--verbose", "--setting-sources", "user,project,local", "--strict-mcp-config", "--model", MODEL, "--permission-mode", "bypassPermissions", "--max-budget-usd", String(CONF.budgetUsd), "--disallowedTools", ...DENY, ...READ_DENY, "--settings", JSON.stringify(SANDBOX)];
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
		const runDir = runDirOf(iter, sc, config);
		const copy = join(WS, "runs", `${iter}-${sc.id}-${config}`);
		rmSync(copy, { recursive: true, force: true });
		cpSync(join(WS, "fx", config), copy, { recursive: true, verbatimSymlinks: true });
		// Claude Code는 project scope 플러그인을 폴더 경로별로 기록한다. 사본 경로에도 등록해야 세션에 켜진다(끝나면 지운다).
		const plugins = Object.entries(JSON.parse(readFileSync(join(copy, ".claude/settings.json"), "utf8")).enabledPlugins ?? {}).filter(([, v]) => v).map(([k]) => k);
		await serial(() => { for (const id of plugins) sh(copy, "claude", ["plugin", "install", id, "--scope", "project"]); });
		const baseSha = git(copy, "rev-parse", "HEAD").trim();
		const t0 = Date.now();
		const turns = [];
		let session;
		let goSent = !rest.includes("--go-reply");
		for (let t = 0; t < CONF.maxTurns; t++) {
			const r = await claude(copy, t === 0 ? sc.prompt : CONF.reply, session);
			turns.push(r);
			session = r.result?.session_id ?? r.events.find((e) => e.session_id)?.session_id;
			if (r.stop || !session || r.result?.subtype === "error_max_budget_usd") break;
			if (reached(copy, sc.stop)) {
				if (goSent || !sc.stop.confirm) break;
				goSent = true;
			}
		}
		spawnSync("pkill", ["-f", copy]);
		const events = turns.flatMap((r) => r.events);
		const tools = events.flatMap((e) => (e.type === "assistant" ? (e.message?.content ?? []) : []).filter((c) => c.type === "tool_use").map((c) => ({ name: c.name, input: c.input })));
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
		json(join(runDir, "run.json"), { init, copy, base: baseSha, fixture: f, suffix, scenario: sc.id, model: MODEL, tools, commits: git(copy, "log", "--oneline", `${baseSha}..HEAD`).trim() });
		const s = gradeRun(sc, runDir);
		console.log(`eval-${sc.id} ${config}: ${s.passed}/${s.total} (${Math.round(ms / 1000)}s, $${cost.toFixed(2)}, 턴 ${turns.length})`);
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
		const r = await claude(copy, `다음 명령만 실행하고 종료 코드와 마지막 오류 줄을 그대로 보고해. 다른 일은 하지 마: ${rest.slice(1).join(" ")}`);
		console.log(r.result?.result, r.result?.total_cost_usd);
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
