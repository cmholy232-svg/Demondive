class_name Enemy
extends CharacterBody2D
## Base for every hostile creature. Positions are at the feet, like Milo.
## Subclasses override _think() for their behaviour and set attack_pose so the
## 3D view can show a readable wind-up before every attack.

signal died(enemy: Enemy)
signal damaged(amount: float)

const GRAVITY: float = 2350.0
const SPAWN_SECONDS: float = 0.7
const FLASH_SECONDS: float = 0.09
const BURN_TICK: float = 0.5
const GROUP: StringName = &"enemies"
const AGGRO_RANGE: float = 1100.0
## Enemies with at least this much health count as elites for boons.
const ELITE_HEALTH: float = 120.0
## Charmed enemies take extra damage (Nerissa's Siren Call).
const CHARM_DAMAGE: float = 1.25
const WOUND_TICK: float = 0.5

@export var kind: StringName = &"imp"
## Level variant from data/enemies/variants.json ("" = the plain archetype).
var variant: StringName = &""
## Recolour for the 3D model (main, dark, eye, accent hex strings).
var palette: Dictionary = {}
## Movement and attack tempo multiplier from the variant.
var speed_scale: float = 1.0
var _shot_color: Color = Color(0, 0, 0, 0)
## Set by the room before the enemy enters the tree (level depth, room rules).
var health_scale: float = 1.0
var damage_scale: float = 1.0
var tempo_scale: float = 1.0
var shard_scale: int = 1
var size: Vector2 = Vector2(52.0, 88.0)
## Below this the enemy has fallen out of every room (rooms are far smaller).
const PIT_FLOOR_Y: float = 20000.0
var max_health: float = 40.0
var health: float = 40.0
var contact_damage: float = 10.0
## 0..1, how much knockback moves this enemy (bosses resist).
var knock_taken: float = 1.0
var is_boss: bool = false
var flies: bool = false
var facing: int = -1
var shards_dropped: int = 1
## Name of the pose the 3D view should show ("idle", "move", "windup", "attack", "hurt").
var attack_pose: StringName = &"idle"
var pose_timer: float = 0.0
var spawn_timer: float = SPAWN_SECONDS
var flash_timer: float = 0.0
var stun_timer: float = 0.0
var burn_timer: float = 0.0
var burn_dps: float = 0.0
var dead: bool = false
## Enemies in big rooms wait until Milo comes close or hurts them.
var aggro: bool = false
var think_timer: float = 0.0
var rng := RandomNumberGenerator.new()
var status := EnemyStatus.new()

var _burn_tick: float = BURN_TICK
var _wound_tick: float = WOUND_TICK
var _knock: Vector2 = Vector2.ZERO
var _hurtbox: Area2D


func _ready() -> void:
	add_to_group(GROUP)
	rng.seed = Game.rng.randi()
	_setup()
	_apply_variant()
	max_health *= health_scale
	contact_damage *= damage_scale
	speed_scale *= tempo_scale
	shards_dropped *= shard_scale
	status.is_boss = is_boss
	collision_layer = PhysicsLayers.ENEMIES
	collision_mask = PhysicsLayers.WORLD | PhysicsLayers.ONE_WAY
	floor_snap_length = 6.0
	var body_shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = Vector2(size.x * 0.8, size.y * 0.9)
	body_shape.shape = rect
	body_shape.position = Vector2(0.0, -size.y * 0.45)
	add_child(body_shape)
	_hurtbox = EnemyHurtbox.new()
	_hurtbox.enemy = self
	var hurt_shape := CollisionShape2D.new()
	var hurt_rect := RectangleShape2D.new()
	hurt_rect.size = size
	hurt_shape.shape = hurt_rect
	hurt_shape.position = Vector2(0.0, -size.y * 0.5)
	_hurtbox.add_child(hurt_shape)
	add_child(_hurtbox)
	health = max_health
	think_timer = rng.randf_range(0.6, 1.4)


## Subclasses set size, health and damage here, before the collision shapes are built.
func _setup() -> void:
	pass


func _apply_variant() -> void:
	if variant == &"":
		return
	var spec: Dictionary = EnemyFactory.variant(variant)
	max_health *= float(spec.get("health", 1.0))
	contact_damage *= float(spec.get("damage", 1.0))
	speed_scale = float(spec.get("speed", 1.0))
	size *= float(spec.get("scale", 1.0))
	palette = spec.get("palette", {}) as Dictionary
	if spec.has("shot"):
		_shot_color = Color.html(str(spec["shot"]))
	shards_dropped += int(spec.get("shards", 0))


## The variant's projectile colour, or the archetype's own.
func shot_color(fallback: Color) -> Color:
	return _shot_color if _shot_color.a > 0.0 else fallback


## Subclasses: behaviour for one tick. Movement goes through velocity.
func _think(_delta: float) -> void:
	pass


func _physics_process(delta: float) -> void:
	if dead:
		return
	flash_timer = maxf(0.0, flash_timer - delta)
	pose_timer = maxf(0.0, pose_timer - delta)
	if pose_timer <= 0.0 and attack_pose != &"idle" and attack_pose != &"move":
		attack_pose = &"idle"
	_tick_burn(delta)
	status.tick(delta)
	_tick_wound(delta)
	if spawn_timer > 0.0:
		spawn_timer -= delta
		return
	var target: Milo = milo()
	if not aggro:
		if target == null or target.global_position.distance_to(global_position) > AGGRO_RANGE:
			if not flies:
				apply_gravity(delta)
				move_and_slide()
			return
		aggro = true
	if target != null and stun_timer <= 0.0 and not status.is_frozen():
		facing = 1 if target.global_position.x >= global_position.x else -1
	if stun_timer > 0.0 or status.is_frozen():
		stun_timer = maxf(0.0, stun_timer - delta)
		velocity.x = move_toward(velocity.x, 0.0, 2400.0 * delta)
		velocity.y = minf(velocity.y + GRAVITY * delta, 1200.0) if not flies else move_toward(velocity.y, 0.0, 2400.0 * delta)
	elif status.is_charmed():
		_follow_charm(target, delta)
	else:
		think_timer -= delta * speed_scale * status.speed_factor()
		_think(delta)
		if status.is_rooted():
			velocity.x = 0.0
			if flies:
				velocity.y = 0.0
	velocity += _knock
	_knock = Vector2.ZERO
	move_and_slide()
	_touch_milo()
	_check_pits()


## Walkers knocked into lava or spikes, or out of the room, die there, so a
## room can't be left waiting on an enemy nobody can reach.
func _check_pits() -> void:
	if flies or is_boss:
		return
	if global_position.y > PIT_FLOOR_Y:
		die()
		return
	for node: Node in get_tree().get_nodes_in_group(HazardZone.GROUP):
		var zone := node as HazardZone
		if zone != null and zone.is_pit() and zone.rect.grow(-4.0).has_point(global_position + Vector2(0.0, -4.0)):
			Game.fx_requested.emit(&"ember", global_position, zone.color, 1.5)
			die()
			return


func milo() -> Milo:
	return get_tree().get_first_node_in_group(&"milo") as Milo


func center() -> Vector2:
	return global_position + Vector2(0.0, -size.y * 0.5)


func is_active() -> bool:
	return not dead and spawn_timer <= 0.0


func is_burning() -> bool:
	return burn_timer > 0.0


func is_elite() -> bool:
	return is_boss or max_health >= ELITE_HEALTH


func is_flashing() -> bool:
	return flash_timer > 0.0


func health_ratio() -> float:
	return clampf(health / max_health, 0.0, 1.0)


func set_pose(pose: StringName, seconds: float) -> void:
	attack_pose = pose
	pose_timer = seconds


# --- Movement helpers -------------------------------------------------------

func apply_gravity(delta: float, cap: float = 1100.0) -> void:
	velocity.y = minf(velocity.y + GRAVITY * delta, cap)


func walk(direction: int, acceleration: float, top_speed: float, delta: float) -> void:
	var top: float = top_speed * speed_scale * status.speed_factor()
	velocity.x = clampf(velocity.x + direction * acceleration * speed_scale * delta, -top, top)
	if absf(velocity.x) > 20.0 and attack_pose == &"idle":
		attack_pose = &"move"


func distance_to_milo() -> float:
	var target: Milo = milo()
	return INF if target == null else target.global_position.distance_to(global_position)


func aim_at_milo(from: Vector2) -> Vector2:
	var target: Milo = milo()
	if target == null:
		return Vector2(facing, 0.0)
	return (target.global_position + Vector2(0.0, -64.0) - from).normalized()


func shoot(direction: Vector2, speed: float, damage: float, color: Color, radius: float = 11.0) -> EnemyShot:
	if status.is_blind():
		direction = direction.rotated(rng.randf_range(0.45, 0.8) * (1.0 if rng.randf() < 0.5 else -1.0))
	var shot := EnemyShot.new()
	shot.setup(direction * speed, damage * RoomRules.enemy_damage(), radius, shot_color(color))
	shot.global_position = center() + direction * size.x * 0.5
	get_parent().add_child(shot)
	return shot


# --- Damage -----------------------------------------------------------------

func take_hit(hit: Hit) -> void:
	if not is_active():
		return
	var amount: float = hit.damage * (CHARM_DAMAGE if status.is_charmed() else 1.0)
	hit.damage = amount
	aggro = true
	health -= amount
	flash_timer = FLASH_SECONDS
	if hit.knockback > 0.0 and knock_taken > 0.0:
		var push := Vector2(hit.direction.x, minf(hit.direction.y, -0.25)).normalized() * hit.knockback * knock_taken
		_knock += push
	if hit.burn_seconds > 0.0:
		burn_timer = maxf(burn_timer, 0.0) + hit.burn_seconds * (0.6 if is_burning() else 1.0)
		burn_dps = maxf(burn_dps, hit.burn_dps)
	if hit.stun_seconds > 0.0 and not is_boss:
		stun_timer = maxf(stun_timer, hit.stun_seconds)
	if not is_boss and pose_timer <= 0.0:
		set_pose(&"hurt", 0.15)
	damaged.emit(amount)
	CombatFeedback.enemy_hit(self, hit, health <= 0.0)
	if health <= 0.0:
		die()


func _tick_burn(delta: float) -> void:
	if burn_timer <= 0.0:
		return
	burn_timer -= delta
	_burn_tick -= delta
	if _burn_tick <= 0.0:
		_burn_tick = BURN_TICK
		var hit := Hit.make(burn_dps * BURN_TICK, Vector2.UP)
		hit.source = &"burn"
		take_hit(hit)


func _tick_wound(delta: float) -> void:
	if status.wound_left <= 0.0:
		return
	_wound_tick -= delta
	if _wound_tick <= 0.0:
		_wound_tick = WOUND_TICK
		var hit := Hit.make(status.wound_dps * WOUND_TICK, Vector2.UP)
		hit.source = &"wound"
		take_hit(hit)


## Charmed: drifts toward Milo without attacking.
func _follow_charm(target: Milo, delta: float) -> void:
	if target == null:
		return
	var to: Vector2 = target.global_position - global_position
	if absf(to.x) > 70.0:
		velocity.x = move_toward(velocity.x, signf(to.x) * 90.0, 600.0 * delta)
	else:
		velocity.x = move_toward(velocity.x, 0.0, 600.0 * delta)
	if flies:
		velocity.y = move_toward(velocity.y, signf(to.y - 60.0) * 60.0, 400.0 * delta)
	else:
		apply_gravity(delta)
	attack_pose = &"move" if absf(velocity.x) > 20.0 else &"idle"


func die() -> void:
	if dead:
		return
	dead = true
	_hurtbox.set_deferred("monitorable", false)
	collision_layer = 0
	Game.kills += 1
	Pickup.drop_for(self)
	BoonDeaths.on_death(self)
	died.emit(self)
	_on_died()
	queue_free.call_deferred()


## Subclasses: extra effects on death.
func _on_died() -> void:
	pass


func _touch_milo() -> void:
	if contact_damage <= 0.0 or status.is_charmed() or status.is_frozen():
		return
	var target: Milo = milo()
	if target == null:
		return
	var mine := Rect2(global_position - Vector2(size.x * 0.4, size.y * 0.9), Vector2(size.x * 0.8, size.y * 0.9))
	if mine.intersects(target.hurt_rect()):
		target.take_damage(contact_damage, global_position.x)
