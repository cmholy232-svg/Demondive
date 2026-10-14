class_name MonsterModels
extends RefCounted
## Rigged, animated monsters from Quaternius' Ultimate Monsters pack (CC0,
## art/monsters/) standing in for the primitive creatures. Each faces +x with
## feet at the origin under a "Body" node, like CreatureModels, and carries
## its AnimationPlayer as the "animator" meta for CharacterModels.animate.

## kind -> [file, how much taller than the hitbox the model is drawn]
const MONSTERS: Dictionary = {
	&"imp": ["mon_demon", 1.1],
	&"floater": ["mon_ghost", 1.0],
	&"hellhound": ["mon_blue_demon", 1.1],
	&"crawler": ["mon_spiky_blob", 1.0],
	&"lobber": ["mon_wizard", 1.1],
	&"diver": ["mon_dragon", 1.0],
	&"golem": ["mon_yeti", 1.1],
}

static var _scenes: Dictionary = {}


static func has(kind: StringName) -> bool:
	return MONSTERS.has(kind) and ResourceLoader.exists(_path(kind))


static func _path(kind: StringName) -> String:
	return "res://art/monsters/%s.gltf" % str((MONSTERS[kind] as Array)[0])


## hitbox: the enemy's hurtbox in metres; the model is fitted to it, feet
## on the enemy's origin, so what you see is what you can hit.
static func make(kind: StringName, hitbox: Vector2) -> Node3D:
	if not _scenes.has(kind):
		_scenes[kind] = load(_path(kind))
	var root := Node3D.new()
	var body := Node3D.new()
	body.name = "Body"
	root.add_child(body)
	var model: Node3D = (_scenes[kind] as PackedScene).instantiate() as Node3D
	# The pack's models face +z; turn them to face +x.
	model.rotation.y = PI * 0.5
	body.add_child(model)
	_fit(model, hitbox, float((MONSTERS[kind] as Array)[1]))
	CharacterModels.toonify(model)
	var player := model.find_child("AnimationPlayer", true, false) as AnimationPlayer
	if player != null:
		for name: String in player.get_animation_list():
			if name != "Death":
				player.get_animation(name).loop_mode = Animation.LOOP_LINEAR
		root.set_meta("animator", player)
		CharacterModels.animate(root, "idle")
	return root


static func _fit(model: Node3D, hitbox: Vector2, presence: float) -> void:
	var box := AABB()
	var first: bool = true
	for node: Node in model.find_children("*", "MeshInstance3D", true, false):
		var mesh := node as MeshInstance3D
		var local: AABB = _to_body(mesh, model) * mesh.get_aabb()
		box = local if first else box.merge(local)
		first = false
	if first or box.size.y <= 0.0:
		return
	# Height matches the hitbox; wide models (wings, tails) may overhang it a little, no more.
	var fit: float = minf(hitbox.y * presence / box.size.y, hitbox.x * 1.6 / maxf(0.01, box.size.x))
	model.scale = Vector3.ONE * fit
	var centre: Vector3 = box.get_center()
	model.position = Vector3(-centre.x * fit, -box.position.y * fit, -centre.z * fit)


## The mesh's transform relative to the model root, including the root's turn.
static func _to_body(node: Node3D, model: Node3D) -> Transform3D:
	var xf: Transform3D = node.transform
	var parent: Node = node.get_parent()
	while parent != null and parent != model:
		if parent is Node3D:
			xf = (parent as Node3D).transform * xf
		parent = parent.get_parent()
	return Transform3D(Basis(Vector3.UP, model.rotation.y), Vector3.ZERO) * xf
