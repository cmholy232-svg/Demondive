import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..'),sourceRoot=resolve(root,'source-assets/a75/ui/boon-sigils'),runtimeRoot=resolve(root,'public/assets/a75/ui/boon-sigils');mkdirSync(sourceRoot,{recursive:true});mkdirSync(runtimeRoot,{recursive:true});
const boons=[
  ['pyrra','#ff4f76','#ffd2a8','✦'],['maris','#19c8e8','#b9f6ff','≈'],['gaia','#b77b4a','#f1d095','◆'],['zephyra','#77e8cf','#ecfff8','↝'],['flora','#64d879','#ff8fbd','✿'],
  ['voltara','#f6df45','#fff9bd','ϟ'],['crya','#82baff','#e8f5ff','❄'],['luna','#a78bfa','#f4e9ff','☾'],['solara','#fff06a','#ffffff','☀'],['belladonna','#ff5ba7','#ffe0b2','∞'],
  ['nerissa','#36c9ff','#ff9be6','♫'],['roxyne','#e35b58','#ffc7a5','≻'],['calyptra','#e97cff','#ffe36e','♦'],['isolde','#8ee7ff','#f5fdff','◇'],['somnia','#bc7cff','#ffd8f5','◌'],
  ['vespera','#d7b7ff','#ffffff','◈'],['aurelia','#f7be3e','#fff2a8','¤'],['noctissa','#5c5be8','#d9d5ff','◐'],['lilith','#b90f4a','#ff9aa9','♥'],['seraphine','#fff19a','#ffffff','✧'],
];
const esc=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const polygon=(count,radius,rotation=0)=>Array.from({length:count},(_,index)=>{const angle=rotation+Math.PI*2*index/count;return `${(64+Math.cos(angle)*radius).toFixed(2)},${(64+Math.sin(angle)*radius).toFixed(2)}`}).join(' ');
const manifest={version:1,status:'integrated-correction-pending',humanApproved:false,sigils:[]};
boons.forEach(([id,color,accent,glyph],index)=>{
  const spokes=3+index%6,inner=polygon(spokes,30,-Math.PI/2),outer=polygon(spokes,49,-Math.PI/2+(index%2?Math.PI/spokes:0));
  const nodes=Array.from({length:spokes},(_,node)=>{const angle=-Math.PI/2+Math.PI*2*node/spokes,cx=64+Math.cos(angle)*48,cy=64+Math.sin(angle)*48;return `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${index%3===0?4:3}" fill="${accent}"/>`;}).join('');
  const rays=Array.from({length:spokes},(_,node)=>{const angle=-Math.PI/2+Math.PI*2*node/spokes,x=64+Math.cos(angle)*42,y=64+Math.sin(angle)*42;return `<path d="M64 64L${x.toFixed(2)} ${y.toFixed(2)}"/>`;}).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><radialGradient id="g"><stop stop-color="${color}" stop-opacity=".38"/><stop offset="1" stop-color="${color}" stop-opacity=".04"/></radialGradient></defs><circle cx="64" cy="64" r="59" fill="url(#g)" stroke="${color}" stroke-width="5"/><polygon points="${outer}" fill="none" stroke="${accent}" stroke-width="2" opacity=".68"/><g stroke="${color}" stroke-width="3" opacity=".48">${rays}</g><polygon points="${inner}" fill="#0b0912" stroke="${color}" stroke-width="4"/>${nodes}<text x="64" y="75" text-anchor="middle" font-family="Georgia,serif" font-size="42" font-weight="700" fill="${accent}">${esc(glyph)}</text></svg>`;
  const sourceName=`SIGIL_${id.toUpperCase()}_v01.svg`,runtimeName=`sigil-${id}-v01.svg`;writeFileSync(resolve(sourceRoot,sourceName),svg);writeFileSync(resolve(runtimeRoot,runtimeName),svg);
  manifest.sigils.push({id,color,accent,glyph,spokes,source:`source-assets/a75/ui/boon-sigils/${sourceName}`,runtime:`public/assets/a75/ui/boon-sigils/${runtimeName}`,status:'integrated-correction-pending',humanApproved:false});
  console.log(`PASS ${id.padEnd(10)} ${spokes}-point sigil · ${glyph}`);
});
writeFileSync(resolve(runtimeRoot,'boon-sigil-manifest-v01.json'),`${JSON.stringify(manifest,null,2)}\n`);console.log('ALPHA 7.5 BOON SIGILS BUILT · 20 distinct vector identities');
