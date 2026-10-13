extends TestCase

const FLOOR_Y: float = 656.0


func test_bolt_fires_in_eight_directions_in_the_air() -> void:
	for x: int in [-1, 0, 1]:
		for y: int in [-1, 0, 1]:
			if x == 0 and y == 0:
				continue
			var rig := MiloRig.create(tree)
			rig.place(Vector2(300.0, FLOOR_Y - 1.0))
			rig.tick(MiloInput.make().with_jump())
			rig.run(MiloInput.make().with_jump(false), 4)
			var aim := ArcaneCaster.resolve_aim(MiloInput.make(x, y), false, 1)
			var bolt: ArcaneBolt = rig.caster.fire(aim)
			check(bolt.velocity.normalized().distance_to(Vector2(x, y).normalized()) < 0.001, "air aim (%d,%d)" % [x, y])
			rig.free_room()


func test_ground_aim_rules() -> void:
	check_equal(ArcaneCaster.resolve_aim(MiloInput.make(), true, -1), Vector2.LEFT, "neutral fires the way Milo faces")
	check_equal(ArcaneCaster.resolve_aim(MiloInput.make(0, -1), true, 1), Vector2.UP, "up fires straight up")
	check_equal(ArcaneCaster.resolve_aim(MiloInput.make(0, 1), true, 1), Vector2(1, 1).normalized(), "down on the ground fires down-forward")


func test_bolt_leaves_from_the_casting_hand() -> void:
	var rig := MiloRig.create(tree)
	rig.place(Vector2(300.0, FLOOR_Y - 1.0))
	var aim := Vector2.RIGHT
	var bolt: ArcaneBolt = rig.caster.fire(aim)
	var hand: Vector2 = rig.milo.global_position + ArcaneCaster.hand_position(aim, 1)
	check(bolt.global_position.distance_to(hand) <= ArcaneCaster.MUZZLE_OFFSET + 0.5, "bolt spawns at the hand")
	rig.free_room()


func test_holding_magic_fires_at_the_cooldown_rate() -> void:
	var rig := MiloRig.create(tree)
	rig.place(Vector2(300.0, FLOOR_Y - 1.0))
	var shots: Array[int] = [0]
	rig.caster.cast.connect(func(_direction: Vector2) -> void: shots[0] += 1)
	rig.run(MiloInput.make().with_magic(), 60)
	var expected: int = ceili(1.0 / rig.caster.tuning.cooldown_seconds)
	check(absi(shots[0] - expected) <= 1, "%d shots in one second, expected about %d" % [shots[0], expected])
	rig.free_room()


func test_bolt_damages_a_target() -> void:
	var rig := MiloRig.create(tree)
	rig.place(Vector2(400.0, FLOOR_Y - 1.0))
	var target: TargetDummy = rig.room.get_node("Target1") as TargetDummy
	GameCamera.hit_pause_enabled = false
	rig.caster.fire(Vector2.RIGHT)
	for i: int in 40:
		await tree.physics_frame
	GameCamera.hit_pause_enabled = true
	check(target.health < target.max_health, "target took damage (health %.0f)" % target.health)
	rig.free_room()
