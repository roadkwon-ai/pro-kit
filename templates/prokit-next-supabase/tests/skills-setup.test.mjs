import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { TEMPLATE_FILES } from "./helpers.mjs";

const SCRIPT = join(TEMPLATE_FILES, "scripts/skills-setup.mjs");

// 스텁은 받은 인자를 $STUB_LOG에 적고, 진짜 도구가 만들었을 파일만 만든다.
const STUBS = {
  npx: `#!/bin/sh
echo "npx $*" >> "$STUB_LOG"
mode=; skills=; claude=
for a in "$@"; do
  case "$a" in
    --skill) mode=s ;;
    --agent) mode=a ;;
    -*) mode= ;;
    *) if [ "$mode" = s ]; then skills="$skills $a"; elif [ "$mode" = a ] && [ "$a" = claude-code ]; then claude=1; fi ;;
  esac
done
for s in $skills; do
  mkdir -p ".agents/skills/$s" && echo "# $s" > ".agents/skills/$s/SKILL.md"
  if [ -n "$claude" ]; then mkdir -p .claude/skills && ln -sfn "../../.agents/skills/$s" ".claude/skills/$s"; fi
done
`,
  claude: `#!/bin/sh
echo "claude $*" >> "$STUB_LOG"
if [ "$*" = "plugin marketplace list --json" ]; then echo "\${STUB_KNOWN:-[]}"; exit 0; fi
case " $* " in *" $STUB_FAIL "*) exit 1 ;; esac
`,
  omx: `#!/bin/sh
echo "omx $*" >> "$STUB_LOG"
mkdir -p .omx && echo '{}' > .omx/setup-scope.json
`,
};

const MANIFEST = {
  skillsCli: "skills@1.7.0",
  skills: [
    { agents: ["claude-code", "codex"], source: "org/domain", skills: ["dom-a", "dom-b"] },
    { agents: ["codex"], source: "org/process", skills: ["proc-a"] },
  ],
  claude: {
    marketplaces: {
      mk: { source: "git", url: "https://example.com/mk.git" },
      gh: { source: "github", repo: "org/gh" },
    },
    plugins: ["p1@mk", "p2@mk"],
  },
  omx: ["setup", "--scope", "project", "--no-merge-agents"],
  global: [],
};

function setup({ tools = ["npx", "claude", "omx"], manifest = MANIFEST, settings } = {}) {
  const root = mkdtempSync(join(tmpdir(), "skills-setup-"));
  const home = mkdtempSync(join(tmpdir(), "skills-home-"));
  const bin = join(root, ".stub-bin");
  mkdirSync(bin);
  for (const t of tools) {
    writeFileSync(join(bin, t), STUBS[t]);
    chmodSync(join(bin, t), 0o755);
  }
  writeFileSync(join(root, "skills.manifest.json"), JSON.stringify(manifest));
  if (settings) {
    mkdirSync(join(root, ".claude"), { recursive: true });
    writeFileSync(join(root, ".claude/settings.json"), JSON.stringify(settings));
  }
  const log = join(root, "stub.log");
  writeFileSync(log, "");
  const exec = (args = [], env = {}) =>
    spawnSync(process.execPath, [SCRIPT, ...args], {
      cwd: root,
      encoding: "utf8",
      env: { PATH: `${bin}:/usr/bin:/bin`, HOME: home, STUB_LOG: log, ...env },
    });
  return { root, home, exec, calls: () => readFileSync(log, "utf8").trim().split("\n").filter(Boolean) };
}

test("설치: 없는 스킬만 설치하고, Claude 선언을 병합하고, 두 번째 실행은 스킬을 다시 받지 않는다", () => {
  const { root, exec, calls } = setup({
    settings: { env: { A: "1" }, enabledPlugins: { "p1@mk": false } },
  });
  const r = exec();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(existsSync(join(root, ".agents/skills/dom-a/SKILL.md")));
  assert.ok(lstatSync(join(root, ".claude/skills/dom-b")).isSymbolicLink());
  assert.ok(existsSync(join(root, ".agents/skills/proc-a/SKILL.md")));
  assert.equal(existsSync(join(root, ".claude/skills/proc-a")), false, "codex 전용 스킬은 Claude에 링크하지 않는다");

  const s = JSON.parse(readFileSync(join(root, ".claude/settings.json"), "utf8"));
  assert.deepEqual(s.env, { A: "1" });
  assert.deepEqual(s.enabledPlugins, { "p1@mk": false, "p2@mk": true }, "사용자가 끈 플러그인은 그대로 둔다");
  assert.deepEqual(s.extraKnownMarketplaces, {
    mk: { source: { source: "git", url: "https://example.com/mk.git" } },
    gh: { source: { source: "github", repo: "org/gh" } },
  });

  const c = calls();
  assert.ok(c.some((l) => l.startsWith("npx -y skills@1.7.0 add org/domain --skill dom-a dom-b --agent claude-code codex")), c.join("\n"));
  assert.ok(c.includes("claude plugin marketplace add https://example.com/mk.git --scope project"));
  assert.ok(c.includes("claude plugin marketplace add org/gh --scope project"), "github 형식은 owner/repo로 등록한다");
  assert.ok(c.includes("claude plugin install p2@mk --scope project"));
  assert.ok(!c.includes("claude plugin install p1@mk --scope project"), "사용자가 끈 플러그인은 설치하지 않는다(설치하면 다시 켜진다)");
  assert.ok(c.includes("omx setup --scope project --no-merge-agents"));

  const before = calls().length;
  assert.equal(exec().status, 0);
  assert.equal(calls().slice(before).filter((l) => l.startsWith("npx")).length, 0, "이미 있는 스킬은 다시 받지 않는다");
  const check = exec(["--check"]);
  assert.equal(check.status, 0, check.stdout);
});

test("선택 묶음: 기본 설치와 --check는 건너뛰고 상태만 보이며, --optional로 고른 묶음만 설치한다", () => {
  const manifest = {
    ...MANIFEST,
    optional: {
      ops: { description: "운영", skills: [{ agents: ["claude-code", "codex"], source: "org/ops", skills: ["op-a", "op-b"] }] },
      mobile: { description: "모바일", skills: [{ agents: ["claude-code", "codex"], source: "org/mobile", skills: ["mob-a"] }] },
    },
  };
  const { root, exec, calls } = setup({ manifest });
  const r = exec();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(!existsSync(join(root, ".agents/skills/op-a")), "선택 묶음은 기본으로 설치하지 않는다");
  assert.match(r.stdout, /선택 스킬: ops 설치 안 함, mobile 설치 안 함/);
  assert.equal(exec(["--check"]).status, 0, "선택 묶음이 없어도 누락이 아니다");
  assert.equal(exec(["--check", "--optional", "ops"]).status, 1, "고른 묶음은 검사한다");

  const before = calls().length;
  const o = exec(["--optional", "ops"]);
  assert.equal(o.status, 0, o.stdout + o.stderr);
  assert.deepEqual(calls().slice(before).filter((l) => l.startsWith("npx")), [
    "npx -y skills@1.7.0 add org/ops --skill op-a op-b --agent claude-code codex -y",
  ], "기본 스킬은 이미 있으므로 고른 묶음만 받는다");
  assert.ok(lstatSync(join(root, ".claude/skills/op-b")).isSymbolicLink());
  assert.match(o.stdout, /선택 스킬: ops 있음, mobile 설치 안 함/);
  rmSync(join(root, ".agents/skills/op-b"), { recursive: true });
  assert.match(exec(["--check"]).stdout, /ops 일부\(1\/2\)/);

  for (const bad of [["--optional"], ["--optional", "nope"], ["--optional", "ops,nope"]]) {
    const n = calls().length;
    const u = exec(bad);
    assert.equal(u.status, 2, bad.join(" "));
    assert.match(u.stderr, /묶음: ops\(운영\), mobile\(모바일\)/);
    assert.equal(calls().length, n, "모르는 묶음이면 아무것도 설치하지 않는다");
  }
});

test("도구가 없으면: 선언만 쓰고 설치 방법을 안내하며 exit 0, --check는 omx가 없으면 OMX를 빼고 본다", () => {
  const { root, exec } = setup({ tools: [] });
  for (const e of MANIFEST.skills)
    for (const s of e.skills) {
      mkdirSync(join(root, ".agents/skills", s), { recursive: true });
      writeFileSync(join(root, ".agents/skills", s, "SKILL.md"), "#\n");
      if (e.agents.includes("claude-code")) {
        mkdirSync(join(root, ".claude/skills", s), { recursive: true });
        writeFileSync(join(root, ".claude/skills", s, "SKILL.md"), "#\n");
      }
    }
  const r = exec();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /claude 없음/);
  assert.match(r.stdout, /npm install -g oh-my-codex/);
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(join(root, ".claude/settings.json"), "utf8")).enabledPlugins), ["p1@mk", "p2@mk"]);
  const check = exec(["--check"]);
  assert.equal(check.status, 0, check.stdout);
  assert.match(check.stdout, /OMX\(project\): omx 없음/);
  rmSync(join(root, ".agents/skills/proc-a"), { recursive: true });
  const miss = exec(["--check"]);
  assert.equal(miss.status, 1);
  assert.match(miss.stdout, /org\/process: proc-a/);
});

test("--check: omx가 있는데 OMX 프로젝트 설정이 없으면 exit 1", () => {
  const { exec } = setup({ manifest: { ...MANIFEST, skills: [] } });
  const r = exec(["--check"]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /OMX 프로젝트 설정 없음/);
});

test("이미 등록된 마켓플레이스는 다시 등록하지 않는다 (전역 source 형식 보존)", () => {
  const { exec, calls } = setup({ manifest: { ...MANIFEST, skills: [] } });
  const r = exec([], { STUB_KNOWN: '[{"name":"mk","source":"github","repo":"org/mk"}]' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const c = calls();
  assert.ok(!c.some((l) => l.startsWith("claude plugin marketplace add https://example.com/mk.git")), c.join("\n"));
  assert.ok(c.includes("claude plugin marketplace add org/gh --scope project"));
  // 받아 둔 목록이 오래됐으면 플러그인도 옛 판으로 설치된다. 설치 전에 최신으로 받는다.
  const upd = c.indexOf("claude plugin marketplace update mk");
  assert.ok(upd >= 0 && upd < c.findIndex((l) => l.startsWith("claude plugin install")), c.join("\n"));
  assert.ok(!c.includes("claude plugin marketplace update gh"), "새로 등록한 마켓플레이스는 이미 최신이다");
});

test("마켓플레이스 갱신이 실패하면 실패로 보고한다 (exit 2)", () => {
  const { exec } = setup({ manifest: { ...MANIFEST, skills: [] } });
  const r = exec([], { STUB_KNOWN: '[{"name":"mk"}]', STUB_FAIL: "update" });
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /marketplace mk 갱신/);
});

test("심볼릭 링크 경로로 실행해도 동작한다 (macOS /tmp 등)", () => {
  const { root, exec } = setup({ manifest: { ...MANIFEST, skills: [] } });
  symlinkSync(SCRIPT, join(root, "linked.mjs"));
  const r = spawnSync(process.execPath, [join(root, "linked.mjs"), "--check"], { cwd: root, encoding: "utf8", env: { PATH: "/usr/bin:/bin" } });
  assert.match(r.stdout, /스킬\(프로젝트\)/, "진입점 판별이 어긋나면 아무것도 출력하지 않고 exit 0으로 끝난다");
  assert.equal(exec(["--check"]).status, r.status);
});

test("--with-global: check가 실패한 항목의 install만 실행하고, 플래그가 없으면 실행하지 않는다", () => {
  const manifest = {
    ...MANIFEST,
    skills: [],
    global: [
      { name: "g1", check: 'test -f "$HOME/g1"', install: 'touch "$HOME/g1"' },
      { name: "g2", check: "true", install: 'echo ran >> "$HOME/g2"' },
      { name: "g3", check: "false", hint: "수동 설치 안내" },
    ],
  };
  const { home, exec } = setup({ manifest });
  const plain = exec();
  assert.equal(plain.status, 0, plain.stdout + plain.stderr);
  assert.equal(existsSync(join(home, "g1")), false);
  assert.match(plain.stdout, /g1 없음 → touch "\$HOME\/g1"/);
  assert.match(plain.stdout, /g3 없음 → 수동 설치 안내/);

  const r = exec(["--with-global"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(existsSync(join(home, "g1")));
  assert.equal(existsSync(join(home, "g2")), false);
  assert.match(r.stdout, /g1 있음/);
});

test("auto: true인 전역 도구는 --with-global 없이도 설치하고, 그 실패는 경고로만 알린다", () => {
  const manifest = {
    ...MANIFEST,
    skills: [],
    global: [
      { name: "a1", check: 'test -f "$HOME/a1"', install: 'touch "$HOME/a1"', auto: true },
      { name: "a2", check: "false", install: "exit 1", auto: true },
      { name: "g1", check: 'test -f "$HOME/g1"', install: 'touch "$HOME/g1"' },
    ],
  };
  const { home, exec } = setup({ manifest });
  const chk = exec(["--check"]);
  assert.equal(existsSync(join(home, "a1")), false, "--check는 설치하지 않는다");
  assert.match(chk.stdout, /a1 없음/);

  const plain = exec();
  assert.equal(plain.status, 0, plain.stdout + plain.stderr);
  assert.ok(existsSync(join(home, "a1")));
  assert.equal(existsSync(join(home, "g1")), false, "auto가 아닌 도구는 --with-global 때만");
  assert.match(plain.stdout, /경고: 전역 a2 설치 실패/);
  assert.doesNotMatch(plain.stdout, /실패: /);

  const all = exec(["--with-global"]);
  assert.equal(all.status, 2, "--with-global로 요청한 설치의 실패는 실패다");
  assert.match(all.stdout, /실패: 전역 a2/);
});

test("Windows 셸에서는 WSL2를 안내하고 아무것도 하지 않는다", () => {
  const { root, home, calls } = setup();
  // 가드가 사라져도 실제 도구가 불리지 않게 스텁 PATH의 별도 프로세스에서 process.platform만 바꿔 실행한다.
  const r = spawnSync(
    process.execPath,
    ["--import", 'data:text/javascript,Object.defineProperty(process,"platform",{value:"win32"})', SCRIPT],
    { cwd: root, encoding: "utf8", env: { PATH: `${join(root, ".stub-bin")}:/usr/bin:/bin`, HOME: home, STUB_LOG: join(root, "stub.log") } },
  );
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /WSL2/);
  assert.deepEqual(calls(), []);
  assert.equal(existsSync(join(root, ".claude/settings.json")), false);
});

test("agent-browser 검사: npm 최신판보다 낮으면 없음으로 보고 최신판으로 올린다", () => {
  const m = JSON.parse(readFileSync(join(TEMPLATE_FILES, "skills.manifest.json"), "utf8"));
  const g = m.global.find((x) => x.auto);
  // agent-browser 스킬 본문은 CLI가 준다(`skills get core`). CLI가 최신판이어야 스킬도 최신판이다.
  // Node 24 미만의 npm은 태그 없이 설치하면 engines가 맞는 0.27.0을 고른다(2026-09-27 Ubuntu·Node 22 실측). @latest를 명시한다.
  assert.match(g.install, /npm install -g agent-browser@latest\b/);
  assert.match(g.install, /brew upgrade agent-browser/, "Homebrew 설치본은 brew로 올린다(npm 설치본은 PATH에서 뒤에 온다)");
  const bin = mkdtempSync(join(tmpdir(), "ab-stub-"));
  const stub = (name, body) => {
    writeFileSync(join(bin, name), `#!/bin/sh\n${body}\n`);
    chmodSync(join(bin, name), 0o755);
  };
  const env = { PATH: `${bin}:/usr/bin:/bin` };
  const ok = () => spawnSync("sh", ["-c", g.check], { env }).status === 0;
  stub("npm", 'echo "$*" | grep -q "^view agent-browser version" && echo 0.40.0');
  assert.equal(ok(), false, "명령 없음");
  for (const [v, want] of [["0.31.1", false], ["0.39.9", false], ["0.40.0", true], ["1.0.0", true]]) {
    stub("agent-browser", `echo "agent-browser ${v}"`);
    assert.equal(ok(), want, v);
  }
  // 레지스트리에 못 닿거나 빈 답이 오면 next-dev-loop 하한(0.31.1)으로 본다.
  for (const npm of ["exit 1", "true"]) {
    stub("npm", npm);
    for (const [v, want] of [["0.27.0", false], ["0.31.1", true]]) {
      stub("agent-browser", `echo "agent-browser ${v}"`);
      assert.equal(ok(), want, `npm ${npm}: ${v}`);
    }
  }
});

test("플러그인 설치가 실패하면 exit 2이고 실패한 이름을 보여 준다", () => {
  const { exec } = setup();
  const r = exec([], { STUB_FAIL: "p2@mk" });
  assert.equal(r.status, 2);
  assert.match(r.stdout, /p2@mk/);
});

test("깨진 .claude/settings.json은 덮어쓰지 않고 실패로 보고한다", () => {
  const { root, exec } = setup();
  mkdirSync(join(root, ".claude"), { recursive: true });
  writeFileSync(join(root, ".claude/settings.json"), "{ broken");
  const r = exec();
  assert.equal(r.status, 2);
  assert.match(r.stdout, /settings\.json/);
  assert.equal(readFileSync(join(root, ".claude/settings.json"), "utf8"), "{ broken");
});

test("템플릿 매니페스트: 이름 중복 없음, 프로세스 스킬과 플러그인이 모두 있다", () => {
  const m = JSON.parse(readFileSync(join(TEMPLATE_FILES, "skills.manifest.json"), "utf8"));
  const optional = Object.values(m.optional).flatMap((o) => o.skills);
  const names = [...m.skills, ...optional].flatMap((e) => e.skills);
  assert.equal(new Set(names).size, names.length, "기본과 선택 묶음에 같은 스킬이 두 번 있으면 안 된다");
  for (const e of [...m.skills, ...optional]) {
    assert.ok(e.agents.length && e.agents.every((a) => ["claude-code", "codex"].includes(a)), e.source);
    // skills:update는 GitHub owner/repo 형식만 확인한다(ref, URL, 하위 경로는 지원하지 않는다)
    assert.match(e.source, /^[\w.-]+\/[\w.-]+$/, e.source);
  }
  for (const [k, o] of Object.entries(m.optional)) assert.ok(/^[a-z]+$/.test(k) && o.description && o.skills.length, k);
  assert.deepEqual(Object.keys(m.optional), ["ops", "motion", "mobile"]);
  const codexOnly = m.skills.filter((e) => !e.agents.includes("claude-code")).flatMap((e) => e.skills);
  for (const s of [
    "brainstorming", "writing-plans", "subagent-driven-development", "test-driven-development",
    "systematic-debugging", "receiving-code-review", "verification-before-completion",
    "finishing-a-development-branch", "skill-creator", "ponytail", "ponytail-review",
  ]) assert.ok(codexOnly.includes(s), s);
  for (const p of ["superpowers@claude-plugins-official", "oh-my-claudecode@omc", "skill-creator@claude-plugins-official", "ponytail@ponytail"]) {
    assert.ok(m.claude.plugins.includes(p), p);
  }
  // 새 사용자 설정에는 claude-plugins-official도 등록되어 있지 않다(2026-09-27 실측). 둘 다 선언한다.
  assert.deepEqual(m.claude.marketplaces["claude-plugins-official"], { source: "github", repo: "anthropics/claude-plugins-official" });
  assert.deepEqual(m.claude.marketplaces.omc, { source: "git", url: "https://github.com/Yeachan-Heo/oh-my-claudecode.git" });
  assert.deepEqual(m.claude.marketplaces.ponytail, { source: "github", repo: "DietrichGebert/ponytail" });
  assert.deepEqual(m.omx, ["setup", "--scope", "project", "--no-merge-agents"]);
  for (const g of m.global) assert.ok(g.name && g.check && (g.install || g.hint), JSON.stringify(g));
  // ego lite는 macOS 전용이라 다른 OS와 CI에서는 agent-browser가 유일한 브라우저 도구다. 기본 설치한다.
  assert.deepEqual(m.global.filter((g) => g.auto).map((g) => g.name), ["agent-browser CLI(npm 최신판)"]);
  // 새 프로젝트는 설치할 때의 최신판을 받는다. 템플릿에 버전을 고정하지 않는다.
  assert.equal(m.skillsCli, "skills@latest");
  assert.doesNotMatch(JSON.stringify(m.global), /@\d+\.\d+\.\d+/);
});

// --update (pnpm skills:update)
const { changedFiles, remoteSkill, update } = await import(SCRIPT);
const blob = (c) => createHash("sha1").update(`blob ${Buffer.byteLength(c)}\0`).update(c).digest("hex");
const HOUR = 3_600_000;
const NEXT = " → 라운드를 열기 전에 prokit-skills-update 스킬 1절을 따른다";

test("업데이트 판정: 원격 스킬 폴더와 설치본을 파일 단위로 비교해 바뀐 파일을 돌려준다", () => {
  const tree = [
    { path: "skills/a", type: "tree", sha: "t" },
    { path: "skills/a/SKILL.md", type: "blob", mode: "100644", sha: blob("A") },
    { path: "skills/a/ref/x.md", type: "blob", mode: "100644", sha: blob("X") },
    { path: "skills/a/metadata.json", type: "blob", mode: "100644", sha: blob("{}") },
    { path: "skills/a/link.md", type: "blob", mode: "120000", sha: blob("ref/x.md") },
    { path: "skills/a/shared", type: "blob", mode: "120000", sha: blob("../common") },
    { path: "skills/ab/SKILL.md", type: "blob", mode: "100644", sha: blob("AB") },
  ];
  const local = (extra = {}) => new Map(Object.entries({ "SKILL.md": blob("A"), "ref/x.md": blob("X"), "link.md": blob("X"), "shared/c.md": blob("C"), ...extra }));
  const cmp = (l, t = tree, path = "skills/a/SKILL.md") => {
    const r = remoteSkill(t, path, "a");
    return r && changedFiles(r, l);
  };
  assert.deepEqual(cmp(local()), [], "metadata.json은 설치하지 않고, 파일·디렉터리 링크는 따라가 복사한다");
  assert.deepEqual(cmp(local({ ".DS_Store": "1", ".omc/state/x.json": "2" })), [], "로컬에만 있는 숨김 파일은 비교하지 않는다");
  assert.deepEqual(cmp(local({ "scripts/__pycache__/u.pyc": "1", "metadata.json": "2" })), [], "설치가 만들지 않는 파일(파이썬 캐시, metadata.json)은 로컬에 생겨도 비교하지 않는다");
  assert.deepEqual(cmp(local({ "SKILL.md": blob("A2") })), ["SKILL.md", "link.md", "shared"], "무엇이 바뀌면 비교하지 못한 링크 자리도 바뀐 것으로 본다(대상이 스크립트일 수 있다)");
  const fewer = local();
  fewer.delete("ref/x.md");
  assert.deepEqual(cmp(fewer), ["ref/x.md", "link.md", "shared"], "원격에 새 파일");
  assert.deepEqual(cmp(local({ "old.sh": blob("O") })), ["old.sh", "link.md", "shared"], "원격에서 지운 파일도 바뀐 파일이다");
  const moved = tree.map((t) => ({ ...t, path: t.path.replace("skills/a/", "skills/next/a/") }));
  assert.equal(remoteSkill(moved, "skills/a/SKILL.md", "a").folder, "skills/next/a", "폴더를 옮기면 이름으로 찾는다");
  assert.deepEqual(cmp(local(), moved), [], "옮긴 폴더와 내용을 비교한다");
  const toRoot = tree.map((t) => ({ ...t, path: t.path.replace("skills/a/", "a/") }));
  assert.deepEqual(cmp(local({ "SKILL.md": blob("A2") }), toRoot, undefined), ["SKILL.md", "link.md", "shared"], "저장소 루트 폴더로 옮겨도, lock에 경로가 없어도 찾는다");
  assert.equal(cmp(local(), tree.filter((t) => !t.path.startsWith("skills/a/"))), null, "원격에서 없어짐");
  const lower = tree.map((t) => ({ ...t, path: t.path.replace("a/SKILL.md", "a/skill.md") }));
  assert.deepEqual(cmp(new Map([...local()].map(([k, v]) => [k === "SKILL.md" ? "skill.md" : k, v])), lower, "skills/a/skill.md"), [], "lock의 skillPath를 그대로 쓴다");
  const pin = (t) => remoteSkill(t, "skills/a/SKILL.md", "a").pin;
  assert.equal(pin(tree), pin(structuredClone(tree)));
  assert.notEqual(pin(tree), pin(tree.map((t) => (t.path === "skills/a/ref/x.md" ? { ...t, sha: blob("X2") } : t))), "폴더의 파일이 하나라도 바뀌면 검토 고정값이 바뀐다");
  assert.equal(pin(tree), pin([...tree, { path: "skills/ab/tool.sh", type: "blob", mode: "100644", sha: blob("T") }]), "다른 스킬 폴더는 상관없다");
});

// 원격: {source: {스킬: SKILL.md 내용 또는 {파일: 내용}}}. 설치본: dom-b는 옛 내용이고 dom-c는 원격에서 없어졌다.
function updateProject() {
  const root = mkdtempSync(join(tmpdir(), "skills-update-"));
  const manifest = {
    skillsCli: "skills@1.7.0",
    skills: [
      { agents: ["claude-code", "codex"], source: "org/dom", skills: ["dom-a", "dom-b", "dom-c"] },
      { agents: ["codex"], source: "org/proc", skills: ["proc-a"] },
    ],
    optional: { ops: { description: "운영", skills: [{ agents: ["claude-code", "codex"], source: "org/ops", skills: ["op-a"] }] } },
  };
  writeFileSync(join(root, "skills.manifest.json"), JSON.stringify(manifest));
  const lock = { version: 1, skills: {} };
  const put = (name, source, content, claude = true) => {
    for (const [f, c] of Object.entries(typeof content === "string" ? { "SKILL.md": content } : content)) {
      mkdirSync(dirname(join(root, ".agents/skills", name, f)), { recursive: true });
      writeFileSync(join(root, ".agents/skills", name, f), c);
    }
    if (claude && !existsSync(join(root, ".claude/skills", name))) {
      mkdirSync(join(root, ".claude/skills"), { recursive: true });
      symlinkSync(`../../.agents/skills/${name}`, join(root, ".claude/skills", name));
    }
    lock.skills[name] = { source, sourceType: "github", skillPath: `skills/${name}/SKILL.md` };
    writeFileSync(join(root, "skills-lock.json"), JSON.stringify(lock));
  };
  put("dom-a", "org/dom", "A");
  put("dom-b", "org/dom", "B-old");
  put("dom-c", "org/dom", "C");
  put("proc-a", "org/proc", "P", false);
  // 값이 숫자면 그 HTTP 상태로, "throw"면 네트워크 오류로 답한다.
  const remote = { "org/dom": { "dom-a": "A", "dom-b": "B-new" }, "org/proc": { "proc-a": "P" }, "org/ops": { "op-a": "O" } };
  const calls = [];
  const fetch = async (url, opts) => {
    const source = url.match(/repos\/(.+?)\/git\/trees\/HEAD/)[1];
    calls.push({ source, auth: opts.headers.Authorization });
    const r = remote[source];
    if (r === "throw") throw new Error("fetch failed");
    if (typeof r === "number") return { ok: false, status: r, headers: new Map([["x-ratelimit-remaining", r === 403 ? "0" : "10"]]) };
    const tree = Object.entries(r).flatMap(([n, c]) =>
      Object.entries(typeof c === "string" ? { "SKILL.md": c } : c).map(([f, v]) => ({ path: `skills/${n}/${f}`, type: "blob", mode: "100644", sha: blob(v) })),
    );
    return { ok: true, status: 200, headers: new Map(), json: async () => ({ tree, truncated: false }) };
  };
  const added = [];
  const failAdd = new Set();
  // 여기 든 스킬은 원격과 다른 내용으로 설치된다(받기 직전에 바뀐 원격, 다른 폴더에서 받은 설치).
  const tamper = new Set();
  // 진짜 skills CLI처럼 원격 내용으로 폴더를 다시 만든다.
  const add = (dir, cli, e, names) => {
    added.push([cli, e.source, names, e.agents]);
    if (names.some((n) => failAdd.has(n))) return { status: 1 };
    for (const n of names) {
      rmSync(join(dir, ".agents/skills", n), { recursive: true, force: true });
      const c = remote[e.source][n];
      put(n, e.source, tamper.has(n) ? { ...(typeof c === "string" ? { "SKILL.md": c } : c), "extra.sh": "x" } : c, e.agents.includes("claude-code"));
    }
    return { status: 0 };
  };
  const run = async (argv, now = 0, extra = {}) => {
    const out = [];
    const log = console.log;
    console.log = (...a) => out.push(a.join(" "));
    try {
      const code = await update(["--update", ...argv], root, { fetch, now, add, token: "", ...extra });
      return { code, out: out.join("\n") };
    } finally {
      console.log = log;
    }
  };
  const state = () => JSON.parse(readFileSync(join(root, "node_modules/.cache/skills-update.json"), "utf8"));
  return { root, remote, calls, added, failAdd, tamper, fetch, run, state };
}

test("skills:update --check: 바뀐 스킬과 원격에서 없어진 스킬을 알리고, 설치하지 않은 선택 묶음은 보지 않는다", async () => {
  const { calls, added, run } = updateProject();
  const r = await run(["--check"]);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /4개 중 업데이트 1개, 빠짐 0개, 원격에서 없어짐 1개/);
  assert.match(r.out, /업데이트: dom-b/);
  assert.match(r.out, /원격에서 없어짐: dom-c \(org\/dom\)/);
  assert.deepEqual(calls.map((c) => c.source).sort(), ["org/dom", "org/proc"], "저장소마다 한 번, 선택 묶음 ops는 설치하지 않았으니 보지 않는다");
  assert.equal(calls[0].auth, undefined, "토큰이 없으면 인증 헤더를 보내지 않는다");
  assert.deepEqual(added, [], "--check는 설치하지 않는다");
});

test("skills:update --if-due: 하루 한 번만 원격을 보고, 미루기는 단계적으로 늘고 목록이 바뀌면 다시 알린다", async () => {
  const { remote, calls, run } = updateProject();
  const due = (n) => run(["--if-due"], n);
  const avail = (list) => `UPDATE_AVAILABLE mode=ask ${list.split(", ").length}: ${list}${NEXT}`;
  assert.equal((await due(0)).out, `${avail("dom-b")}\nUPSTREAM_GONE 1: dom-c${NEXT}`);
  assert.equal(calls.length, 2);
  assert.equal((await due(HOUR)).out, avail("dom-b"), "업데이트는 하루 안에도 캐시로 다시 알리고, 원격에서 없어진 스킬은 한 번만 알린다");
  assert.equal(calls.length, 2, "하루 안에는 원격을 다시 보지 않는다");

  assert.match((await run(["--snooze"], HOUR)).out, /24시간 미룬다/);
  assert.equal((await due(2 * HOUR)).out, "", "미루는 동안은 조용하다");
  assert.equal((await due(26 * HOUR)).out, avail("dom-b"), "미룬 시간이 지나면 다시 알린다");
  assert.equal(calls.length, 4, "하루가 지나 다시 확인했다");
  assert.match((await run(["--snooze"], 26 * HOUR)).out, /48시간 미룬다/, "같은 목록을 또 미루면 더 길게 미룬다");
  assert.match((await run(["--snooze"], 26 * HOUR)).out, /7일 미룬다/);
  assert.match((await run(["--snooze"], 26 * HOUR)).out, /7일 미룬다/, "7일이 가장 길다");

  remote["org/dom"]["dom-a"] = "A-new";
  assert.equal((await due(51 * HOUR)).out, avail("dom-a, dom-b"), "새 업데이트가 생기면 미루기를 무시한다");

  assert.equal((await run(["--mode", "auto"], 51 * HOUR)).code, 0);
  assert.match((await due(52 * HOUR)).out, /^UPDATE_AVAILABLE mode=auto 2/);
  assert.equal((await run(["--mode", "off"], 52 * HOUR)).code, 0);
  const before = calls.length;
  assert.equal((await due(100 * HOUR)).out, "", "끄면 알리지 않는다");
  assert.equal(calls.length, before, "끄면 원격도 보지 않는다");
  assert.equal((await run(["--mode", "sometimes"])).code, 2);
});

test("skills:update --if-due: 실패한 저장소는 CHECK_FAILED로 알리고 한 시간 뒤 다시 보며, 나머지 저장소 결과는 그대로 알린다", async () => {
  const { root, remote, calls, run, state } = updateProject();
  remote["org/proc"] = 403;
  const first = (await run(["--if-due"], 0)).out.split("\n");
  assert.match(first[0], /^CHECK_FAILED org\/proc: GitHub 403 \(API 한도 초과/);
  assert.equal(first[1], `UPDATE_AVAILABLE mode=ask 1: dom-b${NEXT}`, "확인한 저장소의 업데이트는 함께 알린다");
  assert.equal((await run(["--if-due"], HOUR / 2)).out, `UPDATE_AVAILABLE mode=ask 1: dom-b${NEXT}`, "같은 실패는 한 시간 안에 다시 보이지 않는다");
  assert.equal(calls.length, 2, "한 시간 안에는 다시 보지 않는다");
  remote["org/proc"] = "throw";
  assert.match((await run(["--if-due"], HOUR)).out, /^CHECK_FAILED org\/proc: fetch failed/, "네트워크 오류에도 저장소 이름을 붙인다");
  writeFileSync(join(root, "skills-lock.json"), "{ broken");
  assert.match((await run(["--if-due"], 3 * HOUR)).out, /^CHECK_FAILED /, "깨진 lock도 실패로 알리고 멈추지 않는다");
  assert.equal(state().nextCheck, 4 * HOUR);
});

test("skills:update --if-due: 한 저장소가 잠시 실패해도 그 저장소의 이전 결과를 유지해 미루기와 한 번만 하는 알림이 흔들리지 않는다", async () => {
  const { remote, run, state } = updateProject();
  remote["org/proc"] = { "proc-a": "P-new" };
  assert.match((await run(["--if-due"], 0)).out, /UPDATE_AVAILABLE mode=ask 2: dom-b, proc-a/);
  await run(["--snooze"], 0);
  assert.match((await run(["--snooze"], 0)).out, /48시간/);
  remote["org/dom"] = 503;
  const r = await run(["--if-due"], 25 * HOUR);
  assert.equal(r.out, "CHECK_FAILED org/dom: GitHub 503", "미룬 목록은 그대로라 다시 묻지 않는다");
  assert.deepEqual([state().updates.sort(), state().gone], [["dom-b", "proc-a"], ["dom-c"]]);
  remote["org/dom"] = { "dom-a": "A", "dom-b": "B-new" };
  assert.equal((await run(["--if-due"], 26 * HOUR)).out, "", "복구돼도 이미 알린 원격에서 없어짐을 다시 알리지 않는다");
});

test("skills:update --if-due: 실패한 저장소의 이전 결과는 매니페스트에 남은 스킬만 유지하고, 확인한 스킬이 모두 빠짐이어도 그 결과를 지우지 않는다", async () => {
  const { root, remote, run, state } = updateProject();
  remote["org/proc"] = { "proc-a": "P-new" };
  await run(["--if-due"], 0);
  assert.deepEqual(state().updates, ["dom-b", "proc-a"]);
  remote["org/dom"] = 503;
  rmSync(join(root, ".agents/skills/proc-a"), { recursive: true });
  await run(["--if-due"], 25 * HOUR);
  assert.deepEqual(state().updates, ["dom-b", "proc-a"], "확인한 스킬(proc-a)이 빠짐뿐이어도 미설치 프로젝트로 보지 않는다");
  const m = JSON.parse(readFileSync(join(root, "skills.manifest.json"), "utf8"));
  m.skills[0].skills = ["dom-a", "dom-c"];
  writeFileSync(join(root, "skills.manifest.json"), JSON.stringify(m));
  await run(["--if-due"], 27 * HOUR);
  assert.deepEqual(state().updates, ["proc-a"], "매니페스트에서 뺀 dom-b는 이전 결과에서도 뺀다");
});

test("skills:update --if-due: 외부 스킬이 하나도 설치되지 않았으면(--skip-skills) 업데이트로 알리지 않는다", async () => {
  const { root, run } = updateProject();
  for (const n of ["dom-a", "dom-b", "dom-c", "proc-a"]) rmSync(join(root, ".agents/skills", n), { recursive: true });
  assert.equal((await run(["--if-due"], 0)).out, "");
});

test("skills:update: 저장소가 없어지면(404) 그 저장소의 스킬을 모두 원격에서 없어짐으로 본다", async () => {
  const { remote, run } = updateProject();
  remote["org/proc"] = 404;
  const r = await run(["--check"]);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /원격에서 없어짐: proc-a \(org\/proc\)/);
  assert.doesNotMatch(r.out, /확인 실패/);
});

test("skills:update: 바뀐 스킬과 빠진 스킬만 매니페스트 agents로 다시 설치하고, 없어진 스킬은 지우지 않는다", async () => {
  const { root, added, run, state } = updateProject();
  assert.equal((await run(["--snooze"])).code, 0);
  rmSync(join(root, ".agents/skills/proc-a"), { recursive: true });
  const r = await run([], HOUR);
  assert.deepEqual(added, [
    ["skills@1.7.0", "org/dom", ["dom-b"], ["claude-code", "codex"]],
    ["skills@1.7.0", "org/proc", ["proc-a"], ["codex"]],
  ]);
  assert.match(r.out, /다시 설치: dom-b, proc-a/);
  assert.match(r.out, /스킬 업데이트: 4개 중 업데이트 0개, 빠짐 0개, 원격에서 없어짐 1개/, "설치 뒤 다시 비교한다");
  assert.equal(r.code, 1, "원격에서 없어진 스킬이 남으면 exit 1");
  assert.ok(existsSync(join(root, ".agents/skills/dom-c/SKILL.md")), "원격에서 없어진 스킬은 지우지 않는다");
  assert.equal(existsSync(join(root, ".claude/skills/proc-a")), false, "Codex 전용 스킬은 Claude에 연결하지 않는다");
  assert.deepEqual([state().updates, state().gone, state().snooze], [[], ["dom-c"], undefined], "업데이트하면 미루기를 지운다");
  assert.equal((await run([], 2 * HOUR, { platform: "win32" })).code, 2);
});

test("skills:update: 설치 실패는 exit 2, 설치 뒤 다시 확인하지 못하면 exit 3이고 한 시간 뒤 다시 본다", async () => {
  const a = updateProject();
  a.failAdd.add("dom-b");
  const r = await a.run([]);
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /설치 실패: dom-b/);

  const b = updateProject();
  let n = 0;
  // 첫 확인(저장소 2곳)은 성공하고, 설치 뒤 다시 확인할 때 org/dom이 실패한다.
  const flaky = async (url, opts) => {
    n += 1;
    if (n > 2 && url.includes("org/dom")) throw new Error("fetch failed");
    return b.fetch(url, opts);
  };
  const r2 = await b.run([], 0, { fetch: flaky });
  assert.equal(r2.code, 3, r2.out);
  assert.match(r2.out, /다시 설치: dom-b/);
  assert.match(r2.out, /확인 실패\(위 숫자에 빠짐\): org\/dom: fetch failed/);
  assert.deepEqual([b.state().updates, b.state().nextCheck], [[], HOUR], "설치한 스킬을 캐시에 업데이트로 남기지 않고, 한 시간 뒤 다시 본다");
});

test("skills:update: .md가 아닌 파일이 바뀐 스킬은 auto여도 묻게 알리고(mode=ask), --check가 그 파일을 보여 준다", async () => {
  const { root, remote, run, state } = updateProject();
  remote["org/dom"]["dom-a"] = { "SKILL.md": "A", "scripts/hook.mjs": "new" };
  rmSync(join(root, ".agents/skills/proc-a"), { recursive: true });
  assert.equal((await run(["--mode", "auto"])).code, 0);
  assert.equal(
    (await run(["--if-due"], 0)).out.split("\n")[0],
    `UPDATE_AVAILABLE mode=ask 3: dom-a, dom-b, proc-a (스크립트 변경: dom-a)${NEXT}`,
    "훅이 스킬 스크립트를 바로 실행할 수 있으니 설치 전에 보게 한다. 빠진 스킬은 원격 파일 전체를 새 파일로 본다(proc-a는 .md뿐)",
  );
  assert.deepEqual(state().scripts, ["dom-a"]);
  const r = await run(["--check"]);
  assert.match(r.out, /스크립트 변경\(설치 전에 원격 파일을 본다\): dom-a ← org\/dom skills\/dom-a \(검토 고정값 [0-9a-f]{12}\)\n    scripts\/hook\.mjs: blob [0-9a-f]{40}/);
  assert.doesNotMatch(r.out, /스크립트 변경[^\n]*(dom-b|proc-a)/, ".md만 바뀐 스킬은 표시하지 않는다");
  remote["org/dom"]["dom-a"] = "A";
  await run(["proc-a"], HOUR);
  assert.match((await run(["--if-due"], 48 * HOUR)).out, /^UPDATE_AVAILABLE mode=auto 1: dom-b → /, ".md만 바뀌면 auto 그대로다");
});

test("skills:update <이름>: 지정한 스킬만 다시 설치하고, 모르는 이름이면 설치하지 않고 exit 2", async () => {
  const { root, added, run } = updateProject();
  rmSync(join(root, ".agents/skills/proc-a"), { recursive: true });
  const r = await run(["proc-a"]);
  assert.deepEqual(added, [["skills@1.7.0", "org/proc", ["proc-a"], ["codex"]]]);
  assert.equal(r.code, 1, "지정하지 않은 dom-b가 남아 exit 1");
  assert.match(r.out, /업데이트: dom-b/);
  assert.equal((await run(["nope"])).code, 2);
  assert.equal((await run(["dom-a", "--check"])).code, 1, "--check는 이름과 상관없이 모두 본다");
  assert.equal(added.length, 1, "모르는 이름이면 아무것도 설치하지 않는다");
});

test("skills:update: 스크립트가 바뀐 스킬은 --check로 검토한 판 그대로일 때 이름을 지정해야 설치한다", async () => {
  const { remote, added, run, state } = updateProject();
  remote["org/dom"]["dom-a"] = { "SKILL.md": "A", "scripts/hook.mjs": "v2" };
  const all = await run([]);
  assert.deepEqual(added.map((a) => a[2]), [["dom-b"]], "이름 없이 실행하면 .md만 바뀐 스킬만 설치한다");
  assert.match(all.out, /보류\(스크립트 변경은 이름을 지정해야 설치한다\): dom-a → --check로 원격 파일을 검토한 뒤 pnpm skills:update dom-a/);
  assert.equal(all.code, 1, "보류한 스킬이 남아 exit 1");
  const unchecked = await run(["dom-a"], HOUR);
  assert.equal(unchecked.code, 2, "검토 고정값이 없으면(--check 전) 설치하지 않는다");
  assert.match(unchecked.out, /설치 거부: dom-a: 검토 기록 없음\(먼저 --check\)/);
  assert.equal(added.length, 1);
  await run(["--check"], HOUR);
  assert.ok(state().pins["dom-a"]);
  remote["org/dom"]["dom-a"] = { "SKILL.md": "A", "scripts/hook.mjs": "v3" };
  const moved = await run(["dom-a"], HOUR);
  assert.equal(moved.code, 2, "검토한 뒤 원격이 바뀌면 설치하지 않는다");
  assert.match(moved.out, /설치 거부: dom-a: 검토한 뒤 원격이 바뀌었다\(--check부터 다시\)/);
  assert.equal(added.length, 1);
  await run(["--check"], HOUR);
  const ok = await run(["dom-a"], HOUR);
  assert.deepEqual(added.at(-1)[2], ["dom-a"]);
  assert.match(ok.out, /다시 설치: dom-a/);
});

test("skills:update: 스크립트 변경 스킬의 설치본이 검토한 판과 다르면 알리고 exit 2", async () => {
  const { remote, tamper, run } = updateProject();
  remote["org/dom"]["dom-a"] = { "SKILL.md": "A", "scripts/hook.mjs": "v2" };
  await run(["--check"]);
  tamper.add("dom-a");
  const r = await run(["dom-a"]);
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /설치본이 검토한 판과 다르다: dom-a → 되돌리고/);
});

test("skills:update: lock에 경로가 없고 같은 이름의 폴더가 원격에 여럿이면 스크립트 변경을 설치하지 않는다", () => {
  const b = (p) => ({ path: p, type: "blob", mode: "100644", sha: blob(p) });
  const tree = [b("x/a/SKILL.md"), b("x/a/run.sh"), b("y/a/SKILL.md"), b("y/a/run.sh")];
  assert.equal(remoteSkill(tree, undefined, "a").pin, null, "어느 폴더를 설치할지 모른다");
  assert.match(remoteSkill(tree, "y/a/SKILL.md", "a").pin, /^[0-9a-f]{12}$/, "lock 경로가 있으면 그 폴더다");
  assert.match(remoteSkill(tree.slice(0, 2), undefined, "a").pin, /^[0-9a-f]{12}$/, "후보가 하나면 그 폴더다");
});

test("skills:update --if-due: .md만 바뀐 업데이트를 미룬 뒤 같은 스킬에 스크립트 변경이 생기면 다시 알린다", async () => {
  const { remote, run } = updateProject();
  await run(["--if-due"], 0);
  await run(["--snooze"], 0);
  assert.match((await run(["--snooze"], 0)).out, /48시간/);
  assert.equal((await run(["--if-due"], HOUR)).out, "");
  remote["org/dom"]["dom-b"] = { "SKILL.md": "B-new", "run.sh": "x" };
  assert.match((await run(["--if-due"], 25 * HOUR)).out, /^UPDATE_AVAILABLE mode=ask 1: dom-b \(스크립트 변경: dom-b\)/, "48시간 미루기 중이라도 스크립트 변경은 새 목록이다");
});

test("skills:update --if-due: 옛 캐시에서 확인이 실패해도 한 시간 안에 다시 확인하지 않는다", async () => {
  const { root, calls, run } = updateProject();
  mkdirSync(join(root, "node_modules/.cache"), { recursive: true });
  writeFileSync(join(root, "node_modules/.cache/skills-update.json"), JSON.stringify({ updates: ["dom-b"], nextCheck: 10 * HOUR }));
  writeFileSync(join(root, "skills-lock.json"), "{ broken");
  assert.match((await run(["--if-due"], HOUR)).out, /^CHECK_FAILED /);
  assert.equal((await run(["--if-due"], HOUR + 60_000)).out.split("\n")[0], `UPDATE_AVAILABLE mode=ask 1: dom-b (스크립트 변경: dom-b)${NEXT}`, "모르는 업데이트는 스크립트 변경으로 보고, 같은 실패를 다시 보이지 않는다");
  assert.equal(calls.length, 0);
});

test("skills:update: 모르는 옵션은 설치하지 않고 exit 2 (--chek 오타가 검토 없는 설치가 되지 않게)", async () => {
  const { added, run } = updateProject();
  for (const argv of [["--chek"], ["--mode=auto"], ["-c"]]) assert.equal((await run(argv)).code, 2, argv.join(" "));
  assert.deepEqual(added, []);
  assert.equal((await run(["--", "--check"])).code, 1, "pnpm skills:update -- --check도 확인만 한다");
  assert.deepEqual(added, []);
});

test("skills:update --if-due: 스크립트 변경 기록이 없는 옛 캐시(2026-09-28 스크립트 검토 전)는 기다리지 않고 다시 본다", async () => {
  const { root, remote, calls, run } = updateProject();
  remote["org/dom"]["dom-b"] = { "SKILL.md": "B-new", "run.sh": "x" };
  mkdirSync(join(root, "node_modules/.cache"), { recursive: true });
  writeFileSync(join(root, "node_modules/.cache/skills-update.json"), JSON.stringify({ mode: "auto", updates: ["dom-b"], gone: [], key: "dom-b", nextCheck: 10 * HOUR }));
  assert.match((await run(["--if-due"], HOUR)).out, /^UPDATE_AVAILABLE mode=ask 1: dom-b \(스크립트 변경: dom-b\)/);
  assert.equal(calls.length, 2);
});

test("skills:update 명령은 --update로 연결된다 (알림 방식 저장)", () => {
  const { root, exec } = setup();
  const r = exec(["--update", "--mode", "auto"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(JSON.parse(readFileSync(join(root, "node_modules/.cache/skills-update.json"), "utf8")).mode, "auto");
});
