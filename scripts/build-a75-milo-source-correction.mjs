import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const evidencePath='public/assets/a5/characters/milo/chr-milo-animation-manifest-v01.json';
const evidence=JSON.parse(readFileSync(resolve(root,evidencePath),'utf8'));
const sourceRoot=resolve(root,'source-assets/a75/characters/milo-correction');
mkdirSync(sourceRoot,{recursive:true});mkdirSync(resolve(root,'production'),{recursive:true});

const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const pct=(value,reference)=>(value/reference-1)*100;
const current={
  idle:evidence.frameScaleCompensation.movement[1],
  runMean:mean(evidence.frameScaleCompensation.run),
  runCast:evidence.frameScaleCompensation.cast[2],
  upCast:evidence.frameScaleCompensation.cast[3],
  airCast:evidence.frameScaleCompensation.cast[4],
  downCast:evidence.frameScaleCompensation.cast[5],
};
const transitionRisks=[
  {transition:'run → moving fire',from:current.runMean,to:current.runCast,scaleChangePercent:+pct(current.runCast,current.runMean).toFixed(1),reportedResult:'Milo appears too large while moving and shooting.'},
  {transition:'idle → upward fire',from:current.idle,to:current.upCast,scaleChangePercent:+pct(current.upCast,current.idle).toFixed(1),reportedResult:'Milo appears too small when shooting upward.'},
  {transition:'jump/fall nominal → air fire',from:1.17,to:current.airCast,scaleChangePercent:+pct(current.airCast,1.17).toFixed(1),reportedResult:'Air-fire body mass may jump even when collider does not.'},
];

const requiredStates=[
  'idle breathing','turn/reversal','run contact A','run down A','run passing A','run up A','run contact B','run down B','run passing B','run up B',
  'jump anticipation','jump rise','jump apex','jump fall','landing','dash start','dash travel','dash end/waveland','hurt light','hurt heavy','death','victory',
  'neutral cast anticipation','neutral cast release','moving cast release','upward cast release','air cast release','downward cast release','Special charge','boon acquire',
];
const sourceLayers=['body base','head/hair','jacket and cloth overlap','right casting arm/hand','left arm/hand','front leg','rear leg','shoe soles/contact mask','Arcane palm effect','cast trail/secondary VFX','hit-flash mask','emissive mask','shadow reference only'];
const sourceContract={
  version:2,status:'source-required-correction-pending',humanApproved:false,
  cell:{width:384,height:512,feetY:458,nativeGameplayScale:.36,minimumTransparentInsetPercent:6},
  runtimeFrameScaleAllowed:false,
  bodyCalibration:{uprightCrownToSoleTolerancePercent:4,headHeightTolerancePercent:3,shoulderWidthTolerancePercent:4,jacketHemTolerancePercent:4,shoeSizeTolerancePercent:3,transitionApparentScaleTolerancePercent:3,crouchAndAirRule:'Compare head, shoulders, jacket hem, pelvis and shoe landmarks; never normalize a tucked pose by bounding-box height.'},
  pivotRules:['every grounded frame places the visible shoe sole at y=458 in source','air frames preserve the same virtual feet reference even when legs tuck','shadow is rendered from collider and is never baked into the sprite','right-palm socket is measured after final source normalization','horizontal mirroring changes screen direction but not anatomical casting-hand ownership'],
  effectRules:['no purple/Arcane pixels may exist below the shoe contact mask','palm flame, projectile charge and long trails export separately from Milo’s body','effect bounds never influence body scaling or collider','upward effect may exceed the body cell only through a registered separate layer'],
  requiredStates,sourceLayers,
};
const manifest={schemaVersion:1,packageId:'alpha7.5-milo-source-correction-v01',roadmapPosition:'Alpha 7.5 Milo final-art and animation-source preparation',approval:{status:'source-ready-correction-pending',humanApproved:false,playableRelease:false},currentEvidence:{manifest:evidencePath,cell:evidence.cell,frameScaleCompensation:evidence.frameScaleCompensation,frameFeetY:evidence.frameFeetY,current,transitionRisks},reportedDefects:[
  {id:'floating-idle',symptom:'Visible gap between shoe sole and floor/contact shadow.',requiredResolution:'Bake every grounded frame to the common feet baseline and remove dependence on per-frame feetY.'},
  {id:'moving-fire-too-large',symptom:'Milo grows when moving forward and firing.',requiredResolution:'Redraw/repack moving cast at the locked body landmarks; no frame scale multiplier.'},
  {id:'up-fire-too-small',symptom:'Milo shrinks when firing upward.',requiredResolution:'Keep body landmarks at locked scale; export raised-arm Arcane effect separately.'},
  {id:'purple-at-feet',symptom:'Purple pixels clip at Milo’s feet during upward fire.',requiredResolution:'Remove disconnected effect pixels below sole mask and enforce body/effect layer separation.'},
  {id:'facing-latch',symptom:'Quick left/right tap can leave idle facing opposite the last intended direction.',requiredResolution:'Runtime state/input correction after source restoration; art mirrors from one declared master.'}
],sourceContract,integrationAfterArt:['register v02 atlas paths without overwriting v01','omit frameScales and frameFeetY from v02 runtime definitions','use the common source feetY and collider-owned world foot position','remeasure right-palm sockets after normalization','A/B capture every state transition over a fixed collider and floor line','run no-edge-pixel, disconnected-effect, source-rectangle and physical-phone tests'],outputs:{scaleBoard:'source-assets/a75/characters/milo-correction/QA_MiloScaleDriftAndSourceGate_v01.svg',handoff:'ALPHA7_5_MILO_SOURCE_CORRECTION.md'}};
writeFileSync(resolve(root,'production/alpha7_5-milo-source-correction.json'),`${JSON.stringify(manifest,null,2)}\n`);

const groups=['movement','run','dashHurt','cast'];
const groupColors={movement:'#52d5e6',run:'#77e8cf',dashHurt:'#ff8a66',cast:'#a78bfa'};
const bars=groups.map((group,row)=>evidence.frameScaleCompensation[group].map((value,frame)=>{
  const x=230+frame*104,y=120+row*110,height=value*58,problem=group==='cast'&&(frame===2||frame===3);
  return `<g><rect x="${x}" y="${y+72-height}" width="64" height="${height}" rx="5" fill="${problem?'#ff405f':groupColors[group]}"/><text x="${x+32}" y="${y+92}" text-anchor="middle" fill="#d8d2df" font-family="Arial,sans-serif" font-size="11">F${frame} · ${value.toFixed(2)}</text>${problem?`<text x="${x+32}" y="${y+62-height}" text-anchor="middle" fill="#ff9aa9" font-family="Arial,sans-serif" font-size="10" font-weight="700">${frame===2?'RUN CAST +15%':'UP CAST −28%'}</text>`:''}</g>`;
}).join('')).map((row,rowIndex)=>`<text x="24" y="${172+rowIndex*110}" fill="${groupColors[groups[rowIndex]]}" font-family="Arial,sans-serif" font-size="16" font-weight="700">${groups[rowIndex].toUpperCase()}</text>${row}`).join('');
const stateTags=requiredStates.map((state,index)=>{const col=index%5,row=Math.floor(index/5);return `<rect x="${26+col*230}" y="${610+row*42}" width="212" height="30" rx="6" fill="#17131f" stroke="#3d344a"/><text x="${38+col*230}" y="${630+row*42}" fill="#d8d2df" font-family="Arial,sans-serif" font-size="11">${state}</text>`;}).join('');
writeFileSync(resolve(sourceRoot,'QA_MiloScaleDriftAndSourceGate_v01.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="910" viewBox="0 0 1200 910"><rect width="1200" height="910" fill="#06050a"/><text x="24" y="34" fill="#fff" font-family="Arial,sans-serif" font-size="22" font-weight="700">MILO SCALE DRIFT · CURRENT EVIDENCE → V02 SOURCE GATE</text><text x="24" y="58" fill="#aaa2b1" font-family="Arial,sans-serif" font-size="12">Runtime frame multipliers change apparent body size. V02 normalizes art landmarks inside cells and allows no per-frame draw scale.</text><path d="M220 134h868M220 244h868M220 354h868M220 464h868" stroke="#f2c14e" stroke-width="2" stroke-dasharray="8 7" opacity=".55"/>${bars}<rect x="20" y="548" width="1160" height="46" rx="10" fill="#15111d" stroke="#ff405f"/><text x="40" y="576" fill="#fff" font-family="Arial,sans-serif" font-size="14" font-weight="700">TARGET: one body scale · y=458 visible-sole baseline · separate Arcane VFX · ≤3% apparent transition drift</text>${stateTags}</svg>`);

console.log('ALPHA 7.5 MILO SOURCE CORRECTION BUILT · 30 required states · scale/feet/effect gate · current drift evidence retained');
