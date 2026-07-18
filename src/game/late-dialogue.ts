import type { DialogueBeat } from './dialogue';

const line=(id:string,speaker:string,text:string,color:string,expression:NonNullable<DialogueBeat['lines'][number]['expression']>='neutral',camera:NonNullable<DialogueBeat['lines'][number]['camera']>='speaker')=>({id,speaker,text,color,expression,camera});

export const LATE_DIALOGUE_BEATS:Record<string,DialogueBeat>={
  level_four_entrance:{id:'level_four_entrance',title:'The House Explains the Odds',location:'The Thunder Jackpot',once:true,flag:'level_four_entrance_seen',lines:[
    line('l4e_01','Calyptra','Every danger is posted. Every reward is real. Losing is still your decision.','#ffe05a','amused','boss'),
    line('l4e_02','Milo','Finally, a casino with an ethics department.','#d8e4ee','dry'),
    line('l4e_03','Luna','Read the table before you touch the chips. The House adores confidence.','#c7a0ff','warning','wide'),
  ]},
  lady_luckless_intro:{id:'lady_luckless_intro',title:'The Rules Are Posted',location:'Thunder Jackpot · Gate Table',once:false,flag:'lady_luckless_intro_seen',lines:[
    line('l4m_01','Lady Luckless','Rule one: red cards rush. Rule two arrives when you earn it.','#f46cff','hostile','boss'),
    line('l4m_02','Milo','Weaponized terms and conditions. Great.','#d8e4ee','dry'),
  ]},
  calyptra_intro:{id:'calyptra_intro',title:'One More Spin',location:'Calyptra’s Roulette Throne',once:false,flag:'calyptra_intro_seen',lines:[
    line('l4b_01','Calyptra','You do not hate chance, Milo. You hate knowing the choice was yours.','#ffe05a','amused','boss'),
    line('l4b_02','Milo','I can hate two things. I contain multitudes.','#d8e4ee','dry'),
    line('l4b_03','Calyptra','Then place every one of them on the table.','#ffe05a','hostile','boss'),
  ]},
  level_four_aftermath:{id:'level_four_aftermath',title:'Luck Is Not Permission',location:'Thunder Jackpot · Payout',once:true,flag:'level_four_complete',lines:[
    line('l4a_01','Calyptra','You won. Do not insult yourself by calling it luck.','#ffe05a','neutral','boss'),
    line('l4a_02','Milo','I made choices while terrified. That counts?','#d8e4ee','wary'),
    line('l4a_03','Luna','That is when choices count most.','#c7a0ff','neutral','wide'),
  ],mutation:{flags:['risk_chosen_knowingly']}},

  level_five_entrance:{id:'level_five_entrance',title:'Nothing Changes Here',location:'The Frozen Basilica',once:true,flag:'level_five_entrance_seen',lines:[
    line('l5e_01','Isolde','Nothing rots here. Nothing leaves. Nothing has to become unfamiliar.','#8ee7ff','neutral','boss'),
    line('l5e_02','Milo','That sounded comforting until the third sentence.','#d8e4ee','dry'),
    line('l5e_03','Solara','Warmth changes things. That is why she fears it.','#ffd66b','warning','wide'),
  ]},
  memory_golem_intro:{id:'memory_golem_intro',title:'Recollection With Weight',location:'Frozen Basilica · Reliquary',once:false,flag:'memory_golem_intro_seen',lines:[
    line('l5m_01','Memory Golem','FIRST IMPACT RECORDED. SECOND IMPACT SCHEDULED.','#b9f6ff','hostile','boss'),
    line('l5m_02','Milo','A calendar invite would have been fine.','#d8e4ee','dry'),
  ]},
  isolde_intro:{id:'isolde_intro',title:'Stay Exactly Like This',location:'Isolde’s Preserved Choir',once:false,flag:'isolde_intro_seen',lines:[
    line('l5b_01','Isolde','Stay. I will keep the version of you that still believes he can fix everything.','#8ee7ff','amused','boss'),
    line('l5b_02','Milo','He sounds exhausting. You can have the photograph.','#d8e4ee','dry'),
    line('l5b_03','Isolde','I do not preserve photographs. I preserve exits.','#8ee7ff','hostile','boss'),
  ]},
  level_five_aftermath:{id:'level_five_aftermath',title:'Thaw Is Not Loss',location:'Frozen Basilica · Thaw',once:true,flag:'level_five_complete',lines:[
    line('l5a_01','Isolde','If it changes, you may lose it.','#8ee7ff','wary','boss'),
    line('l5a_02','Milo','If it never changes, I never really had it.','#d8e4ee','neutral'),
    line('l5a_03','Solara','Leave the door open. Let the air decide the rest.','#ffd66b','neutral','wide'),
  ],mutation:{flags:['preservation_released']}},

  level_six_entrance:{id:'level_six_entrance',title:'Vacancy Forever',location:'The Forever Motel',once:true,flag:'level_six_entrance_seen',lines:[
    line('l6e_01','Somnia','Your room is ready. No calls. No deadlines. No morning.','#bc7cff','amused','boss'),
    line('l6e_02','Milo','Can I see the cancellation policy?','#d8e4ee','dry'),
    line('l6e_03','Aurelia','Every door returns here. Keep track of what repeats.','#ffc75a','warning','wide'),
  ]},
  dream_girl_intro:{id:'dream_girl_intro',title:'Everything You Asked For',location:'Forever Motel · Honeymoon Suite',once:false,flag:'dream_girl_intro_seen',lines:[
    line('l6m_01','Dream Girl','I can be whatever makes you stop looking for the door.','#ff9bd7','amused','boss'),
    line('l6m_02','Milo','That is romantic in a hostage-situation way.','#d8e4ee','dry'),
    line('l6m_03','Aurelia','Four anchors hold the fantasy. Break those, not the promise.','#ffc75a','warning','wide'),
  ]},
  somnia_intro:{id:'somnia_intro',title:'Do Not Wake Up',location:'Somnia’s Endless Suite',once:false,flag:'somnia_intro_seen',lines:[
    line('l6b_01','Somnia','You could wake to the same mess. Or sleep until it stops belonging to you.','#bc7cff','amused','boss'),
    line('l6b_02','Milo','That is not how mess works. I have conducted research.','#d8e4ee','dry'),
    line('l6b_03','Somnia','Then dream of someone who cleans.','#bc7cff','hostile','boss'),
  ]},
  level_six_aftermath:{id:'level_six_aftermath',title:'Check Out',location:'Forever Motel · Morning Call',once:true,flag:'level_six_complete',lines:[
    line('l6a_01','Somnia','The door will still be here when you are tired again.','#bc7cff','wary','boss'),
    line('l6a_02','Milo','Probably. I still have to be the one who opens it.','#d8e4ee','neutral'),
    line('l6a_03','Aurelia','Then take the key. Do not give it the steering wheel.','#ffc75a','neutral','wide'),
  ],mutation:{flags:['avoidance_named']}},

  level_seven_entrance:{id:'level_seven_entrance',title:'A Better Face',location:'City of a Thousand Faces',once:true,flag:'level_seven_entrance_seen',lines:[
    line('l7e_01','Vespera','Every window shows the Milo people would have preferred.','#8ff7ff','amused','boss'),
    line('l7e_02','Milo','Do any show one with health insurance?','#d8e4ee','dry'),
    line('l7e_03','Noctissa','Watch the broken edge. Reflections lie symmetrically.','#9b75ff','warning','wide'),
  ]},
  better_milo_intro:{id:'better_milo_intro',title:'You, But Easier',location:'Thousand Faces · Model District',once:false,flag:'better_milo_intro_seen',lines:[
    line('l7m_01','Better Milo','I use the same tools. I simply do not waste them.','#d06cff','amused','boss'),
    line('l7m_02','Milo','You also talk like a productivity app. Advantage: me.','#d8e4ee','dry'),
  ]},
  vespera_intro:{id:'vespera_intro',title:'Every Face Answers',location:'Vespera’s Mirror Court',once:false,flag:'vespera_intro_seen',lines:[
    line('l7b_01','Vespera','Choose a face. I can make everyone agree it was always yours.','#8ff7ff','amused','boss'),
    line('l7b_02','Milo','I barely maintain this one. I am not adding subscriptions.','#d8e4ee','dry'),
    line('l7b_03','Vespera','Then shatter with it.','#8ff7ff','hostile','boss'),
  ]},
  level_seven_aftermath:{id:'level_seven_aftermath',title:'Keep Your Own Face',location:'Mirror Court · Original Light',once:true,flag:'level_seven_complete',lines:[
    line('l7a_01','Vespera','They will still compare you.','#8ff7ff','wary','boss'),
    line('l7a_02','Milo','They can form a committee. I am busy.','#d8e4ee','dry'),
    line('l7a_03','Noctissa','Good. Lilith hates arriving second to self-respect.','#9b75ff','amused','wide'),
  ],mutation:{flags:['own_face_kept']}},

  level_eight_entrance:{id:'level_eight_entrance',title:'The Queen’s Claim',location:'Lilith’s Throne',once:true,flag:'level_eight_entrance_seen',lines:[
    line('l8e_01','Lilith','Nine doors ago, I prepared a place for you. You took the scenic route.','#ff4f9a','amused','boss'),
    line('l8e_02','Milo','I stopped for several life-altering arguments. Parking was terrible.','#d8e4ee','dry'),
    line('l8e_03','Lilith','Kneel. I will call the delay character development.','#ff4f9a','hostile','boss'),
  ]},
  daughters_intro:{id:'daughters_intro',title:'Four Ways to Obey',location:'Lilith’s Throne · Royal Relay',once:false,flag:'daughters_intro_seen',lines:[
    line('l8m_01','Lilith’s Daughters','ATTACK. DEFEND. MOVE. SPEND. THE QUEEN PROVIDES YOUR ROLE.','#e9a1ff','hostile','boss'),
    line('l8m_02','Milo','I have always tested poorly in group projects.','#d8e4ee','dry'),
  ]},
  lilith_intro:{id:'lilith_intro',title:'Your Room Was Ready',location:'The Infernal Throne',once:false,flag:'lilith_intro_seen',lines:[
    line('l8b_01','Lilith','Every lord offered a softer cage. I offer the throne beside mine.','#ff4f9a','amused','boss'),
    line('l8b_02','Milo','Does it come with responsibilities? That feels like a trap.','#d8e4ee','dry'),
    line('l8b_03','Lilith','It comes with permission to stop apologizing for what you want.','#ff4f9a','hostile','boss'),
    line('l8b_04','Milo','I need better wants. Not permission.','#d8e4ee','neutral'),
  ]},
  level_eight_aftermath:{id:'level_eight_aftermath',title:'The Road Below the Throne',location:'Lilith’s Throne · Broken Claim',once:true,flag:'level_eight_complete',lines:[
    line('l8a_01','Lilith','You think refusing me makes you free?','#ff4f9a','wary','boss'),
    line('l8a_02','Milo','No. It makes the next mistake mine.','#d8e4ee','neutral'),
    line('l8a_03','Lilith','Then meet the mistake that has been waiting underneath you.','#ff4f9a','amused','wide'),
  ],mutation:{flags:['lilith_claim_broken']}},

  level_nine_entrance:{id:'level_nine_entrance',title:'The Self Below',location:'The Self Below',once:true,flag:'level_nine_entrance_seen',lines:[
    line('l9e_01','The Hollow','You brought everyone. You always bring everyone when you do not want to be alone with me.','#d6c7ff','neutral','wide'),
    line('l9e_02','Milo','I brought firepower. The emotional support is incidental.','#d8e4ee','dry'),
    line('l9e_03','Seraphine','It knows every borrowed voice. Save one that is yours.','#f3ecff','warning','wide'),
  ]},
  boss_rush_intro:{id:'boss_rush_intro',title:'Every Lord Remembered',location:'The Self Below · Memory Hall',once:false,flag:'boss_rush_intro_seen',lines:[
    line('l9m_01','Boss Rush Herald','SEVEN CLAIMS RECORDED. SEVEN REFUSALS REHEARSED.','#b9aec9','hostile','boss'),
    line('l9m_02','Milo','Good. I hate learning new material under pressure.','#d8e4ee','dry'),
  ]},
  hollow_intro:{id:'hollow_intro',title:'Everything Borrowed',location:'The Room Under Milo’s Room',once:false,flag:'hollow_intro_seen',lines:[
    line('l9b_01','The Hollow','First I will be everything you collected. Then everything you are without it.','#d6c7ff','neutral','boss'),
    line('l9b_02','Milo','And after that?','#d8e4ee','wary'),
    line('l9b_03','The Hollow','After that, you stop pretending I am the enemy.','#f3ecff','neutral','boss'),
  ]},
  level_nine_aftermath:{id:'level_nine_aftermath',title:'Choose Morning',location:'The Self Below · Accepted',once:true,flag:'level_nine_complete',lines:[
    line('l9a_01','Milo','You are not the part I have to kill. You are the part I have to stop abandoning.','#d8e4ee','neutral'),
    line('l9a_02','The Hollow','The room will still be messy.','#d6c7ff','wary','boss'),
    line('l9a_03','Milo','Yeah. I think I will clean one corner.','#d8e4ee','dry'),
    line('l9a_04','Seraphine','Morning, then. Bring everyone.','#f3ecff','amused','wide'),
  ],mutation:{flags:['hollow_accepted','morning_chosen']}},
};
