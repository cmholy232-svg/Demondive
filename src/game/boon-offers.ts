import type { BoonId } from './types';
import type { RandomSource } from './rng';

export interface SmartBoonOfferInput {
  pool: readonly BoonId[];
  stacks: Readonly<Record<BoonId, number>>;
  startingBoon: BoonId;
  lastRewardBoon: BoonId;
  drought: Readonly<Record<BoonId, number>>;
  rng: RandomSource;
  count?: number;
  reroll?: boolean;
  forcedBoon?: BoonId;
}

export interface SmartBoonOfferResult {
  choices: BoonId[];
  drought: Record<BoonId, number>;
  usedFocusSlot: boolean;
}

export function weightedPick<T>(values: readonly T[], weightFor: (value: T) => number, rng: RandomSource): T {
  if (!values.length) throw new Error('Cannot choose from an empty weighted pool.');
  const weights = values.map(value => Math.max(0.0001, weightFor(value)));
  const total = weights.reduce((sum, value) => sum + value, 0);
  let roll = rng.next() * total;
  for (let index = 0; index < values.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) return values[index];
  }
  return values.at(-1)!;
}

function stackDamping(stack: number): number {
  // Deliberately soft: very tall stacks remain possible, but each additional
  // duplicate has to beat increasingly long odds instead of being guaranteed.
  return 1 / (1 + Math.max(0, stack - 3) * .38);
}

export function chooseSmartBoonOffers(input: SmartBoonOfferInput): SmartBoonOfferResult {
  const count = Math.max(1, input.count ?? 2);
  const candidates = [...new Set(input.pool)];
  if (input.forcedBoon && !candidates.includes(input.forcedBoon)) candidates.push(input.forcedBoon);
  if (!candidates.length) throw new Error('Smart boon offers require at least one candidate.');

  const choices: BoonId[] = [];
  const forced = input.forcedBoon;
  if (forced) choices.push(forced);

  const invested = candidates.filter(id => input.stacks[id] > 0 && id !== forced);
  const investmentDamping=invested.length?invested.reduce((sum,id)=>sum+stackDamping(input.stacks[id]),0)/invested.length:1;
  const focusChance = (input.reroll ? .62 : .42) * Math.max(.52,investmentDamping);
  const useFocus = invested.length > 0 && choices.length < count && input.rng.chance(focusChance);

  if (useFocus) {
    const focus = weightedPick(invested, id => {
      const stack = input.stacks[id];
      const starterWeight = id === input.startingBoon ? 1.65 : 1;
      const recentlyChosen = id === input.lastRewardBoon ? .62 : 1;
      const droughtRelief = 1 + Math.min(8, input.drought[id] ?? 0) * .11;
      return starterWeight * recentlyChosen * droughtRelief * (1.25 + Math.sqrt(stack) * 1.35) * stackDamping(stack);
    }, input.rng);
    choices.push(focus);
  }

  while (choices.length < count && choices.length < candidates.length) {
    const remaining = candidates.filter(id => !choices.includes(id));
    const choice = weightedPick(remaining, id => {
      const stack = input.stacks[id];
      if (stack === 0) return 2.8;
      const starterWeight = id === input.startingBoon ? 1.25 : 1;
      const recentlyChosen = id === input.lastRewardBoon ? .72 : 1;
      const droughtRelief = 1 + Math.min(8, input.drought[id] ?? 0) * .07;
      return .72 * starterWeight * recentlyChosen * droughtRelief * stackDamping(stack);
    }, input.rng);
    choices.push(choice);
  }

  const nextDrought = { ...input.drought } as Record<BoonId, number>;
  for (const id of candidates) {
    if (input.stacks[id] <= 0) continue;
    nextDrought[id] = choices.includes(id) ? 0 : Math.min(12, (nextDrought[id] ?? 0) + 1);
  }

  return { choices, drought: nextDrought, usedFocusSlot: useFocus };
}
