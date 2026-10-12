# 브라우저 확인 (ego-browser)

ego-browser는 ego lite 앱(macOS)이 설치하는 CLI와 전역 `ego-browser` 스킬이다. API 문법은 그 스킬을 따른다. 여기에는 dev-cycle 증거용 스크린샷과 QA 흐름 절차만 적는다.

## 준비
- `command -v ego-browser`가 없으면 이 문서 대신 `agent-browser`와 `next-dev-loop`의 브라우저 절차를 쓰고, 증거에 `대안: agent-browser (ego-browser 없음)`을 적는다.
- `pnpm dev`(web 포트 3001)를 먼저 띄운다.
- ego lite 창이 화면에 보여야 한다. 창이 최소화되었거나 다른 데스크톱에 있으면 스크린샷이 `CDP request timed out: Page.captureScreenshot`으로 끝난다. 그러면 사용자에게 창을 보이게 해 달라고 요청하고, 그럴 수 없으면 agent-browser로 바꾸고 `대안: agent-browser (ego-browser 창 표시 불가)`를 적는다.
- ego-browser는 사용자의 실제 브라우저 프로필(로그인 세션·쿠키)로 동작한다.
  - `http://localhost:3001`만 연다. 다른 사이트로 이동하지 않는다.
  - 로컬 앱에는 테스트 전용 이메일 계정으로 가입·로그인한다. 소셜·OAuth 로그인은 쓰지 않는다(사용자의 실제 계정이 연결된다). 비밀번호는 증거에 적지 않는다.
  - 쿠키·저장소를 지우지 않는다. 지우기는 프로필 전체에 닿을 수 있다. 로그인 상태를 바꿔야 하면 앱의 로그아웃을 쓴다.

## desktop·mobile 스크린샷
라운드마다 TaskSpace 하나를 쓴다. 처음 실행에서 출력한 `spaceId`를 기억해 두고, 다시 찍거나 실패에서 이어 갈 때도 새 TaskSpace를 만들지 말고 `taskSpace(<spaceId>)`로 이어 쓴다.

```bash
ego-browser nodejs <<'EOF'
const task = await taskSpace("<라운드 제목> 검증"); // 다시 찍을 때는 taskSpace(<spaceId>)
console.log({ spaceId: task.spaceId });
const page = task.page("p1");
const dir = "<프로젝트 절대 경로>/tasks/evidence/<라운드 제목>";
try {
  for (const [name, width, height, mobile] of [["desktop", 1440, 900, false], ["mobile", 390, 844, true]]) {
    await page.cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
    await page.goto("http://localhost:3001/<경로>");
    await page.waitForLoadState("load");
    await page.waitForTimeout(500);
    try {
      await page.screenshot({ path: `${dir}/${name}.png` });
    } catch {
      await page.waitForTimeout(1000); // 첫 캡처가 시간 초과되는 경우가 있어 한 번만 다시 찍는다
      await page.screenshot({ path: `${dir}/${name}.png` });
    }
    console.log(name, await page.evaluate(() => window.innerWidth));
  }
} finally {
  await page.cdp("Emulation.clearDeviceMetricsOverride", {});
}
EOF
```

출력한 `innerWidth`가 1440과 390인지 확인한다. mobile이 390보다 크면 페이지가 가로로 넘친 것이다(모바일 에뮬레이션은 넘친 내용에 맞춰 화면을 넓힌다). 결함으로 기록한다. 그리고 찍은 PNG를 이미지로 열어 화면이 기대한 상태인지 본다. 파일 경로만 적고 보지 않은 스크린샷은 증거가 아니다.

## 흐름 확인 (QA)
F 라운드의 사용자 흐름 QA도 같은 TaskSpace에서 ego-browser로 한다. 보고만 하고 코드는 고치지 않는다.
1. 스펙의 테스트 시나리오(F)를 모두 돈다. 시나리오가 없는 라운드는 이번 변경이 닿는 흐름을 고른다. 예: 가입 → 로그인 → 목록 → 추가·수정·삭제 → 로그아웃, 비로그인 접근. 너비(1440·1024·390·320), 라이트·다크, 키보드만 쓰는 흐름, 새로 고침, 없는 주소도 시나리오에 넣는다.
2. 단계마다 `page.snapshot()`으로 대상을 찾고 `click`·`fill`로 진행한다(`ego-browser` 스킬의 Page API). 기대한 상태는 `waitForURL`·`waitForSelector`로 확인한다.
3. 중요한 상태(빈 상태, 오류, 성공)는 스크린샷을 `tasks/evidence/<라운드 제목>/qa-<단계>.png`로 남긴다.
4. 흐름이 끝나면 `/_next/mcp`의 `get_errors`로 서버·브라우저 오류를 확인한다. ego-browser로 연 페이지가 브라우저 세션이 된다. 같은 경로를 agent-browser(깨끗한 프로필)로도 열어 `console`·`errors`를 본다. 한쪽에만 나는 오류는 원인(확장, 프로필 상태, 타이밍)을 가려 적는다. 오류 예산 규칙은 `prokit-verify` 본문의 "런타임과 브라우저"를 따른다.
5. 대조표 QA 행에 시나리오별 통과·실패, 발견한 문제와 개선점, 오류 예산 수를 적는다. 고치는 일은 다음 행(QA 발견 수정과 재QA)에서 한다.

React 내부 상태(react-devtools)가 필요하면 agent-browser를 쓴다. gstack `qa-only`·`qa`는 사용자가 요청할 때만 쓴다(자체 브라우저를 쓴다).

## 끝내기
라운드의 마지막 브라우저 단계(F는 QA)가 성공으로 끝난 뒤 한 번만 에이전트 페이지를 닫는다. 스크린샷 단계 뒤에 QA가 남아 있으면 닫지 않는다. 실행마다 새 Node 프로세스이므로 `spaceId`로 다시 연다: `ego-browser nodejs -e 'const task = await taskSpace(<spaceId>); console.log(await task.finish({ keep: [] }));'`. blocked나 오류로 멈췄으면 닫지 않고 사용자가 볼 수 있게 둔다.
