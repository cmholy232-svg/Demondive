class_name RoomBuilder
extends RefCounted
## Turns RoomData into physics: merged solid blocks, one-way ledges, moving
## ledges and hazards. Also records the shapes so the 3D view can dress them.

const T: float = RoomData.TILE
const LEDGE_THICKNESS: float = 16.0

## Rect2 lists the 3D view reads.
var solids: Array[Rect2] = []
var ledges: Array[Rect2] = []
var spikes: Array[Rect2] = []
var lava: Array[Rect2] = []
var movers: Array[MovingPlatform] = []
## Solid ice blocks, kept apart from solids so the view can frost them.
var ice: Array[Rect2] = []
## Level mechanics (currents, vents, cover, rails, icicles, portals, mirrors, corruption).
var mechanics: RoomMechanics = RoomMechanics.new()


func build(data: RoomData, parent: Node2D) -> void:
	_build_solids(data, parent, "#", solids, &"")
	_build_solids(data, parent, "-", ice, &"ice")
	_build_runs(data, parent, "=", _add_ledge)
	_build_runs(data, parent, "^", _add_spikes)
	_build_runs(data, parent, "~", _add_lava)
	_build_movers(data, parent)
	_build_bounds(data, parent)
	mechanics.build(data, parent)


## Greedy merge: horizontal runs of one solid symbol, then stack equal runs downward.
func _build_solids(data: RoomData, parent: Node2D, symbol: String, into: Array[Rect2], group: StringName) -> void:
	var used: Dictionary = {}
	for y: int in data.height:
		var x: int = 0
		while x < data.width:
			if data.tile(x, y) != symbol or used.has(Vector2i(x, y)):
				x += 1
				continue
			var run: int = 0
			while x + run < data.width and data.tile(x + run, y) == symbol and not used.has(Vector2i(x + run, y)):
				run += 1
			var rows: int = 1
			while y + rows < data.height and _row_matches(data, used, x, y + rows, run, symbol):
				rows += 1
			for yy: int in rows:
				for xx: int in run:
					used[Vector2i(x + xx, y + yy)] = true
			var rect := Rect2(x * T, y * T, run * T, rows * T)
			into.append(rect)
			var body: StaticBody2D = _add_body(parent, rect, PhysicsLayers.WORLD, false)
			if group != &"":
				body.add_to_group(group)
			x += run


func _row_matches(data: RoomData, used: Dictionary, x: int, y: int, run: int, symbol: String) -> bool:
	for xx: int in run:
		if data.tile(x + xx, y) != symbol or used.has(Vector2i(x + xx, y)):
			return false
	return true


static func runs(data: RoomData, symbol: String) -> Array[Rect2]:
	var out: Array[Rect2] = []
	for y: int in data.height:
		var x: int = 0
		while x < data.width:
			if data.tile(x, y) != symbol:
				x += 1
				continue
			var run: int = 0
			while data.tile(x + run, y) == symbol:
				run += 1
			out.append(Rect2(x * T, y * T, run * T, T))
			x += run
	return out


func _build_runs(data: RoomData, parent: Node2D, symbol: String, add: Callable) -> void:
	for y: int in data.height:
		var x: int = 0
		while x < data.width:
			if data.tile(x, y) != symbol:
				x += 1
				continue
			var run: int = 0
			while data.tile(x + run, y) == symbol:
				run += 1
			add.call(parent, Rect2(x * T, y * T, run * T, T))
			x += run


func _add_ledge(parent: Node2D, tile_rect: Rect2) -> void:
	var rect := Rect2(tile_rect.position, Vector2(tile_rect.size.x, LEDGE_THICKNESS))
	ledges.append(rect)
	_add_body(parent, rect, PhysicsLayers.ONE_WAY, true)


func _add_spikes(parent: Node2D, tile_rect: Rect2) -> void:
	var rect := Rect2(tile_rect.position + Vector2(4.0, T * 0.45), Vector2(tile_rect.size.x - 8.0, T * 0.55))
	spikes.append(rect)
	parent.add_child(HazardZone.make(&"spikes", rect, 14.0))


func _add_lava(parent: Node2D, tile_rect: Rect2) -> void:
	var rect := Rect2(tile_rect.position + Vector2(0.0, T * 0.3), Vector2(tile_rect.size.x, T * 0.7))
	lava.append(rect)
	parent.add_child(HazardZone.make(&"lava", rect, 18.0))


func _build_movers(data: RoomData, parent: Node2D) -> void:
	for y: int in data.height:
		var x: int = 0
		while x < data.width:
			var c: String = data.tile(x, y)
			if c != "M" and c != "V":
				x += 1
				continue
			var run: int = 0
			while data.tile(x + run, y) == c:
				run += 1
			var platform := MovingPlatform.new()
			platform.width = run * T
			platform.position = Vector2(x * T + run * T * 0.5, y * T)
			platform.vertical = c == "V"
			if c == "M":
				platform.travel = _horizontal_range(data, x, y, run)
			else:
				platform.travel = _vertical_range(data, x, y)
			parent.add_child(platform)
			movers.append(platform)
			x += run


func _horizontal_range(data: RoomData, x: int, y: int, run: int) -> Vector2:
	var left: int = x
	while left > 0 and data.tile(left - 1, y) != "|":
		left -= 1
	var right: int = x + run
	while right < data.width and data.tile(right, y) != "|":
		right += 1
	return Vector2(float(left - x) * T, float(right - x - run) * T)


func _vertical_range(data: RoomData, x: int, y: int) -> Vector2:
	var top: int = y
	while top > 0 and data.tile(x, top - 1) != ":":
		top -= 1
	var bottom: int = y
	while bottom < data.height - 1 and data.tile(x, bottom + 1) != ":":
		bottom += 1
	return Vector2(float(top - y) * T, float(bottom - y) * T)


## Invisible walls and ceiling just outside the map so nothing leaves the room.
func _build_bounds(data: RoomData, parent: Node2D) -> void:
	var size: Vector2 = data.size_px()
	_add_body(parent, Rect2(-T, -T * 4.0, T, size.y + T * 8.0), PhysicsLayers.WORLD, false)
	_add_body(parent, Rect2(size.x, -T * 4.0, T, size.y + T * 8.0), PhysicsLayers.WORLD, false)
	_add_body(parent, Rect2(-T, -T * 5.0, size.x + T * 2.0, T), PhysicsLayers.WORLD, false)


func _add_body(parent: Node2D, rect: Rect2, layer: int, one_way: bool) -> StaticBody2D:
	var body := StaticBody2D.new()
	body.collision_layer = layer
	body.collision_mask = 0
	body.position = rect.get_center()
	if one_way:
		body.add_to_group(&"one_way")
	var shape := CollisionShape2D.new()
	shape.name = "Shape"
	var box := RectangleShape2D.new()
	box.size = rect.size
	shape.shape = box
	shape.one_way_collision = one_way
	body.add_child(shape)
	parent.add_child(body)
	return body
