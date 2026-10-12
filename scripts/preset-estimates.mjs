// 기존 단계·시간/토큰 정책으로 만든 재현 예상이다. 실측 사용량이나 청구 비용이 아니다.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const minutes = (value) => {
  const match = /^(?:(\d+)시간\s*)?(?:(\d+)(?:~\d+)?분)?$/.exec(value);
  if (!match || (!match[1] && !match[2])) throw new Error(`분 단위 정책값이 아닙니다: ${value}`);
  return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
};
const time = (n) => `${n >= 60 ? `${Math.floor(n / 60)}시간` : ""}${n % 60 ? `${n >= 60 ? " " : ""}${n % 60}분` : ""}`;
const amount = (value) => `${Math.round(value / 1000) / 10}만`;

export function estimatePreset(cost, { pages, images, checkMinutes }) {
  if (!Number.isSafeInteger(pages) || pages < 1 || !Number.isSafeInteger(images) || images < 0 || !Number.isSafeInteger(checkMinutes) || checkMinutes < 1)
    throw new Error("페이지·그림 개수와 검사 예상 분을 명시해야 합니다");
  const unitMinutes = minutes(cost.unit.first.time);
  const unitUsd = Number(cost.unit.first.usd.split("~")[0]);
  const tokensPerUsd = Number(cost.tokensPerUsd.replace("만", "")) * 10000;
  const cachedPerUsd = Number(cost.cachedPerUsd.replace("만", "")) * 10000;
  const imageSeconds = Number(cost.image.time.replace("초", ""));
  const imageTokens = Number(cost.image.tokens.replace("만", "")) * 10000;
  if (![unitMinutes, unitUsd, tokensPerUsd, cachedPerUsd, imageSeconds, imageTokens].every((n) => Number.isFinite(n) && n > 0))
    throw new Error("시간·토큰 정책이 불완전합니다");
  const result = { stages: { check: time(checkMinutes) }, estimateStages: {}, basis: { method: "policy-stage-and-unit-v1", policyDate: cost.date, pages, images, checkMinutes, unitMinutes, unitUsd } };
  for (const mode of ["pack", "scratch"]) {
    const stages = {
      setup: minutes(cost.stage.setup), plan: minutes(cost.stage.plan[mode]), design: minutes(cost.stage.design[mode]),
      mockup: mode === "scratch" ? minutes(cost.stage.mockup) : 0,
      images: mode === "pack" ? minutes(cost.stage.packImages) : Math.ceil(images * imageSeconds / 60),
      first: minutes(cost.stage.first[mode]), rest: (pages - 1) * minutes(cost.stage.page[mode]), check: checkMinutes, export: minutes(cost.stage.export),
    };
    const totalMinutes = Object.values(stages).reduce((a, b) => a + b, 0);
    const generatedTokens = mode === "scratch" ? images * imageTokens : 0;
    const modelUsd = totalMinutes / unitMinutes * unitUsd;
    result[mode] = {
      time: time(totalMinutes), tokens: amount(modelUsd * tokensPerUsd + generatedTokens),
      cached: amount(modelUsd * cachedPerUsd + generatedTokens), usd: String(Math.round((modelUsd + generatedTokens / tokensPerUsd) * 100) / 100),
    };
    result.estimateStages[mode] = Object.fromEntries(Object.entries(stages).map(([key, mins]) => {
      const extra = key === "images" ? generatedTokens : 0;
      const usd = mins / unitMinutes * unitUsd + extra / tokensPerUsd;
      return [key, { time: mins ? time(mins) : "해당 없음", tokens: amount(mins / unitMinutes * unitUsd * tokensPerUsd + extra), usd: usd < 1 ? "1달러 미만" : `${Math.round(usd)}달러` }];
    }));
    result.basis[mode] = { stages, totalMinutes, modelUsd, generatedTokens };
  }
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [slug, check] = process.argv.slice(2);
  const data = JSON.parse(readFileSync(new URL("../doc-values.json", import.meta.url), "utf8"));
  const preset = data.presets[slug];
  if (!preset || preset.kind === "clone") throw new Error("일반 프리셋 slug와 검사 예상 분을 입력하세요");
  console.log(JSON.stringify(estimatePreset(data.cost, { pages: Number(preset.pages), images: Number(preset.design.images), checkMinutes: Number(check) }), null, 2));
}
