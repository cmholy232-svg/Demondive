class_name MovingPlatform
extends AnimatableBody2D
## A one-way club platform that glides between two stops and carries
## Milo with it. Position is the middle of its top edge.

const SPEED: float = 150.0
const THICKNESS: float = 16.0

var width: float = 192.0
## Offsets from the start to the two stops (x for sideways, y for vertical).
var travel: Vector2 = Vector2.ZERO
var vertical: bool = false
var _origin: Vector2 = Vector2.ZERO
var _t: float = 0.0
var _span: float = 0.0


func _ready() -> void:
	add_to_group(&"one_way")
	add_to_group(&"movers")
	collision_layer = PhysicsLayers.ONE_WAY
	collision_mask = 0
	sync_to_physics = true
	_origin = position
	_span = absf(travel.y - travel.x)
	if _span > 0.0:
		var start_phase: float = clampf(-travel.x / (travel.y - travel.x), 0.0, 1.0)
		_t = acos(1.0 - 2.0 * start_phase) / PI
	var shape := CollisionShape2D.new()
	shape.name = "Shape"
	var box := RectangleShape2D.new()
	box.size = Vector2(width, THICKNESS)
	shape.shape = box
	shape.position = Vector2(0.0, THICKNESS * 0.5)
	shape.one_way_collision = true
	add_child(shape)


func _physics_process(delta: float) -> void:
	if _span <= 0.0:
		return
	_t += delta * SPEED / _span
	var phase: float = (1.0 - cos(_t * PI)) * 0.5
	var offset: float = lerpf(travel.x, travel.y, phase)
	position = _origin + (Vector2(0.0, offset) if vertical else Vector2(offset, 0.0))


func top_rect() -> Rect2:
	return Rect2(global_position - Vector2(width * 0.5, 0.0), Vector2(width, THICKNESS))
