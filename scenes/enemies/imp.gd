class_name Imp
extends Enemy
## Chaser: scurries at Milo, crouches for a beat, then hops at him.

var _windup: float = 0.0


func _setup() -> void:
	kind = &"imp"
	size = Vector2(52.0, 88.0)
	max_health = 36.0
	contact_damage = 10.0


func _think(delta: float) -> void:
	apply_gravity(delta)
	if _windup > 0.0:
		_windup -= delta
		velocity.x = move_toward(velocity.x, 0.0, 2000.0 * delta)
		if _windup <= 0.0:
			velocity = Vector2(facing * 300.0, -780.0)
			set_pose(&"attack", 0.45)
			think_timer = rng.randf_range(1.5, 2.6)
		return
	if is_on_floor() and think_timer <= 0.0 and distance_to_milo() < 520.0:
		_windup = 0.25
		set_pose(&"windup", 0.25)
		return
	if pose_timer <= 0.0 or not is_on_floor():
		walk(facing, 520.0, 125.0, delta)
