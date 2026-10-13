class_name Hud
extends CanvasLayer
## Six fixed slots at the screen edges; nothing over the middle of the fight.
##   top-left: Health and Demon Energy   top-centre: boss bar
##   top-right: shards and room          bottom-left: Special
##   bottom-right: boons                 bottom-centre: prompts and callouts

const MARGIN: float = 22.0

var _health_bar: ProgressBar
var _health_text: Label
var _energy_bar: ProgressBar
var _shards: Label
var _room: Label
var _boss_box: VBoxContainer
var _boss_name: Label
var _boss_bar: ProgressBar
var _boss: Boss
var _special_box: PanelContainer
var _special_name: Label
var _special_cost: Label
var _boons: HBoxContainer
var _prompt: Label
var _callout: Label
var _callout_timer: float = 0.0
var _enemies_left: Label


func _ready() -> void:
	layer = 10
	add_to_group(&"hud")
	_build_vitals()
	_build_boss_bar()
	_build_top_right()
	_build_special()
	_build_boons()
	_build_prompts()
	Game.health_changed.connect(_on_health)
	Game.energy_changed.connect(_on_energy)
	Game.run_shards_changed.connect(func(amount: int) -> void: _shards.text = str(amount))
	Game.boons_changed.connect(_refresh_boons)
	_on_health(Game.health, Game.max_health)
	_on_energy(Game.energy, Game.max_energy)
	_refresh_boons()


func _anchor(control: Control, preset: Control.LayoutPreset) -> void:
	add_child(control)
	control.set_anchors_and_offsets_preset(preset, Control.PRESET_MODE_MINSIZE, int(MARGIN))
	# Text set later must grow away from the screen edge, not off it.
	match preset:
		Control.PRESET_TOP_RIGHT, Control.PRESET_BOTTOM_RIGHT:
			control.grow_horizontal = Control.GROW_DIRECTION_BEGIN
		Control.PRESET_CENTER_TOP, Control.PRESET_CENTER_BOTTOM:
			control.grow_horizontal = Control.GROW_DIRECTION_BOTH
	if preset == Control.PRESET_BOTTOM_LEFT or preset == Control.PRESET_BOTTOM_RIGHT or preset == Control.PRESET_CENTER_BOTTOM:
		control.grow_vertical = Control.GROW_DIRECTION_BEGIN


func _build_vitals() -> void:
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 6)
	_anchor(box, Control.PRESET_TOP_LEFT)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	box.add_child(row)
	_health_bar = UiStyle.bar(UiStyle.HEALTH)
	_health_bar.custom_minimum_size = Vector2(300.0, 22.0)
	row.add_child(_health_bar)
	_health_text = UiStyle.label("100", 18)
	row.add_child(_health_text)
	_energy_bar = UiStyle.bar(UiStyle.ENERGY)
	_energy_bar.custom_minimum_size = Vector2(220.0, 12.0)
	box.add_child(_energy_bar)


func _build_boss_bar() -> void:
	_boss_box = VBoxContainer.new()
	_boss_box.alignment = BoxContainer.ALIGNMENT_CENTER
	_boss_box.visible = false
	_anchor(_boss_box, Control.PRESET_CENTER_TOP)
	_boss_name = UiStyle.title("", 22, UiStyle.TEXT)
	_boss_name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_boss_box.add_child(_boss_name)
	_boss_bar = UiStyle.bar(Color("ff4f9a"))
	_boss_bar.custom_minimum_size = Vector2(560.0, 16.0)
	_boss_box.add_child(_boss_bar)


func _build_top_right() -> void:
	var box := VBoxContainer.new()
	box.alignment = BoxContainer.ALIGNMENT_END
	_anchor(box, Control.PRESET_TOP_RIGHT)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_END
	box.add_child(row)
	var gem := Polygon2D.new()
	gem.polygon = PackedVector2Array([Vector2(8, 4), Vector2(15, 15), Vector2(8, 26), Vector2(1, 15)])
	gem.color = UiStyle.SHARD
	var gem_box := Control.new()
	gem_box.custom_minimum_size = Vector2(16.0, 30.0)
	gem_box.add_child(gem)
	row.add_child(gem_box)
	_shards = UiStyle.label("0", 22, UiStyle.SHARD, UiStyle.bold_font)
	row.add_child(_shards)
	_room = UiStyle.label("", 15, UiStyle.MUTED)
	_room.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	box.add_child(_room)
	_enemies_left = UiStyle.label("", 15, UiStyle.EMBER)
	_enemies_left.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	box.add_child(_enemies_left)


func _build_special() -> void:
	_special_box = PanelContainer.new()
	_special_box.add_theme_stylebox_override("panel", UiStyle.panel())
	_anchor(_special_box, Control.PRESET_BOTTOM_LEFT)
	var col := VBoxContainer.new()
	_special_box.add_child(col)
	_special_name = UiStyle.label("", 18)
	col.add_child(_special_name)
	_special_cost = UiStyle.label("", 14, UiStyle.ENERGY)
	col.add_child(_special_cost)


func _build_boons() -> void:
	_boons = HBoxContainer.new()
	_boons.add_theme_constant_override("separation", 6)
	_boons.alignment = BoxContainer.ALIGNMENT_END
	_anchor(_boons, Control.PRESET_BOTTOM_RIGHT)


func _build_prompts() -> void:
	_prompt = UiStyle.label("", 18, UiStyle.TEXT)
	_prompt.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_anchor(_prompt, Control.PRESET_CENTER_BOTTOM)
	_prompt.offset_bottom = -MARGIN
	_callout = UiStyle.title("", 26, UiStyle.GOLD)
	_callout.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_callout.visible = false
	_anchor(_callout, Control.PRESET_CENTER_TOP)
	_callout.offset_top = 92.0


func _on_health(health: float, max_health: float) -> void:
	_health_bar.max_value = max_health
	_health_bar.value = health
	_health_text.text = "%d / %d" % [ceili(health), roundi(max_health)]


func _on_energy(energy: float, max_energy: float) -> void:
	_energy_bar.max_value = max_energy
	_energy_bar.value = energy
	_refresh_special()


func _refresh_special() -> void:
	var id: StringName = Game.special
	_special_box.visible = id != &""
	if id == &"":
		return
	var cost: float = BoonEffects.special_cost(id)
	_special_name.text = BoonCatalog.text(id, "special_name")
	_special_name.add_theme_color_override("font_color", BoonCatalog.color(id) if Game.energy >= cost else UiStyle.MUTED)
	_special_cost.text = Strings.text("hud.special_cost") % roundi(cost)


func _refresh_boons() -> void:
	for child: Node in _boons.get_children():
		child.queue_free()
	for id: StringName in Game.boon_ids():
		var chip := PanelContainer.new()
		chip.add_theme_stylebox_override("panel", UiStyle.panel(BoonCatalog.color(id).darkened(0.55), BoonCatalog.color(id), 8))
		var text := UiStyle.label("%s %d" % [BoonCatalog.text(id, "name"), Game.stacks(id)], 15, BoonCatalog.accent(id))
		chip.add_child(text)
		_boons.add_child(chip)
	_refresh_special()


func set_room_label(text: String) -> void:
	_room.text = text


func set_enemies_left(count: int) -> void:
	_enemies_left.text = Strings.text("hud.enemies_left") % count if count > 0 else ""


func set_prompt(text: String) -> void:
	_prompt.text = text


func show_boss(boss: Boss) -> void:
	_boss = boss
	_boss_box.visible = boss != null
	if boss != null:
		_boss_name.text = Strings.text(boss.title_key + ".name")


func callout(text: String, seconds: float = 2.2) -> void:
	_callout.text = text
	_callout.visible = true
	_callout_timer = seconds


func _process(delta: float) -> void:
	# A freed boss compares equal to null, so key off the bar being shown.
	if _boss_box.visible:
		if is_instance_valid(_boss) and not _boss.dead:
			_boss_bar.max_value = _boss.max_health
			_boss_bar.value = _boss.health
		else:
			show_boss(null)
	if _callout_timer > 0.0:
		_callout_timer -= delta
		_callout.visible = _callout_timer > 0.0
