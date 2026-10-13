class_name ArcaneBolt
extends Area2D
## A single Arcane Bolt. Flies straight, hits hurtboxes (passing through as
## many as its pierce allows), and ends on walls and floors. One-way
## platforms don't stop it.

var velocity: Vector2 = Vector2.ZERO
var damage: float = 0.0
var radius: float = 10.0
var life: float = 1.6
var stats: BoltStats = BoltStats.new()
var _pierce_left: int = 0
var _spent: bool = false
var _already_hit: Array[Object] = []
var _bounces_left: int = 0
var _last_position: Vector2 = Vector2.ZERO

@onready var shape: CollisionShape2D = $Shape


## Old entry point kept for tests and the practice room.
func setup(new_velocity: Vector2, new_damage: float, new_radius: float, new_life: float) -> void:
	velocity = new_velocity
	damage = new_damage
	radius = new_radius
	life = new_life
	stats.damage = new_damage
	stats.radius = new_radius
	stats.knockback = 0.0


func setup_stats(direction: Vector2, new_stats: BoltStats) -> void:
	stats = new_stats
	velocity = direction * stats.speed
	damage = stats.damage
	radius = stats.radius
	life = stats.life
	_pierce_left = stats.pierce
	_bounces_left = stats.bounces


func _ready() -> void:
	add_to_group("arcane_bolt")
	visible = not RoomView3D.active
	(shape.shape as CircleShape2D).radius = radius
	area_entered.connect(_on_area_entered)
	body_entered.connect(_on_body_entered)


func _physics_process(delta: float) -> void:
	life -= delta
	if life <= 0.0:
		queue_free()
		return
	if stats.homing > 0.0:
		_steer(delta)
	_last_position = global_position
	position += velocity * delta


## Nerissa: turn toward the nearest enemy ahead.
func _steer(delta: float) -> void:
	var best: Enemy = null
	var best_d: float = 520.0
	for enemy: Enemy in BoonHooks.living(get_tree()):
		var to: Vector2 = enemy.center() - global_position
		if to.length() < best_d and to.dot(velocity) > 0.0:
			best = enemy
			best_d = to.length()
	if best == null:
		return
	var want: float = (best.center() - global_position).angle()
	var turn: float = clampf(angle_difference(velocity.angle(), want), -stats.homing * delta, stats.homing * delta)
	velocity = velocity.rotated(turn)


## Flat placeholder drawing for the 2D practice room.
func _draw() -> void:
	draw_circle(Vector2.ZERO, radius + 4.0, Color(0.75, 0.55, 1.0, 0.35))
	draw_circle(Vector2.ZERO, radius, Color(0.92, 0.86, 1.0))


func _on_area_entered(area: Area2D) -> void:
	if _spent or not area.has_method("take_hit") or _already_hit.has(area):
		return
	_already_hit.append(area)
	var hurtbox := area as EnemyHurtbox
	if stats.decoy:
		if hurtbox != null:
			Game.fx(&"fizzle", global_position, stats.color, 1.0)
			_spent = true
			queue_free()
		return
	var was_burning: bool = hurtbox != null and hurtbox.enemy.is_burning()
	var hit: Hit = stats.make_hit(velocity, Game.rng)
	hit.damage = damage if hurtbox == null else hit.damage
	if hurtbox != null:
		BoonHooks.modify_hit(hurtbox.enemy, hit)
	area.call("take_hit", hit)
	if hurtbox != null:
		BoonHooks.after_hit(hurtbox.enemy, hit, stats, get_parent())
	if was_burning and stats.blast_damage > 0.0:
		ArcaneBlast.detonate(get_parent(), global_position, stats.blast_radius, stats.blast_damage, BoonCatalog.color(&"pyrra"))
	if _pierce_left > 0:
		_pierce_left -= 1
		return
	if _bounces_left > 0 and hurtbox != null:
		_bounces_left -= 1
		_ricochet_to_enemy(hurtbox.enemy)
		return
	_spent = true
	queue_free()


## Isolde: after a hit, the bolt flies on toward the nearest other enemy.
func _ricochet_to_enemy(from: Enemy) -> void:
	var next: Array[Enemy] = BoonHooks.nearest(get_tree(), global_position, 1, 700.0, [from])
	var speed: float = velocity.length()
	if next.is_empty():
		velocity = -velocity
	else:
		velocity = (next[0].center() - global_position).normalized() * speed
	life = maxf(life, 0.6)


func _on_body_entered(_body: Node2D) -> void:
	if _spent:
		return
	if _bounces_left > 0:
		_bounces_left -= 1
		_bounce_off_wall()
		return
	_spent = true
	Game.fx(&"fizzle", global_position, stats.color, radius / 10.0)
	queue_free()


## Isolde: reflect off the wall the bolt just touched.
func _bounce_off_wall() -> void:
	var space: PhysicsDirectSpaceState2D = get_world_2d().direct_space_state
	var query := PhysicsRayQueryParameters2D.create(_last_position - velocity.normalized() * radius, global_position + velocity.normalized() * (radius + 4.0), PhysicsLayers.WORLD)
	var result: Dictionary = space.intersect_ray(query)
	var normal: Vector2 = result.get("normal", Vector2.ZERO) as Vector2
	if normal == Vector2.ZERO:
		normal = Vector2(-signf(velocity.x), 0.0) if absf(velocity.x) > absf(velocity.y) else Vector2(0.0, -signf(velocity.y))
	velocity = velocity.bounce(normal)
	global_position = _last_position
	Game.fx(&"sparkle", global_position, BoonCatalog.color(&"isolde"), 0.6)
