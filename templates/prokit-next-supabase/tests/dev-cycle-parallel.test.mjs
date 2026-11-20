import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { audit, loadConfig, parallelRows, parseActive, SUPERVISE_BUDGET_MIN, supervise, writeTable } from "../files/scripts/dev-cycle.mjs";
import { auditRecord, critiqueRecord, makeRepo, TEMPLATE_FILES } from "./helpers.mjs";

const CLI = join(TEMPLATE_FILES, "scripts/dev-cycle.mjs");
const run = (root, ...args) => spawnSync(process.execPath, [CLI, ...args], { cwd: root, encoding: "utf8" });

const SKILLS = ["prokit-ui", "prokit-web", "vercel-react-best-practices", "next-dev-loop", "agent-browser", "web-design-guidelines", "impeccable"];

// B 라운드: 화면 파일 하나를 바꾸고 표를 연다. 훅 기록(skill-log·edit-guard)과 행 채우기를 CLI로 흉내 낸다
function round() {
  const { root, write } = makeRepo();
  for (const s of SKILLS) write(`.agents/skills/${s}/SKILL.md`, `---\nname: ${s}\n---\n`);
  write("skills.manifest.json", JSON.stringify({
    skills: [{ skills: ["vercel-react-best-practices", "next-dev-loop", "agent-browser", "web-design-guidelines", "impeccable"] }],
    performers: {
      agents: ["prokit-ui-builder", "prokit-runtime-checker", "prokit-reviewer", "prokit-implementer"],
      skills: { "vercel-react-best-practices": ["prokit-ui-builder"], "next-dev-loop": ["prokit-runtime-checker"], "agent-browser": ["prokit-runtime-checker"], "web-design-guidelines": ["prokit-reviewer"] },
    },
  }));
  write("apps/web/src/app/page.tsx", "export default 1\n");
  const config = loadConfig(root);
  writeTable(root, config, "B", { write: true, title: "랜딩" });
  const rows = parseActive(readFileSync(join(root, "tasks/todo.md"), "utf8")).rows;
  const at = (re) => rows.findIndex((r) => re.test(r.text)) + 1;
  mkdirSync(join(root, "tasks/evidence"), { recursive: true });
  const hook = (cmd, input) => spawnSync(process.execPath, [CLI, cmd], { cwd: tmpdir(), input: JSON.stringify(input), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: root } });
  const who = (type, id) => (type ? { agent_id: id ?? `id-${type}`, agent_type: type } : {});
  const read = (s, type, id) => hook("skill-log", { tool_name: "Read", ...who(type, id), tool_input: { file_path: join(root, `.agents/skills/${s}/SKILL.md`) } });
  const edit = (file, type, id) => {
    hook("edit-guard", { tool_name: "Edit", ...who(type, id), tool_input: { file_path: join(root, file) } });
    write(file, `export default ${Date.now()}\n`);
  };
  const set = (n, v) => {
    writeFileSync(join(root, "tasks/evidence/e.txt"), `${v}\n`);
    const r = run(root, "evidence", String(n), "--file", "tasks/evidence/e.txt");
    assert.equal(r.status, 0, r.stderr);
  };
  // 런타임 확인이 남기는 묶음: 측정 JSON과 스크린샷. 봉인 출력의 경로·hash를 돌려준다
  const packet = (name, extra = {}, top = {}) => {
    const dir = join(root, "tasks/evidence", name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "1440-light.png"), `png-${name}`);
    const view = { name: "1440-light", screenshot: "1440-light.png", overflow: { over: false }, touchTargets: { under24: [] }, contrast: { fail: [] }, console: [] };
    writeFileSync(join(dir, "measure.json"), JSON.stringify({ url: "http://localhost:3001/", viewports: [{ ...view, ...extra }], tabOrder: { steps: [] }, nextErrors: { skipped: "next-dev-loop 없음" }, ...top }));
    const r = run(root, "packet", "seal", `tasks/evidence/${name}`);
    return { r, cite: r.stdout.match(/packet: (\S+ sha256=\S+)/)?.[1] };
  };
  const problems = (n) => audit(root, config).problems.filter((p) => p.startsWith(`#${n} `));
  const shot = (file, type, id) => hook("skill-log", { tool_name: "Read", ...who(type, id), tool_input: { file_path: join(root, file) } });
  const shell = (command, type, id) => hook("shell-guard", { tool_name: "Bash", ...who(type, id), tool_input: { command } });
  return {
    root, config, write, read, edit, set, packet, problems, shot, shell, hook,
    ctx: 1, brief: 2, design: at(/^\[design\]/), impl: at(/^구현 \(구현 단계,/), types: at(/^\[verify\] 타입·린트·빌드/),
    runtime: at(/^\[verify\] next-dev-loop/), scroll: at(/^\[verify\] 휴대폰 스크롤/), review: at(/^\[review\] 디자인 리뷰/),
    uiAudit: at(/^\[review\] 디자인 감사/), fix: at(/^수정과 다듬기/), recheck: at(/^\[verify\] 재확인/), code: at(/^\[review\] prokit-reviewer\(code\)/),
  };
}

test("검증 증거 묶음: 측정이 빠지면 봉인하지 않고, 봉인 뒤 화면 소스나 묶음 파일이 바뀌면 check가 stale로 알린다. 대조표를 채워도 묶음은 그대로다", () => {
  const b = round();
  // 재지 않은 검사를 빈칸으로 두면 봉인하지 않는다(skipped에는 사유가 있어야 한다)
  const bad = b.packet("bad", { contrast: undefined });
  assert.equal(bad.r.status, 2);
  assert.match(bad.r.stderr, /contrast 결과가 없다/);
  assert.equal(b.packet("blank", { contrast: { skipped: " " } }).r.status, 2);
  // 묶음 폴더는 tasks/evidence/ 아래여야 한다
  b.write("other/measure.json", "{}");
  assert.equal(run(b.root, "packet", "seal", "other").status, 2);
  const ok = b.packet("p1");
  assert.equal(ok.r.status, 0, ok.r.stderr);
  assert.match(ok.r.stdout, /표준에서 빠진 뷰포트: 1440-dark, 1024-light/);
  assert.match(ok.r.stdout, /재지 못한 검사: page\.nextErrors\(next-dev-loop 없음\)/);
  assert.equal(run(b.root, "packet", "check", "tasks/evidence/p1").status, 0);
  // 대조표를 채우는 것은 화면 소스가 아니다
  b.set(b.ctx, "N/A: 테스트");
  assert.equal(run(b.root, "packet", "check", "tasks/evidence/p1/packet.json").status, 0);
  b.write("apps/web/src/app/page.tsx", "export default 2\n");
  const stale = run(b.root, "packet", "check", "tasks/evidence/p1");
  assert.equal(stale.status, 1);
  assert.match(stale.stdout, /화면 소스\(apps·packages·의존성\)가 바뀌었다/);
  const p2 = b.packet("p2");
  writeFileSync(join(b.root, "tasks/evidence/p2/1440-light.png"), "고친 그림");
  assert.match(run(b.root, "packet", "check", "tasks/evidence/p2").stdout, /1440-light\.png가 봉인 뒤 바뀌었거나 없다/);
  assert.ok(p2.cite);
});

test("병렬로 채운 B 표: 런타임 확인·디자인 리뷰·감사를 묶음 봉인 뒤 함께 하고, 재확인과 코드 리뷰를 마감 뒤 함께 해도 audit이 순서·위임 기록을 받는다. 마감은 같은 ui-builder를 이어 써서 스킬을 다시 읽지 않아도 된다", () => {
  const b = round();
  // 병렬 묶음 안내: table 출력과 parallelRows
  const groups = parallelRows(parseActive(readFileSync(join(b.root, "tasks/todo.md"), "utf8")).rows).map((g) => g.rows);
  assert.deepEqual(groups, [[b.types, b.runtime], [b.scroll, b.review, b.uiAudit], [b.recheck, b.code]]);
  b.read("impeccable");
  b.set(b.ctx, "impeccable context → PRODUCT.md 있음, DESIGN.md 있음, lint 0");
  b.set(b.brief, "N/A: 좁은 개선");
  b.set(b.design, "기존: apps/web/src/app/page.tsx; 결정: 재사용; 설정: 변경 없음; 검증: 스크린샷");
  // 구현: ui-builder(id u1)가 맡는다
  b.read("prokit-ui");
  b.read("prokit-web");
  b.read("vercel-react-best-practices", "prokit-ui-builder", "u1");
  b.edit("apps/web/src/app/page.tsx", "prokit-ui-builder", "u1");
  b.set(b.impl, "사용: prokit-ui, prokit-web; 위임: prokit-ui-builder(사용: vercel-react-best-practices(rerender-memo)) → 1개 파일, 바닥선 9/9. Next 문서: N/A: 없음");
  assert.match(run(b.root, "status").stdout, new RegExp(`함께 시작할 수 있는 행: #${b.types} #${b.runtime}`));
  b.set(b.types, "pnpm check-types → exit 0");
  // 묶음 봉인 뒤 리뷰·감사가 먼저 끝나고 런타임·스크롤을 나중에 채운다
  b.read("next-dev-loop", "prokit-runtime-checker", "r1");
  b.read("agent-browser", "prokit-runtime-checker", "r1");
  const p1 = b.packet("p1");
  b.read("web-design-guidelines", "prokit-reviewer", "v1");
  b.read("impeccable");
  b.set(b.review, `${critiqueRecord(b.root, 31)}, 묶음 ${p1.cite}`);
  b.set(b.uiAudit, `${auditRecord(b.root, 17)}, 위임: prokit-reviewer(사용: web-design-guidelines), 묶음 ${p1.cite}`);
  b.read("agent-browser", "prokit-runtime-checker", "r1");
  b.set(b.runtime, `위임: prokit-runtime-checker(사용: next-dev-loop, agent-browser) → 오류 0, 묶음 ${p1.cite}`);
  b.set(b.scroll, "위임: prokit-runtime-checker(사용: agent-browser) → over50 0, 스크롤 모션 0");
  // 마감: 같은 ui-builder(u1)를 이어 쓴다(SendMessage). 스킬을 다시 읽지 않고 고치기만 한다
  b.edit("apps/web/src/app/page.tsx", "prokit-ui-builder", "u1");
  b.set(b.fix, "위임: prokit-ui-builder(사용: vercel-react-best-practices(rerender-memo)) → 반영 3건");
  // 재확인과 코드 리뷰를 함께: 코드 리뷰를 먼저 채운다. 재확인은 고친 화면으로 새로 봉인한 묶음을 쓴다
  b.read("web-design-guidelines", "prokit-reviewer", "v2");
  b.set(b.code, "위임: prokit-reviewer → prokit-reviewer(code): approve, max=low, 지적 0");
  const p2 = b.packet("p2");
  b.set(b.recheck, `Design Health 33/40, 묶음 ${p2.cite}`);
  const order = /일한 기록이 없다|이 행을 하면서 읽은 기록이 없다|묶음/;
  for (const n of [b.impl, b.types, b.runtime, b.scroll, b.review, b.uiAudit, b.fix, b.recheck, b.code])
    assert.deepEqual(b.problems(n).filter((p) => order.test(p)), [], `#${n}`);
  // 고치기 전에 봉인한 묶음을 고친 뒤 채운 행에 쓰면 받지 않는다
  b.set(b.recheck, `Design Health 33/40, 묶음 ${p1.cite}`);
  assert.match(b.problems(b.recheck).join("\n"), /찍은 뒤 이 행을 채우기 전에 화면 소스\(apps\/web\/src\/app\/page\.tsx\)를 고쳤다/);
  // 경로만 적거나 다른 hash를 적으면 받지 않는다
  b.set(b.recheck, "Design Health 33/40, 묶음 tasks/evidence/p2/packet.json");
  assert.match(b.problems(b.recheck).join("\n"), /sha256=<packet seal 출력의 값>/);
  b.set(b.recheck, `Design Health 33/40, 묶음 ${p2.cite.replace(/sha256=\w+/, "sha256=000000000000")}`);
  assert.match(b.problems(b.recheck).join("\n"), /적은 sha256과 다르다/);
});

test("이어 쓴 수행자도 그 행을 하며 일해야 한다: 마감을 맡긴 ui-builder가 앞 행(감사)을 채운 뒤 아무 일도 하지 않았으면 받지 않는다", () => {
  const b = round();
  b.read("vercel-react-best-practices", "prokit-ui-builder", "u1");
  b.edit("apps/web/src/app/page.tsx", "prokit-ui-builder", "u1");
  b.set(b.impl, "위임: prokit-ui-builder(사용: vercel-react-best-practices) → 1개 파일");
  b.set(b.uiAudit, auditRecord(b.root, 17));
  b.set(b.fix, "위임: prokit-ui-builder(사용: vercel-react-best-practices) → 반영 0건");
  assert.match(b.problems(b.fix).join("\n"), /prokit-ui-builder가 이 행을 하면서 일한 기록이 없다/);
  b.edit("apps/web/src/app/page.tsx", "prokit-ui-builder", "u1");
  assert.deepEqual(b.problems(b.fix).filter((p) => /일한 기록이 없다/.test(p)), []);
});

test("묶음 인용의 빈틈: 다시 채운 행은 마지막으로 채운 때로 보고, 손으로 쓰거나 고친 묶음, tasks/evidence 밖 묶음, 찍는 동안 고친 화면을 받지 않는다. 다크가 적용되지 않은 뷰포트는 잰 것으로 치지 않는다", () => {
  const b = round();
  const p1 = b.packet("p1");
  // 먼저 미실행으로 채운 뒤 화면을 고치고, 고치기 전 묶음을 적어 다시 채우면 받지 않는다
  b.set(b.recheck, "미실행: 아직");
  b.edit("apps/web/src/app/page.tsx", "prokit-ui-builder", "u1");
  b.set(b.recheck, `Design Health 33/40, 묶음 ${p1.cite}`);
  assert.match(b.problems(b.recheck).join("\n"), /찍은 뒤 이 행을 채우기 전에 화면 소스/);
  // 손으로 만든 packet.json(봉인 명령을 거치지 않음)은 hash가 맞아도 받지 않는다
  const fake = join(b.root, "tasks/evidence/fake");
  mkdirSync(fake, { recursive: true });
  const real = JSON.parse(readFileSync(join(b.root, "tasks/evidence/p1/packet.json"), "utf8"));
  const text = `${JSON.stringify({ round: real.round, sealedAt: new Date().toISOString() })}\n`;
  writeFileSync(join(fake, "packet.json"), text);
  const h = createHash("sha256").update(text).digest("hex").slice(0, 16);
  b.set(b.review, `${critiqueRecord(b.root, 31)}, 묶음 tasks/evidence/fake/packet.json sha256=${h}`);
  assert.match(b.problems(b.review).join("\n"), /packet seal이 만든 묶음이 아니다/);
  // 편집 도구로 측정을 고친 묶음은 받지 않는다
  const p2 = b.packet("p2");
  b.edit("tasks/evidence/p2/measure.json", undefined);
  b.set(b.review, `${critiqueRecord(b.root, 31)}, 묶음 ${p2.cite}`);
  assert.match(b.problems(b.review).join("\n"), /(편집 도구로 고친 기록|봉인 뒤 바뀌었거나)/);
  // ..로 다른 곳의 묶음을 가리키면 묶음으로 읽지 않는다
  b.set(b.review, `${critiqueRecord(b.root, 31)}, 묶음 tasks/evidence/../../x/tasks/evidence/p1/packet.json sha256=${p1.cite.split("=")[1]}`);
  assert.match(b.problems(b.review).join("\n"), /sha256=<packet seal 출력의 값>/);
  // 찍기 시작한 뒤(capturedAt)에 고친 화면은, 봉인을 나중에 해도 낡은 묶음이다
  const t0 = new Date(Date.now() - 1).toISOString();
  b.edit("apps/web/src/app/page.tsx", "prokit-ui-builder", "u1");
  const p3 = b.packet("p3", {}, { capturedAt: t0 });
  b.set(b.uiAudit, `${auditRecord(b.root, 17)}, 위임: prokit-reviewer(사용: web-design-guidelines), 묶음 ${p3.cite}`);
  assert.match(b.problems(b.uiAudit).join("\n"), /찍은 뒤 이 행을 채우기 전에 화면 소스/);
  // 다크로 찍었는데 라이트로 그려졌으면 그 뷰포트는 빠진 것으로 보인다
  const dark = b.packet("p4", { name: "1440-dark", theme: "dark", actualTheme: "light", screenshot: "1440-light.png" });
  assert.equal(dark.r.status, 0, dark.r.stderr);
  const sealed = JSON.parse(readFileSync(join(b.root, "tasks/evidence/p4/packet.json"), "utf8"));
  assert.deepEqual(sealed.coverage.mismatch, ["1440-dark"]);
  assert.ok(sealed.coverage.missing.includes("1440-dark"));
});

test("코드 리뷰를 마감보다 먼저 채우고 마감에서 화면을 고치면 받지 않고, 리뷰어가 다시 본 뒤 다시 채우면 받는다", () => {
  const b = round();
  b.set(b.code, "verdict: approve, max_severity: none, 반영 없음");
  b.edit("apps/web/src/app/page.tsx", "prokit-ui-builder", "u1");
  b.set(b.fix, "위임: prokit-ui-builder(사용: vercel-react-best-practices) → 글자 크기");
  assert.match(b.problems(b.code).join("\n"), /코드 리뷰를 채운 뒤 마감에서 화면 소스\(apps\/web\/src\/app\/page\.tsx\)를 고쳤다/);
  b.set(b.code, "verdict: approve, max_severity: none, 마감 diff 재확인");
  assert.doesNotMatch(b.problems(b.code).join("\n"), /코드 리뷰를 채운 뒤 마감에서/);
});

test("같은 병렬 묶음의 행은 서로 앞 행이 아니다: 재확인을 코드 리뷰보다 먼저 채워도, 마감 뒤 함께 시작한 리뷰어의 일을 센다", () => {
  const b = round();
  b.read("vercel-react-best-practices", "prokit-ui-builder", "u1");
  b.edit("apps/web/src/app/page.tsx", "prokit-ui-builder", "u1");
  b.set(b.impl, "위임: prokit-ui-builder(사용: vercel-react-best-practices) → 1개 파일");
  b.read("web-design-guidelines", "prokit-reviewer", "v1");
  b.set(b.uiAudit, `${auditRecord(b.root, 17)}, 위임: prokit-reviewer(사용: web-design-guidelines)`);
  b.edit("apps/web/src/app/page.tsx", "prokit-ui-builder", "u1");
  b.set(b.fix, "위임: prokit-ui-builder(사용: vercel-react-best-practices) → 반영 1건");
  // 마감 뒤 코드 리뷰어가 일을 시작하고, 재확인을 먼저 채운 뒤 코드 리뷰를 채운다
  b.read("web-design-guidelines", "prokit-reviewer", "v2");
  b.set(b.recheck, "Design Health 33/40");
  b.set(b.code, "위임: prokit-reviewer → prokit-reviewer(code): approve, max=low, 지적 0");
  assert.deepEqual(b.problems(b.code).filter((p) => /일한 기록이 없다/.test(p)), []);
  // 마감 전에만 일한 리뷰어는 여전히 받지 않는다(기준은 마감 행)
  const c = round();
  c.read("web-design-guidelines", "prokit-reviewer", "v1");
  c.set(c.uiAudit, `${auditRecord(c.root, 17)}, 위임: prokit-reviewer(사용: web-design-guidelines)`);
  c.edit("apps/web/src/app/page.tsx", "prokit-ui-builder", "u1");
  c.set(c.fix, "위임: prokit-ui-builder → 반영 1건");
  c.set(c.recheck, "Design Health 33/40");
  c.set(c.code, "위임: prokit-reviewer → prokit-reviewer(code): approve, max=low, 지적 0");
  assert.match(c.problems(c.code).join("\n"), /prokit-reviewer가 이 행을 하면서 일한 기록이 없다/);
});

test("감독: supervise가 하위 에이전트마다 다시 읽기, 배정 밖 편집, 묶음 밖 촬영, 예산 초과를 SendMessage로 보낼 문장과 함께 알리고, 신호가 없으면 조용하다", () => {
  const b = round();
  assert.match(run(b.root, "supervise").stdout, /하위 에이전트 기록이 없다/);
  b.read("vercel-react-best-practices", "prokit-ui-builder", "u1");
  b.read("vercel-react-best-practices", "prokit-ui-builder", "u1");
  b.edit("apps/web/src/app/page.tsx", "prokit-ui-builder", "u1");
  b.edit("packages/ui/src/x.tsx", "prokit-ui-builder", "u1");
  b.packet("p1");
  for (const n of [1, 2, 3]) {
    b.write(`tasks/evidence/loose-${n}.png`, "png");
    b.shot(`tasks/evidence/loose-${n}.png`, "prokit-runtime-checker", "r1");
  }
  b.shot("tasks/evidence/p1/1440-light.png", "prokit-reviewer", "v1");
  const out = run(b.root, "supervise", "--scope", "apps/web/src").stdout;
  assert.match(out, /하위 에이전트 3/);
  assert.match(out, /SendMessage u1: 배정 밖 파일\(packages\/ui\/src\/x\.tsx\)/);
  assert.match(out, /SendMessage u1: 이미 읽은 스킬\(vercel-react-best-practices×2\)/);
  assert.match(out, /SendMessage r1: 묶음\(tasks\/evidence\/p1\/packet\.json\)의 스크린샷과 측정을 먼저 써라\. 묶음 밖 촬영 3장/);
  assert.doesNotMatch(out, /SendMessage v1/);
  // 예산: 맡은 지 예산보다 오래되면 멈추고 보고하게 한다
  const later = Date.now() + (SUPERVISE_BUDGET_MIN["prokit-ui-builder"] + 1) * 60_000;
  // 일하는 중이어야 한다(마지막 기록이 1분 전)
  appendFileSync(join(b.root, ".prokit/skills-used.jsonl"), `${JSON.stringify({ t: new Date(later - 60_000).toISOString(), act: "Read", agent: "u1", agentType: "prokit-ui-builder" })}\n`);
  const u1 = supervise(b.root, b.config, { now: later }).agents.find((a) => a.id === "u1");
  assert.ok(u1.signals.some((s) => s.kind === "budget" && /멈추고 한 일·남은 일·막힌 것을 보고하라/.test(s.say)));
  assert.equal(JSON.parse(run(b.root, "supervise", "--json").stdout).agents.length, 3);
  assert.equal(run(b.root, "supervise", "--scope").status, 2);
});

test("감독: 하위 에이전트의 일반 파일 읽기와 셸 명령을 활동으로 남겨 같은 명령 반복을 알리고, 명령 내용과 Main의 호출은 남기지 않으며 활동을 스킬 읽기로 세지 않는다", () => {
  const b = round();
  for (let n = 0; n < 3; n++) b.shell("TOKEN=s3cr3t pnpm test --filter web", "prokit-implementer", "i1");
  b.shell("pnpm build", "prokit-implementer", "i1");
  b.shot("apps/web/src/app/page.tsx", "prokit-implementer", "i1");
  b.shell("pnpm test --filter web", null);
  b.shot("apps/web/src/app/page.tsx", null);
  const log = readFileSync(join(b.root, ".prokit/skills-used.jsonl"), "utf8");
  assert.doesNotMatch(log, /s3cr3t|--filter/);
  assert.equal(log.split("\n").filter((l) => l.includes('"act"')).length, 5);
  const out = run(b.root, "supervise").stdout;
  assert.match(out, /하위 에이전트 1/);
  assert.match(out, /스킬 읽기 0\(다시 읽기 0\), 파일 읽기 1, 셸 4\(반복 pnpm test×3\)/);
  assert.match(out, /SendMessage i1: 같은 명령\(pnpm test ×3\)을 되풀이했다\. 같은 오류로 실패한 것이면 더 돌리지 말고/);
  // 셸 막기는 그대로다: 막힌 명령은 활동으로 남지 않는다
  assert.equal(b.shell("pkill -f next", "prokit-implementer", "i1").status, 2);
  assert.equal(readFileSync(join(b.root, ".prokit/skills-used.jsonl"), "utf8"), log);
});

// 앞 라운드의 기록(라운드 시작 줄 앞)을 끼워 넣는다. 스킬 파일은 그보다 먼저 고친 것으로 둔다
// start: 그 세션이 시작한 기록(SessionStart 훅의 compact-log)을 앞에 둔다
function priorReads(b, lines, { start = true } = {}) {
  const log = join(b.root, ".prokit/skills-used.jsonl");
  const t = new Date(Date.now() - 60_000).toISOString();
  const old = new Date(Date.now() - 3_600_000);
  for (const s of SKILLS) utimesSync(join(b.root, `.agents/skills/${s}/SKILL.md`), old, old);
  let cur = "";
  try {
    cur = readFileSync(log, "utf8");
  } catch {}
  mkdirSync(join(b.root, ".prokit"), { recursive: true });
  const mark = JSON.stringify({ t: new Date(Date.now() - 30_000).toISOString(), round: "랜딩" });
  const began = start ? `${JSON.stringify({ t: new Date(Date.now() - 90_000).toISOString(), start: "startup", session: "s1" })}\n` : "";
  writeFileSync(log, `${began}${lines.map((l) => JSON.stringify({ t, seen: true, project: true, ...l })).join("\n")}\n${mark}\n${cur}`);
}
// 압축 훅은 세션이 시작하기 전에 들어 있었다(설정 파일을 2시간 전에 고쳤다). fresh면 방금 더한 것이다
const compactHook = (b, fresh = false) => {
  b.write(".claude/settings.json", JSON.stringify({ hooks: { PreCompact: [{ hooks: [{ type: "command", command: 'node "$CLAUDE_PROJECT_DIR/scripts/dev-cycle.mjs" compact-log' }] }] } }));
  const at = new Date(Date.now() - (fresh ? 0 : 7_200_000));
  utimesSync(join(b.root, ".claude/settings.json"), at, at);
};

test("라운드를 넘긴 이어 쓰기: 같은 agent id가 이 라운드에서 명령만 돌려도 앞 라운드에 읽은 스킬을 센다. 압축 훅이 없거나, 그 에이전트가 압축했거나, 스킬 파일이 바뀌었으면 세지 않는다", () => {
  const b = round();
  priorReads(b, [
    { skill: "next-dev-loop", tool: "Read", agent: "r1", agentType: "prokit-runtime-checker", session: "s1" },
    { skill: "agent-browser", tool: "Read", agent: "r1", agentType: "prokit-runtime-checker", session: "s1" },
  ]);
  // 이 라운드의 다른 기록(훅이 도는 라운드다)
  b.read("prokit-ui");
  b.shell("pnpm dev-cycle packet capture http://localhost:3001/ tasks/evidence/p1", "prokit-runtime-checker", "r1");
  const p1 = b.packet("p1");
  b.set(b.runtime, `위임: prokit-runtime-checker(사용: next-dev-loop, agent-browser) → 오류 0, 묶음 ${p1.cite}`);
  const lost = () => b.problems(b.runtime).filter((p) => /일한 기록이 없다|읽은 기록/.test(p));
  // 압축 훅이 없는 프로젝트는 잇지 않는다(압축을 알 수 없다). 그 에이전트가 시작한 뒤에 더한 훅도 그 에이전트는 모른다
  assert.notDeepEqual(lost(), []);
  compactHook(b, true);
  assert.notDeepEqual(lost(), []);
  compactHook(b);
  assert.deepEqual(lost(), []);
  // 그 에이전트의 압축 기록이 있으면 다시 읽어야 한다. Main 세션의 압축은 에이전트 맥락과 상관없다
  b.hook("compact-log", { session_id: "s1" });
  assert.deepEqual(lost(), []);
  b.hook("compact-log", { session_id: "s1", agent_id: "r1" });
  assert.notDeepEqual(lost(), []);
  b.read("next-dev-loop", "prokit-runtime-checker", "r1");
  b.read("agent-browser", "prokit-runtime-checker", "r1");
  assert.deepEqual(lost(), []);
});

test("같은 세션의 Main: 앞 라운드에 Skill로 부른 prokit-ui·prokit-web을 이 라운드에서 dev-cycle을 돌린 같은 세션이면 센다. 다른 세션이거나 스킬 파일이 바뀌면 다시 부른다", () => {
  const b = round();
  compactHook(b);
  priorReads(b, [
    { skill: "prokit-ui", tool: "Skill", session: "s1", project: false },
    { skill: "prokit-web", tool: "Skill", session: "s1", project: false },
  ]);
  b.read("vercel-react-best-practices", "prokit-ui-builder", "u1");
  b.edit("apps/web/src/app/page.tsx", "prokit-ui-builder", "u1");
  const main = (session) => b.hook("shell-guard", { tool_name: "Bash", session_id: session, tool_input: { command: `pnpm dev-cycle evidence ${b.impl} --file tasks/evidence/e.txt` } });
  const fill = () => b.set(b.impl, "사용: prokit-ui, prokit-web; 위임: prokit-ui-builder(사용: vercel-react-best-practices(rerender-memo)) → 1개 파일. Next 문서: N/A: 없음");
  const lost = () => b.problems(b.impl).filter((p) => /prokit-ui|prokit-web/.test(p));
  main("s2");
  fill();
  assert.notDeepEqual(lost(), []);
  main("s1");
  fill();
  assert.deepEqual(lost(), []);
  // 압축한 세션은 잇지 않는다
  b.hook("compact-log", { session_id: "s1" });
  assert.notDeepEqual(lost(), []);
});

test("세션 시작 기록이 없는 세션(옛 러너, 훅을 더하기 전에 연 세션)은 첫 기록이 훅 뒤여도 잇지 않는다. 압축 뒤 이어지는 세션 시작도 압축으로 본다", () => {
  const b = round();
  compactHook(b);
  priorReads(b, [
    { skill: "prokit-ui", tool: "Skill", session: "s1", project: false },
    { skill: "prokit-web", tool: "Skill", session: "s1", project: false },
  ], { start: false });
  b.read("vercel-react-best-practices", "prokit-ui-builder", "u1");
  b.edit("apps/web/src/app/page.tsx", "prokit-ui-builder", "u1");
  b.hook("shell-guard", { tool_name: "Bash", session_id: "s1", tool_input: { command: `pnpm dev-cycle evidence ${b.impl} --file tasks/evidence/e.txt` } });
  b.set(b.impl, "사용: prokit-ui, prokit-web; 위임: prokit-ui-builder(사용: vercel-react-best-practices(rerender-memo)) → 1개 파일. Next 문서: N/A: 없음");
  assert.notDeepEqual(b.problems(b.impl).filter((p) => /prokit-ui|prokit-web/.test(p)), []);
  // 세션 시작 훅이 남기는 줄
  b.hook("compact-log", { hook_event_name: "SessionStart", source: "compact", session_id: "s9" });
  const last = readFileSync(join(b.root, ".prokit/skills-used.jsonl"), "utf8").trim().split("\n").at(-1);
  assert.deepEqual(Object.keys(JSON.parse(last)).sort(), ["session", "start", "t"]);
});

test("supervise: 마지막 기록이 오래된(끝났을) 에이전트는 예산을 넘어도 멈추라고 하지 않는다. 일하는 중이면 알린다", () => {
  const b = round();
  b.read("vercel-react-best-practices", "prokit-ui-builder", "u1");
  const budget = SUPERVISE_BUDGET_MIN["prokit-ui-builder"];
  const later = Date.now() + (budget + 3) * 60_000;
  const kinds = (now) => supervise(b.root, b.config, { now }).agents[0].signals.map((s) => s.kind);
  assert.ok(!kinds(later).includes("budget"));
  appendFileSync(join(b.root, ".prokit/skills-used.jsonl"), `${JSON.stringify({ t: new Date(later - 60_000).toISOString(), act: "Bash", cmd: "abc", label: "pnpm", agent: "u1", agentType: "prokit-ui-builder" })}\n`);
  assert.ok(kinds(later).includes("budget"));
});

test("문구만 바꾼 화면 라운드: 디자인 감사는 N/A: 문구만으로 두되 코드 리뷰가 문구만: 확인을 적어야 받는다. 지킬 행과 스타일 파일이 든 diff에는 받지 않는다", () => {
  const b = round();
  const copy = () => b.problems(b.uiAudit).filter((p) => /문구만/.test(p));
  b.set(b.uiAudit, "N/A: 문구만(제목 문구 2개)");
  assert.match(copy().join("\n"), /문구만: 확인을 적어야/);
  b.set(b.code, "위임: prokit-reviewer → prokit-reviewer(code): approve, max=none, 문구만: 아님");
  assert.match(copy().join("\n"), /문구만이 아니라고 판정/);
  b.set(b.code, "위임: prokit-reviewer → prokit-reviewer(code): approve, max=none, 문구만: 확인");
  assert.deepEqual(copy(), []);
  b.set(b.review, "N/A: 문구만");
  assert.match(b.problems(b.review).join("\n"), /이 행은 한다/);
  // 문구 폴더의 JSON은 받고, 설정 JSON·설정 파일·스타일은 받지 않는다
  b.write("apps/web/messages/ko.json", "{}\n");
  assert.deepEqual(copy(), []);
  b.write("apps/web/tsconfig.json", "{}\n");
  assert.match(copy().join("\n"), /화면 글자가 아닌 소스\(apps\/web\/tsconfig\.json\)/);
  b.write("apps/web/next.config.ts", "export default {}\n");
  assert.match(copy().join("\n"), /apps\/web\/next\.config\.ts/);
  b.write("apps/web/src/app/globals.css", "a{}\n");
  assert.match(copy().join("\n"), /apps\/web\/src\/app\/globals\.css/);
});

test("검증 증거 묶음: production 서버의 get_errors는 재지 못한 검사가 아니라 해당 없는 검사로 알린다", () => {
  const b = round();
  const p = b.packet("prod", {}, { nextErrors: { skipped: "해당 없음: production 서버(next start)라 /_next/mcp가 없다(HTTP 404)" } });
  assert.equal(p.r.status, 0, p.r.stderr);
  assert.match(p.r.stdout, /해당 없는 검사: page\.nextErrors/);
  assert.doesNotMatch(p.r.stdout, /재지 못한 검사/);
});
