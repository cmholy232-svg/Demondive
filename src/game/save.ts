import { BOON_ORDER, DEFAULT_SAVE, LEGACY_BOON_MIGRATION, UPGRADE_INFO } from './content';
import { normalizeDiveProgress } from './profile-level';
import type { BoonId, RunSummaryRecord, SaveData, UpgradeId } from './types';

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function safeVolume(value: unknown, fallback: number): number {
  return Math.min(1, safeNumber(value, fallback));
}

function safeStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function safeRunRecords(value: unknown): RunSummaryRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate,index) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const record = candidate as Partial<RunSummaryRecord>;
    const result = record.result === 'death' || record.result === 'returned' || record.result === 'victory' ? record.result : 'death';
    const topBoon = typeof record.topBoon === 'string' && BOON_ORDER.includes(record.topBoon as BoonId) ? record.topBoon as BoonId : undefined;
    return [{
      id:typeof record.id === 'string' ? record.id : `migrated-${index}`,
      seed:Math.floor(safeNumber(record.seed)),result,durationSeconds:Math.floor(safeNumber(record.durationSeconds)),
      roomsCleared:Math.floor(safeNumber(record.roomsCleared)),endlessDepth:Math.floor(safeNumber(record.endlessDepth)),
      shardsBanked:Math.floor(safeNumber(record.shardsBanked)),score:Math.floor(safeNumber(record.score)),highestStyle:Math.min(100,safeNumber(record.highestStyle)),
      damageTaken:Math.floor(safeNumber(record.damageTaken)),enemiesDefeated:Math.floor(safeNumber(record.enemiesDefeated)),
      boonsAcquired:Math.floor(safeNumber(record.boonsAcquired)),wagersAttempted:Math.floor(safeNumber(record.wagersAttempted)),
      wagersWon:Math.floor(safeNumber(record.wagersWon)),diveXpEarned:Math.floor(safeNumber(record.diveXpEarned)),...(topBoon?{topBoon}:{}),
    }];
  }).slice(-10);
}

function migrateBoonList(values: unknown, fallback: BoonId[] = []): BoonId[] {
  const source = Array.isArray(values) ? values : fallback;
  const migrated = source.map((value) => {
    if (typeof value !== 'string') return null;
    if (BOON_ORDER.includes(value as BoonId)) return value as BoonId;
    return LEGACY_BOON_MIGRATION[value] ?? null;
  }).filter((value): value is BoonId => Boolean(value));
  return [...new Set(migrated)];
}

export function cloneDefaultSave(): SaveData {
  return {
    ...DEFAULT_SAVE,
    unlocked: [...DEFAULT_SAVE.unlocked],
    collection: [...DEFAULT_SAVE.collection],
    milestones: [...DEFAULT_SAVE.milestones],
    storyFlags: [...DEFAULT_SAVE.storyFlags],
    recentRuns: [...DEFAULT_SAVE.recentRuns],
    upgrades: { ...DEFAULT_SAVE.upgrades },
    settings: { ...DEFAULT_SAVE.settings },
  };
}

export function migrateSave(input: unknown): SaveData {
  if (!input || typeof input !== 'object') return cloneDefaultSave();
  const parsed = input as Partial<SaveData> & { unlocked?: unknown; collection?: unknown; upgrades?: Partial<Record<UpgradeId, unknown>> };
  const unlocked = migrateBoonList(parsed.unlocked, ['pyrra']);
  if (!unlocked.includes('pyrra')) unlocked.unshift('pyrra');
  const collection = migrateBoonList(parsed.collection, unlocked);
  if (!collection.includes('pyrra')) collection.unshift('pyrra');
  const parsedUpgrades = parsed.upgrades ?? DEFAULT_SAVE.upgrades;
  const upgrades = Object.fromEntries((Object.keys(UPGRADE_INFO) as UpgradeId[]).map((id) => [
    id,
    Math.min(UPGRADE_INFO[id].max, Math.floor(safeNumber(parsedUpgrades[id]))),
  ])) as Record<UpgradeId, number>;
  const diveProgress = normalizeDiveProgress(parsed.diveLevel, parsed.diveXp);

  return {
    version: 4,
    shards: Math.floor(safeNumber(parsed.shards)),
    unlocked,
    collection,
    milestones: safeStrings(parsed.milestones),
    storyFlags: safeStrings(parsed.storyFlags),
    upgrades,
    bestRoom: Math.floor(safeNumber(parsed.bestRoom)),
    wins: Math.floor(safeNumber(parsed.wins)),
    bestStyle: Math.min(100, Math.floor(safeNumber(parsed.bestStyle))),
    sRanks: Math.floor(safeNumber(parsed.sRanks)),
    jackpots: Math.floor(safeNumber(parsed.jackpots)),
    wagersWon: Math.floor(safeNumber(parsed.wagersWon)),
    highScore: Math.floor(safeNumber(parsed.highScore)),
    endlessUnlocked: parsed.endlessUnlocked === true || safeNumber(parsed.wins) > 0,
    bestEndless: Math.floor(safeNumber(parsed.bestEndless)),
    bestRunTime: Math.floor(safeNumber(parsed.bestRunTime)),
    diveLevel: diveProgress.level,
    diveXp: diveProgress.xp,
    lifetimeRooms: Math.floor(safeNumber(parsed.lifetimeRooms)),
    lifetimeEnemies: Math.floor(safeNumber(parsed.lifetimeEnemies)),
    lifetimeRuns: Math.floor(safeNumber(parsed.lifetimeRuns)),
    recentRuns: safeRunRecords(parsed.recentRuns),
    settings: {
      sound: parsed.settings?.sound ?? DEFAULT_SAVE.settings.sound,
      voice: parsed.settings?.voice ?? DEFAULT_SAVE.settings.voice,
      shake: parsed.settings?.shake ?? DEFAULT_SAVE.settings.shake,
      reducedVfx: parsed.settings?.reducedVfx ?? DEFAULT_SAVE.settings.reducedVfx,
      masterVolume: safeVolume(parsed.settings?.masterVolume, parsed.settings?.sound === false ? 0 : DEFAULT_SAVE.settings.masterVolume),
      musicVolume: safeVolume(parsed.settings?.musicVolume, DEFAULT_SAVE.settings.musicVolume),
      sfxVolume: safeVolume(parsed.settings?.sfxVolume, DEFAULT_SAVE.settings.sfxVolume),
      voiceVolume: safeVolume(parsed.settings?.voiceVolume, DEFAULT_SAVE.settings.voiceVolume),
    },
  };
}

export function parseAndMigrateSave(raw: string | null): SaveData {
  if (!raw) return cloneDefaultSave();
  try { return migrateSave(JSON.parse(raw)); }
  catch { return cloneDefaultSave(); }
}
