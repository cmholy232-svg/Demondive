class_name Backdrop3D
extends RefCounted
## Depth behind the play wall: a far sky with a hot horizon, three layers
## of jagged hell spires that fade into the fog, lit windows on the nearest
## layer, and embers drifting through the room. Colours come from the
## level's theme (data/biomes.json) so every level gets its own skyline.

const SKY_SHADER: Shader = preload("res://art/shaders/sky.gdshader")
const SKY_Z: float = -75.0
## Arched openings in the back wall (art/shaders/club_wall.gdshader uses the same numbers).
const OPENING_PERIOD: float = 18.0
const OPENING_START: float = 6.0
const OPENING_WIDTH: float = 9.0
## (z, height above floor min, max, colour mix toward sky)
const LAYERS: Array[Vector4] = [Vector4(-58.0, 10.0, 30.0, 0.75), Vector4(-36.0, 6.0, 20.0, 0.5), Vector4(-18.0, 2.0, 12.0, 0.25)]


## True if wall dressing at x (metres) would hang in an opening.
static func in_opening(x: float, margin: float = 0.8) -> bool:
	var px: float = fposmod(x - OPENING_START, OPENING_PERIOD)
	return px > -margin and px < OPENING_WIDTH + margin or px > OPENING_PERIOD - margin


## The x where the opening containing x ends (plus a margin).
static func after_opening(x: float, margin: float = 0.8) -> float:
	var px: float = fposmod(x - OPENING_START, OPENING_PERIOD)
	if px > OPENING_PERIOD - margin:
		px -= OPENING_PERIOD
	return x - px + OPENING_WIDTH + margin


## Theme colours for the backdrop of a level (data/biomes.json keys).
static func look_from_theme(t: Dictionary) -> Dictionary:
	var bg: Color = BiomeKit.c(t, "bg", Color.BLACK)
	return {
		"sky_top": BiomeKit.c(t, "sky_top", bg),
		"sky_low": BiomeKit.c(t, "sky_low", BiomeKit.c(t, "fog", bg)),
		"horizon": BiomeKit.c(t, "horizon", BiomeKit.c(t, "lip")),
		"silhouette": bg.darkened(0.3),
		"accent": BiomeKit.c(t, "lip"),
	}


## look: sky_top, sky_low, horizon, silhouette, accent (Colors)
static func build(root: Node3D, size: Vector2, look: Dictionary, seed_value: int) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var w: float = size.x / Kit3D.PX_PER_M
	var floor_y: float = -size.y / Kit3D.PX_PER_M
	_sky(root, w, floor_y, size.y / Kit3D.PX_PER_M, look)
	var sky_low: Color = look["sky_low"] as Color
	var silhouette: Color = look["silhouette"] as Color
	for i: int in LAYERS.size():
		var layer: Vector4 = LAYERS[i]
		var color: Color = silhouette.lerp(sky_low, layer.w)
		var reach: float = (10.0 - layer.x) * 1.0
		_ridge(root, -reach, w + reach, floor_y, layer, color, rng, look["accent"] as Color, i == LAYERS.size() - 1)
	_embers(root, w, floor_y, size.y / Kit3D.PX_PER_M, look["accent"] as Color)


static func _sky(root: Node3D, w: float, floor_y: float, h: float, look: Dictionary) -> void:
	var mat := ShaderMaterial.new()
	mat.shader = SKY_SHADER
	mat.set_shader_parameter("sky_top", look["sky_top"])
	mat.set_shader_parameter("sky_low", look["sky_low"])
	mat.set_shader_parameter("horizon", look["horizon"])
	mat.set_shader_parameter("horizon_y", floor_y + 8.0)
	mat.set_shader_parameter("span", maxf(h, 20.0) + 20.0)
	var quad := QuadMesh.new()
	quad.size = Vector2(w + 260.0, h + 200.0)
	var sky := MeshInstance3D.new()
	sky.mesh = quad
	sky.material_override = mat
	sky.position = Vector3(w * 0.5, floor_y + h * 0.5, SKY_Z)
	sky.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(sky)


## One silhouette layer: rolling crags with tall spires and the odd arch.
static func _ridge(root: Node3D, x0: float, x1: float, floor_y: float, layer: Vector4, color: Color, rng: RandomNumberGenerator, accent: Color, windows: bool) -> void:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var base_y: float = floor_y - 40.0
	var step: float = 1.2 + (-layer.x) * 0.03
	var x: float = x0
	var phase: float = rng.randf() * 100.0
	var prev := Vector2(x, _crag(x, floor_y, layer, phase))
	var spire_at: float = x + rng.randf_range(2.0, 10.0)
	var tops: Array[Vector2] = []
	while x < x1:
		x += step
		var y: float = _crag(x, floor_y, layer, phase)
		var p := Vector2(x, y)
		_column(st, prev, p, base_y)
		tops.append(p)
		prev = p
		if x >= spire_at:
			var tall: float = rng.randf_range(layer.z * 0.6, layer.z * 1.25)
			var half: float = rng.randf_range(0.6, 1.6) * (1.0 + (-layer.x) * 0.02)
			_spire(st, Vector2(x, y - 0.5), half, tall, rng)
			spire_at = x + rng.randf_range(4.0, 14.0)
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = color
	var mesh := MeshInstance3D.new()
	mesh.mesh = st.commit()
	mesh.material_override = mat
	mesh.position.z = layer.x
	mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(mesh)
	if windows:
		_windows(root, tops, layer.x + 0.2, accent, rng)


static func _crag(x: float, floor_y: float, layer: Vector4, phase: float) -> float:
	var n: float = sin(x * 0.11 + phase) * 0.5 + sin(x * 0.27 + phase * 1.7) * 0.3 + sin(x * 0.71 + phase * 0.3) * 0.2
	return floor_y + layer.y + (n * 0.5 + 0.5) * (layer.z - layer.y) * 0.45


static func _column(st: SurfaceTool, a: Vector2, b: Vector2, base_y: float) -> void:
	var a0 := Vector3(a.x, base_y, 0.0)
	var b0 := Vector3(b.x, base_y, 0.0)
	var a1 := Vector3(a.x, a.y, 0.0)
	var b1 := Vector3(b.x, b.y, 0.0)
	for v: Vector3 in [a0, a1, b1, a0, b1, b0]:
		st.add_vertex(v)


static func _spire(st: SurfaceTool, base: Vector2, half: float, tall: float, rng: RandomNumberGenerator) -> void:
	var lean: float = rng.randf_range(-0.6, 0.6)
	var tip := Vector3(base.x + lean, base.y + tall, 0.0)
	var l := Vector3(base.x - half, base.y, 0.0)
	var r := Vector3(base.x + half, base.y, 0.0)
	# A notch partway up makes it read as a tower, not a cone.
	var mid_y: float = base.y + tall * rng.randf_range(0.45, 0.7)
	var ml := Vector3(base.x - half * 0.55 + lean * 0.5, mid_y, 0.0)
	var mr := Vector3(base.x + half * 0.55 + lean * 0.5, mid_y, 0.0)
	var ml2 := Vector3(ml.x - half * 0.35, mid_y + 0.3, 0.0)
	var mr2 := Vector3(mr.x + half * 0.35, mid_y + 0.3, 0.0)
	for v: Vector3 in [l, ml, mr, l, mr, r, ml2, tip, mr2, ml, ml2, mr2, ml, mr2, mr]:
		st.add_vertex(v)


static func _windows(root: Node3D, tops: Array[Vector2], z: float, accent: Color, rng: RandomNumberGenerator) -> void:
	var mesh := MultiMesh.new()
	mesh.transform_format = MultiMesh.TRANSFORM_3D
	var quad := QuadMesh.new()
	quad.size = Vector2(0.18, 0.28)
	mesh.mesh = quad
	var spots: Array[Vector3] = []
	for top: Vector2 in tops:
		if rng.randf() < 0.35:
			for i: int in rng.randi_range(1, 3):
				spots.append(Vector3(top.x + rng.randf_range(-0.5, 0.5), top.y - rng.randf_range(0.6, 6.0), z))
	mesh.instance_count = spots.size()
	for i: int in spots.size():
		mesh.set_instance_transform(i, Transform3D(Basis(), spots[i]))
	var holder := MultiMeshInstance3D.new()
	holder.multimesh = mesh
	holder.material_override = Kit3D.neon(accent, 1.6)
	holder.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(holder)


static func _embers(root: Node3D, w: float, floor_y: float, h: float, color: Color) -> void:
	var embers := CPUParticles3D.new()
	embers.amount = clampi(int(w * 2.5), 60, 260)
	embers.lifetime = 9.0
	embers.preprocess = 9.0
	embers.emission_shape = CPUParticles3D.EMISSION_SHAPE_BOX
	embers.emission_box_extents = Vector3(w * 0.5 + 6.0, 0.5, 3.5)
	embers.position = Vector3(w * 0.5, floor_y - 0.5, -1.5)
	embers.direction = Vector3(0.0, 1.0, 0.0)
	embers.spread = 25.0
	embers.gravity = Vector3(0.15, 0.25, 0.0)
	embers.initial_velocity_min = 0.6
	embers.initial_velocity_max = maxf(1.6, h * 0.12)
	embers.scale_amount_min = 0.5
	embers.scale_amount_max = 1.3
	var quad := QuadMesh.new()
	quad.size = Vector2(0.05, 0.05)
	var mat := StandardMaterial3D.new()
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.billboard_mode = BaseMaterial3D.BILLBOARD_ENABLED
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	mat.vertex_color_use_as_albedo = true
	mat.albedo_color = Color(color.r * 2.5, color.g * 2.5, color.b * 2.5)
	quad.material = mat
	embers.mesh = quad
	var fade := Gradient.new()
	fade.offsets = PackedFloat32Array([0.0, 0.15, 1.0])
	fade.colors = PackedColorArray([Color(1.0, 1.0, 1.0, 0.0), Color.WHITE, Color(1.0, 1.0, 1.0, 0.0)])
	embers.color_ramp = fade
	root.add_child(embers)
