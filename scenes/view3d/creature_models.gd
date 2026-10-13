class_name CreatureModels
extends RefCounted
## Cel-shaded creature models built from primitives, facing +x with feet at
## the origin. Each returns a root with a "Body" node to squash and lunge, and
## "Tell" nodes (glowing eyes) that flare during wind-ups.

const OUTLINE: float = 0.02


static func make(kind: StringName) -> Node3D:
	var root := Node3D.new()
	var body := Node3D.new()
	body.name = "Body"
	root.add_child(body)
	match kind:
		&"imp":
			_imp(body)
		&"floater":
			_floater(body)
		&"succubus":
			_succubus(body, Color(0.55, 0.25, 0.6), Color(1.0, 0.35, 0.7), 0.96)
		&"siren":
			_succubus(body, Color(0.85, 0.35, 0.55), Color(1.0, 0.75, 0.35), 1.05)
		&"hellhound":
			_hound(body)
		&"crawler":
			_crawler(body)
		&"bartender":
			_bartender(body)
		&"belladonna":
			_belladonna(body)
		_:
			Kit3D.capsule(body, Vector3(0.0, 0.5, 0.0), 0.25, 1.0, Kit3D.toon(Color.RED, OUTLINE))
	return root


static func _eye(parent: Node3D, at: Vector3, radius: float, color: Color) -> void:
	var eye: MeshInstance3D = Kit3D.sphere(parent, at, radius, Kit3D.neon(color, 3.0))
	eye.name = "Tell"
	eye.add_to_group(&"tell")


static func _horn(parent: Node3D, base: Vector3, length: float, tilt_z: float, color: Color) -> void:
	Kit3D.cone(parent, base, length * 0.22, length, Kit3D.toon(color, OUTLINE * 0.6), Vector3(0.0, 0.0, tilt_z))


static func _imp(body: Node3D) -> void:
	var skin: Material = Kit3D.toon(Color(0.85, 0.18, 0.16), OUTLINE)
	var dark: Material = Kit3D.toon(Color(0.35, 0.06, 0.08), OUTLINE)
	Kit3D.capsule(body, Vector3(0.0, 0.36, 0.0), 0.2, 0.52, skin)
	Kit3D.sphere(body, Vector3(0.06, 0.74, 0.0), 0.2, skin)
	_horn(body, Vector3(0.0, 0.88, 0.1), 0.2, 0.5, Color(0.95, 0.85, 0.7))
	_horn(body, Vector3(0.0, 0.88, -0.1), 0.2, 0.5, Color(0.95, 0.85, 0.7))
	_eye(body, Vector3(0.22, 0.78, 0.08), 0.045, Color(1.0, 0.9, 0.2))
	_eye(body, Vector3(0.22, 0.78, -0.08), 0.045, Color(1.0, 0.9, 0.2))
	for z: float in [0.1, -0.1]:
		Kit3D.capsule(body, Vector3(0.0, 0.1, z), 0.07, 0.24, dark)
		Kit3D.capsule(body, Vector3(0.14, 0.42, z * 2.2), 0.05, 0.3, skin)
	var tail: MeshInstance3D = Kit3D.cylinder(body, Vector3(-0.22, 0.32, 0.0), 0.02, 0.05, 0.45, dark, 8)
	tail.rotation.z = 1.0
	Kit3D.cone(body, Vector3(-0.42, 0.45, 0.0), 0.06, 0.12, dark, Vector3(0.0, 0.0, 1.0))


static func _floater(body: Node3D) -> void:
	var shell: Material = Kit3D.toon(Color(0.45, 0.2, 0.7), OUTLINE)
	Kit3D.sphere(body, Vector3(0.0, 0.45, 0.0), 0.38, shell)
	Kit3D.sphere(body, Vector3(0.24, 0.48, 0.0), 0.22, Kit3D.toon(Color(0.95, 0.92, 0.88), OUTLINE * 0.5))
	_eye(body, Vector3(0.42, 0.48, 0.0), 0.09, Color(0.75, 0.4, 1.0))
	Kit3D.sphere(body, Vector3(0.49, 0.48, 0.0), 0.045, Kit3D.material(Color.BLACK, 0.3))
	for i: int in 5:
		var angle: float = TAU * i / 5.0
		Kit3D.cone(body, Vector3(cos(angle) * 0.18, 0.15, sin(angle) * 0.18), 0.06, 0.32, shell, Vector3(PI, 0.0, cos(angle) * 0.3))
	for z: float in [0.36, -0.36]:
		var wing: MeshInstance3D = Kit3D.box(body, Vector3(-0.05, 0.62, z), Vector3(0.38, 0.04, 0.3), Kit3D.toon(Color(0.25, 0.08, 0.35), OUTLINE * 0.5))
		wing.rotation.x = 0.5 * signf(z)


static func _succubus(body: Node3D, skin_color: Color, eye_color: Color, height: float) -> void:
	var skin: Material = Kit3D.toon(skin_color, OUTLINE)
	var dress: Material = Kit3D.toon(Color(0.12, 0.05, 0.14), OUTLINE)
	var hair: Material = Kit3D.toon(eye_color.darkened(0.25), OUTLINE)
	var s: float = height
	Kit3D.cylinder(body, Vector3(0.0, 0.3 * s, 0.0), 0.12 * s, 0.26 * s, 0.6 * s, dress, 14)
	Kit3D.capsule(body, Vector3(0.0, 0.72 * s, 0.0), 0.13 * s, 0.36 * s, dress)
	Kit3D.sphere(body, Vector3(0.0, 0.62 * s, 0.0), 0.15 * s, dress, 0.7)
	Kit3D.sphere(body, Vector3(0.03, 0.98 * s, 0.0), 0.12 * s, skin)
	Kit3D.sphere(body, Vector3(-0.04, 1.0 * s, 0.0), 0.14 * s, hair, 1.1)
	Kit3D.capsule(body, Vector3(-0.1, 0.72 * s, 0.0), 0.07 * s, 0.6 * s, hair)
	_horn(body, Vector3(0.0, 1.08 * s, 0.07), 0.15 * s, 0.6, Color(0.15, 0.08, 0.18))
	_horn(body, Vector3(0.0, 1.08 * s, -0.07), 0.15 * s, 0.6, Color(0.15, 0.08, 0.18))
	_eye(body, Vector3(0.14 * s, 0.99 * s, 0.05), 0.022, eye_color)
	_eye(body, Vector3(0.14 * s, 0.99 * s, -0.05), 0.022, eye_color)
	for z: float in [0.17, -0.17]:
		Kit3D.capsule(body, Vector3(0.05, 0.72 * s, z * s), 0.045 * s, 0.42 * s, skin)
		var wing: MeshInstance3D = Kit3D.box(body, Vector3(-0.2, 0.86 * s, z * 1.6 * s), Vector3(0.36 * s, 0.32 * s, 0.03), Kit3D.toon(Color(0.2, 0.05, 0.22), OUTLINE * 0.5))
		wing.rotation = Vector3(0.0, 0.5 * signf(z), 0.4)


static func _hound(body: Node3D) -> void:
	var fur: Material = Kit3D.toon(Color(0.22, 0.08, 0.08), OUTLINE)
	var bone: Material = Kit3D.toon(Color(0.9, 0.8, 0.65), OUTLINE * 0.6)
	var torso: MeshInstance3D = Kit3D.capsule(body, Vector3(-0.05, 0.48, 0.0), 0.2, 0.85, fur)
	torso.rotation.z = PI * 0.5
	Kit3D.sphere(body, Vector3(0.42, 0.6, 0.0), 0.17, fur)
	Kit3D.box(body, Vector3(0.58, 0.55, 0.0), Vector3(0.2, 0.12, 0.14), fur)
	Kit3D.box(body, Vector3(0.62, 0.48, 0.0), Vector3(0.16, 0.04, 0.12), bone)
	_eye(body, Vector3(0.52, 0.66, 0.08), 0.035, Color(1.0, 0.5, 0.1))
	_eye(body, Vector3(0.52, 0.66, -0.08), 0.035, Color(1.0, 0.5, 0.1))
	for x: float in [0.28, -0.32]:
		for z: float in [0.12, -0.12]:
			Kit3D.capsule(body, Vector3(x, 0.2, z), 0.06, 0.4, fur)
	var flame: Material = Kit3D.neon(Color(1.0, 0.45, 0.1), 3.0)
	for i: int in 5:
		Kit3D.cone(body, Vector3(0.25 - i * 0.12, 0.66, 0.0), 0.07, 0.22 + (i % 2) * 0.08, flame, Vector3(0.0, 0.0, 0.4))


static func _crawler(body: Node3D) -> void:
	var shell: Material = Kit3D.toon(Color(0.25, 0.12, 0.3), OUTLINE)
	var belly: Material = Kit3D.toon(Color(0.5, 0.2, 0.25), OUTLINE)
	Kit3D.sphere(body, Vector3(0.0, 0.42, 0.0), 0.6, shell, 0.62)
	Kit3D.sphere(body, Vector3(0.0, 0.3, 0.0), 0.5, belly, 0.4)
	Kit3D.sphere(body, Vector3(0.55, 0.36, 0.0), 0.2, shell)
	_eye(body, Vector3(0.7, 0.42, 0.09), 0.04, Color(0.3, 1.0, 0.5))
	_eye(body, Vector3(0.7, 0.42, -0.09), 0.04, Color(0.3, 1.0, 0.5))
	for z: float in [0.1, -0.1]:
		Kit3D.cone(body, Vector3(0.72, 0.3, z), 0.04, 0.22, Kit3D.toon(Color(0.9, 0.85, 0.7), OUTLINE * 0.5), Vector3(0.0, 0.0, -1.3))
	for i: int in 4:
		Kit3D.cone(body, Vector3(-0.3 + i * 0.2, 0.72, 0.0), 0.08, 0.26, Kit3D.toon(Color(0.9, 0.3, 0.5), OUTLINE * 0.5))
	for i: int in 3:
		for z: float in [0.42, -0.42]:
			var leg: MeshInstance3D = Kit3D.capsule(body, Vector3(-0.3 + i * 0.3, 0.16, z), 0.05, 0.4, shell)
			leg.rotation.x = 0.7 * signf(z)


static func _bartender(body: Node3D) -> void:
	var skin: Material = Kit3D.toon(Color(0.6, 0.22, 0.2), OUTLINE)
	var shirt: Material = Kit3D.toon(Color(0.95, 0.93, 0.9), OUTLINE)
	var apron: Material = Kit3D.toon(Color(0.07, 0.05, 0.08), OUTLINE)
	var gold: Material = Kit3D.toon(Color(1.0, 0.78, 0.35), OUTLINE * 0.6)
	Kit3D.cylinder(body, Vector3(0.0, 0.42, 0.0), 0.36, 0.3, 0.84, apron)
	Kit3D.capsule(body, Vector3(0.0, 1.15, 0.0), 0.42, 1.0, shirt)
	Kit3D.box(body, Vector3(0.36, 1.1, 0.0), Vector3(0.1, 0.7, 0.5), apron)
	Kit3D.sphere(body, Vector3(0.05, 1.78, 0.0), 0.26, skin)
	Kit3D.box(body, Vector3(0.3, 1.55, 0.0), Vector3(0.06, 0.08, 0.26), Kit3D.toon(Color(0.7, 0.1, 0.2), OUTLINE * 0.5))
	Kit3D.box(body, Vector3(0.3, 1.7, 0.0), Vector3(0.05, 0.05, 0.3), Kit3D.toon(Color(0.1, 0.06, 0.06), OUTLINE * 0.5))
	_horn(body, Vector3(0.0, 1.98, 0.14), 0.32, 0.7, Color(0.95, 0.88, 0.72))
	_horn(body, Vector3(0.0, 1.98, -0.14), 0.32, 0.7, Color(0.95, 0.88, 0.72))
	_eye(body, Vector3(0.28, 1.84, 0.1), 0.04, Color(0.4, 1.0, 0.9))
	_eye(body, Vector3(0.28, 1.84, -0.1), 0.04, Color(0.4, 1.0, 0.9))
	for z: float in [0.48, -0.48]:
		Kit3D.capsule(body, Vector3(0.1, 1.2, z), 0.13, 0.75, shirt)
		Kit3D.sphere(body, Vector3(0.24, 0.86, z), 0.12, skin)
	var bottle: MeshInstance3D = Kit3D.cylinder(body, Vector3(0.38, 1.05, 0.55), 0.06, 0.13, 0.6, Kit3D.material(Color(0.1, 0.4, 0.35), 0.1, Color(0.35, 0.95, 0.85), 1.6), 12)
	bottle.rotation.z = -0.4
	Kit3D.box(body, Vector3(0.0, 0.84, 0.0), Vector3(0.75, 0.06, 0.74), gold)


static func _belladonna(body: Node3D) -> void:
	var skin: Material = Kit3D.toon(Color(0.95, 0.55, 0.62), OUTLINE)
	var gown: Material = Kit3D.toon(Color(0.75, 0.05, 0.3), OUTLINE)
	var gown_dark: Material = Kit3D.toon(Color(0.35, 0.02, 0.15), OUTLINE)
	var gold: Material = Kit3D.toon(Color(1.0, 0.78, 0.35), OUTLINE * 0.6)
	var hair: Material = Kit3D.toon(Color(0.22, 0.03, 0.1), OUTLINE)
	# Tiered skirt: each tier flares like an open mouth.
	for i: int in 4:
		var y: float = 0.22 + i * 0.27
		var r: float = 0.62 - i * 0.12
		Kit3D.cylinder(body, Vector3(0.0, y, 0.0), r * 0.7, r, 0.3, gown if i % 2 == 0 else gown_dark, 20)
		Kit3D.cylinder(body, Vector3(0.0, y - 0.15, 0.0), r * 1.01, r * 1.01, 0.03, gold, 20)
	Kit3D.capsule(body, Vector3(0.0, 1.45, 0.0), 0.2, 0.62, skin)
	Kit3D.sphere(body, Vector3(0.0, 1.38, 0.0), 0.24, gown, 0.75)
	Kit3D.sphere(body, Vector3(0.1, 1.55, 0.09), 0.13, gown)
	Kit3D.sphere(body, Vector3(0.1, 1.55, -0.09), 0.13, gown)
	Kit3D.cylinder(body, Vector3(0.0, 1.8, 0.0), 0.07, 0.08, 0.16, skin, 10)
	Kit3D.sphere(body, Vector3(0.03, 2.0, 0.0), 0.17, skin)
	Kit3D.sphere(body, Vector3(-0.05, 2.04, 0.0), 0.2, hair, 1.1)
	Kit3D.capsule(body, Vector3(-0.18, 1.6, 0.0), 0.12, 0.9, hair)
	_horn(body, Vector3(0.0, 2.16, 0.1), 0.42, 0.9, Color(0.12, 0.05, 0.1))
	_horn(body, Vector3(0.0, 2.16, -0.1), 0.42, 0.9, Color(0.12, 0.05, 0.1))
	Kit3D.cylinder(body, Vector3(0.0, 2.2, 0.0), 0.13, 0.15, 0.08, gold, 12)
	_eye(body, Vector3(0.18, 2.02, 0.06), 0.03, Color(1.0, 0.3, 0.6))
	_eye(body, Vector3(0.18, 2.02, -0.06), 0.03, Color(1.0, 0.3, 0.6))
	Kit3D.box(body, Vector3(0.19, 1.93, 0.0), Vector3(0.02, 0.025, 0.08), Kit3D.neon(Color(1.0, 0.1, 0.35), 2.0))
	for z: float in [0.27, -0.27]:
		Kit3D.capsule(body, Vector3(0.05, 1.42, z), 0.06, 0.62, skin)
		Kit3D.cylinder(body, Vector3(0.05, 1.22, z), 0.07, 0.07, 0.05, gold, 10)
	for z: float in [0.5, -0.5]:
		var wing: MeshInstance3D = Kit3D.box(body, Vector3(-0.3, 1.6, z), Vector3(0.7, 0.8, 0.03), Kit3D.toon(Color(0.3, 0.02, 0.15), OUTLINE * 0.5))
		wing.rotation = Vector3(0.0, 0.5 * signf(z), 0.5)
