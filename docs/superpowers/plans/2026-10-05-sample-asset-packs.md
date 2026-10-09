# 샘플 8개 에셋 팩 (B 단계) 실행 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 샘플 8개마다 에셋 팩(글·JSON은 저장소, 그림·스크린샷은 팩 릴리스 zip)을 만들고, 샘플 쪽 프롬프트를 셋(똑같이, 나만의 서비스, 처음부터)으로 정리하고, 시간과 비용과 사이트 값을 "에셋 팩으로" 값으로 바꾼 뒤 A 단계와 함께 공개한다.

**Architecture:** 팩은 샘플 작업공간마다 headless 라운드가 `bts-samples/packs/<샘플>/`에 만든다(공통 지시문, 공통 틀, zip·검사 도구). 고루를 먼저 만들어 검토한 뒤 나머지 7개를 돌린다. 팩 글을 `tutorials/samples/pack/<샘플>/`로 옮기고, 샘플 쪽 8개는 스크립트 하나로 바꾼다. 사이트는 라운드 R21이 맞춘다. 공개는 사용자 확인 뒤 한 번에 한다.

**Tech Stack:** Node(검사·zip 도구, `node:test`), `zip`/`unzip`/`cwebp`, Python 3 편집 스크립트, `bts-samples/tools/run.sh`(headless Claude Code), `qa.mjs`, Next.js 사이트 작업공간, `scripts/release.mjs`, `gh`

**Spec:** [docs/superpowers/specs/2026-10-05-sample-asset-packs-design.md](../specs/2026-10-05-sample-asset-packs-design.md). 숫자는 [A 단계 설계](../specs/2026-10-05-tutorial-prompts-home-and-cost-design.md) 5.2·6.2·6.3·7절.

## Global Constraints

- 샘플과 그림 수: 고루 5, 울림 41, 하루공부 3, AFTERGLOW 22, 핏슬롯 18, 제철상자 32, PACECREW 46, Uptrail 2(합계 169).
- 팩 위치는 `tutorials/samples/pack/<샘플>/`, 릴리스 태그 `pack-<샘플>-1`, 첨부 `<샘플>-images.zip` 하나. 이미 올린 판은 덮어쓰지 않는다.
- 저장소에는 그림·스크린샷을 넣지 않는다. Netflix 화면, Refero 원본 그림, 비밀 값, 로컬 절대 경로를 팩에 넣지 않는다.
- 팩 글은 해요체다. 교재 문체는 해요체, 루트 README는 합니다체, 설계 문서는 한다체다.
- ```` ```prompt ```` 블록에는 색 코드, 크기, 시간 같은 값을 넣지 않고 10줄을 넘기지 않는다.
- 사이트가 검사하는 원본 구조를 지킨다. `tutorials/samples/README.md`의 "## 샘플로 만들어 보기" 표 열은 `샘플 | 컨셉 | 페이지`다. 샘플 쪽 "## 샘플과 똑같이 만들기" 절은 문단으로 시작하고, 프롬프트를 담고, `README.md#…` 링크가 든 문단으로 끝난다(사이트의 "튜토리얼로 만들기" 창 파서).
- 셸 작업 디렉터리를 `templates/`, `tutorials/samples`, `tutorials/01-nextflix`, `pack/` 안에 두지 않는다. 명령은 절대 경로로 실행한다(OMC 훅이 `.omc/`를 만든다). 생기면 지운다.
- git commit·push·gh 앞에는 `set -a; . /Users/freelife/youtube/.envrc; set +a`를 붙인다. 토큰 값은 출력하지 않는다.
- `main` push, 릴리스, 팩 릴리스, gh-pages push는 Task 10에서 사용자 확인을 받은 뒤에만 한다. 사용자에게 물을 때는 AskUserQuestion 상자 없이 글로 묻는다.
- `.claude/settings.json`은 커밋하지 않는다.
- 시범 실행(처음 보는 에이전트로 팩을 써 보기)은 하지 않는다.

## Review Focus

1. **팩 이름 바꾸기 누수**: 독자가 이름을 바꿨는데 데이터 문자열이나 스크린샷을 따라 원래 이름(고루)이 남을 수 있다. 팩 `README.md` "지킬 것"이 `site.json`의 `original` 글자를 모두 바꾸라고 적고, `site.json`의 `original`이 샘플 표시 이름과 같아야 한다. Task 3 틀과 Task 6 Step 2의 grep이 막는다.
2. **사이트 창 파서**: "샘플과 똑같이 만들기" 절의 모양이 틀리면 사이트 빌드가 멈춘다. Task 7 Step 3의 구조 검사와 Task 9 R21의 `tryTitle` 변경이 막는다.
3. **팩 링크**: 샘플 쪽의 `pack/<샘플>/`, `pack/<샘플>/CUSTOMIZE.md`가 저장소에서는 있는 경로이고, 사이트에서는 GitHub tree·blob 주소로 열려야 한다. Task 8 Step 1의 링크 검사와 Task 9 R21이 막는다.
4. **zip과 `images.json` 어긋남**: 팩을 옮긴 뒤 zip을 다시 만들면 저장소의 sha256과 올릴 zip이 달라진다. Task 6은 옮긴 저장소 사본으로 다시 검사하고, Task 10은 받은 zip의 sha256을 확인한다.
5. **저장소 무게**: 스크린샷이나 그림이 실수로 `tutorials/samples/pack/`에 들어가면 저장소가 무거워진다. Task 6 Step 2가 `.webp`·`.png`·`.zip`이 없는지 본다.

## 파일 구조

| 파일 | 하는 일 |
|---|---|
| `/Users/freelife/youtube/bts-samples/tools/sample-pack-zip.mjs` | `zip-root/`를 정해진 순서와 시각으로 묶고 `pack/images.json`을 쓴다 |
| `/Users/freelife/youtube/bts-samples/tools/sample-pack-check.mjs` | 팩 구성, JSON, 그림 수, 스크린샷, zip 해시, 비밀·경로·빈 칸을 검사한다 |
| `/Users/freelife/youtube/bts-samples/tools/sample-pack-check.test.mjs` | 두 도구의 테스트 |
| `/Users/freelife/youtube/bts-samples/packs/_template/README.md`, `CUSTOMIZE.md` | 팩 공통 틀(`⟦…⟧` 칸만 라운드가 채운다) |
| `/Users/freelife/youtube/bts-samples/prompts/pack-common.txt`, `pack-<샘플>.txt` | 팩 라운드 지시 |
| `/Users/freelife/youtube/bts-samples/packs/<샘플>/` | 라운드 출력: `pack/`(저장소로 옮김), `zip-root/`, `<샘플>-images.zip` |
| `tutorials/samples/pack/<샘플>/` | 저장소의 팩 글과 JSON |
| `tutorials/samples/<샘플>.md` 8개 | 프롬프트 셋, 시간과 비용(스크립트로 생성) |
| `tutorials/samples/README.md`, `tutorials/reference/glossary.md`, `tutorials/reference/costs-and-keys.md`, `README.md` | 세 방식 안내, 에셋 팩 뜻, 이미지 한 줄, 루트 튜토리얼 절 |
| `docs/superpowers/specs/2026-10-02-sample-tutorials-design.md` | 2.5절 샘플 쪽 구성 |
| `/Users/freelife/youtube/bts-samples/prompts/portfolio-R21.txt` | 사이트 라운드 지시 |

---

### Task 1: 설계와 계획 커밋

**Files:**
- Commit: `docs/superpowers/specs/2026-10-05-sample-asset-packs-design.md`, `docs/superpowers/specs/2026-10-05-tutorial-prompts-home-and-cost-design.md`, `docs/superpowers/plans/2026-10-05-sample-asset-packs.md`

- [ ] **Step 1: 커밋**

```bash
cd /Users/freelife/youtube/bts-starter-kit && set -a; . /Users/freelife/youtube/.envrc; set +a
git add docs/superpowers/specs/2026-10-05-sample-asset-packs-design.md docs/superpowers/specs/2026-10-05-tutorial-prompts-home-and-cost-design.md docs/superpowers/plans/2026-10-05-sample-asset-packs.md
git commit -m "docs: 샘플 8개 에셋 팩 설계와 실행 계획" -m "- 팩 구성(층별), 샘플 쪽 프롬프트 셋, 만드는 방법과 공개 순서

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git status --short
```
Expected: `?? .claude/settings.json`만 남는다.

---

### Task 2: 팩 zip·검사 도구

**Files:**
- Create: `/Users/freelife/youtube/bts-samples/tools/sample-pack-zip.mjs`, `/Users/freelife/youtube/bts-samples/tools/sample-pack-check.mjs`
- Test: `/Users/freelife/youtube/bts-samples/tools/sample-pack-check.test.mjs`

**Interfaces:**
- Produces: `node sample-pack-zip.mjs <stage-dir> <slug>` → `<stage>/<slug>-images.zip`, `<stage>/pack/images.json`(`release`, `url`, `sha256`, `bytes`, `files`). `node sample-pack-check.mjs <pack-dir> <zip> <slug>` → 마지막 줄 `PASS` 또는 `FAIL n`, exit 0/1. 팩 규칙: `screens.md`의 "## 2. 사이트맵" 절 표 머리 `| 경로 | 화면 | 스크린샷 | 메모 |`, 스크린샷 칸은 `` `id` ``, zip에 `shots/<id>-1440.webp`·`-390.webp`. 틀의 빈 칸 표시는 `⟦…⟧`.

- [ ] **Step 1: 테스트 쓰기**

`sample-pack-check.test.mjs`:

```js
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const tools = path.dirname(new URL(import.meta.url).pathname);
const ROWS = ["이름만", "첫 화면 문구, 말투", "대표 색", "서체", "페이지 빼기", "페이지 더하기", "주제"];

function fixture() {
	const stage = fs.mkdtempSync(path.join(os.tmpdir(), "sample-pack-"));
	const w = (rel, s) => {
		const p = path.join(stage, rel);
		fs.mkdirSync(path.dirname(p), { recursive: true });
		fs.writeFileSync(p, s);
	};
	w("pack/README.md", "# Uptrail 에셋 팩\n");
	w("pack/site.json", JSON.stringify({ name: "Uptrail", original: "Uptrail", tagline: "t", tone: "해요체", url: "https://roadkwonai.github.io/bts-starter-kit/uptrail/", imagesRoot: "apps/web/public/images" }));
	w("pack/screens.md", "## 2. 사이트맵\n\n| 경로 | 화면 | 스크린샷 | 메모 |\n|---|---|---|---|\n| `/` | 홈 | `home` | |\n\n## 3. 공통\n\n| a | b | `not-a-shot` | c |\n");
	w("pack/DESIGN.md", "---\nname: Uptrail\n---\n");
	w("pack/CUSTOMIZE.md", ROWS.map((r) => `| ${r} | x | y |`).join("\n"));
	w("pack/SOURCES.md", "# 출처\n");
	w("pack/data/services.json", "[]");
	const p = (f) => ({ file: `images/${f}`, where: "홈 첫 화면", prompt: "Editorial illustration, no text, no letters, no numbers, no logos, calm palette.", ref: "style-ref/ref.png", brandColor: false, recorded: true });
	w("pack/prompts.json", JSON.stringify([p("home/a.webp"), p("login/b.webp")]));
	for (const f of ["images/home/a.webp", "images/login/b.webp", "style-ref/ref.png", "shots/home-1440.webp", "shots/home-390.webp"]) w(`zip-root/${f}`, f);
	return stage;
}
const zipIt = (s) => execFileSync(process.execPath, [path.join(tools, "sample-pack-zip.mjs"), s, "uptrail"]);
const check = (s) => spawnSync(process.execPath, [path.join(tools, "sample-pack-check.mjs"), path.join(s, "pack"), path.join(s, "uptrail-images.zip"), "uptrail"], { encoding: "utf8" });
const withFixture = (fn) => {
	const s = fixture();
	try {
		fn(s);
	} finally {
		fs.rmSync(s, { recursive: true, force: true });
	}
};

test("정상 팩은 PASS이고, 같은 파일이면 같은 zip이 나온다", () =>
	withFixture((s) => {
		zipIt(s);
		const first = fs.readFileSync(path.join(s, "pack/images.json"), "utf8");
		zipIt(s);
		assert.equal(fs.readFileSync(path.join(s, "pack/images.json"), "utf8"), first);
		const r = check(s);
		assert.equal(r.status, 0, r.stdout);
		assert.match(r.stdout, /PASS/);
	}));

test("깨진 팩을 이유와 함께 막는다", () => {
	const cases = [
		[(s) => fs.rmSync(path.join(s, "zip-root/shots/home-390.webp")), /스크린샷 없음: shots\/home-390/],
		[(s) => fs.rmSync(path.join(s, "zip-root/images/login/b.webp")), /그림 수 1/],
		[(s) => fs.appendFileSync(path.join(s, "pack/SOURCES.md"), "/Users/me/x"), /로컬 경로/],
		[(s) => fs.writeFileSync(path.join(s, "pack/CUSTOMIZE.md"), "| 이름만 | x |"), /CUSTOMIZE.md 행: 대표 색/],
		[(s) => fs.appendFileSync(path.join(s, "pack/README.md"), "⟦샘플 주소⟧"), /채우지 않은 칸/],
		[(s) => fs.writeFileSync(path.join(s, "pack/site.json"), "{"), /JSON 아님: site.json/],
	];
	for (const [mutate, expected] of cases)
		withFixture((s) => {
			mutate(s);
			zipIt(s);
			const r = check(s);
			assert.equal(r.status, 1, r.stdout);
			assert.match(r.stdout, expected);
		});
	withFixture((s) => {
		zipIt(s);
		fs.appendFileSync(path.join(s, "uptrail-images.zip"), "x");
		const r = check(s);
		assert.equal(r.status, 1, r.stdout);
		assert.match(r.stdout, /sha256/);
	});
});
```

- [ ] **Step 2: 테스트가 실패하는지 보기**

Run: `node --test /Users/freelife/youtube/bts-samples/tools/sample-pack-check.test.mjs`
Expected: FAIL(`sample-pack-zip.mjs`가 없어 `Cannot find module`)

- [ ] **Step 3: zip 도구 쓰기**

`sample-pack-zip.mjs`:

```js
// usage: node sample-pack-zip.mjs <stage-dir> <slug> — <stage>/zip-root/(images, style-ref, shots)를 <stage>/<slug>-images.zip으로 묶고 <stage>/pack/images.json을 쓴다.
// 같은 파일이면 같은 zip이 나오게: 이름순, 파일 시각 고정, 여분 속성(-X)과 디렉터리 항목(-D) 없음. 숨김 파일은 넣지 않는다.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const [stage, slug] = process.argv.slice(2);
const root = path.join(stage, "zip-root");
const zip = path.resolve(stage, `${slug}-images.zip`);
const files = fs
	.readdirSync(root, { recursive: true })
	.map((f) => f.split(path.sep).join("/"))
	.filter((f) => !f.split("/").some((p) => p.startsWith(".")) && fs.statSync(path.join(root, f)).isFile())
	.sort();
const t = new Date("2026-10-05T00:00:00Z");
for (const f of files) fs.utimesSync(path.join(root, f), t, t);
fs.rmSync(zip, { force: true });
execFileSync("zip", ["-X", "-D", "-q", zip, "-@"], { cwd: root, input: files.join("\n") });
const buf = fs.readFileSync(zip);
const tag = `pack-${slug}-1`;
const out = {
	release: tag,
	url: `https://github.com/roadkwonai/bts-starter-kit/releases/download/${tag}/${slug}-images.zip`,
	sha256: createHash("sha256").update(buf).digest("hex"),
	bytes: buf.length,
	files,
};
fs.writeFileSync(path.join(stage, "pack", "images.json"), `${JSON.stringify(out, null, "\t")}\n`);
console.log(`${zip} ${buf.length}B ${files.length} files sha256 ${out.sha256}`);
```

- [ ] **Step 4: 검사 도구 쓰기**

`sample-pack-check.mjs`:

```js
// usage: node sample-pack-check.mjs <pack-dir> <zip> <slug> — 샘플 에셋 팩 검사(설계 2026-10-05-sample-asset-packs-design.md 3·4절). 문제가 있으면 exit 1
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const COUNTS = { goru: 5, ullim: 41, studyday: 3, afterglow: 22, fitslot: 18, jecheol: 32, pacecrew: 46, uptrail: 2 };
const DOCS = ["README.md", "site.json", "screens.md", "DESIGN.md", "images.json", "prompts.json", "CUSTOMIZE.md", "SOURCES.md"];
const ROWS = ["이름만", "첫 화면 문구, 말투", "대표 색", "서체", "페이지 빼기", "페이지 더하기", "주제"];

const [dirArg, zipArg, slug] = process.argv.slice(2);
if (!COUNTS[slug]) {
	console.log(`모르는 샘플: ${slug}`);
	process.exit(2);
}
const dir = path.resolve(dirArg);
const zip = path.resolve(zipArg);
const fails = [];
const need = (ok, msg) => {
	if (!ok) fails.push(msg);
};
function finish() {
	if (fails.length) {
		console.log(`${fails.join("\n")}\nFAIL ${fails.length}`);
		process.exit(1);
	}
}
const read = (f) => fs.readFileSync(path.join(dir, f), "utf8");
const json = (f) => {
	try {
		return JSON.parse(read(f));
	} catch {
		fails.push(`JSON 아님: ${f}`);
	}
};

for (const f of DOCS) need(fs.existsSync(path.join(dir, f)), `없음: ${f}`);
const dataDir = path.join(dir, "data");
const data = fs.existsSync(dataDir) ? fs.readdirSync(dataDir).filter((f) => f.endsWith(".json")).map((f) => `data/${f}`) : [];
need(data.length > 0, "없음: data/*.json");
need(fs.existsSync(zip), `없음: ${zip}`);
finish();

const site = json("site.json");
const images = json("images.json");
const prompts = json("prompts.json");
for (const f of data) json(f);
finish();

for (const k of ["name", "original", "tagline", "tone", "url", "imagesRoot"]) need(typeof site[k] === "string" && site[k] !== "", `site.json ${k}`);
need(site.url === `https://roadkwonai.github.io/bts-starter-kit/${slug}/`, "site.json url");

const tag = `pack-${slug}-1`;
need(images.release === tag, "images.json release");
need(images.url === `https://github.com/roadkwonai/bts-starter-kit/releases/download/${tag}/${slug}-images.zip`, "images.json url");
const buf = fs.readFileSync(zip);
need(images.sha256 === createHash("sha256").update(buf).digest("hex"), "images.json sha256이 zip과 다름");
need(images.bytes === buf.length, "images.json bytes가 zip과 다름");
let entries = [];
try {
	entries = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" }).split("\n").filter((e) => e && !e.endsWith("/")).sort();
} catch {
	fails.push("zip을 읽지 못함");
}
need(JSON.stringify(images.files) === JSON.stringify(entries), "images.json 파일 목록이 zip과 다름");
const inZip = new Set(entries);
const pics = entries.filter((e) => e.startsWith("images/"));
need(pics.length === COUNTS[slug], `그림 수 ${pics.length}, 기대 ${COUNTS[slug]}`);

need(Array.isArray(prompts), "prompts.json은 배열");
if (Array.isArray(prompts)) {
	need(JSON.stringify(prompts.map((p) => p.file).sort()) === JSON.stringify(pics), "prompts.json 그림 목록이 zip images/와 다름");
	for (const p of prompts) {
		const at = `prompts.json ${p.file}`;
		need(typeof p.where === "string" && p.where !== "", `${at} where`);
		need(typeof p.prompt === "string" && p.prompt.length > 40, `${at} prompt`);
		need(/no text|without text/i.test(p.prompt ?? ""), `${at} 글자 없음 조건`);
		need(typeof p.brandColor === "boolean" && typeof p.recorded === "boolean", `${at} brandColor·recorded`);
		need(p.ref === null || inZip.has(p.ref), `${at} ref가 zip에 없음`);
	}
}

const screens = read("screens.md");
const map = screens.split(/^## /m).find((s) => s.startsWith("2. 사이트맵")) ?? "";
need(map.includes("| 경로 | 화면 | 스크린샷 | 메모 |"), "screens.md 사이트맵 표 머리");
const ids = [...map.matchAll(/^\|[^|\n]*\|[^|\n]*\|\s*`([a-z0-9-]+)`\s*\|/gm)].map((m) => m[1]);
need(ids.length > 0, "screens.md 사이트맵 표에 스크린샷 칸(`id`)이 없음");
for (const id of ids) for (const w of ["1440", "390"]) need(inZip.has(`shots/${id}-${w}.webp`), `스크린샷 없음: shots/${id}-${w}.webp`);

const custom = read("CUSTOMIZE.md");
for (const r of ROWS) need(custom.includes(`| ${r} |`), `CUSTOMIZE.md 행: ${r}`);

for (const f of [...DOCS, ...data]) {
	const s = read(f);
	need(!/\/Users\/|\/private\/tmp\//.test(s), `로컬 경로: ${f}`);
	need(!/sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{20,}|OPENAI_API_KEY=/.test(s), `비밀 값: ${f}`);
	need(!s.includes("⟦"), `채우지 않은 칸: ${f}`);
}
finish();
console.log("PASS");
```

- [ ] **Step 5: 테스트 통과 보기**

Run: `node --test /Users/freelife/youtube/bts-samples/tools/sample-pack-check.test.mjs`
Expected: `# pass 2`, `# fail 0`

- [ ] **Step 6: 도구 안내에 두 줄**

`/Users/freelife/youtube/bts-samples/tools/README.md`의 "그 밖의 검사 도구" 표 끝에 더한다:

```
| `sample-pack-zip.mjs <stage> <slug>` | 샘플 에셋 팩의 `zip-root/`를 정해진 순서로 묶고 `pack/images.json`을 써요 |
| `sample-pack-check.mjs <pack> <zip> <slug>` | 샘플 에셋 팩의 파일, 그림 수, 스크린샷, zip 해시, 비밀·경로·빈 칸을 검사해요 |
```

(`bts-samples`는 git 저장소가 아니라 커밋하지 않는다.)

---

### Task 3: 팩 공통 틀과 라운드 지시

**Files:**
- Create: `/Users/freelife/youtube/bts-samples/packs/_template/README.md`, `/Users/freelife/youtube/bts-samples/packs/_template/CUSTOMIZE.md`, `/Users/freelife/youtube/bts-samples/prompts/pack-common.txt`, `/Users/freelife/youtube/bts-samples/prompts/pack-{goru,ullim,studyday,afterglow,fitslot,jecheol,pacecrew,uptrail}.txt`

**Interfaces:**
- Consumes: Task 2의 두 도구와 팩 규칙(사이트맵 표 머리, `⟦…⟧`)
- Produces: 라운드 출력 `/Users/freelife/youtube/bts-samples/packs/<slug>/pack/`(9종), `zip-root/`, `<slug>-images.zip`

- [ ] **Step 1: 팩 README 틀**

`packs/_template/README.md`:

```markdown
# ⟦이름⟧ 에셋 팩

[⟦이름⟧ 샘플](https://roadkwonai.github.io/bts-starter-kit/⟦slug⟧/)을 다시 만들기 위한 에셋 팩이에요. 페이지 ⟦페이지 수⟧개와 그림 ⟦그림 수⟧장이 들어 있어요. 에이전트는 이 파일의 순서대로 해요.

## 지킬 것

- 팩 파일은 고치지 않아요. 바꿀 내용은 프로젝트 파일에만 써요.
- 서비스 이름은 `site.json`의 `name`이에요. 사용자가 이름을 정했으면 화면, 페이지 제목, 문서, 데이터에 있는 `site.json` `original` 글자를 모두 그 이름으로 바꿔 써요. 스크린샷에 보이는 원래 이름도 새 이름으로 만들어요. 그림에는 글자가 없어 그대로 써요.
- 모든 상호작용은 메모리 상태로만 보여 줘요. 새로고침하면 `data/`의 처음 예시로 돌아가요.

## 두 가지 방식

| 방식 | 하는 일 |
|---|---|
| 똑같이 만들기 | 모든 파일을 그대로 써요. 스타일 추천, 시안, 새 그림은 하지 않아요 |
| 나만의 서비스 | `CUSTOMIZE.md`에서 사용자가 바꾸는 것의 행만 따라 다시 하고, 나머지는 팩대로 해요 |

## 순서

1. **기획**: `site.json`과 `screens.md`로 `PRODUCT.md`, `GLOSSARY.md`, 사이트맵(`docs/briefs/site-map.md`)과 페이지별 브리프를 채워요. 서비스 질문의 답은 팩에 있어요. 디자인 스타일 후보는 찾지 않아요.
2. **디자인**: 이 폴더의 `DESIGN.md`를 프로젝트 루트에 복사해요. 이름을 바꿨으면 `name`만 바꿔요. 서체는 `DESIGN.md`에 적힌 무료 서체를 받아 써요.
3. **그림**: `images.json`의 `url`에서 zip을 받아 `sha256`이 같은지 확인하고, 프로젝트 밖 임시 폴더에 풀어요. `images/` 아래 파일은 프로젝트의 `⟦그림 폴더⟧` 아래 같은 경로에 둬요. `shots/`와 `style-ref/`는 보기만 하고 프로젝트에 넣지 않아요.
4. **화면**: `screens.md` 사이트맵 순서로 페이지를 만들어요. 페이지마다 `shots/<스크린샷>-1440.webp`와 `-390.webp`를 열어 같은 배치, 크기, 간격으로 만들어요. 글자와 숫자는 `data/`와 `site.json`에서 읽어요. 스크린샷과 `screens.md`가 다르면 `screens.md`를 따라요.
5. **검사와 내보내기**: 템플릿의 검사(링크·버튼 전수, 너비별 넘침, 접근성, 콘솔 오류)를 해요. 페이지마다 내 화면을 1440과 390으로 찍어 팩의 스크린샷과 나란히 비교한 뒤 HTML로 내보내요.

## 나만의 서비스로 바꿀 때

- 바꾸는 것마다 `CUSTOMIZE.md` 표의 "다시 할 일"만 해요.
- 그림을 다시 그릴 때는 `prompts.json`에서 그 그림의 `prompt`를 고쳐(주제, 색) 써요. `ref`가 있으면 zip의 그 스타일 기준 그림을 함께 넘겨 같은 화풍으로 그려요. 크기와 파일 이름은 원래 그림과 같게 해요.
- 그림을 그릴 수 없는 환경(이미지 API 키도, ChatGPT로 로그인한 Codex도 없음)이면 원래 그림을 그대로 쓰고 사용자에게 알려요.
```

- [ ] **Step 2: CUSTOMIZE 틀**

`packs/_template/CUSTOMIZE.md`:

```markdown
# 나만의 서비스로 바꾸기

바꾸는 것마다 다시 할 일만 해요. 표에 없는 것은 팩대로 둬요.

| 바꾸는 것 | 다시 할 일 | 그대로 쓰는 것 |
|---|---|---|
| 이름만 | 화면 글자와 문서의 이름 | 그림, 화면, 디자인, 데이터 |
| 첫 화면 문구, 말투 | 문구 | 나머지 전부 |
| 대표 색 | `DESIGN.md` 색 값, 아래 표에서 대표 색이 "예"인 그림만 색을 바꿔 다시 그리기 | 나머지 그림, 화면, 데이터 |
| 서체 | `DESIGN.md` 서체 | 나머지 전부 |
| 페이지 빼기 | 사이트맵, 메뉴, 그 페이지로 가는 링크 | 남은 페이지 전부 |
| 페이지 더하기 | 그 페이지 화면(`DESIGN.md`와 가까운 페이지 배치를 따름), 필요한 그림만 새로 | 기존 페이지 |
| 주제 | 이름, 문구, 데이터, 주제가 보이는 그림(같은 화풍으로) | 화면 구성, 디자인 |

그림을 그릴 수 없는 환경이면 원래 그림을 그대로 쓰고 사용자에게 알려요.

## 이 샘플의 그림

⟦그림 표: | 파일 | 쓰는 곳 | 대표 색 | 표, prompts.json과 같은 순서, 대표 색은 "예" 또는 "아니요"⟧
```

- [ ] **Step 3: 공통 라운드 지시**

`prompts/pack-common.txt`:

```
에셋 팩 라운드: 이 샘플의 에셋 팩을 만든다. 설계 /Users/freelife/youtube/bts-starter-kit/docs/superpowers/specs/2026-10-05-sample-asset-packs-design.md 2~4절이 기준이다. 참고로 Nextflix 팩(/Users/freelife/youtube/bts-starter-kit/tutorials/01-nextflix/pack)의 screens.md 1·2절 모양을 본다.
이 샘플 작업공간의 코드와 문서는 읽기만 하고 고치지 않는다. dev-cycle 라운드가 아니다: tasks/todo.md에 행을 더하지 않고 커밋하지 않는다. 오래 걸리는 명령도 백그라운드로 돌리지 말고 포그라운드에서 끝까지 기다린다.
출력 OUT=/Users/freelife/youtube/bts-samples/packs/<slug>/ : OUT/pack/(저장소로 옮길 글과 JSON), OUT/zip-root/images/, OUT/zip-root/style-ref/, OUT/zip-root/shots/. 틀 /Users/freelife/youtube/bts-samples/packs/_template/의 README.md와 CUSTOMIZE.md를 OUT/pack/에 복사해 ⟦…⟧ 칸만 채운다. 틀 문장은 바꾸지 않는다. 팩 글은 해요체다.
1. site.json: {"name": 표시 이름, "original": 표시 이름, "tagline": 첫 화면 문구, "tone": 말투 한 줄, "url": "https://roadkwonai.github.io/bts-starter-kit/<slug>/", "imagesRoot": 샘플 앱에서 그림을 둔 폴더(예: apps/web/public/images)}.
2. screens.md: docs/briefs/(site-map.md와 페이지별 브리프)와 실제 화면(아래 정적 HTML)을 대조해 쓴다. 둘이 다르면 실제 화면을 적는다. 절: "## 1. 쓰는 법"(이 파일이 배치·동작의 정본, 색·서체는 DESIGN.md, 글자·숫자는 data/, 스크린샷과 다르면 이 파일), "## 2. 사이트맵"(표 머리는 정확히 | 경로 | 화면 | 스크린샷 | 메모 |, 스크린샷 칸은 `id` 하나. 동적 경로는 대표 하나만 찍고 나머지는 메모에. 창·완료 같은 상태 화면도 한 행씩, 경로 칸에 여는 법), "## 3. 공통 머리줄과 푸터"(너비별 메뉴 포함), 이어서 페이지마다 한 절(위에서 아래로 블록 순서, 블록마다 쓰는 data 파일과 값, 상호작용과 상태, 390에서 바뀌는 것). 샘플 코드의 계산(정산, 일정 나누기 등)은 "## 계산 규칙" 절에 글과 예시 입력·출력으로 적는다. 코드는 넣지 않는다. 서비스 이름은 site.json의 name에서 읽는다고 적는다.
3. DESIGN.md: 샘플 DESIGN.md를 복사하고 apps/web/src/index.css(또는 globals.css)의 실제 토큰(색, 서체, 반경, 간격)과 대조해 다른 값은 코드 값으로 고친다. 울림은 옛 Sequel 판, 제철상자는 본문이 잘림, PACECREW는 원문 빨강이 남은 것으로 알려져 있다. 고친 값은 SOURCES.md에 적는다. `pnpm dlx @google/design.md lint OUT/pack/DESIGN.md`가 errors 0.
4. data/*.json: 화면에 나오는 예시 데이터를 샘플 코드(lib/data.ts 등, 페이지 안 상수 포함)에서 주제별 JSON 파일로 옮긴다(예: expenses.json, members.json). 글자와 숫자는 화면과 같아야 한다.
5. 그림: 앱의 AI 그림(.webp, 이 샘플은 정해진 장 수)을 OUT/zip-root/images/<imagesRoot 아래 경로>로 복사한다. 앱 밖 그림(README용 assets 등)은 넣지 않는다. OUT/pack/prompts.json은 그림마다 {"file": "images/…", "where": 쓰는 페이지와 자리, "prompt": 옆 .webp.json의 prompt 그대로, "ref": 스타일 기준 그림이 있으면 "style-ref/<이름>" 없으면 null, "brandColor": 프롬프트나 그림에 대표 색이 두드러지면 true, "recorded": .webp.json에서 왔으면 true}. .webp.json의 refs가 가리키는 파일(.impeccable/build/… 등)을 OUT/zip-root/style-ref/로 복사한다. 못 찾으면 ref는 null로 두고 보고한다.
6. 스크린샷: 공개판과 같은 정적 HTML을 띄운다: python3 -m http.server <port> -b 127.0.0.1 -d /Users/freelife/youtube/bts-samples/pages (포트는 아래 샘플 줄). 주소는 http://127.0.0.1:<port>/bts-starter-kit/<slug>/… 이다. 사이트맵의 행마다 /Users/freelife/youtube/bts-samples/tools/qa.mjs shots --full로 1440과 390을 찍고(상태 화면은 --click), cwebp -q 80으로 OUT/zip-root/shots/<id>-1440.webp, <id>-390.webp에 둔다. 다 찍으면 서버를 끈다.
7. CUSTOMIZE.md의 "이 샘플의 그림" 표를 채운다.
8. SOURCES.md: 스타일 출처(튜토리얼 원본 tutorials/samples/<slug>.md 요약 표의 스타일 링크), DESIGN.md에서 고친 값, 그림 모델과 날짜(.webp.json의 model과 createdAt 범위), 스크린샷 날짜와 공개판 커밋(git -C /Users/freelife/youtube/bts-samples/pages/bts-starter-kit rev-parse --short HEAD).
9. zip과 검사: node /Users/freelife/youtube/bts-samples/tools/sample-pack-zip.mjs OUT <slug> 다음 node /Users/freelife/youtube/bts-samples/tools/sample-pack-check.mjs OUT/pack OUT/<slug>-images.zip <slug> 가 PASS일 때까지 고친다.
보고는 짧게: OUT/pack 파일 목록과 크기, zip 크기, 사이트맵 행 수와 스크린샷 수, DESIGN.md에서 고친 값, ref를 못 찾은 그림, 확신 없는 곳.
```

- [ ] **Step 4: 샘플별 지시 파일 8개**

```bash
cd /Users/freelife/youtube/bts-samples && python3 - <<'PY'
S={'goru':('고루',7,5,8101),'ullim':('울림',11,41,8102),'studyday':('하루공부',14,3,8103),'afterglow':('AFTERGLOW',17,22,8104),
   'fitslot':('핏슬롯',20,18,8105),'jecheol':('제철상자',21,32,8106),'pacecrew':('PACECREW',22,46,8107),'uptrail':('Uptrail',22,2,8108)}
common=open('prompts/pack-common.txt').read()
for slug,(name,pages,imgs,port) in S.items():
    head=f"샘플: {name}, slug {slug}, 페이지 {pages}개, AI 그림 {imgs}장, 스크린샷 서버 포트 {port}. 위 지시의 <slug>, <port>는 이 값이다.\n"
    if slug=='afterglow':
        head+=("AFTERGLOW만: 그림 옆 .webp.json이 없다. 그림을 하나씩 열어 보고 같은 그림을 다시 그릴 수 있게 영어 프롬프트를 적는다"
               "(다른 샘플처럼 'no text, no letters, no numbers, no logos' 포함, recorded는 false, ref는 null). "
               "글자, 숫자, 로고가 보이는 그림이 있으면 그 장만 .agents/skills/impeccable/scripts/impeccable generate-image로 글자 없이 다시 그려 "
               "원래 파일 이름과 크기로 zip-root에 넣고(OPENAI_API_KEY가 환경에 있다) 보고에 적는다. 샘플 앱의 그림은 바꾸지 않는다.\n")
    open(f'prompts/pack-{slug}.txt','w').write(head+common)
print('ok')
PY
ls /Users/freelife/youtube/bts-samples/prompts/pack-*.txt | wc -l
```
Expected: `ok`, `9`(common 포함)

---

### Task 4: 고루 팩 만들고 검토

**Files:**
- Create (라운드): `/Users/freelife/youtube/bts-samples/packs/goru/…`
- Modify (검토 뒤 필요하면): `packs/_template/*`, `prompts/pack-common.txt`

- [ ] **Step 1: 라운드 실행 (백그라운드)**

Run (`run_in_background: true`): `bash /Users/freelife/youtube/bts-samples/tools/run.sh goru PACK /Users/freelife/youtube/bts-samples/prompts/pack-goru.txt`
끝나면: `cat /Users/freelife/youtube/bts-samples/logs/goru-PACK.done`
Expected: `exit=0 wall=…s`

- [ ] **Step 2: 보고와 검사**

```bash
tail -1 /Users/freelife/youtube/bts-samples/logs/goru-PACK.jsonl | python3 -c 'import sys,json;d=json.loads(sys.stdin.read());print(d.get("total_cost_usd"));print(d.get("result","")[:3000])'
node /Users/freelife/youtube/bts-samples/tools/sample-pack-check.mjs /Users/freelife/youtube/bts-samples/packs/goru/pack /Users/freelife/youtube/bts-samples/packs/goru/goru-images.zip goru
git -C /Users/freelife/youtube/bts-samples/ws/goru status --short | wc -l
```
Expected: `PASS`. 작업공간 변경 수가 라운드 전(81)과 같다(샘플 코드를 고치지 않았다).

- [ ] **Step 3: 직접 검토**

Read로 `packs/goru/pack/README.md`, `screens.md`, `CUSTOMIZE.md`, `site.json`, `data/` 한두 개, 스크린샷 3장(`unzip -o … shots/home-1440.webp shots/home-390.webp` 등 scratchpad에 풀어 보기)을 본다. 기준:
- 처음 보는 에이전트가 `screens.md`만으로 홈과 정산 화면을 만들 수 있을 만큼 블록 순서와 데이터 연결이 적혀 있다.
- 최소 송금 계산 규칙이 예시 입력·출력과 함께 있다.
- 스크린샷이 사이트맵 행마다 있고 지출 추가 창 같은 상태 화면도 있다.
- `site.json`의 `original`이 "고루"다.

부족하면 고칠 점을 `pack-common.txt`(모든 샘플에 해당)나 틀에 반영하고, 고루는 같은 세션을 이어 고친다: `bash /Users/freelife/youtube/bts-samples/tools/run.sh goru PACKb <고칠 지시 파일> <세션 id>`(세션 id는 jsonl 첫 줄의 `session_id`). 지시문을 바꾸면 Task 3 Step 4를 다시 돌려 샘플별 파일을 다시 만든다. 바꾼 내용은 SDD 원장에 `Ruling:`으로 적는다.

---

### Task 5: 나머지 7개 팩

**Files:**
- Create (라운드): `/Users/freelife/youtube/bts-samples/packs/{ullim,studyday,afterglow,fitslot,jecheol,pacecrew,uptrail}/…`

- [ ] **Step 1: 첫 묶음 4개 (백그라운드)**

각각 `run_in_background: true`로:
```
bash /Users/freelife/youtube/bts-samples/tools/run.sh ullim PACK /Users/freelife/youtube/bts-samples/prompts/pack-ullim.txt
bash /Users/freelife/youtube/bts-samples/tools/run.sh studyday PACK /Users/freelife/youtube/bts-samples/prompts/pack-studyday.txt
bash /Users/freelife/youtube/bts-samples/tools/run.sh afterglow PACK /Users/freelife/youtube/bts-samples/prompts/pack-afterglow.txt
bash /Users/freelife/youtube/bts-samples/tools/run.sh fitslot PACK /Users/freelife/youtube/bts-samples/prompts/pack-fitslot.txt
```
사용량 한도에 걸려 멈추면(`.err`나 결과에 한도 문구) 풀린 뒤 같은 세션을 이어 돌린다.

- [ ] **Step 2: 둘째 묶음 3개 (첫 묶음이 끝난 뒤)**

```
bash /Users/freelife/youtube/bts-samples/tools/run.sh jecheol PACK /Users/freelife/youtube/bts-samples/prompts/pack-jecheol.txt
bash /Users/freelife/youtube/bts-samples/tools/run.sh pacecrew PACK /Users/freelife/youtube/bts-samples/prompts/pack-pacecrew.txt
bash /Users/freelife/youtube/bts-samples/tools/run.sh uptrail PACK /Users/freelife/youtube/bts-samples/prompts/pack-uptrail.txt
```

- [ ] **Step 3: 모두 검사**

```bash
for s in goru ullim studyday afterglow fitslot jecheol pacecrew uptrail; do printf "%s " $s; cat /Users/freelife/youtube/bts-samples/logs/$s-PACK.done 2>/dev/null | tr '\n' ' '; node /Users/freelife/youtube/bts-samples/tools/sample-pack-check.mjs /Users/freelife/youtube/bts-samples/packs/$s/pack /Users/freelife/youtube/bts-samples/packs/$s/$s-images.zip $s | tail -1; done
du -sh /Users/freelife/youtube/bts-samples/packs/*/*-images.zip
```
Expected: 8줄 모두 `exit=0 … PASS`. zip은 각각 100MB 아래(GitHub 릴리스 첨부 한도 2GB 안이지만 독자가 받는 크기). 실패한 샘플은 보고를 읽고 같은 세션을 이어 고친다.

- [ ] **Step 4: 보고 훑기**

샘플마다 보고의 "DESIGN.md에서 고친 값", "ref를 못 찾은 그림", "확신 없는 곳"을 모아 SDD 원장에 한 줄씩 적는다. AFTERGLOW는 다시 그린 그림이 있으면 그 파일을 Read로 열어 글자가 없는지 본다. 울림·제철상자·PACECREW는 `DESIGN.md` 색 값이 실제 사이트와 같은지 `index.css`와 한 번 더 대조한다.

---

### Task 6: 팩 글을 저장소로 옮기기

**Files:**
- Create: `tutorials/samples/pack/<샘플>/`(README.md, site.json, screens.md, DESIGN.md, images.json, prompts.json, CUSTOMIZE.md, SOURCES.md, data/*.json) × 8

- [ ] **Step 1: 복사와 다시 검사**

```bash
cd /Users/freelife/youtube/bts-starter-kit
for s in goru ullim studyday afterglow fitslot jecheol pacecrew uptrail; do
  mkdir -p tutorials/samples/pack/$s && rsync -a --delete /Users/freelife/youtube/bts-samples/packs/$s/pack/ tutorials/samples/pack/$s/
  printf "%s " $s; node /Users/freelife/youtube/bts-samples/tools/sample-pack-check.mjs /Users/freelife/youtube/bts-starter-kit/tutorials/samples/pack/$s /Users/freelife/youtube/bts-samples/packs/$s/$s-images.zip $s | tail -1
done
```
Expected: 8줄 모두 `PASS`. 이후 zip을 다시 만들면 이 Step을 다시 돌린다.

- [ ] **Step 2: 무게, 이름, 남은 것**

```bash
cd /Users/freelife/youtube/bts-starter-kit
find tutorials/samples/pack -type f \( -name '*.webp' -o -name '*.png' -o -name '*.zip' -o -name '.*' \) | head
du -sh tutorials/samples/pack
for s in goru ullim studyday afterglow fitslot jecheol pacecrew uptrail; do python3 -c "import json,sys;d=json.load(open('tutorials/samples/pack/$s/site.json'));print('$s',d['name'],d['original'])"; done
ls -a tutorials/samples | grep omc
```
Expected: 첫 find는 결과 없음, 합계 크기 수 MB 안팎, `original`은 고루·울림·하루공부·AFTERGLOW·핏슬롯·제철상자·PACECREW·Uptrail, `.omc` 없음.

---

### Task 7: 샘플 쪽과 다른 교재 글

**Files:**
- Modify: `tutorials/samples/{goru,ullim,studyday,afterglow,fitslot,jecheol,pacecrew,uptrail}.md`, `tutorials/samples/README.md`, `tutorials/reference/glossary.md`, `tutorials/reference/costs-and-keys.md`, `README.md`, `docs/superpowers/specs/2026-10-02-sample-tutorials-design.md`

**Interfaces:**
- Consumes: Task 6의 `tutorials/samples/pack/<샘플>/`(링크 대상)
- Produces: 샘플 쪽 절 `## 샘플과 똑같이 만들기`, `## 에셋 팩으로 나만의 서비스 만들기`, `## 이 컨셉으로 처음부터 만들기`, `## 시간과 비용`(요약은 A 단계 6.3절 "자료 팩으로" 열, 7절 "B 단계부터" 열). R21이 `tryTitle`로 첫 절을 읽는다.

- [ ] **Step 1: 생성 스크립트 확인**

`/private/tmp/claude-501/-Users-freelife-youtube-bts-starter-kit/530aaa4b-12f1-4247-9663-4b9d1d6ba1f9/scratchpad/plan/sample_pack_pages.py`가 있는지 본다(계획을 쓸 때 만들고 미리 돌려 본 스크립트. 저장소에는 넣지 않는다). 하는 일:
- "## 이 컨셉으로 만들어 보기"를 "## 이 컨셉으로 처음부터 만들기"로 바꾸고, 그 앞에 "## 샘플과 똑같이 만들기"(설계 5.1절 프롬프트, 팩·릴리스 링크, 에이전트 여는 법 문단으로 끝남)와 "## 에셋 팩으로 나만의 서비스 만들기"(설계 5.2절 프롬프트, 바꿀 것 예 세 줄, CUSTOMIZE와 이미지 그리기 링크)를 넣는다. 커스텀 예(폴더, 이름, 바꿀 것)는 샘플마다 다르다: 고루 `club-dues`·우리 동아리 회비, 울림 `storyvoice`·이야기 소리, 하루공부 `cert-day`·자격증 하루, AFTERGLOW `warmcore`·온기, 핏슬롯 `yogaslot`·요가슬롯, 제철상자 `sea-box`·제철바다, PACECREW `ridecrew`·RIDECREW, Uptrail `jobtrail`·Jobtrail.
- "같은 컨셉이라도 …" 줄을 "샘플과 같게 만들려면 [샘플과 똑같이 만들기](#샘플과-똑같이-만들기)를 쓰세요."로 바꾼다.
- "## 비슷하게 만들고 싶을 때" 절을 지운다.
- "## 시간과 비용" 절을 두 열 표("에셋 팩으로 똑같이", "처음부터(내 컨셉으로)")로 다시 쓰고, 기존 "만든 사람이 실제로 쓴 값" 접힘은 그대로 옮긴다. 커스텀 덧셈 한 줄(그림 장당 약 30초·약 1.7만 토큰, 주제 바꾸면 기획 5분·약 8.3만 토큰)을 표 아래에 둔다.

없으면 `docs/superpowers/plans/2026-10-05-sample-asset-packs.md`를 쓴 세션의 기록에서 복원하거나, 위 규칙과 설계 5·6절로 다시 쓴다.

- [ ] **Step 2: 미리 보기**

Run: `python3 /private/tmp/claude-501/-Users-freelife-youtube-bts-starter-kit/530aaa4b-12f1-4247-9663-4b9d1d6ba1f9/scratchpad/plan/sample_pack_pages.py`
Expected (A 단계 6.3절 두 열, 7절 B 단계 열과 같다):
```
goru 팩 1시간 25달러 140만/6,900만 가능 (5시간 한도 안) | 처음부터 1시간 30분 35달러 190만
ullim 팩 1시간 15분 30달러 170만/8,300만 가능 (5시간 한도 안) | 처음부터 2시간 10분 55달러 300만
studyday 팩 1시간 30분 35달러 190만/9,600만 가능 (5시간 한도에 약 1번 걸려요) | 처음부터 2시간 5분 50달러 280만
afterglow 팩 1시간 40분 40달러 220만/1.1억 가능 (5시간 한도에 약 1번 걸려요) | 처음부터 2시간 30분 60달러 330만
fitslot 팩 1시간 55분 45달러 250만/1.2억 가능 (5시간 한도에 약 1번 걸려요) | 처음부터 2시간 45분 65달러 360만
jecheol 팩 2시간 50달러 280만/1.4억 가능 (5시간 한도에 약 1번 걸려요) | 처음부터 2시간 55분 75달러 410만
pacecrew 팩 2시간 5분 50달러 280만/1.4억 가능 (5시간 한도에 약 1번 걸려요) | 처음부터 3시간 10분 80달러 440만
uptrail 팩 2시간 5분 50달러 280만/1.4억 가능 (5시간 한도에 약 1번 걸려요) | 처음부터 2시간 50분 65달러 360만
```

- [ ] **Step 3: 적용과 구조 검사**

```bash
cd /Users/freelife/youtube/bts-starter-kit && python3 /private/tmp/claude-501/-Users-freelife-youtube-bts-starter-kit/530aaa4b-12f1-4247-9663-4b9d1d6ba1f9/scratchpad/plan/sample_pack_pages.py --apply >/dev/null && python3 - <<'PY'
import re
bad=0
for s in ['goru','ullim','studyday','afterglow','fitslot','jecheol','pacecrew','uptrail']:
    t=open(f'tutorials/samples/{s}.md').read()
    heads=re.findall(r'^## (.+)$',t,re.M)
    want=['샘플과 똑같이 만들기','에셋 팩으로 나만의 서비스 만들기','이 컨셉으로 처음부터 만들기','시간과 비용','실제로 거친 과정','실제 서비스로 만들 때']
    if heads!=want: print(s,'절 순서',heads); bad+=1
    sec=t.split('## 샘플과 똑같이 만들기\n',1)[1].split('\n## ',1)[0].strip().split('\n\n')
    if sec[0].startswith('```') or not sec[1].startswith('```prompt') or 'README.md#' not in sec[-1]: print(s,'똑같이 절 모양'); bad+=1
    if '비슷하게 만들고' in t: print(s,'옛 절'); bad+=1
print('PASS' if not bad else f'FAIL {bad}')
PY
```
Expected: `PASS`

- [ ] **Step 4: 다른 교재 글**

```bash
cd /Users/freelife/youtube/bts-starter-kit && python3 - <<'PY'
import pathlib
def sub(p,a,b):
    f=pathlib.Path(p);s=f.read_text();assert s.count(a)==1,(p,a[:30]);f.write_text(s.replace(a,b))
sub('tutorials/samples/README.md','샘플 쪽에는 그 샘플의 컨셉 프롬프트, 실제로 거친 과정, 비슷하게 만들고 싶을 때의 자세한 요청, 실제 서비스로 만들 때 필요한 것을 모았어요.',
    '샘플 쪽에는 프롬프트 세 가지를 모았어요. 에셋 팩으로 샘플과 똑같이 만들기, 에셋 팩을 바탕으로 이름·색·페이지·주제를 바꿔 나만의 서비스 만들기, 팩 없이 그 컨셉으로 처음부터 만들기예요. 실제로 거친 과정과 실제 서비스로 만들 때 필요한 것도 함께 있어요.')
sub('tutorials/reference/glossary.md','| 에셋 팩 | Asset Pack. 원래 서비스를 미리 조사해 화면 구성, 기능 규칙, 예시 데이터, 디자인을 받을 주소를 묶어 둔 폴더. 에이전트는 이것만 보고 만들어요 |',
    '| 에셋 팩 | Asset Pack. 만들 서비스의 화면 구성, 디자인, 예시 데이터, 그림을 묶어 둔 폴더. 클론 튜토리얼과 샘플마다 있고, 에이전트는 이것만 보고 만들어요 |')
sub('tutorials/reference/costs-and-keys.md','bts-starter-kit은 화면 시안(완성 화면을 미리 그린 그림)과 사진, 일러스트를 AI로 그릴 수 있어요. 에이전트마다 준비할 것이 달라요.',
    'bts-starter-kit은 화면 시안(완성 화면을 미리 그린 그림)과 사진, 일러스트를 AI로 그릴 수 있어요. 에이전트마다 준비할 것이 달라요. 샘플을 에셋 팩으로 똑같이 만들면 그림을 그리지 않아서 준비할 것이 없어요.')
sub('docs/superpowers/specs/2026-10-02-sample-tutorials-design.md','- 비슷하게 만들고 싶을 때의 자세한 요청(②의 3번 형식)\n',
    '- (2026-10-05 B 단계에서 바꿈) 프롬프트 셋: 샘플과 똑같이 만들기(에셋 팩, 이름 칸), 에셋 팩으로 나만의 서비스 만들기(이름·바꿀 것 칸), 이 컨셉으로 처음부터 만들기(위 컨셉 프롬프트). "비슷하게 만들고 싶을 때"는 지웠다. 설계는 [샘플 에셋 팩](2026-10-05-sample-asset-packs-design.md) 5절\n')
print('ok')
PY
grep -n "에셋 팩(화면 구성, 기능 규칙, 예시 데이터, 그림)으로 만듭니다" README.md
```
Expected: `ok`, README 한 줄(940행 근처). 그 줄 바로 아래(같은 목록)에 한 줄을 더한다:

```
- [샘플로 만들어 보기](tutorials/samples/README.md): 샘플 8개마다 에셋 팩이 있어, AI 그림을 새로 그리지 않고 샘플과 똑같이 만들거나 이름·색·페이지·주제를 바꿔 나만의 서비스를 만듭니다.
```

목록에 이미 샘플 줄이 있으면 새 줄 대신 그 줄 끝에 "샘플마다 에셋 팩이 있어 똑같이 만들거나 바꿔 만들 수 있습니다."를 붙인다.

---

### Task 8: 교재 검사, korean-skills 검수, 리뷰, 커밋

**Files:**
- Test only(Task 6~7 파일), 고친 뒤 커밋

- [ ] **Step 1: 링크·프롬프트 검사기**

```bash
for d in tutorials tutorials/samples tutorials/01-nextflix tutorials/reference tutorials/start; do
node -e '
const fs=require("fs"),path=require("path");const d=process.argv[1];let bad=0;
for(const f of fs.readdirSync(d).filter(f=>f.endsWith(".md"))){const s=fs.readFileSync(path.join(d,f),"utf8");
 for(const m of s.matchAll(/```prompt[^\n]*\n([\s\S]*?)```/g)){const b=m[1];
  if(/#[0-9a-fA-F]{3,8}\b|\d+\s?(px|ms)\b|\d+(\.\d+)?초/.test(b)){console.log("값:",f,b.split("\n")[0]);bad++}
  if(b.trim().split("\n").length>10){console.log("10줄 넘음:",f);bad++}}
 for(const m of s.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)){const h=m[1];if(/^https?:/.test(h))continue;
  if(!fs.existsSync(path.resolve(d,h))){console.log("링크:",f,h);bad++}}}
console.log(d, bad?`FAIL ${bad}`:"PASS");process.exit(bad?1:0)' /Users/freelife/youtube/bts-starter-kit/$d; done
grep -rho "samples/[a-z]*\.md#[^)]*\|(#[^)]*)" /Users/freelife/youtube/bts-starter-kit/tutorials/samples/goru.md | sort -u
```
Expected: 다섯 줄 모두 `PASS`. 쪽 안 앵커는 `#샘플과-똑같이-만들기`, `#이-컨셉으로-처음부터-만들기`이고 절 제목과 맞는다.

- [ ] **Step 2: 숫자와 구조 대조**

```bash
cd /Users/freelife/youtube/bts-starter-kit && python3 - <<'PY'
exp={'goru':('약 1시간','약 140만','5시간 한도 안'),'ullim':('약 1시간 15분','약 170만','5시간 한도 안'),
 'studyday':('약 1시간 30분','약 190만','약 1번'),'afterglow':('약 1시간 40분','약 220만','약 1번'),
 'fitslot':('약 1시간 55분','약 250만','약 1번'),'jecheol':('약 2시간','약 280만','약 1번'),
 'pacecrew':('약 2시간 5분','약 280만','약 1번'),'uptrail':('약 2시간 5분','약 280만','약 1번')}
bad=0
for k,(t,tok,w) in exp.items():
    s=open(f'tutorials/samples/{k}.md').read()
    if f'최소 **{t}, {tok} 토큰**' not in s or w not in s.split('Claude Pro · ChatGPT Plus(Codex):',1)[1].split('\n',1)[0]: print('불일치',k); bad+=1
print('PASS' if not bad else f'FAIL {bad}')
PY
grep -n "^| 샘플 | 컨셉 | 페이지 |$" tutorials/samples/README.md
grep -rn -A1 "^<details>$" tutorials --include=*.md | grep -v "/pack/" | grep -v "<details>$\|<summary>[^<]*</summary>$\|^--$"
```
Expected: `PASS`, 표 머리 한 줄, 마지막 grep 결과 없음

- [ ] **Step 3: korean-skills 검수**

새 교재 글(샘플 쪽의 새 두 절과 시간과 비용 문장, Task 7 Step 4의 문장)과 팩 글(고루 `README.md`, `CUSTOMIZE.md`, `screens.md` 1절. 틀에서 온 문장은 8개 공통이라 고루에서 고친 것을 틀과 나머지 7개에 같이 반영한다)을 scratchpad의 한 파일로 모아 `humanizer` → `style-guide` → `grammar-checker` 순서로 Skill 도구로 불러 검수하고, 지적을 원본에서 바로 고친다. 숫자, 링크, 앵커, 코드 식별자, 프롬프트 블록은 바꾸지 않는다. 팩 글을 고쳤으면 Task 6 Step 1 검사를 다시 돌린다(글만 바뀌어 zip은 그대로다). 이어서 Step 1~2를 다시 돌려 통과를 본다.

- [ ] **Step 4: 리뷰어 검토**

`git diff` 전체와 새 파일 목록을 파일로 저장해(`git add -N tutorials/samples/pack && git diff > <scratchpad>/b-docs.diff`) 리뷰 에이전트(oh-my-claudecode:code-reviewer, model opus)에 설계 문서와 이 계획의 Global Constraints, Review Focus와 함께 넘긴다. 특히 고루 팩만 보고 처음 보는 에이전트가 같은 화면을 만들 수 있는지 판단을 받는다. Important 지적은 고치고 Step 1~2를 다시 돌린다.

- [ ] **Step 5: 커밋**

```bash
cd /Users/freelife/youtube/bts-starter-kit && set -a; . /Users/freelife/youtube/.envrc; set +a
git add tutorials README.md docs/superpowers/specs/2026-10-02-sample-tutorials-design.md
git commit -m "feat: 샘플 8개 에셋 팩과 똑같이 만들기·나만의 서비스 프롬프트" -m "- 샘플마다 에셋 팩(화면 구성, DESIGN.md, 예시 데이터, 그림 프롬프트, 바꾸기 안내). 그림과 스크린샷은 팩 릴리스 pack-<샘플>-1
- 샘플 쪽 프롬프트를 똑같이 만들기, 에셋 팩으로 나만의 서비스, 처음부터 만들기 셋으로 정리
- 시간과 비용을 에셋 팩으로 똑같이 만들 때 값으로 바꾸고 처음부터 만들 때 값과 나란히 둠

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git status --short
```
Expected: `?? .claude/settings.json`만 남는다.

---

### Task 9: 사이트 라운드 R21

**Files:**
- Create: `/Users/freelife/youtube/bts-samples/prompts/portfolio-R21.txt`
- Modify (라운드가): `../bts-samples/ws/portfolio/apps/web/src/lib/tutorials.ts`, `lib/samples.ts`, `lib/tutorials.check.mjs`, 샘플 상세 창 컴포넌트, 동기화된 교재 사본

**Interfaces:**
- Consumes: Task 8에서 커밋한 교재(동기화 원본)

- [ ] **Step 1: 라운드 지시 쓰기**

`/Users/freelife/youtube/bts-samples/prompts/portfolio-R21.txt`:

```
에셋 팩 B 단계: 튜토리얼 원본의 샘플 쪽 8개가 바뀌었다. 설계: /Users/freelife/youtube/bts-starter-kit/docs/superpowers/specs/2026-10-05-sample-asset-packs-design.md 5·6·8절. 사이트 틀과 디자인(색, 서체, 카드 모양, 섹션 순서)은 바꾸지 않는다(좁은 개선, 시안 없음).
1. pnpm tutorials:sync, tutorials:check 통과. 동기화 뒤 apps/web/public/images/tutorials/**/*.webp.json에서 createdAt만 바뀐 파일은 git checkout으로 되돌린다.
2. lib/tutorials.ts의 tryTitle을 '샘플과 똑같이 만들기'로 바꾼다. 샘플 상세 '튜토리얼로 만들기' 창이 그 절의 첫 문단, 프롬프트, 마지막 문단을 보여 준다. 창 안에 나머지 두 방식('에셋 팩으로 나만의 서비스 만들기', '이 컨셉으로 처음부터 만들기')으로 가는 링크 두 개를 샘플 쪽 #절 주소로 더한다(창에 이미 있는 링크 모양). 창 제목과 설명에 '컨셉으로 만들기' 뜻이 남으면 '샘플과 똑같이'에 맞춘다.
3. lib/samples.ts 샘플 8개 값을 '에셋 팩으로' 값으로 바꾼다(A 단계 설계 2026-10-05-tutorial-prompts-home-and-cost-design.md 6.3절 '자료 팩으로' 열, 7절 'B 단계부터' 열, 표시는 5.2절): 고루 약 1시간·약 140만(캐시 포함 6,900만)·5시간 한도 안, 울림 1시간 15분·170만(8,300만)·한도 안, 하루공부 1시간 30분·190만(9,600만)·약 1번, AFTERGLOW 1시간 40분·220만(1.1억)·약 1번, 핏슬롯 1시간 55분·250만(1.2억)·약 1번, 제철상자 2시간·280만(1.4억)·약 1번, PACECREW 2시간 5분·280만(1.4억)·약 1번, Uptrail 2시간 5분·280만(1.4억)·약 1번. 홈 요약 줄, 카드 아랫줄, /work/<샘플> 사실 목록, 구독 표시가 이 값만 쓴다. 홈 요약 줄의 범위와 구독 표시는 이 값에서 다시 계산한다. 사실 목록과 주석이 '내 컨셉으로'를 말하면 '에셋 팩으로 똑같이'로 고친다.
4. 홈 '컨셉으로 화면 만들기' 설명과 튜토리얼 첫 쪽 '내 컨셉으로 만들기' 카드 주변 문구가 세 방식(똑같이, 나만의 서비스, 처음부터)과 어긋나는지만 보고, 어긋난 말만 고친다.
5. 샘플 쪽의 pack/<샘플>/ 와 pack/<샘플>/CUSTOMIZE.md 링크가 https://github.com/roadkwonai/bts-starter-kit/tree/main/tutorials/samples/pack/<샘플> 과 …/blob/main/tutorials/samples/pack/<샘플>/CUSTOMIZE.md 로 열리는지 tutorials.check.mjs에 검사 한 줄을 더한다. 팩 릴리스 링크(…/releases/tag/pack-<샘플>-1)는 바깥 링크다. 공개 전이라 404가 정상이고 site-check에서 따로 센다.
6. 빌드, 내보내기(tools/publish-root.sh), 링크·버튼 전수(site-check), axe, 폭(1440·768·390), 콘솔. 스크린샷을 tasks/evidence/R21에 둔다: /tutorials/samples/goru/(세 절과 펼친 '단계별 예상'), /work/goru/(사실 목록, 연 '튜토리얼로 만들기' 창), 홈 카드 줄. 1440과 390.
[confirm] 행은 비워 두고 커밋하지 않는다. 보고는 짧게: 바뀐 파일 수, 검사 결과, 스크린샷 경로, 위 3번 값과 다른 숫자가 있으면 그 목록.
```

- [ ] **Step 2: 라운드 실행 (백그라운드)**

Run (`run_in_background: true`): `bash /Users/freelife/youtube/bts-samples/tools/run.sh portfolio R21 /Users/freelife/youtube/bts-samples/prompts/portfolio-R21.txt`
끝나면: `cat /Users/freelife/youtube/bts-samples/logs/portfolio-R21.done`
Expected: `exit=0 wall=…s`. 세션이 백그라운드 명령을 기다리다 끝났으면 같은 세션을 "포그라운드에서 끝까지" 지시로 이어 돌린다(R20b 선례).

- [ ] **Step 3: 보고 읽기와 직접 확인**

```bash
tail -1 /Users/freelife/youtube/bts-samples/logs/portfolio-R21.jsonl | python3 -c 'import sys,json;d=json.loads(sys.stdin.read());print(d.get("total_cost_usd"));print(d.get("result","")[:3000])'
git -C /Users/freelife/youtube/bts-samples/ws/portfolio status --short | head -40
```
`tasks/evidence/R21` 스크린샷을 Read로 열어 본다. 기준: 샘플 쪽에 세 절과 두 열 표, 상세 창에 똑같이 만들기 프롬프트와 두 링크, 카드와 사실 목록이 "에셋 팩으로" 값, 390 가로 넘침 없음. 내보낸 HTML에서 팩 링크를 확인한다: `grep -o 'tree/main/tutorials/samples/pack/goru"' /Users/freelife/youtube/bts-samples/pages/bts-starter-kit/tutorials/samples/goru/index.html | head -1`.

- [ ] **Step 4: 작업공간 커밋**

[confirm] 행은 Task 10에서 채운다. 여기서는 라운드 결과만 커밋한다.

```bash
cd /Users/freelife/youtube/bts-samples/ws/portfolio && set -a; . /Users/freelife/youtube/.envrc; set +a
git add -A && git commit -m "feat: R21 샘플 에셋 팩 반영, 똑같이 만들기 창과 에셋 팩으로 값" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 공개 (사용자 확인 뒤)

**Files:**
- Create (스크립트가): `release/<YYYYMMDD-HHmm>-<제목>.md`

- [ ] **Step 1: 사용자 확인**

R21 스크린샷 경로, 팩 8개 요약(파일 수, zip 크기), 바뀐 샘플 쪽을 보고하고 공개해도 되는지 글로 묻는다. 승인 전에는 아래 Step을 하지 않는다. 승인을 받으면 작업공간 `tasks/todo.md`의 R21 [confirm] 행을 채우고 커밋한다.

- [ ] **Step 2: 릴리스 노트, 검수, 발행**

```bash
cd /Users/freelife/youtube/bts-starter-kit && node scripts/release.mjs --title "Tutorial prompts, ProKit and sample asset packs"
```
노트 파일을 `humanizer` → `style-guide` → `grammar-checker` 순서로 검수해 파일에서 바로 고친다. 첫 줄, 커밋 해시, 링크, 코드 식별자, 뜻은 바꾸지 않는다. 이어서:
```bash
cd /Users/freelife/youtube/bts-starter-kit && set -a; . /Users/freelife/youtube/.envrc; set +a
node scripts/release.mjs --publish release/<위에서 출력한 파일 이름>
```
Expected: `chore(release): v0.11.0` 커밋(`feat:` 커밋이 있어 minor), 태그, `main` push, GitHub Release

- [ ] **Step 3: 팩 릴리스 8개와 해시 확인**

```bash
cd /Users/freelife/youtube/bts-starter-kit && set -a; . /Users/freelife/youtube/.envrc; set +a
for s in goru ullim studyday afterglow fitslot jecheol pacecrew uptrail; do
  gh release view pack-$s-1 >/dev/null 2>&1 && { echo "이미 있음 pack-$s-1, 덮어쓰지 않음"; continue; }
  gh release create pack-$s-1 /Users/freelife/youtube/bts-samples/packs/$s/$s-images.zip --target main --latest=false \
    --title "$s 에셋 팩 그림 1" --notes "샘플 $s의 AI 그림, 다시 그릴 때 쓰는 스타일 기준 그림, 페이지별 스크린샷(1440·390). 목록과 sha256은 tutorials/samples/pack/$s/images.json"
done
for s in goru ullim studyday afterglow fitslot jecheol pacecrew uptrail; do
  u=$(python3 -c "import json;print(json.load(open('tutorials/samples/pack/$s/images.json'))['url'])")
  want=$(python3 -c "import json;print(json.load(open('tutorials/samples/pack/$s/images.json'))['sha256'])")
  got=$(curl -sL "$u" | shasum -a 256 | cut -d' ' -f1); [ "$got" = "$want" ] && echo "$s OK" || echo "$s 다름"
done
```
Expected: 8줄 모두 `OK`

- [ ] **Step 4: gh-pages 공개**

```bash
cd /Users/freelife/youtube/bts-samples && bash tools/publish-root.sh
cd /Users/freelife/youtube/bts-samples/pages/bts-starter-kit && set -a; . /Users/freelife/youtube/.envrc; set +a
git add -A && git commit -m "portfolio R19~R21: 프로킷 이름과 상단부, 시간과 비용, 샘플 에셋 팩" && git push origin gh-pages
```
Expected: push 성공

- [ ] **Step 5: 공개 주소 확인 (1~2분 뒤)**

```bash
for u in "" og.png work/goru/ tutorials/ tutorials/samples/goru/ tutorials/nextflix/; do
  printf "%s " "$u"; curl -s -o /tmp/p.out -w "%{http_code}\n" "https://roadkwonai.github.io/bts-starter-kit/$u"; done
curl -s https://roadkwonai.github.io/bts-starter-kit/tutorials/samples/goru/ | grep -c "샘플과 똑같이 만들기\|프로킷"
curl -s -o /dev/null -w "%{http_code}\n" https://github.com/roadkwonai/bts-starter-kit/tree/main/tutorials/samples/pack/goru
```
Expected: 모두 `200`, grep 수 1 이상. 사용자에게 릴리스 주소, 팩 릴리스 8개, 공개 주소, 검수에서 고친 내용을 보고한다.

---

## Self-Review

- 설계 2절(그림 사정)은 Task 3 Step 4(AFTERGLOW 지시)와 Task 5 Step 4가, 3절(팩 구성)은 Task 2~6이, 4절(CUSTOMIZE 표)은 Task 3 Step 2와 Task 2 검사(행 이름)가 맡는다.
- 5절(샘플 쪽 셋)과 6절(시간과 비용)은 Task 7이, 7절(다른 교재 글)은 Task 7 Step 4가, 8절(사이트)은 Task 9가 맡는다.
- 9절(만드는 방법)은 Task 2~6, 10절(검증)은 Task 5 Step 3, Task 6, Task 8, Task 9가, 11절(공개 순서)은 Task 10이 맡는다.
- 12절(하지 않는 것): 시범 실행, 템플릿 수정, 샘플 화면 수정, 완성 HTML, Nextflix 팩 수정은 어느 Task에도 없다. AFTERGLOW 다시 그리기는 zip에만 들어가고 샘플 앱은 바꾸지 않는다.
- 버전: A 단계(`docs:`)와 이 계획의 `feat:` 커밋이 함께 나가므로 `v0.11.0`이다. 설계 11절은 "다음 버전"으로 적었다.
