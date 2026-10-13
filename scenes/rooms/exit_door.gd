class_name ExitDoor
extends Area2D
## A way out of the room. Sealed while enemies remain; once open it shows
## what waits behind it, and Milo steps through with Up or Interact.

signal chosen(door: ExitDoor)

const SIZE: Vector2 = Vector2(128.0, 192.0)

## What the next room will give: boon, shards, feast, or the room kind (boss...).
var reward: StringName = &"boon"
var open: bool = false
var milo_near: bool = false


func _ready() -> void:
	add_to_group(&"exit_doors")
	collision_layer = 0
	collision_mask = PhysicsLayers.PLAYER
	monitorable = false
	var shape := CollisionShape2D.new()
	var box := RectangleShape2D.new()
	box.size = SIZE
	shape.shape = box
	shape.position = Vector2(0.0, -SIZE.y * 0.5)
	add_child(shape)
	body_entered.connect(func(body: Node2D) -> void: milo_near = milo_near or body is Milo)
	body_exited.connect(func(body: Node2D) -> void: milo_near = milo_near and not body is Milo)


func _physics_process(_delta: float) -> void:
	if not open or not milo_near:
		return
	var milo: Milo = get_tree().get_first_node_in_group(&"milo") as Milo
	if milo == null or not milo.controllable:
		return
	if milo.current_input.interact_pressed or milo.current_input.up_pressed:
		chosen.emit(self)
