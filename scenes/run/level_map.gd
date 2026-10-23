class_name LevelMap
extends RefCounted
## A level laid out as box rooms on a grid, different every run. The main
## route follows the level's slot list (entry ... mini-boss ... boss) as a
## random walk that can turn up, down, left or right; side rooms hang off it
## as dead ends. Each link is a pair of gates: walk out of a box's right
## wall into the left wall of the next, drop through a floor shaft into the
## room below, jump through a ceiling shaft into the room above.
##
## Only levels with a "map" block in levels.json are built this way; the
## rest still play their rooms in a line (LevelPlan).

const STEP: Dictionary = {"W": Vector2i(-1, 0), "E": Vector2i(1, 0), "N": Vector2i(0, -1), "S": Vector2i(0, 1)}
const OPPOSITE: Dictionary = {"W": "E", "E": "W", "N": "S", "S": "N"}
const REWARD_WEIGHTS: Dictionary = {&"boon": 45, &"shards": 25, &"feast": 15, &"heart": 15}
const ATTEMPTS: int = 200


class Cell:
	extends RefCounted
	var at: Vector2i
	var kind: StringName
	## The room template (sealed); Run opens its gates with RoomData.load_box.
	var room: RoomData
	## Sides with a gate linked to a neighbour.
	var doors: Array[String] = []
	## What clearing this room pays: boon, shards, feast, heart, or the room kind.
	var reward: StringName = &"none"
	## Step along the main route (-1 for side rooms).
	var step: int = -1
	var visited: bool = false
	var cleared: bool = false

	func neighbour(side: String) -> Vector2i:
		return at + (STEP[side] as Vector2i)


var level: int = 1
var cells: Dictionary = {}
## The main route from the entry to the boss.
var route: Array[Vector2i] = []


static func wanted(config: Dictionary) -> bool:
	return config.has("map")


static func make(plan: LevelPlan, rng: RandomNumberGenerator) -> LevelMap:
	var pool: Dictionary = plan.load_pool()
	for attempt: int in ATTEMPTS:
		var map := LevelMap.new()
		map.level = plan.level
		if map._lay_out(plan.slots, plan.config.get("map", {}) as Dictionary, rng) and map._fill(pool, rng):
			return map
	push_error("LevelMap: could not lay out level %d" % plan.level)
	return null


func start() -> Cell:
	return cells[route[0]] as Cell


func boss() -> Cell:
	return cells[route[route.size() - 1]] as Cell


func cell(at: Vector2i) -> Cell:
	return cells.get(at) as Cell


## Cells Milo has seen: visited ones and the ones their gates lead to.
func known(at: Vector2i) -> bool:
	var here: Cell = cell(at)
	if here == null:
		return false
	if here.visited:
		return true
	for side: String in here.doors:
		var other: Cell = cell(here.neighbour(side))
		if other != null and other.visited:
			return true
	return false


func _lay_out(slots: Array[StringName], spec: Dictionary, rng: RandomNumberGenerator) -> bool:
	var weights: Dictionary = spec.get("turns", {"E": 4, "N": 2, "S": 2, "W": 1}) as Dictionary
	var at := Vector2i.ZERO
	var came_from: String = ""
	for i: int in slots.size():
		var here := Cell.new()
		here.at = at
		here.kind = slots[i]
		here.step = i
		cells[at] = here
		route.append(at)
		if came_from != "":
			here.doors.append(came_from)
		if i == slots.size() - 1:
			break
		var side: String = _turn(at, weights, rng)
		if side == "":
			return false
		here.doors.append(side)
		came_from = OPPOSITE[side]
		at += STEP[side] as Vector2i
	var count: Array = spec.get("side_rooms", [2, 3]) as Array
	var kinds: Array = spec.get("side_kinds", ["combat"]) as Array
	var wanted_sides: int = rng.randi_range(int(count[0]), int(count[count.size() - 1]))
	for i: int in wanted_sides:
		if not _add_side_room(StringName(str(kinds[i % kinds.size()])), rng):
			return false
	return true


## A free direction from at, weighted, never next to the route's other cells
## so the map stays readable.
func _turn(at: Vector2i, weights: Dictionary, rng: RandomNumberGenerator) -> String:
	var options: Array[String] = []
	for side: String in STEP:
		var next: Vector2i = at + (STEP[side] as Vector2i)
		if cells.has(next) or _crowded(next, at):
			continue
		for i: int in int(weights.get(side, 1)):
			options.append(side)
	if options.is_empty():
		return ""
	return options[rng.randi_range(0, options.size() - 1)]


## True if spot touches an existing cell other than the one it grows from.
func _crowded(spot: Vector2i, parent: Vector2i) -> bool:
	for side: String in STEP:
		var other: Vector2i = spot + (STEP[side] as Vector2i)
		if other != parent and cells.has(other):
			return true
	return false


## A dead-end room off the route; never off the entry, the boss or the boss's door.
func _add_side_room(kind: StringName, rng: RandomNumberGenerator) -> bool:
	var spots: Array = []
	for i: int in range(1, route.size() - 2):
		var parent: Cell = cell(route[i])
		if parent.kind == &"miniboss":
			continue
		for side: String in STEP:
			var spot: Vector2i = parent.at + (STEP[side] as Vector2i)
			if not cells.has(spot) and not _crowded(spot, parent.at):
				spots.append([parent, side])
	if spots.is_empty():
		return false
	var pick: Array = spots[rng.randi_range(0, spots.size() - 1)]
	var parent: Cell = pick[0] as Cell
	var side: String = str(pick[1])
	var room := Cell.new()
	room.at = parent.neighbour(side)
	room.kind = kind
	room.doors.append(OPPOSITE[side])
	parent.doors.append(side)
	cells[room.at] = room
	return true


## Picks a template for every cell (no repeats while the pool allows) and rolls rewards.
func _fill(pool: Dictionary, rng: RandomNumberGenerator) -> bool:
	var used: Dictionary = {}
	var order: Array = route.duplicate()
	for at: Variant in cells:
		if not order.has(at):
			order.append(at)
	for at: Variant in order:
		var here: Cell = cells[at] as Cell
		var choices: Array = (pool.get(here.kind, []) as Array).filter(func(d: RoomData) -> bool: return d.is_box())
		if choices.is_empty():
			return false
		var fresh: Array = choices.filter(func(d: RoomData) -> bool: return not used.has(d.id))
		if not fresh.is_empty():
			choices = fresh
		here.room = choices[rng.randi_range(0, choices.size() - 1)] as RoomData
		used[here.room.id] = true
		here.reward = _reward(here.kind, rng)
	return true


func _reward(kind: StringName, rng: RandomNumberGenerator) -> StringName:
	if kind != &"combat":
		return kind if kind != &"entry" else &"none"
	var total: int = 0
	for reward: StringName in REWARD_WEIGHTS:
		total += int(REWARD_WEIGHTS[reward])
	var roll: int = rng.randi_range(1, total)
	for reward: StringName in REWARD_WEIGHTS:
		roll -= int(REWARD_WEIGHTS[reward])
		if roll <= 0:
			return reward
	return &"boon"
