extends RefCounted
func go(tree: SceneTree) -> void:
	Save.reset_for_tests()
	var main: Node = (load("res://scenes/main/main.tscn") as PackedScene).instantiate()
	tree.root.add_child(main)
	await tree.process_frame
	Game.start_run(42)
	var run: Run = (load("res://scenes/run/run.gd") as GDScript).new() as Run
	main.add_child(run)
	for i in 120:
		await tree.physics_frame
	print("room: ", run.room.data.id, " enemies: ", run.room.enemies_left(), " milo: ", run.milo.global_position)
	# Close any dialogue
	if run.dialogue.visible:
		run.dialogue._finish()
	for i in 60:
		await tree.physics_frame
	print("enemies after: ", run.room.enemies_left(), " health ", Game.health)
	for room_i in 9:
		for e in tree.get_nodes_in_group(Enemy.GROUP):
			(e as Enemy).die()
		for i in 90:
			await tree.physics_frame
			if run.dialogue.visible: run.dialogue._finish()
			if run.boon_choice.visible: run.boon_choice._take()
			if run.boon_choice.visible and run.boon_choice._equip_box.visible: run.boon_choice._close(&"pyrra")
			for e in tree.get_nodes_in_group(Enemy.GROUP):
				(e as Enemy).die()
		print("room ", run.room.data.id, " bossbar=", run.hud._boss_box.visible, " clear=", run.room.is_clear, " wave=", run.room.wave, " boons=", Game.boons, " shards=", Game.run_shards)
		if run.room.exits.size() > 0:
			run.room.exits[0].chosen.emit(run.room.exits[0])
		for i in 60:
			await tree.physics_frame
			if run.dialogue.visible: run.dialogue._finish()
			if run.boon_choice.visible: run.boon_choice._take()
	print("done level=", Game.level, " results visible=", run.results.visible)
	tree.quit()
