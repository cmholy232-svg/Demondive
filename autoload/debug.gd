extends Node
## Debug overlay. Exists only in debug builds and is toggled with F3.

signal toggled(is_visible: bool)

## False in release exports, so nothing in this file can show to players.
var enabled: bool = OS.is_debug_build()
var overlay_visible: bool = false

var _layer: CanvasLayer
var _label: Label
var _watch: Dictionary = {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	if not enabled:
		set_process(false)
		set_process_unhandled_input(false)
		return
	_layer = CanvasLayer.new()
	_layer.layer = 100
	_layer.visible = false
	add_child(_layer)
	_label = Label.new()
	_label.position = Vector2(16.0, 16.0)
	_label.add_theme_font_size_override("font_size", 16)
	_label.add_theme_color_override("font_outline_color", Color.BLACK)
	_label.add_theme_constant_override("outline_size", 4)
	_layer.add_child(_label)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("debug_toggle"):
		set_overlay_visible(not overlay_visible)
		get_viewport().set_input_as_handled()


func set_overlay_visible(value: bool) -> void:
	if not enabled:
		return
	overlay_visible = value
	_layer.visible = value
	toggled.emit(value)


## Shows a live value on the overlay under a Strings key.
func watch(string_key: String, value: Variant) -> void:
	if enabled:
		_watch[string_key] = value


func _process(_delta: float) -> void:
	if not overlay_visible:
		return
	var lines: PackedStringArray = [Strings.text("debug.header")]
	lines.append("%s: %d" % [Strings.text("debug.fps"), Engine.get_frames_per_second()])
	for key: String in _watch:
		lines.append("%s: %s" % [Strings.text(key), str(_watch[key])])
	_label.text = "\n".join(lines)
