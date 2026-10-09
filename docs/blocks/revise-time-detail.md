<!-- 시간 범위를 처음 보여 주는 곳 바로 아래의 펼쳐 보기(고쳐 달라고 할 때마다 더 드는 시간). 접힌 상자 전체를 담는다. 값은 doc-values.json cost.revise(홈페이지는 --json 내보내기로 읽는다), 원문 설명은 tutorials/reference/process-and-time.md "고쳐 달라고 할 때마다 더 드는 시간". tutorials/<묶음>/ 쪽에서 쓴다 -->
<details>
<summary>자세히 보기: 고쳐 달라고 하면 왜 늘어날까요</summary>

| 과정 | 하는 일 | 더 드는 시간 |
|---|---|---|
| 고치기 | 요청을 읽고 고칠 곳을 찾아 고쳐요 | 약 {{v:cost.revise.fix}} |
| 검사 | 타입 검사, 포맷, 빌드 | 약 {{v:cost.revise.check}} |
| 모든 페이지 다시 확인 | 고친 부품이 다른 페이지를 깨지 않았는지 봐요 | {{v:preset.claudle.pages}}쪽 약 {{v:cost.revise.recheck.13}}, {{v:preset.olgot.pages}}쪽 약 {{v:cost.revise.recheck.203}} |
| 리뷰 에이전트 | 크게 고쳤으면 고친 코드를 한 번 더 검토해요 | 약 {{v:cost.revise.review}} |
| 마무리 | 기록, 검사, 커밋. 마지막에 한 번만 해요 | 약 {{v:cost.revise.close}} |

**한 군데를 고치면 약 {{v:cost.revise.oneSpot}}, 두 군데면 약 {{v:cost.revise.twoSpots}}이 더 들어요.** 마무리 검토(디자인 리뷰, 리뷰 에이전트, 모든 페이지 다시 확인)를 한 번 더 하면 {{v:cost.revise.reviewRound}}이 더 들어요. 프리셋을 만들 때 잰 값이고, 내가 결과를 보고 확인하는 시간은 따로예요. [고쳐 달라고 할 때마다 더 드는 시간](../reference/process-and-time.md#고쳐-달라고-할-때마다-더-드는-시간)

</details>
