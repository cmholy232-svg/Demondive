import { BOONS, CAMPAIGN_PLAN } from './content';
import type { AccessTier, BoonId } from './types';

export type RuntimeChannel = 'pc-master' | 'mobile';
export type EntitlementSource = 'pc-master' | 'free-default' | 'store' | 'restore' | 'developer';

export interface AccessContext {
  channel: RuntimeChannel;
  tier: AccessTier;
  source: EntitlementSource;
}

// The PC/master build always contains and exposes the complete authored game.
export const PC_MASTER_ACCESS: Readonly<AccessContext> = Object.freeze({ channel:'pc-master', tier:'full', source:'pc-master' });
export const MOBILE_FREE_ACCESS: Readonly<AccessContext> = Object.freeze({ channel:'mobile', tier:'free', source:'free-default' });
export const MOBILE_FULL_TEST_ACCESS: Readonly<AccessContext> = Object.freeze({ channel:'mobile', tier:'full', source:'developer' });

export const ENTITLEMENT_TEST_CONTEXTS = Object.freeze({
  pcMaster:PC_MASTER_ACCESS,
  mobileFree:MOBILE_FREE_ACCESS,
  mobileFull:MOBILE_FULL_TEST_ACCESS,
});

export function tierAllows(required: AccessTier, access: AccessContext): boolean {
  return required === 'free' || access.tier === 'full';
}

export function canAccessCampaignLevel(level: number, access: AccessContext): boolean {
  const definition = CAMPAIGN_PLAN.find(candidate => candidate.level === Math.floor(level));
  return Boolean(definition && tierAllows(definition.accessTier,access));
}

export function canAccessBoon(id: BoonId, access: AccessContext): boolean {
  return tierAllows(BOONS[id].accessTier,access);
}

export function canAccessDeepDiveBiome(level: number, access: AccessContext): boolean {
  const definition = CAMPAIGN_PLAN.find(candidate => candidate.level === Math.floor(level));
  return Boolean(definition && tierAllows(definition.accessTier,access));
}

export function fullDiveLockReason(kind: 'campaign' | 'boon' | 'deep-dive'): string {
  if (kind === 'campaign') return 'Full Dive unlocks campaign Levels 4–9.';
  if (kind === 'deep-dive') return 'Full Dive unlocks all nine Deep Dive biomes.';
  return 'Full Dive unlocks the remaining twelve boon-givers.';
}
