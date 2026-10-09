# 구현 에이전트와 리뷰 에이전트

> 한눈에: 프로킷은 구현과 리뷰를 서로 다른 에이전트에게 나눠 맡겨요. 구현 에이전트는 정해진 파일만 고치고, 리뷰 에이전트는 파일을 읽기만 하며 따로 검토해요. 자기가 짠 코드를 자기가 검토하지 않게 하려는 거예요.

## <!-- v:prokit.agents.count.ko -->두<!-- /v --> 에이전트

| 에이전트 | 맡는 일 | 쓸 수 있는 도구 | 하지 않는 일 |
|---|---|---|---|
| `prokit-implementer` | 코디네이터(메인 세션)가 정한 파일만 만들거나 고쳐요. 테스트가 정해져 있으면 테스트를 먼저 쓰고 실패를 확인한 뒤 구현해요 | 읽기, 쓰기, 고치기, 셸, 검색, 스킬 | `AGENTS.md`, `CLAUDE.md`, `.dev-cycle.json`, `package.json`, 루트 설정, `tasks/todo.md` 고치기. 커밋, push, 배포, DB 마이그레이션 적용, 외부 서비스 호출 |
| `prokit-reviewer` | 바뀐 코드를 읽기 전용으로 검토하고 결과를 JSON 하나로 돌려줘요 | 읽기, 검색, 읽기용 셸(`git diff`, `git log` 등), 스킬 | 파일 만들기와 고치기. 테스트, 빌드, 설치, DB 명령 실행 |

대조표의 리뷰 행(`prokit-reviewer(...)`)은 반드시 `prokit-reviewer`에게 맡겨요. 구현한 쪽이 리뷰 칸을 채우지 않아요.

## 리뷰가 보는 것

코디네이터가 focus, 대조표 마커의 기준 커밋(base SHA), 검토할 파일 목록, 대조표 경로를 줘요. 리뷰 에이전트는 focus에 맞는 스킬을 먼저 읽고 diff와 주변 코드를 봐요.

| focus | 먼저 읽는 것 | 확인하는 것 |
|---|---|---|
| `code` | `prokit-web`, `prokit-api`, `GLOSSARY.md`, `docs/domain/project.md`, React가 바뀌었으면 `vercel-react-best-practices` | 정확성, 오류와 경계 처리, Server·Client Component 경계, 데이터 화면의 네 가지 상태, 불필요한 복잡도, 테스트가 동작을 실제로 검증하는지, 용어집과 어긋나는 새 이름, `docs/domain/project.md` 표에 빠진 항목 |
| `security` | `prokit-api`, `better-auth-security-best-practices` | 세션 없는 접근, 입력으로 받은 소유자 id, where 조건의 소유자 누락, 출력에 섞인 내부 필드, 비밀값의 클라이언트 노출, 인증 설정 |
| `db` | `prokit-db`, `supabase-postgres-best-practices` | 생성 SQL의 데이터 손실, 파괴적 변경의 단계 분리, FK·인덱스·nullable·기본값, `db:push` 흔적, 적용된 마이그레이션 파일의 사후 수정 |

supabase 템플릿은 db focus에서 `supabase` 스킬도 읽고, RLS를 끈 `public` 테이블과 `supabase db push` 흔적, Data API 노출을 함께 봐요. security focus에서는 `service_role` 같은 비밀 키가 `NEXT_PUBLIC_`으로 새는지, 합의 없이 들어온 supabase-js나 Supabase Auth가 있는지도 봐요.

지적마다 파일과 줄, 근거, 최소 수정안을 적어요. 확인하지 못한 추측은 지적으로 올리지 않고 한계(`limitations`)에 적어요.

```json
{"verdict":"approve|changes-required|blocked","focus":"code|security|db","skills_read":["실제로 읽은 스킬 이름"],"max_severity":"none|low|medium|high|critical","findings":[{"severity":"high","file":"경로","line":42,"evidence":"근거","fix":"수정안"}],"limitations":["확인하지 못한 것"]}
```

- high 이상 지적이 있으면 approve를 내지 않아요.
- diff나 파일을 읽을 수 없으면 `blocked`예요.

## 자세히

### 코디네이터가 하는 일

- 리뷰 결과를 증거 칸에 요약해요. 예: `prokit-reviewer(code): approve, max=low, 지적 2 (반영 1, 기각 1: 재현 안 됨)`.
- `skills_read`에 focus 스킬이 빠졌으면 읽고 다시 리뷰하게 해요.
- 지적은 직접 확인한 뒤에만 고쳐요. high 이상 지적을 고쳤으면 같은 focus로 다시 리뷰받아요. 응답이 없거나 JSON이 깨졌으면 `blocked`로 적어요.
- 코드 리뷰 행에서는 `ponytail-review`로 과설계 목록도 받아 함께 적어요(`ponytail-review: net -12 lines, 반영 2, 기각 1`).
- 구현을 맡길 때는 정확한 파일 목록, 읽을 `prokit-*` 스킬, 완료 조건을 줘요. 여러 개를 나란히 맡길 때는 파일이 겹치지 않게 나눠요. `AGENTS.md`, `.dev-cycle.json`, `package.json`, 루트 설정은 직접 고쳐요.
- impeccable `critique`처럼 서브에이전트를 스스로 띄우는 스킬은 메인 세션에서 실행해요.

### 에이전트 도구마다 읽는 파일

에이전트의 정본은 `.claude/agents/`에 있어요. Claude Code와 Grok Build는 이 파일을 그대로 읽고, Codex용 `.codex/agents/`와 Antigravity용 `.agents/agents/`는 이 정본에서 자동으로 만들어요.

```bash
pnpm agents:sync    # .claude/agents에서 .codex/agents와 .agents/agents를 다시 만든다
pnpm agents:check   # 정본과 생성물이 맞는지 검사한다
```

`.claude/agents` 정의 파일에는 쓸 모델도 적혀 있어요. 구현은 `sonnet`, 리뷰는 `opus`예요. Codex·Antigravity용 파일에는 모델을 적지 않고 세션의 모델을 그대로 써요. Antigravity용 리뷰 에이전트는 파일을 읽고 찾고 명령을 실행하는 도구만 받아요.

## 관련 문서

- [하네스 엔지니어링](harness.md)
- [dev-cycle 라운드](dev-cycle.md)
- [케이스 <!-- v:devCycle.cases.range -->A\~F·H<!-- /v -->와 대조표](cases.md)
- [prokit 스킬 <!-- v:prokit.skills.count -->8<!-- /v -->개](../skills/prokit-skills.md)
