class_name Kit3D
extends RefCounted
## Small helpers shared by the 3D views: unit conversion, materials (plain,
## neon and cel-shaded with an ink outline) and primitive builders.

## 100 px of gameplay space is 1 m in the 3D view.
const PX_PER_M: float = 100.0
const TOON_SHADER: Shader = preload("res://art/shaders/toon.gdshader")
const OUTLINE_SHADER: Shader = preload("res://art/shaders/outline.gdshader")

static var _toon_cache: Dictionary = {}
static var _mat_cache: Dictionary = {}


static func to_3d(point: Vector2, z: float = 0.0) -> Vector3:
	return Vector3(point.x / PX_PER_M, -point.y / PX_PER_M, z)


static func rect_center(rect: Rect2, z: float = 0.0) -> Vector3:
	return to_3d(rect.get_center(), z)


static func material(color: Color, roughness: float = 0.8, emission: Color = Color.BLACK, emission_energy: float = 0.0, metallic: float = 0.0) -> StandardMaterial3D:
	var key: String = "%s|%.2f|%s|%.2f|%.2f" % [color.to_html(), roughness, emission.to_html(), emission_energy, metallic]
	if _mat_cache.has(key):
		return _mat_cache[key] as StandardMaterial3D
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = roughness
	mat.metallic = metallic
	if emission_energy > 0.0:
		mat.emission_enabled = true
		mat.emission = emission
		mat.emission_energy_multiplier = emission_energy
	_mat_cache[key] = mat
	return mat


static func neon(color: Color, energy: float = 4.0) -> StandardMaterial3D:
	return material(Color.BLACK, 0.5, color, energy)


## Cel-shaded material with an ink outline pass. Width is in metres.
static func toon(color: Color, outline_width: float = 0.018, rim: float = 0.45) -> ShaderMaterial:
	var key: String = "%s|%.3f|%.2f" % [color.to_html(), outline_width, rim]
	if _toon_cache.has(key):
		return _toon_cache[key] as ShaderMaterial
	var mat := ShaderMaterial.new()
	mat.shader = TOON_SHADER
	mat.set_shader_parameter("albedo", color)
	mat.set_shader_parameter("rim_strength", rim)
	if outline_width > 0.0:
		var outline := ShaderMaterial.new()
		outline.shader = OUTLINE_SHADER
		outline.set_shader_parameter("width", outline_width)
		mat.next_pass = outline
	_toon_cache[key] = mat
	return mat


static func box(parent: Node3D, center: Vector3, size: Vector3, mat: Material) -> MeshInstance3D:
	var mesh := BoxMesh.new()
	mesh.size = size
	return _instance(parent, mesh, center, mat)


static func sphere(parent: Node3D, center: Vector3, radius: float, mat: Material, height_scale: float = 1.0) -> MeshInstance3D:
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0 * height_scale
	mesh.radial_segments = 20
	mesh.rings = 10
	return _instance(parent, mesh, center, mat)


static func capsule(parent: Node3D, center: Vector3, radius: float, height: float, mat: Material) -> MeshInstance3D:
	var mesh := CapsuleMesh.new()
	mesh.radius = radius
	mesh.height = height
	mesh.radial_segments = 16
	mesh.rings = 6
	return _instance(parent, mesh, center, mat)


static func cylinder(parent: Node3D, center: Vector3, top: float, bottom: float, height: float, mat: Material, sides: int = 16) -> MeshInstance3D:
	var mesh := CylinderMesh.new()
	mesh.top_radius = top
	mesh.bottom_radius = bottom
	mesh.height = height
	mesh.radial_segments = sides
	return _instance(parent, mesh, center, mat)


static func cone(parent: Node3D, base: Vector3, radius: float, height: float, mat: Material, tilt: Vector3 = Vector3.ZERO) -> MeshInstance3D:
	var instance: MeshInstance3D = cylinder(parent, base, 0.0, radius, height, mat, 10)
	instance.rotation = tilt
	instance.position = base + (Basis.from_euler(tilt) * Vector3(0.0, height * 0.5, 0.0))
	return instance


static func sign_text(parent: Node3D, text: String, at: Vector3, color: Color, pixel_size: float = 0.02, font_size: int = 96) -> Label3D:
	var label := Label3D.new()
	label.text = text
	label.position = at
	label.pixel_size = pixel_size
	label.font_size = font_size
	label.font = preload("res://art/fonts/Bungee-Regular.ttf")
	label.modulate = Color(color.r * 3.0, color.g * 3.0, color.b * 3.0)
	label.outline_size = 0
	label.shaded = false
	label.double_sided = false
	label.no_depth_test = false
	parent.add_child(label)
	return label


static func omni(parent: Node3D, at: Vector3, color: Color, energy: float, reach: float) -> OmniLight3D:
	var light := OmniLight3D.new()
	light.position = at
	light.light_color = color
	light.light_energy = energy
	light.omni_range = reach
	parent.add_child(light)
	return light


static func _instance(parent: Node3D, mesh: Mesh, center: Vector3, mat: Material) -> MeshInstance3D:
	var instance := MeshInstance3D.new()
	instance.mesh = mesh
	instance.material_override = mat
	instance.position = center
	parent.add_child(instance)
	return instance
