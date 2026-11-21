import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  audit, changedFiles, classify, close, editGuard, loadConfig, parseActive,
  SKILL_LOG, setEvidence, writeTable,
} from "../files/scripts/dev-cycle.mjs";
import { makeRepo, TEMPLATE_FILES } from "./helpers.mjs";

const page = "apps/web/src/app/(main)/[slug]/page.tsx";
const css = "apps/web/src/app/theme.css";
const shared = "packages/ui/src/button.tsx";
const review = "prokit-reviewer(code): approve, max=none, 경량: 확인, 리뷰: fresh";
const runtime = "위임: prokit-runtime-checker(사용: next-dev-loop, agent-browser); 폭: 390px, 1024px; 상태: 기본; 오류 예산: 0";
const evidence = [
  "Main 직접: 제목의 여백 클래스",
  "pnpm check-types·lint·build exit 0",
  runtime,
  review,
  "사용자가 화면을 확인함 (2026-11-20), 마무리: 커밋만",
];

function setup() {
  const repo = makeRepo({ name: "dc-lite-" });
  const { root, git, write } = repo;
  write(".gitignore", ".prokit/\n");
  write(page);
  write(css);
  write("apps/web/src/app/other.tsx");
  write(shared);
  write("apps/web/package.json", "{}\n");
  write("apps/web/src/app/ui.config.ts");
  write("tasks/todo.md", "# 작업\n\n## 개발 백로그\n- [ ] 이전 항목\n");
  write("skills.manifest.json", JSON.stringify({
    skills: [],
    performers: { agents: ["prokit-ui-builder", "prokit-runtime-checker"], skills: {} },
  }));
  git("add", "-A");
  git("commit", "-qm", "base");
  const config = loadConfig(root);
  const base = git("rev-parse", "HEAD").trim();
  return {
    ...repo, config, base,
    classify: () => classify(changedFiles(root, base), config, { root, base }),
    table: () => parseActive(readFileSync(join(root, config.todoPath), "utf8")),
    fill: (row, value) => {
      const file = "tasks/evidence/row.txt";
      write(file, value);
      return setEvidence(root, config, row, file);
    },
  };
}

test("L 판정: 기존 B 파일 1~2개와 30줄까지, 표·실행 증거·참고 기록은 제외한다", () => {
  const r = setup();
  assert.equal(r.classify().liteOk, false);
  r.write(page, "z\n".repeat(27));
  r.write(css, "y\n");
  r.write("tasks/evidence/smoke.md");
  r.write("docs/backlog-notes.md");
  r.write("tasks/todo.md", "# 진행\n");
  assert.equal(r.classify().liteOk, true);
  const cli = spawnSync(process.execPath, [join(TEMPLATE_FILES, "scripts/dev-cycle.mjs"), "case"], {
    cwd: r.root, encoding: "utf8",
  });
  assert.equal(cli.status, 0);
  assert.match(cli.stdout, /^B .*\n[\s\S]*L로 열 수 있다/);
  r.write(page, "z\n".repeat(28));
  assert.equal(r.classify().liteOk, false, "31줄");
  r.write(page, "y\n");
  r.write("apps/web/src/app/other.tsx", "y\n");
  assert.equal(r.classify().liteOk, false, "세 파일");
});

test("L 판정: 새 파일·삭제·공용 UI·설정·의존성·스테이징에만 남은 변경을 거부한다", () => {
  for (const [file, value] of [
    [shared, "changed\n"],
    ["apps/web/package.json", '{"new":true}\n'],
    ["apps/web/src/app/ui.config.ts", "changed\n"],
    ["apps/web/src/app/new/page.tsx", "new\n"],
  ]) {
    const r = setup();
    r.write(page, "changed\n");
    r.write(file, value);
    assert.equal(r.classify().liteOk, false, file);
  }
  const r = setup();
  r.write(page, "changed\n");
  r.git("rm", "-q", "--", css);
  assert.equal(r.classify().liteOk, false, "삭제");
  r.git("restore", "--staged", "--worktree", "--", css);
  r.write(css, "z\n".repeat(31));
  r.git("add", css);
  r.write(css);
  assert.equal(r.classify().liteOk, false, "작업 트리에 가려진 스테이징 변경");
});

test("L 편집 훅: Main은 기존 화면 파일만 고치고 B·공용 UI·새 파일에서는 위임한다", () => {
  const r = setup();
  const edit = (file) => editGuard(r.root, r.config, {
    tool_name: "Edit", tool_input: { file_path: join(r.root, file) },
  });
  writeTable(r.root, r.config, "L", { write: true, title: "여백" });
  assert.equal(edit(page), null);
  assert.match(edit(shared), /Main은 계층 코드/);
  assert.match(edit("apps/web/src/app/new/page.tsx"), /Main은 계층 코드/);
  r.write(page, "y\n");
  r.write(css, "z\n");
  assert.match(edit("apps/web/src/app/other.tsx"), /Main은 계층 코드/);
  writeTable(r.root, r.config, "B", { write: true, upgrade: true });
  assert.match(edit(page), /Main은 계층 코드/);
});

test("L audit·close: 실제 검사와 승인 리뷰 및 한 번의 사용자 확인을 요구한다", () => {
  const r = setup();
  assert.equal(writeTable(r.root, r.config, "L", { write: true, title: "여백" }).rows, 5);
  r.write(page, "changed\n");
  evidence.forEach((v, i) => r.fill(i + 1, v));
  for (const [row, value, problem] of [
    [3, runtime.replace("390px, 1024px", "320px, 390px, 1024px"), /폭과 상태/],
    [3, "N/A: 작음", /구현·검증·리뷰 증거/],
    [4, "blocked: 리뷰어 시작 실패", /구현·검증·리뷰 증거/],
    [4, review.replace("경량: 확인, ", ""), /경량: 확인/],
    [4, review.replace("fresh", "이어 쓰기"), /리뷰: fresh/],
    [5, "사용자가 화면을 확인함", /마무리: <선택>/],
  ]) {
    r.fill(row, value);
    assert.ok(audit(r.root, r.config).problems.some((p) => problem.test(p)), value);
    assert.equal(close(r.root, r.config).ok, false, value);
    r.fill(row, evidence[row - 1]);
  }
  assert.deepEqual(audit(r.root, r.config).problems, []);
  assert.equal(close(r.root, r.config).ok, true);
  assert.equal(r.table(), null);
});

test("close --round-only는 라운드만 보관하고 기존 완료 항목을 남긴다", () => {
  const r = setup();
  const todo = join(r.root, r.config.todoPath);
  const completed = "- [x] 기존에 완료한 백로그 항목";
  appendFileSync(todo, `${completed}\n`);
  writeTable(r.root, r.config, "L", { write: true, title: "여백" });
  r.write(page, "changed\n");
  evidence.forEach((v, i) => r.fill(i + 1, v));
  const result = spawnSync(process.execPath, [
    join(TEMPLATE_FILES, "scripts/dev-cycle.mjs"), "close", "--round-only", "--json",
  ], { cwd: r.root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.ok(readFileSync(todo, "utf8").includes(completed));
  assert.ok(!readFileSync(JSON.parse(result.stdout).archivePath, "utf8").includes(completed));
  assert.equal(r.table(), null);
});

test("L 직접 수정 뒤 이전 리뷰어를 다시 썼다는 훅 기록이 있으면 fresh 증거를 거부한다", () => {
  const r = setup();
  const dir = join(r.root, SKILL_LOG);
  const old = { t: new Date().toISOString(), act: "exec_command", agent: "old-reviewer", agentType: "prokit-reviewer" };
  r.write(SKILL_LOG, JSON.stringify(old) + "\n");
  writeTable(r.root, r.config, "L", { write: true, title: "여백" });
  appendFileSync(dir, JSON.stringify({ t: new Date().toISOString(), edit: page, seen: true }) + "\n");
  r.write(page, "changed\n");
  appendFileSync(dir, JSON.stringify({ ...old, agent: "runtime", agentType: "prokit-runtime-checker" }) + "\n");
  evidence.slice(0, 3).forEach((v, i) => r.fill(i + 1, v));
  const work = (agent) => appendFileSync(dir, JSON.stringify({
    ...old, t: new Date().toISOString(), agent,
  }) + "\n");
  r.fill(4, review);
  r.fill(5, evidence[4]);
  assert.ok(audit(r.root, r.config).problems.some((p) => /리뷰: fresh/.test(p)), "훅이 있는 라운드의 자기 신고만으로는 부족하다");
  work(old.agent);
  r.fill(4, review);
  assert.ok(audit(r.root, r.config).problems.some((p) => /리뷰: fresh/.test(p)));
  work("fresh-reviewer");
  r.fill(4, review);
  assert.deepEqual(audit(r.root, r.config).problems, []);
});

test("L 조건 불충족 시 상향하고 이전 L 증거는 참고로 보존한다", () => {
  const r = setup();
  writeTable(r.root, r.config, "L", { write: true, title: "여백" });
  r.write(page, "changed\n");
  evidence.forEach((v, i) => r.fill(i + 1, v));
  r.fill(4, review.replace("경량: 확인", "경량: 아님"));
  assert.ok(audit(r.root, r.config).problems.some((p) => p.startsWith("케이스 상향 필요: B")));
  r.fill(4, review);
  r.write(page, "z\n".repeat(30));
  assert.ok(audit(r.root, r.config).problems.some((p) => p.startsWith("케이스 상향 필요: B")));
  r.write("packages/api/src/router.ts");
  assert.ok(audit(r.root, r.config).problems.some((p) => p.startsWith("케이스 상향 필요: F")));
  r.git("clean", "-f", "--", "packages/api/src/router.ts");
  writeTable(r.root, r.config, "B", { write: true, upgrade: true });
  const upgraded = r.table();
  assert.equal(upgraded.meta.case, "B");
  assert.ok(upgraded.rows.every((row) => !row.evidence));
  assert.equal(upgraded.extra.filter((line) => line.startsWith("- 이전 L 증거")).length, 5);
});

test("백로그 제목의 디자인 리뷰만 백로그 사유로 생략하고 새 미표시 항목을 경고한다", () => {
  const r = setup();
  writeTable(r.root, r.config, "B", { write: true, title: "백로그: 여백" });
  const rows = r.table().rows;
  const design = rows.findIndex((row) => row.text.startsWith("[review] 디자인 리뷰")) + 1;
  const accessibility = rows.findIndex((row) => row.text.startsWith("[review] 디자인 감사")) + 1;
  r.fill(design, "N/A: 백로그");
  r.fill(accessibility, "N/A: 백로그");
  const problems = audit(r.root, r.config).problems;
  assert.ok(problems.every((p) => !p.startsWith(`#${design} `)));
  assert.ok(problems.some((p) => p.startsWith(`#${accessibility} `) && p.includes("백로그")));
  writeTable(r.root, r.config, "B", { write: true, upgrade: true, title: "여백" });
  assert.ok(audit(r.root, r.config).problems.some((p) => p.startsWith(`#${design} `) && p.includes("백로그")));

  const clean = setup();
  writeTable(clean.root, clean.config, "L", { write: true, title: "백로그: 여백" });
  clean.write(page, "changed\n");
  evidence.forEach((v, i) => clean.fill(i + 1, v));
  const todo = join(clean.root, clean.config.todoPath);
  appendFileSync(todo, "\n### 후속\n- [ ] [P2] 분명한 회귀\n- [ ] 새 미표시 항목\n- [ ] [P3] 관찰\n\n## 다른 일\n- [ ] 일반 할 일\n");
  const result = close(clean.root, clean.config);
  assert.equal(result.ok, true, result.problems?.join("\n"));
  assert.match(result.warnings?.[0] ?? "", /새 백로그 2건/);
});
