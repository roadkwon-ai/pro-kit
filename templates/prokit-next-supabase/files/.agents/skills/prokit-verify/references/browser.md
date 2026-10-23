# 브라우저 확인 (ego-browser)

ego-browser는 ego lite 앱(macOS)이 설치하는 CLI와 전역 `ego-browser` 스킬이다. API 문법은 그 스킬을 따른다. 여기에는 dev-cycle 증거용 스크린샷과 QA 흐름 절차만 적는다.

## 준비
- `command -v ego-browser`가 없으면 이 문서 대신 `agent-browser`와 `next-dev-loop`의 브라우저 절차를 쓰고, 증거에 `대안: agent-browser (ego-browser 없음)`을 적는다.
- `pnpm dev`(web 포트 3001)를 먼저 띄운다. 띄우기 전에 `lsof -nP -iTCP:3001 -sTCP:LISTEN`으로 포트를 본다. 이 프로젝트의 개발 서버(`lsof -a -p <PID> -d cwd -Fn`이 이 프로젝트 안)면 그대로 쓴다. 다른 프로세스면 끄지 않고 사용자에게 알려 정리를 부탁한다. 다른 포트로 피하지 않는다. 인증 주소(`BETTER_AUTH_URL`)가 3001이라 로그인 흐름이 깨진다.
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
// ego-browser에는 콘솔 이벤트 API가 없어, 페이지 스크립트보다 먼저 도는 수집기를 심는다.
const collectErrors = () => {
  window.__prokitErrors = [];
  for (const level of ["error", "warn"]) {
    const original = console[level];
    console[level] = (...args) => {
      window.__prokitErrors.push(`${level}: ${args.map(String).join(" ").slice(0, 200)}`);
      original.apply(console, args);
    };
  }
  addEventListener("error", (e) => window.__prokitErrors.push(`uncaught: ${e.message}`));
  addEventListener("unhandledrejection", (e) => window.__prokitErrors.push(`unhandled: ${e.reason}`));
};
await page.cdp("Page.addScriptToEvaluateOnNewDocument", { source: `(${collectErrors})()` });
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
    const seen = await page.evaluate(() => ({ innerWidth: window.innerWidth, errors: window.__prokitErrors ?? [] }));
    console.log(name, { innerWidth: seen.innerWidth, errors: seen.errors.length });
    if (seen.innerWidth > width) console.log(`결함: ${name} 가로 넘침 ${seen.innerWidth} > ${width}`);
    for (const e of seen.errors) console.log(`결함: ${name} 콘솔 ${e}`);
  }
} finally {
  await page.cdp("Emulation.clearDeviceMetricsOverride", {});
}
EOF
```

출력에 `결함:` 줄이 없어야 한다. 스크립트는 가로 넘침(모바일 에뮬레이션은 넘친 내용에 맞춰 화면을 넓혀 `innerWidth`가 390보다 커진다)과 콘솔 오류·경고, 잡히지 않은 오류를 `결함:`으로 출력한다. 이 수는 오류 예산(`prokit-verify` 본문)에 넣는다. 브라우저가 직접 남기는 `Failed to load resource` 줄은 여기에 잡히지 않으니 `/_next/mcp`의 `get_errors`로 함께 본다. 그리고 찍은 PNG를 이미지로 열어 화면이 기대한 상태인지 본다. 파일 경로만 적고 보지 않은 스크린샷은 증거가 아니다.

## 휴대폰 스크롤 측정
B 라운드가 스크롤 모션(`animation-timeline`, 스크롤 이벤트), 긴 쪽, 반복해서 다시 그리는 요소(타이핑 효과, 자동 넘김)를 더하거나 바꿨을 때 한다. 그 밖의 라운드는 행에 `N/A: 스크롤 모션·긴 쪽 변경 없음`을 적는다. 데스크톱에서 매끄러워도 휴대폰에서는 끊길 수 있어 스크린샷으로는 보이지 않는다.

같은 TaskSpace에서 390px 터치 화면, CPU 6배 늦춤으로 손가락 스크롤을 흉내 낸다. 고치기 전(기본 브랜치나 운영 주소)과 고친 뒤를 같은 조건으로 재서 비교한다.

```bash
ego-browser nodejs <<'EOF'
const task = await taskSpace(<spaceId>);
const page = task.page("p1");
await page.cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await page.cdp("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
try {
  await page.goto("http://localhost:3001/<경로>");
  await page.waitForLoadState("load");
  await page.waitForTimeout(2500);
  await page.cdp("Emulation.setCPUThrottlingRate", { rate: 6 });
  await page.evaluate(() => {
    const m = (window.__scroll = { frames: [], on: true });
    const tick = (t) => { m.frames.push(t); if (m.on) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await page.cdp("Input.synthesizeScrollGesture", { x: 195, y: 600, yDistance: -12000, speed: 2500, gestureSourceType: "touch", preventFling: true }, { timeout: 60000 });
  await page.cdp("Emulation.setCPUThrottlingRate", { rate: 1 });
  console.log(await page.evaluate(() => {
    const m = window.__scroll; m.on = false;
    const gaps = m.frames.slice(1).map((t, i) => t - m.frames[i]);
    return {
      over50: gaps.filter((g) => g > 50).length,
      max: Math.round(Math.max(...gaps)),
      scrollMotions: document.getAnimations().filter((a) => !(a.timeline instanceof DocumentTimeline)).length,
      scrollY: Math.round(scrollY),
    };
  }));
  await page.events(); // 앞선 이벤트를 비운다
  await page.cdp("LayerTree.enable");
  await page.evaluate(() => scrollBy(0, 100));
  await page.waitForTimeout(1200);
  const tree = (await page.events()).filter((e) => e.method === "LayerTree.layerTreeDidChange" && e.params?.layers).at(-1);
  console.log({ layers: tree?.params.layers.length ?? "측정 못 함" });
  await page.cdp("LayerTree.disable");
} finally {
  await page.cdp("Emulation.setCPUThrottlingRate", { rate: 1 });
  await page.cdp("Emulation.setTouchEmulationEnabled", { enabled: false });
  await page.cdp("Emulation.clearDeviceMetricsOverride", {});
}
EOF
```

- `over50`은 50ms 넘는 프레임 수, `scrollMotions`는 스크롤에 묶인 애니메이션 수, `layers`는 합성 레이어 수다. 세 값을 고치기 전과 함께 행에 적는다.
- 고친 뒤 값이 늘었으면 원인을 찾아 고치거나 사유를 적는다. 휴대폰에서 `scrollMotions`가 0이 아니면 `prokit-ui`의 모션 규칙(스크롤 타임라인은 마우스 기기에서만)을 어긴 것이다.
- 쪽이 12,000px보다 짧으면 `scrollY`가 쪽 끝에서 멈춘다. 그대로 적는다.
- Chromium 흉내라 iPhone Safari의 메인 스레드 계산은 재현하지 못한다. 보고의 한계에 적는다.
- ego-browser가 없으면 agent-browser로 같은 너비에서 스크롤하며 `scrollMotions`만 재고, CPU 늦춤과 레이어 수는 `측정 못 함(agent-browser)`으로 적는다.

## 흐름 확인 (QA)
F 라운드의 사용자 흐름 QA도 같은 TaskSpace에서 ego-browser로 한다. 보고만 하고 코드는 고치지 않는다.
1. 스펙의 테스트 시나리오(F)를 모두 돈다. 시나리오가 없는 라운드는 이번 변경이 닿는 흐름을 고른다. 예: 가입 → 로그인 → 목록 → 추가·수정·삭제 → 로그아웃, 비로그인 접근. 너비(1440·1024·390·320), 라이트·다크, 키보드만 쓰는 흐름, 새로 고침, 없는 주소도 시나리오에 넣는다.
2. 단계마다 `page.snapshot()`으로 대상을 찾고 `click`·`fill`로 진행한다(`ego-browser` 스킬의 Page API). 기대한 상태는 `waitForURL`·`waitForSelector`로 확인한다.
3. 중요한 상태(빈 상태, 오류, 성공)는 스크린샷을 `tasks/evidence/<라운드 제목>/qa-<단계>.png`로 남긴다.
4. 흐름이 끝나면 `/_next/mcp`의 `get_errors`로 서버·브라우저 오류를 확인한다. ego-browser로 연 페이지가 브라우저 세션이 된다. 같은 경로를 agent-browser(깨끗한 프로필)로도 열어 `console`·`errors`를 본다. 한쪽에만 나는 오류는 원인(확장, 프로필 상태, 타이밍)을 가려 적는다. 오류 예산 규칙은 `prokit-verify` 본문의 "런타임과 브라우저"를 따른다.
5. 대조표 QA 행에 시나리오별 통과·실패, 발견한 문제와 개선점, 오류 예산 수를 적는다. 고치는 일은 다음 행(QA 발견 수정과 재QA)에서 한다.

React 내부 상태(react-devtools)가 필요하면 agent-browser를 쓴다. 두뇌가 gstack이면 `qa-only`는 보고만 하는 추가 관점으로 쓸 수 있고, 고치는 `qa`는 사용자가 요청할 때만 쓴다(자체 브라우저를 쓴다).

## 끝내기
라운드의 마지막 브라우저 단계(F는 QA)가 성공으로 끝난 뒤 한 번만 에이전트 페이지를 닫는다. 스크린샷 단계 뒤에 QA가 남아 있으면 닫지 않는다. 실행마다 새 Node 프로세스이므로 `spaceId`로 다시 연다: `ego-browser nodejs -e 'const task = await taskSpace(<spaceId>); console.log(await task.finish({ keep: [] }));'`. blocked나 오류로 멈췄으면 닫지 않고 사용자가 볼 수 있게 둔다.
