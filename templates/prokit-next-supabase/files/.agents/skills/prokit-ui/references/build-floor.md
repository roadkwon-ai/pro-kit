# 구현 전 바닥선

`prokit-ui-builder`가 화면 코드를 쓰기 전에 읽고, 쓰는 동안 지키고, 보고에 항목마다 결과를 적는 목록이다. 리뷰·감사에서 마감 한 바퀴를 만들던 반복 지적을 첫 구현에서 막는다. 규칙의 정본은 출처 칸의 스킬이다. 여기에는 다시 풀어 쓰지 않고 이 프로젝트에서 놓치기 쉬운 꼴만 적는다. 리뷰와 감사는 그대로 하고, 이 목록이 그 일을 대신하지 않는다.

| # | 확인 | 출처 |
|---|---|---|
| 1 | 글자가 들어가는 칸은 긴 입력(영문 낱말, URL, 숫자 이어 쓰기)에서도 넘치지 않는다. `break-keep`(한글 제목)만 두면 긴 영문이 칸을 뚫으므로 `wrap-break-word`를 함께 두고, 한 줄로 자를 곳은 `truncate`·`line-clamp-*`를 쓴다 | web-design-guidelines "Content Handling", `prokit-ui` 규칙(한글 제목) |
| 2 | flex·grid 자식이 줄어들어야 하는 곳에 `min-w-0`을 둔다. 320px에서 가로 넘침이 없어야 한다 | web-design-guidelines "Content Handling" |
| 3 | 첫 화면의 주된 이미지는 `fetchPriority="high"`와 `loading="eager"`(next/image는 번들 문서 `apps/web/node_modules/next/dist/docs/`의 해당 속성), 아래쪽 이미지는 지연 로딩이다 | web-design-guidelines "Images" |
| 4 | 버튼 안 Spinner·장식 아이콘은 `aria-hidden="true"`이고, 버튼 이름은 글자나 `aria-label`로 남는다. 아이콘만 있는 버튼은 `aria-label`이 있다 | web-design-guidelines "Accessibility", "Forms" |
| 5 | 비동기 결과(저장, 생성 완료, 검증 오류)는 `aria-live="polite"`로 알리고, 입력마다 바뀌는 값은 디바운스해 요약 한 문장만 읽게 한다 | web-design-guidelines "Accessibility", impeccable `reference/harden.md`(디바운스) |
| 6 | 장식 막대·흐림·반투명 배경 위 글자는 실제로 합성된 색으로 대비를 잰다(본문 4.5:1, 큰 글자 3:1). 정보를 전하는 경계·진행 막대·상태 점은 3:1이다. 순수 장식이면 정보를 싣지 않는다 | impeccable `reference/craft-floor.md` "Contrast", WCAG 1.4.11 |
| 7 | 첫 화면의 주 행동은 하나다. 같은 무게의 행동 버튼을 나란히 두지 않고 둘째 행동은 보조 모양(링크·보조 버튼)으로 둔다 | impeccable `reference/mode-persuade.md`("the primary action is unmistakable") |
| 8 | 누를 수 있어 보이는 것은 실제로 동작한다. `aria-hidden` 아이콘이나 `div`를 버튼처럼 꾸미지 않고, 동작이 없으면 버튼 모양을 쓰지 않는다 | `prokit-ui` 규칙(링크와 버튼), impeccable `reference/craft-floor.md` "States" |
| 9 | 한 실패가 두 길로 오면 상태 하나로 모아 한 번만 알린다. 예: `audio.play()`의 거절(자동 재생 정책)과 `error` 이벤트, `fetch`의 거절과 오류 응답. 자동 재생은 사용자 동작 뒤에만 한다 | impeccable `reference/animate.md`(autoplay), `reference/craft-floor.md` "States" |
| 10 | 리스트박스·메뉴·탭·트리·대화상자·슬라이더 같은 위젯을 `div`와 `role=`로 직접 짜지 않는다. `packages/ui`의 shadcn 부품을 쓰고, 없는 행동은 선택 묶음 `ui-sdk`로 만든다([UI SDK 지도](ui-sdk.md)) | web-design-guidelines "Accessibility", ui-sdk `SKILL.md` "Don't hand-roll what we ship" |

## 보고
`prokit-ui-builder` 보고에 `바닥선:` 줄을 둔다. 항목마다 `확인`(어느 파일에서 지켰는지), `N/A: 사유`(그 화면에 해당 요소가 없음), `못 지킴: 사유` 중 하나를 적는다. 예: `바닥선: 1 확인(hero.tsx), 2 확인, 3 N/A: 첫 화면 이미지 없음, 4 확인, 5 확인(디바운스 500ms), 6 확인, 7 확인, 8 확인, 9 확인(player.tsx), 10 확인`. Main은 대조표 구현 행 증거에 `바닥선 확인 N/10`을 옮기고, 리뷰·감사가 같은 항목을 다시 지적하면 그 항목을 고친 뒤 다음 화면부터 위임 지시에 강조한다. 새 반복 지적이 나오면 이 표에 출처와 함께 더한다(`prokit-dev-cycle` 5절 6번의 재발 원인 반영).
