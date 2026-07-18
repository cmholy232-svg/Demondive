import assert from 'node:assert/strict';
import { GAME_ACTIONS, DevicePromptService, GamepadActionResolver } from '../src/game/actions';
import { ARCANE_PROFILES, selectArcaneProfile } from '../src/game/arcane-tuning';
import { BOON_PROJECTILE_SHAPES, buildupThreshold, incomingDamageMultiplier, pickupMagnetRadius, selectAttachedBoons, selectDominantBoon, seraphineMaximumShieldCharges, somniaEchoCount } from '../src/game/boon-runtime';
import { chooseSmartBoonOffers } from '../src/game/boon-offers';
import { BOONS, BOON_ORDER, FLOOR_Y, WIDTH } from '../src/game/content';
import { canAccessBoon, canAccessCampaignLevel, ENTITLEMENT_TEST_CONTEXTS } from '../src/game/entitlements';
import { generateRunPlan, roomCountBounds, roomIsEmpty } from '../src/game/generator';
import { buildHudPriorityView } from '../src/game/hud-view';
import { KeyboardBindingRepository, bindingConflicts, profileBindings, rebindAction } from '../src/game/input-bindings';
import { planProjectilePresentation, PROJECTILE_DETAIL_BUDGET, shouldEmitProjectileTrail } from '../src/game/performance-policy';
import { MOVEMENT_PROFILES, selectMovementProfile } from '../src/game/player-tuning';
import { validateRoomQuality, validateRoomTraversal } from '../src/game/room-quality';
import { newRunRequest, sameSeedRetryRequest } from '../src/game/run-retry';
import { cloneDefaultSave } from '../src/game/save';
import { BrowserSaveRepository, CURRENT_SAVE_KEY, LEGACY_SAVE_KEYS, type SaveStorage } from '../src/game/save-repository';
import { RuntimeTelemetry } from '../src/game/telemetry';
import { SeededRandom } from '../src/game/rng';
import { campaignThreat, deepDiveThreat } from '../src/game/difficulty';
import { deepDiveBiome, deepDiveCrossPollination, deepDiveCycle, deepDiveEncounter, deepDiveHasBoonReward, deepDiveHasRouteChoice, deepDiveHasWager, deepDiveIsDoubleBoss, deepDiveMinimumEnemies, deepDivePowers, deepDiveRewardStacks, deepDiveRoute, deepDiveSlot } from '../src/game/deep-dive';
import { ACTION_FEEDBACK_BUDGETS, PROCEDURAL_SFX_PROFILES, sfxPitchMultiplier } from '../src/game/feedback-policy';
import { shapedCameraOffset } from '../src/game/camera-feedback';
import { DAMAGE_TEXT_BUDGET, PARTICLE_EFFECT_BUDGET, enemyDefeatFeedback, enemyHitFeedback, shouldEmitImpactAccent } from '../src/game/impact-feedback';
import { THREE_ROOM_TUTORIAL, initialThreeRoomTutorialState, recordThreeRoomTutorialAction, tutorialRoomComplete } from '../src/game/tutorial-program';
import type { Projectile, RoomDefinition } from '../src/game/types';

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
assert.deepEqual([buildupThreshold(1),buildupThreshold(4),buildupThreshold(8)],[4,3,2],'status buildup must accelerate only at explicit effective-stack thresholds');
assert.deepEqual([somniaEchoCount(0),somniaEchoCount(1),somniaEchoCount(4),somniaEchoCount(8)],[0,1,2,3],'Somnia echoes must escalate at bounded thresholds');
assert.deepEqual([seraphineMaximumShieldCharges(0),seraphineMaximumShieldCharges(1),seraphineMaximumShieldCharges(4),seraphineMaximumShieldCharges(10)],[0,1,2,4],'Seraphine regeneration must use a bounded shield cap');
const minimalHud=buildHudPriorityView({xpRevealSeconds:0,currencyRevealSeconds:0,wagerActive:false,roomCleared:false,roomIntroSeconds:0,dominantBoon:'pyrra',attachedBoons:['maris','gaia','zephyra'],activeBoonCount:10,specialCooldownSeconds:0,specialEnergyCost:24,currentEnergy:10});
assert.equal(minimalHud.showXp,false);assert.equal(minimalHud.showCurrency,false);assert.equal(minimalHud.showRoomMap,false);
assert.deepEqual(minimalHud.combatBoonIds,['pyrra','maris','gaia']);assert.equal(minimalHud.hiddenBoonCount,7);assert.equal(minimalHud.specialState,'needs-energy');
const contextualHud=buildHudPriorityView({xpRevealSeconds:2,currencyRevealSeconds:0,wagerActive:true,roomCleared:true,roomIntroSeconds:0,dominantBoon:'pyrra',attachedBoons:['maris','gaia'],activeBoonCount:3,specialCooldownSeconds:.2,specialEnergyCost:24,currentEnergy:100});
assert.equal(contextualHud.showXp,true);assert.equal(contextualHud.showCurrency,true);assert.equal(contextualHud.showRoomMap,true);assert.equal(contextualHud.specialState,'cooldown');

const stressProjectiles:Projectile[]=Array.from({length:580},(_,index)=>({
  id:index+1,owner:index<80?'enemy':'player',x:0,y:0,w:20,h:20,vx:400,vy:0,damage:10+(index%7),life:2,color:'#fff',radius:10,pierce:0,bounces:0,homing:index<12?.5:0,explosive:false,destructible:index<8,
}));
const logicalDamageBefore=stressProjectiles.reduce((total,projectile)=>total+projectile.damage,0);
const presentationPlan=planProjectilePresentation(stressProjectiles,PROJECTILE_DETAIL_BUDGET.normal);
assert.equal(stressProjectiles.length,580);assert.equal(stressProjectiles.reduce((total,projectile)=>total+projectile.damage,0),logicalDamageBefore,'presentation planning mutated logical projectile power');
assert.equal(presentationPlan.logicalCount,580);assert.ok(presentationPlan.detailed.length<=PROJECTILE_DETAIL_BUDGET.normal,'projectile detail budget failed');
assert.equal(presentationPlan.detailed.length+presentationPlan.simplified.length+presentationPlan.suppressedPlayerCount,580,'projectile presentation accounting failed');
assert.ok(stressProjectiles.filter(projectile=>projectile.owner==='enemy').every(projectile=>presentationPlan.detailed.some(candidate=>candidate.id===projectile.id)||presentationPlan.simplified.some(candidate=>candidate.id===projectile.id)),'hostile projectile became invisible under presentation pressure');
const emittedTrails=stressProjectiles.filter(projectile=>shouldEmitProjectileTrail(projectile.id,stressProjectiles.length,true)).length;
assert.ok(emittedTrails>0&&emittedTrails<=50,'reduced-VFX projectile trail budget failed');

for(let stage=1;stage<=9;stage+=1){
  const [minimum,maximum]=roomCountBounds(stage);assert.equal(minimum,7+(stage-1)*2);assert.equal(maximum,minimum+1);
  const start=campaignThreat(stage,0,minimum,'combat');const finish=campaignThreat(stage,minimum-1,minimum,'combat');const challenge=campaignThreat(stage,Math.floor(minimum/2),minimum,'elite');
  assert.ok(finish.health>start.health&&finish.damage>start.damage&&finish.cadence>start.cadence,`Level ${stage} lacks within-level threat progression`);
  assert.ok(challenge.health>campaignThreat(stage,Math.floor(minimum/2),minimum,'combat').health,`Level ${stage} elite room lacks challenge pressure`);
  if(stage>1)assert.ok(start.health>campaignThreat(stage-1,0,roomCountBounds(stage-1)[0],'combat').health,`Level ${stage} does not escalate campaign health pressure`);
}

const routeSides=new Set<string>();let previousMinimum=0;let previousThreat=deepDiveThreat(1,'combat');
for(let roomIndex=1;roomIndex<=300;roomIndex+=1){
  const slot=deepDiveSlot(roomIndex),cycle=deepDiveCycle(roomIndex),encounter=deepDiveEncounter(roomIndex),route=deepDiveRoute(0xD33FD17E,roomIndex);
  routeSides.add(route.exitSide);
  assert.equal(encounter,slot===6?'miniboss':slot===10?'boss':'combat',`Deep Dive encounter cadence broke at ${roomIndex}`);
  assert.equal(deepDiveBiome(0xD33FD17E,roomIndex),deepDiveBiome(0xD33FD17E,(cycle-1)*10+1),`Deep Dive biome changed inside cycle ${cycle}`);
  const minimum=deepDiveMinimumEnemies(roomIndex);assert.ok(minimum>=previousMinimum,`Deep Dive minimum enemy count regressed at ${roomIndex}`);previousMinimum=minimum;
  assert.equal(deepDiveIsDoubleBoss(roomIndex),encounter==='boss'&&cycle>=3,`Deep Dive double-boss gate broke at ${roomIndex}`);
  assert.equal(deepDivePowers(0xD33FD17E,roomIndex).length,encounter==='combat'?0:Math.min(5,cycle),`Deep Dive power stacking broke at ${roomIndex}`);
  assert.equal(deepDiveCrossPollination(roomIndex),Math.min(3,Math.max(0,cycle-1)));
  assert.ok(deepDiveRewardStacks(roomIndex)>=1&&deepDiveRewardStacks(roomIndex)<=3);
  if(encounter!=='combat')assert.equal(deepDiveHasBoonReward(roomIndex),true);
  if(deepDiveHasWager(roomIndex)||deepDiveHasRouteChoice(roomIndex))assert.equal(encounter,'combat');
  const baselineThreat=deepDiveThreat(roomIndex,'combat');assert.ok(baselineThreat.health>=previousThreat.health&&baselineThreat.damage>=previousThreat.damage,`Deep Dive baseline threat regressed at ${roomIndex}`);previousThreat=baselineThreat;
  const encounterThreat=deepDiveThreat(roomIndex,encounter);assert.ok(encounterThreat.health>=baselineThreat.health&&encounterThreat.damage>=baselineThreat.damage,`Deep Dive encounter modifier reduced threat at ${roomIndex}`);
}
assert.deepEqual([...routeSides].sort(),['bottom','left','right','top'],'Deep Dive route failed to use all four directions');
for(let cycle=2;cycle<=9;cycle+=1)assert.notEqual(deepDiveBiome(0xD33FD17E,(cycle-2)*10+1),deepDiveBiome(0xD33FD17E,(cycle-1)*10+1),'adjacent Deep Dive cycles must change biome');

const starterOfferHistogram:number[]=[];let starterOfferTotal=0;let uninvestedOfferTotal=0;
for(let run=0;run<600;run+=1){
  const stacks=Object.fromEntries(BOON_ORDER.map(id=>[id,0])) as Record<(typeof BOON_ORDER)[number],number>;stacks.pyrra=1;
  let lastReward:'pyrra'|'maris'|'gaia'|'zephyra'='pyrra';let drought=Object.fromEntries(BOON_ORDER.map(id=>[id,0])) as Record<(typeof BOON_ORDER)[number],number>;let starterOffers=0;
  const rng=new SeededRandom(`curated-run-${run}`);const pool=['pyrra','maris','gaia','zephyra'] as const;
  for(let reward=0;reward<10;reward+=1){
    const offer=chooseSmartBoonOffers({pool,stacks,startingBoon:'pyrra',lastRewardBoon:lastReward,drought,rng,count:2,reroll:reward===5});drought=offer.drought;
    if(offer.choices.includes('pyrra'))starterOffers+=1;
    uninvestedOfferTotal+=offer.choices.filter(id=>stacks[id]===0).length;
    const selected=offer.choices.includes('pyrra')&&rng.chance(.38)?'pyrra':offer.choices[0];stacks[selected]+=1;lastReward=selected;
  }
  starterOfferHistogram.push(starterOffers);starterOfferTotal+=starterOffers;
}
const meanStarterOffers=starterOfferTotal/starterOfferHistogram.length;
assert.ok(meanStarterOffers>=3&&meanStarterOffers<=6.5,`starter affinity mean ${meanStarterOffers.toFixed(2)} escaped the curated middle`);
assert.ok(starterOfferHistogram.some(count=>count<=3)&&starterOfferHistogram.some(count=>count>=8),'smart curation lost either low-stack variety or rare tall-stack possibility');
assert.ok(uninvestedOfferTotal>starterOfferTotal,'new-boon discovery must remain stronger than starter repetition across the cohort');

assert.equal(Object.keys(PROCEDURAL_SFX_PROFILES).length,21,'runtime SFX event family is incomplete');
for(const [event,profile] of Object.entries(PROCEDURAL_SFX_PROFILES)){
  assert.ok(profile.startHz>0&&profile.endHz>0&&profile.durationSeconds>=.05&&profile.gain>=.03,`${event} has an inaudible or invalid procedural profile`);
  assert.ok(sfxPitchMultiplier(event as keyof typeof PROCEDURAL_SFX_PROFILES,0)>0&&sfxPitchMultiplier(event as keyof typeof PROCEDURAL_SFX_PROFILES,11)>0,`${event} variation is invalid`);
}
assert.ok(ACTION_FEEDBACK_BUDGETS.step.tier<ACTION_FEEDBACK_BUDGETS.enemyHit.tier&&ACTION_FEEDBACK_BUDGETS.enemyHit.tier<ACTION_FEEDBACK_BUDGETS.hurt.tier&&ACTION_FEEDBACK_BUDGETS.hurt.tier<ACTION_FEEDBACK_BUDGETS.bossDown.tier,'feedback intensity hierarchy is not ordered');
assert.ok(ACTION_FEEDBACK_BUDGETS.bossDown.hitStopMs<=90&&ACTION_FEEDBACK_BUDGETS.bossDown.cameraImpulse<=14,'Tier 4 feedback escaped its accessibility budget');
assert.deepEqual(shapedCameraOffset(8,1.25,false),{x:0,y:0},'camera shake accessibility toggle failed');
assert.deepEqual(shapedCameraOffset(8,1.25),shapedCameraOffset(8,1.25),'camera feedback must be deterministic');
for(let sample=0;sample<120;sample+=1){
  const offset=shapedCameraOffset(20,sample/120);
  assert.ok(Math.abs(offset.x)<=14&&Math.abs(offset.y)<=14,'camera feedback exceeded its global impulse cap');
}
assert.notDeepEqual(shapedCameraOffset(8,1.25),shapedCameraOffset(8,1.3),'camera feedback curve is not moving over time');
assert.ok(enemyHitFeedback(12,1000).cameraImpulse<enemyHitFeedback(40,1000).cameraImpulse,'heavy hits must read above routine hits');
assert.ok(enemyHitFeedback(40,1000).cameraImpulse<enemyHitFeedback(90,1000).cameraImpulse,'crushing hits must read above heavy hits');
assert.ok(enemyDefeatFeedback('normal').tier<enemyDefeatFeedback('elite').tier&&enemyDefeatFeedback('elite').tier<=enemyDefeatFeedback('miniboss').tier&&enemyDefeatFeedback('miniboss').tier<enemyDefeatFeedback('boss').tier,'defeat feedback hierarchy is not ordered');
assert.ok(PARTICLE_EFFECT_BUDGET.reduced<PARTICLE_EFFECT_BUDGET.normal&&DAMAGE_TEXT_BUDGET.reduced<DAMAGE_TEXT_BUDGET.normal,'reduced VFX budgets must be lower');
assert.equal(shouldEmitImpactAccent(1,PARTICLE_EFFECT_BUDGET.normal,false,3),true,'high-value feedback must survive presentation pressure');
assert.ok([0,1,2,3,4,5,6,7].some(sequence=>!shouldEmitImpactAccent(sequence,PARTICLE_EFFECT_BUDGET.normal,false,2)),'routine impact accents are not consolidating under pressure');
assert.equal(THREE_ROOM_TUTORIAL.length,3,'final onboarding must remain three rooms');
assert.equal(tutorialRoomComplete(THREE_ROOM_TUTORIAL[0],['move','jump','neutralFire']),false,'fundamentals room opened before the enemy was defeated');
let tutorialState=initialThreeRoomTutorialState();
for(const action of ['move','jump','neutralFire','enemyDefeated'] as const)tutorialState=recordThreeRoomTutorialAction(tutorialState,action);
assert.equal(tutorialState.roomIndex,1,'fundamentals room did not advance');
for(const action of ['boonCollected','modifiedFire','special'] as const)tutorialState=recordThreeRoomTutorialAction(tutorialState,action);
assert.equal(tutorialState.roomIndex,2,'Arcana room did not advance');
tutorialState=recordThreeRoomTutorialAction(tutorialState,'dash');
assert.equal(tutorialState.complete,false,'advanced room must confirm one wave conversion');
tutorialState=recordThreeRoomTutorialAction(tutorialState,'wavedash');
assert.equal(tutorialState.complete,true,'either wavedash or waveland should satisfy the non-frame-perfect exit gate');

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
    assert.equal(plan.rooms[Math.floor(plan.rooms.length/2)].type,'miniboss',`depth ${depth} seed ${plan.seed} lost its midpoint mini-boss`);
    assert.equal(plan.rooms.at(-1)?.type,'boss',`depth ${depth} seed ${plan.seed} lost its final boss`);
    for (const room of plan.rooms) {
      assert.equal(validateRoomTraversal(room).valid,true,`depth ${depth} seed ${plan.seed} generated a disconnected room`);
      assert.ok(room.quality,`depth ${depth} seed ${plan.seed} lacks room-quality metadata`);
      assert.ok((room.quality?.performanceWeight??0)>0&&Number.isFinite(room.quality?.performanceWeight),`depth ${depth} seed ${plan.seed} has invalid performance weight`);
      assert.ok((room.quality?.compatibleBiomes??[]).includes(depth),`depth ${depth} seed ${plan.seed} lacks its biome compatibility`);
      const qualityReport=validateRoomQuality(room);
      assert.equal(qualityReport.valid,true,`depth ${depth} seed ${plan.seed} exceeds a room-quality budget: ${qualityReport.failures.join(',')}`);
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
telemetry.recordPresentationConsolidation(15,'playing',{entity:'projectiles',logicalCount:580,detailedCount:220,simplifiedCount:12,suppressedCount:348});
const telemetrySnapshot = telemetry.snapshot();
assert.equal(telemetrySnapshot.actionTotals.ignoredByReason.cooldown,1);
assert.equal(telemetrySnapshot.frames.clamped,1);
assert.equal(telemetrySnapshot.peakEntities.projectiles,280);
assert.ok(telemetrySnapshot.events.some(event=>event.kind==='presentation-consolidation'&&event.logicalCount===580));

console.log(`ALPHA 7.4A–7.4D FIXTURES PASSED · save migration/corruption/reset · retry depth 1 · disconnected-room rejection · ${generatedRooms} generated rooms · midpoint/final encounters · 300-room Deep Dive schedule · 600 curated boon runs (${meanStarterOffers.toFixed(2)} starter offers/10 mean) · entitlement contexts · remap conflicts · controller hysteresis · protected movement/Arcane A/B · dominant boon identity · passive contracts · simulation-safe projectile presentation · prompts · telemetry`);
