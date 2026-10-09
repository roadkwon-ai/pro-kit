#!/usr/bin/env node
// 로컬 릴리스. 두 단계로 나눈 것은 그 사이에 에이전트가 노트의 한국어를 검수하기 때문이다.
// 1. node scripts/release.mjs [--title "<영어 제목>"] [--minor]
//    마지막 v* 태그 이후 커밋으로 다음 버전을 정하고(기본 patch, --minor면 minor) release/<YYYYMMDD-HHmm>-<영어 제목>.md를 쓴다. 커밋하지 않는다.
// 2. node scripts/release.mjs --publish <노트 파일>
//    main에서 노트 커밋, 태그, main과 태그 push, GitHub Release 생성까지 한다.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const run = (cmd, ...args) => execFileSync(cmd, args, { stdio: "inherit" });
const fail = (msg) => (console.error(msg), 1);

// 커밋 종류 → 노트 절 제목. 목록 순서가 노트와 자동 제목의 순서다. 나머지 종류는 Maintenance.
const SECTIONS = [
  ["feat", "Features"],
  ["fix", "Fixes"],
  ["perf", "Performance"],
  ["refactor", "Refactoring"],
  ["docs", "Docs"],
  ["test", "Tests"],
];
const OTHER = "Maintenance";
const sectionOf = (c) => SECTIONS.find(([t]) => t === c.type)?.[1] ?? OTHER;
const ORDER = [...SECTIONS.map(([, s]) => s), OTHER];

export function parseCommits(log) {
  return log
    .split("\x1e")
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      const [sha, parents, subject, body = ""] = r.split("\x1f");
      const m = subject.match(/^(\w+)(?:\([^)]*\))?(!)?:\s*(.+)$/);
      return {
        sha,
        merge: parents.trim().split(/\s+/).length > 1,
        subject,
        body,
        type: m?.[1] ?? null,
        text: m ? m[3] : subject,
        breaking: Boolean(m?.[2]) || /^BREAKING[ -]CHANGE:/m.test(body),
      };
    })
    .filter((c) => !c.subject.startsWith("chore(release):"));
}

// 기본은 patch(feat 포함). minor는 큰 묶음일 때 사용자가 정해 --minor로 준다.
export function nextVersion(prevTag, commits, { minor: bumpMinor = false } = {}) {
  if (!prevTag) return "0.1.0";
  const [major, minor, patch] = prevTag.replace(/^v/, "").split(".").map(Number);
  // 0.x 동안 깨지는 변경은 minor로 올린다. 1.0.0은 따로 정한다.
  if (commits.some((c) => c.breaking))
    return major === 0 ? `0.${minor + 1}.0` : `${major + 1}.0.0`;
  if (bumpMinor) return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+/, "").slice(0, 60).replace(/-+$/, "");

// --title이 없을 때 쓰는 제목. 커밋 종류로 만든다.
export function releaseTitle(commits) {
  const labels = ORDER.filter((s) => commits.some((c) => !c.merge && sectionOf(c) === s));
  if (labels.length === 0) return "Maintenance update";
  return labels.length === 1 ? `${labels[0]} update` : `${labels[0]} and ${labels[1].toLowerCase()} update`;
}

// 년월일-시분(KST). 예: 20260728-1638
export function stamp(date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}${p.month}${p.day}-${p.hour}${p.minute}`;
}

export function renderNote({ version, prevTag, title, date, commits, repo }) {
  const s = stamp(date);
  const lines = [
    `# v${version} — ${title}`,
    "",
    `- 날짜: ${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(9, 11)}:${s.slice(11)} (KST)`,
    `- 이전 버전: ${prevTag ?? "없음 (첫 릴리스)"}`,
    ...(repo && prevTag ? [`- 전체 변경: https://github.com/${repo}/compare/${prevTag}...v${version}`] : []),
  ];
  for (const section of ORDER) {
    const items = commits.filter((c) => !c.merge && sectionOf(c) === section);
    if (items.length === 0) continue;
    lines.push("", `## ${section}`, "");
    for (const c of items) {
      lines.push(`- ${c.breaking ? "**BREAKING** " : ""}${c.text} (\`${c.sha.slice(0, 7)}\`)`);
      // 본문의 bullet만 옮긴다. 들여쓴 다음 줄은 줄바꿈된 같은 bullet이다.
      let inBullet = false;
      for (const b of c.body.split("\n")) {
        if (/^- /.test(b)) lines.push(`  ${b.trimEnd()}`);
        else if (inBullet && /^\s+\S/.test(b)) lines[lines.length - 1] += ` ${b.trim()}`;
        inBullet = /^- /.test(b) || (inBullet && /^\s+\S/.test(b));
      }
    }
  }
  return `${lines.join("\n")}\n`;
}

// GitHub Release 본문: 노트에서 첫 줄(제목)을 뺀 나머지.
export const releaseBody = (note) => note.slice(note.indexOf("\n") + 1);

export function main(argv) {
  const { values } = parseArgs({ args: argv, options: { title: { type: "string" }, publish: { type: "string" }, minor: { type: "boolean" } } });
  let prevTag = null;
  try {
    prevTag = git("describe", "--tags", "--abbrev=0", "--match", "v[0-9]*");
  } catch {}
  const commits = parseCommits(git("log", "--format=%H%x1f%P%x1f%s%x1f%b%x1e", prevTag ? `${prevTag}..HEAD` : "HEAD")).filter((c) => !c.merge);
  if (values.publish) return publish(values.publish, prevTag, commits);
  if (commits.length === 0) {
    console.log(`릴리스할 커밋이 없다 (마지막 태그 ${prevTag ?? "없음"})`);
    return 0;
  }
  const title = values.title?.trim() || releaseTitle(commits);
  if (!slug(title)) return fail(`--title은 영어로 쓴다 (${title})`);
  const version = nextVersion(prevTag, commits, { minor: values.minor });
  const date = new Date();
  let file = join("release", `${stamp(date)}-${slug(title)}.md`);
  if (existsSync(file)) file = file.replace(/\.md$/, `-v${version}.md`);
  let repo = null;
  try {
    repo = git("remote", "get-url", "origin").match(/github\.com[:/](.+?)(?:\.git)?$/)?.[1] ?? null;
  } catch {}
  mkdirSync("release", { recursive: true });
  writeFileSync(file, renderNote({ version, prevTag, title, date, commits, repo }));
  console.log(`v${version} — ${title} → ${file}\n한국어를 검수한 뒤: node scripts/release.mjs --publish ${file}`);
  return 0;
}

function publish(file, prevTag, commits) {
  const branch = git("rev-parse", "--abbrev-ref", "HEAD");
  if (branch !== "main") return fail(`main 브랜치에서 실행한다 (현재 ${branch})`);
  if (git("status", "--porcelain", "--untracked-files=no")) return fail("커밋하지 않은 변경이 있다. 커밋하거나 치운 뒤 실행한다");
  const note = existsSync(file) ? readFileSync(file, "utf8") : "";
  const [, tag, title] = note.match(/^# (v\S+) — (.+)/) ?? [];
  if (!tag) return fail(`노트가 없거나 첫 줄이 "# vX.Y.Z — 제목"이 아니다: ${file}`);
  // 노트를 쓴 뒤 커밋이 늘었거나, 검수하다 커밋 해시를 지웠으면 노트가 실제 릴리스와 어긋난다.
  if (commits.length === 0 || ![false, true].some((minor) => tag === `v${nextVersion(prevTag, commits, { minor })}`) || commits.some((c) => !note.includes(c.sha.slice(0, 7)))) {
    return fail("노트가 마지막 태그 이후 커밋과 맞지 않는다. 노트를 지우고 다시 만든다");
  }
  git("add", file);
  git("commit", "-q", "-m", `chore(release): ${tag}`);
  git("tag", "-a", tag, "-m", `${tag} — ${title}`);
  try {
    run("git", "push", "--atomic", "origin", "main", tag);
  } catch {
    // mixed reset이라 검수한 노트는 추적하지 않는 파일로 남는다. 작업 트리가 깨끗한 것도 확인했다.
    git("tag", "-d", tag);
    git("reset", "-q", "HEAD~1");
    return fail("push에 실패해 릴리스 커밋과 태그를 되돌렸다. 원격을 확인하고(git pull 등) 다시 --publish 한다");
  }
  // 노트 첫 줄(# vX.Y.Z — 제목)은 Release 제목과 같아 본문에서 뺀다. 그대로 두면 제목이 두 번 보인다.
  execFileSync("gh", ["release", "create", tag, "--verify-tag", "--title", `${tag} — ${title}`, "--notes-file", "-"], {
    stdio: ["pipe", "inherit", "inherit"],
    input: releaseBody(note),
  });
  console.log(`${tag} — ${title} 릴리스 완료`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
