import { cloneDefaultSave, migrateSave } from './save';
import type { SaveData } from './types';

export const CURRENT_SAVE_KEY = 'demondive-save-v2';
export const LEGACY_SAVE_KEYS = Object.freeze(['isad-vertical-slice-v1']);

export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type SaveLoadSource = 'current' | 'legacy' | 'fresh';

export interface SaveLoadResult {
  save: SaveData;
  source: SaveLoadSource;
  migrated: boolean;
  corruptKeys: string[];
  storageAvailable: boolean;
}

export interface SaveRepository {
  load(): SaveLoadResult;
  write(save: SaveData): boolean;
  reset(): boolean;
}

function readCandidate(storage: SaveStorage, key: string): { value: unknown; corrupt: false } | { corrupt: true } | null {
  const raw = storage.getItem(key);
  if (raw === null) return null;
  try { return { value:JSON.parse(raw), corrupt:false }; }
  catch { return { corrupt:true }; }
}

export class BrowserSaveRepository implements SaveRepository {
  constructor(
    private readonly storage: SaveStorage,
    private readonly currentKey = CURRENT_SAVE_KEY,
    private readonly legacyKeys: readonly string[] = LEGACY_SAVE_KEYS,
  ) {}

  load(): SaveLoadResult {
    const corruptKeys: string[] = [];
    try {
      const current = readCandidate(this.storage,this.currentKey);
      if (current && !current.corrupt) {
        const save = migrateSave(current.value);
        return { save, source:'current', migrated:(current.value as { version?: unknown } | null)?.version !== save.version, corruptKeys, storageAvailable:true };
      }
      if (current?.corrupt) corruptKeys.push(this.currentKey);
      for (const key of this.legacyKeys) {
        const legacy = readCandidate(this.storage,key);
        if (!legacy) continue;
        if (legacy.corrupt) { corruptKeys.push(key); continue; }
        return { save:migrateSave(legacy.value), source:'legacy', migrated:true, corruptKeys, storageAvailable:true };
      }
      return { save:cloneDefaultSave(), source:'fresh', migrated:false, corruptKeys, storageAvailable:true };
    } catch {
      return { save:cloneDefaultSave(), source:'fresh', migrated:false, corruptKeys, storageAvailable:false };
    }
  }

  write(save: SaveData): boolean {
    try { this.storage.setItem(this.currentKey,JSON.stringify(save)); return true; }
    catch { return false; }
  }

  reset(): boolean {
    try {
      this.storage.removeItem(this.currentKey);
      for (const key of this.legacyKeys) this.storage.removeItem(key);
      return true;
    } catch { return false; }
  }
}
