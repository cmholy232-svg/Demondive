class_name GameCamera
extends Camera2D
## The fight camera. In follow mode it tracks Milo through big rooms with a
## little look-ahead, clamped to the room. It also owns impact feel: hit
## pause and a short directional kick, in four tiers from footstep to boss kill.

enum Tier { STEP = 1, HIT = 2, HEAVY = 3, BOSS = 4 }

const GROUP: StringName = &"game_camera"
## Index by Tier. Hit pause in seconds, camera kick in pixels.
const HIT_PAUSE: Array[float] = [0.0, 0.0, 0.03, 0.06, 0.09]
const KICK: Array[float] = [0.0, 1.5, 3.0, 7.0, 13.0]
const KICK_DECAY: float = 18.0
## How much of the world is visible vertically in follow mode, in pixels.
const VIEW_HEIGHT: float = 640.0
const LOOK_AHEAD: float = 170.0
const FOLLOW_SPEED: float = 6.0

static var shake_enabled: bool = true
static var hit_pause_enabled: bool = true

var follow_mode: bool = false
var target: Node2D
## Optional second subject (a boss) the camera leans toward to keep both in frame.
var focus: Node2D
var bounds: Rect2 = Rect2(0.0, 0.0, 1280.0, 720.0)
var _kick: Vector2 = Vector2.ZERO
var _wobble_time: float = 0.0
var _pause_until_msec: int = 0
var _last_usec: int = 0
var _look: float = 0.0


func _ready() -> void:
	add_to_group(GROUP)
	process_mode = Node.PROCESS_MODE_ALWAYS
	if follow_mode:
		anchor_mode = Camera2D.ANCHOR_MODE_DRAG_CENTER
		zoom = Vector2.ONE * (720.0 / VIEW_HEIGHT)
		make_current()


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


func set_room_bounds(rect: Rect2) -> void:
	bounds = rect


## Size of the visible world area in pixels.
func view_size() -> Vector2:
	return get_viewport_rect().size / zoom


## Jumps straight to the target (on room entry).
func snap() -> void:
	if target != null:
		global_position = _clamped(_goal())
	reset_physics_interpolation()


func _goal() -> Vector2:
	var milo := target as Milo
	if milo != null:
		_look = lerpf(_look, milo.facing * LOOK_AHEAD, 0.05)
	var goal: Vector2 = target.global_position + Vector2(_look, -150.0)
	if focus != null and is_instance_valid(focus) and focus.is_inside_tree():
		var lean: Vector2 = (focus.global_position - target.global_position) * 0.45
		var limit: Vector2 = view_size() * Vector2(0.3, 0.2)
		goal += lean.clamp(-limit, limit)
	return goal


func _clamped(point: Vector2) -> Vector2:
	var half: Vector2 = view_size() * 0.5
	var lo: Vector2 = bounds.position + half
	var hi: Vector2 = bounds.end - half
	var out := Vector2(
		clampf(point.x, lo.x, maxf(lo.x, hi.x)) if hi.x > lo.x else bounds.get_center().x,
		clampf(point.y, lo.y, maxf(lo.y, hi.y)) if hi.y > lo.y else bounds.get_center().y)
	return out


func _process(delta: float) -> void:
	if _pause_until_msec > 0 and Time.get_ticks_msec() >= _pause_until_msec:
		_pause_until_msec = 0
		Engine.time_scale = 1.0
	var now: int = Time.get_ticks_usec()
	var real_delta: float = minf(0.1, float(now - _last_usec) / 1000000.0) if _last_usec > 0 else delta
	_last_usec = now
	if follow_mode and target != null and not get_tree().paused:
		var goal: Vector2 = _clamped(_goal())
		global_position = global_position.lerp(goal, clampf(FOLLOW_SPEED * real_delta, 0.0, 1.0))
	_wobble_time += real_delta
	_kick = _kick.lerp(Vector2.ZERO, clampf(KICK_DECAY * real_delta, 0.0, 1.0))
	var wobble := Vector2(sin(_wobble_time * 79.3), sin(_wobble_time * 96.1 + 1.1)) * _kick.length() * 0.3
	offset = _kick + wobble


func _exit_tree() -> void:
	Engine.time_scale = 1.0
