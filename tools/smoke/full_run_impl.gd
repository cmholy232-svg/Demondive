extends RefCounted
const MAX_ROOMS: int = 120


func go(tree: SceneTree) -> void:
	var seed: int = 7
	var args: PackedStringArray = OS.get_cmdline_user_args()
	if args.size() > 0:
		seed = int(args[0])
	Save.reset_for_tests()
	var main: Node = (load("res://scenes/main/main.tscn") as PackedScene).instantiate()
	tree.root.add_child(main)
	await tree.process_frame
	Game.start_run(seed)
	var run: Run = (load("res://scenes/run/run.gd") as GDScript).new() as Run
	main.add_child(run)
	var all_boons: bool = args.size() > 1 and args[1] == "all"
	var ids: Array = (JSON.parse_string(FileAccess.get_file_as_string("res://data/boons/boons.json")) as Dictionary).keys()
	if all_boons:
		for id: Variant in ids:
			Game.add_boon(StringName(str(id)))
	var rooms: int = 0
	var last: String = ""
	while rooms < MAX_ROOMS and not run.results.visible:
		if all_boons:
			Game.special = StringName(str(ids[rooms % ids.size()]))
		for i in 150:
			await tree.physics_frame
			if all_boons and i % 20 == 5:
				Game.energy = Game.max_energy
				run.specials.try_use()
				(run.milo.get_node("ArcaneCaster") as ArcaneCaster).fire(Vector2(run.milo.facing, 0.0))
			_tend(tree, run, i > 40 or not all_boons)
		if run.room == null or not is_instance_valid(run.room):
			continue
		var label: String = "L%d %s" % [Game.level, run.room.data.id]
		if run.cell != null:
			label += " %s gates=%s" % [run.cell.at, ",".join(run.room.data.open_gates)]
		print(label, "  clear=", run.room.is_clear, " rule=", RoomRules.current, " boons=", Game.boons.size(), " shards=", Game.run_shards)
		if label == last and not run.room.is_clear:
			print("  STUCK in ", label)
		last = label
		if run.room.is_clear and run.room.exits.size() > 0:
			run.room.exits[0].chosen.emit(run.room.exits[0])
			rooms += 1
		elif run.room.is_clear and run.map != null:
			run.debug.advance()
			rooms += 1
	print("done level=", Game.level, " rooms=", rooms, " results visible=", run.results.visible)
	tree.quit()


func _tend(tree: SceneTree, run: Run, kill: bool) -> void:
	Game.health = Game.max_health
	if run.dialogue.visible:
		run.dialogue._finish()
	if run.boon_choice.visible:
		run.boon_choice._take()
	if run.boon_choice.visible and run.boon_choice._equip_box.visible:
		run.boon_choice._close(&"pyrra")
	if not kill:
		return
	for e in tree.get_nodes_in_group(Enemy.GROUP):
		if not (e as Enemy).dead:
			(e as Enemy).die()
