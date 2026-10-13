class_name BoonChoice
extends CanvasLayer
## The boon offer: up to three boon-givers' cards. Left/Right to look, Jump
## or click to take one, Special to reroll (if Milo has rerolls). Taking a
## new boon asks whether to equip its Special.

signal chosen(boon: StringName)

var _options: Array[StringName] = []
var _cards: Array[PanelContainer] = []
var _focus: int = 0
var _row: HBoxContainer
var _title: Label
var _footer: Label
var _equip_box: HBoxContainer
var _pending: StringName = &""
var _input_delay: float = 0.0
var _forced: StringName = &""


func _ready() -> void:
	layer = 25
	process_mode = Node.PROCESS_MODE_ALWAYS
	visible = false
	var shade := ColorRect.new()
	shade.color = Color(0.03, 0.01, 0.05, 0.78)
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(shade)
	var col := VBoxContainer.new()
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_theme_constant_override("separation", 18)
	col.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(col)
	_title = UiStyle.title(Strings.text("boon.offer_title"), 34, UiStyle.GOLD)
	_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(_title)
	_row = HBoxContainer.new()
	_row.alignment = BoxContainer.ALIGNMENT_CENTER
	_row.add_theme_constant_override("separation", 20)
	col.add_child(_row)
	_equip_box = HBoxContainer.new()
	_equip_box.alignment = BoxContainer.ALIGNMENT_CENTER
	_equip_box.add_theme_constant_override("separation", 20)
	col.add_child(_equip_box)
	_footer = UiStyle.label("", 15, UiStyle.MUTED)
	_footer.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(_footer)


## Rolls up to three boons from those Milo has unlocked. A forced boon (a
## Demon Lord's own) always takes the first slot.
static func roll(rng: RandomNumberGenerator, forced: StringName = &"") -> Array[StringName]:
	var pool: Array[StringName] = []
	for id: StringName in Save.unlocked_boons():
		if id != forced:
			pool.append(id)
	var picks: Array[StringName] = []
	if forced != &"":
		picks.append(forced)
	while picks.size() < 3 and not pool.is_empty():
		picks.append(pool.pop_at(rng.randi_range(0, pool.size() - 1)))
	return picks


func offer(options: Array[StringName], forced: StringName = &"") -> void:
	_options = options
	_forced = forced
	_focus = 0
	_pending = &""
	_equip_box.visible = false
	_row.visible = true
	_build_cards()
	_update_footer()
	visible = true
	_input_delay = 0.35
	get_tree().paused = true
	Audio.play_sfx(&"door_open", -4.0)


func _build_cards() -> void:
	for child: Node in _row.get_children():
		child.queue_free()
	_cards.clear()
	for i: int in _options.size():
		var card: PanelContainer = _make_card(_options[i])
		card.gui_input.connect(func(event: InputEvent) -> void:
			if event is InputEventMouseButton and (event as InputEventMouseButton).pressed:
				_focus = i
				_take())
		card.mouse_entered.connect(func() -> void:
			_focus = i
			_highlight())
		_row.add_child(card)
		_cards.append(card)
	_highlight()


func _make_card(id: StringName) -> PanelContainer:
	var card := PanelContainer.new()
	card.custom_minimum_size = Vector2(340.0, 380.0)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 8)
	card.add_child(col)
	var stacks: int = Game.stacks(id)
	var level_text: String = Strings.text("boon.new") if stacks == 0 else Strings.text("boon.level_up") % [stacks, stacks + 1]
	col.add_child(UiStyle.label(level_text, 14, UiStyle.GOLD))
	col.add_child(UiStyle.title(BoonCatalog.text(id, "name"), 30, BoonCatalog.color(id)))
	col.add_child(UiStyle.label(BoonCatalog.text(id, "identity") + "  ·  " + BoonCatalog.text(id, "title"), 15, BoonCatalog.accent(id)))
	for field: String in ["passive", "arcane"]:
		var line: Label = UiStyle.label(BoonCatalog.text(id, field), 17)
		line.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		line.custom_minimum_size = Vector2(300.0, 0.0)
		col.add_child(line)
	if stacks > 0:
		var more: Label = UiStyle.label(BoonCatalog.text(id, "stacking"), 15, UiStyle.MUTED)
		more.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		more.custom_minimum_size = Vector2(300.0, 0.0)
		col.add_child(more)
	var special: Label = UiStyle.label(Strings.text("boon.special_line") % BoonCatalog.text(id, "special_name"), 15, UiStyle.ENERGY)
	special.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	special.custom_minimum_size = Vector2(300.0, 0.0)
	col.add_child(special)
	return card


func _highlight() -> void:
	for i: int in _cards.size():
		var id: StringName = _options[i]
		var focused: bool = i == _focus
		var fill: Color = BoonCatalog.color(id).darkened(0.72 if focused else 0.82)
		_cards[i].add_theme_stylebox_override("panel", UiStyle.panel(fill, BoonCatalog.color(id) if focused else UiStyle.LINE, 14))
		_cards[i].scale = Vector2.ONE * (1.04 if focused else 1.0)
		_cards[i].pivot_offset = _cards[i].custom_minimum_size * 0.5


func _update_footer() -> void:
	var text: String = Strings.text("boon.footer")
	if Game.rerolls > 0:
		text += "   " + Strings.text("boon.reroll") % Game.rerolls
	_footer.text = text


func _unhandled_input(event: InputEvent) -> void:
	if not visible or _input_delay > 0.0:
		return
	if _equip_box.visible:
		_equip_input(event)
		return
	if event.is_action_pressed("move_left"):
		_focus = (_focus - 1 + _options.size()) % _options.size()
		Audio.play_sfx(&"ui_move", -4.0)
		_highlight()
	elif event.is_action_pressed("move_right"):
		_focus = (_focus + 1) % _options.size()
		Audio.play_sfx(&"ui_move", -4.0)
		_highlight()
	elif event.is_action_pressed("jump") or event.is_action_pressed("interact") or event.is_action_pressed("magic"):
		_take()
	elif event.is_action_pressed("special") and Game.rerolls > 0:
		Game.rerolls -= 1
		offer(roll(Game.rng, _forced), _forced)
	else:
		return
	get_viewport().set_input_as_handled()


## The equip question answers to the game's own buttons too, not only the UI keys.
func _equip_input(event: InputEvent) -> void:
	var buttons: Array[Node] = _equip_box.get_children().filter(func(n: Node) -> bool: return n is Button and not n.is_queued_for_deletion())
	if buttons.is_empty():
		return
	var focused: int = maxi(0, buttons.find(get_viewport().gui_get_focus_owner()))
	if event.is_action_pressed("move_left") or event.is_action_pressed("move_right"):
		(buttons[(focused + 1) % buttons.size()] as Button).grab_focus()
		Audio.play_sfx(&"ui_move", -4.0)
	elif event.is_action_pressed("jump") or event.is_action_pressed("interact") or event.is_action_pressed("magic"):
		(buttons[focused] as Button).pressed.emit()
	elif event.is_action_pressed("ui_cancel") or event.is_action_pressed("pause"):
		(buttons[buttons.size() - 1] as Button).pressed.emit()
	else:
		return
	get_viewport().set_input_as_handled()


func _process(delta: float) -> void:
	_input_delay = maxf(0.0, _input_delay - delta)


func _take() -> void:
	if _options.is_empty():
		return
	var id: StringName = _options[_focus]
	var had_special: StringName = Game.special
	Game.add_boon(id)
	Audio.play_boon(id, -2.0)
	Audio.play_sfx(&"ui_confirm", -2.0)
	if had_special != &"" and had_special != id and Game.stacks(id) == 1:
		_ask_equip(id, had_special)
		return
	_close(id)


func _ask_equip(id: StringName, current: StringName) -> void:
	_pending = id
	_row.visible = false
	_title.text = Strings.text("boon.equip_title")
	for child: Node in _equip_box.get_children():
		child.queue_free()
	var take := UiStyle.button(Strings.text("boon.equip") % BoonCatalog.text(id, "special_name"), BoonCatalog.color(id))
	take.pressed.connect(func() -> void:
		Game.equip_special(id)
		_close(id))
	var keep := UiStyle.button(Strings.text("boon.keep") % BoonCatalog.text(current, "special_name"), UiStyle.MUTED)
	keep.pressed.connect(func() -> void: _close(id))
	_equip_box.add_child(take)
	_equip_box.add_child(keep)
	_equip_box.visible = true
	take.grab_focus.call_deferred()


func _close(id: StringName) -> void:
	if not visible:
		return
	_equip_box.visible = false
	visible = false
	_title.text = Strings.text("boon.offer_title")
	get_tree().paused = false
	chosen.emit(id)
