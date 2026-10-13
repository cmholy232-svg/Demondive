class_name Milo
extends CharacterBody2D
## Placeholder Milo for Milestone 0: stands in the room under gravity.
## The movement kit arrives in Milestone 1.

## Milo is 256 px tall in game at 1280x720.
const HEIGHT: float = 256.0

@export var gravity: float = 2350.0
@export var fall_speed_cap: float = 1200.0


func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y = minf(velocity.y + gravity * delta, fall_speed_cap)
	velocity.x = 0.0
	move_and_slide()
	Debug.watch("debug.player_position", position.round())
	Debug.watch("debug.player_velocity", velocity.round())
	Debug.watch("debug.on_floor", is_on_floor())
