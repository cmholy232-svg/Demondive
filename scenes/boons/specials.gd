class_name Specials
extends Node
## Milo's equipped Special (K / Y button). Costs Demon Energy; each
## boon-giver's Special does what its card says.

signal used(boon: StringName)

const COOLDOWN: float = 0.35

var milo: Milo
var barrier_hits: int = 0
var barrier_timer: float = 0.0
var _cooldown: float = 0.0


func _physics_process(delta: float) -> void:
	_cooldown = maxf(0.0, _cooldown - delta)
	if barrier_timer > 0.0:
		barrier_timer -= delta
		if barrier_timer <= 0.0 or barrier_hits <= 0:
			_burst_barrier()
	if milo == null or not milo.controllable:
		return
	if milo.current_input.special_pressed:
		try_use()


func try_use() -> bool:
	var id: StringName = Game.special
	if id == &"" or _cooldown > 0.0:
		return false
	var cost: float = BoonEffects.special_cost(id)
	if not Game.spend_energy(cost):
		Audio.play_sfx(&"ui_move", -6.0)
		return false
	_cooldown = COOLDOWN
	var power: int = maxi(1, Game.stacks(id))
	match id:
		&"pyrra":
			_flame_nova(power)
		&"maris":
			_ground_wave(power)
		&"gaia":
			_stone_barrier(power)
		&"zephyra":
			_crosswind_burst(power)
		&"belladonna":
			_devour(power)
		_:
			_generic_burst(id, power)
	Audio.play_sfx(&"special", -2.0)
	Audio.play_boon(id, -6.0)
	used.emit(id)
	return true


func _origin() -> Vector2:
	return milo.global_position + Vector2(0.0, -64.0)


## Pyrra - Flame Nova: a close radial wave of Arcane flame that ignites.
func _flame_nova(power: int) -> void:
	ArcaneBlast.detonate(milo.get_parent(), _origin(), 230.0 + power * 25.0, 34.0 + power * 10.0, BoonCatalog.color(&"pyrra"), 2.0 + power * 0.5)
	GameCamera.impact_in(get_tree(), GameCamera.Tier.HEAVY, Vector2.ZERO)


## Maris - Ground Wave: a damaging wave forward that shoves enemies down the lane.
func _ground_wave(power: int) -> void:
	var facing: int = milo.facing
	var lane := Rect2(milo.global_position.x + (0.0 if facing > 0 else -720.0), milo.global_position.y - 150.0, 720.0, 160.0)
	for enemy: Enemy in _enemies():
		if lane.has_point(enemy.global_position + Vector2(0.0, -10.0)):
			var hit := Hit.make(30.0 + power * 8.0, Vector2(facing, -0.2), 900.0 + power * 120.0)
			hit.source = &"special"
			enemy.take_hit(hit)
	Game.fx(&"wave", milo.global_position, BoonCatalog.color(&"maris"), float(facing))


## Gaia - Stone Barrier: absorbs hits, then bursts into shards.
func _stone_barrier(power: int) -> void:
	barrier_hits = 2 + power
	barrier_timer = 4.0 + power * 0.5
	Game.fx(&"barrier", _origin(), BoonCatalog.color(&"gaia"), 1.0)


func absorbs_hit() -> bool:
	if barrier_timer <= 0.0 or barrier_hits <= 0:
		return false
	barrier_hits -= 1
	Game.fx(&"hit", _origin(), BoonCatalog.color(&"gaia"), 1.4)
	return true


func _burst_barrier() -> void:
	barrier_timer = 0.0
	barrier_hits = 0
	if milo != null:
		ArcaneBlast.detonate(milo.get_parent(), _origin(), 260.0, 20.0 + Game.stacks(&"gaia") * 6.0, BoonCatalog.color(&"gaia"))


## Zephyra - Crosswind Burst: blasts every enemy away from Milo both ways,
## deals light damage and reflects nearby hostile shots.
func _crosswind_burst(power: int) -> void:
	for enemy: Enemy in _enemies():
		var away: float = signf(enemy.global_position.x - milo.global_position.x)
		var hit := Hit.make(10.0 + power * 4.0, Vector2(away, -0.3), 1100.0 if not enemy.is_boss else 0.0)
		hit.source = &"special"
		enemy.take_hit(hit)
	for node: Node in get_tree().get_nodes_in_group(EnemyShot.GROUP):
		var shot := node as EnemyShot
		if shot != null and shot.global_position.distance_to(_origin()) < 420.0:
			shot.reflect(shot.global_position - _origin())
	Game.fx(&"gust", _origin(), BoonCatalog.color(&"zephyra"), 1.0)


## Belladonna - Devour: eat a weakened enemy in front of Milo, executing it
## and restoring a little Health.
func _devour(power: int) -> void:
	var best: Enemy = null
	for enemy: Enemy in _enemies():
		var ahead: float = (enemy.global_position.x - milo.global_position.x) * milo.facing
		if ahead < -20.0 or ahead > 220.0 or absf(enemy.global_position.y - milo.global_position.y) > 160.0:
			continue
		if enemy.is_boss or (enemy.health > 60.0 and enemy.health_ratio() > 0.35):
			continue
		best = enemy
		break
	if best == null:
		Game.add_energy(BoonEffects.special_cost(&"belladonna"))
		return
	var hit := Hit.make(best.health + 1.0, Vector2(milo.facing, 0.0))
	hit.source = &"special"
	best.take_hit(hit)
	Game.heal(8.0 + power * 3.5)
	Game.fx(&"devour", best.center(), BoonCatalog.color(&"belladonna"), 1.2)


## Fallback for boon-givers whose Special is still being built.
func _generic_burst(id: StringName, power: int) -> void:
	ArcaneBlast.detonate(milo.get_parent(), _origin(), 240.0, 30.0 + power * 8.0, BoonCatalog.color(id))


func _enemies() -> Array[Enemy]:
	var out: Array[Enemy] = []
	for node: Node in get_tree().get_nodes_in_group(Enemy.GROUP):
		var enemy := node as Enemy
		if enemy != null and enemy.is_active():
			out.append(enemy)
	return out
