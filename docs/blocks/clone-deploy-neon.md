<!-- 클론 튜토리얼 12장의 3단계 Neon 운영 DB(프롬프트, 하는 일, 성공 기준). 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle) -->
Neon에 운영 DB를 만들고 이 프로젝트와 연결해요.

```prompt
Neon에 [{{name}}] 프로젝트를 만들어서 이 프로젝트에 연결해줘.
develop 배포에 쓸 DB도 따로 만들어줘.
연결하면 생기는 .neon 파일은 .gitignore에 넣고, DB 주소는 파일로 받지 마.
```

에이전트는 Neon에 프로젝트를 만들고 이 프로젝트와 연결해요. [develop](../reference/glossary.md#올리기)(운영에 올리기 전에 먼저 보는 확인용 주소)에 쓸 DB는 운영 DB에서 갈라 만들어요. 연결 정보 파일(`.neon`)은 `.gitignore`에 넣어 내 컴퓨터에만 두고 GitHub에는 올리지 않아요.

아직 DB에 표는 없어요. 표는 5단계에서 운영에 처음 배포할 때 만들어요. 개발은 지금처럼 내 컴퓨터의 DB로 해요.

**이렇게 되면 성공**
- [Neon 웹사이트](https://console.neon.tech)에 `{{name}}` 프로젝트가 보여요.
- 그 프로젝트의 Branches 목록에 `develop`이 있어요.
