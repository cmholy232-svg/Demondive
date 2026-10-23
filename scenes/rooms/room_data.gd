class_name RoomData
extends RefCounted
## A hand-built room, read from a text file in data/rooms/<level>/. The file
## has a few "key: value" lines, a "---" line, then the map, one character per
## 64 px tile:
##   #  solid          =  one-way ledge     ^  spikes        ~  lava
##   M  moving ledge (sideways, between | markers on its row)
##   V  moving ledge (up and down, between : markers in its column)
##   P  Milo's start   E  exit door         B  boss          G  caged boon-giver
##   $  tempting pickup over danger         +  pizza          o  coffee
##   Hellroom stations (hub rooms only): A summoning altar, D Milo's desk, W wardrobe
##   enemies: i imp, f floater, s succubus, h hellhound, k crawler, n siren,
##            l lobber, d diver, t turret, r drone, x bouncer
##            (each level's roster swaps in its own variants)
##   mechanics: < > current, * bubble vent, % thorn cover, ! timed rail,
##            - ice (solid), Y icicle, 1 2 / 3 4 linked portals, / mirror, & corruption
## Lower-case enemy letters spawn in the first wave, upper-case in the second.
##
## Box rooms also have a "gates: W12 E20 N33 S48" line: one gate per side,
## sealed with wall in the map. W and E give the map row Milo's feet stand
## in; N and S give the left column of a 4-tile shaft through the ceiling or
## floor. load_box() opens the gates a level map links and seals the rest.

const TILE: float = 64.0
const STATION_CODES: Dictionary = {"A": &"altar", "D": &"desk", "W": &"wardrobe"}
const SPAWN_CODES: Dictionary = {
	"i": &"imp", "f": &"floater", "s": &"succubus", "h": &"hellhound", "k": &"crawler", "n": &"siren",
	"l": &"lobber", "d": &"diver", "t": &"turret", "r": &"drone", "x": &"bouncer",
}
const SIDES: Array[String] = ["W", "E", "N", "S"]
const GATE_SPAN: int = 4

var id: StringName = &""
var name_key: String = ""
var kind: StringName = &"combat"
var music: StringName = &""
var cage: StringName = &""
var boss_kind: StringName = &""
## Story beat to play the first time Milo enters (dialogue id).
var beat: StringName = &""
var lines: PackedStringArray = []
var width: int = 0
var height: int = 0
var player_start: Vector2 = Vector2.ZERO
var boss_spawn: Vector2 = Vector2.ZERO
var exits: Array[Vector2] = []
var cages: Array[Vector2] = []
var temptations: Array[Vector2] = []
var pizzas: Array[Vector2] = []
var coffees: Array[Vector2] = []
## Hellroom stations: id -> feet position.
var stations: Dictionary = {}
## Each spawn: {"kind": StringName, "at": Vector2, "wave": int}
var spawns: Array[Dictionary] = []
## Box gates: side -> map row (W/E) or column (N/S). Empty for rooms played in a line.
var gates: Dictionary = {}
## The gates this copy has opened (load_box).
var open_gates: Array[String] = []
var path: String = ""


static func load_file(path: String) -> RoomData:
	return _parse(path, [])


## A box room with the given gates open and the rest sealed.
static func load_box(path: String, open: Array[String]) -> RoomData:
	return _parse(path, open)


static func _parse(path: String, open: Array[String]) -> RoomData:
	var data := RoomData.new()
	data.id = StringName(path.get_file().get_basename())
	data.path = path
	var text: String = FileAccess.get_file_as_string(path)
	var in_map: bool = false
	for raw: String in text.split("\n"):
		var line: String = raw.trim_suffix("\r")
		if in_map:
			if not line.is_empty():
				data.lines.append(line)
			continue
		if line.strip_edges() == "---":
			in_map = true
			continue
		var colon: int = line.find(":")
		if colon > 0:
			data._set_meta(line.substr(0, colon).strip_edges(), line.substr(colon + 1).strip_edges())
	for side: String in open:
		data._carve(side)
	data._scan()
	return data


func _set_meta(key: String, value: String) -> void:
	match key:
		"name":
			name_key = value
		"type":
			kind = StringName(value)
		"music":
			music = StringName(value)
		"cage":
			cage = StringName(value)
		"boss":
			boss_kind = StringName(value)
		"beat":
			beat = StringName(value)
		"gates":
			for token: String in value.split(" ", false):
				gates[token.substr(0, 1)] = int(token.substr(1))


func _scan() -> void:
	height = lines.size()
	for line: String in lines:
		width = maxi(width, line.length())
	for y: int in height:
		for x: int in lines[y].length():
			var c: String = lines[y][x]
			var feet := Vector2((x + 0.5) * TILE, (y + 1) * TILE)
			match c:
				"P":
					player_start = feet
				"E":
					exits.append(feet)
				"B":
					boss_spawn = feet
				"G":
					cages.append(feet)
				"$":
					temptations.append(feet)
				"+":
					pizzas.append(feet)
				"o":
					coffees.append(feet)
				_ when kind == &"hub" and STATION_CODES.has(c):
					stations[STATION_CODES[c]] = feet
				_:
					var lower: String = c.to_lower()
					if SPAWN_CODES.has(lower):
						spawns.append({"kind": SPAWN_CODES[lower], "at": feet, "wave": 1 if c == lower else 2})


func tile(x: int, y: int) -> String:
	if y < 0 or y >= height or x < 0 or x >= lines[y].length():
		return "#" if y >= height or x < 0 or x >= width else " "
	return lines[y][x]


func is_solid(x: int, y: int) -> bool:
	var c: String = tile(x, y)
	return c == "#" or c == "-"


func size_px() -> Vector2:
	return Vector2(width, height) * TILE


func wave_count() -> int:
	var waves: int = 0
	for spawn: Dictionary in spawns:
		waves = maxi(waves, int(spawn["wave"]))
	return waves


func is_box() -> bool:
	return gates.size() == SIDES.size()


## Cuts the gate on side out of the map.
func _carve(side: String) -> void:
	if not gates.has(side) or open_gates.has(side):
		return
	open_gates.append(side)
	var at: int = int(gates[side])
	var w: int = lines[0].length()
	match side:
		"W", "E":
			for y: int in range(at - GATE_SPAN + 1, at + 1):
				_put(0 if side == "W" else w - 1, y, " ")
		"N":
			for x: int in range(at, at + GATE_SPAN):
				_put(x, 0, " ")
		"S":
			for x: int in range(at, at + GATE_SPAN):
				var y: int = lines.size() - 1
				while y > 0 and (lines[y][x] == "#" or lines[y][x] == "-"):
					_put(x, y, " ")
					y -= 1


func _put(x: int, y: int, c: String) -> void:
	var line: String = lines[y]
	lines[y] = line.substr(0, x) + c + line.substr(x + 1)


## Map row of the ground surface under an S gate (the first open row above it).
func _shaft_top(column: int) -> int:
	var y: int = height - 1
	while y > 0 and is_solid(column, y):
		y -= 1
	return y + 1


## Where Milo's feet go when he comes in through a gate.
func gate_spawn(side: String) -> Vector2:
	var at: int = int(gates[side])
	match side:
		"W":
			return Vector2(1.6 * TILE, (at + 1) * TILE)
		"E":
			return Vector2((width - 1.6) * TILE, (at + 1) * TILE)
		"N":
			return Vector2((at + GATE_SPAN * 0.5) * TILE, TILE * 2.0 + 120.0)
	# S: at the lip of the floor shaft, launched upward by the run.
	return Vector2((at + GATE_SPAN * 0.5) * TILE, _shaft_top(at - 1) * TILE)


## The opening a gate leaves in the map, in pixels.
func gate_rect(side: String) -> Rect2:
	var at: int = int(gates[side])
	match side:
		"W":
			return Rect2(0.0, (at - GATE_SPAN + 1) * TILE, TILE, GATE_SPAN * TILE)
		"E":
			return Rect2((width - 1) * TILE, (at - GATE_SPAN + 1) * TILE, TILE, GATE_SPAN * TILE)
		"N":
			return Rect2(at * TILE, 0.0, GATE_SPAN * TILE, TILE)
	var top: int = _shaft_top(at - 1)
	return Rect2(at * TILE, top * TILE, GATE_SPAN * TILE, (height - top) * TILE)


## Which open gate, if any, a point outside the room's edges left through.
func gate_left_by(feet: Vector2) -> String:
	var size: Vector2 = size_px()
	if feet.x < -12.0 and open_gates.has("W"):
		return "W"
	if feet.x > size.x + 12.0 and open_gates.has("E"):
		return "E"
	if feet.y < TILE * 0.5 and open_gates.has("N"):
		return "N"
	if feet.y > size.y + 40.0 and open_gates.has("S"):
		return "S"
	return ""
