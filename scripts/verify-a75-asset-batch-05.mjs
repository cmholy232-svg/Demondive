import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const batch=JSON.parse(await readFile(resolve(root,'production/alpha7_5-asset-batch-05.json'),'utf8'));
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
assert(batch.batchId==='alpha7.5-asset-batch-05','Unexpected Batch 05 id.');
assert(batch.approval.humanApproved===false&&batch.approval.playableRelease===false,'Batch 05 may not claim final/playable approval.');
assert(batch.miloPackage.requiredStateCount===30&&batch.miloPackage.requiredLayerCount===13&&batch.miloPackage.reportedDefectCount===5,'Batch 05 count contract changed.');
assert(batch.sourceBaseline.integrationState==='blocked-by-authoritative-source-materialization','Batch 05 must preserve the integration blocker.');
for(const path of [batch.miloPackage.manifest,batch.miloPackage.scaleBoard,batch.miloPackage.handoff,'ALPHA7_5_ASSET_BATCH_05_HANDOFF.md']){const info=await stat(resolve(root,path));assert(info.isFile()&&info.size>0,`Missing Batch 05 deliverable: ${path}`);}
console.log('ALPHA 7.5 ASSET BATCH 05 QA PASSED · Milo scale/feet/effect source gate · non-final and non-playable');
