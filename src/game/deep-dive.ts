import { SeededRandom } from './rng';
import type { DeepDivePower, GateSide } from './types';

const sides: GateSide[] = ['right', 'bottom', 'left', 'top'];
const opposite: Record<GateSide, GateSide> = { left:'right', right:'left', top:'bottom', bottom:'top' };
const delta: Record<GateSide, {x:number;y:number}> = {
  left:{x:-1,y:0}, right:{x:1,y:0}, top:{x:0,y:-1}, bottom:{x:0,y:1},
};

export type DeepDiveEncounter = 'combat' | 'miniboss' | 'boss';

export function deepDiveCycle(roomIndex: number): number {
  return Math.floor((Math.max(1, roomIndex) - 1) / 10) + 1;
}

export function deepDiveSlot(roomIndex: number): number {
  return (Math.max(1, roomIndex) - 1) % 10 + 1;
}

export function deepDiveEncounter(roomIndex: number): DeepDiveEncounter {
  const slot = deepDiveSlot(roomIndex);
  return slot === 6 ? 'miniboss' : slot === 10 ? 'boss' : 'combat';
}

export type DeepDiveBiome = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export function deepDiveBiome(runSeed: number, roomIndex: number): DeepDiveBiome {
  const cycle = deepDiveCycle(roomIndex);
  const rng = new SeededRandom(`${runSeed}:deep-dive-biome-order`);
  const start = rng.int(0, 8);
  const direction = rng.chance(.5) ? 1 : -1;
  return (((start + direction * (cycle - 1)) % 9 + 9) % 9 + 1) as DeepDiveBiome;
}

function rotatedSide(runSeed: number, logicalIndex: number): GateSide {
  const rng = new SeededRandom(`${runSeed}:deep-dive-route`);
  const rotation = rng.int(0, 3);
  const clockwise = rng.chance(.5);
  const index = clockwise ? logicalIndex : (4 - logicalIndex) % 4;
  return sides[(index + rotation) % 4];
}

function logicalStep(stepIndex: number): number {
  let remaining = Math.max(0, stepIndex);
  let direction = 0;
  let length = 1;
  while (remaining >= length) {
    remaining -= length;
    direction = (direction + 1) % 4;
    if (direction % 2 === 0) length += 1;
  }
  return direction;
}

function sideForStep(runSeed: number, stepIndex: number): GateSide {
  return rotatedSide(runSeed, logicalStep(stepIndex));
}

export function deepDiveRoute(runSeed: number, roomIndex: number): { mapX:number; mapY:number; entrySide:GateSide; exitSide:GateSide } {
  const target = Math.max(1, roomIndex);
  let mapX = 0;
  let mapY = 0;
  for (let step = 0; step < target - 1; step += 1) {
    const side = sideForStep(runSeed, step);
    mapX += delta[side].x;
    mapY += delta[side].y;
  }
  const exitSide = sideForStep(runSeed, target - 1);
  const entrySide = target === 1 ? opposite[exitSide] : opposite[sideForStep(runSeed, target - 2)];
  return { mapX, mapY, entrySide, exitSide };
}

const powers: DeepDivePower[] = ['frenzied','armored','volatile','homing','summoner'];

export function deepDivePowers(runSeed: number, roomIndex: number): DeepDivePower[] {
  if (deepDiveEncounter(roomIndex) === 'combat') return [];
  const count = Math.min(powers.length, deepDiveCycle(roomIndex));
  const rng = new SeededRandom(`${runSeed}:deep-dive-powers:${deepDiveCycle(roomIndex)}`);
  return rng.shuffle(powers).slice(0, count);
}

export function deepDiveIsDoubleBoss(roomIndex: number): boolean {
  return deepDiveEncounter(roomIndex) === 'boss' && deepDiveCycle(roomIndex) >= 3;
}

export function deepDiveMinimumEnemies(roomIndex: number): number {
  return Math.min(12, 4 + Math.floor((Math.max(1, roomIndex) - 1) / 5));
}

export function deepDiveCrossPollination(roomIndex: number): number {
  return Math.min(3, Math.max(0, deepDiveCycle(roomIndex) - 1));
}

export function deepDiveRewardStacks(roomIndex: number): number {
  const cycle = deepDiveCycle(roomIndex);
  return cycle >= 7 ? 3 : cycle >= 4 ? 2 : 1;
}

export function deepDiveHasBoonReward(roomIndex: number): boolean {
  const encounter = deepDiveEncounter(roomIndex);
  if (encounter !== 'combat') return true;
  const slot = deepDiveSlot(roomIndex);
  const cycle = deepDiveCycle(roomIndex);
  if (cycle >= 5) return true;
  if (cycle >= 3) return slot % 2 === 1;
  return slot === 3 || slot === 8;
}

export function deepDiveHasWager(roomIndex: number): boolean {
  const slot = deepDiveSlot(roomIndex);
  return deepDiveEncounter(roomIndex) === 'combat' && (slot === 2 || slot === 8);
}

export function deepDiveHasRouteChoice(roomIndex: number): boolean {
  const slot = deepDiveSlot(roomIndex);
  return deepDiveEncounter(roomIndex) === 'combat' && (slot === 3 || slot === 7);
}
