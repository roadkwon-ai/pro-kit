<!-- handbook/reference/verification.md "스킬이 있을 때와 없을 때"의 막대그래프(mermaid xychart). 값은 같은 절 표와 같이 eval.<스킬>.with/without(neon VERIFICATION.md 스킬 동작 eval에서 읽는 값, doc-values.json)이다 -->
```mermaid
%%{init: {"themeVariables": {"xyChart": {"plotColorPalette": "#2a78d6, #8c929b"}}}}%%
xychart-beta
  title "규칙 준수율, 스킬 있음(파랑)과 스킬 없음(회색) (%)"
  x-axis ["dev-cycle", "api", "db", "web", "ui", "verify"]
  y-axis "%" 0 --> 100
  bar [{{v:eval.dev-cycle.with}}, {{v:eval.api.with}}, {{v:eval.db.with}}, {{v:eval.web.with}}, {{v:eval.ui.with}}, {{v:eval.verify.with}}]
  bar [{{v:eval.dev-cycle.without}}, {{v:eval.api.without}}, {{v:eval.db.without}}, {{v:eval.web.without}}, {{v:eval.ui.without}}, {{v:eval.verify.without}}]
```
