# 선택 스킬 묶음

> 한눈에: 기본으로는 모든 프로젝트가 쓰는 스킬만 설치해요. 일부 프로젝트만 쓰는 공식 스킬은 묶음으로 나눠 두고, 필요할 때 명령 한 줄로 더해요. **묶음이 없는데 그 분야를 요청하면 에이전트가 설치를 먼저 제안해요.**

## 묶음 목록

| 묶음 | 이럴 때 | 스킬 | 관련 prokit 스킬 |
|---|---|---|---|
| `ops` | 배포한 서비스의 비용과 성능을 Vercel 지표로 점검할 때. 경로별 권고에는 유료 Observability Plus가 필요해요 | <!-- v:optional.ops.skillsCode.shared -->`vercel-optimize`<!-- /v --> | `prokit-deploy` | <!-- edition:pro -->
| `ops` (neon만) | Neon에서 오래 도는 함수, 파일 저장, LLM 호출을 쓸 때. 새 서비스에 의존하게 되므로 도입 전에 사용자에게 묻고 ADR(설계 결정 기록)로 남겨요 | <!-- v:optional.ops.skillsCode.neonOnly -->`neon-functions`, `neon-object-storage`, `neon-ai-gateway`<!-- /v --> | `prokit-db` | <!-- edition:pro -->
| `motion` | 화면 전환이나 공유 요소 애니메이션(React `<ViewTransition>`)을 만들 때 | <!-- v:optional.motion.skillsCode -->`vercel-react-view-transitions`<!-- /v --> | `prokit-ui` |
| `mobile` | React Native·Expo 모바일 앱을 따로 만들 때. 템플릿은 웹 앱만 만들어요 | <!-- v:optional.mobile.skillsCode -->`vercel-react-native-skills`<!-- /v --> | `prokit-dev-cycle` |
| `i-have-adhd` | 다음 행동부터 번호 단계로 짧은 답을 받고 싶을 때. `/i-have-adhd`로 켤 때만 대화 답에 적용해요([두뇌와 선택 스킬](brains.md)) | `i-have-adhd` | `prokit-dev-cycle` |
| `taste` | 랜딩·소개처럼 보여 주는 화면을 갤러리 사이트에서 뽑은 방향, 공개 아카이브 사진, 실제 브라우저 검사로 만들고 싶을 때. 사용자가 고른 화면에만 쓰고, 검사에는 Chrome이 필요해요([두뇌와 선택 스킬](brains.md#화면-디자인-보조)) | <!-- v:optional.taste.skillsCode -->`design-taste-frontend`<!-- /v --> | `prokit-ui` |
| `landing` | 가입, 구매, 신청 하나를 이끄는 랜딩을 만들 때. 인테이크 질문, 페이지 구조, 전환 카피를 함께 정하고, 검색에 나올 랜딩이면 제목과 설명(메타데이터)을 넣어요 | <!-- v:optional.landing.skillsCode -->`landing-page-design`<!-- /v --> | `prokit-ui` |
| `tastemaker` | 레퍼런스 이미지나 좋아하는 사이트의 색과 디자인 값을 뽑아 고정하고, 다음 화면도 같은 값으로 만들 때. `python3`이 필요해요 | <!-- v:optional.tastemaker.skillsCode -->`tastemaker`<!-- /v --> | `prokit-ui` |
| `web-design-engineer` | "Linear처럼" 같은 스타일 레시피로 방향을 잡거나, 화면을 5개 차원으로 채점받고 싶을 때 | <!-- v:optional.web-design-engineer.skillsCode -->`web-design-engineer`<!-- /v --> | `prokit-ui` |
| `awwwards` | 브랜드, 포트폴리오, 행사 페이지를 스크롤 스토리텔링과 모션 중심으로 만들 때 | <!-- v:optional.awwwards.skillsCode -->`build-awwwards-quality-sites`<!-- /v --> | `prokit-ui` |
| `animation` | 버튼, 드롭다운, 폼 제출 같은 작은 상호작용의 모션을 정하고, 코드베이스의 모션을 점검할 때 | <!-- v:optional.animation.skillsCode -->`emil-design-eng`, `animate`, `improve-animations`, `apple-design`, `animation-vocabulary`<!-- /v --> | `prokit-ui` |
| `visual-critique` | 화면을 7개 차원(위계, 브랜드, 구성, 타이포, 색, 어포던스, 정보 밀도)으로 비평받고 P1\~P3로 고칠 것을 정할 때 | `critique-*` <!-- v:optional.visual-critique.count.neon -->7<!-- /v -->개 | `prokit-ui` |
| `ui-design` | 게슈탈트·지각 법칙과 간격, 타입, 그리드, 색 체계로 화면을 설계하고 점검할 때. 화면이 많은 앱에 맞아요 | `law-of-proximity`, `spacing-system` 등 <!-- v:optional.ui-design.count.neon -->19<!-- /v -->개 | `prokit-ui` |

## 묶음마다 언제, 어떻게

> [!TIP]
> 묶음을 더하려면 프로젝트 세션에서 말로 요청하면 돼요.

`prokit-skills-manage`가 열린 작업을 닫은 뒤 한 번의 작업(케이스 H 라운드)으로 설치하고 커밋해요(진행 방식은 [두뇌와 선택 스킬](brains.md#바꾸기)). 명령으로 직접 하려면 아래 "설치하기"의 `pnpm skills:setup --optional <묶음>`을 써요. 설치한 뒤에는 새 세션을 열어요.

| 묶음 | 더하면 좋을 때 | 이렇게 요청해요(예시) | 바뀌는 것 |
|---|---|---|---|
| `ops` | 이미 배포한 서비스의 비용과 성능을 점검하고 싶을 때. neon은 오래 도는 함수, 파일 저장, LLM 호출도 쓸 때 | "ops 선택 스킬 묶음 더해줘" | 점검 스킬이 설치돼 `prokit-deploy`(neon의 Neon 스킬은 `prokit-db`)가 읽어요. Neon 서비스를 새로 쓰기 전에는 사용자에게 묻고 ADR로 남겨요 | <!-- edition:pro -->
| `motion` | 화면 전환이나 요소가 이어지는 애니메이션을 만들고 싶을 때 | "motion 묶음 더해줘" | React `<ViewTransition>` 스킬이 설치돼 `prokit-ui`가 화면 작업에서 읽어요 |
| `mobile` | 이 웹 앱과 별개로 React Native·Expo 모바일 앱을 만들 때 | "mobile 묶음 더해줘" | 모바일 앱 스킬이 설치돼요. 템플릿 자체는 웹 앱만 만들어요 |
| `i-have-adhd` | 긴 설명 대신 다음 행동부터 번호 단계로 짧은 답을 받고 싶을 때 | "i-have-adhd 더해줘" | 설치만으로는 답이 바뀌지 않아요. `/i-have-adhd`(Codex는 `$i-have-adhd`)로 켜고 "stop adhd mode"로 꺼요. 파일과 라운드 보고는 프로킷 형식 그대로예요 |
| `taste` | 랜딩, 소개, 포트폴리오처럼 보여 주는 화면의 완성도를 높이고 싶을 때 | "taste 묶음 더해줘" | `design-taste-frontend`가 설치돼요. 화면 요청에 "taste로"라고 한 화면에만 쓰고, 검사에 Chrome, Edge, Chromium 중 하나가 필요해요. 작업 기록은 `.taste-skill/`에 남고 커밋하지 않아요 |
| 화면 디자인 보조(`landing` 등) | 화면 작업에 랜딩 전략, 레퍼런스 고정, 모션, 화면 비평을 더하고 싶을 때 | "랜딩 조합으로 해줘", "애니메이션 보조 더해줘", "visual-critique 더해줘" | 고른 묶음의 스킬이 설치돼요. `prokit-ui`가 묶음마다 정한 단계(설계, 개발, 리뷰)에서만 써요. 아래 "화면 디자인 보조 조합"을 보세요 |

> [!NOTE]
> 필요 없어졌으면 "taste 지워줘"처럼 요청하거나 `pnpm skills:setup --drop taste`를 실행해요.

묶음이 없는데 그 분야를 요청하면 에이전트가 설치를 먼저 제안해요. 설치된 묶음이 `pnpm skills:check`의 `선택 스킬:` 줄에 보이는지 확인해요.

## 화면 디자인 보조 조합

`taste`와 위 화면 디자인 보조 묶음은 주 UI 스킬(impeccable, hallmark)의 단계에 더하는 **화면 디자인 보조**예요. 주 UI 스킬을 대신하지 않고, 화면 설계 확인, 리뷰·감사와 통과 기준은 그대로예요.

> [!IMPORTANT]
> 모두 설치하지 않아요. 방향을 정하는 보조(`landing`, `tastemaker`, `taste`, 레시피로 쓰는 `web-design-engineer`)는 규칙이 서로 달라 **한 화면에 하나만** 써요. 모션과 검수 보조는 함께 써요.

아래 조합 하나로 시작해 필요할 때 묶음을 하나씩 더하고 빼요. 표는 hallmark를 주 UI 스킬로 두고 정했어요. impeccable이 주 UI 스킬이면 `critique`가 비슷한 일을 하므로 `visual-critique`는 빼도 돼요.

| 조합 | 이럴 때 | 묶음 |
|---|---|---|
| 기본 | MVP로 시작해 기능 화면을 하나씩 더하고, 따로 원하는 시각 방향이 없을 때 | `visual-critique` |
| 랜딩 | 주 화면이 가입, 구매, 신청 하나를 이끄는 랜딩일 때 | `landing`, `animation`, `visual-critique` |
| 레퍼런스 | 레퍼런스 이미지나 좋아하는 사이트를 주고 "이런 느낌"을 원할 때 | `tastemaker`, `visual-critique` |
| 쇼케이스 | 브랜드 소개, 포트폴리오, 행사처럼 몰입감 있는 페이지를 원할 때 | `awwwards`, `animation`, `visual-critique` |
| 앱 정돈 | 로그인 뒤 화면이 많고 간격, 타입, 색을 점수로 관리하고 싶을 때 | `ui-design`, `web-design-engineer` |

```bash
pnpm skills:setup --optional landing,animation,visual-critique   # 랜딩 조합
pnpm skills:setup --drop animation                               # 묶음 하나만 빼기
```

처음 들일 때(`prokit-init`)는 UI 스킬을 고른 뒤 PRD에 맞는 조합을 `(추천)`으로 보여 주고 물어요. 화면 브리프에는 그 화면에 쓰는 보조를 `보조:` 줄로 적어요. 검수 보조(`visual-critique`, `ui-design`)는 설치되어 있으면 브리프를 쓰는 화면마다 리뷰에 써요(impeccable이 주 UI 스킬이면 `visual-critique`는 요청할 때만). 디자인 리뷰 증거에 보조마다 결과나 `<보조> 미실행: 사유`가 없으면 audit이 막아요. 묶음마다 어느 단계에서 무엇을 하는지는 템플릿의 `prokit-ui` "화면 디자인 보조"와 묶음마다의 단계 지도(`references/addon-<묶음>.md`)에 있어요.

> [!NOTE]
> 보조 스킬은 모두 영어로 쓰여 있고, UI 작업이면 스스로 불리게 쓰인 것이 많아요. 프로킷은 브리프의 `보조:` 줄에 없는 화면에서 불리면 따르지 않고, 서체, 색, 의존성은 `DESIGN.md`와 토큰 규칙을 먼저 따라요(예: `landing`의 영문 서체 목록 대신 한글 서체).

## 설치하기

```bash
pnpm skills:setup --optional ops,motion   # 빠진 기본 스킬과 고른 묶음을 설치. 여러 묶음은 쉼표로 잇는다
pnpm skills:check                         # 기본 스킬만 검사하고, 선택 묶음은 설치 여부만 보여 준다
```

> [!IMPORTANT]
> 묶음을 설치한 뒤에도 관련 `prokit-*` 스킬의 규칙이 우선해요.

## 자세히

- **목록 위치**: 묶음은 `skills.manifest.json`의 `optional`에 있어요. 설치기(`install.sh`)는 `--optional <묶음>`을 줄 때만 선택 묶음을 설치해요. 설치한 뒤에는 `pnpm skills:setup --optional <묶음>`으로 더해요.
- **팀원 클론**: 선택 묶음을 쓰는 프로젝트를 클론했다면 `pnpm skills:setup --optional <묶음>`으로 같은 묶음을 받아요.
- **템플릿마다 다른 `ops`**: neon의 `ops`는 4개(`vercel-optimize`와 Neon 3개), supabase의 `ops`는 `vercel-optimize` 1개예요. <!-- edition:pro -->

## 관련 문서

- [공식 스킬과 연결](official-skills.md)
- [두뇌와 선택 스킬](brains.md)
- [설치와 업데이트 구조](install-and-update.md)
- [Vercel 배포와 되돌리기](../deploy/vercel.md)
