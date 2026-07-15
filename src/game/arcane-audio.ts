import type { BoonId } from './types';

// D natural minor across a little over three octaves. The runtime folds these
// identities into playable inversions of the supplied D-minor blast sample.
export const ARCANE_ROOT_HZ = 146.83; // D3
export const D_MINOR_PITCH_CLASSES = [0,2,3,5,7,8,10] as const;
export const BOON_NOTE_SEMITONES: Readonly<Record<BoonId,number>> = {
  pyrra:0, maris:3, gaia:5, zephyra:7, flora:10,
  voltara:12, crya:14, luna:15, solara:17, belladonna:19,
  nerissa:22, roxyne:24, calyptra:26, isolde:27, somnia:29,
  vespera:31, aurelia:34, noctissa:36, lilith:38, seraphine:39,
};

export function boonNoteFrequency(id:BoonId,root=ARCANE_ROOT_HZ):number {
  return root*Math.pow(2,BOON_NOTE_SEMITONES[id]/12);
}

export function boonNoteLabel(id:BoonId):string {
  const midi=50+BOON_NOTE_SEMITONES[id]; // D3 = MIDI 50
  const names=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
  return `${names[midi%12]}${Math.floor(midi/12)-1}`;
}

export interface ArcaneVoice { id:BoonId; frequency:number; stacks:number; }

export function selectArcaneVoices(stacks:Record<BoonId,number>,shotIndex:number,maxVoices=6,featured?:BoonId):ArcaneVoice[] {
  const active=(Object.entries(stacks) as [BoonId,number][]).filter(([,count])=>count>0);
  if(!active.length)return [];
  const total=active.reduce((sum,[,count])=>sum+count,0);
  const voiceCount=Math.min(active.length,maxVoices,Math.max(1,1+Math.floor(Math.log2(total+1))));
  const start=((shotIndex%active.length)+active.length)%active.length;
  const ordered=Array.from({length:active.length},(_,index)=>active[(start+index)%active.length]);
  if(featured&&stacks[featured]>0){const index=ordered.findIndex(([id])=>id===featured);if(index>0)ordered.unshift(...ordered.splice(index,1));}
  return ordered.slice(0,voiceCount).map(([id,count])=>({id,frequency:boonNoteFrequency(id),stacks:count}));
}

export function arcaneSoundTier(stacks:Record<BoonId,number>):1|2|3|4|5 {
  const total=(Object.values(stacks) as number[]).reduce((sum,count)=>sum+count,0);
  if(total>=12)return 5;
  if(total>=8)return 4;
  if(total>=5)return 3;
  if(total>=2)return 2;
  return 1;
}

export function arcaneHarmonyLabel(stacks:Record<BoonId,number>):string {
  const total=(Object.values(stacks) as number[]).reduce((sum,count)=>sum+count,0);
  const tier=arcaneSoundTier(stacks);
  if(tier===1)return 'D-MINOR ARCANE SAMPLE · DRY';
  if(tier===2)return 'D-MINOR DYAD · AWAKENED';
  if(tier===3)return 'D-MINOR CHORD · CHARGED';
  if(tier===4)return 'D-MINOR CHORUS · ASCENDANT';
  return `D-MINOR PRISM · ${Math.min(7,1+Math.floor(Math.log2(total+1)))} VOICES · UNBOUND`;
}
