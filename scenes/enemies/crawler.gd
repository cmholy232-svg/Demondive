class_name Crawler
extends Enemy
## Heavy charger: a long, slow rev-up, then a straight rush that crosses the room.

var _windup: float = 0.0
var _rush: float = 0.0


func _setup() -> void:
	kind = &"crawler"
	size = Vector2(122.0, 90.0)
	max_health = 92.0
	contact_damage = 16.0
	knock_taken = 0.5
	shards_dropped = 2


func _think(delta: float) -> void:
	apply_gravity(delta)
	if _windup > 0.0:
		_windup -= delta
		velocity.x = move_toward(velocity.x, 0.0, 2000.0 * delta)
		if _windup <= 0.0:
			_rush = 0.9
			velocity.x = facing * 680.0
			set_pose(&"attack", 0.9)
		return
	if _rush > 0.0:
		_rush -= delta
		if is_on_wall():
			_rush = 0.0
			GameCamera.impact_in(get_tree(), GameCamera.Tier.HIT, Vector2(facing, 0.0))
		return
	if think_timer <= 0.0 and is_on_floor():
		_windup = 0.7
		set_pose(&"windup", 0.7)
		think_timer = rng.randf_range(2.2, 2.8)
		return
	walk(facing, 680.0, 160.0, delta)
