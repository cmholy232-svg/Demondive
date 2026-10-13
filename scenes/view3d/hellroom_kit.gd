class_name HellroomKit
extends RefCounted
## Milo's Hellroom: his Earth bedroom dragged into Hell. Wooden floor, a messy
## bed under a bookshelf loft, the gaming desk, a summoning circle, a mirrored
## wardrobe, a window onto the burning sky, cracks of lava in the walls, and
## the goddesses Milo has freed hanging out around the room.

const WOOD: Color = Color(0.28, 0.17, 0.12)
const WOOD_DARK: Color = Color(0.16, 0.09, 0.07)
const WALLPAPER: Color = Color(0.17, 0.11, 0.22)
const LAVA: Color = Color(1.0, 0.45, 0.12)
const ARCANE: Color = Color(0.78, 0.6, 1.0)
const BACK_Z: float = -3.2
const WALL_Z: float = -3.4

## The orb over the altar; the hub tints it with the chosen starting boon.
static var altar_orb: MeshInstance3D
static var _wall_shader: Shader = preload("res://art/shaders/club_wall.gdshader")


## Old hellstone brick under the floorboards, with a little magma in the joints.
const FOUNDATION: Dictionary = {"base": Color(0.2, 0.08, 0.06), "top": Color(0.3, 0.16, 0.1), "seam": Color(0.04, 0.01, 0.01),
	"edge": Color(0.45, 0.22, 0.14), "glow": Color(1.0, 0.35, 0.08), "pattern": 1, "glow_amount": 0.3, "roughness": 0.85}


static func environment(root: Node3D) -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.03, 0.01, 0.02)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.55, 0.42, 0.6)
	env.ambient_light_energy = 0.4
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 1.1
	env.glow_enabled = true
	env.glow_intensity = 0.8
	env.glow_strength = 1.0
	env.glow_bloom = 0.04
	env.glow_hdr_threshold = 0.9
	env.glow_blend_mode = Environment.GLOW_BLEND_MODE_SCREEN
	env.fog_enabled = true
	env.fog_light_color = Color(0.12, 0.04, 0.03)
	env.fog_density = 0.01
	env.adjustment_enabled = true
	env.adjustment_saturation = 1.12
	var world := WorldEnvironment.new()
	world.environment = env
	root.add_child(world)
	var key := DirectionalLight3D.new()
	key.light_color = Color(1.0, 0.78, 0.6)
	key.light_energy = 0.9
	key.shadow_enabled = true
	key.directional_shadow_max_distance = 30.0
	key.rotation_degrees = Vector3(-42.0, -28.0, 0.0)
	root.add_child(key)
	var fill := DirectionalLight3D.new()
	fill.light_color = Color(0.5, 0.45, 1.0)
	fill.light_energy = 0.3
	fill.rotation_degrees = Vector3(-10.0, 150.0, 0.0)
	root.add_child(fill)


static func build(root: Node3D, room: Room) -> void:
	var data: RoomData = room.data
	var size: Vector2 = data.size_px()
	_wall(root, size)
	for rect: Rect2 in room.builder.solids:
		_solid(root, rect, data)
	for rect: Rect2 in room.builder.ledges:
		_ledge(root, rect, data)
	var floor_y: float = -(data.height - 3) * RoomData.TILE / Kit3D.PX_PER_M
	_window(root, Vector3(size.x / Kit3D.PX_PER_M * 0.62, floor_y + 4.6, WALL_Z + 0.25))
	_posters(root, floor_y)
	_cracks(root, size, floor_y)
	if data.stations.has(&"altar"):
		_altar(root, Kit3D.to_3d(data.stations[&"altar"] as Vector2))
	if data.stations.has(&"desk"):
		_desk(root, Kit3D.to_3d(data.stations[&"desk"] as Vector2))
	if data.stations.has(&"wardrobe"):
		_wardrobe(root, Kit3D.to_3d(data.stations[&"wardrobe"] as Vector2))
	for exit: Vector2 in data.exits:
		_hellmouth(root, Kit3D.to_3d(exit))
	_goddesses(root, data, floor_y)


static func _wall(root: Node3D, size: Vector2) -> void:
	var mat := ShaderMaterial.new()
	mat.shader = _wall_shader
	mat.set_shader_parameter("base_color", WALLPAPER)
	mat.set_shader_parameter("seam_color", Color(0.45, 0.3, 0.55))
	mat.set_shader_parameter("wash_color", LAVA)
	mat.set_shader_parameter("panel", Vector2(0.5, 40.0))
	mat.set_shader_parameter("floor_y", -size.y / Kit3D.PX_PER_M + 1.92)
	mat.set_shader_parameter("wash_height", 1.6)
	Kit3D.box(root, Kit3D.to_3d(size * 0.5, WALL_Z), Vector3(size.x / Kit3D.PX_PER_M + 20.0, size.y / Kit3D.PX_PER_M + 12.0, 0.4), mat)
	# Skirting board along the floor line.
	var floor_y: float = -size.y / Kit3D.PX_PER_M + 1.92
	Kit3D.box(root, Vector3(size.x / Kit3D.PX_PER_M * 0.5, floor_y + 0.12, WALL_Z + 0.25), Vector3(size.x / Kit3D.PX_PER_M, 0.24, 0.08), Kit3D.material(WOOD_DARK, 0.6))


static func _solid(root: Node3D, rect: Rect2, data: RoomData) -> void:
	var c: Vector3 = Kit3D.rect_center(rect)
	var s := Vector3(rect.size.x, rect.size.y, 0.0) / Kit3D.PX_PER_M
	var depth: float = 0.7 - BACK_Z
	var tile_x: int = int(rect.position.x / RoomData.TILE)
	var tile_y: int = int(rect.position.y / RoomData.TILE)
	var is_bed: bool = tile_x > 0 and tile_y < data.height - 3 and rect.size.x < data.width * RoomData.TILE * 0.5
	if is_bed:
		_bed(root, c, s)
		return
	var size := Vector3(s.x, s.y, depth)
	Kit3D.box(root, Vector3(c.x, c.y, (0.7 + BACK_Z) * 0.5), size, Kit3D.surface(FOUNDATION, size))
	if data.is_solid(tile_x, tile_y - 1):
		return
	# Floorboards: a lighter top with plank seams running into the room.
	var top_y: float = c.y + s.y * 0.5
	Kit3D.box(root, Vector3(c.x, top_y - 0.04, (0.7 + BACK_Z) * 0.5), Vector3(s.x, 0.08, depth), Kit3D.material(WOOD, 0.55))
	var seam: Material = Kit3D.material(WOOD_DARK.darkened(0.4), 0.8)
	var z: float = BACK_Z + 0.45
	while z < 0.7:
		Kit3D.box(root, Vector3(c.x, top_y + 0.001, z), Vector3(s.x, 0.004, 0.02), seam)
		z += 0.45


static func _bed(root: Node3D, c: Vector3, s: Vector3) -> void:
	var frame: Material = Kit3D.material(WOOD_DARK, 0.6)
	var top_y: float = c.y + s.y * 0.5
	Kit3D.box(root, Vector3(c.x, c.y - 0.05, -1.3), Vector3(s.x, s.y - 0.1, 3.6), frame)
	Kit3D.box(root, Vector3(c.x, top_y - 0.12, -1.3), Vector3(s.x - 0.1, 0.24, 3.4), Kit3D.toon(Color(0.86, 0.84, 0.9), 0.0))
	# A rumpled demon-red duvet and a pillow against the headboard.
	var duvet: MeshInstance3D = Kit3D.box(root, Vector3(c.x + 0.4, top_y + 0.02, -1.0), Vector3(s.x - 1.0, 0.1, 3.2), Kit3D.toon(Color(0.62, 0.08, 0.16), 0.01))
	duvet.rotation.z = 0.02
	Kit3D.box(root, Vector3(c.x - s.x * 0.5 + 0.55, top_y + 0.08, -1.6), Vector3(0.7, 0.18, 1.4), Kit3D.toon(Color(0.95, 0.93, 0.9), 0.01))
	Kit3D.box(root, Vector3(c.x - s.x * 0.5 + 0.05, top_y + 0.5, -1.3), Vector3(0.12, 1.2, 3.6), frame)


static func _ledge(root: Node3D, rect: Rect2, data: RoomData) -> void:
	var c: Vector3 = Kit3D.rect_center(rect)
	var w: float = rect.size.x / Kit3D.PX_PER_M
	var top_y: float = -rect.position.y / Kit3D.PX_PER_M
	var on_wall: bool = data.is_solid(int(rect.position.x / RoomData.TILE) - 1, int(rect.position.y / RoomData.TILE))
	if on_wall:
		# Bookshelf loft: a plank with books standing along the back.
		Kit3D.box(root, Vector3(c.x, top_y - 0.06, -1.2), Vector3(w, 0.12, 3.6), Kit3D.material(WOOD, 0.6))
		var rng := RandomNumberGenerator.new()
		rng.seed = int(rect.position.x)
		var x: float = c.x - w * 0.5 + 0.1
		while x < c.x + w * 0.5 - 0.2:
			var bw: float = rng.randf_range(0.08, 0.16)
			var bh: float = rng.randf_range(0.35, 0.6)
			var color: Color = Color.from_hsv(rng.randf(), 0.55, 0.6)
			Kit3D.box(root, Vector3(x + bw * 0.5, top_y + bh * 0.5, -2.6), Vector3(bw, bh, 0.5), Kit3D.toon(color, 0.0))
			x += bw + 0.02
		return
	# Floating chunks of Hell's rock with lava seams underneath.
	Kit3D.box(root, Vector3(c.x, top_y - 0.18, -0.6), Vector3(w, 0.36, 1.8), Kit3D.material(Color(0.12, 0.08, 0.1), 0.7))
	Kit3D.box(root, Vector3(c.x, top_y - 0.37, -0.6), Vector3(w * 0.9, 0.04, 1.6), Kit3D.neon(LAVA, 3.0))
	Kit3D.box(root, Vector3(c.x, top_y - 0.05, 0.31), Vector3(w, 0.03, 0.03), Kit3D.neon(LAVA, 3.5))


static func _window(root: Node3D, at: Vector3) -> void:
	var frame: Material = Kit3D.material(WOOD_DARK, 0.6)
	Kit3D.box(root, at, Vector3(3.0, 2.2, 0.06), Kit3D.neon(Color(1.0, 0.3, 0.08), 1.4))
	for i: int in 4:
		var spire_h: float = 0.6 + float(i % 3) * 0.35
		Kit3D.box(root, at + Vector3(-1.1 + i * 0.7, -1.1 + spire_h * 0.5, 0.05), Vector3(0.22, spire_h, 0.02), Kit3D.material(Color(0.05, 0.0, 0.0), 0.9))
	Kit3D.box(root, at + Vector3(0.0, 0.0, 0.08), Vector3(0.08, 2.2, 0.08), frame)
	Kit3D.box(root, at + Vector3(0.0, 0.0, 0.08), Vector3(3.0, 0.08, 0.08), frame)
	for side: float in [-1.0, 1.0]:
		Kit3D.box(root, at + Vector3(side * 1.55, 0.0, 0.08), Vector3(0.12, 2.4, 0.12), frame)
		Kit3D.box(root, at + Vector3(0.0, side * 1.15, 0.08), Vector3(3.2, 0.12, 0.12), frame)
	Kit3D.omni(root, at + Vector3(0.0, 0.0, 1.5), Color(1.0, 0.45, 0.2), 1.6, 6.0)


static func _posters(root: Node3D, floor_y: float) -> void:
	var posters: Array = [[4.5, Color(0.95, 0.25, 0.55)], [11.2, Color(0.25, 0.75, 0.95)], [24.5, Color(1.0, 0.75, 0.3)]]
	for poster: Array in posters:
		var at := Vector3(float(poster[0]), floor_y + 3.4, WALL_Z + 0.22)
		var color: Color = poster[1]
		Kit3D.box(root, at, Vector3(1.0, 1.4, 0.02), Kit3D.material(color.darkened(0.55), 0.8))
		Kit3D.sphere(root, at + Vector3(0.0, 0.15, 0.02), 0.28, Kit3D.material(color, 0.6, color, 0.4), 0.15)
		Kit3D.box(root, at + Vector3(0.0, -0.45, 0.02), Vector3(0.7, 0.1, 0.01), Kit3D.material(color.lightened(0.3), 0.6))


## Glowing fissures where Hell is breaking through the bedroom walls.
static func _cracks(root: Node3D, size: Vector2, floor_y: float) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 666
	var w: float = size.x / Kit3D.PX_PER_M
	for i: int in 7:
		var at := Vector3(rng.randf_range(2.0, w - 2.0), floor_y + rng.randf_range(0.4, 5.5), WALL_Z + 0.21)
		var angle: float = rng.randf_range(-1.2, 1.2)
		for j: int in 4:
			var length: float = rng.randf_range(0.3, 0.8)
			var seg: MeshInstance3D = Kit3D.box(root, at, Vector3(length, 0.035, 0.02), Kit3D.neon(LAVA, 3.0))
			seg.rotation.z = angle
			at += Vector3(cos(angle), sin(angle), 0.0) * length * 0.5
			angle += rng.randf_range(-0.9, 0.9)
			at += Vector3(cos(angle), sin(angle), 0.0) * length * 0.5


static func _altar(root: Node3D, at: Vector3) -> void:
	var circle: MeshInstance3D = Kit3D.cylinder(root, at + Vector3(0.0, 0.01, -1.2), 1.1, 1.1, 0.01, Kit3D.material(Color(0.08, 0.02, 0.05), 0.5, ARCANE, 0.6), 40)
	circle.name = "AltarCircle"
	var ring := MeshInstance3D.new()
	var torus := TorusMesh.new()
	torus.inner_radius = 1.0
	torus.outer_radius = 1.08
	torus.rings = 48
	torus.ring_segments = 4
	ring.mesh = torus
	ring.material_override = Kit3D.neon(ARCANE, 3.0)
	ring.position = at + Vector3(0.0, 0.03, -1.2)
	ring.scale = Vector3(1.0, 0.2, 1.0)
	root.add_child(ring)
	for i: int in 5:
		var a: float = TAU * i / 5.0
		var b: float = TAU * (i + 2) / 5.0
		var p := Vector3(cos(a), 0.0, sin(a))
		var q := Vector3(cos(b), 0.0, sin(b))
		var line: MeshInstance3D = Kit3D.box(root, at + Vector3(0.0, 0.025, -1.2) + (p + q) * 0.5, Vector3((q - p).length(), 0.01, 0.03), Kit3D.neon(ARCANE, 3.0))
		line.rotation.y = -atan2(q.z - p.z, q.x - p.x)
		_candle(root, at + Vector3(0.0, 0.0, -1.2) + p * 1.25)
	Kit3D.cylinder(root, at + Vector3(0.0, 0.45, -1.2), 0.25, 0.32, 0.9, Kit3D.material(Color(0.1, 0.06, 0.1), 0.4), 8)
	altar_orb = Kit3D.sphere(root, at + Vector3(0.0, 1.35, -1.2), 0.26, Kit3D.neon(BoonCatalog.color(Save.starting_boon()), 3.0))
	altar_orb.set_meta("bob", at.y + 1.35)
	Kit3D.omni(root, at + Vector3(0.0, 1.4, -0.4), ARCANE, 1.2, 4.0)


static func _candle(root: Node3D, at: Vector3) -> void:
	Kit3D.cylinder(root, at + Vector3(0.0, 0.14, 0.0), 0.05, 0.05, 0.28, Kit3D.toon(Color(0.9, 0.85, 0.75), 0.0), 8)
	Kit3D.sphere(root, at + Vector3(0.0, 0.33, 0.0), 0.04, Kit3D.neon(Color(1.0, 0.7, 0.3), 5.0), 1.6)


static func _desk(root: Node3D, at: Vector3) -> void:
	var wood: Material = Kit3D.material(WOOD_DARK, 0.5)
	Kit3D.box(root, at + Vector3(0.0, 0.78, -1.8), Vector3(2.4, 0.08, 1.0), wood)
	for x: float in [-1.1, 1.1]:
		Kit3D.box(root, at + Vector3(x, 0.38, -1.8), Vector3(0.08, 0.76, 0.9), wood)
	# Monitor, keyboard, lamp, a tower of pizza boxes and a mug.
	Kit3D.box(root, at + Vector3(0.1, 1.25, -2.05), Vector3(1.1, 0.65, 0.05), Kit3D.material(Color(0.05, 0.05, 0.06), 0.3))
	Kit3D.box(root, at + Vector3(0.1, 1.25, -2.02), Vector3(1.0, 0.56, 0.02), Kit3D.neon(Color(0.3, 0.85, 1.0), 1.6))
	Kit3D.box(root, at + Vector3(0.1, 0.84, -1.6), Vector3(0.7, 0.03, 0.22), Kit3D.material(Color(0.1, 0.1, 0.12), 0.4, Color(1.0, 0.2, 0.6), 0.6))
	Kit3D.cylinder(root, at + Vector3(-0.9, 1.1, -2.0), 0.02, 0.02, 0.6, wood, 6)
	Kit3D.sphere(root, at + Vector3(-0.8, 1.42, -1.9), 0.1, Kit3D.neon(Color(1.0, 0.8, 0.5), 3.0))
	Kit3D.omni(root, at + Vector3(-0.6, 1.5, -1.0), Color(1.0, 0.75, 0.45), 1.4, 3.5)
	for i: int in 4:
		var pizza_box: MeshInstance3D = Kit3D.box(root, at + Vector3(1.6, 0.06 + i * 0.12, -1.6), Vector3(0.7, 0.1, 0.7), Kit3D.toon(Color(0.85, 0.7, 0.5), 0.005))
		pizza_box.rotation.y = 0.15 * (i % 2)
	Kit3D.cylinder(root, at + Vector3(0.75, 0.9, -1.6), 0.06, 0.06, 0.16, Kit3D.toon(Color(0.95, 0.3, 0.3), 0.005), 10)
	# Gaming chair.
	Kit3D.box(root, at + Vector3(0.0, 0.5, -1.0), Vector3(0.6, 0.1, 0.6), Kit3D.toon(Color(0.12, 0.1, 0.14), 0.01))
	Kit3D.box(root, at + Vector3(0.0, 0.9, -0.72), Vector3(0.55, 0.7, 0.08), Kit3D.toon(Color(0.32, 0.05, 0.12), 0.01))


static func _wardrobe(root: Node3D, at: Vector3) -> void:
	var wood: Material = Kit3D.material(WOOD, 0.55)
	Kit3D.box(root, at + Vector3(0.0, 1.3, -2.4), Vector3(1.8, 2.6, 0.9), wood)
	Kit3D.box(root, at + Vector3(-0.45, 1.3, -1.94), Vector3(0.8, 2.3, 0.03), Kit3D.material(Color(0.7, 0.75, 0.85), 0.05, Color.BLACK, 0.0, 1.0))
	Kit3D.box(root, at + Vector3(0.45, 1.3, -1.94), Vector3(0.8, 2.3, 0.03), Kit3D.material(WOOD_DARK, 0.5))
	for x: float in [-0.88, 0.88]:
		Kit3D.box(root, at + Vector3(x, 1.3, -1.92), Vector3(0.03, 2.6, 0.03), Kit3D.neon(Color(1.0, 0.3, 0.7), 3.0))
	Kit3D.box(root, at + Vector3(0.0, 2.6, -1.92), Vector3(1.8, 0.03, 0.03), Kit3D.neon(Color(1.0, 0.3, 0.7), 3.0))


## A swirling hellmouth behind the dive door.
static func _hellmouth(root: Node3D, at: Vector3) -> void:
	for i: int in 3:
		var ring := MeshInstance3D.new()
		var torus := TorusMesh.new()
		torus.inner_radius = 1.1 + i * 0.35
		torus.outer_radius = 1.2 + i * 0.35
		torus.rings = 40
		torus.ring_segments = 6
		ring.mesh = torus
		ring.material_override = Kit3D.neon([LAVA, Color(1.0, 0.2, 0.3), Color(0.8, 0.1, 0.5)][i], 3.0 - i * 0.6)
		ring.position = at + Vector3(0.0, 1.3, -2.6 - i * 0.1)
		ring.rotation.x = PI * 0.5
		root.add_child(ring)
	Kit3D.cylinder(root, at + Vector3(0.0, 1.3, -2.85), 1.1, 1.1, 0.02, Kit3D.neon(Color(0.35, 0.02, 0.05), 1.0), 32).rotation.x = PI * 0.5
	Kit3D.omni(root, at + Vector3(0.0, 1.3, -1.2), LAVA, 1.8, 5.0)


## Every goddess Milo has freed lounges somewhere in the room.
static func _goddesses(root: Node3D, data: RoomData, floor_y: float) -> void:
	var spots: Array[float] = []
	var keep_clear: Array[float] = []
	for station: Variant in data.stations.values():
		keep_clear.append((station as Vector2).x / Kit3D.PX_PER_M)
	for exit: Vector2 in data.exits:
		keep_clear.append(exit.x / Kit3D.PX_PER_M)
	var x: float = 7.2
	var right: float = data.width * RoomData.TILE / Kit3D.PX_PER_M - 2.0
	while x < right:
		var free: bool = true
		for c: float in keep_clear:
			if absf(c - x) < 1.6:
				free = false
		if free:
			spots.append(x)
		x += 1.5
	var i: int = 0
	for boon: StringName in Save.unlocked_boons():
		if i >= spots.size():
			break
		var color: Color = BoonCatalog.color(boon)
		var figure: Node3D = CharacterModels.figure(boon, 1.75, color, 0.45 if i % 2 == 0 else -0.45)
		figure.position = Vector3(spots[i], floor_y, -2.2 + float(i % 2) * 0.4)
		root.add_child(figure)
		Kit3D.sign_text(root, BoonCatalog.text(boon, "name"), Vector3(spots[i], floor_y + 2.15, -2.0), color, 0.004, 64)
		i += 1
