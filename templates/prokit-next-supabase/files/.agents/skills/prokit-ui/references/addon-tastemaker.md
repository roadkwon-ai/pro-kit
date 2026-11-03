# tastemaker 보조 (선택 묶음 `tastemaker`)

`.agents/skills/tastemaker/`가 있을 때만 읽는다. 원본은 [codeswithroh/tastemaker](https://github.com/codeswithroh/tastemaker)의 `tastemaker`(MIT)다. 레퍼런스 이미지나 화면의 실제 픽셀에서 스크립트로 색과 디자인 값을 뽑아 `.tastemaker/style-lock.md`에 고정하고, 다음 화면도 같은 값으로 만들게 한다. 묶음이 없는데 사용자가 원하면 `pnpm skills:setup --optional tastemaker` 설치를 제안한다.

## 언제 쓰나
- 종류는 방향 보조다. 한 화면에는 방향 보조를 하나만 쓴다(`prokit-ui` "화면 디자인 보조").
- 사용자가 레퍼런스(스크린샷, 이미지, 좋아하는 사이트 주소)를 주고 "이런 느낌으로"라고 한 화면, 사용자가 "tastemaker로"라고 한 화면, 브리프의 `보조:` 줄에 `tastemaker`가 있는 화면에 쓴다. `.tastemaker/style-lock.md`가 이미 있으면 그 뒤 새 화면도 그 값을 이어 쓴다.
- 모드는 요청 문구로 정해진다: `build`(기본), `study`(레퍼런스의 디자인 값 뽑기), `audit`("왜 AI가 만든 것 같지?" 채점, 고치지 않음), `comps`(코드 없이 시안 브리프).
- 이 스킬은 UI를 만들거나 다듬는 거의 모든 요청에서 스스로 불린다. 고르지 않은 화면에서 불리면 `prokit-ui` 흐름대로 한다.

## 프로젝트 규칙이 앞선다
- 정본은 `DESIGN.md`와 `globals.css` 토큰이다. `style-lock.md`의 hex 팔레트와 값은 마감의 정본 갱신에서 토큰과 `DESIGN.md`로 옮긴다. 코드에는 원시 hex를 넣지 않는다.
- 한국어 화면이면 스킬이 비라틴 문자 규칙(서체 한 패밀리를 굵기 단계로 쓰기)으로 바꾼다. 서체는 design-flow "서체"의 한글 서체에서 고르고 `next/font`로 받는다.
- 컴포넌트 레지스트리 설치(`npx shadcn@latest add "<URL>"`)를 루트에서 실행하지 않는다. `prokit-ui` 규칙의 shadcn 절차(`prokit-ui-builder`, `pnpm --filter @<프로젝트>/ui exec shadcn …`)로 `packages/ui`에 넣는다.
- 스킬은 GSAP와 스크롤 타임라인을 기본으로 넣는다. 새 의존성(gsap, motion)은 브리프에서 사용자가 고른 경우만 더한다. 페이지 전환은 `prokit-ui`의 `<ViewTransition>` 규칙이 앞선다.
- 에셋은 스킬의 `design/assets/` 대신 `apps/web/public/images/<화면>/`에 둔다. 찾은 사진과 일러스트는 출처를 남기고 그 서비스의 제품, 사람, 공간으로 내세우지 않는다.
- 홈 폴더 기록: 스킬은 `~/.tastemaker/`(개인 취향 프로필, 구조·카피 기록)와 `~/.ideagram/`에도 쓴다. 다른 프로젝트의 취향이 섞이므로 프로필은 이 프로젝트의 근거로 쓰지 않고, 근거는 프로젝트의 `.tastemaker/`와 `DESIGN.md`다.

## 실행 환경
- 스크립트는 `python3`로 돈다. 색 뽑기는 Pillow가 있으면 쓰고, 없으면 이미지를 직접 읽는 길로 간다. 파비콘·PNG 내보내기는 cairosvg와 시스템 cairo가 있어야 한다. 없으면 그 단계는 건너뛰었다고 보고한다.
- 레퍼런스와 아이콘 찾기는 네트워크를 쓴다(Openverse, Iconify. 키 없음).
- `.tastemaker/`(style-lock, decisions.log, reference-board)는 다음 화면이 이어 쓰는 기록이라 커밋한다. Biome 검사에서는 빠진다(설치기가 `biome.json`에 넣는다).

## 단계 대응
| `prokit-ui` 단계 | tastemaker | 남기는 곳 |
|---|---|---|
| 시각 방향 | 레퍼런스가 있으면 `study`로 값을 뽑고 스타일 질문의 선택지로 낸다("레퍼런스로 스타일 고정"). 레퍼런스가 없으면 쓰지 않는다(카탈로그나 주 UI 스킬로 정한다) | `.tastemaker/style-lock.md`, 브리프에 레퍼런스와 고른 이유 |
| 설계 | style-lock의 값과 범위 화면을 브리프에 적는다. 필요하면 `comps`로 시안 브리프를 만든다 | 브리프 |
| 개발 | style-lock의 값을 토큰으로 옮긴 뒤 `build`의 규칙을 위임 지시에 넣는다(`prokit-ui-builder`가 `.agents/skills/tastemaker/SKILL.md`를 읽는다) | 대조표 구현 행 |
| 리뷰 | 주 UI 스킬의 리뷰 뒤 `audit`을 돌려 순위가 매겨진 지적을 받는다. 스크립트 검사(`scripts/anti_slop_scan.py <경로>`, 출력은 `HIGH`·`MEDIUM <파일:줄> [규칙]`)는 이번 화면의 파일에만 돌린다. `apps/web/src`를 통째로 주면 생성 파일(`env.ts`)과 Better-T-Stack 기본 화면까지 잡는다 | 리뷰 보고서에 `tastemaker audit HIGH N, MEDIUM N` |
| 정본 갱신 | style-lock에서 바뀐 값을 `DESIGN.md`와 토큰에 merge한다(덮어쓰기 전에 묻는다) | `DESIGN.md` |
