class_name CyberProps3D
extends RefCounted
## Neon Maw set dressing from Quaternius' Cyberpunk Game Kit (CC0,
## art/props/cyberpunk/): air-con units, pipes, screens and signs bolted to
## the faces of the stone blocks, brackets and cables under the ledges, a
## facade of clutter up the whole back wall, and street lamps on the floors.
## Decoration only: every piece sits outside the play plane or inside solid
## blocks, so nothing here touches gameplay.

const DIR: String = "res://art/props/cyberpunk/prop_%s.gltf"
## The kit's greys, darkened so neon light reads on them; orange stays as trim.
const TINT: Dictionary = {
	"LightGrey": Color(0.3, 0.27, 0.34), "Grey": Color(0.2, 0.18, 0.24), "DarkGrey": Color(0.11, 0.1, 0.14),
	"Black": Color(0.05, 0.04, 0.07), "Orange": Color(1.0, 0.45, 0.15),
}
const FACE_PROPS: Array[String] = ["ac", "ac_side", "ac_stacked", "tv_1", "tv_2", "sign_1", "sign_2", "sign_3", "sign_4", "sign_small_1"]
const WALL_PROPS: Array[String] = ["ac", "ac_side", "ac_stacked", "tv_1", "tv_2", "tv_3", "sign_1", "sign_2", "sign_3",
	"sign_4", "sign_small_1", "antenna_2", "computer_large", "pipe_2"]
const FACE_Z: float = 0.72

static var _templates: Dictionary = {}


static func build(root: Node3D, room: Room, wall_z: float) -> void:
	var data: RoomData = room.data
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(data.id) + 11
	var size: Vector2 = data.size_px() / Kit3D.PX_PER_M
	for rect: Rect2 in room.builder.solids:
		_dress_block(root, rect, data, rng)
	for rect: Rect2 in room.builder.ledges:
		_dress_ledge(root, rect, rng)
	_back_wall(root, size, wall_z, rng)
	_ceiling(root, size, rng)


static func place(parent: Node3D, prop: String, at: Vector3, scale: float = 1.0, yaw: float = 0.0) -> Node3D:
	var node: Node3D = _template(prop).duplicate() as Node3D
	node.position = at
	# The kit's signs face -z; everything is seen from +z.
	node.rotation.y = yaw + (PI if prop.begins_with("sign") else 0.0)
	node.scale = Vector3.ONE * scale
	parent.add_child(node)
	return node


static func _template(prop: String) -> Node3D:
	if not _templates.has(prop):
		var node: Node3D = (load(DIR % prop) as PackedScene).instantiate() as Node3D
		for child: Node in node.find_children("*", "MeshInstance3D", true, false):
			_restyle(child as MeshInstance3D)
		_templates[prop] = node
	return _templates[prop] as Node3D


## Kit greys go dark and slightly glossy; textured signs and screens glow.
static func _restyle(mesh: MeshInstance3D) -> void:
	mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	for surface: int in mesh.mesh.get_surface_count():
		var source := mesh.mesh.surface_get_material(surface) as BaseMaterial3D
		if source == null:
			continue
		var mat := StandardMaterial3D.new()
		if source.albedo_texture != null:
			mat.albedo_texture = source.albedo_texture
			mat.emission_enabled = true
			mat.emission_texture = source.albedo_texture
			mat.emission = Color.WHITE
			mat.emission_energy_multiplier = 1.6
			mat.roughness = 0.5
		else:
			mat.albedo_color = TINT.get(source.resource_name, source.albedo_color.darkened(0.6)) as Color
			mat.roughness = 0.45
			mat.metallic = 0.35
			# A faint self-glow keeps shapes readable in the club's darkness.
			mat.emission_enabled = true
			mat.emission = mat.albedo_color.lerp(Color(0.7, 0.3, 0.9), 0.3)
			mat.emission_energy_multiplier = 0.35
			if source.resource_name == "Orange":
				mat.emission_enabled = true
				mat.emission = Color(1.0, 0.4, 0.1)
				mat.emission_energy_multiplier = 0.2
		mesh.set_surface_override_material(surface, mat)


## Machinery on the front face of a stone block, kept inside its outline so it
## never covers a surface Milo stands on.
static func _dress_block(root: Node3D, rect: Rect2, data: RoomData, rng: RandomNumberGenerator) -> void:
	var w: float = rect.size.x / Kit3D.PX_PER_M
	var h: float = rect.size.y / Kit3D.PX_PER_M
	if w < 1.6 or h < 1.2:
		return
	var left: float = rect.position.x / Kit3D.PX_PER_M
	var top: float = -rect.position.y / Kit3D.PX_PER_M
	var count: int = clampi(int(w * h / 3.5), 1, 14)
	# Pipes run along wide faces; boxes and signs fill the rest.
	if w > 5.0 and h > 1.4:
		var pipe_y: float = top - rng.randf_range(0.45, minf(1.0, h - 0.4))
		var x: float = left + 2.4
		while x < left + w - 2.4:
			place(root, "pipe_1", Vector3(x, pipe_y, FACE_Z), 1.0)
			x += 2.4
	for i: int in count:
		var prop: String = FACE_PROPS[rng.randi_range(0, FACE_PROPS.size() - 1)]
		var x: float = rng.randf_range(left + 0.7, left + w - 0.7)
		var y: float = rng.randf_range(top - h + 0.6, top - 0.6)
		place(root, prop, Vector3(x, y, FACE_Z), rng.randf_range(0.7, 0.95))
	# Lamps along the back of wide floors.
	var tile_x: int = int(rect.position.x / RoomData.TILE)
	var tile_y: int = int(rect.position.y / RoomData.TILE)
	if w >= 6.0 and not data.is_solid(tile_x, tile_y - 1):
		var x: float = left + rng.randf_range(1.0, 3.0)
		while x < left + w - 0.5:
			place(root, "light_street_1" if rng.randf() < 0.7 else "light_street_2", Vector3(x, top, -2.7), 1.15)
			Kit3D.omni(root, Vector3(x, top + 3.0, -2.2), Color(1.0, 0.6, 0.85), 0.9, 4.5)
			x += rng.randf_range(8.0, 12.0)


## Brackets under a ledge and the odd cable dangling behind it.
static func _dress_ledge(root: Node3D, rect: Rect2, rng: RandomNumberGenerator) -> void:
	var left: float = rect.position.x / Kit3D.PX_PER_M
	var w: float = rect.size.x / Kit3D.PX_PER_M
	var y: float = -rect.position.y / Kit3D.PX_PER_M - 0.32
	for x: float in [left + 0.45, left + w - 0.45]:
		place(root, "support", Vector3(x, y, -0.55), 0.9)
	if w > 4.0 and rng.randf() < 0.6:
		place(root, "cable_long" if rng.randf() < 0.5 else "cable_thick", Vector3(left + rng.randf_range(1.0, w - 1.0), y, -1.25), 0.9)


## A facade of air-con units, screens, signs and pipes up the whole wall, so
## tall rooms have something to look at all the way up.
static func _back_wall(root: Node3D, size: Vector2, wall_z: float, rng: RandomNumberGenerator) -> void:
	var z: float = wall_z + 0.45
	var y: float = -size.y + 4.0
	while y < -1.5:
		var x: float = rng.randf_range(0.5, 3.0)
		while x < size.x:
			if Backdrop3D.in_opening(x):
				x = Backdrop3D.after_opening(x) + rng.randf_range(0.0, 1.5)
				continue
			var at := Vector3(x, y + rng.randf_range(-0.8, 0.8), z)
			if rng.randf() < 0.22:
				var color: Color = [NeonMawKit.MAGENTA, NeonMawKit.CYAN, NeonMawKit.AMBER][rng.randi_range(0, 2)]
				NeonArt3D.piece(root, rng.randi(), at + Vector3(0.0, 0.0, -0.15), rng.randf_range(0.9, 1.3), color)
			else:
				place(root, WALL_PROPS[rng.randi_range(0, WALL_PROPS.size() - 1)], at, rng.randf_range(1.1, 1.6))
			x += rng.randf_range(3.5, 6.5)
		y += rng.randf_range(3.2, 4.2)


## Square lamps hanging from the ceiling slab at the back.
static func _ceiling(root: Node3D, size: Vector2, rng: RandomNumberGenerator) -> void:
	var y: float = -RoomData.TILE / Kit3D.PX_PER_M
	var x: float = rng.randf_range(2.0, 5.0)
	while x < size.x - 1.0:
		place(root, "cable_long", Vector3(x, y + 0.3, -2.0), 0.6)
		place(root, "light_square", Vector3(x, y - 1.35, -2.0), 1.2)
		Kit3D.omni(root, Vector3(x, y - 1.8, -1.6), Color(0.6, 0.9, 1.0), 0.7, 4.0)
		x += rng.randf_range(7.0, 11.0)
