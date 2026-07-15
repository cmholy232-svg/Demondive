export interface DiveProgress {
  level: number;
  xp: number;
}

export interface DiveXpAward extends DiveProgress {
  awarded: number;
  levelsGained: number;
  xpRequired: number;
}

const MAX_PROFILE_LEVEL = 1_000_000;
const MAX_XP_REQUIREMENT = Number.MAX_SAFE_INTEGER;

function safeWholeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;
}

/**
 * Cosmetic-only lifetime progression. Levels 1–20 arrive quickly, 21–50
 * settle into a medium climb, 51–90 become long-term goals, and 90+ uses an
 * exponential prestige tail. This value must never affect combat power.
 */
export function diveXpRequired(level: number): number {
  const normalized = Math.min(MAX_PROFILE_LEVEL, Math.max(1, safeWholeNumber(level, 1)));
  let requirement: number;
  if (normalized <= 20) {
    const offset = normalized - 1;
    requirement = 120 + offset * 26 + offset * offset * 2;
  } else if (normalized <= 50) {
    const offset = normalized - 20;
    requirement = 1_336 + offset * 95 + offset * offset * 5;
  } else if (normalized <= 90) {
    const offset = normalized - 50;
    requirement = 8_686 + offset * 250 + offset * offset * 20;
  } else {
    requirement = 50_686 * Math.pow(1.14, (normalized - 90) / 5);
  }
  return Math.min(MAX_XP_REQUIREMENT, Math.max(1, Math.round(requirement)));
}

export function normalizeDiveProgress(level: unknown, xp: unknown): DiveProgress {
  let normalizedLevel = Math.min(MAX_PROFILE_LEVEL, Math.max(1, safeWholeNumber(level, 1)));
  let normalizedXp = safeWholeNumber(xp, 0);
  let requirement = diveXpRequired(normalizedLevel);
  while (normalizedXp >= requirement && normalizedLevel < MAX_PROFILE_LEVEL) {
    normalizedXp -= requirement;
    normalizedLevel += 1;
    requirement = diveXpRequired(normalizedLevel);
  }
  if (normalizedLevel === MAX_PROFILE_LEVEL) normalizedXp = Math.min(normalizedXp, requirement - 1);
  return { level: normalizedLevel, xp: normalizedXp };
}

export function awardDiveXp(progress: DiveProgress, amount: number): DiveXpAward {
  const start = normalizeDiveProgress(progress.level, progress.xp);
  const awarded = safeWholeNumber(amount, 0);
  const finish = normalizeDiveProgress(start.level, start.xp + awarded);
  return {
    ...finish,
    awarded,
    levelsGained: finish.level - start.level,
    xpRequired: diveXpRequired(finish.level),
  };
}

export const DIVE_XP_REWARDS = Object.freeze({
  enemy: 5,
  eliteEnemy: 9,
  miniboss: 90,
  boss: 175,
  room: 24,
  eliteRoomBonus: 18,
  challengeRoomBonus: 24,
  boon: 16,
  wagerWin: 35,
  completedRun: 18,
  campaignVictory: 110,
  deepDiveBoss: 70,
  deepDiveRecord: 25,
});
