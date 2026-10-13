class_name Floater
extends Enemy
## Flying shooter: bobs above Milo's head and spits slow aimed orbs.

var _bob: float = 0.0


func _setup() -> void:
	kind = &"floater"
	size = Vector2(92.0, 80.0)
	max_health = 44.0
	contact_damage = 9.0
	flies = true


func _think(delta: float) -> void:
	_bob += delta
	var target: Milo = milo()
	if target == null:
		return
	var goal := Vector2(target.global_position.x - facing * 260.0, target.global_position.y - 260.0 + sin(_bob * 2.4) * 45.0)
	var to_goal: Vector2 = goal - global_position
	velocity = velocity.lerp(to_goal.limit_length(1.0) * minf(to_goal.length() * 1.6, 220.0), clampf(2.0 * delta, 0.0, 1.0))
	if think_timer <= 0.0:
		if attack_pose != &"windup":
			set_pose(&"windup", 0.4)
			think_timer = 0.4
			return
		shoot(aim_at_milo(center()), 360.0, 9.0, Color(0.71, 0.42, 1.0))
		set_pose(&"attack", 0.3)
		think_timer = rng.randf_range(1.6, 2.1)
