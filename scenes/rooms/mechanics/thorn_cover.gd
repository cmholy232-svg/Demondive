class_name ThornCover
extends Area2D
## A thicket Milo can stand in: enemy shots die in the thorns. Enemies that
## haven't noticed Milo hide inside until they pounce.

var rect: Rect2 = Rect2()


static func make(area: Rect2) -> ThornCover:
	var bush := ThornCover.new()
	bush.rect = area
	return bush


func _ready() -> void:
	add_to_group(&"thorn_cover")
	collision_layer = 0
	collision_mask = PhysicsLayers.ENEMY_SHOTS
	monitorable = false
	position = rect.get_center()
	var shape := CollisionShape2D.new()
	var box := RectangleShape2D.new()
	box.size = rect.size
	shape.shape = box
	add_child(shape)
	area_entered.connect(_on_area_entered)


func _on_area_entered(area: Area2D) -> void:
	var shot := area as EnemyShot
	if shot == null or shot.reflected:
		return
	Game.fx(&"fizzle", shot.global_position, Color(0.45, 0.85, 0.35), 1.2)
	shot.queue_free()


static func hides(tree: SceneTree, at: Vector2) -> bool:
	for node: Node in tree.get_nodes_in_group(&"thorn_cover"):
		if (node as ThornCover).rect.grow(8.0).has_point(at + Vector2(0.0, -20.0)):
			return true
	return false
