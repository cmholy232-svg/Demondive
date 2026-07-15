import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..'),manifest=JSON.parse(readFileSync(resolve(root,'public/assets/a75/environment/environment-manifest-v01.json'),'utf8'));
assert.equal(manifest.version,1);assert.deepEqual(manifest.plates.map(entry=>entry.level),[4,5,6,7,8,9]);
const hashes=new Set();
for(const entry of manifest.plates){
  assert.equal(entry.status,'integrated-correction-pending');assert.equal(entry.humanApproved,false);assert.equal(entry.palette.length,6);
  const source=readFileSync(resolve(root,entry.source),'utf8'),runtime=readFileSync(resolve(root,entry.runtime),'utf8');assert.match(source,/viewBox="0 0 1672 941"/);assert.equal(runtime,source,`${entry.id} runtime vector drifted from its source`);assert.ok(source.length>1_400,`${entry.id} is unexpectedly empty`);
  const rgb=entry.palette[0].slice(1).match(/../g).map(value=>Number.parseInt(value,16)),baseLuma=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;assert.ok(baseLuma<35,`${entry.id} base value is too bright behind combat`);hashes.add(createHash('sha256').update(runtime).digest('hex'));
}
assert.equal(hashes.size,6,'biome plates must remain visually distinct');console.log('ALPHA 7.5 ENVIRONMENT QA PASSED · Levels 4–9 have distinct low-value scalable vector plates');
