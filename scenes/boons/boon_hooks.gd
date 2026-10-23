class_name BoonHooks
extends RefCounted
## What the boons do when an Arcane Bolt lands: bonus damage decided by the
## target, then marks, chains, chill, echoes, wounds, life steal, mirror
## shards, wealth and charm. Every number matches the boon's card in the
## strings file; tests/test_boons.gd checks them.

const ISOLATION_RANGE: float = 300.0
const CHAIN_RANGE: float = 280.0
const SHARD_RANGE: float = 220.0
## Solara Lv 4 / Lv 7: bolts triple their damage on enemies below this Health.
const EXECUTE_AT: float = 0.15
const EXECUTE_AT_HIGH: float = 0.3
const EXECUTE_MULTIPLIER: float = 3.0
## Nerissa Lv 4: a bolt finishes a charmed ordinary enemy below this Health.
const DEATH_NOTE_AT: float = 0.25
## Gaia Lv 7: stunned enemies take this much bolt damage.
const AVALANCHE: float = 1.5


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
##   Solara    +12% per stack against elites and bosses; Lv 4 executes
##   Roxyne    +12% per stack against isolated or hunted enemies; Lv 7 crits the hunted
##   Noctissa  +15% per stack (+30% from Lv 7) against unaware, full-Health
##             or (Lv 2) shade-wounded enemies
##   Gaia      Lv 7: stunned enemies take +50%
##   Nerissa   Lv 4: finishes weakened charmed enemies
static func modify_hit(enemy: Enemy, hit: Hit, stats: BoltStats = null) -> void:
	var bonus: float = 1.0
	if s(&"solara") > 0 and enemy.is_elite():
		bonus += 0.12 * s(&"solara")
	var hunted: bool = enemy.status.has_mark(&"hunt")
	if s(&"roxyne") > 0 and (is_isolated(enemy) or hunted):
		bonus += 0.12 * s(&"roxyne")
	if s(&"noctissa") > 0 and is_ambush(enemy):
		bonus += (0.3 if BoonCatalog.rank(&"noctissa") >= 4 else 0.15) * s(&"noctissa")
	if BoonCatalog.rank(&"gaia") >= 4 and enemy.stun_timer > 0.0:
		bonus *= AVALANCHE
	if hunted and BoonCatalog.rank(&"roxyne") >= 4 and not hit.critical:
		hit.critical = true
		bonus *= stats.crit_multiplier if stats != null else BoltStats.new().crit_multiplier
	if Synergies.active(&"steam_pressure") and enemy.is_burning():
		hit.knockback *= Synergies.STEAM_SHOVE
	hit.damage *= bonus
	if hit.source != &"bolt":
		return
	var rank: int = BoonCatalog.rank(&"solara")
	if rank >= 3 and enemy.health_ratio() < (EXECUTE_AT_HIGH if rank >= 4 else EXECUTE_AT):
		hit.damage *= EXECUTE_MULTIPLIER
	if BoonCatalog.rank(&"nerissa") >= 3 and enemy.status.is_charmed() and not enemy.is_boss and enemy.health_ratio() < DEATH_NOTE_AT:
		hit.damage = maxf(hit.damage, enemy.health + 1.0)
		Game.fx(&"charm", enemy.center(), BoonCatalog.color(&"nerissa"), 1.6)


static func is_ambush(enemy: Enemy) -> bool:
	if not enemy.aggro or enemy.health >= enemy.max_health:
		return true
	return BoonCatalog.rank(&"noctissa") >= 2 and enemy.status.wound_left > 0.0


## Arcane effects once a bolt's hit has landed.
static func after_hit(enemy: Enemy, hit: Hit, stats: BoltStats, parent: Node) -> void:
	_aurelia(enemy)
	if enemy.dead:
		return
	_charm(enemy, stats)
	_roxyne(enemy)
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


## Flora: hits plant thorn marks; three burst. Lv 2 Spread: bursts mark 3
## neighbours. Lv 4 Quick Bloom: two marks burst. Lv 7 Strangle: bursts root
## ordinary enemies. Crystal Garden: bursts chill what they hit.
static func _flora(enemy: Enemy, parent: Node) -> void:
	var n: int = s(&"flora")
	if n <= 0:
		return
	if enemy.status.mark(&"thorn") < flora_threshold(n):
		return
	enemy.status.clear_mark(&"thorn")
	var at: Vector2 = enemy.center()
	var radius: float = 110.0 + 15.0 * n
	var rank: int = BoonCatalog.rank(&"flora")
	var caught: Array[Enemy] = nearest(enemy.get_tree(), at, 99, radius, [])
	if rank >= 2:
		for other: Enemy in caught.slice(0, 4):
			if other != enemy:
				other.status.mark(&"thorn")
	for other: Enemy in caught:
		if rank >= 4:
			other.status.root(1.5)
		if Synergies.active(&"crystal_garden"):
			other.status.add_chill(Synergies.GARDEN_CHILL, 1.2 + 0.3 * s(&"crya"))
	ArcaneBlast.detonate(parent, at, radius, 18.0 + 7.0 * n, BoonCatalog.color(&"flora"))


static func flora_threshold(n: int) -> int:
	return 2 if BoonCatalog.rank_at(&"flora", n) >= 3 else 3


## Voltara: hits chain lightning into 1 more target per 2 stacks (at least 1),
## for 40% of the hit. Lv 4 Return Chain: the last link arcs back to the
## first target. Lv 7 Overload: chains hit for 60% and stun.
static func _voltara(enemy: Enemy, hit: Hit) -> void:
	var n: int = s(&"voltara")
	if n <= 0:
		return
	var rank: int = BoonCatalog.rank(&"voltara")
	var share: float = chain_share(rank)
	var from: Vector2 = enemy.center()
	for other: Enemy in nearest(enemy.get_tree(), from, 1 + n / 2, CHAIN_RANGE, [enemy]):
		Game.fx(&"spark", other.center(), BoonCatalog.color(&"voltara"), 0.8)
		side_hit(other, hit.damage * share, &"chain", from)
		if rank >= 4 and not other.dead and not other.is_boss:
			other.stun_timer = maxf(other.stun_timer, 0.4)
		from = other.center()
	if rank >= 3 and from != enemy.center():
		Game.fx(&"spark", enemy.center(), BoonCatalog.color(&"voltara"), 1.0)
		side_hit(enemy, hit.damage * share, &"chain", from)


static func chain_share(rank: int) -> float:
	var share: float = 0.4
	if rank >= 4:
		share += 0.2
	if Synergies.active(&"stormfront"):
		share += Synergies.STORM_CHAIN_SHARE
	return share


## Crya: hits build chill that slows, then freezes; heavy hits (25+) shatter
## the frozen. Lv 2: any bolt shatters. Lv 4 Cold Snap: shatters chill the
## enemies around. Lv 7 Absolute Zero: freezes last twice as long and
## shatters hit twice as hard.
static func _crya(enemy: Enemy, hit: Hit) -> void:
	var n: int = s(&"crya")
	if n <= 0:
		return
	var rank: int = BoonCatalog.rank(&"crya")
	var deep: float = 2.0 if rank >= 4 else 1.0
	if enemy.status.is_frozen() and hit.damage >= shatter_at(rank):
		enemy.status.frozen_left = 0.0
		Game.fx(&"frost", enemy.center(), BoonCatalog.color(&"crya"), 1.4)
		if rank >= 3:
			for other: Enemy in nearest(enemy.get_tree(), enemy.center(), 99, 200.0, [enemy]):
				other.status.add_chill(0.5, (1.2 + 0.3 * n) * deep)
		side_hit(enemy, (15.0 + 10.0 * n) * deep, &"shatter", enemy.center())
		return
	if enemy.status.add_chill(0.25 + 0.08 * n, (1.2 + 0.3 * n) * deep):
		Game.fx(&"frost", enemy.center(), BoonCatalog.color(&"crya"), 1.0)


static func shatter_at(rank: int) -> float:
	return 0.0 if rank >= 2 else 25.0


## Luna: the third hit on a target repeats 30% (+18% per extra stack) of
## the damage dealt since the first mark. Lv 2: the echo marks the nearest
## enemy. Lv 4 Lucid: the second hit echoes. Lv 7 Full Moon: the echo also
## hits enemies around for half. Eclipse Engine: doubles echoes on elites.
static func _luna(enemy: Enemy, hit: Hit) -> void:
	var n: int = s(&"luna")
	if n <= 0:
		return
	var rank: int = BoonCatalog.rank(&"luna")
	enemy.status.dream_stored += hit.damage
	if enemy.status.mark(&"dream") < luna_hits(rank):
		return
	var echo: float = enemy.status.dream_stored * luna_share(n)
	if Synergies.active(&"eclipse_engine") and enemy.is_elite():
		echo *= Synergies.ECLIPSE_ECHO
	enemy.status.clear_mark(&"dream")
	enemy.status.dream_stored = 0.0
	Game.fx(&"sparkle", enemy.center(), BoonCatalog.color(&"luna"), 1.4)
	var at: Vector2 = enemy.center()
	if rank >= 2:
		for other: Enemy in nearest(enemy.get_tree(), at, 1, CHAIN_RANGE, [enemy]):
			other.status.mark(&"dream")
	if rank >= 4:
		for other: Enemy in nearest(enemy.get_tree(), at, 99, 160.0, [enemy]):
			side_hit(other, echo * 0.5, &"echo", at)
	side_hit(enemy, echo, &"echo", at)


static func luna_hits(rank: int) -> int:
	return 2 if rank >= 3 else 3


static func luna_share(n: int) -> float:
	return 0.3 + 0.18 * (n - 1)


## Noctissa: shade wounds keep cutting the struck enemy.
static func _noctissa(enemy: Enemy) -> void:
	var n: int = s(&"noctissa")
	if n > 0:
		enemy.status.wound(3.0 + 2.0 * n, 2.0 + 0.5 * n)


## Lilith: below full Health, hits on elites and bosses steal 2.5% per stack;
## from Lv 2, healing past full becomes a blood shield; from Lv 4 every enemy
## can be drained.
static func _lilith(enemy: Enemy, hit: Hit) -> void:
	var n: int = s(&"lilith")
	if n <= 0 or Game.health >= Game.max_health:
		return
	if not enemy.is_elite() and BoonCatalog.rank(&"lilith") < 3:
		return
	var amount: float = hit.damage * 0.025 * n
	var room: float = Game.max_health - Game.health
	Game.heal(amount)
	if n >= 2 and amount > room:
		Game.add_shield(amount - room)


## Vespera: impacts split into one mirror shard per stack, each cutting a
## nearby enemy for 30% of the hit (50% from Lv 7).
static func _vespera(enemy: Enemy, hit: Hit) -> void:
	var n: int = s(&"vespera")
	if n <= 0:
		return
	var share: float = 0.5 if BoonCatalog.rank(&"vespera") >= 4 else 0.3
	var from: Vector2 = enemy.center()
	for other: Enemy in nearest(enemy.get_tree(), from, n, SHARD_RANGE, [enemy]):
		Game.fx(&"mirror", other.center(), BoonCatalog.color(&"vespera"), 0.7)
		side_hit(other, hit.damage * share, &"shard", from)


## Aurelia: kills may drop a coin of temporary wealth (35%). Lv 2: two
## coins. Lv 7 Golden Touch: every kill pays.
static func _aurelia(enemy: Enemy) -> void:
	var n: int = s(&"aurelia")
	if n <= 0 or not enemy.dead:
		return
	var rank: int = BoonCatalog.rank(&"aurelia")
	if rank < 4 and Game.rng.randf() >= 0.35:
		return
	Game.wealth += 2 if rank >= 2 else 1
	Game.fx(&"sparkle", enemy.center(), BoonCatalog.color(&"aurelia"), 1.2)


## Nerissa: a hit may charm its target for a few seconds.
static func _charm(enemy: Enemy, stats: BoltStats) -> void:
	if stats.charm_chance > 0.0 and Game.rng.randf() < stats.charm_chance:
		enemy.status.charm(2.0 + 0.5 * s(&"nerissa"))


## Roxyne Lv 2: hitting an isolated enemy marks it as hunted for the room,
## so it keeps her bonus even once it reaches its friends.
static func _roxyne(enemy: Enemy) -> void:
	if BoonCatalog.rank(&"roxyne") >= 2 and not enemy.status.has_mark(&"hunt") and is_isolated(enemy):
		enemy.status.mark(&"hunt")
		Game.fx(&"sparkle", enemy.center(), BoonCatalog.color(&"roxyne"), 0.8)
