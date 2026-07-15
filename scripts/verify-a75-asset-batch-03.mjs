import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const batch=JSON.parse(await readFile(resolve(root,'production/alpha7_5-asset-batch-03.json'),'utf8'));
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
assert(batch.batchId==='alpha7.5-asset-batch-03','Unexpected Batch 03 id.');
assert(batch.approval.humanApproved===false&&batch.approval.playableRelease===false,'Batch 03 may not claim human approval or playable status.');
assert(batch.approval.status==='source-ready-correction-pending','Batch 03 may not claim final status.');
assert(batch.hud.runtimeComponentCount===7&&batch.hud.sourceLayoutCount===3,'Batch 03 HUD count contract changed.');
assert(batch.sourceBaseline.integrationState==='blocked-by-authoritative-source-materialization','Batch 03 must preserve the current integration blocker.');
const required=[
  batch.hud.manifest,batch.hud.qaSheet,batch.hud.handoff,
  batch.productionGates.masterAudit,batch.productionGates.masterAuditReport,
  batch.productionGates.animationSourceChecklist,batch.productionGates.recoveryLedger,
  'ALPHA7_5_ASSET_BATCH_03_HANDOFF.md',
];
for(const path of required){
  const info=await stat(resolve(root,path));
  assert(info.isFile()&&info.size>0,`Missing Batch 03 deliverable: ${path}`);
}
console.log('ALPHA 7.5 ASSET BATCH 03 QA PASSED · HUD hierarchy + production gates complete · non-final and non-playable');
