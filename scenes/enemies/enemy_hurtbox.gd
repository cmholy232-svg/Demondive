class_name EnemyHurtbox
extends Area2D
## The part of an enemy that Milo's bolts and Specials hit.

var enemy: Enemy


func _ready() -> void:
	collision_layer = PhysicsLayers.ENEMIES
	collision_mask = 0
	monitoring = false


func take_hit(hit: Hit) -> void:
	if enemy != null:
		enemy.take_hit(hit)
