import type { Projectile } from './types';

export const PROJECTILE_DETAIL_BUDGET = Object.freeze({ normal:220,reduced:110 });
export const PROJECTILE_TRAIL_BUDGET = Object.freeze({ normal:96,reduced:42 });

export interface ProjectilePresentationPlan {
  detailed:Projectile[];
  simplified:Projectile[];
  suppressedPlayerCount:number;
  logicalCount:number;
}

function selectEvenly<T extends { id:number }>(values:readonly T[],limit:number):T[] {
  if(limit<=0)return [];
  if(values.length<=limit)return [...values];
  const selected:T[]=[];
  const step=values.length/limit;
  for(let index=0;index<limit;index+=1)selected.push(values[Math.min(values.length-1,Math.floor(index*step))]);
  return selected;
}

/**
 * Presentation may consolidate player-owned projectiles, but it never mutates
 * the logical array and never hides hostile attacks. Hostile overflow receives
 * a cheaper renderer so combat information survives pressure.
 */
export function planProjectilePresentation(projectiles:readonly Projectile[],detailBudget:number):ProjectilePresentationPlan {
  const normalizedBudget=Math.max(24,Math.floor(detailBudget));
  if(projectiles.length<=normalizedBudget)return {detailed:[...projectiles],simplified:[],suppressedPlayerCount:0,logicalCount:projectiles.length};
  const hostile=projectiles.filter(projectile=>projectile.owner==='enemy');
  const player=projectiles.filter(projectile=>projectile.owner==='player');
  const dangerous=hostile.filter(projectile=>projectile.songNote||projectile.destructible||projectile.homing>0);
  const dangerousIds=new Set(dangerous.map(projectile=>projectile.id));
  const ordinary=hostile.filter(projectile=>!dangerousIds.has(projectile.id));
  const hostileDetailBudget=Math.min(hostile.length,Math.max(dangerous.length,Math.floor(normalizedBudget*.55)));
  const detailedDangerous=selectEvenly(dangerous,hostileDetailBudget);
  const remainingHostileBudget=Math.max(0,hostileDetailBudget-detailedDangerous.length);
  const detailedOrdinary=selectEvenly(ordinary,remainingHostileBudget);
  const detailedHostile=[...detailedDangerous,...detailedOrdinary];
  const detailedHostileIds=new Set(detailedHostile.map(projectile=>projectile.id));
  const simplified=hostile.filter(projectile=>!detailedHostileIds.has(projectile.id));
  const playerBudget=Math.max(0,normalizedBudget-detailedHostile.length);
  const detailedPlayer=selectEvenly(player,playerBudget);
  return {
    detailed:[...detailedHostile,...detailedPlayer],
    simplified,
    suppressedPlayerCount:Math.max(0,player.length-detailedPlayer.length),
    logicalCount:projectiles.length,
  };
}

export function shouldEmitProjectileTrail(projectileId:number,logicalCount:number,reducedVfx:boolean):boolean {
  const budget=reducedVfx?PROJECTILE_TRAIL_BUDGET.reduced:PROJECTILE_TRAIL_BUDGET.normal;
  if(logicalCount<=budget)return true;
  const stride=Math.max(1,Math.ceil(logicalCount/budget));
  return Math.abs(projectileId)%stride===0;
}
