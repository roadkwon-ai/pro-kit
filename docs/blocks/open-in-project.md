<!-- handbook 시작 쪽 새 프로젝트 폴더에서 화면 디자인 검사(impeccable을 고른 프로젝트)를 켜고 에이전트를 여는 명령 블록(요청 없이 여는 명령은 `agent.<이름>.start`) -->
```bash
cd ../my-app
.agents/skills/impeccable/scripts/impeccable hooks on   # impeccable을 고른 프로젝트만. 화면 디자인 검사 켜기, 처음 한 번만
{{v:agent.claude.start}}                                                   # 신뢰 질문에 동의한다. {{v:agent.codex.name}}는 {{v:agent.codex.start}}, {{v:agent.agy.name}}는 {{v:agent.agy.start}}, {{v:agent.grok.name}}는 {{v:agent.grok.start}}
```
