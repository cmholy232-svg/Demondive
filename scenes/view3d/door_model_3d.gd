class_name DoorModel3D
extends RefCounted
## Exit doors (a neon arch, sealed by red light until the room is clear,
## then a glowing portal tinted by its reward) and boon-giver cages.

const REWARD_COLORS: Dictionary = {
	&"boon": Color(1.0, 0.75, 0.3), &"shards": Color(0.6, 0.9, 1.0), &"feast": Color(1.0, 0.5, 0.3),
	&"heart": Color(1.0, 0.25, 0.4), &"miniboss": Color(1.0, 0.3, 0.2), &"boss": Color(1.0, 0.1, 0.4),
	&"recovery": Color(0.4, 1.0, 0.6), &"level_end": Color(1.0, 1.0, 1.0),
}


static func reward_color(reward: StringName) -> Color:
	return REWARD_COLORS.get(reward, Color(0.8, 0.6, 1.0)) as Color


static func make(door: ExitDoor) -> Node3D:
	var root := Node3D.new()
	root.position = Kit3D.to_3d(door.global_position, -0.9)
	var frame: Material = Kit3D.material(Color(0.1, 0.07, 0.12), 0.4, Color.BLACK, 0.0, 0.6)
	var color: Color = reward_color(door.reward)
	for x: float in [-0.68, 0.68]:
		Kit3D.box(root, Vector3(x, 1.0, 0.0), Vector3(0.18, 2.1, 0.4), frame)
		var tube: MeshInstance3D = Kit3D.box(root, Vector3(x, 1.0, 0.22), Vector3(0.05, 2.0, 0.05), Kit3D.neon(color, 4.0))
		tube.name = "Tube"
	Kit3D.box(root, Vector3(0.0, 2.1, 0.0), Vector3(1.55, 0.2, 0.4), frame)
	var portal: MeshInstance3D = Kit3D.box(root, Vector3(0.0, 1.0, 0.0), Vector3(1.2, 2.0, 0.05), Kit3D.neon(color, 2.2))
	portal.name = "Portal"
	var bars := Node3D.new()
	bars.name = "Bars"
	root.add_child(bars)
	for i: int in 5:
		Kit3D.box(bars, Vector3(-0.48 + i * 0.24, 1.0, 0.15), Vector3(0.03, 2.0, 0.03), Kit3D.neon(Color(1.0, 0.1, 0.15), 3.5))
	var label: Label3D = Kit3D.sign_text(root, Strings.text("reward.%s" % door.reward), Vector3(0.0, 2.55, 0.25), color, 0.006, 96)
	label.name = "Label"
	return root


static func update(root: Node3D, door: ExitDoor, time: float) -> void:
	(root.get_node("Bars") as Node3D).visible = not door.open
	var portal := root.get_node("Portal") as MeshInstance3D
	portal.visible = door.open
	portal.scale = Vector3(1.0, 1.0, 1.0) * (1.0 + sin(time * 4.0) * 0.03)
	(root.get_node("Label") as Label3D).visible = door.open


static func make_cage(cage: BoonCage) -> Node3D:
	var root := Node3D.new()
	root.position = Kit3D.to_3d(cage.global_position, -0.2)
	var gold: Material = Kit3D.toon(Color(1.0, 0.75, 0.3), 0.012)
	var color: Color = BoonCatalog.color(cage.boon)
	Kit3D.cylinder(root, Vector3(0.0, 0.08, 0.0), 0.75, 0.8, 0.16, gold, 24)
	Kit3D.cylinder(root, Vector3(0.0, 2.32, 0.0), 0.2, 0.75, 0.3, gold, 24)
	for i: int in 12:
		var angle: float = TAU * i / 12.0
		Kit3D.cylinder(root, Vector3(cos(angle) * 0.72, 1.2, sin(angle) * 0.72), 0.025, 0.025, 2.2, gold, 6)
	var figure: Node3D = CreatureModels.make(&"siren")
	figure.scale = Vector3.ONE * 1.5
	figure.rotation.y = PI * 0.5
	root.add_child(figure)
	for node: Node in figure.find_children("*", "MeshInstance3D", true, false):
		(node as MeshInstance3D).material_override = Kit3D.toon(color.lerp(Color.WHITE, 0.15), 0.015, 1.2)
	Kit3D.omni(root, Vector3(0.0, 1.5, 0.9), color, 1.5, 3.5)
	Kit3D.sign_text(root, BoonCatalog.text(cage.boon, "name"), Vector3(0.0, 2.85, 0.3), color, 0.006, 96)
	return root
