class_name BoonRig
extends RefCounted
## A test room with Milo, his Specials and a few enemies, plus a clean run
## state holding exactly the boons a test asks for.

var rig: MiloRig
var specials: Specials
var tree: SceneTree


static func create(tree: SceneTree, boons: Dictionary = {}) -> BoonRig:
	var b := BoonRig.new()
	b.tree = tree
	for group: StringName in [Enemy.GROUP, &"arcane_bolt", EnemyShot.GROUP]:
		for node: Node in tree.get_nodes_in_group(group):
			node.free()
	GameCamera.hit_pause_enabled = false
	Save.reset_for_tests()
	set_boons(boons)
	b.rig = MiloRig.create(tree)
	b.rig.place(Vector2(300.0, 655.0))
	b.specials = Specials.new()
	b.specials.milo = b.rig.milo
	b.rig.milo.shield_check = b.specials.absorbs_hit
	b.rig.room.add_child(b.specials)
	b.specials.set_physics_process(false)
	return b


## Fresh run numbers with these boons ({id: stacks}).
static func set_boons(boons: Dictionary) -> void:
	Game.boons = boons.duplicate()
	Game.boons_suppressed = false
	Game.max_health = 100.0
	Game.health = 100.0
	Game.max_energy = 60.0
	Game.energy = 60.0
	Game.shield = 0.0
	Game.wealth = 0
	Game.room_damage_bonus = 0.0
	Game.corruption = 0.0
	Game.appetite_buffs.clear()
	Game.rng.seed = 1234
	RoomRules.clear()


func enemy(at: Vector2, health: float = 100.0) -> Enemy:
	var e := Imp.new()
	rig.room.add_child(e)
	e.global_position = at
	e.max_health = health
	e.health = health
	e.spawn_timer = 0.0
	e.aggro = true
	e.set_physics_process(false)
	return e


func boss(at: Vector2) -> Enemy:
	var e: Enemy = enemy(at, 600.0)
	e.is_boss = true
	e.status.is_boss = true
	return e


## A bolt with the current boons, fired right from Milo's hand.
func bolt_stats() -> BoltStats:
	return BoonEffects.bolt_stats(rig.caster.tuning)


## Lands one bolt hit on `target` the way a real bolt does.
func bolt_hit(target: Enemy, stats: BoltStats = null) -> Hit:
	if stats == null:
		stats = bolt_stats()
	stats.crit_chance = 0.0
	var hit: Hit = stats.make_hit(Vector2.RIGHT, Game.rng)
	BoonHooks.modify_hit(target, hit)
	target.take_hit(hit)
	BoonHooks.after_hit(target, hit, stats, rig.room)
	return hit


func step(seconds: float) -> void:
	for i: int in int(seconds * 60.0):
		specials._physics_process(1.0 / 60.0)


func done() -> void:
	rig.room.free()
	GameCamera.hit_pause_enabled = true
	BoonRig.set_boons({})
