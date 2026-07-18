import { mkdtemp, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const root=process.cwd();
const name='DemonDive_Alpha7_8A_FullCampaign_Playtest';
const zip=join(root,'artifacts',`${name}.zip`);
const expected=(await readFile(`${zip}.sha256`,'utf8')).split(/\s+/)[0];
const actual=createHash('sha256').update(await readFile(zip)).digest('hex');
if(actual!==expected)throw new Error('Playable ZIP checksum mismatch.');
const unpack=await mkdtemp(join(tmpdir(),'demondive-playable-'));
const extracted=spawnSync('unzip',['-q',zip,'-d',unpack],{stdio:'inherit'});
if(extracted.status!==0)throw new Error('Playable ZIP could not be restored.');
const folder=join(unpack,name);const manifest=JSON.parse(await readFile(join(folder,'PLAYABLE_MANIFEST.json'),'utf8'));
for(const entry of manifest.files){
  const bytes=await readFile(join(folder,entry.path));const digest=createHash('sha256').update(bytes).digest('hex');
  if(bytes.length!==entry.bytes||digest!==entry.sha256)throw new Error(`Restored file mismatch: ${entry.path}`);
}
const port=4183;const server=spawn(process.execPath,['serve.mjs','--no-open','--port',String(port)],{cwd:folder,stdio:['ignore','pipe','pipe']});
try{
  let html='';
  for(let attempt=0;attempt<30;attempt+=1){
    try{const response=await fetch(`http://127.0.0.1:${port}/`);if(response.ok){html=await response.text();break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  if(!html.includes('A7.8A · POLISH PLAYTEST'))throw new Error('Restored package did not serve the Alpha 7.8A entry page.');
  const asset=html.match(/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0];
  if(!asset||!(await fetch(`http://127.0.0.1:${port}/${asset}`)).ok)throw new Error('Restored package JavaScript was not served.');
}finally{server.kill('SIGTERM');}
console.log(`PLAYABLE PACKAGE RESTORE GATE PASSED · ${manifest.files.length} hashed files · install-free server smoke`);
