class_name BoonEffectsMore
extends RefCounted
## Bolt numbers for the boon-givers met after the Neon Maw. Each line matches
## the boon's card; tests/test_boons.gd checks them.

## Calyptra's power bands: damage multiplier for low, even, high and Jackpot.
const BANDS: Array[float] = [0.85, 1.0, 1.25, 2.5]
const JACKPOT_DOUBLE_AT: int = 4


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
## power band. Stacks tilt the odds toward the high bands.
static func _calyptra(stats: BoltStats) -> void:
	var n: int = s(&"calyptra")
	if n <= 0:
		return
	stats.crit_multiplier += 0.08 * n
	stats.band = roll_band(Game.rng, n)
	stats.damage *= BANDS[stats.band]
	if stats.band == 3:
		stats.radius *= 1.4
		stats.color = Color(1.0, 0.85, 0.3)
		if n >= JACKPOT_DOUBLE_AT and Game.rng.randf() < 0.25:
			stats.damage *= 2.0


static func band_weights(n: int) -> Array[float]:
	var tilt: float = 3.0 * n
	return [maxf(5.0, 30.0 - tilt), 40.0, 30.0 + tilt, 2.0 + n]


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


## Isolde: +12% range per stack; bolts ricochet once per stack.
static func _isolde(stats: BoltStats) -> void:
	var n: int = s(&"isolde")
	stats.life *= 1.0 + 0.12 * n
	stats.bounces += n


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
