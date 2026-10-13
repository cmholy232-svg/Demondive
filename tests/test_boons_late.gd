extends TestCase
## Every boon card, checked against what the code does: the givers from the
## Thunder Jackpot down to the Self Below.

const TUNING: String = "res://data/player/arcane_base.tres"


func _stats(boons: Dictionary) -> BoltStats:
	BoonRig.set_boons(boons)
	return BoonEffects.bolt_stats(load(TUNING) as ArcaneTuning)


func test_luna_cheaper_specials_and_dream_echo() -> void:
	BoonRig.set_boons({})
	var cost: float = BoonEffects.special_cost(&"pyrra")
	BoonRig.set_boons({&"luna": 2})
	check(absf(BoonEffects.special_cost(&"pyrra") / cost - 0.84) < 0.001, "Specials cost 8% less per stack")
	var b := BoonRig.create(tree, {&"luna": 1})
	var target: Enemy = b.enemy(Vector2(600.0, 655.0), 1000.0)
	var dealt: float = 0.0
	for i: int in 3:
		dealt += b.bolt_hit(target).damage
	var echo: float = dealt * BoonHooks.luna_share(1)
	check(absf((target.max_health - target.health) - (dealt + echo)) < 0.5, "the third hit repeats 30% of the damage dealt")
	b.done()


func test_luna_moon_echo_fires_the_other_way() -> void:
	var b := BoonRig.create(tree, {&"luna": 1})
	SpecialMoves.use(b.specials, &"luna", 1)
	b.step(0.02)
	var before: int = tree.get_nodes_in_group(&"arcane_bolt").size()
	b.rig.caster.fire(Vector2.RIGHT)
	var bolts: Array[Node] = tree.get_nodes_in_group(&"arcane_bolt")
	check_equal(bolts.size() - before, 2, "the orb fires with Milo")
	var left: int = 0
	for node: Node in bolts:
		if (node as ArcaneBolt).velocity.x < 0.0:
			left += 1
	check_equal(left, 1, "the orb's bolt flies the opposite way")
	b.done()


func test_solara_elite_bonus_and_lances() -> void:
	var b := BoonRig.create(tree, {&"solara": 1})
	var elite: Enemy = b.enemy(Vector2(600.0, 655.0), 300.0)
	var hit := Hit.make(100.0, Vector2.RIGHT)
	BoonHooks.modify_hit(elite, hit)
	check(absf(hit.damage - 112.0) < 0.01, "+12% against elites per stack")
	var base: BoltStats = _stats({})
	var lance: BoltStats = _stats({&"solara": 1})
	check(lance.pierce > base.pierce and lance.speed > base.speed and lance.radius < base.radius, "narrow, fast, piercing lances")
	b.done()


func test_calyptra_crit_damage_bands_and_dice() -> void:
	var base: BoltStats = _stats({})
	var cal: BoltStats = _stats({&"calyptra": 2})
	check(absf(cal.crit_multiplier - base.crit_multiplier - 0.16) < 0.001, "+8% crit damage per stack")
	var w1: Array[float] = BoonEffectsMore.band_weights(1)
	var w3: Array[float] = BoonEffectsMore.band_weights(3)
	check(w3[2] > w1[2] and w3[0] < w1[0] and w3[3] > w1[3], "stacks tilt toward high bands and the Jackpot")
	var d1: Dictionary = SpecialMoves.dice_weights(1)
	var d3: Dictionary = SpecialMoves.dice_weights(3)
	check(float(d3[&"hurt"]) < float(d1[&"hurt"]), "stacks make the bad roll rarer")
	check(float(d1[&"boon"]) <= 1.0, "a free boon is extremely rare")
	var rng := RandomNumberGenerator.new()
	rng.seed = 5
	var seen: Dictionary = {}
	for i: int in 400:
		seen[SpecialMoves.roll_dice(rng, 1)] = true
	check(seen.has(&"heal") and seen.has(&"strike") and seen.has(&"shards") and seen.has(&"hurt"), "every listed outcome can roll")


func test_isolde_range_ricochet_and_crystal_echo() -> void:
	var base: BoltStats = _stats({})
	var iso: BoltStats = _stats({&"isolde": 2})
	check(absf(iso.life / base.life - 1.24) < 0.001, "+12% range per stack")
	check_equal(iso.bounces, 2, "one ricochet per stack")
	var b := BoonRig.create(tree, {&"isolde": 1})
	SpecialMoves.use(b.specials, &"isolde", 1)
	b.step(0.02)
	var before: int = tree.get_nodes_in_group(&"arcane_bolt").size()
	b.rig.caster.fire(Vector2.RIGHT)
	check_equal(tree.get_nodes_in_group(&"arcane_bolt").size() - before, 2, "the crystal echo repeats the cast")
	b.done()


func test_somnia_recovery_echo_shots_and_velvet_feint() -> void:
	BoonRig.set_boons({&"somnia": 2})
	check(absf(BoonEffects.hurt_recovery() - 0.8) < 0.001, "recover 10% faster per stack")
	var b := BoonRig.create(tree, {&"somnia": 1})
	var spawned: Array[int] = [0]
	var count := func(node: Node) -> void:
		if node is ArcaneBolt:
			spawned[0] += 1
	tree.node_added.connect(count)
	b.rig.caster.fire(Vector2.RIGHT)
	for i: int in 20:
		await tree.physics_frame
	tree.node_added.disconnect(count)
	check_equal(spawned[0], 2, "each cast is followed by one delayed echo per stack")
	for node: Node in tree.get_nodes_in_group(&"arcane_bolt"):
		node.free()
	SpecialMoves.velvet_feint(b.specials, 1)
	var real: int = 0
	var total: int = 0
	for node: Node in tree.get_nodes_in_group(&"arcane_bolt"):
		total += 1
		if not (node as ArcaneBolt).stats.decoy:
			real += 1
	check_equal(total, 6, "a dense line of 5 + stacks bolts")
	check_equal(real, 1, "only one of them is real")
	b.done()


func test_vespera_dodge_grace_shards_and_mirror_shield() -> void:
	BoonRig.set_boons({&"vespera": 2})
	check(BoonEffects.dodge_grace() > 0.0, "Perfect Dodge timing is more forgiving")
	var b := BoonRig.create(tree, {&"vespera": 2})
	var a: Enemy = b.enemy(Vector2(600.0, 655.0), 500.0)
	var n1: Enemy = b.enemy(Vector2(700.0, 655.0), 500.0)
	var n2: Enemy = b.enemy(Vector2(500.0, 655.0), 500.0)
	b.bolt_hit(a)
	check(n1.health < n1.max_health and n2.health < n2.max_health, "impacts split into a shard per stack")
	SpecialMoves.use(b.specials, &"vespera", 1)
	var shot := EnemyShot.new()
	b.rig.room.add_child(shot)
	shot.setup(Vector2(-400.0, 0.0), 10.0, 10.0, Color.RED)
	shot.global_position = b.specials.origin() + Vector2(60.0, 0.0)
	b.step(0.05)
	check(shot.reflected and shot.velocity.x > 0.0, "the mirror shell sends shots back")
	b.done()


func test_aurelia_shards_wealth_and_gilded_veil() -> void:
	BoonRig.set_boons({&"aurelia": 2})
	Game.run_shards = 0
	Game.add_run_shards(100)
	check_equal(Game.run_shards, 130, "+15% shard gain per stack")
	Game.wealth = 1000
	check(absf(BoonEffects.wealth_power() - BoonEffects.WEALTH_POWER_CAP) < 0.001, "wealth power is capped")
	var b := BoonRig.create(tree, {&"aurelia": 1})
	var e: Enemy = b.enemy(Vector2(600.0, 655.0))
	SpecialMoves.use(b.specials, &"aurelia", 1)
	check(e.status.is_blind(), "every enemy is blinded")
	var aim: Vector2 = e.aim_at_milo(e.center())
	var shot: EnemyShot = e.shoot(aim, 500.0, 10.0, Color.RED)
	check(shot.velocity.normalized().angle_to(aim) != 0.0 and absf(shot.velocity.normalized().angle_to(aim)) > 0.4, "blinded attacks visibly miss")
	b.done()


func test_noctissa_ambush_wounds_and_blink() -> void:
	var b := BoonRig.create(tree, {&"noctissa": 1})
	var fresh: Enemy = b.enemy(Vector2(900.0, 655.0), 100.0)
	var hit := Hit.make(100.0, Vector2.RIGHT)
	BoonHooks.modify_hit(fresh, hit)
	check(absf(hit.damage - 115.0) < 0.01, "+15% against full-Health targets")
	b.bolt_hit(fresh)
	check(fresh.status.wound_left > 0.0, "bolts leave shade wounds")
	var path: Enemy = b.enemy(Vector2(500.0, 655.0), 300.0)
	var start: float = b.rig.milo.global_position.x
	SpecialMoves.damage_blink(b.specials, 1)
	check(b.rig.milo.global_position.x > start + 200.0, "Milo blinks forward")
	check(path.health < path.max_health, "enemies on the path are cut")
	b.done()


func test_lilith_low_health_power_life_steal_and_blood_pact() -> void:
	BoonRig.set_boons({&"lilith": 1})
	check(absf(BoonEffects.low_health_bonus() - 1.0) < 0.001, "no bonus at full Health")
	Game.health = 50.0
	check(absf(BoonEffects.low_health_bonus() - 1.09) < 0.001, "more damage as Health falls")
	var b := BoonRig.create(tree, {&"lilith": 1})
	var elite: Enemy = b.enemy(Vector2(600.0, 655.0), 1000.0)
	Game.health = 50.0
	var hit: Hit = b.bolt_hit(elite)
	check(absf(Game.health - (50.0 + hit.damage * 0.025)) < 0.01, "steals 2.5% per stack from elites below full Health")
	Game.health = 5.0
	SpecialMoves.blood_pact(b.specials, 1)
	check(Game.health >= 1.0, "the pact never kills")
	check(absf(Game.room_damage_bonus - SpecialMoves.pact_bonus(1)) < 0.001, "the pact raises damage for the room")
	SpecialMoves.blood_pact(b.specials, 1)
	check(Game.room_damage_bonus > SpecialMoves.pact_bonus(1), "and stacks")
	b.done()


func test_seraphine_shield_regenerates_and_halo_negates_hits() -> void:
	var b := BoonRig.create(tree, {&"seraphine": 1})
	Game.in_run = true
	for i: int in 60:
		Game._process(1.0 / 60.0)
	check(Game.shield > 0.0, "the shield regenerates")
	Game.shield = 0.0
	SpecialMoves.use(b.specials, &"seraphine", 1)
	check_equal(b.specials.halo_charges, 3, "2 + stacks halo charges")
	check(not b.rig.milo.take_damage(20.0, 0.0), "a halo charge negates the hit")
	check_equal(Game.health, 100.0, "no Health lost")
	Game.in_run = false
	b.done()
