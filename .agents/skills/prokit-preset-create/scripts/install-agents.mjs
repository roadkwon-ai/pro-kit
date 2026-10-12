import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const roles = ['researcher', 'implementer', 'reviewer'].map((role) => `prokit-preset-${role}`);
const sha = (data) => createHash('sha256').update(data).digest('hex');
export async function install({ target, sync, write = false, replaceReviewed = false }) {
  const root = realpathSync(target);
  const converter = await import(pathToFileURL(path.resolve(sync)).href);
  const source = fileURLToPath(new URL('../references/agents/', import.meta.url));
  const planned = [];
  for (const name of roles) {
    const md = readFileSync(path.join(source, `${name}.md`), 'utf8');
    const parsed = converter.parseAgent(md);
    if (parsed.meta.name !== name) throw Error(`정본 이름 불일치: ${name}`);
    const outputs = [[`.claude/agents/${name}.md`, md], [`.codex/agents/${name}.toml`, converter.toToml(parsed)]];
    if (typeof converter.toAntigravity === 'function') outputs.push([`.agents/agents/${name}.md`, converter.toAntigravity(parsed)]);
    for (const [relative, content] of outputs) {
      const out = path.join(root, relative);
      let current = root;
      for (const part of relative.split('/')) {
        current = path.join(current, part);
        let entry;
        try { entry = lstatSync(current); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
        if (entry?.isSymbolicLink()) throw Error(`심볼릭 링크 거부: ${relative}`);
      }
      const previous = existsSync(out) ? readFileSync(out, 'utf8') : null;
      planned.push({ out, relative, content, previous, sourceSha256: sha(md), expectedSha256: sha(content), installedSha256: previous === null ? null : sha(previous), changed: previous !== content });
    }
  }
  if (write) {
    const conflicts = planned.filter((item) => item.changed && item.previous !== null);
    if (conflicts.length && !replaceReviewed) throw Error(`검토된 교체 필요: ${conflicts.map((x) => x.relative).join(', ')}`);
    for (const item of planned.filter((x) => x.changed)) {
      mkdirSync(path.dirname(item.out), { recursive: true });
      writeFileSync(item.out, item.content);
      item.installedSha256 = sha(readFileSync(item.out));
    }
  }
  return { unsupported: typeof converter.toAntigravity === 'function' ? [] : ['antigravity'], supported: typeof converter.toAntigravity === 'function' ? ['claude','codex','antigravity'] : ['claude','codex'], status: write || planned.every((x) => !x.changed) ? 'matched' : 'different', nativeExposure: 'unverified; 호출 도구의 실제 역할 목록에서 별도 확인', files: planned.map(({out,content,previous,...item}) => item) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const value = (key) => args[args.indexOf(key) + 1];
    if (!args.includes('--target') || !args.includes('--sync') || args.includes('--write') === args.includes('--check')) throw Error('--target <dir> --sync <sync-agents.mjs> 및 --check 또는 --write 필요');
    const result = await install({target:value('--target'),sync:value('--sync'),write:args.includes('--write'),replaceReviewed:args.includes('--replace-reviewed')});
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status === 'matched' ? 0 : 1;
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
