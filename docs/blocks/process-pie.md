<!-- tutorials/reference/process-and-time.md "시간이 어디에 쓰이나요"의 원그래프(mermaid pie, 단위 분). 값은 doc-values.json process.pie(메인 에이전트가 일한 시간을 도구 종류로 나눈 실측). 인자: name(claudle·olgot), title(그래프 제목. 숫자를 넣지 않는다) -->
```mermaid
pie showData
  title {{title}}
  "모든 페이지 확인" : {{v:process.pie.{{name}}.recheck.min}}
  "생각하고 쓰기" : {{v:process.pie.{{name}}.model.min}}
  "리뷰·디자인 검사 에이전트" : {{v:process.pie.{{name}}.review.min}}
  "구현 에이전트 기다림" : {{v:process.pie.{{name}}.impl.min}}
  "브라우저 확인" : {{v:process.pie.{{name}}.browser.min}}
  "빌드·내보내기·검사" : {{v:process.pie.{{name}}.build.min}}
  "기타" : {{v:process.pie.{{name}}.other.min}}
```
