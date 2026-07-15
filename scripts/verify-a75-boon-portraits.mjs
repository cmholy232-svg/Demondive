import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {PNG} from 'pngjs';

const root=resolve(import.meta.dirname,'..');
const manifest=JSON.parse(readFileSync(resolve(root,'public/assets/a75/characters/boon-givers/boon-portrait-manifest-v01.json'),'utf8'));
assert.equal(manifest.version,1);assert.equal(manifest.portraits.length,20);
const contentSource=readFileSync(resolve(root,'src/game/content.ts'),'utf8');
for(const id of ['luna','solara','calyptra','isolde','somnia','vespera','aurelia','noctissa','lilith','seraphine']){
  assert.ok(contentSource.includes(`assets/a75/characters/boon-givers/chr-${id}-portrait-v01.png`),`${id} is still using a generic glyph fallback`);
}
const hashes=new Set();
for(const entry of manifest.portraits){
  assert.equal(entry.status,'integrated-correction-pending');assert.equal(entry.humanApproved,false);
  const bytes=readFileSync(resolve(root,entry.runtime)),source=readFileSync(resolve(root,entry.source)),portrait=PNG.sync.read(bytes);
  assert.equal(portrait.width,384,`${entry.id} width`);assert.equal(portrait.height,512,`${entry.id} height`);assert.ok(source.length>10_000,`${entry.id} source crop missing`);
  const corners=[0,portrait.width-1,(portrait.height-1)*portrait.width,portrait.height*portrait.width-1].map(index=>portrait.data[index*4+3]);
  assert.ok(corners.every(alpha=>alpha<12),`${entry.id} has opaque portrait corners`);
  const visible=[...portrait.data].filter((_,index)=>index%4===3&&portrait.data[index]>24).length;
  assert.ok(visible>6_000,`${entry.id} is unexpectedly empty`);
  const hash=createHash('sha256').update(bytes).digest('hex');assert.equal(hash,entry.sha256,`${entry.id} manifest hash drifted`);hashes.add(hash);
}
assert.equal(hashes.size,20,'every boon-giver portrait must remain distinct');
console.log('ALPHA 7.5 BOON PORTRAIT QA PASSED · 20 distinct 384x512 transparent runtime portraits + preserved source crops');
