class_name Portal
extends Area2D
## A motel door that opens somewhere else in the same room. Stepping in
## carries Milo to its partner; a short cooldown stops him bouncing back.

const COOLDOWN: float = 0.9

var partner: Portal = null
var cooldown: float = 0.0


func _ready() -> void:
	add_to_group(&"portals")
	collision_layer = 0
	collision_mask = PhysicsLayers.PLAYER
	monitorable = false
	var shape := CollisionShape2D.new()
	var box := RectangleShape2D.new()
	box.size = Vector2(40.0, 100.0)
	shape.shape = box
	shape.position = Vector2(0.0, -50.0)
	add_child(shape)
	body_entered.connect(_on_body_entered)


func _physics_process(delta: float) -> void:
	cooldown = maxf(0.0, cooldown - delta)


func _on_body_entered(body: Node2D) -> void:
	var milo := body as Milo
	if milo == null or partner == null or cooldown > 0.0:
		return
	cooldown = COOLDOWN
	partner.cooldown = COOLDOWN
	Game.fx(&"portal", global_position + Vector2(0.0, -60.0), Color(0.75, 0.5, 1.0), 1.0)
	milo.global_position = partner.global_position
	milo.velocity.y = minf(milo.velocity.y, 0.0)
	milo.reset_physics_interpolation()
	Game.fx(&"portal", partner.global_position + Vector2(0.0, -60.0), Color(0.75, 0.5, 1.0), 1.0)
	Audio.play_sfx(&"door_open", -8.0, 0.1)
