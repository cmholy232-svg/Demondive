class_name BoonEffects
extends RefCounted
## Turns the run's boon stacks (Game.boons) into numbers: the bolt Milo
## casts, his passives, and what pickups do. Every number here matches the
## boon's card in the strings file; tests/test_boons.gd checks them.

const MARIS_HEALTH_PER_STACK: float = 10.0
const ARMOR_CAP: float = 0.6
const WEALTH_POWER_CAP: float = 0.3


static func s(id: StringName) -> int:
	return Game.stacks(id)


static func bolt_stats(base: ArcaneTuning) -> BoltStats:
	var stats := BoltStats.new()
	stats.damage = base.damage * (1.0 + Upgrades.value(&"kindling"))
	stats.speed = base.projectile_speed
	stats.radius = base.radius
	stats.life = base.projectile_life_seconds
	_apply_pyrra(stats)
	_apply_maris(stats)
	_apply_gaia(stats)
	_apply_zephyra(stats)
	BoonEffectsMore.apply(stats)
	stats.damage *= (1.0 + Game.room_damage_bonus + Game.corruption + wealth_power()) * RoomRules.milo_damage()
	stats.damage *= low_health_bonus()
	var dominant: StringName = Game.dominant_boon()
	if dominant != &"":
		stats.color = BoonCatalog.color(dominant)
	for id: StringName in Game.boon_ids():
		if id != dominant:
			stats.trail_colors.append(BoonCatalog.color(id))
	return stats


## Pyrra: +10% Magic damage per stack; hits ignite; repeats extend the burn
## and trigger small explosions.
static func _apply_pyrra(stats: BoltStats) -> void:
	var n: int = s(&"pyrra")
	if n <= 0:
		return
	stats.damage *= 1.0 + 0.1 * n
	stats.burn_dps = 4.0 + 2.5 * n
	stats.burn_seconds = 2.0 + 0.5 * n
	if n >= 2:
		stats.blast_damage = 8.0 + 4.0 * n
		stats.blast_radius = 70.0 + (30.0 if n >= 4 else 0.0)


## Maris: bolts grow larger and push enemies farther; later stacks add pierce.
static func _apply_maris(stats: BoltStats) -> void:
	var n: int = s(&"maris")
	if n <= 0:
		return
	stats.radius *= 1.0 + 0.16 * n
	stats.knockback *= 1.0 + 0.22 * n
	stats.pierce += int(floor(n * 0.5))


## Gaia: bolts become heavier, slower, larger and much more damaging.
static func _apply_gaia(stats: BoltStats) -> void:
	var n: int = s(&"gaia")
	if n <= 0:
		return
	stats.damage *= 1.0 + 0.16 * n
	stats.radius *= 1.0 + 0.3 * n
	stats.speed *= maxf(0.5, 1.0 - 0.08 * n)
	stats.knockback *= 1.0 + 0.15 * n
	if n >= 4:
		stats.stun_seconds = 0.2


## Zephyra: smaller, faster, piercing bolts; every third stack adds an angled needle.
static func _apply_zephyra(stats: BoltStats) -> void:
	var n: int = s(&"zephyra")
	if n <= 0:
		return
	stats.speed *= 1.0 + 0.14 * n
	stats.radius *= maxf(0.55, 1.0 - 0.08 * n)
	stats.pierce += n
	stats.split += int(floor(n / 3.0))
	if n >= 2:
		stats.split = maxi(stats.split, 1)


static func cast_cooldown(base: ArcaneTuning) -> float:
	var rate: float = 1.0 + Upgrades.value(&"cadence") + 0.08 * s(&"zephyra")
	return base.cooldown_seconds / rate


## Gaia's armor: +8% per stack; Crya adds 8% per stack while any enemy is
## slowed, frozen, charmed, rooted or stunned. Capped so Milo can always be hurt.
static func armor() -> float:
	var total: float = 0.08 * s(&"gaia")
	if s(&"crya") > 0 and BoonHooks.any_controlled(Game.get_tree()):
		total += 0.08 * s(&"crya")
	return minf(ARMOR_CAP, total)


## Lilith: up to +18% damage per stack as Health falls to nothing.
static func low_health_bonus() -> float:
	if s(&"lilith") <= 0 or Game.max_health <= 0.0:
		return 1.0
	return 1.0 + 0.18 * s(&"lilith") * (1.0 - clampf(Game.health / Game.max_health, 0.0, 1.0))


## Aurelia: banked wealth turns into damage, 1% per coin (more with stacks), capped.
static func wealth_power() -> float:
	var n: int = s(&"aurelia")
	if n <= 0:
		return 0.0
	return minf(WEALTH_POWER_CAP, Game.wealth * 0.01 * (1.0 + 0.25 * (n - 1)))


## Somnia: hurt stagger and knockback shrink 10% per stack.
static func hurt_recovery() -> float:
	return maxf(0.4, 1.0 - 0.1 * s(&"somnia"))


## Vespera: seconds after a dash that a hit still counts as a Perfect Dodge.
static func dodge_grace() -> float:
	return 0.05 * s(&"vespera")


## Seraphine: shield size and regeneration per second.
static func shield_max() -> float:
	return 0.0 if s(&"seraphine") <= 0 else 8.0 + 4.0 * s(&"seraphine")


static func shield_regen() -> float:
	return 0.5 + 0.25 * s(&"seraphine")


static func move_speed_multiplier() -> float:
	var bonus: float = Upgrades.value(&"traction")
	var appetite: int = s(&"belladonna")
	if appetite > 0:
		bonus += minf(0.28, Game.appetite_buffs.size() * (0.025 + appetite * 0.006))
	return 1.0 + bonus


static func shard_bonus() -> float:
	return 0.15 * s(&"aurelia")


static func pickup_magnet() -> float:
	return 90.0 + Upgrades.value(&"magnet") + 55.0 * s(&"nerissa")


static func special_cost(id: StringName) -> float:
	var discount: float = Upgrades.value(&"ritual") + 0.08 * s(&"luna")
	return BoonCatalog.special_cost(id) * maxf(0.4, 1.0 - discount)


## Energy restored when a bolt hits.
static func energy_on_hit() -> float:
	return 1.2 + 1.0 * s(&"voltara")
