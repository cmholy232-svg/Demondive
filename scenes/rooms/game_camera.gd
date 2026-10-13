class_name GameCamera
extends Camera2D
## Fixed room camera that owns impact feel: hit pause and a short directional
## camera kick, scaled in four tiers from footstep to boss kill.

enum Tier { STEP = 1, HIT = 2, HEAVY = 3, BOSS = 4 }

const GROUP: StringName = &"game_camera"
## Index by Tier. Hit pause in seconds, camera kick in pixels.
const HIT_PAUSE: Array[float] = [0.0, 0.0, 0.03, 0.06, 0.09]
const KICK: Array[float] = [0.0, 1.5, 3.0, 7.0, 13.0]
const KICK_DECAY: float = 18.0

static var shake_enabled: bool = true
static var hit_pause_enabled: bool = true

var _kick: Vector2 = Vector2.ZERO
var _wobble_time: float = 0.0
var _pause_until_msec: int = 0
var _last_usec: int = 0


func _ready() -> void:
	add_to_group(GROUP)
	process_mode = Node.PROCESS_MODE_ALWAYS


static func impact_in(tree: SceneTree, tier: Tier, direction: Vector2 = Vector2.ZERO) -> void:
	var camera: GameCamera = tree.get_first_node_in_group(GROUP) as GameCamera
	if camera != null:
		camera.impact(tier, direction)


func impact(tier: Tier, direction: Vector2 = Vector2.ZERO) -> void:
	if shake_enabled:
		var push: Vector2 = direction.normalized() if direction != Vector2.ZERO else Vector2.DOWN
		_kick += push * KICK[tier]
		_wobble_time = 0.0
	if hit_pause_enabled and HIT_PAUSE[tier] > 0.0:
		_pause_until_msec = maxi(_pause_until_msec, Time.get_ticks_msec() + int(HIT_PAUSE[tier] * 1000.0))
		Engine.time_scale = 0.0


func _process(delta: float) -> void:
	if _pause_until_msec > 0 and Time.get_ticks_msec() >= _pause_until_msec:
		_pause_until_msec = 0
		Engine.time_scale = 1.0
	var now: int = Time.get_ticks_usec()
	var real_delta: float = minf(0.1, float(now - _last_usec) / 1000000.0) if _last_usec > 0 else delta
	_last_usec = now
	_wobble_time += real_delta
	_kick = _kick.lerp(Vector2.ZERO, clampf(KICK_DECAY * real_delta, 0.0, 1.0))
	var wobble := Vector2(sin(_wobble_time * 79.3), sin(_wobble_time * 96.1 + 1.1)) * _kick.length() * 0.3
	offset = _kick + wobble


func _exit_tree() -> void:
	Engine.time_scale = 1.0
