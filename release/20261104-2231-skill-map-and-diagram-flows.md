# v0.3.8 — Skill map and diagram flows

- 날짜: 2026-11-04 22:31 (KST)
- 이전 버전: v0.3.7
- 전체 변경: https://github.com/roadkwon-ai/pro-kit/compare/v0.3.7...v0.3.8

## Fixes

- 리뷰어가 스킬 파일을 Read로 읽게 하고 delegation diff의 여러 --scope 쓰는 법을 적음 (`d111049`)
  - prokit-reviewer: prokit-*를 포함한 스킬 파일은 셸(cat, sed)이 아니라 Read로 끝까지 읽고, skills_read에는 그렇게 읽은 것만 적는다. Claude Code 훅이 셸 읽기를 남기지 않아 증거에 옮긴 읽기를 audit이 거부했다(pro-kit-trader v0.3.7 반영 라운드 7행)
  - delegation.md: 경로가 여럿이면 --scope를 경로마다 붙인다(공백으로 이으면 사용법 오류 exit 2)

## Docs

- 스킬 구조 전체를 한 번에 보는 skill-map 쪽을 더함 (`1e65b3b`)
  - skill-map: 전체 구조, 라운드 하나의 흐름, 구성을 고르고 바꾸는 흐름 도식과 상자마다 자세한 쪽 표
  - 스킬 묶음 쪽 표의 첫 쪽으로 넣고 문서 쪽 수 값을 49로 채움
  - optional-bundles 첫 도식을 좁히고 brains의 UI/UX 흐름 링크 글을 쪽 제목에 맞춤
- installer 도식이 홈페이지 본문 폭을 넘던 것을 줄을 나눠 좁힘 (`b4d8709`)
  - 유형 갈래 상자 세 개의 긴 줄을 나눠 로컬 폭을 690px에서 603px로 줄임
- 스킬 구성 전체 지도, mattpocock 추가 스킬 단계, 선택 묶음 도식을 더함 (`cc8d286`)
  - brains: 늘 설치하는 것, 처음 고르는 것, 필요할 때 더하는 것이 대조표로 이어지는 전체 지도
  - brains: mattpocock 필수·추가 스킬이 쓰이는 대조표 단계와 케이스
  - optional-bundles: 묶음 고르기, 더하고 빼는 흐름, 화면 디자인 보조 조합 고르기
- 머리말이 없던 도식 4개에 줄 폭 설정을 넣어 낱말 중간 끊김을 없앰 (`932fea6`)
  - installer: 유형 갈래를 상자 안 첫 줄로 옮기고 TB로 바꿈
  - quickstart-service: 명령과 옵션을 줄마다 나눔
  - what-it-adds: 묶음 원본까지 TB로 바꾸고 묶음 안 상자를 세로로 쌓음
  - project-plan 둘째: `T<n>`이 사라지던 것을 고치고 질문 상자를 둥근 상자로 바꿈
- pro-kit-web 확인 결과대로 cases·harness 도식을 세로로 정리하고 하이픈 줄바꿈을 없앰 (`1d2ff8f`)
  - cases: TB로 바꿔 결과 네 칸을 아래로 쌓고 점선에 라벨을 붙임
  - harness: 노드 글을 한두 줄로 줄이고 상세는 도식 아래 목록으로 옮김. 두뇌·과설계 방지 스킬을 수행 에이전트로 잇고 점선마다 라벨을 붙임
  - agent-roles, brain-flow, ui-flow 구조도, vercel, install-and-update, choose, dev-cycle, brains: 이름과 명령이 한 줄에 들어가게 줄을 나눔
  - brain-flow 본문의 곧은 큰따옴표를 둥근 따옴표로 바꾸고 절 안내를 링크로 바꿈
- 두뇌·과설계 방지 흐름 쪽을 더하고 본문 폭을 넘던 도식을 세로 흐름으로 고침 (`c04e058`)
  - handbook/skills/brain-flow.md 새 쪽: 라운드 흐름, 구조, 단계마다 두뇌 고르기, 두뇌 9개의 단계별 스킬, 간결성 사다리, 과설계 방지 스킬별 역할, 리뷰 지적 처리 도식 12개
  - brains.md: 두뇌 비교 도식을 세로 갈래로 고치고 고르기·바꾸기 도식과 새 쪽 링크를 더함
  - 842px을 넘던 harness, agent-roles, dev-cycle, cases, install-and-update 등 도식 15개를 세로 흐름과 줄바꿈 폭 설정으로 고침
  - 문서 쪽 수 값을 48로 채움
- UI 도식을 본문 폭 안의 세로 흐름으로 바꾸고 ui-skillset 도식을 평소 말로 고침 (`87278b9`)
  - 흐름도, 구조도, UI 스킬별 흐름도 3개, 보조 단계 도식을 세로 흐름으로 바꿔 모두 842px 안에 들어오게 함
  - 낱말 중간 줄바꿈을 줄이려 긴 도식에 wrappingWidth 설정을 넣음
  - ui-skillset 고르기·바꾸기 도식의 입구 둘을 나란히 두고 한 방향으로 흐르게 하고, 설명 문장을 앞에 둠
  - ui-skillset 구조 요약을 디자인 단계와 전문 에이전트 두 묶음으로 나누고 선택인 보조를 점선으로 표시함
- UI 스킬별 흐름도, 보조가 붙는 단계 도식, UI 스킬 고르기·바꾸기 도식과 구조 요약을 더함 (`7e0199e`)
  - ui-flow "UI 스킬마다 단계에서 하는 일"에 impeccable, hallmark, 기본 AI 흐름도를 하나씩 더함
  - ui-flow "화면 디자인 보조가 더하는 단계"에 단계마다 붙는 보조 종류 도식을 더함
  - ui-skillset에 UI 스킬 고르기·바꾸기 도식과 스킬·에이전트 구조 요약 도식을 더함
- prokit-ui 구조 도식과 현재 흐름도, UI 스킬별·화면 디자인 보조별 단계 표를 handbook에 더함 (`b35bd8c`)
  - ui-flow 흐름도에 브리프의 `보조:` 줄, 보조 스킬 위임, 실행 확인과 리뷰 분리, 보조 리뷰, audit·close 대조를 넣음
  - ui-flow에 구조 절(prokit-ui, 주 UI 스킬 지도, design-flow, 보조 guide, 맡는 에이전트, 증거와 audit)을 더함
  - ui-flow 자세히에 UI 스킬마다 단계에서 하는 일, 화면 디자인 보조가 더하는 단계 표를 더함
  - ui-skillset에 화면 디자인 보조 절과 구조 링크를 더함
- prokit-dev-cycle 배포 뒤 확인 주소를 prokit-deploy 배포 순서 4번으로 가리킴 (`7c27813`)
  - 두 템플릿 prokit-dev-cycle 8번의 `/api/auth/get-session` 직접 표기를 `prokit-deploy` "배포 순서" 4번 참조로 바꿔 확인 주소를 한 곳에만 둠(pro-kit-web이 고친 문구를 가져옴)
