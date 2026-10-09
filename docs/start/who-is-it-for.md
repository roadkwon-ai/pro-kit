# 이런 분께 추천해요
https://prokit-web.vercel.app/docs/start/who-is-it-for/

> 한눈에: 프로킷은 AI 에이전트로 서비스를 만들고 싶지만 결과를 혼자 확인하기 어려운 사람에게 맞아요. **에이전트가 프로 개발자의 순서와 검사를 지키게 해서, 내가 직접 챙길 일이 줄어요.** 대신 확인을 마쳐야 끝나서 그냥 맡길 때보다 시간이 더 들어요.

## 추천하는 분

| 이런 분 | 지금 고민 | 프로킷이 주는 것 | 시작하기 |
|---|---|---|---|
| 처음 만들어 보는 사람 | AI가 만든 화면이 제대로 동작하는지 혼자 판단하기 어려워요 | 컨셉 한두 문장으로 모든 페이지를 만들고, 링크와 버튼을 모두 눌러 본 뒤 HTML로 내보내요 | [컨셉으로 화면 만들기](https://prokit-web.vercel.app/tutorials/samples/) · [고루](https://prokit-web.vercel.app/tutorials/samples/goru/) |
| 기획자·디자이너 | 화면마다 색과 글꼴이 달라져 결과를 그대로 쓰기 어려워요 | 어울리는 스타일 1\~3위를 추천받아 `DESIGN.md` 하나로 정하고, 그림을 그릴 수 있으면 첫 화면 시안 세 장을 비교해 골라요 | [UI/UX 흐름](https://prokit-web.vercel.app/docs/design/ui-flow/) · [DESIGN.md](https://prokit-web.vercel.app/docs/design/design-md/) |
| 1인 개발자·작은 팀 | 거의 맞는 코드를 고치느라 시간이 들고, 세션이 바뀌면 맥락이 사라져요 | 로그인·DB·배포를 갖춘 템플릿 위에서 작업마다 할 일 목록과 실행 증거를 남기고, 만들지 않은 에이전트가 따로 리뷰해요 | [빠른 시작: 서비스 만들기](https://prokit-web.vercel.app/docs/start/quickstart-service/) · [Claudle 튜토리얼](https://prokit-web.vercel.app/tutorials/claudle/) |
| 배우는 개발자 | AI가 짠 코드를 이해하지 못한 채 다음으로 넘어가요 | 설계 확인, 구현, 검사, 리뷰로 이어지는 프로 개발자의 순서를 라운드마다 남는 기록으로 보며 따라가요 | [Nextflix 튜토리얼](https://prokit-web.vercel.app/tutorials/nextflix/) · [dev-cycle 라운드](https://prokit-web.vercel.app/docs/concepts/dev-cycle/) |
| 가르치는 사람 | 학생이 무엇을 만들고 무엇을 확인했는지 함께 점검하기 어려워요 | 장마다 같은 프롬프트와 성공 기준이 있고, 라운드마다 실행한 검사가 기록으로 남아요 | [튜토리얼](https://prokit-web.vercel.app/tutorials/) |
| 팀·외주 작업자 | 사람마다 AI를 쓰는 방식이 달라 결과가 들쭉날쭉해요 | 프로젝트마다 같은 규칙, 스킬, 리뷰 에이전트, 비밀값 검사를 설치하고 템플릿이 바뀌면 차이를 보고 반영해요. MIT라 고객 프로젝트에도 써요 | [하네스 엔지니어링](https://prokit-web.vercel.app/docs/concepts/harness/) · [기존 프로젝트에 갱신 반영](https://prokit-web.vercel.app/docs/templates/update-existing/) |

## 이런 분께는 맞지 않아요

| 맞지 않을 때 | 이유 |
|---|---|
| 몇 분 만에 결과만 받고 싶을 때 | 검사와 확인을 마쳐야 끝나서 그냥 맡길 때보다 오래 걸려요. 가장 작은 프리셋(고루, 7쪽)도 프리셋 팩으로 만들 때 한 번에 완성하면 약 1시간\~2시간(여러 번 고쳐 달라고 하면 약 3시간까지) 걸려요 |
| 웹이 아닌 앱을 만들 때 | 템플릿은 Next.js 웹 앱만 만들어요. 모바일 앱은 [선택 스킬 묶음](https://prokit-web.vercel.app/docs/skills/optional-bundles/)으로 따로 만들어요 |
| 준비물이나 사용량이 부담될 때 | Node, pnpm, git이 있어야 하고 서비스까지 만들려면 컨테이너 엔진도 필요해요([준비물](https://prokit-web.vercel.app/docs/start/requirements/)). Windows는 WSL2에서만 돼요. 큰 프리셋은 [5시간 한도](https://prokit-web.vercel.app/tutorials/reference/costs-and-keys/#5시간-한도에-걸리면)에 여러 번 걸려요 |

## 프로킷 없이와 프로킷으로

| 할 일 | 프로킷 없이 | 프로킷으로 | 근거 |
|---|---|---|---|
| 시작 준비 | 앱 뼈대를 만든 뒤 규칙, 분야별 지식, 확인 절차를 직접 채워요 | 프롬프트 한 줄로 프로젝트를 만들고 스킬과 검사 도구까지 설치해요(약 3.2분) | [템플릿이 더하는 것](https://prokit-web.vercel.app/docs/templates/what-it-adds/) |
| 기획과 화면 설계 | 화면 규칙을 지킨 비율 12% | 설계를 먼저 확인받아요. 100% | [검증 결과](https://prokit-web.vercel.app/docs/reference/verification/#스킬이-있을-때와-없을-때) |
| 디자인 | 브랜드 이름과 대표 색만 주면 목표 색과 맞는 비율 71% | 고른 스타일을 `DESIGN.md`로 정해 두고 따라요. 99% | [DESIGN.md 효과](https://github.com/roadkwon-ai/pro-kit/blob/main/templates/prokit-next-neon/VERIFICATION.md#designmd-효과-측정-2026-09-30-추가) |
| 작업 진행 | 진행 규칙을 지킨 비율 27% | 할 일 목록(대조표)의 칸마다 실행 증거를 남겨요. 93% | [검증 결과](https://prokit-web.vercel.app/docs/reference/verification/#스킬이-있을-때와-없을-때) |
| 데이터와 보안 | API 규칙 56%, DB 규칙 38%. 데이터 주인 확인과 DB 변경 순서를 직접 챙겨요 | 스킬이 데이터 주인 확인과 DB 변경 순서를 챙겨요. API 규칙 100%, DB 규칙 100% | [검증 결과](https://prokit-web.vercel.app/docs/reference/verification/#스킬이-있을-때와-없을-때) · [하는 일](https://prokit-web.vercel.app/docs/start/what-is-prokit/#누구나-전문-개발자처럼) |
| 검사와 리뷰 | 검사 규칙 71%. 리뷰는 직접 하거나 만든 에이전트가 스스로 해요 | 실행 결과가 모여야 끝나고 리뷰는 다른 에이전트가 해요. 100% | [검증 결과](https://prokit-web.vercel.app/docs/reference/verification/#스킬이-있을-때와-없을-때) · [하는 일](https://prokit-web.vercel.app/docs/start/what-is-prokit/#누구나-전문-개발자처럼) |
| 모든 페이지 확인 | 페이지마다 링크와 버튼을 직접 눌러 봐요 | 자동으로 모두 눌러 봐요. 화면 프리셋 9개, 337쪽에서 없는 페이지·브라우저 오류·반응 없는 버튼이 0이었어요 | [검증 결과](https://prokit-web.vercel.app/docs/reference/verification/#화면-프리셋) |
| 배포 | 비밀값이 섞이지 않게 막고, 되돌리는 법까지 직접 챙겨요 | 검사, 비밀값 막기, 되돌리기를 배포 절차가 챙겨요 | [하는 일](https://prokit-web.vercel.app/docs/start/what-is-prokit/#누구나-전문-개발자처럼) |
| 다음에 이어 하기 | 세션이 바뀌면 맥락과 진행 상황을 다시 알려 줘요 | "하던 작업 이어서 해줘"로 멈춘 곳부터 해요 | [시간을 줄이는 법](https://prokit-web.vercel.app/tutorials/reference/process-and-time/#시간을-줄이는-법) · [하는 일](https://prokit-web.vercel.app/docs/start/what-is-prokit/#그냥-ai에게-맡길-때와-다른-점) |

%는 같은 요청 13개를 스킬이 있을 때와 없을 때로 나눠 맡기고, 프로킷 규칙을 지켰는지 체크 항목 52개로 채점한 비율이에요. 코드 품질 점수는 아니에요. "프로킷 없이" 칸의 %는 그 스킬만 뺀 같은 프로젝트(규칙 문서와 다른 스킬은 그대로)에서, 디자인 줄은 프로킷 규칙은 따르되 `DESIGN.md` 없이 브랜드 이름과 대표 색만 줬을 때 서비스 4개에서 잰 값이에요. **프로킷을 전혀 쓰지 않을 때를 잰 것은 아니에요.**

대신 시간이 더 들어요. 확인을 마쳐야 끝나서, 올곧은 만들기 시간의 60%가 모든 페이지 확인이었어요([시간이 어디에 쓰이나요](https://prokit-web.vercel.app/tutorials/reference/process-and-time/#시간이-어디에-쓰이나요)).

## 실제 사례

| 사례 | 무엇을 했나 | 숫자 | 기록 |
|---|---|---|---|
| 올곧 | 입시학원 웹 앱 203쪽(48종)을 같은 흐름으로 만들고 모든 페이지의 링크와 버튼을 눌러 봤어요 | 눌러 본 링크와 버튼 2,025번 · 식단표 한 줄 고치기는 고치기 1분, 앞뒤 확인 6분 | [올곧](https://prokit-web.vercel.app/tutorials/samples/olgot/) |
| Claudle | 실제 서비스를 둘러보는 리서치부터 프리셋 팩, 모든 화면, 공개 전 손보기까지 했어요. 공개 전 손보기에서 리뷰 에이전트의 지적까지 고쳤어요 | 리서치부터 끝까지 약 7시간 55분 · 공개 전 두 군데 손보기 약 28분 | [Claudle을 리서치부터 만든 시간](https://prokit-web.vercel.app/tutorials/reference/process-and-time/#claudle을-리서치부터-만든-시간) |
| 같은 요청 비교 | 같은 요청을 스킬과 `DESIGN.md`가 있을 때와 없을 때로 나눠 맡기고 채점했어요 | 화면 설계 12% → 100% · 작업 진행 27% → 93% · 목표 색 71% → 99% | [검증 결과](https://prokit-web.vercel.app/docs/reference/verification/) |

같은 요청 비교는 neon 템플릿의 첫 측정이에요. 스킬마다 채점자 한 명이 채점했고, 조건마다 한 번씩만 돌려 편차는 몰라요. 스킬이 있을 때 값은 평가를 1\~3번 돌리며 스킬을 고친 뒤의 최종 값이에요. supabase의 DB 스킬은 규칙 문서에 같은 보안 규칙이 있어 없을 때 점수가 더 높았어요([검증 결과](https://prokit-web.vercel.app/docs/reference/verification/#스킬이-있을-때와-없을-때)). `DESIGN.md`가 있어도 두 번째 화면의 일관성은 차이가 없었어요([DESIGN.md 효과](https://github.com/roadkwon-ai/pro-kit/blob/main/templates/prokit-next-neon/VERIFICATION.md#designmd-효과-측정-2026-09-30-추가)).

## 관련 문서

- [프로킷이란](https://prokit-web.vercel.app/docs/start/what-is-prokit/)
- [준비물](https://prokit-web.vercel.app/docs/start/requirements/)
- [검증 결과](https://prokit-web.vercel.app/docs/reference/verification/)
- [만드는 과정과 걸리는 시간](https://prokit-web.vercel.app/tutorials/reference/process-and-time/)
