export type GameScreen = 'title' | 'hub' | 'playing' | 'dialogue' | 'reward' | 'route' | 'paused' | 'dead' | 'victory' | 'credits';
export type GateSide = 'left' | 'right' | 'top' | 'bottom';

// Story content continues to grow through the nine-level campaign. Keeping the
// identifier nominally string-based lets dialogue data remain the authority
// without requiring this erased type-only file to duplicate the entire script.
export type StoryBeatId = string;

export type AccessTier = 'free' | 'full';
export type DeepDivePower = 'frenzied' | 'armored' | 'volatile' | 'homing' | 'summoner';

export type BoonId =
  | 'pyrra' | 'maris' | 'gaia' | 'zephyra' | 'flora'
  | 'voltara' | 'crya' | 'luna' | 'solara' | 'belladonna'
  | 'nerissa' | 'roxyne' | 'calyptra' | 'isolde' | 'somnia'
  | 'vespera' | 'aurelia' | 'noctissa' | 'lilith' | 'seraphine';
export type SpecialId =
  | 'flameNova' | 'groundWave' | 'stoneBarrier' | 'reflectingGust' | 'vineLash'
  | 'chainBurst' | 'freezeCone' | 'dreamPulse' | 'lightColumn' | 'rushState'
  | 'charmNote' | 'pounceAura' | 'rouletteBurst' | 'crystalEcho' | 'illusionDecoy'
  | 'mirrorShield' | 'extractionBurst' | 'damageBlink' | 'drainBurst' | 'haloField';
export type UpgradeId =
  | 'vitality' | 'reservoir' | 'traction'
  | 'kindling' | 'cadence' | 'ritual'
  | 'magnet' | 'showboat'
  | 'reroll' | 'boonChoice' | 'wagerFavor'
  | 'pizzaQuality' | 'coffeeQuality' | 'endlessPrep' | 'training';
export type UpgradeCategory = 'Body' | 'Arcane' | 'Fortune' | 'Fate' | 'Hellroom';

export type BoonHook =
  | 'onMagicCast' | 'onMagicHit' | 'onMagicMiss' | 'onEnemyKilled'
  | 'onBossHit' | 'onCritical' | 'onSpecialUsed' | 'onEnergySpent'
  | 'onDamageTaken' | 'onHealthRestored' | 'onShieldBroken' | 'onLowHealth'
  | 'onPickup' | 'onJump' | 'onDash' | 'onBlink' | 'onRoomEntered'
  | 'onRoomCleared' | 'onBoonAcquired' | 'onDuplicate' | 'onPlayerDeath';

export type EffectKind =
  | 'damage' | 'size' | 'speed' | 'range' | 'fireRate' | 'split' | 'pierce'
  | 'ricochet' | 'homing' | 'return' | 'status' | 'explosion' | 'chain'
  | 'mark' | 'echo' | 'lifeSteal' | 'shield' | 'healing' | 'movement'
  | 'jump' | 'drops' | 'currency' | 'luck' | 'knockback' | 'ambush';

export interface EffectComponent {
  kind: EffectKind;
  base?: number;
  perStack?: number;
  cap?: number;
  status?: string;
  hooks?: BoonHook[];
  tags?: string[];
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Vector {
  x: number;
  y: number;
}

export interface BoonDefinition {
  id: BoonId;
  name: string;
  identity: string;
  title: string;
  color: string;
  accentColor: string;
  glyph: string;
  special: SpecialId;
  specialName: string;
  specialDescription: string;
  specialEnergyCost: number;
  arcaneDescription: string;
  passiveDescription: string;
  duplicateDescription: string;
  role: string;
  passiveComponents: EffectComponent[];
  arcaneComponents: EffectComponent[];
  stackThresholds: number[];
  tags: string[];
  unlockLevel: number;
  unlockText: string;
  migration: 'proven-kit' | 'new-kit';
  namespace: 'core';
  contentVersion: 1;
  accessTier: AccessTier;
  portrait?: Rect;
  portraitAsset?: string;
}

export interface RunSummaryRecord {
  id: string;
  seed: number;
  result: 'death' | 'returned' | 'victory';
  durationSeconds: number;
  roomsCleared: number;
  endlessDepth: number;
  shardsBanked: number;
  score: number;
  highestStyle: number;
  damageTaken: number;
  enemiesDefeated: number;
  boonsAcquired: number;
  wagersAttempted: number;
  wagersWon: number;
  diveXpEarned: number;
  topBoon?: BoonId;
}

export interface SaveData {
  version: 4;
  shards: number;
  unlocked: BoonId[];
  collection: BoonId[];
  milestones: string[];
  storyFlags: string[];
  upgrades: Record<UpgradeId, number>;
  bestRoom: number;
  wins: number;
  bestStyle: number;
  sRanks: number;
  jackpots: number;
  wagersWon: number;
  highScore: number;
  endlessUnlocked: boolean;
  bestEndless: number;
  bestRunTime: number;
  diveLevel: number;
  diveXp: number;
  lifetimeRooms: number;
  lifetimeEnemies: number;
  lifetimeRuns: number;
  recentRuns: RunSummaryRecord[];
  settings: {
    sound: boolean;
    voice: boolean;
    shake: boolean;
    reducedVfx: boolean;
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    voiceVolume: number;
  };
}

export interface CampaignLevelDefinition {
  level: number;
  name: string;
  depthProfiles: number[];
  signatureMechanics: string[];
  miniboss: string;
  boss: string;
  boonUnlocks: BoonId[];
  revelation: string;
  kind: 'demon-lord' | 'queen' | 'finale';
  accessTier: AccessTier;
}

export interface Player extends Rect {
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  coyote: number;
  jumpBuffer: number;
  maxHealth: number;
  health: number;
  maxEnergy: number;
  energy: number;
  fireCooldown: number;
  specialCooldown: number;
  invulnerable: number;
  hurtFlash: number;
  animationTime: number;
  runAnimationTime: number;
  special: SpecialId;
  airJumps: number;
  dropTimer: number;
  dashTime: number;
  dashCooldown: number;
  dashX: number;
  dashY: number;
  dashCharges: number;
  firePoseTime: number;
  landPoseTime: number;
  lastAimX: number;
  lastAimY: number;
  kickTime: number;
  punchTime: number;
  punchHit: boolean;
  waveSlideTime: number;
  dashRecoveryTime: number;
  extraLifeUsed: boolean;
  shieldCharges: number;
  perfectDodgeCooldown: number;
}

export type EnemyType =
  | 'imp' | 'floater' | 'succubus' | 'hellhound' | 'crawler' | 'siren'
  | 'drownedFan' | 'chorusWisp' | 'courtCantor' | 'reefHound' | 'bubbleCrab' | 'spotlightDancer'
  | 'fanChampion' | 'nerissa' | 'chantPillar'
  | 'thornStalker' | 'sporeMaw' | 'vineLurker' | 'razorBoar' | 'rootMaw' | 'thornArcher'
  | 'perfectPrey' | 'roxyne'
  | 'jackpotGremlin' | 'cardDealer' | 'diceHound' | 'railWisp' | 'slotMimic' | 'jinxCroupier'
  | 'ladyLuckless' | 'calyptraBoss'
  | 'icePenitent' | 'choirShard' | 'reliquaryKnight' | 'frostHound' | 'glassDeacon' | 'preservationWisp'
  | 'memoryGolem' | 'isoldeBoss'
  | 'luggageImp' | 'sleepwalker' | 'keyholeWisp' | 'bellhopMimic' | 'hallwayHound' | 'wakeUpCaller'
  | 'fantasyAnchor' | 'dreamGirl' | 'somniaBoss'
  | 'mirrorPunk' | 'prismWisp' | 'facelessStriker' | 'glassHound' | 'echoSniper' | 'reflectionKnight'
  | 'betterMilo' | 'vesperaBoss'
  | 'throneLegionary' | 'charmAcolyte' | 'portalHound' | 'bloodCantor' | 'decreeWisp' | 'hollowSuccubus'
  | 'daughterAttack' | 'daughterDefense' | 'daughterMovement' | 'daughterEnergy' | 'lilithBoss'
  | 'hollowShade' | 'bossRushHerald' | 'hollowBoss'
  | 'dummy' | 'brute' | 'warden';
export type EliteModifier = 'frenzied' | 'armored' | 'volatile';

export interface Enemy extends Rect {
  id: number;
  type: EnemyType;
  vx: number;
  vy: number;
  maxHealth: number;
  health: number;
  touchDamage: number;
  grounded: boolean;
  facing: 1 | -1;
  timer: number;
  attackTimer: number;
  invulnerable: number;
  phase: number;
  dead: boolean;
  hitStun: number;
  attackCount: number;
  dotTime: number;
  dotTick: number;
  dotDamage: number;
  dotLabel: string;
  dotColor: string;
  attackPoseTime: number;
  attackPose: number;
  deathTime: number;
  slowTime: number;
  rootTime: number;
  rootX: number;
  rootY: number;
  charmTime: number;
  blindTime: number;
  soulLinked: boolean;
  statusHits: number;
  thornMarks?: number;
  dreamHits?: number;
  dreamDamageBank?: number;
  frostHits?: number;
  frozenTime?: number;
  milestones: number;
  eliteModifier?: EliteModifier;
  eliteArmor?: number;
  volatileArmed?: boolean;
  deepDivePowers?: DeepDivePower[];
  deepDiveSummonTimer?: number;
}

export type ProjectileOwner = 'player' | 'enemy';

export interface Projectile extends Rect {
  id: number;
  owner: ProjectileOwner;
  vx: number;
  vy: number;
  damage: number;
  life: number;
  color: string;
  radius: number;
  pierce: number;
  bounces: number;
  homing: number;
  explosive: boolean;
  age?: number;
  baseRadius?: number;
  wave?: number;
  boomerang?: boolean;
  returning?: boolean;
  accentColor?: string;
  illusory?: boolean;
  missesPlayer?: boolean;
  turretShot?: boolean;
  destructible?: boolean;
  songNote?: boolean;
  mirrorReflected?: boolean;
  primaryBoon?: BoonId;
  attachedBoons?: BoonId[];
  spawnDelay?: number;
}

export type PickupType = 'pizza' | 'coffee' | 'shard';

export interface Pickup extends Rect {
  id: number;
  type: PickupType;
  vx: number;
  vy: number;
  life: number;
  value: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
}

export interface Hazard extends Rect {
  type: 'spikes' | 'lava' | 'current' | 'bubble' | 'vine' | 'snare'
    | 'electric' | 'ice' | 'dreamDoor' | 'mirror' | 'royalSigil' | 'memoryRift';
  damage: number;
  forceX?: number;
  forceY?: number;
  cycleOffset?: number;
}

export interface EnemySpawn {
  type: EnemyType;
  x: number;
  y: number;
}

export type RoomType = 'combat' | 'traversal' | 'elite' | 'recovery' | 'cache' | 'miniboss' | 'boss';
export type RouteKind = 'combat' | 'elite' | 'recovery' | 'cache' | 'wager' | 'event';
export type WagerType = 'blood' | 'perfect' | 'rush' | 'chaos';

export interface RouteChoice {
  id: string;
  label: string;
  description: string;
  danger: 1 | 2 | 3;
  reward: string;
  kind: RouteKind;
  room: RoomDefinition;
}

export interface GeneratedRunPlan {
  seed: number;
  rooms: RoomDefinition[];
  branches: Record<number, RouteChoice[]>;
  wagerRooms: number[];
}

export interface RunMetrics {
  seed: number;
  startedAt: number;
  roomsCleared: number;
  endlessDepth: number;
  damageTaken: number;
  enemiesDefeated: number;
  boonsAcquired: number;
  wagersAttempted: number;
  wagersWon: number;
  diveXpEarned: number;
  highestStyle: number;
  routeChoices: string[];
  rewardChoices: BoonId[];
}

export interface RoomDefinition {
  name: string;
  subtitle: string;
  type: RoomType;
  theme: 'alley' | 'boiler' | 'cathedral' | 'foundry' | 'throne' | 'reef' | 'palace' | 'stage' | 'grove' | 'ruins' | 'canopy'
    | 'casino' | 'rail' | 'roulette' | 'basilica' | 'reliquary' | 'sanctum'
    | 'hallway' | 'motel' | 'dreamsuite' | 'gallery' | 'mirrorcourt' | 'city'
    | 'capital' | 'succubusHall' | 'royalThrone' | 'apartment' | 'brokenHub' | 'selfBelow';
  platforms: Rect[];
  hazards: Hazard[];
  spawns: EnemySpawn[];
  playerStart: Vector;
  exit: Rect;
  entrySide?: GateSide;
  exitSide?: GateSide;
  mapX?: number;
  mapY?: number;
  stageDepth?: number;
  complexity?: number;
  objective: string;
  entryDialogue?: StoryBeatId;
  clearDialogue?: StoryBeatId;
  routeKind?: RouteKind;
  rewardKind?: 'none' | 'arcane-cache' | 'major-boon' | 'wager';
  danger?: 1 | 2 | 3;
  seedKey?: string;
  wagerType?: WagerType;
  deepDiveCycle?: number;
  deepDivePowers?: DeepDivePower[];
  deepDiveBoonStacks?: number;
  deepDiveWagerTier?: number;
  doubleBoss?: boolean;
}

export interface BoonPickup extends Rect {
  boonId: BoonId;
  time: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}
