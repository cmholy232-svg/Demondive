class_name Upgrades
extends RefCounted
## Permanent Hellroom upgrades bought with Soul Shards. Numbers live in
## data/upgrades.json; names and descriptions in the strings file.

const PATH: String = "res://data/upgrades.json"

static var _table: Dictionary = {}


static func table() -> Dictionary:
	if _table.is_empty():
		_table = JSON.parse_string(FileAccess.get_file_as_string(PATH)) as Dictionary
	return _table


static func ids() -> Array[StringName]:
	var out: Array[StringName] = []
	for id: String in table():
		out.append(StringName(id))
	return out


static func entry(id: StringName) -> Dictionary:
	return table().get(String(id), {}) as Dictionary


## The upgrade's total effect at its current level (0 when not bought).
static func value(id: StringName) -> float:
	return float(entry(id).get("per_level", 0.0)) * Save.upgrade_level(id)


static func max_level(id: StringName) -> int:
	return int(entry(id).get("max", 0))


static func cost(id: StringName) -> int:
	var e: Dictionary = entry(id)
	return int(e.get("base_cost", 0)) + Save.upgrade_level(id) * int(e.get("step_cost", 0))


static func can_buy(id: StringName) -> bool:
	return Save.upgrade_level(id) < max_level(id) and Save.shards() >= cost(id)


static func buy(id: StringName) -> bool:
	if not can_buy(id):
		return false
	Save.spend_shards(cost(id))
	Save.set_upgrade_level(id, Save.upgrade_level(id) + 1)
	return true
