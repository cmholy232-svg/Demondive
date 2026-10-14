class_name MonsterModels
extends RefCounted
## Rigged, animated monsters from Quaternius' Ultimate Monsters pack (CC0,
## art/monsters/) standing in for the primitive creatures. Each faces +x with
## feet at the origin under a "Body" node, like CreatureModels, and carries
## its AnimationPlayer as the "animator" meta for CharacterModels.animate.

## kind -> [file, height in metres]
const MONSTERS: Dictionary = {
	&"imp": ["mon_demon", 1.05],
	&"floater": ["mon_ghost", 0.95],
	&"hellhound": ["mon_blue_demon", 1.0],
	&"crawler": ["mon_spiky_blob", 0.95],
	&"lobber": ["mon_wizard", 1.0],
	&"diver": ["mon_dragon", 0.9],
	&"golem": ["mon_yeti", 1.6],
}

static var _scenes: Dictionary = {}


static func has(kind: StringName) -> bool:
	return MONSTERS.has(kind) and ResourceLoader.exists(_path(kind))


static func _path(kind: StringName) -> String:
	return "res://art/monsters/%s.gltf" % str((MONSTERS[kind] as Array)[0])


static func make(kind: StringName) -> Node3D:
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
	_fit(model, float((MONSTERS[kind] as Array)[1]))
	CharacterModels.toonify(model)
	var player := model.find_child("AnimationPlayer", true, false) as AnimationPlayer
	if player != null:
		for name: String in player.get_animation_list():
			if name != "Death":
				player.get_animation(name).loop_mode = Animation.LOOP_LINEAR
		root.set_meta("animator", player)
		CharacterModels.animate(root, "idle")
	return root


static func _fit(model: Node3D, height_m: float) -> void:
	var box := AABB()
	var first: bool = true
	for node: Node in model.find_children("*", "MeshInstance3D", true, false):
		var mesh := node as MeshInstance3D
		var local: AABB = mesh.get_aabb()
		local = mesh.transform * local
		box = local if first else box.merge(local)
		first = false
	if not first and box.size.y > 0.0:
		model.scale = Vector3.ONE * (height_m / box.size.y)
