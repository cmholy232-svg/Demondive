extends TestCase
## The V4 feel rules: quick fall, corner correction, crisp dash ends, and a
## dash cooldown that only a real wavedash or waveland skips.

const FLOOR_Y: float = 656.0


func test_jump_comes_down_faster_than_it_goes_up() -> void:
	var rig := MiloRig.create(tree)
	rig.place(Vector2(300.0, FLOOR_Y - 1.0))
	rig.tick(MiloInput.make().with_jump())
	var rising: int = 1
	while rig.milo.velocity.y < 0.0 and rising < 120:
		rig.tick(MiloInput.make().with_jump(false))
		rising += 1
	var falling: int = 0
	while not rig.milo.is_on_floor() and falling < 120:
		rig.tick(MiloInput.make().with_jump(false))
		falling += 1
	check(falling < rising, "fall %d ticks should be shorter than rise %d ticks" % [falling, rising])
	check((rising + falling) * MiloRig.TICK < 0.85, "a full jump lands in under 0.85 s (%.2f s)" % [(rising + falling) * MiloRig.TICK])
	rig.free_room()


func test_head_slides_around_a_ceiling_corner() -> void:
	var rig := MiloRig.create(tree)
	rig.place(Vector2(300.0, FLOOR_Y - 1.0))
	# A ledge whose left edge overlaps Milo's right side by 6 px.
	var block := StaticBody2D.new()
	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = Vector2(184.0, 40.0)
	shape.shape = rect
	block.add_child(shape)
	block.position = Vector2(300.0 + 22.0 - 6.0 + 92.0, 430.0)
	rig.room.add_child(block)
	rig.tick(MiloInput.make().with_jump())
	var best: float = rig.milo.global_position.y
	for i: int in 40:
		rig.tick(MiloInput.make().with_jump(false))
		best = minf(best, rig.milo.global_position.y)
	check(best < 430.0, "jump carried Milo's feet past the ledge (top of arc %.0f)" % best)
	check(rig.milo.global_position.x < 300.0 - 5.0, "nudged left around the corner (x %.0f)" % rig.milo.global_position.x)
	rig.free_room()


func test_dash_hands_back_control_near_run_speed() -> void:
	var rig := MiloRig.create(tree)
	rig.place(Vector2(200.0, FLOOR_Y - 1.0))
	rig.tick(MiloInput.make(1).with_dash())
	while rig.milo.is_dashing():
		rig.tick(MiloInput.make())
	var run_speed: float = rig.milo.tuning.run_speed
	check(rig.milo.velocity.x <= run_speed * 1.2, "after the dash %.0f px/s, near run speed %.0f" % [rig.milo.velocity.x, run_speed])
	rig.free_room()


func test_straight_down_dash_is_not_a_waveland() -> void:
	var rig := MiloRig.create(tree)
	rig.place(Vector2(300.0, FLOOR_Y - 1.0))
	rig.tick(MiloInput.make(0, 1).with_dash())
	rig.tick(MiloInput.make(0, 1))
	check(not rig.milo.is_wave_sliding(), "no slide from a straight-down dash")
	check(not rig.milo.is_invulnerable(), "its i-frames end on touchdown")
	rig.tick(MiloInput.make(1).with_dash())
	check(not rig.milo.is_dashing(), "and it doesn't skip the cooldown")
	rig.free_room()


func test_wavedash_spam_is_not_permanent_invulnerability() -> void:
	var rig := MiloRig.create(tree)
	rig.place(Vector2(200.0, FLOOR_Y - 1.0))
	for i: int in 4:
		rig.tick(MiloInput.make(1, 1).with_dash())
		rig.tick(MiloInput.make(1, 1))
		check(rig.milo.is_wave_sliding(), "wavedash %d landed" % i)
		check(not rig.milo.is_invulnerable(), "wavedash %d i-frames end at touchdown" % i)
	rig.free_room()


func test_air_dash_waits_for_landing_then_cooldown() -> void:
	var rig := MiloRig.create(tree)
	rig.place(Vector2(300.0, FLOOR_Y - 1.0))
	rig.tick(MiloInput.make().with_jump())
	rig.run(MiloInput.make().with_jump(false), 4)
	rig.tick(MiloInput.make(1).with_dash())
	var ready_count: Array[int] = [0]
	rig.milo.dash_ready.connect(func() -> void: ready_count[0] += 1)
	var ticks: int = 0
	while not rig.milo.is_on_floor() and ticks < 120:
		rig.tick(MiloInput.make())
		ticks += 1
	rig.run(MiloInput.make(), int(rig.milo.tuning.dash_cooldown_seconds * 60.0) + 2)
	check_equal(ready_count[0], 1, "dash_ready fires once when the dash comes back")
	rig.tick(MiloInput.make(-1).with_dash())
	check(rig.milo.is_dashing(), "dash is back after landing and the cooldown")
	rig.free_room()


func test_waveland_announces_the_reset() -> void:
	var rig := MiloRig.create(tree)
	rig.place(Vector2(200.0, FLOOR_Y - 1.0))
	var ready_count: Array[int] = [0]
	rig.milo.dash_ready.connect(func() -> void: ready_count[0] += 1)
	rig.tick(MiloInput.make(1, 1).with_dash())
	rig.tick(MiloInput.make(1, 1))
	check_equal(ready_count[0], 1, "dash_ready fires on the wavedash that resets it")
	rig.free_room()
