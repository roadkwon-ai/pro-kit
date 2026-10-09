import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { TEMPLATE_FILES, makeRepo } from "./helpers.mjs";

const SCRIPT = join(TEMPLATE_FILES, "scripts/vercel-deploy.mjs");
const { requiredEnv } = await import(SCRIPT);

// BTS 3.44.1이 만드는 apps/web/.env.schema 그대로
const SCHEMA = `# @defaultRequired=true
# @defaultSensitive=true
# @currentEnv=$NODE_ENV
# ---

# @public @type=enum(development, production, test)
NODE_ENV=development

# @type=string(minLength=32)
BETTER_AUTH_SECRET=

# @type=url
BETTER_AUTH_URL=

# @type=string(minLength=1)
DATABASE_URL=
`;
const ALL = ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "DATABASE_URL"];

// 스텁은 받은 인자를 $STUB_LOG에 적고, 환경변수로 받은 JSON을 진짜 CLI처럼 돌려준다.
// env run은 실제 CLI처럼 실행 환경의 BETTER_AUTH_URL을 Vercel 값보다 먼저 쓴다(CLI 60.1 소스).
const VERCEL = `#!/bin/sh
echo "vercel $*" >> "$STUB_LOG"
case "$1" in
  --version) exit 0 ;;
  whoami) exit "\${STUB_WHOAMI_EXIT:-0}" ;;
  api) printf '%s' "$STUB_API" ;;
  env)
    if [ "$2" = ls ]; then [ "$3" = preview ] && printf '%s' "$STUB_ENV_preview" || printf '%s' "$STUB_ENV_production"; fi
    if [ "$2" = run ]; then [ "$4" = preview ] && echo "\${BETTER_AUTH_URL:-$STUB_URL_preview}" || echo "\${BETTER_AUTH_URL:-$STUB_URL_production}"; fi ;;
  ls) [ "$3" = preview ] && printf '%s' "$STUB_LS_preview" || printf '%s' "$STUB_LS_production" ;;
  inspect) [ -e "$STUB_LOG.deployed" ] && printf '%s' "$STUB_AFTER" || printf '%s' "$STUB_CURRENT" ;;
  deploy) touch "$STUB_LOG.deployed"; printf '%s' "$STUB_DEPLOY"; exit "\${STUB_DEPLOY_EXIT:-0}" ;;
  alias) exit "\${STUB_ALIAS_EXIT:-0}" ;;
esac
`;

// gh는 release view(production 릴리스 확인)만 부른다. STUB_GH_EXIT로 Release가 없는 경우를 만든다.
const GH = `#!/bin/sh
echo "gh $*" >> "$STUB_LOG"
exit "\${STUB_GH_EXIT:-0}"
`;

const envs = (keys) => JSON.stringify({ envs: keys.map((key) => ({ key, gitBranch: null })) });
const deployments = (...ds) => JSON.stringify({ deployments: ds });
// vercel api /v9/projects/<id>의 응답. Git 연결이 없으면 link 키가 없다(실측)
const project = (extra = {}) => JSON.stringify({ id: "prj_1", gitProviderOptions: { createDeployments: "enabled" }, ...extra });
const deployed = (target) => JSON.stringify({ deployment: { url: "https://app-new-team.vercel.app", target } });

function setup({ stub = true, linked = true } = {}) {
	const repo = makeRepo({ name: "vercel-deploy-" });
	repo.write("apps/web/.env.schema", SCHEMA);
	repo.write(".gitignore", ".vercel\nstub.log*\n.stub-bin\n");
	cpSync(join(TEMPLATE_FILES, ".vercelignore"), join(repo.root, ".vercelignore"));
	if (linked) repo.write(".vercel/project.json", '{"projectId":"prj_1","orgId":"team_1"}');
	repo.write("release/20260928-0900-first.md", "# v0.1.0 — First\n");
	repo.git("add", "-A");
	repo.git("commit", "-qm", "app");
	// production은 origin에 push한 릴리스 커밋만 배포한다. origin은 GitHub 주소로 두고 로컬 bare 저장소로 보낸다
	const bare = mkdtempSync(join(tmpdir(), "vercel-origin-"));
	execFileSync("git", ["init", "-q", "--bare", bare]);
	repo.git("remote", "add", "origin", "https://github.com/o/r.git");
	repo.git("config", `url.${bare}.insteadOf`, "https://github.com/o/r.git");
	repo.git("tag", "-a", "v0.1.0", "-m", "v0.1.0 — First");
	repo.git("push", "-q", "origin", "main", "v0.1.0");
	const bin = join(repo.root, ".stub-bin");
	mkdirSync(bin);
	writeFileSync(join(bin, "gh"), GH);
	chmodSync(join(bin, "gh"), 0o755);
	if (stub) {
		writeFileSync(join(bin, "vercel"), VERCEL);
		chmodSync(join(bin, "vercel"), 0o755);
	}
	const log = join(repo.root, "stub.log");
	writeFileSync(log, "");
	const base = {
		STUB_ENV_preview: envs(ALL),
		STUB_ENV_production: envs(ALL),
		STUB_URL_preview: "https://app-develop.vercel.app",
		STUB_URL_production: "https://app.vercel.app",
		STUB_LS_production: deployments({ url: "app-old-team.vercel.app", meta: {} }),
		STUB_API: project(),
	};
	const exec = (args, env = {}) =>
		spawnSync(process.execPath, [SCRIPT, ...args], {
			cwd: repo.root,
			encoding: "utf8",
			env: { PATH: `${bin}:/usr/bin:/bin`, HOME: repo.root, STUB_LOG: log, ...base, ...env },
		});
	const commit = (msg) => {
		repo.git("add", "-A");
		repo.git("commit", "-qm", msg);
		return repo.git("rev-parse", "HEAD").trim();
	};
	return { ...repo, exec, commit, calls: () => readFileSync(log, "utf8").trim().split("\n").filter(Boolean) };
}

// 지금 주소가 prev 배포를 가리키고, 그 배포의 커밋이 sha인 상태
const prevAt = (env, sha) => ({
	STUB_CURRENT: JSON.stringify({ url: "app-prev-team.vercel.app" }),
	[`STUB_LS_${env}`]: deployments({ url: "app-prev-team.vercel.app", meta: { gitCommitSha: sha } }),
});

test("필수 환경변수: .env.schema에서 값이 빈 변수만 고르고(CRLF 포함), @optional·@required=false는 빼고, 스키마가 없으면 null", () => {
	const { root, write } = makeRepo({ name: "vercel-schema-" });
	assert.equal(requiredEnv(root), null);
	write("apps/web/.env.schema", SCHEMA);
	assert.deepEqual(requiredEnv(root), ALL);
	write("apps/web/.env.schema", SCHEMA.replaceAll("\n", "\r\n"));
	assert.deepEqual(requiredEnv(root), ALL);
	// 바로 위 주석의 @optional·@required=false는 필수에서 뺀다(@optional=false는 필수). 빈 줄로 떨어진 주석은 그 변수의 것이 아니다
	const extra = `${SCHEMA}\n# @optional @sensitive @type=string\nTYPECAST_API_KEY=\n\n# @required=false\nFEATURE_FLAG=\n\n# @optional\n\nLATER_KEY=\n\n# @optional=false\nMUST_KEY=\n`;
	write("apps/web/.env.schema", extra);
	assert.deepEqual(requiredEnv(root), [...ALL, "LATER_KEY", "MUST_KEY"]);
	write("apps/web/.env.schema", extra.replaceAll("\n", "\r\n"));
	assert.deepEqual(requiredEnv(root), [...ALL, "LATER_KEY", "MUST_KEY"]);
});

test("사용법이 틀리거나 모르는 플래그면 Vercel을 부르지 않고 exit 1 (--check 오타가 배포가 되지 않게)", () => {
	const s = setup();
	for (const args of [[], ["staging"], ["develop", "extra"], ["production", "--chek"], ["develop", "--prod"], ["production", "-c"]]) {
		const r = s.exec(args);
		assert.equal(r.status, 1, args.join(" "));
		assert.match(r.stderr, /사용법/);
	}
	assert.deepEqual(s.calls(), []);
});

test("CLI 없음, 연결 안 됨, 로그인 안 됨은 exit 1. 토큰 환경은 VERCEL_ORG_ID·VERCEL_PROJECT_ID가 연결을 대신한다", () => {
	const noCli = setup({ stub: false }).exec(["develop"]);
	assert.equal(noCli.status, 1);
	assert.match(noCli.stderr, /Vercel CLI 없음/);
	const unlinked = setup({ linked: false });
	assert.match(unlinked.exec(["develop"]).stderr, /연결되지 않았다/);
	const r = unlinked.exec(["production", "--check"], { VERCEL_ORG_ID: "team_1", VERCEL_PROJECT_ID: "prj_1" });
	assert.equal(r.status, 0, r.stderr);
	const noLogin = setup().exec(["develop"], { STUB_WHOAMI_EXIT: "1" });
	assert.equal(noLogin.status, 1);
	assert.match(noLogin.stderr, /로그인 필요/);
});

test("production은 Vercel Git 자동 배포가 켜져 있거나 확인하지 못하면 준비 안 됨(push가 곧 production 배포). develop은 보지 않는다", () => {
	const s = setup();
	const link = { link: { type: "github", org: "o", repo: "r" } };
	const on = s.exec(["production", "--check"], { STUB_API: project(link) });
	assert.equal(on.status, 1);
	assert.match(on.stderr, /Git 자동 배포가 켜져 있다\(github o\/r: .*vercel git disconnect --yes/);
	assert.ok(s.calls().includes("vercel api /v9/projects/prj_1?teamId=team_1"));
	// Git 연결은 두고 push 배포만 끈 프로젝트는 통과한다
	const off = s.exec(["production", "--check"], {
		STUB_API: project({ ...link, gitProviderOptions: { createDeployments: "disabled" } }),
	});
	assert.equal(off.status, 0, off.stderr);
	for (const api of ["", '{"error":{"code":"forbidden"}}']) {
		const unknown = s.exec(["production", "--check"], { STUB_API: api });
		assert.equal(unknown.status, 1);
		assert.match(unknown.stderr, /Git 자동 배포 여부를 확인하지 못했다/);
	}
	assert.match(s.exec(["production", "--check"], { STUB_WHOAMI_EXIT: "1" }).stderr, /Git 자동 배포 여부도 확인하지 못했다/);
	assert.doesNotMatch(s.exec(["develop", "--check"], { STUB_WHOAMI_EXIT: "1" }).stderr, /Git 자동 배포/);
	const before = s.calls().length;
	assert.equal(s.exec(["develop", "--check"], { STUB_API: project(link) }).status, 0);
	assert.ok(!s.calls().slice(before).some((c) => c.startsWith("vercel api")));
	// 개인 계정(orgId가 team_이 아니다)은 teamId를 붙이지 않는다
	s.write(".vercel/project.json", '{"projectId":"prj_1","orgId":"user_1"}');
	assert.equal(s.exec(["production", "--check"]).status, 0);
	assert.ok(s.calls().includes("vercel api /v9/projects/prj_1"));
	// CLI처럼 VERCEL_ORG_ID·VERCEL_PROJECT_ID가 둘 다 있으면 .vercel/project.json보다 먼저 쓴다
	s.exec(["production", "--check"], { VERCEL_ORG_ID: "team_2", VERCEL_PROJECT_ID: "prj_2" });
	assert.ok(s.calls().includes("vercel api /v9/projects/prj_2?teamId=team_2"));
	const gitlab = s.exec(["production", "--check"], { STUB_API: project({ link: { type: "gitlab", projectNamespace: "g", projectName: "p" } }) });
	assert.match(gitlab.stderr, /Git 자동 배포가 켜져 있다\(gitlab g\/p: /);
});

test("production은 Git 검사 전에 멈춰도 Vercel 프로젝트가 있으면(연결한 기기, 릴리스 태그) Git 자동 배포를 모른다고 알린다", () => {
	const unsure = /Git 자동 배포 여부도 확인하지 못했다/;
	// 팀원 기기: .vercel이 없지만 릴리스한 적이 있다(production 배포가 있다)
	const unlinked = setup({ linked: false });
	assert.match(unlinked.exec(["production", "--check"]).stderr, unsure);
	assert.doesNotMatch(unlinked.exec(["develop", "--check"]).stderr, unsure);
	unlinked.git("tag", "-d", "v0.1.0");
	assert.match(unlinked.exec(["production", "--check"]).stderr, unsure, "태그를 받지 않은 clone도 커밋된 release/ 노트로 안다");
	unlinked.git("rm", "-rq", "release");
	unlinked.commit("drop release notes");
	const never = unlinked.exec(["production", "--check"]);
	assert.match(never.stderr, /연결되지 않았다/);
	assert.doesNotMatch(never.stderr, unsure, "릴리스한 적도 연결한 적도 없으면 Vercel 프로젝트가 없다");
	// 빈 release/ 폴더나 커밋하지 않은 노트는 릴리스 기록이 아니다(노트를 쓴 뒤 지운 기기)
	mkdirSync(join(unlinked.root, "release"));
	assert.doesNotMatch(unlinked.exec(["production", "--check"]).stderr, unsure, "빈 release/ 폴더");
	unlinked.write("release/20260928-1000-draft.md", "# v0.2.0 — Draft\n");
	assert.doesNotMatch(unlinked.exec(["production", "--check"]).stderr, unsure, "커밋하지 않은 노트");
	assert.match(setup({ stub: false }).exec(["production", "--check"]).stderr, /Vercel CLI 없음.*여부도 확인하지 못했다/);
	// 연결한 기기는 릴리스 전이라도 Vercel 프로젝트가 있다(link --yes가 Git을 연결했으면 push가 곧 배포다)
	const fresh = setup();
	fresh.git("tag", "-d", "v0.1.0");
	assert.match(fresh.exec(["production", "--check"], { STUB_WHOAMI_EXIT: "1" }).stderr, unsure);
	// 연결 파일이 깨져 프로젝트 id를 모르면 확인하지 못한 것으로 본다
	fresh.write(".vercel/project.json", "null");
	assert.match(fresh.exec(["production", "--check"]).stderr, /Git 자동 배포 여부를 확인하지 못했다/);
	assert.ok(!fresh.calls().some((c) => c.includes("/v9/projects/undefined")));
});

test("준비 검사: .vercelignore, 커밋 안 한 변경, 빠진 환경변수, 첫 배포 전 develop을 모두 알리고 배포하지 않는다", () => {
	const s = setup();
	s.write(".vercelignore", "node_modules\n");
	s.commit("ignore");
	s.write("apps/web/src/page.tsx", "x\n");
	// 브랜치 전용 Preview 변수는 브랜치 없는 배포에 쓰이지 않으므로 없는 것으로 센다
	const preview = JSON.stringify({ envs: [{ key: "BETTER_AUTH_URL" }, { key: "DATABASE_URL", gitBranch: "feat/x" }] });
	const r = s.exec(["develop"], { STUB_ENV_preview: preview, STUB_LS_production: "" });
	assert.equal(r.status, 1);
	assert.match(r.stderr, /\.vercelignore에 `\.env` 줄이 없다/);
	assert.match(r.stderr, /커밋하지 않은 변경/);
	assert.match(r.stderr, /preview 환경변수 없음: BETTER_AUTH_SECRET, DATABASE_URL/);
	assert.match(r.stderr, /production 배포가 아직 없다/);
	assert.ok(!s.calls().some((c) => c.startsWith("vercel deploy")));
});

test("production은 기본 브랜치에서만, BETTER_AUTH_URL은 스키마와 상관없이 필요하고 config로 읽혀야 한다", () => {
	const s = setup();
	s.git("checkout", "-qb", "feat/x");
	assert.match(s.exec(["production"]).stderr, /기본 브랜치\(main\)에서만/);
	s.git("checkout", "-q", "main");
	const r = s.exec(["production"], { STUB_URL_production: "" });
	assert.equal(r.status, 1);
	assert.match(r.stderr, /BETTER_AUTH_URL을 읽지 못했다.*--type config/);
	s.write("apps/web/.env.schema", "DATABASE_URL=\n");
	s.commit("schema");
	assert.match(s.exec(["production"], { STUB_ENV_production: envs(["DATABASE_URL"]) }).stderr, /환경변수 없음: BETTER_AUTH_URL/);
});

test("production은 릴리스한 커밋만: origin의 vX.Y.Z 태그가 HEAD를 가리키고 그 GitHub Release가 있어야 한다. develop은 보지 않는다", () => {
	const s = setup();
	s.write("release/20260928-1000-second.md", "# v0.2.0 — Second\n");
	s.commit("feat: 새 기능");
	const none = s.exec(["production", "--check"]);
	assert.equal(none.status, 1);
	assert.match(none.stderr, /HEAD에 릴리스 태그\(vX\.Y\.Z\)가 없다.*pnpm release/);
	assert.equal(s.exec(["develop", "--check"]).status, 0);
	assert.ok(!s.calls().some((c) => c.startsWith("gh ")), "develop은 릴리스를 보지 않는다");
	// 로컬 태그만 있고 push하지 않았다
	s.git("tag", "-a", "v0.1.1", "-m", "v0.1.1");
	s.git("tag", "-a", "v0.2.0", "-m", "v0.2.0 — Second");
	assert.match(s.exec(["production", "--check"]).stderr, /origin의 태그 v0\.2\.0가 HEAD를 가리키지 않는다/);
	s.git("push", "-q", "origin", "main", "v0.2.0");
	const noRelease = s.exec(["production", "--check"], { STUB_GH_EXIT: "1" });
	assert.equal(noRelease.status, 1);
	assert.match(noRelease.stderr, /GitHub Release v0\.2\.0를 확인하지 못했다.*tail -n \+2 release\/20260928-1000-second\.md \| gh release create v0\.2\.0 -R o\/r --verify-tag --title 'v0\.2\.0 — Second' --notes-file -/);
	const ok = s.exec(["production", "--check"]);
	assert.equal(ok.status, 0, ok.stderr);
	assert.match(ok.stdout, /커밋 [0-9a-f]+, 릴리스 v0\.2\.0\)/);
	assert.ok(s.calls().includes("gh release view v0.2.0 -R o/r --json tagName"), "같은 커밋의 태그 중 가장 높은 버전, origin 저장소");
	// 로컬에서 태그를 새 커밋으로 옮겨도 origin의 태그는 그대로다
	s.write("apps/web/src/page.tsx", "y\n");
	s.commit("fix: 릴리스 안 한 수정");
	s.git("tag", "-f", "-a", "v0.2.0", "-m", "v0.2.0 — Second");
	assert.match(s.exec(["production", "--check"]).stderr, /origin의 태그 v0\.2\.0가 HEAD를 가리키지 않는다/);
	// GitHub가 아닌 origin
	s.git("remote", "set-url", "origin", "https://gitlab.com/o/r.git");
	assert.match(s.exec(["production", "--check"]).stderr, /origin이 GitHub 저장소가 아니다/);
});

test("로컬 BETTER_AUTH_URL은 Vercel 값을 가리지 못한다: 실행 환경 값은 떼고, 루트 .env 파일에 있으면 멈춘다", () => {
	const s = setup();
	// vercel env run은 실행 환경 값을 먼저 쓴다. 스크립트가 떼지 않으면 운영 도메인에 develop alias가 붙는다
	const r = s.exec(["develop", "--check"], { BETTER_AUTH_URL: "https://app.vercel.app" });
	assert.equal(r.status, 0, r.stderr);
	assert.match(r.stdout, /develop → https:\/\/app-develop\.vercel\.app/);
	s.write(".env.local", "BETTER_AUTH_URL=http://localhost:3001\n");
	const local = s.exec(["develop", "--check"]);
	assert.equal(local.status, 1);
	assert.match(local.stderr, /루트 \.env\.local에 BETTER_AUTH_URL이 있다/);
});

test("develop 주소가 production 주소와 같으면 멈춘다(alias가 운영 도메인을 Preview로 바꾸지 않게)", () => {
	const r = setup().exec(["develop"], { STUB_URL_preview: "https://app.vercel.app" });
	assert.equal(r.status, 1);
	assert.match(r.stderr, /Preview BETTER_AUTH_URL이 production과 같다\(app\.vercel\.app\)/);
});

test("--check: 지난 배포 커밋 이후 새로 생긴 마이그레이션 폴더만 센다(한글 이름 포함, 삭제는 제외)", () => {
	const s = setup();
	s.write("packages/db/src/migrations/20260901000000_old/migration.sql", "select 1;\n");
	const prev = s.commit("old");
	s.write("packages/db/src/migrations/20260927000000_todo/migration.sql", "create table todo();\n");
	s.write("packages/db/src/migrations/20260927000000_todo/snapshot.json", "{}\n");
	s.write("packages/db/src/migrations/20260927000001_할일/migration.sql", "select 1;\n");
	s.write("packages/db/src/migrations/.gitkeep", "");
	s.git("rm", "-rq", "packages/db/src/migrations/20260901000000_old");
	s.commit("todo");
	const r = s.exec(["develop", "--check"], prevAt("preview", prev));
	assert.equal(r.status, 0, r.stderr);
	assert.match(r.stdout, /준비됨: develop → https:\/\/app-develop\.vercel\.app/);
	assert.match(r.stdout, /새 마이그레이션 2개: 20260927000000_todo, 20260927000001_할일$/m);
	assert.ok(!s.calls().some((c) => c.startsWith("vercel deploy")));
	// 지난 배포가 없으면 전체 적용을 안내한다
	assert.match(s.exec(["develop", "--check"]).stdout, /지난 배포 기록 없음/);
});

test("지난 배포 커밋이 로컬에 없거나 HEAD의 조상이 아니면 production은 멈추고 develop은 알린다", () => {
	const s = setup();
	const missing = "0123456789abcdef0123456789abcdef01234567";
	const gone = s.exec(["production", "--check"], prevAt("production", missing));
	assert.equal(gone.status, 1);
	assert.match(gone.stderr, /0123456이 로컬에 없다/);
	assert.match(s.exec(["develop", "--check"], prevAt("preview", missing)).stdout, /0123456이 로컬에 없다/);
	s.git("checkout", "-qb", "side");
	s.write("side.txt");
	const side = s.commit("side");
	s.git("checkout", "-q", "main");
	const prod = s.exec(["production", "--check"], prevAt("production", side));
	assert.equal(prod.status, 1);
	assert.match(prod.stderr, /HEAD의 조상이 아니다/);
	assert.match(s.exec(["develop", "--check"], prevAt("preview", side)).stdout, /조상이 아니다: 대상 DB에 다른 브랜치의 마이그레이션/);
});

test("develop: Preview로 배포하고 BETTER_AUTH_URL 호스트에 alias를 붙인다", () => {
	const s = setup();
	const r = s.exec(["develop"], {
		...prevAt("preview", ""),
		// 실제 CLI는 Preview 배포의 target을 null로 준다
		STUB_DEPLOY: deployed(null),
		STUB_AFTER: JSON.stringify({ url: "app-new-team.vercel.app" }),
	});
	assert.equal(r.status, 0, r.stderr);
	const calls = s.calls();
	assert.ok(calls.includes("vercel deploy --yes --format json"));
	assert.ok(calls.includes("vercel alias set https://app-new-team.vercel.app app-develop.vercel.app"));
	assert.ok(calls.includes("vercel inspect app-develop.vercel.app --format json"));
	assert.match(r.stdout, /되돌리기: vercel alias set app-prev-team\.vercel\.app app-develop\.vercel\.app/);
	assert.doesNotMatch(r.stderr, /경고/);
});

test("production: --prod로 배포하고 alias는 붙이지 않는다. 주소가 새 배포를 가리키지 않으면 경고한다", () => {
	const s = setup();
	const r = s.exec(["production"], {
		...prevAt("production", ""),
		STUB_DEPLOY: deployed("production"),
		STUB_AFTER: JSON.stringify({ url: "app-prev-team.vercel.app" }),
	});
	assert.equal(r.status, 0, r.stderr);
	assert.ok(s.calls().includes("vercel deploy --yes --format json --prod"));
	assert.ok(!s.calls().some((c) => c.startsWith("vercel alias")));
	assert.match(r.stderr, /경고: app\.vercel\.app가 이 배포를 가리키지 않는다\(지금 app-prev-team\.vercel\.app\).*vercel promote/);
	assert.match(r.stdout, /되돌리기: vercel rollback app-prev-team\.vercel\.app/);
});

test("배포 실패, 대상 불일치, alias 실패는 exit 2", () => {
	assert.equal(setup().exec(["develop"], { STUB_DEPLOY: "", STUB_DEPLOY_EXIT: "1" }).status, 2);
	const mismatch = setup().exec(["develop"], { STUB_DEPLOY: deployed("production") });
	assert.equal(mismatch.status, 2);
	assert.match(mismatch.stderr, /배포 대상이 다르다.*vercel rollback/);
	const alias = setup().exec(["develop"], { STUB_DEPLOY: deployed(null), STUB_ALIAS_EXIT: "1" });
	assert.equal(alias.status, 2);
	assert.match(alias.stderr, /alias 실패: app-develop\.vercel\.app/);
});
