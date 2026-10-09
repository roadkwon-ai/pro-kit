import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { TEMPLATE_FILES } from "./helpers.mjs";

const { copyFilter, findLeaks, imageLoader, main, parseArgs, patchNextConfig, secretValues, staleRefs } = await import(
  join(TEMPLATE_FILES, "scripts/export-html.mjs")
);

// BTS 3.44.2가 만드는 apps/web/next.config.ts 그대로
const BTS_CONFIG = `import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";

const withVarlock = varlockNextConfigPlugin();
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
};

export default withVarlock(nextConfig);
`;

function tree(files) {
  const root = mkdtempSync(join(tmpdir(), "export-html-test-"));
  for (const [rel, s] of Object.entries(files)) {
    mkdirSync(join(root, rel, ".."), { recursive: true });
    writeFileSync(join(root, rel), s);
  }
  return root;
}

test("next.config.ts: export default 앞에 정적 내보내기 설정을 덧쓰고, 하위 경로가 있으면 basePath를 넣는다", () => {
  const plain = patchNextConfig(BTS_CONFIG);
  const line = plain.split("\n").find((l) => l.startsWith("Object.assign(nextConfig, "));
  const override = JSON.parse(line.slice("Object.assign(nextConfig, ".length, -2));
  assert.deepEqual(override, {
    output: "export",
    trailingSlash: true,
    images: { loader: "custom", loaderFile: "./export-image-loader.js" },
    typescript: { ignoreBuildErrors: true },
  });
  assert.ok(plain.indexOf(line) < plain.indexOf("export default withVarlock(nextConfig);"));
  assert.match(patchNextConfig(BTS_CONFIG, "/my-app"), /"basePath":"\/my-app"/);
  assert.throws(() => patchNextConfig("export default {};\n"), /const nextConfig/);
});

test("이미지 로더: 하위 경로를 한 번만 붙이고 외부 주소는 그대로 둔다", async () => {
  const load = async (base) =>
    (await import(`data:text/javascript,${encodeURIComponent(imageLoader(base))}`)).default;
  const sub = await load("/my-app");
  assert.equal(sub({ src: "/images/a.webp" }), "/my-app/images/a.webp");
  assert.equal(sub({ src: "/my-app/images/a.webp" }), "/my-app/images/a.webp");
  assert.equal(sub({ src: "https://example.com/a.webp" }), "https://example.com/a.webp");
  assert.equal(sub({ src: "//cdn.example.com/a.webp" }), "//cdn.example.com/a.webp");
  assert.equal((await load(""))({ src: "/images/a.webp" }), "/images/a.webp");
});

test("복사: 의존성·빌드 캐시·git은 어느 깊이든, 결과물은 그 경로만 뺀다", () => {
  const root = "/p";
  const keep = copyFilter(root);
  for (const rel of ["node_modules", "apps/web/node_modules/x", ".git", "apps/web/.next", ".turbo", "html", "apps/web/out"])
    assert.equal(keep(join(root, rel)), false, rel);
  for (const rel of ["apps/web/src/components/html", "apps/web/src/app/out", "packages/ui", ".claude/skills", "apps/web/.env"])
    assert.equal(keep(join(root, rel)), true, rel);
});

test("비밀값: 공개 표시·NEXT_PUBLIC_·짧은 값·계정 없는 http 주소는 빼고, 작업 폴더 .env까지 값을 이름과 함께 모은다", () => {
  const ws = tree({ ".env": "GH_TOKEN=ghp_workspace_token_123 # 배포\n" });
  const root = join(ws, "project");
  for (const [rel, text] of Object.entries({
    "apps/web/.env.schema": "# @defaultSensitive=true\n# ---\n\n# @public @type=enum(development, production, test)\nNODE_ENV=development\n\n# @type=url\nBETTER_AUTH_URL=\nSITE_NAME= # @public\n# @sensitive=false\nREGION=\n",
    "apps/web/.env": 'NODE_ENV=development-long\nBETTER_AUTH_SECRET="s3cr3t-value-0123456789"\nBETTER_AUTH_URL=http://localhost:3001\nDATABASE_URL=postgres://user:pw@localhost:5432/db\nNEXT_PUBLIC_SITE=public-value-123\nFLAG=true\nSITE_NAME=public-site-name\nREGION=ap-northeast-2\n',
    "apps/web/.env.production": "PROD_SECRET=prod-secret-value-1\n",
    ".env": "export OPENAI_API_KEY='sk-test-abcdefgh'\n",
  })) {
    mkdirSync(join(root, rel, ".."), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  assert.deepEqual(
    Object.fromEntries([...secretValues(root)].map(([v, k]) => [k, v])),
    {
      BETTER_AUTH_SECRET: "s3cr3t-value-0123456789",
      DATABASE_URL: "postgres://user:pw@localhost:5432/db",
      PROD_SECRET: "prod-secret-value-1",
      OPENAI_API_KEY: "sk-test-abcdefgh",
      GH_TOKEN: "ghp_workspace_token_123",
    },
  );
});

test("유출 검사: 값이 든 파일이 있으면 변수 이름만 돌려준다", () => {
  const out = tree({ "index.html": "<p>hi</p>", "_next/static/a.js": 'const k="s3cr3t-value-0123456789"' });
  const secrets = new Map([["s3cr3t-value-0123456789", "BETTER_AUTH_SECRET"], ["not-in-output-000", "OTHER"]]);
  assert.deepEqual(findLeaks(out, secrets), ["BETTER_AUTH_SECRET"]);
  const html = tree({ "index.html": "<p>postgres://u:p@h/db?sslmode=require&amp;channel_binding=require</p>" });
  assert.deepEqual(findLeaks(html, new Map([["postgres://u:p@h/db?sslmode=require&channel_binding=require", "DATABASE_URL"]])), ["DATABASE_URL"]);
  assert.deepEqual(findLeaks(out, new Map()), []);
});

test("인자: --base는 /로 시작하는 하위 경로이고 끝 /는 뗀다. 모르는 인자는 오류", () => {
  assert.deepEqual(parseArgs([]), { base: "" });
  assert.deepEqual(parseArgs(["--base", "/my-app"]), { base: "/my-app" });
  assert.deepEqual(parseArgs(["--base=/my-app/"]), { base: "/my-app" });
  for (const bad of [["--base", "my-app"], ["--base", "/"], ["--base", "//"], ["--base", "/a//b"], ["--base"], ["--prod"], ["/x"]]) assert.ok(parseArgs(bad).error, bad.join(" "));
});

test("프로젝트 루트가 아니면(next.config.ts 없음) 복사 전에 exit 1", () => {
  const root = tree({ "package.json": "{}" });
  assert.equal(main([], root), 1);
  assert.equal(main(["--base", "x"], root), 1);
});

test("남은 서버 부품: /dashboard 링크가 있는 페이지 수와 authClient를 알린다", () => {
  const out = tree({
    "index.html": '<a href="/my-app/dashboard">x</a>',
    "items/a/index.html": '<a href="/my-app/dashboard/">x</a>',
    "about/index.html": "<p>ok</p>",
    "_next/static/chunks/a.js": 'function f(e,t="/api/auth"){}',
    "_next/static/chunks/b.js": "url:`${window.location.origin}/api/rpc`",
  });
  assert.deepEqual(staleRefs(out, "/my-app"), ["/dashboard 링크(페이지 2개)", "로그인 클라이언트(authClient)"]);
  assert.deepEqual(staleRefs(out), ["로그인 클라이언트(authClient)"]);
  assert.deepEqual(staleRefs(tree({ "index.html": "<p>ok</p>" })), []);
});


for (const [name, output, want] of [
  ["제작 표시가 없어도 내보내고 기존 html을 새 결과로 바꾼다", { "index.html": "<p>새 화면</p>", "login/index.html": "<p>로그인</p>" }, 0],
  ["첫 페이지가 없으면 기존 html을 보존하고 실패한다", { "about/index.html": "<p>소개</p>" }, 1],
  ["비밀값이 있으면 제작 표시와 관계없이 기존 html을 보존하고 차단한다", { "index.html": "<p>test-sensitive-value-123456</p>" }, 2],
]) {
  test(`내보내기: ${name}`, () => {
    const root = tree({
      "apps/web/next.config.ts": BTS_CONFIG,
      ".env": "SERVER_SECRET=test-sensitive-value-123456\n",
      "html/index.html": "기존 결과",
      ...Object.fromEntries(Object.entries(output).map(([path, text]) => [`fixture-output/${path}`, text])),
      "bin/pnpm": `#!/usr/bin/env node
const { cpSync } = require("node:fs");
const { resolve } = require("node:path");
const args = process.argv.slice(2).join(" ");
if (args === "install --prefer-offline") process.exit(0);
if (args !== "exec next build") process.exit(1);
cpSync(resolve("../../fixture-output"), "out", { recursive: true });
`,
    });
    chmodSync(join(root, "bin/pnpm"), 0o755);
    const priorPath = process.env.PATH;
    try {
      process.env.PATH = `${join(root, "bin")}:${priorPath}`;
      assert.equal(main([], root), want);
      assert.equal(readFileSync(join(root, "html/index.html"), "utf8"), want === 0 ? "<p>새 화면</p>" : "기존 결과");
      assert.equal(existsSync(join(root, "html/.nojekyll")), want === 0);
      if (want === 0) assert.equal(readFileSync(join(root, "html/login/index.html"), "utf8"), "<p>로그인</p>");
    } finally {
      process.env.PATH = priorPath;
      rmSync(root, { recursive: true, force: true });
    }
  });
}
