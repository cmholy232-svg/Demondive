class_name Bouncer
extends Enemy
## The club's bouncer: a big, slow brute that shrugs off knockback, plants
## his feet, and shoulder-charges across the floor. Jump or dash through.

const CHARGE_SPEED: float = 880.0
const CHARGE_SECONDS: float = 0.55

var _windup: float = 0.0
var _charge: float = 0.0


func _setup() -> void:
	kind = &"bouncer"
	size = Vector2(110.0, 150.0)
	max_health = 170.0
	contact_damage = 16.0
	knock_taken = 0.3
	shards_dropped = 4


func _think(delta: float) -> void:
	apply_gravity(delta)
	if _charge > 0.0:
		_charge -= delta
		velocity.x = facing * CHARGE_SPEED * speed_scale
		if _charge <= 0.0 or is_on_wall():
			_charge = 0.0
			velocity.x = 0.0
			think_timer = rng.randf_range(1.4, 2.0)
			if is_on_wall():
				GameCamera.impact_in(get_tree(), GameCamera.Tier.HEAVY, Vector2(facing, 0.0))
		return
	if _windup > 0.0:
		_windup -= delta
		velocity.x = move_toward(velocity.x, 0.0, 3000.0 * delta)
		if _windup <= 0.0:
			_charge = CHARGE_SECONDS
			set_pose(&"attack", CHARGE_SECONDS)
		return
	var target: Milo = milo()
	if target != null and think_timer <= 0.0 and is_on_floor() and distance_to_milo() < 760.0 \
			and absf(target.global_position.y - global_position.y) < 160.0:
		_windup = 0.6
		set_pose(&"windup", 0.6)
		return
	if pose_timer <= 0.0:
		walk(facing, 600.0, 110.0, delta)
