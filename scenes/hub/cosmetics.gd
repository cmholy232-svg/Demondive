class_name Cosmetics
extends RefCounted
## Milo's outfits. Each recolours named materials on his model. They unlock
## by playing (freeing a goddess, a stat milestone), by spending Soul Shards,
## or through a store product. None of them change gameplay.

const PATH: String = "res://data/cosmetics.json"

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


static func unlock_rule(id: StringName) -> Dictionary:
	return (table().get(String(id), {}) as Dictionary).get("unlock", {}) as Dictionary


## Material name -> colour for this outfit (empty for the default look).
static func colors(id: StringName) -> Dictionary:
	var out: Dictionary = {}
	var raw: Dictionary = (table().get(String(id), {}) as Dictionary).get("colors", {}) as Dictionary
	for material: String in raw:
		out[material] = Color(str(raw[material]))
	return out


## True when the player may wear it right now.
static func is_owned(id: StringName) -> bool:
	var rule: Dictionary = unlock_rule(id)
	match str(rule.get("type", "")):
		"default":
			return true
		"boon":
			return Save.is_unlocked(StringName(str(rule.get("boon", ""))))
		"stat":
			return Save.stat(str(rule.get("stat", ""))) >= float(rule.get("value", 0.0))
		"shards":
			return Save.owns_cosmetic(id)
		"product":
			return Save.owns_product(StringName(str(rule.get("product", ""))))
	return false


static func shard_cost(id: StringName) -> int:
	var rule: Dictionary = unlock_rule(id)
	return int(rule.get("cost", 0)) if str(rule.get("type", "")) == "shards" else 0


static func buy_with_shards(id: StringName) -> bool:
	var cost: int = shard_cost(id)
	if cost <= 0 or is_owned(id) or not Save.spend_shards(cost):
		return false
	Save.grant_cosmetic(id)
	return true


## Player-facing line saying how to get it.
static func how_to_unlock(id: StringName) -> String:
	var rule: Dictionary = unlock_rule(id)
	match str(rule.get("type", "")):
		"boon":
			return Strings.text("cosmetic.unlock.boon") % BoonCatalog.text(StringName(str(rule.get("boon", ""))), "name")
		"stat":
			return Strings.text("cosmetic.unlock.%s" % str(rule.get("stat", ""))) % int(rule.get("value", 0))
		"shards":
			return Strings.text("cosmetic.unlock.shards") % shard_cost(id)
		"product":
			return Strings.text("cosmetic.unlock.product.%s" % str(rule.get("product", "")))
	return ""


static func equipped() -> StringName:
	var id: StringName = Save.equipped_cosmetic()
	return id if table().has(String(id)) and is_owned(id) else &"bomber_classic"
