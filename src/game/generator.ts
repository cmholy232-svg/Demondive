import { ENEMY_BODIES, FLOOR_Y, HEIGHT, LEVEL_EIGHT_ENCOUNTERS, LEVEL_FIVE_ENCOUNTERS, LEVEL_FOUR_ENCOUNTERS, LEVEL_NINE_ENCOUNTERS, LEVEL_ONE_ENCOUNTERS, LEVEL_SEVEN_ENCOUNTERS, LEVEL_SIX_ENCOUNTERS, LEVEL_THREE_ENCOUNTERS, LEVEL_TWO_ENCOUNTERS, WIDTH } from './content';
import { desiredEnemyCount } from './difficulty';
import { createRunSeed, SeededRandom } from './rng';
import type { RandomSource } from './rng';
import { buildRoomQualityMetadata } from './room-metadata';
import { validateRoomTraversal } from './room-quality';
import type { EnemySpawn, EnemyType, GateSide, GeneratedRunPlan, Hazard, Rect, RoomDefinition, RoomType, RouteChoice, RouteKind, WagerType } from './types';

const directions: Record<GateSide, { x: number; y: number; opposite: GateSide }> = {
  left: { x: -1, y: 0, opposite: 'right' }, right: { x: 1, y: 0, opposite: 'left' },
  top: { x: 0, y: -1, opposite: 'bottom' }, bottom: { x: 0, y: 1, opposite: 'top' },
};
const levelOneNames = ['Neon Maw Arcade', 'Last Bite Alley', 'Soulpipe Crossing', 'The Velvet Boiler', 'Bottomless Food Court', 'Hollow Guest Lounge', 'Afterhours Arcade', 'Living Billboard Row', 'Club Gremlin Exchange', 'The Hungry Belfry'];
const levelTwoNames = ['Blackwater Processional', 'Pearl Lung Gallery', 'Sunken Garden Row', 'Amp Reef', 'The Hundred-Year Encore', 'Tideglass Promenade', 'The Submerged Balcony', 'Chorus Trench', 'Moonpool Backstage', 'Adoring Deep'];
const levelThreeNames = ['Briar Processional', 'Hunter\'s Ruin', 'Bloodroot Crossing', 'Ashen Antler Grove', 'The Strangling Path', 'Fangvine Terrace', 'Hollow Trunk Row', 'Predator\'s Canopy', 'The Red Thicket', 'Last Trail Glade'];
const levelFourNames = ['Loaded Boulevard', 'Jackpot Skyline', 'House Edge Terrace', 'Fortune Rail', 'The Velvet Table', 'Roulette Promenade', 'Lucky Seven Overpass', 'Jinxed Penthouse', 'Cardbridge Row', 'Thunder Ante'];
const levelFiveNames = ['Frozen Nave', 'Reliquary Walk', 'Stillglass Transept', 'The Pale Processional', 'Rimebound Cloister', 'Preserved Choir', 'Saint of Shards', 'The Motionless Bell', 'Ice-Veil Gallery', 'Last Memory Aisle'];
const levelSixNames = ['Vacancy Forever', 'Room 237 Again', 'The Infinite Ice Machine', 'Wake-Up Call Hall', 'Velvet Check-In', 'The Same Stairwell', 'Noon at Midnight', 'The Unending Balcony', 'Dream Key Row', 'Checkout Never'];
const levelSevenNames = ['Avenue of Borrowed Smiles', 'The Looking-Glass Ward', 'False Self Plaza', 'Prism Alley', 'The Unblinking Gallery', 'Echo-Skin Row', 'Silver Tongue Crossing', 'The Mask Exchange', 'Refraction Heights', 'A Thousandth Face'];
const levelEightNames = ['Black-Crown Processional', 'The Empty Victory Hall', 'Succubus Gallery', 'Earthward Portal', 'Royal Blood Aisle', 'The Queen\'s Long Shadow', 'Hollowed Audience Chamber', 'Commandment Row', 'Last Loyal Balcony', 'Ashes Before the Throne'];
const levelNineNames = ['Milo\'s Apartment, Wrong', 'The Broken Hub', 'Memory of the Neon Maw', 'A Door That Opens Inward', 'The Unsent Message', 'Hell in the Television', 'The Hall of Avoided Selves', 'Impossible Stairwell', 'The Room Beneath the Room', 'Morning, Almost'];
const ground: Rect = { x: 0, y: FLOOR_Y, w: WIDTH, h: HEIGHT - FLOOR_Y };
const p = (x: number, y: number, w: number): Rect => ({ x, y, w, h: 20 });
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

interface Anchor { x: number; y: number; }
interface RoomBox { id: string; minDepth: number; platforms: Rect[]; hazards: Hazard[]; anchors: Anchor[]; }

// A small authored room grammar beats a large bag of arbitrary ledges. These
// six silhouettes use a consistent 85–115px vertical rhythm and broad landing
// zones, then mirror and vary enemy/hazard pressure. Difficulty comes from the
// fight and route—not from late-run platform soup.
const BOXES: RoomBox[] = [
  { id:'low-wave', minDepth:1, platforms:[ground,p(135,540,225),p(455,445,225),p(775,540,225),p(1040,445,175)], hazards:[], anchors:[{x:205,y:490},{x:525,y:395},{x:845,y:490},{x:1085,y:395}] },
  { id:'ascending', minDepth:1, platforms:[ground,p(125,545,220),p(410,455,215),p(690,365,215),p(970,455,205)], hazards:[], anchors:[{x:190,y:495},{x:475,y:405},{x:755,y:315},{x:1030,y:405}] },
  { id:'central-arena', minDepth:1, platforms:[ground,p(120,485,255),p(510,375,260),p(900,485,255)], hazards:[], anchors:[{x:195,y:435},{x:585,y:325},{x:975,y:435}] },
  { id:'two-lane', minDepth:1, platforms:[ground,p(125,535,230),p(410,425,220),p(700,535,230),p(985,425,185),p(515,270,220)], hazards:[], anchors:[{x:195,y:485},{x:480,y:375},{x:770,y:485},{x:1040,y:375},{x:580,y:220}] },
  { id:'zigzag', minDepth:1, platforms:[ground,p(135,510,210),p(405,400,210),p(675,510,210),p(945,400,210)], hazards:[{type:'spikes',x:585,y:626,w:70,h:24,damage:14}], anchors:[{x:195,y:460},{x:465,y:350},{x:735,y:460},{x:1005,y:350}] },
  { id:'tower-spine', minDepth:1, platforms:[ground,p(145,535,235),p(465,430,235),p(785,325,235),p(1035,500,175)], hazards:[], anchors:[{x:215,y:485},{x:535,y:380},{x:855,y:275},{x:1080,y:450}] },
];

function shuffle<T>(values: T[], rng: RandomSource): T[] { return rng.shuffle(values); }

function gateRect(side: GateSide): Rect {
  if (side === 'left') return { x: 0, y: 500, w: 58, h: 130 };
  if (side === 'right') return { x: WIDTH - 58, y: 500, w: 58, h: 130 };
  if (side === 'top') return { x: 598, y: 0, w: 84, h: 92 };
  return { x: 598, y: FLOOR_Y - 8, w: 84, h: HEIGHT - FLOOR_Y + 8 };
}

function playerStart(side: GateSide) {
  if (side === 'left') return { x: 72, y: 545 };
  if (side === 'right') return { x: WIDTH - 114, y: 545 };
  if (side === 'top') return { x: 620, y: 66 };
  return { x: 620, y: 545 };
}

function enemyForDifficulty(difficulty: number, depth: number, rng: RandomSource): EnemyType {
  const r = rng.next(); const power = difficulty + depth * 1.35;
  if (depth === 2) {
    if (power > 11 && r < .15) return 'spotlightDancer';
    if (power > 9 && r < .32) return 'bubbleCrab';
    if (power > 7 && r < .49) return 'courtCantor';
    if (power > 5 && r < .66) return 'reefHound';
    return r < .84 ? 'chorusWisp' : 'drownedFan';
  }
  if (depth === 3) {
    if (power > 12 && r < .16) return 'thornArcher';
    if (power > 10 && r < .33) return 'rootMaw';
    if (power > 8 && r < .5) return 'razorBoar';
    if (power > 6 && r < .67) return 'vineLurker';
    return r < .84 ? 'sporeMaw' : 'thornStalker';
  }
  if (depth === 4) {
    if (power > 14 && r < .16) return 'jinxCroupier';
    if (power > 12 && r < .33) return 'slotMimic';
    if (power > 10 && r < .5) return 'diceHound';
    if (power > 8 && r < .67) return 'cardDealer';
    return r < .84 ? 'railWisp' : 'jackpotGremlin';
  }
  if (depth === 5) {
    if (power > 16 && r < .16) return 'glassDeacon';
    if (power > 14 && r < .33) return 'reliquaryKnight';
    if (power > 12 && r < .5) return 'frostHound';
    if (power > 10 && r < .67) return 'icePenitent';
    return r < .84 ? 'preservationWisp' : 'choirShard';
  }
  if (depth === 6) {
    if (power > 18 && r < .16) return 'wakeUpCaller';
    if (power > 16 && r < .33) return 'bellhopMimic';
    if (power > 14 && r < .5) return 'hallwayHound';
    if (power > 12 && r < .67) return 'sleepwalker';
    return r < .84 ? 'keyholeWisp' : 'luggageImp';
  }
  if (depth === 7) {
    if (power > 20 && r < .16) return 'reflectionKnight';
    if (power > 18 && r < .33) return 'echoSniper';
    if (power > 16 && r < .5) return 'glassHound';
    if (power > 14 && r < .67) return 'facelessStriker';
    return r < .84 ? 'prismWisp' : 'mirrorPunk';
  }
  if (depth === 8) {
    if (power > 22 && r < .16) return 'bloodCantor';
    if (power > 20 && r < .33) return 'throneLegionary';
    if (power > 18 && r < .5) return 'portalHound';
    if (power > 16 && r < .67) return 'charmAcolyte';
    return r < .84 ? 'decreeWisp' : 'hollowSuccubus';
  }
  if (depth >= 9) {
    const crossPollinated: EnemyType[] = ['reflectionKnight','wakeUpCaller','glassDeacon','jinxCroupier','thornArcher','courtCantor','throneLegionary','hollowShade','portalHound','prismWisp','frostHound','razorBoar'];
    return rng.pick(crossPollinated);
  }
  if (power > 15 && r < .22) return 'siren';
  if (power > 11 && r < .42) return 'crawler';
  if (power > 8 && r < .58) return 'succubus';
  if (power > 5 && r < .74) return 'hellhound';
  return r < .88 ? 'floater' : 'imp';
}

function mirrorBox(box: RoomBox): RoomBox {
  return {
    ...box,
    platforms: box.platforms.map(v => ({ ...v, x: WIDTH - v.x - v.w })),
    hazards: box.hazards.map(v => ({ ...v, x: WIDTH - v.x - v.w })),
    anchors: box.anchors.map(v => ({ x: WIDTH - v.x - 70, y: v.y })),
  };
}

function platformKey(platform: Rect): string { return `${Math.round(platform.x)},${Math.round(platform.y)},${Math.round(platform.w)},${Math.round(platform.h)}`; }
function uniquePlatforms(platforms: Rect[]): Rect[] {
  const seen = new Set<string>();
  return platforms.filter(platform => { const key = platformKey(platform); if (seen.has(key)) return false; seen.add(key); return true; });
}

function addCriticalPath(platforms: Rect[], entry: GateSide, exit: GateSide): { platforms: Rect[]; critical: Rect[] } {
  if (entry !== 'top' && exit !== 'top') return { platforms: uniquePlatforms(platforms), critical: [] };
  // A single protected spine guarantees the gate route. Nearby authored
  // ledges are removed before insertion so the result never becomes a stack
  // of visually colliding platforms.
  const critical = [p(552,535,176),p(710,415,176),p(520,295,180),p(552,155,176)];
  const filtered=platforms.filter(platform=>platform.h>25||!critical.some(required=>{
    const overlapX=Math.min(platform.x+platform.w,required.x+required.w)-Math.max(platform.x,required.x);
    return overlapX>25&&Math.abs(platform.y-required.y)<58;
  }));
  return { platforms: uniquePlatforms([...filtered, ...critical]), critical };
}

function depthBranches(depth: number, variant: number): { platforms: Rect[]; anchors: Anchor[]; hazards: Hazard[] } {
  const platforms: Rect[] = []; const anchors: Anchor[] = []; const hazards: Hazard[] = [];
  if(depth>=4) hazards.push({type:'spikes',x:variant%2===0?405:805,y:626,w:68,h:24,damage:15});
  if(depth>=8) hazards.push({type:'spikes',x:variant%3===0?770:285,y:626,w:72,h:24,damage:17});
  return { platforms, anchors, hazards };
}

function hazardIsGateSafe(hazard: Hazard, entry: GateSide, exit: GateSide, hasTopPath: boolean): boolean {
  if ((entry === 'left' || exit === 'left') && hazard.x < 170) return false;
  if ((entry === 'right' || exit === 'right') && hazard.x + hazard.w > WIDTH - 170) return false;
  if ((entry === 'bottom' || exit === 'bottom') && hazard.x < 735 && hazard.x + hazard.w > 545) return false;
  if (hasTopPath && hazard.x < 760 && hazard.x + hazard.w > 500) return false;
  return true;
}

function supportFor(anchor: Anchor, platforms: Rect[]): Rect | undefined {
  return platforms.find(platform => Math.abs(platform.y - (anchor.y + 50)) <= 2 && anchor.x >= platform.x - 10 && anchor.x <= platform.x + platform.w + 10);
}

function placeSpawn(anchor: Anchor, platforms: Rect[], difficulty: number, depth: number, rng: RandomSource): EnemySpawn | null {
  const support = supportFor(anchor, platforms); if (!support) return null;
  const type = enemyForDifficulty(difficulty, depth, rng); const body = ENEMY_BODIES[type];
  const minX = support.x + 8; const maxX = support.x + support.w - body.w - 8;
  if (maxX < minX) return null;
  const x = clamp(anchor.x, minX, maxX);
  return { type, x, y: support.y - body.h - (type === 'floater' || type === 'chorusWisp' || type === 'railWisp' || type === 'choirShard' || type === 'preservationWisp' || type === 'keyholeWisp' || type === 'prismWisp' || type === 'decreeWisp' || type === 'hollowShade' ? 45 : 0) };
}

function buildBox(index: number, type: RoomType, difficulty: number, depth: number, entry: GateSide, exit: GateSide, rng: RandomSource): { platforms: Rect[]; hazards: Hazard[]; spawns: EnemySpawn[]; complexity: number } {
  if (type === 'miniboss' || type === 'boss') {
    const arena = [ground,p(145,495,230),p(525,385,230),p(905,495,230)];
    const path = addCriticalPath(arena, entry, exit);
    const hazards: Hazard[] = depth === 2
      ? type === 'boss'
        ? [{type:'current',x:390,y:570,w:210,h:78,damage:0,forceX:-185},{type:'current',x:680,y:570,w:210,h:78,damage:0,forceX:185},{type:'bubble',x:585,y:385,w:110,h:265,damage:0,forceY:-680}]
        : [{type:'bubble',x:585,y:385,w:110,h:265,damage:0,forceY:-620}]
      : depth === 3
        ? type === 'boss'
          ? [{type:'vine',x:365,y:620,w:150,h:30,damage:12},{type:'vine',x:765,y:620,w:150,h:30,damage:12},{type:'snare',x:575,y:570,w:130,h:80,damage:0,forceX:-115}]
          : [{type:'snare',x:560,y:565,w:160,h:85,damage:0,forceX:-90}]
        : depth === 4
          ? type === 'boss'
            ? [{type:'electric',x:300,y:610,w:170,h:40,damage:18,cycleOffset:0},{type:'electric',x:555,y:610,w:170,h:40,damage:18,cycleOffset:.8},{type:'electric',x:810,y:610,w:170,h:40,damage:18,cycleOffset:1.6}]
            : [{type:'electric',x:540,y:610,w:200,h:40,damage:16,cycleOffset:.5}]
          : depth === 5
            ? type === 'boss'
              ? [{type:'ice',x:235,y:610,w:220,h:40,damage:0,forceX:85},{type:'ice',x:825,y:610,w:220,h:40,damage:0,forceX:-85}]
              : [{type:'ice',x:520,y:610,w:240,h:40,damage:0,forceX:70}]
          : depth === 6
            ? [
                {type:'dreamDoor',x:240,y:500,w:76,h:150,damage:0,forceX:982,forceY:540},
                {type:'dreamDoor',x:964,y:500,w:76,h:150,damage:0,forceX:278,forceY:540},
              ]
          : depth === 7
            ? type === 'boss'
              ? [{type:'mirror',x:330,y:260,w:22,h:390,damage:0,forceX:1,forceY:-.16},{type:'mirror',x:928,y:260,w:22,h:390,damage:0,forceX:-1,forceY:-.16}]
              : [{type:'mirror',x:624,y:300,w:22,h:350,damage:0,forceX:-1,forceY:-.12}]
          : depth === 8
            ? type === 'boss'
              ? [{type:'royalSigil',x:310,y:605,w:170,h:45,damage:17,cycleOffset:0},{type:'royalSigil',x:555,y:605,w:170,h:45,damage:17,cycleOffset:.9},{type:'royalSigil',x:800,y:605,w:170,h:45,damage:17,cycleOffset:1.8}]
              : [{type:'royalSigil',x:535,y:600,w:210,h:50,damage:15,cycleOffset:.45}]
          : depth >= 9
            ? [{type:'memoryRift',x:565,y:575,w:150,h:75,damage:13,cycleOffset:.5}]
          : type === 'boss' ? [{type:'spikes',x:430,y:626,w:82,h:24,damage:16},{type:'spikes',x:768,y:626,w:82,h:24,damage:16}] : [];
    const safeHazards = hazards.filter(h => hazardIsGateSafe(h, entry, exit, path.critical.length > 0));
    const encounterType: EnemyType = depth >= 9 ? (type === 'boss' ? 'hollowBoss' : 'bossRushHerald') : depth === 8 ? (type === 'boss' ? 'lilithBoss' : 'daughterAttack') : depth === 7 ? (type === 'boss' ? 'vesperaBoss' : 'betterMilo') : depth === 6 ? (type === 'boss' ? 'somniaBoss' : 'dreamGirl') : depth === 5 ? (type === 'boss' ? 'isoldeBoss' : 'memoryGolem') : depth === 4 ? (type === 'boss' ? 'calyptraBoss' : 'ladyLuckless') : depth === 3 ? (type === 'boss' ? 'roxyne' : 'perfectPrey') : depth === 2 ? (type === 'boss' ? 'nerissa' : 'fanChampion') : (type === 'boss' ? 'warden' : 'brute');
    const encounterSpawns: EnemySpawn[] = depth === 6 && type === 'miniboss'
      ? [
          {type:'dreamGirl',x:830,y:FLOOR_Y-ENEMY_BODIES.dreamGirl.h},
          ...[165,425,690,1050].map(x => ({type:'fantasyAnchor' as const,x,y:FLOOR_Y-ENEMY_BODIES.fantasyAnchor.h})),
        ]
      : [{type:encounterType,x:840,y:FLOOR_Y-ENEMY_BODIES[encounterType].h}];
    return { platforms: path.platforms, hazards: safeHazards, spawns: encounterSpawns, complexity: path.platforms.length + safeHazards.length * 2 + depth };
  }

  const eligible = BOXES.filter(box => box.minDepth <= depth);
  let box = eligible[index % eligible.length]; if (rng.chance(.5)) box = mirrorBox(box);
  const branches = depthBranches(depth, index);
  const path = addCriticalPath([...box.platforms.map(v => ({...v})), ...branches.platforms], entry, exit);
  const criticalKeys = new Set(path.critical.map(platformKey));
  const candidateAnchors = [...box.anchors, ...branches.anchors];
  // Late rooms gain optional side-branch anchors, while the guaranteed top-gate
  // spine stays free of mandatory combat placement.
  if (depth >= 4) for (const platform of path.platforms) {
    if (platform.h > 25 || criticalKeys.has(platformKey(platform)) || platform.w < 145) continue;
    candidateAnchors.push({x:platform.x+platform.w*.55,y:platform.y-50});
  }
  candidateAnchors.push({x:210,y:FLOOR_Y-50},{x:430,y:FLOOR_Y-50},{x:830,y:FLOOR_Y-50},{x:1060,y:FLOOR_Y-50});

  const start = playerStart(entry); const exitRect = gateRect(exit);
  const safeAnchors = candidateAnchors.filter(anchor => {
    const support = supportFor(anchor, path.platforms); if (!support) return false;
    const worldY = support.y - 55;
    return Math.hypot(anchor.x - start.x, worldY - start.y) > 175 && Math.hypot(anchor.x - (exitRect.x + exitRect.w/2), worldY - (exitRect.y + exitRect.h/2)) > 120;
  });
  const desired = desiredEnemyCount(type, difficulty, depth);
  const spawns = shuffle([...safeAnchors], rng).slice(0, desired).map(anchor => placeSpawn(anchor, path.platforms, difficulty, depth, rng)).filter((spawn): spawn is EnemySpawn => Boolean(spawn));
  const drownedHazards: Hazard[] = depth === 2
    ? index % 2 === 0
      ? [{type:'current',x:index%4===0?380:720,y:575,w:185,h:73,damage:0,forceX:index%4===0?170:-170}]
      : [{type:'bubble',x:index%3===0?300:865,y:390,w:105,h:258,damage:0,forceY:-610}]
    : [];
  const thornHazards: Hazard[] = depth === 3
    ? index % 2 === 0
      ? [{type:'vine',x:index%4===0?390:725,y:620,w:150,h:30,damage:12}]
      : [{type:'snare',x:index%3===0?315:840,y:565,w:145,h:85,damage:0,forceX:index%3===0?90:-90}]
    : [];
  const jackpotHazards: Hazard[] = depth === 4
    ? [{type:'electric',x:index%2===0?390:720,y:610,w:170,h:40,damage:16,cycleOffset:(index%3)*.7}]
    : [];
  const frozenHazards: Hazard[] = depth === 5
    ? [{type:'ice',x:index%2===0?370:725,y:610,w:190,h:40,damage:0,forceX:index%2===0?72:-72}]
    : [];
  const dreamHazards: Hazard[] = depth === 6 && index % 3 !== 1
    ? [
        {type:'dreamDoor',x:265,y:500,w:72,h:150,damage:0,forceX:973,forceY:540},
        {type:'dreamDoor',x:945,y:500,w:72,h:150,damage:0,forceX:301,forceY:540},
      ]
    : [];
  const mirrorHazards: Hazard[] = depth === 7
    ? [{type:'mirror',x:index%2===0?348:910,y:300,w:22,h:350,damage:0,forceX:index%2===0?1:-1,forceY:index%3===0?-.22:-.08}]
    : [];
  const royalHazards: Hazard[] = depth === 8
    ? [{type:'royalSigil',x:index%2===0?365:745,y:605,w:170,h:45,damage:15,cycleOffset:(index%3)*.65}]
    : [];
  const hollowHazards: Hazard[] = depth >= 9
    ? [{type:'memoryRift',x:index%2===0?350:760,y:575,w:150,h:75,damage:13,cycleOffset:(index%4)*.45}]
    : [];
  const hazards = [...box.hazards.map(v => ({...v})), ...branches.hazards, ...drownedHazards, ...thornHazards, ...jackpotHazards, ...frozenHazards, ...dreamHazards, ...mirrorHazards, ...royalHazards, ...hollowHazards].filter(h => hazardIsGateSafe(h, entry, exit, path.critical.length > 0));
  return { platforms: path.platforms, hazards, spawns, complexity: path.platforms.length + hazards.length * 2 + spawns.length + depth };
}

export function buildRoomFrame(type: RoomType, depth: number, difficulty: number, entrySide: GateSide, exitSide: GateSide, seed: string | number, variant = 0) {
  const rng = new SeededRandom(`${seed}:room-frame:${variant}`);
  const geometry = buildBox(variant + rng.int(0, BOXES.length * 3), type, difficulty, depth, entrySide, exitSide, rng);
  return { ...geometry, quality:buildRoomQualityMetadata(type,depth,difficulty,entrySide,exitSide,geometry), playerStart:playerStart(entrySide), exit:gateRect(exitSide) };
}

function generateRoute(count: number, depth: number, rng: RandomSource) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const coordinates = [{x:0,y:0}], steps: GateSide[] = [], occupied = new Set(['0,0']); let trapped = false;
    for (let i = 1; i < count; i += 1) {
      const current = coordinates[i-1];
      const weighted: GateSide[] = depth <= 2 ? ['right','right','top','bottom','left'] : depth <= 6 ? ['right','top','bottom','left','right'] : ['top','bottom','right','left','top','bottom'];
      const choices = shuffle([...weighted], rng).filter((side, index, list) => list.indexOf(side) === index).filter(side => !occupied.has(`${current.x+directions[side].x},${current.y+directions[side].y}`));
      if (!choices.length) { trapped = true; break; }
      const side = choices[0], direction = directions[side], next = {x:current.x+direction.x,y:current.y+direction.y};
      coordinates.push(next); occupied.add(`${next.x},${next.y}`); steps.push(side);
    }
    if (!trapped) return { coordinates, steps };
  }
  return { coordinates:Array.from({length:count},(_,x)=>({x,y:0})), steps:Array.from({length:count-1},()=> 'right' as GateSide) };
}

export function roomCountBounds(depth = 1): readonly [number, number] {
  const stage = clamp(Math.floor(depth), 1, 10);
  const min = 7 + (stage - 1) * 2;
  return [min, min + 1];
}

export function roomIsEmpty(room: Pick<RoomDefinition, 'spawns'>): boolean {
  return room.spawns.length === 0;
}

function emptyRoomType(type: RoomType): boolean {
  return type === 'traversal' || type === 'recovery' || type === 'cache';
}

export function roomIsTraversable(room: RoomDefinition): boolean {
  return validateRoomTraversal(room).valid;
}

function roomIdentity(type: RoomType, stage: number, index: number, count: number): Pick<RoomDefinition, 'name' | 'subtitle' | 'objective' | 'theme'> {
  if (stage >= 9) {
    if (type === 'miniboss') return { name:LEVEL_NINE_ENCOUNTERS.miniboss.roomName, subtitle:'Level 9 · Seven-Boss Rush', objective:'Defeat the shortened seven-Lord sequence', theme:'brokenHub' };
    if (type === 'boss') return { name:LEVEL_NINE_ENCOUNTERS.boss.roomName, subtitle:'Level 9 · Final Encounter', objective:`Face ${LEVEL_NINE_ENCOUNTERS.boss.name} without looking away`, theme:'selfBelow' };
    if (type === 'cache') return { name:'The Gods Remember You', subtitle:'Level 9 · Build Amplification', objective:'Intensify the build you carried this far', theme:'apartment' };
    if (type === 'recovery') return { name:'A Quiet Minute at Home', subtitle:'Level 9 · Recovery', objective:'Breathe before the memory changes', theme:'apartment' };
    if (type === 'elite') return { name:'The Selves That Stayed Behind', subtitle:'Level 9 · Elite Encounter', objective:'Break the cross-biome Hollow formation', theme:'selfBelow' };
    return { name:'', subtitle:`Level 9 · Room ${index+1} of ${count}`, objective:type === 'traversal'?'Cross the impossible memory architecture':'Clear the mixed memory ecosystem', theme:index%3===0?'apartment':index%3===1?'brokenHub':'selfBelow' };
  }
  if (stage === 8) {
    if (type === 'miniboss') return { name:LEVEL_EIGHT_ENCOUNTERS.miniboss.roomName, subtitle:'Level 8 · Mini-Boss Relay', objective:'Break Attack, Defense, Movement, and Energy in sequence', theme:'succubusHall' };
    if (type === 'boss') return { name:LEVEL_EIGHT_ENCOUNTERS.boss.roomName, subtitle:'Level 8 · Succubus Queen', objective:`Defeat ${LEVEL_EIGHT_ENCOUNTERS.boss.name} and her royal decrees`, theme:'royalThrone' };
    if (type === 'cache') return { name:'The Earth-Facing Portal', subtitle:'Level 8 · Royal Cache', objective:'Claim one Arcane gift before the portal closes', theme:'capital' };
    if (type === 'recovery') return { name:'The Empty Victory Hall', subtitle:'Level 8 · Recovery', objective:'Catch your breath beneath the black crown', theme:'capital' };
    if (type === 'elite') return { name:'The Hollowed Royal Guard', subtitle:'Level 8 · Elite Encounter', objective:'Break Lilith\'s corrupted command formation', theme:'succubusHall' };
    return { name:'', subtitle:`Level 8 · Room ${index+1} of ${count}`, objective:type === 'traversal'?'Cross the capital while old hazards recombine':'Clear the royal gauntlet', theme:index%3===0?'capital':index%3===1?'succubusHall':'royalThrone' };
  }
  if (stage === 7) {
    if (type === 'miniboss') return { name:LEVEL_SEVEN_ENCOUNTERS.miniboss.roomName, subtitle:'Level 7 · Mini-Boss', objective:'Defeat Better Milo using the base techniques he copies', theme:'mirrorcourt' };
    if (type === 'boss') return { name:LEVEL_SEVEN_ENCOUNTERS.boss.roomName, subtitle:'Level 7 · Demon Lord', objective:`Defeat ${LEVEL_SEVEN_ENCOUNTERS.boss.name}`, theme:'mirrorcourt' };
    if (type === 'cache') return { name:'The Lightless Looking Glass', subtitle:'Level 7 · Cache', objective:'Free Noctissa and claim one Arcane gift', theme:'gallery' };
    if (type === 'recovery') return { name:'The Face You Rest In', subtitle:'Level 7 · Recovery', objective:'Catch your breath without trusting the reflection', theme:'gallery' };
    if (type === 'elite') return { name:'The Thousandfold Guard', subtitle:'Level 7 · Elite Encounter', objective:'Break the reflected formation', theme:'mirrorcourt' };
    return { name:'', subtitle:`Level 7 · Room ${index+1} of ${count}`, objective:type === 'traversal'?'Redirect an Arcane Bolt through the mirror lane':'Clear the city and read real versus reflected attacks', theme:index%3===0?'city':index%3===1?'gallery':'mirrorcourt' };
  }
  if (stage === 6) {
    if (type === 'miniboss') return { name:LEVEL_SIX_ENCOUNTERS.miniboss.roomName, subtitle:'Level 6 · Mini-Boss', objective:'Destroy every fantasy anchor; Dream Girl cannot be harmed directly', theme:'dreamsuite' };
    if (type === 'boss') return { name:LEVEL_SIX_ENCOUNTERS.boss.roomName, subtitle:'Level 6 · Demon Lord', objective:`Defeat ${LEVEL_SIX_ENCOUNTERS.boss.name}`, theme:'dreamsuite' };
    if (type === 'cache') return { name:'The Gilded Vacancy', subtitle:'Level 6 · Cache', objective:'Free Aurelia and claim one Arcane gift', theme:'motel' };
    if (type === 'recovery') return { name:'Complimentary Wake-Up Call', subtitle:'Level 6 · Recovery', objective:'Remember which room is real', theme:'hallway' };
    if (type === 'elite') return { name:'The Night Audit', subtitle:'Level 6 · Elite Encounter', objective:'Break the sleepless staff', theme:'dreamsuite' };
    return { name:'', subtitle:`Level 6 · Room ${index+1} of ${count}`, objective:type === 'traversal'?'Read the paired doors and escape the loop':'Clear the motel before the hallway resets', theme:index%3===0?'motel':index%3===1?'hallway':'dreamsuite' };
  }
  if (stage === 5) {
    if (type === 'miniboss') return { name:LEVEL_FIVE_ENCOUNTERS.miniboss.roomName, subtitle:'Level 5 · Mini-Boss', objective:'Break the memories before the golem repeats them', theme:'reliquary' };
    if (type === 'boss') return { name:LEVEL_FIVE_ENCOUNTERS.boss.roomName, subtitle:'Level 5 · Demon Lord', objective:`Defeat ${LEVEL_FIVE_ENCOUNTERS.boss.name}`, theme:'sanctum' };
    if (type === 'cache') return { name:'The Sunlocked Reliquary', subtitle:'Level 5 · Cache', objective:'Free Solara and claim one Arcane gift', theme:'reliquary' };
    if (type === 'recovery') return { name:'The Thawed Vestry', subtitle:'Level 5 · Recovery', objective:'Catch your breath', theme:'basilica' };
    if (type === 'elite') return { name:'The Preserved Procession', subtitle:'Level 5 · Elite Encounter', objective:'Shatter the preserved guard', theme:'sanctum' };
    return { name:'', subtitle:`Level 5 · Room ${index+1} of ${count}`, objective:type === 'traversal'?'Carry momentum across the frozen nave':'Break the delayed crystal formation', theme:index%3===0?'basilica':index%3===1?'reliquary':'sanctum' };
  }
  if (stage === 4) {
    if (type === 'miniboss') return { name:LEVEL_FOUR_ENCOUNTERS.miniboss.roomName, subtitle:'Level 4 · Mini-Boss', objective:'Survive each disclosed rule change', theme:'casino' };
    if (type === 'boss') return { name:LEVEL_FOUR_ENCOUNTERS.boss.roomName, subtitle:'Level 4 · Demon Lord', objective:`Defeat ${LEVEL_FOUR_ENCOUNTERS.boss.name}`, theme:'roulette' };
    if (type === 'cache') return { name:'The Moonchip Vault', subtitle:'Level 4 · Cache', objective:'Claim one Arcane gift', theme:'casino' };
    if (type === 'recovery') return { name:'Complimentary Suite', subtitle:'Level 4 · Recovery', objective:'Catch your breath', theme:'casino' };
    if (type === 'elite') return { name:'The High-Roller Rail', subtitle:'Level 4 · Elite Encounter', objective:'Break the house guard', theme:'rail' };
    return { name:'', subtitle:`Level 4 · Room ${index+1} of ${count}`, objective:type === 'traversal'?'Cross the live fortune rails':'Beat the house before it stacks the deck', theme:index%3===0?'casino':index%3===1?'rail':'roulette' };
  }
  if (stage === 3) {
    if (type === 'miniboss') return { name:LEVEL_THREE_ENCOUNTERS.miniboss.roomName, subtitle:'Level 3 · Mini-Boss', objective:'Corner Perfect Prey at a choke point', theme:'grove' };
    if (type === 'boss') return { name:LEVEL_THREE_ENCOUNTERS.boss.roomName, subtitle:'Level 3 · Demon Lord', objective:`Defeat ${LEVEL_THREE_ENCOUNTERS.boss.name}`, theme:'canopy' };
    if (type === 'cache') return { name:'The Frozen Reliquary', subtitle:'Level 3 · Cache', objective:'Claim one Arcane gift', theme:'ruins' };
    if (type === 'recovery') return { name:'Quiet Frostroot', subtitle:'Level 3 · Recovery', objective:'Catch your breath', theme:'grove' };
    if (type === 'elite') return { name:'The Red Hunt', subtitle:'Level 3 · Elite Encounter', objective:'Break the hunting party', theme:'canopy' };
    return { name:'', subtitle:`Level 3 · Room ${index+1} of ${count}`, objective:type === 'traversal'?'Climb through the killing canopy':'Survive the Thornwild hunt', theme:index%3===0?'grove':index%3===1?'ruins':'canopy' };
  }
  if (stage === 2) {
    if (type === 'miniboss') return { name:LEVEL_TWO_ENCOUNTERS.miniboss.roomName, subtitle:'Level 2 · Mini-Boss', objective:`Survive ${LEVEL_TWO_ENCOUNTERS.miniboss.name}`, theme:'stage' };
    if (type === 'boss') return { name:LEVEL_TWO_ENCOUNTERS.boss.roomName, subtitle:'Level 2 · Demon Lord', objective:`Defeat ${LEVEL_TWO_ENCOUNTERS.boss.name}`, theme:'stage' };
    if (type === 'cache') return { name:'The Pearl Reliquary', subtitle:'Level 2 · Cache', objective:'Claim one Arcane gift', theme:'palace' };
    if (type === 'recovery') return { name:'Quiet Moonpool', subtitle:'Level 2 · Recovery', objective:'Catch your breath', theme:'reef' };
    if (type === 'elite') return { name:'The Royal Chorus', subtitle:'Level 2 · Elite Encounter', objective:'Silence the royal chorus', theme:'palace' };
    return { name:'', subtitle:`Level 2 · Room ${index+1} of ${count}`, objective:type === 'traversal'?'Ride the current to the next gate':'Break the adoring court', theme:index%3===0?'reef':index%3===1?'palace':'stage' };
  }
  if (type === 'miniboss') return { name:LEVEL_ONE_ENCOUNTERS.miniboss.roomName, subtitle:`Level ${stage} · Mini-Boss`, objective:`Defeat ${LEVEL_ONE_ENCOUNTERS.miniboss.name}`, theme:'cathedral' };
  if (type === 'boss') return { name:LEVEL_ONE_ENCOUNTERS.boss.roomName, subtitle:`Level ${stage} · Boss`, objective:`Defeat ${LEVEL_ONE_ENCOUNTERS.boss.name}`, theme:'throne' };
  if (type === 'cache') return { name:'The Arcane Cache', subtitle:`Level ${stage} · Cache`, objective:'Claim one Arcane gift', theme:'cathedral' };
  if (type === 'recovery') return { name:'Afterhours Kitchen', subtitle:`Level ${stage} · Recovery`, objective:'Catch your breath', theme:'boiler' };
  if (type === 'elite') return { name:'Velvet Kill Floor', subtitle:`Level ${stage} · Elite Encounter`, objective:'Break the elite guard', theme:'foundry' };
  return { name:'', subtitle:`Level ${stage} · Room ${index+1} of ${count}`, objective:type === 'traversal'?'Reach the next gate':'Clear the chamber', theme:index%3===1?'boiler':index%3===2?'foundry':'alley' };
}

function roomNamesForStage(stage: number): string[] {
  return stage >= 9 ? levelNineNames : stage === 8 ? levelEightNames : stage === 7 ? levelSevenNames : stage === 6 ? levelSixNames : stage === 5 ? levelFiveNames : stage === 4 ? levelFourNames : stage === 3 ? levelThreeNames : stage === 2 ? levelTwoNames : levelOneNames;
}

function makeBranchRoom(base: RoomDefinition, kind: RouteKind, stage: number, index: number, rng: RandomSource): RoomDefinition {
  const type: RoomType = kind === 'elite' ? 'elite' : kind === 'recovery' || kind === 'event' ? 'recovery' : kind === 'cache' ? 'cache' : 'combat';
  const difficulty = index + 2 + (stage - 1) * 1.5 + (type === 'elite' ? 3 : 0);
  const geometry = buildBox(rng.int(0, BOXES.length * 3), type, difficulty, stage, base.entrySide ?? 'left', base.exitSide ?? 'right', rng);
  const identity = roomIdentity(type, stage, index, Math.max(index + 2, 7));
  const wagerType = kind === 'wager' ? rng.pick<WagerType>(['blood','perfect','rush','chaos']) : undefined;
  const room: RoomDefinition = {
    ...base, ...identity, type, routeKind:kind, wagerType,
    name: identity.name || rng.pick(roomNamesForStage(stage)), platforms:geometry.platforms,
    hazards:type === 'recovery' ? [] : geometry.hazards, spawns:geometry.spawns,
    complexity:geometry.complexity, rewardKind:type === 'cache'?'arcane-cache':type === 'elite'?'major-boon':kind === 'wager'?'wager':'none',
    danger:type === 'elite' || kind === 'wager' ? 3 : type === 'recovery' ? 1 : 2,
    seedKey:`branch-${index}-${kind}-${rng.seed}`,
  };
  if (kind === 'event') { room.name='The Unmarked Door'; room.subtitle=`Level ${stage} · Infernal Event`; room.objective='Make a bounded choice'; room.spawns=[]; room.hazards=[]; room.rewardKind='none'; room.danger=2; }
  room.quality=buildRoomQualityMetadata(type,stage,difficulty,room.entrySide??'left',room.exitSide??'right',room);
  return room;
}

function branchChoice(room: RoomDefinition, kind: RouteKind, index: number): RouteChoice {
  const copy: Record<RouteKind, Omit<RouteChoice, 'id' | 'room' | 'kind'>> = {
    combat:{label:'Neon Brawl',description:'A direct fight with a clean exit.',danger:2,reward:'Soul shards'},
    elite:{label:'Velvet Guard',description:'A dangerous elite patrol blocks a richer prize.',danger:3,reward:'Premium boon'},
    recovery:{label:'Afterhours Kitchen',description:'A safer room with pizza and coffee.',danger:1,reward:'Recovery'},
    cache:{label:'Arcane Cache',description:'No ambush—choose one of two Arcane gifts.',danger:1,reward:'Boon choice'},
    wager:{label:"House's Shortcut",description:'A disclosed infernal wager sweetens the next fight.',danger:3,reward:'Wager jackpot'},
    event:{label:'Strange Door',description:'A bounded infernal event waits inside.',danger:2,reward:'Unknown event'},
  };
  const choice = { id:`route-${index}-${kind}`, kind, room, ...copy[kind] };
  if (room.stageDepth === 2) {
    const drownedLabels: Partial<Record<RouteKind,string>> = { combat:'Chorus Trench',elite:'Royal Chorus',recovery:'Quiet Moonpool',cache:'Pearl Reliquary',wager:"Nerissa's Shortcut",event:'Tideglass Door' };
    choice.label = drownedLabels[kind] ?? choice.label;
  }
  if (room.stageDepth === 3) {
    const thornLabels: Partial<Record<RouteKind,string>> = { combat:'Bloodroot Crossing',elite:'The Red Hunt',recovery:'Quiet Frostroot',cache:'Frozen Reliquary',wager:"Roxyne's Shortcut",event:'Unmarked Trail' };
    choice.label = thornLabels[kind] ?? choice.label;
  }
  if (room.stageDepth === 4) {
    const jackpotLabels: Partial<Record<RouteKind,string>> = { combat:'Loaded Boulevard',elite:'High-Roller Rail',recovery:'Complimentary Suite',cache:'Moonchip Vault',wager:"Calyptra's Side Bet",event:'Unmarked Table' };
    choice.label = jackpotLabels[kind] ?? choice.label;
  }
  if (room.stageDepth === 5) {
    const frozenLabels: Partial<Record<RouteKind,string>> = { combat:'Stillglass Nave',elite:'Preserved Procession',recovery:'Thawed Vestry',cache:'Sunlocked Reliquary',wager:"Isolde's Memory Tax",event:'Unremembered Door' };
    choice.label = frozenLabels[kind] ?? choice.label;
  }
  if (room.stageDepth === 6) {
    const motelLabels: Partial<Record<RouteKind,string>> = { combat:'Wake-Up Call Hall',elite:'The Night Audit',recovery:'Complimentary Checkout',cache:'Gilded Vacancy',wager:"Somnia's Room Key",event:'Door 6:00' };
    choice.label = motelLabels[kind] ?? choice.label;
  }
  if (room.stageDepth === 7) {
    const mirrorLabels: Partial<Record<RouteKind,string>> = { combat:'Borrowed Smile Avenue',elite:'Thousandfold Guard',recovery:'Quiet Reflection',cache:'Lightless Looking Glass',wager:"Vespera's Double",event:'Unclaimed Face' };
    choice.label = mirrorLabels[kind] ?? choice.label;
  }
  if (room.stageDepth === 8) {
    const royalLabels: Partial<Record<RouteKind,string>> = { combat:'Black-Crown Processional',elite:'Hollowed Royal Guard',recovery:'Empty Victory Hall',cache:'Earth-Facing Portal',wager:"Lilith's Command",event:'Unanswered Summons' };
    choice.label = royalLabels[kind] ?? choice.label;
  }
  if ((room.stageDepth ?? 0) >= 9) {
    const hollowLabels: Partial<Record<RouteKind,string>> = { combat:'Avoided Self',elite:'The Selves That Stayed',recovery:'A Quiet Minute',cache:'The Gods Remember',wager:"The Hollow's Bargain",event:'Door That Opens Inward' };
    choice.label = hollowLabels[kind] ?? choice.label;
  }
  return choice;
}

function chooseWagerRooms(rooms: RoomDefinition[], rng: RandomSource): number[] {
  const eligible = rooms.map((room,index)=>({room,index})).filter(({room,index}) => index > 0 && index < rooms.length-1 && (room.type === 'combat' || room.type === 'elite'));
  const target = Math.min(eligible.length, rooms.length >= 11 ? 2 : 1);
  const selected: number[] = [];
  for (const {index} of rng.shuffle(eligible)) {
    if (selected.some(other => Math.abs(other-index) <= 1)) continue;
    selected.push(index);
    if (selected.length >= target) break;
  }
  return selected.sort((a,b)=>a-b);
}

function buildRunPlan(depth: number, seed: number, attempt: number): GeneratedRunPlan | null {
  const rng = new SeededRandom(`${seed}:plan:${attempt}`);
  const stage = clamp(Math.floor(depth), 1, 10); const [minRooms,maxRooms] = roomCountBounds(stage);
  const count = rng.int(minRooms,maxRooms);
  const miniIndex = Math.floor(count / 2); const {coordinates,steps} = generateRoute(count,stage,rng.fork('route'));
  const cacheIndex = Math.max(1, Math.min(miniIndex - 1, rng.int(1, Math.max(1, miniIndex - 1))));
  const roomTypes: RoomType[] = coordinates.map((_,index) => index === miniIndex ? 'miniboss' : index === count-1 ? 'boss' : index === cacheIndex ? 'cache' : index % 4 === 3 ? 'traversal' : 'combat');
  for (let index = 1; index < roomTypes.length; index += 1) {
    if (!emptyRoomType(roomTypes[index - 1]) || !emptyRoomType(roomTypes[index])) continue;
    if (roomTypes[index] === 'cache') roomTypes[index - 1] = 'combat';
    else roomTypes[index] = 'combat';
  }
  const rooms = coordinates.map((coordinate,index) => {
    const type = roomTypes[index];
    const entrySide: GateSide = index === 0 ? (rng.chance(.5)?'left':'bottom') : directions[steps[index-1]].opposite;
    const exitSide: GateSide = index === count-1 ? 'right' : steps[index];
    const difficulty = index + 1 + (stage - 1) * 1.5;
    const geometry = buildBox(index+rng.int(0,BOXES.length-1),type,difficulty,stage,entrySide,exitSide,rng.fork(`room-${index}`));
    const identity = roomIdentity(type, stage, index, count);
    const name = identity.name || rng.pick(roomNamesForStage(stage));
    const room: RoomDefinition = {
      name, subtitle:identity.subtitle,
      type, theme:identity.theme,
      platforms:geometry.platforms,hazards:geometry.hazards,spawns:geometry.spawns,playerStart:playerStart(entrySide),exit:gateRect(exitSide),entrySide,exitSide,
      mapX:coordinate.x,mapY:coordinate.y,stageDepth:stage,complexity:geometry.complexity,
      quality:buildRoomQualityMetadata(type,stage,difficulty,entrySide,exitSide,geometry),
      objective:identity.objective,
      routeKind:type === 'cache'?'cache':'combat',
      rewardKind:type === 'cache'?'arcane-cache':type === 'miniboss' || type === 'boss'?'major-boon':'none',
      danger:type === 'boss' || type === 'miniboss'?3:type === 'combat'?2:1,
      seedKey:`main-${index}-${rng.seed}`,
    };
    return room;
  });
  if (stage === 1) {
    rooms[0].entryDialogue = 'level_one_entrance';
    const rescueRooms = rooms.filter(room => room.type === 'combat' || room.type === 'traversal').slice(0, 3);
    const rescues = ['rescue_maris', 'rescue_gaia', 'rescue_zephyra'] as const;
    rescueRooms.forEach((room, index) => {
      if (room.type === 'traversal') room.entryDialogue = rescues[index];
      else room.clearDialogue = rescues[index];
    });
    const miniboss = rooms.find(room => room.type === 'miniboss');
    const boss = rooms.find(room => room.type === 'boss');
    if (miniboss) miniboss.entryDialogue = 'bartender_intro';
    if (boss) boss.entryDialogue = 'belladonna_intro';
  }
  if (stage === 2) {
    rooms[0].entryDialogue = 'level_two_entrance';
    const rescueRooms = rooms.filter(room => room.type === 'combat' || room.type === 'traversal').slice(0, 2);
    const rescues = ['rescue_flora', 'rescue_voltara'] as const;
    rescueRooms.forEach((room, index) => {
      if (room.type === 'traversal') room.entryDialogue = rescues[index];
      else room.clearDialogue = rescues[index];
    });
    const miniboss = rooms.find(room => room.type === 'miniboss');
    const boss = rooms.find(room => room.type === 'boss');
    if (miniboss) miniboss.entryDialogue = 'fan_club_intro';
    if (boss) boss.entryDialogue = 'nerissa_intro';
    const mechanicRoom=rooms.find(room=>room.type==='combat')??rooms[0];
    if (!rooms.some(room=>room.hazards.some(hazard=>hazard.type==='current'))) mechanicRoom.hazards.push({type:'current',x:285,y:575,w:150,h:73,damage:0,forceX:170});
    if (!rooms.some(room=>room.hazards.some(hazard=>hazard.type==='bubble'))) mechanicRoom.hazards.push({type:'bubble',x:875,y:390,w:100,h:258,damage:0,forceY:-610});
  }
  if (stage === 3) {
    rooms[0].entryDialogue = 'level_three_entrance';
    const rescueRoom = rooms.find(room => room.type === 'combat' || room.type === 'traversal');
    if (rescueRoom) {
      if (rescueRoom.type === 'traversal') rescueRoom.entryDialogue = 'rescue_crya';
      else rescueRoom.clearDialogue = 'rescue_crya';
    }
    const miniboss = rooms.find(room => room.type === 'miniboss');
    const boss = rooms.find(room => room.type === 'boss');
    if (miniboss) miniboss.entryDialogue = 'perfect_prey_intro';
    if (boss) boss.entryDialogue = 'roxyne_intro';
    const mechanicRoom=rooms.find(room=>room.type==='combat')??rooms[0];
    if (!rooms.some(room=>room.hazards.some(hazard=>hazard.type==='vine'))) mechanicRoom.hazards.push({type:'vine',x:310,y:620,w:150,h:30,damage:12});
    if (!rooms.some(room=>room.hazards.some(hazard=>hazard.type==='snare'))) mechanicRoom.hazards.push({type:'snare',x:830,y:565,w:145,h:85,damage:0,forceX:-90});
  }
  if(stage>=4&&stage<=9){
    const triggers:Record<number,[string,string,string]>={
      4:['level_four_entrance','lady_luckless_intro','calyptra_intro'],
      5:['level_five_entrance','memory_golem_intro','isolde_intro'],
      6:['level_six_entrance','dream_girl_intro','somnia_intro'],
      7:['level_seven_entrance','better_milo_intro','vespera_intro'],
      8:['level_eight_entrance','daughters_intro','lilith_intro'],
      9:['level_nine_entrance','boss_rush_intro','hollow_intro'],
    };
    const [entrance,minibossIntro,bossIntro]=triggers[stage];rooms[0].entryDialogue=entrance;
    const miniboss=rooms.find(room=>room.type==='miniboss'),boss=rooms.find(room=>room.type==='boss');
    if(miniboss)miniboss.entryDialogue=minibossIntro;if(boss)boss.entryDialogue=bossIntro;
  }
  if (stage === 4) {
    const mechanicRoom=rooms.find(room=>room.type==='combat')??rooms[0];
    if (!rooms.some(room=>room.hazards.some(hazard=>hazard.type==='electric'))) mechanicRoom.hazards.push({type:'electric',x:535,y:610,w:210,h:40,damage:16,cycleOffset:.35});
  }
  if (stage === 5) {
    const mechanicRoom=rooms.find(room=>room.type==='combat')??rooms[0];
    if (!rooms.some(room=>room.hazards.some(hazard=>hazard.type==='ice'))) mechanicRoom.hazards.push({type:'ice',x:535,y:610,w:210,h:40,damage:0,forceX:70});
  }
  if (stage === 6) {
    const mechanicRoom=rooms.find(room=>room.type==='combat')??rooms[0];
    if (!rooms.some(room=>room.hazards.some(hazard=>hazard.type==='dreamDoor'))) mechanicRoom.hazards.push(
      {type:'dreamDoor',x:265,y:500,w:72,h:150,damage:0,forceX:973,forceY:540},
      {type:'dreamDoor',x:945,y:500,w:72,h:150,damage:0,forceX:301,forceY:540},
    );
  }
  if (stage === 7) {
    const mechanicRoom=rooms.find(room=>room.type==='combat')??rooms[0];
    if (!rooms.some(room=>room.hazards.some(hazard=>hazard.type==='mirror'))) mechanicRoom.hazards.push({type:'mirror',x:624,y:300,w:22,h:350,damage:0,forceX:-1,forceY:-.12});
  }
  if (stage === 8) {
    const combatRooms=rooms.filter(room=>room.type==='combat'||room.type==='elite');
    const learned: Hazard[] = [
      {type:'current',x:315,y:575,w:160,h:73,damage:0,forceX:150},
      {type:'snare',x:800,y:565,w:145,h:85,damage:0,forceX:-85},
      {type:'electric',x:555,y:610,w:170,h:40,damage:16,cycleOffset:.4},
      {type:'ice',x:725,y:610,w:180,h:40,damage:0,forceX:-68},
      {type:'mirror',x:624,y:310,w:22,h:340,damage:0,forceX:-1,forceY:-.1},
    ];
    combatRooms.slice(0,learned.length).forEach((room,index)=>{ if(!room.hazards.some(hazard=>hazard.type===learned[index].type)) room.hazards.push(learned[index]); });
  }
  if (stage >= 9) {
    const mechanicRoom=rooms.find(room=>room.type==='combat')??rooms[0];
    if (!rooms.some(room=>room.hazards.some(hazard=>hazard.type==='memoryRift'))) mechanicRoom.hazards.push({type:'memoryRift',x:565,y:575,w:150,h:75,damage:13,cycleOffset:.5});
  }
  rooms.forEach((room,index)=>{const difficulty=index+1+(stage-1)*1.5;room.quality=buildRoomQualityMetadata(room.type,stage,difficulty,room.entrySide??'left',room.exitSide??'right',room);});
  if (!rooms.every(roomIsTraversable)) return null;

  const wagerRooms = chooseWagerRooms(rooms, rng.fork('wagers'));
  wagerRooms.forEach((index, position) => {
    rooms[index].wagerType = rng.fork(`wager-${position}`).pick<WagerType>(['blood','perfect','rush','chaos']);
  });

  const branches: Record<number, RouteChoice[]> = {};
  for (let index = 2; index < rooms.length - 2; index += 1) {
    const next = rooms[index+1];
    if (roomIsEmpty(rooms[index]) || next.type === 'miniboss' || next.type === 'boss' || next.type === 'cache' || next.entryDialogue || next.clearDialogue) continue;
    const branchRng = rng.fork(`branch-options-${index}`);
    if (!branchRng.chance(.32)) continue;
    const kinds = branchRng.shuffle<RouteKind>(['combat','elite','recovery','wager','event']).slice(0, 2);
    const options = kinds.map((kind,optionIndex) => {
      const room = makeBranchRoom(next,kind,stage,index+1,branchRng.fork(optionIndex));
      return branchChoice(room,kind,index);
    }).filter(option => roomIsTraversable(option.room) && !(roomIsEmpty(option.room) && roomIsEmpty(rooms[index+2])));
    if (options.length >= 2) branches[index] = options;
  }
  if (Object.keys(branches).length === 0) {
    const candidates=rooms.map((room,index)=>({room,index})).filter(({room,index})=>index>=2&&index<rooms.length-2&&!roomIsEmpty(room)&&!['miniboss','boss','cache'].includes(rooms[index+1].type));
    const index = candidates[0]?.index ?? Math.min(rooms.length-3, Math.max(2, miniIndex));
    const next = rooms[index+1]; const branchRng = rng.fork('guaranteed-branch');
    branches[index] = (['elite','combat'] as RouteKind[]).map((kind,optionIndex) => branchChoice(makeBranchRoom(next,kind,stage,index+1,branchRng.fork(optionIndex)),kind,index));
  }
  return { seed, rooms, branches, wagerRooms };
}

export function generateRunPlan(depth = 1, requestedSeed: string | number = createRunSeed()): GeneratedRunPlan {
  const seed = typeof requestedSeed === 'number' && Number.isFinite(requestedSeed) ? Math.floor(requestedSeed) >>> 0 : new SeededRandom(requestedSeed).seed;
  for (let attempt=0; attempt<64; attempt+=1) {
    const plan = buildRunPlan(depth,seed,attempt);
    if (plan) return plan;
  }
  throw new Error(`Unable to create a traversable run for seed ${seed}.`);
}

export function generateRunRooms(depth = 1, seed?: string | number): RoomDefinition[] {
  return generateRunPlan(depth,seed).rooms;
}
