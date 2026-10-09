# 공통 값과 글 묶음

문서 여러 곳에 나오는 값(주소, 수, 시간과 토큰, 명령)과 글 묶음(프롬프트, 경고)의 목록이에요. 값은 정본 한 곳에만 두고, 문서에는 표시를 달아 `node scripts/doc-values.mjs`가 채우게 해요.

## 규칙

- 같은 값이나 글이 두 곳 이상에 나오거나 자주 바뀌면 이 목록에 올리고 표시로 쓴다. 새 값이 생기면 정본에 먼저 더한다. 손으로 정하는 값은 `doc-values.json`, 파일에서 셀 수 있는 값은 `scripts/doc-values.mjs`의 `loadValues`, 글 묶음은 `docs/blocks/<이름>.md`다.
- 값은 정본에서만 바꾸고 `node scripts/doc-values.mjs`를 돌린다. 이 명령이 문서의 표시와 아래 표를 함께 고친다. `--check`는 고치지 않고 어긋난 곳(파일:줄, 키, 지금 값, 정본 값)을 보여 주고, `--list`는 키마다 값과 정본, 쓰는 곳 수를 보여 준다. `--json <파일>`은 모든 값(손으로 정한 값과 계산값)을 마크다운 이스케이프를 푼 `{키: 값}` JSON으로 쓴다. 홈페이지가 시간을 손으로 적지 않고 읽는 파일이다. 고친 뒤 `node --test scripts/doc-values.test.mjs`를 실행한다.
- 공개 주소는 `site-links.json`이 정본이다. 바꿀 때는 `node scripts/site-links.mjs set <키> <주소>`가 추적 파일 전체의 주소를 바꾸고, 이어서 `node scripts/doc-values.mjs`를 돌린다.
- AI 서버 주소는 `site-links.json`의 `aiService`만 바꾼다. `node scripts/site-links.mjs set aiService <HTTPS 서버 주소>` 뒤 `node scripts/ai-service-config.mjs <Pages 체크아웃>`으로 공통 `ai-service.json`을 내보내고 그 파일을 `gh-pages`에 올린다. Claudle과 다른 AI 서비스는 요청할 때마다 Pages 루트의 이 파일을 캐시 없이 읽고 `aiServiceUrl`에 `/api/chat`을 붙인다. 서버 주소만 바뀌면 각 서비스를 다시 빌드하지 않는다.
- 표시 꼴
  - 한 줄 안 값: `<!-- v:키 -->값<!-- /v -->`. 표시 사이의 값만 바뀐다.
  - 여러 줄 글 묶음: `<!-- b:이름 키=값 키="띄어 쓴 값" -->` 줄과 `<!-- /b -->` 줄 사이를 묶음 원본으로 채운다. 원본의 첫 줄 주석은 설명이고, `{{키}}`는 표시에 준 인자(`{{키|기본값}}`은 인자가 없을 때 기본값), `{{v:키}}`는 값이다. 인자 안에서 `{{name}}`을 먼저 바꾸므로 `{{v:preset.{{name}}.title}}`처럼 쓸 수 있다.
  - 묶음 본문에 `{{b:다른 이름}}`을 쓰면 그 묶음 본문이 같은 인자로 펼쳐진다(`first-trouble`이 `trouble-password`를 품는 식. 목록 전체를 묶음으로 만들 때 쓴다).
  - GitHub와 홈페이지(marked)는 주석을 보여 주지 않는다. 홈페이지 sync는 표시를 떼고 값만 쓴다.
- 제목 줄에도 표시를 달 수 있다. GitHub는 주석을 지우고 앵커를 만들고, `scripts/handbook.test.mjs`의 앵커 계산도 주석을 지운다.
- 표시를 달 수 없는 곳: 링크 주소 안(`[글](주소)`의 주소)과 코드 블록 안(mermaid 포함). 주소는 `site-links.mjs`가 바꾸고, 코드 블록은 블록 전체를 글 묶음으로 쓴다(`what-it-adds-diagram`, `project-structure-tree`, `ui-flow-diagram`, `start-check-prompt`, `install-claude`, `install-codex`, `process-*`, `revise-flow-gantt`, `design-md-effect-chart`). mermaid 안의 숫자(gantt 막대 길이, 원그래프 조각)도 `{{v:키}}`로 채우고, 분 수가 필요하면 시간 문자열에서 계산한 `.min` 키를 쓴다. `tutorials/reference/process-and-time.md`의 도식 묶음에 값 표시 밖 숫자가 없는지는 `scripts/doc-values.test.mjs`가 본다.
- 목록 중간과 표 중간에는 묶음 표시를 달 수 없다(목록과 표가 둘로 갈린다). 같은 글이 목록 전체나 표 전체면 전체를 묶음으로 하고(`course-trouble`, `samples-trouble`), 목록이나 표의 일부(한 줄부터 여러 줄까지. 표 머리는 넣지 않는다)면 표시 없이 묶음 원본과 같은 글로 두고 `scripts/doc-values.cases.mjs`의 CASES에 `[파일, 묶음 이름, 인자]`를 더한다. 그 글이 묶음 원본과 같은지는 `scripts/doc-values.test.mjs`가 지킨다. 이런 묶음은 설명 끝에 "테스트(CASES)가 지킨다"라고 적는다(`trouble-*`, `qa-row-*`, `feature-round-spec`, `feature-round-review`, `sample-stage-*`, `tpl-readme-commands` 등).
- 묶음은 구조 경계 안에 둔다. 제목, 접힌 상자 태그(`<details>`, `<summary>`, `</details>`)의 한쪽만, 일부만 걸친 코드 블록은 묶음에 넣지 않는다. 접힌 상자 안이어도 문단, 목록 전체, 표 전체에는 표시를 단다(`preset-actual-line`, `clone-create-trouble`). 접힌 상자를 `<details>`부터 `</details>`까지 통째로 담는 묶음은 된다(`revise-time-detail`). `<summary>` 뒤에 빈 줄을 두어야 GitHub가 안의 표를 그린다.
- 묶음 원본의 상대 링크는 쓰는 쪽 위치를 따르므로 같은 깊이의 쪽에서만 쓴다(지금 묶음은 `tutorials/<묶음>/` 쪽용이고, `tpl-readme-*`는 `templates/<이름>/README.md`용이다). `scripts/handbook.test.mjs`가 tutorials, 템플릿 README, 이 목록의 링크를 본다. 묶음 설명에는 링크를 옮겨 적지 않는다(이 목록 표에 그대로 실린다).
- 한 묶음이 다른 묶음의 한 줄과 같으면 `{{b:이름}}`으로 품는다(`clone-create-prompt`가 `agent-order-line`을, `clone-auth-qa`가 `qa-row-plan`을 품는 식).
- 두 클론 과정(Nextflix, Claudle)이 같이 쓰는 글은 `clone-<장>-<내용>` 이름이다(`clone-create-*` 1장, `plan` 2장, `design` 3장, `screens` 4장, `auth` 5장, `check` 11장, `deploy` 12장, `readme` 과정 첫 쪽). 과정 이름은 인자 `name`(폴더 이름. 서비스 이름은 `{{v:preset.{{name}}.title}}`)으로, 이름 뒤 조사는 인자 `neun`(는/은)·`reul`(를/을)·`ga`(가/이)로 받는다. 과정마다 따로 정하는 어림값도 인자로 받는다(`clone-cost-row`. 시간은 값 키 이름을 인자로 준다).
- 인라인 코드 한 덩어리가 값 전체이면 백틱을 넣은 `…Code` 키(`agent.<이름>.yoloCode`, `port.web.urlCode` 등)를 코드 바깥에 단다: ``<!-- v:agent.codex.yoloCode -->`codex --yolo`<!-- /v -->``. 코드의 일부만 값이면 표시를 달 수 없으므로 문장을 바꾸지 않고 아래 후보에 남긴다.
- 표시를 달지 않는 곳: `templates/*/files/`(새 프로젝트에 그대로 복사된다. 값이 정본과 같아야 하는 곳은 `scripts/doc-values.test.mjs`가 비교한다: `prokit-ui`의 화면 점수 기준과 `impeccable-map.md`의 Refero 규모, `prokit-deploy`의 Node 20 중단일, `AGENTS.md`의 선택 스킬 표, supabase `prokit-db`의 transaction pooler 포트), `release/`와 `docs/superpowers/`(옛 기록. 검사하지 않는다).
- 실측 기록(만든 사람이 실제로 쓴 값, 잰 단위값)도 두 곳 이상에 쓰면 값으로 쓴다. 정본은 `doc-values.json`의 `presets.<이름>.actual.<행>`(시간·달러. 토큰과 캐시 포함은 달러에서 계산하고, Claudle처럼 합계 행이 없으면 행을 더한다), `presets.<이름>.prep`·`packFix`(원래 서비스 조사와 프리셋 팩 만들기, 팩 다듬기. 기록에서 잰 시간·토큰·캐시 포함이 정본이고 달러는 토큰 ÷ `cost.tokensPerUsd`로 어림한다)·`made`(만들기 합에 넣을 actual 행. 합 `prep.total`과 조사부터 만들기까지의 벽시계 합 `all`은 5분 단위 계산값이고, 에이전트 시간 합인 팩 다듬기는 `all`에 넣지 않는다), `cost.unit.*`("잰 것" 표), `cost.revise.examples.*`(고칠 때마다 더 드는 시간의 예시 분해), `cost.revise.flow.*`(고칠 때 한 번의 단계 흐름. 한 군데 합 `cost.revise.oneSpot`과 그 예시의 분해는 흐름에서 계산한다. 쓰는 곳이 없는 예시 키는 두지 않는다), `process.*`(리서치 단계, 원그래프 조각, 올곧 라운드. 기록에서 잰 분을 소수로 두고 칸은 반올림, 합은 5분 단위로 계산한다)다. 프리셋 쪽 문단은 묶음 `preset-actual-line`, 화면 프리셋의 범위는 계산값 `presets.actual.<time|tokens|usd>.range`다.
- 시간도 같다. 두 곳 이상에 같은 뜻으로 쓰는 시간과 자주 바뀌는 시간(단계별 표의 단위 시간 `cost.stage.*`, 쪽 수·그림 수에 비례하는 행 `preset.<이름>.stages.*`, 클론 장별 시간 `preset.<이름>.chapter.<장>.time`, 한도 시간 `limit.window` 등)은 값 키로 쓴다. 한 곳에만 쓰고 바뀌지 않는 시간(그 쪽에만 있는 제작 기록)과 시간 값이 아닌 말(만들 서비스의 규칙, 기다림 안내)만 맨값으로 두고 `docs/time-allow.txt`에 이유와 함께 범주로 적는다. 표시·묶음·코드 밖 맨시간은 `scripts/doc-values.test.mjs`가 잡는다. 제목 줄에도 표시를 달고(`## <!-- v:limit.window -->5시간<!-- /v --> 한도에 걸리면`), 링크 주소의 앵커(`#5시간-한도에-걸리면`)는 표시를 달 수 없어 링크 검사가 지킨다.
- 요약 시간("얼마나 걸리나"로 읽는 프리셋·클론 과정의 시간)은 한 번에 완성할 때의 범위와 여러 번 고칠 때를 함께 쓰고, 단계별 표의 칸은 최솟값으로 둔다. 정본 시간 키(`preset.<이름>.<pack|scratch|screens|full>.time`, `presets.<pack|scratch>.time.range`)는 맨값으로 표시하지 않고 계산값 `.text`(문장: "한 번에 완성하면 약 A\~B(여러 번 고쳐 달라고 하면 약 C까지)"), `.cell`(표 칸: "약 A\~B (여러 번 고치면 약 C까지)")로 쓴다. B와 C는 최솟값에 `doc-values.json` `cost.timeRange`의 `oneShotMax`·`reviseMax`를 곱해 5분 단위로 반올림한 값이다. 단계별 표 위에는 칸이 최솟값이라고 적고(`preset-stage-intro`, `clone-readme-stage-note`), 표의 합계 행 시간에만 `.cell`을 쓴다. 토큰과 달러는 최솟값만 쓰고 "최소 약 N 토큰"처럼 최소임을 밝힌다. 맨값 표시는 `scripts/doc-values.test.mjs`가 잡는다. 범위 아래에는 고칠 때마다 더 드는 시간을 펼쳐 보기(`revise-time-detail`, 값은 `cost.revise.*`)로 둔다.
- 범위 값의 물결표는 `\~`로 쓴다. 한 문단에 `~`가 둘이면 GitHub가 그 사이를 취소선으로 그린다. `scripts/handbook.test.mjs`의 `strikeRisk`가 handbook, README, CONTRIBUTING, tutorials, 템플릿 README와 설치본 문서를 본다. 값 하나가 한 줄에 `~`를 하나만 가지는 단일 범위(`cost.multiplier`의 `2~3`)는 그대로 쓴다.
- 같은 글은 중복 검사 테스트(`scripts/doc-values.test.mjs`)가 잡는다. 표시와 묶음 구간, CASES로 지키는 줄을 뺀 글에서 공백을 편 40자 이상의 줄이 두 문서 이상에 같으면 실패한다. 번호 목록 한 줄과 첫 칸이 8자 이상인 표 한 행(질문·단계 행)은 25자부터 본다. 글머리표 줄의 짧은 성공 기준과 첫 칸이 짧은 사실 행(`| 서체 | … |`)은 원래 겹치는 꼴이라 40자 규칙만 본다. Nextflix와 Claudle, 그 뒤 조사(를/을, 는/은, 가/이, 와/과, 로/으로, 라/이라, 예요/이에요), 두 과정의 장 파일 이름은 같은 글로 본다. 묶음 원본에 있는 글이 표시 없이 문서에 또 있어도 같다. 정당한 반복은 `docs/dupes-allow.txt`에 이유와 함께 두고, 앞부분은 바뀔 수 있는 값을 빼고 짧게 쓴다.

## 목록

프리셋(`preset.<이름>.*`)과 에이전트(`agent.<이름>.*`)마다 있는 키는 한 줄로 묶었어요. 이름마다의 값은 `node scripts/doc-values.mjs --list`로 봐요. 쓰는 곳은 표시 수와 표시 없이 같은 글로 둔 CASES 수의 합이에요(묶음 안의 `{{v:키}}`와 품은 묶음 포함).

<!-- doc-values:list -->
| 키 | 값 | 뜻 | 정본 | 바꾸는 법 | 쓰는 곳 |
|---|---|---|---|---|---|
| `link.home` | https://prokit-web.vercel.app | 홈페이지(프로킷 사이트) 주소. 문서에 나오는 주소는 표시 없이 site-links.mjs가 바꾼다 | site-links.json home | `node scripts/site-links.mjs set <키> <주소>` | 0 |
| `link.pages` | https://roadkwon-ai.github.io/pro-kit | 프리셋 사이트(GitHub Pages) 주소. 뒤에 /<이름>/을 붙인다. 문서에 나오는 주소는 표시 없이 site-links.mjs가 바꾼다 | site-links.json pages | `node scripts/site-links.mjs set <키> <주소>` | 0 |
| `link.repo` | https://github.com/roadkwon-ai/pro-kit | pro-kit 저장소 주소 | site-links.json repo | `node scripts/site-links.mjs set <키> <주소>` | 31 |
| `link.packs` | https://github.com/roadkwon-ai/pro-kit-packs | 프리셋 팩 저장소 주소. 문서에 나오는 주소는 표시 없이 site-links.mjs가 바꾼다 | site-links.json packs | `node scripts/site-links.mjs set <키> <주소>` | 0 |
| `link.premiumPacks` | https://github.com/roadkwon-ai/pro-kit-premium-packs | 프리미엄 프리셋 팩 저장소 주소. 문서에 나오는 주소는 표시 없이 site-links.mjs가 바꾼다 | site-links.json premiumPacks | `node scripts/site-links.mjs set <키> <주소>` | 0 |
| `link.aiService` | https://prokit-ai-relay-puce.vercel.app | aiService 주소 | site-links.json aiService | `node scripts/site-links.mjs set <키> <주소>` | 0 |
| `link.packsReleases` | https://github.com/roadkwon-ai/pro-kit-packs/releases | 프리셋 팩 릴리스 목록 주소 | site-links.json packs + /releases | `node scripts/site-links.mjs set <키> <주소>` | 0 |
| `node.min` | 22.20 | 준비물 Node 최소 판(설치기가 이보다 낮으면 멈춘다) | doc-values.json node.min | `doc-values.json`을 고친다 | 20 |
| `node.recommended` | 24 | 권장 Node 판(지금 LTS. 이보다 낮으면 설치기가 경고한다) | doc-values.json node.recommended | `doc-values.json`을 고친다 | 15 |
| `node.eol` | 2026-04-30 | Node 20 지원 종료일 | doc-values.json node.eol | `doc-values.json`을 고친다 | 5 |
| `vercel.node` | 24.x | Vercel 프로젝트 Settings의 Node.js Version으로 고르는 판 | doc-values.json vercel.node | `doc-values.json`을 고친다 | 9 |
| `vercel.node20Stop` | 2026-10-01 | Vercel이 Node.js 20.x 새 배포를 막는 날 | doc-values.json vercel.node20Stop | `doc-values.json`을 고친다 | 4 |
| `policy.agentBrowser.da` | agent-browser CLI가 없거나 npm 최신판보다 낮으면 전역에 최신판을 설치한다 | agent-browser CLI 설치 정책 문장(~다체. 에이전트·템플릿 README용). 기본 실행도 이 정책을 따른다 | doc-values.json policy.agentBrowser.da | `doc-values.json`을 고친다 | 11 |
| `policy.agentBrowser.yo` | agent-browser CLI는 없거나 npm 최신판보다 낮으면 기본으로 최신판을 설치해요 | agent-browser CLI 설치 정책 문장(~요체. handbook용) | doc-values.json policy.agentBrowser.yo | `doc-values.json`을 고친다 | 5 |
| `policy.agentBrowser.cell` | 없거나 npm 최신판보다 낮으면 기본으로 최신판을 설치 | 같은 정책의 표 칸 꼴(주어와 끝맺음 없이 "…설치"). 행 이름이 agent-browser CLI인 칸, "agent-browser CLI는" 뒤, "agent-browser CLI(" 괄호 안에 쓴다 | doc-values.json policy.agentBrowser.cell | `doc-values.json`을 고친다 | 4 |
| `meta.presetModel` | Opus 5.5 | 프리셋을 만든 모델 | doc-values.json meta.presetModel | `doc-values.json`을 고친다 | 4 |
| `gloss.presetPack` | 만들 서비스의 화면 구성, 디자인, 예시 데이터, 그림을 묶어 둔 폴더 | 용어 "프리셋 팩"의 짧은 풀이(본문에서 용어 링크 뒤 괄호에 쓴다). 용어집 tutorials/reference/glossary.md도 이 값을 쓴다 | doc-values.json gloss.presetPack | `doc-values.json`을 고친다 | 1 |
| `gloss.clonePack` | 만들 서비스의 화면 구성, 기능 규칙, 디자인 노트, 예시 데이터, 그림을 묶어 둔 폴더 | 클론 튜토리얼(Nextflix, Claudle) 팩의 풀이(features.md·design-notes.md가 든다). 화면 프리셋 팩 9개에는 없으니 용어집은 gloss.presetPack을 쓴다 | doc-values.json gloss.clonePack | `doc-values.json`을 고친다 | 19 |
| `gloss.round` | 기능 하나를 만들거나 요청한 것을 고치고 확인까지 마치는 작업 묶음 | 용어 "라운드"의 짧은 풀이(본문에서 용어 링크 뒤 괄호에 쓴다). 용어집 tutorials/reference/glossary.md도 이 값을 쓴다 | doc-values.json gloss.round | `doc-values.json`을 고친다 | 24 |
| `gloss.migration` | DB의 표를 만들거나 바꾸는 기록 | 용어 "마이그레이션"의 짧은 풀이(본문에서 용어 링크 뒤 괄호에 쓴다). 용어집 tutorials/reference/glossary.md도 이 값을 쓴다 | doc-values.json gloss.migration | `doc-values.json`을 고친다 | 17 |
| `gloss.spec` | 기능의 범위와 동작을 적은 문서 | 용어 "스펙"의 짧은 풀이(본문에서 용어 링크 뒤 괄호에 쓴다). 용어집 tutorials/reference/glossary.md도 이 값을 쓴다 | doc-values.json gloss.spec | `doc-values.json`을 고친다 | 23 |
| `cost.tokensPerUsd` | 5.5만 | API 요금 1달러어치 토큰(캐시 뺀 값) | doc-values.json cost.tokensPerUsd | `doc-values.json`을 고친다 | 4 |
| `cost.cachedPerUsd` | 275만 | API 요금 1달러어치 토큰(캐시 포함) | doc-values.json cost.cachedPerUsd | `doc-values.json`을 고친다 | 2 |
| `cost.multiplier` | 2~3 | 최솟값이 늘 수 있는 배수(넉넉히 잡는 값). 단위 "배"는 값 밖 | doc-values.json cost.multiplier | `doc-values.json`을 고친다 | 14 |
| `cost.multiplierModel` | 1~2 | 쓰는 AI와 모델에 따른 배수 | doc-values.json cost.multiplierModel | `doc-values.json`을 고친다 | 1 |
| `cost.multiplierRefine` | 1.1~3 | 다시 디자인하고 다듬을 때 든 배수 | doc-values.json cost.multiplierRefine | `doc-values.json`을 고친다 | 1 |
| `cost.timeRange.oneShotMax` | 2 | 요약 시간 범위의 끝: 한 번에 완성할 때 걸릴 수 있는 시간 = 최솟값 × 이 배수(쓰는 AI·모델과 끊김. cost.multiplierModel의 위 끝) | doc-values.json cost.timeRange.oneShotMax | `doc-values.json`을 고친다 | 1 |
| `cost.timeRange.reviseMax` | 3 | 요약 시간 괄호: 여러 번 고쳐 달라고 할 때 = 최솟값 × 이 배수(cost.multiplier·cost.multiplierRefine의 위 끝) | doc-values.json cost.timeRange.reviseMax | `doc-values.json`을 고친다 | 1 |
| `cost.revise.fix` | 2\~12분 | 고칠 때마다: 요청을 읽고 고칠 곳을 찾아 고치기. 물결은 \~로 바꾼 값 | doc-values.json cost.revise.fix | `doc-values.json`을 고친다 | 13 |
| `cost.revise.check` | 1\~3분 | 고칠 때마다: 검사(타입·포맷·빌드). 물결은 \~로 바꾼 값 | doc-values.json cost.revise.check | `doc-values.json`을 고친다 | 13 |
| `cost.revise.recheck.13` | 5분 | 고칠 때마다: 모든 페이지 다시 확인(13쪽 Claudle). 페이지 수에 비례한다. Claudle 두 군데 예시의 모든 페이지 다시 확인 값이기도 하다 | doc-values.json cost.revise.recheck.13 | `doc-values.json`을 고친다 | 14 |
| `cost.revise.review` | 4\~10분 | 큰 수정일 때: 리뷰 에이전트. 물결은 \~로 바꾼 값 | doc-values.json cost.revise.review | `doc-values.json`을 고친다 | 13 |
| `cost.revise.close` | 1\~15분 | 마지막에 한 번: 라운드 닫기(기록·검사·커밋). 물결은 \~로 바꾼 값 | doc-values.json cost.revise.close | `doc-values.json`을 고친다 | 13 |
| `cost.revise.reviewRound` | 2\~3시간 | 예: 디자인을 다시 하거나 마무리 검토를 한 번 더 할 때 더 드는 시간. 물결은 \~로 바꾼 값 | doc-values.json cost.revise.reviewRound | `doc-values.json`을 고친다 | 15 |
| `cost.revise.example.<예>.<과정>` | 13개(`--list`) | 고쳐 달라고 할 때마다 더 드는 시간의 예시 분해(tutorials/reference/process-and-time.md). <예>는 oneSpot(올곧 한 군데)·twoSpotsClaudle·twoSpotsOlgot(두 군데)·reviewRoundOlgot·reviewRoundClaudle(마무리 검토 한 번 더), <과정>은 total(합)·fix(고치기)·recheck(모든 페이지 다시 확인)·review(리뷰 에이전트 + 디자인 검사 에이전트를 메인이 기다린 분의 합. 구현 에이전트 제외). 시간은 세션 기록 .done의 wall이 정본이고, 명령 글자로 과정을 나눴다. oneSpot·twoSpotsClaudle은 흐름(cost.revise.flow)에서 계산한다 | doc-values.json cost.revise.examples.twoSpotsOlgot.total | `doc-values.json`을 고친다 | 18 |
| `cost.revise.flow.<예>.<단계>` | 12개(`--list`) | 고칠 때 한 번의 흐름(시간 순서 단계). <예>는 oneSpot(올곧 한 줄, gantt)·twoSpotsClaudle(Claudle 두 가지, 표). 합계(cost.revise.oneSpot, cost.revise.example.twoSpotsClaudle.total)와 올곧 한 줄의 모든 페이지 다시 확인(cost.revise.example.oneSpot.recheck)은 이 단계에서 계산한다 | doc-values.json cost.revise.flow.oneSpot.read | `doc-values.json`을 고친다 | 8 |
| `cost.revise.flow.<예>.<단계>.min` | 12개(`--list`) | 같은 시간의 분 수(gantt 막대 길이) | 계산: doc-values.json cost.revise.flow.oneSpot.read | `doc-values.json`을 고친다 | 6 |
| `cost.revise.oneSpot` | 10분 | 예: 한 군데를 고칠 때 모두 더해 더 드는 시간(올곧 R4c) | 계산: doc-values.json cost.revise.flow.oneSpot의 합 | `doc-values.json`을 고친다 | 16 |
| `cost.revise.recheck.203` | 6\~37분 | 고칠 때마다: 모든 페이지 다시 확인(203쪽 올곧). 작은 수정은 그 검사만 다시 돌려 짧고(한 군데 예시), 배치를 고치면 모든 검사를 다시 돌려 길다(두 군데 예시) | 계산: cost.revise.example.oneSpot.recheck~doc-values.json cost.revise.examples.twoSpotsOlgot.recheck | `doc-values.json`을 고친다 | 14 |
| `cost.revise.twoSpots` | 28\~43분 | 예: 두 군데를 고칠 때 더 드는 시간(Claudle 공개 전 손보기, 올곧 두 군데 고치기 예시의 합) | 계산: cost.revise.example.twoSpotsClaudle.total~doc-values.json cost.revise.examples.twoSpotsOlgot.total | `doc-values.json`을 고친다 | 13 |
| `cost.tokens.<달러>` | 400개(`--list`) | 달러어치 토큰(캐시 뺀 값. 키 끝이 달러, 0.5달러 단위) | 계산: doc-values.json cost.tokensPerUsd × 달러 | `doc-values.json`을 고친다 | 294 |
| `cost.cached.<달러>` | 400개(`--list`) | 달러어치 토큰(캐시 포함. 키 끝이 달러, 0.5달러 단위) | 계산: doc-values.json cost.cachedPerUsd × 달러 | `doc-values.json`을 고친다 | 33 |
| `cost.date` | 2026-10-05 | 단위값(작업 폴더에서 프로젝트 만들기, 첫 화면 같은)을 잰 날. 한도를 어림한 날(limit.pro5h.date)과는 따로 둔다 | doc-values.json cost.date | `doc-values.json`을 고친다 | 1 |
| `cost.feature.time` | 15분 | 기능 하나를 만들고 검사하는 데 걸리는 시간 | doc-values.json cost.feature.time | `doc-values.json`을 고친다 | 3 |
| `cost.feature.usd` | 7 | 기능 하나를 만들고 검사하는 데 드는 API 요금 환산(달러) | doc-values.json cost.feature.usd | `doc-values.json`을 고친다 | 3 |
| `cost.image.tokens` | 1.7만 | 그림 한 장을 다시 그릴 때 더 드는 토큰. 근거: 울림 처음부터 만들 때 그림 41장에 68만 토큰(그림 5장에 8.3만인 고루도 장당 같다)을 장수로 나눈 1.66만을 올림했다 | doc-values.json cost.image.tokens | `doc-values.json`을 고친다 | 9 |
| `cost.image.time` | 30초 | 그림 한 장을 그리는 시간. 프리셋 단계별 표의 그림 행(처음부터)은 장수 × 이 값을 분으로 올림한다 | doc-values.json cost.image.time | `doc-values.json`을 고친다 | 9 |
| `cost.stage.setup.time` | 5분 | 단계별 표: 준비: pro-kit 받기, 프로젝트 만들기(클론 1장도 같다) | doc-values.json cost.stage.setup | `doc-values.json`을 고친다 | 40 |
| `cost.stage.plan.pack.time` | 5분 | 단계별 표: 기획: 서비스 질문, 이름, 사이트맵(주제를 바꿀 때 다시 하는 기획도 프리셋 팩 값)(프리셋 팩으로) | doc-values.json cost.stage.plan.pack | `doc-values.json`을 고친다 | 27 |
| `cost.stage.plan.scratch.time` | 10분 | 단계별 표: 기획: 서비스 질문, 이름, 사이트맵(주제를 바꿀 때 다시 하는 기획도 프리셋 팩 값)(처음부터) | doc-values.json cost.stage.plan.scratch | `doc-values.json`을 고친다 | 18 |
| `cost.stage.design.pack.time` | 5분 | 단계별 표: 디자인: DESIGN.md(프리셋 팩으로) | doc-values.json cost.stage.design.pack | `doc-values.json`을 고친다 | 18 |
| `cost.stage.design.scratch.time` | 8분 | 단계별 표: 디자인: DESIGN.md(처음부터) | doc-values.json cost.stage.design.scratch | `doc-values.json`을 고친다 | 18 |
| `cost.stage.mockup.time` | 10분 | 단계별 표: 화면 구성: 시안 3장(처음부터만) | doc-values.json cost.stage.mockup | `doc-values.json`을 고친다 | 18 |
| `cost.stage.packImages.time` | 1분 | 단계별 표: 그림: 팩에서 받기(프리셋 팩으로만) | doc-values.json cost.stage.packImages | `doc-values.json`을 고친다 | 9 |
| `cost.stage.first.pack.time` | 10분 | 단계별 표: 첫 화면(프리셋 팩으로) | doc-values.json cost.stage.first.pack | `doc-values.json`을 고친다 | 18 |
| `cost.stage.first.scratch.time` | 15분 | 단계별 표: 첫 화면(처음부터) | doc-values.json cost.stage.first.scratch | `doc-values.json`을 고친다 | 18 |
| `cost.stage.page.pack.time` | 4분 | 단계별 표: 나머지 페이지 한 쪽(올곧은 한 종)에 드는 시간. 프리셋마다 × 나머지 쪽 수(프리셋 팩으로) | doc-values.json cost.stage.page.pack | `doc-values.json`을 고친다 | 0 |
| `cost.stage.page.scratch.time` | 5분 | 단계별 표: 나머지 페이지 한 쪽(올곧은 한 종)에 드는 시간. 프리셋마다 × 나머지 쪽 수(처음부터) | doc-values.json cost.stage.page.scratch | `doc-values.json`을 고친다 | 0 |
| `cost.stage.export.time` | 2분 | 단계별 표: HTML 내보내기 | doc-values.json cost.stage.export | `doc-values.json`을 고친다 | 36 |
| `cost.stage.pages.time` | 5분 | 단계별 표: (선택) GitHub Pages 배포(클론 4장 화면 올리기도 같다) | doc-values.json cost.stage.pages | `doc-values.json`을 고친다 | 37 |
| `cost.stage.clone.design.time` | 10분 | 단계별 표: 클론 3장 디자인 정하기(구성도로 고르기) | doc-values.json cost.stage.clone.design | `doc-values.json`을 고친다 | 4 |
| `cost.stage.clone.mockup.time` | 5분 | 단계별 표: 클론 3장에서 시안을 그리면 더 드는 시간 | doc-values.json cost.stage.clone.mockup | `doc-values.json`을 고친다 | 4 |
| `cost.stage.clone.check.time` | 20분 | 단계별 표: 클론 11장 검사와 다듬기 | doc-values.json cost.stage.clone.check | `doc-values.json`을 고친다 | 4 |
| `cost.stage.clone.deploy.time` | 15분 | 단계별 표: 클론 12장 배포 | doc-values.json cost.stage.clone.deploy | `doc-values.json`을 고친다 | 4 |
| `cost.unit.setup.time` | 3.2분 | 잰 단위값: 작업 폴더에서 프로젝트 만들기의 시간 | doc-values.json cost.unit.setup.time | `doc-values.json`을 고친다 | 2 |
| `cost.unit.setup.usd` | 0.9 | 잰 단위값: 작업 폴더에서 프로젝트 만들기의 API 요금 환산(달러) | doc-values.json cost.unit.setup.usd | `doc-values.json`을 고친다 | 1 |
| `cost.unit.recommend.usd` | 0.95 | 잰 단위값: 스타일 추천의 API 요금 환산(달러) | doc-values.json cost.unit.recommend.usd | `doc-values.json`을 고친다 | 1 |
| `cost.unit.designMd.usd` | 2.45 | 잰 단위값: DESIGN.md 받기의 API 요금 환산(달러) | doc-values.json cost.unit.designMd.usd | `doc-values.json`을 고친다 | 1 |
| `cost.unit.first.time` | 12\~19분 | 잰 단위값: 첫 화면(다듬기 없이)의 시간. 물결은 \~로 바꾼 값 | doc-values.json cost.unit.first.time | `doc-values.json`을 고친다 | 1 |
| `cost.unit.first.usd` | 4.45\~6.34 | 잰 단위값: 첫 화면(다듬기 없이)의 API 요금 환산(달러). 물결은 \~로 바꾼 값 | doc-values.json cost.unit.first.usd | `doc-values.json`을 고친다 | 1 |
| `cost.unit.second.time` | 6\~10분 | 잰 단위값: 두 번째 화면(따로 만들 때)의 시간. 물결은 \~로 바꾼 값 | doc-values.json cost.unit.second.time | `doc-values.json`을 고친다 | 1 |
| `cost.unit.second.usd` | 2.74\~3.05 | 잰 단위값: 두 번째 화면(따로 만들 때)의 API 요금 환산(달러). 물결은 \~로 바꾼 값 | doc-values.json cost.unit.second.usd | `doc-values.json`을 고친다 | 1 |
| `supabaseCli.min` | 2.117 | supabase 템플릿의 Supabase CLI 최소 판 | doc-values.json supabaseCli.min | `doc-values.json`을 고친다 | 6 |
| `limit.window` | 5시간 | 구독 요금제의 사용량 한도 시간("5시간 한도"). 링크 주소의 앵커(#5시간-한도에-걸리면)에는 표시를 달 수 없어 링크 검사가 지킨다 | doc-values.json limits.window | `doc-values.json`을 고친다 | 37 |
| `limit.waitLong` | 4시간 | 한도에 걸렸을 때 길면 기다리는 시간(처음 쓰기 시작하고 한 시간쯤 만에 걸린 경우의 어림) | 계산: doc-values.json limits.window − 1시간 | `doc-values.json`을 고친다 | 1 |
| `limit.pro5h.tokens` | 170만 | Pro 5시간 한도 어림(토큰). 한도 횟수 계산에 쓴다 | doc-values.json limits.pro5h.tokens | `doc-values.json`을 고친다 | 1 |
| `limit.pro5h.usd` | 30 | 같은 한도의 API 요금 환산(달러) | doc-values.json limits.pro5h.usd | `doc-values.json`을 고친다 | 1 |
| `limit.pro5h.date` | 2026-10-05 | 한도를 어림한 날 | doc-values.json limits.pro5h.date | `doc-values.json`을 고친다 | 1 |
| `limit.pro5h.plans` | Claude Pro · ChatGPT Plus(Codex) | 5시간 한도를 어림한 구독 요금제(한도 줄의 앞머리와 표 머리) | doc-values.json limits.pro5h.plans | `doc-values.json`을 고친다 | 13 |
| `agent.<이름>.name` | 4개(`--list`) | 지원 에이전트 이름 | doc-values.json agents.<이름>.name | `doc-values.json`을 고친다 | 23 |
| `agent.<이름>.open` | 4개(`--list`) | 에이전트를 요청과 함께 여는 명령 | doc-values.json agents.<이름>.open | `doc-values.json`을 고친다 | 5 |
| `agent.<이름>.start` | 4개(`--list`) | 에이전트를 요청 없이 여는 명령 | doc-values.json agents.<이름>.start | `doc-values.json`을 고친다 | 8 |
| `agent.<이름>.openCode` | 4개(`--list`) | 같은 명령의 코드 꼴(백틱 포함). 표 칸처럼 인라인 코드 한 덩어리가 이 값 전체일 때 코드 바깥에 표시를 단다 | doc-values.json agents.<이름>.open | `doc-values.json`을 고친다 | 6 |
| `agent.<이름>.startCode` | 4개(`--list`) | 같은 명령의 코드 꼴(백틱 포함). 표 칸처럼 인라인 코드 한 덩어리가 이 값 전체일 때 코드 바깥에 표시를 단다 | doc-values.json agents.<이름>.start | `doc-values.json`을 고친다 | 4 |
| `agent.<이름>.yolo` | 4개(`--list`) | 에이전트를 묻지 않고 진행하게 여는 명령 | doc-values.json agents.<이름>.yolo | `doc-values.json`을 고친다 | 29 |
| `agent.<이름>.yoloCode` | 4개(`--list`) | 같은 명령의 코드 꼴(백틱 포함). 인라인 코드 한 덩어리가 이 값 전체일 때 코드 바깥에 표시를 단다 | doc-values.json agents.<이름>.yolo | `doc-values.json`을 고친다 | 22 |
| `agent.<이름>.install` | 2개(`--list`) | 에이전트 설치 명령 | doc-values.json agents.<이름>.install | `doc-values.json`을 고친다 | 3 |
| `agent.<이름>.installCell` | 2개(`--list`) | 같은 명령의 표 칸 안 코드 꼴(백틱 포함, 파이프는 \\|) | doc-values.json agents.<이름>.install | `doc-values.json`을 고친다 | 2 |
| `agents.count` | 4 | 지원 에이전트 수 | doc-values.json agents 수 | `doc-values.json`을 고친다 | 3 |
| `agents.count.ko` | 네 | 지원 에이전트 수의 한글 수 관형사 | doc-values.json agents 수 | `doc-values.json`을 고친다 | 1 |
| `agents.list` | Claude Code, Codex, Antigravity, Grok Build | 지원 에이전트 목록 | doc-values.json agents 이름 | `doc-values.json`을 고친다 | 14 |
| `agents.imageTools` | Codex, Antigravity, Grok Build | 자체 이미지 도구가 있어 준비 없이 그리는 에이전트 목록 | doc-values.json agents imageTool | `doc-values.json`을 고친다 | 14 |
| `catalogs.<이름>.name` | 3개(`--list`) | 디자인 카탈로그 이름 | doc-values.json catalogs.<이름>.name | `doc-values.json`을 고친다 | 11 |
| `catalogs.<이름>.url` | 3개(`--list`) | 디자인 카탈로그 이름 링크의 주소(주소 안에는 표시를 달 수 없어 테스트가 같은지 본다) | doc-values.json catalogs.<이름>.url | `doc-values.json`을 고친다 | 0 |
| `catalogs.<이름>.count` | 3개(`--list`) | 카탈로그가 싣는 스타일 수(개). 센 날은 date | doc-values.json catalogs.<이름>.count | `doc-values.json`을 고친다 | 6 |
| `catalogs.<이름>.date` | 3개(`--list`) | 스타일 수를 센 날 | doc-values.json catalogs.<이름>.date | `doc-values.json`을 고친다 | 3 |
| `port.web` | 3001 | 템플릿 웹 개발 서버 포트(pnpm dev) | doc-values.json ports.web | `doc-values.json`을 고친다 | 0 |
| `port.neonDb` | 5432 | neon 템플릿 로컬 DB(compose Postgres) 포트 | doc-values.json ports.neonDb | `doc-values.json`을 고친다 | 6 |
| `port.supabaseDb` | 54322 | supabase 템플릿 로컬 DB(Supabase 스택 Postgres) 포트 | doc-values.json ports.supabaseDb | `doc-values.json`을 고친다 | 1 |
| `port.supabasePooler` | 6543 | supabase 템플릿 원격 Supabase의 transaction pooler 포트(배포한 앱의 DATABASE_URL). 설치본 prokit-db 스킬의 같은 값은 테스트가 비교한다 | doc-values.json ports.supabasePooler | `doc-values.json`을 고친다 | 4 |
| `port.web.urlCode` | `http://localhost:3001` | 웹 개발 서버 주소의 코드 꼴(백틱 포함) | doc-values.json ports.web | `doc-values.json`을 고친다 | 8 |
| `port.neonDb.addrCode` | `localhost:5432` | neon 로컬 DB 주소의 코드 꼴(백틱 포함) | doc-values.json ports.neonDb | `doc-values.json`을 고친다 | 2 |
| `port.supabaseDb.addrCode` | `127.0.0.1:54322` | supabase 로컬 DB 주소의 코드 꼴(백틱 포함) | doc-values.json ports.supabaseDb | `doc-values.json`을 고친다 | 1 |
| `preset.<이름>.title` | 11개(`--list`) | 프리셋 이름 | doc-values.json presets.<이름>.title | `doc-values.json`을 고친다 | 106 |
| `preset.<이름>.kind` | 11개(`--list`) | 분류(landing 랜딩페이지, app 앱 화면, clone 클론 튜토리얼) | doc-values.json presets.<이름>.kind | `doc-values.json`을 고친다 | 0 |
| `preset.<이름>.kindLabel` | 11개(`--list`) | 분류 이름(랜딩페이지, 앱 화면, 클론 튜토리얼) | 계산: doc-values.json presets.<이름>.kind | `doc-values.json`을 고친다 | 24 |
| `preset.<이름>.field` | 11개(`--list`) | 짧은 분야(README 대표 예시, 프로킷 사이트 카드) | doc-values.json presets.<이름>.field | `doc-values.json`을 고친다 | 4 |
| `preset.<이름>.summary` | 9개(`--list`) | 컨셉 한 줄(tutorials/samples/README.md 표) | doc-values.json presets.<이름>.summary | `doc-values.json`을 고친다 | 9 |
| `preset.<이름>.difficulty` | 9개(`--list`) | 실제 서비스로 바꾸는 난이도(tutorials/samples/README.md 표) | doc-values.json presets.<이름>.difficulty | `doc-values.json`을 고친다 | 9 |
| `preset.<이름>.pages` | 10개(`--list`) | 페이지 수 | doc-values.json presets.<이름>.pages | `doc-values.json`을 고친다 | 81 |
| `preset.<이름>.pages.rest` | 10개(`--list`) | 첫 화면을 뺀 나머지 페이지 수 | 계산: doc-values.json presets.<이름>.pages − 1 | `doc-values.json`을 고친다 | 8 |
| `preset.<이름>.design.rec1` | 8개(`--list`) | 스타일 추천 1위 이름 | doc-values.json presets.<이름>.design.recs | `doc-values.json`을 고친다 | 27 |
| `preset.<이름>.design.src1` | 8개(`--list`) | 스타일 추천 1위의 카탈로그 이름 | doc-values.json presets.<이름>.design.recs + catalogs.<이름>.name | `doc-values.json`을 고친다 | 10 |
| `preset.<이름>.design.rec2` | 8개(`--list`) | 스타일 추천 2위 이름 | doc-values.json presets.<이름>.design.recs | `doc-values.json`을 고친다 | 10 |
| `preset.<이름>.design.src2` | 8개(`--list`) | 스타일 추천 2위의 카탈로그 이름 | doc-values.json presets.<이름>.design.recs + catalogs.<이름>.name | `doc-values.json`을 고친다 | 2 |
| `preset.<이름>.design.rec3` | 8개(`--list`) | 스타일 추천 3위 이름 | doc-values.json presets.<이름>.design.recs | `doc-values.json`을 고친다 | 10 |
| `preset.<이름>.design.src3` | 8개(`--list`) | 스타일 추천 3위의 카탈로그 이름 | doc-values.json presets.<이름>.design.recs + catalogs.<이름>.name | `doc-values.json`을 고친다 | 2 |
| `preset.<이름>.design.color` | 8개(`--list`) | 대표 색 이름 | doc-values.json presets.<이름>.design.color | `doc-values.json`을 고친다 | 11 |
| `preset.<이름>.design.hex` | 8개(`--list`) | 대표 색 값 | doc-values.json presets.<이름>.design.hex | `doc-values.json`을 고친다 | 0 |
| `preset.<이름>.design.images` | 9개(`--list`) | AI로 그린 그림 수(장) | doc-values.json presets.<이름>.design.images | `doc-values.json`을 고친다 | 20 |
| `preset.<이름>.design.clicks` | 9개(`--list`) | 링크·버튼 눌러 본 횟수 | doc-values.json presets.<이름>.design.clicks | `doc-values.json`을 고친다 | 10 |
| `preset.<이름>.design.critique` | 9개(`--list`) | 디자인 리뷰(critique) 최종 점수(40점 만점) | doc-values.json presets.<이름>.design.critique | `doc-values.json`을 고친다 | 9 |
| `preset.<이름>.design.hexCode` | 8개(`--list`) | 대표 색 값의 코드 꼴(백틱 포함) | doc-values.json presets.<이름>.design.hex | `doc-values.json`을 고친다 | 10 |
| `preset.<이름>.stages.rest.pack.time` | 9개(`--list`) | 단계별 표: 나머지 페이지(프리셋 팩으로) | 계산: doc-values.json cost.stage.page.pack × doc-values.json presets.<이름>.pages − 1 | `doc-values.json`을 고친다 | 9 |
| `preset.<이름>.stages.rest.scratch.time` | 9개(`--list`) | 단계별 표: 나머지 페이지(처음부터) | 계산: doc-values.json cost.stage.page.scratch × doc-values.json presets.<이름>.pages − 1 | `doc-values.json`을 고친다 | 9 |
| `preset.<이름>.stages.images.time` | 9개(`--list`) | 단계별 표: 그림(처음부터). 장수 × 장당 시간을 분으로 올림 | 계산: doc-values.json presets.<이름>.design.images × cost.image.time | `doc-values.json`을 고친다 | 9 |
| `preset.<이름>.stages.check.time` | 9개(`--list`) | 단계별 표: 검사와 디자인 리뷰(두 열 같음). 쪽 수에 따라 늘지만 단위값으로 나눠 떨어지지 않아 프리셋마다 적는다 | doc-values.json presets.<이름>.stages.check | `doc-values.json`을 고친다 | 18 |
| `preset.<이름>.actual.<행>.<값>` | 89개(`--list`) | 만든 사람이 실제로 쓴 값. <행>은 total(합계)·redesign(첫 화면 리디자인)·build(Nextflix 2\~4장)·plan(2\~3장)·fix·expand·screens·review·polish. tokens·cached는 usd × cost.tokensPerUsd·cachedPerUsd로 계산한 값 | doc-values.json presets.<이름>.actual.total | `doc-values.json`을 고친다 | 99 |
| `preset.<이름>.pack.time` | 9개(`--list`) | 프리셋 팩으로 만들 때 최소 시간 | doc-values.json presets.<이름>.pack.time | `doc-values.json`을 고친다 | 0 |
| `preset.<이름>.pack.tokens` | 9개(`--list`) | 프리셋 팩으로 만들 때 최소 토큰 | doc-values.json presets.<이름>.pack.tokens | `doc-values.json`을 고친다 | 18 |
| `preset.<이름>.pack.cached` | 9개(`--list`) | 프리셋 팩으로 만들 때 캐시 포함 토큰 | doc-values.json presets.<이름>.pack.cached | `doc-values.json`을 고친다 | 18 |
| `preset.<이름>.pack.usd` | 9개(`--list`) | 프리셋 팩으로 만들 때 API 요금 환산(달러) | doc-values.json presets.<이름>.pack.usd | `doc-values.json`을 고친다 | 9 |
| `preset.<이름>.pack.limit` | 9개(`--list`) | 프리셋 팩으로 만들 때 Pro 5시간 한도에 걸리는 번 수 | 계산: doc-values.json presets.<이름>.pack.tokens ÷ limits.pro5h.tokens | `doc-values.json`을 고친다 | 0 |
| `preset.<이름>.pack.limitText` | 9개(`--list`) | 프리셋 팩으로 만들 때 "가능 (…)" 괄호 안 글 | 계산: doc-values.json presets.<이름>.pack.tokens ÷ limits.pro5h.tokens | `doc-values.json`을 고친다 | 9 |
| `preset.<이름>.pack.time.max` | 9개(`--list`) | 프리셋 팩으로 만들 때 한 번에 완성할 때 걸릴 수 있는 최대 시간(5분 단위 반올림) | 계산: doc-values.json presets.<이름>.pack.time × cost.timeRange.oneShotMax | `doc-values.json`을 고친다 | 0 |
| `preset.<이름>.pack.time.revise` | 9개(`--list`) | 프리셋 팩으로 만들 때 여러 번 고쳐 달라고 할 때 시간(5분 단위 반올림) | 계산: doc-values.json presets.<이름>.pack.time × cost.timeRange.reviseMax | `doc-values.json`을 고친다 | 0 |
| `preset.<이름>.pack.time.cell` | 9개(`--list`) | 프리셋 팩으로 만들 때 시간의 표 칸 꼴. 요약 시간은 이 꼴이나 .text로 쓴다 | 계산: doc-values.json presets.<이름>.pack.time × cost.timeRange | `doc-values.json`을 고친다 | 19 |
| `preset.<이름>.pack.time.text` | 9개(`--list`) | 프리셋 팩으로 만들 때 시간의 문장 꼴. 요약 시간은 이 꼴이나 .cell로 쓴다 | 계산: doc-values.json presets.<이름>.pack.time × cost.timeRange | `doc-values.json`을 고친다 | 13 |
| `preset.<이름>.scratch.time` | 9개(`--list`) | 처음부터 만들 때 최소 시간 | doc-values.json presets.<이름>.scratch.time | `doc-values.json`을 고친다 | 0 |
| `preset.<이름>.scratch.tokens` | 9개(`--list`) | 처음부터 만들 때 최소 토큰 | doc-values.json presets.<이름>.scratch.tokens | `doc-values.json`을 고친다 | 18 |
| `preset.<이름>.scratch.cached` | 9개(`--list`) | 처음부터 만들 때 캐시 포함 토큰 | doc-values.json presets.<이름>.scratch.cached | `doc-values.json`을 고친다 | 9 |
| `preset.<이름>.scratch.usd` | 9개(`--list`) | 처음부터 만들 때 API 요금 환산(달러) | doc-values.json presets.<이름>.scratch.usd | `doc-values.json`을 고친다 | 9 |
| `preset.<이름>.scratch.limit` | 9개(`--list`) | 처음부터 만들 때 Pro 5시간 한도에 걸리는 번 수 | 계산: doc-values.json presets.<이름>.scratch.tokens ÷ limits.pro5h.tokens | `doc-values.json`을 고친다 | 1 |
| `preset.<이름>.scratch.limitText` | 9개(`--list`) | 처음부터 만들 때 "가능 (…)" 괄호 안 글 | 계산: doc-values.json presets.<이름>.scratch.tokens ÷ limits.pro5h.tokens | `doc-values.json`을 고친다 | 1 |
| `preset.<이름>.scratch.time.max` | 9개(`--list`) | 처음부터 만들 때 한 번에 완성할 때 걸릴 수 있는 최대 시간(5분 단위 반올림) | 계산: doc-values.json presets.<이름>.scratch.time × cost.timeRange.oneShotMax | `doc-values.json`을 고친다 | 0 |
| `preset.<이름>.scratch.time.revise` | 9개(`--list`) | 처음부터 만들 때 여러 번 고쳐 달라고 할 때 시간(5분 단위 반올림) | 계산: doc-values.json presets.<이름>.scratch.time × cost.timeRange.reviseMax | `doc-values.json`을 고친다 | 0 |
| `preset.<이름>.scratch.time.cell` | 9개(`--list`) | 처음부터 만들 때 시간의 표 칸 꼴. 요약 시간은 이 꼴이나 .text로 쓴다 | 계산: doc-values.json presets.<이름>.scratch.time × cost.timeRange | `doc-values.json`을 고친다 | 18 |
| `preset.<이름>.scratch.time.text` | 9개(`--list`) | 처음부터 만들 때 시간의 문장 꼴. 요약 시간은 이 꼴이나 .cell로 쓴다 | 계산: doc-values.json presets.<이름>.scratch.time × cost.timeRange | `doc-values.json`을 고친다 | 10 |
| `preset.<이름>.design.comp` | 6개(`--list`) | 고른 시안 글자 | doc-values.json presets.<이름>.design.comp | `doc-values.json`을 고친다 | 6 |
| `preset.<이름>.design.compName` | 6개(`--list`) | 고른 시안 이름 | doc-values.json presets.<이름>.design.compName | `doc-values.json`을 고친다 | 6 |
| `preset.<이름>.pageTypes` | 48 | 같은 틀을 하나로 센 페이지 종류 수 | doc-values.json presets.<이름>.pageTypes | `doc-values.json`을 고친다 | 8 |
| `preset.<이름>.pageTypes.rest` | 47 | 첫 화면을 뺀 나머지 페이지 종류 수 | 계산: doc-values.json presets.<이름>.pageTypes − 1 | `doc-values.json`을 고친다 | 1 |
| `preset.<이름>.prep.<행>.<값>` | 50개(`--list`) | 원래 서비스 조사와 프리셋 팩 만들기의 실측(기록). <행>은 research(조사와 분석, 요청부터 리서치 끝까지 벽시계)·expand(올곧 범위 넓히기 조사)·plan(기획)·pack(팩 만들기. Claudle은 설계 포함) | doc-values.json presets.<이름>.prep.research | `doc-values.json`을 고친다 | 48 |
| `preset.<이름>.all.<값>` | 15개(`--list`) | 조사부터 만들기까지 더한 시간(벽시계, 5분 단위. 팩 다듬기 뺌) | 계산: preset.olgot.actual.total + doc-values.json presets.<이름>.prep 합 | `doc-values.json`을 고친다 | 13 |
| `preset.<이름>.chapter.<장>.time` | 15개(`--list`) | 클론 README 단계별 표: 과정마다 다른 장의 최소 시간(두 과정이 같은 장은 cost.stage.*) | doc-values.json presets.<이름>.chapters.<장> | `doc-values.json`을 고친다 | 15 |
| `preset.<이름>.packFix.<값>` | 5개(`--list`) | 만들기 라운드에서 찾은 점을 프리셋 팩에 되먹인 시간(에이전트 시간 합이라 벽시계 합 all에 넣지 않는다) | doc-values.json presets.<이름>.packFix | `doc-values.json`을 고친다 | 4 |
| `preset.<이름>.made.<값>` | 5개(`--list`) | 프리셋 만들기 합(Claude로 한 라운드만, 5분 단위) | 계산: doc-values.json presets.<이름>.actual의 build·fix 합 | `doc-values.json`을 고친다 | 5 |
| `preset.<이름>.screens.time` | 2개(`--list`) | 화면까지(1~4장) 최소 시간 | doc-values.json presets.<이름>.screens.time | `doc-values.json`을 고친다 | 0 |
| `preset.<이름>.screens.tokens` | 2개(`--list`) | 화면까지(1~4장) 최소 토큰 | doc-values.json presets.<이름>.screens.tokens | `doc-values.json`을 고친다 | 4 |
| `preset.<이름>.screens.cached` | 2개(`--list`) | 화면까지(1~4장) 캐시 포함 토큰 | doc-values.json presets.<이름>.screens.cached | `doc-values.json`을 고친다 | 4 |
| `preset.<이름>.screens.limit` | 2개(`--list`) | 화면까지(1~4장) Pro 5시간 한도에 걸리는 번 수 | 계산: doc-values.json presets.<이름>.screens.tokens ÷ limits.pro5h.tokens | `doc-values.json`을 고친다 | 0 |
| `preset.<이름>.screens.limitText` | 2개(`--list`) | 화면까지(1~4장) "가능 (…)" 괄호 안 글 | 계산: doc-values.json presets.<이름>.screens.tokens ÷ limits.pro5h.tokens | `doc-values.json`을 고친다 | 2 |
| `preset.<이름>.screens.time.max` | 2개(`--list`) | 화면까지(1~4장) 한 번에 완성할 때 걸릴 수 있는 최대 시간(5분 단위 반올림) | 계산: doc-values.json presets.<이름>.screens.time × cost.timeRange.oneShotMax | `doc-values.json`을 고친다 | 0 |
| `preset.<이름>.screens.time.revise` | 2개(`--list`) | 화면까지(1~4장) 여러 번 고쳐 달라고 할 때 시간(5분 단위 반올림) | 계산: doc-values.json presets.<이름>.screens.time × cost.timeRange.reviseMax | `doc-values.json`을 고친다 | 0 |
| `preset.<이름>.screens.time.cell` | 2개(`--list`) | 화면까지(1~4장) 시간의 표 칸 꼴. 요약 시간은 이 꼴이나 .text로 쓴다 | 계산: doc-values.json presets.<이름>.screens.time × cost.timeRange | `doc-values.json`을 고친다 | 5 |
| `preset.<이름>.screens.time.text` | 2개(`--list`) | 화면까지(1~4장) 시간의 문장 꼴. 요약 시간은 이 꼴이나 .cell로 쓴다 | 계산: doc-values.json presets.<이름>.screens.time × cost.timeRange | `doc-values.json`을 고친다 | 4 |
| `preset.<이름>.full.time` | 2개(`--list`) | 끝까지(1~12장) 최소 시간 | doc-values.json presets.<이름>.full.time | `doc-values.json`을 고친다 | 0 |
| `preset.<이름>.full.tokens` | 2개(`--list`) | 끝까지(1~12장) 최소 토큰 | doc-values.json presets.<이름>.full.tokens | `doc-values.json`을 고친다 | 4 |
| `preset.<이름>.full.cached` | 2개(`--list`) | 끝까지(1~12장) 캐시 포함 토큰 | doc-values.json presets.<이름>.full.cached | `doc-values.json`을 고친다 | 4 |
| `preset.<이름>.full.limit` | 2개(`--list`) | 끝까지(1~12장) Pro 5시간 한도에 걸리는 번 수 | 계산: doc-values.json presets.<이름>.full.tokens ÷ limits.pro5h.tokens | `doc-values.json`을 고친다 | 0 |
| `preset.<이름>.full.limitText` | 2개(`--list`) | 끝까지(1~12장) "가능 (…)" 괄호 안 글 | 계산: doc-values.json presets.<이름>.full.tokens ÷ limits.pro5h.tokens | `doc-values.json`을 고친다 | 2 |
| `preset.<이름>.full.time.max` | 2개(`--list`) | 끝까지(1~12장) 한 번에 완성할 때 걸릴 수 있는 최대 시간(5분 단위 반올림) | 계산: doc-values.json presets.<이름>.full.time × cost.timeRange.oneShotMax | `doc-values.json`을 고친다 | 0 |
| `preset.<이름>.full.time.revise` | 2개(`--list`) | 끝까지(1~12장) 여러 번 고쳐 달라고 할 때 시간(5분 단위 반올림) | 계산: doc-values.json presets.<이름>.full.time × cost.timeRange.reviseMax | `doc-values.json`을 고친다 | 0 |
| `preset.<이름>.full.time.cell` | 2개(`--list`) | 끝까지(1~12장) 시간의 표 칸 꼴. 요약 시간은 이 꼴이나 .text로 쓴다 | 계산: doc-values.json presets.<이름>.full.time × cost.timeRange | `doc-values.json`을 고친다 | 5 |
| `preset.<이름>.full.time.text` | 2개(`--list`) | 끝까지(1~12장) 시간의 문장 꼴. 요약 시간은 이 꼴이나 .cell로 쓴다 | 계산: doc-values.json presets.<이름>.full.time × cost.timeRange | `doc-values.json`을 고친다 | 4 |
| `preset.<이름>.dailyLimit` | 200 | 실제 AI 답의 하루 한도(서비스 전체, 번). 근거는 프리셋 팩 features.md "5.2 하루 한도"(팩 저장소의 claudle 팩, 원본 ../pro-kit-samples/packs/claudle)라 팩을 바꾸면 함께 바꾼다 | doc-values.json presets.<이름>.dailyLimit | `doc-values.json`을 고친다 | 5 |
| `presets.count` | 11 | 프리셋 수(클론 튜토리얼 포함) | doc-values.json presets 수 | `doc-values.json`을 고친다 | 7 |
| `presets.screen.count` | 9 | 화면 프리셋 수 | doc-values.json presets 중 landing·app | `doc-values.json`을 고친다 | 12 |
| `presets.landing.count` | 4 | 랜딩페이지 프리셋 수 | doc-values.json presets 중 landing | `doc-values.json`을 고친다 | 7 |
| `presets.app.count` | 5 | 앱 화면 프리셋 수 | doc-values.json presets 중 app | `doc-values.json`을 고친다 | 7 |
| `presets.clone.count` | 2 | 클론 튜토리얼 프리셋 수 | doc-values.json presets 중 clone | `doc-values.json`을 고친다 | 5 |
| `presets.screen.pages.range` | 7\~22 | 화면 프리셋 한 개의 페이지 수 범위 | 계산: doc-values.json 화면 프리셋 pages의 최소~최대(pageTypes가 있는 프리셋 제외) | `doc-values.json`을 고친다 | 1 |
| `presets.actual.time.range` | 2시간 15분\~4시간 25분 | 화면 프리셋을 만든 사람이 리디자인과 넓히기에 실제로 쓴 값의 범위(시간·토큰·달러) | 계산: preset.<이름>.actual.total의 최소~최대(올곧 제외) | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `presets.actual.tokens.range` | 360만\~940만 | 화면 프리셋을 만든 사람이 리디자인과 넓히기에 실제로 쓴 값의 범위(시간·토큰·달러) | 계산: preset.<이름>.actual.total의 최소~최대(올곧 제외) | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `presets.actual.usd.range` | 65\~170 | 화면 프리셋을 만든 사람이 리디자인과 넓히기에 실제로 쓴 값의 범위(시간·토큰·달러) | 계산: preset.<이름>.actual.total의 최소~최대(올곧 제외) | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `presets.screen.pages` | 337 | 화면 프리셋 페이지 수 합 | doc-values.json 화면 프리셋 pages 합 | `doc-values.json`을 고친다 | 3 |
| `presets.pack.time.range` | 1시간\~3시간 55분 | 화면 프리셋을 프리셋 팩으로 만들 때 최소 시간 범위 | 계산: doc-values.json presets(최소 goru, 최대 olgot) | `doc-values.json`을 고친다 | 0 |
| `presets.pack.time.max` | 7시간 50분 | 화면 프리셋 하나를 프리셋 팩으로 만들 때. 가장 작은 것의 최솟값부터 가장 큰 것 × 배수까지 한 번에 완성할 때 걸릴 수 있는 최대 시간(5분 단위 반올림) | 계산: doc-values.json presets(최소 goru, 최대 olgot) × cost.timeRange.oneShotMax | `doc-values.json`을 고친다 | 0 |
| `presets.pack.time.revise` | 11시간 45분 | 화면 프리셋 하나를 프리셋 팩으로 만들 때. 가장 작은 것의 최솟값부터 가장 큰 것 × 배수까지 여러 번 고쳐 달라고 할 때 시간(5분 단위 반올림) | 계산: doc-values.json presets(최소 goru, 최대 olgot) × cost.timeRange.reviseMax | `doc-values.json`을 고친다 | 0 |
| `presets.pack.time.cell` | 약 1시간\~7시간 50분 (여러 번 고치면 약 11시간 45분까지) | 화면 프리셋 하나를 프리셋 팩으로 만들 때. 가장 작은 것의 최솟값부터 가장 큰 것 × 배수까지 시간의 표 칸 꼴. 요약 시간은 이 꼴이나 .text로 쓴다 | 계산: doc-values.json presets(최소 goru, 최대 olgot) × cost.timeRange | `doc-values.json`을 고친다 | 1 |
| `presets.pack.time.text` | 한 번에 완성하면 약 1시간\~7시간 50분(여러 번 고쳐 달라고 하면 약 11시간 45분까지) | 화면 프리셋 하나를 프리셋 팩으로 만들 때. 가장 작은 것의 최솟값부터 가장 큰 것 × 배수까지 시간의 문장 꼴. 요약 시간은 이 꼴이나 .cell로 쓴다 | 계산: doc-values.json presets(최소 goru, 최대 olgot) × cost.timeRange | `doc-values.json`을 고친다 | 2 |
| `presets.pack.tokens.range` | 125만\~550만 | 화면 프리셋을 프리셋 팩으로 만들 때 최소 토큰 범위 | 계산: doc-values.json presets(최소 goru, 최대 olgot) | `doc-values.json`을 고친다 | 1 |
| `presets.pack.cached.range` | 6,900만\~2.8억 | 화면 프리셋을 프리셋 팩으로 만들 때 캐시 포함 토큰 범위 | 계산: doc-values.json presets(최소 goru, 최대 olgot) | `doc-values.json`을 고친다 | 1 |
| `presets.pack.limit.range` | 5시간 한도 안\~약 3번 | 화면 프리셋을 프리셋 팩으로 만들 때 Pro 5시간 한도 범위 | 계산: doc-values.json 화면 프리셋 한도 번 수의 최소~최대 | `doc-values.json`을 고친다 | 1 |
| `presets.scratch.time.range` | 1시간 30분\~5시간 45분 | 화면 프리셋을 처음부터 만들 때 최소 시간 범위 | 계산: doc-values.json presets(최소 goru, 최대 olgot) | `doc-values.json`을 고친다 | 0 |
| `presets.scratch.time.max` | 11시간 30분 | 화면 프리셋 하나를 처음부터 만들 때. 가장 작은 것의 최솟값부터 가장 큰 것 × 배수까지 한 번에 완성할 때 걸릴 수 있는 최대 시간(5분 단위 반올림) | 계산: doc-values.json presets(최소 goru, 최대 olgot) × cost.timeRange.oneShotMax | `doc-values.json`을 고친다 | 0 |
| `presets.scratch.time.revise` | 17시간 15분 | 화면 프리셋 하나를 처음부터 만들 때. 가장 작은 것의 최솟값부터 가장 큰 것 × 배수까지 여러 번 고쳐 달라고 할 때 시간(5분 단위 반올림) | 계산: doc-values.json presets(최소 goru, 최대 olgot) × cost.timeRange.reviseMax | `doc-values.json`을 고친다 | 0 |
| `presets.scratch.time.cell` | 약 1시간 30분\~11시간 30분 (여러 번 고치면 약 17시간 15분까지) | 화면 프리셋 하나를 처음부터 만들 때. 가장 작은 것의 최솟값부터 가장 큰 것 × 배수까지 시간의 표 칸 꼴. 요약 시간은 이 꼴이나 .text로 쓴다 | 계산: doc-values.json presets(최소 goru, 최대 olgot) × cost.timeRange | `doc-values.json`을 고친다 | 1 |
| `presets.scratch.time.text` | 한 번에 완성하면 약 1시간 30분\~11시간 30분(여러 번 고쳐 달라고 하면 약 17시간 15분까지) | 화면 프리셋 하나를 처음부터 만들 때. 가장 작은 것의 최솟값부터 가장 큰 것 × 배수까지 시간의 문장 꼴. 요약 시간은 이 꼴이나 .cell로 쓴다 | 계산: doc-values.json presets(최소 goru, 최대 olgot) × cost.timeRange | `doc-values.json`을 고친다 | 2 |
| `presets.scratch.tokens.range` | 190만\~800만 | 화면 프리셋을 처음부터 만들 때 최소 토큰 범위 | 계산: doc-values.json presets(최소 goru, 최대 olgot) | `doc-values.json`을 고친다 | 1 |
| `presets.scratch.cached.range` | 9,600만\~4.0억 | 화면 프리셋을 처음부터 만들 때 캐시 포함 토큰 범위 | 계산: doc-values.json presets(최소 goru, 최대 olgot) | `doc-values.json`을 고친다 | 1 |
| `presets.scratch.limit.range` | 약 1\~4번 | 화면 프리셋을 처음부터 만들 때 Pro 5시간 한도 범위 | 계산: doc-values.json 화면 프리셋 한도 번 수의 최소~최대 | `doc-values.json`을 고친다 | 1 |
| `clones.full.time.range` | 5시간\~5시간 15분 | 클론 튜토리얼을 끝까지(1~12장) 최소 시간 범위 | 계산: doc-values.json presets(최소 claudle, 최대 nextflix) | `doc-values.json`을 고친다 | 0 |
| `clones.full.time.max` | 10시간 30분 | 클론 튜토리얼 하나를 끝까지(1~12장). 가장 작은 것의 최솟값부터 가장 큰 것 × 배수까지 한 번에 완성할 때 걸릴 수 있는 최대 시간(5분 단위 반올림) | 계산: doc-values.json presets(최소 claudle, 최대 nextflix) × cost.timeRange.oneShotMax | `doc-values.json`을 고친다 | 0 |
| `clones.full.time.revise` | 15시간 45분 | 클론 튜토리얼 하나를 끝까지(1~12장). 가장 작은 것의 최솟값부터 가장 큰 것 × 배수까지 여러 번 고쳐 달라고 할 때 시간(5분 단위 반올림) | 계산: doc-values.json presets(최소 claudle, 최대 nextflix) × cost.timeRange.reviseMax | `doc-values.json`을 고친다 | 0 |
| `clones.full.time.cell` | 약 5시간\~10시간 30분 (여러 번 고치면 약 15시간 45분까지) | 클론 튜토리얼 하나를 끝까지(1~12장). 가장 작은 것의 최솟값부터 가장 큰 것 × 배수까지 시간의 표 칸 꼴. 요약 시간은 이 꼴이나 .text로 쓴다 | 계산: doc-values.json presets(최소 claudle, 최대 nextflix) × cost.timeRange | `doc-values.json`을 고친다 | 0 |
| `clones.full.time.text` | 한 번에 완성하면 약 5시간\~10시간 30분(여러 번 고쳐 달라고 하면 약 15시간 45분까지) | 클론 튜토리얼 하나를 끝까지(1~12장). 가장 작은 것의 최솟값부터 가장 큰 것 × 배수까지 시간의 문장 꼴. 요약 시간은 이 꼴이나 .cell로 쓴다 | 계산: doc-values.json presets(최소 claudle, 최대 nextflix) × cost.timeRange | `doc-values.json`을 고친다 | 1 |
| `clones.full.tokens.range` | 610만\~770만 | 클론 튜토리얼을 끝까지(1~12장) 최소 토큰 범위 | 계산: doc-values.json presets(최소 claudle, 최대 nextflix) | `doc-values.json`을 고친다 | 1 |
| `clones.full.cached.range` | 3억\~3.9억 | 클론 튜토리얼을 끝까지(1~12장) 캐시 포함 토큰 범위 | 계산: doc-values.json presets(최소 claudle, 최대 nextflix) | `doc-values.json`을 고친다 | 1 |
| `clones.full.limit.range` | 약 3\~4번 | 클론 튜토리얼을 끝까지(1~12장) Pro 5시간 한도 범위 | 계산: doc-values.json 클론 튜토리얼 한도 번 수의 최소~최대 | `doc-values.json`을 고친다 | 0 |
| `presets.design.first.summary` | Refero Styles 6개, awesome-design-md 2개 | 1위로 고른 스타일의 카탈로그별 수 | 계산: doc-values.json 화면 프리셋 design.recs 1위의 카탈로그 | `doc-values.json`을 고친다 | 1 |
| `presets.design.critique.list` | 제철상자 35, 하루공부 33, PACECREW 31, 고루 30, 올곧 30, 울림 29, AFTERGLOW 29, 핏슬롯 28, Uptrail 28 | 디자인 리뷰 점수가 높은 순서(이름 점수) | 계산: doc-values.json 화면 프리셋 design.critique 내림차순 | `doc-values.json`을 고친다 | 1 |
| `packs.count` | 11 | 프리셋 팩 수 | tutorials/packs.json 항목 수 | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.nextflix.release` | https://github.com/roadkwon-ai/pro-kit-premium-packs/releases/tag/pack-nextflix | nextflix 프리셋 팩 릴리스 쪽 주소 | tutorials/packs.json url → releases/tag | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.claudle.release` | https://github.com/roadkwon-ai/pro-kit-premium-packs/releases/tag/pack-claudle | claudle 프리셋 팩 릴리스 쪽 주소 | tutorials/packs.json url → releases/tag | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.goru.release` | https://github.com/roadkwon-ai/pro-kit-packs/releases/tag/pack-goru | goru 프리셋 팩 릴리스 쪽 주소 | tutorials/packs.json url → releases/tag | 정본 파일이 바뀌면 따라 바뀐다 | 3 |
| `pack.ullim.release` | https://github.com/roadkwon-ai/pro-kit-packs/releases/tag/pack-ullim | ullim 프리셋 팩 릴리스 쪽 주소 | tutorials/packs.json url → releases/tag | 정본 파일이 바뀌면 따라 바뀐다 | 3 |
| `pack.studyday.release` | https://github.com/roadkwon-ai/pro-kit-packs/releases/tag/pack-studyday | studyday 프리셋 팩 릴리스 쪽 주소 | tutorials/packs.json url → releases/tag | 정본 파일이 바뀌면 따라 바뀐다 | 3 |
| `pack.afterglow.release` | https://github.com/roadkwon-ai/pro-kit-packs/releases/tag/pack-afterglow | afterglow 프리셋 팩 릴리스 쪽 주소 | tutorials/packs.json url → releases/tag | 정본 파일이 바뀌면 따라 바뀐다 | 3 |
| `pack.fitslot.release` | https://github.com/roadkwon-ai/pro-kit-packs/releases/tag/pack-fitslot | fitslot 프리셋 팩 릴리스 쪽 주소 | tutorials/packs.json url → releases/tag | 정본 파일이 바뀌면 따라 바뀐다 | 3 |
| `pack.jecheol.release` | https://github.com/roadkwon-ai/pro-kit-packs/releases/tag/pack-jecheol | jecheol 프리셋 팩 릴리스 쪽 주소 | tutorials/packs.json url → releases/tag | 정본 파일이 바뀌면 따라 바뀐다 | 3 |
| `pack.pacecrew.release` | https://github.com/roadkwon-ai/pro-kit-packs/releases/tag/pack-pacecrew | pacecrew 프리셋 팩 릴리스 쪽 주소 | tutorials/packs.json url → releases/tag | 정본 파일이 바뀌면 따라 바뀐다 | 3 |
| `pack.uptrail.release` | https://github.com/roadkwon-ai/pro-kit-packs/releases/tag/pack-uptrail | uptrail 프리셋 팩 릴리스 쪽 주소 | tutorials/packs.json url → releases/tag | 정본 파일이 바뀌면 따라 바뀐다 | 3 |
| `pack.olgot.release` | https://github.com/roadkwon-ai/pro-kit-premium-packs/releases/tag/pack-olgot | olgot 프리셋 팩 릴리스 쪽 주소 | tutorials/packs.json url → releases/tag | 정본 파일이 바뀌면 따라 바뀐다 | 3 |
| `pack.nextflix.zip` | https://github.com/roadkwon-ai/pro-kit-premium-packs/releases/download/pack-nextflix/nextflix-pack.zip | nextflix 프리셋 팩 zip 내려받기 주소 | tutorials/packs.json url | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.nextflix.size` | 7.2MB | nextflix 프리셋 팩 zip 크기 | tutorials/packs.json bytes(MB, 소수 한 자리) | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.claudle.zip` | https://github.com/roadkwon-ai/pro-kit-premium-packs/releases/download/pack-claudle/claudle-pack.zip | claudle 프리셋 팩 zip 내려받기 주소 | tutorials/packs.json url | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.claudle.size` | 1.0MB | claudle 프리셋 팩 zip 크기 | tutorials/packs.json bytes(MB, 소수 한 자리) | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.goru.zip` | https://github.com/roadkwon-ai/pro-kit-packs/releases/download/pack-goru/goru-pack.zip | goru 프리셋 팩 zip 내려받기 주소 | tutorials/packs.json url | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.goru.size` | 2.9MB | goru 프리셋 팩 zip 크기 | tutorials/packs.json bytes(MB, 소수 한 자리) | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.ullim.zip` | https://github.com/roadkwon-ai/pro-kit-packs/releases/download/pack-ullim/ullim-pack.zip | ullim 프리셋 팩 zip 내려받기 주소 | tutorials/packs.json url | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.ullim.size` | 11.3MB | ullim 프리셋 팩 zip 크기 | tutorials/packs.json bytes(MB, 소수 한 자리) | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.studyday.zip` | https://github.com/roadkwon-ai/pro-kit-packs/releases/download/pack-studyday/studyday-pack.zip | studyday 프리셋 팩 zip 내려받기 주소 | tutorials/packs.json url | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.studyday.size` | 3.6MB | studyday 프리셋 팩 zip 크기 | tutorials/packs.json bytes(MB, 소수 한 자리) | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.afterglow.zip` | https://github.com/roadkwon-ai/pro-kit-packs/releases/download/pack-afterglow/afterglow-pack.zip | afterglow 프리셋 팩 zip 내려받기 주소 | tutorials/packs.json url | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.afterglow.size` | 21.5MB | afterglow 프리셋 팩 zip 크기 | tutorials/packs.json bytes(MB, 소수 한 자리) | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.fitslot.zip` | https://github.com/roadkwon-ai/pro-kit-packs/releases/download/pack-fitslot/fitslot-pack.zip | fitslot 프리셋 팩 zip 내려받기 주소 | tutorials/packs.json url | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.fitslot.size` | 10.6MB | fitslot 프리셋 팩 zip 크기 | tutorials/packs.json bytes(MB, 소수 한 자리) | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.jecheol.zip` | https://github.com/roadkwon-ai/pro-kit-packs/releases/download/pack-jecheol/jecheol-pack.zip | jecheol 프리셋 팩 zip 내려받기 주소 | tutorials/packs.json url | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.jecheol.size` | 18.2MB | jecheol 프리셋 팩 zip 크기 | tutorials/packs.json bytes(MB, 소수 한 자리) | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.pacecrew.zip` | https://github.com/roadkwon-ai/pro-kit-packs/releases/download/pack-pacecrew/pacecrew-pack.zip | pacecrew 프리셋 팩 zip 내려받기 주소 | tutorials/packs.json url | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.pacecrew.size` | 16.6MB | pacecrew 프리셋 팩 zip 크기 | tutorials/packs.json bytes(MB, 소수 한 자리) | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.uptrail.zip` | https://github.com/roadkwon-ai/pro-kit-packs/releases/download/pack-uptrail/uptrail-pack.zip | uptrail 프리셋 팩 zip 내려받기 주소 | tutorials/packs.json url | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.uptrail.size` | 3.2MB | uptrail 프리셋 팩 zip 크기 | tutorials/packs.json bytes(MB, 소수 한 자리) | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.olgot.zip` | https://github.com/roadkwon-ai/pro-kit-premium-packs/releases/download/pack-olgot/olgot-pack.zip | olgot 프리셋 팩 zip 내려받기 주소 | tutorials/packs.json url | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `pack.olgot.size` | 29.9MB | olgot 프리셋 팩 zip 크기 | tutorials/packs.json bytes(MB, 소수 한 자리) | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `process.research.<과정>.<단계>` | 15개(`--list`) | 리서치 단계에 에이전트가 일한 시간. <과정>은 claudle·nextflix, <단계>는 scope(범위)·first·more(Claudle 첫 조사·보강)·public·login(Nextflix 공개·로그인 화면)·features(기능과 규칙)·firstSummary·moreSummary·summary·verify(분석과 요약)·decide(내 답), analysis(분석과 요약 합)·total(decide를 뺀 합, 5분 단위)은 계산값 | doc-values.json process.research.claudle.scope | `doc-values.json`을 고친다 | 13 |
| `process.research.<과정>.total` | 2개(`--list`) | 리서치에 에이전트가 일한 시간의 합(5분 단위) | 계산: doc-values.json process.research.claudle의 합(decide 빼고) | `doc-values.json`을 고친다 | 2 |
| `process.scope.<범위>.time` | 2개(`--list`) | 조사 범위별 어림(에이전트가 일한 시간의 합, 5분 단위). <범위>는 login(로그인 화면까지)·all(웹의 거의 모든 화면). 공개 페이지 몇 개는 process.research.nextflix.public | 계산: doc-values.json process.research.claudle.first + firstSummary | `doc-values.json`을 고친다 | 3 |
| `process.scope.<범위>.tokens` | 3개(`--list`) | 조사 범위 어림의 토큰(캐시 뺀 값. 실측 토큰을 반올림) | doc-values.json process.scopeTokens.public | `doc-values.json`을 고친다 | 3 |
| `process.pie.<과정>.<조각>.min` | 14개(`--list`) | 원그래프 조각(분). <조각>은 recheck(모든 페이지 확인)·model(생각하고 쓰기)·review(리뷰·디자인 검사 에이전트)·impl(구현 에이전트를 기다림)·browser(브라우저 확인)·build(빌드·내보내기·타입·포맷)·other(기타) | doc-values.json process.pie.claudle.recheck | `doc-values.json`을 고친다 | 14 |
| `process.pie.<과정>.<조각>.pct` | 14개(`--list`) | 원그래프 조각의 비율(%) | 계산: doc-values.json process.pie.claudle.recheck ÷ 합 | `doc-values.json`을 고친다 | 7 |
| `process.olgot.<라운드>` | 6개(`--list`) | 올곧 라운드의 벽시계 시간. <라운드>는 plan(기획과 홈 시안)·expand(범위 넓히기)·first(1차 14쪽)·rest(나머지)·close(닫기)·wait(1차 라운드의 백그라운드 기다림) | doc-values.json process.olgot.plan | `doc-values.json`을 고친다 | 7 |
| `process.olgot.total` | 8시간 20분 | 올곧 라운드 합(벽시계, 5분 단위). preset.olgot.actual.total.time과 같아야 한다 | 계산: doc-values.json process.olgot(wait 빼고) + cost.revise의 올곧 예시 셋 | `doc-values.json`을 고친다 | 1 |
| `process.olgot.work` | 7시간 35분 | 올곧 라운드 합에서 백그라운드 기다림을 뺀 일한 시간(5분 단위) | 계산: process.olgot.total − doc-values.json process.olgot.wait | `doc-values.json`을 고친다 | 1 |
| `templates.count` | 2 | 템플릿 수 | templates/prokit-next-* 수 | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `templates.count.ko` | 두 | 템플릿 수의 한글 수 관형사 | templates/prokit-next-* 수 | 정본 파일이 바뀌면 따라 바뀐다 | 16 |
| `prokit.skills.count` | 8 | 프로젝트 스킬(prokit-*) 수 | templates/*/files/.agents/skills/prokit-* 수 | 정본 파일이 바뀌면 따라 바뀐다 | 28 |
| `prokit.skills.count.ko` | 여덟 | 프로젝트 스킬 수의 한글 수 관형사 | templates/*/files/.agents/skills/prokit-* 수 | 정본 파일이 바뀌면 따라 바뀐다 | 0 |
| `prokit.agents.count` | 2 | 구현·리뷰 에이전트 수 | templates/*/files/.claude/agents/*.md 수 | 정본 파일이 바뀌면 따라 바뀐다 | 8 |
| `prokit.agents.count.ko` | 두 | 구현·리뷰 에이전트 수의 한글 수 관형사 | templates/*/files/.claude/agents/*.md 수 | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `devCycle.cases.count` | 7 | dev-cycle 케이스 수 | templates/*/files/scripts/dev-cycle.mjs CASES | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `devCycle.cases.count.ko` | 일곱 | dev-cycle 케이스 수의 한글 수 관형사 | templates/*/files/scripts/dev-cycle.mjs CASES | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `devCycle.cases.list` | A, B, C, D, E, F, H | dev-cycle 케이스 목록 | templates/*/files/scripts/dev-cycle.mjs CASES | 정본 파일이 바뀌면 따라 바뀐다 | 0 |
| `devCycle.cases.range` | A\~F·H | dev-cycle 케이스를 이어지는 구간으로 묶은 글(A\~F·H) | templates/*/files/scripts/dev-cycle.mjs CASES | 정본 파일이 바뀌면 따라 바뀐다 | 17 |
| `devCycle.ui.auditMin` | 16 | 화면 작업 audit 점수 하한(20점 만점) | templates/*/files/.dev-cycle.json ui.auditMin | 정본 파일이 바뀌면 따라 바뀐다 | 4 |
| `devCycle.ui.a11yMin` | 3 | 화면 작업 접근성 점수 하한(4점 만점) | templates/*/files/.dev-cycle.json ui.a11yMin | 정본 파일이 바뀌면 따라 바뀐다 | 3 |
| `skills.official.neon` | 28 | neon 템플릿 공식 스킬 수(Claude Code와 Codex에 함께 설치) | templates/prokit-next-neon/files/skills.manifest.json | 정본 파일이 바뀌면 따라 바뀐다 | 4 |
| `skills.official.supabase` | 25 | supabase 템플릿 공식 스킬 수(Claude Code와 Codex에 함께 설치) | templates/prokit-next-supabase/files/skills.manifest.json | 정본 파일이 바뀌면 따라 바뀐다 | 4 |
| `skills.codex.superpowers` | 15 | Codex에 설치하는 superpowers 스킬 수 | templates/*/files/skills.manifest.json obra/superpowers | 정본 파일이 바뀌면 따라 바뀐다 | 5 |
| `cli.<이름>.install` | 3개(`--list`) | 전역 CLI 설치 명령 | templates/*/files/skills.manifest.json global Neon CLI | 정본 파일이 바뀌면 따라 바뀐다 | 0 |
| `cli.<이름>.installCode` | 3개(`--list`) | 같은 명령의 코드 꼴(백틱 포함) | templates/*/files/skills.manifest.json global Neon CLI | 정본 파일이 바뀌면 따라 바뀐다 | 11 |
| `optional.names` | ops, motion, mobile | 선택 스킬 묶음 이름 | templates/*/files/skills.manifest.json optional | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `optional.namesCode` | `ops`, `motion`, `mobile` | 선택 스킬 묶음 이름의 코드 꼴(묶음마다 백틱) | templates/*/files/skills.manifest.json optional | 정본 파일이 바뀌면 따라 바뀐다 | 5 |
| `optional.count` | 3 | 선택 스킬 묶음 수 | templates/*/files/skills.manifest.json optional | 정본 파일이 바뀌면 따라 바뀐다 | 0 |
| `optional.count.ko` | 세 | 선택 스킬 묶음 수의 한글 수 관형사 | templates/*/files/skills.manifest.json optional | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `optional.ops.skillsCode.neon` | `vercel-optimize`, `neon-functions`, `neon-object-storage`, `neon-ai-gateway` | neon 템플릿 ops 묶음의 스킬(스킬마다 백틱) | templates/prokit-next-neon/files/skills.manifest.json optional.ops | 정본 파일이 바뀌면 따라 바뀐다 | 2 |
| `optional.ops.count.neon` | 4 | neon 템플릿 ops 묶음의 스킬 수 | templates/prokit-next-neon/files/skills.manifest.json optional.ops | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `optional.ops.skillsCode.supabase` | `vercel-optimize` | supabase 템플릿 ops 묶음의 스킬(스킬마다 백틱) | templates/prokit-next-supabase/files/skills.manifest.json optional.ops | 정본 파일이 바뀌면 따라 바뀐다 | 3 |
| `optional.ops.count.supabase` | 1 | supabase 템플릿 ops 묶음의 스킬 수 | templates/prokit-next-supabase/files/skills.manifest.json optional.ops | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `optional.ops.skillsCode.shared` | `vercel-optimize` | ops 묶음에서 두 템플릿이 함께 가진 스킬(스킬마다 백틱) | templates/*/files/skills.manifest.json optional.ops | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `optional.ops.skillsCode.neonOnly` | `neon-functions`, `neon-object-storage`, `neon-ai-gateway` | ops 묶음에서 neon 템플릿만 가진 스킬(스킬마다 백틱) | templates/prokit-next-neon/files/skills.manifest.json optional.ops | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `optional.motion.skillsCode.neon` | `vercel-react-view-transitions` | neon 템플릿 motion 묶음의 스킬(스킬마다 백틱) | templates/prokit-next-neon/files/skills.manifest.json optional.motion | 정본 파일이 바뀌면 따라 바뀐다 | 0 |
| `optional.motion.count.neon` | 1 | neon 템플릿 motion 묶음의 스킬 수 | templates/prokit-next-neon/files/skills.manifest.json optional.motion | 정본 파일이 바뀌면 따라 바뀐다 | 0 |
| `optional.motion.skillsCode.supabase` | `vercel-react-view-transitions` | supabase 템플릿 motion 묶음의 스킬(스킬마다 백틱) | templates/prokit-next-supabase/files/skills.manifest.json optional.motion | 정본 파일이 바뀌면 따라 바뀐다 | 0 |
| `optional.motion.count.supabase` | 1 | supabase 템플릿 motion 묶음의 스킬 수 | templates/prokit-next-supabase/files/skills.manifest.json optional.motion | 정본 파일이 바뀌면 따라 바뀐다 | 0 |
| `optional.motion.skillsCode.shared` | `vercel-react-view-transitions` | motion 묶음에서 두 템플릿이 함께 가진 스킬(스킬마다 백틱) | templates/*/files/skills.manifest.json optional.motion | 정본 파일이 바뀌면 따라 바뀐다 | 0 |
| `optional.motion.skillsCode` | `vercel-react-view-transitions` | motion 묶음의 스킬(두 템플릿이 같을 때. 스킬마다 백틱) | templates/*/files/skills.manifest.json optional.motion | 정본 파일이 바뀌면 따라 바뀐다 | 5 |
| `optional.mobile.skillsCode.neon` | `vercel-react-native-skills` | neon 템플릿 mobile 묶음의 스킬(스킬마다 백틱) | templates/prokit-next-neon/files/skills.manifest.json optional.mobile | 정본 파일이 바뀌면 따라 바뀐다 | 0 |
| `optional.mobile.count.neon` | 1 | neon 템플릿 mobile 묶음의 스킬 수 | templates/prokit-next-neon/files/skills.manifest.json optional.mobile | 정본 파일이 바뀌면 따라 바뀐다 | 0 |
| `optional.mobile.skillsCode.supabase` | `vercel-react-native-skills` | supabase 템플릿 mobile 묶음의 스킬(스킬마다 백틱) | templates/prokit-next-supabase/files/skills.manifest.json optional.mobile | 정본 파일이 바뀌면 따라 바뀐다 | 0 |
| `optional.mobile.count.supabase` | 1 | supabase 템플릿 mobile 묶음의 스킬 수 | templates/prokit-next-supabase/files/skills.manifest.json optional.mobile | 정본 파일이 바뀌면 따라 바뀐다 | 0 |
| `optional.mobile.skillsCode.shared` | `vercel-react-native-skills` | mobile 묶음에서 두 템플릿이 함께 가진 스킬(스킬마다 백틱) | templates/*/files/skills.manifest.json optional.mobile | 정본 파일이 바뀌면 따라 바뀐다 | 0 |
| `optional.mobile.skillsCode` | `vercel-react-native-skills` | mobile 묶음의 스킬(두 템플릿이 같을 때. 스킬마다 백틱) | templates/*/files/skills.manifest.json optional.mobile | 정본 파일이 바뀌면 따라 바뀐다 | 5 |
| `eval.<스킬>.with` | 6개(`--list`) | 같은 요청 비교: prokit-<스킬> 스킬이 있을 때 체크 항목을 지킨 비율(%는 값 밖) | templates/prokit-next-neon/VERIFICATION.md 스킬 동작 eval 표 | 정본 파일이 바뀌면 따라 바뀐다 | 17 |
| `eval.<스킬>.without` | 6개(`--list`) | 같은 요청 비교: prokit-<스킬> 스킬이 없을 때 체크 항목을 지킨 비율(%는 값 밖) | templates/prokit-next-neon/VERIFICATION.md 스킬 동작 eval 표 | 정본 파일이 바뀌면 따라 바뀐다 | 17 |
| `eval.requests` | 13 | 같은 요청 비교에 쓴 요청 수 | 계산: templates/prokit-next-neon/VERIFICATION.md 스킬 동작 eval 표의 eval 수 합 | 정본 파일이 바뀌면 따라 바뀐다 | 2 |
| `eval.checks` | 52 | 같은 요청 비교의 체크 항목 수 | 계산: templates/prokit-next-neon/VERIFICATION.md 스킬 동작 eval 표의 assertion 수 합 | 정본 파일이 바뀌면 따라 바뀐다 | 2 |
| `eval.designMd.services` | 4 | DESIGN.md 효과를 잰 서비스 수 | templates/prokit-next-neon/VERIFICATION.md DESIGN.md 효과 측정 '추천과 선택' 표의 행 수 | 정본 파일이 바뀌면 따라 바뀐다 | 4 |
| `eval.designMd.palette.with` | 99 | DESIGN.md가 있을 때 목표 팔레트 일치율(%는 값 밖) | 계산: templates/prokit-next-neon/VERIFICATION.md DESIGN.md 효과 측정 결과 표(반올림) | 정본 파일이 바뀌면 따라 바뀐다 | 5 |
| `eval.designMd.palette.without` | 71 | 브랜드 이름과 대표 색만 줬을 때 목표 팔레트 일치율(%는 값 밖) | 계산: templates/prokit-next-neon/VERIFICATION.md DESIGN.md 효과 측정 결과 표(반올림) | 정본 파일이 바뀌면 따라 바뀐다 | 5 |
| `eval.designMd.fontSize.with` | 100 | DESIGN.md가 있을 때 글자 크기 토큰 일치율(%는 값 밖) | 계산: templates/prokit-next-neon/VERIFICATION.md DESIGN.md 효과 측정 결과 표(반올림) | 정본 파일이 바뀌면 따라 바뀐다 | 2 |
| `eval.designMd.fontSize.without` | 77 | 브랜드 이름과 대표 색만 줬을 때 글자 크기 토큰 일치율(%는 값 밖) | 계산: templates/prokit-next-neon/VERIFICATION.md DESIGN.md 효과 측정 결과 표(반올림) | 정본 파일이 바뀌면 따라 바뀐다 | 2 |
| `eval.designMd.secondScreen.with` | 95 | DESIGN.md가 있을 때 두 번째 화면이 첫 화면 색을 따른 비율(%는 값 밖) | 계산: templates/prokit-next-neon/VERIFICATION.md DESIGN.md 효과 측정 결과 표(반올림) | 정본 파일이 바뀌면 따라 바뀐다 | 2 |
| `eval.designMd.secondScreen.without` | 97 | 브랜드 이름과 대표 색만 줬을 때 두 번째 화면이 첫 화면 색을 따른 비율(%는 값 밖) | 계산: templates/prokit-next-neon/VERIFICATION.md DESIGN.md 효과 측정 결과 표(반올림) | 정본 파일이 바뀌면 따라 바뀐다 | 2 |
| `eval.designMd.palette.offTarget` | 29 | 브랜드 이름과 대표 색만 줬을 때 화면에 쓴 색 가운데 목표 밖 색의 비율(%는 값 밖) | 계산: 100 − templates/prokit-next-neon/VERIFICATION.md DESIGN.md 효과 측정 결과 표의 B 팔레트 일치율(반올림) | 정본 파일이 바뀌면 따라 바뀐다 | 1 |
| `handbook.sections.count` | 7 | 문서(handbook) 묶음 수 | handbook/README.md 묶음 표 | 정본 파일이 바뀌면 따라 바뀐다 | 2 |
| `handbook.pages.count` | 33 | 문서 쪽 수(묶음 소개 쪽 빼고) | handbook 묶음 README의 쪽 표 | 정본 파일이 바뀌면 따라 바뀐다 | 2 |
| `b:agent-order-line` | (글 묶음) | 새 프로젝트를 만들 때 "에이전트는 이런 순서로 일해요" 도입 문장(옵션 없이 열었을 때 허락을 묻는다고 알린다). clone-create-prompt 묶음이 품는다 | docs/blocks/agent-order-line.md | 묶음 원본을 고친다 | 3 |
| `b:clone-auth-feature-note` | (글 묶음) | 클론 튜토리얼 5장의 첫 NOTE(5장부터 기능을 하나씩 만든다) | docs/blocks/clone-auth-feature-note.md | 묶음 원본을 고친다 | 2 |
| `b:clone-auth-open` | (글 묶음) | 클론 튜토리얼 5장의 1단계 첫 문단(4장 대화창을 그대로 써도 된다) | docs/blocks/clone-auth-open.md | 묶음 원본을 고친다 | 2 |
| `b:clone-auth-qa` | (글 묶음) | 클론 튜토리얼 5장의 "에이전트가 물어보면" 첫 문단과 질문 표, 디자인 점수 안내 | docs/blocks/clone-auth-qa.md | 묶음 원본을 고친다 | 2 |
| `b:clone-auth-resume` | (글 묶음) | 클론 튜토리얼 5장의 1단계 명령 아래 문단(하던 일을 이어 가고 DB 앱을 켠다) | docs/blocks/clone-auth-resume.md | 묶음 원본을 고친다 | 2 |
| `b:clone-auth-steps-review` | (글 묶음) | 클론 튜토리얼 5장의 에이전트 순서 목록의 5·6번(리뷰, 개발 서버와 써 볼 순서). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-auth-steps-review.md | 묶음 원본을 고친다 | 2 |
| `b:clone-auth-trouble-prev` | (글 묶음) | 클론 튜토리얼 5장의 "막히면"의 앞 장 작업을 이어서 하려 할 때 줄. 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-auth-trouble-prev.md | 묶음 원본을 고친다 | 2 |
| `b:clone-check-feedback-round` | (글 묶음) | 클론 튜토리얼 11장의 3단계 고칠 곳 프롬프트 아래 문단(라운드 하나로 고친다) | docs/blocks/clone-check-feedback-round.md | 묶음 원본을 고친다 | 2 |
| `b:clone-check-feedback` | (글 묶음) | 클론 튜토리얼 11장의 3단계 고칠 곳을 말하는 법 문단 | docs/blocks/clone-check-feedback.md | 묶음 원본을 고친다 | 2 |
| `b:clone-check-fix` | (글 묶음) | 클론 튜토리얼 11장의 1단계 성공 기준과 문제 고치기 프롬프트 | docs/blocks/clone-check-fix.md | 묶음 원본을 고친다 | 2 |
| `b:clone-check-intro` | (글 묶음) | 클론 튜토리얼 11장의 "이번 장에서 할 일" 문단 | docs/blocks/clone-check-intro.md | 묶음 원본을 고친다 | 2 |
| `b:clone-check-last-tip` | (글 묶음) | 클론 튜토리얼 11장의 끝 TIP(배포하지 않으면 마지막 장이다) | docs/blocks/clone-check-last-tip.md | 묶음 원본을 고친다 | 2 |
| `b:clone-check-qa` | (글 묶음) | 클론 튜토리얼 11장의 "에이전트가 물어보면" 절(고치는 요청도 라운드 하나로 진행, 선택지 안내, 질문 표, 다음 장 링크). 6~10장의 같은 자리 첫 문단은 feature-round-outro. 인자: auth(5장 파일 이름) | docs/blocks/clone-check-qa.md | 묶음 원본을 고친다 | 2 |
| `b:clone-check-review` | (글 묶음) | 클론 튜토리얼 11장의 2단계 디자인 리뷰(프롬프트, 순서, TIP, 성공 기준) | docs/blocks/clone-check-review.md | 묶음 원본을 고친다 | 2 |
| `b:clone-check-row-code` | (글 묶음) | 클론 튜토리얼 11장의 1단계 검사 표의 코드 검사 행. 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-check-row-code.md | 묶음 원본을 고친다 | 2 |
| `b:clone-check-rows-screen` | (글 묶음) | 클론 튜토리얼 11장의 1단계 검사 표의 화면, 링크와 버튼 행. 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-check-rows-screen.md | 묶음 원본을 고친다 | 2 |
| `b:clone-check-start` | (글 묶음) | 클론 튜토리얼 11장의 1단계 첫 문단(10장의 확인을 마친 에이전트에 보낸다) | docs/blocks/clone-check-start.md | 묶음 원본을 고친다 | 2 |
| `b:clone-check-trouble-mobile` | (글 묶음) | 클론 튜토리얼 11장의 3단계 "막히면"의 휴대폰 크기 줄. 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-check-trouble-mobile.md | 묶음 원본을 고친다 | 2 |
| `b:clone-check-trouble-score` | (글 묶음) | 클론 튜토리얼 11장의 2단계 "막히면"의 점수 기준 줄. 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-check-trouble-score.md | 묶음 원본을 고친다 | 2 |
| `b:clone-check-trouble-slow` | (글 묶음) | 클론 튜토리얼 11장의 2단계 "막히면"의 오래 걸릴 때 줄. 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-check-trouble-slow.md | 묶음 원본을 고친다 | 2 |
| `b:clone-check-trouble-stale` | (글 묶음) | 클론 튜토리얼 11장의 3단계 "막히면"의 첫 줄(고쳤다는데 화면이 그대로일 때). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-check-trouble-stale.md | 묶음 원본을 고친다 | 2 |
| `b:clone-check-trouble-verify` | (글 묶음) | 클론 튜토리얼 11장의 1단계 "막히면"의 검사·테스트·화면 실패 세 줄. 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-check-trouble-verify.md | 묶음 원본을 고친다 | 2 |
| `b:clone-check-try` | (글 묶음) | 클론 튜토리얼 11장의 3단계 직접 써 보기의 프롬프트와 둘러보는 법 | docs/blocks/clone-check-try.md | 묶음 원본을 고친다 | 2 |
| `b:clone-cost-row` | (글 묶음) | 클론 튜토리얼 README "단계별 예상" 표의 한 행. 어림값은 과정마다 따로 정하므로 인자로 받고, 두 과정에서 값이 같은 행만 이 꼴로 지킨다. 인자: stage(장), time(시간 값 키. 두 과정이 같은 장은 cost.stage.*), usd(API 요금 환산 달러. 토큰과 캐시 포함 토큰은 이 값으로 계산한다), note(근거). 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-cost-row.md | 묶음 원본을 고친다 | 8 |
| `b:clone-create-easy-note` | (글 묶음) | 클론 튜토리얼 1장의 첫 NOTE(가장 쉬운 방법으로 시작했으면 5장으로 간다). 인자: auth(5장 파일 이름) | docs/blocks/clone-create-easy-note.md | 묶음 원본을 고친다 | 2 |
| `b:clone-create-hooks` | (글 묶음) | 클론 튜토리얼 1장의 2단계 명령 아래 문단(디자인 검사기 훅, 폴더 믿기, Codex의 /hooks) | docs/blocks/clone-create-hooks.md | 묶음 원본을 고친다 | 2 |
| `b:clone-create-intro` | (글 묶음) | 클론 튜토리얼 1장의 "이번 장에서 할 일" 문단(빈 프로젝트를 만든다). 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle) | docs/blocks/clone-create-intro.md | 묶음 원본을 고친다 | 2 |
| `b:clone-create-mockup-prep` | (글 묶음) | 클론 튜토리얼 1장의 3단계(선택) 시안을 그리려면: 그림을 받는 곳과 구성도 안내, 시안을 그릴 때 준비. 인자: pic(그림 이름. "작품 그림" 또는 "그림"), home(3장에서 고르는 화면. "홈 화면" 또는 "홈 화면(소개 쪽)") | docs/blocks/clone-create-mockup-prep.md | 묶음 원본을 고친다 | 2 |
| `b:clone-create-prompt` | (글 묶음) | 클론 튜토리얼 1장의 1단계 프롬프트, 에이전트가 하는 일, 성공 기준, 보고에 나오는 할 일 표. 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle) | docs/blocks/clone-create-prompt.md | 묶음 원본을 고친다 | 2 |
| `b:clone-create-qa` | (글 묶음) | 클론 튜토리얼 1장의 "에이전트가 물어보면" 표와 다음 장 링크 | docs/blocks/clone-create-qa.md | 묶음 원본을 고친다 | 2 |
| `b:clone-create-reopen` | (글 묶음) | 클론 튜토리얼 1장의 2단계 첫 문단(새 프로젝트 폴더에서 에이전트를 다시 연다) | docs/blocks/clone-create-reopen.md | 묶음 원본을 고친다 | 2 |
| `b:clone-create-trouble` | (글 묶음) | 클론 튜토리얼 1장의 1단계 "막히면" 목록. 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle) | docs/blocks/clone-create-trouble.md | 묶음 원본을 고친다 | 2 |
| `b:clone-create-where` | (글 묶음) | 클론 튜토리얼 1장의 1단계 첫 두 문단(pro-kit 폴더에서 연 에이전트에 붙여 넣는다, 프로젝트 폴더 이름). 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle), neun(이름 뒤 조사 "는" 또는 "은") | docs/blocks/clone-create-where.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-develop` | (글 묶음) | 클론 튜토리얼 12장의 6단계 develop 안내와 성공 기준. 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle) | docs/blocks/clone-deploy-develop.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-done` | (글 묶음) | 클론 튜토리얼 12장의 "다 만들었어요" 문단. 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle), reul(이름 뒤 조사 "를" 또는 "을") | docs/blocks/clone-deploy-done.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-finish` | (글 묶음) | 클론 튜토리얼 12장의 6단계 첫 문단(라운드 끝 마무리 고르기와 develop 먼저 보기) | docs/blocks/clone-deploy-finish.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-github` | (글 묶음) | 클론 튜토리얼 12장의 2단계 프로젝트 폴더 이름 안내, GitHub 저장소 프롬프트와 성공 기준. 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle), neun(이름 뒤 조사 "는" 또는 "은") | docs/blocks/clone-deploy-github.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-intro` | (글 묶음) | 클론 튜토리얼 12장의 "이번 장에서 할 일" 첫 문단(배포와 운영 DB). 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle), reul(이름 뒤 조사 "를" 또는 "을") | docs/blocks/clone-deploy-intro.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-neon` | (글 묶음) | 클론 튜토리얼 12장의 3단계 Neon 운영 DB(프롬프트, 하는 일, 성공 기준). 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle) | docs/blocks/clone-deploy-neon.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-note` | (글 묶음) | 클론 튜토리얼 12장의 첫 NOTE(선택 장, 필요한 계정) | docs/blocks/clone-deploy-note.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-origin` | (글 묶음) | 클론 튜토리얼 12장의 2단계 첫 문단(GitHub 저장소와 origin) | docs/blocks/clone-deploy-origin.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-prod-account` | (글 묶음) | 클론 튜토리얼 12장의 5단계 성공 기준 아래 문단(운영 DB의 계정은 따로다) | docs/blocks/clone-deploy-prod-account.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-prod-run` | (글 묶음) | 클론 튜토리얼 12장의 5단계 에이전트 순서 목록의 끝 두 줄(운영 배포, 결과 보고). 인자: n(운영 배포 줄의 번호), next(보고 줄의 번호). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-deploy-prod-run.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-prod-steps` | (글 묶음) | 클론 튜토리얼 12장의 5단계 에이전트 순서 목록의 1~4번(검사, 릴리스, 마이그레이션). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-deploy-prod-steps.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-qa-finish` | (글 묶음) | 클론 튜토리얼 12장의 "에이전트가 물어보면" 표의 라운드 끝 마무리 행. 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-deploy-qa-finish.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-qa-intro` | (글 묶음) | 클론 튜토리얼 12장의 "에이전트가 물어보면" 첫 문단 | docs/blocks/clone-deploy-qa-intro.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-qa-rows` | (글 묶음) | 클론 튜토리얼 12장의 "에이전트가 물어보면" 표의 Vercel·Neon·릴리스·마이그레이션 행. 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-deploy-qa-rows.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-tools` | (글 묶음) | 클론 튜토리얼 12장의 1단계(계정 만들기, 도구와 로그인 확인, 성공 기준) | docs/blocks/clone-deploy-tools.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-trouble-develop` | (글 묶음) | 클론 튜토리얼 12장의 6단계 "막히면" 목록 | docs/blocks/clone-deploy-trouble-develop.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-trouble-github` | (글 묶음) | 클론 튜토리얼 12장의 2단계 "막히면" 목록. 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle) | docs/blocks/clone-deploy-trouble-github.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-trouble-neon` | (글 묶음) | 클론 튜토리얼 12장의 3단계 "막히면" 목록 | docs/blocks/clone-deploy-trouble-neon.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-trouble-prod` | (글 묶음) | 클론 튜토리얼 12장의 5단계 "막히면"의 앞 네 줄. 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-deploy-trouble-prod.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-trouble-rollback` | (글 묶음) | 클론 튜토리얼 12장의 5단계 "막히면"의 되돌리기 줄. 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-deploy-trouble-rollback.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-trouble-tools` | (글 묶음) | 클론 튜토리얼 12장의 1단계 "막히면" 목록 | docs/blocks/clone-deploy-trouble-tools.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-trouble-vercel` | (글 묶음) | 클론 튜토리얼 12장의 4단계 "막히면" 목록 | docs/blocks/clone-deploy-trouble-vercel.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-vercel-check` | (글 묶음) | 클론 튜토리얼 12장의 4단계 에이전트 순서 목록의 4·5번(배포 준비 검사, 첫 배포는 운영). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-deploy-vercel-check.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-vercel-steps` | (글 묶음) | 클론 튜토리얼 12장의 4단계 에이전트 순서 목록의 1·2번(Vercel 연결, Git 자동 배포 끊기). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-deploy-vercel-steps.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-vercel-success` | (글 묶음) | 클론 튜토리얼 12장의 4단계 성공 기준. 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle), ga(이름 뒤 조사 "가" 또는 "이") | docs/blocks/clone-deploy-vercel-success.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-vercel` | (글 묶음) | 클론 튜토리얼 12장의 4단계 첫 문단(Vercel 프로젝트를 연결해 배포 준비를 마친다) | docs/blocks/clone-deploy-vercel.md | 묶음 원본을 고친다 | 2 |
| `b:clone-deploy-who-rows` | (글 묶음) | 클론 튜토리얼 12장의 누가 할 일 표의 나(브라우저·터미널·대화창) 행. 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-deploy-who-rows.md | 묶음 원본을 고친다 | 2 |
| `b:clone-design-check-step` | (글 묶음) | 클론 튜토리얼 3장의 DESIGN.md를 받고 고치는 순서의 3번 줄(명세 검사). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-design-check-step.md | 묶음 원본을 고친다 | 2 |
| `b:clone-design-fetch-step` | (글 묶음) | 클론 튜토리얼 3장의 DESIGN.md를 받고 고치는 순서의 1번 줄(Refero 페이지에서 받기). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-design-fetch-step.md | 묶음 원본을 고친다 | 2 |
| `b:clone-design-mockup-tip` | (글 묶음) | 클론 튜토리얼 3장의 첫 TIP(시안을 그리고 싶을 때 준비) | docs/blocks/clone-design-mockup-tip.md | 묶음 원본을 고친다 | 2 |
| `b:clone-design-next` | (글 묶음) | 클론 튜토리얼 3장의 2단계 끝 문단(4장 프롬프트로 이어 간다) | docs/blocks/clone-design-next.md | 묶음 원본을 고친다 | 2 |
| `b:clone-design-pick` | (글 묶음) | 클론 튜토리얼 3장의 2단계 고르기 페이지 설명과 NOTE | docs/blocks/clone-design-pick.md | 묶음 원본을 고친다 | 2 |
| `b:clone-design-prompt` | (글 묶음) | 클론 튜토리얼 3장의 1단계 프롬프트와 시안으로 바꾸는 법 | docs/blocks/clone-design-prompt.md | 묶음 원본을 고친다 | 2 |
| `b:clone-design-qa` | (글 묶음) | 클론 튜토리얼 3장의 "에이전트가 물어보면" 표와 다음 장 링크 | docs/blocks/clone-design-qa.md | 묶음 원본을 고친다 | 2 |
| `b:clone-design-restyle-tip` | (글 묶음) | 클론 튜토리얼 3장의 다른 스타일로 바꾸는 TIP | docs/blocks/clone-design-restyle-tip.md | 묶음 원본을 고친다 | 2 |
| `b:clone-design-success-pick` | (글 묶음) | 클론 튜토리얼 3장의 2단계 성공 기준의 끝 줄(고른 구성을 기록한다). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-design-success-pick.md | 묶음 원본을 고친다 | 2 |
| `b:clone-design-trouble-fetch` | (글 묶음) | 클론 튜토리얼 3장의 1단계 "막히면"의 첫 줄(DESIGN.md를 받지 못했을 때). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-design-trouble-fetch.md | 묶음 원본을 고친다 | 2 |
| `b:clone-design-trouble-leftover` | (글 묶음) | 클론 튜토리얼 3장의 1단계 "막히면"의 원래 이름·색이 남았을 때와 스타일 후보를 다시 보여 줄 때 두 줄. 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-design-trouble-leftover.md | 묶음 원본을 고친다 | 2 |
| `b:clone-design-trouble-pick` | (글 묶음) | 클론 튜토리얼 3장의 2단계 "막히면" 목록 | docs/blocks/clone-design-trouble-pick.md | 묶음 원본을 고친다 | 2 |
| `b:clone-plan-confirm` | (글 묶음) | 클론 튜토리얼 2장의 2단계 첫 문단과 프롬프트(질문에 답하고 확정한다) | docs/blocks/clone-plan-confirm.md | 묶음 원본을 고친다 | 2 |
| `b:clone-plan-intro` | (글 묶음) | 클론 튜토리얼 2장의 "이번 장에서 할 일" 문단(프리셋 팩으로 기획 문서를 채운다) | docs/blocks/clone-plan-intro.md | 묶음 원본을 고친다 | 2 |
| `b:clone-plan-qa` | (글 묶음) | 클론 튜토리얼 2장의 "에이전트가 물어보면" 표와 다음 장 링크 | docs/blocks/clone-plan-qa.md | 묶음 원본을 고친다 | 2 |
| `b:clone-plan-reads` | (글 묶음) | 클론 튜토리얼 2장의 1단계 프롬프트 아래 문단(에이전트가 팩을 읽고 질문을 한 번에 보낸다) | docs/blocks/clone-plan-reads.md | 묶음 원본을 고친다 | 2 |
| `b:clone-plan-rename-tip` | (글 묶음) | 클론 튜토리얼 2장의 이름 바꾸기 TIP의 뒷부분(팩 파일은 고치지 않는다). 인용 상자 중간이라 묶음 표시를 달면 인용 상자가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-plan-rename-tip.md | 묶음 원본을 고친다 | 2 |
| `b:clone-plan-start` | (글 묶음) | 클론 튜토리얼 2장의 1단계 첫 문단(1장의 새 프로젝트 폴더에서 연 에이전트에 보낸다, 서비스 이름). 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle), neun(이름 뒤 조사 "는" 또는 "은") | docs/blocks/clone-plan-start.md | 묶음 원본을 고친다 | 2 |
| `b:clone-plan-success-sitemap` | (글 묶음) | 클론 튜토리얼 2장의 2단계 성공 기준의 끝 줄(사이트맵 확정). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-plan-success-sitemap.md | 묶음 원본을 고친다 | 2 |
| `b:clone-plan-trouble-answer` | (글 묶음) | 클론 튜토리얼 2장의 "막히면"의 끝 줄(답을 잘못 보냈을 때). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-plan-trouble-answer.md | 묶음 원본을 고친다 | 2 |
| `b:clone-plan-trouble-early` | (글 묶음) | 클론 튜토리얼 2장의 "막히면"의 화면이나 디자인 후보 찾기를 먼저 시작할 때, 문서에 팩의 서비스 이름이 남았을 때 세 줄. 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle), ga(이름 뒤 조사 "가" 또는 "이"). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-plan-trouble-early.md | 묶음 원본을 고친다 | 2 |
| `b:clone-readme-chapter-rows-end` | (글 묶음) | 클론 튜토리얼 README의 장 표의 11·12장 행. 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-readme-chapter-rows-end.md | 묶음 원본을 고친다 | 2 |
| `b:clone-readme-chapter-rows-start` | (글 묶음) | 클론 튜토리얼 README의 장 표의 1~3장 행. 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-readme-chapter-rows-start.md | 묶음 원본을 고친다 | 2 |
| `b:clone-readme-chapters-intro` | (글 묶음) | 클론 튜토리얼 README의 "장별로 따라 하기" 첫 문단 | docs/blocks/clone-readme-chapters-intro.md | 묶음 원본을 고친다 | 2 |
| `b:clone-readme-continue` | (글 묶음) | 클론 튜토리얼 README의 "답하며 4장까지 가기" 끝 문단(5장부터 이어 가기). 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle), auth(5장 파일 이름) | docs/blocks/clone-readme-continue.md | 묶음 원본을 고친다 | 2 |
| `b:clone-readme-cost-basis` | (글 묶음) | 클론 튜토리얼 README의 "단계별 예상" 표 아래 문단(단위값으로 어림한 값) | docs/blocks/clone-readme-cost-basis.md | 묶음 원본을 고친다 | 2 |
| `b:clone-readme-db-note` | (글 묶음) | 클론 튜토리얼 README의 1단계 NOTE(5장부터 DB를 쓴다) | docs/blocks/clone-readme-db-note.md | 묶음 원본을 고친다 | 2 |
| `b:clone-readme-first-steps` | (글 묶음) | 클론 튜토리얼 README의 프롬프트 뒤 "에이전트는 먼저 이런 일을 해요" 목록의 앞 네 줄(pro-kit과 팩 받기, 준비물, 빈 프로젝트, DB). 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle), reul(이름 뒤 조사 "를" 또는 "을"). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-readme-first-steps.md | 묶음 원본을 고친다 | 2 |
| `b:clone-readme-image-tip` | (글 묶음) | 클론 튜토리얼 README의 1단계 그림 TIP(그림은 팩에서 받고 화면 구성은 구성도로 고른다, 시안을 그릴 때 준비). 인자: pic(그림 이름. "작품 그림" 또는 "그림") | docs/blocks/clone-readme-image-tip.md | 묶음 원본을 고친다 | 2 |
| `b:clone-readme-one-prompt` | (글 묶음) | 클론 튜토리얼 README의 "가장 쉬운 방법" 첫 문단(프롬프트 하나로 4장까지) | docs/blocks/clone-readme-one-prompt.md | 묶음 원본을 고친다 | 2 |
| `b:clone-readme-pack` | (글 묶음) | 클론 튜토리얼 README의 첫 문단의 프리셋 팩 설명. 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle) | docs/blocks/clone-readme-pack.md | 묶음 원본을 고친다 | 2 |
| `b:clone-readme-paste` | (글 묶음) | 클론 튜토리얼 README의 2단계 프롬프트 앞 문단(붙여 넣고 [ ] 안 두 곳을 바꾼다, 폴더 이름과 서비스 이름, 프리셋 팩 받는 곳). 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle), neun(이름 뒤 조사 "는" 또는 "은") | docs/blocks/clone-readme-paste.md | 묶음 원본을 고친다 | 2 |
| `b:clone-readme-prep-note` | (글 묶음) | 클론 튜토리얼 README "만든 사람이 실제로 쓴 값" 표 아래 문단(조사와 프리셋 팩 만들기 행의 뜻과 달러 어림). 값은 doc-values.json presets.<이름>.prep | docs/blocks/clone-readme-prep-note.md | 묶음 원본을 고친다 | 2 |
| `b:clone-readme-qa-intro` | (글 묶음) | 클론 튜토리얼 README의 "답하며 4장까지 가기" 첫 문단. 인자: auth(5장 파일 이름) | docs/blocks/clone-readme-qa-intro.md | 묶음 원본을 고친다 | 2 |
| `b:clone-readme-qa-rows` | (글 묶음) | 클론 튜토리얼 README의 "답하며 4장까지 가기" 표의 앞 행. 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-readme-qa-rows.md | 묶음 원본을 고친다 | 2 |
| `b:clone-readme-qa-tail` | (글 묶음) | 클론 튜토리얼 README의 "답하며 4장까지 가기" 표의 끝 두 행(스킬 업데이트, 결과 확인). 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-readme-qa-tail.md | 묶음 원본을 고친다 | 2 |
| `b:clone-readme-stage-note` | (글 묶음) | 클론 튜토리얼 README "단계별 예상" 표 위 안내(칸은 최솟값) | docs/blocks/clone-readme-stage-note.md | 묶음 원본을 고친다 | 2 |
| `b:clone-readme-workfolder` | (글 묶음) | 클론 튜토리얼 README의 1단계 작업 폴더 문단과 폴더 표. 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle) | docs/blocks/clone-readme-workfolder.md | 묶음 원본을 고친다 | 2 |
| `b:clone-screens-confirmed` | (글 묶음) | 클론 튜토리얼 4장의 확인한 뒤 문단(라운드가 닫히고 커밋한다) | docs/blocks/clone-screens-confirmed.md | 묶음 원본을 고친다 | 2 |
| `b:clone-screens-preset-site` | (글 묶음) | 클론 튜토리얼 4장의 "이번 장에서 할 일"의 프리셋 사이트 문단. 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle) | docs/blocks/clone-screens-preset-site.md | 묶음 원본을 고친다 | 2 |
| `b:clone-screens-review` | (글 묶음) | 클론 튜토리얼 4장의 2단계 첫 문단(다 만들면 확인을 요청한다) | docs/blocks/clone-screens-review.md | 묶음 원본을 고친다 | 2 |
| `b:clone-screens-steps-check` | (글 묶음) | 클론 튜토리얼 4장의 1단계 에이전트가 하는 일 목록의 끝 두 줄(화면 확인과 디자인 리뷰). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-screens-steps-check.md | 묶음 원본을 고친다 | 2 |
| `b:clone-screens-steps-copy` | (글 묶음) | 클론 튜토리얼 4장의 1단계 에이전트가 하는 일 목록의 첫 두 줄(팩의 데이터와 그림 복사). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-screens-steps-copy.md | 묶음 원본을 고친다 | 2 |
| `b:clone-screens-trouble-images` | (글 묶음) | 클론 튜토리얼 4장의 "막히면"의 첫 줄(그림을 못 찾을 때). 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-screens-trouble-images.md | 묶음 원본을 고친다 | 2 |
| `b:clone-screens-trouble-rename` | (글 묶음) | 클론 튜토리얼 4장의 "막히면" 끝 줄(이름을 바꿨는데 화면에 팩의 서비스 이름이 남았을 때). 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle), ga(이름 뒤 조사 "가" 또는 "이"). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/clone-screens-trouble-rename.md | 묶음 원본을 고친다 | 2 |
| `b:codex-hooks-line` | (글 묶음) | 클론 튜토리얼에서 새 프로젝트 폴더를 Codex로 열었을 때 디자인 검사기 훅을 믿는다고 확인하는 안내 줄 | docs/blocks/codex-hooks-line.md | 묶음 원본을 고친다 | 4 |
| `b:continue-line` | (글 묶음) | "알려 준 한 줄로 이어 가기"의 명령 블록(묻지 않고 진행하게 여는 명령으로 새 프로젝트 폴더를 연다). 인자: folder(프로젝트 폴더) | docs/blocks/continue-line.md | 묶음 원본을 고친다 | 3 |
| `b:cost-note` | (글 묶음) | 시간과 비용 표 아래의 안내(시간의 앞 숫자와 토큰은 최솟값, 토큰도 늘 수 있다). tutorials/<묶음>/ 쪽에서 쓴다 | docs/blocks/cost-note.md | 묶음 원본을 고친다 | 12 |
| `b:course-trouble` | (글 묶음) | 클론 튜토리얼 README(tutorials/01-nextflix, 02-claudle)의 "막히면" 목록 전체(첫 프롬프트 공통 줄, 프리셋 팩, Docker, 한도). 목록이 끊기지 않게 목록 전체를 묶는다. 인자: folder와 name(둘 다 프로젝트 이름. 포함한 first-trouble은 folder, trouble-pack은 name을 쓴다), iyo(이름 뒤 "예요" 또는 "이에요") | docs/blocks/course-trouble.md | 묶음 원본을 고친다 | 2 |
| `b:design-md-effect-chart` | (글 묶음) | handbook/design/design-md.md "효과"의 막대그래프(mermaid xychart). 팔레트 일치·글자 크기 일치·두 번째 화면 색 일관성 막대는 아래 표와 같이 eval.designMd.*(neon VERIFICATION.md DESIGN.md 효과 측정 결과 표에서 읽는 값)를 쓴다. 반경 일치 막대는 이 그래프에만 있고, 블라인드 종합 승률은 표의 종합 승수를 평가 횟수로 나눈 %다 | docs/blocks/design-md-effect-chart.md | 묶음 원본을 고친다 | 1 |
| `b:env-vscode-steps` | (글 묶음) | `.env` 파일을 VS Code로 만드는 번호 목록의 1~2번(작업 폴더 열기, 새 파일 만들기). tutorials/reference/costs-and-keys.md(이미지 키)와 deploy.md(배포 토큰)가 쓴다. 3번이 쪽마다 달라 번호 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/env-vscode-steps.md | 묶음 원본을 고친다 | 2 |
| `b:env-vscode-tip` | (글 묶음) | `.env` 파일을 VS Code로 만드는 1~2번을 에이전트에게 부탁해도 된다는 TIP. tutorials/reference/costs-and-keys.md(이미지 키)와 deploy.md(배포 토큰)가 쓴다. 인자: what(붙여 넣을 것. 조사까지 "키를" 또는 "토큰을") | docs/blocks/env-vscode-tip.md | 묶음 원본을 고친다 | 2 |
| `b:exit-line` | (글 묶음) | "3. 알려 준 한 줄로 이어 가기"의 첫 문단(에이전트를 닫고 알려 준 한 줄을 터미널에 붙여 넣는다). 바로 뒤에 continue-line 묶음이 온다 | docs/blocks/exit-line.md | 묶음 원본을 고친다 | 3 |
| `b:feature-round-intro` | (글 묶음) | 클론 튜토리얼 기능 장(6~10장) 도입의 프리셋 팩 설명 문단(바로 뒤에 "1. 스펙" 목록이 온다) | docs/blocks/feature-round-intro.md | 묶음 원본을 고친다 | 3 |
| `b:feature-round-outro` | (글 묶음) | 클론 튜토리얼 기능 장(6~10장) "에이전트가 물어보면" 첫 문단(5장처럼 라운드 하나로 진행, 질문 표 안내, 선택지 창 안내). 11장의 같은 자리는 clone-check-qa가 품는다. 인자: auth(5장 파일 이름). 앞 장 질문 표는 trouble-prev-chapter, 질문 행은 qa-row-spec | docs/blocks/feature-round-outro.md | 묶음 원본을 고친다 | 10 |
| `b:feature-round-review` | (글 묶음) | 클론 튜토리얼 기능 장(6~10장) 에이전트 순서 목록의 리뷰 뒤 확인 요청 줄. 인자: n(번호 매긴 목록의 번호). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/feature-round-review.md | 묶음 원본을 고친다 | 10 |
| `b:feature-round-spec` | (글 묶음) | 클론 튜토리얼 기능 장(6~10장) 에이전트 순서 목록의 1번 줄(스펙 확인). 목록 한 줄이거나 표 한 행이라 묶음 표시를 달면 목록·표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/feature-round-spec.md | 묶음 원본을 고친다 | 10 |
| `b:first-trouble` | (글 묶음) | 작업 폴더에서 첫 프롬프트를 보낸 뒤 "막히면"의 공통 줄(비밀번호, git 설치 창, 이미 있는 폴더, 옛 pro-kit, 이어 갈 한 줄). 인자: folder(프로젝트 폴더) | docs/blocks/first-trouble.md | 묶음 원본을 고친다 | 3 |
| `b:install-claude` | (글 묶음) | Claude Code 설치 명령 블록 | docs/blocks/install-claude.md | 묶음 원본을 고친다 | 1 |
| `b:install-codex` | (글 묶음) | Codex 설치 명령 블록. 이미지 그리기 준비(Claude Code가 Codex CLI를 쓸 때)에서도 쓴다 | docs/blocks/install-codex.md | 묶음 원본을 고친다 | 2 |
| `b:limit-line` | (글 묶음) | 프리셋 쪽 "시간과 비용"의 구독 한도 줄(프리셋 팩으로 만들 때). tutorials/samples/ 쪽에서 쓴다. 인자: name(프리셋 이름) | docs/blocks/limit-line.md | 묶음 원본을 고친다 | 9 |
| `b:open-agent` | (글 묶음) | 에이전트를 묻지 않고 진행하게 여는 명령 블록. 인자: cd(첫 줄. 없으면 작업 폴더를 만들고 들어가는 줄). 다른 에이전트의 옵션은 tutorials/reference/claude-code-and-codex.md | docs/blocks/open-agent.md | 묶음 원본을 고친다 | 11 |
| `b:open-already-line` | (글 묶음) | 클론 튜토리얼 README(01-nextflix, 02-claudle)와 컨셉으로 화면 만들기 README(samples)의 "1. 작업 폴더에서 에이전트 열기" 첫 문단 | docs/blocks/open-already-line.md | 묶음 원본을 고친다 | 3 |
| `b:open-in-kit` | (글 묶음) | handbook 시작 쪽 pro-kit 폴더에서 에이전트를 여는 명령 블록(요청 없이 여는 명령은 `agent.<이름>.start`) | docs/blocks/open-in-kit.md | 묶음 원본을 고친다 | 1 |
| `b:open-in-project` | (글 묶음) | handbook 시작 쪽 새 프로젝트 폴더에서 화면 디자인 검사를 켜고 에이전트를 여는 명령 블록(요청 없이 여는 명령은 `agent.<이름>.start`) | docs/blocks/open-in-project.md | 묶음 원본을 고친다 | 1 |
| `b:open-new-folder` | (글 묶음) | "3. 알려 준 한 줄로 이어 가기" 뒤의 새 프로젝트 폴더 안내 문단. 인자: extra("켜져요." 뒤에 끼우는 문장. 끝에 띄어쓰기를 둔다. 없으면 끼우지 않는다) | docs/blocks/open-new-folder.md | 묶음 원본을 고친다 | 3 |
| `b:open-with-hooks` | (글 묶음) | 클론 튜토리얼 1장의 "새 폴더에서 에이전트 열기" 명령 블록(디자인 검사기 훅을 켜고 묻지 않고 진행하게 연다). 인자: folder(프로젝트 폴더) | docs/blocks/open-with-hooks.md | 묶음 원본을 고친다 | 2 |
| `b:preset-actual-line` | (글 묶음) | 프리셋 쪽 "만든 사람이 실제로 쓴 값"의 문단(프리셋을 만들 때 든 시간과 토큰). 값은 doc-values.json presets.<이름>.actual.total(토큰과 캐시 포함은 달러에서 계산). tutorials/samples/ 쪽에서 올곧(olgot)을 뺀 프리셋이 쓴다. 인자: name(프리셋 이름) | docs/blocks/preset-actual-line.md | 묶음 원본을 고친다 | 8 |
| `b:preset-cost-detail` | (글 묶음) | 프리셋 쪽 "단계별 예상" 표 아래의 두 문단(나만의 서비스로 바꿀 때 더 드는 값, 어림의 근거) | docs/blocks/preset-cost-detail.md | 묶음 원본을 고친다 | 9 |
| `b:preset-next-steps` | (글 묶음) | 프리셋 쪽 프롬프트 아래의 다음 할 일 안내(tutorials/samples/README.md의 1·3·4단계로 보낸다) | docs/blocks/preset-next-steps.md | 묶음 원본을 고친다 | 18 |
| `b:preset-pack-get` | (글 묶음) | 프리셋 팩을 쓰는 프롬프트의 팩 받기 줄(다음 줄이 "그 팩…"으로 할 일을 잇는다). preset-pack, preset-remix가 품고, 클론 튜토리얼 README 첫 프롬프트는 표시 없이 같은 글로 둔다(CASES). AGENTS.md의 팩 받기 규칙은 이 줄의 packs/<이름>으로 팩을 알아본다. 인자: name(팩 이름) | docs/blocks/preset-pack-get.md | 묶음 원본을 고친다 | 20 |
| `b:preset-pack-source` | (글 묶음) | 프리셋 팩 받는 곳 상자(첫 줄: 프롬프트만 보내면 에이전트가 자동으로 받아 설치한다. 둘째 문단: 직접 받기 zip 링크와 크기, 직접 받았으면 경로 한 줄). 문단 하나로 따로 둔다(preset-pack은 프롬프트 뒤, clone-readme-paste는 프롬프트 앞). 받는 곳 안내는 이 묶음 하나뿐이라, 홈페이지가 다른 곳(예: 자체 저장소)으로 알리려면 이 상자의 링크와 문장을 바꿔 그린다. 인자: name(팩 이름) | docs/blocks/preset-pack-source.md | 묶음 원본을 고친다 | 11 |
| `b:preset-pack` | (글 묶음) | 프리셋 쪽 "프리셋 팩으로 만들어 보기"의 설명, 프롬프트, 팩 안내. 인자: name(프리셋 이름). 서비스 이름은 preset.<name>.title 값 | docs/blocks/preset-pack.md | 묶음 원본을 고친다 | 9 |
| `b:preset-real-service` | (글 묶음) | 프리셋 쪽 "실제 서비스로 만들 때" 첫 문단의 끝 문장(바꾸는 순서와 기능 요청). 인자: tail(뒤에 붙는 말. 앞에 띄어쓰기를 둔다. 없으면 붙이지 않는다) | docs/blocks/preset-real-service.md | 묶음 원본을 고친다 | 9 |
| `b:preset-remix` | (글 묶음) | 프리셋 쪽 "프리셋 팩으로 나만의 서비스 만들기"의 설명, 프롬프트, 바꿀 것 예시. 인자: name(프리셋 이름), folder·title·changes(예시의 프로젝트 폴더, 새 이름, 바꿀 것), topic(바꿀 것 예시의 주제) | docs/blocks/preset-remix.md | 묶음 원본을 고친다 | 9 |
| `b:preset-scratch-intro` | (글 묶음) | 프리셋 쪽 "이 컨셉으로 처음부터 만들기"의 첫 문단. 뒤에 screen-prompt 묶음이 온다 | docs/blocks/preset-scratch-intro.md | 묶음 원본을 고친다 | 9 |
| `b:preset-scratch-note` | (글 묶음) | 프리셋 쪽 "이 컨셉으로 처음부터 만들기"의 프롬프트 아래 안내 | docs/blocks/preset-scratch-note.md | 묶음 원본을 고친다 | 9 |
| `b:preset-stage-intro` | (글 묶음) | 프리셋 쪽 "단계별 예상" 표 위 안내(칸은 최솟값, 합계의 시간만 범위). tutorials/samples/ 쪽에서 쓴다 | docs/blocks/preset-stage-intro.md | 묶음 원본을 고친다 | 9 |
| `b:preset-time-line` | (글 묶음) | 프리셋 쪽 "시간과 비용"의 첫 문단(프리셋 팩으로 만들 때와 처음부터 만들 때의 시간 범위와 최소 토큰). tutorials/samples/ 쪽에서 올곧(olgot)을 뺀 프리셋이 쓴다. 인자: name(프리셋 이름) | docs/blocks/preset-time-line.md | 묶음 원본을 고친다 | 8 |
| `b:process-flow-diagram` | (글 묶음) | tutorials/reference/process-and-time.md "시작하는 방법 세 가지"의 흐름도(mermaid). 세 시작점(레퍼런스 리서치, 프리셋 팩, 내 컨셉)이 한 흐름의 어디로 들어가는지 보인다. 단계 이름은 README "프로킷은 이렇게 일합니다"와 홈페이지 워크플로우에 맞춘다 | docs/blocks/process-flow-diagram.md | 묶음 원본을 고친다 | 1 |
| `b:process-gantt-claudle` | (글 묶음) | tutorials/reference/process-and-time.md "예시로 보는 시간"의 Claudle 풀 사이클 gantt(가로축은 시작부터 걸린 시간). 막대 길이는 preset.claudle.prep.*·actual.*의 .min(분). 라운드 사이에 사람을 기다린 시간은 빼고 이어 그린다 | docs/blocks/process-gantt-claudle.md | 묶음 원본을 고친다 | 1 |
| `b:process-pie` | (글 묶음) | tutorials/reference/process-and-time.md "시간이 어디에 쓰이나요"의 원그래프(mermaid pie, 단위 분). 값은 doc-values.json process.pie(메인 에이전트가 일한 시간을 도구 종류로 나눈 실측). 인자: name(claudle·olgot), title(그래프 제목. 숫자를 넣지 않는다) | docs/blocks/process-pie.md | 묶음 원본을 고친다 | 2 |
| `b:project-structure-tree` | (글 묶음) | handbook/reference/project-structure.md "폴더 한눈에 보기"의 폴더 트리. 스킬 수는 값으로 채운다 | docs/blocks/project-structure-tree.md | 묶음 원본을 고친다 | 1 |
| `b:prompt-varies-line` | (글 묶음) | "같은 프롬프트라도 결과는 매번 달라요" 안내 줄. 클론 튜토리얼 README(01-nextflix, 02-claudle)와 tutorials/samples/README.md가 쓴다. 목록 한 줄이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/prompt-varies-line.md | 묶음 원본을 고친다 | 3 |
| `b:qa-row-color` | (글 묶음) | 튜토리얼 "에이전트가 물어보면" 표의 대표 색 행(3장 표와 클론 튜토리얼 README "답하며 4장까지 가기" 표). clone-design-qa, clone-readme-qa-rows 묶음이 품는다. 목록 한 줄이거나 표 한 행이라 묶음 표시를 달면 목록·표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/qa-row-color.md | 묶음 원본을 고친다 | 4 |
| `b:qa-row-confirm` | (글 묶음) | 튜토리얼 README "답하며 4장까지 가기" 표의 결과 확인 행. clone-readme-qa-tail 묶음이 품는다. 목록 한 줄이거나 표 한 행이라 묶음 표시를 달면 목록·표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/qa-row-confirm.md | 묶음 원본을 고친다 | 3 |
| `b:qa-row-markdown` | (글 묶음) | Claudle 4장과 README "에이전트가 물어보면" 표의 스트리밍 마크다운 도구 설치 행. 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/qa-row-markdown.md | 묶음 원본을 고친다 | 2 |
| `b:qa-row-plan` | (글 묶음) | 클론 튜토리얼 기능 장(5~10장) "에이전트가 물어보면" 표의 계획 확인 행. clone-auth-qa 묶음이 품는다. 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/qa-row-plan.md | 묶음 원본을 고친다 | 8 |
| `b:qa-row-polish` | (글 묶음) | 튜토리얼 "에이전트가 물어보면" 표의 디자인 점수 질문 행. 목록 한 줄이거나 표 한 행이라 묶음 표시를 달면 목록·표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/qa-row-polish.md | 묶음 원본을 고친다 | 8 |
| `b:qa-row-review` | (글 묶음) | 클론 튜토리얼 4장 "에이전트가 물어보면" 표의 결과 확인 행(알려 준 주소로 둘러본 뒤 확인하거나 고칠 곳을 말한다). 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/qa-row-review.md | 묶음 원본을 고친다 | 2 |
| `b:qa-row-run` | (글 묶음) | 튜토리얼 1장 "에이전트가 물어보면" 표의 명령 허락 행. clone-create-qa 묶음이 품는다. 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/qa-row-run.md | 묶음 원본을 고친다 | 3 |
| `b:qa-row-security` | (글 묶음) | 클론 튜토리얼 기능 장 "에이전트가 물어보면" 표의 보안 리뷰 행. clone-auth-qa 묶음이 품는다. 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/qa-row-security.md | 묶음 원본을 고친다 | 3 |
| `b:qa-row-see` | (글 묶음) | 클론 튜토리얼 "에이전트가 물어보면" 표의 직접 보고 확인하는 행(6장, 11장). clone-check-qa 묶음이 품는다. 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/qa-row-see.md | 묶음 원본을 고친다 | 3 |
| `b:qa-row-spec` | (글 묶음) | 클론 튜토리얼 기능 장(5~10장) "에이전트가 물어보면" 표의 스펙 확인 행. 목록 한 줄이거나 표 한 행이라 묶음 표시를 달면 목록·표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/qa-row-spec.md | 묶음 원본을 고친다 | 11 |
| `b:qa-row-transition` | (글 묶음) | 튜토리얼 화면 만들기 "에이전트가 물어보면" 표의 페이지 전환 도구 설치 행(Nextflix 4장과 README, 컨셉으로 화면 만들기 5장). 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/qa-row-transition.md | 묶음 원본을 고친다 | 3 |
| `b:qa-row-trust` | (글 묶음) | 튜토리얼 1장 "에이전트가 물어보면" 표의 폴더 믿기 행. clone-create-qa 묶음이 품는다. 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/qa-row-trust.md | 묶음 원본을 고친다 | 3 |
| `b:qa-row-wireframe` | (글 묶음) | 튜토리얼 "에이전트가 물어보면" 표의 화면 구성 카드 행. clone-design-qa 묶음이 품는다. 목록 한 줄이거나 표 한 행이라 묶음 표시를 달면 목록·표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/qa-row-wireframe.md | 묶음 원본을 고친다 | 3 |
| `b:revise-flow-gantt` | (글 묶음) | tutorials/reference/process-and-time.md "고쳐 달라고 할 때마다 더 드는 시간"의 올곧 식단표 한 줄 고치기 gantt(가로축은 시작부터 걸린 분). 막대 길이는 cost.revise.flow.oneSpot.*.min, 색이 다른 막대(active)가 모든 페이지 확인이다 | docs/blocks/revise-flow-gantt.md | 묶음 원본을 고친다 | 1 |
| `b:revise-time-detail` | (글 묶음) | 시간 범위를 처음 보여 주는 곳 바로 아래의 펼쳐 보기(고쳐 달라고 할 때마다 더 드는 시간). 접힌 상자 전체를 담는다. 값은 doc-values.json cost.revise(홈페이지는 --json 내보내기로 읽는다), 원문 설명은 tutorials/reference/process-and-time.md "고쳐 달라고 할 때마다 더 드는 시간". tutorials/<묶음>/ 쪽에서 쓴다 | docs/blocks/revise-time-detail.md | 묶음 원본을 고친다 | 12 |
| `b:sample-stage-first` | (글 묶음) | 프리셋 쪽 "단계별 예상" 표의 첫 화면 행. tutorials/samples/ 쪽에서 쓴다. 표 한 행이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/sample-stage-first.md | 묶음 원본을 고친다 | 9 |
| `b:sample-stage-head` | (글 묶음) | 프리셋 쪽 "단계별 예상" 표의 앞쪽 공통 행 4개(준비, 기획, 디자인, 화면 구성). tutorials/samples/ 쪽에서 쓴다. 표 한 행이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/sample-stage-head.md | 묶음 원본을 고친다 | 9 |
| `b:sample-stage-tail` | (글 묶음) | 프리셋 쪽 "단계별 예상" 표의 끝쪽 공통 행 2개(HTML 내보내기, 선택 GitHub Pages 배포). tutorials/samples/ 쪽에서 쓴다. 표 한 행이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/sample-stage-tail.md | 묶음 원본을 고친다 | 9 |
| `b:samples-trouble` | (글 묶음) | tutorials/samples/README.md(컨셉으로 화면 만들기)의 "막히면" 목록 전체. 목록이 끊기지 않게 목록 전체를 묶는다. 첫 줄들은 first-trouble 묶음이다. 인자: folder(프로젝트 폴더) | docs/blocks/samples-trouble.md | 묶음 원본을 고친다 | 1 |
| `b:screen-prompt` | (글 묶음) | 화면만 만드는 첫 프롬프트. 인자: folder(프로젝트 폴더), concept(누가 쓰고 무엇을 하는 서비스), end(마지막 일. 없으면 "HTML 파일로 내보내줘"), ref(서비스 줄 뒤에 붙는 레퍼런스 리서치 문장. 앞에 띄어쓰기를 둔다. 없으면 붙이지 않는다), design(마지막 줄 앞부분의 디자인 지시. 끝에 쉼표와 띄어쓰기를 둔다. 없으면 "디자인 스타일은 서비스에 어울리는 걸로 추천해주고, ". 레퍼런스를 따를 때는 카탈로그 추천과 섞이지 않게 바꾼다) | docs/blocks/screen-prompt.md | 묶음 원본을 고친다 | 12 |
| `b:start-check-prompt` | (글 묶음) | tutorials/start/README.md "pro-kit 받기"의 에이전트에게 부탁하는 첫 프롬프트(준비물 확인과 pro-kit 받기). Node 판은 값으로 채운다 | docs/blocks/start-check-prompt.md | 묶음 원본을 고친다 | 1 |
| `b:tpl-readme-after-install-format` | (글 묶음) | 두 템플릿 README "설치한 뒤" 번호 목록의 2번(포맷 정리와 첫 커밋). 번호 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다. 인자: dir(커밋에 더 넣을 폴더 목록. 쉼표와 띄어쓰기로 끝낸다. 없으면 붙이지 않는다) | docs/blocks/tpl-readme-after-install-format.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-after-install-steps` | (글 묶음) | 두 템플릿 README "설치한 뒤" 번호 목록의 3~7번(새 세션, impeccable 훅, 용어집, 라운드, 첫 화면). 번호 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/tpl-readme-after-install-steps.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-clone` | (글 묶음) | 두 템플릿 README에서 팀원이 프로젝트를 클론했을 때 하는 일 문단. 인자: tail(뒤에 붙는 말. 앞에 띄어쓰기를 둔다. 없으면 붙이지 않는다) | docs/blocks/tpl-readme-clone.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-commands-plugin` | (글 묶음) | 두 템플릿 README 명령 표의 claude plugin update 행(supabase 템플릿은 앞에 supabase 행 둘이 더 있다). 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/tpl-readme-commands-plugin.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-commands` | (글 묶음) | 두 템플릿 README "설치된 프로젝트에서 자주 쓰는 명령" 표의 앞 열두 행(표 머리는 빼고). 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다. 뒤의 행은 템플릿마다 달라 따로 두고, 같은 마지막 행은 `tpl-readme-commands-plugin`이다 | docs/blocks/tpl-readme-commands.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-dev` | (글 묶음) | 두 템플릿 README "템플릿 자체 개발" 절의 목록. 인자: me(이 템플릿 이름), other(다른 템플릿 이름), josa(other 뒤 조사. 와 또는 과) | docs/blocks/tpl-readme-dev.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-install-rows` | (글 묶음) | 두 템플릿 README "설치되는 것" 표에서 프로세스 스킬 행부터 문서 골격 행까지(공식 스킬 행만 템플릿마다 다르다). 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다. 인자: db(neon 또는 supabase. 선택 스킬 행의 ops 묶음 스킬 키) | docs/blocks/tpl-readme-install-rows.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-license` | (글 묶음) | 두 템플릿 README 맨 위의 사용 조건 인용(MIT 라이선스). 템플릿 README는 새 프로젝트에 설치되지 않아 표시를 달 수 있다. 상대 링크는 templates/<이름>/README.md 깊이를 따른다 | docs/blocks/tpl-readme-license.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-options` | (글 묶음) | 두 템플릿 README "옵션" 절의 옵션 목록과 설치기가 덮어쓰지 않는다는 문단. 인자: cli(--with-global이 설치하는 DB CLI 이름. Neon 또는 Supabase) | docs/blocks/tpl-readme-options.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-prereq-node` | (글 묶음) | 두 템플릿 README "준비물" 목록의 Node 줄. 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다. 이 줄의 값 표시는 README에 그대로 둔다(테스트 "Node 판"이 본다) | docs/blocks/tpl-readme-prereq-node.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-prereq-tools` | (글 묶음) | 두 템플릿 README "준비물" 목록의 끝 다섯 줄(Vercel CLI부터 전역에만 설치되는 도구까지). 그 앞의 DB 도구 줄(neon은 Podman과 Neon CLI, supabase는 Supabase CLI와 원격 Supabase 프로젝트)만 템플릿마다 다르다. 인자: cli(전역에만 설치되는 DB CLI. Neon CLI 또는 Supabase CLI), tail(전역 도구 줄 괄호 끝에 붙이는 말. supabase는 Homebrew 안내, 없으면 붙이지 않는다). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/tpl-readme-prereq-tools.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-screen-only` | (글 묶음) | 두 템플릿 README에서 화면만 만들 때 로컬 DB 시작과 첫 마이그레이션을 건너뛴다는 문단 | docs/blocks/tpl-readme-screen-only.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-start-note` | (글 묶음) | 두 템플릿 README "새 프로젝트 시작" 코드 블록 바로 아래 문장(생성기와 스킬은 최신판을 받는다). 다음 줄이 템플릿마다 다른 같은 문단이라 묶음 표시를 달면 문단이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/tpl-readme-start-note.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-update-existing` | (글 묶음) | 두 템플릿 README에서 이미 설치한 프로젝트에 템플릿 갱신을 반영하는 방법 문단 | docs/blocks/tpl-readme-update-existing.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-vercel-deploy` | (글 묶음) | 두 템플릿 README "Vercel 배포" 절의 환경변수 넣기, 배포 검사, 릴리스 문단 셋. 인자: url(DATABASE_URL에 넣는 주소 설명) | docs/blocks/tpl-readme-vercel-deploy.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-vercel-env-files` | (글 묶음) | 두 템플릿 README "Vercel 배포" 절의 .env.development·.env.production 금지 문단과 "처음 한 번" 명령 코드 블록 | docs/blocks/tpl-readme-vercel-env-files.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-vercel-env-rule` | (글 묶음) | 두 템플릿 README "Vercel 배포" 절에서 환경변수 값은 환경마다 한 곳에만 둔다는 문장(아래 표는 템플릿마다 다르다) | docs/blocks/tpl-readme-vercel-env-rule.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-vercel-intro` | (글 묶음) | 두 템플릿 README "Vercel 배포" 절의 첫 문단 | docs/blocks/tpl-readme-vercel-intro.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-vercel-notes` | (글 묶음) | 두 템플릿 README "Vercel 배포" 절 끝의 주의 목록 셋(.vercelignore, Better Auth 주소, 전역 배포 스킬) | docs/blocks/tpl-readme-vercel-notes.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-windows-browser` | (글 묶음) | 두 템플릿 README "Windows" 절 번호 목록의 마지막 줄(브라우저 검증). 번호 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다. 인자: n(번호. neon 4, supabase 5) | docs/blocks/tpl-readme-windows-browser.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-windows-intro` | (글 묶음) | 두 템플릿 README "Windows" 절의 첫 문단. 인자: tail(뒤에 붙는 말. 앞에 띄어쓰기를 둔다. 없으면 붙이지 않는다) | docs/blocks/tpl-readme-windows-intro.md | 묶음 원본을 고친다 | 2 |
| `b:tpl-readme-windows-steps` | (글 묶음) | 두 템플릿 README "Windows" 절 번호 목록의 1~2번(WSL 설치, 도구 설치). 3번부터 템플릿마다 달라 번호 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/tpl-readme-windows-steps.md | 묶음 원본을 고친다 | 2 |
| `b:trouble-db` | (글 묶음) | 클론 튜토리얼 DB를 쓰는 장 "막히면"의 DB 연결 줄. 목록 한 줄이거나 표 한 행이라 묶음 표시를 달면 목록·표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/trouble-db.md | 묶음 원본을 고친다 | 5 |
| `b:trouble-dev-server` | (글 묶음) | 튜토리얼 "막히면"의 화면이 안 열려요 줄(개발 서버를 다시 켜 달라고 한다). 클론 튜토리얼 4장과 tutorials/samples/05-build.md가 쓴다. 목록 한 줄이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/trouble-dev-server.md | 묶음 원본을 고친다 | 3 |
| `b:trouble-docker-skip` | (글 묶음) | 화면만 만드는 프로젝트의 "막히면" Docker 줄. samples-trouble 묶음이 품는다. 목록 한 줄이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/trouble-docker-skip.md | 묶음 원본을 고친다 | 2 |
| `b:trouble-other` | (글 묶음) | 튜토리얼 "막히면" 목록의 맺음 줄. 목록 한 줄이거나 표 한 행이라 묶음 표시를 달면 목록·표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/trouble-other.md | 묶음 원본을 고친다 | 22 |
| `b:trouble-pack` | (글 묶음) | 프리셋 팩을 쓰는 쪽의 "막히면" 줄. 인자: name(팩 이름), lead(답 앞에 붙는 말. 끝에 띄어쓰기를 둔다. 없으면 붙이지 않는다). 목록 한 줄이라 묶음 표시를 달면 목록이 끊기는 곳은 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/trouble-pack.md | 묶음 원본을 고친다 | 18 |
| `b:trouble-password` | (글 묶음) | "막히면"의 비밀번호 줄. first-trouble 묶음 첫 줄로도 들어간다. 목록 한 줄이라 묶음 표시를 달면 목록이 끊기는 곳은 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/trouble-password.md | 묶음 원본을 고친다 | 5 |
| `b:trouble-prev-chapter` | (글 묶음) | 클론 튜토리얼 6~10장 "막히면"의 앞 장 줄(5장의 막히면과 같다고 알린다). 인자: auth(5장 파일 이름). 목록 한 줄이거나 표 한 행이라 묶음 표시를 달면 목록·표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/trouble-prev-chapter.md | 묶음 원본을 고친다 | 9 |
| `b:trouble-prev-short` | (글 묶음) | 클론 튜토리얼 6장과 11장 "막히면"의 앞 장 줄(프리셋 팩 항목이 따로 있어 두 항목만 말한다. 5장의 막히면과 같다고 알린다). 인자: auth(5장 파일 이름). 목록 한 줄이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/trouble-prev-short.md | 묶음 원본을 고친다 | 3 |
| `b:trouble-stop` | (글 묶음) | 클론 튜토리얼 4·5장 "막히면"의 중간에 멈췄어요 줄(한도에 걸렸을 때 이어 가기). 인자: name(프로젝트 이름. nextflix 또는 claudle). 목록 한 줄이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/trouble-stop.md | 묶음 원본을 고친다 | 4 |
| `b:ui-flow-diagram` | (글 묶음) | handbook/design/ui-flow.md 맨 앞 흐름도(mermaid). 화면 점수 기준(audit, 접근성)은 값으로 채운다 | docs/blocks/ui-flow-diagram.md | 묶음 원본을 고친다 | 1 |
| `b:what-it-adds-diagram` | (글 묶음) | handbook/templates/what-it-adds.md "뼈대와 그 위에 더하는 것"의 흐름도(mermaid). 스킬 수와 에이전트 수는 값으로 채운다 | docs/blocks/what-it-adds-diagram.md | 묶음 원본을 고친다 | 1 |
| `b:workfolder-row` | (글 묶음) | 작업 폴더 표("폴더, 무엇이 들어 있나요")의 ~/projects 행. clone-readme-workfolder 묶음이 품는다. 목록 한 줄이거나 표 한 행이라 묶음 표시를 달면 목록·표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 | docs/blocks/workfolder-row.md | 묶음 원본을 고친다 | 3 |
| `b:yolo-option` | (글 묶음) | 묻지 않고 진행하는 옵션(`--dangerously-skip-permissions`, Codex는 `--yolo`) 설명 문단. tutorials/start/README.md, tutorials/samples/README.md, 클론 튜토리얼 README(01-nextflix, 02-claudle)가 쓴다. 인자: tail(끝에 붙는 문장. 앞에 띄어쓰기를 둔다. 기본은 폴더 신뢰 안내, 빈 값이면 붙이지 않는다) | docs/blocks/yolo-option.md | 묶음 원본을 고친다 | 4 |
| `b:yolo-warning-short` | (글 묶음) | 묻지 않고 진행하는 옵션의 경고(짧은 판). 클론 튜토리얼 소개 쪽에서 쓴다 | docs/blocks/yolo-warning-short.md | 묶음 원본을 고친다 | 2 |
| `b:yolo-warning` | (글 묶음) | 묻지 않고 진행하는 옵션의 경고(자세한 판). tutorials/<묶음>/ 쪽에서 쓴다. 더 자세한 정본은 tutorials/reference/claude-code-and-codex.md "묻지 않고 진행하게 열기" | docs/blocks/yolo-warning.md | 묶음 원본을 고친다 | 2 |
<!-- /doc-values:list -->

## 후보

반복되지만 표시로 바꾸지 않은 것이에요. 바꾸면 이 절에서 지워요.

| 무엇 | 어디에 | 왜 아직이고, 정본으로 둘 곳 |
|---|---|---|
| 묻지 않는 옵션이 인라인 코드의 일부로만 나오는 글(`--dangerously-skip-permissions`(Codex는 `--yolo`), `claude --continue --dangerously-skip-permissions`(Codex는 `codex resume --last --yolo`), "Codex의 `--yolo`는") | 클론 튜토리얼 첫 쪽·3~5장, `tutorials/start/README.md`, `tutorials/samples/README.md`, `tutorials/reference/claude-code-and-codex.md`, 묶음 `yolo-warning` | 코드 한 덩어리가 값 전체가 아니라 표시를 달 수 없다. 문장을 고칠 때 `agent.<이름>.yolo` 값으로 |
| 묻지 않는 옵션 경고의 세 번째 판(목록 꼴) | `tutorials/reference/claude-code-and-codex.md` | 하지 않기로 했다. 그 쪽이 정본이고 한 곳뿐이며 `yolo-warning`, `yolo-warning-short`와 문장이 달라 합치거나 묶음으로 만들 이득이 없다. 두 묶음을 고칠 때 그 쪽과 맞춘다 |
| 템플릿 포트가 인라인 코드의 일부나 코드 블록 안에 있는 곳(`http://localhost:3001/title/없는-작품`, `lsof -nP -iTCP:5432 …`, `"${DB_PORT:-5432}:5432"`, `DATABASE_URL`, 용어집의 `localhost:3001`, `handbook/templates/choose.md` mermaid의 `localhost:5432`·`127.0.0.1:54322`·`pooler 6543`) | 튜토리얼 11-check, `tutorials/reference/glossary.md`, `AGENTS.md`, handbook, 두 템플릿 README | 표시를 달 수 없다. 값은 `port.*`(설치본 supabase `prokit-db`의 `transaction pooler(6543)`은 테스트가 `port.supabasePooler`와 비교한다) |
| README 배지(주소와 alt)의 Node 최소 판과 에이전트 이름 | `README.md` | 주소라 표시를 달 수 없다. 대신 테스트가 정본과 같은지 본다 |
| 프리셋 쪽 첫 문장(컨셉 설명) | `tutorials/samples/<이름>.md` 3줄 | 문장이 쪽마다 풀어 쓴 글이라 `field`·`summary`와 합치지 않았다. 컨셉 요약은 `preset.<이름>.summary` |
| 프리셋 단계별 표의 쪽 수에 비례하는 행(나머지 페이지, 검사와 디자인 리뷰, 그림 N장)의 토큰·달러 | `tutorials/samples/<이름>.md` | 시간은 값으로 옮겼다(나머지 페이지는 쪽당 `cost.stage.page.<pack|scratch>` × 나머지 쪽 수, 그림은 장수 × `cost.image.time`을 분으로 올림, 검사와 디자인 리뷰는 단위값으로 나눠 떨어지지 않아 `presets.<이름>.stages.check`). 토큰은 쪽당 값이 프리셋마다 달라 단가 × 쪽 수로 계산되지 않는다. 합계와 5% 안에서 같은지, 칸의 달러가 규칙대로 반올림한 값인지(토큰이 `cost.tokens.<달러>` 표시면 그 달러를, 아니면 토큰 ÷ `cost.tokensPerUsd`를 반올림하고 x.5는 올림, 1 미만은 "1달러 미만"), 같은 토큰에 같은 달러를 쓰는지, 프리셋 팩 칸이 처음부터 칸보다 크지 않은지만 테스트가 본다. 쪽 수가 같은 두 프리셋(pacecrew, uptrail)의 두 행은 값이 같아 `docs/dupes-allow.txt`에 행 이름만 둔다. 합계(`doc-values.json` `presets.<이름>.pack`·`scratch`)는 직접 적는 값이고, 달러는 행 합을 5달러 단위로 반올림하며 캐시 포함은 그 달러 × `cost.cachedPerUsd`로 어림한다. 그래서 합계의 토큰과 달러가 정확히 비례하지 않을 수 있다 |
| 목록 중간이나 표 중간이라 표시를 달지 못한 같은 글 | 클론 튜토리얼의 "막히면" 목록, 에이전트 순서 목록, "에이전트가 물어보면" 표와 단계별 예상 표, 프리셋 단계별 표의 공통 행, 두 템플릿 README의 준비물 목록과 명령 표 | 표시 없이 묶음 원본(`trouble-*`, `qa-row-*`, `feature-round-spec`·`feature-round-review`, `sample-stage-*`, 설명에 CASES라고 적힌 `clone-*`와 `tpl-readme-*`)과 같게 두고, `scripts/doc-values.cases.mjs`의 CASES로 테스트가 지킨다. 중복 검사는 이런 줄을 25자부터 본다 |
| agent-browser 설치 정책 문장의 설치본 사본 | `templates/*/files/.agents/skills/prokit-dev-cycle/references/process-routing.md` | 설치본에는 표시를 달지 않는다. 같은 뜻이지만 `--with-global` 없이도라는 말이 붙어 문장이 달라 `policy.agentBrowser.da`와 글자가 같지 않다. 정책이 바뀌면 이 문장도 함께 고친다. 문서 쪽 문장은 모두 `policy.agentBrowser.da`(~다)·`.yo`(~요)·`.cell`(표 칸) 표시다 |
| 카탈로그 lint 통계(`getdesign.kr 22개, getdesign.md 76개`), 측정에 쓴 모델 `Opus 5.5` | `handbook/design/design-md.md`, `handbook/reference/verification.md`, `handbook/skills/official-skills.md` | 2026-09-30 측정 기록이라 바뀌지 않는다. 지금 카탈로그 규모는 `catalogs.<이름>.count` |
| 기록이 아닌 관리자 절차의 사람용 설명 | `handbook/templates/update-existing.md`, `handbook/start/quickstart-service.md`, `handbook/templates/installer.md` | 에이전트 규칙(`AGENTS.md`)을 사람이 읽게 풀어 쓴 쪽이다. 규칙의 원문은 `AGENTS.md`이고 쪽마다 링크가 있다. `CONTRIBUTING.md`는 명령과 링크만 둔다 |
| 같은 책에 한 곳씩 있는 안내 문장, `THIRD_PARTY_NOTICES.md`의 "두 템플릿" | `THIRD_PARTY_NOTICES.md` | 권리 고지 문서에는 표시를 달지 않는다. source 목록은 manifest와 같은지 테스트가 본다 |
| 클론 과정 요약 시간(`presets.<nextflix|claudle>.screens`·`full`의 `time`)과 장별 시간의 합 | `doc-values.json` | 요약 시간은 장별 시간(`cost.stage.*`, `preset.<이름>.chapter.*`)의 합을 5분 단위로 반올림한 값과 지금 같다(Nextflix 화면까지 2시간 23분 → 2시간 25분). 토큰은 장별 달러의 합과 맞지 않아(Nextflix 화면까지 78달러 ≈ 430만, 정본 440만) 합계를 계산값으로 바꾸지 않았다. 장별 시간을 고치면 요약 시간도 함께 고친다 |
| Nextflix 실측 2~4장(`preset.nextflix.actual.build.time`)과 화면까지 최소 시간(`preset.nextflix.screens.time`) | `tutorials/01-nextflix/README.md`, `tutorials/reference/costs-and-keys.md` | 지금 둘 다 2시간 25분이지만 뜻이 다르다. 앞은 4장에서 끊겨 이어 간 값까지 든 실측이고, 뒤는 1장을 더하고 끊긴 몫을 뺀 장별 최솟값의 합이라 따로 둔다 |
| `handbook/design/design-md.md` A/B 실험의 달러(추천 $0.95, 두 번째 화면 $3.05·$2.74) | `handbook/design/design-md.md` | `cost.unit.recommend.usd`, `cost.unit.second.usd`와 같은 실험 값이지만 실험 기록 문장 안에 순서를 바꿔 쓴 값이라 표시를 달지 않았다(시간은 `docs/time-allow.txt`). 실험을 다시 재면 함께 고친다 |
