import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const audit=JSON.parse(await readFile(resolve(root,'production/alpha7_5-master-asset-audit.json'),'utf8'));
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const ids=['pyrra','maris','gaia','zephyra','flora','voltara','crya','luna','solara','belladonna','nerissa','roxyne','calyptra','isolde','somnia','vespera','aurelia','noctissa','lilith','seraphine'];
assert(audit.auditId==='alpha7.5-master-asset-audit-v01','Unexpected audit id.');
assert(audit.humanApproved===false,'Automated audit cannot grant human approval.');
assert(audit.summary.boonGivers===20&&audit.summary.biomes===9&&audit.summary.campaignEncounters===18,'Master asset counts changed.');
assert(audit.boonPackageContract.ids.join(',')===ids.join(','),'Boon audit identities changed or are out of order.');
assert(audit.biomes.length===9&&audit.biomes.map(x=>x.level).join(',')==='1,2,3,4,5,6,7,8,9','Biome audit must cover Levels 1–9.');
assert(audit.encounters.length===18,'Encounter audit must cover nine mini-bosses and nine bosses.');
for(let level=1;level<=9;level+=1){
  const encounters=audit.encounters.filter(x=>x.level===level);assert(encounters.length===2,`Level ${level} needs exactly two encounter audit entries.`);assert(encounters.some(x=>x.role==='mini-boss')&&encounters.some(x=>x.role==='boss'),`Level ${level} encounter roles are incomplete.`);
}
const allEntries=[...audit.milo,...audit.biomes,...audit.encounters,...audit.uiFamilies,...audit.storyFamilies];
for(const entry of allEntries)assert(audit.allowedStatuses.includes(entry.status),`${entry.id} has invalid audit status ${entry.status}.`);
assert(!allEntries.some(entry=>entry.status==='final-integrated'),'No Alpha 7.5 asset may be called final-integrated before source reconciliation and human approval.');
for(const path of ['ALPHA7_5_MASTER_ASSET_AUDIT.md','ALPHA7_5_ANIMATION_SOURCE_CHECKLIST.md']){const info=await stat(resolve(root,path));assert(info.isFile()&&info.size>0,`Missing audit deliverable ${path}.`);}
console.log('ALPHA 7.5 MASTER ASSET AUDIT QA PASSED · 20 boons · 9 biomes · 18 encounters · no premature final claims');
