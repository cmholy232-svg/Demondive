import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const data=JSON.parse(await readFile(resolve(root,'production/alpha7_5-combat-cast-correction-register.json'),'utf8'));
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
assert(data.packageId==='alpha7.5-combat-cast-correction-register-v01','Unexpected combat-cast package.');
assert(data.approval.humanApproved===false&&data.approval.playableRelease===false,'Combat-cast register may not claim final/playable approval.');
assert(data.encounters.length===18,'Combat-cast register requires 18 encounters.');
for(let level=1;level<=9;level++)for(const role of ['miniboss','boss'])assert(data.encounters.some(x=>x.level===level&&x.role===role),`Missing Level ${level} ${role}.`);
for(const item of data.encounters){
  assert(item.requiredStates.length>=7,`${item.id} lacks state sources.`);
  assert(item.requiredSockets.length>=4,`${item.id} lacks socket definitions.`);
  assert(item.sourceGate.length>=7,`${item.id} lacks source gates.`);
  assert(item.silhouetteTarget.length>60,`${item.id} lacks silhouette direction.`);
}
for(const id of ['milo-up-cast-scale','milo-moving-cast-scale','milo-grounding','neon-maw-enemy-atlas','generic-enemy-altitude','belladonna-attack-clip','roxyne-phase-two-clip','miniboss-image-glitch'])assert(data.defectIntake.some(x=>x.id===id),`Missing reported defect ${id}.`);
const required=[data.outputs.silhouetteBoard,data.outputs.handoff];
for(const path of required){const info=await stat(resolve(root,path));assert(info.isFile()&&info.size>0,`Missing combat-cast deliverable ${path}.`);}
const svg=await readFile(resolve(root,data.outputs.silhouetteBoard),'utf8');assert(!/<script\b|(?:href|src)\s*=\s*["']https?:/i.test(svg),'Combat-cast board contains external/script content.');
console.log('ALPHA 7.5 COMBAT CAST QA PASSED · 18 encounter gates · known crop, scale, grounding and Demon Lord defects retained');
