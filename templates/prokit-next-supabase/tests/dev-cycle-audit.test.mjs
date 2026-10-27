import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  audit, BRAINS_DIR, close, confirmProblem, delegationCompletionProblem, evidenceProblem, loadConfig, noteSkillsChange, parseActive, renderBlock, status, writeTable,
} from "../files/scripts/dev-cycle.mjs";
import { captureSnapshot } from "../files/scripts/delegation.mjs";
import { auditRecord, critiqueRecord, makeRepo, TEMPLATE_FILES } from "./helpers.mjs";

const CLI = join(TEMPLATE_FILES, "scripts/dev-cycle.mjs");
const run = (root, ...args) => spawnSync(process.execPath, [CLI, ...args], { cwd: root, encoding: "utf8" });

const CONFIRMED = "사용자가 결과를 확인했다(2026-09-29)";

test("audit은 구현 전 설계 행을 지우거나 빈 증거로 남기면 거부한다", () => {
  const { root } = makeRepo();
  const config = loadConfig(root);
  writeTable(root, config, "F", { write: true, title: "설정과 재사용" });
  fill(root);
  const p = join(root, config.todoPath);
  const active = parseActive(readFileSync(p, "utf8"));
  const design = active.rows.find((r) => r.text.startsWith("[design]"));
  assert.ok(design, "필수 설계 행");
  const blank = active.rows.map((r) => r === design ? { ...r, evidence: "" } : r);
  writeFileSync(p, renderBlock({ ...active.meta, title: active.title }, blank));
  assert.ok(audit(root, config).problems.some((problem) => problem.includes(design.text) && problem.includes("비어")));
  const removed = active.rows.filter((r) => r !== design);
  writeFileSync(p, renderBlock({ ...active.meta, title: active.title }, removed));
  assert.ok(audit(root, config).problems.some((problem) => problem.includes("필수 행 누락") && problem.includes(design.text)));
  writeFileSync(p, renderBlock({ ...active.meta, title: active.title }, active.rows));
  assert.equal(audit(root, config).ok, true);
});

test("audit은 연결된 위임 증거 패킷의 실패·미해결 상태를 통과로 바꾸지 않는다", () => {
  const { root } = makeRepo();
  const config = loadConfig(root);
  writeTable(root, config, "A", { write: true, title: "위임 증거" });
  fill(root);
  const packet = {
    taskId: "delegate-1",
    status: "failed",
    selectedProviders: [],
    allowedPaths: ["tasks/**"],
    constraints: [],
    environmentRefs: [],
    changes: [],
    evidence: { report: "failed", commands: [{ command: "node --test", exitCode: 1 }], coverage: {}, limitations: [], artifacts: [], focus: ["tasks"] },
    reviewCoverage: [],
    unresolved: ["test failed"],
    sideEffects: [],
    nextAction: "fix",
    baseline: captureSnapshot(root),
  };
  const result = audit(root, config, { delegationPacket: packet });
  assert.equal(result.ok, false);
  // context가 없어도 예외 대신 packet 자체의 문제를 함께 보여 준다.
  const delegation = result.problems.find((problem) => problem.startsWith("위임 완료 검증 실패"));
  assert.ok(delegation, result.problems.join("\n"));
  assert.match(delegation, /완료되지 않은 status: failed/);
  assert.match(delegation, /실패한 command를 완료 증거로 냈다: node --test \(exit 1\)/);
});

test("CLI close는 packet을 받지 않고, 위임·자원 스크립트가 없어도 secrets는 돈다", () => {
  const { root } = makeRepo();
  const close = run(root, "close", "--packet", "p.json", "--context", "c.json");
  assert.equal(close.status, 2);
  assert.match(close.stderr, /사용법: dev-cycle close \[--partial\] \[--json\]/);
  // dev-cycle.mjs만 있는 프로젝트(갱신 중 일부 파일이 빠진 경우)
  const alone = join(root, "alone");
  mkdirSync(alone);
  writeFileSync(join(alone, "dev-cycle.mjs"), readFileSync(CLI));
  const solo = (...args) => spawnSync(process.execPath, [join(alone, "dev-cycle.mjs"), ...args], { cwd: root, encoding: "utf8" });
  const secrets = solo("secrets");
  assert.equal(secrets.status, 0, secrets.stderr);
  assert.match(secrets.stdout, /비밀값 검사 통과/);
  const resource = solo("resource", "check");
  assert.equal(resource.status, 2);
  assert.match(resource.stderr, /scripts\/resource-guard\.mjs를 불러올 수 없다/);
  const capture = solo("delegation", "capture");
  assert.equal(capture.status, 2);
  assert.match(capture.stderr, /scripts\/delegation\.mjs를 불러올 수 없다/);
});

test("handoff admission·JSON context는 최종 위임 완료 attest로 통과할 수 없다", () => {
	assert.match(
		delegationCompletionProblem(
			{ ok: true, status: "admitted", completionReady: false },
			{ verifyAuthority: () => true, verifyReceipt: () => true },
		),
		/완료 가능한/,
	);
	assert.match(
		delegationCompletionProblem(
			{ ok: true, status: "complete", completionReady: true },
			{},
		),
		/Main runtime/,
	);
	assert.equal(
		delegationCompletionProblem(
			{ ok: true, status: "complete", completionReady: true },
			{ verifyAuthority: () => true, verifyReceipt: () => true },
		),
		null,
	);
});

test("옛 delegation=required 마커 라운드도 packet 없이 audit·close할 수 있고 새 대조표는 마커를 쓰지 않는다", () => {
	// CLI의 --context JSON으로는 Main runtime 검증기를 넘길 수 없어 이 마커 라운드는 닫히지 않았다.
	const { root } = makeRepo();
	const config = loadConfig(root);
	writeTable(root, config, "A", { write: true, title: "위임" });
	const p = join(root, config.todoPath);
	assert.doesNotMatch(readFileSync(p, "utf8"), /delegation=/);
	fill(root);
	writeFileSync(p, readFileSync(p, "utf8").replace(/ -->/, " delegation=required -->"));
	assert.match(readFileSync(p, "utf8"), /delegation=required/);
	assert.equal(audit(root, config).ok, true);
	assert.equal(close(root, config).ok, true);
});

test("계획 리뷰는 N/A로 넘길 수 없고 도구 실패는 부분 완료로 남는다", () => {
  const { root } = makeRepo();
  const config = loadConfig(root);
  writeTable(root, config, "F", { write: true, title: "계획 리뷰" });
  fill(root);
  const p = join(root, config.todoPath);
  const active = parseActive(readFileSync(p, "utf8"));
  const plan = active.rows.find((r) => r.text.includes("prokit-reviewer(plan)"));
  assert.ok(plan, "독립 계획 리뷰 행");
  for (const evidence of ["N/A: gstack 없음", "**N/A**: 구현 전", "N / A: 스킬 없음", "pnpm check-types → exit 0", "PASS: gstack 없음", "해당 없음: 도구 없음", "prokit-reviewer(plan): changes-required, max=high", "prokit-reviewer(plan): changes-required, max=medium", "prokit-reviewer(plan): approve, max=high"]) {
    const rows = active.rows.map((r) => r === plan ? { ...r, evidence } : r);
    writeFileSync(p, renderBlock({ ...active.meta, title: active.title }, rows));
    assert.ok(audit(root, config).problems.some((problem) => problem.includes("계획 리뷰")), evidence);
  }
  const rows = active.rows.map((r) => r === plan ? { ...r, evidence: "blocked: 독립 리뷰 도구 실패" } : r);
  writeFileSync(p, renderBlock({ ...active.meta, title: active.title }, rows));
  assert.equal(audit(root, config).ok, true);
  assert.equal(close(root, config).ok, false);
});

test("설계 증거는 일반 검사나 건너뛰기 대신 결정의 필수 항목을 요구한다", () => {
  const { root } = makeRepo();
  const config = loadConfig(root);
  writeTable(root, config, "D", { write: true, title: "설계 증거" });
  fill(root);
  const p = join(root, config.todoPath);
  const active = parseActive(readFileSync(p, "utf8"));
  const design = active.rows.find((r) => r.text.startsWith("[design]"));
  for (const evidence of ["pnpm check-types → exit 0", "N/A: 설정 변경 없음", "기존: packages/ui; 결정: 재사용; 설정: 영향 없음", "기존: ; 결정: 재사용; 설정: 영향 없음; 검증: 두 소비자 확인"]) {
    const rows = active.rows.map((r) => r === design ? { ...r, evidence } : r);
    writeFileSync(p, renderBlock({ ...active.meta, title: active.title }, rows));
    assert.equal(audit(root, config).ok, false, evidence);
  }
  writeFileSync(p, renderBlock({ ...active.meta, title: active.title }, active.rows));
  assert.equal(audit(root, config).ok, true);
});

// 빈 칸을 value로, 빈 [confirm] 칸은 confirm으로 채운다
function fill(root, value = "pnpm check-types → exit 0", confirm = CONFIRMED) {
  const config = loadConfig(root);
  const p = join(root, config.todoPath);
  const md = readFileSync(p, "utf8");
  const a = parseActive(md);
  const rows = a.rows.map((r) => {
    let evidence = value;
    if (value === "pnpm check-types → exit 0") {
      if (r.text.startsWith("[design]")) evidence = "기존: docs/dev-workflow.md; 결정: 기존 절차 재사용; 설정: 변경 없음; 검증: 소비자 회귀 검사";
      if (r.text.includes("prokit-reviewer(plan)")) evidence = "prokit-reviewer(plan): approve, max=none, 지적 0";
      if (r.text.startsWith("[review] impeccable critique")) evidence = critiqueRecord(root);
      if (r.text.startsWith("[review] impeccable audit")) evidence = auditRecord(root);
    }
    return { ...r, evidence: r.evidence || (r.text.startsWith("[confirm]") ? confirm : evidence) };
  });
  writeFileSync(p, md.slice(0, a.start) + renderBlock({ ...a.meta, title: a.title }, rows) + md.slice(a.end));
}

test("화면 리뷰 행: critique 기록·audit 보고서가 없거나, 이번 라운드보다 오래됐거나, 점수가 다르면 거부하고 사유 있는 blocked·N/A는 받는다", () => {
  const { root } = makeRepo();
  const config = loadConfig(root);
  writeTable(root, config, "B", { write: true, title: "화면" });
  fill(root);
  const p = join(root, config.todoPath);
  const active = parseActive(readFileSync(p, "utf8"));
  const row = active.rows.findIndex((r) => r.text.startsWith("[review] impeccable critique"));
  const problemFor = (evidence) => {
    const rows = active.rows.map((r, i) => (i === row ? { ...r, evidence } : r));
    writeFileSync(p, renderBlock({ ...active.meta, title: active.title }, rows));
    return audit(root, config).problems.find((x) => x.startsWith(`#${row + 1} `)) ?? null;
  };
  const file = ".impeccable/critique/2026-10-22T12-30-00Z__apps-web.md";
  assert.equal(problemFor(active.rows[row].evidence), null);
  // AG5: critique를 실행하지 않고 적은 점수
  assert.match(problemFor("Design Health 40/40, P0 0, P1 0"), /기록 파일\(\.impeccable\/critique\//);
  assert.match(problemFor("Design Health 40/40, .impeccable/critique/2026-10-22T00-00-00Z__none.md"), /기록 파일이 없다/);
  assert.match(problemFor(`Design Health 40/40, P0 0, ${file}`), /점수가 기록 파일과 다르다: 증거 40\/40/);
  assert.match(problemFor(`Design Health 31/32, P0 0, ${file}`), /점수가 기록 파일과 다르다/);
  // 점수 앞에 날짜 같은 다른 N/M이 있어도 파일 점수와 같은 쌍이 있으면 받는다
  assert.equal(problemFor(`10/22 critique, Design Health 31/40, ${file}`), null);
  assert.match(problemFor(`10/22 critique, Design Health 40/40, ${file}`), /증거 40\/40/);
  // 도우미가 출력하는 절대 경로도 프로젝트 안 기록으로 읽는다
  assert.equal(problemFor(`Design Health 31/40, ${root}/${file}`), null);
  assert.equal(problemFor("blocked: impeccable 미설치"), null);
  assert.equal(problemFor("N/A: 화면 변화 없음"), null);
  // 이전 라운드의 기록을 다시 쓰면 받지 않는다
  const old = new Date("2020-01-01T00:00:00Z");
  utimesSync(join(root, file), old, old);
  assert.match(problemFor(`Design Health 31/40, ${file}`), /이번 라운드보다 오래됐다/);
  // 연 날 안이어도 base 커밋보다 먼저 쓴 기록(앞 라운드 것)은 받지 않는다
  const baseAt = Number(spawnSync("git", ["show", "-s", "--format=%ct", active.meta.base], { cwd: root, encoding: "utf8" }).stdout.trim());
  utimesSync(join(root, file), baseAt - 30, baseAt - 30);
  assert.match(problemFor(`Design Health 31/40, ${file}`), /이번 라운드보다 오래됐다/);
  utimesSync(join(root, file), baseAt + 1, baseAt + 1);
  assert.equal(problemFor(`Design Health 31/40, ${file}`), null);
  // 점수가 없는 기록 파일, 점수 없는 증거
  writeFileSync(join(root, ".impeccable/critique/2026-10-22T13-00-00Z__empty.md"), "본문만\n");
  assert.match(problemFor("Design Health 40/40, .impeccable/critique/2026-10-22T13-00-00Z__empty.md"), /total_score가 없다/);
  assert.match(problemFor(`critique 실행함, ${file}`), /증거에 critique 점수\(31\/40\)가 없다/);
  // audit과 web-design-guidelines는 보고서 파일과 총점을 본다
  const auditRow = active.rows.findIndex((r) => r.text.startsWith("[review] impeccable audit"));
  const auditProblem = (evidence) => {
    const rows = active.rows.map((r, i) => (i === auditRow ? { ...r, evidence } : r));
    writeFileSync(p, renderBlock({ ...active.meta, title: active.title }, rows));
    return audit(root, config).problems.find((x) => x.startsWith(`#${auditRow + 1} `)) ?? null;
  };
  const report = "tasks/evidence/ui-audit-20261022-1230.md";
  assert.equal(auditProblem(active.rows[auditRow].evidence), null);
  assert.match(auditProblem("audit 20/20, 접근성 4/4, web-design-guidelines 위반 0건"), /보고서를 저장한 파일\(tasks\/evidence\/ui-audit-/);
  assert.match(auditProblem("audit 17/20, tasks/evidence/ui-audit-none.md"), /기록 파일이 없다/);
  assert.match(auditProblem(`audit 20/20, 접근성 4/4, ${report}`), /보고서에 증거의 총점 20\/20이 없다/);
  assert.equal(auditProblem(`10/20 기준 audit 17/20, ${report}`), null);
  assert.match(auditProblem(`audit 실행함, ${report}`), /증거에 audit 총점\(N\/20\)이 없다/);
  writeFileSync(join(root, report), "| **Total** | | **17**/20 | Good |\n");
  assert.equal(auditProblem(`audit 17/20, ${report}`), null);
  assert.equal(auditProblem("blocked: web-design-guidelines 가져오기 실패"), null);
});

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
  for (const v of ["2026-10-27 사용자가 수정 결과 보고를 보고 추천대로 진행하라고 지시(빈 목록 0 확인)", "사용자: 진행해 줘(2026-10-27)", "사용자가 계속하라고 함"])
    assert.match(confirmProblem(row(CONFIRM, v)) ?? "", /진행 지시/, v);
  for (const v of ["사용자가 화면을 확인했고 추천대로 진행하라고 함(2026-10-27)", "사용자: 확인 없이 닫는다, 진행해(2026-10-27)"]) assert.equal(confirmProblem(row(CONFIRM, v)), null, v);
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
  assert.match(s.next, /^\[design\] 재사용·설정 설계/);
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
  assert.ok(r.archivePath.endsWith(join("tasks", "archive", "2026-09-25-오타.md")));
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
  assert.ok(readFileSync(todoPath, "utf8").includes("```\na\n\n\n\nb\n```\n"));
});

test("archive: 완료 계획·백로그만 옮기고 활성 블록·미완료·코드 예시는 보존한다", () => {
  const { root, write } = makeRepo();
  const config = loadConfig(root);
  const fence = "\x60".repeat(3);
  const sample = "## 코드 예시\n" + fence + "md\n- [x] 예시 항목\n[예시](archive/old.md)\n" + fence + "\n";
  write(config.todoPath, "# 작업\n\n## 끝난 계획\n설명 [도메인](../docs/domain/project.md#flow)\n- [x] 구현\n- [x] 검사\n\n## 백로그\n- [x] 해결 [기록](archive/old.md)\n  추가 근거\n- [ ] 남은 항목\n- [ ] 부모\n  - [x] 끝난 하위\n  - [ ] 열린 하위\n\n" + sample);
  writeTable(root, config, "A", { title: "현재 작업", write: true });
  const before = readFileSync(join(root, config.todoPath), "utf8");
  const active = parseActive(before);
  const result = run(root, "archive", "--title", "완료 항목", "--json");
  assert.equal(result.status, 0, result.stderr);
  const out = JSON.parse(result.stdout);
  assert.equal(out.completed, 4);
  assert.match(out.archivePath, /\d{4}-\d{2}-\d{2}-완료-항목\.md$/);
  const after = readFileSync(join(root, config.todoPath), "utf8");
  const next = parseActive(after);
  assert.equal(after.slice(next.start, next.end), before.slice(active.start, active.end));
  assert.match(after, /- \[ \] 남은 항목/);
  assert.match(after, /- \[ \] 부모[\s\S]*- \[ \] 열린 하위/);
  assert.ok(after.includes(sample));
  assert.doesNotMatch(after, /- \[x\] 구현|끝난 하위|추가 근거/);
  const archived = readFileSync(out.archivePath, "utf8");
  assert.match(archived, /- \[x\] 구현/);
  assert.match(archived, /끝난 하위/);
  assert.match(archived, /\[기록\]\(old\.md\)/);
  assert.match(archived, /\[도메인\]\(\.\.\/\.\.\/docs\/domain\/project\.md#flow\)/);
  assert.match(readFileSync(join(root, config.archiveDir, "README.md"), "utf8"), /완료-항목\.md/);
  const again = JSON.parse(run(root, "archive", "--json").stdout);
  assert.equal(again.completed, 0);
  assert.equal(again.archivePath, null);
});

test("archive: 코드 블록의 체크박스는 완료 항목으로 세지 않는다", () => {
  const { root, write } = makeRepo();
  const fence = "\x60".repeat(4);
  const text = "# 작업\n\n" + fence + "md\n" + "\x60".repeat(3) + "text\n- [x] 코드 예시\n" + "\x60".repeat(3) + "\n" + fence + "\n";
  write("tasks/todo.md", text);
  const r = run(root, "archive", "--json");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).completed, 0);
  assert.equal(readFileSync(join(root, "tasks/todo.md"), "utf8"), text);
});

test("archive: 완료 항목과 같은 절의 독립 코드 예시를 todo에 남긴다", () => {
  const { root, write } = makeRepo();
  const fence = "\x60".repeat(3);
  const code = fence + "md\n- [x] 코드 예시\n" + fence + "\n";
  write("tasks/todo.md", "# 작업\n\n## 백로그\n- [x] 진짜 완료\n\n" + code);
  const r = run(root, "archive", "--json");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).completed, 1);
  assert.ok(readFileSync(join(root, "tasks/todo.md"), "utf8").includes(code));
  assert.doesNotMatch(readFileSync(JSON.parse(r.stdout).archivePath, "utf8"), /코드 예시/);
});

test("archive: 공백·괄호 목적지와 코드 안 링크를 보존한다", () => {
  const { root, write } = makeRepo();
  write("tasks/todo.md", "# 작업\n- [x] [설계](<../docs/design notes (v2).md#part>) [일반](../docs/design(v2).md) " + "\x60[코드](archive/a.md)\x60\n");
  const r = run(root, "archive", "--json");
  assert.equal(r.status, 0, r.stderr);
  const text = readFileSync(JSON.parse(r.stdout).archivePath, "utf8");
  assert.match(text, /\[설계\]\(<\.\.\/\.\.\/docs\/design notes \(v2\)\.md#part>\)/);
  assert.match(text, /\[일반\]\(\.\.\/\.\.\/docs\/design\(v2\)\.md\)/);
  assert.ok(text.includes("\x60[코드](archive/a.md)\x60"));
});

test("archive: 같은 절의 일반 독립 코드 블록도 보존한다", () => {
  const { root, write } = makeRepo();
  const fence = "\x60".repeat(3);
  const code = fence + "js\nconsole.log(42);\n" + fence + "\n";
  write("tasks/todo.md", "# 작업\n\n## 완료 계획\n- [x] 완료\n" + code);
  const r = run(root, "archive", "--json");
  assert.equal(r.status, 0, r.stderr);
  assert.ok(readFileSync(join(root, "tasks/todo.md"), "utf8").includes(code));
  assert.doesNotMatch(readFileSync(JSON.parse(r.stdout).archivePath, "utf8"), /console\.log/);
});

test("archive: 잘못된 색인 경로 실패는 todo·기록을 바꾸지 않아 재시도가 가능하다", () => {
  const { root, write } = makeRepo();
  const original = "# 작업\n- [x] 완료\n";
  write("tasks/todo.md", original);
  mkdirSync(join(root, "tasks/archive/README.md"), { recursive: true });
  assert.notEqual(run(root, "archive").status, 0);
  assert.equal(readFileSync(join(root, "tasks/todo.md"), "utf8"), original);
  assert.deepEqual(readdirSync(join(root, "tasks/archive")), ["README.md"]);
});

test("archive: todo 저장 실패 뒤 기존 todo·색인과 기록 수를 복구한다",
  { skip: process.getuid?.() === 0 }, () => {
  const { root, write } = makeRepo();
  const original = "# 작업\n- [x] 완료\n";
  write("tasks/todo.md", original);
  write("tasks/archive/README.md", "기존 색인\n");
  chmodSync(join(root, "tasks"), 0o555);
  try {
    assert.notEqual(run(root, "archive").status, 0);
    assert.equal(readFileSync(join(root, "tasks/todo.md"), "utf8"), original);
    assert.equal(readFileSync(join(root, "tasks/archive/README.md"), "utf8"), "기존 색인\n");
    assert.deepEqual(readdirSync(join(root, "tasks/archive")), ["README.md"]);
  } finally {
    chmodSync(join(root, "tasks"), 0o755);
  }
  const retry = run(root, "archive", "--json");
  assert.equal(retry.status, 0, retry.stderr);
  assert.equal(JSON.parse(retry.stdout).completed, 1);
});


test("close: 날짜·제목 충돌은 기존 기록을 덮어쓰지 않는다", () => {
  const { root, write } = makeRepo();
  const config = loadConfig(root);
  write("README.md", "changed\n");
  writeTable(root, config, "A", { title: "../배포 / 확인?", write: true });
  fill(root);
  const first = close(root, config, new Date("2026-09-24T15:30:00Z"));
  assert.match(first.archivePath, /2026-09-25-배포-확인\.md$/);
  const contents = readFileSync(first.archivePath, "utf8");
  writeTable(root, config, "A", { title: "../배포 / 확인?", write: true });
  fill(root);
  const second = close(root, config, new Date("2026-09-24T15:30:00Z"));
  assert.match(second.archivePath, /2026-09-25-배포-확인-2\.md$/);
  assert.equal(readFileSync(first.archivePath, "utf8"), contents);
});

test("close: 대조표와 완료 체크리스트를 함께 옮기고 기존 월별 기록은 보존한다", () => {
  const { root, write } = makeRepo();
  const config = loadConfig(root);
  write("README.md", "changed\n");
  write("tasks/archive/2026-09.md", "옛 기록\n");
  write(config.todoPath, "# 작업\n\n## 계획\n- [x] 검사\n- [ ] 다음 작업\n");
  writeTable(root, config, "A", { title: "기록 정리", write: true });
  fill(root);
  const r = close(root, config, new Date("2026-09-25T00:00:00Z"));
  assert.equal(r.ok, true);
  const archived = readFileSync(r.archivePath, "utf8");
  assert.match(archived, /dev-cycle:archived/);
  assert.match(archived, /- \[x\] 검사/);
  assert.doesNotMatch(readFileSync(join(root, config.todoPath), "utf8"), /- \[x\] 검사/);
  assert.match(readFileSync(join(root, config.todoPath), "utf8"), /- \[ \] 다음 작업/);
  assert.equal(readFileSync(join(root, config.archiveDir, "2026-09.md"), "utf8"), "옛 기록\n");
});

test("archive: 모르는 옵션과 제목 누락은 파일을 변경하지 않는다", () => {
  const { root, write } = makeRepo();
  const text = "# 작업\n- [x] 완료\n";
  write("tasks/todo.md", text);
  assert.equal(run(root, "archive", "--typo").status, 2);
  assert.equal(run(root, "archive", "--title").status, 2);
  assert.equal(readFileSync(join(root, "tasks/todo.md"), "utf8"), text);
});

// 두뇌를 고른 프로젝트: 단계 행 증거는 고른 두뇌 파일의 이름, 추가 스킬, 사유가 있는 내장 중 하나다.
function brainRepo(brain) {
  const repo = makeRepo();
  const { root } = repo;
  const cfg = JSON.parse(readFileSync(join(root, ".dev-cycle.json"), "utf8"));
  writeFileSync(join(root, ".dev-cycle.json"), JSON.stringify({ ...cfg, brain }));
  mkdirSync(join(root, BRAINS_DIR), { recursive: true });
  writeFileSync(join(root, BRAINS_DIR, "agent-skills.md"), "| 계획 | `agent-skills:planning-and-task-breakdown` | 위임은 `prokit-implementer`, 질문은 `grilling` |\n");
  writeFileSync(join(root, BRAINS_DIR, "openspec.md"), "| 요구 | `/opsx:propose` |\n");
  writeFileSync(join(root, "skills-lock.json"), JSON.stringify({ version: 1, skills: { tdd: {} } }));
  return { ...repo, config: loadConfig(root) };
}
const stageProblems = (root, config) => audit(root, config).problems.filter((p) => /두뇌\(|맡는다\(|내장 사유에/.test(p));

test("두뇌를 고르면 단계 행 증거에 두뇌 방법·추가 스킬·사유 있는 내장을 요구하고, 두뇌가 없으면 보지 않는다", () => {
  const { root, config } = brainRepo("agent-skills");
  writeTable(root, config, "F", { write: true, title: "두뇌 증거" });
  fill(root, "사용: 내장(계획)");
  assert.ok(stageProblems(root, config).length >= 3, "사유 없는 내장은 단계 행마다 거부한다");
  assert.equal(status(root, config).line.split("\n")[1], `두뇌: agent-skills → 단계 행은 ${BRAINS_DIR}/agent-skills.md의 방법으로 한다`);
  const withEvidence = (value) => {
    const r = brainRepo("agent-skills");
    writeTable(r.root, r.config, "F", { write: true, title: "두뇌 증거" });
    fill(r.root, value);
    return stageProblems(r.root, r.config);
  };
  for (const ok of ["사용: agent-skills:planning-and-task-breakdown → docs/plans/a.md", "사용: `agent-skills:planning-and-task-breakdown`", "사용: planning-and-task-breakdown", "사용: /planning-and-task-breakdown", "사용: tdd(추가 스킬)", "N/A: 문서만 바꿈"])
    assert.deepEqual(withEvidence(ok), [], ok);
  for (const bad of ["사용: superpowers:writing-plans", "사용: superpowers:planning-and-task-breakdown", "사용: research(추가 스킬)", "agent-skills planning-and-task-breakdown 방식", "사용: prokit-implementer", "사용: grilling", "사용: 내장: 단계 없이 사유만", "사용: 내장(계획): 작은 변경이라 생략"])
    assert.ok(withEvidence(bad).length > 0, bad);
  const none = makeRepo();
  const noneConfig = loadConfig(none.root);
  writeTable(none.root, noneConfig, "F", { write: true, title: "두뇌 없음" });
  fill(none.root, "사용: 내장(계획)");
  assert.deepEqual(stageProblems(none.root, noneConfig), []);
  assert.equal(status(none.root, noneConfig).line.split("\n")[1], "두뇌: 없음(기본 칸)");
});

test("두뇌가 맡는 단계는 내장으로 넘기지 못하고, 맡지 않는 단계의 내장은 사유에 두뇌 스킬 이름이 없을 때만 받는다. status와 table이 부를 스킬을 알려 준다", () => {
  const { root, config } = brainRepo("agent-skills");
  writeFileSync(join(root, BRAINS_DIR, "agent-skills.md"), "| 단계 | Claude Code |\n|---|---|\n| 계획 | `agent-skills:planning-and-task-breakdown`, 산출물 `docs/plans/x.md` |\n| 리뷰 | `agent-skills:code-review-and-quality` |\n");
  const out = run(root, "table", "F", "--write", "--title", "단계 안내");
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /단계 행에서 먼저 부를 두뇌 스킬[^\n]*\n {2}#\d+: agent-skills:planning-and-task-breakdown \(agent-skills\)/);
  assert.doesNotMatch(out.stdout, /docs\/plans\/x\.md \(/, "파일 경로는 스킬 이름이 아니다");
  const md = readFileSync(join(root, "tasks/todo.md"), "utf8");
  const rows = parseActive(md).rows;
  const at = (re) => rows.findIndex((r) => re.test(r.text));
  const spec = at(/요구 명확화 단계/);
  const plan = at(/계획 단계/);
  const set = (i, v) => {
    mkdirSync(join(root, "tasks/evidence"), { recursive: true });
    writeFileSync(join(root, "tasks/evidence/e.txt"), `${v}\n`);
    const r = run(root, "evidence", String(i + 1), "--file", "tasks/evidence/e.txt");
    assert.equal(r.status, 0, r.stderr);
  };
  for (let i = 0; i < Math.max(spec, plan); i++) if (i !== spec && i !== plan) set(i, "pnpm check-types → exit 0");
  set(spec, "사용: 내장(요구 명확화): 두뇌가 이 단계를 맡지 않음 → docs/specs/a.md");
  assert.match(status(root, config).line, /이 행은 두뇌 agent-skills의 agent-skills:planning-and-task-breakdown를 먼저 불러서 한다/);
  set(plan, "사용: 내장(계획): 작은 변경이라 직접 씀");
  let p = stageProblems(root, config);
  assert.equal(p.length, 1, p.join("\n"));
  assert.match(p[0], /이 단계는 두뇌 agent-skills이 맡는다\(agent-skills:planning-and-task-breakdown\)/);
  set(plan, "blocked: 플러그인이 이 세션에 없음");
  set(spec, "사용: 내장(요구 명확화): code-review-and-quality 방식으로 정리");
  p = stageProblems(root, config);
  assert.equal(p.length, 1, p.join("\n"));
  assert.match(p[0], /내장 사유에 두뇌 스킬 이름\(code-review-and-quality\)/);
});

test("버그 수정 라운드를 D로 올려 붙은 구현 행은 디버깅 단계 방법을 따르고, 이름 뒤 마침표·조사는 이름이 아니다", () => {
  const brainFile = (debug) => `| 단계 | Claude Code |\n|---|---|\n| 구현 | \`agent-skills:incremental-implementation\` |\n${debug ? "| 디버깅 | `agent-skills:debugging-and-error-recovery` |\n" : ""}`;
  const implRow = (debug, c) => {
    const repo = brainRepo("agent-skills");
    writeFileSync(join(repo.root, BRAINS_DIR, "agent-skills.md"), brainFile(debug));
    if (c) assert.equal(run(repo.root, "table", "C", "--write", "--title", "버그").status, 0);
    const out = run(repo.root, "table", "D", "--write", ...(c ? ["--upgrade"] : ["--title", "버그"]));
    assert.equal(out.status, 0, out.stderr);
    const rows = parseActive(readFileSync(join(repo.root, "tasks/todo.md"), "utf8")).rows;
    const i = rows.findIndex((r) => /구현 단계/.test(r.text));
    const set = (v) => {
      mkdirSync(join(repo.root, "tasks/evidence"), { recursive: true });
      writeFileSync(join(repo.root, "tasks/evidence/e.txt"), `${v}\n`);
      assert.equal(run(repo.root, "evidence", String(i + 1), "--file", "tasks/evidence/e.txt").status, 0);
      return stageProblems(repo.root, repo.config).filter((p) => p.startsWith(`#${i + 1} `));
    };
    return { set, out: out.stdout, status: () => status(repo.root, repo.config).line };
  };
  // 두뇌가 디버깅을 맡지 않으면 버그 수정의 구현 행은 내장이다. 새 기능 D의 구현 행은 그대로 두뇌 스킬이다
  assert.deepEqual(implRow(false, true).set("사용: 내장(디버깅): 두뇌가 디버깅을 맡지 않음"), []);
  assert.match(implRow(false, false).set("사용: 내장(디버깅): 두뇌가 디버깅을 맡지 않음")[0] ?? "", /이 단계는 두뇌 agent-skills이 맡는다\(agent-skills:incremental-implementation\)/);
  // 두뇌가 디버깅을 맡으면 그 스킬을 안내하고 받는다
  const r = implRow(true, true);
  assert.match(r.out, /#\d+: agent-skills:debugging-and-error-recovery \(agent-skills\)/);
  assert.doesNotMatch(r.out, /incremental-implementation/);
  assert.match(r.set("사용: 내장(구현): 한 줄 수정")[0] ?? "", /맡는다\(agent-skills:debugging-and-error-recovery\)/);
  for (const ok of ["사용: debugging-and-error-recovery. 가드 1줄", "사용: /debugging-and-error-recovery로 고침"])
    assert.deepEqual(r.set(ok), [], ok);
});

test("부른 스킬 기록: skill-log 훅이 Skill 호출과 SKILL.md Read를 남기고, 기록이 있으면 audit이 단계 행·과설계 방지 리뷰 증거와 대조한다", () => {
  const { root, write } = brainRepo("agent-skills");
  const cfg = JSON.parse(readFileSync(join(root, ".dev-cycle.json"), "utf8"));
  write(".dev-cycle.json", JSON.stringify({ ...cfg, simplicity: "ponytail" }));
  const config = loadConfig(root);
  writeTable(root, config, "D", { write: true, title: "기록 대조" });
  const rows = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows;
  const impl = rows.findIndex((r) => /구현 단계/.test(r.text));
  const review = rows.findIndex((r) => /^\[review\] prokit-reviewer\(code\)/.test(r.text));
  const set = (i, v) => {
    mkdirSync(join(root, "tasks/evidence"), { recursive: true });
    writeFileSync(join(root, "tasks/evidence/e.txt"), `${v}\n`);
    assert.equal(run(root, "evidence", String(i + 1), "--file", "tasks/evidence/e.txt").status, 0);
  };
  set(impl, "사용: agent-skills:planning-and-task-breakdown → 위임");
  set(review, "prokit-reviewer(code): approve, max=low");
  const mine = () => audit(root, config).problems.filter((p) => /기록이 없다|보완 검토 결과/.test(p));
  // 기록 파일이 없으면(Codex 등) 단계 행은 자기 신고 그대로다. 리뷰 행은 과설계 방지 결과를 요구한다
  assert.deepEqual(mine().map((p) => p.replace(/^#\d+ .*?: /, "")), ["고른 과설계 방지(ponytail)의 보완 검토 결과를 덧붙인다: ponytail-review: …"]);
  const hook = (input) => spawnSync(process.execPath, [CLI, "skill-log"], { cwd: root, input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  assert.equal(hook({ tool_name: "Read", tool_input: { file_path: "/x/README.md" } }).status, 0);
  assert.equal(hook({ tool_name: "Skill", tool_input: { skill: "prokit-dev-cycle" } }).status, 0);
  assert.equal(spawnSync(process.execPath, [CLI, "skill-log"], { cwd: root, input: "깨진 입력", encoding: "utf8" }).status, 0, "훅은 세션을 막지 않는다");
  set(review, "prokit-reviewer(code): approve, max=low; ponytail-review: 반영 1");
  let p = mine();
  assert.equal(p.length, 2, p.join("\n"));
  assert.ok(p.some((x) => x.includes("agent-skills:planning-and-task-breakdown를 이 라운드에서 부른 기록이 없다")));
  assert.ok(p.some((x) => x.includes("ponytail-review를 이 라운드에서 부른 기록이 없다")));
  hook({ tool_name: "Read", tool_input: { file_path: "/home/u/.claude/plugins/cache/addy/agent-skills/0.6/skills/planning-and-task-breakdown/SKILL.md" } });
  hook({ tool_name: "Skill", tool_input: { skill: "ponytail:ponytail-review" } });
  assert.deepEqual(mine(), []);
  assert.equal(readFileSync(join(root, ".prokit/skills-used.jsonl"), "utf8").trim().split("\n").length, 3);
  // 다음 라운드를 기록 없이(Codex 등) 진행하면 앞 라운드 기록과 대조하지 않고 자기 신고로 본다
  write("tasks/todo.md", "# 할 일\n");
  writeTable(root, config, "D", { write: true, title: "Codex 라운드" });
  assert.match(readFileSync(join(root, ".prokit/skills-used.jsonl"), "utf8").trim().split("\n").at(-1), /"round":"Codex 라운드"/);
  const rows2 = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows;
  set(rows2.findIndex((r) => /구현 단계/.test(r.text)), "사용: agent-skills:incremental-implementation → 위임");
  set(rows2.findIndex((r) => /^\[review\] prokit-reviewer\(code\)/.test(r.text)), "prokit-reviewer(code): approve, max=low; ponytail-review: 반영 0");
  assert.deepEqual(mine(), []);
  // 이 라운드에 기록이 생기면 다시 대조한다
  hook({ tool_name: "Skill", tool_input: { skill: "prokit-verify" } });
  assert.ok(mine().some((x) => x.includes("ponytail-review를 이 라운드에서 부른 기록이 없다")), mine().join("\n"));
});

test("karpathy를 골랐으면 코드 리뷰 행은 karpathy 간결성 결과와 karpathy-guidelines를 부른 기록을 요구한다", () => {
  const { root, write } = brainRepo("agent-skills");
  const cfg = JSON.parse(readFileSync(join(root, ".dev-cycle.json"), "utf8"));
  write(".dev-cycle.json", JSON.stringify({ ...cfg, simplicity: "karpathy" }));
  const config = loadConfig(root);
  writeTable(root, config, "D", { write: true, title: "karpathy 리뷰" });
  const review = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows.findIndex((r) => /^\[review\] prokit-reviewer\(code\)/.test(r.text));
  const set = (v) => {
    mkdirSync(join(root, "tasks/evidence"), { recursive: true });
    writeFileSync(join(root, "tasks/evidence/e.txt"), `${v}\n`);
    assert.equal(run(root, "evidence", String(review + 1), "--file", "tasks/evidence/e.txt").status, 0);
  };
  const mine = () => audit(root, config).problems.filter((p) => /기록이 없다|보완 검토 결과/.test(p)).map((p) => p.replace(/^#\d+ .*?: /, ""));
  set("prokit-reviewer(code): approve, max=low");
  assert.deepEqual(mine(), ["고른 과설계 방지(karpathy)의 보완 검토 결과를 덧붙인다: 간결성(karpathy 기준, prokit-reviewer focus): …"]);
  const hook = (input) => spawnSync(process.execPath, [CLI, "skill-log"], { cwd: root, input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  hook({ tool_name: "Skill", tool_input: { skill: "prokit-dev-cycle" } });
  set("prokit-reviewer(code): approve, max=low; 간결성(karpathy 기준, prokit-reviewer focus): 지적 없음");
  assert.equal(mine().length, 1);
  assert.ok(mine()[0].includes("karpathy-guidelines를 이 라운드에서 부른 기록이 없다"));
  hook({ tool_name: "Read", tool_input: { file_path: join(root, ".agents/skills/karpathy-guidelines/SKILL.md") } });
  assert.deepEqual(mine(), []);
});

test("편집 전 확인: 열린 라운드 없이 코드·하네스 파일을 Edit·Write로 고치면 edit-guard 훅이 exit 2로 막고, 문서·프로젝트 밖·깨진 입력은 막지 않는다", () => {
  const { root } = makeRepo();
  const hook = (input) => spawnSync(process.execPath, [CLI, "edit-guard"], { cwd: tmpdir(), input: typeof input === "string" ? input : JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  const edit = (file, tool = "Edit") => hook({ tool_name: tool, tool_input: tool === "NotebookEdit" ? { notebook_path: file } : { file_path: file } });
  let r = edit(join(root, "apps/web/src/app/page.tsx"));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /열린 라운드 없이 apps\/web\/src\/app\/page\.tsx\(케이스 B 경로\)/);
  assert.equal(edit("packages/api/src/routers/index.ts", "Write").status, 2, "상대 경로도 프로젝트 기준으로 본다");
  assert.equal(edit(join(root, ".agents/skills/x/SKILL.md"), "MultiEdit").status, 2, "하네스(H)도 라운드가 필요하다");
  for (const ok of [join(root, "docs/notes.md"), join(root, "tasks/todo.md"), join(tmpdir(), "elsewhere/page.tsx")]) assert.equal(edit(ok).status, 0, ok);
  assert.equal(hook("깨진 입력").status, 0);
  assert.equal(hook({ tool_name: "Edit", tool_input: {} }).status, 0);
  assert.equal(hook({ tool_name: "Edit", cwd: join(root, "apps/web"), tool_input: { file_path: "src/app/page.tsx" } }).status, 2, "상대 경로는 훅 입력의 cwd 기준");
  assert.equal(edit(join(root, "..hidden/page.tsx")).status, 0, "이름이 ..로 시작해도 프로젝트 안으로 본다(규칙 밖이라 A)");
  // 프로젝트를 심볼릭 링크로 열었고 아직 없는 폴더에 새 파일을 쓸 때
  const link = `${root}-link`;
  symlinkSync(root, link);
  const viaLink = (projectDir, file) => spawnSync(process.execPath, [CLI, "edit-guard"], { cwd: tmpdir(), input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: file } }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir } }).status;
  assert.equal(viaLink(root, join(link, "apps/web/src/app/new/page.tsx")), 2);
  assert.equal(viaLink(link, join(root, "apps/web/src/app/new/page.tsx")), 2);
  writeTable(root, loadConfig(root), "B", { write: true, title: "화면" });
  assert.equal(edit(join(root, "apps/web/src/app/page.tsx")).status, 0, "열린 라운드가 있으면 통과");
});

test("evidence: 행을 채울 때 케이스 상향·빠진 필수 행·그 행의 audit 거부를 바로 알린다", () => {
  const { root, write } = makeRepo();
  writeTable(root, loadConfig(root), "A", { write: true, title: "가벼운 케이스로 연 버그 수정" });
  write("packages/api/src/lib/x.ts", "export const x = 1;\n");
  write("tasks/evidence/1.txt", "biome check 통과\n");
  let r = run(root, "evidence", "1", "--file", "tasks/evidence/1.txt");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /먼저 할 일: 케이스 상향 필요: 현재 diff 판정은 D → pnpm dev-cycle table D --write --upgrade/);
  assert.equal(run(root, "table", "D", "--write", "--upgrade").status, 0);
  // 상향하면 1행은 설계 행이 된다. 방금 채운 행을 audit이 거부하면 그 행만 알린다
  r = run(root, "evidence", "1", "--file", "tasks/evidence/1.txt");
  assert.doesNotMatch(r.stdout, /케이스 상향|필수 행 누락/);
  assert.match(r.stdout, /먼저 할 일: #1 \[design\]/);
  assert.equal(r.stdout.match(/먼저 할 일/g).length, 1, r.stdout);
});

test("두뇌가 여럿이면 고른 어느 두뇌 파일의 이름이든 받고, 파일이 없는 두뇌는 예외 대신 문제로 알린다", () => {
  const { root, config } = brainRepo(["openspec", "agent-skills"]);
  writeTable(root, config, "C", { write: true, title: "여러 두뇌" });
  fill(root, "사용: /opsx:propose");
  assert.deepEqual(stageProblems(root, config), []);
  const odd = brainRepo("no-such-brain");
  writeTable(odd.root, odd.config, "C", { write: true, title: "모르는 두뇌" });
  fill(odd.root, "사용: x");
  assert.ok(audit(odd.root, odd.config).problems.some((p) => p.includes("고른 두뇌의 파일이 없다")));
});

test("라운드 중 구성 전환: 마커에 적으면 설치기 파일은 케이스 판정에서 빠지고 전환 전 두뇌 이름도 받는다. 그 밖의 하네스 변경은 그대로 본다", () => {
  const { root, write } = (() => {
    const r = brainRepo("openspec");
    r.write(".claude/settings.json", JSON.stringify({ hooks: { SessionStart: [] }, enabledPlugins: {} }));
    r.write("skills.manifest.json", readFileSync(join(TEMPLATE_FILES, "skills.manifest.json"), "utf8"));
    r.git("add", "-A");
    r.git("commit", "-qm", "openspec");
    return r;
  })();
  const todo = join(root, "tasks/todo.md");
  writeTable(root, loadConfig(root), "D", { write: true, title: "라운드 중 전환" });
  fill(root, "사용: /opsx:propose");
  // 설치기가 하는 일: 기록, 새 두뇌 스킬·lock, 플러그인 켜기
  const cfg = JSON.parse(readFileSync(join(root, ".dev-cycle.json"), "utf8"));
  write(".dev-cycle.json", JSON.stringify({ ...cfg, brain: "agent-skills", simplicity: "caveman" }));
  write(".agents/skills/spec-driven-development/SKILL.md", "---\nname: spec-driven-development\n---\n");
  write(".claude/skills/spec-driven-development/SKILL.md", "---\nname: spec-driven-development\n---\n");
  write("skills-lock.json", JSON.stringify({ version: 1, skills: { tdd: {}, "spec-driven-development": {} } }));
  write(".claude/settings.json", JSON.stringify({ hooks: { SessionStart: [] }, enabledPlugins: { "agent-skills@addy-agent-skills": true } }));
  const config = loadConfig(root);
  const control = audit(root, config).problems;
  assert.ok(control.some((p) => p.includes("케이스 상향")), "기록 없이 바꾸면 지금처럼 하네스 변경으로 본다");
  assert.ok(control.some((p) => p.includes("두뇌(")), "기록 없이 바꾸면 전환 전 두뇌 이름을 거부한다");
  assert.equal(noteSkillsChange(root, config, { before: { brain: "openspec", simplicity: "none" }, after: { brain: "agent-skills", simplicity: "caveman" } }), true);
  const md = readFileSync(todo, "utf8");
  assert.match(md, /<!-- dev-cycle:start [^>]*brains=openspec,agent-skills[^>]* skills=true/);
  assert.match(md, /스킬 구성 변경\(\d{4}-\d{2}-\d{2}\): 두뇌 openspec → agent-skills, 과설계 방지 none → caveman/);
  noteSkillsChange(root, config, { before: { brain: "openspec", simplicity: "none" }, after: { brain: "agent-skills", simplicity: "caveman" } });
  assert.equal(readFileSync(todo, "utf8").match(/스킬 구성 변경\(/g).length, 1, "같은 변경은 한 번만 적는다");
  const switchProblems = () => audit(root, config).problems.filter((p) => /케이스 상향|필수 행 누락|두뇌\(/.test(p));
  assert.deepEqual(switchProblems(), []);
  assert.match(status(root, config).line, /두뇌: agent-skills → /);
  // 업그레이드해도 기록과 메모가 남는다
  assert.equal(run(root, "table", "D", "--write", "--upgrade").status, 0);
  assert.match(readFileSync(todo, "utf8"), /brains=openspec,agent-skills[^>]* skills=true/);
  assert.match(readFileSync(todo, "utf8"), /스킬 구성 변경\(/);
  assert.deepEqual(switchProblems(), []);
  // 설치기 밖의 하네스 변경(훅, prokit-* 스킬)은 그대로 케이스 판정에 넣는다
  write(".claude/settings.json", JSON.stringify({ hooks: { SessionStart: [{ x: 1 }] }, enabledPlugins: { "agent-skills@addy-agent-skills": true } }));
  assert.ok(audit(root, config).problems.some((p) => p.includes("케이스 상향")), "훅 변경");
  write(".claude/settings.json", JSON.stringify({ hooks: { SessionStart: [] }, enabledPlugins: { "agent-skills@addy-agent-skills": true } }));
  write(".agents/skills/prokit-web/SKILL.md", "x\n");
  assert.ok(audit(root, config).problems.some((p) => p.includes("케이스 상향")), "prokit-* 스킬 변경");
  rmSync(join(root, ".agents/skills/prokit-web"), { recursive: true });
  write(".claude/skills/my-own/SKILL.md", "x\n");
  assert.ok(audit(root, config).problems.some((p) => p.includes("케이스 상향")), "설치 기록에 없는 손으로 만든 스킬");
  rmSync(join(root, ".claude/skills/my-own"), { recursive: true });
  write(".claude/settings.json", JSON.stringify({ hooks: { SessionStart: [] }, enabledPlugins: { "agent-skills@addy-agent-skills": true, "evil@somewhere": true } }));
  assert.ok(audit(root, config).problems.some((p) => p.includes("케이스 상향")), "매니페스트에 없는 플러그인");
  write(".claude/settings.json", JSON.stringify({ hooks: { SessionStart: [] }, enabledPlugins: { "agent-skills@addy-agent-skills": true } }));
  assert.deepEqual(switchProblems(), []);
  // 지금 두뇌가 none이면 전환 전 이름과 상관없이 단계 행을 보지 않는다. 열린 라운드가 없으면 기록하지 않는다
  const none = makeRepo();
  assert.equal(noteSkillsChange(none.root, loadConfig(none.root), { before: { brain: "none" }, after: { brain: "superpowers" } }), false);
});

test("두뇌를 고른 H 라운드: 설치만 바꾼 구현 행의 N/A는 받고, table --write 출력에 두뇌 줄이 나온다", () => {
  const { root, config } = brainRepo("agent-skills");
  const out = run(root, "table", "H", "--write", "--title", "스킬 구성 변경");
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /두뇌: agent-skills → 단계 행은 .*agent-skills\.md의 방법으로 한다/);
  fill(root, "N/A: 스킬 구성만 변경");
  assert.deepEqual(stageProblems(root, config), []);
});
