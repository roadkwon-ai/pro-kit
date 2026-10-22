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
// npx(skills CLI): add는 스킬 폴더·Claude 링크·skills-lock.json 출처를 쓰고, remove는 그것을 지운다.
const STUBS = {
  npx: `#!${process.execPath}
const fs = require("node:fs");
const a = process.argv.slice(2);
fs.appendFileSync(process.env.STUB_LOG, \`npx \${a.join(" ")}\\n\`);
const after = (flag) => { const i = a.indexOf(flag); const out = []; if (i < 0) return out; for (const x of a.slice(i + 1)) { if (x.startsWith("-")) break; out.push(x); } return out; };
const lock = fs.existsSync("skills-lock.json") ? JSON.parse(fs.readFileSync("skills-lock.json", "utf8")) : { version: 1, skills: {} };
if (a[2] === "add") {
  const claude = after("--agent").includes("claude-code");
  for (const s of after("--skill")) {
    fs.mkdirSync(\`.agents/skills/\${s}\`, { recursive: true });
    fs.writeFileSync(\`.agents/skills/\${s}/SKILL.md\`, \`# \${s}\\n\`);
    if (claude) { fs.mkdirSync(".claude/skills", { recursive: true }); fs.rmSync(\`.claude/skills/\${s}\`, { force: true }); fs.symlinkSync(\`../../.agents/skills/\${s}\`, \`.claude/skills/\${s}\`); }
    lock.skills[s] = { source: a[3], sourceType: "github", skillPath: \`skills/\${s}/SKILL.md\` };
  }
} else if (a[2] === "remove") {
  for (const s of a.includes("--skill") ? after("--skill") : after("remove")) { fs.rmSync(\`.agents/skills/\${s}\`, { recursive: true, force: true }); fs.rmSync(\`.claude/skills/\${s}\`, { force: true }); delete lock.skills[s]; }
}
fs.writeFileSync("skills-lock.json", JSON.stringify(lock));
`,
  claude: `#!/bin/sh
echo "claude $*" >> "$STUB_LOG"
if [ "$*" = "plugin marketplace list --json" ]; then echo "\${STUB_KNOWN:-[]}"; exit 0; fi
case " $* " in *" $STUB_FAIL "*) exit 1 ;; esac
`,
  codex: `#!/bin/sh
echo "codex $*" >> "$STUB_LOG"
case "$*" in
  "plugin marketplace list --json")
    [ -n "$STUB_CODEX_UNSUPPORTED" ] && { echo "unknown command" >&2; exit 2; }
    [ -n "$STUB_CODEX_MARKETS" ] && echo "$STUB_CODEX_MARKETS" || echo '{"marketplaces":[]}'
    ;;
  "plugin list --json")
    [ -n "$STUB_CODEX_UNSUPPORTED" ] && { echo "unknown command" >&2; exit 2; }
    if [ -n "$STUB_CODEX_PLUGINS" ]; then echo "$STUB_CODEX_PLUGINS";
    elif [ -f "$HOME/codex-ponytail" ]; then echo '{"installed":[{"pluginId":"ponytail@ponytail","installed":true,"enabled":true,"version":"1.0.0","source":{},"marketplaceSource":{"sourceType":"git","source":"https://github.com/DietrichGebert/ponytail.git"}}],"available":[]}'
    else echo '{"installed":[],"available":[]}'
    fi
    ;;
  "plugin marketplace add DietrichGebert/ponytail --json"|"plugin marketplace upgrade ponytail --json") ;;
  "plugin add ponytail@ponytail --json") touch "$HOME/codex-ponytail" ;;
esac
case " $* " in *" $STUB_FAIL "*) echo "failed" >&2; exit 1 ;; esac
`,
  omx: `#!/bin/sh
echo "omx $*" >> "$STUB_LOG"
case "$1" in
  setup) mkdir -p .omx .codex/.omx && echo '{}' > .omx/setup-scope.json ;;
  uninstall) case " $* " in *" --purge "*) rm -rf .omx ;; *) rm -f .omx/setup-scope.json .omx/hud-config.json ;; esac ;;
esac
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
  global: [],
};

// 하나만 고르는 두 항목(두뇌 brains, 과설계 방지 simplicity)과 mattpocock 추가 스킬.
const PONYTAIL_CODEX = { marketplace: { name: "ponytail", source: "DietrichGebert/ponytail" }, plugins: ["ponytail@ponytail"] };
const SLOTS = {
  mattpocock: { source: "org/matt", agents: ["claude-code", "codex"], pool: ["m-a", "m-b"] },
  brains: {
    sp: {
      description: "규율",
      skills: [{ agents: ["codex"], source: "org/sp", skills: ["sp-a", "shared"] }],
      claude: { marketplaces: { mk: { source: "git", url: "https://example.com/mk.git" } }, plugins: ["sp@mk"] },
    },
    om: {
      description: "자동",
      claude: { marketplaces: { om: { source: "git", url: "https://example.com/om.git" } }, plugins: ["om@om"] },
      omx: ["setup", "--scope", "project", "--no-merge-agents"],
      global: [{ name: "OMX CLI", check: "command -v omx", install: "npm install -g oh-my-codex", tool: "codex" }],
      userTraces: [{ path: ".claude/CLAUDE.md", contains: "<!-- OMC:START -->" }],
    },
    gs: {
      description: "제품",
      global: [{ name: "gs", check: 'test -d "$HOME/gs"', install: 'mkdir "$HOME/gs"' }],
      userSkills: ".claude/skills/gstack",
    },
  },
  simplicity: {
    pt: {
      description: "미니멀",
      skills: [{ agents: ["codex"], source: "org/pt", skills: ["pt-a"] }],
      claude: { marketplaces: { pt: { source: "github", repo: "org/pt" } }, plugins: ["pt@pt"] },
      codex: PONYTAIL_CODEX,
    },
    cv: { description: "간결", skills: [{ agents: ["claude-code", "codex"], source: "org/cv", skills: ["cv-a", "cv-b"] }] },
  },
};
// Codex 네이티브 플러그인만 보는 시험: 과설계 방지 pt를 고른 프로젝트.
const CODEX_ONLY = { ...MANIFEST, skills: [], claude: { marketplaces: {}, plugins: [] }, simplicity: { pt: { description: "미니멀", codex: PONYTAIL_CODEX } } };
// 설치기가 Biome로 맞춘 형식(탭, 짧은 객체는 한 줄). 기록은 이 형식을 지켜야 한다.
const devCycleText = (keys = {}) =>
  `{\n${Object.entries(keys).map(([k, v]) => `\t"${k}": "${v}",\n`).join("")}\t"todoPath": "tasks/todo.md",\n\t"ui": { "auditMin": 16, "a11yMin": 3 }\n}\n`;

function setup({ tools = ["npx", "claude", "codex", "omx"], manifest = MANIFEST, settings, devCycle } = {}) {
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
  if (devCycle) writeFileSync(join(root, ".dev-cycle.json"), devCycleText(devCycle));
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
  assert.ok(!c.some((l) => l.startsWith("omx ")), "두뇌를 고르지 않으면 OMX를 설정하지 않는다");

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
  const { root, exec } = setup({ tools: [], manifest: { ...MANIFEST, ...SLOTS }, devCycle: { brain: "om" } });
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
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(join(root, ".claude/settings.json"), "utf8")).enabledPlugins), ["p1@mk", "p2@mk", "om@om"]);
  const check = exec(["--check"]);
  assert.equal(check.status, 0, check.stdout);
  assert.match(check.stdout, /OMX\(project\): omx 없음/);
  rmSync(join(root, ".agents/skills/proc-a"), { recursive: true });
  const miss = exec(["--check"]);
  assert.equal(miss.status, 1);
  assert.match(miss.stdout, /org\/process: proc-a/);
});

test("--check: 두뇌가 oh-my인데 omx가 있고 OMX 프로젝트 설정이 없으면 exit 1", () => {
  const { exec } = setup({ manifest: { ...MANIFEST, ...SLOTS, skills: [] }, devCycle: { brain: "om" } });
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

test("Codex 플러그인: 기본 실행과 --check는 상태만 보여 주고 설정을 바꾸지 않는다", () => {
	const manifest = CODEX_ONLY;
	const { exec, calls } = setup({ tools: ["codex"], manifest, devCycle: { simplicity: "pt" } });
	for (const args of [[], ["--check"]]) {
		const before = calls().length;
		const r = exec(args);
		assert.equal(r.status, 0, r.stdout + r.stderr);
		assert.match(r.stdout, /Codex 플러그인.*설치 안 함/);
		assert.deepEqual(calls().slice(before), [
			"codex plugin marketplace list --json",
			"codex plugin list --json",
		]);
	}
});

test("Codex 플러그인: --check --with-global도 조회만 하며 조회 오류는 선택 기능으로 둔다", () => {
	const manifest = CODEX_ONLY;
	const { home, exec, calls } = setup({ tools: ["codex"], manifest, devCycle: { simplicity: "pt" } });
	const r = exec(["--check", "--with-global"]);
	assert.equal(r.status, 0, r.stdout + r.stderr);
	assert.deepEqual(calls(), [
		"codex plugin marketplace list --json",
		"codex plugin list --json",
	]);
	assert.equal(existsSync(join(home, "codex-ponytail")), false);
	const malformed = exec(["--check", "--with-global"], {
		STUB_CODEX_MARKETS: "{",
	});
	assert.equal(malformed.status, 0, malformed.stdout + malformed.stderr);
	assert.match(malformed.stdout, /Codex 플러그인.*JSON/);
});

test("Codex 플러그인: --with-global은 최초에만 올바른 marketplace와 ponytail을 설치한다", () => {
	const manifest = CODEX_ONLY;
	const { exec, calls } = setup({ tools: ["codex"], manifest, devCycle: { simplicity: "pt" } });
	const r = exec(["--with-global"]);
	assert.equal(r.status, 0, r.stdout + r.stderr);
	assert.deepEqual(calls(), [
		"codex plugin marketplace list --json",
		"codex plugin list --json",
		"codex plugin marketplace add DietrichGebert/ponytail --json",
		"codex plugin add ponytail@ponytail --json",
	]);
	const before = calls().length;
	assert.equal(exec(["--with-global"]).status, 0);
	assert.deepEqual(calls().slice(before), [
		"codex plugin marketplace list --json",
		"codex plugin list --json",
	], "이미 설치한 plugin은 다시 설치하거나 marketplace를 갱신하지 않는다");
});

test("Codex 플러그인: 기존 공식 marketplace에서 처음 설치할 때만 갱신하고, 비활성 선택은 보존한다", () => {
	const manifest = CODEX_ONLY;
	const markets = '{"marketplaces":[{"name":"ponytail","marketplaceSource":{"sourceType":"git","source":"https://github.com/DietrichGebert/ponytail.git"}}]}';
	const { exec, calls } = setup({ tools: ["codex"], manifest, devCycle: { simplicity: "pt" } });
	assert.equal(exec(["--with-global"], { STUB_CODEX_MARKETS: markets }).status, 0);
	assert.ok(calls().includes("codex plugin marketplace upgrade ponytail --json"));
	assert.ok(calls().includes("codex plugin add ponytail@ponytail --json"));

	const disabled = '{"installed":[{"pluginId":"ponytail@ponytail","installed":true,"enabled":false,"version":"1.0.0","source":{},"marketplaceSource":{"sourceType":"git","source":"https://github.com/DietrichGebert/ponytail.git"}}],"available":[]}';
	const before = calls().length;
	const r = exec(["--with-global"], { STUB_CODEX_MARKETS: markets, STUB_CODEX_PLUGINS: disabled });
	assert.equal(r.status, 0, r.stdout + r.stderr);
	assert.match(r.stdout, /비활성/);
	assert.deepEqual(calls().slice(before), [
		"codex plugin marketplace list --json",
		"codex plugin list --json",
	], "사용자가 끈 plugin을 설치하거나 갱신하지 않는다");
	for (const plugins of [
		'{"installed":[{"pluginId":"ponytail@ponytail","installed":true,"enabled":true,"marketplaceSource":{"sourceType":"git","source":"https://example.com/other.git"}}],"available":[]}',
		'{"installed":[{"pluginId":"ponytail@ponytail","installed":true,"enabled":true}],"available":[]}',
	]) {
		const unverified = setup({ tools: ["codex"], manifest, devCycle: { simplicity: "pt" } });
		const result = unverified.exec(["--with-global"], {
			STUB_CODEX_MARKETS: markets,
			STUB_CODEX_PLUGINS: plugins,
		});
		assert.equal(result.status, 2, result.stdout + result.stderr);
		assert.match(result.stdout, /출처 확인 안 됨/);
		assert.ok(!unverified.calls().some((line) => line.includes("marketplace upgrade") || line.includes("plugin add")));
	}
});

test("Codex 플러그인: 지원하지 않는 CLI는 안내만 하고, JSON·명령 실패와 출처 충돌은 --with-global에서 실패한다", () => {
	const manifest = CODEX_ONLY;
	const absent = setup({ tools: [], manifest, devCycle: { simplicity: "pt" } });
	assert.equal(absent.exec(["--with-global"]).status, 0);
	assert.match(absent.exec(["--with-global"]).stdout, /codex 없음/);
	const unsupported = setup({ tools: ["codex"], manifest, devCycle: { simplicity: "pt" } });
	const noSupport = unsupported.exec(["--with-global"], { STUB_CODEX_UNSUPPORTED: "1" });
	assert.equal(noSupport.status, 0, noSupport.stdout + noSupport.stderr);
	assert.match(noSupport.stdout, /지원하지 않음/);

	const malformed = setup({ tools: ["codex"], manifest, devCycle: { simplicity: "pt" } });
	const badJson = malformed.exec(["--with-global"], { STUB_CODEX_MARKETS: "{" });
	assert.equal(badJson.status, 2, badJson.stdout + badJson.stderr);
	assert.match(badJson.stdout, /Codex 플러그인.*JSON/);
	const nullJson = setup({ tools: ["codex"], manifest, devCycle: { simplicity: "pt" } });
	const nullResult = nullJson.exec(["--with-global"], { STUB_CODEX_MARKETS: "null" });
	assert.equal(nullResult.status, 2, nullResult.stdout + nullResult.stderr);
	assert.match(nullResult.stdout, /marketplaces 배열 없음/);
	const failed = setup({ tools: ["codex"], manifest, devCycle: { simplicity: "pt" } });
	const failedInstall = failed.exec(["--with-global"], { STUB_FAIL: "ponytail@ponytail" });
	assert.equal(failedInstall.status, 2, failedInstall.stdout + failedInstall.stderr);
	assert.match(failedInstall.stdout, /Codex 플러그인 ponytail@ponytail/);

	const conflict = setup({ tools: ["codex"], manifest, devCycle: { simplicity: "pt" } });
	const r = conflict.exec(["--with-global"], {
		STUB_CODEX_MARKETS: '{"marketplaces":[{"name":"ponytail","marketplaceSource":{"sourceType":"git","source":"https://example.com/other.git"}}]}',
	});
	assert.equal(r.status, 2, r.stdout + r.stderr);
	assert.match(r.stdout, /source mismatch/);
	assert.ok(!conflict.calls().some((line) => line.includes("marketplace add") || line.includes("plugin add")));
	const local = setup({ tools: ["codex"], manifest, devCycle: { simplicity: "pt" } });
	const localResult = local.exec(["--with-global"], {
		STUB_CODEX_MARKETS: '{"marketplaces":[{"name":"ponytail","marketplaceSource":{"sourceType":"local","source":"https://github.com/DietrichGebert/ponytail.git"}}]}',
	});
	assert.equal(localResult.status, 2, localResult.stdout + localResult.stderr);
	assert.match(localResult.stdout, /source mismatch/);
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

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const slotProject = (opts = {}) => setup({ manifest: { ...MANIFEST, ...SLOTS }, devCycle: {}, ...opts });

test("단일 선택 항목: 기록이 없으면 none이라 두뇌·과설계 방지 스킬을 설치하지 않고 상태 줄만 보인다", () => {
  const { root, exec, calls } = setup({ manifest: { ...MANIFEST, ...SLOTS } });
  const r = exec();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^두뇌: 없음\(기본 AI\)$/m);
  assert.match(r.stdout, /^과설계 방지: 없음\(기본 AI\)$/m);
  assert.match(r.stdout, /^mattpocock 추가: 없음/m);
  assert.ok(!calls().some((l) => /org\/(sp|pt|cv|matt)|sp@mk|pt@pt|om@om|^omx |^codex /.test(l)), calls().join("\n"));
  assert.deepEqual(Object.keys(readJson(join(root, ".claude/settings.json")).enabledPlugins), ["p1@mk", "p2@mk"]);
  assert.equal(existsSync(join(root, ".dev-cycle.json")), false, "인자가 없으면 기록하지 않는다");
  assert.equal(exec(["--check"]).status, 0);
});

test("--brain·--simplicity: 형식을 지켜 기록하고 고른 것만 설치하며, 다시 실행하면 받지 않는다", () => {
  const { root, exec, calls } = slotProject();
  const r = exec(["--brain", "sp", "--simplicity", "cv"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(readFileSync(join(root, ".dev-cycle.json"), "utf8"), devCycleText({ brain: "sp", simplicity: "cv" }), "키 값만 더하고 Biome 형식(탭, 한 줄 객체)을 지킨다");
  assert.ok(existsSync(join(root, ".agents/skills/sp-a/SKILL.md")));
  assert.equal(existsSync(join(root, ".claude/skills/sp-a")), false, "Codex 전용 스킬은 Claude에 연결하지 않는다");
  assert.ok(lstatSync(join(root, ".claude/skills/cv-b")).isSymbolicLink());
  assert.equal(existsSync(join(root, ".agents/skills/pt-a")), false);
  const s = readJson(join(root, ".claude/settings.json"));
  assert.equal(s.enabledPlugins["sp@mk"], true);
  assert.equal("pt@pt" in s.enabledPlugins, false);
  assert.ok(calls().includes("claude plugin install sp@mk --scope project"));
  assert.match(r.stdout, /^두뇌: sp\(설치됨\)$/m);
  assert.match(r.stdout, /^과설계 방지: cv\(설치됨\)$/m);

  const before = calls().length;
  assert.equal(exec().status, 0);
  assert.equal(calls().slice(before).filter((l) => l.startsWith("npx")).length, 0, "기록된 선택을 다시 받지 않는다");
  const check = exec(["--check"]);
  assert.equal(check.status, 0, check.stdout);
  assert.match(check.stdout, /^두뇌: sp\(설치됨\)$/m);
  rmSync(join(root, ".agents/skills/cv-a"), { recursive: true });
  const miss = exec(["--check"]);
  assert.equal(miss.status, 1, "고른 항목의 스킬이 빠지면 누락이다");
  assert.match(miss.stdout, /^과설계 방지: cv\(일부\)$/m);
});

test("바꾸기: 그 항목에서 고르지 않은 설치본을 skills-lock.json 출처로 찾아 지우고 플러그인은 끈다", () => {
  const { root, exec, calls } = slotProject();
  assert.equal(exec(["--brain", "sp", "--simplicity", "cv"]).status, 0);
  // 같은 이름이라도 다른 출처에서 받은 스킬은 그 후보의 설치본이 아니다.
  const lock = readJson(join(root, "skills-lock.json"));
  lock.skills.shared.source = "org/other";
  writeFileSync(join(root, "skills-lock.json"), JSON.stringify(lock));
  const before = calls().length;
  const r = exec(["--brain", "none", "--simplicity", "pt"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const c = calls().slice(before);
  assert.ok(c.includes("npx -y skills@1.7.0 remove --skill sp-a -y"), c.join("\n"));
  assert.ok(c.includes("npx -y skills@1.7.0 remove --skill cv-a cv-b -y"), c.join("\n"));
  assert.ok(c.includes("claude plugin uninstall sp@mk --scope project"));
  assert.ok(existsSync(join(root, ".agents/skills/shared/SKILL.md")), "출처가 다르면 지우지 않는다");
  assert.equal(existsSync(join(root, ".agents/skills/cv-a")), false);
  assert.ok(existsSync(join(root, ".agents/skills/pt-a/SKILL.md")));
  const s = readJson(join(root, ".claude/settings.json"));
  assert.equal(s.enabledPlugins["sp@mk"], false, "지운 플러그인은 false로 남겨 user scope 설치도 이 프로젝트에서 끈다");
  assert.equal(s.enabledPlugins["pt@pt"], true);
  assert.match(r.stdout, /^정리: sp\(플러그인 sp@mk, 스킬 sp-a\), cv\(스킬 cv-a, cv-b\)$/m);
  assert.match(r.stdout, /^Claude 플러그인\(project\): \.claude\/settings\.json 선언 추가 [^\n]*pt@pt, 끔 sp@mk, 설치 완료$/m, "끈 플러그인도 알린다");
  assert.equal(readFileSync(join(root, ".dev-cycle.json"), "utf8"), devCycleText({ brain: "none", simplicity: "pt" }));
  assert.equal(exec(["--check"]).status, 0);
});

// 프로젝트를 init하는 두뇌(openspec·spec-kit 모양). 도구 파일은 marker로 판정하고, 문서(keep)는 정리해도 남긴다.
const INIT_BRAINS = {
  ...SLOTS.brains,
  sp: { ...SLOTS.brains.sp, forces: true },
  om: { ...SLOTS.brains.om, forces: true },
  os: {
    description: "스펙",
    init: {
      run: "mkdir -p .agents/skills/os-propose specs && echo \"$OS_FLAG\" > .agents/skills/os-propose/SKILL.md && echo doc > specs/a.md",
      env: { OS_FLAG: "on" },
      marker: [".agents/skills/os-propose/SKILL.md"],
      remove: "rm -rf .agents/skills/os-*",
      keep: ["specs"],
    },
  },
  cli: {
    description: "CLI가 필요한 스펙",
    global: [{ name: "cli 도구", check: 'test -f "$HOME/cli"', install: "false", hint: "cli 설치 안내" }],
    init: { run: "mkdir -p cli && touch cli/m", marker: ["cli/m"], remove: "rm -rf cli" },
  },
};
const initProject = () => setup({ manifest: { ...MANIFEST, ...SLOTS, brains: INIT_BRAINS }, devCycle: {} });

test("두뇌 여럿: 쉼표로 고르면 배열로 기록하고 모두 설치하며, 상태 줄에 첫 값을 주 두뇌로 보인다", () => {
  const { root, exec, calls } = initProject();
  const r = exec(["--brain", "os,sp"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(readFileSync(join(root, ".dev-cycle.json"), "utf8"), /^\t"brain": \["os", "sp"\],$/m, "여럿이면 한 줄 배열로 쓴다");
  assert.equal(readFileSync(join(root, ".agents/skills/os-propose/SKILL.md"), "utf8"), "on\n", "init은 매니페스트의 env로 실행한다");
  assert.ok(existsSync(join(root, ".agents/skills/sp-a/SKILL.md")));
  assert.ok(calls().includes("claude plugin install sp@mk --scope project"));
  assert.match(r.stdout, /^os 프로젝트 설정: 완료$/m);
  assert.match(r.stdout, /^두뇌: os\(주, 설치됨\), sp\(설치됨\)$/m);
  const check = exec(["--check"]);
  assert.equal(check.status, 0, check.stdout);
  assert.match(check.stdout, /^두뇌: os\(주, 설치됨\), sp\(설치됨\)$/m, "배열 기록을 읽는다");
  assert.equal(exec().stdout.includes("os 프로젝트 설정"), false, "marker가 있으면 init을 다시 실행하지 않는다");
  rmSync(join(root, ".agents/skills/os-propose"), { recursive: true });
  const miss = exec(["--check"]);
  assert.equal(miss.status, 1, "고른 init 두뇌의 도구 파일이 없으면 누락이다");
  assert.match(miss.stdout, /두뇌 os 프로젝트 파일\(\.agents\/skills\/os-propose\/SKILL\.md\)/);
});

test("두뇌 빼기: 목록에서 뺀 init 두뇌는 도구 파일만 지우고 문서는 남기며, 하나가 남으면 문자열로 기록한다", () => {
  const { root, exec } = initProject();
  assert.equal(exec(["--brain", "os,sp"]).status, 0);
  const r = exec(["--brain", "sp"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(existsSync(join(root, ".agents/skills/os-propose")), false);
  assert.equal(readFileSync(join(root, "specs/a.md"), "utf8"), "doc\n", "두뇌가 만든 문서는 인계 자료로 남긴다");
  assert.match(r.stdout, /^정리: os\(도구 파일\)$/m);
  assert.match(r.stdout, /^남김: os의 문서 specs \(인계 자료\)$/m);
  assert.match(readFileSync(join(root, ".dev-cycle.json"), "utf8"), /^\t"brain": "sp",$/m);
  assert.equal(exec(["--check"]).status, 0);
  // 고르지 않은 init 두뇌의 도구 파일이 남아 있으면 --check가 충돌로 알린다.
  mkdirSync(join(root, ".agents/skills/os-propose"), { recursive: true });
  writeFileSync(join(root, ".agents/skills/os-propose/SKILL.md"), "#\n");
  const check = exec(["--check"]);
  assert.equal(check.status, 1);
  assert.match(check.stdout, /고르지 않은 설치본: os\(도구 파일\)/);
});

test("두뇌 여럿: none을 섞거나 빈 이름이면 exit 2, 진행 순서를 강제하는 두뇌가 둘이면 경고한다", () => {
  const { root, exec } = initProject();
  for (const v of ["none,sp", "sp,", ",", "sp,xx"]) {
    const r = exec(["--brain", v]);
    assert.equal(r.status, 2, `${v}: ${r.stdout}`);
    assert.match(r.stderr, /사용법: --brain <이름>\[,<이름>\]/);
  }
  assert.equal(readFileSync(join(root, ".dev-cycle.json"), "utf8"), devCycleText({}), "잘못된 인자는 기록하지 않는다");
  const r = exec(["--brain", "sp,om"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^경고: 진행 순서를 강제하는 두뇌 sp, om를 함께 골랐다/m);
  assert.doesNotMatch(exec(["--brain", "os,sp"]).stdout, /경고: 진행 순서/, "강제하는 두뇌가 하나면 경고하지 않는다");
});

test("init 두뇌: 필요한 전역 도구를 설치하지 못하면 init을 실행하지 않고 안내하며, init이 실패하면 exit 2", () => {
  const { root, exec } = initProject();
  const r = exec(["--brain", "cli"]);
  assert.equal(r.status, 2, "고른 두뇌의 전역 도구 설치 실패는 실패다");
  assert.match(r.stdout, /^cli 프로젝트 설정: cli 도구 없음 → cli 설치 안내$/m);
  assert.equal(existsSync(join(root, "cli")), false);
  const manifest = { ...MANIFEST, ...SLOTS, brains: { ...INIT_BRAINS, os: { ...INIT_BRAINS.os, init: { ...INIT_BRAINS.os.init, run: "exit 3" } } } };
  writeFileSync(join(root, "skills.manifest.json"), JSON.stringify(manifest));
  const f = exec(["--brain", "os"]);
  assert.equal(f.status, 2);
  assert.match(f.stdout, /^os 프로젝트 설정: 실패$/m);
  assert.match(f.stdout, /^실패: .*os 프로젝트 설정/m);
});

test("init 두뇌 정리: remove가 성공해도 marker가 남으면 실패로 알리고, 손으로 고친 중복 기록은 한 번만 센다", () => {
  const { root, exec } = initProject();
  assert.equal(exec(["--brain", "os"]).status, 0);
  const manifest = { ...MANIFEST, ...SLOTS, brains: { ...INIT_BRAINS, os: { ...INIT_BRAINS.os, init: { ...INIT_BRAINS.os.init, remove: "true" } } } };
  writeFileSync(join(root, "skills.manifest.json"), JSON.stringify(manifest));
  const r = exec(["--brain", "none"]);
  assert.equal(r.status, 2, r.stdout);
  assert.match(r.stdout, /^실패: [^\n]*정리 os \(남음: \.agents\/skills\/os-propose\/SKILL\.md\)/m);
  writeFileSync(join(root, ".dev-cycle.json"), devCycleText({}).replace("{\n", '{\n\t"brain": ["os", "os"],\n'));
  const check = exec(["--check"]);
  assert.match(check.stdout, /^두뇌: os\(설치됨\)$/m, "중복은 한 번만 보이고 주 두뇌 표시도 없다");
});

test("옛 구성: 기록이 없는 프로젝트의 남은 설치본은 --check가 충돌(exit 1)로 알리고, 인자로 같은 값을 줘도 정리한다", () => {
  const settings = { enabledPlugins: { "p1@mk": true, "p2@mk": true, "sp@mk": true, "om@om": true, "pt@pt": true }, extraKnownMarketplaces: { om: { source: { source: "git", url: "https://example.com/om.git" } } } };
  const { root, exec, calls } = slotProject({ settings });
  exec(["--matt", "m-a"]);
  const lock = readJson(join(root, "skills-lock.json"));
  for (const [s, source] of [["sp-a", "org/sp"], ["pt-a", "org/pt"]]) {
    mkdirSync(join(root, ".agents/skills", s), { recursive: true });
    writeFileSync(join(root, ".agents/skills", s, "SKILL.md"), "#\n");
    lock.skills[s] = { source, sourceType: "github", skillPath: `skills/${s}/SKILL.md` };
  }
  writeFileSync(join(root, "skills-lock.json"), JSON.stringify(lock));
  mkdirSync(join(root, ".omx/plans"), { recursive: true });
  writeFileSync(join(root, ".omx/setup-scope.json"), "{}");
  writeFileSync(join(root, ".omx/plans/p.md"), "#\n");
  const snap = () => [".claude/settings.json", ".dev-cycle.json", "skills-lock.json"].map((f) => readFileSync(join(root, f), "utf8"));
  const before = snap();

  const check = exec(["--check"]);
  assert.equal(check.status, 1, check.stdout);
  assert.match(check.stdout, /^두뇌: 없음\(기본 AI\), 고르지 않은 설치본: sp\(플러그인 sp@mk, 스킬 sp-a\), om\(플러그인 om@om, OMX 설정\) → pnpm skills:setup --brain <이름\|none>으로 고르면 정리된다\(기록: none\)$/m);
  assert.match(check.stdout, /^과설계 방지: 없음\(기본 AI\), 고르지 않은 설치본: pt\(플러그인 pt@pt, 스킬 pt-a\) → pnpm skills:setup --simplicity <이름\|none>으로 고르면 정리된다\(기록: none\)$/m);
  assert.deepEqual(snap(), before, "--check는 파일을 쓰지 않는다");

  const plain = exec();
  assert.equal(plain.status, 0, "인자가 없으면 지우지 않고 알리기만 한다");
  assert.ok(existsSync(join(root, ".agents/skills/sp-a")));

  const n = calls().length;
  const r = exec(["--brain", "none", "--simplicity", "pt"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(calls().slice(n).includes("npx -y skills@1.7.0 remove --skill sp-a -y"));
  assert.ok(calls().slice(n).includes("omx uninstall --scope project"), "범위를 명시하고(없으면 user 범위가 대상이 될 수 있다) --purge는 주지 않는다");
  assert.equal(existsSync(join(root, ".omx/setup-scope.json")), false, "OMX 기록이 있으면 OMX 프로젝트 설정을 지운다");
  assert.ok(existsSync(join(root, ".omx/plans/p.md")), "OMX 작업 기록(.omx/plans 등)은 남긴다");
  assert.ok(existsSync(join(root, ".agents/skills/pt-a")), "고른 것은 남긴다");
  assert.ok(existsSync(join(root, ".agents/skills/m-a")), "추가 스킬은 정리하지 않는다");
  const s = readJson(join(root, ".claude/settings.json"));
  assert.deepEqual([s.enabledPlugins["sp@mk"], s.enabledPlugins["om@om"], s.enabledPlugins["pt@pt"]], [false, false, true]);
  assert.equal("om" in s.extraKnownMarketplaces, false, "고르지 않은 후보만 쓰는 마켓플레이스 선언은 뺀다");
  assert.ok("mk" in s.extraKnownMarketplaces, "기본 플러그인과 함께 쓰는 마켓플레이스는 남긴다");
  assert.equal(exec(["--check"]).status, 0);
});

test("전역 설치본: 이 프로젝트에서 고르지 않은 user 플러그인·같은 일을 하는 플러그인·gstack 개인 스킬은 settings.local.json으로 끄고, 고르면 그 항목을 지운다", () => {
  const manifest = { ...MANIFEST, ...SLOTS, skills: [], claude: { marketplaces: {}, plugins: [], conflicts: { "fd@x": "기본 스킬과 같은 일" } } };
  const { root, home, exec } = setup({ manifest, devCycle: {} });
  mkdirSync(join(home, ".claude/skills/gstack/plan"), { recursive: true });
  writeFileSync(join(home, ".claude/skills/gstack/SKILL.md"), "#\n");
  writeFileSync(join(home, ".claude/skills/gstack/plan/SKILL.md"), "#\n");
  mkdirSync(join(home, ".claude/skills/plan"));
  symlinkSync(join(home, ".claude/skills/gstack/plan/SKILL.md"), join(home, ".claude/skills/plan/SKILL.md"));
  mkdirSync(join(home, ".claude/skills/mine"));
  writeFileSync(join(home, ".claude/skills/mine/SKILL.md"), "#\n");
  writeFileSync(join(home, ".claude/settings.json"), JSON.stringify({ enabledPlugins: { "sp@mk": true, "pt@pt": true, "fd@x": true, "other@y": true, "om@om": false } }));
  writeFileSync(join(home, ".claude/CLAUDE.md"), "<!-- OMC:START -->\n");
  const local = join(root, ".claude/settings.local.json");

  const check = exec(["--check"]);
  assert.equal(check.status, 0, "전역 설치본은 exit 코드에 넣지 않는다");
  assert.match(check.stdout, /^전역: 이 프로젝트에서 끌 것 sp@mk, pt@pt, fd@x, 개인 스킬 gstack, plan → pnpm skills:setup$/m);
  assert.match(check.stdout, /^전역 경고: om\(~\/\.claude\/CLAUDE\.md\)/m);
  assert.equal(existsSync(local), false, "--check는 쓰지 않는다");

  mkdirSync(join(root, ".claude"), { recursive: true });
  writeFileSync(local, JSON.stringify({ permissions: { allow: ["x"] }, enabledPlugins: { "pt@pt": true } }));
  const r = exec();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  let l = readJson(local);
  assert.deepEqual(l.permissions, { allow: ["x"] }, "다른 키는 그대로 둔다");
  assert.deepEqual(l.enabledPlugins, { "pt@pt": true, "sp@mk": false, "fd@x": false }, "사용자가 local에 직접 켠 값은 두고, 켜진 것만 끈다");
  assert.deepEqual(l.skillOverrides, { gstack: "off", plan: "off" }, "gstack을 가리키는 개인 스킬만 끈다");
  assert.match(r.stdout, /^전역: 이 프로젝트에서 끔 sp@mk, fd@x, 개인 스킬 gstack, plan \(\.claude\/settings\.local\.json\)$/m);

  assert.equal(exec(["--brain", "sp"]).status, 0);
  l = readJson(local);
  assert.equal("sp@mk" in l.enabledPlugins, false, "고른 플러그인의 끄기 항목은 지운다(local이 project보다 우선이다)");
  assert.equal(readJson(join(root, ".claude/settings.json")).enabledPlugins["sp@mk"], true);
  assert.equal(exec(["--brain", "gs"]).status, 0);
  l = readJson(local);
  assert.equal(l.skillOverrides, undefined, "gstack을 고르면 개인 스킬 끄기 항목을 지운다");
  assert.equal(l.enabledPlugins["sp@mk"], false, "다시 고르지 않은 것이 되면 끈다");
});

test("adopt: 하네스만 설치한 프로젝트는 Better-T-Stack 전용 스킬(stack)을 받지 않고 --check도 빠짐으로 보지 않는다", () => {
  const manifest = { ...MANIFEST, skills: [...MANIFEST.skills, { agents: ["claude-code", "codex"], source: "org/bts", skills: ["bts-auth"], stack: true }] };
  const { root, exec, calls } = setup({ manifest });
  writeFileSync(join(root, ".dev-cycle.json"), '{\n\t"adopt": true,\n\t"todoPath": "tasks/todo.md"\n}\n');
  const r = exec();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(!calls().some((l) => l.includes("org/bts")), calls().join("\n"));
  assert.equal(existsSync(join(root, ".agents/skills/bts-auth")), false);
  assert.equal(exec(["--check"]).status, 0);
  writeFileSync(join(root, ".dev-cycle.json"), '{\n\t"todoPath": "tasks/todo.md"\n}\n');
  assert.equal(exec(["--check"]).status, 1, "adopt가 아니면 stack 스킬도 기본 설치다");
});

test("--drop: 추가 스킬과 선택 묶음을 출처가 맞는 설치본만 지우고, 필수·기본 스킬과 모르는 이름은 받지 않는다", () => {
  const manifest = { ...MANIFEST, ...SLOTS, optional: { look: { description: "보조", skills: [{ agents: ["claude-code", "codex"], source: "org/look", skills: ["look-a"] }] } } };
  const { root, exec, calls } = setup({ manifest, devCycle: {} });
  assert.equal(exec(["--matt", "m-a,m-b", "--optional", "look"]).status, 0);
  // m-b는 다른 출처에서 받은 같은 이름이라 지우지 않는다.
  const lock = readJson(join(root, "skills-lock.json"));
  lock.skills["m-b"].source = "org/other";
  writeFileSync(join(root, "skills-lock.json"), JSON.stringify(lock));
  const before = calls().length;
  const r = exec(["--drop", "m-a,m-b,look"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const c = calls().slice(before);
  assert.ok(c.includes("npx -y skills@1.7.0 remove --skill m-a -y"), c.join("\n"));
  assert.ok(c.includes("npx -y skills@1.7.0 remove --skill look-a -y"), c.join("\n"));
  assert.equal(existsSync(join(root, ".agents/skills/m-a")), false);
  assert.ok(existsSync(join(root, ".agents/skills/m-b/SKILL.md")), "출처가 다르면 지우지 않는다");
  assert.match(r.stdout, /^제거: m-a\(스킬 m-a\), look\(스킬 look-a\)$/m);
  assert.match(r.stdout, /^제거할 것 없음: m-b /m);
  assert.match(r.stdout, /^mattpocock 추가: m-b /m);
  for (const bad of ["dom-a", "nope", "m-a --matt m-a"]) {
    const x = exec(["--drop", ...bad.split(" ")]);
    assert.equal(x.status, 2, bad);
  }
  assert.match(exec(["--drop", "m-b", "--check"]).stderr, /--drop은 --check와 함께 쓰지 않는다/);
});

test("--matt: pool에서 고른 추가 스킬만 설치하고 상태 줄에 보이며, 모르는 스킬은 exit 2", () => {
  const { root, exec, calls } = slotProject();
  const r = exec(["--matt", "m-a"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(calls().includes("npx -y skills@1.7.0 add org/matt --skill m-a --agent claude-code codex -y"));
  assert.match(r.stdout, /^mattpocock 추가: m-a /m);
  assert.equal(existsSync(join(root, ".agents/skills/m-b")), false);
  assert.equal(exec(["--check"]).status, 0, "추가 스킬은 기록하지 않으므로 인자 없는 --check가 요구하지 않는다");
  const n = calls().length;
  for (const bad of [["--matt", "nope"], ["--matt"], ["--matt", "m-a,grill-me"]]) {
    const u = exec(bad);
    assert.equal(u.status, 2, bad.join(" "));
    assert.match(u.stderr, /추가 스킬: m-a, m-b/);
    assert.match(u.stderr, /brains\/README\.md/);
  }
  assert.equal(calls().length, n, "모르는 스킬이면 아무것도 하지 않는다");
});

test("모르는 두뇌·과설계 방지 이름이나 기록할 .dev-cycle.json이 없으면 exit 2이고 아무것도 하지 않는다", () => {
  const { root, exec, calls } = slotProject();
  for (const bad of [["--brain", "nope"], ["--brain"], ["--simplicity", "sp"]]) {
    const u = exec(bad);
    assert.equal(u.status, 2, bad.join(" "));
    assert.match(u.stderr, /두뇌: none\(기본 AI\), sp\(규율\), om\(자동\), gs\(제품\)|과설계 방지: none\(기본 AI\), pt\(미니멀\), cv\(간결\)/);
  }
  rmSync(join(root, ".dev-cycle.json"));
  const missing = exec(["--brain", "sp"]);
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /\.dev-cycle\.json/);
  assert.deepEqual(calls(), []);
  assert.equal(existsSync(join(root, ".claude/settings.json")), false);
});

test("모르는 인자: --help는 사용법만 보이고, 오타나 값 없는 이름은 exit 2로 멈춰 기본 설치를 돌리지 않는다", () => {
  const { root, exec, calls } = slotProject();
  const help = exec(["--help"]);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /^사용법: pnpm skills:setup \[--check\]/m);
  const twice = exec(["--optional", "ops", "--optional", "motion"]);
  assert.equal(twice.status, 2);
  assert.match(twice.stderr, /--optional는 한 번만 쓰고 여러 값은 쉼표로 잇는다/);
  for (const bad of [["--chek"], ["openspec"], ["--brain", "sp", "--force"], ["-y"]]) {
    const r = exec(bad);
    assert.equal(r.status, 2, bad.join(" "));
    assert.match(r.stderr, /^모르는 인자: /m, bad.join(" "));
  }
  assert.deepEqual(calls(), [], "아무것도 설치하지 않는다");
  assert.equal(existsSync(join(root, ".claude/settings.json")), false);
  assert.equal(exec(["--", "--check"]).status === 2, false, "pnpm이 넘긴 --는 받는다");
});

test("잘못된 인자와 깨진 파일: --brain=값은 exit 2, 깨진 개인 설정은 덮어쓰지 않고 건너뛰며, 깨진 skills-lock.json은 알린다", () => {
  const { root, home, exec, calls } = slotProject();
  const eq = exec(["--brain=sp"]);
  assert.equal(eq.status, 2);
  assert.match(eq.stderr, /--brain sp처럼 = 없이/);
  assert.deepEqual(calls(), []);
  writeFileSync(join(root, ".dev-cycle.json"), devCycleText({ brain: "constructor" }));
  assert.match(exec(["--check"]).stdout, /^두뇌: constructor\(매니페스트에 없음\)/m);
  writeFileSync(join(root, ".dev-cycle.json"), devCycleText());

  mkdirSync(join(home, ".claude"), { recursive: true });
  writeFileSync(join(home, ".claude/settings.json"), "{ broken");
  const r = exec();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^전역 경고: 개인 설정을 읽지 못해 건너뜀: .*\.claude\/settings\.json/m);
  assert.match(r.stdout, /^전역 도구:/m, "요약은 끝까지 보인다");
  writeFileSync(join(home, ".claude/settings.json"), "{}");
  mkdirSync(join(root, ".claude"), { recursive: true });
  writeFileSync(join(root, ".claude/settings.local.json"), "{ mine");
  assert.match(exec().stdout, /^전역 경고: 개인 설정을 읽지 못해 건너뜀: .*settings\.local\.json/m);
  assert.equal(readFileSync(join(root, ".claude/settings.local.json"), "utf8"), "{ mine", "깨진 개인 설정은 덮어쓰지 않는다");

  writeFileSync(join(root, "skills-lock.json"), "{ broken");
  const chk = exec(["--check"]);
  assert.equal(chk.status, 1);
  assert.match(chk.stdout, /누락: .*skills-lock\.json 읽기/);
});

test("oh-my: 고르면 OMX 프로젝트 설정을 하고 OMX CLI는 --brain을 명시했을 때만 전역 설치한다", () => {
  const { root, home, exec, calls } = slotProject({ tools: ["npx", "claude", "omx"] });
  writeFileSync(join(root, ".dev-cycle.json"), devCycleText({ brain: "gs" }));
  const plain = exec();
  assert.equal(plain.status, 0, plain.stdout + plain.stderr);
  assert.equal(existsSync(join(home, "gs")), false, "기록만으로는 두뇌 전역 항목을 설치하지 않는다");
  assert.match(plain.stdout, /gs 없음 → mkdir/);
  assert.match(plain.stdout, /^두뇌: gs\(없음\)/m, "전역 항목이 없으면 설치됨으로 보이지 않는다");
  const chk = exec(["--check"]);
  assert.equal(chk.status, 1, "고른 두뇌의 전역 항목이 없으면 누락이다");
  assert.match(chk.stdout, /누락: .*전역 gs/);
  assert.equal(exec(["--brain", "gs"]).status, 0);
  assert.ok(existsSync(join(home, "gs")), "--brain을 명시하면 설치한다");

  const r = exec(["--brain", "om"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(calls().includes("omx setup --scope project --no-merge-agents"));
  assert.ok(existsSync(join(root, ".omx/setup-scope.json")));
  assert.equal(readJson(join(root, ".claude/settings.json")).enabledPlugins["om@om"], true);
  assert.equal(exec(["--check"]).status, 0, "codex가 없는 기기는 OMX CLI를 누락으로 세지 않는다");
  assert.equal(exec(["--brain", "none"]).status, 0);
  assert.equal(existsSync(join(root, ".omx/setup-scope.json")), false);
  assert.equal(existsSync(join(root, ".codex/.omx")), false, "uninstall이 남기는 OMX 장부도 지운다");
});

test("oh-my 정리: omx가 없으면 지우지 못한다고 실패로 알린다", () => {
  const { root, exec } = slotProject({ tools: ["npx", "claude"], settings: { enabledPlugins: { "om@om": true } } });
  mkdirSync(join(root, ".omx"), { recursive: true });
  writeFileSync(join(root, ".omx/setup-scope.json"), "{}");
  const r = exec(["--brain", "none"]);
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /실패: .*OMX 정리: omx 없음/);
  assert.ok(existsSync(join(root, ".omx/setup-scope.json")));
});

test("Codex 네이티브 플러그인: 과설계 방지를 고르지 않았으면 조회하지 않는다", () => {
  const { exec, calls } = setup({ tools: ["codex"], manifest: CODEX_ONLY });
  const r = exec(["--with-global"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, /Codex 플러그인/);
  assert.deepEqual(calls(), []);
});

test("템플릿 매니페스트: 이름 중복 없음, 기본·선택 항목과 두뇌·과설계 방지 카탈로그가 맞다", () => {
  const m = JSON.parse(readFileSync(join(TEMPLATE_FILES, "skills.manifest.json"), "utf8"));
  const optional = Object.values(m.optional).flatMap((o) => o.skills);
  const names = [...m.skills, ...optional].flatMap((e) => e.skills).concat(m.mattpocock.pool);
  assert.equal(new Set(names).size, names.length, "기본, 선택 묶음, mattpocock 추가에 같은 스킬이 두 번 있으면 안 된다");
  const slotItems = [...Object.values(m.brains), ...Object.values(m.simplicity)];
  const slotEntries = slotItems.flatMap((i) => i.skills ?? []);
  for (const e of [...m.skills, ...optional, ...slotEntries, m.mattpocock]) {
    assert.ok(e.agents.length && e.agents.every((a) => ["claude-code", "codex"].includes(a)), e.source);
    // skills:update는 GitHub owner/repo 형식만 확인한다(ref, URL, 하위 경로는 지원하지 않는다)
    assert.match(e.source, /^[\w.-]+\/[\w.-]+$/, e.source);
  }
  for (const s of slotEntries.flatMap((e) => e.skills)) assert.ok(!names.includes(s), `${s}: 두뇌·과설계 방지 후보가 기본 설치와 같은 이름을 쓰면 정리할 때 헷갈린다`);
  for (const [k, o] of Object.entries(m.optional)) assert.ok(/^[a-z][a-z-]*$/.test(k) && o.description && o.skills.length, k);
  assert.deepEqual(Object.keys(m.optional), ["ops", "motion", "mobile", "i-have-adhd", "taste"]);
  // 하나만 고르는 두 항목. 기본 설치(skills, claude)에는 두뇌와 과설계 방지 스킬을 두지 않는다(기본은 none).
  assert.deepEqual(Object.keys(m.brains), ["superpowers", "agent-skills", "pstack", "gstack", "oh-my", "mattpocock", "openspec", "spec-kit", "compound-engineering"]);
  assert.deepEqual(Object.keys(m.simplicity), ["ponytail", "caveman", "karpathy"]);
  for (const i of slotItems) assert.ok(i.description && (i.skills || i.claude || i.global || i.init || i === m.brains.mattpocock), JSON.stringify(i));
  // 세션 시작 훅·전역 지시로 진행 순서를 강제하는 두뇌. 둘 이상 고르면 설치기가 경고한다.
  assert.deepEqual(Object.keys(m.brains).filter((n) => m.brains[n].forces), ["superpowers", "gstack", "oh-my"]);
  // init 두뇌: 도구 파일(marker)만 지우고 두뇌가 만든 문서(keep)는 남긴다. remove는 프로젝트 안의 그 두뇌 이름 파일만 지운다.
  // 지우는 경로는 이 목록 그대로다(그 도구가 만든 이름만). 넓히려면 실제 생성 파일을 확인하고 여기도 고친다.
  const REMOVE = {
    openspec: [".claude/skills/openspec-*", ".agents/skills/openspec-*", ".agents/skills/.openspec-target", ".claude/commands/opsx", ".agents/workflows/opsx-*.md"],
    "spec-kit": [".claude/skills/speckit-*", ".agents/skills/speckit-*", ".specify/scripts", ".specify/templates", ".specify/workflows", ".specify/integrations", ".specify/integration.json", ".specify/init-options.json", ".specify/.gitignore"],
  };
  for (const n of ["openspec", "spec-kit"]) {
    const { init } = m.brains[n];
    assert.ok(init.run && init.marker.length && init.keep.length, n);
    for (const p of [...init.marker, ...init.keep]) assert.ok(!p.startsWith("/") && !p.includes(".."), `${n}: ${p}`);
    assert.equal(init.remove, `rm -rf ${REMOVE[n].join(" ")}`, n);
    for (const k of init.keep) assert.ok(!REMOVE[n].some((p) => p === k || p.startsWith(`${k}/`)), `${n}: ${k}는 지우지 않는다`);
    for (const p of init.marker) assert.ok(REMOVE[n].some((r) => new RegExp(`^${r.replace(/[.]/g, "\\.").replace(/\*/g, "[^/]*")}(/|$)`).test(p)), `${n}: 정리하면 marker ${p}도 지워져야 한다`);
  }
  // OpenSpec 스킬은 실행 중에 openspec CLI를 부른다. 그 두뇌를 고를 때만 전역에 설치하고 사용 통계는 끈다.
  assert.deepEqual(m.brains.openspec.global.map((g) => g.name), ["OpenSpec CLI"]);
  assert.equal(m.brains.openspec.init.env.OPENSPEC_TELEMETRY, "0");
  assert.match(m.brains["spec-kit"].init.run, /--integration-options='--events false'.*integration install codex --integration-options='--events false'/, "Spec Kit이 .claude/settings.json에 훅을 쓰지 않게 한다");
  // Compound Engineering: Claude는 project 플러그인, Codex는 skills CLI(전역 플러그인을 쓰지 않는다). 커밋·PR·자동 실행 스킬은 받지 않는다.
  const ce = m.brains["compound-engineering"];
  assert.deepEqual(ce.claude.plugins, ["compound-engineering@compound-engineering-plugin"]);
  assert.equal(ce.codex, undefined);
  for (const s of ["ce-commit", "ce-commit-push-pr", "ce-babysit-pr", "ce-resolve-pr-feedback", "ce-worktree", "ce-setup", "lfg"]) assert.ok(!ce.skills[0].skills.includes(s), s);
  // mattpocock 두뇌는 따로 설치하는 것이 없다(필수 3개 + --matt 추가 스킬). 다른 두뇌로 바꿔도 추가 스킬을 지우지 않는다.
  assert.deepEqual(Object.keys(m.brains.mattpocock), ["description", "hosts"]);
  for (const s of ["brainstorming", "test-driven-development", "ponytail", "ponytail-review"]) assert.ok(!names.includes(s), `${s}는 기본 설치가 아니다`);
  assert.deepEqual(m.claude.plugins, ["skill-creator@claude-plugins-official"]);
  assert.deepEqual(Object.keys(m.claude.marketplaces), ["claude-plugins-official"]);
  // 새 사용자 설정에는 claude-plugins-official도 등록되어 있지 않다(2026-09-27 실측). 고른 항목의 마켓플레이스도 선언한다.
  assert.deepEqual(m.claude.marketplaces["claude-plugins-official"], { source: "github", repo: "anthropics/claude-plugins-official" });
  assert.deepEqual(Object.keys(m.claude.conflicts), ["frontend-design@claude-plugins-official"], "impeccable과 같은 일을 하는 전역 플러그인은 이 프로젝트에서 끈다");
  assert.equal(m.codex, undefined);
  assert.equal(m.omx, undefined);
  assert.deepEqual(m.brains.superpowers.claude.plugins, ["superpowers@claude-plugins-official"]);
  assert.deepEqual(m.brains["oh-my"].claude.marketplaces.omc, { source: "git", url: "https://github.com/Yeachan-Heo/oh-my-claudecode.git" });
  assert.deepEqual(m.brains["oh-my"].omx, ["setup", "--scope", "project", "--no-merge-agents"]);
  assert.deepEqual(m.brains.pstack.hosts, { "claude-code": "full", codex: "none" });
  assert.deepEqual(m.simplicity.ponytail.claude, { marketplaces: { ponytail: { source: "github", repo: "DietrichGebert/ponytail" } }, plugins: ["ponytail@ponytail"] });
  assert.deepEqual(m.simplicity.ponytail.codex, {
    marketplace: { name: "ponytail", source: "DietrichGebert/ponytail" },
    plugins: ["ponytail@ponytail"],
  });
  assert.deepEqual(m.simplicity.ponytail.skills[0].skills, ["ponytail", "ponytail-review", "ponytail-audit", "ponytail-debt", "ponytail-help", "ponytail-gain"]);
  // 용어·설계 질문의 필수 세 개는 기본 설치이고, grill-me 같은 제외 스킬은 추가 스킬로도 받지 않는다.
  assert.ok(m.skills.some((e) => e.source === "mattpocock/skills" && ["domain-modeling", "grilling", "grill-with-docs"].every((s) => e.skills.includes(s))));
  assert.equal(m.mattpocock.pool.length, 14);
  for (const s of ["grill-me", "to-spec", "implement", "ask-matt"]) assert.ok(!m.mattpocock.pool.includes(s), s);
  // 두뇌 전역 도구는 그 두뇌를 고를 때만 본다. 무조건 전역 목록에는 두지 않는다.
  assert.deepEqual(m.brains.gstack.global.map((g) => g.name), ["gstack(Claude)", "gstack(Codex)"]);
  assert.deepEqual(m.brains["oh-my"].global.map((g) => [g.name, g.tool]), [["OMX CLI", "codex"]]);
  for (const g of [...m.global, ...slotItems.flatMap((i) => i.global ?? [])]) assert.ok(g.name && g.check && (g.install || g.hint), JSON.stringify(g));
  assert.ok(!m.global.some((g) => /OMX|gstack/.test(g.name)));
  // ego lite는 macOS 전용이라 다른 OS와 CI에서는 agent-browser가 유일한 브라우저 도구다. 기본 설치한다.
  assert.deepEqual(m.global.filter((g) => g.auto).map((g) => g.name), ["agent-browser CLI(npm 최신판)"]);
  // 새 프로젝트는 설치할 때의 최신판을 받는다. 템플릿에 버전을 고정하지 않는다.
  assert.equal(m.skillsCli, "skills@latest");
  assert.doesNotMatch(JSON.stringify(m.global), /@\d+\.\d+\.\d+/);
});

// --update (pnpm skills:update)
const { changedFiles, recordChoices, remoteSkill, update } = await import(SCRIPT);
const blob = (c) => createHash("sha1").update(`blob ${Buffer.byteLength(c)}\0`).update(c).digest("hex");
const HOUR = 3_600_000;
const NEXT = " → 라운드를 열기 전에 prokit-skills-update 스킬 1절을 따른다";

test("recordChoices: 최상위 키만 바꾸고, 다른 값(같은 이름의 하위 키)이 바뀌게 되면 쓰지 않는다", () => {
  const root = mkdtempSync(join(tmpdir(), "record-"));
  const p = join(root, ".dev-cycle.json");
  writeFileSync(p, devCycleText({ simplicity: "pt" }));
  recordChoices(root, { brain: "sp", simplicity: "none" });
  assert.equal(readFileSync(p, "utf8"), devCycleText({ brain: "sp", simplicity: "none" }));
  const nested = '{\n\t"resources": { "brain": "x" },\n\t"brain": "none"\n}\n';
  writeFileSync(p, nested);
  assert.throws(() => recordChoices(root, { brain: "sp" }), /brain/);
  assert.equal(readFileSync(p, "utf8"), nested);
  // 두뇌 여럿은 배열이다. 배열 기록도 다시 문자열이나 다른 배열로 바꿀 수 있어야 한다(키가 두 번 생기지 않게).
  writeFileSync(p, devCycleText({ brain: "sp", simplicity: "pt" }));
  recordChoices(root, { brain: ["os", "sp"] });
  assert.match(readFileSync(p, "utf8"), /^\{\n\t"brain": \["os", "sp"\],\n\t"simplicity": "pt",/);
  recordChoices(root, { brain: ["sp", "om", "gs"] });
  recordChoices(root, { brain: "os" });
  assert.equal(readFileSync(p, "utf8"), devCycleText({ brain: "os", simplicity: "pt" }));
});

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
  const { root, calls, added, run } = updateProject();
  // lock 항목 없이 이름만 같은 사용자 스킬은 선택 묶음 설치본으로 보지 않는다(업데이트하면 덮어쓴다).
  mkdirSync(join(root, ".agents/skills/op-a"), { recursive: true });
  writeFileSync(join(root, ".agents/skills/op-a/SKILL.md"), "mine");
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
