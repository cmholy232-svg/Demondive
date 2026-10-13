extends TestCase

const FLOOR_Y: float = 656.0


func test_lava_puts_milo_back_on_safe_ground() -> void:
	Game.start_run()
	var rig := MiloRig.create(tree)
	rig.place(Vector2(200.0, FLOOR_Y - 1.0))
	rig.run(MiloInput.make(), 3)
	var safe: Vector2 = rig.milo.safe_position
	check(safe != Vector2.INF, "standing on the floor records safe ground")
	var before: float = Game.health
	rig.milo.global_position = Vector2(900.0, 300.0)
	rig.milo.hazard_respawn(18.0)
	check(Game.health < before, "lava hurts")
	check(rig.milo.global_position.distance_to(safe) < 1.0, "Milo is back on safe ground")
	check(rig.milo.velocity == Vector2.ZERO, "and stands still")
	rig.free_room()


func test_room_lava_is_a_pit_and_boss_lava_is_not() -> void:
	var pit := HazardZone.make(&"lava", Rect2(0.0, 0.0, 64.0, 64.0), 18.0)
	var attack := HazardZone.make(&"lava", Rect2(0.0, 0.0, 64.0, 64.0), 18.0, 0.5, 1.0)
	check(pit.is_pit(), "room lava respawns Milo")
	check(not attack.is_pit(), "a timed lava attack only hurts")
	pit.free()
	attack.free()
