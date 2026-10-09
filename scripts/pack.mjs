#!/usr/bin/env node
// 튜토리얼 프리셋 팩 하나를 받는다. 팩(글, 데이터, 그림, 스크린샷)은 저장소에 넣지 않고 팩마다 zip 하나로 릴리스에 올린다.
//   node scripts/pack.mjs <이름>   tutorials/packs.json의 주소에서 zip을 받아 sha256을 확인하고 packs/<이름>/에 푼다
//   node scripts/pack.mjs <이름> --zip <경로>   사용자가 받아 둔 zip을 같은 확인을 거쳐 푼다
//   node scripts/pack.mjs          받을 수 있는 팩 이름을 보여 준다
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MARK = ".pack.json";

function unzip(zip, to) {
  for (const [cmd, args] of [
    ["unzip", ["-q", zip, "-d", to]],
    ["python3", ["-m", "zipfile", "-e", zip, to]],
  ]) {
    try {
      return execFileSync(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  throw new Error("zip을 풀 도구가 없어요. unzip을 설치해 주세요(Ubuntu·WSL: sudo apt install unzip)");
}

// 받은 팩이 이미 같은 판이면 그대로 두고, 아니면 새로 풀어 바꾼다. 해시가 다르면 아무것도 바꾸지 않는다.
// zip을 주면 받지 않고 그 파일을 쓴다(같은 sha256 확인).
export async function getPack(name, { index = join(ROOT, "tutorials", "packs.json"), dir = join(ROOT, "packs"), zip } = {}) {
  const packs = JSON.parse(readFileSync(index, "utf8"));
  const pack = packs[name];
  if (!pack) throw new Error(`없는 팩: ${name}. 받을 수 있는 팩: ${Object.keys(packs).join(", ")}`);
  const dest = join(dir, name);
  const mark = join(dest, MARK);
  if (existsSync(mark) && JSON.parse(readFileSync(mark, "utf8")).sha256 === pack.sha256) return { dest, fresh: false };

  const from = zip?.replace(/^~(?=\/|$)/, homedir()) ?? pack.url;
  let buf;
  if (zip) {
    if (!existsSync(from)) throw new Error(`zip이 없어요: ${from}`);
    buf = readFileSync(from);
  } else {
    const res = await fetch(pack.url);
    if (!res.ok) throw new Error(`받기 실패: ${res.status} ${pack.url}`);
    buf = Buffer.from(await res.arrayBuffer());
  }
  const sha256 = createHash("sha256").update(buf).digest("hex");
  if (sha256 !== pack.sha256) throw new Error(`sha256이 다름: ${from}\n  기대 ${pack.sha256}\n  받음 ${sha256}`);

  // 같은 디스크에서 이름만 바꾸도록 임시 폴더를 packs/ 안에 만든다(/tmp가 다른 디스크면 rename이 실패한다)
  mkdirSync(dir, { recursive: true });
  const tmp = mkdtempSync(join(dir, `.tmp-${name}-`));
  try {
    const file = join(tmp, `${name}.zip`);
    writeFileSync(file, buf);
    unzip(file, join(tmp, "out"));
    writeFileSync(join(tmp, "out", MARK), `${JSON.stringify({ release: pack.release, sha256 }, null, 2)}\n`);
    rmSync(dest, { recursive: true, force: true });
    renameSync(join(tmp, "out"), dest);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  return { dest, fresh: true };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const name = process.argv[2];
  if (!name) {
    console.log(Object.keys(JSON.parse(readFileSync(join(ROOT, "tutorials", "packs.json"), "utf8"))).join("\n"));
  } else {
    try {
      const at = process.argv.indexOf("--zip");
      const { dest, fresh } = await getPack(name, at > 0 ? { zip: process.argv[at + 1] } : {});
      console.log(fresh ? `받음: ${dest}` : `이미 받은 판: ${dest}`);
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  }
}
