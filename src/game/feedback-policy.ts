export type FeedbackTier = 1|2|3|4;
export type ProceduralSfxEvent = 'step'|'land'|'jump'|'doubleJump'|'dash'|'wavedash'|'waveland'|'perfectDodge'|'fire'|'special'|'hurt'|'pickup'|'boon'|'enemyHit'|'enemyShoot'|'enemyDown'|'bossDown';

export interface FeedbackBudget {
  tier:FeedbackTier;
  hitStopMs:number;
  cameraImpulse:number;
  fullScreenFlash:boolean;
}

export const ACTION_FEEDBACK_BUDGETS = Object.freeze({
  step:{tier:1,hitStopMs:0,cameraImpulse:0,fullScreenFlash:false},
  jump:{tier:1,hitStopMs:0,cameraImpulse:.5,fullScreenFlash:false},
  land:{tier:1,hitStopMs:0,cameraImpulse:.75,fullScreenFlash:false},
  fire:{tier:1,hitStopMs:0,cameraImpulse:0,fullScreenFlash:false},
  dash:{tier:2,hitStopMs:0,cameraImpulse:2,fullScreenFlash:false},
  wavedash:{tier:2,hitStopMs:0,cameraImpulse:2.5,fullScreenFlash:false},
  waveland:{tier:2,hitStopMs:0,cameraImpulse:2.25,fullScreenFlash:false},
  perfectDodge:{tier:3,hitStopMs:45,cameraImpulse:4,fullScreenFlash:false},
  enemyHit:{tier:2,hitStopMs:16,cameraImpulse:1.5,fullScreenFlash:false},
  enemyDown:{tier:2,hitStopMs:24,cameraImpulse:2.5,fullScreenFlash:false},
  hurt:{tier:3,hitStopMs:36,cameraImpulse:6,fullScreenFlash:false},
  special:{tier:3,hitStopMs:42,cameraImpulse:7,fullScreenFlash:false},
  boon:{tier:3,hitStopMs:32,cameraImpulse:5,fullScreenFlash:false},
  bossDown:{tier:4,hitStopMs:82,cameraImpulse:13,fullScreenFlash:true},
} satisfies Record<string,FeedbackBudget>);

export interface ProceduralSfxProfile {
  startHz:number;
  endHz:number;
  durationSeconds:number;
  waveform:OscillatorType;
  gain:number;
  noiseMix:number;
  pitchVariationCents:number;
  secondaryMix:number;
}

export const PROCEDURAL_SFX_PROFILES:Readonly<Record<ProceduralSfxEvent,ProceduralSfxProfile>> = Object.freeze({
  step:{startHz:105,endHz:72,durationSeconds:.055,waveform:'triangle',gain:.035,noiseMix:.18,pitchVariationCents:45,secondaryMix:0},
  land:{startHz:170,endHz:62,durationSeconds:.11,waveform:'triangle',gain:.07,noiseMix:.32,pitchVariationCents:25,secondaryMix:.18},
  jump:{startHz:255,endHz:470,durationSeconds:.09,waveform:'square',gain:.065,noiseMix:.06,pitchVariationCents:28,secondaryMix:.12},
  doubleJump:{startHz:390,endHz:760,durationSeconds:.14,waveform:'triangle',gain:.085,noiseMix:.08,pitchVariationCents:25,secondaryMix:.22},
  dash:{startHz:210,endHz:64,durationSeconds:.16,waveform:'sawtooth',gain:.095,noiseMix:.28,pitchVariationCents:34,secondaryMix:.2},
  wavedash:{startHz:310,endHz:74,durationSeconds:.19,waveform:'sawtooth',gain:.11,noiseMix:.23,pitchVariationCents:24,secondaryMix:.28},
  waveland:{startHz:470,endHz:105,durationSeconds:.16,waveform:'triangle',gain:.105,noiseMix:.2,pitchVariationCents:22,secondaryMix:.32},
  perfectDodge:{startHz:680,endHz:1280,durationSeconds:.22,waveform:'sine',gain:.12,noiseMix:.04,pitchVariationCents:14,secondaryMix:.42},
  fire:{startHz:420,endHz:138,durationSeconds:.075,waveform:'square',gain:.072,noiseMix:.12,pitchVariationCents:36,secondaryMix:.18},
  special:{startHz:190,endHz:720,durationSeconds:.28,waveform:'sawtooth',gain:.135,noiseMix:.18,pitchVariationCents:18,secondaryMix:.32},
  hurt:{startHz:185,endHz:54,durationSeconds:.19,waveform:'sawtooth',gain:.15,noiseMix:.38,pitchVariationCents:24,secondaryMix:.24},
  pickup:{startHz:520,endHz:980,durationSeconds:.13,waveform:'sine',gain:.08,noiseMix:0,pitchVariationCents:18,secondaryMix:.25},
  boon:{startHz:230,endHz:980,durationSeconds:.52,waveform:'triangle',gain:.13,noiseMix:.05,pitchVariationCents:12,secondaryMix:.4},
  enemyHit:{startHz:285,endHz:88,durationSeconds:.075,waveform:'triangle',gain:.092,noiseMix:.42,pitchVariationCents:52,secondaryMix:.16},
  enemyShoot:{startHz:590,endHz:155,durationSeconds:.105,waveform:'sawtooth',gain:.076,noiseMix:.1,pitchVariationCents:46,secondaryMix:.2},
  enemyDown:{startHz:210,endHz:62,durationSeconds:.15,waveform:'square',gain:.115,noiseMix:.46,pitchVariationCents:48,secondaryMix:.24},
  bossDown:{startHz:125,endHz:32,durationSeconds:.58,waveform:'sawtooth',gain:.165,noiseMix:.5,pitchVariationCents:16,secondaryMix:.42},
});

export function sfxPitchMultiplier(event:ProceduralSfxEvent,sequence:number):number {
  const cents=PROCEDURAL_SFX_PROFILES[event].pitchVariationCents;
  const signed=((Math.abs(Math.floor(sequence))*47)%101)/100*2-1;
  return Math.pow(2,signed*cents/1200);
}
