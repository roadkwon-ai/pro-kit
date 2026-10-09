import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { parseAgent, sync, toAntigravity, toToml } from "../files/scripts/sync-agents.mjs";
import { TEMPLATE_FILES } from "./helpers.mjs";

function project() {
  const root = mkdtempSync(join(tmpdir(), "sa-"));
  mkdirSync(join(root, ".claude"), { recursive: true });
  cpSync(join(TEMPLATE_FILES, ".claude/agents"), join(root, ".claude/agents"), { recursive: true });
  return root;
}
const tomlOk = (file) =>
  spawnSync("python3", ["-c", "import sys,tomllib; tomllib.load(open(sys.argv[1],'rb'))", file]).status === 0;

test("템플릿 에이전트 두 개를 유효한 TOML(Codex)과 md(Antigravity)로 생성한다", () => {
  const root = project();
  const diffs = sync(root);
  assert.equal(diffs.length, 4);
  for (const name of ["prokit-implementer", "prokit-reviewer"]) {
    const f = join(root, ".codex/agents", `${name}.toml`);
    assert.ok(tomlOk(f), `${name} TOML 파싱`);
  }
  assert.match(readFileSync(join(root, ".codex/agents/prokit-reviewer.toml"), "utf8"), /sandbox_mode = "read-only"/);
  assert.match(readFileSync(join(root, ".codex/agents/prokit-implementer.toml"), "utf8"), /sandbox_mode = "workspace-write"/);
  // Antigravity(.agents/agents): 쓰기 도구가 없는 에이전트는 문서에 나온 읽기·검색·명령 도구만, 나머지는 도구를 제한하지 않는다
  const reviewer = readFileSync(join(root, ".agents/agents/prokit-reviewer.md"), "utf8");
  assert.equal(parseAgent(reviewer).meta.name, "prokit-reviewer");
  assert.match(reviewer, /^mainAgent: false$/m);
  assert.match(reviewer, /^tools:\n {2}- view_file\n {2}- grep_search\n {2}- run_command$/m);
  const implementer = readFileSync(join(root, ".agents/agents/prokit-implementer.md"), "utf8");
  assert.doesNotMatch(implementer, /^tools:/m);
  const src = parseAgent(readFileSync(join(root, ".claude/agents/prokit-implementer.md"), "utf8"));
  assert.ok(implementer.includes(src.body));
  assert.deepEqual(sync(root, { check: true }), []);
});

test("--check: 정본 수정·누락·고아를 잡고 파일은 바꾸지 않는다", () => {
  const root = project();
  sync(root);
  const md = join(root, ".claude/agents/prokit-reviewer.md");
  writeFileSync(md, readFileSync(md, "utf8").replace("독립 리뷰어", "독립 검토자"));
  const before = readFileSync(join(root, ".codex/agents/prokit-reviewer.toml"), "utf8");
  assert.deepEqual(sync(root, { check: true }), [
    "불일치: .codex/agents/prokit-reviewer.toml",
    "불일치: .agents/agents/prokit-reviewer.md",
  ]);
  assert.equal(readFileSync(join(root, ".codex/agents/prokit-reviewer.toml"), "utf8"), before);

  const orphan = join(root, ".codex/agents/old.toml");
  writeFileSync(orphan, `${before.split("\n")[0]}\nname = "old"\n`);
  writeFileSync(join(root, ".codex/agents/mine.toml"), 'name = "mine"\n');
  assert.ok(sync(root, { check: true }).includes("고아 생성물: .codex/agents/old.toml"));
  const agOrphan = join(root, ".agents/agents/old.md");
  writeFileSync(agOrphan, readFileSync(join(root, ".agents/agents/prokit-reviewer.md"), "utf8"));
  writeFileSync(join(root, ".agents/agents/mine.md"), "---\nname: mine\ndescription: d\n---\n");
  assert.ok(sync(root, { check: true }).includes("고아 생성물: .agents/agents/old.md"));
  assert.equal(existsSync(agOrphan), true);
  sync(root);
  assert.equal(existsSync(orphan), false);
  assert.equal(existsSync(agOrphan), false);
  assert.equal(existsSync(join(root, ".codex/agents/mine.toml")), true);
  assert.equal(existsSync(join(root, ".agents/agents/mine.md")), true);
});

test("tools가 없으면 workspace-write, 본문에 ''' 는 거부, frontmatter 필수", () => {
  const a = parseAgent('---\nname: x\ndescription: "설명"\n---\n본문\n');
  assert.match(toToml(a), /workspace-write/);
  assert.doesNotMatch(toAntigravity(a), /^tools:/m);
  assert.equal(parseAgent(toAntigravity(a)).meta.description, "설명");
  // description은 YAML에서도 원문 그대로 읽히게 JSON 문자열로 쓴다(따옴표·콜론·#·백슬래시)
  const desc = 'a: "b" # c \\ d';
  const line = toAntigravity({ meta: { name: "x", description: desc }, body: "b" })
    .split("\n")
    .find((l) => l.startsWith("description: "));
  assert.equal(JSON.parse(line.slice("description: ".length)), desc);
  assert.throws(() => toToml(parseAgent("---\nname: x\ndescription: d\n---\na '''\n")), /'''/);
  assert.throws(() => parseAgent("본문만"), /frontmatter/);
  assert.throws(() => parseAgent("---\nname: x\n---\n본문"), /description/);
});

test("CLI --check 종료 코드", () => {
  const root = project();
  const cli = join(TEMPLATE_FILES, "scripts/sync-agents.mjs");
  assert.equal(spawnSync(process.execPath, [cli, "--check"], { cwd: root }).status, 1);
  assert.equal(spawnSync(process.execPath, [cli], { cwd: root }).status, 0);
  assert.equal(spawnSync(process.execPath, [cli, "--check"], { cwd: root }).status, 0);
});

test("에이전트 name은 파일 이름으로 안전해야 하고 중복되면 안 된다", () => {
  const root = project();
  const md = (name) => `---\nname: ${name}\ndescription: x\ntools: Read\n---\n본문\n`;
  writeFileSync(join(root, ".claude/agents/evil.md"), md("../../escaped"));
  assert.throws(() => sync(root), /name/);
  assert.equal(existsSync(join(root, "escaped.toml")), false);
  writeFileSync(join(root, ".claude/agents/evil.md"), md("prokit-reviewer"));
  assert.throws(() => sync(root), /중복/);
});
