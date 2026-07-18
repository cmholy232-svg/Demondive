import assert from 'node:assert/strict';
import { GAME_ACTIONS, DevicePromptService } from '../src/game/actions';
import { BOONS, BOON_ORDER, FLOOR_Y, WIDTH } from '../src/game/content';
import { canAccessBoon, canAccessCampaignLevel, ENTITLEMENT_TEST_CONTEXTS } from '../src/game/entitlements';
import { generateRunPlan, roomIsEmpty } from '../src/game/generator';
import { validateRoomTraversal } from '../src/game/room-quality';
import { newRunRequest, sameSeedRetryRequest } from '../src/game/run-retry';
import { cloneDefaultSave } from '../src/game/save';
import { BrowserSaveRepository, CURRENT_SAVE_KEY, LEGACY_SAVE_KEYS, type SaveStorage } from '../src/game/save-repository';
import { RuntimeTelemetry } from '../src/game/telemetry';
import type { RoomDefinition } from '../src/game/types';

class MemoryStorage implements SaveStorage {
  readonly values = new Map<string,string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key,value); }
  removeItem(key: string): void { this.values.delete(key); }
}

class DeniedStorage implements SaveStorage {
  getItem(): string | null { throw new Error('denied'); }
  setItem(): void { throw new Error('denied'); }
  removeItem(): void { throw new Error('denied'); }
}

function fixtureRoom(platforms: RoomDefinition['platforms'], entrySide: RoomDefinition['entrySide'] = 'left', exitSide: RoomDefinition['exitSide'] = 'right'): RoomDefinition {
  return { name:'fixture',subtitle:'fixture',type:'traversal',theme:'alley',platforms,hazards:[],spawns:[],playerStart:{x:72,y:545},exit:{x:WIDTH-58,y:500,w:58,h:130},entrySide,exitSide,objective:'fixture' };
}

const storage = new MemoryStorage();
const repository = new BrowserSaveRepository(storage);
const save = cloneDefaultSave();
save.shards = 47; save.diveLevel = 12; save.unlocked.push('maris');
assert.equal(repository.write(save),true);
assert.deepEqual(repository.load().save,save,'current save must round-trip unchanged through the repository boundary');

storage.values.set(CURRENT_SAVE_KEY,'{broken-json');
storage.values.set(LEGACY_SAVE_KEYS[0],JSON.stringify({ shards:9,unlocked:['pyrra','pisces'],collection:['pyrra','pisces'] }));
const recovered = repository.load();
assert.equal(recovered.source,'legacy');
assert.deepEqual(recovered.corruptKeys,[CURRENT_SAVE_KEY]);
assert.equal(recovered.save.shards,9);
assert.ok(recovered.save.unlocked.includes('maris'),'legacy boon IDs must migrate');
assert.equal(repository.reset(),true);
assert.equal(storage.values.has(CURRENT_SAVE_KEY),false);
assert.equal(storage.values.has(LEGACY_SAVE_KEYS[0]),false);
const deniedRepository = new BrowserSaveRepository(new DeniedStorage());
assert.equal(deniedRepository.load().storageAvailable,false);
assert.equal(deniedRepository.write(save),false);
assert.equal(deniedRepository.reset(),false);

assert.deepEqual(sameSeedRetryRequest(0xfeedbeef),{ depth:1,seed:0xfeedbeef });
assert.deepEqual(newRunRequest(),{ depth:1 });

const fullGround = fixtureRoom([{x:0,y:FLOOR_Y,w:WIDTH,h:70}]);
assert.equal(validateRoomTraversal(fullGround).valid,true);
const disconnected = fixtureRoom([{x:0,y:FLOOR_Y,w:230,h:70},{x:WIDTH-230,y:FLOOR_Y,w:230,h:70}]);
const disconnectedReport = validateRoomTraversal(disconnected);
assert.equal(disconnectedReport.valid,false,'a split horizontal room must not pass by sharing one abstract ground node');
assert.ok(disconnectedReport.failures.includes('no-entry-to-exit-route'));

let generatedRooms = 0;
for (let depth = 1; depth <= 9; depth += 1) {
  for (let sample = 0; sample < 32; sample += 1) {
    const plan = generateRunPlan(depth,depth * 100000 + sample * 7919);
    for (const room of plan.rooms) {
      assert.equal(validateRoomTraversal(room).valid,true,`depth ${depth} seed ${plan.seed} generated a disconnected room`);
      generatedRooms += 1;
    }
    for (let index = 1; index < plan.rooms.length; index += 1) {
      assert.equal(roomIsEmpty(plan.rooms[index-1]) && roomIsEmpty(plan.rooms[index]),false,'two empty rooms were generated back-to-back');
    }
  }
}

for (let level = 1; level <= 9; level += 1) {
  assert.equal(canAccessCampaignLevel(level,ENTITLEMENT_TEST_CONTEXTS.pcMaster),true);
  assert.equal(canAccessCampaignLevel(level,ENTITLEMENT_TEST_CONTEXTS.mobileFull),true);
  assert.equal(canAccessCampaignLevel(level,ENTITLEMENT_TEST_CONTEXTS.mobileFree),level <= 3);
}
const freeBoons = BOON_ORDER.filter((id) => canAccessBoon(id,ENTITLEMENT_TEST_CONTEXTS.mobileFree));
assert.equal(freeBoons.length,8,'mobile free entitlement must expose exactly eight boon-givers');
assert.equal(BOON_ORDER.filter((id) => BOONS[id].accessTier === 'full').length,12);

for (const device of ['keyboard','controller','touch'] as const) {
  const prompts = new DevicePromptService(device);
  for (const action of GAME_ACTIONS) assert.ok(prompts.prompt(action).length > 0,`${device} lacks a ${action} prompt`);
}

const telemetry = new RuntimeTelemetry('fixture');
telemetry.recordFrame(16.7,16.7,{enemies:3,projectiles:8,particles:12,floatingText:1,bossHazards:0,lightning:0,lightRays:0,gusts:0,activeSfx:2});
telemetry.recordFrame(44,33.333,{enemies:4,projectiles:280,particles:20,floatingText:2,bossHazards:1,lightning:0,lightRays:0,gusts:0,activeSfx:3});
telemetry.recordAction(10,'playing','dash','ignored','cooldown');
telemetry.recordAction(12,'playing','jump','consumed','buffered');
telemetry.recordEntityCap(14,'playing','projectiles',321,320,1);
const telemetrySnapshot = telemetry.snapshot();
assert.equal(telemetrySnapshot.actionTotals.ignoredByReason.cooldown,1);
assert.equal(telemetrySnapshot.frames.clamped,1);
assert.equal(telemetrySnapshot.peakEntities.projectiles,280);

console.log(`ALPHA 7.4A FIXTURES PASSED · save migration/corruption/reset · retry depth 1 · disconnected-room rejection · ${generatedRooms} generated rooms · entitlement contexts · action prompts · telemetry`);
