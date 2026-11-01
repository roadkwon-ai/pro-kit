import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { assignProblems, parseAgent, sync, toAntigravity, toToml } from "../files/scripts/sync-agents.mjs";
import { TEMPLATE_FILES } from "./helpers.mjs";

function project() {
  const root = mkdtempSync(join(tmpdir(), "sa-"));
  mkdirSync(join(root, ".claude"), { recursive: true });
  cpSync(join(TEMPLATE_FILES, ".claude/agents"), join(root, ".claude/agents"), { recursive: true });
  return root;
}
const tomlOk = (file) =>
  spawnSync("python3", ["-c", "import sys,tomllib; tomllib.load(open(sys.argv[1],'rb'))", file]).status === 0;

const AGENTS = ["prokit-analyzer", "prokit-implementer", "prokit-ui-builder", "prokit-api-builder", "prokit-db-builder", "prokit-runtime-checker", "prokit-reviewer", "specialist-reviewer"];

test("템플릿 에이전트 여덟 개를 유효한 TOML(Codex)과 md(Antigravity)로 생성한다", () => {
  const root = project();
  const diffs = sync(root);
  assert.equal(diffs.length, AGENTS.length * 2);
  for (const name of AGENTS) {
    const f = join(root, ".codex/agents", `${name}.toml`);
    assert.ok(tomlOk(f), `${name} TOML 파싱`);
  }
  assert.match(readFileSync(join(root, ".codex/agents/prokit-reviewer.toml"), "utf8"), /sandbox_mode = "read-only"/);
  assert.match(readFileSync(join(root, ".codex/agents/prokit-analyzer.toml"), "utf8"), /sandbox_mode = "read-only"/, "정밀 분석은 읽기 전용");
  assert.match(readFileSync(join(root, ".codex/agents/specialist-reviewer.toml"), "utf8"), /sandbox_mode = "read-only"/);
  for (const name of ["prokit-implementer", "prokit-ui-builder", "prokit-api-builder", "prokit-db-builder", "prokit-runtime-checker"])
    assert.match(readFileSync(join(root, `.codex/agents/${name}.toml`), "utf8"), /sandbox_mode = "workspace-write"/, `${name}은 파일을 쓴다(실행 확인은 tasks/evidence/에 기록)`);
  // Antigravity(.agents/agents): 쓰기 도구가 없는 에이전트는 문서에 나온 읽기·검색·명령 도구만, 쓰기 에이전트는 실측한 파일 읽기·쓰기·고치기 도구까지 적는다(빼면 도구가 없다)
  const reviewer = readFileSync(join(root, ".agents/agents/prokit-reviewer.md"), "utf8");
  assert.equal(parseAgent(reviewer).meta.name, "prokit-reviewer");
  assert.match(reviewer, /^mainAgent: false$/m);
  assert.match(reviewer, /^tools:\n {2}- view_file\n {2}- grep_search\n {2}- run_command$/m);
  const specialist = readFileSync(join(root, ".agents/agents/specialist-reviewer.md"), "utf8");
  assert.match(specialist, /^tools:\n {2}- view_file\n {2}- grep_search\n {2}- run_command$/m);
  const implementer = readFileSync(join(root, ".agents/agents/prokit-implementer.md"), "utf8");
  assert.match(implementer, /^tools:\n {2}- view_file\n {2}- grep_search\n {2}- run_command\n {2}- read_file\n {2}- write_file\n {2}- edit_file$/m);
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

test("tools가 없으면 workspace-write(Antigravity는 쓰기 도구 목록), 본문에 ''' 는 거부, frontmatter 필수", () => {
  const a = parseAgent('---\nname: x\ndescription: "설명"\n---\n본문\n');
  assert.match(toToml(a), /workspace-write/);
  // Antigravity는 tools를 빼면 도구가 없어 쓰기 에이전트도 실측한 도구를 적는다
  assert.match(toAntigravity(a), /^tools:\n {2}- view_file\n {2}- grep_search\n {2}- run_command\n {2}- read_file\n {2}- write_file\n {2}- edit_file\n---$/m);
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

test("공식 스킬 배치: 템플릿 performers의 에이전트는 모두 있고, 맡은 스킬을 정의에 적으며, 매니페스트에 있는 스킬만 가리킨다", () => {
  assert.deepEqual(assignProblems(TEMPLATE_FILES), []);
  const m = JSON.parse(readFileSync(join(TEMPLATE_FILES, "skills.manifest.json"), "utf8"));
  for (const [skill, agents] of Object.entries(m.performers.skills))
    for (const a of agents)
      assert.ok(readFileSync(join(TEMPLATE_FILES, ".claude/agents", `${a}.md`), "utf8").includes(`\`${skill}\``), `${a} 정의에 ${skill}이 없다`);
  // 수행 에이전트는 공통 규칙(prokit-implementer)과 공식 스킬 읽는 법을 정의에 둔다
  for (const a of m.performers.agents) {
    const body = readFileSync(join(TEMPLATE_FILES, ".claude/agents", `${a}.md`), "utf8");
    assert.match(body, /## 맡는 공식 스킬/, a);
    assert.match(body, /Read로 `\.agents\/skills\/<이름>\/SKILL\.md`/, a);
  }
});

test("공식 스킬 배치: 없는 에이전트·매니페스트에 없는 스킬을 알리고, CLI는 exit 1이다", () => {
  const root = project();
  sync(root);
  writeFileSync(join(root, "skills.manifest.json"), JSON.stringify({ skills: [{ skills: ["shadcn"] }], optional: { motion: { skills: [{ skills: ["vercel-react-view-transitions"] }] } }, performers: { agents: ["prokit-ui-builder", "prokit-ghost"], skills: { shadcn: ["prokit-ui-builder"], "vercel-react-view-transitions": ["prokit-ui-builder"], gone: ["prokit-reviewer", "nobody"] } } }));
  assert.deepEqual(assignProblems(root), [
    "performers.agents의 prokit-ghost: .claude/agents/prokit-ghost.md가 없다",
    "performers.skills의 gone: skills.manifest.json에 없는 스킬이다",
    "performers.skills의 gone: .claude/agents/nobody.md가 없다",
    // 에이전트 정의의 공식 스킬 표와 양쪽으로 대조한다
    "prokit-ui-builder.md의 공식 스킬 표에 없다: vercel-react-view-transitions(performers.skills가 prokit-ui-builder에 맡긴다)",
    "prokit-reviewer.md의 공식 스킬 표에 있지만 performers.skills가 prokit-reviewer에 맡기지 않는다: shadcn",
    "prokit-reviewer.md의 공식 스킬 표에 없다: gone(performers.skills가 prokit-reviewer에 맡긴다)",
  ]);
  // prokit-* 연결 표의 맡는 에이전트 칸도 대조한다(배치에 없는 스킬을 에이전트에 맡기거나, 배치와 다른 에이전트를 적으면)
  const table = (rows) => `# x\n\n| 상황 | 공식 스킬 | 맡는 에이전트 | Main 검수 |\n|---|---|---|---|\n${rows.join("\n")}\n\n## 다음\n`;
  mkdirSync(join(root, ".agents/skills/prokit-x"), { recursive: true });
  writeFileSync(join(root, ".agents/skills/prokit-x/SKILL.md"), table(["| a | `shadcn` | `prokit-reviewer`(code) | b |", "| a | `shadcn` | Main | b |", "| a | `vercel-react-view-transitions` (먼저 `shadcn`) | `prokit-ui-builder` | b |"]));
  writeFileSync(join(root, "skills.manifest.json"), JSON.stringify({ skills: [{ skills: ["shadcn", "next-dev-loop"] }], optional: { motion: { skills: [{ skills: ["vercel-react-view-transitions"] }] } }, performers: { agents: ["prokit-ui-builder"], skills: { shadcn: ["prokit-ui-builder", "prokit-reviewer"], "vercel-react-view-transitions": ["prokit-ui-builder"] } } }));
  assert.deepEqual(assignProblems(root).filter((p) => p.startsWith("prokit-x")), [
    "prokit-x의 공식 스킬 연결 표: shadcn 행에 맡는 에이전트가 없다",
  ]);
  writeFileSync(join(root, ".agents/skills/prokit-x/SKILL.md"), table(["| a | `next-dev-loop` | `prokit-ui-builder` | b |", "| a | `vercel-react-view-transitions` | `prokit-reviewer`(ui) | b |"]));
  assert.deepEqual(assignProblems(root).filter((p) => p.startsWith("prokit-x")), [
    "prokit-x의 공식 스킬 연결 표: next-dev-loop 행이 prokit-ui-builder에 맡기지만 performers.skills에 없는 스킬이라 Main이 읽는다",
    "prokit-x의 공식 스킬 연결 표: vercel-react-view-transitions 행이 prokit-reviewer에 맡기지만 performers.skills는 prokit-ui-builder에 맡긴다",
  ]);
  const r = spawnSync(process.execPath, [join(TEMPLATE_FILES, "scripts/sync-agents.mjs"), "--check"], { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /공식 스킬 배치\(skills\.manifest\.json의 performers\)/);
});
