class_name Diver
extends Enemy
## Skirmisher: hovers off to one side above Milo, shivers, then swoops along
## a straight line through where he was and climbs back out.

var _dive: Vector2 = Vector2.ZERO
var _dive_left: float = 0.0
var _bob: float = 0.0


func _setup() -> void:
	kind = &"diver"
	size = Vector2(96.0, 60.0)
	max_health = 40.0
	contact_damage = 12.0
	flies = true


func _think(delta: float) -> void:
	_bob += delta
	var target: Milo = milo()
	if target == null:
		return
	if _dive_left > 0.0:
		_dive_left -= delta
		velocity = _dive
		if is_on_wall() or is_on_floor():
			_dive_left = 0.0
		return
	var goal := Vector2(target.global_position.x - facing * 340.0, target.global_position.y - 300.0 + sin(_bob * 3.0) * 30.0)
	var to_goal: Vector2 = goal - global_position
	velocity = velocity.lerp(to_goal.limit_length(1.0) * minf(to_goal.length() * 2.0, 300.0 * speed_scale), clampf(3.0 * delta, 0.0, 1.0))
	if think_timer > 0.0:
		return
	if attack_pose != &"windup":
		set_pose(&"windup", 0.5)
		think_timer = 0.5
		velocity *= 0.2
		return
	_dive = aim_at_milo(global_position) * 820.0 * speed_scale
	_dive_left = 0.75
	set_pose(&"attack", 0.75)
	think_timer = rng.randf_range(1.8, 2.6)
