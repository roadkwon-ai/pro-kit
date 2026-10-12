import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { summarizeObservations } from "./preset-observations.mjs";

const interval = (source, start, end, exitCode = 0) => ({
  source, sha256: createHash("sha256").update(source).digest("hex"),
  startedAt: new Date(start).toISOString(), endedAt: new Date(end).toISOString(),
  wallMs: end - start, exitCode,
});
const observed = (...intervals) => ({ coverage: "partial", intervals });

test("병렬·내부 구간을 중복 합산하지 않고 비어 있는 대기 구간도 더하지 않는다", () => {
  assert.deepEqual(summarizeObservations(observed(
    interval("session.json", 0, 120000), interval("child.json", 30000, 90000),
    interval("resume.json", 180000, 240000),
  )), { wallMs: 180000, count: 3, coverage: "partial" });
});
test("실패한 세션 시간도 관측으로 남기되 성공이나 전체 제작 시간으로 승격하지 않는다", () => {
  assert.equal(summarizeObservations(observed(interval("failed.json", 0, 30000, 1))).wallMs, 30000);
  assert.throws(() => summarizeObservations({ coverage: "complete", intervals: [interval("one.json", 0, 30000)] }));
});
test("unknown·날짜 오류·중복·절대 경로·내용 해시 누락을 정상 관측으로 처리하지 않는다", () => {
  const good = interval("checks/one.json", 0, 30000);
  for (const bad of [{ wallMs: null }, { startedAt: "unknown" }, { endedAt: good.startedAt },
    { exitCode: null }, { source: "/private/one.json" }, { source: "../one.json" }, { sha256: "" }])
    assert.throws(() => summarizeObservations(observed({ ...good, ...bad })));
  assert.throws(() => summarizeObservations(observed(good, good)));
  assert.throws(() => summarizeObservations(observed()));
});

test("같은 영수증 복사본과 같은 출처의 다른 snapshot을 중복 합산하지 않는다", () => {
  const item = interval("checks/one.json", 0, 30000);
  assert.throws(() => summarizeObservations(observed(item, { ...item, source: "checks/copy.json" })));
  assert.throws(() => summarizeObservations(observed(item, { ...interval(item.source, 60000, 90000), sha256: "d".repeat(64) })));
});
