# pro-kit-ui

프로킷 UI 스킬셋입니다. AI 에이전트(Claude Code, Codex, Antigravity, Grok Build)가 이 저장소의 `AGENTS.md`대로 Better-T-Stack Next.js 프로젝트를 만들고, 화면 작업용 스킬과 규칙을 설치합니다. DB 없이 예시 데이터로 화면을 만들고, HTML로 내보내거나 GitHub Pages·Vercel에 올립니다. 화면 프리셋 팩으로 시작할 수도 있습니다.

이 저장소는 [pro-kit](<!-- v:link.repo -->https://github.com/roadkwon-ai/pro-kit<!-- /v -->)에서 생성한 읽기 전용 사본입니다. pro-kit을 릴리스할 때 같은 버전으로 다시 만들어집니다. 이슈와 기여는 pro-kit에 남겨 주세요.

## 시작하기

준비물은 Node <!-- v:node.min -->22.20<!-- /v --> 이상(<!-- v:node.recommended -->24<!-- /v --> 권장), pnpm, git입니다. Windows는 WSL2의 Ubuntu에서 진행합니다.

작업 폴더에서 에이전트를 열고 이렇게 요청합니다. `[ ]` 안은 바꿔 쓰세요.

```text
[https://github.com/roadkwon-ai/pro-kit-ui] 저장소를 이 폴더에 받고, 그 안의 AGENTS.md대로 화면만 만들 프로젝트를 그 옆에 [my-screens] 폴더로 만들어줘.
[누가 쓰는 서비스인지, 어떤 화면이 필요한지]
```

에이전트가 PRD(서비스 설명)를 바탕으로 스킬 구성을 추천하고, 프로젝트를 만든 뒤 새 폴더에서 이어 갈 명령을 알려 줍니다. 튜토리얼과 문서는 [프로킷 사이트](<!-- v:link.home -->https://prokit-web.vercel.app<!-- /v -->)에 있습니다.

## UI 스킬셋과 Pro 스킬셋

| 항목 | UI 스킬셋 (이 저장소) | Pro 스킬셋 (`pro-kit`) |
|---|---|---|
| 템플릿 | `prokit-next-neon`(화면만) | Neon, Supabase 템플릿 두 개 |
| 프로킷 스킬 | 첫 설정(`prokit-init`), 진행(`prokit-dev-cycle`), 화면(`prokit-ui`), 검사(`prokit-verify`), 팩 활용(`prokit-pack-use`), 스킬 구성 변경(`prokit-skills-manage`), 스킬 갱신(`prokit-skills-update`) | UI 스킬셋의 스킬과 화면 동작·API·DB·배포 스킬 |
| 화면 프리셋 팩 | 쓸 수 있습니다 | 쓸 수 있습니다 |
| 로그인·저장 같은 실제 서비스, 클론 코딩, 기존 프로젝트 도입 | 없습니다 | 있습니다 |

## Pro 스킬셋으로 올리기

화면만 만든 프로젝트를 실제 서비스로 바꾸려면 Pro 스킬셋이 필요합니다. `pro-kit`을 받은 폴더에서 에이전트를 열고 "템플릿 변경을 [프로젝트 경로]에 반영해줘"라고 요청하면, 빠진 서버 스킬과 바뀐 파일을 알려 주고 그 프로젝트의 세션에서 옮기게 안내합니다.

## 라이선스

프로킷 자체 코드·스킬·문서는 [MIT License](LICENSE)로 제공합니다. 원본 출처에서 설치되는 외부 스킬에는 [원래 조건](THIRD_PARTY_NOTICES.md)이 적용됩니다.
