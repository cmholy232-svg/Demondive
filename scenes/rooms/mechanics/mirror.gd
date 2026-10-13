class_name Mirror
extends Area2D
## A standing mirror: every bolt and every enemy shot that reaches it comes
## straight back. Bank shots around corners, or get caught by your own.

var rect: Rect2 = Rect2()


static func make(area: Rect2) -> Mirror:
	var mirror := Mirror.new()
	mirror.rect = area
	return mirror


func _ready() -> void:
	collision_layer = 0
	collision_mask = PhysicsLayers.PLAYER_SHOTS | PhysicsLayers.ENEMY_SHOTS
	monitorable = false
	position = rect.get_center()
	var shape := CollisionShape2D.new()
	var box := RectangleShape2D.new()
	box.size = rect.size
	shape.shape = box
	add_child(shape)
	area_entered.connect(_on_area_entered)


func _on_area_entered(area: Area2D) -> void:
	var velocity: Vector2 = area.get("velocity") as Vector2 if area.get("velocity") != null else Vector2.ZERO
	if velocity.x == 0.0:
		return
	var bounced := Vector2(-velocity.x, velocity.y)
	area.set("velocity", bounced)
	var side: float = -signf(velocity.x)
	area.global_position.x = (rect.position.x if side < 0.0 else rect.end.x) + side * 14.0
	Game.fx(&"hit", area.global_position, Color(0.9, 0.85, 1.0), 0.6)
