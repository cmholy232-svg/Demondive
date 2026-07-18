import './style.css';
import './settings.css';
import { DevicePromptService, GamepadActionResolver, isGameAction, mappedKeyboardActionActive, type GameAction as ControlName, type InputDevice } from './game/actions';
import { ARCANE_PROFILES, selectArcaneProfile, type ArcaneProfileId } from './game/arcane-tuning';
import { arcaneHarmonyLabel, boonNoteLabel } from './game/arcane-audio';
import { ArcaneAudioDirector } from './game/arcane-audio-director';
import { chooseSmartBoonOffers } from './game/boon-offers';
import { BOON_PROJECTILE_SHAPES, buildupThreshold, incomingDamageMultiplier, pickupMagnetRadius, selectAttachedBoons, selectDominantBoon, seraphineMaximumShieldCharges, somniaEchoCount } from './game/boon-runtime';
import { CombatSfxLimiter, type CombatSfxEvent } from './game/combat-audio';
import { BOONS, BOON_ORDER, ENEMY_BODIES, FLOOR_Y, HEIGHT, HUB_ROOM, LEVEL_EIGHT_ENCOUNTERS, LEVEL_FIVE_ENCOUNTERS, LEVEL_FOUR_ENCOUNTERS, LEVEL_NINE_ENCOUNTERS, LEVEL_ONE_ENCOUNTERS, LEVEL_SEVEN_ENCOUNTERS, LEVEL_SIX_ENCOUNTERS, LEVEL_THREE_ENCOUNTERS, LEVEL_TWO_ENCOUNTERS, ROOMS, UPGRADE_INFO, WIDTH, upgradeCost } from './game/content';
import { campaignContent } from './game/content-registry';
import { shapedCameraOffset } from './game/camera-feedback';
import { deepDiveBiome, deepDiveCrossPollination, deepDiveCycle, deepDiveEncounter, deepDiveHasBoonReward, deepDiveHasRouteChoice, deepDiveHasWager, deepDiveIsDoubleBoss, deepDiveMinimumEnemies, deepDivePowers, deepDiveRewardStacks, deepDiveRoute } from './game/deep-dive';
import { campaignThreat, deepDiveThreat } from './game/difficulty';
import { PROCEDURAL_SFX_PROFILES, sfxPitchMultiplier, type ProceduralSfxEvent } from './game/feedback-policy';
import { DIALOGUE_BEATS, TUTORIAL_STEPS, applyDialogueBeatMutation, type DialogueBeat, type TutorialAction } from './game/dialogue';
import { canAccessCampaignLevel, PC_MASTER_ACCESS } from './game/entitlements';
import { KeyboardBindingRepository, bindingConflicts, profileBindings, rebindAction, type KeyboardBindingState, type KeyboardProfileId } from './game/input-bindings';
import { buildRoomFrame, generateRunPlan, roomCountBounds } from './game/generator';
import { buildHudPriorityView } from './game/hud-view';
import { DAMAGE_TEXT_BUDGET, PARTICLE_EFFECT_BUDGET, enemyDefeatFeedback, enemyHitFeedback, shouldEmitImpactAccent } from './game/impact-feedback';
import { planProjectilePresentation, PROJECTILE_DETAIL_BUDGET, shouldEmitProjectileTrail } from './game/performance-policy';
import { buildRoomQualityMetadata } from './game/room-metadata';
import { calyptraCriticalMultiplier, calyptraPowerMultiplier, jackpotChanceFor, roomGradeFor, rushChargeForRank, scoreMultiplierForRank, styleRankFor } from './game/feel';
import { MusicDirector } from './game/music-director';
import type { MusicState } from './game/music';
import { MILO_ATLASES, type MiloAtlasDefinition } from './game/milo-animation';
import { awardDiveXp, diveXpRequired, DIVE_XP_REWARDS } from './game/profile-level';
import { MOVEMENT_PROFILES, selectMovementProfile, type MovementProfileId } from './game/player-tuning';
import { cloneDefaultSave } from './game/save';
import { BrowserSaveRepository } from './game/save-repository';
import { newRunRequest, sameSeedRetryRequest } from './game/run-retry';
import { createRunSeed, SeededRandom } from './game/rng';
import { ENTITY_WARNING_BUDGETS, RuntimeTelemetry, type EntityCounts } from './game/telemetry';
import type {
  BoonPickup,
  BoonId,
  Enemy,
  EnemyType,
  FloatingText,
  GateSide,
  GameScreen,
  Particle,
  Pickup,
  PickupType,
  Player,
  Projectile,
  Rect,
  RouteChoice,
  RouteKind,
  RoomDefinition,
  RunMetrics,
  SaveData,
  SpecialId,
  StoryBeatId,
  UpgradeId,
  WagerType,
} from './game/types';

const CURRENT_ALPHA_FINAL_LEVEL = 9;
// The temporary browser text-to-speech announcer is intentionally disabled.
// It can return when a production voice performance replaces it.
const ANNOUNCER_ENABLED = false;
const alphaCompletionFlag = (level: number) => `alpha_completion_level_${level}_seen`;
// Enemy, pickup, and arcing-projectile physics retain the established world
// gravity. Milo's gravity is selected independently through the A/B profile.
const GRAVITY = 2350;
const MOVEMENT_PROFILE_KEY = 'demondive-movement-profile-v1';
const ARCANE_PROFILE_KEY = 'demondive-arcane-profile-v1';
interface GroundWave extends Rect { id: number; vx: number; life: number; damage: number; facing: 1 | -1; hitIds: Set<number>; }
interface WagerShrine extends Rect { used: boolean; pulse: number; type: WagerType; }
interface ActiveWager { type: WagerType; failed: boolean; timer: number; }
interface BossHazard extends Rect { kind: 'pour' | 'bite' | 'temptation' | 'crowd' | 'spotlight' | 'pounce' | 'snare' | 'thorns' | 'electricRail' | 'diceSlam' | 'collapse' | 'wagerCircle' | 'crystalDelay' | 'memoryShatter' | 'frozenChoir' | 'dreamEcho' | 'dreamEchoFake' | 'falseWake' | 'mirrorOriginal' | 'mirrorReflected' | 'mirrorShatter' | 'portalRift' | 'charmSweep' | 'lifeTether' | 'royalDecree' | 'hollowEcho' | 'acceptance'; life: number; maxLife: number; telegraph: number; damage: number; color: string; missesPlayer?: boolean; participated?: boolean; resolved?: boolean; }
interface ArcaneImpact { id:number; x:number; y:number; life:number; maxLife:number; radius:number; color:string; accent:string; critical:boolean; }
interface LightRayEffect { x:number; y:number; life:number; maxLife:number; radius:number; color:string; }
interface GustEffect { x:number; y:number; life:number; maxLife:number; radius:number; }

function emptyBoonStacks(): Record<BoonId, number> {
  return Object.fromEntries(BOON_ORDER.map((id) => [id, 0])) as Record<BoonId, number>;
}

function mustElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function centerX(rect: Rect): number {
  return rect.x + rect.w / 2;
}

function centerY(rect: Rect): number {
  return rect.y + rect.h / 2;
}

function storedMovementProfile(): string | null {
  try { return window.localStorage.getItem(MOVEMENT_PROFILE_KEY); }
  catch { return null; }
}

function storedArcaneProfile(): string | null {
  try { return window.localStorage.getItem(ARCANE_PROFILE_KEY); }
  catch { return null; }
}

class DemonGame {
  private readonly canvas = mustElement<HTMLCanvasElement>('#game');
  private readonly ctx = this.canvas.getContext('2d', { alpha: false })!;
  private readonly overlay = mustElement<HTMLElement>('#overlay');
  private readonly hud = mustElement<HTMLElement>('#hud');
  private readonly roomLabel = mustElement<HTMLElement>('#room-label');
  private readonly healthFill = mustElement<HTMLElement>('#health-fill');
  private readonly healthText = mustElement<HTMLElement>('#health-text');
  private readonly energyFill = mustElement<HTMLElement>('#energy-fill');
  private readonly energyText = mustElement<HTMLElement>('#energy-text');
  private readonly diveLevelFill = mustElement<HTMLElement>('#dive-level-fill');
  private readonly diveLevelText = mustElement<HTMLElement>('#dive-level-text');
  private readonly diveLevelRow = mustElement<HTMLElement>('.dive-level-row');
  private readonly objective = mustElement<HTMLElement>('#objective');
  private readonly boonPips = mustElement<HTMLElement>('#boon-pips');
  private readonly modifierPanel = mustElement<HTMLElement>('#modifier-panel');
  private readonly roomMap = mustElement<HTMLElement>('#room-map');
  private readonly runShardsLabel = mustElement<HTMLElement>('#run-shards');
  private readonly currencyDisplay = mustElement<HTMLElement>('.currency');
  private readonly specialName = mustElement<HTMLElement>('#special-name');
  private readonly toastElement = mustElement<HTMLElement>('#toast');
  private readonly tutorialPrompt = mustElement<HTMLElement>('#tutorial-prompt');
  private readonly modifierToggle = mustElement<HTMLButtonElement>('#modifier-toggle');
  private readonly music = new MusicDirector(import.meta.env.BASE_URL);
  private readonly arcaneAudio = new ArcaneAudioDirector(import.meta.env.BASE_URL);
  private readonly saveRepository = new BrowserSaveRepository(window.localStorage);
  private readonly initialSaveLoad = this.saveRepository.load();
  private readonly bindingRepository = new KeyboardBindingRepository(window.localStorage);
  private keyboardBindingState: KeyboardBindingState = this.bindingRepository.load();
  private readonly promptService = new DevicePromptService('keyboard');
  private readonly gamepadActions = new GamepadActionResolver();
  private readonly telemetry = new RuntimeTelemetry('alpha-7.4a-development');
  private movementProfileId: MovementProfileId = selectMovementProfile(window.location.search,storedMovementProfile());
  private arcaneProfileId: ArcaneProfileId = selectArcaneProfile(window.location.search,storedArcaneProfile());

  private screen: GameScreen = 'title';
  private previousScreen: GameScreen = 'playing';
  private save: SaveData = this.initialSaveLoad.save;
  private selectedStartingBoon: BoonId = 'pyrra';
  private boonStacks: Record<BoonId, number> = emptyBoonStacks();
  private boonOfferDrought: Record<BoonId, number> = emptyBoonStacks();
  private lastRewardBoon: BoonId = 'pyrra';
  private roomIndex = 0;
  private currentDepth = 1;
  private room: RoomDefinition = ROOMS[0];
  private runRooms: RoomDefinition[] = ROOMS;
  private roomCleared = false;
  private bossDefeated = false;
  private rewardGranted = false;
  private rewardDelay = 0;
  private roomIntro = 0;
  private transition = 0;
  private runShards = 0;
  private aureliaCurrencyRemainder = 0;
  private runBanked = false;
  private boonPickups: BoonPickup[] = [];
  private rewardInspectionLocked = false;
  private rerollsRemaining = 0;
  private runSeed = 1;
  private runRng = new SeededRandom(1);
  private routeBranches: Record<number, RouteChoice[]> = {};
  private branchChosenAt = new Set<number>();
  private clearedRoomIndices = new Set<number>();
  private runMetrics: RunMetrics = {
    seed:1,startedAt:0,roomsCleared:0,endlessDepth:0,damageTaken:0,enemiesDefeated:0,
    boonsAcquired:0,wagersAttempted:0,wagersWon:0,diveXpEarned:0,highestStyle:0,routeChoices:[],rewardChoices:[],
  };
  private hubModalOpen = false;
  private dialogueBeat: DialogueBeat | null = null;
  private dialogueLineIndex = 0;
  private dialogueReturnScreen: GameScreen = 'title';
  private dialogueOnComplete: (() => void) | null = null;
  private tutorialActive = false;
  private tutorialStep = 0;
  private tutorialRecovery = new Set<'pizza' | 'coffee'>();
  private time = 0;
  private lastTime = performance.now();
  private entityId = 1;
  private shake = 0;
  private screenFlash = 0;
  private boonColorPulse = 0;
  private boonPulseColor = '#44ff70';
  private hitPause = 0;
  private combo = 0;
  private comboTimer = 0;
  private styleMeter = 0;
  private styleRank = 'D';
  private styleFlash = 0;
  private runScore = 0;
  private runPeakStyle = 0;
  private rushPayout = 0;
  private payoutFlash = 0;
  private payoutFlashCount = 1;
  private roomTime = 0;
  private roomDamageTaken = 0;
  private roomCombatStarted = false;
  private roomGrade = '';
  private gradeTimer = 0;
  private wagerShrine: WagerShrine | null = null;
  private wagerMultiplier = 1;
  private activeWager: ActiveWager | null = null;
  private isEndless = false;
  private endlessRoom = 0;
  private pendingEndlessRoom = 0;
  private endlessRecoveryCharges = 0;
  private playerSnareTime = 0;
  private snareNoticeCooldown = 0;
  private stoneBarrierTime = 0;
  private stoneBarrierHits = 0;
  private stoneBarrierX = 0;
  private stoneBarrierY = 0;
  private stoneBarrierFacing: 1 | -1 = 1;
  private toastTimer = 0;
  private xpRevealTimer = 0;
  private currencyRevealTimer = 0;
  private ambientEmbers: Particle[] = [];
  private waves: GroundWave[] = [];
  private titleStartLocked = false;
  private titleToken = 0;
  private settingsReturnScreen: GameScreen | null = null;
  private loadoutReturnScreen: GameScreen | null = null;
  private alphaFinaleEnding = false;
  private footstepCooldown = 0;
  private fireBuffer = 0;
  private fireBufferPending = false;
  private impactFeedbackSequence = 0;
  private readonly presentedBossMilestones = new Map<number,number>();
  private activeSfx = 0;
  private readonly combatSfxLimiter = new CombatSfxLimiter();

  private player: Player = this.makePlayer('flameNova');
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private pickups: Pickup[] = [];
  private particles: Particle[] = [];
  private floatingText: FloatingText[] = [];
  private lightningEffects: Array<{ x1: number; y1: number; x2: number; y2: number; life: number; maxLife: number; color: string }> = [];
  private lightRayEffects: LightRayEffect[] = [];
  private gustEffects: GustEffect[] = [];
  private kickHits = new Set<number>();
  private worldFreezeTimer = 0;
  private rushStateTimer = 0;
  private mirrorShieldTimer = 0;
  private lunaTurretTimer = 0;
  private bloodPactRoomBonus = 0;
  private bloodPactAuraTimer = 0;
  private appetiteMomentumStacks = 0;
  private appetiteMomentumTimer = 0;
  private appetiteRoomPower = 0;
  private seraphineShieldRegenTimer = 0;
  private seraphineFragmentTimer = 0;
  private belladonnaVortex = 0;
  private bossHazards: BossHazard[] = [];
  private arcaneImpacts: ArcaneImpact[] = [];
  private fanClubWave = 0;
  private fanClubIntermission = 0;
  private fanClubShieldAnnounced = false;
  private nerissaShieldAnnounced = false;
  private dreamDoorCooldown = 0;
  private dreamGirlShieldAnnounced = false;
  private daughterRelayWave = 0;
  private daughterRelayIntermission = 0;
  private bossRushWave = 0;
  private bossRushIntermission = 0;
  private lilithDecreeTimer = 0;
  private lilithDecreeLabel = '';
  private hollowStoredBoons: Record<BoonId, number> | null = null;
  private hollowRestoreQueue: BoonId[] = [];
  private hollowRestoreTimer = 0;

  private readonly keys = new Set<string>();
  private readonly touchControls = new Set<ControlName>();
  private inputPrevious = { jump: false, fire:false, special: false, dash: false, interact: false };
  private menuNavLatched = false;
  private menuActionLatched = false;
  private menuPauseLatched = false;
  private rebindingAction: ControlName | null = null;

  private readonly miloRunAtlas = new Image();
  private readonly miloMovementAtlas = new Image();
  private readonly miloCastAtlas = new Image();
  private readonly miloDashHurtAtlas = new Image();
  private readonly levelOneEnemyAtlas = new Image();
  private readonly bottomlessBartenderAtlas = new Image();
  private readonly belladonnaBossAtlas = new Image();
  private readonly levelTwoEnemyAtlas = new Image();
  private readonly fanChampionAtlas = new Image();
  private readonly nerissaBossAtlas = new Image();
  private readonly levelThreeEnemyAtlas = new Image();
  private readonly perfectPreyAtlas = new Image();
  private readonly roxyneBossAtlas = new Image();
  private readonly pickupAtlas = new Image();
  private readonly rushRankAtlas = new Image();
  private readonly boonPortraits = new Map<BoonId, HTMLImageElement>();
  private readonly miloPortrait = new Image();
  private readonly bottomlessPortrait = new Image();
  private readonly levelBackdrop = new Image();
  private readonly levelTwoBackdrop = new Image();
  private readonly levelThreeBackdrop = new Image();
  private readonly lateBackdrops = new Map<number, HTMLImageElement>();
  private readonly lateEnemyAtlases = new Map<number, HTMLImageElement>();
  private readonly lateEncounterAtlases = new Map<number, HTMLImageElement>();
  private readonly lateEnvironmentAtlases = new Map<number, HTMLImageElement>();
  private readonly boonSigils = new Map<BoonId, HTMLImageElement>();
  private readonly levelTiles = new Image();
  private readonly hubBackdrop = new Image();
  private audioContext: AudioContext | null = null;
  private sfxOutput: GainNode | null = null;
  private sfxNoiseBuffer: AudioBuffer | null = null;
  private sfxSequence = 0;
  private arcaneShotCounter = 0;
  private soundEnabled = true;
  private voiceEnabled = true;
  private shakeEnabled = true;
  private reducedVfx = false;

  constructor() {
    this.ctx.imageSmoothingEnabled = true;
    this.soundEnabled = this.save.settings.masterVolume > .001 && this.save.settings.sfxVolume > .001;
    this.save.settings.sound = this.soundEnabled;
    this.voiceEnabled = this.save.settings.voice;
    this.shakeEnabled = this.save.settings.shake;
    this.reducedVfx = this.save.settings.reducedVfx;
    this.music.setMasterVolume(this.save.settings.masterVolume);
    this.music.setMusicVolume(this.save.settings.musicVolume);
    (window as Window & { __DEMONDIVE_TELEMETRY__?: () => unknown }).__DEMONDIVE_TELEMETRY__ = () => ({
      ...this.telemetry.snapshot(),
      movementProfile:this.movementProfileId,
      arcaneProfile:this.arcaneProfileId,
      keyboardProfile:this.keyboardBindingState.profile,
    });
    this.bindInput();
    this.updateControlPrompts();
    this.modifierToggle.addEventListener('click', () => this.showArcanaLoadout());
    // Production atlases use fixed cells and a shared feet anchor. Canvas art
    // remains the fallback for moves that do not yet have approved raster poses.
    this.miloRunAtlas.src = `${import.meta.env.BASE_URL}${MILO_ATLASES.run.asset}`;
    this.miloMovementAtlas.src = `${import.meta.env.BASE_URL}${MILO_ATLASES.movement.asset}`;
    this.miloCastAtlas.src = `${import.meta.env.BASE_URL}${MILO_ATLASES.cast.asset}`;
    this.miloDashHurtAtlas.src = `${import.meta.env.BASE_URL}${MILO_ATLASES.dashHurt.asset}`;
    this.levelOneEnemyAtlas.src = `${import.meta.env.BASE_URL}assets/a5/enemies/enm-neonmaw-atlas-v02-fixed.png`;
    this.bottomlessBartenderAtlas.src = `${import.meta.env.BASE_URL}assets/a5/bosses/bos-bottomless-atlas-v01.png`;
    this.belladonnaBossAtlas.src = `${import.meta.env.BASE_URL}assets/a5/bosses/bos-belladonna-atlas-v02-fixed.png`;
    this.levelTwoEnemyAtlas.src = `${import.meta.env.BASE_URL}assets/a6/enemies/enm-drownedcourt-atlas-v02-fixed.png`;
    this.fanChampionAtlas.src = `${import.meta.env.BASE_URL}assets/a6/bosses/bos-fan-champion-atlas-v02-fixed.png`;
    this.nerissaBossAtlas.src = `${import.meta.env.BASE_URL}assets/a6/bosses/bos-nerissa-demon-lord-atlas-v02.png`;
    this.levelThreeEnemyAtlas.src = `${import.meta.env.BASE_URL}assets/a7/enemies/enm-thornwild-atlas-v01-fixed.png`;
    this.perfectPreyAtlas.src = `${import.meta.env.BASE_URL}assets/a7/bosses/bos-perfect-prey-atlas-v01-fixed.png`;
    this.roxyneBossAtlas.src = `${import.meta.env.BASE_URL}assets/a7/bosses/bos-roxyne-demon-lord-atlas-v01-fixed.png`;
    this.pickupAtlas.src = `${import.meta.env.BASE_URL}assets/v1/ui/pickups-v1.png`;
    this.rushRankAtlas.src = `${import.meta.env.BASE_URL}assets/v1/ui/rush-ranks-v1.png`;
    this.levelBackdrop.src = `${import.meta.env.BASE_URL}assets/a5/environment/env-neonmaw-background-main-v01.png`;
    this.levelTwoBackdrop.src = `${import.meta.env.BASE_URL}assets/a6/environment/env-drownedcourt-background-main-v01.png`;
    this.levelThreeBackdrop.src = `${import.meta.env.BASE_URL}assets/a7/environment/env-thornwild-background-main-v01.png`;
    const lateAssets: Record<number, { backdrop: string; enemies: string; encounters: string; environment: string }> = {
      4: { backdrop: 'assets/a75/environment/level4/env-thunder-jackpot-background-main-v02.png', enemies: 'assets/a75/enemies/level4/enm-thunder-jackpot-atlas-v01.png', encounters: 'assets/a75/bosses/level4/bos-thunder-jackpot-encounters-v01.png', environment: 'assets/a75/environment/level4/env-thunder-jackpot-construction-atlas-v01.png' },
      5: { backdrop: 'assets/a75/environment/level5/env-frozen-basilica-background-main-v02.png', enemies: 'assets/a75/enemies/level5/enm-frozen-basilica-atlas-v01.png', encounters: 'assets/a75/bosses/level5/bos-frozen-basilica-encounters-v01.png', environment: 'assets/a75/environment/level5/env-frozen-basilica-construction-atlas-v01.png' },
      6: { backdrop: 'assets/a75/environment/level6/env-forever-motel-background-main-v02.png', enemies: 'assets/a75/enemies/level6/enm-forever-motel-atlas-v01.png', encounters: 'assets/a75/bosses/level6/bos-forever-motel-encounters-v01.png', environment: 'assets/a75/environment/level6/env-forever-motel-construction-atlas-v01.png' },
      7: { backdrop: 'assets/a75/environment/level7/env-thousand-faces-background-main-v02.png', enemies: 'assets/a75/enemies/level7/enm-thousand-faces-atlas-v01.png', encounters: 'assets/a75/bosses/level7/bos-thousand-faces-encounters-v01.png', environment: 'assets/a75/environment/level7/env-thousand-faces-construction-atlas-v01.png' },
      8: { backdrop: 'assets/a75/environment/level8/env-liliths-throne-background-main-v02.png', enemies: 'assets/a75/enemies/level8/enm-liliths-throne-atlas-v01.png', encounters: 'assets/a75/bosses/level8/bos-liliths-throne-encounters-v01.png', environment: 'assets/a75/environment/level8/env-liliths-throne-construction-atlas-v01.png' },
      9: { backdrop: 'assets/a75/environment/level9/env-self-below-background-main-v02.png', enemies: 'assets/a75/enemies/level9/enm-self-below-atlas-v01.png', encounters: 'assets/a75/bosses/level9/bos-self-below-encounters-v01.png', environment: 'assets/a75/environment/level9/env-self-below-construction-atlas-v01.png' },
    };
    for (const [depthText, assets] of Object.entries(lateAssets)) {
      const depth = Number(depthText);
      for (const [registry, path] of [
        [this.lateBackdrops, assets.backdrop],
        [this.lateEnemyAtlases, assets.enemies],
        [this.lateEncounterAtlases, assets.encounters],
        [this.lateEnvironmentAtlases, assets.environment],
      ] as const) {
        const image = new Image();
        image.src = `${import.meta.env.BASE_URL}${path}`;
        registry.set(depth, image);
      }
    }
    this.levelTiles.src = `${import.meta.env.BASE_URL}assets/v1/environment/neon-maw-tiles-v1.png`;
    this.hubBackdrop.src = `${import.meta.env.BASE_URL}assets/a5/hub/env-hellroom-background-main-v01.png`;
    this.miloPortrait.src = `${import.meta.env.BASE_URL}assets/a5/characters/level1/chr-milo-portrait-v01.png`;
    this.bottomlessPortrait.src = `${import.meta.env.BASE_URL}assets/a5/characters/level1/chr-bottomless-bartender-portrait-v01.png`;
    for (const id of BOON_ORDER) {
      const image = new Image();
      if (BOONS[id].portraitAsset) image.src = `${import.meta.env.BASE_URL}${BOONS[id].portraitAsset}`;
      this.boonPortraits.set(id, image);
      const sigil = new Image();
      sigil.src = `${import.meta.env.BASE_URL}assets/a75/ui/boon-sigils/sigil-${id}-v01.svg`;
      this.boonSigils.set(id, sigil);
    }
    this.seedAmbientEmbers();
    this.showTitle();
    if(this.initialSaveLoad.corruptKeys.length>0)this.showToast('SAVE RECOVERY · CORRUPT DATA IGNORED · PROGRESS LOADED FROM THE SAFEST VALID SOURCE');
    else if(!this.initialSaveLoad.storageAvailable)this.showToast('LOCAL SAVE STORAGE BLOCKED · THIS SESSION REMAINS PLAYABLE BUT MAY NOT PERSIST');
    requestAnimationFrame((time) => this.frame(time));
  }

  private makePlayer(special: SpecialId): Player {
    const maxHealth = 100 + this.save.upgrades.vitality * 5;
    const maxEnergy = 100 + this.save.upgrades.reservoir * 6;
    return {
      x: 70,
      y: 560,
      w: 42,
      h: 72,
      vx: 0,
      vy: 0,
      facing: 1,
      grounded: false,
      coyote: 0,
      jumpBuffer: 0,
      maxHealth,
      health: maxHealth,
      maxEnergy,
      energy: maxEnergy,
      fireCooldown: 0,
      specialCooldown: 0,
      invulnerable: 0,
      hurtFlash: 0,
      animationTime: 0,
      runAnimationTime: 0,
      special,
      airJumps: 1,
      dropTimer: 0,
      dashTime: 0,
      dashCooldown: 0,
      dashX: 1,
      dashY: 0,
      dashCharges: 1,
      firePoseTime: 0,
      landPoseTime: 0,
      lastAimX: 1,
      lastAimY: 0,
      kickTime: 0,
      punchTime: 0,
      punchHit: false,
      waveSlideTime: 0,
      dashRecoveryTime: 0,
      extraLifeUsed: false,
      shieldCharges: 0,
      perfectDodgeCooldown: 0,
    };
  }

  private persistSave(): void {
    this.saveRepository.write(this.save);
  }

  private awardProfileXp(amount: number, source: string, persist = false): void {
    const result = awardDiveXp({ level:this.save.diveLevel, xp:this.save.diveXp }, amount);
    if (result.awarded === 0) return;
    this.save.diveLevel = result.level;
    this.save.diveXp = result.xp;
    this.xpRevealTimer=result.levelsGained>0?5:2.8;
    this.runMetrics.diveXpEarned += result.awarded;
    if (result.levelsGained > 0) {
      this.playRewardChord('rank');
      this.showToast(`DIVE LEVEL ${result.level} · ${source.toUpperCase()} · COSMETIC PROFILE`);
    }
    if (persist || result.levelsGained > 0) this.persistSave();
  }

  private portraitDataUrl(id: BoonId): string | null {
    const asset = BOONS[id].portraitAsset;
    return asset ? `${import.meta.env.BASE_URL}${asset}` : null;
  }

  private bindInput(): void {
    // Browsers require one trusted gesture before audio playback. Unlock on
    // the first pointer press anywhere, so Settings is never a hidden music
    // start switch and the title cue begins on the player's first click.
    window.addEventListener('pointerdown', () => { void this.unlockAudio(); }, { capture:true });
    window.addEventListener('keydown', (event) => {
      void this.unlockAudio();
      const code = event.code;
      this.noteInputDevice('keyboard');
      if(this.rebindingAction){
        event.preventDefault();
        if(code==='Escape')this.rebindingAction=null;
        else{
          this.keyboardBindingState=rebindAction(this.keyboardBindingState,this.rebindingAction,code);
          this.bindingRepository.write(this.keyboardBindingState);
          this.showToast(`${this.rebindingAction.toUpperCase()} · ${this.formatInputCode(code)}`);
          this.rebindingAction=null;
        }
        if(this.settingsReturnScreen)this.showSettings(this.settingsReturnScreen);
        this.updateControlPrompts();
        return;
      }
      // Latch the most recent horizontal intent at keydown time. Even a tap
      // shorter than one simulation frame now turns Milo without changing
      // acceleration, top speed, or any other approved movement constant.
      if (!event.repeat && (this.screen === 'playing' || this.screen === 'hub')) {
        if (this.keyboardBindingState.bindings.left.includes(code)) this.player.facing = -1;
        else if (this.keyboardBindingState.bindings.right.includes(code)) this.player.facing = 1;
      }
      if (!event.repeat && this.screen === 'credits') {
        event.preventDefault();
        this.finishAlphaCompletionFinale();
        return;
      }
      const confirmKey=['jump','fire','special'].some((action)=>this.keyboardBindingState.bindings[action as ControlName].includes(code));
      const mappedKey=Object.values(this.keyboardBindingState.bindings).some((codes)=>codes.includes(code));
      if (mappedKey) {
        event.preventDefault();
      }
      if (!event.repeat && this.screen === 'dialogue' && (code==='Enter'||confirmKey)) {
        event.preventDefault();
        this.advanceDialogue();
        return;
      }
      const overlayMenuOpen=this.overlay.querySelectorAll<HTMLButtonElement>('button:not(:disabled)').length>0&&(this.hubModalOpen||Boolean(this.settingsReturnScreen)||Boolean(this.loadoutReturnScreen)||['reward','route','paused','dead','victory'].includes(this.screen));
      const menuPrevious=this.keyboardBindingState.bindings.left.includes(code)||this.keyboardBindingState.bindings.up.includes(code);
      const menuNext=this.keyboardBindingState.bindings.right.includes(code)||this.keyboardBindingState.bindings.down.includes(code);
      if (!event.repeat&&overlayMenuOpen&&(menuPrevious||menuNext)) {
        event.preventDefault(); this.moveMenuFocus(menuPrevious?-1:1); return;
      }
      if (!event.repeat&&overlayMenuOpen&&(code==='Enter'||confirmKey)) {
        event.preventDefault(); this.activateFocusedMenuButton(); return;
      }
      if (!event.repeat && this.screen === 'title' && !this.settingsReturnScreen && (code==='Enter'||confirmKey)) {
        event.preventDefault();
        this.activateTitle();
        return;
      }
      if (code === 'Escape' && !event.repeat) {
        event.preventDefault();
        if (this.settingsReturnScreen) this.closeSettings();
        else if (this.loadoutReturnScreen) this.closeArcanaLoadout();
        else if (this.hubModalOpen) this.closeHubModal();
        else if (this.screen === 'reward') this.cancelRewardInspection();
        else if (this.screen === 'route') return;
        else this.togglePause();
        return;
      }
      this.keys.add(code);
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.touchControls.clear();
      if (this.screen === 'playing') this.togglePause();
    });

    document.querySelectorAll<HTMLButtonElement>('[data-control]').forEach((button) => {
      const control = button.dataset.control;
      if (!control || !isGameAction(control)) return;
      const press = (event: PointerEvent) => {
        event.preventDefault();
        void this.unlockAudio();
        this.noteInputDevice('touch');
        button.setPointerCapture(event.pointerId);
        this.touchControls.add(control);
        if (control === 'left') this.player.facing = -1;
        else if (control === 'right') this.player.facing = 1;
      };
      const release = (event: PointerEvent) => {
        event.preventDefault();
        this.touchControls.delete(control);
      };
      button.addEventListener('pointerdown', press);
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('pointerleave', release);
    });
  }

  private formatInputCode(code:string):string {
    return code.replace(/^Key/,'').replace(/^Digit/,'').replace('Arrow','').replace('ShiftLeft','Left Shift').replace('ShiftRight','Right Shift').replace('Space','Space');
  }

  private noteInputDevice(device:InputDevice):void {
    if(this.promptService.currentDevice()===device)return;
    this.promptService.noteDevice(device);this.updateControlPrompts();
  }

  private updateControlPrompts():void {
    const device=this.promptService.currentDevice();
    document.querySelectorAll<HTMLElement>('[data-prompt-action]').forEach((element)=>{
      const action=element.dataset.promptAction;
      if(!action||!isGameAction(action))return;
      if(device==='keyboard')element.textContent=this.keyboardBindingState.bindings[action].map((code)=>this.formatInputCode(code)).join(' / ');
      else element.textContent=this.promptService.prompt(action,device);
    });
    if(this.tutorialActive)this.updateTutorialPrompt();
  }

  private menuButtons(): HTMLButtonElement[] { return [...this.overlay.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')].filter(button=>button.offsetParent!==null); }

  private focusMenuButton(button: HTMLButtonElement): void {
    for (const candidate of this.menuButtons()) {
      candidate.classList.toggle('menu-selected', candidate === button);
      candidate.setAttribute('aria-selected', candidate === button ? 'true' : 'false');
    }
    button.focus({ preventScroll: true });
  }

  private moveMenuFocus(direction:number):void {
    const buttons=this.menuButtons(); if(!buttons.length)return;
    const current=buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next=current<0?0:(current+direction+buttons.length)%buttons.length;
    this.focusMenuButton(buttons[next]);
  }

  private activateFocusedMenuButton():void {
    const buttons=this.menuButtons(); if(!buttons.length)return;
    const focused=buttons.includes(document.activeElement as HTMLButtonElement)?document.activeElement as HTMLButtonElement:buttons[0];
    this.focusMenuButton(focused); focused.click();
  }

  private focusFirstMenuButton():void { const first=this.menuButtons()[0]; if(first)this.focusMenuButton(first); }

  private updateMenuGamepad():void {
    const gamepad=navigator.getGamepads?.()[0];
    if(gamepad){
      const gamepadActive=[...gamepad.buttons].some(button=>button.pressed)||Math.abs(gamepad.axes[0]??0)>.2||Math.abs(gamepad.axes[1]??0)>.2;
      if(gamepadActive)this.noteInputDevice('controller');
      const pause=Boolean(gamepad.buttons[9]?.pressed);
      if(pause&&!this.menuPauseLatched&&!this.settingsReturnScreen&&(this.screen==='playing'||this.screen==='paused'))this.togglePause();
      this.menuPauseLatched=pause;
      const advance=Boolean(gamepad.buttons[0]?.pressed||gamepad.buttons[2]?.pressed||gamepad.buttons[3]?.pressed);
      if(this.screen==='credits'&&advance&&!this.menuActionLatched){this.finishAlphaCompletionFinale();this.menuActionLatched=true;return;}
      if((this.screen==='dialogue'||(this.screen==='title'&&!this.settingsReturnScreen))&&advance&&!this.menuActionLatched){
        if(this.screen==='dialogue')this.advanceDialogue();else this.activateTitle();
        this.menuActionLatched=true; return;
      }
      if(!advance)this.menuActionLatched=false;
    }
    const menuOpen=this.overlay.querySelectorAll<HTMLButtonElement>('button:not(:disabled)').length>0&&(this.hubModalOpen||Boolean(this.settingsReturnScreen)||Boolean(this.loadoutReturnScreen)||['reward','route','paused','dead','victory'].includes(this.screen));
    if(!menuOpen){this.menuNavLatched=false;this.menuActionLatched=false;return;}
    if(!gamepad)return;
    const horizontal=gamepad.axes[0]??0,vertical=gamepad.axes[1]??0;
    const direction=horizontal>.55||vertical>.55||gamepad.buttons[15]?.pressed||gamepad.buttons[13]?.pressed?1:horizontal<-.55||vertical<-.55||gamepad.buttons[14]?.pressed||gamepad.buttons[12]?.pressed?-1:0;
    if(direction!==0&&!this.menuNavLatched){this.moveMenuFocus(direction);this.menuNavLatched=true;}
    if(direction===0)this.menuNavLatched=false;
    const activate=Boolean(gamepad.buttons[0]?.pressed||gamepad.buttons[2]?.pressed||gamepad.buttons[3]?.pressed);
    if(activate&&!this.menuActionLatched){this.activateFocusedMenuButton();this.menuActionLatched=true;}
    if(!activate)this.menuActionLatched=false;
  }

  private frame(now: number): void {
    const rawDeltaMs = Math.max(0,now - this.lastTime);
    const dt = Math.min(rawDeltaMs / 1000, 1 / 30);
    this.lastTime = now;
    this.time += dt;
    this.updateMenuGamepad();
    this.updateAmbient(dt);
    if (this.hitPause > 0) this.hitPause = Math.max(0, this.hitPause - dt);
    else if (this.screen === 'playing') this.update(dt);
    else if (this.screen === 'hub' && !this.hubModalOpen) this.updateHub(dt);
    this.updatePresentation(dt);
    this.render();
    this.telemetry.recordFrame(rawDeltaMs,dt*1000,this.currentEntityCounts());
    requestAnimationFrame((time) => this.frame(time));
  }

  private currentEntityCounts(): EntityCounts {
    return {
      enemies:this.enemies.length,
      projectiles:this.projectiles.length,
      particles:this.particles.length,
      floatingText:this.floatingText.length,
      bossHazards:this.bossHazards.length,
      lightning:this.lightningEffects.length,
      lightRays:this.lightRayEffects.length,
      gusts:this.gustEffects.length,
      activeSfx:this.activeSfx,
    };
  }

  private updatePresentation(dt: number): void {
    this.shake = Math.max(0, this.shake - dt * 24);
    this.screenFlash = Math.max(0, this.screenFlash - dt * 2.8);
    this.boonColorPulse = Math.max(0, this.boonColorPulse - dt * 1.35);
    this.styleFlash = Math.max(0, this.styleFlash - dt * 2.4);
    this.payoutFlash = Math.max(0, this.payoutFlash - dt * 1.45);
    this.gradeTimer = Math.max(0, this.gradeTimer - dt);
    this.roomIntro = Math.max(0, this.roomIntro - dt);
    this.transition = Math.max(0, this.transition - dt);
    this.toastTimer = Math.max(0, this.toastTimer - dt);
    this.xpRevealTimer=Math.max(0,this.xpRevealTimer-dt);
    this.currencyRevealTimer=Math.max(0,this.currencyRevealTimer-dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    for (const impact of this.arcaneImpacts) impact.life -= dt;
    this.arcaneImpacts = this.arcaneImpacts.filter((impact) => impact.life > 0);
    if (this.comboTimer === 0) this.combo = 0;
    if (this.toastTimer === 0) this.toastElement.classList.remove('show');
  }

  private showTitle(): void {
    const token = ++this.titleToken;
    this.alphaFinaleEnding = false;
    this.titleStartLocked = false;
    this.settingsReturnScreen = null;
    this.screen = 'title';
    this.music.requestState('TITLE');
    this.hud.classList.add('hidden');
    this.roomLabel.textContent = 'TITLE';
    this.overlay.innerHTML = `
      <div class="title-panel" style="--accent:#a85cff">
        <div class="title-copy">
          <p class="eyebrow title-kicker">Red Sea Comics presents</p>
          <h1><span>Demon</span><span class="title-demon">Dive</span></h1>
          <p class="title-tagline">DIVE DEEPER. TAKE THE RISK. REWRITE YOUR FATE.</p>
          <p class="title-save">${this.save.storyFlags.includes(DIALOGUE_BEATS.prologue_dive.flag) ? `Continue · Best Rush ${styleRankFor(this.save.bestStyle)} · High Score ${this.save.highScore.toLocaleString()}` : 'New descent · The Neon Maw awaits'}</p>
          <button class="btn primary title-start" id="enter-hub" disabled>DIVE IN</button>
          <button class="title-settings" id="title-settings">Settings</button>
          <span class="version">A7.5 · ART-INTEGRATED FULL CAMPAIGN · LEVELS 1–9</span>
        </div>
      </div>`;
    mustElement<HTMLButtonElement>('#enter-hub').addEventListener('click', () => this.activateTitle());
    mustElement<HTMLButtonElement>('#title-settings').addEventListener('click', () => {
      void this.unlockAudio();
      this.showSettings('title');
    });
    window.setTimeout(() => {
      if (token !== this.titleToken || this.screen !== 'title' || this.settingsReturnScreen) return;
      const button = this.overlay.querySelector<HTMLButtonElement>('#enter-hub');
      if (button) button.disabled = false;
    }, 750);
  }

  private activateTitle(): void {
    if (this.screen !== 'title' || this.titleStartLocked || this.settingsReturnScreen) return;
    const button = this.overlay.querySelector<HTMLButtonElement>('#enter-hub');
    if (!button || button.disabled) return;
    this.titleStartLocked = true;
    void this.unlockAudio();
    button.disabled = true;
    button.textContent = 'DESCENDING…';
    this.overlay.querySelector('.title-panel')?.classList.add('starting');
    const token = this.titleToken;
    window.setTimeout(() => {
      if (token === this.titleToken && this.screen === 'title') this.beginStory();
    }, 520);
  }

  private showSettings(returnScreen: GameScreen): void {
    this.settingsReturnScreen = returnScreen;
    const setting = this.save.settings;
    const conflicts=bindingConflicts(this.keyboardBindingState.bindings);
    const bindingButton=(action:ControlName)=>`<button class="btn binding-button" data-rebind="${action}"><span>${action}</span><b>${this.keyboardBindingState.bindings[action].map((code)=>this.formatInputCode(code)).join(' / ')}</b></button>`;
    const slider = (id: 'masterVolume' | 'musicVolume' | 'sfxVolume', label: string) => `
      <label class="setting-slider" for="setting-${id}"><span>${label}</span><b id="value-${id}">${Math.round(setting[id] * 100)}%</b>
        <input id="setting-${id}" data-volume="${id}" type="range" min="0" max="1" step="0.01" value="${setting[id]}">
      </label>`;
    this.overlay.innerHTML = `
      <div class="panel compact settings-panel" style="--accent:#a85cff">
        <p class="eyebrow">Audio & accessibility</p><h2>Settings</h2>
        <div class="settings-grid">
          ${slider('masterVolume', 'Master')}${slider('musicVolume', 'Music')}${slider('sfxVolume', 'SFX')}
        </div>
        <h3>Controls</h3>
        <div class="btn-row settings-toggles">
          <button class="btn" id="cycle-keyboard-profile">Keyboard: ${this.keyboardBindingState.profile==='split-hand'?'Split-Hand':this.keyboardBindingState.profile==='arcade'?'Arcade Z/X/C/V':'Custom'}</button>
          <button class="btn" id="cycle-movement-profile">Movement test: ${MOVEMENT_PROFILES[this.movementProfileId].label}</button>
          <button class="btn" id="cycle-arcane-profile">Arcane test: ${ARCANE_PROFILES[this.arcaneProfileId].label}</button>
          <button class="btn ghost" id="reset-bindings">Reset keyboard bindings</button>
        </div>
        <div class="binding-grid">${(['left','right','up','down','jump','dash','fire','special','interact'] as ControlName[]).map(bindingButton).join('')}</div>
        <p class="binding-warning ${conflicts.length?'active':''}">${conflicts.length?`Conflict: ${conflicts.map((conflict)=>`${this.formatInputCode(conflict.code)} = ${conflict.actions.join(' + ')}`).join(' · ')}`:'No keyboard conflicts detected.'}</p>
        <p class="lede">The placeholder browser announcer is disabled for this build while the production voice direction is developed.</p>
        <div class="btn-row settings-toggles">
          <button class="btn" id="toggle-shake-setting">Screen shake: ${this.shakeEnabled ? 'On' : 'Off'}</button>
          <button class="btn" id="toggle-vfx-setting">Reduced flashes: ${this.reducedVfx ? 'On' : 'Off'}</button>
          <button class="btn" id="test-arcane-sfx">Test Arcane blast + evolved chord</button>
          <button class="btn primary" id="repair-audio-setting">Reset audio volumes + test everything</button>
          <button class="btn ghost" id="reset-campaign">Fresh campaign · keep Dive Level</button>
          <button class="btn ghost danger" id="reset-save">Erase all data · including Dive Level</button>
        </div>
        <button class="btn primary" id="close-settings">Back</button>
      </div>`;
    this.overlay.querySelectorAll<HTMLInputElement>('[data-volume]').forEach((input) => input.addEventListener('input', () => {
      const id = input.dataset.volume as 'masterVolume' | 'musicVolume' | 'sfxVolume';
      const value = clamp(Number(input.value), 0, 1);
      this.save.settings[id] = value;
      const output = this.overlay.querySelector<HTMLElement>(`#value-${id}`);
      if (output) output.textContent = `${Math.round(value * 100)}%`;
      this.soundEnabled = this.save.settings.masterVolume > .001 && this.save.settings.sfxVolume > .001;
      this.save.settings.sound = this.soundEnabled;
      this.music.setMasterVolume(this.save.settings.masterVolume);
      this.music.setMusicVolume(this.save.settings.musicVolume);
      void this.unlockAudio();
      this.persistSave();
    }));
    mustElement<HTMLButtonElement>('#toggle-shake-setting').addEventListener('click', () => {
      this.shakeEnabled = !this.shakeEnabled; this.save.settings.shake = this.shakeEnabled; this.persistSave(); this.showSettings(returnScreen);
    });
    mustElement<HTMLButtonElement>('#toggle-vfx-setting').addEventListener('click', () => {
      this.reducedVfx = !this.reducedVfx; this.save.settings.reducedVfx = this.reducedVfx; this.persistSave(); this.showSettings(returnScreen);
    });
    mustElement<HTMLButtonElement>('#cycle-keyboard-profile').addEventListener('click',()=>{
      const next:Exclude<KeyboardProfileId,'custom'>=this.keyboardBindingState.profile==='split-hand'?'arcade':'split-hand';
      this.keyboardBindingState=profileBindings(next);this.bindingRepository.write(this.keyboardBindingState);this.updateControlPrompts();this.showSettings(returnScreen);
    });
    mustElement<HTMLButtonElement>('#cycle-movement-profile').addEventListener('click',()=>{
      this.movementProfileId=this.movementProfileId==='a0-control'?'a1-responsive':'a0-control';
      try{window.localStorage.setItem(MOVEMENT_PROFILE_KEY,this.movementProfileId);}catch{/* A/B selection remains active for this session. */}
      this.showSettings(returnScreen);this.showToast(`MOVEMENT ${MOVEMENT_PROFILES[this.movementProfileId].label.toUpperCase()} · DASH/WAVE VALUES LOCKED`);
    });
    mustElement<HTMLButtonElement>('#cycle-arcane-profile').addEventListener('click',()=>{
      this.arcaneProfileId=this.arcaneProfileId==='a0-control'?'a1-responsive':'a0-control';
      try{window.localStorage.setItem(ARCANE_PROFILE_KEY,this.arcaneProfileId);}catch{/* A/B selection remains active for this session. */}
      this.showSettings(returnScreen);this.showToast(`ARCANE ${ARCANE_PROFILES[this.arcaneProfileId].label.toUpperCase()} · DAMAGE/RANGE LOCKED`);
    });
    mustElement<HTMLButtonElement>('#reset-bindings').addEventListener('click',()=>{
      this.keyboardBindingState=profileBindings('split-hand');this.bindingRepository.write(this.keyboardBindingState);this.updateControlPrompts();this.showSettings(returnScreen);
    });
    this.overlay.querySelectorAll<HTMLButtonElement>('[data-rebind]').forEach((button)=>button.addEventListener('click',()=>{
      const action=button.dataset.rebind;
      if(!action||!isGameAction(action))return;
      this.rebindingAction=action;button.innerHTML=`<span>${action}</span><b>Press a key… · Esc cancels</b>`;this.showToast(`REBIND ${action.toUpperCase()} · PRESS A KEY`);
    }));
    mustElement<HTMLButtonElement>('#test-arcane-sfx').addEventListener('click',()=>{
      const volume=this.save.settings.masterVolume*this.save.settings.sfxVolume;
      if(volume<=.001){this.showToast('ARCANE TEST MUTED · RAISE MASTER AND SFX');return;}
      const demo=emptyBoonStacks();for(const id of BOON_ORDER.slice(0,12))demo[id]=1;
      this.music.setDuckDb(-12,.06);window.setTimeout(()=>this.music.setDuckDb(0,.3),850);
      this.arcaneAudio.playReveal(demo,'belladonna',volume);this.showToast('ARCANE TEST · BLAST + 12-BOON UNBOUND CHORD');
    });
    mustElement<HTMLButtonElement>('#repair-audio-setting').addEventListener('click',()=>this.repairAndTestAudio());
    mustElement<HTMLButtonElement>('#reset-campaign').addEventListener('click', (event) => {
      const button = event.currentTarget as HTMLButtonElement;
      if (button.dataset.confirm !== 'yes') {
        button.dataset.confirm = 'yes';
        button.textContent = 'Confirm: restart story, unlocks & upgrades';
        this.showToast('CAMPAIGN RESET ARMED · DIVE LEVEL AND LIFETIME TOTALS STAY');
        return;
      }
      this.resetCampaignProgress();
    });
    mustElement<HTMLButtonElement>('#reset-save').addEventListener('click', (event) => {
      const button = event.currentTarget as HTMLButtonElement;
      if (button.dataset.confirm !== 'yes') {
        button.dataset.confirm = 'yes';
        button.textContent = 'Confirm: permanently erase everything';
        this.showToast('FULL ERASE ARMED · DIVE LEVEL AND LIFETIME TOTALS WILL RESET');
        return;
      }
      this.resetAllProgress();
    });
    mustElement<HTMLButtonElement>('#close-settings').addEventListener('click', () => this.closeSettings());
    this.focusFirstMenuButton();
  }

  private resetCampaignProgress(): void {
    const preserved = {
      diveLevel:this.save.diveLevel,
      diveXp:this.save.diveXp,
      lifetimeRooms:this.save.lifetimeRooms,
      lifetimeEnemies:this.save.lifetimeEnemies,
      lifetimeRuns:this.save.lifetimeRuns,
      settings:{...this.save.settings},
    };
    this.save = { ...cloneDefaultSave(), ...preserved };
    this.applyFreshSaveState();
    this.showToast(`FRESH CAMPAIGN · DIVE LEVEL ${this.save.diveLevel} PRESERVED`);
  }

  private resetAllProgress(): void {
    this.saveRepository.reset();
    this.bindingRepository.reset();
    try{window.localStorage.removeItem(MOVEMENT_PROFILE_KEY);}catch{/* In-memory reset still applies. */}
    try{window.localStorage.removeItem(ARCANE_PROFILE_KEY);}catch{/* In-memory reset still applies. */}
    this.keyboardBindingState=profileBindings('split-hand');
    this.movementProfileId='a0-control';
    this.arcaneProfileId='a0-control';
    this.save = cloneDefaultSave();
    this.applyFreshSaveState();
    this.showToast('ALL DATA ERASED · DIVE LEVEL 1 · THE NEON MAW AWAITS');
  }

  private applyFreshSaveState(): void {
    this.selectedStartingBoon = 'pyrra';
    this.boonStacks = emptyBoonStacks();
    this.boonOfferDrought = emptyBoonStacks();
    this.lastRewardBoon = 'pyrra';
    this.soundEnabled = this.save.settings.masterVolume > .001 && this.save.settings.sfxVolume > .001;
    this.voiceEnabled = this.save.settings.voice;
    this.shakeEnabled = this.save.settings.shake;
    this.reducedVfx = this.save.settings.reducedVfx;
    this.music.setMasterVolume(this.save.settings.masterVolume);
    this.music.setMusicVolume(this.save.settings.musicVolume);
    this.music.resume();
    window.speechSynthesis?.cancel();
    this.persistSave();
    this.settingsReturnScreen = null;
    this.showTitle();
  }

  private closeSettings(): void {
    const returnScreen = this.settingsReturnScreen;
    this.settingsReturnScreen = null;
    if (returnScreen === 'paused') this.renderPauseMenu();
    else this.showTitle();
  }

  private beginStory(): void {
    if (!this.save.storyFlags.includes(DIALOGUE_BEATS.prologue_dive.flag)) {
      this.showDialogueBeat('prologue_dive', 'title', () => {
        this.showHub();
        this.showDialogueBeat('prologue_arrival', 'hub', () => this.beginHubTutorial());
      });
      return;
    }
    this.showHub();
    if (!this.save.storyFlags.includes(DIALOGUE_BEATS.prologue_arrival.flag)) {
      this.showDialogueBeat('prologue_arrival', 'hub', () => this.beginHubTutorial());
    }
  }

  private showDialogueBeat(id: StoryBeatId, returnScreen: GameScreen, onComplete?: () => void): void {
    const beat = DIALOGUE_BEATS[id];
    if (beat.once && this.save.storyFlags.includes(beat.flag)) {
      this.applyDialogueMutation(beat);
      onComplete?.();
      return;
    }
    window.speechSynthesis?.cancel();
    this.dialogueBeat = beat;
    this.dialogueLineIndex = 0;
    this.dialogueReturnScreen = returnScreen;
    this.dialogueOnComplete = onComplete ?? null;
    this.screen = 'dialogue';
    this.music.setDuckDb(-6, .22);
    this.hud.classList.toggle('hidden', returnScreen !== 'playing');
    this.renderDialoguePanel();
  }

  private renderDialoguePanel(): void {
    if (!this.dialogueBeat) return;
    const line = this.dialogueBeat.lines[this.dialogueLineIndex];
    const finalLine = this.dialogueLineIndex === this.dialogueBeat.lines.length - 1;
    const initials = line.speaker.split(/\s+/).map(part => part[0]).join('').slice(0, 2);
    const portraitFiles: Record<string, string> = {
      Milo:'assets/a5/characters/level1/chr-milo-portrait-v01.png', Pyrra:'assets/a5/characters/level1/chr-pyrra-portrait-v01.png', Maris:'assets/a5/characters/level1/chr-maris-portrait-v01.png',
      Gaia:'assets/a5/characters/level1/chr-gaia-portrait-v01.png', Zephyra:'assets/a5/characters/level1/chr-zephyra-portrait-v01.png',
      Belladonna:`assets/a5/characters/level1/${line.expression === 'hostile' ? 'chr-belladonna-combat-portrait-v01.png' : 'chr-belladonna-portrait-v01.png'}`,
      'Bottomless Bartender':'assets/a5/characters/level1/chr-bottomless-bartender-portrait-v01.png',
      Flora:'assets/a6/characters/level2/chr-flora-portrait-v01.png',
      Voltara:'assets/a6/characters/level2/chr-voltara-portrait-v01.png',
      Nerissa:'assets/a6/characters/level2/chr-nerissa-demon-lord-portrait-v02.png',
      Crya:'assets/a7/characters/level3/chr-crya-portrait-v01.png',
      Roxyne:'assets/a7/characters/level3/chr-roxyne-demon-lord-portrait-v01.png',
    };
    const portraitFocus: Record<string, { scale: number; y: number }> = {
      Milo:{scale:1.08,y:7}, Pyrra:{scale:1.08,y:5}, Maris:{scale:1.08,y:5}, Gaia:{scale:1.05,y:5},
      Zephyra:{scale:1.08,y:5}, Belladonna:{scale:1.05,y:3}, 'Bottomless Bartender':{scale:1.06,y:5},
      Flora:{scale:1.1,y:3}, Voltara:{scale:1.1,y:3}, Nerissa:{scale:1.1,y:3},
      Crya:{scale:1.08,y:3}, Roxyne:{scale:1.1,y:2},
    };
    const portraitFile = portraitFiles[line.speaker];
    const portrait = portraitFile ? `${import.meta.env.BASE_URL}${portraitFile}` : '';
    const focus = portraitFocus[line.speaker] ?? { scale: 1.06, y: 5 };
    this.overlay.innerHTML = `
      <div class="dialogue-shell" style="--speaker:${line.color}">
        <div class="dialogue-location"><span>${this.dialogueBeat.location}</span><b>${this.dialogueBeat.title}</b></div>
        <div class="dialogue-card">
          <div class="dialogue-avatar ${portrait ? 'has-portrait' : ''}" aria-hidden="true"><span class="dialogue-initials">${initials}</span>${portrait ? `<img id="dialogue-portrait" src="${portrait}" alt="" style="--portrait-scale:${focus.scale};--portrait-y:${focus.y}%">` : ''}</div>
          <div class="dialogue-copy"><p class="dialogue-speaker">${line.speaker}</p><p class="dialogue-line">${line.text}</p></div>
          <div class="dialogue-progress">${this.dialogueLineIndex + 1} / ${this.dialogueBeat.lines.length}</div>
        </div>
        <div class="dialogue-actions"><button class="btn ghost" id="skip-dialogue">Skip scene</button><button class="btn primary" id="next-dialogue">${finalLine ? 'Continue' : 'Next'}</button></div>
      </div>`;
    mustElement<HTMLButtonElement>('#next-dialogue').addEventListener('click', () => this.advanceDialogue());
    mustElement<HTMLButtonElement>('#skip-dialogue').addEventListener('click', () => this.finishDialogue());
    const portraitImage = this.overlay.querySelector<HTMLImageElement>('#dialogue-portrait');
    portraitImage?.addEventListener('error', () => {
      const avatar = portraitImage.closest('.dialogue-avatar');
      avatar?.classList.remove('has-portrait');
      portraitImage.remove();
    }, { once:true });
  }

  private advanceDialogue(): void {
    if (!this.dialogueBeat) return;
    if (this.dialogueLineIndex < this.dialogueBeat.lines.length - 1) {
      this.dialogueLineIndex += 1;
      this.playSound('pickup');
      this.renderDialoguePanel();
    } else this.finishDialogue();
  }

  private finishDialogue(): void {
    const beat = this.dialogueBeat;
    const callback = this.dialogueOnComplete;
    const returnScreen = this.dialogueReturnScreen;
    window.speechSynthesis?.cancel();
    this.dialogueBeat = null;
    this.dialogueOnComplete = null;
    this.overlay.innerHTML = '';
    if (beat) this.applyDialogueMutation(beat);
    this.screen = returnScreen;
    this.music.setDuckDb(0, .35);
    this.hud.classList.toggle('hidden', returnScreen !== 'playing');
    if (returnScreen === 'playing') this.player.invulnerable = Math.max(this.player.invulnerable, .45);
    if (returnScreen === 'playing' && this.room.type === 'boss' && !this.bossDefeated) this.music.requestState(this.bossMusicState());
    this.lastTime = performance.now();
    callback?.();
  }

  private applyDialogueMutation(beat: DialogueBeat): void {
    const result = applyDialogueBeatMutation(this.save, beat);
    this.save = result.save;
    if (result.changed) this.persistSave();
  }

  private beginHubTutorial(): void {
    if (this.save.storyFlags.includes('hellroom_tutorial_complete')) return;
    this.tutorialActive = true;
    this.tutorialStep = 0;
    this.tutorialRecovery.clear();
    this.updateTutorialPrompt();
    this.showToast('Pyrra will walk you through the Hellroom');
  }

  private completeHubTutorial(): void {
    if (!this.tutorialActive && this.save.storyFlags.includes('hellroom_tutorial_complete')) return;
    this.tutorialActive = false;
    this.tutorialPrompt.classList.remove('show');
    if (!this.save.storyFlags.includes('hellroom_tutorial_complete')) {
      this.save.storyFlags.push('hellroom_tutorial_complete');
      this.persistSave();
    }
  }

  private tutorialAction(action: TutorialAction): void {
    if (!this.tutorialActive || TUTORIAL_STEPS[this.tutorialStep]?.action !== action) return;
    this.tutorialStep += 1;
    if (action === 'special') {
      this.player.health = Math.max(1, this.player.health - 16);
      this.spawnPickup('pizza', this.player.x + 85, this.player.y, 20);
      this.spawnPickup('coffee', this.player.x + 125, this.player.y, 35);
    }
    if (this.tutorialStep >= TUTORIAL_STEPS.length) this.completeHubTutorial();
    else this.updateTutorialPrompt();
  }

  private updateTutorialPrompt(): void {
    const step = TUTORIAL_STEPS[this.tutorialStep];
    if (!this.tutorialActive || !step) { this.tutorialPrompt.classList.remove('show'); return; }
    const device=this.promptService.currentDevice();
    const prompt=(action:ControlName)=>device==='keyboard'?this.keyboardBindingState.bindings[action].map((code)=>this.formatInputCode(code)).join(' / '):this.promptService.prompt(action,device);
    const contextual:Partial<Record<TutorialAction,string>>={
      move:`MOVE · ${prompt('left')} / ${prompt('right')}`,
      jump:`DOUBLE JUMP · ${prompt('jump')} TWICE`,
      dash:`DASH / WAVEDASH · DIRECTION + ${prompt('dash')}`,
      magic:`ARCANE MAGIC · AIM + ${prompt('fire')}`,
      special:`SPECIAL · ${prompt('special')} USES DEMON ENERGY`,
      altar:`BOON ALTAR · APPROACH + ${prompt('interact')}`,
      desk:`UPGRADE DESK · APPROACH + ${prompt('interact')}`,
      portal:`RUN DOOR · APPROACH + ${prompt('interact')}`,
    };
    this.tutorialPrompt.innerHTML = `<span>PYRRA'S CRASH COURSE · ${this.tutorialStep + 1}/${TUTORIAL_STEPS.length}</span><b>${contextual[step.action]??step.text}</b>`;
    this.tutorialPrompt.classList.add('show');
  }

  private showHub(): void {
    this.isEndless = false;
    this.screen = 'hub';
    this.music.resume();
    this.music.requestState('HUB');
    this.room = HUB_ROOM;
    this.roomLabel.textContent = "MILO'S HELLROOM · HUB";
    this.hud.classList.add('hidden');
    this.overlay.innerHTML = '';
    this.hubModalOpen = false;
    this.boonStacks = emptyBoonStacks();
    this.boonOfferDrought = emptyBoonStacks();
    if (!this.save.unlocked.includes(this.selectedStartingBoon)) this.selectedStartingBoon = 'pyrra';
    this.player = this.makePlayer(BOONS[this.selectedStartingBoon].special);
    this.player.x = HUB_ROOM.playerStart.x;
    this.player.y = HUB_ROOM.playerStart.y;
    this.enemies = [this.createEnemy('dummy', 990, 526)];
    this.projectiles = [];
    this.waves = [];
    this.pickups = [];
    this.bossHazards = [];
    this.playerSnareTime=0;this.snareNoticeCooldown=0;
    this.belladonnaVortex = 0;
    this.boonPickups = [];
    this.wagerShrine = null;
    this.stoneBarrierTime = 0;
    this.stoneBarrierHits = 0;
    this.showToast("Walk around Milo's Hellroom · E to interact");
    this.playSound('boon');
    if (this.save.storyFlags.includes(DIALOGUE_BEATS.prologue_arrival.flag) && !this.save.storyFlags.includes('hellroom_tutorial_complete')) this.beginHubTutorial();
  }

  private showBoonAltar(): void {
    this.tutorialAction('altar');
    this.hubModalOpen = true;
    const cards = BOON_ORDER.map((id) => {
      const boon = BOONS[id];
      const unlocked = this.save.unlocked.includes(id);
      const selected = this.selectedStartingBoon === id;
      const portrait = boon.portraitAsset ? `${import.meta.env.BASE_URL}${boon.portraitAsset}` : '';
      return `
        <button class="boon-card ${selected ? 'selected' : ''} ${unlocked ? '' : 'locked'}" style="--card:${boon.color}" data-boon="${id}" data-glyph="${unlocked ? boon.glyph : '?'}" ${unlocked ? '' : 'disabled'}>
          <span class="boon-card-art">${unlocked && portrait ? `<img src="${portrait}" alt="">` : `<b>${unlocked ? boon.glyph : '?'}</b>`}</span>
          <span class="boon-card-copy"><small>${unlocked ? boon.title : 'Locked boon-giver'}</small><h3>${unlocked ? boon.name : 'Unknown'}</h3><span class="special-label">${unlocked ? boon.specialName : '???'}</span></span>
        </button>`;
    }).join('');

    this.overlay.innerHTML = `
      <div class="panel boon-selector" style="--accent:${BOONS[this.selectedStartingBoon].color}">
        <div class="hub-head">
          <div><p class="eyebrow">Summoning altar · current: <span id="altar-current">${BOONS[this.selectedStartingBoon].name}</span></p><h2>Choose Your First Boon</h2><p class="selector-note">Modifiers stack during the run. Your equipped special does not.</p></div>
          <button class="btn ghost" id="close-hub-modal">Close</button>
        </div>
        <div class="cards">${cards}</div>
      </div>`;

    this.overlay.querySelectorAll<HTMLButtonElement>('[data-boon]').forEach((button) => {
      button.addEventListener('click', () => {
        this.selectedStartingBoon = button.dataset.boon as BoonId;
        this.overlay.querySelectorAll('[data-boon]').forEach(card => card.classList.toggle('selected', card === button));
        const panel = this.overlay.querySelector<HTMLElement>('.boon-selector'); if (panel) panel.style.setProperty('--accent', BOONS[this.selectedStartingBoon].color);
        const current = this.overlay.querySelector<HTMLElement>('#altar-current'); if (current) current.textContent = BOONS[this.selectedStartingBoon].name;
        this.playSound('pickup');
      });
    });
    mustElement<HTMLButtonElement>('#close-hub-modal').addEventListener('click', () => this.closeHubModal());
  }

  private showUpgradeDesk(): void {
    this.tutorialAction('desk');
    this.hubModalOpen = true;
    const shopItems = (['Body','Arcane','Fortune','Fate','Hellroom'] as const).map((category) => {
      const items = (Object.keys(UPGRADE_INFO) as UpgradeId[]).filter((id) => UPGRADE_INFO[id].category === category).map((id) => {
        const info = UPGRADE_INFO[id]; const level = this.save.upgrades[id]; const cost = upgradeCost(id, level);
        return `<button class="shop-btn" data-upgrade="${id}" ${level >= info.max ? 'disabled' : ''}><b>${info.name} ${level}/${info.max}</b>${info.description}<br><em>${level >= info.max ? 'MAXED' : `✧ ${cost}`}</em></button>`;
      }).join('');
      const subtitle = category === 'Body' ? 'Movement & survival' : category === 'Arcane' ? 'Magic & Demon Energy' : category === 'Fortune' ? 'Drops & Infernal Rush' : category === 'Fate' ? 'Choices, rerolls & wagers' : 'Recovery & Deep Dive preparation';
      return `<section class="upgrade-group"><div><h3>${category}</h3><small>${subtitle}</small></div><div class="shop-items">${items}</div></section>`;
    }).join('');
    const history=this.save.recentRuns.slice(-3).reverse().map(run=>`<span><b>${run.result.toUpperCase()} · ${run.score.toLocaleString()} PTS</b><small>${run.roomsCleared} rooms · seed ${run.seed.toString(16).toUpperCase().padStart(8,'0')}</small></span>`).join('')||'<em>No completed runs recorded yet.</em>';
    this.overlay.innerHTML = `
      <div class="panel compact" style="--accent:#ffc75a">
        <p class="eyebrow">Milo's desk · ✧ ${this.save.shards} soul shards</p>
        <h2>Permanent Upgrades</h2>
        <p class="lede">These survive death and apply at the beginning of every run.</p>
        <div class="upgrade-groups">${shopItems}</div>
        <details class="run-history"><summary>Run archive · Best Deep Dive ${this.save.bestEndless}</summary><div>${history}</div></details>
        <div class="btn-row" style="margin-top:18px"><button class="btn" id="playtest-tools">Playtest tools</button><button class="btn ghost" id="close-hub-modal">Back to the room</button></div>
      </div>`;
    this.overlay.querySelectorAll<HTMLButtonElement>('[data-upgrade]').forEach((button) => button.addEventListener('click', () => this.buyUpgrade(button.dataset.upgrade as UpgradeId)));
    mustElement<HTMLButtonElement>('#playtest-tools').addEventListener('click', () => this.showPlaytestTools());
    mustElement<HTMLButtonElement>('#close-hub-modal').addEventListener('click', () => this.closeHubModal());
  }

  private showPlaytestTools(): void {
    this.hubModalOpen = true;
    this.overlay.innerHTML = `
      <div class="panel compact" style="--accent:#42e8f5">
        <p class="eyebrow">Development build</p><h2>Playtest Tools</h2>
        <p class="lede">Test Arcane colors, late-run combinations, or the maximum geometry profile without grinding. Depth 10 retains the protected stress route while Level Nine's final content is The Hollow.</p>
        <div class="btn-row">
          <button class="btn primary" id="test-mixed-run">Start mixed-boon run</button>
          <button class="btn primary" id="test-level-two">Jump to Level 2</button>
          <button class="btn primary" id="test-level-three">Jump to Level 3</button>
          <button class="btn primary" id="test-level-four">Jump to Level 4</button>
          <button class="btn primary" id="test-level-five">Jump to Level 5</button>
          <button class="btn primary" id="test-level-six">Jump to Level 6</button>
          <button class="btn primary" id="test-level-seven">Jump to Level 7</button>
          <button class="btn primary" id="test-level-eight">Jump to Level 8</button>
          <button class="btn primary" id="test-level-nine">Jump to Level 9</button>
          <button class="btn" id="test-endless">Jump to Deep Dive room 1</button>
          <button class="btn" id="test-depth-ten">Depth-10 layout stress test</button>
          <button class="btn" id="unlock-all">Unlock all boon-givers</button>
          <button class="btn" id="grant-shards">Grant 25 shards</button>
          <button class="btn ghost" id="back-to-desk">Back</button>
        </div>
      </div>`;
    mustElement<HTMLButtonElement>('#test-mixed-run').addEventListener('click', () => {
      this.startRun();
      for (const id of BOON_ORDER) if (this.boonStacks[id] === 0) this.applyBoon(id, false);
      this.showToast(`Mixed Arcane test · ${this.getArcaneColor()}`);
    });
    mustElement<HTMLButtonElement>('#test-level-two').addEventListener('click', () => {
      this.startRun(2,0xD20C0A7);
      for (const id of ['maris','gaia','zephyra'] as BoonId[]) if (this.boonStacks[id] === 0) this.applyBoon(id,false);
      this.showToast('LEVEL 2 PLAYTEST · THE DROWNED COURT');
    });
    mustElement<HTMLButtonElement>('#test-level-three').addEventListener('click', () => {
      this.startRun(3,0x7A03C7);
      for (const id of ['maris','gaia','zephyra','flora','voltara'] as BoonId[]) if (this.boonStacks[id] === 0) this.applyBoon(id,false);
      this.showToast('LEVEL 3 PLAYTEST · THE THORNWILD');
    });
    mustElement<HTMLButtonElement>('#test-level-four').addEventListener('click', () => {
      this.startRun(4,0x74A4C9D);
      for (const id of ['maris','gaia','zephyra','flora','voltara','crya','roxyne'] as BoonId[]) if (this.boonStacks[id] === 0) this.applyBoon(id,false);
      this.showToast('LEVEL 4 PLAYTEST · THE THUNDER JACKPOT');
    });
    mustElement<HTMLButtonElement>('#test-level-five').addEventListener('click', () => {
      this.startRun(5,0xF2057A);
      for (const id of ['maris','gaia','zephyra','flora','voltara','crya','roxyne','luna','calyptra'] as BoonId[]) if (this.boonStacks[id] === 0) this.applyBoon(id,false);
      this.showToast('LEVEL 5 PLAYTEST · THE FROZEN BASILICA');
    });
    mustElement<HTMLButtonElement>('#test-level-six').addEventListener('click', () => {
      this.startRun(6,0x6F0E7E1);
      for (const id of ['maris','gaia','zephyra','flora','voltara','crya','roxyne','luna','calyptra','solara','isolde'] as BoonId[]) if (this.boonStacks[id] === 0) this.applyBoon(id,false);
      this.showToast('LEVEL 6 PLAYTEST · THE FOREVER MOTEL');
    });
    mustElement<HTMLButtonElement>('#test-level-seven').addEventListener('click', () => {
      this.startRun(7,0x7A0FACE);
      for (const id of ['maris','gaia','zephyra','flora','voltara','crya','roxyne','luna','calyptra','solara','isolde','aurelia','somnia'] as BoonId[]) if (this.boonStacks[id] === 0) this.applyBoon(id,false);
      this.showToast('LEVEL 7 PLAYTEST · CITY OF A THOUSAND FACES');
    });
    mustElement<HTMLButtonElement>('#test-level-eight').addEventListener('click', () => {
      this.startRun(8,0x81A17E8);
      for (const id of ['maris','gaia','zephyra','flora','voltara','crya','roxyne','luna','calyptra','solara','isolde','aurelia','somnia','noctissa','vespera'] as BoonId[]) if (this.boonStacks[id] === 0) this.applyBoon(id,false);
      this.showToast("LEVEL 8 PLAYTEST · LILITH'S THRONE");
    });
    mustElement<HTMLButtonElement>('#test-level-nine').addEventListener('click', () => {
      this.startRun(9,0x9E1FB310);
      for (const id of ['pyrra','maris','gaia','zephyra','flora','voltara','crya','luna','solara','belladonna','nerissa','roxyne','calyptra','isolde','somnia','vespera','lilith'] as BoonId[]) if (this.boonStacks[id] === 0) this.applyBoon(id,false);
      this.showToast('LEVEL 9 PLAYTEST · THE SELF BELOW');
    });
    mustElement<HTMLButtonElement>('#test-depth-ten').addEventListener('click', () => {
      this.startRun(10); this.showToast('DEPTH 10 · MAX-COMPLEXITY LAYOUT TEST');
    });
    mustElement<HTMLButtonElement>('#test-endless').addEventListener('click',()=>{
      this.startRun(1,0xA14FA4);
      for(const id of ['maris','zephyra','voltara','flora','crya','belladonna'] as BoonId[]) this.applyBoon(id,false);
      this.startEndlessMode();
    });
    mustElement<HTMLButtonElement>('#unlock-all').addEventListener('click', () => {
      this.save.unlocked = [...BOON_ORDER]; this.persistSave(); this.showPlaytestTools(); this.showToast('All boon-givers unlocked');
    });
    mustElement<HTMLButtonElement>('#grant-shards').addEventListener('click', () => {
      this.save.shards += 25; this.persistSave(); this.showPlaytestTools(); this.showToast('25 soul shards granted');
    });
    mustElement<HTMLButtonElement>('#back-to-desk').addEventListener('click', () => this.showUpgradeDesk());
  }

  private showRunGate(): void {
    this.tutorialAction('portal');
    this.hubModalOpen = true;
    const boon = BOONS[this.selectedStartingBoon];
    const [minRooms,maxRooms] = roomCountBounds(1);
    this.overlay.innerHTML = `
      <div class="panel compact" style="--accent:${boon.color}">
        <p class="eyebrow">Bedroom door · Level 1</p>
        <h2>Leave With ${boon.name}</h2>
        <p class="lede">A new ${minRooms}–${maxRooms}-room Neon Maw route will be assembled when you leave. Every gate and previewed branch is validated against Milo's protected base movement before the route is accepted.</p>
        <div class="gate-features"><span>2-ORB SMART BOON CHOICES</span><span>DISCLOSED WAGERS</span><span>${this.save.endlessUnlocked?'DEEP DIVE UNLOCKED':'DEFEAT BELLADONNA TO UNLOCK DEEP DIVE'}</span></div>
        <div class="btn-row"><button class="btn primary" id="start-run">Begin run</button><button class="btn" id="close-hub-modal">Not yet</button></div>
      </div>`;
    mustElement<HTMLButtonElement>('#start-run').addEventListener('click', () => this.startRun());
    mustElement<HTMLButtonElement>('#close-hub-modal').addEventListener('click', () => this.closeHubModal());
  }

  private closeHubModal(): void {
    this.overlay.innerHTML = '';
    this.hubModalOpen = false;
    this.inputPrevious.interact = true;
  }

  private buyUpgrade(id: UpgradeId): void {
    const level = this.save.upgrades[id];
    const info = UPGRADE_INFO[id];
    if (level >= info.max) return;
    const cost = upgradeCost(id, level);
    if (this.save.shards < cost) {
      this.showToast(`Need ${cost - this.save.shards} more soul shards`);
      return;
    }
    this.save.shards -= cost;
    this.save.upgrades[id] += 1;
    this.persistSave();
    this.showUpgradeDesk();
    this.showToast(`${info.name} upgraded`);
  }

  private explorationMusicState(): MusicState {
    return this.currentDepth >= 9 ? 'LEVEL_9_EXPLORATION' : this.currentDepth === 8 ? 'LEVEL_8_EXPLORATION' : this.currentDepth === 7 ? 'LEVEL_7_EXPLORATION' : this.currentDepth === 6 ? 'LEVEL_6_EXPLORATION' : this.currentDepth === 5 ? 'LEVEL_5_EXPLORATION' : this.currentDepth === 4 ? 'LEVEL_4_EXPLORATION' : this.currentDepth === 3 ? 'LEVEL_3_EXPLORATION' : this.currentDepth === 2 ? 'LEVEL_2_EXPLORATION' : 'LEVEL_1_EXPLORATION';
  }

  private minibossMusicState(): MusicState {
    return this.currentDepth >= 9 ? 'LEVEL_9_MINIBOSS' : this.currentDepth === 8 ? 'LEVEL_8_MINIBOSS' : this.currentDepth === 7 ? 'LEVEL_7_MINIBOSS' : this.currentDepth === 6 ? 'LEVEL_6_MINIBOSS' : this.currentDepth === 5 ? 'LEVEL_5_MINIBOSS' : this.currentDepth === 4 ? 'LEVEL_4_MINIBOSS' : this.currentDepth === 3 ? 'LEVEL_3_MINIBOSS' : this.currentDepth === 2 ? 'LEVEL_2_MINIBOSS' : 'LEVEL_1_MINIBOSS';
  }

  private postMinibossMusicState(): MusicState {
    return this.currentDepth >= 9 ? 'LEVEL_9_POST_MINIBOSS' : this.currentDepth === 8 ? 'LEVEL_8_POST_MINIBOSS' : this.currentDepth === 7 ? 'LEVEL_7_POST_MINIBOSS' : this.currentDepth === 6 ? 'LEVEL_6_POST_MINIBOSS' : this.currentDepth === 5 ? 'LEVEL_5_POST_MINIBOSS' : this.currentDepth === 4 ? 'LEVEL_4_POST_MINIBOSS' : this.currentDepth === 3 ? 'LEVEL_3_POST_MINIBOSS' : this.currentDepth === 2 ? 'LEVEL_2_POST_MINIBOSS' : 'LEVEL_1_POST_MINIBOSS';
  }

  private bossIntroMusicState(): MusicState {
    return this.currentDepth >= 9 ? 'LEVEL_9_BOSS_INTRO' : this.currentDepth === 8 ? 'LEVEL_8_BOSS_INTRO' : this.currentDepth === 7 ? 'LEVEL_7_BOSS_INTRO' : this.currentDepth === 6 ? 'LEVEL_6_BOSS_INTRO' : this.currentDepth === 5 ? 'LEVEL_5_BOSS_INTRO' : this.currentDepth === 4 ? 'LEVEL_4_BOSS_INTRO' : this.currentDepth === 3 ? 'LEVEL_3_BOSS_INTRO' : this.currentDepth === 2 ? 'LEVEL_2_BOSS_INTRO' : 'LEVEL_1_BOSS_INTRO';
  }

  private bossMusicState(): MusicState {
    return this.currentDepth >= 9 ? 'LEVEL_9_BOSS' : this.currentDepth === 8 ? 'LEVEL_8_BOSS' : this.currentDepth === 7 ? 'LEVEL_7_BOSS' : this.currentDepth === 6 ? 'LEVEL_6_BOSS' : this.currentDepth === 5 ? 'LEVEL_5_BOSS' : this.currentDepth === 4 ? 'LEVEL_4_BOSS' : this.currentDepth === 3 ? 'LEVEL_3_BOSS' : this.currentDepth === 2 ? 'LEVEL_2_BOSS' : 'LEVEL_1_BOSS';
  }

  private bossDefeatedMusicState(): MusicState {
    return this.currentDepth >= 9 ? 'LEVEL_9_BOSS_DEFEATED' : this.currentDepth === 8 ? 'LEVEL_8_BOSS_DEFEATED' : this.currentDepth === 7 ? 'LEVEL_7_BOSS_DEFEATED' : this.currentDepth === 6 ? 'LEVEL_6_BOSS_DEFEATED' : this.currentDepth === 5 ? 'LEVEL_5_BOSS_DEFEATED' : this.currentDepth === 4 ? 'LEVEL_4_BOSS_DEFEATED' : this.currentDepth === 3 ? 'LEVEL_3_BOSS_DEFEATED' : this.currentDepth === 2 ? 'LEVEL_2_BOSS_DEFEATED' : 'LEVEL_1_BOSS_DEFEATED';
  }

  private currentDistrictName(): string {
    return campaignContent(Math.min(9,Math.max(1,this.currentDepth))).name;
  }

  private startRun(depth = 1, requestedSeed?: number): void {
    this.music.resume();
    this.completeHubTutorial();
    this.currentDepth = clamp(Math.floor(depth), 1, 10);
    if (this.currentDepth <= 9 && !canAccessCampaignLevel(this.currentDepth,PC_MASTER_ACCESS)) {
      this.showToast('FULL DIVE REQUIRED FOR THIS CAMPAIGN LEVEL');
      this.showHub();
      return;
    }
    this.isEndless = false; this.endlessRoom = 0; this.pendingEndlessRoom = 0;
    this.boonStacks = emptyBoonStacks();
    this.lastRewardBoon = this.selectedStartingBoon;
    this.runShards = 0;
    this.aureliaCurrencyRemainder = 0;
    this.runBanked = false;
    this.runSeed = requestedSeed ?? createRunSeed();
    const plan = generateRunPlan(this.currentDepth, this.runSeed);
    this.runSeed = plan.seed;
    this.runRng = new SeededRandom(`${this.runSeed}:runtime`);
    this.arcaneAudio.setRunSeed(this.runSeed);
    this.routeBranches = plan.branches;
    this.branchChosenAt.clear();
    this.clearedRoomIndices.clear();
    this.rerollsRemaining = this.save.upgrades.reroll;
    this.runMetrics = {
      seed:this.runSeed,startedAt:performance.now(),roomsCleared:0,endlessDepth:0,damageTaken:0,enemiesDefeated:0,
      boonsAcquired:0,wagersAttempted:0,wagersWon:0,diveXpEarned:0,highestStyle:0,routeChoices:[],rewardChoices:[],
    };
    this.styleMeter = 0; this.styleRank = 'D'; this.styleFlash = 0; this.runScore = 0; this.runPeakStyle = 0; this.rushPayout = 0; this.payoutFlash = 0; this.payoutFlashCount = 1;
    this.roomIndex = 0;
    this.runRooms = plan.rooms;
    this.stoneBarrierTime = 0;
    this.stoneBarrierHits = 0;
    this.lunaTurretTimer = 0;
    this.bloodPactRoomBonus = 0;
    this.bloodPactAuraTimer = 0;
    this.appetiteMomentumStacks = 0;
    this.appetiteMomentumTimer = 0;
    this.appetiteRoomPower = 0;
    this.seraphineShieldRegenTimer = 4;
    this.seraphineFragmentTimer = 1.4;
    const startingBoon = BOONS[this.selectedStartingBoon];
    this.player = this.makePlayer(startingBoon.special);
    this.applyBoon(this.selectedStartingBoon, false);
    this.screen = 'playing';
    this.overlay.innerHTML = '';
    this.hubModalOpen = false;
    this.hud.classList.remove('hidden');
    // The XP bar remains a contextual HUD element, but every run reveals it
    // long enough for players to learn where their persistent level lives.
    this.xpRevealTimer = Math.max(this.xpRevealTimer, 4);
    this.loadRoom(0);
    this.music.requestState(this.currentDepth === 1 ? 'PORTAL_TRANSITION' : this.explorationMusicState());
    window.setTimeout(() => {
      if (this.screen === 'playing' && this.roomIndex === 0 && this.room.type !== 'miniboss' && this.room.type !== 'boss') this.music.requestState(this.explorationMusicState());
    }, 900);
    this.showToast(`${startingBoon.name}'s boon awakened · SEED ${this.runSeed.toString(16).toUpperCase().padStart(8,'0')}`);
  }

  private transitionToLevelTwo(): void {
    const levelTwoSeed = (this.runSeed ^ 0xD20C0A7) >>> 0;
    const plan = generateRunPlan(2, levelTwoSeed);
    this.currentDepth = 2;
    this.runRooms = plan.rooms;
    this.routeBranches = plan.branches;
    this.branchChosenAt.clear();
    this.clearedRoomIndices.clear();
    this.runRng = new SeededRandom(`${this.runSeed}:level-two:runtime`);
    this.player.health = Math.min(this.player.maxHealth, this.player.health + this.player.maxHealth * .28);
    this.player.energy = this.player.maxEnergy;
    this.player.invulnerable = 1.2;
    this.screen = 'playing';
    this.overlay.innerHTML = '';
    this.loadRoom(0);
    this.music.requestState('LEVEL_2_EXPLORATION');
    this.showToast('LEVEL 2 · THE DROWNED COURT · BUILD CARRIED FORWARD');
  }

  private transitionToLevelThree(): void {
    const levelThreeSeed = (this.runSeed ^ 0xA73B12F) >>> 0;
    const plan = generateRunPlan(3, levelThreeSeed);
    this.currentDepth = 3;
    this.runRooms = plan.rooms;
    this.routeBranches = plan.branches;
    this.branchChosenAt.clear();
    this.clearedRoomIndices.clear();
    this.runRng = new SeededRandom(`${this.runSeed}:level-three:runtime`);
    this.player.health = Math.min(this.player.maxHealth, this.player.health + this.player.maxHealth * .28);
    this.player.energy = this.player.maxEnergy;
    this.player.invulnerable = 1.2;
    this.screen = 'playing';
    this.overlay.innerHTML = '';
    this.loadRoom(0);
    this.music.requestState('LEVEL_3_EXPLORATION');
    this.showToast('LEVEL 3 · THE THORNWILD · BUILD CARRIED FORWARD');
  }

  private transitionToLevelFour(): void {
    const levelFourSeed = (this.runSeed ^ 0x74A4C9D) >>> 0;
    const plan = generateRunPlan(4, levelFourSeed);
    this.currentDepth = 4;
    this.runRooms = plan.rooms;
    this.routeBranches = plan.branches;
    this.branchChosenAt.clear();
    this.clearedRoomIndices.clear();
    this.runRng = new SeededRandom(`${this.runSeed}:level-four:runtime`);
    this.player.health = Math.min(this.player.maxHealth, this.player.health + this.player.maxHealth * .28);
    this.player.energy = this.player.maxEnergy;
    this.player.invulnerable = 1.2;
    this.screen = 'playing';
    this.overlay.innerHTML = '';
    this.loadRoom(0);
    this.music.requestState('LEVEL_4_EXPLORATION');
    this.showToast('LEVEL 4 · THE THUNDER JACKPOT · BUILD CARRIED FORWARD');
  }

  private transitionToLevelFive(): void {
    const levelFiveSeed = (this.runSeed ^ 0xF2057A) >>> 0;
    const plan = generateRunPlan(5, levelFiveSeed);
    this.currentDepth = 5;
    this.runRooms = plan.rooms;
    this.routeBranches = plan.branches;
    this.branchChosenAt.clear();
    this.clearedRoomIndices.clear();
    this.runRng = new SeededRandom(`${this.runSeed}:level-five:runtime`);
    this.player.health = Math.min(this.player.maxHealth, this.player.health + this.player.maxHealth * .28);
    this.player.energy = this.player.maxEnergy;
    this.player.invulnerable = 1.2;
    this.screen = 'playing';
    this.overlay.innerHTML = '';
    this.loadRoom(0);
    this.music.requestState('LEVEL_5_EXPLORATION');
    this.showToast('LEVEL 5 · THE FROZEN BASILICA · BUILD CARRIED FORWARD');
  }

  private transitionToLevelSix(): void {
    const levelSixSeed = (this.runSeed ^ 0x6F0E7E1) >>> 0;
    const plan = generateRunPlan(6, levelSixSeed);
    this.currentDepth = 6;
    this.runRooms = plan.rooms;
    this.routeBranches = plan.branches;
    this.branchChosenAt.clear();
    this.clearedRoomIndices.clear();
    this.runRng = new SeededRandom(`${this.runSeed}:level-six:runtime`);
    this.player.health = Math.min(this.player.maxHealth, this.player.health + this.player.maxHealth * .28);
    this.player.energy = this.player.maxEnergy;
    this.player.invulnerable = 1.2;
    this.screen = 'playing';
    this.overlay.innerHTML = '';
    this.loadRoom(0);
    this.music.requestState('LEVEL_6_EXPLORATION');
    this.showToast('LEVEL 6 · THE FOREVER MOTEL · BUILD CARRIED FORWARD');
  }

  private transitionToLevelSeven(): void {
    const levelSevenSeed = (this.runSeed ^ 0x7A0FACE) >>> 0;
    const plan = generateRunPlan(7, levelSevenSeed);
    this.currentDepth = 7;
    this.runRooms = plan.rooms;
    this.routeBranches = plan.branches;
    this.branchChosenAt.clear();
    this.clearedRoomIndices.clear();
    this.runRng = new SeededRandom(`${this.runSeed}:level-seven:runtime`);
    this.player.health = Math.min(this.player.maxHealth, this.player.health + this.player.maxHealth * .28);
    this.player.energy = this.player.maxEnergy;
    this.player.invulnerable = 1.2;
    this.screen = 'playing';
    this.overlay.innerHTML = '';
    this.loadRoom(0);
    this.music.requestState('LEVEL_7_EXPLORATION');
    this.showToast('LEVEL 7 · CITY OF A THOUSAND FACES · BUILD CARRIED FORWARD');
  }

  private transitionToLevelEight(): void {
    const plan = generateRunPlan(8, (this.runSeed ^ 0x81A17E8) >>> 0);
    this.currentDepth = 8;
    this.runRooms = plan.rooms;
    this.routeBranches = plan.branches;
    this.branchChosenAt.clear();
    this.clearedRoomIndices.clear();
    this.runRng = new SeededRandom(`${this.runSeed}:level-eight:runtime`);
    this.player.health = Math.min(this.player.maxHealth, this.player.health + this.player.maxHealth * .28);
    this.player.energy = this.player.maxEnergy;
    this.player.invulnerable = 1.2;
    this.screen = 'playing'; this.overlay.innerHTML = '';
    this.loadRoom(0);
    this.music.requestState('LEVEL_8_EXPLORATION');
    this.showToast("LEVEL 8 · LILITH'S THRONE · THE ROYAL GAUNTLET BEGINS");
  }

  private transitionToLevelNine(): void {
    const plan = generateRunPlan(9, (this.runSeed ^ 0x9E1FB310) >>> 0);
    this.currentDepth = 9;
    this.runRooms = plan.rooms;
    this.routeBranches = plan.branches;
    this.branchChosenAt.clear();
    this.clearedRoomIndices.clear();
    this.runRng = new SeededRandom(`${this.runSeed}:level-nine:runtime`);
    this.player.health = Math.min(this.player.maxHealth, this.player.health + this.player.maxHealth * .35);
    this.player.energy = this.player.maxEnergy;
    this.player.invulnerable = 1.5;
    this.screen = 'playing'; this.overlay.innerHTML = '';
    this.loadRoom(0);
    this.music.requestState('LEVEL_9_EXPLORATION');
    this.showToast('LEVEL 9 · THE SELF BELOW · EVERYTHING YOU CARRIED COMES WITH YOU');
  }

  private currentThreat() {
    return this.isEndless
      ? deepDiveThreat(this.endlessRoom, this.room.type)
      : campaignThreat(this.currentDepth, this.roomIndex, this.runRooms.length, this.room.type);
  }

  private scaledEnemyDamage(amount: number): number {
    return amount * this.currentThreat().damage;
  }

  private electricHazardActive(cycleOffset = 0): boolean {
    return (this.time + cycleOffset) % 2.4 >= .9;
  }

  private applyCurrentThreat(enemy: Enemy): void {
    if (enemy.type === 'dummy') return;
    const threat = this.currentThreat();
    enemy.maxHealth *= threat.health;
    enemy.health *= threat.health;
    enemy.touchDamage *= threat.damage;
  }

  private loadRoom(index: number): void {
    const previousRoomType = this.room?.type;
    this.roomIndex = index;
    this.room = this.runRooms[index];
    this.roomCleared = this.room.type === 'traversal' || (this.room.type === 'recovery' && this.room.rewardKind !== 'arcane-cache');
    this.bossDefeated = false;
    this.rewardGranted = false;
    this.boonPickups = [];
    this.rewardDelay = 0;
    this.roomTime = 0; this.roomDamageTaken = 0; this.roomCombatStarted = false; this.roomGrade = ''; this.gradeTimer = 0;
    this.wagerMultiplier = 1;
    this.activeWager = null;
    this.projectiles = [];
    this.waves = [];
    this.pickups = [];
    this.bossHazards = [];
    this.belladonnaVortex = 0;
    this.fanClubWave = 0;
    this.fanClubIntermission = 0;
    this.fanClubShieldAnnounced = false;
    this.nerissaShieldAnnounced = false;
    this.dreamDoorCooldown = 0;
    this.dreamGirlShieldAnnounced = false;
    this.daughterRelayWave = 0;
    this.daughterRelayIntermission = 0;
    this.bossRushWave = 0;
    this.bossRushIntermission = 0;
    this.lilithDecreeTimer = 0;
    this.lilithDecreeLabel = '';
    this.hollowStoredBoons = null;
    this.hollowRestoreQueue = [];
    this.hollowRestoreTimer = 0;
    this.lightRayEffects = [];
    this.gustEffects = [];
    this.lunaTurretTimer = 0;
    this.bloodPactRoomBonus = 0;
    this.bloodPactAuraTimer = 0;
    this.appetiteMomentumStacks = 0;
    this.appetiteMomentumTimer = 0;
    this.appetiteRoomPower = 0;
    this.particles = [];
    this.floatingText = [];
    this.fireBuffer=0;this.fireBufferPending=false;
    this.presentedBossMilestones.clear();
    this.enemies = this.room.spawns.map((spawn) => this.createEnemy(spawn.type, spawn.x, spawn.y));
    if (this.currentDepth === 2 && this.room.type === 'miniboss' && !this.isEndless) {
      this.enemies = [];
      this.spawnFanClubWave(1);
    } else if (this.currentDepth === 8 && this.room.type === 'miniboss' && !this.isEndless) {
      this.enemies = [];
      this.spawnDaughterRelayWave(1);
    } else if (this.currentDepth === 9 && this.room.type === 'miniboss' && !this.isEndless) {
      this.enemies = [];
      this.spawnBossRushWave(1);
    } else for (const enemy of this.enemies) this.applyCurrentThreat(enemy);
    if(this.isEndless&&this.room.deepDivePowers?.length){for(const enemy of this.enemies.filter(target=>this.isMajorType(target.type))){
      enemy.deepDivePowers=[...this.room.deepDivePowers];
      if(enemy.deepDivePowers.includes('armored')){enemy.maxHealth*=1.3;enemy.health*=1.3;enemy.eliteArmor=3+Math.min(7,this.room.deepDiveCycle??1);}
      if(enemy.deepDivePowers.includes('volatile'))enemy.volatileArmed=true;
      if(enemy.deepDivePowers.includes('summoner'))enemy.deepDiveSummonTimer=4.8;
    }}
    if (this.room.type === 'recovery') {
      this.spawnPickup('pizza', WIDTH / 2 - 85, FLOOR_Y - 95, 24);
      this.spawnPickup('pizza', WIDTH / 2 - 30, FLOOR_Y - 125, 18);
      this.spawnPickup('coffee', WIDTH / 2 + 35, FLOOR_Y - 95, 34);
      this.spawnPickup('coffee', WIDTH / 2 + 90, FLOOR_Y - 125, 24);
      this.player.health=Math.min(this.player.maxHealth,this.player.health+this.player.maxHealth*.08);
      this.player.energy=Math.min(this.player.maxEnergy,this.player.energy+this.player.maxEnergy*.12);
    }
    if (this.room.type === 'elite') for (const enemy of this.enemies) this.makeElite(enemy);
    const canWager = Boolean(this.room.wagerType) && (this.room.type === 'combat' || this.room.type === 'elite' || this.room.type === 'miniboss');
    const shrineX = this.room.entrySide === 'right' ? WIDTH - 185 : this.room.entrySide === 'left' ? 110 : 735;
    this.wagerShrine = canWager ? { x: shrineX, y: FLOOR_Y - 86, w: 62, h: 82, used: false, pulse: this.runRng.next() * Math.PI * 2, type:this.room.wagerType! } : null;
    this.player.x = this.room.playerStart.x;
    this.player.y = this.room.playerStart.y;
    if (this.room.entrySide === 'right') this.player.facing = -1;
    else if (this.room.entrySide === 'left') this.player.facing = 1;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.dashCharges = 1 + this.boonStacks.noctissa;
    this.player.invulnerable = 1;
    this.roomIntro = 2.2;
    this.transition = .32;
    this.save.bestRoom = Math.max(this.save.bestRoom, index + 1);
    this.roomLabel.textContent = `${this.room.name.toUpperCase()} · ${this.room.subtitle.toUpperCase()}`;
    if(this.room.type==='recovery'){
      this.screenFlash=Math.max(this.screenFlash,.28); this.burst(WIDTH/2,FLOOR_Y-115,'#62e59b',38,410);
      this.announce('INFERNAL REPRIEVE');
      this.showToast(this.room.rewardKind==='arcane-cache'?'RARE REPRIEVE · FULL SPREAD + LUCKY ARCANE CACHE':'RARE REPRIEVE · HEALTH AND DEMON ENERGY RESTORED');
    }
    if (this.room.type === 'miniboss') {
      this.music.requestState(this.minibossMusicState());
      this.announce(this.currentDepth >= 9 ? LEVEL_NINE_ENCOUNTERS.miniboss.name : this.currentDepth === 8 ? LEVEL_EIGHT_ENCOUNTERS.miniboss.name : this.currentDepth === 7 ? LEVEL_SEVEN_ENCOUNTERS.miniboss.name : this.currentDepth === 6 ? LEVEL_SIX_ENCOUNTERS.miniboss.name : this.currentDepth === 5 ? LEVEL_FIVE_ENCOUNTERS.miniboss.name : this.currentDepth === 4 ? LEVEL_FOUR_ENCOUNTERS.miniboss.name : this.currentDepth === 3 ? LEVEL_THREE_ENCOUNTERS.miniboss.name : this.currentDepth === 2 ? LEVEL_TWO_ENCOUNTERS.miniboss.name : LEVEL_ONE_ENCOUNTERS.miniboss.name);
    } else if (this.room.type === 'boss') {
      this.music.requestState(this.bossIntroMusicState());
      this.announce(this.currentDepth >= 9 ? LEVEL_NINE_ENCOUNTERS.boss.name : this.currentDepth === 8 ? LEVEL_EIGHT_ENCOUNTERS.boss.name : this.currentDepth === 7 ? LEVEL_SEVEN_ENCOUNTERS.boss.name : this.currentDepth === 6 ? LEVEL_SIX_ENCOUNTERS.boss.name : this.currentDepth === 5 ? LEVEL_FIVE_ENCOUNTERS.boss.name : this.currentDepth === 4 ? LEVEL_FOUR_ENCOUNTERS.boss.name : this.currentDepth === 3 ? LEVEL_THREE_ENCOUNTERS.boss.name : this.currentDepth === 2 ? LEVEL_TWO_ENCOUNTERS.boss.name : LEVEL_ONE_ENCOUNTERS.boss.name);
    } else if (previousRoomType === 'miniboss') this.music.requestState(this.postMinibossMusicState());
    else if (index > 0) this.music.requestState(this.explorationMusicState());
    this.updateHud();
    this.telemetry.recordRoom(performance.now(),this.screen,'entered',{
      depth:this.currentDepth,roomIndex:this.roomIndex,roomType:this.room.type,
      entry:this.room.entrySide??'left',exit:this.room.exitSide??'right',seed:this.runSeed,
    });
    if (this.room.entryDialogue) this.showDialogueBeat(this.room.entryDialogue, 'playing');
    else if (this.room.routeKind==='event') this.showRoomEvent();
  }

  private createEnemy(type: EnemyType, x: number, y: number): Enemy {
    const stats: Record<EnemyType, { health: number; damage: number }> = {
      imp: { health: 36, damage: 10 }, floater: { health: 44, damage: 9 }, succubus: { health: 55, damage: 10 },
      hellhound: { health: 68, damage: 13 }, crawler: { health: 92, damage: 16 }, siren: { health: 78, damage: 15 },
      drownedFan: { health: 52, damage: 11 }, chorusWisp: { health: 58, damage: 10 }, courtCantor: { health: 78, damage: 13 },
      reefHound: { health: 84, damage: 15 }, bubbleCrab: { health: 126, damage: 17 }, spotlightDancer: { health: 88, damage: 16 },
      fanChampion: { health: 520, damage: 20 }, nerissa: { health: 980, damage: 23 }, chantPillar: { health: 105, damage: 0 },
      thornStalker: { health: 66, damage: 13 }, sporeMaw: { health: 82, damage: 12 }, vineLurker: { health: 94, damage: 15 },
      razorBoar: { health: 118, damage: 18 }, rootMaw: { health: 158, damage: 19 }, thornArcher: { health: 88, damage: 16 },
      perfectPrey: { health: 650, damage: 21 }, roxyne: { health: 1180, damage: 26 },
      jackpotGremlin: { health: 76, damage: 14 }, cardDealer: { health: 98, damage: 16 }, diceHound: { health: 128, damage: 19 },
      railWisp: { health: 84, damage: 14 }, slotMimic: { health: 176, damage: 21 }, jinxCroupier: { health: 112, damage: 17 },
      ladyLuckless: { health: 780, damage: 23 }, calyptraBoss: { health: 1420, damage: 28 },
      icePenitent: { health: 92, damage: 16 }, choirShard: { health: 88, damage: 15 }, reliquaryKnight: { health: 184, damage: 22 },
      frostHound: { health: 146, damage: 21 }, glassDeacon: { health: 126, damage: 19 }, preservationWisp: { health: 98, damage: 16 },
      memoryGolem: { health: 930, damage: 25 }, isoldeBoss: { health: 1680, damage: 31 },
      luggageImp: { health: 104, damage: 17 }, sleepwalker: { health: 132, damage: 18 }, keyholeWisp: { health: 112, damage: 17 },
      bellhopMimic: { health: 220, damage: 24 }, hallwayHound: { health: 166, damage: 23 }, wakeUpCaller: { health: 148, damage: 21 },
      fantasyAnchor: { health: 185, damage: 0 }, dreamGirl: { health: 1040, damage: 27 }, somniaBoss: { health: 1960, damage: 34 },
      mirrorPunk: { health: 122, damage: 19 }, prismWisp: { health: 126, damage: 18 }, facelessStriker: { health: 154, damage: 22 },
      glassHound: { health: 186, damage: 25 }, echoSniper: { health: 168, damage: 23 }, reflectionKnight: { health: 252, damage: 27 },
      betterMilo: { health: 1210, damage: 30 }, vesperaBoss: { health: 2240, damage: 37 },
      throneLegionary: { health: 282, damage: 29 }, charmAcolyte: { health: 176, damage: 24 }, portalHound: { health: 218, damage: 28 },
      bloodCantor: { health: 192, damage: 26 }, decreeWisp: { health: 158, damage: 22 }, hollowSuccubus: { health: 204, damage: 27 },
      daughterAttack: { health: 820, damage: 34 }, daughterDefense: { health: 920, damage: 31 }, daughterMovement: { health: 760, damage: 32 }, daughterEnergy: { health: 790, damage: 30 },
      lilithBoss: { health: 2860, damage: 42 },
      hollowShade: { health: 196, damage: 27 }, bossRushHerald: { health: 1, damage: 0 }, hollowBoss: { health: 3480, damage: 46 },
      dummy: { health: 999999, damage: 0 }, brute: { health: 300, damage: 18 }, warden: { health: 720, damage: 22 },
    };
    const stat = stats[type];
    const body = ENEMY_BODIES[type];
    return {
      id: this.entityId++,
      type,
      x,
      y,
      w: body.w,
      h: body.h,
      vx: 0,
      vy: 0,
      maxHealth: stat.health,
      health: stat.health,
      touchDamage: stat.damage,
      grounded: false,
      facing: -1,
      timer: this.runRng.next() * 2,
      attackTimer: .7 + this.runRng.next(),
      invulnerable: 0,
      phase: 0,
      dead: false,
      hitStun: 0,
      attackCount: 0,
      dotTime: 0,
      dotTick: 0,
      dotDamage: 0,
      dotLabel: 'BURN',
      dotColor: BOONS.pyrra.color,
      attackPoseTime: 0,
      attackPose: 0,
      deathTime: 0,
      slowTime: 0,
      rootTime: 0,
      rootX: x,
      rootY: y,
      charmTime: 0,
      blindTime: 0,
      soulLinked: false,
      statusHits: 0,
      milestones: 0,
    };
  }

  private isMajorType(type: EnemyType): boolean {
    return type === 'brute' || type === 'warden' || type === 'fanChampion' || type === 'nerissa' || type === 'perfectPrey' || type === 'roxyne' || type === 'ladyLuckless' || type === 'calyptraBoss' || type === 'memoryGolem' || type === 'isoldeBoss' || type === 'dreamGirl' || type === 'somniaBoss' || type === 'betterMilo' || type === 'vesperaBoss' || type === 'daughterAttack' || type === 'daughterDefense' || type === 'daughterMovement' || type === 'daughterEnergy' || type === 'lilithBoss' || type === 'bossRushHerald' || type === 'hollowBoss';
  }

  private spawnFanClubWave(wave: number): void {
    this.fanClubWave = wave;
    this.fanClubIntermission = 0;
    const layouts: Record<number, Array<[EnemyType,number,number]>> = {
      1: [['drownedFan',230,552],['drownedFan',470,552],['chorusWisp',720,350],['drownedFan',980,552]],
      2: [['reefHound',170,560],['courtCantor',410,520],['spotlightDancer',790,530],['bubbleCrab',1000,545]],
      3: [['drownedFan',205,552],['chorusWisp',420,340],['fanChampion',785,470],['spotlightDancer',1080,530]],
    };
    const added = (layouts[wave] ?? []).map(([type,x,y]) => this.createEnemy(type,x,y));
    for (const enemy of added) this.applyCurrentThreat(enemy);
    if (wave > 1) for (const enemy of added) {
      enemy.maxHealth *= 1.12; enemy.health *= 1.12; enemy.touchDamage *= 1.075;
    }
    this.enemies.push(...added);
    this.screenFlash = Math.max(this.screenFlash,.3);
    this.burst(WIDTH/2,FLOOR_Y-120,'#57e9f1',22+wave*8,360);
    this.showToast(wave === 3 ? 'FAN CLUB · FINAL WAVE · ISOLATE THE CHAMPION' : `FAN CLUB · WAVE ${wave} OF 3`);
  }

  private spawnDaughterRelayWave(wave: number): void {
    this.daughterRelayWave = wave; this.daughterRelayIntermission = 0;
    const layouts: Record<number, Array<[EnemyType,number]>> = {
      1: [['daughterAttack',280],['daughterDefense',880]],
      2: [['daughterMovement',250],['daughterEnergy',905]],
      3: [['daughterAttack',120],['daughterDefense',405],['daughterMovement',690],['daughterEnergy',975]],
    };
    const added=(layouts[wave]??[]).map(([type,x])=>this.createEnemy(type,x,FLOOR_Y-ENEMY_BODIES[type].h));
    for(const enemy of added){
      this.applyCurrentThreat(enemy);
      if(wave===3){enemy.maxHealth*=.36;enemy.health=enemy.maxHealth;enemy.touchDamage*=1.08;}
    }
    this.enemies.push(...added); this.screenFlash=Math.max(this.screenFlash,.5);
    this.burst(WIDTH/2,FLOOR_Y-145,wave===1?'#ff596f':wave===2?'#5cecff':'#f2c4ff',34+wave*10,430);
    this.showToast(wave===1?'ROYAL RELAY I · ATTACK + DEFENSE':wave===2?'ROYAL RELAY II · MOVEMENT + ENERGY':'ROYAL RELAY FINALE · ALL FOUR PILLARS · REDUCED VITALITY');
  }

  private spawnBossRushWave(wave: number): void {
    this.bossRushWave=wave;this.bossRushIntermission=0;
    const sequence: Array<{type:EnemyType;name:string;twist:string}> = [
      {type:'warden',name:'BELLADONNA',twist:'PICKUPS BECOME FALLING MAWS'},
      {type:'nerissa',name:'NERISSA',twist:'THE CHORUS STARTS ENRAGED'},
      {type:'roxyne',name:'ROXYNE',twist:'EVERY SNARE CREATES A THORN VOLLEY'},
      {type:'calyptraBoss',name:'CALYPTRA',twist:'THE POINTER NEVER STOPS'},
      {type:'isoldeBoss',name:'ISOLDE',twist:'MEMORIES REPEAT IMMEDIATELY'},
      {type:'somniaBoss',name:'SOMNIA',twist:'FALSE AWAKENINGS OVERLAP'},
      {type:'vesperaBoss',name:'VESPERA',twist:'EVERY REFLECTION IS ARMORED'},
    ];
    const entry=sequence[wave-1]; if(!entry)return;
    const enemy=this.createEnemy(entry.type,830,FLOOR_Y-ENEMY_BODIES[entry.type].h);
    this.applyCurrentThreat(enemy);enemy.maxHealth*=.32;enemy.health=enemy.maxHealth;enemy.touchDamage*=1.04;
    if(wave===7){enemy.maxHealth*=1.18;enemy.health=enemy.maxHealth;enemy.eliteArmor=4;}
    this.enemies.push(enemy);this.player.health=Math.min(this.player.maxHealth,this.player.health+this.player.maxHealth*.05);this.player.energy=Math.min(this.player.maxEnergy,this.player.energy+15);
    this.screenFlash=.7;this.shake=9;this.burst(centerX(enemy),centerY(enemy),'#bd7cff',42,520);
    this.showToast(`BOSS RUSH ${wave}/7 · ${entry.name} · ${entry.twist}`);
  }

  private stripBoonsForHollow(): void {
    if(this.hollowStoredBoons)return;
    this.hollowStoredBoons={...this.boonStacks};
    const ratio=this.player.health/Math.max(1,this.player.maxHealth);
    this.player.maxHealth=Math.max(1,this.player.maxHealth-this.boonStacks.maris*10);
    this.player.health=Math.max(1,this.player.maxHealth*ratio);
    this.boonStacks=emptyBoonStacks();
    this.hollowRestoreQueue=BOON_ORDER.filter(id=>(this.hollowStoredBoons?.[id]??0)>0);
    this.player.special='flameNova';
    this.updateHud();
  }

  private restoreNextHollowBoon(): void {
    const id=this.hollowRestoreQueue.shift(); if(!id||!this.hollowStoredBoons)return;
    const stacks=this.hollowStoredBoons[id];const ratio=this.player.health/Math.max(1,this.player.maxHealth);
    this.boonStacks[id]=stacks;
    if(id==='maris'){this.player.maxHealth+=stacks*10;this.player.health=Math.max(1,this.player.maxHealth*ratio);}
    this.player.special=BOONS[id].special;
    this.burst(centerX(this.player),centerY(this.player),BOONS[id].color,36,430);
    this.showToast(`${BOONS[id].name.toUpperCase()} RETURNS · ×${stacks}`);this.updateHud();
  }

  private restoreAllHollowBoons(): void {
    while(this.hollowRestoreQueue.length)this.restoreNextHollowBoon();
  }

  private makeElite(enemy: Enemy, forced?: Enemy['eliteModifier']): void {
    if (enemy.type === 'dummy' || enemy.type === 'chantPillar' || enemy.type === 'fantasyAnchor' || this.isMajorType(enemy.type)) return;
    const modifier = forced ?? this.runRng.pick<NonNullable<Enemy['eliteModifier']>>(['frenzied','armored','volatile']);
    enemy.eliteModifier = modifier;
    // Every elite is a real durability and contact-damage step before its
    // readable modifier layer is applied.
    enemy.maxHealth *= 1.35; enemy.health *= 1.35; enemy.touchDamage *= 1.22;
    if (modifier === 'frenzied') {
      enemy.touchDamage *= 1.25; enemy.attackTimer *= .45; enemy.timer *= .55;
    } else if (modifier === 'armored') {
      enemy.maxHealth *= 1.6; enemy.health *= 1.6; enemy.eliteArmor = 5;
    } else {
      enemy.maxHealth *= 1.25; enemy.health *= 1.25; enemy.touchDamage *= 1.22; enemy.volatileArmed = true;
    }
  }

  private update(dt: number): void {
    this.worldFreezeTimer = Math.max(0, this.worldFreezeTimer - dt);
    this.rushStateTimer = Math.max(0, this.rushStateTimer - dt);
    this.mirrorShieldTimer = Math.max(0, this.mirrorShieldTimer - dt);
    this.lunaTurretTimer = Math.max(0, this.lunaTurretTimer - dt);
    this.bloodPactAuraTimer = Math.max(0, this.bloodPactAuraTimer - dt);
    this.appetiteMomentumTimer=Math.max(0,this.appetiteMomentumTimer-dt);
    if(this.appetiteMomentumTimer===0)this.appetiteMomentumStacks=0;
    this.updateSeraphinePassive(dt);
    this.roomTime += dt;
    if (this.activeWager?.type === 'rush' && !this.activeWager.failed && !this.roomCleared) {
      this.activeWager.timer = Math.max(0, this.activeWager.timer - dt);
      if (this.activeWager.timer === 0) this.failActiveWager('RUSH TIMER EXPIRED');
    }
    if (this.comboTimer <= 0) this.styleMeter = Math.max(0, this.styleMeter - dt * 3.2 * Math.max(.55, 1 - this.save.upgrades.showboat * .08));
    this.updateStyleRank();
    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateBossHazards(dt);
    this.updateProjectiles(dt);
    this.updateWaves(dt);
    this.updatePickups(dt);
    this.updateBoonPickup(dt);
    this.updateWagerShrine();
    this.updateParticles(dt);
    this.checkRoomState(dt);
    this.capTransientEntities();
    this.updateHud();
  }

  private capTransientEntities(): void {
    this.trimTransient('particles',this.particles,650);
    this.trimTransient('floatingText',this.floatingText,90);
    this.trimTransient('lightning',this.lightningEffects,80);
    this.trimTransient('lightRays',this.lightRayEffects,12);
    this.trimTransient('gusts',this.gustEffects,8);
    const counts=this.currentEntityCounts();
    for(const entity of ['enemies','projectiles','bossHazards','activeSfx'] as const){
      const limit=ENTITY_WARNING_BUDGETS[entity];
      if(counts[entity]>limit)this.telemetry.recordEntityCap(performance.now(),this.screen,entity,counts[entity],limit,0);
    }
  }

  private trimTransient<T>(entity: keyof EntityCounts, values: T[], limit: number): void {
    if(values.length<=limit)return;
    const count=values.length;const trimmed=count-limit;
    values.splice(0,trimmed);
    this.telemetry.recordEntityCap(performance.now(),this.screen,entity,count,limit,trimmed);
  }

  private addStyle(amount: number, callout = ''): void {
    this.styleMeter = clamp(this.styleMeter + amount, 0, 100);
    this.runPeakStyle = Math.max(this.runPeakStyle, this.styleMeter);
    this.runMetrics.highestStyle = Math.max(this.runMetrics.highestStyle, this.styleMeter);
    if (this.styleMeter > this.save.bestStyle) { this.save.bestStyle = Math.round(this.styleMeter); this.persistSave(); }
    if (callout) this.floatingText.push({ x: centerX(this.player), y: this.player.y - 22, text: callout, color: this.getArcaneAccentColor(), life: .75, maxLife: .75, size: 17 });
    this.updateStyleRank();
  }

  private rushThreshold(): number {
    return Math.max(65, 100 - this.save.upgrades.showboat * 7);
  }

  private addRushReward(baseScore: number, baseCharge: number, x: number, y: number, label = ''): void {
    const multiplier = scoreMultiplierForRank(this.styleRank);
    const upgradeMultiplier = 1 + this.save.upgrades.showboat * .12;
    const score = Math.round(baseScore * multiplier * upgradeMultiplier);
    this.runScore += score;
    this.save.highScore = Math.max(this.save.highScore, this.runScore);
    this.rushPayout += baseCharge * upgradeMultiplier;
    this.floatingText.push({ x, y: y - 18, text: `${label ? `${label} · ` : ''}+${score} ×${multiplier}`, color: this.getArcaneAccentColor(), life: .85, maxLife: .85, size: 15 });
    const threshold = this.rushThreshold(); let payoutCount = 0;
    while (this.rushPayout >= threshold) { this.rushPayout -= threshold; payoutCount += 1; }
    if (payoutCount > 0) {
      for (let i = 0; i < payoutCount; i += 1) this.spawnPickup('shard', x + (i - (payoutCount - 1) / 2) * 28, y - 28, 1);
      this.payoutFlash = 1; this.payoutFlashCount = payoutCount; this.screenFlash = Math.max(this.screenFlash, .48); this.shake = Math.max(this.shake, 8);
      this.burst(x, y, '#ffc75a', 32 + payoutCount * 8, 430); this.playRewardChord('payout'); this.announce('Rush payout');
      this.showToast(`INFERNAL RUSH PAYOUT · +${payoutCount} SHARD${payoutCount === 1 ? '' : 'S'}`);
    }
  }

  private updateStyleRank(): void {
    const previous = this.styleRank;
    this.styleRank = styleRankFor(this.styleMeter);
    if (this.styleRank !== previous && 'DCBAS'.indexOf(this.styleRank) > 'DCBAS'.indexOf(previous)) {
      this.styleFlash = 1; this.screenFlash = Math.max(this.screenFlash, .34); this.playRewardChord('rank');
      if (this.styleRank === 'A' || this.styleRank === 'S') this.announce(`${this.styleRank} rank`);
      this.showToast(`${this.styleRank}-RANK INFERNAL RUSH`);
    }
  }

  private updateWagerShrine(): void {
    if (!this.wagerShrine || this.wagerShrine.used || this.screen !== 'playing') return;
    const combatStarted = this.roomCleared || this.roomCombatStarted;
    if (combatStarted) {
      this.wagerShrine.used = true;
      this.showToast('WAGER CLOSED · COMBAT ALREADY STARTED');
      return;
    }
    this.wagerShrine.pulse += .04;
    const interact = this.wagerInteractionHeld();
    if (interact && !this.inputPrevious.interact && this.isNearWagerShrine()) this.showWagerMenu();
    this.inputPrevious.interact = interact;
  }

  private isNearWagerShrine(): boolean {
    return Boolean(this.wagerShrine && !this.wagerShrine.used && overlap(this.player, { x: this.wagerShrine.x - 25, y: this.wagerShrine.y - 20, w: this.wagerShrine.w + 50, h: this.wagerShrine.h + 40 }));
  }

  private wagerInteractionHeld(): boolean {
    return this.isControl('interact') || this.touchControls.has('special');
  }

  private showWagerMenu(): void {
    if (!this.wagerShrine) return;
    const type = this.wagerShrine.type;
    const deepTier=this.isEndless?Math.max(1,this.room.deepDiveWagerTier??1):1;const healthRate=.12+(this.isEndless?Math.min(.2,(deepTier-1)*.025):0);const healthCost=Math.ceil(this.player.maxHealth*healthRate);const enemyHealth=Math.round((.25+(this.isEndless?Math.min(.45,(deepTier-1)*.045):0))*100);const rushSeconds=Math.max(10,24-(deepTier-1)*1.2);const stackPayout=this.isEndless?` ×${this.room.deepDiveBoonStacks??1}`:'';const potentialMultiplier=1.8+this.save.upgrades.wagerFavor*.08+(this.isEndless?Math.min(2.5,(deepTier-1)*.2):0);
    const copy: Record<WagerType,{name:string;risk:string;reward:string}> = {
      blood:{name:'Blood Price',risk:`Pay ${healthCost} HP now. Enemies gain ${enemyHealth}% Health.`,reward:`Up to ${potentialMultiplier.toFixed(1)}× room value and improved Jackpot odds.`},
      perfect:{name:'Untouchable',risk:'Take no real damage before the room is cleared.',reward:`An extra smart two-boon Arcane choice${stackPayout}.`},
      rush:{name:'Beat the Clock',risk:`Clear every enemy within ${rushSeconds.toFixed(1)} seconds.`,reward:'A bonus reroll token and multiplied room shards.'},
      chaos:{name:'House of Teeth',risk:'Every standard enemy becomes an obvious elite.',reward:`A premium smart two-boon choice${stackPayout} and the richest Jackpot odds.`},
    };
    const offer = copy[type];
    const wagerGlyph: Record<WagerType,string> = { blood:'♥', perfect:'◇', rush:'»', chaos:'✹' };
    this.previousScreen = 'playing';
    this.screen = 'paused';
    this.overlay.innerHTML = `<div class="panel compact wager-panel" style="--accent:#ffc75a">
      <div class="wager-header"><i>${wagerGlyph[type]}</i><div><p class="eyebrow">Infernal wager · fully disclosed</p><h2>${offer.name}</h2><small>${type.toUpperCase()} CONTRACT · ${this.isEndless?`DEEP TIER ${deepTier} · `:''}OPTIONAL · LOCKS ON COMBAT</small></div></div>
      <div class="wager-stakes" aria-label="High stakes"><i></i><i></i><i></i><span>THE HOUSE SHOWS ITS TEETH</span><i></i><i></i><i></i></div>
      <div class="wager-odds"><span class="risk"><b>RISK</b>${offer.risk}</span><span class="reward"><b>PAYOUT</b>${offer.reward}</span></div>
      <div class="btn-row"><button class="btn primary" id="accept-wager">Accept ${offer.name}</button><button class="btn ghost" id="leave-wager">Decline</button></div>
    </div>`;
    mustElement<HTMLButtonElement>('#accept-wager').addEventListener('click', () => this.resolveWager(true));
    mustElement<HTMLButtonElement>('#leave-wager').addEventListener('click', () => { if (this.wagerShrine) this.wagerShrine.used = true; this.screen = 'playing'; this.overlay.innerHTML = ''; this.inputPrevious.interact = true; });
    this.focusFirstMenuButton();
  }

  private showRoomEvent(): void {
    this.previousScreen='playing'; this.screen='paused';
    const price=Math.max(1,Math.ceil(this.player.maxHealth*.1));
    this.overlay.innerHTML=`<div class="panel compact" style="--accent:#d89cff"><p class="eyebrow">Bounded room event · no hidden outcome</p><h2>The Unmarked Door</h2><p class="lede">A vending machine hums in a language Milo almost remembers.</p>
      <div class="event-choices">
        <button class="route-card" id="event-bargain" style="--accent:#ffc75a"><small>KNOWN COST</small><b>Feed It Blood</b><span>Pay ${price} HP now.</span><em>GAIN · 3 shards + 1 reroll</em></button>
        <button class="route-card" id="event-fight" style="--accent:#ff5269"><small>COMBAT</small><b>Kick the Machine</b><span>Fight three visible elite demons.</span><em>GAIN · Premium boon choice</em></button>
        <button class="route-card" id="event-leave" style="--accent:#62e59b"><small>SAFE</small><b>Unplug It</b><span>No ambush and no penalty.</span><em>GAIN · 18 Demon Energy</em></button>
      </div></div>`;
    mustElement<HTMLButtonElement>('#event-bargain').addEventListener('click',()=>{
      this.player.health=Math.max(1,this.player.health-price); this.runShards+=3; this.rerollsRemaining+=1; this.closeRoomEvent('BLOOD BARGAIN · +3 SHARDS +1 REROLL');
    });
    mustElement<HTMLButtonElement>('#event-fight').addEventListener('click',()=>{
      const types: EnemyType[]=['hellhound','succubus','siren'];
      this.enemies=types.map((type,index)=>this.createEnemy(type,430+index*190,FLOOR_Y-ENEMY_BODIES[type].h));
      for(const enemy of this.enemies)this.makeElite(enemy);
      this.roomCleared=false; this.room.rewardKind='major-boon'; this.rewardGranted=false; this.bossDefeated=false;
      this.closeRoomEvent('THE MACHINE SCREAMS · ELITES INBOUND');
    });
    mustElement<HTMLButtonElement>('#event-leave').addEventListener('click',()=>{
      this.player.energy=Math.min(this.player.maxEnergy,this.player.energy+18); this.closeRoomEvent('MACHINE UNPLUGGED · +18 ENERGY');
    });
    this.focusMenuButton(mustElement<HTMLButtonElement>('#event-bargain'));
  }

  private closeRoomEvent(message:string):void {
    this.screen='playing'; this.overlay.innerHTML=''; this.player.invulnerable=Math.max(this.player.invulnerable,.5); this.showToast(message); this.playSound('boon');
  }

  private resolveWager(risky: boolean): void {
    if (!this.wagerShrine) return;
    this.wagerShrine.used = true; this.screen = 'playing'; this.overlay.innerHTML = ''; this.inputPrevious.interact = true;
    if (risky) {
      const type = this.wagerShrine.type;
      const deepTier=this.isEndless?Math.max(1,this.room.deepDiveWagerTier??1):1;
      this.activeWager = { type, failed:false, timer:type === 'rush' ? Math.max(10,24-(deepTier-1)*1.2) : 0 };
      this.runMetrics.wagersAttempted += 1;
      this.wagerMultiplier = 1.8 + this.save.upgrades.wagerFavor * .08+(this.isEndless?Math.min(2.5,(deepTier-1)*.2):0);
      if (type === 'blood') {
        this.player.health = Math.max(1, this.player.health - Math.ceil(this.player.maxHealth * (.12+(this.isEndless?Math.min(.2,(deepTier-1)*.025):0))));
        for (const enemy of this.enemies) if (!enemy.dead && enemy.type !== 'dummy') { const wagerHealth=1.25+(this.isEndless?Math.min(.45,(deepTier-1)*.045):0);enemy.maxHealth *= wagerHealth; enemy.health *= wagerHealth; }
      } else if (type === 'chaos') {
        for (const enemy of this.enemies) if (!enemy.dead) this.makeElite(enemy);
        this.wagerMultiplier += .35+(this.isEndless?Math.min(1,deepTier*.08):0);
      }
      this.addStyle(10, 'STAKES RAISED'); this.showToast(`${type.toUpperCase()} WAGER ACTIVE · CLEAR THE ROOM`); this.screenFlash = .55; this.playSound('wagerStart');
    }
  }

  private failActiveWager(reason: string): void {
    if (!this.activeWager || this.activeWager.failed) return;
    this.activeWager.failed = true;
    this.wagerMultiplier = 1;
    this.showToast(`WAGER LOST · ${reason}`);
    this.floatingText.push({x:centerX(this.player),y:this.player.y-20,text:'WAGER BROKEN',color:'#ff5269',life:1,maxLife:1,size:20});
    this.playSound('hurt');
  }

  private updateHub(dt: number): void {
    this.updatePlayer(dt, true);
    this.updateProjectiles(dt);
    this.updateWaves(dt);
    this.updatePickups(dt);
    this.updateParticles(dt);
    this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + dt * 10);
    const interact = this.isControl('interact') || this.touchControls.has('special');
    if (interact && !this.inputPrevious.interact) {
      const x = centerX(this.player);
      if (Math.abs(x - 500) < 105) this.showBoonAltar();
      else if (Math.abs(x - 775) < 105) this.showUpgradeDesk();
      else if (Math.abs(x - 1190) < 105) this.showRunGate();
    }
    this.inputPrevious.interact = interact;
  }

  private isNearHubStation(): boolean {
    if (this.screen !== 'hub') return false;
    const x = centerX(this.player);
    return Math.abs(x - 500) < 105 || Math.abs(x - 775) < 105 || Math.abs(x - 1190) < 105;
  }

  private gamepadControl(name: ControlName): boolean {
    const gamepad = navigator.getGamepads?.()[0];
    return this.gamepadActions.active(name,gamepad);
  }

  private isControl(name: ControlName): boolean {
    return this.touchControls.has(name) || mappedKeyboardActionActive(name,this.keys,this.keyboardBindingState.bindings) || this.gamepadControl(name);
  }

  private updatePlayer(dt: number, allowCombat = true): void {
    const inputAt = performance.now();
    const wasGrounded = this.player.grounded;
    let waveLandingConfirmed = false;
    const left = this.isControl('left');
    const right = this.isControl('right');
    const up = this.isControl('up');
    const down = this.isControl('down');
    const jump = this.isControl('jump');
    const fire = this.isControl('fire');
    const special = this.isControl('special');
    const dash = this.isControl('dash');
    const jumpPressed = jump && !this.inputPrevious.jump;
    const firePressed = fire && !this.inputPrevious.fire;
    const specialPressed = special && !this.inputPrevious.special;
    const dashPressed = dash && !this.inputPrevious.dash;
    const move = Number(right) - Number(left);
    const movement = MOVEMENT_PROFILES[this.movementProfileId];
    this.fireBuffer=Math.max(0,this.fireBuffer-dt);
    if(this.fireBufferPending&&this.fireBuffer===0&&!fire){
      this.fireBufferPending=false;
      this.telemetry.recordAction(inputAt,this.screen,'fire','ignored','buffer-expired');
    }
    if(firePressed){this.fireBuffer=movement.fireBufferSeconds;this.fireBufferPending=true;}
    if (move !== 0) this.tutorialAction('move');
    this.playerSnareTime=Math.max(0,this.playerSnareTime-dt);this.snareNoticeCooldown=Math.max(0,this.snareNoticeCooldown-dt);this.dreamDoorCooldown=Math.max(0,this.dreamDoorCooldown-dt);
    const snareMultiplier=this.playerSnareTime>0 ? .52 : 1;
    const onControlledIce=this.worldFreezeTimer<=0&&this.room.hazards.some(hazard=>hazard.type==='ice'&&overlap(this.player,hazard));
    const traction = 1 + this.save.upgrades.traction * .025;
    const appetiteSpeed=1+Math.min(.28,this.appetiteMomentumStacks*(.025+this.effectiveBoonStacks('belladonna')*.006));
    const speed = movement.runSpeed * traction * (1 + this.boonStacks.zephyra * .025 + this.boonStacks.noctissa * .03) * appetiteSpeed * (this.rushStateTimer > 0 ? 1.28 : 1) * snareMultiplier;
    const accel = (this.player.grounded ? movement.groundAcceleration : movement.airAcceleration * (1 + this.boonStacks.maris * .05)) * traction * (this.playerSnareTime>0 ? .58 : 1) * (onControlledIce?.42:1);

    this.player.dashCooldown = Math.max(0, this.player.dashCooldown - dt);
    this.player.dashRecoveryTime = Math.max(0, this.player.dashRecoveryTime - dt);
    this.player.waveSlideTime = Math.max(0, this.player.waveSlideTime - dt);
    this.player.dropTimer = Math.max(0, this.player.dropTimer - dt);
    this.player.perfectDodgeCooldown = Math.max(0, this.player.perfectDodgeCooldown - dt);
    this.stoneBarrierTime = Math.max(0, this.stoneBarrierTime - dt);
    if (this.player.grounded) {
      this.player.airJumps = 1 + (this.boonStacks.isolde > 0 ? 1 : 0);
      this.player.dashCharges = Math.min(this.player.dashCharges, 1 + this.boonStacks.noctissa);
      if (this.player.dashCooldown === 0) this.player.dashCharges = 1 + this.boonStacks.noctissa;
    }

    if (dashPressed) {
      if (this.player.dashTime > 0) this.telemetry.recordAction(inputAt,this.screen,'dash','ignored','dash-lock');
      else if (this.player.dashCharges <= 0) this.telemetry.recordAction(inputAt,this.screen,'dash','ignored','no-dash-charge');
      else if (this.player.dashCooldown > 0) this.telemetry.recordAction(inputAt,this.screen,'dash','ignored','cooldown');
      else {
        let dashX = move;
        let dashY = Number(down) - Number(up);
        if (dashX === 0 && dashY === 0) dashX = this.player.facing;
        const length = Math.hypot(dashX, dashY) || 1;
        this.player.dashX = dashX / length;
        this.player.dashY = dashY / length;
        this.player.dashTime = movement.dashDurationSeconds;
        this.player.dashCooldown = movement.dashCooldownSeconds;
        this.player.dashRecoveryTime = 0;
        this.player.dashCharges -= 1;
        this.player.invulnerable = Math.max(this.player.invulnerable, .38+Math.min(.14,this.effectiveBoonStacks('vespera')*.02));
        this.shake = 4;
        this.burst(centerX(this.player), centerY(this.player), this.getArcaneColor(), 14, 240);
        this.playSound('dash');
        this.tutorialAction('dash');
        this.telemetry.recordAction(inputAt,this.screen,'dash','consumed','activated');
      }
    }

    if (this.player.dashTime > 0) {
      if (jumpPressed) this.telemetry.recordAction(inputAt,this.screen,'jump','ignored','dash-lock');
      this.player.dashTime = Math.max(0, this.player.dashTime - dt);
      this.player.vx = this.player.dashX * movement.dashSpeed;
      this.player.vy = this.player.dashY * movement.dashSpeed;
      this.moveWithPlatforms(this.player, dt, true, this.player.dashY < 0);
      this.player.x = clamp(this.player.x, 0, WIDTH - this.player.w);
      this.particles.push({ x: centerX(this.player), y: centerY(this.player), vx: -this.player.dashX * 115, vy: -this.player.dashY * 115, life: .24, maxLife: .24, size: 3 + Math.random() * 5, color: this.getArcaneAccentColor(), gravity: 0 });
      if (this.player.grounded && this.player.dashY > .15) {
        this.player.dashTime = 0;
        this.player.waveSlideTime = movement.wavelandDurationSeconds;
        this.player.vx = this.player.dashX * movement.wavelandSpeed;
        this.player.vy = 0;
        const isWavedash=Math.abs(this.player.dashX)>.35;
        waveLandingConfirmed=true;
        this.burst(centerX(this.player), this.player.y + this.player.h, isWavedash?this.getArcaneAccentColor():'#eaffff', isWavedash?16:13, isWavedash?300:250);
        this.playSound(isWavedash?'wavedash':'waveland');
        this.shake=Math.max(this.shake,isWavedash?2.5:2.25);
      } else if (this.player.dashTime === 0) this.player.dashRecoveryTime = movement.dashRecoverySeconds;
    } else {

    if (this.player.kickTime > 0) {
      this.player.vx = this.player.facing * (520 + this.boonStacks.isolde * 35);
      this.player.invulnerable = Math.max(this.player.invulnerable, .08);
    } else if (move !== 0) {
      this.player.vx += move * accel * dt;
      const momentumCap = this.player.waveSlideTime > 0 ? 820 : speed*(onControlledIce?1.18:1);
      this.player.vx = clamp(this.player.vx, -momentumCap, momentumCap);
      this.player.facing = move > 0 ? 1 : -1;
    } else {
      const friction = this.player.waveSlideTime > 0 ? 520 : onControlledIce ? 460 : this.player.grounded ? movement.groundFriction : movement.airFriction;
      if (Math.abs(this.player.vx) <= friction * dt) this.player.vx = 0;
      else this.player.vx -= Math.sign(this.player.vx) * friction * dt;
    }

    const onThinPlatform = this.room.platforms.some((platform) => platform.h <= 25 && Math.abs(this.player.y + this.player.h - platform.y) < 7 && this.player.x + this.player.w > platform.x && this.player.x < platform.x + platform.w);
    if (jumpPressed && down && onThinPlatform) {
      this.player.dropTimer = .24;
      this.player.grounded = false;
      this.player.y += 8;
      this.player.vy = 120;
      this.telemetry.recordAction(inputAt,this.screen,'jump','consumed','drop-through');
    } else if (jumpPressed) {
      this.player.jumpBuffer = movement.jumpBufferSeconds + this.save.upgrades.training*.03;
      this.telemetry.recordAction(inputAt,this.screen,'jump','consumed','buffered');
    }
    this.player.jumpBuffer = Math.max(0, this.player.jumpBuffer - dt);
    this.player.coyote = this.player.grounded ? movement.coyoteSeconds + this.save.upgrades.training*.03 : Math.max(0, this.player.coyote - dt);
    if (this.player.jumpBuffer > 0 && (this.player.coyote > 0 || this.player.airJumps > 0)) {
      const airJump = this.player.coyote <= 0;
      this.player.vy = movement.jumpVelocity;
      this.player.grounded = false;
      this.player.coyote = 0;
      if (airJump) this.player.airJumps -= 1;
      this.player.jumpBuffer = 0;
      this.burst(centerX(this.player), this.player.y + this.player.h, airJump ? '#42e8f5' : '#ffc75a', airJump ? 13 : 7, airJump ? 240 : 160);
      this.playSound(airJump ? 'doubleJump' : 'jump');
      this.tutorialAction('jump');
    }
    if (!jump && this.player.vy < -210) this.player.vy += movement.jumpReleaseGravity * dt;

    const fastFall = down && this.player.vy > 30 ? movement.fastFallGravity : 0;
    this.player.vy = Math.min(down ? movement.fastFallSpeedCap : movement.fallSpeedCap, this.player.vy + (movement.gravity + fastFall) * dt);
    this.moveWithPlatforms(this.player, dt, true, this.player.dropTimer > 0);
    }
    this.player.x = clamp(this.player.x, 0, WIDTH - this.player.w);
    if (this.player.y > HEIGHT + 80) {
      this.damagePlayer(18, centerX(this.player));
      this.player.x = this.room.playerStart.x;
      this.player.y = this.room.playerStart.y;
      this.player.vx = 0;
      this.player.vy = 0;
    }

    if (this.worldFreezeTimer <= 0) for (const hazard of this.room.hazards) {
      if (!overlap(this.player, hazard)) continue;
      if (hazard.type === 'current') {
        this.player.vx += (hazard.forceX ?? 0) * dt * 5.2;
        this.player.vx = clamp(this.player.vx,-720,720);
      } else if (hazard.type === 'bubble') {
        this.player.vy = Math.min(this.player.vy,(hazard.forceY ?? -600));
        this.player.grounded = false;
        this.player.dashCharges = Math.max(this.player.dashCharges,1);
      } else if (hazard.type === 'snare') {
        this.applyPlayerSnare(1.25,hazard.forceX??0);
      } else if (hazard.type === 'electric') {
        if (this.electricHazardActive(hazard.cycleOffset)) this.damagePlayer(hazard.damage, centerX(hazard));
      } else if (hazard.type === 'ice') {
        this.player.vx=clamp(this.player.vx+(hazard.forceX??0)*dt,-760,760);
      } else if (hazard.type === 'dreamDoor') {
        if (this.dreamDoorCooldown === 0) {
          this.player.x=clamp((hazard.forceX??centerX(hazard))-this.player.w/2,0,WIDTH-this.player.w);
          this.player.y=clamp((hazard.forceY??540)-this.player.h,40,FLOOR_Y-this.player.h);
          this.player.vx*=.72;this.player.vy=0;this.player.invulnerable=Math.max(this.player.invulnerable,.28);this.dreamDoorCooldown=.72;
          this.screenFlash=Math.max(this.screenFlash,.28);this.burst(centerX(this.player),centerY(this.player),'#d6a0ff',22,340);this.playSound('boon');
          this.showToast('LOOP DOOR · PAIRED DESTINATION · KEEP YOUR BEARINGS');
        }
      } else if (hazard.type === 'mirror') {
        // Mirrors redirect Arcane projectiles; touching the surface is safe.
      } else if (hazard.type === 'royalSigil') {
        if(this.electricHazardActive(hazard.cycleOffset))this.damagePlayer(hazard.damage,centerX(hazard));
      } else if (hazard.type === 'memoryRift') {
        if((this.time+(hazard.cycleOffset??0))%2.8>1.45){this.damagePlayer(hazard.damage,centerX(hazard));this.player.vx*=.78;}
      } else this.damagePlayer(hazard.damage, centerX(hazard));
    }

    this.player.fireCooldown = Math.max(0, this.player.fireCooldown - dt);
    this.player.specialCooldown = Math.max(0, this.player.specialCooldown - dt);
    this.player.firePoseTime = Math.max(0, this.player.firePoseTime - dt);
    this.player.landPoseTime = Math.max(0, this.player.landPoseTime - dt);
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    this.player.hurtFlash = Math.max(0, this.player.hurtFlash - dt);
    this.player.animationTime += dt;
    if (this.player.grounded && Math.abs(this.player.vx) > 42 && this.player.dashTime === 0 && this.player.kickTime === 0 && this.player.punchTime === 0) {
      this.player.runAnimationTime += dt * clamp(Math.abs(this.player.vx) / Math.max(1, speed), .65, 1.65);
    } else this.player.runAnimationTime = 0;
    if (!wasGrounded && this.player.grounded) { this.player.landPoseTime = .11; if(!waveLandingConfirmed)this.playSound('land'); }
    this.footstepCooldown=Math.max(0,this.footstepCooldown-dt);
    if (this.player.grounded&&Math.abs(this.player.vx)>90&&this.player.dashTime<=0&&this.footstepCooldown===0) { this.footstepCooldown=.24; this.playSound('step'); }
    if (this.player.kickTime > 0) {
      this.player.kickTime = Math.max(0, this.player.kickTime - dt);
      const hitbox: Rect = { x: this.player.facing > 0 ? this.player.x + this.player.w - 4 : this.player.x - 76, y: this.player.y - 4, w: 80, h: this.player.h + 8 };
      for (const enemy of this.enemies) {
        if (!enemy.dead && !this.kickHits.has(enemy.id) && this.hitsEnemy(hitbox, enemy)) {
          this.kickHits.add(enemy.id);
          this.damageEnemy(enemy, 38 + this.effectiveBoonStacks('roxyne') * 11, BOONS.roxyne.color);
          enemy.vx += this.player.facing * 330;
          this.shake = 7;
        }
      }
    }

    if (this.player.punchTime > 0) {
      this.player.punchTime = Math.max(0, this.player.punchTime - dt);
      this.player.vx *= Math.max(0, 1 - dt * 12);
      if (!this.player.punchHit && this.player.punchTime <= .28) {
        this.player.punchHit = true;
        const hitbox: Rect = { x: this.player.facing > 0 ? this.player.x + 28 : this.player.x - 190, y: this.player.y - 35, w: 205, h: 140 };
        for (const enemy of this.enemies) if (!enemy.dead && this.hitsEnemy(hitbox, enemy)) {
          this.damageEnemy(enemy, 105 + this.boonStacks.gaia * 24, '#a65cff');
          enemy.vx += this.player.facing * 620;
        }
        this.burst(this.player.facing > 0 ? this.player.x + 150 : this.player.x - 105, centerY(this.player), this.getArcaneColor(), 42, 560);
        this.shake = 16; this.screenFlash = .5;
      }
    }

    const attackLocked=this.player.dashTime>0||this.player.kickTime>0||this.player.punchTime>0;
    if (allowCombat && (fire||this.fireBuffer>0) && this.player.fireCooldown === 0 && !attackLocked) {
      this.firePlayerProjectile();this.fireBuffer=0;this.fireBufferPending=false;
    }
    else if(firePressed&&!allowCombat){
      this.fireBuffer=0;this.fireBufferPending=false;
      this.telemetry.recordAction(inputAt,this.screen,'fire','ignored','combat-disabled');
    }
    const contextualInteraction = (this.isNearWagerShrine() && this.wagerInteractionHeld()) || (this.isNearHubStation() && (this.isControl('interact') || this.touchControls.has('special')));
    if(specialPressed){
      if(contextualInteraction)this.telemetry.recordAction(inputAt,this.screen,'special','ignored','context-interaction');
      else if(!allowCombat)this.telemetry.recordAction(inputAt,this.screen,'special','ignored','combat-disabled');
      else if(attackLocked)this.telemetry.recordAction(inputAt,this.screen,'special','ignored','attack-lock');
      else if(this.player.specialCooldown>0)this.telemetry.recordAction(inputAt,this.screen,'special','ignored','cooldown');
      else if(this.player.energy<this.getSpecialCost(this.player.special))this.telemetry.recordAction(inputAt,this.screen,'special','ignored','insufficient-energy');
      else if(this.useSpecial())this.telemetry.recordAction(inputAt,this.screen,'special','consumed','activated');
      else this.telemetry.recordAction(inputAt,this.screen,'special','ignored','special-condition');
    }
    this.telemetry.recordMovement(inputAt,this.screen,{x:this.player.x,y:this.player.y,vx:this.player.vx,vy:this.player.vy,grounded:this.player.grounded,dashing:this.player.dashTime>0});
    this.inputPrevious.jump = jump;
    this.inputPrevious.fire = fire;
    this.inputPrevious.special = special;
    this.inputPrevious.dash = dash;
  }

  private applyPlayerSnare(duration: number, forceX = 0): void {
    const newlySnared=this.playerSnareTime<=.12;
    this.playerSnareTime=Math.max(this.playerSnareTime,duration);
    this.player.vx*=.42;this.player.vx+=forceX*.018;
    if(newlySnared&&this.snareNoticeCooldown<=0){
      this.snareNoticeCooldown=1.4;
      this.floatingText.push({x:centerX(this.player),y:this.player.y-18,text:'SNARED · JUMP + DASH READY',color:'#dfff9b',life:1,maxLife:1,size:16});
      this.showToast('SNARED · HORIZONTAL SPEED REDUCED · JUMP + DASH READY');
      this.burst(centerX(this.player),this.player.y+this.player.h,'#9edb55',18,250);
    }
  }

  private moveWithPlatforms(body: { x: number; y: number; w: number; h: number; vx: number; vy: number; grounded: boolean }, dt: number, collideSides: boolean, ignoreThin = false): void {
    const oldX = body.x;
    body.x += body.vx * dt;
    if (collideSides) {
      for (const platform of this.room.platforms) {
        // Thin platforms are always one-way: pass through their sides and underside.
        if (platform.h <= 25) continue;
        if (!overlap(body, platform)) continue;
        if (body.vx > 0 && oldX + body.w <= platform.x + 4) body.x = platform.x - body.w;
        else if (body.vx < 0 && oldX >= platform.x + platform.w - 4) body.x = platform.x + platform.w;
        else continue;
        body.vx = 0;
      }
    }

    const oldY = body.y;
    body.y += body.vy * dt;
    body.grounded = false;
    for (const platform of this.room.platforms) {
      if (ignoreThin && platform.h <= 25) continue;
      if (!overlap(body, platform)) continue;
      if (body.vy >= 0 && oldY + body.h <= platform.y + 7) {
        body.y = platform.y - body.h;
        body.vy = 0;
        body.grounded = true;
      } else if (platform.h > 25 && body.vy < 0 && oldY >= platform.y + platform.h - 5) {
        body.y = platform.y + platform.h;
        body.vy = 0;
      }
    }
  }

  private firePlayerProjectile(): void {
    const arcane = ARCANE_PROFILES[this.arcaneProfileId];
    const primaryBoon=this.getDominantBoon();
    const attachedBoons=selectAttachedBoons(this.boonStacks,BOON_ORDER,primaryBoon);
    const steamPressure = this.hasBoonPair('pyrra','maris');
    const stormfront = this.hasBoonPair('voltara','zephyra');
    const crystalGarden = this.hasBoonPair('flora','crya');
    const mirrorDream = this.hasBoonPair('vespera','somnia');
    const pyrraPower=this.effectiveBoonStacks('pyrra');
    const marisPower=this.effectiveBoonStacks('maris');
    const gaiaPower=this.effectiveBoonStacks('gaia');
    const zephyraPower=this.effectiveBoonStacks('zephyra');
    const floraPower=this.effectiveBoonStacks('flora');
    const solaraPower=this.effectiveBoonStacks('solara');
    const aureliaPower=this.effectiveBoonStacks('aurelia');
    const lilithPower=this.effectiveBoonStacks('lilith');
    const somniaPower=this.effectiveBoonStacks('somnia');
    const fireRateBonus = zephyraPower * .08 + floraPower * .04 + this.styleMeter * .002 + this.save.upgrades.cadence * .04 + (this.rushStateTimer > 0 ? .38 : 0);
    this.player.fireCooldown = arcane.baseCooldownSeconds / (1 + fireRateBonus);
    const size = Math.min(42,arcane.baseRadius * (1 + marisPower * .16 + gaiaPower * .3) * Math.max(.58,1-zephyraPower*.08));
    let damage = arcane.baseDamage * (1 + this.save.upgrades.kindling * .05) * (1 + pyrraPower * .10 + gaiaPower * .16);
    damage *= 1 + this.styleMeter * .0012;
    damage *= 1+this.appetiteRoomPower;
    damage *= 1+Math.min(.45,this.runShards*.003*aureliaPower);
    damage *= 1+lilithPower*.18*(1-this.player.health/Math.max(1,this.player.maxHealth));
    if (steamPressure) damage*=1.15;
    if (this.boonStacks.calyptra > 0) damage *= calyptraPowerMultiplier(this.boonStacks.calyptra, this.runRng.next());
    const crit = this.runRng.next() < Math.min(.42, floraPower * .06 + this.effectiveBoonStacks('calyptra') * .025 + (crystalGarden ? .08 : 0));
    if (crit) damage *= calyptraCriticalMultiplier(this.boonStacks.calyptra);
    const color = this.getArcaneColor();
    const accentColor = this.getArcaneAccentColor();
    const projectileSpeed = arcane.projectileSpeed * (1 + zephyraPower * .14 + solaraPower*.06) * Math.max(.62, 1 - gaiaPower * .08);
    let aimX = Number(this.isControl('right')) - Number(this.isControl('left'));
    let aimY = Number(this.isControl('down')) - Number(this.isControl('up'));
    if (aimY > 0 && this.player.grounded && aimX === 0) aimX = this.player.facing;
    if (aimX === 0 && aimY === 0) aimX = this.player.facing;
    const aimLength = Math.hypot(aimX, aimY) || 1;
    aimX /= aimLength;
    aimY /= aimLength;
    if (aimX !== 0) this.player.facing = aimX > 0 ? 1 : -1;
    this.player.lastAimX = aimX;
    this.player.lastAimY = aimY;
    this.player.firePoseTime = arcane.firePoseSeconds;
    const hand = this.castingHandWorld();
    const muzzleX = hand.x + aimX * 9;
    // Spawn from the visible charged palm; the forgiving projectile radius
    // still shares the combat lane with short grounded enemies.
    const muzzleY = hand.y + aimY * 9 + (this.player.grounded && Math.abs(aimY) < .12 ? 2 : 0);
    const shotCount = Math.min(8,1 + Math.floor(this.boonStacks.zephyra / 3) + (stormfront?1:0));
    const baseAngle = Math.atan2(aimY, aimX);
    const totalSpread = Math.min(.55, .17 * (shotCount - 1));
    const shotDamage = shotCount === 1 ? damage : damage * (.7 / (1 + (shotCount - 2) * .08));
    for (let i = 0; i < shotCount; i += 1) {
      const offset = shotCount === 1 ? 0 : -totalSpread / 2 + (totalSpread * i) / (shotCount - 1);
      const angle = baseAngle + offset;
      this.projectiles.push({
        id: this.entityId++, owner: 'player', x: muzzleX - size, y: muzzleY - size, w: size * 2, h: size * 2,
        vx: Math.cos(angle) * projectileSpeed, vy: Math.sin(angle) * projectileSpeed,
        damage: shotDamage, life: arcane.projectileLifeSeconds * (1 + this.boonStacks.isolde * .12 + solaraPower*.08), color, radius: size,
        pierce: Math.min(16,this.boonStacks.gaia + this.boonStacks.solara + Math.floor(this.boonStacks.maris / 2)+Math.floor(zephyraPower)),
        bounces: Math.min(12,this.boonStacks.isolde+(mirrorDream?1:0)), homing: Math.min(2.4,this.boonStacks.nerissa * .38), explosive: steamPressure&&this.boonStacks.pyrra+this.boonStacks.maris>=4,
        age: 0, baseRadius: size,
        wave: this.boonStacks.maris, boomerang: false, returning: false,
        accentColor,primaryBoon:primaryBoon??undefined,attachedBoons,
      });
      const echoCount=somniaEchoCount(this.boonStacks.somnia);
      for(let echo=0;echo<echoCount;echo+=1)this.projectiles.push({
        id:this.entityId++,owner:'player',x:muzzleX-size*.72,y:muzzleY-size*.72,w:size*1.44,h:size*1.44,
        vx:Math.cos(angle)*projectileSpeed,vy:Math.sin(angle)*projectileSpeed,damage:shotDamage*Math.min(.5,.18+somniaPower*.045),
        life:arcane.projectileLifeSeconds*(1+this.boonStacks.isolde*.12+solaraPower*.08),color:BOONS.somnia.color,radius:size*.72,
        pierce:Math.min(8,Math.floor((this.boonStacks.gaia+this.boonStacks.solara+this.boonStacks.zephyra)/2)),bounces:Math.min(6,this.boonStacks.isolde),
        homing:Math.min(1.8,this.boonStacks.nerissa*.3),explosive:false,age:0,baseRadius:size*.72,wave:this.boonStacks.maris,
        boomerang:false,returning:false,accentColor:BOONS.somnia.accentColor,primaryBoon:'somnia',attachedBoons:[],spawnDelay:.16+echo*.11,
      });
    }
    if (this.lunaTurretTimer > 0) this.fireLunaTurretShot(aimX, aimY, color, accentColor);
    this.burst(muzzleX, muzzleY, color, 4, 100);
    this.playArcaneBlastSound();
    this.playSound('fire');
    this.telemetry.recordAction(performance.now(),this.screen,'fire','consumed','fired');
    this.telemetry.recordShot(performance.now(),this.screen,shotCount,this.totalBoonStacks());
    this.tutorialAction('magic');
    if (crit) this.floatingText.push({ x: centerX(this.player), y: this.player.y - 10, text: 'CRIT READY', color: '#ffc75a', life: .5, maxLife: .5, size: 12 });
  }

  private getArcaneColor(): string {
    const dominant=this.getDominantBoon();
    return dominant?BOONS[dominant].color:'#6e3df5';
  }

  private getArcaneAccentColor(): string {
    const dominant=this.getDominantBoon();
    return dominant?BOONS[dominant].accentColor:'#f3eaff';
  }

  private getDominantBoon():BoonId|null {
    return selectDominantBoon(this.boonStacks,BOON_ORDER,this.selectedStartingBoon,this.lastRewardBoon);
  }

  private hasBoonPair(first: BoonId, second: BoonId): boolean { return this.boonStacks[first]>0&&this.boonStacks[second]>0; }

  /** Full first-stack identity, then a gentle power curve that still permits wild late runs. */
  private effectiveBoonStacks(id: BoonId): number {
    const raw=this.boonStacks[id];
    if(raw<=1)return raw;
    if(raw<=4)return 1+(raw-1)*.7;
    return 3.1+(raw-4)*.32;
  }

  private belladonnaEdibleTarget(): Enemy|undefined {
    return this.enemies
      .filter(enemy=>{
        if(enemy.dead||enemy.type==='dummy')return false;
        const ahead=(centerX(enemy)-centerX(this.player))*this.player.facing;
        const vertical=Math.abs(centerY(enemy)-centerY(this.player));
        const threshold=this.isMajorType(enemy.type)?.1:.32;
        return ahead>0&&ahead<175&&vertical<115&&enemy.health/enemy.maxHealth<=threshold;
      })
      .sort((a,b)=>Math.abs(centerX(a)-centerX(this.player))-Math.abs(centerX(b)-centerX(this.player)))[0];
  }

  private fireLunaTurretShot(aimX:number,aimY:number,color:string,accentColor:string): void {
    const x=centerX(this.player)-this.player.facing*54;
    const y=this.player.y+22;
    const radius=7;
    const speed=720;
    const damage=11+this.effectiveBoonStacks('luna')*3.5;
    this.projectiles.push({
      id:this.entityId++,owner:'player',x:x-radius,y:y-radius,w:radius*2,h:radius*2,
      vx:-aimX*speed,vy:-aimY*speed,damage,life:1.45,color:BOONS.luna.color,radius,
      pierce:0,bounces:0,homing:0,explosive:false,accentColor,turretShot:true,
    });
    this.burst(x,y,color,5,105);
  }

  private activeSynergies(): Array<{name:string;color:string;description:string}> {
    const definitions: Array<[BoonId,BoonId,string,string,string]> = [
      ['pyrra','maris','STEAM PRESSURE','#ff8a6b','+15% Magic damage; high stacks make bolts erupt.'],
      ['voltara','zephyra','STORMFRONT','#f6df45','Adds an extra wind-split lightning bolt.'],
      ['flora','crya','CRYSTAL GARDEN','#82e69a','Adds 8% critical chance.'],
      ['luna','solara','ECLIPSE ENGINE','#d7b7ff','Specials cost 12% less Demon Energy.'],
      ['aurelia','belladonna','GILDED APPETITE','#ffc75a','Kills can cough up an extra soul shard.'],
      ['vespera','somnia','MIRROR DREAM','#bc8cff','Every Arcane bolt gains one geometry bounce.'],
    ];
    return definitions.filter(([a,b])=>this.hasBoonPair(a,b)).map(([, ,name,color,description])=>({name,color,description}));
  }

  private arcaneCore(color: string): string {
    const r = Number.parseInt(color.slice(1, 3), 16);
    const g = Number.parseInt(color.slice(3, 5), 16);
    const b = Number.parseInt(color.slice(5, 7), 16);
    const mix = (value: number) => Math.round(value + (255 - value) * .72).toString(16).padStart(2, '0');
    return `#${mix(r)}${mix(g)}${mix(b)}`;
  }

  private useSpecial(): boolean {
    const cost = this.getSpecialCost(this.player.special);
    if(this.player.special==='rushState'&&!this.belladonnaEdibleTarget()){
      this.showToast('DEVOUR · NO WEAKENED ENEMY IN FRONT');
      return false;
    }
    if(this.player.special==='drainBurst'&&this.player.health<=Math.max(8,this.player.maxHealth*.14)+1){
      this.showToast('BLOOD PACT · NOT ENOUGH HEALTH TO OFFER');
      return false;
    }
    if (this.player.energy < cost) {
      this.showToast('Not enough demon energy — find coffee');
      return false;
    }
    this.player.energy -= cost;
    this.player.specialCooldown = .3;
    this.shake = 8;
    this.screenFlash = .22;
    this.playSound('special');
    this.tutorialAction('special');

    if (this.player.special === 'flameNova') {
      const count = 12 + Math.min(6, this.boonStacks.pyrra * 2);
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count;
        this.spawnPlayerProjectile(centerX(this.player), centerY(this.player), Math.cos(angle) * 550, Math.sin(angle) * 550, 24 + this.boonStacks.pyrra * 4, BOONS.pyrra.color, 10, 1);
      }
      this.burst(centerX(this.player), centerY(this.player), BOONS.pyrra.color, 28, 420);
    } else if (this.player.special === 'groundWave') {
      const facing = this.player.facing;
      const waves = this.boonStacks.maris >= 3 ? 2 : 1;
      for (let i = 0; i < waves; i += 1) this.waves.push({
        id:this.entityId++,x:facing>0?this.player.x+this.player.w:this.player.x-138,y:this.player.y-12-i*16,w:138,h:105,vx:facing*(720-i*80),life:.78+i*.12,
        damage:42+this.boonStacks.maris*8,facing,hitIds:new Set<number>(),
      });
      this.burst(centerX(this.player)+facing*42,centerY(this.player),BOONS.maris.color,22,360);
    } else if (this.player.special === 'stoneBarrier') {
      this.stoneBarrierTime = 4 + this.boonStacks.gaia * .45;
      this.stoneBarrierHits = Math.min(5, 1 + Math.ceil(this.boonStacks.gaia / 2));
      this.stoneBarrierFacing = this.player.facing;
      this.stoneBarrierX = centerX(this.player) + this.player.facing * 76;
      this.stoneBarrierY = this.player.y + this.player.h;
      this.player.invulnerable = Math.max(this.player.invulnerable, .3);
      this.burst(centerX(this.player), centerY(this.player), BOONS.gaia.color, 30, 300);
      this.showToast(`STONE BARRIER · ${this.stoneBarrierHits} BLOCK${this.stoneBarrierHits === 1 ? '' : 'S'}`);
    } else if (this.player.special === 'reflectingGust') {
      let reflected = 0;
      for (const projectile of this.projectiles) if (projectile.owner === 'enemy' && Math.hypot(centerX(projectile)-centerX(this.player),centerY(projectile)-centerY(this.player)) < 430) {
        projectile.owner='player'; projectile.vx=-projectile.vx*1.2; projectile.vy=-projectile.vy*1.2; projectile.damage=34+this.boonStacks.zephyra*7; projectile.color=BOONS.zephyra.color; reflected+=1;
      }
      const targets = this.enemies.filter(enemy=>!enemy.dead);
      for (const enemy of targets) {
        const direction=Math.sign(centerX(enemy)-centerX(this.player))||this.player.facing;
        this.damageEnemy(enemy,10+this.effectiveBoonStacks('zephyra')*3,BOONS.zephyra.color);
        const bossFactor=this.isMajorType(enemy.type)?.32:1;
        enemy.vx=direction*(760+this.effectiveBoonStacks('zephyra')*55)*bossFactor;
        enemy.vy=Math.min(enemy.vy,-95*bossFactor);
        enemy.hitStun=Math.max(enemy.hitStun,.34);
      }
      this.gustEffects.push({x:centerX(this.player),y:centerY(this.player),life:.48,maxLife:.48,radius:520});
      this.burst(centerX(this.player),centerY(this.player),BOONS.zephyra.color,38,620);
      this.showToast(reflected ? `CROSSWIND BURST · ${targets.length} SHOVED · ${reflected} RETURNED` : `CROSSWIND BURST · ${targets.length} SHOVED`);
    } else if (this.player.special === 'vineLash') {
      const target=this.nearestEnemy(centerX(this.player),centerY(this.player));
      if(target){
        target.rootTime=Math.max(target.rootTime,(this.isMajorType(target.type)?1.8:3.8)+this.effectiveBoonStacks('flora')*.32);
        target.rootX=target.x;target.rootY=target.y;target.vx=0;target.vy=0;
        this.lightningEffects.push({x1:centerX(this.player),y1:centerY(this.player),x2:centerX(target),y2:target.y+target.h,color:BOONS.flora.color,life:.28,maxLife:.28});
        this.floatingText.push({x:centerX(target),y:target.y-10,text:'ROOTED',color:BOONS.flora.accentColor,life:.9,maxLife:.9,size:16});
        this.burst(centerX(target),target.y+target.h,BOONS.flora.color,30,280);
        this.showToast('THORN BIND · MOVEMENT SEALED, ATTACKS LIVE');
      } else this.showToast('THORN BIND · NO TARGET');
    } else if (this.player.special === 'chainBurst') {
      const living=this.enemies.filter(enemy=>!enemy.dead).sort((a,b)=>Math.hypot(centerX(a)-centerX(this.player),centerY(a)-centerY(this.player))-Math.hypot(centerX(b)-centerX(this.player),centerY(b)-centerY(this.player))).slice(0,Math.min(5,2+Math.floor(this.boonStacks.voltara/3)));
      let fromX=centerX(this.player),fromY=centerY(this.player);
      for(const target of living){const tx=centerX(target),ty=centerY(target);this.lightningEffects.push({x1:fromX,y1:fromY,x2:tx,y2:ty,life:.24,maxLife:.24,color:BOONS.voltara.color});this.damageEnemy(target,24+this.effectiveBoonStacks('voltara')*4.5,BOONS.voltara.color);target.hitStun=Math.max(target.hitStun,.22);fromX=tx;fromY=ty;}
      this.player.energy=Math.min(this.player.maxEnergy,this.player.energy+living.length);
      this.showToast(`ARC CHAIN · ${living.length} TARGET${living.length===1?'':'S'}`);
    } else if (this.player.special === 'freezeCone') {
      const duration=Math.min(5,3.4+this.effectiveBoonStacks('crya')*.28);
      for(const enemy of this.enemies) if(!enemy.dead){enemy.slowTime=Math.max(enemy.slowTime,duration);this.burst(centerX(enemy),centerY(enemy),BOONS.crya.accentColor,12,150);}
      this.burst(centerX(this.player),centerY(this.player),BOONS.crya.color,44,520);
      this.showToast(`WHITEOUT · ALL ENEMIES SLOWED ${duration.toFixed(1)}s`);
    } else if (this.player.special === 'dreamPulse') {
      this.lunaTurretTimer=Math.max(this.lunaTurretTimer,4.2+this.effectiveBoonStacks('luna')*.48);
      this.burst(centerX(this.player)-this.player.facing*54,this.player.y+22,BOONS.luna.color,38,420);
      this.showToast(`MOON ECHO · OPPOSITE-FIRE TURRET ${this.lunaTurretTimer.toFixed(1)}s`);
    } else if (this.player.special === 'lightColumn') {
      const target=this.enemies.filter(enemy=>!enemy.dead).sort((a,b)=>b.health-a.health)[0];
      if(target){const x=centerX(target),y=centerY(target);this.lightRayEffects.push({x,y,life:.48,maxLife:.48,radius:58+this.effectiveBoonStacks('solara')*4,color:BOONS.solara.color});this.damageEnemy(target,96+this.effectiveBoonStacks('solara')*15,BOONS.solara.color);this.impactBurst(x,y,95,18+this.effectiveBoonStacks('solara')*4,BOONS.solara.accentColor,target.id);this.showToast('RADIANT LANCE · STRONGEST TARGET');}
    } else if (this.player.special === 'rushState') {
      const target=this.belladonnaEdibleTarget()!;
      const heal=Math.min(this.player.maxHealth-this.player.health,8+this.effectiveBoonStacks('belladonna')*3.5);
      target.health=0;this.killEnemy(target);
      this.player.health+=heal;
      this.floatingText.push({x:centerX(target),y:target.y-18,text:'DEVOURED',color:BOONS.belladonna.accentColor,life:1,maxLife:1,size:20});
      this.floatingText.push({x:centerX(this.player),y:this.player.y-12,text:`+${Math.round(heal)} HP`,color:'#7dff9e',life:.9,maxLife:.9,size:16});
      this.burst(centerX(target),centerY(target),BOONS.belladonna.color,52,560);
      this.showToast(`DEVOUR · EXECUTE + ${Math.round(heal)} HEALTH`);
    } else if (this.player.special === 'charmNote') {
      const target=this.nearestEnemy(centerX(this.player),centerY(this.player));
      if(target){
        target.charmTime=Math.max(target.charmTime,(this.isMajorType(target.type)?1.65:3.4)+this.effectiveBoonStacks('nerissa')*.28);
        target.hitStun=0;
        this.floatingText.push({x:centerX(target),y:target.y-14,text:'CHARMED · +DAMAGE',color:BOONS.nerissa.accentColor,life:1,maxLife:1,size:16});
        this.lightningEffects.push({x1:centerX(this.player),y1:centerY(this.player),x2:centerX(target),y2:centerY(target),life:.3,maxLife:.3,color:BOONS.nerissa.color});
        this.burst(centerX(target),centerY(target),BOONS.nerissa.color,26,310);
        this.showToast('SIREN CALL · TARGET PACIFIED + EXPOSED');
      } else this.showToast('SIREN CALL · NO TARGET');
    } else if (this.player.special === 'pounceAura') {
      this.player.kickTime = .5;
      this.kickHits.clear();
      this.player.invulnerable = Math.max(this.player.invulnerable, .55);
      this.player.vx = this.player.facing * 560;
      this.burst(centerX(this.player), centerY(this.player), BOONS.roxyne.color, 18, 300);
    } else if (this.player.special === 'rouletteBurst') {
      const roll=this.runRng.next();
      const boonChance=Math.min(.01,.0035+this.effectiveBoonStacks('calyptra')*.00045);
      if(this.runRng.chance(boonChance)&&this.boonPickups.length===0){
        const id=this.runRng.pick(BOON_ORDER.filter(boonId=>boonId!==this.lastRewardBoon));
        this.boonPickups=[{x:clamp(centerX(this.player)+this.player.facing*95-30,70,WIDTH-130),y:Math.max(80,this.player.y-55),w:60,h:60,boonId:id,time:0}];
        this.showToast('IMPOSSIBLE ROLL · A BOON FELL OUT OF THE DECK');
        this.save.jackpots+=1;this.persistSave();
      } else if(roll<.25){
        const healed=Math.min(this.player.maxHealth-this.player.health,20+this.effectiveBoonStacks('calyptra')*3);this.player.health+=healed;this.showToast(`LOADED DICE · HEAL +${Math.round(healed)}`);
      } else if(roll<.5){
        const living=this.enemies.filter(enemy=>!enemy.dead);const target=living.length?this.runRng.pick(living):undefined;if(target){this.damageEnemy(target,48+this.effectiveBoonStacks('calyptra')*6,BOONS.calyptra.color);this.showToast('LOADED DICE · RANDOM ENEMY STRUCK');}else this.showToast('LOADED DICE · DAMAGE ROLL WHIFFED');
      } else if(roll<.75){
        const count=2+Math.min(4,Math.floor(this.effectiveBoonStacks('calyptra')));for(let i=0;i<count;i+=1)this.spawnPickup('shard',centerX(this.player)+(i-count/2)*18,this.player.y,1);this.showToast(`LOADED DICE · ${count} SHARDS`);
      } else {
        const pain=Math.min(this.player.health-1,Math.max(9,this.player.maxHealth*.12));this.player.health-=pain;this.roomDamageTaken+=pain;this.runMetrics.damageTaken+=pain;this.floatingText.push({x:centerX(this.player),y:this.player.y-10,text:`BACKFIRE -${Math.round(pain)}`,color:'#ff5269',life:.9,maxLife:.9,size:18});this.showToast(`LOADED DICE · BACKFIRE -${Math.round(pain)} HEALTH`);
      }
      this.burst(centerX(this.player),centerY(this.player),BOONS.calyptra.color,36,460);
    } else if (this.player.special === 'crystalEcho') {
      for(let i=-1;i<=1;i+=1)this.spawnPlayerProjectile(centerX(this.player)-this.player.facing*35,centerY(this.player)+i*18,this.player.facing*(650-Math.abs(i)*50),i*85,45+this.boonStacks.isolde*7,BOONS.isolde.color,11,1);
      this.burst(centerX(this.player)-this.player.facing*30,centerY(this.player),BOONS.isolde.color,28,330);
    } else if (this.player.special === 'illusionDecoy') {
      const originX=centerX(this.player)-this.player.facing*70,originY=centerY(this.player);
      const count=7+Math.min(4,Math.floor(this.effectiveBoonStacks('somnia')));const realIndex=this.runRng.int(0,count-1);
      for(let i=0;i<count;i+=1){const spread=(i-(count-1)/2)*.065;const angle=(this.player.facing>0?0:Math.PI)+spread;const radius=9;this.projectiles.push({id:this.entityId++,owner:'player',x:originX-radius,y:originY-radius,w:radius*2,h:radius*2,vx:Math.cos(angle)*610,vy:Math.sin(angle)*610,damage:i===realIndex?58+this.effectiveBoonStacks('somnia')*7:0,life:1.5,color:BOONS.somnia.color,radius,pierce:i===realIndex?1:0,bounces:0,homing:0,explosive:false,accentColor:BOONS.somnia.accentColor,illusory:i!==realIndex});}
      this.burst(originX,originY,BOONS.somnia.color,30,300);
      this.showToast(`VELVET FEINT · ${count-1} FALSE BOLTS · 1 REAL`);
    } else if (this.player.special === 'mirrorShield') {
      this.mirrorShieldTimer=1.5+this.boonStacks.vespera*.18; this.player.invulnerable=Math.max(this.player.invulnerable,this.mirrorShieldTimer); this.showToast('MIRROR SHIELD · RETURN FIRE'); this.burst(centerX(this.player),centerY(this.player),BOONS.vespera.color,32,380);
    } else if (this.player.special === 'extractionBurst') {
      const duration=Math.min(5,2.8+this.effectiveBoonStacks('aurelia')*.3);
      for(const enemy of this.enemies)if(!enemy.dead)enemy.blindTime=Math.max(enemy.blindTime,duration);
      this.showToast(`GILDED VEIL · ENEMY ATTACKS MISS FOR ${duration.toFixed(1)}s`);this.burst(centerX(this.player),centerY(this.player),BOONS.aurelia.color,44,560);
    } else if (this.player.special === 'damageBlink') {
      const from={x:centerX(this.player),y:centerY(this.player)};const distance=250+this.boonStacks.noctissa*18;this.player.x=clamp(this.player.x+this.player.facing*distance,0,WIDTH-this.player.w);this.player.invulnerable=Math.max(this.player.invulnerable,.48);
      const path:Rect={x:Math.min(from.x,centerX(this.player))-25,y:this.player.y-20,w:Math.abs(centerX(this.player)-from.x)+50,h:this.player.h+40};for(const enemy of this.enemies)if(!enemy.dead&&this.hitsEnemy(path,enemy))this.damageEnemy(enemy,46+this.boonStacks.noctissa*9,BOONS.noctissa.color);
      this.burst(from.x,from.y,BOONS.noctissa.color,22,300);this.burst(centerX(this.player),centerY(this.player),BOONS.noctissa.color,22,300);
    } else if (this.player.special === 'drainBurst') {
      const sacrifice=Math.max(8,this.player.maxHealth*.14);
      this.player.health=Math.max(1,this.player.health-sacrifice);
      this.roomDamageTaken+=sacrifice;this.runMetrics.damageTaken+=sacrifice;
      this.bloodPactRoomBonus=Math.min(.75,this.bloodPactRoomBonus+.22+this.effectiveBoonStacks('lilith')*.035);
      this.bloodPactAuraTimer=999;
      this.floatingText.push({x:centerX(this.player),y:this.player.y-12,text:`-${Math.round(sacrifice)} HP · +${Math.round(this.bloodPactRoomBonus*100)}% DMG`,color:BOONS.lilith.accentColor,life:1.2,maxLife:1.2,size:18});
      this.burst(centerX(this.player),centerY(this.player),BOONS.lilith.color,48,520);
      this.showToast(`BLOOD PACT · +${Math.round(this.bloodPactRoomBonus*100)}% DAMAGE THIS ROOM`);
    } else if (this.player.special === 'haloField') {
      this.player.shieldCharges = Math.min(5, 3 + Math.floor(this.boonStacks.seraphine / 2));
      this.showToast(`HALO FIELD · ${this.player.shieldCharges} HITS`);
      this.burst(centerX(this.player), this.player.y, BOONS.seraphine.color, 34, 460);
    }
    return true;
  }

  private spawnPlayerProjectile(x: number, y: number, vx: number, vy: number, damage: number, color: string, radius: number, pierce: number, homing = 0): void {
    this.projectiles.push({
      id: this.entityId++, owner: 'player', x: x - radius, y: y - radius, w: radius * 2, h: radius * 2,
      vx, vy, damage, life: 1.6, color, radius, pierce, bounces: 0, homing, explosive: false,
    });
  }

  private getSpecialCost(id: SpecialId): number {
    const definition = BOON_ORDER.map((boonId) => BOONS[boonId]).find((boon) => boon.special === id);
    const lunaDiscount = Math.min(.5, this.boonStacks.luna * .08);
    const eclipseDiscount=this.hasBoonPair('luna','solara') ? .12 : 0;
    return Math.ceil((definition?.specialEnergyCost ?? 25) * Math.max(.45, 1 - this.save.upgrades.ritual * .04 - lunaDiscount-eclipseDiscount));
  }

  private updateSeraphinePassive(dt:number):void {
    if(this.boonStacks.seraphine<=0)return;
    const power=this.effectiveBoonStacks('seraphine');
    const maxCharges=seraphineMaximumShieldCharges(this.boonStacks.seraphine);
    if(this.player.shieldCharges<maxCharges){
      this.seraphineShieldRegenTimer-=dt;
      if(this.seraphineShieldRegenTimer<=0){this.player.shieldCharges+=1;this.seraphineShieldRegenTimer=Math.max(3.2,8-power*.38);this.burst(centerX(this.player),centerY(this.player),BOONS.seraphine.color,12,180);}
    }else this.seraphineShieldRegenTimer=Math.max(this.seraphineShieldRegenTimer,1.2);
    this.seraphineFragmentTimer-=dt;
    if(this.seraphineFragmentTimer>0)return;
    this.seraphineFragmentTimer=Math.max(.72,2.4-power*.13);
    const target=this.nearestEnemy(centerX(this.player),centerY(this.player));if(!target)return;
    const angle=Math.atan2(centerY(target)-centerY(this.player),centerX(target)-centerX(this.player));const radius=6;const speed=690;
    this.projectiles.push({id:this.entityId++,owner:'player',x:centerX(this.player)-radius,y:centerY(this.player)-radius,w:radius*2,h:radius*2,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,damage:8+power*3,life:1.5,color:BOONS.seraphine.color,radius,pierce:0,bounces:0,homing:.45,explosive:false,accentColor:BOONS.seraphine.accentColor,primaryBoon:'seraphine',attachedBoons:[]});
  }

  private updateEnemies(dt: number): void {
    const threat = this.currentThreat();
    for (const enemy of this.enemies) {
      if (enemy.dead) { enemy.deathTime = Math.max(0, enemy.deathTime - dt); continue; }
      if (this.worldFreezeTimer > 0) continue;
      enemy.slowTime = Math.max(0, enemy.slowTime - dt);
      enemy.rootTime = Math.max(0, enemy.rootTime - dt);
      enemy.charmTime = Math.max(0, enemy.charmTime - dt);
      enemy.blindTime = Math.max(0, enemy.blindTime - dt);
      enemy.frozenTime = Math.max(0,(enemy.frozenTime??0)-dt);
      if (enemy.slowTime > 0) {
        enemy.vx *= Math.pow(.12, dt);
        enemy.attackTimer += dt * .48;
      }
      enemy.timer += dt;
      enemy.attackTimer -= dt * threat.cadence * (enemy.eliteModifier === 'frenzied' || enemy.deepDivePowers?.includes('frenzied') ? 1.65 : 1);
      enemy.invulnerable = Math.max(0, enemy.invulnerable - dt);
      enemy.hitStun = Math.max(0, enemy.hitStun - dt);
      enemy.attackPoseTime = Math.max(0, enemy.attackPoseTime - dt);
      if(enemy.deepDivePowers?.includes('summoner')){
        enemy.deepDiveSummonTimer=(enemy.deepDiveSummonTimer??4.8)-dt;
        if(enemy.deepDiveSummonTimer<=0&&this.enemies.filter(target=>!target.dead).length<18){
          const ecosystems:Record<number,EnemyType[]>={1:['imp','floater','succubus','hellhound','crawler','siren'],2:['drownedFan','chorusWisp','courtCantor','reefHound','bubbleCrab','spotlightDancer'],3:['thornStalker','sporeMaw','vineLurker','razorBoar','rootMaw','thornArcher'],4:['jackpotGremlin','cardDealer','diceHound','railWisp','slotMimic','jinxCroupier'],5:['icePenitent','choirShard','reliquaryKnight','frostHound','glassDeacon','preservationWisp'],6:['luggageImp','sleepwalker','keyholeWisp','bellhopMimic','hallwayHound','wakeUpCaller'],7:['mirrorPunk','prismWisp','facelessStriker','glassHound','echoSniper','reflectionKnight'],8:['throneLegionary','charmAcolyte','portalHound','bloodCantor','decreeWisp','hollowSuccubus'],9:['hollowShade','reflectionKnight','wakeUpCaller','glassDeacon','thornArcher','portalHound']};
          const foreignDepth=this.currentDepth%9+1;const type=this.runRng.pick(ecosystems[foreignDepth]);const x=centerX(enemy)<WIDTH/2?WIDTH-210:150;
          const reinforcement=this.createEnemy(type,x,FLOOR_Y-ENEMY_BODIES[type].h);this.applyCurrentThreat(reinforcement);reinforcement.maxHealth*=1+.08*(this.room.deepDiveCycle??1);reinforcement.health=reinforcement.maxHealth;this.enemies.push(reinforcement);
          enemy.deepDiveSummonTimer=Math.max(3.1,6.2-(this.room.deepDiveCycle??1)*.18);this.showToast('DEEP DIVE · SUMMONER POWER · FOREIGN ECOSYSTEM');
        }
      }
      if (enemy.dotTime > 0) {
        enemy.dotTime -= dt;
        enemy.dotTick -= dt;
        if (enemy.dotTick <= 0) {
          enemy.dotTick = .42;
          const nerissaShielded = enemy.type === 'nerissa' && this.enemies.some(other => !other.dead && other.type === 'chantPillar');
          const dreamGirlShielded = enemy.type === 'dreamGirl' && this.enemies.some(other => !other.dead && other.type === 'fantasyAnchor');
          if (!nerissaShielded && !dreamGirlShielded) {
            enemy.health -= enemy.dotDamage;
            this.floatingText.push({ x: centerX(enemy), y: enemy.y + 8, text: `${Math.round(enemy.dotDamage)} ${enemy.dotLabel}`, color: enemy.dotColor, life: .45, maxLife: .45, size: 12 });
            this.burst(centerX(enemy), centerY(enemy), '#ff3f55', 4, 100);
            if (enemy.health <= 0) { this.killEnemy(enemy); continue; }
          }
        }
      }
      enemy.facing = centerX(this.player) >= centerX(enemy) ? 1 : -1;

      if (enemy.type === 'dummy') continue;
      const healthRatio = enemy.health / enemy.maxHealth;
      if (enemy.type === 'brute' && healthRatio < .66 && (enemy.milestones & 1) === 0) {
        enemy.milestones |= 1; enemy.invulnerable = .55;
        this.enemies.push(this.createEnemy('floater', clamp(enemy.x - 250, 120, 1080), 390));
        this.enemies.push(this.createEnemy('succubus', clamp(enemy.x + 250, 120, 1080), 530));
        for (const platform of this.room.platforms.filter(platform => platform.h <= 25 && platform.y < FLOOR_Y - 30)) platform.y = clamp(platform.y + (platform.x < WIDTH / 2 ? -34 : 34), 225, 570);
        this.spawnBossHazard('pour', 250, FLOOR_Y - 22, 300, 22, 3.2, .72, 14, '#58e3d0',enemy.blindTime>0);
        this.showToast('BOTTOMLESS BARTENDER · LAST CALL'); this.screenFlash = .45;
      }
      if (enemy.type === 'brute' && healthRatio < .32 && (enemy.milestones & 2) === 0) {
        enemy.milestones |= 2;
        for (let i = 0; i < 12; i += 1) this.enemyShootAngle(enemy, i / 12 * Math.PI * 2, 350, 13, '#ffc75a', 10);
        this.showToast('BOTTOMLESS BARTENDER · THE TAB DOUBLES'); this.shake = 12;
      }
      if (enemy.type === 'warden' && healthRatio < .72 && (enemy.milestones & 1) === 0) {
        enemy.milestones |= 1; enemy.invulnerable = .7;
        this.enemies.push(this.createEnemy('siren', 180, 535), this.createEnemy('siren', 1040, 535));
        this.showToast('BELLADONNA · THE CROWD IS HUNGRY'); this.screenFlash = .65;
      }
      if (enemy.type === 'warden' && healthRatio < .38 && (enemy.milestones & 2) === 0) {
        enemy.milestones |= 2;
        for (let x = 150; x <= 1130; x += 140) this.projectiles.push({ id: this.entityId++, owner: 'enemy', x: x - 10, y: -30, w: 20, h: 20, vx: 0, vy: 330, damage: this.scaledEnemyDamage(14), life: 3, color: '#ff345e', radius: 10, pierce: 0, bounces: 0, homing: 0, explosive: false, missesPlayer:enemy.blindTime>0 });
        this.showToast("BELLADONNA · THE MAW OPENS"); this.shake = 14;
      }
      if (enemy.type === 'nerissa' && healthRatio < .55 && (enemy.milestones & 1) === 0) {
        enemy.milestones |= 1; enemy.invulnerable = .7; enemy.phase = 2;
        for (const x of [245,613,985]) {
          const pillar=this.createEnemy('chantPillar',x,FLOOR_Y-150);
          this.applyCurrentThreat(pillar);
          this.enemies.push(pillar);
        }
        this.nerissaShieldAnnounced = true;
        this.showToast('NERISSA · BREAK THE THREE CHANT PILLARS');
        this.screenFlash = .7; this.shake = 12;
      }
      if (enemy.type === 'nerissa' && healthRatio < .24 && (enemy.milestones & 2) === 0) {
        enemy.milestones |= 2;
        for (let i=0;i<8;i+=1) this.spawnSongNote(enemy,(i-3.5)*.18);
        this.showToast('NERISSA · DEMON LORD ENCORE');
        this.screenFlash = .65; this.shake = 14;
      }
      if (enemy.type === 'roxyne' && healthRatio < .62 && (enemy.milestones & 1) === 0) {
        enemy.milestones |= 1; enemy.phase = 1;
        this.showToast('ROXYNE · PREDATOR\'S MARK · KEEP MOVING');
        this.screenFlash = .55; this.shake = 10;
      }
      if (enemy.type === 'roxyne' && healthRatio < .3 && (enemy.milestones & 2) === 0) {
        enemy.milestones |= 2; enemy.phase = 2;
        this.showToast('ROXYNE · KILLING CANOPY COLLAPSES');
        this.screenFlash = .7; this.shake = 14;
      }

      if (enemy.hitStun > 0) {
        enemy.vx *= Math.pow(.08, dt);
        if (enemy.type !== 'floater' && enemy.type !== 'succubus' && enemy.type !== 'chorusWisp' && enemy.type !== 'choirShard' && enemy.type !== 'preservationWisp' && enemy.type !== 'keyholeWisp' && enemy.type !== 'prismWisp' && enemy.type !== 'decreeWisp' && enemy.type !== 'hollowShade' && enemy.type !== 'chantPillar' && enemy.type !== 'fantasyAnchor') {
          enemy.vy = Math.min(900, enemy.vy + GRAVITY * dt);
          this.moveWithPlatforms(enemy, dt, true);
        }
        if(enemy.rootTime>0){enemy.x=enemy.rootX;enemy.y=enemy.rootY;enemy.vx=0;enemy.vy=0;}
        enemy.x=clamp(enemy.x,0,WIDTH-enemy.w);
        continue;
      }

      if(enemy.charmTime>0){
        enemy.attackTimer=Math.max(enemy.attackTimer,.3);
        if(enemy.rootTime<=0){
          if(enemy.type==='floater'||enemy.type==='chorusWisp'||enemy.type==='choirShard'||enemy.type==='preservationWisp'||enemy.type==='keyholeWisp'||enemy.type==='prismWisp'||enemy.type==='decreeWisp'||enemy.type==='hollowShade'){
            enemy.x+=(centerX(this.player)>centerX(enemy)?1:-1)*48*dt;
            enemy.y+=(this.player.y-95-enemy.y)*dt*.7;
          }else{
            enemy.vx+=(centerX(this.player)>centerX(enemy)?1:-1)*360*dt;
            enemy.vx=clamp(enemy.vx,-82,82);
            enemy.vy=Math.min(900,enemy.vy+GRAVITY*dt);
            this.moveWithPlatforms(enemy,dt,true);
          }
        }else{enemy.x=enemy.rootX;enemy.y=enemy.rootY;enemy.vx=0;enemy.vy=0;}
        enemy.x=clamp(enemy.x,0,WIDTH-enemy.w);
        continue;
      }

      const nearbyCourt = this.enemies.filter(other => other.id !== enemy.id && !other.dead && ['drownedFan','chorusWisp','courtCantor','reefHound','bubbleCrab','spotlightDancer'].includes(other.type) && Math.hypot(centerX(other)-centerX(enemy),centerY(other)-centerY(enemy)) < 230).length;
      const courtBuff = 1 + Math.min(.32,nearbyCourt*.08);
      if (enemy.type === 'chantPillar') {
        enemy.vx=0; enemy.vy=0; enemy.grounded=true;
        if (enemy.attackTimer <= 0) {
          this.spawnSongNote(enemy,(enemy.id%3-1)*.24);
          enemy.attackPoseTime=.34; enemy.attackTimer=2.4;
        }
      } else if (enemy.type === 'drownedFan') {
        enemy.vx += enemy.facing * 580 * courtBuff * dt;
        enemy.vx = clamp(enemy.vx,-125*courtBuff,125*courtBuff);
        if (enemy.grounded && enemy.attackTimer <= 0) { enemy.vy=-500; enemy.attackTimer=1.45+this.runRng.next()*.8; enemy.attackPoseTime=.3; }
        enemy.vy=Math.min(900,enemy.vy+GRAVITY*dt); this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'chorusWisp') {
        const targetY=this.player.y-125+Math.sin(enemy.timer*2.8+enemy.id)*55;
        enemy.x+=enemy.facing*38*courtBuff*dt; enemy.y+=(targetY-enemy.y)*dt*.8;
        if(enemy.attackTimer<=0){this.spawnSongNote(enemy);enemy.attackPoseTime=.36;enemy.attackTimer=1.55+this.runRng.next()*.5;}
      } else if (enemy.type === 'courtCantor') {
        enemy.vx*=Math.pow(.1,dt); enemy.vy=Math.min(900,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){for(const spread of [-.22,0,.22])this.enemyShoot(enemy,360,12,'#45e7ef',spread);enemy.attackPoseTime=.42;enemy.attackTimer=1.65;}
      } else if (enemy.type === 'reefHound') {
        if(enemy.attackTimer<=0){enemy.vx=enemy.facing*520*courtBuff;enemy.vy=-180;enemy.attackPoseTime=.42;enemy.attackTimer=1.75+this.runRng.next()*.45;}
        else{enemy.vx+=enemy.facing*720*courtBuff*dt;enemy.vx=clamp(enemy.vx,-185*courtBuff,185*courtBuff);}
        enemy.vy=Math.min(950,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'bubbleCrab') {
        if(enemy.attackTimer<=0){enemy.vx=enemy.facing*390;for(const spread of [-.3,0,.3])this.enemyShoot(enemy,300,13,'#46dfe8',spread);enemy.attackPoseTime=.48;enemy.attackTimer=2.15;}
        else{enemy.vx+=enemy.facing*330*dt;enemy.vx=clamp(enemy.vx,-95,95);}
        enemy.vy=Math.min(950,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'spotlightDancer') {
        if(enemy.attackTimer<=0){enemy.vx=enemy.facing*690*courtBuff;enemy.vy=-230;enemy.attackPoseTime=.45;enemy.attackTimer=1.45+this.runRng.next()*.35;}
        else{enemy.vx+=enemy.facing*920*courtBuff*dt;enemy.vx=clamp(enemy.vx,-225*courtBuff,225*courtBuff);}
        enemy.vy=Math.min(980,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'fanChampion') {
        if(enemy.attackTimer<=0){enemy.attackCount+=1;if(enemy.attackCount%2===0){for(const spread of [-.34,-.17,0,.17,.34])this.enemyShoot(enemy,380,14,'#43edf2',spread);this.spawnBossHazard('crowd',centerX(this.player)<WIDTH/2?40:WIDTH-430,FLOOR_Y-115,390,115,1.9,.7,17,'#43edf2',enemy.blindTime>0);}else{enemy.vx=enemy.facing*590;enemy.vy=-190;}enemy.attackPoseTime=.5;enemy.attackTimer=1.55;}
        else{enemy.vx+=enemy.facing*300*dt;enemy.vx=clamp(enemy.vx,-130,130);}
        enemy.vy=Math.min(950,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'nerissa') {
        const pillars=this.enemies.filter(other=>!other.dead&&other.type==='chantPillar').length;
        if (pillars > 0) enemy.invulnerable = Math.max(enemy.invulnerable,.12);
        else if (this.nerissaShieldAnnounced) {
          this.nerissaShieldAnnounced=false; enemy.invulnerable=0;
          this.showToast('CHANT SHIELD BROKEN · NERISSA VULNERABLE');
          this.burst(centerX(enemy),centerY(enemy),'#b9ffff',36,480);
        }
        enemy.phase=healthRatio<.55?2:healthRatio<.78?1:0;
        enemy.vx+=enemy.facing*(90+enemy.phase*25)*dt;enemy.vx=clamp(enemy.vx,-80-enemy.phase*15,80+enemy.phase*15);
        enemy.vy=Math.min(900,enemy.vy+GRAVITY*dt);
        if(enemy.attackTimer<=0){enemy.attackCount+=1;if(enemy.attackCount%3===1){const shots=3+enemy.phase+pillars;for(let i=0;i<shots;i+=1)this.spawnSongNote(enemy,(i-(shots-1)/2)*.16);this.showToast('HOMING SONG · SHOOT THE NOTES');}else if(enemy.attackCount%3===2){const lane=centerX(this.player)<WIDTH/2?45:WIDTH-465;this.spawnBossHazard('crowd',lane,FLOOR_Y-145,420,145,2.05,.72,18,'#31dbe8',enemy.blindTime>0);this.showToast('CROWD SURGE · CHANGE LANES');}else{const gap=centerX(this.player)<WIDTH/2?760:130;this.spawnBossHazard('spotlight',gap,70,390,580,2.2,.78,19,'#b7ffff',enemy.blindTime>0);this.showToast('SPOTLIGHT · FIND THE DARK GAP');}enemy.attackPoseTime=.5;enemy.attackTimer=Math.max(.72,1.6-enemy.phase*.18-pillars*.08);}
        this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'jackpotGremlin') {
        enemy.vx += enemy.facing * 720 * dt; enemy.vx = clamp(enemy.vx,-165,165);
        if (enemy.grounded && enemy.attackTimer <= 0) { enemy.vx=enemy.facing*520; enemy.vy=-520; enemy.attackPoseTime=.4; enemy.attackTimer=1.2+this.runRng.next()*.45; }
        enemy.vy=Math.min(980,enemy.vy+GRAVITY*dt); this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'cardDealer') {
        enemy.vx*=Math.pow(.14,dt); enemy.vy=Math.min(940,enemy.vy+GRAVITY*dt); this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){for(const spread of [-.3,-.15,0,.15,.3])this.enemyShoot(enemy,425,15,'#ff7cf4',spread);enemy.attackPoseTime=.48;enemy.attackTimer=1.55+this.runRng.next()*.35;}
      } else if (enemy.type === 'diceHound') {
        if(enemy.attackTimer<=0){enemy.vx=enemy.facing*720;enemy.vy=-220;enemy.attackPoseTime=.5;enemy.attackTimer=1.55+this.runRng.next()*.35;}else{enemy.vx+=enemy.facing*780*dt;enemy.vx=clamp(enemy.vx,-220,220);}
        enemy.vy=Math.min(980,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'railWisp') {
        const targetY=this.player.y-140+Math.sin(enemy.timer*3.1+enemy.id)*48;
        enemy.x+=enemy.facing*55*dt;enemy.y+=(targetY-enemy.y)*dt*.85;
        if(enemy.attackTimer<=0){for(const spread of [-.16,.16])this.enemyShoot(enemy,440,14,'#ffe65d',spread);enemy.attackPoseTime=.42;enemy.attackTimer=1.45+this.runRng.next()*.4;}
      } else if (enemy.type === 'slotMimic') {
        enemy.vx+=enemy.facing*260*dt;enemy.vx=clamp(enemy.vx,-76,76);enemy.vy=Math.min(950,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){for(let shot=0;shot<8;shot+=1)this.enemyShootAngle(enemy,shot/8*Math.PI*2,330,17,'#ffc54d',10);enemy.attackPoseTime=.58;enemy.attackTimer=2.2;}
      } else if (enemy.type === 'jinxCroupier') {
        enemy.vx+=enemy.facing*280*dt;enemy.vx=clamp(enemy.vx,-72,72);enemy.vy=Math.min(930,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){for(const spread of [-.18,.18]){this.enemyShoot(enemy,250,15,'#bd70ff',spread);const orb=this.projectiles[this.projectiles.length-1];if(orb)orb.homing=Math.max(orb.homing,.58);}enemy.attackPoseTime=.5;enemy.attackTimer=1.85;}
      } else if (enemy.type === 'ladyLuckless') {
        if(healthRatio<.66&&(enemy.milestones&1)===0){enemy.milestones|=1;enemy.phase=1;enemy.invulnerable=.72;this.showToast('LADY LUCKLESS · RULE CHANGE 2 · RED CARDS RUSH FASTER');this.screenFlash=.48;}
        if(healthRatio<.33&&(enemy.milestones&2)===0){enemy.milestones|=2;enemy.phase=2;enemy.invulnerable=.72;this.showToast('LADY LUCKLESS · RULE CHANGE 3 · JINX ORBS NOW HOME');this.screenFlash=.58;}
        enemy.vx+=enemy.facing*(110+enemy.phase*28)*dt;enemy.vx=clamp(enemy.vx,-92-enemy.phase*18,92+enemy.phase*18);enemy.vy=Math.min(950,enemy.vy+GRAVITY*dt);
        if(enemy.attackTimer<=0){enemy.attackCount+=1;if(enemy.attackCount%2===1){const shots=5+enemy.phase*2;for(let shot=0;shot<shots;shot+=1)this.enemyShoot(enemy,420+enemy.phase*55,16+enemy.phase,'#ff6ddd',(shot-(shots-1)/2)*.14);this.showToast(`DISCLOSED RULE ${enemy.phase+1} · CARD FAN`);}else{const shots=2+enemy.phase;for(let shot=0;shot<shots;shot+=1){this.enemyShoot(enemy,235+enemy.phase*20,15+enemy.phase,'#9f69ff',(shot-(shots-1)/2)*.22);const orb=this.projectiles[this.projectiles.length-1];if(orb)orb.homing=Math.max(orb.homing,.35+enemy.phase*.18);}this.showToast(`DISCLOSED RULE ${enemy.phase+1} · SLOW JINX ORBS`);}enemy.attackPoseTime=.55;enemy.attackTimer=Math.max(.75,1.55-enemy.phase*.18);}
        this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'calyptraBoss') {
        if(healthRatio<.62&&(enemy.milestones&1)===0){enemy.milestones|=1;enemy.phase=1;enemy.invulnerable=.82;this.showToast('CALYPTRA · PHASE 2 · THE POINTER CHAINS TWO SPINS');this.screenFlash=.68;this.shake=11;}
        if(healthRatio<.3&&(enemy.milestones&2)===0){enemy.milestones|=2;enemy.phase=2;enemy.invulnerable=.82;this.showToast('CALYPTRA · JACKPOT PHASE · FASTER DOUBLE SPINS');this.screenFlash=.78;this.shake=14;}
        enemy.vx+=enemy.facing*(105+enemy.phase*32)*dt;enemy.vx=clamp(enemy.vx,-85-enemy.phase*20,85+enemy.phase*20);enemy.vy=Math.min(950,enemy.vy+GRAVITY*dt);
        if(enemy.attackTimer<=0){enemy.attackCount+=1;const pattern=(enemy.attackCount-1)%3;this.spawnCalyptraPattern(enemy,pattern);if(enemy.phase>=1)this.spawnCalyptraPattern(enemy,(pattern+1+(enemy.attackCount%2))%3);if(enemy.attackCount%4===0){const x=centerX(this.player)<WIDTH/2?150:WIDTH-330;this.spawnBossHazard('wagerCircle',x,FLOOR_Y-105,180,105,1.75,.95,0,'#ffe45e',false);this.showToast('OPTIONAL SIDE BET · ENTER THE GOLD CIRCLE AND HOLD THROUGH RESOLVE');}enemy.attackPoseTime=.6;enemy.attackTimer=Math.max(.72,1.65-enemy.phase*.24);}
        this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'icePenitent') {
        enemy.vx+=enemy.facing*620*dt;enemy.vx=clamp(enemy.vx,-175,175);
        if(enemy.attackTimer<=0){enemy.vx=enemy.facing*610;enemy.vy=-145;enemy.attackPoseTime=.46;enemy.attackTimer=1.35+this.runRng.next()*.4;}
        enemy.vy=Math.min(960,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'choirShard') {
        const targetY=this.player.y-155+Math.sin(enemy.timer*3.25+enemy.id)*50;enemy.x+=enemy.facing*48*dt;enemy.y+=(targetY-enemy.y)*dt*.82;
        if(enemy.attackTimer<=0){for(const spread of [-.2,0,.2])this.enemyShoot(enemy,390,15,'#baf6ff',spread);enemy.attackPoseTime=.44;enemy.attackTimer=1.5+this.runRng.next()*.35;}
      } else if (enemy.type === 'reliquaryKnight') {
        enemy.vx+=enemy.facing*270*dt;enemy.vx=clamp(enemy.vx,-78,78);enemy.vy=Math.min(940,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){const x=clamp(centerX(this.player)-75,65,WIDTH-215);this.spawnBossHazard('crystalDelay',x,FLOOR_Y-130,150,130,1.8,1.05,18,'#9aeaff',enemy.blindTime>0);enemy.attackPoseTime=.55;enemy.attackTimer=2.05;}
      } else if (enemy.type === 'frostHound') {
        if(enemy.attackTimer<=0){enemy.vx=enemy.facing*760;enemy.vy=-190;enemy.attackPoseTime=.5;enemy.attackTimer=1.5+this.runRng.next()*.35;}else{enemy.vx+=enemy.facing*760*dt;enemy.vx=clamp(enemy.vx,-225,225);}
        enemy.vy=Math.min(980,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'glassDeacon') {
        enemy.vx*=Math.pow(.14,dt);enemy.vy=Math.min(930,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){const target=clamp(centerX(this.player)-90,70,WIDTH-250);this.spawnBossHazard('crystalDelay',target,FLOOR_Y-170,180,170,2.05,1.15,19,'#8ce9ff',enemy.blindTime>0);enemy.attackPoseTime=.58;enemy.attackTimer=2.15;}
      } else if (enemy.type === 'preservationWisp') {
        const targetY=this.player.y-120+Math.sin(enemy.timer*2.7+enemy.id)*60;enemy.x+=enemy.facing*42*dt;enemy.y+=(targetY-enemy.y)*dt*.72;
        if(enemy.attackTimer<=0){for(const spread of [-.16,.16]){this.enemyShoot(enemy,275,16,'#e2fbff',spread);const shard=this.projectiles[this.projectiles.length-1];if(shard)shard.homing=Math.max(shard.homing,.42);}enemy.attackPoseTime=.45;enemy.attackTimer=1.75;}
      } else if (enemy.type === 'memoryGolem') {
        if(healthRatio<.62&&(enemy.milestones&1)===0){enemy.milestones|=1;enemy.phase=1;enemy.invulnerable=.72;this.showToast('MEMORY GOLEM · SECOND RECOLLECTION · ATTACKS REPEAT');this.screenFlash=.5;}
        if(healthRatio<.3&&(enemy.milestones&2)===0){enemy.milestones|=2;enemy.phase=2;enemy.invulnerable=.72;this.showToast('MEMORY GOLEM · FINAL RECOLLECTION · DELAYS SHORTEN');this.screenFlash=.65;this.shake=11;}
        enemy.vx+=enemy.facing*(120+enemy.phase*30)*dt;enemy.vx=clamp(enemy.vx,-95-enemy.phase*15,95+enemy.phase*15);enemy.vy=Math.min(950,enemy.vy+GRAVITY*dt);
        if(enemy.attackTimer<=0){enemy.attackCount+=1;const target=clamp(centerX(this.player)-100,65,WIDTH-265);if(enemy.attackCount%3===1){this.spawnBossHazard('crystalDelay',target,FLOOR_Y-175,200,175,1.85-enemy.phase*.12,1.05-enemy.phase*.12,21+enemy.phase*2,'#9cecff',enemy.blindTime>0);this.showToast('MEMORY GOLEM · STORED CRYSTAL · DELAY DISCLOSED');}else if(enemy.attackCount%3===2){const safe=centerX(this.player)<WIDTH/2?760:110;for(const x of [70,340,610,880])if(Math.abs(x-safe)>160)this.spawnBossHazard('memoryShatter',x,FLOOR_Y-145,220,145,1.8,.92-enemy.phase*.1,20+enemy.phase*2,'#d7f8ff',enemy.blindTime>0);this.showToast('MEMORY GOLEM · RECALLED FLOOR SHATTER');}else{const shots=5+enemy.phase*2;for(let shot=0;shot<shots;shot+=1)this.enemyShoot(enemy,410+enemy.phase*30,16+enemy.phase,'#c5f5ff',(shot-(shots-1)/2)*.14);this.showToast('MEMORY GOLEM · REMEMBERED SHARD FAN');}if(enemy.phase>=1&&enemy.attackCount%2===0)this.spawnBossHazard('crystalDelay',WIDTH-target-200,FLOOR_Y-120,200,120,1.7,.82,18,'#8de8ff',enemy.blindTime>0);enemy.attackPoseTime=.58;enemy.attackTimer=Math.max(.76,1.62-enemy.phase*.2);}
        this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'isoldeBoss') {
        if(healthRatio<.64&&(enemy.milestones&1)===0){enemy.milestones|=1;enemy.phase=1;enemy.invulnerable=.82;this.showToast('ISOLDE · PRESERVATION PHASE 2 · MEMORIES OVERLAP');this.screenFlash=.7;this.shake=12;}
        if(healthRatio<.31&&(enemy.milestones&2)===0){enemy.milestones|=2;enemy.phase=2;enemy.invulnerable=.82;this.showToast('ISOLDE · DEMON LORD UNSEALED · THE BASILICA SHATTERS');this.screenFlash=.82;this.shake=15;const left=this.createEnemy('preservationWisp',155,390),right=this.createEnemy('preservationWisp',1040,390);this.applyCurrentThreat(left);this.applyCurrentThreat(right);this.enemies.push(left,right);}
        enemy.vx+=enemy.facing*(100+enemy.phase*30)*dt;enemy.vx=clamp(enemy.vx,-82-enemy.phase*18,82+enemy.phase*18);enemy.vy=Math.min(950,enemy.vy+GRAVITY*dt);
        if(enemy.attackTimer<=0){enemy.attackCount+=1;const pattern=(enemy.attackCount-1)%3;this.spawnIsoldePattern(enemy,pattern);if(enemy.phase>=1)this.spawnIsoldePattern(enemy,(pattern+1+(enemy.attackCount%2))%3);enemy.attackPoseTime=.64;enemy.attackTimer=Math.max(.74,1.72-enemy.phase*.23);}
        this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'luggageImp') {
        enemy.vx+=enemy.facing*720*dt;enemy.vx=clamp(enemy.vx,-185,185);
        if(enemy.grounded&&enemy.attackTimer<=0){enemy.vx=enemy.facing*590;enemy.vy=-440;enemy.attackPoseTime=.45;enemy.attackTimer=1.2+this.runRng.next()*.45;}
        enemy.vy=Math.min(980,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'sleepwalker') {
        enemy.vx+=enemy.facing*210*dt;enemy.vx=clamp(enemy.vx,-66,66);enemy.vy=Math.min(940,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){for(const spread of [-.24,0,.24])this.enemyShoot(enemy,305,17,'#e6b7ff',spread);enemy.attackPoseTime=.52;enemy.attackTimer=1.7+this.runRng.next()*.4;}
      } else if (enemy.type === 'keyholeWisp') {
        const targetY=this.player.y-145+Math.sin(enemy.timer*2.5+enemy.id)*62;enemy.x+=enemy.facing*46*dt;enemy.y+=(targetY-enemy.y)*dt*.76;
        if(enemy.attackTimer<=0){this.enemyShoot(enemy,285,17,'#d6a0ff');const shot=this.projectiles[this.projectiles.length-1];if(shot)shot.homing=Math.max(shot.homing,.48);enemy.attackPoseTime=.46;enemy.attackTimer=1.62+this.runRng.next()*.38;}
      } else if (enemy.type === 'bellhopMimic') {
        enemy.vx+=enemy.facing*245*dt;enemy.vx=clamp(enemy.vx,-72,72);enemy.vy=Math.min(960,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){const x=clamp(centerX(this.player)-105,55,WIDTH-265);this.spawnBossHazard('falseWake',x,FLOOR_Y-150,210,150,1.85,.92,20,'#ff9edc',enemy.blindTime>0);enemy.attackPoseTime=.58;enemy.attackTimer=2.1;}
      } else if (enemy.type === 'hallwayHound') {
        if(enemy.attackTimer<=0){enemy.vx=enemy.facing*810;enemy.vy=-165;enemy.attackPoseTime=.5;enemy.attackTimer=1.45+this.runRng.next()*.4;}else{enemy.vx+=enemy.facing*820*dt;enemy.vx=clamp(enemy.vx,-235,235);}
        enemy.vy=Math.min(990,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'wakeUpCaller') {
        enemy.vx*=Math.pow(.12,dt);enemy.vy=Math.min(940,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){const realLane=centerX(this.player)<WIDTH/2?180:820;for(const x of [80,380,680,980])this.spawnBossHazard(Math.abs(x-realLane)<170?'dreamEcho':'dreamEchoFake',x,FLOOR_Y-160,220,160,1.72,.86,19,'#d6a0ff',enemy.blindTime>0);enemy.attackPoseTime=.58;enemy.attackTimer=2.2;this.showToast('WAKE-UP CALL · ONE SOLID SHADOW');}
      } else if (enemy.type === 'fantasyAnchor') {
        enemy.vx=0;enemy.vy=0;enemy.grounded=true;
        if(enemy.attackTimer<=0){for(let shot=0;shot<4;shot+=1)this.enemyShootAngle(enemy,shot*Math.PI/2+Math.PI/4,285,15,'#ffd8f5',8);enemy.attackPoseTime=.48;enemy.attackTimer=2.3+this.runRng.next()*.35;}
      } else if (enemy.type === 'dreamGirl') {
        const anchors=this.enemies.filter(target=>!target.dead&&target.type==='fantasyAnchor').length;enemy.phase=4-anchors;enemy.vx+=enemy.facing*(72+enemy.phase*14)*dt;enemy.vx=clamp(enemy.vx,-66-enemy.phase*8,66+enemy.phase*8);enemy.vy=Math.min(950,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){enemy.attackCount+=1;if(enemy.attackCount%2===0){for(const spread of [-.32,-.16,0,.16,.32])this.enemyShoot(enemy,375+enemy.phase*18,17,'#ffc4ed',spread);this.showToast('DREAM GIRL · SWEET NOTHING VOLLEY');}else{const real=Math.floor(this.runRng.next()*4);for(let lane=0;lane<4;lane+=1)this.spawnBossHazard(lane===real?'dreamEcho':'dreamEchoFake',60+lane*300,FLOOR_Y-175,260,175,1.78,.9,21,'#d6a0ff',enemy.blindTime>0);this.showToast('DREAM GIRL · FIND THE SOLID SHADOW');}enemy.attackPoseTime=.58;enemy.attackTimer=Math.max(.78,1.75-enemy.phase*.12);}
      } else if (enemy.type === 'somniaBoss') {
        if(healthRatio<.66&&(enemy.milestones&1)===0){enemy.milestones|=1;enemy.phase=1;enemy.invulnerable=.82;this.showToast('SOMNIA · DEMON LORD PHASE 2 · FALSE AWAKENINGS');this.screenFlash=.72;this.shake=12;}
        if(healthRatio<.32&&(enemy.milestones&2)===0){enemy.milestones|=2;enemy.phase=2;enemy.invulnerable=.82;const left=this.createEnemy('keyholeWisp',150,360),right=this.createEnemy('keyholeWisp',1040,360);this.applyCurrentThreat(left);this.applyCurrentThreat(right);this.enemies.push(left,right);this.showToast('SOMNIA · HORNS UNVEILED · EVERY LOOP OVERLAPS');this.screenFlash=.86;this.shake=15;}
        enemy.vx+=enemy.facing*(92+enemy.phase*30)*dt;enemy.vx=clamp(enemy.vx,-78-enemy.phase*18,78+enemy.phase*18);enemy.vy=Math.min(960,enemy.vy+GRAVITY*dt);
        if(enemy.attackTimer<=0){enemy.attackCount+=1;const pattern=(enemy.attackCount-1)%3;this.spawnSomniaPattern(enemy,pattern);if(enemy.phase>=1&&enemy.attackCount%2===0)this.spawnSomniaPattern(enemy,(pattern+1)%3);enemy.attackPoseTime=.66;enemy.attackTimer=Math.max(.72,1.7-enemy.phase*.22);}
        this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'mirrorPunk') {
        enemy.vx+=enemy.facing*760*dt;enemy.vx=clamp(enemy.vx,-195,195);
        if(enemy.grounded&&enemy.attackTimer<=0){enemy.vx=enemy.facing*650;enemy.vy=-485;enemy.attackPoseTime=.44;enemy.attackTimer=1.12+this.runRng.next()*.38;}
        enemy.vy=Math.min(990,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'prismWisp') {
        const targetY=this.player.y-150+Math.sin(enemy.timer*2.9+enemy.id)*70;enemy.x+=enemy.facing*52*dt;enemy.y+=(targetY-enemy.y)*dt*.82;
        if(enemy.attackTimer<=0){for(const spread of [-.22,0,.22])this.enemyShoot(enemy,345,18,'#8ff7ff',spread);enemy.attackPoseTime=.46;enemy.attackTimer=1.45+this.runRng.next()*.35;}
      } else if (enemy.type === 'facelessStriker') {
        enemy.vx+=enemy.facing*390*dt;enemy.vx=clamp(enemy.vx,-105,105);enemy.vy=Math.min(960,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){enemy.vx=enemy.facing*760;const x=clamp(centerX(this.player)-85,55,WIDTH-225);this.spawnBossHazard('mirrorOriginal',x,FLOOR_Y-90,170,90,1.35,.58,20,'#69dfff',enemy.blindTime>0);enemy.attackPoseTime=.5;enemy.attackTimer=1.75;}
      } else if (enemy.type === 'glassHound') {
        if(enemy.attackTimer<=0){enemy.vx=enemy.facing*850;enemy.vy=-155;enemy.attackPoseTime=.5;enemy.attackTimer=1.36+this.runRng.next()*.4;}else{enemy.vx+=enemy.facing*860*dt;enemy.vx=clamp(enemy.vx,-245,245);}
        enemy.vy=Math.min(1000,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'echoSniper') {
        enemy.vx*=Math.pow(.1,dt);enemy.vy=Math.min(950,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){this.enemyShoot(enemy,525,22,'#4fe8ff');this.enemyShoot(enemy,425,17,'#e38cff',enemy.facing>0?.28:-.28);enemy.attackPoseTime=.6;enemy.attackTimer=1.62;this.showToast('ECHO SNIPER · BLUE FIRST · VIOLET REFLECTION');}
      } else if (enemy.type === 'reflectionKnight') {
        enemy.vx+=enemy.facing*245*dt;enemy.vx=clamp(enemy.vx,-72,72);enemy.vy=Math.min(950,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){for(let shot=0;shot<8;shot+=1)this.enemyShootAngle(enemy,shot*Math.PI/4,330,19,'#a8f8ff',9);enemy.attackPoseTime=.58;enemy.attackTimer=2.05;}
      } else if (enemy.type === 'betterMilo') {
        enemy.phase=healthRatio<.34?2:healthRatio<.67?1:0;
        enemy.vx+=enemy.facing*(530+enemy.phase*75)*dt;enemy.vx=clamp(enemy.vx,-175-enemy.phase*25,175+enemy.phase*25);enemy.vy=Math.min(980,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){
          enemy.attackCount+=1;const pattern=(enemy.attackCount-1)%3;
          if(pattern===0){for(const spread of [-.18,0,.18])this.enemyShoot(enemy,430,18,'#a66cff',spread);this.showToast('BETTER MILO · COPIED BASE ARCANE · FIXED DAMAGE');}
          else if(pattern===1){enemy.vx=enemy.facing*920;enemy.vy=-180;const lane=centerX(this.player)<WIDTH/2?85:WIDTH-385;this.spawnBossHazard('mirrorOriginal',lane,FLOOR_Y-118,300,118,1.45,.68,23,'#6ee7ff',enemy.blindTime>0);this.showToast('BETTER MILO · COPIED DASH · READ THE BLUE LANE');}
          else{for(let shot=0;shot<10;shot+=1)this.enemyShootAngle(enemy,shot*Math.PI/5,390,17,'#cb7dff',10);this.showToast('BETTER MILO · COPIED SPECIAL · BASE KIT ONLY');}
          enemy.attackPoseTime=.62;enemy.attackTimer=Math.max(.76,1.55-enemy.phase*.18);
        }
      } else if (enemy.type === 'vesperaBoss') {
        if(healthRatio<.68&&(enemy.milestones&1)===0){enemy.milestones|=1;enemy.phase=1;enemy.invulnerable=.78;this.showToast('VESPERA · DEMON LORD PHASE 2 · EVERY FACE ANSWERS');this.screenFlash=.75;this.shake=12;}
        if(healthRatio<.34&&(enemy.milestones&2)===0){enemy.milestones|=2;enemy.phase=2;enemy.invulnerable=.78;for(const x of [155,1030]){const add=this.createEnemy('prismWisp',x,340);this.applyCurrentThreat(add);this.enemies.push(add);}this.showToast('VESPERA · HORNS CROWNED · THOUSANDFOLD SHATTER');this.screenFlash=.88;this.shake=15;}
        enemy.vx+=enemy.facing*(104+enemy.phase*28)*dt;enemy.vx=clamp(enemy.vx,-86-enemy.phase*18,86+enemy.phase*18);enemy.vy=Math.min(970,enemy.vy+GRAVITY*dt);
        if(enemy.attackTimer<=0){enemy.attackCount+=1;const pattern=(enemy.attackCount-1)%3;this.spawnVesperaPattern(enemy,pattern);if(enemy.phase>=2&&enemy.attackCount%2===0)this.spawnVesperaPattern(enemy,(pattern+1)%3);enemy.attackPoseTime=.68;enemy.attackTimer=Math.max(.7,1.68-enemy.phase*.22);}
        this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'throneLegionary') {
        enemy.vx+=enemy.facing*300*dt;enemy.vx=clamp(enemy.vx,-82,82);enemy.vy=Math.min(980,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){enemy.vx=enemy.facing*620;for(const spread of [-.16,.16])this.enemyShoot(enemy,365,19,'#c22d63',spread);enemy.attackPoseTime=.52;enemy.attackTimer=1.55;}
      } else if (enemy.type === 'charmAcolyte') {
        enemy.vx*=Math.pow(.12,dt);enemy.vy=Math.min(950,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){for(const spread of [-.3,-.15,0,.15,.3]){this.enemyShoot(enemy,330,18,'#ff78c7',spread);const shot=this.projectiles[this.projectiles.length-1];if(shot)shot.homing=.28;}enemy.attackPoseTime=.5;enemy.attackTimer=1.72;}
      } else if (enemy.type === 'portalHound') {
        if(enemy.attackTimer<=0){enemy.vx=enemy.facing*880;enemy.vy=-175;this.spawnBossHazard('portalRift',clamp(centerX(this.player)-95,45,WIDTH-235),FLOOR_Y-105,190,105,1.5,.66,21,'#e8478e',enemy.blindTime>0);enemy.attackPoseTime=.5;enemy.attackTimer=1.48;}else{enemy.vx+=enemy.facing*900*dt;enemy.vx=clamp(enemy.vx,-260,260);}enemy.vy=Math.min(1000,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'bloodCantor') {
        enemy.vx*=Math.pow(.1,dt);enemy.vy=Math.min(950,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){this.spawnBossHazard('lifeTether',0,120,WIDTH,FLOOR_Y-120,1.8,.82,18,'#d82c62',enemy.blindTime>0);enemy.attackPoseTime=.55;enemy.attackTimer=2.15;}
      } else if (enemy.type === 'decreeWisp' || enemy.type === 'hollowShade') {
        const targetY=this.player.y-150+Math.sin(enemy.timer*3+enemy.id)*65;enemy.x+=enemy.facing*54*dt;enemy.y+=(targetY-enemy.y)*dt*.8;
        if(enemy.attackTimer<=0){for(const spread of [-.2,0,.2])this.enemyShoot(enemy,390,19,enemy.type==='hollowShade'?'#b3a8c9':'#f4a2ff',spread);enemy.attackPoseTime=.44;enemy.attackTimer=1.42;}
      } else if (enemy.type === 'hollowSuccubus') {
        enemy.vx+=enemy.facing*520*dt;enemy.vx=clamp(enemy.vx,-145,145);enemy.vy=Math.min(970,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){enemy.vy=-460;for(const spread of [-.22,.22])this.enemyShoot(enemy,430,20,'#6f304f',spread);enemy.attackPoseTime=.48;enemy.attackTimer=1.34;}
      } else if (enemy.type === 'daughterAttack') {
        enemy.vx+=enemy.facing*760*dt;enemy.vx=clamp(enemy.vx,-220,220);enemy.vy=Math.min(990,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){enemy.vx=enemy.facing*940;const lane=clamp(centerX(this.player)-130,45,WIDTH-305);this.spawnBossHazard('charmSweep',lane,FLOOR_Y-145,260,145,1.45,.58,25,'#ff4768',enemy.blindTime>0);enemy.attackPoseTime=.58;enemy.attackTimer=1.22;}
      } else if (enemy.type === 'daughterDefense') {
        enemy.vx+=enemy.facing*210*dt;enemy.vx=clamp(enemy.vx,-62,62);enemy.vy=Math.min(960,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){for(let shot=0;shot<10;shot+=1)this.enemyShootAngle(enemy,shot*Math.PI/5,335,19,'#8fb8ff',10);enemy.invulnerable=.42;enemy.attackPoseTime=.6;enemy.attackTimer=1.9;}
      } else if (enemy.type === 'daughterMovement') {
        if(enemy.attackTimer<=0){enemy.vx=enemy.facing*1080;enemy.vy=-230;this.spawnBossHazard('portalRift',enemy.facing>0?75:WIDTH-325,FLOOR_Y-115,250,115,1.38,.54,24,'#67f0ff',enemy.blindTime>0);enemy.attackPoseTime=.55;enemy.attackTimer=1.12;}else{enemy.vx+=enemy.facing*1050*dt;enemy.vx=clamp(enemy.vx,-310,310);}enemy.vy=Math.min(1000,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'daughterEnergy') {
        enemy.vx*=Math.pow(.11,dt);enemy.vy=Math.min(950,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){for(let shot=0;shot<12;shot+=1)this.enemyShootAngle(enemy,shot*Math.PI/6,385,20,'#ffe26f',9);enemy.attackPoseTime=.58;enemy.attackTimer=1.48;}
      } else if (enemy.type === 'lilithBoss') {
        if(healthRatio<.68&&(enemy.milestones&1)===0){enemy.milestones|=1;enemy.phase=1;enemy.invulnerable=.85;this.showToast('LILITH · PHASE II · THE BLACK CROWN COMMANDS TWO PATTERNS');this.screenFlash=.82;this.shake=14;}
        if(healthRatio<.34&&(enemy.milestones&2)===0){enemy.milestones|=2;enemy.phase=2;enemy.invulnerable=.9;this.showToast('LILITH · PHASE III · QUEEN OF HELL UNTHRONED');this.screenFlash=.94;this.shake=17;}
        enemy.vx+=enemy.facing*(45+enemy.phase*12)*dt;enemy.vx=clamp(enemy.vx,-38-enemy.phase*8,38+enemy.phase*8);enemy.vy=Math.min(970,enemy.vy+GRAVITY*dt);
        if(enemy.attackTimer<=0){enemy.attackCount+=1;const pattern=(enemy.attackCount-1)%4;this.spawnLilithPattern(enemy,pattern);if(enemy.phase>=1&&enemy.attackCount%3===0)this.spawnLilithPattern(enemy,(pattern+2)%4);enemy.attackPoseTime=.72;enemy.attackTimer=Math.max(.82,1.9-enemy.phase*.24);}
        this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'bossRushHerald') {
        enemy.vx=0;enemy.vy=0;enemy.grounded=true;if(enemy.attackTimer<=0){for(let shot=0;shot<12;shot+=1)this.enemyShootAngle(enemy,shot*Math.PI/6,360,18,'#ae78ff',9);enemy.attackTimer=1.55;}
      } else if (enemy.type === 'hollowBoss') {
        if(healthRatio<.67&&(enemy.milestones&1)===0){enemy.milestones|=1;enemy.phase=1;enemy.invulnerable=1.05;if(!this.isEndless)this.stripBoonsForHollow();this.projectiles=[];this.bossHazards=[];this.showToast(this.isEndless?'THE HOLLOW · DEEP DIVE MIRROR ESCALATION':'THE HOLLOW · EVERYTHING BORROWED FALLS AWAY · BASE KIT DUEL');this.screenFlash=1;this.shake=18;}
        if(healthRatio<.34&&(enemy.milestones&2)===0){enemy.milestones|=2;enemy.phase=2;enemy.invulnerable=1.15;this.hollowRestoreTimer=.35;if(!this.isEndless)this.music.requestState('LEVEL_9_FINAL_FIGHT');this.projectiles=[];this.bossHazards=[];this.showToast(this.isEndless?'THE HOLLOW · STACKED DEPTH POWERS AWAKEN':'THE GODS ANSWER · POWER RETURNS ONE VOICE AT A TIME');this.screenFlash=1;this.shake=20;}
        if(enemy.phase===2&&this.hollowRestoreQueue.length){this.hollowRestoreTimer-=dt;if(this.hollowRestoreTimer<=0){this.restoreNextHollowBoon();this.hollowRestoreTimer=2.1;}}
        enemy.vx+=enemy.facing*(430+enemy.phase*85)*dt;enemy.vx=clamp(enemy.vx,-150-enemy.phase*40,150+enemy.phase*40);enemy.vy=Math.min(1000,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){enemy.attackCount+=1;this.spawnHollowPattern(enemy,(enemy.attackCount-1)%3);enemy.attackPoseTime=.66;enemy.attackTimer=Math.max(.68,1.42-enemy.phase*.16);}
      } else if (enemy.type === 'thornStalker') {
        enemy.vx += enemy.facing * 640 * dt; enemy.vx = clamp(enemy.vx,-145,145);
        if(enemy.grounded&&enemy.attackTimer<=0){enemy.vx=enemy.facing*470;enemy.vy=-430;enemy.attackPoseTime=.4;enemy.attackTimer=1.35+this.runRng.next()*.55;}
        enemy.vy=Math.min(940,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'sporeMaw') {
        enemy.vx*=Math.pow(.12,dt);enemy.vy=Math.min(920,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){for(const spread of [-.26,0,.26])this.enemyShoot(enemy,315,12,'#b5ff67',spread);enemy.attackPoseTime=.45;enemy.attackTimer=1.75+this.runRng.next()*.4;}
      } else if (enemy.type === 'vineLurker') {
        enemy.vx+=enemy.facing*330*dt;enemy.vx=clamp(enemy.vx,-88,88);enemy.vy=Math.min(920,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){const x=clamp(centerX(this.player)-75,55,WIDTH-205);this.spawnBossHazard('snare',x,FLOOR_Y-82,150,82,2.35,.72,12,'#95d94d',enemy.blindTime>0);enemy.attackPoseTime=.45;enemy.attackTimer=2.15;}
      } else if (enemy.type === 'razorBoar') {
        if(enemy.attackTimer<=0){enemy.vx=enemy.facing*650;enemy.attackPoseTime=.5;enemy.attackTimer=1.7+this.runRng.next()*.45;}else{enemy.vx+=enemy.facing*560*dt;enemy.vx=clamp(enemy.vx,-195,195);}
        enemy.vy=Math.min(960,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'rootMaw') {
        enemy.vx+=enemy.facing*240*dt;enemy.vx=clamp(enemy.vx,-70,70);enemy.vy=Math.min(930,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){for(let i=0;i<7;i+=1)this.enemyShootAngle(enemy,-Math.PI*.82+i*Math.PI*.64/6,300,15,'#db7848',10);enemy.attackPoseTime=.52;enemy.attackTimer=2.25;}
      } else if (enemy.type === 'thornArcher') {
        enemy.vx*=Math.pow(.15,dt);enemy.vy=Math.min(920,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
        if(enemy.attackTimer<=0){for(const spread of [-.2,0,.2])this.enemyShoot(enemy,455,14,'#f05b47',spread);enemy.attackPoseTime=.48;enemy.attackTimer=1.55+this.runRng.next()*.35;}
      } else if (enemy.type === 'perfectPrey') {
        // The stag is damage-proof while fleeing, but it now fires backward
        // thorn volleys. Cornering opens a long, readable damage window during
        // which it actively counters before escaping with another predator.
        if(enemy.phase===0){
          enemy.invulnerable=Math.max(enemy.invulnerable,.08);
          enemy.facing=centerX(this.player)>centerX(enemy)?-1:1;
          enemy.vx+=enemy.facing*1250*dt;enemy.vx=clamp(enemy.vx,-325,325);
          enemy.vy=Math.min(930,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
          if(enemy.attackTimer<=0){for(const spread of [-.24,0,.24])this.enemyShoot(enemy,395,13,'#d9ef9a',spread);enemy.attackPoseTime=.38;enemy.attackTimer=1.3+this.runRng.next()*.35;}
          if(enemy.x<105||enemy.x+enemy.w>WIDTH-105){enemy.phase=1;enemy.vx=0;enemy.timer=0;enemy.attackTimer=.42;enemy.invulnerable=0;enemy.attackPoseTime=.55;this.showToast('PERFECT PREY CORNERED · VULNERABLE · COUNTERATTACKING');this.burst(centerX(enemy),centerY(enemy),'#eef8de',28,360);}
        }else{
          enemy.vx*=Math.pow(.02,dt);enemy.vy=Math.min(930,enemy.vy+GRAVITY*dt);this.moveWithPlatforms(enemy,dt,true);
          if(enemy.timer<3.25&&enemy.attackTimer<=0){enemy.attackCount+=1;if(enemy.attackCount%3===0){const x=clamp(centerX(this.player)-80,70,WIDTH-230);this.spawnBossHazard('snare',x,FLOOR_Y-90,160,90,2.05,.58,13,'#b5df69',enemy.blindTime>0);}else{const shots=enemy.attackCount%3===1?5:7;for(let shot=0;shot<shots;shot+=1)this.enemyShoot(enemy,430,14,'#e7f7ba',(shot-(shots-1)/2)*.14);}enemy.attackPoseTime=.42;enemy.attackTimer=.62;}
          if(enemy.timer>=3.25){enemy.phase=0;enemy.timer=0;enemy.attackTimer=1.05;const addType:EnemyType=enemy.attackCount%2?'thornStalker':'razorBoar';const addX=enemy.x<WIDTH/2?WIDTH-235:145;this.enemies.push(this.createEnemy(addType,addX,FLOOR_Y-ENEMY_BODIES[addType].h));this.showToast('PERFECT PREY ESCAPES · PREDATOR ADDED');}
        }
      } else if (enemy.type === 'roxyne') {
        enemy.phase=healthRatio<.3?2:healthRatio<.62?1:0;
        enemy.vx+=enemy.facing*(155+enemy.phase*55)*dt;enemy.vx=clamp(enemy.vx,-115-enemy.phase*30,115+enemy.phase*30);
        enemy.vy=Math.min(950,enemy.vy+GRAVITY*dt);
        if(enemy.attackTimer<=0){
          enemy.attackCount+=1;
          if(enemy.attackCount%4===1){const laneX=clamp(centerX(this.player)-210,35,WIDTH-455);this.spawnBossHazard('pounce',laneX,FLOOR_Y-155,420,155,1.75,.82,22+enemy.phase*2,'#ed4c43',enemy.blindTime>0);enemy.vx=enemy.facing*680;this.showToast('PREDATOR POUNCE · LONG SHADOW TELEGRAPH');}
          else if(enemy.attackCount%4===2){const shots=5+enemy.phase*2;for(let i=0;i<shots;i+=1)this.enemyShoot(enemy,445+enemy.phase*35,14+enemy.phase*2,'#ef7048',(i-(shots-1)/2)*.13);this.showToast('THORN ARROWS · BREAK THE VOLLEY');}
          else if(enemy.attackCount%4===3){const snareX=clamp(centerX(this.player)-90,55,WIDTH-235);this.spawnBossHazard('snare',snareX,FLOOR_Y-105,180,105,2.9,.78,15,'#93c948',enemy.blindTime>0);this.showToast('HUNTER\'S SNARE · SLOWS, NEVER DISABLES JUMP OR DASH');}
          else{const gap=centerX(this.player)<WIDTH/2?720:110;for(const x of [70,340,610,880])if(Math.abs(x-gap)>190)this.spawnBossHazard('thorns',x,FLOOR_Y-165,220,165,2.15,.72,20,'#d9403f',enemy.blindTime>0);this.showToast(enemy.phase===2?'COLLAPSING CANOPY · CLIMB AND CUT THROUGH':'MARKED DUEL · CHANGE LANES');}
          enemy.attackPoseTime=.52;enemy.attackTimer=Math.max(.72,1.65-enemy.phase*.22);
        }
        this.moveWithPlatforms(enemy,dt,true);
      } else if (enemy.type === 'imp') {
        enemy.vx += enemy.facing * 520 * dt;
        enemy.vx = clamp(enemy.vx, -105, 105);
        if (enemy.grounded && enemy.attackTimer <= 0) {
          enemy.vy = -470;
          enemy.attackTimer = 1.7 + this.runRng.next() * 1.2;
        }
        enemy.vy = Math.min(900, enemy.vy + GRAVITY * dt);
        this.moveWithPlatforms(enemy, dt, true);
      } else if (enemy.type === 'hellhound') {
        if (enemy.attackTimer <= 0) {
          enemy.vx = enemy.facing * 470;
          enemy.vy = -190;
          enemy.attackTimer = 1.8 + this.runRng.next() * .5;
          enemy.attackPoseTime = .36; enemy.attackPose = 3;
        } else {
          enemy.vx += enemy.facing * 720 * dt;
          enemy.vx = clamp(enemy.vx, -165, 165);
        }
        enemy.vy = Math.min(900, enemy.vy + GRAVITY * dt);
        this.moveWithPlatforms(enemy, dt, true);
      } else if (enemy.type === 'floater') {
        const targetY = this.player.y - 110 + Math.sin(enemy.timer * 2.4) * 45;
        enemy.x += enemy.facing * 42 * dt;
        enemy.y += (targetY - enemy.y) * dt * .75;
        if (enemy.attackTimer <= 0) {
          this.enemyShoot(enemy, 340, 9, '#b66cff');
          enemy.attackPoseTime = .32; enemy.attackPose = 3;
          enemy.attackTimer = 1.55 + this.runRng.next() * .45;
        }
      } else if (enemy.type === 'succubus') {
        if (enemy.attackTimer <= 0) {
          this.enemyShoot(enemy, 410, 10, '#ff7a45');
          enemy.attackPoseTime = .34; enemy.attackPose = 1;
          enemy.attackTimer = 1.45 + this.runRng.next() * .35;
        }
      } else if (enemy.type === 'crawler') {
        if (enemy.attackTimer <= 0) {
          enemy.vx = enemy.facing * 610; enemy.attackPoseTime = .48; enemy.attackPose = 2;
          enemy.attackTimer = 2.25 + this.runRng.next() * .4;
        } else if (enemy.attackPoseTime <= 0) {
          enemy.vx += enemy.facing * 680 * dt; enemy.vx = clamp(enemy.vx, -175, 175);
        }
        enemy.vy = Math.min(950, enemy.vy + GRAVITY * dt); this.moveWithPlatforms(enemy, dt, true);
      } else if (enemy.type === 'siren') {
        const distance = Math.abs(centerX(this.player) - centerX(enemy));
        if (enemy.attackTimer <= 0) {
          enemy.vx = enemy.facing * (distance > 170 ? 620 : 390); enemy.attackPoseTime = .42; enemy.attackPose = distance > 170 ? 1 : 2;
          enemy.attackTimer = 1.55 + this.runRng.next() * .35;
        } else if (enemy.attackPoseTime <= 0) {
          enemy.vx += enemy.facing * 840 * dt; enemy.vx = clamp(enemy.vx, -205, 205);
        }
        enemy.vy = Math.min(950, enemy.vy + GRAVITY * dt); this.moveWithPlatforms(enemy, dt, true);
      } else if (enemy.type === 'brute') {
        if (enemy.attackTimer <= 0) {
          enemy.attackCount += 1;
          if (enemy.attackCount % 2 === 0) {
            const direction = enemy.facing;
            for (let i = -2; i <= 2; i += 1) this.projectiles.push({
              id:this.entityId++,owner:'enemy',x:centerX(enemy)-9,y:enemy.y+28,w:18,h:18,
              vx:direction*(330+Math.abs(i)*34),vy:-510+i*66,damage:this.scaledEnemyDamage(13),life:2.5,color:i%2===0?'#66ead8':'#ffc75a',radius:9,pierce:0,bounces:0,homing:0,explosive:true,missesPlayer:enemy.blindTime>0,
            });
            this.playSound('enemyShoot');
            enemy.vx = 0;
            enemy.attackPose = 4;
            this.showToast('GLASS ARC · MOVE UNDER OR CLEAR THE RAIN');
          } else {
            enemy.vx = enemy.facing * 520;
            enemy.attackPose = 5;
            const laneWidth = healthRatio < .5 ? 390 : 300;
            const laneX = clamp(centerX(this.player) - laneWidth / 2, 70, WIDTH - laneWidth - 70);
            this.spawnBossHazard('pour', laneX, FLOOR_Y - 22, laneWidth, 22, healthRatio < .5 ? 3.8 : 3.1, .68, 14, '#58e3d0',enemy.blindTime>0);
          }
          enemy.attackPoseTime = .42;
          enemy.attackTimer = Math.max(1.15, 2.15 - (1 - healthRatio) * .9);
          enemy.phase = 1;
          this.burst(centerX(enemy), enemy.y + enemy.h, '#ff6c42', 10, 180);
        } else if (enemy.phase === 0) {
          enemy.vx += enemy.facing * 280 * dt;
          enemy.vx = clamp(enemy.vx, -120, 120);
        } else {
          enemy.vx *= Math.pow(.42, dt);
          if (Math.abs(enemy.vx) < 150) enemy.phase = 0;
        }
        enemy.vy = Math.min(900, enemy.vy + GRAVITY * dt);
        this.moveWithPlatforms(enemy, dt, true);
      } else if (enemy.type === 'warden') {
        enemy.phase = healthRatio < .5 ? 2 : healthRatio < .75 ? 1 : 0;
        enemy.vx += enemy.facing * (120 + enemy.phase * 45) * dt;
        enemy.vx = clamp(enemy.vx, -85 - enemy.phase * 20, 85 + enemy.phase * 20);
        enemy.vy = Math.min(900, enemy.vy + GRAVITY * dt);
        if (enemy.attackTimer <= 0) {
          enemy.attackCount += 1;
          if (enemy.attackCount % 4 === 0) {
            const shots = 10 + enemy.phase * 2;
            for (let i = 0; i < shots; i += 1) this.enemyShootAngle(enemy, i / shots * Math.PI * 2, 320 + enemy.phase * 30, 12 + enemy.phase, '#ff8a45');
            if(enemy.blindTime<=0)this.belladonnaVortex = 1.65 + enemy.phase * .25;
            this.showToast('SWALLOW VORTEX · DASH AWAY FROM THE CENTER');
            enemy.attackPose = 4;
          } else if (enemy.attackCount % 3 === 0) {
            this.enemyShootAngle(enemy, 0, 520 + enemy.phase * 50, 15, '#ffc75a', 14);
            this.enemyShootAngle(enemy, Math.PI, 520 + enemy.phase * 50, 15, '#ffc75a', 14);
            const trapX = clamp(centerX(this.player) - 95, 80, WIDTH - 270);
            this.spawnBossHazard('temptation', trapX, FLOOR_Y - 90, 190, 90, 3.4, .85, 16, '#ff4f9a',enemy.blindTime>0);
            this.spawnPickup(enemy.attackCount % 2 === 0 ? 'pizza' : 'coffee', trapX + 95, FLOOR_Y - 115, 28);
            this.showToast('TEMPTATION TRAP · REAL PICKUP, REAL TEETH');
            enemy.attackPose = 3;
          } else {
            const shots = 3 + enemy.phase * 2;
            for (let i = 0; i < shots; i += 1) {
              const spread = (i - (shots - 1) / 2) * .18;
              this.enemyShoot(enemy, 390 + enemy.phase * 35, 11 + enemy.phase * 2, '#ff345e', spread);
            }
            const biteX = centerX(this.player) < WIDTH / 2 ? 70 : WIDTH - 390;
            this.spawnBossHazard('bite', biteX, FLOOR_Y - 135, 320, 135, 2.1, .62, 18, '#ff345e',enemy.blindTime>0);
            enemy.attackPose = 2;
          }
          enemy.attackPoseTime = .34;
          enemy.attackTimer = Math.max(.62, 1.3 - enemy.phase * .2);
          this.shake = 3;
        }
        if (enemy.timer > 6.5 && this.enemies.filter((other) => !other.dead && other.type === 'imp').length < 2) {
          enemy.timer = 0;
          this.enemies.push(this.createEnemy('imp', clamp(enemy.x - 120, 60, 1120), 560));
          this.enemies.push(this.createEnemy('imp', clamp(enemy.x + 150, 60, 1120), 560));
          this.showToast('Belladonna calls another hungry crowd');
        }
        this.moveWithPlatforms(enemy, dt, true);
      }

      if(enemy.rootTime>0){enemy.x=enemy.rootX;enemy.y=enemy.rootY;enemy.vx=0;enemy.vy=0;}
      enemy.x = clamp(enemy.x, 0, WIDTH - enemy.w);
      if (overlap(this.player, enemy) && enemy.charmTime<=0) this.damagePlayer(enemy.touchDamage*courtBuff, centerX(enemy));
    }
    for(const enemy of this.enemies){
      if(enemy.dead||!this.isMajorType(enemy.type))continue;
      const previous=this.presentedBossMilestones.get(enemy.id)??0;
      const gained=enemy.milestones&~previous;
      if(gained!==0){this.playSound('bossPhase');this.shake=Math.max(this.shake,7);}
      this.presentedBossMilestones.set(enemy.id,enemy.milestones);
    }
    for(const id of this.presentedBossMilestones.keys())if(!this.enemies.some(enemy=>enemy.id===id&&!enemy.dead))this.presentedBossMilestones.delete(id);
    this.enemies = this.enemies.filter((enemy) => !enemy.dead || enemy.deathTime > 0);
  }

  private spawnBossHazard(kind: BossHazard['kind'], x: number, y: number, w: number, h: number, life: number, telegraph: number, damage: number, color: string, missesPlayer=false): void {
    this.bossHazards.push({ kind, x, y, w, h, life, maxLife: life, telegraph, damage: this.scaledEnemyDamage(damage), color, missesPlayer });
    this.playSound('enemyShoot');
  }

  private spawnCalyptraPattern(enemy: Enemy, pattern: number): void {
    if (pattern === 0) {
      const leftFirst = centerX(this.player) > WIDTH / 2;
      const lanes = leftFirst ? [70, 390, 710] : [230, 550, 870];
      for (const x of lanes) this.spawnBossHazard('electricRail',x,FLOOR_Y-64,180,64,1.8,.92,20+enemy.phase*2,'#ffe05a',enemy.blindTime>0);
      this.showToast('ROULETTE POINTER → ELECTRIC RAIL SWEEP');
    } else if (pattern === 1) {
      const target = clamp(centerX(this.player)-85,65,WIDTH-235);
      this.spawnBossHazard('diceSlam',target,FLOOR_Y-150,170,150,1.65,.82,22+enemy.phase*2,'#f56cff',enemy.blindTime>0);
      this.spawnBossHazard('diceSlam',WIDTH-target-170,FLOOR_Y-105,170,105,1.65,.82,18+enemy.phase*2,'#f56cff',enemy.blindTime>0);
      this.showToast('ROULETTE POINTER → DICE SLAM ZONES');
    } else {
      const safeLane = centerX(this.player) < WIDTH/2 ? 80 : 880;
      for (const x of [70,340,610,880]) if (Math.abs(x-safeLane)>120) this.spawnBossHazard('collapse',x,FLOOR_Y-185,250,185,2,.95,21+enemy.phase*2,'#ff4f76',enemy.blindTime>0);
      this.showToast('ROULETTE POINTER → COLLAPSING CARD BRIDGES');
    }
  }

  private spawnIsoldePattern(enemy: Enemy, pattern: number): void {
    if(pattern===0){
      const target=clamp(centerX(this.player)-105,65,WIDTH-275);this.spawnBossHazard('crystalDelay',target,FLOOR_Y-205,210,205,2.05-enemy.phase*.15,1.18-enemy.phase*.12,23+enemy.phase*2,'#8cecff',enemy.blindTime>0);
      if(enemy.phase>0)this.spawnBossHazard('crystalDelay',WIDTH-target-210,FLOOR_Y-145,210,145,1.9,1.02-enemy.phase*.1,20+enemy.phase*2,'#b8f6ff',enemy.blindTime>0);
      this.showToast('ISOLDE · CRYSTAL DELAY · MARKED ZONES SHATTER LATE');
    }else if(pattern===1){
      const safe=centerX(this.player)<WIDTH/2?925:115;for(const x of [70,340,610,880])if(Math.abs(x-safe)>150)this.spawnBossHazard('memoryShatter',x,130,220,520,2.05,1.08-enemy.phase*.1,22+enemy.phase*2,'#d9fbff',enemy.blindTime>0);
      this.showToast('ISOLDE · MEMORY SHATTER · ONE AISLE REMAINS OPEN');
    }else{
      const safe=centerX(this.player)<WIDTH/2?820:120;for(const x of [80,360,640,920])if(Math.abs(x-safe)>170)this.spawnBossHazard('frozenChoir',x,FLOOR_Y-165,240,165,1.95,.98-enemy.phase*.1,22+enemy.phase*2,'#73dcff',enemy.blindTime>0);
      this.showToast('ISOLDE · FROZEN CHOIR · LISTEN, THEN CHANGE LANES');
    }
  }

  private spawnSomniaPattern(enemy: Enemy, pattern: number): void {
    if(pattern===0){
      const real=Math.floor(this.runRng.next()*4);for(let lane=0;lane<4;lane+=1)this.spawnBossHazard(lane===real?'dreamEcho':'dreamEchoFake',55+lane*300,FLOOR_Y-190,270,190,1.82,.94-enemy.phase*.08,22+enemy.phase*2,lane===real?'#ff76d8':'#b78ce8',enemy.blindTime>0);
      this.showToast('SOMNIA · SOLID SHADOW · BRIGHT CORE + DOUBLE BORDER');
    }else if(pattern===1){
      this.spawnBossHazard('falseWake',0,55,WIDTH,FLOOR_Y-55,1.72,.98-enemy.phase*.08,16+enemy.phase*2,'#f3b3e7',enemy.blindTime>0);
      this.showToast('SOMNIA · FALSE AWAKENING · DASH BEFORE THE ROOM RESETS');
    }else{
      const shots=7+enemy.phase*2;for(let shot=0;shot<shots;shot+=1)this.enemyShoot(enemy,405+enemy.phase*35,17+enemy.phase*2,'#d6a0ff',(shot-(shots-1)/2)*.13);
      this.showToast('SOMNIA · VELVET LOOP VOLLEY');
    }
  }

  private spawnVesperaPattern(enemy: Enemy, pattern: number): void {
    if(pattern===0){
      const original=centerX(this.player)<WIDTH/2?95:865,reflected=WIDTH-original-320;
      this.spawnBossHazard('mirrorOriginal',original,FLOOR_Y-190,320,190,1.7,.68,24+enemy.phase*2,'#54e6ff',enemy.blindTime>0);
      this.spawnBossHazard('mirrorReflected',reflected,FLOOR_Y-150,320,150,2.05,1.08,22+enemy.phase*2,'#d06cff',enemy.blindTime>0);
      this.showToast('VESPERA · BLUE ORIGINAL FIRST · VIOLET REFLECTION FOLLOWS');
    }else if(pattern===1){
      const safe=centerX(this.player)<WIDTH/2?905:105;for(const x of [70,340,610,880])if(Math.abs(x-safe)>145)this.spawnBossHazard('mirrorShatter',x,120,230,530,2.02,.94-enemy.phase*.08,23+enemy.phase*2,'#b8f9ff',enemy.blindTime>0);
      this.showToast('VESPERA · MIRROR SHATTER · ONE TRUE IMAGE REMAINS');
    }else{
      const shots=8+enemy.phase*2;for(let shot=0;shot<shots;shot+=1)this.enemyShootAngle(enemy,shot/shots*Math.PI*2,395+enemy.phase*35,19+enemy.phase*2,shot%2?'#d06cff':'#54e6ff',10);
      this.showToast('VESPERA · ORIGINAL / REFLECTION CROSS-VOLLEY');
    }
  }

  private spawnLilithPattern(enemy: Enemy, pattern: number): void {
    if(pattern===0){
      const side=centerX(this.player)<WIDTH/2?WIDTH-315:75;
      this.spawnBossHazard('portalRift',side,FLOOR_Y-205,240,205,2.15,.95,22+enemy.phase*2,'#ff4f9a',enemy.blindTime>0);
      if(this.enemies.filter(target=>!target.dead).length<9){const type:EnemyType=enemy.phase>=2?'hollowSuccubus':'portalHound';const add=this.createEnemy(type,side+70,FLOOR_Y-ENEMY_BODIES[type].h);this.applyCurrentThreat(add);add.maxHealth*=.72;add.health=add.maxHealth;this.enemies.push(add);}
      this.showToast('LILITH · EARTHWARD PORTAL · SUMMON + RIFT');
    }else if(pattern===1){
      const safe=centerX(this.player)<WIDTH/2?880:120;
      for(const x of [60,330,600,870])if(Math.abs(x-safe)>150)this.spawnBossHazard('charmSweep',x,105,250,545,2.05,.9,24+enemy.phase*2,'#ff7ac8',enemy.blindTime>0);
      this.showToast('LILITH · ROTATING CHARM SIGILS · FIND THE OPEN GAP');
    }else if(pattern===2){
      this.spawnBossHazard('lifeTether',0,70,WIDTH,FLOOR_Y-70,2.5,1.15,25+enemy.phase*2,'#e74178',enemy.blindTime>0);
      this.showToast('LIFE-DRAIN TETHER · BREAK LINE OF SIGHT BEHIND A THRONE PILLAR');
    }else{
      const decrees=['BLOOD TAX · ENEMY SHOTS INTENSIFY','ROYAL HUNGER · NO SAFE CENTER','BLACK CROWN · TWO PATTERNS OVERLAP'];
      this.lilithDecreeLabel=decrees[enemy.attackCount%decrees.length];this.lilithDecreeTimer=10;
      this.spawnBossHazard('royalDecree',80,80,WIDTH-160,FLOOR_Y-120,10,1.1,0,'#f5beff',false);
      this.showToast(`ROYAL DECREE · 10 SECONDS · ${this.lilithDecreeLabel}`);
    }
  }

  private spawnHollowPattern(enemy: Enemy, pattern: number): void {
    if(enemy.phase===0){
      const colors=BOON_ORDER.filter(id=>this.boonStacks[id]>0).map(id=>BOONS[id].color);const color=colors[enemy.attackCount%Math.max(1,colors.length)]??'#9b6dff';
      if(pattern===0){for(const spread of [-.34,-.17,0,.17,.34])this.enemyShoot(enemy,460,21,color,spread);this.showToast('THE HOLLOW · YOUR BUILD, TURNED INWARD');}
      else if(pattern===1){const lane=clamp(centerX(this.player)-170,40,WIDTH-380);this.spawnBossHazard('hollowEcho',lane,FLOOR_Y-170,340,170,1.72,.72,27,color,enemy.blindTime>0);this.showToast('INVERTED SPECIAL · CROSS THROUGH THE ECHO');}
      else{for(let shot=0;shot<12;shot+=1)this.enemyShootAngle(enemy,shot*Math.PI/6,410,19,color,10);}
    }else if(enemy.phase===1){
      if(pattern===0){for(const spread of [-.18,0,.18])this.enemyShoot(enemy,430,22,'#d7d0e8',spread);}
      else if(pattern===1){enemy.vx=enemy.facing*900;enemy.vy=-190;this.spawnBossHazard('hollowEcho',centerX(this.player)<WIDTH/2?70:WIDTH-370,FLOOR_Y-125,300,125,1.42,.62,26,'#f5f1ff',enemy.blindTime>0);}
      else{for(let shot=0;shot<8;shot+=1)this.enemyShootAngle(enemy,shot*Math.PI/4,360,20,'#b8adc9',9);}
      this.showToast(this.isEndless?'DEEP DIVE MIRROR · STACKED BUILD REMAINS ACTIVE':'BASE KIT DUEL · MOVE · DASH · ARCANE · SPECIAL');
    }else{
      const fragments=[65,335,605,875];const safe=fragments[enemy.attackCount%fragments.length];
      for(const x of fragments)if(x!==safe)this.spawnBossHazard('acceptance',x,FLOOR_Y-175,235,175,1.8,.78,29,'#cfa3ff',enemy.blindTime>0);
      for(const spread of [-.28,-.14,0,.14,.28])this.enemyShoot(enemy,500,23,'#ffffff',spread);
      this.showToast(this.isEndless?'THE HOLLOW · STACKED DEPTH POWERS INTENSIFY':'THE GODS RETURN · ACCEPT THE POWER · KEEP MOVING');
    }
  }

  private updateBossHazards(dt: number): void {
    this.belladonnaVortex = Math.max(0, this.belladonnaVortex - dt);
    this.lilithDecreeTimer = Math.max(0,this.lilithDecreeTimer-dt);
    if (this.belladonnaVortex > 0) {
      const direction = Math.sign(WIDTH / 2 - centerX(this.player));
      this.player.vx += direction * 780 * dt;
      if (Math.abs(centerX(this.player) - WIDTH / 2) < 65) this.damagePlayer(this.scaledEnemyDamage(12), WIDTH / 2);
    }
    for (const hazard of this.bossHazards) {
      const wasTelegraphing = hazard.telegraph > 0;
      hazard.life -= dt;
      hazard.telegraph = Math.max(0, hazard.telegraph - dt);
      if (hazard.kind === 'wagerCircle') {
        if (wasTelegraphing && overlap(this.player,hazard)) hazard.participated = true;
        if (wasTelegraphing && hazard.telegraph === 0 && !hazard.resolved) {
          hazard.resolved = true;
          if (hazard.participated && overlap(this.player,hazard)) {
            this.spawnPickup(this.runRng.chance(.55)?'coffee':'pizza',centerX(hazard),hazard.y-25,24);
            this.spawnPickup('shard',centerX(hazard)+28,hazard.y-35,2);
            this.showToast('CALYPTRA WAGER WON · HOUSE PAYS OUT');
          } else if (hazard.participated) {
            this.damagePlayer(this.scaledEnemyDamage(18),centerX(hazard));
            this.showToast('CALYPTRA WAGER LOST · THE HOUSE COLLECTS');
          }
        }
        continue;
      }
      if (hazard.kind === 'dreamEchoFake') continue;
      if (hazard.kind === 'royalDecree') continue;
      if (hazard.kind === 'lifeTether') {
        if (!hazard.missesPlayer && hazard.telegraph === 0 && overlap(this.player,hazard)) {
          const x=centerX(this.player);const behindPillar=(x>=215&&x<=365)||(x>=915&&x<=1065);
          if(!behindPillar)this.damagePlayer(hazard.damage,centerX(hazard));
        }
        continue;
      }
      if (hazard.kind === 'falseWake') {
        if (wasTelegraphing && hazard.telegraph === 0 && !hazard.resolved) {
          hazard.resolved=true;
          if(!hazard.missesPlayer&&overlap(this.player,hazard)&&this.player.invulnerable<=0){
            this.damagePlayer(hazard.damage,centerX(hazard));
            this.player.x=this.room.playerStart.x;this.player.y=this.room.playerStart.y;this.player.vx=0;this.player.vy=0;this.player.invulnerable=Math.max(this.player.invulnerable,.45);
            this.screenFlash=Math.max(this.screenFlash,.72);this.showToast('FALSE AWAKENING · RETURNED TO THE LAST DOOR');
          }
        }
        continue;
      }
      if (!hazard.missesPlayer && hazard.telegraph === 0 && overlap(this.player, hazard)) {
        if (hazard.kind === 'snare') this.applyPlayerSnare(1.45);
        this.damagePlayer(hazard.damage, centerX(hazard));
      }
    }
    this.bossHazards = this.bossHazards.filter(hazard => hazard.life > 0);
  }

  private enemyShoot(enemy: Enemy, speed: number, damage: number, color: string, angleOffset = 0): void {
    const originX = centerX(enemy);
    const originY = centerY(enemy);
    const blinded=enemy.blindTime>0;
    const blindOffset=enemy.id%2===0 ? .72 : -.72;
    const angle = Math.atan2(centerY(this.player) - originY, centerX(this.player) - originX) + angleOffset+(blinded?blindOffset:0);
    const radius = enemy.type === 'warden' ? 11 : 8;
    this.projectiles.push({
      id: this.entityId++, owner: 'enemy', x: originX - radius, y: originY - radius,
      w: radius * 2, h: radius * 2, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      damage: this.scaledEnemyDamage(damage), life: 4, color, radius, pierce: 0, bounces: 0, homing: enemy.deepDivePowers?.includes('homing') ? .82 : 0, explosive: false, missesPlayer:blinded,
    });
    this.burst(originX, originY, color, 4, 90);
    this.playSound('enemyShoot');
  }

  private enemyShootAngle(enemy: Enemy, angle: number, speed: number, damage: number, color: string, radius = 10): void {
    const originX = centerX(enemy); const originY = centerY(enemy);
    const blinded=enemy.blindTime>0;
    this.projectiles.push({
      id: this.entityId++, owner: 'enemy', x: originX - radius, y: originY - radius, w: radius * 2, h: radius * 2,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, damage: this.scaledEnemyDamage(damage), life: 4, color, radius,
      pierce: 0, bounces: 0, homing: enemy.deepDivePowers?.includes('homing') ? .82 : 0, explosive: false, missesPlayer:blinded,
    });
    this.burst(originX, originY, color, 3, 80);
    this.playSound('enemyShoot');
  }

  private spawnSongNote(enemy: Enemy, angleOffset = 0): void {
    if (this.projectiles.filter(projectile => projectile.owner === 'enemy' && projectile.songNote).length >= 12) return;
    const originX=centerX(enemy),originY=centerY(enemy);
    const angle=Math.atan2(centerY(this.player)-originY,centerX(this.player)-originX)+angleOffset;
    const radius=13;
    this.projectiles.push({
      id:this.entityId++,owner:'enemy',x:originX-radius,y:originY-radius,w:radius*2,h:radius*2,
      vx:Math.cos(angle)*235,vy:Math.sin(angle)*235,damage:this.scaledEnemyDamage(14),life:6,color:'#56edf4',radius,
      pierce:0,bounces:0,homing:1.65,explosive:false,missesPlayer:enemy.blindTime>0,destructible:true,songNote:true,
    });
    this.burst(originX,originY,'#b9ffff',6,115);
    this.playSound('enemyShoot');
  }

  private updateProjectiles(dt: number): void {
    const remove = new Set<number>();
    const destructibleHostiles=this.projectiles.filter(projectile=>projectile.owner==='enemy'&&projectile.destructible);
    for (const projectile of this.projectiles) {
      if (remove.has(projectile.id)) continue;
      if (this.worldFreezeTimer > 0 && projectile.owner === 'enemy') continue;
      if((projectile.spawnDelay??0)>0){projectile.spawnDelay=Math.max(0,(projectile.spawnDelay??0)-dt);continue;}
      projectile.life -= dt;
      projectile.age = (projectile.age ?? 0) + dt;
      if (projectile.owner === 'player' && projectile.wave && projectile.wave > 0) {
        const turn = Math.cos((projectile.age ?? 0) * 17 + projectile.id) * projectile.wave * .85 * dt;
        const vx = projectile.vx; const vy = projectile.vy;
        projectile.vx = vx * Math.cos(turn) - vy * Math.sin(turn);
        projectile.vy = vx * Math.sin(turn) + vy * Math.cos(turn);
      }
      if (projectile.owner === 'player' && projectile.boomerang && (projectile.age ?? 0) > .55) projectile.returning = true;
      if (projectile.returning) {
        const angle = Math.atan2(centerY(this.player) - centerY(projectile), centerX(this.player) - centerX(projectile));
        const speed = Math.max(620, Math.hypot(projectile.vx, projectile.vy));
        projectile.vx += (Math.cos(angle) * speed - projectile.vx) * dt * 7;
        projectile.vy += (Math.sin(angle) * speed - projectile.vy) * dt * 7;
      }
      if (projectile.homing > 0 && projectile.owner === 'player') {
        const target = this.nearestEnemy(centerX(projectile), centerY(projectile));
        if (target) {
          const angle = Math.atan2(centerY(target) - centerY(projectile), centerX(target) - centerX(projectile));
          const speed = Math.hypot(projectile.vx, projectile.vy);
          const desiredX = Math.cos(angle) * speed;
          const desiredY = Math.sin(angle) * speed;
          projectile.vx += (desiredX - projectile.vx) * dt * projectile.homing;
          projectile.vy += (desiredY - projectile.vy) * dt * projectile.homing;
        }
      }
      if (projectile.homing > 0 && projectile.owner === 'enemy') {
        const angle=Math.atan2(centerY(this.player)-centerY(projectile),centerX(this.player)-centerX(projectile));
        const speed=Math.max(210,Math.hypot(projectile.vx,projectile.vy));
        projectile.vx+=(Math.cos(angle)*speed-projectile.vx)*dt*projectile.homing;
        projectile.vy+=(Math.sin(angle)*speed-projectile.vy)*dt*projectile.homing;
      }
      if (projectile.explosive) projectile.vy += GRAVITY * .72 * dt;
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      if (projectile.owner === 'player' && !projectile.mirrorReflected) {
        const mirror=this.room.hazards.find(hazard=>hazard.type==='mirror'&&overlap(projectile,hazard));
        if(mirror){
          const speed=Math.max(540,Math.hypot(projectile.vx,projectile.vy));
          const directionX=mirror.forceX??-Math.sign(projectile.vx||1),directionY=mirror.forceY??-.12;
          const length=Math.max(.001,Math.hypot(directionX,directionY));
          projectile.vx=directionX/length*speed;projectile.vy=directionY/length*speed;projectile.damage*=1.15;
          projectile.color=BOONS.vespera.color;projectile.accentColor='#f4ffff';projectile.mirrorReflected=true;
          projectile.x=centerX(mirror)+Math.sign(projectile.vx)*(mirror.w/2+projectile.radius+5)-projectile.radius;
          this.burst(centerX(mirror),centerY(projectile),'#8ff7ff',18,310);
          this.floatingText.push({x:centerX(mirror),y:centerY(projectile)-22,text:'MIRROR REDIRECT',color:'#d9ffff',life:.6,maxLife:.6,size:13});
          this.addStyle(3.5,'REFRACTION');
        }
      }
      if (projectile.owner === 'player' && !projectile.explosive && shouldEmitProjectileTrail(projectile.id,this.projectiles.length,this.reducedVfx) && Math.random() < dt * 34) {
        const life = .12 + Math.random() * .13;
        this.particles.push({
          x: centerX(projectile) - projectile.vx * .018, y: centerY(projectile) - projectile.vy * .018,
          vx: -projectile.vx * .08 + (Math.random() - .5) * 70, vy: -projectile.vy * .08 + (Math.random() - .5) * 70,
          life, maxLife: life, size: projectile.radius * (.45 + Math.random() * .55), color: projectile.accentColor && Math.random() < .48 ? projectile.accentColor : projectile.color, gravity: -20,
        });
      }

      if (projectile.owner === 'player') {
        for (const hostile of destructibleHostiles) {
          if (remove.has(hostile.id) || !overlap(projectile,hostile)) continue;
          remove.add(hostile.id); remove.add(projectile.id);
          this.burst(centerX(hostile),centerY(hostile),'#d8ffff',16,280);
          this.floatingText.push({x:centerX(hostile),y:hostile.y-10,text:'NOTE BROKEN',color:'#8ff8ff',life:.55,maxLife:.55,size:13});
          this.addStyle(2.4,'COUNTER-HARMONY');
          break;
        }
        if (remove.has(projectile.id)) continue;
        for (const enemy of this.enemies) {
          if (enemy.dead || !this.hitsEnemy(projectile, enemy)) continue;
          if(projectile.illusory){
            this.burst(centerX(projectile),centerY(projectile),BOONS.somnia.color,9,170);
            this.floatingText.push({x:centerX(projectile),y:centerY(projectile),text:'FALSE',color:BOONS.somnia.accentColor,life:.42,maxLife:.42,size:11});
            remove.add(projectile.id);
            break;
          }
          let hitDamage = projectile.damage;
          const major = this.isMajorType(enemy.type);
          const wasFrozen=(enemy.frozenTime??0)>0;
          if (major) hitDamage *= 1 + this.boonStacks.solara * .12;
          const nearbyAllies = this.enemies.filter((other) => other.id !== enemy.id && !other.dead && Math.hypot(centerX(other)-centerX(enemy),centerY(other)-centerY(enemy)) < 220).length;
          if (nearbyAllies === 0) hitDamage *= 1 + this.boonStacks.roxyne * .12;
          if(enemy.health>=enemy.maxHealth*.98&&this.boonStacks.noctissa>0)hitDamage*=1+this.effectiveBoonStacks('noctissa')*.15;
          if (major && this.boonStacks.lilith > 0) this.player.health = Math.min(this.player.maxHealth, this.player.health + hitDamage * this.boonStacks.lilith * .025);
          this.damageEnemy(enemy, hitDamage, projectile.color);
          if(this.boonStacks.maris>0&&!enemy.dead)enemy.vx+=Math.sign(projectile.vx||this.player.facing)*(35+this.effectiveBoonStacks('maris')*18);
          this.spawnArcaneImpact(centerX(enemy), centerY(enemy), projectile.color, projectile.accentColor ?? this.arcaneCore(projectile.color), projectile.explosive || hitDamage >= 42);
          if (this.boonStacks.pyrra > 0) {
            enemy.dotTime = Math.max(enemy.dotTime, 1.8 + this.boonStacks.pyrra * .28);
            enemy.dotTick = Math.min(enemy.dotTick || .05, .12);
            enemy.dotDamage = 2 + this.boonStacks.pyrra * 2.1;
            enemy.dotLabel = 'BURN'; enemy.dotColor = BOONS.pyrra.color;
            enemy.statusHits += 1;
            if (enemy.statusHits >= 3) {
              enemy.statusHits = 0;
              this.impactBurst(centerX(enemy), centerY(enemy), 82, 8 + this.boonStacks.pyrra * 4, BOONS.pyrra.color, enemy.id);
              this.floatingText.push({ x: centerX(enemy), y: enemy.y - 12, text: 'EMBER BLOOM', color: BOONS.pyrra.accentColor, life: .55, maxLife: .55, size: 13 });
            }
          }
          if (this.boonStacks.flora > 0&&!enemy.dead) {
            const floraPower=this.effectiveBoonStacks('flora');
            const threshold=buildupThreshold(floraPower);
            enemy.thornMarks=(enemy.thornMarks??0)+1;
            this.floatingText.push({x:centerX(enemy),y:enemy.y-12,text:`THORN ${enemy.thornMarks}/${threshold}`,color:BOONS.flora.accentColor,life:.42,maxLife:.42,size:11});
            if(enemy.thornMarks>=threshold){enemy.thornMarks=0;this.impactBurst(centerX(enemy),centerY(enemy),72+floraPower*7,16+floraPower*7,BOONS.flora.color,enemy.id);this.floatingText.push({x:centerX(enemy),y:enemy.y-20,text:'THORN BLOOM',color:BOONS.flora.accentColor,life:.65,maxLife:.65,size:14});}
          }
          if (this.boonStacks.crya > 0&&!enemy.dead) {
            const cryaPower=this.effectiveBoonStacks('crya');
            enemy.slowTime=Math.max(enemy.slowTime,.8+cryaPower*.18);
            if(wasFrozen&&hitDamage>=36){enemy.frozenTime=0;enemy.frostHits=0;this.impactBurst(centerX(enemy),centerY(enemy),76+cryaPower*5,14+cryaPower*6,BOONS.crya.color,enemy.id);this.floatingText.push({x:centerX(enemy),y:enemy.y-18,text:'SHATTER',color:BOONS.crya.accentColor,life:.65,maxLife:.65,size:15});}
            else{const threshold=buildupThreshold(cryaPower);enemy.frostHits=(enemy.frostHits??0)+1;if(enemy.frostHits>=threshold){enemy.frostHits=0;enemy.frozenTime=Math.max(enemy.frozenTime??0,(major?.7:1.35)+cryaPower*.08);enemy.hitStun=Math.max(enemy.hitStun,enemy.frozenTime);this.floatingText.push({x:centerX(enemy),y:enemy.y-18,text:'FROZEN',color:BOONS.crya.accentColor,life:.7,maxLife:.7,size:15});}}
          }
          if(this.boonStacks.luna>0&&!enemy.dead){
            const lunaPower=this.effectiveBoonStacks('luna');enemy.dreamHits=(enemy.dreamHits??0)+1;enemy.dreamDamageBank=(enemy.dreamDamageBank??0)+hitDamage;
            if(enemy.dreamHits>=3){const echo=(enemy.dreamDamageBank??0)*Math.min(.62,.14+lunaPower*.08);enemy.dreamHits=0;enemy.dreamDamageBank=0;this.damageEnemy(enemy,echo,BOONS.luna.color);this.floatingText.push({x:centerX(enemy),y:enemy.y-24,text:'MOON ECHO',color:BOONS.luna.accentColor,life:.7,maxLife:.7,size:14});}
          }
          if(this.boonStacks.vespera>0&&!enemy.dead){
            const shardTargets=this.enemies.filter((target)=>target.id!==enemy.id&&!target.dead&&Math.hypot(centerX(target)-centerX(enemy),centerY(target)-centerY(enemy))<250).slice(0,Math.min(3,this.boonStacks.vespera));
            for(const target of shardTargets){const shardDamage=Math.min(28,hitDamage*(.12+this.effectiveBoonStacks('vespera')*.025));this.damageEnemy(target,shardDamage,BOONS.vespera.color,false);this.lightningEffects.push({x1:centerX(enemy),y1:centerY(enemy),x2:centerX(target),y2:centerY(target),life:.1,maxLife:.1,color:BOONS.vespera.accentColor});}
          }
          if(this.boonStacks.nerissa>=7&&!enemy.dead&&enemy.health/enemy.maxHealth<=(major?.04:.1)){
            this.floatingText.push({x:centerX(enemy),y:enemy.y-26,text:'DEATH NOTE',color:BOONS.nerissa.accentColor,life:.8,maxLife:.8,size:16});this.damageEnemy(enemy,enemy.health+1,BOONS.nerissa.color);
          }
          if (this.boonStacks.voltara > 0) {
            const voltaraPower=this.effectiveBoonStacks('voltara');
            enemy.hitStun = Math.max(enemy.hitStun, .13 + voltaraPower * .025);
            this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + .28 * voltaraPower);
            const chainTarget = this.nearestEnemyExcluding(centerX(enemy), centerY(enemy), enemy.id);
            if (chainTarget) {
              this.lightningEffects.push({x1:centerX(enemy),y1:centerY(enemy),x2:centerX(chainTarget),y2:centerY(chainTarget),life:.13,maxLife:.13,color:BOONS.voltara.color});
              this.damageEnemy(chainTarget, Math.min(30,Math.min(13,hitDamage*.14)*voltaraPower), BOONS.voltara.color, false);
            }
          }
          if (this.boonStacks.calyptra > 0) enemy.soulLinked = true;
          if (this.boonStacks.noctissa > 0) {
            enemy.dotTime = Math.max(enemy.dotTime, 1.2 + this.boonStacks.noctissa * .18);
            enemy.dotTick = Math.min(enemy.dotTick || .05, .12);
            enemy.dotDamage = Math.max(enemy.dotDamage, 1.5 + this.boonStacks.noctissa * 1.5);
            if (this.boonStacks.pyrra === 0) { enemy.dotLabel='SHADE'; enemy.dotColor=BOONS.noctissa.color; }
          }
          if (projectile.explosive) {
            this.explode(projectile);
            remove.add(projectile.id);
          } else if (projectile.bounces > 0) {
            const target = this.nearestEnemyExcluding(centerX(enemy), centerY(enemy), enemy.id);
            const angle = target ? Math.atan2(centerY(target) - centerY(enemy), centerX(target) - centerX(enemy)) : Math.atan2(-projectile.vy, -projectile.vx);
            const speed = Math.hypot(projectile.vx, projectile.vy);
            projectile.vx = Math.cos(angle) * speed;
            projectile.vy = Math.sin(angle) * speed;
            projectile.bounces -= 1;
            projectile.damage *= .86;
            projectile.x = centerX(enemy) + Math.cos(angle) * (enemy.w / 2 + projectile.radius + 8) - projectile.radius;
            projectile.y = centerY(enemy) + Math.sin(angle) * (enemy.h / 2 + projectile.radius + 8) - projectile.radius;
          } else if (projectile.pierce > 0) {
            projectile.pierce -= 1;
            projectile.damage *= .82;
            projectile.x += Math.sign(projectile.vx) * (enemy.w + 4);
          } else if (projectile.boomerang && !projectile.returning) {
            projectile.returning = true;
            projectile.damage *= .72;
            projectile.x += Math.sign(projectile.vx) * (enemy.w + 8);
          } else {
            remove.add(projectile.id);
          }
          break;
        }
        if (projectile.returning && overlap(projectile, this.player)) {
          this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 2 + this.boonStacks.seraphine);
          this.burst(centerX(this.player), centerY(this.player), '#ffe36b', 7, 130);
          remove.add(projectile.id);
        }
      } else if (!projectile.missesPlayer && overlap(projectile, this.player)) {
        if (this.mirrorShieldTimer > 0) {
          projectile.owner='player'; projectile.vx=-projectile.vx*1.2; projectile.vy=-projectile.vy*1.2; projectile.damage*=1.35+this.boonStacks.vespera*.08; projectile.color=BOONS.vespera.color; projectile.missesPlayer=false;
          projectile.x += Math.sign(projectile.vx) * 24; this.burst(centerX(this.player),centerY(this.player),BOONS.vespera.color,14,260); this.addStyle(8,'REFLECT');
        } else { this.damagePlayer(projectile.damage, centerX(projectile)); remove.add(projectile.id); }
      }

      if (projectile.explosive && this.room.platforms.some((platform) => overlap(projectile, platform))) {
        this.explode(projectile);
        remove.add(projectile.id);
      }
      if (projectile.life <= 0 || projectile.x < -100 || projectile.x > WIDTH + 100 || projectile.y < -100 || projectile.y > HEIGHT + 120) {
        if (projectile.explosive) this.explode(projectile);
        remove.add(projectile.id);
      }
    }
    this.projectiles = this.projectiles.filter((projectile) => !remove.has(projectile.id));
  }

  private nearestEnemy(x: number, y: number): Enemy | undefined {
    let nearest: Enemy | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const distance = (centerX(enemy) - x) ** 2 + (centerY(enemy) - y) ** 2;
      if (distance < nearestDistance) { nearest = enemy; nearestDistance = distance; }
    }
    return nearest;
  }

  private enemyHurtboxes(enemy:Enemy): Rect[] {
    const cx=centerX(enemy);const bottom=enemy.y+enemy.h;
    if(enemy.type==='nerissa')return [
      {x:cx-43,y:bottom-296,w:86,h:86},
      {x:cx-82,y:bottom-224,w:164,h:128},
      {x:cx-112,y:bottom-112,w:224,h:118},
    ];
    if(enemy.type==='fanChampion')return [
      {x:cx-38,y:bottom-275,w:76,h:78},
      {x:cx-72,y:bottom-207,w:144,h:122},
      {x:cx-90,y:bottom-98,w:180,h:104},
    ];
    if(enemy.type==='warden')return [
      {x:cx-42,y:bottom-281,w:84,h:72},
      {x:cx-82,y:bottom-218,w:164,h:112},
      {x:cx-142,y:bottom-118,w:284,h:126},
    ];
    if(enemy.type==='brute')return [
      {x:cx-34,y:bottom-238,w:68,h:72},
      {x:cx-72,y:bottom-174,w:144,h:108},
      {x:cx-112,y:bottom-140,w:224,h:88},
      {x:cx-58,y:bottom-72,w:116,h:78},
    ];
    return [enemy];
  }

  private hitsEnemy(hitbox:Rect,enemy:Enemy): boolean {
    return this.enemyHurtboxes(enemy).some(body=>overlap(hitbox,body));
  }

  private updateWaves(dt: number): void {
    for (const wave of this.waves) {
      wave.life -= dt; wave.x += wave.vx * dt;
      for (const enemy of this.enemies) {
        if (enemy.dead || enemy.type === 'dummy' && this.screen !== 'hub' || wave.hitIds.has(enemy.id) || !this.hitsEnemy(wave, enemy)) continue;
        wave.hitIds.add(enemy.id);
        this.damageEnemy(enemy, wave.damage, '#18d7df');
        enemy.vx += wave.facing * 620; enemy.vy = Math.min(enemy.vy, -140);
        this.burst(centerX(enemy), centerY(enemy), '#7ff7ff', 15, 330);
      }
    }
    this.waves = this.waves.filter(wave => wave.life > 0 && wave.x > -180 && wave.x < WIDTH + 180);
  }

  private nearestEnemyExcluding(x: number, y: number, excludedId: number): Enemy | undefined {
    let nearest: Enemy | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.id === excludedId) continue;
      const distance = (centerX(enemy) - x) ** 2 + (centerY(enemy) - y) ** 2;
      if (distance < nearestDistance) { nearest = enemy; nearestDistance = distance; }
    }
    return nearest;
  }

  private explode(projectile: Projectile): void {
    const x = centerX(projectile);
    const y = centerY(projectile);
    const radius = 125 + this.boonStacks.flora * 10;
    for (const enemy of this.enemies) {
      const distance = Math.hypot(centerX(enemy) - x, centerY(enemy) - y);
      if (!enemy.dead && distance < radius) this.damageEnemy(enemy, projectile.damage * (1 - distance / radius * .45), '#ffc75a');
    }
    this.burst(x, y, '#ffc75a', 38, 520);
    this.shake = 13;
    this.screenFlash = .45;
  }

  private impactBurst(x: number, y: number, radius: number, damage: number, color: string, excludedId: number): void {
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.id === excludedId) continue;
      if (Math.hypot(centerX(enemy) - x, centerY(enemy) - y) <= radius) this.damageEnemy(enemy, damage, color);
    }
    this.burst(x, y, color, 9, 190);
  }

  private damageEnemy(enemy: Enemy, amount: number, color: string, shareLink = true): void {
    if (enemy.dead) return;
    if (this.screen === 'playing' && enemy.type !== 'dummy') this.roomCombatStarted = true;
    if (enemy.type === 'nerissa') {
      const pillars = this.enemies.filter(other => !other.dead && other.type === 'chantPillar').length;
      if (pillars > 0) {
        if (!this.nerissaShieldAnnounced) {
          this.nerissaShieldAnnounced = true;
          this.showToast('CHANT SHIELD · BREAK THE MUSIC PILLARS FIRST');
        }
        enemy.invulnerable = Math.max(enemy.invulnerable,.1);
        this.floatingText.push({x:centerX(enemy),y:enemy.y-18,text:`CHANT SHIELD ×${pillars}`,color:'#b9ffff',life:.5,maxLife:.5,size:14});
        this.burst(centerX(enemy),centerY(enemy),'#75edf5',5,120);
        return;
      }
    }
    if (enemy.type === 'dreamGirl') {
      const anchors = this.enemies.filter(other => !other.dead && other.type === 'fantasyAnchor').length;
      if (anchors > 0) {
        if (!this.dreamGirlShieldAnnounced) {
          this.dreamGirlShieldAnnounced = true;
          this.showToast('DREAM GIRL IS A FANTASY · DESTROY THE FOUR ANCHORS');
        }
        enemy.invulnerable = Math.max(enemy.invulnerable,.1);
        this.floatingText.push({x:centerX(enemy),y:enemy.y-18,text:`FANTASY ANCHORS ×${anchors}`,color:'#ffd8f5',life:.55,maxLife:.55,size:14});
        this.burst(centerX(enemy),centerY(enemy),'#bc7cff',5,120);
        return;
      }
    }
    if (enemy.invulnerable > 0) return;
    if(shareLink&&this.bloodPactRoomBonus>0)amount*=1+this.bloodPactRoomBonus;
    if(enemy.charmTime>0)amount*=1.28+Math.min(.22,this.effectiveBoonStacks('nerissa')*.035);
    if (enemy.type === 'fanChampion') {
      const adorers = this.enemies.filter(other => other.id !== enemy.id && !other.dead && other.type !== 'chantPillar').length;
      if (adorers > 0) {
        amount *= .12;
        if (!this.fanClubShieldAnnounced) {
          this.fanClubShieldAnnounced = true;
          this.showToast('ADORATION SHIELD · DEFEAT THE FANS FIRST');
        }
        this.floatingText.push({x:centerX(enemy),y:enemy.y-16,text:`ADORED ×${adorers}`,color:'#8bf7ff',life:.55,maxLife:.55,size:14});
      } else if (this.fanClubShieldAnnounced) {
        this.fanClubShieldAnnounced = false;
        this.showToast('CHAMPION ISOLATED · ADORATION SHIELD BROKEN');
        this.burst(centerX(enemy),centerY(enemy),'#8bf7ff',28,380);
      }
    }
    if ((enemy.eliteModifier === 'armored'||enemy.deepDivePowers?.includes('armored')) && (enemy.eliteArmor ?? 0) > 0) {
      enemy.eliteArmor = Math.max(0, (enemy.eliteArmor ?? 0) - 1);
      amount *= .45;
      this.floatingText.push({x:centerX(enemy),y:enemy.y-16,text:enemy.eliteArmor ? `ARMOR ${enemy.eliteArmor}` : 'ARMOR BROKEN',color:'#7ddcff',life:.7,maxLife:.7,size:15});
      if (enemy.eliteArmor === 0) this.burst(centerX(enemy),centerY(enemy),'#7ddcff',22,320);
    }
    enemy.health -= amount;
    enemy.invulnerable = .035;
    enemy.hitStun = amount > 55 ? .16 : .075;
    if (enemy.type !== 'chantPillar' && enemy.type !== 'fantasyAnchor') enemy.vx += centerX(enemy) < centerX(this.player) ? -55 : 55;
    this.combo += 1; this.comboTimer = 1.25;
    this.addStyle(shareLink ? Math.min(2.6, .7 + amount / 45) : .25);
    const feedback=enemyHitFeedback(amount,enemy.maxHealth);
    const accented=shouldEmitImpactAccent(this.impactFeedbackSequence++,this.particles.length,this.reducedVfx,feedback.tier);
    if(accented){this.hitPause=Math.max(this.hitPause,feedback.hitPauseSeconds);this.shake=Math.max(this.shake,feedback.cameraImpulse);}
    this.addDamageReadout(enemy,amount,color);
    this.burst(centerX(enemy), centerY(enemy), color, feedback.particleCount, feedback.particleSpeed);
    if (enemy.health <= 0) this.killEnemy(enemy);
    else this.playSound('enemyHit');
    if (shareLink && enemy.soulLinked && this.boonStacks.calyptra > 0) {
      for (const linked of this.enemies) if (linked.id !== enemy.id && linked.soulLinked && !linked.dead) this.damageEnemy(linked, amount, '#c8a4ff', false);
    }
  }

  private killEnemy(enemy: Enemy): void {
    if (enemy.dead) return;
    enemy.dead = true;
    enemy.invulnerable = -2;
    const major = this.isMajorType(enemy.type);
    const elite=Boolean(enemy.eliteModifier||enemy.deepDivePowers?.length);
    const category=major?(this.room.type==='boss'?'boss':'miniboss'):elite?'elite':'normal';
    const feedback=enemyDefeatFeedback(category);
    enemy.deathTime = major ? .9 : 0;
    this.shake = Math.max(this.shake,feedback.cameraImpulse);
    this.hitPause=Math.max(this.hitPause,feedback.hitPauseSeconds);
    this.screenFlash=Math.max(this.screenFlash,feedback.screenFlash);
    const deathColor = enemy.type === 'hollowBoss' ? '#f3ecff' : enemy.type === 'lilithBoss' ? '#ff4f9a' : enemy.type.startsWith('daughter') ? '#e9a1ff' : enemy.type === 'vesperaBoss' ? '#8ff7ff' : enemy.type === 'betterMilo' ? '#d06cff' : enemy.type === 'somniaBoss' ? '#bc7cff' : enemy.type === 'dreamGirl' || enemy.type === 'fantasyAnchor' ? '#ffd8f5' : enemy.type === 'isoldeBoss' ? '#8ee7ff' : enemy.type === 'calyptraBoss' ? '#ffe05a' : enemy.type === 'ladyLuckless' ? '#f46cff' : enemy.type === 'roxyne' ? '#ef4e43' : enemy.type === 'perfectPrey' ? '#dce8c3' : enemy.type === 'nerissa' ? '#48e6f2' : enemy.type === 'warden' ? '#ff345e' : '#a66cff';
    this.burst(centerX(enemy), centerY(enemy), deathColor, feedback.particleCount, feedback.particleSpeed);
    this.playSound(major ? 'bossDown' : 'enemyDown');
    this.addStyle(major ? 20 : 6, major ? 'BOSS BREAK' : 'DEMON DOWN');
    if (!major && enemy.type !== 'dummy') this.runMetrics.enemiesDefeated += 1;
    else if (major) this.runMetrics.enemiesDefeated += 1;
    if (enemy.type !== 'dummy') {
      this.save.lifetimeEnemies += 1;
      const xp = major
        ? this.room.type === 'miniboss' ? DIVE_XP_REWARDS.miniboss : DIVE_XP_REWARDS.boss
        : elite ? DIVE_XP_REWARDS.eliteEnemy : DIVE_XP_REWARDS.enemy;
      this.awardProfileXp(xp, major ? this.room.type === 'miniboss' ? 'Mini-boss defeated' : 'Boss defeated' : elite ? 'Elite defeated' : 'Enemy defeated', major);
    }
    this.addRushReward(major ? 1200 : 100, rushChargeForRank(this.styleRank) * (major ? 2.5 : 1), centerX(enemy), centerY(enemy), major ? 'BOSS' : 'KO');
    this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 2 + Math.floor(this.styleMeter / 30));
    if (enemy.type === 'fantasyAnchor') {
      const dreamGirl=this.enemies.find(target=>!target.dead&&target.type==='dreamGirl');
      const remaining=this.enemies.filter(target=>!target.dead&&target.type==='fantasyAnchor').length;
      if(dreamGirl){
        dreamGirl.health=dreamGirl.maxHealth*(remaining/4);
        dreamGirl.invulnerable=Math.max(dreamGirl.invulnerable,.35);
        this.screenFlash=Math.max(this.screenFlash,.42);this.burst(centerX(dreamGirl),centerY(dreamGirl),'#ffd8f5',28,430);
        if(remaining===0){this.showToast('FINAL ANCHOR BROKEN · THE FANTASY COLLAPSES');this.killEnemy(dreamGirl);}
        else this.showToast(`FANTASY ANCHOR BROKEN · ${remaining} REMAIN`);
      }
      return;
    }
    if ((enemy.eliteModifier === 'volatile'||enemy.deepDivePowers?.includes('volatile')) && enemy.volatileArmed) {
      enemy.volatileArmed = false;
      const distance = Math.hypot(centerX(this.player)-centerX(enemy),centerY(this.player)-centerY(enemy));
      this.burst(centerX(enemy),centerY(enemy),'#ff9c42',56,680);
      this.shake=Math.max(this.shake,12); this.screenFlash=Math.max(this.screenFlash,.35);
      if (distance < 195) this.damagePlayer(this.scaledEnemyDamage(22+Math.min(20,(this.room.deepDiveCycle??1)*2)),centerX(enemy));
    }
    if(enemy.type==='hollowBoss'){
      this.restoreAllHollowBoons();
      this.showToast('THE HOLLOW IS NOT DESTROYED · MILO STOPS RUNNING');
    }
    if (major) return;
    this.spawnPickup('shard', centerX(enemy), centerY(enemy), this.wagerMultiplier);
    if(this.boonStacks.aurelia>0&&this.runRng.chance(Math.min(.5,this.effectiveBoonStacks('aurelia')*.08)))this.spawnPickup('shard',centerX(enemy)+18,centerY(enemy)-8,1);
    if (this.hasBoonPair('aurelia','belladonna')&&this.runRng.chance(.24)) this.spawnPickup('shard',centerX(enemy)+18,centerY(enemy)-8,1);
    const roll = this.runRng.next();
    if (roll < .15) this.spawnPickup('pizza', centerX(enemy), enemy.y, 18);
    else if (roll < .3) this.spawnPickup('coffee', centerX(enemy), enemy.y, 25);
  }

  private damagePlayer(amount: number, sourceX: number): void {
    if (this.screen !== 'playing') return;
    this.roomCombatStarted = true;
    if (this.player.invulnerable > 0) {
      if (this.player.dashTime > 0 && this.player.perfectDodgeCooldown === 0) {
        this.player.perfectDodgeCooldown = .7; this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 8);
        this.addStyle(14, 'PERFECT DODGE'); this.addRushReward(75, 12, centerX(this.player), this.player.y, 'DODGE'); this.hitPause = Math.max(this.hitPause, .045); this.screenFlash = .32;
        this.burst(centerX(this.player), centerY(this.player), '#f4ffff', 24, 420); this.playSound('perfectDodge');
      }
      return;
    }
    if (this.stoneBarrierTime > 0 && this.stoneBarrierHits > 0 && Math.abs(centerX(this.player) - this.stoneBarrierX) < 135) {
      this.stoneBarrierHits -= 1;
      this.player.invulnerable = .32;
      this.burst(this.stoneBarrierX, this.stoneBarrierY - 52, BOONS.gaia.color, 28, 380);
      if (this.stoneBarrierHits === 0) this.stoneBarrierTime = 0;
      this.showToast(`STONEWALL BLOCK · ${this.stoneBarrierHits} LEFT`);
      this.playSound('boon');
      return;
    }
    if (this.player.shieldCharges > 0) {
      this.player.shieldCharges -= 1; this.player.invulnerable = .48;
      this.burst(centerX(this.player), centerY(this.player), '#ffe36b', 22, 360);
      this.showToast(`HALO BLOCK · ${this.player.shieldCharges} LEFT`); this.playSound('boon'); return;
    }
    const controlledEnemyPresent=this.enemies.some((enemy)=>!enemy.dead&&(enemy.slowTime>0||enemy.rootTime>0||enemy.charmTime>0||enemy.hitStun>.08));
    amount *= incomingDamageMultiplier(this.boonStacks.gaia,this.boonStacks.crya,controlledEnemyPresent);
    if (this.activeWager?.type === 'perfect') this.failActiveWager('DAMAGE TAKEN');
    this.roomDamageTaken += amount; this.styleMeter = Math.max(0, this.styleMeter - 13); this.updateStyleRank();
    this.runMetrics.damageTaken += amount;
    this.player.health -= amount;
    this.player.invulnerable = .78;
    const somniaRecovery=Math.max(.55,1-this.effectiveBoonStacks('somnia')*.1);
    this.player.hurtFlash = .25*somniaRecovery;
    this.player.vx = (centerX(this.player) < sourceX ? -310 : 310)*somniaRecovery;
    this.player.vy = -280*somniaRecovery;
    this.shake = 10;
    this.screenFlash = .3;
    this.floatingText.push({ x: centerX(this.player), y: this.player.y, text: `-${Math.round(amount)}`, color: '#ff5269', life: .75, maxLife: .75, size: 20 });
    this.burst(centerX(this.player), centerY(this.player), '#ff5269', 15, 320);
    this.playSound('hurt');
    if (this.player.health <= 0) this.showDeath();
  }

  private spawnPickup(type: PickupType, x: number, y: number, value: number): void {
    this.pickups.push({
      id: this.entityId++, type, x: x - 12, y: y - 12, w: 24, h: 24,
      vx: (Math.random() - .5) * 130, vy: -230 - Math.random() * 80, life: 14, value:type==='shard'?Math.max(1,Math.round(value)):value,
    });
  }

  private updatePickups(dt: number): void {
    const remove = new Set<number>();
    for (const pickup of this.pickups) {
      pickup.life -= dt;
      const pullX = centerX(this.player) - centerX(pickup); const pullY = centerY(this.player) - centerY(pickup); const pullDistance = Math.hypot(pullX, pullY);
      const magnetRadius = pickupMagnetRadius(this.save.upgrades.magnet,this.boonStacks.nerissa);
      if (pullDistance > 0 && pullDistance < magnetRadius) {
        const force = (220 + this.save.upgrades.magnet * 65 + this.boonStacks.nerissa*24) * (1 - pullDistance / magnetRadius + .25);
        pickup.vx += pullX / pullDistance * force * dt; pickup.vy += pullY / pullDistance * force * dt;
      }
      pickup.vy += GRAVITY * .65 * dt;
      const body = { ...pickup, grounded: false };
      this.moveWithPlatforms(body, dt, false);
      pickup.x = body.x;
      pickup.y = body.y;
      pickup.vx *= Math.pow(.22, dt);
      pickup.vy = body.vy;
      if (overlap(pickup, this.player)) {
        let overflowedResource=false;
        if (pickup.type === 'pizza') {
          const healed = Math.min(pickup.value*(1+this.save.upgrades.pizzaQuality*.08), this.player.maxHealth - this.player.health);
          this.player.health += healed;
          overflowedResource=healed<=.01;
          this.floatingText.push({ x: pickup.x, y: pickup.y, text: `+${Math.round(healed)} HP`, color: '#62e59b', life: .8, maxLife: .8, size: 15 });
        } else if (pickup.type === 'coffee') {
          const restored = Math.min(pickup.value*(1+this.save.upgrades.coffeeQuality*.08), this.player.maxEnergy - this.player.energy);
          this.player.energy += restored;
          overflowedResource=restored<=.01;
          this.floatingText.push({ x: pickup.x, y: pickup.y, text: `+${Math.round(restored)} ENERGY`, color: '#b46cff', life: .8, maxLife: .8, size: 15 });
        } else {
          const currencyWithRemainder=pickup.value*(1+this.effectiveBoonStacks('aurelia')*.15)+this.aureliaCurrencyRemainder;
          const awarded=Math.max(1,Math.floor(currencyWithRemainder));this.aureliaCurrencyRemainder=currencyWithRemainder-awarded;
          this.runShards += awarded;
          this.currencyRevealTimer=2.8;
          this.floatingText.push({ x: pickup.x, y: pickup.y, text: `+${awarded} SHARD${awarded === 1 ? '' : 'S'}`, color: '#ffc75a', life: .8, maxLife: .8, size: 14 });
        }
        if(this.boonStacks.belladonna>0){
          const appetitePower=this.effectiveBoonStacks('belladonna');
          this.appetiteMomentumStacks=Math.min(5,this.appetiteMomentumStacks+1);this.appetiteMomentumTimer=3.2+appetitePower*.22;
          this.appetiteRoomPower=Math.min(.4,this.appetiteRoomPower+.02+appetitePower*.008);
          if(overflowedResource){this.player.invulnerable=Math.max(this.player.invulnerable,.3);this.impactBurst(centerX(this.player),centerY(this.player),92+appetitePower*5,8+appetitePower*3,BOONS.belladonna.color,-1);this.floatingText.push({x:centerX(this.player),y:this.player.y-18,text:'FEAST OVERFLOW',color:BOONS.belladonna.accentColor,life:.65,maxLife:.65,size:14});}
        }
        this.burst(centerX(pickup), centerY(pickup), pickup.type === 'pizza' ? '#62e59b' : pickup.type === 'coffee' ? '#b46cff' : '#ffc75a', 10, 180);
        this.playSound('pickup');
        if (this.screen === 'hub' && (pickup.type === 'pizza' || pickup.type === 'coffee')) {
          this.tutorialRecovery.add(pickup.type);
          if (this.tutorialRecovery.size === 2) this.tutorialAction('recovery');
        }
        remove.add(pickup.id);
      }
      if (pickup.life <= 0 || pickup.y > HEIGHT + 50) remove.add(pickup.id);
    }
    this.pickups = this.pickups.filter((pickup) => !remove.has(pickup.id));
  }

  private updateBoonPickup(dt: number): void {
    if (this.boonPickups.length === 0) return;
    for (const pickup of this.boonPickups) pickup.time += dt;
    const selected = this.boonPickups.find((pickup) => overlap(this.player,pickup));
    if (this.rewardInspectionLocked) {
      if (!selected) this.rewardInspectionLocked = false;
      return;
    }
    if (selected) {
      const id = selected.boonId;
      this.burst(centerX(selected), centerY(selected), BOONS[id].color, 34, 430);
      this.shake = 8;
      this.screenFlash = .35;
      this.playSound('boon');
      this.showReward(id);
    }
  }

  private updateParticles(dt: number): void {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
    for (const text of this.floatingText) {
      text.life -= dt;
      text.y -= 40 * dt;
    }
    this.floatingText = this.floatingText.filter((text) => text.life > 0);
    for (const lightning of this.lightningEffects) lightning.life -= dt;
    this.lightningEffects = this.lightningEffects.filter((lightning) => lightning.life > 0);
    for(const ray of this.lightRayEffects)ray.life-=dt;
    this.lightRayEffects=this.lightRayEffects.filter(ray=>ray.life>0);
    for(const gust of this.gustEffects)gust.life-=dt;
    this.gustEffects=this.gustEffects.filter(gust=>gust.life>0);
  }

  private addDamageReadout(enemy:Enemy,amount:number,color:string):void {
    const budget=this.reducedVfx?DAMAGE_TEXT_BUDGET.reduced:DAMAGE_TEXT_BUDGET.normal;
    const numeric=this.floatingText.filter((text)=>/^\d+$/.test(text.text));
    if(numeric.length>=budget){
      const target=numeric.reduce((closest,text)=>Math.hypot(text.x-centerX(enemy),text.y-enemy.y)<Math.hypot(closest.x-centerX(enemy),closest.y-enemy.y)?text:closest,numeric[0]);
      target.text=`${Number(target.text)+Math.round(amount)}`;target.x=centerX(enemy);target.y=enemy.y;target.life=Math.max(target.life,.5);target.maxLife=Math.max(target.maxLife,.65);target.size=Math.max(target.size,amount>30?21:15);target.color=color;
      return;
    }
    this.floatingText.push({x:centerX(enemy),y:enemy.y,text:`${Math.round(amount)}`,color,life:.65,maxLife:.65,size:amount>30?21:15});
  }

  private burst(x: number, y: number, color: string, count: number, speed: number): void {
    if (this.reducedVfx) count = Math.max(3, Math.ceil(count * .38));
    const effectBudget = (this.reducedVfx ? PARTICLE_EFFECT_BUDGET.reduced : PARTICLE_EFFECT_BUDGET.normal) - this.particles.length;
    count = Math.max(0, Math.min(count, effectBudget));
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (.25 + Math.random() * .75);
      const life = .25 + Math.random() * .45;
      this.particles.push({
        x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity,
        life, maxLife: life, size: 2 + Math.random() * 6, color, gravity: 180,
      });
    }
  }

  private checkRoomState(dt: number): void {
    const living = this.enemies.filter((enemy) => !enemy.dead);
    if (this.currentDepth === 2 && this.room.type === 'miniboss' && !this.isEndless && !this.roomCleared && living.length === 0 && this.fanClubWave < 3) {
      if (this.fanClubIntermission <= 0) {
        this.fanClubIntermission = 1.05;
        this.showToast(`WAVE ${this.fanClubWave} BROKEN · NEXT CHORUS INCOMING`);
      } else {
        this.fanClubIntermission -= dt;
        if (this.fanClubIntermission <= 0) this.spawnFanClubWave(this.fanClubWave + 1);
      }
      return;
    }
    if (this.currentDepth === 8 && this.room.type === 'miniboss' && !this.isEndless && !this.roomCleared && living.length === 0 && this.daughterRelayWave < 3) {
      if(this.daughterRelayIntermission<=0){this.daughterRelayIntermission=1.15;this.showToast(`ROYAL RELAY ${this.daughterRelayWave} BROKEN · NEXT PILLARS INCOMING`);}
      else{this.daughterRelayIntermission-=dt;if(this.daughterRelayIntermission<=0)this.spawnDaughterRelayWave(this.daughterRelayWave+1);}
      return;
    }
    if (this.currentDepth === 9 && this.room.type === 'miniboss' && !this.isEndless && !this.roomCleared && living.length === 0 && this.bossRushWave < 7) {
      if(this.bossRushIntermission<=0){this.bossRushIntermission=1.25;this.showToast(`LORD ${this.bossRushWave} REMEMBERED · NEXT MEMORY FORMING`);}
      else{this.bossRushIntermission-=dt;if(this.bossRushIntermission<=0)this.spawnBossRushWave(this.bossRushWave+1);}
      return;
    }
    const wagerReward = Boolean(this.activeWager && !this.activeWager.failed && (this.activeWager.type === 'perfect' || this.activeWager.type === 'chaos'));
    const rewardRoom = this.room.type === 'miniboss' || this.room.type === 'boss' || this.room.rewardKind === 'arcane-cache' || this.room.rewardKind === 'major-boon' || wagerReward;
    if (!this.roomCleared && !this.bossDefeated && living.length === 0) {
      this.awardRoomClear();
      if (rewardRoom) {
        this.bossDefeated = true;
        if (this.room.type === 'boss') this.music.requestState(this.bossDefeatedMusicState());
        this.rewardDelay = .85;
      } else {
        const openGate = () => {
          this.roomCleared = true;
          this.showToast('Room cleared — the gate is open');
        };
        if (this.room.clearDialogue) this.showDialogueBeat(this.room.clearDialogue, 'playing', openGate);
        else openGate();
      }
    }
    if (this.rewardDelay > 0) {
      this.rewardDelay -= dt;
      if (this.rewardDelay <= 0 && !this.rewardGranted) {
        this.rewardGranted = true;
        this.spawnBoonChoices();
      }
    }
    if (this.roomCleared && this.rewardDelay <= 0 && overlap(this.player, this.room.exit)) {
      this.markRoomCleared();
      const branches = this.routeBranches[this.roomIndex];
      if (this.isEndless) this.continueEndless();
      else if (branches && !this.branchChosenAt.has(this.roomIndex)) this.showRouteChoice(branches);
      else if (this.roomIndex < this.runRooms.length - 1) this.loadRoom(this.roomIndex + 1);
    }
  }

  private markRoomCleared(): void {
    if (this.clearedRoomIndices.has(this.roomIndex)) return;
    this.clearedRoomIndices.add(this.roomIndex);
    this.telemetry.recordRoom(performance.now(),this.screen,'cleared',{
      depth:this.currentDepth,roomIndex:this.roomIndex,roomType:this.room.type,
      entry:this.room.entrySide??'left',exit:this.room.exitSide??'right',seed:this.runSeed,
    });
    this.runMetrics.roomsCleared += 1;
    this.save.lifetimeRooms += 1;
    let xp = DIVE_XP_REWARDS.room;
    if (this.room.type === 'elite') xp += DIVE_XP_REWARDS.eliteRoomBonus;
    if (this.room.wagerType) xp += DIVE_XP_REWARDS.challengeRoomBonus;
    if (this.isEndless && this.room.type === 'boss') xp += DIVE_XP_REWARDS.deepDiveBoss;
    if (this.isEndless && this.endlessRoom > this.save.bestEndless) {
      this.save.bestEndless = this.endlessRoom;
      xp += DIVE_XP_REWARDS.deepDiveRecord;
    }
    this.awardProfileXp(xp, this.room.type === 'elite' ? 'Elite room cleared' : this.room.type === 'boss' ? 'Boss room cleared' : 'Room cleared', true);
  }

  private showRouteChoice(options: RouteChoice[]): void {
    this.screen = 'route';
    const routeIcons: Record<RouteKind,string> = { combat:'⚔', elite:'♛', recovery:'✚', cache:'✦', wager:'♦', event:'?' };
    const cards = options.map((option,index) => `<button class="route-card" data-route="${index}" style="--accent:${option.kind==='elite'?'#ff5269':option.kind==='recovery'?'#62e59b':option.kind==='wager'?'#ffc75a':'#a85cff'}">
      <i class="route-icon" aria-hidden="true">${routeIcons[option.kind]}</i><small>${'◆'.repeat(option.danger)}${'◇'.repeat(3-option.danger)} · ${option.kind.toUpperCase()}</small><b>${option.label}</b><span>${option.description}</span><em>REWARD · ${option.reward}</em>
    </button>`).join('');
    const routeAccent=this.currentDepth>=9?'#eee8ff':this.currentDepth===8?'#ff4f9a':this.currentDepth===7?'#8ff7ff':this.currentDepth===6?'#bc7cff':this.currentDepth===5?'#8ee7ff':this.currentDepth===4?'#ffe05a':this.currentDepth===3?'#df5545':this.currentDepth===2?'#48e3eb':'#a85cff';
    this.overlay.innerHTML = `<div class="panel route-panel" style="--accent:${routeAccent}"><p class="eyebrow">${this.currentDistrictName()} forks · route preview</p><h2>Choose the Next Door</h2><p class="lede">WASD selects · J / K confirms. Danger and reward are disclosed.</p><div class="route-cards">${cards}</div><p class="seed-label">RUN SEED ${this.runSeed.toString(16).toUpperCase().padStart(8,'0')}</p></div>`;
    this.overlay.querySelectorAll<HTMLButtonElement>('[data-route]').forEach((button) => button.addEventListener('click',()=>{
      const option = options[Number(button.dataset.route)];
      this.runMetrics.routeChoices.push(option.id);
      this.overlay.innerHTML = '';
      this.screen = 'playing';
      this.playSound('boon');
      if (this.pendingEndlessRoom > 0) {
        this.endlessRoom = this.pendingEndlessRoom; this.pendingEndlessRoom = 0;
        this.runMetrics.endlessDepth = Math.max(this.runMetrics.endlessDepth,this.endlessRoom);
        this.runRooms.push(option.room);
        this.loadRoom(this.runRooms.length-1);
      } else {
        this.branchChosenAt.add(this.roomIndex);
        this.runRooms[this.roomIndex+1] = option.room;
        this.loadRoom(this.roomIndex+1);
      }
    }));
    const first=this.overlay.querySelector<HTMLButtonElement>('[data-route]'); if(first)this.focusMenuButton(first);
  }

  private awardRoomClear(): void {
    if (this.roomGrade) return;
    this.markRoomCleared();
    this.roomGrade = roomGradeFor(this.roomDamageTaken, this.roomTime, this.room.type);
    if (this.roomGrade === 'S') { this.save.sRanks += 1; this.persistSave(); }
    this.gradeTimer = 2.7;
    this.playRewardChord('clear');
    const gradeReward = this.roomGrade === 'S' ? 3 : this.roomGrade === 'A' ? 2 : this.roomGrade === 'B' ? 1 : 0;
    for (let i = 0; i < gradeReward; i += 1) this.spawnPickup('shard', WIDTH / 2 + (i - gradeReward / 2) * 34, FLOOR_Y - 90, 1);
    this.addStyle(this.roomGrade === 'S' ? 18 : this.roomGrade === 'A' ? 11 : this.roomGrade === 'B' ? 6 : 2, `${this.roomGrade}-RANK CLEAR`);
    this.addRushReward(this.roomGrade === 'S' ? 1000 : this.roomGrade === 'A' ? 700 : this.roomGrade === 'B' ? 500 : 300, this.roomGrade === 'S' ? 42 : this.roomGrade === 'A' ? 30 : 18, WIDTH / 2, FLOOR_Y - 145, `${this.roomGrade} CLEAR`);

    const wagerWon = Boolean(this.activeWager && !this.activeWager.failed);
    const jackpotChance = jackpotChanceFor(this.styleRank, this.wagerMultiplier) + this.save.upgrades.wagerFavor * .012;
    if (wagerWon) {
      this.save.wagersWon += 1;
      this.runMetrics.wagersWon += 1;
      this.awardProfileXp(DIVE_XP_REWARDS.wagerWin, 'Wager won', true);
      if (this.activeWager?.type === 'rush') this.rerollsRemaining += 1;
      this.persistSave();
      this.playSound('wagerResolve');
    }
    if (this.runRng.chance(jackpotChance)) {
      this.save.jackpots += 1; this.persistSave();
      for (let i = 0; i < 6; i += 1) this.spawnPickup('shard', WIDTH / 2 + (i - 2.5) * 36, FLOOR_Y - 125 - (i % 2) * 25, 1);
      this.player.health = this.player.maxHealth; this.player.energy = this.player.maxEnergy;
      this.addRushReward(1800, 55, WIDTH / 2, FLOOR_Y - 170, 'JACKPOT');
      this.screenFlash = 1; this.shake = 15; this.burst(WIDTH / 2, FLOOR_Y - 100, '#ffc75a', 70, 650); this.playSound('jackpot');
      this.announce('Infernal jackpot');
      this.showToast('INFERNAL JACKPOT · FULL RESTORE + 6 SHARDS');
    } else if (wagerWon) {
      this.showToast(`WAGER WON · ${this.roomGrade}-RANK · REWARD SECURED`);
    } else if (this.activeWager?.failed) {
      this.playSound('wagerResolve');
      this.showToast(`${this.roomGrade}-RANK CLEAR · WAGER LOST`);
    } else this.showToast(`${this.roomGrade}-RANK ROOM CLEAR`);
  }

  private applyBoon(id: BoonId, announce = true): void {
    this.boonStacks[id] += 1;
    this.runMetrics.boonsAcquired += 1;
    this.runMetrics.rewardChoices.push(id);
    if (id === 'maris') {
      this.player.maxHealth += 10;
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 10);
    } else if (id === 'noctissa') {
      this.player.dashCharges += 1;
    } else if (id === 'isolde') {
      this.player.airJumps = Math.max(this.player.airJumps, 2);
    } else if (id === 'seraphine' && this.boonStacks[id] === 1) {
      this.player.shieldCharges = Math.max(this.player.shieldCharges, 1);
    }
    if (!this.save.collection.includes(id)) this.save.collection.push(id);
    this.boonPulseColor = BOONS[id].color; this.boonColorPulse = 1;
    this.burst(centerX(this.player), centerY(this.player), BOONS[id].color, 38, 520);
    if (announce) this.showToast(`${BOONS[id].name} stack ×${this.boonStacks[id]}`);
  }

  private chooseRewardBoons(count = 2, reroll = false): BoonId[] {
    const rescueIds: BoonId[]=this.currentDepth>=8?[]:this.currentDepth===7?['noctissa']:this.currentDepth===6?['aurelia']:this.currentDepth===5?['solara']:this.currentDepth===4?['luna']:this.currentDepth===3?['crya']:this.currentDepth===2?['flora','voltara']:['maris','gaia','zephyra'];
    const rescued = rescueIds.filter(id => this.save.unlocked.includes(id));
    const levelPool: BoonId[]=this.currentDepth>=9?BOON_ORDER.filter(id=>id!=='seraphine'):this.currentDepth===8?BOON_ORDER.filter(id=>id!=='lilith'&&id!=='seraphine'):this.currentDepth===7?['pyrra','maris','gaia','zephyra','flora','voltara','crya','luna','solara','aurelia','noctissa','belladonna','nerissa','roxyne','calyptra','isolde','somnia']:this.currentDepth===6?['pyrra','maris','gaia','zephyra','flora','voltara','crya','luna','solara','aurelia','belladonna','nerissa','roxyne','calyptra','isolde']:this.currentDepth===5?['pyrra','maris','gaia','zephyra','flora','voltara','crya','luna','solara','belladonna','nerissa','roxyne','calyptra']:this.currentDepth===4?['pyrra','maris','gaia','zephyra','flora','voltara','crya','roxyne','luna']:this.currentDepth===3?['pyrra','maris','gaia','zephyra','flora','voltara','crya']:this.currentDepth===2?['pyrra','maris','gaia','zephyra','flora','voltara']:['pyrra','maris','gaia','zephyra'];
    const unlockedPool = BOON_ORDER.filter((id) => this.save.unlocked.includes(id)||levelPool.includes(id));
    const minibossPool: BoonId[] = rescued.length ? rescued : this.currentDepth>=8?levelPool:this.currentDepth===7?['noctissa']:this.currentDepth===6?['aurelia']:this.currentDepth===5?['solara']:this.currentDepth===4?['luna']:this.currentDepth===3?['crya']:this.currentDepth===2?['flora','voltara']:['maris'];
    const pool: BoonId[] = this.room.type === 'miniboss' ? [...new Set<BoonId>([...minibossPool,...unlockedPool])] : unlockedPool;
    const forcedBoon: BoonId | undefined = this.room.type === 'miniboss' && this.currentDepth === 7 && this.boonStacks.noctissa === 0 ? 'noctissa'
      : this.room.type === 'miniboss' && this.currentDepth === 6 && this.boonStacks.aurelia === 0 ? 'aurelia'
      : this.room.type === 'miniboss' && this.currentDepth === 5 && this.boonStacks.solara === 0 ? 'solara'
      : this.room.type === 'miniboss' && this.currentDepth === 4 && this.boonStacks.luna === 0 ? 'luna'
      : this.room.type !== 'boss' ? undefined
      : this.currentDepth === 1 && this.boonStacks.belladonna === 0 ? 'belladonna'
      : this.currentDepth === 2 && this.boonStacks.nerissa === 0 ? 'nerissa'
      : this.currentDepth === 3 && this.boonStacks.roxyne === 0 ? 'roxyne'
      : this.currentDepth === 4 && this.boonStacks.calyptra === 0 ? 'calyptra'
      : this.currentDepth === 5 && this.boonStacks.isolde === 0 ? 'isolde'
      : this.currentDepth === 6 && this.boonStacks.somnia === 0 ? 'somnia'
      : this.currentDepth === 7 && this.boonStacks.vespera === 0 ? 'vespera'
      : this.currentDepth === 8 && this.boonStacks.lilith === 0 ? 'lilith'
      : this.currentDepth >= 9 && this.boonStacks.seraphine === 0 ? 'seraphine' : undefined;
    const result=chooseSmartBoonOffers({pool,stacks:this.boonStacks,startingBoon:this.selectedStartingBoon,lastRewardBoon:this.lastRewardBoon,drought:this.boonOfferDrought,rng:this.runRng,count,reroll,forcedBoon});
    this.boonOfferDrought=result.drought;
    return result.choices;
  }

  private spawnBoonChoices(reroll = false): void {
    const choices = this.chooseRewardBoons(2,reroll);
    this.rewardInspectionLocked = false;
    const spacing=170; const start=WIDTH/2-((choices.length-1)*spacing)/2-30;
    this.boonPickups = choices.map((boonId,index)=>({x:start+index*spacing,y:FLOOR_Y-150,w:60,h:60,boonId,time:index*.22}));
    this.showToast(`ARCANE CHOICE · TWO OFFERS · ${reroll?'REROLL FOLLOWS YOUR BUILD':'BUILD AFFINITY ACTIVE'}`);
  }

  private showReward(id: BoonId): void {
    const boon = BOONS[id];
    const portraitUrl = this.portraitDataUrl(id);
    const wasUnlocked = this.save.unlocked.includes(id);
    const specialAlreadyEquipped = boon.special === this.player.special;
    this.screen = 'reward';
    this.overlay.innerHTML = `
      <div class="panel reward-panel" style="--accent:${boon.color}">
        <div class="reward-grid">
          <div class="reward-sigil">${portraitUrl ? `<img src="${portraitUrl}" alt="${boon.name}">` : boon.glyph}<i>${boon.glyph}</i><small>ARCANE BOON</small></div>
          <div>
            <p class="eyebrow">${wasUnlocked ? `Current stack ×${this.boonStacks[id]} · confirm pickup` : 'New boon-giver · confirm pickup'}</p>
            <h2>${boon.name}: ${boon.title}</h2>
            <p class="reward-role">${boon.identity} <span>·</span> ${boon.role}</p>
            <div class="reward-list">
              <div class="reward-item"><i>◆</i><span><b>Arcane modifier</b>${boon.arcaneDescription}</span></div>
              <div class="reward-item"><i>↑</i><span><b>Passive stack</b>${boon.passiveDescription}</span></div>
              <div class="reward-item"><i>✦</i><span><b>Special · ${this.getSpecialCost(boon.special) === 0 ? 'Automatic' : `${this.getSpecialCost(boon.special)} energy`}</b>${boon.specialDescription}</span></div>
              <div class="reward-item duplicate"><i>×</i><span><b>Next duplicate</b>${boon.duplicateDescription}</span></div>
            </div>
            <p class="choice-label">Arcane modifier and passive stack automatically. WASD selects · J / K confirms · Esc returns to the orbs.</p>
            <div class="btn-row">
              ${specialAlreadyEquipped
                ? `<button class="btn primary" id="keep-special">Take boon + keep equipped ${boon.specialName}</button>`
                : `<button class="btn primary" id="equip-special">Take boon + equip ${boon.specialName}</button>
                   <button class="btn" id="keep-special">Take boon + keep ${this.getSpecialName(this.player.special)}</button>`}
              ${this.rerollsRemaining>0?`<button class="btn" id="reroll-offers">Reroll all offers · ${this.rerollsRemaining}</button>`:''}
              <button class="btn ghost" id="inspect-others">Back to the two orbs</button>
            </div>
          </div>
        </div>
      </div>`;
    this.overlay.querySelector<HTMLButtonElement>('#equip-special')?.addEventListener('click', () => this.claimReward(id,boon.special));
    mustElement<HTMLButtonElement>('#keep-special').addEventListener('click', () => this.claimReward(id,this.player.special));
    this.overlay.querySelector<HTMLButtonElement>('#reroll-offers')?.addEventListener('click',()=>this.rerollRewardOffers());
    mustElement<HTMLButtonElement>('#inspect-others').addEventListener('click',()=>this.cancelRewardInspection());
    this.focusMenuButton(mustElement<HTMLButtonElement>(specialAlreadyEquipped ? '#keep-special' : '#equip-special'));
  }

  private claimReward(id: BoonId, special: SpecialId): void {
    const wasUnlocked = this.save.unlocked.includes(id);
    this.lastRewardBoon = id;
    const grantedStacks=this.isEndless?Math.max(1,this.room.deepDiveBoonStacks??1):1;
    for(let stack=0;stack<grantedStacks;stack+=1)this.applyBoon(id,false);
    this.awardProfileXp(DIVE_XP_REWARDS.boon, 'Boon claimed', true);
    this.playArcaneHarmonyReveal(id);
    this.showToast(`ARCANE CHORD EVOLVED · ${BOONS[id].name.toUpperCase()} ADDS ${boonNoteLabel(id)}`);
    if (this.save.upgrades.boonChoice>0) {
      this.player.health=Math.min(this.player.maxHealth,this.player.health+this.player.maxHealth*.03*this.save.upgrades.boonChoice);
      this.player.energy=Math.min(this.player.maxEnergy,this.player.energy+this.player.maxEnergy*.03*this.save.upgrades.boonChoice);
    }
    if (!wasUnlocked) this.save.unlocked.push(id);
    this.persistSave();
    this.boonPickups = [];
    this.rewardInspectionLocked = false;
    this.resolveReward(special);
  }

  private cancelRewardInspection(): void {
    if (this.screen !== 'reward') return;
    this.screen = 'playing'; this.overlay.innerHTML = '';
    this.rewardInspectionLocked = true;
    this.player.invulnerable = Math.max(this.player.invulnerable,.25);
  }

  private rerollRewardOffers(): void {
    if (this.rerollsRemaining <= 0) return;
    this.rerollsRemaining -= 1;
    this.screen = 'playing'; this.overlay.innerHTML = '';
    this.spawnBoonChoices(true);
    this.rewardInspectionLocked = true;
    this.playRewardChord('rank');
  }

  private resolveReward(special: SpecialId): void {
    this.player.special = special;
    this.overlay.innerHTML = '';
    if (this.room.type === 'boss' && this.isEndless) {
      this.screen='playing'; this.roomCleared=true; this.player.invulnerable=.7;
      this.spawnPickup('pizza',this.player.x+60,this.player.y,30); this.spawnPickup('coffee',this.player.x+98,this.player.y,40);
      this.showToast(`DEEP DIVE MILESTONE ${this.endlessRoom} CLEARED`);
    }
    else if (this.room.type === 'boss' && this.currentDepth === 1) this.showDialogueBeat('level_one_revelation', 'playing', () => this.transitionToLevelTwo());
    else if (this.room.type === 'boss' && this.currentDepth === 2) this.showDialogueBeat('level_two_revelation','playing',()=>this.transitionToLevelThree());
    else if (this.room.type === 'boss' && this.currentDepth === 3) this.showDialogueBeat('level_three_revelation','playing',()=>this.transitionToLevelFour());
    else if (this.room.type === 'boss' && this.currentDepth === 4) this.transitionToLevelFive();
    else if (this.room.type === 'boss' && this.currentDepth === 5) this.transitionToLevelSix();
    else if (this.room.type === 'boss' && this.currentDepth === 6) this.transitionToLevelSeven();
    else if (this.room.type === 'boss' && this.currentDepth === 7) this.transitionToLevelEight();
    else if (this.room.type === 'boss' && this.currentDepth === 8) this.transitionToLevelNine();
    else if (this.room.type === 'boss' && this.currentDepth === 9) this.showVictory();
    else if (this.room.type === 'boss') this.showVictory();
    else {
      this.screen = 'playing';
      if (this.room.type === 'miniboss') this.music.requestState(this.postMinibossMusicState());
      this.roomCleared = true;
      this.player.invulnerable = .5;
      this.spawnPickup('pizza', this.player.x + 70, this.player.y, 25);
      this.spawnPickup('coffee', this.player.x + 105, this.player.y, 35);
      this.showToast(`${this.getSpecialName(special)} equipped — gate open`);
    }
  }

  private getSpecialName(id: SpecialId): string {
    return BOON_ORDER.map((boonId) => BOONS[boonId]).find((boon) => boon.special === id)?.specialName ?? id;
  }

  private bankRun(bonus = 0): number {
    if (this.runBanked) return 0;
    const total = this.runShards + bonus;
    this.save.shards += total;
    this.runBanked = true;
    this.persistSave();
    return total;
  }

  private recordRun(result: SaveData['recentRuns'][number]['result'], banked: number): SaveData['recentRuns'][number] {
    if (this.runMetrics.roomsCleared > 0 || this.runMetrics.enemiesDefeated > 0) this.awardProfileXp(DIVE_XP_REWARDS.completedRun, 'Run completed');
    if (result === 'victory') this.awardProfileXp(DIVE_XP_REWARDS.campaignVictory, this.isEndless ? 'Deep Dive victory' : 'Campaign victory');
    const durationSeconds = Math.max(1,Math.round((performance.now()-this.runMetrics.startedAt)/1000));
    const topBoon = BOON_ORDER.reduce<BoonId | undefined>((best,id)=>!best || this.boonStacks[id]>this.boonStacks[best]?id:best,undefined);
    const record: SaveData['recentRuns'][number] = {
      id:`${this.runSeed.toString(16)}-${Date.now()}`,seed:this.runSeed,result,durationSeconds,
      roomsCleared:this.runMetrics.roomsCleared,endlessDepth:this.runMetrics.endlessDepth,shardsBanked:banked,
      score:this.runScore,highestStyle:Math.round(this.runMetrics.highestStyle),damageTaken:Math.round(this.runMetrics.damageTaken),
      enemiesDefeated:this.runMetrics.enemiesDefeated,boonsAcquired:this.runMetrics.boonsAcquired,
      wagersAttempted:this.runMetrics.wagersAttempted,wagersWon:this.runMetrics.wagersWon,diveXpEarned:this.runMetrics.diveXpEarned,topBoon,
    };
    this.save.lifetimeRuns += 1;
    this.save.recentRuns = [...this.save.recentRuns,record].slice(-10);
    if (result === 'victory' && (this.save.bestRunTime===0 || durationSeconds<this.save.bestRunTime)) this.save.bestRunTime=durationSeconds;
    this.persistSave();
    return record;
  }

  private runSummaryMarkup(record: SaveData['recentRuns'][number]): string {
    const time = `${Math.floor(record.durationSeconds/60)}:${String(record.durationSeconds%60).padStart(2,'0')}`;
    const rank = styleRankFor(record.highestStyle); const topBoon = record.topBoon ? BOONS[record.topBoon] : null;
    return `<div class="run-summary-hero" style="--rank:${rank === 'S' ? '#ff4f9a' : rank === 'A' ? '#ffc75a' : rank === 'B' ? '#57d6c7' : rank === 'C' ? '#53b9ff' : '#8d8496'}">
      <i>${rank}</i><span><small>FINAL SCORE</small><b>${record.score.toLocaleString()}</b><em>✧ ${record.shardsBanked} BANKED</em></span>
      <span class="summary-boon"><small>RUN SIGNATURE</small><b>${topBoon ? `${topBoon.glyph} ${topBoon.name}` : 'PRISM ARCANA'}</b><em>${record.endlessDepth > 0 ? `DEEP DIVE ${record.endlessDepth}` : this.currentDistrictName().toUpperCase()}</em></span>
    </div><div class="run-summary-grid">
      <span><small>TIME</small><b>${time}</b></span><span><small>ROOMS</small><b>${record.roomsCleared}</b></span><span><small>SEED</small><b>${record.seed.toString(16).toUpperCase().padStart(8,'0')}</b></span>
      <span><small>ENEMIES</small><b>${record.enemiesDefeated}</b></span><span><small>BOONS</small><b>${record.boonsAcquired}</b></span><span><small>WAGERS</small><b>${record.wagersWon}/${record.wagersAttempted}</b></span>
      <span><small>DAMAGE TAKEN</small><b>${record.damageTaken}</b></span><span><small>PEAK RUSH</small><b>${rank}</b></span><span><small>DIVE XP</small><b>+${record.diveXpEarned}</b></span>
    </div>`;
  }

  private showDeath(): void {
    this.telemetry.recordDeath(performance.now(),this.screen,{ depth:this.currentDepth,roomIndex:this.roomIndex,seed:this.runSeed,damageTaken:this.runMetrics.damageTaken });
    const banked = this.bankRun();
    const record = this.recordRun('death',banked);
    this.screen = 'dead';
    this.music.requestState('NONE', { fadeSeconds: .8 });
    this.hud.classList.add('hidden');
    this.overlay.innerHTML = `
      <div class="panel compact" style="--accent:#ff5269">
        <p class="eyebrow">The summoning broke</p>
        <h2>Run Over</h2>
        <p class="lede">You banked ${banked} soul shard${banked === 1 ? '' : 's'}. Run boons are gone; permanent upgrades and unlocked boon-givers remain.</p>
        ${this.runSummaryMarkup(record)}
        <div class="btn-row">
          <button class="btn primary" id="retry-seed">Retry same seed</button>
          <button class="btn" id="retry">New route</button>
          <button class="btn" id="return-hub">Return to hub</button>
        </div>
      </div>`;
    mustElement<HTMLButtonElement>('#retry-seed').addEventListener('click', () => { const request=sameSeedRetryRequest(this.runSeed); this.startRun(request.depth,request.seed); });
    mustElement<HTMLButtonElement>('#retry').addEventListener('click', () => { const request=newRunRequest(); this.startRun(request.depth,request.seed); });
    mustElement<HTMLButtonElement>('#return-hub').addEventListener('click', () => this.showHub());
    this.focusFirstMenuButton();
  }

  private showVictory(): void {
    const completedCurrentAlpha=this.currentDepth===CURRENT_ALPHA_FINAL_LEVEL&&!this.isEndless;
    const firstAlphaClear=completedCurrentAlpha&&!this.save.storyFlags.includes(alphaCompletionFlag(CURRENT_ALPHA_FINAL_LEVEL));
    if (completedCurrentAlpha) {
      this.save.wins += 1;
      this.save.endlessUnlocked = true;
      this.persistSave();
    }
    if(firstAlphaClear){this.showAlphaCompletionFinale();return;}
    const canDiveDeeper = this.currentDepth === CURRENT_ALPHA_FINAL_LEVEL && !this.isEndless && this.save.endlessUnlocked;
    if (canDiveDeeper) {
      this.screen='victory'; this.music.requestState(this.bossDefeatedMusicState()); this.hud.classList.add('hidden');
      this.overlay.innerHTML=`<div class="panel compact" style="--accent:#d6c7ff"><p class="eyebrow">The Hollow yields · Milo chooses morning</p><h2>Cash Out or Dive Deeper?</h2>
        <p class="lede">Bank ${this.runShards+10} shards safely, or carry every boon into Deep Dive—the escalating monster mode built for extreme stacks and long runs.</p>
        <div class="endless-preview"><span><b>ROOMS 1–5</b> Rising ecosystem</span><span><b>ROOM 6</b> Altered mini-boss</span><span><b>ROOM 10</b> Empowered boss + new biome</span></div>
        <div class="btn-row"><button class="btn primary" id="dive-deeper">Dive deeper</button><button class="btn" id="cash-out">Cash out safely</button></div></div>`;
      mustElement<HTMLButtonElement>('#dive-deeper').addEventListener('click',()=>this.startEndlessMode());
      mustElement<HTMLButtonElement>('#cash-out').addEventListener('click',()=>this.finishVictoryScreen());
      this.focusFirstMenuButton();
      return;
    }
    this.finishVictoryScreen();
  }

  private showAlphaCompletionFinale(): void {
    const banked=this.bankRun(10);
    const record=this.recordRun('victory',banked);
    const flag=alphaCompletionFlag(CURRENT_ALPHA_FINAL_LEVEL);
    if(!this.save.storyFlags.includes(flag))this.save.storyFlags.push(flag);
    this.persistSave();
    this.screen='credits';this.alphaFinaleEnding=true;this.hud.classList.add('hidden');this.roomLabel.textContent='ALPHA 7.3 · CAMPAIGN COMPLETE';
    this.overlay.innerHTML=`<section class="alpha-finale" id="alpha-finale" role="button" tabindex="0" aria-label="Thanks for playing. Press any key or click to return to the title screen.">
      <div class="alpha-finale-art" aria-hidden="true" style="background-image:radial-gradient(circle at 48% 32%,rgba(245,239,255,.3),transparent 22%),linear-gradient(145deg,#080812,#2d1e3c 48%,#14131a)"></div>
      <div class="alpha-finale-copy"><p class="eyebrow">Morning · Milo's apartment · still messy, now inhabited</p><h2>He Wakes Up.</h2><p>The bills and missed messages are still there. Milo looks at the weed, puts it away, and texts: “Sorry I disappeared. That was on me.” He cleans one corner. On the television, the queens argue about who actually saved Hell. Pizza arrives.</p>
        <p><b>The Hollow was not killed.</b> Milo accepted the self he kept avoiding—and chose to move anyway. Lilith's road is broken. Seraphine answers. Deep Dive is unlocked.</p>
        <div class="alpha-finale-stats"><span><b>${record.roomsCleared}</b> rooms</span><span><b>${record.enemiesDefeated}</b> demons</span><span><b>${record.boonsAcquired}</b> boons</span><span><b>${banked}</b> shards banked</span></div>
        <small>DEMONDIVE · ALPHA 7.3 CAMPAIGN BUILD · CREDITS THEME “ONE MORE DIVE” · CLICK OR PRESS ANY KEY TO RETURN</small></div>
    </section>`;
    const finale=mustElement<HTMLElement>('#alpha-finale');
    finale.addEventListener('pointerup',()=>this.finishAlphaCompletionFinale(),{once:true});
    this.music.requestState('ALPHA_COMPLETE',{fadeSeconds:1.5,onEnded:()=>this.finishAlphaCompletionFinale()});
    finale.focus({preventScroll:true});
  }

  private finishAlphaCompletionFinale(): void {
    if(this.screen!=='credits'||!this.alphaFinaleEnding)return;
    this.alphaFinaleEnding=false;
    this.showTitle();
  }

  private finishVictoryScreen(): void {
    const bonus = 10;
    const banked = this.bankRun(bonus);
    const record = this.recordRun('victory',banked);
    this.screen = 'victory';
    this.music.requestState(this.bossDefeatedMusicState());
    this.hud.classList.add('hidden');
    this.roomLabel.textContent = this.currentDepth <= CURRENT_ALPHA_FINAL_LEVEL ? `LEVEL ${this.currentDepth} COMPLETE` : `DEPTH ${this.currentDepth} TEST COMPLETE`;
    const simulation = this.currentDepth > CURRENT_ALPHA_FINAL_LEVEL;
    this.overlay.innerHTML = `
      <div class="panel compact" style="--accent:#ffc75a">
        <p class="eyebrow">${simulation ? 'Generator stress test complete' : this.currentDepth===9?'Campaign complete':'Campaign level complete'}</p>
        <h2>${simulation ? `Depth ${this.currentDepth} Survived` : this.currentDepth===9?'Milo Faces The Hollow':this.currentDepth===8?'Lilith Yields':this.currentDepth===7?'Vespera Falls':this.currentDepth===6?'Somnia Falls':this.currentDepth===5?'Isolde Falls':this.currentDepth===4?'Calyptra Falls':this.currentDepth===3?'Roxyne Falls':this.currentDepth===2?'Nerissa Falls':'Belladonna Falls'}</h2>
        <p class="lede">${simulation ? `You cleared the maximum-complexity traversal profile.` : this.currentDepth===9?`You banked ${banked} soul shards, completed all nine campaign levels, and finished with ${this.totalBoonStacks()} stacked boons.`:`You banked ${banked} soul shards and finished with ${this.totalBoonStacks()} stacked boons.`}</p>
        ${this.runSummaryMarkup(record)}
        <div class="btn-row">
          <button class="btn primary" id="victory-hub">Return to the expanded hub</button>
          <button class="btn" id="victory-again">New route</button>
          <button class="btn ghost" id="victory-seed">Replay seed</button>
        </div>
      </div>`;
    mustElement<HTMLButtonElement>('#victory-hub').addEventListener('click', () => this.showHub());
    mustElement<HTMLButtonElement>('#victory-again').addEventListener('click', () => this.startRun(1));
    mustElement<HTMLButtonElement>('#victory-seed').addEventListener('click', () => this.startRun(1,this.runSeed));
    this.focusFirstMenuButton();
  }

  private startEndlessMode(): void {
    this.isEndless=true; this.endlessRoom=0; this.pendingEndlessRoom=0;
    this.endlessRecoveryCharges=this.save.upgrades.endlessPrep;
    this.runRooms=[];this.routeBranches={};this.branchChosenAt.clear();this.clearedRoomIndices.clear();this.roomIndex=0;
    this.screen='playing'; this.overlay.innerHTML=''; this.hud.classList.remove('hidden');
    this.player.health=Math.min(this.player.maxHealth,this.player.health+Math.max(20,this.player.maxHealth*.2));
    this.player.energy=this.player.maxEnergy;
    this.loadEndlessRoom(1);
    this.music.requestState(this.explorationMusicState());
    this.showToast('DEEP DIVE · TEN-ROOM BIOME · CASH OUT FROM PAUSE');
  }

  private buildEndlessRoom(index: number, variant: number): RoomDefinition {
    const depth=deepDiveBiome(this.runSeed,index);const cycle=deepDiveCycle(index);const encounter=deepDiveEncounter(index);const route=deepDiveRoute(this.runSeed,index);
    const seed = new SeededRandom(`${this.runSeed}:deep-dive:${index}:${variant}`).seed;
    const plan = generateRunPlan(depth,seed);
    const forcedRecovery=variant===2&&encounter==='combat';
    const roomType:RoomDefinition['type']=forcedRecovery?'recovery':encounter==='boss'?'boss':encounter==='miniboss'?'miniboss':variant===1?'elite':'combat';
    const source=plan.rooms.find(room=>room.type===(encounter==='boss'?'boss':encounter==='miniboss'?'miniboss':'combat'))??plan.rooms[0];
    const frame=buildRoomFrame(roomType,depth,index+cycle*2+(variant===1?4:0),route.entrySide,route.exitSide,seed,index+variant*17);
    const districts:Record<number,[RoomDefinition['theme'],string]>={1:['alley','Neon Maw'],2:['reef','Drowned Court'],3:['grove','Thornwild'],4:['casino','Thunder Jackpot'],5:['basilica','Frozen Basilica'],6:['motel','Forever Motel'],7:['city','City of a Thousand Faces'],8:['capital',"Lilith's Throne"],9:['selfBelow','The Self Below']};
    const district=districts[depth];const powers=deepDivePowers(this.runSeed,index);const doubleBoss=deepDiveIsDoubleBoss(index);
    const room:RoomDefinition={...source,...frame,type:roomType,theme:encounter==='combat'?district[0]:source.theme,entryDialogue:undefined,clearDialogue:undefined,entrySide:route.entrySide,exitSide:route.exitSide,mapX:route.mapX,mapY:route.mapY,stageDepth:depth,subtitle:`Deep Dive · ${district[1]} · Cycle ${cycle} · Room ${index}`,seedKey:`deep-dive-${index}-${variant}`,deepDiveCycle:cycle,deepDivePowers:powers,deepDiveBoonStacks:deepDiveRewardStacks(index),deepDiveWagerTier:cycle,doubleBoss,routeKind:roomType==='elite'?'elite':roomType==='recovery'?'recovery':'combat',danger:roomType==='elite'||encounter!=='combat'?3:2};
    room.hazards=room.hazards.filter(hazard=>hazard.x>=125&&hazard.x+hazard.w<=WIDTH-125);
    room.spawns=room.spawns.filter(spawn=>spawn.x>=135&&spawn.x+ENEMY_BODIES[spawn.type].w<=WIDTH-135);

    const ecosystems:Record<number,EnemyType[]>={1:['imp','floater','succubus','hellhound','crawler','siren'],2:['drownedFan','chorusWisp','courtCantor','reefHound','bubbleCrab','spotlightDancer'],3:['thornStalker','sporeMaw','vineLurker','razorBoar','rootMaw','thornArcher'],4:['jackpotGremlin','cardDealer','diceHound','railWisp','slotMimic','jinxCroupier'],5:['icePenitent','choirShard','reliquaryKnight','frostHound','glassDeacon','preservationWisp'],6:['luggageImp','sleepwalker','keyholeWisp','bellhopMimic','hallwayHound','wakeUpCaller'],7:['mirrorPunk','prismWisp','facelessStriker','glassHound','echoSniper','reflectionKnight'],8:['throneLegionary','charmAcolyte','portalHound','bloodCantor','decreeWisp','hollowSuccubus'],9:['hollowShade','reflectionKnight','wakeUpCaller','glassDeacon','thornArcher','portalHound']};
    const roomRng=new SeededRandom(`${seed}:ecosystem`);
    if(roomType==='combat'||roomType==='elite'){
      const minimum=deepDiveMinimumEnemies(index)+(roomType==='elite'?1:0);const candidates=[190,330,470,620,770,920,1070,250,545,840,1130];
      while(room.spawns.length<minimum){const type=roomRng.pick(ecosystems[depth]);const x=candidates[room.spawns.length%candidates.length];room.spawns.push({type,x,y:FLOOR_Y-ENEMY_BODIES[type].h});}
      const mixed=deepDiveCrossPollination(index);const foreignDepths=([1,2,3,4,5,6,7,8,9] as const).filter(value=>value!==depth);
      for(let mixedIndex=0;mixedIndex<mixed&&mixedIndex<room.spawns.length;mixedIndex+=1){const type=roomRng.pick(ecosystems[roomRng.pick(foreignDepths)]);const target=room.spawns.length-1-mixedIndex;room.spawns[target]={...room.spawns[target],type,y:FLOOR_Y-ENEMY_BODIES[type].h};}
      room.name=roomType==='elite'?`Cycle ${cycle} · Cross-Pollinated Elite`:`Cycle ${cycle} · ${district[1]} Ecosystem`;
      room.objective=roomType==='elite'?'Break the mutated elite formation':'Clear the escalating ecosystem';
    }
    if(encounter==='miniboss'){
      room.name=`${source.name} · Altered Arena`;room.objective='Defeat the mini-boss and its foreign predators';
      const foreignDepth=roomRng.pick(([1,2,3,4,5,6,7,8,9] as const).filter(value=>value!==depth));for(const x of [220,1035]){const type=roomRng.pick(ecosystems[foreignDepth]);room.spawns.push({type,x,y:FLOOR_Y-ENEMY_BODIES[type].h});}
      if(foreignDepth===6)room.hazards.push({type:'dreamDoor',x:270,y:500,w:72,h:150,damage:0,forceX:972,forceY:540},{type:'dreamDoor',x:944,y:500,w:72,h:150,damage:0,forceX:306,forceY:540});
      else room.hazards.push(foreignDepth===2?{type:'current',x:390,y:575,w:190,h:73,damage:0,forceX:185}:foreignDepth===3?{type:'snare',x:750,y:565,w:145,h:85,damage:0,forceX:-100}:foreignDepth===4?{type:'electric',x:535,y:610,w:210,h:40,damage:18,cycleOffset:.4}:foreignDepth===5?{type:'ice',x:535,y:610,w:210,h:40,damage:0,forceX:75}:foreignDepth===7?{type:'mirror',x:624,y:300,w:22,h:350,damage:0,forceX:-1,forceY:-.12}:foreignDepth===8?{type:'royalSigil',x:535,y:605,w:210,h:45,damage:18,cycleOffset:.4}:foreignDepth===9?{type:'memoryRift',x:565,y:575,w:150,h:75,damage:16,cycleOffset:.5}:{type:'spikes',x:575,y:626,w:90,h:24,damage:16});
    }
    if(encounter==='boss'){
      room.name=`${source.name} · Cycle ${cycle}`;room.objective=doubleBoss?'Defeat both empowered bosses':'Defeat the empowered boss';
      if(doubleBoss){const otherDepth=roomRng.pick(([1,2,3,4,5,6,7,8,9] as const).filter(value=>value!==depth));const otherBoss:EnemyType=otherDepth===1?'warden':otherDepth===2?'nerissa':otherDepth===3?'roxyne':otherDepth===4?'calyptraBoss':otherDepth===5?'isoldeBoss':otherDepth===6?'somniaBoss':otherDepth===7?'vesperaBoss':otherDepth===8?'lilithBoss':'hollowBoss';room.spawns.push({type:otherBoss,x:230,y:FLOOR_Y-ENEMY_BODIES[otherBoss].h});}
    }
    if(forcedRecovery){room.name='The Quiet Booth';room.objective='Take the earned reprieve';room.spawns=[];room.hazards=[];room.danger=1;}
    room.rewardKind=forcedRecovery?'none':deepDiveHasBoonReward(index)||roomType==='elite'?'major-boon':'none';
    if(deepDiveHasWager(index)&&!forcedRecovery)room.wagerType=roomRng.pick<WagerType>(['blood','perfect','rush','chaos']);
    room.quality=buildRoomQualityMetadata(room.type,depth,index+cycle*2+(variant===1?4:0),room.entrySide??'left',room.exitSide??'right',room);
    return room;
  }

  private loadEndlessRoom(index: number, variant=0): void {
    this.endlessRoom=index; this.runMetrics.endlessDepth=Math.max(this.runMetrics.endlessDepth,index);
    const room=this.buildEndlessRoom(index,variant);
    this.currentDepth=room.stageDepth??3;
    this.runRooms.push(room);
    this.loadRoom(this.runRooms.length-1);
  }

  private continueEndless(): void {
    const next=this.endlessRoom+1;
    if (this.room.type!=='recovery'&&deepDiveEncounter(next)==='combat'&&this.player.health<this.player.maxHealth*.3 && this.endlessRecoveryCharges>0) {
      this.endlessRecoveryCharges-=1; this.loadEndlessRoom(next,2); this.showToast(`DEEP POCKETS RECOVERY · ${this.endlessRecoveryCharges} LEFT`); return;
    }
    if (!deepDiveHasRouteChoice(next)) { this.loadEndlessRoom(next); return; }
    const safe=this.buildEndlessRoom(next,0); const elite=this.buildEndlessRoom(next,1);
    this.pendingEndlessRoom=next;
    this.showRouteChoice([
      {id:`deep-dive-${next}-combat`,label:'Hold the Biome',description:'Stay with the block ecosystem at normal pressure.',danger:2,reward:safe.rewardKind==='major-boon'?'Curated boon + Rush':'Shards + Rush',kind:'combat',room:safe},
      {id:`deep-dive-${next}-elite`,label:'Cross-Pollinate',description:'Add an elite mutation for a guaranteed stacked boon.',danger:3,reward:`Premium boon ×${elite.deepDiveBoonStacks??1}`,kind:'elite',room:elite},
    ]);
  }

  private cashOutEndless(): void {
    const banked=this.bankRun(10+Math.floor(this.endlessRoom/3)*2);
    const record=this.recordRun('returned',banked);
    this.screen='victory'; this.music.requestState(this.bossDefeatedMusicState()); this.hud.classList.add('hidden');
    this.overlay.innerHTML=`<div class="panel compact" style="--accent:#ffc75a"><p class="eyebrow">Deep Dive extraction</p><h2>Depth ${this.endlessRoom} Banked</h2><p class="lede">You chose the smart exit and kept every earned soul shard.</p>${this.runSummaryMarkup(record)}<div class="btn-row"><button class="btn primary" id="cashout-hub">Return to Hellroom</button><button class="btn" id="cashout-new">New route</button></div></div>`;
    mustElement<HTMLButtonElement>('#cashout-hub').addEventListener('click',()=>this.showHub());
    mustElement<HTMLButtonElement>('#cashout-new').addEventListener('click',()=>this.startRun(1));
    this.focusFirstMenuButton();
  }

  private totalBoonStacks(): number {
    return Object.values(this.boonStacks).reduce((sum, stacks) => sum + stacks, 0);
  }

  private togglePause(): void {
    if (this.screen === 'dialogue') {
      this.finishDialogue();
    } else if (this.screen === 'playing') {
      this.previousScreen = this.screen;
      this.screen = 'paused';
      this.music.pause();
      this.renderPauseMenu();
    } else if (this.screen === 'paused') {
      this.screen = this.previousScreen;
      this.overlay.innerHTML = '';
      this.music.resume();
      this.lastTime = performance.now();
    }
  }

  private renderPauseMenu(): void {
    this.overlay.innerHTML = `
      <div class="panel compact" style="--accent:#b46cff">
        <p class="eyebrow">Time stopped</p><h2>Paused</h2>
        <p class="lede">Infernal Rush multiplies score and fills the gold payout bar. Every full payout creates a permanent soul shard—stay aggressive, dodge cleanly, and protect your rank.</p>
        <div class="btn-row">
          <button class="btn primary" id="resume">Resume</button>
          <button class="btn primary" id="repair-audio">Repair + test music and Arcane audio</button>
          <button class="btn" id="open-settings">Audio & accessibility</button>
          <button class="btn" id="toggle-shake">Screen shake: ${this.shakeEnabled ? 'On' : 'Off'}</button>
          <button class="btn" id="toggle-vfx">Reduced flashes: ${this.reducedVfx ? 'On' : 'Off'}</button>
          ${this.isEndless?'<button class="btn primary" id="cashout-endless">Cash out Deep Dive</button>':''}
          <button class="btn ghost" id="pause-hub">Abandon run</button>
        </div>
      </div>`;
    mustElement<HTMLButtonElement>('#resume').addEventListener('click', () => this.togglePause());
    mustElement<HTMLButtonElement>('#repair-audio').addEventListener('click',()=>this.repairAndTestAudio());
    mustElement<HTMLButtonElement>('#open-settings').addEventListener('click', () => this.showSettings('paused'));
    mustElement<HTMLButtonElement>('#toggle-shake').addEventListener('click', () => { this.shakeEnabled = !this.shakeEnabled; this.save.settings.shake=this.shakeEnabled; this.persistSave(); this.renderPauseMenu(); });
    mustElement<HTMLButtonElement>('#toggle-vfx').addEventListener('click', () => { this.reducedVfx=!this.reducedVfx; this.save.settings.reducedVfx=this.reducedVfx; this.persistSave(); this.renderPauseMenu(); });
    this.overlay.querySelector<HTMLButtonElement>('#cashout-endless')?.addEventListener('click',()=>this.cashOutEndless());
    mustElement<HTMLButtonElement>('#pause-hub').addEventListener('click', () => { const banked=this.bankRun(); this.recordRun('returned',banked); this.showHub(); });
    this.focusFirstMenuButton();
  }

  private showToast(message: string): void {
    this.toastElement.textContent = message;
    this.toastElement.classList.add('show');
    this.toastTimer = 2.1;
  }

  private repairAndTestAudio():void {
    this.save.settings.masterVolume=.8;this.save.settings.musicVolume=.72;this.save.settings.sfxVolume=.9;this.save.settings.sound=true;this.soundEnabled=true;this.persistSave();
    this.music.setMasterVolume(.8);this.music.setMusicVolume(.72);this.music.resume();
    void this.unlockAudio().then(()=>{
      this.playSound('fire');window.setTimeout(()=>this.playSound('enemyHit'),130);window.setTimeout(()=>this.playSound('enemyDown'),270);
      const demo=emptyBoonStacks();for(const id of BOON_ORDER.slice(0,12))demo[id]=1;
      this.arcaneAudio.playReveal(demo,'belladonna',.72);
    });
    this.showToast('AUDIO REPAIRED · FIRE + HIT + DEFEAT + ARCANE TEST');
    window.setTimeout(()=>{if(this.screen==='paused')this.music.pause();},2200);
  }

  private ensureAudioContext():AudioContext|null {
    if(this.audioContext&&this.audioContext.state!=='closed')return this.audioContext;
    try{
      const AudioContextConstructor=window.AudioContext??(window as Window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
      if(!AudioContextConstructor)return null;
      this.audioContext=new AudioContextConstructor();
      this.sfxOutput=this.audioContext.createGain();this.sfxOutput.gain.value=1;this.sfxOutput.connect(this.audioContext.destination);
      this.sfxNoiseBuffer=null;
      return this.audioContext;
    }catch{return null;}
  }

  private async unlockAudio():Promise<void> {
    const context=this.ensureAudioContext();
    const tasks:Promise<unknown>[]=[this.music.unlock()];
    if(context?.state==='suspended')tasks.push(context.resume());
    await Promise.allSettled(tasks);
  }

  private noiseBuffer(context:AudioContext):AudioBuffer {
    if(this.sfxNoiseBuffer&&this.sfxNoiseBuffer.sampleRate===context.sampleRate)return this.sfxNoiseBuffer;
    const length=Math.ceil(context.sampleRate*.65);const buffer=context.createBuffer(1,length,context.sampleRate);const data=buffer.getChannelData(0);
    for(let index=0;index<length;index+=1)data[index]=(Math.random()*2-1)*(1-index/length*.35);
    this.sfxNoiseBuffer=buffer;return buffer;
  }

  private playSound(kind: ProceduralSfxEvent): void {
    if (!this.sfxIsAudible() || this.activeSfx>=18) return;
    const combatEvent: CombatSfxEvent | undefined = kind === 'hurt' ? 'playerHit'
      : kind === 'enemyHit' || kind === 'enemyShoot' || kind === 'enemyDown' || kind === 'bossDown' ? kind : undefined;
    if (combatEvent && !this.combatSfxLimiter.tryAcquire(combatEvent,performance.now()/1000)) return;
    const context=this.ensureAudioContext();
    if(!context){if(combatEvent)this.combatSfxLimiter.release(combatEvent);return;}
    const emit=()=>this.emitProceduralSound(context,kind,combatEvent);
    if(context.state==='suspended')void context.resume().then(emit).catch(()=>{if(combatEvent)this.combatSfxLimiter.release(combatEvent);});
    else emit();
  }

  private emitProceduralSound(context:AudioContext,kind:ProceduralSfxEvent,combatEvent?:CombatSfxEvent):void {
    let voiceCounted=false;
    try{
      const profile=PROCEDURAL_SFX_PROFILES[kind],sequence=this.sfxSequence++,pitch=sfxPitchMultiplier(kind,sequence),now=context.currentTime,duration=profile.durationSeconds;
      const output=this.sfxOutput??context.destination;const sfxGain=this.save.settings.masterVolume*this.save.settings.sfxVolume;
      const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=profile.waveform;
      oscillator.frequency.setValueAtTime(profile.startHz*pitch,now);oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,profile.endHz*pitch),now+duration);
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(profile.gain*sfxGain,now+.004);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
      oscillator.connect(gain);gain.connect(output);
      if(profile.secondaryMix>0){const secondary=context.createOscillator(),secondaryGain=context.createGain();secondary.type=kind==='pickup'||kind==='boon'?'sine':'triangle';secondary.frequency.setValueAtTime(profile.startHz*1.51*pitch,now);secondary.frequency.exponentialRampToValueAtTime(Math.max(22,profile.endHz*.76*pitch),now+duration);secondaryGain.gain.setValueAtTime(.0001,now);secondaryGain.gain.exponentialRampToValueAtTime(profile.gain*profile.secondaryMix*sfxGain,now+.008);secondaryGain.gain.exponentialRampToValueAtTime(.0001,now+duration);secondary.connect(secondaryGain);secondaryGain.connect(output);secondary.start(now);secondary.stop(now+duration);}
      if(profile.noiseMix>0){const source=context.createBufferSource(),filter=context.createBiquadFilter(),noiseGain=context.createGain();source.buffer=this.noiseBuffer(context);filter.type=kind==='land'||kind==='bossDown'?'lowpass':'bandpass';filter.frequency.value=kind==='enemyHit'||kind==='hurt'?1350:kind==='dash'?850:620;filter.Q.value=.72;noiseGain.gain.setValueAtTime(.0001,now);noiseGain.gain.exponentialRampToValueAtTime(profile.gain*profile.noiseMix*sfxGain,now+.002);noiseGain.gain.exponentialRampToValueAtTime(.0001,now+Math.min(duration,.19));source.connect(filter);filter.connect(noiseGain);noiseGain.connect(output);source.start(now);source.stop(now+Math.min(duration,.2));}
      this.activeSfx+=1;voiceCounted=true;oscillator.onended=()=>{this.activeSfx=Math.max(0,this.activeSfx-1);if(combatEvent)this.combatSfxLimiter.release(combatEvent);};oscillator.start(now);oscillator.stop(now+duration);
    }catch{if(voiceCounted)this.activeSfx=Math.max(0,this.activeSfx-1);if(combatEvent)this.combatSfxLimiter.release(combatEvent);}
  }

  private playArcaneBlastSound():void {
    if(!this.sfxIsAudible())return;
    this.arcaneAudio.playBlast(this.boonStacks,this.lastRewardBoon,this.arcaneShotCounter++,this.save.settings.masterVolume*this.save.settings.sfxVolume);
  }

  private playArcaneHarmonyReveal(newBoon:BoonId):void {
    if(!this.sfxIsAudible())return;
    this.music.setDuckDb(-8,.08);window.setTimeout(()=>this.music.setDuckDb(0,.28),760);
    this.arcaneAudio.playReveal(this.boonStacks,newBoon,this.save.settings.masterVolume*this.save.settings.sfxVolume);
  }

  private playRewardChord(kind: 'rank' | 'payout' | 'clear'): void {
    if (!this.sfxIsAudible()) return;
    try {
      const context=this.ensureAudioContext();if(!context)return;if(context.state==='suspended'){void this.unlockAudio();return;}
      const output=this.sfxOutput??context.destination; const notes = kind === 'payout' ? [523.25,783.99,1046.5] : kind === 'clear' ? [261.63,392,523.25] : [329.63,493.88,659.25];
      notes.forEach((frequency,index) => {
        const oscillator = context.createOscillator(); const gain = context.createGain(); const start = context.currentTime + index * .055;
        oscillator.type = kind === 'payout' ? 'sine' : 'triangle'; oscillator.frequency.setValueAtTime(frequency, start); oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.08, start + .28);
        const sfxGain = this.save.settings.masterVolume * this.save.settings.sfxVolume;
        gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(.085 * sfxGain, start + .025); gain.gain.exponentialRampToValueAtTime(.0001, start + .34);
        oscillator.connect(gain); gain.connect(output); oscillator.start(start); oscillator.stop(start + .36);
      });
    } catch { /* Reward audio is enhancement-only. */ }
  }

  private sfxIsAudible():boolean { return this.soundEnabled&&this.save.settings.masterVolume>.001&&this.save.settings.sfxVolume>.001; }

  private announce(text: string): void {
    if (!ANNOUNCER_ENABLED || !this.voiceEnabled || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
    try {
      const utterance = new SpeechSynthesisUtterance(text); const voices = window.speechSynthesis.getVoices();
      utterance.voice = voices.find(voice => /english.*(male|uk)|daniel|google uk english male/i.test(`${voice.name} ${voice.lang}`)) ?? voices.find(voice => voice.lang.startsWith('en')) ?? null;
      utterance.rate = .92; utterance.pitch = .68; utterance.volume = .4 * this.save.settings.masterVolume * this.save.settings.voiceVolume; window.speechSynthesis.speak(utterance);
    } catch { /* Browser voices are optional. */ }
  }

  private updateHud(): void {
    const healthPercent = clamp(this.player.health / this.player.maxHealth * 100, 0, 100);
    const energyPercent = clamp(this.player.energy / this.player.maxEnergy * 100, 0, 100);
    const diveRequirement = diveXpRequired(this.save.diveLevel);
    const divePercent = clamp(this.save.diveXp / diveRequirement * 100, 0, 100);
    this.healthFill.style.width = `${healthPercent}%`;
    this.energyFill.style.width = `${energyPercent}%`;
    this.diveLevelFill.style.width = `${divePercent}%`;
    this.healthText.textContent = `${Math.ceil(this.player.health)} / ${this.player.maxHealth}`;
    this.energyText.textContent = `${Math.floor(this.player.energy)} / ${this.player.maxEnergy}`;
    this.diveLevelText.textContent = `DIVE LV. ${this.save.diveLevel.toLocaleString()} · ${this.save.diveXp.toLocaleString()} / ${diveRequirement.toLocaleString()} XP`;
    const living = this.enemies.filter((enemy) => !enemy.dead).length;
    const fanStatus=this.currentDepth===2&&this.room.type==='miniboss'?` · WAVE ${Math.max(1,this.fanClubWave)}/3${this.fanClubWave===3&&this.enemies.some(enemy=>!enemy.dead&&enemy.type==='fanChampion')?' · ISOLATE CHAMPION':''}`:'';
    const daughterStatus=this.currentDepth===8&&this.room.type==='miniboss'?` · ROYAL RELAY ${Math.max(1,this.daughterRelayWave)}/3`:'';
    const rushStatus=this.currentDepth===9&&this.room.type==='miniboss'?` · LORD ${Math.max(1,this.bossRushWave)}/7`:'';
    const lilithStatus=this.lilithDecreeTimer>0?` · DECREE ${this.lilithDecreeTimer.toFixed(1)}s · ${this.lilithDecreeLabel}`:'';
    const hollow=this.enemies.find(enemy=>!enemy.dead&&enemy.type==='hollowBoss');
    const hollowStatus=hollow?` · PHASE ${hollow.phase+1}/3${hollow.phase===1?(this.isEndless?' · BUILD INTACT':' · BASE KIT'):hollow.phase===2?(this.isEndless?' · DEPTH POWERS STACKED':` · ${this.hollowRestoreQueue.length} VOICES WAITING`):''}`:'';
    const prey=this.enemies.find(enemy=>!enemy.dead&&enemy.type==='perfectPrey');
    const preyStatus=prey?prey.phase===1?' · CORNERED · COUNTERATTACKING · VULNERABLE':' · FLEEING · THORN VOLLEYS ACTIVE':'';
    const dreamGirl=this.enemies.find(enemy=>!enemy.dead&&enemy.type==='dreamGirl');
    const dreamStatus=dreamGirl?` · FANTASY ANCHORS ${this.enemies.filter(enemy=>!enemy.dead&&enemy.type==='fantasyAnchor').length} · DIRECT DAMAGE BLOCKED`:'';
    const exitArrow: Record<GateSide,string> = {left:'←',right:'→',top:'↑',bottom:'↓'};
    const wagerClock = this.activeWager?.type === 'rush' && !this.activeWager.failed ? ` · ${this.activeWager.timer.toFixed(1)}s` : '';
    const snareStatus=this.playerSnareTime>0?` · SNARED ${this.playerSnareTime.toFixed(1)}s · JUMP/DASH READY`:'';
    const deepPowers=this.room.deepDivePowers?.length?` · ${this.room.deepDivePowers.map(power=>power.toUpperCase()).join(' + ')}`:'';
    this.objective.textContent = this.boonPickups.length ? `Choose 1 of ${this.boonPickups.length} Arcane boons` : this.roomCleared ? `Gate open ${exitArrow[this.room.exitSide ?? 'right']}` : this.room.type === 'traversal' || this.room.type === 'recovery' ? this.room.objective : `${this.room.objective} · ${living} left${fanStatus}${daughterStatus}${rushStatus}${lilithStatus}${hollowStatus}${preyStatus}${dreamStatus}${wagerClock}${snareStatus}${deepPowers}`;
    this.runShardsLabel.textContent = `${this.runShards}`;
    const activeBoons = BOON_ORDER.filter((id) => this.boonStacks[id] > 0);
    const synergies=this.activeSynergies();
    const dominant=this.getDominantBoon();
    const attached=selectAttachedBoons(this.boonStacks,BOON_ORDER,dominant);
    const specialCost=this.getSpecialCost(this.player.special);
    const hudView=buildHudPriorityView({xpRevealSeconds:this.xpRevealTimer,currencyRevealSeconds:this.currencyRevealTimer,wagerActive:Boolean(this.activeWager),roomCleared:this.roomCleared,roomIntroSeconds:this.roomIntro,dominantBoon:dominant,attachedBoons:attached,activeBoonCount:activeBoons.length,specialCooldownSeconds:this.player.specialCooldown,specialEnergyCost:specialCost,currentEnergy:this.player.energy});
    this.diveLevelRow.classList.toggle('context-hidden',!hudView.showXp);
    this.currencyDisplay.classList.toggle('context-hidden',!hudView.showCurrency);
    this.roomMap.classList.toggle('context-hidden',!hudView.showRoomMap);
    this.specialName.textContent = `${this.getSpecialName(this.player.special).toUpperCase()} · ${hudView.specialState==='ready'?'READY':hudView.specialState==='cooldown'?'COOLDOWN':`${Math.ceil(specialCost-this.player.energy)} ENERGY`}`;
    const inspecting = Boolean(this.loadoutReturnScreen);
    this.modifierToggle.innerHTML = `<span>Arcana loadout</span><b>${activeBoons.length} active${synergies.length?` · ${synergies.length} synergy${synergies.length===1?'':'ies'}`:''} · inspect</b>`;
    this.modifierToggle.setAttribute('aria-expanded', String(inspecting));
    this.modifierPanel.classList.remove('expanded');
    this.modifierPanel.classList.add('collapsed');
    const visiblePips = hudView.combatBoonIds;
    this.boonPips.innerHTML = visiblePips.map((id) => `<i class="boon-pip" style="color:${BOONS[id].color}">${BOONS[id].glyph}<b>×${this.boonStacks[id]}</b></i>`).join('')
      + (hudView.hiddenBoonCount > 0 ? `<i class="boon-pip boon-more">+${hudView.hiddenBoonCount}</i>` : '');
    const arcane = this.getArcaneColor();
    const arcaneAccent = this.getArcaneAccentColor();
    this.modifierPanel.innerHTML = `
      <div class="modifier-chip flame-chip" style="--boon:${arcane};--flame:${arcane};--flame2:${arcaneAccent}"><span class="glyph">${dominant?BOONS[dominant].glyph:'◆'}</span><b>${dominant?`${BOONS[dominant].name.toUpperCase()}-LED ARCANA`:'NEUTRAL ARCANA'}</b><span>${arcaneHarmonyLabel(this.boonStacks)} · ${dominant?`dominant ×${this.boonStacks[dominant]}`:'unbound'}</span></div>`;
    this.updateRoomMap();
  }

  private showArcanaLoadout(): void {
    if (this.loadoutReturnScreen || (this.screen !== 'playing' && this.screen !== 'paused')) return;
    this.loadoutReturnScreen = this.screen;
    this.screen = 'paused';
    const activeBoons = BOON_ORDER.filter((id) => this.boonStacks[id] > 0);
    const synergies = this.activeSynergies();
    const first = activeBoons[0] ?? this.selectedStartingBoon;
    const arcane = this.getArcaneColor();
    const arcaneAccent = this.getArcaneAccentColor();
    this.overlay.innerHTML = `
      <div class="panel loadout-inspector" style="--accent:${arcane};--arcane:${arcane};--arcane-accent:${arcaneAccent}">
        <div class="loadout-head">
          <div><p class="eyebrow">Run inventory · gameplay paused</p><h2>Arcana Loadout</h2><p>${activeBoons.length} active Arcana · ${this.totalBoonStacks()} total stacks · ${synergies.length} synergies</p></div>
          <button class="btn ghost" id="close-loadout">Close · Esc</button>
        </div>
        <div class="loadout-special"><span>Equipped Special</span><b>${this.getSpecialName(this.player.special)}</b><em>Only the Special is replaced. Every Arcane modifier and passive below remains stacked.</em></div>
        <div class="loadout-layout">
          <div class="loadout-list" role="listbox" aria-label="Acquired Arcana">
            ${activeBoons.map((id) => {
              const boon=BOONS[id]; const equipped=boon.special===this.player.special;
              return `<button class="loadout-boon" role="option" data-loadout-boon="${id}" style="--boon:${boon.color}"><i>${boon.glyph}</i><span><b>${boon.name}</b><small>${boon.title}</small></span><strong>×${this.boonStacks[id]}</strong>${equipped?'<em>EQUIPPED</em>':''}</button>`;
            }).join('')}
          </div>
          <div class="loadout-detail" id="loadout-detail">${this.arcanaDetailMarkup(first)}</div>
        </div>
        <div class="loadout-synergies"><h3>Active Synergies</h3>${synergies.length?synergies.map(synergy=>`<span style="--boon:${synergy.color}"><b>✧ ${synergy.name}</b><em>${synergy.description}</em></span>`).join(''):'<p>No paired Arcana yet. Keep diving.</p>'}</div>
        <p class="choice-label">WASD / arrows inspect · hover or focus for details · Esc resumes</p>
      </div>`;
    mustElement<HTMLButtonElement>('#close-loadout').addEventListener('click',()=>this.closeArcanaLoadout());
    this.overlay.querySelectorAll<HTMLButtonElement>('[data-loadout-boon]').forEach((button)=>{
      const update=()=>{const id=button.dataset.loadoutBoon as BoonId;this.renderArcanaDetail(id);this.overlay.querySelectorAll('[data-loadout-boon]').forEach(candidate=>candidate.classList.toggle('inspecting',candidate===button));};
      button.addEventListener('focus',update);button.addEventListener('pointerenter',update);button.addEventListener('click',update);
    });
    const firstButton=this.overlay.querySelector<HTMLButtonElement>(`[data-loadout-boon="${first}"]`);
    if(firstButton){firstButton.classList.add('inspecting');this.focusMenuButton(firstButton);}else this.focusMenuButton(mustElement<HTMLButtonElement>('#close-loadout'));
    this.updateHud();
  }

  private closeArcanaLoadout(): void {
    if (!this.loadoutReturnScreen) return;
    const returnScreen=this.loadoutReturnScreen;
    this.loadoutReturnScreen=null;
    this.screen=returnScreen;
    this.overlay.innerHTML='';
    this.lastTime=performance.now();
    this.updateHud();
  }

  private renderArcanaDetail(id: BoonId): void {
    const target=this.overlay.querySelector<HTMLElement>('#loadout-detail');
    if(target)target.innerHTML=this.arcanaDetailMarkup(id);
  }

  private arcanaDetailMarkup(id: BoonId): string {
    const boon=BOONS[id]; const stacks=this.boonStacks[id]; const equipped=boon.special===this.player.special;
    const portrait=this.portraitDataUrl(id);
    return `<div class="loadout-detail-hero" style="--boon:${boon.color}">${portrait?`<img src="${portrait}" alt="">`:''}<i>${boon.glyph}</i><span><small>${boon.identity}</small><h3>${boon.name}: ${boon.title}</h3><b>STACK ×${stacks}${equipped?' · SPECIAL EQUIPPED':''}</b></span></div>
      <dl><div><dt>Arcane modifier</dt><dd>${boon.arcaneDescription}</dd></div><div><dt>Passive</dt><dd>${boon.passiveDescription}</dd></div><div><dt>Special · ${boon.specialEnergyCost} energy</dt><dd>${boon.specialName}: ${boon.specialDescription}</dd></div><div><dt>Duplicate growth</dt><dd>${boon.duplicateDescription}</dd></div></dl>`;
  }

  private updateRoomMap(): void {
    if (this.runRooms.length === 0) { this.roomMap.innerHTML = ''; return; }
    const xs = this.runRooms.map((room) => room.mapX ?? 0);
    const ys = this.runRooms.map((room) => room.mapY ?? 0);
    const minX = Math.min(...xs); const maxX = Math.max(...xs);
    const minY = Math.min(...ys); const maxY = Math.max(...ys);
    const point = (room: RoomDefinition) => ({
      x: 8 + (((room.mapX ?? 0) - minX) / Math.max(1, maxX - minX)) * 114,
      y: 5 + (((room.mapY ?? 0) - minY) / Math.max(1, maxY - minY)) * 24,
    });
    const lines = this.runRooms.slice(1).map((room, index) => {
      const a = point(this.runRooms[index]); const b = point(room);
      const dx = b.x - a.x; const dy = b.y - a.y;
      return `<i class="map-line" style="left:${a.x}px;top:${a.y}px;width:${Math.hypot(dx, dy)}px;transform:rotate(${Math.atan2(dy, dx)}rad)"></i>`;
    }).join('');
    const nodes = this.runRooms.map((room, index) => {
      const p = point(room);
      const state = index === this.roomIndex ? 'current' : index < this.roomIndex ? 'visited' : '';
      return `<i class="map-node ${state}" style="left:${p.x}px;top:${p.y}px"></i>`;
    }).join('');
    this.roomMap.innerHTML = lines + nodes;
  }

  private seedAmbientEmbers(): void {
    this.ambientEmbers = Array.from({ length: 48 }, () => ({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      vx: -8 + Math.random() * 16,
      vy: -12 - Math.random() * 35,
      life: 2 + Math.random() * 5,
      maxLife: 7,
      size: 1 + Math.random() * 3,
      color: Math.random() > .4 ? '#ff4f9a' : '#ffc75a',
      gravity: 0,
    }));
  }

  private updateAmbient(dt: number): void {
    for (const ember of this.ambientEmbers) {
      ember.y += ember.vy * dt;
      ember.x += ember.vx * dt;
      if (ember.y < -10) {
        ember.y = HEIGHT + 10;
        ember.x = Math.random() * WIDTH;
      }
    }
  }

  private render(): void {
    const cameraOffset=shapedCameraOffset(this.shake,this.time,this.shakeEnabled);
    this.ctx.save();
    this.ctx.translate(cameraOffset.x, cameraOffset.y);
    const visibleScreen = this.screen === 'dialogue' ? this.dialogueReturnScreen : this.screen;
    if (visibleScreen === 'title') this.renderTitleBackdrop();
    else if (visibleScreen === 'hub') this.renderHub();
    else this.renderRoom();
    this.ctx.restore();
    if (this.screenFlash > 0) {
      this.ctx.fillStyle = `rgba(255,225,240,${this.screenFlash * .32})`;
      this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    if (this.transition > 0) {
      this.ctx.fillStyle = `rgba(5,4,10,${this.transition / .32})`;
      this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    if (this.boonColorPulse > 0) {
      const pulse = this.ctx.createRadialGradient(centerX(this.player), centerY(this.player), 18, centerX(this.player), centerY(this.player), 360);
      pulse.addColorStop(0, `${this.boonPulseColor}${Math.round(this.boonColorPulse * 100).toString(16).padStart(2, '0')}`);
      pulse.addColorStop(1, 'transparent');
      this.ctx.fillStyle = pulse; this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  private renderTitleBackdrop(): void {
    this.drawBackground('throne');
    const moon = this.ctx.createRadialGradient(230, 135, 8, 230, 135, 112);
    moon.addColorStop(0, '#ff8b8fcc'); moon.addColorStop(.55, '#b91f57aa'); moon.addColorStop(1, '#66133800');
    this.ctx.fillStyle = moon; this.ctx.beginPath(); this.ctx.arc(230, 135, 112, 0, Math.PI * 2); this.ctx.fill();
    this.drawSummoningCircle(485, 418, this.titleStartLocked ? 238 : 190, '#a85cff');
    this.drawPortrait('pyrra', 18, 175, 430, .72);
    this.drawPortrait('belladonna', 735, 185, 390, .42);
    this.drawPortrait('milo', 340, 155, 510, 1);
    const handGlow = this.ctx.createRadialGradient(406, 410, 2, 406, 410, this.titleStartLocked ? 165 : 74);
    handGlow.addColorStop(0, '#ffffff'); handGlow.addColorStop(.17, '#d7b1ff'); handGlow.addColorStop(.5, '#8847ff99'); handGlow.addColorStop(1, '#6e31ff00');
    this.ctx.fillStyle = handGlow; this.ctx.fillRect(220, 225, 380, 370);
    const shade = this.ctx.createLinearGradient(0, 0, WIDTH, 0);
    shade.addColorStop(0, 'rgba(4,3,9,.06)'); shade.addColorStop(.52, 'rgba(8,4,14,.18)'); shade.addColorStop(.7, 'rgba(7,4,12,.66)'); shade.addColorStop(1, 'rgba(4,2,8,.95)');
    this.ctx.fillStyle = shade; this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
    this.drawAmbientEmbers(.8);
  }

  private renderHub(): void {
    const boon = BOONS[this.selectedStartingBoon];
    if (this.hubBackdrop.complete && this.hubBackdrop.naturalWidth > 0) this.ctx.drawImage(this.hubBackdrop, 0, 0, WIDTH, HEIGHT);
    else this.drawHellroomBackdrop();
    const altarGlow = this.ctx.createRadialGradient(500, 480, 10, 500, 480, 155);
    altarGlow.addColorStop(0, `${boon.color}55`); altarGlow.addColorStop(1, 'transparent'); this.ctx.fillStyle = altarGlow; this.ctx.fillRect(345, 250, 310, 380);
    this.drawSummoningCircle(500, 516, 65, boon.color);
    this.ctx.save(); this.ctx.textAlign = 'center'; this.ctx.shadowColor = boon.color; this.ctx.shadowBlur = 24;
    this.ctx.fillStyle = boon.accentColor; this.ctx.font = '900 54px Barlow Condensed'; this.ctx.fillText(boon.glyph, 500, 512);
    this.ctx.shadowBlur = 0; this.ctx.fillStyle = '#f9f5ff'; this.ctx.font = '800 12px Barlow Condensed'; this.ctx.fillText(boon.name.toUpperCase(), 500, 558); this.ctx.restore();
    const residentSlots: Array<[BoonId, number, number]> = [['maris',452,214],['gaia',555,214],['zephyra',658,214],['belladonna',761,214]];
    for (const [id,x,y] of residentSlots) if (this.save.unlocked.includes(id)) this.drawHubResident(id,x,y);
    this.ctx.fillStyle = '#ffc75a'; this.ctx.font = '800 14px Barlow Condensed'; this.ctx.textAlign = 'center'; this.ctx.fillText(`✧ ${this.save.shards} SOUL SHARDS`, 818, 360);
    for (const enemy of this.enemies) this.drawEnemy(enemy);
    for (const wave of this.waves) this.drawGroundWave(wave);
    this.drawProjectilesWithBudget();
    this.drawAmbientEmbers(.35);
    this.drawPlayer();
    for (const particle of this.particles) this.drawParticle(particle);
    for (const text of this.floatingText) this.drawFloatingText(text);
    this.drawHubPrompt();
  }

  private drawHubResident(id: BoonId, x: number, y: number): void {
    const boon = BOONS[id]; const pulse = .78 + Math.sin(this.time * 2 + x) * .12;
    this.ctx.save(); this.ctx.translate(x, y); this.ctx.textAlign = 'center';
    this.ctx.fillStyle = 'rgba(8,6,13,.76)'; this.roundRect(-39, -57, 78, 114, 9); this.ctx.fill();
    const portrait = this.boonPortraits.get(id);
    if (portrait?.complete && portrait.naturalWidth > 0) {
      this.ctx.save(); this.roundRect(-36, -54, 72, 101, 7); this.ctx.clip();
      this.ctx.globalAlpha = .9; this.ctx.filter = 'saturate(1.08) contrast(1.04)';
      this.ctx.drawImage(portrait, -37, -55, 74, 99); this.ctx.restore();
    } else {
      const glow = this.ctx.createRadialGradient(0, -9, 3, 0, -9, 32); glow.addColorStop(0, boon.accentColor); glow.addColorStop(.35, `${boon.color}aa`); glow.addColorStop(1, `${boon.color}00`);
      this.ctx.fillStyle = glow; this.ctx.beginPath(); this.ctx.arc(0, -9, 32, 0, Math.PI * 2); this.ctx.fill();
      this.ctx.fillStyle = '#fff'; this.ctx.font = '900 28px Barlow Condensed'; this.ctx.fillText(boon.glyph, 0, 1);
    }
    this.ctx.strokeStyle = `${boon.color}dd`; this.ctx.lineWidth = 2; this.ctx.shadowColor = boon.color; this.ctx.shadowBlur = 16 * pulse; this.roundRect(-37, -55, 74, 106, 8); this.ctx.stroke();
    this.ctx.shadowBlur = 0; this.ctx.fillStyle = 'rgba(5,3,10,.88)'; this.ctx.fillRect(-36, 35, 72, 16);
    this.ctx.fillStyle = boon.accentColor; this.ctx.font = '900 8px Barlow Condensed'; this.ctx.fillText(boon.name.toUpperCase(), 0, 46); this.ctx.restore();
  }

  private drawHellroomBackdrop(): void {
    const wall = this.ctx.createLinearGradient(0, 0, 0, HEIGHT);
    wall.addColorStop(0, '#17131f'); wall.addColorStop(.72, '#29202d'); wall.addColorStop(1, '#120d17');
    this.ctx.fillStyle = wall; this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
    this.ctx.fillStyle = '#0c0910'; this.ctx.fillRect(0, 0, WIDTH, 46);
    this.ctx.fillStyle = '#35283a'; this.ctx.fillRect(0, 455, WIDTH, 175);
    this.ctx.fillStyle = '#17111d'; this.ctx.fillRect(0, 627, WIDTH, 93);
    this.ctx.strokeStyle = 'rgba(255,255,255,.045)'; this.ctx.lineWidth = 2;
    for (let x = 0; x <= WIDTH; x += 160) { this.ctx.beginPath(); this.ctx.moveTo(x, 46); this.ctx.lineTo(x, 455); this.ctx.stroke(); }

    // The earthly bedroom remains visible beneath its infernal overlay.
    this.ctx.fillStyle = '#0d1520'; this.ctx.fillRect(72, 108, 235, 152);
    const night = this.ctx.createLinearGradient(72,108,307,260); night.addColorStop(0,'#15283d');night.addColorStop(1,'#4d1d5a');this.ctx.fillStyle=night;this.ctx.fillRect(82,118,215,132);
    this.ctx.strokeStyle='#62516a';this.ctx.lineWidth=8;this.ctx.strokeRect(72,108,235,152);
    this.ctx.fillStyle='#fff3c5';for(let i=0;i<11;i+=1){const x=91+(i*71)%194,y=128+(i*43)%102;this.ctx.fillRect(x,y,2,2);}
    this.ctx.fillStyle='#211827';this.roundRect(25,405,335,69,13);this.ctx.fill();
    this.ctx.fillStyle='#426278';this.roundRect(38,420,315,54,10);this.ctx.fill();
    this.ctx.fillStyle='#d7dde0';this.roundRect(45,414,89,26,10);this.ctx.fill();
    this.ctx.fillStyle='#141019';this.ctx.fillRect(22,474,342,18);
    this.ctx.fillStyle='#4c3653';this.ctx.fillRect(46,492,18,101);this.ctx.fillRect(326,492,18,101);

    // Boon altar: a real station with a readable focal silhouette.
    this.ctx.fillStyle='#17101d';this.ctx.beginPath();this.ctx.moveTo(432,590);this.ctx.lineTo(462,449);this.ctx.lineTo(538,449);this.ctx.lineTo(570,590);this.ctx.closePath();this.ctx.fill();
    this.ctx.strokeStyle='#9a6cff';this.ctx.lineWidth=3;this.ctx.beginPath();this.ctx.ellipse(500,456,63,19,0,0,Math.PI*2);this.ctx.stroke();
    this.drawSummoningCircle(500,535,74,BOONS[this.selectedStartingBoon].color);
    this.ctx.fillStyle='#c7bdd2';this.ctx.font='800 12px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText('BOON ALTAR',500,614);

    // Milo's desk combines permanent upgrades with the unfinished comic page.
    this.ctx.fillStyle='#241a27';this.ctx.fillRect(692,396,252,20);this.ctx.fillRect(712,416,18,175);this.ctx.fillRect(908,416,18,175);
    this.ctx.fillStyle='#ddd7ce';this.ctx.fillRect(750,374,75,19);this.ctx.fillStyle='#19131d';this.ctx.fillRect(757,377,61,2);
    this.ctx.fillStyle='#4d3658';this.roundRect(842,337,73,57,4);this.ctx.fill();this.ctx.fillStyle='#d89cff';this.ctx.fillRect(850,345,57,39);
    this.ctx.fillStyle='#0f0b13';this.ctx.fillRect(864,394,8,18);
    this.ctx.fillStyle='#ffc75a';this.ctx.font='800 12px Barlow Condensed';this.ctx.fillText('UPGRADES',818,437);

    // Run door: ordinary bedroom door split by an impossible infernal seam.
    this.ctx.fillStyle='#0b0710';this.ctx.fillRect(1137,117,119,513);this.ctx.fillStyle='#302039';this.ctx.fillRect(1148,132,96,498);
    const portal=this.ctx.createLinearGradient(1151,0,1241,0);portal.addColorStop(0,'#4a143d');portal.addColorStop(.5,'#d93d8b');portal.addColorStop(1,'#3b154e');this.ctx.fillStyle=portal;this.ctx.fillRect(1161,151,70,459);
    this.ctx.fillStyle='rgba(255,225,245,.42)';for(let y=165;y<600;y+=31)this.ctx.fillRect(1166+Math.sin(y*.08+this.time)*8,y,56,2);
    this.ctx.fillStyle='#ffc75a';this.ctx.beginPath();this.ctx.arc(1158,375,5,0,Math.PI*2);this.ctx.fill();
    this.ctx.font='800 12px Barlow Condensed';this.ctx.fillText('THE NEON MAW',1196,112);

    this.ctx.strokeStyle='rgba(216,156,255,.2)';this.ctx.lineWidth=2;
    this.ctx.beginPath();this.ctx.moveTo(376,46);this.ctx.lineTo(405,83);this.ctx.lineTo(391,120);this.ctx.lineTo(421,153);this.ctx.moveTo(1028,46);this.ctx.lineTo(1010,91);this.ctx.lineTo(1042,133);this.ctx.stroke();
    this.ctx.fillStyle='rgba(154,108,255,.08)';this.roundRect(382,605,636,18,9);this.ctx.fill();
    this.ctx.strokeStyle='rgba(216,156,255,.18)';this.ctx.lineWidth=2;this.ctx.strokeRect(390,608,620,10);
  }

  private drawHubPrompt(): void {
    if (this.hubModalOpen) return;
    const x = centerX(this.player);
    let label = '';
    let targetX = 0;
    if (Math.abs(x - 500) < 105) { label = `E · CHOOSE BOON (${BOONS[this.selectedStartingBoon].name.toUpperCase()})`; targetX = 500; }
    else if (Math.abs(x - 775) < 105) { label = 'E · USE UPGRADE DESK'; targetX = 775; }
    else if (Math.abs(x - 1000) < 85) { label = 'TRAINING DUMMY · TEST FIRE + SPECIALS'; targetX = 1000; }
    else if (Math.abs(x - 1190) < 105) { label = 'E · BEGIN RUN'; targetX = 1190; }
    if (!label) return;
    this.ctx.save();
    this.ctx.font = '800 15px Barlow Condensed';
    const width = this.ctx.measureText(label).width + 28;
    this.ctx.fillStyle = 'rgba(7,5,12,.88)'; this.ctx.fillRect(targetX - width / 2, 365, width, 34);
    this.ctx.strokeStyle = '#ffffff44'; this.ctx.strokeRect(targetX - width / 2, 365, width, 34);
    this.ctx.fillStyle = '#fff'; this.ctx.textAlign = 'center'; this.ctx.fillText(label, targetX, 387);
    this.ctx.restore();
  }

  private drawPortrait(id: BoonId | 'milo', x: number, y: number, height: number, alpha: number): void {
    const portrait = id === 'milo' ? this.miloPortrait : this.boonPortraits.get(id);
    if (portrait?.complete && portrait.naturalWidth > 0) {
      const width = height * portrait.naturalWidth / portrait.naturalHeight;
      this.ctx.save(); this.ctx.globalAlpha = alpha;
      this.ctx.drawImage(portrait, x, y, width, height); this.ctx.restore();
      return;
    }
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    if (id === 'milo') {
      const width=height*.42;this.ctx.translate(x+width/2,y+height*.92);this.ctx.fillStyle='#0b0714cc';this.ctx.beginPath();this.ctx.ellipse(0,8,width*.42,height*.035,0,0,Math.PI*2);this.ctx.fill();
      this.ctx.strokeStyle='#171020';this.ctx.lineWidth=height*.045;this.ctx.beginPath();this.ctx.moveTo(-width*.12,-height*.32);this.ctx.lineTo(-width*.2,0);this.ctx.moveTo(width*.11,-height*.32);this.ctx.lineTo(width*.23,0);this.ctx.stroke();
      this.ctx.fillStyle='#273647';this.roundRect(-width*.3,-height*.63,width*.6,height*.34,height*.06);this.ctx.fill();this.ctx.fillStyle='#d68873';this.ctx.beginPath();this.ctx.arc(0,-height*.72,height*.09,0,Math.PI*2);this.ctx.fill();
      this.ctx.fillStyle='#37283f';this.ctx.beginPath();this.ctx.moveTo(-height*.1,-height*.78);this.ctx.lineTo(-height*.02,-height*.85);this.ctx.lineTo(height*.02,-height*.78);this.ctx.lineTo(height*.1,-height*.83);this.ctx.lineTo(height*.08,-height*.69);this.ctx.closePath();this.ctx.fill();
      const glow=this.ctx.createRadialGradient(width*.33,-height*.48,2,width*.33,-height*.48,height*.12);glow.addColorStop(0,'#fff');glow.addColorStop(.25,'#e8c9ff');glow.addColorStop(.65,'#a85cffbb');glow.addColorStop(1,'#a85cff00');this.ctx.fillStyle=glow;this.ctx.beginPath();this.ctx.arc(width*.33,-height*.48,height*.12,0,Math.PI*2);this.ctx.fill();
    } else {
      const boon=BOONS[id];const radius=Math.min(height*.32,116);this.ctx.translate(x+radius,y+height*.5);this.ctx.shadowColor=boon.color;this.ctx.shadowBlur=32;this.ctx.fillStyle=`${boon.color}28`;this.ctx.strokeStyle=boon.color;this.ctx.lineWidth=5;this.ctx.beginPath();this.ctx.arc(0,0,radius,0,Math.PI*2);this.ctx.fill();this.ctx.stroke();this.ctx.fillStyle=boon.accentColor;this.ctx.font=`800 ${radius*.95}px Barlow Condensed`;this.ctx.textAlign='center';this.ctx.textBaseline='middle';this.ctx.fillText(boon.glyph,0,4);
    }
    this.ctx.restore();
  }

  private renderRoom(): void {
    this.drawBackground(this.room.theme);
    this.drawRoomTypeTreatment();
    this.drawAmbientEmbers(.7);
    this.drawRoomProps();
    this.drawPlatforms();
    this.drawHazards();
    this.drawBossHazards();
    this.drawEntry();
    this.drawExit();
    if (this.wagerShrine) this.drawWagerShrine(this.wagerShrine);
    for (const pickup of this.pickups) this.drawPickup(pickup);
    for (const pickup of this.boonPickups) this.drawBoonPickup(pickup);
    const linked = this.enemies.filter(enemy => enemy.soulLinked && !enemy.dead);
    if (linked.length > 1) {
      this.ctx.save(); this.ctx.strokeStyle = '#c8a4ff99'; this.ctx.lineWidth = 3; this.ctx.setLineDash([8, 7]);
      this.ctx.beginPath(); this.ctx.moveTo(centerX(linked[0]), centerY(linked[0]));
      for (const enemy of linked.slice(1)) this.ctx.lineTo(centerX(enemy), centerY(enemy));
      this.ctx.stroke(); this.ctx.restore();
    }
    for (const enemy of this.enemies) if (!enemy.dead || enemy.deathTime > 0) this.drawEnemy(enemy);
    if (this.belladonnaVortex > 0) this.drawBelladonnaVortex();
    for (const wave of this.waves) this.drawGroundWave(wave);
    this.drawProjectilesWithBudget();
    for (const gust of this.gustEffects) this.drawGustEffect(gust);
    for (const lightning of this.lightningEffects) this.drawLightning(lightning);
    for (const ray of this.lightRayEffects) this.drawLightRay(ray);
    for (const impact of this.arcaneImpacts) this.drawArcaneImpact(impact);
    this.drawPlayer();
    this.drawPlayerSnareStatus();
    for (const particle of this.particles) this.drawParticle(particle);
    for (const text of this.floatingText) this.drawFloatingText(text);
    this.drawBossBar();
    this.drawStyleMeter();
    if (this.payoutFlash > 0) this.drawRushPayoutFlash();
    if (this.combo > 1) {
      this.ctx.save(); this.ctx.textAlign = 'right'; this.ctx.shadowColor = this.getArcaneColor(); this.ctx.shadowBlur = 12;
      this.ctx.fillStyle = '#fff'; this.ctx.font = '900 28px Barlow Condensed'; this.ctx.fillText(`${this.combo} HIT`, WIDTH - 34, 154);
      this.ctx.fillStyle = this.getArcaneColor(); this.ctx.font = '800 12px Barlow Condensed'; this.ctx.fillText('CHAIN', WIDTH - 35, 172); this.ctx.restore();
    }
    if (this.roomIntro > 0) this.drawRoomIntro();
    if (this.gradeTimer > 0 && this.roomGrade) this.drawRoomGrade();
    if (this.worldFreezeTimer > 0) {
      this.ctx.save(); this.ctx.fillStyle = 'rgba(247,218,96,.07)'; this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
      this.ctx.strokeStyle = '#f7da60aa'; this.ctx.lineWidth = 4; this.ctx.strokeRect(8, 8, WIDTH - 16, HEIGHT - 16); this.ctx.restore();
    }
  }

  private drawWagerShrine(shrine: WagerShrine): void {
    const pulse = .7 + Math.sin(this.time * 4 + shrine.pulse) * .2;
    const glyphs: Record<WagerType,string> = { blood:'♥', perfect:'◇', rush:'»', chaos:'✹' }; const active = !shrine.used;
    this.ctx.save(); this.ctx.translate(shrine.x + shrine.w / 2, shrine.y + shrine.h); this.ctx.globalAlpha = active ? 1 : .42;
    // The terminal is a small infernal casino cabinet: a readable crown, a
    // contract screen, three odds lamps, and a toothed base.
    const aura = this.ctx.createRadialGradient(0,-55,3,0,-55,82); aura.addColorStop(0, active ? `rgba(255,199,90,${.22+pulse*.12})` : 'rgba(101,92,109,.08)'); aura.addColorStop(1,'transparent'); this.ctx.fillStyle=aura; this.ctx.fillRect(-88,-145,176,150);
    this.ctx.fillStyle='#09070d'; this.ctx.beginPath(); this.ctx.moveTo(-39,-100);this.ctx.lineTo(-25,-121);this.ctx.lineTo(-9,-108);this.ctx.lineTo(0,-128);this.ctx.lineTo(10,-108);this.ctx.lineTo(26,-121);this.ctx.lineTo(40,-100);this.ctx.closePath();this.ctx.fill();
    this.ctx.strokeStyle = active ? '#ffc75a' : '#655c6d'; this.ctx.lineWidth = 3; this.ctx.shadowColor = '#ffc75a'; this.ctx.shadowBlur = active ? 18 * pulse : 0; this.ctx.stroke();
    const cabinet=this.ctx.createLinearGradient(-42,0,42,0);cabinet.addColorStop(0,'#110c17');cabinet.addColorStop(.5,'#2b1826');cabinet.addColorStop(1,'#0b0810');this.ctx.fillStyle=cabinet;this.roundRect(-42,-103,84,103,10);this.ctx.fill();this.ctx.strokeStyle=active?'#ffc75a':'#655c6d';this.ctx.lineWidth=3;this.ctx.stroke();
    this.ctx.fillStyle='#050409';this.roundRect(-32,-91,64,52,5);this.ctx.fill();this.ctx.strokeStyle=active?'#ff4f9a':'#4b4352';this.ctx.lineWidth=2;this.ctx.stroke();
    this.ctx.fillStyle=active?'#fff2bd':'#655c6d';this.ctx.shadowColor=active?'#ffc75a':'transparent';this.ctx.shadowBlur=active?12:0;this.ctx.font='900 31px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText(active?glyphs[shrine.type]:'—',0,-56);
    for(let i=0;i<3;i+=1){this.ctx.fillStyle=active?i===1?'#ff4f9a':'#ffc75a':'#443c49';this.ctx.beginPath();this.ctx.arc(-18+i*18,-27,4+(i===1&&active?pulse*1.5:0),0,Math.PI*2);this.ctx.fill();}
    this.ctx.shadowBlur=0;this.ctx.fillStyle=active?'#d9d0e0':'#746d79';this.ctx.font='900 9px Barlow Condensed';this.ctx.fillText(active?`${shrine.type.toUpperCase()} BET`:'SPENT',0,-10);
    this.ctx.fillStyle='#07050a';this.ctx.beginPath();this.ctx.moveTo(-49,0);this.ctx.lineTo(-36,-16);this.ctx.lineTo(36,-16);this.ctx.lineTo(49,0);this.ctx.closePath();this.ctx.fill();this.ctx.strokeStyle=active?'#ffc75a':'#655c6d';this.ctx.stroke();
    this.ctx.fillStyle=active?'#f6e4bd':'#756d7b';for(let i=0;i<5;i+=1){const x=-35+i*17;this.ctx.beginPath();this.ctx.moveTo(x,-16);this.ctx.lineTo(x+6,-7);this.ctx.lineTo(x+12,-16);this.ctx.fill();}
    if (active && Math.abs(centerX(this.player) - centerX(shrine)) < 95) { this.ctx.fillStyle='rgba(6,4,10,.92)';this.ctx.fillRect(-106,-151,212,29);this.ctx.strokeStyle='#ffc75a88';this.ctx.strokeRect(-106,-151,212,29);this.ctx.fillStyle='#fff';this.ctx.font='900 11px Barlow Condensed';this.ctx.fillText(`E / SPECIAL · VIEW ${shrine.type.toUpperCase()} WAGER`,0,-132); }
    this.ctx.restore();
  }

  private drawStyleMeter(): void {
    const colors: Record<string, string> = { D: '#8d8496', C: '#53b9ff', B: '#57d6c7', A: '#ffc75a', S: '#ff4f9a' };
    const names: Record<string, string> = { D:'DORMANT',C:'CHARGED',B:'BREAKING',A:'APOCALYPTIC',S:'UNBOUND' };
    const color = colors[this.styleRank]; const x = WIDTH - 315; const y = 186; const width = 280; const multiplier = scoreMultiplierForRank(this.styleRank);
    this.ctx.save(); this.ctx.globalAlpha = .94; this.ctx.fillStyle = 'rgba(5,4,10,.82)'; this.ctx.fillRect(x, y, width, 67);
    this.ctx.fillStyle = '#211a29'; this.ctx.fillRect(x + 55, y + 23, 210, 7); this.ctx.fillStyle = color; this.ctx.fillRect(x + 55, y + 23, 210 * this.styleMeter / 100, 7);
    this.ctx.fillStyle = '#2d241d'; this.ctx.fillRect(x + 55, y + 49, 210, 5); this.ctx.fillStyle = '#ffc75a'; this.ctx.fillRect(x + 55, y + 49, 210 * this.rushPayout / this.rushThreshold(), 5);
    this.ctx.strokeStyle = color; this.ctx.lineWidth = 2 + this.styleFlash * 4; this.ctx.strokeRect(x, y, width, 67);
    this.ctx.fillStyle = color; this.ctx.shadowColor = color; this.ctx.shadowBlur = 10 + this.styleFlash * 24;
    if (this.rushRankAtlas.complete && this.rushRankAtlas.naturalWidth > 0) {
      const ranks = ['D','C','B','A','S']; const frame = ranks.indexOf(this.styleRank); const cellW = this.rushRankAtlas.naturalWidth / 5;
      this.ctx.drawImage(this.rushRankAtlas, frame * cellW, 0, cellW, this.rushRankAtlas.naturalHeight, x - 1, y - 1, 58, 66);
    } else {
      this.ctx.font = '900 42px Barlow Condensed'; this.ctx.textAlign = 'center'; this.ctx.fillText(this.styleRank, x + 28, y + 45);
    }
    this.ctx.shadowBlur = 0; this.ctx.textAlign = 'left'; this.ctx.fillStyle = '#fff'; this.ctx.font = '900 11px Barlow Condensed'; this.ctx.fillText(`INFERNAL RUSH · ${names[this.styleRank]}`, x + 56, y + 14);
    this.ctx.fillStyle = color; this.ctx.textAlign = 'right'; this.ctx.fillText(`×${multiplier} SCORE`, x + 265, y + 14);
    this.ctx.fillStyle = '#ffc75a'; this.ctx.textAlign = 'left'; this.ctx.font = '800 9px Barlow Condensed'; this.ctx.fillText(`NEXT BONUS SHARD · ${Math.floor(this.rushPayout / this.rushThreshold() * 100)}%`, x + 56, y + 44);
    this.ctx.fillStyle = '#ded7e8'; this.ctx.textAlign = 'right'; this.ctx.fillText(`${this.runScore.toLocaleString()} PTS`, x + 265, y + 64);
    if (this.styleFlash > 0) {
      const alpha = clamp(this.styleFlash, 0, 1); this.ctx.globalAlpha = alpha * .8; this.ctx.textAlign = 'center'; this.ctx.shadowColor = color; this.ctx.shadowBlur = 35;
      this.ctx.fillStyle = color; this.ctx.font = `900 ${90 + (1-alpha)*45}px Barlow Condensed`; this.ctx.fillText(`${this.styleRank} · ${names[this.styleRank]}`, WIDTH/2, 225);
    }
    this.ctx.restore();
  }

  private drawRushPayoutFlash(): void {
    const alpha = clamp(this.payoutFlash, 0, 1); const radius = 110 + (1-alpha) * 170;
    this.ctx.save(); this.ctx.globalAlpha = alpha; this.ctx.translate(WIDTH/2, HEIGHT/2 - 45);
    this.ctx.strokeStyle = '#ffc75a'; this.ctx.shadowColor = '#ffc75a'; this.ctx.shadowBlur = 28; this.ctx.lineWidth = 7 * alpha;
    this.ctx.beginPath(); this.ctx.arc(0, 0, radius, 0, Math.PI*2); this.ctx.stroke();
    this.ctx.fillStyle = '#fff4c7'; this.ctx.textAlign = 'center'; this.ctx.font = '900 42px Barlow Condensed'; this.ctx.fillText('RUSH PAYOUT', 0, -5);
    this.ctx.fillStyle = '#ffc75a'; this.ctx.font = '900 22px Barlow Condensed'; this.ctx.fillText(`+${this.payoutFlashCount} BONUS SOUL SHARD${this.payoutFlashCount === 1 ? '' : 'S'}`, 0, 27); this.ctx.restore();
  }

  private drawRoomGrade(): void {
    const alpha = clamp(this.gradeTimer / .35, 0, 1); const color = this.roomGrade === 'S' ? '#ff4f9a' : this.roomGrade === 'A' ? '#ffc75a' : this.roomGrade === 'B' ? '#57d6c7' : '#b8afc3';
    this.ctx.save(); this.ctx.globalAlpha = alpha; this.ctx.textAlign = 'center'; this.ctx.shadowColor = color; this.ctx.shadowBlur = 28;
    this.ctx.fillStyle = color; this.ctx.font = '900 108px Barlow Condensed'; this.ctx.fillText(this.roomGrade, WIDTH / 2, 250);
    this.ctx.fillStyle = '#fff'; this.ctx.font = '900 18px Barlow Condensed'; this.ctx.fillText('ROOM CLEAR', WIDTH / 2, 278); this.ctx.restore();
  }

  private lateDepthForTheme(theme: RoomDefinition['theme']): number | null {
    if (theme === 'casino' || theme === 'rail' || theme === 'roulette') return 4;
    if (theme === 'basilica' || theme === 'reliquary' || theme === 'sanctum') return 5;
    if (theme === 'motel' || theme === 'hallway' || theme === 'dreamsuite') return 6;
    if (theme === 'city' || theme === 'gallery' || theme === 'mirrorcourt') return 7;
    if (theme === 'capital' || theme === 'succubusHall' || theme === 'royalThrone') return 8;
    if (theme === 'apartment' || theme === 'brokenHub' || theme === 'selfBelow') return 9;
    return null;
  }

  private drawBackground(theme: RoomDefinition['theme']): void {
    const palettes: Record<RoomDefinition['theme'], [string, string, string]> = {
      alley: ['#100c1d', '#241029', '#ff425c'],
      boiler: ['#0c101a', '#251519', '#ff7a45'],
      cathedral: ['#0d0918', '#261231', '#b46cff'],
      foundry: ['#090d17', '#181638', '#42e8f5'],
      throne: ['#11070e', '#320c1b', '#ff345e'],
      reef: ['#03151c', '#052c34', '#3de7ee'],
      palace: ['#03111c', '#092b3b', '#63f6ff'],
      stage: ['#020b15', '#12273a', '#73f8ff'],
      grove: ['#100d0b', '#28210d', '#a7c64c'],
      ruins: ['#130b0b', '#2c1710', '#dc6848'],
      canopy: ['#0d0809', '#281014', '#ef4e43'],
      casino: ['#10051f', '#331044', '#ffe05a'],
      rail: ['#061222', '#25204c', '#5de8ff'],
      roulette: ['#16051c', '#430d35', '#ff6be6'],
      basilica: ['#041522', '#12354b', '#8ee7ff'],
      reliquary: ['#07111f', '#202d4c', '#d4f8ff'],
      sanctum: ['#0b0a20', '#223a62', '#72dcff'],
      motel: ['#170d24', '#422250', '#d6a0ff'],
      hallway: ['#100a1b', '#2f193e', '#f4b8e7'],
      dreamsuite: ['#190b28', '#4a1b55', '#bc7cff'],
      city: ['#06131e', '#132c3e', '#61edff'],
      gallery: ['#0b1020', '#23264a', '#d06cff'],
      mirrorcourt: ['#100921', '#31194b', '#8ff7ff'],
      capital: ['#120712', '#391329', '#ff4f9a'],
      succubusHall: ['#170817', '#4b1739', '#f08cff'],
      royalThrone: ['#0c050d', '#350717', '#ff315f'],
      apartment: ['#0e1018', '#242532', '#9b8aaf'],
      brokenHub: ['#080812', '#211534', '#9d68ff'],
      selfBelow: ['#030309', '#17101f', '#eee8ff'],
    };
    const drowned = theme === 'reef' || theme === 'palace' || theme === 'stage';
    const thornwild = theme === 'grove' || theme === 'ruins' || theme === 'canopy';
    const jackpot = theme === 'casino' || theme === 'rail' || theme === 'roulette';
    const frozen = theme === 'basilica' || theme === 'reliquary' || theme === 'sanctum';
    const foreverMotel = theme === 'motel' || theme === 'hallway' || theme === 'dreamsuite';
    const thousandFaces = theme === 'city' || theme === 'gallery' || theme === 'mirrorcourt';
    const [top, bottom, accent] = palettes[theme];
    const gradient = this.ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(-20, -20, WIDTH + 40, HEIGHT + 40);

    const lateDepth = this.lateDepthForTheme(theme);
    const backdrop = lateDepth ? this.lateBackdrops.get(lateDepth) : thornwild ? this.levelThreeBackdrop : drowned ? this.levelTwoBackdrop : this.levelBackdrop;
    if (backdrop?.complete && backdrop.naturalWidth > 0) {
      const drift = ((this.room.mapX ?? this.roomIndex) * 17 + Math.sin(this.time * .08) * 7) % 70;
      this.ctx.save(); this.ctx.globalAlpha = lateDepth ? .9 : theme === 'throne' || theme === 'canopy' ? .86 : .76;
      this.ctx.drawImage(backdrop, -28 + drift * .12, -2, WIDTH + 56, HEIGHT + 4);
      this.ctx.fillStyle = `${accent}10`; this.ctx.globalCompositeOperation = 'screen'; this.ctx.fillRect(0, 0, WIDTH, HEIGHT); this.ctx.restore();
      const gameplayShade = this.ctx.createLinearGradient(0, 0, 0, HEIGHT);
      gameplayShade.addColorStop(0, 'rgba(5,3,10,.14)'); gameplayShade.addColorStop(.48, 'rgba(5,3,10,.22)'); gameplayShade.addColorStop(1, 'rgba(5,3,10,.48)');
      this.ctx.fillStyle = gameplayShade; this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    this.ctx.save();
    this.ctx.globalAlpha = .075;
    for (let i = 0; i < 11; i += 1) {
      const drift = (this.room.mapX ?? 0) * 12;
      const x = i * 145 - 40 - drift;
      const h = 170 + ((i * 73) % 230);
      this.ctx.fillStyle = i % 2 ? '#06050b' : '#151020';
      this.ctx.fillRect(x, FLOOR_Y - h, 112, h);
      this.ctx.fillStyle = accent;
      for (let wy = FLOOR_Y - h + 28; wy < FLOOR_Y - 20; wy += 48) {
        if ((wy + i) % 3 !== 0) this.ctx.fillRect(x + 20, wy, 7, 13);
        this.ctx.fillRect(x + 72, wy + 10, 5, 9);
      }
    }
    this.ctx.restore();

    // The Neon Maw reads as a pleasure district first and a living digestive
    // tract second: club signs, arcades, soul pipes, and subtle teeth motifs.
    if (!drowned && !thornwild && !jackpot && !frozen && !thousandFaces) {
      this.ctx.strokeStyle='rgba(201,150,218,.12)';this.ctx.lineWidth=19;this.ctx.lineCap='round';
      this.ctx.beginPath();this.ctx.moveTo(42,-10);this.ctx.lineTo(42,360);this.ctx.quadraticCurveTo(42,403,87,403);this.ctx.lineTo(236,403);this.ctx.moveTo(1237,-10);this.ctx.lineTo(1237,309);this.ctx.quadraticCurveTo(1237,348,1197,348);this.ctx.lineTo(1080,348);this.ctx.stroke();
      this.ctx.strokeStyle='rgba(255,101,184,.12)';this.ctx.lineWidth=3;for(let y=42;y<350;y+=28){this.ctx.beginPath();this.ctx.moveTo(32,y);this.ctx.lineTo(52,y);this.ctx.moveTo(1227,y+8);this.ctx.lineTo(1247,y+8);this.ctx.stroke();}
    } else if (drowned) {
      this.ctx.save();this.ctx.globalCompositeOperation='screen';this.ctx.globalAlpha=.13;this.ctx.strokeStyle='#9effff';this.ctx.lineWidth=2;
      for(let y=45;y<HEIGHT;y+=92){this.ctx.beginPath();for(let x=-20;x<WIDTH+30;x+=34){const py=y+Math.sin(x*.018+this.time*.45+y)*12;if(x<0)this.ctx.moveTo(x,py);else this.ctx.lineTo(x,py);}this.ctx.stroke();}
      this.ctx.globalAlpha=.24;for(let i=0;i<24;i+=1){const x=(i*149+this.roomIndex*31)%WIDTH;const y=HEIGHT-((this.time*(9+i%4)+i*67)%(HEIGHT+60));const r=2+i%4;this.ctx.beginPath();this.ctx.arc(x,y,r,0,Math.PI*2);this.ctx.stroke();}this.ctx.restore();
    }

    if (jackpot) {
      this.ctx.save();this.ctx.globalCompositeOperation='screen';
      for(let tower=0;tower<9;tower+=1){const x=tower*158-35-((this.room.mapX??0)*19%120);const height=180+(tower*67)%260;this.ctx.globalAlpha=.12;this.ctx.fillStyle=tower%2?'#e86cff':'#55eaff';this.ctx.fillRect(x,FLOOR_Y-height,112,height);this.ctx.globalAlpha=.32;this.ctx.strokeStyle=tower%2?'#ff79ec':'#6af6ff';this.ctx.lineWidth=2;this.ctx.strokeRect(x+12,FLOOR_Y-height+18,88,42);this.ctx.font='900 18px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillStyle='#ffe66a';this.ctx.fillText(tower%3===0?'777':tower%3===1?'ANTE':'♦',x+56,FLOOR_Y-height+46);}
      this.ctx.globalAlpha=.28;this.ctx.strokeStyle='#fff16a';this.ctx.lineWidth=3;for(let bolt=0;bolt<4;bolt+=1){const x=170+bolt*310+Math.sin(this.time*.7+bolt)*45;this.ctx.beginPath();this.ctx.moveTo(x,-10);this.ctx.lineTo(x-28,65);this.ctx.lineTo(x+10,65);this.ctx.lineTo(x-20,145);this.ctx.stroke();}
      this.ctx.restore();
    }

    if(frozen){
      this.ctx.save();this.ctx.globalCompositeOperation='screen';
      for(let arch=0;arch<7;arch+=1){const x=55+arch*195-((this.room.mapX??0)*13%90);this.ctx.globalAlpha=.13;this.ctx.strokeStyle=arch%2?'#dffcff':'#72dcff';this.ctx.lineWidth=12;this.ctx.beginPath();this.ctx.moveTo(x,FLOOR_Y);this.ctx.lineTo(x,225);this.ctx.arc(x+72,225,72,Math.PI,0);this.ctx.lineTo(x+144,FLOOR_Y);this.ctx.stroke();this.ctx.globalAlpha=.2;this.ctx.fillStyle='#bff7ff';for(let shard=0;shard<3;shard+=1){const sx=x+28+shard*44;this.ctx.beginPath();this.ctx.moveTo(sx,FLOOR_Y-18);this.ctx.lineTo(sx+11,FLOOR_Y-95-(shard%2)*35);this.ctx.lineTo(sx+24,FLOOR_Y-18);this.ctx.fill();}}
      this.ctx.globalAlpha=.18;this.ctx.strokeStyle='#f0feff';this.ctx.lineWidth=2;for(let frost=0;frost<28;frost+=1){const x=(frost*97+this.roomIndex*31)%WIDTH,y=(frost*53)%560;this.ctx.beginPath();this.ctx.moveTo(x-7,y);this.ctx.lineTo(x+7,y);this.ctx.moveTo(x,y-7);this.ctx.lineTo(x,y+7);this.ctx.stroke();}
      this.ctx.restore();
    }

    if(foreverMotel){
      this.ctx.save();this.ctx.globalCompositeOperation='screen';
      for(let door=0;door<9;door+=1){const x=35+door*155-((this.room.mapX??0)*17%115);const top=145+(door%3)*34;this.ctx.globalAlpha=.13+(door%2)*.04;this.ctx.fillStyle=door%2?'#f4b8e7':'#bc7cff';this.ctx.fillRect(x,top,102,FLOOR_Y-top);this.ctx.globalAlpha=.3;this.ctx.strokeStyle='#f7d8ff';this.ctx.lineWidth=3;this.ctx.strokeRect(x+10,top+14,82,FLOOR_Y-top-24);this.ctx.fillStyle='#ffe6a8';this.ctx.beginPath();this.ctx.arc(x+76,top+83,4,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#f8eaff';this.ctx.font='900 12px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText(String((door%6)+1).padStart(2,'0')+':00',x+51,top+39);}
      this.ctx.globalAlpha=.15;this.ctx.strokeStyle='#ffcfef';this.ctx.lineWidth=2;for(let seam=0;seam<12;seam+=1){const y=80+seam*44+Math.sin(this.time*.4+seam)*4;this.ctx.beginPath();this.ctx.moveTo(0,y);this.ctx.bezierCurveTo(340,y+26,810,y-26,WIDTH,y);this.ctx.stroke();}
      this.ctx.restore();
    }

    if(thousandFaces){
      this.ctx.save();this.ctx.globalCompositeOperation='screen';
      for(let tower=0;tower<10;tower+=1){const x=18+tower*137-((this.room.mapX??0)*23%120),h=220+(tower*79)%300;this.ctx.globalAlpha=.1;this.ctx.fillStyle=tower%2?'#d06cff':'#61edff';this.ctx.fillRect(x,FLOOR_Y-h,104,h);this.ctx.globalAlpha=.26;this.ctx.strokeStyle=tower%2?'#eeadff':'#cfffff';this.ctx.lineWidth=2;for(let pane=0;pane<3;pane+=1)this.ctx.strokeRect(x+13+pane*27,FLOOR_Y-h+22,19,h-48);}
      this.ctx.globalAlpha=.18;this.ctx.strokeStyle='#f1ffff';this.ctx.lineWidth=3;for(let mirror=0;mirror<7;mirror+=1){const x=85+mirror*185;this.ctx.beginPath();this.ctx.ellipse(x,210+(mirror%2)*70,45,92,0,0,Math.PI*2);this.ctx.stroke();this.ctx.beginPath();this.ctx.moveTo(x-32,178+(mirror%2)*70);this.ctx.lineTo(x+18,231+(mirror%2)*70);this.ctx.lineTo(x-9,278+(mirror%2)*70);this.ctx.stroke();}
      this.ctx.restore();
    }

    if(theme==='throne'){
      this.ctx.fillStyle='rgba(61,8,33,.48)';this.ctx.beginPath();this.ctx.moveTo(360,0);this.ctx.quadraticCurveTo(640,170,920,0);this.ctx.lineTo(920,55);this.ctx.quadraticCurveTo(640,245,360,55);this.ctx.closePath();this.ctx.fill();
      this.ctx.fillStyle='rgba(245,210,207,.24)';for(let i=0;i<11;i+=1){const x=405+i*47;this.ctx.beginPath();this.ctx.moveTo(x,39);this.ctx.lineTo(x+16,78+Math.abs(5-i)*5);this.ctx.lineTo(x+31,39);this.ctx.fill();}
    }

    if (theme === 'boiler' || theme === 'foundry') {
      this.ctx.strokeStyle = 'rgba(255,255,255,.08)';
      this.ctx.lineWidth = 24;
      this.ctx.beginPath();
      this.ctx.moveTo(-30, 165);
      this.ctx.lineTo(430, 165);
      this.ctx.quadraticCurveTo(480, 165, 480, 215);
      this.ctx.lineTo(480, 320);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(900, -20);
      this.ctx.lineTo(900, 260);
      this.ctx.quadraticCurveTo(900, 300, 940, 300);
      this.ctx.lineTo(1320, 300);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = 'rgba(255,255,255,.025)';
    for (let y = 0; y < HEIGHT; y += 42) this.ctx.fillRect(0, y, WIDTH, 1);
    const glow = this.ctx.createRadialGradient(WIDTH * .54, HEIGHT * .5, 10, WIDTH * .54, HEIGHT * .5, 520);
    glow.addColorStop(0, `${accent}1f`);
    glow.addColorStop(1, 'transparent');
    this.ctx.fillStyle = glow;
    this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  private drawTileCell(index: number, x: number, y: number, w: number, h: number, alpha = 1): void {
    if (!this.levelTiles.complete || this.levelTiles.naturalWidth === 0) return;
    const columns = 4, rows = 2, cellW = this.levelTiles.naturalWidth / columns, cellH = this.levelTiles.naturalHeight / rows;
    this.ctx.save(); this.ctx.globalAlpha = alpha;
    this.ctx.drawImage(this.levelTiles, (index % columns) * cellW, Math.floor(index / columns) * cellH, cellW, cellH, x, y, w, h);
    this.ctx.restore();
  }

  private drawRoomTypeTreatment(): void {
    const accentByType: Partial<Record<RoomDefinition['type'], string>> = {
      combat:'#ff4f9a', traversal:'#42e8f5', elite:'#ff425c', recovery:'#62e59b', cache:'#a85cff', miniboss:'#ff9b4a', boss:'#ff345e',
    };
    const accent = this.currentDepth===7?(this.room.type==='boss'?'#8ff7ff':this.room.type==='miniboss'?'#d06cff':'#61edff'):this.currentDepth===6?(this.room.type==='boss'?'#bc7cff':this.room.type==='miniboss'?'#ffd8f5':'#d6a0ff'):this.currentDepth===5?(this.room.type==='boss'?'#8ee7ff':this.room.type==='miniboss'?'#d7fbff':'#73dcff'):this.currentDepth===4?(this.room.type==='boss'?'#ff6be6':this.room.type==='miniboss'?'#ffe05a':'#63eaff'):this.currentDepth===3?(this.room.type==='boss'?'#ef4e43':this.room.type==='miniboss'?'#d9e5bd':'#a7c64c'):this.currentDepth===2?(this.room.type==='boss'?'#66f6ff':this.room.type==='miniboss'?'#49dfe8':'#43dfe8'):(accentByType[this.room.type] ?? '#ff4f9a'); const pulse = .5 + .5 * Math.sin(this.time * 2.4);
    this.ctx.save(); this.ctx.globalCompositeOperation = 'screen';
    const leftBeam = this.ctx.createLinearGradient(0, 0, 260, 0); leftBeam.addColorStop(0, `${accent}24`); leftBeam.addColorStop(1, `${accent}00`);
    const rightBeam = this.ctx.createLinearGradient(WIDTH, 0, WIDTH - 260, 0); rightBeam.addColorStop(0, `${accent}1f`); rightBeam.addColorStop(1, `${accent}00`);
    this.ctx.fillStyle = leftBeam; this.ctx.fillRect(0, 0, 260, HEIGHT); this.ctx.fillStyle = rightBeam; this.ctx.fillRect(WIDTH - 260, 0, 260, HEIGHT);
    this.ctx.restore();

    this.ctx.save(); this.ctx.strokeStyle = `${accent}${Math.round((.22 + pulse * .08) * 255).toString(16).padStart(2,'0')}`; this.ctx.fillStyle = accent; this.ctx.lineWidth = 2;
    if (this.room.type === 'recovery') {
      // Quiet green booth lights, a cross-shaped restorative sigil, and soft
      // floor pools identify a reprieve before the HUD needs to explain it.
      for (const x of [245, WIDTH - 245]) { const light = this.ctx.createLinearGradient(x, 80, x, FLOOR_Y); light.addColorStop(0, `${accent}00`); light.addColorStop(.52, `${accent}1f`); light.addColorStop(1, `${accent}00`); this.ctx.fillStyle = light; this.ctx.beginPath(); this.ctx.moveTo(x - 25, 72); this.ctx.lineTo(x + 25, 72); this.ctx.lineTo(x + 110, FLOOR_Y); this.ctx.lineTo(x - 110, FLOOR_Y); this.ctx.closePath(); this.ctx.fill(); }
      this.ctx.globalAlpha = .34 + pulse * .12; this.ctx.translate(WIDTH / 2, 118); this.ctx.fillRect(-5, -25, 10, 50); this.ctx.fillRect(-25, -5, 50, 10);
    } else if (this.room.type === 'cache') {
      this.ctx.translate(WIDTH / 2, 128); this.ctx.globalAlpha = .28 + pulse * .12; this.ctx.rotate(this.time * .12);
      for (let i = 0; i < 3; i += 1) { this.ctx.rotate(Math.PI / 4); this.ctx.strokeRect(-26 - i * 11, -26 - i * 11, 52 + i * 22, 52 + i * 22); }
      this.ctx.beginPath(); this.ctx.moveTo(0,-78); this.ctx.lineTo(16,-16); this.ctx.lineTo(78,0); this.ctx.lineTo(16,16); this.ctx.lineTo(0,78); this.ctx.lineTo(-16,16); this.ctx.lineTo(-78,0); this.ctx.lineTo(-16,-16); this.ctx.closePath(); this.ctx.stroke();
    } else if (this.room.type === 'elite') {
      this.ctx.globalAlpha = .2 + pulse * .08; this.ctx.lineWidth = 6;
      for (let x = -180; x < WIDTH + 180; x += 170) { this.ctx.beginPath(); this.ctx.moveTo(x, FLOOR_Y); this.ctx.lineTo(x + 180, FLOOR_Y - 110); this.ctx.stroke(); }
      this.ctx.globalAlpha = .35; this.ctx.setLineDash([13,10]); this.ctx.strokeRect(18, 18, WIDTH - 36, FLOOR_Y - 36); this.ctx.setLineDash([]);
    } else if (this.room.type === 'miniboss') {
      this.ctx.globalAlpha = .28; this.ctx.fillStyle = '#14090b'; this.ctx.fillRect(250, 22, WIDTH - 500, 55);
      this.ctx.strokeStyle = accent; this.ctx.beginPath(); this.ctx.moveTo(250,77); this.ctx.lineTo(WIDTH-250,77); this.ctx.stroke();
      for (let x = 300; x < WIDTH - 280; x += 82) { this.ctx.fillStyle = `${accent}55`; this.ctx.fillRect(x, 35, 16, 29); this.ctx.fillRect(x + 4, 27, 8, 9); }
    } else if (this.room.type === 'boss') {
      this.ctx.globalAlpha = .2 + pulse * .07; this.ctx.lineWidth = 8;
      this.ctx.beginPath(); this.ctx.arc(WIDTH/2, 14, 340, .08, Math.PI - .08); this.ctx.stroke();
      for (let i = 0; i < 11; i += 1) { const x = WIDTH/2 - 268 + i * 53.6; this.ctx.beginPath(); this.ctx.moveTo(x, 39); this.ctx.lineTo(x + 14, 72 + Math.abs(5-i)*3); this.ctx.lineTo(x + 28, 39); this.ctx.fill(); }
    } else if (this.room.type === 'traversal') {
      this.ctx.globalAlpha = .26; this.ctx.setLineDash([18,12]); this.ctx.beginPath(); this.ctx.moveTo(82, 100); this.ctx.lineTo(WIDTH - 82, 100); this.ctx.stroke(); this.ctx.setLineDash([]);
      for (let x = 120; x < WIDTH - 80; x += 150) { this.ctx.beginPath(); this.ctx.moveTo(x,92); this.ctx.lineTo(x+12,100); this.ctx.lineTo(x,108); this.ctx.stroke(); }
    }
    this.ctx.restore();

    if (this.isEndless) {
      const deepEncounter=deepDiveEncounter(this.endlessRoom);const endlessAccent = deepEncounter==='boss' ? '#ff4f9a' : deepEncounter==='miniboss' ? '#ffc75a' : '#a85cff';
      this.ctx.save(); this.ctx.globalAlpha = .22 + pulse * .08; this.ctx.strokeStyle = endlessAccent; this.ctx.lineWidth = 4; this.ctx.setLineDash([18, 12]); this.ctx.lineDashOffset = -this.time * 38;
      this.ctx.strokeRect(11, 11, WIDTH - 22, HEIGHT - 22); this.ctx.setLineDash([]);
      this.ctx.fillStyle = endlessAccent; for (let i = 0; i < Math.min(10, 2 + Math.floor(this.endlessRoom / 5)); i += 1) this.ctx.fillRect(35 + i * 17, HEIGHT - 31, 9, 9);
      this.ctx.restore();
    }
  }

  private drawAtlasCell(image: HTMLImageElement, columns: number, rows: number, index: number, x: number, y: number, width: number, height: number): void {
    if (!image.complete || image.naturalWidth <= 0) return;
    const cellWidth = image.naturalWidth / columns;
    const cellHeight = image.naturalHeight / rows;
    const column = index % columns;
    const row = Math.floor(index / columns);
    this.ctx.drawImage(image, column * cellWidth, row * cellHeight, cellWidth, cellHeight, x, y, width, height);
  }

  private drawLateRoomProps(seed: number): boolean {
    const depth = this.lateDepthForTheme(this.room.theme);
    const atlas = depth ? this.lateEnvironmentAtlases.get(depth) : undefined;
    if (!atlas?.complete || atlas.naturalWidth <= 0) return false;
    const firstX = seed % 2 === 0 ? 42 : WIDTH - 202;
    const firstIndex = 4 + seed % 4;
    this.ctx.save();
    this.ctx.globalAlpha = .92;
    this.drawAtlasCell(atlas, 4, 3, firstIndex, firstX, FLOOR_Y - 205, 170, 205);
    if ((this.room.complexity ?? 0) > 11) {
      const secondX = seed % 3 === 0 ? WIDTH * .34 : WIDTH * .61;
      this.ctx.globalAlpha = .72;
      this.drawAtlasCell(atlas, 4, 3, 4 + ((firstIndex - 3) % 4), secondX, FLOOR_Y - 142, 128, 148);
    }
    this.ctx.restore();
    return true;
  }

  private drawRoomProps(): void {
    const seed = (this.roomIndex * 193 + (this.room.complexity ?? 0) * 17) % 997;
    if (this.drawLateRoomProps(seed)) return;
    const propX = seed % 2 === 0 ? 88 : WIDTH - 188;
    this.ctx.save();this.ctx.globalAlpha=.58;
    if(this.currentDepth===7){
      this.ctx.fillStyle='#101a2d';this.roundRect(propX,420,104,210,10);this.ctx.fill();this.ctx.strokeStyle='#8ff7ff';this.ctx.lineWidth=4;this.ctx.beginPath();this.ctx.ellipse(propX+52,500,34,60,0,0,Math.PI*2);this.ctx.stroke();this.ctx.strokeStyle='#d06cff';this.ctx.beginPath();this.ctx.moveTo(propX+33,462);this.ctx.lineTo(propX+64,515);this.ctx.lineTo(propX+41,550);this.ctx.stroke();this.ctx.fillStyle='#e8ffff';this.ctx.font='900 15px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText('WHO ARE YOU?',propX+52,602);
    }else if(this.currentDepth===5){
      this.ctx.fillStyle='#10243a';this.roundRect(propX,455,102,175,8);this.ctx.fill();this.ctx.strokeStyle='#c9f8ff';this.ctx.lineWidth=3;this.ctx.strokeRect(propX+12,469,78,112);this.ctx.fillStyle='#86e8ff';for(let shard=0;shard<5;shard+=1){const x=propX+18+shard*15;this.ctx.beginPath();this.ctx.moveTo(x,575);this.ctx.lineTo(x+8,490-(shard%2)*18);this.ctx.lineTo(x+16,575);this.ctx.fill();}this.ctx.fillStyle='#f4ffff';this.ctx.font='900 21px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText('REMEMBER',propX+51,611);
    }else if(this.currentDepth===4){
      this.ctx.fillStyle='#1b0d2d';this.roundRect(propX,432,102,198,10);this.ctx.fill();this.ctx.strokeStyle='#ffe05a';this.ctx.lineWidth=3;this.ctx.strokeRect(propX+11,448,80,68);this.ctx.fillStyle='#f15cda';this.ctx.font='900 31px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText('777',propX+51,491);this.ctx.fillStyle='#64ebff';for(let i=0;i<4;i+=1){this.ctx.beginPath();this.ctx.arc(propX+18+i*22,535,5,0,Math.PI*2);this.ctx.fill();}this.ctx.fillStyle='#0d0615';this.ctx.fillRect(propX+18,557,66,54);this.ctx.strokeStyle='#ff7dec';this.ctx.strokeRect(propX+18,557,66,54);
    }else if(this.currentDepth===3){
      this.ctx.fillStyle='#25130f';this.ctx.fillRect(propX,472,100,158);this.ctx.strokeStyle='#9dbb46';this.ctx.lineWidth=7;for(let x=propX+12;x<propX+95;x+=19){this.ctx.beginPath();this.ctx.moveTo(x,630);this.ctx.quadraticCurveTo(x+18,535+Math.sin(x)*25,x+7,470);this.ctx.stroke();}this.ctx.fillStyle='#df5a44';for(let i=0;i<4;i+=1){this.ctx.beginPath();this.ctx.moveTo(propX+18+i*22,530);this.ctx.lineTo(propX+31+i*22,511);this.ctx.lineTo(propX+34+i*22,535);this.ctx.fill();}
    }else if(this.currentDepth===2){
      this.ctx.fillStyle='#092a34';this.ctx.fillRect(propX,468,96,162);this.ctx.fillStyle='#b8f6ed';for(let i=0;i<6;i+=1){this.ctx.beginPath();this.ctx.moveTo(propX+12+i*14,492);this.ctx.lineTo(propX+20+i*14,472-(i%2)*13);this.ctx.lineTo(propX+28+i*14,492);this.ctx.fill();}this.ctx.strokeStyle='#4ee9ef';this.ctx.lineWidth=3;this.ctx.beginPath();this.ctx.arc(propX+48,545,29,0,Math.PI*2);this.ctx.stroke();this.ctx.fillStyle='#48dce833';this.ctx.fill();
    }else if(this.room.theme==='alley'||this.room.theme==='foundry'){
      this.ctx.fillStyle='#17101e';this.roundRect(propX,430,92,200,8);this.ctx.fill();this.ctx.strokeStyle='#42e8f5';this.ctx.lineWidth=3;this.ctx.strokeRect(propX+10,446,72,72);this.ctx.fillStyle='#ff4f9a';this.ctx.beginPath();this.ctx.arc(propX+46,482,18,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#140b19';this.ctx.beginPath();this.ctx.arc(propX+46,482,8,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#55405e';for(let i=0;i<3;i+=1)this.ctx.fillRect(propX+18+i*21,537,12,12);
    }else{
      this.ctx.fillStyle='#241524';this.ctx.fillRect(propX,520,112,18);this.ctx.fillRect(propX+12,538,10,92);this.ctx.fillRect(propX+90,538,10,92);this.ctx.strokeStyle='#ffc75a';this.ctx.lineWidth=2;for(let i=0;i<3;i+=1){this.ctx.beginPath();this.ctx.ellipse(propX+24+i*32,515,18,5,0,0,Math.PI*2);this.ctx.stroke();}
    }
    if((this.room.complexity??0)>13){const sx=540+(seed%180);this.ctx.fillStyle='#120d18';this.roundRect(sx,500,70,130,8);this.ctx.fill();this.ctx.fillStyle='#d83d92';this.ctx.beginPath();this.ctx.arc(sx+35,535,22,0,Math.PI*2);this.ctx.fill();this.ctx.beginPath();this.ctx.arc(sx+35,591,14,0,Math.PI*2);this.ctx.fill();}
    this.ctx.restore();
  }

  private drawPlatforms(): void {
    const drowned=this.currentDepth===2;const thornwild=this.currentDepth===3;const jackpot=this.currentDepth===4;const frozen=this.currentDepth===5;const mirrorCity=this.currentDepth===7;
    const constructionDepth = this.lateDepthForTheme(this.room.theme);
    const constructionAtlas = constructionDepth ? this.lateEnvironmentAtlases.get(constructionDepth) : undefined;
    const platformAccent = mirrorCity?(this.room.type==='boss'?'#8ff7ff':this.room.type==='miniboss'?'#d06cff':'#61edff'):frozen?(this.room.type==='boss'?'#d8fbff':this.room.type==='miniboss'?'#a9efff':'#72dcff'):jackpot?(this.room.type==='boss'?'#ff69e7':this.room.type==='miniboss'?'#ffe05a':'#59eaff'):thornwild?(this.room.type==='boss'?'#ef4e43':'#9fbd48'):drowned ? (this.room.type==='boss'?'#b9ffff':'#42e8f5') : this.room.type === 'recovery' ? '#62e59b' : this.room.type === 'cache' ? '#a85cff' : this.room.type === 'elite' ? '#ff425c' : this.room.type === 'miniboss' ? '#ff9b4a' : this.room.type === 'boss' ? '#ff345e' : '#ff5ab5';
    for (const platform of this.room.platforms) {
      if (platform.h <= 24 && platform.y < FLOOR_Y - 35) {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(118,100,132,.28)';
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.moveTo(platform.x + 24, platform.y + platform.h);
        this.ctx.lineTo(platform.x + 52, FLOOR_Y);
        this.ctx.moveTo(platform.x + platform.w - 24, platform.y + platform.h);
        this.ctx.lineTo(platform.x + platform.w - 52, FLOOR_Y);
        this.ctx.moveTo(platform.x + 35, platform.y + 70);
        this.ctx.lineTo(platform.x + platform.w - 35, platform.y + 105);
        this.ctx.stroke();
        this.ctx.restore();
      }
      const gradient = this.ctx.createLinearGradient(0, platform.y, 0, platform.y + platform.h);
      gradient.addColorStop(0, mirrorCity?(platform.h<=25?'#58cbd7':'#424c78'):frozen?(platform.h<=25?'#8ed8e6':'#385f79'):jackpot?(platform.h<=25?'#76672b':'#4b255f'):thornwild?(platform.h<=25?'#5e5a2b':'#493126'):drowned ? (platform.h<=25?'#4d7c83':'#27454d') : platform.h <= 25 ? '#725272' : '#423345');
      gradient.addColorStop(.12, mirrorCity?'#182a45':frozen?'#17334c':jackpot?'#261331':thornwild?'#2b2118':drowned?'#162d36':'#292031'); gradient.addColorStop(1, mirrorCity?'#070e1d':frozen?'#07131e':jackpot?'#0b0714':thornwild?'#110b09':drowned?'#06131b':'#100c16');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
      this.ctx.fillStyle = platform.h <= 25 ? `${platformAccent}d0` : `${platformAccent}4d`;
      this.ctx.fillRect(platform.x, platform.y, platform.w, platform.h <= 25 ? 4 : 3);
      if(platform.h<=25){
        this.ctx.fillStyle=`${platformAccent}32`;this.ctx.fillRect(platform.x+5,platform.y+8,platform.w-10,4);
        this.ctx.save(); this.ctx.translate(platform.x + platform.w / 2, platform.y + 16); this.ctx.strokeStyle = `${platformAccent}a8`; this.ctx.lineWidth = 1.5;
        for (const offset of [-6,6]) { this.ctx.beginPath(); this.ctx.moveTo(offset - 4, -2); this.ctx.lineTo(offset, 2); this.ctx.lineTo(offset + 4, -2); this.ctx.stroke(); }
        this.ctx.restore();
      }
      this.ctx.fillStyle = 'rgba(0,0,0,.22)';
      for (let x = platform.x + 18; x < platform.x + platform.w; x += 46) this.ctx.fillRect(x, platform.y + 13, 3, Math.max(0, platform.h - 13));
      if (!constructionAtlas && !drowned && !thornwild && !jackpot && !frozen && this.levelTiles.complete && this.levelTiles.naturalWidth > 0) {
        const cellW = this.levelTiles.naturalWidth / 4, cellH = this.levelTiles.naturalHeight / 2;
        this.ctx.save(); this.ctx.globalAlpha = .9;
        if (platform.h <= 25) {
          this.ctx.drawImage(this.levelTiles, cellW + 15, 72, cellW - 30, 70, platform.x - 3, platform.y - 7, platform.w + 6, 34);
        } else {
          const tileWidth = 98;
          for (let offset = 0; offset < platform.w; offset += tileWidth) {
            const width = Math.min(tileWidth, platform.w - offset);
            this.ctx.drawImage(this.levelTiles, 0, 0, cellW, cellH, platform.x + offset - 1, platform.y - 5, width + 2, Math.min(105, platform.h + 25));
          }
        }
        this.ctx.restore();
      }
      if (constructionAtlas?.complete && constructionAtlas.naturalWidth > 0) {
        this.ctx.save();
        this.ctx.globalAlpha = .96;
        if (platform.h <= 25) {
          this.drawAtlasCell(constructionAtlas, 4, 3, 2, platform.x - 8, platform.y - 23, platform.w + 16, 65);
        } else {
          const segmentWidth = Math.min(230, Math.max(110, platform.w));
          for (let offset = 0; offset < platform.w; offset += segmentWidth) {
            const width = Math.min(segmentWidth, platform.w - offset);
            this.drawAtlasCell(constructionAtlas, 4, 3, offset + width >= platform.w ? 1 : 0, platform.x + offset - 4, platform.y - 12, width + 8, Math.min(132, platform.h + 48));
          }
        }
        this.ctx.restore();
      }
    }
  }

  private drawLateHazardArt(hazard: RoomDefinition['hazards'][number]): void {
    const depth = this.lateDepthForTheme(this.room.theme);
    const atlas = depth ? this.lateEnvironmentAtlases.get(depth) : undefined;
    if (!atlas?.complete || atlas.naturalWidth <= 0) return;
    if (hazard.type === 'dreamDoor') {
      this.ctx.save(); this.ctx.globalAlpha = .9;
      this.drawAtlasCell(atlas, 4, 3, 3, hazard.x - 22, hazard.y - 18, hazard.w + 44, hazard.h + 30);
      this.ctx.restore(); return;
    }
    const timedActive = hazard.type === 'electric' || hazard.type === 'royalSigil'
      ? this.electricHazardActive(hazard.cycleOffset)
      : hazard.type === 'memoryRift'
        ? (this.time + (hazard.cycleOffset ?? 0)) % 2.8 > 1.45
        : Math.sin(this.time * 3 + (hazard.cycleOffset ?? 0)) > -.15;
    const primary = hazard.type === 'electric' || hazard.type === 'ice' || hazard.type === 'royalSigil' || hazard.type === 'memoryRift';
    const index = (primary ? 8 : 10) + (timedActive ? 1 : 0);
    this.ctx.save(); this.ctx.globalAlpha = .82;
    this.drawAtlasCell(atlas, 4, 3, index, hazard.x - 10, hazard.y - 55, hazard.w + 20, Math.max(76, hazard.h + 58));
    this.ctx.restore();
  }

  private drawHazards(): void {
    for (const hazard of this.room.hazards) {
      this.drawLateHazardArt(hazard);
      if (hazard.type === 'current') {
        const direction=Math.sign(hazard.forceX??1);this.ctx.save();this.ctx.globalAlpha=.48;this.ctx.fillStyle='rgba(47,220,236,.13)';this.ctx.fillRect(hazard.x,hazard.y,hazard.w,hazard.h);this.ctx.strokeStyle='#62f5ff';this.ctx.lineWidth=3;
        for(let y=hazard.y+16;y<hazard.y+hazard.h;y+=22){this.ctx.beginPath();for(let x=hazard.x+12;x<hazard.x+hazard.w-12;x+=24){const px=direction>0?x:hazard.x+hazard.w-(x-hazard.x);const py=y+Math.sin(this.time*7+x*.05)*5;if(x===hazard.x+12)this.ctx.moveTo(px,py);else this.ctx.lineTo(px,py);}this.ctx.stroke();}
        this.ctx.fillStyle='#c8ffff';this.ctx.font='900 18px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText(direction>0?'≫':'≪',centerX(hazard),hazard.y+hazard.h/2+6);this.ctx.restore();
      } else if (hazard.type === 'bubble') {
        this.ctx.save();this.ctx.globalAlpha=.5;const lift=this.ctx.createLinearGradient(0,hazard.y+hazard.h,0,hazard.y);lift.addColorStop(0,'#1ed5e822');lift.addColorStop(.5,'#73f7ff33');lift.addColorStop(1,'#d9ffff08');this.ctx.fillStyle=lift;this.ctx.fillRect(hazard.x,hazard.y,hazard.w,hazard.h);
        this.ctx.strokeStyle='#9effff';this.ctx.lineWidth=2;for(let i=0;i<9;i+=1){const span=hazard.h+45;const y=hazard.y+hazard.h-((this.time*(55+i*4)+i*37)%span);const x=hazard.x+12+(i*31)%(Math.max(20,hazard.w-24));const r=4+(i%3)*3;this.ctx.beginPath();this.ctx.arc(x,y,r,0,Math.PI*2);this.ctx.stroke();}this.ctx.restore();
      } else if (hazard.type === 'snare') {
        this.ctx.save();this.ctx.globalAlpha=.55;this.ctx.fillStyle='#6c9f3538';this.ctx.fillRect(hazard.x,hazard.y,hazard.w,hazard.h);this.ctx.strokeStyle='#a9e25b';this.ctx.lineWidth=3;
        for(let x=hazard.x+8;x<hazard.x+hazard.w;x+=18){this.ctx.beginPath();this.ctx.moveTo(x,hazard.y+hazard.h);this.ctx.quadraticCurveTo(x+12,hazard.y+hazard.h*.45+Math.sin(this.time*4+x)*8,x+4,hazard.y+8);this.ctx.stroke();}
        this.ctx.fillStyle='#e9ffc8';this.ctx.font='900 12px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText('SNARE · JUMP / DASH AVAILABLE',centerX(hazard),hazard.y+17);this.ctx.restore();
      } else if (hazard.type === 'vine') {
        this.ctx.save();this.ctx.fillStyle='#421b25';this.ctx.fillRect(hazard.x,hazard.y+hazard.h-7,hazard.w,7);this.ctx.strokeStyle='#a93f3e';this.ctx.lineWidth=5;
        for(let x=hazard.x+5;x<hazard.x+hazard.w;x+=22){this.ctx.beginPath();this.ctx.moveTo(x,hazard.y+hazard.h);this.ctx.quadraticCurveTo(x+10,hazard.y+8,x+18,hazard.y+hazard.h);this.ctx.stroke();this.ctx.fillStyle='#f05d48';this.ctx.beginPath();this.ctx.moveTo(x+8,hazard.y+16);this.ctx.lineTo(x+14,hazard.y);this.ctx.lineTo(x+18,hazard.y+17);this.ctx.fill();}this.ctx.restore();
      } else if (hazard.type === 'electric') {
        const active=this.electricHazardActive(hazard.cycleOffset);const phase=(this.time+(hazard.cycleOffset??0))%2.4;const railColor=active?'#fff46b':'#59eaff';this.ctx.save();this.ctx.fillStyle=active?'rgba(255,225,72,.24)':'rgba(93,234,255,.09)';this.ctx.fillRect(hazard.x,hazard.y,hazard.w,hazard.h);this.ctx.strokeStyle=railColor;this.ctx.shadowColor=railColor;this.ctx.shadowBlur=active?22:7;this.ctx.lineWidth=active?4:2;
        for(let rail=0;rail<3;rail+=1){const y=hazard.y+8+rail*12;this.ctx.beginPath();this.ctx.moveTo(hazard.x,y);for(let x=hazard.x+12;x<hazard.x+hazard.w;x+=12)this.ctx.lineTo(x,y+(active?Math.sin(x*.19+this.time*24)*7:0));this.ctx.stroke();}
        this.ctx.shadowBlur=0;this.ctx.fillStyle=active?'#fff9ba':'#b8f7ff';this.ctx.font='900 11px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText(active?'LIVE RAIL · MOVE':'CHARGING · '+Math.max(0,.9-phase).toFixed(1)+'s',centerX(hazard),hazard.y-5);this.ctx.restore();
      } else if (hazard.type === 'ice') {
        this.ctx.save();const sheen=this.ctx.createLinearGradient(hazard.x,hazard.y,hazard.x,hazard.y+hazard.h);sheen.addColorStop(0,'rgba(232,253,255,.72)');sheen.addColorStop(.45,'rgba(104,220,255,.34)');sheen.addColorStop(1,'rgba(25,86,120,.2)');this.ctx.fillStyle=sheen;this.ctx.fillRect(hazard.x,hazard.y,hazard.w,hazard.h);this.ctx.strokeStyle='#dffcff';this.ctx.lineWidth=2;for(let crack=0;crack<6;crack+=1){const x=hazard.x+12+crack*hazard.w/6;this.ctx.beginPath();this.ctx.moveTo(x,hazard.y+4);this.ctx.lineTo(x+14,hazard.y+17);this.ctx.lineTo(x+4,hazard.y+hazard.h-3);this.ctx.stroke();}this.ctx.fillStyle='#efffff';this.ctx.font='900 10px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText('CONTROLLED ICE · STEER THROUGH MOMENTUM',centerX(hazard),hazard.y-5);this.ctx.restore();
      } else if (hazard.type === 'dreamDoor') {
        const pulse=.5+.5*Math.sin(this.time*4+hazard.x*.01);this.ctx.save();this.ctx.globalAlpha=.72+pulse*.18;this.ctx.fillStyle='rgba(35,12,51,.86)';this.ctx.fillRect(hazard.x,hazard.y,hazard.w,hazard.h);this.ctx.strokeStyle='#d6a0ff';this.ctx.shadowColor='#bc7cff';this.ctx.shadowBlur=14+pulse*10;this.ctx.lineWidth=4;this.ctx.strokeRect(hazard.x+3,hazard.y+3,hazard.w-6,hazard.h-3);this.ctx.fillStyle='#ffe7a8';this.ctx.beginPath();this.ctx.arc(hazard.x+hazard.w*.72,hazard.y+hazard.h*.54,5,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#f7ddff';this.ctx.font='900 11px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText('LOOP',centerX(hazard),hazard.y+24);this.ctx.fillText((hazard.forceX??0)>centerX(hazard)?'PAIRS →':'← PAIRS',centerX(hazard),hazard.y+42);this.ctx.restore();
      } else if (hazard.type === 'mirror') {
        const pulse=.5+.5*Math.sin(this.time*5+hazard.x*.02);this.ctx.save();this.ctx.globalAlpha=.78;this.ctx.shadowColor='#8ff7ff';this.ctx.shadowBlur=15+pulse*10;const glass=this.ctx.createLinearGradient(hazard.x,0,hazard.x+hazard.w,0);glass.addColorStop(0,'#d8ffff22');glass.addColorStop(.5,'#8ff7ffaa');glass.addColorStop(1,'#d06cff44');this.ctx.fillStyle=glass;this.ctx.fillRect(hazard.x,hazard.y,hazard.w,hazard.h);this.ctx.strokeStyle='#e8ffff';this.ctx.lineWidth=3;this.ctx.strokeRect(hazard.x-3,hazard.y,hazard.w+6,hazard.h);this.ctx.beginPath();this.ctx.moveTo(hazard.x+4,hazard.y+38);this.ctx.lineTo(hazard.x+hazard.w-3,hazard.y+114);this.ctx.lineTo(hazard.x+5,hazard.y+198);this.ctx.lineTo(hazard.x+hazard.w-2,hazard.y+288);this.ctx.stroke();this.ctx.fillStyle='#e9ffff';this.ctx.font='900 10px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText((hazard.forceX??0)>0?'BOLT REDIRECTS →':'← BOLT REDIRECTS',centerX(hazard),hazard.y-8);this.ctx.restore();
      } else if (hazard.type === 'royalSigil') {
        const active=this.electricHazardActive(hazard.cycleOffset);const pulse=.5+.5*Math.sin(this.time*7+(hazard.cycleOffset??0));this.ctx.save();this.ctx.globalAlpha=active?.82:.36;this.ctx.translate(centerX(hazard),centerY(hazard));this.ctx.strokeStyle=active?'#fff1ff':'#ff66b5';this.ctx.fillStyle=active?'#ff3f882b':'#751b4822';this.ctx.shadowColor='#ff4f9a';this.ctx.shadowBlur=active?22:8;this.ctx.lineWidth=3;this.ctx.beginPath();this.ctx.ellipse(0,0,hazard.w*.48,hazard.h*.42,0,0,Math.PI*2);this.ctx.fill();this.ctx.stroke();for(let i=0;i<6;i+=1){const a=i*Math.PI/3+this.time*.35;this.ctx.beginPath();this.ctx.moveTo(Math.cos(a)*18,Math.sin(a)*9);this.ctx.lineTo(Math.cos(a)*(hazard.w*.42+pulse*5),Math.sin(a)*(hazard.h*.34+pulse*3));this.ctx.stroke();}this.ctx.fillStyle='#fff0fa';this.ctx.font='900 10px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText(active?'ROYAL SIGIL · LIVE':'ROYAL SIGIL · CHARGING',0,-hazard.h*.55);this.ctx.restore();
      } else if (hazard.type === 'memoryRift') {
        const active=(this.time+(hazard.cycleOffset??0))%2.8>1.45;this.ctx.save();this.ctx.globalAlpha=active?.78:.34;this.ctx.translate(centerX(hazard),centerY(hazard));this.ctx.strokeStyle=active?'#f4efff':'#8f6db3';this.ctx.fillStyle=active?'#a070dd2d':'#291c3b44';this.ctx.shadowColor='#bd7cff';this.ctx.shadowBlur=active?25:9;this.ctx.lineWidth=3;this.ctx.beginPath();for(let i=0;i<10;i+=1){const a=i*Math.PI/5;const r=i%2?hazard.w*.28:hazard.w*.48;const x=Math.cos(a)*r,y=Math.sin(a)*hazard.h*.42;if(i===0)this.ctx.moveTo(x,y);else this.ctx.lineTo(x,y);}this.ctx.closePath();this.ctx.fill();this.ctx.stroke();this.ctx.fillStyle='#eee8ff';this.ctx.font='900 10px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText(active?'MEMORY RIFT · REAL':'MEMORY RIFT · FADING',0,-hazard.h*.55);this.ctx.restore();
      } else if (hazard.type === 'lava') {
        const gradient = this.ctx.createLinearGradient(0, hazard.y, 0, hazard.y + hazard.h);
        gradient.addColorStop(0, '#ffc75a');
        gradient.addColorStop(.3, '#ff425c');
        gradient.addColorStop(1, '#681027');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h);
        this.ctx.fillStyle = '#fff0a8';
        for (let x = hazard.x + 6; x < hazard.x + hazard.w; x += 19) this.ctx.beginPath(), this.ctx.arc(x, hazard.y + Math.sin(this.time * 5 + x) * 4, 4, 0, Math.PI * 2), this.ctx.fill();
      } else {
        if (this.levelTiles.complete && this.levelTiles.naturalWidth > 0) {
          const cellW = this.levelTiles.naturalWidth / 4, cellH = this.levelTiles.naturalHeight / 2;
          this.ctx.save(); this.ctx.globalAlpha = .88;
          this.ctx.drawImage(this.levelTiles, cellW * 2, 0, cellW, cellH, hazard.x - 12, hazard.y - 48, hazard.w + 24, 72);
          this.ctx.restore();
        } else {
          this.ctx.fillStyle = '#8d769a';
          const count = Math.ceil(hazard.w / 18);
          for (let i = 0; i < count; i += 1) {
            const x = hazard.x + i * hazard.w / count;
            this.ctx.beginPath();
            this.ctx.moveTo(x, hazard.y + hazard.h);
            this.ctx.lineTo(x + hazard.w / count / 2, hazard.y);
            this.ctx.lineTo(x + hazard.w / count, hazard.y + hazard.h);
            this.ctx.fill();
          }
        }
      }
    }
  }

  private drawBossHazards(): void {
    for (const hazard of this.bossHazards) {
      const warning = hazard.telegraph > 0;
      const blink = .42 + Math.sin(this.time * 26) * .22;
      this.ctx.save(); this.ctx.globalAlpha = warning ? blink : .76;
      this.ctx.strokeStyle = warning ? '#fff1a8' : hazard.color; this.ctx.lineWidth = warning ? 4 : 2; this.ctx.setLineDash(warning ? [13, 9] : []);
      this.ctx.strokeRect(hazard.x, hazard.y, hazard.w, hazard.h);
      if(hazard.kind==='dreamEcho'||hazard.kind==='dreamEchoFake'||hazard.kind==='falseWake'){
        this.ctx.setLineDash([]);this.ctx.textAlign='center';this.ctx.font='900 12px Barlow Condensed';
        if(hazard.kind==='dreamEcho'){this.ctx.strokeStyle='#fff2b8';this.ctx.lineWidth=3;this.ctx.strokeRect(hazard.x+7,hazard.y+7,hazard.w-14,hazard.h-14);this.ctx.fillStyle='#fff2b8';this.ctx.fillText('SOLID SHADOW · REAL',centerX(hazard),hazard.y+18);}
        else if(hazard.kind==='dreamEchoFake'){this.ctx.fillStyle='#d8c6eb';this.ctx.fillText('SOFT ECHO · HARMLESS',centerX(hazard),hazard.y+18);}
        else{this.ctx.fillStyle='#ffd8f5';this.ctx.fillText(`FALSE AWAKENING · ${hazard.telegraph.toFixed(1)}s`,centerX(hazard),hazard.y+18);}
      }
      if(warning&&(hazard.kind==='crystalDelay'||hazard.kind==='memoryShatter'||hazard.kind==='frozenChoir')){this.ctx.setLineDash([]);this.ctx.fillStyle='#f2feff';this.ctx.font='900 11px Barlow Condensed';this.ctx.textAlign='center';const label=hazard.kind==='crystalDelay'?'DELAYED CRYSTAL':hazard.kind==='memoryShatter'?'MEMORY SHATTER':'FROZEN CHOIR';this.ctx.fillText(`${label} · ${hazard.telegraph.toFixed(1)}s`,centerX(hazard),hazard.y+17);}
      if(warning&&(hazard.kind==='mirrorOriginal'||hazard.kind==='mirrorReflected'||hazard.kind==='mirrorShatter')){this.ctx.setLineDash([]);this.ctx.fillStyle=hazard.kind==='mirrorOriginal'?'#bffcff':hazard.kind==='mirrorReflected'?'#f0c4ff':'#f4ffff';this.ctx.font='900 11px Barlow Condensed';this.ctx.textAlign='center';const label=hazard.kind==='mirrorOriginal'?'BLUE ORIGINAL · FIRST':hazard.kind==='mirrorReflected'?'VIOLET REFLECTION · SECOND':'MIRROR SHATTER';this.ctx.fillText(`${label} · ${hazard.telegraph.toFixed(1)}s`,centerX(hazard),hazard.y+17);}
      if (hazard.kind === 'wagerCircle') {
        this.ctx.setLineDash(warning?[12,8]:[]);this.ctx.strokeStyle='#ffe45e';this.ctx.fillStyle=hazard.participated?'rgba(255,228,94,.25)':'rgba(255,228,94,.1)';this.ctx.lineWidth=5;this.ctx.beginPath();this.ctx.ellipse(centerX(hazard),hazard.y+hazard.h-10,hazard.w*.5,hazard.h*.34,0,0,Math.PI*2);this.ctx.fill();this.ctx.stroke();this.ctx.setLineDash([]);this.ctx.fillStyle='#fff7bd';this.ctx.font='900 12px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText(hazard.participated?'SIDE BET LOCKED · HOLD':'OPTIONAL SIDE BET · ENTER',centerX(hazard),hazard.y+18);this.ctx.restore();continue;
      }
      if (!warning) {
        if (hazard.kind === 'pour') {
          const liquid = this.ctx.createLinearGradient(0,hazard.y,0,hazard.y+hazard.h);liquid.addColorStop(0,'#e8ffff');liquid.addColorStop(.25,hazard.color);liquid.addColorStop(1,'#134b55');this.ctx.fillStyle=liquid;this.ctx.fillRect(hazard.x,hazard.y,hazard.w,hazard.h);
          this.ctx.fillStyle='#ffffff99';for(let x=hazard.x+8;x<hazard.x+hazard.w;x+=23){this.ctx.beginPath();this.ctx.arc(x,hazard.y+Math.sin(x+this.time*8)*3,3,0,Math.PI*2);this.ctx.fill();}
        } else if (hazard.kind === 'crowd') {
          const surge=this.ctx.createLinearGradient(hazard.x,hazard.y,hazard.x,hazard.y+hazard.h);surge.addColorStop(0,`${hazard.color}18`);surge.addColorStop(1,`${hazard.color}aa`);this.ctx.fillStyle=surge;this.ctx.fillRect(hazard.x,hazard.y,hazard.w,hazard.h);
          this.ctx.fillStyle='#d7ffffaa';for(let x=hazard.x+18;x<hazard.x+hazard.w;x+=34){const rise=Math.sin(this.time*11+x)*10;this.ctx.beginPath();this.ctx.arc(x,hazard.y+hazard.h-30+rise,8,0,Math.PI*2);this.ctx.fill();this.ctx.fillRect(x-7,hazard.y+hazard.h-23+rise,14,25);}
        } else if (hazard.kind === 'spotlight') {
          const beam=this.ctx.createLinearGradient(hazard.x,hazard.y,hazard.x,hazard.y+hazard.h);beam.addColorStop(0,'#ffffffdd');beam.addColorStop(.22,`${hazard.color}77`);beam.addColorStop(1,`${hazard.color}18`);this.ctx.fillStyle=beam;this.ctx.beginPath();this.ctx.moveTo(hazard.x+hazard.w*.43,hazard.y);this.ctx.lineTo(hazard.x+hazard.w*.57,hazard.y);this.ctx.lineTo(hazard.x+hazard.w,hazard.y+hazard.h);this.ctx.lineTo(hazard.x,hazard.y+hazard.h);this.ctx.closePath();this.ctx.fill();
        } else if (hazard.kind === 'pounce') {
          const shadow=this.ctx.createLinearGradient(hazard.x,hazard.y,hazard.x+hazard.w,hazard.y);shadow.addColorStop(0,'#12070a22');shadow.addColorStop(.5,`${hazard.color}aa`);shadow.addColorStop(1,'#12070a22');this.ctx.fillStyle=shadow;this.ctx.beginPath();this.ctx.moveTo(hazard.x,hazard.y+hazard.h);this.ctx.lineTo(hazard.x+hazard.w*.18,hazard.y+hazard.h*.32);this.ctx.lineTo(hazard.x+hazard.w*.5,hazard.y);this.ctx.lineTo(hazard.x+hazard.w*.82,hazard.y+hazard.h*.32);this.ctx.lineTo(hazard.x+hazard.w,hazard.y+hazard.h);this.ctx.closePath();this.ctx.fill();
        } else if (hazard.kind === 'snare') {
          this.ctx.fillStyle='#6d9a333c';this.ctx.fillRect(hazard.x,hazard.y,hazard.w,hazard.h);this.ctx.strokeStyle='#b2e45f';this.ctx.lineWidth=4;for(let x=hazard.x+8;x<hazard.x+hazard.w;x+=22){this.ctx.beginPath();this.ctx.moveTo(x,hazard.y+hazard.h);this.ctx.quadraticCurveTo(x+17,hazard.y+hazard.h*.42,x+6,hazard.y+6);this.ctx.stroke();}
        } else if (hazard.kind === 'thorns') {
          this.ctx.fillStyle=`${hazard.color}2f`;this.ctx.fillRect(hazard.x,hazard.y,hazard.w,hazard.h);this.ctx.fillStyle='#f07052';for(let x=hazard.x;x<hazard.x+hazard.w;x+=28){this.ctx.beginPath();this.ctx.moveTo(x,hazard.y+hazard.h);this.ctx.lineTo(x+15,hazard.y+Math.sin(x)*14);this.ctx.lineTo(x+28,hazard.y+hazard.h);this.ctx.fill();}
        } else if (hazard.kind === 'electricRail') {
          this.ctx.fillStyle='rgba(255,231,74,.23)';this.ctx.fillRect(hazard.x,hazard.y,hazard.w,hazard.h);this.ctx.strokeStyle='#fff36e';this.ctx.shadowColor='#ffe05a';this.ctx.shadowBlur=22;this.ctx.lineWidth=5;for(let line=0;line<3;line+=1){const y=hazard.y+12+line*18;this.ctx.beginPath();this.ctx.moveTo(hazard.x,y);for(let x=hazard.x+14;x<hazard.x+hazard.w;x+=14)this.ctx.lineTo(x,y+Math.sin(x*.21+this.time*30)*9);this.ctx.stroke();}
        } else if (hazard.kind === 'diceSlam') {
          this.ctx.fillStyle=`${hazard.color}55`;this.roundRect(hazard.x,hazard.y,hazard.w,hazard.h,18);this.ctx.fill();this.ctx.strokeStyle='#ffe76a';this.ctx.lineWidth=4;this.ctx.strokeRect(hazard.x+8,hazard.y+8,hazard.w-16,hazard.h-16);this.ctx.fillStyle='#fff4c1';for(const [px,py] of [[.28,.28],[.72,.28],[.5,.5],[.28,.72],[.72,.72]]){this.ctx.beginPath();this.ctx.arc(hazard.x+hazard.w*px,hazard.y+hazard.h*py,7,0,Math.PI*2);this.ctx.fill();}
        } else if (hazard.kind === 'collapse') {
          this.ctx.fillStyle='rgba(255,76,129,.24)';this.ctx.fillRect(hazard.x,hazard.y,hazard.w,hazard.h);this.ctx.fillStyle='#ff76d9';for(let card=0;card<7;card+=1){const x=hazard.x+card*hazard.w/7;const fall=((this.time*160+card*31)%Math.max(50,hazard.h));this.ctx.save();this.ctx.translate(x+12,hazard.y+fall);this.ctx.rotate(this.time*(card%2?1:-1));this.ctx.fillRect(-9,-13,18,26);this.ctx.restore();}
        } else if (hazard.kind === 'crystalDelay') {
          const ice=this.ctx.createLinearGradient(hazard.x,hazard.y,hazard.x,hazard.y+hazard.h);ice.addColorStop(0,'rgba(238,253,255,.8)');ice.addColorStop(.42,`${hazard.color}88`);ice.addColorStop(1,'rgba(35,98,128,.42)');this.ctx.fillStyle=ice;this.ctx.fillRect(hazard.x,hazard.y,hazard.w,hazard.h);this.ctx.fillStyle='#ecfdff';for(let shard=0;shard<7;shard+=1){const x=hazard.x+(shard+.5)*hazard.w/7;const peak=hazard.y+(shard%2)*22;this.ctx.beginPath();this.ctx.moveTo(x-13,hazard.y+hazard.h);this.ctx.lineTo(x,peak);this.ctx.lineTo(x+15,hazard.y+hazard.h);this.ctx.fill();}
        } else if (hazard.kind === 'memoryShatter') {
          this.ctx.fillStyle=`${hazard.color}45`;this.ctx.fillRect(hazard.x,hazard.y,hazard.w,hazard.h);this.ctx.strokeStyle='#effeff';this.ctx.lineWidth=4;for(let crack=0;crack<6;crack+=1){const x=hazard.x+18+crack*hazard.w/6;this.ctx.beginPath();this.ctx.moveTo(x,hazard.y);this.ctx.lineTo(x-12,hazard.y+hazard.h*.35);this.ctx.lineTo(x+10,hazard.y+hazard.h*.64);this.ctx.lineTo(x-4,hazard.y+hazard.h);this.ctx.stroke();}
        } else if (hazard.kind === 'frozenChoir') {
          const choir=this.ctx.createLinearGradient(0,hazard.y,0,hazard.y+hazard.h);choir.addColorStop(0,'rgba(224,252,255,.18)');choir.addColorStop(1,`${hazard.color}88`);this.ctx.fillStyle=choir;this.ctx.fillRect(hazard.x,hazard.y,hazard.w,hazard.h);this.ctx.fillStyle='#efffff';this.ctx.font='900 30px Barlow Condensed';this.ctx.textAlign='center';for(let note=0;note<4;note+=1)this.ctx.fillText(note%2?'♫':'◇',hazard.x+(note+.5)*hazard.w/4,hazard.y+45+(note%2)*48);
        } else if (hazard.kind === 'dreamEcho' || hazard.kind === 'dreamEchoFake') {
          const real=hazard.kind==='dreamEcho';const veil=this.ctx.createLinearGradient(0,hazard.y,0,hazard.y+hazard.h);veil.addColorStop(0,real?'rgba(255,242,184,.48)':'rgba(214,160,255,.13)');veil.addColorStop(1,real?'rgba(255,84,190,.72)':'rgba(99,66,127,.28)');this.ctx.fillStyle=veil;this.ctx.fillRect(hazard.x,hazard.y,hazard.w,hazard.h);this.ctx.fillStyle=real?'#fff2b8':'#cdb7df';for(let echo=0;echo<5;echo+=1){const x=hazard.x+(echo+.5)*hazard.w/5;this.ctx.globalAlpha=real?.82:.28;this.ctx.beginPath();this.ctx.ellipse(x,hazard.y+hazard.h-45,18,43,0,0,Math.PI*2);this.ctx.fill();}
        } else if (hazard.kind === 'mirrorOriginal' || hazard.kind === 'mirrorReflected' || hazard.kind === 'mirrorShatter') {
          const original=hazard.kind==='mirrorOriginal',shatter=hazard.kind==='mirrorShatter';const beam=this.ctx.createLinearGradient(0,hazard.y,0,hazard.y+hazard.h);beam.addColorStop(0,original?'rgba(84,230,255,.78)':shatter?'rgba(232,255,255,.72)':'rgba(208,108,255,.72)');beam.addColorStop(1,original?'rgba(22,97,135,.26)':shatter?'rgba(106,232,255,.28)':'rgba(74,27,111,.28)');this.ctx.fillStyle=beam;this.ctx.fillRect(hazard.x,hazard.y,hazard.w,hazard.h);this.ctx.strokeStyle='#efffff';this.ctx.lineWidth=3;for(let crack=0;crack<6;crack+=1){const x=hazard.x+18+crack*hazard.w/6;this.ctx.beginPath();this.ctx.moveTo(x,hazard.y);this.ctx.lineTo(x-12,hazard.y+hazard.h*.35);this.ctx.lineTo(x+10,hazard.y+hazard.h*.7);this.ctx.lineTo(x-4,hazard.y+hazard.h);this.ctx.stroke();}
        } else if (hazard.kind === 'falseWake') {
          this.ctx.fillStyle='rgba(242,196,231,.24)';this.ctx.fillRect(hazard.x,hazard.y,hazard.w,hazard.h);this.ctx.strokeStyle='#fff4fb';this.ctx.lineWidth=3;for(let line=0;line<8;line+=1){const y=hazard.y+line*hazard.h/8;this.ctx.beginPath();this.ctx.moveTo(hazard.x,y);this.ctx.bezierCurveTo(hazard.x+hazard.w*.3,y+25,hazard.x+hazard.w*.7,y-25,hazard.x+hazard.w,y);this.ctx.stroke();}
        } else {
          this.ctx.fillStyle=`${hazard.color}24`;this.ctx.fillRect(hazard.x,hazard.y,hazard.w,hazard.h);
          this.ctx.fillStyle='#ffe7dd';const teeth=hazard.kind==='bite'?9:6;for(let i=0;i<teeth;i+=1){const x=hazard.x+i*hazard.w/teeth;this.ctx.beginPath();this.ctx.moveTo(x,hazard.y);this.ctx.lineTo(x+hazard.w/teeth*.5,hazard.y+22);this.ctx.lineTo(x+hazard.w/teeth,hazard.y);this.ctx.moveTo(x,hazard.y+hazard.h);this.ctx.lineTo(x+hazard.w/teeth*.5,hazard.y+hazard.h-22);this.ctx.lineTo(x+hazard.w/teeth,hazard.y+hazard.h);this.ctx.fill();}
        }
      }
      this.ctx.restore();
    }
  }

  private drawBelladonnaVortex(): void {
    const strength = clamp(this.belladonnaVortex / 1.8, 0, 1);
    this.ctx.save();this.ctx.translate(WIDTH/2,FLOOR_Y-45);this.ctx.rotate(this.time*3.2);this.ctx.globalAlpha=.3+.35*strength;
    for(let i=0;i<5;i+=1){this.ctx.strokeStyle=i%2?'#ff4f9a':'#ffc1df';this.ctx.lineWidth=3+i;this.ctx.beginPath();this.ctx.ellipse(0,0,45+i*25,14+i*8,i*.4,0,Math.PI*1.6);this.ctx.stroke();}
    this.ctx.fillStyle='#08040a';this.ctx.beginPath();this.ctx.ellipse(0,0,54,18,0,0,Math.PI*2);this.ctx.fill();this.ctx.restore();
  }

  private drawExit(): void {
    const exit = this.room.exit;
    if (this.room.exitSide === 'left' || this.room.exitSide === 'right') this.drawTileCell(3, centerX(exit) - 92, exit.y - 76, 184, 218, this.roomCleared ? .95 : .62);
    this.ctx.save();
    this.ctx.fillStyle = this.roomCleared ? '#28183a' : '#140f1b';
    this.ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    this.ctx.strokeStyle = this.roomCleared ? '#b46cff' : '#463b4e';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);
    if (this.roomCleared) {
      this.ctx.shadowColor = '#b46cff';
      this.ctx.shadowBlur = 25;
      this.ctx.fillStyle = `rgba(180,108,255,${.28 + Math.sin(this.time * 4) * .08})`;
      this.ctx.fillRect(exit.x + 8, exit.y + 9, exit.w - 16, exit.h - 9);
      this.ctx.fillStyle = '#f2dfff';
      this.ctx.font = '700 12px Barlow Condensed';
      this.ctx.textAlign = 'center';
      const labelY = this.room.exitSide === 'top' ? exit.y + exit.h + 20 : this.room.exitSide === 'bottom' ? exit.y - 12 : exit.y - 10;
      const directionLabel: Record<GateSide,string> = {left:'← NEXT',right:'NEXT →',top:'NEXT ↑',bottom:'NEXT ↓'};
      this.ctx.fillText(directionLabel[this.room.exitSide ?? 'right'], centerX(exit), labelY + Math.sin(this.time * 5) * 3);
    } else {
      this.ctx.fillStyle = '#ff425c';
      this.ctx.fillRect(centerX(exit) - 4, centerY(exit) - 4, 8, 8);
    }
    this.ctx.restore();
  }

  private drawEntry(): void {
    const side = this.room.entrySide;
    if (!side) return;
    const entry: Rect = side === 'left' ? { x: 0, y: 500, w: 58, h: 130 }
      : side === 'right' ? { x: WIDTH - 58, y: 500, w: 58, h: 130 }
      : side === 'top' ? { x: 598, y: 0, w: 84, h: 82 }
      : { x: 598, y: FLOOR_Y - 8, w: 84, h: HEIGHT - FLOOR_Y + 8 };
    if (side === 'left' || side === 'right') this.drawTileCell(3, centerX(entry) - 86, entry.y - 70, 172, 205, .42);
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(9,7,15,.78)'; this.ctx.fillRect(entry.x, entry.y, entry.w, entry.h);
    this.ctx.strokeStyle = '#51475e'; this.ctx.lineWidth = 3; this.ctx.strokeRect(entry.x, entry.y, entry.w, entry.h);
    this.ctx.fillStyle = '#7d7289'; this.ctx.beginPath(); this.ctx.arc(centerX(entry), centerY(entry), 4, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.restore();
  }

  private drawPlayer(): void {
    const p = this.player;
    const blink = p.hurtFlash > 0 && Math.floor(p.hurtFlash * 24) % 2 === 0;
    if (blink) return;
    const scale = this.screen === 'hub' || (this.screen === 'dialogue' && this.dialogueReturnScreen === 'hub') ? 1.18 : 1;
    const running = p.grounded && Math.abs(p.vx) > 42 && p.dashTime === 0 && p.firePoseTime === 0 && p.kickTime === 0 && p.punchTime === 0 && p.hurtFlash === 0;
    const stridePhase = p.runAnimationTime * 13.2;
    const stride = running ? Math.sin(stridePhase) : 0;
    const lift = running ? Math.max(0, Math.sin(stridePhase * 2)) * 1.8 : p.grounded ? Math.sin(p.animationTime * 2.4) * .45 : 0;
    const dash = p.dashTime > 0;
    const cast = p.firePoseTime > 0;
    const castHand = this.castingHandWorld();
    const localHandX = (castHand.x - centerX(p)) * p.facing / scale;
    const localHandY = (castHand.y - (p.y + p.h)) / scale;
    const legReach = running ? 12 : 4;
    const frontFootX = stride * legReach;
    const backFootX = -stride * legReach;
    const airborne = !p.grounded;
    if (dash || p.dashRecoveryTime > 0) this.drawDashWake();

    if(p.kickTime>0&&this.miloDashHurtAtlas.complete&&this.miloDashHurtAtlas.naturalWidth>0){
      this.drawMiloDashHurtAtlas(this.selectMiloPounceFrame(),scale*1.02);
      this.drawPounceEffect();
      this.drawPersistentAbilityEffects();
      if(p.invulnerable>0)this.drawInvulnerabilityTwinkles();
      if(p.shieldCharges>0)this.drawGuardianHalo();
      return;
    }

    const rasterCast = cast && p.kickTime === 0 && p.punchTime === 0 && this.miloCastAtlas.complete && this.miloCastAtlas.naturalWidth > 0;
    if (rasterCast) {
      this.drawMiloCastAtlas(this.selectMiloCastFrame(), scale);
      if (p.firePoseTime > .025) this.drawHandArcane(castHand);
      if (p.invulnerable > 0) this.drawInvulnerabilityTwinkles();
      if (p.shieldCharges > 0) this.drawGuardianHalo();
      if (this.stoneBarrierTime > 0) this.drawStoneBarrier();
      this.drawPersistentAbilityEffects();
      return;
    }

    const rasterPoseAllowed = p.kickTime === 0 && p.punchTime === 0;
    if (rasterPoseAllowed) {
      if (p.hurtFlash > 0 && this.miloDashHurtAtlas.complete && this.miloDashHurtAtlas.naturalWidth > 0) {
        this.drawMiloDashHurtAtlas(p.hurtFlash > .2 ? 5 : 4, scale);
        if (p.shieldCharges > 0) this.drawGuardianHalo();
        this.drawPersistentAbilityEffects();
        return;
      }
      if ((dash || p.dashRecoveryTime > 0 || p.waveSlideTime > 0) && this.miloDashHurtAtlas.complete && this.miloDashHurtAtlas.naturalWidth > 0) {
        this.drawMiloDashHurtAtlas(this.selectMiloDashFrame(), scale);
        if (p.invulnerable > 0) this.drawInvulnerabilityTwinkles();
        if (p.shieldCharges > 0) this.drawGuardianHalo();
        this.drawPersistentAbilityEffects();
        return;
      }
      if (running && this.miloRunAtlas.complete && this.miloRunAtlas.naturalWidth > 0) {
        this.drawMiloRunAtlas(scale);
        if (p.invulnerable > 0) this.drawInvulnerabilityTwinkles();
        if (p.shieldCharges > 0) this.drawGuardianHalo();
        this.drawPersistentAbilityEffects();
        return;
      }
      if (this.miloMovementAtlas.complete && this.miloMovementAtlas.naturalWidth > 0) {
        this.drawMiloMovementAtlas(this.selectMiloMovementFrame(), scale);
        if (cast && p.firePoseTime > .025) this.drawHandArcane(castHand);
        if (p.invulnerable > 0 && p.hurtFlash <= 0) this.drawInvulnerabilityTwinkles();
        if (p.shieldCharges > 0) this.drawGuardianHalo();
        if (this.stoneBarrierTime > 0) this.drawStoneBarrier();
        this.drawPersistentAbilityEffects();
        return;
      }
    }

    this.ctx.save();
    this.ctx.translate(centerX(p), p.y + p.h - lift);
    this.ctx.scale(p.facing * scale, scale);
    if (p.hurtFlash > 0) this.ctx.globalAlpha = .6;
    if (p.grounded) {
      this.ctx.fillStyle = 'rgba(0,0,0,.34)'; this.ctx.beginPath(); this.ctx.ellipse(0, 3, dash ? 35 : 24, dash ? 5 : 7, 0, 0, Math.PI * 2); this.ctx.fill();
    }
    if (dash) {
      this.ctx.save(); this.ctx.globalAlpha = .2; this.ctx.fillStyle = this.getArcaneAccentColor();
      for (let i = 0; i < 3; i += 1) this.roundRect(-34 - i * 18, -54 + i * 2, 42 + i * 8, 7, 4), this.ctx.fill();
      this.ctx.restore();
      this.ctx.rotate(clamp(p.dashY, -.7, .7) * .32 - .13);
    } else if (p.dashRecoveryTime > 0) this.ctx.rotate(-.07 * p.facing);

    // Legs and shoes are separate articulated shapes, so direction never flips
    // independently from Milo and the silhouette interpolates every frame.
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = '#171825'; this.ctx.lineWidth = 10;
    this.ctx.beginPath();
    if (dash) {
      this.ctx.moveTo(-5, -27); this.ctx.lineTo(-20, -8); this.ctx.lineTo(-33, -3);
      this.ctx.moveTo(7, -27); this.ctx.lineTo(-4, -6); this.ctx.lineTo(10, -1);
    } else if (airborne) {
      const tuck = p.vy < 80 ? 1 : -1;
      this.ctx.moveTo(-6, -28); this.ctx.lineTo(-12, -13); this.ctx.lineTo(-20, -6 * tuck);
      this.ctx.moveTo(7, -28); this.ctx.lineTo(15, -15); this.ctx.lineTo(23, -10 + tuck * 4);
    } else {
      this.ctx.moveTo(-6, -28); this.ctx.lineTo(-8 + frontFootX * .55, -14); this.ctx.lineTo(frontFootX, -2);
      this.ctx.moveTo(7, -28); this.ctx.lineTo(8 + backFootX * .55, -14); this.ctx.lineTo(backFootX, -2);
    }
    this.ctx.stroke();
    this.ctx.strokeStyle = '#e7edf2'; this.ctx.lineWidth = 6;
    this.ctx.beginPath(); this.ctx.moveTo((dash ? -33 : frontFootX) - 4, dash ? -2 : 0); this.ctx.lineTo((dash ? -22 : frontFootX) + 7, dash ? 0 : 1);
    this.ctx.moveTo((dash ? 10 : backFootX) - 4, dash ? -1 : 0); this.ctx.lineTo((dash ? 21 : backFootX) + 7, dash ? 1 : 1); this.ctx.stroke();

    const torsoBob = running ? Math.cos(stridePhase * 2) * .8 : 0;
    this.ctx.fillStyle = '#16222d'; this.roundRect(-20, -64 + torsoBob, 40, 40, 10); this.ctx.fill();
    this.ctx.fillStyle = '#285266'; this.roundRect(-17, -61 + torsoBob, 34, 33, 8); this.ctx.fill();
    this.ctx.strokeStyle = '#6bc7c5'; this.ctx.lineWidth = 2; this.ctx.beginPath(); this.ctx.moveTo(-3, -58); this.ctx.lineTo(-3, -45); this.ctx.moveTo(4, -58); this.ctx.lineTo(4, -45); this.ctx.stroke();
    this.ctx.fillStyle = '#10141c'; this.ctx.fillRect(-15, -35, 30, 8);

    const shoulderY = -53 + torsoBob;
    const armSwing = running ? stride * 13 : 0;
    this.ctx.strokeStyle = '#203c4a'; this.ctx.lineWidth = 9;
    this.ctx.beginPath();
    if (cast) {
      this.ctx.moveTo(12, shoulderY); this.ctx.lineTo(localHandX * .55, shoulderY + (localHandY - shoulderY) * .48); this.ctx.lineTo(localHandX, localHandY);
      this.ctx.moveTo(-12, shoulderY); this.ctx.lineTo(-20, -36); this.ctx.lineTo(-9, -29);
    } else if (dash) {
      this.ctx.moveTo(12, shoulderY); this.ctx.lineTo(-5, -39); this.ctx.lineTo(-24, -33);
      this.ctx.moveTo(-12, shoulderY); this.ctx.lineTo(-25, -46); this.ctx.lineTo(-35, -40);
    } else {
      this.ctx.moveTo(12, shoulderY); this.ctx.lineTo(16 - armSwing * .45, -39); this.ctx.lineTo(12 - armSwing, -28);
      this.ctx.moveTo(-12, shoulderY); this.ctx.lineTo(-16 + armSwing * .45, -39); this.ctx.lineTo(-12 + armSwing, -28);
    }
    this.ctx.stroke();

    // Head, hood, and a fixed face anchor preserve idle registration.
    this.ctx.fillStyle = '#13222b'; this.ctx.beginPath(); this.ctx.ellipse(-3, -68, 18, 16, -.12, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.fillStyle = '#b97863'; this.ctx.beginPath(); this.ctx.arc(1, -73, 13, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.fillStyle = '#17131f'; this.ctx.beginPath();
    this.ctx.moveTo(-14, -79); this.ctx.quadraticCurveTo(-5, -93, 8, -87); this.ctx.lineTo(16, -82); this.ctx.lineTo(8, -81); this.ctx.lineTo(13, -75); this.ctx.lineTo(2, -80); this.ctx.lineTo(-6, -74); this.ctx.lineTo(-16, -72); this.ctx.closePath(); this.ctx.fill();
    this.ctx.fillStyle = '#f4f8f8'; this.ctx.fillRect(7, -75, 4, 2); this.ctx.fillStyle = '#1d252d'; this.ctx.fillRect(9, -75, 2, 2);
    this.ctx.strokeStyle = '#6bc7c5'; this.ctx.lineWidth = 2; this.ctx.beginPath(); this.ctx.arc(-1, -47, 14, .2, Math.PI - .2); this.ctx.stroke();
    this.ctx.restore();

    if (cast && p.firePoseTime > .025) this.drawHandArcane(castHand);
    if (p.punchTime > 0) this.drawHeavyArcaneEffect();
    if (p.kickTime > 0) this.drawPounceEffect();
    if (p.invulnerable > 0 && p.hurtFlash <= 0) this.drawInvulnerabilityTwinkles();
    if (p.shieldCharges > 0) this.drawGuardianHalo();
    if (this.stoneBarrierTime > 0) this.drawStoneBarrier();
    this.drawPersistentAbilityEffects();
  }

  private drawPlayerSnareStatus():void{
    if(this.playerSnareTime<=0)return;
    const pulse=.72+Math.sin(this.time*10)*.18;const x=centerX(this.player),feet=this.player.y+this.player.h;
    this.ctx.save();this.ctx.globalAlpha=pulse;this.ctx.strokeStyle='#b8ec67';this.ctx.fillStyle='#79a73b55';this.ctx.lineWidth=3;
    this.ctx.beginPath();this.ctx.ellipse(x,feet+3,38,9,0,0,Math.PI*2);this.ctx.fill();this.ctx.stroke();
    for(const offset of [-24,-10,8,23]){this.ctx.beginPath();this.ctx.moveTo(x+offset,feet+4);this.ctx.quadraticCurveTo(x+offset+10,feet-22,x+offset+4,feet-38);this.ctx.stroke();}
    this.ctx.fillStyle='#efffd0';this.ctx.font='900 12px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText('SNARED · JUMP / DASH READY',x,Math.max(34,this.player.y-18));this.ctx.restore();
  }

  private drawMiloRunAtlas(scale: number): void {
    const frame = Math.floor(this.player.runAnimationTime * 13.5) % 8;
    this.drawMiloAtlasFrame(this.miloRunAtlas, MILO_ATLASES.run, frame, scale, true);
  }

  private selectMiloMovementFrame(): number {
    const p = this.player;
    if (!p.grounded) {
      if (p.vy < -170) return 4;
      if (p.vy < 210) return 5;
      return 6;
    }
    if (p.landPoseTime > 0) return 7;
    return 1;
  }

  private drawMiloMovementAtlas(frame: number, scale: number): void {
    this.drawMiloAtlasFrame(this.miloMovementAtlas, MILO_ATLASES.movement, frame, scale, this.player.grounded, frame < 2);
  }

  private selectMiloDashFrame(): number {
    if (this.player.dashTime > .13) return 0;
    if (this.player.dashTime > .07) return 1;
    if (this.player.dashTime > 0) return 2;
    return 3;
  }

  private selectMiloPounceFrame(): number {
    const progress=clamp(1-this.player.kickTime/.5,0,1);
    if(progress<.18)return 0;
    if(progress<.4)return 1;
    if(progress<.78)return 2;
    return 3;
  }

  private selectMiloCastFrame(): number {
    const p = this.player;
    if (!p.grounded) return p.lastAimY > .35 ? 5 : p.lastAimY < -.45 ? 3 : 4;
    if (p.lastAimY < -.45) return 3;
    if (Math.abs(p.vx) > 42) return 2;
    return p.firePoseTime > ARCANE_PROFILES[this.arcaneProfileId].firePoseSeconds * .56 ? 0 : 1;
  }

  private drawMiloCastAtlas(frame: number, scale: number): void {
    this.drawMiloAtlasFrame(this.miloCastAtlas, MILO_ATLASES.cast, frame, scale, this.player.grounded);
  }

  private drawMiloDashHurtAtlas(frame: number, scale: number): void {
    this.drawMiloAtlasFrame(this.miloDashHurtAtlas, MILO_ATLASES.dashHurt, frame, scale, this.player.grounded || frame === 3 || frame >= 4);
  }

  private drawMiloAtlasFrame(atlas: HTMLImageElement, definition: MiloAtlasDefinition, frame: number, scale: number, groundedShadow: boolean, breathe = false): void {
    const sourceX = frame % definition.columns * definition.cellWidth;
    const sourceY = Math.floor(frame / definition.columns) * definition.cellHeight;
    const frameScale=definition.frameScales?.[frame]??1;
    const feetY=definition.frameFeetY?.[frame]??definition.feetY;
    const drawScale = definition.nativeGameplayScale * frameScale * scale;
    const drawW = definition.cellWidth * drawScale;
    const drawH = definition.cellHeight * drawScale;
    const breathing = breathe ? Math.sin(this.player.animationTime * 2.15) * .65 * scale : 0;
    this.ctx.save();
    if (groundedShadow) {
      this.ctx.fillStyle = 'rgba(0,0,0,.32)';
      this.ctx.beginPath(); this.ctx.ellipse(centerX(this.player), this.player.y + this.player.h + 2, (frame === 2 || frame === 3 ? 34 : 28) * scale, 6 * scale, 0, 0, Math.PI * 2); this.ctx.fill();
    }
    this.ctx.translate(centerX(this.player), this.player.y + this.player.h + breathing);
    this.ctx.scale(this.player.facing * (definition.frameFacing?.[frame] ?? 1), 1);
    this.ctx.drawImage(atlas, sourceX, sourceY, definition.cellWidth, definition.cellHeight, -drawW / 2, -feetY * drawScale, drawW, drawH);
    this.ctx.restore();
  }

  private castingHandWorld(): { x: number; y: number } {
    const hubScale = this.screen === 'hub' || (this.screen === 'dialogue' && this.dialogueReturnScreen === 'hub') ? 1.18 : 1;
    if (this.player.firePoseTime > 0 && this.miloCastAtlas.complete && this.miloCastAtlas.naturalWidth > 0) {
      const frame = this.selectMiloCastFrame();
      const socket = MILO_ATLASES.cast.sockets?.[frame];
      if (socket) {
        const frameScale=MILO_ATLASES.cast.frameScales?.[frame]??1;
        const feetY=MILO_ATLASES.cast.frameFeetY?.[frame]??MILO_ATLASES.cast.feetY;
        const drawScale = MILO_ATLASES.cast.nativeGameplayScale * frameScale * hubScale;
        return {
          x: centerX(this.player) + this.player.facing * (socket.x - MILO_ATLASES.cast.cellWidth / 2) * drawScale,
          y: this.player.y + this.player.h + (socket.y - feetY) * drawScale,
        };
      }
    }
    const side = this.player.facing * 27 * hubScale;
    return {
      x: centerX(this.player) + side + this.player.lastAimX * 24 * hubScale,
      y: this.player.y + this.player.h - 57 * hubScale + this.player.lastAimY * 31 * hubScale,
    };
  }

  private drawHandArcane(point: { x: number; y: number }): void {
    const p = this.player; const color = this.getArcaneColor(); const accent = this.getArcaneAccentColor();
    const x = point.x; const y = point.y; const size = 9 + Math.sin(this.time * 35) * 1.6;
    const activeColors = BOON_ORDER.filter((id) => this.boonStacks[id] > 0).map((id) => BOONS[id].color);
    this.ctx.save(); this.ctx.globalCompositeOperation = 'screen'; this.ctx.shadowColor = accent; this.ctx.shadowBlur = 25;
    const glow = this.ctx.createRadialGradient(x, y, 1, x, y, 21); glow.addColorStop(0, '#fff'); glow.addColorStop(.22, accent); glow.addColorStop(.58, `${color}cc`); glow.addColorStop(1, `${color}00`);
    this.ctx.fillStyle = glow; this.ctx.beginPath(); this.ctx.arc(x, y, 21, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.translate(x, y); this.ctx.rotate(Math.atan2(p.lastAimY, p.lastAimX));
    for (let tongue = 0; tongue < 3; tongue += 1) {
      const phase = this.time * (18 + tongue * 3) + tongue * 2.2;
      const tongueColor = activeColors.length > 0 ? activeColors[tongue % activeColors.length] : color;
      const lift = Math.sin(phase) * (2.2 + tongue);
      this.ctx.globalAlpha = .72 + tongue * .1;
      this.ctx.fillStyle = tongue === 2 ? accent : tongueColor;
      this.ctx.beginPath(); this.ctx.moveTo(size * (1.5 - tongue * .08), lift * .18);
      this.ctx.quadraticCurveTo(size * .1, -size * (1 + tongue * .15) + lift, -size * (1.1 + tongue * .4), -size * (.22 + tongue * .08));
      this.ctx.quadraticCurveTo(-size * (1.75 + tongue * .34), lift, -size * (1.04 + tongue * .25), size * (.35 + tongue * .08));
      this.ctx.quadraticCurveTo(size * .12, size * (.92 + tongue * .1) + lift, size * (1.5 - tongue * .08), lift * .18); this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
    this.ctx.fillStyle = '#fff'; this.ctx.beginPath(); this.ctx.ellipse(size * .35, 0, size * .42, size * .24, 0, 0, Math.PI * 2); this.ctx.fill(); this.ctx.restore();
    if (!this.reducedVfx) {
      this.ctx.save(); this.ctx.translate(x, y); this.ctx.globalCompositeOperation = 'screen';
      const orbitCount = Math.min(5, Math.max(2, activeColors.length));
      for (let i = 0; i < orbitCount; i += 1) {
        const orbit = this.time * (3.2 + i * .12) + i * Math.PI * 2 / orbitCount; const radius = 17 + (i % 2) * 5;
        const ox = Math.cos(orbit) * radius; const oy = Math.sin(orbit) * radius * .58;
        this.ctx.fillStyle = activeColors.length ? activeColors[i % activeColors.length] : accent;
        this.ctx.shadowColor = this.ctx.fillStyle; this.ctx.shadowBlur = 10; this.ctx.fillRect(ox - 2, oy - 2, 4, 4);
      }
      this.ctx.restore();
    }
  }

  private drawDashWake(): void {
    const p = this.player;
    const strength = clamp(p.dashTime / .18 + p.dashRecoveryTime / .12 * .45, 0, 1);
    const angle = Math.atan2(p.dashY || 0, p.dashX || p.facing);
    const color = this.getArcaneColor();
    const accent = this.getArcaneAccentColor();
    this.ctx.save();
    this.ctx.translate(centerX(p), centerY(p));
    this.ctx.rotate(angle);
    this.ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 5; i += 1) {
      const length = 52 + i * 27;
      const width = 19 - i * 2.6;
      this.ctx.globalAlpha = strength * (.34 - i * .045);
      const trail = this.ctx.createLinearGradient(-length, 0, 9, 0);
      trail.addColorStop(0, `${i % 2 ? accent : color}00`);
      trail.addColorStop(.62, i % 2 ? accent : color);
      trail.addColorStop(1, '#ffffff');
      this.ctx.fillStyle = trail;
      this.ctx.beginPath();
      this.ctx.moveTo(11, 0);
      this.ctx.bezierCurveTo(-18, -width, -length * .55, -width * .6, -length, Math.sin(this.time * 18 + i) * 6);
      this.ctx.bezierCurveTo(-length * .56, width * .64, -18, width, 11, 0);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = strength * .8;
    this.ctx.strokeStyle = '#efe4ff'; this.ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      const x = -36 - i * 31;
      const y = Math.sin(this.time * 21 + i * 2) * 19;
      this.ctx.save(); this.ctx.translate(x, y); this.ctx.rotate(this.time * 3 + i);
      this.ctx.strokeRect(-3, -3, 6, 6); this.ctx.restore();
    }
    this.ctx.restore();
  }

  private drawStoneBarrier(): void {
    if (this.stoneBarrierTime <= 0 || this.stoneBarrierHits <= 0) return;
    const pulse = .8 + Math.sin(this.time * 5) * .12;
    this.ctx.save();
    this.ctx.translate(this.stoneBarrierX, this.stoneBarrierY);
    this.ctx.scale(this.stoneBarrierFacing, 1);
    this.ctx.shadowColor = BOONS.gaia.color;
    this.ctx.shadowBlur = 18 * pulse;
    const blocks = [
      {x:-25,y:-35,w:49,h:34,r:-.05}, {x:-31,y:-70,w:58,h:36,r:.04}, {x:-23,y:-104,w:48,h:36,r:-.07},
      {x:-10,y:-130,w:33,h:29,r:.11}, {x:-39,y:-23,w:29,h:25,r:-.16},
    ];
    for (let i = 0; i < blocks.length; i += 1) {
      const block = blocks[i];
      this.ctx.save(); this.ctx.translate(block.x + block.w / 2, block.y + block.h / 2); this.ctx.rotate(block.r);
      const stone = this.ctx.createLinearGradient(0, -block.h / 2, 0, block.h / 2);
      stone.addColorStop(0, i % 2 ? '#e3bd79' : '#c28a52'); stone.addColorStop(1, '#4a342d');
      this.ctx.fillStyle = stone; this.roundRect(-block.w / 2, -block.h / 2, block.w, block.h, 6); this.ctx.fill();
      this.ctx.strokeStyle = '#f1d095'; this.ctx.lineWidth = 2; this.ctx.stroke();
      this.ctx.restore();
    }
    this.ctx.shadowBlur = 0; this.ctx.fillStyle = '#fff3c6'; this.ctx.font = '900 12px Barlow Condensed'; this.ctx.textAlign = 'center';
    this.ctx.fillText(`${this.stoneBarrierHits}`, 0, -73); this.ctx.restore();
  }

  private drawHeavyArcaneEffect(): void {
    const p = this.player; const progress = clamp(1 - p.punchTime / .62, 0, 1); const color = this.getArcaneColor();
    this.ctx.save(); this.ctx.shadowColor = '#a65cff'; this.ctx.shadowBlur = 24;
    if (progress < .55) {
      const charge = 8 + progress * 35; const x = centerX(p) - p.facing * 17; const y = p.y + 34;
      const glow = this.ctx.createRadialGradient(x, y, 2, x, y, charge); glow.addColorStop(0, '#fff'); glow.addColorStop(.25, '#d4a6ff'); glow.addColorStop(1, `${color}00`);
      this.ctx.fillStyle = glow; this.ctx.beginPath(); this.ctx.arc(x, y, charge, 0, Math.PI * 2); this.ctx.fill();
    } else {
      const x = centerX(p) + p.facing * 55; const length = 105 + Math.sin(progress * Math.PI) * 55;
      this.ctx.translate(x, p.y + 35); this.ctx.scale(p.facing, 1); this.ctx.fillStyle = `${color}dd`;
      this.ctx.beginPath(); this.ctx.moveTo(-15, -24); this.ctx.quadraticCurveTo(length * .55, -48, length, 0); this.ctx.quadraticCurveTo(length * .55, 48, -15, 25); this.ctx.closePath(); this.ctx.fill();
      this.ctx.strokeStyle = '#f2d8ff'; this.ctx.lineWidth = 5; this.ctx.beginPath(); this.ctx.moveTo(2, 0); this.ctx.lineTo(length * .78, 0); this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private drawPounceEffect(): void {
    const p = this.player; const progress = clamp(1 - p.kickTime / .5, 0, 1);
    this.ctx.save(); this.ctx.translate(centerX(p), centerY(p)); this.ctx.scale(p.facing, 1); this.ctx.rotate(progress * Math.PI * 1.65);
    this.ctx.strokeStyle = '#57d6c7cc'; this.ctx.shadowColor = '#57d6c7'; this.ctx.shadowBlur = 17; this.ctx.lineWidth = 7;
    this.ctx.beginPath(); this.ctx.arc(0, 0, 52, -.8, 1.75); this.ctx.stroke(); this.ctx.strokeStyle = '#e7fffa'; this.ctx.lineWidth = 2; this.ctx.beginPath(); this.ctx.arc(0, 0, 60, -.55, 1.35); this.ctx.stroke(); this.ctx.restore();
  }

  private drawInvulnerabilityTwinkles(): void {
    const p = this.player;
    this.ctx.save(); this.ctx.fillStyle = '#f4ffff'; this.ctx.shadowColor = '#71efff'; this.ctx.shadowBlur = 9;
    for (let i = 0; i < 3; i += 1) {
      const angle = this.time * 4.5 + i * Math.PI * 2 / 3;
      const x = centerX(p) + Math.cos(angle) * 35; const y = centerY(p) + Math.sin(angle * 1.3) * 42;
      const size = 2.5 + Math.sin(this.time * 12 + i) * 1.5;
      this.ctx.beginPath(); this.ctx.moveTo(x, y - size * 2); this.ctx.lineTo(x + size, y); this.ctx.lineTo(x, y + size * 2); this.ctx.lineTo(x - size, y); this.ctx.closePath(); this.ctx.fill();
    }
    this.ctx.restore();
  }

  private drawGuardianHalo(): void {
    const p = this.player;
    const presentationScale = this.screen === 'hub' || (this.screen === 'dialogue' && this.dialogueReturnScreen === 'hub') ? 1.18 : 1;
    const waistY = p.y + p.h - 70 * presentationScale;
    this.ctx.save(); this.ctx.strokeStyle = '#ffe36b'; this.ctx.lineWidth = 3; this.ctx.shadowColor = '#ffe36b'; this.ctx.shadowBlur = 12;
    this.ctx.globalAlpha=.22;
    this.ctx.beginPath();this.ctx.ellipse(centerX(p),waistY,76*presentationScale,12*presentationScale,0,0,Math.PI*2);this.ctx.stroke();
    for (let i = 0; i < p.shieldCharges; i += 1) {
      const angle = this.time * 1.8 + i * Math.PI * 2 / p.shieldCharges;
      const depth=.5+.5*Math.sin(angle);
      this.ctx.globalAlpha=.45+depth*.5;
      this.ctx.beginPath(); this.ctx.ellipse(centerX(p) + Math.cos(angle) * 72*presentationScale, waistY + Math.sin(angle) * 10*presentationScale, 14*presentationScale, 4*presentationScale, 0, 0, Math.PI * 2); this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private drawPersistentAbilityEffects(): void {
    const p=this.player;
    if(this.lunaTurretTimer>0){
      const x=centerX(p)-p.facing*54;const y=p.y+22;const pulse=.5+.5*Math.sin(this.time*8);
      this.ctx.save();this.ctx.translate(x,y);this.ctx.globalCompositeOperation='screen';this.ctx.shadowColor=BOONS.luna.color;this.ctx.shadowBlur=18+pulse*10;
      const glow=this.ctx.createRadialGradient(0,0,1,0,0,22);glow.addColorStop(0,'#fff');glow.addColorStop(.25,BOONS.luna.accentColor);glow.addColorStop(.65,`${BOONS.luna.color}aa`);glow.addColorStop(1,`${BOONS.luna.color}00`);
      this.ctx.fillStyle=glow;this.ctx.beginPath();this.ctx.arc(0,0,22,0,Math.PI*2);this.ctx.fill();
      this.ctx.strokeStyle='#fff';this.ctx.lineWidth=2.5;this.ctx.beginPath();this.ctx.arc(-2,0,8,-Math.PI*.62,Math.PI*.62);this.ctx.stroke();
      this.ctx.strokeStyle=BOONS.luna.accentColor;this.ctx.lineWidth=2;this.ctx.beginPath();this.ctx.arc(0,0,25,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(this.lunaTurretTimer/7,0,1));this.ctx.stroke();this.ctx.restore();
    }
    if(this.mirrorShieldTimer>0){
      const alpha=clamp(this.mirrorShieldTimer/.32,0,1);const pulse=2+Math.sin(this.time*9)*2;
      this.ctx.save();this.ctx.translate(centerX(p),centerY(p));this.ctx.globalAlpha=.48*alpha;this.ctx.strokeStyle=BOONS.vespera.accentColor;this.ctx.fillStyle=`${BOONS.vespera.color}22`;this.ctx.shadowColor=BOONS.vespera.color;this.ctx.shadowBlur=22;
      this.ctx.lineWidth=3;this.ctx.beginPath();this.ctx.ellipse(0,0,48+pulse,61+pulse,0,0,Math.PI*2);this.ctx.fill();this.ctx.stroke();
      this.ctx.globalAlpha=.7*alpha;this.ctx.lineWidth=1.5;for(let i=0;i<6;i+=1){const a=i/6*Math.PI*2+this.time*.35;this.ctx.beginPath();this.ctx.moveTo(Math.cos(a)*18,Math.sin(a)*23);this.ctx.lineTo(Math.cos(a)*47,Math.sin(a)*60);this.ctx.stroke();}
      this.ctx.restore();
    }
    if(this.bloodPactRoomBonus>0){
      this.ctx.save();this.ctx.translate(centerX(p),p.y+p.h);this.ctx.strokeStyle=`${BOONS.lilith.color}bb`;this.ctx.shadowColor=BOONS.lilith.color;this.ctx.shadowBlur=15;this.ctx.lineWidth=3;
      for(let i=0;i<3;i+=1){const x=(i-1)*18+Math.sin(this.time*4+i)*7;const top=-54-Math.sin(this.time*5+i)*12;this.ctx.beginPath();this.ctx.moveTo(x,0);this.ctx.bezierCurveTo(x-14,-18,x+15,-34,x,top);this.ctx.stroke();}
      this.ctx.restore();
    }
  }

  private drawEnemyStatusEffects(enemy: Enemy): void {
    if(enemy.rootTime<=0&&enemy.slowTime<=0&&enemy.charmTime<=0&&enemy.blindTime<=0)return;
    const cx=centerX(enemy);const cy=centerY(enemy);
    this.ctx.save();
    if(enemy.slowTime>0){
      this.ctx.globalAlpha=.3+.12*Math.sin(this.time*8+enemy.id);this.ctx.fillStyle='#f5fbff';this.ctx.shadowColor='#cceeff';this.ctx.shadowBlur=16;
      this.ctx.beginPath();this.ctx.ellipse(cx,cy,enemy.w*.7+10,enemy.h*.56+8,0,0,Math.PI*2);this.ctx.fill();
      this.ctx.globalAlpha=.9;this.ctx.strokeStyle='#eaf8ff';this.ctx.lineWidth=2;for(let i=0;i<3;i+=1){const a=this.time*.5+i*Math.PI*2/3;const x=cx+Math.cos(a)*(enemy.w*.55+10),y=cy+Math.sin(a)*(enemy.h*.45+8);this.ctx.beginPath();this.ctx.moveTo(x-5,y);this.ctx.lineTo(x+5,y);this.ctx.moveTo(x,y-5);this.ctx.lineTo(x,y+5);this.ctx.stroke();}
    }
    if(enemy.rootTime>0){
      this.ctx.globalAlpha=.9;this.ctx.strokeStyle=BOONS.flora.color;this.ctx.shadowColor=BOONS.flora.color;this.ctx.shadowBlur=9;this.ctx.lineWidth=5;
      for(let i=0;i<4;i+=1){const x=enemy.x+enemy.w*(.15+i*.23);this.ctx.beginPath();this.ctx.moveTo(x,enemy.y+enemy.h+4);this.ctx.bezierCurveTo(x-18,enemy.y+enemy.h*.7,x+18,enemy.y+enemy.h*.45,x+(i%2?12:-12),enemy.y+enemy.h*.2);this.ctx.stroke();}
      this.ctx.fillStyle=BOONS.flora.accentColor;for(let i=0;i<5;i+=1){this.ctx.beginPath();this.ctx.ellipse(cx-35+i*17,enemy.y+enemy.h-12-(i%2)*22,7,3,i*.5,0,Math.PI*2);this.ctx.fill();}
    }
    if(enemy.charmTime>0){
      this.ctx.globalAlpha=.9;this.ctx.fillStyle=BOONS.nerissa.accentColor;this.ctx.shadowColor=BOONS.nerissa.color;this.ctx.shadowBlur=10;this.ctx.font='900 20px Barlow Condensed';this.ctx.textAlign='center';
      for(let i=0;i<3;i+=1){const a=this.time*2+i*Math.PI*2/3;this.ctx.fillText(i===1?'♥':'♫',cx+Math.cos(a)*(enemy.w*.6+14),enemy.y-12+Math.sin(a)*9);}
    }
    if(enemy.blindTime>0){
      this.ctx.globalAlpha=.95;this.ctx.strokeStyle=BOONS.aurelia.accentColor;this.ctx.shadowColor=BOONS.aurelia.color;this.ctx.shadowBlur=12;this.ctx.lineWidth=4;
      const y=enemy.y+Math.min(32,enemy.h*.24);this.ctx.beginPath();this.ctx.ellipse(cx,y,22,9,0,0,Math.PI*2);this.ctx.stroke();this.ctx.beginPath();this.ctx.moveTo(cx-28,y-17);this.ctx.lineTo(cx+28,y+17);this.ctx.moveTo(cx+28,y-17);this.ctx.lineTo(cx-28,y+17);this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private drawEnemy(enemy: Enemy): void {
    if (enemy.eliteModifier) this.drawEliteAura(enemy);
    if (enemy.deepDivePowers?.length) this.drawDeepDivePowerAura(enemy);
    this.ctx.save();
    if (enemy.eliteModifier) {
      const colors = {frenzied:'#ff365d',armored:'#45dfff',volatile:'#ff8a32'} as const;
      const color=colors[enemy.eliteModifier];
      this.ctx.filter=`saturate(1.28) contrast(1.08) drop-shadow(0 0 7px ${color}) drop-shadow(0 0 15px ${color})`;
    }
    this.drawEnemyBody(enemy);
    this.ctx.restore();
    if(enemy.hitStun>0&&!enemy.dead)this.drawEnemyHitConfirmation(enemy);
    if(!enemy.dead)this.drawEnemyStatusEffects(enemy);
    if (enemy.eliteModifier && !enemy.dead) this.drawEliteIdentifier(enemy);
    if (enemy.deepDivePowers?.length && !enemy.dead) this.drawDeepDivePowerIdentifier(enemy);
  }

  private drawEnemyHitConfirmation(enemy:Enemy):void {
    const strength=clamp(enemy.hitStun/.16,.18,1);
    this.ctx.save();this.ctx.globalCompositeOperation='screen';this.ctx.globalAlpha=.22+strength*.42;
    this.ctx.strokeStyle='#ffffff';this.ctx.shadowColor='#ffffff';this.ctx.shadowBlur=8+strength*14;this.ctx.lineWidth=1.5+strength*2.5;
    this.ctx.beginPath();this.ctx.ellipse(centerX(enemy),centerY(enemy),enemy.w*.58+strength*5,enemy.h*.56+strength*5,0,0,Math.PI*2);this.ctx.stroke();
    this.ctx.restore();
  }

  private drawEnemyBody(enemy: Enemy): void {
    if (this.drawLateEncounterSprite(enemy)) {
      this.drawEnemyTelegraph(enemy); return;
    }
    if (enemy.type === 'fanChampion' && this.fanChampionAtlas.complete && this.fanChampionAtlas.naturalWidth > 0) {
      const frame=enemy.attackPoseTime>0?1:0;this.drawLevelOneBossSprite(enemy,this.fanChampionAtlas,2,frame,310,[853,823][frame]);
      this.drawEnemyTelegraph(enemy); return;
    }
    if (enemy.type === 'nerissa' && this.nerissaBossAtlas.complete && this.nerissaBossAtlas.naturalWidth > 0) {
      const frame=enemy.health/enemy.maxHealth<.55?2:enemy.attackPoseTime>0?1:0;
      this.drawLevelOneBossSprite(enemy,this.nerissaBossAtlas,3,frame,345,[654,660,681][frame]);
      this.drawEnemyTelegraph(enemy); return;
    }
    if (enemy.type === 'perfectPrey' && this.perfectPreyAtlas.complete && this.perfectPreyAtlas.naturalWidth > 0) {
      const frame=enemy.phase===1?0:enemy.attackPoseTime>0?1:2;
      this.drawLevelOneBossSprite(enemy,this.perfectPreyAtlas,3,frame,340,755);
      this.drawEnemyTelegraph(enemy); return;
    }
    if (enemy.type === 'roxyne' && this.roxyneBossAtlas.complete && this.roxyneBossAtlas.naturalWidth > 0) {
      const frame=Math.max(0,Math.min(2,enemy.phase));
      this.drawLevelOneBossSprite(enemy,this.roxyneBossAtlas,3,frame,400,[879,800,897][frame]);
      this.drawEnemyTelegraph(enemy); return;
    }
    if (enemy.type === 'brute' && this.bottomlessBartenderAtlas.complete && this.bottomlessBartenderAtlas.naturalWidth > 0) {
      this.drawLevelOneBossSprite(enemy, this.bottomlessBartenderAtlas, 2, enemy.attackPoseTime > 0 ? 1 : 0, 248, this.bottomlessBartenderAtlas.naturalHeight * .965);
      this.drawEnemyTelegraph(enemy);
      return;
    }
    if (enemy.type === 'warden' && this.belladonnaBossAtlas.complete && this.belladonnaBossAtlas.naturalWidth > 0) {
      const ravenous = enemy.health / Math.max(1, enemy.maxHealth) < .38;
      const frame=ravenous?2:enemy.attackPoseTime>0?1:0;
      this.drawLevelOneBossSprite(enemy,this.belladonnaBossAtlas,3,frame,333,[759,747,759][frame]);
      this.drawEnemyTelegraph(enemy);
      return;
    }
    if (['drownedFan','chorusWisp','courtCantor','reefHound','bubbleCrab','spotlightDancer'].includes(enemy.type) && this.levelTwoEnemyAtlas.complete && this.levelTwoEnemyAtlas.naturalWidth > 0) {
      this.drawLevelTwoEnemySprite(enemy);
      if (enemy.health < enemy.maxHealth) this.drawSmallHealth(enemy);
      this.drawEnemyTelegraph(enemy); return;
    }
    if (['thornStalker','sporeMaw','vineLurker','razorBoar','rootMaw','thornArcher'].includes(enemy.type) && this.levelThreeEnemyAtlas.complete && this.levelThreeEnemyAtlas.naturalWidth > 0) {
      this.drawLevelThreeEnemySprite(enemy);
      if (enemy.health < enemy.maxHealth) this.drawSmallHealth(enemy);
      this.drawEnemyTelegraph(enemy); return;
    }
    if (['imp','floater','succubus','hellhound','crawler','siren'].includes(enemy.type) && this.levelOneEnemyAtlas.complete && this.levelOneEnemyAtlas.naturalWidth > 0) {
      this.drawLevelOneEnemySprite(enemy);
      if (enemy.health < enemy.maxHealth) this.drawSmallHealth(enemy);
      this.drawEnemyTelegraph(enemy);
      return;
    }
    if (this.drawLateCommonEnemySprite(enemy)) {
      if (enemy.health < enemy.maxHealth) this.drawSmallHealth(enemy);
      this.drawEnemyTelegraph(enemy); return;
    }
    this.ctx.save();
    this.ctx.translate(centerX(enemy), enemy.y + enemy.h);
    this.ctx.scale(enemy.facing, 1);
    if (enemy.invulnerable > 0) this.ctx.globalAlpha = .55;
    const bob = enemy.type === 'floater' || enemy.type === 'choirShard' || enemy.type === 'preservationWisp' || enemy.type === 'keyholeWisp' || enemy.type === 'prismWisp' || enemy.type === 'decreeWisp' || enemy.type === 'hollowShade' ? Math.sin(enemy.timer * 4) * 5 : 0;
    this.ctx.translate(0, bob);
    const attack = enemy.attackPoseTime > 0 ? 1 : 0;
    const pulse = Math.sin(enemy.timer * 5);

    if (enemy.type === 'dummy') {
      this.ctx.fillStyle = '#241c2e'; this.ctx.fillRect(-8, -82, 16, 82);
      this.ctx.fillStyle = '#75637f'; this.roundRect(-28, -112, 56, 44, 13); this.ctx.fill();
      this.ctx.strokeStyle = '#57d6c7'; this.ctx.shadowColor = '#57d6c7'; this.ctx.shadowBlur = 12; this.ctx.lineWidth = 4;
      this.ctx.beginPath(); this.ctx.arc(0, -90, 17, 0, Math.PI * 2); this.ctx.stroke();
      this.ctx.fillStyle = '#f4ffff'; this.ctx.beginPath(); this.ctx.arc(0, -90, 4, 0, Math.PI * 2); this.ctx.fill();
    } else if (enemy.type === 'chantPillar') {
      const pulse=.5+.5*Math.sin(this.time*5+enemy.id);this.ctx.shadowColor='#54eef4';this.ctx.shadowBlur=18+pulse*9;this.ctx.fillStyle='#102f3b';this.ctx.beginPath();this.ctx.moveTo(-27,0);this.ctx.lineTo(-20,-118);this.ctx.lineTo(0,-150);this.ctx.lineTo(20,-118);this.ctx.lineTo(27,0);this.ctx.closePath();this.ctx.fill();this.ctx.strokeStyle='#6df7ff';this.ctx.lineWidth=3;this.ctx.stroke();this.ctx.fillStyle='#d9ffff';this.ctx.font='900 32px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText('♫',0,-75);for(let i=0;i<3;i+=1){this.ctx.globalAlpha=.35+pulse*.35;this.ctx.beginPath();this.ctx.arc(0,-75,28+i*12+Math.sin(this.time*3+i)*3,0,Math.PI*2);this.ctx.stroke();}
    } else if (enemy.type === 'jackpotGremlin') {
      this.ctx.strokeStyle='#21122d';this.ctx.lineWidth=9;this.ctx.lineCap='round';this.ctx.beginPath();this.ctx.moveTo(-12,-28);this.ctx.lineTo(-18,-2);this.ctx.moveTo(12,-28);this.ctx.lineTo(18,-2);this.ctx.stroke();this.ctx.fillStyle='#71328e';this.roundRect(-25,-62,50,42,13);this.ctx.fill();this.ctx.fillStyle='#bd5bc6';this.ctx.beginPath();this.ctx.arc(0,-70,20,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#3a174f';this.ctx.beginPath();this.ctx.moveTo(-15,-82);this.ctx.lineTo(-24,-102);this.ctx.lineTo(-5,-85);this.ctx.moveTo(15,-82);this.ctx.lineTo(24,-102);this.ctx.lineTo(5,-85);this.ctx.fill();this.ctx.fillStyle='#fff16a';this.ctx.fillRect(5,-73,9,5);this.ctx.strokeStyle='#ffe05a';this.ctx.lineWidth=4;this.ctx.beginPath();this.ctx.arc(attack?34:27,-42,10,0,Math.PI*2);this.ctx.stroke();
    } else if (enemy.type === 'cardDealer') {
      this.ctx.strokeStyle='#201328';this.ctx.lineWidth=10;this.ctx.beginPath();this.ctx.moveTo(-10,-34);this.ctx.lineTo(-15,-2);this.ctx.moveTo(10,-34);this.ctx.lineTo(15,-2);this.ctx.stroke();this.ctx.fillStyle='#4a1d66';this.ctx.beginPath();this.ctx.moveTo(-30,-91);this.ctx.lineTo(30,-91);this.ctx.lineTo(24,-30);this.ctx.lineTo(-24,-30);this.ctx.closePath();this.ctx.fill();this.ctx.fillStyle='#b5638f';this.ctx.beginPath();this.ctx.arc(0,-103,17,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#29152f';this.ctx.beginPath();this.ctx.moveTo(-13,-114);this.ctx.lineTo(-23,-134);this.ctx.lineTo(-3,-117);this.ctx.moveTo(13,-114);this.ctx.lineTo(23,-134);this.ctx.lineTo(3,-117);this.ctx.fill();this.ctx.strokeStyle='#ff73dc';this.ctx.lineWidth=4;for(let card=0;card<5;card+=1){const angle=(card-2)*.22;this.ctx.save();this.ctx.translate((attack?48:35)+card*5,-68+Math.abs(card-2)*5);this.ctx.rotate(angle);this.ctx.strokeRect(-8,-12,16,24);this.ctx.restore();}
    } else if (enemy.type === 'diceHound') {
      const crouch=attack?8:0;this.ctx.strokeStyle='#22152d';this.ctx.lineWidth=11;this.ctx.lineCap='round';this.ctx.beginPath();this.ctx.moveTo(-34,-30+crouch);this.ctx.lineTo(-40,-2);this.ctx.moveTo(30,-30+crouch);this.ctx.lineTo(38,-2);this.ctx.stroke();this.ctx.fillStyle='#54286e';this.roundRect(-48,-67+crouch,84,44,18);this.ctx.fill();this.ctx.fillStyle='#a1469e';this.ctx.beginPath();this.ctx.ellipse(43+attack*12,-53+crouch,31,25,0,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#150b1b';this.ctx.beginPath();this.ctx.moveTo(24,-50+crouch);this.ctx.lineTo(68+attack*14,-43+crouch);this.ctx.lineTo(30,-31+crouch);this.ctx.closePath();this.ctx.fill();this.ctx.fillStyle='#fff06a';this.ctx.fillRect(45+attack*8,-61+crouch,8,5);for(let pip=0;pip<4;pip+=1){this.ctx.fillStyle='#ff75df';this.ctx.beginPath();this.ctx.arc(-25+pip*17,-48+crouch,4,0,Math.PI*2);this.ctx.fill();}
    } else if (enemy.type === 'railWisp') {
      this.ctx.globalAlpha*=.92;this.ctx.shadowColor='#5deaff';this.ctx.shadowBlur=24;this.ctx.fillStyle='#2a1b53';this.ctx.beginPath();this.ctx.arc(0,-45,39,0,Math.PI*2);this.ctx.fill();this.ctx.strokeStyle='#ffe05a';this.ctx.lineWidth=5;this.ctx.beginPath();this.ctx.arc(0,-45,31,0,Math.PI*2);this.ctx.stroke();this.ctx.fillStyle='#f9f8ff';this.ctx.beginPath();this.ctx.ellipse(attack?9:0,-48,15,10,0,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#e85fd3';this.ctx.beginPath();this.ctx.arc(attack?14:5,-48,5,0,Math.PI*2);this.ctx.fill();this.ctx.strokeStyle='#5deaff';this.ctx.lineWidth=3;for(let wire=0;wire<4;wire+=1){this.ctx.beginPath();this.ctx.moveTo(-25+wire*16,-13);this.ctx.quadraticCurveTo(-30+wire*18,8+Math.sin(this.time*5+wire)*8,-18+wire*13,18);this.ctx.stroke();}
    } else if (enemy.type === 'slotMimic') {
      this.ctx.fillStyle='#351543';this.roundRect(-66,-112,132,108,14);this.ctx.fill();this.ctx.strokeStyle='#ffe05a';this.ctx.lineWidth=4;this.ctx.strokeRect(-54,-101,108,51);this.ctx.fillStyle='#f15ed8';this.ctx.font='900 27px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText(attack?'XXX':'777',0,-67);this.ctx.fillStyle='#110914';this.ctx.beginPath();this.ctx.moveTo(-55,-43);this.ctx.quadraticCurveTo(0,attack?8:-17,55,-43);this.ctx.lineTo(48,-8);this.ctx.lineTo(-48,-8);this.ctx.closePath();this.ctx.fill();this.ctx.fillStyle='#fff2c0';for(let tooth=0;tooth<7;tooth+=1){const x=-43+tooth*14;this.ctx.beginPath();this.ctx.moveTo(x,-40);this.ctx.lineTo(x+7,-25+attack*9);this.ctx.lineTo(x+14,-40);this.ctx.fill();}this.ctx.strokeStyle='#5deaff';this.ctx.lineWidth=7;for(const x of [-48,48]){this.ctx.beginPath();this.ctx.moveTo(x,-5);this.ctx.lineTo(x+(x<0?-9:9),10);this.ctx.stroke();}
    } else if (enemy.type === 'jinxCroupier') {
      this.ctx.fillStyle='#32134e';this.ctx.beginPath();this.ctx.moveTo(-34,-103);this.ctx.lineTo(34,-103);this.ctx.lineTo(43,0);this.ctx.lineTo(-43,0);this.ctx.closePath();this.ctx.fill();this.ctx.fillStyle='#a95a83';this.ctx.beginPath();this.ctx.arc(0,-119,20,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#170a22';this.ctx.beginPath();this.ctx.moveTo(-16,-131);this.ctx.lineTo(-32,-157);this.ctx.lineTo(-4,-135);this.ctx.moveTo(16,-131);this.ctx.lineTo(32,-157);this.ctx.lineTo(4,-135);this.ctx.fill();this.ctx.strokeStyle='#bd70ff';this.ctx.lineWidth=5;this.ctx.beginPath();this.ctx.moveTo(-24,-91);this.ctx.lineTo(-48-attack*12,-55);this.ctx.moveTo(24,-91);this.ctx.lineTo(48+attack*12,-55);this.ctx.stroke();this.ctx.fillStyle='#b76dff';for(const side of [-1,1]){this.ctx.shadowColor='#bd70ff';this.ctx.shadowBlur=15;this.ctx.beginPath();this.ctx.arc(side*(attack?62:49),-52,12,0,Math.PI*2);this.ctx.fill();}
    } else if (enemy.type === 'ladyLuckless') {
      this.ctx.shadowColor=enemy.phase===2?'#ff64df':'#ffe05a';this.ctx.shadowBlur=20;this.ctx.fillStyle='#2d103e';this.ctx.beginPath();this.ctx.moveTo(-54,-139);this.ctx.lineTo(54,-139);this.ctx.lineTo(66,0);this.ctx.lineTo(-66,0);this.ctx.closePath();this.ctx.fill();this.ctx.fillStyle='#8f286e';this.roundRect(-44,-150,88,74,24);this.ctx.fill();this.ctx.fillStyle='#b86f83';this.ctx.beginPath();this.ctx.arc(0,-172,27,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#190a24';this.ctx.beginPath();this.ctx.moveTo(-22,-184);this.ctx.lineTo(-44,-222);this.ctx.lineTo(-7,-191);this.ctx.moveTo(22,-184);this.ctx.lineTo(44,-222);this.ctx.lineTo(7,-191);this.ctx.fill();this.ctx.fillStyle='#ffe86a';this.ctx.fillRect(7,-176,11,5);this.ctx.strokeStyle='#ff70de';this.ctx.lineWidth=8;this.ctx.beginPath();this.ctx.moveTo(-37,-132);this.ctx.lineTo(-75-attack*18,-82);this.ctx.moveTo(37,-132);this.ctx.lineTo(75+attack*18,-82);this.ctx.stroke();for(let card=0;card<7;card+=1){const a=-Math.PI*.78+card*Math.PI*.56/6;this.ctx.save();this.ctx.translate(Math.cos(a)*86,-86+Math.sin(a)*52);this.ctx.rotate(a+.7);this.ctx.fillStyle=card%2?'#ffe05a':'#f06ddd';this.ctx.fillRect(-8,-13,16,26);this.ctx.restore();}
    } else if (enemy.type === 'calyptraBoss') {
      const breathe=1+pulse*.018;this.ctx.scale(breathe,1);this.ctx.shadowColor='#ff63df';this.ctx.shadowBlur=28;this.ctx.strokeStyle='#ffe05a';this.ctx.lineWidth=5;this.ctx.beginPath();this.ctx.arc(0,-154,79,0,Math.PI*2);this.ctx.stroke();for(let mark=0;mark<12;mark+=1){const a=mark/12*Math.PI*2+this.time*.2;this.ctx.beginPath();this.ctx.moveTo(Math.cos(a)*69,-154+Math.sin(a)*69);this.ctx.lineTo(Math.cos(a)*84,-154+Math.sin(a)*84);this.ctx.stroke();}this.ctx.fillStyle='#280d37';this.ctx.beginPath();this.ctx.moveTo(-69,-149);this.ctx.lineTo(69,-149);this.ctx.lineTo(79,0);this.ctx.lineTo(-79,0);this.ctx.closePath();this.ctx.fill();this.ctx.fillStyle='#85205f';this.roundRect(-55,-174,110,91,29);this.ctx.fill();this.ctx.fillStyle='#ba6a7c';this.ctx.beginPath();this.ctx.arc(0,-205,31,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#16081e';this.ctx.beginPath();this.ctx.moveTo(-25,-219);this.ctx.lineTo(-64,-272);this.ctx.lineTo(-12,-230);this.ctx.moveTo(25,-219);this.ctx.lineTo(64,-272);this.ctx.lineTo(12,-230);this.ctx.fill();this.ctx.fillStyle='#fff16a';this.ctx.fillRect(9,-208,13,6);this.ctx.strokeStyle='#f368dc';this.ctx.lineWidth=11;this.ctx.lineCap='round';for(const side of [-1,1]){this.ctx.beginPath();this.ctx.moveTo(side*43,-148);this.ctx.lineTo(side*(attack?106:85),-105);this.ctx.moveTo(side*35,-126);this.ctx.lineTo(side*(attack?92:70),-62);this.ctx.stroke();}this.ctx.strokeStyle='#ffe05a';this.ctx.lineWidth=4;this.ctx.beginPath();this.ctx.moveTo(62,-42);this.ctx.bezierCurveTo(128,-15,115,-116,142,-139);this.ctx.stroke();this.ctx.fillStyle='#ff65db';this.ctx.beginPath();this.ctx.moveTo(142,-139);this.ctx.lineTo(127,-126);this.ctx.lineTo(149,-119);this.ctx.fill();
    } else if (enemy.type === 'icePenitent') {
      this.ctx.strokeStyle='#17263a';this.ctx.lineWidth=10;this.ctx.beginPath();this.ctx.moveTo(-9,-34);this.ctx.lineTo(-17,-2);this.ctx.moveTo(9,-34);this.ctx.lineTo(17,-2);this.ctx.stroke();this.ctx.fillStyle='#24516b';this.ctx.beginPath();this.ctx.moveTo(-29,-80);this.ctx.lineTo(29,-80);this.ctx.lineTo(23,-31);this.ctx.lineTo(-23,-31);this.ctx.closePath();this.ctx.fill();this.ctx.fillStyle='#789ab0';this.ctx.beginPath();this.ctx.arc(0,-94,18,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#102235';this.ctx.beginPath();this.ctx.moveTo(-14,-105);this.ctx.lineTo(-27,-129);this.ctx.lineTo(-4,-109);this.ctx.moveTo(14,-105);this.ctx.lineTo(27,-129);this.ctx.lineTo(4,-109);this.ctx.fill();this.ctx.fillStyle='#dffcff';this.ctx.fillRect(5,-97,9,5);this.ctx.strokeStyle='#8ee7ff';this.ctx.lineWidth=5;this.ctx.beginPath();this.ctx.moveTo(21,-67);this.ctx.lineTo(attack?58:39,-46);this.ctx.stroke();
    } else if (enemy.type === 'choirShard') {
      this.ctx.shadowColor='#bff8ff';this.ctx.shadowBlur=22;this.ctx.fillStyle='#173956';this.ctx.beginPath();this.ctx.arc(0,-42,31,0,Math.PI*2);this.ctx.fill();this.ctx.strokeStyle='#d9fcff';this.ctx.lineWidth=4;for(let shard=0;shard<8;shard+=1){const a=shard/8*Math.PI*2+this.time*.35;this.ctx.beginPath();this.ctx.moveTo(Math.cos(a)*25,-42+Math.sin(a)*25);this.ctx.lineTo(Math.cos(a)*45,-42+Math.sin(a)*45);this.ctx.stroke();}this.ctx.fillStyle='#f4ffff';this.ctx.font='900 23px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText(attack?'♫':'◇',0,-34);
    } else if (enemy.type === 'reliquaryKnight') {
      this.ctx.strokeStyle='#16283b';this.ctx.lineWidth=13;this.ctx.beginPath();this.ctx.moveTo(-17,-48);this.ctx.lineTo(-24,-2);this.ctx.moveTo(17,-48);this.ctx.lineTo(24,-2);this.ctx.stroke();this.ctx.fillStyle='#335d78';this.roundRect(-43,-118,86,78,16);this.ctx.fill();this.ctx.strokeStyle='#bcefff';this.ctx.lineWidth=4;this.ctx.strokeRect(-34,-108,68,55);this.ctx.fillStyle='#21394d';this.ctx.beginPath();this.ctx.moveTo(-29,-118);this.ctx.lineTo(0,-151);this.ctx.lineTo(29,-118);this.ctx.closePath();this.ctx.fill();this.ctx.fillStyle='#eaffff';this.ctx.fillRect(4,-128,16,5);this.ctx.strokeStyle='#8ee7ff';this.ctx.lineWidth=9;this.ctx.beginPath();this.ctx.moveTo(34,-92);this.ctx.lineTo(attack?81:60,-47);this.ctx.stroke();
    } else if (enemy.type === 'frostHound') {
      const crouch=attack?8:0;this.ctx.strokeStyle='#122538';this.ctx.lineWidth=11;this.ctx.lineCap='round';this.ctx.beginPath();this.ctx.moveTo(-37,-30+crouch);this.ctx.lineTo(-44,-2);this.ctx.moveTo(31,-30+crouch);this.ctx.lineTo(40,-2);this.ctx.stroke();this.ctx.fillStyle='#315e76';this.roundRect(-51,-67+crouch,88,45,18);this.ctx.fill();this.ctx.fillStyle='#7997aa';this.ctx.beginPath();this.ctx.ellipse(47+attack*13,-54+crouch,32,25,0,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#10243a';this.ctx.beginPath();this.ctx.moveTo(25,-51+crouch);this.ctx.lineTo(74+attack*13,-42+crouch);this.ctx.lineTo(30,-31+crouch);this.ctx.closePath();this.ctx.fill();this.ctx.fillStyle='#f2feff';for(let tooth=0;tooth<5;tooth+=1){const x=35+tooth*8+attack*6;this.ctx.beginPath();this.ctx.moveTo(x,-46+crouch);this.ctx.lineTo(x+4,-35+crouch);this.ctx.lineTo(x+8,-46+crouch);this.ctx.fill();}this.ctx.fillStyle='#73dcff';this.ctx.fillRect(48+attack*8,-63+crouch,8,5);
    } else if (enemy.type === 'glassDeacon') {
      this.ctx.fillStyle='#152f48';this.ctx.beginPath();this.ctx.moveTo(-35,-105);this.ctx.lineTo(35,-105);this.ctx.lineTo(45,0);this.ctx.lineTo(-45,0);this.ctx.closePath();this.ctx.fill();this.ctx.strokeStyle='#a8f0ff';this.ctx.lineWidth=4;this.ctx.beginPath();this.ctx.moveTo(-31,-93);this.ctx.lineTo(0,-47);this.ctx.lineTo(31,-93);this.ctx.stroke();this.ctx.fillStyle='#778fa3';this.ctx.beginPath();this.ctx.arc(0,-121,21,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#0c2034';this.ctx.beginPath();this.ctx.moveTo(-17,-132);this.ctx.lineTo(-34,-164);this.ctx.lineTo(-4,-138);this.ctx.moveTo(17,-132);this.ctx.lineTo(34,-164);this.ctx.lineTo(4,-138);this.ctx.fill();this.ctx.fillStyle='#eaffff';this.ctx.fillRect(6,-124,11,5);this.ctx.strokeStyle='#7fe4ff';this.ctx.lineWidth=6;this.ctx.beginPath();this.ctx.moveTo(25,-91);this.ctx.lineTo(attack?67:49,-52);this.ctx.stroke();
    } else if (enemy.type === 'preservationWisp') {
      this.ctx.globalAlpha*=.92;this.ctx.shadowColor='#d9fbff';this.ctx.shadowBlur=26;this.ctx.fillStyle='#183b62';this.ctx.beginPath();this.ctx.arc(0,-44,36,0,Math.PI*2);this.ctx.fill();this.ctx.strokeStyle='#8ee7ff';this.ctx.lineWidth=5;this.ctx.beginPath();this.ctx.arc(0,-44,28,0,Math.PI*2);this.ctx.stroke();this.ctx.fillStyle='#f5ffff';this.ctx.beginPath();this.ctx.ellipse(attack?8:0,-48,15,9,0,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#284c86';this.ctx.beginPath();this.ctx.arc(attack?13:4,-48,5,0,Math.PI*2);this.ctx.fill();for(let tail=0;tail<4;tail+=1){this.ctx.strokeStyle='#bff8ff';this.ctx.lineWidth=3;this.ctx.beginPath();this.ctx.moveTo(-24+tail*16,-13);this.ctx.quadraticCurveTo(-31+tail*18,10+Math.sin(this.time*5+tail)*7,-18+tail*13,20);this.ctx.stroke();}
    } else if (enemy.type === 'memoryGolem') {
      this.ctx.shadowColor='#bff8ff';this.ctx.shadowBlur=24;this.ctx.fillStyle='#17354f';this.ctx.beginPath();this.ctx.moveTo(-67,-126);this.ctx.lineTo(-43,-183);this.ctx.lineTo(0,-157);this.ctx.lineTo(45,-188);this.ctx.lineTo(69,-122);this.ctx.lineTo(61,-20);this.ctx.lineTo(-61,-20);this.ctx.closePath();this.ctx.fill();this.ctx.strokeStyle='#d9fcff';this.ctx.lineWidth=5;this.ctx.stroke();this.ctx.fillStyle='#6e91a9';this.roundRect(-48,-151,96,78,20);this.ctx.fill();this.ctx.fillStyle='#10283e';this.ctx.beginPath();this.ctx.moveTo(-35,-164);this.ctx.lineTo(0,-202);this.ctx.lineTo(35,-164);this.ctx.closePath();this.ctx.fill();this.ctx.fillStyle='#f5ffff';this.ctx.fillRect(8,-173,16,7);this.ctx.strokeStyle='#76ddff';this.ctx.lineWidth=15;this.ctx.lineCap='round';for(const side of [-1,1]){this.ctx.beginPath();this.ctx.moveTo(side*47,-126);this.ctx.lineTo(side*(attack?93:76),-70);this.ctx.stroke();}this.ctx.fillStyle='#d9fcff';for(let memory=0;memory<3;memory+=1){this.ctx.globalAlpha=.45+memory*.15;this.ctx.strokeStyle='#d9fcff';this.ctx.beginPath();this.ctx.arc(0,-112,24+memory*15,0,Math.PI*2);this.ctx.stroke();}
    } else if (enemy.type === 'isoldeBoss') {
      const breathe=1+pulse*.016;this.ctx.scale(breathe,1);this.ctx.shadowColor='#7ce3ff';this.ctx.shadowBlur=34;
      this.ctx.strokeStyle='#77dcff';this.ctx.lineWidth=5;this.ctx.beginPath();this.ctx.moveTo(59,-54);this.ctx.bezierCurveTo(131,-24,121,-112,155,-142);this.ctx.stroke();this.ctx.fillStyle='#b9f5ff';this.ctx.beginPath();this.ctx.moveTo(155,-142);this.ctx.lineTo(135,-129);this.ctx.lineTo(159,-119);this.ctx.fill();
      this.ctx.fillStyle='#0d1b31';this.ctx.beginPath();this.ctx.moveTo(-74,-151);this.ctx.lineTo(74,-151);this.ctx.lineTo(82,0);this.ctx.lineTo(-82,0);this.ctx.closePath();this.ctx.fill();this.ctx.strokeStyle='#8ee7ff';this.ctx.lineWidth=4;this.ctx.stroke();
      this.ctx.fillStyle='#2c6685';for(let armor=0;armor<5;armor+=1){const x=-56+armor*28;this.ctx.beginPath();this.ctx.moveTo(x,-150);this.ctx.lineTo(x+14,-190-(armor%2)*16);this.ctx.lineTo(x+28,-150);this.ctx.closePath();this.ctx.fill();}
      this.ctx.fillStyle='#21445f';this.roundRect(-57,-182,114,92,29);this.ctx.fill();this.ctx.strokeStyle='#c9f9ff';this.ctx.lineWidth=4;this.ctx.beginPath();this.ctx.moveTo(-43,-163);this.ctx.lineTo(0,-112);this.ctx.lineTo(43,-163);this.ctx.stroke();
      this.ctx.fillStyle='#704d61';this.ctx.beginPath();this.ctx.arc(0,-216,33,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#11192d';this.ctx.beginPath();this.ctx.arc(-5,-226,38,Math.PI,Math.PI*2);this.ctx.lineTo(40,-204);this.ctx.lineTo(10,-210);this.ctx.fill();
      this.ctx.fillStyle='#071426';this.ctx.beginPath();this.ctx.moveTo(-25,-229);this.ctx.bezierCurveTo(-64,-256,-82,-294,-49,-282);this.ctx.bezierCurveTo(-28,-274,-18,-248,-10,-236);this.ctx.moveTo(25,-229);this.ctx.bezierCurveTo(64,-256,82,-294,49,-282);this.ctx.bezierCurveTo(28,-274,18,-248,10,-236);this.ctx.fill();
      this.ctx.fillStyle='#e9feff';this.ctx.fillRect(8,-221,14,6);this.ctx.fillStyle='#56d7ff';this.ctx.fillRect(12,-221,8,6);
      this.ctx.strokeStyle='#73dcff';this.ctx.lineWidth=12;this.ctx.lineCap='round';for(const side of [-1,1]){this.ctx.beginPath();this.ctx.moveTo(side*46,-154);this.ctx.lineTo(side*(attack?111:88),-103);this.ctx.stroke();this.ctx.fillStyle='#d9fcff';this.ctx.beginPath();this.ctx.moveTo(side*(attack?111:88),-103);this.ctx.lineTo(side*(attack?132:105),-115);this.ctx.lineTo(side*(attack?119:96),-91);this.ctx.fill();}
      this.ctx.strokeStyle='#dffcff';this.ctx.lineWidth=3;for(let crown=0;crown<5;crown+=1){const x=-38+crown*19;this.ctx.beginPath();this.ctx.moveTo(x,-250);this.ctx.lineTo(x+9,-277-(crown%2)*12);this.ctx.lineTo(x+18,-250);this.ctx.stroke();}
    } else if (enemy.type === 'luggageImp') {
      this.ctx.strokeStyle='#25152d';this.ctx.lineWidth=9;this.ctx.beginPath();this.ctx.moveTo(-12,-25);this.ctx.lineTo(-18,-2);this.ctx.moveTo(12,-25);this.ctx.lineTo(18,-2);this.ctx.stroke();this.ctx.fillStyle='#693b72';this.roundRect(-29,-67,58,49,9);this.ctx.fill();this.ctx.strokeStyle='#f2b6e2';this.ctx.lineWidth=3;this.ctx.strokeRect(-23,-59,46,33);this.ctx.fillStyle='#b77aa4';this.ctx.beginPath();this.ctx.arc(0,-78,18,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#26142f';this.ctx.beginPath();this.ctx.moveTo(-14,-88);this.ctx.lineTo(-23,-106);this.ctx.lineTo(-5,-91);this.ctx.moveTo(14,-88);this.ctx.lineTo(23,-106);this.ctx.lineTo(5,-91);this.ctx.fill();this.ctx.fillStyle='#ffe7a8';this.ctx.fillRect(5,-80,8,5);this.ctx.strokeStyle='#d6a0ff';this.ctx.lineWidth=4;this.ctx.beginPath();this.ctx.arc(attack?34:26,-42,9,0,Math.PI*2);this.ctx.stroke();
    } else if (enemy.type === 'sleepwalker') {
      this.ctx.strokeStyle='#21172a';this.ctx.lineWidth=11;this.ctx.beginPath();this.ctx.moveTo(-11,-39);this.ctx.lineTo(-16,-2);this.ctx.moveTo(11,-39);this.ctx.lineTo(16,-2);this.ctx.stroke();this.ctx.fillStyle='#604b78';this.ctx.beginPath();this.ctx.moveTo(-30,-101);this.ctx.lineTo(30,-101);this.ctx.lineTo(24,-34);this.ctx.lineTo(-24,-34);this.ctx.closePath();this.ctx.fill();this.ctx.strokeStyle='#dfb9ee';this.ctx.lineWidth=2;for(let stripe=-1;stripe<=1;stripe+=1){this.ctx.beginPath();this.ctx.moveTo(stripe*13,-94);this.ctx.lineTo(stripe*11,-43);this.ctx.stroke();}this.ctx.fillStyle='#ad7898';this.ctx.beginPath();this.ctx.arc(0,-116,19,0,Math.PI*2);this.ctx.fill();this.ctx.strokeStyle='#25162e';this.ctx.lineWidth=3;this.ctx.beginPath();this.ctx.moveTo(-12,-117);this.ctx.lineTo(-3,-116);this.ctx.moveTo(4,-116);this.ctx.lineTo(13,-117);this.ctx.stroke();this.ctx.fillStyle='#f0c6ff';this.ctx.font='900 15px Barlow Condensed';this.ctx.fillText(attack?'!':'Z',29,-123);
    } else if (enemy.type === 'keyholeWisp') {
      this.ctx.shadowColor='#d6a0ff';this.ctx.shadowBlur=25;this.ctx.fillStyle='#291539';this.ctx.beginPath();this.ctx.arc(0,-43,37,0,Math.PI*2);this.ctx.fill();this.ctx.strokeStyle='#e3bdff';this.ctx.lineWidth=4;this.ctx.beginPath();this.ctx.arc(0,-43,30,0,Math.PI*2);this.ctx.stroke();this.ctx.fillStyle='#fff3c4';this.ctx.beginPath();this.ctx.arc(attack?7:0,-50,10,0,Math.PI*2);this.ctx.fill();this.ctx.fillRect(attack?3:-4,-44,8,22);this.ctx.strokeStyle='#bc7cff';this.ctx.lineWidth=3;for(let tail=0;tail<4;tail+=1){this.ctx.beginPath();this.ctx.moveTo(-25+tail*17,-13);this.ctx.quadraticCurveTo(-30+tail*18,12+Math.sin(this.time*5+tail)*7,-18+tail*13,22);this.ctx.stroke();}
    } else if (enemy.type === 'bellhopMimic') {
      this.ctx.fillStyle='#3b203f';this.roundRect(-66,-118,132,112,15);this.ctx.fill();this.ctx.strokeStyle='#d6a0ff';this.ctx.lineWidth=4;this.ctx.strokeRect(-55,-105,110,48);this.ctx.fillStyle='#160c1b';this.ctx.beginPath();this.ctx.moveTo(-55,-50);this.ctx.quadraticCurveTo(0,attack?10:-20,55,-50);this.ctx.lineTo(48,-9);this.ctx.lineTo(-48,-9);this.ctx.closePath();this.ctx.fill();this.ctx.fillStyle='#fff0d8';for(let tooth=0;tooth<7;tooth+=1){const x=-44+tooth*14;this.ctx.beginPath();this.ctx.moveTo(x,-46);this.ctx.lineTo(x+7,-29+attack*9);this.ctx.lineTo(x+14,-46);this.ctx.fill();}this.ctx.fillStyle='#bb7b98';this.ctx.beginPath();this.ctx.arc(0,-133,20,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#2b1636';this.ctx.beginPath();this.ctx.moveTo(-18,-143);this.ctx.lineTo(0,-167);this.ctx.lineTo(18,-143);this.ctx.closePath();this.ctx.fill();
    } else if (enemy.type === 'hallwayHound') {
      const crouch=attack?8:0;this.ctx.strokeStyle='#201329';this.ctx.lineWidth=11;this.ctx.lineCap='round';this.ctx.beginPath();this.ctx.moveTo(-37,-30+crouch);this.ctx.lineTo(-44,-2);this.ctx.moveTo(31,-30+crouch);this.ctx.lineTo(40,-2);this.ctx.stroke();this.ctx.fillStyle='#5b356e';this.roundRect(-51,-67+crouch,89,45,18);this.ctx.fill();this.ctx.fillStyle='#a56e99';this.ctx.beginPath();this.ctx.ellipse(47+attack*14,-54+crouch,32,25,0,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#150b1d';this.ctx.beginPath();this.ctx.moveTo(25,-51+crouch);this.ctx.lineTo(77+attack*14,-42+crouch);this.ctx.lineTo(30,-31+crouch);this.ctx.closePath();this.ctx.fill();this.ctx.fillStyle='#ffe7a8';this.ctx.fillRect(48+attack*9,-63+crouch,8,5);this.ctx.strokeStyle='#d6a0ff';this.ctx.lineWidth=4;this.ctx.beginPath();this.ctx.moveTo(-45,-54+crouch);this.ctx.bezierCurveTo(-84,-79,-82,-28,-104,-43);this.ctx.stroke();
    } else if (enemy.type === 'wakeUpCaller') {
      this.ctx.fillStyle='#34203f';this.ctx.beginPath();this.ctx.moveTo(-38,-108);this.ctx.lineTo(38,-108);this.ctx.lineTo(46,0);this.ctx.lineTo(-46,0);this.ctx.closePath();this.ctx.fill();this.ctx.fillStyle='#a56f99';this.ctx.beginPath();this.ctx.arc(0,-125,22,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#160c21';this.ctx.beginPath();this.ctx.moveTo(-18,-138);this.ctx.lineTo(-36,-170);this.ctx.lineTo(-5,-144);this.ctx.moveTo(18,-138);this.ctx.lineTo(36,-170);this.ctx.lineTo(5,-144);this.ctx.fill();this.ctx.strokeStyle='#f3b3e7';this.ctx.lineWidth=7;this.ctx.beginPath();this.ctx.moveTo(28,-95);this.ctx.lineTo(attack?72:51,-59);this.ctx.stroke();this.ctx.fillStyle='#ffe7a8';this.ctx.beginPath();this.ctx.arc(attack?78:57,-55,11,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#3b2049';this.ctx.font='900 14px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText('6:00',attack?78:57,-50);
    } else if (enemy.type === 'fantasyAnchor') {
      const anchorPulse=.5+.5*Math.sin(this.time*5+enemy.id);this.ctx.shadowColor='#ffd8f5';this.ctx.shadowBlur=18+anchorPulse*12;this.ctx.fillStyle='#342042';this.ctx.beginPath();this.ctx.moveTo(-31,0);this.ctx.lineTo(-24,-121);this.ctx.lineTo(0,-150);this.ctx.lineTo(24,-121);this.ctx.lineTo(31,0);this.ctx.closePath();this.ctx.fill();this.ctx.strokeStyle='#ffd8f5';this.ctx.lineWidth=4;this.ctx.stroke();this.ctx.fillStyle='#fff0b5';this.ctx.font='900 34px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText(enemy.id%2?'♥':'☀',0,-72);this.ctx.globalAlpha=.45+anchorPulse*.4;for(let ring=0;ring<3;ring+=1){this.ctx.beginPath();this.ctx.arc(0,-74,27+ring*13,0,Math.PI*2);this.ctx.stroke();}
    } else if (enemy.type === 'dreamGirl') {
      this.ctx.shadowColor='#ffd8f5';this.ctx.shadowBlur=25;this.ctx.fillStyle='#3b2048';this.ctx.beginPath();this.ctx.moveTo(-59,-128);this.ctx.lineTo(59,-128);this.ctx.lineTo(68,0);this.ctx.lineTo(-68,0);this.ctx.closePath();this.ctx.fill();this.ctx.fillStyle='#d38bb5';this.roundRect(-45,-153,90,76,25);this.ctx.fill();this.ctx.fillStyle='#c4899c';this.ctx.beginPath();this.ctx.arc(0,-177,27,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#4b2857';this.ctx.beginPath();this.ctx.arc(-5,-188,34,Math.PI,Math.PI*2);this.ctx.lineTo(38,-169);this.ctx.lineTo(8,-174);this.ctx.fill();this.ctx.fillStyle='#fff0c8';this.ctx.fillRect(7,-180,12,5);this.ctx.strokeStyle='#f3b3e7';this.ctx.lineWidth=9;this.ctx.lineCap='round';for(const side of [-1,1]){this.ctx.beginPath();this.ctx.moveTo(side*37,-125);this.ctx.lineTo(side*(attack?93:72),-78);this.ctx.stroke();}this.ctx.strokeStyle='#ffd8f5';this.ctx.lineWidth=3;for(let ribbon=0;ribbon<4;ribbon+=1){this.ctx.beginPath();this.ctx.moveTo(-42+ribbon*28,-35);this.ctx.bezierCurveTo(-63+ribbon*30,8,-20+ribbon*19,18,-38+ribbon*25,36);this.ctx.stroke();}
    } else if (enemy.type === 'somniaBoss') {
      const breathe=1+pulse*.018;this.ctx.scale(breathe,1);this.ctx.shadowColor='#d16cff';this.ctx.shadowBlur=36;this.ctx.fillStyle='#170921';this.ctx.beginPath();this.ctx.moveTo(-79,-151);this.ctx.lineTo(79,-151);this.ctx.lineTo(86,0);this.ctx.lineTo(-86,0);this.ctx.closePath();this.ctx.fill();this.ctx.strokeStyle='#bc7cff';this.ctx.lineWidth=5;this.ctx.stroke();this.ctx.fillStyle='#5b1f68';this.roundRect(-60,-185,120,96,30);this.ctx.fill();this.ctx.fillStyle='#9c5a76';this.ctx.beginPath();this.ctx.arc(0,-220,34,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#0d0714';this.ctx.beginPath();this.ctx.arc(-5,-231,42,Math.PI,Math.PI*2);this.ctx.lineTo(44,-207);this.ctx.lineTo(10,-213);this.ctx.fill();
      this.ctx.fillStyle='#0b0611';for(const side of [-1,1]){this.ctx.beginPath();this.ctx.moveTo(side*24,-231);this.ctx.bezierCurveTo(side*58,-264,side*86,-310,side*49,-306);this.ctx.bezierCurveTo(side*27,-296,side*19,-255,side*9,-238);this.ctx.fill();}
      this.ctx.fillStyle='#fff0b8';for(const eye of [-15,13])this.ctx.fillRect(eye,-224,10,5);this.ctx.fillStyle='#ff66ce';this.ctx.fillRect(-12,-222,4,4);this.ctx.fillRect(16,-222,4,4);
      this.ctx.strokeStyle='#bc7cff';this.ctx.lineWidth=13;this.ctx.lineCap='round';for(const side of [-1,1]){this.ctx.beginPath();this.ctx.moveTo(side*48,-155);this.ctx.lineTo(side*(attack?119:91),-102);this.ctx.stroke();this.ctx.fillStyle='#f1c9ff';this.ctx.beginPath();this.ctx.moveTo(side*(attack?119:91),-102);this.ctx.lineTo(side*(attack?142:112),-116);this.ctx.lineTo(side*(attack?128:101),-89);this.ctx.fill();}
      this.ctx.strokeStyle='#ff82d7';this.ctx.lineWidth=5;this.ctx.beginPath();this.ctx.moveTo(68,-45);this.ctx.bezierCurveTo(148,-12,126,-129,168,-157);this.ctx.stroke();this.ctx.fillStyle='#ff82d7';this.ctx.beginPath();this.ctx.moveTo(168,-157);this.ctx.lineTo(147,-142);this.ctx.lineTo(173,-132);this.ctx.fill();
      for(let eye=0;eye<3;eye+=1){this.ctx.fillStyle='#ffcfef';this.ctx.beginPath();this.ctx.ellipse(-30+eye*30,-143+(eye%2)*17,9,5,0,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#8c2ca3';this.ctx.beginPath();this.ctx.arc(-27+eye*30,-143+(eye%2)*17,3,0,Math.PI*2);this.ctx.fill();}
    } else if (enemy.type === 'mirrorPunk') {
      this.ctx.strokeStyle='#102638';this.ctx.lineWidth=9;this.ctx.beginPath();this.ctx.moveTo(-12,-31);this.ctx.lineTo(-18,-2);this.ctx.moveTo(12,-31);this.ctx.lineTo(18,-2);this.ctx.stroke();this.ctx.fillStyle='#254f70';this.roundRect(-27,-70,54,47,12);this.ctx.fill();this.ctx.fillStyle='#9a6d8f';this.ctx.beginPath();this.ctx.arc(0,-82,19,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#0b1528';this.ctx.beginPath();this.ctx.moveTo(-15,-92);this.ctx.lineTo(-25,-113);this.ctx.lineTo(-5,-96);this.ctx.moveTo(15,-92);this.ctx.lineTo(25,-113);this.ctx.lineTo(5,-96);this.ctx.fill();this.ctx.strokeStyle='#8ff7ff';this.ctx.lineWidth=5;this.ctx.beginPath();this.ctx.moveTo(21,-56);this.ctx.lineTo(attack?61:42,-35);this.ctx.stroke();
    } else if (enemy.type === 'prismWisp') {
      this.ctx.globalAlpha*=.92;this.ctx.shadowColor='#8ff7ff';this.ctx.shadowBlur=26;this.ctx.fillStyle='#172a4c';this.ctx.beginPath();this.ctx.arc(0,-43,36,0,Math.PI*2);this.ctx.fill();this.ctx.strokeStyle='#d06cff';this.ctx.lineWidth=4;for(let shard=0;shard<8;shard+=1){const a=shard/8*Math.PI*2+this.time*.3;this.ctx.beginPath();this.ctx.moveTo(Math.cos(a)*27,-43+Math.sin(a)*27);this.ctx.lineTo(Math.cos(a)*45,-43+Math.sin(a)*45);this.ctx.stroke();}this.ctx.fillStyle='#f2ffff';this.ctx.beginPath();this.ctx.ellipse(attack?8:0,-46,15,9,0,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#d06cff';this.ctx.beginPath();this.ctx.arc(attack?13:4,-46,5,0,Math.PI*2);this.ctx.fill();
    } else if (enemy.type === 'facelessStriker' || enemy.type === 'echoSniper') {
      const sniper=enemy.type==='echoSniper';this.ctx.strokeStyle='#111d35';this.ctx.lineWidth=11;this.ctx.beginPath();this.ctx.moveTo(-12,-41);this.ctx.lineTo(-18,-2);this.ctx.moveTo(12,-41);this.ctx.lineTo(18,-2);this.ctx.stroke();this.ctx.fillStyle=sniper?'#35265c':'#203f60';this.ctx.beginPath();this.ctx.moveTo(-34,-103);this.ctx.lineTo(34,-103);this.ctx.lineTo(42,0);this.ctx.lineTo(-42,0);this.ctx.closePath();this.ctx.fill();this.ctx.fillStyle='#d9ffff';this.ctx.beginPath();this.ctx.ellipse(0,-119,22,28,0,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#10172c';this.ctx.fillRect(-15,-126,30,13);this.ctx.strokeStyle=sniper?'#d06cff':'#61edff';this.ctx.lineWidth=7;this.ctx.beginPath();this.ctx.moveTo(27,-86);this.ctx.lineTo(attack?78:53,-52);this.ctx.stroke();
    } else if (enemy.type === 'glassHound') {
      const crouch=attack?8:0;this.ctx.strokeStyle='#102038';this.ctx.lineWidth=11;this.ctx.beginPath();this.ctx.moveTo(-38,-30+crouch);this.ctx.lineTo(-45,-2);this.ctx.moveTo(32,-30+crouch);this.ctx.lineTo(41,-2);this.ctx.stroke();this.ctx.fillStyle='#285674';this.roundRect(-52,-67+crouch,90,45,18);this.ctx.fill();this.ctx.fillStyle='#8fd3dd';this.ctx.beginPath();this.ctx.ellipse(48+attack*14,-54+crouch,33,25,0,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#102139';this.ctx.beginPath();this.ctx.moveTo(25,-51+crouch);this.ctx.lineTo(78+attack*14,-42+crouch);this.ctx.lineTo(30,-31+crouch);this.ctx.closePath();this.ctx.fill();this.ctx.strokeStyle='#8ff7ff';this.ctx.lineWidth=3;for(let shard=0;shard<4;shard+=1){const x=-30+shard*22;this.ctx.beginPath();this.ctx.moveTo(x,-62);this.ctx.lineTo(x+8,-89-(shard%2)*10);this.ctx.lineTo(x+16,-62);this.ctx.stroke();}
    } else if (enemy.type === 'reflectionKnight') {
      this.ctx.strokeStyle='#101d34';this.ctx.lineWidth=14;this.ctx.beginPath();this.ctx.moveTo(-18,-49);this.ctx.lineTo(-25,-2);this.ctx.moveTo(18,-49);this.ctx.lineTo(25,-2);this.ctx.stroke();this.ctx.fillStyle='#304c71';this.roundRect(-48,-125,96,84,17);this.ctx.fill();this.ctx.strokeStyle='#a8f8ff';this.ctx.lineWidth=4;this.ctx.strokeRect(-39,-114,78,60);this.ctx.fillStyle='#172740';this.ctx.beginPath();this.ctx.moveTo(-33,-125);this.ctx.lineTo(0,-164);this.ctx.lineTo(33,-125);this.ctx.closePath();this.ctx.fill();this.ctx.fillStyle='#f0ffff';this.ctx.fillRect(5,-140,18,6);this.ctx.strokeStyle='#d06cff';this.ctx.lineWidth=10;this.ctx.beginPath();this.ctx.moveTo(39,-99);this.ctx.lineTo(attack?91:67,-49);this.ctx.stroke();
    } else if (enemy.type === 'betterMilo') {
      this.ctx.shadowColor='#d06cff';this.ctx.shadowBlur=23;this.ctx.strokeStyle='#10151f';this.ctx.lineWidth=14;this.ctx.beginPath();this.ctx.moveTo(-17,-52);this.ctx.lineTo(-23,-2);this.ctx.moveTo(17,-52);this.ctx.lineTo(23,-2);this.ctx.stroke();this.ctx.fillStyle='#25313a';this.ctx.beginPath();this.ctx.moveTo(-46,-129);this.ctx.lineTo(46,-129);this.ctx.lineTo(55,0);this.ctx.lineTo(-55,0);this.ctx.closePath();this.ctx.fill();this.ctx.fillStyle='#6b263f';this.ctx.fillRect(-39,-121,78,18);this.ctx.fillStyle='#9c6d68';this.ctx.beginPath();this.ctx.arc(0,-153,28,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#0b1018';this.ctx.beginPath();this.ctx.arc(-5,-164,35,Math.PI,Math.PI*2);this.ctx.lineTo(36,-143);this.ctx.lineTo(8,-148);this.ctx.fill();this.ctx.fillStyle='#d8ffff';this.ctx.fillRect(7,-156,13,5);this.ctx.strokeStyle='#8ff7ff';this.ctx.lineWidth=11;this.ctx.lineCap='round';this.ctx.beginPath();this.ctx.moveTo(38,-112);this.ctx.lineTo(attack?102:73,-72);this.ctx.stroke();this.ctx.fillStyle='#d06cff';this.ctx.beginPath();this.ctx.arc(attack?108:79,-68,13,0,Math.PI*2);this.ctx.fill();
    } else if (enemy.type === 'vesperaBoss') {
      const breathe=1+pulse*.017;this.ctx.scale(breathe,1);this.ctx.shadowColor='#8ff7ff';this.ctx.shadowBlur=38;this.ctx.fillStyle='#10091e';this.ctx.beginPath();this.ctx.moveTo(-82,-151);this.ctx.lineTo(82,-151);this.ctx.lineTo(90,0);this.ctx.lineTo(-90,0);this.ctx.closePath();this.ctx.fill();this.ctx.strokeStyle='#61edff';this.ctx.lineWidth=5;this.ctx.stroke();this.ctx.fillStyle='#43245d';this.roundRect(-62,-190,124,102,31);this.ctx.fill();this.ctx.fillStyle='#915f75';this.ctx.beginPath();this.ctx.arc(0,-226,35,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#090611';this.ctx.beginPath();this.ctx.arc(-6,-238,44,Math.PI,Math.PI*2);this.ctx.lineTo(47,-212);this.ctx.lineTo(11,-218);this.ctx.fill();
      this.ctx.fillStyle='#07050d';for(const side of [-1,1]){this.ctx.beginPath();this.ctx.moveTo(side*25,-238);this.ctx.bezierCurveTo(side*63,-271,side*96,-323,side*52,-315);this.ctx.bezierCurveTo(side*28,-307,side*16,-264,side*8,-245);this.ctx.fill();this.ctx.beginPath();this.ctx.moveTo(side*60,-151);this.ctx.lineTo(side*126,-210);this.ctx.lineTo(side*101,-126);this.ctx.lineTo(side*151,-79);this.ctx.lineTo(side*67,-90);this.ctx.closePath();this.ctx.fill();}
      this.ctx.fillStyle='#efffff';for(const eye of [-16,14])this.ctx.fillRect(eye,-230,11,5);this.ctx.fillStyle='#d06cff';this.ctx.fillRect(-12,-228,5,4);this.ctx.fillRect(18,-228,5,4);this.ctx.strokeStyle='#61edff';this.ctx.lineWidth=13;this.ctx.lineCap='round';for(const side of [-1,1]){this.ctx.beginPath();this.ctx.moveTo(side*50,-157);this.ctx.lineTo(side*(attack?125:96),-102);this.ctx.stroke();this.ctx.fillStyle='#f0ffff';this.ctx.beginPath();this.ctx.moveTo(side*(attack?125:96),-102);this.ctx.lineTo(side*(attack?149:118),-118);this.ctx.lineTo(side*(attack?134:106),-88);this.ctx.fill();}
      this.ctx.strokeStyle='#d06cff';this.ctx.lineWidth=6;this.ctx.beginPath();this.ctx.moveTo(70,-46);this.ctx.bezierCurveTo(160,-8,132,-142,181,-166);this.ctx.stroke();this.ctx.fillStyle='#d06cff';this.ctx.beginPath();this.ctx.moveTo(181,-166);this.ctx.lineTo(156,-151);this.ctx.lineTo(185,-138);this.ctx.fill();for(let eye=0;eye<5;eye+=1){this.ctx.fillStyle='#eaffff';this.ctx.beginPath();this.ctx.ellipse(-52+eye*26,-143+(eye%2)*18,9,5,0,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle=eye%2?'#61edff':'#d06cff';this.ctx.beginPath();this.ctx.arc(-49+eye*26,-143+(eye%2)*18,3,0,Math.PI*2);this.ctx.fill();}
    } else if (enemy.type === 'portalHound') {
      const crouch=attack?8:0;this.ctx.shadowColor='#ff4f9a';this.ctx.shadowBlur=16;this.ctx.strokeStyle='#250b1c';this.ctx.lineWidth=12;this.ctx.lineCap='round';this.ctx.beginPath();this.ctx.moveTo(-41,-30+crouch);this.ctx.lineTo(-48,-2);this.ctx.moveTo(34,-30+crouch);this.ctx.lineTo(43,-2);this.ctx.stroke();this.ctx.fillStyle='#5b173f';this.roundRect(-54,-70+crouch,94,48,18);this.ctx.fill();this.ctx.fillStyle='#c04475';this.ctx.beginPath();this.ctx.ellipse(50+attack*15,-56+crouch,35,27,0,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#100711';this.ctx.beginPath();this.ctx.moveTo(26,-53+crouch);this.ctx.lineTo(84+attack*15,-43+crouch);this.ctx.lineTo(31,-31+crouch);this.ctx.closePath();this.ctx.fill();this.ctx.fillStyle='#fff0f5';for(let tooth=0;tooth<6;tooth+=1){const x=37+tooth*8+attack*7;this.ctx.beginPath();this.ctx.moveTo(x,-48+crouch);this.ctx.lineTo(x+4,-35+crouch);this.ctx.lineTo(x+8,-48+crouch);this.ctx.fill();}this.ctx.strokeStyle='#ff72b7';this.ctx.lineWidth=4;for(let ring=0;ring<3;ring++){this.ctx.beginPath();this.ctx.arc(-15,-48+crouch,26+ring*9,0,Math.PI*2);this.ctx.stroke();}
    } else if (enemy.type === 'decreeWisp' || enemy.type === 'hollowShade') {
      const hollow=enemy.type==='hollowShade';const color=hollow?'#b9aec9':'#f3a0ff';this.ctx.shadowColor=color;this.ctx.shadowBlur=24;this.ctx.fillStyle=hollow?'#1b1724':'#481340';this.ctx.beginPath();this.ctx.arc(0,-46,38,0,Math.PI*2);this.ctx.fill();this.ctx.strokeStyle=color;this.ctx.lineWidth=4;this.ctx.beginPath();this.ctx.arc(0,-46,29+attack*5,0,Math.PI*2);this.ctx.stroke();this.ctx.fillStyle='#fff';this.ctx.beginPath();this.ctx.ellipse(attack?9:0,-49,16,9,0,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle=hollow?'#3a3345':'#ff4f9a';this.ctx.beginPath();this.ctx.arc(attack?14:5,-49,5,0,Math.PI*2);this.ctx.fill();for(let tail=0;tail<5;tail++){this.ctx.strokeStyle=color;this.ctx.lineWidth=3;this.ctx.beginPath();this.ctx.moveTo(-28+tail*14,-15);this.ctx.quadraticCurveTo(-35+tail*16,9+Math.sin(this.time*5+tail)*7,-22+tail*12,23);this.ctx.stroke();}
    } else if (enemy.type === 'throneLegionary' || enemy.type === 'charmAcolyte' || enemy.type === 'bloodCantor' || enemy.type === 'hollowSuccubus') {
      const palette=enemy.type==='throneLegionary'?['#28121d','#9e3155','#f7c1d4']:enemy.type==='charmAcolyte'?['#2e102d','#c14f9d','#ffd2ef']:enemy.type==='bloodCantor'?['#26080f','#9b1e35','#ff9aaf']:['#17121b','#513648','#b8a7bd'];const tall=enemy.type==='throneLegionary'?138:118;this.ctx.shadowColor=palette[1];this.ctx.shadowBlur=14;this.ctx.strokeStyle='#140b12';this.ctx.lineWidth=12;this.ctx.beginPath();this.ctx.moveTo(-15,-44);this.ctx.lineTo(-22,-2);this.ctx.moveTo(15,-44);this.ctx.lineTo(22,-2);this.ctx.stroke();this.ctx.fillStyle=palette[0];this.ctx.beginPath();this.ctx.moveTo(-42,-tall+42);this.ctx.lineTo(42,-tall+42);this.ctx.lineTo(51,0);this.ctx.lineTo(-51,0);this.ctx.closePath();this.ctx.fill();this.ctx.strokeStyle=palette[1];this.ctx.lineWidth=4;this.ctx.stroke();this.ctx.fillStyle='#9c6673';this.ctx.beginPath();this.ctx.arc(0,-tall,23,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#100810';for(const side of [-1,1]){this.ctx.beginPath();this.ctx.moveTo(side*12,-tall-12);this.ctx.lineTo(side*31,-tall-43);this.ctx.lineTo(side*5,-tall-20);this.ctx.fill();}this.ctx.fillStyle=palette[2];this.ctx.fillRect(5,-tall-3,12,5);this.ctx.strokeStyle=palette[1];this.ctx.lineWidth=8;this.ctx.beginPath();this.ctx.moveTo(35,-tall+55);this.ctx.lineTo(attack?84:63,-tall+90);this.ctx.stroke();this.ctx.fillStyle=palette[2];this.ctx.font='900 24px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText(enemy.type==='throneLegionary'?'♜':enemy.type==='charmAcolyte'?'♥':enemy.type==='bloodCantor'?'♦':'○',0,-tall+58);
    } else if (enemy.type.startsWith('daughter')) {
      const colors:Record<string,[string,string,string]>={daughterAttack:['#3d101c','#ff4965','ATK'],daughterDefense:['#10243b','#76b7ff','DEF'],daughterMovement:['#073138','#5cf3ef','MOV'],daughterEnergy:['#392d0c','#ffe36b','ENG']};const [dark,color,label]=colors[enemy.type];this.ctx.shadowColor=color;this.ctx.shadowBlur=24;this.ctx.fillStyle=dark;this.ctx.beginPath();this.ctx.moveTo(-58,-140);this.ctx.lineTo(58,-140);this.ctx.lineTo(68,0);this.ctx.lineTo(-68,0);this.ctx.closePath();this.ctx.fill();this.ctx.strokeStyle=color;this.ctx.lineWidth=5;this.ctx.stroke();this.ctx.fillStyle='#a76573';this.ctx.beginPath();this.ctx.arc(0,-176,30,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#120812';for(const side of [-1,1]){this.ctx.beginPath();this.ctx.moveTo(side*20,-184);this.ctx.bezierCurveTo(side*46,-220,side*62,-245,side*30,-238);this.ctx.lineTo(side*7,-191);this.ctx.fill();}this.ctx.strokeStyle=color;this.ctx.lineWidth=10;for(const side of [-1,1]){this.ctx.beginPath();this.ctx.moveTo(side*45,-130);this.ctx.lineTo(side*(attack?104:80),-82);this.ctx.stroke();}this.ctx.fillStyle='#fff';this.ctx.font='900 20px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText(label,0,-92);this.ctx.strokeStyle=color;this.ctx.lineWidth=4;this.ctx.beginPath();this.ctx.arc(0,-96,37+attack*6,0,Math.PI*2);this.ctx.stroke();
    } else if (enemy.type === 'lilithBoss') {
      const breathe=1+pulse*.018;this.ctx.scale(breathe,1);this.ctx.shadowColor='#ff315f';this.ctx.shadowBlur=42;this.ctx.fillStyle='#13060d';this.ctx.beginPath();this.ctx.moveTo(-92,-160);this.ctx.lineTo(92,-160);this.ctx.lineTo(103,0);this.ctx.lineTo(-103,0);this.ctx.closePath();this.ctx.fill();this.ctx.strokeStyle='#ff4f9a';this.ctx.lineWidth=5;this.ctx.stroke();this.ctx.fillStyle='#64142f';this.roundRect(-67,-198,134,108,34);this.ctx.fill();this.ctx.fillStyle='#a9616b';this.ctx.beginPath();this.ctx.arc(0,-238,37,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#090408';this.ctx.beginPath();this.ctx.arc(-6,-250,46,Math.PI,Math.PI*2);this.ctx.lineTo(51,-224);this.ctx.lineTo(12,-230);this.ctx.fill();for(const side of [-1,1]){this.ctx.fillStyle='#070307';this.ctx.beginPath();this.ctx.moveTo(side*23,-249);this.ctx.bezierCurveTo(side*61,-295,side*106,-337,side*64,-342);this.ctx.bezierCurveTo(side*30,-321,side*19,-270,side*5,-250);this.ctx.fill();this.ctx.beginPath();this.ctx.moveTo(side*67,-158);this.ctx.lineTo(side*147,-229);this.ctx.lineTo(side*116,-134);this.ctx.lineTo(side*170,-72);this.ctx.lineTo(side*72,-94);this.ctx.closePath();this.ctx.fill();}this.ctx.fillStyle='#fff0f5';for(const eye of [-17,14])this.ctx.fillRect(eye,-242,12,5);this.ctx.fillStyle='#ff315f';this.ctx.fillRect(-12,-240,5,4);this.ctx.fillRect(19,-240,5,4);this.ctx.strokeStyle='#ff4f9a';this.ctx.lineWidth=13;for(const side of [-1,1]){this.ctx.beginPath();this.ctx.moveTo(side*55,-164);this.ctx.lineTo(side*(attack?137:103),-105);this.ctx.stroke();}this.ctx.strokeStyle='#f0a1cc';this.ctx.lineWidth=7;this.ctx.beginPath();this.ctx.moveTo(82,-46);this.ctx.bezierCurveTo(177,-8,147,-154,199,-180);this.ctx.stroke();this.ctx.fillStyle='#ff315f';this.ctx.beginPath();this.ctx.moveTo(199,-180);this.ctx.lineTo(170,-163);this.ctx.lineTo(204,-148);this.ctx.fill();this.ctx.strokeStyle='#ffd4ea';this.ctx.lineWidth=4;for(let crown=0;crown<5;crown++){const x=-42+crown*21;this.ctx.beginPath();this.ctx.moveTo(x,-276);this.ctx.lineTo(x+10,-309-(crown%2)*12);this.ctx.lineTo(x+20,-276);this.ctx.stroke();}
    } else if (enemy.type === 'bossRushHerald') {
      this.ctx.shadowColor='#a875ff';this.ctx.shadowBlur=28;this.ctx.fillStyle='#171020';this.ctx.beginPath();this.ctx.moveTo(-63,-142);this.ctx.lineTo(63,-142);this.ctx.lineTo(70,0);this.ctx.lineTo(-70,0);this.ctx.closePath();this.ctx.fill();this.ctx.strokeStyle='#d2b7ff';this.ctx.lineWidth=5;this.ctx.stroke();this.ctx.fillStyle='#f1e8ff';this.ctx.font='900 38px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText('VII',0,-82);
    } else if (enemy.type === 'hollowBoss') {
      const phaseColor=enemy.phase===0?'#a970ff':enemy.phase===1?'#e8e1ef':'#ffffff';this.ctx.shadowColor=phaseColor;this.ctx.shadowBlur=38;this.ctx.fillStyle=enemy.phase===1?'#07070b':'#110b19';this.ctx.beginPath();this.ctx.moveTo(-78,-148);this.ctx.lineTo(78,-148);this.ctx.lineTo(90,0);this.ctx.lineTo(-90,0);this.ctx.closePath();this.ctx.fill();this.ctx.strokeStyle=phaseColor;this.ctx.lineWidth=5;this.ctx.stroke();this.ctx.fillStyle='#6d536c';this.ctx.beginPath();this.ctx.arc(0,-203,34,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#050407';this.ctx.beginPath();this.ctx.arc(-6,-215,43,Math.PI,Math.PI*2);this.ctx.lineTo(48,-190);this.ctx.lineTo(10,-196);this.ctx.fill();this.ctx.fillStyle=phaseColor;this.ctx.fillRect(7,-207,14,5);this.ctx.strokeStyle=phaseColor;this.ctx.lineWidth=12;for(const side of [-1,1]){this.ctx.beginPath();this.ctx.moveTo(side*50,-140);this.ctx.lineTo(side*(attack?126:94),-87);this.ctx.stroke();}for(let echo=0;echo<4;echo++){this.ctx.globalAlpha=.18+echo*.08;this.ctx.strokeStyle=phaseColor;this.ctx.lineWidth=2;this.ctx.strokeRect(-58-echo*8,-174-echo*8,116+echo*16,174+echo*8);}this.ctx.globalAlpha=1;this.ctx.fillStyle='#f4efff';this.ctx.font='900 14px Barlow Condensed';this.ctx.textAlign='center';this.ctx.fillText(enemy.phase===0?'MIRROR':enemy.phase===1?'NOTHING':'ACCEPT',0,-105);
    } else if (enemy.type === 'imp') {
      // Club Gremlin: a tiny hype-beast with a stolen arcade token.
      const hop = enemy.grounded ? Math.max(0, pulse) * 2 : 0; this.ctx.translate(0, -hop);
      this.ctx.strokeStyle = '#25142d'; this.ctx.lineWidth = 8; this.ctx.lineCap = 'round';
      this.ctx.beginPath(); this.ctx.moveTo(-10, -22); this.ctx.lineTo(-15 + pulse * 4, -2); this.ctx.moveTo(10, -22); this.ctx.lineTo(15 - pulse * 4, -2); this.ctx.stroke();
      this.ctx.fillStyle = '#8d3f92'; this.roundRect(-21, -52, 42, 34, 12); this.ctx.fill();
      this.ctx.fillStyle = '#c764a7'; this.ctx.beginPath(); this.ctx.arc(0, -58, 18, 0, Math.PI * 2); this.ctx.fill();
      this.ctx.fillStyle = '#4a1f63'; this.ctx.beginPath(); this.ctx.moveTo(-13,-70);this.ctx.lineTo(-22,-88);this.ctx.lineTo(-4,-73);this.ctx.moveTo(13,-70);this.ctx.lineTo(22,-88);this.ctx.lineTo(4,-73);this.ctx.fill();
      this.ctx.fillStyle = '#ffef75'; this.ctx.fillRect(5, -61, 8, 4);
      this.ctx.strokeStyle = '#42e8f5'; this.ctx.lineWidth = 4; this.ctx.beginPath(); this.ctx.arc(attack ? 28 : 21, -38, 8, 0, Math.PI * 2); this.ctx.stroke();
      this.ctx.fillStyle = '#ffc75a'; this.ctx.beginPath(); this.ctx.arc(attack ? 28 : 21, -38, 4, 0, Math.PI * 2); this.ctx.fill();
    } else if (enemy.type === 'floater') {
      // Soul Balloon: a hollow guest whose smile was left behind.
      this.ctx.globalAlpha *= .9;
      this.ctx.fillStyle = '#6f54a3aa'; this.ctx.beginPath(); this.ctx.ellipse(0, -45, 35, 30, 0, 0, Math.PI * 2); this.ctx.fill();
      this.ctx.strokeStyle = '#d9c4ff'; this.ctx.lineWidth = 2; this.ctx.beginPath(); this.ctx.ellipse(0, -45, 35, 30, 0, 0, Math.PI * 2); this.ctx.stroke();
      this.ctx.fillStyle = '#f7f0ff'; this.ctx.beginPath(); this.ctx.ellipse(-11, -49, 7, 5, 0, 0, Math.PI * 2); this.ctx.ellipse(12, -49, 7, 5, 0, 0, Math.PI * 2); this.ctx.fill();
      this.ctx.fillStyle = '#ff4f9a'; this.ctx.beginPath(); this.ctx.arc(attack ? -8 : 10, -49, 3, 0, Math.PI * 2); this.ctx.fill();
      this.ctx.strokeStyle = '#d9c4ff'; this.ctx.lineWidth = 3; this.ctx.beginPath(); this.ctx.arc(0, -36, 13, .2, Math.PI - .2); this.ctx.stroke();
      this.ctx.fillStyle = '#6f54a388'; this.ctx.beginPath(); this.ctx.moveTo(-24,-20);this.ctx.quadraticCurveTo(-18,7,-8,-6);this.ctx.quadraticCurveTo(0,12,8,-6);this.ctx.quadraticCurveTo(18,8,24,-20);this.ctx.fill();
    } else if (enemy.type === 'succubus') {
      // Neon Host: ranged club staff with a tray of volatile glamour.
      const sway = pulse * 2;
      this.ctx.strokeStyle = '#241724'; this.ctx.lineWidth = 9; this.ctx.beginPath();this.ctx.moveTo(-8,-30);this.ctx.lineTo(-12+sway,-2);this.ctx.moveTo(9,-30);this.ctx.lineTo(13-sway,-2);this.ctx.stroke();
      this.ctx.fillStyle = '#671c5b'; this.ctx.beginPath();this.ctx.moveTo(-25,-63);this.ctx.lineTo(25,-63);this.ctx.lineTo(20,-27);this.ctx.lineTo(-20,-27);this.ctx.closePath();this.ctx.fill();
      this.ctx.fillStyle = '#bc6f78'; this.ctx.beginPath(); this.ctx.arc(0,-75,15,0,Math.PI*2); this.ctx.fill();
      this.ctx.fillStyle = '#241727'; this.ctx.beginPath();this.ctx.arc(-3,-80,17,Math.PI,Math.PI*2);this.ctx.lineTo(19,-67);this.ctx.lineTo(5,-69);this.ctx.fill();
      this.ctx.strokeStyle = '#ff64c4'; this.ctx.lineWidth = 5; this.ctx.beginPath();this.ctx.moveTo(17,-57);this.ctx.lineTo(attack?42:31,-46);this.ctx.stroke();
      this.ctx.fillStyle = '#71f4ff'; this.ctx.fillRect(attack?34:23,-49,18,3); this.ctx.beginPath();this.ctx.arc(attack?43:32,-55,7,0,Math.PI*2);this.ctx.fill();
    } else if (enemy.type === 'hellhound') {
      // Maw Hound: quadruped made of velvet shadow and too many teeth.
      const crouch = attack ? 6 : 0;
      this.ctx.strokeStyle = '#261228'; this.ctx.lineWidth = 10; this.ctx.lineCap = 'round'; this.ctx.beginPath();
      this.ctx.moveTo(-29,-25+crouch);this.ctx.lineTo(-37,-2);this.ctx.moveTo(27,-25+crouch);this.ctx.lineTo(35,-2);this.ctx.stroke();
      this.ctx.fillStyle = '#6e255e'; this.roundRect(-42,-58+crouch,72,38,17);this.ctx.fill();
      this.ctx.fillStyle = '#a4386e'; this.ctx.beginPath();this.ctx.ellipse(35+attack*12,-47+crouch,30,24,0,0,Math.PI*2);this.ctx.fill();
      this.ctx.fillStyle = '#180d18'; this.ctx.beginPath();this.ctx.moveTo(19+attack*8,-43+crouch);this.ctx.quadraticCurveTo(44+attack*14,-25+crouch,65+attack*18,-44+crouch);this.ctx.quadraticCurveTo(45,-34+crouch,19+attack*8,-43+crouch);this.ctx.fill();
      this.ctx.fillStyle = '#f9e9d1'; for(let i=0;i<5;i+=1){this.ctx.beginPath();this.ctx.moveTo(29+i*7+attack*7,-40+crouch);this.ctx.lineTo(33+i*7+attack*8,-32+crouch);this.ctx.lineTo(37+i*7+attack*8,-41+crouch);this.ctx.fill();}
      this.ctx.fillStyle='#ffef75';this.ctx.fillRect(40+attack*10,-57+crouch,7,4);
    } else if (enemy.type === 'crawler') {
      // Buffet Crawler: a living serving cart that hoards every plate.
      this.ctx.strokeStyle='#32182d';this.ctx.lineWidth=9;this.ctx.lineCap='round';this.ctx.beginPath();
      for(let i=-2;i<=2;i+=1){this.ctx.moveTo(i*18,-26);this.ctx.lineTo(i*23+pulse*3,-2);}this.ctx.stroke();
      this.ctx.fillStyle='#6d294f';this.roundRect(-58,-63,116,45,16);this.ctx.fill();
      this.ctx.fillStyle='#b94f73';this.roundRect(-46,-72,92,20,8);this.ctx.fill();
      this.ctx.strokeStyle='#f4d28d';this.ctx.lineWidth=3;for(let i=-1;i<=1;i+=1){this.ctx.beginPath();this.ctx.ellipse(i*29,-74-Math.abs(i)*5,18,5,0,0,Math.PI*2);this.ctx.stroke();}
      this.ctx.fillStyle='#170b16';this.ctx.beginPath();this.ctx.ellipse(attack?18:0,-42,attack?35:23,10,0,0,Math.PI*2);this.ctx.fill();
      this.ctx.fillStyle='#f9e9d1';for(let i=-2;i<=2;i+=1)this.ctx.fillRect(i*9-2,-48,4,7);
    } else if (enemy.type === 'siren') {
      // Velvet Blade Dancer: a fast melee silhouette with readable twin arcs.
      const lean = attack ? -5 : pulse;
      this.ctx.strokeStyle='#201623';this.ctx.lineWidth=9;this.ctx.beginPath();this.ctx.moveTo(-8,-32);this.ctx.lineTo(-14+lean,-2);this.ctx.moveTo(8,-32);this.ctx.lineTo(15-lean,-2);this.ctx.stroke();
      this.ctx.fillStyle='#59224f';this.ctx.beginPath();this.ctx.moveTo(-22,-72);this.ctx.lineTo(19,-70);this.ctx.lineTo(26,-31);this.ctx.lineTo(-18,-31);this.ctx.closePath();this.ctx.fill();
      this.ctx.fillStyle='#b66a73';this.ctx.beginPath();this.ctx.arc(0,-83,14,0,Math.PI*2);this.ctx.fill();
      this.ctx.fillStyle='#29172e';this.ctx.beginPath();this.ctx.arc(-3,-88,17,Math.PI,Math.PI*2);this.ctx.fill();
      this.ctx.strokeStyle='#42e8f5';this.ctx.shadowColor='#42e8f5';this.ctx.shadowBlur=10;this.ctx.lineWidth=4;
      this.ctx.beginPath();this.ctx.moveTo(-15,-62);this.ctx.lineTo(attack?-54:-35,attack?-28:-43);this.ctx.moveTo(15,-61);this.ctx.lineTo(attack?58:38,attack?-40:-47);this.ctx.stroke();
    } else if (enemy.type === 'brute') {
      // Bottomless Bartender: crisp white shirt, endless bottle, floor-length apron.
      const windup = attack ? 12 : 0;
      this.ctx.strokeStyle='#281922';this.ctx.lineWidth=15;this.ctx.lineCap='round';this.ctx.beginPath();this.ctx.moveTo(-27,-76);this.ctx.lineTo(-47-windup,-42);this.ctx.moveTo(27,-76);this.ctx.lineTo(48+windup,-51);this.ctx.stroke();
      this.ctx.fillStyle='#eee2d6';this.roundRect(-50,-112,100,83,24);this.ctx.fill();
      this.ctx.fillStyle='#251923';this.ctx.beginPath();this.ctx.moveTo(-38,-106);this.ctx.lineTo(0,-71);this.ctx.lineTo(38,-106);this.ctx.lineTo(32,-33);this.ctx.lineTo(-32,-33);this.ctx.closePath();this.ctx.fill();
      this.ctx.fillStyle='#6f3046';this.ctx.fillRect(-34,-38,68,38);
      this.ctx.fillStyle='#a96255';this.ctx.beginPath();this.ctx.arc(0,-125,31,0,Math.PI*2);this.ctx.fill();
      this.ctx.fillStyle='#2a1824';this.ctx.beginPath();this.ctx.arc(-5,-135,32,Math.PI,Math.PI*2);this.ctx.lineTo(30,-117);this.ctx.lineTo(8,-122);this.ctx.fill();
      this.ctx.fillStyle='#ffc75a';this.ctx.fillRect(8,-128,10,5);
      this.ctx.fillStyle='#50e0df';this.ctx.shadowColor='#50e0df';this.ctx.shadowBlur=12;this.roundRect(43+windup,-76,13,40,5);this.ctx.fill();this.ctx.fillStyle='#f5ffff';this.ctx.fillRect(46+windup,-84,7,10);
      this.ctx.strokeStyle='#ffc75a';this.ctx.lineWidth=3;this.ctx.beginPath();this.ctx.ellipse(-48-windup,-40,18,7,0,0,Math.PI*2);this.ctx.stroke();
    } else if (enemy.type === 'warden') {
      // Belladonna: appetite made regal, with dress tiers that echo open mouths.
      const breathe = 1 + pulse * .018; this.ctx.scale(breathe, 1);
      this.ctx.shadowColor='#ff4f9a';this.ctx.shadowBlur=18;this.ctx.fillStyle='#3a1028';
      this.ctx.beginPath();this.ctx.moveTo(-66,-135);this.ctx.quadraticCurveTo(-86,-70,-72,0);this.ctx.lineTo(72,0);this.ctx.quadraticCurveTo(86,-70,66,-135);this.ctx.closePath();this.ctx.fill();
      this.ctx.fillStyle='#8e2457';for(let tier=0;tier<3;tier+=1){const y=-85+tier*27;const w=56+tier*9;this.ctx.beginPath();this.ctx.ellipse(0,y,w,14,0,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#1a0914';this.ctx.beginPath();this.ctx.ellipse(0,y+2,w*.72,6,0,0,Math.PI*2);this.ctx.fill();this.ctx.fillStyle='#8e2457';}
      this.ctx.fillStyle='#b94f72';this.roundRect(-51,-166,102,62,26);this.ctx.fill();
      this.ctx.fillStyle='#b96f69';this.ctx.beginPath();this.ctx.arc(0,-190,35,0,Math.PI*2);this.ctx.fill();
      this.ctx.fillStyle='#281123';this.ctx.beginPath();this.ctx.arc(-4,-202,39,Math.PI,Math.PI*2);this.ctx.lineTo(43,-180);this.ctx.lineTo(10,-187);this.ctx.fill();
      this.ctx.fillStyle='#ffd1e4';this.ctx.fillRect(9,-194,12,5);
      this.ctx.strokeStyle='#d43d82';this.ctx.lineWidth=13;this.ctx.lineCap='round';this.ctx.beginPath();this.ctx.moveTo(-43,-143);this.ctx.lineTo(-77-attack*18,-91);this.ctx.moveTo(43,-143);this.ctx.lineTo(77+attack*18,-91);this.ctx.stroke();
      this.ctx.strokeStyle='#ff90c5';this.ctx.lineWidth=3;this.ctx.beginPath();this.ctx.arc(0,-186,54,Math.PI*1.05,Math.PI*1.95);this.ctx.stroke();
      for(let i=0;i<5;i+=1){const angle=-2.8+i*.3;this.ctx.beginPath();this.ctx.moveTo(Math.cos(angle)*54,-186+Math.sin(angle)*54);this.ctx.lineTo(Math.cos(angle)*68,-186+Math.sin(angle)*68);this.ctx.stroke();}
    }
    this.ctx.restore();
    if (!this.isMajorType(enemy.type) && enemy.type !== 'dummy' && enemy.health < enemy.maxHealth) this.drawSmallHealth(enemy);
    this.drawEnemyTelegraph(enemy);
  }

  private drawEliteAura(enemy: Enemy): void {
    const colors = {frenzied:'#ff365d',armored:'#45dfff',volatile:'#ff8a32'} as const;
    const color = colors[enemy.eliteModifier!];
    const pulse=.5+.5*Math.sin(this.time*6.5+enemy.id);
    this.ctx.save();
    const glow=this.ctx.createRadialGradient(centerX(enemy),centerY(enemy),6,centerX(enemy),centerY(enemy),Math.max(70,enemy.w*1.2));
    glow.addColorStop(0,`${color}${Math.round((.24+pulse*.12)*255).toString(16).padStart(2,'0')}`); glow.addColorStop(1,`${color}00`);
    this.ctx.fillStyle=glow; this.ctx.fillRect(enemy.x-55,enemy.y-55,enemy.w+110,enemy.h+110);
    this.ctx.fillStyle=color; this.ctx.shadowColor=color; this.ctx.shadowBlur=14;
    for(let i=0;i<3;i+=1){const angle=this.time*(enemy.eliteModifier==='frenzied'?3.4:1.7)+i*Math.PI*2/3+enemy.id;const x=centerX(enemy)+Math.cos(angle)*(enemy.w*.58+9);const y=centerY(enemy)+Math.sin(angle)*(enemy.h*.42+5);const size=2+pulse*2;this.ctx.globalAlpha=.55+pulse*.3;this.ctx.fillRect(x-size,y-size,size*2,size*2);}
    this.ctx.restore();
  }

  private drawDeepDivePowerAura(enemy:Enemy):void{
    const colors:Record<NonNullable<Enemy['deepDivePowers']>[number],string>={frenzied:'#ff365d',armored:'#45dfff',volatile:'#ff9c35',homing:'#c96cff',summoner:'#7dff83'};
    const powers=enemy.deepDivePowers??[];const pulse=.55+.45*Math.sin(this.time*5+enemy.id);this.ctx.save();
    const glow=this.ctx.createRadialGradient(centerX(enemy),centerY(enemy),8,centerX(enemy),centerY(enemy),Math.max(95,enemy.w*1.35));glow.addColorStop(0,`${colors[powers[0]]}40`);glow.addColorStop(1,`${colors[powers[0]]}00`);this.ctx.fillStyle=glow;this.ctx.fillRect(enemy.x-80,enemy.y-80,enemy.w+160,enemy.h+160);
    powers.forEach((power,index)=>{const angle=this.time*(1.3+index*.15)+index*Math.PI*2/powers.length;const x=centerX(enemy)+Math.cos(angle)*(enemy.w*.62+20),y=centerY(enemy)+Math.sin(angle)*(enemy.h*.48+12);this.ctx.globalAlpha=.65+pulse*.3;this.ctx.fillStyle=colors[power];this.ctx.shadowColor=colors[power];this.ctx.shadowBlur=15;this.ctx.beginPath();this.ctx.arc(x,y,4+index*.35,0,Math.PI*2);this.ctx.fill();});this.ctx.restore();
  }

  private drawDeepDivePowerIdentifier(enemy:Enemy):void{
    const powers=enemy.deepDivePowers??[];this.ctx.save();this.ctx.textAlign='center';this.ctx.font='900 10px Barlow Condensed';this.ctx.fillStyle='#f4eaff';this.ctx.shadowColor='#a85cff';this.ctx.shadowBlur=8;this.ctx.fillText(`DEEP ${powers.map(power=>power.slice(0,3).toUpperCase()).join(' · ')}`,centerX(enemy),Math.max(18,enemy.y-22));this.ctx.restore();
  }

  private drawEliteIdentifier(enemy: Enemy): void {
    const modifier = enemy.eliteModifier!;
    const colors = { frenzied:'#ff365d', armored:'#45dfff', volatile:'#ff9c35' } as const;
    const color = colors[modifier]; const cx = centerX(enemy); const cy = centerY(enemy);
    const pulse = .5 + .5 * Math.sin(this.time * (modifier === 'frenzied' ? 13 : 7) + enemy.id);
    this.ctx.save(); this.ctx.translate(cx, cy); this.ctx.strokeStyle = color; this.ctx.fillStyle = color;
    this.ctx.lineCap = 'round'; this.ctx.lineJoin = 'round'; this.ctx.shadowColor = color; this.ctx.shadowBlur = 10 + pulse * 9;
    if (modifier === 'frenzied') {
      // Three razor chevrons and trailing slash marks remain recognizable in
      // monochrome, while the red pulse communicates increased cadence.
      this.ctx.lineWidth = 3.5;
      for (let i = 0; i < 3; i += 1) {
        const y = -enemy.h * .58 + i * 11; const x = -enemy.w * .64 - i * 4 - pulse * 6;
        this.ctx.globalAlpha = .95 - i * .2; this.ctx.beginPath(); this.ctx.moveTo(x - 13, y - 5); this.ctx.lineTo(x, y); this.ctx.lineTo(x - 13, y + 5); this.ctx.stroke();
      }
      this.ctx.globalAlpha = .35 + pulse * .35; this.ctx.lineWidth = 2;
      for (let i = 0; i < 3; i += 1) { const y = -enemy.h * .08 + i * 12; this.ctx.beginPath(); this.ctx.moveTo(-enemy.w * .78 - 22 - i * 6, y); this.ctx.lineTo(-enemy.w * .58 - i * 3, y - 7); this.ctx.stroke(); }
    } else if (modifier === 'armored') {
      // Segmented hex plates expose armor state without relying on cyan alone.
      const plates = Math.max(0, Math.min(5, Math.ceil(enemy.eliteArmor ?? 0))); this.ctx.lineWidth = 2.5;
      for (let i = 0; i < 5; i += 1) {
        const angle = -Math.PI * .82 + i * Math.PI * .41; const radiusX = enemy.w * .68 + 13; const radiusY = enemy.h * .44 + 10;
        const x = Math.cos(angle) * radiusX; const y = Math.sin(angle) * radiusY;
        this.ctx.globalAlpha = i < plates ? .9 : .18; this.ctx.beginPath();
        for (let p = 0; p < 6; p += 1) { const a = p / 6 * Math.PI * 2; const px = x + Math.cos(a) * 7; const py = y + Math.sin(a) * 7; if (p === 0) this.ctx.moveTo(px, py); else this.ctx.lineTo(px, py); }
        this.ctx.closePath(); if (i < plates) { this.ctx.fillStyle = `${color}55`; this.ctx.fill(); } this.ctx.stroke();
      }
      this.ctx.globalAlpha = .28 + pulse * .15; this.ctx.setLineDash([7,5]); this.ctx.beginPath(); this.ctx.ellipse(0, 0, enemy.w * .72 + 11, enemy.h * .47 + 12, 0, 0, Math.PI * 2); this.ctx.stroke(); this.ctx.setLineDash([]);
    } else {
      // Volatile enemies carry an unmistakable fuse/core with radial warning
      // ticks. The ring accelerates visually once the death blast is armed.
      const armed = enemy.volatileArmed ? 1 : 0; const radius = 12 + pulse * 5 + armed * 4;
      this.ctx.globalAlpha = .82; this.ctx.lineWidth = 3; this.ctx.beginPath(); this.ctx.arc(0, 1, radius, 0, Math.PI * 2); this.ctx.stroke();
      this.ctx.globalAlpha = .42 + pulse * .35; this.ctx.beginPath(); this.ctx.arc(0, 1, radius * .48, 0, Math.PI * 2); this.ctx.fill();
      this.ctx.globalAlpha = .92; this.ctx.lineWidth = 2.5;
      for (let i = 0; i < 8; i += 1) { const angle = i / 8 * Math.PI * 2 + this.time * (armed ? 2.8 : .7); this.ctx.beginPath(); this.ctx.moveTo(Math.cos(angle) * (radius + 5), 1 + Math.sin(angle) * (radius + 5)); this.ctx.lineTo(Math.cos(angle) * (radius + 13 + pulse * 3), 1 + Math.sin(angle) * (radius + 13 + pulse * 3)); this.ctx.stroke(); }
      this.ctx.beginPath(); this.ctx.moveTo(4, -radius + 1); this.ctx.quadraticCurveTo(11, -radius - 11, 18, -radius - 7); this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private drawLateCommonEnemySprite(enemy: Enemy): boolean {
    const rows: Array<{ depth: number; types: EnemyType[]; heights: number[] }> = [
      { depth: 4, types: ['jackpotGremlin','railWisp','cardDealer','diceHound','slotMimic','jinxCroupier'], heights: [260,300,340,340,400,370] },
      { depth: 5, types: ['choirShard','preservationWisp','icePenitent','frostHound','reliquaryKnight','glassDeacon'], heights: [300,300,330,340,410,370] },
      { depth: 6, types: ['luggageImp','keyholeWisp','sleepwalker','hallwayHound','bellhopMimic','wakeUpCaller'], heights: [270,300,340,340,390,370] },
      { depth: 7, types: ['mirrorPunk','prismWisp','facelessStriker','glassHound','echoSniper','reflectionKnight'], heights: [290,300,350,340,380,420] },
      { depth: 8, types: ['hollowSuccubus','decreeWisp','charmAcolyte','portalHound','throneLegionary','bloodCantor'], heights: [340,300,350,340,420,380] },
      { depth: 9, types: ['hollowShade'], heights: [320] },
    ];
    const group = rows.find((candidate) => candidate.types.includes(enemy.type));
    if (!group) return false;
    const atlas = this.lateEnemyAtlases.get(group.depth);
    if (!atlas?.complete || atlas.naturalWidth <= 0) return false;
    const row = group.types.indexOf(enemy.type);
    const frame = enemy.attackPoseTime > 0 ? 1 : 0;
    const drawHeight = group.heights[row] ?? 330;
    const bob = ['railWisp','choirShard','preservationWisp','keyholeWisp','prismWisp','decreeWisp','hollowShade'].includes(enemy.type) ? Math.sin(enemy.timer * 4) * 5 : 0;
    this.ctx.save();
    this.ctx.globalAlpha = enemy.invulnerable > 0 ? .76 : enemy.dead ? clamp(enemy.deathTime / .9, 0, 1) : 1;
    this.ctx.fillStyle = 'rgba(0,0,0,.3)';
    this.ctx.beginPath(); this.ctx.ellipse(centerX(enemy), enemy.y + enemy.h + 2, Math.max(22, enemy.w * .48), 6, 0, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.translate(centerX(enemy), enemy.y + enemy.h + bob);
    this.ctx.scale(enemy.facing, 1);
    this.ctx.drawImage(atlas, frame * 512, row * 512, 512, 512, -drawHeight / 2, -drawHeight + 10, drawHeight, drawHeight);
    this.ctx.restore();
    return true;
  }

  private drawLateEncounterSprite(enemy: Enemy): boolean {
    const encounters: Partial<Record<EnemyType, { depth: number; boss: boolean; height: number }>> = {
      ladyLuckless: { depth: 4, boss: false, height: 390 }, calyptraBoss: { depth: 4, boss: true, height: 500 },
      memoryGolem: { depth: 5, boss: false, height: 440 }, isoldeBoss: { depth: 5, boss: true, height: 510 },
      dreamGirl: { depth: 6, boss: false, height: 390 }, somniaBoss: { depth: 6, boss: true, height: 510 },
      betterMilo: { depth: 7, boss: false, height: 245 }, vesperaBoss: { depth: 7, boss: true, height: 510 },
      lilithBoss: { depth: 8, boss: true, height: 540 },
      bossRushHerald: { depth: 9, boss: false, height: 410 }, hollowBoss: { depth: 9, boss: true, height: 315 },
    };
    const definition = encounters[enemy.type];
    if (!definition) return false;
    const atlas = this.lateEncounterAtlases.get(definition.depth);
    if (!atlas?.complete || atlas.naturalWidth <= 0) return false;
    let row = definition.boss ? 2 : 0;
    let column = enemy.attackPoseTime > 0 ? 1 : 0;
    if (enemy.dead) { row = definition.boss ? 3 : 1; column = 1; }
    else if (definition.boss && enemy.phase > 0) { row = 3; column = 0; }
    const drawHeight = definition.height;
    this.ctx.save();
    this.ctx.globalAlpha = (enemy.invulnerable > 0 ? .76 : 1) * (enemy.dead ? clamp(enemy.deathTime / .9, 0, 1) : 1);
    this.ctx.fillStyle = 'rgba(0,0,0,.38)';
    this.ctx.beginPath(); this.ctx.ellipse(centerX(enemy), enemy.y + enemy.h + 3, Math.max(35, enemy.w * .55), 9, 0, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.translate(centerX(enemy), enemy.y + enemy.h);
    this.ctx.scale(enemy.facing, 1);
    this.ctx.drawImage(atlas, column * 512, row * 512, 512, 512, -drawHeight / 2, -drawHeight + 10, drawHeight, drawHeight);
    this.ctx.restore();
    return true;
  }

  private drawLevelOneEnemySprite(enemy: Enemy): void {
    const rows: Partial<Record<EnemyType, number>> = { imp: 0, floater: 1, succubus: 2, hellhound: 3, crawler: 4, siren: 5 };
    // Full-cell draw heights preserve the approved on-screen silhouette size
    // after moving each pose into a larger padded cell. Per-frame feet remove
    // the old floating and row-bleed artifacts without changing hitboxes.
    const renderHeights: Partial<Record<EnemyType, number>> = { imp: 252, floater: 342, succubus: 322, hellhound: 350, crawler: 405, siren: 280 };
    const feet: Partial<Record<EnemyType,[number,number]>> = {
      imp:[477,487],floater:[449,435],succubus:[455,450],hellhound:[392,389],crawler:[356,350],siren:[374,367],
    };
    const row = rows[enemy.type] ?? 0;
    const frame = enemy.attackPoseTime > 0 ? 1 : 0;
    const columns = 2; const atlasRows = 6;
    const cellW = this.levelOneEnemyAtlas.naturalWidth / columns;
    const cellH = this.levelOneEnemyAtlas.naturalHeight / atlasRows;
    const drawH = renderHeights[enemy.type] ?? 180;
    const drawScale = drawH / cellH;
    const drawW = cellW * drawScale;
    const feetAnchorY = (feet[enemy.type]?.[frame] ?? cellH) * drawScale;
    const bob = enemy.type === 'floater' ? Math.sin(enemy.timer * 4) * 5 : 0;
    this.ctx.save();
    this.ctx.globalAlpha = enemy.invulnerable > 0 ? .76 : enemy.dead ? clamp(enemy.deathTime / .9, 0, 1) : 1;
    this.ctx.fillStyle = enemy.type === 'floater' ? 'rgba(121,77,174,.18)' : 'rgba(0,0,0,.3)';
    this.ctx.beginPath();
    this.ctx.ellipse(centerX(enemy), enemy.y + enemy.h + 2, Math.max(22, enemy.w * .48), enemy.type === 'floater' ? 4 : 6, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.translate(centerX(enemy), enemy.y + enemy.h + bob);
    this.ctx.scale(enemy.facing, 1);
    this.ctx.drawImage(this.levelOneEnemyAtlas, frame * cellW, row * cellH, cellW, cellH, -drawW / 2, -feetAnchorY, drawW, drawH);
    this.ctx.restore();
  }

  private drawLevelTwoEnemySprite(enemy: Enemy): void {
    const rows: Partial<Record<EnemyType,number>>={drownedFan:0,chorusWisp:1,courtCantor:2,reefHound:3,bubbleCrab:4,spotlightDancer:5};
    const renderHeights: Partial<Record<EnemyType,number>>={drownedFan:337,chorusWisp:318,courtCantor:411,reefHound:308,bubbleCrab:352,spotlightDancer:533};
    const feet: Partial<Record<EnemyType,[number,number]>>={drownedFan:[420,426],chorusWisp:[409,422],courtCantor:[397,429],reefHound:[316,435],bubbleCrab:[283,430],spotlightDancer:[331,328]};
    const row=rows[enemy.type]??0,frame=enemy.attackPoseTime>0?1:0;
    const columns=2,atlasRows=6,cellW=this.levelTwoEnemyAtlas.naturalWidth/columns,cellH=this.levelTwoEnemyAtlas.naturalHeight/atlasRows;
    const drawH=renderHeights[enemy.type]??185,scale=drawH/cellH,drawW=cellW*scale,feetY=(feet[enemy.type]?.[frame]??cellH)*scale;
    const bob=enemy.type==='chorusWisp'?Math.sin(enemy.timer*4)*5:0;
    this.ctx.save();this.ctx.globalAlpha=enemy.invulnerable>0?.76:enemy.dead?clamp(enemy.deathTime/.9,0,1):1;
    this.ctx.fillStyle=enemy.type==='chorusWisp'?'rgba(63,231,240,.16)':'rgba(0,0,0,.3)';this.ctx.beginPath();this.ctx.ellipse(centerX(enemy),enemy.y+enemy.h+2,Math.max(23,enemy.w*.48),enemy.type==='chorusWisp'?4:6,0,0,Math.PI*2);this.ctx.fill();
    this.ctx.translate(centerX(enemy),enemy.y+enemy.h+bob);this.ctx.scale(enemy.facing,1);
    this.ctx.drawImage(this.levelTwoEnemyAtlas,frame*cellW,row*cellH,cellW,cellH,-drawW/2,-feetY,drawW,drawH);this.ctx.restore();
  }

  private drawLevelThreeEnemySprite(enemy: Enemy): void {
    const rows:Partial<Record<EnemyType,number>>={thornStalker:0,sporeMaw:1,vineLurker:2,razorBoar:3,rootMaw:4,thornArcher:5};
    const renderHeights:Partial<Record<EnemyType,number>>={thornStalker:305,sporeMaw:315,vineLurker:385,razorBoar:400,rootMaw:395,thornArcher:355};
    const feet:Partial<Record<EnemyType,number>>={thornStalker:370,sporeMaw:370,vineLurker:352,razorBoar:312,rootMaw:300,thornArcher:318};
    const row=rows[enemy.type]??0,frame=enemy.attackPoseTime>0?1:0;
    const columns=2,atlasRows=6,cellW=this.levelThreeEnemyAtlas.naturalWidth/columns,cellH=this.levelThreeEnemyAtlas.naturalHeight/atlasRows;
    const drawH=renderHeights[enemy.type]??330,scale=drawH/cellH,drawW=cellW*scale,feetY=(feet[enemy.type]??cellH)*scale;
    this.ctx.save();this.ctx.globalAlpha=enemy.invulnerable>0?.76:enemy.dead?clamp(enemy.deathTime/.9,0,1):1;
    this.ctx.fillStyle='rgba(16,7,5,.36)';this.ctx.beginPath();this.ctx.ellipse(centerX(enemy),enemy.y+enemy.h+2,Math.max(24,enemy.w*.5),7,0,0,Math.PI*2);this.ctx.fill();
    this.ctx.translate(centerX(enemy),enemy.y+enemy.h);this.ctx.scale(enemy.facing,1);
    this.ctx.drawImage(this.levelThreeEnemyAtlas,frame*cellW,row*cellH,cellW,cellH,-drawW/2,-feetY,drawW,drawH);this.ctx.restore();
  }

  private drawLevelOneBossSprite(enemy: Enemy, atlas: HTMLImageElement, columns: number, frame: number, drawH: number, sourceFeetY: number): void {
    const cellW = atlas.naturalWidth / columns;
    const cellH = atlas.naturalHeight;
    const drawScale = drawH / cellH;
    const drawW = cellW * drawScale;
    const feetAnchorY = sourceFeetY * drawScale;
    const deathFade = enemy.dead ? clamp(enemy.deathTime / .9, 0, 1) : 1;
    this.ctx.save();
    this.ctx.globalAlpha = (enemy.invulnerable > 0 ? .76 : 1) * deathFade;
    this.ctx.fillStyle = 'rgba(0,0,0,.38)';
    this.ctx.beginPath(); this.ctx.ellipse(centerX(enemy), enemy.y + enemy.h + 3, enemy.type === 'warden' || enemy.type === 'nerissa' || enemy.type === 'roxyne' ? 78 : enemy.type === 'fanChampion' || enemy.type === 'perfectPrey' ? 62 : 48, 9, 0, 0, Math.PI * 2); this.ctx.fill();
    this.ctx.translate(centerX(enemy), enemy.y + enemy.h);
    this.ctx.scale(enemy.facing, 1);
    this.ctx.drawImage(atlas, frame * cellW, 0, cellW, cellH, -drawW / 2, -feetAnchorY, drawW, drawH);
    this.ctx.restore();
  }

  private drawEnemyTelegraph(enemy: Enemy): void {
    if (enemy.dead || enemy.attackTimer <= 0 || enemy.attackTimer > .32) return;
    const pulse = 1 + Math.sin(this.time * 30) * .12;
    this.ctx.save(); this.ctx.translate(centerX(enemy), enemy.y - 18); this.ctx.scale(pulse, pulse);
    this.ctx.fillStyle = '#ffdf62'; this.ctx.shadowColor = '#ff5a3d'; this.ctx.shadowBlur = 12;
    this.ctx.beginPath(); this.ctx.moveTo(0, -14); this.ctx.lineTo(13, 10); this.ctx.lineTo(-13, 10); this.ctx.closePath(); this.ctx.fill();
    this.ctx.fillStyle = '#2a1115'; this.ctx.font = '900 17px Barlow Condensed'; this.ctx.textAlign = 'center'; this.ctx.fillText('!', 0, 7); this.ctx.restore();
  }

  private drawSmallHealth(enemy: Enemy): void {
    this.ctx.fillStyle = 'rgba(0,0,0,.7)';
    this.ctx.fillRect(enemy.x, enemy.y - 10, enemy.w, 4);
    this.ctx.fillStyle = '#ff5269';
    this.ctx.fillRect(enemy.x, enemy.y - 10, enemy.w * clamp(enemy.health / enemy.maxHealth, 0, 1), 4);
  }

  private spawnArcaneImpact(x: number, y: number, color: string, accent: string, critical: boolean): void {
    const maxImpacts = this.reducedVfx ? 9 : 22;
    if (this.arcaneImpacts.length >= maxImpacts) this.arcaneImpacts.splice(0, this.arcaneImpacts.length - maxImpacts + 1);
    const maxLife = critical ? .34 : .24;
    this.arcaneImpacts.push({ id:this.entityId++, x, y, life:maxLife, maxLife, radius:critical ? 54 : 34, color, accent, critical });
  }

  private drawArcaneImpact(impact: ArcaneImpact): void {
    const progress = 1 - clamp(impact.life / impact.maxLife, 0, 1); const alpha = Math.sin(progress * Math.PI); const radius = impact.radius * (.25 + progress * .92);
    const shardCount = this.reducedVfx ? 5 : impact.critical ? 12 : 8; const rotation = impact.id * .73 + progress * (impact.critical ? 1.25 : .72);
    this.ctx.save(); this.ctx.translate(impact.x, impact.y); this.ctx.rotate(rotation); this.ctx.globalCompositeOperation = 'screen'; this.ctx.globalAlpha = alpha;
    this.ctx.shadowColor = impact.color; this.ctx.shadowBlur = this.reducedVfx ? 8 : impact.critical ? 30 : 18;
    const core = this.ctx.createRadialGradient(0,0,0,0,0,radius*.74); core.addColorStop(0,'#fff'); core.addColorStop(.16,impact.accent); core.addColorStop(.48,impact.color); core.addColorStop(1,`${impact.color}00`);
    this.ctx.fillStyle=core; this.ctx.beginPath(); this.ctx.arc(0,0,radius*.74,0,Math.PI*2); this.ctx.fill();
    this.ctx.strokeStyle=impact.accent; this.ctx.lineWidth=impact.critical?4:2.5; this.ctx.beginPath(); this.ctx.arc(0,0,radius,0,Math.PI*2); this.ctx.stroke();
    this.ctx.globalAlpha=alpha*.72; this.ctx.strokeStyle='#fff'; this.ctx.lineWidth=1.5; this.ctx.setLineDash([impact.critical?9:6,impact.critical?8:6]); this.ctx.beginPath(); this.ctx.arc(0,0,radius*.72,0,Math.PI*2); this.ctx.stroke(); this.ctx.setLineDash([]);
    for(let i=0;i<shardCount;i+=1){const angle=i/shardCount*Math.PI*2+(i%2)*.08;const start=radius*(.54+(i%3)*.07);const length=radius*(.36+(i%2)*.22)*(impact.critical?1.18:1);this.ctx.save();this.ctx.rotate(angle);this.ctx.translate(start,0);this.ctx.fillStyle=i%3===0?'#fff':i%2?impact.accent:impact.color;this.ctx.beginPath();this.ctx.moveTo(length,0);this.ctx.lineTo(0,3.2);this.ctx.lineTo(-length*.18,0);this.ctx.lineTo(0,-3.2);this.ctx.closePath();this.ctx.fill();this.ctx.restore();}
    this.ctx.restore();
  }

  private drawProjectile(projectile: Projectile): void {
    if((projectile.spawnDelay??0)>0)return;
    this.ctx.save();
    this.ctx.shadowColor = projectile.color;
    this.ctx.shadowBlur = projectile.explosive ? 26 : 18;
    if (projectile.explosive) {
      this.ctx.fillStyle = projectile.color;
      this.ctx.beginPath();
      this.ctx.translate(centerX(projectile), centerY(projectile));
      this.ctx.rotate(this.time * 5);
      for (let i = 0; i < 12; i += 1) {
        const angle = i / 12 * Math.PI * 2;
        const radius = i % 2 ? projectile.radius * .65 : projectile.radius;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) this.ctx.moveTo(x, y); else this.ctx.lineTo(x, y);
      }
      this.ctx.closePath();
      this.ctx.fill();
    } else if (projectile.owner === 'player') {
      const angle = Math.atan2(projectile.vy, projectile.vx);
      const radius = projectile.radius;
      this.ctx.translate(centerX(projectile), centerY(projectile));
      this.ctx.rotate(angle);
      this.drawDominantProjectileShape(projectile,radius);
    } else if (projectile.songNote) {
      const pulse=1+Math.sin(this.time*12+projectile.id)*.12;
      this.ctx.translate(centerX(projectile),centerY(projectile));this.ctx.scale(pulse,pulse);
      this.ctx.fillStyle='#d9ffff';this.ctx.font='900 27px Barlow Condensed';this.ctx.textAlign='center';this.ctx.textBaseline='middle';this.ctx.fillText('♫',0,1);
      this.ctx.strokeStyle='#56edf4';this.ctx.lineWidth=2;this.ctx.setLineDash([4,4]);this.ctx.beginPath();this.ctx.arc(0,0,projectile.radius+5,0,Math.PI*2);this.ctx.stroke();
    } else {
      this.ctx.fillStyle = projectile.color;
      this.ctx.beginPath(); this.ctx.arc(centerX(projectile), centerY(projectile), projectile.radius, 0, Math.PI * 2); this.ctx.fill();
    }
    this.ctx.restore();
  }

  private drawProjectilesWithBudget():void {
    const detailBudget=this.reducedVfx?PROJECTILE_DETAIL_BUDGET.reduced:PROJECTILE_DETAIL_BUDGET.normal;
    const plan=planProjectilePresentation(this.projectiles,detailBudget);
    for(const projectile of plan.detailed)this.drawProjectile(projectile);
    for(const projectile of plan.simplified)this.drawSimplifiedHostileProjectile(projectile);
    if(plan.simplified.length>0||plan.suppressedPlayerCount>0)this.telemetry.recordPresentationConsolidation(performance.now(),this.screen,{
      entity:'projectiles',logicalCount:plan.logicalCount,detailedCount:plan.detailed.length,simplifiedCount:plan.simplified.length,suppressedCount:plan.suppressedPlayerCount,
    });
  }

  private drawSimplifiedHostileProjectile(projectile:Projectile):void {
    if((projectile.spawnDelay??0)>0)return;
    this.ctx.save();
    this.ctx.fillStyle=projectile.color;
    this.ctx.strokeStyle=projectile.songNote?'#d9ffff':'rgba(255,255,255,.78)';
    this.ctx.lineWidth=1.5;
    this.ctx.beginPath();
    this.ctx.arc(centerX(projectile),centerY(projectile),Math.max(3,projectile.radius),0,Math.PI*2);
    this.ctx.fill();this.ctx.stroke();this.ctx.restore();
  }

  private drawDominantProjectileShape(projectile:Projectile,radius:number):void {
    const shape=projectile.primaryBoon?BOON_PROJECTILE_SHAPES[projectile.primaryBoon]:'flame';
    const accent=projectile.accentColor??this.arcaneCore(projectile.color);
    const flicker=Math.sin(this.time*31+projectile.id)*radius*.16;
    const path=(points:Array<[number,number]>)=>{this.ctx.beginPath();points.forEach(([x,y],index)=>index?this.ctx.lineTo(x*radius,y*radius):this.ctx.moveTo(x*radius,y*radius));this.ctx.closePath();};
    this.ctx.fillStyle=projectile.color;this.ctx.strokeStyle=accent;this.ctx.lineWidth=Math.max(1.5,radius*.16);
    if(shape==='orb'){this.ctx.beginPath();this.ctx.arc(0,0,radius,0,Math.PI*2);this.ctx.fill();this.ctx.beginPath();this.ctx.arc(0,0,radius*.64,0,Math.PI*2);this.ctx.stroke();}
    else if(shape==='boulder'){path([[1.1,0],[.62,.88],[-.4,1],[-1.08,.3],[-.82,-.72],[.2,-1]]);this.ctx.fill();this.ctx.stroke();this.ctx.beginPath();this.ctx.moveTo(-.45*radius,-.7*radius);this.ctx.lineTo(.05*radius,0);this.ctx.lineTo(-.35*radius,.72*radius);this.ctx.stroke();}
    else if(shape==='needle'){path([[1.85,0],[-.55,.38],[-1.25,0],[-.55,-.38]]);this.ctx.fill();this.ctx.stroke();}
    else if(shape==='seed'){this.ctx.save();this.ctx.rotate(this.time*5+projectile.id);this.ctx.beginPath();this.ctx.ellipse(0,0,radius*.72,radius,0,0,Math.PI*2);this.ctx.fill();for(let i=0;i<4;i+=1){this.ctx.rotate(Math.PI/2);this.ctx.beginPath();this.ctx.moveTo(0,-radius*.7);this.ctx.lineTo(radius*.42,-radius*1.25);this.ctx.stroke();}this.ctx.restore();}
    else if(shape==='spark'){this.ctx.lineWidth=Math.max(3,radius*.42);this.ctx.beginPath();this.ctx.moveTo(-radius*1.3,radius*.55);this.ctx.lineTo(-radius*.35,-radius*.22);this.ctx.lineTo(0,radius*.18);this.ctx.lineTo(radius*.65,-radius*.62);this.ctx.lineTo(radius*1.45,-radius*.1);this.ctx.stroke();}
    else if(shape==='shard'||shape==='crystal'){path(shape==='shard'?[[1.5,0],[0,.72],[-1.05,0],[0,-.72]]:[[1.25,0],[.2,1],[-.85,.35],[-.55,-.72],[.45,-1]]);this.ctx.fill();this.ctx.stroke();}
    else if(shape==='crescent'){this.ctx.beginPath();this.ctx.arc(0,0,radius,Math.PI*.35,Math.PI*1.65);this.ctx.quadraticCurveTo(radius*.2,0,radius*Math.cos(Math.PI*.35),radius*Math.sin(Math.PI*.35));this.ctx.fill();this.ctx.stroke();}
    else if(shape==='lance'){path([[1.9,0],[.7,.34],[-1.45,.2],[-1.45,-.2],[.7,-.34]]);this.ctx.fill();this.ctx.stroke();}
    else if(shape==='maw'){this.ctx.beginPath();this.ctx.moveTo(radius*1.25,0);this.ctx.quadraticCurveTo(0,-radius*1.15,-radius*1.15,-radius*.35);this.ctx.lineTo(-radius*.42,0);this.ctx.lineTo(-radius*1.15,radius*.35);this.ctx.quadraticCurveTo(0,radius*1.15,radius*1.25,0);this.ctx.fill();this.ctx.stroke();}
    else if(shape==='note'){this.ctx.beginPath();this.ctx.arc(-radius*.15,radius*.28,radius*.55,0,Math.PI*2);this.ctx.fill();this.ctx.fillRect(radius*.25,-radius*1.15,radius*.24,radius*1.45);this.ctx.beginPath();this.ctx.moveTo(radius*.38,-radius*1.05);this.ctx.quadraticCurveTo(radius*1.15,-radius*.75,radius*.85,-radius*.2);this.ctx.stroke();}
    else if(shape==='fang'){path([[1.55,0],[-.95,.85],[-.35,0],[-.95,-.85]]);this.ctx.fill();this.ctx.stroke();}
    else if(shape==='die'){this.ctx.save();this.ctx.rotate(Math.PI/4);this.ctx.fillRect(-radius*.72,-radius*.72,radius*1.44,radius*1.44);this.ctx.strokeRect(-radius*.72,-radius*.72,radius*1.44,radius*1.44);this.ctx.fillStyle=accent;for(const [x,y] of [[-.3,-.3],[.3,.3],[0,0]]){this.ctx.beginPath();this.ctx.arc(x*radius,y*radius,radius*.12,0,Math.PI*2);this.ctx.fill();}this.ctx.restore();}
    else if(shape==='loop'){this.ctx.lineWidth=Math.max(2,radius*.25);for(const y of [-.35,.35]){this.ctx.beginPath();this.ctx.ellipse(0,y*radius,radius*.95,radius*.52,0,0,Math.PI*2);this.ctx.stroke();}}
    else if(shape==='mirror'){path([[1.18,0],[0,1.05],[-1.18,0],[0,-1.05]]);this.ctx.fill();this.ctx.stroke();this.ctx.fillStyle=accent;path([[.52,0],[0,.47],[-.52,0],[0,-.47]]);this.ctx.fill();}
    else if(shape==='coin'){this.ctx.beginPath();this.ctx.arc(0,0,radius,0,Math.PI*2);this.ctx.fill();this.ctx.stroke();this.ctx.beginPath();this.ctx.arc(0,0,radius*.55,0,Math.PI*2);this.ctx.stroke();}
    else if(shape==='spiral'){this.ctx.lineWidth=Math.max(2.5,radius*.28);this.ctx.beginPath();for(let i=0;i<=22;i+=1){const t=i/22*Math.PI*2.2;const r=radius*(.14+i/25);const x=Math.cos(t)*r,y=Math.sin(t)*r;i?this.ctx.lineTo(x,y):this.ctx.moveTo(x,y);}this.ctx.stroke();}
    else if(shape==='drop'){this.ctx.beginPath();this.ctx.moveTo(radius*1.15,0);this.ctx.bezierCurveTo(radius*.3,-radius*1.2,-radius*.92,-radius*.82,-radius*.92,0);this.ctx.bezierCurveTo(-radius*.92,radius*.82,radius*.3,radius*1.2,radius*1.15,0);this.ctx.fill();this.ctx.stroke();}
    else if(shape==='halo'){this.ctx.lineWidth=Math.max(2,radius*.3);this.ctx.beginPath();this.ctx.ellipse(0,0,radius*1.15,radius*.68,0,0,Math.PI*2);this.ctx.stroke();this.ctx.fillStyle=accent;this.ctx.beginPath();this.ctx.arc(radius*.35,0,radius*.3,0,Math.PI*2);this.ctx.fill();}
    else {this.ctx.beginPath();this.ctx.moveTo(radius*1.55,0);this.ctx.quadraticCurveTo(radius*.6,-radius*1.15,-radius*.7,-radius*.72);this.ctx.quadraticCurveTo(-radius*1.35,-radius*.45,-radius*2.25-flicker,0);this.ctx.quadraticCurveTo(-radius*1.2,radius*.35,-radius*.65,radius*.78);this.ctx.quadraticCurveTo(radius*.55,radius*1.12,radius*1.55,0);this.ctx.fill();}
    for(const [index,id] of (projectile.attachedBoons??[]).slice(0,2).entries()){
      const side=index===0?-1:1;this.ctx.fillStyle=BOONS[id].color;this.ctx.beginPath();this.ctx.arc(-radius*.25,side*radius*1.05,radius*.2,0,Math.PI*2);this.ctx.fill();
    }
  }

  private drawGroundWave(wave: GroundWave): void {
    const alpha = clamp(wave.life / .24, 0, 1);
    this.ctx.save(); this.ctx.globalAlpha = alpha; this.ctx.translate(wave.facing > 0 ? wave.x : wave.x + wave.w, wave.y + wave.h / 2); this.ctx.scale(wave.facing, 1);
    const gradient = this.ctx.createLinearGradient(0, 0, wave.w, 0); gradient.addColorStop(0, '#18d7df33'); gradient.addColorStop(.45, '#42edf0dd'); gradient.addColorStop(1, '#d9ffffee');
    this.ctx.fillStyle = gradient; this.ctx.shadowColor = '#18d7df'; this.ctx.shadowBlur = 20;
    this.ctx.beginPath(); this.ctx.moveTo(0, 40);
    this.ctx.bezierCurveTo(28, 12, 45, -48, 84, -42); this.ctx.bezierCurveTo(112, -38, 118, -5, 138, -16);
    this.ctx.bezierCurveTo(126, 8, 120, 43, 80, 48); this.ctx.bezierCurveTo(45, 52, 24, 35, 0, 40); this.ctx.fill();
    this.ctx.strokeStyle = '#e8ffff'; this.ctx.lineWidth = 4; this.ctx.beginPath(); this.ctx.moveTo(38, 20); this.ctx.quadraticCurveTo(80, -22, 118, -6); this.ctx.stroke(); this.ctx.restore();
  }

  private drawLightning(effect: { x1: number; y1: number; x2: number; y2: number; life: number; maxLife: number; color: string }): void {
    const segments = 9;
    this.ctx.save();
    this.ctx.globalAlpha = clamp(effect.life / effect.maxLife, 0, 1);
    this.ctx.strokeStyle = effect.color;
    this.ctx.shadowColor = effect.color;
    this.ctx.shadowBlur = 24;
    this.ctx.lineWidth = 7;
    this.ctx.beginPath();
    this.ctx.moveTo(effect.x1, effect.y1);
    for (let i = 1; i < segments; i += 1) {
      const t = i / segments;
      const x = effect.x1 + (effect.x2 - effect.x1) * t + (Math.random() - .5) * 46;
      const y = effect.y1 + (effect.y2 - effect.y1) * t;
      this.ctx.lineTo(x, y);
    }
    this.ctx.lineTo(effect.x2, effect.y2);
    this.ctx.stroke();
    this.ctx.strokeStyle = '#fff'; this.ctx.lineWidth = 2; this.ctx.stroke();
    this.ctx.restore();
  }

  private drawGustEffect(effect:GustEffect): void {
    const progress=1-clamp(effect.life/effect.maxLife,0,1);const alpha=Math.sin(progress*Math.PI);const radius=effect.radius*(.08+progress*.92);
    this.ctx.save();this.ctx.translate(effect.x,effect.y);this.ctx.globalAlpha=alpha;this.ctx.strokeStyle=BOONS.zephyra.accentColor;this.ctx.shadowColor=BOONS.zephyra.color;this.ctx.shadowBlur=20;this.ctx.lineWidth=5;
    for(let i=0;i<4;i+=1){const r=radius*(.55+i*.15);this.ctx.beginPath();this.ctx.ellipse(0,0,r,35+i*9,0,0,Math.PI*2);this.ctx.stroke();}
    this.ctx.globalAlpha=alpha*.7;this.ctx.strokeStyle='#fff';this.ctx.lineWidth=2;for(const direction of [-1,1]){this.ctx.beginPath();this.ctx.moveTo(direction*32,-28);this.ctx.bezierCurveTo(direction*radius*.35,-70,direction*radius*.7,55,direction*radius,0);this.ctx.stroke();}
    this.ctx.restore();
  }

  private drawLightRay(effect:LightRayEffect): void {
    const progress=1-clamp(effect.life/effect.maxLife,0,1);const alpha=Math.sin(progress*Math.PI);const width=effect.radius*(.55+Math.sin(progress*Math.PI)*.45);
    this.ctx.save();this.ctx.globalCompositeOperation='screen';this.ctx.globalAlpha=alpha;
    const beam=this.ctx.createLinearGradient(effect.x-width,0,effect.x+width,0);beam.addColorStop(0,`${effect.color}00`);beam.addColorStop(.32,`${effect.color}99`);beam.addColorStop(.5,'#ffffff');beam.addColorStop(.68,`${effect.color}99`);beam.addColorStop(1,`${effect.color}00`);
    this.ctx.fillStyle=beam;this.ctx.shadowColor=effect.color;this.ctx.shadowBlur=30;this.ctx.fillRect(effect.x-width,-10,width*2,effect.y+90);
    this.ctx.strokeStyle='#fff';this.ctx.lineWidth=4;this.ctx.beginPath();this.ctx.moveTo(effect.x,0);this.ctx.lineTo(effect.x,effect.y+68);this.ctx.stroke();
    this.ctx.strokeStyle=effect.color;this.ctx.lineWidth=3;for(let i=0;i<3;i+=1){this.ctx.beginPath();this.ctx.ellipse(effect.x,effect.y,18+i*18+progress*20,7+i*5,0,0,Math.PI*2);this.ctx.stroke();}
    this.ctx.restore();
  }

  private drawPickup(pickup: Pickup): void {
    const bob = Math.sin(this.time * 5 + pickup.id) * 3;
    if (this.pickupAtlas.complete && this.pickupAtlas.naturalWidth > 0) {
      const frame = pickup.type === 'pizza' ? 0 : pickup.type === 'coffee' ? 1 : 2;
      const cellW = this.pickupAtlas.naturalWidth / 4;
      const cellH = this.pickupAtlas.naturalHeight;
      const drawSize = pickup.type === 'pizza' ? 72 : 66;
      this.ctx.save();
      this.ctx.translate(centerX(pickup), centerY(pickup) + bob);
      this.ctx.shadowColor = pickup.type === 'pizza' ? '#ffcf65' : pickup.type === 'coffee' ? '#b46cff' : '#8d6cff';
      this.ctx.shadowBlur = 18;
      this.ctx.drawImage(this.pickupAtlas, frame * cellW, 0, cellW, cellH, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      this.ctx.restore();
      return;
    }
    this.ctx.save();
    this.ctx.translate(centerX(pickup), centerY(pickup) + bob);
    this.ctx.shadowBlur = 16;
    if (pickup.type === 'pizza') {
      this.ctx.shadowColor = '#62e59b';
      this.ctx.fillStyle = '#ffc75a';
      this.ctx.beginPath(); this.ctx.moveTo(-11, -10); this.ctx.lineTo(12, -7); this.ctx.lineTo(-3, 12); this.ctx.closePath(); this.ctx.fill();
      this.ctx.strokeStyle = '#b65d35'; this.ctx.lineWidth = 4; this.ctx.beginPath(); this.ctx.moveTo(-11, -10); this.ctx.lineTo(12, -7); this.ctx.stroke();
      this.ctx.fillStyle = '#ff5269'; this.ctx.beginPath(); this.ctx.arc(1, -3, 3, 0, Math.PI * 2); this.ctx.fill();
    } else if (pickup.type === 'coffee') {
      this.ctx.shadowColor = '#b46cff'; this.ctx.fillStyle = '#f6ecff'; this.ctx.fillRect(-8, -8, 16, 17);
      this.ctx.strokeStyle = '#f6ecff'; this.ctx.lineWidth = 3; this.ctx.beginPath(); this.ctx.arc(10, -1, 6, -Math.PI / 2, Math.PI / 2); this.ctx.stroke();
      this.ctx.fillStyle = '#6d3d26'; this.ctx.fillRect(-7, -7, 14, 6);
    } else {
      this.ctx.shadowColor = '#ffc75a'; this.ctx.fillStyle = '#ffc75a'; this.ctx.rotate(Math.PI / 4); this.ctx.fillRect(-8, -8, 16, 16);
      this.ctx.fillStyle = '#fff3b5'; this.ctx.fillRect(-3, -7, 5, 5);
    }
    this.ctx.restore();
  }

  private drawBoonPickup(pickup: BoonPickup): void {
    const boon = BOONS[pickup.boonId];
    const x = centerX(pickup);
    const y = centerY(pickup) + Math.sin(pickup.time * 3.2) * 10;
    this.ctx.save();
    const beam = this.ctx.createLinearGradient(0, FLOOR_Y, 0, y - 75); beam.addColorStop(0, `${boon.color}00`); beam.addColorStop(.5, `${boon.color}20`); beam.addColorStop(1, `${boon.color}00`);
    this.ctx.fillStyle = beam; this.ctx.beginPath(); this.ctx.moveTo(x - 42, FLOOR_Y); this.ctx.lineTo(x - 18, y - 70); this.ctx.lineTo(x + 18, y - 70); this.ctx.lineTo(x + 42, FLOOR_Y); this.ctx.closePath(); this.ctx.fill();
    this.ctx.strokeStyle=`${boon.color}80`;this.ctx.lineWidth=2;this.ctx.beginPath();this.ctx.ellipse(x,FLOOR_Y-3,45+Math.sin(pickup.time*4)*4,10,0,0,Math.PI*2);this.ctx.stroke();
    this.ctx.translate(x, y);
    this.ctx.rotate(pickup.time * .65);
    this.ctx.shadowColor = boon.color;
    this.ctx.shadowBlur = 38;
    this.ctx.fillStyle = `${boon.color}55`;
    this.ctx.beginPath(); this.ctx.arc(0, 0, 46, 0, Math.PI * 2); this.ctx.fill();
    if (this.pickupAtlas.complete && this.pickupAtlas.naturalWidth > 0) {
      const cellW = this.pickupAtlas.naturalWidth / 4;
      this.ctx.save(); this.ctx.globalAlpha = 1; this.ctx.filter = 'saturate(1.55) brightness(1.12)';
      this.ctx.drawImage(this.pickupAtlas, cellW * 3, 0, cellW, this.pickupAtlas.naturalHeight, -54, -54, 108, 108);
      this.ctx.restore();
    }
    this.ctx.strokeStyle = boon.color; this.ctx.lineWidth = 4;
    this.ctx.beginPath(); this.ctx.moveTo(0, -34); this.ctx.lineTo(29, 0); this.ctx.lineTo(0, 34); this.ctx.lineTo(-29, 0); this.ctx.closePath(); this.ctx.stroke();
    this.ctx.rotate(-pickup.time * .65);
    const sigil = this.boonSigils.get(pickup.boonId);
    if (sigil?.complete && sigil.naturalWidth > 0) {
      this.ctx.drawImage(sigil, -27, -27, 54, 54);
    } else {
      this.ctx.fillStyle = '#fff'; this.ctx.font = '900 30px Barlow Condensed'; this.ctx.textAlign = 'center'; this.ctx.textBaseline = 'middle';
      this.ctx.fillText(boon.glyph, 0, 1);
    }
    this.ctx.strokeStyle=boon.accentColor;this.ctx.lineWidth=1.5;this.ctx.globalAlpha=.72;
    for(let i=0;i<3;i+=1){const angle=-pickup.time*1.2+i*Math.PI*2/3;const ox=Math.cos(angle)*55,oy=Math.sin(angle)*18;this.ctx.beginPath();this.ctx.moveTo(ox,oy-5);this.ctx.lineTo(ox+5,oy);this.ctx.lineTo(ox,oy+5);this.ctx.lineTo(ox-5,oy);this.ctx.closePath();this.ctx.stroke();}
    this.ctx.restore();
    this.ctx.save();
    this.ctx.fillStyle = boon.color; this.ctx.font = '800 13px Barlow Condensed'; this.ctx.textAlign = 'center';
    this.ctx.fillText(`${boon.name.toUpperCase()} BOON`, x, y + 66);
    this.ctx.restore();
  }

  private drawParticle(particle: Particle): void {
    const alpha=clamp(particle.life/particle.maxLife,0,1);const speed=Math.hypot(particle.vx,particle.vy);const length=particle.size*(speed>150?1.7:1.15);
    this.ctx.save();this.ctx.translate(particle.x,particle.y);this.ctx.rotate(speed>1?Math.atan2(particle.vy,particle.vx):Math.PI/4);this.ctx.globalAlpha=alpha;this.ctx.globalCompositeOperation='screen';this.ctx.fillStyle=particle.color;
    if(!this.reducedVfx&&particle.size>3.5){this.ctx.shadowColor=particle.color;this.ctx.shadowBlur=Math.min(12,particle.size*1.6);}
    this.ctx.beginPath();this.ctx.moveTo(length,0);this.ctx.lineTo(0,particle.size*.56);this.ctx.lineTo(-length*.46,0);this.ctx.lineTo(0,-particle.size*.56);this.ctx.closePath();this.ctx.fill();
    if(particle.size>4.5){this.ctx.globalAlpha=alpha*.75;this.ctx.fillStyle='#fff';this.ctx.beginPath();this.ctx.moveTo(length*.55,0);this.ctx.lineTo(0,particle.size*.17);this.ctx.lineTo(-length*.12,0);this.ctx.lineTo(0,-particle.size*.17);this.ctx.closePath();this.ctx.fill();}
    this.ctx.restore();
  }

  private drawFloatingText(text: FloatingText): void {
    this.ctx.save();
    this.ctx.globalAlpha = clamp(text.life / text.maxLife, 0, 1);
    this.ctx.fillStyle = text.color;
    this.ctx.font = `800 ${text.size}px Barlow Condensed`;
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#000'; this.ctx.shadowBlur = 5;
    this.ctx.fillText(text.text, text.x, text.y);
    this.ctx.restore();
  }

  private drawBossBar(): void {
    const majors = this.enemies.filter((enemy) => !enemy.dead && this.isMajorType(enemy.type));
    if (!majors.length) return;
    const boss=majors[0];const finalBoss=majors.length>1||majors.some(target=>target.type==='warden'||target.type==='nerissa'||target.type==='roxyne'||target.type==='calyptraBoss'||target.type==='isoldeBoss'||target.type==='somniaBoss'||target.type==='vesperaBoss'||target.type==='lilithBoss'||target.type==='hollowBoss');const width=finalBoss?610:495;const x=(WIDTH-width)/2;const y=655;const color=boss.type==='hollowBoss'?'#f1eaff':boss.type==='lilithBoss'?'#ff4f9a':boss.type.startsWith('daughter')?'#e7a3ff':boss.type==='vesperaBoss'?'#8ff7ff':boss.type==='betterMilo'?'#d06cff':boss.type==='somniaBoss'?'#bc7cff':boss.type==='dreamGirl'?'#ffd8f5':boss.type==='isoldeBoss'?'#8ee7ff':boss.type==='memoryGolem'?'#d8fbff':boss.type==='calyptraBoss'?'#ff68e2':boss.type==='ladyLuckless'?'#ffe05a':boss.type==='roxyne'?'#ef4e43':boss.type==='perfectPrey'?'#dce8c3':boss.type==='nerissa'?'#55edf3':boss.type==='fanChampion'?'#58e7ed':boss.type==='warden'?'#ff345e':'#ff9b4a';const health=clamp(majors.reduce((sum,target)=>sum+target.health,0)/majors.reduce((sum,target)=>sum+target.maxHealth,0),0,1);
    this.ctx.save();
    this.ctx.fillStyle='rgba(5,3,9,.94)';this.ctx.beginPath();this.ctx.moveTo(x-40,y-3);this.ctx.lineTo(x+width+16,y-3);this.ctx.lineTo(x+width+28,y+31);this.ctx.lineTo(x-40,y+31);this.ctx.closePath();this.ctx.fill();
    this.ctx.fillStyle='#17111e';this.ctx.fillRect(x,y,width,26);this.ctx.fillStyle=color;this.ctx.shadowColor=color;this.ctx.shadowBlur=10;this.ctx.fillRect(x+3,y+3,(width-6)*health,20);
    this.ctx.shadowBlur=0;this.ctx.fillStyle='rgba(255,255,255,.18)';for(let mark=1;mark<5;mark+=1)this.ctx.fillRect(x+width*mark/5,y+3,2,20);
    this.ctx.strokeStyle='rgba(255,255,255,.42)';this.ctx.strokeRect(x,y,width,26);
    const portrait=boss.type==='roxyne'?this.boonPortraits.get('roxyne'):boss.type==='nerissa'?this.boonPortraits.get('nerissa'):boss.type==='warden'?this.boonPortraits.get('belladonna'):boss.type==='brute'?this.bottomlessPortrait:null;
    const latePortraitDepth=boss.type==='ladyLuckless'||boss.type==='calyptraBoss'?4:boss.type==='memoryGolem'||boss.type==='isoldeBoss'?5:boss.type==='dreamGirl'||boss.type==='somniaBoss'?6:boss.type==='betterMilo'||boss.type==='vesperaBoss'?7:boss.type.startsWith('daughter')||boss.type==='lilithBoss'?8:boss.type==='bossRushHerald'||boss.type==='hollowBoss'?9:0;
    const latePortraitAtlas=latePortraitDepth?this.lateEncounterAtlases.get(latePortraitDepth):undefined;
    if(latePortraitAtlas?.complete&&latePortraitAtlas.naturalWidth>0){const major=['calyptraBoss','isoldeBoss','somniaBoss','vesperaBoss','lilithBoss','hollowBoss'].includes(boss.type);const row=major?2:0;this.ctx.save();this.ctx.beginPath();this.ctx.arc(x-29,y+13,30,0,Math.PI*2);this.ctx.clip();this.ctx.fillStyle='#0b0710';this.ctx.fillRect(x-59,y-17,60,60);this.ctx.drawImage(latePortraitAtlas,0,row*512,512,512,x-61,y-19,64,64);this.ctx.restore();}
    else if(portrait?.complete&&portrait.naturalWidth>0){this.ctx.save();this.ctx.beginPath();this.ctx.arc(x-29,y+13,30,0,Math.PI*2);this.ctx.clip();this.ctx.fillStyle='#0b0710';this.ctx.fillRect(x-59,y-17,60,60);this.ctx.drawImage(portrait,x-57,y-27,56,75);this.ctx.restore();}
    else if(boss.type==='perfectPrey'&&this.perfectPreyAtlas.complete&&this.perfectPreyAtlas.naturalWidth>0){const cellW=this.perfectPreyAtlas.naturalWidth/3;this.ctx.save();this.ctx.beginPath();this.ctx.arc(x-29,y+13,30,0,Math.PI*2);this.ctx.clip();this.ctx.fillStyle='#0b0710';this.ctx.fillRect(x-59,y-17,60,60);this.ctx.drawImage(this.perfectPreyAtlas,0,0,cellW,this.perfectPreyAtlas.naturalHeight,x-60,y-18,62,66);this.ctx.restore();}
    this.ctx.strokeStyle=color;this.ctx.lineWidth=3;this.ctx.beginPath();this.ctx.arc(x-29,y+13,30,0,Math.PI*2);this.ctx.stroke();
    const daughterName:Partial<Record<EnemyType,string>>={daughterAttack:'ATTACK',daughterDefense:'DEFENSE',daughterMovement:'MOVEMENT',daughterEnergy:'ENERGY'};
    const displayName=(target:Enemy)=>target.type==='hollowBoss'?LEVEL_NINE_ENCOUNTERS.boss.name.toUpperCase():target.type==='lilithBoss'?LEVEL_EIGHT_ENCOUNTERS.boss.name.toUpperCase():daughterName[target.type]??(target.type==='vesperaBoss'?LEVEL_SEVEN_ENCOUNTERS.boss.name.toUpperCase():target.type==='betterMilo'?LEVEL_SEVEN_ENCOUNTERS.miniboss.name.toUpperCase():target.type==='somniaBoss'?LEVEL_SIX_ENCOUNTERS.boss.name.toUpperCase():target.type==='dreamGirl'?LEVEL_SIX_ENCOUNTERS.miniboss.name.toUpperCase():target.type==='isoldeBoss'?LEVEL_FIVE_ENCOUNTERS.boss.name.toUpperCase():target.type==='memoryGolem'?LEVEL_FIVE_ENCOUNTERS.miniboss.name.toUpperCase():target.type==='calyptraBoss'?LEVEL_FOUR_ENCOUNTERS.boss.name.toUpperCase():target.type==='ladyLuckless'?LEVEL_FOUR_ENCOUNTERS.miniboss.name.toUpperCase():target.type==='roxyne'?LEVEL_THREE_ENCOUNTERS.boss.name.toUpperCase():target.type==='perfectPrey'?LEVEL_THREE_ENCOUNTERS.miniboss.name.toUpperCase():target.type==='nerissa'?LEVEL_TWO_ENCOUNTERS.boss.name.toUpperCase():target.type==='fanChampion'?LEVEL_TWO_ENCOUNTERS.miniboss.champion.toUpperCase():target.type==='warden'?LEVEL_ONE_ENCOUNTERS.boss.name.toUpperCase():LEVEL_ONE_ENCOUNTERS.miniboss.name.toUpperCase());
    const bossName=majors.length>1?`${this.currentDepth===8?'ROYAL RELAY':'DOUBLE DEMON LORDS'} · ${majors.map(displayName).join(' + ')}`:boss.type==='hollowBoss'?`${LEVEL_NINE_ENCOUNTERS.boss.name.toUpperCase()} · ${LEVEL_NINE_ENCOUNTERS.boss.title.toUpperCase()}`:boss.type==='lilithBoss'?`${LEVEL_EIGHT_ENCOUNTERS.boss.name.toUpperCase()} · ${LEVEL_EIGHT_ENCOUNTERS.boss.title.toUpperCase()}`:daughterName[boss.type]?`LILITH'S DAUGHTER · ${daughterName[boss.type]}`:boss.type==='vesperaBoss'?`${LEVEL_SEVEN_ENCOUNTERS.boss.name.toUpperCase()} · ${LEVEL_SEVEN_ENCOUNTERS.boss.title.toUpperCase()}`:boss.type==='betterMilo'?`${LEVEL_SEVEN_ENCOUNTERS.miniboss.name.toUpperCase()} · ${LEVEL_SEVEN_ENCOUNTERS.miniboss.title.toUpperCase()}`:boss.type==='somniaBoss'?`${LEVEL_SIX_ENCOUNTERS.boss.name.toUpperCase()} · ${LEVEL_SIX_ENCOUNTERS.boss.title.toUpperCase()}`:boss.type==='dreamGirl'?`${LEVEL_SIX_ENCOUNTERS.miniboss.name.toUpperCase()} · ${LEVEL_SIX_ENCOUNTERS.miniboss.title.toUpperCase()}`:boss.type==='isoldeBoss'?`${LEVEL_FIVE_ENCOUNTERS.boss.name.toUpperCase()} · ${LEVEL_FIVE_ENCOUNTERS.boss.title.toUpperCase()}`:boss.type==='memoryGolem'?`${LEVEL_FIVE_ENCOUNTERS.miniboss.name.toUpperCase()} · ${LEVEL_FIVE_ENCOUNTERS.miniboss.title.toUpperCase()}`:boss.type==='calyptraBoss'?`${LEVEL_FOUR_ENCOUNTERS.boss.name.toUpperCase()} · ${LEVEL_FOUR_ENCOUNTERS.boss.title.toUpperCase()}`:boss.type==='ladyLuckless'?`${LEVEL_FOUR_ENCOUNTERS.miniboss.name.toUpperCase()} · ${LEVEL_FOUR_ENCOUNTERS.miniboss.title.toUpperCase()}`:boss.type==='roxyne'?`${LEVEL_THREE_ENCOUNTERS.boss.name.toUpperCase()} · ${LEVEL_THREE_ENCOUNTERS.boss.title.toUpperCase()}`:boss.type==='perfectPrey'?`${LEVEL_THREE_ENCOUNTERS.miniboss.name.toUpperCase()} · ${LEVEL_THREE_ENCOUNTERS.miniboss.title.toUpperCase()}`:boss.type==='nerissa'?`${LEVEL_TWO_ENCOUNTERS.boss.name.toUpperCase()} · ${LEVEL_TWO_ENCOUNTERS.boss.title.toUpperCase()}`:boss.type==='fanChampion'?LEVEL_TWO_ENCOUNTERS.miniboss.champion.toUpperCase():boss.type==='warden'?`${LEVEL_ONE_ENCOUNTERS.boss.name.toUpperCase()} · ${LEVEL_ONE_ENCOUNTERS.boss.title.toUpperCase()}`:LEVEL_ONE_ENCOUNTERS.miniboss.name.toUpperCase();
    const powerLabel=this.room.deepDivePowers?.length?this.room.deepDivePowers.map(power=>power.toUpperCase()).join(' + '):'';
    const phase=powerLabel|| (boss.type==='hollowBoss'?(boss.phase===0?'PHASE I · MIRRORS YOUR BUILD':boss.phase===1?(this.isEndless?'PHASE II · BUILD INTACT':'PHASE II · BASE KIT ONLY'):(this.isEndless?'PHASE III · DEPTH POWERS STACKED':`PHASE III · ${this.hollowRestoreQueue.length} VOICES WAITING`)):boss.type==='lilithBoss'?(this.lilithDecreeTimer>0?`ROYAL DECREE ${this.lilithDecreeTimer.toFixed(1)}s · ${this.lilithDecreeLabel}`:`PHASE ${boss.phase+1} · QUEEN'S COMMAND`):daughterName[boss.type]?`RELAY ${this.daughterRelayWave}/3 · ${daughterName[boss.type]}`:boss.type==='vesperaBoss'?(health<.34?'THOUSANDFOLD SHATTER':health<.68?'EVERY FACE ANSWERS':'DEMON LORD · REFLECTIONS'):boss.type==='betterMilo'?'COPIES BASE KIT · FIXED DAMAGE':boss.type==='somniaBoss'?(health<.32?'HORNS UNVEILED · OVERLAPPING LOOPS':health<.66?'FALSE AWAKENING PHASE':'DEMON LORD · DREAMS'):boss.type==='dreamGirl'?`FANTASY ANCHORS ${this.enemies.filter(enemy=>!enemy.dead&&enemy.type==='fantasyAnchor').length} · INDIRECT FIGHT`:boss.type==='isoldeBoss'?(health<.31?'DEMON LORD UNSEALED · OVERLAPPING DELAYS':health<.64?'PRESERVATION PHASE 2 · DOUBLE MEMORY':'DEMON LORD · PRESERVATION'):boss.type==='memoryGolem'?`RECOLLECTION ${boss.phase+1} · ACTIVE COMBAT`:boss.type==='calyptraBoss'?(health<.3?'JACKPOT PHASE · DOUBLE SPIN':health<.62?'PHASE 2 · CHAINED ROULETTE':'DISCLOSED ROULETTE'):boss.type==='ladyLuckless'?`RULE ${boss.phase+1} · DISCLOSED`:boss.type==='roxyne'?(health<.3?'DEMON LORD · COLLAPSING CANOPY':health<.62?'PREDATOR\'S MARK · DUEL':'DEMON LORD · THE HUNT'):boss.type==='perfectPrey'?(boss.phase===1?'CORNERED · COUNTERATTACKING':'FLEEING · THORN VOLLEYS'):boss.type==='nerissa'?(health<.55?'DEMON LORD · POWER CHORD':'ADORATION SET'):boss.type==='fanChampion'?(this.enemies.some(enemy=>enemy.id!==boss.id&&!enemy.dead)?'ADORATION SHIELD':'ISOLATED'):boss.type==='warden'&&health<.38?'RAVENOUS PHASE':boss.type==='warden'?'APPETITE AWAKENING':'LAST CALL');
    this.ctx.fillStyle='#fff';this.ctx.font='900 12px Barlow Condensed';this.ctx.textAlign='left';this.ctx.fillText(bossName,x+10,y-8);
    this.ctx.fillStyle=color;this.ctx.textAlign='right';this.ctx.fillText(phase,x+width,y-8);
    this.ctx.restore();
  }

  private drawRoomIntro(): void {
    const alpha = clamp(this.roomIntro < .5 ? this.roomIntro * 2 : (2.2 - this.roomIntro) * 2, 0, 1);
    const bossLike=this.room.type==='boss'||this.room.type==='miniboss';const accent=this.currentDepth>=9?(this.room.type==='boss'?'#f2ecff':this.room.type==='miniboss'?'#a970ff':'#9d83c7'):this.currentDepth===8?(this.room.type==='boss'?'#ff4f9a':this.room.type==='miniboss'?'#e6a0ff':'#e34787'):this.currentDepth===7?(this.room.type==='boss'?'#8ff7ff':this.room.type==='miniboss'?'#d06cff':'#61edff'):this.currentDepth===6?(this.room.type==='boss'?'#bc7cff':this.room.type==='miniboss'?'#ffd8f5':'#d6a0ff'):this.currentDepth===5?(this.room.type==='boss'?'#8ee7ff':this.room.type==='miniboss'?'#d8fbff':'#72dcff'):this.currentDepth===4?(this.room.type==='boss'?'#ff68e2':this.room.type==='miniboss'?'#ffe05a':'#5deaff'):this.currentDepth===3?(this.room.type==='boss'?'#ef4e43':this.room.type==='miniboss'?'#dce8c3':'#9fbd48'):this.currentDepth===2?(this.room.type==='boss'?'#5ff5ff':this.room.type==='miniboss'?'#4be1e9':'#57d6c7'):this.room.type==='boss'?'#ff345e':this.room.type==='miniboss'?'#ff9b4a':'#57d6c7';
    this.ctx.save(); this.ctx.globalAlpha = alpha;
    if(bossLike){
      this.ctx.fillStyle='rgba(5,3,9,.9)';this.ctx.fillRect(0,224,WIDTH,206);this.ctx.fillStyle=accent;this.ctx.fillRect(0,224,WIDTH,3);this.ctx.fillRect(0,427,WIDTH,3);
      const latePortraitAtlas=this.currentDepth>=4?this.lateEncounterAtlases.get(this.currentDepth):undefined;
      const portrait=this.currentDepth>=4?undefined:this.currentDepth===3?(this.room.type==='boss'?this.boonPortraits.get('roxyne'):undefined):this.currentDepth===2?(this.room.type==='boss'?this.boonPortraits.get('nerissa'):undefined):(this.room.type==='boss'?this.boonPortraits.get('belladonna'):this.bottomlessPortrait);
      if(latePortraitAtlas?.complete&&latePortraitAtlas.naturalWidth>0){this.ctx.save();this.ctx.globalAlpha=.88*alpha;const row=this.room.type==='boss'?2:0;this.ctx.drawImage(latePortraitAtlas,0,row*512,512,512,WIDTH-430,105,390,390);this.ctx.restore();}
      else if(portrait?.complete&&portrait.naturalWidth>0){this.ctx.save();this.ctx.globalAlpha=.82*alpha;const height=310,width=height*portrait.naturalWidth/portrait.naturalHeight;this.ctx.drawImage(portrait,WIDTH-width-45,151,width,height);this.ctx.restore();}
      else if(this.currentDepth===3&&this.room.type==='miniboss'&&this.perfectPreyAtlas.complete&&this.perfectPreyAtlas.naturalWidth>0){const cellW=this.perfectPreyAtlas.naturalWidth/3;this.ctx.save();this.ctx.globalAlpha=.82*alpha;this.ctx.drawImage(this.perfectPreyAtlas,0,0,cellW,this.perfectPreyAtlas.naturalHeight,WIDTH-370,145,325,345);this.ctx.restore();}
      const introX=110;const levelNine=this.currentDepth===9;const levelEight=this.currentDepth===8;const levelSeven=this.currentDepth===7;const levelSix=this.currentDepth===6;const levelFive=this.currentDepth===5;const levelFour=this.currentDepth===4;const levelThree=this.currentDepth===3;const levelTwo=this.currentDepth===2;const kicker=this.isEndless?`DEEP DIVE CYCLE ${this.room.deepDiveCycle??1} · ${(this.room.deepDivePowers??[]).map(power=>power.toUpperCase()).join(' + ')||'ALTERED ARENA'}`:levelNine?(this.room.type==='boss'?'FINAL ENCOUNTER · THE SELF BELOW':'MINI-BOSS · SEVEN-LORD GAUNTLET'):levelEight?(this.room.type==='boss'?'SUCCUBUS QUEEN · ROYAL DECREE':'MINI-BOSS · FOUR-DAUGHTER RELAY'):levelSeven?(this.room.type==='boss'?'DEMON LORD · REFLECTIONS':'MINI-BOSS · COPIED BASE KIT'):levelSix?(this.room.type==='boss'?'DEMON LORD · DREAMS':'MINI-BOSS · INDIRECT ANCHOR FIGHT'):levelFive?(this.room.type==='boss'?'DEMON LORD · PRESERVATION':'MINI-BOSS · ACTIVE RECOLLECTION'):levelFour?(this.room.type==='boss'?'DEMON LORD · DISCLOSED ROULETTE':'MINI-BOSS · DISCLOSED RULES'):levelThree?(this.room.type==='boss'?'DEMON LORD · THE HUNT':'MINI-BOSS · CHOKE-POINT CHASE'):levelTwo?(this.room.type==='boss'?'DEMON LORD · ADORATION':'MINI-BOSS · THREE-WAVE GAUNTLET'):(this.room.type==='boss'?'DEMON LORD · APPETITE':'MINI-BOSS · LAST CALL');const title=this.room.doubleBoss?'DOUBLE DEMON LORDS':levelNine?(this.room.type==='boss'?'THE HOLLOW':'BOSS RUSH'):levelEight?(this.room.type==='boss'?'LILITH':"LILITH'S DAUGHTERS"):levelSeven?(this.room.type==='boss'?'VESPERA':'BETTER MILO'):levelSix?(this.room.type==='boss'?'SOMNIA':'DREAM GIRL'):levelFive?(this.room.type==='boss'?'ISOLDE':'MEMORY GOLEM'):levelFour?(this.room.type==='boss'?'CALYPTRA':'LADY LUCKLESS'):levelThree?(this.room.type==='boss'?'ROXYNE':'PERFECT PREY'):levelTwo?(this.room.type==='boss'?'NERISSA':'THE FAN CLUB'):(this.room.type==='boss'?'BELLADONNA':'BOTTOMLESS BARTENDER');
      this.ctx.textAlign='left';this.ctx.fillStyle=accent;this.ctx.font='900 13px Barlow Condensed';this.ctx.letterSpacing='5px';this.ctx.fillText(kicker,introX,272);
      this.ctx.fillStyle='#fff';this.ctx.font='900 55px Barlow Condensed';this.ctx.letterSpacing='1px';this.ctx.fillText(title,introX,334);
      this.ctx.fillStyle='#b8afc9';this.ctx.font='800 14px Barlow Condensed';this.ctx.letterSpacing='3px';this.ctx.fillText(this.room.name.toUpperCase(),introX,369);
    }else{
      this.ctx.fillStyle='rgba(5,4,10,.82)';this.ctx.beginPath();this.ctx.moveTo(42,292);this.ctx.lineTo(720,292);this.ctx.lineTo(748,320);this.ctx.lineTo(720,395);this.ctx.lineTo(42,395);this.ctx.closePath();this.ctx.fill();
      this.ctx.fillStyle=accent;this.ctx.fillRect(42,292,5,103);this.ctx.textAlign='left';this.ctx.fillStyle='#fff';this.ctx.font='900 37px Barlow Condensed';this.ctx.fillText(this.room.name.toUpperCase(),72,338);
      this.ctx.fillStyle='#b8afc9';this.ctx.font='800 13px Barlow Condensed';this.ctx.letterSpacing='3px';this.ctx.fillText(this.room.subtitle.toUpperCase(),72,368);
    }
    const gateGlyph: Record<GateSide,string> = {left:'←',right:'→',top:'↑',bottom:'↓'};
    this.ctx.fillStyle=accent;this.ctx.font='800 10px Barlow Condensed';this.ctx.letterSpacing='2px';this.ctx.textAlign=bossLike?'left':'left';
    this.ctx.fillText(`ROUTE VERIFIED · COMPLEXITY ${this.room.complexity ?? 1} · ${gateGlyph[this.room.entrySide ?? 'left']} ENTRY / ${gateGlyph[this.room.exitSide ?? 'right']} EXIT`,bossLike?110:72,bossLike?400:386);
    this.ctx.restore();
  }

  private drawAmbientEmbers(alpha: number): void {
    this.ctx.save(); this.ctx.globalAlpha = alpha;
    for (const ember of this.ambientEmbers) {
      this.ctx.fillStyle = ember.color;
      this.ctx.fillRect(ember.x, ember.y, ember.size, ember.size);
    }
    this.ctx.restore();
  }

  private drawSummoningCircle(x: number, y: number, radius: number, color: string): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(this.time * .07);
    this.ctx.strokeStyle = color;
    this.ctx.globalAlpha = .34;
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 25;
    this.ctx.beginPath(); this.ctx.arc(0, 0, radius, 0, Math.PI * 2); this.ctx.stroke();
    this.ctx.beginPath(); this.ctx.arc(0, 0, radius * .72, 0, Math.PI * 2); this.ctx.stroke();
    for (let i = 0; i < 8; i += 1) {
      const angle = i / 8 * Math.PI * 2;
      const next = ((i * 3) % 8) / 8 * Math.PI * 2;
      this.ctx.beginPath(); this.ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius); this.ctx.lineTo(Math.cos(next) * radius, Math.sin(next) * radius); this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, radius: number): void {
    const r = Math.min(radius, w / 2, h / 2);
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.arcTo(x + w, y, x + w, y + h, r);
    this.ctx.arcTo(x + w, y + h, x, y + h, r);
    this.ctx.arcTo(x, y + h, x, y, r);
    this.ctx.arcTo(x, y, x + w, y, r);
    this.ctx.closePath();
  }
}

new DemonGame();
