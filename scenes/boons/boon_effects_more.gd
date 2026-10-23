class_name BoonEffectsMore
extends RefCounted
## Bolt numbers for the boon-givers met after the Neon Maw. Each line matches
## the boon's card; tests/test_boons.gd checks them.

## Calyptra's power bands: damage multiplier for low, even, high and Jackpot.
const BANDS: Array[float] = [0.85, 1.0, 1.25, 2.5]
## Jackpot colour; low and high rolls dim or brighten the bolt so every shot
## shows its roll.
const JACKPOT_COLOR: Color = Color(1.0, 0.85, 0.3)
const ALL_PIERCE: int = 99
## Isolde Lv 2: +15% damage per ricochet.
const PRISM: float = 0.15


static func s(id: StringName) -> int:
	return Game.stacks(id)


static func apply(stats: BoltStats) -> void:
	_flora(stats)
	_calyptra(stats)
	_isolde(stats)
	_solara(stats)
	_nerissa(stats)


## Flora: +6% critical chance per stack.
static func _flora(stats: BoltStats) -> void:
	stats.crit_chance += 0.06 * s(&"flora")


## Calyptra: +8% critical damage per stack, and every cast rolls a visible
## power band. Stacks tilt the odds toward the high bands. Lv 2 Hot Hand:
## Jackpots pierce everything. Lv 4 Double Down: a Jackpot may double.
## Lv 7 House Edge: no more low rolls, and Jackpots twice as likely.
static func _calyptra(stats: BoltStats) -> void:
	var n: int = s(&"calyptra")
	if n <= 0:
		return
	var rank: int = BoonCatalog.rank(&"calyptra")
	stats.crit_multiplier += 0.08 * n
	stats.band = roll_band(Game.rng, n)
	stats.damage *= BANDS[stats.band]
	if stats.band == 3:
		stats.radius *= 1.4
		if rank >= 2:
			stats.pierce = maxi(stats.pierce, ALL_PIERCE)
		if rank >= 3 and Game.rng.randf() < 0.25:
			stats.damage *= 2.0


## Shows Calyptra's roll on the bolt itself, after the dominant boon's colour.
static func tint_band(stats: BoltStats) -> void:
	if s(&"calyptra") <= 0:
		return
	match stats.band:
		0:
			stats.color = stats.color.darkened(0.45)
		2:
			stats.color = stats.color.lightened(0.4)
		3:
			stats.color = JACKPOT_COLOR


static func band_weights(n: int) -> Array[float]:
	var tilt: float = 3.0 * n
	var weights: Array[float] = [maxf(5.0, 30.0 - tilt), 40.0, 30.0 + tilt, 2.0 + n]
	if BoonCatalog.rank_at(&"calyptra", n) >= 4:
		weights[0] = 0.0
		weights[3] *= 2.0
	return weights


static func roll_band(rng: RandomNumberGenerator, n: int) -> int:
	var weights: Array[float] = band_weights(n)
	var total: float = 0.0
	for w: float in weights:
		total += w
	var roll: float = rng.randf() * total
	for i: int in weights.size():
		roll -= weights[i]
		if roll <= 0.0:
			return i
	return 1


## Isolde: +12% range per stack; bolts ricochet once per stack. Lv 2 Prism:
## each ricochet adds damage. Lv 7 Refraction: enemy ricochets split.
static func _isolde(stats: BoltStats) -> void:
	var n: int = s(&"isolde")
	stats.life *= 1.0 + 0.12 * n
	stats.bounces += n
	var rank: int = BoonCatalog.rank(&"isolde")
	if rank >= 2:
		stats.bounce_growth = PRISM
	stats.refract = rank >= 4


## Solara: narrow, fast, piercing lances.
static func _solara(stats: BoltStats) -> void:
	var n: int = s(&"solara")
	if n <= 0:
		return
	stats.radius *= 0.8
	stats.speed *= 1.25
	stats.pierce += 1 + n / 2


## Nerissa: bolts bend toward targets and may charm what they hit.
static func _nerissa(stats: BoltStats) -> void:
	var n: int = s(&"nerissa")
	if n <= 0:
		return
	stats.homing = 1.5 + 1.0 * n
	stats.charm_chance = minf(0.5, 0.08 * n)
