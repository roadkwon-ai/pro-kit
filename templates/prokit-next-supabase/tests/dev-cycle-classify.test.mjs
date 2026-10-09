import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { changedFiles, classify, loadConfig, resolveBase } from "../files/scripts/dev-cycle.mjs";
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
  for (const f of ["skills.manifest.json", ".claude/settings.json", ".codex/skills/plan/SKILL.md", ".codex/prompts/x.md", ".agents/agents/prokit-reviewer.md", "scripts/skills-setup.mjs"]) {
    assert.equal(classify([f], c).pathCase, "H", f);
  }
  assert.equal(classify(["README.md"], c).pathCase, "A");
  assert.equal(classify([], c).pathCase, "A");
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
