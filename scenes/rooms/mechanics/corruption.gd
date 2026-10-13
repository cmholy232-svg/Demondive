class_name Corruption
extends Area2D
## Lilith's corruption: standing in it drains Health, but it soaks Milo's
## magic. After he steps out his bolts hit harder for a while, scaled by how
## long he stayed in.

const DRAIN_PER_SECOND: float = 7.0
const BONUS_PER_SECOND: float = 0.18
const BONUS_CAP: float = 0.45
const BONUS_SECONDS: float = 6.0

var rect: Rect2 = Rect2()


static func make(area: Rect2) -> Corruption:
	var pool := Corruption.new()
	pool.rect = area
	return pool


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


func _physics_process(delta: float) -> void:
	for body: Node2D in get_overlapping_bodies():
		if body is Milo and Game.health > 1.0:
			Game.drain(DRAIN_PER_SECOND * delta)
			Game.corruption = minf(BONUS_CAP, Game.corruption + BONUS_PER_SECOND * delta)
			Game.corruption_timer = BONUS_SECONDS
