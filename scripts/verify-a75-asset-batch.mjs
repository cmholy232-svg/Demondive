import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const assertFile = async (path) => {
  const info = await stat(resolve(root, path));
  assert(info.isFile() && info.size > 0, `Missing or empty asset: ${path}`);
};

const batch = await readJson('production/alpha7_5-asset-batch-01.json');
assert(batch.batchId === 'alpha7.5-asset-batch-01', 'Unexpected Alpha 7.5 batch id.');
assert(batch.approval.humanApproved === false, 'Automated verification cannot grant human approval.');
assert(batch.approval.playableRelease === false, 'Asset batch must not identify itself as a playable release.');
assert(batch.sourceBaseline.integrationState === 'pending-authoritative-source-materialization', 'Integration state must remain explicit until the 7.4A source is restored.');
assert(batch.packages.length === 3, 'Batch 01 must contain exactly three reviewed packages.');

const expected = new Map([
  ['boon-portraits-v01', 20],
  ['level4-9-environment-plates-v01', 6],
  ['boon-sigils-v01', 20],
]);

for (const pkg of batch.packages) {
  assert(expected.get(pkg.id) === pkg.count, `Unexpected count for ${pkg.id}.`);
  assert(pkg.status === 'integrated-correction-pending', `${pkg.id} may not be marked final.`);
  assert(pkg.humanApproved === false, `${pkg.id} may not be marked human approved.`);
  await assertFile(pkg.manifest);
  await assertFile(pkg.qaSheet);
}

const portraits = await readJson(batch.packages[0].manifest);
assert(portraits.portraits.length === 20, 'Portrait manifest must contain 20 entries.');
const portraitIds = new Set();
for (const portrait of portraits.portraits) {
  assert(!portraitIds.has(portrait.id), `Duplicate portrait id: ${portrait.id}`);
  portraitIds.add(portrait.id);
  assert(portrait.status === 'integrated-correction-pending' && portrait.humanApproved === false, `Portrait ${portrait.id} has invalid approval state.`);
  await assertFile(portrait.source);
  await assertFile(portrait.runtime);
}

const environments = await readJson(batch.packages[1].manifest);
assert(environments.plates.length === 6, 'Environment manifest must contain six Level 4–9 plates.');
assert(environments.plates.map((plate) => plate.level).join(',') === '4,5,6,7,8,9', 'Environment levels must be exactly 4–9.');
for (const plate of environments.plates) {
  assert(plate.status === 'integrated-correction-pending' && plate.humanApproved === false, `Level ${plate.level} environment has invalid approval state.`);
  await assertFile(plate.source);
  await assertFile(plate.runtime);
  const svg = await readFile(resolve(root, plate.runtime), 'utf8');
  assert(svg.includes('viewBox="0 0 1672 941"'), `Level ${plate.level} environment has an invalid viewBox.`);
  assert(!/<script\b|(?:href|src)\s*=\s*["']https?:|xlink:href/i.test(svg), `Level ${plate.level} environment contains an external or scripted dependency.`);
}

const sigils = await readJson(batch.packages[2].manifest);
assert(sigils.sigils.length === 20, 'Sigil manifest must contain 20 entries.');
const sigilIds = new Set();
for (const sigil of sigils.sigils) {
  assert(!sigilIds.has(sigil.id), `Duplicate sigil id: ${sigil.id}`);
  sigilIds.add(sigil.id);
  assert(sigil.status === 'integrated-correction-pending' && sigil.humanApproved === false, `Sigil ${sigil.id} has invalid approval state.`);
  await assertFile(sigil.source);
  await assertFile(sigil.runtime);
  const svg = await readFile(resolve(root, sigil.runtime), 'utf8');
  assert(svg.includes('viewBox="0 0 128 128"'), `Sigil ${sigil.id} has an invalid viewBox.`);
  assert(!/<script\b|(?:href|src)\s*=\s*["']https?:|xlink:href/i.test(svg), `Sigil ${sigil.id} contains an external or scripted dependency.`);
}

assert(portraitIds.size === sigilIds.size && [...portraitIds].every((id) => sigilIds.has(id)), 'Portrait and sigil identities do not match.');

await assertFile('ALPHA7_5_ASSET_BATCH_01_HANDOFF.md');
await assertFile('ALPHA7_5_INTEGRATION_PATCH.md');

console.log('ALPHA 7.5 ASSET BATCH 01 QA PASSED · 20 portraits · 6 environments · 20 sigils · no human-final claims');
