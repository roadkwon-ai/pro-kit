import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { applyPack } from "./apply-pack.mjs";

const sha = (s) => createHash("sha256").update(s).digest("hex");
function fixture(t, files = { "apps/web/page.tsx": "new page" }) {
	const root = mkdtempSync(join(tmpdir(), "apply-pack-"));
	t.after(() => rmSync(root, { recursive: true, force: true }));
	const pack = join(root, "pack");
	const project = join(root, "project");
	mkdirSync(project);
	mkdirSync(join(pack, "source"), { recursive: true });
	const put = (base, p, text) => {
		mkdirSync(join(base, p, ".."), { recursive: true });
		writeFileSync(join(base, p), text);
	};
	const entries = Object.entries(files).map(([path, body]) => {
		put(join(pack, "source"), path, body);
		return { path, sha256: sha(body) };
	});
	const manifest = {
		schemaVersion: 1,
		slug: "sample",
		routes: [{ path: "/", title: "Home" }],
		compatibility: {
			template: "prokit-next-neon",
			nextMajor: 16,
			pnpmMajor: 12,
			screenOnly: true,
		},
		settings: { locales: ["ko", "en"], themes: ["system", "light", "dark"] },
		baselines: [
			{
				id: "home",
				route: "/",
				viewport: { width: 1440, height: 900 },
				locale: "ko",
				theme: "light",
				prepare: [],
				screenshot: "shots/home.png",
				checks: ["layout"],
				allowedDifferences: [],
			},
		],
		customization: [{ path: Object.keys(files)[0], fields: ["title"] }],
		sourceManifest: "source-manifest.json",
		removedFiles: "removed-files.json",
		productFingerprint: sha(
			[...entries]
				.sort((a, b) => (a.path < b.path ? -1 : 1))
				.map((e) => `${e.path}\0${e.sha256}\n`)
				.join(""),
		),
		scaffoldFiles: {},
	};
	const save = () => {
		put(pack, "preset-manifest.json", JSON.stringify(manifest));
		put(pack, "source-manifest.json", JSON.stringify(entries));
	};
	save();
	put(pack, "shots/home.png", "image");
	put(pack, "removed-files.json", "[]");
	return { pack, project, put, manifest, entries, save };
}
test("fresh apply, dry run and repeat preserve exact source and unrelated env", (t) => {
	const f = fixture(t);
	f.put(f.project, ".env.local", "secret");
	assert.equal(applyPack({ ...f, check: true }).writes.length, 1);
	assert.equal(existsSync(join(f.project, "apps")), false);
	applyPack(f);
	assert.equal(
		readFileSync(join(f.project, "apps/web/page.tsx"), "utf8"),
		"new page",
	);
	assert.equal(applyPack(f).writes.length, 0);
	assert.equal(readFileSync(join(f.project, ".env.local"), "utf8"), "secret");
});
test("modified user file blocks every write", (t) => {
	const f = fixture(t, { a: "A", b: "B" });
	f.put(f.project, "b", "user");
	assert.throws(() => applyPack(f), /충돌/);
	assert.equal(existsSync(join(f.project, "a")), false);
});
test("scaffold hash permits replacement and deletion, changed deletion blocks all", (t) => {
	const f = fixture(t, { a: "A" });
	f.put(f.project, "a", "default");
	f.put(f.project, "old", "changed");
	f.manifest.scaffoldFiles = { a: sha("default"), old: sha("old") };
	f.save();
	f.put(f.pack, "removed-files.json", '["old"]');
	assert.throws(() => applyPack(f), /충돌/);
	assert.equal(readFileSync(join(f.project, "a"), "utf8"), "default");
	f.put(f.project, "old", "old");
	applyPack(f);
	assert.equal(existsSync(join(f.project, "old")), false);
});
test("tampered bytes and fingerprint fail before changes", (t) => {
	const f = fixture(t);
	f.put(join(f.pack, "source"), "apps/web/page.tsx", "tampered");
	assert.throws(() => applyPack(f), /sha256/);
	f.put(join(f.pack, "source"), "apps/web/page.tsx", "new page");
	f.manifest.productFingerprint = "0".repeat(64);
	f.save();
	assert.throws(() => applyPack(f), /fingerprint/);
});
test("unsafe path, duplicate and protected paths rejected", (t) => {
	const f = fixture(t);
	for (const path of [
		"../escape",
		"/absolute",
		"a/../../escape",
		"a\\b",
		".env.local",
		"apps/web/.env.schema",
		"AGENTS.md",
		".agents/skills/x",
		"tasks/todo.md",
	]) {
		f.entries[0].path = path;
		f.save();
		assert.throws(() => applyPack(f));
	}
	f.entries[0].path = "apps/web/page.tsx";
	f.entries.push({ ...f.entries[0] });
	f.save();
	assert.throws(() => applyPack(f), /중복/);
});
test("symlink source, target ancestor and metadata rejected", (t) => {
	const f = fixture(t);
	rmSync(join(f.pack, "source/apps/web/page.tsx"));
	symlinkSync("/etc/hosts", join(f.pack, "source/apps/web/page.tsx"));
	assert.throws(() => applyPack(f), /링크/);
	rmSync(join(f.pack, "source/apps/web/page.tsx"));
	f.put(join(f.pack, "source"), "apps/web/page.tsx", "new page");
	symlinkSync("/tmp", join(f.project, "apps"));
	assert.throws(() => applyPack(f), /링크/);
	rmSync(join(f.project, "apps"));
	rmSync(join(f.pack, "removed-files.json"));
	symlinkSync("/etc/hosts", join(f.pack, "removed-files.json"));
	assert.throws(() => applyPack(f), /링크/);
});
test("unsupported schema fails; legacy still verifies and restores", (t) => {
	const f = fixture(t);
	f.manifest.schemaVersion = 2;
	f.save();
	assert.throws(() => applyPack(f), /schemaVersion/);
	rmSync(join(f.pack, "preset-manifest.json"));
	assert.equal(applyPack(f).qualityBaseline, "legacy-unverified");
});
test("unlisted source and file-directory collisions are rejected before changes", (t) => {
	const f = fixture(t, { a: "A", "dir/b": "B" });
	f.put(join(f.pack, "source"), "extra", "X");
	assert.throws(() => applyPack(f), /목록/);
	rmSync(join(f.pack, "source/extra"));
	f.put(f.project, "dir", "existing");
	assert.throws(() => applyPack(f));
	assert.equal(existsSync(join(f.project, "a")), false);
});

test("protected deletes, unknown schema, metadata shape and aliases fail closed", (t) => {
	const f = fixture(t);
	f.put(f.pack, "removed-files.json", '[".env.local"]');
	assert.throws(() => applyPack(f), /보호/);
	f.put(f.pack, "removed-files.json", "[]");
	f.put(f.pack, "preset-manifest.json", "null");
	assert.throws(() => applyPack(f), /객체/);
	f.save();
	f.entries.push({ path: "APPS/web/page.tsx", sha256: sha("new page") });
	f.save();
	assert.throws(() => applyPack(f), /중복/);
});
test("new nested project is not created by dry-run and is created by apply", (t) => {
	const f = fixture(t);
	const project = join(f.project, "nested/app");
	applyPack({ ...f, project, check: true });
	assert.equal(existsSync(project), false);
	applyPack({ ...f, project });
	assert.equal(
		readFileSync(join(project, "apps/web/page.tsx"), "utf8"),
		"new page",
	);
});

test("incomplete or invalid v1 cannot write any source", (t) => {
	const mutations = [
		(m) => delete m.routes,
		(m) => delete m.compatibility,
		(m) => delete m.settings,
		(m) => delete m.baselines,
		(m) => delete m.customization,
		(m) => m.routes.push({ ...m.routes[0] }),
		(m) => (m.routes[0].path = "/../escape"),
		(m) => (m.settings.locales = ["fr"]),
		(m) => (m.settings.themes = ["sepia"]),
		(m) => m.baselines.push({ ...m.baselines[0] }),
		(m) => (m.baselines[0].route = "/missing"),
		(m) => (m.baselines[0].screenshot = "../outside"),
		(m) => (m.baselines[0].viewport.width = 0),
		(m) => (m.customization[0].path = "../outside"),
		(m) => m.customization.push({ ...m.customization[0] }),
		(m) => (m.compatibility.nextMajor = "16"),
	];
	for (const mutate of mutations) {
		const f = fixture(t);
		mutate(f.manifest);
		f.save();
		assert.throws(() => applyPack(f));
		assert.equal(existsSync(join(f.project, "apps")), false);
	}
});
test("missing baseline fails; actual screenshot hash is reported", (t) => {
	const f = fixture(t);
	rmSync(join(f.pack, "shots/home.png"));
	assert.throws(() => applyPack(f), /baseline/);
	assert.equal(existsSync(join(f.project, "apps")), false);
	f.put(f.pack, "shots/home.png", "image");
	const result = applyPack({ ...f, check: true });
	assert.equal(result.baselines[0].sha256, sha("image"));
	assert.equal(result.compatibility.status, "unknown");
});
test("known target version or template mismatch blocks writes", (t) => {
	for (const [path, content] of [
		["package.json", { packageManager: "pnpm@11.0.0" }],
		["apps/web/package.json", { dependencies: { next: "^15.4.0" } }],
		[".dev-cycle.json", { template: "prokit-next-supabase" }],
	]) {
		const f = fixture(t);
		f.put(f.project, path, JSON.stringify(content));
		assert.throws(() => applyPack(f), /호환/);
		assert.equal(existsSync(join(f.project, "apps/web/page.tsx")), false);
	}
});
test("matching target compatibility is reported without running package scripts", (t) => {
	const f = fixture(t);
	f.put(
		f.project,
		"package.json",
		JSON.stringify({
			packageManager: "pnpm@12.10.1",
			scripts: { postinstall: "exit 1" },
		}),
	);
	f.put(
		f.project,
		"apps/web/package.json",
		JSON.stringify({ dependencies: { next: "~16.4.0" } }),
	);
	f.put(
		f.project,
		".dev-cycle.json",
		JSON.stringify({ template: "prokit-next-neon" }),
	);
	const result = applyPack(f);
	assert.equal(result.compatibility.status, "matched");
	assert.deepEqual(result.supported.settings, f.manifest.settings);
});

test("baseline declared hash and explicit target instruction are checked", (t) => {
	const f = fixture(t);
	f.manifest.baselines[0].screenshotSha256 = sha("wrong");
	f.save();
	assert.throws(() => applyPack(f), /screenshotSha256/);
	assert.equal(existsSync(join(f.project, "apps")), false);
	f.manifest.baselines[0].screenshotSha256 = sha("image");
	f.save();
	f.put(f.project, "AGENTS.md", "> 템플릿: `prokit-next-supabase`\n");
	assert.throws(() => applyPack(f), /호환/);
});

test("actual protected source files cannot overwrite harness under case aliases", (t) => {
	for (const path of [
		"AGENTS.md",
		"agents.md",
		"CLAUDE.md",
		"TASKS/todo.md",
		"Scripts/dev-cycle.mjs",
	]) {
		const f = fixture(t, { [path]: "injected" });
		assert.throws(() => applyPack(f), /보호/);
		assert.equal(existsSync(join(f.project, path)), false);
	}
});
