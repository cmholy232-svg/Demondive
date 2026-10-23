extends TestCase
## The Lv 2, 4 and 7 behaviours on each boon's card (boon.<id>.rank2..4),
## checked against what the code does: Pyrra to Luna.
## tests/test_boon_levels_late.gd has the rest, the synergies and offers.

const TUNING: String = "res://data/player/arcane_base.tres"


func _stats(boons: Dictionary) -> BoltStats:
	BoonRig.set_boons(boons)
	return BoonEffects.bolt_stats(load(TUNING) as ArcaneTuning)


func _hurt(e: Enemy) -> float:
	return e.max_health - e.health


## Fires one real bolt (no crit) from `from` and lets physics run.
func _shoot(b: BoonRig, from: Vector2, direction: Vector2, frames: int = 40) -> void:
	var stats: BoltStats = b.bolt_stats()
	stats.crit_chance = 0.0
	b.rig.caster.spawn_at(from, direction, stats)
	for i: int in frames:
		await tree.physics_frame


func test_levels_unlock_at_two_four_and_seven_stacks() -> void:
	var expected: Array[int] = [0, 1, 2, 2, 3, 3, 3, 4, 4]
	for stacks: int in expected.size():
		check_equal(BoonCatalog.rank_at(&"pyrra", stacks), expected[stacks], "%d stacks" % stacks)
	for id: StringName in BoonCatalog.ORDER:
		for rank: int in [2, 3, 4]:
			check(Strings.has_key("boon.%s.rank%d" % [id, rank]), "%s has a Lv card line for rank %d" % [id, rank])
			check(Strings.has_key("boon.%s.rank%d_name" % [id, rank]), "%s names rank %d" % [id, rank])


func test_pyrra_bloom_wildfire_and_inferno() -> void:
	check_equal(_stats({&"pyrra": 1}).blast_damage, 0.0, "Lv 1: no explosions yet")
	check(_stats({&"pyrra": 2}).blast_damage > 0.0, "Lv 2 Bloom: burning enemies explode when hit")
	var wild: BoltStats = _stats({&"pyrra": 4})
	check(wild.blast_burn > 0.0 and wild.blast_radius > _stats({&"pyrra": 2}).blast_radius, "Lv 4 Wildfire: bigger blasts that ignite")
	var b := BoonRig.create(tree, {&"pyrra": 7})
	var burning: Enemy = b.enemy(Vector2(600.0, 655.0), 50.0)
	var next: Enemy = b.enemy(Vector2(680.0, 655.0), 500.0)
	burning.burn_timer = 2.0
	burning.take_hit(Hit.make(100.0, Vector2.RIGHT))
	check(burning.dead and next.health < next.max_health, "Lv 7 Inferno: a burning enemy explodes when it dies")
	check(next.is_burning(), "and the explosion sets its neighbour alight")
	b.done()


func test_maris_undertow_second_wave_and_roll_through() -> void:
	check_equal(_stats({&"maris": 1}).pierce, 0, "Lv 1: no pierce")
	check_equal(_stats({&"maris": 2}).pierce, 1, "Lv 2 Undertow: pierce one enemy")
	var b := BoonRig.create(tree, {&"maris": 4})
	var e: Enemy = b.enemy(Vector2(700.0, 655.0), 2000.0)
	b.specials._ground_wave(4)
	var first: float = _hurt(e)
	await tree.create_timer(0.6).timeout
	check(first > 0.0 and _hurt(e) > first * 1.5, "Lv 4 Second Wave: the wave rolls back for another hit")
	b.done()
	b = BoonRig.create(tree, {&"maris": 7})
	var line: Array[Enemy] = []
	for i: int in 3:
		line.append(b.enemy(Vector2(500.0 + i * 90.0, 655.0), 5000.0))
	await _shoot(b, line[0].center() - Vector2(60.0, 0.0), Vector2.RIGHT)
	check(_hurt(line[0]) > 0.0 and _hurt(line[2]) > _hurt(line[0]) * 1.4, "Lv 7 Roll Through: +25%% per enemy passed (%.0f then %.0f)" % [_hurt(line[0]), _hurt(line[2])])
	b.done()


func test_gaia_retaliate_crush_and_avalanche() -> void:
	var b := BoonRig.create(tree, {&"gaia": 2})
	var near: Enemy = b.enemy(Vector2(450.0, 655.0), 500.0)
	Game.hurt(10.0)
	check(near.health < near.max_health, "Lv 2 Retaliate: stone shards strike when Milo is hurt")
	b.done()
	check_equal(_stats({&"gaia": 2}).stun_seconds, 0.0, "no stun before Lv 4")
	check(_stats({&"gaia": 4}).stun_seconds > 0.0, "Lv 4 Crush: bolts stun")
	b = BoonRig.create(tree, {&"gaia": 7})
	var stunned: Enemy = b.enemy(Vector2(600.0, 655.0), 500.0)
	stunned.stun_timer = 1.0
	var hit := Hit.make(100.0, Vector2.RIGHT)
	BoonHooks.modify_hit(stunned, hit)
	check(absf(hit.damage - 150.0) < 0.01, "Lv 7 Avalanche: stunned enemies take +50%")
	b.done()


func test_zephyra_needles_at_two_four_and_seven() -> void:
	var expected: Dictionary = {1: 0, 2: 1, 3: 1, 4: 2, 7: 3}
	for stacks: int in expected:
		check_equal(_stats({&"zephyra": stacks}).split, int(expected[stacks]), "%d stacks: needles" % stacks)


func test_belladonna_overflow_gorge_and_bottomless() -> void:
	var b := BoonRig.create(tree, {&"belladonna": 2})
	var near: Enemy = b.enemy(Vector2(400.0, 655.0), 500.0)
	Game.on_pickup(false)
	check_equal(Game.shield, 0.0, "a pickup while hungry gives no shield")
	Game.on_pickup(true)
	check(Game.shield > 0.0 and near.health < near.max_health, "Lv 2 Overflow: a full pickup becomes a shield and a blast")
	b.done()
	b = BoonRig.create(tree, {&"belladonna": 4})
	var meal: Enemy = b.enemy(b.rig.milo.global_position + Vector2(100.0, 0.0), 200.0)
	meal.health = 110.0
	Game.health = 50.0
	b.specials._devour(4)
	check(meal.dead, "Lv 4 Gorge: Devour eats tougher enemies")
	check(absf(Game.health - (50.0 + (8.0 + 4.0 * 3.5) * 2.0)) < 0.01, "and heals twice as much")
	b.done()
	BoonRig.set_boons({&"belladonna": 2})
	check_equal(BoonEffects.appetite_cap(), BoonEffects.APPETITE_CAP, "pickup damage caps at +60%")
	BoonRig.set_boons({&"belladonna": 7})
	check_equal(BoonEffects.appetite_cap(), BoonEffects.APPETITE_CAP_HIGH, "Lv 7 Bottomless: up to +120%")
	BoonRig.set_boons({})


func test_flora_spread_quick_bloom_and_strangle() -> void:
	check_equal(BoonHooks.flora_threshold(3), 3, "three marks before Lv 4")
	check_equal(BoonHooks.flora_threshold(4), 2, "Lv 4 Quick Bloom: two marks burst")
	var b := BoonRig.create(tree, {&"flora": 7})
	var target: Enemy = b.enemy(Vector2(600.0, 655.0), 2000.0)
	var near: Enemy = b.enemy(Vector2(680.0, 655.0), 2000.0)
	b.bolt_hit(target)
	b.bolt_hit(target)
	check(near.status.has_mark(&"thorn"), "Lv 2 Spread: the burst marks a neighbour")
	check(near.status.is_rooted() and target.status.is_rooted(), "Lv 7 Strangle: the burst roots")
	b.done()


func test_voltara_return_chain_and_overload() -> void:
	var b := BoonRig.create(tree, {&"voltara": 4})
	var a: Enemy = b.enemy(Vector2(600.0, 655.0), 2000.0)
	b.enemy(Vector2(700.0, 655.0), 2000.0)
	var hit: Hit = b.bolt_hit(a)
	check(absf(_hurt(a) - hit.damage * 1.4) < 0.5, "Lv 4 Return Chain: the last link arcs back for 40%")
	b.done()
	b = BoonRig.create(tree, {&"voltara": 7})
	a = b.enemy(Vector2(600.0, 655.0), 2000.0)
	var other: Enemy = b.enemy(Vector2(700.0, 655.0), 2000.0)
	hit = b.bolt_hit(a)
	check(absf(_hurt(other) - hit.damage * 0.6) < 0.5, "Lv 7 Overload: chains hit for 60%")
	check(other.stun_timer > 0.0, "and stun")
	b.done()


func test_crya_shatter_cold_snap_and_absolute_zero() -> void:
	var b := BoonRig.create(tree, {&"crya": 1})
	var ice: Enemy = b.enemy(Vector2(600.0, 655.0), 2000.0)
	ice.status.frozen_left = 2.0
	b.bolt_hit(ice)
	check(ice.status.is_frozen(), "Lv 1: a light bolt doesn't shatter")
	b.done()
	b = BoonRig.create(tree, {&"crya": 4})
	ice = b.enemy(Vector2(600.0, 655.0), 2000.0)
	var near: Enemy = b.enemy(Vector2(700.0, 655.0), 2000.0)
	ice.status.frozen_left = 2.0
	var hit: Hit = b.bolt_hit(ice)
	check(not ice.status.is_frozen() and _hurt(ice) > hit.damage, "Lv 2: any bolt shatters")
	check(near.status.chill > 0.0, "Lv 4 Cold Snap: the shatter chills enemies around")
	b.done()
	b = BoonRig.create(tree, {&"crya": 7})
	ice = b.enemy(Vector2(600.0, 655.0), 5000.0)
	ice.status.frozen_left = 2.0
	hit = b.bolt_hit(ice)
	check(absf(_hurt(ice) - hit.damage - (15.0 + 70.0) * 2.0) < 0.5, "Lv 7 Absolute Zero: shatters hit twice as hard")
	b.done()


func test_luna_lucid_and_full_moon() -> void:
	check_equal(BoonHooks.luna_hits(2), 3, "the third hit echoes before Lv 4")
	check_equal(BoonHooks.luna_hits(3), 2, "Lv 4 Lucid: the second hit echoes")
	var b := BoonRig.create(tree, {&"luna": 7})
	var target: Enemy = b.enemy(Vector2(600.0, 655.0), 5000.0)
	var near: Enemy = b.enemy(Vector2(680.0, 655.0), 5000.0)
	var dealt: float = b.bolt_hit(target).damage + b.bolt_hit(target).damage
	var echo: float = dealt * BoonHooks.luna_share(7)
	check(absf(_hurt(target) - dealt - echo) < 0.5, "the second hit echoes")
	check(absf(_hurt(near) - echo * 0.5) < 0.5, "Lv 7 Full Moon: the echo hits around for half")
	b.done()
