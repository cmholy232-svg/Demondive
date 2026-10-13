class_name ForceZone
extends Area2D
## A current or a bubble vent: pushes Milo while he is inside. Only Milo
## rides them, so they read as his tools rather than traps.

var rect: Rect2 = Rect2()
## Acceleration in px/s^2.
var force: Vector2 = Vector2.ZERO
## Vents cancel gravity and lift; the push fades toward the top of the column.
var lift: bool = false


static func make(area: Rect2, push: Vector2) -> ForceZone:
	var zone := ForceZone.new()
	zone.rect = area
	zone.force = push
	return zone


func _ready() -> void:
	collision_layer = 0
	collision_mask = PhysicsLayers.PLAYER
	monitorable = false
	position = rect.get_center()
	var shape := CollisionShape2D.new()
	var box := RectangleShape2D.new()
	box.size = rect.size
	shape.shape = box
	add_child(shape)


func _physics_process(_delta: float) -> void:
	for body: Node2D in get_overlapping_bodies():
		var milo := body as Milo
		if milo == null or milo.is_dashing():
			continue
		if lift:
			var height: float = clampf((rect.end.y - milo.global_position.y) / rect.size.y, 0.0, 1.0)
			milo.push += force * (1.0 - height * 0.55)
			if milo.velocity.y > 200.0:
				milo.velocity.y = 200.0
		else:
			milo.push += force
