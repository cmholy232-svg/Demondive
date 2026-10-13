class_name ArcaneBolt
extends Area2D
## A single Arcane Bolt. Flies straight, damages the first hurtbox it touches,
## and ends on walls and floors. One-way platforms don't stop it.

var velocity: Vector2 = Vector2.ZERO
var damage: float = 0.0
var radius: float = 10.0
var life: float = 1.6
var _spent: bool = false

@onready var shape: CollisionShape2D = $Shape


func setup(new_velocity: Vector2, new_damage: float, new_radius: float, new_life: float) -> void:
	velocity = new_velocity
	damage = new_damage
	radius = new_radius
	life = new_life


func _ready() -> void:
	add_to_group("arcane_bolt")
	visible = not RoomView3D.active
	(shape.shape as CircleShape2D).radius = radius
	area_entered.connect(_on_area_entered)
	body_entered.connect(_on_body_entered)
	queue_redraw()


func _physics_process(delta: float) -> void:
	life -= delta
	if life <= 0.0:
		queue_free()
		return
	position += velocity * delta


func _draw() -> void:
	draw_circle(Vector2.ZERO, radius + 4.0, Color(0.75, 0.55, 1.0, 0.35))
	draw_circle(Vector2.ZERO, radius, Color(0.92, 0.86, 1.0))
	draw_line(Vector2.ZERO, -velocity.normalized() * radius * 2.6, Color(0.75, 0.55, 1.0, 0.6), radius * 0.9)


func _on_area_entered(area: Area2D) -> void:
	if _spent or not area.has_method("take_hit"):
		return
	_spent = true
	area.call("take_hit", damage, velocity.normalized())
	queue_free()


func _on_body_entered(_body: Node2D) -> void:
	if _spent:
		return
	_spent = true
	queue_free()
