// handbook/(사이트 /docs의 원본) 구조 검사.
//   문서 홈 표 → 묶음 소개 쪽, 묶음 소개 표 → 쪽. 표와 파일이 1:1로 맞고, 쪽마다 "> 한눈에:"가 있고,
//   상대 링크(파일과 #앵커)가 깨지지 않았는지 본다. 홈페이지(../pro-kit-web의 apps/web/src/lib/handbook.ts)도 같은 표를 순서의 정본으로 읽는다.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { test } from "node:test";

const ROOT = join(import.meta.dirname, "..");
const HB = join(ROOT, "handbook");

// GitHub가 제목에서 앵커를 만드는 규칙: 소문자, 글자·숫자·공백·하이픈·밑줄만 남기고, 공백은 하이픈.
export function slug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

const read = (f) => readFileSync(f, "utf8");
// 표 행의 첫 칸 링크만 모은다(본문 링크는 링크 검사에서 따로 본다).
const tableLinks = (md) =>
  [...md.matchAll(/^\|\s*\[[^\]]+\]\(([^)#\s]+\.md)\)\s*\|/gm)].map((m) => m[1]);
// 문서의 제목 앵커 목록. 같은 제목이 반복되면 GitHub처럼 -1, -2를 붙인다.
export function anchors(md) {
  const seen = new Map();
  return [...md.replace(/```[\s\S]*?```/g, "").matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => {
    const base = slug(m[1].replace(/<!--.*?-->/g, ""));
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n ? `${base}-${n}` : base;
  });
}
// GitHub는 한 인라인 덩어리(문단, 목록 항목, 표 칸, 제목)에 \~가 아닌 ~가 둘 이상 있으면 그 사이를 취소선으로 그린다.
// ponytail: 덩어리 나누기는 빈 줄, 목록 표시, 표 칸, 제목만 본다. 인용 상자 안 목록 같은 중첩은 보지 않는다.
export function strikeRisk(md) {
  const units = [];
  for (const block of md.replace(/```[\s\S]*?```/g, "").split(/\n\s*\n/)) {
    let cur = [];
    for (const line of block.split("\n")) {
      if (/^\s*\|/.test(line)) units.push(...line.split("|"));
      else if (/^\s*(#{1,6}\s|[-*]\s|\d+\.\s)/.test(line)) {
        if (cur.length) units.push(cur.join(" "));
        cur = [line];
      } else cur.push(line);
    }
    if (cur.length) units.push(cur.join(" "));
  }
  return units
    .map((u) => u.trim())
    .filter((u) => (u.replace(/`[^`]*`/g, "").replace(/\\~/g, "").match(/~/g) ?? []).length >= 2);
}
// 링크 대상이 이 저장소 안인가. 접두사만 같은 형제 폴더(../pro-kit-samples)는 밖이다.
export const insideRoot = (p) => !relative(ROOT, p).startsWith("..");
const mdFiles = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? mdFiles(p) : n.endsWith(".md") ? [p] : [];
  });

test("문서 홈 표의 묶음 소개 쪽과 묶음 표의 쪽이 모두 있고, 표에 없는 .md가 없다", () => {
  const listed = new Set([join(HB, "README.md")]);
  const sections = tableLinks(read(join(HB, "README.md")));
  assert.ok(sections.length > 0, "문서 홈에 묶음 표가 없다");
  for (const s of sections) {
    const sp = join(HB, s);
    assert.ok(existsSync(sp), `없는 묶음 소개 쪽: ${s}`);
    assert.match(s, /^[a-z-]+\/README\.md$/, `묶음 링크는 <묶음>/README.md: ${s}`);
    listed.add(sp);
    const pages = tableLinks(read(sp));
    assert.ok(pages.length > 0, `${s}에 쪽 표가 없다`);
    for (const p of pages) {
      const pp = join(dirname(sp), p);
      assert.ok(existsSync(pp), `${s}의 없는 쪽: ${p}`);
      listed.add(pp);
    }
  }
  const orphans = mdFiles(HB).filter((f) => !listed.has(f)).map((f) => relative(HB, f));
  assert.deepEqual(orphans, [], "표에 없는 쪽");
});

test("모든 쪽이 '# 제목', 빈 줄, '> 한눈에: '로 시작한다", () => {
  for (const f of mdFiles(HB)) {
    const lines = read(f).split("\n");
    assert.match(lines[0], /^# \S/, `${relative(HB, f)}: 첫 줄이 # 제목이 아니다`);
    assert.equal(lines[1], "", `${relative(HB, f)}: 제목 다음 줄은 빈 줄`);
    assert.match(lines[2], /^> 한눈에: \S/, `${relative(HB, f)}: 셋째 줄이 '> 한눈에: '가 아니다`);
  }
});

// 상대 링크(마크다운 링크와 HTML의 href·src)의 파일과 #앵커가 없는 것을 모은다. md는 시험용으로 본문을 바꿔 넣을 때 쓴다.
export function brokenLinks(file, md = read(file)) {
  const bad = [];
  // 코드 블록과 인라인 코드 안의 [글](주소)는 링크가 아니다
  const body = md.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
  for (const m of body.matchAll(/\]\(([^)\s]+)\)|\b(?:href|src)="([^"]+)"/g)) {
    const href = m[1] ?? m[2];
    if (/^(https?:|mailto:)/.test(href)) continue;
    const [path, hash] = href.split("#");
    const target = path ? normalize(join(dirname(file), path)) : file;
    if (!insideRoot(target) || !existsSync(target)) {
      bad.push(`${relative(ROOT, file)} → ${href} (파일 없음)`);
      continue;
    }
    if (hash && target.endsWith(".md") && !anchors(read(target)).includes(decodeURIComponent(hash)))
      bad.push(`${relative(ROOT, file)} → ${href} (앵커 없음)`);
  }
  return bad;
}

test("상대 링크의 파일과 #앵커가 있다(handbook 밖 pro-kit 파일 포함)", () => {
  assert.deepEqual(mdFiles(HB).flatMap((f) => brokenLinks(f)), []);
});

test("루트 README.md와 CONTRIBUTING.md의 상대 링크의 파일과 #앵커가 있다", () => {
  for (const name of ["README.md", "CONTRIBUTING.md"]) {
    const f = join(ROOT, name);
    assert.ok(existsSync(f), `${name}가 없다`);
    assert.deepEqual(brokenLinks(f), []);
  }
});

// 묶음(docs/blocks)의 상대 링크는 쓰는 쪽 깊이에 기대므로, 묶음을 쓰는 tutorials와 템플릿 README도 본다.
// 공통 값 목록(docs/common-values.md)은 묶음 설명을 옮겨 적으므로 설명에 링크를 인용하면 깨진다
test("tutorials의 모든 쪽, 템플릿 README, 공통 값 목록의 상대 링크의 파일과 #앵커가 있다", () => {
  const files = [...mdFiles(join(ROOT, "tutorials")), ...readdirSync(join(ROOT, "templates")).map((t) => join(ROOT, "templates", t, "README.md")).filter(existsSync), join(ROOT, "docs", "common-values.md")];
  assert.ok(files.length > 40, `파일 ${files.length}개`);
  assert.deepEqual(files.flatMap((f) => brokenLinks(f)), []);
});

test("brokenLinks: 없는 파일과 앵커는 찾고, 있는 링크와 http 링크와 코드 블록은 건너뛴다", () => {
  const md = [
    "[좋음](handbook/README.md#핵심-3가지) [외부](https://example.com/없음.md)",
    "[없는 파일](handbook/없는쪽.md) [없는 앵커](handbook/README.md#없는-앵커)",
    '<a href="docs/assets/brand/없음.png">a</a> <img src="docs/assets/brand/banner.png">',
    "```",
    "[코드 안](없음.md)",
    "```",
  ].join("\n");
  assert.deepEqual(brokenLinks(join(ROOT, "README.md"), md), [
    "README.md → handbook/없는쪽.md (파일 없음)",
    "README.md → handbook/README.md#없는-앵커 (앵커 없음)",
    "README.md → docs/assets/brand/없음.png (파일 없음)",
  ]);
});

test("slug: GitHub 앵커 규칙", () => {
  assert.equal(slug("dev-cycle 라운드"), "dev-cycle-라운드");
  assert.equal(slug("케이스 A~H와 대조표"), "케이스-ah와-대조표");
  assert.equal(slug("`DESIGN.md`의 효과"), "designmd의-효과");
  assert.equal(slug("빠른 시작: 화면만 만들기"), "빠른-시작-화면만-만들기");
  // GitHub 렌더링에서 확인한 값(2026-10-07, VERIFICATION.md): ·, →, —도 지운다.
  assert.equal(slug("Neon 개발·테스트 브랜치"), "neon-개발테스트-브랜치");
  assert.equal(
    slug("이름 바꾸기: bts-* → prokit-*, bts-starter-kit → pro-kit (2026-10-06 추가)"),
    "이름-바꾸기-bts---prokit--bts-starter-kit--pro-kit-2026-10-06-추가",
  );
});

test("anchors: 같은 제목이 반복되면 GitHub처럼 -1, -2를 붙인다", () => {
  assert.deepEqual(anchors("## 바꾼 것\n\n## 한계\n\n## 바꾼 것\n\n```md\n## 바꾼 것\n```\n\n## 바꾼 것\n"), [
    "바꾼-것",
    "한계",
    "바꾼-것-1",
    "바꾼-것-2",
  ]);
  // GitHub는 제목 안의 주석(doc-values 표시)을 지우고 앵커를 만든다.
  assert.deepEqual(anchors("# prokit 스킬 <!-- v:prokit.skills.count -->8<!-- /v -->개\n"), ["prokit-스킬-8개"]);
});

test("insideRoot: 이름이 같은 접두사로 시작하는 형제 폴더는 저장소 밖이다", () => {
  assert.equal(insideRoot(join(ROOT, "handbook", "README.md")), true);
  assert.equal(insideRoot(join(ROOT, "..", "pro-kit-samples", "README.md")), false);
  assert.equal(insideRoot(join(ROOT, "..", "README.md")), false);
});

test("strikeRisk: 한 문단에 물결표가 두 개면 GitHub가 그 사이를 취소선으로 그린다", () => {
  assert.deepEqual(strikeRisk("최소 1~3번을 하고, 4~5번은 따로"), ["최소 1~3번을 하고, 4~5번은 따로"]);
  assert.deepEqual(strikeRisk("1\\~3시간, 1\\~2시간"), []);
  assert.deepEqual(strikeRisk("`a~b` 그리고 1~3위"), []);
  assert.deepEqual(strikeRisk("- 1~3위\n- 3~4개"), []);
  assert.deepEqual(strikeRisk("| 1~3위 | 3~4개 |"), []);
  const bad = mdFiles(HB).flatMap((f) => strikeRisk(read(f)).map((p) => `${relative(HB, f)}: ${p.slice(0, 60)}`));
  assert.deepEqual(bad, []);
});

test("strikeRisk 범위: README, CONTRIBUTING, tutorials, 템플릿 README와 설치본(templates/*/files) 문서에도 한 덩어리에 물결표 두 개가 없다", () => {
  const files = [
    join(ROOT, "README.md"),
    join(ROOT, "CONTRIBUTING.md"),
    ...mdFiles(join(ROOT, "tutorials")),
    ...readdirSync(join(ROOT, "templates")).flatMap((t) => [join(ROOT, "templates", t, "README.md"), ...(existsSync(join(ROOT, "templates", t, "files")) ? mdFiles(join(ROOT, "templates", t, "files")) : [])]),
  ].filter((f) => existsSync(f) && !f.includes("node_modules"));
  const bad = files.flatMap((f) => strikeRisk(read(f)).map((p) => `${relative(ROOT, f)}: ${p.slice(0, 70)}`));
  assert.deepEqual(bad, []);
});
