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
## Radians per second the shot turns toward Milo (0 = straight).
var homing: float = 0.0
## Seconds the shot hangs still before it launches at Milo with launch_speed.
var delay: float = 0.0
var launch_speed: float = 0.0


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
	if delay > 0.0:
		delay -= delta
		if delay <= 0.0:
			var milo := get_tree().get_first_node_in_group(&"milo") as Node2D
			var aim: Vector2 = Vector2.DOWN if milo == null else (milo.global_position + Vector2(0.0, -60.0) - global_position).normalized()
			velocity = aim * launch_speed
		return
	life -= delta
	if life <= 0.0:
		queue_free()
		return
	if homing > 0.0 and not reflected:
		var milo := get_tree().get_first_node_in_group(&"milo") as Node2D
		if milo != null:
			var want: float = (milo.global_position + Vector2(0.0, -60.0) - global_position).angle()
			var turn: float = clampf(angle_difference(velocity.angle(), want), -homing * delta, homing * delta)
			velocity = velocity.rotated(turn)
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
