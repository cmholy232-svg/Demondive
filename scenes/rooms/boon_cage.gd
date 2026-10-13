class_name BoonCage
extends Area2D
## A boon-giver sealed in a cage. Shoot it open to free her for good.

signal freed(boon: StringName)

const SIZE: Vector2 = Vector2(150.0, 230.0)

var boon: StringName = &"maris"
var health: float = 60.0
var flash_timer: float = 0.0
var broken: bool = false


func _ready() -> void:
	add_to_group(&"cages")
	collision_layer = PhysicsLayers.ENEMIES
	collision_mask = 0
	monitoring = false
	var shape := CollisionShape2D.new()
	var box := RectangleShape2D.new()
	box.size = SIZE
	shape.shape = box
	shape.position = Vector2(0.0, -SIZE.y * 0.5)
	add_child(shape)


func _physics_process(delta: float) -> void:
	flash_timer = maxf(0.0, flash_timer - delta)


func take_hit(hit: Hit) -> void:
	if broken:
		return
	health -= hit.damage
	flash_timer = 0.08
	Audio.play_sfx(&"cage_hit", -4.0)
	Game.fx(&"hit", global_position + Vector2(0.0, -SIZE.y * 0.5), BoonCatalog.color(boon), 1.0)
	if health <= 0.0:
		broken = true
		set_deferred("monitorable", false)
		Game.fx(&"blast", global_position + Vector2(0.0, -SIZE.y * 0.5), BoonCatalog.color(boon), 1.6)
		GameCamera.impact_in(get_tree(), GameCamera.Tier.HEAVY, Vector2.UP)
		freed.emit(boon)
