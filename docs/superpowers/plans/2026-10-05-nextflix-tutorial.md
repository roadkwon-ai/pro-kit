# Nextflix 튜토리얼 실행 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 넷플릭스를 본뜬 튜토리얼 1번(Nextflix)의 자료 팩, 교재 첫 쪽과 12장, 팩만으로 만든 샘플 사이트, 사이트 반영까지 만든다.

**Architecture:** 리서치(`../bts-samples/research/nextflix/`)를 저장소의 자료 팩(`tutorials/01-nextflix/pack/`)으로 묶고, 그림은 팩 릴리스 zip으로 뺀다. 교재 프롬프트는 값 없이 팩을 가리킨다. 샘플은 교재 2~4장 프롬프트를 그대로 헤드리스 라운드에 넣어 팩만으로 만들고, 그 과정에서 팩의 빈 곳을 고친다. 마지막에 포트폴리오 사이트가 여러 권을 싣게 넓혀 공개한다.

**Tech Stack:** Node 24(검사·생성 스크립트, 의존성 없음 또는 `../bts-samples/tools/node_modules`의 `playwright-core`), `impeccable generate-image`(기본 모델 gpt-image-2.5-flare)와 `cwebp`, Next.js 16 BTS 프로젝트(샘플), `gh` CLI(릴리스).

**Spec:** [Nextflix 튜토리얼 설계](../specs/2026-10-05-nextflix-tutorial-design.md), 상위 [튜토리얼 교재 설계](../specs/2026-10-01-bts-starter-kit-tutorials-design.md)

## Global Constraints

- 넷플릭스 로고, 브랜드 빨강 `#E50914`, Netflix Sans, 작품 이미지·문구를 저장소, 팩, 샘플 어디에도 쓰지 않는다. 강조색은 `#D6203B`(호버 `#B61B32`, 눌림 `#8F1528`), 서체는 Pretendard, 로고는 서비스 이름 글자다.
- 안내 문구는 정확히 "넷플릭스와 관계없는 연습용 서비스예요. 데이터는 모두 예시예요."다.
- 교재 프롬프트에 색, 크기, 시간 같은 값을 넣지 않고 자료 팩을 가리킨다. 바꿀 곳은 `[nextflix]`(폴더), `[Nextflix]`(서비스 이름) 괄호로 표시한다. 한 블록은 10줄 이내.
- Refero 원문과 넷플릭스 스크린샷은 저장소, 팩, 사이트에 넣지 않는다. `../bts-samples/research/nextflix/`에만 둔다.
- 그림 묶음은 `main`에 넣지 않는다. GitHub Release `pack-nextflix-1`의 `nextflix-images.zip`, `--latest=false`.
- `OPENAI_API_KEY`는 그 명령의 환경변수로만 쓰고 출력이나 파일에 남기지 않는다. 키는 `/Users/freelife/youtube/bts-starter-kit/.env`에 있다.
- git과 gh 명령 앞에는 `set -a; . /Users/freelife/youtube/.envrc; set +a`를 붙인다(roadkwonai). 다른 계정은 쓰지 않는다. 토큰 값은 출력하지 않는다.
- 저장소 커밋, push, 릴리스는 사용자가 요청할 때만 한다. `main` push는 `node scripts/release.mjs` 절차로만 한다. 이 계획의 커밋 단계는 요청을 받은 뒤에 실행한다.
- 셸 작업 디렉터리를 `templates/` 안에 두지 않는다. 저장소 밖 작업은 절대 경로로 한다.
- 교재 문체는 해요체, 문장은 짧게, 한 문단 세 문장 이내(상위 설계 5.4절). 끝에 korean-skills 세 스킬(humanizer → style-guide → grammar-checker)을 거친다.
- 샘플은 정적 내보내기라 Next.js intercepting routes를 쓰지 않는다. 상세 창은 쿼리 `t`와 클라이언트 컴포넌트다.
- 교재는 끝까지 실행해 확인하지 않는다. 첫 쪽 "만든 기록"에 이 확인 범위를 밝힌다.

## Review Focus

1. 이름 바꾸기: 독자가 서비스 이름을 바꾸면 화면, 제목, 메타 정보 어디에도 "Nextflix"가 남지 않아야 한다. 이름이 한 값에서만 나와야 한다(Task 13 Step 6).
2. 없는 작품 주소: `?t=없는-slug`나 `/title/없는-slug/`로 들어오면 창이 뜨지 않거나 404 쪽이 나오고, 페이지 오류가 없어야 한다(Task 13 probe 5번).
3. 키보드만 쓰는 사람: 카드에서 Enter로 상세 창을 열고, Esc로 닫으면 초점이 그 카드로 돌아와야 한다. 초점만으로 hover 창이 열리면 안 된다(Task 13 probe 6번).
4. 한글 검색: 한글 두 글자로 입력하면 주소의 `q`가 바뀌고 결과가 나와야 한다. 결과가 없으면 빈 상태 안내가 보여야 한다(Task 13 probe 7번).
5. 영상을 못 받을 때: 영상 주소가 막히면 빈 화면이나 끝없는 로딩이 아니라 `role="alert"` 안내가 보여야 한다(Task 13 probe 8번).

---

## 파일 구조

저장소(`/Users/freelife/youtube/bts-starter-kit`):

| 경로 | 할 일 |
|---|---|
| `tutorials/01-nextflix/README.md` | 첫 쪽 |
| `tutorials/01-nextflix/01-create-project.md` … `12-deploy.md` | 장 12개 |
| `tutorials/01-nextflix/assets/` | 샘플 스크린샷, 고른 시안, 도식(webp, 도식은 svg 원본도) |
| `tutorials/01-nextflix/pack/design-notes.md`, `screens.md`, `features.md`, `SOURCES.md`, `images.json` | 자료 팩 문서 |
| `tutorials/01-nextflix/pack/data/site.json`, `titles.json`, `rows.json`, `videos.json` | 예시 데이터 |
| `tutorials/01-nextflix/pack/wireframes/*.svg` | 배치도 8장 |
| `tutorials/reference/glossary.md` | 새 용어 |
| `tutorials/README.md`, 루트 `README.md`, 루트 `AGENTS.md` | 공개할 때(Task 17) |
| `docs/superpowers/plans/2026-10-01-tutorials-roadmap.md` | 진행표 1번 상태 |

작업공간(`/Users/freelife/youtube/bts-samples`, 저장소 밖):

| 경로 | 할 일 |
|---|---|
| `tools/pack-check.mjs` | 팩 구성·데이터 검사(새로 만듦) |
| `tools/pack-videos.mjs` | Blender 영상 주소 풀기(새로 만듦) |
| `tools/pack-images.mjs` | 그림 생성과 자르기(새로 만듦) |
| `tools/nextflix-probe.mjs` | 샘플 상호작용 검사(새로 만듦) |
| `tools/run.sh`, `tools/publish.sh`, `tools/publish-root.sh` | `tutorials/<이름>` 경로, 키 경로, KEEP 목록 고침 |
| `tutorials/nextflix/` | 샘플 프로젝트(`base` 복사본) |
| `research/nextflix/pack-images/` | 그림 원본(`src/`), 결과(`out/`), `nextflix-images.zip` |
| `research/nextflix/names-check.md`, `design-check/` | 이름 겹침 확인 기록, DESIGN.md 받아 고친 확인본 |
| `prompts/nextflix-R1.txt` … , `prompts/portfolio-R17.txt` | 라운드 프롬프트 |

---

### Task 1: 작업공간 도구 고치기와 샘플 프로젝트 준비

**Files:**
- Modify: `/Users/freelife/youtube/bts-samples/tools/run.sh`(4·6행), `tools/publish.sh`(5·6행), `tools/publish-root.sh`(8행)
- Create: `/Users/freelife/youtube/bts-samples/tutorials/nextflix/`(base 복사본)

**Interfaces:**
- Produces: `run.sh nextflix <step> <prompt>`와 `publish.sh nextflix`가 `tutorials/nextflix`를 찾는다. 라운드 세션에 `OPENAI_API_KEY`가 들어간다.

- [ ] **Step 1: 지금 상태가 깨져 있는지 확인한다**

Run: `ls /Users/freelife/youtube/bts-template/.env; grep -n 'bts-template' /Users/freelife/youtube/bts-samples/tools/run.sh /Users/freelife/youtube/bts-samples/ws/portfolio/scripts/sync-tutorials.mjs`
Expected: `.env` 없음 오류, 두 파일에 `bts-template` 경로가 보인다(저장소를 옮긴 뒤 남은 옛 경로).

- [ ] **Step 2: `run.sh`를 고친다**

4행 `W=$R/ws/$N; LOG=$R/logs/$N-$STEP`를 아래로 바꾼다.

```bash
W=$R/ws/$N; [ -d "$W" ] || W=$R/tutorials/$N; LOG=$R/logs/$N-$STEP
```

6행의 키 경로 `/Users/freelife/youtube/bts-template/.env`를 `/Users/freelife/youtube/bts-starter-kit/.env`로 바꾼다.

- [ ] **Step 3: `publish.sh`와 `publish-root.sh`를 고친다**

`publish.sh` 5행 아래(`mkdir` 다음)에 `W=$R/ws/$N; [ -d "$W" ] || W=$R/tutorials/$N`를 넣고, 6행의 `$R/ws/$N`을 `$W`로 바꾼다. `publish-root.sh` 8행 KEEP 목록의 `evenly` 뒤에 ` nextflix`를 넣는다.

- [ ] **Step 4: 고친 것을 확인한다**

Run: `bash -n /Users/freelife/youtube/bts-samples/tools/run.sh && bash -n /Users/freelife/youtube/bts-samples/tools/publish.sh && bash -n /Users/freelife/youtube/bts-samples/tools/publish-root.sh && grep -c '^OPENAI_API_KEY=.\+' /Users/freelife/youtube/bts-starter-kit/.env && grep -c ' nextflix ' /Users/freelife/youtube/bts-samples/tools/publish-root.sh`
Expected: 오류 없이 `1`, `1`(키 값은 출력하지 않는다)

- [ ] **Step 5: 샘플 프로젝트를 base에서 복사하고 템플릿 최신 스킬을 맞춘다**

```bash
cp -Rc /Users/freelife/youtube/bts-samples/base /Users/freelife/youtube/bts-samples/tutorials/nextflix
bash /Users/freelife/youtube/bts-starter-kit/templates/bts-next-neon/install.sh /Users/freelife/youtube/bts-samples/tutorials/nextflix --diff > /Users/freelife/youtube/bts-samples/logs/nextflix-diff.txt
grep -E '^(---|\+\+\+|복사|더할)' /Users/freelife/youtube/bts-samples/logs/nextflix-diff.txt | head -40
```

diff에 나온 `.agents/skills/bts-*` 파일(2026-10-05 카탈로그 보완 등)은 템플릿 `files/`의 것으로 복사한다. 샘플이 스스로 고친 내용은 없으므로 템플릿 쪽이 정본이다.

- [ ] **Step 6: 샘플 프로젝트가 정상인지 본다**

Run: `pnpm --dir /Users/freelife/youtube/bts-samples/tutorials/nextflix skills:check && pnpm --dir /Users/freelife/youtube/bts-samples/tutorials/nextflix agents:check && pnpm --dir /Users/freelife/youtube/bts-samples/tutorials/nextflix check-types`
Expected: 셋 다 exit 0. `git -C /Users/freelife/youtube/bts-samples/tutorials/nextflix status --short`에 Step 5의 스킬 파일만 보이면 `chore: 템플릿 최신 bts 스킬 반영`으로 그 프로젝트에 커밋한다(작업공간 프로젝트라 저장소 커밋 규칙 밖).

---

### Task 2: 팩 검사 도구

**Files:**
- Create: `/Users/freelife/youtube/bts-samples/tools/pack-check.mjs`
- Create(빈 폴더): `/Users/freelife/youtube/bts-starter-kit/tutorials/01-nextflix/pack/`

**Interfaces:**
- Consumes: Task 3~8이 만들 팩 파일. 데이터 모양은 Task 4의 스키마다.
- Produces: `node pack-check.mjs <pack-dir>`. 문제가 있으면 한 줄에 하나씩 쓰고 exit 1, 없으면 `PASS`와 개수 요약을 쓰고 exit 0.

- [ ] **Step 1: 검사 도구를 쓴다**

```js
// usage: node pack-check.mjs <pack-dir> — Nextflix 자료 팩의 구성과 데이터 규칙을 검사한다. 문제가 있으면 exit 1
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(process.argv[2] ?? ".");
const fails = [];
const need = (ok, msg) => {
	if (!ok) fails.push(msg);
};
const read = (f) => fs.readFileSync(path.join(dir, f), "utf8");
const json = (f) => JSON.parse(read(f));
function finish() {
	if (fails.length) {
		console.log(fails.join("\n"));
		console.log(`FAIL ${fails.length}`);
		process.exit(1);
	}
}

const DOCS = ["design-notes.md", "screens.md", "features.md", "SOURCES.md", "images.json"];
const DATA = ["site.json", "titles.json", "rows.json", "videos.json"].map((f) => `data/${f}`);
const WIREFRAMES = ["home-1440", "home-390", "hover-card", "detail-modal", "profiles", "watch", "landing", "signup"].map(
	(n) => `wireframes/${n}.svg`,
);
for (const f of [...DOCS, ...DATA, ...WIREFRAMES]) need(fs.existsSync(path.join(dir, f)), `없음: ${f}`);
finish();

const site = json("data/site.json");
const titles = json("data/titles.json");
const rows = json("data/rows.json");
const videos = json("data/videos.json");
const images = json("images.json");

// site.json
need(typeof site.name === "string" && site.name.length > 0, "site.name이 비었다");
need(site.notice === "넷플릭스와 관계없는 연습용 서비스예요. 데이터는 모두 예시예요.", "site.notice가 안내 문구와 다르다");
need(JSON.stringify(site.plans?.map((p) => p.priceKrw)) === "[7000,13500,17000]", "요금제 가격이 7000·13500·17000이 아니다");
need(site.profiles?.length === 4, "예시 프로필은 4개");
need(site.profiles?.filter((p) => p.main).length === 1, "메인 프로필은 하나");
need(site.avatars?.length === 8, "아바타는 8개");
const avatarIds = new Set(site.avatars?.map((a) => a.id));
for (const a of site.avatars ?? []) need(a.image === `${a.id}.webp` && a.color && a.prompt, `아바타 ${a.id}: image·color·prompt`);
for (const p of site.profiles ?? []) need(avatarIds.has(p.avatar), `프로필 ${p.name}: 없는 아바타 ${p.avatar}`);

// videos.json
const videoIds = new Set(videos.map((v) => v.id));
need(videos.length === 10 && videoIds.size === 10, "영상은 서로 다른 10편");
for (const v of videos) {
	need(v.url?.startsWith("https://video.blender.org/") && v.url.endsWith(".mp4"), `영상 ${v.id}: url`);
	need(v.apiUrl?.startsWith("https://video.blender.org/api/v1/videos/"), `영상 ${v.id}: apiUrl`);
	need(v.durationSec > 0 && v.license && v.licenseUrl && v.attribution, `영상 ${v.id}: 길이·라이선스·표기`);
}

// titles.json
const AGES = new Set([0, 7, 12, 15, 19]);
const slugs = new Map();
let episodeCount = 0;
for (const t of titles) {
	const at = `작품 ${t.slug}`;
	need(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.slug ?? ""), `${at}: slug 형식`);
	need(!slugs.has(t.slug), `${at}: slug 중복`);
	slugs.set(t.slug, t);
	need(t.kind === "series" || t.kind === "movie", `${at}: kind`);
	need(AGES.has(t.minAge), `${at}: minAge`);
	need(t.name && t.synopsis && t.releaseYear, `${at}: 이름·줄거리·연도`);
	need(t.cast?.length >= 3 && t.cast.length <= 4, `${at}: 출연 3~4명`);
	need(t.genres?.length >= 2 && t.genres.length <= 3, `${at}: 장르 2~3개`);
	need(t.moods?.length >= 1 && t.moods.length <= 2, `${at}: 분위기 1~2개`);
	need(t.images?.card === `${t.slug}-card.webp` && t.images?.poster === `${t.slug}-poster.webp`, `${at}: 카드·포스터 이름`);
	need(t.featured ? t.images?.billboard === `${t.slug}-billboard.webp` : !t.images?.billboard, `${at}: 빌보드는 대표 작품만`);
	let eps = [];
	if (t.kind === "movie") {
		eps = t.episodes ?? [];
		need(eps.length === 1 && !t.seasons, `${at}: 영화는 회차 1개, 시즌 없음`);
	} else {
		need(t.seasons?.length >= 1 && t.seasons.length <= 2 && !t.episodes, `${at}: 시즌 1~2개`);
		for (const s of t.seasons ?? []) {
			need(s.episodes?.length >= 3 && s.episodes.length <= 6, `${at}: 시즌 ${s.number} 회차 3~6개`);
			eps.push(...(s.episodes ?? []));
		}
	}
	for (const e of eps) need(videoIds.has(e.videoId) && e.name, `${at}: 회차 ${e.number} 이름·영상`);
	episodeCount += eps.length;
}
need(titles.length === 48, `작품 ${titles.length}개 (48개여야 함)`);
need(titles.filter((t) => t.kind === "series").length === 28, "시리즈 28개");
const featured = titles.filter((t) => t.featured);
need(featured.length === 8 && featured.some((t) => t.kind === "movie") && featured.some((t) => t.kind === "series"), "대표 작품 8개(영화·시리즈 모두 포함)");

// rows.json
function checkRows(where, list, only) {
	for (const r of list ?? []) {
		const at = `${where}/${r.id}`;
		need(r.name && ["continue", "my-list", "liked", "top10", "standard"].includes(r.kind), `${at}: name·kind`);
		need(new Set(r.items).size === r.items?.length, `${at}: 한 줄에 같은 작품 두 번`);
		for (const s of r.items ?? []) {
			need(slugs.has(s), `${at}: 없는 작품 ${s}`);
			if (only) need(slugs.get(s)?.kind === only, `${at}: ${only}가 아닌 ${s}`);
		}
		if (r.kind === "top10") need(r.items?.length === 10, `${at}: TOP 10은 10개`);
		if (r.kind === "continue") for (const s of r.items ?? []) need(r.progress?.[s]?.ratio > 0 && r.progress[s].ratio < 1, `${at}: ${s} 진행값`);
	}
}
need(rows.home?.rows?.length === 15, "홈 줄은 15개");
need(rows.home?.billboard?.length === 8 && rows.home.billboard.every((s) => slugs.get(s)?.featured), "홈 빌보드는 대표 작품 8개");
checkRows("home", rows.home?.rows);
const top3 = (rows.home?.rows ?? []).slice(0, 3).flatMap((r) => r.items);
need(new Set(top3).size === top3.length, "홈 위 세 줄에 겹치는 작품");
need(slugs.get(rows.series?.billboard)?.kind === "series" && slugs.get(rows.series?.billboard)?.featured, "시리즈 빌보드");
need(slugs.get(rows.movies?.billboard)?.kind === "movie" && slugs.get(rows.movies?.billboard)?.featured, "영화 빌보드");
need(rows.series?.rows?.length >= 6 && rows.movies?.rows?.length >= 6, "시리즈·영화 줄 6개 이상");
checkRows("series", rows.series?.rows, "series");
checkRows("movies", rows.movies?.rows, "movie");
checkRows("latest", rows.latest?.rows);
need(rows.latest?.rows?.length === 5, "요즘 대세 줄 5개");
need(JSON.stringify(rows.my?.rows?.map((r) => r.kind)) === '["continue","my-list","liked"]', "나의 화면 줄은 이어 보기·찜·좋아요");
checkRows("my", rows.my?.rows);

// images.json
const expected = new Set([...(site.avatars ?? []).map((a) => a.image), ...titles.flatMap((t) => Object.values(t.images ?? {}))]);
need(expected.size === 112, `데이터가 가리키는 그림 ${expected.size}장 (112장이어야 함)`);
need(images.files?.length === expected.size && images.files.every((f) => expected.has(f)), "images.json 파일 목록이 데이터와 다르다");
need(images.release === "pack-nextflix-1" && images.url === "https://github.com/roadkwonai/bts-starter-kit/releases/download/pack-nextflix-1/nextflix-images.zip", "images.json 릴리스·주소");
need(/^[0-9a-f]{64}$/.test(images.sha256 ?? ""), "images.json sha256");

// design-notes.md
const notes = read("design-notes.md");
for (const s of ["0e4d933c-aa07-4787-9884-40a0e6c338e4", "32959012-f50d-4465-bb01-2aa4d506e0a8", "#D6203B", "Pretendard", "받은 뒤 고칠 것", "lint"])
	need(notes.includes(s), `design-notes.md에 "${s}"가 없다`);

// 브랜드: 원래 브랜드 색·서체는 고칠 것을 적는 두 문서 밖에 없어야 하고, 데이터·배치도에는 서비스 이름도 없어야 한다
for (const f of fs.readdirSync(dir, { recursive: true })) {
	const file = String(f);
	if (!/\.(md|json|svg)$/.test(file)) continue;
	const text = read(file).toLowerCase();
	if (!["design-notes.md", "SOURCES.md"].includes(file)) need(!text.includes("e50914") && !text.includes("netflix sans"), `${file}: 원래 브랜드 색·서체`);
}
for (const f of [...DATA, ...WIREFRAMES]) {
	const text = f === "data/site.json" ? JSON.stringify({ ...site, notice: "" }) : read(f);
	need(!/netflix|넷플릭스/i.test(text), `${f}: 원래 서비스 이름`);
}

finish();
console.log(`PASS 작품 ${titles.length}, 회차 ${episodeCount}, 그림 ${expected.size}, 영상 ${videos.length}`);
```

- [ ] **Step 2: 빈 팩에서 실패하는지 본다**

Run: `mkdir -p /Users/freelife/youtube/bts-starter-kit/tutorials/01-nextflix/pack && node /Users/freelife/youtube/bts-samples/tools/pack-check.mjs /Users/freelife/youtube/bts-starter-kit/tutorials/01-nextflix/pack`
Expected: `없음: design-notes.md` … `없음: wireframes/signup.svg` 17줄, `FAIL 17`, exit 1

---

### Task 3: 영상 목록 `data/videos.json`

**Files:**
- Create: `/Users/freelife/youtube/bts-samples/tools/pack-videos.mjs`
- Create: `/Users/freelife/youtube/bts-samples/research/nextflix/videos-src.json`
- Create: `tutorials/01-nextflix/pack/data/videos.json`

**Interfaces:**
- Produces: `videos.json` = `[{ id, title, year, url, apiUrl, durationSec, resolution, license, licenseUrl, attribution }]`. `id`는 Task 4의 회차 `videoId`가 가리키는 값이다: `big-buck-bunny`, `sintel`, `tears-of-steel`, `elephants-dream`, `cosmos-laundromat`, `spring`, `charge`, `wing-it`, `coffee-run`, `caminandes-3`.

- [ ] **Step 1: 원본 목록을 쓴다**

`research/nextflix/videos-src.json`에 10편을 쓴다. `peertube`, `license`는 아래 값이고, `licenseUrl`과 `attribution`은 리서치 `05-dev-references.md` 6.1·6.2절의 공식 출처 주소와 표기 문구를 그대로 옮긴다(Internet Archive 재업로드의 다른 라이선스는 쓰지 않는다).

| id | title | year | peertube | license |
|---|---|---|---|---|
| big-buck-bunny | Big Buck Bunny | 2008 | `pAQiVCgv2CsLg79KKXUoMw` | CC BY 3.0 |
| sintel | Sintel | 2010 | `0eb052d0-fd51-43e6-aa33-ecdbf77a5d40` | CC BY 3.0 |
| tears-of-steel | Tears of Steel | 2012 | `8533ea43-4271-4a57-9694-e9d0b35e1aa1` | CC BY 3.0 |
| elephants-dream | Elephants Dream | 2006 | `cccc3e60-0291-4ecc-aa56-39b2e2c7d0d5` | CC BY 2.5 |
| cosmos-laundromat | Cosmos Laundromat: First Cycle | 2015 | `f507dfdc-e73e-45a4-9778-d758cbe1ce96` | CC BY 4.0 |
| spring | Spring | 2019 | `3d95fb3d-c866-42c8-9db1-fe82f48ccb95` | CC BY 4.0(Blender Studio 공식 페이지 기준) |
| charge | Charge | 2022 | `04da454b-9893-4184-98f3-248d00625efe` | CC BY 4.0 |
| wing-it | Wing It! | 2023 | `bd0084a5-1d26-4816-ab5e-1bad9e2fb990` | CC BY 4.0 |
| coffee-run | Coffee Run | 2020 | `ff8fe61b-026f-4f07-b66b-2a790d6f6ab1` | CC BY 4.0 |
| caminandes-3 | Caminandes 3: Llamigos | 2016 | `23f3ef79-15dc-44c5-aa45-cf92e78a4509` | CC BY 3.0 |

모양: `[{ "id": "charge", "title": "Charge", "year": 2022, "peertube": "04da454b-…", "license": "CC BY 4.0", "licenseUrl": "…", "attribution": "…" }]`

- [ ] **Step 2: 주소를 푸는 도구를 쓴다**

```js
// usage: node pack-videos.mjs <videos-src.json> <out videos.json>
// Blender PeerTube API에서 720p 이하 MP4 직접 주소(files[].fileUrl)를 풀고, 범위 요청이 206인지 확인해 쓴다.
// 영상 uuid에 접미사를 붙여 주소를 만들지 않는다(파일 uuid가 다르다. 리서치 05 6.1절).
import fs from "node:fs";

const [srcFile, outFile] = process.argv.slice(2);
const list = JSON.parse(fs.readFileSync(srcFile, "utf8"));
const result = [];
for (const v of list) {
	const apiUrl = `https://video.blender.org/api/v1/videos/${v.peertube}`;
	const meta = await (await fetch(apiUrl)).json();
	const file = (meta.files ?? [])
		.filter((f) => f.fileUrl?.endsWith(".mp4") && f.resolution?.id <= 720)
		.sort((a, b) => b.resolution.id - a.resolution.id)[0];
	if (!file) throw new Error(`${v.id}: 720p 이하 MP4가 없다`);
	const res = await fetch(file.fileUrl, { headers: { Range: "bytes=0-1" } });
	await res.body?.cancel();
	if (res.status !== 206) throw new Error(`${v.id}: ${res.status} ${file.fileUrl}`);
	const { peertube, ...rest } = v;
	result.push({ ...rest, url: file.fileUrl, apiUrl, durationSec: meta.duration, resolution: file.resolution.id });
}
fs.writeFileSync(outFile, `${JSON.stringify(result, null, "\t")}\n`);
console.log(`${result.length}편 → ${outFile}`);
```

- [ ] **Step 3: 실행하고 확인한다**

Run: `node /Users/freelife/youtube/bts-samples/tools/pack-videos.mjs /Users/freelife/youtube/bts-samples/research/nextflix/videos-src.json /Users/freelife/youtube/bts-starter-kit/tutorials/01-nextflix/pack/data/videos.json`
Expected: `10편 → …`. `wing-it`은 `resolution: 480`, `charge`의 `url`은 `70528f27-fd51-479f-8146-abb5a7a81fff-720.mp4`(리서치 05 6.1절 확인값)다.

---

### Task 4: 예시 데이터 `site.json`, `titles.json`, `rows.json`

**Files:**
- Create: `tutorials/01-nextflix/pack/data/site.json`, `titles.json`, `rows.json`
- Create: `/Users/freelife/youtube/bts-samples/research/nextflix/names-check.md`

**Interfaces:**
- Consumes: Task 3 `videos.json`의 `id`
- Produces: Task 2 검사기가 읽는 모양(아래). Task 5는 `titles[].slug·kind·synopsis·genres·moods·images·featured`와 `site.avatars[].id·image·color·prompt`를 읽는다.

- [ ] **Step 1: 모양을 정한다(예시 값은 형식만 보여 준다)**

`site.json`:
```json
{
	"name": "Nextflix",
	"notice": "넷플릭스와 관계없는 연습용 서비스예요. 데이터는 모두 예시예요.",
	"plans": [
		{ "id": "ads", "name": "광고형 스탠다드", "priceKrw": 7000, "ads": true, "resolution": "1080p", "screens": 2 },
		{ "id": "standard", "name": "스탠다드", "priceKrw": 13500, "ads": false, "resolution": "1080p", "screens": 2 },
		{ "id": "premium", "name": "프리미엄", "priceKrw": 17000, "ads": false, "resolution": "4K + HDR", "screens": 4 }
	],
	"plansCheckedAt": "2026-10-05",
	"profiles": [{ "id": "p1", "name": "<이름>", "avatar": "avatar-1", "main": true }],
	"avatars": [{ "id": "avatar-1", "image": "avatar-1.webp", "color": "#2F6FDE", "prompt": "<영어 한 줄: 무엇을 그린 아바타인지>" }],
	"notifications": [{ "titleSlug": "<작품 slug>", "text": "<한 줄>", "ago": "2일 전" }]
}
```
요금제 값은 리서치 04 8절(한국 고객센터 2026-10-05)과 같다. 프로필 4개, 아바타 8개, 알림 5개. 아바타 색에 `#E50914`처럼 원래 브랜드 빨강을 쓰지 않는다.

`titles.json`의 한 항목:
```json
{
	"slug": "<영어 소문자-하이픈>",
	"kind": "series",
	"name": "<한국어 제목>",
	"synopsis": "<1~2문장>",
	"releaseYear": 2026,
	"minAge": 15,
	"advisories": ["폭력성"],
	"cast": ["<가상 배우>", "<가상 배우>", "<가상 배우>"],
	"creators": ["<가상 이름>"],
	"genres": ["한국 드라마", "스릴러·미스터리"],
	"moods": ["긴장감 넘치는"],
	"matchPercent": 96,
	"featured": true,
	"badge": "새로운 시즌",
	"images": { "card": "<slug>-card.webp", "poster": "<slug>-poster.webp", "billboard": "<slug>-billboard.webp" },
	"seasons": [
		{ "number": 1, "episodes": [{ "number": 1, "name": "<회차 제목>", "synopsis": "<1~2문장>", "videoId": "sintel" }] }
	]
}
```
영화는 `seasons` 대신 `"episodes": [{ "number": 1, "name": "<제목>", "synopsis": "…", "videoId": "charge" }]` 하나다. `badge`는 없거나 `"새로운 시즌"`, `"새로운 에피소드"`, `"최신 등록"` 중 하나다. 대표 작품이 아니면 `featured`가 `false`이고 `images.billboard`가 없다.

`rows.json`:
```json
{
	"home": {
		"billboard": ["<대표 작품 slug 8개>"],
		"rows": [
			{ "id": "continue", "kind": "continue", "name": "<한 줄 제목>", "items": ["<slug>"], "progress": { "<slug>": { "season": 1, "episode": 2, "ratio": 0.42 } } },
			{ "id": "my-list", "kind": "my-list", "name": "…", "items": [] },
			{ "id": "top10-series", "kind": "top10", "name": "…", "items": ["<10개>"] },
			{ "id": "trending", "kind": "standard", "name": "…", "items": ["<12개>"] }
		]
	},
	"series": { "billboard": "<대표 시리즈 slug>", "rows": [] },
	"movies": { "billboard": "<대표 영화 slug>", "rows": [] },
	"latest": { "rows": [] },
	"my": { "rows": ["<홈 줄과 같은 모양 3개: kind가 차례로 continue, my-list, liked>"] }
}
```
`series.rows`, `movies.rows`, `latest.rows`, `my.rows`의 줄도 홈 줄과 같은 모양(`id`, `kind`, `name`, `items`, 이어 보기는 `progress`)이다.
홈 15줄은 리서치 05 11.1절 순서(이어 보기 약 4, 찜 약 6, TOP 10 10, 지금 뜨는 12, 새로 올라온 12, 장르·분위기 10줄 각 12)다. 요즘 대세 5줄은 새로운 콘텐츠, TOP 10 시리즈, TOP 10 영화, 이번 주 공개, 다음 주 공개다. 줄 이름은 새로 쓴다(넷플릭스 문구를 옮기지 않는다).

- [ ] **Step 2: 데이터를 쓴다**

48개(시리즈 28, 영화 20)를 쓴다. 기준은 리서치 05 11.1절이다.
- **장르:** 10개 중 2~3개를 붙인다. 장르는 한국 드라마, 로맨스·코미디, 스릴러·미스터리, 액션, SF·판타지, 애니메이션, 가족, 다큐멘터리, 공포, 예능이다.
- **분위기:** 8개 중 1~2개를 붙인다. 분위기는 마음이 따뜻해지는, 긴장감 넘치는, 눈물 쏙 빼는, 두뇌 풀가동, 가볍게 보기 좋은, 몰아보기 좋은, 감각적인 영상미, 여운이 남는이다.
- **관람 등급:** 전체 25%, 12세 25%, 15세 35%, 19세 15%로 나눈다.
- **회차:** 시리즈는 1~2시즌에 시즌마다 회차 3~6개를 둔다. 회차는 모두 약 160개이고, 모두 영상 10편 중 하나를 가리킨다.
- **출연:** 가상 배우 40명을 정하고 여러 작품에 나눠 쓴다. 그래야 7장 배우 검색에서 한 배우의 작품이 여러 개 나온다.
- **순서:** 한국 드라마, 로맨스, 스릴러를 앞쪽에 둔다.

- [ ] **Step 3: 이름이 실제 작품·인물과 겹치지 않는지 확인한다**

작품명 48개는 각각 `"<제목>" 드라마 OR 영화`로 웹 검색한다. 가상 배우 40명은 `배우 <이름>`으로 웹 검색한다. 이미 있는 작품이나 알려진 배우와 겹치면 바꾼다. 결과는 `research/nextflix/names-check.md`에 `이름 | 검색일 | 결과(겹침 없음/바꿈 → 새 이름)` 표로 남긴다.

- [ ] **Step 4: 검사기로 데이터 부분을 본다**

검사기는 없는 파일이 있으면 데이터를 보기 전에 멈춘다. 그래서 아직 없는 문서, 배치도, `images.json`을 임시 폴더에 빈 자리 파일로 채워 데이터만 검사한다.

```bash
P=/Users/freelife/youtube/bts-starter-kit/tutorials/01-nextflix/pack
T=$(mktemp -d); cp -R "$P/." "$T"; mkdir -p "$T/wireframes"
for f in design-notes.md screens.md features.md SOURCES.md; do echo "0e4d933c-aa07-4787-9884-40a0e6c338e4 32959012-f50d-4465-bb01-2aa4d506e0a8 #D6203B Pretendard 받은 뒤 고칠 것 lint" > "$T/$f"; done
for n in home-1440 home-390 hover-card detail-modal profiles watch landing signup; do echo '<svg xmlns="http://www.w3.org/2000/svg"/>' > "$T/wireframes/$n.svg"; done
node -e 'const fs=require("fs"),p=process.argv[1];const s=JSON.parse(fs.readFileSync(p+"/data/site.json"));const t=JSON.parse(fs.readFileSync(p+"/data/titles.json"));fs.writeFileSync(p+"/images.json",JSON.stringify({release:"pack-nextflix-1",url:"https://github.com/roadkwonai/bts-starter-kit/releases/download/pack-nextflix-1/nextflix-images.zip",sha256:"0".repeat(64),files:[...s.avatars.map(a=>a.image),...t.flatMap(x=>Object.values(x.images))]}))' "$T"
node /Users/freelife/youtube/bts-samples/tools/pack-check.mjs "$T"; rm -rf "$T"
```
Expected: `PASS 작품 48, 회차 1xx, 그림 112, 영상 10`

- [ ] **Step 5: 검사기가 잘못을 잡는지 한 번 본다**

위 임시 폴더 만들기를 다시 하고 `titles.json` 두 번째 작품의 slug를 첫 번째와 같게 바꿔 돌린다.
Run: `node -e 'const fs=require("fs"),f=process.argv[1];const t=JSON.parse(fs.readFileSync(f));t[1].slug=t[0].slug;fs.writeFileSync(f,JSON.stringify(t))' "$T/data/titles.json" && node /Users/freelife/youtube/bts-samples/tools/pack-check.mjs "$T"`
Expected: `작품 <slug>: slug 중복`이 들어간 FAIL, exit 1. 확인 뒤 `rm -rf "$T"`.

---

### Task 5: 그림 112장과 `images.json`

**Files:**
- Create: `/Users/freelife/youtube/bts-samples/tools/pack-images.mjs`
- Create: `/Users/freelife/youtube/bts-samples/research/nextflix/pack-images/{src,out}/`, `nextflix-images.zip`
- Create: `tutorials/01-nextflix/pack/images.json`

**Interfaces:**
- Consumes: Task 4의 `titles.json`, `site.json`
- Produces: `out/<slug>-card.webp`(800×450, 90KB 이하), `out/<slug>-poster.webp`(500×700, 110KB 이하), `out/<slug>-billboard.webp`(가로:세로 2.22, 220KB 이하, 대표 8개), `out/avatar-N.webp`(256×256). `images.json` = `{ release, url, sha256, bytes, files }`

- [ ] **Step 1: 생성 도구를 쓴다**

```js
// usage: OPENAI_API_KEY=… node pack-images.mjs <pack-dir> <work-dir> [slug|avatar-N ...]
// 작품마다 가로 1장(카드·빌보드로 자름)과 세로 1장(포스터, 가로 그림을 참고로)을, 아바타마다 1장을
// impeccable generate-image로 그리고 cwebp로 잘라 <work-dir>/out에 webp로 둔다.
// 이미 그린 원본(<work-dir>/src/*.png)은 다시 그리지 않는다. 이름을 주면 그 작품·아바타만 원본부터 다시 그린다.
// 키는 환경변수로만 받고 출력하지 않는다.
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const [packDir, work, ...redoList] = process.argv.slice(2);
const redo = new Set(redoList);
const IMPECCABLE = "/Users/freelife/youtube/bts-samples/base/.agents/skills/impeccable/scripts/impeccable";
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY가 없다");
const data = (f) => JSON.parse(fs.readFileSync(path.join(packDir, "data", f), "utf8"));
const titles = data("titles.json");
const site = data("site.json");
const src = path.join(work, "src");
const out = path.join(work, "out");
fs.mkdirSync(src, { recursive: true });
fs.mkdirSync(out, { recursive: true });

const RULES =
	"No text, letters, numbers, title lettering, logos, watermarks or UI anywhere in the image. Do not depict any real person, celebrity, or existing film or show.";
const LIMIT_KB = { card: 90, poster: 110, billboard: 220, avatar: 40 };

async function draw(owner, name, size, prompt, ref) {
	const file = path.join(src, `${name}.png`);
	if (fs.existsSync(file) && !redo.has(owner)) return file;
	const args = ["generate-image", "--prompt", prompt, "--out", file, "--size", size, "--quality", "high", "--background", "opaque"];
	if (ref) args.push("--ref", ref);
	await run(IMPECCABLE, args, { maxBuffer: 1 << 24 });
	return file;
}

async function dims(file) {
	const { stdout } = await run("sips", ["-g", "pixelWidth", "-g", "pixelHeight", file]);
	const [w, h] = [...stdout.matchAll(/: (\d+)/g)].map((m) => Number(m[1]));
	return { w, h };
}

// 가운데를 ratio(가로/세로)로 자르고 tw×th로 줄인다(tw가 0이면 줄이지 않음). 용량 한도를 넘으면 품질을 낮춰 다시 쓴다.
async function webp(file, ratio, tw, th, outName, kind) {
	const { w, h } = await dims(file);
	let cw = w;
	let ch = Math.round(w / ratio);
	if (ch > h) {
		ch = h;
		cw = Math.round(h * ratio);
	}
	const crop = ["-crop", String(Math.floor((w - cw) / 2)), String(Math.floor((h - ch) / 2)), String(cw), String(ch)];
	const resize = tw ? ["-resize", String(tw), String(th)] : [];
	const dest = path.join(out, outName);
	for (const q of [80, 72, 64, 56]) {
		await run("cwebp", ["-quiet", "-q", String(q), ...crop, ...resize, file, "-o", dest]);
		if (fs.statSync(dest).size <= LIMIT_KB[kind] * 1024) return;
	}
	throw new Error(`${outName}: 품질 56에서도 ${LIMIT_KB[kind]}KB를 넘는다`);
}

const jobs = [];
for (const t of titles) {
	if (redo.size && !redo.has(t.slug)) continue;
	jobs.push(async () => {
		const kind = t.kind === "series" ? "Korean TV drama series" : "Korean feature film";
		const scene = `${t.synopsis} Genres: ${t.genres.join(", ")}. Mood: ${t.moods.join(", ")}.`;
		const wide = await draw(t.slug, `${t.slug}-wide`, "1536x1024",
			`Cinematic landscape key art for a fictional ${kind}. ${scene} Photographic, dramatic lighting, one clear focal subject, calm empty area on the left third. ${RULES}`);
		const tall = await draw(t.slug, `${t.slug}-tall`, "1024x1536",
			`Vertical poster key art for the same fictional ${kind}, matching the reference image's characters, setting and colors. ${scene} ${RULES}`, wide);
		await webp(wide, 16 / 9, 800, 450, t.images.card, "card");
		await webp(tall, 5 / 7, 500, 700, t.images.poster, "poster");
		if (t.images.billboard) await webp(wide, 2.22, 0, 0, t.images.billboard, "billboard");
	});
}
for (const a of site.avatars) {
	if (redo.size && !redo.has(a.id)) continue;
	jobs.push(async () => {
		const file = await draw(a.id, a.id, "1024x1024", `Simple friendly avatar icon: ${a.prompt}. Flat bold shapes, centered, solid ${a.color} background. ${RULES}`);
		await webp(file, 1, 256, 256, a.image, "avatar");
	});
}

let next = 0;
let done = 0;
const failed = [];
async function worker() {
	while (next < jobs.length) {
		const job = jobs[next++];
		try {
			await job();
		} catch (e) {
			failed.push(String(e?.message ?? e).slice(0, 300));
		}
		if (++done % 10 === 0) console.log(`${done}/${jobs.length}`);
	}
}
await Promise.all(Array.from({ length: 4 }, worker));
console.log(`${jobs.length - failed.length}/${jobs.length} 완료`);
if (failed.length) {
	console.error(failed.join("\n"));
	process.exit(1);
}
```

- [ ] **Step 2: 작품 하나로 먼저 시험한다**

Run: `OPENAI_API_KEY=$(awk -F= '/^OPENAI_API_KEY=/{sub(/^OPENAI_API_KEY=/,"");print}' /Users/freelife/youtube/bts-starter-kit/.env | tr -d '"\r') node /Users/freelife/youtube/bts-samples/tools/pack-images.mjs /Users/freelife/youtube/bts-starter-kit/tutorials/01-nextflix/pack /Users/freelife/youtube/bts-samples/research/nextflix/pack-images <대표 작품 slug 하나>`
Expected: `1/1 완료`. `out/`에 카드·포스터·빌보드 3장이 생긴다. `sips -g pixelWidth -g pixelHeight`로 카드 800×450, 포스터 500×700을 확인한다. 크기 옵션이 모델에서 거부되면 오류 문구대로 `--size` 값을 바꾸고 이 단계를 다시 한다. 그림 세 장을 열어 글자, 로고, 실제 배우를 닮은 얼굴이 없는지 본다. 걸린 시간을 적어 둔다.

- [ ] **Step 3: 나머지를 모두 그린다(백그라운드)**

Step 2 명령에서 slug를 빼고 `run_in_background`로 실행한다. 장당 시간 × 104장이 오래 걸리면 중간에 끊겨도 원본을 다시 그리지 않으므로 같은 명령을 다시 실행한다.
Expected: `104/104 완료`(작품 48 × 2 + 아바타 8)

- [ ] **Step 4: 모아 보기로 검수하고 다시 그린다**

```bash
python3 - <<'EOF'
import os
from PIL import Image, ImageDraw, ImageFont
d = "/Users/freelife/youtube/bts-samples/research/nextflix/pack-images/out"
files = sorted(f for f in os.listdir(d) if f.endswith(".webp"))
font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 16)
for pi in range(0, len(files), 24):
    pg = files[pi:pi + 24]; W, H, cols = 300, 300, 6
    sheet = Image.new("RGB", (W * cols, H * ((len(pg) + cols - 1) // cols)), "white"); dr = ImageDraw.Draw(sheet)
    for i, f in enumerate(pg):
        im = Image.open(os.path.join(d, f)).convert("RGB"); im.thumbnail((290, 270))
        x, y = (i % cols) * W, (i // cols) * H
        sheet.paste(im, (x + 5, y + 24)); dr.text((x + 5, y + 4), f[:36], fill="black", font=font)
    p = f"{d}/../sheet-{pi // 24}.jpg"; sheet.save(p, quality=82); print(p)
EOF
```

모아 보기 5장을 한 장씩 열어 본다. 아래 그림은 slug를 모아 `pack-images.mjs … <slug> <slug> …`로 다시 그린다.
- 글자, 로고, 워터마크가 들어간 그림
- 붉은 N 모양이 들어간 그림
- 알려진 배우나 작품을 닮은 그림
- 카드와 포스터가 서로 다른 작품처럼 보이는 그림

다시 그린 뒤 모아 보기를 다시 만들어 확인한다.

- [ ] **Step 5: zip과 `images.json`을 만든다**

```bash
W=/Users/freelife/youtube/bts-samples/research/nextflix/pack-images
rm -f "$W/nextflix-images.zip" && zip -j -X -q "$W/nextflix-images.zip" "$W"/out/*.webp && du -h "$W/nextflix-images.zip"
node -e '
const fs=require("fs"),c=require("crypto");const [zip,dir,outF]=process.argv.slice(1);
const files=fs.readdirSync(dir).filter(f=>f.endsWith(".webp")).sort();
const sha256=c.createHash("sha256").update(fs.readFileSync(zip)).digest("hex");
fs.writeFileSync(outF,JSON.stringify({release:"pack-nextflix-1",url:"https://github.com/roadkwonai/bts-starter-kit/releases/download/pack-nextflix-1/nextflix-images.zip",sha256,bytes:fs.statSync(zip).size,files},null,"\t")+"\n");
console.log(files.length, sha256);' "$W/nextflix-images.zip" "$W/out" /Users/freelife/youtube/bts-starter-kit/tutorials/01-nextflix/pack/images.json
```
Expected: zip 약 11MB, `112 <sha256>`. 이 뒤로 zip을 다시 만들면 sha256이 바뀌므로 `images.json`도 함께 다시 만든다. 그린 장수와 걸린 시간을 `research/nextflix/README.md` 끝에 적는다(독자는 그림을 받기만 하므로 독자 비용이 아니다).

---

### Task 6: 배치도 8장

**Files:**
- Create: `tutorials/01-nextflix/pack/wireframes/home-1440.svg`, `home-390.svg`, `hover-card.svg`, `detail-modal.svg`, `profiles.svg`, `watch.svg`, `landing.svg`, `signup.svg`

**Interfaces:**
- Consumes: 리서치 `06-screen-brief.md` 2~4절, `02-logged-in-ux.md`의 실측
- Produces: Task 7 `screens.md`가 화면마다 링크하는 그림

공통 규칙:
- 바탕 `#141414`, 상자 `#2a2a2a`, 선과 글자 `#bbbbbb`, 치수 글자 `#D6203B` 12px로 그린다.
- 글꼴은 `font-family="Pretendard, sans-serif"`이고, 상자 안에 한국어로 무엇인지 적는다.
- 치수는 px로, 가로·세로 크기와 간격만 적는다.
- 사진 자리는 대각선 두 줄을 그은 상자다.
- 넷플릭스 로고, 이름, 실제 문구를 쓰지 않는다. 로고 자리는 "서비스 이름(글자)"이라고 적는다.
- 직접 보지 못한 화면(`profiles.svg`, `watch.svg`)은 제목 옆에 "[추정]"을 적는다.

- [ ] **Step 1: 그린다**

| 파일 | 캔버스 | 담을 것 |
|---|---|---|
| `home-1440.svg` | 1440×1800 | 헤더 80(로고 글자, 메뉴 5개 중 지금 메뉴 알약, 오른쪽 검색·알림 배지·프로필) → 빌보드(좌우 여백 48, 높이 610, 반경 24: 제목 글자, 메타 줄, 설명 2~3줄, 알약 버튼 2개 높이 48, 오른쪽 위 음소거, 오른쪽 아래 태그 칩) → 이어 보기 줄(카드 아래 진행 막대 3px, 폭 60%) → TOP 10 줄(외곽선 큰 순위 숫자 + 포스터 5:7) → 일반 줄(제목 24, 카드 16:9 사이 8, 5장과 6번째 일부, 양끝 넘기기 화살표) → 푸터(안내 문구 자리) |
| `home-390.svg` | 390×1400 | 헤더(로고, "메뉴" 하나, 검색), 빌보드(좌우 여백 24, 반경 12), 줄 제목 16, 카드 2장과 일부 |
| `hover-card.svg` | 900×520 | 카드 259×146이 389×387로 커진 창(반경 6): 위 16:9 미리 보기와 음소거, 버튼 줄(재생 원형, 찜 +, 평가, 오른쪽 끝 펼침), 메타 줄(등급 배지, 회차 수, HD), 태그 3개. 오른쪽에 줄 끝 카드가 안쪽으로 커지는 경우를 하나 더 |
| `detail-modal.svg` | 1440×1700 | 어둡게 깐 뒤 화면 위 너비 867 창(반경 6, 정보 영역 `#181818`): 오른쪽 위 ×, 16:9 영상과 제목 글자·재생·찜·평가 → 두 칸 정보(왼쪽 연도·등급·화질·줄거리 / 오른쪽 출연·장르·특징) → 회차(시즌 선택, 항목: 번호, 16:9 썸네일, 제목, 길이, 줄거리 3줄) → 함께 볼 만한 작품 3열 → 상세 정보 |
| `profiles.svg` | 1440×900 | 가운데 제목 자리, 아바타 정사각 격자(최대 5개 + 추가), 아래 "프로필 관리" 외곽선 버튼. [추정] |
| `watch.svg` | 1440×810 | 영상 전체 화면, 왼쪽 위 뒤로, 아래 조작 줄(재생/정지, 10초 뒤·앞, 음량, 제목·회차, 다음 회차, 회차 목록, 자막, 전체 화면), 오른쪽 아래 다음 회차 카운트다운 카드. [추정] |
| `landing.svg` | 1440×2400 | 포스터 콜라주 히어로(큰 제목, 이메일 칸 + 시작하기) → 요금제 배너 → TOP 10 포스터 줄 → 가입 이유 카드 4장 → FAQ 6개 → 아래 이메일 칸 → 푸터 |
| `signup.svg` | 1440×1100 | 단계 표시 → 요금제 카드 3장(이름, 가격, 광고, 화질, 동시 시청 수 줄) → 다음 버튼 → 계정 만들기 폼(이메일, 비밀번호). 결제 단계 없음 |

- [ ] **Step 2: 형식과 모양을 확인한다**

Run: `for f in /Users/freelife/youtube/bts-starter-kit/tutorials/01-nextflix/pack/wireframes/*.svg; do xmllint --noout "$f" || echo "BAD $f"; done`
Expected: `BAD` 없음. 이어서 `node /Users/freelife/youtube/bts-samples/tools/capture.mjs file://<svg 경로> /Users/freelife/youtube/bts-samples/shots/nextflix-wf/<이름>`으로 8장을 찍어 열어 보고, 글자 겹침과 잘림을 고친다.

---

### Task 7: `screens.md`와 `features.md`

**Files:**
- Create: `tutorials/01-nextflix/pack/screens.md`, `tutorials/01-nextflix/pack/features.md`

**Interfaces:**
- Consumes: 설계 3절(사이트맵), 6.1절(규칙), 리서치 06 1~4절, 04, 05 3절·4절, Task 6 배치도
- Produces: 교재 2·4장과 기능 장 프롬프트가 가리키는 절 제목. `features.md`의 절 제목은 정확히 `## 프로필`, `## 작품`, `## 검색`, `## 찜`, `## 평가`, `## 재생과 이어 보기`이다(장 프롬프트가 따옴표로 부른다).

- [ ] **Step 1: `screens.md`를 쓴다**

절 순서:
1. 쓰는 법: 독자의 에이전트가 이 파일로 사이트맵과 화면을 만든다. 값은 이 파일과 `design-notes.md`가 정본이다.
2. 사이트맵: 설계 3절 표를 그대로 쓴다. "나의" 화면은 3줄, 계정은 한 쪽이고, 뺀 화면으로 가는 링크는 메뉴에서 뺀다.
3. 공통 헤더와 푸터: 푸터에는 `data/site.json`의 `notice`를 쓴다.
4. 화면별 구성(위에서 아래 순서, 화면마다 배치도 링크): 리서치 06 2절을 고쳐 쓴다. 쿼리 이름은 `t`이고, 넷플릭스 이름과 문구는 쓰지 않는다.
5. 인터랙션: 리서치 06 3절 값(헤더 1~8px에서 0.4초, hover 약 1.1초 뒤 0.23초 동안 1.5배, 줄 넘기기 750ms `cubic-bezier(.4,0,.2,1)`, 상세 창 열고 닫기, 자동 재생은 음소거, 움직임 줄이기 설정이면 정지 그림)와 키보드 규칙을 적는다.
   - 카드는 초점으로 hover 창을 열지 않고 Enter로 상세 창을 연다.
   - Esc로 닫으면 초점이 카드로 돌아간다.
6. 반응형: 1920·1440·1280·1024·768·500 이하에서 한 줄 카드 7·5·5·4·3·2장, 좌우 여백 48·36·24, 메뉴는 1024에서 "더 보기"·500 이하에서 "메뉴", 빌보드 반경 24 → 12.
7. 빈 상태와 오류:
   - 찜이 없을 때, 이어 보기가 없을 때, 검색 결과가 없을 때(안내와 추천 검색어)
   - 없는 작품 주소: 창을 열지 않고, 작품 쪽은 404
   - 영상을 못 받을 때: `role="alert"` 안내와 다시 시도
8. 정적 화면 만들 때: 상세 창은 주소 쿼리와 클라이언트 컴포넌트(intercepting routes 금지), 작품·재생 쪽은 미리 만든 경로, 그림은 `images.json`에서 받아 `apps/web/public/images/`에.
9. [추정] 표시 목록: 프로필 고르기, 재생, 시즌 선택.

- [ ] **Step 2: `features.md`를 쓴다**

`## 프로필`, `## 작품`, `## 검색`, `## 찜`, `## 평가`, `## 재생과 이어 보기` 여섯 절이다. 절마다 규칙(설계 6.1절), 화면에서 보이는 것, 데이터 모델 힌트를 둔다. 데이터 모델 힌트는 리서치 05 3.1절 표에서 그 장에 필요한 행만 옮긴다.
- **프로필:** `slot` 1~5 제약, 메인 프로필 삭제 막기, 삭제 연쇄, 프로필 쿠키와 요청마다 소유 확인. 인증 파일을 고치면 보안 리뷰가 붙는다는 점도 적는다.
- **작품:** 재생 단위는 회차, 영화는 회차 1개, 태그(장르·분위기), `minAge`, TOP 10은 데이터 순서.
- **검색:** `pg_trgm` GIN과 `ILIKE`, DB 문자 설정이 `C`면 한글이 안 잡힌다.
- **찜:** 프로필 id와 작품 id만 저장, 최대 2,000개, 최근 순, 낙관적 업데이트.
- **평가:** `dislike|like|love`, 취소는 행 삭제, 같은 단계를 다시 누르면 취소(우리 규칙).
- **재생과 이어 보기:** `@videojs/react` 10(판 고정), 저장 시점 5가지와 `sendBeacon`, 늦게 온 저장 무시, 끝남은 남은 시간 5% 이하나 크레딧 시작 시각을 서버가 판단, 다음 회차, "줄에서 제거", 저작자 표기.

각 절 끝에 "넣지 않는 것"(설계 2절의 해당 항목)을 한 줄로 둔다.

- [ ] **Step 3: 값 출처를 대조한다**

`screens.md`와 `features.md`의 수치를 리서치 06 3·4절, 04 1~4·6·8절, 05 3.1·4.2절과 한 줄씩 대조한다. 다른 값이 있으면 리서치 쪽(실측)을 따른다. 대조한 수치 개수와 고친 곳을 이 작업 보고에 적는다.

---

### Task 8: `design-notes.md`, `SOURCES.md`, 팩 검사 통과

**Files:**
- Create: `tutorials/01-nextflix/pack/design-notes.md`, `tutorials/01-nextflix/pack/SOURCES.md`
- Create: `/Users/freelife/youtube/bts-samples/research/nextflix/design-check/DESIGN.md`(확인본, 저장소 밖)

**Interfaces:**
- Consumes: 설계 5.2·5.3절, 리서치 03 4·5·6-1절, 06 4·5절
- Produces: 3장 프롬프트가 부르는 절 제목 `## 받은 뒤 고칠 것`

- [ ] **Step 1: `design-notes.md`를 쓴다**

```markdown
# 디자인 노트

## 받을 DESIGN.md
- 주소: https://styles.refero.design/style/0e4d933c-aa07-4787-9884-40a0e6c338e4
- 무엇: Refero Styles의 넷플릭스 스타일(페이지 제목 "Netflix Spain"). 2026-06-03 추출, 로그인 전 랜딩 기준
- 받는 법: `bts-ui`의 "디자인 카탈로그에서 고르기" 절차(페이지의 Download DESIGN.md 버튼. 안 되면 페이지의 `<pre><code>` 원문)
- 열리지 않으면: https://styles.refero.design/style/32959012-f50d-4465-bb01-2aa4d506e0a8 (같은 서비스, 2026-04-11 추출)를 받아 아래를 똑같이 고친다
- 받은 원문의 추출일이나 절 구성이 위와 다르면 아래를 그대로 적용하고 다른 점을 알려 준다
- 원문은 이 저장소에 넣지 않는다(Refero 이용 약관). 내 프로젝트에서 쓰려고 받는 것은 된다

## 받은 뒤 고칠 것
### 1. 기준 화면: 로그인 후 둘러보기
(표: 항목 | 값 — 페이지 바탕 #141414, 스크롤 뒤 헤더 #000, 창 정보 영역 #181818, 글자 흰색·보조 rgba(255,255,255,.7), 주 버튼 흰 바탕 검정 글자 알약 높이 48, 보조 버튼 rgba(128,128,128,.4) 흰 글자, 반경 빌보드 24·카드 12·창 6·메뉴와 버튼 알약, 좌우 여백 48(1024·768 36, 500 이하 24), 카드 사이 8, 글자 크기(줄 제목 24/500 등 리서치 06 4절), 이미지 비율 카드 16:9·포스터 5:7, 진행 막대 3px 강조색)
랜딩과 로그인도 이 값으로 맞춘다. 원문의 4~8px 반경 버튼은 쓰지 않는다.
### 2. 브랜드 바꾸기
(표: 원문 | 바꿀 값 — 강조 빨강 → #D6203B(호버 #B61B32, 눌림 #8F1528), Netflix Sans → Pretendard(본문 400, 버튼·소제목 500, 제목 700, 큰 제목 900), 로고 → 서비스 이름 글자, 아이콘 → lucide, 토큰 이름·설명의 서비스 이름 → 중립 이름(예: Netflix Red → Accent))
### 3. 원문 정리
- Google 명세 frontmatter를 본문 표 값으로 만든다
- `Similar Brands`, `Quick Start` 절을 지운다
- `%` 반경은 옮기지 않는다
- 원래 서비스 이름, 원래 빨강 색 코드, 원래 서체 이름이 남지 않게 한다
### 4. 확인
- `pnpm dlx @google/design.md lint DESIGN.md`가 오류 없이 끝나야 한다

## 확인 기록
- <날짜>: 위 주소에서 받아 고친 결과 lint 오류 0, 경고 <n>
```

괄호 안 설명은 실제 표와 목록으로 바꿔 쓴다. 값은 리서치 06 4·5절, 03 4·5절과 같다.

- [ ] **Step 2: 원문을 받아 직접 고쳐 보고 lint를 확인한다**

`bts-ui` 절차대로 받는다. 받는 명령은 `agent-browser`의 `download '[aria-label="Download DESIGN.md"]'`이고, 받은 파일은 `research/nextflix/design-check/DESIGN.original.md`에 둔다.
- 원문이 리서치 사본 `refero-netflix-spain-DESIGN.md`와 같은지 `cmp`로 확인한다.
- `DESIGN.original.md`를 `DESIGN.md`로 복사한 뒤 Step 1의 "받은 뒤 고칠 것"만 보고 고친다.

Run: `cd /Users/freelife/youtube/bts-samples/research/nextflix/design-check && pnpm dlx @google/design.md lint DESIGN.md; grep -n -i -E 'netflix|e50914' DESIGN.md`
Expected: lint 오류 0, grep 결과 없음. 고칠 것만으로 안 되는 곳이 있으면 Step 1에 더하고 다시 한다. 날짜와 경고 수를 "확인 기록"에 적는다.

- [ ] **Step 3: `SOURCES.md`를 쓴다**

- **조사:** 2026-10-04~05에 했다. 독자에게 다시 조사하게 하지 않는다.
- **출처 링크:**
  - 넷플릭스 고객센터: 요금 node/24926, 프로필 10421, 찜 10523, 평가 9898, 검색 47765, 등급 2064, 이어 보기 114058·115312
  - Refero 스타일 두 주소
  - Blender 영화 공식 페이지(`videos.json`의 `licenseUrl`)
- **라이선스:**
  - 팩의 글, 데이터, 배치도, 그림은 저장소 MIT 라이선스다.
  - 그림은 AI(impeccable generate-image, gpt-image-2.5-flare)로 만들었고 날짜를 적는다.
  - 영상은 각 영화의 CC BY 판과 표기 문구를 따른다.
  - DESIGN.md 원문은 Refero 콘텐츠라 팩에 넣지 않았다.
- **이름:** 작품명과 인물명은 지어낸 것이고, 실제와 겹치지 않는지 검색으로 확인했다(날짜).

- [ ] **Step 4: 팩 검사를 통과시킨다**

Run: `node /Users/freelife/youtube/bts-samples/tools/pack-check.mjs /Users/freelife/youtube/bts-starter-kit/tutorials/01-nextflix/pack`
Expected: `PASS 작품 48, 회차 1xx, 그림 112, 영상 10`, exit 0

- [ ] **Step 5: 팩에 넣지 않는 것이 섞이지 않았는지 본다**

Run: `find /Users/freelife/youtube/bts-starter-kit/tutorials/01-nextflix -type f \( -name '*.jpg' -o -name '*.png' -o -name '*.webp' -o -name '*DESIGN*' \) ; git -C /Users/freelife/youtube/bts-starter-kit status --short tutorials/`
Expected: 첫 명령 결과 없음(그림은 릴리스로만, 원문 없음). 상태에는 `tutorials/01-nextflix/`만 새로 보인다.

---

### Task 9: 교재 첫 쪽과 1~4장

**Files:**
- Create: `tutorials/01-nextflix/README.md`, `01-create-project.md`, `02-plan.md`, `03-design.md`, `04-screens.md`

**Interfaces:**
- Consumes: 팩 파일 이름과 절 제목(Task 7·8), 14번 교재 첫 쪽 형식(`tutorials/samples/README.md` "가장 쉬운 방법"), 상위 설계 5.2~5.4절
- Produces: Task 12·13 샘플 라운드가 그대로 쓰는 2~4장 프롬프트

- [ ] **Step 1: 첫 쪽을 쓴다**

절 순서:
1. 제목 "넷플릭스 같은 영상 구독 서비스 만들기"와 안내 문구 알림(NOTE)
2. 무엇을 만드나요: 샘플 링크 `https://roadkwonai.github.io/bts-starter-kit/nextflix/`. 스크린샷은 Task 14에서 넣는다.
3. 가장 쉬운 방법:
   - 14번 첫 쪽 1~3단계 구성을 따른다(작업 폴더에서 열기, 프롬프트 하나, 알려 준 한 줄로 이어 가기, `../samples/assets/where-to-open@2x.webp` 그림).
   - 준비물 NOTE: 5장부터 DB를 쓰므로 Docker Desktop이나 Podman이 필요하다. 없으면 에이전트가 알려 준다.
4. 장별로: 12장 목록 표(장, 할 일, 결과)
5. 시간과 비용: 샘플 라운드 기록으로 Task 14에서 채운다.
6. 만든 기록: 상위 설계 9절 항목으로 Task 14에서 채운다.

가장 쉬운 방법 프롬프트:

````markdown
```prompt
https://github.com/roadkwonai/bts-starter-kit 을 이 폴더에 받고, 그 안의 AGENTS.md대로 neon 템플릿으로 bts-starter-kit 옆에 [nextflix] 폴더로 프로젝트를 만들어줘. 없는 준비물은 설치해줘.
넷플릭스 같은 영상 구독 서비스를 만들 거야. 이름은 [Nextflix].
bts-starter-kit의 tutorials/01-nextflix/pack 자료 팩으로 서비스 기획을 채워줘. 팩 데이터의 서비스 이름은 내가 정한 이름으로 바꿔 써.
디자인은 팩의 design-notes.md대로 DESIGN.md를 받아 고쳐 쓰고, 사이트맵의 모든 페이지를 팩의 예시 데이터와 그림으로 만들어줘.
푸터에는 팩에 적힌 연습용 안내 문구를 넣어줘.
```
````

- [ ] **Step 2: 1~4장을 쓴다**

장마다 상위 설계 5.2절 형식이다. "이번 장에서 할 일", 단계(할 일 한 문장, 프롬프트, "이렇게 되면 성공" 2~3개, 막히면), "에이전트가 물어보면", 다음 장 링크를 둔다.

**1장 프로젝트 만들기** (작업 폴더의 bts-starter-kit 폴더에서 연다):
```prompt
neon 템플릿으로 [nextflix] 프로젝트 만들어줘.
```
성공:
- 보고에 프로젝트 경로와 로컬 DB 주소가 나온다.
- 새 폴더에서 열 명령 한 줄이 나온다.

막히면: 컨테이너 엔진이 없을 때, 5432 포트가 사용 중일 때(AGENTS.md 6번 `DB_PORT`).

**2장 서비스 기획** (새 프로젝트 폴더에서 연다):
```prompt
넷플릭스 같은 영상 구독 서비스를 만들 거야. 이름은 [Nextflix].
옆 폴더 bts-starter-kit의 tutorials/01-nextflix/pack에 있는 screens.md와 features.md를 읽고 서비스 소개, 용어, 사이트맵을 채워줘.
팩 데이터의 서비스 이름은 내가 정한 이름으로 바꿔 써.
```
성공:
- `PRODUCT.md`에 서비스 소개가 생긴다.
- `GLOSSARY.md`에 프로필, 찜, 이어 보기가 생긴다.
- 사이트맵에 팩의 화면이 모두 들어간다.

TIP: 이름 바꾸기는 `[Nextflix]` 한 곳만 고치면 된다.

**3장 디자인 정하기**:
```prompt
디자인은 자료 팩의 design-notes.md에 적힌 주소에서 DESIGN.md를 받아서 써줘.
받은 다음 design-notes.md의 "받은 뒤 고칠 것"대로 고쳐줘.
화면 배치는 자료 팩의 screens.md와 배치도(wireframes)를 따라줘.
```
성공:
- 프로젝트에 `DESIGN.md`가 생긴다.
- 바탕이 어두운 회색이고 버튼이 알약 모양이다.
- 원래 서비스의 로고, 빨강, 서체 이름이 없다.

시안 고르기 단계는 `tutorials/samples/05-build.md` 1절처럼 쓴다. 시안 3장 그림은 Task 14에서 넣고, 고르는 프롬프트 예("A안으로 해줘")를 둔다.

TIP:
- 다른 스타일로 바꾸는 법: Disney+, HBO Max(Refero 주소), Spotify(getdesign.md). 구조는 그대로 두고 DESIGN.md만 바꾼다.
- 선택 팁: ego lite로 원래 서비스를 보고 더 맞추기. 리서치 06 8.5절 문장을 쓰고, 읽기만 하며 계정 정보를 찍지 않는다는 주의를 둔다.

**4장 모든 화면 만들기**:
```prompt
사이트맵의 모든 페이지를 자료 팩의 예시 데이터(data)와 그림으로 만들어줘. 그림은 images.json에 적힌 주소에서 받아.
푸터에는 팩에 적힌 연습용 안내 문구를 넣어줘.
```
성공(리서치 06 8.4절):
- 카드에 마우스를 올리면 잠시 뒤 크게 펼쳐진다.
- 작품을 누르면 주소가 바뀌며 상세 창이 뜨고, Esc로 닫힌다.
- 창을 좁히면 한 줄 카드 수가 줄고 메뉴가 접힌다.
- 푸터에 연습용 안내가 있다.

막히면: 그림을 받지 못할 때, 영상이 안 나올 때, 중간에 멈췄을 때("이어서 만들어줘").

- [ ] **Step 3: 프롬프트에 값이 없고 링크가 살아 있는지 검사한다**

```bash
node -e '
const fs=require("fs"),path=require("path");const d=process.argv[1];let bad=0;
for(const f of fs.readdirSync(d).filter(f=>f.endsWith(".md"))){const s=fs.readFileSync(path.join(d,f),"utf8");
 for(const m of s.matchAll(/```prompt[^\n]*\n([\s\S]*?)```/g)){const b=m[1];
  if(/#[0-9a-fA-F]{3,8}\b|\d+\s?(px|ms)\b|\d+(\.\d+)?초/.test(b)){console.log("값:",f,b.split("\n")[0]);bad++}
  if(b.trim().split("\n").length>10){console.log("10줄 넘음:",f);bad++}}
 for(const m of s.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)){const h=m[1];if(/^https?:/.test(h))continue;
  if(!fs.existsSync(path.resolve(d,h))){console.log("링크:",f,h);bad++}}}
console.log(bad?`FAIL ${bad}`:"PASS");process.exit(bad?1:0)' /Users/freelife/youtube/bts-starter-kit/tutorials/01-nextflix
```
Expected: `PASS`. 아직 없는 그림(`assets/…`)과 뒤 장 링크는 실패로 나온다. 그림은 Task 14, 뒤 장은 Task 10·11 뒤에 이 검사를 다시 돌려 PASS를 확인한다.

- [ ] **Step 4: bts-starter-kit 절차와 대조한다**

아래 문서와 장마다 다른 곳이 없는지 대조하고, 다른 곳을 고친다.
- 루트 `AGENTS.md`의 "템플릿으로 새 프로젝트 만들기"와 "작업 폴더에서 시작했을 때"
- `templates/bts-next-neon/README.md`의 "새 프로젝트 시작"과 "설치한 뒤"
- `templates/bts-next-neon/files/.agents/skills/bts-ui/SKILL.md`와 `references/impeccable-map.md`의 카탈로그 절차·저장 단계

대조할 것:
- 어느 폴더에서 열고 다시 여는지
- 에이전트가 묻는 것
- DESIGN.md를 받는 방법
- 시안을 고르는 지점

대조한 항목과 고친 곳을 보고에 적는다.

---

### Task 10: 기능 장 5~10장

**Files:**
- Create: `tutorials/01-nextflix/05-auth-profiles.md`, `06-catalog-db.md`, `07-search.md`, `08-my-list.md`, `09-rating.md`, `10-watch.md`

**Interfaces:**
- Consumes: `features.md` 절 제목(Task 7), `templates/bts-next-neon/files/.agents/skills/bts-dev-cycle/SKILL.md`(라운드, 케이스, 리뷰), `bts-api`, `bts-db` 스킬

장마다 형식은 Task 9와 같다. 기능 장은 프로젝트 폴더에서 연 세션에서 dev-cycle 라운드로 진행된다는 점, 라운드가 끝나면 확인을 요청받는다는 점을 "에이전트가 물어보면"에 적는다.

- [ ] **Step 1: 5~10장을 쓴다**

**5장 로그인과 프로필**:
```prompt
이제 실제로 가입하고 로그인하게 만들어줘. 로그인하면 프로필 고르기 화면으로 가.
프로필은 자료 팩 features.md의 "프로필" 규칙대로 만들어줘. 고른 프로필은 다음에 들어와도 기억해줘.
```
성공:
- 가입하고 로그인하면 프로필 고르기가 나온다.
- 프로필을 6개째 만들려고 하면 막힌다.
- 메인 프로필은 지울 수 없다.
- 다른 계정으로 로그인하면 내 프로필이 보이지 않는다.

에이전트가 물어보면: 인증 파일을 고치면 보안 리뷰가 붙는다. 이때는 "추천대로 해줘"라고 답한다.

막히면: DB가 꺼져 있을 때("DB 켜줘").

**6장 작품을 DB로**:
```prompt
예시 데이터로 보여 주던 작품, 시즌, 회차, 줄 구성을 DB로 옮겨줘.
자료 팩 features.md의 "작품" 규칙과 데이터 모델 힌트대로 만들고, 화면은 지금 모습 그대로 DB에서 읽게 해줘.
```
성공:
- 화면이 전과 같다.
- "DB에 작품이 몇 개 있어?"라고 물으면 48개라고 답한다.
- 상세 창에 관람 등급이 보인다.

**7장 검색**:
```prompt
검색을 실제로 동작하게 해줘. 자료 팩 features.md의 "검색" 규칙대로 제목, 배우, 장르로 찾게 해줘.
```
성공:
- 제목 두 글자로 찾아진다.
- 배우 이름으로 그 배우의 작품이 여러 개 나온다.
- 없는 말로 찾으면 안내가 나온다.

막히면: 한글 검색 결과가 0일 때 쓸 복구 프롬프트를 둔다. "한글 검색이 안 돼. DB 문자 설정 때문인지 확인하고 고쳐줘."

**8장 찜**:
```prompt
찜을 실제로 저장되게 해줘. 자료 팩 features.md의 "찜" 규칙대로 프로필마다 따로 담고, 나의 [Nextflix] 화면과 홈의 찜 줄에 보여줘.
```
성공:
- 담고 새로고침해도 남아 있다.
- 다른 프로필에는 보이지 않는다.
- 최근에 담은 것이 앞에 온다.

**9장 평가**:
```prompt
평가를 실제로 저장되게 해줘. 자료 팩 features.md의 "평가" 규칙대로 만들고, 좋아요 표시한 작품을 나의 [Nextflix] 화면에 모아줘.
```
성공:
- 세 단계 중 하나를 고르면 남아 있다.
- 같은 단계를 다시 누르면 취소된다.
- 좋아요 줄에 모인다.

**10장 재생과 이어 보기**:
```prompt
재생 화면에서 영상이 실제로 나오게 하고, 본 위치를 저장해서 이어 보기 줄에 보여줘.
자료 팩 features.md의 "재생과 이어 보기" 규칙과 data/videos.json의 영상 주소를 써줘. 영상 정보에 저작자 표기도 넣어줘.
```
성공:
- 30초쯤 보고 홈으로 오면 이어 보기에 진행 막대가 있다.
- 다시 누르면 그 위치부터 재생된다.
- 회차 끝까지 넘기면 다음 회차가 이어 보기에 온다.
- "줄에서 제거"가 된다.

막히면:
- 영상이 안 나올 때: "videos.json의 apiUrl에서 주소를 다시 받아줘."
- 재생기 판 오류가 날 때

설계 2절 "팁으로만" 항목은 장 끝 `> [!TIP]` "더 해 보기"로 둔다. 5장에는 어린이 프로필과 등급 상한, 프로필 잠금 PIN을 넣는다. 10장에는 시청 기록 숨기기를 넣는다. 팁마다 한 줄 설명과 프롬프트 한 블록을 둔다. 규칙은 리서치 04 1·3절을 따르고, `features.md`에는 넣지 않는다.

- [ ] **Step 2: dev-cycle 규칙과 대조한다**

`bts-dev-cycle`, `bts-api`, `bts-db` SKILL.md와 대조해, 장마다 아래 다섯 가지가 템플릿 절차와 같은지 본다.
- 라운드 시작 문장
- 확인 요청 시점
- 보안 리뷰가 붙는 조건(인증 경로)
- 마이그레이션 단계
- 두 계정 격리 테스트

다른 곳을 고치고 보고한다.

- [ ] **Step 3: Task 9 Step 3 검사를 다시 돌린다**

Expected: 값·10줄 문제 0. 남은 실패는 아직 없는 11·12장 링크와 그림뿐이다.

---

### Task 11: 11·12장과 용어

**Files:**
- Create: `tutorials/01-nextflix/11-check.md`, `12-deploy.md`
- Modify: `tutorials/reference/glossary.md`

- [ ] **Step 1: 11장을 쓴다**

`tutorials/samples/06-review.md`의 프롬프트("지금까지 만든 거 검증해줘", "디자인 리뷰해서 큰 문제부터 고쳐줘")와 직접 고치는 예를 Nextflix에 맞게 쓴다. 예는 "휴대폰에서 줄 제목이 너무 커. 한 단계 줄여줘."다. 프롬프트 안에는 값을 쓰지 않는다.

- [ ] **Step 2: 12장을 쓴다**

`templates/bts-next-neon/README.md`의 "Vercel 배포"와 `bts-deploy` SKILL.md를 읽고 그 절차대로 쓴다. 다룰 것은 아래와 같다.
- 원격 DB(Neon) 연결
- Vercel 연결
- production은 `pnpm release`로 만든 커밋만 배포한다는 점
- 계정과 토큰 준비는 `tutorials/reference/deploy.md` 링크로 보낸다.
- "선택" 장이고 계정이 필요하다는 점을 맨 위 NOTE로 둔다.

- [ ] **Step 3: 용어를 더한다**

1~12장에서 처음 나오고 `glossary.md`에 없는 용어만 더한다. 후보는 자료 팩, 배치도, 빌보드, 관람 등급, 저작자 표기, 릴리스 첨부 파일이다. 각 장의 처음 나온 곳에 괄호 풀이와 용어집 링크를 둔다(상위 설계 5.4절).

- [ ] **Step 4: Task 9 Step 3 검사를 다시 돌린다**

Expected: 남은 실패는 아직 없는 `assets/` 그림뿐이다.

---

### Task 12: 샘플 라운드 R1(2·3장)과 시안 고르기

**Files:**
- Create: `/Users/freelife/youtube/bts-samples/prompts/nextflix-R1.txt`
- Modify(라운드가): `/Users/freelife/youtube/bts-samples/tutorials/nextflix/` 안의 `PRODUCT.md`, `GLOSSARY.md`, `DESIGN.md`, `docs/briefs/`, `.impeccable/mocks/`

**Interfaces:**
- Consumes: 2·3장 프롬프트(Task 9) 원문, 팩
- Produces: 세션 ID(`logs/nextflix-R1.jsonl`의 첫 `session_id`), 시안 3장, "팩에 없던 것" 목록

- [ ] **Step 1: 라운드 프롬프트를 쓴다**

`prompts/nextflix-R1.txt`:
```
너는 Nextflix 튜토리얼의 샘플을 만든다. 독자가 보내는 튜토리얼 2장과 3장 프롬프트를 아래에 그대로 붙였다.
이 프로젝트는 튜토리얼 1장(프로젝트 만들기)을 마친 상태로 본다.
자료 팩은 /Users/freelife/youtube/bts-starter-kit/tutorials/01-nextflix/pack 이다(프롬프트의 "옆 폴더 bts-starter-kit"). 팩 밖의 넷플릭스 자료는 읽지 않는다.
팩만으로 정할 수 없는 곳은 멈추지 말고 합리적으로 정하고, 보고 끝 "팩에 없던 것"에 하나씩 적는다.
시안 3장을 만든 뒤 고르는 지점에서 멈추고 보고한다.

[2장 프롬프트 원문]

[3장 프롬프트 원문]
```
대괄호 두 줄은 `tutorials/01-nextflix/02-plan.md`와 `03-design.md`의 프롬프트 블록 원문으로 바꾼다. 바꿀 곳 괄호(`[Nextflix]`)는 떼고 넣는다.

- [ ] **Step 2: 라운드를 돌린다(백그라운드)**

Run: `bash /Users/freelife/youtube/bts-samples/tools/run.sh nextflix R1 /Users/freelife/youtube/bts-samples/prompts/nextflix-R1.txt` (`run_in_background`)
Expected: `logs/nextflix-R1.done`에 `exit=0`. `python3 /Users/freelife/youtube/bts-samples/tools/tut-result.py /Users/freelife/youtube/bts-samples/logs/nextflix-R1.jsonl`로 비용과 마지막 보고를 본다.

- [ ] **Step 3: 결과를 확인한다**

Run: `cd /Users/freelife/youtube/bts-samples/tutorials/nextflix && pnpm dlx @google/design.md lint DESIGN.md; grep -n -i -E 'netflix|e50914' DESIGN.md PRODUCT.md GLOSSARY.md`
Expected: lint 오류 0. grep은 `PRODUCT.md`의 "넷플릭스 같은" 설명과 안내 문구 말고는 없다. 시안 3장(`.impeccable/mocks/`)을 1200px JPEG로 줄여 연다.

- [ ] **Step 4: 사용자에게 시안을 고르게 한다**

시안 3장 경로와 라운드의 추천을 AskUserQuestion으로 보여 주고 고르게 한다. 사용자가 맡기면 추천대로 한다. "팩에 없던 것"은 팩 문서(`screens.md` 등)에 반영하고, `pack-check.mjs`를 다시 PASS로 만든다.

---

### Task 13: 샘플 라운드 R2(4장)·R3(고침)와 검사

**Files:**
- Create: `/Users/freelife/youtube/bts-samples/prompts/nextflix-R2.txt`, `nextflix-R3.txt`, `/Users/freelife/youtube/bts-samples/tools/nextflix-probe.mjs`
- Modify(라운드가): `tutorials/nextflix/apps/web/**`

**Interfaces:**
- Consumes: R1 세션 ID, 고른 시안, 4장 프롬프트 원문
- Produces: 내보낸 사이트 `/Users/freelife/youtube/bts-samples/pages/bts-starter-kit/nextflix/`, 검사 결과 `checks/nextflix*.json`

- [ ] **Step 1: R2를 돌린다**

`prompts/nextflix-R2.txt`:
```
고른 시안: <A/B/C와 사용자가 덧붙인 말>.
이어서 튜토리얼 4장 프롬프트를 독자처럼 받는다. 기능(실제 로그인, 저장, 결제)은 넣지 않고 화면만 만든다. 찜·평가 버튼은 화면 안에서만 바뀌게 한다.
그림: images.json의 릴리스는 아직 올리지 않았다. 같은 파일을 /Users/freelife/youtube/bts-samples/research/nextflix/pack-images/nextflix-images.zip 에서 받는다(sha256은 images.json과 같다).
다 만들면 링크·버튼 전수 검사까지 하고 보고한다. 보고 끝 "팩에 없던 것"을 다시 적는다.

[4장 프롬프트 원문]
```
Run: `bash /Users/freelife/youtube/bts-samples/tools/run.sh nextflix R2 /Users/freelife/youtube/bts-samples/prompts/nextflix-R2.txt <R1 세션 ID>` (`run_in_background`, 바로 다음 라운드라 이어 간다)
Expected: `exit=0`, 보고에 사이트맵 쪽 수와 검사 결과

- [ ] **Step 2: 상호작용 검사 도구를 쓴다**

```js
// usage: node nextflix-probe.mjs <base-url> <pack-dir> <out.json>
// Nextflix 샘플(내보낸 사이트)의 상호작용을 잰다. base-url 예: http://localhost:8090/bts-starter-kit/nextflix
// 샘플은 줄 트랙에 data-row="<continue|my-list|liked|top10|standard>", 카드에 data-card, hover 창에 data-hover-card,
// 빈 상태에 data-empty를 둔다(R3에서 넣음). 문제가 있으면 exit 1.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const [base, packDir, out] = process.argv.slice(2);
const titles = JSON.parse(fs.readFileSync(path.join(packDir, "data/titles.json"), "utf8"));
const browser = await chromium.launch({ channel: "chrome" });
const fails = [];
const report = {};
const check = (ok, msg) => {
	if (!ok) fails.push(msg);
};
async function open(p, { width = 1440, reducedMotion = "no-preference", block } = {}) {
	const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion });
	const errors = [];
	page.on("pageerror", (e) => errors.push(String(e)));
	if (block) await page.route(block, (r) => r.abort());
	await page.goto(base + p, { waitUntil: "networkidle" });
	return { page, errors };
}
const STANDARD = '[data-row="standard"]';

// 1. 폭별로 첫 일반 줄에 다 보이는 카드 수
const EXPECT = { 1920: 7, 1440: 5, 1280: 5, 1024: 4, 768: 3, 500: 2, 390: 2 };
report.cards = {};
for (const [w, n] of Object.entries(EXPECT)) {
	const { page } = await open("/browse/", { width: Number(w) });
	const seen = await page.evaluate((sel) => {
		const vw = document.documentElement.clientWidth;
		return [...document.querySelector(sel).querySelectorAll("[data-card]")].filter((c) => {
			const r = c.getBoundingClientRect();
			return r.left >= -1 && r.right <= vw + 1;
		}).length;
	}, STANDARD);
	report.cards[w] = seen;
	check(seen === n, `1. ${w}px 첫 줄 카드 ${seen}장(기대 ${n})`);
	await page.close();
}

// 2. 헤더: 맨 위와 조금 내린 뒤 바탕
{
	const { page } = await open("/browse/");
	const bg = () => page.evaluate(() => getComputedStyle(document.querySelector("header")).backgroundColor);
	const top = await bg();
	await page.mouse.wheel(0, 40);
	await page.waitForTimeout(700);
	const scrolled = await bg();
	report.header = { top, scrolled };
	check(scrolled === "rgb(0, 0, 0)" && top !== scrolled, `2. 헤더 바탕 ${top} → ${scrolled}`);
	await page.close();
}

// 3. hover 창: 나타나는 시간과 배율
{
	const { page } = await open("/browse/");
	const card = page.locator(`${STANDARD} [data-card]`).first();
	const before = await card.boundingBox();
	const t0 = Date.now();
	await card.hover();
	await page.locator("[data-hover-card]").first().waitFor({ state: "visible", timeout: 3000 });
	const delay = Date.now() - t0;
	await page.waitForTimeout(500);
	const after = await page.locator("[data-hover-card]").first().boundingBox();
	const scale = after.width / before.width;
	report.hover = { delay, scale: Math.round(scale * 100) / 100 };
	check(delay >= 900 && delay <= 1500, `3. hover 지연 ${delay}ms(기대 약 1100)`);
	check(scale >= 1.4 && scale <= 1.6, `3. hover 배율 ${scale.toFixed(2)}(기대 1.5)`);
	await page.close();
}

// 4. 움직임 줄이기: 자동 재생하는 영상이 없어야 한다
{
	const { page } = await open("/browse/", { reducedMotion: "reduce" });
	await page.waitForTimeout(2000);
	const playing = await page.evaluate(() => [...document.querySelectorAll("video")].some((v) => !v.paused));
	report.reducedMotionPlaying = playing;
	check(!playing, "4. 움직임 줄이기인데 영상이 자동 재생됨");
	await page.close();
}

// 5. 없는 작품 주소
{
	const { page, errors } = await open("/browse/?t=no-such-title");
	await page.waitForTimeout(1000);
	const dialogs = await page.locator('[role="dialog"]').count();
	check(dialogs === 0 && errors.length === 0, `5. 없는 작품 쿼리: 창 ${dialogs}, 오류 ${errors.length}`);
	await page.close();
	const r404 = await fetch(`${base}/title/no-such-title/`);
	check(r404.status === 404, `5. 없는 작품 쪽 상태 ${r404.status}(기대 404)`);
}

// 6. 키보드: 초점으로 hover 창이 열리지 않고, Enter로 창을 열고 Esc로 닫으면 초점이 카드로 돌아온다
{
	const { page } = await open("/browse/");
	const target = page.locator(`${STANDARD} [data-card] a, ${STANDARD} [data-card] button`).first();
	await target.focus();
	await page.waitForTimeout(1500);
	check((await page.locator("[data-hover-card]").count()) === 0, "6. 초점만으로 hover 창이 열림");
	await page.keyboard.press("Enter");
	await page.locator('[role="dialog"]').waitFor({ state: "visible", timeout: 3000 });
	check(page.url().includes("t="), "6. 창을 열었는데 주소에 t가 없음");
	await page.keyboard.press("Escape");
	await page.waitForTimeout(500);
	const back = await page.evaluate(() => !!document.activeElement?.closest("[data-card]"));
	check((await page.locator('[role="dialog"]').count()) === 0 && back, "6. Esc 뒤 창이 남았거나 초점이 카드로 돌아오지 않음");
	await page.close();
}

// 7. 한글 검색과 빈 상태
{
	const { page } = await open("/search/");
	const q = titles[0].name.slice(0, 2);
	const box = page.locator('input[type="search"]').first();
	await box.focus();
	await page.keyboard.insertText(q);
	await page.waitForTimeout(800);
	const hits = await page.locator("[data-card]").count();
	check(decodeURIComponent(page.url()).includes(`q=${q}`) && hits > 0, `7. "${q}" 검색: 주소 ${page.url()}, 결과 ${hits}`);
	await box.fill("");
	await page.keyboard.insertText("qzxj");
	await page.waitForTimeout(800);
	check((await page.locator("[data-card]").count()) === 0 && (await page.locator("[data-empty]").count()) > 0, "7. 결과 없음 안내가 없음");
	await page.close();
}

// 8. 영상을 못 받을 때 안내
{
	const { page } = await open(`/watch/${titles[0].slug}/`, { block: "**/*.mp4" });
	const ok = await page.locator('[role="alert"]').first().waitFor({ state: "visible", timeout: 8000 }).then(() => true, () => false);
	check(ok, "8. 영상을 못 받았는데 role=alert 안내가 없음");
	await page.close();
}

await browser.close();
fs.writeFileSync(out, `${JSON.stringify({ ...report, fails }, null, "\t")}\n`);
console.log(fails.length ? `${fails.join("\n")}\nFAIL ${fails.length}` : "PASS 8");
process.exit(fails.length ? 1 : 0);
```

- [ ] **Step 3: 내보내고 검사한다(실패를 먼저 본다)**

```bash
bash /Users/freelife/youtube/bts-samples/tools/publish.sh nextflix
node /Users/freelife/youtube/bts-samples/tools/nextflix-probe.mjs http://localhost:8090/bts-starter-kit/nextflix /Users/freelife/youtube/bts-starter-kit/tutorials/01-nextflix/pack /Users/freelife/youtube/bts-samples/checks/nextflix-probe.json
B=http://localhost:8090/bts-starter-kit/nextflix
node /Users/freelife/youtube/bts-samples/tools/qa.mjs widths $B /Users/freelife/youtube/bts-samples/checks/nextflix-widths.json / /browse/ /browse/series/ /latest/ /my/ /search/ /account/ /profiles/
node /Users/freelife/youtube/bts-samples/tools/qa.mjs axe $B /Users/freelife/youtube/bts-samples/checks/nextflix-axe.json / /browse/ /search/ /signup/
node /Users/freelife/youtube/bts-samples/tools/qa.mjs clean $B /Users/freelife/youtube/bts-samples/checks/nextflix-clean.json / /browse/
node /Users/freelife/youtube/bts-samples/tools/ui-audit.mjs /Users/freelife/youtube/bts-samples/checks/nextflix.json /Users/freelife/youtube/bts-samples/checks/nextflix-ui.json
```
Expected: R2 결과에는 `data-*` 속성이 없으므로 probe는 FAIL이다(검사가 동작함을 확인). 나머지 결과도 실패 항목을 모은다.

- [ ] **Step 4: R3로 고친다**

`prompts/nextflix-R3.txt`에 Step 3의 실패 목록(파일과 줄 수 위주로 짧게)을 넣고, 아래 요구를 덧붙인다.
- `data-row`, `data-card`, `data-hover-card`, `data-empty` 속성을 넣고, 검색 칸은 `input type="search"`로 둔다(검사용).
- 영상을 못 받을 때 `role="alert"` 안내와 다시 시도를 둔다(screens.md 7절).
- 서비스 이름이 한 값에서만 나오게 한다(Step 6).

R2 세션을 이어 가지 않는다(효율 규칙 3: 바로 다음 라운드까지만). 새 세션에 R2 보고 요약과 바뀐 점만 준다.
Run: `bash /Users/freelife/youtube/bts-samples/tools/run.sh nextflix R3 /Users/freelife/youtube/bts-samples/prompts/nextflix-R3.txt` (`run_in_background`)

- [ ] **Step 5: 다시 검사해 통과시킨다**

Step 3 명령을 다시 돌린다.
Expected: probe `PASS 8`, widths·axe·clean `PASS`, site-check 요약 깨진 링크 0·반응 없는 버튼 0. 통과하지 않으면 실패 목록으로 R4를 같은 방식으로 돌린다(R3 세션을 이어 간다).

- [ ] **Step 6: 이름 바꾸기 남김 검사(Review Focus 1)**

```bash
S=/Users/freelife/youtube/bts-samples/tutorials/nextflix
grep -rln --include='*.ts' --include='*.tsx' --include='*.json' 'Nextflix' $S/apps/web/src $S/apps/web/content 2>/dev/null
```
Expected: 서비스 이름 값이 있는 파일 1개. 그 파일을 복사본에서만 바꿔 내보내고 남은 이름을 센다.
```bash
T=$(mktemp -d)/nextflix; cp -Rc $S "$T"
F=$(grep -rln --include='*.ts' --include='*.json' '"Nextflix"' "$T/apps/web/src" | head -1); sed -i '' 's/"Nextflix"/"테스트플릭스"/' "$F"
BASE=/bts-starter-kit/nextflix bash /Users/freelife/youtube/bts-samples/tools/export.sh "$T" "$T-out" > /dev/null && grep -rl 'Nextflix' "$T-out" | head; echo "남은 파일: $(grep -rl 'Nextflix' "$T-out" | wc -l)"
```
Expected: `남은 파일: 0`. 0이 아니면 그 파일을 R4로 고친다.

- [ ] **Step 7: 리서치 값과 대조하고 라운드를 닫는다**

probe 결과와 리서치 06 3·4절 값(헤더, hover, 카드 수, 반경, 여백)을 대조표로 만든다. 대조표는 한 줄에 경로와 숫자를 둔다. R1~R3의 "팩에 없던 것"을 팩에 모두 반영했는지 확인하고 `pack-check.mjs`를 PASS로 만든다.

1440·390 스크린샷 몇 장과 대조표를 사용자에게 보여 확인을 받는다. 확인을 받으면 샘플 프로젝트 dev-cycle의 [confirm] 행을 적고 audit을 통과시켜 닫는다. 작업공간 프로젝트에도 커밋한다.

---

### Task 14: 교재 마무리(그림, 도식, 시간과 비용, 만든 기록)

**Files:**
- Create: `tutorials/01-nextflix/assets/nextflix-home-desktop.webp`, `nextflix-home-mobile.webp`, `nextflix-detail.webp`, `nextflix-comp-a.webp`, `-b`, `-c`, `pack-flow.svg`, `pack-flow@2x.webp`
- Modify: `tutorials/01-nextflix/README.md`, `03-design.md`, `04-screens.md`

- [ ] **Step 1: 샘플 화면을 찍는다**

Run: `node /Users/freelife/youtube/bts-samples/tools/qa.mjs shots http://localhost:8090/bts-starter-kit/nextflix /Users/freelife/youtube/bts-samples/shots/nextflix / /browse/ "/browse/?t=<대표 작품 slug>"`
1440과 390 화면을 `cwebp -q 80`으로 `assets/`에 넣는다. 시안 3장은 1200px로 줄여 `nextflix-comp-a/b/c.webp`로 넣는다. 첫 쪽 "무엇을 만드나요"와 3·4장 성공 항목에 그림을 단다.

- [ ] **Step 2: 도식을 그린다**

svg-infographic 스킬로 "자료 팩을 어느 장에서 쓰나요" 도식 1장을 그린다. `design-notes.md`는 3장에서, `screens.md`·`features.md`는 2장에서, `data`·그림은 4장에서, `features.md` 각 절은 5~10장에서 쓴다. 도식 속 문장은 writing-quality-editor로 다듬는다. 2배 PNG를 무손실 webp로 바꿔 `pack-flow@2x.webp`로 둔다(상위 설계 8절). 첫 쪽 "장별로" 위에 넣는다.

- [ ] **Step 3: 시간과 비용, 만든 기록을 채운다**

`python3 /Users/freelife/youtube/bts-samples/tools/round-timing.py /Users/freelife/youtube/bts-samples/logs/nextflix-R*.jsonl`과 `tut-result.py`로 R1~R3의 시간과 비용을 모은다. 첫 쪽 "시간과 비용"에는 4장까지 걸린 시간·비용 범위와 "그림은 팩에서 받는다"를 적는다.

"만든 기록"에는 아래를 적는다(상위 설계 9절).
- 작성 날짜, 대조한 bts-starter-kit 판(`git describe --tags`)
- 샘플은 2~4장 프롬프트를 그대로 넣어 팩만으로 만들었다는 점
- 5~12장은 실행해 확인하지 않았다는 점

- [ ] **Step 4: 그림 링크 검사**

Task 9 Step 3 검사를 다시 돌린다.
Expected: `PASS`

---

### Task 15: 독립 검토와 korean-skills

**Files:**
- Modify: `tutorials/01-nextflix/*.md`, `tutorials/01-nextflix/pack/*.md`, `tutorials/reference/glossary.md`

- [ ] **Step 1: 독립 검토를 한 번 한다**

critic 에이전트에게 사실과 절차만 검토하게 한다. 맡길 대상과 근거는 아래와 같다.
- 대상: 첫 쪽, 12장, 팩 문서
- 근거: 설계 두 문서, 루트 `AGENTS.md`, 템플릿 README, `bts-ui`·`bts-dev-cycle`·`bts-deploy` SKILL.md, 리서치 06

검토할 것:
- 프롬프트와 절차가 어긋나는 곳
- 값이 다른 곳
- 넷플릭스 브랜드 요소가 남은 곳
- 독자가 막힐 곳

지적을 모두 반영하거나, 반영하지 않으면 이유를 적는다.

- [ ] **Step 2: korean-skills 세 스킬을 파일마다 적용한다**

모두 18파일(첫 쪽 1, 장 12, 팩 문서 4(`design-notes.md`, `screens.md`, `features.md`, `SOURCES.md`), 용어집 1)을 네 묶음으로 나눈다. 용어집은 이번에 더한 항목만 본다. 파일마다 `humanizer` → `style-guide` → `grammar-checker` 순서로 적용한다. 제목, 링크, 코드 블록, 표 구조, 프롬프트 뜻은 바꾸지 않는다. 고친 곳 수를 보고에 적는다.

- [ ] **Step 3: 검사들을 다시 돌린다**

Run: Task 9 Step 3 검사, `node /Users/freelife/youtube/bts-samples/tools/pack-check.mjs /Users/freelife/youtube/bts-starter-kit/tutorials/01-nextflix/pack`
Expected: 둘 다 PASS

---

### Task 16: 포트폴리오 R17(교재 여러 권 싣기)

**Files:**
- Create: `/Users/freelife/youtube/bts-samples/prompts/portfolio-R17.txt`
- Modify(라운드가): `/Users/freelife/youtube/bts-samples/ws/portfolio/scripts/sync-tutorials.mjs`, `apps/web/src/lib/tutorials.ts`, `apps/web/src/app/tutorials/**`, 갤러리

**Interfaces:**
- Consumes: 저장소 `tutorials/`(Task 9~15 결과)
- Produces: `/tutorials/nextflix/`(첫 쪽), `/tutorials/nextflix/<장>/`, 허브 교재 카드, 갤러리 튜토리얼 샘플

- [ ] **Step 1: 라운드 프롬프트를 쓴다**

`prompts/portfolio-R17.txt`:
```
튜토리얼 원본에 두 번째 교재 tutorials/01-nextflix/(첫 쪽 README.md, 장 01~12, assets/, pack/)가 생겼다. 원본은 /Users/freelife/youtube/bts-starter-kit/tutorials 이다.
사이트 틀은 다시 설계하지 않는다. 지금 samples 교재의 첫 쪽·장 쪽·목차·이전/다음·프롬프트 카드를 그대로 써서 교재를 여러 권 싣게 넓힌다(좁은 개선, 구조 뽑기·시안 없음).
1. scripts/sync-tutorials.mjs 기본 원본 경로를 ../../../bts-starter-kit/tutorials 로 고친다. pack/ 아래 .md는 쪽으로 만들지 않는다.
2. src/lib/tutorials.ts의 COURSE 고정값을 교재 목록으로 바꾼다. 교재 폴더 01-nextflix의 주소는 /tutorials/nextflix/, 장은 /tutorials/nextflix/<장 파일 이름에서 번호와 .md를 뗀 것>/ 이다. 기존 /tutorials/samples/ 주소는 그대로 둔다.
3. 장 안의 pack/… 링크는 https://github.com/roadkwonai/bts-starter-kit/tree/main/tutorials/01-nextflix/pack/… (파일은 blob) 로, ../samples/assets/… 같은 다른 교재 그림 링크도 그대로 보이게 한다.
4. 허브 README.md의 교재 표에 새 줄이 있으면 카드로 낸다. 갤러리에 "튜토리얼 샘플" 묶음을 두고 Nextflix 샘플(https://roadkwonai.github.io/bts-starter-kit/nextflix/, 교재 첫 쪽 링크, assets/nextflix-home-*.webp)을 싣는다.
5. tutorials:check가 새 교재의 첫 쪽 표와 장 순서, 링크를 samples와 같은 규칙으로 검사하게 한다.
끝나면 tutorials:sync, tutorials:check, 빌드, 내보내기, 링크·버튼 검사, axe, 폭 검사를 하고 보고한다.
```

- [ ] **Step 2: 라운드를 돌리고 확인한다**

Run: `bash /Users/freelife/youtube/bts-samples/tools/run.sh portfolio R17 /Users/freelife/youtube/bts-samples/prompts/portfolio-R17.txt` (`run_in_background`)
이어서 `bash /Users/freelife/youtube/bts-samples/tools/publish-root.sh`로 내보낸 뒤, 아래 검사를 돌린다.
- `node /Users/freelife/youtube/bts-samples/tools/root-check.mjs /Users/freelife/youtube/bts-samples/shots/r17`
- `qa.mjs widths`와 `qa.mjs axe`. 대상 쪽은 `/tutorials/`, `/tutorials/nextflix/`, `/tutorials/nextflix/plan/`, `/tutorials/samples/`이다.

Expected:
- 모든 경로가 200이고 콘솔 오류가 0이다.
- 깨진 링크가 0이다(팩 링크는 GitHub 주소라 공개 전에는 404일 수 있으니 따로 센다).
- axe 0, 넘침 0이다.
- 기존 samples 쪽과 쪽 수가 그대로다.

- [ ] **Step 3: 사용자 확인 뒤 라운드를 닫는다**

허브, 교재 첫 쪽, 장 쪽 하나의 1440·390 스크린샷을 보여 확인을 받는다. 확인을 받으면 포트폴리오 dev-cycle의 [confirm] 행을 적고 audit을 통과시켜 닫는다. 작업공간에 커밋한다.

---

### Task 17: 공개(요청을 받은 뒤)

**Files:**
- Modify: `tutorials/README.md`(교재 목록), 루트 `README.md`("튜토리얼" 절, "릴리스" 절), 루트 `AGENTS.md`("버전과 릴리스"), `docs/superpowers/plans/2026-10-01-tutorials-roadmap.md`(1번 상태)

- [ ] **Step 1: 문서를 고친다**

- `tutorials/README.md` 교재 목록에 "넷플릭스 같은 영상 구독 서비스 만들기(Nextflix)" 줄을 넣는다.
- 루트 `README.md` "튜토리얼" 절에도 같은 줄을 넣는다.
- 루트 `AGENTS.md` "버전과 릴리스"에 아래 항목을 더한다. README "릴리스" 절에는 같은 뜻을 사용자용 말로 한 문단 쓴다.

```markdown
- 튜토리얼 자료 팩의 그림 묶음은 `v*`와 따로 팩 릴리스로 올린다. 태그는 `pack-<slug>-<판>`(예: `pack-nextflix-1`), 첨부는 `<slug>-images.zip` 하나다. `gh release create <태그> <zip> --target main --latest=false --title "<slug> 자료 팩 그림 <판>" --notes "<무엇이 들었나>"`로 올리고, 노트 파일과 `chore(release)` 커밋은 만들지 않는다. `scripts/release.mjs`는 `v[0-9]*` 태그만 보므로 버전 계산에 섞이지 않는다. 올린 뒤 받은 zip의 sha256이 팩 `images.json`과 같은지 확인한다. 그림을 바꾸면 판을 올려 새 태그로 올리고 `images.json`을 바꾼다. 이미 올린 판은 덮어쓰지 않는다.
```

- 로드맵 1번 상태를 "공개(날짜, 버전)"로 바꾸고, 서비스별 체크리스트를 1번 절로 복사해 체크한다.

- [ ] **Step 2: 커밋한다(사용자 요청 뒤)**

이번 묶음과 앞서 커밋하지 않은 카탈로그 보완 9파일을 주제별로 나눠 커밋한다(Conventional Commits, 본문은 `- ` 요약).
```bash
cd /Users/freelife/youtube/bts-starter-kit && set -a; . /Users/freelife/youtube/.envrc; set +a
node --test 'templates/bts-next-neon/tests/*.test.mjs' && node --test 'templates/bts-next-supabase/tests/*.test.mjs'
git add templates README.md && git commit -m "feat: bts-ui가 디자인 카탈로그 세 곳을 늘 찾게 보완"
git add docs/superpowers && git commit -m "docs: Nextflix 튜토리얼 설계와 실행 계획, 자료 팩 방식"
git add tutorials AGENTS.md README.md && git commit -m "feat: Nextflix 튜토리얼과 자료 팩"
```
템플릿 테스트는 두 템플릿 모두 통과해야 한다. 커밋 묶음은 실제 변경을 보고 다시 나눈다(루트 `README.md`는 카탈로그 보완과 튜토리얼 줄이 섞여 있으면 `git add -p`로 나눈다). 추적하지 않는 `.claude/settings.json`은 누가 만든 파일인지 사용자에게 묻고, 답을 받기 전에는 넣지 않는다.

- [ ] **Step 3: 팩 릴리스를 올리고 확인한다**

```bash
set -a; . /Users/freelife/youtube/.envrc; set +a
gh release create pack-nextflix-1 /Users/freelife/youtube/bts-samples/research/nextflix/pack-images/nextflix-images.zip --repo roadkwonai/bts-starter-kit --target main --latest=false --title "nextflix 자료 팩 그림 1" --notes "Nextflix 튜토리얼 자료 팩 그림 112장(webp). AI로 만든 가상 작품 그림이에요. 목록과 sha256은 tutorials/01-nextflix/pack/images.json."
Z=$(mktemp -d)/nf.zip; curl -sL -o "$Z" https://github.com/roadkwonai/bts-starter-kit/releases/download/pack-nextflix-1/nextflix-images.zip && shasum -a 256 "$Z" && grep sha256 /Users/freelife/youtube/bts-starter-kit/tutorials/01-nextflix/pack/images.json && gh release view --repo roadkwonai/bts-starter-kit --json tagName,isLatest -q '.tagName+" latest="+(.isLatest|tostring)' pack-nextflix-1
```
Expected:
- 두 sha256이 같다.
- `pack-nextflix-1 latest=false`가 나온다.
- 최신 `v*` 릴리스가 계속 Latest다.

- [ ] **Step 4: `main` 릴리스와 gh-pages를 올린다**

`node scripts/release.mjs --title "Nextflix tutorial and asset pack"` → korean-skills 검수(AGENTS.md 2단계) → `node scripts/release.mjs --publish <노트>` 순서로 한다. gh-pages 작업 트리(`/Users/freelife/youtube/bts-samples/pages/bts-starter-kit`)에는 Task 13 내보내기(`nextflix/`)와 Task 16 `publish-root.sh` 결과가 들어 있다. 여기에 브랜치 `README.md` 표 줄을 더해 커밋하고 push한다. 이 명령들도 `.envrc`를 먼저 불러온다.

- [ ] **Step 5: 공개 사이트를 확인한다**

`https://roadkwonai.github.io/bts-starter-kit/nextflix/`, `/tutorials/`, `/tutorials/nextflix/`가 200인지 확인한다. 장 쪽의 팩 링크가 GitHub에서 열리는지도 본다. 사용자에게 공개 주소를 알리고, 로드맵 1번 상태와 이 계획의 체크를 마무리한다.
