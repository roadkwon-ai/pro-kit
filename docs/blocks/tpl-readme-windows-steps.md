<!-- 두 템플릿 README "Windows" 절 번호 목록의 1~2번(WSL 설치, 도구 설치). 3번부터 템플릿마다 달라 번호 목록 중간이라 묶음 표시를 달면 목록이 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 -->
1. PowerShell에서 `wsl --install`을 실행하고(기본 배포판은 Ubuntu 최신 LTS) 재부팅한 뒤 Ubuntu 사용자를 만든다. 아래 명령과 이후 명령은 모두 Ubuntu 셸에서 실행한다.
2. Node(nvm 같은 사용자 설치. `npm install -g`에 sudo가 필요 없다), pnpm, git, Claude Code·Codex를 WSL 안에 설치한다. 이 저장소와 새 프로젝트는 WSL 홈(`~/`)에 둔다. `/mnt/c` 아래는 파일 접근이 느리고 개발 서버가 파일 변경을 늦게 알아챈다.
