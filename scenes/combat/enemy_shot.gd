class_name EnemyShot
extends Area2D
## A hostile projectile. Hurts Milo on touch and ends on solid walls.
## Optional gravity makes lobbed shots; reflect() turns it against enemies.

const GROUP: StringName = &"enemy_shots"

var velocity: Vector2 = Vector2.ZERO
var damage: float = 10.0
var radius: float = 11.0
var color: Color = Color(1.0, 0.45, 0.3)
var gravity_force: float = 0.0
var life: float = 4.0
var reflected: bool = false


func setup(new_velocity: Vector2, new_damage: float, new_radius: float, new_color: Color) -> void:
	velocity = new_velocity
	damage = new_damage
	radius = new_radius
	color = new_color


func _ready() -> void:
	add_to_group(GROUP)
	collision_layer = PhysicsLayers.ENEMY_SHOTS
	collision_mask = PhysicsLayers.WORLD | PhysicsLayers.PLAYER
	var shape := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = radius
	shape.shape = circle
	add_child(shape)
	body_entered.connect(_on_body_entered)
	area_entered.connect(_on_area_entered)


func _physics_process(delta: float) -> void:
	life -= delta
	if life <= 0.0:
		queue_free()
		return
	velocity.y += gravity_force * delta
	position += velocity * delta


## Sends the shot back the way it came as Milo's own (Zephyra, Vespera).
func reflect(new_direction: Vector2) -> void:
	if reflected:
		return
	reflected = true
	velocity = new_direction.normalized() * maxf(velocity.length(), 600.0) * 1.2
	collision_mask = PhysicsLayers.WORLD | PhysicsLayers.ENEMIES
	life = 2.0


func _on_body_entered(body: Node2D) -> void:
	if body is Milo:
		if not reflected:
			(body as Milo).take_damage(damage, global_position.x)
			queue_free()
		return
	queue_free()


func _on_area_entered(area: Area2D) -> void:
	if reflected and area is EnemyHurtbox:
		(area as EnemyHurtbox).take_hit(Hit.make(damage * 2.0, velocity, 200.0))
		queue_free()
