#!/usr/bin/env node
// AI 서버 주소는 site-links.json 한 곳에서 관리하고 Pages 루트에 공개 설정만 내보낸다.
// 사용법: node scripts/ai-service-config.mjs <GitHub Pages 체크아웃>
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export function aiServiceConfig(links) {
  const url = new URL(links.aiService);
  if (url.protocol !== "https:" || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash) {
    throw new Error("aiService에는 인증값·경로 없는 HTTPS 서버 주소를 넣으세요.");
  }
  return `${JSON.stringify({ aiServiceUrl: url.origin }, null, "\t")}\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  const destination = process.argv[2];
  if (!destination) throw new Error("사용법: node scripts/ai-service-config.mjs <Pages 체크아웃>");
  const links = JSON.parse(readFileSync(new URL("../site-links.json", import.meta.url), "utf8"));
  const file = resolve(destination, "ai-service.json");
  writeFileSync(file, aiServiceConfig(links));
  console.log(`공통 AI 설정: ${file}`);
}
