class_name RunResults
extends CanvasLayer
## End-of-run card: how far Milo got and what he keeps.

signal closed

var _box: VBoxContainer


func _ready() -> void:
	layer = 35
	process_mode = Node.PROCESS_MODE_ALWAYS
	visible = false


func show_results(won: bool) -> void:
	for child: Node in get_children():
		child.queue_free()
	var shade := ColorRect.new()
	shade.color = Color(0.03, 0.0, 0.05, 0.86)
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(shade)
	_box = VBoxContainer.new()
	_box.alignment = BoxContainer.ALIGNMENT_CENTER
	_box.add_theme_constant_override("separation", 12)
	_box.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_box)
	var heading: Label = UiStyle.title(Strings.text("results.won" if won else "results.died"), 52, UiStyle.GOLD if won else UiStyle.HEALTH)
	heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_box.add_child(heading)
	var minutes: int = int(Game.run_time) / 60
	var seconds: int = int(Game.run_time) % 60
	for line: String in [
		Strings.text("results.reached") % [Strings.text("level.%d.name" % Game.level), Game.room_index],
		Strings.text("results.time") % [minutes, seconds],
		Strings.text("results.kills") % Game.kills,
		Strings.text("results.shards") % Game.run_shards,
	]:
		var label: Label = UiStyle.label(line, 22)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_box.add_child(label)
	var back: Button = UiStyle.button(Strings.text("results.back"))
	back.custom_minimum_size = Vector2(360.0, 56.0)
	back.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	back.pressed.connect(_close)
	_box.add_child(back)
	visible = true
	get_tree().paused = true
	back.grab_focus.call_deferred()


func _unhandled_input(event: InputEvent) -> void:
	if visible and (event.is_action_pressed("jump") or event.is_action_pressed("interact")):
		get_viewport().set_input_as_handled()
		_close()


func _close() -> void:
	if not visible:
		return
	visible = false
	get_tree().paused = false
	closed.emit()
