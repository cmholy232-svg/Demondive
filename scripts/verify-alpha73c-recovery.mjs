import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

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

const builtAssets = await readdir(path.join(root,'dist/assets'));
const sourceMapName = builtAssets.find((entry) => /^index-.*\.js\.map$/.test(entry));
if (!sourceMapName) throw new Error('Production build did not emit an indexed JavaScript source map.');
const sourceMap = JSON.parse(await readFile(path.join(root, 'dist/assets',sourceMapName), 'utf8'));
if (sourceMap.sources.length !== sourceMap.sourcesContent.length || sourceMap.sources.length < 20) {
  throw new Error(`Expected the complete Alpha 7.3C foundation plus additive modules; received ${sourceMap.sources.length}.`);
}
const requiredSources = ['src/game/content.ts','src/game/generator.ts','src/game/deep-dive.ts','src/game/save.ts','src/main.ts'];
for (const required of requiredSources) if (!sourceMap.sources.some((source) => source.endsWith(required))) throw new Error(`Missing required foundation module: ${required}`);
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

console.log(`Alpha 7.3C foundation verified beneath additive production work: ${sourceMap.sources.length} mapped modules, 111 baseline assets, Levels 1–9.`);
