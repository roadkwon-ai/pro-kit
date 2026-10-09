#!/usr/bin/env node
// 릴리스: 다음 버전을 정해 release/에 노트를 쓰고, 검수한 노트로 버전 커밋·태그·push·GitHub Release를 만든다. `pnpm release`가 부른다.
// production 배포는 릴리스한 커밋(HEAD의 vX.Y.Z 태그와 그 GitHub Release)만 한다. scripts/vercel-deploy.mjs가 검사하고, 절차는 prokit-deploy 스킬의 릴리스 절에 있다.
// 사용법:
//   node scripts/release.mjs [--title "<영어 제목>"] [--minor]  마지막 vX.Y.Z 태그 이후 커밋으로 다음 버전을 정하고(기본 patch, --minor면 minor) release/<YYYYMMDD-HHmm>-<제목>.md를 쓴다. 커밋하지 않는다.
//   node scripts/release.mjs --publish <노트 파일>    기본 브랜치에서 package.json version을 올려 노트와 함께 커밋하고, 태그를 달아 push한 뒤 GitHub Release를 만든다.
// 버전(SemVer, 정본은 git 태그): 첫 릴리스 0.1.0, 기본 patch(feat 포함), --minor를 주면 minor(큰 묶음일 때 사용자가 정한다), `!`나 본문의 BREAKING CHANGE:는 0.x 동안 minor, 1.0 이상이면 major. 1.0.0은 사용자가 정할 때만 만든다.
// exit: 0 정상, 1 준비 안 됨·사용법 오류·커밋이나 push 실패(되돌림), 2 GitHub Release 실패(태그는 push됨. 출력한 명령으로 다시 만든다)
import { execFileSync, spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	realpathSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const fail = (msg) => {
	console.error(msg);
	return 1;
};
// 원격 git 호출 옵션. 에이전트 세션에는 터미널이 없으므로 자격 증명·ssh 확인을 묻지 않고 실패하게 한다.
// 조회(fetch, ls-remote)는 timeout으로 30초 뒤 넘어간다. scripts/vercel-deploy.mjs도 가져다 쓴다.
// GIT_SSH_COMMAND는 사용자가 정해 두었으면 그 값을 쓴다.
export const NET_ENV = {
	GIT_SSH_COMMAND: "ssh -o BatchMode=yes",
	...process.env,
	GIT_TERMINAL_PROMPT: "0",
};
// origin URL(https·ssh)에서 GitHub owner/repo.
export const githubRepo = (url) =>
	url.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?\/?$/)?.[1] ?? null;
// 출력하는 명령을 그대로 복사해 실행할 수 있게 인자를 감싼다. scripts/vercel-deploy.mjs도 가져다 쓴다.
export const sh = (s) =>
	/^[\w./:@=-]+$/.test(s) ? s : `'${s.replaceAll("'", "'\\''")}'`;

// 커밋 종류 → 노트 절 제목. 목록 순서가 노트와 자동 제목의 순서다. 나머지 종류는 Maintenance.
const SECTIONS = [
	["feat", "Features"],
	["fix", "Fixes"],
	["perf", "Performance"],
	["refactor", "Refactoring"],
	["docs", "Docs"],
	["test", "Tests"],
];
const OTHER = "Maintenance";
const sectionOf = (c) => SECTIONS.find(([t]) => t === c.type)?.[1] ?? OTHER;
const ORDER = [...SECTIONS.map(([, s]) => s), OTHER];
// 릴리스 버전을 적는 파일. 없는 파일은 건너뛴다.
const VERSION_FILES = ["package.json", "apps/web/package.json"];

export function parseCommits(log) {
	return log
		.split("\x1e")
		.map((r) => r.trim())
		.filter(Boolean)
		.map((r) => {
			const [sha, parents, subject, body = ""] = r.split("\x1f");
			const m = subject.match(/^(\w+)(?:\([^)]*\))?(!)?:\s*(.+)$/);
			return {
				sha,
				merge: parents.trim().split(/\s+/).length > 1,
				subject,
				body,
				type: m?.[1] ?? null,
				text: m ? m[3] : subject,
				breaking: Boolean(m?.[2]) || /^BREAKING[ -]CHANGE:/m.test(body),
			};
		})
		.filter((c) => !c.subject.startsWith("chore(release):"));
}

// 기본은 patch(feat 포함). minor는 큰 묶음일 때 사용자가 정해 --minor로 준다.
export function nextVersion(
	prevTag,
	commits,
	{ minor: bumpMinor = false } = {},
) {
	if (!prevTag) return "0.1.0";
	const [major, minor, patch] = prevTag
		.replace(/^v/, "")
		.split(".")
		.map(Number);
	// 0.x 동안 깨지는 변경은 minor로 올린다. 1.0.0은 따로 정한다.
	if (commits.some((c) => c.breaking))
		return major === 0 ? `0.${minor + 1}.0` : `${major + 1}.0.0`;
	if (bumpMinor) return `${major}.${minor + 1}.0`;
	return `${major}.${minor}.${patch + 1}`;
}

export const slug = (s) =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+/, "")
		.slice(0, 60)
		.replace(/-+$/, "");

// --title이 없을 때 쓰는 제목. 커밋 종류로 만든다.
export function releaseTitle(commits) {
	const labels = ORDER.filter((s) => commits.some((c) => sectionOf(c) === s));
	if (labels.length === 0) return "Maintenance update";
	return labels.length === 1
		? `${labels[0]} update`
		: `${labels[0]} and ${labels[1].toLowerCase()} update`;
}

// 년월일-시분(KST). 예: 20260728-1638
export function stamp(date) {
	const p = Object.fromEntries(
		new Intl.DateTimeFormat("en-CA", {
			timeZone: "Asia/Seoul",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hourCycle: "h23",
		})
			.formatToParts(date)
			.map((x) => [x.type, x.value]),
	);
	return `${p.year}${p.month}${p.day}-${p.hour}${p.minute}`;
}

export function renderNote({ version, prevTag, title, date, commits, repo }) {
	const s = stamp(date);
	const lines = [
		`# v${version} — ${title}`,
		"",
		`- 날짜: ${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)} ${s.slice(9, 11)}:${s.slice(11)} (KST)`,
		`- 이전 버전: ${prevTag ?? "없음 (첫 릴리스)"}`,
		...(repo && prevTag
			? [
					`- 전체 변경: https://github.com/${repo}/compare/${prevTag}...v${version}`,
				]
			: []),
	];
	for (const section of ORDER) {
		const items = commits.filter((c) => sectionOf(c) === section);
		if (items.length === 0) continue;
		lines.push("", `## ${section}`, "");
		for (const c of items) {
			lines.push(
				`- ${c.breaking ? "**BREAKING** " : ""}${c.text} (\`${c.sha.slice(0, 7)}\`)`,
			);
			// 본문의 bullet만 옮긴다. 들여쓴 다음 줄은 줄바꿈된 같은 bullet이다.
			let inBullet = false;
			for (const b of c.body.split("\n")) {
				if (/^- /.test(b)) lines.push(`  ${b.trimEnd()}`);
				else if (inBullet && /^\s+\S/.test(b))
					lines[lines.length - 1] += ` ${b.trim()}`;
				inBullet = /^- /.test(b) || (inBullet && /^\s+\S/.test(b));
			}
		}
	}
	return `${lines.join("\n")}\n`;
}

// package.json의 version을 바꾼다. 없으면 name 바로 뒤에 넣는다. 들여쓰기는 파일을 따른다.
export function setVersion(text, version) {
	const { name, version: _old, ...rest } = JSON.parse(text);
	const indent = text.match(/^([ \t]+)"/m)?.[1] ?? "\t";
	const pkg =
		name === undefined ? { version, ...rest } : { name, version, ...rest };
	return `${JSON.stringify(pkg, null, indent)}\n`;
}

export function main(argv, root = process.cwd()) {
	let values;
	try {
		({ values } = parseArgs({
			args: argv,
			options: {
				title: { type: "string" },
				publish: { type: "string" },
				minor: { type: "boolean" },
			},
		}));
	} catch (e) {
		return fail(
			`사용법: pnpm release [--title "<영어 제목>"] [--minor] 또는 pnpm release --publish <노트 파일> (${e.message})`,
		);
	}
	const git = (...args) =>
		execFileSync("git", args, {
			cwd: root,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		}).trim();
	let origin = "";
	try {
		origin = git("config", "--get", "remote.origin.url");
	} catch {}
	const repo = githubRepo(origin);
	// 다른 곳에서 먼저 만든 릴리스 태그를 받아 같은 버전을 다시 만들지 않게 한다. 오프라인이면 받지 못한 채 계속한다.
	if (origin)
		spawnSync("git", ["fetch", "--quiet", "--tags", "origin"], {
			cwd: root,
			env: NET_ENV,
			timeout: 30000,
		});
	let prevTag = null;
	try {
		prevTag = git("describe", "--tags", "--abbrev=0", "--match", "v[0-9]*");
	} catch {}
	const all = parseCommits(
		git(
			"log",
			"--format=%H%x1f%P%x1f%s%x1f%b%x1e",
			prevTag ? `${prevTag}..HEAD` : "HEAD",
		),
	);
	// 머지 커밋은 빼고 머지된 커밋을 적는다. 머지 커밋만 늘었으면 그 머지를 적는다(릴리스 없이 배포가 막히지 않게).
	const plain = all.filter((c) => !c.merge);
	const commits = plain.length ? plain : all;
	if (values.publish !== undefined)
		return publish({ root, git, file: values.publish, prevTag, commits, repo });
	if (commits.length === 0) {
		console.log(`릴리스할 커밋이 없다 (마지막 태그 ${prevTag ?? "없음"})`);
		return 0;
	}
	const title = values.title?.trim() || releaseTitle(commits);
	if (!slug(title)) return fail(`--title은 영어로 쓴다 (${title})`);
	const version = nextVersion(prevTag, commits, { minor: values.minor });
	const date = new Date();
	let file = join("release", `${stamp(date)}-${slug(title)}.md`);
	if (existsSync(join(root, file)))
		file = file.replace(/\.md$/, `-v${version}.md`);
	mkdirSync(join(root, "release"), { recursive: true });
	writeFileSync(
		join(root, file),
		renderNote({ version, prevTag, title, date, commits, repo }),
	);
	console.log(
		`v${version} — ${title} → ${file}\n노트를 검수한 뒤: pnpm release --publish ${file}`,
	);
	return 0;
}

function publish({ root, git, file, prevTag, commits, repo }) {
	let defaultBranch = "main";
	try {
		defaultBranch =
			JSON.parse(readFileSync(join(root, ".dev-cycle.json"), "utf8"))
				.defaultBranch || "main";
	} catch {}
	const branch = git("rev-parse", "--abbrev-ref", "HEAD");
	if (branch !== defaultBranch)
		return fail(`기본 브랜치(${defaultBranch})에서 실행한다 (현재 ${branch})`);
	if (git("status", "--porcelain", "--untracked-files=no"))
		return fail("커밋하지 않은 변경이 있다. 커밋하거나 치운 뒤 실행한다");
	const path = resolve(root, file);
	const rel = relative(root, path);
	if (dirname(rel) !== "release" || !rel.endsWith(".md"))
		return fail(`노트는 release/ 아래 .md 파일이어야 한다: ${file}`);
	const note = existsSync(path) ? readFileSync(path, "utf8") : "";
	const [, tag, title] = note.match(/^# (v\S+) — (.+)/) ?? [];
	if (!tag)
		return fail(`노트가 없거나 첫 줄이 "# vX.Y.Z — 제목"이 아니다: ${file}`);
	// 노트를 쓴 뒤 커밋이 늘었거나, 검수하다 커밋 해시를 지웠으면 노트가 실제 릴리스와 어긋난다.
	if (
		commits.length === 0 ||
		![false, true].some(
			(minor) => tag === `v${nextVersion(prevTag, commits, { minor })}`,
		) ||
		commits.some((c) => !note.includes(c.sha.slice(0, 7)))
	)
		return fail(
			"노트가 마지막 태그 이후 커밋과 맞지 않는다. 노트를 지우고 다시 만든다",
		);
	// push한 뒤 Release를 만들지 못하면 태그만 남는다. GitHub 원격과 gh 로그인을 커밋 전에 확인한다.
	if (!repo)
		return fail(
			"origin이 GitHub 저장소가 아니다(GitHub Release를 만들 수 없다) → 사용자가 GitHub 원격을 연결한다",
		);
	if (spawnSync("gh", ["auth", "status"], { cwd: root }).status !== 0)
		return fail(
			"gh CLI가 없거나 로그인되지 않았다 → 사용자가 gh auth login을 실행한다",
		);
	// 같은 태그가 있으면 다른 곳에서 먼저 릴리스했다(fetch로 받은 태그 포함). 커밋을 만들기 전에 멈춘다.
	if (
		spawnSync("git", ["rev-parse", "-q", "--verify", `refs/tags/${tag}`], {
			cwd: root,
		}).status === 0
	)
		return fail(
			`태그 ${tag}가 이미 있다(다른 곳에서 먼저 릴리스했다) → git pull로 기본 브랜치를 최신으로 맞추고 노트를 지운 뒤 다시 만든다`,
		);
	const versioned = VERSION_FILES.filter((f) => existsSync(join(root, f)));
	let committed = false;
	let tagged = false;
	// mixed reset이라 검수한 노트는 추적하지 않는 파일로 남는다. 올린 version은 되돌린다.
	const undo = () => {
		if (tagged) git("tag", "-d", tag);
		git("reset", "-q", ...(committed ? ["HEAD~1"] : []));
		if (versioned.length) git("checkout", "--", ...versioned);
	};
	try {
		for (const f of versioned)
			writeFileSync(
				join(root, f),
				setVersion(readFileSync(join(root, f), "utf8"), tag.slice(1)),
			);
		git("add", rel, ...versioned);
		git("commit", "-q", "-m", `chore(release): ${tag}`);
		committed = true;
		git("tag", "-a", tag, "-m", `${tag} — ${title}`);
		tagged = true;
	} catch (e) {
		undo();
		return fail(
			`릴리스 커밋이나 태그를 만들지 못해 되돌렸다: ${e.stderr?.trim() || e.message}`,
		);
	}
	const push = spawnSync(
		"git",
		["push", "--atomic", "origin", defaultBranch, tag],
		{ cwd: root, stdio: "inherit", env: NET_ENV },
	);
	if (push.status !== 0) {
		undo();
		return fail(
			"push에 실패해 릴리스 커밋과 태그를 되돌렸다. 원격을 확인하고(git pull 등) 다시 --publish 한다",
		);
	}
	// -R: 원격이 여럿이면 gh가 origin이 아닌 upstream 등을 고를 수 있다.
	// 노트 첫 줄(# vX.Y.Z — 제목)은 Release 제목과 같아 본문에서 뺀다. 그대로 두면 제목이 두 번 보인다.
	const args = [
		"release",
		"create",
		tag,
		"-R",
		repo,
		"--verify-tag",
		"--title",
		`${tag} — ${title}`,
		"--notes-file",
		"-",
	];
	const gh = spawnSync("gh", args, {
		cwd: root,
		stdio: ["pipe", "inherit", "inherit"],
		input: note.slice(note.indexOf("\n") + 1),
	});
	if (gh.status !== 0) {
		console.error(
			`GitHub Release를 만들지 못했다(태그 ${tag}는 push됨). 원인을 해결하고 다시 만든다: tail -n +2 ${sh(rel)} | gh ${args.map(sh).join(" ")}`,
		);
		return 2;
	}
	console.log(
		`${tag} — ${title} 릴리스 완료. 다음: pnpm vercel:deploy production --check (prokit-deploy 배포 순서)`,
	);
	return 0;
}

// 실재 경로로 비교한다. 심볼릭 링크 경로(macOS /tmp 등)로 실행하면 argv와 import.meta.url이 달라진다.
const isMain = () => {
	try {
		return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
	} catch {
		return false;
	}
};
if (isMain()) process.exitCode = main(process.argv.slice(2));
