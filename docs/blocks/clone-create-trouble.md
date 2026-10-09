<!-- 클론 튜토리얼 1장의 1단계 "막히면" 목록. 인자: name(프로젝트 폴더 이름. nextflix 또는 claudle) -->
- **준비물이 없다고 멈췄어요**: `없는 준비물은 설치해줘`라고 보내세요. 비밀번호가 필요한 명령은 에이전트가 알려 준 대로 새 터미널 창에서 직접 실행하고, 끝나면 `설치했어. 이어서 해줘`라고 보내세요.
- **Docker나 Podman이 없대요**: 이 튜토리얼은 DB를 써서 꼭 필요해요. [Docker Desktop](https://www.docker.com/products/docker-desktop/)을 받아 설치하고 앱을 켜 둔 뒤 `설치했어. 이어서 해줘`라고 보내세요. Windows는 [Windows 준비](../reference/windows.md#2-docker-desktop-설치-실제-서비스로-만들-때만)를 보세요.
- **Podman 머신이 꺼져 있거나 없대요**: 꺼져 있으면 에이전트가 켜요. 없으면 에이전트가 알려 준 명령(`podman machine init`)을 터미널에서 실행하고, 끝나면 `만들었어. 이어서 해줘`라고 보내세요.
- **{{v:port.neonDb}} 포트가 이미 쓰이고 있대요**: 내 컴퓨터의 다른 DB가 같은 번호(포트)를 쓰고 있을 때예요. 에이전트가 보통 다른 번호로 바꿔요. 멈췄다면 `DB 포트가 겹친대. 다른 포트로 바꿔줘`라고 보내세요.
- **같은 이름의 폴더가 이미 있대요**: `{{name}}2라는 이름으로 만들어줘`처럼 다른 이름을 보내세요.
- **Windows에서 WSL을 쓰라며 멈췄어요**: [Windows 준비](../reference/windows.md)대로 Ubuntu 창에서 다시 하세요.
{{b:trouble-other}}
