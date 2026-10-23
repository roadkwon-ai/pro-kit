import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { build, editions, markerErrors, publish, ROOT, stripPro } from "./edition.mjs";

const P = "<!-- edition:pro -->";
const E = "<!-- /edition -->";

test("표시 지우기: 줄 구간, 한 줄 안 구간, 줄 끝 표시. 줄 끝 표시 뒤의 다른 줄 구간과 섞지 않는다", () => {
  const md = [
    "| a | b |",
    `| pro | row | ${P}`,
    "| c | d |",
    "",
    `앞 문장.${P} Pro 문장.${E} 뒤 문장.`,
    P,
    "## Pro 절",
    "본문",
    `${E} `,
    "끝",
  ].join("\n");
  assert.deepEqual(markerErrors(md), []);
  assert.equal(stripPro(md), ["| a | b |", "| c | d |", "", "앞 문장. 뒤 문장.", "끝"].join("\n"));
  assert.equal(stripPro("표시 없음\n"), "표시 없음\n");
});

test("표시 짝 검사: 닫히지 않은 구간, 짝 없는 닫는 표시, 한 줄 안에서 닫히지 않은 구간을 잡는다", () => {
  assert.deepEqual(markerErrors(["a", P, "Pro", "b"].join("\n")), [2]);
  assert.deepEqual(markerErrors(["a", E, "b"].join("\n")), [2]);
  assert.deepEqual(markerErrors(`a${P}b${E}c${P}`), []); // 한 줄 안 구간 뒤의 줄 끝 표시
  assert.deepEqual(markerErrors(`a${P}b${E}c${P}d`), [1]); // 줄 끝이 아닌 여는 표시는 닫아야 한다
  assert.deepEqual(markerErrors(`a${P}b c`), [1]);
  assert.deepEqual(markerErrors(`a${E} b`), [1]);
});

test("ui 판: 검사(표시 짝, 남은 표시, 빠진 스킬 이름, 끊긴 링크)를 통과하고 Pro 전용 파일은 없다", () => {
  const out = mkdtempSync(join(tmpdir(), "prokit-ui-test-"));
  try {
    assert.deepEqual(build("ui", out), []);
    const skills = join(out, "templates/prokit-next-neon/files/.agents/skills");
    for (const s of ["prokit-dev-cycle", "prokit-ui", "prokit-verify", "prokit-pack-use", "prokit-skills-manage", "prokit-skills-update"]) assert.ok(existsSync(join(skills, s, "SKILL.md")), s);
    for (const s of ["prokit-web", "prokit-api", "prokit-db", "prokit-deploy"]) assert.ok(!existsSync(join(skills, s)), s);
    for (const f of ["templates/prokit-next-supabase", "handbook", "templates/prokit-next-neon/tests", ".agents/skills/prokit-docs"]) assert.ok(!existsSync(join(out, f)), f);
    // 덧씌운 루트 문서, 링크로 둔 스킬, 실행 권한
    assert.match(readFileSync(join(out, "AGENTS.md"), "utf8"), /^# 에이전트 규칙 \(pro-kit-ui\)/);
    assert.ok(lstatSync(join(out, ".claude/skills/prokit-init")).isSymbolicLink());
    assert.ok(statSync(join(out, "templates/prokit-next-neon/install.sh")).mode & 0o100);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("ui 판 덧씌운 문서: 생성 명령은 neon 템플릿 README와 같고, 판 저장소 주소는 site-links.json과 같다", () => {
  const flags = (s) => s.match(/--[a-z-]+(?: [a-z][\w-]*(?: [a-z][\w-]*)?)?/g).join(" ");
  const overlay = join(ROOT, editions().ui.overlay);
  const readme = readFileSync(join(ROOT, "templates/prokit-next-neon/README.md"), "utf8").match(/pnpm create better-t-stack@latest my-app([\s\S]*?--install)/)[1];
  const agents = readFileSync(join(overlay, "AGENTS.md"), "utf8");
  const ui = agents.match(/pnpm create better-t-stack@latest <이름>([\s\S]*?--install)/)[1];
  assert.equal(flags(ui.replace(/\\\n\s*/g, "")), flags(readme.replace(/\\\n\s*/g, "")));
  const url = JSON.parse(readFileSync(join(ROOT, "site-links.json"), "utf8"))[editions().ui.link];
  for (const f of ["AGENTS.md", "README.md"]) assert.ok(readFileSync(join(overlay, f), "utf8").includes(url), f);
});

test("판 내보내기: 판 저장소에 새 판을 커밋하고 태그와 함께 push한다", () => {
  const tmp = mkdtempSync(join(tmpdir(), "prokit-ui-publish-"));
  const env = { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.com" };
  const saved = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
  Object.assign(process.env, env);
  try {
    const remote = join(tmp, "remote.git");
    execFileSync("git", ["init", "-q", "--bare", "-b", "main", remote]);
    // ref: null은 작업 트리로 만든다(커밋하기 전에도 시험할 수 있게). 실제 내보내기는 태그나 HEAD 커밋으로 만든다.
    publish("ui", { remote, tag: "v9.9.9", ref: null });
    publish("ui", { remote, ref: null }); // 바뀐 것이 없어도 커밋한다
    const log = (...a) => execFileSync("git", ["-C", remote, ...a], { encoding: "utf8" }).trim();
    assert.equal(log("rev-list", "--count", "main"), "2");
    assert.match(log("log", "-1", "--format=%s", "v9.9.9"), /^v9\.9\.9: pro-kit v9\.9\.9에서 생성$/);
    assert.match(log("show", "main:AGENTS.md"), /pro-kit-ui/);
  } finally {
    for (const [k, v] of Object.entries(saved)) v === undefined ? delete process.env[k] : (process.env[k] = v);
    rmSync(tmp, { recursive: true, force: true });
  }
});
