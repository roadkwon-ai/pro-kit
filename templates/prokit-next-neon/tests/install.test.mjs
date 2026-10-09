import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { test } from "node:test";
import { ensureBiomeConfig, ensureClaudeHook, ensureGitignore, ensureTurboAgentGuidance, preflight } from "../install.mjs";
import { TEMPLATE, TEMPLATE_FILES } from "./helpers.mjs";

function fakeBts(prefix = "prokit-") {
  const root = mkdtempSync(join(tmpdir(), prefix));
  const w = (rel, s) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), s);
  };
  w("package.json", '{\n\t"name": "fake",\n\t"scripts": {\n\t\t"check-types": "turbo run check-types",\n\t\t"build": "turbo run build",\n\t\t"check": "biome check --write .",\n\t\t"db:generate": "turbo run db:generate -F @fake/db --",\n\t\t"db:migrate": "turbo run db:migrate -F @fake/db --",\n\t\t"db:push": "x"\n\t}\n}\n');
  w("biome.json", "{}\n");
  w("apps/web/package.json", JSON.stringify({ dependencies: { next: "16.0.0" } }));
  w("packages/db/drizzle.config.ts", "export default {};\n");
  w("packages/api/src/index.ts", "\n");
  w("packages/auth/src/index.ts", "\n");
  w(".gitignore", "node_modules\n");
  execFileSync("git", ["init", "-q", "-b", "master"], { cwd: root });
  return root;
}
const install = (target, ...flags) =>
  spawnSync("bash", [join(TEMPLATE, "install.sh"), target, "--skip-skills", ...flags], { encoding: "utf8" });
function snapshot(root) {
  const out = {};
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === ".git") continue;
      const p = join(d, e.name);
      if (e.isSymbolicLink()) out[relative(root, p)] = `link:${readlinkSync(p)}`;
      else if (e.isDirectory()) walk(p);
      else out[relative(root, p)] = createHash("sha256").update(readFileSync(p)).digest("hex");
    }
  };
  walk(root);
  return out;
}

test("설치: 파일·스킬 링크·Codex·Antigravity 에이전트·스크립트·설정", () => {
  const root = fakeBts();
  const r = install(root);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  for (const f of ["AGENTS.md", "CLAUDE.md", "GLOSSARY.md", "scripts/dev-cycle.mjs", "docs/dev-workflow.md", ".agents/skills/prokit-dev-cycle/SKILL.md"]) {
    assert.ok(existsSync(join(root, f)), f);
  }
  const link = join(root, ".claude/skills/prokit-web");
  assert.ok(lstatSync(link).isSymbolicLink());
  assert.ok(existsSync(join(link, "SKILL.md")));
  assert.match(readFileSync(join(root, ".codex/agents/prokit-reviewer.toml"), "utf8"), /read-only/);
  assert.match(readFileSync(join(root, ".agents/agents/prokit-reviewer.md"), "utf8"), /^mainAgent: false$/m);
  const pkgText = readFileSync(join(root, "package.json"), "utf8");
  assert.match(pkgText, /^\t"scripts"/m, "탭 들여쓰기 보존");
  const pkg = JSON.parse(pkgText);
  assert.equal(pkg.scripts["dev-cycle"], "node scripts/dev-cycle.mjs");
  assert.equal(pkg.scripts["agents:check"], "node scripts/sync-agents.mjs --check");
  assert.equal(pkg.scripts["skills:setup"], "node scripts/skills-setup.mjs");
  assert.equal(pkg.scripts["skills:check"], "node scripts/skills-setup.mjs --check");
  assert.equal(pkg.scripts["skills:update"], "node scripts/skills-setup.mjs --update");
  assert.equal(pkg.scripts["vercel:deploy"], "node scripts/vercel-deploy.mjs");
  assert.equal(pkg.scripts.release, "node scripts/release.mjs");
  assert.equal(pkg.scripts["export:html"], "node scripts/export-html.mjs");
  const hooks = JSON.parse(readFileSync(join(root, ".claude/settings.json"), "utf8")).hooks.SessionStart;
  assert.deepEqual(hooks, [{ hooks: [{ type: "command", command: 'node "$CLAUDE_PROJECT_DIR/scripts/load-keys.mjs"' }] }]);
  // vercel deploy는 .gitignore를 따르지 않는다. 로컬 .env가 배포 소스에 올라가지 않게 한다
  assert.match(readFileSync(join(root, ".vercelignore"), "utf8"), /^\.env$\n^\.env\.\*$\n^!\.env\.schema$/m);
  assert.ok(existsSync(join(root, "skills.manifest.json")));
  assert.match(r.stdout, /--skip-skills\) → 나중에 pnpm skills:setup/);
  assert.equal(pkg.scripts.check, "biome check --write .");
  const cfg = JSON.parse(readFileSync(join(root, ".dev-cycle.json"), "utf8"));
  assert.equal(cfg.defaultBranch, "master");
  assert.equal(cfg.commands.typecheck, "pnpm check-types");
  assert.equal(cfg.commands.lint, "pnpm exec biome check .");
  // turbo interactive 태스크는 TTY 없는 에이전트 셸에서 실패하므로 패키지 스크립트를 직접 부른다
  assert.equal(cfg.commands.dbGenerate, "pnpm --filter @fake/db db:generate");
  assert.equal(cfg.commands.dbMigrate, "pnpm --filter @fake/db db:migrate");
  assert.equal(cfg.commands.dbPush, undefined);
  assert.equal(cfg.commands.test, undefined);
  const ignored = readFileSync(join(root, ".gitignore"), "utf8").split("\n");
  for (const l of ["tasks/evidence/", ".omc/", ".omx/", ".env.*", "!.env.schema", "**/.impeccable/review/", "/html/"]) assert.ok(ignored.includes(l), `.gitignore에 ${l} 없음`);
  // status는 외부 스킬 업데이트를 확인한다. 테스트가 GitHub에 가지 않게 확인을 끈다.
  mkdirSync(join(root, "node_modules/.cache"), { recursive: true });
  writeFileSync(join(root, "node_modules/.cache/skills-update.json"), '{"mode":"off"}');
  const dc = spawnSync(process.execPath, ["scripts/dev-cycle.mjs", "status"], { cwd: root, encoding: "utf8" });
  assert.equal(dc.status, 0);
  assert.match(dc.stdout, /활성 라운드 없음/);
  assert.deepEqual(JSON.parse(readFileSync(join(root, "node_modules/.cache/skills-update.json"), "utf8")), { mode: "off" }, "확인을 끄면 원격을 보지 않는다");
});

test("두 번째 실행은 아무것도 바꾸지 않는다 (멱등)", () => {
  const root = fakeBts();
  assert.equal(install(root).status, 0);
  const before = snapshot(root);
  const r = install(root);
  assert.equal(r.status, 0);
  assert.deepEqual(snapshot(root), before);
  assert.match(r.stdout, /복사 0/);
  // 설치기가 채운 .dev-cycle.json은 "템플릿과 다름"으로 보고하지 않고 --diff에도 넣지 않는다
  assert.match(r.stdout, /유지\(템플릿과 다름\) 없음/);
  assert.match(r.stdout, /^\.dev-cycle\.json: 설치기가 채움, 유지$/m);
  assert.doesNotMatch(install(root, "--diff").stdout, /^[-+]{3} .*\.dev-cycle\.json/m);
});

test("기존 AGENTS.md는 보존하고 템플릿 블록을 한 번만 덧붙인다", () => {
  const root = fakeBts();
  writeFileSync(join(root, "AGENTS.md"), "# 기존 규칙\n- 한국어로 답한다\n");
  install(root);
  install(root);
  const s = readFileSync(join(root, "AGENTS.md"), "utf8");
  assert.ok(s.startsWith("# 기존 규칙\n- 한국어로 답한다\n"));
  assert.equal(s.split("<!-- prokit-template:start -->").length - 1, 1);
});

test("옛 bts-template 블록이 있으면 덧붙이지 않고, 옛 bts-* 이름을 경고한다", () => {
  const root = fakeBts();
  const old = "# 기존 규칙\n<!-- bts-template:start -->\n옛 블록\n<!-- bts-template:end -->\n";
  writeFileSync(join(root, "AGENTS.md"), old);
  mkdirSync(join(root, ".agents/skills/bts-web"), { recursive: true });
  mkdirSync(join(root, ".claude/agents"), { recursive: true });
  writeFileSync(join(root, ".claude/agents/bts-reviewer.md"), "x\n");
  const preview = install(root, "--diff");
  assert.match(preview.stdout, /유지\(템플릿과 다름\) [^\n]*AGENTS\.md/);
  assert.match(preview.stdout, /옛 이름이 남아 있다: \.agents\/skills\/bts-web, \.claude\/agents\/bts-reviewer\.md/);
  const r = install(root);
  assert.match(r.stdout, /옛 이름이 남아 있다/);
  assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), old);
});

test("공백과 한글이 든 경로에도 설치된다", () => {
  const root = fakeBts("my app 프로젝트-");
  assert.equal(install(root).status, 0);
  assert.ok(existsSync(join(root, ".claude/skills/prokit-dev-cycle/SKILL.md")));
});

test("사전 점검 실패는 exit 1이고 파일을 만들지 않는다", () => {
  const notGit = mkdtempSync(join(tmpdir(), "nogit-"));
  mkdirSync(join(notGit, "apps/web"), { recursive: true });
  writeFileSync(join(notGit, "apps/web/package.json"), JSON.stringify({ dependencies: { next: "16" } }));
  const r = install(notGit);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /git 저장소가 아니다/);
  assert.equal(existsSync(join(notGit, "AGENTS.md")), false);

  const noNext = fakeBts();
  writeFileSync(join(noNext, "apps/web/package.json"), "{}");
  assert.equal(install(noNext).status, 1);
});

test("도메인 스킬(Claude·Codex 공용): 템플릿 문서가 모두 언급한다", () => {
  const manifest = JSON.parse(readFileSync(join(TEMPLATE_FILES, "skills.manifest.json"), "utf8"));
  const names = manifest.skills.filter((e) => e.agents.includes("claude-code")).flatMap((e) => e.skills);
  assert.ok(names.length > 0);
  const corpus = ["AGENTS.md", "CLAUDE.md", "GLOSSARY.md"]
    .map((f) => readFileSync(join(TEMPLATE_FILES, f), "utf8"))
    .concat(readdirSync(join(TEMPLATE_FILES, ".agents/skills"), { recursive: true })
      .filter((f) => f.endsWith(".md"))
      .map((f) => readFileSync(join(TEMPLATE_FILES, ".agents/skills", f), "utf8")))
    .join("\n");
  const indirect = new Set(["grilling"]);
  for (const n of names) if (!indirect.has(n)) assert.ok(corpus.includes(n), `${n}을 어떤 문서도 언급하지 않는다`);
});

test("biome.json: 벤더 스킬, 도구 상태 파일, 생성물을 빼고 shadcn 두 파일에만 a11y 3개를 끈다 (한 번만)", () => {
  const ignores = [
    "!.agents/skills", "!skills-lock.json", "!**/.omc", "!**/.omx", "!**/.impeccable", "!.claude", "!.codex",
    "!packages/db/src/migrations", "!packages/db/src/schema/auth.ts", "!apps/web/src/env.ts", "!packages/db/src/env.ts",
    "!html",
  ];
  const override = "overrides(shadcn label.tsx·input-group.tsx a11y 3개 끔)";
  const shadcn = ["packages/ui/src/components/label.tsx", "packages/ui/src/components/input-group.tsx"];
  const root = mkdtempSync(join(tmpdir(), "biome-"));
  const p = join(root, "biome.json");
  writeFileSync(p, '{\n\t"files": {\n\t\t"includes": ["**", "!**/.next"]\n\t}\n}\n');
  assert.deepEqual(ensureBiomeConfig(root), [...ignores, override]);
  const cfg = JSON.parse(readFileSync(p, "utf8"));
  assert.deepEqual(cfg.files.includes, ["**", "!**/.next", ...ignores]);
  assert.deepEqual(cfg.overrides, [{
    includes: shadcn,
    linter: { rules: { a11y: { noLabelWithoutControl: "off", useKeyWithClickEvents: "off", useSemanticElements: "off" } } },
  }]);
  assert.match(readFileSync(p, "utf8"), /^\t"files"/m);
  assert.deepEqual(ensureBiomeConfig(root), []);

  // 사용자가 고친 같은 폴더 override는 그대로 두고 새로 더하지 않는다
  const mine = { includes: ["packages/ui/src/components/label.tsx"], linter: { enabled: false } };
  writeFileSync(p, JSON.stringify({ overrides: [mine] }));
  ensureBiomeConfig(root);
  const cfg2 = JSON.parse(readFileSync(p, "utf8"));
  assert.deepEqual(cfg2.files.includes, ["**", ...ignores]);
  assert.deepEqual(cfg2.overrides, [mine]);

  const bare = mkdtempSync(join(tmpdir(), "biome-"));
  assert.equal(ensureBiomeConfig(bare), null);
});

test("turbo.json: 설치된 turbo가 agentGuidance를 알 때만 $schema 뒤에 한 번 끈다 (2.11.4 이하는 모르는 키로 거부)", () => {
  const root = mkdtempSync(join(tmpdir(), "turbo-"));
  const p = join(root, "turbo.json");
  const TURBO = '{\n  "$schema": "https://turbo.build/schema.json",\n  "ui": "tui",\n  "tasks": {}\n}\n';
  writeFileSync(p, TURBO);
  assert.equal(ensureTurboAgentGuidance(root), null, "turbo 미설치");
  mkdirSync(join(root, "node_modules/turbo"), { recursive: true });
  writeFileSync(join(root, "node_modules/turbo/schema.json"), '{"properties":{"ui":{}}}');
  assert.equal(ensureTurboAgentGuidance(root), null, "키를 모르는 turbo");
  assert.equal(readFileSync(p, "utf8"), TURBO);
  writeFileSync(join(root, "node_modules/turbo/schema.json"), '{"properties":{"agentGuidance":{}}}');
  assert.equal(ensureTurboAgentGuidance(root, { dryRun: true }), "added");
  assert.equal(readFileSync(p, "utf8"), TURBO, "dryRun은 쓰지 않는다");
  assert.equal(ensureTurboAgentGuidance(root), "added");
  assert.equal(readFileSync(p, "utf8"), TURBO.replace('json",\n', 'json",\n  "agentGuidance": false,\n'));
  assert.equal(JSON.parse(readFileSync(p, "utf8")).agentGuidance, false);
  assert.equal(ensureTurboAgentGuidance(root), null, "두 번째는 그대로");
  writeFileSync(p, '{\n  "agentGuidance": true,\n  "$schema": "x",\n  "tasks": {}\n}\n');
  assert.equal(ensureTurboAgentGuidance(root), null, "사용자가 정한 값은 그대로 둔다");
  // CRLF 파일은 줄바꿈을 그대로 따른다
  const crlf = TURBO.replaceAll("\n", "\r\n");
  writeFileSync(p, crlf);
  assert.equal(ensureTurboAgentGuidance(root), "added");
  assert.equal(readFileSync(p, "utf8"), crlf.replace('json",\r\n', 'json",\r\n  "agentGuidance": false,\r\n'));
  // 넣을 자리를 못 찾으면 파일을 두고 직접 추가하라고 알린다
  // 중첩 객체의 "$schema" 줄 뒤에는 넣지 않는다(turbo가 모르는 키로 거부)
  for (const text of ['{\n  "tasks": {}\n}\n', '{\n  // 주석\n  "$schema": "x",\n  "tasks": {}\n}\n', '{\n  "tasks": {\n    "$schema": "x",\n    "build": {}\n  },\n  "$schema": "y"\n}\n']) {
    writeFileSync(p, text);
    assert.equal(ensureTurboAgentGuidance(root), "manual", text);
    assert.equal(readFileSync(p, "utf8"), text);
  }
});

const IMPECCABLE_IGNORES = ["**/.impeccable/config.local.json", "**/.impeccable/hook.cache.json", "**/.impeccable/hook.pending.json", "**/.impeccable/*.png", "**/.impeccable/review/", "**/.impeccable/questions/"];

test(".claude/settings.json: 키 훅은 다른 키와 훅을 두고 한 번만 더한다. 읽지 못하면 null", () => {
  const root = mkdtempSync(join(tmpdir(), "hook-"));
  mkdirSync(join(root, ".claude"));
  const p = join(root, ".claude/settings.json");
  const other = { hooks: [{ type: "command", command: "echo hi" }] };
  writeFileSync(p, JSON.stringify({ enabledPlugins: { "a@b": true }, hooks: { SessionStart: [other], Stop: [other] } }));
  assert.equal(ensureClaudeHook(root, { dryRun: true }), true);
  assert.doesNotMatch(readFileSync(p, "utf8"), /load-keys/, "dryRun은 쓰지 않는다");
  assert.equal(ensureClaudeHook(root), true);
  assert.equal(ensureClaudeHook(root), false);
  const cur = JSON.parse(readFileSync(p, "utf8"));
  assert.deepEqual(cur.enabledPlugins, { "a@b": true });
  assert.deepEqual(cur.hooks.Stop, [other]);
  assert.equal(cur.hooks.SessionStart.length, 2);
  assert.deepEqual(cur.hooks.SessionStart[0], other);
  for (const bad of ["{ broken", "null", "[]", '{"hooks":"x"}', '{"hooks":{"SessionStart":{}}}']) {
    writeFileSync(p, bad);
    assert.equal(ensureClaudeHook(root), null, bad);
    assert.equal(readFileSync(p, "utf8"), bad);
  }
});

test(".gitignore: 없는 줄만 더하고, 슬래시 표기가 달라도 같은 항목으로 본다", () => {
  const root = mkdtempSync(join(tmpdir(), "gi-"));
  const p = join(root, ".gitignore");
  writeFileSync(p, "node_modules\n.omc\n/tasks/evidence/\n.env.*\n!.env.schema\n!.env.example\nhtml");
  writeFileSync(p, `${readFileSync(p, "utf8")}\n${IMPECCABLE_IGNORES.join("\n")}`);
  assert.deepEqual(ensureGitignore(root), [".omx/"]);
  assert.ok(readFileSync(p, "utf8").endsWith("\n\n# OMC·OMX 런타임 상태\n.omx/\n"));
  assert.deepEqual(ensureGitignore(root), []);
});

test(".gitignore: impeccable 스크린샷·캐시·개인 설정은 무시하고 critique 기록과 설정은 남긴다", () => {
  const root = mkdtempSync(join(tmpdir(), "gi-"));
  ensureGitignore(root);
  assert.equal(spawnSync("git", ["init", "-q"], { cwd: root }).status, 0);
  const ignored = (f) => spawnSync("git", ["check-ignore", "-q", f], { cwd: root }).status === 0;
  for (const f of [".impeccable/review/desktop.png", ".impeccable/hook.cache.json", "apps/web/.impeccable/config.local.json", ".impeccable/shot.png"]) assert.ok(ignored(f), `${f}가 무시되지 않음`);
  for (const f of [".impeccable/critique/landing.md", ".impeccable/config.json", ".impeccable/design.json"]) assert.ok(!ignored(f), `${f}가 무시됨`);
});

test(".gitignore: 환경별 .env를 무시하고 .env.schema는 남긴다. 패턴을 새로 더하면 ! 줄을 그 뒤에 다시 쓴다", () => {
  const root = mkdtempSync(join(tmpdir(), "gi-"));
  writeFileSync(join(root, ".gitignore"), "!.env.schema\n");
  assert.deepEqual(ensureGitignore(root).slice(-4, -1), [".env.*", "!.env.schema", "!.env.example"]);
  assert.equal(spawnSync("git", ["init", "-q"], { cwd: root }).status, 0);
  const ignored = (f) => spawnSync("git", ["check-ignore", "-q", f], { cwd: root }).status === 0;
  for (const f of [".env.production", ".env.development", "packages/db/.env.staging"]) assert.ok(ignored(f), `${f}가 무시되지 않음`);
  for (const f of [".env.schema", "packages/db/.env.schema", ".env.example"]) assert.ok(!ignored(f), `${f}가 무시됨`);
});

test("설치기: CDPATH가 있어도 실행되고, 루트 package.json이 없으면 복사 전에 멈춘다", () => {
  // 상대 경로로 실행해야 bash가 CDPATH를 쓴다
  const r = spawnSync("bash", [join(basename(TEMPLATE), "install.sh")], { cwd: dirname(TEMPLATE), encoding: "utf8", env: { ...process.env, CDPATH: ".:/tmp" } });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /사용법/);

  const root = fakeBts();
  rmSync(join(root, "package.json"));
  const r2 = install(root);
  assert.equal(r2.status, 1);
  assert.match(r2.stderr, /package\.json/);
  assert.equal(existsSync(join(root, "AGENTS.md")), false);
});

test("설치기: 깨진 스킬 링크가 있으면 충돌로 보고하고 계속한다", () => {
  const root = fakeBts();
  mkdirSync(join(root, ".claude/skills"), { recursive: true });
  symlinkSync("../../nowhere", join(root, ".claude/skills/prokit-web"));
  const r = install(root);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /충돌 prokit-web/);
});

test("사전 점검: Windows 셸에서는 WSL2를 안내하고 멈춘다", () => {
  const root = fakeBts();
  const r = preflight(root, "win32");
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /WSL2/);
  assert.deepEqual(preflight(root, "linux").errors, []);
});

test("사전 점검: Node 22.20 미만이면 멈추고, 24 미만이면 경고만 한다", () => {
  const root = fakeBts();
  const nodeWarn = (r) => r.warnings.filter((w) => w.startsWith("Node"));
  assert.deepEqual(preflight(root, "linux", "20.19.0").errors, ["Node 22.20 이상이 필요하다 (현재 20.19.0)"]);
  assert.deepEqual(preflight(root, "linux", "22.19.0").errors, ["Node 22.20 이상이 필요하다 (현재 22.19.0)"]);
  const ok22 = preflight(root, "linux", "22.20.0");
  assert.deepEqual(ok22.errors, []);
  assert.deepEqual(nodeWarn(ok22), ["Node 24 이상을 권장한다 (현재 22.20.0)"]);
  const ok24 = preflight(root, "linux", "24.0.0");
  assert.deepEqual(ok24.errors, []);
  assert.deepEqual(nodeWarn(ok24), []);
});

test("사전 점검: apps/web/package.json이 깨져 있으면 한 줄 오류로 멈춘다", () => {
  const root = fakeBts();
  writeFileSync(join(root, "apps/web/package.json"), "{ broken");
  const r = install(root);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^오류: apps\/web\/package\.json을 읽을 수 없다: /m);
  assert.doesNotMatch(r.stderr, /\n\s+at /);
  assert.equal(existsSync(join(root, "AGENTS.md")), false);
});

test("에이전트 도구의 런타임 상태(.omc)는 템플릿에 있어도 복사하지 않는다", () => {
  const stray = join(TEMPLATE_FILES, ".omc");
  const existed = existsSync(stray);
  mkdirSync(join(stray, "state"), { recursive: true });
  writeFileSync(join(stray, "state", "probe.json"), "{}\n");
  const root = fakeBts();
  try {
    assert.equal(install(root).status, 0);
    assert.equal(existsSync(join(root, ".omc", "state", "probe.json")), false);
  } finally {
    if (!existed) rmSync(stray, { recursive: true, force: true });
    rmSync(root, { recursive: true, force: true });
  }
});

test("OMX가 .codex/agents에 쓴 에이전트는 agents:check가 고아로 보지 않는다", () => {
  const root = fakeBts();
  assert.equal(install(root).status, 0);
  writeFileSync(join(root, ".codex/agents/executor.toml"), 'name = "executor"\n');
  const r = spawnSync(process.execPath, ["scripts/sync-agents.mjs", "--check"], { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout);
  assert.ok(existsSync(join(root, ".codex/agents/executor.toml")));
});

test("설치기: --with-global을 skills-setup에 넘기고, 설치 실패(exit 2)를 그대로 돌려준다", () => {
  const root = fakeBts();
  const bin = mkdtempSync(join(tmpdir(), "stub-bin-"));
  const home = mkdtempSync(join(tmpdir(), "stub-home-"));
  // PATH를 좁혀 실제 전역 설치(npm, bun, brew)와 네트워크가 일어나지 않게 한다. npx·npm 스텁은 실패한다.
  // /usr/bin에 npm이 있는 기기(apt로 받은 Node)에서도 agent-browser 자동 설치가 실제로 돌지 않게 npm을 가린다.
  for (const [name, body] of [["pnpm", "exit 0"], ["npx", "exit 1"], ["npm", "exit 1"]]) {
    writeFileSync(join(bin, name), `#!/bin/sh\n${body}\n`);
    chmodSync(join(bin, name), 0o755);
  }
  symlinkSync(process.execPath, join(bin, "node"));
  const r = spawnSync("bash", [join(TEMPLATE, "install.sh"), root, "--with-global"], {
    encoding: "utf8",
    env: { PATH: `${bin}:/usr/bin:/bin`, HOME: home },
  });
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /전역 설치: OMX CLI → npm install -g oh-my-codex/);
  assert.match(r.stdout, /스킬·플러그인: 실패 \(exit 2\)/);
});

test("--diff는 미리 보기라 파일을 쓰지 않고 더할 항목만 보여 준다", () => {
  const root = fakeBts();
  const before = snapshot(root);
  const r = spawnSync("bash", [join(TEMPLATE, "install.sh"), root, "--diff"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(snapshot(root), before);
  assert.match(r.stdout, /^파일: 복사 예정 .*scripts\/dev-cycle\.mjs/m);
  assert.match(r.stdout, /^package\.json scripts 추가 예정: dev-cycle/m);
  assert.match(r.stdout, /^\.gitignore 추가 예정: tasks\/evidence\//m);
  assert.match(r.stdout, /^biome\.json 추가 예정: !\.agents\/skills/m);
  assert.match(r.stdout, /^turbo\.json 추가 예정: 없음/m);
  assert.doesNotMatch(r.stdout, /스킬·플러그인/);
});
