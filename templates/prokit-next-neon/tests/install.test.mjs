import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { test } from "node:test";
import { ADOPT_AUTH, ESLINT_IGNORES, ensureBiomeConfig, ensureClaudeHook, ensureEslintIgnores, ensureGitignore, ensureTurboAgentGuidance, formatWithBiome, preflight } from "../install.mjs";
import { TEMPLATE, TEMPLATE_FILES } from "./helpers.mjs";

function fakeBts(prefix = "prokit-") {
  const root = mkdtempSync(join(tmpdir(), prefix));
  const w = (rel, s) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), s);
  };
  w("package.json", '{\n\t"name": "fake",\n\t"scripts": {\n\t\t"dev": "next dev",\n\t\t"dev:web": "turbo run dev --filter @fake/web",\n\t\t"check-types": "turbo run check-types",\n\t\t"build": "turbo run build",\n\t\t"check": "biome check --write .",\n\t\t"db:generate": "turbo run db:generate -F @fake/db --",\n\t\t"db:migrate": "turbo run db:migrate -F @fake/db --",\n\t\t"db:push": "x"\n\t}\n}\n');
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
  assert.equal(pkg.scripts["resource:check"], "node scripts/resource-guard.mjs check");
  assert.equal(pkg.scripts["resource:clean"], "node scripts/resource-guard.mjs clean");
  assert.equal(pkg.scripts["delegation:capture"], "node scripts/delegation.mjs capture");
  assert.equal(pkg.scripts["delegation:validate"], "node scripts/delegation.mjs validate");
  for (const [name, original] of Object.entries({ dev: "next dev", "dev:web": "turbo run dev --filter @fake/web", build: "turbo run build" })) {
    assert.equal(pkg.scripts[`prokit:original:${name}`], original, name);
    assert.equal(pkg.scripts[`prokit:resource:${name}`], `node scripts/resource-guard.mjs run --kind ${name.replace(":", "-")} -- pnpm run prokit:original:${name}`, name);
    assert.equal(pkg.scripts[name], `pnpm run prokit:resource:${name}`, name);
  }
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
  for (const l of ["tasks/evidence/", ".omc/", ".omx/", ".prokit/", ".claude/settings.local.json", ".env.*", "!.env.schema", "**/.impeccable/review/", "/html/", "/.taste-skill/"]) assert.ok(ignored.includes(l), `.gitignore에 ${l} 없음`);
  assert.equal(cfg.brain, "none", "두뇌는 기본 none(기본 AI)");
  assert.equal(cfg.simplicity, "none");
  // status는 외부 스킬 업데이트를 확인한다. 테스트가 GitHub에 가지 않게 확인을 끈다.
  mkdirSync(join(root, "node_modules/.cache"), { recursive: true });
  writeFileSync(join(root, "node_modules/.cache/skills-update.json"), '{"mode":"off"}');
  const dc = spawnSync(process.execPath, ["scripts/dev-cycle.mjs", "status"], { cwd: root, encoding: "utf8" });
  assert.equal(dc.status, 0);
  assert.match(dc.stdout, /활성 라운드 없음/);
  assert.deepEqual(JSON.parse(readFileSync(join(root, "node_modules/.cache/skills-update.json"), "utf8")), { mode: "off" }, "확인을 끄면 원격을 보지 않는다");
});

test("설치기: 이미 설치된 프로젝트에는 resource 명령만 더하고 사용자가 정한 원본 명령은 바꾸지 않는다", () => {
  const root = fakeBts();
  assert.equal(install(root).status, 0);
  const p = join(root, "package.json");
  const pkg = JSON.parse(readFileSync(p, "utf8"));
  pkg.scripts.dev = "my-custom-dev";
  delete pkg.scripts["resource:check"];
  writeFileSync(p, `${JSON.stringify(pkg, null, "\t")}\n`);
  const r = install(root);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const after = JSON.parse(readFileSync(p, "utf8"));
  assert.equal(after.scripts.dev, "my-custom-dev");
  assert.equal(after.scripts["resource:check"], "node scripts/resource-guard.mjs check");
  assert.match(r.stdout, /기존 설치본: resource 래퍼 전환은 H 라운드에서/);
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
    "!.agents/skills", "!.agents/agents", "!skills-lock.json", "!**/.omc", "!**/.omx", "!**/.prokit", "!**/.impeccable", "!.claude", "!.codex",
    "!tasks/evidence",
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

test("ESLint(adopt): flat config의 globalIgnores에 벤더 스킬과 하네스 스크립트를 한 번만 더하고, 자리를 못 찾으면 manual", () => {
  const root = mkdtempSync(join(tmpdir(), "eslint-"));
  writeFileSync(join(root, "package.json"), "{}\n");
  assert.equal(ensureEslintIgnores(root), null, "ESLint 설정 없음");
  assert.ok(ESLINT_IGNORES.includes(".agents/**") && ESLINT_IGNORES.includes("scripts/dev-cycle.mjs"));
  const p = join(root, "eslint.config.mjs");
  // create-next-app 16이 만드는 모양
  const NEXT = 'const eslintConfig = defineConfig([\n  ...nextVitals,\n  globalIgnores([\n    // Default ignores of eslint-config-next:\n    ".next/**",\n  ]),\n]);\n';
  writeFileSync(p, NEXT);
  assert.deepEqual(ensureEslintIgnores(root, { dryRun: true }), ESLINT_IGNORES);
  assert.equal(readFileSync(p, "utf8"), NEXT, "dryRun은 쓰지 않는다");
  assert.deepEqual(ensureEslintIgnores(root), ESLINT_IGNORES);
  assert.equal(readFileSync(p, "utf8"), NEXT.replace("globalIgnores([\n", `globalIgnores([\n${ESLINT_IGNORES.map((g) => `    "${g}",\n`).join("")}`));
  assert.deepEqual(ensureEslintIgnores(root), [], "두 번째는 그대로");
  // 한 줄 배열과 CRLF도 그 모양을 따른다
  writeFileSync(p, 'export default [globalIgnores([".next/**"])];\n');
  ensureEslintIgnores(root);
  assert.equal(readFileSync(p, "utf8"), `export default [globalIgnores([${ESLINT_IGNORES.map((g) => `"${g}", `).join("")}".next/**"])];\n`);
  writeFileSync(p, NEXT.replaceAll("\n", "\r\n"));
  ensureEslintIgnores(root);
  assert.match(readFileSync(p, "utf8"), /globalIgnores\(\[\r\n {4}"\.agents\/\*\*",\r\n/);
  // globalIgnores가 없거나 옛 설정(.eslintrc)이면 파일을 두고 직접 추가하라고 알린다
  const OTHER = 'export default [{ ignores: [".next/**"] }];\n';
  writeFileSync(p, OTHER);
  assert.equal(ensureEslintIgnores(root), "manual");
  assert.equal(readFileSync(p, "utf8"), OTHER);
  rmSync(p);
  writeFileSync(join(root, ".eslintrc.json"), "{}\n");
  assert.equal(ensureEslintIgnores(root), "manual");
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
  assert.deepEqual(cur.hooks.PostToolUse, [{ matcher: "Skill|Read", hooks: [{ type: "command", command: 'node "$CLAUDE_PROJECT_DIR/scripts/dev-cycle.mjs" skill-log' }] }]);
  // 키 훅만 있던 옛 설치본에는 스킬 기록 훅만 더한다
  delete cur.hooks.PostToolUse;
  writeFileSync(p, JSON.stringify(cur));
  assert.equal(ensureClaudeHook(root), true);
  const again = JSON.parse(readFileSync(p, "utf8"));
  assert.equal(again.hooks.SessionStart.length, 2);
  assert.equal(again.hooks.PostToolUse.length, 1);
  for (const bad of ["{ broken", "null", "[]", '{"hooks":"x"}', '{"hooks":{"SessionStart":{}}}', '{"hooks":{"PostToolUse":{}}}']) {
    writeFileSync(p, bad);
    assert.equal(ensureClaudeHook(root), null, bad);
    assert.equal(readFileSync(p, "utf8"), bad);
  }
});

test(".gitignore: 없는 줄만 더하고, 슬래시 표기가 달라도 같은 항목으로 본다", () => {
  const root = mkdtempSync(join(tmpdir(), "gi-"));
  const p = join(root, ".gitignore");
  writeFileSync(p, "node_modules\n.omc\n/tasks/evidence/\n.claude/settings.local.json\n.env.*\n!.env.schema\n!.env.example\nhtml\n.taste-skill");
  writeFileSync(p, `${readFileSync(p, "utf8")}\n${IMPECCABLE_IGNORES.join("\n")}`);
  assert.deepEqual(ensureGitignore(root), [".omx/", ".prokit/"]);
  assert.ok(readFileSync(p, "utf8").endsWith("\n\n# OMC·OMX·pro-kit 런타임 상태\n.omx/\n.prokit/\n"));
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

test("런타임 메타데이터: git은 추적하지 않고 Biome은 검사하지 않으며 기존 설정과 미리 보기를 보존한다", () => {
  const gitRoot = mkdtempSync(join(tmpdir(), "runtime-git-"));
  const gitignore = join(gitRoot, ".gitignore");
  const originalGitignore = "node_modules\n";
  writeFileSync(gitignore, originalGitignore);
  const gitPreview = ensureGitignore(gitRoot, { dryRun: true });
  assert.ok(gitPreview.includes(".prokit/"));
  assert.equal(readFileSync(gitignore, "utf8"), originalGitignore);
  ensureGitignore(gitRoot);
  assert.deepEqual(ensureGitignore(gitRoot), []);
  assert.equal(spawnSync("git", ["init", "-q"], { cwd: gitRoot }).status, 0);
  for (const file of [".prokit/public-sentinel.json", "tasks/evidence/public-sentinel.json"]) {
    mkdirSync(dirname(join(gitRoot, file)), { recursive: true });
    writeFileSync(join(gitRoot, file), "public sentinel\n");
    assert.equal(spawnSync("git", ["check-ignore", "-q", file], { cwd: gitRoot }).status, 0, `${file}가 무시되지 않음`);
  }

  const biomeRoot = mkdtempSync(join(tmpdir(), "runtime-biome-"));
  const biome = join(biomeRoot, "biome.json");
  const originalBiome = '{\n\t"files": {\n\t\t"includes": ["**", "!**/.next"]\n\t},\n\t"linter": { "enabled": false }\n}\n';
  writeFileSync(biome, originalBiome);
  const biomePreview = ensureBiomeConfig(biomeRoot, { dryRun: true });
  for (const excluded of ["!**/.prokit", "!tasks/evidence"]) assert.ok(biomePreview.includes(excluded), `${excluded}가 미리 보기에 없음`);
  assert.equal(readFileSync(biome, "utf8"), originalBiome);
  ensureBiomeConfig(biomeRoot);
  const cfg = JSON.parse(readFileSync(biome, "utf8"));
  assert.deepEqual(cfg.files.includes.slice(0, 2), ["**", "!**/.next"]);
  assert.equal(cfg.linter.enabled, false);
  for (const excluded of ["!**/.prokit", "!tasks/evidence"]) assert.ok(cfg.files.includes.includes(excluded), `${excluded}가 Biome 제외에 없음`);
  assert.deepEqual(ensureBiomeConfig(biomeRoot), []);
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

test("설치기: --with-global과 고른 값을 skills-setup에 넘기고, 설치 실패(exit 2)를 그대로 돌려준다", () => {
  const root = fakeBts();
  const bin = mkdtempSync(join(tmpdir(), "stub-bin-"));
  const home = mkdtempSync(join(tmpdir(), "stub-home-"));
  // PATH를 좁혀 실제 전역 설치(npm, bun, brew)와 네트워크가 일어나지 않게 한다. npx·npm 스텁은 실패한다.
  // /usr/bin에 npm이 있는 기기(apt로 받은 Node)에서도 agent-browser 자동 설치가 실제로 돌지 않게 npm을 가린다.
  // codex 스텁: OMX CLI는 codex가 있는 기기에만 설치한다.
  for (const [name, body] of [["pnpm", "exit 0"], ["npx", "exit 1"], ["npm", "exit 1"], ["codex", "exit 1"]]) {
    writeFileSync(join(bin, name), `#!/bin/sh\n${body}\n`);
    chmodSync(join(bin, name), 0o755);
  }
  symlinkSync(process.execPath, join(bin, "node"));
  const r = spawnSync("bash", [join(TEMPLATE, "install.sh"), root, "--with-global", "--brain", "oh-my"], {
    encoding: "utf8",
    env: { PATH: `${bin}:/usr/bin:/bin`, HOME: home },
  });
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /전역 설치: Vercel CLI → npm install -g vercel/);
  assert.match(r.stdout, /전역 설치: OMX CLI → npm install -g oh-my-codex/, "고른 두뇌의 전역 도구");
  assert.match(r.stdout, /^두뇌: oh-my/m);
  assert.match(r.stdout, /스킬·플러그인: 실패 \(exit 2\)/);
});

test("설치기: 고른 값은 복사 전에 확인하고, --skip-skills여도 .dev-cycle.json에 형식을 지켜 기록한다", () => {
  const root = fakeBts();
  const before = snapshot(root);
  const bad = install(root, "--brain", "nope");
  assert.equal(bad.status, 1, bad.stdout + bad.stderr);
  assert.match(bad.stderr, /두뇌: none\(기본 AI\), superpowers\(/);
  assert.deepEqual(snapshot(root), before, "잘못된 값이면 아무것도 쓰지 않는다");
  assert.equal(install(root, "--matt").status, 1, "값이 빠진 인자를 프로젝트 경로로 보지 않는다");
  assert.match(install(root, "--brain=superpowers").stderr, /--brain superpowers처럼 = 없이/, "= 형식을 조용히 무시하지 않는다");
  assert.deepEqual(snapshot(root), before);
  // 기존 프로젝트의 옛 판 skills-setup.mjs는 덮어쓰지 않으므로 --brain을 모른다고 알린다.
  mkdirSync(join(root, "scripts"), { recursive: true });
  writeFileSync(join(root, "scripts/skills-setup.mjs"), 'const o = argv.includes("--optional");\n');
  const old = spawnSync("bash", [join(TEMPLATE, "install.sh"), root, "--diff", "--brain", "none"], { encoding: "utf8" });
  assert.match(old.stdout, /^경고: 이 프로젝트의 scripts\/skills-setup\.mjs는 --brain·--simplicity·--matt\(또는 두뇌 여러 개\)를 모르는 옛 판이다/m);
  rmSync(join(root, "scripts"), { recursive: true });

  const diff = spawnSync("bash", [join(TEMPLATE, "install.sh"), root, "--diff", "--brain", "superpowers"], { encoding: "utf8" });
  assert.equal(diff.status, 0, diff.stderr);
  assert.match(diff.stdout, /^\.dev-cycle\.json 기록 예정: brain superpowers/m);
  assert.deepEqual(snapshot(root), before);

  const r = install(root, "--brain", "superpowers", "--simplicity", "ponytail", "--matt", "tdd,research", "--optional", "i-have-adhd,taste");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^\.dev-cycle\.json 기록: brain superpowers, simplicity ponytail$/m);
  assert.match(r.stdout, /i-have-adhd는 \/i-have-adhd/);
  assert.match(r.stdout, /taste\(design-taste-frontend\)는 화면 작업에서 사용자가 고른 화면에만/);
  const text = readFileSync(join(root, ".dev-cycle.json"), "utf8");
  assert.match(text, /^\{\n\s+"brain": "superpowers",\n\s+"simplicity": "ponytail",\n/, "맨 앞 키의 값만 바꾼다");
  assert.equal(install(root, "--simplicity", "caveman").status, 0, "다시 실행해 값만 바꾼다");
  const cfg = JSON.parse(readFileSync(join(root, ".dev-cycle.json"), "utf8"));
  assert.deepEqual([cfg.brain, cfg.simplicity], ["superpowers", "caveman"]);
  // 두뇌 여럿은 배열로 기록한다. 그 전 판 skills-setup.mjs(--brain은 알지만 배열은 모름)가 남아 있으면 알린다.
  const multi = install(root, "--brain", "openspec,superpowers");
  assert.equal(multi.status, 0, multi.stdout + multi.stderr);
  assert.match(multi.stdout, /^\.dev-cycle\.json 기록: brain openspec,superpowers$/m);
  assert.deepEqual(JSON.parse(readFileSync(join(root, ".dev-cycle.json"), "utf8")).brain, ["openspec", "superpowers"]);
  writeFileSync(join(root, "scripts/skills-setup.mjs"), 'const b = argv.indexOf("--brain");\n');
  const oldMulti = spawnSync("bash", [join(TEMPLATE, "install.sh"), root, "--diff", "--brain", "openspec,superpowers"], { encoding: "utf8" });
  assert.match(oldMulti.stdout, /^경고: [^\n]*두뇌 여러 개[^\n]*옛 판이다/m);
  const oldSingle = spawnSync("bash", [join(TEMPLATE, "install.sh"), root, "--diff", "--brain", "openspec"], { encoding: "utf8" });
  assert.doesNotMatch(oldSingle.stdout, /옛 판이다/, "--brain을 아는 판에 하나만 주면 경고하지 않는다");
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

// 운영 중인 일반 Next.js 앱(Better-T-Stack 구조가 아님). adopt는 이 구조를 그대로 두고 하네스만 더한다.
function fakeNext(prefix = "prokit-adopt-") {
  const root = mkdtempSync(join(tmpdir(), prefix));
  const w = (rel, s) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), s);
  };
  w("package.json", '{\n  "name": "shop",\n  "scripts": {\n    "dev": "next dev",\n    "build": "next build",\n    "lint": "next lint",\n    "release": "semantic-release"\n  },\n  "dependencies": {\n    "next": "15.0.0"\n  }\n}\n');
  w("app/page.tsx", "export default function Page() { return null; }\n");
  w("biome.json", '{ "files": { "includes": ["**"] } }\n');
  w("AGENTS.md", "# 우리 팀 규칙\n");
  w(".gitignore", "node_modules\n");
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: root });
  return root;
}

test("adopt: Better-T-Stack이 아닌 Next.js 프로젝트에 하네스만 더하고 기존 스크립트·설정·구조는 건드리지 않는다", () => {
  const root = fakeNext();
  const before = { biome: readFileSync(join(root, "biome.json"), "utf8"), page: readFileSync(join(root, "app/page.tsx"), "utf8") };
  writeFileSync(join(root, "eslint.config.mjs"), "export default [globalIgnores([])];\n");
  const plain = install(root);
  assert.equal(plain.status, 1, "--adopt 없이는 Better-T-Stack 구조를 요구한다");
  assert.match(plain.stderr, /--adopt로 하네스만 설치한다/);
  const r = install(root, "--adopt");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  for (const s of ["prokit-dev-cycle", "prokit-verify", "prokit-web", "prokit-ui", "prokit-skills-update"]) assert.ok(existsSync(join(root, ".agents/skills", s, "SKILL.md")), s);
  for (const s of ["prokit-api", "prokit-db", "prokit-deploy", "prokit-pack-use"]) assert.equal(existsSync(join(root, ".agents/skills", s)), false, `${s}는 Better-T-Stack 전용`);
  for (const f of ["apps", "docs/adr", ".vercelignore", "scripts/vercel-deploy.mjs", "scripts/export-html.mjs", "scripts/release.mjs"]) assert.equal(existsSync(join(root, f)), false, f);
  for (const f of ["scripts/dev-cycle.mjs", "scripts/skills-setup.mjs", "scripts/sync-agents.mjs", "docs/dev-workflow.md", "tasks/todo.md", ".claude/agents/prokit-reviewer.md", ".codex/agents/prokit-reviewer.toml"]) assert.ok(existsSync(join(root, f)), f);
  const agents = readFileSync(join(root, "AGENTS.md"), "utf8");
  assert.match(agents, /^# 우리 팀 규칙\n/, "기존 AGENTS.md는 보존한다");
  assert.match(agents, /프로킷 하네스만 먼저 설치했다/, "adopt 블록을 덧붙인다");
  assert.doesNotMatch(agents, /Better-T-Stack으로 만든 Next\.js 풀스택 앱이다/);
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(pkg.scripts.dev, "next dev", "원본 명령에 resource 래퍼를 씌우지 않는다");
  assert.equal(pkg.scripts.release, "semantic-release", "같은 이름의 기존 스크립트는 그대로 둔다");
  assert.equal(pkg.scripts["dev-cycle"], "node scripts/dev-cycle.mjs");
  for (const k of ["vercel:deploy", "export:html"]) assert.equal(k in pkg.scripts, false, k);
  const biome = JSON.parse(readFileSync(join(root, "biome.json"), "utf8"));
  assert.deepEqual(biome.files.includes.slice(0, 4), ["**", "!.agents", "!.claude", "!.codex"], "하네스·벤더 파일만 그 프로젝트 Biome 검사에서 뺀다");
  assert.ok(biome.files.includes.includes("!scripts/dev-cycle.mjs"));
  assert.equal("overrides" in biome, false, "그 밖의 Biome 설정은 바꾸지 않는다");
  assert.notEqual(before.biome, "");
  assert.match(readFileSync(join(root, "eslint.config.mjs"), "utf8"), /globalIgnores\(\["\.agents\/\*\*", /, "벤더 스킬은 프로젝트 lint에서 뺀다");
  assert.match(r.stdout, /^ESLint 무시 추가: \.agents\/\*\*, /m);
  assert.equal(readFileSync(join(root, "app/page.tsx"), "utf8"), before.page);
  assert.doesNotMatch(readFileSync(join(root, ".gitignore"), "utf8"), /^\/html\/$/m, "루트 html/은 그 프로젝트의 폴더일 수 있다");
  const cfg = JSON.parse(readFileSync(join(root, ".dev-cycle.json"), "utf8"));
  assert.equal(cfg.adopt, true);
  assert.equal(cfg.projectType, "operating", "--adopt는 운영 중인 프로젝트다");
  assert.deepEqual(cfg.rules.map((x) => x.case), ["H", "H", "E", "D", "B", "F"], "하네스·빌드 규칙이 먼저, 작업공간 설정 규칙은 없다");
  assert.match(r.stdout, /prokit-analyzer로 정밀 분석부터/);
  assert.match(r.stdout, /^\.dev-cycle\.json 기록: projectType operating, adopt$/m);
  assert.equal(install(root, "--adopt").status, 0, "다시 실행해도 된다");
  assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), agents, "블록을 두 번 덧붙이지 않는다");
});

test("adopt 사전 점검: next 의존성이 없으면 전환을 안내하고, 작업 공간(apps/*)의 next도 찾는다", () => {
  const root = fakeNext();
  writeFileSync(join(root, "package.json"), '{ "name": "x", "workspaces": ["apps/*"] }\n');
  const no = preflight(root, "linux", "24.0.0", { adopt: true });
  assert.ok(no.errors.some((e) => /next 의존성을 찾지 못했다.*전환\(migration\)/.test(e)), no.errors.join("\n"));
  mkdirSync(join(root, "apps/site"), { recursive: true });
  writeFileSync(join(root, "apps/site/package.json"), JSON.stringify({ devDependencies: { next: "16.0.0" } }));
  assert.deepEqual(preflight(root, "linux", "24.0.0", { adopt: true }).errors, []);
});

test("유형 기록: --project-type·--legacy를 .dev-cycle.json에 남기고, 맞지 않는 조합은 복사 전에 멈춘다", () => {
  const root = fakeBts();
  const legacyDir = mkdtempSync(join(tmpdir(), "prokit-legacy-"));
  const before = snapshot(root);
  for (const [args, re] of [
    [["--project-type", "old"], /사용법: --project-type new\|early\|operating\|migration/],
    [["--legacy", legacyDir], /--legacy는 전환/],
    [["--project-type", "early", "--adopt"], /--adopt는 운영 중인/],
    [["--project-type=early"], /= 없이 띄어 쓴다/],
    [["--project-type", "migration", "--legacy", join(legacyDir, "없음")], /--legacy 경로가 폴더가 아니다/],
    [["--project-type", "migration", "--legacy", root], /기존 코드 폴더다/],
    [["--dif"], /모르는 옵션: --dif/],
    [["--skip-skill", "--with-globals"], /모르는 옵션: --skip-skill --with-globals/],
  ]) {
    const r = install(root, ...args);
    assert.equal(r.status, 1, `${args.join(" ")}: ${r.stdout}`);
    assert.match(r.stderr, re, args.join(" "));
  }
  assert.deepEqual(snapshot(root), before, "잘못된 인자는 아무것도 쓰지 않는다");
  const help = install(root, "--help");
  assert.equal(help.status, 0);
  assert.match(help.stdout, /^사용법: install\.sh/m);
  assert.deepEqual(snapshot(root), before, "--help는 아무것도 쓰지 않는다");
  const r = install(root, "--project-type", "migration", "--legacy", legacyDir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const cfg = JSON.parse(readFileSync(join(root, ".dev-cycle.json"), "utf8"));
  assert.equal(cfg.projectType, "migration");
  assert.equal(cfg.legacy.path, relative(root, legacyDir), "프로젝트 기준 상대 경로로 남긴다");
  assert.ok(!cfg.legacy.path.startsWith("/"));
  assert.equal(cfg.adopt, undefined);
  assert.ok(cfg.rules.some((x) => x.case === "E" && x.match === "^packages/db/"), "Better-T-Stack 규칙은 그대로다");
});

test("early: 옮겨 둔 prototype/은 biome.json 검사에서 뺀다", () => {
  const root = fakeBts();
  writeFileSync(join(root, "biome.json"), '{ "files": { "includes": ["**"] } }\n');
  const r = install(root, "--project-type", "early");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(JSON.parse(readFileSync(join(root, "biome.json"), "utf8")).files.includes.includes("!prototype"));
  assert.equal(JSON.parse(readFileSync(join(root, ".dev-cycle.json"), "utf8")).projectType, "early");
  const plain = fakeBts();
  writeFileSync(join(plain, "biome.json"), '{ "files": { "includes": ["**"] } }\n');
  install(plain);
  assert.ok(!JSON.parse(readFileSync(join(plain, "biome.json"), "utf8")).files.includes.includes("!prototype"), "다른 유형은 빼지 않는다");
});

test("--default-branch: 도입 브랜치에서 계속 작업하면 그 브랜치를 기준 브랜치로 기록하고, 없는 브랜치는 멈춘다", () => {
  const root = fakeNext();
  const g = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: root });
  g("add", "-A");
  g("commit", "-qm", "init");
  g("checkout", "-q", "-b", "prokit/setup");
  const bad = install(root, "--adopt", "--default-branch", "nope");
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /--default-branch 브랜치가 없다: nope/);
  const r = install(root, "--adopt", "--default-branch", "prokit/setup");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(JSON.parse(readFileSync(join(root, ".dev-cycle.json"), "utf8")).defaultBranch, "prokit/setup");
  assert.match(r.stdout, /^\.dev-cycle\.json 기록: projectType operating, adopt, defaultBranch prokit\/setup$/m);
});

test("adopt 다시 실행: --adopt 없이 실행해도 기록을 보고 adopt로 설치하고, 프로젝트의 패키지 관리자와 타입 검사 이름을 쓴다", () => {
  const root = fakeNext();
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  pkg.scripts.typecheck = "tsc --noEmit";
  writeFileSync(join(root, "package.json"), JSON.stringify(pkg, null, 2));
  writeFileSync(join(root, "package-lock.json"), "{}\n");
  rmSync(join(root, "biome.json"));
  assert.equal(install(root, "--adopt").status, 0);
  const cfg = JSON.parse(readFileSync(join(root, ".dev-cycle.json"), "utf8"));
  assert.deepEqual(cfg.commands, { typecheck: "npm run typecheck", lint: "npm run lint", build: "npm run build" });
  const again = install(root);
  assert.equal(again.status, 0, again.stdout + again.stderr);
  for (const f of [".agents/skills/prokit-api", "scripts/vercel-deploy.mjs", "docs/adr"]) assert.equal(existsSync(join(root, f)), false, `${f}: 다시 실행해도 Better-T-Stack 파일을 섞지 않는다`);
  assert.equal("vercel:deploy" in JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts, false);
  // 기존 코드 폴더가 심볼릭 링크여도 받는다.
  const bts = fakeBts();
  const real = mkdtempSync(join(tmpdir(), "prokit-legacy-real-"));
  const link = join(mkdtempSync(join(tmpdir(), "prokit-legacy-link-")), "old");
  symlinkSync(real, link);
  const r = install(bts, "--project-type", "migration", "--legacy", link);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("adopt: .dev-cycle.json이 이미 있어도 adopt를 기록해 Better-T-Stack 파일을 섞지 않고, 경로 규칙을 넣지 않았다고 한 번만 알린다", () => {
  const root = fakeNext();
  writeFileSync(join(root, ".dev-cycle.json"), '{\n\t"todoPath": "tasks/todo.md"\n}\n');
  const r = install(root, "--adopt");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const cfg = JSON.parse(readFileSync(join(root, ".dev-cycle.json"), "utf8"));
  assert.equal(cfg.adopt, true, "skills-setup이 Better-T-Stack 전용 스킬을 설치하지 않게 기록한다");
  assert.equal(cfg.projectType, "operating");
  assert.match(r.stdout, /^경고: \.dev-cycle\.json이 이미 있어 adopt 경로 규칙을 넣지 않았다/m);
  const again = install(root);
  assert.equal(again.status, 0, again.stdout + again.stderr);
  assert.doesNotMatch(again.stdout, /adopt 경로 규칙을 넣지 않았다/, "이미 기록한 adopt는 다시 알리지 않는다");
  for (const f of [".agents/skills/prokit-api", "scripts/vercel-deploy.mjs"]) assert.equal(existsSync(join(root, f)), false, f);
  // 바뀐 것이 없는 다시 실행은 .dev-cycle.json을 다시 쓰지 않는다(한 줄 배열이 펼쳐지면 Biome 형식과 달라진다).
  const text = readFileSync(join(root, ".dev-cycle.json"), "utf8").replace(/"brain": [^\n]*/, '"brain": ["openspec", "superpowers"],');
  writeFileSync(join(root, ".dev-cycle.json"), text);
  assert.equal(install(root).status, 0);
  assert.equal(readFileSync(join(root, ".dev-cycle.json"), "utf8"), text);
});

test("adopt: 더한 스크립트 명령과 SessionStart 훅이 가리키는 파일이 모두 있고, 스킬 구성 바꾸기 스킬·CLAUDE.md 블록·인증 경로를 설치한다", () => {
  const root = fakeNext();
  const pkg0 = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  delete pkg0.scripts.release;
  writeFileSync(join(root, "package.json"), JSON.stringify(pkg0, null, 2));
  const r = install(root, "--adopt");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  for (const [k, v] of Object.entries(pkg.scripts))
    for (const m of v.matchAll(/node (scripts\/[\w.-]+\.mjs)/g)) assert.ok(existsSync(join(root, m[1])), `${k}: ${m[1]}`);
  for (const m of readFileSync(join(root, ".claude/settings.json"), "utf8").matchAll(/scripts\/([\w.-]+\.mjs)/g)) assert.ok(existsSync(join(root, "scripts", m[1])), m[1]);
  assert.equal("release" in pkg.scripts, false, "release.mjs를 복사하지 않으므로 명령도 더하지 않는다");
  assert.ok(existsSync(join(root, ".agents/skills/prokit-skills-manage/SKILL.md")));
  assert.match(readFileSync(join(root, "CLAUDE.md"), "utf8"), /<!-- prokit-template:start -->/);
  assert.equal(JSON.parse(readFileSync(join(root, ".dev-cycle.json"), "utf8")).authPaths, ADOPT_AUTH);
});

test("--diff --adopt: 파일을 쓰지 않고 adopt 기록만 예고하며, 프로젝트의 Biome 설정(biome.jsonc)을 고치라고 하지 않는다", () => {
  const root = fakeNext();
  rmSync(join(root, "biome.json"));
  writeFileSync(join(root, "biome.jsonc"), "{}\n");
  const before = snapshot(root);
  const r = spawnSync("bash", [join(TEMPLATE, "install.sh"), root, "--diff", "--adopt"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(snapshot(root), before);
  assert.match(r.stdout, /^\.dev-cycle\.json 기록 예정: projectType operating, adopt$/m);
  assert.match(r.stdout, /^biome\.json 추가 예정: 없음$/m);
  assert.doesNotMatch(r.stdout, /biome\.jsonc에/, "Better-T-Stack용 Biome 항목은 요구하지 않는다");
  assert.match(r.stdout, /^경고: Biome 설정의 검사 대상에서 하네스·벤더 파일\(\.agents, /m, "jsonc는 직접 빼라고 알린다");
  const real = install(root, "--adopt");
  assert.equal(real.status, 0, real.stdout + real.stderr);
  assert.doesNotMatch(real.stdout, /biome\.jsonc에/);
  assert.equal(readFileSync(join(root, "biome.jsonc"), "utf8"), "{}\n", "jsonc는 고치지 않는다");
});

test("operating: 운영 중인 Better-T-Stack 프로젝트의 dev·build에는 resource 래퍼를 씌우지 않는다(배포·CI가 쓰는 명령)", () => {
  const root = fakeBts();
  const r = install(root, "--project-type", "operating");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(pkg.scripts.dev, "next dev");
  assert.equal(pkg.scripts.build, "turbo run build");
  assert.equal("prokit:original:build" in pkg.scripts, false);
  assert.equal(pkg.scripts["resource:check"], "node scripts/resource-guard.mjs check", "resource 명령은 더한다");
  assert.match(r.stdout, /^운영 중인 프로젝트: dev·build에 resource 래퍼를 씌우지 않았다/m);
  assert.equal(existsSync(join(root, "apps/web/src/components/prokit-credit.tsx")), false, "앱 폴더에 파일을 더하지 않는다");
  assert.match(r.stdout, /^ {5}pnpm check는 앱 코드의 포맷을 바꾸므로 돌리지 않는다/m);
  assert.doesNotMatch(r.stdout, /첫 마이그레이션\(README/, "새 프로젝트용 다음 할 일을 보이지 않는다");
  assert.equal(install(root, "--skip-skills").status, 0);
  assert.equal(existsSync(join(root, "apps/web/src/components/prokit-credit.tsx")), false, "기록한 유형으로 다시 실행해도 더하지 않는다");
  const early = fakeBts();
  assert.equal(install(early, "--project-type", "early").status, 0);
  assert.equal(JSON.parse(readFileSync(join(early, "package.json"), "utf8")).scripts.build, "pnpm run prokit:resource:build", "새로 만든 early 프로젝트는 래퍼를 씌운다");
});

test("--default-branch: 다시 실행해도 기록한 기준 브랜치를 지키고, 병합할 기본 브랜치도 도입 브랜치에서 받는다", () => {
  const prep = () => {
    const root = fakeNext();
    const g = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: root });
    g("add", "-A");
    g("commit", "-qm", "init");
    g("checkout", "-q", "-b", "prokit/setup");
    return root;
  };
  const stay = prep();
  assert.equal(install(stay, "--adopt", "--default-branch", "prokit/setup").status, 0);
  const again = install(stay);
  assert.equal(again.status, 0, again.stdout + again.stderr);
  assert.equal(JSON.parse(readFileSync(join(stay, ".dev-cycle.json"), "utf8")).defaultBranch, "prokit/setup");
  const merge = prep();
  const r = install(merge, "--adopt", "--default-branch", "main");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(JSON.parse(readFileSync(join(merge, ".dev-cycle.json"), "utf8")).defaultBranch, "main", "지금 브랜치가 prokit/setup이어도 병합할 브랜치를 기록한다");
});

test("formatWithBiome: 생성기의 biome.json이 설치된 Biome보다 옛 판이면 biome migrate로 맞춘 뒤 다시 검사한다", () => {
  const root = mkdtempSync(join(tmpdir(), "biome-migrate-"));
  writeFileSync(join(root, "biome.json"), "{}\n");
  mkdirSync(join(root, "node_modules/.bin"), { recursive: true });
  const bin = join(root, "node_modules/.bin/biome");
  // 가짜 Biome: migrate --write 전에는 설정을 못 읽고(deserialize), 뒤에는 통과한다
  writeFileSync(bin, `#!/bin/sh\nif [ "$1" = migrate ]; then touch migrated; exit 0; fi\n[ -f migrated ] && exit 0\necho "$PWD/biome.json:65:9 deserialize"; exit 1\n`);
  chmodSync(bin, 0o755);
  try {
    assert.equal(formatWithBiome(root, ["package.json"]), "적용 (biome migrate로 biome.json을 설치된 Biome 판에 맞춤)");
    rmSync(join(root, "migrated"));
    writeFileSync(bin, `#!/bin/sh\n[ "$1" = migrate ] && touch migrated\necho "lint error"; exit 1\n`);
    assert.match(formatWithBiome(root, ["package.json"]), /^경고 — biome check 실패: lint error/);
    assert.ok(!existsSync(join(root, "migrated")), "설정 오류가 아니면 migrate를 부르지 않는다");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
