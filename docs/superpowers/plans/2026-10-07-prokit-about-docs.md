# 프로킷 소개 페이지, 문서(handbook), GitHub 스타 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로킷 사이트에 GitHub 스타 버튼과 스타 토스트, 문서(`/docs`, 원본 pro-kit `handbook/`), 프로킷 소개(`/about`)를 더한다.

**Architecture:** 두 저장소에 걸친다. 문서 원본(handbook 마크다운 30쪽 + 홈 + 묶음 소개 7쪽)과 그 검사는 pro-kit 저장소에서 이 세션이 쓴다. 사이트 코드(`../pro-kit-samples/ws/portfolio`)는 그 프로젝트의 규칙대로 헤드리스 dev-cycle 라운드(R27 스타, R28 문서, R29 소개)가 만든다. 이 계획의 사이트 쪽 작업은 라운드 지시문을 쓰고, 실행하고, 결과를 확인하는 것이다. 문서는 튜토리얼과 같은 방식(pro-kit 원본 → sync → 사이트 사본)으로 사이트에 들어간다.

**Tech Stack:** Markdown(GitHub 문법, Mermaid), Node 24 `node:test`(pro-kit 검사), Next.js App Router 정적 내보내기(사이트), 헤드리스 라운드 실행기 `../pro-kit-samples/tools/run.sh`.

**Spec:** `docs/superpowers/specs/2026-10-07-prokit-about-docs-design.md`

## Global Constraints

- 문서 원본 위치 `pro-kit/handbook/`, 사이트 주소 `/docs`, 메뉴 이름 "문서". 소개 주소 `/about`, 메뉴 이름 "프로킷 소개".
- 쪽의 틀: `# 제목` 다음 줄이 빈 줄, 그다음 `> 한눈에: …`(쉬운 말 2~3문장), 이어서 `## 개념·흐름`(또는 내용에 맞는 h2), `## 자세히`, `## 관련 문서`.
- 말투는 튜토리얼과 같은 해요체. 코드 식별자와 명령은 그대로.
- 사실은 README, 템플릿 파일(`templates/prokit-next-neon|supabase/…`), 템플릿 README, VERIFICATION.md에 있는 것만 쓴다. 없는 기능, 후기, 수치는 쓰지 않는다.
- 용어: "프리셋", "프리셋 팩", 튜토리얼 허브의 찾아보는 안내는 "가이드". 비용과 키, Windows, 문제 해결, 용어 풀이는 `tutorials/` 쪽으로 링크하고 다시 쓰지 않는다.
- 1차에서 README는 고치지 않는다(2차 작업은 Task 13).
- pro-kit 커밋은 `set -a; . /Users/freelife/youtube/.envrc; set +a` 뒤에 한다(roadkwonai). push는 v* 릴리스 절차(`scripts/release.mjs`)로만 한다.
- 포트폴리오 라운드는 R26을 닫은 뒤 하나씩 연다. 라운드마다 [confirm]은 사용자 확인으로 채우고, 사이트 배포(gh-pages)는 사용자 확인 뒤 한다. 3012 개발 서버는 끄지 않는다.
- 스타 토스트: 한 방문(세션)에 한 번, 닫거나 누르면 30일 동안 다시 안 나옴, 약 8초 뒤 사라짐, 호버·포커스면 멈춤, `role="status"`, reduced-motion이면 미끄러짐 없음.
- 문서 검색은 1차에서 뺀다. Mermaid는 사이트에서 도식이 있는 쪽에서만 지연해서 불러오고, 실패하면 원문을 코드로 보인다.

## Review Focus

1. GitHub API가 막힌 경우(시간당 60회 한도, 오프라인, 빌드 때 실패): 스타 버튼은 빌드 때 값, 그마저 없으면 `★ GitHub`로 보이고 콘솔 오류가 없어야 한다. → Task 11(R27) 지시문의 검사 항목.
2. 저장소 접근이 막힌 브라우저(사생활 보호 모드에서 `localStorage`가 throw): 토스트가 예외 없이 그 방문에서 한 번만 나와야 한다. → Task 11.
3. 짧은 페이지나 스크롤이 거의 없는 화면(1920 세로 화면에서 홈이 짧을 때): 불러오자마자 토스트가 튀어나오면 안 되고, 사용자가 스크롤한 뒤에만 조건을 본다. → Task 11.
4. 한글 제목 앵커: GitHub에서 맞는 `#…` 링크가 사이트에서도 맞아야 한다(공백은 `-`, 문장부호 제거). handbook 검사와 사이트 검사가 같은 규칙을 쓴다. → Task 1(handbook 검사의 앵커 단언), Task 12(R28의 같은 규칙 단언).
5. 정적 내보내기에서 깊은 문서 주소를 새로고침하거나 직접 열 때(`/pro-kit/docs/concepts/dev-cycle/`): 404가 아니어야 하고, Mermaid가 실패해도 본문은 다 보여야 한다. → Task 12.

---

## 파일 구조

pro-kit 저장소
- Create `handbook/README.md`: 문서 홈. 핵심 3가지와 묶음 표(묶음 소개 쪽 링크 7개). 사이트 묶음 순서의 정본.
- Create `handbook/<묶음>/README.md` 7개: 묶음 소개. `> 한눈에`와 쪽 표(쪽 링크와 한 줄 설명). 묶음 안 쪽 순서의 정본.
- Create `handbook/<묶음>/<쪽>.md` 30개:
  - `start/`: `what-is-prokit.md`, `requirements.md`, `quickstart-screens.md`, `quickstart-service.md`, `after-create.md`
  - `concepts/`: `harness.md`, `dev-cycle.md`, `cases.md`, `audit-and-confirm.md`, `agents.md`
  - `templates/`: `choose.md`, `what-it-adds.md`, `app-structure.md`, `installer.md`, `update-existing.md`
  - `skills/`: `prokit-skills.md`, `official-skills.md`, `optional-bundles.md`, `install-and-update.md`
  - `design/`: `ui-flow.md`, `design-md.md`, `screen-only.md`
  - `deploy/`: `vercel.md`, `github-pages.md`, `release.md`, `secrets.md`
  - `reference/`: `commands.md`, `project-structure.md`, `verification.md`, `faq.md`
- Create `scripts/handbook.test.mjs`: handbook 구조 검사(표와 파일이 맞는지, 한눈에, 링크와 앵커).
- Modify `AGENTS.md`: 버전과 릴리스 절 앞 "템플릿 수정 규칙"에 handbook 규칙 한 줄과 검사 명령.
- Modify `README.md` 디렉터리 구조의 "이 저장소" 트리에 `handbook/` 한 줄(1차에서 README 본문은 그대로, 트리만).

포트폴리오 작업공간(`../pro-kit-samples`)
- Create `prompts/portfolio-R27.txt`, `prompts/portfolio-R28.txt`, `prompts/portfolio-R29.txt`: 라운드 지시문.
- 사이트 코드는 라운드가 만든다. 예상 파일(라운드가 바꿀 수 있음): `apps/web/src/components/site-header.tsx`, `components/github-star.tsx`, `components/star-toast.tsx`, `lib/github.ts`, `scripts/sync-handbook.mjs`, `lib/handbook.ts`, `lib/handbook.check.mjs`, `app/docs/page.tsx`, `app/docs/[section]/page.tsx`, `app/docs/[section]/[slug]/page.tsx`, `components/docs/*`, `app/about/page.tsx`, `components/about/*`, `scripts/sync-releases.mjs`.

---

### Task 1: handbook 검사와 뼈대

**Files:**
- Create: `scripts/handbook.test.mjs`
- Create: `handbook/README.md`, `handbook/{start,concepts,templates,skills,design,deploy,reference}/README.md`
- Modify: `AGENTS.md`(템플릿 수정 규칙 절 끝), `README.md`(디렉터리 구조 "이 저장소" 트리)

**Interfaces:**
- Produces: `node --test scripts/handbook.test.mjs`. 이후 모든 handbook 작업이 이 검사를 통과해야 한다. 쪽 표 형식 `| [쪽 제목](파일.md) | 한 줄 설명 |`, 문서 홈 묶음 표 형식 `| [묶음 이름](<묶음>/README.md) | 한 줄 설명 |`. 앵커 규칙 함수 `slug(heading)`(GitHub 방식).

- [ ] **Step 1: 실패하는 검사를 쓴다**

```js
// handbook/(사이트 /docs의 원본) 구조 검사.
//   문서 홈 표 → 묶음 소개 쪽, 묶음 소개 표 → 쪽. 표와 파일이 1:1로 맞고, 쪽마다 "> 한눈에:"가 있고,
//   상대 링크(파일과 #앵커)가 깨지지 않았는지 본다. 사이트(lib/handbook.ts)도 같은 표를 순서의 정본으로 읽는다.
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
const headings = (md) =>
	[...md.replace(/```[\s\S]*?```/g, "").matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => slug(m[1]));
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

test("상대 링크의 파일과 #앵커가 있다(handbook 밖 pro-kit 파일 포함)", () => {
	const bad = [];
	for (const f of mdFiles(HB)) {
		const md = read(f).replace(/```[\s\S]*?```/g, "");
		for (const [, href] of md.matchAll(/\]\(([^)\s]+)\)/g)) {
			if (/^(https?:|mailto:)/.test(href)) continue;
			const [path, hash] = href.split("#");
			const target = path ? normalize(join(dirname(f), path)) : f;
			if (!target.startsWith(ROOT) || !existsSync(target)) {
				bad.push(`${relative(HB, f)} → ${href} (파일 없음)`);
				continue;
			}
			if (hash && target.endsWith(".md") && !headings(read(target)).includes(decodeURIComponent(hash)))
				bad.push(`${relative(HB, f)} → ${href} (앵커 없음)`);
		}
	}
	assert.deepEqual(bad, []);
});

test("slug: GitHub 앵커 규칙", () => {
	assert.equal(slug("dev-cycle 라운드"), "dev-cycle-라운드");
	assert.equal(slug("케이스 A~H와 대조표"), "케이스-ah와-대조표");
	assert.equal(slug("`DESIGN.md`의 효과"), "designmd의-효과");
	assert.equal(slug("빠른 시작: 화면만 만들기"), "빠른-시작-화면만-만들기");
});
```

- [ ] **Step 2: 검사가 실패하는지 본다**

Run: `node --test scripts/handbook.test.mjs`
Expected: FAIL, `ENOENT ... handbook/README.md`(첫 검사), slug 검사는 PASS

- [ ] **Step 3: 문서 홈과 묶음 소개 7쪽을 쓴다**

`handbook/README.md`:

```markdown
# 프로킷 문서

> 한눈에: 프로킷이 어떻게 동작하는지 쪽마다 나눠 설명해요. 쪽마다 첫 문단은 쉬운 말로, 그 아래는 파일과 명령까지 자세히 적었어요. 따라 하며 만들어 보고 싶다면 [튜토리얼](../tutorials/README.md)부터 보세요.

## 핵심 3가지

| 핵심 | 설명 |
|---|---|
| 하네스 | 에이전트가 정해진 순서와 검사를 지키며 일하게 만드는 규칙, 스킬, 자동 검사의 묶음이에요. [하네스 엔지니어링](concepts/harness.md) |
| 전용 스킬 | `prokit-*` 스킬 8개가 분야마다 일하는 법을 알려 주고, 그 분야의 공식 스킬을 불러 써요. [prokit 스킬 8개](skills/prokit-skills.md) |
| 디자인부터 배포까지 | 스타일 추천과 `DESIGN.md`로 디자인을 정하고, HTML 내보내기나 Vercel 배포까지 이어져요. [UI/UX 흐름](design/ui-flow.md) |

## 문서 둘러보기

| 묶음 | 내용 |
|---|---|
| [시작하기](start/README.md) | 프로킷이 무엇인지, 준비물, 화면만 만들기와 서비스 만들기의 빠른 시작 |
| [핵심 개념](concepts/README.md) | 하네스, dev-cycle 라운드, 케이스와 대조표, 증거와 확인, 구현·리뷰 에이전트 |
| [템플릿](templates/README.md) | neon과 supabase 고르기, 템플릿이 더하는 것, 앱 구조, 설치기, 갱신 반영 |
| [스킬과 에이전트](skills/README.md) | prokit 스킬, 공식 스킬과 연결, 선택 스킬 묶음, 설치와 업데이트 |
| [디자인](design/README.md) | 스타일 추천과 브리프, `DESIGN.md`, 화면만 프로젝트와 HTML 내보내기 |
| [배포와 릴리스](deploy/README.md) | Vercel 배포와 되돌리기, GitHub Pages, 버전과 릴리스, 비밀값 지키기 |
| [레퍼런스](reference/README.md) | 명령 모음, 폴더 구조, 검증 결과, 자주 묻는 질문 |
```

묶음 소개 쪽의 형식(예: `handbook/start/README.md`). 7개 모두 이 형식이고, 표에는 그 묶음의 쪽(파일 구조 절의 목록)을 순서대로 넣는다.

```markdown
# 시작하기

> 한눈에: 프로킷이 무엇인지 알고, 필요한 것을 준비해 첫 프로젝트를 만들어요. 화면만 빠르게 만들 수도 있고, 로그인과 DB까지 갖춘 서비스로 시작할 수도 있어요.

| 쪽 | 내용 |
|---|---|
| [프로킷이란](what-is-prokit.md) | AI 에이전트에 설치하는 개발 키트, 그냥 맡길 때와 무엇이 다른지 |
| [준비물](requirements.md) | Node 24, pnpm, git, 컨테이너 엔진, Supabase CLI, Windows는 WSL2 |
| [빠른 시작: 화면만 만들기](quickstart-screens.md) | DB 없이 프롬프트 하나로 모든 화면과 HTML 내보내기까지 |
| [빠른 시작: 서비스 만들기](quickstart-service.md) | 템플릿 고르기부터 로컬 DB, 첫 마이그레이션, 커밋까지 |
| [만든 뒤 개발하기](after-create.md) | 새 세션에서 평소 말로 요청하기, 예시 프롬프트 |
```

다른 6개 묶음도 같은 형식으로, 쪽 제목은 아래와 같다(한 줄 설명은 그 쪽의 "한눈에"를 줄여 쓴다).
- `concepts/`: 하네스 엔지니어링, dev-cycle 라운드, 케이스 A~H와 대조표, 증거와 audit, 사용자 확인, 구현 에이전트와 리뷰 에이전트
- `templates/`: 템플릿 고르기, 템플릿이 더하는 것, 앱 구조, 설치기와 옵션, 기존 프로젝트에 갱신 반영
- `skills/`: prokit 스킬 8개, 공식 스킬과 연결, 선택 스킬 묶음, 설치와 업데이트 구조
- `design/`: UI/UX 흐름, DESIGN.md, 화면만 프로젝트와 HTML 내보내기
- `deploy/`: Vercel 배포와 되돌리기, GitHub Pages 배포, 버전과 릴리스, 비밀값 지키기
- `reference/`: 명령 모음, 설치된 프로젝트의 폴더 구조, 검증 결과, 자주 묻는 질문

- [ ] **Step 4: 쪽 30개를 뼈대로 만든다**

검사가 표와 파일을 1:1로 보므로, 이 단계에서 쪽마다 아래 뼈대를 둔다. 본문은 Task 2~8이 채운다. 뼈대의 "한눈에"는 Task 2~8에서 다시 쓴다.

```markdown
# <쪽 제목>

> 한눈에: <묶음 소개 표의 한 줄 설명을 문장으로>.

## 자세히

## 관련 문서
```

- [ ] **Step 5: 검사가 통과하는지 본다**

Run: `node --test scripts/handbook.test.mjs`
Expected: PASS 4개

- [ ] **Step 6: AGENTS.md와 README 트리에 handbook을 더한다**

`AGENTS.md` "템플릿 수정 규칙" 절 끝에 한 줄:

```markdown
- 문서 원본은 `handbook/`(사이트 `/docs`)이다. 문서 홈 `handbook/README.md`의 묶음 표와 묶음마다 `README.md`의 쪽 표가 순서의 정본이고, 쪽은 `# 제목`, 빈 줄, `> 한눈에: …`로 시작한다. 템플릿의 명령, 스킬, 구성을 바꾸면 관련 handbook 쪽도 맞추고 `node --test scripts/handbook.test.mjs`를 실행한다. 비용과 키, Windows, 문제 해결, 용어 풀이는 `tutorials/`로 링크하고 다시 쓰지 않는다.
```

`README.md` 디렉터리 구조 "이 저장소" 트리의 `tutorials/` 줄 위에:

```
├── handbook/                   문서 원본 (프로킷 사이트 /docs의 원본). 묶음 7개, 쪽 30개
```

- [ ] **Step 7: 커밋**

```bash
set -a; . /Users/freelife/youtube/.envrc; set +a
git add scripts/handbook.test.mjs handbook AGENTS.md README.md
git commit -m "docs: 문서 원본 handbook의 뼈대와 구조 검사를 더함

- 문서 홈과 묶음 소개 7쪽, 쪽 30개 뼈대
- scripts/handbook.test.mjs: 표와 파일 1:1, 한눈에, 링크와 앵커 검사

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2~8 공통: 묶음 본문 쓰기

각 Task는 한 묶음의 쪽을 채운다. 쪽마다 같은 순서로 한다.

- 재료 절을 읽는다(아래 표의 "재료"). 사실은 재료에 있는 것만 쓴다. 숫자(스킬 8개, 케이스 A~H, 포트, 버전 하한)는 재료에서 그대로 옮긴다.
- 틀: `# 제목` / 빈 줄 / `> 한눈에: …`(2~3문장, 전문 용어 없이) / 내용 h2(개념·흐름: 도식과 표) / `## 자세히`(파일, 명령, 규칙) / `## 관련 문서`(다른 쪽, 튜토리얼, 필요하면 README 절 링크).
- README의 Mermaid 도식은 그대로 옮긴다. 도식이 없는 흐름에는 새로 그리지 않는다.
- 각 Task 끝에 `node --test scripts/handbook.test.mjs`를 실행해 PASS를 보고, 커밋한다: `docs: handbook <묶음> 쪽을 씀`(본문 bullet에 쪽 이름).

### Task 2: 시작하기 (`start/`)

**Files:** Modify `handbook/start/{what-is-prokit,requirements,quickstart-screens,quickstart-service,after-create}.md`

| 쪽 | 쓸 내용 | 재료 |
|---|---|---|
| 프로킷이란 | 프로킷은 Claude Code·Codex에 설치하는 개발 키트. 템플릿 2개와 학습 자료. 그냥 AI에게 맡길 때와 다른 점(표 그대로). 누구를 위한 것인가 | README "소개", "누구나 전문 개발자처럼", "그냥 AI에게 맡길 때와 다른 점" |
| 준비물 | Node 24 이상, pnpm, git, 컨테이너 엔진(Podman 또는 Docker), supabase는 Supabase CLI 2.117 이상. macOS Podman 머신, Linux·WSL. Windows는 WSL2의 Ubuntu에서만 → 튜토리얼 Windows 가이드 링크. 화면만 만들기는 컨테이너 불필요 | AGENTS.md "템플릿으로 새 프로젝트 만들기" 3번, 템플릿 README "준비물", `tutorials/reference/windows.md` |
| 빠른 시작: 화면만 만들기 | 작업 폴더에서 프롬프트 하나(README 예시 그대로), 새 폴더로 이어 가는 한 줄, 화면 설계→디자인→모든 페이지→`pnpm export:html`, 배포 요청 붙이기, "실제 서비스로 바꿀 거야" | README "화면만 만들기 (DB 없이)", AGENTS.md "화면만 만들기", "작업 폴더에서 시작했을 때" |
| 빠른 시작: 서비스 만들기 | 요청하면 진행되는 6단계(확인, 앱 뼈대, 템플릿 설치, 개발용 DB, 점검과 커밋, 보고), 요청할 때만 하는 것, 직접 하기 명령 | README "빠른 시작", "요청하면 이렇게 진행됩니다", "새 프로젝트 만들기" |
| 만든 뒤 개발하기 | 새 폴더에서 새 세션, `impeccable hooks on`, 예시 프롬프트 표, 스펙·브리프 확인, 직접 확인과 배포 질문, 하루 한 번 스킬 업데이트 확인 | README "만든 뒤: 새 프로젝트에서 개발하기" |

- [ ] **Step 1:** 다섯 쪽을 쓴다(공통 절차).
- [ ] **Step 2:** Run `node --test scripts/handbook.test.mjs` → Expected PASS.
- [ ] **Step 3:** 커밋 `docs: handbook 시작하기 쪽을 씀`.

### Task 3: 핵심 개념 (`concepts/`)

**Files:** Modify `handbook/concepts/{harness,dev-cycle,cases,audit-and-confirm,agents}.md`

| 쪽 | 쓸 내용 | 재료 |
|---|---|---|
| 하네스 엔지니어링 | 하네스의 뜻(용어집 정의), 다섯 부분(규칙 문서, 스킬, 역할 나누기, 대조표와 audit, 자동 검사), 하네스 도식(Mermaid 그대로), 배포 요청은 라운드 없이 prokit-deploy | README "에이전트 하네스", "템플릿이 더하는 것", `tutorials/reference/glossary.md` 하네스 |
| dev-cycle 라운드 | 라운드 = 코드 바꾸는 작업 하나, `tasks/todo.md`의 대조표, status→case→table→행 실행→[confirm]→audit→close 도식, 마무리 선택(릴리스·배포), 백로그 | README "dev-cycle 라운드", 템플릿 `files/docs/dev-workflow.md` |
| 케이스 A~H와 대조표 | 케이스 표(A, B, C, D, E, F, H), 업그레이드(`--upgrade`), 로그인 경로면 security 리뷰 자동, 케이스별 행 전체는 `docs/dev-workflow.md` | README 케이스 표, `files/docs/dev-workflow.md` |
| 증거와 audit, 사용자 확인 | 증거 칸 규칙(실행하지 않은 검사는 통과로 적지 않음), `pnpm dev-cycle audit`, [confirm]은 N/A·blocked 불가, 확인 요청할 때 개발 서버·테스트 순서·알려진 문제, `pnpm dev-cycle secrets` | README "dev-cycle 라운드", prokit-verify 표 행, `files/.agents/skills/prokit-dev-cycle/SKILL.md` |
| 구현 에이전트와 리뷰 에이전트 | `prokit-implementer`(구현), `prokit-reviewer`(읽기 전용, code·security·db), 리뷰 행은 리뷰어만 채움, `.claude/agents` 원본과 `.codex/agents` 자동 생성(`pnpm agents:sync`) | README "템플릿이 더하는 것" 에이전트 행, "에이전트 하네스", `files/.claude/agents/*.md` |

- [ ] **Step 1:** 다섯 쪽을 쓴다. 재료에 없는 단계 이름이나 명령은 템플릿 파일에서 확인한 뒤에만 쓴다.
- [ ] **Step 2:** Run `node --test scripts/handbook.test.mjs` → PASS.
- [ ] **Step 3:** 커밋 `docs: handbook 핵심 개념 쪽을 씀`.

### Task 4: 템플릿 (`templates/`)

**Files:** Modify `handbook/templates/{choose,what-it-adds,app-structure,installer,update-existing}.md`

| 쪽 | 쓸 내용 | 재료 |
|---|---|---|
| 템플릿 고르기 | neon과 supabase 비교표, 무엇으로 고르나 | README "템플릿 고르기" |
| 템플릿이 더하는 것 | BTS가 만드는 것과 템플릿이 설치하는 것 도식, 구성 표 | README "Better-T-Stack이란", "템플릿이 더하는 것" |
| 앱 구조 | 앱 구조 도식과 설명(oRPC, Better Auth, Drizzle, `protectedProcedure`) | README "아키텍처 › 앱 구조" |
| 설치기와 옵션 | `install.sh <경로>`, `--diff`, `--with-global`, `--skip-skills`, 설치기가 하는 일, 설치한 뒤 할 일 | README "설치기 옵션", 템플릿 README "옵션", "설치한 뒤" |
| 기존 프로젝트에 갱신 반영 | `--diff`로 차이 보기, `.dev-cycle.json` 직접 비교, 옛 이름(`bts-*`)과 `CONTEXT.md` 옮기기, 케이스 H 라운드로 반영 | AGENTS.md "기존 프로젝트에 템플릿 갱신 반영" |

- [ ] **Step 1:** 다섯 쪽을 쓴다.
- [ ] **Step 2:** Run `node --test scripts/handbook.test.mjs` → PASS.
- [ ] **Step 3:** 커밋 `docs: handbook 템플릿 쪽을 씀`.

### Task 5: 스킬과 에이전트 (`skills/`)

**Files:** Modify `handbook/skills/{prokit-skills,official-skills,optional-bundles,install-and-update}.md`

| 쪽 | 쓸 내용 | 재료 |
|---|---|---|
| prokit 스킬 8개 | 스킬 표(맡는 일, 이런 요청, 지키게 하는 것), 평소 말로 요청하면 스스로 불러옴, Next.js는 설치된 판 문서 먼저 | README "prokit 스킬" |
| 공식 스킬과 연결 | 설치되는 공식 스킬 표, prokit 스킬과 대조표 행이 읽는 공식 스킬, 호출률과 활용도(잰 날짜·판 그대로) | README "공식 스킬" |
| 선택 스킬 묶음 | `ops`, `motion`, `mobile` 표, `pnpm skills:setup --optional`, 없을 때 설치 제안 | README "선택 스킬 묶음" |
| 설치와 업데이트 구조 | `skills.manifest.json`, 설치 도식, 전역 도구 구분, `skills:update`와 하루 한 번 확인, 스크립트 바뀐 스킬은 먼저 읽기, 플러그인은 업데이트 안 함 | README "스킬 설치 구조" |

- [ ] **Step 1:** 네 쪽을 쓴다.
- [ ] **Step 2:** Run `node --test scripts/handbook.test.mjs` → PASS.
- [ ] **Step 3:** 커밋 `docs: handbook 스킬과 에이전트 쪽을 씀`.

### Task 6: 디자인 (`design/`)

**Files:** Modify `handbook/design/{ui-flow,design-md,screen-only}.md`

| 쪽 | 쓸 내용 | 재료 |
|---|---|---|
| UI/UX 흐름 | 흐름 도식, 디자인 카탈로그 3곳에서 스타일 1~3위 추천, 브리프 확인, comp와 사진, 점수 기준, 프리셋 링크 | README "UI/UX 디자인 › 흐름", "스타일 추천 1~3위" |
| DESIGN.md | Google DESIGN.md 원칙을 적용하는 방법, 효과, 근거 자료, lint | README "Google DESIGN.md 원칙을 적용하는 방법", "DESIGN.md의 효과", "근거 자료" |
| 화면만 프로젝트와 HTML 내보내기 | `AGENTS.md` 맨 위 표시, 화면도 dev-cycle 라운드(대개 케이스 B), 예시 데이터, `pnpm export:html`, GitHub Pages·Vercel 배포, 실제 서비스로 바꾸기 | 템플릿 `prokit-ui/SKILL.md` "화면만 프로젝트", `references/screen-only.md` |

- [ ] **Step 1:** 세 쪽을 쓴다.
- [ ] **Step 2:** Run `node --test scripts/handbook.test.mjs` → PASS.
- [ ] **Step 3:** 커밋 `docs: handbook 디자인 쪽을 씀`.

### Task 7: 배포와 릴리스 (`deploy/`)

**Files:** Modify `handbook/deploy/{vercel,github-pages,release,secrets}.md`

| 쪽 | 쓸 내용 | 재료 |
|---|---|---|
| Vercel 배포와 되돌리기 | 준비(계정, 원격 DB, GitHub 원격), `pnpm vercel:deploy develop`·`production`, 배포 전 검사, DB 먼저, 되돌리기 안내, 운영은 기본 브랜치에서만 | README "배포", 템플릿 README "Vercel 배포", prokit-deploy 표 행 |
| GitHub Pages 배포 | 화면만 프로젝트의 GitHub Pages 배포, 토큰 준비는 튜토리얼 배포하기 링크 | `references/screen-only.md`, `tutorials/reference/deploy.md` |
| 버전과 릴리스 | `pnpm release`(버전 태그, `release/` 노트, GitHub Release), 운영 배포마다 버전과 노트 보여 주고 동의 | README "배포", 템플릿 README |
| 비밀값 지키기 | `.vercelignore`, `.gitignore`의 `.env.*`, `pnpm dev-cycle secrets`, 배포 값은 Vercel 환경변수에만 | README "템플릿이 더하는 것" Vercel 행, prokit-deploy |

- [ ] **Step 1:** 네 쪽을 쓴다.
- [ ] **Step 2:** Run `node --test scripts/handbook.test.mjs` → PASS.
- [ ] **Step 3:** 커밋 `docs: handbook 배포와 릴리스 쪽을 씀`.

### Task 8: 레퍼런스 (`reference/`)

**Files:** Modify `handbook/reference/{commands,project-structure,verification,faq}.md`

| 쪽 | 쓸 내용 | 재료 |
|---|---|---|
| 명령 모음 | 설치된 프로젝트에서 자주 쓰는 명령(dev, check, dev-cycle, skills:*, agents:*, export:html, vercel:deploy, release), 설치기 명령 | 템플릿 README "설치된 프로젝트에서 자주 쓰는 명령", README "스킬 설치 구조" 명령 블록 |
| 설치된 프로젝트의 폴더 구조 | 설치된 프로젝트 트리와 설명 | README "디렉터리 구조 › 설치된 프로젝트" |
| 검증 결과 | 템플릿이 무엇으로 검증됐나(단위 테스트, fixture 설치, 스킬 eval, 트리거 정확도, 독립 리뷰, 실제 DB E2E, Codex 스모크) 요약과 VERIFICATION.md 링크, 프리셋 검증 수치(README 표) | 두 템플릿 `VERIFICATION.md` 절 제목과 결과 줄, README 프리셋 표 |
| 자주 묻는 질문 | 재료에 답이 있는 질문만 8~12개(예: 코드를 몰라도 되나, Codex도 되나, DB 없이 되나, 비용은, Windows는, 이미 있는 프로젝트에도 되나, 스킬을 직접 불러야 하나). 비용·Windows·문제 해결은 튜토리얼 가이드 링크 | README 전체, `tutorials/reference/*` |

- [ ] **Step 1:** 네 쪽을 쓴다.
- [ ] **Step 2:** Run `node --test scripts/handbook.test.mjs` → PASS.
- [ ] **Step 3:** 커밋 `docs: handbook 레퍼런스 쪽을 씀`.

### Task 9: 사실 대조 리뷰

**Files:** Modify: 리뷰가 지적한 handbook 쪽

- [ ] **Step 1: 리뷰 에이전트를 묶음별로 나란히 띄운다** (읽기 전용, `oh-my-claudecode:critic` 또는 `verifier`). 지시: "handbook/<묶음>/의 쪽마다 문장을 재료(README 절, 템플릿 파일)와 대조해 근거 없는 주장, 틀린 숫자·명령·파일 이름, 재료와 다른 뜻을 파일:줄과 근거로 보고. 한눈에가 전문 용어 없이 읽히는지. 중복 규칙(비용·Windows·문제 해결·용어는 tutorials 링크) 위반."
- [ ] **Step 2:** 지적을 고친다. 근거가 없는 문장은 지운다.
- [ ] **Step 3:** Run `node --test scripts/handbook.test.mjs` → PASS.
- [ ] **Step 4:** 커밋 `docs: handbook 사실 대조 리뷰를 반영함`.

### Task 10: 한국어 검수

**Files:** Modify: handbook 쪽 전체

- [ ] **Step 1:** 묶음마다 `humanizer` → `style-guide` → `grammar-checker` 순서로 적용한다(릴리스 노트 검수와 같은 순서). 코드 식별자, 명령, 링크, 표의 사실, 뜻은 바꾸지 않는다. 용어는 "프리셋", "프리셋 팩", "가이드", 해요체로 통일.
- [ ] **Step 2:** Run `node --test scripts/handbook.test.mjs` → PASS.
- [ ] **Step 3:** 커밋 `docs: handbook 문장을 다듬음`.
- [ ] **Step 4:** 사용자에게 handbook을 GitHub 미리 보기로 확인받는다(`handbook/README.md`부터). 고칠 곳을 반영한 뒤 Task 12로 간다.

### Task 11: R27 스타 버튼과 스타 토스트 (포트폴리오 라운드)

**Files:**
- Create: `../pro-kit-samples/prompts/portfolio-R27.txt`
- 사이트 코드: 라운드가 만든다.

**Interfaces:**
- Consumes: R26이 닫혀 있어야 한다(사용자 확인 → [confirm] → close → 커밋).
- Produces: 헤더 `GitHub 마크 ★ N` 버튼, `StarToast`(실제: `apps/web/src/lib/github-stars.ts`의 `fetchStars()`, `formatStars(n)`, `stored(fn)`). R29가 소개 페이지 수치 줄과 마지막 CTA에서 같은 스타 수 값을 쓴다(라운드가 정한 모듈 이름을 R29 지시문에 적는다).

- [ ] **Step 1: 지시문을 쓴다** (`prompts/portfolio-R27.txt`)

```text
새 dev-cycle 라운드를 연다(사용자 요청 2026-10-07, 설계 승인됨). 케이스는 네가 판정한다(화면·컴포넌트면 B). 사용자가 3012의 개발 서버로 화면을 보는 중이다. 그 서버를 그대로 쓰고 끄지 않는다.
이 실행은 네가 답을 마치면 바로 끝나서 백그라운드 결과 알림을 받을 수 없다. 긴 명령도 포그라운드로 끝까지 기다리고 에이전트도 백그라운드로 띄우지 않는다.

설계 정본: /Users/freelife/youtube/pro-kit/docs/superpowers/specs/2026-10-07-prokit-about-docs-design.md 의 "1. GitHub 스타 버튼과 스타 토스트". 여기 적힌 동작을 그대로 만든다.

1. 헤더 스타 버튼: 헤더의 "GitHub" 링크(데스크톱과 모바일 시트)를 `★ <스타 수>` 버튼으로 바꾼다. 저장소 https://github.com/roadkwon-ai/pro-kit 를 새 탭으로 연다. 숫자는 빌드 때 GitHub API(GET https://api.github.com/repos/roadkwon-ai/pro-kit 의 stargazers_count, 토큰 없이)로 받아 넣고, 브라우저에서 처음 열 때 한 번 다시 받아 바꾸고 sessionStorage에 둔다. 받기 실패(한도 403, 오프라인)면 빌드 때 값, 빌드 때도 실패면 숫자 없이 "★ GitHub". 1,000 이상은 1.2k. 접근 이름 "GitHub에서 스타 주기, 현재 스타 N개". 콘솔 오류 0(실패해도 console.error를 남기지 않는다).
2. 스타 토스트(오른쪽 아래): 홈은 사용자가 스크롤해서 페이지 높이의 약 60%에 닿았을 때, /work/<이름>과 튜토리얼 마지막 쪽은 본문 끝에 닿았을 때. 불러오자마자 조건을 만족해도(짧은 페이지, 큰 화면) 사용자의 스크롤 뒤에만 본다. 한 세션에 한 번. 마스코트 hello 포즈(public/brand/mascot-hello-480.webp, 약 96px, alt="")가 아래에서 올라오고 말풍선: 문구 + "★ 스타 주기"(GitHub 새 탭) + 닫기(×, 접근 이름 "닫기"). 약 8초 뒤 내려가며 사라지고, 호버나 포커스가 있으면 멈춘다. 닫기·스타 주기를 누르면 30일 동안 다시 안 나온다(localStorage. 읽기·쓰기가 throw해도 그 세션에서 한 번만 나오고 오류 없음). role="status", 포커스를 옮기지 않는다. reduced-motion이면 미끄러짐 없이 나타나고 사라진다. 390 너비에서는 아래 가운데, 다른 고정 요소를 가리지 않는다.
   문구: 설계의 후보 5개 중 "프로킷이 마음에 들었다면 GitHub ★로 응원해 주세요"를 기본으로 쓴다(돌아가며 보이지 않는다).
3. 브랜드 설계(DESIGN.md)의 마스코트·말풍선·버튼 규칙을 따른다. impeccable shape → polish 한 번, detector 0건.
4. 확인: check-types, biome(기존 오류 말고 새 오류 없음), build, widths(320~1920, 토스트가 열린 상태 포함), axe(1440·390, 토스트 열린 상태 포함), clean, site-check, tutorials:check. 상호작용 스크립트에 추가: 스타 버튼 숫자와 링크, API를 막았을 때(route로 403) 빌드 값 표시와 콘솔 오류 0, 홈에서 스크롤 60% 뒤 토스트 등장·8초 뒤 사라짐, 호버 중 멈춤, 닫기 뒤 새로고침해도 안 나옴, localStorage를 막은 컨텍스트에서 예외 없이 한 번, reduced-motion에서 transform 애니메이션 없음, 불러오자마자는 안 나옴(스크롤 전). 스크린샷 tasks/evidence/R27/shots/: header-star-1440, header-star-390, toast-1440, toast-390.
[confirm] 행은 비워 두고 커밋하지 않는다. 3012 서버는 끄지 않는다. 보고는 짧게: 바꾼 파일, 스타 수 모듈 이름과 내보낸 함수, 검사 결과, 스크린샷 경로.
```

- [ ] **Step 2: 실행한다** (R26이 닫힌 뒤, 새 세션 ID 없이 새 대화로)

Run: `/Users/freelife/youtube/pro-kit-samples/tools/run.sh portfolio R27 /Users/freelife/youtube/pro-kit-samples/prompts/portfolio-R27.txt` (run_in_background)
Expected: `logs/portfolio-R27.done` 생성, 보고에 검사 PASS와 스크린샷 경로

- [ ] **Step 3: 결과를 확인한다**: 스크린샷 4장을 보고, 3012에서 직접 스크롤해 토스트를 본 뒤 사용자에게 확인을 요청한다.
- [ ] **Step 4: 사용자 확인 뒤** 같은 세션에 [confirm] 채우기·close·커밋을 지시하고(`run.sh … <세션 ID>`), 사이트 배포(publish-root.sh, gh-pages)는 사용자 확인을 받고 한다.

### Task 12: R28 문서 페이지 (포트폴리오 라운드)

**Files:**
- Create: `../pro-kit-samples/prompts/portfolio-R28.txt`

**Interfaces:**
- Consumes: Task 1~10의 `handbook/`(커밋됨), 앵커 규칙 `slug()`(scripts/handbook.test.mjs와 같은 규칙), R27이 닫혀 있음.
- Produces: `/docs`, `/docs/<묶음>/`, `/docs/<묶음>/<쪽>/` 경로, `pnpm handbook:sync`, `pnpm handbook:check`. R29가 헤더 메뉴 "문서"와 소개 페이지의 문서 링크에 쓴다.

- [ ] **Step 1: 지시문을 쓴다** (`prompts/portfolio-R28.txt`)

```text
새 dev-cycle 라운드를 연다(사용자 요청 2026-10-07, 설계 승인됨). 케이스는 네가 판정한다. 사용자가 3012의 개발 서버로 화면을 보는 중이다. 그 서버를 그대로 쓰고 끄지 않는다.
이 실행은 네가 답을 마치면 바로 끝나서 백그라운드 결과 알림을 받을 수 없다. 긴 명령도 포그라운드로 끝까지 기다리고 에이전트도 백그라운드로 띄우지 않는다.

GitHub API 한도를 기다리지 않는다. 브라우저 검사(clean, site-check, widths, axe, 상호작용)는 api.github.com을 가로채 가짜 응답을 주거나 localStorage `prokit:stars-v2`를 미리 넣어 한다(R27b 방식). 실제 API 확인이 필요한데 한도가 0이면 기다리지 말고 `미실행: GitHub API 한도 0(풀리는 시각)`으로 남긴다.
설계 정본: /Users/freelife/youtube/pro-kit/docs/superpowers/specs/2026-10-07-prokit-about-docs-design.md 의 "3. 사이트 페이지 설계"의 /docs 부분과 "데이터와 검사". 문서 원본은 /Users/freelife/youtube/pro-kit/handbook/ (원본은 읽기만 한다).

1. sync: scripts/sync-handbook.mjs + 루트 스크립트 "handbook:sync"(HANDBOOK_SRC 기본 ../../../pro-kit/handbook). .md → apps/web/content/handbook/, 그림 → public/images/handbook/. 튜토리얼 sync(scripts/sync-tutorials.mjs)와 같은 방식, 빌드는 사본만 읽는다.
2. lib/handbook.ts: 문서 홈 README.md의 묶음 표(첫 칸 링크 <묶음>/README.md)로 묶음 순서, 묶음 README.md의 쪽 표로 쪽 순서를 정한다. 쪽의 제목(# 줄), 한눈에(> 한눈에: 줄), h2·h3 목차를 만든다. 안쪽 링크(.md, #앵커)를 사이트 주소(/docs/<묶음>/<쪽>/#앵커)로 바꾸고, ../tutorials/… 링크는 사이트의 튜토리얼 주소로, 그 밖의 pro-kit 파일 링크는 https://github.com/roadkwon-ai/pro-kit/blob/main/<경로> 로 바꾼다. 앵커는 GitHub 규칙(소문자, 글자·숫자·공백·하이픈·밑줄만, 공백은 하이픈. `·`, `→`, `—`도 지운다. 한 쪽에서 같은 제목이 반복되면 -1, -2를 붙인다)으로 만들고 제목 id도 같은 규칙으로 단다. 규칙의 정본은 pro-kit `scripts/handbook.test.mjs`의 `slug()`와 `anchors()`다. 표에 없는 쪽, 한눈에 없는 쪽, 깨진 링크·앵커는 빌드 오류.
3. 페이지:
   - /docs: 눈썹 "PROKIT DOCS", 제목·설명(문서 홈의 한눈에), 버튼 "시작하기"(/docs/start/)·"핵심 개념"(/docs/concepts/), 마스코트, "핵심 3가지" 카드(문서 홈의 핵심 표), "문서 둘러보기" 묶음 카드(이름, 한 줄 설명, 쪽 수, 묶음 포즈), 아래 튜토리얼 안내 띠. 묶음 포즈(카드와 묶음 소개 쪽 머리): 시작하기 hello, 핵심 개념 idea, 템플릿 database, 스킬과 에이전트 tools, 디자인 design, 배포와 릴리스 deploy, 레퍼런스 read. 포즈 원본과 목록은 /Users/freelife/youtube/pro-kit-samples/brand/README.md "마스코트 포즈 목록"(web/mascot-<포즈>-480·960.webp를 public/brand/로 복사). 한 화면 한 마리 규칙의 예외로 묶음 카드 줄을 brand 문서와 DESIGN.md에 적는다.
   - /docs/<묶음>/: 묶음 소개. 한눈에 상자 + 쪽 카드 목록(쪽 표).
   - /docs/<묶음>/<쪽>/: components/tutorials/doc-shell.tsx를 다시 쓰거나 같은 틀로. 왼쪽 묶음 사이드바(지금 묶음만 펼침, 접고 펴기), 이동 경로(문서 › 묶음 › 쪽), 눈썹(묶음 이름), 제목, "한눈에" 상자(fog 바탕, 작은 마스코트 read, alt=""), 본문(기존 튜토리얼 마크다운 렌더러 재사용: 표, 코드 복사), 이전·다음(묶음을 넘어 이어짐), "GitHub에서 고치기"(handbook 원본 파일의 blob 주소). 1280 이상에서 오른쪽 "이 쪽에서" 목차(h2·h3, 스크롤 따라 현재 위치 표시). 모바일은 사이드바를 시트로, 오른쪽 목차는 숨김.
   - Mermaid: ```mermaid 블록이 있는 쪽에서만 mermaid를 동적 import로 불러와 브랜드 색(ink 선, paper 바탕, fog 면, Pretendard)으로 그린다. 불러오기 전과 실패 때는 원문을 코드 블록으로 보인다. 다른 쪽의 번들에는 mermaid가 들어가지 않게 한다(빌드 산출물로 확인).
4. 헤더 메뉴에 "문서"(/docs)를 튜토리얼 다음에 더한다(모바일 시트 포함). 사이트맵·브리프 문서(docs/briefs)를 갱신한다.
5. 검사: lib/handbook.check.mjs + "handbook:check"(묶음 7, 쪽 30, 모든 쪽에 한눈에, 링크 변환 단언, 앵커 규칙 단언: "dev-cycle 라운드"→"dev-cycle-라운드", "케이스 A~H와 대조표"→"케이스-ah와-대조표", "`DESIGN.md`의 효과"→"designmd의-효과", "Neon 개발·테스트 브랜치"→"neon-개발테스트-브랜치", 같은 제목 두 번→"바꾼-것", "바꾼-것-1").
6. impeccable shape → polish, detector 0건.
7. 확인: check-types, biome(새 오류 없음), build, widths(320~1920: /docs, /docs/concepts/, /docs/concepts/dev-cycle/, 도식이 있는 쪽 하나), axe(1440·390 같은 경로), clean, site-check(문서 모든 쪽 포함, 깊은 주소를 직접 열기와 새로고침 404 없음), tutorials:check, handbook:check. 상호작용 스크립트: 사이드바 접고 펴기, 오른쪽 목차 현재 위치, 이전·다음, Mermaid 그려짐, mermaid 요청을 막았을 때 원문 코드 표시와 본문 전체 표시, 다른 쪽 번들에 mermaid 없음. 스크린샷 tasks/evidence/R28/shots/: docs-home-1440, docs-home-390, docs-section-1440, docs-page-1440, docs-page-390, docs-mermaid-1440.
[confirm] 행은 비워 두고 커밋하지 않는다. 3012 서버는 끄지 않는다. 보고는 짧게: 바꾼 파일, 검사 결과, 스크린샷 경로.
```

- [ ] **Step 2: 실행** — Run: `/Users/freelife/youtube/pro-kit-samples/tools/run.sh portfolio R28 /Users/freelife/youtube/pro-kit-samples/prompts/portfolio-R28.txt` (run_in_background). Expected: `logs/portfolio-R28.done`, 보고에 handbook:check PASS.
- [ ] **Step 3: 확인** — 스크린샷을 보고 3012에서 `/docs` → 쪽 이동, 깊은 주소 새로고침, 도식을 직접 본다. 사용자 확인을 요청한다.
- [ ] **Step 4: 사용자 확인 뒤** [confirm]·close·커밋, 배포는 사용자 확인 뒤.

### Task 13: R29 소개 페이지와 홈 연결 (포트폴리오 라운드)

**Files:**
- Create: `../pro-kit-samples/prompts/portfolio-R29.txt`

**Interfaces:**
- Consumes: R27의 스타 수 모듈(보고에 적힌 이름), R28의 `/docs` 경로, 홈 워크플로우 탭 컴포넌트(R26j), pro-kit `release/*.md`.
- Produces: `/about`, 헤더 "프로킷 소개", 홈 세 곳의 안내 링크.

- [ ] **Step 1: 지시문을 쓴다** (`prompts/portfolio-R29.txt`). `<스타 모듈>`은 R27 보고에 적힌 모듈 경로와 함수 이름으로 바꿔 쓴다.

```text
새 dev-cycle 라운드를 연다(사용자 요청 2026-10-07, 설계 승인됨). 케이스는 네가 판정한다. 사용자가 3012의 개발 서버로 화면을 보는 중이다. 그 서버를 그대로 쓰고 끄지 않는다.
이 실행은 네가 답을 마치면 바로 끝나서 백그라운드 결과 알림을 받을 수 없다. 긴 명령도 포그라운드로 끝까지 기다리고 에이전트도 백그라운드로 띄우지 않는다.

GitHub API 한도를 기다리지 않는다. 브라우저 검사(clean, site-check, widths, axe, 상호작용)는 api.github.com을 가로채 가짜 응답을 주거나 localStorage `prokit:stars-v2`를 미리 넣어 한다(R27b 방식). 실제 API 확인이 필요한데 한도가 0이면 기다리지 말고 `미실행: GitHub API 한도 0(풀리는 시각)`으로 남긴다.
설계 정본: /Users/freelife/youtube/pro-kit/docs/superpowers/specs/2026-10-07-prokit-about-docs-design.md 의 "3. 사이트 페이지 설계"의 메뉴와 연결, /about 부분. 사실의 정본은 /Users/freelife/youtube/pro-kit/README.md 와 /Users/freelife/youtube/pro-kit/handbook/ 이다. 거기 없는 기능, 수치, 후기는 만들지 않는다.

1. 릴리스 노트 sync: scripts/sync-releases.mjs + "releases:sync". pro-kit release/*.md(파일 이름 <YYYYMMDD-HHmm>-<제목>.md, 첫 줄 "# vX.Y.Z — <영어 제목>" 형식을 실제 파일로 확인) 중 v* 노트를 apps/web/content/releases/로 복사한다. 소개 페이지는 최근 3개의 버전, 날짜, 첫 절의 bullet 3개까지 보여 주고 "전체 릴리스 보기"(https://github.com/roadkwon-ai/pro-kit/releases)로 잇는다.
2. /about 13절(설계 순서 그대로): 1 히어로(눈썹, 큰 제목, 설명, 시작 프롬프트 한 줄과 복사 — 탭 "화면만 만들기 | 서비스 개발하기", 프롬프트는 pro-kit README 빠른 시작의 예시에서, 버튼 "튜토리얼로 시작하기"(/tutorials)·"문서 보기"(/docs), 수치 줄: GitHub 스타(<스타 모듈>), prokit 스킬 8, 템플릿 2, 프리셋 8 — 숫자는 데이터에서 읽는다, 마스코트) 2 이런 걱정, 프로킷이(걱정 취소선 → 답 카드 6쌍. 답은 README "그냥 AI에게 맡길 때와 다른 점"과 prokit 스킬 표 "지키게 하는 것"에서만. 걱정 문구와 답 문구, 근거 절을 보고에 표로 적는다) 3 시작은 프롬프트 한 줄(번호 3단계 + 복사되는 코드 블록) 4 프로킷은 이렇게 일해요(홈의 탭 워크플로우 컴포넌트를 그대로) 5 dev-cycle 들여다보기(01 케이스 판정 02 대조표 03 증거와 audit 04 확인과 마무리. 고른 단계의 터미널 모양 출력 예시는 이 작업공간의 실제 라운드 기록 tasks/에서 가져온 것만, 자동 재생 없음, 탭 패턴) 6 하네스(ink 반전 절. 가운데 prokit-dev-cycle, 둘레에 규칙 문서·계층 스킬·공식 스킬·구현 에이전트·리뷰 에이전트·audit. 노드를 고르면 설명이 바뀌고, 같은 내용을 목록으로도 제공) 7 전용 스킬 8개(4×2 카드) 8 템플릿 두 가지(neon | supabase 비교) 9 디자인부터 배포까지(스타일 추천, DESIGN.md, 내보내기·배포) 10 지원 에이전트(Claude Code | Codex) 11 만들어진 것(프리셋 4장 미리 보기, 검증 수치, /로 전체 보기) 12 릴리스 노트(1번 sync) 13 마지막 CTA("프롬프트 한 줄이면 돼요" + 튜토리얼, 문서, ★ GitHub).
   각 절에서 더 자세한 내용은 해당 /docs 쪽으로 링크한다(예: 하네스 → /docs/concepts/harness/).
3. 데스크톱 헤더 아래 얇은 절 이동 메뉴(작동 방식, dev-cycle, 하네스, 스킬, 템플릿)가 붙어 다니고 현재 절을 표시한다. 390에서는 숨기거나 가로 스크롤 칩.
4. 헤더 메뉴: 프리셋 ▾ · 튜토리얼 · 문서 · 프로킷 소개 + ★. 홈 안내 세 곳: 첫 화면 수치 줄 옆 "프로킷 자세히 보기 →"(/about), 워크플로우 절 아래 "dev-cycle과 하네스 자세히 → 문서"(/docs/concepts/), 마지막 CTA 절 보조 버튼 "프로킷 소개 보기"(/about). R27c에서 더한 "이 사이트도 프로킷으로 만들었어요" 두 곳(홈 마무리 마스코트 말풍선, 푸터 브랜드 칸)도 /about으로 잇는다. /about 마스코트는 brand/README.md "마스코트 포즈 목록"을 따른다: 히어로 hello, 이런 걱정 worried → 답 idea, dev-cycle review, 하네스 connect(가운데)·shield, 전용 스킬 tools, 템플릿 database, 디자인부터 배포까지 design·deploy, 만들어진 것 done, 마지막 CTA star. 절마다 한 마리, 작게(120~160px), 꾸밈 alt="". 사이트맵·브리프 갱신.
5. 움직임은 화면에 들어올 때 살짝 나타나는 정도, reduced-motion이면 없음. 브랜드 설계(DESIGN.md) 그대로, ink 반전 절은 하네스 하나.
6. impeccable shape → polish, detector 0건.
7. 확인: check-types, biome(새 오류 없음), build, widths(320~1920 /about, /), axe(1440·390 /about, 하네스 노드를 고른 상태 포함), clean, site-check, tutorials:check, handbook:check, releases sync 단언(최근 3개, 버전 형식). 상호작용 스크립트: 히어로 탭과 복사, dev-cycle 단계 탭(키보드), 하네스 노드 고르기(키보드), 절 이동 메뉴 현재 절, 홈 세 링크. 스크린샷 tasks/evidence/R29/shots/: about-1920, about-1440(전체), about-390(전체), about-harness-1440, home-links-1440.
[confirm] 행은 비워 두고 커밋하지 않는다. 3012 서버는 끄지 않는다. 보고는 짧게: 바꾼 파일, 걱정과 답 카드의 근거 표, 검사 결과, 스크린샷 경로.
```

- [ ] **Step 2: 실행** — Run: `/Users/freelife/youtube/pro-kit-samples/tools/run.sh portfolio R29 /Users/freelife/youtube/pro-kit-samples/prompts/portfolio-R29.txt` (run_in_background). Expected: `logs/portfolio-R29.done`.
- [ ] **Step 3: 확인** — 걱정과 답 카드의 근거 표를 README와 대조하고, 스크린샷과 3012를 본다. 사용자 확인을 요청한다.
- [ ] **Step 4: 사용자 확인 뒤** [confirm]·close·커밋, 배포는 사용자 확인 뒤.

### Task 14: 2차 — README 줄이기와 규칙 갱신 (문서 페이지가 배포된 뒤)

**Files:**
- Modify: `README.md`, `AGENTS.md`

- [ ] **Step 1:** README에서 handbook으로 옮겨 간 자세한 절(prokit 스킬, 공식 스킬, 아키텍처, 디렉터리 구조 중 설치된 프로젝트, 설치기 옵션, UI/UX 디자인 상세)을 짧은 요약 2~4줄과 handbook 쪽 링크(GitHub 상대 경로)로 바꾼다. 빠른 시작, 템플릿 고르기 표, 프리셋 표, 릴리스, 학습 자료, 라이선스는 README에 남긴다.
- [ ] **Step 2:** AGENTS.md "템플릿 수정 규칙"의 "루트 README.md의 비교표, 도식, 디렉터리 구조와 이 파일의 절차도 맞춘다"와 "README '공식 스킬' 절의 표도 맞춘다"를 handbook 쪽 기준으로 고친다(정본은 handbook, README는 요약).
- [ ] **Step 3:** Run `node --test scripts/handbook.test.mjs` 와 README 안 링크 확인(`git grep -n 'handbook/' README.md`의 모든 경로가 존재) → PASS.
- [ ] **Step 4:** 커밋 `docs: README를 개요로 줄이고 자세한 설명을 handbook으로 옮김`.
- [ ] **Step 5:** README가 바뀌면 사이트 튜토리얼 sync와 무관한지 확인하고, 다음 v* 릴리스 노트에 포함한다(release.mjs 절차).

---

## 순서와 기다림

1. R26 마무리(진행 중: R26i 이름 바꾸기, R26j 워크플로우 탭) → 사용자 확인 → close → 커밋 → pro-kit v0.13.0 릴리스(프리셋 팩 목록 반영이 급함) → 사이트 배포.
2. Task 1~10(handbook)은 R26과 나란히 이 세션에서 진행할 수 있다(pro-kit 저장소만 바꾼다).
3. Task 11(R27)은 R26이 닫힌 뒤. Task 12(R28)는 Task 10과 R27이 끝난 뒤. Task 13(R29)는 R28 뒤. Task 14는 R28·R29 배포 뒤.
