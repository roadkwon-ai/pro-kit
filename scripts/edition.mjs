#!/usr/bin/env node
// 판(edition) 생성. pro-kit이 정본이고, 판 저장소(UI 스킬셋의 pro-kit-ui)는 이 생성기가 만드는 읽기 전용 사본이다.
// 판 목록은 editions.json, 판 저장소 주소는 site-links.json이다. Pro 전용 글은 마크다운에서 <!-- edition:pro --> 표시로 감싸 두고, 판을 만들 때 지운다.
// 판에서만 보일 글은 <!-- edition:ui 글 --> 주석(한 줄, 또는 "<!-- edition:ui" 줄과 "-->" 줄 사이의 여러 줄)으로 두고, 판을 만들 때 주석을 벗긴다(pro-kit과 홈페이지에서는 보이지 않는다).
//   node scripts/edition.mjs ui <출력 폴더>              작업 트리로 판을 만들고 검사한다. 출력 폴더는 없거나 비어 있어야 한다
//   node scripts/edition.mjs ui --publish [--tag vX.Y.Z]   그 태그(없으면 HEAD) 커밋으로 판을 만들어 판 저장소에 커밋·push하고 확인한다(--tag면 같은 태그도)
//   node scripts/edition.mjs ui --verify [--tag vX.Y.Z]    판 저장소의 그 태그(없으면 main)가 pro-kit 같은 커밋으로 만든 판과 같은지 확인한다
import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const OPEN = "<!-- edition:pro -->";
const CLOSE = "<!-- /edition -->";

export const editions = (root = ROOT) => JSON.parse(readFileSync(join(root, "editions.json"), "utf8"));
export const repoUrl = (name, root = ROOT) => `${JSON.parse(readFileSync(join(root, "site-links.json"), "utf8"))[editions(root)[name].link]}.git`;

// 표시는 셋이다. 줄로 된 구간(OPEN 줄부터 CLOSE 줄까지), 한 줄 안의 구간(OPEN…CLOSE),
// 줄 끝 표시(닫는 표시 없이 줄 끝에 둔 OPEN. 표 행·목록 한 줄처럼 그 줄 전체가 Pro 전용). 이 순서로 지운 뒤 판 글 주석을 벗긴다.
// 짝이 맞지 않으면 Pro 글이 남거나 판 글이 지워지므로, 지우기 전에 markerErrors로 확인한다.
// 줄 끝 표시 줄에 판 글 주석이 있으면(`| Pro 행 | <!-- edition:ui | 판 행 | --> <!-- edition:pro -->`) 그 줄은 판 글로 바뀐다.
// 표 중간에 주석만 있는 줄을 두면 GitHub이 거기서 표를 끝내므로, 표 행은 이렇게 바꾼다.
const removePro = (text) =>
  text
    .replace(/^[ \t]*<!-- edition:pro -->[ \t]*\n[\s\S]*?^[ \t]*<!-- \/edition -->[ \t]*(?:\n|$)/gm, "")
    .replace(/<!-- edition:pro -->[^\n]*?<!-- \/edition -->/g, "")
    .replace(/^.*(<!-- edition:ui [^\n]*? -->)[ \t]*<!-- edition:pro -->[ \t]*$/gm, "$1")
    .replace(/^.*<!-- edition:pro -->[ \t]*(?:\n|$)/gm, "");
// 판 글 주석은 한 줄(<!-- edition:ui 글 -->)과 여러 줄(<!-- edition:ui 줄, 글 줄들, --> 줄) 두 꼴이다. 안에 -->를 쓰지 않는다.
const unwrapUi = (text) => text.replace(/^<!-- edition:ui[ \t]*\n([\s\S]*?)\n-->[ \t]*$/gm, "$1").replace(/<!-- edition:ui ([^\n]*?) -->/g, "$1");
export const stripPro = (text) => unwrapUi(removePro(text));

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PARTICLE = { 을: "를", 은: "는", 이: "가", 과: "와", 으로: "로", 이에요: "예요", 이면: "면", 이나: "나", 이란: "란", 이라: "라" };

// 저장소 이름 바꾸기(ed.rename = [pro-kit, pro-kit-ui]): 받을 저장소·폴더·파일 주소가 판을 가리키게 하고, 뒤 조사를 맞춘다.
// 주석 안(판 글 주석 포함), "Pro 스킬셋(`pro-kit`)" 안내, 도메인 바로 뒤의 경로(프리셋 사이트 prokit-web.vercel.app/pro-kit/)는 그대로 둔다.
export function rename(text, from, to) {
  // 코드 표시(`pro-kit`이) 뒤 조사도 맞춘다. "이"는 뒤가 띄어쓰기·문장부호일 때만 조사로 본다(이름, 이미, 이다는 그대로). 띄어 쓴 조사는 주소 뒤에 온다("…/pro-kit 을 이 폴더에"). 띄어 쓴 "이"는 "이 폴더"일 수 있어 보지 않는다.
  const re = new RegExp(`(?<![\\w-]|\\.[a-z]{2,}/|Pro 스킬셋\\(\`?)${esc(from)}(?![\\w-])(\`?)(?:(으로|을|은|과|이에요|이면|이나|이란|이라|이(?=[\\s.,;:!?)\\]]|$))|( )(으로|을|은|과)(?=\\s))?`, "g");
  // 바뀐 제목("pro-kit 받기")을 가리키는 앵커(#pro-kit-받기)도 바꾼다. 뒤에 영문이 오면 다른 이름(#pro-kit-web)이라 두지 않는다.
  const anchor = new RegExp(`(?<=#)${esc(from)}(?=-[^a-z0-9])`, "g");
  return text
    .split(/(<!--[\s\S]*?-->)/)
    .map((part, i) => (i % 2 ? part : part.replace(re, (_, tick, p, sp = "", q) => to + tick + sp + (p || q ? PARTICLE[p || q] : "")).replace(anchor, to)))
    .join("");
}

// 짝이 맞지 않는 줄 번호. 줄로 된 구간은 여는 줄과 닫는 줄이 번갈아 나와야 하고,
// 구간 밖의 줄은 여는 표시와 닫는 표시 수가 같아야 한다(줄 끝 표시 하나는 빼고 센다).
export function markerErrors(text) {
  const errors = [];
  let open = 0;
  let ui = 0;
  text.split("\n").forEach((line, i, lines) => {
    const t = line.trim();
    // 표 머리 행이나 구분 행의 표시는 칸 수를 어긋나게 하고, 구분 행의 주석은 Pro 쪽 표를 표가 아니게 만든다
    if (!ui && /^\|\s*:?-+/.test(t)) {
      const cells = (s) => s.trim().replace(/^\||\|$/g, "").split("|").length;
      if (i && cells(lines[i - 1]) !== cells(stripPro(lines[i - 1]))) errors.push(i);
      if (t.includes("<!--")) errors.push(i + 1);
    }
    // 여러 줄 판 글 주석 안: 닫는 --> 줄 전에 -->가 나오면 pro-kit 쪽에서 주석이 일찍 끝나 판 글이 보인다
    if (ui) return t === "-->" ? (ui = 0) : line.includes("-->") && errors.push(i + 1);
    // 혼자 선 표시 줄이 HTML 줄(<details> 등)에 붙으면 marked가 둘을 한 HTML 블록으로 읽어 홈페이지가 짝 태그를 찾지 못한다
    const html = (s = "") => /^<(?!!--)/.test(s.trim());
    if ((t === OPEN || t === CLOSE || /^<!-- edition:ui( .*-->)?$/.test(t)) && (html(lines[i - 1]) || html(lines[i + 1]))) errors.push(i + 1);
    // 제목 줄과 링크 글 안의 표시: 제목 id가 원본 앵커와 달라지고, 홈페이지 .md 사본이 링크를 바꾼 뒤 그 안의 주석 자리를 찾지 못한다
    if (/^#{1,6} .*<!-- \/?edition/.test(t) || /\[[^\]]*<!-- \/?edition[^\]]*\]\(/.test(t)) errors.push(i + 1);
    if (t === "<!-- edition:ui") return (ui = i + 1);
    if (t === OPEN) return open ? errors.push(i + 1) : (open = i + 1);
    if (t === CLOSE) return open ? (open = 0) : errors.push(i + 1);
    // 줄(목록 항목, 인용 안 포함) 맨 앞의 표시 뒤에 글을 이으면 GitHub과 홈페이지가 그 줄을 HTML로 읽는다
    const head = t.replace(/^(?:>\s*)*(?:(?:[-*+]|\d+\.)\s+)?/, "").match(/^<!-- \/?edition[^\n]*?-->(.*)/);
    if (head?.[1].trim()) return errors.push(i + 1);
    const count = (s) => line.split(s).length - 1;
    if (!open && count(OPEN) - (t.endsWith(OPEN) ? 1 : 0) !== count(CLOSE)) errors.push(i + 1);
  });
  if (open) errors.push(open);
  if (ui) errors.push(ui);
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

// 표 첫 칸이나 목록 항목 맨 앞의 링크(굵게 감싼 것 포함)
const HEAD_LINK = /^\s*(?:\|\s*|[-*+]\s+|\d+\.\s+)(?:\*\*)?\[[^\]]*\]\(<?([^)\s>]+)>?\)/;
const local = (raw) => !/^(?:[a-z]+:|#|\/)/i.test(raw);

// 판에 없는 쪽(pro-kit에만 있는 쪽)을 첫 칸이나 맨 앞에서 가리키는 표 행과 목록 한 줄을 뺀다.
// 묶음 목차와 "더 보기" 목록의 Pro 쪽 행에 표시를 하나하나 달지 않으려는 것이다. 코드 블록 안은 그대로 둔다.
export function dropProRows(text, rel, isPro) {
  let fence = false;
  return text
    .split("\n")
    .filter((line) => {
      if (/^\s*```/.test(line)) fence = !fence;
      if (fence) return true;
      const raw = line.match(HEAD_LINK)?.[1];
      return !raw || !local(raw) || !isPro(posix.normalize(posix.join(posix.dirname(rel), decodeURI(raw.split("#")[0]))));
    })
    .join("\n");
}

// 덧씌운 문서(names 없음)는 판을 위해 쓴 글이라 이름을 바꾸지 않는다. proValues는 판에서 틀리는 공통 값 키(Pro 스킬 수 등)다.
function copy(root, rel, out, dstRel, { problems, isPro, names, proValues = [] }) {
  const src = join(root, rel);
  const dst = join(out, dstRel);
  mkdirSync(dirname(dst), { recursive: true });
  if (lstatSync(src).isSymbolicLink()) return symlinkSync(readlinkSync(src), dst);
  if (src.endsWith(".md")) {
    const text = readFileSync(src, "utf8");
    for (const n of markerErrors(text)) problems.push(`${rel}:${n} 표시 짝이 맞지 않는다`);
    const md = removePro(text);
    md.split("\n").forEach((line, i) => {
      for (const [, key] of line.matchAll(/<!-- v:([\w.-]+) -->/g)) if (proValues.includes(key)) problems.push(`${dstRel}:${i + 1} 판에서 틀리는 값: ${key}(Pro 구간과 edition:ui 짝으로 판 값을 쓴다)`);
    });
    // 공통 값 표시(<!-- v:키 -->값<!-- /v -->)는 판에서 값만 남긴다. 줄 맨 앞 주석은 GitHub이 그 줄을 HTML로 보고 마크다운을 풀지 않는다.
    const plain = unwrapUi(names ? rename(md, ...names) : md).replace(/<!-- (?:v:[\w.-]+|\/v) -->/g, "");
    writeFileSync(dst, dropProRows(plain, dstRel, isPro));
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
  const files = tracked.filter((f) => under(f, ed.include) && !under(f, ed.exclude) && existsSync(join(root, f)));
  // 덧씌우기: 판에만 있는 루트 문서(README.md, AGENTS.md 등). 같은 경로면 바꾼다.
  const overlay = new Map(tracked.filter((f) => under(f, [ed.overlay])).map((f) => [relative(ed.overlay, f), f]));
  const inEdition = new Set([...files, ...overlay.keys()]);
  const all = new Set(tracked);
  const isPro = (p) => all.has(p) && !inEdition.has(p);
  for (const f of files.filter((f) => !overlay.has(f))) copy(root, f, out, f, { problems, isPro, names: ed.rename, proValues: ed.proValues });
  for (const [dst, f] of overlay) copy(root, f, out, dst, { problems, isPro, proValues: ed.proValues });
  return [...problems, ...check(ed, out, root)];
}

// 판에 남겨도 되는 Pro 말 목록(ed.allow). 한 줄에 "경로 | 말 | 줄 수 | 이유".
export function readAllow(ed, root = ROOT) {
  if (!ed.allow) return new Map();
  return new Map(
    readFileSync(join(root, ed.allow), "utf8")
      .split("\n")
      .filter((l) => l.trim() && !l.startsWith("#"))
      .map((l) => {
        const [file, term, n, reason] = l.split(" | ").map((s) => s.trim());
        if (!reason || !/^\d+$/.test(n)) throw new Error(`${ed.allow}: 꼴이 틀린 줄: ${l}`);
        return [`${file} | ${term}`, Number(n)];
      }),
  );
}

// 제목 앵커(GitHub 꼴. scripts/handbook.test.mjs의 slug·anchors와 같다). 같은 제목이 반복되면 -1, -2를 붙인다.
const slug = (h) => h.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-");
function anchors(md) {
  const seen = new Map();
  return md
    .replace(/```[\s\S]*?```/g, "")
    .split("\n")
    .flatMap((l) => {
      const m = l.match(/^#{1,6}\s+(.+)$/);
      if (!m) return [];
      const base = slug(m[1].replace(/<!--.*?-->/g, ""));
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      return [n ? `${base}-${n}` : base];
    });
}

// 마크다운에 남은 표시, 판에 없는 스킬·파일 이름, 판 안에서 끊긴 상대 링크와 #앵커(마크다운 링크와 HTML src·href),
// 이름 없이 Pro 절차를 말하는 글(ed.proTerms의 말. 허용 목록 ed.allow에 이유와 줄 수를 적은 것만 둔다)을 찾는다.
export function check(ed, out, root = ROOT) {
  const problems = [];
  // 뒤에 ".영문"이 오면 도메인(prokit-web.vercel.app)이라 이름으로 보지 않는다.
  const missing = new RegExp(`(?<![\\w-])(?:${ed.missing.map(esc).join("|")})(?![\\w-]|\\.\\w)`);
  const terms = (ed.proTerms ?? []).map((t) => [t, new RegExp(`(?<![\\w-])${esc(t)}(?![\\w-])`, "i")]);
  const allow = readAllow(ed, root);
  const seen = new Set();
  const heads = new Map();
  // 판 저장소의 파일 주소(…/blob/main/경로, …/tree/main/경로)는 판에 그 경로가 있어야 한다
  const own = ed.link && new RegExp(`${esc(JSON.parse(readFileSync(join(root, "site-links.json"), "utf8"))[ed.link])}/(?:blob|tree)/main/([^\\s)#"'>]+)`, "g");
  for (const f of walk(out).filter((f) => f.endsWith(".md"))) {
    const lines = readFileSync(join(out, f), "utf8").split("\n");
    lines.forEach((line, i) => {
      const at = `${f}:${i + 1}`;
      if (/<!--\s*\/?edition\b/.test(line)) problems.push(`${at} 표시가 남았다`);
      if (missing.test(line)) problems.push(`${at} 판에 없는 이름: ${line.match(missing)[0]}`);
      for (const [, raw] of [...line.matchAll(/\]\(<?([^)\s>]+)>?\)/g), ...line.matchAll(/\b(?:src|href)="([^"]+)"/g)]) {
        if (!local(raw) && !raw.startsWith("#")) continue;
        const [path, hash] = decodeURI(raw).split("#");
        const target = path ? resolve(join(out, dirname(f)), path) : join(out, f);
        if (!existsSync(target)) problems.push(`${at} 끊긴 링크: ${raw}`);
        else if (hash && target.endsWith(".md") && !(heads.get(target) ?? heads.set(target, anchors(readFileSync(target, "utf8"))).get(target)).includes(hash))
          problems.push(`${at} 판에 없는 앵커: ${raw}`);
      }
      if (own) for (const [, p] of line.matchAll(own)) if (!existsSync(join(out, decodeURI(p.replace(/[.,;:]+$/, ""))))) problems.push(`${at} 판 저장소에 없는 파일 주소: ${p}`);
    });
    for (const [t, re] of terms) {
      const hits = lines.flatMap((l, i) => (re.test(l) ? [i + 1] : []));
      if (!hits.length) continue;
      const key = `${f} | ${t}`;
      seen.add(key);
      if (allow.get(key) !== hits.length)
        problems.push(`${f}:${hits.join(",")} Pro 절차로 보이는 말 "${t}" ${hits.length}줄${allow.has(key) ? `(허용 ${allow.get(key)}줄)` : ""}. Pro 글이면 ${OPEN} 표시로 감싸고, 판에도 맞는 글이면 ${ed.allow}에 줄 수와 이유를 적는다`);
    }
  }
  for (const key of allow.keys()) if (!seen.has(key)) problems.push(`${ed.allow}: 판에 없는 말 "${key}"(허용 목록에서 지운다)`);
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

// ref 커밋을 임시 worktree로 꺼내 fn(꺼낸 폴더)을 부른다. 작업 트리의 커밋하지 않은 변경은 섞이지 않는다. ref: null이면 작업 트리 그대로(테스트용).
function withSource(root, ref, fn) {
  if (ref === null) return fn(root);
  const src = mkdtempSync(join(tmpdir(), "prokit-edition-src-"));
  try {
    git(root, "worktree", "add", "-q", "--detach", src, ref);
    return fn(src);
  } finally {
    rmSync(src, { recursive: true, force: true });
    git(root, "worktree", "prune");
  }
}

// 판 저장소를 확인한다. ref 커밋으로 새로 만든 판의 트리가 판 저장소 태그(태그가 없으면 main)의 트리와 같은지,
// 태그면 main이 그 태그 커밋인지 본다. 문제 목록을 돌려준다(빈 목록이면 통과).
export function verify(name, { tag, ref = tag ?? "HEAD", root = ROOT, remote } = {}) {
  const url = remote ?? repoUrl(name, root);
  const dir = mkdtempSync(join(tmpdir(), `prokit-${name}-verify-`));
  try {
    git(dir, "init", "-q");
    const problems = withSource(root, ref, (src) => build(name, dir, { root: src }));
    if (problems.length) return problems;
    git(dir, "add", "-A", "-f");
    const want = git(dir, "write-tree");
    const target = tag ? `refs/tags/${tag}` : "refs/heads/main";
    try {
      git(dir, "fetch", "-q", "--no-tags", "--depth", "1", url, `+refs/heads/main:refs/e/main`, `+${target}:refs/e/target`);
    } catch {
      return [`판 저장소에서 ${target}를 받지 못했다: ${url}`];
    }
    if (git(dir, "rev-parse", "refs/e/target^{tree}") !== want) problems.push(`판 저장소 ${target}의 내용이 pro-kit ${ref ?? "작업 트리"}로 만든 판과 다르다`);
    if (tag && git(dir, "rev-parse", "refs/e/target^{commit}") !== git(dir, "rev-parse", "refs/e/main")) problems.push(`판 저장소 main이 ${tag} 커밋이 아니다`);
    return problems;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// ref 커밋(기본: tag, 없으면 HEAD)으로 판을 만든다. 판 저장소를 받아 .git만 남기고 새 판으로 바꾼 뒤 커밋·push하고,
// 다시 받아 확인(verify)까지 해야 끝난다. 바뀐 것이 없어도 커밋해 pro-kit과 버전을 맞춘다.
// push가 실패하면 retry의 간격(ms)으로 다시 한다. 같은 태그가 이미 있으면(지난 실행이 push 뒤에 멈춘 경우) 내용이 같을 때만 확인으로 넘어간다.
export function publish(name, { tag, ref = tag ?? "HEAD", root = ROOT, remote, retry = [5000, 15000] } = {}) {
  const url = remote ?? repoUrl(name, root);
  const dir = mkdtempSync(join(tmpdir(), `prokit-${name}-`));
  try {
    return withSource(root, ref, (src) => {
      git(dir, "clone", "-q", url, ".");
      for (const e of readdirSync(dir)) if (e !== ".git") rmSync(join(dir, e), { recursive: true, force: true });
      const problems = build(name, dir, { root: src });
      if (problems.length) throw new Error(`판 검사 실패:\n${problems.join("\n")}`);
      git(dir, "add", "-A", "-f");
      if (tag && git(dir, "tag", "-l", tag)) {
        if (git(dir, "rev-parse", `${tag}^{tree}`) !== git(dir, "write-tree")) throw new Error(`판 저장소에 ${tag}가 이미 있고 내용이 다르다. 새 버전으로 릴리스한다`);
        console.log(`${name} 판 ${tag}는 이미 내보냈다. 확인만 한다`);
      } else {
        const from = tag ?? git(src, "rev-parse", "--short", "HEAD");
        git(dir, "commit", "-q", "--allow-empty", "-m", `${tag ? `${tag}: ` : ""}pro-kit ${from}에서 생성`);
        if (tag) git(dir, "tag", "-a", tag, "-m", `${tag}: pro-kit ${tag}에서 생성`);
        const head = git(dir, "rev-parse", "HEAD");
        for (let i = 0; ; i++) {
          try {
            execFileSync("git", ["push", "--atomic", "origin", "HEAD:refs/heads/main", ...(tag ? [tag] : [])], { cwd: dir, stdio: "inherit" });
            break;
          } catch (e) {
            // 응답만 끊기고 push는 들어간 경우. 조회도 실패하면(네트워크) 들어가지 않은 것으로 보고 다시 한다
            let landed = false;
            try {
              landed = git(dir, "ls-remote", "origin", "refs/heads/main").startsWith(head);
            } catch {}
            if (landed) break;
            if (i >= retry.length) throw e;
            console.error(`${name} 판 push 실패. ${retry[i] / 1000}초 뒤 다시 한다 (${i + 1}/${retry.length})`);
            sleep(retry[i]);
          }
        }
      }
      const left = verify(name, { tag, ref: null, root: src, remote: url });
      if (left.length) throw new Error(`판 확인 실패:\n${left.join("\n")}`);
      return git(dir, "rev-parse", "--short", tag ? `${tag}^{commit}` : "HEAD");
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function main(argv) {
  const { values, positionals } = parseArgs({ args: argv, allowPositionals: true, options: { publish: { type: "boolean" }, verify: { type: "boolean" }, tag: { type: "string" } } });
  const [name, out] = positionals;
  if (!name || (!values.publish && !values.verify && !out)) {
    console.error("사용법: node scripts/edition.mjs <판> <출력 폴더> | node scripts/edition.mjs <판> --publish|--verify [--tag vX.Y.Z]");
    return 2;
  }
  if (values.publish) {
    const head = publish(name, { tag: values.tag });
    console.log(`${repoUrl(name)} ${head}${values.tag ? ` ${values.tag}` : ""} 내보내기와 확인 완료`);
    return 0;
  }
  if (values.verify) {
    const problems = verify(name, { tag: values.tag });
    for (const p of problems) console.error(p);
    console.log(problems.length ? `${name} 판 확인 실패 ${problems.length}건` : `${repoUrl(name)} ${values.tag ?? "main"} 확인 완료: pro-kit ${values.tag ?? "HEAD"}로 만든 판과 같다`);
    return problems.length ? 1 : 0;
  }
  const problems = build(name, resolve(out));
  for (const p of problems) console.error(p);
  console.log(problems.length ? `판 검사 실패 ${problems.length}건` : `${name} 판 → ${out}`);
  return problems.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
