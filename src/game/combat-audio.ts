export type CombatSfxEvent = 'enemyHit' | 'enemyShoot' | 'playerHit' | 'enemyDown' | 'bossDown';

interface CombatSfxLimit {
  cooldownSeconds: number;
  maxVoices: number;
}

export const COMBAT_SFX_LIMITS: Readonly<Record<CombatSfxEvent, CombatSfxLimit>> = Object.freeze({
  enemyHit: { cooldownSeconds:.04, maxVoices:4 },
  enemyShoot: { cooldownSeconds:.065, maxVoices:3 },
  playerHit: { cooldownSeconds:.1, maxVoices:1 },
  enemyDown: { cooldownSeconds:.045, maxVoices:3 },
  bossDown: { cooldownSeconds:.35, maxVoices:1 },
});

/**
 * Keeps dense builds readable and prevents WebAudio voice explosions. The gate
 * changes presentation only; rejected sounds never alter combat simulation.
 */
export class CombatSfxLimiter {
  private readonly active: Record<CombatSfxEvent, number> = {
    enemyHit:0, enemyShoot:0, playerHit:0, enemyDown:0, bossDown:0,
  };

  private readonly lastStarted: Record<CombatSfxEvent, number> = {
    enemyHit:Number.NEGATIVE_INFINITY,
    enemyShoot:Number.NEGATIVE_INFINITY,
    playerHit:Number.NEGATIVE_INFINITY,
    enemyDown:Number.NEGATIVE_INFINITY,
    bossDown:Number.NEGATIVE_INFINITY,
  };

  tryAcquire(event: CombatSfxEvent, nowSeconds: number): boolean {
    const now = Number.isFinite(nowSeconds) ? nowSeconds : 0;
    const limit = COMBAT_SFX_LIMITS[event];
    if (this.active[event] >= limit.maxVoices) return false;
    if (now - this.lastStarted[event] < limit.cooldownSeconds) return false;
    this.active[event] += 1;
    this.lastStarted[event] = now;
    return true;
  }

  release(event: CombatSfxEvent): void {
    this.active[event] = Math.max(0, this.active[event] - 1);
  }

  activeVoices(event: CombatSfxEvent): number {
    return this.active[event];
  }

  reset(): void {
    for (const event of Object.keys(this.active) as CombatSfxEvent[]) {
      this.active[event] = 0;
      this.lastStarted[event] = Number.NEGATIVE_INFINITY;
    }
  }
}
