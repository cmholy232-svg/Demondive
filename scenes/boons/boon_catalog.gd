class_name BoonCatalog
extends RefCounted
## The twenty boon-givers' numbers from data/boons/boons.json. Names and card
## text come from the strings file as boon.<id>.<field>.

const PATH: String = "res://data/boons/boons.json"
const ORDER: Array[StringName] = [&"pyrra", &"maris", &"gaia", &"zephyra", &"flora", &"voltara", &"crya",
	&"luna", &"solara", &"belladonna", &"nerissa", &"roxyne", &"calyptra", &"isolde", &"somnia", &"vespera",
	&"aurelia", &"noctissa", &"lilith", &"seraphine"]

static var _table: Dictionary = {}


static func table() -> Dictionary:
	if _table.is_empty():
		_table = JSON.parse_string(FileAccess.get_file_as_string(PATH)) as Dictionary
	return _table


static func entry(id: StringName) -> Dictionary:
	return table().get(String(id), {}) as Dictionary


static func color(id: StringName) -> Color:
	return Color.html(str(entry(id).get("color", "#ffffff")))


static func accent(id: StringName) -> Color:
	return Color.html(str(entry(id).get("accent", "#ffffff")))


static func special_cost(id: StringName) -> float:
	return float(entry(id).get("special_cost", 25))


static func unlock_level(id: StringName) -> int:
	return int(entry(id).get("unlock_level", 99))


static func text(id: StringName, field: String) -> String:
	return Strings.text("boon.%s.%s" % [id, field])


## The stack counts at which a boon gains a new behavior.
static func thresholds(id: StringName) -> Array[int]:
	var out: Array[int] = []
	for value: Variant in entry(id).get("thresholds", [1, 2, 4, 7]):
		out.append(int(value))
	return out


## How many of the boon's stack thresholds Milo has reached: 0 without the
## boon, 1 with its base card, then 2, 3 and 4 at the Lv 2, 4 and 7
## behaviours (boon.<id>.rank2..rank4 in the strings file).
static func rank(id: StringName) -> int:
	return rank_at(id, Game.stacks(id))


static func rank_at(id: StringName, stacks: int) -> int:
	var reached: int = 0
	for at: int in thresholds(id):
		if stacks >= at:
			reached += 1
	return reached
