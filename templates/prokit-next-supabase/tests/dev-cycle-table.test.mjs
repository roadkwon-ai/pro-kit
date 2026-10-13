import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, truncateSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  SECURITY_ROW, audit, buildRows, classify, loadConfig, parseActive, parseWorkflow, readWorkflow, renderBlock, setEvidence, status, writeTable,
} from "../files/scripts/dev-cycle.mjs";
import { makeRepo, TEMPLATE_FILES } from "./helpers.mjs";

const wf = parseWorkflow(readFileSync(join(TEMPLATE_FILES, "docs/dev-workflow.md"), "utf8"));
const CLI = join(TEMPLATE_FILES, "scripts/dev-cycle.mjs");
const cls = (over = {}) => ({ pathCase: "A", layers: [], harness: false, auth: false, evidence: [], ...over });
const texts = (rows) => rows.map((r) => r.text);

test("evidence setter는 지정 행의 증거 셀만 바꾸고 단계·메모·다른 행을 보존한다", () => {
	const { root, write } = makeRepo();
	const config = loadConfig(root);
	writeTable(root, config, "A", { write: true, title: "증거 입력" });
	const todo = join(root, config.todoPath);
	const before = readFileSync(todo, "utf8").replace(
		"<!-- dev-cycle:end -->",
		"메모: 그대로 둔다\n```txt\n| 1 | 코드 예시 | 유지 |\n```\n<!-- dev-cycle:end -->",
	);
	writeFileSync(todo, before);
	write("tasks/evidence/first.txt", "pnpm check | tail -3 → exit 0");
	const result = setEvidence(root, config, 1, "tasks/evidence/first.txt");
	const after = readFileSync(todo, "utf8");
	assert.equal(result.row, 1);
	assert.equal(parseActive(after).rows[0].evidence, "pnpm check | tail -3 → exit 0");
	assert.match(after, /\| 1 \| .* \| pnpm check \\| tail -3 → exit 0 \|/);
	assert.match(after, /메모: 그대로 둔다\n```txt\n\| 1 \| 코드 예시 \| 유지 \|/);
	assert.equal(status(root, config).filled, 1);
	assert.ok(!audit(root, config).problems.some((problem) => problem.startsWith("#1 ")));
});

test("라운드를 연 날은 한국 시간으로 적는다", () => {
	const { root } = makeRepo();
	const config = loadConfig(root);
	// UTC로는 10월 13일, 한국 시간으로는 10월 14일 새벽이다.
	writeTable(root, config, "A", { write: true, title: "날짜", now: new Date("2026-10-13T17:30:00Z") });
	assert.match(readFileSync(join(root, config.todoPath), "utf8"), /opened=2026-10-14 -->/);
});

test("evidence setter는 활성 라운드·실제 행 번호·한 줄 안전 입력을 요구한다", () => {
	const { root, write } = makeRepo();
	const config = loadConfig(root);
	write("tasks/evidence/value.txt", "증거");
	assert.throws(() => setEvidence(root, config, 1, "tasks/evidence/value.txt"), /활성 라운드/);
	writeTable(root, config, "A", { write: true, title: "검증" });
	assert.throws(() => setEvidence(root, config, 99, "tasks/evidence/value.txt"), /행 번호/);
	write("tasks/evidence/multiline.txt", "첫 줄\n둘째 줄");
	assert.throws(() => setEvidence(root, config, 1, "tasks/evidence/multiline.txt"), /한 줄/);
	write("tasks/evidence/cr.txt", "첫 줄\r둘째 줄");
	assert.throws(() => setEvidence(root, config, 1, "tasks/evidence/cr.txt"), /한 줄/);
	write("tasks/evidence/two-lines-eol.txt", "첫 줄\n둘째 줄\n");
	assert.throws(() => setEvidence(root, config, 1, "tasks/evidence/two-lines-eol.txt"), /한 줄/);
	write("tasks/evidence/blank-eol.txt", "\n");
	assert.throws(() => setEvidence(root, config, 1, "tasks/evidence/blank-eol.txt"), /비어 있다/);
});

test("evidence setter는 echo·편집기가 붙인 끝 줄바꿈 하나를 한 줄로 받는다", () => {
	const { root, write } = makeRepo();
	const config = loadConfig(root);
	writeTable(root, config, "A", { write: true, title: "끝 줄바꿈" });
	for (const [name, value] of [["lf.txt", "pnpm check-types → exit 0\n"], ["crlf.txt", "pnpm check-types → exit 0\r\n"]]) {
		write(`tasks/evidence/${name}`, value);
		assert.equal(setEvidence(root, config, 1, `tasks/evidence/${name}`).evidence, "pnpm check-types → exit 0");
		assert.equal(parseActive(readFileSync(join(root, config.todoPath), "utf8")).rows[0].evidence, "pnpm check-types → exit 0");
	}
});

test("evidence setter는 regular·작은 파일과 실제 표 헤더 아래 행만 읽고 거부해도 todo를 보존한다", () => {
	const { root, write } = makeRepo();
	const config = loadConfig(root);
	writeTable(root, config, "A", { write: true, title: "입력 경계" });
	const todo = join(root, config.todoPath);
	write("tasks/evidence/value.txt", "증거");
	const withoutHeader = readFileSync(todo, "utf8").replace("| # | 단계 | 증거 |\n", "");
	writeFileSync(todo, withoutHeader);
	assert.throws(() => setEvidence(root, config, 1, "tasks/evidence/value.txt"), /대조표/);
	assert.equal(readFileSync(todo, "utf8"), withoutHeader);

	writeTable(root, config, "A", { write: true, upgrade: true });
	const crOnly = readFileSync(todo, "utf8")
		.replace("<!-- dev-cycle:end -->", "~~~txt\n| 1 | 코드 예시 | 유지 |\n~~~\n<!-- dev-cycle:end -->")
		.replaceAll("\n", "\r");
	writeFileSync(todo, crOnly);
	setEvidence(root, config, 1, "tasks/evidence/value.txt");
	const afterCr = readFileSync(todo, "utf8");
	assert.match(afterCr, /\| 1 \| .* \| 증거 \|/);
	assert.match(afterCr, /~~~txt\r\| 1 \| 코드 예시 \| 유지 \|\r~~~/);

	const sparse = join(root, "tasks/evidence/huge.txt");
	write("tasks/evidence/huge.txt", "");
	truncateSync(sparse, 64 * 1024 + 1);
	assert.throws(() => setEvidence(root, config, 1, "tasks/evidence/huge.txt"), /너무 크다/);
	const fifo = join(root, "tasks/evidence/input.fifo");
	const made = spawnSync("mkfifo", [fifo], { encoding: "utf8" });
	assert.equal(made.status, 0, made.stderr);
	const fifoResult = spawnSync(
		process.execPath,
		[CLI, "evidence", "1", "--file", "tasks/evidence/input.fifo"],
		{ cwd: root, encoding: "utf8", timeout: 250 },
	);
	assert.equal(fifoResult.status, 2, fifoResult.stderr);
	assert.match(fifoResult.stderr, /일반 파일/);
});

test("evidence CLI는 파일 입력만 받아 증거 셀을 갱신한다", () => {
	const { root, write } = makeRepo();
	const config = loadConfig(root);
	writeTable(root, config, "A", { write: true, title: "CLI" });
	write("tasks/evidence/cli.txt", "pnpm check → exit 0");
	const ok = spawnSync(
		process.execPath,
		[CLI, "evidence", "1", "--file", "tasks/evidence/cli.txt"],
		{ cwd: root, encoding: "utf8" },
	);
	assert.equal(ok.status, 0, ok.stderr);
	assert.equal(parseActive(readFileSync(join(root, config.todoPath), "utf8")).rows[0].evidence, "pnpm check → exit 0");
	assert.equal(
		spawnSync(process.execPath, [CLI, "evidence", "1"], {
			cwd: root,
			encoding: "utf8",
		}).status,
		2,
	);
});

test("B·D·E·F·H는 구현 전에 설계를 점검하고 F 상속은 중복하지 않는다", () => {
  for (const key of ["B", "D", "E", "F", "H"]) {
    const rows = buildRows(wf, key, cls({ pathCase: key }));
    const designs = rows.filter((r) => r.tag === "design");
    assert.equal(designs.length, 1, `${key}: 설계 점검 한 번`);
    const implementation = rows.findIndex((r) => /^(구현 \(|구현 방식|스키마 수정)/.test(r.text));
    if (implementation >= 0) assert.ok(rows.indexOf(designs[0]) < implementation, `${key}: 구현 전 점검`);
  }
  for (const key of ["A", "C"]) {
    const rows = buildRows(wf, key, cls({ pathCase: "B" }));
    assert.ok(rows.every((r) => r.tag !== "design"), `${key}: 경미·버그에 설계 단계 강제 안 함`);
  }
});

test("A에서 F로 상향해도 설계 결정 증거와 메모를 보존한다", () => {
  const { root } = makeRepo();
  const config = loadConfig(root);
  writeTable(root, config, "A", { write: true, title: "재사용 검토" });
  const p = join(root, config.todoPath);
  const active = parseActive(readFileSync(p, "utf8"));
  const design = buildRows(wf, "F", cls({ pathCase: "F" })).find((r) => r.tag === "design");
  assert.ok(design, "F 설계 행");
  const evidence = "tasks/evidence/reuse.md: 기존 경로와 설정 영향 확인";
  const rows = [{ ...design, evidence }, ...active.rows];
  writeFileSync(p, renderBlock({ ...active.meta, title: active.title }, rows, ["설정 정본은 기존 파일을 유지한다."]));
  writeTable(root, config, "F", { write: true, upgrade: true });
  const after = parseActive(readFileSync(p, "utf8"));
  assert.equal(after.rows.filter((r) => r.text.startsWith("[design]")).length, 1);
  assert.equal(after.rows.find((r) => r.text.startsWith("[design]")).evidence, evidence);
  assert.ok(after.extra.some((line) => line.includes("설정 정본")));
});

test("구판 F 계획 리뷰는 메모로 보존하고 새 독립 리뷰 행만 남긴다", () => {
  const { root } = makeRepo();
  const config = loadConfig(root);
  writeTable(root, config, "F", { write: true, title: "구판 계획" });
  const p = join(root, config.todoPath);
  const active = parseActive(readFileSync(p, "utf8"));
  const legacy = "[review] 계획 리뷰 (plan-eng-review, UI가 있으면 plan-design-review, ponytail-review로 계획의 과설계 확인) → 결과 요약, ponytail-review 반영·기각 또는 N/A: 사유";
  const rows = active.rows.map((r) => r.text.includes("prokit-reviewer(plan)") ? { text: legacy, evidence: "plan-eng-review: 기존 검토 기록" } : r);
  writeFileSync(p, renderBlock({ ...active.meta, title: active.title }, rows, ["이전 메모 보존"]));
  writeTable(root, config, "F", { write: true, upgrade: true });
  const after = parseActive(readFileSync(p, "utf8"));
  assert.equal(after.rows.filter((r) => r.text.includes("계획 리뷰")).length, 1);
  assert.equal(after.rows.find((r) => r.text.includes("prokit-reviewer(plan)")).evidence, "");
  assert.ok(after.extra.some((line) => line.includes("plan-eng-review: 기존 검토 기록")));
  assert.ok(after.extra.includes("이전 메모 보존"));
  writeTable(root, config, "F", { write: true, upgrade: true });
  const again = parseActive(readFileSync(p, "utf8"));
  assert.deepEqual(again.extra, after.extra);
});

test("워크플로 파싱: 케이스 블록과 공통, 설명 절은 무시", () => {
  for (const k of ["A", "B", "C", "D", "E", "F", "H", "COMMON"]) assert.ok(wf[k]?.length, `${k} 블록`);
  assert.equal(wf.A.length, 1);
  assert.deepEqual(wf.F.find((r) => r.include).include, ["E", "D", "B"]);
  assert.deepEqual(wf.C.find((r) => r.inherit).inherit, ["verify", "review"]);
  assert.equal(wf.D[3].tag, "verify");
});

test("F는 E·D·B 행을 한 번씩 펼치고 공통 행으로 끝난다", () => {
  const rows = buildRows(wf, "F", cls({ pathCase: "F" }));
  const t = texts(rows);
  assert.equal(new Set(t).size, t.length);
  assert.ok(t.some((x) => x.includes("[verify] 병합 전")), "F는 E의 병합 전 DB 적용 행을 포함한다");
  assert.ok(t.some((x) => x.includes("2계정 격리 테스트")));
  assert.ok(t.some((x) => x.includes("impeccable critique")));
  assert.ok(t.at(-2).startsWith("문서 영향 확인"));
  assert.ok(t.at(-1).startsWith("[confirm] 사용자 확인"));
});

test("모든 케이스 대조표는 [confirm] 사용자 확인 행으로 끝난다", () => {
  for (const k of ["A", "B", "C", "D", "E", "F", "H"]) {
    for (const over of [{}, { auth: true, harness: true }]) {
      const rows = buildRows(wf, k, cls({ pathCase: k === "C" ? "A" : k, ...over }));
      assert.equal(rows.at(-1).tag, "confirm", k);
      assert.equal(rows.filter((r) => r.tag === "confirm").length, 1, k);
    }
  }
});

test("C는 경로 판정 케이스의 verify·review 행만 상속한다", () => {
  const withD = texts(buildRows(wf, "C", cls({ pathCase: "D", layers: ["D"] })));
  assert.ok(withD.some((x) => x.includes("2계정 격리 테스트")));
  assert.ok(withD.some((x) => x.includes("prokit-reviewer(code)")));
  assert.ok(!withD.some((x) => x.startsWith("zod 입출력 계약")));
  // 경로 판정이 A(규칙 밖 경로나 diff 없음)여도 A의 타입·린트 행을 받는다
  const withA = texts(buildRows(wf, "C", cls()));
  assert.equal(withA.length, wf.C.length - 1 + wf.A.length + wf.COMMON.length);
  assert.ok(withA.some((x) => x.startsWith("[verify] 타입·린트 검사")));
});

test("auth 플래그는 security 행을 한 번만, 하네스는 H 행을 붙인다", () => {
  const rows = texts(buildRows(wf, "D", cls({ pathCase: "D", auth: true, harness: true })));
  assert.equal(rows.filter((x) => x === SECURITY_ROW).length, 1);
  assert.ok(rows.includes("[verify] pnpm agents:check → 출력"));
  assert.ok(rows.includes("[verify] pnpm skills:check → 출력"));
});

test("@include 순환과 없는 케이스는 오류", () => {
  const bad = parseWorkflow("## 케이스\n### A. x\n- @include B\n### B. y\n- @include A\n### 공통\n- c → d\n");
  assert.throws(() => buildRows(bad, "A", cls()), /순환/);
  assert.throws(() => buildRows(wf, "Z", cls()), /Z/);
});

test("표 렌더·파싱 왕복: 파이프 문자 보존, 손으로 넣은 행 인식", () => {
  const block = renderBlock(
    { case: "D", base: "abc123", auth: false, opened: "2026-09-25", title: "할 일 수정" },
    [{ text: "a → b", evidence: "pnpm test | tail -1 → 3 passed" }, { text: "c → d" }],
  );
  const md = `# 작업\n\n${block}\n\n메모\n`;
  const manual = md.replace("<!-- dev-cycle:end -->", "| 9 | vitest 도입(최초 1회) → 설정 | vitest.config.ts 추가 |\n<!-- dev-cycle:end -->");
  const a = parseActive(manual);
  assert.equal(a.meta.case, "D");
  assert.equal(a.meta.base, "abc123");
  assert.equal(a.title, "할 일 수정");
  assert.equal(a.rows[0].evidence, "pnpm test | tail -1 → 3 passed");
  assert.equal(a.rows[1].evidence, "");
  assert.equal(a.rows[2].text, "vitest 도입(최초 1회) → 설정");
  assert.equal(parseActive("# 작업\n"), null);
});

test("writeTable: 새 라운드를 쓰고, 두 번째는 거부, --upgrade는 증거와 수동 행을 보존", () => {
  const { root, write } = makeRepo();
  write("apps/web/src/app/todos/page.tsx");
  const config = loadConfig(root);
  const r1 = writeTable(root, config, undefined, { title: "목록 화면", write: true });
  assert.equal(r1.case, "B");
  assert.throws(() => writeTable(root, config, "B", { write: true }), /활성 라운드/);

  const todoPath = join(root, config.todoPath);
  const a = parseActive(readFileSync(todoPath, "utf8"));
  a.rows[0].evidence = "impeccable context → PRODUCT.md 없음, init 실행";
  a.rows.push({ text: "수동 추가 행 → 근거", evidence: "직접 적은 증거" });
  const md = readFileSync(todoPath, "utf8");
  writeFileSync(todoPath, md.slice(0, a.start) + renderBlock({ ...a.meta, title: a.title }, a.rows) + md.slice(a.end));

  write("packages/db/src/schema/todo.ts");
  const r2 = writeTable(root, config, "F", { upgrade: true, write: true });
  assert.equal(r2.case, "F");
  const b = parseActive(readFileSync(todoPath, "utf8"));
  assert.equal(b.meta.base, a.meta.base);
  assert.equal(b.title, "목록 화면");
  assert.equal(b.rows.find((r) => r.text.startsWith("impeccable context ")).evidence, "impeccable context → PRODUCT.md 없음, init 실행");
  // 새 케이스에 없는 행과 수동 행은 끝의 사용자 확인 행 바로 앞으로 간다
  assert.equal(b.rows.at(-2).text, "수동 추가 행 → 근거");
  assert.equal(b.rows.at(-2).evidence, "직접 적은 증거");
  assert.match(b.rows.at(-1).text, /^\[confirm\] 사용자 확인/);
});

test("--upgrade 뒤에도 수동 vitest 도입 행은 첫 행을 지킨다", () => {
  const { root } = makeRepo();
  const config = loadConfig(root);
  writeTable(root, config, "D", { title: "API", write: true });
  const todoPath = join(root, config.todoPath);
  const before = parseActive(readFileSync(todoPath, "utf8"));
  const vitest = {
    text: "vitest 도입(최초 1회) → 설정 파일과 실행 결과",
    evidence: "vitest.config.ts, pnpm test → pass",
  };
  before.rows.unshift(vitest);
  before.rows.push({ text: "수동 행 → 근거", evidence: "직접 적은 증거" });
  const md = readFileSync(todoPath, "utf8");
  writeFileSync(todoPath, md.slice(0, before.start) + renderBlock({ ...before.meta, title: before.title }, before.rows, ["메모: 계속 보존"]) + md.slice(before.end));

  writeTable(root, config, "H", { upgrade: true, write: true });
  const afterMd = readFileSync(todoPath, "utf8");
  const after = parseActive(afterMd);
  assert.deepEqual(after.rows[0], vitest);
  assert.deepEqual(after.rows.at(-2), { text: "수동 행 → 근거", evidence: "직접 적은 증거" });
  assert.match(after.rows.at(-1).text, /^\[confirm\] 사용자 확인/);
  assert.match(afterMd, /메모: 계속 보존\n<!-- dev-cycle:end -->/);
});

test("writeTable: write 없이 호출하면 파일을 바꾸지 않고 블록만 돌려준다", () => {
  const { root } = makeRepo();
  const config = loadConfig(root);
  const r = writeTable(root, config, "A", { title: "미리보기" });
  assert.match(r.block, /dev-cycle:start case=A/);
  assert.throws(() => readFileSync(join(root, config.todoPath), "utf8"));
  assert.ok(Object.keys(readWorkflow(root, config)).includes("A"));
});

test("손으로 적은 증거의 파이프와 블록 안 메모는 --upgrade 뒤에도 남는다", () => {
  const { root, write } = makeRepo();
  write("apps/web/src/app/todos/page.tsx");
  const config = loadConfig(root);
  writeTable(root, config, "B", { title: "목록", write: true });
  const todoPath = join(root, config.todoPath);
  let md = readFileSync(todoPath, "utf8");
  md = md.replace(/^\| 4 \| (.*) \|  \|$/m, "| 4 | $1 | pnpm build | tail -3 → exit 0 |");
  md = md.replace("<!-- dev-cycle:end -->", "| 9a | 수동 행 → 근거 | 적은 증거 |\n메모: 스크린샷 재촬영 필요\n<!-- dev-cycle:end -->");
  writeFileSync(todoPath, md);
  assert.equal(parseActive(md).rows[3].evidence, "pnpm build | tail -3 → exit 0");

  write("packages/db/src/schema/todo.ts");
  writeTable(root, config, "F", { upgrade: true, write: true });
  const after = readFileSync(todoPath, "utf8");
  assert.ok(parseActive(after).rows.some((r) => r.evidence === "pnpm build | tail -3 → exit 0"));
  assert.match(after, /\| 9a \| 수동 행 → 근거 \| 적은 증거 \|/);
  assert.match(after, /메모: 스크린샷 재촬영 필요\n<!-- dev-cycle:end -->/);
});

test("base 값이 커밋 해시 형식이 아니면 거부한다", () => {
  const md = "<!-- dev-cycle:start case=A base=--output=x auth=false opened=2026-09-25 -->\n## 활성 라운드: A — t\n<!-- dev-cycle:end -->\n";
  assert.throws(() => parseActive(md), /base/);
});

test("CRLF나 다시 정렬한 표 머리도 메모로 오인하지 않고, 끝의 빈 칸은 증거에 붙지 않는다", () => {
  const md = [
    "<!-- dev-cycle:start case=A base=none auth=false opened=2026-09-25 -->",
    "## 활성 라운드: A — t",
    "| # | 단계 | 증거 |",
    "| --- | :--- | --- |",
    "| 1 | a → b | ev | |",
    "<!-- dev-cycle:end -->",
  ].join("\r\n");
  const a = parseActive(md);
  assert.deepEqual(a.extra, []);
  assert.equal(a.rows[0].evidence, "ev");
});

test("증거의 `||`와 공백은 --upgrade 뒤에도 바이트 그대로 남는다", () => {
  const { root, write } = makeRepo();
  write("apps/web/src/app/todos/page.tsx");
  const config = loadConfig(root);
  writeTable(root, config, "B", { title: "목록", write: true });
  const todoPath = join(root, config.todoPath);
  const ev = "pnpm test || true → exit 0";
  const md = readFileSync(todoPath, "utf8").replace(/^\| 4 \| (.*) \|  \|$/m, `| 4 | $1 | ${ev} |`);
  writeFileSync(todoPath, md);
  assert.equal(parseActive(md).rows[3].evidence, ev);
  assert.equal(parseActive(md).rows[0].evidence, "");

  write("packages/db/src/schema/todo.ts");
  writeTable(root, config, "F", { upgrade: true, write: true });
  const after = readFileSync(todoPath, "utf8");
  assert.ok(parseActive(after).rows.some((r) => r.evidence === ev));
  assert.ok(after.includes(`| ${ev.replace(/\|/g, "\\|")} |`));
});
