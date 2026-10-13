extends TestCase


func test_milo_lands_on_the_floor() -> void:
	var room: Node2D = (load("res://scenes/rooms/test_room.tscn") as PackedScene).instantiate() as Node2D
	tree.root.add_child(room)
	var milo: Milo = room.get_node("Milo") as Milo
	for i: int in 60:
		await tree.physics_frame
	check(milo.is_on_floor(), "Milo is standing on the floor")
	check(absf(milo.position.y - 656.0) < 1.0, "Milo's feet rest on the floor top (y=%.1f)" % milo.position.y)
	room.queue_free()
	await tree.process_frame
