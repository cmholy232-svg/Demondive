export type CampaignStoryTrigger='entrance'|'miniboss-intro'|'boss-intro'|'aftermath';

export interface CampaignStoryPlanBeat {
  id:string;
  depth:4|5|6|7|8|9;
  trigger:CampaignStoryTrigger;
  title:string;
  cast:string[];
  purpose:string;
  canonRequirements:string[];
}

const level=(depth:CampaignStoryPlanBeat['depth'],entries:Array<Omit<CampaignStoryPlanBeat,'depth'>>):CampaignStoryPlanBeat[]=>entries.map(entry=>({...entry,depth}));

export const LATE_CAMPAIGN_STORY_PLAN:readonly CampaignStoryPlanBeat[] = Object.freeze([
  ...level(4,[
    {id:'level_four_entrance',trigger:'entrance',title:'The House Explains the Odds',cast:['Milo','Luna','Calyptra'],purpose:'Introduce disclosed risk and the casino kingdom.',canonRequirements:['Gold communicates value, not hidden danger.','Calyptra is a Demon Lord, not a human croupier.']},
    {id:'lady_luckless_intro',trigger:'miniboss-intro',title:'The Rules Are Posted',cast:['Milo','Lady Luckless'],purpose:'Teach that her rule changes are readable and fair.',canonRequirements:['No surprise rule outside a telegraph.']},
    {id:'calyptra_intro',trigger:'boss-intro',title:'One More Spin',cast:['Milo','Calyptra'],purpose:'Frame risk as agency rather than random punishment.',canonRequirements:['Calyptra owns the game but discloses the wager.']},
    {id:'level_four_aftermath',trigger:'aftermath',title:'Luck Is Not Permission',cast:['Milo','Calyptra','Luna'],purpose:'Unlock Calyptra and carry the build toward preservation.',canonRequirements:['Milo chooses the next risk knowingly.']},
  ]),
  ...level(5,[
    {id:'level_five_entrance',trigger:'entrance',title:'Nothing Changes Here',cast:['Milo','Solara','Isolde'],purpose:'Introduce preservation as fear disguised as care.',canonRequirements:['The Basilica is frozen memory, not generic snow.']},
    {id:'memory_golem_intro',trigger:'miniboss-intro',title:'Recollection With Weight',cast:['Milo','Memory Golem'],purpose:'Disclose delayed and repeated attacks.',canonRequirements:['Memory attacks repeat readable prior patterns.']},
    {id:'isolde_intro',trigger:'boss-intro',title:'Stay Exactly Like This',cast:['Milo','Isolde'],purpose:'Challenge the fantasy of being safely unchanged.',canonRequirements:['Isolde remains an unmistakable Demon Lord.']},
    {id:'level_five_aftermath',trigger:'aftermath',title:'Thaw Is Not Loss',cast:['Milo','Isolde','Solara'],purpose:'Unlock Isolde and move toward sleep/avoidance.',canonRequirements:['Preservation breaks without mocking grief.']},
  ]),
  ...level(6,[
    {id:'level_six_entrance',trigger:'entrance',title:'Vacancy Forever',cast:['Milo','Aurelia','Somnia'],purpose:'Introduce comfortable avoidance and false exits.',canonRequirements:['The motel is uncanny through repetition, not random clutter.']},
    {id:'dream_girl_intro',trigger:'miniboss-intro',title:'Everything You Asked For',cast:['Milo','Dream Girl'],purpose:'Explain anchors and indirect vulnerability.',canonRequirements:['The four fantasy anchors block direct damage.']},
    {id:'somnia_intro',trigger:'boss-intro',title:'Do Not Wake Up',cast:['Milo','Somnia'],purpose:'Offer retreat from consequence as a seductive trap.',canonRequirements:['Somnia is soft in presentation and visibly demonic.']},
    {id:'level_six_aftermath',trigger:'aftermath',title:'Check Out',cast:['Milo','Somnia','Aurelia'],purpose:'Unlock Somnia and make the mirrored self unavoidable.',canonRequirements:['Milo leaves by choice, not because the dream simply fails.']},
  ]),
  ...level(7,[
    {id:'level_seven_entrance',trigger:'entrance',title:'A Better Face',cast:['Milo','Noctissa','Vespera'],purpose:'Introduce copies and the pressure of idealized selves.',canonRequirements:['Original and reflection remain mechanically legible.']},
    {id:'better_milo_intro',trigger:'miniboss-intro',title:'You, But Easier',cast:['Milo','Better Milo'],purpose:'Turn the base kit into a readable mirror duel.',canonRequirements:['Better Milo uses fixed damage and recognizable base actions.']},
    {id:'vespera_intro',trigger:'boss-intro',title:'Every Face Answers',cast:['Milo','Vespera'],purpose:'Challenge identity built from other people’s reflections.',canonRequirements:['Vespera has a horned mirror-wing Demon Lord silhouette.']},
    {id:'level_seven_aftermath',trigger:'aftermath',title:'Keep Your Own Face',cast:['Milo','Vespera','Noctissa'],purpose:'Unlock Vespera and reveal Lilith’s direct claim.',canonRequirements:['Milo does not become an idealized replacement self.']},
  ]),
  ...level(8,[
    {id:'level_eight_entrance',trigger:'entrance',title:'The Queen’s Claim',cast:['Milo','Lilith'],purpose:'Enter the royal gauntlet and define Lilith’s authority.',canonRequirements:['Lilith is the Demon Lord queen: horns, wings, tail and regalia.']},
    {id:'daughters_intro',trigger:'miniboss-intro',title:'Four Ways to Obey',cast:['Milo','Lilith’s Daughters'],purpose:'Disclose the four-role relay.',canonRequirements:['Attack, defense, movement and energy roles remain distinct.']},
    {id:'lilith_intro',trigger:'boss-intro',title:'Your Room Was Ready',cast:['Milo','Lilith'],purpose:'Resolve the expectation planted after Level 1.',canonRequirements:['Lilith offers control and belonging, not generic destruction.']},
    {id:'level_eight_aftermath',trigger:'aftermath',title:'The Road Below the Throne',cast:['Milo','Lilith'],purpose:'Unlock Lilith and open the final inward descent.',canonRequirements:['Lilith yields without ceasing to be dangerous.']},
  ]),
  ...level(9,[
    {id:'level_nine_entrance',trigger:'entrance',title:'The Self Below',cast:['Milo','The Hollow','Seraphine'],purpose:'Turn the final biome inward and establish acceptance as the win condition.',canonRequirements:['The Hollow begins at Milo’s scale.']},
    {id:'boss_rush_intro',trigger:'miniboss-intro',title:'Every Lord Remembered',cast:['Milo','Boss Rush Herald'],purpose:'Frame the rush as memory, not a random collage.',canonRequirements:['Prior bosses remain staged and readable.']},
    {id:'hollow_intro',trigger:'boss-intro',title:'Everything Borrowed',cast:['Milo','The Hollow'],purpose:'Explain mirror, base-kit, and restoration phases without spoiling acceptance.',canonRequirements:['The Hollow mirrors rather than becomes a generic monster.']},
    {id:'level_nine_aftermath',trigger:'aftermath',title:'Choose Morning',cast:['Milo','The Hollow','Seraphine'],purpose:'Accept the avoided self, unlock Seraphine and reach morning.',canonRequirements:['The Hollow is accepted, never killed.','Deep Dive unlock remains deterministic.']},
  ]),
]);

export const ACCEPTANCE_ENDING_SEQUENCE=Object.freeze([
  'milo-wakes',
  'milo-apologizes',
  'weed-put-away',
  'one-corner-cleaned',
  'queens-seen-on-television',
  'pizza-ordered-and-delivered',
  'hollow-accepted-not-destroyed',
] as const);
