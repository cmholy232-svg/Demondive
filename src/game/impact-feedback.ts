import type { FeedbackTier } from './feedback-policy';

export const PARTICLE_EFFECT_BUDGET = Object.freeze({normal:460,reduced:190});
export const DAMAGE_TEXT_BUDGET = Object.freeze({normal:72,reduced:32});

export interface ImpactFeedback {
  tier:FeedbackTier;
  hitPauseSeconds:number;
  cameraImpulse:number;
  particleCount:number;
  particleSpeed:number;
}

export function enemyHitFeedback(amount:number,maxHealth:number):ImpactFeedback {
  const relative=amount/Math.max(1,maxHealth);
  if(amount>=80||relative>=.2)return{tier:3,hitPauseSeconds:.055,cameraImpulse:3.5,particleCount:12,particleSpeed:260};
  if(amount>=30||relative>=.08)return{tier:2,hitPauseSeconds:.026,cameraImpulse:1.5,particleCount:8,particleSpeed:210};
  return{tier:2,hitPauseSeconds:.012,cameraImpulse:.6,particleCount:6,particleSpeed:180};
}

export function enemyDefeatFeedback(category:'normal'|'elite'|'miniboss'|'boss'):ImpactFeedback&{screenFlash:number} {
  if(category==='boss')return{tier:4,hitPauseSeconds:.082,cameraImpulse:13,particleCount:60,particleSpeed:600,screenFlash:.72};
  if(category==='miniboss')return{tier:3,hitPauseSeconds:.06,cameraImpulse:9,particleCount:46,particleSpeed:520,screenFlash:.42};
  if(category==='elite')return{tier:3,hitPauseSeconds:.04,cameraImpulse:6,particleCount:30,particleSpeed:390,screenFlash:.18};
  return{tier:2,hitPauseSeconds:.024,cameraImpulse:4,particleCount:18,particleSpeed:300,screenFlash:0};
}

/** High-pressure scenes retain every logical hit while sampling only repeated accents. */
export function shouldEmitImpactAccent(sequence:number,particleCount:number,reducedVfx:boolean,tier:FeedbackTier):boolean {
  if(tier>=3)return true;
  const budget=reducedVfx?PARTICLE_EFFECT_BUDGET.reduced:PARTICLE_EFFECT_BUDGET.normal;
  if(particleCount<budget*.7)return true;
  const stride=Math.max(2,Math.ceil(particleCount/(budget*.45)));
  return Math.abs(Math.floor(sequence))%stride===0;
}
