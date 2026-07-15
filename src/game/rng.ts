export interface RandomSource {
  readonly seed: number;
  next(): number;
  int(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(values: readonly T[]): T;
  shuffle<T>(values: readonly T[]): T[];
  fork(label: string | number): SeededRandom;
}

function mix32(value: number): number {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

export function hashSeed(value: string | number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return mix32(Math.floor(value));
  const text = String(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return mix32(hash);
}

export function createRunSeed(now = Date.now()): number {
  const entropy = Math.floor(Math.random() * 0xffffffff);
  return mix32(now ^ entropy);
}

export class SeededRandom implements RandomSource {
  readonly seed: number;
  private state: number;

  constructor(seed: string | number) {
    this.seed = hashSeed(seed) || 0x6d2b79f5;
    this.state = this.seed;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    const low = Math.ceil(Math.min(min, max));
    const high = Math.floor(Math.max(min, max));
    return low + Math.floor(this.next() * (high - low + 1));
  }

  chance(probability: number): boolean {
    return this.next() < Math.max(0, Math.min(1, probability));
  }

  pick<T>(values: readonly T[]): T {
    if (values.length === 0) throw new Error('Cannot choose from an empty collection.');
    return values[this.int(0, values.length - 1)];
  }

  shuffle<T>(values: readonly T[]): T[] {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = this.int(0, index);
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  }

  fork(label: string | number): SeededRandom {
    return new SeededRandom(`${this.seed}:${label}`);
  }
}
