class_name DebugTuningPanel
extends CanvasLayer
## F3 panel for tuning Milo live. Debug builds only. Edits change the loaded
## tuning in memory; copy good numbers into data/player/*.tres to keep them.

const PROFILES: Array[String] = [
	"res://data/player/movement_v2.tres",
	"res://data/player/movement_classic.tres",
]
const PANEL_WIDTH: float = 340.0

var milo: Milo
var _fields: VBoxContainer
var _profile_picker: OptionButton


func _ready() -> void:
	layer = 101
	visible = false
	if not Debug.enabled:
		queue_free()
		return
	Debug.toggled.connect(func(is_visible: bool) -> void: visible = is_visible)
	_build()


func bind(target: Milo) -> void:
	milo = target
	_rebuild_fields()


func _build() -> void:
	var panel := PanelContainer.new()
	panel.anchor_left = 1.0
	panel.anchor_right = 1.0
	panel.anchor_bottom = 1.0
	panel.offset_left = -PANEL_WIDTH
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(panel)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	panel.add_child(scroll)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(column)

	_profile_picker = OptionButton.new()
	for path: String in PROFILES:
		var profile: MovementTuning = load(path) as MovementTuning
		_profile_picker.add_item(profile.profile_name)
	_profile_picker.item_selected.connect(_on_profile_selected)
	column.add_child(_profile_picker)

	var toggles := HBoxContainer.new()
	column.add_child(toggles)
	toggles.add_child(_toggle("Shake", GameCamera.shake_enabled, func(on: bool) -> void: GameCamera.shake_enabled = on))
	toggles.add_child(_toggle("Hit pause", GameCamera.hit_pause_enabled, func(on: bool) -> void: GameCamera.hit_pause_enabled = on))

	var reset := Button.new()
	reset.text = "Reset profile to saved values"
	reset.pressed.connect(func() -> void: _on_profile_selected(_profile_picker.selected))
	column.add_child(reset)

	_fields = VBoxContainer.new()
	column.add_child(_fields)


func _toggle(label: String, value: bool, on_toggled: Callable) -> CheckBox:
	var box := CheckBox.new()
	box.text = label
	box.button_pressed = value
	box.toggled.connect(on_toggled)
	return box


func _on_profile_selected(index: int) -> void:
	if milo == null:
		return
	# A fresh copy so live edits never leak into the saved profile.
	milo.tuning = (load(PROFILES[index]) as MovementTuning).duplicate() as MovementTuning
	_rebuild_fields()


func _rebuild_fields() -> void:
	for child: Node in _fields.get_children():
		child.queue_free()
	if milo == null:
		return
	_add_resource_fields("Movement", milo.tuning)
	var caster: ArcaneCaster = milo.get_node("ArcaneCaster") as ArcaneCaster
	_add_resource_fields("Arcane Bolt", caster.tuning)


func _add_resource_fields(title: String, resource: Resource) -> void:
	var header := Label.new()
	header.text = title
	header.add_theme_font_size_override("font_size", 18)
	_fields.add_child(header)
	for property: Dictionary in resource.get_property_list():
		var usage: int = property["usage"]
		var type: int = property["type"]
		if usage & PROPERTY_USAGE_SCRIPT_VARIABLE == 0 or (type != TYPE_FLOAT and type != TYPE_INT):
			continue
		var name: String = property["name"]
		var row := HBoxContainer.new()
		var label := Label.new()
		label.text = name.capitalize()
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		label.add_theme_font_size_override("font_size", 14)
		row.add_child(label)
		var spin := SpinBox.new()
		spin.min_value = -100000.0
		spin.max_value = 100000.0
		spin.step = 1.0 if type == TYPE_INT else 0.005
		spin.custom_minimum_size.x = 110.0
		spin.value = float(resource.get(name))
		spin.value_changed.connect(func(value: float) -> void:
			resource.set(name, int(value) if type == TYPE_INT else value))
		row.add_child(spin)
		_fields.add_child(row)
