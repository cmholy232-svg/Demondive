class_name Hit
extends RefCounted
## One packet of damage from Milo to an enemy, with everything boons add to it.

var damage: float = 0.0
var direction: Vector2 = Vector2.RIGHT
var knockback: float = 0.0
var critical: bool = false
## Seconds of burn and its damage per second (Pyrra).
var burn_seconds: float = 0.0
var burn_dps: float = 0.0
## Short stun in seconds.
var stun_seconds: float = 0.0
## Where the damage came from, for boon hooks ("bolt", "special", "burn", "blast").
var source: StringName = &"bolt"


static func make(amount: float, from_direction: Vector2, push: float = 0.0) -> Hit:
	var hit := Hit.new()
	hit.damage = amount
	hit.direction = from_direction.normalized() if from_direction != Vector2.ZERO else Vector2.RIGHT
	hit.knockback = push
	return hit
