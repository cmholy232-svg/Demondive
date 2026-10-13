class_name DialogueBox
extends CanvasLayer
## Plays a story beat from data/dialogue/beats.json, word for word. The
## game pauses while it shows; Jump, Interact or a click advances a line and
## Pause skips the rest. A skipped scene still grants its unlocks once.

signal finished(beat_id: StringName)

const PATH: String = "res://data/dialogue/beats.json"
const CHARS_PER_SECOND: float = 55.0

static var _beats: Dictionary = {}

var _lines: Array = []
var _index: int = 0
var _beat_id: StringName = &""
var _shown: float = 0.0
var _panel: PanelContainer
var _speaker: Label
var _text: Label
var _location: Label
var _hint: Label


static func beats() -> Dictionary:
	if _beats.is_empty():
		_beats = JSON.parse_string(FileAccess.get_file_as_string(PATH)) as Dictionary
	return _beats


static func has_beat(id: StringName) -> bool:
	return beats().has(String(id))


func _ready() -> void:
	layer = 30
	process_mode = Node.PROCESS_MODE_ALWAYS
	visible = false
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	_panel = PanelContainer.new()
	_panel.add_theme_stylebox_override("panel", UiStyle.panel(Color(0.07, 0.04, 0.1, 0.94), UiStyle.ARCANE, 14))
	root.add_child(_panel)
	_panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM, Control.PRESET_MODE_KEEP_SIZE)
	_panel.custom_minimum_size = Vector2(900.0, 170.0)
	_panel.position = Vector2(190.0, 520.0)
	_panel.size = Vector2(900.0, 170.0)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 6)
	_panel.add_child(col)
	var head := HBoxContainer.new()
	col.add_child(head)
	_speaker = UiStyle.title("", 24)
	_speaker.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(_speaker)
	_location = UiStyle.label("", 14, UiStyle.MUTED)
	head.add_child(_location)
	_text = UiStyle.label("", 22)
	_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_text.custom_minimum_size = Vector2(860.0, 70.0)
	col.add_child(_text)
	_hint = UiStyle.label(Strings.text("dialogue.hint"), 13, UiStyle.MUTED)
	_hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	col.add_child(_hint)


## Plays a beat. Returns false (and plays nothing) if it's unknown, or if it
## plays once and has been seen already.
func play(id: StringName) -> bool:
	if not has_beat(id):
		return false
	var beat: Dictionary = beats()[String(id)]
	if bool(beat.get("once", true)) and Save.scene_seen(id):
		return false
	_beat_id = id
	_lines = beat["lines"] as Array
	_index = 0
	_location.text = str(beat.get("location", ""))
	_apply_mutation(beat)
	Save.mark_scene_seen(id)
	visible = true
	get_tree().paused = true
	_show_line()
	return true


func _apply_mutation(beat: Dictionary) -> void:
	var mutation: Dictionary = beat.get("mutation", {}) as Dictionary
	for boon: Variant in mutation.get("unlocks", []):
		Save.unlock(StringName(str(boon)))
	for flag: Variant in mutation.get("flags", []):
		Save.set_flag(StringName(str(flag)))


func _show_line() -> void:
	var line: Dictionary = _lines[_index]
	_speaker.text = str(line["speaker"])
	_speaker.add_theme_color_override("font_color", Color.html(str(line.get("color", "#ffffff"))))
	_text.text = str(line["text"])
	_text.visible_characters = 0
	_shown = 0.0


func _process(delta: float) -> void:
	if not visible:
		return
	_shown += delta * CHARS_PER_SECOND
	_text.visible_characters = int(_shown)


func _unhandled_input(event: InputEvent) -> void:
	if not visible:
		return
	var advance: bool = event.is_action_pressed("jump") or event.is_action_pressed("interact") or event.is_action_pressed("magic")
	advance = advance or (event is InputEventMouseButton and (event as InputEventMouseButton).pressed)
	advance = advance or (event is InputEventScreenTouch and (event as InputEventScreenTouch).pressed)
	if event.is_action_pressed("pause"):
		_finish()
	elif advance:
		if _text.visible_characters < _text.text.length():
			_shown = float(_text.text.length())
		else:
			_index += 1
			if _index >= _lines.size():
				_finish()
			else:
				_show_line()
	else:
		return
	get_viewport().set_input_as_handled()


func _finish() -> void:
	visible = false
	get_tree().paused = false
	finished.emit(_beat_id)
