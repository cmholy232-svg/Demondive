class_name NeonMawKit
extends RefCounted
## Level 1, The Neon Maw: a hell nightclub. Black glossy stone edged with
## magenta neon, chrome ledges lit from below, light-up dance-floor movers,
## pink cocktail lava, and a back wall of signs, speakers and lasers.

const STONE: Color = Color(0.1, 0.07, 0.13)
const STONE_TOP: Color = Color(0.2, 0.13, 0.24)
const MAGENTA: Color = Color(1.0, 0.18, 0.62)
const AMBER: Color = Color(1.0, 0.55, 0.15)
const CYAN: Color = Color(0.2, 0.85, 1.0)
const CHROME: Color = Color(0.55, 0.5, 0.62)
const FRONT_Z: float = 0.7
const BACK_Z: float = -3.2
const WALL_Z: float = -3.6
const LOOK: Dictionary = {"sky_top": Color(0.03, 0.005, 0.05), "sky_low": Color(0.28, 0.03, 0.2), "horizon": Color(1.0, 0.25, 0.6),
	"silhouette": Color(0.015, 0.005, 0.02), "accent": Color(1.0, 0.55, 0.15)}
const STONE_LOOK: Dictionary = {"base": Color(0.11, 0.07, 0.14), "top": Color(0.2, 0.12, 0.24), "seam": Color(0.02, 0.01, 0.03),
	"edge": Color(0.42, 0.26, 0.5), "glow": Color(1.0, 0.18, 0.62), "pattern": 2, "glow_amount": 0.35, "roughness": 0.4, "metal": 0.15}
const SIGN_KEYS: Array[String] = ["sign.maw", "sign.open", "sign.free", "sign.last_call", "sign.vip", "sign.tab"]

static var _dance_shader: Shader = preload("res://art/shaders/dance_floor.gdshader")
static var _liquid_shader: Shader = preload("res://art/shaders/liquid.gdshader")


static func environment(root: Node3D) -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.02, 0.008, 0.03)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.42, 0.3, 0.55)
	env.ambient_light_energy = 0.32
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 1.05
	env.glow_enabled = true
	env.glow_intensity = 0.9
	env.glow_strength = 1.1
	env.glow_bloom = 0.06
	env.glow_hdr_threshold = 0.85
	env.glow_blend_mode = Environment.GLOW_BLEND_MODE_SCREEN
	env.fog_enabled = true
	env.fog_light_color = Color(0.09, 0.025, 0.1)
	env.fog_density = 0.012
	env.adjustment_enabled = true
	env.adjustment_saturation = 1.15
	env.adjustment_contrast = 1.06
	var world := WorldEnvironment.new()
	world.environment = env
	root.add_child(world)
	var key := DirectionalLight3D.new()
	key.light_color = Color(1.0, 0.82, 0.78)
	key.light_energy = 1.0
	key.shadow_enabled = true
	key.directional_shadow_max_distance = 30.0
	key.rotation_degrees = Vector3(-48.0, -32.0, 0.0)
	root.add_child(key)
	var fill := DirectionalLight3D.new()
	fill.light_color = Color(0.45, 0.6, 1.0)
	fill.light_energy = 0.35
	fill.rotation_degrees = Vector3(-15.0, 150.0, 0.0)
	root.add_child(fill)


static func build(root: Node3D, room: Room) -> void:
	var data: RoomData = room.data
	var size: Vector2 = data.size_px()
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(data.id) + 7
	ClubSet3D.build(root, room, WALL_Z, rng)
	Backdrop3D.build(root, size, LOOK, hash(data.id) + 3)
	for rect: Rect2 in room.builder.solids:
		_solid(root, rect, data)
	for rect: Rect2 in room.builder.ledges:
		_ledge(root, rect)
	for rect: Rect2 in room.builder.spikes:
		_spikes(root, rect)
	for rect: Rect2 in room.builder.lava:
		_lava(root, rect)
	_set_dressing(root, room, size)
	CyberProps3D.build(root, room, WALL_Z)


static func _solid(root: Node3D, rect: Rect2, data: RoomData) -> void:
	var c: Vector3 = Kit3D.rect_center(rect)
	var s := Vector3(rect.size.x, rect.size.y, 0.0) / Kit3D.PX_PER_M
	var depth: float = FRONT_Z - BACK_Z
	var size := Vector3(s.x, s.y, depth)
	Kit3D.box(root, Vector3(c.x, c.y, (FRONT_Z + BACK_Z) * 0.5), size, Kit3D.surface(STONE_LOOK, size))
	var top_y: float = c.y + s.y * 0.5
	var tile_x: int = int(rect.position.x / RoomData.TILE)
	var tile_y: int = int(rect.position.y / RoomData.TILE)
	if data.is_solid(tile_x, tile_y - 1):
		return
	# Walkable top: light-up dance floor on wide floors, neon lip on the front
	# edge, a faint strip at the back.
	if s.x >= 3.0:
		Kit3D.box(root, Vector3(c.x, top_y + 0.006, (FRONT_Z + BACK_Z) * 0.5), Vector3(s.x - 0.04, 0.012, depth - 0.1), _floor_tiles())
	Kit3D.box(root, Vector3(c.x, top_y - 0.07, FRONT_Z + 0.01), Vector3(s.x, 0.045, 0.03), Kit3D.neon(MAGENTA, 4.5))
	Kit3D.box(root, Vector3(c.x, top_y + 0.005, BACK_Z + 0.35), Vector3(s.x, 0.012, 0.05), Kit3D.neon(CYAN, 1.6))


static var _floor_mat: ShaderMaterial


static func _floor_tiles() -> ShaderMaterial:
	if _floor_mat == null:
		_floor_mat = ShaderMaterial.new()
		_floor_mat.shader = _dance_shader
		_floor_mat.set_shader_parameter("base_color", Color(0.06, 0.03, 0.09))
		_floor_mat.set_shader_parameter("cell", 0.9)
		_floor_mat.set_shader_parameter("energy", 1.5)
	return _floor_mat


static func _ledge(root: Node3D, rect: Rect2) -> void:
	var c: Vector3 = Kit3D.rect_center(rect)
	var w: float = rect.size.x / Kit3D.PX_PER_M
	var top_y: float = -rect.position.y / Kit3D.PX_PER_M
	Kit3D.box(root, Vector3(c.x, top_y - 0.07, -0.55), Vector3(w, 0.14, 1.5), Kit3D.material(CHROME, 0.25, Color.BLACK, 0.0, 0.8))
	Kit3D.box(root, Vector3(c.x, top_y - 0.16, -0.55), Vector3(w * 0.96, 0.03, 1.3), Kit3D.neon(AMBER, 3.0))
	Kit3D.box(root, Vector3(c.x, top_y - 0.07, 0.2), Vector3(w, 0.04, 0.03), Kit3D.neon(AMBER, 5.0))


## Dance-floor tile for a moving platform; the view moves it each frame.
static func mover(root: Node3D, platform: MovingPlatform) -> Node3D:
	var holder := Node3D.new()
	root.add_child(holder)
	var w: float = platform.width / Kit3D.PX_PER_M
	var mat := ShaderMaterial.new()
	mat.shader = _dance_shader
	Kit3D.box(holder, Vector3(0.0, -0.1, -0.5), Vector3(w, 0.2, 1.6), mat)
	Kit3D.box(holder, Vector3(0.0, -0.21, 0.31), Vector3(w, 0.03, 0.03), Kit3D.neon(CYAN, 5.0))
	return holder


static func _spikes(root: Node3D, rect: Rect2) -> void:
	var count: int = maxi(1, int(rect.size.x / 22.0))
	var base_y: float = -rect.end.y / Kit3D.PX_PER_M
	var chrome: Material = Kit3D.material(Color(0.7, 0.65, 0.75), 0.2, Color(1.0, 0.1, 0.25), 0.6, 0.9)
	for z: float in [0.25, -0.35, -0.95]:
		for i: int in count:
			var x: float = (rect.position.x + (i + 0.5) * rect.size.x / count) / Kit3D.PX_PER_M
			Kit3D.cone(root, Vector3(x, base_y, z), 0.09, rect.size.y / Kit3D.PX_PER_M * 1.05, chrome)


static func _lava(root: Node3D, rect: Rect2) -> void:
	var mat := ShaderMaterial.new()
	mat.shader = _liquid_shader
	var c: Vector3 = Kit3D.rect_center(rect)
	var top_y: float = -rect.position.y / Kit3D.PX_PER_M
	Kit3D.box(root, Vector3(c.x, top_y - 0.15, (FRONT_Z + BACK_Z) * 0.5), Vector3(rect.size.x / Kit3D.PX_PER_M, 0.3, FRONT_Z - BACK_Z), mat)
	Kit3D.omni(root, Vector3(c.x, top_y + 0.4, 0.3), MAGENTA, 1.2, 3.0)


## Back-wall dressing along the room: neon signs, speaker stacks, pillars,
## disco balls and slow lasers, spaced so the wall never repeats exactly.
static func _set_dressing(root: Node3D, room: Room, size: Vector2) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(room.data.id)
	var w: float = size.x / Kit3D.PX_PER_M
	var floor_y: float = -size.y / Kit3D.PX_PER_M
	var top_y: float = 0.0
	var x: float = rng.randf_range(1.0, 3.0)
	var sign_index: int = rng.randi_range(0, SIGN_KEYS.size() - 1)
	var next_sign_x: float = 0.0
	while x < w:
		if Backdrop3D.in_opening(x):
			x = Backdrop3D.after_opening(x) + rng.randf_range(0.0, 1.0)
			continue
		var pick: int = rng.randi_range(0, 4)
		var y: float = rng.randf_range(floor_y + 4.6, minf(floor_y + 8.0, top_y - 2.0))
		if pick == 0 and (x < next_sign_x or Backdrop3D.in_opening(x + 3.0)):
			pick = 1
		if pick == 0:
			next_sign_x = x + 11.0
			var color: Color = [MAGENTA, CYAN, AMBER][rng.randi_range(0, 2)]
			Kit3D.sign_text(root, Strings.text(SIGN_KEYS[sign_index % SIGN_KEYS.size()]), Vector3(x + 1.5, y, WALL_Z + 0.25), color, 0.0075, 128)
			sign_index += 1
		elif pick == 1:
			_pillar(root, x, floor_y, top_y, rng.randi() % 2 == 0)
		elif pick == 2:
			_speakers(root, x, floor_y)
		elif pick == 4:
			NeonArt3D.piece(root, rng.randi(), Vector3(x + 1.0, y, WALL_Z + 0.3), rng.randf_range(0.9, 1.4), [MAGENTA, CYAN, AMBER][rng.randi_range(0, 2)])
		else:
			_disco_ball(root, Vector3(x, top_y - 1.4, -2.2))
		x += rng.randf_range(3.5, 6.5)
	for i: int in int(w / 9.0) + 1:
		_laser(root, Vector3(rng.randf_range(0.0, w), top_y - 0.5, -2.8), rng.randf_range(-0.6, 0.6), [MAGENTA, CYAN][i % 2])
	for i: int in int(w / 7.0) + 1:
		Kit3D.omni(root, Vector3(i * 7.0 + 2.0, floor_y * 0.5, -1.8), [MAGENTA, CYAN, AMBER][i % 3], 1.4, 7.0)


static func _pillar(root: Node3D, x: float, floor_y: float, top_y: float, tube_magenta: bool) -> void:
	var h: float = top_y - floor_y + 4.0
	Kit3D.box(root, Vector3(x, floor_y + h * 0.5 - 2.0, WALL_Z + 0.6), Vector3(0.6, h, 0.6), Kit3D.material(STONE.darkened(0.3), 0.9))
	Kit3D.box(root, Vector3(x + 0.31, floor_y + h * 0.5 - 2.0, WALL_Z + 0.92), Vector3(0.04, h, 0.04), Kit3D.neon(MAGENTA if tube_magenta else AMBER, 3.5))


static func _speakers(root: Node3D, x: float, floor_y: float) -> void:
	var cab: Material = Kit3D.material(Color(0.04, 0.03, 0.05), 0.6)
	var cone_mat: Material = Kit3D.material(Color(0.12, 0.1, 0.14), 0.4, MAGENTA, 0.4)
	for i: int in 3:
		var y: float = floor_y + 0.55 + i * 1.1
		Kit3D.box(root, Vector3(x, y, WALL_Z + 0.8), Vector3(1.1, 1.05, 0.8), cab)
		var woofer: MeshInstance3D = Kit3D.cylinder(root, Vector3(x, y, WALL_Z + 1.21), 0.38, 0.38, 0.04, cone_mat, 20)
		woofer.rotation_degrees = Vector3(90.0, 0.0, 0.0)


static func _disco_ball(root: Node3D, at: Vector3) -> void:
	Kit3D.box(root, at + Vector3(0.0, 1.5, 0.0), Vector3(0.02, 3.0, 0.02), Kit3D.material(Color(0.3, 0.3, 0.3), 0.5))
	var ball: MeshInstance3D = Kit3D.sphere(root, at, 0.45, Kit3D.material(Color(0.8, 0.8, 0.9), 0.08, Color(0.9, 0.7, 1.0), 0.7, 1.0))
	ball.set_meta("spin", 0.6)


static func _laser(root: Node3D, at: Vector3, angle: float, color: Color) -> void:
	var beam: MeshInstance3D = Kit3D.box(root, at, Vector3(0.025, 14.0, 0.025), Kit3D.neon(color, 6.0))
	beam.rotation.z = angle
	beam.set_meta("sweep", angle)
