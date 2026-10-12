---
name: prokit-docs
description: >-
  프로킷의 handbook·tutorials·루트 README와 프리셋 팩 안내·교재를 작성하거나 구조·기술 사실을 검수할 때 사용한다.
  쪽과 묶음 추가, 튜토리얼 장 작성, 팩 README·CUSTOMIZE·화면·출처 안내, 복원·개인화·실전 개발 안내,
  검증 자료 인계, 공통 값·링크·도식·홈페이지 문서 메뉴를 다룬다. 문장 검수는 prokit-writing,
  화면 모양은 prokit-ui, 사이트 코드는 prokit-web이 맡는다. 원본 조사·COPY 제작·촬영·품질 판정은
  prokit-preset-create와 prokit-preset-verify, 완성팩 적용 개발은 prokit-pack-use가 맡는다.
---

# 프로킷 문서 쪽

pro-kit 저장소의 문서 쪽(`handbook/`, `tutorials/`, 루트 `README.md`·`CONTRIBUTING.md`)을 새로 만들거나 구조를 바꾸는 절차다. 문장 규칙은 `prokit-writing`이 맡는다. 홈페이지(pro-kit-web)는 이 원본을 복사해 그리므로, 원본을 바르게 쓰면 홈페이지도 맞는다.

값과 검사의 정본은 저장소에 있다. 이 스킬은 판단 순서와 명령만 두고, 정본 파일은 경로로 가리킨다. 스킬과 저장소 파일이 다르면 저장소 파일을 따르고 사용자에게 알린다.

팩 문서는 `pro-kit-samples`의 팩 정본에서 작성한다. 프리셋 제작·활용 스킬의 기술 지침은 해당 기술 담당과 `skill-creator`가 결정하고, 이 스킬은 인계 자료와 사용자 안내의 구조·사실을 다룬다. 문서 편집으로 제품의 COPY 결정이나 지원 기능을 바꾸지 않는다. 가상 정보·미설정 URL도 원본 구성의 자리를 보존하며, 코드나 팩 인수 자료로 확인하지 못한 렌더링·클릭·비활성·숨김 동작은 가능성 표현으로도 추정하지 않고 미확인으로 적는다. 개인화 예시는 인계된 가상·예약 예시 값을 유지하고, 기술 설정 안내만으로 법률 준수나 인허가·사업자 고지 요건 충족을 보장하지 않는다.

## 어떤 쪽인가

| 쪽 | 위치 | 먼저 읽을 참조 |
|---|---|---|
| handbook 쪽, 묶음 소개(`README.md`), 문서 홈 | `handbook/` | [references/handbook.md](references/handbook.md) |
| 튜토리얼 장, 과정 첫 쪽, 가이드, 샘플 쪽 | `tutorials/` | [references/tutorial.md](references/tutorial.md) |
| 두 곳 이상에 쓰는 값과 글, 시간과 비용 | 어디든 | [references/shared-values.md](references/shared-values.md) |
| 쪽 옮기기와 지우기 | `handbook/`, `tutorials/` | [references/handbook.md](references/handbook.md)의 "쪽 옮기기·지우기", 이어서 [references/page-actions.md](references/page-actions.md) |
| 새 묶음, 새 과정, 다른 쪽을 가리키는 말 | `handbook/`, `tutorials/` | [references/page-actions.md](references/page-actions.md) |
| 팩 안내·복원·개인화·실전 개발 안내, 제작·활용 안내 | 팩 정본과 담당 저장소의 문서 | [references/preset-pack.md](references/preset-pack.md) |
| 루트 `README.md`, `CONTRIBUTING.md` | pro-kit 루트 | 아래 "루트 문서" |

할 일이 표의 여러 줄에 걸리면 해당하는 참조를 모두 읽는다. 표에 없는 문서(설계 기록, 릴리스 노트)는 이 스킬의 대상이 아니다.

## 공통 절차

아래 쪽 표·값 표시·홈페이지 동기화 절차는 handbook·tutorials에 적용한다. 팩 문서는 `preset-pack.md`의 인계·검사를 따르고, 교재도 함께 고칠 때 해당 문서 절차를 병행한다.

1. **순서 표를 본다.** handbook은 문서 홈과 묶음 `README.md`의 표, 튜토리얼은 과정 첫 쪽의 장 표가 순서의 정본이다. 새 쪽은 표에 행을 더해야 생긴다.
2. **이웃 쪽 하나를 연다.** 같은 handbook 묶음이나 같은 과정의 쪽을 열어 뼈대, 절 이름, 글 묶음 표시를 따른다. 기억으로 틀을 만들지 않는다.
3. **사실은 원본과 대조한다.** 명령, 옵션, 포트, 파일 이름, 스킬 수는 템플릿 파일과 템플릿 README, 스킬, `VERIFICATION.md`에서 확인한다. 확인되지 않는 내용은 쓰지 않는다.
4. **이미 있는 설명은 링크한다.** 같은 글을 두 곳에 쓰지 않는다. 비용과 키, Windows, 문제 해결, 용어 풀이는 `tutorials/reference/`의 가이드로 링크한다. 외부 서비스의 요금표와 한도 수치는 옮기지 않고 공식 페이지로 링크한다. 프로킷이 기대는 판과 날짜는 이미 있는 값 키(`vercel.node`, `node.eol` 등)로 쓰고, 새로 필요하면 출처와 날짜를 보고에 적는다. 가이드에 내용이 모자라 보이면 handbook에 새로 쓰지 말고 그 점을 보고에 적는다. 사용자가 요금이나 한도를 다루는 쪽을 직접 청했으면 멈춰서 묻지 않는다. 규칙 안에서 쪽을 만들고(요금과 한도는 공식 페이지 링크, 비용 설명은 가이드 링크, 프로킷이 기대는 조건만), 옮기지 않은 수치와 그 이유를 보고에 적는다. 요금·한도 쪽에서는 조건을 숫자 없이 쓴다. 그 쪽의 숫자는 이미 있는 값 키만 쓰고, 새 값 키나 맨숫자는 만들지 않는다. 필요해 보이는 수치는 출처와 함께 보고에만 적는다.
5. **값과 글을 공통으로 둘지 정한다.** 다른 문서에도 있는 값(시간, 포트, 판, 개수, 주소)과 글은 값 표시와 묶음으로 쓴다. [references/shared-values.md](references/shared-values.md)의 판단 순서를 따른다.
6. **링크, 앵커, 도식을 단다.** 다른 쪽을 가리키는 말("앞 장에서", "4장의", "가이드의")에는 그 쪽 링크를 단다. 홈페이지는 쪽 하나만 AI에게 보내므로, 그 쪽만 읽어도 뜻이 통해야 한다. 도식은 Mermaid 코드 블록으로 둔다.
7. **문장을 다듬는다.** 같은 설치 폴더의 `../prokit-writing/SKILL.md`를 읽고 따른다(없으면 `.agents/skills/`, `.claude/skills/`, `~/.agents/skills/`에서 찾는다). 그 스킬이 어디에도 없으면 `prokit-writing` 설치를 알리고 세 가지만 지킨다. 문체(handbook과 tutorials는 해요체, 루트 `README.md`·`CONTRIBUTING.md`는 `~습니다`), 엠대시 없음, 범위 `\~`다.
8. **검사한다.** 새 파일은 먼저 `git add`로 추적에 넣는다. pro-kit 스크립트는 `git ls-files`로 문서를 찾으므로 추적하지 않은 새 쪽은 중복 글, 맨시간, 값 검사에서 빠진다. 값 표시나 묶음 표시를 더하거나 뺐으면(새 쪽에 넣은 것 포함) `node scripts/doc-values.mjs`로 채운다. `docs/common-values.md` 목록 표의 쓰는 곳 수도 함께 바뀐다. 그다음 아래 검사가 모두 통과해야 끝난다.
9. **홈페이지 반영을 알린다.** 새 쪽, 새 묶음, 옮긴 쪽은 pro-kit-web에서 sync와 검사를 해야 사이트에 나온다. 보고에 할 일을 적는다(pro-kit 세션에서 pro-kit-web을 고치지 않는다).

## 검사 명령

검사 명령은 이 표가 정본이다. references는 이 표를 가리킨다.

| 어디서 | 명령 | 언제, 무엇을 보나 |
|---|---|---|
| pro-kit | `node --test scripts/handbook.test.mjs scripts/doc-values.test.mjs` | 늘. 쪽 표와 파일, 첫 세 줄 꼴, 링크와 앵커, 물결표, 맨시간, 중복 글, CASES |
| pro-kit | `node scripts/doc-values.mjs` | 값이나 묶음 원본, 값 표시를 바꾼 뒤 문서와 목록 표를 채운다 |
| pro-kit | `node scripts/doc-values.mjs --check` | 값 표시와 묶음이 정본과 같은지(고치지 않고 알린다) |
| pro-kit | `node scripts/doc-values.mjs --list` | 키마다 값, 정본, 쓰는 곳 수를 본다 |
| pro-kit | `node --test 'templates/<템플릿>/tests/*.test.mjs'`(두 템플릿 모두) | 템플릿 README나 `templates/*/`를 고쳤을 때(공유 파일 규칙은 pro-kit `AGENTS.md` "템플릿 수정 규칙"이 정본이다) |
| pro-kit-web | `pnpm handbook:sync`, `pnpm handbook:check` | 문서 사본, 순서, 링크, 쪽마다 `.md`와 문서 메뉴 |
| pro-kit-web | `pnpm tutorials:sync`, `pnpm tutorials:check` | 튜토리얼 사본, 링크, 쪽마다 `.md`, 문서 메뉴, 도식 내려받기 |

문서 메뉴(`<쪽>.md`, 마크다운 복사, AI로 보내기, 도식 내려받기)의 정본은 pro-kit-web `AGENTS.md` "프로젝트 규칙"과 `docs/briefs/doc-actions.md`다([references/page-actions.md](references/page-actions.md)).

검사가 실패하면 메시지의 `파일:줄`을 고친다. 테스트를 고치거나 허용 목록에 이유 없이 더해 통과시키지 않는다.

## 루트 문서

- 루트 `README.md`는 요약과 링크만 두는 문서다. 상세 설명을 더하지 말고 `handbook/`, `tutorials/`, 템플릿 README에 쓴 뒤 링크한다. 새 프리셋을 더할 자리와 대표 예시 수는 정본을 따른다.
- `CONTRIBUTING.md`는 `AGENTS.md`의 사람용 요약이다. 릴리스 명령은 `AGENTS.md`와 같은 글자로 둔다(테스트가 본다).
- 두 템플릿 README가 함께 쓰는 글은 `docs/blocks/tpl-readme-*` 원본에서 고친다.
- 이 절의 규칙은 pro-kit `AGENTS.md` "템플릿 수정 규칙"의 README, 프리셋, 공통 값 항목이 정본이다.

## 하지 않는 것

- 홈페이지 사본(pro-kit-web `apps/web/content/…`)을 직접 고치지 않는다. 원본을 고치고 sync한다.
- 설치본(`templates/*/files/`), 지난 기록(`release/`, `docs/superpowers/`)에 값 표시를 달지 않는다.
- 비용과 키, Windows, 문제 해결, 용어 풀이를 handbook에 다시 쓰지 않는다.
- 쪽 원문을 사이트에서 새로 쓰지 않는다. 사이트가 쓰는 글은 틀 문구뿐이다.
- 문서 메뉴와 도식 내려받기의 화면과 코드를 이 스킬로 만들지 않는다. pro-kit-web의 일이다.

## 보고

- 만든 쪽과 바꾼 파일, 순서 표에 더한 행
- 값 표시와 묶음으로 바꾼 것, 새로 만든 키나 묶음
- 실행한 검사 명령과 결과
- 홈페이지에서 할 일(sync, 검사, 바뀐 주소)
- 원본에서 확인하지 못해 쓰지 않은 내용
