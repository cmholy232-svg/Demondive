class_name AltarPanel
extends HubPanel
## The summoning altar: pick the boon Milo starts every dive with, from the
## goddesses he has freed. Locked ones show where they're waiting.

signal boon_selected(boon: StringName)


func accent() -> Color:
	return Color(0.78, 0.6, 1.0)


func show_altar() -> void:
	open("altar.title", "altar.subtitle")


func refresh() -> void:
	super.refresh()
	var current := UiStyle.label(Strings.text("altar.current") % BoonCatalog.text(Save.starting_boon(), "name"), 18, BoonCatalog.color(Save.starting_boon()), UiStyle.bold_font)
	body.add_child(current)
	var grid := GridContainer.new()
	grid.columns = 5
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	body.add_child(grid)
	var focus: Button = null
	for boon: StringName in BoonCatalog.ORDER:
		var unlocked: bool = Save.is_unlocked(boon)
		var color: Color = BoonCatalog.color(boon)
		var text: String
		if unlocked:
			text = "%s\n%s" % [BoonCatalog.text(boon, "name"), BoonCatalog.text(boon, "special_name")]
		else:
			text = "%s\n%s" % [Strings.text("altar.locked"), Strings.text("altar.locked_hint") % BoonCatalog.unlock_level(boon)]
		var card: Button = HubPanel.row_button(text, color, unlocked)
		card.custom_minimum_size = Vector2(184.0, 64.0)
		card.disabled = not unlocked
		if unlocked:
			card.add_theme_color_override("font_color", color.lightened(0.25))
			card.pressed.connect(func() -> void:
				Save.set_starting_boon(boon)
				Audio.play_boon(boon)
				boon_selected.emit(boon)
				refresh())
		grid.add_child(card)
		if boon == Save.starting_boon():
			focus = card
	if focus != null:
		focus_later(focus)
