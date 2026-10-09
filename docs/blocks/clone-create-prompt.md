<!-- 클론 튜토리얼 1장의 1단계 프롬프트, 에이전트가 하는 일, 성공 기준, 보고에 나오는 할 일 표. 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle) -->
```prompt
neon 템플릿으로 [{{name}}] 프로젝트 만들어줘.
```

neon 템플릿은 pro-kit의 {{v:templates.count.ko}} 템플릿 가운데 하나예요. 개발할 때는 내 컴퓨터의 DB를 쓰고, 배포할 때는 [Neon](../reference/glossary.md#올리기)(인터넷에 있는 DB 서비스)에 올리는 구성이에요.

{{b:agent-order-line}}

1. 준비물(Node {{v:node.min}} 이상, pnpm, git, Docker 또는 Podman)이 있는지 확인해요. 없으면 설치 방법을 알려 주고 멈춰요.
2. 최신 Better-T-Stack(웹 서비스의 기본 틀을 한 번에 만들어 주는 도구)으로 웹 프로젝트를 만들고, pro-kit을 설치해요. 에이전트 규칙, 스킬, 검사 도구가 들어가요.
3. 내 컴퓨터에 DB를 켜고, 로그인 정보를 담을 표를 만드는 첫 [마이그레이션](../reference/glossary.md#만들기)({{v:gloss.migration}})을 적용해요.
4. 코드 모양을 정리하고 검사한 뒤 첫 기록(커밋)을 남겨요.

**이렇게 되면 성공**
- 보고에 프로젝트 위치(`~/projects/{{name}}`)와 로컬 DB 주소, DB를 끄는 명령이 나와요.
- 검사가 모두 통과했다고 알려 줘요.
- 새 프로젝트 폴더에서 에이전트를 새로 열라고 안내해요.

보고에는 내가 할 일도 함께 나와요. 이 튜토리얼에서는 이렇게 하면 돼요.

| 보고에 나오는 할 일 | 언제 하나요 |
|---|---|
| 새 세션에서 폴더를 믿을지 묻는 질문에 동의 | 이 장 2단계 |
| `impeccable hooks on` 실행 | 이 장 2단계 |
| `GLOSSARY.md`, `docs/domain/project.md` 채우기 | `GLOSSARY.md`는 2장에서 에이전트가 채워요. `docs/domain/project.md`는 화면과 기능을 만들 때 에이전트가 함께 채워요 |
| [원격 DB](../reference/glossary.md#올리기)(인터넷에 둔 DB) 연결, 배포 준비 | [12장](12-deploy.md)(선택) |
| 선택 스킬 묶음 설치 | 지금은 넘어가요 |
| 이미지 그리기 | 이 장 3단계(선택). 시안을 그릴 때만 해요 |
