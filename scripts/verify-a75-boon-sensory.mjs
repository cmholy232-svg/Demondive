import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const manifest=JSON.parse(await readFile(resolve(root,'public/assets/a75/vfx/boon-sensory/boon-sensory-manifest-v01.json'),'utf8'));
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
assert(manifest.packages.length===20,'Expected 20 boon sensory packages.');
assert(manifest.humanApproved===false&&manifest.status==='source-ready-correction-pending','Sensory sources may not claim final approval.');
const ids=new Set(),motions=new Set(),impacts=new Set(),sfx=new Set(),consolidations=new Set();
for(const pkg of manifest.packages){
  assert(!ids.has(pkg.id),`Duplicate boon sensory id ${pkg.id}.`);ids.add(pkg.id);motions.add(pkg.motion);impacts.add(pkg.impact);sfx.add(pkg.sfx);consolidations.add(pkg.consolidate);
  assert(pkg.humanApproved===false&&pkg.status==='source-ready-correction-pending',`${pkg.id} has invalid approval state.`);
  for(const field of ['motion','impact','status','special','sfx','stack','consolidate'])assert(typeof pkg[field]==='string'&&pkg[field].length>8,`${pkg.id} lacks ${field} direction.`);
  const board=await stat(resolve(root,pkg.sourceBoard));assert(board.isFile()&&board.size>0,`${pkg.id} source board missing.`);
  for(const kind of ['projectile','impact','status','special']){
    const path=pkg.runtime[kind],info=await stat(resolve(root,path));assert(info.isFile()&&info.size>0,`${pkg.id} ${kind} missing.`);
    const svg=await readFile(resolve(root,path),'utf8');assert(svg.includes('viewBox="0 0 128 128"'),`${pkg.id} ${kind} has invalid viewBox.`);assert(!/<script\b|(?:href|src)\s*=\s*["']https?:|xlink:href/i.test(svg),`${pkg.id} ${kind} has external/script dependency.`);
  }
}
for(const [label,set] of [['motion',motions],['impact',impacts],['SFX',sfx],['consolidation',consolidations]])assert(set.size===20,`All 20 boons require distinct ${label} direction.`);
console.log('ALPHA 7.5 BOON SENSORY QA PASSED · 20 behavioral identities · 80 vector components · distinct high-stack consolidation rules');
