class_name Succubus
extends Enemy
## Ranged support: keeps her distance, then fires a quick aimed kiss of flame.


func _setup() -> void:
	kind = &"succubus"
	size = Vector2(64.0, 96.0)
	max_health = 55.0
	contact_damage = 10.0


func _think(delta: float) -> void:
	apply_gravity(delta)
	var distance: float = distance_to_milo()
	var away: int = -facing if distance < 360.0 else (facing if distance > 640.0 else 0)
	if pose_timer <= 0.0 and away != 0:
		walk(away, 600.0, 130.0, delta)
	else:
		velocity.x = move_toward(velocity.x, 0.0, 900.0 * delta)
	if think_timer <= 0.0:
		if attack_pose != &"windup":
			set_pose(&"windup", 0.38)
			think_timer = 0.38
			return
		shoot(aim_at_milo(center()), 430.0, 10.0, Color(1.0, 0.48, 0.27))
		set_pose(&"attack", 0.34)
		think_timer = rng.randf_range(1.5, 1.9)
