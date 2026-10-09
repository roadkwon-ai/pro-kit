import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./site-links.mjs", import.meta.url));

test("set: 추적 파일의 주소(https, 스킴 없음, owner/name)를 바꾸고 site-links.json을 고친다. 이름이 이어지는 주소와 release/는 그대로", () => {
  const dir = mkdtempSync(join(tmpdir(), "site-links-"));
  const g = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" });
  g("init", "-q");
  const links = { home: "https://prokit-web.vercel.app", repo: "https://github.com/a/pro-kit", packs: "https://github.com/a/pro-kit-packs" };
  writeFileSync(join(dir, "site-links.json"), `${JSON.stringify(links, null, 2)}\n`);
  writeFileSync(
    join(dir, "doc.md"),
    "[사이트](https://prokit-web.vercel.app/docs/) https://github.com/a/pro-kit/releases github.com/a/pro-kit api/repos/a/pro-kit https://github.com/a/pro-kit-packs --repo a/pro-kit-packs\n",
  );
  execFileSync("mkdir", [join(dir, "release")]);
  writeFileSync(join(dir, "release", "old.md"), "https://github.com/a/pro-kit\n");
  g("add", ".");

  const run = (...args) => execFileSync(process.execPath, [SCRIPT, ...args], { cwd: dir, encoding: "utf8" });
  run("set", "repo", "https://github.com/b/pro-kit");
  run("set", "home", "https://prokit.dev");

  assert.equal(
    readFileSync(join(dir, "doc.md"), "utf8"),
    "[사이트](https://prokit.dev/docs/) https://github.com/b/pro-kit/releases github.com/b/pro-kit api/repos/b/pro-kit https://github.com/a/pro-kit-packs --repo a/pro-kit-packs\n",
  );
  assert.equal(readFileSync(join(dir, "release", "old.md"), "utf8"), "https://github.com/a/pro-kit\n");
  assert.deepEqual(JSON.parse(readFileSync(join(dir, "site-links.json"), "utf8")), { ...links, home: "https://prokit.dev", repo: "https://github.com/b/pro-kit" });
});

test("set pages·packs: 프리셋 경로와 owner/name 꼴까지 바꾸고, 이름이 이어지는 주소(-web)와 앞에 붙은 주소(dev-)는 그대로", () => {
  const dir = mkdtempSync(join(tmpdir(), "site-links-"));
  const g = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" });
  g("init", "-q");
  const links = { home: "https://prokit-web.vercel.app", pages: "https://a.github.io/pro-kit", repo: "https://github.com/a/pro-kit", packs: "https://github.com/a/pro-kit-packs" };
  writeFileSync(join(dir, "site-links.json"), `${JSON.stringify(links, null, 2)}\n`);
  const keep = "https://a.github.io/pro-kit-web/ github.com/a/pro-kit-web https://dev-prokit-web.vercel.app dev.prokit-web.vercel.app https://prokit-web.vercel.app-dev";
  writeFileSync(
    join(dir, "doc.md"),
    `https://a.github.io/pro-kit/goru/ a.github.io/pro-kit https://github.com/a/pro-kit-packs/releases/download/pack-goru/goru-pack.zip --repo a/pro-kit-packs https://prokit-web.vercel.app/work/ ${keep}\n`,
  );
  g("add", ".");

  const run = (...args) => execFileSync(process.execPath, [SCRIPT, ...args], { cwd: dir, encoding: "utf8" });
  run("set", "pages", "https://b.github.io/pro-kit");
  run("set", "packs", "https://github.com/b/pro-kit-packs");
  run("set", "home", "https://prokit.dev");

  assert.equal(
    readFileSync(join(dir, "doc.md"), "utf8"),
    `https://b.github.io/pro-kit/goru/ b.github.io/pro-kit https://github.com/b/pro-kit-packs/releases/download/pack-goru/goru-pack.zip --repo b/pro-kit-packs https://prokit.dev/work/ ${keep}\n`,
  );
  assert.deepEqual(JSON.parse(readFileSync(join(dir, "site-links.json"), "utf8")), {
    ...links,
    home: "https://prokit.dev",
    pages: "https://b.github.io/pro-kit",
    packs: "https://github.com/b/pro-kit-packs",
  });
});

// 공개 주소가 site-links.json에서 벗어나지 않게 막는다. 옛 계정 이름은 이 파일이 검사에 걸리지 않게 나눠 쓴다.
const ROOT = join(import.meta.dirname, "..");
const OLD = ["roadkwon", "ai"].join("");
// 옛 주소를 남겨 둬도 되는 파일과 줄(이유)
const ALLOW_FILES = [
  [/^release\//, "옛 릴리스 노트"],
  [/^docs\/superpowers\//, "옛 설계·계획 기록"],
  [/^docs\/reports\//, "옛 측정 보고서"],
  [/^templates\/[^/]+\/VERIFICATION\.md$/, "옛 검증 기록"],
  [/^site-links\.json$/, "주소의 정본(pages는 뿌리 주소)"],
  [/^scripts\/site-links\.test\.mjs$/, "이 검사와 다른 소유자 예시"],
];
const ALLOW_LINES = [
  ["AGENTS.md", `옛 주소(\`github.com/${OLD}/pro-kit\`)`, "옛 origin을 알아보는 받기 안내"],
  ["AGENTS.md", `옛 계정 저장소 \`${OLD}/pro-kit\``, "옛 팩 릴리스 위치 안내"],
  ["README.md", `옛 주소 \`github.com/${OLD}/pro-kit\``, "옛 사본을 알아보고 새로 받게 하는 안내(링크 아님)"],
  ["docs/common-values.md", "| `link.pages` |", "목록 표가 pages 뿌리 값을 보여 준다"],
];

test("추적 파일의 공개 주소: 옛 계정 없음, GitHub 저장소는 site-links.json 소유자, Pages 주소 뒤에는 프리셋 이름만(홈페이지 경로는 home)", () => {
  const links = JSON.parse(readFileSync(join(ROOT, "site-links.json"), "utf8"));
  const owners = new Set([links.repo, links.packs, links.premiumPacks].map((u) => u.match(/github\.com\/([^/]+)\//)[1]));
  const pagesHost = new URL(links.pages).host;
  const presets = Object.keys(JSON.parse(readFileSync(join(ROOT, "tutorials", "packs.json"), "utf8")));
  const presetPath = new RegExp(`^/(${presets.join("|")})(?![\\w-])|^/[<⟦{$]`);
  const bad = [];
  for (const f of execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split("\n")) {
    if (!f || ALLOW_FILES.some(([rx]) => rx.test(f))) continue;
    let s;
    try {
      s = readFileSync(join(ROOT, f), "utf8");
    } catch {
      continue;
    }
    if (s.includes("\0")) continue;
    s.split("\n").forEach((line, i) => {
      if (ALLOW_LINES.some(([file, part]) => file === f && line.includes(part))) return;
      const at = `${f}:${i + 1}`;
      if (line.includes(OLD)) bad.push(`${at} 옛 계정`);
      for (const m of line.matchAll(/github\.com\/([\w.-]+)\/pro-kit(?:-packs|-premium-packs)?(?![\w-])/g))
        if (!owners.has(m[1])) bad.push(`${at} 다른 소유자 ${m[0]}`);
      for (const m of line.matchAll(/([\w-]+\.github\.io)\/pro-kit(?![\w-])(\/[^\s)"'`>\]]*)?/g)) {
        if (m[1] !== pagesHost) bad.push(`${at} 다른 Pages ${m[0]}`);
        else if (!presetPath.test(m[2] ?? "")) bad.push(`${at} 프리셋이 아닌 Pages 경로(home으로) ${m[0]}`);
      }
    });
  }
  assert.deepEqual(bad, []);
});
