class_name Turret
extends Enemy
## Club security gun bolted to a floor or ledge: never moves, tracks Milo,
## paints him with a sight for a beat, then fires a three-round burst.
## Teaches Milo to break line or keep moving.

const BURST: int = 3
const BURST_GAP: float = 0.12
const RANGE: float = 1300.0

var _rounds: int = 0
var _gap: float = 0.0


func _setup() -> void:
	kind = &"turret"
	size = Vector2(76.0, 72.0)
	max_health = 58.0
	contact_damage = 8.0
	knock_taken = 0.0
	shards_dropped = 2


func _think(delta: float) -> void:
	apply_gravity(delta)
	velocity.x = 0.0
	if _rounds > 0:
		_gap -= delta
		if _gap <= 0.0:
			_rounds -= 1
			_gap = BURST_GAP
			shoot(aim_at_milo(center()), 560.0, 8.0, Color(1.0, 0.3, 0.35), 9.0)
			set_pose(&"attack", 0.15)
		return
	if think_timer > 0.0 or distance_to_milo() > RANGE:
		return
	if attack_pose != &"windup":
		set_pose(&"windup", 0.6)
		think_timer = 0.6
		return
	_rounds = BURST
	_gap = 0.0
	think_timer = rng.randf_range(1.8, 2.4)
