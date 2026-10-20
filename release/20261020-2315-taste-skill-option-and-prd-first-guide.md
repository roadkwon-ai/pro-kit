# v0.2.2 — Taste skill option and PRD-first guide

- 날짜: 2026-10-20 23:15 (KST)
- 이전 버전: v0.2.1
- 전체 변경: https://github.com/roadkwon-ai/pro-kit/compare/v0.2.1...v0.2.2

## Features

- taste-skill 선택 묶음과 PRD 먼저 정하기 안내 추가 (`2a30407`)
  - 선택 묶음 `taste`(Leonxlnx/taste-skill의 design-taste-frontend)를 더하고 prokit-init이 PRD로 화면 디자인 보조를 추천해 묻게 함
  - prokit-ui에 `references/taste.md`를 두어 사용자가 고른 화면에만 taste 방향과 검사를 쓰게 함. 설치기가 `.taste-skill/`을 `.gitignore`에 넣음
  - 두뇌 agent-skills에 addyosmani를 붙여 Vercel·Neon·Supabase의 agent-skills와 구분함
  - 두뇌와 선택 스킬 문서에 i-have-adhd 설명과 원본 링크를 더함
  - handbook에 "PRD 먼저 정하기" 쪽을 새로 두고 README, 소개, 빠른 시작, 튜토리얼 시작하기에 PRD를 먼저 정하라는 안내를 더함
  - 선택 묶음 목록에서 i-have-adhd와 taste가 빠져 있던 문서(하네스 도식, 템플릿 비교표, 템플릿이 더하는 것)를 고침
