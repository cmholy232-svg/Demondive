import { FLOOR_Y, WIDTH } from './content';
import type { RoomDefinition } from './types';

const ground={x:0,y:FLOOR_Y,w:WIDTH,h:70};
const exit={x:WIDTH-72,y:FLOOR_Y-150,w:72,h:150};

export const THREE_ROOM_TUTORIAL_ROOMS:readonly RoomDefinition[] = Object.freeze([
  {
    name:'Pyrra’s Crash Course I',subtitle:'Stand Before You Fly',type:'combat',theme:'alley',
    platforms:[ground,{x:255,y:510,w:190,h:22},{x:555,y:425,w:190,h:22}],hazards:[],
    spawns:[{type:'imp',x:920,y:FLOOR_Y-66}],playerStart:{x:105,y:FLOOR_Y-82},exit,
    entrySide:'left',exitSide:'right',mapX:0,mapY:0,stageDepth:1,complexity:1,
    objective:'Move, jump, fire the neutral Arcane Bolt, and defeat the training demon',rewardKind:'none',danger:1,seedKey:'tutorial-fundamentals',
  },
  {
    name:'Pyrra’s Crash Course II',subtitle:'One Bolt, Three Gifts',type:'traversal',theme:'boiler',
    platforms:[ground,{x:305,y:500,w:210,h:22},{x:785,y:500,w:210,h:22}],hazards:[],spawns:[],
    playerStart:{x:105,y:FLOOR_Y-82},exit,entrySide:'left',exitSide:'right',mapX:1,mapY:0,stageDepth:1,complexity:1,
    objective:'Collect Pyrra, fire the changed Bolt, then use Flame Nova',rewardKind:'none',danger:1,seedKey:'tutorial-arcana',
  },
  {
    name:'Pyrra’s Crash Course III',subtitle:'Expression, Not Permission',type:'traversal',theme:'foundry',
    platforms:[ground,{x:245,y:500,w:160,h:22},{x:465,y:430,w:170,h:22},{x:705,y:500,w:170,h:22}],hazards:[],spawns:[],
    playerStart:{x:105,y:FLOOR_Y-82},exit,entrySide:'left',exitSide:'right',mapX:2,mapY:0,stageDepth:1,complexity:2,
    objective:'Dash, then convert one landing into either a wavedash or waveland',rewardKind:'none',danger:1,seedKey:'tutorial-expression',
  },
]);
