import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const data=JSON.parse(await readFile(resolve(root,'production/alpha7_5-milo-source-correction.json'),'utf8'));
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
assert(data.packageId==='alpha7.5-milo-source-correction-v01','Unexpected Milo correction package.');
assert(data.approval.humanApproved===false&&data.approval.playableRelease===false,'Milo package may not claim final/playable approval.');
assert(data.sourceContract.runtimeFrameScaleAllowed===false,'Milo v02 may not retain per-frame runtime scaling.');
assert(data.sourceContract.cell.feetY===458&&data.sourceContract.cell.minimumTransparentInsetPercent===6,'Milo cell/pivot gate changed.');
assert(data.sourceContract.requiredStates.length===30,'Milo source state list changed.');
assert(data.sourceContract.sourceLayers.length>=12,'Milo layer source gate is incomplete.');
for(const id of ['floating-idle','moving-fire-too-large','up-fire-too-small','purple-at-feet','facing-latch'])assert(data.reportedDefects.some(x=>x.id===id),`Missing Milo defect ${id}.`);
const runCast=data.currentEvidence.transitionRisks.find(x=>x.transition==='run → moving fire');
const upCast=data.currentEvidence.transitionRisks.find(x=>x.transition==='idle → upward fire');
assert(runCast.scaleChangePercent>10,'Moving-fire scale evidence unexpectedly changed.');
assert(upCast.scaleChangePercent<-20,'Up-fire scale evidence unexpectedly changed.');
for(const path of [data.outputs.scaleBoard,data.outputs.handoff]){const info=await stat(resolve(root,path));assert(info.isFile()&&info.size>0,`Missing Milo correction deliverable ${path}.`);}
const svg=await readFile(resolve(root,data.outputs.scaleBoard),'utf8');assert(!/<script\b|(?:href|src)\s*=\s*["']https?:/i.test(svg),'Milo QA board contains external/script content.');
console.log('ALPHA 7.5 MILO SOURCE QA PASSED · state-specific scale drift documented · v02 prohibits runtime frame scaling');
