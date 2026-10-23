#!/usr/bin/env node
// 판(edition) 생성. pro-kit이 정본이고, 판 저장소(UI 스킬셋의 pro-kit-ui)는 이 생성기가 만드는 읽기 전용 사본이다.
// 판 목록은 editions.json, 판 저장소 주소는 site-links.json이다. Pro 전용 글은 마크다운에서 <!-- edition:pro --> 표시로 감싸 두고, 판을 만들 때 지운다.
//   node scripts/edition.mjs ui <출력 폴더>              작업 트리로 판을 만들고 검사한다. 출력 폴더는 없거나 비어 있어야 한다
//   node scripts/edition.mjs ui --publish [--tag vX.Y.Z]   그 태그(없으면 HEAD) 커밋으로 판을 만들어 판 저장소에 커밋·push한다(--tag면 같은 태그도)
import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const OPEN = "<!-- edition:pro -->";
const CLOSE = "<!-- /edition -->";

export const editions = (root = ROOT) => JSON.parse(readFileSync(join(root, "editions.json"), "utf8"));
export const repoUrl = (name, root = ROOT) => `${JSON.parse(readFileSync(join(root, "site-links.json"), "utf8"))[editions(root)[name].link]}.git`;

// 표시는 셋이다. 줄로 된 구간(OPEN 줄부터 CLOSE 줄까지), 한 줄 안의 구간(OPEN…CLOSE),
// 줄 끝 표시(닫는 표시 없이 줄 끝에 둔 OPEN. 표 행·목록 한 줄처럼 그 줄 전체가 Pro 전용). 이 순서로 지운다.
// 짝이 맞지 않으면 Pro 글이 남거나 판 글이 지워지므로, 지우기 전에 markerErrors로 확인한다.
export function stripPro(text) {
  return text
    .replace(/^[ \t]*<!-- edition:pro -->[ \t]*\n[\s\S]*?^[ \t]*<!-- \/edition -->[ \t]*(?:\n|$)/gm, "")
    .replace(/<!-- edition:pro -->[^\n]*?<!-- \/edition -->/g, "")
    .replace(/^.*<!-- edition:pro -->[ \t]*(?:\n|$)/gm, "");
}

// 짝이 맞지 않는 줄 번호. 줄로 된 구간은 여는 줄과 닫는 줄이 번갈아 나와야 하고,
// 구간 밖의 줄은 여는 표시와 닫는 표시 수가 같아야 한다(줄 끝 표시 하나는 빼고 센다).
export function markerErrors(text) {
  const errors = [];
  let open = 0;
  text.split("\n").forEach((line, i) => {
    const t = line.trim();
    if (t === OPEN) return open ? errors.push(i + 1) : (open = i + 1);
    if (t === CLOSE) return open ? (open = 0) : errors.push(i + 1);
    const count = (s) => line.split(s).length - 1;
    if (!open && count(OPEN) - (t.endsWith(OPEN) ? 1 : 0) !== count(CLOSE)) errors.push(i + 1);
  });
  if (open) errors.push(open);
  if (text.includes("\r") && text.includes(OPEN)) errors.push(0);
  return errors;
}

const under = (f, list) => list.some((p) => f === p || f.startsWith(`${p}/`));

function walk(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.name === ".git") return [];
    return e.isDirectory() ? walk(p, base) : [relative(base, p)];
  });
}

function copy(root, rel, dst, problems) {
  const src = join(root, rel);
  mkdirSync(dirname(dst), { recursive: true });
  if (lstatSync(src).isSymbolicLink()) return symlinkSync(readlinkSync(src), dst);
  if (src.endsWith(".md")) {
    const text = readFileSync(src, "utf8");
    for (const n of markerErrors(text)) problems.push(`${rel}:${n} 표시 짝이 맞지 않는다`);
    writeFileSync(dst, stripPro(text));
  } else copyFileSync(src, dst);
  chmodSync(dst, statSync(src).mode);
}

// root의 추적 파일로 판을 out에 만들고 검사한 문제 목록을 돌려준다(빈 목록이면 통과). out에는 .git만 있어도 된다.
export function build(name, out, { root = ROOT } = {}) {
  const ed = editions(root)[name];
  if (!ed) throw new Error(`editions.json에 없는 판: ${name}`);
  if (existsSync(out) && readdirSync(out).some((e) => e !== ".git")) throw new Error(`출력 폴더가 비어 있지 않다: ${out}`);
  const problems = [];
  const tracked = git(root, "-c", "core.quotePath=false", "ls-files").split("\n").filter(Boolean);
  for (const f of tracked.filter((f) => under(f, ed.include) && !under(f, ed.exclude) && existsSync(join(root, f)))) copy(root, f, join(out, f), problems);
  // 덧씌우기: 판에만 있는 루트 문서(README.md, AGENTS.md 등). 같은 경로면 바꾼다.
  for (const f of tracked.filter((f) => under(f, [ed.overlay]))) {
    const dst = join(out, relative(ed.overlay, f));
    rmSync(dst, { force: true });
    copy(root, f, dst, problems);
  }
  return [...problems, ...check(ed, out)];
}

// 마크다운에 남은 표시, 판에 없는 스킬·파일 이름, 판 안에서 끊긴 상대 링크를 찾는다.
export function check(ed, out) {
  const problems = [];
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // 뒤에 ".영문"이 오면 도메인(prokit-web.vercel.app)이라 이름으로 보지 않는다.
  const missing = new RegExp(`(?<![\\w-])(?:${ed.missing.map(esc).join("|")})(?![\\w-]|\\.\\w)`);
  for (const f of walk(out).filter((f) => f.endsWith(".md"))) {
    const text = readFileSync(join(out, f), "utf8");
    text.split("\n").forEach((line, i) => {
      const at = `${f}:${i + 1}`;
      if (/<!--\s*\/?edition\b/.test(line)) problems.push(`${at} 표시가 남았다`);
      if (missing.test(line)) problems.push(`${at} 판에 없는 이름: ${line.match(missing)[0]}`);
      for (const [, raw] of line.matchAll(/\]\(<?([^)\s>]+)>?\)/g)) {
        if (/^(?:[a-z]+:|#|\/)/i.test(raw)) continue;
        const target = resolve(join(out, dirname(f)), decodeURI(raw.split("#")[0]));
        if (!existsSync(target)) problems.push(`${at} 끊긴 링크: ${raw}`);
      }
    });
  }
  return problems;
}

// 릴리스가 pro-kit을 내보내기 전에 부른다. 작업 트리로 판을 만들어 보고, 판 저장소에 닿는지 본다.
export function preflight(name, { root = ROOT } = {}) {
  const out = mkdtempSync(join(tmpdir(), `prokit-${name}-check-`));
  try {
    const problems = build(name, out, { root });
    try {
      git(root, "ls-remote", "--heads", repoUrl(name, root));
    } catch {
      problems.push(`판 저장소에 닿지 않는다: ${repoUrl(name, root)} (저장소가 있는지, gh 로그인과 권한을 확인한다)`);
    }
    return problems;
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

// ref 커밋(기본: tag, 없으면 HEAD)을 임시 worktree로 꺼내 판을 만든다. 작업 트리의 커밋하지 않은 변경은 섞이지 않는다.
// 판 저장소를 받아 .git만 남기고 새 판으로 바꾼 뒤 커밋·push한다. 바뀐 것이 없어도 커밋해 pro-kit과 버전을 맞춘다.
// ref: null이면 작업 트리로 만든다(테스트용).
export function publish(name, { tag, ref = tag ?? "HEAD", root = ROOT, remote } = {}) {
  const url = remote ?? repoUrl(name, root);
  const dir = mkdtempSync(join(tmpdir(), `prokit-${name}-`));
  const src = ref === null ? root : mkdtempSync(join(tmpdir(), `prokit-${name}-src-`));
  try {
    if (ref !== null) git(root, "worktree", "add", "-q", "--detach", src, ref);
    git(dir, "clone", "-q", url, ".");
    for (const e of readdirSync(dir)) if (e !== ".git") rmSync(join(dir, e), { recursive: true, force: true });
    const problems = build(name, dir, { root: src });
    if (problems.length) throw new Error(`판 검사 실패:\n${problems.join("\n")}`);
    const from = tag ?? git(src, "rev-parse", "--short", "HEAD");
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "--allow-empty", "-m", `${tag ? `${tag}: ` : ""}pro-kit ${from}에서 생성`);
    if (tag) git(dir, "tag", "-a", tag, "-m", `${tag}: pro-kit ${tag}에서 생성`);
    execFileSync("git", ["push", "--atomic", "origin", "HEAD:refs/heads/main", ...(tag ? [tag] : [])], { cwd: dir, stdio: "inherit" });
    return git(dir, "rev-parse", "--short", "HEAD");
  } finally {
    rmSync(dir, { recursive: true, force: true });
    if (ref !== null) {
      rmSync(src, { recursive: true, force: true });
      git(root, "worktree", "prune");
    }
  }
}

export function main(argv) {
  const { values, positionals } = parseArgs({ args: argv, allowPositionals: true, options: { publish: { type: "boolean" }, tag: { type: "string" } } });
  const [name, out] = positionals;
  if (!name || (!values.publish && !out)) {
    console.error("사용법: node scripts/edition.mjs <판> <출력 폴더> | node scripts/edition.mjs <판> --publish [--tag vX.Y.Z]");
    return 2;
  }
  if (values.publish) {
    const head = publish(name, { tag: values.tag });
    console.log(`${repoUrl(name)} ${head}${values.tag ? ` ${values.tag}` : ""} push 완료`);
    return 0;
  }
  const problems = build(name, resolve(out));
  for (const p of problems) console.error(p);
  console.log(problems.length ? `판 검사 실패 ${problems.length}건` : `${name} 판 → ${out}`);
  return problems.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
