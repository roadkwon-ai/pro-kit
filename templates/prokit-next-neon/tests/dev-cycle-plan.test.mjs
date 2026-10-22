import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { audit, close, loadConfig, PLAN_ANALYSIS_ROW, PLAN_DOC_ROW, PLAN_REVIEW_ROW, parseActive, parsePlan, planCheck, planSig, renderBlock, status, TASK_PLAN_ROW, TASK_REVIEW_ROW, writeTable } from "../files/scripts/dev-cycle.mjs";
import { auditRecord, critiqueRecord, makeRepo, TEMPLATE_FILES } from "./helpers.mjs";

const CLI = join(TEMPLATE_FILES, "scripts/dev-cycle.mjs");
const run = (root, ...args) => spawnSync(process.execPath, [CLI, ...args], { cwd: root, encoding: "utf8" });
const CONFIRMED = "사용자가 결과를 확인했다(2026-10-23)";

// 진행 계획(tasks/plan.md). rows: [id, 제목, 상태, 기록]. sig: 기본은 진행 계획 라운드를 닫은 지문, false면 없음, 문자열이면 그 값
const planText = (rows, sig = planSig(rows.map(([id, title]) => ({ id, title })))) =>
  `# 진행 계획\n\n<!-- dev-cycle:plan doc=docs/plans/p.md${sig ? ` sig=${sig}` : ""} -->\n## 진행 계획: 예약 서비스 전환\n| Task | 제목 | 상태 | 기록 |\n|---|---|---|---|\n${rows
    .map(([id, t, s, r = ""]) => `| ${id} | ${t} | ${s} | ${r} |`)
    .join("\n")}\n<!-- dev-cycle:plan-end -->\n`;

function project(rows, sig) {
  const repo = makeRepo({ name: "dc-plan-" });
  mkdirSync(join(repo.root, "tasks"), { recursive: true });
  writeFileSync(join(repo.root, "tasks/plan.md"), planText(rows, sig));
  return { ...repo, config: loadConfig(repo.root) };
}
const plan = (root) => parsePlan(readFileSync(join(root, "tasks/plan.md"), "utf8")).tasks;
// 라운드를 닫은 뒤의 커밋(prokit-dev-cycle 5절). Task 게이트는 tasks/plan.md가 커밋돼 있어야 연다.
const commit = (root) => {
  spawnSync("git", ["add", "-A"], { cwd: root });
  spawnSync("git", ["commit", "-qm", "round", "--allow-empty"], { cwd: root });
};

// 활성 라운드의 빈 칸을 채운다. 사용자 확인 행만 다른 값이다(진행 계획 라운드는 사용자가 본 Task 구성의 지문을 함께 적는다).
function fill(root, value = "pnpm check-types → exit 0") {
  const config = loadConfig(root);
  const p = join(root, config.todoPath);
  const md = readFileSync(p, "utf8");
  const a = parseActive(md);
  const planPath = join(root, config.planPath);
  const tasks = a.rows.some((r) => r.text === PLAN_DOC_ROW) && existsSync(planPath) && parsePlan(readFileSync(planPath, "utf8"))?.tasks;
  const special = (r) =>
    r.text.startsWith("[confirm]") ? (tasks ? `${CONFIRMED} sig=${planSig(tasks)}` : CONFIRMED)
    : r.text === TASK_PLAN_ROW && !/^(blocked|미실행)/.test(value) ? "docs/plans/2026-10-23-task.md"
    : r.text === PLAN_ANALYSIS_ROW ? "docs/prokit/analysis.md"
    : r.text === PLAN_DOC_ROW ? "docs/plans/p.md, pnpm dev-cycle plan exit 0"
    : r.text.includes("prokit-reviewer(plan)") && !/^(blocked|미실행)/.test(value) ? "prokit-reviewer(plan): approve, max=none, 지적 0"
    : r.text.startsWith("[design]") && !/^(blocked|미실행)/.test(value) ? "기존: 없음; 결정: 새로; 설정: 변경 없음; 검증: 회귀 검사"
    : r.text.startsWith("[review] impeccable critique") && !/^(blocked|미실행)/.test(value) ? critiqueRecord(root)
    : r.text.startsWith("[review] impeccable audit") && !/^(blocked|미실행)/.test(value) ? auditRecord(root)
    : value;
  const rows = a.rows.map((r) => ({ ...r, evidence: r.evidence || special(r) }));
  writeFileSync(p, md.slice(0, a.start) + renderBlock({ ...a.meta, title: a.title }, rows) + md.slice(a.end));
}

test("Task 게이트: 앞 Task가 끝나야 다음 Task 라운드가 열리고, close가 그 Task를 완료로 기록한다", () => {
  const { root, config } = project([["T1", "경로 규칙 맞추기", "대기"], ["T2", "회원 모델 옮기기", "대기"]]);
  assert.throws(() => writeTable(root, config, "A", { write: true, title: "T2", task: "T2" }), /앞 Task가 끝나지 않았다: T1\(대기\)/);
  commit(root);
  writeTable(root, config, "A", { write: true, title: "T1 경로 규칙", task: "T1" });
  assert.match(readFileSync(join(root, config.todoPath), "utf8"), /<!-- dev-cycle:start case=A [^>]* task=T1 -->/);
  assert.equal(plan(root)[0].state, "진행");
  assert.match(status(root, config).line, /^라운드 A\(T1\) "T1 경로 규칙"/);
  fill(root);
  assert.deepEqual(audit(root, config).problems, []);
  const r = close(root, config, new Date("2026-10-23T03:00:00Z"));
  assert.equal(r.ok, true, JSON.stringify(r));
  const [t1, t2] = plan(root);
  assert.equal(t1.state, "완료");
  assert.match(t1.record, /^tasks\/archive\/2026-10-23-T1-경로-규칙\.md$/);
  assert.equal(t2.state, "대기");
  assert.deepEqual(planCheck(root, config).problems, []);
  assert.equal(planCheck(root, config).next.id, "T2");
  assert.throws(() => writeTable(root, config, "A", { write: true, title: "T1 다시", task: "T1" }), /T1는 이미 완료이다/);
  commit(root);
  writeTable(root, config, "A", { write: true, title: "T2 회원 모델", task: "T2" });
  assert.equal(plan(root)[1].state, "진행");
});

test("부분 완료: close --partial은 Task를 진행으로 두어 다음 Task를 막고, 같은 Task를 다시 열어 끝낸다", () => {
  const { root, config } = project([["T1", "인증 옮기기", "대기"], ["T2", "화면 옮기기", "대기"]]);
  commit(root);
  writeTable(root, config, "A", { write: true, title: "T1 인증", task: "T1" });
  fill(root, "blocked: 외부 OAuth 앱 승인 대기");
  assert.equal(close(root, config).ok, false, "blocked가 있으면 --partial 없이는 닫지 않는다");
  assert.equal(close(root, config, new Date(), { partial: true }).ok, true);
  const t1 = plan(root)[0];
  assert.equal(t1.state, "진행");
  assert.match(readFileSync(join(root, t1.record), "utf8"), /<!-- dev-cycle:archived closed=\S+ partial=true case=A [^>]*task=T1 -->/);
  assert.throws(() => writeTable(root, config, "A", { write: true, title: "T2", task: "T2" }), /T1\(진행\)/);
  commit(root);
  writeTable(root, config, "A", { write: true, title: "T1 인증 마무리", task: "T1" });
  fill(root);
  assert.equal(close(root, config).ok, true);
  const done = plan(root)[0];
  assert.equal(done.state, "완료");
  assert.equal(done.record.split(", ").length, 2, "부분 완료 기록 뒤에 마지막 기록을 더한다");
  assert.deepEqual(planCheck(root, config).problems, []);
});

test("손으로 고친 완료와 형식 오류는 plan·audit이 잡고, 그동안 Task 라운드를 열지 않는다", () => {
  const { root, config } = project([["T1", "a", "완료"], ["T2", "b", "대기"]]);
  assert.match(planCheck(root, config).problems.join("\n"), /T1 "a": 완료인데 기록 칸에 보관 파일이 없다/);
  assert.throws(() => writeTable(root, config, "A", { write: true, title: "T2", task: "T2" }), /진행 계획에 문제가 있다/);
  // 다른 Task의 보관 파일이나 archiveDir 밖 파일을 가리켜도 완료가 아니다.
  mkdirSync(join(root, "tasks/archive"), { recursive: true });
  writeFileSync(join(root, "tasks/archive/x.md"), "<!-- dev-cycle:archived closed=2026-10-23 case=A task=T9 -->\n");
  writeFileSync(join(root, "tasks/plan.md"), planText([["T1", "a", "완료", "tasks/archive/x.md"], ["T2", "b", "대기"]]));
  assert.match(planCheck(root, config).problems.join("\n"), /T9|T1의 라운드가 아니다/);
  writeFileSync(join(root, "tasks/plan.md"), planText([["T1", "a", "완료", "README.md"], ["T2", "b", "대기"]]));
  assert.match(planCheck(root, config).problems.join("\n"), /tasks\/archive 아래의 파일이 아니다/);
  // --task 없이 연 라운드도 audit이 진행 계획 문제를 알린다.
  writeTable(root, config, "A", { write: true, title: "버그" });
  fill(root);
  assert.ok(audit(root, config).problems.some((p) => p.startsWith("진행 계획: T1")));
  for (const [rows, re] of [
    [[["T1", "a", "끝"]], /상태는 대기·진행·완료·제외 중 하나다/],
    [[["T1", "a", "대기"], ["T1", "b", "대기"]], /T1가 두 번 있다/],
    [[["T1", "a", "진행"], ["T2", "b", "진행"]], /진행 중인 Task가 둘 이상이다/],
    [[["T1", "a", "대기"], ["T2", "b", "완료", "tasks/archive/x.md"]], /T2 "b": 앞 Task가 끝나지 않았는데 완료이다/],
    [[["T1", "a", "제외"]], /제외는 기록 칸에 "제외: 사유/],
    [[], /Task 행이 없다/],
  ]) {
    writeFileSync(join(root, "tasks/plan.md"), planText(rows));
    assert.match(planCheck(root, config).problems.join("\n"), re, JSON.stringify(rows));
  }
});

test("제외한 Task는 건너뛰고, --task 없이 연 라운드는 Task를 끝내지 않는다", () => {
  const { root, config } = project([["T1", "결제 붙이기", "제외", "제외: 이번 전환 범위 밖 (사용자, 2026-10-23)"], ["T2", "예약 화면", "대기"]]);
  assert.deepEqual(planCheck(root, config).problems, []);
  writeTable(root, config, "A", { write: true, title: "오타 수정" });
  fill(root);
  assert.equal(close(root, config).ok, true);
  assert.equal(plan(root)[1].state, "대기", "Task 라운드가 아니면 계획을 바꾸지 않는다");
  commit(root);
  writeTable(root, config, "A", { write: true, title: "T2 예약 화면", task: "T2" });
  assert.equal(plan(root)[1].state, "진행");
  // 뒤쪽 Task를 먼저 제외해도 문제가 아니다. 다음 Task는 남은 앞 Task다.
  const later = project([["T1", "a", "대기"], ["T2", "b", "제외", "제외: 범위 밖 (사용자, 2026-10-23)"], ["T3", "c", "대기"]]);
  assert.deepEqual(planCheck(later.root, later.config).problems, []);
  assert.equal(planCheck(later.root, later.config).next.id, "T1");
  assert.throws(() => writeTable(later.root, later.config, "A", { write: true, title: "T3", task: "T3" }), /앞 Task가 끝나지 않았다: T1\(대기\)/);
});

test("CLI: plan은 표와 다음 Task를 보여 주고 문제가 있으면 exit 1, status는 진행 계획과 기존 코드 경로를 덧붙인다", () => {
  const { root, config } = project([["T1", "a", "대기"], ["T2", "b", "대기"]]);
  const r = run(root, "plan");
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^진행 계획: 예약 서비스 전환 \(docs\/plans\/p\.md\)$/m);
  assert.match(r.stdout, /^다음: T1 "a" → pnpm dev-cycle table <케이스> --write --title "T1 …" --task T1$/m);
  writeFileSync(join(root, ".dev-cycle.json"), JSON.stringify({ ...JSON.parse(readFileSync(join(root, ".dev-cycle.json"), "utf8")), legacy: { path: "../old-php" } }));
  const s = run(root, "status");
  assert.match(s.stdout, /^진행 계획: 0\/2 끝남 — 다음 T1 "a"\(대기\)/m);
  assert.match(s.stdout, /^기존 코드\(읽기 전용 참조\): \.\.\/old-php$/m);
  assert.equal(run(root, "table", "A", "--write", "--task", "X1").status, 2, "Task 이름 형식이 틀리면 사용법 오류");
  assert.match(run(root, "table", "A", "--write", "--title", "T2", "--task", "T2").stderr, /앞 Task가 끝나지 않았다/);
  writeFileSync(join(root, "tasks/plan.md"), planText([["T1", "a", "끝"]]));
  assert.equal(run(root, "plan").status, 1);
  const none = makeRepo({ name: "dc-plan-none-" });
  assert.match(run(none.root, "plan").stdout, /진행 계획 없음/);
  assert.match(run(none.root, "table", "A", "--write", "--task", "T1").stderr, /진행 계획\(tasks\/plan\.md\)이 있어야 한다/);
  assert.equal(config.planPath, "tasks/plan.md");
});

test("계획 표 경계: T1·T10을 구분하고, 블록 밖 예시 행과 CRLF 줄바꿈을 지키며, 대기 뒤의 진행은 문제로 본다", () => {
  const { root, config } = project([]);
  const rows = [["T1", "a", "대기"], ["T2", "b", "대기"], ["T10", "c", "대기"]];
  const example = "예: | T1 | 예시 | 대기 | |\n\n";
  writeFileSync(join(root, "tasks/plan.md"), (example + planText(rows)).replace(/\n/g, "\r\n"));
  assert.deepEqual(planCheck(root, config).problems, []);
  commit(root);
  writeTable(root, config, "A", { write: true, title: "T1 a", task: "T1" });
  const text = readFileSync(join(root, "tasks/plan.md"), "utf8");
  assert.ok(text.startsWith("예: | T1 | 예시 | 대기 | |\r\n"), "블록 밖 예시 행은 그대로다");
  assert.match(text, /\| T1 \| a \| 진행 \| \|\r\n/, "CRLF를 지킨다");
  assert.match(text, /\| T10 \| c \| 대기 \| +\|\r\n/, "T10은 T1로 보지 않는다");
  fill(root);
  // --partial을 줘도 blocked·미실행이 없으면 완료다.
  assert.equal(close(root, config, new Date(), { partial: true }).ok, true);
  const [t1] = plan(root);
  assert.equal(t1.state, "완료");
  assert.doesNotMatch(readFileSync(join(root, t1.record), "utf8"), /partial=true/);
  writeFileSync(join(root, "tasks/plan.md"), planText([["T1", "a", "대기"], ["T2", "b", "진행"]]));
  assert.match(planCheck(root, config).problems.join("\n"), /T2 "b": 앞 Task가 끝나지 않았는데 진행이다/);
  assert.match(run(root, "table", "A", "--write", "--task", "T1").stderr, /진행 계획에 문제가 있다/);
});

test("보관 전에 계획을 고칠 수 없으면 라운드를 닫지 않는다", () => {
  const { root, config } = project([["T1", "a", "대기"]]);
  commit(root);
  writeTable(root, config, "A", { write: true, title: "T1 a", task: "T1" });
  fill(root);
  // 라운드 중에 Task 행이 지워지면 audit이 막는다(라운드는 그대로 남아 다시 고칠 수 있다).
  writeFileSync(join(root, "tasks/plan.md"), planText([["T2", "b", "대기"]]));
  const r = close(root, config);
  assert.equal(r.ok, false);
  assert.match(r.problems.join("\n"), /이 라운드의 Task T1가 없다/);
  assert.ok(parseActive(readFileSync(join(root, config.todoPath), "utf8")), "라운드가 남아 있다");
});

test("Task 라운드: 세부 계획·계획 리뷰 행을 맨 앞에 두고 audit이 필수로 보며, F처럼 계획 리뷰가 이미 있으면 한 번만 둔다", () => {
  const { root, config } = project([["T1", "a", "대기"], ["T2", "b", "대기"]]);
  commit(root);
  writeTable(root, config, "A", { write: true, title: "T1 a", task: "T1" });
  const p = join(root, config.todoPath);
  let a = parseActive(readFileSync(p, "utf8"));
  assert.deepEqual(a.rows.slice(0, 2).map((r) => r.text), [TASK_PLAN_ROW, TASK_REVIEW_ROW]);
  fill(root);
  a = parseActive(readFileSync(p, "utf8"));
  // 계획 문서 경로가 아니거나 N/A면 통과하지 않는다.
  for (const bad of ["N/A: 작은 일", "계획 세움"]) {
    const rows = a.rows.map((r) => (r.text === TASK_PLAN_ROW ? { ...r, evidence: bad } : r));
    writeFileSync(p, renderBlock({ ...a.meta, title: a.title }, rows));
    assert.ok(audit(root, config).problems.some((x) => x.includes("Task 세부 계획 증거는 계획 문서 경로")), bad);
  }
  // 행을 지우면 필수 행 누락이다.
  writeFileSync(p, renderBlock({ ...a.meta, title: a.title }, a.rows.slice(1)));
  assert.ok(audit(root, config).problems.some((x) => x.startsWith("필수 행 누락: [plan] Task 세부 계획")));
  writeFileSync(p, renderBlock({ ...a.meta, title: a.title }, a.rows));
  assert.deepEqual(audit(root, config).problems, []);
  // --upgrade해도 Task 행은 맨 앞에 남고 채운 증거를 지킨다.
  writeTable(root, config, "F", { write: true, upgrade: true });
  a = parseActive(readFileSync(p, "utf8"));
  assert.equal(a.meta.task, "T1");
  assert.equal(a.rows[0].text, TASK_PLAN_ROW);
  assert.equal(a.rows[0].evidence, "docs/plans/2026-10-23-task.md");
  assert.equal(a.rows.filter((r) => r.text.includes("prokit-reviewer(plan)")).length, 1, "F의 계획 리뷰 행이 있으면 Task 리뷰 행을 더 두지 않는다");
});

test("다른 도구의 계획 문서: dev-cycle:plan 블록이 없는 tasks/plan.md(agent-skills /plan 기본 경로)는 라운드를 막지 않고, plan·--task는 그 사실을 알린다", () => {
  const { root, config } = project([]);
  writeFileSync(join(root, "tasks/plan.md"), "# Implementation Plan\n\n- [ ] Task 1: 로그인\n");
  const chk = planCheck(root, config);
  assert.equal(chk.plan, null);
  assert.deepEqual(chk.problems, []);
  writeTable(root, config, "A", { write: true, title: "오타 수정" });
  fill(root);
  assert.deepEqual(audit(root, config).problems, [], "Task 라운드가 아니면 막지 않는다");
  assert.match(status(root, config).line, /^진행 계획: tasks\/plan\.md에 dev-cycle:plan 블록이 없다/m);
  const r = run(root, "plan");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^진행 계획 없음: .*블록이 없다/m);
  assert.throws(() => writeTable(root, config, "A", { title: "T1", task: "T1" }), /진행 계획\(tasks\/plan\.md\)이 있어야 한다: .*블록이 없다/);
});

test("들여쓴 Task 표: 읽은 행의 상태를 그대로 바꾸고 들여쓰기를 지킨다", () => {
  const { root, config } = project([]);
  writeFileSync(join(root, "tasks/plan.md"), planText([["T1", "a", "대기"], ["T2", "b", "대기"]]).replace(/^\| T/gm, "  | T"));
  commit(root);
  writeTable(root, config, "A", { write: true, title: "T1 a", task: "T1" });
  assert.equal(plan(root)[0].state, "진행");
  assert.match(readFileSync(join(root, "tasks/plan.md"), "utf8"), /^ {2}\| T1 \| a \| 진행 \| \|$/m);
  fill(root);
  assert.equal(close(root, config).ok, true);
  assert.equal(plan(root)[0].state, "완료");
});

test("부분 완료 기록을 두고 손으로 완료라고 적으면 plan이 잡고 다음 Task를 열지 않는다", () => {
  const { root, config } = project([["T1", "a", "대기"], ["T2", "b", "대기"]]);
  commit(root);
  writeTable(root, config, "A", { write: true, title: "T1 a", task: "T1" });
  fill(root, "blocked: 승인 대기");
  assert.equal(close(root, config, new Date(), { partial: true }).ok, true);
  const t1 = plan(root)[0];
  writeFileSync(join(root, "tasks/plan.md"), planText([["T1", "a", "완료", t1.record], ["T2", "b", "대기"]]));
  assert.match(planCheck(root, config).problems.join("\n"), /부분 완료\(close --partial\)/);
  assert.throws(() => writeTable(root, config, "A", { write: true, title: "T2", task: "T2" }), /진행 계획에 문제가 있다/);
});

test("다음 Task 안내: --task 없이 열면 끝나지 않은 Task를 알리고, 그 Task의 라운드가 열려 있으면 새로 열지 말고 이어 가라고 한다", () => {
  const { root, config } = project([["T1", "a", "대기"], ["T2", "b", "대기"]]);
  const w = run(root, "table", "A", "--write", "--title", "버그");
  assert.equal(w.status, 0, w.stderr);
  assert.match(w.stdout, /^경고: 진행 계획에 끝나지 않은 Task가 있다\(T1 대기\)\. 이 라운드가 그 Task의 일이면 --task T1로/m);
  assert.match(status(root, config).line, /다음 T1 "a"\(대기\) → 열린 라운드를 닫은 뒤 pnpm dev-cycle table/, "다른 라운드가 열려 있으면 먼저 닫으라고 한다");
  fill(root);
  assert.equal(close(root, config).ok, true);
  commit(root);
  writeTable(root, config, "A", { write: true, title: "T1 a", task: "T1" });
  assert.match(status(root, config).line, /^진행 계획: 0\/2 끝남 — 다음 T1 "a"\(진행\) → 열린 라운드에서 이어 간다$/m);
  assert.match(run(root, "plan").stdout, /^다음: T1 "a" → 열린 라운드에서 이어 간다$/m);
  assert.equal(writeTable(root, config, "A", { title: "T1 a", task: "T1" }).warning, undefined, "--task로 열면 알리지 않는다");
  assert.equal(writeTable(root, config, "A", { title: "미리 보기" }).warning, undefined, "그 Task의 라운드가 열려 있으면 알리지 않는다");
});

test("기존 프로젝트: 확정한 진행 계획이 없으면 --task 없이 여는 라운드를 막고(--no-task로 연다), status·plan이 진행 계획 라운드 명령을 알린다. 새 프로젝트는 막지 않는다", () => {
  const repo = makeRepo({ name: "dc-plan-none-" });
  assert.equal(writeTable(repo.root, loadConfig(repo.root), "H", { title: "새 프로젝트" }).warning, undefined);
  const cfgPath = join(repo.root, ".dev-cycle.json");
  writeFileSync(cfgPath, JSON.stringify({ ...JSON.parse(readFileSync(cfgPath, "utf8")), projectType: "migration" }, null, "\t"));
  repo.git("commit", "-qam", "migration");
  const config = loadConfig(repo.root);
  const gate = /확정한 진행 계획이 없다\(tasks\/plan\.md의 dev-cycle:plan 블록과 지문\)\. 기존 프로젝트는 .*--plan\. .*--no-task를 붙여 연다/;
  assert.throws(() => writeTable(repo.root, config, "H", { write: true, title: "계획 없음" }), gate);
  assert.match(writeTable(repo.root, config, "H", { title: "미리 보기" }).warning, gate, "미리 보기는 알리기만 한다");
  assert.throws(() => writeTable(repo.root, config, "H", { title: "x", noTask: true, plan: true }), /--no-task는 --plan·--task와 함께 쓰지 않는다/);
  // 다른 형식으로 쓴 계획 문서(AG1: Antigravity가 쓴 표)도 확정한 계획이 아니다
  mkdirSync(join(repo.root, "tasks"), { recursive: true });
  writeFileSync(join(repo.root, "tasks/plan.md"), "| Task | 제목 | 상태 |\n|---|---|---|\n| Task 1 | 하네스 | 대기 |\n");
  const r = run(repo.root, "table", "H", "--write", "--title", "Task 1: 하네스");
  assert.equal(r.status, 2, "사용법 오류(exit 2)로 막는다");
  assert.match(r.stderr, gate);
  assert.match(status(repo.root, config).line, /^진행 계획: .*블록이 없다.* → 진행 계획 라운드에서 project-plan\.md 형식으로 다시 쓴다: .*--plan$/m);
  assert.match(run(repo.root, "plan").stdout, /^진행 계획 없음: .*블록이 없다.* → pnpm dev-cycle table A --write --title "정밀 분석과 진행 계획" --plan$/m);
  // 지문 없는 계획 블록, 손으로 적은 가짜 지문도 막는다
  writeFileSync(join(repo.root, "tasks/plan.md"), planText([["T1", "a", "대기"]], false));
  assert.throws(() => writeTable(repo.root, config, "H", { write: true, title: "버그" }), gate);
  writeFileSync(join(repo.root, "tasks/plan.md"), planText([["T1", "a", "대기"]], "deadbeef0000"));
  assert.throws(() => writeTable(repo.root, config, "H", { write: true, title: "버그" }), gate);
  const ok = run(repo.root, "table", "H", "--write", "--title", "급한 버그", "--no-task");
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /^경고: 진행 계획에 끝나지 않은 Task가 있다\(T1 대기\)/m, "--no-task도 남은 Task는 알린다");
  assert.match(readFileSync(join(repo.root, config.todoPath), "utf8"), /<!-- dev-cycle:start case=H .* notask=true -->/);
  assert.match(status(repo.root, config).line, /^라운드 H\(--no-task\) "급한 버그"/);
  assert.equal(writeTable(repo.root, config, "H", { title: "미리 보기", upgrade: true }).warning, undefined, "--upgrade는 막지 않는다");
  assert.match(readFileSync(join(repo.root, config.todoPath), "utf8"), /notask=true/, "--upgrade 미리 보기는 표를 바꾸지 않는다");
  // 진행 계획 라운드가 열려 있으면 그 라운드에서 이어 가므로 진행 계획 라운드부터 열라고 하지 않는다
  writeFileSync(join(repo.root, config.todoPath), "# 작업\n");
  writeTable(repo.root, config, "A", { write: true, title: "정밀 분석과 진행 계획", plan: true });
  assert.equal(writeTable(repo.root, config, "A", { title: "미리 보기" }).warning, undefined);
  assert.doesNotMatch(status(repo.root, config).line, /--plan$/m);
  // 확인 행만 남으면 status가 계획을 보기 전의 승인은 확인이 아니라고 알린다
  fill(repo.root);
  const p = join(repo.root, config.todoPath);
  const md = readFileSync(p, "utf8");
  const a = parseActive(md);
  writeFileSync(p, md.slice(0, a.start) + renderBlock({ ...a.meta, title: a.title }, a.rows.map((r) => (r.text.startsWith("[confirm]") ? { ...r, evidence: "" } : r))) + md.slice(a.end));
  assert.match(status(repo.root, config).line, /다음: \[confirm\].* — 진행 계획 라운드: 리뷰를 반영한 최종 계획 요약.*"진행해"는 확인이 아니다$/m);
  assert.ok(audit(repo.root, config).problems.some((x) => /^#\d+ \[confirm\].* — 진행 계획 라운드: .*"진행해"는 확인이 아니다$/.test(x)), "audit도 같은 안내를 붙인다");
  writeFileSync(join(repo.root, "tasks/plan.md"), planText([["T1", "a", "제외"]]));
  writeFileSync(join(repo.root, config.todoPath), "# 작업\n");
  assert.equal(writeTable(repo.root, config, "H", { write: true, title: "확정한 계획 뒤 버그" }).warning, undefined, "확정한 계획이 있고 남은 Task가 없으면 막지 않는다");
});

test("진행 계획 라운드(--plan): 기존 프로젝트는 정밀 분석·계획 문서·계획 리뷰 행을 맨 앞에 두고 문서 경로 증거와 계획 블록을 audit이 보며, 새 프로젝트는 정밀 분석 행 없이 연다", () => {
  const repo = makeRepo({ name: "dc-plan-round-" });
  const cfgPath = join(repo.root, ".dev-cycle.json");
  writeFileSync(cfgPath, JSON.stringify({ ...JSON.parse(readFileSync(cfgPath, "utf8")), projectType: "operating" }, null, "\t"));
  repo.git("commit", "-qam", "operating");
  const config = loadConfig(repo.root);
  assert.match(status(repo.root, config).line, /^진행 계획: 아직 없다 → .*--plan\. .*--no-task를 붙여 연다$/m);
  assert.throws(() => writeTable(repo.root, config, "A", { write: true, plan: true, task: "T1" }), /--plan과 --task는 함께 쓰지 않는다/);
  assert.throws(() => writeTable(repo.root, config, "F", { write: true, plan: true }), /--plan은 케이스 A/);
  const w = run(repo.root, "table", "A", "--write", "--title", "정밀 분석과 진행 계획", "--plan");
  assert.equal(w.status, 0, w.stderr);
  const p = join(repo.root, config.todoPath);
  let a = parseActive(readFileSync(p, "utf8"));
  assert.deepEqual(a.rows.slice(0, 3).map((r) => r.text), [PLAN_ANALYSIS_ROW, PLAN_DOC_ROW, PLAN_REVIEW_ROW]);
  assert.ok(a.rows.at(-1).text.startsWith("[confirm]"));
  fill(repo.root);
  assert.ok(audit(repo.root, config).problems.some((x) => x.startsWith("진행 계획 라운드인데 tasks/plan.md에 진행 계획 블록이 없다")), "계획 블록 없이 닫지 않는다");
  // 확인 행은 사용자가 본 Task 구성의 지문과 함께 쓴다. 계획 블록이 없거나 지문이 없으면(계획을 보기 전의 "진행해") evidence가 거절하고 audit·status가 잡는다.
  mkdirSync(join(repo.root, "tasks/evidence"), { recursive: true });
  const confirmAt = String(a.rows.length);
  const confirmWith = (text) => {
    writeFileSync(join(repo.root, "tasks/evidence/c.txt"), `${text}\n`);
    return run(repo.root, "evidence", confirmAt, "--file", "tasks/evidence/c.txt");
  };
  let ev = confirmWith(CONFIRMED);
  assert.equal(ev.status, 2);
  assert.match(ev.stderr, /확인할 진행 계획 블록이 tasks\/plan\.md에 아직 없다/);
  writeFileSync(join(repo.root, "tasks/plan.md"), planText([["T1", "a", "대기"]]));
  const sig = planSig(plan(repo.root));
  assert.match(run(repo.root, "plan").stdout, new RegExp(`^  지문: sig=${sig} — 진행 계획 라운드의 \\[confirm\\]`, "m"));
  assert.equal(JSON.parse(run(repo.root, "plan", "--json").stdout).confirmSig, sig);
  assert.ok(audit(repo.root, config).problems.some((x) => x.includes("Task 구성의 지문") && x.includes("계획을 보기 전에 받은")), "지문 없는 확인");
  assert.match(status(repo.root, config).line, /다음: \[confirm\].* — 진행 계획 라운드: .*지문 sig=/);
  for (const text of [CONFIRMED, `${CONFIRMED} xsig=${sig}`, `${CONFIRMED} sig=${sig}0`]) {
    ev = confirmWith(text);
    assert.equal(ev.status, 2, text);
    assert.match(ev.stderr, /진행 계획 라운드의 확인 행: 증거에 사용자가 본 Task 구성의 지문.* — 진행 계획 라운드: 리뷰를 반영한 최종 계획 요약/);
  }
  // 계획 리뷰가 끝나기 전의 확인도 거절한다.
  a = parseActive(readFileSync(p, "utf8"));
  writeFileSync(p, renderBlock({ ...a.meta, title: a.title }, a.rows.map((r) => (r.text === PLAN_REVIEW_ROW ? { ...r, evidence: "" } : r))));
  assert.match(confirmWith(`${CONFIRMED} sig=${sig}`).stderr, /\[review\] 행이 아직 끝나지 않았다/);
  writeFileSync(p, renderBlock({ ...a.meta, title: a.title }, a.rows));
  ev = confirmWith(`${CONFIRMED} (sig=${sig})`);
  assert.equal(ev.status, 0, ev.stderr);
  assert.deepEqual(audit(repo.root, config).problems, []);
  // 확인 뒤 Task 구성이 바뀌면 다시 확인받는다.
  writeFileSync(join(repo.root, "tasks/plan.md"), planText([["T1", "b", "대기"]]));
  assert.ok(audit(repo.root, config).problems.some((x) => x.includes("지금 구성과 다르다")));
  writeFileSync(join(repo.root, "tasks/plan.md"), planText([["T1", "a", "대기"]]));
  assert.deepEqual(audit(repo.root, config).problems, []);
  a = parseActive(readFileSync(p, "utf8"));
  for (const text of [PLAN_ANALYSIS_ROW, PLAN_DOC_ROW]) {
    const rows = a.rows.map((r) => (r.text === text ? { ...r, evidence: "N/A: 작은 일" } : r));
    writeFileSync(p, renderBlock({ ...a.meta, title: a.title }, rows));
    assert.ok(audit(repo.root, config).problems.some((x) => x.includes("정밀 분석·진행 계획 증거는 문서 경로(.md)다")), text);
  }
  writeFileSync(p, renderBlock({ ...a.meta, title: a.title }, a.rows));
  // --upgrade해도 계획 행은 맨 앞에 남고 채운 증거를 지킨다.
  writeTable(repo.root, config, "A", { write: true, upgrade: true });
  a = parseActive(readFileSync(p, "utf8"));
  assert.deepEqual(a.rows.slice(0, 3).map((r) => [r.text, r.evidence]), [[PLAN_ANALYSIS_ROW, "docs/prokit/analysis.md"], [PLAN_DOC_ROW, "docs/plans/p.md, pnpm dev-cycle plan exit 0"], [PLAN_REVIEW_ROW, "prokit-reviewer(plan): approve, max=none, 지적 0"]]);
  // 정밀 분석 행을 지우면 필수 행 누락이고, F로 올려도 계획 리뷰 행은 하나다.
  writeFileSync(p, renderBlock({ ...a.meta, title: a.title }, a.rows.slice(1)));
  assert.ok(audit(repo.root, config).problems.some((x) => x.startsWith(`필수 행 누락: ${PLAN_ANALYSIS_ROW}`)));
  writeTable(repo.root, config, "F", { write: true, upgrade: true, plan: true });
  a = parseActive(readFileSync(p, "utf8"));
  assert.equal(a.rows[0].text, PLAN_ANALYSIS_ROW);
  assert.equal(a.rows.filter((r) => r.text.includes("prokit-reviewer(plan)")).length, 1, "F의 계획 리뷰 행이 있으면 진행 계획 리뷰 행을 더 두지 않는다");
  writeTable(repo.root, config, "A", { write: true, upgrade: true });
  fill(repo.root);
  assert.equal(close(repo.root, config).ok, true);
  assert.equal(writeTable(repo.root, config, "A", { title: "계획 고치기", plan: true }).warning, undefined, "Task가 남아 있어도 계획을 고치는 라운드는 알리지 않는다");
  // 진행 계획 라운드가 아닌 열린 라운드(Task 라운드 등)에는 --plan을 쓰지 않는다.
  commit(repo.root);
  writeTable(repo.root, config, "A", { write: true, title: "T1 a", task: "T1" });
  assert.throws(() => writeTable(repo.root, config, "A", { write: true, upgrade: true, plan: true }), /--plan은 진행 계획 라운드에만 쓴다/);
  // 진행 계획 라운드가 아닌 라운드의 확인에는 지문이 필요 없다.
  writeFileSync(join(repo.root, "tasks/evidence/c.txt"), `${CONFIRMED}\n`);
  ev = run(repo.root, "evidence", String(parseActive(readFileSync(p, "utf8")).rows.length), "--file", "tasks/evidence/c.txt");
  assert.equal(ev.status, 0, ev.stderr);
  const fresh = makeRepo({ name: "dc-plan-new-" });
  const c2 = loadConfig(fresh.root);
  const r2 = writeTable(fresh.root, c2, "A", { title: "진행 계획", plan: true });
  assert.ok(!r2.block.includes(PLAN_ANALYSIS_ROW) && r2.block.includes(PLAN_DOC_ROW), "새 프로젝트는 정밀 분석 행이 없다");
  assert.doesNotMatch(status(fresh.root, c2).line, /진행 계획: 아직 없다/);
});

test("Task 구성 지문: 진행 계획 라운드를 닫으면 지문을 적고, 그 뒤 손으로 바꾼 번호·제목·순서는 plan·게이트·audit이 잡으며, 상태·제외와 진행 계획 라운드 안의 수정은 막지 않는다", () => {
  const rows = [["T1", "경로 규칙", "대기"], ["T2", "회원 모델", "대기"], ["T3", "화면", "대기"]];
  const { root, config } = project([rows[1], rows[0], rows[2]], false);
  const planPath = join(root, "tasks/plan.md");
  // 지문이 없는 계획(진행 계획 라운드를 거치지 않음): Task를 시작하기 전에는 문제가 아니지만 Task 게이트가 막고 진행 계획 라운드를 안내한다.
  assert.deepEqual(planCheck(root, config).problems, []);
  assert.throws(() => writeTable(root, config, "A", { write: true, title: "T2", task: "T2" }), /진행 계획에 지문\(sig=\)이 없다\. Task는 진행 계획 라운드를 닫아 확정한 계획에서만 연다/);
  assert.match(status(root, config).line, /다음 T2 "회원 모델"\(대기\) → 지문\(sig=\) 없음\. Task는 진행 계획 라운드를 닫아/);
  assert.match(run(root, "plan").stdout, /다음: T2 "회원 모델" → 지문\(sig=\) 없음/);
  writeFileSync(planPath, planText(rows, false));
  writeTable(root, config, "A", { write: true, title: "진행 계획", plan: true });
  fill(root);
  assert.equal(close(root, config).ok, true);
  const signed = parsePlan(readFileSync(planPath, "utf8"));
  assert.equal(signed.sig, planSig(signed.tasks));
  assert.match(readFileSync(planPath, "utf8"), /<!-- dev-cycle:plan doc=docs\/plans\/p\.md sig=[0-9a-f]{12} -->/);
  assert.deepEqual(planCheck(root, config).problems, []);
  const handEdit = (r, sig = signed.sig) => writeFileSync(planPath, planText(r, sig));
  const changed = /^Task 구성\(번호·제목·순서\)이 마지막 진행 계획 라운드 뒤에 바뀌었다\. 먼저 손으로 고친 것을 되돌린다\(git diff tasks\/plan\.md\)/;
  for (const edit of [[rows[1], rows[0], rows[2]], [rows[0], rows[1], ["T3", "화면 다시", "대기"]], [...rows, ["T4", "배포", "대기"]]]) {
    handEdit(edit);
    assert.ok(planCheck(root, config).problems.some((x) => changed.test(x)), JSON.stringify(edit));
    assert.throws(() => writeTable(root, config, "A", { write: true, title: "T1", task: "T1" }), /진행 계획에 문제가 있다/);
  }
  assert.equal(run(root, "plan").status, 1);
  // 제외와 close가 바꾸는 상태·기록 칸은 지문에 들지 않는다.
  handEdit([["T1", "경로 규칙", "제외", "제외: 필요 없어짐 (사용자, 2026-10-23)"], rows[1], rows[2]]);
  assert.deepEqual(planCheck(root, config).problems, []);
  commit(root);
  writeTable(root, config, "A", { write: true, title: "T2 회원 모델", task: "T2" });
  handEdit([["T1", "경로 규칙", "제외", "제외: 필요 없어짐 (사용자, 2026-10-23)"], ["T2", "회원 모델", "진행"], ["T3", "화면 다시", "대기"]]);
  assert.ok(audit(root, config).problems.some((x) => x.startsWith("진행 계획: Task 구성")), "Task 라운드 안에서 손으로 고쳐도 audit이 잡는다");
  // 지문을 지워도(빈 값 포함) 지나가지 않는다. Task를 시작한 계획에는 지문이 있어야 한다.
  for (const sig of [false, ""]) {
    writeFileSync(planPath, planText([["T1", "경로 규칙", "제외", "제외: 필요 없어짐 (사용자, 2026-10-23)"], ["T2", "회원 모델", "진행"], ["T3", "화면 다시", "대기"]], false).replace(" -->", sig === "" ? " sig= -->" : " -->"));
    assert.ok(audit(root, config).problems.some((x) => x.startsWith("진행 계획: Task를 시작한 진행 계획에 지문(sig=)이 없다")), `sig=${sig}`);
  }
  handEdit([["T1", "경로 규칙", "제외", "제외: 필요 없어짐 (사용자, 2026-10-23)"], ["T2", "회원 모델", "진행"], rows[2]]);
  fill(root);
  assert.equal(close(root, config).ok, true);
  assert.equal(parsePlan(readFileSync(planPath, "utf8")).sig, signed.sig, "Task 라운드의 close는 지문을 바꾸지 않는다");
  assert.deepEqual(planCheck(root, config).problems, []);
  // 진행 계획 라운드 안에서는 고칠 수 있고, 닫으면 새 구성으로 다시 적는다.
  writeTable(root, config, "A", { write: true, title: "진행 계획 고치기", plan: true });
  writeFileSync(planPath, readFileSync(planPath, "utf8").replace("<!-- dev-cycle:plan-end -->", "| T4 | 배포 | 대기 | |\n<!-- dev-cycle:plan-end -->"));
  assert.deepEqual(planCheck(root, config).problems, []);
  fill(root);
  assert.equal(close(root, config).ok, true);
  const resigned = parsePlan(readFileSync(planPath, "utf8"));
  assert.notEqual(resigned.sig, signed.sig);
  assert.equal(resigned.sig, planSig(resigned.tasks));
  assert.equal(resigned.doc, "docs/plans/p.md");
  assert.deepEqual(planCheck(root, config).problems, []);
});

test("지문 머리: sig=가 둘이거나 doc 경로에 sig=가 들어 있어도 다시 적을 때 하나만 남기고, 부분 완료로 닫은 진행 계획 라운드도 지문을 적는다", () => {
  const rows = [["T1", "인증", "대기"], ["T2", "화면", "대기"]];
  const { root, config } = project(rows, false);
  const planPath = join(root, "tasks/plan.md");
  writeFileSync(planPath, planText(rows, "aaa sig=bbb").replace("doc=docs/plans/p.md", "doc=docs/plans/sig=1.md"));
  const head = parsePlan(readFileSync(planPath, "utf8"));
  assert.equal(head.doc, "docs/plans/sig=1.md");
  assert.equal(head.sig, "aaa");
  writeTable(root, config, "A", { write: true, title: "진행 계획", plan: true });
  fill(root, "blocked: 분석 에이전트를 쓸 수 없음");
  assert.equal(close(root, config, new Date(), { partial: true }).ok, true);
  const md = readFileSync(planPath, "utf8");
  assert.match(md, new RegExp(`<!-- dev-cycle:plan doc=docs/plans/sig=1\\.md sig=${planSig(parsePlan(md).tasks)} -->`));
  assert.deepEqual(planCheck(root, config).problems, []);
  commit(root);
  writeTable(root, config, "A", { write: true, title: "T1 인증", task: "T1" });
});

test("Task 게이트: 앞 라운드가 남긴 tasks/plan.md 변경을 커밋하지 않으면 다음 Task를 열지 않는다(미리 보기는 된다)", () => {
  const { root, config } = project([["T1", "인증", "대기"], ["T2", "화면", "대기"]]);
  assert.throws(() => writeTable(root, config, "A", { write: true, title: "T1", task: "T1" }), /tasks\/plan\.md에 커밋하지 않은 변경이 있다/, "진행 계획을 커밋하지 않았다");
  assert.ok(writeTable(root, config, "A", { title: "T1", task: "T1" }).block, "미리 보기는 막지 않는다");
  commit(root);
  writeTable(root, config, "A", { write: true, title: "T1 인증", task: "T1" });
  fill(root);
  assert.equal(close(root, config).ok, true);
  assert.throws(() => writeTable(root, config, "A", { write: true, title: "T2", task: "T2" }), /커밋하지 않은 변경이 있다/, "T1을 닫고 커밋하지 않았다");
  commit(root);
  writeTable(root, config, "A", { write: true, title: "T2 화면", task: "T2" });
});
