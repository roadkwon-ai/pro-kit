# 선택 스킬 묶음

> 한눈에: 기본으로는 모든 프로젝트가 쓰는 스킬만 설치해요. 일부 프로젝트만 쓰는 공식 스킬은 묶음으로 나눠 두고, 필요할 때 명령 한 줄로 더해요. **묶음이 없는데 그 분야를 요청하면 에이전트가 설치를 먼저 제안해요.**

## 묶음 <!-- v:optional.count.ko -->다섯<!-- /v --> 가지

| 묶음 | 이럴 때 | 스킬 | 관련 prokit 스킬 |
|---|---|---|---|
| `ops` | 배포한 서비스의 비용과 성능을 Vercel 지표로 점검할 때. 경로별 권고에는 유료 Observability Plus가 필요해요 | <!-- v:optional.ops.skillsCode.shared -->`vercel-optimize`<!-- /v --> | `prokit-deploy` |
| `ops` (neon만) | Neon에서 오래 도는 함수, 파일 저장, LLM 호출을 쓸 때. 새 서비스에 의존하게 되므로 도입 전에 사용자에게 묻고 ADR(설계 결정 기록)로 남겨요 | <!-- v:optional.ops.skillsCode.neonOnly -->`neon-functions`, `neon-object-storage`, `neon-ai-gateway`<!-- /v --> | `prokit-db` |
| `motion` | 화면 전환이나 공유 요소 애니메이션(React `<ViewTransition>`)을 만들 때 | <!-- v:optional.motion.skillsCode -->`vercel-react-view-transitions`<!-- /v --> | `prokit-ui` |
| `mobile` | React Native·Expo 모바일 앱을 따로 만들 때. 템플릿은 웹 앱만 만들어요 | <!-- v:optional.mobile.skillsCode -->`vercel-react-native-skills`<!-- /v --> | `prokit-dev-cycle` |
| `i-have-adhd` | 다음 행동부터, 번호 단계로 짧게 답받고 싶을 때. `/i-have-adhd`로 켤 때만 대화 답에 적용해요([두뇌와 선택 스킬](brains.md)) | `i-have-adhd` | `prokit-dev-cycle` |
| `taste` | 랜딩·소개처럼 보여 주는 화면을 갤러리 사이트에서 뽑은 방향, 공개 아카이브 사진, 실제 브라우저 검사로 만들고 싶을 때. 사용자가 고른 화면에만 쓰고, 검사에는 Chrome이 필요해요([두뇌와 선택 스킬](brains.md#화면-디자인-보조)) | <!-- v:optional.taste.skillsCode -->`design-taste-frontend`<!-- /v --> | `prokit-ui` |

## 묶음마다 언제, 어떻게

> [!TIP]
> 묶음을 더하려면 프로젝트 세션에서 말로 요청하면 돼요.

`prokit-skills-manage`가 열린 작업을 닫은 뒤 한 번의 작업(케이스 H 라운드)으로 설치하고 커밋해요(진행 방식은 [두뇌와 선택 스킬](brains.md#바꾸기)). 명령으로 직접 하려면 아래 "설치하기"의 `pnpm skills:setup --optional <묶음>`을 써요. 설치한 뒤에는 새 세션을 열어요.

| 묶음 | 더하면 좋을 때 | 이렇게 요청해요(예시) | 바뀌는 것 |
|---|---|---|---|
| `ops` | 이미 배포한 서비스의 비용과 성능을 점검하고 싶을 때. neon은 오래 도는 함수, 파일 저장, LLM 호출도 쓸 때 | "ops 선택 스킬 묶음 더해줘" | 점검 스킬이 설치돼 `prokit-deploy`(neon의 Neon 스킬은 `prokit-db`)가 읽어요. Neon 서비스를 새로 쓰기 전에는 사용자에게 묻고 ADR로 남겨요 |
| `motion` | 화면 전환이나 요소가 이어지는 애니메이션을 만들고 싶을 때 | "motion 묶음 더해줘" | React `<ViewTransition>` 스킬이 설치돼 `prokit-ui`가 화면 작업에서 읽어요 |
| `mobile` | 이 웹 앱과 별개로 React Native·Expo 모바일 앱을 만들 때 | "mobile 묶음 더해줘" | 모바일 앱 스킬이 설치돼요. 템플릿 자체는 웹 앱만 만들어요 |
| `i-have-adhd` | 긴 설명 대신 다음 행동부터, 번호 단계로 짧게 답받고 싶을 때 | "i-have-adhd 더해줘" | 설치만으로는 답이 바뀌지 않아요. `/i-have-adhd`(Codex는 `$i-have-adhd`)로 켜고 "stop adhd mode"로 꺼요. 파일과 라운드 보고는 프로킷 형식 그대로예요 |
| `taste` | 랜딩, 소개, 포트폴리오처럼 보여 주는 화면의 완성도를 높이고 싶을 때 | "taste 묶음 더해줘" | `design-taste-frontend`가 설치돼요. 화면 요청에 "taste로"라고 한 화면에만 쓰고, 검사에 Chrome, Edge, Chromium 중 하나가 필요해요. 작업 기록은 `.taste-skill/`에 남고 커밋하지 않아요 |

> [!NOTE]
> 필요 없어졌으면 "taste 지워줘"처럼 요청하거나 `pnpm skills:setup --drop taste`를 실행해요.

묶음이 없는데 그 분야를 요청하면 에이전트가 설치를 먼저 제안해요. 설치된 묶음이 `pnpm skills:check`의 `선택 스킬:` 줄에 보이는지 확인해요.

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
- **템플릿마다 다른 `ops`**: neon의 `ops`는 4개(`vercel-optimize`와 Neon 3개), supabase의 `ops`는 `vercel-optimize` 1개예요.

## 관련 문서

- [공식 스킬과 연결](official-skills.md)
- [두뇌와 선택 스킬](brains.md)
- [설치와 업데이트 구조](install-and-update.md)
- [Vercel 배포와 되돌리기](../deploy/vercel.md)
