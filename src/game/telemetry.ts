import type { GameAction } from './actions';
import type { GameScreen, GateSide, RoomType } from './types';

export const TELEMETRY_SCHEMA_VERSION = 1;
export const ALPHA74A_BASELINE_ID = 'A0-alpha75-playable-339f20f';

export type ActionRejectionReason =
  | 'dash-lock'
  | 'attack-lock'
  | 'cooldown'
  | 'no-dash-charge'
  | 'insufficient-energy'
  | 'special-condition'
  | 'buffer-expired'
  | 'combat-disabled'
  | 'context-interaction'
  | 'screen-blocked';
export type ActionOutcomeReason = ActionRejectionReason | 'buffered' | 'drop-through' | 'fired' | 'activated';

export interface EntityCounts {
  enemies: number;
  projectiles: number;
  particles: number;
  floatingText: number;
  bossHazards: number;
  lightning: number;
  lightRays: number;
  gusts: number;
  activeSfx: number;
}

export const ENTITY_WARNING_BUDGETS: Readonly<EntityCounts> = Object.freeze({
  enemies:72,
  projectiles:260,
  particles:520,
  floatingText:72,
  bossHazards:72,
  lightning:64,
  lightRays:10,
  gusts:7,
  activeSfx:16,
});

interface TelemetryEventBase { atMs: number; screen: GameScreen; }
export type RuntimeTelemetryEvent =
  | (TelemetryEventBase & { kind:'action'; action:GameAction; outcome:'consumed' | 'ignored'; reason?:ActionOutcomeReason })
  | (TelemetryEventBase & { kind:'movement'; x:number; y:number; vx:number; vy:number; grounded:boolean; dashing:boolean })
  | (TelemetryEventBase & { kind:'shot'; projectilesSpawned:number; totalStacks:number })
  | (TelemetryEventBase & { kind:'entity-cap'; entity:keyof EntityCounts; count:number; limit:number; trimmed:number })
  | (TelemetryEventBase & { kind:'presentation-consolidation'; entity:'projectiles'; logicalCount:number; detailedCount:number; simplifiedCount:number; suppressedCount:number })
  | (TelemetryEventBase & { kind:'room'; event:'entered' | 'cleared'; depth:number; roomIndex:number; roomType:RoomType; entry:GateSide; exit:GateSide; seed:number })
  | (TelemetryEventBase & { kind:'death'; depth:number; roomIndex:number; seed:number; damageTaken:number });

export interface TelemetrySnapshot {
  schemaVersion: number;
  baselineId: string;
  buildId: string;
  sessionStartedAt: string;
  frames: { samples:number; averageMs:number; p95Ms:number; maxMs:number; overBudget:number; clamped:number };
  actionTotals: { consumed:number; ignored:number; ignoredByReason:Record<string,number> };
  peakEntities: EntityCounts;
  events: RuntimeTelemetryEvent[];
}

function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a,b) => a-b);
  return sorted[Math.min(sorted.length - 1,Math.floor((sorted.length - 1) * fraction))];
}

export class RuntimeTelemetry {
  private readonly startedAt = new Date().toISOString();
  private readonly events: RuntimeTelemetryEvent[] = [];
  private readonly frameTimes: number[] = [];
  private movementSampleAt = -Infinity;
  private frameTotal = 0;
  private frameSamples = 0;
  private frameMax = 0;
  private framesOverBudget = 0;
  private clampedFrames = 0;
  private consumedActions = 0;
  private ignoredActions = 0;
  private readonly ignoredByReason: Record<string,number> = {};
  private readonly capLastRecordedAt: Partial<Record<keyof EntityCounts,number>> = {};
  private presentationLastRecordedAt = -Infinity;
  private readonly peakEntities: EntityCounts = { enemies:0,projectiles:0,particles:0,floatingText:0,bossHazards:0,lightning:0,lightRays:0,gusts:0,activeSfx:0 };

  constructor(private readonly buildId: string, private readonly maxEvents = 2400, private readonly maxFrameSamples = 900) {}

  recordFrame(rawDeltaMs: number, simulatedDeltaMs: number, entities: EntityCounts): void {
    if (!Number.isFinite(rawDeltaMs) || rawDeltaMs < 0) return;
    this.frameTotal += rawDeltaMs;
    this.frameSamples += 1;
    this.frameMax = Math.max(this.frameMax,rawDeltaMs);
    if (rawDeltaMs > 1000 / 50) this.framesOverBudget += 1;
    if (simulatedDeltaMs + .01 < rawDeltaMs) this.clampedFrames += 1;
    this.frameTimes.push(rawDeltaMs);
    if (this.frameTimes.length > this.maxFrameSamples) this.frameTimes.splice(0,this.frameTimes.length - this.maxFrameSamples);
    for (const key of Object.keys(entities) as Array<keyof EntityCounts>) this.peakEntities[key] = Math.max(this.peakEntities[key],entities[key]);
  }

  recordAction(atMs: number, screen: GameScreen, action: GameAction, outcome: 'ignored', reason: ActionRejectionReason): void;
  recordAction(atMs: number, screen: GameScreen, action: GameAction, outcome: 'consumed', reason?: Exclude<ActionOutcomeReason,ActionRejectionReason>): void;
  recordAction(atMs: number, screen: GameScreen, action: GameAction, outcome: 'consumed' | 'ignored', reason?: ActionOutcomeReason): void {
    if (outcome === 'consumed') this.consumedActions += 1;
    else {
      this.ignoredActions += 1;
      const key = reason ?? 'unclassified';
      this.ignoredByReason[key] = (this.ignoredByReason[key] ?? 0) + 1;
    }
    this.push({ kind:'action',atMs,screen,action,outcome,...(reason ? { reason } : {}) });
  }

  recordMovement(atMs: number, screen: GameScreen, sample: Omit<Extract<RuntimeTelemetryEvent,{kind:'movement'}>,'kind'|'atMs'|'screen'>): void {
    if (atMs - this.movementSampleAt < 250) return;
    this.movementSampleAt = atMs;
    this.push({ kind:'movement',atMs,screen,...sample });
  }

  recordShot(atMs: number, screen: GameScreen, projectilesSpawned: number, totalStacks: number): void {
    this.push({ kind:'shot',atMs,screen,projectilesSpawned,totalStacks });
  }

  recordEntityCap(atMs: number, screen: GameScreen, entity: keyof EntityCounts, count: number, limit: number, trimmed: number): void {
    if (atMs - (this.capLastRecordedAt[entity] ?? -Infinity) < 500) return;
    this.capLastRecordedAt[entity] = atMs;
    this.push({ kind:'entity-cap',atMs,screen,entity,count,limit,trimmed });
  }

  recordPresentationConsolidation(atMs:number,screen:GameScreen,data:Omit<Extract<RuntimeTelemetryEvent,{kind:'presentation-consolidation'}>,'kind'|'atMs'|'screen'>):void {
    if(atMs-this.presentationLastRecordedAt<500)return;
    this.presentationLastRecordedAt=atMs;
    this.push({kind:'presentation-consolidation',atMs,screen,...data});
  }

  recordRoom(atMs: number, screen: GameScreen, event: 'entered' | 'cleared', data: Omit<Extract<RuntimeTelemetryEvent,{kind:'room'}>,'kind'|'atMs'|'screen'|'event'>): void {
    this.push({ kind:'room',atMs,screen,event,...data });
  }

  recordDeath(atMs: number, screen: GameScreen, data: Omit<Extract<RuntimeTelemetryEvent,{kind:'death'}>,'kind'|'atMs'|'screen'>): void {
    this.push({ kind:'death',atMs,screen,...data });
  }

  snapshot(): TelemetrySnapshot {
    return {
      schemaVersion:TELEMETRY_SCHEMA_VERSION,
      baselineId:ALPHA74A_BASELINE_ID,
      buildId:this.buildId,
      sessionStartedAt:this.startedAt,
      frames:{
        samples:this.frameSamples,
        averageMs:this.frameSamples ? this.frameTotal / this.frameSamples : 0,
        p95Ms:percentile(this.frameTimes,.95),
        maxMs:this.frameMax,
        overBudget:this.framesOverBudget,
        clamped:this.clampedFrames,
      },
      actionTotals:{ consumed:this.consumedActions,ignored:this.ignoredActions,ignoredByReason:{...this.ignoredByReason} },
      peakEntities:{...this.peakEntities},
      events:[...this.events],
    };
  }

  private push(event: RuntimeTelemetryEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) this.events.splice(0,this.events.length - this.maxEvents);
  }
}
