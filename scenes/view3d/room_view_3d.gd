class_name RoomView3D
extends Node3D
## Draws the current room in 3D. The fight runs in 2D physics; this view
## only reads it. The 3D camera mirrors the 2D camera, so 2D overlays such
## as damage numbers line up with the 3D world at the play plane (z = 0).

const FOV_DEGREES: float = 34.0

## True while a 3D view is drawing. 2D placeholder visuals hide themselves when set.
static var active: bool = false

var camera: Camera3D
var _game_camera: GameCamera
var _milo: Milo
var _room_root: Node3D
var _movers: Dictionary = {}
var _spinners: Array[MeshInstance3D] = []
var _milo_view: MiloView3D
var _actors: ActorViews3D
var _fx: FxViews3D
var _time: float = 0.0


static func to_3d(point: Vector2, z: float = 0.0) -> Vector3:
	return Kit3D.to_3d(point, z)


func setup(game_camera: GameCamera, milo: Milo) -> void:
	active = true
	# The view is posed every rendered frame from interpolated 2D positions.
	physics_interpolation_mode = Node.PHYSICS_INTERPOLATION_MODE_OFF
	_game_camera = game_camera
	_milo = milo
	camera = Camera3D.new()
	camera.fov = FOV_DEGREES
	camera.far = 120.0
	add_child(camera)
	camera.current = true
	NeonMawKit.environment(self)
	_milo_view = MiloView3D.new()
	add_child(_milo_view)
	_milo_view.bind(milo)
	_actors = ActorViews3D.new()
	add_child(_actors)
	_fx = FxViews3D.new()
	add_child(_fx)


func build_room(room: Room, _biome: String) -> void:
	if _room_root != null:
		_room_root.queue_free()
	_movers.clear()
	_spinners.clear()
	_room_root = Node3D.new()
	add_child(_room_root)
	NeonMawKit.build(_room_root, room)
	for platform: MovingPlatform in room.builder.movers:
		_movers[platform] = NeonMawKit.mover(_room_root, platform)
	for node: Node in _room_root.find_children("*", "MeshInstance3D", true, false):
		var mesh := node as MeshInstance3D
		if mesh.has_meta("spin") or mesh.has_meta("sweep"):
			_spinners.append(mesh)
	_actors.bind_room(room)
	_fx.bind_room(room)
	_sync_camera()


func _process(delta: float) -> void:
	_time += delta
	_sync_camera()
	for platform: Variant in _movers:
		var mover := platform as MovingPlatform
		if is_instance_valid(mover):
			(_movers[platform] as Node3D).position = Kit3D.to_3d(mover.global_position)
	for mesh: MeshInstance3D in _spinners:
		if mesh.has_meta("spin"):
			mesh.rotation.y += float(mesh.get_meta("spin")) * delta
		else:
			mesh.rotation.z = float(mesh.get_meta("sweep")) + sin(_time * 0.5 + mesh.position.x) * 0.35


func _sync_camera() -> void:
	if _game_camera == null or camera == null:
		return
	var view_h: float = _game_camera.view_size().y / Kit3D.PX_PER_M
	var distance: float = (view_h * 0.5) / tan(deg_to_rad(FOV_DEGREES * 0.5))
	var center: Vector2 = _game_camera.get_screen_center_position()
	camera.position = Kit3D.to_3d(center, distance)
	camera.h_offset = _game_camera.offset.x / Kit3D.PX_PER_M
	camera.v_offset = -_game_camera.offset.y / Kit3D.PX_PER_M
