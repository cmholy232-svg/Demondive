class_name MechanicViews3D
extends Node3D
## Draws the room's level mechanics and keeps them moving: flowing currents,
## bubble columns, thorn thickets, rails that flare when live, shivering
## icicles, portal doors, mirrors and corruption pools.

static var _liquid_shader: Shader = preload("res://art/shaders/liquid.gdshader")
static var _shaft_shader: Shader = preload("res://art/shaders/light_shaft.gdshader")

var _mech: RoomMechanics
var _streaks: Array[MeshInstance3D] = []
var _streak_dirs: Array[float] = []
var _streak_ranges: Array[Vector2] = []
var _bubbles: Array[MeshInstance3D] = []
var _bubble_ranges: Array[Vector2] = []
var _rails: Dictionary = {}
var _icicles: Dictionary = {}
var _portals: Array[MeshInstance3D] = []
var _time: float = 0.0


func bind(room: Room, t: Dictionary) -> void:
	for child: Node in get_children():
		child.queue_free()
	_streaks.clear()
	_streak_dirs.clear()
	_streak_ranges.clear()
	_bubbles.clear()
	_bubble_ranges.clear()
	_rails.clear()
	_icicles.clear()
	_portals.clear()
	_mech = room.builder.mechanics
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(room.data.id)
	for zone: ForceZone in _mech.currents:
		_current(zone, t, rng)
	for zone: ForceZone in _mech.vents:
		_vent(zone, t, rng)
	for rect: Rect2 in _mech.cover:
		_thicket(rect, rng)
	for rail: HazardZone in _mech.rails:
		_rail(rail, t)
	for icicle: Icicle in _mech.icicles:
		_icicle(icicle)
	for portal: Portal in _mech.portals:
		_portal(portal, t)
	for rect: Rect2 in _mech.mirrors:
		_mirror(rect, t)
	for rect: Rect2 in _mech.corruption:
		_corruption(rect)


func _current(zone: ForceZone, t: Dictionary, rng: RandomNumberGenerator) -> void:
	var rect: Rect2 = zone.rect
	var center: Vector3 = Kit3D.rect_center(rect)
	var size := Vector3(rect.size.x, rect.size.y, 0.0) / Kit3D.PX_PER_M
	var water := ShaderMaterial.new()
	water.shader = _shaft_shader
	water.set_shader_parameter("color", BiomeKit.c(t, "lip"))
	water.set_shader_parameter("strength", 0.08)
	Kit3D.box(self, Vector3(center.x, center.y, -0.6), Vector3(size.x, size.y, 2.4), water)
	var streak: Material = Kit3D.neon(BiomeKit.c(t, "liquid_b"), 2.0)
	for i: int in int(size.x * 1.6) + 2:
		var mesh: MeshInstance3D = Kit3D.box(self, Vector3(rng.randf_range(rect.position.x, rect.end.x) / Kit3D.PX_PER_M, -rng.randf_range(rect.position.y, rect.end.y) / Kit3D.PX_PER_M, rng.randf_range(-1.6, 0.6)), Vector3(0.5, 0.02, 0.02), streak)
		_streaks.append(mesh)
		_streak_dirs.append(signf(zone.force.x))
		_streak_ranges.append(Vector2(rect.position.x, rect.end.x) / Kit3D.PX_PER_M)


func _vent(zone: ForceZone, t: Dictionary, rng: RandomNumberGenerator) -> void:
	var rect: Rect2 = zone.rect
	var x: float = rect.get_center().x / Kit3D.PX_PER_M
	var bottom: float = -rect.end.y / Kit3D.PX_PER_M
	var top: float = -rect.position.y / Kit3D.PX_PER_M
	Kit3D.cylinder(self, Vector3(x, bottom + 0.08, -0.5), 0.45, 0.55, 0.16, Kit3D.material(BiomeKit.c(t, "ledge"), 0.4, BiomeKit.c(t, "lip"), 1.2), 16)
	var glass: Material = Kit3D.material(Color(0.7, 0.95, 1.0), 0.05, BiomeKit.c(t, "lip"), 0.9, 0.2)
	for i: int in 14:
		var bubble: MeshInstance3D = Kit3D.sphere(self, Vector3(x + rng.randf_range(-0.35, 0.35), rng.randf_range(bottom, top), rng.randf_range(-0.9, 0.3)), rng.randf_range(0.05, 0.13), glass)
		_bubbles.append(bubble)
		_bubble_ranges.append(Vector2(bottom, top))


func _thicket(rect: Rect2, rng: RandomNumberGenerator) -> void:
	var leaf: Material = Kit3D.toon(Color(0.16, 0.32, 0.1), 0.012, 0.35)
	var leaf_light: Material = Kit3D.toon(Color(0.28, 0.5, 0.16), 0.012, 0.35)
	var thorn: Material = Kit3D.toon(Color(0.55, 0.35, 0.2), 0.0)
	var base_y: float = -rect.end.y / Kit3D.PX_PER_M
	var height: float = rect.size.y / Kit3D.PX_PER_M
	var x: float = rect.position.x / Kit3D.PX_PER_M
	while x < rect.end.x / Kit3D.PX_PER_M:
		for z: float in [0.45, -0.2, -0.8]:
			Kit3D.sphere(self, Vector3(x + rng.randf_range(-0.1, 0.1), base_y + height * rng.randf_range(0.35, 0.6), z), rng.randf_range(0.42, 0.6), leaf if rng.randf() < 0.5 else leaf_light, 1.3)
		for i: int in 3:
			Kit3D.cone(self, Vector3(x + rng.randf_range(-0.3, 0.3), base_y + height * rng.randf_range(0.5, 1.0), rng.randf_range(-0.6, 0.7)), 0.03, 0.22, thorn, Vector3(rng.randf_range(-1.0, 1.0), 0.0, rng.randf_range(-1.0, 1.0)))
		if rng.randf() < 0.4:
			Kit3D.sphere(self, Vector3(x, base_y + height * 0.9, 0.5), 0.08, Kit3D.neon(Color(1.0, 0.45, 0.65), 2.0))
		x += 0.45


func _rail(rail: HazardZone, t: Dictionary) -> void:
	var rect: Rect2 = rail.rect
	var center: Vector3 = Kit3D.rect_center(rect)
	var w: float = rect.size.x / Kit3D.PX_PER_M
	var y: float = -rect.end.y / Kit3D.PX_PER_M
	var metal: Material = Kit3D.material(Color(0.35, 0.32, 0.4), 0.25, Color.BLACK, 0.0, 0.9)
	for z: float in [0.35, -0.85]:
		Kit3D.box(self, Vector3(center.x, y + 0.08, z), Vector3(w, 0.08, 0.1), metal)
	var arc_mat := StandardMaterial3D.new()
	arc_mat.albedo_color = Color.BLACK
	arc_mat.emission_enabled = true
	arc_mat.emission = BiomeKit.c(t, "lip", Color(1.0, 0.9, 0.3))
	arc_mat.emission_energy_multiplier = 0.0
	var arc: MeshInstance3D = Kit3D.box(self, Vector3(center.x, y + 0.2, -0.25), Vector3(w, 0.06, 1.2), arc_mat)
	_rails[rail] = arc


func _icicle(icicle: Icicle) -> void:
	var holder := Node3D.new()
	add_child(holder)
	holder.position = Kit3D.to_3d(icicle.global_position)
	var ice: Material = Kit3D.material(Color(0.8, 0.94, 1.0), 0.05, Color(0.45, 0.8, 1.0), 0.8, 0.3)
	Kit3D.cone(holder, Vector3(0.0, 0.0, -0.2), 0.16, 0.7, ice, Vector3(PI, 0.0, 0.0))
	Kit3D.cone(holder, Vector3(0.15, 0.0, -0.5), 0.08, 0.4, ice, Vector3(PI, 0.0, 0.0))
	_icicles[icicle] = holder


func _portal(portal: Portal, t: Dictionary) -> void:
	var at: Vector3 = Kit3D.to_3d(portal.global_position, -0.4)
	var frame: Material = Kit3D.material(Color(0.4, 0.2, 0.15), 0.6)
	Kit3D.box(self, at + Vector3(0.0, 1.1, -0.1), Vector3(1.1, 2.3, 0.15), frame)
	var glow: MeshInstance3D = Kit3D.box(self, at + Vector3(0.0, 1.05, 0.0), Vector3(0.85, 2.05, 0.04), Kit3D.neon(BiomeKit.c(t, "strip", Color(0.75, 0.5, 1.0)), 2.5))
	_portals.append(glow)
	Kit3D.omni(self, at + Vector3(0.0, 1.2, 0.6), BiomeKit.c(t, "strip", Color(0.75, 0.5, 1.0)), 1.2, 3.0)


func _mirror(rect: Rect2, t: Dictionary) -> void:
	var center: Vector3 = Kit3D.rect_center(rect)
	var h: float = rect.size.y / Kit3D.PX_PER_M
	Kit3D.box(self, Vector3(center.x, center.y, -0.3), Vector3(0.12, h, 1.6), Kit3D.material(Color(0.82, 0.85, 0.95), 0.02, Color(0.6, 0.6, 0.9), 0.3, 1.0))
	Kit3D.box(self, Vector3(center.x, center.y, -0.3), Vector3(0.2, h + 0.1, 1.7), Kit3D.neon(BiomeKit.c(t, "lip"), 1.5))


func _corruption(rect: Rect2) -> void:
	var mat := ShaderMaterial.new()
	mat.shader = _liquid_shader
	mat.set_shader_parameter("color_a", Color(0.35, 0.0, 0.08))
	mat.set_shader_parameter("color_b", Color(0.9, 0.1, 0.25))
	mat.set_shader_parameter("energy", 1.2)
	var center: Vector3 = Kit3D.rect_center(rect)
	var top_y: float = -rect.position.y / Kit3D.PX_PER_M
	Kit3D.box(self, Vector3(center.x, top_y - 0.1, -1.25), Vector3(rect.size.x / Kit3D.PX_PER_M, 0.2, 3.9), mat)
	Kit3D.omni(self, Vector3(center.x, top_y + 0.5, 0.3), Color(1.0, 0.1, 0.25), 1.0, 3.0)


func _process(delta: float) -> void:
	if _mech == null:
		return
	_time += delta
	for i: int in _streaks.size():
		var mesh: MeshInstance3D = _streaks[i]
		var span: Vector2 = _streak_ranges[i]
		mesh.position.x += _streak_dirs[i] * 3.2 * delta
		if mesh.position.x > span.y:
			mesh.position.x = span.x
		elif mesh.position.x < span.x:
			mesh.position.x = span.y
	for i: int in _bubbles.size():
		var bubble: MeshInstance3D = _bubbles[i]
		bubble.position.y += 2.4 * delta
		if bubble.position.y > _bubble_ranges[i].y:
			bubble.position.y = _bubble_ranges[i].x
	for rail: Variant in _rails:
		if not is_instance_valid(rail):
			continue
		var zone := rail as HazardZone
		var mat := (_rails[rail] as MeshInstance3D).material_override as StandardMaterial3D
		if mat == null:
			mat = (_rails[rail] as MeshInstance3D).mesh.surface_get_material(0) as StandardMaterial3D
		var flicker: float = 0.5 + 0.5 * sin(_time * 50.0)
		mat.emission_energy_multiplier = 5.0 + flicker * 3.0 if zone.is_live() else (zone.warning_progress() * flicker * 2.0 if zone.is_warning() else 0.0)
	for icicle: Variant in _icicles:
		if not is_instance_valid(icicle):
			continue
		var ice := icicle as Icicle
		var holder := _icicles[icicle] as Node3D
		holder.visible = ice.state != &"gone"
		holder.position.x = ice.global_position.x / Kit3D.PX_PER_M + sin(_time * 70.0) * 0.03 * ice.shiver()
	for glow: MeshInstance3D in _portals:
		glow.scale.x = 1.0 + sin(_time * 3.0) * 0.06
