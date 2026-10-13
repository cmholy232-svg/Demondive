class_name TouchControls
extends CanvasLayer
## On-screen controls for phones and tablets: a floating stick on the left
## half and thumb buttons on the right. They press the same input actions as
## the keyboard and gamepad, so gameplay never knows the difference. They show
## on the first touch and hide again when a key or pad button is used.

const STICK_RADIUS: float = 110.0
const DEAD_ZONE: float = 0.35
## Button -> [action, centre as a fraction of the screen from the bottom right, radius px, label key].
const BUTTONS: Array[Array] = [
	[&"magic", Vector2(0.12, 0.2), 78.0, "touch.magic"],
	[&"jump", Vector2(0.25, 0.12), 70.0, "touch.jump"],
	[&"dash", Vector2(0.27, 0.32), 56.0, "touch.dash"],
	[&"special", Vector2(0.1, 0.45), 56.0, "touch.special"],
	[&"interact", Vector2(0.24, 0.52), 46.0, "touch.interact"],
	[&"pause", Vector2(0.05, 0.92), 36.0, "touch.pause"],
]

var _pad: Control
var _stick_finger: int = -1
var _stick_origin: Vector2 = Vector2.ZERO
var _stick_now: Vector2 = Vector2.ZERO
## Finger index -> action it is holding.
var _held: Dictionary = {}


func _ready() -> void:
	layer = 50
	process_mode = Node.PROCESS_MODE_ALWAYS
	_pad = Control.new()
	_pad.set_anchors_preset(Control.PRESET_FULL_RECT)
	_pad.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_pad.draw.connect(_draw_pad)
	add_child(_pad)
	visible = wanted()


static func wanted() -> bool:
	return DisplayServer.is_touchscreen_available() or OS.has_feature("mobile") or OS.has_feature("web_android") or OS.has_feature("web_ios")


func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch or event is InputEventScreenDrag:
		if not visible:
			visible = true
		_touch(event)
		_pad.queue_redraw()
	elif visible and (event is InputEventKey or event is InputEventJoypadButton) and event.is_pressed():
		_release_all()
		visible = false


func button_center(index: int) -> Vector2:
	var size: Vector2 = _pad.get_viewport_rect().size
	var spec: Vector2 = BUTTONS[index][1]
	var short: float = minf(size.x, size.y)
	return Vector2(size.x - spec.x * size.x, size.y - spec.y * size.y) if spec.y < 0.9 else Vector2(size.x - short * 0.08, short * 0.08)


func _touch(event: InputEvent) -> void:
	var finger: int = event.index
	var at: Vector2 = event.position
	if event is InputEventScreenTouch and not (event as InputEventScreenTouch).pressed:
		if finger == _stick_finger:
			_stick_finger = -1
			_set_stick(Vector2.ZERO)
		elif _held.has(finger):
			Input.action_release(_held[finger])
			_held.erase(finger)
		return
	if event is InputEventScreenDrag:
		if finger == _stick_finger:
			_stick_now = at
			_set_stick((_stick_now - _stick_origin) / STICK_RADIUS)
		return
	for i: int in BUTTONS.size():
		if at.distance_to(button_center(i)) <= float(BUTTONS[i][2]) * 1.15:
			var action: StringName = BUTTONS[i][0]
			Input.action_press(action)
			_held[finger] = action
			return
	if at.x < _pad.get_viewport_rect().size.x * 0.5 and _stick_finger < 0:
		_stick_finger = finger
		_stick_origin = at
		_stick_now = at


func _set_stick(v: Vector2) -> void:
	v = v.limit_length(1.0)
	_axis(&"move_left", &"move_right", v.x)
	_axis(&"move_up", &"move_down", v.y)


func _axis(negative: StringName, positive: StringName, value: float) -> void:
	if value <= -DEAD_ZONE:
		Input.action_press(negative)
		Input.action_release(positive)
	elif value >= DEAD_ZONE:
		Input.action_press(positive)
		Input.action_release(negative)
	else:
		Input.action_release(negative)
		Input.action_release(positive)


func _release_all() -> void:
	for action: Variant in _held.values():
		Input.action_release(action)
	_held.clear()
	_stick_finger = -1
	_set_stick(Vector2.ZERO)


func _draw_pad() -> void:
	var ring := Color(1.0, 1.0, 1.0, 0.22)
	var fill := Color(1.0, 0.3, 0.6, 0.18)
	if _stick_finger >= 0:
		_pad.draw_circle(_stick_origin, STICK_RADIUS, Color(0.0, 0.0, 0.0, 0.25))
		_pad.draw_arc(_stick_origin, STICK_RADIUS, 0.0, TAU, 48, ring, 3.0)
		_pad.draw_circle(_stick_origin + (_stick_now - _stick_origin).limit_length(STICK_RADIUS), 46.0, fill.lerp(Color.WHITE, 0.3))
	var font: Font = UiStyle.display_font
	for i: int in BUTTONS.size():
		var c: Vector2 = button_center(i)
		var r: float = BUTTONS[i][2]
		var pressed: bool = _held.values().has(BUTTONS[i][0])
		_pad.draw_circle(c, r, Color(1.0, 0.3, 0.6, 0.45) if pressed else Color(0.0, 0.0, 0.0, 0.35))
		_pad.draw_arc(c, r, 0.0, TAU, 40, ring, 3.0)
		var text: String = Strings.text(str(BUTTONS[i][3]))
		var size: int = int(r * 0.32)
		var w: float = font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
		_pad.draw_string(font, c + Vector2(-w * 0.5, size * 0.35), text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, Color(1.0, 1.0, 1.0, 0.85))
