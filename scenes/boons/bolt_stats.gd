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
var color: Color = Color(0.8, 0.6, 1.0)
var trail_colors: Array[Color] = []


func make_hit(direction: Vector2, rng: RandomNumberGenerator) -> Hit:
	var hit := Hit.make(damage, direction, knockback)
	hit.critical = rng.randf() < crit_chance
	if hit.critical:
		hit.damage *= crit_multiplier
	hit.burn_dps = burn_dps
	hit.burn_seconds = burn_seconds
	hit.stun_seconds = stun_seconds
	return hit
