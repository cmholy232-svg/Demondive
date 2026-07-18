import type { GateSide, Hazard, Rect, RoomQualityMetadata, RoomType } from './types';

export interface RoomGeometrySummary { platforms:Rect[];hazards:Hazard[];spawns:unknown[]; }

function clampTier(value:number):RoomQualityMetadata['difficultyTier'] {
  return Math.max(1,Math.min(10,Math.round(value))) as RoomQualityMetadata['difficultyTier'];
}

export function buildRoomQualityMetadata(type:RoomType,depth:number,difficulty:number,entry:GateSide,exit:GateSide,geometry:RoomGeometrySummary):RoomQualityMetadata {
  const hazardKinds=new Set(geometry.hazards.map((hazard)=>hazard.type));
  const vertical=entry==='top'||entry==='bottom'||exit==='top'||exit==='bottom';
  const intendedMovement=hazardKinds.has('bubble')?'air-control':hazardKinds.has('ice')||hazardKinds.has('current')?'wave-route':vertical?'vertical':geometry.platforms.length>=7?'mixed':'grounded';
  const densityScore=geometry.platforms.length+geometry.hazards.length*2+geometry.spawns.length*1.5;
  const densityClass=densityScore>=20?'high':densityScore>=12?'medium':'low';
  const recoveryLevel=type==='recovery'?'full':type==='traversal'||type==='cache'?'partial':'none';
  const incompatible:string[]=[];
  if(hazardKinds.has('ice')&&hazardKinds.has('current'))incompatible.push('frenzied');
  if(hazardKinds.has('mirror'))incompatible.push('projectile-swarm');
  if(vertical)incompatible.push('ground-lock');
  const compatibleModifiers=['armored','volatile','frenzied','homing','summoner'].filter((modifier)=>!incompatible.includes(modifier));
  const performanceWeight=Math.round((geometry.platforms.length+geometry.hazards.length*3+geometry.spawns.length*5)*10)/10;
  const mobileSuitability=densityClass==='high'||performanceWeight>70?'review':vertical&&geometry.hazards.length>4?'unsuitable':'safe';
  return {intendedMovement,difficultyTier:clampTier(1+difficulty/2),enemyBudget:geometry.spawns.length,hazardBudget:geometry.hazards.length,densityClass,traversalType:`${entry}-to-${exit}`,recoveryLevel,compatibleModifiers,compatibleBiomes:[Math.max(1,Math.min(9,Math.floor(depth)))],mobileSuitability,performanceWeight};
}
