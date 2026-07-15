export type MiloAtlasId = 'movement' | 'run' | 'dashHurt' | 'cast';
export type MiloAnimationId =
  | 'idle' | 'turn' | 'runLoop' | 'jumpAnticipation' | 'jumpRise' | 'jumpApex' | 'jumpFall' | 'land'
  | 'dashStart' | 'dashTravel' | 'dashEnd' | 'hurtLight' | 'hurtHeavy' | 'defeat'
  | 'castStart' | 'castRelease' | 'runCast' | 'airCast' | 'downCast' | 'specialCharge' | 'boonAcquire';

export interface MiloAtlasDefinition {
  id: MiloAtlasId;
  asset: string;
  columns: 4;
  rows: 2;
  cellWidth: 384;
  cellHeight: 512;
  feetY: 458;
  nativeGameplayScale: number;
  frameScales?: number[];
  frameFeetY?: number[];
  frameFacing?: Array<1 | -1>;
  sockets?: Array<{ x: number; y: number } | null>;
}

export interface MiloAnimationDefinition {
  id: MiloAnimationId;
  label: string;
  atlas: MiloAtlasId;
  frames: number[];
  fps: number;
  loop: boolean;
}

export const MILO_ATLASES: Record<MiloAtlasId, MiloAtlasDefinition> = {
  movement: {
    id:'movement', asset:'assets/a5/characters/milo/chr-milo-movement-core-v01.png', columns:4, rows:2, cellWidth:384, cellHeight:512, feetY:458, nativeGameplayScale:.36,
    // Calibrated by visible alpha area against idle frame 1. Tucked and
    // crouched poses must occupy less height without making Milo grow in mass.
    frameScales:[1.12,1.16,1.14,1.16,1.17,1.44,1.17,1.14],
    // The first two source cells end at y=405. Using the shared 458 anchor
    // left a visible 20–26px gap between Milo's shoes and his contact shadow.
    frameFeetY:[405,405,457,457,457,458,458,458],
    // The two standing cells were authored looking left; action cells were
    // authored looking right. Normalize them before applying player facing.
    frameFacing:[-1,-1,1,1,1,1,1,1],
  },
  run: {
    id:'run', asset:'assets/a5/characters/milo/chr-milo-run-loop-v01.png', columns:4, rows:2, cellWidth:384, cellHeight:512, feetY:458, nativeGameplayScale:.36,
    frameScales:[.87,.96,.89,.89,.87,.95,.89,.91],
  },
  dashHurt: {
    id:'dashHurt', asset:'assets/a5/characters/milo/chr-milo-dash-hurt-v01.png', columns:4, rows:2, cellWidth:384, cellHeight:512, feetY:458, nativeGameplayScale:.36,
    frameScales:[1,.98,1.12,1.07,1.13,1.15,1,1.12],
  },
  cast: {
    id:'cast', asset:'assets/a5/characters/milo/chr-milo-cast-core-v01.png', columns:4, rows:2, cellWidth:384, cellHeight:512, feetY:458, nativeGameplayScale:.36,
    // Running cast was visibly larger than both the run loop and collision
    // body. Keep its silhouette within the same production-scale envelope.
    frameScales:[1.04,1.13,1.04,.96,1.33,1.08,1.02,.94],
    // Upward cast's actual shoes end at 415. The old shared anchor registered
    // a disconnected purple fragment as the feet, making Milo float and shrink.
    frameFeetY:[458,458,458,416,458,458,458,458],
    sockets:[{x:149,y:210},{x:329,y:182},{x:346,y:216},{x:154,y:52},{x:335,y:226},{x:263,y:398},{x:94,y:184},{x:100,y:191}],
  },
};

export const MILO_ANIMATIONS: Record<MiloAnimationId, MiloAnimationDefinition> = {
  idle:{id:'idle',label:'Idle',atlas:'movement',frames:[1],fps:1,loop:true},
  turn:{id:'turn',label:'Turn',atlas:'movement',frames:[2],fps:1,loop:false},
  runLoop:{id:'runLoop',label:'Run loop',atlas:'run',frames:[0,1,2,3,4,5,6,7],fps:13.5,loop:true},
  jumpAnticipation:{id:'jumpAnticipation',label:'Jump anticipation',atlas:'movement',frames:[3],fps:1,loop:false},
  jumpRise:{id:'jumpRise',label:'Jump rise',atlas:'movement',frames:[4],fps:1,loop:false},
  jumpApex:{id:'jumpApex',label:'Jump apex',atlas:'movement',frames:[5],fps:1,loop:false},
  jumpFall:{id:'jumpFall',label:'Jump fall',atlas:'movement',frames:[6],fps:1,loop:false},
  land:{id:'land',label:'Soft landing',atlas:'movement',frames:[7],fps:1,loop:false},
  dashStart:{id:'dashStart',label:'Dash start',atlas:'dashHurt',frames:[0,1],fps:18,loop:false},
  dashTravel:{id:'dashTravel',label:'Dash travel',atlas:'dashHurt',frames:[2],fps:1,loop:false},
  dashEnd:{id:'dashEnd',label:'Dash recovery',atlas:'dashHurt',frames:[3],fps:1,loop:false},
  hurtLight:{id:'hurtLight',label:'Hurt light',atlas:'dashHurt',frames:[4],fps:1,loop:false},
  hurtHeavy:{id:'hurtHeavy',label:'Hurt heavy',atlas:'dashHurt',frames:[5],fps:1,loop:false},
  defeat:{id:'defeat',label:'Defeat',atlas:'dashHurt',frames:[6,7],fps:5.5,loop:false},
  castStart:{id:'castStart',label:'Cast start',atlas:'cast',frames:[0],fps:1,loop:false},
  castRelease:{id:'castRelease',label:'Cast release',atlas:'cast',frames:[0,1],fps:14,loop:false},
  runCast:{id:'runCast',label:'Running cast',atlas:'cast',frames:[2],fps:1,loop:false},
  airCast:{id:'airCast',label:'Air cast',atlas:'cast',frames:[4],fps:1,loop:false},
  downCast:{id:'downCast',label:'Down cast',atlas:'cast',frames:[5],fps:1,loop:false},
  specialCharge:{id:'specialCharge',label:'Special charge',atlas:'cast',frames:[6],fps:1,loop:false},
  boonAcquire:{id:'boonAcquire',label:'Boon acquisition',atlas:'cast',frames:[7],fps:1,loop:false},
};

export const MILO_ANIMATION_ORDER = Object.keys(MILO_ANIMATIONS) as MiloAnimationId[];
