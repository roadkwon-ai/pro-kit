<!-- 두 템플릿 README 명령 표의 claude plugin update 행(supabase 템플릿은 앞에 supabase 행 둘이 더 있다). 표 중간이라 묶음 표시를 달면 표가 끊기므로, 표시 없이 이 원본과 같은 글로 두고 테스트(CASES)가 지킨다 -->
| `claude plugin update <플러그인> --scope project` | Claude 플러그인 업데이트. `pnpm skills:update`는 플러그인을 올리지 않는다. `claude plugin marketplace update <마켓플레이스>`로 목록을 받고 플러그인 저장소의 `hooks/` 변경을 본 뒤 올린다. 세션을 다시 열어야 적용된다(`prokit-skills-update`) |
