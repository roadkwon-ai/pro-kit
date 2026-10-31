#!/usr/bin/env node
// pro-kit 템플릿 설치기. install.sh가 이 파일을 실행한다. prokit-next-neon과 prokit-next-supabase에서 내용이 같다(tests/shared-files.test.mjs).
// 사용법: install.sh <project-dir> [--diff] [--skip-skills] [--with-global]
//          [--brain <이름|none>] [--simplicity <이름|none>] [--matt <스킬>[,…]] [--optional <묶음>[,…]]
import { spawnSync } from "node:child_process";
import {
  appendFileSync, copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, realpathSync, statSync, symlinkSync, writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readChoices, recordChoices } from "./files/scripts/skills-setup.mjs";

export const TEMPLATE_DIR = dirname(fileURLToPath(import.meta.url));
export const FILES_DIR = join(TEMPLATE_DIR, "files");
const MARK_START = "<!-- prokit-template:start -->";
// bts-starter-kit 시절 설치본의 마커. 이 블록이 있어도 덧붙이지 않는다(옮기는 법은 템플릿 저장소 AGENTS.md의 갱신 절차).
const LEGACY_MARK_START = "<!-- bts-template:start -->";
const MERGE_MD = new Set(["AGENTS.md", "CLAUDE.md"]);
const IGNORE = new Set([".DS_Store", ".omc"]);
// 설치기가 첫 복사 뒤 프로젝트 값으로 채우는 파일. 템플릿과 늘 다르므로 "유지(템플릿과 다름)"·--diff에서 뺀다.
const FILLED = new Set([".dev-cycle.json"]);
// 값을 받는 인자. 그대로 skills-setup.mjs에 넘긴다.
const VALUE_FLAGS = new Set(["--brain", "--simplicity", "--matt", "--optional"]);
// 설치기만 쓰는 값 인자. .dev-cycle.json에 기록한다(projectType, legacy.path).
// --default-branch: 도입 브랜치(prokit/setup)에서 계속 작업할 때 dev-cycle의 기준 브랜치로 기록한다.
const OWN_VALUE_FLAGS = new Set(["--project-type", "--legacy", "--default-branch"]);
const BOOL_FLAGS = new Set(["--diff", "--skip-skills", "--with-global", "--adopt"]);
export const PROJECT_TYPES = ["new", "early", "operating", "migration"];
// --adopt: Better-T-Stack 구조가 아닌 Next.js 프로젝트에는 하네스만 복사한다. AGENTS.md·CLAUDE.md 블록은 adopt/에서 가져온다.
const ADOPT_DIR = join(TEMPLATE_DIR, "adopt");
const ADOPT_SKILLS = ["prokit-dev-cycle", "prokit-verify", "prokit-web", "prokit-ui", "prokit-skills-update", "prokit-skills-manage"];
const ADOPT_SCRIPTS = ["dev-cycle", "delegation", "resource-guard", "skills-setup", "sync-agents", "load-keys"];
const ADOPT_ONLY = new Set(["AGENTS.md", "CLAUDE.md", ".dev-cycle.json", "skills.manifest.json", "GLOSSARY.md", "docs/dev-workflow.md", "docs/domain/project.md"]);
export function adoptFile(rel) {
  const skill = rel.match(/^\.agents\/skills\/([^/]+)\//)?.[1];
  if (skill) return ADOPT_SKILLS.includes(skill);
  const script = rel.match(/^scripts\/([^/]+)\.mjs$/)?.[1];
  if (script) return ADOPT_SCRIPTS.includes(script);
  return /^(\.claude\/agents|tasks|licenses)\//.test(rel) || ADOPT_ONLY.has(rel);
}
// adopt 프로젝트의 첫 경로 규칙. 흔한 Next.js 배치로 추정하고, 규칙 밖 코드는 무거운 F로 본다.
// 정밀 분석 뒤 첫 H Task에서 프로젝트 구조에 맞게 고친다. H 규칙은 템플릿 .dev-cycle.json의 것을 그대로 쓴다.
export const ADOPT_RULES = [
  { case: "E", match: "(^|/)(prisma|drizzle|migrations)/|(^|/)schema\\.prisma$", why: "DB 스키마·마이그레이션(추정)" },
  { case: "D", match: "(^|/)(src/)?(app|pages)/api/|(^|/)(server|trpc)/", why: "서버·API(추정)" },
  { case: "B", match: "(^|/)(src/)?(app|pages|components|styles)/", why: "화면·UI(추정)" },
];
export const ADOPT_F = { case: "F", match: "\\.(ts|tsx|js|jsx|mjs|cjs)$", why: "경로 규칙 밖 코드(정밀 분석 뒤 첫 H Task에서 규칙을 맞춘다)" };
// 하네스 경로가 넓은 추정 규칙(예: components/)에 먼저 걸리지 않게 H를 앞에 둔다. 루트 package.json은 앱의 의존성 목록이라 작업공간 설정 규칙은 뺀다.
export const adoptRules = (rules) => [...rules.filter((r) => r.case === "H" && r.why !== "작업공간 설정"), ...ADOPT_RULES, ADOPT_F];
// auth.config.ts·lib/auth-client.ts·lib/next-auth.ts·app/(auth)/·app/(protected)/도 인증 경로다(보안 리뷰 행이 붙는다).
export const ADOPT_AUTH = "(^|/)(auth|middleware|proxy)(/|\\.[cm]?[jt]sx?$)|(^|/)(next-)?auth([.-][\\w.-]*)?\\.[cm]?[jt]sx?$|(^|/)\\((auth[\\w-]*|protected)\\)/|(^|/)\\.env\\.schema$";
const OLD_SETUP =
  "이 프로젝트의 scripts/skills-setup.mjs는 --brain·--simplicity·--matt(또는 두뇌 여러 개)를 모르는 옛 판이다 → 템플릿의 scripts/skills-setup.mjs와 skills.manifest.json을 먼저 옮긴 뒤 pnpm skills:setup을 다시 실행한다";
const USAGE = "사용법: install.sh <project-dir> [--diff] [--skip-skills] [--with-global] [--brain <이름>[,…]|none] [--simplicity <이름|none>] [--matt <스킬>[,…]] [--optional <묶음>[,…]] [--project-type new|early|operating|migration] [--legacy <기존 코드 경로>] [--adopt] [--default-branch <브랜치>]";

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: "utf8", ...opts });

// 루트나 한 단계 아래 작업 공간(apps/*, packages/*)의 package.json에 next가 있으면 그 경로를 돌려준다.
export function findNext(target) {
  const nested = ["apps", "packages"].flatMap((d) => {
    try {
      return readdirSync(join(target, d)).map((n) => `${d}/${n}/package.json`);
    } catch {
      return [];
    }
  });
  return ["package.json", ...nested].find((p) => {
    try {
      const j = JSON.parse(readFileSync(join(target, p), "utf8"));
      return Boolean(j?.dependencies?.next || j?.devDependencies?.next);
    } catch {
      return false;
    }
  }) ?? null;
}

export function preflight(target, platform = process.platform, node = process.versions.node, { adopt = false } = {}) {
  const errors = [];
  const warnings = [];
  // 설치기와 스킬은 bash, 심볼릭 링크, Linux·macOS 명령을 전제한다. Windows 셸에서는 pnpm.cmd·npx.cmd부터 띄우지 못한다.
  if (platform === "win32") return { errors: ["Windows에서는 WSL2(Ubuntu) 안에서 실행한다 (템플릿 README의 준비물 절)"], warnings };
  if (!existsSync(target) || !lstatSync(target).isDirectory()) return { errors: [`대상 디렉터리가 없다: ${target}`], warnings };
  if (run("git", ["rev-parse", "--git-dir"], { cwd: target }).status !== 0) {
    errors.push("git 저장소가 아니다 (Better-T-Stack 생성 때 --git을 쓰거나 git init을 먼저 한다)");
  }
  try {
    const pkg = JSON.parse(readFileSync(join(target, "package.json"), "utf8"));
    if (!pkg || typeof pkg !== "object" || Array.isArray(pkg)) throw new Error("JSON 객체가 아니다");
  } catch (e) {
    errors.push(`루트 package.json을 읽을 수 없다: ${e.code === "ENOENT" ? "파일 없음" : e.message}`);
  }
  if (adopt) {
    if (!findNext(target)) errors.push("next 의존성을 찾지 못했다(루트, apps/*, packages/*의 package.json) → Next.js가 아닌 프로젝트는 전환(migration)으로 새 폴더에 만든다");
  } else {
    const webPkg = join(target, "apps/web/package.json");
    try {
      const web = existsSync(webPkg) ? JSON.parse(readFileSync(webPkg, "utf8")) : {};
      if (!web?.dependencies?.next && !web?.devDependencies?.next) {
        errors.push(`apps/web/package.json에 next 의존성이 없다 (Better-T-Stack --frontend next 프로젝트가 아니다${findNext(target) ? ". Better-T-Stack 구조가 아닌 Next.js 프로젝트는 --adopt로 하네스만 설치한다" : ""})`);
      }
    } catch (e) {
      errors.push(`apps/web/package.json을 읽을 수 없다: ${e.message}`);
    }
  }
  // 22.20: skills CLI(engines)가 요구하는 하한. 24: 지금 LTS이고 agent-browser가 engines에 적은 판(22에서도 돈다)
  const [major, minor] = node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 20)) errors.push(`Node 22.20 이상이 필요하다 (현재 ${node})`);
  else if (major < 24) warnings.push(`Node 24 이상을 권장한다 (현재 ${node})`);
  if (run("pnpm", ["--version"]).status !== 0) errors.push("pnpm이 없다");
  for (const p of adopt ? [] : ["packages/db/drizzle.config.ts", "packages/api", "packages/auth"]) {
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

// 운영 중인 프로젝트에는 앱 폴더에 파일을 더하지 않는다(쓰지 않는 제작 표시 컴포넌트).
const APP_CREDIT = "apps/web/src/components/prokit-credit.tsx";
export function copyFiles(target, { diff = false, adopt = false, operating = false } = {}) {
  const r = { copied: [], appended: [], same: [], kept: [], filled: [] };
  for (const rel of walk(FILES_DIR).filter((f) => (!adopt || adoptFile(f)) && !(operating && f === APP_CREDIT))) {
    const src = adopt && MERGE_MD.has(rel) ? join(ADOPT_DIR, rel) : join(FILES_DIR, rel);
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

export function configureDevCycle(target, { adopt = false } = {}) {
  const p = join(target, ".dev-cycle.json");
  const cfg = JSON.parse(readFileSync(p, "utf8"));
  if (adopt) {
    cfg.adopt = true;
    cfg.rules = adoptRules(cfg.rules);
    cfg.authPaths = ADOPT_AUTH;
  }
  const scripts = JSON.parse(readFileSync(join(target, "package.json"), "utf8")).scripts ?? {};
  const found = {};
  // adopt 프로젝트는 그 프로젝트의 패키지 관리자와 스크립트 이름을 쓴다. Better-T-Stack은 pnpm이다.
  const lock = (f) => existsSync(join(target, f));
  const pm = !adopt || lock("pnpm-lock.yaml") ? "pnpm" : lock("yarn.lock") ? "yarn" : lock("bun.lock") || lock("bun.lockb") ? "bun run" : lock("package-lock.json") ? "npm run" : "pnpm";
  const typecheck = ["check-types", ...(adopt ? ["typecheck", "type-check"] : [])].find((k) => scripts[k]);
  if (typecheck) found.typecheck = `${pm} ${typecheck}`;
  if (existsSync(join(target, "biome.json")) || existsSync(join(target, "biome.jsonc"))) found.lint = `${pm === "pnpm" ? "pnpm exec" : pm === "npm run" ? "npx" : pm === "yarn" ? "yarn" : "bunx"} biome check .`;
  else if (scripts.lint) found.lint = `${pm} lint`;
  if (scripts.build) found.build = `${pm} build`;
  if (scripts.test) found.test = `${pm} test`;
  // Better-T-Stack의 루트 db:* 스크립트는 turbo interactive 태스크라 TTY 없는 에이전트 셸에서 실패한다.
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
  writeFileSync(p, `${JSON.stringify(cfg, null, "\t")}\n`);
  return { commands: cfg.commands, defaultBranch: cfg.defaultBranch };
}

// 프로젝트 유형(projectType), adopt, 전환의 기존 코드 경로(legacy.path), 도입 브랜치(defaultBranch)를 기록한다. 다른 키는 그대로 둔다.
export function recordProject(target, { projectType, adopt, legacy, defaultBranch }) {
  const p = join(target, ".dev-cycle.json");
  const text = readFileSync(p, "utf8");
  const cfg = JSON.parse(text);
  if (projectType) cfg.projectType = projectType;
  // .dev-cycle.json이 이미 있던 프로젝트도 adopt로 기록해야 skills-setup이 Better-T-Stack 전용 스킬을 설치하지 않는다.
  if (adopt) cfg.adopt = true;
  if (legacy) cfg.legacy = { path: legacy };
  if (defaultBranch) cfg.defaultBranch = defaultBranch;
  // 바뀐 것이 없으면 쓰지 않는다. 다시 쓰면 한 줄 배열(brain)이 펼쳐져 Biome 형식과 달라진다.
  if (JSON.stringify(cfg) !== JSON.stringify(JSON.parse(text))) writeFileSync(p, `${JSON.stringify(cfg, null, text.match(/^([ \t]+)"/m)?.[1] ?? "\t")}\n`);
}

const RESOURCE_ORIGINALS = ["dev", "dev:web", "build"];

// 첫 설치에서만 Better-T-Stack 명령을 이름 있는 별칭으로 보존한 뒤 guard를 앞에 둔다.
// 이미 설치된 프로젝트는 원본 명령을 바꾸지 않고 H 라운드에서 명시적으로 전환한다.
export function isFreshBtsInstall(target) {
  const agents = join(target, "AGENTS.md");
  const scripts = JSON.parse(readFileSync(join(target, "package.json"), "utf8")).scripts ?? {};
  return !existsSync(join(target, ".dev-cycle.json")) &&
    !(existsSync(agents) && readFileSync(agents, "utf8").includes(MARK_START)) &&
    !Object.keys(scripts).some((name) => name.startsWith("prokit:"));
}

export function addScripts(target, { dryRun = false, wrapResources = false, adopt = false } = {}) {
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
    "resource:check": "node scripts/resource-guard.mjs check",
    "resource:run": "node scripts/resource-guard.mjs run",
    "resource:clean": "node scripts/resource-guard.mjs clean",
    "delegation:capture": "node scripts/delegation.mjs capture",
    "delegation:validate": "node scripts/delegation.mjs validate",
    release: "node scripts/release.mjs",
  };
  // adopt는 배포·내보내기·릴리스 스크립트를 복사하지 않으므로 그 명령도 더하지 않는다.
  if (adopt) for (const k of ["vercel:deploy", "export:html", "release"]) delete want[k];
  pkg.scripts ??= {};
  const added = Object.keys(want).filter((k) => !(k in pkg.scripts));
  for (const k of added) pkg.scripts[k] = want[k];
  const wrapped = [];
  if (wrapResources) {
    for (const name of RESOURCE_ORIGINALS) {
      const original = pkg.scripts[name];
      if (!original) continue;
      const saved = `prokit:original:${name}`;
      const guarded = `prokit:resource:${name}`;
      const kind = name.replace(":", "-");
      if (pkg.scripts[saved] || pkg.scripts[guarded]) {
        throw new Error(`${saved} 또는 ${guarded}가 이미 있어 resource 래퍼 전환을 멈췄다`);
      }
      pkg.scripts[saved] = original;
      pkg.scripts[guarded] = `node scripts/resource-guard.mjs run --kind ${kind} -- pnpm run ${saved}`;
      pkg.scripts[name] = `pnpm run ${guarded}`;
      wrapped.push(name);
    }
  }
  if ((added.length || wrapped.length) && !dryRun) writeFileSync(p, `${JSON.stringify(pkg, null, indent)}\n`);
  return { added, wrapped };
}

const GITIGNORE = [
  ["# dev-cycle 증거 파일 (스크린샷 등)", "tasks/evidence/"],
  ["# OMC·OMX·pro-kit 런타임 상태", ".omc/", ".omx/", ".prokit/"],
  // skills-setup이 이 기기 전역의 고르지 않은 두뇌·플러그인을 끄는 개인 설정(기기마다 다르다)
  ["# Claude Code 개인 설정", ".claude/settings.local.json"],
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
  ["# taste-skill 작업 파일(선택 묶음 taste: 방향 시트, 기록, 검사 화면)", "/.taste-skill/"],
  // Better-T-Stack은 apps/web만 .env*를 무시한다. 루트와 packages/*의 .env.production 같은 파일도 막는다
  ["# 환경별 .env (비밀값). 배포 환경변수는 Vercel에 둔다", ".env.*", "!.env.schema", "!.env.example"],
  ["# pnpm export:html 결과(정적 HTML)", "/html/"],
];
export function ensureGitignore(target, { dryRun = false, adopt = false } = {}) {
  const p = join(target, ".gitignore");
  const cur = existsSync(p) ? readFileSync(p, "utf8") : "";
  const norm = (l) => l.trim().replace(/^\/|\/$/g, "");
  const have = new Set(cur.split(/\r?\n/).map(norm));
  const added = [];
  let block = "";
  // adopt는 export:html을 설치하지 않는다. 루트 html/이 그 프로젝트의 실제 폴더일 수 있어 무시하지 않는다.
  for (const [comment, ...lines] of GITIGNORE.filter(([c]) => !adopt || !c.includes("export:html"))) {
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
// 모양이 예상과 다르면(객체가 아님, hooks가 객체가 아님, 훅 이벤트 값이 배열이 아님) null.
const KEY_HOOK = 'node "$CLAUDE_PROJECT_DIR/scripts/load-keys.mjs"';
// PostToolUse 훅: Skill 호출과 SKILL.md Read를 .prokit/skills-used.jsonl에 남긴다. audit이 단계 행 증거의 스킬 이름과 대조한다.
const LOG_HOOK = 'node "$CLAUDE_PROJECT_DIR/scripts/dev-cycle.mjs" skill-log';
// PreToolUse 훅: 열린 dev-cycle 라운드 없이 코드·하네스 파일을 Edit·Write로 고치려 하면 막는다.
const EDIT_HOOK = 'node "$CLAUDE_PROJECT_DIR/scripts/dev-cycle.mjs" edit-guard';
const HOOKS = [
  { event: "SessionStart", mark: "scripts/load-keys.mjs", entry: { hooks: [{ type: "command", command: KEY_HOOK }] } },
  { event: "PostToolUse", mark: "dev-cycle.mjs\" skill-log", entry: { matcher: "Skill|Read", hooks: [{ type: "command", command: LOG_HOOK }] } },
  { event: "PreToolUse", mark: "dev-cycle.mjs\" edit-guard", entry: { matcher: "Edit|Write|MultiEdit|NotebookEdit", hooks: [{ type: "command", command: EDIT_HOOK }] } },
];
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
  if (!HOOKS.every(({ event }) => cur.hooks?.[event] === undefined || Array.isArray(cur.hooks[event]))) return null;
  cur.hooks ??= {};
  let added = false;
  for (const { event, mark, entry } of HOOKS) {
    cur.hooks[event] ??= [];
    if (cur.hooks[event].some((g) => g.hooks?.some((h) => h.command?.includes(mark)))) continue;
    cur.hooks[event].push(entry);
    added = true;
  }
  if (!added) return false;
  if (!dryRun) {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, `${JSON.stringify(cur, null, 2)}\n`);
  }
  return true;
}
const HOOK_MANUAL = `.claude/settings.json을 읽지 못했다. hooks.SessionStart에 ${KEY_HOOK}, hooks.PostToolUse(matcher "Skill|Read")에 ${LOG_HOOK}, hooks.PreToolUse(matcher "Edit|Write|MultiEdit|NotebookEdit")에 ${EDIT_HOOK} 명령을 직접 더하세요`;

// git pre-commit 훅: 열린 dev-cycle 라운드나 닫은 라운드 기록 없이 코드·하네스를 커밋하지 못하게 한다(scripts/dev-cycle.mjs guard).
// 어느 세션·도구가 커밋해도 돈다. 훅은 .git 안에 있어 이 사본에만 있고, 새로 clone한 사본은 release.mjs의 검사가 뒤를 받친다.
// core.hooksPath는 바꾸지 않는다(husky·LFS 훅을 끈다). 이미 pre-commit이 있으면 덮어쓰지 않는다.
// 반환: 더했으면 "added", 이미 걸려 있으면 false, 다른 pre-commit이 있으면 그 경로, git 저장소 루트가 아니면 null.
const GUARD_CMD = "node scripts/dev-cycle.mjs guard --staged";
const GUARD_HOOK = `#!/bin/sh
# prokit: 열린 dev-cycle 라운드나 닫은 라운드 기록 없이 코드·하네스를 커밋하지 못하게 한다.
# scripts/dev-cycle.mjs가 없거나 guard를 모르는 옛 판이면 건너뛴다.
grep -qs '"guard"' scripts/dev-cycle.mjs || exit 0
exec ${GUARD_CMD}
`;
export function ensureGitHook(target, { dryRun = false } = {}) {
  const top = run("git", ["rev-parse", "--show-toplevel"], { cwd: target });
  // 상위 저장소의 하위 폴더면 훅이 저장소 루트에서 돌아 scripts/dev-cycle.mjs를 찾지 못한다.
  if (top.status !== 0 || realpathSync(top.stdout.trim()) !== realpathSync(target)) return null;
  const p = resolve(target, run("git", ["rev-parse", "--git-path", "hooks"], { cwd: target }).stdout.trim(), "pre-commit");
  if (existsSync(p)) return readFileSync(p, "utf8").includes(GUARD_CMD) ? false : p;
  if (!dryRun) {
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, GUARD_HOOK, { mode: 0o755 });
  }
  return "added";
}
const gitHookLines = (h, dryRun) =>
  h === "added"
    ? [`git pre-commit 훅${dryRun ? " 추가 예정" : " 추가"}: ${GUARD_CMD} (열린 라운드나 닫은 라운드 기록 없이 코드·하네스를 커밋하지 못하게 한다)`]
    : typeof h === "string"
      ? [`경고: pre-commit 훅이 이미 있어(${h}) 덮어쓰지 않았다. 그 훅에 \`${GUARD_CMD}\` 한 줄을 더한다`]
      : [];

// 벤더 스킬은 upstream 원본이다. `pnpm check`(biome check --write .)가 고쳐 쓰면 skills-lock.json의 contentHash와 어긋난다.
// OMC·OMX·pro-kit·impeccable 상태 파일과 .claude/settings.json, .codex/(OMX 생성물)는 도구가 다시 쓰는 파일이다.
// .agents/agents/(agents:sync가 만드는 Antigravity 에이전트)는 Biome 2.6이 YAML 머리를 다시 맞추면 agents:check가 깨진다.
// biome.json은 vcs.useIgnoreFile이 꺼져 있어 .gitignore만으로는 빠지지 않는다.
// 마이그레이션(drizzle-kit), schema/auth.ts(`auth:generate`), src/env.ts(varlock이 설치·실행 때마다 다시 씀)는 생성물이라
// 포맷해도 다시 생성하면 지적이 돌아온다. html/(pnpm export:html이 만든 정적 사이트)은 빌드 결과물이다.
// 마크다운: Biome 2.6부터 표를 칸 너비로 맞추는데, dev-cycle이 tasks/todo.md에 쓰는 대조표와 AGENTS.md 표의 edition 주석 칸이 매번 다시 바뀌어 lint가 실패한다.
const BIOME_IGNORES = [
  "!.agents/skills", "!.agents/agents", "!skills-lock.json", "!**/.omc", "!**/.omx", "!**/.prokit", "!**/.impeccable", "!.claude", "!.codex",
  "!tasks/evidence",
  "!packages/db/src/migrations", "!packages/db/src/schema/auth.ts", "!apps/web/src/env.ts", "!packages/db/src/env.ts",
  "!html", "!**/*.md",
];
// shadcn의 label.tsx·input-group.tsx는 upstream 코드라 Better-T-Stack 생성 직후부터 a11y 오류 4건이 난다(범용 Label 래퍼,
// role="group", 애드온 클릭 포커스). 고쳐 써도 `shadcn add --overwrite`가 되돌리므로 이 두 파일에서만 세 규칙을 끈다.
const SHADCN_A11Y = ["packages/ui/src/components/label.tsx", "packages/ui/src/components/input-group.tsx"];
const BIOME_OVERRIDE = {
  includes: SHADCN_A11Y,
  linter: { rules: { a11y: { noLabelWithoutControl: "off", useKeyWithClickEvents: "off", useSemanticElements: "off" } } },
};
export function ensureBiomeConfig(target, { dryRun = false, extra = [], adopt = false } = {}) {
  const p = join(target, "biome.json");
  if (!existsSync(p)) return null;
  const text = readFileSync(p, "utf8");
  const cfg = JSON.parse(text);
  // adopt: 그 프로젝트의 Biome 설정은 두고 하네스·벤더 파일만 뺀다. files.includes가 없는 Biome 1 설정은 직접 넣게 한다.
  if (adopt && (cfg.files?.ignore || /schemas\/1\./.test(cfg.$schema ?? ""))) return "manual";
  cfg.files ??= {};
  cfg.files.includes ??= ["**"];
  const added = [...(adopt ? BIOME_ADOPT_IGNORES : BIOME_IGNORES), ...extra].filter((g) => !cfg.files.includes.includes(g));
  cfg.files.includes.push(...added);
  if (!adopt) {
    cfg.overrides ??= [];
    if (!cfg.overrides.some((o) => o.includes?.some((g) => SHADCN_A11Y.includes(g)))) {
      cfg.overrides.push(BIOME_OVERRIDE);
      added.push("overrides(shadcn label.tsx·input-group.tsx a11y 3개 끔)");
    }
  }
  if (added.length && !dryRun) writeFileSync(p, `${JSON.stringify(cfg, null, text.match(/^([ \t]+)"/m)?.[1] ?? "\t")}\n`);
  return added;
}

// turbo 2.11.5부터 AI 에이전트가 turbo를 실행하면 루트 AGENTS.md에 규칙 블록을 쓰고 "커밋해 두라"고 지시한다(agentGuidance).
// 커밋 규칙과 부딪히므로 끈다. 2.11.4 이하는 이 키를 모르는 키로 거부하므로, 설치된 turbo의 schema.json에 키가 있을 때만 넣는다.
// ponytail: Better-T-Stack turbo.json처럼 "$schema" 줄이 있을 때만 그 뒤에 한 줄을 끼운다(키 순서와 포맷 유지).
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

// turbo의 엄격 환경 변수 모드는 프록시 변수를 작업에 넘기지 않는다(2.11.7 실측: HTTPS_PROXY가 작업 안에서 비어 있음).
// 프록시 뒤(회사망, Codex 샌드박스)에서 빌드의 next/font/google 받기가 실패하므로 globalPassThroughEnv에 넣는다. 통과 변수는 캐시 해시에 들어가지 않는다.
// 이미 globalPassThroughEnv가 있으면 사용자 목록이라 고치지 않고, 프록시 변수가 빠졌으면 "manual"로 알린다. 반환은 ensureTurboAgentGuidance와 같다.
export const TURBO_PROXY_ENV = ["HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "no_proxy"];
export function ensureTurboProxyEnv(target, { dryRun = false } = {}) {
  const p = join(target, "turbo.json");
  if (!existsSync(p)) return null;
  const text = readFileSync(p, "utf8");
  let cfg;
  try {
    cfg = JSON.parse(text);
  } catch {
    return "manual";
  }
  if ("globalPassThroughEnv" in cfg) return TURBO_PROXY_ENV.every((v) => cfg.globalPassThroughEnv?.includes?.(v)) ? null : "manual";
  const next = text.replace(/^([ \t]*)"\$schema"[^\r\n]*,(\r?\n)/m, `$&$1"globalPassThroughEnv": ${JSON.stringify(TURBO_PROXY_ENV)},$2`);
  let top = false;
  try {
    top = JSON.stringify(JSON.parse(next).globalPassThroughEnv) === JSON.stringify(TURBO_PROXY_ENV);
  } catch {}
  if (!top) return "manual";
  if (!dryRun) writeFileSync(p, next);
  return "added";
}

const TURBO_PROXY_MANUAL = `turbo.json globalPassThroughEnv에 ${TURBO_PROXY_ENV.join(", ")}를 직접 더하세요 (프록시 뒤에서 빌드가 글꼴을 받게)`;
const TURBO_MANUAL = 'turbo.json에 "agentGuidance": false를 직접 추가하세요 (turbo가 AGENTS.md에 규칙 블록을 쓰지 않게)';

// adopt: 프로젝트의 ESLint가 벤더 스킬(upstream 원본)과 하네스 스크립트까지 검사하면 설치만으로 `lint`가 실패한다.
// 고쳐 쓰면 skills-lock.json의 contentHash와 템플릿 원본에서 어긋나므로 globalIgnores로 뺀다.
// shortcut: create-next-app 16 flat config처럼 `globalIgnores([`가 있을 때만 그 배열 앞에 넣는다. 다른 모양은 "manual"로 알린다.
// 반환: 더한 패턴(이미 다 있으면 []), 넣을 자리를 못 찾았으면 "manual", ESLint 설정이 없으면 null.
export const ESLINT_IGNORES = [".agents/**", ...ADOPT_SCRIPTS.map((s) => `scripts/${s}.mjs`)];
export function ensureEslintIgnores(target, { dryRun = false } = {}) {
  const name = ["mjs", "js", "cjs", "ts", "mts", "cts"].map((x) => `eslint.config.${x}`).find((f) => existsSync(join(target, f)));
  if (!name) {
    const legacy =
      readdirSync(target).some((f) => /^\.eslintrc(\.|$)/.test(f)) ||
      "eslintConfig" in JSON.parse(readFileSync(join(target, "package.json"), "utf8"));
    return legacy ? "manual" : null;
  }
  const p = join(target, name);
  const text = readFileSync(p, "utf8");
  const added = ESLINT_IGNORES.filter((g) => !text.includes(`"${g}"`) && !text.includes(`'${g}'`));
  if (!added.length) return [];
  const m = text.match(/globalIgnores\(\s*\[(\r?\n[ \t]*)?/);
  if (!m) return "manual";
  const sep = m[1] ?? " ";
  if (!dryRun) writeFileSync(p, text.replace(m[0], `${m[0]}${added.map((g) => `"${g}",${sep}`).join("")}`));
  return added;
}
const ESLINT_MANUAL = `ESLint 설정에 무시 경로(${ESLINT_IGNORES.join(", ")})를 직접 추가하세요 (벤더 스킬과 하네스 스크립트를 검사하면 lint가 실패한다)`;

// adopt에서 프로젝트 Biome이 검사하지 않게 할 하네스·벤더 파일(설치기가 복사하고 Biome 형식이 그 프로젝트와 다를 수 있다).
const BIOME_ADOPT_IGNORES = ["!.agents", "!.claude", "!.codex", "!skills-lock.json", "!skills.manifest.json", "!.dev-cycle.json", "!tasks", ...ADOPT_SCRIPTS.map((s) => `!scripts/${s}.mjs`)];
const adoptBiomeWarning = (target, biome) =>
  biome === "manual" || (biome === null && existsSync(join(target, "biome.jsonc")))
    ? [`경고: Biome 설정의 검사 대상에서 하네스·벤더 파일(${BIOME_ADOPT_IGNORES.map((g) => g.slice(1)).join(", ")})을 직접 빼세요 (그대로 두면 설치만으로 lint가 실패한다)`]
    : [];
const jsoncWarning = (target, biome) =>
  biome === null && existsSync(join(target, "biome.jsonc"))
    ? [`경고: biome.jsonc에 files.includes(${BIOME_IGNORES.join(", ")})와 overrides(${SHADCN_A11Y.join(", ")}: a11y 3개 끔)를 직접 추가하세요`]
    : [];

export function formatWithBiome(target, rels) {
  const bin = join(target, "node_modules/.bin/biome");
  const hasConfig = existsSync(join(target, "biome.json")) || existsSync(join(target, "biome.jsonc"));
  if (!hasConfig || !existsSync(bin) || rels.length === 0) return "건너뜀";
  const check = () => run(bin, ["check", "--write", "--no-errors-on-unmatched", ...rels], { cwd: target });
  let r = check();
  // 생성기의 biome.json이 설치된 Biome보다 옛 규칙 이름을 쓰면 설정을 읽지 못한다(예: Better-T-Stack 3.47.0의
  // nursery.useSortedClasses, Biome 2.6.2에서 useTailwindSortedClasses). 생성기는 고치지 않고 Biome 공식 migrate로 설정만 맞춘다.
  let migrated = false;
  if (r.status !== 0 && /biome\.jsonc?:\d+:\d+ deserialize/.test(`${r.stdout}${r.stderr}`)) {
    migrated = run(bin, ["migrate", "--write"], { cwd: target }).status === 0;
    if (migrated) r = check();
  }
  if (r.status === 0) return migrated ? "적용 (biome migrate로 biome.json을 설치된 Biome 판에 맞춤)" : "적용";
  return `경고 — biome check 실패: ${`${r.stdout}${r.stderr}`.trim().split("\n")[0]}`;
}

export function main(argv) {
  const flags = new Set();
  const args = [];
  const pass = [];
  const own = {};
  for (let i = 0; i < argv.length; i++) {
    if (VALUE_FLAGS.has(argv[i])) pass.push(argv[i], argv[++i] ?? "");
    else if (OWN_VALUE_FLAGS.has(argv[i])) own[argv[i].slice(2)] = argv[++i] ?? "";
    else if (argv[i].startsWith("--")) flags.add(argv[i]);
    else args.push(argv[i]);
  }
  if (flags.has("--help")) {
    console.log(USAGE);
    return 0;
  }
  // 모르는 플래그를 버리면 오타(--dif, --skip-skill)가 실제 설치가 된다. 값 플래그의 = 형식은 아래에서 따로 알린다.
  const unknown = [...flags].filter((f) => !BOOL_FLAGS.has(f) && !/^--(brain|simplicity|matt|optional|project-type|legacy|default-branch)=/.test(f));
  if (unknown.length) {
    console.error(`모르는 옵션: ${unknown.join(" ")}\n${USAGE}`);
    return 1;
  }
  if (args.length !== 1) {
    console.error(USAGE);
    return 1;
  }
  // 유형과 적용 방식: --adopt는 운영 중인 Next.js(operating)에만, --legacy는 전환(migration)에만 쓴다.
  // 이미 adopt로 설치한 프로젝트는 --adopt 없이 다시 실행해도 adopt로 본다(Better-T-Stack 파일이 섞이지 않게).
  let adopted = false;
  let recordedType;
  try {
    const cfg = JSON.parse(readFileSync(join(resolve(args[0]), ".dev-cycle.json"), "utf8"));
    adopted = cfg.adopt === true;
    recordedType = cfg.projectType;
  } catch {}
  const adopt = flags.has("--adopt") || adopted;
  const projectType = own["project-type"] ?? (adopt ? "operating" : undefined);
  const ownError = [...flags].some((f) => /^--(project-type|legacy|default-branch)=/.test(f))
    ? "사용법: --project-type <유형>, --legacy <경로>처럼 = 없이 띄어 쓴다"
    : projectType !== undefined && !PROJECT_TYPES.includes(projectType)
      ? `사용법: --project-type ${PROJECT_TYPES.join("|")}`
      : adopt && projectType !== "operating"
        ? "--adopt는 운영 중인 Next.js 프로젝트(--project-type operating)에만 쓴다"
        : "legacy" in own && projectType !== "migration"
          ? "--legacy는 전환(--project-type migration)에서만 쓴다"
          : null;
  if (ownError) {
    console.error(ownError);
    return 1;
  }
  // 고르는 값은 복사하기 전에 템플릿 매니페스트로 확인한다.
  // argv 전체를 넘겨 --brain=x 같은 잘못된 형식도 잡는다(pass에는 들어가지 않는다).
  const picked = readChoices(argv, JSON.parse(readFileSync(join(FILES_DIR, "skills.manifest.json"), "utf8")));
  if (picked.error) {
    console.error(picked.error);
    return 1;
  }
  const choices = ["brain", "simplicity"].filter((k) => k in picked).map((k) => `${k} ${[].concat(picked[k]).join(",")}`);
  // realpath: 대상이 심볼릭 링크로 연결된 경로(예: macOS의 /tmp)면 node가 하위 프로세스로 실행하는
  // 스크립트의 import.meta.url과 argv 경로가 달라져 CLI 진입점 판별이 어긋난다. 실재 경로로 고정한다.
  const abs = resolve(args[0]);
  let target = abs;
  try {
    target = realpathSync(abs);
  } catch {}
  const pre = preflight(target, process.platform, process.versions.node, { adopt });
  // 기존 코드 경로는 프로젝트 기준 상대 경로로 기록한다(폴더를 함께 옮겨도 맞게). 안내용이고 스크립트가 쓰지 않는다.
  let legacy;
  if ("legacy" in own) {
    const from = resolve(own.legacy);
    if (!own.legacy || !existsSync(from) || !statSync(from).isDirectory()) pre.errors.push(`--legacy 경로가 폴더가 아니다: ${own.legacy}`);
    else if (realpathSync(from) === target) pre.errors.push("--legacy는 새 프로젝트가 아닌 기존 코드 폴더다");
    else legacy = relative(target, realpathSync(from));
  }
  const defaultBranch = own["default-branch"];
  if (defaultBranch !== undefined && run("git", ["rev-parse", "--verify", "--quiet", `refs/heads/${defaultBranch}`], { cwd: target }).status !== 0)
    pre.errors.push(`--default-branch 브랜치가 없다: ${defaultBranch} (커밋이 있는 로컬 브랜치여야 한다)`);
  for (const w of pre.warnings) console.log(`경고: ${w}`);
  if (pre.errors.length) {
    for (const e of pre.errors) console.error(`오류: ${e}`);
    return 1;
  }
  const project = [
    ...(projectType ? [`projectType ${projectType}`] : []),
    ...(adopt ? ["adopt"] : []),
    ...(legacy ? [`legacy.path ${legacy}`] : []),
    ...(defaultBranch ? [`defaultBranch ${defaultBranch}`] : []),
  ];
  const diff = flags.has("--diff");
  // adopt는 Better-T-Stack 명령이 없으므로 resource 래퍼, biome·turbo 설정, Biome 포맷을 하지 않는다.
  // 운영 중인 프로젝트(operating)는 dev·build가 배포와 CI에 쓰이므로 래퍼를 씌우지 않는다(H 라운드에서 증거와 함께 바꾼다).
  const freshBts = !adopt && projectType !== "operating" && isFreshBtsInstall(target);
  const operating = (projectType ?? recordedType) === "operating";
  const files = copyFiles(target, { diff, adopt, operating });
  // early: 옮겨 둔 프로토타입(prototype/)은 참고 자료라 Biome 검사에서 뺀다.
  const biomeExtra = projectType === "early" ? ["!prototype"] : [];
  const kept = files.kept.map((k) => k.rel).join(", ") || "없음";
  // 템플릿 파일은 덮어쓰지 않으므로, 옛 판 skills-setup.mjs가 남으면 --brain 등을 조용히 무시한다.
  // 두뇌를 여럿 고르면 배열로 기록하는데, 그 전 판(multi: true가 없는 판)은 배열을 모르는 이름으로 본다.
  const setupText = files.kept.some((k) => k.rel === "scripts/skills-setup.mjs")
    ? readFileSync(join(target, "scripts/skills-setup.mjs"), "utf8")
    : null;
  const oldSetup =
    setupText !== null &&
    (((choices.length > 0 || picked.matt.length > 0) && !setupText.includes('"--brain"')) ||
      (Array.isArray(picked.brain) && !setupText.includes("multi: true")))
      ? [`경고: ${OLD_SETUP}`]
      : [];
  if (diff) {
    // 미리 보기: 파일을 쓰지 않고 차이와 더할 항목만 보여 준다. 반영은 그 프로젝트의 dev-cycle 라운드에서 한다.
    const biome = ensureBiomeConfig(target, { dryRun: true, extra: adopt ? [] : biomeExtra, adopt });
    const turbo = adopt ? null : ensureTurboAgentGuidance(target, { dryRun: true });
    const proxy = adopt ? null : ensureTurboProxyEnv(target, { dryRun: true });
    const eslint = adopt ? ensureEslintIgnores(target, { dryRun: true }) : null;
    const hook = ensureClaudeHook(target, { dryRun: true });
    const gitHook = ensureGitHook(target, { dryRun: true });
    console.log([
      `파일: 복사 예정 ${files.copied.join(", ") || "없음"}, 덧붙임 예정 ${files.appended.join(", ") || "없음"}, 동일 ${files.same.length}, 유지(템플릿과 다름) ${kept}`,
      ...files.kept.map((k) => k.diff),
      ...files.filled.map((f) => `${f}: 설치기가 채움, 유지`),
      (() => {
        const scripts = addScripts(target, { dryRun: true, wrapResources: freshBts, adopt });
        return `package.json scripts 추가 예정: ${scripts.added.join(", ") || "없음"}${scripts.wrapped.length ? `, resource 래퍼 ${scripts.wrapped.join(", ")}` : ""}`;
      })(),
      `.gitignore 추가 예정: ${ensureGitignore(target, { dryRun: true, adopt }).join(", ") || "없음"}`,
      `biome.json 추가 예정: ${Array.isArray(biome) ? biome.join(", ") || "없음" : "없음"}`,
      ...(adopt ? adoptBiomeWarning(target, biome) : jsoncWarning(target, biome)),
      `turbo.json 추가 예정: ${[turbo === "added" && '"agentGuidance": false', proxy === "added" && "globalPassThroughEnv(프록시 변수)"].filter(Boolean).join(", ") || "없음"}`,
      ...(Array.isArray(eslint) ? [`ESLint 무시 추가 예정: ${eslint.join(", ") || "없음"}`] : []),
      ...(eslint === "manual" ? [`경고: ${ESLINT_MANUAL}`] : []),
      `.claude/settings.json 추가 예정: ${hook ? "SessionStart 훅(scripts/load-keys.mjs), PostToolUse 훅(부른 스킬 기록), PreToolUse 훅(라운드 없는 편집 막기)" : "없음"}`,
      ...(hook === null ? [`경고: ${HOOK_MANUAL}`] : []),
      ...gitHookLines(gitHook, true),
      ...(turbo === "manual" ? [`경고: ${TURBO_MANUAL}`] : []),
      ...(proxy === "manual" ? [`경고: ${TURBO_PROXY_MANUAL}`] : []),
      ...legacyWarning(target),
      ...(choices.length ? [`.dev-cycle.json 기록 예정: ${choices.join(", ")} (고르지 않은 설치본 정리는 반영할 때 skills-setup이 한다)`] : []),
      ...(project.length ? [`.dev-cycle.json 기록 예정: ${project.join(", ")}`] : []),
      ...oldSetup,
      "미리 보기라 파일을 쓰지 않았다. 없는 파일과 항목은 --diff 없이 다시 실행해 더하고(--skip-skills. 템플릿 파일은 덮어쓰지 않고 설정 파일에는 항목만 더한다), 유지(템플릿과 다름) 파일은 직접 옮긴다",
    ].join("\n"));
    return 0;
  }
  const links = linkSkills(target);
  const dc = files.copied.includes(".dev-cycle.json") ? configureDevCycle(target, { adopt }) : null;
  // 유형·기존 코드 경로는 다시 실행해도 기록한다. adopt 경로 규칙은 새로 복사한 .dev-cycle.json에만 넣는다.
  if (project.length) recordProject(target, { projectType, adopt, legacy, defaultBranch });
  // --skip-skills여도 선택값은 기록한다. 나중에 pnpm skills:setup이 그 값을 설치한다.
  if (choices.length) recordChoices(target, picked);
  const scripts = addScripts(target, { wrapResources: freshBts, adopt });
  const gitignore = ensureGitignore(target, { adopt });
  const biomeConfig = ensureBiomeConfig(target, { extra: adopt ? [] : biomeExtra, adopt });
  const turbo = adopt ? null : ensureTurboAgentGuidance(target);
  const proxy = adopt ? null : ensureTurboProxyEnv(target);
  const eslint = adopt ? ensureEslintIgnores(target) : null;
  const hook = ensureClaudeHook(target);
  const gitHook = ensureGitHook(target);
  const toFormat = [
    ...files.copied.filter((f) => /\.(mjs|js|json)$/.test(f)),
    ...(scripts.added.length || scripts.wrapped.length ? ["package.json"] : []),
    ...(Array.isArray(biomeConfig) && biomeConfig.length && !adopt ? ["biome.json"] : []),
  ];
  const biome = adopt ? "건너뜀 (adopt: 프로젝트의 포맷 도구를 따른다)" : formatWithBiome(target, toFormat);
  const agents = run(process.execPath, [join(target, "scripts/sync-agents.mjs")], { cwd: target });
  // 스킬·플러그인·OMX 설치와 전역 도구 안내는 프로젝트에 복사한 스크립트가 한다. 팀원도 pnpm skills:setup으로 같은 것을 한다.
  const skipSkills = flags.has("--skip-skills") ? "--skip-skills" : null;
  const skills = skipSkills
    ? null
    : run(process.execPath, [join(target, "scripts/skills-setup.mjs"), ...(flags.has("--with-global") ? ["--with-global"] : []), ...pass], {
        cwd: target,
        stdio: "inherit",
      });

  const out = [
    `파일: 복사 ${files.copied.length}, 덧붙임 ${files.appended.join(", ") || "없음"}, 동일 ${files.same.length}, 유지(템플릿과 다름) ${kept}`,
    ...files.filled.map((f) => `${f}: 설치기가 채움, 유지`),
    `스킬 링크: 생성 ${links.created.join(", ") || "없음"}${links.conflicts.length ? `, 충돌 ${links.conflicts.join(", ")} (직접 확인)` : ""}`,
    ...(dc ? [`.dev-cycle.json: 기본 브랜치 ${dc.defaultBranch}, commands ${Object.keys(dc.commands).join(", ") || "없음"}`] : []),
    ...(choices.length ? [`.dev-cycle.json 기록: ${choices.join(", ")}`] : []),
    ...(project.length ? [`.dev-cycle.json 기록: ${project.join(", ")}`] : []),
    ...(adopt && !dc && !adopted
      ? ["경고: .dev-cycle.json이 이미 있어 adopt 경로 규칙을 넣지 않았다 → 정밀 분석 뒤 첫 H Task에서 rules를 맞춘다"]
      : []),
    ...oldSetup,
    `package.json scripts 추가: ${scripts.added.join(", ") || "없음"}${scripts.wrapped.length ? `, resource 래퍼 ${scripts.wrapped.join(", ")}` : ""}`,
    ...(!freshBts && !adopt
      ? [projectType === "operating" ? "운영 중인 프로젝트: dev·build에 resource 래퍼를 씌우지 않았다(배포·CI가 쓰는 명령). 바꾸려면 H 라운드에서 원본 명령과 증거를 확인한 뒤 한다" : "기존 설치본: resource 래퍼 전환은 H 라운드에서 원본 명령과 증거를 확인한 뒤 한다"]
      : []),
    ...(gitignore.length ? [`.gitignore: ${gitignore.join(", ")} 추가`] : []),
    ...(Array.isArray(biomeConfig) && biomeConfig.length ? [`biome.json 추가: ${biomeConfig.join(", ")}`] : []),
    ...(adopt ? adoptBiomeWarning(target, biomeConfig) : jsoncWarning(target, biomeConfig)),
    ...(turbo === "added" ? ['turbo.json: "agentGuidance": false 추가 (turbo가 AGENTS.md에 규칙 블록을 쓰지 않게)'] : []),
    ...(turbo === "manual" ? [`경고: ${TURBO_MANUAL}`] : []),
    ...(proxy === "added" ? [`turbo.json: globalPassThroughEnv에 ${TURBO_PROXY_ENV.join(", ")} 추가 (프록시 뒤에서 빌드가 글꼴을 받게)`] : []),
    ...(proxy === "manual" ? [`경고: ${TURBO_PROXY_MANUAL}`] : []),
    ...(Array.isArray(eslint) && eslint.length ? [`ESLint 무시 추가: ${eslint.join(", ")} (벤더 스킬과 하네스 스크립트는 프로젝트 lint에서 뺀다)`] : []),
    ...(eslint === "manual" ? [`경고: ${ESLINT_MANUAL}`] : []),
    ...(hook ? [".claude/settings.json: SessionStart 훅(scripts/load-keys.mjs: .env의 이미지 키와 배포 토큰을 세션에 불러온다)과 PostToolUse 훅(dev-cycle skill-log: 부른 스킬을 .prokit/skills-used.jsonl에 남겨 audit이 단계 행 증거와 대조한다), PreToolUse 훅(dev-cycle edit-guard: 열린 라운드 없이 코드·하네스 파일을 고치지 못하게 한다) 중 없는 것을 더함"] : []),
    ...(hook === null ? [`경고: ${HOOK_MANUAL}`] : []),
    ...gitHookLines(gitHook, false),
    ...legacyWarning(target),
    `biome 포맷: ${biome}`,
    `에이전트 생성물(Codex·Antigravity): ${`${agents.stdout}${agents.stderr}`.trim().split("\n").join("; ")}`,
    skills === null
      ? `스킬·플러그인: 건너뜀 (${skipSkills}) → 나중에 pnpm skills:setup`
      : `스킬·플러그인: ${skills.status === 0 ? "위 skills-setup 결과 참고" : `실패 (exit ${skills.status}) → 위 출력을 보고 pnpm skills:setup으로 다시 실행`}`,
    "다음 할 일:",
    ...(operating
      ? [
          "  1. 설치 결과를 지금 브랜치에 커밋한다(기존 코드는 바꾸지 않았다). push와 병합은 사용자가 정한다",
          ...(adopt ? [] : ["     pnpm check는 앱 코드의 포맷을 바꾸므로 돌리지 않는다. 기존 코드의 지적은 정밀 분석 뒤 H Task에서 다룬다"]),
          "  2. 새 에이전트 세션을 열어 prokit-analyzer로 정밀 분석부터 한다 (docs/first-request.md)",
          ...(adopt
            ? ["  3. 정밀 분석 뒤 첫 H Task에서 .dev-cycle.json의 rules·authPaths와 docs/dev-workflow.md를 프로젝트 구조에 맞춘다. 그 전에는 규칙 밖 코드를 F로 본다"]
            : []),
        ]
      : [
          "  1. 첫 마이그레이션(README 설치한 뒤 1번)까지 마치고, pnpm check로 Better-T-Stack이 만든 코드의 포맷을 한 번 정리해 pnpm exec biome check .가 exit 0인지 본 뒤 기본 브랜치에 커밋한다 (커밋 전에 연 dev-cycle 라운드는 설치 파일이 diff에 섞여 audit이 F 상향을 요구한다)",
          "  2. 새 에이전트 세션을 열어 스킬과 에이전트를 불러온다 (Claude는 프로젝트를 신뢰해야 project 플러그인을 켜고, Codex는 신뢰해야 .codex/agents를 읽는다. Antigravity는 .agents/agents와 .agents/skills를 읽는다. Grok Build는 폴더를 신뢰해야 AGENTS.md와 프로젝트 스킬을 읽는다: 처음 열 때 신뢰하거나 grok --trust. 라운드 없는 편집 막기와 스킬 기록 훅은 Codex는 /hooks에서 .codex/hooks.json을, Antigravity는 폴더를 신뢰해야 돈다)",
          "  3. 개발자마다 한 번 프로젝트 루트에서 .agents/skills/impeccable/scripts/impeccable hooks on (스킬 호출로 켜지 않는다. Codex는 /hooks에서 신뢰 확인. Antigravity에서는 돌지 않고 Grok Build에서 도는지는 확인하지 않았다)",
          "  4. GLOSSARY.md와 docs/domain/project.md에 서비스 이름과 요약을 채운다",
          "  5. 첫 UI 라운드에서 impeccable init으로 PRODUCT.md를 만든다",
        ]),
    ...(picked.simplicity === "caveman" ? ["  - caveman 응답 압축은 /caveman(Codex $caveman)으로 켜고 \"stop caveman\"으로 끈다. 대화 응답에만 쓴다"] : []),
    ...(picked.optional.includes("i-have-adhd") ? ["  - i-have-adhd는 /i-have-adhd(Codex $i-have-adhd)로 켜고 \"stop adhd mode\"로 끈다. 대화 응답에만 쓴다"] : []),
    ...(picked.optional.includes("taste") ? ["  - taste(design-taste-frontend)는 화면 작업에서 사용자가 고른 화면에만 쓴다(prokit-ui references/taste.md). 검사에는 Chrome·Edge·Chromium이 필요하다"] : []),
  ];
  console.log(out.join("\n"));
  if (skills && skills.status !== 0) return 2;
  return agents.status === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
