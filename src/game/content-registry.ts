import { CAMPAIGN_PLAN } from './content';
import type { AccessTier, BoonId, CampaignLevelDefinition } from './types';

export type ContentBuildStatus = 'playable' | 'planned';

export interface CampaignStoryHooks {
  entrance: string;
  boonMoments: Readonly<Partial<Record<BoonId, string>>>;
  minibossIntro: string;
  bossIntro: string;
  revelation: string;
}

export interface CampaignContentRegistration {
  id: string;
  publicLevel: number;
  name: string;
  internalDepthProfiles: readonly number[];
  accessTier: AccessTier;
  buildStatus: ContentBuildStatus;
  deepDiveRegistered: boolean;
  musicSlots: Readonly<{ exploration:string; miniboss:string; boss:string }>;
  storyHooks: CampaignStoryHooks;
}

export const CONTENT_REGISTRY_VERSION = 6;

function levelId(definition: CampaignLevelDefinition): string {
  return `level-${definition.level}-${definition.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`;
}

function storyHooks(definition: CampaignLevelDefinition): CampaignStoryHooks {
  const prefix = `campaign.level.${definition.level}`;
  return {
    entrance:`${prefix}.entrance`,
    boonMoments:Object.freeze(Object.fromEntries(definition.boonUnlocks.map(id => [id,`${prefix}.boon.${id}`])) as Partial<Record<BoonId,string>>),
    minibossIntro:`${prefix}.miniboss.intro`,
    bossIntro:`${prefix}.boss.intro`,
    revelation:`${prefix}.revelation`,
  };
}

export const CAMPAIGN_CONTENT_REGISTRY: readonly CampaignContentRegistration[] = Object.freeze(CAMPAIGN_PLAN.map(definition => ({
  id:levelId(definition),
  publicLevel:definition.level,
  name:definition.name,
  internalDepthProfiles:Object.freeze([...definition.depthProfiles]),
  accessTier:definition.accessTier,
  buildStatus:(definition.level <= 9 ? 'playable' : 'planned') as ContentBuildStatus,
  deepDiveRegistered:definition.level <= 9,
  musicSlots:Object.freeze({
    exploration:`LEVEL_${definition.level}_EXPLORATION`,
    miniboss:`LEVEL_${definition.level}_MINIBOSS`,
    boss:`LEVEL_${definition.level}_BOSS`,
  }),
  storyHooks:storyHooks(definition),
})));

export function campaignContent(level: number): CampaignContentRegistration {
  const found = CAMPAIGN_CONTENT_REGISTRY.find(entry => entry.publicLevel === Math.floor(level));
  if (!found) throw new Error(`Unknown public campaign level: ${level}`);
  return found;
}

export function publicLevelForDepthProfile(depthProfile: number): number | null {
  return CAMPAIGN_CONTENT_REGISTRY.find(entry => entry.internalDepthProfiles.includes(Math.floor(depthProfile)))?.publicLevel ?? null;
}
