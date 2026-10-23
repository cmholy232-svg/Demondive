extends TestCase
## Level 1 is box rooms on a grid: a different map each run, every link a
## matching pair of gates, the boss at the end of the route.


func _map(seed_value: int) -> LevelMap:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	return LevelMap.make(LevelPlan.make(1, rng), rng)


func test_route_follows_the_level_slots() -> void:
	var map: LevelMap = _map(3)
	var slots: Array = LevelPlan.levels()["1"]["slots"] as Array
	check_equal(map.route.size(), slots.size(), "one box per slot on the main route")
	for i: int in slots.size():
		check_equal(String(map.cell(map.route[i]).kind), str(slots[i]), "slot %d kind" % i)
	check(map.cells.size() > map.route.size(), "side rooms hang off the route")


func test_every_gate_has_a_matching_gate_next_door() -> void:
	for seed_value: int in [1, 2, 3, 4, 5, 6, 7, 8]:
		var map: LevelMap = _map(seed_value)
		for key: Variant in map.cells:
			var cell: LevelMap.Cell = map.cell(key as Vector2i)
			check(cell.room != null and cell.room.is_box(), "every cell has a box room")
			for side: String in cell.doors:
				var other: LevelMap.Cell = map.cell(cell.neighbour(side))
				check(other != null and other.doors.has(LevelMap.OPPOSITE[side]), "gate %s of %s leads somewhere and back" % [side, cell.at])


func test_boss_is_a_dead_end_and_the_entry_starts_the_route() -> void:
	var map: LevelMap = _map(9)
	check_equal(String(map.start().kind), "entry", "the map starts in an entry box")
	check_equal(String(map.boss().kind), "boss", "and ends at the boss")
	check_equal(map.boss().doors.size(), 1, "the boss box has one way in")


func test_runs_get_different_maps() -> void:
	var shapes: Dictionary = {}
	for seed_value: int in range(1, 11):
		shapes[str(_map(seed_value).route)] = true
	check(shapes.size() >= 6, "ten runs give at least six different routes (got %d)" % shapes.size())


func test_open_gates_are_cut_and_closed_ones_stay_wall() -> void:
	var path: String = "res://data/rooms/neon_maw/combat_vip_tower.txt"
	var sealed: RoomData = RoomData.load_box(path, [])
	var open: RoomData = RoomData.load_box(path, ["W", "N", "S"] as Array[String])
	var w: Rect2 = open.gate_rect("W")
	var tile_w := Vector2i(0, int(w.position.y / RoomData.TILE))
	check(sealed.is_solid(tile_w.x, tile_w.y), "a sealed W gate is wall")
	check(not open.is_solid(tile_w.x, tile_w.y), "an open W gate is a doorway")
	var n: Rect2 = open.gate_rect("N")
	check(not open.is_solid(int(n.position.x / RoomData.TILE), 0), "an open N gate cuts the ceiling")
	var s: Rect2 = open.gate_rect("S")
	check(not open.is_solid(int(s.position.x / RoomData.TILE), open.height - 1), "an open S gate cuts through the floor")
	var e: Rect2 = open.gate_rect("E")
	check(open.is_solid(open.width - 1, int(e.position.y / RoomData.TILE)), "the unused E gate stays sealed")
	check_equal(open.gate_left_by(Vector2(-40.0, 500.0)), "W", "walking off the left edge leaves by W")
	check_equal(open.gate_left_by(Vector2(open.size_px().x + 40.0, 500.0)), "", "E is shut")


func test_new_enemies_are_built() -> void:
	var turret: Enemy = EnemyFactory.make(&"turret")
	var drone: Enemy = EnemyFactory.make(&"drone")
	var bouncer: Enemy = EnemyFactory.make(&"bouncer")
	check(turret is Turret and drone is Drone and bouncer is Bouncer, "turret, drone and bouncer have their own behaviour")
	for enemy: Enemy in [turret, drone, bouncer]:
		enemy.free()
