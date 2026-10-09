# 검증 결과

> 한눈에: 프로킷의 <!-- v:templates.count.ko -->두<!-- /v --> 템플릿은 실제 프로젝트에 설치해 확인했어요. 작은 기능 검사부터 실제 DB에서 처음부터 끝까지 해 본 작업, 스킬이 결과를 바꾸는지 잰 비교까지 기록이 남아 있어요. 화면 프리셋 <!-- v:presets.screen.count -->9<!-- /v -->개는 모든 페이지의 링크와 버튼을 눌러 확인했어요.

## 무엇으로 검증했나요

전체 기록은 템플릿마다 `VERIFICATION.md`에 있어요([neon](../../templates/prokit-next-neon/VERIFICATION.md) · [supabase](../../templates/prokit-next-supabase/VERIFICATION.md)).

| 검증 | 무엇을 봤나요 | 기록 |
|---|---|---|
| 단위 테스트 | 러너 분류·대조표·audit, 에이전트 동기화, 설치기, 스킬 정적 검사, 문서 규칙. <!-- v:templates.count.ko -->두<!-- /v --> 템플릿의 공유 파일이 바이트까지 같은지도 검사해요 | [neon](../../templates/prokit-next-neon/VERIFICATION.md#단위-테스트) |
| fixture 설치 | 실제 BTS 프로젝트에 설치해 종료 코드, 설치된 스킬 수, 멱등성(두 번 실행해도 변경 0), 타입 검사를 확인 | [neon](../../templates/prokit-next-neon/VERIFICATION.md#fixture-설치) · [supabase](../../templates/prokit-next-supabase/VERIFICATION.md#fixture-설치-스킬-실제-설치) |
| 스킬 동작 eval | 같은 요청을 스킬이 있을 때와 없을 때로 나눠 체크 항목으로 채점(skill-creator 표준 절차) | [neon](../../templates/prokit-next-neon/VERIFICATION.md#스킬-동작-eval-skill-creator-표준-절차) |
| 트리거 정확도 | 스킬 설명(description)만 보고 맞는 요청에서 스킬이 불리는지 | [neon](../../templates/prokit-next-neon/VERIFICATION.md#트리거-정확도-description) |
| 독립 리뷰 | 구현에 참여하지 않은 리뷰어의 전체 검토와 반영 | [neon](../../templates/prokit-next-neon/VERIFICATION.md#독립-리뷰) · [supabase](../../templates/prokit-next-supabase/VERIFICATION.md#독립-리뷰-opus-읽기-전용) |
| 실제 DB에서 라운드 | 실제 Neon DB에서 케이스 F 라운드(마이그레이션, 2계정 격리 테스트)를 끝까지 진행. supabase는 로컬 Supabase DB와 RLS | [neon](../../templates/prokit-next-neon/VERIFICATION.md#실제-neon-db-e2e-task-14) · [supabase](../../templates/prokit-next-supabase/VERIFICATION.md#로컬-supabase-db와-rls-podman) |
| Codex 스모크 | Codex에서 스킬과 에이전트가 로드되는지. 에이전트는 신뢰한 프로젝트에서만 로드돼요 | [neon](../../templates/prokit-next-neon/VERIFICATION.md#codex-스모크) |
| 스킬 연결 점검 | 단계마다 읽어야 할 공식 스킬을 실제로 읽는지(호출률). [결과](../skills/official-skills.md#호출률과-활용도) | [neon](../../templates/prokit-next-neon/VERIFICATION.md#스킬-연결-점검과-보강-2026-09-30-추가) |
| DESIGN.md 효과 | `DESIGN.md`가 있을 때와 브랜드 이름과 대표 색만 줬을 때의 디자인 일치율 | [neon](../../templates/prokit-next-neon/VERIFICATION.md#designmd-효과-측정-2026-09-30-추가) |

아직 확인하지 못한 항목은 각 기록의 "미검증 항목" 절에 있어요([neon](../../templates/prokit-next-neon/VERIFICATION.md#미검증-항목) · [supabase](../../templates/prokit-next-supabase/VERIFICATION.md#미검증-항목)).

## 스킬이 있을 때와 없을 때

같은 요청 <!-- v:eval.requests -->13<!-- /v -->개를 스킬이 있을 때와 없을 때로 나눠 에이전트(Sonnet 5)에게 맡기고, 체크 항목 <!-- v:eval.checks -->52<!-- /v -->개로 채점했어요. 채점은 Opus 5.5가 했어요. neon 템플릿의 첫 측정이에요.

| 스킬 | 요청 (체크 항목) | 스킬 있음 | 스킬 없음 |
|---|---|---|---|
| `prokit-dev-cycle` | 3 (14) | <!-- v:eval.dev-cycle.with -->93<!-- /v -->% | <!-- v:eval.dev-cycle.without -->27<!-- /v -->% |
| `prokit-api` | 2 (8) | <!-- v:eval.api.with -->100<!-- /v -->% | <!-- v:eval.api.without -->56<!-- /v -->% |
| `prokit-db` | 2 (7) | <!-- v:eval.db.with -->100<!-- /v -->% | <!-- v:eval.db.without -->38<!-- /v -->% |
| `prokit-web` | 2 (8) | <!-- v:eval.web.with -->88<!-- /v -->% | <!-- v:eval.web.without -->62<!-- /v -->% |
| `prokit-ui` | 2 (8) | <!-- v:eval.ui.with -->100<!-- /v -->% | <!-- v:eval.ui.without -->12<!-- /v -->% |
| `prokit-verify` | 2 (7) | <!-- v:eval.verify.with -->100<!-- /v -->% | <!-- v:eval.verify.without -->71<!-- /v -->% |

체크 항목은 프로킷의 규칙(증거, 데이터 주인 확인, 마이그레이션 순서, 설계 확인)을 지켰는지 봐요. 일반적인 코드 품질 점수가 아니에요. 이후 체크 항목은 늘렸고, 측정 방법과 실패 사례는 [neon 검증 기록](../../templates/prokit-next-neon/VERIFICATION.md#스킬-동작-eval-skill-creator-표준-절차)에 있어요.

supabase 템플릿의 `prokit-db`도 같은 방식으로 쟀어요. `prokit-db`를 뺀 프로젝트에서도 `AGENTS.md`의 보안 규칙(RLS, `db:push` 금지)이 지켜져서 체크 항목 점수는 스킬이 없을 때가 오히려 높았어요(수정 전 기준 있음 73%, 없음 87%). 차이는 점수 밖에서 났어요. 스킬이 없으면 세 번 모두 대조표 없이 진행했고, 에이전트 셸에서 실패하는 루트 turbo 명령부터 썼어요. 한 번은 drizzle 스냅샷을 손으로 고쳤어요.

스킬을 쓴 실행에서도 결함을 찾아 고쳤어요. 스냅샷 불일치, expand 단계의 NOT NULL, 격리 테스트를 미루는 해석이에요. 고친 뒤 다시 실행한 요청은 그 체크 항목을 모두 통과했어요([supabase 검증 기록](../../templates/prokit-next-supabase/VERIFICATION.md#bts-스킬-구성-검수-2026-09-27-추가)).

## 자세히

### 화면 프리셋

화면 프리셋 <!-- v:presets.screen.count -->9<!-- /v -->개(랜딩페이지 <!-- v:presets.landing.count -->4<!-- /v -->개, 앱 화면 <!-- v:presets.app.count -->5<!-- /v -->개)를 쟀어요. 클론 코딩 프리셋 <!-- v:presets.clone.count -->2<!-- /v -->개는 이 측정 밖이에요.

| 항목 | 결과 |
|---|---|
| 페이지 | 프리셋당 <!-- v:presets.screen.pages.range -->7\~22<!-- /v -->개, 올곧은 <!-- v:preset.olgot.pages -->203<!-- /v -->개(<!-- v:preset.olgot.pageTypes -->48<!-- /v -->종), 모두 <!-- v:presets.screen.pages -->337<!-- /v -->개. 링크와 버튼은 모두 실제 페이지나 동작으로 이어지고, 404나 "준비 중" 페이지는 없어요 |
| 확인 | GitHub Pages와 같은 하위 경로로 정적 HTML을 띄우고 모든 페이지의 링크와 버튼을 눌렀어요. 404 0, 콘솔 오류 0, 반응 없는 버튼 0 |
| critique (40점 만점) | <!-- v:presets.design.critique.list -->제철상자 35, 하루공부 33, PACECREW 31, 고루 30, 올곧 30, 울림 29, AFTERGLOW 29, 핏슬롯 28, Uptrail 28<!-- /v -->. P0·P1은 모두 고쳤어요 |
| 추천 | 1위는 <!-- v:presets.design.first.summary -->Refero Styles 6개, awesome-design-md 2개<!-- /v -->예요. 이전 판과 같은 계열(토스, Sequel 등)은 에이전트가 먼저 후보에서 뺐어요. 올곧은 추천 없이 입시학원 사이트 한 곳을 실측해 만든 `DESIGN.md`를 썼어요 |
| comp | gpt-image-2.5-flare로 그렸어요. 첫 화면은 방향 comp 3장 중에서 골랐고, 나머지 페이지는 고른 comp를 참고로 페이지마다 한 장씩 그렸어요. 올곧은 첫 화면 comp 3장만 ChatGPT로 로그인한 Codex(`gpt-image` 스킬)로 그렸어요 |
| 시각 자산 | 서체는 프리셋 <!-- v:presets.screen.count -->9<!-- /v -->개 모두 파일로 받아 프로젝트에 직접 넣었어요(자체 호스팅: Pretendard, Wanted Sans, SUIT, JetBrains Mono, Black Han Sans, Hahmlet, Paperlogy). 사진과 일러스트는 AI로 만들었고, 아이콘은 lucide예요. 사람이 나오는 사진은 원본 크기로 팔다리와 손을 확인해 이상한 사진을 다시 만들었어요. 모션은 모두 reduced-motion(움직임 줄이기) 설정에서 꺼져요 |
| 비용 (추천부터 모든 페이지 확인까지) | 에이전트 비용은 프리셋당 $68~$181, 모두 약 $1,090예요(중간에 작업공간을 기록으로 되살린 세션 포함). OpenAI 이미지 비용은 따로 청구돼요 |

클론 코딩까지 프리셋 <!-- v:presets.count -->11<!-- /v -->개는 [프로킷 사이트](https://prokit-web.vercel.app/)에서 모든 페이지를 열어 볼 수 있어요.

### 측정 보고서

- [스킬 연결 점검 보고서](../../docs/reports/2026-09-30-skill-wiring-check.html)
- [Codex 검수 보고서](../../docs/reports/2026-09-30-codex-skill-wiring-check.html)
- [DESIGN.md 효과 측정 보고서](../../docs/reports/2026-09-30-design-md-effect.html)

GitHub에서는 HTML 원문이 그대로 보이니 내려받아 브라우저로 열어 보세요. claude.ai 게시본은 [스킬 연결 점검](https://claude.ai/artifact/BHpjS12NRAzY36xBxbArBN)과 [DESIGN.md 효과 측정](https://claude.ai/artifact/2tp355rbvt6QC2dBbfBHzb)이고, DESIGN.md 쪽은 공유받은 계정만 열려요.

## 관련 문서

- [공식 스킬과 연결](../skills/official-skills.md)
- [DESIGN.md](../design/design-md.md)
- [prokit 스킬 <!-- v:prokit.skills.count -->8<!-- /v -->개](../skills/prokit-skills.md)
