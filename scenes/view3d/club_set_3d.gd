class_name ClubSet3D
extends RefCounted
## Atmosphere for the Neon Maw: lacquered back wall, a dancing crowd behind
## the play plane, spotlight shafts, smoke haze and dark foreground props.
## Everything here is decoration; none of it touches gameplay.

const CROWD_Z_MIN: float = -2.95
const CROWD_Z_MAX: float = -2.2
const FOREGROUND_Z: float = 3.2

static var _wall_shader: Shader = preload("res://art/shaders/club_wall.gdshader")
static var _crowd_shader: Shader = preload("res://art/shaders/crowd.gdshader")
static var _shaft_shader: Shader = preload("res://art/shaders/light_shaft.gdshader")
static var _haze_shader: Shader = preload("res://art/shaders/haze.gdshader")
static var _dancer_mesh: ArrayMesh


static func build(root: Node3D, room: Room, wall_z: float, rng: RandomNumberGenerator) -> void:
	var data: RoomData = room.data
	var size: Vector2 = data.size_px()
	var floor_y: float = _floor_top(data, data.width / 2)
	_wall(root, size, wall_z, floor_y)
	_crowd(root, data, rng)
	_shafts(root, size, rng)
	_haze(root, size)
	_foreground(root, data, size, rng)


## Height in metres of the top of the bottom floor in column x.
static func _floor_top(data: RoomData, x: int) -> float:
	var y: int = data.height - 1
	while y > 0 and data.is_solid(x, y - 1):
		y -= 1
	return -float(y) * RoomData.TILE / Kit3D.PX_PER_M


static func _wall(root: Node3D, size: Vector2, wall_z: float, floor_y: float) -> void:
	var w: float = size.x / Kit3D.PX_PER_M + 30.0
	var h: float = size.y / Kit3D.PX_PER_M + 16.0
	var mat := ShaderMaterial.new()
	mat.shader = _wall_shader
	mat.set_shader_parameter("floor_y", floor_y)
	Kit3D.box(root, Kit3D.to_3d(size * 0.5, wall_z), Vector3(w, h, 0.4), mat)


static func _dancer() -> ArrayMesh:
	if _dancer_mesh != null:
		return _dancer_mesh
	var tool := SurfaceTool.new()
	tool.begin(Mesh.PRIMITIVE_TRIANGLES)
	var parts: Array = []
	var body := CapsuleMesh.new()
	body.radius = 0.22
	body.height = 1.25
	body.radial_segments = 10
	body.rings = 4
	parts.append([body, Transform3D(Basis.IDENTITY, Vector3(0.0, 0.62, 0.0))])
	var head := SphereMesh.new()
	head.radius = 0.15
	head.height = 0.32
	head.radial_segments = 10
	head.rings = 6
	parts.append([head, Transform3D(Basis.IDENTITY, Vector3(0.0, 1.42, 0.0))])
	for side: float in [-1.0, 1.0]:
		var horn := CylinderMesh.new()
		horn.top_radius = 0.0
		horn.bottom_radius = 0.045
		horn.height = 0.2
		horn.radial_segments = 6
		parts.append([horn, Transform3D(Basis.from_euler(Vector3(0.0, 0.0, -side * 0.5)), Vector3(side * 0.09, 1.58, 0.0))])
		var arm := CapsuleMesh.new()
		arm.radius = 0.06
		arm.height = 0.7
		arm.radial_segments = 6
		arm.rings = 2
		parts.append([arm, Transform3D(Basis.from_euler(Vector3(0.0, 0.0, side * 0.35)), Vector3(side * 0.3, 1.25, 0.0))])
	for part: Array in parts:
		tool.append_from(part[0] as Mesh, 0, part[1] as Transform3D)
	_dancer_mesh = tool.commit()
	return _dancer_mesh


static func _crowd(root: Node3D, data: RoomData, rng: RandomNumberGenerator) -> void:
	var spots: Array[Vector3] = []
	var floor_row: float = _floor_top(data, 1)
	for x: int in range(2, data.width - 2):
		var top: float = _floor_top(data, x)
		# Only on the main floor, and only where no wall rises behind the dancer.
		if absf(top - floor_row) > 1.0 or data.is_solid(x, int(-top * Kit3D.PX_PER_M / RoomData.TILE) - 2):
			continue
		var count: int = 1 if rng.randf() < 0.55 else 0
		for i: int in count:
			var px: float = (x + rng.randf()) * RoomData.TILE / Kit3D.PX_PER_M
			spots.append(Vector3(px, top, rng.randf_range(CROWD_Z_MIN, CROWD_Z_MAX)))
	if spots.is_empty():
		return
	var multimesh := MultiMesh.new()
	multimesh.transform_format = MultiMesh.TRANSFORM_3D
	multimesh.use_custom_data = true
	multimesh.mesh = _dancer()
	multimesh.instance_count = spots.size()
	for i: int in spots.size():
		var scale: float = rng.randf_range(0.72, 0.9)
		var basis := Basis.from_euler(Vector3(0.0, rng.randf_range(-0.6, 0.6), 0.0)).scaled(Vector3.ONE * scale)
		multimesh.set_instance_transform(i, Transform3D(basis, spots[i]))
		var arms_up: float = 1.0 if rng.randf() < 0.3 else 0.0
		multimesh.set_instance_custom_data(i, Color(rng.randf(), rng.randf_range(0.5, 1.0), arms_up, 0.0))
	var mat := ShaderMaterial.new()
	mat.shader = _crowd_shader
	mat.set_shader_parameter("rim_color", [NeonMawKit.MAGENTA, NeonMawKit.CYAN][rng.randi_range(0, 1)])
	var instance := MultiMeshInstance3D.new()
	instance.multimesh = multimesh
	instance.material_override = mat
	instance.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(instance)


static func _shafts(root: Node3D, size: Vector2, rng: RandomNumberGenerator) -> void:
	var w: float = size.x / Kit3D.PX_PER_M
	var h: float = size.y / Kit3D.PX_PER_M
	var count: int = int(w / 16.0) + 1
	for i: int in count:
		var color: Color = [NeonMawKit.MAGENTA, NeonMawKit.CYAN, NeonMawKit.AMBER][rng.randi_range(0, 2)]
		var top := Vector3((i + rng.randf_range(0.2, 0.8)) * w / count, -0.4, rng.randf_range(-2.0, -1.0))
		var length: float = h * rng.randf_range(0.7, 1.0)
		var mat := ShaderMaterial.new()
		mat.shader = _shaft_shader
		mat.set_shader_parameter("color", color)
		mat.set_shader_parameter("strength", rng.randf_range(0.035, 0.065))
		var mesh := CylinderMesh.new()
		mesh.top_radius = 0.12
		mesh.bottom_radius = length * 0.22
		mesh.height = length
		mesh.radial_segments = 20
		mesh.cap_top = false
		mesh.cap_bottom = false
		var beam := MeshInstance3D.new()
		beam.mesh = mesh
		beam.material_override = mat
		beam.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		var tilt: float = rng.randf_range(-0.35, 0.35)
		beam.rotation.z = tilt
		beam.position = top + Basis.from_euler(Vector3(0.0, 0.0, tilt)) * Vector3(0.0, -length * 0.5, 0.0)
		beam.set_meta("sweep", tilt)
		root.add_child(beam)
		Kit3D.box(root, top + Vector3(0.0, 0.15, 0.0), Vector3(0.4, 0.3, 0.4), Kit3D.material(Color(0.05, 0.04, 0.06), 0.4))
		Kit3D.sphere(root, top, 0.14, Kit3D.neon(color, 6.0))


static func _haze(root: Node3D, size: Vector2) -> void:
	var w: float = size.x / Kit3D.PX_PER_M + 20.0
	var h: float = size.y / Kit3D.PX_PER_M + 6.0
	for layer: Array in [[-1.6, Color(0.7, 0.15, 0.55), 0.05], [1.4, Color(0.3, 0.2, 0.7), 0.025]]:
		var mat := ShaderMaterial.new()
		mat.shader = _haze_shader
		mat.set_shader_parameter("color", layer[1] as Color)
		mat.set_shader_parameter("strength", layer[2] as float)
		var quad := QuadMesh.new()
		quad.size = Vector2(w, h)
		var sheet := MeshInstance3D.new()
		sheet.mesh = quad
		sheet.material_override = mat
		sheet.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		sheet.position = Kit3D.to_3d(size * 0.5, layer[0] as float)
		root.add_child(sheet)


## Props between the camera and the play plane: hanging cables with bulbs up
## high and a bar counter along the bottom, both kept clear of the action.
static func _foreground(root: Node3D, data: RoomData, size: Vector2, rng: RandomNumberGenerator) -> void:
	var w: float = size.x / Kit3D.PX_PER_M
	var h: float = size.y / Kit3D.PX_PER_M
	var dark: Material = Kit3D.material(Color(0.015, 0.008, 0.02), 0.6)
	var x: float = rng.randf_range(2.0, 8.0)
	while x < w:
		var length: float = rng.randf_range(1.0, h * 0.22)
		Kit3D.box(root, Vector3(x, -length * 0.5 + 1.0, FOREGROUND_Z), Vector3(0.05, length + 2.0, 0.05), dark)
		Kit3D.sphere(root, Vector3(x, -length - 0.9, FOREGROUND_Z), 0.11, Kit3D.neon(NeonMawKit.AMBER, 3.0))
		x += rng.randf_range(7.0, 14.0)
	var counter_top: float = _floor_top(data, 1) - 0.35
	Kit3D.box(root, Vector3(w * 0.5, counter_top - 1.0, FOREGROUND_Z - 0.6), Vector3(w + 10.0, 2.0, 0.8), dark)
	Kit3D.box(root, Vector3(w * 0.5, counter_top, FOREGROUND_Z - 0.18), Vector3(w + 10.0, 0.04, 0.04), Kit3D.neon(NeonMawKit.MAGENTA, 3.0))
