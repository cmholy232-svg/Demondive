class_name DeskPanel
extends HubPanel
## Milo's desk: permanent upgrades bought with Soul Shards, grouped by kind,
## and his lifetime records.

const CATEGORIES: Array[String] = ["body", "arcane", "fortune", "fate", "hellroom"]


func accent() -> Color:
	return UiStyle.GOLD


func show_desk() -> void:
	open("desk.title", "desk.subtitle")


func refresh() -> void:
	super.refresh()
	var columns := HBoxContainer.new()
	columns.add_theme_constant_override("separation", 14)
	body.add_child(columns)
	var first: Button = null
	for category: String in CATEGORIES:
		var col := VBoxContainer.new()
		col.custom_minimum_size = Vector2(180.0, 0.0)
		col.add_theme_constant_override("separation", 6)
		columns.add_child(col)
		col.add_child(UiStyle.title(Strings.text("upgrade.category.%s" % category), 16, UiStyle.GOLD))
		for id: StringName in Upgrades.ids():
			if str(Upgrades.entry(id).get("category", "")) != category:
				continue
			var level: int = Save.upgrade_level(id)
			var maxed: bool = level >= Upgrades.max_level(id)
			var price: String = Strings.text("desk.maxed") if maxed else Strings.text("desk.cost") % Upgrades.cost(id)
			var text: String = "%s  %s\n%s\n%s" % [Strings.text("upgrade.%s.name" % id), Strings.text("desk.level") % [level, Upgrades.max_level(id)], Strings.text("upgrade.%s.desc" % id), price]
			var button: Button = HubPanel.row_button(text, UiStyle.GOLD, not maxed)
			button.custom_minimum_size = Vector2(180.0, 92.0)
			button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			button.add_theme_font_size_override("font_size", 14)
			if not maxed and not Upgrades.can_buy(id):
				button.add_theme_color_override("font_color", UiStyle.MUTED)
			button.pressed.connect(func() -> void:
				if Upgrades.buy(id):
					Save.write()
					Audio.play_sfx(&"pickup_shard", -2.0)
					refresh()
				else:
					Audio.play_sfx(&"ui_move", -2.0))
			col.add_child(button)
			if first == null:
				first = button
	var records := UiStyle.label(Strings.text("desk.records") % [int(Save.stat("runs")), int(Save.stat("wins")), int(Save.stat("deaths")), int(Save.stat("kills")), int(Save.stat("best_level"))], 15, UiStyle.MUTED)
	records.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	body.add_child(records)
	if first != null:
		focus_later(first)
