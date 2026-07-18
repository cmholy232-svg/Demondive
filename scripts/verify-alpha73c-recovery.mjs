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
const sourceMapNames = builtAssets.filter((entry) => entry.endsWith('.js.map'));
if (!sourceMapNames.length) throw new Error('Production build did not emit JavaScript source maps.');
const mappedSources = new Map();
for (const sourceMapName of sourceMapNames) {
  const sourceMap = JSON.parse(await readFile(path.join(root,'dist/assets',sourceMapName),'utf8'));
  if (sourceMap.sources.length !== sourceMap.sourcesContent.length) throw new Error(`Source/content mismatch in ${sourceMapName}.`);
  for (let index=0;index<sourceMap.sources.length;index+=1) {
    const source=sourceMap.sources[index];const marker=source.lastIndexOf('src/');
    if(marker<0)throw new Error(`Unexpected source-map entry in ${sourceMapName}: ${source}`);
    const relativePath=source.slice(marker);const embedded=sourceMap.sourcesContent[index];
    const previous=mappedSources.get(relativePath);
    if(previous!==undefined&&previous!==embedded)throw new Error(`Conflicting embedded source for ${relativePath}.`);
    mappedSources.set(relativePath,embedded);
  }
}
if (mappedSources.size < 20) throw new Error(`Expected the complete Alpha 7.3C foundation plus additive modules; received ${mappedSources.size}.`);
const requiredSources = ['src/game/content.ts','src/game/generator.ts','src/game/deep-dive.ts','src/game/save.ts','src/main.ts'];
for (const required of requiredSources) if (!mappedSources.has(required)) throw new Error(`Missing required foundation module: ${required}`);
for (const [relativePath,embedded] of mappedSources) {
  const recovered = await readFile(path.join(root, relativePath), 'utf8');
  if (recovered !== embedded) {
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

const page = await readFile(path.join(root, 'index.html'), 'utf8');
const packageManifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const packageLock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
if (!page.includes('A7.7 · STORY PLAYTEST')) throw new Error('Visible build stamp is stale or missing.');
if (!runtime.includes('A7.7 · TUTORIAL + STORY PLAYTEST · LEVELS 1–9')) throw new Error('Title-screen build label is stale or missing.');
if (packageManifest.version !== '1.0.0-alpha.7.7-story-playtest') throw new Error('Package version is not the Alpha 7.7 story playtest.');
if (packageLock.version !== packageManifest.version || packageLock.packages?.['']?.version !== packageManifest.version) throw new Error('Package-lock version does not match package.json.');

console.log(`Alpha 7.3C foundation verified beneath additive production work: ${mappedSources.size} mapped modules across ${sourceMapNames.length} production chunks, 111 baseline assets, Levels 1–9.`);
