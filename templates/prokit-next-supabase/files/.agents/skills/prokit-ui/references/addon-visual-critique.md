# visual-critique 보조 (선택 묶음 `visual-critique`)

`.agents/skills/critique-visual-hierarchy/`가 있을 때만 읽는다. 원본은 [Owl-Listener/designer-skills](https://github.com/Owl-Listener/designer-skills)(MIT)의 `visual-critique` 플러그인에 든 일곱 스킬이다. 설치기는 skills CLI로 스킬만 받으므로 플러그인 명령 `/critique-screen`은 없다. 그 명령이 하던 순서를 아래 "화면 비평"대로 한다. 묶음이 없는데 사용자가 원하면 `pnpm skills:setup --optional visual-critique` 설치를 제안한다.

## 언제 쓰나
- 종류는 검수 보조다. 다른 보조와 함께 쓴다.
- 설치되어 있으면 디자인 리뷰 단계마다 주 UI 스킬의 리뷰 뒤에 화면 비평을 더한다. 브리프 `보조:` 줄에도 넣고, 못 하면 `visual-critique 미실행: 사유`를 적는다(audit이 디자인 리뷰 행 증거에서 찾는다). 사용자가 "화면 비평해줘", "critique-screen"이라고 해도 이 순서로 한다.
- 주 UI 스킬이 impeccable이면 `critique`가 비슷한 일을 하므로, 사용자가 원할 때만 더한다. hallmark의 마감 리뷰는 다른 일(테마 간극, ship·fix 판정)이라 이 비평을 대신하지 않는다.

## 화면 비평
입력은 렌더한 화면이다. `prokit-verify`로 찍은 데스크톱·모바일 스크린샷과 그 화면의 코드 경로를 준다. 일곱 스킬의 `SKILL.md`를 이 순서로 읽고 각 차원을 본다. 차원마다 관찰, 문제, 고칠 것과 `pass`·`minor issue`·`major issue`를 적는다.

| 순서 | 스킬 | 보는 것 |
|---|---|---|
| 1 | `critique-visual-hierarchy` | 시선 진입점, 흐름, 무게, 강조 |
| 2 | `critique-brand-consistency` | 분위기, 말투, 토큰 준수 |
| 3 | `critique-composition` | 균형, 여백, 리듬, 게슈탈트 |
| 4 | `critique-typography` | 크기 체계, 가독성, 일관성, 토큰 준수 |
| 5 | `critique-color` | 대비(4.5:1, 3:1), 팔레트, 의미 색, 접근성 |
| 6 | `critique-affordance` | 눌러 보이는지, 상태, CTA, 찾기 쉬운지(44px 터치 영역) |
| 7 | `critique-information-density` | 인지 부하, 내용 우선순위, 훑는 흐름, 점진적 노출 |

모은 지적을 P1(출시 전 필수: 사용성, 접근성, 브랜드를 깨뜨림), P2(이번 작업에서 고침), P3(여유가 있을 때)로 묶는다. 항목마다 문제, 차원, 고칠 것을 적고, 가장 강한 차원과 가장 약한 차원을 한 문단으로 정리한다.

## 프로젝트 규칙이 앞선다
- `critique-brand-consistency`는 루트의 `mood.md`, `voice.md`, `tokens.md`를 찾는다. 이 프로젝트에서는 만들지 않는다. 분위기와 말투는 `PRODUCT.md`, 토큰은 `DESIGN.md`와 `globals.css`를 그 자리로 알려 준다. 둘 다 없으면 이 차원은 건너뛰었다고 적는다(브랜드 규칙을 지어내지 않는다).
- 고치는 일은 마감 단계에서 주 UI 스킬의 지적과 한 번에 모아 `prokit-ui-builder`에 맡긴다. 비평 중에 코드를 고치지 않는다.
- 통과 기준은 주 UI 스킬 지도의 것이다. P1은 마감에서 고치거나 사유를 적고 보류한다.

## 단계 대응
| `prokit-ui` 단계 | visual-critique | 남기는 곳 |
|---|---|---|
| 리뷰 | 위 "화면 비평". 주 UI 스킬의 리뷰 기록과 같은 보고서에 절을 따로 둔다 | 리뷰 보고서에 `visual-critique P1 N, P2 N, P3 N`과 약한 차원 |
| 마감 | P1과 P2를 주 UI 스킬의 고칠 것과 합쳐 위임하고, 재확인에서 P1을 다시 본다 | 대조표 마감 행 |
