<!-- 클론 튜토리얼 README(tutorials/01-nextflix, 02-claudle)의 "막히면" 목록 전체(첫 프롬프트 공통 줄, 프리셋 팩, Docker, 한도). 목록이 끊기지 않게 목록 전체를 묶는다. 인자: folder와 name(둘 다 프로젝트 이름. 포함한 first-trouble은 folder, trouble-pack은 name을 쓴다), iyo(이름 뒤 "예요" 또는 "이에요") -->
{{b:first-trouble}}
{{b:trouble-pack}}
- **Docker나 Podman이 없다고 멈췄어요**: [Docker Desktop](https://www.docker.com/products/docker-desktop/)을 받아 설치하고 앱을 켜 두세요. 그다음 `설치했어. 이어서 해줘`라고 보내세요.
- **DESIGN.md를 받지 못했대요**: [3장의 막히면](03-design.md#1-designmd-받아-고치기)대로 하세요.
- **사용량 한도에 걸려 멈췄어요**: 안내된 시간이 지난 뒤 멈춘 폴더에서 `claude --continue --dangerously-skip-permissions`(Codex는 `codex resume --last --yolo`)로 다시 열고 `이어서 해줘`라고 보내세요. 2단계에서 멈췄으면 `~/projects`, 3·4단계면 `~/projects/{{folder}}`{{iyo}}. 기다리는 법은 [{{v:limit.window}} 한도에 걸리면](../reference/costs-and-keys.md#5시간-한도에-걸리면)에 있어요.
{{b:trouble-other}}
