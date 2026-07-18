export type ArcaneProfileId = 'a0-control' | 'a1-responsive';

export interface ArcaneTuning {
  id: ArcaneProfileId;
  label: string;
  baseCooldownSeconds: number;
  projectileSpeed: number;
  projectileLifeSeconds: number;
  firePoseSeconds: number;
  baseDamage: number;
  baseRadius: number;
}

const CONTROL_RANGE = 780 * 1.6;

export const ARCANE_PROFILES: Readonly<Record<ArcaneProfileId,Readonly<ArcaneTuning>>> = Object.freeze({
  'a0-control':Object.freeze({
    id:'a0-control',label:'A0 Control',baseCooldownSeconds:.235,projectileSpeed:780,projectileLifeSeconds:1.6,
    firePoseSeconds:.24,baseDamage:17,baseRadius:10,
  }),
  'a1-responsive':Object.freeze({
    id:'a1-responsive',label:'A1 Responsive Candidate',baseCooldownSeconds:.22,projectileSpeed:840,projectileLifeSeconds:CONTROL_RANGE/840,
    firePoseSeconds:.2,baseDamage:17,baseRadius:10,
  }),
});

export function isArcaneProfileId(value: unknown): value is ArcaneProfileId {
  return value === 'a0-control' || value === 'a1-responsive';
}

export function selectArcaneProfile(query: string, stored: string | null): ArcaneProfileId {
  const requested = new URLSearchParams(query).get('arcaneProfile');
  if (isArcaneProfileId(requested)) return requested;
  if (isArcaneProfileId(stored)) return stored;
  return 'a0-control';
}
