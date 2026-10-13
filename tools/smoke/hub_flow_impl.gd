extends RefCounted


func go(tree: SceneTree) -> void:
	await tree.process_frame
	Save.reset_for_tests()
	Save.add_shards(200)
	var main: Node = (load("res://scenes/main/main.tscn") as PackedScene).instantiate()
	tree.root.add_child(main)
	await tree.process_frame
	main.call("_show_hub")
	for i in 30:
		await tree.process_frame
	var hub: Hub = main.get("_current") as Hub
	print("hub: ", hub != null, " stations: ", hub.room.data.stations.keys(), " dialogue: ", hub.dialogue.visible)
	while hub.dialogue.visible:
		hub.dialogue.call("_finish")
		await tree.process_frame
		await tree.process_frame
	print("beats seen: ", Save.scene_seen(&"prologue_dive"), Save.scene_seen(&"prologue_arrival"))
	hub.altar.show_altar()
	await tree.process_frame
	print("altar open paused=", tree.paused)
	hub.altar.close()
	hub.desk.show_desk()
	await tree.process_frame
	var before: int = Save.shards()
	Upgrades.buy(&"vitality")
	print("bought vitality: ", Save.upgrade_level(&"vitality"), " shards ", before, " -> ", Save.shards())
	hub.desk.close()
	hub.wardrobe.show_wardrobe()
	await tree.process_frame
	print("baron owned before: ", Cosmetics.is_owned(&"shard_baron"))
	hub.wardrobe.call("_choose", &"shard_baron")
	print("baron owned after: ", Cosmetics.is_owned(&"shard_baron"), " equipped ", Save.equipped_cosmetic())
	hub.wardrobe.call("_choose", &"hellfire_gold")
	print("store gold owned: ", Cosmetics.is_owned(&"hellfire_gold"))
	hub.wardrobe.close()
	# Walk to the altar and check the prompt.
	hub.milo.global_position = hub.room.data.stations[&"altar"]
	for i in 5:
		await tree.physics_frame
	print("prompt near altar: ", hub.get("_prompt").text)
	hub.room.exits[0].chosen.emit(hub.room.exits[0])
	for i in 60:
		await tree.process_frame
	var run: Node = main.get("_current")
	print("now in: ", run.get_class(), " ", run is Run, " boons ", Game.boons, " max hp ", Game.max_health)
	tree.quit()
