class_name Specials
extends Node
## Milo's equipped Special (K / Y button). Costs Demon Energy; each
## boon-giver's Special does what its card says.

signal used(boon: StringName)

const COOLDOWN: float = 0.35

var milo: Milo
var barrier_hits: int = 0
var barrier_timer: float = 0.0
## Luna's moon orb: seconds left; it fires back the other way with each cast.
var moon_left: float = 0.0
## Isolde's crystal clone: seconds left, where it stands, how many fire.
var echo_left: float = 0.0
var echo_origin: Vector2 = Vector2.ZERO
var echo_count: int = 1
## Vespera's mirror shell: seconds left.
var mirror_left: float = 0.0
## Seraphine's halo: hits it will still negate.
var halo_charges: int = 0
var _cooldown: float = 0.0
var _caster_hooked: bool = false
## Seraphine's fragments, Gaia's stone shards and Vespera's riposte.
var companions: BoonCompanions

const MIRROR_RADIUS: float = 110.0


func _ready() -> void:
	add_to_group(&"specials")
	companions = BoonCompanions.new()
	companions.specials = self
	add_child(companions)


func _physics_process(delta: float) -> void:
	_cooldown = maxf(0.0, _cooldown - delta)
	_tick_lasting(delta)
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
	if id == &"" or _cooldown > 0.0 or Game.boons_suppressed:
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
		_ when SpecialMoves.has(id):
			SpecialMoves.use(self, id, power)
		_:
			_generic_burst(id, power)
	Audio.play_sfx(&"special", -2.0)
	Audio.play_boon(id, -6.0)
	used.emit(id)
	return true


func origin() -> Vector2:
	return milo.global_position + Vector2(0.0, -64.0)


func caster() -> ArcaneCaster:
	return milo.get_node_or_null("ArcaneCaster") as ArcaneCaster if milo != null else null


## Nearest living enemy to Milo within reach (bosses only when allowed).
func nearest(reach: float, bosses: bool) -> Enemy:
	var best: Enemy = null
	for enemy: Enemy in enemies():
		if enemy.is_boss and not bosses:
			continue
		var d: float = enemy.center().distance_to(origin())
		if d <= reach and (best == null or d < best.center().distance_to(origin())):
			best = enemy
	return best


func _tick_lasting(delta: float) -> void:
	if milo == null:
		return
	if not _caster_hooked and caster() != null:
		caster().cast.connect(_on_cast)
		_caster_hooked = true
	moon_left = maxf(0.0, moon_left - delta)
	echo_left = maxf(0.0, echo_left - delta)
	if mirror_left > 0.0:
		mirror_left -= delta
		for node: Node in get_tree().get_nodes_in_group(EnemyShot.GROUP):
			var shot := node as EnemyShot
			if shot != null and not shot.reflected and shot.global_position.distance_to(origin()) < MIRROR_RADIUS:
				shot.reflect(shot.global_position - origin())
				shot.damage *= mirror_power()


## Luna's orb and Isolde's clone copy every cast Milo makes.
func _on_cast(direction: Vector2) -> void:
	var c: ArcaneCaster = caster()
	if c == null or (moon_left <= 0.0 and echo_left <= 0.0):
		return
	var stats: BoltStats = BoonEffects.bolt_stats(c.tuning)
	stats.split = 0
	if moon_left > 0.0:
		var moon: BoltStats = stats.duplicate_stats()
		moon.color = BoonCatalog.color(&"luna")
		c.spawn_at(moon_orb_position(), -direction, moon)
	if echo_left > 0.0:
		for i: int in echo_count:
			var crystal: BoltStats = stats.duplicate_stats()
			crystal.color = BoonCatalog.color(&"isolde")
			c.spawn_at(echo_origin + Vector2(0.0, -40.0 * i), direction, crystal)


## Vespera: reflected shots gain 20% per stack, and double from Lv 4.
func mirror_power() -> float:
	return (1.0 + 0.2 * Game.stacks(&"vespera")) * (2.0 if BoonCatalog.rank(&"vespera") >= 3 else 1.0)


func moon_orb_position() -> Vector2:
	return origin() + Vector2(-milo.facing * 60.0, -70.0)


## Pyrra - Flame Nova: a close radial wave of Arcane flame that ignites.
func _flame_nova(power: int) -> void:
	ArcaneBlast.detonate(milo.get_parent(), origin(), 230.0 + power * 25.0, 34.0 + power * 10.0, BoonCatalog.color(&"pyrra"), 2.0 + power * 0.5)
	GameCamera.impact_in(get_tree(), GameCamera.Tier.HEAVY, Vector2.ZERO)


## Maris - Ground Wave: a damaging wave forward that shoves enemies down the
## lane. Lv 4 Second Wave: it rolls back toward Milo for another hit.
func _ground_wave(power: int) -> void:
	var facing: int = milo.facing
	var at: Vector2 = milo.global_position
	wave_hit(at, facing, power)
	if BoonCatalog.rank(&"maris") >= 3:
		get_tree().create_timer(0.45, false, true).timeout.connect(wave_hit.bind(at + Vector2(facing * 720.0, 0.0), -facing, power))


func wave_hit(at: Vector2, facing: int, power: int) -> int:
	var lane := Rect2(at.x + (0.0 if facing > 0 else -720.0), at.y - 150.0, 720.0, 160.0)
	var struck: int = 0
	for enemy: Enemy in enemies():
		if lane.has_point(enemy.global_position + Vector2(0.0, -10.0)):
			var hit := Hit.make(30.0 + power * 8.0, Vector2(facing, -0.2), 900.0 + power * 120.0)
			hit.source = &"special"
			enemy.take_hit(hit)
			struck += 1
	Game.fx(&"wave", at, BoonCatalog.color(&"maris"), float(facing))
	return struck


## Gaia - Stone Barrier: absorbs hits, then bursts into shards.
func _stone_barrier(power: int) -> void:
	barrier_hits = 2 + power
	barrier_timer = 4.0 + power * 0.5
	Game.fx(&"barrier", origin(), BoonCatalog.color(&"gaia"), 1.0)


func absorbs_hit() -> bool:
	if halo_charges > 0:
		halo_charges -= 1
		Game.fx(&"halo", origin(), BoonCatalog.color(&"seraphine"), 1.0)
		return true
	if barrier_timer <= 0.0 or barrier_hits <= 0:
		return false
	barrier_hits -= 1
	Game.fx(&"hit", origin(), BoonCatalog.color(&"gaia"), 1.4)
	return true


func _burst_barrier() -> void:
	barrier_timer = 0.0
	barrier_hits = 0
	if milo != null:
		ArcaneBlast.detonate(milo.get_parent(), origin(), 260.0, 20.0 + Game.stacks(&"gaia") * 6.0, BoonCatalog.color(&"gaia"))


## Zephyra - Crosswind Burst: blasts every enemy away from Milo both ways,
## deals light damage and reflects nearby hostile shots.
func _crosswind_burst(power: int) -> void:
	for enemy: Enemy in enemies():
		var away: float = signf(enemy.global_position.x - milo.global_position.x)
		var hit := Hit.make(10.0 + power * 4.0, Vector2(away, -0.3), 1100.0 if not enemy.is_boss else 0.0)
		hit.source = &"special"
		enemy.take_hit(hit)
	for node: Node in get_tree().get_nodes_in_group(EnemyShot.GROUP):
		var shot := node as EnemyShot
		if shot != null and shot.global_position.distance_to(origin()) < 420.0:
			shot.reflect(shot.global_position - origin())
	Game.fx(&"gust", origin(), BoonCatalog.color(&"zephyra"), 1.0)


## Belladonna - Devour: eat a weakened enemy in front of Milo, executing it
## and restoring a little Health. Lv 4 Gorge: bigger appetite, double healing.
func _devour(power: int) -> void:
	var gorge: bool = BoonCatalog.rank(&"belladonna") >= 3
	var best: Enemy = null
	for enemy: Enemy in enemies():
		var ahead: float = (enemy.global_position.x - milo.global_position.x) * milo.facing
		if ahead < -20.0 or ahead > 220.0 or absf(enemy.global_position.y - milo.global_position.y) > 160.0:
			continue
		if enemy.is_boss or (enemy.health > (120.0 if gorge else 60.0) and enemy.health_ratio() > (0.5 if gorge else 0.35)):
			continue
		best = enemy
		break
	if best == null:
		Game.add_energy(BoonEffects.special_cost(&"belladonna"))
		return
	var hit := Hit.make(best.health + 1.0, Vector2(milo.facing, 0.0))
	hit.source = &"special"
	best.take_hit(hit)
	Game.heal((8.0 + power * 3.5) * (2.0 if gorge else 1.0))
	Game.fx(&"devour", best.center(), BoonCatalog.color(&"belladonna"), 1.2)


## Fallback for boon-givers whose Special is still being built.
func _generic_burst(id: StringName, power: int) -> void:
	ArcaneBlast.detonate(milo.get_parent(), origin(), 240.0, 30.0 + power * 8.0, BoonCatalog.color(id))


func enemies() -> Array[Enemy]:
	var out: Array[Enemy] = []
	for node: Node in get_tree().get_nodes_in_group(Enemy.GROUP):
		var enemy := node as Enemy
		if enemy != null and enemy.is_active():
			out.append(enemy)
	return out
