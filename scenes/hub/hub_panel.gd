class_name HubPanel
extends CanvasLayer
## Base for the Hellroom's full-screen menus (altar, desk, wardrobe): a dark
## shade, a titled card, a body for the subclass to fill, and Esc to close.
## The game pauses while one is open.

signal closed

var body: VBoxContainer
var _card: PanelContainer
var _title: Label
var _subtitle: Label
var _shards: Label
var _open: bool = false


func _ready() -> void:
	layer = 30
	process_mode = Node.PROCESS_MODE_ALWAYS
	visible = false
	var shade := ColorRect.new()
	shade.color = Color(0.03, 0.01, 0.05, 0.8)
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(shade)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	_card = PanelContainer.new()
	_card.add_theme_stylebox_override("panel", UiStyle.panel(Color(0.08, 0.05, 0.11, 0.97), accent(), 14))
	_card.custom_minimum_size = Vector2(980.0, 0.0)
	center.add_child(_card)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 10)
	_card.add_child(col)
	var head := HBoxContainer.new()
	col.add_child(head)
	_title = UiStyle.title("", 30, accent())
	_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(_title)
	_shards = UiStyle.label("", 18, UiStyle.SHARD, UiStyle.bold_font)
	head.add_child(_shards)
	_subtitle = UiStyle.label("", 16, UiStyle.MUTED)
	_subtitle.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	col.add_child(_subtitle)
	body = VBoxContainer.new()
	body.add_theme_constant_override("separation", 8)
	col.add_child(body)
	var footer := UiStyle.label(Strings.text("hub.close"), 14, UiStyle.MUTED)
	footer.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	col.add_child(footer)


## Subclasses override: the card's border and title colour.
func accent() -> Color:
	return UiStyle.GOLD


func open(title_key: String, subtitle_key: String) -> void:
	_title.text = Strings.text(title_key)
	_subtitle.text = Strings.text(subtitle_key)
	_open = true
	visible = true
	get_tree().paused = true
	refresh()
	Audio.play_sfx(&"ui_confirm", -4.0)


func close() -> void:
	if not _open:
		return
	_open = false
	visible = false
	get_tree().paused = false
	Audio.play_sfx(&"ui_move", -6.0)
	closed.emit()


## Rebuilds the body; subclasses add their rows after calling this.
func refresh() -> void:
	_shards.text = Strings.text("hub.shards") % Save.shards()
	for child: Node in body.get_children():
		body.remove_child(child)
		child.queue_free()


func is_open() -> bool:
	return _open


func _unhandled_input(event: InputEvent) -> void:
	if not _open:
		return
	if event.is_action_pressed("ui_cancel") or event.is_action_pressed("pause"):
		close()
		get_viewport().set_input_as_handled()
		return
	# The game's own keys (WASD, E, J) work here too, not only arrows and Enter.
	var focus: Control = get_viewport().gui_get_focus_owner()
	if focus == null:
		return
	var sides: Dictionary = {&"move_left": SIDE_LEFT, &"move_right": SIDE_RIGHT, &"move_up": SIDE_TOP, &"move_down": SIDE_BOTTOM}
	for action: StringName in sides:
		if event.is_action_pressed(action) and not event.is_action_pressed(StringName("ui_" + str(action).trim_prefix("move_"))):
			var next: Control = focus.find_valid_focus_neighbor(sides[action])
			if next != null:
				next.grab_focus()
			get_viewport().set_input_as_handled()
			return
	if (event.is_action_pressed("interact") or event.is_action_pressed("magic")) and focus is BaseButton and not (focus as BaseButton).disabled and not event.is_action_pressed("ui_accept"):
		(focus as BaseButton).pressed.emit()
		get_viewport().set_input_as_handled()


## A focusable row button in the panel's style.
static func row_button(text: String, accent_color: Color, enabled: bool = true) -> Button:
	var b := Button.new()
	b.text = text
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	b.add_theme_font_override("font", UiStyle.body_font)
	b.add_theme_font_size_override("font_size", 17)
	b.add_theme_color_override("font_color", UiStyle.TEXT if enabled else UiStyle.MUTED)
	b.add_theme_color_override("font_hover_color", UiStyle.INK)
	b.add_theme_color_override("font_focus_color", UiStyle.INK)
	b.add_theme_color_override("font_disabled_color", UiStyle.MUTED)
	b.add_theme_stylebox_override("normal", UiStyle.panel(Color(1.0, 1.0, 1.0, 0.04), accent_color.darkened(0.5), 8))
	b.add_theme_stylebox_override("hover", UiStyle.panel(accent_color, Color.WHITE, 8))
	b.add_theme_stylebox_override("focus", UiStyle.panel(accent_color, Color.WHITE, 8))
	b.add_theme_stylebox_override("pressed", UiStyle.panel(accent_color.darkened(0.2), Color.WHITE, 8))
	b.add_theme_stylebox_override("disabled", UiStyle.panel(Color(1.0, 1.0, 1.0, 0.02), UiStyle.LINE, 8))
	b.focus_mode = Control.FOCUS_ALL
	return b


## Focuses a freshly built button once it's in the tree (refresh can rebuild twice in a frame).
func focus_later(button: Button) -> void:
	(func() -> void:
		if is_instance_valid(button) and button.is_inside_tree():
			button.grab_focus()).call_deferred()
