import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  audit, close, confirmProblem, evidenceProblem, loadConfig, parseActive, renderBlock, status, writeTable,
} from "../files/scripts/dev-cycle.mjs";
import { makeRepo, TEMPLATE_FILES } from "./helpers.mjs";

const CLI = join(TEMPLATE_FILES, "scripts/dev-cycle.mjs");
const run = (root, ...args) => spawnSync(process.execPath, [CLI, ...args], { cwd: root, encoding: "utf8" });

const CONFIRMED = "사용자가 결과를 확인했다(2026-09-29)";

// 빈 칸을 value로, 빈 [confirm] 칸은 confirm으로 채운다
function fill(root, value = "pnpm check-types → exit 0", confirm = CONFIRMED) {
  const config = loadConfig(root);
  const p = join(root, config.todoPath);
  const md = readFileSync(p, "utf8");
  const a = parseActive(md);
  const rows = a.rows.map((r) => ({ ...r, evidence: r.evidence || (r.text.startsWith("[confirm]") ? confirm : value) }));
  writeFileSync(p, md.slice(0, a.start) + renderBlock({ ...a.meta, title: a.title }, rows) + md.slice(a.end));
}

test("증거 판정: 빈 칸·형식만 채운 값·사유 없는 N/A", () => {
  assert.match(evidenceProblem(""), /비어/);
  for (const v of ["✓", "✔", "-", "OK", "done", "TODO", "tbd", "완료", "확인됨"]) assert.ok(evidenceProblem(v), v);
  assert.match(evidenceProblem("N/A"), /사유/);
  assert.match(evidenceProblem("n/a:"), /사유/);
  assert.equal(evidenceProblem("N/A: 기존 화면 개선"), null);
  assert.equal(evidenceProblem("pnpm check-types → exit 0"), null);
  assert.match(evidenceProblem("blocked"), /사유/);
  assert.equal(evidenceProblem("blocked: TEST_DATABASE_URL 없음"), null);
  assert.match(evidenceProblem("미실행"), /사유/);
});

const CONFIRM = "[confirm] 사용자 확인 (결과를 사용자에게 보여 주고 사용자가 직접 보거나 써 본 뒤 확인한다. N/A 불가) → 확인한 내용과 날짜";

test("[confirm] 행: N/A·PASS·blocked 같은 건너뛰기는 거부하고 실제 확인과 다른 행의 N/A는 막지 않는다", () => {
  const row = (text, evidence) => ({ text, evidence });
  for (const v of [
    "N/A: 사용자 부재", "n/a: 없음", "N/A", "`N/A: 없음`", "'n/a: 없음'", " N/A : 문서만", "NA: 문서만", "N / A: x", "**N/A**: x", "(N/A) 문서만",
    "PASS: 문서만 바뀜", "blocked: 사용자 부재", "BLOCKED: x", "미실행: 사용자 요청", "skipped: x", "생략: 문서만", "해당 없음: 문서만",
    "TODO: 사용자 확인 대기", "pending: 다음 세션", "대기: 사용자 부재", "사용자 확인 대기 중", "사용자 확인 대기",
  ]) {
    assert.match(confirmProblem(row(CONFIRM, v)) ?? "", /넘길 수 없다/, v);
  }
  assert.equal(confirmProblem(row(CONFIRM, "사용자가 /login 화면을 확인했다(2026-09-29)")), null);
  assert.equal(confirmProblem(row(CONFIRM, "NAS 백업 화면을 사용자가 확인(2026-09-29)")), null);
  assert.equal(confirmProblem(row(CONFIRM, "Passkey 로그인을 사용자가 써 보고 확인(2026-09-29)")), null);
  assert.equal(confirmProblem(row("수동 행 [confirm] 문구가 중간에 있다", "N/A: x")), null);
  assert.equal(confirmProblem(row("[verify] 타입·린트 검사 → 명령과 결과", "N/A: 문서만 바뀜")), null);
  assert.equal(confirmProblem(row("문서 영향 확인 → 갱신 내역 또는 N/A: 사유", "N/A: 문서 영향 없음")), null);
});

test("audit·status: [confirm] 행의 N/A만 실패로 잡고 다른 행의 N/A는 통과시킨다", () => {
  const { root, write } = makeRepo();
  write("README.md", "changed\n");
  const config = loadConfig(root);
  writeTable(root, config, "A", { title: "오타", write: true });
  fill(root, "N/A: 문서만 바뀜", "N/A");
  const bad = audit(root, config);
  assert.equal(bad.ok, false);
  assert.equal(bad.problems.length, 1);
  // 사유 없는 N/A도 "사유가 없다"가 아니라 확인 행 규칙으로 알린다
  assert.match(bad.problems[0], /\[confirm\] 사용자 확인.*넘길 수 없다/);
  assert.equal(status(root, config).next, CONFIRM);
  assert.equal(close(root, config).ok, false);
  const p = join(root, config.todoPath);
  const md = readFileSync(p, "utf8");
  const a = parseActive(md);
  const rows = a.rows.map((r) => (r.text === CONFIRM ? { ...r, evidence: "사용자가 README 변경을 확인했다(2026-09-29)" } : r));
  writeFileSync(p, md.slice(0, a.start) + renderBlock({ ...a.meta, title: a.title }, rows) + md.slice(a.end));
  assert.deepEqual(audit(root, config).problems, []);
  assert.equal(status(root, config).next, null);
});

test("close --partial로도 [confirm] 행의 blocked·미실행은 넘기지 못한다", () => {
  for (const v of ["blocked: 사용자 부재", "미실행: 나중에 확인"]) {
    const { root, write } = makeRepo();
    write("README.md", "changed\n");
    const config = loadConfig(root);
    writeTable(root, config, "A", { title: "오타", write: true });
    fill(root, undefined, v);
    assert.equal(audit(root, config).ok, false, v);
    assert.equal(close(root, config, new Date(), { partial: true }).ok, false, v);
    assert.equal(run(root, "close", "--partial").status, 1, v);
  }
});

test("secrets: 스테이징한 변경의 로컬 .env 비밀값과 흔한 키 형식을 잡되 값은 출력하지 않는다", () => {
  const { root, git, write } = makeRepo({ name: "dc-secrets-" });
  const secret = "s3cr3t-Value-For-Auth-0123456789abcdef";
  write(".gitignore", ".env\n");
  write("apps/web/.env", `NODE_ENV=development\nBETTER_AUTH_SECRET="${secret}"\nDATABASE_URL=postgresql://postgres:password@localhost:5432/app\n`);
  write("docs/ok.md", "로컬 주소 postgresql://postgres:password@localhost:5432/app 와 development\n");
  git("add", "docs/ok.md");
  let r = run(root, "secrets");
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /통과/);

  write("docs/leak.md", `증거: ${secret}\n`);
  write("notes/token.txt", `ghp_${"a".repeat(36)}\n`);
  write("notes/unstaged.txt", `${secret}\n`);
  git("add", "docs/leak.md", "notes/token.txt");
  r = run(root, "secrets");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /docs\/leak\.md: apps\/web\/\.env의 BETTER_AUTH_SECRET 값/);
  assert.match(r.stdout, /notes\/token\.txt: GitHub 토큰/);
  assert.doesNotMatch(r.stdout, /unstaged/);
  assert.ok(!r.stdout.includes(secret), "값을 출력하지 않는다");
});

test("secrets: .env 읽기(빈 값 다음 줄, 주석, 백틱, .env.* 파일, .env.example 제외, 자리표시자)와 diff 읽기(++ 로 시작하는 줄, 공백·한글 경로, mnemonicPrefix, -diff 속성, 하위 폴더 실행)", () => {
  const { root, git, write } = makeRepo({ name: "dc-secrets2-" });
  git("config", "diff.mnemonicPrefix", "true");
  const token = "Tk-After-Empty-0123456789";
  const quoted = "Qw3rty-Quoted-987654";
  const bare = "Zx9-Bare-Value-55";
  const pooled = "Unp00led-Pass-13579";
  const tick = "Bq7-Backtick-Val-42";
  const devLocal = "Dv3-Dev-Local-Secret-77";
  const example = "Ex4mple-Should-Skip-1";
  write(".gitignore", ".env\n.env.local\n.env.*.local\n");
  write(
    "apps/web/.env",
    `EMPTY_VALUE=\nAPI_TOKEN=${token}\r\nSTRIPE_KEY="${quoted}" # 테스트 키\nOTHER_SECRET=${bare} # 메모\nDEMO_SECRET=changeme-please\nTICK_TOKEN=\`${tick}\`\n`,
  );
  write(".env.local", `DATABASE_URL_UNPOOLED=${pooled}\n`);
  write("apps/web/.env.development.local", `DEV_SECRET=${devLocal}\n`);
  write("apps/web/.env.example", `EXAMPLE_KEY=${example}\n`);
  write("docs/placeholder.md", `changeme-please\n${example}\n`);
  git("add", "docs/placeholder.md");
  let r = run(root, "secrets");
  assert.equal(r.status, 0, r.stdout);

  write("notes/with space.txt", `${token}\n`);
  write("notes/pp.txt", `++ ${quoted}\n`);
  write("notes/more.txt", `${bare}\n`);
  write("notes/메모.txt", `${pooled}\n`);
  write("notes/tick.txt", `${tick}\n`);
  write(".gitattributes", "notes/attr.txt -diff\n");
  write("notes/attr.txt", `${devLocal}\n`);
  git("add", "notes", ".gitattributes");
  // 하위 폴더에서 실행해도 저장소 루트 기준으로 읽는다
  r = spawnSync(process.execPath, [CLI, "secrets"], { cwd: join(root, "apps/web"), encoding: "utf8" });
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /❌ notes\/with space\.txt: apps\/web\/\.env의 API_TOKEN 값$/m);
  assert.match(r.stdout, /❌ notes\/pp\.txt: apps\/web\/\.env의 STRIPE_KEY 값/);
  assert.match(r.stdout, /❌ notes\/more\.txt: apps\/web\/\.env의 OTHER_SECRET 값/);
  assert.match(r.stdout, /❌ notes\/메모\.txt: \.env\.local의 DATABASE_URL_UNPOOLED 값/);
  assert.match(r.stdout, /❌ notes\/tick\.txt: apps\/web\/\.env의 TICK_TOKEN 값/);
  assert.match(r.stdout, /❌ notes\/attr\.txt: apps\/web\/\.env\.development\.local의 DEV_SECRET 값/);
  for (const v of [token, quoted, bare, pooled, tick, devLocal]) assert.ok(!r.stdout.includes(v), "값을 출력하지 않는다");
});

test("secrets: 검사를 실행하지 못하면 exit 2로 비밀값 발견(exit 1)과 구분한다", () => {
  const root = mkdtempSync(join(tmpdir(), "dc-nogit-"));
  const r = run(root, "secrets");
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /비밀값 발견 아님/);
});

test("audit: 빈 칸이면 실패, 모두 채우면 통과", () => {
  const { root, write } = makeRepo();
  write("apps/web/src/app/todos/page.tsx");
  const config = loadConfig(root);
  writeTable(root, config, undefined, { title: "목록", write: true });
  const bad = audit(root, config);
  assert.equal(bad.ok, false);
  assert.ok(bad.problems.some((p) => p.includes("비어")));
  fill(root);
  const good = audit(root, config);
  assert.deepEqual(good.problems, []);
  assert.equal(good.ok, true);
});

test("audit: 라운드 중 다른 계층이 생기면 케이스 상향을 요구한다", () => {
  const { root, write } = makeRepo();
  write("apps/web/src/app/todos/page.tsx");
  const config = loadConfig(root);
  writeTable(root, config, undefined, { title: "목록", write: true });
  fill(root);
  write("packages/db/src/schema/todo.ts");
  const r = audit(root, config);
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((p) => p.includes("케이스 상향") && p.includes("table F")));
});

test("audit: 인증 파일을 건드리면 security 행 누락을 잡는다", () => {
  const { root, write } = makeRepo();
  write("packages/api/src/routers/todo.ts");
  const config = loadConfig(root);
  writeTable(root, config, undefined, { title: "API", write: true });
  fill(root);
  write("packages/auth/src/index.ts");
  const r = audit(root, config);
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((p) => p.includes("필수 행 누락") && p.includes("prokit-reviewer(security)")));
});

test("audit: 활성 라운드가 없으면 실패", () => {
  const { root } = makeRepo();
  const r = audit(root, loadConfig(root));
  assert.equal(r.ok, false);
  assert.match(r.problems[0], /활성 라운드/);
});

test("status: 다음 빈 행을 알려 준다", () => {
  const { root, write } = makeRepo();
  write("packages/api/src/routers/todo.ts");
  const config = loadConfig(root);
  assert.equal(status(root, config).active, false);
  writeTable(root, config, undefined, { title: "API", write: true });
  const s = status(root, config);
  assert.equal(s.case, "D");
  assert.equal(s.filled, 0);
  assert.match(s.next, /^zod 입출력 계약/);
});

test("status: 진행 중인 라운드가 없을 때만 외부 스킬 업데이트 확인(skills:update --if-due)을 부르고 그 출력을 붙인다", () => {
  const { root, write } = makeRepo();
  const log = join(root, "if-due.log");
  write("scripts/skills-setup.mjs", `import { appendFileSync } from "node:fs";
appendFileSync(${JSON.stringify(log)}, process.argv.slice(2).join(" ") + "\\n");
if (process.argv.includes("--if-due")) console.log("UPDATE_AVAILABLE mode=ask 1: shadcn → 라운드를 열기 전에 prokit-skills-update 스킬 1절을 따른다");
`);
  const r = run(root, "status");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^활성 라운드 없음[^\n]*\nUPDATE_AVAILABLE mode=ask 1: shadcn → /);
  assert.equal(readFileSync(log, "utf8"), "--update --if-due\n");
  assert.deepEqual(JSON.parse(run(root, "status", "--json").stdout).skillsUpdate, [
    "UPDATE_AVAILABLE mode=ask 1: shadcn → 라운드를 열기 전에 prokit-skills-update 스킬 1절을 따른다",
  ]);
  writeTable(root, loadConfig(root), "A", { title: "문서", write: true });
  assert.doesNotMatch(run(root, "status").stdout, /UPDATE_AVAILABLE/, "라운드 중에는 확인하지 않는다");
  assert.equal(readFileSync(log, "utf8").split("\n").filter(Boolean).length, 2);
});

test("status: --if-due를 모르는 옛 skills-setup.mjs는 부르지 않고(설치를 해 버린다), 확인 스크립트가 죽으면 CHECK_FAILED로 알린다", () => {
  const { root, write } = makeRepo();
  const log = join(root, "old.log");
  write("scripts/skills-setup.mjs", `import { appendFileSync } from "node:fs";
appendFileSync(${JSON.stringify(log)}, "setup\\n");
`);
  assert.doesNotMatch(run(root, "status").stdout, /CHECK_FAILED|UPDATE/);
  assert.equal(existsSync(log), false, "옛 스크립트를 실행하지 않았다");
  write("scripts/skills-setup.mjs", `if (process.argv.includes("--if-due")) { console.error("EACCES: node_modules/.cache"); process.exit(2); }
`);
  assert.match(run(root, "status").stdout, /\nCHECK_FAILED skills:update --if-due: EACCES: node_modules\/\.cache$/m);
});

test("close: audit 실패면 거부, 통과하면 아카이브로 옮긴다", () => {
  const { root, write } = makeRepo();
  write("README.md", "changed\n");
  const config = loadConfig(root);
  writeTable(root, config, undefined, { title: "오타", write: true });
  assert.equal(close(root, config).ok, false);
  fill(root);
  const r = close(root, config, new Date("2026-09-25T00:00:00Z"));
  assert.equal(r.ok, true);
  assert.ok(r.archivePath.endsWith(join("tasks", "archive", "2026-09.md")));
  const archived = readFileSync(r.archivePath, "utf8");
  assert.match(archived, /dev-cycle:archived closed=2026-09-25 case=A/);
  assert.equal(parseActive(readFileSync(join(root, config.todoPath), "utf8")), null);
});

test("close: blocked·미실행 칸이 있으면 --partial 없이는 닫지 않는다", () => {
  const { root, write } = makeRepo();
  write("README.md", "changed\n");
  const config = loadConfig(root);
  writeTable(root, config, "A", { title: "오타", write: true });
  fill(root, "blocked: 리뷰어 응답 없음");
  assert.equal(audit(root, config).ok, true);
  const r = close(root, config);
  assert.equal(r.ok, false);
  assert.match(r.problems[0], /blocked \d+건, 미실행 0건/);
  assert.equal(run(root, "close").status, 1);
  assert.equal(run(root, "close", "--partial").status, 0);
});

test("close: 미실행, 대소문자, 백틱으로 감싼 표시도 부분 완료로 센다", () => {
  for (const v of ["미실행: 사용자 요청으로 범위 제외", "BLOCKED: 도구 없음", "`blocked: 도구 없음`"]) {
    const { root, write } = makeRepo();
    write("README.md", "changed\n");
    const config = loadConfig(root);
    writeTable(root, config, "A", { title: "오타", write: true });
    fill(root, v);
    assert.equal(close(root, config).ok, false, v);
  }
  assert.equal(evidenceProblem("`blocked`") !== null, true);
});

test("CLI: 종료 코드와 --json", () => {
  const { root, write } = makeRepo();
  write("apps/web/src/app/todos/page.tsx");
  const c = run(root, "case", "--json");
  assert.equal(c.status, 0);
  assert.equal(JSON.parse(c.stdout).pathCase, "B");
  assert.equal(run(root, "table", "--write", "--title", "목록 화면").status, 0);
  assert.equal(run(root, "table", "--write").status, 2);
  assert.equal(run(root, "audit").status, 1);
  assert.match(run(root, "status").stdout, /라운드 B "목록 화면"/);
  assert.equal(run(root, "nope").status, 2);
  assert.ok(existsSync(join(root, "tasks/todo.md")));
});

test("CLI: --title 없이도 명시한 케이스를 쓴다", () => {
  const { root } = makeRepo();
  assert.match(run(root, "table", "C", "--write").stdout, /케이스 C 대조표/);
  assert.match(run(root, "table", "F", "--write", "--upgrade").stdout, /케이스 F 대조표/);
});

test("close: 사용자 메모의 빈 줄은 건드리지 않는다", () => {
  const { root, write } = makeRepo();
  write("README.md", "changed\n");
  const config = loadConfig(root);
  const todoPath = join(root, config.todoPath);
  write(config.todoPath, "# 작업\n\n```\na\n\n\n\nb\n```\n");
  writeTable(root, config, "A", { title: "오타", write: true });
  fill(root);
  assert.equal(close(root, config).ok, true);
  assert.equal(readFileSync(todoPath, "utf8"), "# 작업\n\n```\na\n\n\n\nb\n```\n");
});
