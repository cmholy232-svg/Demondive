export type MovementProfileId = 'a0-control' | 'a1-responsive';

export interface MovementTuning {
  id: MovementProfileId;
  label: string;
  runSpeed: number;
  groundAcceleration: number;
  airAcceleration: number;
  groundFriction: number;
  airFriction: number;
  gravity: number;
  jumpVelocity: number;
  jumpReleaseGravity: number;
  fallSpeedCap: number;
  fastFallGravity: number;
  fastFallSpeedCap: number;
  coyoteSeconds: number;
  jumpBufferSeconds: number;
  fireBufferSeconds: number;
  dashSpeed: number;
  dashDurationSeconds: number;
  dashCooldownSeconds: number;
  wavelandSpeed: number;
  wavelandDurationSeconds: number;
  dashRecoverySeconds: number;
}

export const MOVEMENT_PROFILES: Readonly<Record<MovementProfileId,Readonly<MovementTuning>>> = Object.freeze({
  'a0-control':Object.freeze({
    id:'a0-control',label:'A0 Control',runSpeed:360,groundAcceleration:3500,airAcceleration:2050,
    groundFriction:3000,airFriction:330,gravity:2350,jumpVelocity:-760,jumpReleaseGravity:1750,
    fallSpeedCap:1200,fastFallGravity:1450,fastFallSpeedCap:1450,coyoteSeconds:.11,jumpBufferSeconds:.13,fireBufferSeconds:.2,
    dashSpeed:890,dashDurationSeconds:.18,dashCooldownSeconds:.09,wavelandSpeed:780,wavelandDurationSeconds:.3,dashRecoverySeconds:.12,
  }),
  'a1-responsive':Object.freeze({
    id:'a1-responsive',label:'A1 Responsive Candidate',runSpeed:360,groundAcceleration:4200,airAcceleration:2250,
    groundFriction:3800,airFriction:420,gravity:2350,jumpVelocity:-760,jumpReleaseGravity:1750,
    fallSpeedCap:1200,fastFallGravity:1450,fastFallSpeedCap:1450,coyoteSeconds:.13,jumpBufferSeconds:.15,fireBufferSeconds:.22,
    dashSpeed:890,dashDurationSeconds:.18,dashCooldownSeconds:.09,wavelandSpeed:780,wavelandDurationSeconds:.3,dashRecoverySeconds:.12,
  }),
});

export function isMovementProfileId(value: unknown): value is MovementProfileId {
  return value === 'a0-control' || value === 'a1-responsive';
}

export function selectMovementProfile(query: string, stored: string | null): MovementProfileId {
  const requested = new URLSearchParams(query).get('movementProfile');
  if (isMovementProfileId(requested)) return requested;
  if (isMovementProfileId(stored)) return stored;
  return 'a0-control';
}
