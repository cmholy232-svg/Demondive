class_name BoonHooks
extends RefCounted
## What the boons do when an Arcane Bolt lands: bonus damage decided by the
## target, then marks, chains, chill, echoes, wounds, life steal, mirror
## shards, wealth and charm. Every number matches the boon's card in the
## strings file; tests/test_boons.gd checks them.

const ISOLATION_RANGE: float = 300.0
const CHAIN_RANGE: float = 280.0
const SHARD_RANGE: float = 220.0


static func s(id: StringName) -> int:
	return Game.stacks(id)


static func living(tree: SceneTree) -> Array[Enemy]:
	var out: Array[Enemy] = []
	if tree == null:
		return out
	for node: Node in tree.get_nodes_in_group(Enemy.GROUP):
		var enemy := node as Enemy
		if enemy != null and is_instance_valid(enemy) and enemy.is_active():
			out.append(enemy)
	return out


## Nearest living enemies to a point, closest first, skipping `skip`.
static func nearest(tree: SceneTree, at: Vector2, count: int, reach: float, skip: Array = []) -> Array[Enemy]:
	var found: Array[Enemy] = []
	for enemy: Enemy in living(tree):
		if not skip.has(enemy) and enemy.center().distance_to(at) <= reach:
			found.append(enemy)
	found.sort_custom(func(a: Enemy, b: Enemy) -> bool: return a.center().distance_to(at) < b.center().distance_to(at))
	return found.slice(0, count)


static func any_controlled(tree: SceneTree) -> bool:
	for enemy: Enemy in living(tree):
		if enemy.status.is_controlled() or enemy.stun_timer > 0.0:
			return true
	return false


static func is_isolated(enemy: Enemy) -> bool:
	for other: Enemy in living(enemy.get_tree()):
		if other != enemy and other.center().distance_to(enemy.center()) < ISOLATION_RANGE:
			return false
	return true


## Bonus damage decided by who is hit, applied before the hit lands.
##   Solara    +12% per stack against elites and bosses
##   Roxyne    +12% per stack against isolated enemies and hunted bosses
##   Noctissa  +15% per stack against unaware or full-Health enemies
static func modify_hit(enemy: Enemy, hit: Hit) -> void:
	var bonus: float = 1.0
	if s(&"solara") > 0 and enemy.is_elite():
		bonus += 0.12 * s(&"solara")
	if s(&"roxyne") > 0 and (is_isolated(enemy) or enemy.status.has_mark(&"hunt")):
		bonus += 0.12 * s(&"roxyne")
	if s(&"noctissa") > 0 and (not enemy.aggro or enemy.health >= enemy.max_health):
		bonus += 0.15 * s(&"noctissa")
	hit.damage *= bonus


## Arcane effects once a bolt's hit has landed.
static func after_hit(enemy: Enemy, hit: Hit, stats: BoltStats, parent: Node) -> void:
	_aurelia(enemy)
	if enemy.dead:
		return
	_charm(enemy, stats)
	_crya(enemy, hit)
	_noctissa(enemy)
	_lilith(enemy, hit)
	_luna(enemy, hit)
	_flora(enemy, parent)
	_voltara(enemy, hit)
	_vespera(enemy, hit)


static func side_hit(enemy: Enemy, amount: float, source: StringName, from: Vector2) -> void:
	if enemy == null or enemy.dead:
		return
	var hit := Hit.make(amount, enemy.center() - from)
	hit.source = source
	enemy.take_hit(hit)


## Flora: hits plant thorn marks; three (two from 3 stacks) burst and spread.
static func _flora(enemy: Enemy, parent: Node) -> void:
	var n: int = s(&"flora")
	if n <= 0:
		return
	if enemy.status.mark(&"thorn") < flora_threshold(n):
		return
	enemy.status.clear_mark(&"thorn")
	var at: Vector2 = enemy.center()
	var radius: float = 110.0 + 15.0 * n
	if n >= 2:
		for other: Enemy in nearest(enemy.get_tree(), at, 3, radius, [enemy]):
			other.status.mark(&"thorn")
	ArcaneBlast.detonate(parent, at, radius, 18.0 + 7.0 * n, BoonCatalog.color(&"flora"))


static func flora_threshold(n: int) -> int:
	return 3 if n < 3 else 2


## Voltara: hits chain lightning into 1 more target per 2 stacks (at least 1),
## for 40% of the hit.
static func _voltara(enemy: Enemy, hit: Hit) -> void:
	var n: int = s(&"voltara")
	if n <= 0:
		return
	var from: Vector2 = enemy.center()
	for other: Enemy in nearest(enemy.get_tree(), from, 1 + n / 2, CHAIN_RANGE, [enemy]):
		Game.fx(&"spark", other.center(), BoonCatalog.color(&"voltara"), 0.8)
		side_hit(other, hit.damage * 0.4, &"chain", from)


## Crya: hits build chill that slows, then freezes; heavy hits shatter the frozen.
static func _crya(enemy: Enemy, hit: Hit) -> void:
	var n: int = s(&"crya")
	if n <= 0:
		return
	if enemy.status.is_frozen() and hit.damage >= 25.0:
		enemy.status.frozen_left = 0.0
		Game.fx(&"frost", enemy.center(), BoonCatalog.color(&"crya"), 1.4)
		side_hit(enemy, 15.0 + 10.0 * n, &"shatter", enemy.center())
		return
	if enemy.status.add_chill(0.25 + 0.08 * n, 1.2 + 0.3 * n):
		Game.fx(&"frost", enemy.center(), BoonCatalog.color(&"crya"), 1.0)


## Luna: the third hit on a target repeats 30% (+18% per extra stack) of
## the damage dealt since the first mark.
static func _luna(enemy: Enemy, hit: Hit) -> void:
	var n: int = s(&"luna")
	if n <= 0:
		return
	enemy.status.dream_stored += hit.damage
	if enemy.status.mark(&"dream") < 3:
		return
	var echo: float = enemy.status.dream_stored * luna_share(n)
	enemy.status.clear_mark(&"dream")
	enemy.status.dream_stored = 0.0
	Game.fx(&"sparkle", enemy.center(), BoonCatalog.color(&"luna"), 1.4)
	if n >= 2:
		for other: Enemy in nearest(enemy.get_tree(), enemy.center(), 1, CHAIN_RANGE, [enemy]):
			other.status.mark(&"dream")
	side_hit(enemy, echo, &"echo", enemy.center())


static func luna_share(n: int) -> float:
	return 0.3 + 0.18 * (n - 1)


## Noctissa: shade wounds keep cutting the struck enemy.
static func _noctissa(enemy: Enemy) -> void:
	var n: int = s(&"noctissa")
	if n > 0:
		enemy.status.wound(3.0 + 2.0 * n, 2.0 + 0.5 * n)


## Lilith: below full Health, hits on elites and bosses steal 2.5% per stack;
## from 2 stacks, healing past full becomes a blood shield.
static func _lilith(enemy: Enemy, hit: Hit) -> void:
	var n: int = s(&"lilith")
	if n <= 0 or not enemy.is_elite() or Game.health >= Game.max_health:
		return
	var amount: float = hit.damage * 0.025 * n
	var room: float = Game.max_health - Game.health
	Game.heal(amount)
	if n >= 2 and amount > room:
		Game.add_shield(amount - room)


## Vespera: impacts split into one mirror shard per stack, each cutting a
## nearby enemy for 30% of the hit.
static func _vespera(enemy: Enemy, hit: Hit) -> void:
	var n: int = s(&"vespera")
	if n <= 0:
		return
	var from: Vector2 = enemy.center()
	for other: Enemy in nearest(enemy.get_tree(), from, n, SHARD_RANGE, [enemy]):
		Game.fx(&"mirror", other.center(), BoonCatalog.color(&"vespera"), 0.7)
		side_hit(other, hit.damage * 0.3, &"shard", from)


## Aurelia: kills may drop a coin of temporary wealth (35%; two coins from 3 stacks).
static func _aurelia(enemy: Enemy) -> void:
	var n: int = s(&"aurelia")
	if n <= 0 or not enemy.dead or Game.rng.randf() >= 0.35:
		return
	Game.wealth += 2 if n >= 3 else 1
	Game.fx(&"sparkle", enemy.center(), BoonCatalog.color(&"aurelia"), 1.2)


## Nerissa: a hit may charm its target for a few seconds.
static func _charm(enemy: Enemy, stats: BoltStats) -> void:
	if stats.charm_chance > 0.0 and Game.rng.randf() < stats.charm_chance:
		enemy.status.charm(2.0 + 0.5 * s(&"nerissa"))
