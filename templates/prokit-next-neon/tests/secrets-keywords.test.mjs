import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import test from "node:test";
import { makeRepo, TEMPLATE_FILES } from "./helpers.mjs";

const keyword = "erilog-sk-prompt-state-selector";
const key = `sk-${"A".repeat(24)}`;

for (const [name, content, status] of [
	["정확한 번들 문법 식별자는 키로 오인하지 않는다", `|${keyword}|`, 0],
	["같은 줄의 실제 키와 접두사 안의 키는 계속 차단한다", `|${keyword}| prefix-${key}`, 1],
	["식별자와 비슷한 다른 키는 예외로 삼지 않는다", `|${keyword}-extra|`, 1],
]) {
	test(name, () => {
		const { root, git, write } = makeRepo({ name: "dc-keyword-" });
		write("bundle.js", content);
		git("add", "bundle.js");
		const result = spawnSync(process.execPath, [join(TEMPLATE_FILES, "scripts/dev-cycle.mjs"), "secrets"], { cwd: root, encoding: "utf8" });
		assert.equal(result.status, status);
		assert.ok(!result.stdout.includes(key));
	});
}
