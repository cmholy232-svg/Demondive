class_name UiStyle
extends RefCounted
## DemonDive's UI look: neon-club palette, Bungee display type, Barlow text.

const INK: Color = Color("0f0a14")
const PANEL: Color = Color(0.11, 0.08, 0.14, 0.86)
const LINE: Color = Color("3a2a48")
const TEXT: Color = Color("efe7f5")
const MUTED: Color = Color("b5a6c2")
const EMBER: Color = Color("ff7a3d")
const ARCANE: Color = Color("c6a8ff")
const HEALTH: Color = Color("ff3f5e")
const ENERGY: Color = Color("5ce1ff")
const SHARD: Color = Color("9fe8ff")
const GOLD: Color = Color("ffc75a")

static var display_font: Font = preload("res://art/fonts/Bungee-Regular.ttf")
static var body_font: Font = preload("res://art/fonts/Barlow-SemiBold.ttf")
static var bold_font: Font = preload("res://art/fonts/Barlow-Bold.ttf")


static func label(text: String, size: int, color: Color = TEXT, font: Font = null) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_override("font", font if font != null else body_font)
	l.add_theme_font_size_override("font_size", int(size * text_scale()))
	l.add_theme_color_override("font_color", color)
	l.add_theme_color_override("font_outline_color", Color(0.0, 0.0, 0.0, 0.85))
	l.add_theme_constant_override("outline_size", maxi(3, size / 5))
	return l


static func title(text: String, size: int, color: Color = TEXT) -> Label:
	return label(text, size, color, display_font)


static func text_scale() -> float:
	return float(Save.setting("text_scale"))


static func panel(fill: Color = PANEL, border: Color = LINE, radius: int = 10) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = fill
	box.border_color = border
	box.set_border_width_all(2)
	box.set_corner_radius_all(radius)
	box.content_margin_left = 14.0
	box.content_margin_right = 14.0
	box.content_margin_top = 10.0
	box.content_margin_bottom = 10.0
	return box


static func bar(fill: Color, back: Color = Color(0.0, 0.0, 0.0, 0.55)) -> ProgressBar:
	var progress := ProgressBar.new()
	progress.show_percentage = false
	var bg := StyleBoxFlat.new()
	bg.bg_color = back
	bg.set_corner_radius_all(4)
	bg.border_color = Color(1.0, 1.0, 1.0, 0.15)
	bg.set_border_width_all(1)
	var fg := StyleBoxFlat.new()
	fg.bg_color = fill
	fg.set_corner_radius_all(4)
	progress.add_theme_stylebox_override("background", bg)
	progress.add_theme_stylebox_override("fill", fg)
	return progress


static func button(text: String, accent: Color = EMBER) -> Button:
	var b := Button.new()
	b.text = text
	b.add_theme_font_override("font", display_font)
	b.add_theme_font_size_override("font_size", 22)
	b.add_theme_color_override("font_color", INK)
	b.add_theme_color_override("font_hover_color", INK)
	b.add_theme_color_override("font_focus_color", INK)
	var normal := panel(accent, accent.darkened(0.35), 8)
	var hover := panel(accent.lightened(0.15), Color.WHITE, 8)
	b.add_theme_stylebox_override("normal", normal)
	b.add_theme_stylebox_override("hover", hover)
	b.add_theme_stylebox_override("focus", hover)
	b.add_theme_stylebox_override("pressed", panel(accent.darkened(0.15), Color.WHITE, 8))
	return b
