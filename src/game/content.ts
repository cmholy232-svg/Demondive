import type { BoonDefinition, BoonId, CampaignLevelDefinition, EnemyType, RoomDefinition, SaveData, UpgradeCategory, UpgradeId } from './types';

export const WIDTH = 1280;
export const HEIGHT = 720;
export const FLOOR_Y = 650;

// Shared, slightly forgiving sprite-aligned combat bodies. The generator uses
// the same heights so every grounded creature is planted by its actual feet.
export const ENEMY_BODIES: Record<EnemyType, { w: number; h: number }> = {
  imp: { w: 52, h: 88 },
  floater: { w: 92, h: 80 },
  succubus: { w: 64, h: 96 },
  hellhound: { w: 100, h: 80 },
  crawler: { w: 122, h: 90 },
  siren: { w: 72, h: 105 },
  dummy: { w: 52, h: 104 },
  brute: { w: 86, h: 150 },
  warden: { w: 156, h: 210 },
  drownedFan: { w: 58, h: 92 },
  chorusWisp: { w: 86, h: 82 },
  courtCantor: { w: 70, h: 112 },
  reefHound: { w: 108, h: 76 },
  bubbleCrab: { w: 132, h: 92 },
  spotlightDancer: { w: 66, h: 104 },
  fanChampion: { w: 104, h: 170 },
  nerissa: { w: 132, h: 202 },
  chantPillar: { w: 54, h: 150 },
  thornStalker: { w: 66, h: 104 },
  sporeMaw: { w: 118, h: 90 },
  vineLurker: { w: 72, h: 118 },
  razorBoar: { w: 126, h: 86 },
  rootMaw: { w: 142, h: 112 },
  thornArcher: { w: 70, h: 118 },
  perfectPrey: { w: 126, h: 188 },
  roxyne: { w: 148, h: 218 },
  jackpotGremlin: { w: 58, h: 88 },
  cardDealer: { w: 72, h: 112 },
  diceHound: { w: 112, h: 82 },
  railWisp: { w: 88, h: 80 },
  slotMimic: { w: 136, h: 118 },
  jinxCroupier: { w: 76, h: 124 },
  ladyLuckless: { w: 118, h: 184 },
  calyptraBoss: { w: 152, h: 222 },
  icePenitent: { w: 66, h: 108 },
  choirShard: { w: 88, h: 82 },
  reliquaryKnight: { w: 92, h: 142 },
  frostHound: { w: 116, h: 82 },
  glassDeacon: { w: 74, h: 126 },
  preservationWisp: { w: 86, h: 82 },
  memoryGolem: { w: 136, h: 194 },
  isoldeBoss: { w: 156, h: 226 },
  luggageImp: { w: 60, h: 92 },
  sleepwalker: { w: 72, h: 116 },
  keyholeWisp: { w: 88, h: 82 },
  bellhopMimic: { w: 132, h: 124 },
  hallwayHound: { w: 116, h: 82 },
  wakeUpCaller: { w: 76, h: 128 },
  fantasyAnchor: { w: 70, h: 150 },
  dreamGirl: { w: 124, h: 186 },
  somniaBoss: { w: 158, h: 228 },
  mirrorPunk: { w: 62, h: 98 },
  prismWisp: { w: 90, h: 84 },
  facelessStriker: { w: 72, h: 120 },
  glassHound: { w: 118, h: 84 },
  echoSniper: { w: 78, h: 132 },
  reflectionKnight: { w: 98, h: 150 },
  betterMilo: { w: 92, h: 158 },
  vesperaBoss: { w: 162, h: 230 },
  throneLegionary: { w: 88, h: 142 },
  charmAcolyte: { w: 72, h: 122 },
  portalHound: { w: 120, h: 84 },
  bloodCantor: { w: 76, h: 128 },
  decreeWisp: { w: 90, h: 84 },
  hollowSuccubus: { w: 72, h: 112 },
  daughterAttack: { w: 112, h: 180 },
  daughterDefense: { w: 116, h: 184 },
  daughterMovement: { w: 106, h: 176 },
  daughterEnergy: { w: 108, h: 178 },
  lilithBoss: { w: 174, h: 244 },
  hollowShade: { w: 70, h: 112 },
  bossRushHerald: { w: 118, h: 184 },
  hollowBoss: { w: 166, h: 232 },
};

// The identities are data; the proven mini-boss and boss engine roles remain
// isolated behind the generic brute/warden runtime types during migration.
export const LEVEL_ONE_ENCOUNTERS = {
  miniboss: { name: 'Bottomless Bartender', roomName: 'Last Call Lounge' },
  boss: { name: 'Belladonna', title: 'Demon Lord of Appetite', roomName: "Belladonna's Maw" },
} as const;

export const LEVEL_TWO_ENCOUNTERS = {
  miniboss: { name: 'The Fan Club', champion: 'Fan Club Champion', roomName: 'The Adoration Pit' },
  boss: { name: 'Nerissa', title: 'Demon Lord of Adoration', roomName: "Nerissa's Grand Stage" },
} as const;

export const LEVEL_THREE_ENCOUNTERS = {
  miniboss: { name: 'Perfect Prey', title: 'The Infernal Stag', roomName: 'The Cornered Glade' },
  boss: { name: 'Roxyne', title: 'Demon Lord of the Hunt', roomName: "Roxyne's Killing Canopy" },
} as const;

export const LEVEL_FOUR_ENCOUNTERS = {
  miniboss: { name: 'Lady Luckless', title: 'The Jinxed Dealer', roomName: 'The House Edge' },
  boss: { name: 'Calyptra', title: 'Demon Lord of Chance', roomName: "Calyptra's Grand Roulette" },
} as const;

export const LEVEL_FIVE_ENCOUNTERS = {
  miniboss: { name: 'Memory Golem', title: 'The Unforgotten Reliquary', roomName: 'The Hall of Held Moments' },
  boss: { name: 'Isolde', title: 'Demon Lord of Preservation', roomName: "Isolde's Frozen Sanctum" },
} as const;

export const LEVEL_SIX_ENCOUNTERS = {
  miniboss: { name: 'Dream Girl', title: 'The Perfect Afternoon', roomName: 'Room 6:00 Forever' },
  boss: { name: 'Somnia', title: 'Demon Lord of Dreams', roomName: "Somnia's Velvet Loop" },
} as const;

export const LEVEL_SEVEN_ENCOUNTERS = {
  miniboss: { name: 'Better Milo', title: 'The Self He Pretends To Be', roomName: 'The Flawless Reflection' },
  boss: { name: 'Vespera', title: 'Demon Lord of Reflections', roomName: "Vespera's Thousandfold Court" },
} as const;

export const LEVEL_EIGHT_ENCOUNTERS = {
  miniboss: { name: "Lilith's Daughters", title: 'Four Pillars of the Throne', roomName: 'The Royal Relay' },
  boss: { name: 'Lilith', title: 'Succubus Queen of Hell', roomName: "Lilith's Throne" },
} as const;

export const LEVEL_NINE_ENCOUNTERS = {
  miniboss: { name: 'The Sevenfold Reckoning', title: 'Boss Rush', roomName: 'The Lords Remember' },
  boss: { name: 'The Hollow', title: 'The Self Below', roomName: 'The Room Milo Never Left' },
} as const;

export const CAMPAIGN_PLAN: CampaignLevelDefinition[] = [
  { level:1,name:'The Neon Maw',depthProfiles:[1],signatureMechanics:['moving club platforms','pickup temptations','hollow guests'],miniboss:'Bottomless Bartender',boss:'Belladonna',boonUnlocks:['maris','gaia','zephyra','belladonna'],revelation:'Lilith expected Milo.',kind:'demon-lord',accessTier:'free' },
  { level:2,name:'The Drowned Court',depthProfiles:[2],signatureMechanics:['currents','bubble lifts','crowd buffs','homing songs'],miniboss:'The Fan Club',boss:'Nerissa',boonUnlocks:['flora','voltara','nerissa'],revelation:'A Milo-shaped figure is already in Hell.',kind:'demon-lord',accessTier:'free' },
  { level:3,name:'The Thornwild',depthProfiles:[3],signatureMechanics:['vines','ambush lanes','vertical hunts','route choice'],miniboss:'Perfect Prey',boss:'Roxyne',boonUnlocks:['crya','roxyne'],revelation:'The shadow is aware of Milo.',kind:'demon-lord',accessTier:'free' },
  { level:4,name:'The Thunder Jackpot',depthProfiles:[4],signatureMechanics:['bounded random events','timed electricity','disclosed rule changes'],miniboss:'Lady Luckless',boss:'Calyptra',boonUnlocks:['luna','calyptra'],revelation:'Something in Hell helped open the portal.',kind:'demon-lord',accessTier:'full' },
  { level:5,name:'The Frozen Basilica',depthProfiles:[5],signatureMechanics:['controlled ice momentum','frozen objects','delayed attacks'],miniboss:'Memory Golem',boss:'Isolde',boonUnlocks:['solara','isolde'],revelation:'The shadow is becoming embodied.',kind:'demon-lord',accessTier:'full' },
  { level:6,name:'The Forever Motel',depthProfiles:[6],signatureMechanics:['looping doors','false awakenings','dream remix pool'],miniboss:'Dream Girl',boss:'Somnia',boonUnlocks:['aurelia','somnia'],revelation:'The Hollow is the Milo who never woke up.',kind:'demon-lord',accessTier:'full' },
  { level:7,name:'The City of a Thousand Faces',depthProfiles:[7],signatureMechanics:['mirrors','redirected projectiles','copied attacks'],miniboss:'Better Milo',boss:'Vespera',boonUnlocks:['noctissa','vespera'],revelation:'The Hollow is made from Milo\'s avoided selves.',kind:'demon-lord',accessTier:'full' },
  { level:8,name:"Lilith's Throne",depthProfiles:[8,9],signatureMechanics:['royal gauntlet','curse combinations','two-half escalation'],miniboss:"Lilith's Daughters",boss:'Lilith',boonUnlocks:['lilith'],revelation:'Lilith cultivated the path to The Hollow.',kind:'queen',accessTier:'full' },
  { level:9,name:'The Self Below',depthProfiles:[10],signatureMechanics:['curated boss rush','base-kit duel','staged boon restoration'],miniboss:'Boss Rush',boss:'The Hollow',boonUnlocks:['seraphine'],revelation:'Milo cannot destroy avoidance; he must accept and outgrow it.',kind:'finale',accessTier:'full' },
];

export const LEGACY_BOON_MIGRATION: Readonly<Record<string, BoonId>> = {
  succi:'pyrra', gemini:'zephyra', sagittarius:'flora', phosphorus:'flora', aquarius:'solara',
  scorpio:'gaia', bast:'noctissa', capricorn:'isolde', taurus:'crya', aries:'voltara',
  libra:'calyptra', pisces:'maris', pahaliah:'seraphine',
};

function defineBoon(definition: Omit<BoonDefinition, 'namespace' | 'contentVersion' | 'stackThresholds' | 'accessTier'> & { stackThresholds?: number[] }): BoonDefinition {
  return { ...definition, stackThresholds: definition.stackThresholds ?? [1, 2, 4, 7], namespace: 'core', contentVersion: 1, accessTier:definition.unlockLevel <= 2 ? 'free' : 'full' };
}

export const BOONS: Record<BoonId, BoonDefinition> = {
  pyrra: defineBoon({ id:'pyrra',name:'Pyrra',identity:'Goddess of Flame',title:'Ember Bloom',color:'#ff4f76',accentColor:'#ffd2a8',glyph:'✦',special:'flameNova',specialName:'Flame Nova',specialDescription:'Detonate a close radial wave of Arcane flame.',specialEnergyCost:24,arcaneDescription:'Arcane hits ignite enemies; repeats extend the burn and trigger small explosions.',passiveDescription:'+10% Magic damage per stack.',duplicateDescription:'Longer, stronger burns; the nova expands and begins chaining explosions.',role:'Offense / damage over time',passiveComponents:[{kind:'damage',perStack:.1}],arcaneComponents:[{kind:'status',status:'burn',perStack:.25,hooks:['onMagicHit']},{kind:'explosion',base:8,perStack:4,hooks:['onMagicHit']}],tags:['fire','dot','offense'],unlockLevel:0,unlockText:'Available from a fresh save.',portraitAsset:'assets/a5/characters/level1/chr-pyrra-portrait-v01.png',migration:'proven-kit' }),
  maris: defineBoon({ id:'maris',name:'Maris',identity:'Goddess of Water',title:'Tidal Orb',color:'#19c8e8',accentColor:'#b9f6ff',glyph:'≈',special:'groundWave',specialName:'Ground Wave',specialDescription:'Send a damaging wave forward that shoves enemies down the lane.',specialEnergyCost:24,arcaneDescription:'Bolts grow larger and push enemies farther; later stacks add pierce.',passiveDescription:'+10 max Health per stack.',duplicateDescription:'More size and knockback; then pierce and a second returning wave.',role:'Survival / control',passiveComponents:[{kind:'healing',perStack:10}],arcaneComponents:[{kind:'size',perStack:.16},{kind:'knockback',perStack:.22},{kind:'pierce',perStack:.5}],tags:['water','health','control'],unlockLevel:1,unlockText:'Free Maris in The Neon Maw.',portraitAsset:'assets/a5/characters/level1/chr-maris-portrait-v01.png',migration:'proven-kit' }),
  gaia: defineBoon({ id:'gaia',name:'Gaia',identity:'Goddess of Earth',title:'Stoneheart',color:'#b77b4a',accentColor:'#f1d095',glyph:'◆',special:'stoneBarrier',specialName:'Stone Barrier',specialDescription:'Raise a short-lived barrier that absorbs damage and bursts into shards.',specialEnergyCost:30,arcaneDescription:'Bolts become heavier, slower, larger, and dramatically more damaging.',passiveDescription:'+8% armor per stack.',duplicateDescription:'A broader barrier, harder bolts, and more retaliating stone shards.',role:'Tank / bruiser',passiveComponents:[{kind:'shield',perStack:.08}],arcaneComponents:[{kind:'damage',perStack:.16},{kind:'size',perStack:.3},{kind:'speed',perStack:-.08}],tags:['earth','armor','heavy'],unlockLevel:1,unlockText:'Free Gaia in The Neon Maw.',portraitAsset:'assets/a5/characters/level1/chr-gaia-portrait-v01.png',migration:'proven-kit' }),
  zephyra: defineBoon({ id:'zephyra',name:'Zephyra',identity:'Goddess of Wind',title:'Gale Needle',color:'#77e8cf',accentColor:'#ecfff8',glyph:'↝',special:'reflectingGust',specialName:'Reflecting Gust',specialDescription:'Blast away enemies and reflect hostile projectiles.',specialEnergyCost:18,arcaneDescription:'Bolts become smaller, faster, and piercing; excess speed converts into multishot.',passiveDescription:'+8% Magic attack speed per stack.',duplicateDescription:'More pierce; every third stack creates an additional angled needle.',role:'Rapid fire',passiveComponents:[{kind:'fireRate',perStack:.08}],arcaneComponents:[{kind:'speed',perStack:.14},{kind:'size',perStack:-.08},{kind:'pierce',perStack:1},{kind:'split',perStack:.34}],tags:['wind','rapid','pierce'],unlockLevel:1,unlockText:'Free Zephyra in The Neon Maw.',portraitAsset:'assets/a5/characters/level1/chr-zephyra-portrait-v01.png',migration:'proven-kit' }),
  flora: defineBoon({ id:'flora',name:'Flora',identity:'Goddess of Nature',title:'Thorn Kiss',color:'#64d879',accentColor:'#ff8fbd',glyph:'✿',special:'vineLash',specialName:'Vine Lash',specialDescription:'Whip a thorny lane in front of Milo and burst every marked enemy.',specialEnergyCost:22,arcaneDescription:'Hits plant thorn marks; enough marks burst and spread to nearby enemies.',passiveDescription:'+6% critical chance per stack.',duplicateDescription:'Marks burst sooner, spread farther, and deal larger area damage.',role:'Delayed burst',passiveComponents:[{kind:'luck',perStack:.06}],arcaneComponents:[{kind:'mark',status:'thorn',base:3,perStack:-.25,hooks:['onMagicHit']},{kind:'explosion',base:18,perStack:7}],tags:['nature','mark','critical'],unlockLevel:2,unlockText:'Free Flora in The Drowned Court.',portraitAsset:'assets/a6/characters/level2/chr-flora-portrait-v01.png',migration:'proven-kit' }),
  voltara: defineBoon({ id:'voltara',name:'Voltara',identity:'Goddess of Lightning',title:'Chain Spark',color:'#f6df45',accentColor:'#fff9bd',glyph:'ϟ',special:'chainBurst',specialName:'Auto-Target Burst',specialDescription:'Lightning snaps through several living targets automatically.',specialEnergyCost:30,arcaneDescription:'Arcane hits chain lightning into another nearby target.',passiveDescription:'Restore Demon Energy when Magic hits.',duplicateDescription:'More chain targets, return chains, and stronger energy restoration.',role:'Crowd clear',passiveComponents:[{kind:'healing',perStack:1,hooks:['onMagicHit'],tags:['energy']}],arcaneComponents:[{kind:'chain',base:1,perStack:1,hooks:['onMagicHit']},{kind:'status',status:'stun',perStack:.04}],tags:['lightning','chain','energy'],unlockLevel:2,unlockText:'Free Voltara in The Drowned Court.',portraitAsset:'assets/a6/characters/level2/chr-voltara-portrait-v01.png',migration:'proven-kit' }),
  crya: defineBoon({ id:'crya',name:'Crya',identity:'Goddess of Ice',title:'Frostbite',color:'#82baff',accentColor:'#e8f5ff',glyph:'❄',special:'freezeCone',specialName:'Freeze Cone',specialDescription:'Flash-freeze enemies in a wide cone in front of Milo.',specialEnergyCost:28,arcaneDescription:'Hits build slow and then freeze; frozen enemies shatter under heavy damage.',passiveDescription:'+8% defense while an enemy is slowed, frozen, charmed, or stunned.',duplicateDescription:'Faster buildup, longer freeze, and more violent shatter damage.',role:'Control',passiveComponents:[{kind:'shield',perStack:.08,tags:['controlled-target']}],arcaneComponents:[{kind:'status',status:'freeze',perStack:.18,hooks:['onMagicHit']}],tags:['ice','freeze','control'],unlockLevel:3,unlockText:'Free Crya in The Thornwild.',portraitAsset:'assets/a7/characters/level3/chr-crya-portrait-v01.png',migration:'proven-kit' }),
  luna: defineBoon({ id:'luna',name:'Luna',identity:'Dream and Moon Goddess',title:'Dream Hex',color:'#a78bfa',accentColor:'#f4e9ff',glyph:'☾',special:'dreamPulse',specialName:'Sleep Pulse',specialDescription:'Release a dream pulse that suspends nearby enemies.',specialEnergyCost:22,arcaneDescription:'Mark repeated targets; the third hit repeats part of the accumulated damage.',passiveDescription:'Specials cost 8% less Demon Energy per stack.',duplicateDescription:'Marks spread on detonation and repeat a larger share of damage.',role:'Special economy',passiveComponents:[{kind:'healing',perStack:.08,tags:['special-cost']}],arcaneComponents:[{kind:'mark',status:'dream',base:3},{kind:'echo',perStack:.18,hooks:['onMagicHit']}],tags:['dream','mark','economy'],unlockLevel:4,unlockText:'Free Luna in The Thunder Jackpot.',migration:'new-kit' }),
  solara: defineBoon({ id:'solara',name:'Solara',identity:'Goddess of Light',title:'Radiant Lance',color:'#fff06a',accentColor:'#ffffff',glyph:'☀',special:'lightColumn',specialName:'Targeted Light Column',specialDescription:'Call a vertical beam onto the strongest living target.',specialEnergyCost:32,arcaneDescription:'Bolts become narrow, fast, piercing lances with bonus elite and boss damage.',passiveDescription:'+12% damage against elites and bosses per stack.',duplicateDescription:'More pierce, a lingering light field, and a shorter targeting delay.',role:'Boss killer',passiveComponents:[{kind:'damage',perStack:.12,tags:['elite','boss']}],arcaneComponents:[{kind:'pierce',perStack:1},{kind:'range',perStack:.12}],tags:['light','boss','pierce'],unlockLevel:5,unlockText:'Free Solara in The Frozen Basilica.',migration:'new-kit' }),
  belladonna: defineBoon({ id:'belladonna',name:'Belladonna',identity:'Demon Lord of Appetite',title:'Bottomless Rush',color:'#ff5ba7',accentColor:'#ffe0b2',glyph:'∞',special:'rushState',specialName:'Bottomless Rush',specialDescription:'Enter a brief feeding frenzy: faster movement, casting, and pickup pull.',specialEnergyCost:26,arcaneDescription:'Each pickup increases room damage; full resources turn pickups into protective bursts.',passiveDescription:'Pickups grant short stacking speed buffs.',duplicateDescription:'Longer Rush; full Health or Energy converts pickups into shields and blasts.',role:'Momentum',passiveComponents:[{kind:'movement',perStack:.06,hooks:['onPickup']}],arcaneComponents:[{kind:'damage',perStack:.04,hooks:['onPickup']},{kind:'shield',perStack:1,hooks:['onPickup']}],tags:['appetite','pickup','momentum','demon-lord'],unlockLevel:1,unlockText:'Defeat Belladonna in The Neon Maw.',portraitAsset:'assets/a5/characters/level1/chr-belladonna-portrait-v01.png',migration:'new-kit' }),
  nerissa: defineBoon({ id:'nerissa',name:'Nerissa',identity:'Demon Lord of Adoration',title:'Siren Thread',color:'#36c9ff',accentColor:'#ff9be6',glyph:'♫',special:'charmNote',specialName:'Charm Note',specialDescription:'Sing a piercing note that charms and bunches enemies into a line.',specialEnergyCost:22,arcaneDescription:'Bolts bend toward targets and become more decisive with each stack.',passiveDescription:'+55px pickup magnet range per stack.',duplicateDescription:'Stronger homing and charm; high stacks add a finishing death note.',role:'Ease / crowd control',passiveComponents:[{kind:'movement',perStack:55,tags:['pickup-magnet']}],arcaneComponents:[{kind:'homing',perStack:.38},{kind:'status',status:'charm',perStack:.08}],tags:['siren','homing','charm','demon-lord'],unlockLevel:2,unlockText:'Defeat Nerissa in The Drowned Court.',portraitAsset:'assets/a6/characters/level2/chr-nerissa-demon-lord-portrait-v02.png',migration:'proven-kit' }),
  roxyne: defineBoon({ id:'roxyne',name:'Roxyne',identity:'Demon Lord of the Hunt',title:"Predator's Mark",color:'#e35b58',accentColor:'#ffc7a5',glyph:'≻',special:'pounceAura',specialName:'Pounce Aura',specialDescription:'Pounce through the target lane with a short invulnerable attack.',specialEnergyCost:26,arcaneDescription:'Bolts deal bonus damage to isolated enemies and marked bosses.',passiveDescription:'+12% damage to enemies with no nearby allies per stack.',duplicateDescription:'Longer pounce, more invulnerability, and a persistent boss mark.',role:'Duelist',passiveComponents:[{kind:'ambush',perStack:.12}],arcaneComponents:[{kind:'damage',perStack:.14,tags:['isolated']}],tags:['hunt','duelist','ambush','demon-lord'],unlockLevel:3,unlockText:'Defeat Roxyne in The Thornwild.',portraitAsset:'assets/a7/characters/level3/chr-roxyne-demon-lord-portrait-v01.png',migration:'new-kit' }),
  calyptra: defineBoon({ id:'calyptra',name:'Calyptra',identity:'Demon Lord of Chance',title:'Loaded Dice',color:'#e97cff',accentColor:'#ffe36e',glyph:'♦',special:'rouletteBurst',specialName:'Roulette Burst',specialDescription:'Roll a disclosed combat result: damage, sustain, resources, or a jackpot.',specialEnergyCost:24,arcaneDescription:'Shots roll visible power bands and occasionally become Jackpot bolts.',passiveDescription:'+8% critical damage and favorable luck weight per stack.',duplicateDescription:'Better favorable weighting; high stacks can double a Jackpot result.',role:'Random spikes',passiveComponents:[{kind:'luck',perStack:.08}],arcaneComponents:[{kind:'damage',base:.85,perStack:.04,cap:1.65},{kind:'luck',perStack:.05}],tags:['chance','critical','jackpot','demon-lord'],unlockLevel:4,unlockText:'Defeat Calyptra in The Thunder Jackpot.',migration:'proven-kit' }),
  isolde: defineBoon({ id:'isolde',name:'Isolde',identity:'Demon Lord of Preservation',title:'Crystal Echo',color:'#8ee7ff',accentColor:'#f5fdff',glyph:'◇',special:'crystalEcho',specialName:'Crystal Firing Clone',specialDescription:'Create a brief crystal echo that repeats Milo\'s Arcane casts.',specialEnergyCost:28,arcaneDescription:'Bolts ricochet through room geometry and enemies.',passiveDescription:'+12% projectile range per stack.',duplicateDescription:'More bounces and a second firing echo at high stacks.',role:'Geometry clear',passiveComponents:[{kind:'range',perStack:.12}],arcaneComponents:[{kind:'ricochet',perStack:1}],tags:['ice','ricochet','echo','demon-lord'],unlockLevel:5,unlockText:'Defeat Isolde in The Frozen Basilica.',migration:'proven-kit' }),
  somnia: defineBoon({ id:'somnia',name:'Somnia',identity:'Demon Lord of Dreams',title:'Velvet Loop',color:'#bc7cff',accentColor:'#ffd8f5',glyph:'◌',special:'illusionDecoy',specialName:'Illusion Decoy',specialDescription:'Leave a decoy that distracts enemies and repeats Arcane casts.',specialEnergyCost:25,arcaneDescription:'Every cast creates a delayed echo shot along the same path.',passiveDescription:'Recover from hurt and knockback 10% faster per stack.',duplicateDescription:'Additional echoes; the decoy gains its own repeating fire.',role:'Safety / repetition',passiveComponents:[{kind:'movement',perStack:.1,tags:['hurt-recovery']}],arcaneComponents:[{kind:'echo',base:1,perStack:1,hooks:['onMagicCast']}],tags:['dream','echo','decoy','demon-lord'],unlockLevel:6,unlockText:'Defeat Somnia in The Forever Motel.',migration:'new-kit' }),
  vespera: defineBoon({ id:'vespera',name:'Vespera',identity:'Demon Lord of Reflections',title:'Mirror Fang',color:'#d7b7ff',accentColor:'#ffffff',glyph:'◈',special:'mirrorShield',specialName:'Mirror Shield',specialDescription:'Raise a timed shield that reflects hostile projectiles.',specialEnergyCost:26,arcaneDescription:'Impacts split into mirror shards that cut nearby targets.',passiveDescription:'Perfect Dodge timing is more forgiving per stack.',duplicateDescription:'More impact shards, longer reflection, and stronger returned shots.',role:'Counterplay',passiveComponents:[{kind:'movement',perStack:.04,tags:['dodge-window']}],arcaneComponents:[{kind:'split',perStack:1,hooks:['onMagicHit']}],tags:['mirror','reflect','counter','demon-lord'],unlockLevel:7,unlockText:'Defeat Vespera in the City of a Thousand Faces.',migration:'new-kit' }),
  aurelia: defineBoon({ id:'aurelia',name:'Aurelia',identity:'Gold and Fortune Goddess',title:'Gilded Hunger',color:'#f7be3e',accentColor:'#fff2a8',glyph:'¤',special:'extractionBurst',specialName:'Extraction Burst',specialDescription:'Consume a bounded portion of current run wealth for a golden blast.',specialEnergyCost:30,arcaneDescription:'Kills can drop bonus temporary wealth; wealth feeds capped combat power.',passiveDescription:'+15% soul-shard and temporary-currency gain per stack.',duplicateDescription:'Improved conversion and a stronger capped currency-to-power ratio.',role:'Economy',passiveComponents:[{kind:'currency',perStack:.15}],arcaneComponents:[{kind:'drops',perStack:.12,hooks:['onEnemyKilled']},{kind:'damage',perStack:.03,tags:['currency-scaled']}],tags:['gold','currency','economy'],unlockLevel:6,unlockText:'Free Aurelia in The Forever Motel.',migration:'new-kit' }),
  noctissa: defineBoon({ id:'noctissa',name:'Noctissa',identity:'Shadow and Secret Goddess',title:'Shade Spiral',color:'#5c5be8',accentColor:'#d9d5ff',glyph:'◐',special:'damageBlink',specialName:'Damage Blink',specialDescription:'Blink through the target lane, damaging enemies along the vanished path.',specialEnergyCost:20,arcaneDescription:'Bolts leave a lingering shadow trail that damages enemies crossing it.',passiveDescription:'+15% ambush damage against unaware or full-health targets per stack.',duplicateDescription:'Longer trail and blink; high stacks create an echo path.',role:'Ambush / mobility',passiveComponents:[{kind:'ambush',perStack:.15}],arcaneComponents:[{kind:'status',status:'shadow-trail',perStack:.25}],tags:['shadow','blink','ambush'],unlockLevel:7,unlockText:'Free Noctissa in the City of a Thousand Faces.',migration:'proven-kit' }),
  lilith: defineBoon({ id:'lilith',name:'Lilith',identity:'Succubus Queen',title:'Blood Pact',color:'#b90f4a',accentColor:'#ff9aa9',glyph:'♥',special:'drainBurst',specialName:'Drain Burst',specialDescription:'Drain nearby enemies and convert damage into Health and blood shielding.',specialEnergyCost:34,arcaneDescription:'Bolts steal life from elites and bosses while Milo is below full Health.',passiveDescription:'Deal more damage as Health falls.',duplicateDescription:'Stronger elite life-steal; overhealing becomes a blood shield.',role:'Risk sustain',passiveComponents:[{kind:'damage',perStack:.18,hooks:['onLowHealth']}],arcaneComponents:[{kind:'lifeSteal',perStack:.025,tags:['elite','boss']}],tags:['blood','risk','lifesteal'],unlockLevel:8,unlockText:"Defeat Lilith in Lilith's Throne.",migration:'new-kit' }),
  seraphine: defineBoon({ id:'seraphine',name:'Seraphine',identity:'Fallen Angel',title:'Halo Ward',color:'#fff19a',accentColor:'#ffffff',glyph:'✧',special:'haloField',specialName:'Halo Field',specialDescription:'Summon halo charges that negate incoming hits.',specialEnergyCost:30,arcaneDescription:'Orbiting fragments periodically fire at nearby enemies.',passiveDescription:'Gain a slowly regenerating shield.',duplicateDescription:'More fragments, faster regeneration, and fragment projectile fire.',role:'Defense',passiveComponents:[{kind:'shield',base:1,perStack:1}],arcaneComponents:[{kind:'split',perStack:1,tags:['orbiting']}],tags:['angel','shield','orbit'],unlockLevel:9,unlockText:'Complete The Self Below.',migration:'proven-kit' }),
};

// Alpha 5.1 ability-identity copy. Keeping this small override table adjacent
// to the roster makes the behavior pass reviewable without rewriting the
// dense, generated boon definitions above.
const SPECIAL_IDENTITY_COPY: Partial<Record<BoonId, Pick<BoonDefinition,'specialName'|'specialDescription'>>> = {
  zephyra:{specialName:'Crosswind Burst',specialDescription:'Blast every enemy far away from Milo in both horizontal directions, deal light damage, and reflect nearby hostile shots.'},
  flora:{specialName:'Thorn Bind',specialDescription:'Vines immobilize the nearest enemy. Rooted enemies cannot move, but they can still fire.'},
  voltara:{specialName:'Arc Chain',specialDescription:'Controlled lightning snaps through a small group, briefly stunning without erasing the room.'},
  crya:{specialName:'Whiteout',specialDescription:'Slow every enemy in the room for several seconds and cover them in visible frost.'},
  luna:{specialName:'Moon Echo',specialDescription:'Summon a short-lived moon orb that fires whenever Milo does, always in the opposite direction.'},
  solara:{specialName:'Radiant Lance',specialDescription:'Call a brilliant vertical ray onto the strongest living target.'},
  belladonna:{specialName:'Devour',specialDescription:'Eat a weakened enemy directly in front of Milo, executing it and restoring a little Health.'},
  nerissa:{specialName:'Siren Call',specialDescription:'Charm the nearest enemy. It approaches Milo without attacking and takes extra damage.'},
  roxyne:{specialName:'Predator Pounce',specialDescription:'Pounce through the target lane with a short invulnerable attack and a dedicated Milo pose.'},
  calyptra:{specialName:'Loaded Dice',specialDescription:'Randomly heal, strike an enemy, drop shards, or hurt Milo. An extremely rare roll drops a boon.'},
  somnia:{specialName:'Velvet Feint',specialDescription:'Fire a dense line of identical dream bolts. All but one are harmless; the real bolt hits extra hard.'},
  vespera:{specialName:'Mirror Shield',specialDescription:'Raise a clearly visible timed mirror shell that reflects hostile projectiles.'},
  aurelia:{specialName:'Gilded Veil',specialDescription:'Blind every enemy. Attacks created while blinded visibly miss Milo.'},
  lilith:{specialName:'Blood Pact',specialDescription:'Sacrifice Health for a stacking damage increase that lasts through the current room.'},
  seraphine:{specialName:'Halo Field',specialDescription:'Summon wide horizontal halo charges that orbit Milo and negate incoming hits.'},
};
for(const [id,copy] of Object.entries(SPECIAL_IDENTITY_COPY) as [BoonId,NonNullable<typeof SPECIAL_IDENTITY_COPY[BoonId]>][])Object.assign(BOONS[id],copy);

export const BOON_ORDER: BoonId[] = ['pyrra','maris','gaia','zephyra','flora','voltara','crya','luna','solara','belladonna','nerissa','roxyne','calyptra','isolde','somnia','vespera','aurelia','noctissa','lilith','seraphine'];

export const UPGRADE_INFO: Record<UpgradeId, { name: string; description: string; max: number; category: UpgradeCategory }> = {
  vitality: { name: 'Thick Crust', description: '+5 starting HP', max: 5, category: 'Body' },
  reservoir: { name: 'Deep Mug', description: '+6 max energy', max: 5, category: 'Body' },
  traction: { name: 'Dance Shoes', description: '+2.5% movement speed and acceleration', max: 5, category: 'Body' },
  kindling: { name: 'Arcane Focus', description: '+5% base Magic damage', max: 5, category: 'Arcane' },
  cadence: { name: 'Quick Hands', description: '+4% Magic cast rate', max: 5, category: 'Arcane' },
  ritual: { name: 'Clean Sigil', description: 'Specials cost 4% less energy', max: 5, category: 'Arcane' },
  magnet: { name: 'Soul Magnet', description: 'Pickups pull from 45 px farther away', max: 5, category: 'Fortune' },
  showboat: { name: 'Showboat', description: '+12% Rush payout charge; 8% slower decay', max: 5, category: 'Fortune' },
  reroll: { name: 'Marked Cards', description: '+1 boon reroll each run', max: 3, category: 'Fate' },
  boonChoice: { name: 'Warm Invitation', description: 'Boon choices restore 3% Health and Energy', max: 3, category: 'Fate' },
  wagerFavor: { name: "House's Tell", description: 'Better wager payouts and clearer risk previews', max: 5, category: 'Fate' },
  pizzaQuality: { name: 'Real Mozzarella', description: 'Pizza restores 8% more Health', max: 5, category: 'Hellroom' },
  coffeeQuality: { name: 'Better Beans', description: 'Coffee restores 8% more Demon Energy', max: 5, category: 'Hellroom' },
  endlessPrep: { name: 'Deep Pockets', description: '+1 recovery charge when entering Deep Dive', max: 3, category: 'Hellroom' },
  training: { name: 'Floor Tape', description: 'Adds 0.03s coyote time and jump buffering', max: 1, category: 'Hellroom' },
};

export function upgradeCost(id: UpgradeId, level: number): number {
  const base: Record<UpgradeId, number> = {
    vitality:5,reservoir:5,traction:7,kindling:7,cadence:8,ritual:8,magnet:6,showboat:9,
    reroll:12,boonChoice:15,wagerFavor:11,pizzaQuality:7,coffeeQuality:7,endlessPrep:18,training:10,
  };
  return base[id] + level * 4;
}

export const DEFAULT_SAVE: SaveData = {
  version: 4,
  shards: 0,
  unlocked: ['pyrra'],
  collection: ['pyrra'],
  milestones: [],
  storyFlags: [],
  upgrades: {
    vitality:0,reservoir:0,traction:0,kindling:0,cadence:0,ritual:0,magnet:0,showboat:0,
    reroll:0,boonChoice:0,wagerFavor:0,pizzaQuality:0,coffeeQuality:0,endlessPrep:0,training:0,
  },
  bestRoom: 0,
  wins: 0,
  bestStyle: 0,
  sRanks: 0,
  jackpots: 0,
  wagersWon: 0,
  highScore: 0,
  endlessUnlocked: false,
  bestEndless: 0,
  bestRunTime: 0,
  diveLevel: 1,
  diveXp: 0,
  lifetimeRooms: 0,
  lifetimeEnemies: 0,
  lifetimeRuns: 0,
  recentRuns: [],
  settings: {
    sound:true, voice:true, shake:true, reducedVfx:false,
    masterVolume:.8, musicVolume:.72, sfxVolume:.78, voiceVolume:.6,
  },
};

export const HUB_ROOM: RoomDefinition = {
  name: "Milo's Hellroom",
  subtitle: 'Earth Bedroom · Infernal Overlay',
  type: 'traversal',
  theme: 'cathedral',
  playerStart: { x: 330, y: 545 },
  objective: 'Explore the room',
  platforms: [
    { x: 0, y: 630, w: WIDTH, h: 90 },
    { x: 28, y: 474, w: 345, h: 22 },
    { x: 710, y: 410, w: 245, h: 22 },
  ],
  hazards: [],
  spawns: [],
  exit: { x: 1160, y: 505, w: 84, h: 125 },
};

const ground = { x: 0, y: FLOOR_Y, w: WIDTH, h: HEIGHT - FLOOR_Y };

export const ROOMS: RoomDefinition[] = [
  {
    name: 'Ember Alley',
    subtitle: 'Level 1 · Room 1 of 5',
    type: 'combat',
    theme: 'alley',
    playerStart: { x: 72, y: 560 },
    objective: 'Clear the alley',
    platforms: [
      ground,
      { x: 245, y: 535, w: 190, h: 24 },
      { x: 535, y: 455, w: 175, h: 24 },
      { x: 820, y: 535, w: 205, h: 24 },
    ],
    hazards: [],
    spawns: [
      { type: 'imp', x: 330, y: 485 },
      { type: 'imp', x: 615, y: 405 },
      { type: 'floater', x: 760, y: 285 },
      { type: 'imp', x: 900, y: 485 },
      { type: 'imp', x: 1080, y: 590 },
    ],
    exit: { x: 1194, y: 548, w: 58, h: 102 },
  },
  {
    name: 'The Boilerworks',
    subtitle: 'Level 1 · Room 2 of 5',
    type: 'traversal',
    theme: 'boiler',
    playerStart: { x: 55, y: 560 },
    objective: 'Reach the far gate',
    platforms: [
      { x: 0, y: FLOOR_Y, w: 238, h: 70 },
      { x: 325, y: 595, w: 180, h: 125 },
      { x: 565, y: 510, w: 145, h: 210 },
      { x: 775, y: 575, w: 195, h: 145 },
      { x: 1055, y: FLOOR_Y, w: 225, h: 70 },
      { x: 410, y: 400, w: 135, h: 20 },
      { x: 850, y: 385, w: 155, h: 20 },
    ],
    hazards: [
      { type: 'lava', x: 238, y: 675, w: 87, h: 45, damage: 18 },
      { type: 'lava', x: 505, y: 675, w: 60, h: 45, damage: 18 },
      { type: 'lava', x: 710, y: 675, w: 65, h: 45, damage: 18 },
      { type: 'lava', x: 970, y: 675, w: 85, h: 45, damage: 18 },
      { type: 'spikes', x: 640, y: 486, w: 60, h: 24, damage: 14 },
    ],
    spawns: [
      { type: 'succubus', x: 445, y: 350 },
      { type: 'floater', x: 690, y: 310 },
      { type: 'succubus', x: 900, y: 335 },
    ],
    exit: { x: 1194, y: 548, w: 58, h: 102 },
  },
  {
    name: 'Last Call Lounge',
    subtitle: 'Level 1 · Mini-Boss',
    type: 'miniboss',
    theme: 'cathedral',
    playerStart: { x: 85, y: 560 },
    objective: 'Defeat the Bottomless Bartender',
    platforms: [
      ground,
      { x: 178, y: 455, w: 200, h: 20 },
      { x: 902, y: 455, w: 200, h: 20 },
    ],
    hazards: [],
    spawns: [{ type: 'brute', x: 850, y: 500 }],
    exit: { x: 1194, y: 548, w: 58, h: 102 },
  },
  {
    name: 'Neon Foundry',
    subtitle: 'Level 1 · Room 4 of 5',
    type: 'combat',
    theme: 'foundry',
    playerStart: { x: 70, y: 560 },
    objective: 'Survive the foundry',
    platforms: [
      ground,
      { x: 135, y: 485, w: 165, h: 22 },
      { x: 410, y: 395, w: 150, h: 22 },
      { x: 680, y: 485, w: 180, h: 22 },
      { x: 1000, y: 400, w: 155, h: 22 },
    ],
    hazards: [
      { type: 'spikes', x: 320, y: 626, w: 82, h: 24, damage: 14 },
      { type: 'spikes', x: 875, y: 626, w: 90, h: 24, damage: 14 },
    ],
    spawns: [
      { type: 'imp', x: 190, y: 435 },
      { type: 'floater', x: 350, y: 280 },
      { type: 'succubus', x: 455, y: 345 },
      { type: 'imp', x: 740, y: 435 },
      { type: 'floater', x: 920, y: 300 },
      { type: 'succubus', x: 1050, y: 350 },
      { type: 'imp', x: 1140, y: 590 },
    ],
    exit: { x: 1194, y: 548, w: 58, h: 102 },
  },
  {
    name: "Belladonna's Maw",
    subtitle: 'Level 1 · Boss',
    type: 'boss',
    theme: 'throne',
    playerStart: { x: 85, y: 560 },
    objective: 'Defeat Belladonna',
    platforms: [
      ground,
      { x: 235, y: 475, w: 190, h: 20 },
      { x: 855, y: 475, w: 190, h: 20 },
      { x: 525, y: 365, w: 230, h: 20 },
    ],
    hazards: [
      { type: 'spikes', x: 470, y: 626, w: 88, h: 24, damage: 16 },
      { type: 'spikes', x: 722, y: 626, w: 88, h: 24, damage: 16 },
    ],
    spawns: [{ type: 'warden', x: 845, y: 455 }],
    exit: { x: 1194, y: 548, w: 58, h: 102 },
  },
];
