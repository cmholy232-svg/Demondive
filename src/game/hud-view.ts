import type { BoonId } from './types';

export interface HudPriorityInput {
  xpRevealSeconds:number;
  currencyRevealSeconds:number;
  wagerActive:boolean;
  roomCleared:boolean;
  roomIntroSeconds:number;
  dominantBoon:BoonId|null;
  attachedBoons:readonly BoonId[];
  activeBoonCount:number;
  specialCooldownSeconds:number;
  specialEnergyCost:number;
  currentEnergy:number;
}

export interface HudPriorityView {
  showXp:boolean;
  showCurrency:boolean;
  showRoomMap:boolean;
  combatBoonIds:BoonId[];
  hiddenBoonCount:number;
  specialState:'ready'|'cooldown'|'needs-energy';
}

export function buildHudPriorityView(input:HudPriorityInput):HudPriorityView {
  const combatBoonIds=[input.dominantBoon,...input.attachedBoons].filter((id,index,values):id is BoonId=>Boolean(id)&&values.indexOf(id)===index).slice(0,3);
  return {
    showXp:input.xpRevealSeconds>0,
    showCurrency:input.currencyRevealSeconds>0||input.wagerActive,
    showRoomMap:input.roomCleared||input.roomIntroSeconds>0,
    combatBoonIds,
    hiddenBoonCount:Math.max(0,input.activeBoonCount-combatBoonIds.length),
    specialState:input.specialCooldownSeconds>0?'cooldown':input.currentEnergy<input.specialEnergyCost?'needs-energy':'ready',
  };
}
