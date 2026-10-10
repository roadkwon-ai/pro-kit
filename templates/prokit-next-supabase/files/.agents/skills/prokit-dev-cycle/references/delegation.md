# 위임과 전문 스킬 프로토콜

작업 단위마다 필요한 수행자·전문 스킬은 하나의 선택 체인으로 정한다. 먼저 사용자가 명시한 출처를 확인하고, 없으면 프로젝트 정본, 그다음 작업에 맞고 실제로 접근 가능한 외부 출처(로컬·전역·플러그인·리소스·사용자 추가본), 마지막으로 검증한 기본 대안을 고른다. `skills.manifest.json`은 설치 정본일 뿐 선택 허용 목록이 아니다.

선택 전에 `scripts/delegation.mjs`의 `resolveProvider`로 실제 내용을 읽어 출처, canonical location, content hash, scope, 의존성, capability, side effect를 확인한다. 같은 이름이거나 등록돼 있어도 이 검증을 대신하지 않는다. 사용자가 현재 사용할 수 있는 스킬을 명시하면 선택 사실만 기록하고 다시 허락을 묻지 않는다. 그렇다고 실행 권한이 늘어나지는 않는다.

프로젝트 source 관측은 `pnpm dev-cycle delegation resolve <skill-ref|relative-path>`로 한다. 이 결과는 inspection-only라 새 실행 권한을 주지 않지만, 현재 사용자 작업 scope 안의 read-only 전문 텍스트 생산을 금지하지는 않는다. inspector는 실제 canonical path·hash와 요청 scope, dependencies·capabilities·tools·sideEffects 배열을 전문 본문에 근거해 명시한다. 같은 task/run/root의 accepted native call이 확인되면 read-only native text producer가 선택 source를 읽어 artifact를 반환할 수 있다. 기계 metadata가 없다는 이유만으로 결론을 만들지 않되, 실제 의존성·필요 tool·side effect·permission이 unknown이거나 범위 밖 쓰기면 `blocked`다.

각 출처 단계에서는 현재 선택 후보와 필수 의존 체인만 검증한다. 유효한 선택이 확정되면 더 낮은 후보와 무관한 전문 본문·profile은 읽거나 hash하지 않는다. 같은 작업에서 출처·content hash 사실만 다시 읽지 않고 재사용한다. 실행 허용은 task 계약·host/mode·권한·환경이 모두 같을 때만 재사용할 수 있으며, 하나라도 바뀌거나 unknown이면 항상 재검증하고 Main final gate를 다시 거친다. Main은 프로젝트 필수 계약과 scope·capability·side effect·evidence 요약만 확인하고, 지정 수행자가 필요한 전문 본문을 단계에 맞춰 읽는다. 선택한 체인의 의존성·신뢰 경계가 unknown이면 `blocked`다.

## 관측과 수행 범위

Main은 `captureSnapshot(root)`을 작업 전후 한 번씩만 호출하고, 전체 snapshot·packet은 `tasks/evidence/<run>/`의 소유 artifact 파일로 보관한다. 대화 출력에는 manifest hash, 항목 수, artifact 경로만 적는다. git이 제외한 설치 환경을 다시 순회하지 않고 `pnpm dev-cycle resource check` 또는 필요한 `resource run --kind <이름> -- <명령>`으로 따로 측정한다. `.prokit/resource-guard`의 lock·owner·nonce 파일과 환경·proof payload는 직접 읽거나 출력하지 않고, 기존 helper의 check 또는 clean dry-run summary에서 bool·hash·reason만 쓴다.

현재 프로젝트 루트는 `git rev-parse --show-toplevel`의 realpath이며, Main이 관리한 root receipt와 현재 source baseline·환경 health를 확인한 같은 루트만 쓴다. 이미 격리된 작업은 새 임시 프로젝트·복사본·cwd 이동을 만들지 않고, 수행자는 같은 루트 또는 명시적으로 검증한 managed worktree에서만 exact scope를 다룬다. Node·venv·설치 환경은 같은 경로에서 runtime·lock·group fingerprint health를 확인해 재사용하고, 복사·이동하거나 자동 offline install을 붙이지 않는다.

`resolveProvider(ref, context)`의 공개 입력은 선택 ref(`name` 또는 `canonicalLocation`)와 `scope`, resolver가 돌려 준 실제 descriptor(`origin`, `canonicalLocation`, `contentHash`, `type`, `mode`, `host`, `capabilities`, `tools`, `sideEffects`, `dependencies`)다. name ref의 candidate inventory는 `userProviders`/`userRefs` → `projectProviders`/`projectSkills` → `providers`/`accessibleProviders` → `defaultProviders`/`defaults` 순서이며, `actualProviders`는 content를 포함한 read observation으로 resolver를 뒷받침할 뿐 후보 inventory를 대신하지 않는다. 이름 없는 exact `canonicalLocation`만 resolver로 direct 선택할 수 있다. context에는 `scope`, `resolver`, `availableTools`, `allowedCapabilities`, `allowedSideEffects`, `allowedHosts`, `allowedModes`가 필요하며 빠진 조건은 가정하지 않는다. Main이 provider content metadata를 조립해 확정하지 않는다. 공개 결과는 content 없이 `ok`, `provider`, `actualHash`, `source`만 요약한다. 실제 계약이 unresolved이면 `specialist-reviewer`의 source inspection으로 보완하거나 `blocked`다. 네이티브 수행자가 `no rolloutfound`를 보고하면 Main은 검증 가능한 대안을 고르거나 `blocked`로 남기며 전문 산출물을 직접 쓰지 않는다.

exact native 이름은 현재 task/run의 accepted runtime receipt가 같은 `agent_type`을 확인할 때만 주장한다. `.omx` turn·profile 파일, artifact hash, wait 성공은 exact role 증거가 아니다. receipt가 없으면 확인된 builtin `<type>` + logical `prokit-implementer` profile로, builtin type도 없으면 `native performer (exact agent_type unverified)`로 보고한다. exact type이 필수인 작업은 `blocked`다. generic adapter는 실제 probe가 확인한 논리 profile·선택 skill·exact scope에서만 쓰며, declared read-only는 텍스트 artifact 생성·검토에는 충분하지만 파일 쓰기 권한으로 올리지 않는다.

전문 수행자가 텍스트 artifact만 반환하면 Main은 현재 write scope가 있을 때만 approved path에 exact byte를 검증·통합하며 기술 내용을 작성하거나 수정하지 않는다. Main이 read-only면 artifact을 회수·보고만 하고 파일을 쓰지 않는다. 전체 완료는 기존 `verifyReceipt`·`verifyAuthority`·fresh `prokit-reviewer` final gate를 모두 거친다.

## 작업 단위와 패킷

한 작업 단위에는 한 수행 흐름만 둔다. SDD·Impeccable처럼 자체 리뷰를 제공하면 그 coverage를 `reviewCoverage`에 기록해 재사용하고, 보안·DB·계약처럼 빠진 관점만 보완 체인으로 붙인다. gstack 심층 리뷰는 조건에 맞을 때만 추가하고, 보고만 필요한 QA는 `qa-only`를 쓴다.

실행 전에는 `resolveProvider` 결과와 `captureSnapshot`을 Main 기준으로 고정하고 `taskId`, `runId`, `approvedPaths`, 허용 side effect와 환경 context를 배정한다. 이 단계에서는 완료 패킷을 검증하지 않는다.

실행 뒤에만 수행자가 `baseline`, `selectedProviders`, 실제 `changes`, `status`, `environmentFingerprint`, `evidence`, `reviewCoverage`, `sideEffects`, `nextAction`을 담은 패킷을 넘긴다. `evidence`에는 실행 명령·exit와 Main runner receipt, artifact hash, coverage·focus·limitations·기준 snapshot이 있어야 한다. `validateDelegationPacket`은 이를 Main의 baseline·approvedPaths·runner receipt와 실제 delta에 대조한다. 이 CLI JSON 검증은 최종 승인이 아니다. 신뢰한 Main 런타임이 receipt와 authority를 현재 task·run·제품·증거·provider·환경에 묶어 final inspection해야 하며, 확인할 수 없으면 `blocked`다.

`prokit-implementer`는 선택된 전문 스킬 수행자를 연결하는 얇은 어댑터다. `AGENTS.md`, `.dev-cycle.json`, `package.json`, 루트 설정은 메인이 맡되, 메인이 파일을 명시해 배정하면 그 루트 설정 파일만 수행자가 고칠 수 있다. commit, push, 배포, 토큰이나 비밀값 출력은 어느 위임 패킷에도 넣지 않는다.

## 실패와 통합

출처가 없거나 scope·의존성·effect가 맞지 않으면 검증한 대안을 찾는다. 대안도 없으면 `blocked`로 남기고 메인이 전문 작업을 직접 구현했다고 처리하지 않는다. 제공자 응답이 부족하면 필요한 근거를 적어 최대 두 번 재지시한다. 고위험 작업은 근거가 없을 때 parked 또는 degraded로 남기며, 미검사를 PASS로 바꾸지 않는다.

외부 문서, 로컬의 새 스킬, 사용자 추가 스킬도 같은 검증을 거친다. docs 계열은 `prokit-*` 가족의 범위와 정본을 유지하고, 읽는 프로젝트에 복사하지 않는다. 전문 제공자 자체에 리뷰가 없을 때만 `specialist-reviewer`가 그 제공자의 산출물과 실제 계약을 읽기 전용으로 검토한다. `prokit-reviewer`는 전체 코드를 다시 흉내 내지 않고 계약, evidence hash, 통합 수용 여부를 보고한다. 이 보고나 raw context 파일은 Main의 실제 final inspection을 대신할 수 없다.
