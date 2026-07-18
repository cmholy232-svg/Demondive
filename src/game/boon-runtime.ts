import type { BoonId } from './types';

export type ProjectileShape = 'flame'|'orb'|'boulder'|'needle'|'seed'|'spark'|'shard'|'crescent'|'lance'|'maw'|'note'|'fang'|'die'|'crystal'|'loop'|'mirror'|'coin'|'spiral'|'drop'|'halo';

export const BOON_PROJECTILE_SHAPES: Readonly<Record<BoonId,ProjectileShape>> = Object.freeze({
  pyrra:'flame',maris:'orb',gaia:'boulder',zephyra:'needle',flora:'seed',voltara:'spark',crya:'shard',luna:'crescent',solara:'lance',
  belladonna:'maw',nerissa:'note',roxyne:'fang',calyptra:'die',isolde:'crystal',somnia:'loop',vespera:'mirror',aurelia:'coin',
  noctissa:'spiral',lilith:'drop',seraphine:'halo',
});

export function selectDominantBoon(
  stacks: Readonly<Record<BoonId,number>>,
  order: readonly BoonId[],
  startingBoon: BoonId,
  lastIncreasedBoon: BoonId,
): BoonId | null {
  const active=order.filter((id)=>stacks[id]>0);
  if(active.length===0)return null;
  const highest=Math.max(...active.map((id)=>stacks[id]));
  const tied=active.filter((id)=>stacks[id]===highest);
  if(tied.includes(startingBoon))return startingBoon;
  if(tied.includes(lastIncreasedBoon))return lastIncreasedBoon;
  return tied[0]??null;
}

export function selectAttachedBoons(
  stacks: Readonly<Record<BoonId,number>>,
  order: readonly BoonId[],
  dominant: BoonId | null,
  limit=2,
): BoonId[] {
  return order
    .filter((id)=>id!==dominant&&stacks[id]>0)
    .sort((a,b)=>stacks[b]-stacks[a]||order.indexOf(a)-order.indexOf(b))
    .slice(0,Math.max(0,limit));
}

export function incomingDamageMultiplier(gaiaStacks:number,cryaStacks:number,controlledEnemyPresent:boolean):number {
  const gaia=Math.max(.55,1-Math.max(0,gaiaStacks)*.08);
  const crya=controlledEnemyPresent?Math.max(.55,1-Math.max(0,cryaStacks)*.08):1;
  return Math.max(.4,gaia*crya);
}

export function pickupMagnetRadius(upgradeStacks:number,nerissaStacks:number):number {
  return 70+Math.max(0,upgradeStacks)*45+Math.max(0,nerissaStacks)*55;
}

export function buildupThreshold(effectiveStacks:number):number {
  return Math.max(2,4-Math.floor(Math.max(0,effectiveStacks)/3));
}

export function somniaEchoCount(rawStacks:number):number {
  return rawStacks<=0?0:rawStacks>=8?3:rawStacks>=4?2:1;
}

export function seraphineMaximumShieldCharges(rawStacks:number):number {
  return rawStacks<=0?0:Math.min(4,1+Math.floor((rawStacks-1)/3));
}
