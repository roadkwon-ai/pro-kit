# 기능 변경의 문서 반영 점검

2026-10-11 현재 작업 트리의 스킬·에이전트·설치 기능과 프리셋 디자인 설정을 사용자 안내에 대조했다. 이미 진행 중이던 변경은 보존하고, 과거 측정값·설계 기록·릴리스 노트는 새 결과로 고쳐 쓰지 않았다. 이번 변경은 문서와 공통 값·게시 상태 관리에 한정한다.

## 기능과 안내 대조

| 변경 | 확인한 정본 | 반영한 안내 |
|---|---|---|
| Ponytail 프로젝트 스킬과 Codex 선택 설치 | 두 템플릿의 `skills.manifest.json`, `skills-setup.mjs`, `prokit-skills-update`, [통합 기록](../2026-10-10-ponytail-5-integration/README.md) | handbook의 공식 스킬·설치와 갱신·지원 에이전트·기존 프로젝트 이행·명령·FAQ, 두 템플릿 README |
| 일회성 review와 요청 시 audit·debt·help·gain | `prokit-dev-cycle/references/process-routing.md`, `CLAUDE.md`, Ponytail 통합 기록 | 네임스페이스 호출과 프로젝트 스킬 대안, 명시적 off 존중, 장부·백로그 쓰기와 원본 벤치마크의 경계 |
| 공식 전문 스킬 위임과 Prokit 감독 | `prokit-dev-cycle`, `execution-efficiency.md`, 구현자·전문 리뷰어·최종 리뷰어 | 역할 배정, 검사 소유권, 충돌 없는 병렬 실행, 전문 증거 재사용과 매번 새 최종 검수, unknown·blocked 보존 |
| 로컬 기술 인수와 사용자 확인 | `dev-cycle.mjs`의 `delegation accept`, `delegation.md`, [인수 기록](../2026-10-10-cli-acceptance-images/README.md) | 기술 완료와 사용자 확인 대기 구분, 대조표 증거와 H 이행 안내 |
| 디자인 선택 기록과 실제 적용 확인 | `prokit-ui/references/preset-settings.md`, [후속 구현 기록](../2026-10-10-preset-design-controls/README.md#2026-10-11-후속-구현과-제작-프롬프트-검사) | UI 흐름·DESIGN.md·화면만 프로젝트·폴더 구조, 제작 프롬프트와 튜토리얼 공통 글 |
| 프리셋 제작과 실제 서비스의 경계 | 같은 프리셋 설정 정본 | 제작 도구의 서체·팔레트 선택과 미리보기 수신기, 실제 서비스에 선택 디자인 고정, 프로젝트 요구에 따른 모드·언어 |
| 미리보기와 제작 창 조작 | 로컬 pro-kit-web 정본과 프리셋 디자인 검증 기록 | 제작 요청 편집·선택 적용·복사와 AI로 보내기, 미리보기 상태 유지와 크기 조절, 공개본·팩과 로컬 검증 구분 |
| 인증 실패와 재발 원인 확인 | 현재 `prokit-deploy`와 `prokit-dev-cycle`의 마무리 규칙 | 신뢰한 키 설정의 존재·로딩 확인과 실제 권한 검증, 확정한 재발 원인의 규칙·평가·백로그 반영 |

두 템플릿의 `files/docs/dev-workflow.md`에 남아 있던 무조건 전체 재검사 문구를 현재 영향 검사·통합 담당자 정책에 맞췄다. 필수 최초 검사와 최종 리뷰 행은 유지한다. `skills.codex.ponytail` 값은 매니페스트에서 계산해 스킬 개수의 중복 표기를 맞춘다.

## 미게시 준비본의 집계 경계

동시에 등록된 슬라이드랩의 자료와 로컬 팩은 보존한다. 프리셋·팩 정본의 `published: false` 항목은 개별 안내 값을 유지하지만 공개 개수·페이지 집계·릴리스 링크에 넣지 않는다. 게시 상태가 없는 기존 공개 항목의 계산은 유지하고, 회귀 검사에서 준비본 추가가 과거 공개·측정 안내를 바꾸지 않는지 확인한다.

팩의 로컬 zip 검증과 미게시 원격 받기 차단도 현재 구현과 대조한다. 제작 검수에서 남긴 실제 PNG 화면을 WebP로 변환해 누락된 안내 그림을 연결했으며 새 화면을 그리거나 공개 배포하지 않았다.

## 검수와 검사

설치 안내, 프리셋 안내, 위임·검수 안내를 독립 수행자에게 나눠 배정하고, Main이 공통 글과 템플릿·튜토리얼 사본을 통합한다. 한국어는 `prokit-writing`의 humanizer → style-guide → grammar-checker 순서로 검수하며 문서별 문체·짧은 가운뎃점·명령·경로·값 표시를 보존한다.

| 검사 | 결과 |
|---|---|
| 두 템플릿 전체 테스트 | `--test-concurrency=2`로 순차 실행, 각각 274개 통과 |
| 최종 템플릿 문서·공유 파일 검사 | 이후 README 보완까지 반영한 두 템플릿 영향 검사 44개 통과 |
| handbook·공통 값·팩 회귀 | `node --test scripts/handbook.test.mjs scripts/doc-values.test.mjs scripts/pack.test.mjs`, 69개 통과 |
| 공통 값·패치 형식 | `node scripts/doc-values.mjs --check`, `git diff --check`: exit 0 |

Ponytail 코드 지도 설명과 audit·debt 사용 시점을 독립 검수에서 보완했다. 미게시 준비본을 공개 집계에 섞던 회귀를 실패 검사로 확인한 뒤 고쳤으며, 공개 측정 누락을 숨기지 않는 조건도 유지한다. 최초 실패와 재검사 로그는 저장소 밖에 보존한다.

독립 최종 검수는 현재 코드·문서와 실제 검사 로그를 대조해 APPROVE를 받았고, 남은 지적은 없다.

최종 검사 결과와 이 기록의 링크는 두 템플릿의 `VERIFICATION.md`에 함께 남겼다.

## 범위와 한계

새 기능의 설치·브라우저 동작을 이번 문서 작업에서 다시 실측하지 않았다. 각 기능의 이전 검증과 한계는 위 표의 기록을 따른다. 특히 Ponytail의 실제 호스트 자동 훅 실행을 직접 훅 스크립트 검사 결과로 대체하지 않는다.

프로킷 사이트 문서 사본의 동기화와 배포, 프리셋 팩 재발행, 다른 프로젝트의 H 이행, 커밋·push·릴리스는 하지 않았다. 문서 원본 반영 뒤 pro-kit-web에서 `pnpm handbook:sync`, `pnpm handbook:check`, `pnpm tutorials:sync`, `pnpm tutorials:check`로 사본을 맞춰야 한다.
