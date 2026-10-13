class_name BoltStats
extends RefCounted
## Everything one Arcane Bolt carries, worked out from the run's boons at
## the moment of the cast.

var damage: float = 17.0
var speed: float = 780.0
var radius: float = 10.0
var life: float = 1.6
var pierce: int = 0
var knockback: float = 140.0
## Extra angled bolts fired with each cast.
var split: int = 0
var burn_dps: float = 0.0
var burn_seconds: float = 0.0
## Explosion on hitting a burning enemy (Pyrra 2+).
var blast_damage: float = 0.0
var blast_radius: float = 0.0
var stun_seconds: float = 0.0
var crit_chance: float = 0.05
var crit_multiplier: float = 1.75
## Radians per second the bolt turns toward the nearest enemy (Nerissa).
var homing: float = 0.0
## Wall and enemy ricochets left (Isolde).
var bounces: int = 0
## Chance a hit charms its target (Nerissa).
var charm_chance: float = 0.0
## Calyptra's power band for this cast: 0 low, 1 even, 2 high, 3 Jackpot.
var band: int = 1
## A harmless decoy (Somnia's Velvet Feint).
var decoy: bool = false
var color: Color = Color(0.8, 0.6, 1.0)
var trail_colors: Array[Color] = []


func duplicate_stats() -> BoltStats:
	var copy := BoltStats.new()
	for prop: Dictionary in get_property_list():
		if prop["usage"] & PROPERTY_USAGE_SCRIPT_VARIABLE:
			copy.set(prop["name"], get(prop["name"]))
	copy.trail_colors = trail_colors.duplicate()
	return copy


func make_hit(direction: Vector2, rng: RandomNumberGenerator) -> Hit:
	var hit := Hit.make(damage, direction, knockback)
	hit.critical = rng.randf() < crit_chance
	if hit.critical:
		hit.damage *= crit_multiplier
	hit.burn_dps = burn_dps
	hit.burn_seconds = burn_seconds
	hit.stun_seconds = stun_seconds
	return hit
