#!/usr/bin/env node
// 공개 주소의 정본은 저장소 루트 site-links.json(home 홈페이지, pages 프리셋 사이트, repo, packs)이다.
// 주소가 바뀌면(도메인 구입, 계정 이전) 이 명령 하나로 추적 파일 전체와 site-links.json을 바꾼다.
// 사용법: node scripts/site-links.mjs set <키> <새 주소> (AI 서버: aiService)
//   https 주소, 스킴 없는 주소, GitHub이면 owner/name 꼴까지 바꾼다. 이름이 이어지는 주소(pro-kit → pro-kit-packs)와 release/ 옛 노트는 그대로 둔다.
//   두 템플릿의 PROKIT_LINKS도 같은 값으로 바뀐다. 바꾼 뒤 복사할 곳(저장소 밖이라 이 명령이 바꾸지 않는다):
//   프리셋 작업공간의 prokit-credit.tsx(AGENTS.md 템플릿 수정 규칙), ../pro-kit-web(홈페이지 원본, apps/web/src/lib/site.ts).
//   문서의 값 표시는 이어서 node scripts/doc-values.mjs로 채운다.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "site-links.json";
const [cmd, key, next] = process.argv.slice(2);
const links = JSON.parse(readFileSync(FILE, "utf8"));
if (cmd !== "set" || !(key in links) || !/^https:\/\/[^/]/.test(next ?? "")) {
  console.error(`사용법: node scripts/site-links.mjs set <${Object.keys(links).join("|")}> <https://새 주소>`);
  process.exit(1);
}

const forms = (url) => {
  const bare = url.replace(/^https:\/\//, "");
  const gh = bare.match(/^github\.com\/(.+)$/)?.[1];
  return [url, bare, ...(gh ? [gh] : [])];
};
const from = forms(links[key].replace(/\/$/, ""));
const to = forms(next.replace(/\/$/, ""));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// 긴 꼴부터 한 번에 바꾼다. 앞은 주소 중간이 아니고(https://, 다른 이름의 끝이 아님), 뒤에 이름이 이어지지 않을 때만.
const rx = new RegExp(`(?<![\\w.-])(${from.map(esc).join("|")})(?![\\w-])`, "g");
const swap = (m) => to[from.indexOf(m)];

let total = 0;
for (const f of execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n")) {
  if (!f || f.startsWith("release/") || f === FILE) continue;
  let s;
  try {
    s = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  if (s.includes("\0")) continue;
  let n = 0;
  const out = s.replace(rx, (m) => (n++, swap(m)));
  if (n) {
    writeFileSync(f, out);
    console.log(`${String(n).padStart(4)} ${f}`);
    total += n;
  }
}
links[key] = next.replace(/\/$/, "");
writeFileSync(FILE, `${JSON.stringify(links, null, "\t")}\n`);
console.log(`${key}: ${from[0]} → ${links[key]} (${total}곳)`);
