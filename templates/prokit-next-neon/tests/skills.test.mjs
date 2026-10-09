import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { TEMPLATE_FILES } from "./helpers.mjs";

const SKILLS_DIR = join(TEMPLATE_FILES, ".agents/skills");
const EXPECTED = ["prokit-dev-cycle", "prokit-web", "prokit-api", "prokit-db", "prokit-ui", "prokit-verify", "prokit-deploy", "prokit-skills-update"];

function resolveSkillCreator() {
  if (process.env.SKILL_CREATOR_DIR) {
    return process.env.SKILL_CREATOR_DIR;
  }

  const cacheDir = join(homedir(), ".claude/plugins/cache/claude-plugins-official/skill-creator");

  try {
    const subs = readdirSync(cacheDir).sort();
    for (const sub of subs.reverse()) {
      const candidate = join(cacheDir, sub, "skills/skill-creator");
      if (existsSync(join(candidate, "scripts/quick_validate.py"))) {
        return candidate;
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return null;
}

const SKILL_CREATOR = resolveSkillCreator();

function load(name) {
  const md = readFileSync(join(SKILLS_DIR, name, "SKILL.md"), "utf8");
  const m = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  assert.ok(m, `${name}: frontmatter`);
  return { front: m[1], body: m[2] };
}

for (const name of EXPECTED) {
  test(`${name}: skill-creator quick_validate 통과`, () => {
    assert.ok(SKILL_CREATOR, "skill-creator를 찾지 못했다 — SKILL_CREATOR_DIR로 경로를 지정한다");
    const r = spawnSync("python3", [join(SKILL_CREATOR, "scripts/quick_validate.py"), join(SKILLS_DIR, name)], { encoding: "utf8" });
    assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  });

  test(`${name}: 이름·범위·길이·링크 규칙`, () => {
    const { front, body } = load(name);
    assert.match(front, new RegExp(`^name: ${name}$`, "m"));
    assert.match(front, /BTS/, "description에 프로젝트 조건(BTS)");
    assert.ok(body.trim().split("\n").length <= 150, "본문 150줄 이하");
    assert.doesNotMatch(body, /\bTODO\b|\bTBD\b/);
    // Claude Code는 본문의 느낌표+백틱을 로드할 때 셸 명령으로 실행하고, 실패하면 스킬을 불러오지 못한다(실측).
    assert.doesNotMatch(body, /!`/, "본문에 느낌표+백틱");
    for (const [, link] of body.matchAll(/\]\(((?:references|scripts)\/[^)#]+)\)/g)) {
      assert.ok(existsSync(join(SKILLS_DIR, name, link)), `${name}: 링크 ${link}`);
    }
    const refs = join(SKILLS_DIR, name, "references");
    for (const f of existsSync(refs) ? readdirSync(refs) : []) {
      assert.ok(body.includes(`](references/${f})`), `${name}: references/${f}를 SKILL.md에서 링크하지 않았다`);
    }
  });
}

test("공식 스킬 연결 표의 스킬은 skills.manifest.json이 설치한다", () => {
  const manifest = JSON.parse(readFileSync(join(TEMPLATE_FILES, "skills.manifest.json"), "utf8"));
  const optional = Object.values(manifest.optional ?? {}).flatMap((o) => o.skills);
  const installed = new Set([...manifest.skills, ...optional].flatMap((g) => g.skills));
  for (const name of EXPECTED) {
    const table = load(name).body.split("## 공식 스킬 연결")[1]?.split("\n## ")[0] ?? "";
    for (const [, s] of table.matchAll(/`([a-z][a-z0-9-]+)`/g)) {
      // 선택 묶음 이름(`ops` 등)도 적을 수 있다
      if (!s.startsWith("prokit-") && !(s in (manifest.optional ?? {}))) assert.ok(installed.has(s), `${name}: ${s}가 매니페스트에 없다`);
    }
  }
});
