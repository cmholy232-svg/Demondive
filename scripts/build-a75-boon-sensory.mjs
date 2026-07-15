import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourceRoot = resolve(root, 'source-assets/a75/vfx/boon-sensory');
const runtimeRoot = resolve(root, 'public/assets/a75/vfx/boon-sensory');
mkdirSync(sourceRoot, { recursive: true });
mkdirSync(runtimeRoot, { recursive: true });

const boons = [
  {id:'pyrra',name:'Pyrra',color:'#ff4f76',accent:'#ffd2a8',glyph:'✦',shape:'flame',motion:'surging straight shot with rising ember peel',impact:'burn bloom and delayed micro-explosion',status:'burn',special:'radial flame nova',sfx:'dry ignition snap, hot mid crackle, compact bass bloom',stack:'longer flame body, denser embers, larger delayed bloom',consolidate:'one dominant flame body; cap ember sprites and scale bloom intensity'},
  {id:'maris',name:'Maris',color:'#19c8e8',accent:'#b9f6ff',glyph:'≈',shape:'orb',motion:'buoyant heavy orb with trailing droplets',impact:'forward tidal shove and splash fan',status:'push',special:'ground-hugging returning wave',sfx:'rounded water thump, short splash, low rushing tail',stack:'orb grows and gains visible pressure rings',consolidate:'merge droplets into one ribbon trail and one pressure ring'},
  {id:'gaia',name:'Gaia',color:'#b77b4a',accent:'#f1d095',glyph:'◆',shape:'boulder',motion:'slow weighty tumble with dust wake',impact:'angular fracture and stone chunks',status:'armor',special:'broad stone barrier and shard retaliation',sfx:'dense stone launch, blunt crack, short rubble fall',stack:'larger mass, wider cracks, deeper impact',consolidate:'cap chunks; increase silhouette mass and fracture scale'},
  {id:'zephyra',name:'Zephyra',color:'#77e8cf',accent:'#ecfff8',glyph:'↝',shape:'needle',motion:'extremely fast thin piercer with forked air line',impact:'clean pass-through slice',status:'haste',special:'two-sided reflecting crosswind',sfx:'bright needle zip, airy tick, reverse gust on reflect',stack:'additional angled needles at explicit thresholds',consolidate:'render a bounded fan with shared trail instead of independent ribbons'},
  {id:'flora',name:'Flora',color:'#64d879',accent:'#ff8fbd',glyph:'✿',shape:'seed',motion:'spinning thorn seed with curling vine trace',impact:'plant thorn mark, then petal-thorn burst',status:'thorn mark',special:'lane-long root lash',sfx:'taut vine pluck, organic seed hit, thorn pop',stack:'marks bloom sooner and spread farther',consolidate:'one mark with numeric petals; one shared spread burst'},
  {id:'voltara',name:'Voltara',color:'#f6df45',accent:'#fff9bd',glyph:'ϟ',shape:'spark',motion:'jittering bolt with hard angular forks',impact:'target-to-target chain flash',status:'stun',special:'automatic multi-target arc chain',sfx:'sharp electric snap, pitched chain ticks, short thunder cap',stack:'more chain nodes and return arcs',consolidate:'shared lightning graph with capped visible branches'},
  {id:'crya',name:'Crya',color:'#82baff',accent:'#e8f5ff',glyph:'❄',shape:'shard',motion:'rigid crystal dart with powder wake',impact:'frost star, buildup ring, violent shatter',status:'freeze',special:'wide crystalline freeze cone',sfx:'glass whistle, icy lock chirp, brittle shatter',stack:'faster frost buildup and larger shatter facets',consolidate:'one freeze shell and bounded shard burst'},
  {id:'luna',name:'Luna',color:'#a78bfa',accent:'#f4e9ff',glyph:'☾',shape:'crescent',motion:'soft crescent wobble with delayed ghost copy',impact:'third-hit dream seal and damage echo',status:'dream mark',special:'suspending sleep pulse',sfx:'muted bell onset, reversed whisper tail, soft echo knock',stack:'brighter repeated ghost and broader mark detonation',consolidate:'one delayed echo silhouette with stack numeral'},
  {id:'solara',name:'Solara',color:'#fff06a',accent:'#ffffff',glyph:'☀',shape:'lance',motion:'perfectly straight high-speed light lance',impact:'thin piercing star and elite brand',status:'radiance',special:'vertical target-locked light column',sfx:'clean laser crack, glass-bright pierce, choir-like column sting',stack:'longer lance, sharper core, lingering target field',consolidate:'one white-hot core with bounded corona'},
  {id:'belladonna',name:'Belladonna',color:'#ff5ba7',accent:'#ffe0b2',glyph:'∞',shape:'maw',motion:'hungry pulsing bolt that swells after pickups',impact:'biting ring and resource-fed burst',status:'rush',special:'feeding-frenzy momentum state',sfx:'wet bite click, rising appetite pulse, rushing heartbeat',stack:'faster pulse and stronger shield-fed bite',consolidate:'single maw silhouette; pulse rate communicates momentum'},
  {id:'nerissa',name:'Nerissa',color:'#36c9ff',accent:'#ff9be6',glyph:'♫',shape:'note',motion:'curved homing note on a visible siren thread',impact:'heart-note charm ripple',status:'charm',special:'piercing line-forming charm note',sfx:'short vocal pluck, bending note glide, harmonic charm resolve',stack:'tighter homing curve and stronger harmonic trail',consolidate:'one primary note with a two-line harmonic trail'},
  {id:'roxyne',name:'Roxyne',color:'#e35b58',accent:'#ffc7a5',glyph:'≻',shape:'fang',motion:'low predatory dart with targeting slash',impact:'isolated-target claw mark',status:'predator mark',special:'invulnerable lane pounce',sfx:'bowstring snap, claw slice, low hunt growl',stack:'deeper mark and longer pounce streak',consolidate:'one target reticle; scale slash weight instead of count'},
  {id:'calyptra',name:'Calyptra',color:'#e97cff',accent:'#ffe36e',glyph:'♦',shape:'die',motion:'tumbling faceted shot with disclosed power-band halo',impact:'visible low, high or jackpot burst',status:'luck band',special:'roulette result wheel',sfx:'dice clack, rising casino ticks, unmistakable jackpot bell',stack:'favorable bands brighten and jackpot acquires gold crown',consolidate:'one band color and one result label; no particle multiplication'},
  {id:'isolde',name:'Isolde',color:'#8ee7ff',accent:'#f5fdff',glyph:'◇',shape:'prism',motion:'faceted prism bolt with geometric bounce preview',impact:'clean ricochet angle spark',status:'echo angle',special:'crystal firing clone',sfx:'crystal tap, stereo ricochet ping, clone glass swell',stack:'more bounce notches and a second echo silhouette',consolidate:'shared polyline path with bounded corner sparks'},
  {id:'somnia',name:'Somnia',color:'#bc7cff',accent:'#ffd8f5',glyph:'◌',shape:'echo',motion:'soft bolt followed by time-offset translucent copies',impact:'layered delayed pulse',status:'delay',special:'illusion decoy that repeats casts',sfx:'soft attack, delayed duplicate taps, velvety decoy swell',stack:'additional timing notches and stronger decoy cadence',consolidate:'maximum two visible ghosts; timing ticks represent extra echoes'},
  {id:'vespera',name:'Vespera',color:'#d7b7ff',accent:'#ffffff',glyph:'◈',shape:'mirror',motion:'razor mirror chip with reflected highlight',impact:'symmetrical shard fan',status:'reflect',special:'timed mirror shield',sfx:'metallic glass flick, mirror crack, reversed projectile return',stack:'broader shard fan and longer shield facet glow',consolidate:'one bounded fan mesh and shield timer rim'},
  {id:'aurelia',name:'Aurelia',color:'#f7be3e',accent:'#fff2a8',glyph:'¤',shape:'coin',motion:'spinning gilded disk with tiny value ticks',impact:'coin-star payout sparkle',status:'wealth',special:'wealth-consuming extraction blast',sfx:'solid coin spin, cash register tick, deep golden payout',stack:'thicker rim and richer but capped payout halo',consolidate:'one disk and numeric value; cap coin particles'},
  {id:'noctissa',name:'Noctissa',color:'#5c5be8',accent:'#d9d5ff',glyph:'◐',shape:'shadow',motion:'dark core dragging a lingering floor-skimming trail',impact:'silent shadow tear',status:'shadow trail',special:'damaging lane blink',sfx:'filtered launch hush, cloth-rip impact, sub-bass blink arrival',stack:'longer path and one echo lane at threshold',consolidate:'single pooled trail strip with intensity gradient'},
  {id:'lilith',name:'Lilith',color:'#b90f4a',accent:'#ff9aa9',glyph:'♥',shape:'heart',motion:'barbed blood heart with inward-pulling droplets',impact:'life-drain tether and blood shield return',status:'blood pact',special:'nearby drain burst',sfx:'heavy heartbeat, liquid tether pull, shielded heartbeat resolve',stack:'thicker tether and stronger low-health heartbeat',consolidate:'one tether per target class; cap droplets and use shield fill'},
  {id:'seraphine',name:'Seraphine',color:'#fff19a',accent:'#ffffff',glyph:'✧',shape:'halo',motion:'orbiting halo fragment that periodically releases a ray',impact:'four-point sanctified flare',status:'ward charge',special:'hit-negating halo field',sfx:'soft metallic chime, radiant tick, full ward chord',stack:'more charge notches and faster orbit cadence',consolidate:'one orbit ring with charge pips; cap independent fragments'},
];

const escapeXml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const shell = (body, color) => `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="18" fill="#0b0912"/><circle cx="64" cy="64" r="52" fill="${color}" opacity=".08"/>${body}</svg>`;

const projectile = (boon) => {
  const c=boon.color,a=boon.accent;
  const shapes={
    flame:`<path d="M20 70C40 45 50 27 51 12c16 15 23 30 18 46 10-9 16-18 18-30 13 24 9 50-12 65-19 14-44 8-55-23Z" fill="${c}"/><path d="M42 78c8-18 15-27 21-39 8 16 8 29-3 43Z" fill="${a}"/>`,
    orb:`<path d="M16 69Q40 43 69 47t43 17Q88 87 58 91T16 69Z" fill="${c}"/><circle cx="72" cy="64" r="18" fill="${a}" opacity=".8"/><circle cx="28" cy="91" r="6" fill="${c}" opacity=".6"/>`,
    boulder:`<path d="M26 46 54 22 91 30 109 61 91 99 49 105 19 76Z" fill="${c}" stroke="${a}" stroke-width="5"/><path d="m52 27 8 31-30 15m30-15 29 9-4 28" fill="none" stroke="#0b0912" stroke-width="5"/>`,
    needle:`<path d="M10 68 111 48 82 68l29 20Z" fill="${c}" stroke="${a}" stroke-width="3"/><path d="M10 68h74" stroke="${a}" stroke-width="4"/>`,
    seed:`<path d="M64 18c30 20 35 56 0 92-35-36-30-72 0-92Z" fill="${c}" stroke="${a}" stroke-width="4"/><path d="M64 33v61M41 52l23 15 24-16" fill="none" stroke="#0b0912" stroke-width="5"/>`,
    spark:`<path d="m70 9-38 56h26l-10 54 48-67H70Z" fill="${c}" stroke="${a}" stroke-width="4"/><path d="M20 35l18 12M95 83l18 12" stroke="${a}" stroke-width="5"/>`,
    shard:`<path d="m64 8 25 48-25 64-25-64Z" fill="${c}" stroke="${a}" stroke-width="4"/><path d="m64 8 1 86M39 56l26 38 24-38" fill="none" stroke="white" stroke-opacity=".55" stroke-width="3"/>`,
    crescent:`<path d="M93 17c-33 7-47 34-37 60 8 22 30 32 53 25-16 20-47 23-69 5-26-21-29-60-7-86C49 3 74 1 93 17Z" fill="${c}" stroke="${a}" stroke-width="4"/><path d="M16 68h25" stroke="${a}" stroke-width="4" opacity=".5"/>`,
    lance:`<path d="M8 64 88 44l31 20-31 20Z" fill="${c}"/><path d="M14 64h102" stroke="${a}" stroke-width="7"/><circle cx="103" cy="64" r="9" fill="white"/>`,
    maw:`<path d="M14 64Q36 21 80 31l34 33-34 33Q36 107 14 64Z" fill="${c}"/><path d="m37 47 15 15 15-20 13 20 17-14M37 80l15-15 15 20 13-20 17 14" fill="none" stroke="${a}" stroke-width="6"/>`,
    note:`<path d="M45 29v60c0 14-24 18-29 5-5-14 12-26 29-20V18l51-10v58c0 14-24 18-29 5-5-14 12-26 29-20V28Z" fill="${c}" stroke="${a}" stroke-width="4"/>`,
    fang:`<path d="M15 65 95 21 72 58l42 6-42 7 23 36Z" fill="${c}" stroke="${a}" stroke-width="4"/><path d="M23 65h70" stroke="#0b0912" stroke-width="5"/>`,
    die:`<path d="m64 13 44 25v51l-44 26-44-26V38Z" fill="${c}" stroke="${a}" stroke-width="5"/><circle cx="45" cy="49" r="6" fill="#0b0912"/><circle cx="82" cy="79" r="6" fill="#0b0912"/><circle cx="63" cy="64" r="6" fill="${a}"/>`,
    prism:`<path d="m64 10 49 54-49 54L15 64Z" fill="${c}" stroke="${a}" stroke-width="5"/><path d="m64 10 1 108M15 64h98" stroke="white" stroke-opacity=".5" stroke-width="4"/>`,
    echo:`<circle cx="73" cy="64" r="34" fill="${c}" opacity=".25"/><circle cx="57" cy="64" r="28" fill="${c}" opacity=".5"/><circle cx="42" cy="64" r="21" fill="${a}"/><path d="M17 64h81" stroke="${c}" stroke-width="4" opacity=".45"/>`,
    mirror:`<path d="m64 8 44 56-44 56L20 64Z" fill="${c}" stroke="${a}" stroke-width="5"/><path d="m64 8 10 48 34 8-34 8-10 48-10-48-34-8 34-8Z" fill="white" opacity=".32"/>`,
    coin:`<ellipse cx="64" cy="64" rx="34" ry="51" fill="${c}" stroke="${a}" stroke-width="6"/><ellipse cx="64" cy="64" rx="18" ry="37" fill="#0b0912" opacity=".4"/><text x="64" y="77" text-anchor="middle" font-size="38" font-weight="700" fill="${a}">¤</text>`,
    shadow:`<path d="M10 74c27-31 54-43 104-22-18 9-21 22-4 38-44 17-74 5-100-16Z" fill="${c}"/><path d="M8 92h80" stroke="${c}" stroke-width="12" opacity=".3"/><circle cx="88" cy="62" r="8" fill="${a}"/>`,
    heart:`<path d="M64 111 19 68C-5 36 31 11 55 36l9 10 9-10c24-25 60 0 36 32Z" fill="${c}" stroke="${a}" stroke-width="5"/><path d="M20 64h28l8-17 14 37 9-20h29" fill="none" stroke="${a}" stroke-width="5"/>`,
    halo:`<ellipse cx="64" cy="40" rx="46" ry="20" fill="none" stroke="${a}" stroke-width="8"/><path d="m64 18 9 35 34 11-34 10-9 36-10-36-34-10 34-11Z" fill="${c}" opacity=".8"/><circle cx="64" cy="64" r="13" fill="${a}"/>`,
  };
  return shell(shapes[boon.shape], c);
};

const impact = (boon, index) => {
  const rays=6+(index%5), paths=Array.from({length:rays},(_,i)=>{const angle=Math.PI*2*i/rays,inner=24+(i%2)*8,outer=48-(i%3)*5;return `<path d="M${64+Math.cos(angle)*inner} ${64+Math.sin(angle)*inner}L${64+Math.cos(angle)*outer} ${64+Math.sin(angle)*outer}"/>`;}).join('');
  return shell(`<g stroke="${boon.color}" stroke-width="${3+index%3}" stroke-linecap="round">${paths}</g><circle cx="64" cy="64" r="${18+index%4*3}" fill="${boon.color}" opacity=".32" stroke="${boon.accent}" stroke-width="4"/><text x="64" y="73" text-anchor="middle" font-size="28" font-weight="700" fill="${boon.accent}">${escapeXml(boon.glyph)}</text>`,boon.color);
};

const status = (boon, index) => shell(`<circle cx="64" cy="64" r="42" fill="none" stroke="${boon.color}" stroke-width="7" stroke-dasharray="${8+index%5} ${4+index%3}"/><path d="M64 16v12M64 100v12M16 64h12M100 64h12" stroke="${boon.accent}" stroke-width="4"/><text x="64" y="79" text-anchor="middle" font-size="45" font-weight="700" fill="${boon.accent}">${escapeXml(boon.glyph)}</text>`,boon.color);
const special = (boon, index) => shell(`<circle cx="64" cy="64" r="49" fill="none" stroke="${boon.color}" stroke-width="5"/><circle cx="64" cy="64" r="${21+index%4*4}" fill="${boon.color}" opacity=".36" stroke="${boon.accent}" stroke-width="4"/><path d="M64 5 71 34 99 20 91 49 123 56 94 70 110 97 78 90 64 123 50 90 18 97 34 70 5 56 37 49 29 20 57 34Z" fill="none" stroke="${boon.accent}" stroke-width="2" opacity=".55"/><text x="64" y="78" text-anchor="middle" font-size="40" font-weight="700" fill="${boon.accent}">${escapeXml(boon.glyph)}</text>`,boon.color);

const manifest={version:1,status:'source-ready-correction-pending',humanApproved:false,packages:[]};
boons.forEach((boon,index)=>{
  const directory=resolve(runtimeRoot,boon.id);mkdirSync(directory,{recursive:true});
  const parts={projectile:projectile(boon),impact:impact(boon,index),status:status(boon,index),special:special(boon,index)};
  const runtime={};
  for(const [kind,svg] of Object.entries(parts)){
    const name=`boon-${boon.id}-${kind}-v01.svg`;writeFileSync(resolve(directory,name),svg);runtime[kind]=`public/assets/a75/vfx/boon-sensory/${boon.id}/${name}`;
  }
  const board=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="192" viewBox="0 0 640 192"><rect width="640" height="192" fill="#16131e"/><text x="18" y="26" fill="${boon.accent}" font-size="18" font-family="Arial,sans-serif" font-weight="700">${boon.name.toUpperCase()}</text><text x="18" y="47" fill="#aaa1b8" font-size="11" font-family="Arial,sans-serif">${escapeXml(boon.motion)}</text>${Object.values(parts).map((svg,i)=>`<g transform="translate(${10+i*156} 56)">${svg.replace(/^<svg[^>]*>|<\/svg>$/g,'')}</g>`).join('')}<g fill="#d8d2df" font-family="Arial,sans-serif" font-size="10" text-anchor="middle"><text x="74" y="187">PROJECTILE</text><text x="230" y="187">IMPACT</text><text x="386" y="187">STATUS</text><text x="542" y="187">SPECIAL</text></g></svg>`;
  const boardName=`BOON_${boon.id.toUpperCase()}_SensoryBoard_v01.svg`;writeFileSync(resolve(sourceRoot,boardName),board);
  manifest.packages.push({...boon,sourceBoard:`source-assets/a75/vfx/boon-sensory/${boardName}`,runtime,status:'source-ready-correction-pending',humanApproved:false});
  console.log(`PASS ${boon.id.padEnd(10)} projectile · impact · status · special`);
});
writeFileSync(resolve(runtimeRoot,'boon-sensory-manifest-v01.json'),`${JSON.stringify(manifest,null,2)}\n`);
console.log('ALPHA 7.5 BOON SENSORY SOURCES BUILT · 20 identities · 80 runtime components');
