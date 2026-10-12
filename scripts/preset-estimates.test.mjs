import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { estimatePreset } from "./preset-estimates.mjs";
const { cost } = JSON.parse(readFileSync(new URL("../doc-values.json", import.meta.url), "utf8"));
test("단계 합과 토큰 정책으로 팩 재사용·새 제작 예상을 구분한다", () => {
  const r = estimatePreset(cost, { pages: 6, images: 18, checkMinutes: 12 });
  assert.equal(r.pack.time, "1시간");
  assert.equal(r.scratch.time, "1시간 36분");
  assert.equal(r.pack.tokens, "122.4만");
  assert.equal(r.basis.pack.generatedTokens, 0);
  assert.equal(r.basis.scratch.generatedTokens, 306000);
  assert.equal(r.basis.pack.totalMinutes, Object.values(r.basis.pack.stages).reduce((a, b) => a + b));
  assert.equal(estimatePreset(cost, { pages: 1, images: 13, checkMinutes: 8 }).pack.time, "36분");
});
test("누락/잘못된 개수·검사 범위·정책으로 예상치를 만들지 않는다", () => {
  for (const options of [{ pages: 0, images: 0, checkMinutes: 5 }, { pages: 1, images: -1, checkMinutes: 5 }, { pages: 1, images: 0, checkMinutes: 0 }, { pages: 1.5, images: 0, checkMinutes: 5 }])
    assert.throws(() => estimatePreset(cost, options));
  assert.throws(() => estimatePreset({ ...cost, tokensPerUsd: "unknown" }, { pages: 1, images: 0, checkMinutes: 5 }));
});
