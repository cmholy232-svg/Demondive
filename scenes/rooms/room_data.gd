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
##            l lobber, d diver (each level's roster swaps in its own variants)
##   mechanics: < > current, * bubble vent, % thorn cover, ! timed rail,
##            - ice (solid), Y icicle, 1 2 / 3 4 linked portals, / mirror, & corruption
## Lower-case enemy letters spawn in the first wave, upper-case in the second.

const TILE: float = 64.0
const STATION_CODES: Dictionary = {"A": &"altar", "D": &"desk", "W": &"wardrobe"}
const SPAWN_CODES: Dictionary = {
	"i": &"imp", "f": &"floater", "s": &"succubus", "h": &"hellhound", "k": &"crawler", "n": &"siren",
	"l": &"lobber", "d": &"diver",
}

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


static func load_file(path: String) -> RoomData:
	var data := RoomData.new()
	data.id = StringName(path.get_file().get_basename())
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
