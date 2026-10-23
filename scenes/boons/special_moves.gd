class_name SpecialMoves
extends RefCounted
## The Specials of the boon-givers met after the Neon Maw. Each does what its
## card says; `power` is the boon's stack count (at least 1). Lasting effects
## (moon orb, crystal clone, mirror shell, halo charges) keep their timers on
## the Specials node, which ticks them.

const IDS: Array[StringName] = [
	&"flora", &"voltara", &"crya", &"luna", &"solara", &"nerissa", &"roxyne", &"calyptra",
	&"isolde", &"somnia", &"vespera", &"aurelia", &"noctissa", &"lilith", &"seraphine",
]
## Calyptra's dice: outcome -> base weight; stacks move weight off "hurt".
const DICE: Dictionary = {&"heal": 25.0, &"strike": 30.0, &"shards": 25.0, &"hurt": 15.0, &"boon": 1.0}
## Solara Lv 2: the lance leaves a light field that strikes this many more
## times, half a second apart, for this share of the lance.
const LIGHT_FIELD_TICKS: int = 4
const LIGHT_FIELD_SHARE: float = 0.3


static func has(id: StringName) -> bool:
	return IDS.has(id)


static func use(sp: Specials, id: StringName, power: int) -> void:
	match id:
		&"flora":
			thorn_bind(sp, power)
		&"voltara":
			arc_chain(sp, power)
		&"crya":
			whiteout(sp, power)
		&"luna":
			sp.moon_left = 6.0 + power
			Game.fx(&"sparkle", sp.origin(), BoonCatalog.color(&"luna"), 1.6)
		&"solara":
			radiant_lance(sp, power)
		&"nerissa":
			siren_call(sp, power)
		&"roxyne":
			predator_pounce(sp, power)
		&"calyptra":
			loaded_dice(sp, power)
		&"isolde":
			sp.echo_left = 5.0 + power
			sp.echo_count = 2 if BoonCatalog.rank(&"isolde") >= 3 else 1
			sp.echo_origin = sp.origin()
			Game.fx(&"frost", sp.echo_origin, BoonCatalog.color(&"isolde"), 1.4)
		&"somnia":
			velvet_feint(sp, power)
		&"vespera":
			sp.mirror_left = 3.0 + 0.5 * power
			Game.fx(&"mirror", sp.origin(), BoonCatalog.color(&"vespera"), 1.6)
		&"aurelia":
			for enemy: Enemy in sp.enemies():
				enemy.status.blind(4.0 + power)
			Game.fx(&"sparkle", sp.origin(), BoonCatalog.color(&"aurelia"), 2.4)
		&"noctissa":
			damage_blink(sp, power)
		&"lilith":
			blood_pact(sp, power)
		&"seraphine":
			sp.halo_charges = 2 + power
			Game.fx(&"halo", sp.origin(), BoonCatalog.color(&"seraphine"), 1.6)


static func _hit(enemy: Enemy, amount: float, from: Vector2, push: float = 0.0) -> void:
	var hit := Hit.make(amount, enemy.center() - from, push)
	hit.source = &"special"
	enemy.take_hit(hit)


## Flora - Thorn Bind: vines hold the nearest enemy in place (it can still fire).
static func thorn_bind(sp: Specials, power: int) -> void:
	var target: Enemy = sp.nearest(700.0, false)
	if target == null:
		target = sp.nearest(700.0, true)
	if target == null:
		return
	target.status.root(2.5 + 0.5 * power)
	if target.is_boss:
		target.status.slow(0.5, 2.5 + 0.5 * power)
	Game.fx(&"vine", target.center(), BoonCatalog.color(&"flora"), 1.2)
	_hit(target, 10.0 + 4.0 * power, sp.origin())


## Voltara - Arc Chain: lightning snaps through 3 + power enemies, stunning briefly.
static func arc_chain(sp: Specials, power: int) -> void:
	var from: Vector2 = sp.origin()
	var first: Enemy = sp.nearest(600.0, true)
	var chained: Array = []
	var next: Enemy = first
	while next != null and chained.size() < 3 + power:
		chained.append(next)
		Game.fx(&"spark", next.center(), BoonCatalog.color(&"voltara"), 1.2)
		_hit(next, 18.0 + 6.0 * power, from)
		if not next.is_boss and not next.dead:
			next.stun_timer = maxf(next.stun_timer, 0.6)
		from = next.center()
		var around: Array[Enemy] = BoonHooks.nearest(sp.get_tree(), from, 1, 320.0, chained)
		next = around[0] if not around.is_empty() else null


## Crya - Whiteout: every enemy in the room slows by half and frosts over.
static func whiteout(sp: Specials, power: int) -> void:
	for enemy: Enemy in sp.enemies():
		enemy.status.slow(0.5, 4.0 + power)
		Game.fx(&"frost", enemy.center(), BoonCatalog.color(&"crya"), 0.8)


## Solara - Radiant Lance: a vertical ray onto the strongest living target.
static func radiant_lance(sp: Specials, power: int) -> void:
	var target: Enemy = null
	for enemy: Enemy in sp.enemies():
		if target == null or enemy.health > target.health:
			target = enemy
	if target == null:
		return
	var x: float = target.global_position.x
	var y: float = target.center().y
	var delay: float = maxf(0.3, 0.6 - 0.05 * power)
	var tree: SceneTree = sp.get_tree()
	var field: bool = BoonCatalog.rank(&"solara") >= 2
	Game.fx(&"beam", Vector2(x, y), BoonCatalog.color(&"solara"), 0.4)
	tree.create_timer(delay, false, true).timeout.connect(func() -> void:
		Game.fx(&"beam", Vector2(x, y), BoonCatalog.color(&"solara"), 1.6)
		lance_strike(tree, x, 60.0 + 20.0 * power))
	if not field:
		return
	for i: int in LIGHT_FIELD_TICKS:
		tree.create_timer(delay + 0.5 * (i + 1), false, true).timeout.connect(func() -> void:
			Game.fx(&"beam", Vector2(x, y), BoonCatalog.color(&"solara"), 0.5)
			lance_strike(tree, x, (60.0 + 20.0 * power) * LIGHT_FIELD_SHARE))


## Every enemy standing in the lance's column takes the hit.
static func lance_strike(tree: SceneTree, x: float, amount: float) -> int:
	var struck: int = 0
	for enemy: Enemy in BoonHooks.living(tree):
		if absf(enemy.global_position.x - x) < 50.0 + enemy.size.x * 0.5:
			_hit(enemy, amount, Vector2(x, -10000.0))
			struck += 1
	return struck


## Nerissa - Siren Call: the nearest enemy is charmed; it drifts to Milo
## without attacking and takes extra damage. Lv 7 Chorus: the three nearest.
static func siren_call(sp: Specials, power: int) -> void:
	var count: int = 3 if BoonCatalog.rank(&"nerissa") >= 4 else 1
	var charmed: Array = []
	for i: int in count:
		var target: Enemy = null
		for enemy: Enemy in sp.enemies():
			if enemy.is_boss or charmed.has(enemy) or enemy.center().distance_to(sp.origin()) > 800.0:
				continue
			if target == null or enemy.center().distance_to(sp.origin()) < target.center().distance_to(sp.origin()):
				target = enemy
		if target == null:
			return
		charmed.append(target)
		target.status.charm(4.0 + power)
		Game.fx(&"charm", target.center(), BoonCatalog.color(&"nerissa"), 1.2)


## Roxyne - Predator Pounce: an invulnerable lunge through the lane; hits
## everything on the way and marks bosses for the hunt.
static func predator_pounce(sp: Specials, power: int) -> void:
	var milo: Milo = sp.milo
	var seconds: float = 0.22 + 0.03 * power
	var reach: float = 420.0 + 40.0 * power
	var start: Vector2 = milo.global_position
	milo.pounce(Vector2(milo.facing, 0.0), reach / seconds, seconds)
	var lane := Rect2(start.x + (0.0 if milo.facing > 0 else -reach), start.y - 170.0, reach, 180.0)
	for enemy: Enemy in sp.enemies():
		if lane.has_point(enemy.global_position + Vector2(0.0, -10.0)) or lane.has_point(enemy.center()):
			_hit(enemy, 40.0 + 12.0 * power, start, 300.0)
			if enemy.is_boss:
				enemy.status.mark(&"hunt")
	Game.fx(&"gust", sp.origin(), BoonCatalog.color(&"roxyne"), 1.0)


## Calyptra - Loaded Dice: heal, strike, shards, or a sting to Milo; very
## rarely a boon. Stacks move the odds away from the sting.
static func dice_weights(power: int) -> Dictionary:
	var weights: Dictionary = DICE.duplicate()
	var shift: float = minf(12.0, 3.0 * power)
	weights[&"hurt"] = float(weights[&"hurt"]) - shift
	weights[&"heal"] = float(weights[&"heal"]) + shift * 0.5
	weights[&"strike"] = float(weights[&"strike"]) + shift * 0.5
	return weights


static func roll_dice(rng: RandomNumberGenerator, power: int) -> StringName:
	var weights: Dictionary = dice_weights(power)
	var total: float = 0.0
	for w: Variant in weights.values():
		total += float(w)
	var roll: float = rng.randf() * total
	for outcome: Variant in weights:
		roll -= float(weights[outcome])
		if roll <= 0.0:
			return outcome as StringName
	return &"heal"


static func loaded_dice(sp: Specials, power: int) -> void:
	var outcome: StringName = roll_dice(Game.rng, power)
	BossAnnouncer.say(sp.get_tree(), Strings.text("dice.%s" % outcome))
	Game.fx(&"dice", sp.origin(), BoonCatalog.color(&"calyptra"), 1.4)
	match outcome:
		&"heal":
			Game.heal(20.0 + 5.0 * power)
		&"strike":
			var target: Enemy = sp.nearest(900.0, true)
			if target != null:
				_hit(target, 50.0 + 15.0 * power, sp.origin())
		&"shards":
			Game.add_run_shards(10 + 5 * power)
		&"hurt":
			Game.drain(8.0)
		&"boon":
			var options: Array[StringName] = BoonChoice.roll(Game.rng)
			if not options.is_empty():
				Game.add_boon(options[0])


## Somnia - Velvet Feint: a dense line of identical dream bolts; one is real
## and hits hard, the rest are harmless.
static func velvet_feint(sp: Specials, power: int) -> void:
	var caster: ArcaneCaster = sp.caster()
	if caster == null:
		return
	var count: int = 5 + power
	var real: int = Game.rng.randi_range(0, count - 1)
	var direction := Vector2(sp.milo.facing, 0.0)
	var base: BoltStats = BoonEffects.bolt_stats(caster.tuning)
	for i: int in count:
		var stats: BoltStats = base.duplicate_stats()
		stats.color = BoonCatalog.color(&"somnia")
		stats.split = 0
		if i == real:
			stats.damage = 45.0 + 15.0 * power
		else:
			stats.decoy = true
			stats.damage = 0.0
		var offset: float = (i - (count - 1) * 0.5) * 26.0
		caster.spawn_at(sp.origin() + Vector2(0.0, offset), direction, stats)


## Noctissa - Damage Blink: vanish forward along the lane, cutting every
## enemy on the path. Stops short of walls.
static func damage_blink(sp: Specials, power: int) -> void:
	var milo: Milo = sp.milo
	var reach: float = 360.0 + 40.0 * power
	var start: Vector2 = milo.global_position
	var space: PhysicsDirectSpaceState2D = milo.get_world_2d().direct_space_state
	var eye := Vector2(0.0, -60.0)
	var query := PhysicsRayQueryParameters2D.create(start + eye, start + eye + Vector2(milo.facing * reach, 0.0), PhysicsLayers.WORLD)
	var result: Dictionary = space.intersect_ray(query)
	if not result.is_empty():
		reach = maxf(0.0, absf((result["position"] as Vector2).x - start.x) - 40.0)
	var end := Vector2(start.x + milo.facing * reach, start.y)
	Game.fx(&"blink", milo.global_position + eye, BoonCatalog.color(&"noctissa"), 1.0)
	milo.global_position = end
	milo.reset_physics_interpolation()
	milo.invulnerable_timer = maxf(milo.invulnerable_timer, 0.35)
	var lane := Rect2(minf(start.x, end.x), start.y - 170.0, absf(end.x - start.x) + 1.0, 180.0)
	for enemy: Enemy in sp.enemies():
		if lane.has_point(enemy.global_position + Vector2(0.0, -10.0)) or lane.has_point(enemy.center()):
			_hit(enemy, 30.0 + 10.0 * power, start)
			enemy.status.wound(3.0 + 2.0 * power, 2.0)
	Game.fx(&"blink", end + eye, BoonCatalog.color(&"noctissa"), 1.0)


## Lilith - Blood Pact: pay 10% of max Health (never the last point) for
## +15% damage, plus 3% per stack, stacking until the room ends.
static func blood_pact(sp: Specials, power: int) -> void:
	Game.drain(Game.max_health * 0.1)
	Game.room_damage_bonus = minf(1.0, Game.room_damage_bonus + pact_bonus(power))
	Game.fx(&"devour", sp.origin(), BoonCatalog.color(&"lilith"), 1.2)


static func pact_bonus(power: int) -> float:
	return 0.15 + 0.03 * power
