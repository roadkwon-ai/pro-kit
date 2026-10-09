# 튜토리얼 프롬프트: 이름, 홈 구성, 시간과 비용 (A 단계) 실행 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모아 보기 사이트와 교재에 새 이름(튜토리얼 프롬프트, 컨셉으로 화면 만들기, 유명 서비스 클론하기), 프로젝트별 최소 시간과 비용, Claude Pro·ChatGPT Plus 가능 여부, 클론 토큰 경고, 응용 안내를 넣고 공개한다.

**Architecture:** 교재 글(`main` 저장소 `tutorials/`)을 먼저 고치고 검사·검수한 뒤 커밋한다. 사이트(`../bts-samples/ws/portfolio`)는 headless 라운드 R19가 교재를 동기화하고 이름, 홈 문구, 숫자를 반영한다. 마지막에 사용자 확인을 받고 릴리스(`v0.10.1`)와 gh-pages 공개를 한다.

**Tech Stack:** Markdown 교재, Python 3 편집 스크립트(정확히 한 번 바꾸기), Node 링크·프롬프트 검사기, Next.js 사이트(작업공간), `scripts/release.mjs`, `bts-samples/tools/run.sh`, `tools/publish-root.sh`

**Spec:** [docs/superpowers/specs/2026-10-05-tutorial-prompts-home-and-cost-design.md](../specs/2026-10-05-tutorial-prompts-home-and-cost-design.md)

## Global Constraints

- 숫자와 표시는 설계 6절(단가표와 숫자)과 7절(구독 표시)에서만 옮긴다. A 단계의 샘플 값은 "내 컨셉으로" 열이다.
- 모든 숫자 옆에 "최소값이고 AI와 진행 상황에 따라 2~3배까지 늘 수 있다"는 안내가 닿게 한다(요약 줄 또는 링크).
- 교재 문체는 해요체, 루트 README는 합니다체다. 같은 대상은 같은 말로 부른다("에이전트", "대화창", "터미널").
- ```` ```prompt ```` 블록은 바꾸지 않는다. 프롬프트 안에 색, 크기, 시간 같은 값을 넣지 않는다.
- 사이트가 검사하는 원본 구조는 바꾸지 않는다.
  - `tutorials/README.md`의 "## 튜토리얼 목록" 표 열은 `튜토리얼 | 무엇을 만드나요`이고, 설명 칸에 링크를 두지 않는다.
  - `tutorials/samples/README.md`의 "## 샘플로 만들어 보기" 표 열은 `샘플 | 컨셉 | 페이지`다.
  - `<details>` 다음 줄에 `<summary>…</summary>`를 두고, `<details>` 안에 `<details>`를 넣지 않는다.
- 셸 작업 디렉터리를 `templates/`, `pack/`, `tutorials/01-nextflix`, `tutorials/samples` 안에 두지 않는다. 명령은 저장소 루트에서 절대 경로로 실행한다(OMC 훅이 `.omc/`를 만든다).
- git commit·push·gh 앞에는 `set -a; . /Users/freelife/youtube/.envrc; set +a`를 붙인다. 토큰 값은 출력하지 않는다.
- `main` push, 릴리스, gh-pages push는 Task 10에서 사용자 확인을 받은 뒤에만 한다.
- `.claude/settings.json`은 커밋하지 않는다.

## Review Focus

1. **사이트 원본 파서**: 허브 표 열 이름, 샘플 표 열 이름, 설명 칸의 링크가 바뀌면 사이트 빌드가 멈춘다. 독자는 "사이트가 그대로 열린다"를 기대한다. Task 8 Step 2의 구조 검사와 Task 9의 `tutorials:check`가 막는다.
2. **표가 든 접힘 상자**: `<details>` 안의 표가 GitHub과 사이트 양쪽에서 표로 보여야 한다. Task 9 Step 4에서 펼친 상태 스크린샷으로 확인한다.
3. **새 앵커**: `#시간과-비용-읽는-법`, `#5시간-한도에-걸리면`, `#시간과-비용`은 숫자로 시작하거나 한글이 섞여 있다. GitHub과 사이트 양쪽에서 링크가 맞는 곳으로 가야 한다. Task 8 Step 3의 grep과 Task 9 Step 4의 사이트 앵커 확인이 막는다.
4. **숫자 일치**: 교재, 사이트 홈, 카드, 상세의 값이 설계 6·7절과 같아야 한다. Task 8 Step 4의 대조 스크립트와 Task 9 보고의 "다른 숫자 목록"이 막는다.
5. **공개 범위**: 커밋하지 않은 시안 선택 수정(5개 파일)이 이번 릴리스에 함께 들어가야 한다. 빠지면 교재가 서로 어긋난다. Task 1이 먼저 커밋한다.

## 파일 구조

| 파일 | 하는 일 |
|---|---|
| `tutorials/reference/costs-and-keys.md` | "시간과 비용 읽는 법", "5시간 한도에 걸리면" 절. 다른 쪽이 모두 여기로 링크한다 |
| `tutorials/samples/<샘플>.md` 8개 | 샘플마다 "시간과 비용" 절(스크립트로 생성) |
| `tutorials/samples/README.md`, `tutorials/samples/05-build.md` | 샘플 튜토리얼의 범위 요약, 한도 링크, 이름 |
| `tutorials/01-nextflix/README.md`, `04-screens.md`, `05-auth-profiles.md` | Nextflix 경고, "시간과 비용" 블록, 만든 기록, 한도 링크 |
| `tutorials/README.md`, `tutorials/start/README.md`, `tutorials/reference/glossary.md`, `README.md` | 허브 표와 경고, 응용 안내, 이름, 한도 링크 |
| `docs/superpowers/specs/2026-10-01-bts-starter-kit-tutorials-design.md` | 교재 규칙 5.5절, 7절 사이트 이름 |
| `../bts-samples/prompts/portfolio-R19.txt` | 사이트 라운드 지시 |

---

### Task 1: 지난 수정과 설계·계획 커밋

**Files:**
- Commit: `tutorials/01-nextflix/01-create-project.md`, `tutorials/01-nextflix/03-design.md`, `tutorials/01-nextflix/04-screens.md`, `tutorials/01-nextflix/README.md`, `tutorials/reference/glossary.md`
- Commit: `docs/superpowers/specs/2026-10-05-tutorial-prompts-home-and-cost-design.md`, `docs/superpowers/plans/2026-10-05-tutorial-prompts-home-and-cost.md`

**Interfaces:**
- Produces: 깨끗한 작업 트리(`.claude/settings.json`만 남음). 뒤 Task의 diff에 시안 선택 수정이 섞이지 않는다.

- [ ] **Step 1: 상태 확인**

Run: `git -C /Users/freelife/youtube/bts-starter-kit status --short`
Expected: 위 다섯 교재 파일이 `M`, 설계와 계획 파일이 `??`, 그리고 `?? .claude/settings.json`

- [ ] **Step 2: 시안 선택 수정 커밋**

```bash
cd /Users/freelife/youtube/bts-starter-kit && set -a; . /Users/freelife/youtube/.envrc; set +a
git add tutorials/01-nextflix/01-create-project.md tutorials/01-nextflix/03-design.md tutorials/01-nextflix/04-screens.md tutorials/01-nextflix/README.md tutorials/reference/glossary.md
git commit -m "docs: Nextflix 시안 그리기를 선택으로 바꾸고 이미지 API 연결 안내" -m "- 기본은 시안 없이 구성도로 홈 화면 구성을 고른다. 첫 프롬프트와 3장 프롬프트에 그 줄을 넣고, 시안을 원하면 바꿔 보내는 법을 적음
- Codex는 준비할 것이 없고 Claude Code는 유료 OpenAI API 키나 ChatGPT 유료 요금제로 로그인한 Codex CLI가 있어야 시안을 그린다고 안내
- 1장 3단계를 선택 단계로, 용어집 구성도 뜻과 만든 기록(샘플은 시안을 그린 판)을 맞춤

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3: 설계와 계획 커밋**

```bash
cd /Users/freelife/youtube/bts-starter-kit && set -a; . /Users/freelife/youtube/.envrc; set +a
git add docs/superpowers/specs/2026-10-05-tutorial-prompts-home-and-cost-design.md docs/superpowers/plans/2026-10-05-tutorial-prompts-home-and-cost.md
git commit -m "docs: 튜토리얼 프롬프트 이름과 시간·비용 설계와 실행 계획" -m "- 홈 대제목 튜토리얼 프롬프트, 소제목 컨셉으로 화면 만들기와 유명 서비스 클론하기
- 프로젝트별 최소 시간과 비용(실측 단가), Claude Pro·ChatGPT Plus 가능 여부, 클론 토큰 경고
- 샘플 자료 팩은 B 단계로 나눔

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git status --short
```
Expected: `?? .claude/settings.json`만 남는다.

---

### Task 2: `costs-and-keys.md`에 두 절

**Files:**
- Modify: `tutorials/reference/costs-and-keys.md:3-8`(에이전트 요금 절 끝)

**Interfaces:**
- Produces: 앵커 `../reference/costs-and-keys.md#시간과-비용-읽는-법`, `../reference/costs-and-keys.md#5시간-한도에-걸리면`. Task 3~7이 링크한다.

- [ ] **Step 1: 에이전트 요금 문장 바꾸고 두 절 넣기**

```bash
cd /Users/freelife/youtube/bts-starter-kit && python3 - <<'PY'
p='tutorials/reference/costs-and-keys.md'
s=open(p).read()
old="""화면 디자인과 모든 페이지 만들기는 사용량이 많은 작업이에요. 샘플을 만들 때 쓴 시간은 각 튜토리얼 첫 쪽의 "만든 기록"에 적어 두었어요.

## 이미지 그리기"""
new="""화면 디자인과 모든 페이지 만들기는 사용량이 많은 작업이에요. 튜토리얼마다 "시간과 비용"에 최소 시간과 비용, 내 요금제로 되는지를 적어 두었어요. 읽는 법은 아래에 있어요.

## 시간과 비용 읽는 법

튜토리얼의 시간과 비용은 프롬프트와 자료 팩으로 순조롭게 한 번에 끝날 때의 **최소값**이에요. 이럴 때 더 들어요.

- **쓰는 AI와 모델**: 공급사(Claude Code, Codex)와 모델마다 토큰 단가와 일하는 방식이 달라요. 같은 일도 최소값의 1~2배까지 차이 날 수 있어요.
- **다시 요청하고 다듬기**: 결과를 보고 고쳐 달라고 할 때마다 더 들어요. 샘플을 만들 때는 다시 디자인하고 다듬으면서 최소값의 1.1~3배, 대개 2배쯤 들었어요.
- **오류와 끊김**: 중간에 끊겨 이어 가면 다시 읽고 확인하느라 20%쯤 더 들어요.
- **정액 요금제**: 돈은 더 들지 않아요. 대신 사용량 한도에 걸리면 기다려야 해서 끝나는 시각이 늦어져요.

넉넉히 잡으려면 최소값의 2~3배를 생각하세요.

비용은 같은 일을 API로 했을 때의 요금으로 환산한 값이에요. 정액 요금제로 쓰면 이 돈이 따로 나가지 않아요. 시안과 AI 그림을 OpenAI API 키로 그리면 이미지 요금이 따로 들어요.

최소값은 실제로 잰 단위값으로 계산했어요(2026-10-05).

| 잰 것 | 값 |
|---|---|
| 작업 폴더에서 프로젝트 만들기 | 3.2분, 0.9달러 |
| 스타일 추천, DESIGN.md 받기 | 0.95달러, 2.45달러 |
| 첫 화면(다듬기 없이) | 12~19분, 4.45~6.34달러 |
| 두 번째 화면(따로 만들 때) | 6~10분, 2.74~3.05달러 |
| 기능 하나를 만들고 검사하기 | 약 15분, 7달러 |
| Nextflix 2~4장 | 약 2시간 25분, 약 90달러 |

## 5시간 한도에 걸리면

Claude Pro와 ChatGPT Plus 같은 구독 요금제는 **처음 쓰기 시작한 때부터 5시간 동안 쓸 수 있는 양**이 정해져 있어요. 에이전트가 오래 일하면 이 양을 다 써서 중간에 멈춰요.

1. **멈추면**: 에이전트가 한도에 걸렸다며 언제 풀리는지 알려 줘요. 만든 파일과 진행한 내용은 그대로 남아요.
2. **기다리기**: 알려 준 시각까지 기다려요. 5시간은 처음 쓰기 시작한 때부터 세서, 길면 4시간 넘게 기다릴 수 있어요. 컴퓨터는 꺼도 돼요.
3. **이어 가기**: 시각이 지나면 같은 프로젝트 폴더에서 에이전트를 열고 `하던 작업 이어서 해줘`라고 보내요. 멈춘 곳부터 이어서 해요.
4. **기다리기 싫으면**: 사용 크레딧을 켜면 바로 이어 가요. Claude Code는 `/usage-credits`로 켜고 API 요금으로 청구돼요. Codex는 크레딧을 사요.

튜토리얼의 "5시간 한도에 약 2번 걸려요"는 이 일을 두 번 겪는다는 뜻이에요. 일하는 시간은 그대로이고, 기다리는 시간만큼 끝나는 시각이 늦어져요.

**주간 한도**도 있어요. 일주일 동안 쓸 수 있는 전체 양이라, 다 쓰면 정해진 날까지 기다려야 해요. 샘플 몇 개는 한 주에 충분하지만 Nextflix를 끝까지 만들면 닿을 수 있어요. 자주 만든다면 Claude Max나 ChatGPT Pro가 편해요. ChatGPT Pro는 지금 5시간 한도가 없어요.

남은 양은 Claude Code에서 `/usage`를 입력하거나 Codex의 사용량 화면에서 확인해요.

> [!NOTE]
> 두 회사 모두 한도를 토큰이나 금액으로 공개하지 않아요. 튜토리얼의 횟수는 Pro의 5시간 한도를 API 요금 환산 약 30달러로 어림해 계산한 값이에요(2026-10-05 기준). Codex는 가벼운 모델로 바꾸면 5시간 한도가 약 3배 늘어요.

## 이미지 그리기"""
assert s.count(old)==1; open(p,'w').write(s.replace(old,new)); print('ok')
PY
```
Expected: `ok`

- [ ] **Step 2: 앵커가 될 제목 확인**

Run: `grep -n "^## 시간과 비용 읽는 법$\|^## 5시간 한도에 걸리면$" /Users/freelife/youtube/bts-starter-kit/tutorials/reference/costs-and-keys.md`
Expected: 두 줄

---

### Task 3: 샘플 쪽 8개의 "시간과 비용" 절

**Files:**
- Modify: `tutorials/samples/{goru,ullim,studyday,afterglow,fitslot,jecheol,pacecrew,uptrail}.md`(각 "## 실제로 거친 과정" 바로 앞, 7행 링크 글자)

**Interfaces:**
- Consumes: Task 2의 두 앵커
- Produces: 샘플마다 "## 시간과 비용" 절. 요약 줄의 시간·비용과 구독 표시는 설계 6.3절 "내 컨셉으로" 열, 7절 A 단계 열과 같다.

- [ ] **Step 1: 생성 스크립트 저장**

`/private/tmp/claude-501/-Users-freelife-youtube-bts-starter-kit/530aaa4b-12f1-4247-9663-4b9d1d6ba1f9/scratchpad/plan/sample_cost.py`에 아래 내용을 저장한다(이미 있으면 같은지 확인한다). 저장소에는 넣지 않는다.

```python
import math,sys,pathlib
ROOT=pathlib.Path('/Users/freelife/youtube/bts-starter-kit/tutorials/samples')
# 설계 2026-10-05 6.2절(내 컨셉으로), 6.3절, 6.4절, 7절
S={'goru':('고루',7,5,'약 2시간 50분','약 90달러'),'ullim':('울림',11,41,'약 3시간 25분','약 170달러'),
   'studyday':('하루공부',14,3,'약 2시간 15분','약 65달러'),'afterglow':('AFTERGLOW',17,22,'약 3시간 20분','약 125달러'),
   'fitslot':('핏슬롯',20,18,'약 2시간 25분','약 100달러'),'jecheol':('제철상자',21,32,'약 3시간 25분','약 150달러'),
   'pacecrew':('PACECREW',22,46,'약 4시간 25분','약 170달러'),'uptrail':('Uptrail',22,2,'약 2시간 20분','약 75달러')}
def hm(m):
    m=int(math.floor(m/5+0.5)*5);h,mm=divmod(m,60)
    return (f"{h}시간 {mm}분" if mm else f"{h}시간") if h else f"{mm}분"
def mrow(m):
    m=int(math.floor(m+0.5));h,mm=divmod(m,60)
    return (f"{h}시간 {mm}분" if mm else f"{h}시간") if h else f"{mm}분"
def usd(c):
    if c<1: return "1달러 미만"
    return f"{int(math.floor(c+0.5))}달러" if c<10 else f"{int(math.floor(c/5+0.5)*5)}달러"
def block(slug):
    n,p,img,mt,mc=S[slug]
    rows=[('준비: bts-starter-kit 받기, 프로젝트 만들기',5,1),('기획: 서비스 질문, 이름, 사이트맵',10,3),
          ('디자인: 스타일 추천 1~3위, DESIGN.md',8,3.5),('화면 구성: 시안 3장',10,3),(f'AI 그림 {img}장',img*0.5,img*0.3),
          ('첫 화면',15,6),(f'나머지 페이지 {p-1}개',(p-1)*5,(p-1)*2),('검사와 디자인 리뷰',5+0.3*p,2+0.2*p),('HTML 내보내기',2,0.5)]
    T=sum(r[1] for r in rows);C=sum(r[2] for r in rows);win=math.ceil(int(math.floor(C/5+0.5)*5)/30)
    plan='가능 (5시간 한도 안)' if win==1 else f'가능 (5시간 한도에 약 {win-1}번 걸려요)'+(' 2~3일에 나눠 만들어요' if win>4 else '')
    tbl='\n'.join(f'| {a} | {mrow(t)} | {usd(c)} |' for a,t,c in rows)
    return f"""## 시간과 비용

위 프롬프트로 이 컨셉의 화면을 처음부터 만들 때 최소 **약 {hm(T)}, API 요금 환산 약 {usd(C)}**가 들어요.

Claude Pro · ChatGPT Plus(Codex): {plan} · [5시간 한도란?](../reference/costs-and-keys.md#5시간-한도에-걸리면)

순조롭게 한 번에 끝날 때의 최소값이에요. AI와 진행 상황에 따라 2~3배까지 늘 수 있어요. [자세히](../reference/costs-and-keys.md#시간과-비용-읽는-법)

<details>
<summary>단계별 예상</summary>

| 단계 | 시간 | 비용 |
|---|---|---|
{tbl}
| (선택) GitHub Pages 배포 | 5분 | 1달러 |

시안과 AI 그림을 OpenAI API 키로 그리면 이미지 요금이 따로 들어요. ChatGPT 요금제로 그리면 그 사용량 안이에요.

</details>

<details>
<summary>만든 사람이 실제로 쓴 값</summary>

{n} 샘플을 만들 때는 첫 화면 리디자인과 모든 페이지로 넓히기에 {mt}, API 요금 환산 {mc}가 들었어요. 사이트에 싣기 위해 다시 디자인하고 다듬은 값이라 위 예상보다 커요. 버린 첫 초안과 나중의 문구 바꾸기는 넣지 않았어요.

</details>

"""
if __name__=='__main__':
    apply='--apply' in sys.argv
    for slug in S:
        f=ROOT/f'{slug}.md';s=f.read_text();anchor='## 실제로 거친 과정\n'
        assert s.count(anchor)==1,(slug,'anchor');assert '## 시간과 비용' not in s,(slug,'already')
        b=block(slug)
        if apply: f.write_text(s.replace(anchor,b+anchor))
        else: print(slug, b.split('\n')[2])
    if not apply: print(block('goru'))
```

- [ ] **Step 2: 미리 보기로 요약값 확인**

Run: `python3 /private/tmp/claude-501/-Users-freelife-youtube-bts-starter-kit/530aaa4b-12f1-4247-9663-4b9d1d6ba1f9/scratchpad/plan/sample_cost.py | head -8`
Expected (설계 6.3절 "내 컨셉으로" 열과 같다):
```
goru 위 프롬프트로 이 컨셉의 화면을 처음부터 만들 때 최소 **약 1시간 30분, API 요금 환산 약 35달러**가 들어요.
ullim … **약 2시간 10분, API 요금 환산 약 55달러** …
studyday … **약 2시간 5분, API 요금 환산 약 50달러** …
afterglow … **약 2시간 30분, API 요금 환산 약 60달러** …
fitslot … **약 2시간 45분, API 요금 환산 약 65달러** …
jecheol … **약 2시간 55분, API 요금 환산 약 75달러** …
pacecrew … **약 3시간 10분, API 요금 환산 약 80달러** …
uptrail … **약 2시간 50분, API 요금 환산 약 65달러** …
```

- [ ] **Step 3: 적용하고 링크 글자 바꾸기**

```bash
cd /Users/freelife/youtube/bts-starter-kit && python3 /private/tmp/claude-501/-Users-freelife-youtube-bts-starter-kit/530aaa4b-12f1-4247-9663-4b9d1d6ba1f9/scratchpad/plan/sample_cost.py --apply && python3 - <<'PY'
import pathlib
for slug in ['goru','ullim','studyday','afterglow','fitslot','jecheol','pacecrew','uptrail']:
    p=pathlib.Path(f'tutorials/samples/{slug}.md');s=p.read_text()
    a='[포트폴리오에서 모든 페이지 보기]';b='[튜토리얼 프롬프트 사이트에서 모든 페이지 보기]'
    assert s.count(a)==1,slug; p.write_text(s.replace(a,b))
print('ok')
PY
grep -c "^## 시간과 비용$" tutorials/samples/{goru,ullim,studyday,afterglow,fitslot,jecheol,pacecrew,uptrail}.md
grep -h "^Claude Pro" tutorials/samples/{goru,ullim,studyday,afterglow,fitslot,jecheol,pacecrew,uptrail}.md | cut -c1-70
```
Expected: `ok`, 파일마다 `1`. 구독 표시는 고루·울림·하루공부·AFTERGLOW가 "약 1번", 핏슬롯·제철상자·PACECREW·Uptrail이 "약 2번"(설계 7절 A 단계 열).

---

### Task 4: 샘플 튜토리얼 첫 쪽과 5장

**Files:**
- Modify: `tutorials/samples/README.md:12`, `:129`, `:172-175`("## 시간과 비용" 절)
- Modify: `tutorials/samples/05-build.md:63`

**Interfaces:**
- Consumes: Task 2의 두 앵커

- [ ] **Step 1: 이름, 시간과 비용 절, 한도 링크 바꾸기**

```bash
cd /Users/freelife/youtube/bts-starter-kit && python3 - <<'PY'
p='tutorials/samples/README.md'; s=open(p).read()
R=[("[포트폴리오](https://roadkwonai.github.io/bts-starter-kit/)의 샘플 8개도",
    "[튜토리얼 프롬프트 사이트](https://roadkwonai.github.io/bts-starter-kit/)의 샘플 8개도"),
   ("- **사용량 한도에 걸려 멈췄어요**: 안내된 시간이 지난 뒤 `~/projects/living`에서 에이전트를 열고 `하던 작업 이어서 해줘`라고 보내세요.",
    "- **사용량 한도에 걸려 멈췄어요**: 안내된 시간이 지난 뒤 `~/projects/living`에서 에이전트를 열고 `하던 작업 이어서 해줘`라고 보내세요. 기다리는 법은 [5시간 한도에 걸리면](../reference/costs-and-keys.md#5시간-한도에-걸리면)에 있어요."),
   ("""## 시간과 비용

- 샘플 하나에 에이전트 사용량을 API 요금으로 환산해 68~181달러어치 썼어요. 첫 리디자인부터 모든 페이지로 넓히기, 사진 다시 만들기, 지워진 작업 폴더를 되살린 일까지 더한 값이라 처음 만드는 것보다 많아요. 정액 요금제라면 중간에 사용량 한도에 걸릴 수 있어요.
- 페이지가 많을수록""",
    """## 시간과 비용

이 튜토리얼로 화면을 처음부터 만들 때 샘플 하나에 최소 약 1시간 30분~3시간 10분, API 요금 환산 약 35~80달러가 들어요. 샘플마다 값은 샘플 쪽의 "시간과 비용"에 있어요.

Claude Pro · ChatGPT Plus(Codex): 가능 (5시간 한도에 약 1~2번 걸려요) · [5시간 한도란?](../reference/costs-and-keys.md#5시간-한도에-걸리면)

순조롭게 한 번에 끝날 때의 최소값이에요. AI와 진행 상황에 따라 2~3배까지 늘 수 있어요. [자세히](../reference/costs-and-keys.md#시간과-비용-읽는-법)

- 페이지가 많을수록""")]
for a,b in R:
    assert s.count(a)==1,a[:40]; s=s.replace(a,b)
old_img_end="자세한 내용은 [비용과 키](../reference/costs-and-keys.md)에 있어요.\n\n## 만든 기록"
new_img_end="""자세한 내용은 [비용과 키](../reference/costs-and-keys.md)에 있어요.

<details>
<summary>만든 사람이 실제로 쓴 값</summary>

샘플 하나에 에이전트 사용량을 API 요금으로 환산해 68~181달러어치 썼어요. 첫 리디자인부터 모든 페이지로 넓히기, 사진 다시 만들기, 지워진 작업 폴더를 되살린 일까지 더한 값이라 처음 만드는 것보다 많아요.

</details>

## 만든 기록"""
assert s.count(old_img_end)==1; s=s.replace(old_img_end,new_img_end)
open(p,'w').write(s)
p='tutorials/samples/05-build.md'; s=open(p).read()
a="- **사용량 한도에 걸렸어요**: 안내된 시간이 지난 뒤 같은 폴더에서 에이전트를 열고 `하던 작업 이어서 해줘`라고 보내세요."
assert s.count(a)==1; s=s.replace(a,a+" 기다리는 법은 [5시간 한도에 걸리면](../reference/costs-and-keys.md#5시간-한도에-걸리면)에 있어요."); open(p,'w').write(s)
print('ok')
PY
sed -n '/^## 시간과 비용/,/^## 만든 기록/p' tutorials/samples/README.md
```
Expected: `ok`, 그리고 새 "시간과 비용" 절(요약, 구독 표시, 안내, 두 bullet, 접힌 "만든 사람이 실제로 쓴 값")

---

### Task 5: Nextflix 첫 쪽과 장의 한도 링크

**Files:**
- Modify: `tutorials/01-nextflix/README.md`(머리말 뒤 경고, "## 시간과 비용", "## 만든 기록", 133행 "막히면")
- Modify: `tutorials/01-nextflix/04-screens.md:78`, `tutorials/01-nextflix/05-auth-profiles.md:70`

**Interfaces:**
- Consumes: Task 2의 두 앵커
- Produces: 같은 쪽 앵커 `#시간과-비용`

- [ ] **Step 1: 경고, 시간과 비용 블록, 만든 기록 바꾸기**

```bash
cd /Users/freelife/youtube/bts-starter-kit && python3 - <<'PY'
p='tutorials/01-nextflix/README.md'; s=open(p).read()
intro="코드를 몰라도 프롬프트를 복사해 [에이전트](../reference/glossary.md#도구)(Claude Code나 Codex)에 붙여 넣으며 따라가면 돼요.\n\n## 무엇을 만드나요"
assert s.count(intro)==1
s=s.replace(intro,"""코드를 몰라도 프롬프트를 복사해 [에이전트](../reference/glossary.md#도구)(Claude Code나 Codex)에 붙여 넣으며 따라가면 돼요.

> [!WARNING]
> 토큰을 많이 쓰는 튜토리얼이에요. 화면까지(1~4장) 최소 약 2시간 25분, API 요금 환산 약 80달러, 끝까지(1~12장) 최소 약 5시간 15분, 약 140달러가 들어요. 자세한 내용은 [시간과 비용](#시간과-비용)에 있어요.

## 무엇을 만드나요""")
start=s.index("## 시간과 비용\n"); end=s.index("## 만든 기록\n"); endrec=len(s)
new_cost="""## 시간과 비용

이 프롬프트와 자료 팩으로 만들 때의 최소값이에요.

| 어디까지 | 최소 시간 | 최소 비용(API 요금 환산) | Claude Pro · ChatGPT Plus(Codex) |
|---|---|---|---|
| 화면까지(1~4장) | 약 2시간 25분 | 약 80달러 | 가능 (5시간 한도에 약 2번 걸려요) |
| 끝까지(1~12장) | 약 5시간 15분 | 약 140달러 | 가능 (5시간 한도에 약 4번 걸려요. 2~3일에 나눠 만들어요) |

[5시간 한도란?](../reference/costs-and-keys.md#5시간-한도에-걸리면)

순조롭게 한 번에 끝날 때의 최소값이에요. AI와 진행 상황에 따라 2~3배까지 늘 수 있어요. [자세히](../reference/costs-and-keys.md#시간과-비용-읽는-법)

- 작품 그림은 자료 팩에서 받고 홈 화면 구성은 구성도로 골라서, AI로 그리는 그림이 없어요. 시안 세 장을 그리는 건 선택이에요. Codex는 준비할 것이 없고, Claude Code는 이미지 API 연결(유료 OpenAI API 키나 ChatGPT 유료 요금제로 로그인한 Codex CLI)이 있어야 그려요. 자세한 내용은 [비용과 키](../reference/costs-and-keys.md)에 있어요.
- 화면이 많아서 4장이 가장 오래 걸려요.

<details>
<summary>단계별 예상</summary>

| 장 | 시간 | 비용 | 근거 |
|---|---|---|---|
| 1장 프로젝트 만들기 | 5분 | 1달러 | 예상 |
| 2장 서비스 기획 | 8분 | 3달러 | 실측(2~3장 24분, 약 11달러)에서 나눔 |
| 3장 디자인 정하기(구성도로 고르기) | 10분 | 4달러 | 같음. 시안을 그리면 약 5분, 2달러 더 들고 이미지 요금은 따로예요 |
| 4장 모든 화면 만들기 | 2시간 | 70달러 | 실측 4장에서 끊겨 이어 간 몫을 빼고 넓힌 범위를 더함 |
| (선택) 4장 화면을 GitHub Pages에 올리기 | 5분 | 1달러 | 예상 |
| 5장 로그인과 프로필 | 25분 | 10달러 | 예상 |
| 6장 작품을 DB로 | 40분 | 15달러 | 예상 |
| 7장 검색 | 15분 | 5달러 | 예상 |
| 8장 찜 | 15분 | 5달러 | 예상 |
| 9장 평가 | 15분 | 5달러 | 예상 |
| 10장 재생과 이어 보기 | 25분 | 8달러 | 예상 |
| 11장 검사와 다듬기 | 20분 | 8달러 | 예상 |
| 12장 배포 | 15분 | 5달러 | 예상. 계정 가입과 로그인 허락 시간은 빼요 |

예상은 실제로 잰 단위값(기능 하나를 만들고 검사하는 데 약 15분, 7달러 등)으로 어림한 값이에요.

</details>

<details>
<summary>만든 사람이 실제로 쓴 값</summary>

| 라운드 | 시간 | 비용 |
|---|---|---|
| 2~4장 샘플(넓히기 전 자료 팩, 시안 3장, 4장에서 한 번 끊겨 이어 감) | 약 2시간 25분 | API 요금 환산 약 90달러 |
| 자료 팩에 맞춘 고침 | 약 75분 | 약 20달러 |
| 범위 넓히기(Codex, ChatGPT 구독) | 약 4시간 | 구독 사용량이라 환산하지 않음 |
| 원래 서비스 조사와 자료 팩 만들기 | 세지 않음 | 세지 않음 |

</details>

"""
new_rec="""## 만든 기록

- 2026-10-05에 bts-starter-kit v0.9.5 이후 판에 맞춰 썼어요.
- 샘플은 Claude Code(Opus 5.5)에 2~4장 프롬프트를 그대로 넣어 자료 팩만으로 만들었어요. 이때 3장은 시안을 그리는 판(지금 3장 프롬프트의 넷째 줄을 `시안을 그려서 보여 줘.`로 바꾼 것)이었어요. 그 뒤 자료 팩을 고친 내용에 맞추려고 한 번 더 손봤어요. 두 라운드에 든 시간과 비용은 [시간과 비용](#시간과-비용)의 "만든 사람이 실제로 쓴 값"에 있어요.
- 그 뒤 넷플릭스 웹에서 되는 기능을 흉내 내도록 범위를 넓힌 라운드(R4)를 따로 돌렸어요. 게임, 계정 보안, 자막처럼 위 "무엇을 만드나요"에 더한 화면이 이때 들어갔어요. R4는 4장 프롬프트가 아니라 바뀐 자료 팩 절을 가리키는 별도 지시로 만들어서, 넓힌 범위를 4장 프롬프트 한 번으로 만드는 것은 확인하지 않았어요.
- R4는 Codex(gpt-6-astra, ChatGPT 구독 사용량)로 2026-10-05 13:35~17:35에 했어요(구현, 이름 고침, 최종 화면 검사 포함).
- 5~12장은 실행해 확인하지 않았어요. 그래서 5~12장의 시간과 비용은 예상이에요. 5~10장에 보여 주는 화면 그림은 R4까지 마친 4장 샘플의 같은 화면이에요.
- 같은 프롬프트라도 결과는 매번 달라요. 튜토리얼 그림과 내 화면이 달라도 정상이에요.
"""
s=s[:start]+new_cost+new_rec
open(p,'w').write(s); print('ok')
PY
tail -5 tutorials/01-nextflix/README.md
```
Expected: `ok`, 파일 끝이 "같은 프롬프트라도 결과는 매번 달라요…" 줄. 이 Step 전에 `grep -n "^## " tutorials/01-nextflix/README.md`로 "## 만든 기록"이 마지막 `##` 절인지 확인한다(아니면 멈추고 보고한다).

- [ ] **Step 2: 세 곳의 "막히면"에 한도 링크**

```bash
cd /Users/freelife/youtube/bts-starter-kit && python3 - <<'PY'
L=" 기다리는 법은 [5시간 한도에 걸리면](../reference/costs-and-keys.md#5시간-한도에-걸리면)에 있어요."
for p,a in [('tutorials/01-nextflix/README.md',"2단계에서 멈췄으면 `~/projects`, 3·4단계면 `~/projects/nextflix`예요."),
            ('tutorials/01-nextflix/04-screens.md',"로 다시 열고 `이어서 해줘`라고 보내세요."),
            ('tutorials/01-nextflix/05-auth-profiles.md',"로 다시 열고 `이어서 해줘`라고 보내세요.")]:
    s=open(p).read(); assert s.count(a)==1,(p,s.count(a)); open(p,'w').write(s.replace(a,a+L))
print('ok')
PY
```
Expected: `ok`. `count`가 1이 아니라서 멈추면 그 파일의 "사용량 한도" 줄을 읽고 그 줄 끝 문장으로 바꿔 다시 돌린다.

---

### Task 6: 허브, 시작하기, 용어집, 루트 README

**Files:**
- Modify: `tutorials/README.md:20-21`(목록 표), `:51`(참고 자료 표)
- Modify: `tutorials/start/README.md:151`
- Modify: `tutorials/reference/glossary.md:69`
- Modify: `README.md:10`, `:801`, `:936`, `:939-940`

- [ ] **Step 1: 허브 표, 경고, 응용 안내**

```bash
cd /Users/freelife/youtube/bts-starter-kit && python3 - <<'PY'
p='tutorials/README.md'; s=open(p).read()
R=[("| [컨셉으로 화면 만들기](samples/README.md) | 서비스 컨셉 한두 문장으로 모든 페이지의 화면을 만들고 HTML로 내보내요. 포트폴리오의 샘플 8개 중 하나를 골라 같은 컨셉으로 만들어 봐도 되고, 내 컨셉으로 만들어도 돼요 |",
    "| [컨셉으로 화면 만들기](samples/README.md) | 서비스 컨셉 한두 문장으로 모든 페이지의 화면을 만들고 HTML로 내보내요. 튜토리얼 프롬프트 사이트의 샘플 8개 중 하나를 골라 같은 컨셉으로 만들어 봐도 되고, 내 컨셉으로 만들어도 돼요. 샘플 하나에 최소 약 1시간 30분~3시간 10분이 들어요 |"),
   ("| [넷플릭스 같은 영상 구독 서비스 만들기](01-nextflix/README.md) | 넷플릭스를 본뜬 영상 구독 서비스 Nextflix를 자료 팩으로 만들어요. 4장까지 모든 화면을 만들고, 5장부터 로그인, DB, 검색, 찜, 평가, 이어 보기를 붙여 배포까지 가요 |",
    """| [넷플릭스 같은 영상 구독 서비스 만들기](01-nextflix/README.md) | 넷플릭스를 본뜬 영상 구독 서비스 Nextflix를 자료 팩으로 만드는 유명 서비스 클론하기예요. 4장까지 모든 화면을 만들고, 5장부터 로그인, DB, 검색, 찜, 평가, 이어 보기를 붙여 배포까지 가요. 화면까지 최소 약 2시간 25분, 끝까지 약 5시간 15분이 들어요 |

> [!WARNING]
> 유명 서비스 클론하기는 토큰을 많이 써요. Nextflix는 끝까지 최소 약 5시간 15분, API 요금 환산 약 140달러가 들고, AI와 진행 상황에 따라 2~3배까지 늘 수 있어요. 자세한 내용은 [시간과 비용 읽는 법](reference/costs-and-keys.md#시간과-비용-읽는-법)에 있어요.

여기 없는 서비스도 bts-starter-kit과 프롬프트를 응용해 만들 수 있어요. [가장 쉬운 방법](samples/README.md#가장-쉬운-방법)의 프롬프트에 내 컨셉을 넣어 보세요."""),
   ("| [비용과 키](reference/costs-and-keys.md) | 요금제, 사용량 한도, 이미지 그리기(Codex CLI, OpenAI 키) |",
    "| [비용과 키](reference/costs-and-keys.md) | 요금제, 시간과 비용 읽는 법, 5시간 한도, 이미지 그리기(Codex CLI, OpenAI 키) |")]
for a,b in R:
    assert s.count(a)==1,a[:40]; s=s.replace(a,b)
open(p,'w').write(s)
p='tutorials/start/README.md'; s=open(p).read()
a='> 사용량 한도에 걸리면 에이전트가 멈춰요. 안내된 시간이 지난 뒤 같은 폴더에서 에이전트를 열고 "하던 작업 이어서 해줘"라고 보내면 돼요.'
assert s.count(a)==1; open(p,'w').write(s.replace(a,a+' 자세한 내용은 [5시간 한도에 걸리면](../reference/costs-and-keys.md#5시간-한도에-걸리면)에 있어요.'))
p='tutorials/reference/glossary.md'; s=open(p).read()
a='포트폴리오의 샘플 사이트가 이 방식이에요'
assert s.count(a)==1; open(p,'w').write(s.replace(a,'튜토리얼 프롬프트 사이트의 샘플 사이트가 이 방식이에요'))
print('ok')
PY
```
Expected: `ok`

- [ ] **Step 2: 루트 README**

```bash
cd /Users/freelife/youtube/bts-starter-kit && python3 - <<'PY'
p='README.md'; s=open(p).read()
R=[('<strong>포트폴리오 보기 →</strong>','<strong>튜토리얼 프롬프트 보기 →</strong>'),
   ('비개발자용 튜토리얼 (포트폴리오 사이트 /tutorials/의 원본)','비개발자용 튜토리얼 (튜토리얼 프롬프트 사이트 /tutorials/의 원본)'),
   ('같은 내용을 [포트폴리오 사이트](https://roadkwonai.github.io/bts-starter-kit/tutorials/)에서도 읽을 수 있습니다.',
    '같은 내용을 [튜토리얼 프롬프트 사이트](https://roadkwonai.github.io/bts-starter-kit/tutorials/)에서도 읽을 수 있습니다.'),
   ('포트폴리오의 샘플 8개 중 하나를 골라 같은 컨셉으로 만들어 볼 수도 있습니다.',
    '튜토리얼 프롬프트 사이트의 샘플 8개 중 하나를 골라 같은 컨셉으로 만들어 볼 수도 있습니다. 샘플 하나에 최소 약 1시간 30분~3시간 10분이 듭니다.'),
   ('5장부터 로그인, DB, 검색, 찜, 평가, 이어 보기를 붙여 배포합니다.',
    '5장부터 로그인, DB, 검색, 찜, 평가, 이어 보기를 붙여 배포합니다. 토큰을 많이 씁니다. 끝까지 최소 약 5시간 15분, API 요금 환산 약 140달러가 듭니다.')]
for a,b in R:
    assert s.count(a)==1,a[:40]; s=s.replace(a,b)
open(p,'w').write(s); print('ok')
PY
grep -rn "포트폴리오" /Users/freelife/youtube/bts-starter-kit/tutorials /Users/freelife/youtube/bts-starter-kit/README.md | grep -v "/pack/"
```
Expected: `ok`, 마지막 grep은 결과 없음

---

### Task 7: 교재 설계 문서 규칙

**Files:**
- Modify: `docs/superpowers/specs/2026-10-01-bts-starter-kit-tutorials-design.md`(5.4절 뒤, 7절)

- [ ] **Step 1: 5.5절과 7절 줄 넣기**

```bash
cd /Users/freelife/youtube/bts-starter-kit && python3 - <<'PY'
p='docs/superpowers/specs/2026-10-01-bts-starter-kit-tutorials-design.md'; s=open(p).read()
a="- 번역투, 명사 나열, 과장된 유행어를 쓰지 않는다. 같은 대상은 같은 말로 부른다(예: \"에이전트\", \"대화창\", \"터미널\").\n\n## 6. 서비스별 순환"
b="""- 번역투, 명사 나열, 과장된 유행어를 쓰지 않는다. 같은 대상은 같은 말로 부른다(예: "에이전트", "대화창", "터미널").

### 5.5 시간과 비용 (2026-10-05 추가)
- 교재 첫 쪽(샘플은 샘플 쪽)에 "## 시간과 비용" 절을 둔다. 모양은 [튜토리얼 프롬프트 설계](2026-10-05-tutorial-prompts-home-and-cost-design.md) 5절을 따른다: 요약(최소 시간과 비용, Claude Pro·ChatGPT Plus 표시, 2~3배 안내), 접힌 "단계별 예상", 접힌 "만든 사람이 실제로 쓴 값".
- 값은 프롬프트와 자료 팩으로 순조롭게 끝날 때의 최소값이다. 단가와 계산법은 같은 설계 6절, 구독 표시는 7절이다. 실측이 있으면 실측을 쓰고, 예상은 칸마다 "예상"이라고 밝힌다.
- 클론 교재는 첫 쪽 위쪽에 토큰 경고를 두고, 요약을 "화면까지"와 "끝까지" 두 줄로 쓴다.

## 6. 서비스별 순환"""
assert s.count(a)==1; s=s.replace(a,b)
a2="- 기존 화면: 헤더 \"튜토리얼\" 메뉴, 샘플 상세의 \"이 샘플 만들어 보기\", 갤러리의 튜토리얼 샘플 묶음"
b2="""- 기존 화면: 헤더 "튜토리얼" 메뉴, 샘플 상세의 "이 샘플 만들어 보기", 홈의 "유명 서비스 클론하기" 묶음
- 홈 대제목은 "튜토리얼 프롬프트", 묶음은 "컨셉으로 화면 만들기"(샘플)와 "유명 서비스 클론하기"(클론 교재)다(2026-10-05). 클론 교재가 완성되면 "유명 서비스 클론하기"에 카드를 더한다."""
assert s.count(a2)==1; s=s.replace(a2,b2); open(p,'w').write(s); print('ok')
PY
```
Expected: `ok`

---

### Task 8: 교재 검사, 숫자 대조, korean-skills 검수, 커밋

**Files:**
- Test only (Task 2~7의 파일), 고친 뒤 커밋

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
```
Expected: 다섯 줄 모두 `PASS`

- [ ] **Step 2: 사이트가 검사하는 원본 구조**

```bash
cd /Users/freelife/youtube/bts-starter-kit
grep -n "^| 튜토리얼 | 무엇을 만드나요 |$" tutorials/README.md
grep -n "^| 샘플 | 컨셉 | 페이지 |$" tutorials/samples/README.md
awk '/^## 튜토리얼 목록/{f=1;next}/^## /{f=0}f&&/^\| \[/{n=split($0,c,"|"); if (c[3] ~ /\]\(/) print "설명 칸 링크:", NR}' tutorials/README.md
grep -rn -A1 "^<details>$" tutorials --include=*.md | grep -v "/pack/" | grep -v "<details>$\|<summary>[^<]*</summary>$\|^--$"
```
Expected: 첫 두 grep은 한 줄씩, awk와 마지막 grep은 결과 없음

- [ ] **Step 3: 새 앵커와 그 링크**

```bash
cd /Users/freelife/youtube/bts-starter-kit
grep -c "^## 시간과 비용 읽는 법$\|^## 5시간 한도에 걸리면$" tutorials/reference/costs-and-keys.md
grep -c "^## 시간과 비용$" tutorials/01-nextflix/README.md
grep -rho "costs-and-keys.md#[^)]*" tutorials | sort | uniq -c
```
Expected: `2`, `1`, 링크는 `#시간과-비용-읽는-법`, `#5시간-한도에-걸리면`, `#이미지-그리기`, `#배포-비용`만 나온다(그 밖의 철자는 고친다)

- [ ] **Step 4: 숫자 대조 (설계 6·7절)**

```bash
cd /Users/freelife/youtube/bts-starter-kit && python3 - <<'PY'
exp={'goru':('약 1시간 30분','약 35달러','약 1번'),'ullim':('약 2시간 10분','약 55달러','약 1번'),
 'studyday':('약 2시간 5분','약 50달러','약 1번'),'afterglow':('약 2시간 30분','약 60달러','약 1번'),
 'fitslot':('약 2시간 45분','약 65달러','약 2번'),'jecheol':('약 2시간 55분','약 75달러','약 2번'),
 'pacecrew':('약 3시간 10분','약 80달러','약 2번'),'uptrail':('약 2시간 50분','약 65달러','약 2번')}
bad=0
for k,(t,c,w) in exp.items():
    s=open(f'tutorials/samples/{k}.md').read()
    if f'최소 **{t}, API 요금 환산 {c}**' not in s or f'5시간 한도에 {w} 걸려요' not in s: print('불일치',k); bad+=1
n=open('tutorials/01-nextflix/README.md').read()
for x in ['화면까지(1~4장) | 약 2시간 25분 | 약 80달러 | 가능 (5시간 한도에 약 2번 걸려요)','끝까지(1~12장) | 약 5시간 15분 | 약 140달러 | 가능 (5시간 한도에 약 4번 걸려요']:
    if x not in n: print('Nextflix 불일치',x); bad+=1
print('PASS' if not bad else f'FAIL {bad}')
PY
```
Expected: `PASS`

- [ ] **Step 5: korean-skills 검수**

바꾼 교재 글(Task 2~6의 새 문장과 표 설명)을 `humanizer` → `style-guide` → `grammar-checker` 순서로 Skill 도구로 불러 검수하고, 지적을 파일에서 바로 고친다. 숫자, 링크, 앵커, 코드 식별자, 프롬프트 블록은 바꾸지 않는다. 고친 뒤 Step 1~4를 다시 돌려 모두 통과하는지 본다.

- [ ] **Step 6: 리뷰어 검토**

`git diff` 전체를 파일로 저장해(`git diff > <scratchpad>/a-docs.diff`) 리뷰 에이전트(oh-my-claudecode:code-reviewer, model sonnet)에 설계 문서와 함께 넘긴다. 기준은 설계 3~8절과 이 계획의 Global Constraints, Review Focus다. Important 지적은 고치고 Step 1~4를 다시 돌린다.

- [ ] **Step 7: 커밋**

```bash
cd /Users/freelife/youtube/bts-starter-kit && set -a; . /Users/freelife/youtube/.envrc; set +a
git add tutorials README.md docs/superpowers/specs/2026-10-01-bts-starter-kit-tutorials-design.md docs/superpowers/specs/2026-10-05-tutorial-prompts-home-and-cost-design.md
git commit -m "docs: 튜토리얼 프롬프트 이름과 프로젝트별 시간·비용, 구독 가능 여부 안내" -m "- 샘플 8개와 Nextflix에 최소 시간과 비용, Claude Pro·ChatGPT Plus 가능 여부, 단계별 예상과 만든 사람이 실제로 쓴 값을 접어 둠
- 비용과 키에 시간과 비용 읽는 법(최소값, 2~3배 안내, 실측 단가)과 5시간 한도에 걸리면 절을 더함
- Nextflix 첫 쪽과 허브에 토큰 경고, 허브에 응용 안내 한 줄
- 포트폴리오를 튜토리얼 프롬프트 사이트로 부르고, 교재 설계 5.5절에 시간과 비용 규칙을 더함

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git status --short
```
Expected: `?? .claude/settings.json`만 남는다.

---

### Task 9: 사이트 라운드 R19

**Files:**
- Create: `/Users/freelife/youtube/bts-samples/prompts/portfolio-R19.txt`
- Modify (라운드가 바꿈): `../bts-samples/ws/portfolio/apps/web/src/app/layout.tsx`, `app/page.tsx`, `components/home/tutorial-samples.tsx`, `components/home/sample-card.tsx`, `components/site-header.tsx`, `app/work/[slug]/page.tsx`, `lib/samples.ts`, 동기화된 교재 사본

**Interfaces:**
- Consumes: Task 8에서 커밋한 교재(동기화 원본), 설계 3·4·6·7절

- [ ] **Step 1: 라운드 지시 쓰기**

`/Users/freelife/youtube/bts-samples/prompts/portfolio-R19.txt`:

```
튜토리얼 원본(/Users/freelife/youtube/bts-starter-kit/tutorials)과 설계가 바뀌었다. 설계: /Users/freelife/youtube/bts-starter-kit/docs/superpowers/specs/2026-10-05-tutorial-prompts-home-and-cost-design.md. 3·4·6·7절이 이번 라운드의 기준이고, 문구와 숫자는 그대로 옮긴다.
사이트 틀과 디자인(색, 서체, 카드 모양, 필터, 섹션 순서)은 바꾸지 않는다(좁은 개선, 시안 없음).
1. pnpm tutorials:sync로 교재를 다시 맞추고 tutorials:check를 통과시킨다. 샘플 쪽 8개와 Nextflix 첫 쪽의 '시간과 비용' 절이 보이는지, 표가 든 접힘 상자('단계별 예상', '만든 사람이 실제로 쓴 값')가 펼쳐지고 표로 보이는지 본다.
2. 3절 이름: 사이트 제목과 설명(layout.tsx), 홈 h1 '튜토리얼 프롬프트', 갤러리 h2 '컨셉으로 화면 만들기'(지금 화면 읽기용 '샘플 8개' 제목을 보이는 소제목으로), TutorialSamples h2 '유명 서비스 클론하기', 상단 메뉴 '샘플'의 펼친 목록(넓은 화면, 좁은 화면 시트)을 두 묶음으로 나눈다.
3. 4절 홈 문구: 소개, 응용 안내 한 줄(튜토리얼 허브 링크), 두 소제목 설명, 샘플 요약 줄, 클론 경고 상자(사이트에 이미 있는 주의 상자 모양), Nextflix 카드 부제. '시간과 비용 읽는 법' 링크는 사이트 안 주소(/tutorials/reference/costs-and-keys/#시간과-비용-읽는-법)로 단다.
4. 숫자는 lib/samples.ts에 한 번만 둔다. 샘플 8개는 6.3절 '내 컨셉으로' 열의 시간·비용과 7절 A 단계 표시, Nextflix는 6.5절 화면까지·끝까지와 7절 표시다. 카드 아랫줄('N페이지 · 약 … · 약 …달러')과 /work/<샘플> 사실 목록의 두 줄('시간과 비용(최소)', '구독')이 이 값을 쓴다.
5. 허브 /tutorials/: 교재 카드 설명이 원본 표대로 바뀌었는지, 원본 '튜토리얼 목록' 절의 경고 상자와 응용 안내 문단이 허브에 보이는지 본다. 안 보이면 교재 카드 바로 아래에 원본 그대로 보여 준다.
6. 사이트 안 링크의 앵커 #시간과-비용-읽는-법, #5시간-한도에-걸리면, #시간과-비용이 실제 제목 id와 맞는지 확인한다.
7. 빌드, 내보내기, 링크·버튼 검사, axe, 폭 검사(1440·390)를 한다. 홈, /work/goru/, /tutorials/, /tutorials/samples/goru/, /tutorials/nextflix/의 1440·390 스크린샷을 tasks/evidence/R19에 둔다. 홈은 두 소제목, 경고 상자, 카드의 시간·비용이 보이게 찍고, 샘플 쪽은 '단계별 예상'을 펼친 상태도 찍는다.
[confirm] 행은 비워 두고 커밋하지 않는다. 보고는 짧게: 바뀐 파일 수, 검사 결과, 스크린샷 경로, 설계 6·7절과 다른 숫자가 있으면 그 목록.
```

- [ ] **Step 2: 라운드 실행 (백그라운드, 약 1시간)**

Run (Bash `run_in_background: true`): `bash /Users/freelife/youtube/bts-samples/tools/run.sh portfolio R19 /Users/freelife/youtube/bts-samples/prompts/portfolio-R19.txt`
끝나면: `cat /Users/freelife/youtube/bts-samples/logs/portfolio-R19.done`
Expected: `exit=0 wall=…s`

- [ ] **Step 3: 보고 읽기**

```bash
tail -1 /Users/freelife/youtube/bts-samples/logs/portfolio-R19.jsonl | python3 -c 'import sys,json;d=json.loads(sys.stdin.read());print(d.get("total_cost_usd"));print(d.get("result","")[:3000])'
git -C /Users/freelife/youtube/bts-samples/ws/portfolio status --short | head -40
```
Expected: 검사 통과, "다른 숫자" 없음. 실패나 다른 숫자가 있으면 같은 세션을 이어(`run.sh portfolio R19b <고칠 지시 파일> <세션 id>`) 고친다.

- [ ] **Step 4: 직접 확인**

`tasks/evidence/R19`의 스크린샷을 Read로 열어 본다. 기준은 다음과 같다.
- 홈: h1 "튜토리얼 프롬프트", 두 소제목, 응용 안내, 경고 상자, 카드 아랫줄의 시간·비용
- `/work/goru/`: "시간과 비용(최소)", "구독" 두 줄
- `/tutorials/samples/goru/`: 펼친 "단계별 예상" 표
- `/tutorials/nextflix/`: 위쪽 경고와 시간과 비용 표
- 390 폭에서 가로 넘침이 없다

앵커는 내보낸 HTML에서 `grep -o 'id="5시간-한도에-걸리면"\|id="시간과-비용-읽는-법"' <내보낸 폴더>/tutorials/reference/costs-and-keys/index.html`로 확인한다. 사이트 slugger가 다른 id를 만들면 교재 링크가 아니라 사이트 쪽에서 맞춘다.

- [ ] **Step 5: 작업공간 커밋**

```bash
cd /Users/freelife/youtube/bts-samples/ws/portfolio && set -a; . /Users/freelife/youtube/.envrc; set +a
git add -A && git commit -m "feat: R19 튜토리얼 프롬프트 이름, 두 묶음, 프로젝트별 시간·비용과 구독 표시"
```

---

### Task 10: 공개 (사용자 확인 뒤)

**Files:**
- Create (스크립트가): `release/<YYYYMMDD-HHmm>-tutorial-prompts-naming-and-cost.md`

- [ ] **Step 1: 사용자 확인**

Task 9 스크린샷 경로와 요약을 보고하고 공개해도 되는지 묻는다(AskUserQuestion 상자 없이 글로). 승인 전에는 아래 Step을 하지 않는다.

- [ ] **Step 2: 릴리스 노트 만들기**

Run: `cd /Users/freelife/youtube/bts-starter-kit && node scripts/release.mjs --title "Tutorial prompts naming and cost guide"`
Expected: `v0.10.1` 노트 파일 경로 출력

- [ ] **Step 3: 노트 검수**

노트 파일을 `humanizer` → `style-guide` → `grammar-checker` 순서로 검수해 파일에서 바로 고친다. 첫 줄, 커밋 해시, 링크, 코드 식별자, 뜻은 바꾸지 않는다.

- [ ] **Step 4: 발행**

```bash
cd /Users/freelife/youtube/bts-starter-kit && set -a; . /Users/freelife/youtube/.envrc; set +a
node scripts/release.mjs --publish release/<Step 2가 출력한 파일 이름>
```
Expected: `chore(release): v0.10.1` 커밋, 태그, `main` push, GitHub Release

- [ ] **Step 5: gh-pages 공개**

```bash
cd /Users/freelife/youtube/bts-samples && bash tools/publish-root.sh
cd /Users/freelife/youtube/bts-samples/pages/bts-starter-kit && set -a; . /Users/freelife/youtube/.envrc; set +a
git add -A && git commit -m "portfolio R19: 튜토리얼 프롬프트 이름과 시간·비용" && git push origin gh-pages
```
Expected: `root entries: …`, push 성공

- [ ] **Step 6: 공개 주소 확인 (1~2분 뒤)**

```bash
for u in "" work/goru/ tutorials/ tutorials/samples/goru/ tutorials/nextflix/ tutorials/reference/costs-and-keys/; do
  printf "%s " "$u"; curl -s -o /tmp/p.html -w "%{http_code} " "https://roadkwonai.github.io/bts-starter-kit/$u"; grep -c "튜토리얼 프롬프트\|시간과 비용" /tmp/p.html; done
```
Expected: 모두 `200`이고 숫자가 1 이상이다. 사용자에게 릴리스 주소, 공개 주소, 검수에서 고친 내용 요약을 보고한다.

---

## Self-Review

- 설계 3절(이름)은 Task 6과 Task 9가, 4절(홈 구성)은 Task 9가 맡는다.
- 5절 블록은 샘플이 Task 3, 샘플 첫 쪽이 Task 4, Nextflix가 Task 5가 맡고, 5.1절 두 절은 Task 2가 맡는다.
- 6·7절 숫자는 Task 3~6이 넣고 Task 8 Step 4와 Task 9가 대조한다.
- 8절 파일 목록은 Task 2~7과 Task 9, 9절 검증은 Task 8과 Task 9, 11절 공개 순서는 Task 1과 Task 10이 맡는다.
- 설계 8절의 "샘플 표에 열 더하기"는 사이트 파서 때문에 하지 않기로 설계를 고쳤다(Global Constraints).
- B 단계(10절)는 이 계획 밖이다.
