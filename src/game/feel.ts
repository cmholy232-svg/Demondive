import type { BoonId } from './types';
import type { RoomType } from './types';

export const MOVEMENT_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [208,315],[184,315],[148,311],[138,300],[121,316],
  [191,304],[183,300],[202,259],[153,287],[110,285],
  [203,240],[185,247],[199,244],[165,250],[114,252],
];

// The technical-template run atlas contains one gait pass authored facing
// right and one authored facing left. Runtime normalization is part of Milo's
// protected animation contract and prevents a mid-cycle facing reversal.
export const RUN_FRAME_FACING: ReadonlyArray<1 | -1> = [1, 1, 1, 1, -1, -1, -1, -1];

export const SHOOT_ANCHORS: ReadonlyArray<readonly [number, number]> = [
  [190,330],[183,330],[178,330],[151,330],
  [172,324],[174,325],[171,325],[151,325],
  [176,327],[169,327],[151,276],[178,245],
];

// Source-space center of the casting hand in each 362 x 362 shooting cell.
export const SHOOT_HANDS: ReadonlyArray<readonly [number, number]> = [
  [259,209],[298,125],[284,135],[214,222],
  [269,61],[277,36],[279,57],[214,243],
  [211,23],[199,15],[264,207],[281,199],
];

export function shootFrameFor(aimY: number, grounded: boolean, progress: number): number {
  const t = Math.max(0, Math.min(.999, progress));
  if (aimY > .35) return grounded ? (t < .72 ? 0 : 3) : (t < .58 ? 10 : 11);
  if (aimY < -.72) return t < .55 ? 8 : 9;
  if (aimY < -.12) return 4 + Math.min(3, Math.floor(t * 4));
  return t < .45 ? 1 : t < .78 ? 2 : 3;
}

const TINTS: Array<{ id: BoonId; r: number; g: number; b: number; amount: number }> = [
  { id:'pyrra',r:255,g:45,b:83,amount:.98 }, { id:'maris',r:0,g:205,b:255,amount:.96 },
  { id:'gaia',r:190,g:103,b:38,amount:.98 }, { id:'zephyra',r:45,g:245,b:184,amount:.96 },
  { id:'flora',r:91,g:231,b:80,amount:.96 }, { id:'voltara',r:255,g:225,b:25,amount:1 },
  { id:'crya',r:48,g:135,b:255,amount:.96 }, { id:'luna',r:91,g:57,b:223,amount:.98 },
  { id:'solara',r:255,g:244,b:103,amount:1 }, { id:'belladonna',r:255,g:50,b:169,amount:1 },
  { id:'nerissa',r:0,g:224,b:215,amount:.98 }, { id:'roxyne',r:244,g:70,b:44,amount:.98 },
  { id:'calyptra',r:224,g:62,b:255,amount:1 }, { id:'isolde',r:91,g:220,b:255,amount:.96 },
  { id:'somnia',r:180,g:93,b:255,amount:.98 }, { id:'vespera',r:123,g:111,b:255,amount:.98 },
  { id:'aurelia',r:255,g:172,b:20,amount:1 }, { id:'noctissa',r:44,g:53,b:190,amount:1 },
  { id:'lilith',r:185,g:8,b:70,amount:1 }, { id:'seraphine',r:255,g:235,b:145,amount:.98 },
];

export function movementFrame(dashTime: number, dashRecovery: number): number {
  if (dashTime > 0) return 10 + Math.floor(Math.max(0, Math.min(.999, 1 - dashTime / .18)) * 3);
  if (dashRecovery > 0) return dashRecovery > .055 ? 13 : 14;
  return 0;
}

export function styleRankFor(meter: number): 'D' | 'C' | 'B' | 'A' | 'S' {
  return meter >= 90 ? 'S' : meter >= 70 ? 'A' : meter >= 45 ? 'B' : meter >= 20 ? 'C' : 'D';
}

export function scoreMultiplierForRank(rank: string): number {
  return rank === 'S' ? 3 : rank === 'A' ? 2 : rank === 'B' ? 1.5 : rank === 'C' ? 1.25 : 1;
}

export function rushChargeForRank(rank: string): number {
  return rank === 'S' ? 65 : rank === 'A' ? 45 : rank === 'B' ? 32 : rank === 'C' ? 24 : 18;
}

export function roomGradeFor(damageTaken: number, clearTime: number, roomType: RoomType): 'S' | 'A' | 'B' | 'C' {
  const target = roomType === 'boss' ? 120 : roomType === 'miniboss' ? 78 : 55;
  return damageTaken === 0 && clearTime <= target ? 'S' : damageTaken <= 15 && clearTime <= target * 1.45 ? 'A' : damageTaken <= 38 ? 'B' : 'C';
}

export function jackpotChanceFor(rank: string, wagerMultiplier: number): number {
  const rankBonus = rank === 'S' ? .12 : rank === 'A' ? .06 : 0;
  return Math.min(.38, .06 + rankBonus + (wagerMultiplier > 1 ? .2 : 0));
}

export function calyptraCriticalMultiplier(calyptraStacks: number): number {
  return 2 + Math.max(0, calyptraStacks) * .08;
}

export function calyptraPowerMultiplier(calyptraStacks: number, roll: number): number {
  if (calyptraStacks <= 0) return 1;
  const ceiling = .5 + Math.max(0, calyptraStacks - 1) * .04;
  return .85 + Math.max(0, Math.min(1, roll)) * ceiling;
}

export function mixedArcaneColor(stacks: Record<BoonId, number>): string {
  // Milo starts with a pale violet-white core. Individual giver colors are
  // deliberately strong; the saturation rescue below prevents late builds
  // from averaging into gray or mud.
  let r = 226 * .22, g = 214 * .22, b = 255 * .22, weight = .22;
  for (const tint of TINTS) {
    const contribution = stacks[tint.id] * tint.amount;
    r += tint.r * contribution; g += tint.g * contribution; b += tint.b * contribution; weight += contribution;
  }
  r /= weight; g /= weight; b /= weight;
  const gray = (r + g + b) / 3;
  const boost = 1.9;
  r = gray + (r - gray) * boost; g = gray + (g - gray) * boost; b = gray + (b - gray) * boost;
  const totalStacks = TINTS.reduce((sum, tint) => sum + stacks[tint.id], 0);
  if (totalStacks >= 3 && Math.max(r, g, b) - Math.min(r, g, b) < 72) {
    const hue = (TINTS.reduce((sum, tint, index) => sum + stacks[tint.id] * (index + 1) * 47, 0) + totalStacks * 29) % 360;
    const c = .92 * (1 - Math.abs(2 * .59 - 1)); const x = c * (1 - Math.abs((hue / 60) % 2 - 1)); const m = .59 - c / 2;
    const sectors = hue < 60 ? [c,x,0] : hue < 120 ? [x,c,0] : hue < 180 ? [0,c,x] : hue < 240 ? [0,x,c] : hue < 300 ? [x,0,c] : [c,0,x];
    [r,g,b] = sectors.map(value => (value + m) * 255);
  }
  const brightest = Math.max(r, g, b);
  if (brightest < 205) { const lift = 205 - brightest; r += lift; g += lift; b += lift; }
  const hex = (value: number) => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
