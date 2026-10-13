extends TestCase

const FLOOR_Y: float = 656.0
const OPEN_FLOOR_X: float = 300.0


func _rig() -> MiloRig:
	var rig := MiloRig.create(tree)
	rig.place(Vector2(OPEN_FLOOR_X, FLOOR_Y - 1.0))
	return rig


func _ticks_to_reverse(rig: MiloRig) -> int:
	rig.run(MiloInput.make(1), 40)
	var ticks: int = 0
	while rig.milo.velocity.x > -rig.milo.tuning.run_speed + 0.5 and ticks < 120:
		rig.tick(MiloInput.make(-1))
		ticks += 1
	return ticks


func test_full_reversal_takes_at_most_0_12_seconds() -> void:
	var rig := _rig()
	var seconds: float = _ticks_to_reverse(rig) * MiloRig.TICK
	check(seconds <= 0.12, "V2 reversal %.3f s should be <= 0.12 s" % seconds)
	rig.free_room()


func test_classic_profile_keeps_the_old_reversal() -> void:
	var rig := MiloRig.create(tree, "res://data/player/movement_classic.tres")
	rig.place(Vector2(OPEN_FLOOR_X, FLOOR_Y - 1.0))
	var seconds: float = _ticks_to_reverse(rig) * MiloRig.TICK
	check(seconds >= 0.19 and seconds <= 0.23, "classic reversal %.3f s should be about 0.21 s" % seconds)
	rig.free_room()


func test_run_reaches_run_speed() -> void:
	var rig := _rig()
	rig.run(MiloInput.make(1), 20)
	check_equal(rig.milo.velocity.x, rig.milo.tuning.run_speed, "run speed after 1/3 s")
	rig.free_room()


func test_held_jump_goes_higher_than_tapped_jump() -> void:
	var rig := _rig()
	var held_peak: float = _jump_peak(rig, 40)
	rig.place(Vector2(OPEN_FLOOR_X, FLOOR_Y - 1.0))
	var tapped_peak: float = _jump_peak(rig, 1)
	check(tapped_peak < held_peak * 0.75, "held %.0f px vs tapped %.0f px" % [held_peak, tapped_peak])
	check(held_peak > 205.0 and held_peak < 245.0, "full jump about 225 px (got %.0f)" % held_peak)
	rig.free_room()


func _jump_peak(rig: MiloRig, hold_ticks: int) -> float:
	var start_y: float = rig.milo.global_position.y
	var best: float = start_y
	rig.tick(MiloInput.make().with_jump())
	for i: int in 60:
		var input := MiloInput.make()
		if i < hold_ticks:
			input.jump_held = true
		rig.tick(input)
		best = minf(best, rig.milo.global_position.y)
	return start_y - best


func test_double_jump_once_then_refreshes_on_landing() -> void:
	var rig := _rig()
	rig.tick(MiloInput.make().with_jump())
	rig.run(MiloInput.make().with_jump(false), 15)
	rig.tick(MiloInput.make().with_jump())
	var jump_v: float = rig.milo.tuning.jump_velocity
	check(rig.milo.velocity.y < jump_v * 0.9, "air jump fires (vy %.0f)" % rig.milo.velocity.y)
	rig.run(MiloInput.make().with_jump(false), 5)
	rig.tick(MiloInput.make().with_jump())
	check(rig.milo.velocity.y > jump_v * 0.9, "no third jump")
	rig.run(MiloInput.make(), 90)
	check(rig.milo.is_on_floor(), "landed")
	check_equal(rig.milo.air_jumps_left, 1, "air jump refreshed")
	rig.free_room()


func test_coyote_time_allows_a_late_ground_jump() -> void:
	var rig := MiloRig.create(tree)
	# Run off the right edge of the solid block (x 860..1100, top 520).
	rig.place(Vector2(1000.0, 519.0))
	var ticks: int = 0
	while rig.milo.is_on_floor() and ticks < 120:
		rig.tick(MiloInput.make(1))
		ticks += 1
	rig.run(MiloInput.make(1), 6)
	rig.tick(MiloInput.make(1).with_jump())
	check(rig.milo.velocity.y < -700.0, "jump 7 ticks after leaving the edge (vy %.0f)" % rig.milo.velocity.y)
	check_equal(rig.milo.air_jumps_left, 1, "it was a ground jump, double jump kept")
	rig.free_room()


func test_jump_buffer_jumps_on_landing() -> void:
	var rig := _rig()
	rig.milo.global_position.y = FLOOR_Y - 200.0
	var landing_tick: int = _ticks_until_floor(rig, MiloInput.make())
	rig.place(Vector2(OPEN_FLOOR_X, FLOOR_Y - 200.0))
	rig.milo.global_position.y = FLOOR_Y - 200.0
	rig.milo.air_jumps_left = 0
	for i: int in landing_tick - 8:
		rig.tick(MiloInput.make())
	rig.milo.air_jumps_left = 0
	rig.tick(MiloInput.make().with_jump())
	rig.run(MiloInput.make().with_jump(false), 12)
	check(rig.milo.global_position.y < FLOOR_Y - 20.0, "buffered jump fired after landing (y=%.0f)" % rig.milo.global_position.y)
	rig.free_room()


func _ticks_until_floor(rig: MiloRig, input: MiloInput) -> int:
	var ticks: int = 0
	rig.tick(input)
	while not rig.milo.is_on_floor() and ticks < 200:
		rig.tick(input)
		ticks += 1
	return ticks + 1


func test_drop_through_one_way_ledge() -> void:
	var rig := MiloRig.create(tree)
	rig.place(Vector2(270.0, 555.0))
	check(rig.milo.standing_on_one_way, "standing on the low ledge")
	rig.tick(MiloInput.make(0, 1).with_jump())
	rig.run(MiloInput.make(), 40)
	check(absf(rig.milo.global_position.y - FLOOR_Y) < 2.0, "fell to the floor (y=%.0f)" % rig.milo.global_position.y)
	rig.free_room()
