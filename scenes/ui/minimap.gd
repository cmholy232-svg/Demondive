class_name Minimap
extends Control
## The level's map of box rooms in the HUD's top-right slot: rooms Milo has
## seen, the gates between them, where he is, and what each room holds.

const CELL: Vector2 = Vector2(22.0, 15.0)
const GAP: float = 5.0
const SHOWN: Vector2i = Vector2i(7, 5)
const ROOM: Color = Color(0.16, 0.1, 0.2, 0.85)
const SEEN: Color = Color(0.32, 0.22, 0.38, 0.85)
const HERE: Color = Color(1.0, 0.3, 0.65)
const EDGE: Color = Color(1.0, 0.55, 0.82, 0.9)
const ICONS: Dictionary = {
	&"boss": Color(1.0, 0.22, 0.3), &"miniboss": Color(1.0, 0.55, 0.15), &"recovery": Color(0.4, 1.0, 0.55),
	&"boon": Color(1.0, 0.85, 0.3), &"shards": Color(0.55, 0.75, 1.0), &"feast": Color(1.0, 0.65, 0.35),
	&"heart": Color(1.0, 0.35, 0.45),
}

var map: LevelMap
var here: Vector2i


func _init() -> void:
	custom_minimum_size = Vector2(SHOWN.x * (CELL.x + GAP), SHOWN.y * (CELL.y + GAP))
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func show_map(level_map: LevelMap, at: Vector2i) -> void:
	map = level_map
	here = at
	visible = map != null
	queue_redraw()


func _draw() -> void:
	if map == null:
		return
	var centre: Vector2 = size * 0.5
	var pitch: Vector2 = CELL + Vector2(GAP, GAP)
	for key: Variant in map.cells:
		var at: Vector2i = key as Vector2i
		if not map.known(at):
			continue
		var cell: LevelMap.Cell = map.cell(at)
		var offset: Vector2 = Vector2(at - here) * pitch
		if absf(offset.x) > size.x * 0.5 or absf(offset.y) > size.y * 0.5:
			continue
		var rect := Rect2(centre + offset - CELL * 0.5, CELL)
		for side: String in cell.doors:
			var step: Vector2 = Vector2(LevelMap.STEP[side] as Vector2i)
			var from: Vector2 = rect.get_center() + step * CELL * 0.5
			draw_line(from, from + step * GAP, EDGE, 3.0)
		draw_rect(rect, ROOM if cell.visited else SEEN)
		if at == here:
			draw_rect(rect, HERE, false, 2.0)
		var icon: StringName = cell.kind if cell.kind != &"combat" else cell.reward
		if cell.cleared and cell.kind != &"boss":
			continue
		if ICONS.has(icon):
			draw_circle(rect.get_center(), 3.5 if icon != &"boss" else 5.0, ICONS[icon] as Color)
