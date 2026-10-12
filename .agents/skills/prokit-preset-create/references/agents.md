# 역할 배정과 설치

정본은 이 폴더의 `agents/prokit-preset-{researcher,implementer,reviewer}.md` 세 파일이다. 관리 환경과 명시된 공식 프리셋 작업공간에만 설치한다. 일반 사용자 템플릿에 설치하지 않는다.

```bash
node <이 스킬>/scripts/install-agents.mjs --target <작업공간> --sync <pro-kit>/templates/prokit-next-neon/files/scripts/sync-agents.mjs --check
node <이 스킬>/scripts/install-agents.mjs --target <작업공간> --sync <동일경로> --write
```

helper는 기존 변환기의 parseAgent/toToml/toAntigravity를 사용해 지정한 세 역할만 비교·설치한다. converter에 toAntigravity가 없으면 Claude·Codex만 처리하고 unsupported에 antigravity를 기록한다. matched는 supported 출력에만 적용하며 unsupported 설치를 주장하지 않는다. 다른 역할을 동기화하거나 삭제하지 않는다. 기존 다른 내용은 기본적으로 거부한다. 검토한 기존 파일을 갱신할 때만 `--replace-reviewed`를 함께 쓴다. 적용 전 모든 대상의 충돌을 검사한다. 출력 sourceSha256/installedSha256과 차이를 보존한다.

역할 파일은 공통 논리 프로필이다. Claude Code·Codex·Antigravity의 지원 도구와 위임 방식에 맞춰 적용하며 특정 호스트의 도구 이름을 존재한다고 추정하지 않는다. 파일 설치가 native agent_type 노출을 보장하지 않는다. 현재 도구의 역할 목록에서 실제 노출을 확인한다. 없으면 기존 일반 native 역할에 이 논리 프로필 본문을 전달하고 이를 보고한다. 새 타입을 존재하는 것처럼 호출하지 않는다.

연구자에게 원본 URL·허용 읽기 범위·증거 위치를, 구현자에게 관측 계약·허용 차이·소유 파일을, 독립 검수자에게 원본과 제품 주소·최소 원시 증거를 준다. 검수자에게 예상 결론이나 의심 결함을 주지 않는다. 모든 수행자는 다른 작업 변경을 보존하며 범위 밖 변경을 Main에 보고한다.
