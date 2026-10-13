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
	position += velocity * delta


## Flat placeholder drawing for the 2D practice room.
func _draw() -> void:
	draw_circle(Vector2.ZERO, radius + 4.0, Color(0.75, 0.55, 1.0, 0.35))
	draw_circle(Vector2.ZERO, radius, Color(0.92, 0.86, 1.0))


func _on_area_entered(area: Area2D) -> void:
	if _spent or not area.has_method("take_hit") or _already_hit.has(area):
		return
	_already_hit.append(area)
	var hurtbox := area as EnemyHurtbox
	var was_burning: bool = hurtbox != null and hurtbox.enemy.is_burning()
	var hit: Hit = stats.make_hit(velocity, Game.rng)
	hit.damage = damage if hurtbox == null else hit.damage
	area.call("take_hit", hit)
	if was_burning and stats.blast_damage > 0.0:
		ArcaneBlast.detonate(get_parent(), global_position, stats.blast_radius, stats.blast_damage, BoonCatalog.color(&"pyrra"))
	if _pierce_left > 0:
		_pierce_left -= 1
		return
	_spent = true
	queue_free()


func _on_body_entered(_body: Node2D) -> void:
	if _spent:
		return
	_spent = true
	Game.fx(&"fizzle", global_position, stats.color, radius / 10.0)
	queue_free()
