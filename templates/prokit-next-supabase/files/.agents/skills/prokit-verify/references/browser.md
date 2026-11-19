# 브라우저 확인 (ego-browser)

ego-browser는 ego lite 앱(macOS)이 설치하는 CLI와 전역 `ego-browser` 스킬이다. API 문법은 그 스킬을 따른다. 여기에는 dev-cycle 증거용 스크린샷과 QA 흐름 절차만 적는다.

## 준비
- `command -v ego-browser`가 없으면 이 문서 대신 `agent-browser`와 `next-dev-loop`의 브라우저 절차를 쓰고, 증거에 `대안: agent-browser (ego-browser 없음)`을 적는다.
- `pnpm dev`(web 포트 3001)를 먼저 띄운다. 띄우기 전에 `lsof -nP -iTCP:3001 -sTCP:LISTEN`으로 포트를 본다. 이 프로젝트의 개발 서버(`lsof -a -p <PID> -d cwd -Fn`이 이 프로젝트 안)면 그대로 쓴다. 다른 프로세스면 끄지 않고 사용자에게 알려 정리를 부탁한다. 다른 포트로 피하지 않는다. 인증 주소(`BETTER_AUTH_URL`)가 3001이라 로그인 흐름이 깨진다. 직접 띄운 서버는 띄울 때 적은 PID의 프로세스 그룹만 끈다. `pkill`처럼 이름이나 포트로 골라 끄면 같은 기기의 다른 프로젝트 서버까지 꺼진다.
- ego lite 창이 화면에 보여야 한다. 창이 최소화되었거나 다른 데스크톱에 있으면 스크린샷이 `CDP request timed out: Page.captureScreenshot`으로 끝난다. 그러면 사용자에게 창을 보이게 해 달라고 요청하고, 그럴 수 없으면 agent-browser로 바꾸고 `대안: agent-browser (ego-browser 창 표시 불가)`를 적는다.
- ego-browser는 사용자의 실제 브라우저 프로필(로그인 세션·쿠키)로 동작한다.
  - `http://localhost:3001`만 연다. 다른 사이트로 이동하지 않는다.
  - 로컬 앱에는 테스트 전용 이메일 계정으로 가입·로그인한다. 소셜·OAuth 로그인은 쓰지 않는다(사용자의 실제 계정이 연결된다). 비밀번호는 증거에 적지 않는다.
  - 되돌릴 수 없는 버튼(탈퇴, 삭제, 결제, 발송)은 화면에 보이는 계정이 테스트 계정인지 확인한 뒤에만 누른다. 이 프로필에는 사용자 본인의 로컬 앱 세션이 남아 있을 수 있다. 확인하지 못하면 누르지 않고 사용자에게 맡긴다.
  - 쿠키·저장소를 지우지 않는다. 지우기는 프로필 전체에 닿을 수 있다. 로그인 상태를 바꿔야 하면 앱의 로그아웃을 쓴다.
- 로그인이 필요한 화면은 테스트 전용 계정으로 본다. 메일 인증 등으로 가입 화면에서 계정을 만들 수 없으면 `prokit-runtime-checker`는 확인을 멈추고 막힌 이유를 보고한다. Main이 로컬 개발 DB에만 인증을 마친 테스트 계정을 만들어 다시 맡긴다. 비밀번호는 증거, 커밋, 출력에 남기지 않고 프로젝트 밖 파일(권한 600)로 넘긴다. 원격 DB에는 만들지 않는다. <!-- edition:pro -->

## 검증 증거 묶음
화면 라운드의 런타임 확인은 묶음을 한 번 찍는다. 디자인 리뷰·감사·리뷰어·재확인이 이 묶음을 읽으므로 각자 다시 찍지 않는다(규칙은 `prokit-dev-cycle`의 `references/execution-efficiency.md` "검증 증거 묶음").

```bash
pnpm dev-cycle packet capture http://localhost:3001/<경로> tasks/evidence/<라운드 제목>/packet-1
# 로그인이 필요한 화면: 같은 세션에서 먼저 로그인한 뒤
#   agent-browser --session prokit-login open http://localhost:3001/login  (테스트 계정으로 로그인)
#   pnpm dev-cycle packet capture http://localhost:3001/<경로> tasks/evidence/<라운드 제목>/packet-1 --session prokit-login
```

- agent-browser(깨끗한 프로필)로 1440·1024·768·390·320 너비와 라이트·다크마다 첫 화면(`<너비>-<테마>.png`)과 전체 쪽(`-full.png`)을 찍는다. 같은 화면에서 가로 넘침과 원인 요소, 터치 영역(24px 미만 목록, 44px 미만 수), 글자 대비(WCAG AA 실패 목록과 잴 수 없는 수: 그림·그라데이션·흐림 위 글자), 콘솔 오류·경고와 잡히지 않은 오류를 잰다. 1440·390에서는 처음부터 Tab을 30번 눌러 포커스 순서와 포커스 표시가 없는 수를, 끝으로 `/_next/mcp`의 `get_errors`를 남긴다. 결과는 `measure.json`이고 명령이 바로 봉인한다.
- 출력 `packet: <경로> sha256=<값>`을 보고와 증거에 그대로 옮긴다. `표준에서 빠진 뷰포트`·`재지 못한 검사` 줄이 나오면 함께 보고한다.
- 한 묶음은 16\~20초 걸린다(Better-T-Stack 기본 화면 실측). 띄운 세션은 끝나면 닫는다. `--session`으로 준 세션은 닫지 않는다.
- 찍은 뒤 `measure.json`에서 결함 후보(가로 넘침 `over: true`, `contrast.fail`, `touchTargets.under24`, `console`, `tabOrder.noRing`, `get_errors`의 오류)을 오류 예산과 함께 보고한다. 데스크톱과 휴대폰 너비의 스크린샷은 이미지로 열어 기대한 상태인지 본다. 연 것만 증거에 적는다(아래 audit 경고). 개발 전용 요소(Next 개발 표시 `nextjs-portal`, TanStack Query devtools 버튼)는 결함으로 세지 않는다.
- 측정은 Chromium 흉내라 Safari 차이와 hover·메뉴·폼 입력·애니메이션 중간 상태는 담지 않는다. 그것은 평가자가 필요할 때 브라우저로 직접 본다.
- agent-browser가 없으면 명령이 exit 2로 알린다. 설치는 사용자가 요청할 때 한다. 그동안은 아래 ego-browser 촬영으로 desktop·mobile만 찍고, 증거에 `묶음 없음: agent-browser 없음`을 적는다. 다른 도구로 같은 꼴의 `measure.json`과 스크린샷을 만들었으면 `pnpm dev-cycle packet seal <폴더>`로 봉인한다(재지 못한 칸은 `{"skipped": "사유"}`).
- 평가 쪽은 쓰기 전에 `pnpm dev-cycle packet check <폴더>`로 `fresh`인지 본다. 봉인 뒤 화면 소스가 바뀌었으면 `stale`(exit 1)이다.

## ego-browser로 직접 찍기 (묶음을 만들 수 없을 때)
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

출력에 `결함:` 줄이 없어야 한다. 스크립트는 가로 넘침(모바일 에뮬레이션은 넘친 내용에 맞춰 화면을 넓혀 `innerWidth`가 390보다 커진다)과 콘솔 오류·경고, 잡히지 않은 오류를 `결함:`으로 출력한다. 이 수는 오류 예산(`prokit-verify` 본문)에 넣는다. 브라우저가 직접 남기는 `Failed to load resource` 줄은 여기에 잡히지 않으니 `/_next/mcp`의 `get_errors`로 함께 본다. 그리고 찍은 PNG를 이미지로 열어 화면이 기대한 상태인지 본다. 파일 경로만 적고 보지 않은 스크린샷은 증거가 아니다. Claude Code(Read)와 Antigravity(`read_file`·`view_file`) 라운드에서는 증거에 적은 `tasks/evidence/` 스크린샷 가운데 열어 본 기록이 없는 것을 audit이 경고로 알린다. `*`·`{a,b}` 묶음은 폴더에서 맞는 파일을 모두 펼쳐 세므로, 같은 문장에 "증거 제외"라고 적어도 그 파일까지 센다. 연 파일만 적는다(예: `tasks/evidence/recheck-{home,login}.png`이고 `tasks/evidence/recheck-*.png`는 쓰지 않는다).

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
