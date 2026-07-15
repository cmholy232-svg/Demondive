import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const batch=JSON.parse(await readFile(resolve(root,'production/alpha7_5-asset-batch-02.json'),'utf8'));
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
assert(batch.batchId==='alpha7.5-asset-batch-02','Unexpected Batch 02 id.');
assert(batch.approval.humanApproved===false&&batch.approval.playableRelease===false,'Batch 02 may not claim human approval or playable status.');
assert(batch.approval.status==='source-ready-correction-pending','Batch 02 may not claim final status.');
assert(batch.package.boonCount===20&&batch.package.runtimeComponentCount===80,'Batch 02 count contract changed.');
for(const path of [batch.package.manifest,batch.package.qaSheet,'ALPHA7_5_ASSET_BATCH_02_HANDOFF.md']){
  const info=await stat(resolve(root,path));assert(info.isFile()&&info.size>0,`Missing Batch 02 deliverable: ${path}`);
}
console.log('ALPHA 7.5 ASSET BATCH 02 QA PASSED · sensory-source package is complete, non-final and non-playable');
