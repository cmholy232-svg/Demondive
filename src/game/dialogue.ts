import type { BoonId, SaveData, StoryBeatId } from './types';
import { LATE_DIALOGUE_BEATS } from './late-dialogue';

export interface DialogueLine {
  id: string;
  speaker: string;
  text: string;
  color: string;
  expression?: 'neutral' | 'dry' | 'warning' | 'amused' | 'hostile' | 'wary';
  camera?: 'room' | 'speaker' | 'wide' | 'boss';
}

export interface DialogueMutation {
  flags?: string[];
  unlocks?: BoonId[];
}

export interface DialogueBeat {
  id: StoryBeatId;
  title: string;
  location: string;
  once: boolean;
  flag: string;
  lines: DialogueLine[];
  mutation?: DialogueMutation;
}

const EARLY_DIALOGUE_BEATS: Record<StoryBeatId, DialogueBeat> = {
  prologue_dive: {
    id: 'prologue_dive', title: 'One Clean Page', location: "Milo's Room · 2:13 AM", once: true, flag: 'prologue_dive_seen',
    lines: [
      { id: 'p0a_01', speaker: 'Milo', text: 'Come on. One clean page. That is all I am asking for.', color: '#d8e4ee', expression: 'dry', camera: 'room' },
      { id: 'p0a_02', speaker: 'The Page', text: 'No work. No judgment. No consequences.', color: '#d89cff', expression: 'neutral', camera: 'speaker' },
      { id: 'p0a_03', speaker: 'The Page', text: 'Everything you want. Forever.', color: '#ff4f9a', expression: 'amused', camera: 'wide' },
      { id: 'p0a_04', speaker: 'Milo', text: 'That seems like a very responsible thing to click.', color: '#d8e4ee', expression: 'dry', camera: 'room' },
    ],
    mutation: { flags: ['portal_opened'] },
  },
  prologue_arrival: {
    id: 'prologue_arrival', title: 'Available', location: "Milo's Hellroom", once: true, flag: 'prologue_arrival_seen',
    lines: [
      { id: 'p0b_01', speaker: 'Pyrra', text: 'A living human.', color: '#ff5b75', expression: 'wary', camera: 'speaker' },
      { id: 'p0b_02', speaker: 'Milo', text: 'Usually people lead with hello.', color: '#d8e4ee', expression: 'dry', camera: 'speaker' },
      { id: 'p0b_03', speaker: 'Pyrra', text: 'You are available. The Seven Lords have sealed the way home. Break their claims and you may reach it.', color: '#ff5b75', expression: 'warning', camera: 'wide' },
      { id: 'p0b_04', speaker: 'Milo', text: 'And the glowing hand?', color: '#d8e4ee', expression: 'wary', camera: 'speaker' },
      { id: 'p0b_05', speaker: 'Pyrra', text: 'Arcane Magic. Try not to point it at anything you cannot afford to replace.', color: '#ff5b75', expression: 'amused', camera: 'speaker' },
    ],
    mutation: { flags: ['arcane_magic_awakened'] },
  },
  level_one_entrance: {
    id: 'level_one_entrance', title: 'First Night Free', location: 'The Neon Maw', once: true, flag: 'level_one_entrance_seen',
    lines: [
      { id: 'l1e_01', speaker: 'Belladonna', text: 'Welcome, Milo. First night is free.', color: '#ff4f9a', expression: 'amused', camera: 'boss' },
      { id: 'l1e_02', speaker: 'Milo', text: 'Knew Hell had better customer service.', color: '#d8e4ee', expression: 'dry', camera: 'speaker' },
      { id: 'l1e_03', speaker: 'Pyrra', text: 'Look closer. Nothing here is free.', color: '#ff5b75', expression: 'warning', camera: 'wide' },
    ],
  },
  rescue_maris: {
    id: 'rescue_maris', title: 'Smoke Signal', location: 'Neon Maw · Guest Lounge', once: true, flag: 'maris_rescued',
    lines: [
      { id: 'l1m_01', speaker: 'Maris', text: 'You smell like smoke.', color: '#39c9ff', expression: 'wary', camera: 'speaker' },
      { id: 'l1m_02', speaker: 'Milo', text: 'That narrows it down surprisingly little.', color: '#d8e4ee', expression: 'dry', camera: 'speaker' },
      { id: 'l1m_03', speaker: 'Maris', text: 'Break the seal. I can help you survive what comes after.', color: '#39c9ff', expression: 'neutral', camera: 'wide' },
    ],
    mutation: { unlocks: ['maris'], flags: ['level_one_rescue_1'] },
  },
  rescue_gaia: {
    id: 'rescue_gaia', title: 'No Better Options', location: 'Neon Maw · Soulpipe Crossing', once: true, flag: 'gaia_rescued',
    lines: [
      { id: 'l1g_01', speaker: 'Gaia', text: 'This is the champion Pyrra chose?', color: '#c78b58', expression: 'wary', camera: 'speaker' },
      { id: 'l1g_02', speaker: 'Pyrra', text: 'Chose implies options.', color: '#ff5b75', expression: 'dry', camera: 'speaker' },
      { id: 'l1g_03', speaker: 'Milo', text: 'I am feeling extremely supported.', color: '#d8e4ee', expression: 'dry', camera: 'wide' },
    ],
    mutation: { unlocks: ['gaia'], flags: ['level_one_rescue_2'] },
  },
  rescue_zephyra: {
    id: 'rescue_zephyra', title: 'Initiative', location: 'Neon Maw · Living Billboard Row', once: true, flag: 'zephyra_rescued',
    lines: [
      { id: 'l1z_01', speaker: 'Zephyra', text: 'You jumped into Hell voluntarily?', color: '#57d6c7', expression: 'wary', camera: 'speaker' },
      { id: 'l1z_02', speaker: 'Milo', text: 'Finally, someone appreciates initiative.', color: '#d8e4ee', expression: 'dry', camera: 'speaker' },
      { id: 'l1z_03', speaker: 'Zephyra', text: 'Open this cage and I will make sure you keep moving.', color: '#57d6c7', expression: 'amused', camera: 'wide' },
    ],
    mutation: { unlocks: ['zephyra'], flags: ['level_one_rescue_3'] },
  },
  bartender_intro: {
    id: 'bartender_intro', title: 'Last Call', location: 'The Bottomless Bar', once: false, flag: 'bartender_intro_seen',
    lines: [
      { id: 'l1b_01', speaker: 'Bottomless Bartender', text: 'Last call.', color: '#ffb34d', expression: 'hostile', camera: 'boss' },
      { id: 'l1b_02', speaker: 'Milo', text: 'I just got here.', color: '#d8e4ee', expression: 'dry', camera: 'speaker' },
    ],
  },
  belladonna_intro: {
    id: 'belladonna_intro', title: 'Never Enough', location: "Belladonna's Banquet", once: false, flag: 'belladonna_intro_seen',
    lines: [
      { id: 'l1d_01', speaker: 'Belladonna', text: 'You can stay. Never hungry. Never lonely. Never bored. Never sober.', color: '#ff4f9a', expression: 'amused', camera: 'boss' },
      { id: 'l1d_02', speaker: 'Milo', text: 'The sales pitch gets worse every sentence.', color: '#d8e4ee', expression: 'dry', camera: 'speaker' },
      { id: 'l1d_03', speaker: 'Belladonna', text: 'Happiness ends. Appetite does not.', color: '#ff4f9a', expression: 'hostile', camera: 'boss' },
    ],
  },
  level_one_revelation: {
    id: 'level_one_revelation', title: 'Expected', location: "Belladonna's Banquet · Aftermath", once: true, flag: 'level_one_complete',
    lines: [
      { id: 'l1r_01', speaker: 'Belladonna', text: 'Lilith will devour you. She already prepared your room.', color: '#ff4f9a', expression: 'hostile', camera: 'boss' },
      { id: 'l1r_02', speaker: 'Milo', text: 'Prepared?', color: '#d8e4ee', expression: 'wary', camera: 'speaker' },
      { id: 'l1r_03', speaker: 'Belladonna', text: 'She knew you were coming.', color: '#ff4f9a', expression: 'amused', camera: 'boss' },
      { id: 'l1r_04', speaker: 'Pyrra', text: 'We leave. Now.', color: '#ff5b75', expression: 'warning', camera: 'wide' },
    ],
    mutation: { unlocks: ['maris', 'gaia', 'zephyra', 'belladonna'], flags: ['lilith_expected_milo'] },
  },
  level_two_entrance: {
    id: 'level_two_entrance', title: 'Your Biggest Fans', location: 'The Drowned Court · Processional', once: true, flag: 'level_two_entrance_seen',
    lines: [
      { id: 'l2e_01', speaker: 'The Crowd', text: 'MILO! MILO! MILO!', color: '#63f6ff', expression: 'amused', camera: 'wide' },
      { id: 'l2e_02', speaker: 'Milo', text: 'This place understands me.', color: '#d8e4ee', expression: 'amused', camera: 'speaker' },
      { id: 'l2e_03', speaker: 'Maris', text: 'They have been chanting for three hundred years.', color: '#39c9ff', expression: 'warning', camera: 'speaker' },
      { id: 'l2e_04', speaker: 'Nerissa', text: 'Tonight, every heart belongs to Milo.', color: '#36c9ff', expression: 'amused', camera: 'boss' },
    ],
  },
  rescue_flora: {
    id: 'rescue_flora', title: 'Thorn in the Chorus', location: 'The Drowned Court · Sunken Gardens', once: true, flag: 'flora_rescued',
    lines: [
      { id: 'l2f_01', speaker: 'Flora', text: 'She made an entire kingdom adore her and she is still insecure.', color: '#64d879', expression: 'dry', camera: 'speaker' },
      { id: 'l2f_02', speaker: 'Milo', text: 'That does sound exhausting.', color: '#d8e4ee', expression: 'dry', camera: 'speaker' },
    ],
    mutation: { unlocks: ['flora'], flags: ['level_two_rescue_1'] },
  },
  rescue_voltara: {
    id: 'rescue_voltara', title: 'Unsustainable Output', location: 'The Drowned Court · Amp Reef', once: true, flag: 'voltara_rescued',
    lines: [
      { id: 'l2v_01', speaker: 'Voltara', text: 'Her concert is drawing power at twelve times sustainable output.', color: '#f6df45', expression: 'warning', camera: 'speaker' },
      { id: 'l2v_02', speaker: 'Milo', text: 'I like her less now that math is involved.', color: '#d8e4ee', expression: 'dry', camera: 'speaker' },
    ],
    mutation: { unlocks: ['voltara'], flags: ['level_two_rescue_2'] },
  },
  fan_club_intro: {
    id: 'fan_club_intro', title: 'Meet and Greet', location: 'The Drowned Court · Adoration Pit', once: false, flag: 'fan_club_intro_seen',
    lines: [
      { id: 'l2c_01', speaker: 'Fan Club Champion', text: 'We love you, Milo!', color: '#63f6ff', expression: 'hostile', camera: 'boss' },
      { id: 'l2c_02', speaker: 'Milo', text: 'That somehow makes this worse.', color: '#d8e4ee', expression: 'dry', camera: 'speaker' },
    ],
  },
  nerissa_intro: {
    id: 'nerissa_intro', title: 'Everyone Adores You', location: "Nerissa's Grand Stage", once: false, flag: 'nerissa_intro_seen',
    lines: [
      { id: 'l2n_01', speaker: 'Nerissa', text: 'No one will ignore you. No one will criticize you. No one will leave.', color: '#36c9ff', expression: 'amused', camera: 'boss' },
      { id: 'l2n_02', speaker: 'Milo', text: 'Do any of them know anything about me?', color: '#d8e4ee', expression: 'wary', camera: 'speaker' },
      { id: 'l2n_03', speaker: 'Nerissa', text: 'They know you deserve worship.', color: '#36c9ff', expression: 'hostile', camera: 'boss' },
      { id: 'l2n_04', speaker: 'Milo', text: 'That is flattering. Also not an answer.', color: '#d8e4ee', expression: 'dry', camera: 'speaker' },
    ],
  },
  level_two_revelation: {
    id: 'level_two_revelation', title: 'Forgotten', location: "Nerissa's Grand Stage · Aftermath", once: true, flag: 'level_two_complete',
    lines: [
      { id: 'l2r_01', speaker: 'The Crowd', text: 'Who is that?', color: '#87dce8', expression: 'neutral', camera: 'wide' },
      { id: 'l2r_02', speaker: 'Nerissa', text: 'Hurts, doesn’t it?', color: '#36c9ff', expression: 'hostile', camera: 'boss' },
      { id: 'l2r_03', speaker: 'Milo', text: 'A normal amount.', color: '#d8e4ee', expression: 'dry', camera: 'speaker' },
      { id: 'l2r_04', speaker: 'Pyrra', text: 'You are visibly devastated.', color: '#ff5b75', expression: 'dry', camera: 'speaker' },
      { id: 'l2r_05', speaker: 'Maris', text: 'Milo… there is someone shaped like you beneath the water.', color: '#39c9ff', expression: 'warning', camera: 'wide' },
    ],
    mutation: { unlocks: ['flora', 'voltara', 'nerissa'], flags: ['milo_shadow_in_hell'] },
  },
  level_three_entrance: {
    id: 'level_three_entrance', title: 'The Hunt Begins', location: 'The Thornwild · Infernal Jungle Ruins', once: true, flag: 'level_three_entrance_seen',
    lines: [
      { id: 'l3e_01', speaker: 'Roxyne', text: 'Run.', color: '#e35b58', expression: 'hostile', camera: 'boss' },
      { id: 'l3e_02', speaker: 'Milo', text: 'That is usually the plan.', color: '#d8e4ee', expression: 'dry', camera: 'speaker' },
      { id: 'l3e_03', speaker: 'Crya', text: 'She does not chase prey. She edits the forest until escape becomes a lie.', color: '#82baff', expression: 'warning', camera: 'wide' },
    ],
  },
  rescue_crya: {
    id: 'rescue_crya', title: 'Cold Trail', location: 'The Thornwild · Frostbitten Shrine', once: true, flag: 'crya_rescued',
    lines: [
      { id: 'l3c_01', speaker: 'Crya', text: 'Break the seal. I can freeze her snares, but I cannot promise warmth.', color: '#82baff', expression: 'neutral', camera: 'speaker' },
      { id: 'l3c_02', speaker: 'Milo', text: 'Warmth has been oversold lately.', color: '#d8e4ee', expression: 'dry', camera: 'speaker' },
    ],
    mutation: { unlocks: ['crya'], flags: ['level_three_rescue_1'] },
  },
  perfect_prey_intro: {
    id: 'perfect_prey_intro', title: 'Perfect Prey', location: 'The Thornwild · Cornered Glade', once: false, flag: 'perfect_prey_intro_seen',
    lines: [
      { id: 'l3p_01', speaker: 'Crya', text: 'It cannot be wounded while it runs. Corner it at the marked choke points.', color: '#82baff', expression: 'warning', camera: 'wide' },
      { id: 'l3p_02', speaker: 'Milo', text: 'Finally, prey with project management.', color: '#d8e4ee', expression: 'dry', camera: 'speaker' },
    ],
  },
  roxyne_intro: {
    id: 'roxyne_intro', title: 'Demon Lord of the Hunt', location: "Roxyne's Killing Canopy", once: false, flag: 'roxyne_intro_seen',
    lines: [
      { id: 'l3x_01', speaker: 'Roxyne', text: 'You crossed two kingdoms and still mistake motion for progress.', color: '#e35b58', expression: 'hostile', camera: 'boss' },
      { id: 'l3x_02', speaker: 'Milo', text: 'I also mistake spite for motivation. It has worked so far.', color: '#d8e4ee', expression: 'dry', camera: 'speaker' },
      { id: 'l3x_03', speaker: 'Roxyne', text: 'Go on. Chase the version of yourself you wish you were.', color: '#e35b58', expression: 'amused', camera: 'boss' },
    ],
  },
  level_three_revelation: {
    id: 'level_three_revelation', title: 'Aware', location: "Roxyne's Killing Canopy · Aftermath", once: true, flag: 'level_three_complete',
    lines: [
      { id: 'l3r_01', speaker: 'Roxyne', text: 'Your shadow stopped running before you did.', color: '#e35b58', expression: 'hostile', camera: 'boss' },
      { id: 'l3r_02', speaker: 'Milo', text: 'The thing beneath the water?', color: '#d8e4ee', expression: 'wary', camera: 'speaker' },
      { id: 'l3r_03', speaker: 'Crya', text: 'It knows you are coming now.', color: '#82baff', expression: 'warning', camera: 'wide' },
    ],
    mutation: { unlocks: ['crya', 'roxyne'], flags: ['milo_shadow_is_aware'] },
  },
};

export const DIALOGUE_BEATS:Record<StoryBeatId,DialogueBeat>={...EARLY_DIALOGUE_BEATS,...LATE_DIALOGUE_BEATS};

export const TUTORIAL_STEPS = [
  { action: 'move', text: 'MOVE · A / D or LEFT / RIGHT' },
  { action: 'jump', text: 'DOUBLE JUMP · press SPACE twice' },
  { action: 'dash', text: 'DASH / WAVEDASH · hold a direction + SHIFT' },
  { action: 'magic', text: 'ARCANE MAGIC · aim with WASD, cast with J' },
  { action: 'special', text: 'SPECIAL · K uses Demon Energy' },
  { action: 'recovery', text: 'RECOVERY · pizza heals, coffee restores Demon Energy' },
  { action: 'altar', text: 'BOON ALTAR · approach the sigil and press E' },
  { action: 'desk', text: 'UPGRADE DESK · approach the desk and press E' },
  { action: 'portal', text: 'RUN DOOR · approach the portal and press E' },
] as const;

export type TutorialAction = typeof TUTORIAL_STEPS[number]['action'];

export function applyDialogueBeatMutation(save: SaveData, beat: DialogueBeat): { save: SaveData; changed: boolean } {
  const storyFlags = [...save.storyFlags];
  const unlocked = [...save.unlocked];
  const collection = [...save.collection];
  let changed = false;
  for (const flag of [beat.flag, ...(beat.mutation?.flags ?? [])]) if (!storyFlags.includes(flag)) { storyFlags.push(flag); changed = true; }
  for (const id of beat.mutation?.unlocks ?? []) {
    if (!unlocked.includes(id)) { unlocked.push(id); changed = true; }
    if (!collection.includes(id)) { collection.push(id); changed = true; }
  }
  return { save: changed ? { ...save, storyFlags, unlocked, collection } : save, changed };
}
