import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { audit, loadConfig, parseActive, setEvidence, writeTable } from "../files/scripts/dev-cycle.mjs";
import { makeRepo, TEMPLATE_FILES } from "./helpers.mjs";

const cli = join(TEMPLATE_FILES, "scripts/dev-cycle.mjs");
const logic = "apps/web/src/lib/paragraph-script.ts";
const tests = "apps/web/src/lib/paragraph-script.test.ts";
const consumer = "apps/web/src/components/script-input.tsx";
const original = "export function splitLong(value: string, max: number) { return value.slice(0, max); }\n";
const changed = "export function splitLong(value: string, max: number) { if (max < 1) throw new RangeError(); return value.slice(0, max); }\n";
const run = (root, ...args) => spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8" });

function setup() {
  const repo = makeRepo({ name: "dc-pure-logic-" });
  repo.write(logic, original);
  repo.write(tests, "import { splitLong } from './paragraph-script';\n");
  repo.write(consumer, "import { splitLong } from '../lib/paragraph-script';\nexport const sample = splitLong('hello', 3);\n");
  repo.write(".gitignore", ".prokit/\n");
  repo.write("tasks/todo.md", "# 작업\n");
  repo.git("add", "-A");
  repo.git("commit", "-qm", "logic baseline");
  const config = loadConfig(repo.root);
  writeTable(repo.root, config, "C", { write: true, title: "분할 경계", pureLogic: true });
  repo.write(logic, changed);
  repo.write(tests, "import { splitLong } from './paragraph-script';\nexpect(() => splitLong('', 0)).toThrow(RangeError);\n");
  const active = () => parseActive(readFileSync(join(repo.root, config.todoPath), "utf8"));
  const state = () => {
    const result = run(repo.root, "case", "--json");
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  const fill = (prefix, value) => {
    const index = active().rows.findIndex((row) => row.text.startsWith(prefix));
    assert.ok(index >= 0, `행이 없다: ${prefix}`);
    repo.write("tasks/evidence/row.txt", value);
    setEvidence(repo.root, config, index + 1, "tasks/evidence/row.txt");
  };
  const approve = (hash) => fill("[review] prokit-reviewer(code)",
    `prokit-reviewer(code): approve, max=none; 리뷰: fresh; 순수 로직: 확인; diff: ${hash}; 소비자: ${consumer}의 정상 입력 3 확인`);
  return { ...repo, config, active, state, fill, approve };
}

function fillRequired(r, hash) {
  r.fill("재현 테스트 작성", "사용: 내장(디버깅); 0 경계 재현 테스트 실패");
  r.fill("수정", "위임: prokit-ui-builder(사용: prokit-web) → 양의 상한 검증; Next 문서: N/A: Next API 변경 없음");
  r.fill("[verify] 재현 테스트 통과", `vitest 103개 통과, skip 0; diff: ${hash}`);
  r.fill("[verify] 타입·린트·빌드", `typecheck, biome, build exit 0; diff: ${hash}`);
  r.approve(hash);
  r.fill("문서 영향 확인", "N/A: 문서 변경 없음");
  r.fill("[confirm]", "사용자가 결과를 확인했다(2026-11-21)");
}

test("C 순수 로직은 같은 diff의 재현·빌드와 독립 리뷰를 요구하고 UI 행을 생략한다", () => {
  const r = setup();
  const first = r.state();
  assert.equal(first.pathCase, "B", "경로 소유권은 그대로다");
  assert.equal(first.pureLogic.state, "pending");
  assert.match(first.pureLogic.diff, /^[0-9a-f]{64}$/);
  const rows = r.active().rows.map((row) => row.text);
  for (const prefix of ["재현 테스트 작성", "수정", "[verify] 재현 테스트 통과", "[verify] 타입·린트·빌드", "[review] prokit-reviewer(code)", "[confirm]"]) {
    assert.ok(rows.some((row) => row.startsWith(prefix)), prefix);
  }
  for (const text of ["next-dev-loop", "휴대폰 스크롤", "디자인 리뷰", "디자인 감사", "[verify] 재확인"]) {
    assert.ok(rows.every((row) => !row.includes(text)), text);
  }
  assert.equal(audit(r.root, r.config).ok, false, "빈 리뷰로 확정할 수 없다");
  fillRequired(r, first.pureLogic.diff);
  for (const verdict of ["순수 로직: 확인 불가", "비순수 로직: 확인", "순수 로직: 확인; 순수 로직: 아님"]) {
    r.fill("[review] prokit-reviewer(code)", `prokit-reviewer(code): approve, max=none; 리뷰: fresh; ${verdict}; diff: ${first.pureLogic.diff}; 소비자: ${consumer}`);
    assert.equal(r.state().pureLogic.state, "pending", verdict);
    assert.equal(audit(r.root, r.config).ok, false, verdict);
  }
  r.approve(first.pureLogic.diff);
  assert.equal(r.state().pureLogic.state, "confirmed");
  assert.deepEqual(audit(r.root, r.config).problems, []);
  const evidence = run(r.root, "evidence", "1", "--file", "tasks/evidence/row.txt", "--json");
  assert.equal(evidence.status, 0, evidence.stderr);
  assert.ok(!JSON.parse(evidence.stdout).first.some((problem) => /필수 행 누락|케이스 상향/.test(problem)));
});

test("같은 파일의 후속 수정은 이전 리뷰·회귀·빌드 판정을 무효화한다", () => {
  const r = setup();
  const initial = r.state().pureLogic.diff;
  fillRequired(r, initial);
  r.write(logic, `${changed}// 후속 변경\n`);
  const after = r.state();
  assert.notEqual(after.pureLogic.diff, initial);
  assert.notEqual(after.pureLogic.state, "confirmed");
  assert.equal(audit(r.root, r.config).ok, false);
  const row = r.active().rows.findIndex((item) => item.text.startsWith("[verify] 재현 테스트 통과")) + 1;
  const evidence = run(r.root, "evidence", String(row), "--file", "tasks/evidence/row.txt", "--json");
  assert.equal(evidence.status, 0, evidence.stderr);
  assert.ok(JSON.parse(evidence.stdout).first.length > 0, "evidence에서도 오래된 범위를 알린다");
});

test("화면·라우트·공유 소비 영향은 순수 로직 근거를 거절하고 기존 C 검사로 돌아간다", () => {
  for (const [file, required] of [
    ["apps/web/src/app/studio/page.ts", /next-dev-loop/],
    ["apps/web/src/components/card.ts", /디자인 리뷰/],
    ["apps/web/src/app/api/voice/route.ts", /2계정 격리/],
    ["apps/web/src/proxy.ts", /prokit-reviewer\(security\)/],
    ["packages/db/src/schema/jobs.ts", /prokit-reviewer\(db\)/],
  ]) {
    const r = setup();
    fillRequired(r, r.state().pureLogic.diff);
    r.write(file, "export const changed = true;\n");
    assert.notEqual(r.state().pureLogic.state, "confirmed", file);
    assert.equal(audit(r.root, r.config).ok, false, file);
    writeTable(r.root, r.config, "C", { write: true, upgrade: true });
    const rows = r.active().rows.map((row) => row.text).join("\n");
    assert.match(rows, required);
  }
  const r = setup();
  const initial = r.state().pureLogic.diff;
  fillRequired(r, initial);
  r.fill("[review] prokit-reviewer(code)", `prokit-reviewer(code): approve, max=none; 리뷰: fresh; 순수 로직: 아님; diff: ${initial}; 소비자: ${consumer} 화면 계약 변경`);
  assert.equal(r.state().pureLogic.state, "outside");
  assert.equal(audit(r.root, r.config).ok, false);
});

test("작업 트리와 스테이징 내용이 다르면 현재 작업 트리만을 근거로 승인하지 않는다", () => {
  const r = setup();
  const before = r.state().pureLogic.diff;
  fillRequired(r, before);
  r.git("add", logic);
  assert.equal(r.state().pureLogic.diff, before, "같은 내용을 스테이징하는 것은 승인 범위를 바꾸지 않는다");
  r.write(logic, `${changed}// 작업 트리만 변경\n`);
  assert.notEqual(r.state().pureLogic.state, "confirmed");
  assert.equal(audit(r.root, r.config).ok, false);
});
