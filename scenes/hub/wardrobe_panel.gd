class_name WardrobePanel
extends HubPanel
## The wardrobe: Milo's outfits. Focusing one previews it on Milo; pressing
## wears it, or buys it when it costs shards. Store outfits go through Store.

signal preview(outfit: StringName)


func accent() -> Color:
	return Color(1.0, 0.3, 0.7)


func show_wardrobe() -> void:
	open("wardrobe.title", "wardrobe.subtitle")


func close() -> void:
	super.close()
	preview.emit(Cosmetics.equipped())


func refresh() -> void:
	super.refresh()
	var grid := GridContainer.new()
	grid.columns = 3
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	body.add_child(grid)
	var focus: Button = null
	for id: StringName in Cosmetics.ids():
		var owned: bool = Cosmetics.is_owned(id)
		var wearing: bool = id == Cosmetics.equipped()
		var status: String
		if wearing:
			status = Strings.text("wardrobe.wearing")
		elif owned:
			status = Strings.text("wardrobe.wear")
		elif Cosmetics.shard_cost(id) > 0:
			status = Strings.text("wardrobe.buy") % Cosmetics.shard_cost(id)
		elif str(Cosmetics.unlock_rule(id).get("type", "")) == "product":
			var price: String = Store.price_text(StringName(str(Cosmetics.unlock_rule(id).get("product", ""))))
			status = Cosmetics.how_to_unlock(id) + ("  ·  " + price if price != "" else "  ·  " + Strings.text("wardrobe.store_unavailable"))
		else:
			status = Cosmetics.how_to_unlock(id)
		var swatch: Color = Cosmetics.colors(id).get("jacket_patch", Color(0.55, 0.06, 0.05)) as Color
		var card: Button = HubPanel.row_button("%s\n%s" % [Strings.text("cosmetic.%s.name" % id), status], swatch.lightened(0.1))
		card.custom_minimum_size = Vector2(300.0, 60.0)
		if not owned and Cosmetics.shard_cost(id) == 0 and str(Cosmetics.unlock_rule(id).get("type", "")) != "product":
			card.add_theme_color_override("font_color", UiStyle.MUTED)
		card.focus_entered.connect(func() -> void: preview.emit(id))
		card.mouse_entered.connect(func() -> void: preview.emit(id))
		card.pressed.connect(func() -> void: _choose(id))
		grid.add_child(card)
		if wearing:
			focus = card
	if focus != null:
		focus_later(focus)


func _choose(id: StringName) -> void:
	if Cosmetics.is_owned(id):
		Save.equip_cosmetic(id)
		Audio.play_sfx(&"ui_confirm", -2.0)
	elif Cosmetics.shard_cost(id) > 0:
		if Cosmetics.buy_with_shards(id):
			Save.equip_cosmetic(id)
			Audio.play_sfx(&"pickup_shard", -2.0)
		else:
			Audio.play_sfx(&"ui_move", -2.0)
	elif str(Cosmetics.unlock_rule(id).get("type", "")) == "product":
		Store.purchase(StringName(str(Cosmetics.unlock_rule(id).get("product", ""))), func(ok: bool) -> void:
			if ok:
				Save.equip_cosmetic(id)
			refresh())
		return
	refresh()
