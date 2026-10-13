class_name BiomeProps
extends RefCounted
## Back-wall dressing for Levels 2 to 9, picked from the theme's "props"
## list and spaced so the wall never repeats exactly. Pure decoration.

const WALL_Z: float = -3.6


static func dress(root: Node3D, room: Room, t: Dictionary, rng: RandomNumberGenerator) -> void:
	var size: Vector2 = room.data.size_px()
	var w: float = size.x / Kit3D.PX_PER_M
	var floor_y: float = -size.y / Kit3D.PX_PER_M
	var styles: Array = t.get("props", []) as Array
	var signs: Array = t.get("signs", []) as Array
	var sign_colors: Array[Color] = BiomeKit.colors(t, "sign_colors")
	var x: float = rng.randf_range(1.0, 3.0)
	var next_sign: float = rng.randf_range(4.0, 9.0)
	var sign_index: int = rng.randi_range(0, 8)
	while x < w:
		if not signs.is_empty() and x >= next_sign:
			var y: float = rng.randf_range(floor_y + 4.6, minf(floor_y + 8.0, -2.0))
			Kit3D.sign_text(root, Strings.text(str(signs[sign_index % signs.size()])), Vector3(x + 1.5, y, WALL_Z + 0.25), sign_colors[sign_index % sign_colors.size()], 0.0075, 128)
			sign_index += 1
			next_sign = x + rng.randf_range(10.0, 14.0)
			x += 4.0
			continue
		if not styles.is_empty():
			_prop(root, str(styles[rng.randi_range(0, styles.size() - 1)]), x, floor_y, t, rng)
		x += rng.randf_range(3.5, 6.5)
	for i: int in int(w / 7.0) + 1:
		var tint: Color = BiomeKit.c(t, ["lip", "strip", "ledge_glow"][i % 3])
		Kit3D.omni(root, Vector3(i * 7.0 + 2.0, floor_y * 0.5, -1.8), tint, 1.3, 7.0)


static func _prop(root: Node3D, style: String, x: float, floor_y: float, t: Dictionary, rng: RandomNumberGenerator) -> void:
	match style:
		"columns":
			_column(root, x, floor_y, t)
		"coral":
			_coral(root, x, floor_y, t, rng)
		"bubbles":
			_bubbles(root, x, floor_y, t, rng)
		"trees":
			_tree(root, x, floor_y, t, rng)
		"vines":
			_vines(root, x, t, rng)
		"flowers":
			_flowers(root, x, floor_y, t, rng)
		"slots":
			_slot_machine(root, x, floor_y, t, rng)
		"chips":
			_chips(root, x, floor_y, t, rng)
		"marquee":
			_marquee(root, x, floor_y, t, rng)
		"windows":
			_window(root, x, floor_y, t, rng)
		"snow":
			_icicles(root, x, t, rng)
		"motel_doors":
			_motel_door(root, x, floor_y, t, rng)
		"lamps":
			_lamp(root, x, floor_y, t)
		"clocks":
			_clock(root, x, floor_y, t, rng)
		"mirror_panes":
			_mirror_pane(root, x, floor_y, t, rng)
		"masks":
			_mask(root, x, floor_y, t, rng)
		"towers":
			_tower(root, x, floor_y, t, rng)
		"banners":
			_banner(root, x, floor_y, t, rng)
		"candles":
			_candelabra(root, x, floor_y, t)
		"memories":
			_memory(root, x, floor_y, t, rng)
		"shards":
			_shard(root, x, floor_y, t, rng)


static func _dark(t: Dictionary, amount: float = 0.35) -> Material:
	return Kit3D.material(BiomeKit.c(t, "stone").darkened(amount), 0.85)


static func _column(root: Node3D, x: float, floor_y: float, t: Dictionary) -> void:
	var h: float = -floor_y + 4.0
	var z: float = WALL_Z + 0.6
	Kit3D.cylinder(root, Vector3(x, floor_y + h * 0.5 - 2.0, z), 0.32, 0.36, h, Kit3D.material(BiomeKit.c(t, "stone_top").darkened(0.25), 0.6), 14)
	for y: float in [floor_y + 0.2, floor_y + 6.5]:
		Kit3D.box(root, Vector3(x, y, z), Vector3(0.95, 0.35, 0.95), Kit3D.material(BiomeKit.c(t, "ledge"), 0.4, Color.BLACK, 0.0, 0.4))
	Kit3D.box(root, Vector3(x + 0.38, floor_y + 3.2, z + 0.38), Vector3(0.03, 5.5, 0.03), Kit3D.neon(BiomeKit.c(t, "lip"), 2.5))


static func _coral(root: Node3D, x: float, floor_y: float, t: Dictionary, rng: RandomNumberGenerator) -> void:
	for i: int in rng.randi_range(3, 6):
		var tint: Color = [BiomeKit.c(t, "strip"), BiomeKit.c(t, "lip"), Color(1.0, 0.55, 0.4)][i % 3]
		var stalk: MeshInstance3D = Kit3D.cone(root, Vector3(x + rng.randf_range(-0.8, 0.8), floor_y, WALL_Z + rng.randf_range(0.6, 1.6)), rng.randf_range(0.08, 0.18), rng.randf_range(0.8, 2.2), Kit3D.material(tint.darkened(0.3), 0.6, tint, 0.6))
		stalk.rotation.z = rng.randf_range(-0.4, 0.4)


static func _bubbles(root: Node3D, x: float, floor_y: float, t: Dictionary, rng: RandomNumberGenerator) -> void:
	var glass: Material = Kit3D.material(Color(0.6, 0.9, 1.0), 0.05, BiomeKit.c(t, "lip"), 0.6, 0.2)
	for i: int in 6:
		var bubble: MeshInstance3D = Kit3D.sphere(root, Vector3(x + rng.randf_range(-0.4, 0.4), floor_y + rng.randf_range(0.5, 8.0), WALL_Z + 1.2), rng.randf_range(0.05, 0.14), glass)
		bubble.set_meta("rise", rng.randf_range(0.5, 1.2))
		bubble.set_meta("rise_floor", floor_y)


static func _tree(root: Node3D, x: float, floor_y: float, t: Dictionary, rng: RandomNumberGenerator) -> void:
	var z: float = WALL_Z + rng.randf_range(0.5, 1.4)
	var h: float = rng.randf_range(6.0, 10.0)
	var bark: Material = Kit3D.material(Color(0.16, 0.1, 0.06), 0.9)
	Kit3D.cylinder(root, Vector3(x, floor_y + h * 0.5, z), 0.25, 0.45, h, bark, 10)
	for i: int in 3:
		var branch: MeshInstance3D = Kit3D.cylinder(root, Vector3(x + (0.7 if i % 2 == 0 else -0.7), floor_y + h * (0.45 + i * 0.15), z), 0.06, 0.12, 1.8, bark, 8)
		branch.rotation.z = 0.9 if i % 2 == 0 else -0.9
	var leaf: Material = Kit3D.toon(BiomeKit.c(t, "stone_top").lightened(0.1), 0.0, 0.3)
	for i: int in 4:
		Kit3D.sphere(root, Vector3(x + rng.randf_range(-1.6, 1.6), floor_y + h + rng.randf_range(-1.2, 0.6), z - 0.3), rng.randf_range(1.0, 1.8), leaf, 0.7)


static func _vines(root: Node3D, x: float, t: Dictionary, rng: RandomNumberGenerator) -> void:
	var vine: Material = Kit3D.material(BiomeKit.c(t, "stone_top"), 0.8)
	for i: int in 3:
		var length: float = rng.randf_range(2.0, 6.0)
		var vx: float = x + rng.randf_range(-1.0, 1.0)
		Kit3D.box(root, Vector3(vx, -length * 0.5, WALL_Z + 1.4 + i * 0.2), Vector3(0.05, length, 0.05), vine)
		Kit3D.sphere(root, Vector3(vx, -length, WALL_Z + 1.4 + i * 0.2), 0.12, Kit3D.neon(BiomeKit.c(t, "strip"), 2.0))


static func _flowers(root: Node3D, x: float, floor_y: float, t: Dictionary, rng: RandomNumberGenerator) -> void:
	for i: int in rng.randi_range(4, 8):
		var at := Vector3(x + rng.randf_range(-1.2, 1.2), floor_y + 0.05, WALL_Z + rng.randf_range(0.8, 2.0))
		Kit3D.cylinder(root, at + Vector3(0.0, 0.25, 0.0), 0.015, 0.02, 0.5, Kit3D.material(Color(0.2, 0.4, 0.15), 0.8), 6)
		Kit3D.sphere(root, at + Vector3(0.0, 0.52, 0.0), 0.08, Kit3D.material(BiomeKit.c(t, "strip"), 0.5, BiomeKit.c(t, "strip"), 1.2))


static func _slot_machine(root: Node3D, x: float, floor_y: float, t: Dictionary, rng: RandomNumberGenerator) -> void:
	var z: float = WALL_Z + 0.9
	Kit3D.box(root, Vector3(x, floor_y + 1.1, z), Vector3(1.1, 2.2, 0.9), Kit3D.material(Color(0.25, 0.05, 0.12), 0.35, Color.BLACK, 0.0, 0.6))
	Kit3D.box(root, Vector3(x, floor_y + 1.45, z + 0.46), Vector3(0.8, 0.5, 0.02), Kit3D.neon(BiomeKit.c(t, "lip"), 2.4))
	for i: int in 3:
		Kit3D.box(root, Vector3(x - 0.26 + i * 0.26, floor_y + 1.45, z + 0.48), Vector3(0.2, 0.36, 0.02), Kit3D.material(Color(0.95, 0.92, 0.85), 0.4, [BiomeKit.c(t, "strip"), BiomeKit.c(t, "lip"), Color(0.3, 0.9, 1.0)][rng.randi_range(0, 2)], 0.9))
	Kit3D.box(root, Vector3(x, floor_y + 2.35, z), Vector3(1.2, 0.3, 1.0), Kit3D.neon(BiomeKit.c(t, "strip"), 3.0))
	Kit3D.cylinder(root, Vector3(x + 0.65, floor_y + 1.6, z), 0.03, 0.03, 0.8, Kit3D.material(Color(0.8, 0.8, 0.8), 0.2, Color.BLACK, 0.0, 1.0), 6)
	Kit3D.sphere(root, Vector3(x + 0.65, floor_y + 2.0, z), 0.09, Kit3D.material(Color(0.9, 0.1, 0.2), 0.3))


static func _chips(root: Node3D, x: float, floor_y: float, t: Dictionary, rng: RandomNumberGenerator) -> void:
	for i: int in rng.randi_range(2, 4):
		var tint: Color = [Color(0.9, 0.1, 0.2), BiomeKit.c(t, "strip"), Color(0.1, 0.4, 0.9), BiomeKit.c(t, "lip")][i % 4]
		var stack: float = rng.randf_range(0.3, 1.4)
		Kit3D.cylinder(root, Vector3(x + i * 0.45, floor_y + stack * 0.5, WALL_Z + 1.5), 0.2, 0.2, stack, Kit3D.material(tint, 0.5), 16)


static func _marquee(root: Node3D, x: float, floor_y: float, t: Dictionary, rng: RandomNumberGenerator) -> void:
	var y: float = floor_y + rng.randf_range(5.0, 7.5)
	Kit3D.box(root, Vector3(x, y, WALL_Z + 0.3), Vector3(3.0, 1.0, 0.2), Kit3D.material(Color(0.08, 0.02, 0.1), 0.5))
	for i: int in 12:
		var bulb: Vector3 = Vector3(x - 1.4 + i * (2.8 / 11.0), y + (0.5 if i % 2 == 0 else -0.5), WALL_Z + 0.42)
		Kit3D.sphere(root, bulb, 0.06, Kit3D.neon(BiomeKit.c(t, "lip"), 4.0))


static func _window(root: Node3D, x: float, floor_y: float, t: Dictionary, rng: RandomNumberGenerator) -> void:
	var y: float = floor_y + rng.randf_range(4.5, 6.5)
	var frame: Material = Kit3D.material(BiomeKit.c(t, "stone"), 0.7)
	Kit3D.box(root, Vector3(x, y, WALL_Z + 0.25), Vector3(1.6, 3.6, 0.15), frame)
	for row: int in 3:
		for col: int in 2:
			var tint: Color = [Color(0.4, 0.7, 1.0), Color(0.8, 0.9, 1.0), Color(0.55, 0.5, 1.0)][(row + col) % 3]
			Kit3D.box(root, Vector3(x - 0.36 + col * 0.72, y - 1.1 + row * 1.1, WALL_Z + 0.34), Vector3(0.6, 0.95, 0.02), Kit3D.neon(tint, 1.4))
	Kit3D.sphere(root, Vector3(x, y + 1.95, WALL_Z + 0.34), 0.5, Kit3D.neon(Color(0.7, 0.85, 1.0), 1.2), 0.5)
	var shaft := Kit3D.omni(root, Vector3(x, y, WALL_Z + 1.5), Color(0.7, 0.85, 1.0), 0.8, 5.0)
	shaft.shadow_enabled = false


static func _icicles(root: Node3D, x: float, t: Dictionary, rng: RandomNumberGenerator) -> void:
	var ice: Material = Kit3D.material(Color(0.8, 0.92, 1.0), 0.05, Color(0.5, 0.8, 1.0), 0.4, 0.3)
	for i: int in rng.randi_range(4, 8):
		var length: float = rng.randf_range(0.4, 1.6)
		Kit3D.cone(root, Vector3(x + rng.randf_range(-1.2, 1.2), -0.2, WALL_Z + rng.randf_range(0.6, 2.4)), 0.08, length, ice, Vector3(PI, 0.0, 0.0))


static func _motel_door(root: Node3D, x: float, floor_y: float, t: Dictionary, rng: RandomNumberGenerator) -> void:
	var z: float = WALL_Z + 0.25
	Kit3D.box(root, Vector3(x, floor_y + 1.2, z), Vector3(1.3, 2.5, 0.12), Kit3D.material(Color(0.35, 0.18, 0.12), 0.6))
	Kit3D.box(root, Vector3(x, floor_y + 1.2, z + 0.07), Vector3(1.05, 2.25, 0.04), Kit3D.material(Color(0.5, 0.15, 0.2), 0.5))
	Kit3D.sphere(root, Vector3(x + 0.38, floor_y + 1.1, z + 0.12), 0.05, Kit3D.material(Color(0.9, 0.75, 0.35), 0.2, Color.BLACK, 0.0, 1.0))
	Kit3D.sign_text(root, str(rng.randi_range(1, 9)) + "0" + str(rng.randi_range(0, 9)), Vector3(x, floor_y + 2.0, z + 0.1), Color(0.95, 0.8, 0.45), 0.004, 64)
	Kit3D.box(root, Vector3(x, floor_y + 0.02, z + 0.3), Vector3(1.0, 0.04, 0.5), Kit3D.neon(BiomeKit.c(t, "strip"), 1.2))


static func _lamp(root: Node3D, x: float, floor_y: float, t: Dictionary) -> void:
	var z: float = WALL_Z + 0.35
	Kit3D.box(root, Vector3(x, floor_y + 3.2, z), Vector3(0.1, 0.4, 0.1), Kit3D.material(Color(0.2, 0.15, 0.1), 0.5))
	Kit3D.cone(root, Vector3(x, floor_y + 2.9, z + 0.15), 0.35, 0.3, Kit3D.material(Color(0.95, 0.85, 0.65), 0.6, Color(1.0, 0.8, 0.5), 1.4))
	Kit3D.omni(root, Vector3(x, floor_y + 2.6, z + 0.6), Color(1.0, 0.8, 0.55), 1.0, 4.0)


static func _clock(root: Node3D, x: float, floor_y: float, t: Dictionary, rng: RandomNumberGenerator) -> void:
	var at := Vector3(x, floor_y + rng.randf_range(4.0, 6.5), WALL_Z + 0.3)
	var face: MeshInstance3D = Kit3D.cylinder(root, at, 0.6, 0.6, 0.08, Kit3D.material(Color(0.95, 0.92, 0.85), 0.5, BiomeKit.c(t, "strip"), 0.3), 24)
	face.rotation.x = PI * 0.5
	var hand: MeshInstance3D = Kit3D.box(root, at + Vector3(0.0, 0.0, 0.06), Vector3(0.04, 0.5, 0.02), Kit3D.material(Color(0.1, 0.05, 0.1), 0.5))
	hand.set_meta("spin_z", rng.randf_range(-2.0, 2.0))


static func _mirror_pane(root: Node3D, x: float, floor_y: float, t: Dictionary, rng: RandomNumberGenerator) -> void:
	var h: float = rng.randf_range(3.0, 6.0)
	var z: float = WALL_Z + rng.randf_range(0.3, 1.0)
	Kit3D.box(root, Vector3(x, floor_y + h * 0.5, z), Vector3(1.4, h, 0.08), Kit3D.material(Color(0.75, 0.78, 0.9), 0.02, Color.BLACK, 0.0, 1.0))
	Kit3D.box(root, Vector3(x, floor_y + h * 0.5, z - 0.05), Vector3(1.6, h + 0.2, 0.06), Kit3D.neon(BiomeKit.c(t, "lip"), 1.6))


static func _mask(root: Node3D, x: float, floor_y: float, t: Dictionary, rng: RandomNumberGenerator) -> void:
	var at := Vector3(x, floor_y + rng.randf_range(3.5, 7.0), WALL_Z + 0.4)
	Kit3D.sphere(root, at, 0.45, Kit3D.material(Color(0.95, 0.93, 0.98), 0.3), 1.25)
	for side: float in [-0.16, 0.16]:
		Kit3D.sphere(root, at + Vector3(side, 0.1, 0.38), 0.07, Kit3D.material(Color.BLACK, 0.4))
	Kit3D.box(root, at + Vector3(0.0, -0.22, 0.38), Vector3(0.22, 0.03, 0.02), Kit3D.neon(BiomeKit.c(t, "lip"), 2.0))


static func _tower(root: Node3D, x: float, floor_y: float, t: Dictionary, rng: RandomNumberGenerator) -> void:
	var h: float = rng.randf_range(8.0, 14.0)
	var z: float = WALL_Z + 0.2
	Kit3D.box(root, Vector3(x, floor_y + h * 0.5, z), Vector3(2.2, h, 0.4), _dark(t, 0.1))
	for row: int in int(h / 1.2):
		for col: int in 3:
			if rng.randf() < 0.45:
				Kit3D.box(root, Vector3(x - 0.65 + col * 0.65, floor_y + 0.8 + row * 1.2, z + 0.22), Vector3(0.35, 0.5, 0.02), Kit3D.neon(BiomeKit.c(t, "strip"), 1.2))


static func _banner(root: Node3D, x: float, floor_y: float, t: Dictionary, rng: RandomNumberGenerator) -> void:
	var length: float = rng.randf_range(3.0, 5.5)
	var top: float = floor_y + rng.randf_range(7.0, 9.0)
	Kit3D.box(root, Vector3(x, top - length * 0.5, WALL_Z + 0.3), Vector3(1.1, length, 0.03), Kit3D.material(BiomeKit.c(t, "lip").darkened(0.45), 0.8))
	Kit3D.box(root, Vector3(x, top, WALL_Z + 0.32), Vector3(1.4, 0.08, 0.08), Kit3D.material(BiomeKit.c(t, "strip"), 0.3, Color.BLACK, 0.0, 1.0))
	Kit3D.cone(root, Vector3(x, top - length, WALL_Z + 0.3), 0.55, 0.5, Kit3D.material(BiomeKit.c(t, "lip").darkened(0.45), 0.8), Vector3(PI, 0.0, 0.0))
	Kit3D.sphere(root, Vector3(x, top - length * 0.4, WALL_Z + 0.35), 0.18, Kit3D.neon(BiomeKit.c(t, "strip"), 2.0))


static func _candelabra(root: Node3D, x: float, floor_y: float, t: Dictionary) -> void:
	var z: float = WALL_Z + 1.0
	var gold: Material = Kit3D.material(BiomeKit.c(t, "strip"), 0.3, Color.BLACK, 0.0, 1.0)
	Kit3D.cylinder(root, Vector3(x, floor_y + 1.0, z), 0.04, 0.12, 2.0, gold, 8)
	for side: float in [-0.4, 0.0, 0.4]:
		Kit3D.cylinder(root, Vector3(x + side, floor_y + 2.05, z), 0.05, 0.05, 0.25, Kit3D.material(Color(0.95, 0.9, 0.85), 0.6), 8)
		Kit3D.sphere(root, Vector3(x + side, floor_y + 2.25, z), 0.05, Kit3D.neon(Color(1.0, 0.6, 0.2), 5.0))
	Kit3D.omni(root, Vector3(x, floor_y + 2.4, z + 0.4), Color(1.0, 0.6, 0.3), 1.0, 3.5)


## The Self Below: drifting pieces of Milo's Hellroom, a bed and a desk lamp and a door, lit from inside.
static func _memory(root: Node3D, x: float, floor_y: float, t: Dictionary, rng: RandomNumberGenerator) -> void:
	var at := Vector3(x, floor_y + rng.randf_range(3.0, 8.0), WALL_Z + rng.randf_range(0.5, 2.0))
	var ghost: Material = Kit3D.material(BiomeKit.c(t, "stone_top"), 0.6, BiomeKit.c(t, "lip"), 0.25)
	var piece: MeshInstance3D
	match rng.randi_range(0, 2):
		0:
			piece = Kit3D.box(root, at, Vector3(2.0, 0.5, 1.0), ghost)
		1:
			piece = Kit3D.box(root, at, Vector3(1.0, 2.0, 0.1), ghost)
		_:
			piece = Kit3D.box(root, at, Vector3(1.2, 0.8, 0.6), ghost)
	piece.rotation = Vector3(rng.randf_range(-0.3, 0.3), rng.randf_range(-0.6, 0.6), rng.randf_range(-0.4, 0.4))
	piece.set_meta("drift", rng.randf_range(0.2, 0.5))


static func _shard(root: Node3D, x: float, floor_y: float, t: Dictionary, rng: RandomNumberGenerator) -> void:
	var at := Vector3(x, floor_y + rng.randf_range(2.0, 9.0), WALL_Z + rng.randf_range(0.5, 2.5))
	var shard: MeshInstance3D = Kit3D.cone(root, at, rng.randf_range(0.15, 0.4), rng.randf_range(0.6, 1.6), Kit3D.material(Color(0.1, 0.08, 0.18), 0.1, BiomeKit.c(t, "lip"), 0.8, 0.6))
	shard.rotation = Vector3(rng.randf_range(0.0, TAU), 0.0, rng.randf_range(0.0, TAU))
	shard.set_meta("spin", rng.randf_range(-0.4, 0.4))
