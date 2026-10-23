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
var _mechanics: MechanicViews3D
var _milo_view: MiloView3D
var _actors: ActorViews3D
var _fx: FxViews3D
var _specials: SpecialViews3D
var _time: float = 0.0
var _env_root: Node3D
var _room: Room
## side -> laser bars shown while the room's gate is barred.
var _gate_bars: Dictionary = {}
var _biome: String = ""


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
	_milo_view = MiloView3D.new()
	add_child(_milo_view)
	_milo_view.bind(milo)
	_actors = ActorViews3D.new()
	add_child(_actors)
	_fx = FxViews3D.new()
	add_child(_fx)
	_mechanics = MechanicViews3D.new()
	add_child(_mechanics)
	_specials = SpecialViews3D.new()
	add_child(_specials)
	_specials.bind(milo)


func milo_view() -> MiloView3D:
	return _milo_view


func build_room(room: Room, biome: String) -> void:
	if biome != _biome:
		_biome = biome
		if _env_root != null:
			_env_root.queue_free()
		_env_root = Node3D.new()
		add_child(_env_root)
		if biome == "hellroom":
			HellroomKit.environment(_env_root)
		elif BiomeKit.has(biome):
			BiomeKit.environment(_env_root, biome)
		else:
			NeonMawKit.environment(_env_root)
	if _room_root != null:
		_room_root.queue_free()
	_movers.clear()
	_spinners.clear()
	_room_root = Node3D.new()
	add_child(_room_root)
	var themed: bool = BiomeKit.has(biome)
	if biome == "hellroom":
		HellroomKit.build(_room_root, room)
	elif themed:
		BiomeKit.build(_room_root, room, biome)
	else:
		NeonMawKit.build(_room_root, room)
	for platform: MovingPlatform in room.builder.movers:
		_movers[platform] = BiomeKit.mover(_room_root, platform, biome) if themed else NeonMawKit.mover(_room_root, platform)
	_mechanics.bind(room, BiomeKit.theme(biome) if themed else {})
	for node: Node in _room_root.find_children("*", "MeshInstance3D", true, false):
		var mesh := node as MeshInstance3D
		if mesh.has_meta("spin") or mesh.has_meta("sweep") or mesh.has_meta("rise") or mesh.has_meta("drift") or mesh.has_meta("spin_z"):
			_spinners.append(mesh)
	_room = room
	_gate_bars = GateViews3D.build(_room_root, room)
	_actors.bind_room(room)
	_fx.bind_room(room)
	_sync_camera()


func _process(delta: float) -> void:
	_time += delta
	_sync_camera()
	if is_instance_valid(_room):
		for side: String in _gate_bars:
			(_gate_bars[side] as Node3D).visible = _room.gate_bars.has(side)
	for platform: Variant in _movers:
		var mover := platform as MovingPlatform
		if is_instance_valid(mover):
			(_movers[platform] as Node3D).position = Kit3D.to_3d(mover.global_position)
	for mesh: MeshInstance3D in _spinners:
		if mesh.has_meta("spin"):
			mesh.rotation.y += float(mesh.get_meta("spin")) * delta
		elif mesh.has_meta("spin_z"):
			mesh.rotation.z += float(mesh.get_meta("spin_z")) * delta
		elif mesh.has_meta("rise"):
			mesh.position.y += float(mesh.get_meta("rise")) * delta
			if mesh.position.y > float(mesh.get_meta("rise_floor")) + 9.0:
				mesh.position.y = float(mesh.get_meta("rise_floor")) + 0.3
		elif mesh.has_meta("drift"):
			mesh.position.y += sin(_time * float(mesh.get_meta("drift")) + mesh.position.x) * 0.15 * delta
			mesh.rotation.y += float(mesh.get_meta("drift")) * 0.2 * delta
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
