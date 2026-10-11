// 세션 관측은 전체 제작 시간이나 검사 성공을 뜻하지 않는다.
export function summarizeObservations(observed) {
  if (observed.coverage !== "partial" || !observed.intervals?.length)
    throw new Error("제작 관측은 근거가 있는 일부 구간으로 기록한다");
  const sources = new Set(), hashes = new Set();
  const intervals = observed.intervals.map((item) => {
    const start = Date.parse(item.startedAt), end = Date.parse(item.endedAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start ||
      !Number.isFinite(item.wallMs) || item.wallMs <= 0 ||
      Math.abs(end - start - item.wallMs) > 1000 ||
      !Number.isInteger(item.exitCode)) throw new Error("제작 관측의 시간·종료 코드가 불완전하다");
    if (typeof item.source !== "string" || !item.source ||
      item.source.startsWith("/") || item.source.includes("\\") ||
      item.source.split("/").includes("..") || !/^[a-f0-9]{64}$/.test(item.sha256))
      throw new Error("제작 관측에는 상대 출처와 내용 해시가 필요하다");
    if (sources.has(item.source) || hashes.has(item.sha256)) throw new Error("같은 제작 관측을 중복 기록했다");
    sources.add(item.source);
    hashes.add(item.sha256);
    return [start, end];
  }).sort((a, b) => a[0] - b[0]);
  let wallMs = 0, [start, end] = intervals[0];
  for (const [nextStart, nextEnd] of intervals.slice(1)) {
    if (nextStart <= end) end = Math.max(end, nextEnd);
    else { wallMs += end - start; [start, end] = [nextStart, nextEnd]; }
  }
  wallMs += end - start;
  return { wallMs, count: intervals.length, coverage: "partial" };
}
