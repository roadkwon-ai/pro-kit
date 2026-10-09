import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { CASES, LIVING } from "./doc-values.cases.mjs";
import { fill, loadBlocks, loadValues, timeText } from "./doc-values.mjs";

const ROOT = join(import.meta.dirname, "..");
const SCRIPT = join(ROOT, "scripts", "doc-values.mjs");
const read = (f) => readFileSync(join(ROOT, f), "utf8");
const vals = new Map([
  ["x", { value: "새 값" }],
  ["p.goru.title", { value: "고루" }],
]);

test("한 줄 안 값: 표시 사이를 정본 값으로 채우고, 어긋난 곳을 줄과 함께 알린다", () => {
  const uses = new Map();
  const { out, issues } = fill("첫 줄\n값은 <!-- v:x -->옛 값<!-- /v -->이고 <!-- v:x -->새 값<!-- /v -->\n", vals, new Map(), uses);
  assert.equal(out, "첫 줄\n값은 <!-- v:x -->새 값<!-- /v -->이고 <!-- v:x -->새 값<!-- /v -->\n");
  assert.deepEqual(issues, [{ line: 2, key: "x", cur: "옛 값", want: "새 값" }]);
  assert.equal(uses.get("x"), 2);
});

test("모르는 키와 닫지 않은 표시는 채우지 않고 알린다(want 없음)", () => {
  const text = "<!-- v:nope -->a<!-- /v -->\n<!-- v:x -->닫지 않음\n<!-- b:nope -->\n<!-- /b -->\n<!-- b:open -->\n끝\n";
  const { out, issues } = fill(text, vals, new Map());
  assert.equal(out, text);
  assert.deepEqual(
    issues.map((i) => [i.line, i.key, i.want]),
    [
      [1, "nope", undefined],
      [3, "b:nope", undefined],
      [2, "v:x", undefined],
      [5, "b:open", undefined],
    ],
  );
});

test("글 묶음: 인자({{키}}, 띄어 쓴 인자, 기본값)와 값({{v:키}}, 인자로 만든 키)을 넣고, 다른 줄을 알린다", () => {
  const blocks = new Map([["demo", { desc: "", body: "폴더 [{{folder}}], {{v:p.{{name}}.title}}\n{{concept}}를 만들고, {{end|HTML로 내보내줘}}." }]]);
  const text = '앞\n<!-- b:demo folder=goru name=goru concept="같이 쓰는 생활비" -->\n폴더 [goru], 고루\n옛 줄\n<!-- /b -->\n뒤\n';
  const uses = new Map();
  const { out, issues } = fill(text, vals, blocks, uses);
  assert.equal(
    out,
    '앞\n<!-- b:demo folder=goru name=goru concept="같이 쓰는 생활비" -->\n폴더 [goru], 고루\n같이 쓰는 생활비를 만들고, HTML로 내보내줘.\n<!-- /b -->\n뒤\n',
  );
  assert.deepEqual(issues, [{ line: 4, key: "b:demo", cur: "옛 줄", want: "같이 쓰는 생활비를 만들고, HTML로 내보내줘." }]);
  assert.equal(uses.get("b:demo"), 1);
  assert.equal(uses.get("p.goru.title"), 1);
  assert.deepEqual(fill(out, vals, blocks).issues, [], "채운 글은 다시 어긋나지 않는다");

  const end = fill('<!-- b:demo folder=a name=goru concept=b end="[GitHub Pages]에 배포해줘" -->\n<!-- /b -->\n', vals, blocks).out;
  assert.match(end, /b를 만들고, \[GitHub Pages\]에 배포해줘\.\n<!-- \/b -->\n$/);
  assert.deepEqual(
    fill("<!-- b:demo name=goru -->\n<!-- /b -->\n", vals, blocks).issues.map((i) => [i.key, i.cur, i.want]),
    [["b:demo", "인자 없음: folder,concept", undefined]],
  );
});

test("저장소 전체: node scripts/doc-values.mjs --check가 통과한다", () => {
  const r = spawnSync(process.execPath, [SCRIPT, "--check"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("doc-values.json 프리셋 이름 = tutorials/packs.json 팩 이름, 분류는 landing·app·clone", () => {
  const presets = JSON.parse(read("doc-values.json")).presets;
  assert.deepEqual(Object.keys(presets).sort(), Object.keys(JSON.parse(read("tutorials/packs.json"))).sort());
  for (const [n, p] of Object.entries(presets)) assert.match(p.kind, /^(landing|app|clone)$/, n);
});

// 묶음 원본에 인자를 넣어 펼친 글(끝 줄바꿈 포함). 채울 수 없으면 던진다.
function caseBody(block, args, values, blocks) {
  const marker = `<!-- b:${block}${Object.entries(args).map(([k, v]) => ` ${k}="${v}"`).join("")} -->\n<!-- /b -->\n`;
  const { out, issues } = fill(marker, values, blocks);
  assert.deepEqual(issues.filter((i) => i.want === undefined), [], block);
  return out.slice(out.indexOf("\n") + 1, -"<!-- /b -->\n".length);
}
const marked = (src, block) => src.includes(`<!-- b:${block} `) || src.includes(`<!-- b:${block} -->`);

test("화면만 첫 프롬프트(living)를 한 줄로 붙여 쓴 사본(README.md의 인용, handbook quickstart-screens.md)은 screen-prompt 묶음 결과의 줄바꿈을 공백으로, 바꿀 곳 괄호를 뗀 글이다", () => {
  const flat = caseBody("screen-prompt", LIVING, loadValues(), loadBlocks())
    .split("\n")
    .filter((l) => !l.startsWith("```"))
    .join(" ")
    .replace(/[[\]]/g, "")
    .trim();
  assert.ok(read("README.md").includes(`\n> ${flat}\n`), "README.md");
  assert.ok(read("handbook/start/quickstart-screens.md").includes(`\n${flat}\n`), "handbook/start/quickstart-screens.md");
});

test("묶음 원본은 지금 글과 같은 결과를 낸다(표시를 달 곳과 인자)", () => {
  const values = loadValues();
  const blocks = loadBlocks();
  const used = new Set(CASES.map((c) => c[1]));
  assert.deepEqual([...blocks.keys()].filter((b) => !used.has(b)), [], "확인하지 않은 묶음");
  const bad = [];
  for (const [file, block, args] of CASES) {
    const src = read(file);
    if (marked(src, block)) continue;
    if (!plain(src).includes(caseBody(block, args, values, blocks))) bad.push(`${file} ${block}`);
  }
  assert.deepEqual(bad, []);
});

test("계산값: 이미지 도구 에이전트, 묻지 않고 진행하는 옵션과 여는 명령, 화면 프리셋 페이지 수 범위, 템플릿 포트", () => {
  const values = loadValues();
  const want = {
    "agents.imageTools": "Codex, Antigravity, Grok Build",
    "agent.claude.yolo": "claude --dangerously-skip-permissions",
    "agent.codex.yolo": "codex --yolo",
    "agent.agy.yolo": "agy --dangerously-skip-permissions",
    "agent.grok.yolo": "grok --permission-mode bypassPermissions",
    "agent.codex.yoloCode": "`codex --yolo`",
    "agent.claude.startCode": "`claude`",
    "agent.grok.startCode": "`grok --trust`",
    "agent.agy.openCode": "`agy -i \"<요청>\"`",
    "agent.grok.openCode": "`grok --trust \"<요청>\"`",
    "agent.claude.start": "claude",
    "agent.codex.start": "codex",
    "agent.agy.start": "agy",
    "agent.grok.start": "grok --trust",
    "presets.screen.pages.range": "7\\~22",
    "port.web": "3001",
    "port.neonDb": "5432",
    "port.supabaseDb": "54322",
    "port.web.urlCode": "`http://localhost:3001`",
    "port.neonDb.addrCode": "`localhost:5432`",
    "port.supabaseDb.addrCode": "`127.0.0.1:54322`",
  };
  assert.deepEqual(Object.fromEntries(Object.keys(want).map((k) => [k, values.get(k)?.value])), want);
});

// 표시를 뗀 글: <!-- v:키 -->와 <!-- /v -->만 지운다(홈페이지 sync와 같다)
const plain = (s) => s.replace(/<!-- (?:v:[\w.-]+|\/v) -->/g, "");

test("Node 판: 두 템플릿의 설치기와 README 준비물이 doc-values.json의 node.min·node.recommended·supabaseCli.min과 같고, 준비물 줄에 값 표시가 달려 있다", () => {
  const d = JSON.parse(read("doc-values.json"));
  const { min, recommended } = d.node;
  for (const t of ["prokit-next-neon", "prokit-next-supabase"]) {
    const install = read(`templates/${t}/install.mjs`);
    const [maj, minor] = min.split(".").map(Number);
    assert.ok(install.includes(`Node ${min} 이상이 필요하다`), `${t}/install.mjs 오류 문구`);
    assert.ok(install.includes(`major < ${maj} || (major === ${maj} && minor < ${minor})`), `${t}/install.mjs 하한 비교`);
    assert.ok(install.includes(`major < ${recommended}) warnings.push(\`Node ${recommended} 이상을 권장한다`), `${t}/install.mjs 권장 경고`);
    const readme = read(`templates/${t}/README.md`);
    assert.match(plain(readme), new RegExp(`\\n- Node ${min.replace(".", "\\.")} 이상\\(${recommended} 권장\\)`), `${t}/README.md 준비물`);
    assert.ok(readme.includes(`<!-- v:node.min -->${min}<!-- /v --> 이상(<!-- v:node.recommended -->${recommended}<!-- /v --> 권장)`), `${t}/README.md 준비물 값 표시`);
  }
  const supabase = read("templates/prokit-next-supabase/README.md");
  assert.ok(supabase.includes(`- Supabase CLI <!-- v:supabaseCli.min -->${d.supabaseCli.min}<!-- /v --> 이상(`), "supabase README Supabase CLI 값 표시");
});

// "5분 · 5.5만 · 1달러" 꼴 칸의 시간(분)·토큰(만)·달러. "팩에서 받기 1분"처럼 시간만 있는 칸은 시간만 센다.
const num = (s) => Number(s.replace(/,/g, ""));
const tokensOf = (s) => num(s.slice(0, -1)) * (s.endsWith("억") ? 1e8 : 1e4);
const mins = (s) => Number(s.match(/(\d+)시간/)?.[1] ?? 0) * 60 + Number(s.match(/(\d+)분/)?.[1] ?? 0);
function stageCell(cell) {
  const parts = cell.split("·").map((x) => x.trim());
  if (parts.length < 3) return /\d+분/.test(cell) ? { min: mins(cell), tokens: 0, usd: 0 } : null;
  const t = parts[1].match(/^([\d.]+)(만|억)$/);
  return { min: mins(parts[0]), tokens: num(t[1]) * (t[2] === "억" ? 1e4 : 1), usd: /미만/.test(parts[2]) ? 0 : num(parts[2].match(/\d+/)[0]) };
}

test("단계별 예상 표: 합계 행이 단계 합과 5% 안에서 같다(시간·토큰, 달러는 1달러 단위 반올림 2달러 여유), 프리셋 팩으로 만드는 칸은 처음부터 칸보다 크지 않다", () => {
  const d = JSON.parse(read("doc-values.json")).presets;
  const bad = [];
  for (const [name, p] of Object.entries(d)) {
    if (p.kind === "clone") continue;
    const rows = plain(read(`tutorials/samples/${name}.md`))
      .split("\n")
      .filter((l) => /^\| (준비|기획|디자인|화면 구성|그림|첫 화면|나머지|검사와|HTML)/.test(l))
      .map((l) => l.split("|").map((c) => c.trim()).filter(Boolean));
    assert.equal(rows.length, 9, `${name}: 단계 행`);
    for (const r of rows) {
      const [pack, scratch] = [stageCell(r[1]), stageCell(r[2])];
      if (pack && scratch && (pack.tokens > scratch.tokens || pack.min > scratch.min)) bad.push(`${name} ${r[0]}: 팩 칸이 처음부터 칸보다 크다`);
    }
    for (const [col, run] of [[1, "pack"], [2, "scratch"]]) {
      const sum = { min: 0, tokens: 0, usd: 0 };
      for (const r of rows) for (const [k, v] of Object.entries(stageCell(r[col]) ?? {})) sum[k] += v;
      const total = { min: mins(p[run].time), tokens: num(p[run].tokens.match(/[\d.,]+/)[0]) * (p[run].tokens.endsWith("억") ? 1e4 : 1), usd: num(p[run].usd) };
      for (const [k, slack] of [["min", 0], ["tokens", 0], ["usd", 2]])
        if (Math.abs(sum[k] - total[k]) > total[k] * 0.05 + slack) bad.push(`${name} ${run} ${k}: 단계 합 ${sum[k]} ≠ 합계 ${total[k]}`);
    }
  }
  assert.deepEqual(bad, []);
});

// 반올림 규칙(x.5는 올림). 1달러 미만은 "1달러 미만"으로 쓴다
const usdText = (x) => (x < 1 ? "1달러 미만" : `${Math.floor(x + 0.5 + 1e-9)}달러`);

test("단계별 예상 표: 칸의 달러는 규칙대로 반올림한 값이다(토큰이 cost.tokens.<달러> 표시면 그 달러, 아니면 토큰 ÷ cost.tokensPerUsd. x.5는 올림, 1 미만은 \"1달러 미만\"), 같은 토큰에는 같은 달러를 쓴다", () => {
  const per = tokensOf(loadValues().get("cost.tokensPerUsd").value) / 1e4;
  const usdByTokens = new Map();
  const bad = [];
  for (const [name, p] of Object.entries(JSON.parse(read("doc-values.json")).presets)) {
    if (p.kind === "clone") continue;
    read(`tutorials/samples/${name}.md`)
      .split("\n")
      .filter((l) => /^\| (준비|기획|디자인|화면 구성|그림|첫 화면|나머지|검사와|HTML|\(선택\))/.test(plain(l)))
      .forEach((l) =>
        l.split("|").slice(2).forEach((cell) => {
          const parts = cell.split("·").map((x) => x.trim());
          if (parts.length < 3) return;
          const key = parts[1].match(/^<!-- v:cost\.tokens\.([\d.]+) -->/)?.[1];
          const tokens = plain(parts[1]).replace(/,/g, "");
          const want = usdText(key ? Number(key) : (Number(tokens.slice(0, -1)) * (tokens.endsWith("억") ? 1e4 : 1)) / per);
          if (parts[2] !== want) bad.push(`${name}: ${plain(cell).trim()} → ${want}`);
          const seen = usdByTokens.get(plain(parts[1]));
          if (seen !== undefined && seen !== parts[2]) bad.push(`${name}: 같은 ${plain(parts[1])}에 ${seen}와 ${parts[2]}`);
          usdByTokens.set(plain(parts[1]), parts[2]);
        }),
      );
  }
  assert.deepEqual(bad, []);
});

test("디자인 카탈로그: 이름·규모·확인한 날이 doc-values.json에 있고, 설치본 impeccable-map.md의 Refero 규모(N개 이상)가 그 규모와 맞는다", () => {
  const values = loadValues();
  const want = {
    "catalogs.kr.name": "getdesign.kr", "catalogs.kr.count": "23", "catalogs.kr.date": "2026-10-04",
    "catalogs.awesome.name": "awesome-design-md", "catalogs.awesome.count": "74", "catalogs.awesome.date": "2026-09-30",
    "catalogs.refero.name": "Refero Styles", "catalogs.refero.count": "1,342", "catalogs.refero.date": "2026-10-04",
  };
  assert.deepEqual(Object.fromEntries(Object.keys(want).map((k) => [k, values.get(k)?.value])), want);
  const floor = (Math.floor(Number(values.get("catalogs.refero.count").value.replace(/,/g, "")) / 100) * 100).toLocaleString("en-US");
  for (const t of ["prokit-next-neon", "prokit-next-supabase"]) {
    const map = read(`templates/${t}/files/.agents/skills/prokit-ui/references/impeccable-map.md`);
    assert.ok(map.includes(`| ${values.get("catalogs.refero.name").value} | 해외 제품 웹사이트 ${floor}개 이상.`), `${t} impeccable-map.md Refero 규모`);
  }
});

test("묶음 안의 {{b:이름}}은 다른 묶음 원본을 같은 인자로 펼친다", () => {
  const blocks = new Map([
    ["one", { desc: "", body: "- 하나 {{x}}" }],
    ["all", { desc: "", body: "{{b:one}}\n- 둘 {{x}}" }],
  ]);
  const { out, issues } = fill('<!-- b:all x=A -->\n<!-- /b -->\n', new Map(), blocks);
  assert.deepEqual(issues.filter((i) => i.want === undefined), []);
  assert.equal(out, "<!-- b:all x=A -->\n- 하나 A\n- 둘 A\n<!-- /b -->\n");
  assert.deepEqual(fill("<!-- b:all x=A -->\n<!-- /b -->\n", new Map(), new Map([["all", blocks.get("all")]])).issues.map((i) => [i.key, i.cur, i.want]), [["b:all", "모르는 묶음: one", undefined]]);
});

test("first-trouble의 첫 줄(비밀번호)은 trouble-password 묶음과 같다", () => {
  const blocks = loadBlocks();
  assert.ok(blocks.get("first-trouble").body.startsWith(`{{b:trouble-password}}\n`) || blocks.get("first-trouble").body.startsWith(blocks.get("trouble-password").body));
});

test("계산값 2: 비용 단위, 한글 수사, 케이스 범위, 화면 점수 기준, 선택 스킬 묶음, 팩 수, 프리셋 분야·난이도·디자인 사실", () => {
  const values = loadValues();
  const want = {
    "cost.tokensPerUsd": "5.5만", "cost.cachedPerUsd": "275만", "cost.multiplier": "2~3", "cost.multiplierModel": "1~2", "cost.multiplierRefine": "1.1~3",
    "cost.feature.time": "15분", "cost.feature.usd": "7", "cost.date": "2026-10-05", "cost.image.tokens": "1.7만",
    "templates.count.ko": "두", "prokit.skills.count.ko": "여덟", "prokit.agents.count.ko": "두", "agents.count.ko": "네", "devCycle.cases.count.ko": "일곱", "optional.count": "3", "optional.count.ko": "세",
    "devCycle.cases.range": "A\\~F·H", "devCycle.ui.auditMin": "16", "devCycle.ui.a11yMin": "3",
    "optional.names": "ops, motion, mobile", "optional.namesCode": "`ops`, `motion`, `mobile`",
    "optional.ops.skillsCode.neon": "`vercel-optimize`, `neon-functions`, `neon-object-storage`, `neon-ai-gateway`", "optional.ops.skillsCode.supabase": "`vercel-optimize`",
    "optional.ops.skillsCode.shared": "`vercel-optimize`", "optional.ops.skillsCode.neonOnly": "`neon-functions`, `neon-object-storage`, `neon-ai-gateway`", "optional.ops.count.neon": "4", "optional.ops.count.supabase": "1", "optional.motion.skillsCode": "`vercel-react-view-transitions`", "optional.mobile.skillsCode": "`vercel-react-native-skills`",
    "agent.claude.install": "curl -fsSL https://claude.ai/install.sh | bash", "agent.codex.install": "curl -fsSL https://chatgpt.com/codex/install.sh | sh",
    "agent.codex.installCell": "`curl -fsSL https://chatgpt.com/codex/install.sh \\| sh`",
    "cli.neon.installCode": "`npm install -g neon`", "cli.vercel.installCode": "`npm install -g vercel`",
    "policy.agentBrowser.da": "agent-browser CLI가 없거나 npm 최신판보다 낮으면 전역에 최신판을 설치한다", "policy.agentBrowser.yo": "agent-browser CLI는 없거나 npm 최신판보다 낮으면 기본으로 최신판을 설치해요", "node.eol": "2026-04-30", "vercel.node": "24.x", "vercel.node20Stop": "2026-10-01", "meta.presetModel": "Opus 5.5", "packs.count": "11",
    "preset.goru.pages.rest": "6", "preset.olgot.pageTypes.rest": "47",
    "preset.goru.field": "공동 생활비 정산", "preset.goru.summary": "같이 사는 사람들의 생활비 정산", "preset.goru.difficulty": "쉬움", "preset.goru.kindLabel": "앱 화면", "preset.ullim.kindLabel": "랜딩페이지",
    "preset.goru.design.rec1": "Monzo", "preset.goru.design.rec2": "당근 SEED", "preset.goru.design.rec3": "Monarch", "preset.goru.design.src1": "Refero Styles", "preset.goru.design.src2": "getdesign.kr",
    "preset.goru.design.comp": "A", "preset.goru.design.compName": "9월 타임라인", "preset.goru.design.color": "홍시색", "preset.goru.design.hexCode": "`#c9421d`",
    "preset.goru.design.images": "5", "preset.goru.design.clicks": "67", "preset.goru.design.critique": "30", "preset.olgot.design.clicks": "2,025",
    "presets.design.first.summary": "Refero Styles 6개, awesome-design-md 2개",
    "gloss.presetPack": "만들 서비스의 화면 구성, 디자인, 예시 데이터, 그림을 묶어 둔 폴더", "gloss.clonePack": "만들 서비스의 화면 구성, 기능 규칙, 디자인 노트, 예시 데이터, 그림을 묶어 둔 폴더", "gloss.round": "기능 하나를 만들거나 요청한 것을 고치고 확인까지 마치는 작업 묶음",
    "gloss.migration": "DB의 표를 만들거나 바꾸는 기록", "gloss.spec": "기능의 범위와 동작을 적은 문서",
    "preset.claudle.dailyLimit": "200", "port.supabasePooler": "6543", "limit.pro5h.plans": "Claude Pro · ChatGPT Plus(Codex)",
    "policy.agentBrowser.cell": "없거나 npm 최신판보다 낮으면 기본으로 최신판을 설치", "preset.goru.pack.tokens": "125만", "presets.pack.tokens.range": "125만\\~550만",
    "presets.design.critique.list": "제철상자 35, 하루공부 33, PACECREW 31, 고루 30, 올곧 30, 울림 29, AFTERGLOW 29, 핏슬롯 28, Uptrail 28",
    "eval.requests": "13", "eval.checks": "52", "eval.dev-cycle.with": "93", "eval.dev-cycle.without": "27", "eval.ui.with": "100", "eval.ui.without": "12", "eval.verify.without": "71",
    "eval.designMd.palette.with": "99", "eval.designMd.palette.without": "71", "eval.designMd.services": "4",
    "eval.designMd.fontSize.with": "100", "eval.designMd.fontSize.without": "77", "eval.designMd.secondScreen.with": "95", "eval.designMd.secondScreen.without": "97", "eval.designMd.palette.offTarget": "29",
  };
  assert.deepEqual(Object.fromEntries(Object.keys(want).map((k) => [k, values.get(k)?.value])), want);
});

test("tutorials/samples/README.md 표: 화면 프리셋 9개가 모두 있고 페이지가 적은 순이다", () => {
  const presets = JSON.parse(read("doc-values.json")).presets;
  const rows = [...read("tutorials/samples/README.md").matchAll(/^\| \[.*?\]\((\w+)\.md\) \|.*?<!-- v:preset\.(\w+)\.pages -->/gm)].map((m) => [m[1], m[2]]);
  assert.deepEqual(rows.map(([a, b]) => a === b), rows.map(() => true), "링크 파일과 pages 키의 프리셋이 같다");
  const names = rows.map(([a]) => a);
  assert.deepEqual([...names].sort(), Object.entries(presets).filter(([, p]) => p.kind !== "clone").map(([n]) => n).sort());
  const pages = names.map((n) => Number(presets[n].pages));
  assert.deepEqual(pages, [...pages].sort((a, b) => a - b));
});

test("README 배지(주소는 표시를 달 수 없다): Node 최소 판과 에이전트 이름이 정본과 같다(주소와 alt 둘 다)", () => {
  const values = loadValues();
  const readme = read("README.md");
  const min = values.get("node.min").value;
  const names = values.get("agents.list").value.split(", ");
  const enc = encodeURIComponent;
  assert.ok(readme.includes(`badge/node-${enc("≥")}${min}-`), "Node 배지 주소");
  assert.ok(readme.includes(`alt="Node ${min} 이상"`), "Node 배지 alt");
  assert.ok(readme.includes(`badge/agents-${names.map((n) => enc(n)).join(`%20${enc("·")}%20`)}-`), "에이전트 배지 주소");
  assert.ok(readme.includes(`alt="${names.join(", ")}"`), "에이전트 배지 alt");
});

test("README '만들어 본 예시'는 대표 예시 4개(고루, 올곧, PACECREW, Nextflix)로 고정한다", () => {
  // 카드 = 그림이 든 <td>. 프리셋 이름은 카드 안 제목 표시(preset.<이름>.title)에서 읽는다
  const cards = [...read("README.md").matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
    .filter((m) => m[1].includes("<img"))
    .map((m) => m[1].match(/<!-- v:preset\.(\w+)\.title -->/)?.[1] ?? m[1].slice(0, 60));
  const why = "README에는 대표 예시 4개만 둔다. 새 프리셋은 README에 더하지 않고 프로킷 사이트와 tutorials/samples/README.md 목록(클론은 tutorials/README.md)에만 더한다(AGENTS.md 템플릿 수정 규칙)";
  assert.ok(cards.length <= 4, `카드 ${cards.length}개: ${cards.join(", ")}. ${why}`);
  assert.deepEqual(cards, ["goru", "olgot", "pacecrew", "nextflix"], why);
});

test("설치본 prokit-ui/SKILL.md의 화면 점수 기준(기본 N/20, 기본 N/4)이 .dev-cycle.json의 ui.auditMin·ui.a11yMin과 같다", () => {
  const values = loadValues();
  const [a, b] = [values.get("devCycle.ui.auditMin").value, values.get("devCycle.ui.a11yMin").value];
  for (const t of ["prokit-next-neon", "prokit-next-supabase"]) {
    const skill = read(`templates/${t}/files/.agents/skills/prokit-ui/SKILL.md`);
    assert.ok(skill.includes(`\`ui.auditMin\`(기본 ${a}/20)`), `${t} auditMin`);
    assert.ok(skill.includes(`\`ui.a11yMin\`(기본 ${b}/4)`), `${t} a11yMin`);
  }
});

test("설치본 AGENTS.md의 선택 스킬 묶음 표가 skills.manifest.json optional(묶음 이름, 스킬)과 같다", () => {
  for (const t of ["neon", "supabase"]) {
    const dir = `templates/prokit-next-${t}/files`;
    const optional = JSON.parse(read(`${dir}/skills.manifest.json`)).optional;
    const rows = [...read(`${dir}/AGENTS.md`).matchAll(/^\| `(\w+)` \| [^|]* \| ([^|]*) \| `prokit-[\w-]+` \|$/gm)].map((m) => [m[1], m[2].match(/`([\w-]+)`/g).map((s) => s.slice(1, -1))]);
    assert.deepEqual([...new Set(rows.map(([b]) => b))], Object.keys(optional), `${t} 묶음 이름`);
    for (const [b, def] of Object.entries(optional)) {
      const want = def.skills.flatMap((s) => s.skills);
      assert.deepEqual(rows.filter(([name]) => name === b).flatMap(([, skills]) => skills), want, `${t} ${b} 스킬`);
    }
  }
});

test("설치본 supabase prokit-db 스킬의 transaction pooler 포트가 doc-values.json ports.supabasePooler와 같다", () => {
  const port = loadValues().get("port.supabasePooler").value;
  const dir = "templates/prokit-next-supabase/files/.agents/skills/prokit-db";
  assert.ok(read(`${dir}/SKILL.md`).includes(`transaction pooler(${port})`), "SKILL.md");
  assert.ok(read(`${dir}/references/migration-flow.md`).includes(`transaction pooler(${port})`), "migration-flow.md");
});

test("설치본 prokit-deploy/SKILL.md의 Vercel Node 20 중단일과 바꿀 판이 doc-values.json과 같다", () => {
  const values = loadValues();
  for (const t of ["prokit-next-neon", "prokit-next-supabase"]) {
    const skill = read(`templates/${t}/files/.agents/skills/prokit-deploy/SKILL.md`);
    assert.ok(skill.includes(`${values.get("vercel.node20Stop").value} 이후 Vercel 프로젝트의 Node.js 20.x(Project Settings에서 ${values.get("vercel.node").value}로 바꾼다)`), t);
  }
});

// 두 템플릿 manifest의 스킬 → 출처(source)
function manifestSources() {
  const map = new Map();
  const all = [];
  for (const t of ["neon", "supabase"]) {
    const m = JSON.parse(read(`templates/prokit-next-${t}/files/skills.manifest.json`));
    for (const group of [...m.skills, ...Object.values(m.optional).flatMap((o) => o.skills)]) {
      all.push(group.source);
      for (const s of group.skills) map.set(s, group.source);
    }
  }
  return { map, sources: [...new Set(all)].sort() };
}

test("THIRD_PARTY_NOTICES.md의 외부 source 목록이 두 템플릿 manifest의 source와 같다(정렬 순서까지)", () => {
  const notices = read("THIRD_PARTY_NOTICES.md");
  const section = notices.slice(notices.indexOf("### 매니페스트의 외부 source 목록"));
  const listed = [...section.matchAll(/^- \[([\w./-]+)\]\(https:\/\/github\.com\/([\w./-]+)\)$/gm)].map((m) => [m[1], m[2]]);
  assert.deepEqual(listed.map(([a, b]) => a === b), listed.map(() => true), "글자와 주소가 같다");
  assert.deepEqual(listed.map(([a]) => a), manifestSources().sources);
});

test("handbook/skills/official-skills.md 표의 스킬과 출처 열이 manifest의 source와 같다", () => {
  const { map } = manifestSources();
  const rows = [...read("handbook/skills/official-skills.md").matchAll(/^\| ([^|]+) \| ((?:`[\w-]+`(?:, )?)+) \| ([\w./-]+(?:, [\w./-]+)*) \| /gm)];
  assert.ok(rows.length >= 14, `행 ${rows.length}개`);
  const bad = [];
  for (const [, area, skills, source] of rows) {
    const want = [...new Set([...skills.matchAll(/`([\w-]+)`/g)].map((m) => map.get(m[1])))];
    if (want.includes(undefined)) bad.push(`${area}: manifest에 없는 스킬`);
    else if (want.join(", ") !== source) bad.push(`${area}: 출처 ${source} ≠ manifest ${want.join(", ")}`);
  }
  assert.deepEqual(bad, []);
});

test("CONTRIBUTING.md의 릴리스·팩 올리기 명령은 정본 AGENTS.md에 같은 글자로 있고, 문장 복사 대신 링크로 줄였다", () => {
  const contributing = read("CONTRIBUTING.md");
  const agents = read("AGENTS.md");
  const cmds = [...contributing.matchAll(/`((?:node scripts\/(?:release|pack)\.mjs|gh release)[^`]*)`/g)].map((m) => m[1]);
  assert.ok(cmds.length >= 5, `명령 ${cmds.length}개`);
  for (const c of cmds) assert.ok(agents.includes(c), `AGENTS.md에 없는 명령: ${c}`);
  // 규칙 문장은 AGENTS.md에만 둔다: 템플릿 수정 흐름·릴리스·팩 올리기가 원문 링크를 가진다
  for (const anchor of ["#템플릿-수정-규칙", "#버전과-릴리스"]) assert.ok(contributing.includes(`](AGENTS.md${anchor})`), anchor);
  for (const t of ["neon", "supabase"]) {
    const readme = read(`templates/prokit-next-${t}/README.md`);
    assert.ok(readme.includes("(../../AGENTS.md#템플릿-수정-규칙)"), `${t} README는 공유 파일 규칙을 AGENTS.md로 링크한다`);
    assert.ok(!readme.includes("바이트가 같아야 한다"), `${t} README에 공유 파일 규칙 문장 복사가 없다`);
  }
});

test("handbook/reference/commands.md의 pnpm 명령(앞부분과 플래그)이 템플릿 README의 명령 표에도 있다", () => {
  // README 명령 표의 코드: 한 칸에 `pnpm dev-cycle status`, `audit`처럼 이어 쓴 것은 앞 명령의 앞부분을 이어받아 펼친다
  const heads = new Set();
  let text = "";
  for (const t of ["neon", "supabase"]) {
    const readme = plain(read(`templates/prokit-next-${t}/README.md`));
    text += readme;
    for (const row of readme.matchAll(/^\| ((?:`[^`]+`(?:, )?)+) \|/gm)) {
      let prefix = "";
      for (const s of row[1].matchAll(/`([^`]+)`/g)) {
        const c = s[1];
        if (c.startsWith("pnpm ")) {
          heads.add(c.split(" ").filter((w) => !w.startsWith("[") && !w.startsWith("<") && !w.startsWith("--")).slice(0, c.startsWith("pnpm dev-cycle") ? 3 : 2).join(" "));
          prefix = c.split(" ").slice(0, 2).join(" ");
        } else if (prefix) heads.add(`${prefix} ${c.split(" ")[0]}`);
      }
    }
  }
  const bad = [];
  // pro-kit 저장소 자체 명령(템플릿 README에 없다)은 뺀다
  const own = new Set(["pnpm dev:web", "pnpm check-types"]);
  for (const row of plain(read("handbook/reference/commands.md")).matchAll(/^\| ((?:`[^`]+`(?:, )?)+) \|/gm)) {
    for (const s of row[1].matchAll(/`(pnpm [^`]+)`/g)) {
      const c = s[1];
      const head = c.split(" ").filter((w) => !w.startsWith("[") && !w.startsWith("<") && !w.startsWith("--")).slice(0, c.startsWith("pnpm dev-cycle") ? 3 : 2).join(" ");
      if (!own.has(head) && !heads.has(head) && !text.includes(c)) bad.push(`명령 ${c}`);
      for (const flag of c.match(/--[\w-]+/g) ?? []) if (!text.includes(flag)) bad.push(`플래그 ${flag} (${c})`);
    }
  }
  assert.deepEqual(bad, []);
});

test("전역 CLI 설치 명령(cli.<이름>.install)은 템플릿 skills.manifest.json의 global install을 정본으로 읽은 값이다", () => {
  const values = loadValues();
  for (const [id, name] of [["neon", "Neon CLI"], ["vercel", "Vercel CLI"], ["omx", "OMX CLI"]]) {
    const cmds = ["neon", "supabase"].flatMap((t) => JSON.parse(read(`templates/prokit-next-${t}/files/skills.manifest.json`)).global.filter((g) => g.name === name).map((g) => g.install));
    assert.ok(cmds.length >= 1 && new Set(cmds).size === 1, `${name}: 두 템플릿의 install이 같다`);
    assert.equal(values.get(`cli.${id}.install`)?.value, cmds[0]);
    assert.equal(values.get(`cli.${id}.installCode`)?.value, `\`${cmds[0]}\``);
  }
  assert.equal(JSON.parse(read("doc-values.json")).cli, undefined, "손으로 적은 cli 값은 없다(manifest가 정본)");
});

test("계산값 3: 달러에서 토큰·캐시 포함 토큰을 계산한 값(cost.tokens.<달러>, cost.cached.<달러>)", () => {
  const values = loadValues();
  const want = {
    "cost.tokens.1": "5.5만", "cost.cached.1": "280만", "cost.tokens.1.5": "8.3만", "cost.tokens.3.5": "19만", "cost.tokens.0.5": "2.8만", "cost.cached.0.5": "140만",
    "cost.tokens.15": "83만", "cost.cached.15": "4,100만", "cost.tokens.70": "390만", "cost.cached.70": "1.9억", "cost.cached.100": "2.8억",
  };
  assert.deepEqual(Object.fromEntries(Object.keys(want).map((k) => [k, values.get(k)?.value])), want);
});

test("시간 범위: 배수(cost.timeRange)가 기존 배수 글과 맞고, 정본 시간 키마다 한 번에 완성 최대·여러 번 고칠 때·표 칸·문장 값을 계산한다(5분 단위 반올림)", () => {
  const C = JSON.parse(read("doc-values.json")).cost;
  const { oneShotMax: a, reviseMax: b } = C.timeRange;
  assert.equal(C.multiplier, `${a}~${b}`, "넉넉히 잡는 배수 = 한 번 완성 최대~여러 번 고칠 때");
  assert.ok(C.multiplierModel.endsWith(`~${a}`), "한 번 완성 최대 = 쓰는 AI·모델 배수의 위 끝");
  assert.ok(C.multiplierRefine.endsWith(`~${b}`), "여러 번 고칠 때 = 다시 디자인하고 다듬을 때 배수의 위 끝");
  assert.deepEqual([60, 45, 134, 128, 345 * 3].map(timeText), ["1시간", "45분", "2시간 15분", "2시간 10분", "17시간 15분"]);
  const values = loadValues();
  const want = {
    "cost.timeRange.oneShotMax": "2", "cost.timeRange.reviseMax": "3",
    "preset.olgot.pack.time.max": "7시간 50분", "preset.olgot.pack.time.revise": "11시간 45분",
    "preset.goru.pack.time.cell": "약 1시간\\~2시간 (여러 번 고치면 약 3시간까지)",
    "preset.goru.scratch.time.text": "한 번에 완성하면 약 1시간 30분\\~3시간(여러 번 고쳐 달라고 하면 약 4시간 30분까지)",
    "preset.claudle.full.time.text": "한 번에 완성하면 약 5시간\\~10시간(여러 번 고쳐 달라고 하면 약 15시간까지)",
    "preset.nextflix.screens.time.cell": "약 2시간 25분\\~4시간 50분 (여러 번 고치면 약 7시간 15분까지)",
    "presets.pack.time.text": "한 번에 완성하면 약 1시간\\~7시간 50분(여러 번 고쳐 달라고 하면 약 11시간 45분까지)",
    "presets.scratch.time.revise": "17시간 15분",
  };
  assert.deepEqual(Object.fromEntries(Object.keys(want).map((k) => [k, values.get(k)?.value])), want);
});

test("고칠 때마다 더 드는 시간(cost.revise): doc-values.json에는 물결을 그대로 두고(홈페이지는 --json 내보내기로 읽는다), 문서 값은 \\~로 바꾼다", () => {
  const R = JSON.parse(read("doc-values.json")).cost.revise;
  assert.equal(R.fix, "2~12분");
  const values = loadValues();
  const want = {
    "cost.revise.fix": "2\\~12분", "cost.revise.check": "1\\~3분", "cost.revise.recheck.13": "5분", "cost.revise.recheck.203": "6\\~37분",
    "cost.revise.review": "4\\~10분", "cost.revise.close": "1\\~15분", "cost.revise.oneSpot": "10분", "cost.revise.twoSpots": "28\\~43분", "cost.revise.reviewRound": "2\\~3시간",
  };
  assert.deepEqual(Object.fromEntries(Object.keys(want).map((k) => [k, values.get(k)?.value])), want);
});

test("요약 시간은 범위로 쓴다: 정본 시간 키(preset.<이름>.<pack|scratch|screens|full>.time, presets.<pack|scratch>.time.range)를 맨값으로 표시한 곳이 없고, README의 HTML 줄에는 \\~를 쓰지 않는다", () => {
  const bare = /v:(?:preset\.(?:\w+|\{\{name\}\})\.(?:pack|scratch|screens|full)\.time|presets\.(?:pack|scratch)\.time\.range)(?: -->|\}\})/g;
  const bad = [];
  for (const f of spawnSync("git", ["ls-files", "*.md"], { cwd: ROOT, encoding: "utf8" }).stdout.split("\n")) {
    if (!f || /^(release|docs\/superpowers)\//.test(f) || f === "docs/common-values.md" || !existsSync(join(ROOT, f))) continue;
    for (const m of read(f).matchAll(bare)) bad.push(`${f}: ${m[0]} (단계별 표 칸은 표시 없는 최솟값, 요약은 .text·.cell을 쓴다)`);
  }
  for (const [i, l] of read("README.md").split("\n").entries()) if (l.startsWith("<") && l.includes("\\~")) bad.push(`README.md:${i + 1}: HTML 안의 \\~는 그대로 보인다`);
  assert.deepEqual(bad, []);
});

test("클론 튜토리얼 README \"단계별 예상\" 표: 토큰·캐시 포함 칸이 같은 행의 달러에서 계산한 값과 같다", () => {
  const values = loadValues();
  const bad = [];
  for (const dir of ["01-nextflix", "02-claudle"]) {
    const rows = [...plain(read(`tutorials/${dir}/README.md`)).matchAll(/^\| (\d+장[^|]*|\(선택\)[^|]*) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| (\d+)달러 \|/gm)];
    assert.ok(rows.length >= 12, `${dir} 행 ${rows.length}개`);
    for (const [, name, , tok, cached, usd] of rows) {
      if (tok !== values.get(`cost.tokens.${usd}`).value || cached !== values.get(`cost.cached.${usd}`).value) bad.push(`${dir} ${name.trim()}: ${tok}/${cached} ≠ ${values.get(`cost.tokens.${usd}`).value}/${values.get(`cost.cached.${usd}`).value} (${usd}달러)`);
    }
  }
  assert.deepEqual(bad, []);
});

test("디자인 카탈로그 이름 링크(주소는 표시를 달 수 없다)가 doc-values.json catalogs.<이름>.url과 같다", () => {
  const values = loadValues();
  const bad = [];
  for (const f of spawnSync("git", ["ls-files", "*.md"], { cwd: ROOT, encoding: "utf8" }).stdout.split("\n")) {
    if (!f || /^(release|docs\/(superpowers|reports))\//.test(f) || !existsSync(join(ROOT, f))) continue;
    for (const m of read(f).matchAll(/\[<!-- v:catalogs\.(\w+)\.name -->[^<]*<!-- \/v -->\]\(([^)]+)\)/g)) {
      const want = values.get(`catalogs.${m[1]}.url`)?.value;
      if (m[2] !== want) bad.push(`${f} ${m[1]}: ${m[2]} ≠ ${want}`);
    }
  }
  assert.deepEqual(bad, []);
});

// ── 중복 검사 ──
// 표시(<!-- v: -->)는 값으로 풀고, 묶음 구간(<!-- b: -->)과 CASES로 지키는 줄은 빼고, 과정 이름(Nextflix↔Claudle)과
// 장 파일 이름을 같은 토큰으로 바꾼 뒤, 공백을 편 글이 40자 이상인 줄(표 한 행과 목록 한 줄은 25자 이상)이 두 문서 이상에 같으면 실패한다.
// 묶음 원본(펼친 글)도 한 문서로 센다: 묶음에 있는 글이 표시도 CASES도 없이 다른 문서에 또 있으면 같은 글이다.
// 제목, 표 머리, 코드 블록 안, 링크·그림만 있는 줄은 원래 반복되는 꼴이라 보지 않는다.
// 정당한 반복은 docs/dupes-allow.txt에 이유와 함께 둔다.
const DUPE_MIN = 40;
// 25자 규칙은 번호 목록 한 줄과, 첫 칸이 8자 이상인 표 한 행(질문·단계 행)에만 쓴다. 글머리표 줄의 짧은 성공 기준
// ("`PRODUCT.md`에 서비스 소개가 생겨요.")과 첫 칸이 짧은 사실 행("| 서체 | … |", "| 로컬 | … |")은 원래 겹치는 꼴이라 40자 규칙만 본다.
const DUPE_MIN_ROW = 25;
const ROW = /^\s*(?:\d+\.\s|\|\s*[^|]{8,}\|)/;
const DUPE_FILES = /^(?:README|CONTRIBUTING|AGENTS)\.md$|^handbook\/|^tutorials\/|^templates\/[^/]+\/README\.md$/;
const LINK_ONLY = /^(?:(?:[-*]|\d+\.)\s+)?(?:!?\[[^\]]*\]\([^)]*\))$/;
const TABLE_RULE = /^\|[\s|:-]+\|$/;

// 검사할 줄: [{ n(줄 번호), raw(앞뒤 공백을 뗀 줄), key(이름을 같은 토큰으로 바꾸고 공백을 하나로 편 글) }]
function dupeLines(text, norm) {
  const lines = text.split("\n");
  const out = [];
  let fence = false;
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) return void (fence = !fence);
    if (fence || /^(?:#|<!--)/.test(line)) return;
    if (TABLE_RULE.test(line) || (line.startsWith("|") && TABLE_RULE.test(lines[i + 1] ?? ""))) return;
    const body = line.trim().replace(/^(?:(?:[-*>]|\d+\.)\s+)+/, "");
    const key = norm(body).replace(/\s+/g, " ").trim();
    if (key.length >= (ROW.test(line) ? DUPE_MIN_ROW : DUPE_MIN) && !LINK_ONLY.test(body)) out.push({ n: i + 1, raw: line.trim(), key });
  });
  return out;
}

// docs: Map(파일 → 표시와 묶음 구간을 정리한 글). guarded: Map(파일 → CASES로 지키는 줄 집합).
// blocks: Map(묶음 이름 → 펼친 글 목록). allow: 글의 앞부분 목록. same: 하나의 문서로 세는 파일 묶음의 목록.
// 같은 글이 둘 이상 문서에 있으면 [{ key, where: ["파일:줄" 또는 "docs/blocks/이름.md", …], allowed }]
function findDupes(docs, { guarded = new Map(), blocks = new Map(), norm = (x) => x, allow = [], same = [] } = {}) {
  const docOf = (w) => (w.startsWith("docs/blocks/") ? "묶음 원본" : same.find((g) => g.includes(w.replace(/:\d+$/, "")))?.[0] ?? w.replace(/:\d+$/, ""));
  const groups = new Map();
  const add = (key, w) => groups.set(key, [...new Set([...(groups.get(key) ?? []), w])]);
  for (const [file, text] of docs) for (const l of dupeLines(text, norm)) if (!guarded.get(file)?.has(l.raw)) add(l.key, `${file}:${l.n}`);
  for (const [name, texts] of blocks) for (const t of texts) for (const l of dupeLines(t, norm)) add(l.key, `docs/blocks/${name}.md`);
  return [...groups]
    .filter(([, where]) => new Set(where.map(docOf)).size > 1)
    .map(([key, where]) => ({ key, where, allowed: allow.some((a) => key.startsWith(a)) }));
}

test("중복 검사기: 같은 글이 두 문서나 묶음 원본과 문서에 남으면 잡고, 이름만 다른 글·허용한 글·원래 반복되는 꼴은 넘긴다", () => {
  const long = "에이전트가 사이트맵에 프리셋 팩의 화면이 모두 들어 있다고 알려 주고, 사이트맵과 브리프를 확정했다고 해요.";
  const norm = (x) => x.replace(/nextflix|claudle/gi, "◇");
  const docs = new Map([
    ["a.md", `# 제목 ${long}\n- ${long}\n| 머리 ${long} |\n|---|\n- [링크 ${long}](x.md)\n\`\`\`\n${long}\n\`\`\`\n짧은 글\n`],
    ["b.md", `${long}\n- ${long.replace("프리셋", "Nextflix 프리셋")}\n| 머리 ${long} |\n짧은 글\n`],
    ["c.md", `> ${long}\n`],
  ]);
  assert.deepEqual(findDupes(docs, { norm }).map((g) => g.where), [["a.md:2", "b.md:1", "c.md:1"]]);
  assert.equal(findDupes(docs, { norm, allow: [long.slice(0, 20)] })[0].allowed, true);
  assert.deepEqual(findDupes(docs, { norm, guarded: new Map([["a.md", new Set([`- ${long}`])]]) })[0].where, ["b.md:1", "c.md:1"]);
  assert.deepEqual(findDupes(new Map([["a.md", long], ["b.md", `- ${long}`]]), { same: [["a.md", "b.md"]] }), []);
  const renamed = findDupes(new Map([["a.md", long.replace("에이전트", "Nextflix 에이전트")], ["b.md", long.replace("에이전트", "Claudle 에이전트")]]), { norm });
  assert.equal(renamed.length, 1);
  // 이름 뒤 조사(를/을, 는/은, 가/이 …)는 한 꼴로 본다. 조사 뒤에 한글이 이어지면 다른 낱말이다
  const jnorm = (x) => josa(norm(x));
  const tail = " 프로젝트 폴더 이름이에요. 영어 소문자와 하이픈으로 바꿔도 돼요.";
  assert.equal(findDupes(new Map([["a.md", `\`[nextflix]\`는${tail}`], ["b.md", `\`[claudle]\`은${tail}`]]), { norm: jnorm }).length, 1);
  assert.equal(findDupes(new Map([["a.md", `여기까지 왔으면 Nextflix를 다 만든 거예요.${tail}`], ["b.md", `여기까지 왔으면 Claudle을 다 만든 거예요.${tail}`]]), { norm: jnorm }).length, 1);
  assert.equal(jnorm("Claudle이다"), "◇이다");
  // 번호 목록 한 줄과 첫 칸이 긴 표 한 행은 25자부터 본다. 글머리표 줄과 첫 칸이 짧은 사실 행은 40자부터
  const short = new Map([["a.md", "5. 리뷰를 마치면 개발 서버를 켜 두고 확인을 요청해요.\n| 계획을 확인하고 구현 방식을 골라 달라 | `추천대로 해줘` |\n- `PRODUCT.md`에 서비스 소개가 생겨요.\n| 서체 | 제목 Wanted Sans, 본문 Pretendard |\n"], ["b.md", "6. 리뷰를 마치면 개발 서버를 켜 두고 확인을 요청해요.\n| 계획을 확인하고 구현 방식을 골라 달라 | `추천대로 해줘` |\n- `PRODUCT.md`에 서비스 소개가 생겨요.\n| 서체 | 제목 Wanted Sans, 본문 Pretendard |\n"]]);
  assert.deepEqual(findDupes(short).map((g) => g.where), [["a.md:1", "b.md:1"], ["a.md:2", "b.md:2"]]);
  // 묶음 원본끼리는 같은 글이어도 되고, 묶음에 있는 글이 문서에 또 있으면 같은 글이다(CASES로 지키는 줄은 뺀다)
  const blocks = new Map([["x", [long]], ["y", [`- ${long}`]]]);
  assert.deepEqual(findDupes(new Map(), { blocks }), []);
  assert.deepEqual(findDupes(new Map([["a.md", `- ${long}\n`]]), { blocks })[0].where, ["a.md:1", "docs/blocks/x.md", "docs/blocks/y.md"]);
  assert.deepEqual(findDupes(new Map([["a.md", `- ${long}\n`]]), { blocks, guarded: new Map([["a.md", new Set([`- ${long}`])]]) }), []);
});

// 과정 이름(◇) 뒤 조사를 한 꼴로: Nextflix는 모음, Claudle은 받침(ㄹ)으로 끝나 조사가 갈린다("nextflix를"↔"claudle을").
// 이름 뒤에 ]·`·*·)가 붙어도 본다. 조사 뒤에 한글이 이어지면 다른 낱말이라 바꾸지 않는다(이에요·이라·으로는 먼저 바꾼다).
const JOSA = [["이에요", "예요"], ["이라", "라"], ["이야", "야"], ["이랑", "랑"], ["으로", "로"], ["을", "를"], ["은", "는"], ["이", "가"], ["과", "와"]];
function josa(x) {
  return JOSA.reduce((t, [a, b]) => t.replace(new RegExp(`(◇[\\]\`*)]*)${a}${a.length === 1 ? "(?![가-힣])" : ""}`, "g"), `$1${b}`), x);
}

function repoDocs() {
  const values = loadValues();
  const blockSrc = loadBlocks();
  const tracked = spawnSync("git", ["ls-files", "*.md"], { cwd: ROOT, encoding: "utf8" }).stdout.split("\n");
  const docs = new Map();
  for (const f of tracked)
    if (DUPE_FILES.test(f) && !f.endsWith("VERIFICATION.md") && existsSync(join(ROOT, f))) {
      const noBlocks = read(f).replace(/^<!-- b:[\w-]+[^\n]*-->\n[\s\S]*?^<!-- \/b -->$/gm, (m) => m.replace(/[^\n]/g, ""));
      docs.set(f, plain(noBlocks));
    }
  const guarded = new Map();
  const blocks = new Map();
  for (const [file, block, args] of CASES) {
    const body = caseBody(block, args, values, blockSrc);
    blocks.set(block, [...new Set([...(blocks.get(block) ?? []), body])]);
    if (!docs.has(file) || marked(read(file), block)) continue;
    const set = guarded.get(file) ?? new Set();
    for (const l of body.split("\n")) set.add(l.trim());
    guarded.set(file, set);
  }
  // 과정 이름(디렉터리 이름 01-nextflix, 02-claudle)과 장 파일 이름(05-auth-profiles ↔ 05-auth-chats)을 같은 토큰으로
  const dirs = readdirSync(join(ROOT, "tutorials")).filter((d) => /^\d\d-\w+$/.test(d));
  const chapters = dirs.flatMap((d) => readdirSync(join(ROOT, "tutorials", d)).filter((f) => /^\d\d-.+\.md$/.test(f)).map((f) => f.slice(0, -3)));
  const names = new RegExp(dirs.map((d) => d.slice(3)).join("|"), "gi");
  const norm = (x) => josa(chapters.reduce((t, c) => t.replaceAll(c, `${c.slice(0, 2)}-◆`), x.replace(names, "◇")));
  const raw = new Map([...blockSrc].map(([name, b]) => [`docs/blocks/${name}.md`, b.body]));
  return { docs, guarded, blocks, raw, norm };
}

test("중복 검사: 표시와 묶음 밖에 같은 글이 두 문서 이상에 남지 않는다(정당한 반복은 docs/dupes-allow.txt)", () => {
  const { docs, guarded, blocks, raw, norm } = repoDocs();
  const entries = read("docs/dupes-allow.txt").split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => l.split(" :: "));
  assert.ok(entries.every(([t, reason]) => t.trim() && reason?.trim().length >= 8), "허용 항목은 `글의 앞부분 :: 이유`(이유 8자 이상)");
  const same = entries.filter(([t]) => t.startsWith("@문서 ")).map(([t]) => t.slice(4).trim().split(/\s+/));
  const allow = entries.filter(([t]) => !t.startsWith("@문서 ")).map(([t]) => t.trim());
  for (const f of same.flat()) assert.ok(docs.has(f), `허용 목록의 문서가 없다: ${f}`);
  assert.ok(entries.length <= 16, `허용 목록이 길다(${entries.length}). 묶음이나 값 표시로 줄인다`);
  const all = findDupes(docs, { guarded, blocks, norm, allow, same });
  for (const a of allow) assert.ok(all.some((g) => g.key.startsWith(a)), `허용 목록에 쓸모없는 항목: ${a}`);
  const bad = all.filter((g) => !g.allowed);
  // 묶음 원본끼리도 같은 글이 두 묶음에 있으면 {{b:이름}}으로 품는다
  for (const g of findDupes(raw, { norm })) bad.push(g);
  assert.deepEqual(
    bad.map((g) => `${g.where.join(" ")}\n    ${g.key.slice(0, 80)}`),
    [],
    `같은 글 ${bad.length}묶음(${bad.reduce((n, g) => n + g.where.length, 0)}줄). 묶음(docs/blocks)이나 값 표시로 바꾸고, 줄·표 한 행이면 CASES에 더한다. 정당한 반복만 docs/dupes-allow.txt에 이유와 함께 둔다`,
  );
});

test("프리셋 팩 풀이: 용어집은 11개 팩 공통 정의(gloss.presetPack), 클론 과정은 features.md·design-notes.md가 든 팩 풀이(gloss.clonePack)를 쓴다", () => {
  assert.match(read("tutorials/reference/glossary.md"), /<!-- v:gloss\.presetPack -->/);
  const clone = [
    ...["tutorials/01-nextflix", "tutorials/02-claudle"].flatMap((d) => readdirSync(join(ROOT, d)).filter((f) => f.endsWith(".md")).map((f) => `${d}/${f}`)),
    ...readdirSync(join(ROOT, "docs/blocks")).filter((f) => /^(clone|feature-round)-/.test(f)).map((f) => `docs/blocks/${f}`),
  ];
  for (const f of clone) assert.doesNotMatch(read(f), /gloss\.presetPack/, f);
  assert.ok(clone.some((f) => read(f).includes("gloss.clonePack")));
});

// ── 맨시간 검사 ──
// 두 곳 이상에 같은 뜻으로 쓰는 시간과 자주 바뀌는 시간은 값 키로 쓴다. 표시·묶음 구간·코드·링크 주소 밖에 맨값으로 남은
// 시간 표현(N분, N시간, N시간 M분, N초, 범위는 끝 값으로 잡힌다)은 docs/time-allow.txt에 이유와 함께 있어야 한다.
// 묶음 원본(docs/blocks)은 {{v:키}}·{{인자}}를 빼고 본다. 분수("10분의 1")는 시간이 아니다. VERIFICATION.md는 측정 기록이라 뺀다.
const TIME_FILES = /^(?:README|CONTRIBUTING|AGENTS)\.md$|^handbook\/|^tutorials\/|^docs\/blocks\/|^templates\/[^/]+\/README\.md$/;
const TIME = /\d+(?:\.\d+)?(?:시간(?: \d+분)?|분(?!의)|초)/g;

// 글 하나의 맨시간: [{ line, heading(가장 가까운 위 제목, 표시는 값으로), text(표시를 뗀 줄), time }]
function timeHits(text) {
  const blank = (m) => m.replace(/[^\n]/g, " ");
  const lines = text
    .replace(/^<!-- b:[\w-]+[^\n]*-->\n[\s\S]*?^<!-- \/b -->$/gm, blank)
    .replace(/<!-- v:[\w.-]+ -->.*?<!-- \/v -->/g, blank)
    .replace(/^\s*```[\s\S]*?^\s*```/gm, blank)
    .replace(/`[^`\n]*`|\]\([^)\s]*\)|\{\{[^}]*\}\}/g, blank)
    .split("\n");
  const raw = text.split("\n");
  const hits = [];
  let heading = "";
  lines.forEach((l, i) => {
    if (/^#{1,6} /.test(raw[i]) && l.trim()) heading = plain(raw[i]).replace(/^#+\s*/, "");
    for (const m of l.matchAll(TIME)) hits.push({ line: i + 1, heading, text: plain(raw[i]).trim(), time: m[0] });
  });
  return hits;
}

// docs/time-allow.txt: `파일(글롭) 위치 :: 이유`. 위치가 #로 시작하면 그 앞부분으로 시작하는 절 제목 아래(#뿐이면 파일 전체), 아니면 그 글이 든 줄
function timeAllow() {
  return read("docs/time-allow.txt")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const [where, reason = ""] = l.split(" :: ");
      const sp = where.indexOf(" ");
      const glob = where.slice(0, sp);
      const rx = new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "\0").replace(/\*/g, "[^/]*").replace(/\0/g, ".*")}$`);
      const at = where.slice(sp + 1).trim();
      return { entry: where, reason, match: (f, h) => rx.test(f) && (at.startsWith("#") ? h.heading.startsWith(at.slice(1).trim()) : h.text.includes(at)) };
    });
}

test("맨시간 검사기: 표시·묶음·코드·링크 주소·{{…}} 안은 넘기고, 분수는 시간으로 보지 않으며, 제목을 기억한다", () => {
  const text = "# 첫 절\n약 3분이 들어요. <!-- v:x -->5분<!-- /v -->\n`10분` [12분 글](a.md#12분) {{v:y}} {{t|7분}}\n## 둘째 <!-- v:w -->5시간<!-- /v --> 절\n캐시는 10분의 1, 2시간 15분\\~4시간\n<!-- b:z -->\n9분\n<!-- /b -->\n```\n8분\n```\n";
  assert.deepEqual(
    timeHits(text).map((h) => [h.line, h.heading, h.time]),
    [
      [2, "첫 절", "3분"],
      [3, "첫 절", "12분"],
      [5, "둘째 5시간 절", "2시간 15분"],
      [5, "둘째 5시간 절", "4시간"],
    ],
  );
});

test("맨시간: 표시·묶음·코드 밖 시간 표현(N분, N시간, N초, 범위)은 값 키로 쓰거나 docs/time-allow.txt에 이유와 함께 둔다", () => {
  const allow = timeAllow();
  assert.ok(allow.every((a) => a.reason.trim().length >= 8 && a.entry.includes(" ")), "허용 항목은 `파일(글롭) 위치 :: 이유`(이유 8자 이상)");
  assert.ok(allow.length <= 20, `허용 목록이 길다(${allow.length}). 범주 단위로 묶거나 값 키로 바꾼다`);
  const used = new Set();
  const bad = [];
  for (const f of spawnSync("git", ["ls-files", "*.md"], { cwd: ROOT, encoding: "utf8" }).stdout.split("\n")) {
    if (!TIME_FILES.test(f) || f.endsWith("VERIFICATION.md") || !existsSync(join(ROOT, f))) continue;
    for (const h of timeHits(read(f))) {
      const a = allow.find((x) => x.match(f, h));
      if (a) used.add(a);
      else bad.push(`${f}:${h.line} ${h.time}  ${h.text.slice(0, 70)}`);
    }
  }
  for (const a of allow) assert.ok(used.has(a), `허용 목록에 쓸모없는 항목: ${a.entry}`);
  assert.deepEqual(bad, [], `맨시간 ${bad.length}곳. 값 키로 쓰거나 docs/time-allow.txt에 이유와 함께 둔다(docs/common-values.md 규칙)`);
});

test("--json: 모든 값(손으로 정한 값과 계산값)을 마크다운 이스케이프 없는 평평한 {키: 값}으로 쓴다(홈페이지용)", () => {
  const dir = mkdtempSync(join(tmpdir(), "doc-values-"));
  const out = join(dir, "values.json");
  const r = spawnSync(process.execPath, [SCRIPT, "--json", out], { cwd: ROOT, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const json = JSON.parse(readFileSync(out, "utf8"));
  const list = spawnSync(process.execPath, [SCRIPT, "--list"], { cwd: ROOT, encoding: "utf8" }).stdout.split("\n").filter((l) => l && !l.startsWith("b:")).map((l) => l.split("\t")[0]);
  assert.deepEqual(Object.keys(json).sort(), [...list].sort());
  assert.deepEqual(Object.entries(json).filter(([, v]) => /\\~|&#126;|\\\||<!--/.test(v)), []);
  assert.equal(json["cost.revise.fix"], "2~12분");
  assert.equal(json["preset.goru.pack.time.cell"], "약 1시간~2시간 (여러 번 고치면 약 3시간까지)");
});

test("계산값 4: 단계별 표의 단위 시간, 쪽 수·그림 수에 비례하는 행, 한도 시간, 만든 사람이 실제로 쓴 값", () => {
  const values = loadValues();
  const want = {
    "limit.window": "5시간", "preset.ullim.pack.limitText": "5시간 한도 안", "preset.olgot.scratch.limitText": "5시간 한도에 약 4번 걸려요", "presets.scratch.limit.range": "약 1\\~4번",
    "cost.stage.setup.time": "5분", "cost.stage.plan.pack.time": "5분", "cost.stage.plan.scratch.time": "10분", "cost.stage.page.pack.time": "4분", "cost.stage.clone.check.time": "20분", "cost.image.time": "30초",
    "preset.goru.stages.rest.pack.time": "24분", "preset.pacecrew.stages.rest.pack.time": "1시간 24분", "preset.olgot.stages.rest.scratch.time": "3시간 55분",
    "preset.goru.stages.images.time": "3분", "preset.uptrail.stages.images.time": "1분", "preset.olgot.stages.images.time": "41분", "preset.olgot.stages.check.time": "19분",
    "preset.nextflix.chapter.6.time": "40분", "preset.claudle.chapter.5.time": "30분",
    "preset.goru.actual.total.time": "2시간 50분", "preset.goru.actual.total.tokens": "500만", "preset.goru.actual.total.cached": "2.5억", "preset.goru.actual.redesign.time": "56분",
    "preset.olgot.actual.total.tokens": "630만", "preset.olgot.actual.total.cached": "3.2억",
    "preset.claudle.actual.total.time": "5시간 50분", "preset.claudle.actual.total.usd": "115", "preset.claudle.actual.plan.cached": "1,900만", "preset.nextflix.actual.build.time": "2시간 25분",
    "presets.actual.time.range": "2시간 15분\\~4시간 25분", "presets.actual.tokens.range": "360만\\~940만", "presets.actual.usd.range": "65\\~170",
    "cost.unit.first.time": "12\\~19분", "cost.unit.setup.time": "3.2분", "cost.revise.example.reviewRoundOlgot.review": "15분", "cost.revise.example.reviewRoundClaudle.recheck": "1시간 14분",
  };
  assert.deepEqual(Object.fromEntries(Object.keys(want).map((k) => [k, values.get(k)?.value])), want);
  assert.equal([...values.keys()].filter((k) => k.endsWith(".cellHtml")).length, 0, "쓰는 곳이 없는 HTML 꼴은 두지 않는다");
});

// ── 만드는 과정과 걸리는 시간(tutorials/reference/process-and-time.md) ──
const PROCESS = "tutorials/reference/process-and-time.md";

test("만드는 과정과 걸리는 시간: tutorials/README.md 가이드 표에서 비용과 키 바로 뒤에 있다(홈페이지가 이 표 순서로 쪽을 싣는다)", () => {
  const guide = read("tutorials/README.md").split("## 가이드")[1];
  const pages = [...guide.matchAll(/^\| \[[^\]]+\]\(reference\/([\w-]+)\.md\)/gm)].map((m) => m[1]);
  assert.equal(pages[pages.indexOf("costs-and-keys") + 1], "process-and-time", pages.join(", "));
});

test("만드는 과정과 걸리는 시간의 도식: mermaid는 모두 묶음 안에 있고, 묶음 원본에는 값 표시 밖 숫자가 없다(gantt의 00:00·HH:mm·%H:%M만 문법)", () => {
  const src = read(PROCESS);
  const blocks = loadBlocks();
  const inBlock = [...src.matchAll(/^<!-- b:([\w-]+)[^\n]*-->\n([\s\S]*?)^<!-- \/b -->$/gm)];
  const fences = [...src.matchAll(/^```mermaid\n/gm)].map((m) => m.index);
  assert.ok(fences.length >= 5, `도식 ${fences.length}개`);
  const bad = [];
  for (const at of fences) {
    const b = inBlock.find((m) => at > m.index && at < m.index + m[0].length);
    if (!b) {
      bad.push(`${PROCESS}:${src.slice(0, at).split("\n").length} 묶음 밖 mermaid`);
      continue;
    }
    const body = blocks.get(b[1]).body.replace(/\{\{[^}]*\}\}/g, "").replace(/\b00:00\b|HH:mm|%H:%M/g, "");
    if (/\d/.test(body)) bad.push(`docs/blocks/${b[1]}.md: ${body.match(/[^\n]*\d[^\n]*/)[0].trim()}`);
  }
  assert.deepEqual(bad, []);
  // 채운 글이 GitHub와 mermaid 12가 읽는 꼴인지(원그래프는 값 보이기, gantt는 분 단위 기간)
  assert.match(src, /^pie showData$/m);
  assert.match(src, /^ {2}dateFormat HH:mm$/m);
  assert.ok([...src.matchAll(/^ {2}[^:\n]+ :(?: active,)?[^,\n]+, (?:00:00|after \w+), \d+m$/gm)].length >= 10, "gantt 막대는 `이름 : (active,) id, 시작, Nm`");
});

test("실측 합계는 부분의 합으로 계산한다: 조사와 팩(기록 토큰에서 달러 어림), 만들기, 조사부터 만들기까지(벽시계), 고칠 때 흐름, 원그래프 조각, 올곧 라운드", () => {
  const values = loadValues();
  const v = (k) => values.get(k)?.value;
  const d = JSON.parse(read("doc-values.json"));
  const per = Number.parseFloat(d.cost.tokensPerUsd);
  // 조사와 팩(prep)은 기록 토큰(캐시 뺌·포함)이 정본이고 달러는 토큰 ÷ cost.tokensPerUsd. 합(prep.total)은 행의 합,
  // 조사부터 만들기까지(all)는 벽시계끼리 더한다(만들기 + prep.total). 에이전트 시간 합인 팩 다듬기(packFix)는 넣지 않는다
  for (const [n, p] of Object.entries(d.presets).filter(([, p]) => p.prep)) {
    const rows = Object.keys(p.prep).map((r) => `preset.${n}.prep.${r}`);
    for (const [r, o] of Object.entries(p.prep)) {
      assert.deepEqual(Object.keys(o).sort(), ["cached", "time", "tokens"], `${n}.prep.${r}: 기록 값(time, tokens, cached)만 둔다`);
      assert.equal(v(`preset.${n}.prep.${r}.usd`), String(Math.round(Number.parseFloat(o.tokens.replace(/,/g, "")) / per)), `${n}.prep.${r}.usd`);
    }
    assert.equal(v(`preset.${n}.prep.total.min`), String(rows.reduce((s, k) => s + Number(v(`${k}.min`)), 0)), n);
    assert.equal(v(`preset.${n}.prep.total.usd`), String(rows.reduce((s, k) => s + Number(v(`${k}.usd`)), 0)), n);
    const made = p.made ? `preset.${n}.made` : `preset.${n}.actual.total`;
    assert.equal(v(`preset.${n}.all.min`), String(Number(v(`${made}.min`)) + Number(v(`preset.${n}.prep.total.min`))), n);
    assert.equal(v(`preset.${n}.all.time`), timeText(Number(v(`preset.${n}.all.min`))), `${n}: 합은 5분 단위`);
    assert.equal(v(`preset.${n}.all.usd`), String(Number(v(`${made}.usd`)) + Number(v(`preset.${n}.prep.total.usd`))), n);
  }
  const want = {
    "preset.claudle.prep.research.time": "1시간 28분", "preset.claudle.prep.research.tokens": "270만", "preset.claudle.prep.research.cached": "1.9억", "preset.claudle.prep.research.usd": "49",
    "preset.claudle.prep.total.time": "2시간 5분", "preset.claudle.all.time": "7시간 55분",
    "preset.nextflix.prep.pack.cached": "7,200만", "preset.nextflix.prep.pack.usd": "73", "preset.nextflix.prep.total.time": "3시간 35분",
    "preset.nextflix.made.time": "3시간 40분", "preset.nextflix.made.usd": "110", "preset.nextflix.all.time": "7시간 15분", "preset.nextflix.packFix.cached": "4,900만",
    "preset.olgot.prep.research.time": "43분", "preset.olgot.prep.research.tokens": "82만", "preset.olgot.prep.total.time": "50분", "preset.claudle.actual.plan.min": "18", "preset.claudle.pages": "13",
    "process.research.claudle.total": "1시간 45분", "process.research.nextflix.total": "2시간 5분", "process.research.nextflix.public": "18분",
    "process.scope.login.time": "45분", "process.scope.all.time": "1시간 10분\\~1시간 45분",
    "process.pie.claudle.recheck.pct": "35", "process.pie.olgot.recheck.pct": "60", "process.pie.claudle.recheck.min": "122",
    "process.olgot.total": v("preset.olgot.actual.total.time"), "process.olgot.work": "7시간 35분",
    "cost.revise.oneSpot": "10분", "cost.revise.example.oneSpot.recheck": "6분", "cost.revise.example.twoSpotsClaudle.total": "28분",
    "cost.revise.example.reviewRoundOlgot.review": "15분", "cost.revise.example.reviewRoundClaudle.review": "49분", "limit.waitLong": "4시간",
  };
  assert.deepEqual(Object.fromEntries(Object.keys(want).map((k) => [k, v(k)])), want);
  // 같은 실측은 한 키로 쓴다(Nextflix 공개 페이지 조사는 process.research.nextflix.public 하나)
  assert.equal(values.get("process.scope.public.time"), undefined);
  // 고칠 때 예시: 한 줄·Claudle 두 가지는 흐름(flow)이 정본이고 합과 과정 값은 흐름에서 계산한다. 같은 뜻의 다른 값을 손으로 두지 않는다
  const R = d.cost.revise;
  assert.equal(R.oneSpot, undefined);
  assert.equal(R.examples.oneSpot, undefined);
  assert.equal(R.examples.twoSpotsClaudle, undefined);
  // 마무리 검토의 리뷰는 두 예시 모두 같은 계산법: 리뷰 에이전트 + 디자인 검사 에이전트(구현 제외)를 메인이 기다린 분
  for (const ex of ["reviewRoundOlgot", "reviewRoundClaudle"]) assert.deepEqual(Object.keys(R.examples[ex].review).sort(), ["agents", "design"], ex);
  // 원그래프 조각의 합 = 메인 에이전트가 일한 시간(Claudle 만들기 합, 올곧은 기다림을 뺀 라운드 합)
  const pie = (n) => timeText(Object.values(d.process.pie[n]).reduce((s, x) => s + x, 0));
  assert.equal(pie("claudle"), v("preset.claudle.actual.total.time"));
  assert.equal(pie("olgot"), v("process.olgot.work"));
});

test("쓰는 곳이 없는 고칠 때 예시 키(cost.revise.example.*)는 두지 않는다", () => {
  const list = spawnSync(process.execPath, [SCRIPT, "--list"], { cwd: ROOT, encoding: "utf8" }).stdout.split("\n").map((l) => l.split("\t"));
  assert.deepEqual(list.filter(([k, , , n]) => k?.startsWith("cost.revise.example.") && n === "0").map(([k]) => k), []);
});

test("실측 값이 빠지면 TypeError 대신 빠진 키 이름을 담은 오류로 멈춘다", () => {
  const dir = mkdtempSync(join(tmpdir(), "doc-values-missing-"));
  writeFileSync(join(dir, "site-links.json"), read("site-links.json"));
  const d = JSON.parse(read("doc-values.json"));
  delete d.presets.nextflix.actual.fix;
  writeFileSync(join(dir, "doc-values.json"), JSON.stringify(d));
  assert.throws(() => loadValues(dir), /preset\.nextflix\.actual\.fix/);
  const e = JSON.parse(read("doc-values.json"));
  delete e.presets.goru.actual;
  writeFileSync(join(dir, "doc-values.json"), JSON.stringify(e));
  assert.throws(() => loadValues(dir), /preset\.goru\.actual\.total/);
});

test("맨시간 허용 목록: 프리셋 쪽 제작 기록은 리디자인 행만 허용하고(절 전체를 열지 않는다), 한도 기다림은 값(limit.waitLong)으로 쓴다", () => {
  const allow = read("docs/time-allow.txt");
  assert.doesNotMatch(allow, /#실제로 거친 과정/);
  assert.doesNotMatch(allow, /길면 4시간/);
  assert.match(read("tutorials/reference/costs-and-keys.md"), /길면 <!-- v:limit\.waitLong -->/);
});

test("Claudle·올곧 쪽 수는 값 표시다(revise-time-detail 묶음, Claudle README에 맨숫자 없음)", () => {
  assert.doesNotMatch(loadBlocks().get("revise-time-detail").body.replace(/\{\{[^}]*\}\}/g, ""), /\d+쪽/);
  const outside = read("tutorials/02-claudle/README.md")
    .replace(/^<!-- b:[\w-]+[^\n]*-->\n[\s\S]*?^<!-- \/b -->$/gm, "")
    .replace(/<!-- v:[\w.-]+ -->.*?<!-- \/v -->/g, "");
  assert.deepEqual(outside.match(/[^\n]{0,20}\b\d+쪽[^\n]{0,10}/g), null);
});

test("만드는 과정과 걸리는 시간: 초보자 글(라운드 첫 등장은 용어집 링크, R1b 같은 라운드 기호 없음), 레퍼런스 프롬프트는 연습용이라고 밝힌다", () => {
  const src = read(PROCESS).replace(/^```[\s\S]*?^```$/gm, "").replace(/^#.*$/gm, "");
  const first = src.search(/(?<!백그)라운드/);
  assert.ok(first > 0 && src.slice(first - 1).startsWith("[라운드](glossary.md#만들기)"), src.slice(first - 40, first + 30));
  assert.doesNotMatch(src, /\bR\d+[a-z]?\b/);
  assert.match(read(PROCESS), /원래 서비스와 관계없는 연습용이라고 화면에 밝혀줘/);
});

test("옮긴 절: 고쳐 달라고 할 때마다 더 드는 시간은 process-and-time.md에 있고, costs-and-keys.md의 옛 앵커를 가리키는 링크가 없다", () => {
  const bad = [];
  for (const f of spawnSync("git", ["ls-files", "*.md"], { cwd: ROOT, encoding: "utf8" }).stdout.split("\n")) {
    if (!f || /^(release|docs\/superpowers)\//.test(f) || !existsSync(join(ROOT, f))) continue;
    if (read(f).includes("costs-and-keys.md#고쳐-달라고-할-때마다-더-드는-시간")) bad.push(f);
  }
  assert.deepEqual(bad, []);
  assert.match(read(PROCESS), /^## 고쳐 달라고 할 때마다 더 드는 시간$/m);
  assert.doesNotMatch(read("tutorials/reference/costs-and-keys.md"), /^#+ 고쳐 달라고 할 때마다 더 드는 시간$/m);
});
