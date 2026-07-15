import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root=resolve(import.meta.dirname,'..');
const sourceRoot=resolve(root,'source-assets/a75/ui/hud-hierarchy');
const tempRoot=resolve(tmpdir(),'demondive-a75-hud-qa');
mkdirSync(tempRoot,{recursive:true});

const layouts=[
  ['UI_HUD_Desktop_Minimal_v01.svg','desktop.png'],
  ['UI_HUD_MobileLandscape_Minimal_v01.svg','mobile.png'],
  ['UI_HUD_Pause_FullInformation_v01.svg','pause.png'],
];

const run=(args,label)=>{
  const result=spawnSync('ffmpeg',args,{encoding:'utf8'});
  if(result.status!==0)throw new Error(`${label} failed: ${result.stderr||result.stdout}`);
};

for(const [source,output] of layouts)run([
  '-hide_banner','-loglevel','error','-i',resolve(sourceRoot,source),
  '-frames:v','1','-y',resolve(tempRoot,output),
],`Render ${source}`);

run([
  '-hide_banner','-loglevel','error',
  '-i',resolve(tempRoot,'desktop.png'),
  '-i',resolve(tempRoot,'mobile.png'),
  '-i',resolve(tempRoot,'pause.png'),
  '-filter_complex','[0:v][1:v][2:v]vstack=inputs=3[out]',
  '-map','[out]','-frames:v','1','-y',
  resolve(sourceRoot,'QA_HUDHierarchy_ContactSheet_v01.png'),
],'Assemble HUD QA contact sheet');

console.log('ALPHA 7.5 HUD QA CONTACT SHEET RENDERED · desktop · mobile · pause');
