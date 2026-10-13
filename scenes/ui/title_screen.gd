class_name TitleScreen
extends CanvasLayer
## Title card: the logo, a tagline and the way in.

signal play_pressed


func _ready() -> void:
	var back := ColorRect.new()
	back.color = UiStyle.INK
	back.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(back)
	var glow := TextureRect.new()
	var gradient := GradientTexture2D.new()
	gradient.fill = GradientTexture2D.FILL_RADIAL
	gradient.fill_from = Vector2(0.5, 1.1)
	gradient.fill_to = Vector2(0.5, 0.2)
	var colors := Gradient.new()
	colors.set_color(0, Color(0.45, 0.06, 0.3))
	colors.set_color(1, Color(0.06, 0.03, 0.08, 0.0))
	gradient.gradient = colors
	glow.texture = gradient
	glow.set_anchors_preset(Control.PRESET_FULL_RECT)
	glow.stretch_mode = TextureRect.STRETCH_SCALE
	add_child(glow)
	var col := VBoxContainer.new()
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_theme_constant_override("separation", 18)
	col.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(col)
	var logo: Label = UiStyle.title(Strings.text("game.title"), 110, UiStyle.TEXT)
	logo.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	logo.add_theme_color_override("font_shadow_color", Color(1.0, 0.25, 0.6, 0.8))
	logo.add_theme_constant_override("shadow_offset_y", 6)
	col.add_child(logo)
	var tagline: Label = UiStyle.label(Strings.text("title.tagline"), 22, UiStyle.MUTED)
	tagline.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(tagline)
	var play: Button = UiStyle.button(Strings.text("title.play"))
	play.custom_minimum_size = Vector2(300.0, 64.0)
	play.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	play.pressed.connect(func() -> void:
		Audio.play_sfx(&"ui_confirm")
		play_pressed.emit())
	col.add_child(play)
	var stats: Label = UiStyle.label(Strings.text("title.stats") % [int(Save.stat("runs")), Save.shards()], 16, UiStyle.MUTED)
	stats.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(stats)
	play.grab_focus.call_deferred()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("jump") or event.is_action_pressed("interact"):
		get_viewport().set_input_as_handled()
		play_pressed.emit()
