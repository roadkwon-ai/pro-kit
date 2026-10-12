import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sha = (data) => createHash('sha256').update(data).digest('hex');
export function verify(report, root, sourceRoot = root) {
  const issues = [];
  const warnings = [];
  const limitedCoverage = [];
  const fail = (code, id) => issues.push({ code, id });
  const within = (base, relative) => {
    if (typeof relative !== 'string' || path.isAbsolute(relative)) throw Error('상대경로 필요');
    const target = realpathSync(path.resolve(base, relative));
    const rel = path.relative(realpathSync(base), target);
    if (rel.startsWith('..') || path.isAbsolute(rel)) throw Error('루트 탈출');
    return target;
  };
  const evidence = (files, id) => {
    if (!Array.isArray(files) || !files.length) return fail('missing-evidence', id);
    for (const file of files) {
      try {
        if (sha(readFileSync(within(root, file.path))) !== file.sha256) fail('stale-evidence', id);
      } catch { fail('missing-evidence', id); }
    }
  };
  if (![1, 2].includes(report.schemaVersion)) fail('schema', 'report');
  if (!Array.isArray(report.sources) || !report.sources.length) fail('missing-source', 'sources');
  for (const file of report.sources ?? []) {
    try {
      if (sha(readFileSync(within(sourceRoot, file.path))) !== file.sha256) fail('stale-source', file.path);
    } catch { fail('missing-source', file.path); }
  }
  const refs = report.reference ?? [];
  if (!refs.length) fail('empty-reference', 'reference');
  if (report.schemaVersion === 2) {
    const inventory = report.contentInventory;
    const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
    const validSlots = (slots) => Array.isArray(slots) && slots.length > 0 && slots.every((slot) => nonempty(slot?.key) && ['fictional','preserve','unconfigured'].includes(slot?.mode)) && new Set(slots.map((slot) => slot.key)).size === slots.length;
    if (!Array.isArray(inventory) || !inventory.length) fail('missing-content-inventory', 'report');
    else {
      const inventoryIds = new Set();
      for (const entry of inventory) {
        if (!nonempty(entry?.id) || inventoryIds.has(entry.id) || !validSlots(entry.slots)) { fail('invalid-content-inventory', entry?.id); continue; }
        inventoryIds.add(entry.id);
        const matches = refs.filter((item) => item.id === entry.id);
        if (matches.length !== 1 || !Array.isArray(matches[0].contentSlots) || !isDeepStrictEqual(entry.slots.map(({key,mode}) => ({key,mode})), matches[0].contentSlots.map((slot) => ({key:slot?.key,mode:slot?.mode})))) fail('content-inventory-mismatch', entry.id);
      }
      for (const item of refs) if (item.contentSlots !== undefined && !inventoryIds.has(item.id)) fail('unregistered-content-slots', item.id);
    }
  }
  const ids = new Set();
  for (const item of refs) {
    if (!['layout','type','color','image','motion','interaction','screenshot-only'].includes(item.kind)) fail('unknown-kind', item.id);
    if (!item.id || ids.has(item.id)) fail('duplicate-or-missing-id', item.id);
    ids.add(item.id);
    if (!['extracted', 'measured'].includes(item.observation)) fail('unknown-observation', item.id);
    evidence(item.evidence, item.id);
    const actual = (report.comparisons ?? []).filter((x) => x.id === item.id);
    if (actual.length !== 1) { fail('missing-or-duplicate-comparison', item.id); continue; }
    const check = actual[0];
    if (!check.productLocator || check.status !== 'pass') fail('fidelity-failed', item.id);
    evidence(check.evidence, item.id);
    if (item.kind === 'screenshot-only') {
      const descriptions = (value) => Array.isArray(value) && value.length > 0 && value.every((text) => typeof text === 'string' && text.trim());
      if (!descriptions(item.visualScope) || !descriptions(item.limitations) || typeof check.visualReview !== 'string' || !check.visualReview.trim()) fail('missing-visual-scope', item.id);
      for (const product of check.evidence ?? []) {
        if ((item.evidence ?? []).some((source) => { try { return within(root, source.path) === within(root, product.path); } catch { return source.path === product.path; } })) fail('missing-product-visual-evidence', item.id);
      }
      limitedCoverage.push({ id: item.id, visualScope: item.visualScope ?? [], limitations: item.limitations ?? [] });
      warnings.push({ code: 'visual-only-warning', id: item.id, action: '첨부의 보이는 범위만 비교했다. 원본 DOM·숨은 상태·실거래는 검증하지 않았으며 Main이 제한 범위를 대조해야 한다.' });
    }
    const defaultMeasure = { layout: 'layout', type: 'textrow', image: 'assetSlot', interaction: 'navigationRefs' }[item.kind];
    for (const name of new Set([...(defaultMeasure ? [defaultMeasure] : []), ...(item.requiredMeasures ?? [])])) {
      const measure = check.measurements?.[name];
      if (!['layout', 'textrow', 'assetSlot', 'navigationRefs'].includes(name) || !measure?.reference || !measure.actual || typeof measure.reference !== 'object' || typeof measure.actual !== 'object' || !Object.keys(measure.reference).length) {
        fail('missing-measurement', `${item.id}:${name}`); continue;
      }
      evidence(measure.evidence, `${item.id}:${name}`);
      const geometry = new Set(['x','y','width','height','gap','padding','paddingTop','paddingRight','paddingBottom','paddingLeft','fontSize','lineHeight','letterSpacing']);
      const positive = (value) => Number.isFinite(value) && value > 0;
      const nonnegativeInteger = (value) => Number.isInteger(value) && value >= 0;
      const string = (value) => typeof value === 'string' && value.trim().length > 0;
      for (const observed of [measure.reference, measure.actual]) {
        let valid = string(observed.selector) && Number.isInteger(observed.matchCount) && observed.matchCount > 0;
        if (name === 'layout') valid &&= ['content','outer'].includes(observed.bboxKind) && Number.isFinite(observed.bbox?.x) && Number.isFinite(observed.bbox?.y) && positive(observed.bbox?.width) && positive(observed.bbox?.height) && positive(observed.viewport?.width) && positive(observed.viewport?.height) && positive(observed.clientWidth);
        if (name === 'textrow') valid &&= positive(observed.fontSize) && Number.isFinite(observed.fontWeight) && observed.fontWeight >= 1 && observed.fontWeight <= 1000 && (observed.lineHeight === 'normal' || (Number.isFinite(observed.lineHeight) && observed.lineHeight >= 0)) && (observed.letterSpacing === 'normal' || Number.isFinite(observed.letterSpacing)) && nonnegativeInteger(observed.rowCount) && (observed.rows === undefined || (Array.isArray(observed.rows) && observed.rows.length === observed.rowCount && observed.rows.every((row) => Number.isFinite(row?.x) && Number.isFinite(row?.y) && positive(row?.width) && positive(row?.height))));
        if (name === 'assetSlot') valid &&= string(observed.parent) && nonnegativeInteger(observed.index);
        if (name === 'navigationRefs') {
          const state = observed.state ?? 'ready';
          valid &&= state === 'unconfigured'
            ? observed.destination === null && observed.targetExists === null && observed.interactive === false
            : state === 'ready' && string(observed.destination) && !['#', 'javascript:void(0)', 'javascript:;'].includes(observed.destination.trim()) && !/^javascript:/i.test(observed.destination.trim()) && observed.targetExists === true && observed.interactive !== false;
        }
        if (!valid) fail('invalid-observation', `${item.id}:${name}`);
      }
      const compare = (field, expected, observed, strict = false) => {
        const tolerance = measure.tolerances?.[field];
        const numericMatch = !strict && tolerance && ['layout', 'textrow'].includes(name) && geometry.has(field) && Number.isFinite(expected) && Number.isFinite(observed) && Number.isFinite(tolerance.absolute) && tolerance.absolute >= 0 && Number.isFinite(tolerance.relative) && tolerance.relative >= 0 && typeof tolerance.reason === 'string' && tolerance.reason.trim() && Math.abs(expected - observed) <= Math.max(tolerance.absolute, Math.abs(expected) * tolerance.relative);
        const allowed = !strict && (measure.allowedDifferences ?? []).some((difference) => difference.field === field && typeof difference.reason === 'string' && difference.reason.trim());
        if (!isDeepStrictEqual(expected, observed) && !numericMatch && !allowed) fail('measurement-difference', `${item.id}:${name}:${field}`);
      };
      for (const field of Object.keys(measure.reference)) {
        if (!Object.hasOwn(measure.actual, field)) { fail('missing-measurement', `${item.id}:${name}:${field}`); continue; }
        if (field === 'selector') continue;
        if (name === 'layout' && field === 'bbox') {
          for (const dimension of ['x','y','width','height']) compare(dimension, measure.reference.bbox?.[dimension], measure.actual.bbox?.[dimension]);
        } else compare(field, measure.reference[field], measure.actual[field], ['matchCount','bboxKind','viewport','clientWidth'].includes(field));
      }
    }
    if (item.contentSlots !== undefined) {
      const slots = item.contentSlots;
      const values = check.contentSlots;
      const text = (value) => typeof value === 'string' && value.trim().length > 0;
      const valid = Array.isArray(slots) && slots.length > 0 && slots.every((slot) => text(slot?.key) && text(slot?.value) && ['fictional', 'preserve', 'unconfigured'].includes(slot.mode)) && new Set(slots.map((slot) => slot.key)).size === slots.length;
      if (!valid) fail('invalid-content-slots', item.id);
      else if (!Array.isArray(values) || !isDeepStrictEqual(slots.map((slot) => slot.key), values.map((slot) => slot?.key))) fail('content-slot-structure', item.id);
      else {
        const normalize = (value) => value.normalize('NFC').trim();
        const originalIdentities = slots.filter((slot) => slot.mode === 'fictional').map((slot) => normalize(slot.value));
        values.forEach((actual, index) => {
          const source = slots[index];
          if (source.mode === 'unconfigured' ? actual.value !== '' : !text(actual.value)) fail('missing-content-value', `${item.id}:${source.key}`);
          if (source.mode === 'preserve' && actual.value !== source.value) fail('changed-content-purpose', `${item.id}:${source.key}`);
          if (typeof actual.value === 'string' && originalIdentities.some((identity) => normalize(actual.value).includes(identity))) fail('retained-source-identity', `${item.id}:${source.key}`);
        });
      }
    }
    if (item.kind === 'image' && check.assetLoaded !== true) fail('missing-image', item.id);
    if (item.kind === 'motion') {
      if (check.motionObserved !== true) fail('missing-motion', item.id);
      for (const state of ['start', 'middle', 'end', 'reentry']) {
        evidence(check.frames?.[state], `${item.id}:${state}`);
      }
    }
  }
  const sourcesFingerprint = sha([...(report.sources ?? [])].sort((a,b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0).map((f) => `${f.path}\0${f.sha256}\n`).join(''));
  const review = report.independentReview;
  let artifact;
  if (!review?.artifact) fail('missing-review-artifact', 'review');
  else {
    evidence([review.artifact], 'review-artifact');
    try { artifact = JSON.parse(readFileSync(within(root, review.artifact.path), 'utf8')); }
    catch { fail('invalid-review-artifact', 'review'); }
  }
  if (!review?.reviewer || review.reviewer === report.implementer) fail('independent-review', 'review');
  if (artifact) {
    if (artifact.schemaVersion !== 1) fail('review-schema', 'review');
    if (!artifact.reviewer || artifact.reviewer !== review.reviewer || artifact.reviewer === report.implementer) fail('reviewer-mismatch', 'review');
    const validUrl = (value) => { try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; } };
    if (!validUrl(report.productUrl) || artifact.productUrl !== report.productUrl || !Array.isArray(report.referenceUrls) || !report.referenceUrls.length || !report.referenceUrls.every(validUrl) || JSON.stringify(artifact.referenceUrls) !== JSON.stringify(report.referenceUrls)) fail('review-target-mismatch', 'review');
    if (artifact.sourcesFingerprint !== sourcesFingerprint) fail('review-source-mismatch', 'review');
    for (const [key, expected] of [['ids', [...ids]], ['contexts', report.requiredContexts ?? []]]) {
      if (!Array.isArray(artifact.scope?.[key]) || !expected.every((id) => artifact.scope[key].includes(id))) fail('review-scope-missing', key);
    }
    for (const key of ['fidelity', 'functional', 'accessibility']) if (artifact.results?.[key] !== 'pass') fail('review-result-incomplete', key);
    if (!Array.isArray(artifact.extraIds)) fail('missing-independent-inventory', 'review');
    for (const id of artifact.extraIds ?? []) if (!ids.has(id)) fail('missing-core', id);
    evidence(artifact.evidence, 'review');
    const implementationEvidence = [...(report.comparisons ?? []).flatMap((c) => [...(c.evidence ?? []), ...Object.values(c.frames ?? {}).flat(), ...Object.values(c.measurements ?? {}).flatMap((m) => m.evidence ?? [])]), ...(report.settings ?? []).flatMap((c) => c.evidence ?? [])];
    for (const file of artifact.evidence ?? []) {
      if (implementationEvidence.some((original) => {
        try { return within(root, original.path) === within(root, file.path); }
        catch { return original.path === file.path; }
      })) fail('reused-review-evidence', file.path);
      else if (implementationEvidence.some((original) => original.sha256 === file.sha256)) warnings.push({ code: 'duplicate-content-warning', id: file.path, action: 'Main이 실제 독립 수행자 결과와 촬영·관측 provenance를 대조한다. 동일 내용만으로 재사용 또는 독립성을 판정하지 않는다.' });
    }
  }
  if (!Array.isArray(report.requiredContexts) || !report.requiredContexts.length) fail('missing-contexts', 'settings');
  for (const id of report.requiredContexts ?? []) {
    const settings = (report.settings ?? []).filter((s) => s.id === id);
    if (settings.length !== 1) { fail('missing-settings', id); continue; }
    const s = settings[0];
    if (s.themeButtons !== 1 || s.themeMenu !== true || !['system','light','dark'].every((x) => s.themes?.includes(x))) fail('theme-controls', id);
    if (s.languageMenu !== true || !['🇰🇷 한국어','🇺🇸 English'].every((x) => s.languageLabels?.includes(x))) fail('language-controls', id);
    if (!Array.isArray(s.translationSamples) || !s.translationSamples.length || !s.translationSamples.every((sample) => typeof sample.selector === 'string' && sample.selector.trim() && typeof sample.koText === 'string' && sample.koText.trim() && typeof sample.enText === 'string' && sample.enText.trim() && sample.koText.trim() !== sample.enText.trim())) fail('missing-translation-observation', id);
    evidence(s.evidence, id);
  }
  for (const key of ['functional', 'accessibility']) if (report[key] !== 'pass') fail('reported-result-incomplete', key);
  return { status: issues.length ? 'incomplete' : 'evidence-complete', acceptance: 'requires-main-review', sourcesFingerprint, claimedResults: { functional: report.functional ?? 'unknown', accessibility: report.accessibility ?? 'unknown', fidelity: artifact?.results?.fidelity ?? 'unknown' }, issues, warnings, limitedCoverage, limitation: '구조·해시·대응 검사이며 작성자 신원·실행·독립성·품질·발행 권한을 증명하지 않는다. Main이 실제 수신한 독립 검수 결과와 현재 제품 fingerprint를 대조해 수용한다.' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const input = path.resolve(process.argv[2]);
    const sourceArg = process.argv.indexOf('--source-root');
    if (sourceArg !== -1 && !process.argv[sourceArg + 1]) throw Error('--source-root 경로 필요');
    const sourceRoot = sourceArg === -1 ? path.dirname(input) : path.resolve(process.argv[sourceArg + 1]);
    const result = verify(JSON.parse(readFileSync(input, 'utf8')), path.dirname(input), sourceRoot);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.status === 'evidence-complete' ? 0 : 1;
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
