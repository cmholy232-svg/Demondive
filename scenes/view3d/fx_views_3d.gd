class_name FxViews3D
extends Node3D
## Bolts, hostile shots, pickups, hazard telegraphs and one-shot effects.

## kind -> [particle count, speed, size, lifetime, ring]
const BURSTS: Dictionary = {
	&"hit": [14, 3.0, 0.05, 0.25, false], &"death": [40, 5.0, 0.09, 0.6, true],
	&"hurt": [24, 4.0, 0.07, 0.4, false], &"dodge": [30, 4.5, 0.06, 0.45, true],
	&"sparkle": [8, 1.5, 0.04, 0.35, false], &"blast": [36, 6.0, 0.1, 0.45, true],
	&"ember": [5, 1.0, 0.04, 0.5, false], &"portal": [30, 2.0, 0.06, 0.7, true],
	&"fizzle": [8, 1.6, 0.04, 0.2, false], &"wave": [40, 7.0, 0.08, 0.5, true],
	&"barrier": [30, 2.5, 0.08, 0.6, true], &"gust": [40, 8.0, 0.06, 0.4, true],
	&"devour": [40, 3.0, 0.1, 0.6, true], &"announce": [20, 2.0, 0.06, 0.5, true],
	&"spark": [16, 6.0, 0.035, 0.18, false], &"frost": [26, 2.2, 0.06, 0.55, true],
	&"mirror": [18, 4.0, 0.05, 0.3, false], &"beam": [50, 1.5, 0.09, 0.5, true],
	&"vine": [24, 1.8, 0.07, 0.6, true], &"charm": [18, 1.6, 0.06, 0.7, true],
	&"dice": [30, 4.0, 0.07, 0.5, true], &"blink": [34, 3.5, 0.06, 0.35, true],
	&"halo": [28, 2.0, 0.05, 0.6, true],
}

## Particle sprites (Kenney Particle Pack, CC0).
const GLOW: String = "res://art/fx/fx_glow_soft.png"
const CORE: String = "res://art/fx/fx_bolt_core.png"
const SPARKLE: String = "res://art/fx/fx_bolt_sparkle.png"
const SPARK: String = "res://art/fx/fx_spark_star.png"
const RING: String = "res://art/fx/fx_ring_wave.png"

var _room: Room
var _bolts: Dictionary = {}
var _shots: Dictionary = {}
var _pickups: Dictionary = {}
var _hazards: Dictionary = {}
var _time: float = 0.0


func _ready() -> void:
	Game.fx_requested.connect(_burst)


func bind_room(room: Room) -> void:
	_room = room
	for table: Dictionary in [_bolts, _shots, _pickups, _hazards]:
		for view: Variant in table.values():
			(view as Node3D).queue_free()
		table.clear()


func _process(delta: float) -> void:
	_time += delta
	_sync(&"arcane_bolt", _bolts, _make_bolt, _update_bolt)
	_sync(EnemyShot.GROUP, _shots, _make_shot, _update_simple)
	_sync(Pickup.GROUP, _pickups, _make_pickup, _update_pickup)
	_sync(HazardZone.GROUP, _hazards, _make_hazard, _update_hazard)


func _sync(group: StringName, table: Dictionary, make: Callable, update: Callable) -> void:
	var alive: Dictionary = {}
	for node: Node in get_tree().get_nodes_in_group(group):
		alive[node] = true
		if not table.has(node):
			var view: Node3D = make.call(node)
			add_child(view)
			table[node] = view
		update.call(node, table[node])
	for node: Variant in table.keys():
		if not alive.has(node):
			(table[node] as Node3D).queue_free()
			table.erase(node)


func _make_bolt(node: Node) -> Node3D:
	var bolt := node as ArcaneBolt
	var root := Node3D.new()
	var color: Color = bolt.stats.color if bolt != null else Color(0.8, 0.6, 1.0)
	var radius: float = (bolt.radius if bolt != null else 10.0) / Kit3D.PX_PER_M
	Kit3D.billboard(root, Vector3.ZERO, radius * 9.0, Kit3D.sprite(GLOW, color, 1.6))
	Kit3D.billboard(root, Vector3(0.0, 0.0, 0.01), radius * 6.0, Kit3D.sprite(CORE, color.lerp(Color.WHITE, 0.5), 2.5))
	Kit3D.billboard(root, Vector3(0.0, 0.0, 0.02), radius * 7.0, Kit3D.sprite(SPARKLE, color, 2.0))
	var trail := CPUParticles3D.new()
	trail.amount = 18
	trail.lifetime = 0.22
	trail.local_coords = false
	trail.gravity = Vector3.ZERO
	trail.initial_velocity_min = 0.0
	trail.initial_velocity_max = 0.2
	trail.scale_amount_min = radius * 3.0
	trail.scale_amount_max = radius * 4.5
	var mesh := QuadMesh.new()
	var trail_color: Color = color if bolt == null or bolt.stats.trail_colors.is_empty() else bolt.stats.trail_colors[0]
	mesh.material = Kit3D.sprite(GLOW, trail_color, 1.4)
	trail.mesh = mesh
	var curve := Curve.new()
	curve.add_point(Vector2(0.0, 1.0))
	curve.add_point(Vector2(1.0, 0.0))
	trail.scale_amount_curve = curve
	root.add_child(trail)
	Kit3D.omni(root, Vector3.ZERO, color, 1.2, 1.8)
	return root


func _update_bolt(node: Node, view: Node3D) -> void:
	view.position = Kit3D.to_3d((node as Node2D).global_position)


func _make_shot(node: Node) -> Node3D:
	var shot := node as EnemyShot
	var root := Node3D.new()
	var radius: float = shot.radius / Kit3D.PX_PER_M
	Kit3D.sphere(root, Vector3.ZERO, radius * 1.1, Kit3D.material(shot.color, 0.3, shot.color, 4.0))
	Kit3D.billboard(root, Vector3.ZERO, radius * 7.0, Kit3D.sprite(GLOW, shot.color, 1.5))
	return root


func _update_simple(node: Node, view: Node3D) -> void:
	view.position = Kit3D.to_3d((node as Node2D).global_position)


func _make_pickup(node: Node) -> Node3D:
	var pickup := node as Pickup
	var root := Node3D.new()
	match pickup.kind:
		Pickup.Kind.SHARD:
			var gem: MeshInstance3D = Kit3D.sphere(root, Vector3.ZERO, 0.09, Kit3D.material(Color(0.6, 0.9, 1.0), 0.1, Color(0.5, 0.85, 1.0), 2.5), 1.6)
			gem.scale = Vector3(0.7, 1.0, 0.7)
		Pickup.Kind.ENERGY:
			Kit3D.sphere(root, Vector3.ZERO, 0.06, Kit3D.neon(Color(0.36, 0.88, 1.0), 4.0))
		Pickup.Kind.PIZZA:
			var slice: MeshInstance3D = Kit3D.cylinder(root, Vector3.ZERO, 0.0, 0.26, 0.05, Kit3D.toon(Color(1.0, 0.75, 0.3), 0.01), 3)
			slice.rotation = Vector3(PI * 0.5, 0.0, 0.0)
			Kit3D.sphere(root, Vector3(0.0, 0.0, 0.03), 0.05, Kit3D.toon(Color(0.85, 0.15, 0.1), 0.0))
		Pickup.Kind.COFFEE:
			Kit3D.cylinder(root, Vector3.ZERO, 0.1, 0.08, 0.22, Kit3D.toon(Color(0.95, 0.92, 0.88), 0.01), 12)
			Kit3D.cylinder(root, Vector3(0.0, 0.12, 0.0), 0.11, 0.11, 0.03, Kit3D.toon(Color(0.35, 0.18, 0.08), 0.01), 12)
	return root


func _update_pickup(node: Node, view: Node3D) -> void:
	var pickup := node as Pickup
	view.position = Kit3D.to_3d(pickup.global_position) + Vector3(0.0, sin(_time * 3.0 + pickup.position.x) * 0.04, 0.0)
	view.rotation.y = _time * 2.0


func _make_hazard(node: Node) -> Node3D:
	var zone := node as HazardZone
	var root := Node3D.new()
	if zone.kind == &"spikes" or zone.kind == &"lava":
		return root
	var size := Vector3(zone.rect.size.x / Kit3D.PX_PER_M, zone.rect.size.y / Kit3D.PX_PER_M, 1.8)
	var warn: MeshInstance3D = Kit3D.box(root, Vector3(0.0, 0.0, -0.4), size, _translucent(zone.color, 0.22))
	warn.name = "Warn"
	var live: MeshInstance3D = Kit3D.box(root, Vector3(0.0, 0.0, -0.4), size, Kit3D.material(zone.color, 0.4, zone.color, 3.0))
	live.name = "Live"
	root.position = Kit3D.rect_center(zone.rect)
	return root


func _update_hazard(node: Node, view: Node3D) -> void:
	var zone := node as HazardZone
	var warn := view.get_node_or_null("Warn") as MeshInstance3D
	if warn == null:
		return
	var live := view.get_node("Live") as MeshInstance3D
	warn.visible = zone.is_warning()
	live.visible = zone.is_live()
	if zone.is_warning():
		var p: float = zone.warning_progress()
		warn.scale = Vector3(1.0, maxf(0.05, p), 1.0)
		warn.position.y = -(1.0 - maxf(0.05, p)) * zone.rect.size.y / Kit3D.PX_PER_M * 0.5
		warn.transparency = 0.5 - 0.3 * sin(_time * 18.0) * p


func _translucent(color: Color, alpha: float) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = Color(color.r, color.g, color.b, alpha)
	return mat


func _burst(kind: StringName, at: Vector2, color: Color, size: float) -> void:
	var spec: Array = BURSTS.get(kind, BURSTS[&"hit"]) as Array
	var particles := CPUParticles3D.new()
	particles.position = Kit3D.to_3d(at, 0.1)
	particles.one_shot = true
	particles.explosiveness = 0.95
	particles.amount = int(spec[0])
	particles.lifetime = float(spec[3])
	particles.spread = 180.0
	particles.direction = Vector3.UP
	particles.initial_velocity_min = float(spec[1]) * 0.4 * size
	particles.initial_velocity_max = float(spec[1]) * size
	particles.gravity = Vector3(0.0, -6.0, 0.0)
	particles.scale_amount_min = float(spec[2]) * 2.0
	particles.scale_amount_max = float(spec[2]) * 4.0
	var mesh := QuadMesh.new()
	mesh.material = Kit3D.sprite(SPARK, color, 2.2)
	particles.mesh = mesh
	var fade := Curve.new()
	fade.add_point(Vector2(0.0, 1.0))
	fade.add_point(Vector2(1.0, 0.0))
	particles.scale_amount_curve = fade
	add_child(particles)
	particles.emitting = true
	if bool(spec[4]):
		_ring(particles.position, color, size)
	get_tree().create_timer(float(spec[3]) + 0.3).timeout.connect(particles.queue_free)


func _ring(at: Vector3, color: Color, size: float) -> void:
	var ring: MeshInstance3D = Kit3D.billboard(self, at, 2.0, Kit3D.sprite(RING, color, 2.5))
	ring.scale = Vector3.ONE * 0.1
	var tween := create_tween()
	tween.tween_property(ring, "scale", Vector3.ONE * maxf(0.6, size) * 1.4, 0.3).set_ease(Tween.EASE_OUT)
	tween.tween_callback(ring.queue_free)
