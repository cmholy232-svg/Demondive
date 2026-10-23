extends Node2D
## Placeholder look and feel for Milo: body, facing, casting hand, dash
## afterimages, invulnerability flicker, squash, sounds and camera kicks.
## Reads Milo's state; never changes it.

const BODY_SIZE: Vector2 = Vector2(48.0, 128.0)
const BODY_COLOR: Color = Color(0.36, 0.78, 0.55)
const DASH_COLOR: Color = Color(0.45, 0.95, 1.0)
const AFTERIMAGE_SECONDS: float = 0.2
const HARD_LANDING_SPEED: float = 700.0

var _squash: float = 0.0
var _afterimages: Array[Dictionary] = []

@onready var milo: Milo = get_parent() as Milo
@onready var caster: ArcaneCaster = milo.get_node("ArcaneCaster") as ArcaneCaster


func _ready() -> void:
	milo.jumped.connect(_on_jumped)
	milo.dashed.connect(_on_dashed)
	milo.wavelanded.connect(_on_wavelanded)
	milo.landed.connect(_on_landed)


func _process(delta: float) -> void:
	_squash = move_toward(_squash, 0.0, 6.0 * delta)
	for image: Dictionary in _afterimages:
		image["age"] = float(image["age"]) + delta
	_afterimages = _afterimages.filter(func(image: Dictionary) -> bool: return float(image["age"]) < AFTERIMAGE_SECONDS)
	if milo.is_dashing() and Engine.get_process_frames() % 2 == 0:
		_afterimages.append({"position": milo.global_position, "age": 0.0})
	queue_redraw()


func _draw() -> void:
	for image: Dictionary in _afterimages:
		var fade: float = 1.0 - float(image["age"]) / AFTERIMAGE_SECONDS
		var local: Vector2 = to_local(image["position"] as Vector2)
		draw_rect(_body_rect(local, 0.0), Color(DASH_COLOR, 0.35 * fade))
	var color: Color = DASH_COLOR if milo.is_dashing() or milo.is_wave_sliding() else BODY_COLOR
	if milo.is_invulnerable() and Engine.get_process_frames() % 6 < 3:
		color.a = 0.55
	var body: Rect2 = _body_rect(Vector2.ZERO, _squash)
	draw_rect(body, color)
	# Eye on the facing side so direction reads at a glance.
	var eye_x: float = body.position.x + body.size.x * (0.72 if milo.facing > 0 else 0.28)
	draw_rect(Rect2(eye_x - 5.0, body.position.y + 20.0, 10.0, 10.0), Color(0.08, 0.1, 0.12))
	# Casting hand follows the current aim.
	draw_circle(caster.position, 9.0, Color(1.0, 0.55, 0.2))
	draw_line(caster.position, caster.position + caster.aim * 14.0, Color(1.0, 0.8, 0.5), 3.0)


func _body_rect(origin: Vector2, squash: float) -> Rect2:
	var size := Vector2(BODY_SIZE.x * (1.0 + squash * 0.25), BODY_SIZE.y * (1.0 - squash * 0.2))
	return Rect2(origin + Vector2(-size.x * 0.5, -size.y), size)


func _on_jumped(is_air_jump: bool) -> void:
	_squash = -0.6
	Audio.play_sfx(&"milo_double_jump" if is_air_jump else &"milo_jump", -4.0)


func _on_dashed(direction: Vector2) -> void:
	Audio.play_sfx(&"milo_dash", -2.0)
	GameCamera.impact_in(get_tree(), GameCamera.Tier.STEP, direction)


func _on_wavelanded(_is_wavedash: bool) -> void:
	_squash = 0.8
	Audio.play_sfx(&"milo_waveland", -2.0)
	GameCamera.impact_in(get_tree(), GameCamera.Tier.STEP, Vector2.DOWN)


func _on_landed(impact_speed: float) -> void:
	_squash = clampf(impact_speed / 1400.0, 0.2, 0.9)
	Audio.play_sfx(&"milo_land", -8.0)
	if impact_speed >= HARD_LANDING_SPEED:
		GameCamera.impact_in(get_tree(), GameCamera.Tier.STEP, Vector2.DOWN)

