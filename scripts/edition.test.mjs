import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { build, check, dropProRows, editions, markerErrors, publish, rename, ROOT, stripPro, verify } from "./edition.mjs";

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

test("판 글 주석은 판에서만 벗겨 보인다: 한 줄 안, 줄 끝 표시 행의 판 행, 여러 줄", () => {
  assert.equal(stripPro(`스킬 ${P}10개${E}<!-- edition:ui 7개 -->가 맡아요.`), "스킬 7개가 맡아요.");
  assert.equal(stripPro(`| a |\n| Pro 행 | <!-- edition:ui | 판 행 | --> ${P}\n| b |`), "| a |\n| 판 행 |\n| b |");
  assert.equal(stripPro("앞\n<!-- edition:ui\n```text\n판 예시\n```\n-->\n뒤"), "앞\n```text\n판 예시\n```\n뒤");
});

test("저장소 이름 바꾸기: 받을 저장소·폴더·주소를 판으로 바꾸고 조사를 맞춘다. Pro 안내, 주석, 프리셋 주소, 다른 저장소 이름은 그대로 둔다", () => {
  const r = (t) => rename(t, "pro-kit", "pro-kit-ui");
  assert.equal(r("https://github.com/roadkwon-ai/pro-kit 을 이 폴더에 받고"), "https://github.com/roadkwon-ai/pro-kit-ui 를 이 폴더에 받고");
  assert.equal(r("pro-kit을 받고 pro-kit은 pro-kit이 pro-kit과 pro-kit으로 pro-kit의 `pro-kit/scripts/pack.mjs`"), "pro-kit-ui를 받고 pro-kit-ui는 pro-kit-ui가 pro-kit-ui와 pro-kit-ui로 pro-kit-ui의 `pro-kit-ui/scripts/pack.mjs`");
  assert.equal(r("pro-kit 이 폴더, 정본은 pro-kit이다"), "pro-kit-ui 이 폴더, 정본은 pro-kit-ui이다");
  assert.equal(r("작업 폴더에 `pro-kit`이 없으면, `pro-kit`의"), "작업 폴더에 `pro-kit-ui`가 없으면, `pro-kit-ui`의");
  assert.equal(r("pro-kit이면 pro-kit이나 pro-kit이라는 pro-kit이에요 pro-kit이름 pro-kit이미"), "pro-kit-ui면 pro-kit-ui나 pro-kit-ui라는 pro-kit-ui예요 pro-kit-ui이름 pro-kit-ui이미");
  assert.equal(r("[받기](README.md#pro-kit-받기) [웹](a.md#pro-kit-web-규칙)"), "[받기](README.md#pro-kit-ui-받기) [웹](a.md#pro-kit-web-규칙)");
  const keep = "Pro 스킬셋(`pro-kit`)이 필요하다. prokit-web.vercel.app/pro-kit/goru/ https://prokit-web.vercel.app/pro-kit/goru/ prokit.highvalue.kr/pro-kit pro-kit-old pro-kit-web <!-- edition:ui pro-kit에서 만든 사본 -->";
  assert.equal(r(keep), keep);
});

test("판에 없는 쪽을 첫 칸이나 맨 앞에 가리키는 표 행과 목록 줄만 뺀다. 다른 칸·코드 블록·문장 안 링크는 그대로 둔다", () => {
  const isPro = (p) => p === "handbook/start/adopt.md";
  const md = [
    "| 쪽 | 설명 |",
    "|---|---|",
    "| [도입](adopt.md) | 기존 프로젝트 |",
    "| [화면](quickstart-screens.md) | [도입](adopt.md)과 다르다 |",
    "- [도입](./adopt.md#순서)",
    "- **[도입](adopt.md)**: 기존 프로젝트",
    "| 화면 | 근거는 [도입](adopt.md) |",
    "1. [화면](quickstart-screens.md)",
    "문장 안 [도입](adopt.md) 링크",
    "```md",
    "- [도입](adopt.md)",
    "```",
  ].join("\n");
  assert.equal(dropProRows(md, "handbook/start/README.md", isPro), [0, 1, 3, 6, 7, 8, 9, 10, 11].map((i) => md.split("\n")[i]).join("\n"));
});

test("검사: Pro 말은 허용 목록의 줄 수와 같을 때만 통과하고, 판에 없는 허용 줄, HTML 그림의 끊긴 주소, 지운 절의 앵커를 잡는다", () => {
  const tmp = mkdtempSync(join(tmpdir(), "prokit-ui-check-"));
  try {
    const out = join(tmp, "out");
    mkdirSync(out);
    writeFileSync(join(out, "a.md"), '마이그레이션을 적용한다.\n마이그레이션 없이 화면만 만든다.\n<img src="x.png">\n[있음](b.md#있는-절) [없음](b.md#지운-절)\n');
    writeFileSync(join(out, "b.md"), "# b\n\n## 있는 절\n");
    writeFileSync(join(tmp, "allow.txt"), "# 주석\na.md | 마이그레이션 | 2 | 화면만 규칙이 쓰지 않는다고 말한다.\na.md | Neon | 1 | 없는 말.\n");
    const ed = { missing: ["prokit-db"], proTerms: ["마이그레이션", "Neon"], allow: "allow.txt" };
    assert.deepEqual(check(ed, out, tmp), ["a.md:3 끊긴 링크: x.png", "a.md:4 판에 없는 앵커: b.md#지운-절", "allow.txt: 판에 없는 말 \"a.md | Neon\"(허용 목록에서 지운다)"]);
    writeFileSync(join(tmp, "allow.txt"), "a.md | 마이그레이션 | 1 | 하나만 허용한다.\n");
    assert.match(check(ed, out, tmp).join("\n"), /a\.md:1,2 Pro 절차로 보이는 말 "마이그레이션" 2줄\(허용 1줄\)/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("판 만들기: Pro 구간 밖에 남은 판에서 틀리는 값(proValues)을 잡고, 판에서는 값 표시를 벗긴다", () => {
  const tmp = mkdtempSync(join(tmpdir(), "prokit-ui-values-"));
  try {
    const root = join(tmp, "root");
    mkdirSync(join(root, "docs"), { recursive: true });
    writeFileSync(join(root, "editions.json"), JSON.stringify({ t: { include: ["docs"], exclude: [], missing: ["prokit-db"], proValues: ["prokit.skills.count"] } }));
    writeFileSync(join(root, "docs/a.md"), `스킬 ${P}<!-- v:prokit.skills.count -->10<!-- /v -->${E}<!-- edition:ui 6 -->개, 에이전트 <!-- v:agents.count -->4<!-- /v -->개\n스킬 <!-- v:prokit.skills.count -->10<!-- /v -->개\n`);
    execFileSync("git", ["init", "-q", root]);
    execFileSync("git", ["-C", root, "add", "-A"]);
    const out = join(tmp, "out");
    assert.deepEqual(build("t", out, { root }), ["docs/a.md:2 판에서 틀리는 값: prokit.skills.count(Pro 구간과 edition:ui 짝으로 판 값을 쓴다)"]);
    assert.equal(readFileSync(join(out, "docs/a.md"), "utf8"), "스킬 6개, 에이전트 4개\n스킬 10개\n");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("표시 짝 검사: 닫히지 않은 구간, 짝 없는 닫는 표시, 한 줄 안에서 닫히지 않은 구간을 잡는다", () => {
  assert.deepEqual(markerErrors(["a", P, "Pro", "b"].join("\n")), [2]);
  assert.deepEqual(markerErrors(["a", E, "b"].join("\n")), [2]);
  assert.deepEqual(markerErrors(`a${P}b${E}c${P}`), []); // 한 줄 안 구간 뒤의 줄 끝 표시
  assert.deepEqual(markerErrors(`a${P}b${E}c${P}d`), [1]); // 줄 끝이 아닌 여는 표시는 닫아야 한다
  assert.deepEqual(markerErrors(`a${P}b c`), [1]);
  assert.deepEqual(markerErrors(`a${E} b`), [1]);
  assert.deepEqual(markerErrors("<!-- edition:ui\nA --> B\n-->"), [2]); // 여러 줄 판 글 안의 -->
  assert.deepEqual(markerErrors("<!-- edition:ui\n닫지 않음"), [1]);
  // 줄(목록 항목, 인용 안 포함) 맨 앞의 표시 뒤에 글을 이으면 GitHub과 홈페이지가 그 줄을 HTML로 본다
  assert.deepEqual(markerErrors(`- ${P}Pro 문장. ${E}뒤 문장.\n> ${P}Pro${E} 뒤\n${P}Pro${E}\n- <!-- edition:ui 판 글 --> 뒤`), [1, 2, 3, 4]);
  assert.deepEqual(markerErrors(`- 앞 문장.${P} Pro 문장.${E}\n- <!-- edition:ui 판 글 -->\n> 앞${P} Pro${E}`), []);
  // 표 머리 행이나 구분 행의 표시는 칸 수를 어긋나게 하고, 구분 행의 주석은 Pro 쪽 표를 표가 아니게 만든다
  assert.deepEqual(markerErrors(`| a |${P} b |${E}\n|---|${P}---|${E}\n| 1 | 2 |`), [1, 2]);
  assert.deepEqual(markerErrors(`| a | b${P} (Pro)${E} |\n|---|---|\n| 1 | 2 | ${P}\n| 3 |${P} 4${E} |`), []);
});

test("ui 판: 검사(표시 짝, 남은 표시, 빠진 스킬 이름, 끊긴 링크, Pro 말)를 통과하고 Pro 전용 파일은 없다", () => {
  const out = mkdtempSync(join(tmpdir(), "prokit-ui-test-"));
  try {
    assert.deepEqual(build("ui", out), []);
    const skills = join(out, "templates/prokit-next-neon/files/.agents/skills");
    for (const s of ["prokit-dev-cycle", "prokit-ui", "prokit-verify", "prokit-pack-use", "prokit-skills-manage", "prokit-skills-update"]) assert.ok(existsSync(join(skills, s, "SKILL.md")), s);
    for (const s of ["prokit-web", "prokit-api", "prokit-db", "prokit-deploy"]) assert.ok(!existsSync(join(skills, s)), s);
    for (const f of ["templates/prokit-next-supabase", "templates/prokit-next-neon/tests", ".agents/skills/prokit-docs", "CONTRIBUTING.md", "handbook/start/adopt.md", "handbook/deploy/vercel.md", "tutorials/01-nextflix", "tutorials/samples/real-service.md"]) assert.ok(!existsSync(join(out, f)), f);
    // UI 문서: handbook과 튜토리얼 중 화면 작업 쪽, README가 쓰는 그림
    for (const f of ["handbook/design/ui-skillset.md", "handbook/start/quickstart-screens.md", "tutorials/samples/README.md", "tutorials/reference/deploy.md", "docs/assets/brand/banner.png"]) assert.ok(existsSync(join(out, f)), f);
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

// 임시 판 저장소(bare)와 커밋 작성자를 두고 fn(remote, tmp)을 부른다.
function withRemote(fn) {
  const tmp = mkdtempSync(join(tmpdir(), "prokit-ui-publish-"));
  const env = { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.com" };
  const saved = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
  Object.assign(process.env, env);
  try {
    const remote = join(tmp, "remote.git");
    execFileSync("git", ["init", "-q", "--bare", "-b", "main", remote]);
    fn(remote, tmp);
  } finally {
    for (const [k, v] of Object.entries(saved)) v === undefined ? delete process.env[k] : (process.env[k] = v);
    rmSync(tmp, { recursive: true, force: true });
  }
}
const at = (remote) => (...a) => execFileSync("git", ["-C", remote, ...a], { encoding: "utf8" }).trim();

test("판 내보내기: 판 저장소에 새 판을 커밋하고 태그와 함께 push한 뒤 다시 받아 확인한다", () => {
  withRemote((remote) => {
    // ref: null은 작업 트리로 만든다(커밋하기 전에도 시험할 수 있게). 실제 내보내기는 태그나 HEAD 커밋으로 만든다.
    publish("ui", { remote, tag: "v9.9.9", ref: null });
    const log = at(remote);
    assert.deepEqual(verify("ui", { remote, tag: "v9.9.9", ref: null }), []);
    publish("ui", { remote, tag: "v9.9.9", ref: null }); // 같은 태그로 다시 하면 새 커밋 없이 확인만 한다
    assert.equal(log("rev-list", "--count", "main"), "1");
    publish("ui", { remote, ref: null }); // 바뀐 것이 없어도 커밋한다
    assert.equal(log("rev-list", "--count", "main"), "2");
    assert.match(log("log", "-1", "--format=%s", "v9.9.9"), /^v9\.9\.9: pro-kit v9\.9\.9에서 생성$/);
    assert.match(log("show", "main:AGENTS.md"), /pro-kit-ui/);
    // 내보낸 뒤 판 저장소 main이 바뀌면 태그 확인이 잡는다
    assert.deepEqual(verify("ui", { remote, tag: "v9.9.9", ref: null }), ["판 저장소 main이 v9.9.9 커밋이 아니다"]);
  });
});

test("판 내보내기: push가 한 번 실패하면 다시 하고, 같은 태그에 다른 내용이 있으면 멈춘다", () => {
  withRemote((remote, tmp) => {
    // 첫 push만 거절하는 판 저장소
    writeFileSync(join(remote, "hooks/pre-receive"), '#!/bin/sh\n[ -f once ] && exit 0\ntouch once\necho "한 번 거절" >&2\nexit 1\n', { mode: 0o755 });
    publish("ui", { remote, tag: "v9.9.9", ref: null, retry: [0] });
    assert.equal(at(remote)("rev-list", "--count", "main"), "1");
    // 다른 내용으로 같은 태그를 먼저 올려 둔 판 저장소
    const other = join(tmp, "other.git");
    const work = join(tmp, "work");
    execFileSync("git", ["init", "-q", "--bare", "-b", "main", other]);
    execFileSync("git", ["init", "-q", "-b", "main", work]);
    writeFileSync(join(work, "a.txt"), "다른 판\n");
    at(work)("add", "a.txt");
    at(work)("commit", "-q", "-m", "다른 판");
    at(work)("tag", "-a", "v9.9.9", "-m", "다른 판");
    at(work)("push", "-q", other, "HEAD:refs/heads/main", "v9.9.9");
    assert.throws(() => publish("ui", { remote: other, tag: "v9.9.9", ref: null }), /이미 있고 내용이 다르다/);
    // 재시도를 다 써도 거절하면 실패하고, 판 저장소에는 아무것도 들어가지 않는다
    const closed = join(tmp, "closed.git");
    execFileSync("git", ["init", "-q", "--bare", "-b", "main", closed]);
    writeFileSync(join(closed, "hooks/pre-receive"), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
    assert.throws(() => publish("ui", { remote: closed, tag: "v9.9.9", ref: null, retry: [0, 0] }));
    assert.equal(at(closed)("for-each-ref"), "");
    assert.deepEqual(verify("ui", { remote: other, tag: "v9.9.9", ref: null }), ["판 저장소 refs/tags/v9.9.9의 내용이 pro-kit 작업 트리로 만든 판과 다르다"]);
  });
});

test("판 내보내기: 커밋(HEAD)을 임시 worktree로 꺼내 만들고, 확인한 뒤 worktree를 치운다", () => {
  withRemote((remote) => {
    const before = execFileSync("git", ["-C", ROOT, "worktree", "list"], { encoding: "utf8" });
    publish("ui", { remote, ref: "HEAD" });
    assert.deepEqual(verify("ui", { remote, ref: "HEAD" }), []);
    assert.equal(execFileSync("git", ["-C", ROOT, "worktree", "list"], { encoding: "utf8" }), before);
  });
});
