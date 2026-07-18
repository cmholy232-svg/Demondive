import assert from 'node:assert/strict';
import { GAME_ACTIONS, DevicePromptService, GamepadActionResolver } from '../src/game/actions';
import { ARCANE_PROFILES, selectArcaneProfile } from '../src/game/arcane-tuning';
import { BOON_PROJECTILE_SHAPES, incomingDamageMultiplier, pickupMagnetRadius, selectAttachedBoons, selectDominantBoon } from '../src/game/boon-runtime';
import { BOONS, BOON_ORDER, FLOOR_Y, WIDTH } from '../src/game/content';
import { canAccessBoon, canAccessCampaignLevel, ENTITLEMENT_TEST_CONTEXTS } from '../src/game/entitlements';
import { generateRunPlan, roomIsEmpty } from '../src/game/generator';
import { KeyboardBindingRepository, bindingConflicts, profileBindings, rebindAction } from '../src/game/input-bindings';
import { MOVEMENT_PROFILES, selectMovementProfile } from '../src/game/player-tuning';
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

const bindingStorage = new MemoryStorage();
const bindingRepository = new KeyboardBindingRepository(bindingStorage);
const arcadeBindings = profileBindings('arcade');
assert.equal(bindingRepository.write(arcadeBindings),true);
assert.deepEqual(bindingRepository.load(),arcadeBindings);
const conflictingBindings = rebindAction(arcadeBindings,'fire','Space');
assert.ok(bindingConflicts(conflictingBindings.bindings).some((conflict) => conflict.code === 'Space' && conflict.actions.includes('jump') && conflict.actions.includes('fire')));

const gamepadResolver = new GamepadActionResolver();
const pad = (x:number) => ({ axes:[x,0],buttons:Array.from({length:8},()=>({pressed:false,value:0})) });
assert.equal(gamepadResolver.active('right',pad(.43)),true);
assert.equal(gamepadResolver.active('right',pad(.3)),true,'hysteresis must hold until the release threshold');
assert.equal(gamepadResolver.active('right',pad(.2)),false);

assert.equal(selectMovementProfile('?movementProfile=a1-responsive',null),'a1-responsive');
assert.equal(selectMovementProfile('',null),'a0-control');
for (const field of ['runSpeed','gravity','jumpVelocity','jumpReleaseGravity','fallSpeedCap','fastFallGravity','fastFallSpeedCap','dashSpeed','dashDurationSeconds','dashCooldownSeconds','wavelandSpeed','wavelandDurationSeconds','dashRecoverySeconds'] as const) {
  assert.equal(MOVEMENT_PROFILES['a1-responsive'][field],MOVEMENT_PROFILES['a0-control'][field],`${field} must remain protected across A/B profiles`);
}
assert.equal(selectArcaneProfile('?arcaneProfile=a1-responsive',null),'a1-responsive');
assert.equal(selectArcaneProfile('',null),'a0-control');
assert.equal(ARCANE_PROFILES['a1-responsive'].baseDamage,ARCANE_PROFILES['a0-control'].baseDamage,'neutral Arcane A/B damage must remain protected');
assert.equal(ARCANE_PROFILES['a1-responsive'].baseRadius,ARCANE_PROFILES['a0-control'].baseRadius,'neutral Arcane A/B hitbox must remain protected');
const controlArcaneRange=ARCANE_PROFILES['a0-control'].projectileSpeed*ARCANE_PROFILES['a0-control'].projectileLifeSeconds;
const candidateArcaneRange=ARCANE_PROFILES['a1-responsive'].projectileSpeed*ARCANE_PROFILES['a1-responsive'].projectileLifeSeconds;
assert.ok(Math.abs(candidateArcaneRange-controlArcaneRange)<.0001,'neutral Arcane A/B effective range must remain protected');

const identityStacks=Object.fromEntries(BOON_ORDER.map((id)=>[id,0])) as Record<(typeof BOON_ORDER)[number],number>;
identityStacks.pyrra=3;identityStacks.maris=3;identityStacks.gaia=2;identityStacks.nerissa=1;
assert.equal(selectDominantBoon(identityStacks,BOON_ORDER,'pyrra','maris'),'pyrra','starting boon must win a highest-stack tie');
identityStacks.maris=4;
assert.equal(selectDominantBoon(identityStacks,BOON_ORDER,'pyrra','maris'),'maris','a strictly higher stack must become dominant');
assert.deepEqual(selectAttachedBoons(identityStacks,BOON_ORDER,'maris'),['pyrra','gaia'],'attached effects must be stable, bounded, and stack ordered');
assert.equal(new Set(Object.values(BOON_PROJECTILE_SHAPES)).size,BOON_ORDER.length,'all twenty dominant projectile silhouettes must be distinct');
assert.equal(pickupMagnetRadius(2,3),325,'Nerissa pickup pull must stack with the permanent magnet upgrade');
assert.equal(incomingDamageMultiplier(2,4,false),.84,'Crya defense must not apply without a controlled enemy');
assert.ok(Math.abs(incomingDamageMultiplier(2,4,true)-.5712)<.000001,'Gaia armor and conditional Crya defense must combine predictably');

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
  for (let sample = 0; sample < 96; sample += 1) {
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

console.log(`ALPHA 7.4A–7.4C FIXTURES PASSED · save migration/corruption/reset · retry depth 1 · disconnected-room rejection · ${generatedRooms} generated rooms · entitlement contexts · remap conflicts · controller hysteresis · protected movement/Arcane A/B · dominant boon identity · passive contracts · prompts · telemetry`);
