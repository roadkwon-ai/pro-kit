<!-- 클론 튜토리얼 README의 프롬프트 뒤 "에이전트는 먼저 이런 일을 해요" 목록의 앞 네 줄(pro-kit과 팩 받기, 준비물, 빈 프로젝트, DB). 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle), reul(이름 뒤 조사 "를" 또는 "을"). 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 -->
- pro-kit을 `~/projects/pro-kit`에 받고, 프리셋 팩을 그 안의 `packs/{{name}}`에 받아요.
- 준비물(Node, pnpm, git, Docker 또는 Podman)을 확인하고, 없는 것을 설치해요.
- **빈 프로젝트** `~/projects/{{name}}`{{reul}} 만들고 pro-kit의 규칙, 스킬, 전문 에이전트를 설치해요.
- 내 컴퓨터에 [DB](../reference/glossary.md#만들기)(서비스의 데이터를 저장하는 곳)를 켜고, 로그인 정보를 담을 표를 만들어 둬요.
