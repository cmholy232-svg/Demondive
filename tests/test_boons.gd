extends TestCase
## Every boon card, checked against what the code does: the Neon Maw,
## Drowned Court and Thornwild givers. tests/test_boons_late.gd has the rest.


func _base() -> BoltStats:
	BoonRig.set_boons({})
	return BoonEffects.bolt_stats(load("res://data/player/arcane_base.tres") as ArcaneTuning)


func _stats(boons: Dictionary) -> BoltStats:
	BoonRig.set_boons(boons)
	return BoonEffects.bolt_stats(load("res://data/player/arcane_base.tres") as ArcaneTuning)


func test_pyrra_adds_ten_percent_magic_damage_per_stack_and_ignites() -> void:
	var base: BoltStats = _base()
	var two: BoltStats = _stats({&"pyrra": 2})
	check(absf(two.damage / base.damage - 1.2) < 0.001, "two stacks: +20% damage")
	check(two.burn_seconds > 0.0 and two.blast_damage > 0.0, "hits ignite and burning targets explode")


func test_maris_adds_ten_max_health_per_stack_and_grows_bolts() -> void:
	BoonRig.set_boons({})
	var before: float = Game.max_health
	Game.add_boon(&"maris")
	check_equal(Game.max_health, before + 10.0, "+10 max Health")
	var base: BoltStats = _base()
	var maris: BoltStats = _stats({&"maris": 2})
	check(maris.radius > base.radius and maris.knockback > base.knockback and maris.pierce == 1, "bigger, heavier, piercing at 2")


func test_gaia_armor_and_barrier() -> void:
	BoonRig.set_boons({&"gaia": 2})
	check(absf(BoonEffects.armor() - 0.16) < 0.001, "+8% armor per stack")
	var b := BoonRig.create(tree, {&"gaia": 1})
	b.specials._stone_barrier(1)
	check(not b.rig.milo.take_damage(10.0, 0.0), "the barrier soaks a hit")
	check_equal(Game.health, 100.0, "no Health lost behind the barrier")
	b.done()


func test_zephyra_attack_speed_pierce_and_needles() -> void:
	var tuning := load("res://data/player/arcane_base.tres") as ArcaneTuning
	BoonRig.set_boons({})
	var base_cd: float = BoonEffects.cast_cooldown(tuning)
	BoonRig.set_boons({&"zephyra": 3})
	check(absf(base_cd / BoonEffects.cast_cooldown(tuning) - 1.24) < 0.01, "+8% attack speed per stack")
	var z: BoltStats = BoonEffects.bolt_stats(tuning)
	check(z.pierce == 3 and z.split >= 1, "pierce per stack and an angled needle")


func test_belladonna_pickups_grant_speed_and_room_damage() -> void:
	BoonRig.set_boons({&"belladonna": 1})
	Game.on_pickup()
	check(BoonEffects.move_speed_multiplier() > 1.0, "pickups give a speed buff")
	check(Game.room_damage_bonus > 0.0, "pickups raise room damage")


func test_flora_crit_and_thorn_marks_burst_on_the_third_hit() -> void:
	var base: BoltStats = _base()
	check(absf(_stats({&"flora": 2}).crit_chance - base.crit_chance - 0.12) < 0.001, "+6% crit per stack")
	var b := BoonRig.create(tree, {&"flora": 1})
	var target: Enemy = b.enemy(Vector2(600.0, 655.0), 500.0)
	b.bolt_hit(target)
	b.bolt_hit(target)
	check_equal(int(target.status.marks.get(&"thorn", 0)), 2, "two marks after two hits")
	var before: float = target.health
	var last: Hit = b.bolt_hit(target)
	check(before - target.health > last.damage, "the third hit bursts for extra damage")
	check(not target.status.has_mark(&"thorn"), "the burst spends the marks")
	check_equal(BoonHooks.flora_threshold(4), 2, "from Lv 4, marks burst sooner")
	b.done()


func test_flora_thorn_bind_roots_the_nearest_enemy() -> void:
	var b := BoonRig.create(tree, {&"flora": 1})
	var near: Enemy = b.enemy(Vector2(500.0, 655.0))
	var far: Enemy = b.enemy(Vector2(900.0, 655.0))
	SpecialMoves.thorn_bind(b.specials, 1)
	check(near.status.is_rooted() and not far.status.is_rooted(), "only the nearest is rooted")
	check(not near.status.is_frozen(), "rooted enemies can still act and fire")
	b.done()


func test_voltara_energy_chain_and_arc_chain() -> void:
	BoonRig.set_boons({&"voltara": 2})
	check(absf(BoonEffects.energy_on_hit() - 3.2) < 0.001, "energy on hit rises 1 per stack")
	var b := BoonRig.create(tree, {&"voltara": 1})
	var a: Enemy = b.enemy(Vector2(600.0, 655.0))
	var other: Enemy = b.enemy(Vector2(700.0, 655.0))
	b.bolt_hit(a)
	check(other.health < other.max_health, "hits chain into a nearby target")
	var group: Array[Enemy] = []
	for i: int in 6:
		group.append(b.enemy(Vector2(900.0 + i * 120.0, 655.0)))
	SpecialMoves.arc_chain(b.specials, 1)
	var stunned: int = 0
	for e: Enemy in group + [a, other]:
		if e.stun_timer > 0.0:
			stunned += 1
	check_equal(stunned, 4, "Arc Chain stuns a small group (3 + stacks), not the room")
	b.done()


func test_nerissa_magnet_homing_and_siren_call() -> void:
	BoonRig.set_boons({})
	var magnet: float = BoonEffects.pickup_magnet()
	BoonRig.set_boons({&"nerissa": 1})
	check_equal(BoonEffects.pickup_magnet(), magnet + 55.0, "+55px magnet per stack")
	check(BoonEffects.bolt_stats(load("res://data/player/arcane_base.tres") as ArcaneTuning).homing > 0.0, "bolts bend toward targets")
	var b := BoonRig.create(tree, {&"nerissa": 1})
	var target: Enemy = b.enemy(Vector2(500.0, 655.0), 200.0)
	SpecialMoves.siren_call(b.specials, 1)
	check(target.status.is_charmed(), "the nearest enemy is charmed")
	var hit := Hit.make(10.0, Vector2.RIGHT)
	target.take_hit(hit)
	check(absf(target.max_health - target.health - 12.5) < 0.01, "charmed enemies take 25% extra damage")
	b.done()


func test_crya_chill_freezes_and_armor_while_controlled() -> void:
	var b := BoonRig.create(tree, {&"crya": 2})
	var target: Enemy = b.enemy(Vector2(600.0, 655.0), 2000.0)
	check(absf(BoonEffects.armor()) < 0.001, "no armor while nothing is controlled")
	var hits: int = 0
	while not target.status.is_frozen() and hits < 10:
		b.bolt_hit(target)
		hits += 1
	check(target.status.is_frozen(), "hits build into a freeze (took %d)" % hits)
	check(absf(BoonEffects.armor() - 0.16) < 0.001, "+8% defense per stack while an enemy is frozen")
	var other: Enemy = b.enemy(Vector2(900.0, 655.0))
	SpecialMoves.whiteout(b.specials, 1)
	check(other.status.speed_factor() < 0.6, "Whiteout slows every enemy")
	b.done()


func test_roxyne_isolated_bonus_and_pounce() -> void:
	var b := BoonRig.create(tree, {&"roxyne": 1})
	var alone: Enemy = b.enemy(Vector2(600.0, 655.0), 500.0)
	var hit := Hit.make(100.0, Vector2.RIGHT)
	BoonHooks.modify_hit(alone, hit)
	check(absf(hit.damage - 112.0) < 0.01, "+12% against isolated enemies")
	var crowd: Enemy = b.enemy(Vector2(650.0, 655.0), 500.0)
	hit = Hit.make(100.0, Vector2.RIGHT)
	BoonHooks.modify_hit(crowd, hit)
	check(absf(hit.damage - 100.0) < 0.01, "no bonus with an ally nearby")
	var big: Enemy = b.boss(Vector2(500.0, 655.0))
	SpecialMoves.predator_pounce(b.specials, 1)
	check(b.rig.milo.is_invulnerable() and b.rig.milo.is_dashing(), "the pounce is an invulnerable lunge")
	check(big.status.has_mark(&"hunt"), "bosses in the lane are marked")
	b.done()
