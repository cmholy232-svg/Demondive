extends Node
## The persistent profile: Soul Shards, unlocked boon-givers, Hellroom
## upgrades, story flags, cosmetics and lifetime stats. Stored as JSON in
## user:// so it works on desktop, web and mobile.

signal changed

const PATH: String = "user://profile.json"
const VERSION: int = 1

var data: Dictionary = {}
## Tests turn this off so they never touch the real profile.
var persist: bool = true


func _ready() -> void:
	load_profile()


static func fresh() -> Dictionary:
	return {
		"version": VERSION,
		"shards": 0,
		"unlocked": ["pyrra"],
		"upgrades": {},
		"flags": [],
		"seen_scenes": [],
		"starting_boon": "pyrra",
		"cosmetics_owned": ["bomber_classic"],
		"cosmetic_equipped": "bomber_classic",
		"products": [],
		"stats": {"runs": 0, "wins": 0, "deaths": 0, "rooms": 0, "kills": 0, "best_level": 0, "fastest_win": 0.0},
		"settings": {"master": 0.8, "music": 0.7, "sfx": 0.8, "shake": true, "flashes": true, "damage_numbers": true, "reduced_effects": false, "text_scale": 1.0},
	}


func load_profile() -> void:
	data = fresh()
	if not persist or not FileAccess.file_exists(PATH):
		return
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(PATH))
	if parsed is Dictionary:
		var loaded: Dictionary = parsed
		for key: String in loaded:
			data[key] = loaded[key]


func write() -> void:
	changed.emit()
	if not persist:
		return
	var file := FileAccess.open(PATH, FileAccess.WRITE)
	if file != null:
		file.store_string(JSON.stringify(data, "\t"))


func reset_for_tests() -> void:
	persist = false
	data = fresh()


# --- Shards -----------------------------------------------------------------

func shards() -> int:
	return int(data["shards"])


func add_shards(amount: int) -> void:
	data["shards"] = shards() + amount
	write()


func spend_shards(amount: int) -> bool:
	if shards() < amount:
		return false
	data["shards"] = shards() - amount
	write()
	return true


# --- Boon-givers ------------------------------------------------------------

func is_unlocked(boon: StringName) -> bool:
	return (data["unlocked"] as Array).has(String(boon))


func unlock(boon: StringName) -> bool:
	if is_unlocked(boon):
		return false
	(data["unlocked"] as Array).append(String(boon))
	write()
	return true


func unlocked_boons() -> Array[StringName]:
	var out: Array[StringName] = []
	for id: Variant in data["unlocked"]:
		out.append(StringName(str(id)))
	return out


# --- Upgrades ---------------------------------------------------------------

func upgrade_level(id: StringName) -> int:
	return int((data["upgrades"] as Dictionary).get(String(id), 0))


func set_upgrade_level(id: StringName, level: int) -> void:
	(data["upgrades"] as Dictionary)[String(id)] = level
	write()


# --- Flags and scenes -------------------------------------------------------

func has_flag(flag: StringName) -> bool:
	return (data["flags"] as Array).has(String(flag))


func set_flag(flag: StringName) -> void:
	if not has_flag(flag):
		(data["flags"] as Array).append(String(flag))
		write()


func scene_seen(id: StringName) -> bool:
	return (data["seen_scenes"] as Array).has(String(id))


func mark_scene_seen(id: StringName) -> void:
	if not scene_seen(id):
		(data["seen_scenes"] as Array).append(String(id))
		write()


# --- Stats and settings -----------------------------------------------------

func bump_stat(key: String, amount: float = 1.0) -> void:
	var stats: Dictionary = data["stats"]
	stats[key] = float(stats.get(key, 0.0)) + amount


func record_max(key: String, value: float) -> void:
	var stats: Dictionary = data["stats"]
	stats[key] = maxf(float(stats.get(key, 0.0)), value)


func stat(key: String) -> float:
	return float((data["stats"] as Dictionary).get(key, 0.0))


func setting(key: String) -> Variant:
	return (data["settings"] as Dictionary).get(key, (fresh()["settings"] as Dictionary).get(key))


func set_setting(key: String, value: Variant) -> void:
	(data["settings"] as Dictionary)[key] = value
	write()


# --- Hellroom choices, cosmetics and store products --------------------------
func starting_boon() -> StringName:
	var boon := StringName(str(data.get("starting_boon", "pyrra")))
	return boon if is_unlocked(boon) else &"pyrra"


func set_starting_boon(boon: StringName) -> void:
	data["starting_boon"] = String(boon)
	write()


func owns_cosmetic(id: StringName) -> bool:
	return String(id) in (data.get("cosmetics_owned", []) as Array)


func grant_cosmetic(id: StringName) -> void:
	if owns_cosmetic(id):
		return
	var owned: Array = data.get("cosmetics_owned", []) as Array
	owned.append(String(id))
	data["cosmetics_owned"] = owned
	write()


func equipped_cosmetic() -> StringName:
	return StringName(str(data.get("cosmetic_equipped", "bomber_classic")))


func equip_cosmetic(id: StringName) -> void:
	data["cosmetic_equipped"] = String(id)
	write()


## Store products the player has bought (restored from the platform store).
func owns_product(id: StringName) -> bool:
	return String(id) in (data.get("products", []) as Array)


func grant_product(id: StringName) -> void:
	if owns_product(id):
		return
	var owned: Array = data.get("products", []) as Array
	owned.append(String(id))
	data["products"] = owned
	write()
