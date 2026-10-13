class_name BiomeKit
extends RefCounted
## Draws Levels 2 to 9 from a colour theme in data/biomes.json: the light
## and fog, stone and ledges, liquids and spikes, the level's mechanics
## (MechanicViews3D) and a back wall dressed with BiomeProps.

const THEMES_PATH: String = "res://data/biomes.json"
const FRONT_Z: float = 0.7
const BACK_Z: float = -3.2
const WALL_Z: float = -3.6

static var _themes: Dictionary = {}
static var _liquid_shader: Shader = preload("res://art/shaders/liquid.gdshader")
static var _dance_shader: Shader = preload("res://art/shaders/dance_floor.gdshader")


static func themes() -> Dictionary:
	if _themes.is_empty():
		_themes = JSON.parse_string(FileAccess.get_file_as_string(THEMES_PATH)) as Dictionary
	return _themes


static func has(biome: String) -> bool:
	return themes().has(biome)


static func theme(biome: String) -> Dictionary:
	return themes().get(biome, {}) as Dictionary


static func c(t: Dictionary, key: String, fallback: Color = Color.WHITE) -> Color:
	return Color.html(str(t[key])) if t.has(key) else fallback


static func colors(t: Dictionary, key: String) -> Array[Color]:
	var out: Array[Color] = []
	for hex: Variant in t.get(key, []) as Array:
		out.append(Color.html(str(hex)))
	return out


static func environment(root: Node3D, biome: String) -> void:
	var t: Dictionary = theme(biome)
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = c(t, "bg", Color.BLACK)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = c(t, "ambient")
	env.ambient_light_energy = float(t.get("ambient_energy", 0.32))
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 1.05
	env.glow_enabled = true
	env.glow_intensity = 0.85
	env.glow_strength = 1.05
	env.glow_bloom = 0.05
	env.glow_hdr_threshold = 0.85
	env.glow_blend_mode = Environment.GLOW_BLEND_MODE_SCREEN
	env.fog_enabled = true
	env.fog_light_color = c(t, "fog")
	env.fog_density = float(t.get("fog_density", 0.012))
	env.adjustment_enabled = true
	env.adjustment_saturation = float(t.get("saturation", 1.1))
	env.adjustment_contrast = 1.06
	var world := WorldEnvironment.new()
	world.environment = env
	root.add_child(world)
	var key := DirectionalLight3D.new()
	key.light_color = c(t, "key")
	key.light_energy = float(t.get("key_energy", 1.0))
	key.shadow_enabled = true
	key.directional_shadow_max_distance = 30.0
	key.rotation_degrees = Vector3(-48.0, -32.0, 0.0)
	root.add_child(key)
	var fill := DirectionalLight3D.new()
	fill.light_color = c(t, "fill")
	fill.light_energy = float(t.get("fill_energy", 0.3))
	fill.rotation_degrees = Vector3(-15.0, 150.0, 0.0)
	root.add_child(fill)


static func build(root: Node3D, room: Room, biome: String) -> void:
	var t: Dictionary = theme(biome)
	var data: RoomData = room.data
	var size: Vector2 = data.size_px()
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(data.id) + 11
	var floor_y: float = ClubSet3D._floor_top(data, data.width / 2)
	var wall_look: Dictionary = (t.get("wall", {}) as Dictionary).duplicate()
	wall_look["rim"] = str(t.get("lip", "#ffffff"))
	ClubSet3D._wall(root, size, WALL_Z, floor_y, wall_look)
	Backdrop3D.build(root, size, Backdrop3D.look_from_theme(t), hash(data.id) + 3)
	var rims: Array[Color] = colors(t, "crowd")
	if not rims.is_empty():
		ClubSet3D._crowd(root, data, rng, rims, float(t.get("crowd_density", 0.4)))
	var shafts: Array[Color] = colors(t, "shafts")
	if not shafts.is_empty():
		ClubSet3D._shafts(root, size, rng, shafts)
	var haze: Array[Color] = colors(t, "haze")
	if haze.size() >= 2:
		ClubSet3D._haze(root, size, haze[0], haze[1])
	for rect: Rect2 in room.builder.solids:
		_solid(root, rect, data, t, false)
	for rect: Rect2 in room.builder.ice:
		_solid(root, rect, data, t, true)
	for rect: Rect2 in room.builder.ledges:
		_ledge(root, rect, t)
	for rect: Rect2 in room.builder.spikes:
		_spikes(root, rect, t)
	for rect: Rect2 in room.builder.lava:
		_liquid(root, rect, t)
	BiomeProps.dress(root, room, t, rng)


static func _solid(root: Node3D, rect: Rect2, data: RoomData, t: Dictionary, frozen: bool) -> void:
	var center: Vector3 = Kit3D.rect_center(rect)
	var s := Vector3(rect.size.x, rect.size.y, 0.0) / Kit3D.PX_PER_M
	var depth: float = FRONT_Z - BACK_Z
	var size := Vector3(s.x, s.y, depth)
	Kit3D.box(root, Vector3(center.x, center.y, (FRONT_Z + BACK_Z) * 0.5), size, Kit3D.surface(_stone_look(t, frozen), size))
	var tile_x: int = int(rect.position.x / RoomData.TILE)
	var tile_y: int = int(rect.position.y / RoomData.TILE)
	if data.is_solid(tile_x, tile_y - 1):
		return
	var top_y: float = center.y + s.y * 0.5
	Kit3D.box(root, Vector3(center.x, top_y - 0.07, FRONT_Z + 0.01), Vector3(s.x, 0.045, 0.03), Kit3D.neon(Color(0.7, 0.95, 1.0) if frozen else c(t, "lip"), 4.0))
	Kit3D.box(root, Vector3(center.x, top_y + 0.005, BACK_Z + 0.35), Vector3(s.x, 0.012, 0.05), Kit3D.neon(c(t, "strip"), 1.5))


static func _stone_look(t: Dictionary, frozen: bool) -> Dictionary:
	var stone: Color = c(t, "stone")
	var top: Color = c(t, "stone_top")
	if frozen:
		return {"base": stone.lerp(Color(0.7, 0.85, 1.0), 0.55), "top": Color(0.85, 0.95, 1.0), "seam": Color(0.3, 0.45, 0.6),
			"edge": Color(0.9, 0.97, 1.0), "glow": Color(0.6, 0.9, 1.0), "pattern": 3, "glow_amount": 0.4, "roughness": 0.15, "metal": 0.3}
	return {"base": stone, "top": top, "seam": stone.darkened(0.7), "edge": top.lightened(0.25), "glow": c(t, "lip"),
		"pattern": int(t.get("pattern", 1)), "glow_amount": float(t.get("joint_glow", 0.0)), "roughness": 0.75}


static func _ledge(root: Node3D, rect: Rect2, t: Dictionary) -> void:
	var center: Vector3 = Kit3D.rect_center(rect)
	var w: float = rect.size.x / Kit3D.PX_PER_M
	var top_y: float = -rect.position.y / Kit3D.PX_PER_M
	Kit3D.box(root, Vector3(center.x, top_y - 0.07, -0.55), Vector3(w, 0.14, 1.5), Kit3D.material(c(t, "ledge"), 0.35, Color.BLACK, 0.0, 0.5))
	Kit3D.box(root, Vector3(center.x, top_y - 0.16, -0.55), Vector3(w * 0.96, 0.03, 1.3), Kit3D.neon(c(t, "ledge_glow"), 2.6))
	Kit3D.box(root, Vector3(center.x, top_y - 0.07, 0.2), Vector3(w, 0.04, 0.03), Kit3D.neon(c(t, "ledge_glow"), 4.5))


## A moving ledge: a lit slab in the level's colours. The view moves it each frame.
static func mover(root: Node3D, platform: MovingPlatform, biome: String) -> Node3D:
	var t: Dictionary = theme(biome)
	var holder := Node3D.new()
	root.add_child(holder)
	var w: float = platform.width / Kit3D.PX_PER_M
	var mat := ShaderMaterial.new()
	mat.shader = _dance_shader
	mat.set_shader_parameter("base_color", c(t, "stone"))
	mat.set_shader_parameter("glow_a", c(t, "mover_a"))
	mat.set_shader_parameter("glow_b", c(t, "mover_b"))
	mat.set_shader_parameter("energy", 1.4)
	Kit3D.box(holder, Vector3(0.0, -0.1, -0.5), Vector3(w, 0.2, 1.6), mat)
	Kit3D.box(holder, Vector3(0.0, -0.21, 0.31), Vector3(w, 0.03, 0.03), Kit3D.neon(c(t, "mover_a"), 4.5))
	return holder


static func _spikes(root: Node3D, rect: Rect2, t: Dictionary) -> void:
	var count: int = maxi(1, int(rect.size.x / 22.0))
	var base_y: float = -rect.end.y / Kit3D.PX_PER_M
	var metal: Material = Kit3D.material(c(t, "spike"), 0.25, c(t, "lip"), 0.5, 0.7)
	for z: float in [0.25, -0.35, -0.95]:
		for i: int in count:
			var x: float = (rect.position.x + (i + 0.5) * rect.size.x / count) / Kit3D.PX_PER_M
			Kit3D.cone(root, Vector3(x, base_y, z), 0.09, rect.size.y / Kit3D.PX_PER_M * 1.05, metal)


static func _liquid(root: Node3D, rect: Rect2, t: Dictionary) -> void:
	var mat := ShaderMaterial.new()
	mat.shader = _liquid_shader
	mat.set_shader_parameter("color_a", c(t, "liquid_a"))
	mat.set_shader_parameter("color_b", c(t, "liquid_b"))
	var center: Vector3 = Kit3D.rect_center(rect)
	var top_y: float = -rect.position.y / Kit3D.PX_PER_M
	Kit3D.box(root, Vector3(center.x, top_y - 0.15, (FRONT_Z + BACK_Z) * 0.5), Vector3(rect.size.x / Kit3D.PX_PER_M, 0.3, FRONT_Z - BACK_Z), mat)
	Kit3D.omni(root, Vector3(center.x, top_y + 0.4, 0.3), c(t, "liquid_a"), 1.2, 3.0)
