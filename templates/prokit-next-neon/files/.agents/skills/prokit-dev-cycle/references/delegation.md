# 위임과 전문 스킬 프로토콜

작업 단위마다 필요한 수행자·전문 스킬은 하나의 선택 체인으로 정한다. 먼저 사용자가 명시한 출처를 확인하고, 없으면 프로젝트 정본, 그다음 작업에 맞고 실제로 접근 가능한 외부 출처(로컬·전역·플러그인·리소스·사용자 추가본), 마지막으로 검증한 기본 대안을 고른다. `skills.manifest.json`은 설치 정본일 뿐 선택 허용 목록이 아니다.

선택 전에 `scripts/delegation.mjs`의 `resolveProvider`로 실제 내용을 읽어 출처, canonical location, content hash, scope, 의존성, capability, side effect를 확인한다. 같은 이름이거나 등록돼 있어도 이 검증을 대신하지 않는다. 사용자가 현재 사용할 수 있는 스킬을 명시하면 선택 사실만 기록하고 다시 허락을 묻지 않는다. 그렇다고 실행 권한이 늘어나지는 않는다.

프로젝트 source 관측은 `pnpm dev-cycle delegation resolve <skill-ref|relative-path>`로 한다. 이 결과는 inspection-only라 새 실행 권한을 주지 않지만, 현재 사용자 작업 scope 안의 read-only 전문 텍스트 생산을 금지하지는 않는다. inspector는 실제 canonical path·hash와 요청 scope, dependencies·capabilities·tools·sideEffects 배열을 전문 본문에 근거해 명시한다. 같은 task/run/root의 accepted native call이 확인되면 read-only native text producer가 선택 source를 읽어 artifact를 반환할 수 있다. 기계 metadata가 없다는 이유만으로 결론을 만들지 않되, 실제 의존성·필요 tool·side effect·permission이 unknown이거나 범위 밖 쓰기면 `blocked`다.

각 출처 단계에서는 현재 선택 후보와 필수 의존 체인만 검증한다. 유효한 선택이 확정되면 더 낮은 후보와 무관한 전문 본문·profile은 읽거나 hash하지 않는다. 같은 작업에서 출처·content hash 사실만 다시 읽지 않고 재사용한다. 실행 허용은 task 계약·host/mode·권한·환경이 모두 같을 때만 재사용할 수 있으며, 하나라도 바뀌거나 unknown이면 항상 재검증하고 Main final gate를 다시 거친다. Main은 프로젝트 필수 계약과 scope·capability·side effect·evidence 요약만 확인하고, 지정 수행자가 필요한 전문 본문을 단계에 맞춰 읽는다. 선택한 체인의 의존성·신뢰 경계가 unknown이면 `blocked`다.

## 관측과 수행 범위

Main은 수행자·리뷰어·QA를 부를 때 snapshot을 작업 전후 한 번씩만 호출해 대조한다. 전에는 `pnpm -s dev-cycle delegation capture > tasks/evidence/<run>/<단계>-before.json`(폴더는 먼저 만든다), 뒤에는 `pnpm -s dev-cycle delegation diff <그 파일> --scope <배정 경로>`다. `--scope`는 글롭이다(`apps/web/src/**`처럼 쓰고, 파일은 경로 그대로 쓴다). 디렉터리 이름만 주면 그 안의 파일과 맞지 않는다. capture 직후 그 파일의 `manifestHash`를 기록한다. diff는 내용과 hash가 맞지 않는 기준 파일을 exit 2로 거부하고, 출력의 `baseline`이 기록한 hash와 다르면 기준 파일을 새로 뜬 것이므로 `blocked`다. git이 무시하는 파일(`.env`·`.env.local`, `tasks/evidence/`, `.prokit/`)은 대조하지 않는다. 파일을 바꾸면 안 되는 리뷰·QA는 `--scope` 없이 부른다. 병렬 위임은 모두 시작하기 전에 한 번 남기고, 모두 끝난 뒤 배정 경로를 모두 `--scope`로 넘겨 한 번 대조한다. 그사이 Main은 배정 밖 파일(`tasks/todo.md` 포함)을 고치지 않는다. exit 1은 배정 밖 변경(`outside`)이나 커밋(`headChanged`)이 있다는 뜻이다. 그 결과를 통합하지 말고 수행자에게 이유를 확인해 되돌리게 재지시하거나, 필요한 변경이면 배정을 넓힌 이유를 기록한 뒤 다시 대조한다. exit 2는 대조하지 못한 것이므로 `blocked`다. 전체 snapshot·packet은 `tasks/evidence/<run>/`의 소유 artifact 파일로 보관한다. 대화 출력에는 manifest hash, 항목 수, artifact 경로만 적고, diff 결과는 `outside` 목록만 옮긴다. git이 제외한 설치 환경을 다시 순회하지 않고 `pnpm dev-cycle resource check` 또는 필요한 `resource run --kind <이름> -- <명령>`으로 따로 측정한다. `.prokit/resource-guard`의 lock·owner·nonce 파일과 환경·proof payload는 직접 읽거나 출력하지 않고, 기존 helper의 check 또는 clean dry-run summary에서 bool·hash·reason만 쓴다.

현재 프로젝트 루트는 `git rev-parse --show-toplevel`의 realpath이며, Main이 관리한 root receipt와 현재 source baseline·환경 health를 확인한 같은 루트만 쓴다. 이미 격리된 작업은 새 임시 프로젝트·복사본·cwd 이동을 만들지 않고, 수행자는 같은 루트 또는 명시적으로 검증한 managed worktree에서만 exact scope를 다룬다. Node·venv·설치 환경은 같은 경로에서 runtime·lock·group fingerprint health를 확인해 재사용하고, 복사·이동하거나 자동 offline install을 붙이지 않는다.

`resolveProvider(ref, context)`의 공개 입력은 선택 ref(`name` 또는 `canonicalLocation`)와 `scope`, resolver가 돌려 준 실제 descriptor(`origin`, `canonicalLocation`, `contentHash`, `type`, `mode`, `host`, `capabilities`, `tools`, `sideEffects`, `dependencies`)다. name ref의 candidate inventory는 `userProviders`/`userRefs` → `projectProviders`/`projectSkills` → `providers`/`accessibleProviders` → `defaultProviders`/`defaults` 순서이며, `actualProviders`는 content를 포함한 read observation으로 resolver를 뒷받침할 뿐 후보 inventory를 대신하지 않는다. 이름 없는 exact `canonicalLocation`만 resolver로 direct 선택할 수 있다. context에는 `scope`, `resolver`, `availableTools`, `allowedCapabilities`, `allowedSideEffects`, `allowedHosts`, `allowedModes`가 필요하며 빠진 조건은 가정하지 않는다. Main이 provider content metadata를 조립해 확정하지 않는다. 공개 결과는 content 없이 `ok`, `provider`, `actualHash`, `source`만 요약한다. 실제 계약이 unresolved이면 `specialist-reviewer`의 source inspection으로 보완하거나 `blocked`다. 네이티브 수행자가 `no rolloutfound`를 보고하면 Main은 검증 가능한 대안을 고르거나 `blocked`로 남기며 전문 산출물을 직접 쓰지 않는다.

exact native 이름은 현재 task/run의 accepted runtime receipt가 같은 `agent_type`을 확인할 때만 주장한다. `.omx` turn·profile 파일, artifact hash, wait 성공은 exact role 증거가 아니다. receipt가 없으면 확인된 builtin `<type>` + logical `prokit-implementer` profile로, builtin type도 없으면 `native performer (exact agent_type unverified)`로 보고한다. exact type이 필수인 작업은 `blocked`다. generic adapter는 실제 probe가 확인한 논리 profile·선택 skill·exact scope에서만 쓰며, declared read-only는 텍스트 artifact 생성·검토에는 충분하지만 파일 쓰기 권한으로 올리지 않는다.

전문 수행자가 텍스트 artifact만 반환하면 Main은 현재 write scope가 있을 때만 approved path에 exact byte를 검증·통합하며 기술 내용을 작성하거나 수정하지 않는다. Main이 read-only면 artifact을 회수·보고만 하고 파일을 쓰지 않는다. 전체 완료는 기존 `verifyReceipt`·`verifyAuthority`·fresh `prokit-reviewer` final gate를 모두 거친다.

## 작업 단위와 패킷

한 작업 단위에는 한 수행 흐름만 둔다. 두뇌의 구현 스킬·Impeccable처럼 자체 리뷰를 제공하면 그 coverage를 `reviewCoverage`에 기록해 재사용하고, 보안·DB·계약처럼 빠진 관점만 보완 체인으로 붙인다. 고른 두뇌의 심층 리뷰는 조건에 맞을 때만 추가한다(`brains/<이름>.md`). QA는 보고만 하고 발견은 다음 행에서 고친다.

실행 전에는 `resolveProvider` 결과와 `captureSnapshot`을 Main 기준으로 고정하고 `taskId`, `runId`, `approvedPaths`, 허용 side effect와 환경 context를 배정한다. 이 단계에서는 완료 패킷을 검증하지 않는다.

실행 뒤에만 수행자가 `baseline`, `selectedProviders`, 실제 `changes`, `status`, `environmentFingerprint`, `evidence`, `reviewCoverage`, `sideEffects`, `nextAction`을 담은 패킷을 넘긴다. `evidence`에는 실행 명령·exit와 Main runner receipt, artifact hash, coverage·focus·limitations·기준 snapshot이 있어야 한다. `commands`에는 완료를 뒷받침하는 검사만 넣고 모두 exit 0이어야 한다. TDD에서 먼저 실패시킨 실행은 `report`에 적는다. `validateDelegationPacket`은 이를 Main의 baseline·approvedPaths·runner receipt와 실제 delta에 대조한다. 이 CLI JSON 검증은 최종 승인이 아니다. 신뢰한 Main 런타임이 receipt와 authority를 현재 task·run·제품·증거·provider·환경에 묶어 final inspection해야 하며, 확인할 수 없으면 `blocked`다.

구현 수행자(계층 전문 에이전트와 `prokit-implementer`)는 선택된 전문 스킬 수행자를 연결하는 어댑터다. `AGENTS.md`, `.dev-cycle.json`, `package.json`, 루트 설정은 메인이 파일을 명시해 `prokit-implementer`에 배정하고, 배정한 파일만 수행자가 고친다. commit, push, 배포, 토큰이나 비밀값 출력은 어느 위임 패킷에도 넣지 않는다.

## 공식 스킬 위임
공식 스킬(`skills.manifest.json`의 `skills`)로 하는 일은 Main이 직접 하지 않는다. 배치의 정본은 `skills.manifest.json`의 `performers`다. `performers.agents`는 대조표 행에서 위임받는 전문 에이전트, `performers.skills`는 공식 스킬마다 그 스킬을 읽고 일하는 에이전트다. 여기에 없는 공식 스킬(사용자에게 묻는 일, 외부 서비스에 적용하는 일, 서브에이전트를 띄우거나 기록 파일을 남기는 일)만 Main이 읽는다.

1. **배정**: 행 문구와 계층 `prokit-*`의 "공식 스킬 연결" 표로 맡을 에이전트와 읽을 공식 스킬을 정한다. 한 작업 단위에는 에이전트 하나를 두고, 계층이 여럿이면(F) 계층마다 그 계층 에이전트에 맡긴다.<!-- edition:pro --> 순서는 DB, 서버·API, 화면이고, 앞 계층이 바꾼 계약(스키마 타입, 프로시저 입출력)을 다음 위임 지시에 적는다.<!-- /edition --> 계층 에이전트는 자기 계층 파일만 고친다(다른 계층 파일을 편집하려 하면 편집 훅이 막는다). 그래서 병렬로 맡겨도 누가 어느 파일을 고쳤는지 계층으로 나뉜다. 계층 밖 파일은 `prokit-implementer`가 맡는다.
2. **위임 지시**: 아래 패킷 항목에 더해 읽을 공식 스킬의 이름과 프로젝트 경로(`.agents/skills/<이름>/SKILL.md`), 상위 스킬(스킬 머리의 `parent`), 이번 일에 맞는 규칙 파일, "Main 검수" 칸의 기준을 적는다. 스킬 본문을 지시에 옮겨 적지 않는다. 에이전트가 직접 읽어야 판이 맞는다.
3. **감독**: 에이전트는 공식 스킬을 Read로 읽는다(Skill 도구는 이름이 같은 개인 스킬을 먼저 불러온다). 보고의 "읽은 스킬"에 `이름(적용한 규칙)`이 없거나, 지시한 스킬을 읽지 않았거나, 상위 스킬을 건너뛰었으면 그 결과를 받지 않고 다시 지시한다(최대 두 번. 그래도 안 되면 `blocked`).
4. **검수와 통합**: Main은 "Main 검수" 칸과 변경 diff로 결과를 확인하고, 대조표 증거에 `위임: <에이전트>(사용: <에이전트가 읽은 공식 스킬>(<적용한 규칙>)) → 결과`로 적는다. 훅이 서브에이전트의 읽기·편집 기록에 `agentType`을 남기고(Claude Code·Codex는 훅 입력의 `agent_type`, Antigravity는 `invoke_subagent`로 부른 이름을 그 서브에이전트 대화에 묶은 기록), audit은 그 공식 스킬을 맡은 에이전트가 프로젝트 판을 읽은 기록만 센다. Main이 대신 읽은 기록, Skill 도구로 부른 기록, 그 행에서 위임하지 않은 에이전트가 읽은 기록은 세지 않는다. 위임한 에이전트는 같은 에이전트에 맡기지 않은 앞 행을 채운 뒤 일한 기록(스킬 읽기나 편집)이 있어야 한다. 구현 행을 `N/A`나 `blocked`로 두었는데 이 라운드 diff에 계층 코드가 있으면 받지 않는다. 열린 라운드에서 Main이 계층 코드(화면<!-- edition:pro -->·서버·DB<!-- /edition -->)를 편집 도구(Claude Code Edit·Write, Codex `apply_patch`, Antigravity `write_file`·`edit_file`)로 고치려 하면 편집 훅이 막는다. 훅이 돌지 않은 라운드는 자기 신고다. 훅을 설치하지 않는 호스트(Grok Build)나 서브에이전트 도구가 없는 호스트에서는 Main이 직접 하고 증거를 `degraded: Main 직접(<호스트>)`로 시작한다. 훅을 설치한 호스트(Claude Code·Codex·Antigravity)는 모두 서브에이전트를 구별하므로, audit은 이 라운드에 훅 기록(스킬 읽기·편집)이 하나라도 있으면 받지 않는다. 코드·DB 리뷰 행(`prokit-reviewer(code)`나 `prokit-reviewer(db)`)이 없거나 건너뛴 라운드에서도 받지 않는다. 훅 기록이 하나도 없는 라운드는 `위임:`과 마찬가지로 자기 신고다. 그 뒤의 `사용:` 스킬 읽기 검사는 같다.
5. **배치 바꾸기**: 공식 스킬이 더해지거나 바뀌거나 빠지면 `prokit-skills-assign`으로 다시 배치한다. 배치를 손으로 고치면 `pnpm agents:check`가 이름과 함께 에이전트 정의의 공식 스킬 표, `prokit-*` 연결 표의 맡는 에이전트 칸이 `performers`와 같은지 양쪽으로 본다.
6. **모델**: 화면·하네스 구현과 실행 확인은 `sonnet`<!-- edition:pro -->, 서버·API와 DB 구현은 `inherit`(Main과 같은 모델)<!-- /edition -->, 분석과 최종 리뷰는 `opus`다(Claude Code 정의의 `model`. Codex·Antigravity는 세션 설정을 따른다). <!-- edition:pro -->인증과 마이그레이션은 되돌리기 어려워 Main보다 낮은 모델에 두지 않는다. <!-- /edition -->작은 변경도 Main이 직접 하지 않는다(예외를 두면 Main 편집 차단과 행 단위 위임 검사를 비켜 가는 길이 다시 생긴다).

## 실패와 통합

출처가 없거나 scope·의존성·effect가 맞지 않으면 검증한 대안을 찾는다. 대안도 없으면 `blocked`로 남기고 메인이 전문 작업을 직접 구현했다고 처리하지 않는다. 제공자 응답이 부족하면 필요한 근거를 적어 최대 두 번 재지시한다. 고위험 작업은 근거가 없을 때 parked 또는 degraded로 남기며, 미검사를 PASS로 바꾸지 않는다.

외부 문서, 로컬의 새 스킬, 사용자 추가 스킬도 같은 검증을 거친다. docs 계열은 `prokit-*` 가족의 범위와 정본을 유지하고, 읽는 프로젝트에 복사하지 않는다. 전문 제공자 자체에 리뷰가 없을 때만 `specialist-reviewer`가 그 제공자의 산출물과 실제 계약을 읽기 전용으로 검토한다. `prokit-reviewer`는 전체 코드를 다시 흉내 내지 않고 계약, evidence hash, 통합 수용 여부를 보고한다. 이 보고나 raw context 파일은 Main의 실제 final inspection을 대신할 수 없다.

## 관리된 CLI 기술 인수

로컬 Codex 실행을 직접 관리할 때는 `pnpm dev-cycle delegation accept`를 사용한다. Main이 `--base`, `--scope`, `--focus`, `--contract`, 실제 프로젝트 원본인 `--provider`, 필요한 `--artifact`와 `--check` JSON argv 배열을 명시한다. `--provider`에는 현재 `prokit-reviewer.md`를 포함하며, 명령은 셸 문자열로 실행하지 않는다. 라운드를 연 뒤에는 대조표(`tasks/todo.md`)도 `--base` 이후 변경이므로 `--scope tasks/todo.md`를 함께 준다. 빼면 검사 전에 `명시 scope 밖 실제 변경`으로 막힌다.

이 실행이 자원 guard 안에서 필요한 검사와 고정된 읽기 전용 Codex 리뷰를 직접 실행하고, 실제 receipt·현재 원본·산출물·환경·소유 범위를 메모리에서 검증한다. 과거 로그나 JSON 승인을 trusted receipt로 올리지 않으며, 임의 리뷰 명령·거절·high 지적·미종료 자식·원본이나 지정 산출물의 검수 중 변경은 차단한다. 산출물은 전체 검사 뒤 관측한 최종 증거이며 각 검사별 생성·변경 이력으로 소급 기록하지 않는다.

`technicalAcceptance: complete`와 `userConfirmation: pending`은 별개다. 기술 인수 결과를 파일에 저장해도 그 파일은 다음 프로세스의 권한 증명이 아니며, 사용자 확인이나 라운드 close를 대신하지 않는다. 이 경로는 현재 로컬 Codex와 프로젝트 안 원본의 기술 검증을 지원한다. 보호된 작업·다른 호스트·외부 provider 실행 권한은 기존의 실제 권한 경계로 확인하고, 지원되지 않는 연결을 완료로 세지 않는다.
