import type { RoomType } from './types';

export interface ThreatScale {
  health: number;
  damage: number;
  cadence: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function campaignThreat(stage: number, roomIndex: number, roomCount: number, roomType: RoomType): ThreatScale {
  const normalizedStage = clamp(Math.floor(stage), 1, 10);
  const progress = roomCount <= 1 ? 0 : clamp(roomIndex / (roomCount - 1), 0, 1);
  const challenge = roomType === 'elite' ? 1 : roomType === 'miniboss' ? .45 : roomType === 'boss' ? .35 : 0;
  return {
    health: 1.08 + (normalizedStage - 1) * .18 + progress * .22 + challenge * .22,
    damage: 1.03 + (normalizedStage - 1) * .10 + progress * .12 + challenge * .08,
    cadence: 1 + (normalizedStage - 1) * .055 + progress * .08 + challenge * .10,
  };
}

export function deepDiveThreat(roomIndex: number, roomType: RoomType): ThreatScale {
  const depth = Math.max(1, Math.floor(roomIndex));
  const challenge = roomType === 'elite' ? 1 : roomType === 'miniboss' ? .55 : roomType === 'boss' ? .75 : 0;
  return {
    health: clamp(1.08 + depth * .072 + depth * depth * .00034 + challenge * .30, 1, 12),
    damage: clamp(1.02 + depth * .034 + depth * depth * .000055 + challenge * .12, 1, 5),
    cadence: clamp(1 + depth * .008 + challenge * .10, 1, 1.9),
  };
}

export function desiredEnemyCount(type: RoomType, difficulty: number, depth: number): number {
  if (type === 'traversal' || type === 'recovery' || type === 'cache') return 0;
  const stagePressure = Math.max(0, Math.floor(depth) - 1);
  const roomPressure = Math.floor(Math.max(0, difficulty - 1) / 3);
  const challenge = type === 'elite' ? 2 : 0;
  return Math.min(10, 3 + stagePressure + roomPressure + challenge);
}
