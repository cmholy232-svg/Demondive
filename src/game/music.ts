export type MusicCueId =
  | 'music_title_main'
  | 'music_hub_main'
  | 'music_l1_exploration'
  | 'music_l1_miniboss'
  | 'music_l1_boss'
  | 'music_l2_exploration'
  | 'music_l2_miniboss'
  | 'music_l2_boss'
  | 'music_l3_exploration'
  | 'music_l3_miniboss'
  | 'music_l3_boss'
  | 'music_l4_exploration'
  | 'music_l4_miniboss'
  | 'music_l4_boss'
  | 'music_l5_exploration'
  | 'music_l5_miniboss'
  | 'music_l5_boss'
  | 'music_l6_exploration'
  | 'music_l6_miniboss'
  | 'music_l6_boss'
  | 'music_l7_exploration'
  | 'music_l7_miniboss'
  | 'music_l7_boss'
  | 'music_l8_exploration'
  | 'music_l8_miniboss'
  | 'music_l8_boss'
  | 'music_l9_exploration'
  | 'music_l9_boss_rush'
  | 'music_l9_mirror_self'
  | 'music_l9_final_fight'
  | 'music_alpha_complete';

export type MusicState =
  | 'NONE'
  | 'TITLE'
  | 'HUB'
  | 'PORTAL_TRANSITION'
  | 'LEVEL_1_EXPLORATION'
  | 'LEVEL_1_MINIBOSS'
  | 'LEVEL_1_POST_MINIBOSS'
  | 'LEVEL_1_BOSS_INTRO'
  | 'LEVEL_1_BOSS'
  | 'LEVEL_1_BOSS_DEFEATED'
  | 'LEVEL_2_EXPLORATION'
  | 'LEVEL_2_MINIBOSS'
  | 'LEVEL_2_POST_MINIBOSS'
  | 'LEVEL_2_BOSS_INTRO'
  | 'LEVEL_2_BOSS'
  | 'LEVEL_2_BOSS_DEFEATED'
  | 'LEVEL_3_EXPLORATION'
  | 'LEVEL_3_MINIBOSS'
  | 'LEVEL_3_POST_MINIBOSS'
  | 'LEVEL_3_BOSS_INTRO'
  | 'LEVEL_3_BOSS'
  | 'LEVEL_3_BOSS_DEFEATED'
  | 'LEVEL_4_EXPLORATION'
  | 'LEVEL_4_MINIBOSS'
  | 'LEVEL_4_POST_MINIBOSS'
  | 'LEVEL_4_BOSS_INTRO'
  | 'LEVEL_4_BOSS'
  | 'LEVEL_4_BOSS_DEFEATED'
  | 'LEVEL_5_EXPLORATION'
  | 'LEVEL_5_MINIBOSS'
  | 'LEVEL_5_POST_MINIBOSS'
  | 'LEVEL_5_BOSS_INTRO'
  | 'LEVEL_5_BOSS'
  | 'LEVEL_5_BOSS_DEFEATED'
  | 'LEVEL_6_EXPLORATION'
  | 'LEVEL_6_MINIBOSS'
  | 'LEVEL_6_POST_MINIBOSS'
  | 'LEVEL_6_BOSS_INTRO'
  | 'LEVEL_6_BOSS'
  | 'LEVEL_6_BOSS_DEFEATED'
  | 'LEVEL_7_EXPLORATION'
  | 'LEVEL_7_MINIBOSS'
  | 'LEVEL_7_POST_MINIBOSS'
  | 'LEVEL_7_BOSS_INTRO'
  | 'LEVEL_7_BOSS'
  | 'LEVEL_7_BOSS_DEFEATED'
  | 'LEVEL_8_EXPLORATION'
  | 'LEVEL_8_MINIBOSS'
  | 'LEVEL_8_POST_MINIBOSS'
  | 'LEVEL_8_BOSS_INTRO'
  | 'LEVEL_8_BOSS'
  | 'LEVEL_8_BOSS_DEFEATED'
  | 'LEVEL_9_EXPLORATION'
  | 'LEVEL_9_MINIBOSS'
  | 'LEVEL_9_POST_MINIBOSS'
  | 'LEVEL_9_BOSS_INTRO'
  | 'LEVEL_9_BOSS'
  | 'LEVEL_9_FINAL_FIGHT'
  | 'LEVEL_9_BOSS_DEFEATED'
  | 'ALPHA_COMPLETE';

export interface MusicCueDefinition {
  id: MusicCueId;
  displayName: string;
  file: string;
  sourceFile: string;
  duration: number;
  loopStart: number;
  loopEnd: number;
  gainDb: number;
  loudnessLufs: number;
  truePeakDbfs: number;
  role: 'title' | 'hub' | 'exploration' | 'miniboss' | 'boss' | 'finale';
  loop: boolean;
  resumePolicy: 'restart' | 'resume_if_recent';
}

export const MUSIC_CUES: Record<MusicCueId, MusicCueDefinition> = {
  music_title_main: {
    id: 'music_title_main', displayName: 'DemonDive Theme Song', file: 'assets/v1/audio/music-title-main.mp3',
    sourceFile: '1. DemonDive Theme Song(1).mp3', duration: 53.712, loopStart: 0, loopEnd: 53.712,
    gainDb: 0, loudnessLufs: -14.1, truePeakDbfs: -2.5, role: 'title', loop: true, resumePolicy: 'restart',
  },
  music_hub_main: {
    id: 'music_hub_main', displayName: 'Hellroom Hangout', file: 'assets/v1/audio/music-hub-main.mp3',
    sourceFile: "2. Milo's Room(1).mp3", duration: 168.624, loopStart: 0, loopEnd: 168.624,
    gainDb: -.6, loudnessLufs: -13.4, truePeakDbfs: -1.9, role: 'hub', loop: true, resumePolicy: 'resume_if_recent',
  },
  music_l1_exploration: {
    id: 'music_l1_exploration', displayName: 'Neon Maw Circuit', file: 'assets/v1/audio/music-l1-exploration.mp3',
    sourceFile: '3. Level 1 Theme(1).mp3', duration: 178.44, loopStart: 0, loopEnd: 178.44,
    gainDb: -1.4, loudnessLufs: -12.6, truePeakDbfs: -1.6, role: 'exploration', loop: true, resumePolicy: 'resume_if_recent',
  },
  music_l1_miniboss: {
    id: 'music_l1_miniboss', displayName: 'Neon Maw Breaker', file: 'assets/v1/audio/music-l1-miniboss.mp3',
    sourceFile: '4. Level 1 Mini Boss Theme(1).mp3', duration: 149.904, loopStart: 0, loopEnd: 149.904,
    gainDb: -1.2, loudnessLufs: -12.8, truePeakDbfs: -1.8, role: 'miniboss', loop: true, resumePolicy: 'restart',
  },
  music_l1_boss: {
    id: 'music_l1_boss', displayName: "Belladonna's Maw", file: 'assets/v1/audio/music-l1-boss.mp3',
    sourceFile: '5. Level 1 Boss Theme(1).mp3', duration: 142.32, loopStart: 0, loopEnd: 142.32,
    gainDb: -.9, loudnessLufs: -13.1, truePeakDbfs: -2, role: 'boss', loop: true, resumePolicy: 'restart',
  },
  music_l2_exploration: {
    id: 'music_l2_exploration', displayName: 'The Drowned Court', file: 'assets/a6/audio/music-l2-exploration.mp3',
    sourceFile: '6.Level 2 Theme.mp3', duration: 81.72, loopStart: 0, loopEnd: 81.72,
    gainDb: -1.4, loudnessLufs: -12.6, truePeakDbfs: -.9, role: 'exploration', loop: true, resumePolicy: 'resume_if_recent',
  },
  music_l2_miniboss: {
    id: 'music_l2_miniboss', displayName: 'The Fan Club', file: 'assets/a6/audio/music-l2-miniboss.mp3',
    sourceFile: '7. Level 2 Mini Boss.mp3', duration: 97.2, loopStart: 0, loopEnd: 97.2,
    gainDb: -1.2, loudnessLufs: -12.8, truePeakDbfs: -1.8, role: 'miniboss', loop: true, resumePolicy: 'restart',
  },
  music_l2_boss: {
    id: 'music_l2_boss', displayName: "Nerissa's Grand Stage", file: 'assets/a6/audio/music-l2-boss.mp3',
    sourceFile: '8. Level 2 Boss Theme.mp3', duration: 174.6, loopStart: 0, loopEnd: 174.6,
    gainDb: -.5, loudnessLufs: -13.5, truePeakDbfs: -.2, role: 'boss', loop: true, resumePolicy: 'restart',
  },
  music_l3_exploration: {
    id: 'music_l3_exploration', displayName: 'The Thornwild', file: 'assets/a7/audio/music-l3-exploration.mp3',
    sourceFile: '9. Level 3 Theme.mp3', duration: 202.824, loopStart: 0, loopEnd: 202.824,
    gainDb: -2.3, loudnessLufs: -11.7, truePeakDbfs: -.7, role: 'exploration', loop: true, resumePolicy: 'resume_if_recent',
  },
  music_l3_miniboss: {
    id: 'music_l3_miniboss', displayName: 'Perfect Prey', file: 'assets/a7/audio/music-l3-miniboss.mp3',
    sourceFile: '10. Level 3 Mini Boss.mp3', duration: 137.664, loopStart: 0, loopEnd: 137.664,
    gainDb: -1.2, loudnessLufs: -12.8, truePeakDbfs: -2.3, role: 'miniboss', loop: true, resumePolicy: 'restart',
  },
  music_l3_boss: {
    id: 'music_l3_boss', displayName: "Roxyne's Killing Canopy", file: 'assets/a7/audio/music-l3-boss.mp3',
    sourceFile: '11. Level 3 Boss Theme.mp3', duration: 187.344, loopStart: 0, loopEnd: 187.344,
    gainDb: -2.2, loudnessLufs: -11.8, truePeakDbfs: -1.4, role: 'boss', loop: true, resumePolicy: 'restart',
  },
  music_l4_exploration: {
    id: 'music_l4_exploration', displayName: 'The Thunder Jackpot', file: 'assets/a73/audio/music-l4-exploration.mp3',
    sourceFile: '12. Level 4 Theme.mp3', duration: 128.232, loopStart: 0, loopEnd: 128.232,
    gainDb: -.5, loudnessLufs: -13.5, truePeakDbfs: -1.6, role: 'exploration', loop: true, resumePolicy: 'resume_if_recent',
  },
  music_l4_miniboss: {
    id: 'music_l4_miniboss', displayName: 'Lady Luckless', file: 'assets/a73/audio/music-l4-miniboss.mp3',
    sourceFile: '13. Level 4 Mini Boss Theme.mp3', duration: 80.304, loopStart: 0, loopEnd: 80.304,
    gainDb: -1, loudnessLufs: -13, truePeakDbfs: -2.6, role: 'miniboss', loop: true, resumePolicy: 'restart',
  },
  music_l4_boss: {
    id: 'music_l4_boss', displayName: "Calyptra's Roulette", file: 'assets/a73/audio/music-l4-boss.mp3',
    sourceFile: '14. Level 4 Boss Theme.mp3', duration: 167.712, loopStart: 0, loopEnd: 167.712,
    gainDb: -.9, loudnessLufs: -13.1, truePeakDbfs: -1.8, role: 'boss', loop: true, resumePolicy: 'restart',
  },
  music_l5_exploration: {
    id: 'music_l5_exploration', displayName: 'Frozen Nave', file: 'assets/a73/audio/music-l5-exploration.mp3',
    sourceFile: '15. Level 5 Theme.mp3', duration: 179.16, loopStart: 0, loopEnd: 179.16,
    gainDb: -1.4, loudnessLufs: -12.6, truePeakDbfs: -1.9, role: 'exploration', loop: true, resumePolicy: 'resume_if_recent',
  },
  music_l5_miniboss: {
    id: 'music_l5_miniboss', displayName: 'Shattered Basilica', file: 'assets/a73/audio/music-l5-miniboss.mp3',
    sourceFile: '16. Level 5 Mini Boss.mp3', duration: 174.912, loopStart: 0, loopEnd: 174.912,
    gainDb: -1, loudnessLufs: -13, truePeakDbfs: -1.6, role: 'miniboss', loop: true, resumePolicy: 'restart',
  },
  music_l5_boss: {
    id: 'music_l5_boss', displayName: "Isolde's Frozen Basilica", file: 'assets/a73/audio/music-l5-boss.mp3',
    sourceFile: '17. Level 5 Boss Theme.mp3', duration: 203.232, loopStart: 0, loopEnd: 203.232,
    gainDb: -2.1, loudnessLufs: -11.9, truePeakDbfs: -1.2, role: 'boss', loop: true, resumePolicy: 'restart',
  },
  music_l6_exploration: {
    id: 'music_l6_exploration', displayName: 'The Forever Motel', file: 'assets/a73/audio/music-l6-exploration.mp3',
    sourceFile: '18. Level 6 Theme.mp3', duration: 248.64, loopStart: 0, loopEnd: 248.64,
    gainDb: -1.4, loudnessLufs: -12.6, truePeakDbfs: -.2, role: 'exploration', loop: true, resumePolicy: 'resume_if_recent',
  },
  music_l6_miniboss: {
    id: 'music_l6_miniboss', displayName: 'Dream Girl', file: 'assets/a73/audio/music-l6-miniboss.mp3',
    sourceFile: '19. Level 6 Mini Boss Theme.mp3', duration: 159.552, loopStart: 0, loopEnd: 159.552,
    gainDb: -1.4, loudnessLufs: -12.6, truePeakDbfs: -.3, role: 'miniboss', loop: true, resumePolicy: 'restart',
  },
  music_l6_boss: {
    id: 'music_l6_boss', displayName: "Somnia's Velvet Loop", file: 'assets/a73/audio/music-l6-boss.mp3',
    sourceFile: '20. Level 6 Boss Theme.mp3', duration: 152.664, loopStart: 0, loopEnd: 152.664,
    gainDb: -.8, loudnessLufs: -13.2, truePeakDbfs: -1.6, role: 'boss', loop: true, resumePolicy: 'restart',
  },
  music_l7_exploration: {
    id: 'music_l7_exploration', displayName: 'City of a Thousand Faces', file: 'assets/a73/audio/music-l7-exploration.mp3',
    sourceFile: '21. Level 7 Theme.mp3', duration: 133.224, loopStart: 0, loopEnd: 133.224,
    gainDb: -2, loudnessLufs: -12, truePeakDbfs: -1, role: 'exploration', loop: true, resumePolicy: 'resume_if_recent',
  },
  music_l7_miniboss: {
    id: 'music_l7_miniboss', displayName: 'Better Milo', file: 'assets/a73/audio/music-l7-miniboss.mp3',
    sourceFile: '22. Level 7 Mini Boss Theme.mp3', duration: 192.432, loopStart: 0, loopEnd: 192.432,
    gainDb: -.9, loudnessLufs: -13.1, truePeakDbfs: -2.1, role: 'miniboss', loop: true, resumePolicy: 'restart',
  },
  music_l7_boss: {
    id: 'music_l7_boss', displayName: "Vespera's Thousandfold Court", file: 'assets/a73/audio/music-l7-boss.mp3',
    sourceFile: '23. Level 7 Boss Theme.mp3', duration: 59.592, loopStart: 0, loopEnd: 59.592,
    gainDb: 0, loudnessLufs: -14, truePeakDbfs: -2.3, role: 'boss', loop: true, resumePolicy: 'restart',
  },
  music_l8_exploration: {
    id: 'music_l8_exploration', displayName: "Lilith's Throne", file: 'assets/a73c/audio/music-l8-exploration.mp3',
    sourceFile: '24. Level 8 Theme.mp3', duration: 199.8, loopStart: 0, loopEnd: 199.8,
    gainDb: -1.6, loudnessLufs: -12.4, truePeakDbfs: -1.7, role: 'exploration', loop: true, resumePolicy: 'resume_if_recent',
  },
  music_l8_miniboss: {
    id: 'music_l8_miniboss', displayName: "Lilith's Daughters", file: 'assets/a73c/audio/music-l8-miniboss.mp3',
    sourceFile: '25. Level 8 Mini Boss.mp3', duration: 184.824, loopStart: 0, loopEnd: 184.824,
    gainDb: -2.2, loudnessLufs: -11.8, truePeakDbfs: -1.5, role: 'miniboss', loop: true, resumePolicy: 'restart',
  },
  music_l8_boss: {
    id: 'music_l8_boss', displayName: "Lilith's Royal Decree", file: 'assets/a73c/audio/music-l8-boss.mp3',
    sourceFile: '26. Level 8 Boss Theme.mp3', duration: 207.96, loopStart: 0, loopEnd: 207.96,
    gainDb: -1.4, loudnessLufs: -12.6, truePeakDbfs: -2.1, role: 'boss', loop: true, resumePolicy: 'restart',
  },
  music_l9_exploration: {
    id: 'music_l9_exploration', displayName: 'Milo Mirror Realm', file: 'assets/a73c/audio/music-l9-exploration.mp3',
    sourceFile: '27. Milo Mirror Realm.mp3', duration: 144.672, loopStart: 0, loopEnd: 144.672,
    gainDb: -.4, loudnessLufs: -13.6, truePeakDbfs: -2.2, role: 'exploration', loop: true, resumePolicy: 'resume_if_recent',
  },
  music_l9_boss_rush: {
    id: 'music_l9_boss_rush', displayName: 'Seven-Lord Boss Rush', file: 'assets/a73c/audio/music-l9-boss-rush.mp3',
    sourceFile: '28. Boss Rush Theme.mp3', duration: 193.152, loopStart: 0, loopEnd: 193.152,
    gainDb: -1.6, loudnessLufs: -12.4, truePeakDbfs: -1.7, role: 'miniboss', loop: true, resumePolicy: 'restart',
  },
  music_l9_mirror_self: {
    id: 'music_l9_mirror_self', displayName: 'Mirror Self', file: 'assets/a73c/audio/music-l9-mirror-self.mp3',
    sourceFile: '29. Mirror Self Theme.mp3', duration: 162.072, loopStart: 0, loopEnd: 162.072,
    gainDb: -1.7, loudnessLufs: -12.3, truePeakDbfs: -1.2, role: 'boss', loop: true, resumePolicy: 'restart',
  },
  music_l9_final_fight: {
    id: 'music_l9_final_fight', displayName: 'Power Offered', file: 'assets/a73c/audio/music-l9-final-fight.mp3',
    sourceFile: '30. Final Fight Theme.mp3', duration: 177.792, loopStart: 0, loopEnd: 177.792,
    gainDb: -1.2, loudnessLufs: -12.8, truePeakDbfs: -1.9, role: 'finale', loop: true, resumePolicy: 'restart',
  },
  music_alpha_complete: {
    id: 'music_alpha_complete', displayName: 'One More Dive', file: 'assets/v1/audio/music-alpha-complete.mp3',
    sourceFile: '31. Credit Theme One More Dive(1).mp3', duration: 239.784, loopStart: 0, loopEnd: 239.784,
    gainDb: -1.2, loudnessLufs: -15.5, truePeakDbfs: -1.7, role: 'finale', loop: false, resumePolicy: 'restart',
  },
};

export interface MusicStateRoute {
  cue: MusicCueId | null;
  fadeSeconds: number;
  resumeSaved?: boolean;
  duckDb?: number;
}

export const MUSIC_STATE_ROUTES: Record<MusicState, MusicStateRoute> = {
  NONE: { cue: null, fadeSeconds: .8 },
  TITLE: { cue: 'music_title_main', fadeSeconds: .9 },
  HUB: { cue: 'music_hub_main', fadeSeconds: 1.25, resumeSaved: true },
  PORTAL_TRANSITION: { cue: 'music_l1_exploration', fadeSeconds: 1.15, duckDb: -5 },
  LEVEL_1_EXPLORATION: { cue: 'music_l1_exploration', fadeSeconds: .9, resumeSaved: true },
  LEVEL_1_MINIBOSS: { cue: 'music_l1_miniboss', fadeSeconds: .45 },
  LEVEL_1_POST_MINIBOSS: { cue: 'music_l1_exploration', fadeSeconds: .8, resumeSaved: true },
  LEVEL_1_BOSS_INTRO: { cue: 'music_l1_boss', fadeSeconds: .8 },
  LEVEL_1_BOSS: { cue: 'music_l1_boss', fadeSeconds: .25 },
  LEVEL_1_BOSS_DEFEATED: { cue: null, fadeSeconds: 1.5 },
  LEVEL_2_EXPLORATION: { cue: 'music_l2_exploration', fadeSeconds: .9, resumeSaved: true },
  LEVEL_2_MINIBOSS: { cue: 'music_l2_miniboss', fadeSeconds: .45 },
  LEVEL_2_POST_MINIBOSS: { cue: 'music_l2_exploration', fadeSeconds: .8, resumeSaved: true },
  LEVEL_2_BOSS_INTRO: { cue: 'music_l2_boss', fadeSeconds: .8 },
  LEVEL_2_BOSS: { cue: 'music_l2_boss', fadeSeconds: .25 },
  LEVEL_2_BOSS_DEFEATED: { cue: null, fadeSeconds: 1.5 },
  LEVEL_3_EXPLORATION: { cue: 'music_l3_exploration', fadeSeconds: .9, resumeSaved: true },
  LEVEL_3_MINIBOSS: { cue: 'music_l3_miniboss', fadeSeconds: .45 },
  LEVEL_3_POST_MINIBOSS: { cue: 'music_l3_exploration', fadeSeconds: .8, resumeSaved: true },
  LEVEL_3_BOSS_INTRO: { cue: 'music_l3_boss', fadeSeconds: .8 },
  LEVEL_3_BOSS: { cue: 'music_l3_boss', fadeSeconds: .25 },
  LEVEL_3_BOSS_DEFEATED: { cue: null, fadeSeconds: 1.5 },
  LEVEL_4_EXPLORATION: { cue: 'music_l4_exploration', fadeSeconds: .9, resumeSaved: true },
  LEVEL_4_MINIBOSS: { cue: 'music_l4_miniboss', fadeSeconds: .45 },
  LEVEL_4_POST_MINIBOSS: { cue: 'music_l4_exploration', fadeSeconds: .8, resumeSaved: true },
  LEVEL_4_BOSS_INTRO: { cue: 'music_l4_boss', fadeSeconds: .8 },
  LEVEL_4_BOSS: { cue: 'music_l4_boss', fadeSeconds: .25 },
  LEVEL_4_BOSS_DEFEATED: { cue: null, fadeSeconds: 1.5 },
  LEVEL_5_EXPLORATION: { cue: 'music_l5_exploration', fadeSeconds: .9, resumeSaved: true },
  LEVEL_5_MINIBOSS: { cue: 'music_l5_miniboss', fadeSeconds: .45 },
  LEVEL_5_POST_MINIBOSS: { cue: 'music_l5_exploration', fadeSeconds: .8, resumeSaved: true },
  LEVEL_5_BOSS_INTRO: { cue: 'music_l5_boss', fadeSeconds: .8 },
  LEVEL_5_BOSS: { cue: 'music_l5_boss', fadeSeconds: .25 },
  LEVEL_5_BOSS_DEFEATED: { cue: null, fadeSeconds: 1.5 },
  LEVEL_6_EXPLORATION: { cue: 'music_l6_exploration', fadeSeconds: .9, resumeSaved: true },
  LEVEL_6_MINIBOSS: { cue: 'music_l6_miniboss', fadeSeconds: .45 },
  LEVEL_6_POST_MINIBOSS: { cue: 'music_l6_exploration', fadeSeconds: .8, resumeSaved: true },
  LEVEL_6_BOSS_INTRO: { cue: 'music_l6_boss', fadeSeconds: .8 },
  LEVEL_6_BOSS: { cue: 'music_l6_boss', fadeSeconds: .25 },
  LEVEL_6_BOSS_DEFEATED: { cue: null, fadeSeconds: 1.5 },
  LEVEL_7_EXPLORATION: { cue: 'music_l7_exploration', fadeSeconds: .9, resumeSaved: true },
  LEVEL_7_MINIBOSS: { cue: 'music_l7_miniboss', fadeSeconds: .45 },
  LEVEL_7_POST_MINIBOSS: { cue: 'music_l7_exploration', fadeSeconds: .8, resumeSaved: true },
  LEVEL_7_BOSS_INTRO: { cue: 'music_l7_boss', fadeSeconds: .8 },
  LEVEL_7_BOSS: { cue: 'music_l7_boss', fadeSeconds: .25 },
  LEVEL_7_BOSS_DEFEATED: { cue: null, fadeSeconds: 1.5 },
  LEVEL_8_EXPLORATION: { cue: 'music_l8_exploration', fadeSeconds: .9, resumeSaved: true },
  LEVEL_8_MINIBOSS: { cue: 'music_l8_miniboss', fadeSeconds: .45 },
  LEVEL_8_POST_MINIBOSS: { cue: 'music_l8_exploration', fadeSeconds: .8, resumeSaved: true },
  LEVEL_8_BOSS_INTRO: { cue: 'music_l8_boss', fadeSeconds: .8 },
  LEVEL_8_BOSS: { cue: 'music_l8_boss', fadeSeconds: .25 },
  LEVEL_8_BOSS_DEFEATED: { cue: null, fadeSeconds: 1.5 },
  LEVEL_9_EXPLORATION: { cue: 'music_l9_exploration', fadeSeconds: .9, resumeSaved: true },
  LEVEL_9_MINIBOSS: { cue: 'music_l9_boss_rush', fadeSeconds: .45 },
  LEVEL_9_POST_MINIBOSS: { cue: 'music_l9_exploration', fadeSeconds: .8, resumeSaved: true },
  LEVEL_9_BOSS_INTRO: { cue: 'music_l9_mirror_self', fadeSeconds: .8 },
  LEVEL_9_BOSS: { cue: 'music_l9_mirror_self', fadeSeconds: .25 },
  LEVEL_9_FINAL_FIGHT: { cue: 'music_l9_final_fight', fadeSeconds: .7 },
  LEVEL_9_BOSS_DEFEATED: { cue: null, fadeSeconds: 1.5 },
  ALPHA_COMPLETE: { cue: 'music_alpha_complete', fadeSeconds: 1.8 },
};
