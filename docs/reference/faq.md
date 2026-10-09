# 자주 묻는 질문
https://prokit-web.vercel.app/docs/reference/faq/

> 한눈에: 프로킷을 처음 쓸 때 자주 묻는 질문과 답을 모았어요. 답마다 더 자세한 쪽으로 이어져요. 막혔을 때 붙여 넣을 프롬프트는 튜토리얼의 [막혔을 때](https://prokit-web.vercel.app/tutorials/reference/troubleshooting/)에 있어요.

## 시작하기 전에

### 코드를 몰라도 쓸 수 있나요?

네. 평소 말로 요청하고 에이전트의 확인 질문에 답하면 돼요. 무엇을 먼저 확인하고 어떤 테스트를 할지는 스킬이 정해요. 처음이라면 프롬프트를 붙여 넣으며 따라 하는 [튜토리얼](https://prokit-web.vercel.app/tutorials/)부터 보세요.

### Claude Code와 Codex 중 무엇을 써야 하나요?

둘 다 돼요. 프로킷이 두 에이전트에 같은 규칙과 스킬을 설치하니 같은 프롬프트를 쓰면 돼요. Codex는 프로젝트를 신뢰(trusted)해야 구현·리뷰 에이전트를 불러와요. 조작 차이는 [Claude Code와 Codex](https://prokit-web.vercel.app/tutorials/reference/claude-code-and-codex/)에 있어요.

### Antigravity나 Grok Build로도 쓸 수 있나요?

네. 두 도구도 Codex처럼 프로킷의 규칙과 스킬을 읽어요. Antigravity는 agy -i "<요청>", Grok Build는 grok --trust "<요청>"로 열어요. Grok Build는 폴더를 신뢰해야 규칙과 스킬을 읽어요. Antigravity로는 구현부터 리뷰까지 한 라운드를 사용자 확인 직전까지 돌려 봤고, Grok Build는 무료 사용량 한도 때문에 대조표를 여는 데까지만 확인했어요. Grok Build는 Claude 설정도 함께 읽어서, 전역에 설치한 Claude 플러그인이 같이 보일 수 있어요. 긴 작업에는 유료 요금제가 필요할 수 있어요. 도구마다 읽는 파일과 확인한 범위는 [지원하는 에이전트](https://prokit-web.vercel.app/docs/start/supported-agents/)에 있어요.

### 비용은 얼마나 드나요?

Claude Code와 Codex는 각자의 유료 요금제로 써요. Antigravity와 Grok Build도 각자의 요금제를 따라요. 요금제마다 사용량 한도가 있고, 화면 디자인과 모든 페이지 만들기는 사용량이 많은 작업이에요. 이미지를 OpenAI API 키로 그리면 그 비용은 따로 나가요. 요금제와 시간·비용을 읽는 법은 [비용과 키](https://prokit-web.vercel.app/tutorials/reference/costs-and-keys/)에 있어요. 만드는 순서와 단계마다 실제로 걸린 시간은 [만드는 과정과 걸리는 시간](https://prokit-web.vercel.app/tutorials/reference/process-and-time/)에 있어요.

### Windows에서도 되나요?

WSL2의 Ubuntu 안에서만 돼요. PowerShell이나 Git Bash에서는 설치가 멈춰요. 준비 순서는 [Windows 준비](https://prokit-web.vercel.app/tutorials/reference/windows/)에 있어요.

## 만들 때

### DB 없이 화면만 만들 수 있나요?

네. 프롬프트에 "화면만", "DB는 쓰지 않아"를 넣으면 DB 없이 예시 데이터로 모든 화면을 만들고, 요청하면 HTML로 내보내요. 컨테이너 엔진도 필요 없어요([빠른 시작: 화면만 만들기](https://prokit-web.vercel.app/docs/start/quickstart-screens/)).

### 화면만 만든 걸 나중에 실제 서비스로 바꿀 수 있나요?

네. "실제 서비스로 바꿀 거야"라고 하면 로컬 DB와 첫 마이그레이션을 더하고, 로그인과 저장 같은 기능은 dev-cycle 라운드로 이어서 만들어요([화면만 프로젝트와 HTML 내보내기](https://prokit-web.vercel.app/docs/design/screen-only/)).

### neon과 supabase 중 무엇을 골라야 하나요?

기능을 바꿀 때마다 DB의 테스트용 복사본(브랜치)을 만들어 확인하고 싶으면 neon, 이미 Supabase를 쓰고 있으면 supabase예요. 앱 코드 구성은 같아요([템플릿 고르기](https://prokit-web.vercel.app/docs/templates/choose/)).

### 스킬을 직접 불러야 하나요?

아니요. 평소 말로 요청하면 에이전트가 맞는 스킬을 스스로 불러요. 직접 부르고 싶을 때만 Claude Code는 `/prokit-ui`, Codex는 `$prokit-ui`처럼 써요([prokit 스킬 8개](https://prokit-web.vercel.app/docs/skills/prokit-skills/)).

### 프리셋과 같은 프롬프트로 만들면 똑같이 나오나요?

100% 똑같지는 않을 수 있어요. 같은 프롬프트라도 에이전트, 모델, 그날의 판단에 따라 디자인과 문구가 조금씩 달라져요. 프리셋 팩(화면 구성, 디자인, 예시 데이터, 그림을 묶은 재료)을 쓰면 더 가깝게 만들 수 있어요([프리셋으로 만들어 보기](https://prokit-web.vercel.app/tutorials/samples/#프리셋으로-만들어-보기)).

## 만든 뒤

### 새 세션을 열면 프로젝트를 다시 설명해야 하나요?

아니요. 에이전트는 시작할 때 `AGENTS.md`, `GLOSSARY.md`(용어집), `docs/domain/project.md`(프로젝트 소개)를 읽고, `pnpm dev-cycle status`로 진행 중인 작업을 이어받아요. "하던 작업 이어서 해줘"라고 하면 돼요([만든 뒤 개발하기](https://prokit-web.vercel.app/docs/start/after-create/)).

### 에이전트가 운영 DB나 배포를 마음대로 하나요?

아니요. 원격 DB 연결과 전역 도구 설치(agent-browser CLI 제외)는 요청할 때만 해요. 커밋과 push는 작업(라운드)을 마칠 때 하고, 배포는 요청하거나 라운드 끝에서 고를 때만 해요. 운영 DB에 마이그레이션을 적용하기 전에는 목록을, 운영에 배포할 때마다 버전과 릴리스 노트를 보여 주고 동의를 받아요([Vercel 배포와 되돌리기](https://prokit-web.vercel.app/docs/deploy/vercel/)).

### "완료했어요"라는 말을 믿어도 되나요?

에이전트는 대조표의 모든 칸을 실제로 실행한 명령과 결과로 채우고 `audit`을 통과한 뒤에만 완료라고 해요. 마지막 칸은 사용자가 결과를 직접 보고 확인하는 칸이라서 그 확인이 끝나야 작업도 끝나요([증거와 audit, 사용자 확인](https://prokit-web.vercel.app/docs/concepts/audit-and-confirm/)).

### 이미 만든 프로젝트에 템플릿의 새 내용을 넣을 수 있나요?

네. pro-kit 폴더에서 "템플릿 변경을 <프로젝트>에 반영해줘"라고 하면 차이를 먼저 보여 주고, 실제 반영은 그 프로젝트의 세션에서 라운드로 해요([기존 프로젝트에 갱신 반영](https://prokit-web.vercel.app/docs/templates/update-existing/)).

## 관련 문서

- [프로킷이란](https://prokit-web.vercel.app/docs/start/what-is-prokit/)
- [막혔을 때](https://prokit-web.vercel.app/tutorials/reference/troubleshooting/)
- [처음 보는 용어](https://prokit-web.vercel.app/tutorials/reference/glossary/)
