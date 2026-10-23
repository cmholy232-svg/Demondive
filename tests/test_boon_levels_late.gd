extends TestCase
## The Lv 2, 4 and 7 behaviours on each boon's card, Solara to Seraphine,
## plus the pair synergies, the level-up callouts and boon offers.

const TUNING: String = "res://data/player/arcane_base.tres"


func _stats(boons: Dictionary) -> BoltStats:
	BoonRig.set_boons(boons)
	return BoonEffects.bolt_stats(load(TUNING) as ArcaneTuning)


func _hurt(e: Enemy) -> float:
	return e.max_health - e.health


func _bolts() -> int:
	return tree.get_nodes_in_group(&"arcane_bolt").size()


func test_solara_light_field_execute_and_judgement() -> void:
	var b := BoonRig.create(tree, {&"solara": 2})
	var target: Enemy = b.enemy(Vector2(700.0, 655.0), 5000.0)
	SpecialMoves.radiant_lance(b.specials, 2)
	await tree.create_timer(2.8).timeout
	var lance: float = 60.0 + 20.0 * 2
	check(_hurt(target) > lance * 1.9, "Lv 2 Light Field: the lance keeps striking (%.0f)" % _hurt(target))
	b.done()
	b = BoonRig.create(tree, {&"solara": 4})
	var weak: Enemy = b.enemy(Vector2(700.0, 655.0), 100.0)
	weak.health = 10.0
	var hit := Hit.make(1.0, Vector2.RIGHT)
	BoonHooks.modify_hit(weak, hit)
	check(absf(hit.damage - 3.0) < 0.01, "Lv 4 Execute: triple damage below 15% Health")
	weak.health = 25.0
	hit = Hit.make(1.0, Vector2.RIGHT)
	BoonHooks.modify_hit(weak, hit)
	check(absf(hit.damage - 1.0) < 0.01, "not at 25% before Lv 7")
	BoonRig.set_boons({&"solara": 7})
	hit = Hit.make(1.0, Vector2.RIGHT)
	BoonHooks.modify_hit(weak, hit)
	check(absf(hit.damage - 3.0) < 0.01, "Lv 7 Judgement: execute below 30%")
	b.done()


func test_nerissa_serenade_death_note_and_chorus() -> void:
	var b := BoonRig.create(tree, {&"nerissa": 4})
	var charmed: Enemy = b.enemy(Vector2(600.0, 655.0), 100.0)
	var near: Enemy = b.enemy(Vector2(700.0, 655.0), 100.0)
	charmed.status.charm(3.0)
	charmed.health = 20.0
	var hit := Hit.make(1.0, Vector2.RIGHT)
	BoonHooks.modify_hit(charmed, hit)
	check(hit.damage > 20.0, "Lv 4 Death Note: a bolt finishes a weakened charmed enemy")
	charmed.take_hit(hit)
	check(charmed.dead and near.status.is_charmed(), "Lv 2 Serenade: its death charms the nearest enemy")
	b.done()
	b = BoonRig.create(tree, {&"nerissa": 7})
	var group: Array[Enemy] = []
	for i: int in 4:
		group.append(b.enemy(Vector2(450.0 + i * 100.0, 655.0)))
	SpecialMoves.siren_call(b.specials, 7)
	var count: int = group.filter(func(e: Enemy) -> bool: return e.status.is_charmed()).size()
	check_equal(count, 3, "Lv 7 Chorus: Siren Call charms the three nearest")
	b.done()


func test_roxyne_mark_feast_and_apex() -> void:
	var b := BoonRig.create(tree, {&"roxyne": 4})
	var alone: Enemy = b.enemy(Vector2(800.0, 655.0), 1000.0)
	b.bolt_hit(alone)
	check(alone.status.has_mark(&"hunt"), "Lv 2 Mark: hitting an isolated enemy hunts it")
	Game.energy = 0.0
	alone.take_hit(Hit.make(5000.0, Vector2.RIGHT))
	check(Game.energy >= BoonDeaths.FEAST_ENERGY, "Lv 4 Feast: a hunted kill restores Energy (%.1f)" % Game.energy)
	b.done()
	b = BoonRig.create(tree, {&"roxyne": 7})
	var prey: Enemy = b.enemy(Vector2(800.0, 655.0), 1000.0)
	prey.status.mark(&"hunt")
	var hit := Hit.make(100.0, Vector2.RIGHT)
	BoonHooks.modify_hit(prey, hit)
	check(hit.critical, "Lv 7 Apex: hunted enemies always take critical hits")
	b.done()


func test_calyptra_rolls_show_on_the_bolt_and_levels() -> void:
	var colors: Dictionary = {}
	var jackpot: BoltStats = null
	for i: int in 400:
		var st: BoltStats = _stats({&"calyptra": 2}) if i == 0 else BoonEffects.bolt_stats(load(TUNING) as ArcaneTuning)
		colors[st.band] = st.color
		if st.band == 3 and jackpot == null:
			jackpot = st
	check(colors.size() == 4 and colors[0] != colors[1] and colors[2] != colors[1], "every roll band shows its own bolt colour")
	check(jackpot != null and jackpot.pierce >= BoonEffectsMore.ALL_PIERCE, "Lv 2 Hot Hand: Jackpots pierce everything")
	var w4: Array[float] = BoonEffectsMore.band_weights(4)
	var w7: Array[float] = BoonEffectsMore.band_weights(7)
	check(w4[0] > 0.0 and w7[0] == 0.0, "Lv 7 House Edge: no more low rolls")
	check(w7[3] > (2.0 + 7.0) * 1.9, "and Jackpots twice as likely")


func test_isolde_prism_and_refraction() -> void:
	check_equal(_stats({&"isolde": 1}).bounce_growth, 0.0, "no growth at Lv 1")
	check(absf(_stats({&"isolde": 2}).bounce_growth - 0.15) < 0.001, "Lv 2 Prism: +15% per ricochet")
	check(not _stats({&"isolde": 4}).refract and _stats({&"isolde": 7}).refract, "Lv 7 Refraction")
	var b := BoonRig.create(tree, {&"isolde": 7})
	var a: Enemy = b.enemy(Vector2(600.0, 655.0), 5000.0)
	var c: Enemy = b.enemy(Vector2(600.0, 400.0), 5000.0)
	var d: Enemy = b.enemy(Vector2(900.0, 655.0), 5000.0)
	var stats: BoltStats = b.bolt_stats()
	stats.crit_chance = 0.0
	b.rig.caster.spawn_at(a.center() - Vector2(50.0, 0.0), Vector2.RIGHT, stats)
	for i: int in 50:
		await tree.physics_frame
	check(_hurt(c) > 0.0 and _hurt(d) > 0.0, "a ricochet off an enemy splits a bolt at another")
	b.done()


func test_somnia_echo_counts_and_lucid_dream() -> void:
	for pair: Array in [[2, 2], [4, 3], [7, 3]]:
		var b := BoonRig.create(tree, {&"somnia": pair[0]})
		var spawned: Array[int] = [0]
		var count := func(node: Node) -> void:
			if node is ArcaneBolt:
				spawned[0] += 1
		tree.node_added.connect(count)
		b.rig.caster.fire(Vector2.RIGHT)
		for i: int in 40:
			await tree.physics_frame
		tree.node_added.disconnect(count)
		check_equal(spawned[0] - 1, int(pair[1]), "%d stacks: echoes" % pair[0])
		b.done()


func test_vespera_riposte_interest_and_hall_of_mirrors() -> void:
	var b := BoonRig.create(tree, {&"vespera": 2})
	var e: Enemy = b.enemy(Vector2(550.0, 655.0), 500.0)
	b.specials.companions.step(0.01)
	b.rig.milo.perfect_dodged.emit()
	check(e.health < e.max_health, "Lv 2 Riposte: a Perfect Dodge cuts enemies nearby")
	BoonRig.set_boons({&"vespera": 2})
	var low: float = b.specials.mirror_power()
	BoonRig.set_boons({&"vespera": 4})
	check(b.specials.mirror_power() > low * 1.9, "Lv 4: returned shots hit twice as hard")
	b.done()
	b = BoonRig.create(tree, {&"vespera": 7})
	var a: Enemy = b.enemy(Vector2(600.0, 655.0), 5000.0)
	var n: Enemy = b.enemy(Vector2(700.0, 655.0), 5000.0)
	var hit: Hit = b.bolt_hit(a)
	check(absf(_hurt(n) - hit.damage * 0.5) < 0.5, "Lv 7: shards cut for 50%")
	b.done()


func test_aurelia_compound_interest_and_golden_touch() -> void:
	var b := BoonRig.create(tree, {&"aurelia": 7})
	for i: int in 5:
		var e: Enemy = b.enemy(Vector2(600.0 + i * 50.0, 655.0), 10.0)
		b.bolt_hit(e)
	check_equal(Game.wealth, 10, "Lv 7 Golden Touch: every kill pays, two coins each from Lv 2")
	Game.wealth = 1000
	check(absf(BoonEffects.wealth_power() - BoonEffects.WEALTH_POWER_CAP_HIGH) < 0.001, "Lv 4 Interest: a higher cap")
	b.done()


func test_noctissa_lingering_shade_trace_and_nightfall() -> void:
	var b := BoonRig.create(tree, {&"noctissa": 4})
	var e: Enemy = b.enemy(Vector2(600.0, 655.0), 500.0)
	var near: Enemy = b.enemy(Vector2(700.0, 655.0), 500.0)
	e.health = 400.0
	check(not BoonHooks.is_ambush(e), "a hurt, aware enemy is no ambush")
	e.status.wound(5.0, 3.0)
	check(BoonHooks.is_ambush(e), "Lv 2 Lingering Shade: wounded enemies count as ambushed")
	e.take_hit(Hit.make(5000.0, Vector2.RIGHT))
	check(near.status.wound_left > 0.0, "Lv 4 Trace: the wound passes on at death")
	b.done()
	b = BoonRig.create(tree, {&"noctissa": 7})
	var fresh: Enemy = b.enemy(Vector2(900.0, 655.0), 100.0)
	var hit := Hit.make(100.0, Vector2.RIGHT)
	BoonHooks.modify_hit(fresh, hit)
	check(absf(hit.damage - 310.0) < 0.01, "Lv 7 Nightfall: +30% ambush damage per stack")
	b.done()


func test_lilith_blood_price_and_undying() -> void:
	var b := BoonRig.create(tree, {&"lilith": 4})
	var grunt: Enemy = b.enemy(Vector2(600.0, 655.0), 50.0)
	Game.health = 50.0
	b.bolt_hit(grunt)
	check(Game.health > 50.0, "Lv 4 Blood Price: ordinary enemies are drained too")
	b.done()
	BoonRig.set_boons({&"lilith": 7})
	Game.undying_spent = false
	Game.health = 10.0
	Game.hurt(80.0)
	check(Game.health == 1.0 and Game.shield >= Game.BLOOD_SHIELD_CAP, "Lv 7 Undying: a killing blow leaves 1 Health and a blood shield")
	Game.shield = 0.0
	Game.hurt(80.0)
	check_equal(Game.health, 0.0, "only once per room")
	BoonRig.set_boons({})


func test_seraphine_orbiting_fragments_fire_and_retribution() -> void:
	var b := BoonRig.create(tree, {&"seraphine": 1})
	b.enemy(Vector2(600.0, 655.0), 500.0)
	check_equal(b.specials.companions.fragment_positions().size(), 1, "one fragment at Lv 1")
	check_equal(b.specials.companions.fire_fragments(), 1, "fragments fire at nearby enemies")
	BoonRig.set_boons({&"seraphine": 4})
	check_equal(BoonCompanions.fragment_count(), 3, "three fragments at Lv 4")
	check(BoonCompanions.fragment_seconds() < BoonCompanions.FRAGMENT_SECONDS, "and they fire faster")
	BoonRig.set_boons({&"seraphine": 7})
	Game.shield = 10.0
	var before: int = _bolts()
	Game.hurt(5.0)
	check_equal(_bolts() - before, 4, "Lv 7 Retribution: a soaked hit fires all four fragments")
	b.done()


func test_pair_synergies() -> void:
	var base: BoltStats = _stats({&"pyrra": 1})
	check(absf(_stats({&"pyrra": 1, &"maris": 1}).damage / base.damage - 1.15) < 0.001, "Steam Pressure: +15% Magic damage")
	check_equal(_stats({&"zephyra": 1, &"voltara": 1}).split, 1, "Stormfront: an extra needle")
	check(absf(BoonHooks.chain_share(1) - 0.6) < 0.001, "Stormfront: chains hit 20% harder")
	check(absf(_stats({&"flora": 1, &"crya": 1}).crit_chance - _stats({&"flora": 1}).crit_chance - 0.08) < 0.001, "Crystal Garden: +8% crit")
	BoonRig.set_boons({&"luna": 1})
	var cost: float = BoonEffects.special_cost(&"pyrra")
	BoonRig.set_boons({&"luna": 1, &"solara": 1})
	check(BoonEffects.special_cost(&"pyrra") < cost, "Eclipse Engine: cheaper Specials")
	BoonRig.set_boons({&"aurelia": 1, &"belladonna": 1})
	Game.on_pickup(false)
	check_equal(Game.wealth, 1, "Gilded Appetite: a pickup adds a coin")
	check_equal(_stats({&"vespera": 1, &"somnia": 1}).bounces, 1, "Mirror Dream: a ricochet")
	var b := BoonRig.create(tree, {&"flora": 1, &"crya": 1})
	var e: Enemy = b.enemy(Vector2(600.0, 655.0), 5000.0)
	for i: int in 3:
		b.bolt_hit(e)
	check(e.status.chill >= Synergies.GARDEN_CHILL or e.status.is_frozen(), "Crystal Garden: thorn bursts chill")
	b.done()
	for id: Variant in Synergies.PAIRS:
		check(Strings.has_key("synergy.%s.name" % id) and Strings.has_key("synergy.%s.desc" % id), "%s has card text" % id)


func test_offers_always_include_a_held_boon() -> void:
	BoonRig.set_boons({&"maris": 1})
	for id: StringName in BoonCatalog.ORDER:
		Save.unlock(id)
	var rng := RandomNumberGenerator.new()
	rng.seed = 9
	for i: int in 50:
		var picks: Array[StringName] = BoonChoice.roll(rng)
		check(picks.size() == 3 and picks.has(&"maris"), "a held boon is always offered")
		check_equal(picks.size(), BoonCatalog.ORDER.filter(func(id: StringName) -> bool: return picks.has(id)).size(), "no duplicates")
	var forced: Array[StringName] = BoonChoice.roll(rng, &"belladonna")
	check(forced[0] == &"belladonna" and forced.has(&"maris"), "a Demon Lord's own boon still comes first")
	Save.reset_for_tests()
	BoonRig.set_boons({})


func test_level_callout_names_the_new_behaviour() -> void:
	check_equal(BoonCallouts.rank_line(&"pyrra", 2), "Pyrra Lv 2: Bloom", "callout text")
	check_equal(BoonCallouts.level_for(&"pyrra", 4), 7, "rank 4 unlocks at 7 stacks")
