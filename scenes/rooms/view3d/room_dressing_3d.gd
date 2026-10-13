class_name RoomDressing3D
extends RefCounted
## Materials, lights and set dressing for the 3D look test, in a Neon Maw
## club palette: dark stone, magenta and amber neon, warm key light from the
## top left.

const STONE: Color = Color(0.13, 0.1, 0.16)
const STONE_LIGHT: Color = Color(0.24, 0.18, 0.28)
const NEON_MAGENTA: Color = Color(1.0, 0.2, 0.65)
const NEON_AMBER: Color = Color(1.0, 0.55, 0.15)
const BACKDROP: Color = Color(0.03, 0.015, 0.04)


static func build_environment(root: Node3D) -> void:
	var environment := Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = BACKDROP
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color(0.38, 0.3, 0.5)
	environment.ambient_light_energy = 0.3
	environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	environment.glow_enabled = true
	environment.glow_intensity = 0.8
	environment.glow_bloom = 0.05
	environment.glow_hdr_threshold = 0.9
	environment.fog_enabled = true
	environment.fog_light_color = Color(0.12, 0.04, 0.12)
	environment.fog_density = 0.02
	var world := WorldEnvironment.new()
	world.environment = environment
	root.add_child(world)

	var key := DirectionalLight3D.new()
	key.light_color = Color(1.0, 0.85, 0.75)
	key.light_energy = 1.1
	key.shadow_enabled = true
	key.rotation_degrees = Vector3(-45.0, -35.0, 0.0)
	root.add_child(key)

	_add_omni(root, Vector3(1.5, -2.5, 1.5), NEON_MAGENTA, 2.2, 7.0)
	_add_omni(root, Vector3(11.0, -2.8, 1.5), NEON_AMBER, 2.0, 7.0)


static func _add_omni(root: Node3D, at: Vector3, color: Color, energy: float, reach: float) -> void:
	var light := OmniLight3D.new()
	light.position = at
	light.light_color = color
	light.light_energy = energy
	light.omni_range = reach
	root.add_child(light)


static func material(color: Color, roughness: float = 0.8, emission: Color = Color.BLACK, emission_energy: float = 0.0) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = roughness
	if emission_energy > 0.0:
		mat.emission_enabled = true
		mat.emission = emission
		mat.emission_energy_multiplier = emission_energy
	return mat


static func add_box(root: Node3D, center: Vector3, size: Vector3, mat: Material) -> MeshInstance3D:
	var mesh := BoxMesh.new()
	mesh.size = size
	var instance := MeshInstance3D.new()
	instance.mesh = mesh
	instance.material_override = mat
	instance.position = center
	root.add_child(instance)
	return instance


static func add_floor(root: Node3D, center: Vector2, size: Vector2, depth: float) -> void:
	var c: Vector3 = RoomView3D.to_3d(center)
	var s := Vector3(size.x, size.y, 0.0) / RoomView3D.PX_PER_M
	add_box(root, Vector3(c.x, c.y, -depth * 0.5 + 0.6), Vector3(s.x + 4.0, s.y, depth), material(STONE, 0.9))
	# Neon strip along the front lip of the floor.
	var top_y: float = c.y + s.y * 0.5
	add_box(root, Vector3(c.x, top_y - 0.04, 0.62), Vector3(s.x + 4.0, 0.05, 0.04), material(Color.BLACK, 0.5, NEON_MAGENTA, 4.0))
	# Floor tiles: alternating slabs read as depth.
	for i: int in 14:
		var x: float = i * 1.0 + 0.5
		var tone: Color = STONE_LIGHT if i % 2 == 0 else STONE
		add_box(root, Vector3(x, top_y + 0.005, -1.4), Vector3(0.96, 0.01, 3.8), material(tone.darkened(0.25), 0.6))


static func add_ledge(root: Node3D, center: Vector2, size: Vector2, depth: float) -> void:
	var c: Vector3 = RoomView3D.to_3d(center)
	var w: float = size.x / RoomView3D.PX_PER_M
	var top_y: float = c.y + size.y * 0.5 / RoomView3D.PX_PER_M
	add_box(root, Vector3(c.x, top_y - 0.09, -depth * 0.5 + 0.4), Vector3(w, 0.18, depth), material(STONE_LIGHT, 0.5))
	add_box(root, Vector3(c.x, top_y - 0.17, 0.41), Vector3(w, 0.03, 0.03), material(Color.BLACK, 0.5, NEON_AMBER, 5.0))


static func add_block(root: Node3D, center: Vector2, size: Vector2, depth: float) -> void:
	var c: Vector3 = RoomView3D.to_3d(center)
	var s := Vector3(size.x, size.y, 0.0) / RoomView3D.PX_PER_M
	add_box(root, Vector3(c.x, c.y, -depth * 0.5 + 0.5), Vector3(s.x, s.y, depth), material(STONE_LIGHT.darkened(0.2), 0.85))
	add_box(root, Vector3(c.x, c.y + s.y * 0.5 - 0.03, 0.51), Vector3(s.x, 0.04, 0.04), material(Color.BLACK, 0.5, NEON_MAGENTA, 4.0))


static func build_backdrop(root: Node3D) -> void:
	# Back wall and a row of club pillars for depth and parallax.
	add_box(root, Vector3(6.4, -3.6, -6.0), Vector3(30.0, 14.0, 0.5), material(BACKDROP, 1.0))
	for i: int in 7:
		var x: float = -1.0 + i * 2.4
		add_box(root, Vector3(x, -3.0, -4.2), Vector3(0.55, 10.0, 0.55), material(STONE.darkened(0.4), 0.9))
		add_box(root, Vector3(x + 0.3, -3.0, -3.9), Vector3(0.04, 10.0, 0.04), material(Color.BLACK, 0.5, NEON_MAGENTA if i % 2 == 0 else NEON_AMBER, 3.0))
