import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  audit, bindSession, BRAINS_DIR, close, confirmProblem, delegationCompletionProblem, evidenceProblem, loadConfig, mainUiSkill, noteSkillsChange, parseActive, renderBlock, status, usedSkills, writeTable,
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
      if (r.text.startsWith("[review] 디자인 리뷰")) evidence = critiqueRecord(root);
      if (r.text.startsWith("[review] 디자인 감사")) evidence = auditRecord(root);
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
  const row = active.rows.findIndex((r) => r.text.startsWith("[review] 디자인 리뷰"));
  const problemFor = (evidence) => {
    const rows = active.rows.map((r, i) => (i === row ? { ...r, evidence } : r));
    writeFileSync(p, renderBlock({ ...active.meta, title: active.title }, rows));
    return audit(root, config).problems.find((x) => x.startsWith(`#${row + 1} `)) ?? null;
  };
  const file = ".impeccable/critique/2026-10-22T12-30-00Z__apps-web.md";
  assert.equal(problemFor(active.rows[row].evidence), null);
  // AG5: critique를 실행하지 않고 적은 점수
  assert.match(problemFor("Design Health 40/40, P0 0, P1 0"), /리뷰 기록 파일\(impeccable은 \.impeccable\/critique\//);
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
  const auditRow = active.rows.findIndex((r) => r.text.startsWith("[review] 디자인 감사"));
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
  assert.match(auditProblem(`audit 실행함, ${report}`), /증거에 감사 결과\(impeccable 총점 N\/20, sloplint의 N FAIL, UI 스킬이 없으면 web-design-guidelines 위반 N\)가 없다/);
  writeFileSync(join(root, report), "| **Total** | | **17**/20 | Good |\n");
  assert.equal(auditProblem(`audit 17/20, ${report}`), null);
  assert.equal(auditProblem("blocked: web-design-guidelines 가져오기 실패"), null);
  // 기록을 남기지 않는 UI 스킬(hallmark): 감사 보고서에 sloplint FAIL 수가 있어야 한다
  writeFileSync(join(root, report), "sloplint: 0 FAIL, 1 REFLEX, 3 WARN across 4 file(s).\n## web-design-guidelines\n위반 2\n");
  assert.equal(auditProblem(`hallmark audit Floor 0 FAIL, Reflex 1, web-design-guidelines 위반 2, ${report}`), null);
  assert.match(auditProblem(`hallmark audit 1 FAIL, ${report}`), /보고서에 증거의 1 FAIL이 없다/);
  // UI 스킬이 없으면 web-design-guidelines 위반 수를 본다
  assert.equal(auditProblem(`web-design-guidelines 위반 2, ${report}`), null);
  assert.match(auditProblem(`web-design-guidelines 위반 5, ${report}`), /보고서에 증거의 위반 수\(5\)가 없다/);
  // 리뷰 행: hallmark는 sloplint 출력과 마감 리뷰를 tasks/evidence/에 저장한다
  const review = "tasks/evidence/ui-review-20261102-1530.md";
  writeFileSync(join(root, review), "sloplint: 0 FAIL, 1 REFLEX, 3 WARN across 4 file(s).\nfinish-review: ship\n");
  assert.equal(problemFor(`sloplint 0 FAIL, 1 REFLEX(47b waive), 마감 리뷰 ship, ${review}`), null);
  assert.match(problemFor(`sloplint 2 FAIL, ${review}`), /보고서에 증거의 2 FAIL이 없다/);
  assert.match(problemFor(`마감 리뷰 ship, ${review}`), /증거에 리뷰 결과\(점수 N\/M, sloplint의 N FAIL, 기본 AI면 게슈탈트 위반 N\)가 없다/);
  // impeccable 기록 파일이 함께 적혀 있으면 그 파일을 본다
  assert.equal(problemFor(`${review}, Design Health 31/40, ${file}`), null);
  // 옛 판 행 이름도 같은 검사를 받는다
  const legacy = active.rows.map((r, i) => (i === row ? { ...r, text: "[review] impeccable critique (대상은 화면 경로나 주소) → Design Health 점수, P0/P1 목록, .impeccable/critique/ 기록 파일 경로", evidence: "Design Health 40/40, P0 0, P1 0" } : r));
  writeFileSync(p, renderBlock({ ...active.meta, title: active.title }, legacy));
  assert.ok(audit(root, config).problems.some((x) => x.startsWith(`#${row + 1} `) && /리뷰 기록 파일/.test(x)), "옛 행 이름");
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
  for (const ok of ["사용: agent-skills:planning-and-task-breakdown → docs/plans/a.md", "사용: `agent-skills:planning-and-task-breakdown`", "사용: planning-and-task-breakdown", "사용: /planning-and-task-breakdown", "사용: tdd(추가 스킬)", "N/A: 문서만 바꿈", "사용: prokit-ui, prokit-web(a.md, b.md, c.md), agent-skills:planning-and-task-breakdown(1단계, 2단계)"])
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
  assert.deepEqual(mine().map((p) => p.replace(/^#\d+ .*?: /, "")), ["고른 과설계 방지(ponytail)의 보완 검토 결과를 덧붙인다. 예: prokit-reviewer(code): approve, max=low; ponytail-review: approve, 지적 0건"]);
  const hook = (input) => spawnSync(process.execPath, [CLI, "skill-log"], { cwd: root, input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  assert.equal(hook({ tool_name: "Read", tool_input: { file_path: "/x/README.md" } }).status, 0);
  assert.equal(hook({ tool_name: "Skill", tool_input: { skill: "prokit-dev-cycle" } }).status, 0);
  assert.equal(spawnSync(process.execPath, [CLI, "skill-log"], { cwd: root, input: "깨진 입력", encoding: "utf8" }).status, 0, "훅은 세션을 막지 않는다");
  set(review, "prokit-reviewer(code): approve, max=low; ponytail-review(full): 반영 1");
  let p = mine();
  assert.equal(p.length, 2, p.join("\n"));
  assert.ok(p.some((x) => x.includes("agent-skills:planning-and-task-breakdown를 이 라운드에서 부르거나 읽은 기록이 없다")));
  assert.ok(p.some((x) => x.includes("ponytail-review를 이 라운드에서 부른 기록이 없다")));
  hook({ tool_name: "Read", tool_input: { file_path: "/home/u/.claude/plugins/cache/addy/agent-skills/0.6/skills/planning-and-task-breakdown/SKILL.md" } });
  hook({ tool_name: "Skill", tool_input: { skill: "ponytail:ponytail-review" } });
  assert.deepEqual(mine(), []);
  // 읽은 기록 3줄. 나머지는 evidence가 행을 채운 시각 줄이다
  assert.equal(readFileSync(join(root, ".prokit/skills-used.jsonl"), "utf8").trim().split("\n").filter((l) => !/"row":/.test(l)).length, 3);
  // 다음 라운드를 기록 없이(Codex 등) 진행하면 앞 라운드 기록과 대조하지 않고 자기 신고로 본다
  write("tasks/todo.md", "# 할 일\n");
  // 새 라운드를 열 때 30일 지난 줄과 깨진 줄은 지운다(감사용으로 한 달만 남긴다)
  write(".prokit/skills-used.jsonl", `{"t":"2000-01-01T00:00:00.000Z","skill":"old"}\n깨진 줄\n${readFileSync(join(root, ".prokit/skills-used.jsonl"), "utf8")}`);
  writeTable(root, config, "D", { write: true, title: "Codex 라운드" });
  const kept = readFileSync(join(root, ".prokit/skills-used.jsonl"), "utf8").trim().split("\n").filter((l) => !/"row":/.test(l));
  assert.equal(kept.length, 4, "앞 라운드 3줄 + 새 라운드 시작 줄");
  assert.match(kept.at(-1), /"round":"Codex 라운드"/);
  const rows2 = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows;
  set(rows2.findIndex((r) => /구현 단계/.test(r.text)), "사용: agent-skills:incremental-implementation → 위임");
  set(rows2.findIndex((r) => /^\[review\] prokit-reviewer\(code\)/.test(r.text)), "prokit-reviewer(code): approve, max=low; ponytail-review: 반영 0");
  assert.deepEqual(mine(), []);
  // 이 라운드에 기록이 생기면 다시 대조한다
  hook({ tool_name: "Skill", tool_input: { skill: "prokit-verify" } });
  assert.ok(mine().some((x) => x.includes("ponytail-review를 이 라운드에서 부른 기록이 없다")), mine().join("\n"));
  // 목록 꼴이 아닌 단계 스킬(`사용: <이름>으로 …`)도 기록과 대조한다
  set(rows2.findIndex((r) => /구현 단계/.test(r.text)), "사용: agent-skills:planning-and-task-breakdown으로 조각 구현");
  assert.ok(mine().some((x) => x.includes("agent-skills:planning-and-task-breakdown를 이 라운드에서 부르거나 읽은 기록이 없다")), mine().join("\n"));
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
  assert.deepEqual(mine(), ["고른 과설계 방지(karpathy)의 보완 검토 결과를 덧붙인다. 예: prokit-reviewer(code): approve, max=low; 간결성(karpathy 기준, prokit-reviewer focus): approve, 지적 0건"]);
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
  assert.deepEqual(JSON.parse(hook('{"toolCall": 깨짐').stdout), { decision: "allow" }, "Antigravity는 깨진 입력에도 허용을 낸다");
  assert.equal(hook({ tool_name: "Edit", tool_input: { file_path: join(root, "apps/web/src/app/page.tsx"), old_string: "toolCall", new_string: "x" } }).status, 2, "편집 글이 toolCall이어도 Claude 입력은 exit 2로 막는다");
  assert.equal(hook({ tool_name: "Edit", tool_input: {} }).status, 0);
  assert.equal(hook({ tool_name: "Edit", cwd: join(root, "apps/web"), tool_input: { file_path: "src/app/page.tsx" } }).status, 2, "상대 경로는 훅 입력의 cwd 기준");
  assert.equal(edit(join(root, "..hidden/page.tsx")).status, 0, "이름이 ..로 시작해도 프로젝트 안으로 본다(규칙 밖이라 A)");
  // 프로젝트를 심볼릭 링크로 열었고 아직 없는 폴더에 새 파일을 쓸 때
  const link = `${root}-link`;
  symlinkSync(root, link);
  const viaLink = (projectDir, file) => spawnSync(process.execPath, [CLI, "edit-guard"], { cwd: tmpdir(), input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: file } }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir } }).status;
  assert.equal(viaLink(root, join(link, "apps/web/src/app/new/page.tsx")), 2);
  assert.equal(viaLink(link, join(root, "apps/web/src/app/new/page.tsx")), 2);
  // Codex apply_patch: 패치 본문의 파일 줄을 보고, 하나라도 라운드가 필요한 경로면 막는다
  const patch = (body) => hook({ tool_name: "apply_patch", cwd: root, tool_input: { command: `*** Begin Patch\n${body}\n*** End Patch` } });
  assert.equal(patch("*** Update File: docs/notes.md\n@@\n-a\n+b").status, 0);
  r = patch(`*** Update File: docs/notes.md\n@@\n-a\n+b\n*** Add File: ${join(root, "packages/api/src/lib/x.ts")}\n+x`);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /docs\/notes\.md, packages\/api\/src\/lib\/x\.ts\(케이스 D 경로\)/);
  assert.equal(patch("*** Update File: docs/a.md\n*** Move to: apps/web/src/app/b.tsx\n@@\n-a\n+b").status, 2, "옮길 곳도 본다");
  // Antigravity: exit 코드가 아니라 stdout decision으로 답하고, 출력이 없으면 막히므로 허용도 늘 적는다
  const agy = (file) => {
    const x = hook({ toolCall: { name: "edit_file", args: { Path: file } } });
    return [x.status, JSON.parse(x.stdout)];
  };
  assert.deepEqual(agy(join(root, "docs/notes.md")), [0, { decision: "allow" }]);
  const [status, out] = agy(join(root, "apps/web/src/app/page.tsx"));
  assert.equal(status, 0);
  assert.equal(out.decision, "deny");
  assert.match(out.reason, /열린 라운드 없이 apps\/web\/src\/app\/page\.tsx\(케이스 B 경로\)/);
  writeTable(root, loadConfig(root), "B", { write: true, title: "화면" });
  assert.equal(edit(join(root, "apps/web/src/app/page.tsx")).status, 0, "열린 라운드가 있으면 통과");
  assert.deepEqual(agy(join(root, "apps/web/src/app/page.tsx")), [0, { decision: "allow" }]);
});

test("셸 실행 전 확인: 이름·포트로 골라 끄는 명령(pkill, killall, pgrep·lsof 결과의 kill)은 shell-guard 훅이 exit 2로 막고, PID·프로세스 그룹 kill과 그 말을 담은 글은 막지 않는다", () => {
  const sh = (command) => spawnSync(process.execPath, [CLI, "shell-guard"], { cwd: tmpdir(), input: JSON.stringify({ tool_name: "Bash", tool_input: { command } }), encoding: "utf8" });
  for (const bad of ['kill -- -$PG; sleep 2; pkill -f "next-server" 2>/dev/null', "killall node", "sudo pkill next", "lsof -ti:3001 | xargs kill -9", "pgrep -f next | xargs -r kill", "kill $(lsof -t -iTCP:3001)", "echo x && kill -9 $(pgrep -f next-server)", "(pkill -P 123)"]) {
    const r = sh(bad);
    assert.equal(r.status, 2, bad);
    assert.match(r.stderr, /이름이나 포트로 골라 끄는 명령/);
  }
  for (const ok of ["kill -- -$(ps -o pgid= -p $PID | tr -d ' ')", "kill 38382 38514", 'grep -n "pkill" tasks/lessons.md', "lsof -nP -iTCP:3001 -sTCP:LISTEN", "pgrep -fl next-server", "pnpm dev:web"]) assert.equal(sh(ok).status, 0, ok);
  assert.equal(spawnSync(process.execPath, [CLI, "shell-guard"], { cwd: tmpdir(), input: "깨진 입력", encoding: "utf8" }).status, 0);
});

test("셸 실행 전 확인: 계층 파일을 셸(리다이렉션, sed -i, cp·mv, python·node 스크립트)로 쓰면 막고, 읽기·증거 기록·생성·포맷 명령과 performers 없는 옛 판은 막지 않는다", () => {
  const { root, write } = makeRepo();
  const config = loadConfig(root);
  const sh = (command, agent) => spawnSync(process.execPath, [CLI, "shell-guard"], { cwd: tmpdir(), input: JSON.stringify({ tool_name: "Bash", cwd: root, ...(agent ? { agent_id: `id-${agent}`, agent_type: agent } : {}), tool_input: { command } }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  const py = "python3 -c \"import pathlib; p=pathlib.Path('apps/web/src/app/page.tsx'); p.write_text(p.read_text().replace('a','b'))\"";
  assert.equal(sh(py, "prokit-ui-builder").status, 0, "performers가 없는 옛 판은 막지 않는다");
  write("skills.manifest.json", JSON.stringify({ skills: [{ skills: [] }], performers: { agents: ["prokit-ui-builder", "prokit-db-builder"], skills: {} } }));
  assert.ok(config);
  for (const bad of [py, "sed -i '' 's/a/b/' apps/web/src/app/page.tsx", "echo x > apps/web/src/app/page.tsx", "cp /tmp/a.ts packages/db/src/schema/todo.ts", `node -e "require('fs').writeFileSync('${join(root, "apps/web/src/app/page.tsx")}', '')"`, "python3 - <<'PY'\nfrom pathlib import Path\np = Path('packages/db/src/schema/todo.ts')\np.write_text(p.read_text().replace('a', 'b'))\nPY"]) {
    const r = sh(bad, "prokit-ui-builder");
    assert.equal(r.status, 2, bad);
    assert.match(r.stderr, /계층 파일\(.+\)을 셸 명령/);
  }
  for (const ok of ["sed -n 1,5p apps/web/src/app/page.tsx", "cat apps/web/src/app/page.tsx > tasks/evidence/x.txt", "pnpm test 2>&1 | tee tasks/evidence/t.txt", "grep -rn foo apps/web/src 2>/dev/null", "pnpm --filter @x/db db:generate", "pnpm exec biome check --write apps/web/src/app/page.tsx", "echo x > AGENTS.md", "apply_patch <<'EOF'\n*** Update File: apps/web/src/app/page.tsx\nnode writeFileSync(\nEOF",
    // 2026-11-03 실측 오탐: 쓰기 대상은 계층 밖이고 계층 경로는 글이나 읽기·불러오기 인자로만 나온다
    "python3 - <<'PY'\nopen('docs/plans/x.md', 'w').write('apps/web/src/app/page.tsx 를 고친다')\nPY",
    "cat >> /tmp/notes.md <<'EOF'\npython open('apps/web/src/app/page.tsx','w') 오탐\nEOF",
    `node -e 'const pg = require("./packages/db/node_modules/pg"); process.stdout.write("1")' | tee tasks/evidence/v.txt`,
    `git diff HEAD -- packages/db/src/schema/todo.ts > tasks/evidence/d.txt; node -e "process.stdout.write(require('fs').readFileSync('apps/web/src/app/page.tsx', 'utf8'))" > tasks/evidence/e.txt`,
    "node <<'JS'\nconst fs = require('fs');\nfs.writeFileSync('tasks/todo.md', fs.readFileSync('tasks/todo.md', 'utf8') + '- [ ] packages/db/src/schema/todo.ts 정리')\nJS",
  ]) assert.equal(sh(ok).status, 0, ok);
});

test("부른 스킬 기록: Codex는 Bash 명령 속 SKILL.md 경로를, Antigravity는 read_file·view_file 경로를 남긴다", () => {
  const { root } = makeRepo();
  const hook = (input) => spawnSync(process.execPath, [CLI, "skill-log"], { cwd: tmpdir(), input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  assert.equal(hook({ tool_name: "Bash", tool_input: { command: "cat .agents/skills/prokit-verify/SKILL.md '/x/agent-skills/skills/debugging-and-error-recovery/SKILL.md'; ls .agents/skills/*/SKILL.md x/SKILL.md.bak" } }).stdout, "");
  hook({ tool_name: "Bash", tool_input: { command: "ls .agents/skills" } });
  hook({ tool_name: "Bash", tool_input: { command: "cat .agents/skills/prokit-dev-cycle/references/reuse-design.md .agents/skills/prokit-dev-cycle/SKILL.md" } });
  // 출력을 버린 조각은 읽은 것이 아니다(Codex 실측: 증거를 채우기 직전 cat … > /dev/null로 기록만 남겼다). stderr만 버리면 센다
  hook({ tool_name: "Bash", tool_input: { command: "/bin/zsh -lc 'cat .agents/skills/hallmark/SKILL.md > /dev/null && cat .agents/skills/impeccable/SKILL.md 2>/dev/null; cat .agents/skills/shadcn/SKILL.md &>/dev/null || cat .agents/skills/neon/SKILL.md 1>>/dev/null'" } });
  assert.equal(hook({ toolCall: { name: "read_file", args: { Path: "/p/.agents/skills/ponytail-review/SKILL.md" } } }).stdout.trim(), "{}", "Antigravity에는 JSON 객체로 답한다");
  hook({ toolCall: { name: "view_file", args: { AbsolutePath: "/p/.agents/skills/grilling/SKILL.md" } } });
  hook({ toolCall: { name: "edit_file", args: { Path: "/p/.agents/skills/x/SKILL.md" } } });
  const skills = readFileSync(join(root, ".prokit/skills-used.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l).skill);
  assert.deepEqual(skills, ["prokit-verify", "debugging-and-error-recovery", "prokit-dev-cycle", "impeccable", "ponytail-review", "grilling"]);
});

test("부른 스킬 기록: 모든 행의 사용: 목록, 행 문구의 prokit-* 계층 스킬, prokit-web의 Next 문서를 기록과 대조한다", () => {
  const { root, write } = makeRepo();
  for (const s of ["prokit-ui", "prokit-web", "shadcn", "vercel-react-best-practices"]) write(`.agents/skills/${s}/SKILL.md`);
  const config = loadConfig(root);
  writeTable(root, config, "B", { write: true, title: "화면" });
  const impl = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows.findIndex((r) => /^구현 \(구현 단계, prokit-ui, prokit-web,/.test(r.text));
  assert.ok(impl >= 0, "B 구현 행");
  const set = (v) => {
    mkdirSync(join(root, "tasks/evidence"), { recursive: true });
    writeFileSync(join(root, "tasks/evidence/e.txt"), `${v}\n`);
    assert.equal(run(root, "evidence", String(impl + 1), "--file", "tasks/evidence/e.txt").status, 0);
  };
  const mine = () => audit(root, config).problems.filter((p) => p.startsWith(`#${impl + 1} `)).map((p) => p.replace(/^#\d+ .*?: /, ""));
  const doc = "apps/web/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md";
  // 기록이 없으면 이름만 본다: 계층 스킬이 빠졌거나, prokit-web인데 Next 문서가 없으면 거부한다
  set("사용: prokit-ui(좁은 개선). 변경: a.tsx");
  assert.match(mine()[0] ?? "", /행 문구의 prokit-web를 읽고/);
  set("사용: agent-skills:incremental-implementation, prokit-ui(포커스), prokit-web, shadcn은 새 부품 없음(기존 그대로). 변경: a.tsx");
  assert.match(mine()[0] ?? "", /Next 번들 문서 경로/);
  set("사용: prokit-ui, prokit-web, vercel-react-best-practices(bundle-conditional). Next 문서: N/A: Next API 변경 없음");
  assert.deepEqual(mine(), []);
  set(`사용: prokit-ui, prokit-web(${doc}), vercel-react-best-practices. 변경: a.tsx`);
  assert.deepEqual(mine(), []);
  // 기록이 생기면 사용: 목록의 스킬(프로젝트 스킬·플러그인 접두어)과 적은 문서를 읽은 기록이 있어야 한다. ego-browser처럼 프로젝트 스킬이 아닌 이름과 문장 속 shadcn은 보지 않는다
  const hook = (input) => spawnSync(process.execPath, [CLI, "skill-log"], { cwd: tmpdir(), input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  hook({ tool_name: "Skill", tool_input: { skill: "agent-skills:incremental-implementation" } });
  set(`사용: agent-skills:incremental-implementation, prokit-ui, prokit-web(${doc}), vercel-react-best-practices, ego-browser, shadcn은 새 부품 없음. 변경: a.tsx`);
  assert.equal(mine().length, 1);
  assert.match(mine()[0], new RegExp(`증거의 prokit-ui, prokit-web, vercel-react-best-practices, next/dist/docs/01-app/03-api-reference/04-functions/redirect\\.md를 이 라운드에서 부르거나 읽은 기록이 없다`));
  hook({ tool_name: "Read", tool_input: { file_path: join(root, ".agents/skills/prokit-ui/SKILL.md") } });
  hook({ tool_name: "Read", tool_input: { file_path: join(root, ".agents/skills/prokit-web/SKILL.md") } });
  // 스킬 폴더 안의 참조 파일도 그 스킬을 읽은 기록이다
  hook({ tool_name: "Read", tool_input: { file_path: join(root, ".agents/skills/vercel-react-best-practices/rules/bundle.md") } });
  assert.match(mine()[0] ?? "", /증거의 next\/dist\/docs\/.*redirect\.md를/);
  // 문서 폴더 맨 위만 적어도 문서 하나는 읽은 기록이 있어야 한다
  set("사용: prokit-ui, prokit-web(apps/web/node_modules/next/dist/docs/), vercel-react-best-practices. 변경: a.tsx");
  assert.match(mine()[0] ?? "", /증거의 next\/dist\/docs\/를/);
  // 괄호 안에 적은 사용: 도 목록이다
  assert.deepEqual(usedSkills("계약을 정한다(사용: prokit-api)"), ["prokit-api"]);
  assert.deepEqual(usedSkills("사용: prokit-ui(포커스(키보드)), prokit-web."), ["prokit-ui", "prokit-web"]);
  hook({ tool_name: "Read", tool_input: { file_path: join(root, doc) } });
  assert.deepEqual(mine(), []);
  // 경로 바로 뒤의 콜론은 문장 부호다(2026-11-03 실측)
  set(`사용: prokit-ui, prokit-web(${doc}: redirect를 씀), vercel-react-best-practices. 변경: a.tsx`);
  assert.deepEqual(mine(), []);
  // 기록에 없는 이름이면 기록에 있는 비슷한 이름을 보여 준다
  set(`사용: agent-skills:incremental, prokit-ui, prokit-web(${doc}). 변경: a.tsx`);
  assert.match(mine()[0] ?? "", /증거의 agent-skills:incremental를 .* 기록에 있는 비슷한 이름: incremental-implementation\./);
  // 문서 폴더를 적으면 그 아래를 읽은 기록으로 충분하다. Codex는 셸 명령 속 문서 경로가 기록이다
  set("사용: prokit-ui, prokit-web(apps/web/node_modules/next/dist/docs/01-app/). 변경: a.tsx");
  assert.deepEqual(mine(), []);
  set("사용: prokit-ui, prokit-web(next/dist/docs/01-app/…/redirect.md). 변경: a.tsx");
  assert.deepEqual(mine(), []);
  set("사용: prokit-ui, prokit-web(next/dist/docs/01-app/…/headers.md). 변경: a.tsx");
  assert.match(mine()[0] ?? "", /증거의 next\/dist\/docs\/01-app\/…\/headers\.md를/);
  hook({ tool_name: "Bash", tool_input: { command: "cat apps/web/node_modules/next/dist/docs/01-app/02-guides/caching.mdx | head" } });
  const log = readFileSync(join(root, ".prokit/skills-used.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(log.filter((e) => e.doc).map((e) => e.doc), [doc.replace("apps/web/node_modules/", ""), "next/dist/docs/01-app/02-guides/caching.mdx"]);
});

test("부른 스킬 기록: 서브에이전트가 읽은 것은 Main 기록으로 세지 않고, 스킬 폴더 참조 파일은 경로를 남겨 사용: 괄호의 참조와 대조한다", () => {
  const { root, write } = makeRepo();
  for (const s of ["prokit-ui", "prokit-web"]) write(`.agents/skills/${s}/SKILL.md`);
  write(".agents/skills/impeccable/SKILL.md");
  write(".agents/skills/impeccable/reference/craft-floor.md", "# 바닥\n1\n2\n3\n");
  const config = loadConfig(root);
  writeTable(root, config, "B", { write: true, title: "화면" });
  const impl = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows.findIndex((r) => /^구현 \(구현 단계, prokit-ui, prokit-web,/.test(r.text));
  const set = (v) => {
    mkdirSync(join(root, "tasks/evidence"), { recursive: true });
    writeFileSync(join(root, "tasks/evidence/e.txt"), `${v}\n`);
    assert.equal(run(root, "evidence", String(impl + 1), "--file", "tasks/evidence/e.txt").status, 0);
  };
  const mine = () => audit(root, config).problems.filter((p) => p.startsWith(`#${impl + 1} `)).map((p) => p.replace(/^#\d+ .*?: /, ""));
  const hook = (input) => spawnSync(process.execPath, [CLI, "skill-log"], { cwd: tmpdir(), input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  hook({ tool_name: "Skill", tool_input: { skill: "agent-skills:incremental-implementation" } });
  // 리뷰어 같은 서브에이전트의 호출에는 훅 입력에 agent_id가 붙는다
  hook({ tool_name: "Read", agent_id: "a1", agent_type: "prokit-reviewer", tool_input: { file_path: join(root, ".agents/skills/prokit-ui/SKILL.md") } });
  hook({ tool_name: "Read", tool_input: { file_path: join(root, ".agents/skills/prokit-web/SKILL.md") } });
  set("사용: prokit-ui, prokit-web. Next 문서: N/A: Next API 변경 없음");
  assert.match(mine()[0] ?? "", /증거의 prokit-ui를 이 라운드에서 부르거나 읽은 기록이 없다/);
  hook({ tool_name: "Read", tool_input: { file_path: join(root, ".agents/skills/prokit-ui/SKILL.md") } });
  assert.deepEqual(mine(), []);
  // 괄호에 그 스킬 폴더의 참조 파일을 적으면 그 파일을 읽은 기록이 있어야 한다. 폴더에 없는 경로(만든 파일 등)는 보지 않는다
  hook({ tool_name: "Read", tool_input: { file_path: join(root, ".agents/skills/impeccable/SKILL.md") } });
  set("사용: prokit-ui, prokit-web, impeccable(reference/craft-floor.md, docs/briefs/x.md). Next 문서: N/A: 없음");
  assert.match(mine()[0] ?? "", /증거의 impeccable\(reference\/craft-floor\.md\)를/);
  // 앞부분만 읽은 참조 파일은 세지 않는다(2026-11-03 실측)
  hook({ tool_name: "Read", tool_input: { file_path: join(root, ".agents/skills/impeccable/reference/craft-floor.md"), limit: 2 } });
  assert.match(mine()[0] ?? "", /증거의 impeccable\(reference\/craft-floor\.md\)를/);
  hook({ tool_name: "Read", tool_input: { file_path: join(root, ".agents/skills/impeccable/reference/craft-floor.md") } });
  assert.deepEqual(mine(), []);
  const log = readFileSync(join(root, ".prokit/skills-used.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.ok(log.some((e) => e.skill === "prokit-ui" && e.agent === "a1"));
  assert.ok(log.some((e) => e.skill === "impeccable" && e.ref === "reference/craft-floor.md"));
  assert.ok(log.some((e) => e.row === impl + 1), "evidence가 행을 채운 시각을 남긴다");
});

test("행 문구 스킬: 괄호에 이름만 적힌 프로젝트 스킬은 사용:에 있어야 하고, 앞 행을 채운 뒤 다시 읽은 기록이 있어야 한다. 바꿀 계층의 prokit-*는 diff 계층으로 정한다", () => {
  const { root, write } = makeRepo();
  for (const s of ["prokit-db", "prokit-api", "prokit-web", "prokit-ui", "neon-postgres"]) write(`.agents/skills/${s}/SKILL.md`);
  const config = loadConfig(root);
  writeTable(root, config, "E", { write: true, title: "테이블" });
  const rows = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows;
  const schema = rows.findIndex((r) => r.text.startsWith("스키마 수정 + dbGenerate")) + 1;
  const neon = rows.findIndex((r) => r.text.startsWith("[verify] 병합 전 Neon")) + 1;
  assert.ok(schema > 1);
  const set = (n, v) => {
    mkdirSync(join(root, "tasks/evidence"), { recursive: true });
    writeFileSync(join(root, "tasks/evidence/e.txt"), `${v}\n`);
    assert.equal(run(root, "evidence", String(n), "--file", "tasks/evidence/e.txt").status, 0);
  };
  const mine = (n) => audit(root, config).problems.filter((p) => p.startsWith(`#${n} `)).map((p) => p.replace(/^#\d+ .*?: /, ""));
  const hook = (input) => spawnSync(process.execPath, [CLI, "skill-log"], { cwd: tmpdir(), input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  const read = (s) => hook({ tool_name: "Read", tool_input: { file_path: join(root, `.agents/skills/${s}/SKILL.md`) } });
  read("prokit-db");
  set(1, "계획 단계에서 prokit-db를 읽음");
  set(schema, "사용: prokit-db. 변경: packages/db/src/schema/x.ts");
  assert.match(mine(schema)[0] ?? "", /prokit-db를 이 행을 하면서 읽은 기록이 없다\(#1을 채운 뒤\)/);
  read("prokit-db");
  assert.deepEqual(mine(schema), []);
  // 외부 스킬도 괄호에 이름만 적혔으면 같다(Neon 템플릿의 병합 전 브랜치 행)
  if (neon > 0) {
    set(neon, "브랜치 dev에 적용, 마이그레이션 1개");
    assert.match(mine(neon)[0] ?? "", /행 문구의 neon-postgres를 읽고/);
    read("neon-postgres");
    set(neon, "사용: neon-postgres. 브랜치 dev에 적용");
    assert.deepEqual(mine(neon), []);
  }

  const f = makeRepo();
  for (const s of ["prokit-db", "prokit-api", "prokit-web", "prokit-ui"]) f.write(`.agents/skills/${s}/SKILL.md`);
  const fc = loadConfig(f.root);
  writeTable(f.root, fc, "F", { write: true, title: "기능" });
  const plan = parseActive(readFileSync(join(f.root, "tasks/todo.md"), "utf8")).rows.findIndex((r) => r.text.startsWith("구현 계획 (계획 단계, 바꿀 계층의 prokit-*")) + 1;
  assert.ok(plan > 0);
  f.write("packages/db/src/schema/x.ts", "export const x = 1;\n");
  f.write("apps/web/src/app/x/page.tsx", "export default function P() { return null; }\n");
  mkdirSync(join(f.root, "tasks/evidence"), { recursive: true });
  writeFileSync(join(f.root, "tasks/evidence/e.txt"), "사용: prokit-db. 계획: docs/plans/x.md\n");
  assert.equal(run(f.root, "evidence", String(plan), "--file", "tasks/evidence/e.txt").status, 0);
  const fp = audit(f.root, fc).problems.filter((p) => p.startsWith(`#${plan} `));
  assert.match(fp[0] ?? "", /행 문구의 prokit-web, prokit-ui를 읽고/, "diff에 없는 계층(prokit-api)은 요구하지 않는다");
});

test("행 문구 스킬의 시각 대조는 행 문구로 짝짓는다: --upgrade로 번호가 바뀌어도 자기 채운 기록을 앞 행으로 보지 않고, 채운 기록이 없는 행은 보지 않는다", () => {
  const { root, write } = makeRepo();
  for (const s of ["prokit-ui", "prokit-web", "prokit-api"]) write(`.agents/skills/${s}/SKILL.md`);
  const config = loadConfig(root);
  writeTable(root, config, "B", { write: true, title: "화면" });
  const find = () => parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows.findIndex((r) => /^구현 \(구현 단계, prokit-ui, prokit-web,/.test(r.text)) + 1;
  const before = find();
  const hook = (input) => spawnSync(process.execPath, [CLI, "skill-log"], { cwd: tmpdir(), input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  const read = (s) => hook({ tool_name: "Read", tool_input: { file_path: join(root, `.agents/skills/${s}/SKILL.md`) } });
  read("prokit-ui");
  read("prokit-web");
  mkdirSync(join(root, "tasks/evidence"), { recursive: true });
  writeFileSync(join(root, "tasks/evidence/e.txt"), "사용: prokit-ui, prokit-web. Next 문서: N/A: 없음\n");
  assert.equal(run(root, "evidence", String(before), "--file", "tasks/evidence/e.txt").status, 0);
  write("packages/api/src/routers/x.ts", "export const x = 1;\n");
  assert.equal(run(root, "table", "F", "--write", "--upgrade").status, 0);
  const after = find();
  assert.notEqual(after, before, "상향하면 행 번호가 바뀐다");
  const mine = (n) => audit(root, config).problems.filter((p) => p.startsWith(`#${n} `) && /이 행을 하면서/.test(p));
  assert.deepEqual(mine(after), []);
  // 다른 행이 상향 전 번호(before)로 남긴 기록처럼 보여도 그 행 문구가 아니면 자기 것으로 보지 않는다
  assert.ok(!audit(root, config).problems.some((p) => /이 행을 하면서/.test(p)));
});

test("evidence: [design] 필드 위치가 틀리면 맨 앞이나 ; 뒤에 두라고 알린다", () => {
  const { root } = makeRepo();
  writeTable(root, loadConfig(root), "H", { write: true, title: "하네스" });
  mkdirSync(join(root, "tasks/evidence"), { recursive: true });
  writeFileSync(join(root, "tasks/evidence/d.txt"), "사용: x. 기존: a; 결정: b; 설정: c; 검증: d\n");
  const r = run(root, "evidence", "1", "--file", "tasks/evidence/d.txt");
  assert.match(r.stdout, /맨 앞이나 ; 뒤/);
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

test("공식 스킬 위임: 구현 단계 행은 위임 증거와 그 에이전트가 일한 기록을 요구하고, 맡은 공식 스킬은 그 에이전트가 프로젝트 판을 읽은 기록만 센다", () => {
  const { root, write } = makeRepo();
  for (const s of ["prokit-ui", "prokit-web", "vercel-react-best-practices", "neon"]) write(`.agents/skills/${s}/SKILL.md`, `---\nname: ${s}\n---\n`);
  write(".agents/skills/neon-postgres/SKILL.md", "---\nname: neon-postgres\nmetadata:\n  parent: neon\n---\n");
  write("skills.manifest.json", JSON.stringify({ skills: [{ skills: ["vercel-react-best-practices", "neon", "neon-postgres"] }], performers: { agents: ["prokit-ui-builder", "prokit-db-builder", "prokit-implementer"], skills: { "vercel-react-best-practices": ["prokit-ui-builder"], "neon-postgres": ["prokit-db-builder"] } } }));
  const config = loadConfig(root);
  writeTable(root, config, "B", { write: true, title: "화면" });
  const impl = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows.findIndex((r) => /^구현 \(구현 단계, prokit-ui, prokit-web,/.test(r.text));
  assert.ok(impl >= 0);
  const set = (v) => {
    mkdirSync(join(root, "tasks/evidence"), { recursive: true });
    writeFileSync(join(root, "tasks/evidence/e.txt"), `${v}\n`);
    assert.equal(run(root, "evidence", String(impl + 1), "--file", "tasks/evidence/e.txt").status, 0);
  };
  const mine = () => audit(root, config).problems.filter((p) => p.startsWith(`#${impl + 1} `)).map((p) => p.replace(/^#\d+ .*?: /, ""));
  const hook = (input) => spawnSync(process.execPath, [CLI, "skill-log"], { cwd: tmpdir(), input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  const read = (s, agent) => hook({ tool_name: "Read", ...(agent ? { agent_id: `id-${agent}`, agent_type: agent } : {}), tool_input: { file_path: join(root, `.agents/skills/${s}/SKILL.md`) } });
  // 기록이 없어도(자기 신고) 행 문구의 에이전트에 맡긴 증거가 있어야 한다. Main이 직접 하면 blocked로 남긴다
  set("사용: prokit-ui, prokit-web. Next 문서: N/A: 없음");
  assert.match(mine()[0] ?? "", /이 행은 prokit-ui-builder에 맡긴다.*blocked: 사유/);
  set("blocked: 맡길 에이전트 없음");
  assert.deepEqual(mine(), []);
  const done = "사용: prokit-ui, prokit-web; 위임: prokit-ui-builder(사용: vercel-react-best-practices(rerender-memo)). Next 문서: N/A: 없음";
  set(done);
  assert.deepEqual(mine(), []);
  // 기록이 생기면: Main이 읽은 계층 스킬은 세고, 위임한 에이전트가 일한 기록이 있어야 한다
  read("prokit-ui");
  read("prokit-web");
  read("vercel-react-best-practices");
  assert.match(mine()[0] ?? "", /prokit-ui-builder가 이 라운드에서 일한 기록이 없다/);
  // 에이전트가 일했어도 맡은 공식 스킬을 Main이 대신 읽은 기록은 세지 않는다
  read("prokit-ui", "prokit-ui-builder");
  assert.match(mine()[0] ?? "", /vercel-react-best-practices를 이 라운드에서 부르거나 읽은 기록이 없다.*prokit-ui-builder가 읽고 따르는 공식 스킬이라 Main이 읽은 기록은 세지 않는다/);
  // Skill 도구 호출(개인 스킬일 수 있다)과 다른 에이전트가 읽은 기록도 세지 않는다
  hook({ tool_name: "Skill", agent_id: "u", agent_type: "prokit-ui-builder", tool_input: { skill: "vercel-react-best-practices" } });
  read("vercel-react-best-practices", "prokit-implementer");
  assert.match(mine()[0] ?? "", /vercel-react-best-practices를 이 라운드에서/);
  read("vercel-react-best-practices", "prokit-ui-builder");
  assert.deepEqual(mine(), []);
  // 하위 스킬은 맡은 쪽이 상위 스킬(parent)도 읽어야 한다. Main이 읽은 상위 스킬은 세지 않는다
  set(`${done}; 위임: prokit-db-builder(사용: neon-postgres)`);
  read("neon-postgres", "prokit-db-builder");
  read("neon");
  assert.match(mine()[0] ?? "", /neon-postgres는 상위 스킬 neon부터 읽는다\(SKILL\.md의 parent\)\. prokit-db-builder가 neon 스킬을 읽은 기록이 없다/);
  read("neon", "prokit-db-builder");
  assert.deepEqual(mine(), []);
  // 배치에 없는 상위 스킬은 하위 스킬을 맡은 에이전트가 읽은 기록도 센다(사용:에 neon을 적어도 된다)
  set(`${done}; 위임: prokit-db-builder(사용: neon-postgres, neon)`);
  assert.deepEqual(mine(), []);
  const log = readFileSync(join(root, ".prokit/skills-used.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.ok(log.some((e) => e.skill === "vercel-react-best-practices" && e.agentType === "prokit-ui-builder" && e.project === true && e.tool === "Read"));
  assert.ok(log.some((e) => e.skill === "vercel-react-best-practices" && e.tool === "Skill" && !e.project));
});

test("부른 스킬 기록: Codex 셸 명령은 프로젝트 스킬 경로일 때만 프로젝트 판으로 남기고, 서브에이전트를 구별하지 못하는 도구의 기록은 자기 신고로 받는다", () => {
  const { root, write } = makeRepo();
  for (const s of ["prokit-ui", "prokit-web", "vercel-react-best-practices"]) write(`.agents/skills/${s}/SKILL.md`);
  write("skills.manifest.json", JSON.stringify({ skills: [{ skills: ["vercel-react-best-practices"] }], performers: { agents: ["prokit-ui-builder"], skills: { "vercel-react-best-practices": ["prokit-ui-builder"] } } }));
  const hook = (input) => spawnSync(process.execPath, [CLI, "skill-log"], { cwd: tmpdir(), input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  hook({ tool_name: "Bash", tool_input: { command: `cat ~/.claude/skills/vercel-react-best-practices/SKILL.md ${root}/.agents/skills/prokit-ui/SKILL.md .agents/skills/prokit-web/SKILL.md` } });
  const log = readFileSync(join(root, ".prokit/skills-used.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(log.map((e) => [e.skill, e.project === true]), [["vercel-react-best-practices", false], ["prokit-ui", true], ["prokit-web", true]]);
  // ./·../·$PWD로 시작한 상대 경로도 프로젝트 판이다. 상대 Path는 훅 입력의 cwd 기준이다
  const before = log.length;
  hook({ tool_name: "Bash", tool_input: { command: 'cat ./.agents/skills/prokit-ui/SKILL.md "$PWD/.agents/skills/prokit-web/SKILL.md" ../x/.agents/skills/vercel-react-best-practices/SKILL.md' } });
  hook({ tool_name: "Read", cwd: join(root, "apps/web"), tool_input: { file_path: "../../.agents/skills/vercel-react-best-practices/SKILL.md" } });
  hook({ tool_name: "Read", cwd: join(root, "apps/web"), tool_input: { file_path: ".agents/skills/prokit-ui/SKILL.md" } });
  const more = readFileSync(join(root, ".prokit/skills-used.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)).slice(before);
  assert.deepEqual(more.map((e) => [e.skill, e.project === true]), [["prokit-ui", true], ["prokit-web", true], ["vercel-react-best-practices", false], ["vercel-react-best-practices", true], ["prokit-ui", false]]);
  writeFileSync(join(root, ".prokit/skills-used.jsonl"), log.map((e) => JSON.stringify(e)).join("\n") + "\n");
  const config = loadConfig(root);
  writeTable(root, config, "B", { write: true, title: "Codex 화면" });
  const impl = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows.findIndex((r) => /^구현 \(구현 단계, prokit-ui, prokit-web,/.test(r.text));
  mkdirSync(join(root, "tasks/evidence"), { recursive: true });
  writeFileSync(join(root, "tasks/evidence/e.txt"), "사용: prokit-ui, prokit-web; 위임: prokit-ui-builder(사용: vercel-react-best-practices). Next 문서: N/A: 없음\n");
  assert.equal(run(root, "evidence", String(impl + 1), "--file", "tasks/evidence/e.txt").status, 0);
  const mine = () => audit(root, config).problems.filter((p) => p.startsWith(`#${impl + 1} `));
  hook({ tool_name: "Bash", tool_input: { command: "cat .agents/skills/prokit-ui/SKILL.md .agents/skills/prokit-web/SKILL.md" } });
  assert.match(mine()[0] ?? "", /vercel-react-best-practices를 이 라운드에서/, "개인 판(~/.claude/skills)을 읽은 기록은 세지 않는다");
  hook({ tool_name: "Bash", tool_input: { command: "cat .agents/skills/vercel-react-best-practices/SKILL.md" } });
  assert.deepEqual(mine(), [], "Codex는 서브에이전트를 구별하지 못해 자기 신고로 받는다");
});

test("Main 편집 차단: 열린 라운드에서 Main이 Claude Code·Codex 편집 도구로 계층 코드를 고치면 막고, 서브에이전트·계층 밖 파일·구별 값 없는 입력·옛 판은 막지 않으며, 허락한 편집을 기록한다", () => {
  const { root, write } = makeRepo();
  write("skills.manifest.json", JSON.stringify({ skills: [{ skills: [] }], performers: { agents: ["prokit-ui-builder", "prokit-implementer"], skills: {} } }));
  const config = loadConfig(root);
  const guard = (input) => spawnSync(process.execPath, [CLI, "edit-guard"], { cwd: tmpdir(), input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  const page = join(root, "apps/web/src/app/page.tsx");
  assert.match(guard({ tool_name: "Edit", tool_input: { file_path: page } }).stderr, /열린 라운드 없이/);
  writeTable(root, config, "B", { write: true, title: "화면" });
  const main = guard({ tool_name: "Edit", tool_input: { file_path: page } });
  assert.equal(main.status, 2);
  assert.match(main.stderr, /Main은 계층 코드\(apps\/web\/src\/app\/page\.tsx\)를 직접 고치지 않는다\. 서브에이전트 도구\(Claude Code Agent.*\)로 prokit-ui-builder에 맡긴다/);
  assert.equal(guard({ tool_name: "Write", agent_id: "a1", agent_type: "prokit-ui-builder", tool_input: { file_path: page } }).status, 0);
  assert.equal(guard({ tool_name: "Write", tool_input: { file_path: join(root, "docs/note.md") } }).status, 0);
  assert.equal(guard({ tool_name: "apply_patch", tool_input: { command: "*** Update File: apps/web/src/app/page.tsx\n" } }).status, 0, "turn_id가 없는 입력은 Main인지 모른다");
  // Codex는 turn_id가 늘 있고, 서브에이전트 안의 호출에 agent_id·agent_type(.codex/agents의 name)을 붙인다
  const codex = guard({ tool_name: "apply_patch", turn_id: "t1", cwd: root, tool_input: { command: "*** Update File: apps/web/src/app/page.tsx\n" } });
  assert.equal(codex.status, 2);
  assert.match(codex.stderr, /Codex spawn_agent.*prokit-ui-builder에 맡긴다/);
  assert.equal(guard({ tool_name: "apply_patch", turn_id: "t2", agent_id: "c1", agent_type: "prokit-ui-builder", cwd: root, tool_input: { command: "*** Update File: apps/web/src/app/page.tsx\n" } }).status, 0);
  const log = readFileSync(join(root, ".prokit/skills-used.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(log.filter((e) => e.edit).map((e) => [e.edit, e.agentType ?? null, e.tool]), [
    ["apps/web/src/app/page.tsx", "prokit-ui-builder", "Write"],
    ["docs/note.md", null, "Write"],
    ["apps/web/src/app/page.tsx", null, "apply_patch"],
    ["apps/web/src/app/page.tsx", "prokit-ui-builder", "apply_patch"],
  ], "막은 편집은 남기지 않는다");
  assert.deepEqual(log.filter((e) => e.edit).map((e) => e.seen === true), [false, false, false, true], "Codex 기록은 구별한 기록(seen)이다");
  rmSync(join(root, "skills.manifest.json"));
  assert.equal(guard({ tool_name: "Edit", tool_input: { file_path: page } }).status, 0, "performers가 없는 옛 판은 막지 않는다");
});

test("Antigravity 대화 묶기: invoke_subagent로 부른 이름을 다음에 시작한 대화에 묶어, 그 대화의 읽기·편집은 그 에이전트 몫으로 세고 묶지 않은 대화(Main)의 계층 편집은 막는다", () => {
  const { root, write } = makeRepo();
  write("skills.manifest.json", JSON.stringify({ skills: [{ skills: [] }], performers: { agents: ["prokit-ui-builder"], skills: {} } }));
  write(".agents/skills/shadcn/SKILL.md", "---\nname: shadcn\n---\n");
  const config = loadConfig(root);
  const cli = (cmd, input) => spawnSync(process.execPath, [CLI, cmd], { cwd: tmpdir(), input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  const page = join(root, "apps/web/src/app/page.tsx");
  writeTable(root, config, "B", { write: true, title: "화면" });
  const common = { workspacePaths: [root], transcriptPath: "/x", modelName: "m" };
  assert.equal(cli("agent-start", { ...common, conversationId: "M", lastUserInput: "화면 고쳐줘" }).stdout.trim(), "{}");
  assert.equal(cli("skill-log", { ...common, conversationId: "M", toolCall: { name: "invoke_subagent", args: { TypeName: "prokit-ui-builder", Prompt: "p" } } }).stdout.trim(), "{}");
  // 사용자 요청이 있는 대화(Main)는 묶지 않고, 세션 시작 훅을 놓친 서브에이전트 대화는 첫 도구 호출에서 묶는다
  cli("agent-start", { ...common, conversationId: "other", lastUserInput: "다른 세션" });
  cli("agent-start", { ...common, conversationId: "M", lastUserInput: "화면 고쳐줘" });
  const edit = (conv, lastUserInput = "") => JSON.parse(cli("edit-guard", { ...common, conversationId: conv, lastUserInput, toolCall: { name: "edit_file", args: { Path: page, Target: "a", Replacement: "b" } } }).stdout);
  assert.deepEqual(edit("S"), { decision: "allow" });
  assert.equal(edit("other", "다른 세션").decision, "deny", "묶지 않은 대화는 Main으로 본다");
  const main = edit("M", "화면 고쳐줘");
  assert.equal(main.decision, "deny");
  assert.match(main.reason, /Antigravity invoke_subagent.*prokit-ui-builder에 맡긴다/);
  cli("skill-log", { ...common, conversationId: "S", toolCall: { name: "view_file", args: { AbsolutePath: join(root, ".agents/skills/shadcn/SKILL.md") } } });
  const log = readFileSync(join(root, ".prokit/skills-used.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(log.filter((e) => e.edit || e.skill).map((e) => [e.edit ?? e.skill, e.agentType ?? null, e.seen === true]), [
    ["apps/web/src/app/page.tsx", "prokit-ui-builder", true],
    ["shadcn", "prokit-ui-builder", true],
  ]);
  // 부른 지 AG_BIND_MS가 지난 call과 이미 묶은 call에는 묶지 않는다
  cli("skill-log", { ...common, conversationId: "M", toolCall: { name: "invoke_subagent", args: { TypeName: "prokit-ui-builder" } } });
  bindSession(root, { conversationId: "late" }, Date.now() + 10 * 60_000);
  bindSession(root, { conversationId: "S2" });
  bindSession(root, { conversationId: "S3" });
  const bound = readFileSync(join(root, ".prokit/agent-sessions.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((x) => x.conv).map((x) => x.conv);
  assert.deepEqual(bound, ["S", "S2"]);
  // 다른 대화가 묶는 중(잠금)이면 묶지 않고, 죽은 훅이 남긴 오래된 잠금은 치운 뒤 다음 호출에서 묶는다
  const callAgain = () => cli("skill-log", { ...common, conversationId: "M", toolCall: { name: "invoke_subagent", args: { TypeName: "prokit-ui-builder" } } });
  callAgain();
  const lock = join(root, ".prokit/agent-sessions.lock");
  mkdirSync(lock);
  assert.equal(bindSession(root, { conversationId: "L" }), undefined);
  const old = new Date(Date.now() - 60_000);
  utimesSync(lock, old, old);
  assert.equal(bindSession(root, { conversationId: "L" }), undefined);
  assert.equal(existsSync(lock), false);
  assert.equal(bindSession(root, { conversationId: "L" }), "prokit-ui-builder");
  // 요청 없이 시작한 Main 대화가 남은 call에 묶여도, 요청이 있는 도구 호출은 Main으로 보고 막는다
  callAgain();
  assert.equal(bindSession(root, { conversationId: "M2" }), "prokit-ui-builder");
  assert.equal(edit("M2", "화면 고쳐줘").decision, "deny");
  // 묶지 못한 서브에이전트 대화의 읽기는 Main 몫으로 남기지 않는다
  const skills = () => readFileSync(join(root, ".prokit/skills-used.jsonl"), "utf8").split("\n").filter((l) => l.includes('"skill"')).length;
  const before = skills();
  cli("skill-log", { ...common, conversationId: "U", toolCall: { name: "view_file", args: { AbsolutePath: join(root, ".agents/skills/shadcn/SKILL.md") } } });
  assert.equal(skills(), before);
  cli("skill-log", { ...common, conversationId: "M", lastUserInput: "화면 고쳐줘", toolCall: { name: "view_file", args: { AbsolutePath: join(root, ".agents/skills/shadcn/SKILL.md") } } });
  assert.equal(skills(), before + 1, "요청이 있는 Main 읽기는 남긴다");
});

test("행 단위 위임 증거: 구현 행의 N/A·blocked는 계층 코드가 바뀌면 받지 않고, 맡은 스킬은 그 행에서 위임한 에이전트가 읽은 기록만 세며, 같은 에이전트에 맡긴 앞 행이 없으면 위임이 끝난 뒤 앞 행을 채워도 그 일을 센다", () => {
  const { root, write } = makeRepo();
  for (const s of ["prokit-ui", "prokit-web", "vercel-react-best-practices", "agent-browser"]) write(`.agents/skills/${s}/SKILL.md`, `---\nname: ${s}\n---\n`);
  write("skills.manifest.json", JSON.stringify({ skills: [{ skills: ["vercel-react-best-practices", "agent-browser"] }], performers: { agents: ["prokit-ui-builder", "prokit-runtime-checker", "prokit-implementer"], skills: { "vercel-react-best-practices": ["prokit-ui-builder", "prokit-reviewer"], "agent-browser": ["prokit-runtime-checker"] } } }));
  const config = loadConfig(root);
  writeTable(root, config, "B", { write: true, title: "화면" });
  const rows = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows;
  const at = (re) => rows.findIndex((r) => re.test(r.text)) + 1;
  const impl = at(/^구현 \(구현 단계,/);
  const runtime = at(/^\[verify\] next-dev-loop 런타임 확인/);
  const scroll = at(/^\[verify\] 휴대폰 스크롤 측정/);
  const types = at(/^\[verify\] 타입·린트·빌드/);
  assert.ok(impl && runtime && scroll && types);
  mkdirSync(join(root, "tasks/evidence"), { recursive: true });
  const set = (n, v) => {
    writeFileSync(join(root, "tasks/evidence/e.txt"), `${v}\n`);
    assert.equal(run(root, "evidence", String(n), "--file", "tasks/evidence/e.txt").status, 0);
  };
  const mine = (n) => audit(root, config).problems.filter((p) => p.startsWith(`#${n} `)).map((p) => p.replace(/^#\d+ .*?: /, ""));
  const hook = (cmd, input) => spawnSync(process.execPath, [CLI, cmd], { cwd: tmpdir(), input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  const read = (s, agent) => hook("skill-log", { tool_name: "Read", ...(agent ? { agent_id: `id-${agent}`, agent_type: agent } : {}), tool_input: { file_path: join(root, `.agents/skills/${s}/SKILL.md`) } });
  // 계층 코드가 바뀌었는데 구현 행을 건너뛰면 받지 않는다
  write("apps/web/src/app/page.tsx", "export default 1\n");
  set(impl, "N/A: 바꿀 것 없음");
  assert.match(mine(impl)[0] ?? "", /구현 행인데 이 라운드 diff에 계층 코드\(케이스 B\)가 있어 N\/A로 둘 수 없다/);
  set(impl, "blocked: 맡길 에이전트 없음");
  assert.match(mine(impl)[0] ?? "", /blocked로 둘 수 없다/);
  // 맡은 스킬을 그 행에서 위임하지 않은 에이전트(리뷰어)가 읽은 기록은 세지 않는다. 편집도 일한 기록이다
  read("prokit-ui");
  read("prokit-web");
  read("vercel-react-best-practices", "prokit-reviewer");
  hook("edit-guard", { tool_name: "Edit", agent_id: "u1", agent_type: "prokit-ui-builder", tool_input: { file_path: join(root, "apps/web/src/app/page.tsx") } });
  set(impl, "사용: prokit-ui, prokit-web; 위임: prokit-ui-builder(사용: vercel-react-best-practices). Next 문서: N/A: 없음");
  assert.match(mine(impl)[0] ?? "", /vercel-react-best-practices를 이 라운드에서.*이 행에서 위임하지 않은 에이전트가 읽은 기록은 세지 않는다/);
  read("vercel-react-best-practices", "prokit-ui-builder");
  assert.deepEqual(mine(impl), []);
  // 같은 에이전트에 맡긴 앞 행이 없으면, 위임이 끝난 뒤 Main 몫의 앞 행을 채워도 그 에이전트의 일은 이 행의 일이다(2026-11-03 실측)
  const idle = (n) => mine(n).filter((p) => /일한 기록이 없다/.test(p));
  read("agent-browser", "prokit-runtime-checker");
  set(types, "pnpm check-types exit 0");
  set(runtime, "위임: prokit-runtime-checker(사용: agent-browser) → 오류 0건");
  assert.deepEqual(idle(runtime), []);
  // 같은 에이전트에 한 번 맡겨 이어진 두 행을 채우면 그 일을 함께 센다
  set(scroll, "위임: prokit-runtime-checker(사용: agent-browser) → 측정 결과");
  assert.deepEqual(idle(scroll), []);
  // 증거를 고쳐 다시 채운 행은 처음 채운 순서로 본다: 앞 행을 다시 채워도 뒤 행이 무효가 되지 않는다
  set(types, "pnpm check-types exit 0, lint exit 0");
  set(scroll, "위임: prokit-runtime-checker(사용: agent-browser) → 측정 결과(단위 고침)");
  assert.deepEqual(idle(scroll), []);
});

test("위임 행의 시각 기준: 같은 에이전트에 맡긴 앞 행 뒤의 다른 행을 채우기 전 일은 세지 않고, 행 문구 스킬은 위임한 에이전트가 이 행 일을 시작하기 전 마지막 앞 행 뒤에 읽으면 된다", () => {
  const setup = () => {
    const { root, write } = makeRepo();
    for (const s of ["prokit-ui", "prokit-web", "vercel-react-best-practices", "agent-browser"]) write(`.agents/skills/${s}/SKILL.md`, `---\nname: ${s}\n---\n`);
    write("skills.manifest.json", JSON.stringify({ skills: [{ skills: ["vercel-react-best-practices", "agent-browser"] }], performers: { agents: ["prokit-ui-builder", "prokit-runtime-checker", "prokit-implementer"], skills: { "vercel-react-best-practices": ["prokit-ui-builder"], "agent-browser": ["prokit-runtime-checker"] } } }));
    const config = loadConfig(root);
    writeTable(root, config, "B", { write: true, title: "화면" });
    const rows = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows;
    const at = (re) => rows.findIndex((r) => re.test(r.text)) + 1;
    mkdirSync(join(root, "tasks/evidence"), { recursive: true });
    const set = (n, v) => {
      writeFileSync(join(root, "tasks/evidence/e.txt"), `${v}\n`);
      assert.equal(run(root, "evidence", String(n), "--file", "tasks/evidence/e.txt").status, 0);
    };
    const mine = (n) => audit(root, config).problems.filter((p) => p.startsWith(`#${n} `)).map((p) => p.replace(/^#\d+ .*?: /, ""));
    const hook = (cmd, input) => spawnSync(process.execPath, [CLI, cmd], { cwd: tmpdir(), input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
    const read = (s, agent) => hook("skill-log", { tool_name: "Read", ...(agent ? { agent_id: `id-${agent}`, agent_type: agent } : {}), tool_input: { file_path: join(root, `.agents/skills/${s}/SKILL.md`) } });
    return { root, write, hook, read, set, mine, impl: at(/^구현 \(구현 단계,/), runtime: at(/^\[verify\] next-dev-loop 런타임 확인/), scroll: at(/^\[verify\] 휴대폰 스크롤 측정/), types: at(/^\[verify\] 타입·린트·빌드/) };
  };
  // Main이 행 문구 스킬을 읽고 맡긴 뒤, 위임이 끝나고 앞 행(#1)을 채워도 구현 행은 받는다
  const a = setup();
  assert.ok(a.impl > 1);
  a.write("apps/web/src/app/page.tsx", "export default 1\n");
  a.read("prokit-ui");
  a.read("prokit-web");
  a.read("vercel-react-best-practices", "prokit-ui-builder");
  a.hook("edit-guard", { tool_name: "Edit", agent_id: "id-prokit-ui-builder", agent_type: "prokit-ui-builder", tool_input: { file_path: join(a.root, "apps/web/src/app/page.tsx") } });
  a.set(1, "계획");
  a.set(a.impl, "사용: prokit-ui, prokit-web; 위임: prokit-ui-builder(사용: vercel-react-best-practices). Next 문서: N/A: 없음");
  assert.deepEqual(a.mine(a.impl), []);
  // 같은 에이전트에 맡긴 앞 행(#types) 뒤의 다른 행(#runtime)을 채우기 전의 일은 뒤 행(#scroll)의 일로 세지 않는다
  const b = setup();
  assert.ok(b.types < b.runtime && b.runtime < b.scroll);
  b.read("agent-browser", "prokit-runtime-checker");
  b.set(b.types, "위임: prokit-runtime-checker(사용: agent-browser) → 측정");
  b.set(b.runtime, "N/A: 테스트");
  b.set(b.scroll, "위임: prokit-runtime-checker(사용: agent-browser) → 측정 결과");
  const idle = () => b.mine(b.scroll).filter((p) => /일한 기록이 없다/.test(p));
  assert.match(idle()[0] ?? "", new RegExp(`같은 에이전트에 맡긴 앞 행이 있고, 그 뒤의 #${b.runtime}을 채운 뒤에 한 일만`));
  b.read("agent-browser", "prokit-runtime-checker");
  assert.deepEqual(idle(), []);
});

test("행 문구 스킬의 기준은 표에서 앞에 있는 행이다. 뒤 행을 먼저 채워도 바뀌지 않고, 앞 행을 채운 뒤에도 일한 에이전트가 먼저 읽은 기록은 센다", () => {
  const setup = () => {
    const { root, write } = makeRepo();
    write(".agents/skills/neon-postgres/SKILL.md");
    write("skills.manifest.json", JSON.stringify({ skills: [{ skills: ["neon-postgres"] }], performers: { agents: ["prokit-db-builder"], skills: { "neon-postgres": ["prokit-db-builder"] } } }));
    const config = loadConfig(root);
    writeTable(root, config, "E", { write: true, title: "테이블" });
    const rows = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows;
    const neon = rows.findIndex((r) => r.text.startsWith("[verify] 병합 전 Neon")) + 1;
    const mid = rows.findIndex((r, i) => i > 0 && i + 1 < neon && r.text.startsWith("[verify]")) + 1;
    const after = rows.findIndex((r, i) => i + 1 > neon && r.text.startsWith("[verify]")) + 1;
    mkdirSync(join(root, "tasks/evidence"), { recursive: true });
    const set = (n, v) => {
      writeFileSync(join(root, "tasks/evidence/e.txt"), `${v}\n`);
      assert.equal(run(root, "evidence", String(n), "--file", "tasks/evidence/e.txt").status, 0);
    };
    const stale = () => audit(root, config).problems.filter((p) => p.startsWith(`#${neon} `) && /이 행을 하면서 읽은 기록이 없다/.test(p));
    const read = (s, main) => spawnSync(process.execPath, [CLI, "skill-log"], { cwd: tmpdir(), input: JSON.stringify({ tool_name: "Read", ...(main ? {} : { agent_id: "x1", agent_type: "prokit-db-builder" }), tool_input: { file_path: join(root, `.agents/skills/${s}/SKILL.md`) } }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
    const problems = () => audit(root, config).problems.filter((p) => p.startsWith(`#${neon} `));
    return { root, config, neon, mid, after, set, stale, read, problems };
  };
  // Neon 행은 neon 템플릿에만 있다
  if (setup().neon <= 0) return;
  // 뒤 행을 먼저 채워도 Neon 행의 기준은 표에서 앞에 있는 #1이다
  const a = setup();
  assert.ok(a.mid > 1 && a.after > a.neon);
  a.set(1, "계획");
  a.read("neon-postgres");
  a.set(a.after, "N/A: 테스트");
  a.set(a.neon, "사용: neon-postgres. 브랜치 dev에 적용");
  assert.deepEqual(a.stale(), []);
  // 앞 행(mid)을 채우기 전에 읽고 그 뒤로 일하지 않았으면 세지 않는다. 같은 에이전트(agent_id)가 그 뒤에도 일했으면 센다
  const b = setup();
  b.set(1, "계획");
  b.read("neon-postgres");
  b.set(b.mid, "N/A: 테스트");
  b.set(b.neon, "사용: neon-postgres. 브랜치 dev에 적용");
  assert.equal(b.stale().length, 1);
  b.read("prokit-db");
  assert.deepEqual(b.stale(), []);
  // Neon 적용 행은 Main 몫이다(행 문구에 맡길 에이전트가 없고 위임하지 않았다). neon-postgres를 맡는 에이전트가 있어도 Main이 읽은 기록을 센다(2026-11-03 실측)
  const c = setup();
  c.set(1, "계획");
  c.read("neon-postgres", true);
  c.set(c.neon, "사용: neon-postgres. 브랜치 dev에 적용");
  assert.deepEqual(c.problems(), []);
  // 그 읽기는 "Main이 맡긴 스킬을 직접 읽었다" 경고도 내지 않는다. 같은 행을 에이전트에 맡기면 Main 몫이 아니라 경고한다
  const mainWarned = () => (audit(c.root, c.config).warnings ?? []).some((w) => w.startsWith("Main이 에이전트에 맡긴 공식 스킬을 직접 읽었다: neon-postgres"));
  assert.equal(mainWarned(), false);
  c.set(c.neon, "위임: prokit-db-builder(사용: neon-postgres). 브랜치 dev에 적용");
  assert.equal(mainWarned(), true);
});

test("행 일 이름의 공식 스킬과 리뷰 focus의 공식 스킬은 맡는 쪽이 읽어야 하고, 맡았지만 읽지 않은 스킬과 Main이 읽은 맡긴 스킬은 경고만 한다", () => {
  const { root, write } = makeRepo();
  const official = ["impeccable", "web-design-guidelines", "shadcn", "neon", "neon-postgres", "next-cache-components-optimizer", "turborepo"];
  for (const s of official) write(`.agents/skills/${s}/SKILL.md`, `---\nname: ${s}\n${s === "neon-postgres" ? "parent: neon\n" : ""}---\n`);
  write("skills.manifest.json", JSON.stringify({ skills: [{ skills: official }], performers: { agents: ["prokit-ui-builder", "prokit-db-builder", "prokit-implementer"], skills: { "web-design-guidelines": ["prokit-reviewer"], shadcn: ["prokit-ui-builder", "prokit-reviewer"], "neon-postgres": ["prokit-db-builder", "prokit-reviewer"], "next-cache-components-optimizer": ["prokit-ui-builder"], turborepo: ["prokit-ui-builder"] } } }));
  const config = loadConfig(root);
  writeTable(root, config, "B", { write: true, title: "화면" });
  const rows = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows;
  const row = rows.findIndex((r) => r.text.startsWith("[review] 디자인 감사와 web-design-guidelines")) + 1;
  assert.ok(row);
  const set = (n, v) => {
    writeFileSync(join(root, "tasks/evidence/e.txt"), `${v}\n`);
    assert.equal(run(root, "evidence", String(n), "--file", "tasks/evidence/e.txt").status, 0);
  };
  const mine = (n) => audit(root, config).problems.filter((p) => p.startsWith(`#${n} `)).map((p) => p.replace(/^#\d+ .*?→ [^:]*: /, ""));
  const warnings = () => audit(root, config).warnings ?? [];
  const hook = (cmd, input) => spawnSync(process.execPath, [CLI, cmd], { cwd: tmpdir(), input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  const read = (s, agent) => hook("skill-log", { tool_name: "Read", ...(agent ? { agent_id: `id-${agent}`, agent_type: agent } : {}), tool_input: { file_path: join(root, `.agents/skills/${s}/SKILL.md`) } });
  const evidence = auditRecord(root);
  // 훅 기록이 없으면 행 일 이름의 스킬(impeccable, web-design-guidelines)을 사용:에 적은 자기 신고로 본다. 괄호 안 조건의 스킬은 보지 않는다
  set(row, evidence);
  assert.match(mine(row)[0] ?? "", /행 문구의 web-design-guidelines, impeccable를 읽고 따른 뒤 증거에 사용:/);
  // 훅 기록이 있으면 맡는 쪽의 읽은 기록을 본다. Main이 읽은 web-design-guidelines는 세지 않고 경고한다
  read("impeccable");
  read("web-design-guidelines");
  set(row, evidence);
  assert.match(mine(row)[0] ?? "", /행 문구의 web-design-guidelines\(prokit-reviewer\)를 이 라운드에서 맡는 쪽\(괄호\)이 읽은 기록이 없다/);
  assert.ok(warnings().some((w) => w.startsWith("Main이 에이전트에 맡긴 공식 스킬을 직접 읽었다: web-design-guidelines(prokit-reviewer 몫)")));
  // ui focus는 리뷰어가 shadcn도 읽어야 한다
  read("web-design-guidelines", "prokit-reviewer");
  assert.match(mine(row)[0] ?? "", /prokit-reviewer\(ui\)가 읽는 shadcn를 이 라운드에서 리뷰어가 읽은 기록이 없다/);
  read("shadcn", "prokit-reviewer");
  assert.deepEqual(mine(row), []);
  // 일한 에이전트가 읽지 않은 맡은 스킬은 경고만 한다. Next 설정을 켜야 생기는 스킬은 그 설정이 있을 때만 알린다
  hook("edit-guard", { tool_name: "Edit", agent_id: "u1", agent_type: "prokit-ui-builder", tool_input: { file_path: join(root, "apps/web/src/app/page.tsx") } });
  const unread = () => warnings().find((w) => w.startsWith("이 라운드에서 일한 에이전트가 읽지 않은 맡은 공식 스킬")) ?? "";
  assert.match(unread(), /prokit-ui-builder: shadcn[.;]/);
  assert.doesNotMatch(unread(), /next-cache-components-optimizer/);
  // 리뷰어는 focus마다 읽는 스킬이 달라 알리지 않는다(맡은 neon-postgres를 읽지 않았어도)
  assert.doesNotMatch(unread(), /prokit-reviewer/);
  write("apps/web/next.config.ts", "export default { cacheComponents: true };\n");
  assert.match(unread(), /prokit-ui-builder: shadcn, next-cache-components-optimizer\./);
  // 경로로 상황이 정해지는 스킬(turborepo)은 이 라운드 diff에 그 파일이 있을 때만 알린다
  write("turbo.json", "{}\n");
  assert.match(unread(), /prokit-ui-builder: shadcn, next-cache-components-optimizer, turborepo\./);
});

test("디자인 단계 행(주 UI 스킬)은 고른 주 UI 스킬을 읽어야 하고, 기록이 없으면 impeccable, none이면 읽을 스킬이 없다", () => {
  const { root, write } = makeRepo();
  for (const s of ["impeccable", "hallmark"]) write(`.agents/skills/${s}/SKILL.md`, `---\nname: ${s}\n---\n`);
  write("skills.manifest.json", JSON.stringify({ skills: [], uiSkills: { impeccable: { skills: [{ skills: ["impeccable"] }] }, hallmark: { skills: [{ skills: ["hallmark"] }] } }, performers: { agents: [], skills: {} } }));
  const config = loadConfig(root);
  writeTable(root, config, "B", { write: true, title: "화면" });
  const row = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows.findIndex((r) => r.text.startsWith("화면 브리프 확정 (주 UI 스킬의 설계 단계")) + 1;
  assert.ok(row);
  const set = (v) => {
    mkdirSync(join(root, "tasks/evidence"), { recursive: true });
    writeFileSync(join(root, "tasks/evidence/e.txt"), `${v}\n`);
    assert.equal(run(root, "evidence", String(row), "--file", "tasks/evidence/e.txt").status, 0);
  };
  const mine = (cfg) => audit(root, cfg).problems.filter((p) => p.startsWith(`#${row} `)).join("\n");
  set("docs/briefs/landing.md (사용자 확인 2026-11-02)");
  const { uiSkill, ...unset } = config;
  assert.match(mine(unset), /행 문구의 impeccable를 읽고/, "기록이 없으면 impeccable");
  assert.match(mine({ ...config, uiSkill: ["hallmark", "impeccable"] }), /행 문구의 hallmark를 읽고/, "첫 값이 주 UI 스킬");
  assert.doesNotMatch(mine({ ...config, uiSkill: "none" }), /행 문구의/);
  // 훅 기록이 있으면 이 라운드에서 Main이 주 UI 스킬을 읽은 기록을 본다
  const hook = (input) => spawnSync(process.execPath, [CLI, "skill-log"], { cwd: tmpdir(), input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  hook({ tool_name: "Read", tool_input: { file_path: join(root, ".agents/skills/impeccable/SKILL.md") } });
  set("사용: impeccable, docs/briefs/landing.md (사용자 확인 2026-11-02)");
  assert.match(mine({ ...config, uiSkill: "hallmark" }), /행 문구의 hallmark\(Main\)를 이 라운드에서 맡는 쪽\(괄호\)이 읽은 기록이 없다/);
  hook({ tool_name: "Read", tool_input: { file_path: join(root, ".agents/skills/hallmark/SKILL.md") } });
  assert.equal(mine({ ...config, uiSkill: "hallmark" }), "");
});

test("db focus 리뷰는 설치된 Neon 스킬(상위 스킬 포함)을 리뷰어가 읽어야 한다", () => {
  const { root, write } = makeRepo();
  for (const s of ["neon", "neon-postgres"]) write(`.agents/skills/${s}/SKILL.md`, `---\nname: ${s}\n${s === "neon-postgres" ? "parent: neon\n" : ""}---\n`);
  write("skills.manifest.json", JSON.stringify({ skills: [{ skills: ["neon", "neon-postgres"] }], performers: { agents: ["prokit-db-builder"], skills: { "neon-postgres": ["prokit-db-builder", "prokit-reviewer"] } } }));
  const config = loadConfig(root);
  // table --write가 리뷰 지시에 넣을 스킬(상위 스킬 포함)을 미리 알린다
  const out = run(root, "table", "E", "--write", "--title", "스키마");
  assert.equal(out.status, 0, out.stderr);
  const row = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows.findIndex((r) => /^\[review\] prokit-reviewer\(db\)/.test(r.text)) + 1;
  assert.ok(row);
  assert.match(out.stdout, new RegExp(`리뷰 지시에 넣을 공식 스킬[^\\n]*\\n(?: {2}#.*\\n)* {2}#${row} prokit-reviewer\\(db\\): \\.agents/skills/neon/SKILL\\.md, \\.agents/skills/neon-postgres/SKILL\\.md`));
  assert.match(out.stdout, /증거 꼴[^\n]*\n {2}전문 에이전트에 맡긴 행: 위임: <에이전트>\(사용: /);
  // 라운드 중간에 붙은 리뷰 행도 보이게 status가 같은 안내를 낸다
  assert.match(run(root, "status").stdout, new RegExp(`리뷰 지시에 넣을 공식 스킬[^\\n]*\\n(?: {2}#.*\\n)* {2}#${row} prokit-reviewer\\(db\\)`));
  mkdirSync(join(root, "tasks/evidence"), { recursive: true });
  writeFileSync(join(root, "tasks/evidence/e.txt"), "prokit-reviewer(db): approve, max=none\n");
  const hook = (input) => spawnSync(process.execPath, [CLI, "skill-log"], { cwd: tmpdir(), input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  const read = (s, agent) => hook({ tool_name: "Read", agent_id: `id-${agent}`, agent_type: agent, tool_input: { file_path: join(root, `.agents/skills/${s}/SKILL.md`) } });
  const mine = () => audit(root, config).problems.filter((p) => p.startsWith(`#${row} `));
  read("neon-postgres", "prokit-db-builder");
  assert.equal(run(root, "evidence", String(row), "--file", "tasks/evidence/e.txt").status, 0);
  assert.match(mine()[0] ?? "", /prokit-reviewer\(db\)가 읽는 neon, neon-postgres를 이 라운드에서 리뷰어가 읽은 기록이 없다/);
  read("neon", "prokit-reviewer");
  read("neon-postgres", "prokit-reviewer");
  assert.deepEqual(mine(), []);
});

test("F 계층별 위임: 계층별 구현 행의 N/A는 그 계층 코드만 보고, 계층 에이전트 여럿을 적은 구현 방식 행은 diff의 계층마다 위임을 요구한다", () => {
  const { root, write } = makeRepo();
  write("skills.manifest.json", JSON.stringify({ skills: [{ skills: [] }], performers: { agents: ["prokit-ui-builder", "prokit-api-builder", "prokit-db-builder", "prokit-implementer"], skills: {} } }));
  const config = loadConfig(root);
  writeTable(root, config, "F", { write: true, title: "기능" });
  const rows = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows;
  const at = (re) => rows.findIndex((r) => re.test(r.text)) + 1;
  const db = at(/^스키마 수정 \+ dbGenerate/);
  const ui = at(/^구현 \(구현 단계, prokit-ui/);
  const method = at(/^구현 방식 \(구현 단계/);
  assert.ok(db && ui && method);
  mkdirSync(join(root, "tasks/evidence"), { recursive: true });
  const set = (n, v) => {
    writeFileSync(join(root, "tasks/evidence/e.txt"), `${v}\n`);
    assert.equal(run(root, "evidence", String(n), "--file", "tasks/evidence/e.txt").status, 0);
  };
  const mine = (n) => audit(root, config).problems.filter((p) => p.startsWith(`#${n} `)).map((p) => p.replace(/^#\d+ .*?: /, ""));
  // 화면만 바꾼 F: DB 구현 행은 N/A로 두고, 화면 구현 행은 N/A로 둘 수 없다
  write("apps/web/src/app/page.tsx", "export default 1\n");
  set(db, "N/A: 스키마를 바꾸지 않음");
  assert.deepEqual(mine(db).filter((p) => /둘 수 없다/.test(p)), []);
  set(ui, "N/A: 없음");
  assert.match(mine(ui)[0] ?? "", /계층 코드\(케이스 B\)가 있어 N\/A로 둘 수 없다/);
  set(method, "위임: prokit-ui-builder → 화면");
  assert.deepEqual(mine(method).filter((p) => /계층마다/.test(p)), []);
  // 서버 코드도 바꾸면 구현 방식 행에 서버 에이전트 위임도 있어야 하고, DB 행 N/A는 그대로 받는다
  write("packages/api/src/routers/todo.ts", "export const x = 1\n");
  assert.match(mine(method)[0] ?? "", /prokit-api-builder의 위임: <에이전트>.*DB, 서버, 화면 순서/);
  assert.deepEqual(mine(db).filter((p) => /둘 수 없다/.test(p)), []);
  set(method, "위임: prokit-api-builder → 서버; 위임: prokit-ui-builder → 화면");
  assert.deepEqual(mine(method).filter((p) => /계층마다/.test(p)), []);
});

test("한 행에 계층 에이전트와 리뷰어를 함께 맡기면 리뷰어가 읽은 맡은 스킬도 세고, 위임받은 쪽이 읽은 prokit-*도 세며, 가운뎃점으로 이은 사용: 이름도 대조한다", () => {
  const { root, write } = makeRepo();
  for (const s of ["prokit-ui", "prokit-verify", "vercel-composition-patterns"]) write(`.agents/skills/${s}/SKILL.md`, `---\nname: ${s}\n---\n`);
  write("skills.manifest.json", JSON.stringify({ skills: [{ skills: ["vercel-composition-patterns"] }], performers: { agents: ["prokit-ui-builder", "prokit-runtime-checker", "prokit-implementer"], skills: { "vercel-composition-patterns": ["prokit-ui-builder", "prokit-reviewer"] } } }));
  const config = loadConfig(root);
  writeTable(root, config, "B", { write: true, title: "화면" });
  const row = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows.findIndex((r) => /^\[review\] prokit-reviewer\(code\)/.test(r.text)) + 1;
  assert.ok(row);
  mkdirSync(join(root, "tasks/evidence"), { recursive: true });
  const set = (v) => {
    writeFileSync(join(root, "tasks/evidence/e.txt"), `${v}\n`);
    assert.equal(run(root, "evidence", String(row), "--file", "tasks/evidence/e.txt").status, 0);
  };
  const unread = () => audit(root, config).problems.filter((p) => p.startsWith(`#${row} `) && /기록이 없다/.test(p));
  const hook = (cmd, input) => spawnSync(process.execPath, [CLI, cmd], { cwd: tmpdir(), input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  const read = (s, agent) => hook("skill-log", { tool_name: "Read", agent_id: `id-${agent}`, agent_type: agent, tool_input: { file_path: join(root, `.agents/skills/${s}/SKILL.md`) } });
  write("apps/web/src/app/page.tsx", "export default 1\n");
  hook("edit-guard", { tool_name: "Edit", agent_id: "u1", agent_type: "prokit-ui-builder", tool_input: { file_path: join(root, "apps/web/src/app/page.tsx") } });
  read("prokit-ui", "prokit-ui-builder");
  read("vercel-composition-patterns", "prokit-reviewer");
  set("prokit-reviewer(code)(사용: vercel-composition-patterns): approve, max_severity=low. 반영 1: 위임: prokit-ui-builder(사용: prokit-ui) → 한 줄");
  assert.deepEqual(unread(), []);
  // 가운뎃점으로 이은 이름도 하나씩 대조한다(파일 경로는 이름이 아니라 뺀다)
  set("prokit-reviewer(code)(사용: vercel-composition-patterns): approve. 반영 1: 위임: prokit-ui-builder(사용: prokit-ui·prokit-verify·references/browser.md) → 한 줄");
  assert.match(unread()[0] ?? "", /증거의 prokit-verify를 이 라운드에서 부르거나 읽은 기록이 없다/);
  read("prokit-verify", "prokit-ui-builder");
  assert.deepEqual(unread(), []);
  // 구현 행에 리뷰어 이름만 나온 것("지적 반영")은 리뷰어를 맡긴 것이 아니다: 리뷰어가 읽은 기록으로 화면 에이전트의 스킬을 세지 않는다
  const impl = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows.findIndex((r) => /^구현 \(구현 단계,/.test(r.text)) + 1;
  writeFileSync(join(root, "tasks/evidence/e.txt"), "사용: prokit-ui; 위임: prokit-ui-builder(사용: vercel-composition-patterns) → prokit-reviewer(code) 지적 반영\n");
  assert.equal(run(root, "evidence", String(impl), "--file", "tasks/evidence/e.txt").status, 0);
  assert.ok(audit(root, config).problems.some((p) => p.startsWith(`#${impl} `) && /vercel-composition-patterns를 이 라운드에서 부르거나 읽은 기록이 없다/.test(p)));
  // 같은 에이전트에 두 번 맡긴 행: 맡긴 쪽 이름을 한 번만 적는다
  write(".agents/skills/web-design-guidelines/SKILL.md", "---\nname: web-design-guidelines\n---\n");
  write("skills.manifest.json", JSON.stringify({ skills: [{ skills: ["vercel-composition-patterns", "web-design-guidelines"] }], performers: { agents: ["prokit-ui-builder", "prokit-runtime-checker", "prokit-implementer"], skills: { "vercel-composition-patterns": ["prokit-ui-builder", "prokit-reviewer"], "web-design-guidelines": ["prokit-reviewer"] } } }));
  read("web-design-guidelines", "prokit-reviewer");
  writeFileSync(join(root, "tasks/evidence/e.txt"), "사용: prokit-ui; 위임: prokit-ui-builder(사용: prokit-ui); 위임: prokit-ui-builder(사용: web-design-guidelines)\n");
  assert.equal(run(root, "evidence", String(impl), "--file", "tasks/evidence/e.txt").status, 0);
  const twice = audit(root, config).problems.find((p) => p.startsWith(`#${impl} `));
  assert.match(twice, /web-design-guidelines는 이 행에서 위임한 prokit-ui-builder가 맡는 스킬이 아니다/);
});

test("매니페스트가 Claude 플러그인으로도 설치하는 공식 스킬은 <플러그인>:<이름> Skill 호출도 센다(이름만 부른 호출은 개인 스킬일 수 있어 세지 않는다)", () => {
  const { root, write } = makeRepo();
  write(".agents/skills/skill-creator/SKILL.md", "---\nname: skill-creator\n---\n");
  write("skills.manifest.json", JSON.stringify({ skills: [{ skills: ["skill-creator"] }], performers: { agents: ["prokit-implementer"], skills: {} }, claude: { plugins: ["skill-creator@claude-plugins-official"] } }));
  const config = loadConfig(root);
  writeTable(root, config, "H", { write: true, title: "스킬" });
  const row = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows.findIndex((r) => /^스킬을 바꿨으면 skill-creator eval/.test(r.text)) + 1;
  assert.ok(row);
  mkdirSync(join(root, "tasks/evidence"), { recursive: true });
  writeFileSync(join(root, "tasks/evidence/e.txt"), "벤치마크 tasks/evidence/bench.json\n");
  assert.equal(run(root, "evidence", String(row), "--file", "tasks/evidence/e.txt").status, 0);
  const call = (skill) => spawnSync(process.execPath, [CLI, "skill-log"], { cwd: tmpdir(), input: JSON.stringify({ tool_name: "Skill", tool_input: { skill } }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  const mine = () => audit(root, config).problems.filter((p) => p.startsWith(`#${row} `) && /skill-creator/.test(p));
  call("skill-creator");
  assert.match(mine()[0] ?? "", /행 문구의 skill-creator\(Main\)를 이 라운드에서 맡는 쪽\(괄호\)이 읽은 기록이 없다/);
  call("skill-creator:skill-creator");
  assert.deepEqual(mine(), []);
});

test("F 구현 방식 행은 다른 행에서 위임한 계층 에이전트의 일한 기록을 그 행에서 보고, 이 행에서만 맡긴 에이전트는 그대로 본다", () => {
  const { root, write } = makeRepo();
  write("skills.manifest.json", JSON.stringify({ skills: [{ skills: [] }], performers: { agents: ["prokit-ui-builder", "prokit-api-builder", "prokit-db-builder", "prokit-implementer"], skills: {} } }));
  const config = loadConfig(root);
  writeTable(root, config, "F", { write: true, title: "기능" });
  const rows = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows;
  const at = (re) => rows.findIndex((r) => re.test(r.text)) + 1;
  const db = at(/^스키마 수정 \+ dbGenerate/);
  const ui = at(/^구현 \(구현 단계, prokit-ui/);
  const types = at(/^\[verify\] 타입·린트·빌드/);
  const method = at(/^구현 방식 \(구현 단계/);
  assert.ok(db && ui && types && method);
  mkdirSync(join(root, "tasks/evidence"), { recursive: true });
  const set = (n, v) => {
    writeFileSync(join(root, "tasks/evidence/e.txt"), `${v}\n`);
    assert.equal(run(root, "evidence", String(n), "--file", "tasks/evidence/e.txt").status, 0);
  };
  const idle = () => audit(root, config).problems.filter((p) => p.startsWith(`#${method} `) && /일한 기록이 없다/.test(p));
  const edit = (agent, f) => {
    write(f, "export const x = 1\n");
    spawnSync(process.execPath, [CLI, "edit-guard"], { cwd: tmpdir(), input: JSON.stringify({ tool_name: "Edit", agent_id: `id-${agent}`, agent_type: agent, tool_input: { file_path: join(root, f) } }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  };
  edit("prokit-db-builder", "packages/db/src/schema/todo.ts");
  set(db, "위임: prokit-db-builder → 스키마");
  edit("prokit-ui-builder", "apps/web/src/app/page.tsx");
  set(ui, "위임: prokit-ui-builder → 화면");
  set(types, "pnpm check-types exit 0");
  // 계층 행이 끝난 뒤 모아 적어도 그 계층 행에서 일한 기록을 센다
  set(method, "위임: prokit-db-builder → 스키마 행; 위임: prokit-ui-builder → 화면 행");
  assert.deepEqual(idle(), []);
  // 다른 행에서 맡기지 않은 에이전트는 이 행에서 일한 기록을 본다
  set(method, "위임: prokit-db-builder → 스키마 행; 위임: prokit-ui-builder → 화면 행; 위임: prokit-implementer → 설정");
  assert.match(idle()[0] ?? "", /prokit-implementer가/);
});

test("공식 스킬 SKILL.md를 Read limit이나 read_file EndLine으로 앞부분만 읽으면 경고하고, 끝까지 닿는 읽기가 같은 쪽에 있으면 알리지 않는다", () => {
  const { root, write } = makeRepo();
  write(".agents/skills/shadcn/SKILL.md", "---\nname: shadcn\n---\n1\n2\n3\n4\n5\n");
  write("skills.manifest.json", JSON.stringify({ skills: [{ skills: ["shadcn"] }], performers: { agents: ["prokit-ui-builder"], skills: { shadcn: ["prokit-ui-builder"] } } }));
  const config = loadConfig(root);
  writeTable(root, config, "B", { write: true, title: "화면" });
  const read = (extra) => spawnSync(process.execPath, [CLI, "skill-log"], { cwd: tmpdir(), input: JSON.stringify({ tool_name: "Read", agent_id: "u1", agent_type: "prokit-ui-builder", tool_input: { file_path: join(root, ".agents/skills/shadcn/SKILL.md"), ...extra } }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  const partial = () => (audit(root, config).warnings ?? []).find((w) => w.startsWith("공식 스킬의 SKILL.md를 앞부분만 읽었다")) ?? "";
  read({ limit: 3 });
  assert.match(partial(), /shadcn\(prokit-ui-builder\)/);
  // 파일 줄 수(8줄)에 닿는 limit은 끝까지 읽은 것이다. 나눠 읽은 마지막 조각도 끝에 닿는다
  read({ offset: 4, limit: 5 });
  assert.equal(partial(), "");
  // Antigravity read_file은 EndLine까지 읽는다(실측: 긴 파일도 100줄까지만 읽는 일이 잦다)
  const ag = (args) => spawnSync(process.execPath, [CLI, "skill-log"], { cwd: tmpdir(), input: JSON.stringify({ conversationId: "M", lastUserInput: "화면 만들어줘", toolCall: { name: "read_file", args: { Path: join(root, ".agents/skills/shadcn/SKILL.md"), ...args } } }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  ag({ StartLine: 1, EndLine: 3 });
  assert.match(partial(), /shadcn\(Main\)/);
  ag({ StartLine: 4, EndLine: 100 });
  assert.equal(partial(), "");
});

test("증거에 적은 tasks/evidence/ 스크린샷을 아무도 이미지로 열지 않았으면 경고하고, 묶음·별표 경로도 펼쳐 대조한다", () => {
  const { root, write } = makeRepo();
  write(".agents/skills/prokit-verify/SKILL.md", "---\nname: prokit-verify\n---\n");
  const config = loadConfig(root);
  writeTable(root, config, "B", { write: true, title: "화면" });
  const row = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows.findIndex((r) => /^\[verify\] 재확인 1회/.test(r.text)) + 1;
  assert.ok(row);
  for (const f of ["a-desktop.png", "a-mobile.png", "b-1.png", "b-2.png"]) write(`tasks/evidence/T1/${f}`, "png");
  const hook = (file, agent) => spawnSync(process.execPath, [CLI, "skill-log"], { cwd: tmpdir(), input: JSON.stringify({ tool_name: "Read", ...(agent ? { agent_id: "c1", agent_type: agent } : {}), tool_input: { file_path: join(root, file) } }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  const unseen = () => (audit(root, config).warnings ?? []).find((w) => w.startsWith("증거에 적은 스크린샷 가운데")) ?? "";
  hook(".agents/skills/prokit-verify/SKILL.md");
  writeFileSync(join(root, "tasks/evidence/e.txt"), "사용: prokit-verify. 스크린샷 tasks/evidence/T1/a-{desktop,mobile}.png, tasks/evidence/T1/b-*.png, tasks/evidence/T1/없음.png\n");
  assert.equal(run(root, "evidence", String(row), "--file", "tasks/evidence/e.txt").status, 0);
  // 없는 파일은 보지 않는다
  assert.match(unseen(), /a-desktop\.png, tasks\/evidence\/T1\/a-mobile\.png, tasks\/evidence\/T1\/b-1\.png, tasks\/evidence\/T1\/b-2\.png\./);
  hook("tasks/evidence/T1/a-desktop.png", "prokit-runtime-checker");
  hook("tasks/evidence/T1/a-mobile.png");
  hook("tasks/evidence/T1/b-1.png", "prokit-runtime-checker");
  assert.match(unseen(), /없는 것: tasks\/evidence\/T1\/b-2\.png\./);
  hook("tasks/evidence/T1/b-2.png", "prokit-runtime-checker");
  assert.equal(unseen(), "");
});

test("degraded: 서브에이전트를 구별하지 못한 라운드에서만 Main 직접을 받고, 코드 리뷰를 건너뛰면 받지 않으며, 사유가 없으면 형식 오류다", () => {
  const { root, write } = makeRepo();
  for (const s of ["prokit-ui", "prokit-web"]) write(`.agents/skills/${s}/SKILL.md`, `---\nname: ${s}\n---\n`);
  write("skills.manifest.json", JSON.stringify({ skills: [{ skills: [] }], performers: { agents: ["prokit-ui-builder", "prokit-implementer"], skills: {} } }));
  const config = loadConfig(root);
  writeTable(root, config, "B", { write: true, title: "화면" });
  const rows = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows;
  const at = (re) => rows.findIndex((r) => re.test(r.text)) + 1;
  const impl = at(/^구현 \(구현 단계,/);
  const review = at(/^\[review\] prokit-reviewer\(code\)/);
  assert.ok(impl && review);
  mkdirSync(join(root, "tasks/evidence"), { recursive: true });
  const set = (n, v) => {
    writeFileSync(join(root, "tasks/evidence/e.txt"), `${v}\n`);
    return run(root, "evidence", String(n), "--file", "tasks/evidence/e.txt").status;
  };
  const mine = (n) => audit(root, config).problems.filter((p) => p.startsWith(`#${n} `)).map((p) => p.replace(/^#\d+ .*?: /, ""));
  write("apps/web/src/app/page.tsx", "export default 1\n");
  assert.match(evidenceProblem("degraded"), /degraded에 사유가 없다/);
  assert.equal(evidenceProblem("degraded: Main 직접(Grok Build)"), null);
  // 훅 기록이 없는 라운드(구별하지 못한 호스트)는 받는다
  set(impl, "degraded: Main 직접(Grok Build); 사용: prokit-ui, prokit-web. Next 문서: N/A: 없음");
  assert.deepEqual(mine(impl), []);
  // 코드 리뷰를 건너뛰면 받지 않는다
  set(review, "N/A: 생략");
  assert.match(mine(impl)[0] ?? "", /fresh prokit-reviewer\(code·db\) 리뷰를 받은 라운드에서만/);
  set(review, "prokit-reviewer(code): approve, max=none");
  assert.deepEqual(mine(impl), []);
  // 훅 기록이 있는 라운드는 받지 않는다. 구별 값이 없는 셸 읽기(Claude Code Bash)여도 훅을 설치한 호스트다
  spawnSync(process.execPath, [CLI, "skill-log"], { cwd: tmpdir(), input: JSON.stringify({ tool_name: "Bash", tool_input: { command: "cat .agents/skills/prokit-ui/SKILL.md" } }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  assert.match(mine(impl)[0] ?? "", /이 라운드는 훅 기록이 있다/);
  // 리뷰 행이 code가 아닌 db(E)나 하네스 변경 리뷰(H)여도 그 리뷰를 센다
  const { root: r2, write: w2 } = makeRepo();
  w2("skills.manifest.json", JSON.stringify({ skills: [{ skills: [] }], performers: { agents: ["prokit-db-builder", "prokit-implementer"], skills: {} } }));
  const c2 = loadConfig(r2);
  writeTable(r2, c2, "E", { write: true, title: "DB" });
  const e2 = parseActive(readFileSync(join(r2, "tasks/todo.md"), "utf8")).rows;
  const dbImpl = e2.findIndex((r) => /^스키마 수정 \+ dbGenerate/.test(r.text)) + 1;
  w2("packages/db/src/schema/todo.ts", "export const x = 1\n");
  writeFileSync(join(r2, "tasks/evidence.txt"), "degraded: Main 직접(Grok Build)\n");
  assert.equal(run(r2, "evidence", String(dbImpl), "--file", "tasks/evidence.txt").status, 0);
  assert.deepEqual(audit(r2, c2).problems.filter((p) => p.startsWith(`#${dbImpl} `) && /degraded|리뷰/.test(p)), []);
});

test("계층 파일은 그 계층 에이전트만 편집하고(인증 파일은 서버 몫), 계층 밖 수행자는 계층 밖 파일만 고친다", () => {
  const { root, write } = makeRepo();
  write("skills.manifest.json", JSON.stringify({ skills: [{ skills: [] }], performers: { agents: ["prokit-ui-builder", "prokit-api-builder", "prokit-db-builder", "prokit-implementer"], skills: {} } }));
  const config = loadConfig(root);
  writeTable(root, config, "F", { write: true, title: "기능" });
  const guard = (agent, file) => spawnSync(process.execPath, [CLI, "edit-guard"], { cwd: tmpdir(), input: JSON.stringify({ tool_name: "Edit", agent_id: `id-${agent}`, agent_type: agent, tool_input: { file_path: join(root, file) } }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  const schema = "packages/db/src/schema/todo.ts";
  const ui = guard("prokit-ui-builder", schema);
  assert.equal(ui.status, 2);
  assert.match(ui.stderr, /prokit-ui-builder는 다른 계층 에이전트가 맡는 파일\(packages\/db\/src\/schema\/todo\.ts\)을 고치지 않는다.*prokit-db-builder/);
  assert.equal(guard("prokit-db-builder", schema).status, 0);
  assert.equal(guard("prokit-ui-builder", "apps/web/src/app/page.tsx").status, 0);
  const impl = guard("prokit-implementer", schema);
  assert.equal(impl.status, 2, "계층 밖 수행자도 계층 파일은 고치지 못한다");
  assert.match(impl.stderr, /prokit-implementer는 .*prokit-db-builder/);
  assert.equal(guard("prokit-implementer", "AGENTS.md").status, 0, "계층 밖 파일은 계층 밖 수행자가 고친다");
  // 인증 파일은 계층 규칙 밖이어도 서버 에이전트 몫이다
  assert.equal(guard("prokit-api-builder", "apps/web/src/lib/auth-client.ts").status, 0);
  assert.equal(guard("prokit-ui-builder", "apps/web/src/lib/auth-client.ts").status, 2);
});

test("performers.layers로 더한 프로젝트 에이전트는 그 계층 파일을 고치고, 그 계층 에이전트 대신 위임받을 수 있다", () => {
  const { root, write } = makeRepo();
  write("skills.manifest.json", JSON.stringify({ skills: [{ skills: [] }], performers: { agents: ["prokit-ui-builder", "prokit-db-builder", "prokit-preset-implementer"], layers: { B: ["prokit-preset-implementer"] }, skills: {} } }));
  const config = loadConfig(root);
  writeTable(root, config, "B", { write: true, title: "화면" });
  const guard = (agent, file) => spawnSync(process.execPath, [CLI, "edit-guard"], { cwd: tmpdir(), input: JSON.stringify({ tool_name: "Edit", ...(agent ? { agent_id: `id-${agent}`, agent_type: agent } : {}), tool_input: { file_path: join(root, file) } }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  const page = "apps/web/src/app/page.tsx";
  assert.equal(guard("prokit-preset-implementer", page).status, 0);
  assert.equal(guard("prokit-ui-builder", page).status, 0, "계층 에이전트도 그대로 고친다");
  assert.equal(guard("prokit-preset-implementer", "packages/db/src/schema/todo.ts").status, 2, "더하지 않은 계층은 고치지 못한다");
  const main = guard(null, page);
  assert.equal(main.status, 2);
  assert.match(main.stderr, /prokit-ui-builder·prokit-preset-implementer에 맡긴다/);
  // 화면 구현 행(문구에 prokit-ui-builder)은 더한 에이전트의 위임도 받는다
  const impl = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows.findIndex((r) => r.text.startsWith("구현 (구현 단계, prokit-ui")) + 1;
  assert.ok(impl > 0);
  write(page, "export default 1\n");
  mkdirSync(join(root, "tasks/evidence"), { recursive: true });
  const set = (v) => {
    writeFileSync(join(root, "tasks/evidence/e.txt"), `${v}\n`);
    assert.equal(run(root, "evidence", String(impl), "--file", "tasks/evidence/e.txt").status, 0);
    return audit(root, config).problems.filter((p) => p.startsWith(`#${impl} `)).join("\n");
  };
  assert.doesNotMatch(set("위임: prokit-preset-implementer(사용: prokit-ui, prokit-web. Next 문서: N/A: 없음) → 화면"), /이 행은 .*에 맡긴다/);
  assert.match(set("위임: prokit-db-builder(사용: 없음) → 화면"), /이 행은 prokit-ui-builder·prokit-preset-implementer에 맡긴다/);
});

test("--upgrade는 판이 바뀌어 문구만 달라진 행을 단계 이름으로 짝지어 증거와 채운 시각을 옮긴다", () => {
  const { root, write } = makeRepo();
  const config = loadConfig(root);
  writeTable(root, config, "H", { write: true, title: "갱신" });
  const p = join(root, config.todoPath);
  const impl = parseActive(readFileSync(p, "utf8")).rows.findIndex((r) => r.text.startsWith("구현 (")) + 1;
  write("tasks/evidence.txt", "위임: prokit-implementer(사용: 없음) → 스크립트 반영\n");
  assert.equal(run(root, "evidence", String(impl), "--file", "tasks/evidence.txt").status, 0);
  // 옛 판으로 연 표: 구현 행 문구가 지금 판과 다르다
  const active = parseActive(readFileSync(p, "utf8"));
  const newText = active.rows[impl - 1].text;
  const oldText = "구현 (옛 판 문구) → 사용한 스킬과 변경 파일 요약 또는 N/A: 사유";
  writeFileSync(p, renderBlock({ ...active.meta, title: active.title }, active.rows.map((r, i) => (i === impl - 1 ? { ...r, text: oldText } : r))));
  const log = join(root, ".prokit/skills-used.jsonl");
  writeFileSync(log, readFileSync(log, "utf8").replace(JSON.stringify(newText), JSON.stringify(oldText)));
  assert.equal(run(root, "table", "H", "--write", "--upgrade").status, 0);
  const rows = parseActive(readFileSync(p, "utf8")).rows;
  assert.equal(rows.filter((r) => r.text.startsWith("구현 (")).length, 1, "구현 행이 둘이 되지 않는다");
  assert.match(rows.find((r) => r.text === newText).evidence, /prokit-implementer/);
  assert.ok(readFileSync(log, "utf8").includes(JSON.stringify(newText)), "새 문구로 채운 시각을 남긴다");
});

test("prokit-runtime-checker는 tasks/evidence/에만 쓴다", () => {
  const { root } = makeRepo();
  const guard = (file) => spawnSync(process.execPath, [CLI, "edit-guard"], { cwd: tmpdir(), input: JSON.stringify({ tool_name: "Write", agent_id: "id-rc", agent_type: "prokit-runtime-checker", tool_input: { file_path: join(root, file) } }), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  assert.equal(guard("tasks/evidence/run.md").status, 0);
  const out = guard("AGENTS.md");
  assert.equal(out.status, 2);
  assert.match(out.stderr, /prokit-runtime-checker는 tasks\/evidence\/에 확인 기록과 스크린샷만 쓴다\(AGENTS\.md\)/);
});

test("audit은 편집 기록이 없는 계층 파일(셸 편집)을 경고로만 알린다", () => {
  const { root, git, write } = makeRepo();
  write("packages/api/src/routers/todo.ts", "a\n");
  write("packages/api/src/routers/new.ts", "a\n");
  write("packages/api/src/routers/old.ts", "a\n");
  write("apps/web/src/fonts/a.woff2", "a\n");
  git("add", "-A");
  git("commit", "-qm", "api");
  const config = loadConfig(root);
  writeTable(root, config, "D", { write: true, title: "api" });
  write("packages/api/src/routers/todo.ts", "b\n");
  write("packages/api/src/routers/new.ts", "b\n");
  write("packages/db/src/migrations/0001.sql", "x\n");
  write("apps/web/src/fonts/a.woff2", "b\n");
  write("packages/api/src/routers/old.ts", "b\n");
  const first = Date.now();
  const edit = { t: new Date(first).toISOString(), edit: "packages/api/src/routers/new.ts", tool: "Edit", agentType: "prokit-api-builder", agent: "a1", seen: true };
  mkdirSync(join(root, ".prokit"), { recursive: true });
  writeFileSync(join(root, ".prokit/skills-used.jsonl"), `${JSON.stringify(edit)}\n`);
  // todo.ts는 첫 편집 기록 뒤, old.ts는 그 전(편집 기록 훅이 생기기 전)에 바뀌었다
  utimesSync(join(root, "packages/api/src/routers/todo.ts"), new Date(first + 5000), new Date(first + 5000));
  utimesSync(join(root, "packages/api/src/routers/old.ts"), new Date(first - 5000), new Date(first - 5000));
  const r = audit(root, config);
  assert.equal(r.warnings?.length, 1);
  assert.match(r.warnings[0], /^편집 기록이 없는 계층 파일: packages\/api\/src\/routers\/todo\.ts\./);
  assert.ok(!r.problems.some((p) => p.includes("편집 기록이 없는")), "막지 않는다");
});

test("위임 안내 예시는 계층 파일이 없는 H 라운드에서 prokit-implementer를 보인다", () => {
  const { root, write } = makeRepo();
  write("skills.manifest.json", JSON.stringify({ skills: [{ skills: [] }], performers: { agents: ["prokit-ui-builder", "prokit-api-builder", "prokit-db-builder", "prokit-implementer"], skills: {} } }));
  const config = loadConfig(root);
  writeTable(root, config, "H", { write: true, title: "하네스" });
  write(".prokit/skills-used.jsonl", `${JSON.stringify({ t: new Date().toISOString(), skill: "prokit-dev-cycle", tool: "Skill" })}\n`);
  const impl = parseActive(readFileSync(join(root, config.todoPath), "utf8")).rows.findIndex((r) => r.text.startsWith("구현 (")) + 1;
  write("tasks/evidence.txt", "스크립트 반영\n");
  run(root, "evidence", String(impl), "--file", "tasks/evidence.txt");
  const p = audit(root, config).problems.find((x) => x.startsWith(`#${impl} `));
  assert.match(p, /증거에 위임: prokit-implementer\(사용:/);
});

test("주 UI 스킬: 카탈로그 항목의 스킬을 보고, none이면 카탈로그 none 항목(기본 AI가 참고하는 스킬)이다", () => {
  const catalog = { hallmark: { skills: [{ skills: ["hallmark"] }] }, none: { skills: [{ skills: ["frontend-design"] }] } };
  assert.deepEqual(mainUiSkill({}, catalog), ["impeccable"], "기록이 없으면 impeccable");
  assert.deepEqual(mainUiSkill({ uiSkill: ["hallmark", "impeccable"] }, catalog), ["hallmark"]);
  assert.deepEqual(mainUiSkill({ uiSkill: "none" }, catalog), ["frontend-design"]);
  assert.deepEqual(mainUiSkill({ uiSkill: "none" }), [], "none 항목이 없는 옛 매니페스트는 읽을 스킬이 없다");
});
