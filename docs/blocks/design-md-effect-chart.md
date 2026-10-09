<!-- handbook/design/design-md.md "효과"의 막대그래프(mermaid xychart). 팔레트 일치·글자 크기 일치·두 번째 화면 색 일관성 막대는 아래 표와 같이 eval.designMd.*(neon VERIFICATION.md DESIGN.md 효과 측정 결과 표에서 읽는 값)를 쓴다. 반경 일치 막대는 이 그래프에만 있고, 블라인드 종합 승률은 표의 종합 승수를 평가 횟수로 나눈 %다 -->
```mermaid
%%{init: {"themeVariables": {"xyChart": {"plotColorPalette": "#2a78d6, #8c929b"}}}}%%
xychart-beta
  title "DESIGN.md 있음(파랑)과 브랜드 이름·대표 색만(회색) (%)"
  x-axis ["팔레트 일치", "글자 크기 일치", "반경 일치", "두 번째 화면 색 일관성", "블라인드 종합 승률"]
  y-axis "%" 0 --> 100
  bar [{{v:eval.designMd.palette.with}}, {{v:eval.designMd.fontSize.with}}, 100, {{v:eval.designMd.secondScreen.with}}, 75]
  bar [{{v:eval.designMd.palette.without}}, {{v:eval.designMd.fontSize.without}}, 88, {{v:eval.designMd.secondScreen.without}}, 25]
```
