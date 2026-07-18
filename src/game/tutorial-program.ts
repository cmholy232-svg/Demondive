export type ThreeRoomTutorialAction =
  |'move'|'jump'|'neutralFire'|'enemyDefeated'
  |'boonCollected'|'modifiedFire'|'special'
  |'dash'|'wavedash'|'waveland';

export interface TutorialRoomProgram {
  id:'fundamentals'|'arcana'|'expression';
  title:string;
  teaches:string[];
  required:ThreeRoomTutorialAction[];
  anyOf?:ThreeRoomTutorialAction[];
  completionCopy:string;
}

export const THREE_ROOM_TUTORIAL:readonly TutorialRoomProgram[] = Object.freeze([
  {
    id:'fundamentals',title:'Room 1 · Move, Jump, Fire',
    teaches:['ordinary movement before dash','variable jump','neutral Arcane Bolt','defeat one basic enemy'],
    required:['move','jump','neutralFire','enemyDefeated'],
    completionCopy:'Move, jump, fire, and defeat the training demon.',
  },
  {
    id:'arcana',title:'Room 2 · Boons Change the Bolt',
    teaches:['collect a boon','passive remains stacked','Arcane modifier changes the base shot','Special is separately equipped'],
    required:['boonCollected','modifiedFire','special'],
    completionCopy:'Take Pyrra, fire the changed Bolt, then use her Special.',
  },
  {
    id:'expression',title:'Room 3 · Dash Into Expression',
    teaches:['dash','wavedash','waveland','advanced movement is optional mastery, not an onboarding wall'],
    required:['dash'],anyOf:['wavedash','waveland'],
    completionCopy:'Dash, then land one wave conversion. Either wavedash or waveland opens the exit.',
  },
]);

export interface ThreeRoomTutorialState {
  roomIndex:number;
  observed:ThreeRoomTutorialAction[];
  complete:boolean;
}

export const initialThreeRoomTutorialState=():ThreeRoomTutorialState=>({roomIndex:0,observed:[],complete:false});

export function tutorialRoomComplete(room:TutorialRoomProgram,observed:readonly ThreeRoomTutorialAction[]):boolean {
  const actions=new Set(observed);
  return room.required.every(action=>actions.has(action))&&(!room.anyOf||room.anyOf.some(action=>actions.has(action)));
}

export function recordThreeRoomTutorialAction(state:ThreeRoomTutorialState,action:ThreeRoomTutorialAction):ThreeRoomTutorialState {
  if(state.complete)return state;
  const room=THREE_ROOM_TUTORIAL[state.roomIndex];
  if(!room)return{...state,complete:true};
  const relevant=room.required.includes(action)||room.anyOf?.includes(action);
  const observed=relevant&&!state.observed.includes(action)?[...state.observed,action]:state.observed;
  if(!tutorialRoomComplete(room,observed))return{...state,observed};
  const nextRoom=state.roomIndex+1;
  return nextRoom>=THREE_ROOM_TUTORIAL.length
    ?{roomIndex:THREE_ROOM_TUTORIAL.length-1,observed,complete:true}
    :{roomIndex:nextRoom,observed:[],complete:false};
}
