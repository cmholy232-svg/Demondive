class_name RunDebug
extends Node
## Debug keys for a run, and the route-walking the smoke test uses.

var run: Run


## Debug and smoke tests: one room further along the route toward the boss.
func advance() -> void:
	var map: LevelMap = run.map
	var cell: LevelMap.Cell = run.cell
	if map == null or run.is_traveling() or cell == null:
		return
	var target: Vector2i = cell.neighbour(cell.doors[0])
	if cell.step >= 0 and cell.step + 1 < map.route.size():
		target = map.route[cell.step + 1]
	for side: String in cell.doors:
		if cell.neighbour(side) == target:
			run.room._set_clear()
			run._travel(side)
			return


## Debug builds only, with the F3 panel open: F6 clears the room, F7 skips
## to the next one, F8 jumps to the boss, F10 skips to the next level,
## F5 makes Milo very hard to kill for the rest of the run.
func _unhandled_input(event: InputEvent) -> void:
	if not Debug.enabled or not Debug.overlay_visible or not event is InputEventKey or not event.is_pressed():
		return
	match (event as InputEventKey).physical_keycode:
		KEY_F6:
			for node: Node in get_tree().get_nodes_in_group(Enemy.GROUP):
				(node as Enemy).take_hit(Hit.make(99999.0, Vector2.UP))
		KEY_F7:
			if run.map != null:
				advance()
			elif run.room != null and run.room.exits.size() > 0 and run._index + 1 < run.plan.room_count():
				run._on_exit_chosen(run.room.exits[0].reward)
		KEY_F8:
			if run.map != null:
				run._enter_cell(run.map.boss(), run.map.boss().doors[0])
				return
			run._index = run.plan.room_count() - 2
			run._on_exit_chosen(&"boss")
		KEY_F10:
			if not run._ending:
				run._finish_level()
		KEY_F5:
			Game.raise_max_health(99999.0)
