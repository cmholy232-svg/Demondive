class_name RoomView3D
extends Node3D
## 3D look test. Draws the 2D test room in 3D: the fight still runs in 2D
## physics, and this view reads positions from it. F2 switches between the
## 2D placeholder look and this one.

## 100 px of gameplay space is 1 m in the 3D view.
const PX_PER_M: float = 100.0
const VIEW_SIZE: Vector2 = Vector2(1280.0, 720.0)
const FOV_DEGREES: float = 38.0
const FLOOR_DEPTH: float = 5.0
const LEDGE_DEPTH: float = 1.6

## True while the 3D look is showing. New 2D-only visuals hide themselves when set.
static var active: bool = false

var room: Node2D
var camera: Camera3D
var _game_camera: GameCamera


static func to_3d(point: Vector2, z: float = 0.0) -> Vector3:
	return Vector3(point.x / PX_PER_M, -point.y / PX_PER_M, z)


func build(target_room: Node2D, game_camera: GameCamera) -> void:
	room = target_room
	_game_camera = game_camera
	_build_camera()
	RoomDressing3D.build_environment(self)
	_build_geometry()
	RoomDressing3D.build_backdrop(self)
	var milo_view := MiloView3D.new()
	add_child(milo_view)
	milo_view.bind(room.get_node("Milo") as Milo)
	var props := PropViews3D.new()
	add_child(props)
	props.bind(room)


func _build_camera() -> void:
	camera = Camera3D.new()
	camera.fov = FOV_DEGREES
	var distance: float = (VIEW_SIZE.y * 0.5 / PX_PER_M) / tan(deg_to_rad(FOV_DEGREES * 0.5))
	camera.position = to_3d(VIEW_SIZE * 0.5, distance)
	camera.far = 80.0
	add_child(camera)


func set_active(on: bool) -> void:
	active = on
	visible = on
	camera.current = on


func _process(_delta: float) -> void:
	if _game_camera != null:
		camera.h_offset = _game_camera.offset.x / PX_PER_M
		camera.v_offset = -_game_camera.offset.y / PX_PER_M


func _build_geometry() -> void:
	for child: Node in room.get_children():
		var body := child as StaticBody2D
		if body == null:
			continue
		var shape_node := body.get_node_or_null("Shape") as CollisionShape2D
		if shape_node == null or not (shape_node.shape is RectangleShape2D):
			continue
		var size: Vector2 = (shape_node.shape as RectangleShape2D).size
		var center: Vector2 = body.global_position + shape_node.position
		var on_screen := Rect2(Vector2.ZERO, VIEW_SIZE).intersects(Rect2(center - size * 0.5, size))
		if not on_screen:
			continue
		var one_way: bool = body.is_in_group("one_way")
		if one_way:
			RoomDressing3D.add_ledge(self, center, size, LEDGE_DEPTH)
		elif size.x >= VIEW_SIZE.x * 0.9:
			RoomDressing3D.add_floor(self, center, size, FLOOR_DEPTH)
		else:
			RoomDressing3D.add_block(self, center, size, LEDGE_DEPTH * 1.4)
