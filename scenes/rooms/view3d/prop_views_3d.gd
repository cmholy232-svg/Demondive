class_name PropViews3D
extends Node3D
## 3D stand-ins for practice targets and Arcane Bolts, synced from 2D each frame.

const BOLT_COLOR: Color = Color(0.8, 0.6, 1.0)

var room: Node2D
var _targets: Dictionary = {}
var _bolts: Dictionary = {}


func bind(target_room: Node2D) -> void:
	room = target_room


func _process(_delta: float) -> void:
	if room == null:
		return
	_sync_targets()
	_sync_bolts()


func _sync_targets() -> void:
	for node: Node in get_tree().get_nodes_in_group("hurtbox"):
		var dummy := node as TargetDummy
		if dummy == null:
			continue
		if not _targets.has(dummy):
			_targets[dummy] = _make_target()
		var view: Node3D = _targets[dummy]
		view.position = RoomView3D.to_3d(dummy.global_position)
		view.visible = not dummy.is_broken()
		var core := view.get_child(1) as MeshInstance3D
		var mat := core.material_override as StandardMaterial3D
		mat.emission_energy_multiplier = 8.0 if dummy.is_flashing() else 1.5


func _make_target() -> Node3D:
	var root := Node3D.new()
	add_child(root)
	var body := MeshInstance3D.new()
	var capsule := CapsuleMesh.new()
	capsule.radius = 0.26
	capsule.height = 0.96
	body.mesh = capsule
	body.position.y = 0.48
	body.material_override = RoomDressing3D.material(Color(0.55, 0.12, 0.18), 0.4)
	root.add_child(body)
	var core := MeshInstance3D.new()
	var eye := SphereMesh.new()
	eye.radius = 0.09
	eye.height = 0.18
	core.mesh = eye
	core.position = Vector3(0.0, 0.72, 0.24)
	core.material_override = RoomDressing3D.material(Color.BLACK, 0.3, Color(1.0, 0.75, 0.3), 1.5)
	root.add_child(core)
	return root


func _sync_bolts() -> void:
	var alive: Dictionary = {}
	for node: Node in get_tree().get_nodes_in_group("arcane_bolt"):
		var bolt := node as ArcaneBolt
		if bolt == null:
			continue
		alive[bolt] = true
		if not _bolts.has(bolt):
			_bolts[bolt] = _make_bolt()
		(_bolts[bolt] as Node3D).position = RoomView3D.to_3d(bolt.global_position, 0.0)
	for bolt: Variant in _bolts.keys():
		if not alive.has(bolt):
			(_bolts[bolt] as Node3D).queue_free()
			_bolts.erase(bolt)


func _make_bolt() -> Node3D:
	var root := Node3D.new()
	add_child(root)
	var orb := MeshInstance3D.new()
	var sphere := SphereMesh.new()
	sphere.radius = 0.12
	sphere.height = 0.24
	orb.mesh = sphere
	orb.material_override = RoomDressing3D.material(Color.WHITE, 0.2, BOLT_COLOR, 7.0)
	root.add_child(orb)
	var light := OmniLight3D.new()
	light.light_color = BOLT_COLOR
	light.light_energy = 1.6
	light.omni_range = 2.2
	root.add_child(light)
	return root
