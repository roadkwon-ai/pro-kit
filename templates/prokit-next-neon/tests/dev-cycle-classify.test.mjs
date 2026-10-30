import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { changedFiles, classify, loadConfig, resolveBase } from "../files/scripts/dev-cycle.mjs";
import { ADOPT_AUTH, adoptRules } from "../install.mjs";
import { makeRepo } from "./helpers.mjs";

const cfg = () => loadConfig(makeRepo().root);

test("경로별 케이스: 첫 일치 규칙 하나만 적용한다", () => {
  const c = cfg();
  assert.equal(classify(["apps/web/src/app/api/rpc/[[...rest]]/route.ts"], c).pathCase, "D");
  assert.equal(classify(["apps/web/src/app/todos/page.tsx"], c).pathCase, "B");
  assert.equal(classify(["packages/ui/src/styles/globals.css"], c).pathCase, "B");
  assert.equal(classify(["packages/db/src/schema/todo.ts"], c).pathCase, "E");
  assert.equal(classify(["packages/db/drizzle.config.ts"], c).pathCase, "E");
  assert.equal(classify(["packages/api/src/routers/todo.ts"], c).pathCase, "D");
  assert.equal(classify([".agents/skills/prokit-web/SKILL.md"], c).pathCase, "H");
  for (const f of ["skills.manifest.json", ".claude/settings.json", ".agents/hooks.json", ".codex/hooks.json", ".codex/skills/plan/SKILL.md", ".codex/prompts/x.md", ".agents/agents/prokit-reviewer.md", "scripts/skills-setup.mjs"]) {
    assert.equal(classify([f], c).pathCase, "H", f);
  }
  for (const f of ["scripts/release.mjs", "scripts/resource-guard.mjs", "scripts/delegation.mjs", "scripts/export-html.mjs", "scripts/load-keys.mjs"]) {
    assert.equal(classify([f], c).pathCase, "H", f);
  }
  for (const f of ["apps/web/next.config.ts", "apps/web/next.config.mts", "vercel.json", "apps/web/vercel.ts", ".github/workflows/ci.yml", ".github/actions/setup/action.yml", "turbo.json", "apps/web/turbo.json"]) {
    const r = classify([f], c);
    assert.equal(r.pathCase, "H", `빌드·배포 설정은 A로 지나가지 않는다: ${f}`);
    assert.equal(r.evidence[0].why, "빌드·배포 설정", f);
  }
  // 루트 package.json에는 dev-cycle·skills 명령과 자원 보호를 건 dev·build가 있다. 기능 의존성은 apps/web·packages/*의 package.json과 pnpm-workspace.yaml의 catalog에 들어간다.
  for (const f of ["package.json", "biome.json", "tsconfig.json", "packages/config/tsconfig.base.json"]) {
    const r = classify([f], c);
    assert.equal(r.pathCase, "H", `작업공간 설정은 A로 지나가지 않는다: ${f}`);
    assert.equal(r.evidence[0].why, "작업공간 설정", f);
  }
  for (const f of ["apps/web/package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"]) assert.equal(classify([f], c).pathCase, "A", `의존성 추가는 A다: ${f}`);
  assert.equal(classify(["packages/db/package.json", "packages/db/src/schema/pass.ts"], c).pathCase, "E");
  assert.equal(classify(["apps/web/src/app/page.tsx", "apps/web/next.config.ts"], c).harness, true, "화면과 함께 바꾸면 H 행이 붙는다");
  assert.equal(classify(["README.md"], c).pathCase, "A");
  assert.equal(classify([], c).pathCase, "A");
});

test("adopt 경로 규칙: 흔한 Next.js 배치를 추정하고, 규칙 밖 코드는 F(case F 규칙), 하네스와 문서는 그대로다", () => {
  const base = cfg();
  const c = { ...base, rules: adoptRules(base.rules), authPaths: ADOPT_AUTH };
  assert.equal(classify(["app/page.tsx"], c).pathCase, "B");
  assert.equal(classify(["src/components/cart.tsx"], c).pathCase, "B");
  assert.equal(classify(["app/api/orders/route.ts"], c).pathCase, "D");
  assert.equal(classify(["prisma/schema.prisma"], c).pathCase, "E");
  assert.equal(classify(["lib/price.ts"], c).pathCase, "F", "계층을 모르는 코드는 무거운 쪽으로 본다");
  assert.equal(classify(["lib/price.ts"], c).layers.length, 0);
  assert.equal(classify(["scripts/dev-cycle.mjs"], c).pathCase, "H", "하네스 스크립트는 F 규칙보다 먼저 H다");
  assert.equal(classify(["next.config.ts"], c).pathCase, "H", "루트 next.config도 F 규칙보다 먼저 빌드·배포 설정 H다");
  assert.equal(classify([".github/workflows/deploy.yml"], c).pathCase, "H");
  assert.equal(classify([".agents/skills/x/components/a.ts"], c).pathCase, "H", "하네스 경로는 넓은 추정 규칙보다 먼저 H다");
  assert.equal(classify(["package.json"], c).pathCase, "A", "adopt의 루트 package.json은 앱의 의존성 목록이다");
  assert.equal(classify(["README.md"], c).pathCase, "A");
  assert.equal(classify(["app/page.tsx", "docs/dev-workflow.md"], c).pathCase, "B");
});

test("adopt 인증 경로: 흔한 인증 파일과 (auth) 라우트 묶음은 보안 리뷰 대상이고, 일반 화면은 아니다", () => {
  const base = cfg();
  const c = { ...base, rules: adoptRules(base.rules), authPaths: ADOPT_AUTH };
  for (const f of ["middleware.ts", "src/proxy.ts", "auth.ts", "auth.config.ts", "src/lib/auth-client.ts", "lib/auth/session.ts", "app/api/auth/[...nextauth]/route.ts", "app/(auth)/login/page.tsx", "apps/web/.env.schema", "lib/next-auth.ts", "middleware.mjs", "app/(authenticated)/me/page.tsx", "app/(protected)/admin/page.tsx"])
    assert.equal(classify([f], c).auth, true, f);
  for (const f of ["app/page.tsx", "components/author-card.tsx", "lib/oauth-scopes.md", "app/(marketing)/page.tsx"]) assert.equal(classify([f], c).auth, false, f);
});

test("자원 정책 기본값은 명시 등록 root 없이 표준 프로젝트 경로를 측정한다", () => {
  const c = cfg();
  assert.deepEqual(c.resources, {
    roots: [],
  });
});

test("두 계층 이상이면 F, 하네스는 레이어와 함께 표시만 한다", () => {
  const c = cfg();
  const r = classify(["packages/db/src/schema/todo.ts", "apps/web/src/app/todos/page.tsx", "docs/dev-workflow.md"], c);
  assert.equal(r.pathCase, "F");
  assert.deepEqual(r.layers, ["E", "B"]);
  assert.equal(r.harness, true);
});

test("인증 민감 경로는 규칙과 별개로 auth 플래그를 세운다", () => {
  const c = cfg();
  const onlyAuth = classify(["packages/auth/src/index.ts"], c);
  assert.equal(onlyAuth.pathCase, "A");
  assert.equal(onlyAuth.auth, true);
  assert.equal(onlyAuth.evidence[0].case, null);
  const authSchema = classify(["packages/db/src/schema/auth.ts"], c);
  assert.equal(authSchema.pathCase, "E");
  assert.equal(authSchema.auth, true);
  assert.equal(classify(["apps/web/.env.schema"], c).auth, true);
  assert.equal(classify(["apps/web/src/services.ts"], c).auth, true);
  assert.equal(classify(["apps/web/src/app/api/auth/[...all]/route.ts"], c).auth, true);
  assert.equal(classify(["apps/web/src/app/page.tsx"], c).auth, false);
});

test("변경 파일: 수정·삭제·untracked·한글 경로를 모두 잡는다", () => {
  const { root, git, write } = makeRepo();
  write("packages/db/src/schema/old.ts");
  git("add", "-A");
  git("commit", "-qm", "old");
  git("rm", "-q", "packages/db/src/schema/old.ts");
  write("README.md", "changed\n");
  write("apps/web/src/app/할일/page.tsx");
  const files = changedFiles(root, resolveBase(root, loadConfig(root)));
  assert.deepEqual(files, ["README.md", "apps/web/src/app/할일/page.tsx", "packages/db/src/schema/old.ts"]);
});

test("커밋이 없는 저장소: base는 null이고 모든 파일이 변경이다", () => {
  const { root, write } = makeRepo({ commit: false });
  write("packages/api/src/routers/index.ts");
  const base = resolveBase(root, loadConfig(root));
  assert.equal(base, null);
  const files = changedFiles(root, base);
  assert.ok(files.includes("packages/api/src/routers/index.ts"));
  assert.ok(files.includes("README.md"));
});

test("기준점: 기능 브랜치는 merge-base, 설정 브랜치가 없으면 HEAD", () => {
  const { root, git, write } = makeRepo({ branch: "main" });
  const mainHead = git("rev-parse", "HEAD").trim();
  git("checkout", "-qb", "feature/x");
  write("a.txt");
  git("add", "-A");
  git("commit", "-qm", "a");
  assert.equal(resolveBase(root, loadConfig(root)), mainHead);

  const m = makeRepo({ branch: "master" });
  const head = m.git("rev-parse", "HEAD").trim();
  assert.equal(resolveBase(m.root, loadConfig(m.root)), head);
});

test("상위 저장소의 하위 폴더에서 실행해도 경로를 프로젝트 기준으로 본다", () => {
  const { root, git, write } = makeRepo({ name: "dc-nest-" });
  write("app/.dev-cycle.json", readFileSync(join(root, ".dev-cycle.json"), "utf8"));
  write("app/packages/db/src/schema/t.ts");
  git("add", "-A");
  git("commit", "-qm", "app");
  write("app/packages/db/src/schema/t.ts", "y\n");
  const app = join(root, "app");
  const files = changedFiles(app, resolveBase(app, loadConfig(app)));
  assert.deepEqual(files, ["packages/db/src/schema/t.ts"]);
});

test("기준점: 설정 브랜치(main)가 없으면 master에서 갈라진 지점을 쓴다", () => {
  const { root, git, write } = makeRepo({ branch: "master" });
  const masterHead = git("rev-parse", "HEAD").trim();
  git("checkout", "-qb", "feat");
  write("packages/api/a.ts");
  git("add", "-A");
  git("commit", "-qm", "a");
  const base = resolveBase(root, loadConfig(root));
  assert.equal(base, masterHead);
  assert.deepEqual(changedFiles(root, base), ["packages/api/a.ts"]);
});

test("기준점과 브랜치 이름은 git 옵션으로 해석되지 않는다", () => {
  const { root, git } = makeRepo();
  assert.throws(() => changedFiles(root, "--output=pwned"), /기준점/);
  git("checkout", "-qb", "feat");
  resolveBase(root, { ...loadConfig(root), defaultBranch: "--output=pwned" });
  assert.equal(existsSync(join(root, "pwned")), false);
});

test("기준점: 기본 브랜치 위에서는 push하지 않은 커밋이 있어도 HEAD를 쓴다", () => {
  const { root, git, write } = makeRepo({ branch: "main" });
  git("update-ref", "refs/remotes/origin/main", "HEAD");
  write("packages/api/prev.ts");
  git("add", "-A");
  git("commit", "-qm", "prev");
  const base = resolveBase(root, loadConfig(root));
  assert.equal(base, git("rev-parse", "HEAD").trim());
  assert.deepEqual(changedFiles(root, base), []);
});

test("기준점과 같은 이름의 파일이 있어도 diff가 모호해지지 않는다", () => {
  const { root, git, write } = makeRepo();
  const base = git("rev-parse", "HEAD").trim();
  write(base);
  assert.deepEqual(changedFiles(root, base), [base]);
});
