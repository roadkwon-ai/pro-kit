# 기존 프로젝트 H 라운드 이행 상태

2026-10-10 기존 프로젝트의 H 이행을 준비했으나, 사용자가 최종 범위를 **템플릿 개선 검수와 보고**로 정했다. 최종 H 이행은 하지 않는다. 올곧에서 준비 중 생긴 H 변경은 복구 완료했고, Claudle은 H를 시작하지 않았다. 아래 사전 확인 기록은 당시 기준선이며 최신 처리 결과는 문서 끝에 남긴다.

## 실행한 사전 확인

- 두 프로젝트의 Git 상태, HEAD, 설정·명령·lockfile·작업 문서 해시를 확인했다.
- 저장소 루트에서 각 프로젝트를 대상으로 `templates/prokit-next-neon/install.sh <프로젝트> --diff`를 실행했다. 둘 다 exit 0이며 파일을 쓰지 않는 미리 보기다.
- 두 프로젝트의 `tasks/todo.md`에 활성 dev-cycle 라운드 마커가 없는 것을 확인했다.
- 설치된 스킬이나 프로젝트 환경을 바꾸지 않았다. 이미 통과한 템플릿·QA·성능 검사는 다시 실행하지 않았다.

## 사전 확인 당시의 시작 조건

| 프로젝트 | 경로 | HEAD | 남은 기존 변경 | H 상태 |
|---|---|---|---|---|
| 올곧 | `/Users/freelife/youtube/pro-kit-samples/ws/olgot` | `b2420549549dfad2d7ec82bfe2fde448b56eceeb` | 수정: `apps/web/src/components/prokit-credit.tsx` | 시작 조건 미충족 |
| Claudle | `/Users/freelife/youtube/pro-kit-samples/tutorials/claudle` | `9185de81ab94ba41581bd4950e10a0516ee98454` | 수정: `apps/web/src/components/chat/chat-view.tsx`; 미추적: `apps/web/src/lib/ai-service.ts`, `scripts/ai-service.test.mjs` | 시작 조건 미충족, 올곧 이행 후 진행 |

사용자가 선택한 방법은 기존 작업의 담당 세션이 먼저 검수·정리하고, 같은 프로젝트와 설치 환경에서 H를 진행하는 것이다. H 담당자는 위 변경을 대신 커밋·복원·숨김 처리하지 않는다. 다른 작업의 완료 보고만으로 깨끗한 작업 트리를 확인한 것으로 보지 않는다.

| 기준 파일 | 올곧 SHA-256 | Claudle SHA-256 |
|---|---|---|
| `.dev-cycle.json` | `356433288cf5ee9487dd1fa1910eed863d3cffe8d28ef8cff4af53870f6d26c6` | `b806fe274fd1b23cc37b1355ae3fcac7dcbe13af79f36c901c6260ab27f0f6f6` |
| `package.json` | `c040014f155cad40278fe218d36847f8e9a38bca12a34c0a6ff7e7cf73750387` | `5803f670998857abf1ebfe2eec7d4959a987669cc4c834bd0621bb828b6ce6ea` |
| `pnpm-lock.yaml` | `430e2b148daa7ade6319b3938d06f7fd06aaf93f2d9c265b5e55e2c2bc5114e7` | `fa6c84f1a273415826df64a1fb8190f2bb2d6f21c6fdfe2b2899b01f47d3ab00` |

이 값은 사전 확인 기록이다. 실제 H 시작 시 새 HEAD와 해시를 다시 기록한다. 기존 작업이 바뀌면 그 환경의 예전 실행 결과를 그대로 재사용하지 않는다.

## 차이 확인과 이행 순서

두 프로젝트 모두 위임·실행 효율·재사용 설계 참조, `specialist-reviewer`, `delegation.mjs`, `resource-guard.mjs`가 없다. 추가 예정 명령은 `resource:check`, `resource:run`, `resource:clean`, `delegation:capture`, `delegation:validate`다. 기존 설치본에는 설치기가 보호 래퍼를 자동 적용하지 않으므로 H에서 따로 전환한다.

시작 조건을 충족하면 각 프로젝트 세션에서 다음 순서로 진행한다.

1. 프로젝트 규칙과 상태를 읽고, 이행 원본의 내용 해시와 정확한 파일 소유권을 고정한다. `--diff`를 새 상태에서 확인하고 H 대조표를 연다.
2. `install.sh <프로젝트> --skip-skills`로 없는 파일과 설정 항목만 추가한다. 기존 파일은 승인 범위의 변경만 합친다.
3. dev-cycle·verify·UI 스킬과 세 에이전트에 효율 정본을 연결한다. 위임·재사용 참조, dev-cycle·delegation·resource guard·에이전트 동기화·HTML 내보내기의 필요한 변경을 함께 옮긴다.
4. AGENTS·CLAUDE와 H 절차 계약을 합친다. 화면만 선언, 프로젝트 문서·백로그, `master`, 프로젝트별 명령과 UI 기준은 보존한다.
5. `.dev-cycle.json`에 자원 정책과 H 경로 판정을 보완한다. `dev`, `dev:web`, `build`의 원본을 `prokit:original:*`에 보존하고 기존 보호 별칭이 없는 경우에만 한 번 전환한다.
6. `agents:sync`로 생성물을 맞춘 뒤 영향받은 검사를 실행하고 독립 `prokit-reviewer`가 최종 검수한다.

외부 스킬 업데이트, manifest·lock 변경, 제품·DB·AI 연결·릴리스 변경은 제외한다. 등록 경로는 감시 범위이며 정리 권한이 아니다. 이번 이행에서 자원 삭제를 실행하지 않는다.

## 검증 재사용과 새 검사

기존 [병렬 실행 검증 보고서](../2026-10-10-parallel-verification/README.md)는 원본 구현의 검사 증거로 연결한다. 두 템플릿 전체 테스트, QA fixture, 직렬·병렬 성능 비교를 다시 시작하지 않는다. 프로젝트 적용 결과는 별도로 확인한다.

- 변경 스킬의 `skill-creator` quick validation과 참조 연결, 실제 전문 제공자의 출처·내용 해시를 확인한다.
- `agents:check`, `skills:check`, case·status·evidence·audit 및 위임·보호 명령의 연결을 확인한다. 실패·unknown·block 경로는 작은 fixture로 검사한다.
- 통합 뒤 typecheck·lint·일반 build·정적 내보내기를 각각 한 번 실행한다. 일반 build가 개발 서버를 유지하는지 확인한다.
- 올곧의 기존 대표 여덟 경로, Claudle의 기존 대표 네 경로를 확인한다. 일반 흐름은 ego-browser 우선이며 승인된 기존 배치 도구에는 프로젝트에 설치한 guard를 명시한다. qa·ui-audit worker는 둘, 상태를 공유하는 Claudle probe는 하나다.
- 개발 서버와 정적 산출물의 증거를 구분한다. Claudle 모의 AI 응답 결과는 실제 AI 서비스 검증을 대신하지 않는다.
- 분할 충돌·공유 소비자·증거 재사용·권한 unknown·자원 unknown·flaky의 여섯 행동 조건을 점검한다. 새 환경에서 실행하지 않은 검사는 통과로 표시하지 않는다.

실패와 수정 영향 범위만 다시 검사한다. 최초 실패와 누락을 보존하고 추가 재지시는 총 두 번까지다. 사용자 확인 전에는 `[confirm]`을 채우거나 audit·close 완료를 선언하지 않는다. 커밋·push·배포는 별도 요청 범위다.

## 범위 변경과 처리 결과

사전 확인 뒤 사용자가 기존 변경의 마무리까지 승인했다. 기존 파일을 추가 수정하지 않고 각각 검수해 로컬 커밋했다. 이후 사용자는 개선 항목 확인에 두 프로젝트의 H 이행이 필요한지 물었고, 최종 범위를 템플릿 개선 검수와 보고로 정했다.

| 프로젝트 | 기존 변경 정리 | 실제 검사 | H 처리 |
|---|---|---|---|
| 올곧 | `87cda8bb9035a7b3fb455582be4aee8c9d393a09` (`chore: 프로킷 제작 표시 링크 갱신`) | 템플릿 부품과 바이트 일치, Footer 소비자, Biome, 웹 타입 검사 통과 | 누락 파일 추가와 대조표 생성 뒤 중지했다. 이번 H 변경만 복구 완료 |
| Claudle | `1f4387ea5f865bad097d254306da988f01fab6b0` (`feat: connect chat to AI relay`) | AI 연결 단위 검사 2/2, 웹 타입 검사, 세 파일 Biome, 스테이징 diff·비밀값 검사 통과 | H 미시작 |

두 커밋은 H 시작 전부터 남아 있던 변경을 기록한 것이다. 완성된 제품의 추가 기능 개발이나 동작 수정은 하지 않았다. push·배포·실제 AI 서버 호출도 하지 않았다. 미완성 H를 PASS나 close로 처리하지 않는다.

올곧의 `package.json`·`tasks/todo.md`는 기존 변경 정리 커밋과 바이트가 같고 활성 H 표는 제거됐다. 이번 설치가 새로 만든 파일만 소유권을 확인해 제거했으며 기존 파일·환경·링크는 보존했다. 복구 사본과 해시는 `/Users/freelife/youtube/pro-kit-samples/checks/h-migration-20261010-cancelled/olgot/`에 있다. 두 프로젝트의 작업 트리는 깨끗하다.

템플릿·스킬·에이전트의 개선 근거는 [기존 검증 보고서](../2026-10-10-parallel-verification/README.md)로 확인한다. 원본 검증을 위해 완성 프로젝트에 H를 적용할 필요는 없다. 기존 프로젝트에서 새 하네스를 쓰려는 경우에만 별도 이행이 필요하다.
