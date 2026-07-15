import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const expectedBuildHashes = Object.freeze({
  'dist/index.html': '52f0e2e4ce14f9423c3066bae9e1cf0e3c8c4278047b46952c06b9ec2454d7ef',
  'dist/assets/index-BmgJptvb.css': 'bb65aab281488d71c92102aa1c07c4b51d6a304010b84c71eb52a404b5212960',
  'dist/assets/index-Bn0nmi6P.js': '7f57b879309eb50ff78db838fdb6d46307fe3faec75aad36e3f76d408e99e41b',
  'dist/assets/index-Bn0nmi6P.js.map': '2bec6b2530723fbaa027b854d3c5b89bb622b6fdc6a166bbb7c4e5f4beb12778',
});

async function sha256(relativePath) {
  const data = await readFile(path.join(root, relativePath));
  return createHash('sha256').update(data).digest('hex');
}

async function filesBelow(directory) {
  const output = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else output.push(path.relative(root, absolute));
    }
  }
  await visit(path.join(root, directory));
  return output.sort();
}

for (const [relativePath, expected] of Object.entries(expectedBuildHashes)) {
  const actual = await sha256(relativePath);
  if (actual !== expected) {
    throw new Error(`${relativePath} parity failed: expected ${expected}, received ${actual}`);
  }
}

const sourceMap = JSON.parse(await readFile(path.join(root, 'dist/assets/index-Bn0nmi6P.js.map'), 'utf8'));
if (sourceMap.sources.length !== 20 || sourceMap.sourcesContent.length !== 20) {
  throw new Error(`Expected the exact 20-module Alpha 7.3C source corpus; received ${sourceMap.sources.length}.`);
}
for (let index = 0; index < sourceMap.sources.length; index += 1) {
  const source = sourceMap.sources[index];
  const marker = source.lastIndexOf('src/');
  if (marker < 0) throw new Error(`Unexpected source-map entry: ${source}`);
  const relativePath = source.slice(marker);
  const recovered = await readFile(path.join(root, relativePath), 'utf8');
  if (recovered !== sourceMap.sourcesContent[index]) {
    throw new Error(`${relativePath} no longer matches the attached playable's exact embedded source.`);
  }
}

const publicAssets = await filesBelow('public/assets');
if (publicAssets.length !== 111) {
  throw new Error(`Expected 111 Alpha 7.3C runtime assets; received ${publicAssets.length}.`);
}

const requiredAssetRoots = ['a5', 'a6', 'a7', 'a73', 'a73c', 'v1'];
for (const assetRoot of requiredAssetRoots) {
  if (!publicAssets.some((entry) => entry.startsWith(`public/assets/${assetRoot}/`))) {
    throw new Error(`Missing required asset root: ${assetRoot}`);
  }
}

const runtime = await readFile(path.join(root, 'src/main.ts'), 'utf8');
for (const marker of [
  'CURRENT_ALPHA_FINAL_LEVEL = 9',
  'LEVEL_EIGHT_ENCOUNTERS',
  'LEVEL_NINE_ENCOUNTERS',
  'deepDiveIsDoubleBoss',
  'awardDiveXp',
  'canAccessCampaignLevel',
]) {
  if (!runtime.includes(marker)) throw new Error(`Missing Alpha 7.3C runtime marker: ${marker}`);
}

console.log('Alpha 7.3C recovery verified: exact runtime parity, 20 source modules, 111 assets, Levels 1–9.');
