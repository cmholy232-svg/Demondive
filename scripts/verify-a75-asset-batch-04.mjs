import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const batch=JSON.parse(await readFile(resolve(root,'production/alpha7_5-asset-batch-04.json'),'utf8'));
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
assert(batch.batchId==='alpha7.5-asset-batch-04','Unexpected Batch 04 id.');
assert(batch.approval.humanApproved===false&&batch.approval.playableRelease===false,'Batch 04 may not claim final/playable approval.');
assert(batch.approval.status==='source-ready-correction-pending','Batch 04 may not claim final status.');
assert(batch.biomeAndRoomPackage.biomeCount===9,'Batch 04 must cover nine biomes.');
assert(batch.combatCastPackage.encounterCount===18&&batch.combatCastPackage.reportedDefectCount===8,'Batch 04 combat-cast counts changed.');
assert(batch.sourceBaseline.integrationState==='blocked-by-authoritative-source-materialization','Batch 04 must preserve the integration blocker.');
const required=[...Object.values(batch.biomeAndRoomPackage).filter(x=>typeof x==='string'),...Object.values(batch.combatCastPackage).filter(x=>typeof x==='string'),'ALPHA7_5_ASSET_BATCH_04_HANDOFF.md'];
for(const path of required){const info=await stat(resolve(root,path));assert(info.isFile()&&info.size>0,`Missing Batch 04 deliverable: ${path}`);}
console.log('ALPHA 7.5 ASSET BATCH 04 QA PASSED · nine biome/room contracts · 18 combat-cast gates · non-final and non-playable');
