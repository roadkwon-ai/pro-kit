import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { getPack } from "./pack.mjs";

const ROOT = join(import.meta.dirname, "..");
const PACKS = JSON.parse(readFileSync(join(ROOT, "tutorials", "packs.json"), "utf8"));
const LINKS = JSON.parse(readFileSync(join(ROOT, "site-links.json"), "utf8"));

test("packs.json: 팩마다 이름이 고정된 릴리스 pack-<이름>의 <이름>-pack.zip 주소(site-links.json packs, 프리미엄 팩은 premiumPacks)와 sha256, 크기가 있다", () => {
  assert.ok(Object.keys(PACKS).length > 0);
  for (const [name, p] of Object.entries(PACKS)) {
    assert.match(name, /^[a-z][a-z0-9]*$/, name);
    assert.equal(p.release, `pack-${name}`, name);
    const repos = [LINKS.packs, LINKS.premiumPacks].map((r) => `${r}/releases/download/${p.release}/${name}-pack.zip`);
    assert.ok(repos.includes(p.url), `${name}: ${p.url}`);
    assert.match(p.sha256, /^[0-9a-f]{64}$/, name);
    assert.ok(Number.isInteger(p.bytes) && p.bytes > 0, name);
  }
});

test("packs.json 이름 = 프리셋 쪽(tutorials/samples/<이름>.md) ∪ 클론 과정(tutorials/0N-<이름>)", () => {
  const notPreset = new Set(["README", "refine", "real-service"]);
  const samples = readdirSync(join(ROOT, "tutorials", "samples"))
    .filter((f) => f.endsWith(".md") && !/^\d/.test(f))
    .map((f) => f.slice(0, -3))
    .filter((n) => !notPreset.has(n));
  const courses = readdirSync(join(ROOT, "tutorials"))
    .map((d) => d.match(/^\d+-([a-z][a-z0-9-]*)$/)?.[1])
    .filter(Boolean);
  assert.deepEqual(Object.keys(PACKS).sort(), [...samples, ...courses].sort());
});

test("추적 문서의 packs/<이름>, pack-<이름>, pack.mjs <이름>이 모두 packs.json에 있다", () => {
  const docs = execFileSync("git", ["ls-files", "*.md"], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter((f) => f && !f.startsWith("release/") && !f.startsWith("docs/superpowers/") && existsSync(join(ROOT, f)));
  const rx = [/(?<![\w-])packs\/([a-z][a-z0-9-]*)/g, /(?<![\w-])pack-([a-z][a-z0-9]*)(?![\w.@-])/g, /pack\.mjs\s+([a-z][a-z0-9-]*)/g];
  const missing = docs.flatMap((f) => {
    const s = readFileSync(join(ROOT, f), "utf8");
    return rx.flatMap((r) => [...s.matchAll(r)].filter((m) => !(m[1] in PACKS)).map((m) => `${f}: ${m[0]}`));
  });
  assert.deepEqual(missing, []);
});

test("getPack: 받고 해시를 확인해 packs/<이름>/에 풀고, 같은 판은 다시 받지 않고, 해시가 다르면 바꾸지 않는다", async (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "pack-test-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  mkdirSync(join(tmp, "src", "images"), { recursive: true });
  writeFileSync(join(tmp, "src", "README.md"), "# 팩\n");
  writeFileSync(join(tmp, "src", "images", "a.webp"), "x");
  execFileSync("zip", ["-q", "-r", join(tmp, "demo.zip"), "."], { cwd: join(tmp, "src") });
  const zip = readFileSync(join(tmp, "demo.zip"));
  let hits = 0;
  const server = createServer((_, res) => (hits++, res.end(zip)));
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}/demo-pack.zip`;
  const sha256 = createHash("sha256").update(zip).digest("hex");
  const index = join(tmp, "packs.json");
  const dir = join(tmp, "packs");
  const write = (sha) => writeFileSync(index, JSON.stringify({ demo: { release: "pack-demo", url, sha256: sha, bytes: zip.length } }));

  write(sha256);
  assert.deepEqual(await getPack("demo", { index, dir }), { dest: join(dir, "demo"), fresh: true });
  assert.equal(readFileSync(join(dir, "demo", "README.md"), "utf8"), "# 팩\n");
  assert.ok(existsSync(join(dir, "demo", "images", "a.webp")));
  assert.equal((await getPack("demo", { index, dir })).fresh, false);
  assert.equal(hits, 1);

  write("0".repeat(64));
  await assert.rejects(getPack("demo", { index, dir }), /sha256이 다름/);
  assert.ok(existsSync(join(dir, "demo", "README.md")), "해시가 다르면 받아 둔 팩을 지우지 않는다");
  assert.deepEqual(readdirSync(dir), ["demo"], "임시 폴더를 남기지 않는다");
  await assert.rejects(getPack("nope", { index, dir }), /없는 팩: nope/);
});

test("getPack zip: 사용자가 받아 둔 zip도 해시를 확인해 풀고, 없거나 옛 판이면 바꾸지 않는다", async (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "pack-zip-test-"));
  t.after(() => rmSync(tmp, { recursive: true, force: true }));
  mkdirSync(join(tmp, "src"));
  writeFileSync(join(tmp, "src", "README.md"), "# 팩\n");
  execFileSync("zip", ["-q", "-r", join(tmp, "demo-pack.zip"), "."], { cwd: join(tmp, "src") });
  const file = join(tmp, "demo-pack.zip");
  const sha256 = createHash("sha256").update(readFileSync(file)).digest("hex");
  const index = join(tmp, "packs.json");
  const dir = join(tmp, "packs");
  // 주소는 닿지 않는 곳이라 zip을 쓰지 않으면 실패한다
  const write = (sha) => writeFileSync(index, JSON.stringify({ demo: { release: "pack-demo", url: "http://127.0.0.1:9/demo-pack.zip", sha256: sha, bytes: 1 } }));

  write("0".repeat(64));
  await assert.rejects(getPack("demo", { index, dir, zip: file }), /sha256이 다름: .*demo-pack\.zip/);
  assert.ok(!existsSync(join(dir, "demo")), "옛 판 zip은 풀지 않는다");
  await assert.rejects(getPack("demo", { index, dir, zip: join(tmp, "none.zip") }), /zip이 없어요/);

  write(sha256);
  assert.deepEqual(await getPack("demo", { index, dir, zip: file }), { dest: join(dir, "demo"), fresh: true });
  assert.equal(readFileSync(join(dir, "demo", "README.md"), "utf8"), "# 팩\n");
});
