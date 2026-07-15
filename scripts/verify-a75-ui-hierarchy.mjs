import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..'),manifest=JSON.parse(await readFile(resolve(root,'public/assets/a75/ui/hud-hierarchy/hud-hierarchy-manifest-v01.json'),'utf8'));
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
assert(manifest.status==='source-ready-correction-pending'&&manifest.humanApproved===false,'HUD package may not claim final approval.');
assert(Object.keys(manifest.runtime).length===7,'HUD package requires seven runtime components.');
assert(manifest.inventory.length===11,'HUD inventory changed without hierarchy review.');
const classifications=new Set(manifest.inventory.map(x=>x.classification));
for(const required of ['always-essential','contextually-essential','temporary-notification','pause-menu-information','removable'])assert(classifications.has(required),`HUD inventory lacks ${required}.`);
assert(manifest.inventory.find(x=>x.id==='global-xp')?.classification==='temporary-notification','Global XP must not become permanent combat clutter.');
assert(manifest.inventory.find(x=>x.id==='secondary-boons')?.classification==='pause-menu-information','Full boon list must remain outside the minimal combat HUD.');
for(const path of [...Object.values(manifest.runtime),...Object.values(manifest.sourceLayouts)]){const info=await stat(resolve(root,path));assert(info.isFile()&&info.size>0,`Missing HUD asset ${path}.`);const svg=await readFile(resolve(root,path),'utf8');assert(!/<script\b|(?:href|src)\s*=\s*["']https?:/i.test(svg),`HUD asset ${path} has external/script content.`);}

const expectedReferences={desktopMinimal:6,mobileLandscapeMinimal:5,pauseFull:5};
for(const [layoutId,path] of Object.entries(manifest.sourceLayouts)){
  const absolute=resolve(root,path);
  const svg=await readFile(absolute,'utf8');
  const inlined=[...svg.matchAll(/<svg\b[^>]*\bdata-hud-component=["']([^"']+)["']/gi)].map(match=>match[1]);
  assert(inlined.length===expectedReferences[layoutId],`${layoutId} expected ${expectedReferences[layoutId]} inlined HUD components, found ${inlined.length}.`);
  assert(!/<image\b/i.test(svg),`${layoutId} may not depend on renderer-sensitive nested SVG files.`);
  for(const id of inlined)assert(manifest.runtime[id],`${layoutId} contains unknown HUD component ${id}.`);
}
const contactSheet=await stat(resolve(root,manifest.qaContactSheet)).catch(()=>null);
assert(contactSheet?.isFile()&&contactSheet.size>0,'HUD QA contact sheet is missing.');
console.log('ALPHA 7.5 HUD HIERARCHY QA PASSED · minimal combat priorities · contextual XP/wager/objective · mobile-safe source');
