class_name Siren
extends Enemy
## Belladonna's hungry guest: lunges far when Milo keeps his distance.


func _setup() -> void:
	kind = &"siren"
	size = Vector2(66.0, 138.0)
	max_health = 78.0
	contact_damage = 15.0


func _think(delta: float) -> void:
	apply_gravity(delta)
	if think_timer <= 0.0 and is_on_floor():
		var far: bool = distance_to_milo() > 260.0
		velocity.x = facing * (680.0 if far else 420.0)
		velocity.y = -300.0 if far else 0.0
		set_pose(&"attack", 0.42)
		think_timer = rng.randf_range(1.5, 1.9)
	elif pose_timer <= 0.0:
		walk(facing, 840.0, 210.0, delta)
