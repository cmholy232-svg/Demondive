class_name SpecialViews3D
extends Node3D
## Draws the Specials that stay on screen: Luna's moon orb, Isolde's crystal
## clone, Vespera's mirror shell, Seraphine's orbiting halo charges, and the
## shield bubble when Milo has a shield. Reads gameplay state only.

const HALO_RADIUS: float = 0.85

var _milo: Milo
var _moon: MeshInstance3D
var _crystal: Node3D
var _mirror: MeshInstance3D
var _bubble: MeshInstance3D
var _halos: Array[MeshInstance3D] = []
## Seraphine's orbiting fragments (the boon's Arcane modifier).
var _fragments: Array[MeshInstance3D] = []
var _time: float = 0.0


func bind(milo: Milo) -> void:
	_milo = milo
	_moon = Kit3D.sphere(self, Vector3.ZERO, 0.22, Kit3D.material(Color(0.9, 0.88, 1.0), 0.2, BoonCatalog.color(&"luna"), 3.0))
	_crystal = Node3D.new()
	add_child(_crystal)
	var ice: Material = Kit3D.material(Color(0.8, 0.95, 1.0), 0.05, BoonCatalog.color(&"isolde"), 1.4, 0.4)
	Kit3D.cone(_crystal, Vector3(0.0, 0.9, 0.0), 0.32, 0.9, ice)
	Kit3D.cone(_crystal, Vector3(0.0, 0.45, 0.0), 0.32, 0.9, ice, Vector3(PI, 0.0, 0.0))
	_mirror = Kit3D.sphere(self, Vector3.ZERO, 1.05, _glass(BoonCatalog.color(&"vespera"), 0.18))
	_bubble = Kit3D.sphere(self, Vector3.ZERO, 0.95, _glass(BoonCatalog.color(&"seraphine"), 0.1))
	for i: int in 8:
		var halo: MeshInstance3D = Kit3D.cylinder(self, Vector3.ZERO, 0.16, 0.16, 0.03, Kit3D.neon(BoonCatalog.color(&"seraphine"), 3.0), 16)
		_halos.append(halo)
	for i: int in 4:
		var shard: MeshInstance3D = Kit3D.cone(self, Vector3.ZERO, 0.07, 0.22, Kit3D.neon(BoonCatalog.color(&"seraphine"), 4.0))
		_fragments.append(shard)


func _glass(color: Color, alpha: float) -> StandardMaterial3D:
	var mat := StandardMaterial3D.new()
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.albedo_color = Color(color.r, color.g, color.b, alpha)
	mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	return mat


func _process(delta: float) -> void:
	_time += delta
	var sp := get_tree().get_first_node_in_group(&"specials") as Specials
	if _milo == null or not is_instance_valid(_milo) or sp == null:
		visible = false
		return
	visible = true
	var chest: Vector3 = Kit3D.to_3d(_milo.global_position + Vector2(0.0, -64.0))
	_moon.visible = sp.moon_left > 0.0
	if _moon.visible:
		_moon.position = Kit3D.to_3d(sp.moon_orb_position()) + Vector3(0.0, sin(_time * 3.0) * 0.06, 0.2)
	_crystal.visible = sp.echo_left > 0.0
	if _crystal.visible:
		_crystal.position = Kit3D.to_3d(sp.echo_origin + Vector2(0.0, 64.0))
		_crystal.rotation.y = _time * 1.5
	_mirror.visible = sp.mirror_left > 0.0
	_mirror.position = chest
	_mirror.scale = Vector3.ONE * (1.0 + sin(_time * 8.0) * 0.03)
	_bubble.visible = Game.shield > 0.5
	_bubble.position = chest
	for i: int in _halos.size():
		var halo: MeshInstance3D = _halos[i]
		halo.visible = i < sp.halo_charges
		var angle: float = _time * 2.2 + TAU * i / maxf(1.0, float(sp.halo_charges))
		halo.position = chest + Vector3(cos(angle) * HALO_RADIUS, sin(angle * 2.0) * 0.1 + 0.2, sin(angle) * HALO_RADIUS)
	var spots: Array[Vector2] = []
	if sp.companions != null:
		spots = sp.companions.fragment_positions()
	for i: int in _fragments.size():
		var shard: MeshInstance3D = _fragments[i]
		shard.visible = i < spots.size()
		if shard.visible:
			shard.position = Kit3D.to_3d(spots[i]) + Vector3(0.0, 0.0, 0.25)
			shard.rotation = Vector3(0.0, _time * 4.0, PI)
