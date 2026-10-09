# 선택 스킬 묶음
https://prokit-web.vercel.app/docs/skills/optional-bundles/

> 한눈에: 기본으로는 모든 프로젝트가 쓰는 스킬만 설치해요. 일부 프로젝트만 쓰는 공식 스킬은 묶음으로 나눠 두고, 필요할 때 명령 한 줄로 더해요. 묶음이 없는데 그 분야를 요청하면 에이전트가 설치를 먼저 제안해요.

## 묶음 세 가지

| 묶음 | 이럴 때 | 스킬 | 관련 prokit 스킬 |
|---|---|---|---|
| `ops` | 배포한 서비스의 비용과 성능을 Vercel 지표로 점검할 때. 경로별 권고에는 유료 Observability Plus가 필요해요 | `vercel-optimize` | `prokit-deploy` |
| `ops` (neon만) | Neon에서 오래 도는 함수, 파일 저장, LLM 호출을 쓸 때. 새 서비스에 의존하게 되므로 도입 전에 사용자에게 묻고 ADR(설계 결정 기록)로 남겨요 | `neon-functions`, `neon-object-storage`, `neon-ai-gateway` | `prokit-db` |
| `motion` | 화면 전환이나 공유 요소 애니메이션(React `<ViewTransition>`)을 만들 때 | `vercel-react-view-transitions` | `prokit-ui` |
| `mobile` | React Native·Expo 모바일 앱을 따로 만들 때. 템플릿은 웹 앱만 만들어요 | `vercel-react-native-skills` | `prokit-dev-cycle` |

## 설치하기

```bash
pnpm skills:setup --optional ops,motion   # 빠진 기본 스킬과 고른 묶음을 설치. 여러 묶음은 쉼표로 잇는다
pnpm skills:check                         # 기본 스킬만 검사하고, 선택 묶음은 설치 여부만 보여 준다
```

## 자세히

- **목록 위치**: 묶음은 `skills.manifest.json`의 `optional`에 있어요. 설치기(`install.sh`)는 선택 묶음을 설치하지 않아요. 설치한 뒤 `pnpm skills:setup --optional <묶음>`으로 더해요.
- **규칙의 우선순위**: 묶음을 설치한 뒤에도 관련 `prokit-*` 스킬의 규칙이 우선해요.
- **팀원 클론**: 선택 묶음을 쓰는 프로젝트를 클론했다면 `pnpm skills:setup --optional <묶음>`으로 같은 묶음을 받아요.
- **템플릿마다 다른 `ops`**: neon의 `ops`는 4개(`vercel-optimize`와 Neon 3개), supabase의 `ops`는 `vercel-optimize` 1개예요.

## 관련 문서

- [공식 스킬과 연결](https://prokit-web.vercel.app/docs/skills/official-skills/)
- [설치와 업데이트 구조](https://prokit-web.vercel.app/docs/skills/install-and-update/)
- [Vercel 배포와 되돌리기](https://prokit-web.vercel.app/docs/deploy/vercel/)
