# 제3자 구성 요소와 원본 조건

확인일: 2026-10-08. 프로킷 자체 코드·스킬·문서에는 [MIT License](LICENSE)를 적용한다. 이 안내는 원본 출처와 적용 범위를 구분하며, 외부 원본의 이용허락을 새로 부여하거나 원래 조건을 바꾸지 않는다.

## 설치 목록으로 받는 외부 스킬

템플릿의 외부 스킬·플러그인은 `skills.manifest.json`을 기준으로 사용자 프로젝트에 원본 출처에서 직접 설치한다. 기본 스킬은 `npx -y skills@latest add <source> --skill …` 경로를 사용한다. 프로킷이 그 원본을 자기 패키지에 동봉하거나 자체 미러에서 배포하는 방식과 구분한다. 이미 설치된 스킬의 갱신은 별도 업데이트 흐름이므로 설치기 실행 때마다 모두 다시 받는다는 뜻은 아니다.

- 적용 목록의 정본은 [Neon 템플릿 manifest](templates/prokit-next-neon/files/skills.manifest.json)와 [Supabase 템플릿 manifest](templates/prokit-next-supabase/files/skills.manifest.json)다.
- 외부 원문은 그 출처의 실제 설치 판과 라이선스·고지에 따른다. 프로킷의 MIT는 외부 원본의 이용권을 축소하지 않는다.
- 프로킷 자체 LICENSE가 외부 원본의 상업 이용·수정·재배포 권리를 대신 부여하지도 않는다. 해당 라이선스가 이미 허용하는 이용은 그 조건을 지키면 별도 개별 허락이 필요하지 않다.
- 원본의 저작권·LICENSE·해당 NOTICE·변경 고지를 유지한다. 생성 프로젝트에 설치된 외부 원문을 포함해 소스를 전달하거나 공개할 때에는 실제 원본 조건을 확인한다.
- 원본 설치 안내가 있다는 사실과 모든 상업 이용·수정·재배포 범위가 명시되어 있다는 사실은 구분한다. 이번 확인을 미래 최신판이나 전체 전이 의존성에 대한 보장으로 사용하지 않는다.

### 명시 라이선스가 미확인인 두 출처

두 출처 모두 사용자 설치·개발 보조 활용을 안내하는 공개 근거를 확인했다. 그러나 아래 고정 판에서 상업 이용·수정·재배포의 범위를 명시하는 소스 라이선스는 발견하지 못했다. 표준 라이선스로 추정하거나 이용 금지로 확정하지 않는다. 설치 목록은 원본을 가리키며, 본 안내는 추가 권한의 근거가 아니다.

| 출처 | 확인 판·범위 | 공개 설치 안내 | 명시 소스 라이선스 |
|---|---|---|---|
| [Better Auth skills](https://github.com/better-auth/skills) | `20c9e88a5c007461a703f1c213572b073196113e`, 재귀 트리 11파일 및 내용 | [공식 Skills 문서](https://better-auth.com/docs/ai-resources/skills)의 skills CLI 안내 | LICENSE·허가문·메타데이터에서 미확인. Better Auth 라이브러리의 MIT를 자동 적용하지 않음 |
| [GENEXIS-AI GPT Image Skill](https://github.com/GENEXIS-AI/gpt-image-skill) | `3be04a680fc7a1b10e810687699f36d7eb2db2ae`, 전체 15파일 중 텍스트 13파일 | [작성자 README](https://github.com/GENEXIS-AI/gpt-image-skill/blob/3be04a680fc7a1b10e810687699f36d7eb2db2ae/README.md), [AGENT_INSTALL](https://github.com/GENEXIS-AI/gpt-image-skill/blob/3be04a680fc7a1b10e810687699f36d7eb2db2ae/AGENT_INSTALL.md) | LICENSE·허가문·SKILL 헤더에서 미확인. 설치 프롬프트의 사용자 작업 동의를 소스 라이선스로 해석하지 않음 |

두 원본에 대한 추가 공개 허락이나 라이선스가 확인되면 이 안내를 갱신한다. 실제 용도에 필요한 권리 근거를 확보하지 못한 이용에 대해서는 권리자 확인 또는 구성의 제외·대체를 검토한다. 이 검토를 전부 사용자 책임으로 돌리는 면책으로 해석하지 않는다.

### 확인한 핵심 원본의 참고 조건

아래는 확인한 원본 판의 조건 요약이다. 설치기는 최신판을 받으므로 설치된 LICENSE/NOTICE와 경로별 예외가 기준이며, 이 표를 원본 전문 대신 사용하지 않는다.

| 대상 | 확인 조건 | 원본 근거 |
|---|---|---|
| Next.js | MIT | [확인 판 LICENSE](https://github.com/vercel/next.js/blob/b22e5a299cb58577ce86f21b6a0f7bb31a6168f2/license.md) |
| Vercel agent-skills | README의 MIT 선언, 개별 경로 확인 | [확인 판 README](https://github.com/vercel-labs/agent-skills/blob/063bee94c3f4df8453406c830b0a7df0f2860278/README.md) |
| Vercel plugin | Apache 2.0 | [확인 판 저장소](https://github.com/vercel/vercel-plugin/tree/82fa491886796702df4727fd0845f0c7c1d3d16e) |
| Neon agent-skills | Apache 2.0 | [확인 판 LICENSE](https://github.com/neondatabase/agent-skills/blob/9e4a5705922fddb540c396111a7979e0dca79cc2/LICENSE) |
| Supabase agent-skills | MIT | [확인 판 LICENSE](https://github.com/supabase/agent-skills/blob/c9be0e931b7930f7d02126d04774d904c381e7d7/LICENSE) |
| Superpowers | MIT | [확인 판 LICENSE](https://github.com/obra/superpowers/blob/8ca22dba9a94f28898bbce59f2537ff4d87c747d/LICENSE) |
| Ponytail | MIT | [확인 판 LICENSE](https://github.com/DietrichGebert/ponytail/blob/552acd5efd0aeae2583a12efe39373d2f076f25e/LICENSE) |
| Anthropic skill-creator | 해당 skill 경로의 Apache 2.0 | [확인 판 LICENSE](https://github.com/anthropics/skills/blob/683bc88e56f3e09ba94f7055977f3d3aa499f202/skills/skill-creator/LICENSE.txt). 저장소 전체나 다른 스킬의 조건을 일괄 판정하지 않음 |

### 매니페스트의 외부 source 목록

다음은 두 템플릿의 기본·선택 스킬 출처를 합친 목록이다. source 이름만으로 라이선스를 정하지 않는다.

- [CaesiumY/ko-design-md](https://github.com/CaesiumY/ko-design-md)
- [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)
- [GENEXIS-AI/gpt-image-skill](https://github.com/GENEXIS-AI/gpt-image-skill)
- [anthropics/skills](https://github.com/anthropics/skills)
- [better-auth/skills](https://github.com/better-auth/skills)
- [mattpocock/skills](https://github.com/mattpocock/skills)
- [neondatabase/agent-skills](https://github.com/neondatabase/agent-skills)
- [obra/superpowers](https://github.com/obra/superpowers)
- [pbakaus/impeccable](https://github.com/pbakaus/impeccable)
- [shadcn/ui](https://github.com/shadcn/ui)
- [supabase/agent-skills](https://github.com/supabase/agent-skills)
- [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser)
- [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)
- [vercel/next.js](https://github.com/vercel/next.js)
- [vercel/turborepo](https://github.com/vercel/turborepo)
- [vercel/vercel-plugin](https://github.com/vercel/vercel-plugin)

Claude marketplace 플러그인·OMX/gstack·CLI 등 별도 도구와 실행 패키지의 조건도 각각 구분한다. 실제 설치 대상은 manifest의 `claude`·`global` 및 선택 그룹에 있으며, 이 문서는 전체 설치본·전이 의존성에 대한 완전한 권리 감사를 주장하지 않는다.

## 이 저장소에 실제로 포함된 Neon 자료

설치 목록과 별도로 저장소 루트에는 아래 Neon 원문 사본 32파일이 포함되어 있다. 이 부분에는 프로킷 MIT가 아닌 Apache 2.0 조건을 유지한다.

- 경로: `.agents/skills/neon-postgres/**`, `.claude/skills/neon/**`, `.claude/skills/neon-*/**`.
- 원본: [neondatabase/agent-skills](https://github.com/neondatabase/agent-skills).
- 원본의 Apache 2.0 전문: [licenses/neon-agent-skills/LICENSE](licenses/neon-agent-skills/LICENSE). 원래 전문을 수정하지 않고 보존한다.
- 30파일은 원본 `9e4a5705922fddb540c396111a7979e0dca79cc2`의 해당 경로와 바이트가 일치한다.
- `.claude/skills/neon/SKILL.md`는 원본 `b4016a34956ed782ce23f3c003ac9bf2a75b8d35`와 바이트가 일치한다.
- `.claude/skills/neon-functions/SKILL.md`는 원본 `b870d743a35dbe943d6d6f73711930aa58db727c`와 바이트가 일치한다.
- 위 세 원본 판의 LICENSE는 동일한 Apache 2.0 전문이다. 해당 재귀 파일 트리에서 별도 NOTICE 파일을 발견하지 못했다. 차이가 있던 두 파일은 위 원본 판과의 일치로 확인했으며 프로킷 자체 수정으로 표시하지 않는다.
- 원본 파일의 출처·기존 고지를 유지한다. 이후 원문을 수정하여 배포하면 해당 파일에 변경 사실을 명확히 표시하고 관련 고지를 보존한다.

이 자료의 원래 저작권·기여자 권리는 원저작권자에게 있다. LICENSE 전문의 예시 저작권 칸을 프로킷 권리자로 채우거나 외부 원본의 권리를 프로킷 소유로 표시하지 않는다.

## 사용자 작성 코드와 프리셋 팩

프로킷을 개발 보조로 사용했다는 이유만으로 사용자 독자 작성 코드나 BTS 생성 코드 전체의 저작권이 프로킷에 이전되거나 MIT로 바뀌지 않는다. 템플릿이 복사한 경로는 생성 프로젝트의 `licenses/PROKIT-SCOPE.md`로 구분한다. 그 경로 안의 제3자 원본은 원래 조건이 우선한다.

프리셋 팩 ZIP은 팩에 동봉·표시한 조건을 따른다.

GitHub 공개 저장소의 열람·서비스 내 fork 권리는 [GitHub 약관 D.5](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#5-license-grant-to-other-users)에 따르며, 플랫폼에서 설치할 수 있다는 사실을 포괄적 상업 이용허락으로 안내하지 않는다.
