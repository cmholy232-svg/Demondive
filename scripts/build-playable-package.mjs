import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join, relative } from 'node:path';

const root=process.cwd();
const artifacts=join(root,'artifacts');
const packageName='DemonDive_Alpha7_8A_FullCampaign_Playtest';
const staging=join(artifacts,packageName);
const zipPath=join(artifacts,`${packageName}.zip`);
const handoffFiles=['serve.mjs','START_DEMONDIVE.cmd','START_DEMONDIVE.ps1','README_PLAYABLE.txt','CURRENT_BUILD_STATUS.md','ALPHA7_3C_PLAYTEST_CHECKLIST.md','ALPHA7_6_FINAL_SFX_REQUIREMENTS.md'];

await rm(artifacts,{recursive:true,force:true});
await mkdir(staging,{recursive:true});
await cp(join(root,'dist'),staging,{recursive:true});
for(const file of handoffFiles)await cp(join(root,file),join(staging,file));

async function filesBelow(directory){
  const files=[];
  async function visit(current){
    for(const entry of await readdir(current,{withFileTypes:true})){
      const path=join(current,entry.name);
      if(entry.isDirectory())await visit(path);else files.push(path);
    }
  }
  await visit(directory);return files.sort();
}

const entries=[];
for(const file of await filesBelow(staging)){
  const bytes=await readFile(file);
  entries.push({path:relative(staging,file).replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
await writeFile(join(staging,'PLAYABLE_MANIFEST.json'),`${JSON.stringify({build:'Alpha 7.8A',entry:'START_DEMONDIVE.cmd',files:entries},null,2)}\n`);
const zipped=spawnSync('zip',['-q','-r',zipPath,packageName],{cwd:artifacts,stdio:'inherit'});
if(zipped.status!==0)throw new Error('zip failed; install a ZIP utility or run this packaging job in GitHub Actions.');
const zip=await readFile(zipPath);const digest=createHash('sha256').update(zip).digest('hex');
await writeFile(`${zipPath}.sha256`,`${digest}  ${packageName}.zip\n`);
console.log(`PLAYABLE PACKAGE BUILT · ${zip.length} bytes · SHA-256 ${digest}`);
