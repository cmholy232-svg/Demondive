import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
const sourceRoot=resolve(root,'source-assets/a75/ui/hud-hierarchy');
const runtimeRoot=resolve(root,'public/assets/a75/ui/hud-hierarchy');
mkdirSync(sourceRoot,{recursive:true});mkdirSync(runtimeRoot,{recursive:true});

const frame=(width,height,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
const basePanel=(w,h,accent)=>`<path d="M4 4h${w-18}l10 10v${h-28}l-10 10H4Z" fill="#0b0912" fill-opacity=".9" stroke="${accent}" stroke-width="3"/>`;
const components={
  health:frame(420,48,`${basePanel(420,48,'#a43a4f')}<path d="M16 14h380v20H16z" fill="#24131a"/><path d="M16 14h318v20H16z" fill="#d84a5c"/><path d="M22 17h306v5H22z" fill="#ff8d9b" opacity=".55"/><text x="405" y="32" text-anchor="end" fill="#fff4ef" font-family="Arial,sans-serif" font-size="15" font-weight="700">96 / 120</text>`),
  energy:frame(360,38,`${basePanel(360,38,'#7651cc')}<path d="M14 12h324v14H14z" fill="#171027"/><path d="M14 12h238v14H14z" fill="#7c45e8"/><path d="M18 14h229v4H18z" fill="#c99cff" opacity=".55"/><text x="344" y="25" text-anchor="end" fill="#f2eaff" font-family="Arial,sans-serif" font-size="12" font-weight="700">74 / 100</text>`),
  xp:frame(300,30,`${basePanel(300,30,'#d2a84a')}<circle cx="18" cy="15" r="12" fill="#1c1727" stroke="#d2a84a" stroke-width="2"/><text x="18" y="20" text-anchor="middle" fill="#fff2a8" font-family="Arial,sans-serif" font-size="13" font-weight="700">27</text><path d="M36 10h246v10H36z" fill="#15121b"/><path d="M36 10h151v10H36z" fill="#d2a84a"/><text x="282" y="19" text-anchor="end" fill="#fff4c2" font-family="Arial,sans-serif" font-size="8" font-weight="700">GLOBAL DIVE LEVEL · +18 XP</text>`),
  boon:frame(190,52,`${basePanel(190,52,'#ff4f76')}<circle cx="28" cy="26" r="18" fill="#26101a" stroke="#ff4f76" stroke-width="3"/><text x="28" y="35" text-anchor="middle" fill="#ffd2a8" font-size="26">✦</text><text x="55" y="23" fill="#fff4ef" font-family="Arial,sans-serif" font-size="14" font-weight="700">PYRRA</text><text x="55" y="40" fill="#ff9bac" font-family="Arial,sans-serif" font-size="11">DOMINANT · ×3</text><circle cx="171" cy="18" r="6" fill="#19c8e8"/><circle cx="171" cy="34" r="6" fill="#82baff"/>`),
  special:frame(72,72,`<path d="M8 3h48l13 13v48l-8 5H8l-5-8V11Z" fill="#0b0912" fill-opacity=".92" stroke="#a78bfa" stroke-width="4"/><circle cx="36" cy="36" r="22" fill="#2a1747" stroke="#d7b7ff" stroke-width="3"/><text x="36" y="45" text-anchor="middle" fill="#fff" font-size="28">☾</text><path d="M11 62h50" stroke="#77e8cf" stroke-width="5"/><text x="62" y="16" text-anchor="end" fill="#fff" font-family="Arial,sans-serif" font-size="9" font-weight="700">K</text>`),
  objective:frame(330,44,`${basePanel(330,44,'#51c8dd')}<text x="18" y="18" fill="#7ee3ef" font-family="Arial,sans-serif" font-size="10" font-weight="700">CURRENT OBJECTIVE</text><text x="18" y="34" fill="#f2edf5" font-family="Arial,sans-serif" font-size="14">Break Nerissa’s three music pillars</text>`),
  wager:frame(350,66,`${basePanel(350,66,'#d2a84a')}<text x="18" y="20" fill="#fff2a8" font-family="Arial,sans-serif" font-size="11" font-weight="700">PERFECT BET · ACTIVE</text><text x="18" y="39" fill="#f4eef5" font-family="Arial,sans-serif" font-size="13">Clear without taking damage</text><text x="18" y="56" fill="#d2a84a" font-family="Arial,sans-serif" font-size="11">REWARD: DUPLICATE BOON STACK</text>`),
};

const runtime={};
for(const [id,svg] of Object.entries(components)){const name=`hud-${id}-v01.svg`;writeFileSync(resolve(runtimeRoot,name),svg);runtime[id]=`public/assets/a75/ui/hud-hierarchy/${name}`;}

// Inline each component in the presentation layouts. Some offline SVG renderers
// intentionally refuse nested file references, which made valid components look
// missing in QA contact sheets. Individual runtime SVGs are still emitted above.
const use=(id,x,y,w,h)=>{
  const source=components[id];
  const viewBox=source.match(/viewBox="([^"]+)"/)?.[1];
  const body=source.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1];
  if(!viewBox||body===undefined)throw new Error(`Cannot inline HUD component ${id}.`);
  return `<svg data-hud-component="${id}" x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${viewBox}">${body}</svg>`;
};
const desktop=frame(1280,720,`<defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#151229"/><stop offset="1" stop-color="#06060a"/></linearGradient></defs><rect width="1280" height="720" fill="url(#bg)"/><g opacity=".25" fill="#5d3e78"><path d="M0 540 180 330l190 210 220-300 230 300 210-250 250 250v180H0Z"/></g><rect x="0" y="650" width="1280" height="70" fill="#111219"/><g>${use('health',28,24,420,48)}${use('energy',28,76,360,38)}${use('xp',28,118,300,30)}${use('objective',922,24,330,44)}${use('boon',1062,78,190,52)}${use('special',1180,568,72,72)}</g><text x="28" y="176" fill="#8f879a" font-family="Arial,sans-serif" font-size="11">XP appears on gain/level-up, then fades. Secondary boon stacks live in pause/loadout.</text><rect x="20" y="16" width="1240" height="624" fill="none" stroke="#77e8cf" stroke-dasharray="8 8" opacity=".22"/><text x="640" y="708" text-anchor="middle" fill="#8f879a" font-family="Arial,sans-serif" font-size="10">DESKTOP MINIMAL COMBAT HUD · SAFE PLAYFIELD PRESERVED</text>`);
writeFileSync(resolve(sourceRoot,'UI_HUD_Desktop_Minimal_v01.svg'),desktop);

const mobile=frame(1280,720,`<defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#151229"/><stop offset="1" stop-color="#06060a"/></linearGradient></defs><rect width="1280" height="720" fill="url(#bg)"/><g opacity=".22" fill="#5d3e78"><path d="M0 540 180 330l190 210 220-300 230 300 210-250 250 250v180H0Z"/></g><rect x="0" y="650" width="1280" height="70" fill="#111219"/><rect x="34" y="18" width="1212" height="602" rx="22" fill="none" stroke="#77e8cf" stroke-dasharray="9 8" opacity=".32"/><g>${use('health',56,36,360,41)}${use('energy',56,80,310,33)}${use('objective',475,36,330,44)}${use('boon',1034,36,190,52)}${use('special',1095,540,72,72)}</g><circle cx="150" cy="560" r="78" fill="#77e8cf" opacity=".1" stroke="#77e8cf" stroke-width="3"/><circle cx="118" cy="560" r="23" fill="#77e8cf" opacity=".25"/><circle cx="182" cy="560" r="23" fill="#77e8cf" opacity=".25"/><g fill="#a78bfa" fill-opacity=".16" stroke="#a78bfa" stroke-width="3"><circle cx="1000" cy="575" r="34"/><circle cx="1068" cy="625" r="34"/><circle cx="1168" cy="625" r="34"/></g><text x="640" y="708" text-anchor="middle" fill="#8f879a" font-family="Arial,sans-serif" font-size="10">MOBILE LANDSCAPE · SAFE AREA + TOUCH OCCLUSION BUDGET</text>`);
writeFileSync(resolve(sourceRoot,'UI_HUD_MobileLandscape_Minimal_v01.svg'),mobile);

const full=frame(1280,720,`<rect width="1280" height="720" fill="#08070d"/><rect x="80" y="60" width="1120" height="600" rx="20" fill="#12101a" stroke="#7651cc" stroke-width="4"/><text x="120" y="112" fill="#fff" font-family="Arial,sans-serif" font-size="26" font-weight="700">PAUSED · RUN LOADOUT</text><g>${use('health',120,140,420,48)}${use('energy',120,196,360,38)}${use('xp',120,242,300,30)}${use('special',500,178,72,72)}${use('wager',760,140,350,66)}</g><text x="120" y="320" fill="#d7b7ff" font-family="Arial,sans-serif" font-size="17" font-weight="700">BOON STACKS</text><g font-family="Arial,sans-serif">${['Pyrra ×3 · dominant','Maris ×2','Crya ×1','Voltara ×1','Noctissa ×1'].map((text,i)=>`<rect x="120" y="${345+i*47}" width="470" height="36" rx="8" fill="#1b1725" stroke="${i===0?'#ff4f76':'#3a3247'}"/><text x="140" y="${369+i*47}" fill="${i===0?'#ffd2a8':'#d8d2df'}" font-size="14">${text}</text>`).join('')}</g><text x="650" y="320" fill="#7ee3ef" font-family="Arial,sans-serif" font-size="17" font-weight="700">RUN INFORMATION</text><g fill="#d8d2df" font-family="Arial,sans-serif" font-size="14"><text x="650" y="360">Seed: DD-7F3A-91C2</text><text x="650" y="390">Depth: 47 · Thousand Faces</text><text x="650" y="420">Elite powers: Frenzied II · Volatile I</text><text x="650" y="450">Wager: Perfect Bet</text><text x="650" y="480">Temporary wealth: 186</text><text x="650" y="510">Run time: 42:18</text></g><text x="640" y="638" text-anchor="middle" fill="#8f879a" font-family="Arial,sans-serif" font-size="11">FULL INFORMATION IS PAUSE/MENU CONTENT, NOT PERMANENT COMBAT CLUTTER</text>`);
writeFileSync(resolve(sourceRoot,'UI_HUD_Pause_FullInformation_v01.svg'),full);

const manifest={version:1,status:'source-ready-correction-pending',humanApproved:false,runtime,sourceLayouts:{desktopMinimal:'source-assets/a75/ui/hud-hierarchy/UI_HUD_Desktop_Minimal_v01.svg',mobileLandscapeMinimal:'source-assets/a75/ui/hud-hierarchy/UI_HUD_MobileLandscape_Minimal_v01.svg',pauseFull:'source-assets/a75/ui/hud-hierarchy/UI_HUD_Pause_FullInformation_v01.svg'},qaContactSheet:'source-assets/a75/ui/hud-hierarchy/QA_HUDHierarchy_ContactSheet_v01.png',inventory:[
  {id:'health',classification:'always-essential',rule:'visible during combat; damage/heal animation belongs to Alpha 7.6'},
  {id:'energy',classification:'always-essential',rule:'visible during combat; Special spend/ready relationship must be immediate'},
  {id:'special',classification:'always-essential',rule:'compact equipped Special and ready/cooldown state'},
  {id:'objective',classification:'contextually-essential',rule:'show boss mechanics, sealed-room objective or explicit route task only'},
  {id:'wager',classification:'contextually-essential',rule:'show accepted condition; collapse after completion/failure'},
  {id:'dominant-boon',classification:'always-essential',rule:'one dominant identity plus count; at most two secondary color pips'},
  {id:'secondary-boons',classification:'pause-menu-information',rule:'full list and descriptions live in loadout/pause'},
  {id:'global-xp',classification:'temporary-notification',rule:'thin bar appears on XP gain or level-up, then fades; never competes with survival information'},
  {id:'currency',classification:'temporary-notification',rule:'show on gain/spend and in pause, not continuously unless a wager uses it'},
  {id:'seed-depth-run-time',classification:'pause-menu-information',rule:'available in full information view and run summary'},
  {id:'rush-payout-announcer',classification:'removable',rule:'text-only event feed until final announcer direction is approved'},
]};
writeFileSync(resolve(runtimeRoot,'hud-hierarchy-manifest-v01.json'),`${JSON.stringify(manifest,null,2)}\n`);
console.log('ALPHA 7.5 HUD HIERARCHY SOURCES BUILT · 7 components · desktop/mobile minimal · full pause information');
