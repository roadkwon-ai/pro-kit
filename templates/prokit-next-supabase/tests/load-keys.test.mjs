import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { TEMPLATE_FILES } from "./helpers.mjs";

const SCRIPT = join(TEMPLATE_FILES, "scripts/load-keys.mjs");
const { exportLines, missingKeys, parseValue } = await import(SCRIPT);

// 작업 폴더/.env, 작업 폴더/project/.env
function workspace(projectEnv, workspaceEnv) {
  const ws = mkdtempSync(join(tmpdir(), "load-keys-"));
  const project = join(ws, "project");
  mkdirSync(project);
  if (workspaceEnv !== undefined) writeFileSync(join(ws, ".env"), workspaceEnv);
  if (projectEnv !== undefined) writeFileSync(join(project, ".env"), projectEnv);
  return project;
}
const run = (args, env) => spawnSync(process.execPath, [SCRIPT, ...args], { env: { PATH: process.env.PATH, ...env }, encoding: "utf8" });

test(".env 값: 따옴표 안만 읽고, 따옴표 없는 값은 줄 끝 주석을 뗀다", () => {
  assert.equal(parseValue("sk-abc # my key"), "sk-abc");
  assert.equal(parseValue('"ghp_x" # c'), "ghp_x");
  assert.equal(parseValue("'a#b'"), "a#b");
  assert.equal(parseValue("a#b"), "a#b");
  assert.equal(parseValue('"sk-proj\'quote"'), "sk-proj'quote");
});

test("셸에 없는 이름만, 프로젝트 .env → 작업 폴더 .env 순서로 찾는다", () => {
  const project = workspace(
    "OPENAI_API_KEY=\"sk-proj'quote\"\nGH_TOKEN=\n",
    "# 주석\nexport OPENAI_API_KEY=sk-workspace\nGH_TOKEN='ghp_workspace' # 배포용\nVERCEL_TOKEN=vcp_workspace\nOTHER=x\n",
  );
  assert.deepEqual(missingKeys(project, { VERCEL_TOKEN: "from-shell" }), [
    ["OPENAI_API_KEY", "sk-proj'quote"],
    ["GH_TOKEN", "ghp_workspace"],
  ]);
  assert.deepEqual(missingKeys(workspace(), {}), []);
});

test("훅 줄은 OPENAI_API_KEY만 셸에 안전하게 쓴다(배포 토큰은 세션 환경에 넣지 않는다)", () => {
  const project = workspace("OPENAI_API_KEY=\"sk-proj'quote\"\n", "GH_TOKEN=ghp_ws\nVERCEL_TOKEN=vcp_ws\n");
  const lines = exportLines(project, {});
  assert.deepEqual(lines, ["export OPENAI_API_KEY='sk-proj'\\''quote'"]);
  const shell = spawnSync("bash", ["-c", `${lines[0]}; printf %s "$OPENAI_API_KEY"`], { encoding: "utf8" });
  assert.equal(shell.stdout, "sk-proj'quote");
});

test("훅: CLAUDE_ENV_FILE에 export 줄을 덧붙이고 아무것도 출력하지 않는다. 변수가 없으면 할 일이 없다", () => {
  const project = workspace(undefined, "OPENAI_API_KEY=sk-workspace-123\nGH_TOKEN=ghp_ws_123\n");
  const envFile = join(project, "..", "claude-env");
  writeFileSync(envFile, "export A=1\n");
  const r = run([], { CLAUDE_PROJECT_DIR: project, CLAUDE_ENV_FILE: envFile });
  assert.equal(r.status, 0);
  assert.equal(`${r.stdout}${r.stderr}`, "");
  assert.equal(readFileSync(envFile, "utf8"), "export A=1\nexport OPENAI_API_KEY='sk-workspace-123'\n");
  const none = run([], { CLAUDE_PROJECT_DIR: project });
  assert.equal(none.status, 0);
  assert.equal(`${none.stdout}${none.stderr}`, "");
});

test("훅: 쓸 수 없는 CLAUDE_ENV_FILE이어도 세션 시작을 막지 않는다(exit 0)", () => {
  const project = workspace("OPENAI_API_KEY=sk-x-12345678\n");
  const r = run([], { CLAUDE_PROJECT_DIR: project, CLAUDE_ENV_FILE: join(project, "no/such/dir/env") });
  assert.equal(r.status, 0);
  assert.equal(`${r.stdout}${r.stderr}`, "");
});

test("-- <명령>: 셸에 없는 세 키를 그 명령에만 넣고 명령의 exit를 돌려준다. --가 없거나 명령을 못 찾으면 exit 1", () => {
  const project = workspace("VERCEL_TOKEN=vcp_project_123\n", "GH_TOKEN=ghp_workspace_123\n");
  const env = { CLAUDE_PROJECT_DIR: project, OPENAI_API_KEY: "from-shell" };
  const probe = 'process.stdout.write([process.env.OPENAI_API_KEY, process.env.GH_TOKEN, process.env.VERCEL_TOKEN].join(","))';
  const r = run(["--", process.execPath, "-e", probe], env);
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "from-shell,ghp_workspace_123,vcp_project_123");
  assert.equal(run(["--", process.execPath, "-e", "process.exit(3)"], env).status, 3);
  for (const args of [["--"], ["gh", "api", "user"]]) {
    const u = run(args, env);
    assert.equal(u.status, 1, args.join(" "));
    assert.match(u.stderr, /사용법/);
  }
  const missing = run(["--", "no-such-command-xyz"], env);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /실행하지 못했다/);
});
