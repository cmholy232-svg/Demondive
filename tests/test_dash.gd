extends TestCase

const FLOOR_Y: float = 656.0


func test_dash_goes_all_eight_directions() -> void:
	for x: int in [-1, 0, 1]:
		for y: int in [-1, 0, 1]:
			if x == 0 and y == 0:
				continue
			var rig := MiloRig.create(tree)
			rig.place(Vector2(640.0, 400.0))
			rig.milo.global_position = Vector2(300.0, 250.0)
			rig.tick(MiloInput.make(x, y).with_dash())
			var expected := Vector2(x, y).normalized() * rig.milo.tuning.dash_speed
			check(rig.milo.velocity.distance_to(expected) < 1.0, "dash (%d,%d) velocity %s" % [x, y, rig.milo.velocity])
			check(rig.milo.is_invulnerable(), "invulnerable while dashing (%d,%d)" % [x, y])
			rig.free_room()


func test_dash_covers_speed_times_duration() -> void:
	var rig := MiloRig.create(tree)
	rig.place(Vector2(200.0, FLOOR_Y - 1.0))
	var start_x: float = rig.milo.global_position.x
	rig.tick(MiloInput.make(1).with_dash())
	while rig.milo.is_dashing():
		rig.tick(MiloInput.make(1))
	var expected: float = rig.milo.tuning.dash_speed * rig.milo.tuning.dash_duration_seconds
	var travelled: float = rig.milo.global_position.x - start_x
	check(absf(travelled - expected) <= 16.0, "dash distance %.0f px, expected about %.0f" % [travelled, expected])
	rig.free_room()


func test_one_dash_in_the_air_until_landing() -> void:
	var rig := MiloRig.create(tree)
	rig.place(Vector2(300.0, FLOOR_Y - 1.0))
	rig.tick(MiloInput.make().with_jump())
	rig.run(MiloInput.make().with_jump(false), 5)
	rig.tick(MiloInput.make(1).with_dash())
	rig.run(MiloInput.make(), 15)
	rig.tick(MiloInput.make(-1).with_dash())
	check(not rig.milo.is_dashing(), "second air dash refused")
	rig.free_room()


func test_wavedash_slides_at_waveland_speed() -> void:
	var rig := MiloRig.create(tree)
	rig.place(Vector2(300.0, FLOOR_Y - 1.0))
	rig.tick(MiloInput.make().with_jump())
	rig.tick(MiloInput.make(1, 1).with_dash())
	var ticks: int = 0
	while not rig.milo.is_wave_sliding() and ticks < 20:
		rig.tick(MiloInput.make(1, 1))
		ticks += 1
	check(rig.milo.is_wave_sliding(), "wave slide started")
	# Same rule as Alpha 8.2: slide speed is the dash's horizontal share of waveland speed.
	var expected: float = Vector2(1, 1).normalized().x * rig.milo.tuning.waveland_speed
	check(absf(rig.milo.velocity.x - expected) < 1.0, "slide speed %.0f, expected %.0f" % [rig.milo.velocity.x, expected])
	rig.free_room()


func test_ground_wavedash_from_standing() -> void:
	var rig := MiloRig.create(tree)
	rig.place(Vector2(300.0, FLOOR_Y - 1.0))
	rig.tick(MiloInput.make(-1, 1).with_dash())
	rig.tick(MiloInput.make(-1, 1))
	check(rig.milo.is_wave_sliding(), "down-diagonal dash on the ground becomes a wave slide")
	rig.free_room()


func test_waveland_keeps_momentum_into_a_jump() -> void:
	var rig := MiloRig.create(tree)
	rig.place(Vector2(200.0, FLOOR_Y - 1.0))
	rig.tick(MiloInput.make(1, 1).with_dash())
	rig.tick(MiloInput.make(1))
	rig.tick(MiloInput.make(1).with_jump())
	check(rig.milo.velocity.x > rig.milo.tuning.run_speed + 100.0, "jump out of a wave slide keeps speed (%.0f)" % rig.milo.velocity.x)
	rig.free_room()
