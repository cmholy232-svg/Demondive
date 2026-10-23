class_name LevelPlan
extends RefCounted
## Picks the rooms for one level of a run from the hand-built pool in
## data/rooms/<dir>/, following the level's slot list, and rolls what each
## exit door offers.

const LEVELS_PATH: String = "res://data/levels/levels.json"
const REWARD_WEIGHTS: Dictionary = {&"boon": 50, &"shards": 25, &"feast": 15, &"heart": 10}

var level: int = 1
var config: Dictionary = {}
var slots: Array[StringName] = []
var rooms: Array[RoomData] = []

static var _levels: Dictionary = {}


static func levels() -> Dictionary:
	if _levels.is_empty():
		_levels = JSON.parse_string(FileAccess.get_file_as_string(LEVELS_PATH)) as Dictionary
	return _levels


static func has_level(index: int) -> bool:
	return levels().has(str(index))


static func make(index: int, rng: RandomNumberGenerator) -> LevelPlan:
	var plan := LevelPlan.new()
	plan.level = index
	plan.config = levels()[str(index)] as Dictionary
	var pool: Dictionary = plan.load_pool()
	var used: Dictionary = {}
	for slot: Variant in plan.config["slots"]:
		var kind := StringName(str(slot))
		plan.slots.append(kind)
		plan.rooms.append(plan._pick(pool, kind, used, rng))
	return plan


func load_pool() -> Dictionary:
	var dir: String = "res://data/rooms/%s" % config["dir"]
	var pool: Dictionary = {}
	for file: String in DirAccess.get_files_at(dir):
		if not file.ends_with(".txt"):
			continue
		var data: RoomData = RoomData.load_file(dir.path_join(file))
		if not pool.has(data.kind):
			pool[data.kind] = []
		(pool[data.kind] as Array).append(data)
	return pool


func _pick(pool: Dictionary, kind: StringName, used: Dictionary, rng: RandomNumberGenerator) -> RoomData:
	var choices: Array = (pool.get(kind, []) as Array).filter(func(d: RoomData) -> bool: return not used.has(d.id))
	if choices.is_empty():
		choices = pool.get(kind, []) as Array
	if choices.is_empty():
		push_error("LevelPlan: no %s rooms in %s" % [kind, config["dir"]])
		return null
	var picked: RoomData = choices[rng.randi_range(0, choices.size() - 1)]
	used[picked.id] = true
	return picked


func room_count() -> int:
	return rooms.size()


## Rewards for the doors leading out of room i: what room i + 1 will pay out.
func door_rewards(i: int, door_count: int, rng: RandomNumberGenerator) -> Array[StringName]:
	var out: Array[StringName] = []
	if i + 1 >= rooms.size():
		out.append(&"level_end")
		return out
	var next_kind: StringName = slots[i + 1]
	if next_kind != &"combat" and next_kind != &"entry":
		for d: int in maxi(1, door_count):
			out.append(next_kind)
		return out
	for d: int in maxi(1, door_count):
		var pick: StringName = _weighted(rng, out)
		out.append(pick)
	return out


func _weighted(rng: RandomNumberGenerator, avoid: Array[StringName]) -> StringName:
	var total: int = 0
	for reward: StringName in REWARD_WEIGHTS:
		if not avoid.has(reward):
			total += int(REWARD_WEIGHTS[reward])
	var roll: int = rng.randi_range(1, maxi(1, total))
	for reward: StringName in REWARD_WEIGHTS:
		if avoid.has(reward):
			continue
		roll -= int(REWARD_WEIGHTS[reward])
		if roll <= 0:
			return reward
	return &"boon"


func beat(key: String) -> StringName:
	return StringName(str(config.get(key, "")))


func music(key: String) -> StringName:
	return StringName(str((config.get("music", {}) as Dictionary).get(key, "")))
