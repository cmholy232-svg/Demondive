import { FLOOR_Y, WIDTH } from './content';
import type { GateSide, Rect, RoomDefinition } from './types';

export type RoomTraversalFailure = 'no-surfaces' | 'entry-disconnected' | 'exit-disconnected' | 'no-entry-to-exit-route';

export interface RoomTraversalReport {
  valid: boolean;
  failures: RoomTraversalFailure[];
  entrySurfaceCount: number;
  exitSurfaceCount: number;
  reachableSurfaceCount: number;
}

export type RoomQualityFailure = 'missing-metadata'|'enemy-budget-exceeded'|'hazard-budget-exceeded'|'invalid-performance-weight'|'hazard-in-recovery-room';
export type RoomQualityWarning = 'high-density-human-review'|'mobile-review-required'|'contradictory-momentum-hazards';
export interface RoomQualityReport { valid:boolean;failures:RoomQualityFailure[];warnings:RoomQualityWarning[]; }

function horizontalGap(a: Rect, b: Rect): number {
  if (a.x + a.w < b.x) return b.x - (a.x + a.w);
  if (b.x + b.w < a.x) return a.x - (b.x + b.w);
  return 0;
}

export function baseMiloCanTraverse(from: Rect, to: Rect): boolean {
  const rise = from.y - to.y;
  const gap = horizontalGap(from, to);
  if (rise >= 0) return rise <= 275 && gap <= 340;
  return -rise <= 560 && gap <= 390;
}

function touchesGateLane(platform: Rect, side: GateSide): boolean {
  if (side === 'left') return platform.x <= 105 && platform.y >= 440 && platform.y <= FLOOR_Y + 25;
  if (side === 'right') return platform.x + platform.w >= WIDTH - 105 && platform.y >= 440 && platform.y <= FLOOR_Y + 25;
  if (side === 'top') return platform.y <= 185 && platform.x < 682 && platform.x + platform.w > 598;
  return platform.y >= FLOOR_Y - 35 && platform.x < 682 && platform.x + platform.w > 598;
}

export function validateRoomTraversal(room: Pick<RoomDefinition, 'platforms' | 'entrySide' | 'exitSide'>): RoomTraversalReport {
  const failures: RoomTraversalFailure[] = [];
  const surfaces = room.platforms.filter((platform) => platform.w >= 70);
  if (surfaces.length === 0) {
    return { valid:false, failures:['no-surfaces'], entrySurfaceCount:0, exitSurfaceCount:0, reachableSurfaceCount:0 };
  }

  const entry = room.entrySide ?? 'left';
  const exit = room.exitSide ?? 'right';
  const starts = surfaces.map((platform,index) => ({ platform,index })).filter(({platform}) => touchesGateLane(platform,entry)).map(({index}) => index);
  const targets = new Set(surfaces.map((platform,index) => ({ platform,index })).filter(({platform}) => touchesGateLane(platform,exit)).map(({index}) => index));
  if (starts.length === 0) failures.push('entry-disconnected');
  if (targets.size === 0) failures.push('exit-disconnected');
  if (failures.length > 0) {
    return { valid:false, failures, entrySurfaceCount:starts.length, exitSurfaceCount:targets.size, reachableSurfaceCount:0 };
  }

  const visited = new Set(starts);
  const queue = [...starts];
  let reachedExit = starts.some((index) => targets.has(index));
  while (queue.length > 0 && !reachedExit) {
    const current = queue.shift()!;
    for (let next = 0; next < surfaces.length; next += 1) {
      if (visited.has(next) || !baseMiloCanTraverse(surfaces[current], surfaces[next])) continue;
      visited.add(next);
      queue.push(next);
      if (targets.has(next)) reachedExit = true;
    }
  }
  if (!reachedExit) failures.push('no-entry-to-exit-route');
  return {
    valid:failures.length === 0,
    failures,
    entrySurfaceCount:starts.length,
    exitSurfaceCount:targets.size,
    reachableSurfaceCount:visited.size,
  };
}

export function validateRoomQuality(room:Pick<RoomDefinition,'type'|'hazards'|'spawns'|'quality'>):RoomQualityReport {
  const failures:RoomQualityFailure[]=[];const warnings:RoomQualityWarning[]=[];const metadata=room.quality;
  if(!metadata)return {valid:false,failures:['missing-metadata'],warnings};
  if(room.spawns.length>metadata.enemyBudget)failures.push('enemy-budget-exceeded');
  if(room.hazards.length>metadata.hazardBudget)failures.push('hazard-budget-exceeded');
  if(!Number.isFinite(metadata.performanceWeight)||metadata.performanceWeight<=0)failures.push('invalid-performance-weight');
  if(room.type==='recovery'&&room.hazards.some((hazard)=>hazard.damage>0))failures.push('hazard-in-recovery-room');
  if(metadata.densityClass==='high')warnings.push('high-density-human-review');
  if(metadata.mobileSuitability!=='safe')warnings.push('mobile-review-required');
  const kinds=new Set(room.hazards.map((hazard)=>hazard.type));if(kinds.has('ice')&&kinds.has('current'))warnings.push('contradictory-momentum-hazards');
  return {valid:failures.length===0,failures,warnings};
}
