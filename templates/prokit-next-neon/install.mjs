#!/usr/bin/env node
// pro-kit 템플릿 설치기. install.sh가 이 파일을 실행한다. prokit-next-neon과 prokit-next-supabase에서 내용이 같다(tests/shared-files.test.mjs).
// 사용법: install.sh <project-dir> [--diff] [--skip-skills] [--with-global]
import { spawnSync } from "node:child_process";
import {
  appendFileSync, copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, realpathSync, symlinkSync, writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const TEMPLATE_DIR = dirname(fileURLToPath(import.meta.url));
export const FILES_DIR = join(TEMPLATE_DIR, "files");
const MARK_START = "<!-- prokit-template:start -->";
// bts-starter-kit 시절 설치본의 마커. 이 블록이 있어도 덧붙이지 않는다(옮기는 법은 템플릿 저장소 AGENTS.md의 갱신 절차).
const LEGACY_MARK_START = "<!-- bts-template:start -->";
const MERGE_MD = new Set(["AGENTS.md", "CLAUDE.md"]);
const IGNORE = new Set([".DS_Store", ".omc"]);
// 설치기가 첫 복사 뒤 프로젝트 값으로 채우는 파일. 템플릿과 늘 다르므로 "유지(템플릿과 다름)"·--diff에서 뺀다.
const FILLED = new Set([".dev-cycle.json"]);

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: "utf8", ...opts });

export function preflight(target, platform = process.platform, node = process.versions.node) {
  const errors = [];
  const warnings = [];
  // 설치기와 스킬은 bash, 심볼릭 링크, Linux·macOS 명령을 전제한다. Windows 셸에서는 pnpm.cmd·npx.cmd부터 띄우지 못한다.
  if (platform === "win32") return { errors: ["Windows에서는 WSL2(Ubuntu) 안에서 실행한다 (템플릿 README의 준비물 절)"], warnings };
  if (!existsSync(target) || !lstatSync(target).isDirectory()) return { errors: [`대상 디렉터리가 없다: ${target}`], warnings };
  if (run("git", ["rev-parse", "--git-dir"], { cwd: target }).status !== 0) {
    errors.push("git 저장소가 아니다 (BTS 생성 때 --git을 쓰거나 git init을 먼저 한다)");
  }
  try {
    const pkg = JSON.parse(readFileSync(join(target, "package.json"), "utf8"));
    if (!pkg || typeof pkg !== "object" || Array.isArray(pkg)) throw new Error("JSON 객체가 아니다");
  } catch (e) {
    errors.push(`루트 package.json을 읽을 수 없다: ${e.code === "ENOENT" ? "파일 없음" : e.message}`);
  }
  const webPkg = join(target, "apps/web/package.json");
  try {
    const web = existsSync(webPkg) ? JSON.parse(readFileSync(webPkg, "utf8")) : {};
    if (!web?.dependencies?.next && !web?.devDependencies?.next) {
      errors.push("apps/web/package.json에 next 의존성이 없다 (BTS --frontend next 프로젝트가 아니다)");
    }
  } catch (e) {
    errors.push(`apps/web/package.json을 읽을 수 없다: ${e.message}`);
  }
  // 22.20: skills CLI(engines)가 요구하는 하한. 24: 지금 LTS이고 agent-browser가 engines에 적은 판(22에서도 돈다)
  const [major, minor] = node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 20)) errors.push(`Node 22.20 이상이 필요하다 (현재 ${node})`);
  else if (major < 24) warnings.push(`Node 24 이상을 권장한다 (현재 ${node})`);
  if (run("pnpm", ["--version"]).status !== 0) errors.push("pnpm이 없다");
  for (const p of ["packages/db/drizzle.config.ts", "packages/api", "packages/auth"]) {
    if (!existsSync(join(target, p))) warnings.push(`${p} 없음 — .dev-cycle.json 경로 규칙을 프로젝트에 맞게 고친다`);
  }
  return { errors, warnings };
}

function walk(dir, base = dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, base));
    else out.push(relative(base, p));
  }
  return out.sort();
}

export function copyFiles(target, { diff = false } = {}) {
  const r = { copied: [], appended: [], same: [], kept: [], filled: [] };
  for (const rel of walk(FILES_DIR)) {
    const src = join(FILES_DIR, rel);
    const dest = join(target, rel);
    if (!existsSync(dest)) {
      if (!diff) {
        mkdirSync(dirname(dest), { recursive: true });
        copyFileSync(src, dest);
      }
      r.copied.push(rel);
      continue;
    }
    const cur = readFileSync(dest);
    const content = readFileSync(src);
    if (cur.equals(content)) {
      r.same.push(rel);
      continue;
    }
    if (FILLED.has(rel)) {
      r.filled.push(rel);
      continue;
    }
    const text = cur.toString("utf8");
    if (MERGE_MD.has(rel) && !text.includes(MARK_START) && !text.includes(LEGACY_MARK_START)) {
      if (!diff) appendFileSync(dest, `${text.endsWith("\n") ? "" : "\n"}\n${content.toString("utf8")}`);
      r.appended.push(rel);
      continue;
    }
    r.kept.push(diff ? { rel, diff: run("diff", ["-u", dest, src]).stdout } : { rel });
  }
  return r;
}

// bts-starter-kit 시절 이름(bts-* 스킬·에이전트, ADR). 그대로 두고 설치하면 prokit-*와 두 벌이 된다.
export function legacyPaths(target) {
  const found = [];
  for (const [dir, re] of [[".agents/skills", /^bts-/], [".claude/skills", /^bts-/], [".claude/agents", /^bts-.*\.md$/], ["docs/adr", /^0001-bts-/]]) {
    if (existsSync(join(target, dir))) found.push(...readdirSync(join(target, dir)).filter((n) => re.test(n)).map((n) => `${dir}/${n}`));
  }
  return found.sort();
}
const legacyWarning = (target) => {
  const found = legacyPaths(target);
  return found.length ? [`경고: 옛 이름이 남아 있다: ${found.join(", ")} → prokit-*로 옮기고 참조를 고친다 (템플릿 저장소 AGENTS.md의 갱신 절차)`] : [];
};

const sameTarget = (a, b) => {
  try {
    return realpathSync(a) === realpathSync(b);
  } catch {
    return false; // 깨진 링크
  }
};

export function linkSkills(target) {
  const created = [];
  const conflicts = [];
  const skillsDir = join(target, ".agents/skills");
  for (const name of readdirSync(skillsDir).filter((n) => n.startsWith("prokit-")).sort()) {
    const link = join(target, ".claude/skills", name);
    const to = `../../.agents/skills/${name}`;
    let st = null;
    try {
      st = lstatSync(link);
    } catch {}
    if (!st) {
      mkdirSync(dirname(link), { recursive: true });
      symlinkSync(to, link);
      created.push(name);
    } else if (!(st.isSymbolicLink() && readlinkSync(link) === to) && !sameTarget(link, join(skillsDir, name))) {
      conflicts.push(name);
    }
  }
  return { created, conflicts };
}

function defaultBranch(target) {
  const remote = run("git", ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"], { cwd: target });
  if (remote.status === 0) return remote.stdout.trim().replace(/^origin\//, "");
  // 기능 브랜치에서 설치해도 그 브랜치를 기본 브랜치로 적지 않도록 main·master를 먼저 본다.
  for (const b of ["main", "master"]) {
    if (run("git", ["rev-parse", "--verify", "--quiet", `refs/heads/${b}`], { cwd: target }).status === 0) return b;
  }
  return run("git", ["branch", "--show-current"], { cwd: target }).stdout.trim() || null;
}

export function configureDevCycle(target) {
  const p = join(target, ".dev-cycle.json");
  const cfg = JSON.parse(readFileSync(p, "utf8"));
  const scripts = JSON.parse(readFileSync(join(target, "package.json"), "utf8")).scripts ?? {};
  const found = {};
  if (scripts["check-types"]) found.typecheck = "pnpm check-types";
  if (existsSync(join(target, "biome.json")) || existsSync(join(target, "biome.jsonc"))) found.lint = "pnpm exec biome check .";
  else if (scripts.lint) found.lint = "pnpm lint";
  if (scripts.build) found.build = "pnpm build";
  if (scripts.test) found.test = "pnpm test";
  // BTS의 루트 db:* 스크립트는 turbo interactive 태스크라 TTY 없는 에이전트 셸에서 실패한다.
  // `turbo run <s> -F <pkg>` 형태면 그 패키지 스크립트를 pnpm으로 직접 부른다.
  const dbCmd = (s) => {
    const pkg = scripts[s].match(/^turbo run \S+ (?:-F|--filter)[ =](\S+)/)?.[1];
    return pkg ? `pnpm --filter ${pkg} ${s}` : `pnpm ${s}`;
  };
  if (scripts["db:generate"]) found.dbGenerate = dbCmd("db:generate");
  if (scripts["db:migrate"]) found.dbMigrate = dbCmd("db:migrate");
  // db:push는 기록하지 않는다. 쓰는 스킬이 없고, supabase는 로컬에서도 금지한다.
  cfg.commands = { ...found, ...cfg.commands };
  const branch = defaultBranch(target);
  if (branch) cfg.defaultBranch = branch;
  writeFileSync(p, `${JSON.stringify(cfg, null, 2)}\n`);
  return { commands: cfg.commands, defaultBranch: cfg.defaultBranch };
}

export function addScripts(target, { dryRun = false } = {}) {
  const p = join(target, "package.json");
  const text = readFileSync(p, "utf8");
  const pkg = JSON.parse(text);
  const indent = text.match(/^([ \t]+)"/m)?.[1] ?? "  ";
  const want = {
    "dev-cycle": "node scripts/dev-cycle.mjs",
    "agents:sync": "node scripts/sync-agents.mjs",
    "agents:check": "node scripts/sync-agents.mjs --check",
    "skills:setup": "node scripts/skills-setup.mjs",
    "skills:check": "node scripts/skills-setup.mjs --check",
    "skills:update": "node scripts/skills-setup.mjs --update",
    "vercel:deploy": "node scripts/vercel-deploy.mjs",
    "export:html": "node scripts/export-html.mjs",
    release: "node scripts/release.mjs",
  };
  pkg.scripts ??= {};
  const added = Object.keys(want).filter((k) => !(k in pkg.scripts));
  for (const k of added) pkg.scripts[k] = want[k];
  if (added.length && !dryRun) writeFileSync(p, `${JSON.stringify(pkg, null, indent)}\n`);
  return added;
}

const GITIGNORE = [
  ["# dev-cycle 증거 파일 (스크린샷 등)", "tasks/evidence/"],
  ["# OMC·OMX 런타임 상태", ".omc/", ".omx/"],
  // impeccable README "Keeping .impeccable out of git"의 권장 블록에서 live 모드 줄을 뺀 것이다(live는 impeccable이
  // .git/info/exclude에 직접 쓴다). critique/*.md, config.json, design.json은 공유 산출물이라 무시하지 않는다.
  [
    "# impeccable 작업 파일(스크린샷, 캐시, 개인 설정)",
    "**/.impeccable/config.local.json",
    "**/.impeccable/hook.cache.json",
    "**/.impeccable/hook.pending.json",
    "**/.impeccable/*.png",
    "**/.impeccable/review/",
    "**/.impeccable/questions/",
  ],
  // BTS는 apps/web만 .env*를 무시한다. 루트와 packages/*의 .env.production 같은 파일도 막는다
  ["# 환경별 .env (비밀값). 배포 환경변수는 Vercel에 둔다", ".env.*", "!.env.schema", "!.env.example"],
  ["# pnpm export:html 결과(정적 HTML)", "/html/"],
];
export function ensureGitignore(target, { dryRun = false } = {}) {
  const p = join(target, ".gitignore");
  const cur = existsSync(p) ? readFileSync(p, "utf8") : "";
  const norm = (l) => l.trim().replace(/^\/|\/$/g, "");
  const have = new Set(cur.split(/\r?\n/).map(norm));
  const added = [];
  let block = "";
  for (const [comment, ...lines] of GITIGNORE) {
    const missing = (l) => !have.has(norm(l));
    // `!` 줄은 앞의 패턴보다 뒤에 있어야 효과가 있으므로, 패턴을 새로 더하면 함께 다시 쓴다
    const grow = lines.some((l) => !l.startsWith("!") && missing(l));
    const miss = lines.filter((l) => missing(l) || (grow && l.startsWith("!")));
    if (miss.length) block += `\n${comment}\n${miss.join("\n")}\n`;
    added.push(...miss);
  }
  if (added.length && !dryRun) appendFileSync(p, `${cur && !cur.endsWith("\n") ? "\n" : ""}${block}`);
  return added;
}

// Claude Code SessionStart 훅: 이미지 생성 키와 배포 토큰을 .env에서 세션 셸 환경으로 불러온다(scripts/load-keys.mjs).
// 다른 키와 훅은 그대로 두고 없을 때만 더한다. 반환: 더했으면 true, 이미 있으면 false, settings.json을 읽지 못하거나
// 모양이 예상과 다르면(객체가 아님, hooks가 객체가 아님, SessionStart가 배열이 아님) null.
const KEY_HOOK = 'node "$CLAUDE_PROJECT_DIR/scripts/load-keys.mjs"';
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
export function ensureClaudeHook(target, { dryRun = false } = {}) {
  const p = join(target, ".claude/settings.json");
  let cur = {};
  try {
    if (existsSync(p)) cur = JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
  if (!isObject(cur) || !(cur.hooks === undefined || isObject(cur.hooks))) return null;
  if (!(cur.hooks?.SessionStart === undefined || Array.isArray(cur.hooks.SessionStart))) return null;
  cur.hooks ??= {};
  cur.hooks.SessionStart ??= [];
  if (cur.hooks.SessionStart.some((g) => g.hooks?.some((h) => h.command?.includes("scripts/load-keys.mjs")))) return false;
  cur.hooks.SessionStart.push({ hooks: [{ type: "command", command: KEY_HOOK }] });
  if (!dryRun) {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, `${JSON.stringify(cur, null, 2)}\n`);
  }
  return true;
}
const HOOK_MANUAL = `.claude/settings.json을 읽지 못했다. hooks.SessionStart에 ${KEY_HOOK} 명령을 직접 더하세요`;

// 벤더 스킬은 upstream 원본이다. `pnpm check`(biome check --write .)가 고쳐 쓰면 skills-lock.json의 contentHash와 어긋난다.
// OMC·OMX·impeccable 상태 파일과 .claude/settings.json, .codex/(OMX 생성물)는 도구가 다시 쓰는 파일이다.
// biome.json은 vcs.useIgnoreFile이 꺼져 있어 .gitignore만으로는 빠지지 않는다.
// 마이그레이션(drizzle-kit), schema/auth.ts(`auth:generate`), src/env.ts(varlock이 설치·실행 때마다 다시 씀)는 생성물이라
// 포맷해도 다시 생성하면 지적이 돌아온다. html/(pnpm export:html이 만든 정적 사이트)은 빌드 결과물이다.
const BIOME_IGNORES = [
  "!.agents/skills", "!skills-lock.json", "!**/.omc", "!**/.omx", "!**/.impeccable", "!.claude", "!.codex",
  "!packages/db/src/migrations", "!packages/db/src/schema/auth.ts", "!apps/web/src/env.ts", "!packages/db/src/env.ts",
  "!html",
];
// shadcn의 label.tsx·input-group.tsx는 upstream 코드라 BTS 생성 직후부터 a11y 오류 4건이 난다(범용 Label 래퍼,
// role="group", 애드온 클릭 포커스). 고쳐 써도 `shadcn add --overwrite`가 되돌리므로 이 두 파일에서만 세 규칙을 끈다.
const SHADCN_A11Y = ["packages/ui/src/components/label.tsx", "packages/ui/src/components/input-group.tsx"];
const BIOME_OVERRIDE = {
  includes: SHADCN_A11Y,
  linter: { rules: { a11y: { noLabelWithoutControl: "off", useKeyWithClickEvents: "off", useSemanticElements: "off" } } },
};
export function ensureBiomeConfig(target, { dryRun = false } = {}) {
  const p = join(target, "biome.json");
  if (!existsSync(p)) return null;
  const text = readFileSync(p, "utf8");
  const cfg = JSON.parse(text);
  cfg.files ??= {};
  cfg.files.includes ??= ["**"];
  const added = BIOME_IGNORES.filter((g) => !cfg.files.includes.includes(g));
  cfg.files.includes.push(...added);
  cfg.overrides ??= [];
  if (!cfg.overrides.some((o) => o.includes?.some((g) => SHADCN_A11Y.includes(g)))) {
    cfg.overrides.push(BIOME_OVERRIDE);
    added.push("overrides(shadcn label.tsx·input-group.tsx a11y 3개 끔)");
  }
  if (added.length && !dryRun) writeFileSync(p, `${JSON.stringify(cfg, null, text.match(/^([ \t]+)"/m)?.[1] ?? "\t")}\n`);
  return added;
}

// turbo 2.11.5부터 AI 에이전트가 turbo를 실행하면 루트 AGENTS.md에 규칙 블록을 쓰고 "커밋해 두라"고 지시한다(agentGuidance).
// 커밋 규칙과 부딪히므로 끈다. 2.11.4 이하는 이 키를 모르는 키로 거부하므로, 설치된 turbo의 schema.json에 키가 있을 때만 넣는다.
// ponytail: BTS turbo.json처럼 "$schema" 줄이 있을 때만 그 뒤에 한 줄을 끼운다(키 순서와 포맷 유지).
// 반환: 넣었으면 "added", 넣어야 하는데 자리를 못 찾았으면(주석이 든 turbo.json, "$schema" 없음) "manual", 할 일이 없으면 null.
export function ensureTurboAgentGuidance(target, { dryRun = false } = {}) {
  const p = join(target, "turbo.json");
  const schema = join(target, "node_modules/turbo/schema.json");
  if (!existsSync(p) || !existsSync(schema) || !readFileSync(schema, "utf8").includes('"agentGuidance"')) return null;
  const text = readFileSync(p, "utf8");
  try {
    if ("agentGuidance" in JSON.parse(text)) return null;
  } catch {
    return "manual";
  }
  const next = text.replace(/^([ \t]*)"\$schema"[^\r\n]*,(\r?\n)/m, '$&$1"agentGuidance": false,$2');
  // 중첩 객체의 "$schema" 줄 뒤에 들어가면 turbo가 모르는 키로 거부하므로 최상위에 들어갔을 때만 쓴다.
  let top = false;
  try {
    top = JSON.parse(next).agentGuidance === false;
  } catch {}
  if (!top) return "manual";
  if (!dryRun) writeFileSync(p, next);
  return "added";
}

const TURBO_MANUAL = 'turbo.json에 "agentGuidance": false를 직접 추가하세요 (turbo가 AGENTS.md에 규칙 블록을 쓰지 않게)';

const jsoncWarning = (target, biome) =>
  biome === null && existsSync(join(target, "biome.jsonc"))
    ? [`경고: biome.jsonc에 files.includes(${BIOME_IGNORES.join(", ")})와 overrides(${SHADCN_A11Y.join(", ")}: a11y 3개 끔)를 직접 추가하세요`]
    : [];

export function formatWithBiome(target, rels) {
  const bin = join(target, "node_modules/.bin/biome");
  const hasConfig = existsSync(join(target, "biome.json")) || existsSync(join(target, "biome.jsonc"));
  if (!hasConfig || !existsSync(bin) || rels.length === 0) return "건너뜀";
  const r = run(bin, ["check", "--write", "--no-errors-on-unmatched", ...rels], { cwd: target });
  return r.status === 0 ? "적용" : `경고 — biome check 실패: ${`${r.stdout}${r.stderr}`.trim().split("\n")[0]}`;
}

export function main(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  const args = argv.filter((a) => !a.startsWith("--"));
  if (args.length !== 1) {
    console.error("사용법: install.sh <project-dir> [--diff] [--skip-skills] [--with-global]");
    return 1;
  }
  // realpath: 대상이 심볼릭 링크로 연결된 경로(예: macOS의 /tmp)면 node가 하위 프로세스로 실행하는
  // 스크립트의 import.meta.url과 argv 경로가 달라져 CLI 진입점 판별이 어긋난다. 실재 경로로 고정한다.
  const abs = resolve(args[0]);
  let target = abs;
  try {
    target = realpathSync(abs);
  } catch {}
  const pre = preflight(target);
  for (const w of pre.warnings) console.log(`경고: ${w}`);
  if (pre.errors.length) {
    for (const e of pre.errors) console.error(`오류: ${e}`);
    return 1;
  }
  const diff = flags.has("--diff");
  const files = copyFiles(target, { diff });
  const kept = files.kept.map((k) => k.rel).join(", ") || "없음";
  if (diff) {
    // 미리 보기: 파일을 쓰지 않고 차이와 더할 항목만 보여 준다. 반영은 그 프로젝트의 dev-cycle 라운드에서 한다.
    const biome = ensureBiomeConfig(target, { dryRun: true });
    const turbo = ensureTurboAgentGuidance(target, { dryRun: true });
    const hook = ensureClaudeHook(target, { dryRun: true });
    console.log([
      `파일: 복사 예정 ${files.copied.join(", ") || "없음"}, 덧붙임 예정 ${files.appended.join(", ") || "없음"}, 동일 ${files.same.length}, 유지(템플릿과 다름) ${kept}`,
      ...files.kept.map((k) => k.diff),
      ...files.filled.map((f) => `${f}: 설치기가 채움, 유지`),
      `package.json scripts 추가 예정: ${addScripts(target, { dryRun: true }).join(", ") || "없음"}`,
      `.gitignore 추가 예정: ${ensureGitignore(target, { dryRun: true }).join(", ") || "없음"}`,
      `biome.json 추가 예정: ${biome?.join(", ") || "없음"}`,
      ...jsoncWarning(target, biome),
      `turbo.json 추가 예정: ${turbo === "added" ? '"agentGuidance": false' : "없음"}`,
      `.claude/settings.json 추가 예정: ${hook ? "SessionStart 훅(scripts/load-keys.mjs)" : "없음"}`,
      ...(hook === null ? [`경고: ${HOOK_MANUAL}`] : []),
      ...(turbo === "manual" ? [`경고: ${TURBO_MANUAL}`] : []),
      ...legacyWarning(target),
      "미리 보기라 파일을 쓰지 않았다. 없는 파일과 항목은 --diff 없이 다시 실행해 더하고(--skip-skills. 템플릿 파일은 덮어쓰지 않고 설정 파일에는 항목만 더한다), 유지(템플릿과 다름) 파일은 직접 옮긴다",
    ].join("\n"));
    return 0;
  }
  const links = linkSkills(target);
  const dc = files.copied.includes(".dev-cycle.json") ? configureDevCycle(target) : null;
  const scripts = addScripts(target);
  const gitignore = ensureGitignore(target);
  const biomeConfig = ensureBiomeConfig(target);
  const turbo = ensureTurboAgentGuidance(target);
  const hook = ensureClaudeHook(target);
  const toFormat = [
    ...files.copied.filter((f) => /\.(mjs|js|json)$/.test(f)),
    ...(scripts.length ? ["package.json"] : []),
    ...(biomeConfig?.length ? ["biome.json"] : []),
  ];
  const biome = formatWithBiome(target, toFormat);
  const agents = run(process.execPath, [join(target, "scripts/sync-agents.mjs")], { cwd: target });
  // 스킬·플러그인·OMX 설치와 전역 도구 안내는 프로젝트에 복사한 스크립트가 한다. 팀원도 pnpm skills:setup으로 같은 것을 한다.
  const skipSkills = flags.has("--skip-skills") ? "--skip-skills" : null;
  const skills = skipSkills
    ? null
    : run(process.execPath, [join(target, "scripts/skills-setup.mjs"), ...(flags.has("--with-global") ? ["--with-global"] : [])], {
        cwd: target,
        stdio: "inherit",
      });

  const out = [
    `파일: 복사 ${files.copied.length}, 덧붙임 ${files.appended.join(", ") || "없음"}, 동일 ${files.same.length}, 유지(템플릿과 다름) ${kept}`,
    ...files.filled.map((f) => `${f}: 설치기가 채움, 유지`),
    `스킬 링크: 생성 ${links.created.join(", ") || "없음"}${links.conflicts.length ? `, 충돌 ${links.conflicts.join(", ")} (직접 확인)` : ""}`,
    ...(dc ? [`.dev-cycle.json: 기본 브랜치 ${dc.defaultBranch}, commands ${Object.keys(dc.commands).join(", ") || "없음"}`] : []),
    `package.json scripts 추가: ${scripts.join(", ") || "없음"}`,
    ...(gitignore.length ? [`.gitignore: ${gitignore.join(", ")} 추가`] : []),
    ...(biomeConfig?.length ? [`biome.json 추가: ${biomeConfig.join(", ")}`] : []),
    ...jsoncWarning(target, biomeConfig),
    ...(turbo === "added" ? ['turbo.json: "agentGuidance": false 추가 (turbo가 AGENTS.md에 규칙 블록을 쓰지 않게)'] : []),
    ...(turbo === "manual" ? [`경고: ${TURBO_MANUAL}`] : []),
    ...(hook ? [".claude/settings.json: SessionStart 훅(scripts/load-keys.mjs) 추가 (.env의 이미지 키와 배포 토큰을 세션에 불러온다)"] : []),
    ...(hook === null ? [`경고: ${HOOK_MANUAL}`] : []),
    ...legacyWarning(target),
    `biome 포맷: ${biome}`,
    `에이전트 생성물(Codex·Antigravity): ${`${agents.stdout}${agents.stderr}`.trim().split("\n").join("; ")}`,
    skills === null
      ? `스킬·플러그인: 건너뜀 (${skipSkills}) → 나중에 pnpm skills:setup`
      : `스킬·플러그인: ${skills.status === 0 ? "위 skills-setup 결과 참고" : `실패 (exit ${skills.status}) → 위 출력을 보고 pnpm skills:setup으로 다시 실행`}`,
    "다음 할 일:",
    "  1. 첫 마이그레이션(README 설치한 뒤 1번)까지 마치고, pnpm check로 BTS가 만든 코드의 포맷을 한 번 정리해 pnpm exec biome check .가 exit 0인지 본 뒤 기본 브랜치에 커밋한다 (커밋 전에 연 dev-cycle 라운드는 설치 파일이 diff에 섞여 audit이 F 상향을 요구한다)",
    "  2. 새 에이전트 세션을 열어 스킬과 에이전트를 불러온다 (Claude는 프로젝트를 신뢰해야 project 플러그인을 켜고, Codex는 신뢰해야 .codex/agents를 읽는다. Antigravity는 .agents/agents와 .agents/skills를 읽는다. Grok Build는 폴더를 신뢰해야 AGENTS.md와 프로젝트 스킬을 읽는다: 처음 열 때 신뢰하거나 grok --trust)",
    "  3. 개발자마다 한 번 프로젝트 루트에서 .agents/skills/impeccable/scripts/impeccable hooks on (스킬 호출로 켜지 않는다. Codex는 /hooks에서 신뢰 확인. Antigravity에서는 돌지 않고 Grok Build에서 도는지는 확인하지 않았다)",
    "  4. GLOSSARY.md와 docs/domain/project.md에 서비스 이름과 요약을 채운다",
    "  5. 첫 UI 라운드에서 impeccable init으로 PRODUCT.md를 만든다",
  ];
  console.log(out.join("\n"));
  if (skills && skills.status !== 0) return 2;
  return agents.status === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
