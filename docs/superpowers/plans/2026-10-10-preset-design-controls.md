# 프리셋 디자인 설정 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. 단계를 체크하고 최종 독립 리뷰를 수행한다.

**Goal:** 프로킷 사이트에서 디자인을 골라 제작 프롬프트를 복사하고, 실제 지원 여부를 확인하며 프리셋을 미리 본다.

**Architecture:** 기존 제작창·복사·미리보기 iframe을 확장한다. 정적 카탈로그와 같은 `PresetDesignOptions`를 재사용하고, iframe은 origin/source를 검증한 연결 계약으로 조절한다. 신규 프리셋의 모드·언어 요구는 두 템플릿의 공통 제작 규칙에 반영한다.

**Tech Stack:** 기존 Next.js, React, shadcn/Base UI, TypeScript, Node 내장 테스트, next-themes/Intl(제작물).

**Spec:** `../specs/2026-10-10-preset-design-controls-design.md`

## 공통 제약

- 새 의존성을 추가하지 않는다. 기존 작업 트리 변경을 보존하고 이번 파일만 고친다.
- 기본 모드는 `system`, 시작 언어는 `ko`, 폰트·색상은 `original`이다.
- 메시지 버전은 `1`, 정확한 origin/source/slug/요청 식별자를 확인한다.
- 실제로 검증한 지원만 표시한다. 공개 프리셋을 전환 완료로 표시하지 않는다.
- 선택 팔레트·설정 견본·미리보기 수신기는 공식 프리셋 제작·프로킷 미리보기 전용이다. 일반 서비스 생성 프롬프트는 선택한 폰트·색상만 고정 구현하고 전용 기능을 요구하지 않는다.
- pro-kit의 두 템플릿 공유 파일은 바이트가 같아야 한다. 원본 문서 수정 뒤 사이트 사본을 동기화한다.
- 커밋·배포와 사용자 확인 행은 실제 승인·확인 없이 채우지 않는다.

## 리뷰 초점

- 기존 팩의 '스크린샷과 같게' 지시와 선택 디자인이 충돌하지 않는가.
- 영문 폰트의 한글 폴백과 선택한 폰트의 실제 로드 상태가 일치하는가.
- 응답 없는 iframe과 잘못된 applied 응답에서 완료 표시를 피하는가.
- 모바일 패널로 iframe 높이가 줄어도 겹침과 키보드 이동 문제가 없는가.
- 선택값 초기화·다른 프리셋·페이지 이동에서 이전 요청의 응답을 잘못 적용하지 않는가.

### 작업 1: 카탈로그와 제작 프롬프트

**Files:** pro-kit-web의 `apps/web/src/lib/preset-design.ts`, `preset-design.test.mjs`, `components/preset-design-controls.tsx`, `components/work/sample-tutorial.tsx`, 자체 호스팅 폰트/라이선스.

**Interfaces:** `PresetDesignOptions`, `defaultDesignOptions`, `buildDesignPrompt(base, options, sample)`, `PresetDesignControls({value,onChange})`. sample은 기존 slug/name/fonts/colors를 소비한다.

- [ ] 기본 기능, 선택 폰트·폴백·양쪽 팔레트, 반복 생성의 중복 방지, 잘못된 옵션을 내장 테스트로 먼저 잠근다.
- [ ] 실패 출력을 확인하고 공식 출처를 확인한 카탈로그와 조합 함수를 구현한다.
- [ ] `SampleTutorial → PromptCard` 호출 경로에서 원문 `tutorial.prompt`를 base로 두고 선택기와 보이는/복사되는 같은 프롬프트를 연결한다. `tutorial.after`의 PackCard·팩 받기·후속 링크를 보존한다. 변경될 폰트만 지연 로드한다.
- [ ] 별도 설정 견본에 서체·선택 모드의 팔레트·ko/en 문구를 표시한다. 폰트는 basePath에서도 로드하고 파일 실제 굵기를 따르며 실패를 알린다. 프리셋 원본의 적용 상태와 구분한다.
- [ ] 단위 테스트와 타입 검사를 통과시킨다.

### 작업 2: 미리보기 팔레트와 연결

**Files:** pro-kit-web의 `components/preview/preview-dialog.tsx`, `lib/preset-preview.ts`, `preset-preview.test.mjs`.

**Interfaces:** 작업 1의 옵션/선택기를 소비한다. `hello → ready → apply → applied` 계약을 구현하고 프리셋 지원 상태를 표시한다.

- [ ] source/origin/slug/version·옵션 검증·요청 상관관계·부분 지원 테스트를 먼저 실패시킨다.
- [ ] 본문 안 데스크톱 우측 열·모바일 상단 접이식 패널로 배치하고 LiveFrame은 본문의 실제 남는 높이/너비를 측정한다. 패널 영역의 방향키는 페이지 이전/다음에서 제외한다. 초기화와 같은 선택값을 포함한 제작 프롬프트 복사를 붙인다.
- [ ] 기존 iframe 주소와 query를 유지하고, navigation/load 때 연결을 다시 시작한다. 예상 origin은 sampleUrl에서 계산한다. applied 응답의 실제 옵션·미지원 목록까지 현재 요청과 대조한다. 그림 비교에는 원본 그림 안내를 둔다.
- [ ] 응답 없는 기존 프리셋과 수신 계약 테스트 fixture에서 실제 적용을 따로 검증한다. fixture 검사를 공개 프리셋 검증으로 합치지 않는다.

### 작업 3: 앞으로의 제작 기본값

**Files:** pro-kit의 `AGENTS.md`, 양쪽 `prokit-ui/SKILL.md`, 공통 프롬프트 블록, `handbook/design/ui-flow.md`, 양쪽 `VERIFICATION.md`.

- [ ] 시스템·다크·라이트/ko·en/사전/Intl/HTML 내보내기/미리보기 연결과 필수 검증을 기본 제작 규칙에 적는다.
- [ ] 원본 블록을 고치고 `node scripts/doc-values.mjs`로 채운다. 두 템플릿 공유 파일을 같게 유지한다.
- [ ] 두 템플릿 테스트와 handbook/doc-values 검사 후 사이트 handbook/tutorials/md를 동기화한다.

### 작업 4: 통합 검증과 독립 리뷰

- [ ] prokit-reviewer로 계획·최종 코드를 독립 검토하고 지적을 확인해 반영한다.
- [ ] 타입·린트·빌드·설정/연결 단위 테스트를 수행한다. 기존 린트 문제는 이번 변경과 구분한다.
- [ ] 브라우저에서 제작창·미리보기의 데스크톱/모바일·키보드·복사·미지원 상태를 확인하고 스크린샷을 남긴다.
- [ ] GLOSSARY.md·docs/domain/project.md·브리프·dev-cycle 증거에 실제 결과를 적는다. 사용자 확인 행은 비워 둔다.

## 후속 실행 계획

현재 사이트 구현·코드 리뷰·핵심 브라우저 QA와 두 템플릿 규칙 반영은 수행했다. 실제 검사 결과와 React DevTools/Safari/기존 프리셋 전환의 한계는 [검증 기록](../../reports/2026-10-10-preset-design-controls/README.md)에 있다. 사이트 대조표의 사용자 확인 행은 비워 두며 배포하지 않았다.

기존 프리셋 전체 전환과 팩 재발행은 스펙의 전환 순서대로 한 개씩 실행한다. 현재 지원이 없는 프리셋을 지원한다고 등록하지 않는다. 사이트와 계약 구현 후 실제 프리셋을 붙이려면 해당 프로젝트 세션에서 번역 사전·양쪽 토큰·전체 페이지 검증을 수행한다.
