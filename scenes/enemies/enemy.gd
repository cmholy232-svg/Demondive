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

@export var kind: StringName = &"imp"
var size: Vector2 = Vector2(52.0, 88.0)
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

var _burn_tick: float = BURN_TICK
var _knock: Vector2 = Vector2.ZERO
var _hurtbox: Area2D


func _ready() -> void:
	add_to_group(GROUP)
	rng.seed = Game.rng.randi()
	_setup()
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
	if target != null and stun_timer <= 0.0:
		facing = 1 if target.global_position.x >= global_position.x else -1
	if stun_timer > 0.0:
		stun_timer -= delta
		velocity.x = move_toward(velocity.x, 0.0, 2400.0 * delta)
		if not flies:
			velocity.y = minf(velocity.y + GRAVITY * delta, 1200.0)
	else:
		think_timer -= delta
		_think(delta)
	velocity += _knock
	_knock = Vector2.ZERO
	move_and_slide()
	_touch_milo()


func milo() -> Milo:
	return get_tree().get_first_node_in_group(&"milo") as Milo


func center() -> Vector2:
	return global_position + Vector2(0.0, -size.y * 0.5)


func is_active() -> bool:
	return not dead and spawn_timer <= 0.0


func is_burning() -> bool:
	return burn_timer > 0.0


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
	velocity.x = clampf(velocity.x + direction * acceleration * delta, -top_speed, top_speed)
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
	var shot := EnemyShot.new()
	shot.setup(direction * speed, damage, radius, color)
	shot.global_position = center() + direction * size.x * 0.5
	get_parent().add_child(shot)
	return shot


# --- Damage -----------------------------------------------------------------

func take_hit(hit: Hit) -> void:
	if not is_active():
		return
	var amount: float = hit.damage
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


func die() -> void:
	if dead:
		return
	dead = true
	_hurtbox.set_deferred("monitorable", false)
	collision_layer = 0
	Game.kills += 1
	Pickup.drop_for(self)
	died.emit(self)
	_on_died()
	queue_free.call_deferred()


## Subclasses: extra effects on death.
func _on_died() -> void:
	pass


func _touch_milo() -> void:
	if contact_damage <= 0.0:
		return
	var target: Milo = milo()
	if target == null:
		return
	var mine := Rect2(global_position - Vector2(size.x * 0.4, size.y * 0.9), Vector2(size.x * 0.8, size.y * 0.9))
	if mine.intersects(target.hurt_rect()):
		target.take_damage(contact_damage, global_position.x)
