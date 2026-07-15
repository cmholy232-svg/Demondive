import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const path=resolve(root,'production/alpha7_5-biome-art-direction.json');
const data=JSON.parse(await readFile(path,'utf8'));
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
assert(data.packageId==='alpha7.5-biome-direction-v01','Unexpected biome direction package.');
assert(data.approval.humanApproved===false&&data.approval.playableRelease===false,'Biome package may not claim final/playable approval.');
assert(data.biomes.length===9,'Biome direction must cover Levels 1–9.');
assert(data.biomes.map(x=>x.level).join(',')==='1,2,3,4,5,6,7,8,9','Biome levels must be ordered and unique.');
const ids=new Set();
for(const biome of data.biomes){
  assert(!ids.has(biome.id),`Duplicate biome id ${biome.id}.`);ids.add(biome.id);
  assert(biome.palette.length===6&&biome.palette.every(color=>/^#[0-9a-f]{6}$/i.test(color)),`${biome.id} requires six valid palette colors.`);
  for(const field of ['shapeLanguage','architecture','materials','props','hazards','forbidden'])assert(biome[field].length>=3,`${biome.id} lacks ${field} direction.`);
  for(const field of ['concept','lighting','saturation','enemySilhouette','bossSilhouette','accentRule','density'])assert(biome[field].length>20,`${biome.id} lacks ${field} detail.`);
}
const contract=data.roomQualityContract;
assert(contract.sequenceRules.noConsecutiveEmptyRooms===true&&contract.sequenceRules.bossAtEnd===true,'Campaign sequence protections changed.');
assert(contract.sequenceRules.miniBossWindow.includes('45–55%'),'Mini-boss midpoint window is missing.');
for(const field of ['intendedMovementMechanic','difficultyTier','enemyBudget','hazardBudget','densityClass','traversalType','recoveryLevel','compatibleModifiers','compatibleBiomes','mobileSuitability','performanceWeight'])assert(contract.requiredMetadata.includes(field),`Room metadata lacks ${field}.`);
assert(contract.automatedChecks.length>=9&&contract.humanChecks.length>=9&&contract.rejectReasons.length>=9,'Room quality gate is incomplete.');
for(const output of [data.outputs.biomeBoard,data.outputs.densityBoard,data.outputs.handoff]){const info=await stat(resolve(root,output));assert(info.isFile()&&info.size>0,`Missing biome deliverable ${output}.`);}
for(const output of [data.outputs.biomeBoard,data.outputs.densityBoard]){const svg=await readFile(resolve(root,output),'utf8');assert(!/<script\b|(?:href|src)\s*=\s*["']https?:/i.test(svg),`${output} contains external/script content.`);}
console.log('ALPHA 7.5 BIOME + ROOM QA PASSED · 9 distinct templates · sequence, density, mobile and readability gates');
