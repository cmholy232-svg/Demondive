import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const root = process.cwd();

function fail(message) {
  throw new Error(`Alpha 7.5 runtime art verification failed: ${message}`);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function runtimePath(manifestPath) {
  const normalized = manifestPath.replace(/^public\//, '').replace(/^\//, '');
  return path.join(root, 'public', normalized);
}

function verifyFile(relativePath) {
  const absolutePath = runtimePath(relativePath);
  if (!fs.existsSync(absolutePath)) fail(`missing ${relativePath}`);
  return absolutePath;
}

function sha256(absolutePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex');
}

function verifyPng(relativePath, width, height, expectedHash) {
  const absolutePath = verifyFile(relativePath);
  const image = PNG.sync.read(fs.readFileSync(absolutePath));
  if (image.width !== width || image.height !== height) {
    fail(`${relativePath} is ${image.width}x${image.height}; expected ${width}x${height}`);
  }
  if (expectedHash && sha256(absolutePath) !== expectedHash) fail(`${relativePath} checksum changed`);
}

const environment = readJson('public/assets/a75/environment/environment-manifest-v02.json');
const construction = readJson('public/assets/a75/environment/construction-atlas-manifest-v01.json');
const enemies = readJson('public/assets/a75/enemies/enemy-atlas-manifest-v01.json');
const encounters = readJson('public/assets/a75/bosses/encounter-atlas-manifest-v01.json');
const sigils = readJson('public/assets/a75/ui/boon-sigils/boon-sigil-manifest-v01.json');

if (environment.plates.length !== 6) fail(`expected 6 late-game backgrounds, found ${environment.plates.length}`);
for (const plate of environment.plates) {
  verifyPng(plate.runtime, environment.dimensions.width, environment.dimensions.height, plate.sha256);
}

if (construction.atlases.length !== 6 || construction.layout.cells.length !== 12) {
  fail('construction contract must contain six 4x3 atlases');
}
for (const atlas of construction.atlases) {
  verifyPng(atlas.path, construction.layout.width, construction.layout.height, atlas.sha256);
}

if (enemies.atlases.length !== 6) fail(`expected 6 enemy atlases, found ${enemies.atlases.length}`);
let enemyCount = 0;
for (const atlas of enemies.atlases) {
  verifyPng(atlas.runtime, enemies.layout.width, enemies.layout.height, atlas.sha256);
  if (atlas.rows.length !== enemies.layout.rows) fail(`${atlas.id} enemy row count is invalid`);
  enemyCount += atlas.rows.length;
}
if (enemyCount !== 36) fail(`expected 36 late-game common enemies, found ${enemyCount}`);

if (encounters.atlases.length !== 6 || encounters.layout.cells.length !== 8) {
  fail('encounter contract must contain six 2x4 atlases');
}
for (const atlas of encounters.atlases) {
  verifyPng(atlas.path, encounters.layout.width, encounters.layout.height, atlas.sha256);
}

if (sigils.sigils.length !== 20) fail(`expected 20 boon sigils, found ${sigils.sigils.length}`);
for (const sigil of sigils.sigils) verifyFile(sigil.runtime);

const main = fs.readFileSync(path.join(root, 'src/main.ts'), 'utf8');
const requiredRegistries = [
  'lateBackdrops',
  'lateEnemyAtlases',
  'lateEncounterAtlases',
  'lateEnvironmentAtlases',
  'boonSigils',
  'drawLateCommonEnemySprite',
  'drawLateEncounterSprite',
  'drawLateHazardArt',
];
for (const registry of requiredRegistries) {
  if (!main.includes(registry)) fail(`src/main.ts does not register ${registry}`);
}

console.log(`ALPHA 7.5 RUNTIME ART QA PASSED · ${environment.plates.length} backgrounds · ${enemyCount} common enemies · ${encounters.atlases.length * 2} encounters · ${construction.atlases.length * construction.layout.cells.length} construction cells · ${sigils.sigils.length} boon sigils`);
