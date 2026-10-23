class_name Drone
extends Enemy
## Security drone: hangs off to one side of Milo, darts to a new spot, then
## fires a three-way spread. Faster and twitchier than a floater.

var _hold: Vector2 = Vector2(320.0, -240.0)
var _dart: float = 0.0


func _setup() -> void:
	kind = &"drone"
	size = Vector2(80.0, 64.0)
	max_health = 34.0
	contact_damage = 8.0
	flies = true


func _think(delta: float) -> void:
	var target: Milo = milo()
	if target == null:
		return
	_dart -= delta
	if _dart <= 0.0:
		_dart = rng.randf_range(1.1, 1.8)
		_hold = Vector2(rng.randf_range(240.0, 420.0) * (1.0 if rng.randf() < 0.5 else -1.0), rng.randf_range(-320.0, -180.0))
	var goal: Vector2 = target.global_position + _hold
	var to_goal: Vector2 = goal - global_position
	velocity = velocity.lerp(to_goal.limit_length(1.0) * minf(to_goal.length() * 3.0, 520.0), clampf(4.0 * delta, 0.0, 1.0))
	if think_timer > 0.0:
		return
	if attack_pose != &"windup":
		set_pose(&"windup", 0.35)
		think_timer = 0.35
		return
	var aim: Vector2 = aim_at_milo(center())
	for turn: float in [-0.22, 0.0, 0.22]:
		shoot(aim.rotated(turn), 430.0, 7.0, Color(0.35, 0.9, 1.0), 9.0)
	set_pose(&"attack", 0.3)
	think_timer = rng.randf_range(1.9, 2.5)
