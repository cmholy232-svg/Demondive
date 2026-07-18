import { GAME_ACTIONS, KEYBOARD_ACTION_BINDINGS, type GameAction } from './actions';

export type KeyboardProfileId = 'split-hand' | 'arcade' | 'custom';
export type KeyboardBindings = Record<GameAction, string[]>;

export const KEYBOARD_PROFILES: Readonly<Record<Exclude<KeyboardProfileId,'custom'>,Readonly<Record<GameAction,readonly string[]>>>> = Object.freeze({
  'split-hand':KEYBOARD_ACTION_BINDINGS,
  arcade:Object.freeze({
    left:['ArrowLeft','KeyA'],right:['ArrowRight','KeyD'],up:['ArrowUp','KeyW'],down:['ArrowDown','KeyS'],
    jump:['KeyZ','Space'],fire:['KeyX'],special:['KeyV'],dash:['KeyC','ShiftLeft'],interact:['KeyE'],
  }),
});

export interface KeyboardBindingState {
  version: 1;
  profile: KeyboardProfileId;
  bindings: KeyboardBindings;
}

export interface BindingConflict { code: string; actions: GameAction[]; }

export interface BindingStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const INPUT_BINDINGS_KEY = 'demondive-input-bindings-v1';

export function cloneBindings(bindings: Readonly<Record<GameAction,readonly string[]>>): KeyboardBindings {
  return Object.fromEntries(GAME_ACTIONS.map((action) => [action,[...bindings[action]]])) as KeyboardBindings;
}

export function profileBindings(profile: Exclude<KeyboardProfileId,'custom'>): KeyboardBindingState {
  return { version:1,profile,bindings:cloneBindings(KEYBOARD_PROFILES[profile]) };
}

export function bindingConflicts(bindings: Readonly<Record<GameAction,readonly string[]>>): BindingConflict[] {
  const byCode = new Map<string,GameAction[]>();
  for (const action of GAME_ACTIONS) for (const code of bindings[action]) {
    const actions = byCode.get(code) ?? [];
    if (!actions.includes(action)) actions.push(action);
    byCode.set(code,actions);
  }
  return [...byCode.entries()].filter(([,actions]) => actions.length > 1).map(([code,actions]) => ({ code,actions }));
}

function normalizeState(input: unknown): KeyboardBindingState | null {
  if (!input || typeof input !== 'object') return null;
  const candidate = input as { version?: unknown;profile?: unknown;bindings?: unknown };
  if (candidate.version !== 1 || !candidate.bindings || typeof candidate.bindings !== 'object') return null;
  const bindings = candidate.bindings as Partial<Record<GameAction,unknown>>;
  const normalized = cloneBindings(KEYBOARD_ACTION_BINDINGS);
  for (const action of GAME_ACTIONS) {
    const values = bindings[action];
    if (Array.isArray(values)) {
      const codes = [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))].slice(0,3);
      if (codes.length > 0) normalized[action] = codes;
    }
  }
  const profile: KeyboardProfileId = candidate.profile === 'split-hand' || candidate.profile === 'arcade' || candidate.profile === 'custom' ? candidate.profile : 'custom';
  return { version:1,profile,bindings:normalized };
}

export class KeyboardBindingRepository {
  constructor(private readonly storage: BindingStorage, private readonly key = INPUT_BINDINGS_KEY) {}

  load(): KeyboardBindingState {
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return profileBindings('split-hand');
      return normalizeState(JSON.parse(raw)) ?? profileBindings('split-hand');
    } catch { return profileBindings('split-hand'); }
  }

  write(state: KeyboardBindingState): boolean {
    try { this.storage.setItem(this.key,JSON.stringify(state)); return true; }
    catch { return false; }
  }

  reset(): boolean {
    try { this.storage.removeItem(this.key); return true; }
    catch { return false; }
  }
}

export function rebindAction(state: KeyboardBindingState, action: GameAction, code: string): KeyboardBindingState {
  const bindings = cloneBindings(state.bindings);
  bindings[action] = [code];
  return { version:1,profile:'custom',bindings };
}
