import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const expectedBuildHashes = Object.freeze({
  'dist/index.html': '03647d856f5aa1b5de42886907e6c697d5896d7250b7dd4c3803df9f52c0ace1',
  'dist/assets/index-BmgJptvb.css': 'bb65aab281488d71c92102aa1c07c4b51d6a304010b84c71eb52a404b5212960',
  'dist/assets/index-Berm6ySH.js': 'aece117830d8765600c0969037e9e84a146c68127930478565de65e085133542',
  'dist/assets/index-Berm6ySH.js.map': '1d172c8951b7b10da131dbf44794e7a82f760e2b911280fde97c6f33e94aa366',
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

const sourceMap = JSON.parse(await readFile(path.join(root, 'dist/assets/index-Berm6ySH.js.map'), 'utf8'));
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
const baselineAssets = publicAssets.filter((entry) => !entry.startsWith('public/assets/a75/'));
if (baselineAssets.length !== 111) {
  throw new Error(`Expected 111 Alpha 7.3C baseline assets; received ${baselineAssets.length}.`);
}

const requiredAssetRoots = ['a5', 'a6', 'a7', 'a73', 'a73c', 'v1'];
for (const assetRoot of requiredAssetRoots) {
  if (!baselineAssets.some((entry) => entry.startsWith(`public/assets/${assetRoot}/`))) {
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

console.log('Alpha 7.3C foundation verified beneath the exact Alpha 7.5 playable integration: 20 modules, 111 baseline assets, Levels 1–9.');
