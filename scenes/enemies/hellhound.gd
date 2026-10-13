class_name Hellhound
extends Enemy
## Charger: paces toward Milo, crouches, then lunges low and fast.

var _windup: float = 0.0


func _setup() -> void:
	kind = &"hellhound"
	size = Vector2(100.0, 80.0)
	max_health = 68.0
	contact_damage = 13.0


func _think(delta: float) -> void:
	apply_gravity(delta)
	if _windup > 0.0:
		_windup -= delta
		velocity.x = move_toward(velocity.x, 0.0, 3000.0 * delta)
		if _windup <= 0.0:
			velocity = Vector2(facing * 760.0, -260.0)
			set_pose(&"attack", 0.5)
			think_timer = rng.randf_range(1.6, 2.2)
		return
	if think_timer <= 0.0 and is_on_floor() and distance_to_milo() < 700.0:
		_windup = 0.45
		set_pose(&"windup", 0.45)
		return
	if pose_timer <= 0.0:
		walk(facing, 720.0, 170.0, delta)
