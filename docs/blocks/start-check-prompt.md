<!-- tutorials/start/README.md "pro-kit 받기"의 에이전트에게 부탁하는 첫 프롬프트(준비물 확인과 pro-kit 받기). Node 판은 값으로 채운다 -->
```prompt
pro-kit을 쓰려고 해. 다음을 순서대로 해줘.
1. 내 컴퓨터에 Node {{v:node.min}} 이상({{v:node.recommended}} 권장), pnpm, git이 있는지 확인해줘. Docker(또는 Podman)는 실제 서비스를 만들 때만 필요하니 있는지만 알려줘.
2. 없는 게 있으면 무엇을 설치할지 먼저 보여주고, 내가 허락하면 설치해줘.
   비밀번호를 물어보는 명령은 내가 터미널에서 직접 실행하게 명령만 알려줘.
3. 다 갖춰지면 {{v:link.repo}} 저장소를 이 폴더 안에 pro-kit 폴더로 받아줘.
```
