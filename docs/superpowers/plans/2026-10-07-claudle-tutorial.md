# Claudle 튜토리얼 실행 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Claude를 본뜬 클론코딩 튜토리얼 2번(Claudle)의 프리셋 팩, 튜토리얼 첫 쪽과 12장, 팩만으로 만든 프리셋 사이트, 사이트 반영까지 만든다.

**Architecture:** 리서치(`../pro-kit-samples/research/claude/`)를 프리셋 팩(`../pro-kit-samples/packs/claudle/`)으로 묶고, 팩은 zip 하나로 `roadkwon-ai/pro-kit-packs` 릴리스 `pack-claudle`에 올린다. 튜토리얼 프롬프트는 값 없이 팩을 가리킨다. 프리셋은 튜토리얼 2~4장 프롬프트를 그대로 헤드리스 라운드에 넣어 팩만으로 만들고, 그 과정에서 팩의 빈 곳을 고친다. 마지막에 포트폴리오의 "유명 서비스 클론하기"에 두 번째 카드를 더한다.

**Tech Stack:** Node 24(검사 스크립트, 의존성 없음 또는 `../pro-kit-samples/tools/node_modules`의 `playwright-core`), gpt-image Codex 브리지(ChatGPT 로그인)와 `cwebp`, Next.js 16.4 BTS 프로젝트(프리셋), AI SDK 7(`ai` 7.0.130, `@ai-sdk/react` 4.0.133)과 Streamdown 2.7(5장부터와 4장 화면), `gh` CLI(팩 릴리스).

**Spec:** [Claudle 튜토리얼 설계](../specs/2026-10-07-claudle-tutorial-design.md), 앞선 [Nextflix 설계](../specs/2026-10-05-nextflix-tutorial-design.md)와 [Nextflix 계획](2026-10-05-nextflix-tutorial.md)

## Global Constraints

- Claude·Anthropic 이름과 워드마크, 스파크 마크, 클레이 `#d97757`·`#c6613f`, Anthropic Serif/Sans/Mono, Claude의 화면 문구와 손그림을 저장소, 팩, 프리셋 어디에도 쓰지 않는다. 강조색은 벽돌 주황 `#BF4F2C`(다크 강조 글자 `#E0794A`), 서체는 Source Serif 4(영문·숫자·인사말·로고) + Pretendard(한글·본문) + JetBrains Mono(코드), 로고는 서비스 이름 글자, 아이콘은 lucide다.
- 모델 이름은 가상이다: `Quick`, `Balanced`, `Deep`(그리고 키가 없을 때 `모의 응답`). Fable·Opus·Sonnet·Haiku를 쓰지 않는다. `Quick`만 고를 수 있고(키가 있으면 Kilo `kilo-auto/free`), `Balanced`·`Deep`은 잠금 표시와 함께 누르면 `/upgrade`로 간다.
- 안내 문구는 정확히 "Claude와 관계없는 연습용 서비스예요. 데이터는 모두 예시예요."다.
- 튜토리얼 프롬프트에 색, 크기, 시간 같은 값을 넣지 않고 프리셋 팩을 가리킨다. 바꿀 곳은 `[claudle]`(폴더), `[Claudle]`(서비스 이름) 괄호로 표시한다. 한 블록은 10줄 이내.
- 팩 경로: 원본 `/Users/freelife/youtube/pro-kit-samples/packs/claudle/`, 독자 쪽 `pro-kit/packs/claudle`(`node scripts/pack.mjs claudle`로 받는다). 팩은 `main`에 넣지 않는다. 릴리스와 `tutorials/packs.json` 갱신은 루트 `AGENTS.md` "버전과 릴리스"의 팩 절차를 따른다.
- Refero 원문, Claude 스크린샷(`research/claude/shots/`), 리서치 실측 원본은 저장소, 팩, 사이트에 넣지 않는다.
- 그림은 gpt-image 스킬의 ChatGPT 로그인 Codex 브리지로만 그린다: `env -u OPENAI_API_KEY node /Users/freelife/.claude/skills/gpt-image/scripts/gpt_image.mjs batch --manifest <json> --concurrency 4`(작업 디렉터리 `/Users/freelife/youtube/pro-kit-samples`). `OPENAI_API_KEY`를 쓰거나 출력하지 않는다.
- git과 gh 명령 앞에는 `set -a; . /Users/freelife/youtube/.envrc; set +a`를 붙인다(roadkwonai). 토큰 값은 출력하지 않는다.
- pro-kit `main`에는 커밋만 한다. push, 팩 릴리스, gh-pages 배포는 사용자가 지시할 때만 한다. `main` push는 `node scripts/release.mjs` 절차로만 한다.
- 셸 작업 디렉터리를 `templates/`나 `tutorials/` 안에 두지 않는다. 명령은 절대 경로로 한다.
- 헤드리스 라운드는 `tools/run.sh`로 돌리고, 라운드마다 `tools/stall-watch.mjs`를 함께 띄운다. 감시가 WAIT·LONG·IDLE을 알리면 바로 사용자에게 무엇을 기다리는지 알리고 판단을 받는다. 포트는 `tools/port.sh claudle`이 정한다.
- 올곧(학원 프리셋)과 동시에 진행한다. pro-kit `main` 커밋, 포트폴리오 데이터, gh-pages, 팩 릴리스는 한 세션에서 차례로 한다(`../pro-kit-samples/notes/2026-10-07-preset-parallel.md`).
- 튜토리얼 문체는 해요체, 문장은 짧게, 한 문단 세 문장 이내. 끝에 korean-skills 세 스킬(humanizer → style-guide → grammar-checker)을 거친다.
- 프리셋은 정적 내보내기다. 예시 대화는 `/chat/[id]`를 `generateStaticParams`(`dynamicParams = false`)로 내고, 새 대화는 `/chat/new` 한 쪽에서 id를 `localStorage`에 둔다. 모의 응답은 `useChat` + 직접 만든 `ChatTransport`(서버 없음)로 흘린다. 마크다운은 Streamdown.
- 5장부터의 코드는 AI SDK 7 이름을 쓴다: `MockLanguageModelV4`(`ai/test`), `simulateReadableStream`, `toUIMessageStream({ stream: result.stream })`, `instructions:`. oRPC는 템플릿 판(1.15.x)의 `streamToEventIterator`·`eventIteratorToUnproxiedDataStream`. AI 연결은 Kilo AI Gateway다(설계 6.5절): `createOpenAI({ baseURL: "https://api.kilo.ai/api/gateway", apiKey: process.env.KILO_API_KEY })`의 `.chat("kilo-auto/free")`(`@ai-sdk/openai` 4.0.86). 키 유무는 `process.env.KILO_API_KEY`로 먼저 고른다. Vercel AI Gateway와 `AI_GATEWAY_API_KEY`는 쓰지 않는다. 중지된 답은 `totalUsage`를 기다리지 않고 저장한다(리서치 `05` 0절 4·7번).
- 사용량 한도는 키가 있을 때만, 서비스 전체 하루 답 200회(한국 시각 0시에 다시 센다)다. 200회가 차거나 Kilo가 429(`APICallError.isInstance(e) && e.statusCode === 429`)를 주면 답 자리에 정확히 "오늘 쓸 수 있는 사용량을 다 썼어요. 내일 다시 쓸 수 있어요."를 보인다. 저장하지 않고 다시 시도 버튼도 없다. 429는 `toUIMessageStream({ onError })`에서 이 문구로 바꾼다.
- 키가 있을 때 입력창 아래 안내는 정확히 "무료 모델은 공급자가 대화를 기록할 수 있어요. 개인 정보는 넣지 마세요."다.
- `KILO_API_KEY` 값은 출력, 커밋, 팩, 정적 내보내기 어디에도 남기지 않는다. 코디네이터의 키는 `/Users/freelife/youtube/pro-kit/.env`에 있고, 쓸 때는 그 줄만 불러온다(`set -a; . <(grep '^KILO_API_KEY=' /Users/freelife/youtube/pro-kit/.env); set +a`).
- 프리셋의 대화는 `NEXT_PUBLIC_RELAY_URL`이 있으면 `DefaultChatTransport({ api: <릴레이>/api/chat })`로 릴레이 서버(설계 6.6절)를 부르고, 없으면 모의 `ChatTransport`를 쓴다. 답 메타데이터 `provider`는 화면에 보이지 않아도 된다. 릴레이와 프리셋 배포는 사용자가 올리라고 할 때만 한다.
- 제작 표시(필수, 사용자 결정 2026-10-07): 소개(`/`)·요금제 푸터와 앱 사이드바 맨 아래(모바일 시트 포함)에 `<ProkitCredit />`(템플릿 `apps/web/src/components/prokit-credit.tsx`)를 둔다. `pnpm export:html`은 첫 페이지에 없으면 exit 3이다.
- 튜토리얼 5장부터는 끝까지 실행해 확인하지 않는다. 첫 쪽 "만든 기록"에 이 확인 범위를 밝힌다.

## Review Focus

1. 한글 입력 중 Enter: 한글을 조합하는 동안 누른 Enter(`isComposing`)로 메시지가 보내지면 안 된다. Shift+Enter는 줄바꿈이다(Task 12 probe 1번).
2. 스트리밍 중지: 답이 흐르는 중 Esc나 중지 버튼을 누르면 그 자리에서 멈추고, 나온 글은 남고, 입력창이 다시 쓸 수 있고, "생각 중"이 남지 않아야 한다(Task 12 probe 2번).
3. 없는 대화 주소와 새로고침: `/chat/없는-id/`는 404 쪽이 나오고 페이지 오류가 없어야 한다. `/chat/new/`에서 보낸 대화는 새로고침해도 남아야 한다(Task 12 probe 3·5번).
4. 아티팩트 격리: 대화 안 위젯과 뷰어의 `iframe`은 부모의 `localStorage`를 읽지 못해야 한다(`sandbox`에 `allow-same-origin` 없음)(Task 12 probe 6번).
5. 이름 바꾸기와 키보드: 서비스 이름이 `site.json` 한 값에서만 나와야 하고(Task 12 Step 6), ⌘K로 연 검색 창을 Esc로 닫으면 초점이 원래 자리로 돌아와야 한다(Task 12 probe 4번).

---

## 파일 구조

저장소(`/Users/freelife/youtube/pro-kit`):

| 경로 | 할 일 |
|---|---|
| `tutorials/02-claudle/README.md` | 첫 쪽 |
| `tutorials/02-claudle/01-create-project.md` … `12-deploy.md` | 장 12개 |
| `tutorials/02-claudle/assets/` | 프리셋 스크린샷, 고른 시안(webp) |
| `tutorials/reference/glossary.md` | 새 용어(스트리밍, 모의 응답, 아티팩트, 시스템 지침 등) |
| `tutorials/packs.json` | `claudle` 항목(릴리스 뒤) |
| `tutorials/README.md` | 튜토리얼 목록 행(공개할 때) |
| `docs/superpowers/plans/2026-10-01-tutorials-roadmap.md` | 진행표 10번 상태 |

작업공간(`/Users/freelife/youtube/pro-kit-samples`, 저장소 밖):

| 경로 | 할 일 |
|---|---|
| `tools/claudle-pack-check.mjs` | 팩 구성·데이터·브랜드 검사(새로 만듦) |
| `tools/claudle-probe.mjs` | 프리셋 상호작용 검사(새로 만듦) |
| `tools/publish-root.sh` | KEEP 목록에 `claudle`, `olgot` |
| `tutorials/claudle/` | 프리셋 프로젝트(템플릿으로 새로 만듦) |
| `packs/claudle/` | 팩 원본: `design-notes.md`, `screens.md`, `features.md`, `SOURCES.md`, `images.json`, `data/*.json`, `wireframes/*.svg`, `images/*.webp`, `shots/*.webp` |
| `research/claude/pack-images/` | 그림 manifest, 원본 PNG, 자른 webp |
| `research/claude/names-check.md`, `design-check/` | 이름 겹침 재확인, DESIGN.md 받아 고친 확인본 |
| `prompts/claudle-R1.txt` … | 라운드 프롬프트 |

---

### Task 1: 프리셋 프로젝트와 팩 폴더 준비

**Files:**
- Create: `/Users/freelife/youtube/pro-kit-samples/tutorials/claudle/`(템플릿 새 프로젝트)
- Create(빈 폴더): `/Users/freelife/youtube/pro-kit-samples/packs/claudle/{data,wireframes,images,shots}`
- Modify: `/Users/freelife/youtube/pro-kit-samples/tools/publish-root.sh`(KEEP 줄)

**Interfaces:**
- Produces: `run.sh claudle <step> <prompt>`가 `tutorials/claudle`에서 돈다(`run.sh` 4행이 `ws/` 다음 `tutorials/`를 찾는다). 포트는 `port.sh claudle`.

- [ ] **Step 1: 대상이 비어 있는지 본다**

Run: `ls -d /Users/freelife/youtube/pro-kit-samples/tutorials/claudle /Users/freelife/youtube/pro-kit-samples/packs/claudle 2>&1`
Expected: 둘 다 `No such file or directory`. 있으면 멈추고 묻는다.

- [ ] **Step 2: 템플릿으로 프로젝트를 만든다(백그라운드, 수 분)**

```bash
cd /Users/freelife/youtube/pro-kit-samples/tutorials && pnpm create better-t-stack@latest claudle \
  --frontend next --backend self --runtime none \
  --database postgres --orm drizzle --db-setup docker \
  --auth better-auth --payments none --api orpc \
  --addons turborepo biome --examples none \
  --web-deploy none --server-deploy none \
  --package-manager pnpm --git --install \
  && bash /Users/freelife/youtube/pro-kit/templates/prokit-next-neon/install.sh /Users/freelife/youtube/pro-kit-samples/tutorials/claudle
```
로그는 `/Users/freelife/youtube/pro-kit-samples/logs/claudle-create.log`로 보낸다. 튜토리얼 1장이 DB까지 준비하지만 프리셋은 2~4장(화면)만 만들므로 DB를 띄우지 않고 첫 마이그레이션도 하지 않는다.

- [ ] **Step 3: 검사하고 첫 커밋을 한다**

```bash
W=/Users/freelife/youtube/pro-kit-samples/tutorials/claudle
pnpm --dir $W check && pnpm --dir $W skills:check && pnpm --dir $W agents:check && pnpm --dir $W check-types && (cd $W && pnpm exec biome check .)
(cd $W && .agents/skills/impeccable/scripts/impeccable hooks on)
set -a; . /Users/freelife/youtube/.envrc; set +a
git -C $W add -A && git -C $W reset -q .claude/settings.local.json; git -C $W commit -q -m "chore: dev-cycle 하네스와 프로젝트 규칙 초기 설정"
```
Expected: 검사 다섯 개 exit 0, `.claude/settings.local.json`의 훅 명령이 `…/scripts/impeccable" hook`, 커밋 하나.

- [ ] **Step 4: 팩 폴더와 KEEP 목록**

```bash
mkdir -p /Users/freelife/youtube/pro-kit-samples/packs/claudle/{data,wireframes,images,shots}
sed -i '' 's/ nextflix README.md / nextflix claudle olgot README.md /' /Users/freelife/youtube/pro-kit-samples/tools/publish-root.sh
bash -n /Users/freelife/youtube/pro-kit-samples/tools/publish-root.sh && grep -c ' claudle olgot ' /Users/freelife/youtube/pro-kit-samples/tools/publish-root.sh
/Users/freelife/youtube/pro-kit-samples/tools/port.sh claudle
```
Expected: `1`, 그리고 포트 번호(3111 근처, 이미 쓰는 번호가 아님).

---

### Task 2: 팩 검사 도구

**Files:**
- Create: `/Users/freelife/youtube/pro-kit-samples/tools/claudle-pack-check.mjs`

**Interfaces:**
- Consumes: Task 3~7이 만들 팩 파일. 데이터 모양은 Task 3의 스키마다.
- Produces: `node claudle-pack-check.mjs <pack-dir>`. 문제가 있으면 한 줄에 하나씩 쓰고 exit 1, 없으면 `PASS`와 개수 요약을 쓰고 exit 0.

- [ ] **Step 1: 검사 도구를 쓴다**

```js
// usage: node claudle-pack-check.mjs <pack-dir> — Claudle 프리셋 팩의 구성, 데이터 규칙, 브랜드 대체를 검사한다. 문제가 있으면 exit 1
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

const NOTICE = "Claude와 관계없는 연습용 서비스예요. 데이터는 모두 예시예요.";
const DOCS = ["design-notes.md", "screens.md", "features.md", "SOURCES.md", "images.json"];
const DATA = ["site.json", "conversations.json", "mock-replies.json", "projects.json", "artifacts.json", "scheduled.json", "customize.json", "settings.json"].map((f) => `data/${f}`);
const WIREFRAMES = ["new-1440", "chat-1440", "chat-390", "sidebar-390", "search", "project", "intro"].map((n) => `wireframes/${n}.svg`);
for (const f of [...DOCS, ...DATA, ...WIREFRAMES]) need(fs.existsSync(path.join(dir, f)), `없음: ${f}`);
finish();

const site = json("data/site.json");
const convs = json("data/conversations.json");
const mock = json("data/mock-replies.json");
const projects = json("data/projects.json");
const artifacts = json("data/artifacts.json");
const scheduled = json("data/scheduled.json");
const customize = json("data/customize.json");
const settings = json("data/settings.json");
const images = json("images.json");
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// site.json
need(typeof site.name === "string" && site.name.length > 0, "site.name이 비었다");
need(site.notice === NOTICE, "site.notice가 안내 문구와 다르다");
need(JSON.stringify(site.models?.map((m) => m.id)) === '["quick","balanced","deep"]', "모델은 quick·balanced·deep 3개");
for (const m of site.models ?? []) need(m.name && m.desc && typeof m.locked === "boolean", `모델 ${m.id}: name·desc·locked`);
need(JSON.stringify(site.models?.filter((m) => !m.locked).map((m) => m.id)) === '["quick"]', "잠그지 않은 모델은 quick 하나");
need(JSON.stringify(site.plans?.map((p) => p.id)) === '["free","plus","max"]', "요금제는 free·plus·max");
need(site.plans?.[0]?.priceUsd === 0 && site.plans[1].priceUsd < site.plans[2].priceUsd, "요금제 가격: free 0, plus < max");
need(site.user?.email?.endsWith("@example.com") && site.user.avatar === "avatar.webp", "예시 사용자: example.com 메일, avatar.webp");
need(site.greetings?.length >= 3 && site.greetings.every((g) => g.includes("{user}")), "인사말 3개 이상, {user} 자리");

// conversations.json
const GROUPS = new Set(["today", "yesterday", "week", "older"]);
const convIds = new Set();
let users = 0;
let assistants = 0;
const allText = [];
for (const c of convs) {
	const at = `대화 ${c.id}`;
	need(SLUG.test(c.id ?? "") && !convIds.has(c.id), `${at}: id 형식·중복`);
	convIds.add(c.id);
	need(c.title && GROUPS.has(c.group) && typeof c.pinned === "boolean" && !Number.isNaN(Date.parse(c.updatedAt)), `${at}: title·group·pinned·updatedAt`);
	need(c.messages?.length >= 2 && c.messages.length % 2 === 0, `${at}: 메시지는 짝수(질문·답)`);
	c.messages?.forEach((m, i) => {
		need(m.role === (i % 2 === 0 ? "user" : "assistant") && m.text, `${at}: ${i}번 메시지 역할 순서·글`);
		if (m.role === "user") users++;
		else {
			assistants++;
			need(["quick", "balanced", "deep"].includes(m.model), `${at}: ${i}번 답의 model`);
		}
		allText.push(m.text);
	});
}
need(convs.length === 9, `대화 ${convs.length}개 (9개여야 함)`);
need(convs.filter((c) => c.pinned).length === 1, "고정한 대화는 하나");
need(users === 22 && assistants === 22, `질문 ${users}, 답 ${assistants} (각 22여야 함)`);
need(convs.some((c) => c.messages.length >= 16), "8턴 이상인 긴 대화가 하나 있다");
const joined = allText.join("\n");
for (const [what, re] of [["표", /\n\|[- :|]+\|\n/], ["sql 코드", /`{3}sql\n/], ["tsx 코드", /`{3}tsx\n/], ["html 위젯", /`{3}html\n/], ["인용", /\n> /], ["번호 목록", /\n1\. /], ["구분선", /\n---\n/], ["h3", /\n### /]])
	need(re.test(joined), `대화 글에 ${what}가 없다`);
const attachments = convs.flatMap((c) => c.messages.flatMap((m) => m.attachments ?? []));
need(attachments.some((a) => a.kind === "image") && attachments.some((a) => a.kind === "file"), "이미지 첨부와 파일 첨부가 하나씩은 있다");

// mock-replies.json
need(mock.rules?.length === 5 && mock.rules.every((r) => r.keywords?.length && r.reply), "모의 응답 규칙 5개(keywords·reply)");
need(mock.fallback?.length === 3 && mock.fallback.every(Boolean), "모의 응답 기본 답 3개");
need(mock.thinking?.length >= 3, "생각 중 상태 글자 3개 이상");

// projects.json, artifacts.json, scheduled.json, customize.json, settings.json
need(projects.length === 6 && new Set(projects.map((p) => p.id)).size === 6, "프로젝트 서로 다른 6개");
for (const p of projects) {
	need(p.name && p.description && (p.instructions ?? "").length <= 8000, `프로젝트 ${p.id}: name·description·지침 8000자`);
	for (const id of p.chatIds ?? []) need(convIds.has(id), `프로젝트 ${p.id}: 없는 대화 ${id}`);
}
const KINDS = new Set(["slides", "doc", "web", "sheet", "code"]);
need(artifacts.length === 8 && new Set(artifacts.map((a) => a.id)).size === 8, "아티팩트 서로 다른 8개");
for (const a of artifacts) need(KINDS.has(a.kind) && /^\d{4}-\d{2}$/.test(a.month) && a.thumb && convIds.has(a.chatId), `아티팩트 ${a.id}: kind·month·thumb·chatId`);
need(artifacts.some((a) => a.kind === "web" && a.html?.includes("<")), "web 아티팩트에 html이 있다");
need(scheduled.length === 6 && scheduled.every((s) => s.title && s.description && s.schedule), "예약 작업 예시 6개");
need(customize.length >= 8 && new Set(customize.map((s) => s.id)).size === customize.length && customize.every((s) => s.name && s.description && s.author), "사용자 지정 항목 8개 이상");
need(JSON.stringify(Object.keys(settings)) === '["account","privacy","billing","usage","features","memory","retro","focus"]', "settings.json 탭 8개 순서");

// images.json과 images/
const referenced = new Set([
	site.user?.avatar,
	...attachments.map((a) => a.image),
	...artifacts.flatMap((a) => [a.thumb, a.preview].filter(Boolean)),
	...["login-side", "intro-product", "plan-free", "plan-plus", "plan-max", "empty-activity", "empty-scheduled", "empty-projects", "empty-search", "downloads-docs", "downloads-browser", "customize-banner"].map((n) => `${n}.webp`),
]);
need(images.files?.length === referenced.size && images.files.every((f) => referenced.has(f)), `images.json 목록이 데이터가 가리키는 그림 ${referenced.size}장과 다르다`);
for (const f of referenced) {
	const p = path.join(dir, "images", f);
	need(fs.existsSync(p) && fs.statSync(p).size <= 250_000, `images/${f}: 없거나 250KB 넘음`);
}

// design-notes.md
const notes = read("design-notes.md");
for (const s of ["47cb86b6-cb2d-41c8-94ba-8607cd7c41cd", "d469cba4-c448-4a43-a033-883f8bfcdc42", "#BF4F2C", "#E0794A", "Source Serif 4", "Pretendard", "JetBrains Mono", "받은 뒤 고칠 것", "lint"])
	need(notes.includes(s), `design-notes.md에 "${s}"가 없다`);

// 브랜드: 원래 색·서체는 고칠 것을 적는 두 문서 밖에 없어야 하고, 데이터·배치도에는 원래 이름과 모델 이름이 없어야 한다
for (const f of fs.readdirSync(dir, { recursive: true })) {
	const file = String(f);
	if (!/\.(md|json|svg)$/.test(file) || ["design-notes.md", "SOURCES.md"].includes(file)) continue;
	const text = read(file).toLowerCase();
	need(!/d97757|c6613f|anthropic (serif|sans|mono)/.test(text), `${file}: 원래 브랜드 색·서체`);
}
for (const f of [...DATA, ...WIREFRAMES]) {
	const text = f === "data/site.json" ? JSON.stringify({ ...site, notice: "" }) : read(f);
	need(!/claude|anthropic|클로드|앤트로픽/i.test(text), `${f}: 원래 서비스 이름`);
	need(!/\b(fable|opus|sonnet|haiku)\b/i.test(text), `${f}: 원래 모델 이름`);
}

finish();
console.log(`PASS 대화 ${convs.length}(질문 ${users}), 프로젝트 ${projects.length}, 아티팩트 ${artifacts.length}, 그림 ${referenced.size}`);
```

- [ ] **Step 2: 빈 팩에서 실패하는지 본다**

Run: `node /Users/freelife/youtube/pro-kit-samples/tools/claudle-pack-check.mjs /Users/freelife/youtube/pro-kit-samples/packs/claudle`
Expected: `없음: design-notes.md` … `없음: wireframes/intro.svg` 20줄, `FAIL 20`, exit 1

---

### Task 3: 예시 데이터

**Files:**
- Create: `packs/claudle/data/site.json`, `conversations.json`, `mock-replies.json`, `projects.json`, `artifacts.json`, `scheduled.json`, `customize.json`, `settings.json`

**Interfaces:**
- Consumes: 리서치 `06` 5.2절(대체표), 6절(데이터 계획), `05` 10절(답 유형 비율), `04` "넣을 만한 규칙 후보"
- Produces: 스키마(Task 2가 검사, Task 6 `screens.md`가 인용, 프리셋 라운드가 읽음)
  - `site.json` = `{ name: "Claudle", notice, greetings: ["{user}님, 오늘은 무엇을 해볼까요?", …], placeholder, user: { name, email, avatar: "avatar.webp" }, models: [{ id: "quick"|"balanced"|"deep", name: "Quick"|"Balanced"|"Deep", desc, locked: boolean }], plans: [{ id: "free"|"plus"|"max", name, priceUsd, features: [] }], shortcuts: [{ keys, label }] }`
  - `conversations.json` = `[{ id, title, group: "today"|"yesterday"|"week"|"older", pinned, updatedAt, projectId: string|null, messages: [{ id, role, text, model?, attachments?: [{ kind: "image"|"file", name, image }] }] }]`
  - `mock-replies.json` = `{ rules: [{ id, keywords: [], reply }], fallback: [3개], thinking: [상태 글자] }`
  - `projects.json` = `[{ id, name, description, updatedAt, instructions, files: [{ name, kind, sizeKb }], chatIds: [] }]`
  - `artifacts.json` = `[{ id, title, kind, month, chatId, thumb, preview?, html? }]`
  - `scheduled.json` = `[{ id, title, description, schedule }]`, `customize.json` = `[{ id, name, description, author, installs, body }]`, `settings.json` = `{ account, privacy, billing, usage, features, memory, retro, focus }`(탭마다 화면에 보이는 행 배열)

- [ ] **Step 1: `site.json`을 쓴다**

`name`은 `"Claudle"`(이름을 바꾸는 한 값), `notice`는 Global Constraints의 문구. 인사말 3개와 입력창 안내 문구는 Claude 문구가 아닌 새 문장으로 쓴다. 예시 사용자는 `{ "name": "예시 사용자", "email": "me@example.com", "avatar": "avatar.webp" }`. 모델 설명은 한 줄(예: Quick "무료로 쓰는 빠른 답", Balanced "일상 작업에 알맞은 답", Deep "어려운 문제를 오래 생각한 답"). `locked`는 quick만 `false`, balanced·deep은 `true`. 요금제 가격은 가상 값 `0`, `12`, `60`(달러)이고 기능 줄은 리서치 `01` 2절 구성을 바꿔 쓴다. 단축키는 리서치 `02` 28절의 15행을 우리 이름으로 옮긴다.

- [ ] **Step 2: `conversations.json`을 쓴다**

리서치 `06` 6.1절 9개 대화(`jeju-trip` 고정, `sql-slow`, `react-state`, `meeting-notes`, `landing-copy`, `english-email`, `reading-club`, `pasta-recipe`, `long-chat`)를 그대로 쓴다. 질문과 답 각 22개. 답은 마크다운으로 직접 쓰고, 표·`sql`·`tsx`·인용·번호 목록·구분선·h3가 한 번씩은 나오게 한다. `react-state`나 `landing-copy`의 답 하나에 ```` ```html ```` 카운터 위젯(버튼 하나와 숫자, 외부 요청 없음)을 넣는다. `meeting-notes`는 파일 첨부(`{ "kind": "file", "name": "회의록.pdf", "image": "thumb-report.webp" }`), `landing-copy`는 이미지 첨부(`photo-jeju.webp`), `reading-club`이나 `english-email`에 손글씨 메모 사진(`photo-memo.webp`)을 붙인다. 실존 인물·회사·브랜드 이야기는 넣지 않는다. 답의 `model`은 대부분 `balanced`, 코드 답은 `deep`, 짧은 답은 `quick`.

- [ ] **Step 3: 나머지 데이터를 쓴다**

- `mock-replies.json`: 리서치 `06` 6.3절의 키워드 5분기(코드·SQL·함수·에러·버그 / 표·비교·차이 / 일정·계획·추천·목록 / 요약·정리·회의 / 그 밖), 각 규칙의 `reply`는 해당 대화 답을 바탕으로 새로 쓴다. `fallback` 3개, `thinking`은 "질문을 살펴보는 중", "답을 정리하는 중", "예시를 고르는 중" 같은 새 문구.
- `projects.json`: 6개(여행 계획, 가계부 정리, 블로그 글감, 영어 공부, 사이드 프로젝트 아이디어, 독서 노트). 설명 길이를 1~3줄로 다르게. `jeju-trip`은 여행 계획 프로젝트의 `chatIds`에 넣는다.
- `artifacts.json`: 8개(월별 2~3개). `thumb`는 `thumb-slides.webp`, `thumb-report.webp`, `thumb-web.webp` 중 하나, 큰 미리 보기는 `preview`(`preview-slides.webp`, `preview-report.webp`, `preview-web.webp`). `web` 하나는 `html`에 Step 2의 카운터와 같은 코드.
- `scheduled.json` 6개, `customize.json` 8개(가상 작성자 이름, 설치 수), `settings.json` 8탭(리서치 `02` 24절의 섹션과 행 라벨을 우리 말로 옮기고 값은 가상).

- [ ] **Step 4: 데이터 부분이 통과하는지 본다**

Run: `node /Users/freelife/youtube/pro-kit-samples/tools/claudle-pack-check.mjs /Users/freelife/youtube/pro-kit-samples/packs/claudle 2>&1 | grep -v -E '^없음: (design-notes|screens|features|SOURCES|images)|^없음: wireframes|images\.json|images/' | tail -5`
Expected: 남은 줄이 `FAIL n` 하나뿐이다(문서·배치도·그림이 아직 없어서). 데이터 규칙 위반 줄이 있으면 데이터를 고친다.

---

### Task 4: 그림과 `images.json`

**Files:**
- Create: `research/claude/pack-images/manifest.json`, `src/*.png`, `packs/claudle/images/*.webp`, `packs/claudle/images.json`

**Interfaces:**
- Consumes: 리서치 `06` 7절, Task 3의 그림 이름
- Produces: `images.json` = `{ files: [이름…], note }`. 그림은 팩 zip 안 `images/`에 들어간다(별도 그림 릴리스 없음).

- [ ] **Step 1: manifest를 쓴다**

그림 21장(원본 18장 + 큰 미리 보기 3장은 썸네일 원본에서 자름): `login-side`(4:5), `intro-product`(625×716 비율, 글자는 흐리게), `plan-free`·`plan-plus`·`plan-max`(정사각 선화: 씨앗·새싹·나무), `empty-activity`·`empty-scheduled`·`empty-projects`·`empty-search`(정사각 선화 + 포인트색 `#BF4F2C`), `thumb-slides`·`thumb-report`·`thumb-web`(세로 563×838로 그려 56×72 썸네일과 큰 미리 보기 둘 다 만듦), `photo-jeju`(16:9), `photo-memo`(3:4, 글자는 흐리게), `avatar`(정사각 단순 도형), `downloads-docs`·`downloads-browser`(약 8:5, 실제 제품 화면 복제 금지), `customize-banner`(약 900×170 선화). 모든 프롬프트에 "실제 인물·상표·로고·읽히는 글자 없음"을 넣는다. 배치 작업 형식은 `/Users/freelife/youtube/pro-kit-samples/brand/image-jobs-poses-3.json`을 따른다.

- [ ] **Step 2: 그린다(Codex 브리지)**

Run: `cd /Users/freelife/youtube/pro-kit-samples && env -u OPENAI_API_KEY node /Users/freelife/.claude/skills/gpt-image/scripts/gpt_image.mjs batch --manifest research/claude/pack-images/manifest.json --concurrency 4`
Expected: 18장 모두 `research/claude/pack-images/src/`에 PNG. 실패한 장은 프롬프트를 순하게 고쳐 그 장만 다시 그리고, 고친 이유를 리서치 `README.md`에 적는다. 걸린 시간을 잰다.

- [ ] **Step 3: 크기를 맞추고 webp로 줄인다**

`cwebp -q 85 -alpha_q 100 -resize <폭> 0`으로 쓰는 크기에 맞춘다(썸네일 112×144(2배), 큰 미리 보기 563×838, 아이콘 192, 빈 상태 288, 사진 960, 그 밖은 쓰는 폭의 2배). 결과를 `packs/claudle/images/`에 둔다. 장마다 250KB 이하.

- [ ] **Step 4: `images.json`을 쓰고 검사한다**

`files`는 이름순 21개, `note`는 "Codex 이미지 도구(ChatGPT 로그인)로 2026-10-xx에 그림. 실제 인물·상표 없음".
Run: `node /Users/freelife/youtube/pro-kit-samples/tools/claudle-pack-check.mjs /Users/freelife/youtube/pro-kit-samples/packs/claudle 2>&1 | grep -E 'images|그림' ; ls /Users/freelife/youtube/pro-kit-samples/packs/claudle/images | wc -l`
Expected: grep 결과 없음, `21`

---

### Task 5: 배치도 7장

**Files:**
- Create: `packs/claudle/wireframes/new-1440.svg`, `chat-1440.svg`, `chat-390.svg`, `sidebar-390.svg`, `search.svg`, `project.svg`, `intro.svg`

**Interfaces:**
- Consumes: 리서치 `02` 2~5·7·10·14절 실측, `01` 1절
- Produces: `screens.md`가 링크하는 배치도. 상자와 치수 글자만 있고 색은 회색 단계다.

- [ ] **Step 1: 배치도를 쓴다**

SVG는 손으로 쓴다(`viewBox`는 실제 폭, 회색 상자와 12px 치수 글자). 넣을 치수:
- `new-1440`: 사이드바 288, 인사말 위치(세로 40~58%), 입력창 640×103·모서리 14, 입력창 아래 줄(프로젝트, 모델)
- `chat-1440`: 사이드바 288, 대화 열 최대 768, 오른쪽 뷰어 565, 사용자 말풍선 오른쪽, 답 말풍선 없음, 작업 줄, 코드 블록 머리, 맨 아래로 버튼 36, 아래 붙은 입력창
- `chat-390`: 위 헤더, 사이드바 없음, 화면 아래 붙은 입력창
- `sidebar-390`: 전체 화면 시트, 행 44
- `search`: 672×584 창, 위에서 17.5%, 입력 줄 → 탭 → 결과 → 안내 줄 41
- `project`: 입력창, 대화 목록, 오른쪽 열 4행
- `intro`: 큰 세리프 제목, 로그인 카드, 오른쪽 그림, 기능, 요금제, FAQ, 푸터

- [ ] **Step 2: 확인한다**

Run: `for f in /Users/freelife/youtube/pro-kit-samples/packs/claudle/wireframes/*.svg; do xmllint --noout "$f" && echo ok; done | grep -c ok`
Expected: `7`. 브라우저로 한 장씩 열어 글자가 겹치지 않는지 본다.

---

### Task 6: `screens.md`와 `features.md`

**Files:**
- Create: `packs/claudle/screens.md`, `packs/claudle/features.md`

**Interfaces:**
- Consumes: 설계 2·3절, 리서치 `06` 1·2·3·6.4절, `02`, `04`, `05`
- Produces: 튜토리얼 2·4장과 프리셋 라운드가 읽는 화면·기능 정본. `screens.md`의 "접근성 이름" 절이 Task 12 probe의 선택자다.

- [ ] **Step 1: `screens.md`를 쓴다**

절 순서:
1. 사이트맵: 설계 3절 표(13쪽 + 오버레이). 화면마다 넣음·화면만 표시. 뺀 것과 이유 한 줄씩.
2. 공통 틀: 앱 셸 3영역, 사이드바(위에서 아래), 사용자 메뉴, 모바일 시트. 모델 메뉴는 `site.json`의 `locked`를 따른다: `Quick`만 고르고, 잠긴 `Balanced`·`Deep`은 자물쇠 아이콘과 "업그레이드"로 `/upgrade`에 간다.
3. 화면별 구성(위에서 아래): 리서치 `06` 2·2.1절을 우리 이름과 데이터로 옮긴다. 공개 쪽(소개, 로그인, 요금제)은 공개 사이트 값이라고 밝힌다.
4. 인터랙션: 가짜 스트리밍 명세(Enter 뒤 약 230ms 답 틀, 460ms 중지 버튼, 생각 중 점 박동과 상태 글자, 약 140자/초, 단어마다 0.4s 페이드, 코드는 줄마다, 표는 행마다, 끝나면 작업 줄 120ms 페이드), 중지(Esc 포함)와 중단 알림 바, 재시도, 편집, 사이드바 ⌘B·너비 조절(232~420), ⌘K 검색과 `⇧⌘K`, 단축키 창 `⌘/`, 움직임 줄이기(연출 없이 한 번에 표시), 한글 조합 중 Enter는 보내지 않음.
5. 접근성 이름(프리셋과 검사가 같이 쓴다): 입력창 `aria-label="메시지 입력"`, 보내기 버튼 `aria-label="보내기"`, 중지 버튼 `aria-label="응답 중지"`, 사이드바 토글 `aria-label="사이드바 열기"`/`"사이드바 닫기"`, 검색 창 `role="dialog"` + `aria-label="검색"`, 답 목록 `role="log"`, 뷰어 `role="complementary"` + `aria-label="미리 보기"`, 대화 안 위젯과 뷰어 iframe `title="미리 보기"`, 답 묶음마다 `data-role="assistant"`(사용자 메시지는 `data-role="user"`).
6. 반응형: 768에서 사이드바 고정, 767 이하 접힘, 390 전체 화면 시트, 입력창은 600~640에서 아래로 붙음, 인사말 32→24px.
7. 빈 상태와 [추정] 목록: 오류 상태, 아티팩트 만드는 중 카드, 버전 선택, 날짜 묶음 문구, 라이트 구문 색.
8. 정적 내보내기 규칙: Global Constraints의 정적 내보내기 줄.

- [ ] **Step 2: `features.md`를 쓴다**

설계 6.1절을 장별로 펼친다(5장 대화 저장·모의 응답, 6장 목록 관리, 7장 실제 AI·한도, 8장 검색, 9장 프로젝트, 10장 아티팩트). 장마다 규칙, 데이터 모델 힌트(리서치 `05` 7.1절 결정 표의 해당 행), 확인한 판(`ai` 7.0.130, `@ai-sdk/react` 4.0.133, oRPC 1.15.4, Streamdown 2.7.0, Drizzle rc.4, Postgres 18), 함정(Kilo는 `createOpenAI`의 기본 Responses API가 아니라 `.chat()`으로 부른다, 중지 뒤 `totalUsage` 대기, `allow-same-origin` 금지)을 적는다. 리서치 `05`의 AI Gateway 부분은 옮기지 않는다. 7장 절에는 설계 6.5절 표(주소, 키, `@ai-sdk/openai` 4.0.86, `kilo-auto/free`, 429 모양)와 Global Constraints의 한도·안내 문구, 하루 답 수를 세는 법(오늘 한국 시각 0시 이후 실제 모델 답 메시지 수. 메시지에 `model` 칸), 비용 $0(Kilo 가입 무료, Kilo Pass 필요 없음), 무료 공급자의 기록 주의를 둔다.

- [ ] **Step 3: 검사한다**

Run: `node /Users/freelife/youtube/pro-kit-samples/tools/claudle-pack-check.mjs /Users/freelife/youtube/pro-kit-samples/packs/claudle 2>&1 | grep -E 'screens|features|브랜드|이름'`
Expected: 결과 없음.

---

### Task 7: `design-notes.md`, `SOURCES.md`, 팩 검사 통과

**Files:**
- Create: `packs/claudle/design-notes.md`, `packs/claudle/SOURCES.md`, `research/claude/design-check/DESIGN.md`, `research/claude/names-check.md`

**Interfaces:**
- Consumes: 설계 5절, 리서치 `03`
- Produces: 3장이 가리키는 디자인 노트. 절 제목은 "받을 DESIGN.md", "받은 뒤 고칠 것"(1. 기준 화면, 2. 브랜드 바꾸기, 3. 원문 정리, 4. 확인), "확인 기록".

- [ ] **Step 1: `design-notes.md`를 쓴다**

- 받을 DESIGN.md: Refero Claude `https://styles.refero.design/style/47cb86b6-cb2d-41c8-94ba-8607cd7c41cd`(2026-07-03 추출, 로그인 전 첫 화면). 열리지 않으면 Anthropic `d469cba4-c448-4a43-a033-883f8bfcdc42`.
- 받은 뒤 고칠 것: 설계 5.3절을 그대로 펼친다. 앱 값은 리서치 `03` 1~5절의 표(라이트·다크 표면, 글자, 선, 말풍선, 입력창, 메뉴, 모서리, 그림자, 모션)를 우리 토큰 이름으로 옮긴다. 대체: `#BF4F2C`(흰 글자 4.81:1), 다크 강조 글자 `#E0794A`, 중립은 리서치 `06` 5.2절 값, 서체 셋.
- 확인 기록: Step 2 결과.

- [ ] **Step 2: 원문을 받아 고쳐 보고 lint한다**

리서치용으로만 원문을 받아(`prokit-ui` 절차: 다운로드 버튼, 안 되면 페이지 `<pre><code>`) `research/claude/design-check/DESIGN.md`에 두고, "받은 뒤 고칠 것"을 적용한 뒤 lint한다.
Run: `cd /Users/freelife/youtube/pro-kit-samples/research/claude/design-check && pnpm dlx @google/design.md lint DESIGN.md`
Expected: 오류 0. 날짜, 판, 경고 수를 "확인 기록"에 적는다. 원문은 팩에 넣지 않는다.

- [ ] **Step 3: 이름을 다시 확인한다**

Claudle을 앱 스토어(App Store, Google Play), GitHub, npm에서 찾아 같은 이름의 AI 서비스가 있는지 본다. 결과와 날짜를 `research/claude/names-check.md`에 적는다. 같은 이름의 AI 서비스가 있으면 멈추고 사용자에게 알린다.

- [ ] **Step 4: `SOURCES.md`를 쓰고 팩 검사를 통과시킨다**

`SOURCES.md`: 조사 날짜(2026-10-07), 출처(공식 도움말 주소 목록은 리서치 `04` 출처 절, Refero 주소, AI SDK·oRPC·Streamdown 문서), 그림(Codex 이미지 도구, 실제 인물·상표 없음), 라이선스(팩은 저장소 라이선스, 서체는 OFL).
Run: `node /Users/freelife/youtube/pro-kit-samples/tools/claudle-pack-check.mjs /Users/freelife/youtube/pro-kit-samples/packs/claudle`
Expected: `PASS 대화 9(질문 22), 프로젝트 6, 아티팩트 8, 그림 21`, exit 0

---

### Task 8: 튜토리얼 첫 쪽과 1~4장

**Files:**
- Create: `tutorials/02-claudle/README.md`, `01-create-project.md`, `02-plan.md`, `03-design.md`, `04-screens.md`

**Interfaces:**
- Consumes: 팩 파일 이름과 절 제목(Task 6·7), `tutorials/01-nextflix/` 같은 장의 형식과 프롬프트
- Produces: Task 11·12 프리셋 라운드가 그대로 쓰는 2~4장 프롬프트

- [ ] **Step 1: 첫 쪽을 쓴다**

`tutorials/01-nextflix/README.md`의 절 순서와 모양을 그대로 따른다: 제목 "Claude 같은 AI 대화 서비스 만들기", 안내 문구 NOTE, 토큰 경고 WARNING(값은 Task 13에서), 무엇을 만드나요(프리셋 링크 `https://roadkwon-ai.github.io/pro-kit/claudle/`, 넣는 것 목록, 화면만인 것, 뺀 것), "AI 키가 없어도 끝까지 가요" 문단(5장 모의 응답, 7장에서 키를 넣는 법 링크), 가장 쉬운 방법, 장 목록, 시간과 비용, 만든 기록.

가장 쉬운 방법 프롬프트:

````markdown
```prompt
https://github.com/roadkwon-ai/pro-kit 을 이 폴더에 받고, 그 안의 AGENTS.md대로 neon 템플릿으로 pro-kit 옆에 [claudle] 폴더로 프로젝트를 만들어줘. 나중에 DB를 쓸 거라 로컬 DB까지 준비해줘. 없는 준비물은 설치해줘.
Claude 같은 AI 대화 서비스를 만들 거야. 이름은 [Claudle].
옆 폴더 pro-kit의 packs/claudle 프리셋 팩으로 서비스 기획을 채워줘. 팩은 고치지 말고, 팩 데이터의 서비스 이름은 내가 정한 이름으로 바꿔 써.
디자인은 팩의 design-notes.md대로 DESIGN.md를 받아 고쳐 쓰고, 사이트맵의 모든 페이지를 팩의 예시 데이터와 그림으로 만들어줘.
홈 화면 구성은 시안을 그리지 말고 구성도로 보여 주고 고르게 해줘.
로그인, 저장, 실제 AI 답 같은 기능은 다음에 만들 거야. 지금은 답을 팩의 모의 응답으로 흘려 보여 줘.
푸터에는 팩에 적힌 연습용 안내 문구를 넣어줘.
```
````

- [ ] **Step 2: 1~4장을 쓴다**

`tutorials/01-nextflix/01~04` 장과 같은 형식("이번 장에서 할 일", 단계마다 프롬프트·"이렇게 되면 성공"·"막히면", "에이전트가 물어보면", 다음 장 링크). 프롬프트는 Nextflix 장의 프롬프트에서 서비스 설명, 팩 이름(`packs/claudle`), 이름 괄호만 바꾼다. 4장은 "답은 팩의 mock-replies.json 규칙으로 흘려 보여 줘", "새 대화는 브라우저에만 저장돼서 다른 브라우저에서는 안 보여요" 안내를 더한다. 성공 기준에 "보내기를 누르면 생각 중 표시 뒤 글자가 흘러나온다", "Esc로 멈춘다", "⌘K로 검색 창이 열린다"를 넣는다.

- [ ] **Step 3: 프롬프트 블록 길이와 값을 검사한다**

Run: `node -e 'const fs=require("fs");const d="/Users/freelife/youtube/pro-kit/tutorials/02-claudle/";let bad=0;for(const f of fs.readdirSync(d).filter(f=>f.endsWith(".md"))){const s=fs.readFileSync(d+f,"utf8");for(const m of s.matchAll(/```prompt\n([\s\S]*?)```/g)){const b=m[1];if(b.split("\n").filter(Boolean).length>10||/#[0-9a-f]{6}|\d+px|\d+ms/i.test(b)){bad++;console.log(f,b.slice(0,60))}}}console.log(bad?"FAIL "+bad:"PASS")'`
Expected: `PASS`

---

### Task 9: 기능 장 5~10장

**Files:**
- Create: `tutorials/02-claudle/05-auth-chats.md`, `06-chat-manage.md`, `07-ai-reply.md`, `08-search.md`, `09-projects.md`, `10-artifacts.md`

**Interfaces:**
- Consumes: `features.md` 장별 절(Task 6), `tutorials/01-nextflix/05~10` 형식
- Produces: 장마다 프롬프트 1~3개, 성공 기준, 막히면

- [ ] **Step 1: 장을 쓴다**

장마다 프롬프트는 "팩의 features.md `<절 이름>`대로 만들어줘"처럼 팩을 가리키고 값을 넣지 않는다.
- 5장: 로그인과 대화 저장. 성공: 다른 계정으로 로그인하면 내 대화가 안 보인다, 새로고침해도 대화가 남는다, 답 아래 "모의 응답" 표시. 막히면: DB 컨테이너, 마이그레이션.
- 6장: 고정·이름 바꾸기·삭제. 성공: 고정한 대화가 위 구역으로, 삭제 확인 뒤 목록에서 사라지고 주소로 열면 없다.
- 7장: 실제 AI 답. Kilo 키 만드는 법(kilo.ai 무료 가입 → API 키. 공식 주소 `https://kilo.ai/docs/gateway` 링크. 요금제 화면의 Kilo Pass는 결제하지 않는다), `.env`에 `KILO_API_KEY` 넣기(값은 에이전트에게 보내지 않고 직접 넣는다), 키가 없으면 모의 그대로라는 안내, 하루 200회 한도와 안내 문구, 무료 공급자의 기록 주의. 성공: "모의 응답" 표시가 사라지고 `Quick`으로 실제 답이 흐른다, `Balanced`·`Deep`은 잠겨 있다, 중지하면 부분 답이 저장된다. 막히면: 429 안내가 바로 나온다(그날 200회를 다 썼거나 Kilo 한도), 답이 안 온다(키 줄 오타, `.chat()` 대신 기본 호출).
- 8장: 검색. 성공: 한글 두 글자로 제목과 본문이 찾아진다, 남의 대화는 안 나온다.
- 9장: 프로젝트. 성공: 6번째 프로젝트를 만들면 안내가 나온다, 지침이 그 프로젝트 대화의 답에 반영된다.
- 10장: 아티팩트 미리 보기. 성공: html 코드 블록에 "미리 보기"가 생기고 오른쪽 패널에서 돈다, 패널 안 코드가 부모 페이지의 저장 값을 읽지 못한다(막히면에 `allow-same-origin` 함정).

- [ ] **Step 2: 프롬프트 검사**

Run: Task 8 Step 3과 같은 명령
Expected: `PASS`

- [ ] **Step 3: 7장의 Kilo 연결을 실제로 확인한다**

5장부터는 끝까지 실행하지 않지만, 7장이 가리키는 연결 값(설계 6.5절)은 키로 한 번 확인한다. 무료 모델이라 비용이 들지 않는다.
Run: `cd /Users/freelife/youtube/pro-kit-samples/tools && set -a && . <(grep '^KILO_API_KEY=' /Users/freelife/youtube/pro-kit/.env) && set +a && node kilo-check.mjs`
Expected: `PASS real` 줄(응답 모델 이름, 첫 글자 시간, 답 글자 수)과 `PASS 429` 줄(가짜 429 서버의 오류가 안내 문구로 바뀜), 마지막 `PASS`. 키 값은 출력되지 않는다. `FAIL real`이면 Kilo 문서(`/models`, 주소, 무료 모델 이름)가 바뀌었는지 보고 설계 6.5절과 7장을 고친다. 결과 한 줄을 `features.md` 7장 절의 "확인한 날"에 적는다.

---

### Task 10: 11·12장과 용어

**Files:**
- Create: `tutorials/02-claudle/11-check.md`, `12-deploy.md`
- Modify: `tutorials/reference/glossary.md`

**Interfaces:**
- Consumes: `tutorials/01-nextflix/11-check.md`, `12-deploy.md`, `tutorials/reference/deploy.md`
- Produces: 마지막 두 장과 새 용어 링크(`../reference/glossary.md#<절>`)

- [ ] **Step 1: 11·12장을 쓴다**

11장은 Nextflix 11장과 같은 검사·다듬기 프롬프트에 "모의 응답과 실제 답 둘 다 확인"을 더한다. 12장은 Vercel 배포, 환경 변수에 `KILO_API_KEY` 넣기, 팁으로 여러 무료 AI를 이어 쓰는 릴레이(설계 6.6절), 공개 배포에서는 하루 200회를 방문자 모두가 나눠 쓴다는 경고, 키를 넣지 않으면 모의 응답으로 공개된다는 안내.

- [ ] **Step 2: 용어를 더한다**

`glossary.md`에 스트리밍, 모의 응답, 아티팩트, 시스템 지침, AI Gateway(Kilo를 예로), 무료 모델, 토큰(AI 사용량 단위)을 기존 절 형식으로 더한다. 장의 첫 등장 용어에 링크를 건다.

- [ ] **Step 3: 링크를 검사한다**

Run: `node --test /Users/freelife/youtube/pro-kit/scripts/handbook.test.mjs 2>&1 | tail -3; grep -rhoE '\]\(\.\./reference/glossary\.md#[^)]+\)' /Users/freelife/youtube/pro-kit/tutorials/02-claudle | sort -u`
Expected: 테스트 통과. 링크마다 `glossary.md`에 그 제목이 있는지 눈으로 대조한다(id는 소문자, 공백→`-`).

- [ ] **Step 4: 커밋**

```bash
set -a; . /Users/freelife/youtube/.envrc; set +a
git -C /Users/freelife/youtube/pro-kit add tutorials/02-claudle tutorials/reference/glossary.md
git -C /Users/freelife/youtube/pro-kit commit -m "docs: Claudle 튜토리얼 첫 쪽과 12장 초안

- 프리셋 팩 packs/claudle을 가리키는 1~12장 프롬프트, 키 없이 끝까지 가는 모의 응답 안내
- 용어 6개 추가"
```

---

### Task 11: 프리셋 라운드 R1(2·3장)과 시안 고르기

**Files:**
- Create: `/Users/freelife/youtube/pro-kit-samples/prompts/claudle-R1.txt`
- Modify(라운드가): `tutorials/claudle/` 안의 `PRODUCT.md`, `GLOSSARY.md`, `DESIGN.md`, `docs/briefs/`, `.impeccable/mocks/`

**Interfaces:**
- Consumes: 2·3장 프롬프트(Task 8) 원문, 팩
- Produces: 세션 ID(`logs/claudle-R1.jsonl` 첫 `session_id`), 홈 구성도 3안, "팩에 없던 것" 목록

- [ ] **Step 1: 라운드 프롬프트를 쓴다**

`prompts/claudle-R1.txt`:
```
너는 Claudle 튜토리얼의 프리셋을 만든다. 독자가 보내는 튜토리얼 2장과 3장 프롬프트를 아래에 그대로 붙였다.
이 프로젝트는 튜토리얼 1장(프로젝트 만들기)을 마친 상태로 본다. DB는 띄우지 않았고 이번에는 쓰지 않는다.
프리셋 팩은 /Users/freelife/youtube/pro-kit-samples/packs/claudle 이다(프롬프트의 "옆 폴더 pro-kit의 packs/claudle"). 팩 밖의 Claude 자료(research 폴더 포함)는 읽지 않는다.
팩만으로 정할 수 없는 곳은 멈추지 말고 합리적으로 정하고, 보고 끝 "팩에 없던 것"에 하나씩 적는다.
그림은 팩의 images/를 쓰고 새로 그리지 않는다. 구성도 3안을 만든 뒤 고르는 지점에서 멈추고 보고한다.
sleep·폴링으로 기다리지 않는다. push와 배포는 하지 않는다.

[2장 프롬프트 원문]

[3장 프롬프트 원문]
```
대괄호 두 줄은 `tutorials/02-claudle/02-plan.md`와 `03-design.md`의 프롬프트 블록 원문으로 바꾼다. 바꿀 곳 괄호는 떼고 넣는다.

- [ ] **Step 2: 라운드를 돌리고 감시한다(백그라운드)**

Run: `/Users/freelife/youtube/pro-kit-samples/tools/run.sh claudle R1 /Users/freelife/youtube/pro-kit-samples/prompts/claudle-R1.txt` (`run_in_background`)와 `sleep 20; node /Users/freelife/youtube/pro-kit-samples/tools/stall-watch.mjs /Users/freelife/youtube/pro-kit-samples/logs/claudle-R1.jsonl <scratchpad>/seen-claudle-R1` (`run_in_background`)
Expected: `logs/claudle-R1.done`에 `exit=0`. `python3 /Users/freelife/youtube/pro-kit-samples/tools/tut-result.py /Users/freelife/youtube/pro-kit-samples/logs/claudle-R1.jsonl`로 비용과 마지막 보고를 본다.

- [ ] **Step 3: 결과를 확인한다**

Run: `cd /Users/freelife/youtube/pro-kit-samples/tutorials/claudle && pnpm dlx @google/design.md lint DESIGN.md; grep -n -i -E 'claude|anthropic|d97757|c6613f' DESIGN.md PRODUCT.md GLOSSARY.md`
Expected: lint 오류 0. grep은 `PRODUCT.md`의 "Claude 같은" 설명과 안내 문구 말고는 없다.

- [ ] **Step 4: 사용자에게 고르게 한다**

구성도 3안과 라운드 추천을 AskUserQuestion으로 보여 주고 고르게 한다. "팩에 없던 것"은 팩 문서에 반영하고 `claudle-pack-check.mjs`를 다시 PASS로 만든다.

---

### Task 12: 프리셋 라운드 R2(4장)·R3(고침)와 검사

**Files:**
- Create: `prompts/claudle-R2.txt`, `prompts/claudle-R3.txt`, `/Users/freelife/youtube/pro-kit-samples/tools/claudle-probe.mjs`
- Modify(라운드가): `tutorials/claudle/apps/web/**`, `packages/ui/**`

**Interfaces:**
- Consumes: R1 세션 ID, 고른 구성도, 4장 프롬프트 원문, `screens.md` 접근성 이름
- Produces: 내보낸 사이트 `/Users/freelife/youtube/pro-kit-samples/pages/pro-kit/claudle/`(배포는 Task 16), 검사 결과 `checks/claudle*.json`

- [ ] **Step 1: R2를 돌린다**

`prompts/claudle-R2.txt`: "사용자가 구성도 <고른 안>을 골랐다. 아래 4장 프롬프트대로 모든 화면을 만든다. 4장 프롬프트 원문 + 검사(타입·lint·빌드, `pnpm export:html`, `qa.mjs widths·axe·clean`, `site-check.mjs`, `ui-audit.mjs`)를 하고 고친다. 라운드는 닫지 않는다. 보고: 쪽 수, 검사 숫자, 팩에 없던 것, 1440·390 스크린샷 경로". R1 세션으로 이어 돌리고(`run.sh claudle R2 <prompt> <R1 세션 ID>`) 감시를 띄운다.
Expected: `exit=0`, 보고에 13쪽과 오버레이, 검사 FAIL 0.

- [ ] **Step 2: 상호작용 검사 도구를 쓴다**

```js
// usage: node claudle-probe.mjs <base-url> <out.json> — Claudle 프리셋의 상호작용(Review Focus 1~5)을 실제 브라우저로 검사한다. 문제가 있으면 exit 1
import fs from "node:fs";
import { chromium } from "playwright-core";

const [base, out] = process.argv.slice(2);
const u = (p) => base.replace(/\/$/, "") + p;
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
const input = () => page.getByRole("textbox", { name: "메시지 입력" });
const assistantCount = () => page.locator('[role="log"] [data-role="assistant"]').count();

// 1. 한글 조합 중 Enter는 보내지 않는다, Shift+Enter는 줄바꿈
await page.goto(u("/new/"));
await input().fill("안녕");
const before = await assistantCount();
await input().evaluate((el) => el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true })));
await page.waitForTimeout(800);
check("ime-enter", (await assistantCount()) === before && (await input().inputValue()) === "안녕");
await input().press("Shift+Enter");
check("shift-enter", (await input().inputValue()).includes("\n"));

// 2. 스트리밍 중지
await input().fill("긴 글을 써줘");
await input().press("Enter");
await page.getByRole("button", { name: "응답 중지" }).waitFor({ timeout: 3000 });
await page.waitForTimeout(700);
await page.keyboard.press("Escape");
await page.getByRole("button", { name: "응답 중지" }).waitFor({ state: "detached", timeout: 3000 }).catch(() => {});
const textA = await page.locator('[role="log"] [data-role="assistant"]').last().innerText();
await page.waitForTimeout(1500);
const textB = await page.locator('[role="log"] [data-role="assistant"]').last().innerText();
check("stop", textA.length > 0 && textA === textB && (await page.getByRole("button", { name: "응답 중지" }).count()) === 0 && (await input().isEditable()), `글 ${textA.length}자`);

// 3. 새 대화는 새로고침해도 남는다
await page.goto(u("/chat/new/"));
await input().fill("저장 확인용 질문");
await input().press("Enter");
await page.getByRole("button", { name: "응답 중지" }).waitFor({ state: "detached", timeout: 20000 }).catch(() => {});
await page.reload();
check("new-chat-persist", (await page.getByText("저장 확인용 질문").count()) > 0);

// 4. ⌘K 검색 창: Esc로 닫으면 초점이 돌아온다, ⌘B로 사이드바 접기
await page.goto(u("/new/"));
await input().focus();
await page.keyboard.press("Meta+k");
const dialog = page.getByRole("dialog", { name: "검색" });
await dialog.waitFor({ timeout: 2000 });
await page.keyboard.press("Escape");
await dialog.waitFor({ state: "hidden", timeout: 2000 });
check("search-focus-return", await input().evaluate((el) => el === document.activeElement));
const toggleBefore = await page.getByRole("button", { name: /사이드바 (열기|닫기)/ }).getAttribute("aria-label");
await page.keyboard.press("Meta+b");
await page.waitForTimeout(300);
check("sidebar-toggle", (await page.getByRole("button", { name: /사이드바 (열기|닫기)/ }).getAttribute("aria-label")) !== toggleBefore);

// 5. 없는 대화 주소
const res = await page.goto(u("/chat/no-such-chat/"));
check("missing-chat-404", res?.status() === 404);

// 6. 아티팩트 iframe 격리
await page.evaluate(() => localStorage.setItem("probe-secret", "1"));
const conv = JSON.parse(fs.readFileSync("/Users/freelife/youtube/pro-kit-samples/packs/claudle/data/conversations.json", "utf8")).find((c) => c.messages.some((m) => m.text.includes(`${"`".repeat(3)}html`)));
await page.goto(u(`/chat/${conv.id}/`));
const frameEl = page.locator('iframe[title="미리 보기"]').first();
await frameEl.waitFor({ timeout: 5000 });
const sandbox = (await frameEl.getAttribute("sandbox")) ?? "";
const frame = await (await frameEl.elementHandle()).contentFrame();
const leak = await frame.evaluate(() => {
	try {
		return window.parent.localStorage.getItem("probe-secret") ?? "none";
	} catch {
		return "blocked";
	}
});
check("iframe-isolation", sandbox.includes("allow-scripts") && !sandbox.includes("allow-same-origin") && leak === "blocked", `sandbox="${sandbox}" leak=${leak}`);

// 7. 390: 사이드바는 접혀 있고 열면 화면 전체
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(u("/new/"));
await page.getByRole("button", { name: "사이드바 열기" }).click();
const nav = page.getByRole("navigation").first();
const box = await nav.boundingBox();
check("mobile-sheet", box && box.width >= 380, `폭 ${box?.width}`);

check("no-page-errors", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();
fs.writeFileSync(out, JSON.stringify(results, null, 2));
const bad = results.filter((r) => !r.ok);
for (const r of bad) console.log("FAIL", r.name, r.detail);
console.log(bad.length ? `FAIL ${bad.length}/${results.length}` : `PASS ${results.length}`);
process.exit(bad.length ? 1 : 0);
```

- [ ] **Step 3: 내보내고 검사한다**

```bash
BASE=/pro-kit/claudle /Users/freelife/youtube/pro-kit-samples/tools/export.sh /Users/freelife/youtube/pro-kit-samples/tutorials/claudle /Users/freelife/youtube/pro-kit-samples/pages/pro-kit/claudle
python3 -m http.server 8091 -b 127.0.0.1 -d /Users/freelife/youtube/pro-kit-samples/pages   # run_in_background
node /Users/freelife/youtube/pro-kit-samples/tools/claudle-probe.mjs http://127.0.0.1:8091/pro-kit/claudle /Users/freelife/youtube/pro-kit-samples/checks/claudle-probe.json
```
Expected: `PASS 10`. 실패하면 Step 4의 R3에 넣는다. 8091에 다른 서버가 떠 있으면 그것을 쓴다.

- [ ] **Step 4: R3(고침)을 돌린다**

`prompts/claudle-R3.txt`: probe 실패 항목, 팩·리서치 06 3절 값과 다른 곳(사이드바 288, 대화 열 768, 입력창 모서리 14, 단어 페이드 0.4s 등을 `qa.mjs`·계산 스타일로 잼), critique·audit 결과(prokit-ui 절차)를 고친다. 같은 세션으로 이어 돌리고 감시한다. 끝나면 Step 3을 다시 돌린다.
Expected: probe `PASS 10`, `site-check` 깨진 링크 0·콘솔 오류 0·반응 없는 버튼 0, `qa.mjs axe` 위반 0, widths 넘침 0.

- [ ] **Step 5: 사용자 확인을 받는다**

개발 서버(`port.sh claudle`의 포트)를 띄우고, 확인할 것(새 대화·스트리밍·중지·⌘K·설정·프로젝트·390)을 짧게 적어 사용자에게 보여 준다. 확인을 받으면 같은 세션에 "확정했어…"(R27d 형식) 프롬프트로 `[confirm]`, audit, 라운드 닫기, 프로젝트 커밋을 시킨다.

- [ ] **Step 6: 이름 한 값 검사**

Run: `grep -rn "Claudle" /Users/freelife/youtube/pro-kit-samples/tutorials/claudle/apps/web/src /Users/freelife/youtube/pro-kit-samples/tutorials/claudle/packages/ui/src | grep -v -E 'data/site\.json|site\.ts' | head`
Expected: 결과 없음(서비스 이름은 `site.json`이나 그것을 읽는 한 모듈에서만 나온다). 있으면 R3에 넣어 고친다.

---

### Task 13: 튜토리얼 마무리(스크린샷, 시간과 비용, 만든 기록)

**Files:**
- Create: `tutorials/02-claudle/assets/claudle-*.webp`, `packs/claudle/shots/*.webp`
- Modify: `tutorials/02-claudle/README.md`, `04-screens.md`

**Interfaces:**
- Consumes: 내보낸 사이트, 라운드 기록(`round-timing.py`, `cost.py`)
- Produces: 첫 쪽 그림, 시간과 비용, 만든 기록, 팩 스크린샷

- [ ] **Step 1: 스크린샷을 찍는다**

`node /Users/freelife/youtube/pro-kit-samples/tools/capture.mjs <url> <outDir>`로 새 대화, 대화(뷰어 열림), 검색, 설정, 프로젝트, 소개를 1440과 390으로 찍어 webp(`-q 85 -resize 1200 0`, 휴대폰 480)로 줄인다. 첫 쪽용은 `tutorials/02-claudle/assets/`, 팩용은 쪽마다 `packs/claudle/shots/<쪽>-<폭>.webp`.

- [ ] **Step 2: 시간과 비용, 만든 기록을 채운다**

Run: `python3 /Users/freelife/youtube/pro-kit-samples/tools/round-timing.py /Users/freelife/youtube/pro-kit-samples/logs/claudle-R*.jsonl; python3 /Users/freelife/youtube/pro-kit-samples/tools/cost.py /Users/freelife/youtube/pro-kit-samples/logs/claudle-R*.jsonl`
Expected: 라운드별 시간과 토큰. Nextflix 첫 쪽 "시간과 비용" 형식(요약, 접힌 단계별, 접힌 실제 값)으로 4장까지 값을 적고, "만든 기록"에 5~12장은 실행해 확인하지 않았다고 밝힌다.

- [ ] **Step 3: 팩 검사와 커밋**

Run: `node /Users/freelife/youtube/pro-kit-samples/tools/claudle-pack-check.mjs /Users/freelife/youtube/pro-kit-samples/packs/claudle`
Expected: `PASS …`. 저장소 변경(`tutorials/02-claudle/`)을 `docs: Claudle 튜토리얼 스크린샷과 시간·비용`으로 커밋한다.

---

### Task 14: 독립 검토와 korean-skills

**Files:**
- Modify: `tutorials/02-claudle/*.md`, 팩 문서

**Interfaces:**
- Consumes: 튜토리얼, 팩, 설계, 리서치
- Produces: 검토 지적 반영, 문체 교정

- [ ] **Step 1: 독립 검토 에이전트를 띄운다**

가장 능력 있는 모델로 검토 에이전트를 띄워 사실(리서치·공식 문서와 대조: 판, 가격, 함정, 단축키), 절차(AGENTS.md·prokit 스킬과 어긋남), 브랜드(이름·색·서체·문구 누락), 프롬프트 값 규칙을 본다. 지적마다 고치거나 고치지 않는 이유를 남긴다.

- [ ] **Step 2: korean-skills를 거친다**

`humanizer` → `style-guide` → `grammar-checker` 순서로 첫 쪽과 12장을 고친다. 프롬프트 블록, 링크, 코드 식별자, 뜻은 바꾸지 않는다.

- [ ] **Step 3: 다시 검사하고 커밋한다**

Run: Task 8 Step 3 명령, `node --test /Users/freelife/youtube/pro-kit/scripts/handbook.test.mjs`
Expected: 둘 다 통과. `docs: Claudle 튜토리얼 검토와 문체 교정`으로 커밋한다.

---

### Task 15: 포트폴리오 반영(클론 튜토리얼 두 번째 카드)

**Files:**
- Create: `/Users/freelife/youtube/pro-kit-samples/prompts/portfolio-R<n>.txt`(R29가 끝난 다음 번호)
- Modify(라운드가): `ws/portfolio/**`(튜토리얼 목록, 갤러리, 장 쪽 동기화)
- Modify: `tutorials/README.md`(튜토리얼 목록 행), `docs/superpowers/plans/2026-10-01-tutorials-roadmap.md`(10번 상태)

**Interfaces:**
- Consumes: 튜토리얼 파일, 스크린샷, 내보낸 프리셋
- Produces: 포트폴리오의 "유명 서비스 클론하기"에 Claudle 카드, `/tutorials/claudle/...` 장 쪽, 갤러리의 튜토리얼 프리셋

- [ ] **Step 1: 포트폴리오 라운드가 비어 있는지 본다**

Run: `tail -3 /Users/freelife/youtube/pro-kit-samples/ws/portfolio/tasks/todo.md; ls /Users/freelife/youtube/pro-kit-samples/logs/portfolio-R2*.done`
Expected: 열린 라운드가 없다(R28·R29가 닫힘). 열려 있으면 그 라운드가 끝난 뒤에 한다.

- [ ] **Step 2: 라운드 프롬프트를 쓰고 돌린다**

프롬프트: "튜토리얼 2번 Claudle을 싣는다. `scripts/sync-tutorials.mjs`가 `02-claudle`을 읽게 하고, 홈 '유명 서비스 클론하기' 묶음과 `/tutorials` 목록에 카드, 갤러리에 프리셋(`/pro-kit/claudle/`)을 더한다. 마스코트 배치표(R28)에 `02-claudle` 장 포즈를 더한다(Nextflix 표와 같은 규칙). 검사 도구는 tools/README.md." + 사용자 확인 지점에서 멈춤. `run.sh portfolio R<n> …`과 감시.
Expected: 사용자 확인 뒤 R27d 형식으로 닫고 커밋.

- [ ] **Step 3: 저장소 목록과 로드맵을 고친다**

`tutorials/README.md` 표에 행을 더한다: `| [Claude 같은 AI 대화 서비스 만들기](02-claudle/README.md) | 유명 서비스 클론하기 두 번째 튜토리얼이에요. …(Task 13 시간 값) |`. 로드맵 10번 상태를 "기획 승인(이름 Claudle) … 공개 대기"로 고친다. 커밋 `docs: Claudle 튜토리얼 목록과 로드맵 상태`.

---

### Task 16: 공개(사용자가 지시한 뒤)

**Files:**
- Modify: `tutorials/packs.json`, `/Users/freelife/youtube/pro-kit-packs/README.md`, gh-pages(`pages/pro-kit/claudle/`, 루트)

**Interfaces:**
- Consumes: 팩 원본, 내보낸 프리셋, 포트폴리오
- Produces: 릴리스 `pack-claudle`, gh-pages `claudle/`, `main`의 `packs.json`

- [ ] **Step 1: 지시를 받는다**

팩 릴리스, gh-pages 배포, `main` push는 사용자가 지시할 때만 한다. 올곧과 함께 공개하면 한 세션에서 차례로 한다.

- [ ] **Step 2: 팩을 묶어 올리고 받아 확인한다**

```bash
node /Users/freelife/youtube/pro-kit-samples/tools/pack-zip.mjs /Users/freelife/youtube/pro-kit-samples/packs/claudle claudle /Users/freelife/youtube/pro-kit-samples/packs/_zips
set -a; . /Users/freelife/youtube/.envrc; set +a
gh release create pack-claudle /Users/freelife/youtube/pro-kit-samples/packs/_zips/claudle-pack.zip --repo roadkwon-ai/pro-kit-packs --target main --title "claudle 프리셋 팩" --notes "Claudle 튜토리얼(Claude 클론) 화면 구성, 기능 규칙, 디자인 노트, 배치도, 예시 데이터, 그림 21장, 스크린샷"
```
`pack-zip.mjs`가 출력한 항목을 `tutorials/packs.json`에 넣고, 팩 저장소 `README.md` 표에 행을 더한다. `node /Users/freelife/youtube/pro-kit/scripts/pack.mjs claudle`로 받아 원본과 같은지(`diff -r`) 본다.

- [ ] **Step 3: gh-pages와 `main`**

`tools/publish.sh claudle`(또는 그 절차)로 `pages/pro-kit/claudle/`을 gh-pages에 올리고, 포트폴리오 루트는 `tools/publish-root.sh`로 합친다. `main`은 `node scripts/release.mjs` 절차로 push한다.
Expected: `https://roadkwon-ai.github.io/pro-kit/claudle/`가 열리고, `node scripts/pack.mjs claudle`이 새 `packs.json`으로 받아진다.

---

## 자체 점검 (계획 작성 때)

- 설계 1절 성공 기준: 팩만으로 프리셋(Task 11·12), 모든 링크·버튼(Task 12 Step 4 site-check), 프롬프트에 값 없음(Task 8·9 검사), 브랜드(Task 2 검사, Task 11 Step 3 grep), 절차(Task 14 검토).
- 설계 2·3절 화면: `screens.md`(Task 6)와 R2(Task 12)가 넣음·화면만 56화면을 만든다. probe는 Review Focus만 보고 나머지는 `site-check`·`ui-audit`가 본다.
- 설계 4절 장: Task 8~10. 5절 디자인: Task 7. 6절 팩: Task 2~7. 7절 프리셋: Task 1·11·12. 8절 순서: Task 순서와 같다. 9절 위험: Task 7 Step 3(이름), `features.md` 판 기록(Task 6), 한도·비용 안내(Task 9·10).
