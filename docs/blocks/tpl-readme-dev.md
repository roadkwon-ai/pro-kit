<!-- 두 템플릿 README "템플릿 자체 개발" 절의 목록. 인자: me(이 템플릿 이름), other(다른 템플릿 이름), josa(other 뒤 조사. 와 또는 과) -->
- 테스트: `node --test 'templates/{{me}}/tests/*.test.mjs'` (저장소 루트에서 실행. 디렉터리 인자는 Node 24에서 동작하지 않는다)
- 공유 파일을 [{{other}}](../{{other}}/README.md){{josa}} 같게 두는 규칙은 [AGENTS.md "템플릿 수정 규칙"](../../AGENTS.md#템플릿-수정-규칙)에 있다(`tests/shared-files.test.mjs`가 검사한다).
- 스킬 eval 입력: `templates/{{me}}/evals/` (skill-creator 형식)
- `tests/skills.test.mjs`는 skill-creator(`SKILL_CREATOR_DIR`로 지정 가능)와 `python3`가 필요하다.
