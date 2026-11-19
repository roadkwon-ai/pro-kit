# Hallmark와 주요 AI 디자인 스킬 비교

> **자료 확인일:** 2026년 11월 2일  
> **비교 대상:** Hallmark, Impeccable, Taste Skill, UI UX Pro Max, Awesome Design Skills, Elaya AI Design Skills, k-style-ui-ux  
> **조사 범위:** 각 저장소의 README, 실제 스킬 지침, 열람 가능한 구현 코드, 공식 문서 및 변경 기록  
> **문서 성격:** 앞선 조사 결과를 다운로드 가능한 문서로 정리했다. 동일한 모델·프롬프트로 결과물을 생성해 채점한 성능 순위는 아니다. 기능 사실과 그에 근거한 분석·추천을 구분한다. 기능과 GitHub Stars는 조사 시점의 스냅샷이며 이후 달라질 수 있다.

## 목차

1. [핵심 판단](#1-핵심-판단)
2. [전체 비교표](#2-전체-비교표)
3. [Hallmark의 핵심 특징](#3-hallmark의-핵심-특징)
4. [Hallmark가 관심을 받는 이유](#4-hallmark가-관심을-받는-이유)
5. [기존 스킬과의 구체적인 차이](#5-기존-스킬과의-구체적인-차이)
6. [Hallmark의 장점과 한계](#6-hallmark의-장점과-한계)
7. [작업 목적별 선택과 권장 조합](#7-작업-목적별-선택과-권장-조합)
8. [출처](#8-출처)

---

## 1. 핵심 판단

**Hallmark는 새 랜딩 페이지나 포트폴리오의 디자인 방향을 잡고, 첫 결과물의 완성도를 끌어올릴 때 우선 시험해볼 만한 스킬이다.** 특히 시각 방향 선택, 실제 콘텐츠를 반영한 구성, 브라우저 검사, 별도 검토를 하나의 과정으로 묶었다는 점이 강점이다. [1]

다만 최신 버전의 **Impeccable과 Taste Skill도 이미 자동 검사와 반복 개선 기능을 갖추고 있다.** Hallmark의 차별점은 검증 기능의 유무보다 **어떤 방식으로 디자인을 결정하고, 어떤 기준을 얼마나 강하게 적용하는가**에 있다. [12], [13], [15]

목적별로 구분하면 다음과 같다.

- **새 사이트의 방향과 첫 시안:** Hallmark
- **기존 UI의 반복 개선과 장기 관리:** Impeccable
- **강한 시각적 인상과 풍부한 모션:** Taste Skill
- **제품에 맞는 디자인 시스템과 UX 기준 검색:** UI UX Pro Max
- **스타일 탐색과 디자인 규칙 초안:** Awesome Design Skills
- **CTA·카피 중심 랜딩 또는 Figma 디자인 시스템:** Elaya AI Design Skills
- **한국어 모바일 앱의 여러 화면과 사용자 흐름 초안:** k-style-ui-ux

위 구분은 각 도구의 기능 구성을 바탕으로 한 추천이다. 다른 용도로 사용할 수 없다는 의미는 아니다.

## 2. 전체 비교표

이 일곱 저장소는 제공하는 형태부터 다르다. 종합 제작 도구, 디자인 지식 검색 도구, 스타일 프리셋 모음, 특정 작업에 집중한 스킬이 함께 포함되어 있다.

| 스킬 | 핵심 방식 | 특히 잘 맞는 작업 | 주요 장점 | 주요 한계 |
| --- | --- | --- | --- | --- |
| **[Hallmark](https://github.com/Nutlope/hallmark)** | 테마 선택, 목적에 따른 페이지 구성, 강한 검사 기준 | 새 랜딩 페이지, 브랜드 사이트, 포트폴리오, 명시적인 리디자인 | 방향 설정부터 첫 화면 제작·검사까지 연결된다. 실제 콘텐츠와 기존 기능 보존을 중시한다. | 제작자의 미적 기준이 강하다. 전체 과정을 수행하려면 실행 환경과 시간이 필요하다. [1], [2] |
| **[Impeccable](https://github.com/pbakaus/impeccable)** | 목적별 개선 명령, 디자인 비평, 자동 탐지, 시스템 기록 | 기존 사이트·컴포넌트 개선, 장기적인 UI 관리 | 수정 범위를 작게 잡기 쉽고 문구·반응형·상태·성능까지 다룬다. | 명령과 문맥 파일 등 관리 요소가 많아 단일 시안에는 다소 무겁게 느껴질 수 있다. [12], [14] |
| **[Taste Skill](https://github.com/Leonxlnx/taste-skill)** | 조사한 시각 방향 선택, 실제 이미지 확보, 구현·검사 반복 | 개성이 강한 마케팅 페이지, 시각적 인상을 강조하는 포트폴리오 | 구도·사진·타이포그래피·모션을 구체적으로 결정하게 한다. | 일반 페이지 모드의 미감과 모션 요구가 강하고, 전체 제작의 시간·토큰 부담이 크다. [15], [16] |
| **[UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)** | 디자인 데이터 검색과 규칙 조합으로 설계 기준 추천 | SaaS, 대시보드, 여러 플랫폼의 디자인 시스템 설계 | 폭넓은 제품군·기술 스택·UX 규칙을 체계적으로 참고할 수 있다. | 추천 기준을 실제 화면으로 잘 구현하고 검증하는 과정은 별도로 중요하다. [17], [19] |
| **[Awesome Design Skills](https://github.com/bergside/awesome-design-skills)** | 스타일별 SKILL.md·DESIGN.md 프리셋 제공 | 원하는 스타일 선택, 디자인 규칙 초안 작성 | 여러 스타일을 빠르게 탐색하고 필요한 것만 가져오기 좋다. | 종합적인 제작·렌더링 검사 과정은 제공되는 프리셋과 구분해야 한다. [20], [21] |
| **[Elaya AI Design Skills](https://github.com/elayadesign/ai-design-skills)** | 랜딩 페이지용 스킬과 Figma용 스킬 | CTA·카피 중심 랜딩, 편집 가능한 Figma 디자인 시스템 | 목적·고객·주요 행동을 먼저 정하며, Figma 구조화까지 다룬다. | 랜딩 스킬의 고정된 시각 취향이 강하다. Figma 작업에는 별도 도구 환경이 필요하다. [22], [23], [24] |
| **[k-style-ui-ux](https://github.com/vmc-inner-circle/k-style-ui-ux)** | PRD에서 한국 앱 스타일의 여러 화면과 흐름 생성 | 한국어 모바일 앱 기획·화면 초안 | 사용자 흐름의 누락, 한글 줄바꿈, 국내 서비스 관례를 구체적으로 다룬다. | 산출물은 모바일 앱의 HTML 시안이다. 독립적인 브랜드 사이트나 완성된 앱 구현과는 용도가 다르다. [25], [26] |

**선택 기준은 ‘어느 것이 제일 예쁜가’보다 ‘현재 어려워하는 단계가 무엇인가’로 잡는 편이 좋다.**

## 3. Hallmark의 핵심 특징

조사 당시 Hallmark의 main 브랜치에서 확인한 버전은 **2.0.0**이다. [3]

### 3.1. 50개 테마와 목적에 따른 페이지 구성

Hallmark는 기본적으로 **50개 테마 중 요청에 맞는 후보 세 개를 제시하고, 에이전트가 시각 자료를 보고 하나를 선택**하게 한다. 이전 작업 기록도 참고해 비슷한 결과가 계속 나오지 않도록 설계되어 있다. [1], [2]

테마는 색상만 바꾸는 설정이 아니다. 서체, 색의 비중, 표면과 질감, 컴포넌트의 느낌을 함께 제공한다. 반면 페이지에 어떤 내용을 어떤 순서로 넣을지는 별도로 결정한다. 원하는 경우에는 `custom`으로 테마 없이 방향을 만들 수도 있다. [2]

방문자가 하려는 일을 기준으로 페이지 구성을 잡는 것도 특징이다. 예약 페이지라면 예약에 필요한 정보와 행동을, 뉴스레터라면 구독과 실제 콘텐츠를 중심에 두도록 한다. [5]

**분석:** 디자인을 말로 세세하게 설명하기 어려울 때 유용하다. 선택 가능한 시각 방향이 있으면서도 모든 사이트를 같은 섹션 순서로 만드는 것을 피하려는 구조다.

### 3.2. 세 단계로 나눈 검사 기준

| 단계 | 의미 | 처리 방식 |
| --- | --- | --- |
| **Floor** | 반드시 지켜야 하는 기본 규칙 | 문제가 남아 있으면 완료로 처리하지 않는다. |
| **Reflex** | 모델이 습관적으로 선택하는 패턴을 제한하는 규칙 | 수정하거나 허용 조건과 이유를 기록한다. |
| **Finish** | 세부적인 마감 품질 | 검토하고 설명하되, 그 자체로 완료를 막지는 않는다. |

검사에는 대비, 키보드 포커스, 움직임 감소 설정, 화면 넘침 같은 기술적 항목이 포함된다. 제목 위 보조 라벨이나 특정 장식·타이포그래피 패턴 같은 미적 항목도 포함되며, 일부 미적 선택은 강제 규칙이다. [4]

**분석:** AI에게 주의사항을 전달하는 수준에서 끝나지 않고 결과를 검사한다는 점이 장점이다. 다만 검사 통과가 보편적으로 좋은 디자인을 의미하는 것은 아니다.

### 3.3. 첫 화면부터 완성하고 브라우저에서 확인

Hallmark는 내비게이션과 첫 화면인 히어로 영역을 먼저 만들고 검토한 뒤 나머지 페이지로 넘어간다. 전체 과정에는 **여덟 가지 화면 폭에서의 브라우저 검사**와 기존 작업 맥락을 공유하지 않은 별도 검토가 포함된다. [1], [2]

검사 도구인 `sloplint`는 HTML·CSS뿐 아니라 JSX·TSX·Vue·Svelte·Astro와 Tailwind 클래스도 읽도록 구현되어 있다. [6]

**분석:** 첫 화면의 방향이 잘못된 상태로 아래 섹션을 계속 쌓는 일을 줄이는 데 합리적이다. 실제 효과는 사용하는 모델이 검토 결과를 얼마나 잘 해석하고 수정하는지에도 달려 있다.

### 3.4. 실제 제품 자료와 사실을 중심에 배치

실제 제품 화면, 사용자 제공 사진, 확인된 수치와 후기 등을 먼저 확인한다. 접근 가능한 제품은 직접 캡처하도록 하고, 제공되지 않은 고객 수·추천사·로고 등을 지어내지 못하게 한다. 사진을 대신 사용할 때도 출처를 남기는 흐름이 있다. [1], [2]

**분석:** 포트폴리오나 제품 소개 페이지에 유용하다. 보여줄 실제 작업물과 증거가 있어야 디자인도 그 대상을 닮을 가능성이 높아진다.

### 3.5. design.md와 디자인 토큰으로 재사용

Hallmark는 `tokens.css`를 기준으로 디자인 값을 관리하고, 요청하면 확정된 시스템을 `design.md`로 정리한다. 이후 작업은 이 파일을 먼저 읽고 공통 기준을 따르게 된다. [7]

**모든 단일 페이지 제작에서 design.md를 자동 생성하는 것은 아니다.** 시스템을 고정해 달라고 요청하거나 여러 페이지를 리디자인하는 경우 등에 작성하는 구조다. [7]

Tailwind, shadcn, 디자인 토큰 교환 형식인 DTCG 등에 맞춘 내보내기 지침도 있다. 순수 HTML·CSS로 시작하거나 기존 프레임워크의 토큰 체계에 연결하는 용도를 모두 고려하고 있다. [8]

### 3.6. 리디자인 전후의 기존 기능 보존 검사

리디자인은 수정 전 링크·폼·필드·이벤트 처리 등의 정보를 기록한 뒤, 수정 후 누락 여부를 비교한다. 전후 화면을 나란히 보여주는 결과물도 만들도록 되어 있다. 프로젝트에 기존 빌드·타입 검사·테스트가 있다면 그것도 통과해야 한다는 지침이 있다. [9]

**분석:** 외형을 바꾸다가 기존 기능을 빠뜨리는 문제를 줄이려는 실용적인 장치다. 이 비교가 모든 비즈니스 로직의 정상 동작까지 보장하는 것은 아니다.

## 4. Hallmark가 관심을 받는 이유

### 4.1. GitHub 관심도

API를 읽을 수 있었던 저장소는 API 조회값을, 나머지는 페이지 표시값을 사용했다. 조회·캐시 시점에 따라 조금씩 달라질 수 있다.

| 저장소 | 조사 당시 GitHub Stars | 확인 방식 |
| --- | ---: | --- |
| UI UX Pro Max | 143,962 | GitHub API [31] |
| Taste Skill | 107,914 | GitHub API [30] |
| Impeccable | 99,816 | GitHub API [29] |
| **Hallmark** | **45,142** | GitHub API [28] |
| Elaya AI Design Skills | 13,345 | GitHub API [32] |
| Awesome Design Skills | 약 3,400 | GitHub 페이지의 반올림 표시값 [20] |
| k-style-ui-ux | 284 | GitHub 페이지 표시값 [25] |

Hallmark가 상당한 관심을 받는다는 점은 확인할 수 있다. 그러나 **Stars는 실제 사용 빈도, 만족도, 결과물의 품질을 직접 측정한 값이 아니다.** 위 표를 디자인 품질 순위로 해석해서는 안 된다.

### 4.2. 인기 요인에 대한 분석

아래는 공개된 기능과 사용 방식에 근거한 해석이다. 각 요인이 인기 증가에 기여한 비율을 측정한 자료는 아니다.

1. **해결하려는 문제가 명확하다.** 반복되는 카드, 비슷한 제목 강조, 의미 없는 장식처럼 AI가 생성한 사이트에서 반복되는 모습을 직접 겨냥한다. 사용자가 원하는 변화를 이해하기 쉬운 설명이다.
2. **디자인 방향을 선택하는 부담을 줄인다.** 테마와 완성 예시가 있어 사용자가 모든 색·서체·구도를 먼저 정할 필요가 줄어든다. 결과물의 방향을 확인하고 수정하기도 쉽다.
3. **검사 과정이 구체적으로 보인다.** 어떤 문제를 검사하고, 어떤 항목은 수정해야 하며, 어떤 선택은 이유를 남기면 허용되는지가 드러난다.
4. **기존 코딩 에이전트에 추가하기 쉽다.** Claude Code·Codex·Cursor 등에서 사용할 수 있고 MIT 라이선스로 제공된다. [1]

Hallmark는 README에서 **Impeccable, Taste Skill, UI UX Pro Max 등을 영감의 출처로 명시**한다. 차별점은 새로운 디자인 원칙을 발명했다는 데보다, **기존 원칙과 테마·소재·제작 순서·검사를 함께 구성한 방식**에 있다고 보는 편이 정확하다. [1]

## 5. 기존 스킬과의 구체적인 차이

### 5.1. Hallmark vs Impeccable

**비교의 중심: 새 방향을 잡는 과정과 기존 UI를 계속 다듬는 과정**

Impeccable의 README는 기존 인터페이스를 대상으로 반복 개선하는 데 특히 강하다고 설명한다. 조사 당시 24개 명령을 제공하며, 그중 하나는 폐기 예정 별칭이다. [12]

| 명령 | 용도 |
| --- | --- |
| `critique` | 디자인 비평과 수정 우선순위 결정 |
| `polish` | 마감 다듬기 |
| `quieter` | 시각적으로 과한 부분 줄이기 |
| `typeset` | 글꼴·위계·크기 정리 |
| `harden` | 오류·긴 문구·국제화 등 예외 상황 보완 |

현재 Impeccable에는 소스와 실제 렌더링 결과를 검사하는 탐지기가 있다. `DESIGN.md`와 관련 메타데이터를 참고해 색·서체·크기 등이 확정된 시스템에서 벗어나는지도 확인한다. 자동 검사 자체를 Hallmark만의 장점으로 설명하면 부정확하다. [13]

`init`으로 제품 맥락을 `PRODUCT.md`에 기록하고, `document`로 기존 시각 시스템을 `DESIGN.md`에 정리하는 방식도 제공한다. [14]

**선택 기준**

- 사이트의 인상이 아직 정해지지 않았다면 Hallmark를 먼저 시험한다.
- 기존 사이트의 특정 문제를 계속 고쳐야 한다면 Impeccable을 우선한다.
- 여러 화면을 장기적으로 관리한다면 제품 맥락과 디자인 시스템을 함께 기록하는 Impeccable의 방식이 유용하다.

### 5.2. Hallmark vs Taste Skill

**비교의 중심: 서로 가까운 종합 제작 과정, 다른 미감과 모션 요구**

현재 Taste Skill을 예전의 디자인 변동성·모션·밀도 다이얼 중심 스킬로만 설명하면 부족하다. 지금은 조사한 시각 방향 중 후보를 고르고, 대상에 맞는 아이디어와 실제 이미지를 확보한 뒤, 브라우저 검사와 스크린샷 비평을 반복하는 제작 과정이다. 이 부분은 Hallmark와 상당히 겹친다. [15]

| 항목 | Hallmark | Taste Skill |
| --- | --- | --- |
| 방향 선택 | 50개 테마 또는 custom | 조사한 20개 시각 방향 중 후보 선택 |
| 주요 검사 흐름 | 첫 화면 검사, 전체 페이지 검사, 별도 검토 | 브라우저 검사, 스크린샷 비평, 반복 수정 |
| 눈에 띄는 성향 | 테마·목적·강한 검사 기준을 통한 구성과 마감 | 아이디어·사진·구도·풍부한 모션을 통한 시각적 인상 |
| 앱 화면 | 별도 범위를 지원 | 별도 작업 과정과 규칙을 지원 |
| 시간·비용 해석 | 이 조사에서 비교 실측하지 않음 | 저자 안내상 전체 제작 약 30~45분, 수십만 토큰 |

근거: Hallmark 지침·범위 문서, Taste README·스킬 지침. [1], [10], [15], [16]

Taste의 **일반 페이지 모드**는 실제 움직이는 요소가 8개 미만이면 실패, 16개 미만이면 경고로 처리하도록 한다. 앱 화면에는 별도 규칙이 적용되므로 이 기준을 대시보드에 그대로 일반화하면 안 된다. [16]

저자의 시간·토큰 안내는 모든 실행의 보장 수치가 아니다. Hallmark가 더 빠르거나 저렴하다는 비교 실측 결과를 확인한 것도 아니다. [15]

**분석:** 강한 시각적 인상과 움직임을 원한다면 Taste가 매력적이다. 차분한 개발자 이력서나 절제된 제품 소개라면 Hallmark의 방향을 먼저 검토할 만하다.

### 5.3. Hallmark vs UI UX Pro Max

**비교의 중심: 화면 제작 과정과 디자인 기준 검색**

UI UX Pro Max의 실제 핵심 구현은 **로컬 CSV 자료를 검색하는 Python 도구와 규칙을 조합하는 생성기**다. 제품군·스타일·색상·타이포그래피 정보를 검색하고, 이를 디자인 시스템 추천으로 합친다. [18], [19]

조사 당시 지침에는 검색 가능한 79개 스타일, 192개 제품 팔레트·추론 프로필, 22개 기술 스택 등이 기재되어 있다. 기존 프로젝트에서 스택을 감지하고, 확인되지 않으면 임의로 가정하지 말라고 명시한다. React 전용이나 Tailwind 강제 스킬로 볼 수 없다. [17]

추천한 시스템을 공통 `MASTER.md`와 페이지별 차이로 저장하는 구조도 있다. 다만 생성기에 포함된 체크리스트와 일부 대비 계산을, 완성된 페이지를 브라우저에서 검사하는 기능과 동일하게 보면 안 된다. [19]

**분석:** 제품에 맞는 색·서체·UX 기준을 정하는 단계에는 Pro Max가 좋은 출발점이다. 그 기준으로 인상적인 첫 화면을 만들고 마감하는 단계에는 Hallmark의 제작 과정이 더 직접적이다.

### 5.4. Hallmark vs Awesome Design Skills

**비교의 중심: 종합 제작 과정과 선택해서 사용하는 스타일 프리셋**

Awesome Design Skills는 외부 링크만 모은 목록이 아니다. **실제로 67개 스타일의 SKILL.md와 DESIGN.md를 제공하는 설치 가능한 프리셋 모음**이다. 원하는 스타일을 골라 가져오는 구조다. [20]

확인한 Minimal 프리셋에는 색·글꼴·간격·접근성·컴포넌트 규칙과 검토 기준이 있다. 이런 기준은 에이전트에게 주는 지침이며 해당 파일 자체가 브라우저를 실행하는 검사기는 아니다. [21]

**분석:** 원하는 스타일을 찾거나 디자인 규칙 문서의 출발점을 얻기에 좋다. 페이지의 목적, 콘텐츠, 사용자 흐름, 실제 화면 검증까지 맡기려면 추가 작업 과정이 필요하다.

### 5.5. Hallmark vs Elaya AI Design Skills

**비교의 중심: 폭넓은 시각 방향과 특정한 랜딩 취향·Figma 작업**

Elaya의 랜딩 스킬은 **하나의 제안·하나의 고객층·하나의 주요 행동**을 먼저 정한다. 방문자의 거절 이유, 유입 경로, 증거 자료를 확인하고 카피와 페이지 구조를 결정한다. [23]

시각 규칙도 강하다. 예를 들어 히어로 제목에는 정해진 회색 계열 그라데이션을 사용하도록 하고, 간격·모서리·모션 등에 구체적인 기준을 적용한다. [23]

별도의 `figma-designer`는 Figma 변수, 텍스트 스타일, 자동 레이아웃, 컴포넌트 상태를 만드는 작업에 집중한다. 공식 Figma 스킬과 MCP 위에 추가하는 디자인 지침이므로 Figma 접근 기능 자체를 제공하는 것은 아니다. [24]

**분석:** Elaya의 예시 스타일이 마음에 들고 CTA·카피까지 함께 정리하고 싶다면 좋은 선택이다. 다양한 브랜드마다 다른 인상을 만들려면 Hallmark의 테마·커스텀 방향을 먼저 살펴볼 만하다. 편집 가능한 Figma 산출물이 필요하면 Elaya의 별도 강점이 생긴다.

### 5.6. Hallmark vs k-style-ui-ux

**비교의 중심: 웹 페이지의 인상과 한국 모바일 앱의 여러 화면·흐름**

k-style은 PRD를 받아 **여러 모바일 화면과 연결 관계를 한눈에 볼 수 있는 HTML 캔버스**를 만든다. 첫 제작 이후 오류·빈 상태·진행 중·확인 대화상자 같은 상태 화면을 확장하는 과정도 제공한다. [26]

공식 문서와 변경 기록에는 토큰·부품·누락 화면 검사뿐 아니라 글자의 실제 위치를 바탕으로 **한글 어절 쪼개짐과 칸 넘침을 검사하는 기능**도 설명되어 있다. 단순히 한국어로 작성된 디자인 가이드 이상의 특화다. 이 검사 기능은 공식 문서·변경 기록을 통해 확인했으며 이번 조사에서 검사기 자체를 실행 검증하지는 않았다. [25], [27]

**분석:** 한국어 예약 앱·커뮤니티·생활 서비스처럼 여러 화면의 흐름이 중요한 경우에는 k-style이 더 직접적인 선택일 수 있다. 브랜드 소개 페이지의 시각 방향과 마감을 정하는 작업에는 Hallmark가 더 잘 맞는다.

## 6. Hallmark의 장점과 한계

### 6.1. 장점

앞서 확인한 기능을 종합하면 다음 장점이 있다.

- **출발점이 구체적이다:** 테마와 시각 자료를 바탕으로 첫 방향을 결정할 수 있다.
- **목적과 콘텐츠를 먼저 다룬다:** 방문자가 할 일과 실제 제품 자료를 구성의 기준으로 삼는다.
- **제작과 검사가 연결되어 있다:** 첫 화면과 전체 페이지를 나누어 검토하고 수정한다.
- **기존 작업을 이어가기 위한 장치가 있다:** 토큰·design.md·리디자인 보존 검사를 활용한다.

### 6.2. 미적 취향 일부가 강제 규칙이다

Hallmark는 제목 위의 짧은 보조 라벨이나 특정 대문자 스타일 등을 금지한다. 일반 페이지에는 한 화면의 글 분량을 제한하는 규칙도 있다. 문서 자체가 일부 항목을 제작자의 고유 규칙으로 분류한다. [4]

따라서 **브랜드에 맞는 표현도 검사에서 문제로 잡힐 수 있다.** 규칙을 통과하는 데 집중하다 보면 필요한 정보나 의도적인 표현을 줄이는 방향으로 갈 가능성도 있다. 접근성·기능적 오류와 미적 취향을 구분해서 판단할 필요가 있다.

### 6.3. 전체 기능을 활용하려면 실행 환경이 필요하다

조사 당시 설치 안내는 Node 18 이상을 요구하며 브라우저 검사는 Chrome과 `puppeteer-core`가 필요하다. 이 환경이 없으면 정적 검사는 가능하지만 동일한 수준의 렌더링 검증을 수행하는 것은 아니다. [1]

Markdown 지침만 붙여 넣었을 때와 전체 도구를 실행했을 때의 효과를 구분해야 한다. 모델의 능력과 실행 환경에 따라 결과와 소요 시간도 달라질 수 있다.

### 6.4. 앱 화면을 지원하지만 심화 기능은 발전 중이다

Hallmark에는 대시보드·관리 화면용 별도 범위가 있고, 이때는 히어로·화면 글 분량·마케팅 섹션 관련 규칙을 제외한다. 따라서 랜딩 페이지밖에 만들 수 없다는 설명은 맞지 않는다. [10]

다만 전용 앱 검사 확대, 여러 페이지의 일관성을 더 세밀하게 관리하는 기능 등은 로드맵에도 남아 있다. 복잡한 제품 UI의 지속적인 운영까지 평가하려면 현재 지원 범위와 계획을 구분해야 한다. [11]

### 6.5. 인기도와 검사 통과가 최종 품질을 보장하지는 않는다

이 문서는 기능과 작업 방식의 비교다. 동일한 모델, 같은 요구사항, 동일한 자산과 실행 환경에서 수행한 비교 실험은 아니다. 따라서 다음과 같은 결론까지 확대해서는 안 된다.

- Hallmark가 모든 프로젝트에서 가장 좋은 결과를 만든다.
- Stars가 더 많은 스킬이 항상 더 높은 디자인 품질을 낸다.
- 검사 결과가 깨끗하면 사용자 경험과 전환율도 자동으로 좋아진다.
- Hallmark가 Taste보다 항상 빠르거나 저렴하다.

## 7. 작업 목적별 선택과 권장 조합

### 7.1. 목적별 추천

아래는 기능 구성과 제약을 바탕으로 한 추천이다.

| 지금 필요한 것 | 우선 선택 |
| --- | --- |
| 새 사이트의 인상을 정하고 첫 시안을 완성하고 싶다. | **Hallmark** |
| 이미 만든 사이트에서 어색한 부분을 계속 고치고 싶다. | **Impeccable** |
| 강한 시각적 개성과 풍부한 모션을 원한다. | **Taste Skill** |
| 제품에 맞는 디자인 시스템과 UX 규칙부터 정하고 싶다. | **UI UX Pro Max** |
| 여러 스타일을 비교하며 DESIGN.md의 출발점을 찾고 싶다. | **Awesome Design Skills** |
| 랜딩의 CTA·카피와 특정한 시각 스타일을 함께 정하고 싶다. | **Elaya landing-page-design** |
| 편집 가능한 Figma 시스템과 컴포넌트가 필요하다. | **Elaya figma-designer** |
| 한국어 모바일 앱의 전체 화면 흐름을 빠르게 검토하고 싶다. | **k-style-ui-ux** |

### 7.2. 여러 개를 사용한다면 역할을 나눈다

설치 자체를 하나로 제한할 필요는 없다. 다만 **하나의 작업에서 디자인 방향을 결정하는 주도 스킬은 하나로 정하는 편**을 권한다.

다음은 역할이 비교적 명확한 권장 작업 방식이다. 공식적으로 검증된 도구 간 자동 연동을 의미하지 않는다.

1. **Hallmark로 새 페이지의 방향과 첫 결과물을 만든다.**
2. 마음에 드는 시스템을 **design.md와 토큰으로 확정한다.**
3. 이후에는 **Impeccable로 특정 영역을 비평·검사·개선한다.**

Hallmark, Taste, Elaya의 시각 규칙을 같은 작업에 전부 강하게 적용하면 모션·타이포그래피·구성 기준이 엇갈릴 수 있다. 최종적으로 따를 프로젝트 규칙과 각 스킬의 담당 범위를 먼저 정하는 것이 좋다.

### 7.3. 개발자 포트폴리오와 HTML·Tailwind 작업에 대한 추천

**개발자 포트폴리오, 절제된 인터랙션, 순수 HTML 또는 Tailwind 기반 사이트가 주목적이라면 Hallmark와 Impeccable을 우선 선택할 만하다.**

새 디자인의 출발점은 Hallmark로 만들고, 실제 콘텐츠를 채우면서 계속 다듬는 과정은 Impeccable로 가져가는 구성이 유용하다. 이미 Impeccable을 사용하고 있다면 Hallmark를 추가했을 때 먼저 비교할 부분은 **새 페이지를 처음 만드는 과정에서 원하는 방향을 얼마나 빨리 얻는가**다.

---

## 8. 출처

모든 링크는 앞선 조사에 사용한 원문 주소다. main 브랜치와 공식 문서는 갱신될 수 있으므로 문서에 기록한 수치·기능은 **2026년 11월 2일 확인 내용**을 기준으로 읽어야 한다.

### Hallmark

- [1 — README: 기능 개요·설치·테마·라이선스·영감의 출처][1]
- [2 — SKILL.md: 전체 제작 과정과 기본 규칙][2]
- [3 — package.json: 버전 정보][3]
- [4 — gates.md: Floor·Reflex·Finish 검사 기준][4]
- [5 — anatomy.md: 방문자의 목적에 따른 페이지 구성][5]
- [6 — sloplint.mjs: 검사 도구 구현][6]
- [7 — design-md.md: 확정된 디자인 시스템 기록][7]
- [8 — export-formats.md: 토큰 내보내기 형식][8]
- [9 — redesign.md: 리디자인과 기존 기능 보존][9]
- [10 — flow.md: 앱·컴포넌트 범위와 작업 분기][10]
- [11 — ROADMAP.md: 현재 지원 범위와 향후 계획][11]

### Impeccable

- [12 — README: 개선 명령과 프로젝트 개요][12]
- [13 — Detector 문서: 소스·렌더링·디자인 시스템 검사][13]
- [14 — Context 문서: PRODUCT.md·DESIGN.md 관리][14]

### Taste Skill

- [15 — README: 제작 과정·예상 시간·토큰 사용량][15]
- [16 — SKILL.md: 페이지·앱 분기, 모션 기준과 검사][16]

### UI UX Pro Max

- [17 — SKILL.md: 디자인 데이터·기술 스택·사용 지침][17]
- [18 — core.py: 로컬 검색 엔진][18]
- [19 — design_system.py: 디자인 시스템 추천과 문서 생성][19]

### Awesome Design Skills

- [20 — README: 스타일 프리셋과 설치 구조][20]
- [21 — Minimal SKILL.md: 실제 프리셋 예시][21]

### Elaya AI Design Skills

- [22 — README: 제공 스킬 목록][22]
- [23 — landing-page-design: 전략·카피·시각 규칙][23]
- [24 — figma-designer: Figma 시스템·컴포넌트 작업 지침][24]

### k-style-ui-ux

- [25 — README: 목적·산출물·검사 개요][25]
- [26 — 플러그인 README: 명령·사용자 흐름·캔버스][26]
- [27 — CHANGELOG.md: 한글 줄바꿈과 화면 검사 관련 변경][27]

### GitHub 인기도 조회

- [28 — Hallmark 저장소 API][28]
- [29 — Impeccable 저장소 API][29]
- [30 — Taste Skill 저장소 API][30]
- [31 — UI UX Pro Max 저장소 API][31]
- [32 — Elaya AI Design Skills 저장소 API][32]

[1]: https://github.com/Nutlope/hallmark
[2]: https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/SKILL.md
[3]: https://github.com/Nutlope/hallmark/blob/main/package.json
[4]: https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/gates.md
[5]: https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/anatomy.md
[6]: https://raw.githubusercontent.com/Nutlope/hallmark/main/skills/hallmark/scripts/sloplint.mjs
[7]: https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/design-md.md
[8]: https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/export-formats.md
[9]: https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/redesign.md
[10]: https://github.com/Nutlope/hallmark/blob/main/skills/hallmark/references/flow.md
[11]: https://github.com/Nutlope/hallmark/blob/main/ROADMAP.md
[12]: https://github.com/pbakaus/impeccable/blob/main/README.md
[13]: https://impeccable.style/docs/detector/
[14]: https://impeccable.style/docs/context/
[15]: https://raw.githubusercontent.com/Leonxlnx/taste-skill/main/README.md
[16]: https://raw.githubusercontent.com/Leonxlnx/taste-skill/main/skills/taste-skill/SKILL.md
[17]: https://raw.githubusercontent.com/nextlevelbuilder/ui-ux-pro-max-skill/main/.claude/skills/ui-ux-pro-max/SKILL.md
[18]: https://raw.githubusercontent.com/nextlevelbuilder/ui-ux-pro-max-skill/main/src/ui-ux-pro-max/scripts/core.py
[19]: https://raw.githubusercontent.com/nextlevelbuilder/ui-ux-pro-max-skill/main/src/ui-ux-pro-max/scripts/design_system.py
[20]: https://github.com/bergside/awesome-design-skills
[21]: https://github.com/bergside/awesome-design-skills/blob/main/skills/minimal/SKILL.md
[22]: https://github.com/elayadesign/ai-design-skills
[23]: https://raw.githubusercontent.com/elayadesign/ai-design-skills/main/skills/landing-page-design/SKILL.md
[24]: https://github.com/elayadesign/ai-design-skills/blob/main/skills/figma-designer/SKILL.md
[25]: https://github.com/vmc-inner-circle/k-style-ui-ux
[26]: https://github.com/vmc-inner-circle/k-style-ui-ux/blob/main/plugins/k-style-ui-ux/README.md
[27]: https://github.com/vmc-inner-circle/k-style-ui-ux/blob/main/CHANGELOG.md
[28]: https://api.github.com/repos/Nutlope/hallmark
[29]: https://api.github.com/repos/pbakaus/impeccable
[30]: https://api.github.com/repos/Leonxlnx/taste-skill
[31]: https://api.github.com/repos/nextlevelbuilder/ui-ux-pro-max-skill
[32]: https://api.github.com/repos/elayadesign/ai-design-skills
