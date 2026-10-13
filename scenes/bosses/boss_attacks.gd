class_name BossAttacks
extends RefCounted
## The attack library data-driven bosses draw from (data/bosses/bosses.json).
## Each attack reads its numbers from a spec dictionary; "+phase" keys add
## that much per boss phase. Every attack is called after the boss's wind-up.


static func n(spec: Dictionary, key: String, fallback: float, phase: int) -> float:
	return float(spec.get(key, fallback)) + float(spec.get(key + "+phase", 0.0)) * phase


static func color(boss: PatternBoss, spec: Dictionary) -> Color:
	return boss.palette_color(str(spec.get("color", "a")))


static func run(boss: PatternBoss, spec: Dictionary) -> void:
	var p: int = boss.phase
	match str(spec.get("kind", "fan")):
		"fan":
			fan(boss, spec, p)
		"ring":
			ring(boss, spec, p)
		"lances":
			lances(boss, spec, p)
		"rain":
			rain(boss, spec, p)
		"pillars":
			pillars(boss, spec, p)
		"shockwave":
			shockwave(boss, spec, p)
		"charge":
			boss.start_charge(n(spec, "speed", 760.0, p), n(spec, "time", 0.9, p))
		"leap":
			boss.start_leap(n(spec, "height", 900.0, p), spec)
		"vortex":
			boss.start_vortex(n(spec, "pull", 520.0, p), n(spec, "time", 1.6, p))
			ring(boss, spec, p)
		"beam":
			beam(boss, spec, p)
		"homing":
			homing(boss, spec, p)
		"delayed":
			delayed(boss, spec, p)
		"summon":
			summon(boss, spec, p)
		"teleport":
			boss.teleport_behind_milo()
			fan(boss, spec, p)
		"reflect":
			boss.start_reflect(n(spec, "time", 1.6, p))
		"copy":
			copy(boss, spec, p)


static func fan(boss: PatternBoss, spec: Dictionary, p: int) -> void:
	var count: int = int(n(spec, "count", 5.0, p))
	var spread: float = n(spec, "spread", 0.18, p)
	var aim: Vector2 = boss.aim_at_milo(boss.center())
	for i: int in count:
		var offset: float = (float(i) - float(count - 1) * 0.5) * spread
		boss.shoot(aim.rotated(offset), n(spec, "speed", 400.0, p), n(spec, "damage", 12.0, p), color(boss, spec), n(spec, "radius", 12.0, 0))


static func ring(boss: PatternBoss, spec: Dictionary, p: int) -> void:
	var count: int = int(n(spec, "ring", n(spec, "count", 12.0, p), p))
	var turn: float = boss.rng.randf() * TAU
	for i: int in count:
		boss.shoot(Vector2.RIGHT.rotated(turn + TAU * i / count), n(spec, "speed", 330.0, p), n(spec, "damage", 12.0, p), color(boss, spec), 12.0)


static func lances(boss: PatternBoss, spec: Dictionary, p: int) -> void:
	var heights: Array = spec.get("heights", [40.0, 150.0]) as Array
	for height: Variant in heights:
		for direction: Vector2 in [Vector2.LEFT, Vector2.RIGHT]:
			var shot: EnemyShot = boss.shoot(direction, n(spec, "speed", 600.0, p), n(spec, "damage", 14.0, p), color(boss, spec), 12.0)
			shot.global_position.y = boss.floor_y() - float(height)


## Shots fall from the ceiling across the arena, leaving one safe gap near Milo.
static func rain(boss: PatternBoss, spec: Dictionary, p: int) -> void:
	var spacing: float = n(spec, "spacing", 150.0, p)
	var milo: Milo = boss.milo()
	var gap_x: float = (milo.global_position.x if milo != null else boss.global_position.x) + boss.rng.randf_range(-160.0, 160.0)
	var x: float = boss.arena.position.x + boss.rng.randf_range(20.0, spacing)
	while x < boss.arena.end.x:
		if absf(x - gap_x) > spacing * 0.75:
			var drop: EnemyShot = boss.shoot(Vector2.DOWN, n(spec, "speed", 320.0, p), n(spec, "damage", 13.0, p), color(boss, spec), 13.0)
			drop.global_position = Vector2(x, boss.arena.position.y + 60.0)
			drop.life = 6.0
		x += spacing


## Columns that warn, then erupt: one under Milo and others spaced around it.
static func pillars(boss: PatternBoss, spec: Dictionary, p: int) -> void:
	var count: int = int(n(spec, "count", 3.0, p))
	var width: float = n(spec, "width", 140.0, 0)
	var gap: float = n(spec, "gap", 320.0, 0)
	var milo: Milo = boss.milo()
	var center: float = milo.global_position.x if milo != null else boss.global_position.x
	for i: int in count:
		var x: float = center + (float(i) - float(count - 1) * 0.5) * gap
		x = clampf(x, boss.arena.position.x + width * 0.5, boss.arena.end.x - width * 0.5)
		var top: float = boss.floor_y() - n(spec, "tall", 900.0, 0)
		var zone := HazardZone.make(StringName(str(spec.get("look", "pillar"))), Rect2(x - width * 0.5, top, width, boss.floor_y() - top), n(spec, "damage", 16.0, p), n(spec, "warn", 0.8, 0), n(spec, "active", 0.45, 0))
		zone.color = color(boss, spec)
		boss.add_hazard(zone)


## A wave rolls out along the floor both ways from the boss, step by step.
static func shockwave(boss: PatternBoss, spec: Dictionary, p: int) -> void:
	var steps: int = int(n(spec, "steps", 6.0, p))
	var width: float = n(spec, "width", 150.0, 0)
	for i: int in steps:
		for side: float in [-1.0, 1.0]:
			var x: float = boss.global_position.x + side * (width * 0.5 + i * width)
			if x < boss.arena.position.x or x > boss.arena.end.x:
				continue
			var zone := HazardZone.make(&"shockwave", Rect2(x - width * 0.5, boss.floor_y() - 70.0, width, 70.0), n(spec, "damage", 14.0, p), 0.12 + i * n(spec, "step_time", 0.09, 0), 0.18)
			zone.color = color(boss, spec)
			boss.add_hazard(zone)
	GameCamera.impact_in(boss.get_tree(), GameCamera.Tier.HEAVY, Vector2.DOWN)


## A band across the whole arena at Milo's height: warn, then a burst.
static func beam(boss: PatternBoss, spec: Dictionary, p: int) -> void:
	var milo: Milo = boss.milo()
	var y: float = (milo.global_position.y - 60.0) if milo != null else boss.floor_y() - 80.0
	var thick: float = n(spec, "thick", 90.0, 0)
	var zone := HazardZone.make(&"beam", Rect2(boss.arena.position.x, y - thick * 0.5, boss.arena.size.x, thick), n(spec, "damage", 18.0, p), n(spec, "warn", 0.75, 0), n(spec, "active", 0.35, 0))
	zone.color = color(boss, spec)
	boss.add_hazard(zone)


static func homing(boss: PatternBoss, spec: Dictionary, p: int) -> void:
	var count: int = int(n(spec, "count", 3.0, p))
	for i: int in count:
		var up := Vector2(boss.facing * 0.4, -1.0).normalized().rotated((float(i) - float(count - 1) * 0.5) * 0.5)
		var shot: EnemyShot = boss.shoot(up, n(spec, "speed", 300.0, p), n(spec, "damage", 12.0, p), color(boss, spec), 13.0)
		shot.homing = n(spec, "turn", 1.6, 0)
		shot.life = n(spec, "life", 3.2, 0)


## Orbs bloom in a ring around Milo, hang, then all fire at where he is.
static func delayed(boss: PatternBoss, spec: Dictionary, p: int) -> void:
	var milo: Milo = boss.milo()
	if milo == null:
		return
	var count: int = int(n(spec, "count", 6.0, p))
	var radius: float = n(spec, "radius", 300.0, 0)
	var center: Vector2 = milo.global_position + Vector2(0.0, -60.0)
	for i: int in count:
		var orb: EnemyShot = boss.shoot(Vector2.RIGHT, 0.0, n(spec, "damage", 12.0, p), color(boss, spec), 14.0)
		orb.global_position = center + Vector2.RIGHT.rotated(TAU * i / count) * radius
		orb.delay = n(spec, "delay", 0.9, 0) + i * 0.08
		orb.launch_speed = n(spec, "speed", 520.0, p)


static func summon(boss: PatternBoss, spec: Dictionary, p: int) -> void:
	var count: int = int(n(spec, "count", 2.0, p))
	var cap: int = int(spec.get("max", 4))
	if boss.minion_count() >= cap:
		return
	for i: int in count:
		var side: float = -1.0 if i % 2 == 0 else 1.0
		var x: float = clampf(boss.global_position.x + side * (180.0 + i * 60.0), boss.arena.position.x + 60.0, boss.arena.end.x - 60.0)
		boss.spawn_minion(EnemyFactory.make(StringName(str(spec.get("enemy", "imp")))), Vector2(x, boss.floor_y()))


## Better Milo and Vespera: a tight burst of Milo's own Arcane Bolts, in his colour.
static func copy(boss: PatternBoss, spec: Dictionary, p: int) -> void:
	var dominant: StringName = Game.dominant_boon()
	var tint: Color = BoonCatalog.color(dominant) if dominant != &"" else Color(0.8, 0.6, 1.0)
	var aim: Vector2 = boss.aim_at_milo(boss.center())
	for i: int in int(n(spec, "count", 3.0, p)):
		var shot: EnemyShot = boss.shoot(aim.rotated((i - 1) * 0.07), n(spec, "speed", 760.0, p), n(spec, "damage", 11.0, p), tint, 10.0)
		shot.global_position -= aim * i * 30.0
