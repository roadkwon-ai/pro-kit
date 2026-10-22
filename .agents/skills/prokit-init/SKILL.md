---
name: prokit-init
description: >-
  pro-kit을 처음 들일 때 쓴다. 먼저 프로젝트 유형(새 프로젝트, 초기 프로젝트, 운영 중인 Next.js 프로젝트, 다른 언어·프레임워크에서
  Next.js로 전환)을 정한다. 새 프로젝트는 PRD를 받고, 기존 프로젝트는 기본 AI가 대상 폴더를 읽기 전용으로 초기 분석한 뒤
  그 프로젝트에 맞는 설정(템플릿, 적용 방식, 두뇌(여럿 가능: superpowers, agent-skills, pstack, gstack, oh-my, mattpocock,
  openspec, spec-kit, compound-engineering), 과설계 방지 스킬, mattpocock 추가 스킬, 응답 방식, 화면 디자인 보조)을 추천해 고르게 하고,
  유형별 동의를 받아 적용한다. "템플릿으로 프로젝트 만들어줘", "새 프로젝트 시작", "프로킷 초기 셋팅", "init", "pro-kit 받고 AGENTS.md대로",
  "이 PRD로 프로젝트 만들어줘", "이 프로젝트에 프로킷 적용해줘", "기존 프로젝트에 도입", "프로토타입을 프로킷으로 개발",
  "PHP(Django, Rails 등) 서비스를 Next.js로 옮기고 싶어"처럼 프로킷을 처음 들이는 요청에 쓴다. 이미 프로킷을 들인 프로젝트(.dev-cycle.json이 있음)의
  기능 개발(prokit-dev-cycle), 스킬 구성 변경(prokit-skills-manage), 템플릿 갱신 반영(AGENTS.md 절차)에는 쓰지 않는다.
argument-hint: "[PRD 파일 경로나 PRD 내용, 또는 기존 프로젝트 경로]"
---

# 프로킷 초기 설정

프로젝트 유형을 정한 뒤, 새 프로젝트는 PRD로 추천을 만들어 루트 `AGENTS.md`의 "템플릿으로 새 프로젝트 만들기" 1\~10을 실행하고(0\~6절), 기존 프로젝트는 초기 분석과 맞춤 제안, 동의를 거쳐 `AGENTS.md`의 "기존 프로젝트에 도입하기"를 실행한다(7절). 절차의 정본은 `AGENTS.md`다. 카탈로그, 선택지 설명, 추천 기준의 정본은 `templates/<템플릿>/files/.agents/skills/prokit-dev-cycle/references/brains/README.md`(두 템플릿이 같다)다. 그 파일을 먼저 읽고, 표를 이 스킬에 다시 옮겨 적지 않는다.

## 먼저: 프로젝트 유형
작업 폴더에서 시작했으면 pro-kit 받기(아래 0절의 예외)를 먼저 한다. 그다음 유형을 정한다. 다른 질문과 실행보다 먼저다.

| 유형 | 언제 | 이어지는 절 |
|---|---|---|
| `new` 새 프로젝트 | 아직 코드가 없고 새로 만든다 | 0\~6절(PRD 필수) |
| `early` 초기 프로젝트 | PRD, 화면 정의서, 디자인 시스템, 프로토타입까지만 있고 개발 환경은 아직 없다 | 7절 |
| `operating` 운영 중인 Next.js | 개발하고 운영 중인 Next.js 프로젝트에 프로킷을 들인다 | 7절 |
| `migration` 전환 | 다른 언어·프레임워크로 만든 서비스를 Next.js로 옮긴다. Next.js가 아닌 운영 프로젝트도 여기다 | 7절 |

- 요청과 경로에서 유형이 분명하면(예: PRD만 있고 "새로 만들어줘", 기존 폴더 경로와 "Next.js로 옮기고 싶어") 그 유형으로 정하고 한 줄로 알린다. 신호는 [references/existing-project.md](references/existing-project.md) 1절이다.
- 분명하지 않으면 묻는다(Claude Code는 AskUserQuestion, 질문 하나에 위 네 선택지와 한 줄 설명, 신호로 고른 추천에 ` (추천)`). 기존 프로젝트 유형이면 대상 폴더 경로도 함께 받는다.
- 기존 프로젝트 안에서 세션을 열었으면 그 폴더가 대상이고, pro-kit은 그 옆(`../pro-kit`)에 받는다. 프로젝트 안에 받지 않는다.

## 0. PRD 받기 (새 프로젝트: 첫 단계, 필수)
기존 프로젝트 유형(`early`, `operating`, `migration`)은 PRD가 필수가 아니다. 있으면 받아 초기 분석과 추천에 쓰고, 없으면 대상 폴더의 기획 자료와 코드가 근거다(7절). 아래 1\~3은 새 프로젝트에만 적용한다.

prokit은 PRD를 바탕으로 두뇌와 스킬을 추천하고, PRD에 맞춰 개발 환경을 만든다. 대부분의 사용자는 두뇌와 스킬의 차이를 몰라서 고르라고만 하면 고르지 못한다. 그래서 PRD 없이는 init하지 않는다. 이 단계는 다른 질문과 실행보다 먼저 한다. 다만 작업 폴더에서 시작했으면 pro-kit 받기(`AGENTS.md` "작업 폴더에서 시작했을 때"의 clone이나 `pull --ff-only`)를 이 단계보다 먼저 한다. 이 스킬과 절차가 받은 pro-kit 안에 있어서, 최신판을 받아야 그 판의 규칙으로 PRD를 받는다.

1. **인자와 요청에서 찾는다.** `/prokit-init <PRD 파일 경로나 내용>`(Codex는 `$prokit-init …`)으로 불렀으면 인자를 먼저 본다. Claude Code는 인자를 이 문서 끝의 `ARGUMENTS:` 줄로 넘긴다. 인자가 없거나 요청으로 시작했으면 요청 글에서 찾는다.
   - 파일 경로: 그 파일을 읽어 PRD로 쓴다. 상대 경로는 지금 작업 디렉터리 기준이다. 없거나 읽을 수 없으면 그 경로를 알리고 2로 간다.
   - 글: 누가 쓰는지와 무엇을 할 수 있는지(핵심 기능)가 드러나면 PRD다. "todo 앱 만들어줘"처럼 이름만 있으면 PRD가 아니다.
   - 그 밖에 대화에 붙여 넣은 글, 같은 대화에서 앞서 받은 PRD, `docs/first-request.md`로 갈 첫 요청의 서비스 설명, 요청에 적힌 프리셋 팩(`packs/<이름>`. 팩의 `README.md`, `PRODUCT.md`, `features.md`, `screens.md` 중 있는 것을 읽는다)도 PRD다.
2. **없으면 PRD부터 받는다.** 다른 것을 묻거나 실행하지 않고 이 안내 하나만 보내 답을 기다린다: "PRD를 먼저 받을게요. prokit은 PRD를 바탕으로 두뇌와 스킬을 추천하고 PRD에 맞춰 개발 환경을 만들어요. PRD 파일 경로를 주거나 내용을 붙여 넣어 주세요. 짧아도 돼요: 누가 쓰는지, 무엇을 할 수 있는지(핵심 기능)." 템플릿·이름 질문도 PRD를 받은 뒤로 미룬다. PRD가 화면만인지, DB가 필요한지, 서비스 이름을 함께 알려 줄 때가 많아서다. 요청에 이미 있는 값(템플릿, 이름, 두뇌 등)은 적어 두고 다시 묻지 않는다. 요청에 "PRD는 없어", "그냥 만들어줘"가 있어도 이 안내는 한 번 보낸다. 짧은 서비스 설명도 PRD가 된다는 것을 모르는 사용자가 많아서다. 답은 1과 같은 기준으로 본다.
3. **그래도 없으면 끝낸다.** 2의 안내 뒤에 온 답에 PRD가 없으면(건너뜀, "없어", "알아서 해줘", 이름만 있는 설명, 읽을 수 없는 파일) 프로젝트를 만들지 않고 다시 묻지도 않는다. 이 안내로 init을 끝낸다: "PRD 입력은 필수예요. prokit은 PRD를 바탕으로 스킬을 추천하고 PRD에 맞춰 개발 환경을 만들기 때문에 PRD 없이는 시작할 수 없어요. PRD를 준비해 `/prokit-init <PRD 파일 경로나 내용>`으로 다시 시작해 주세요." 다시 시작하는 방법은 지금 세션에서 실제로 되는 것을 적는다. pro-kit 폴더에서 연 세션이면 Claude Code는 `/prokit-init <…>`, Codex는 `$prokit-init <…>`이다. 작업 폴더에서 연 세션은 이 스킬이 등록되지 않으므로, 처음 요청에 PRD를 붙여 다시 보내라고 적는다(예: "…AGENTS.md대로 … 만들어줘. PRD: <누가 쓰는지, 핵심 기능>"). 스킬을 직접 부를 수 없는 도구도 같다. 읽지 못한 파일 경로가 있으면 함께 알린다. 질문에 답할 수 없는 실행(비대화 실행)이면 2를 건너뛰고 바로 이 안내로 끝낸다.

## 1. 값
| 값 | 기본 | 언제 묻나 |
|---|---|---|
| 프로젝트 유형 | 요청에서 정함 | "먼저" 절. 분명하지 않으면 첫 질문 |
| PRD | 없음 | 0절(새 프로젝트). 인자와 요청에 없으면 첫 단계로 받고, 그래도 없으면 init을 끝낸다. 기존 프로젝트는 있으면 받는다 |
| 대상 경로 | 없음 | 기존 프로젝트 유형이면 유형과 함께 |
| 적용 방식·작업 브랜치·새 폴더 | 초기 분석으로 정한 기본값 | 7절 |
| 템플릿 | 없음. 화면만 요청이면 `prokit-next-neon` | 요청과 PRD에 DB가 드러나지 않을 때 |
| 프로젝트 이름 | 요청에 적힌 폴더 이름 | 없을 때 |
| 위치 | `../<이름>` | 템플릿·이름과 함께 |
| 두뇌 | 추천값 하나를 첫 선택지로. 여럿도 고를 수 있다 | 2절 |
| 과설계 방지 스킬 | `ponytail` 추천 | 2절 |
| mattpocock 추가 스킬 | PRD에 맞는 것 추천 | 2절 |
| 응답 방식(i-have-adhd) | `i-have-adhd` 추천 | 2절 |
| 화면 디자인 보조(taste-skill) | SKIP 추천. 공개 페이지가 주 화면이면 `taste-skill` 추천 | 2절 |
| 전역 도구(`--with-global`) | 안 함 | 사용자가 요청할 때만 |
| 선택 묶음(ops, motion, mobile) | 안 함 | 사용자가 요청할 때만. 보고에 설치법을 적는다 |

## 2. 스킬 구성을 묻는 조건
항목마다 정한다.
1. 요청이 정한 항목(예: "두뇌는 superpowers", "caveman으로", "adhd도 넣어줘")은 그대로 쓰고 다시 묻지 않는다.
2. 맡긴 항목("알아서 골라줘", "matt 스킬도 골라줘")은 묻지 않고 추천대로 설치한다. 과설계 방지 스킬은 ponytail이다.
3. 나머지 항목은 PRD로 만든 추천을 보여 주고 4절대로 묻는다. 화면만 요청도 같다.

추천은 제안이다. 고르는 것은 사용자다. 질문에 답할 수 없는 실행(비대화 실행)이면 묻지 못한 두뇌·과설계 방지 스킬은 `none`, 추가 스킬·응답 방식·화면 디자인 보조는 설치하지 않고 보고에 추천과 설치 명령을 적는다.

## 3. 추천 만들기
`brains/README.md`의 "추천 기준"을 PRD에 그대로 적용한다.
- 두뇌는 "하네스가 맡지 않는 가장 큰 부족함 하나"로 고른다. 신호가 약하거나 두 줄 이상이 비슷하게 맞으면 `none`이다. 지금 세션의 도구가 지원하지 않는 두뇌(예: Codex에서 pstack)는 추천하지 않는다.
- 추가 스킬은 신호가 맞는 것을 모두 추천하되, 두뇌와 겹치는 것은 추천에서 뺀다. 두뇌가 `mattpocock`이면 빼지 않는다.
- 응답 방식은 i-have-adhd를 추천한다. 사용자가 길고 자세한 설명을 원한다고 했으면 SKIP을 추천한다.
- 화면 디자인 보조는 SKIP을 추천한다. PRD의 주 화면이 공개 페이지(랜딩, 소개, 포트폴리오, 행사, 매장)이거나 시각 완성도를 따로 요구하면 taste-skill을 추천한다.
- 맡긴 항목은 묻지 않지만, 고른 값과 근거 한 줄을 대화로 알리고 진행한다. 사용자가 무엇이 왜 설치되는지 알고 바꿀 수 있어야 해서다.
- 기존 프로젝트는 PRD와 초기 분석 결과를 함께 신호로 쓴다(7절).
- 물을 항목이 있으면 묻기 전에 대화로 추천을 짧게 보여 준다(정했거나 맡긴 항목은 뺀다): 두뇌 열 개(`none`, superpowers, agent-skills(addyosmani), pstack, gstack, oh-my, mattpocock, openspec, spec-kit, compound-engineering)를 한 줄씩 나열하고 추천에 `(추천)`과 근거로 삼은 PRD 문장이나 신호 한두 개를 붙인다. 두뇌는 하나를 권하고, 여럿을 함께 쓸 수 있다는 것과 그때 첫 두뇌가 주 두뇌라는 것을 한 줄로 알린다. 이어서 과설계 방지 스킬, 추가 스킬(스킬마다 근거 한 줄), 응답 방식, 화면 디자인 보조, 설치하지 않는 스킬과 이유를 적는다.

## 4. 묻는 법
Claude Code는 AskUserQuestion으로 묻는다. 한 번에 질문 4개, 질문마다 선택지 4개까지다. 선택지마다 `brains/README.md`의 "선택지 설명(한 줄)"을 `description`에 넣고, 추천한 선택지는 이름 끝에 ` (추천)`을 붙여 맨 앞에 둔다. 두뇌 agent-skills의 선택지 이름은 `agent-skills (addyosmani)`다. Vercel·Neon·Supabase의 agent-skills와 구분하기 위해서다.

1. 프로젝트 기본(필요할 때만): 템플릿·이름·위치를 한 번에 묻는다.
2. 스킬 구성: 아래 네 질문을 한 번에 묻는다(정했거나 맡긴 항목은 뺀다). 질문 본문 첫 줄에 추천 근거를 한 줄로 적는다.

   | 머리글 | 선택지(순서대로) |
   |---|---|
   | 두뇌 | `<추천> (추천)`, PRD에 다음으로 맞는 두뇌 하나, `없음(기본 AI)`, `다른 두뇌 보기·여럿 고르기`. 추천이 `none`이면 `없음(기본 AI) (추천)`, 다음으로 맞는 두뇌 둘, `다른 두뇌 보기·여럿 고르기` |
   | 과설계 방지 | `ponytail (추천)`, `caveman`, `andrej-karpathy-skills`, `SKIP(기본 AI)` |
   | 응답 방식 | `i-have-adhd (추천)`, `SKIP`. SKIP을 추천할 때는 `SKIP (추천)`, `i-have-adhd` |
   | 화면 디자인 | `SKIP (추천)`, `taste-skill`. taste-skill을 추천할 때는 `taste-skill (추천)`, `SKIP` |

3. `다른 두뇌 보기·여럿 고르기`를 고르면 두뇌 아홉 개를 세 묶음의 여러 선택 질문으로 한 번에 묻는다(하나만 골라도 된다). 묶음: 진행 규율(superpowers, agent-skills, pstack, mattpocock), 스펙 주도(openspec, spec-kit), 제품·장기 실행·학습(gstack, oh-my, compound-engineering). 선택지마다 `brains/README.md`의 "선택지 설명(한 줄)"을 넣고 추천에 ` (추천)`을 붙인다.
   - 둘 이상 고르면 "주 두뇌는?"을 고른 것 중에서 한 번 더 묻는다. 설치 값은 주 두뇌를 앞에 둔 쉼표 목록이다(`--brain openspec,superpowers`).
   - 진행 순서를 강제하는 두뇌(superpowers, gstack, oh-my)를 둘 이상 고르면 지시가 서로 덮어쓴다고 알리고 하나만 남기게 다시 묻는다.
   - 하나도 고르지 않으면 `none`이다.
4. mattpocock 추가 스킬: 최종 두뇌가 정해지면 늘 묻는다(정했거나 맡긴 경우는 뺀다). 필수 3개(`domain-modeling`, `grilling`, `grill-with-docs`)를 뺀 추가 스킬 14개를 네 묶음의 여러 선택 질문으로 한 번에 묻는다. 추천은 최종 두뇌 기준으로 다시 만든다. 추천한 스킬은 ` (추천)`을 붙여 묶음 안 맨 앞에 두고 `description`에 근거 신호를 더한다. 두뇌와 겹치는 스킬도 목록에 남기고 `description`에 "<두뇌>와 겹침"을 적는다. 질문 본문에 "필수 3개는 늘 설치돼요. 추가하지 않으려면 아무것도 고르지 않거나 Other에 '없음'이라고 적어요"를 적는다. 열네 개가 질문 네 개를 거의 채워 "추가 안 함" 선택지를 넣을 자리가 없어서다. 두뇌가 `mattpocock`이면 "고른 스킬이 단계별 기법이 돼요"를 더한다.

   | 머리글 | 스킬 |
   |---|---|
   | 구현·설계 | `tdd`, `codebase-design`, `prototype`, `improve-codebase-architecture` |
   | 디버깅·검토 | `diagnosing-bugs`, `code-review`, `pr`, `writing-for-agents` |
   | 조사·외부 설정 | `research`, `wizard`, `to-questionnaire` |
   | 인계·학습 | `handoff`, `teach`, `wait-what` |

- 다른 도구는 같은 순서로 대화로 묻는다. 두뇌 열 개와 추가 스킬 14개를 번호 목록으로 한 번에 보여 주고(추천 표시와 설명 포함) 번호로 고르게 한다. 두뇌와 추가 스킬은 여러 개를 고를 수 있다. 두뇌를 여럿 고르면 첫 번호가 주 두뇌다.
- 사용자가 겹치는 추가 스킬을 고르면 겹친다는 점(라우팅은 두뇌의 스킬을 먼저 쓴다)을 알리고 설치한다. 제외 스킬(`grill-me` 등)을 원하면 이유를 알린다. 그래도 원하면 새 프로젝트의 H 라운드에서 매니페스트를 고친 뒤 설치하라고 안내한다.

## 5. 실행
1. 설치 전에 이 기기 전역의 두뇌·과설계 방지 스킬을 확인해 보고 목록을 만든다. `~/.claude/settings.json`의 `enabledPlugins`에서 켜진 두뇌·과설계 방지 플러그인(superpowers, agent-skills, pstack, oh-my-claudecode, ponytail)과 frontend-design 플러그인, `~/.claude/skills/gstack`, `~/.claude/CLAUDE.md`의 `<!-- OMC:START -->` 블록을 본다. 지우거나 고치지 않는다. 고르지 않은 것은 설치기가 새 프로젝트의 `.claude/settings.local.json`으로 끈다.
2. `AGENTS.md` 3번 준비물에 고른 두뇌의 준비물을 더해 확인한다. gstack은 Bun, Spec Kit은 uv(설치할 때만)가 필요하다. oh-my는 Codex를 쓰면 OMX CLI(`omx`)가 필요하고, OMX `team`은 tmux가 필요하다(tmux가 없으면 멈추지 않고 보고에 적는다). gstack, OMX CLI, OpenSpec CLI(npm)는 그 두뇌를 고르면 설치기가 전역에 설치한다(`--brain`을 명시하므로). 설치 전에 그 사실을 알린다. 그 밖의 전역 설치는 사용자가 요청할 때만 한다.
3. `AGENTS.md` 1\~10을 그대로 하되, 5번 설치 명령에 고른 값을 붙인다: `bash <pro-kit>/templates/<템플릿>/install.sh <경로> --brain <값> --simplicity <값>`. `none`도 명시한다. 두뇌가 여럿이면 주 두뇌를 앞에 둔 쉼표 목록이다(`--brain openspec,superpowers`). 새 프로젝트는 `--project-type new`를 붙여도 되고 빼도 된다. 선택지 이름이 아니라 설치 값을 쓴다: `agent-skills (addyosmani)`는 `agent-skills`, `andrej-karpathy-skills`는 `karpathy`, `SKIP(기본 AI)`·`없음(기본 AI)`은 `none`이고, 응답 방식 `SKIP`은 `--optional i-have-adhd`를, 화면 디자인 `SKIP`은 `--optional taste`를 빼는 것이다. 추가 스킬은 `--matt <스킬>[,<스킬>]`, i-have-adhd는 `--optional i-have-adhd`, taste-skill은 `--optional taste`를 더한다(둘 다면 `--optional i-have-adhd,taste`). mattpocock 두뇌는 `--brain mattpocock`과 고른 `--matt`를 함께 준다. exit 0이 아니면 `AGENTS.md` 5번대로 출력을 보고하고 멈춘다.
4. PRD를 새 프로젝트에 남겨 9번 커밋에 넣는다. 추천의 근거이고, 나중에 두뇌를 바꿀 때도 읽는다. 작업 폴더 흐름에서 첫 요청을 `docs/first-request.md`에 적었고 PRD가 그 요청 안에 있으면 그 파일로 충분하다(문장은 바꾸지 않는다). 그 밖에는 `docs/prd.md`에 둔다: 파일이면 내용을 옮기고 원래 경로를 첫 줄에 적고, 요청 속 설명이면 그 문장을 그대로, 프리셋 팩이면 팩 이름과 경로를 적는다.
5. 8번 확인에서 `pnpm skills:check`가 exit 0이고 `두뇌:`·`과설계 방지:`·`mattpocock 추가:` 줄이 고른 값인지 본다. i-have-adhd나 taste-skill을 골랐으면 `선택 스킬:` 줄에 `i-have-adhd 있음`, `taste 있음`이 보여야 한다.

## 6. 보고
`AGENTS.md` 10번 보고에 더한다.
- 추천에 쓴 PRD(파일 경로나 "요청의 서비스 설명", 팩 이름)
- 고른 두뇌, 과설계 방지 스킬, 추가 스킬, 응답 방식과 실제 설치 상태(`pnpm skills:check`의 해당 줄)
- 추천과 다르게 고른 것, 건너뛴 추천과 나중에 바꾸는 법(새 프로젝트 세션에서 "두뇌 바꿔줘", "taste 추가해줘"처럼 요청하면 `prokit-skills-manage`가 H 라운드로 설치한다. 명령 예: `--simplicity <이름>`, `--matt <스킬>`, `--optional i-have-adhd`, `--optional taste`. 두뇌를 더할 때는 지금 목록 뒤에 붙인다: `--brain <지금 두뇌>,<새 두뇌>`)
- 끈 전역 플러그인과 남은 전역 경고(설치기 출력의 `전역:`·`전역 경고:` 줄)
- caveman이나 i-have-adhd를 골랐으면 켜는 명령(`/caveman`, `/i-have-adhd`. Codex는 `$`)과 대화 응답에만 쓴다는 점. 끄는 말은 스킬별로 적는다("stop caveman", "stop adhd mode", "stop ponytail"). "normal mode"는 셋을 함께 끈다
- taste-skill을 골랐으면 화면 작업에서 "taste로"라고 하거나 스타일 질문에서 "taste-skill로 방향 뽑기"를 고른 화면에만 쓴다는 점, impeccable 흐름(브리프, critique, audit)은 그대로라는 점, 검사에 Chrome·Edge·Chromium이 필요하다는 점
- karpathy를 골랐으면 diff 검토 스킬이 없어 `prokit-reviewer` focus가 그 역할을 맡는다는 점
- gstack을 골랐으면 전역 설치가 Stop 훅을 등록하고 다른 프로젝트에서도 보인다는 점

## 7. 기존 프로젝트(early, operating, migration)
절차의 정본은 루트 `AGENTS.md`의 "기존 프로젝트에 도입하기"다. 질문 문구, 초기 분석 점검과 요약 틀, 기록 틀은 [references/existing-project.md](references/existing-project.md)에 있다. 순서는 바꾸지 않는다.

1. **자료 받기**: 대상 경로(있어야 하고 pro-kit 폴더가 아니어야 한다)와 PRD·기획 자료(화면 정의서, 디자인 시스템 문서)를 받는다. PRD는 있으면 받고, 없어도 진행한다. 요청에 이미 있으면 다시 묻지 않는다.
2. **초기 분석(기본 AI, 읽기 전용)**: 지금 세션의 에이전트가 직접 대상 폴더를 읽는다. 두뇌나 다른 스킬을 쓰지 않고, 대상 폴더에 아무것도 쓰지 않는다. 결과는 요약 틀대로 대화로 보여 준다. 유형이 맞지 않으면 근거와 함께 다시 묻는다(references 3절).
3. **맞춤 설정 제안과 확정**: 초기 분석과 PRD로 템플릿·적용 방식·작업 브랜치(유형별 항목은 references 4절)와 스킬 구성(2\~4절. 두뇌는 하나를 권하되 여럿 가능)을 추천해 한 번에 보여 주고, references 4절대로 두 번에 나눠 묻는다. 맡긴 항목은 묻지 않는다. 디자인 방향(기존 디자인 유지 또는 리디자인)은 여기서 묻지 않는다. 첫 화면 작업에서 `prokit-ui`가 묻는다.
4. **유형별 동의**: references 5절의 문구로 한 번 묻는다. "지금은 하지 않음"이면 아무것도 바꾸지 않고 초기 분석 요약과 고른 설정을 보고한 뒤 끝낸다. 질문에 답할 수 없는 실행이면 동의를 받은 것으로 보지 않고 같은 보고로 끝낸다.
5. **안전 점검**: references 6절. early와 operating은 커밋하지 않은 변경이 있으면 멈춘다. 대상이 git 저장소가 아니면 유형별로 다르다(운영 중이면 첫 커밋을 남길지 묻는다). `git init`을 했으면 첫 커밋 전에 `.env*`·`node_modules/`를 `.gitignore`에 넣는다.
6. **적용**: `AGENTS.md` "기존 프로젝트에 도입하기" 5번을 유형대로 한다. 설치 명령에는 유형과 고른 값을 붙인다.
   - early: `install.sh <경로> --project-type early --default-branch <병합할 기본 브랜치> --brain <값> --simplicity <값> …`
   - operating(Better-T-Stack이고 DB가 Postgres와 Drizzle): 실제 DB에 맞는 템플릿으로 `install.sh <경로> --project-type operating …`. 그 밖의 Next.js(다른 DB의 Better-T-Stack 포함): `install.sh <경로> --adopt …`. `--default-branch`는 늘 붙인다. 기본 브랜치에 병합하면 `prokit/setup`을 만들기 전의 기본 브랜치, 도입 브랜치에서 계속하면 `prokit/setup`이다.
   - migration: `install.sh <새 경로> --project-type migration --legacy <기존 코드 경로> …`
7. **기록과 커밋**: `docs/prokit/intake.md`와 `docs/first-request.md`를 references 7절 틀로 쓰고 적용 커밋에 넣는다. PRD 파일을 받았으면 `docs/prd.md`에 옮긴다(early에서 이미 `docs/`로 옮겼으면 그 경로를 intake에 적는다).
8. **보고**: 6절 보고에 유형, 초기 분석 요약 한 줄, 적용 방식과 브랜치(병합 여부), 설치기가 `유지(템플릿과 다름)`로 남긴 파일, 다음 세션 한 줄(`cd <프로젝트 절대 경로> && <에이전트 명령> "docs/first-request.md의 요청대로 이어서 해줘"`)을 더한다. 새 세션은 `prokit-analyzer`로 정밀 분석을 하고, 두뇌로 진행 계획을 세워 Task별로 진행한다(템플릿 `prokit-dev-cycle` 6절). 이 세션에서 이어 가지 않는다.
