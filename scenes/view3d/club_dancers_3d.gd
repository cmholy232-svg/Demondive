class_name ClubDancers3D
extends RefCounted
## The Neon Maw's crowd: real animated dancers (art/export/clubber_*) on the
## main floor behind the play plane, rim-lit in club colours. Falls back to
## ClubSet3D's silhouettes when the dancer models aren't built.

const MODELS: Array[StringName] = [&"clubber_a", &"clubber_b", &"clubber_c"]
const MOVES: Array[String] = ["dance", "dance2", "dance3", "dance4", "dance5", "cheer", "clap"]
const MAX_DANCERS: int = 12
const SPACING_M: float = 2.4
const HEIGHT_M: float = 1.45


static func available() -> bool:
	for id: StringName in MODELS:
		if not CharacterModels.has(id):
			return false
	return true


static func build(root: Node3D, data: RoomData, rng: RandomNumberGenerator, rims: Array[Color]) -> void:
	var floor_row: float = ClubSet3D._floor_top(data, 1)
	var last_x: float = -INF
	var placed: int = 0
	var x: int = 2
	while x < data.width - 2 and placed < MAX_DANCERS:
		var top: float = ClubSet3D._floor_top(data, x)
		var px: float = (x + rng.randf()) * RoomData.TILE / Kit3D.PX_PER_M
		var clear: bool = absf(top - floor_row) <= 1.0 and not data.is_solid(x, int(-top * Kit3D.PX_PER_M / RoomData.TILE) - 2)
		if clear and px - last_x >= SPACING_M and rng.randf() < 0.7:
			_dancer(root, Vector3(px, top, rng.randf_range(ClubSet3D.CROWD_Z_MIN, ClubSet3D.CROWD_Z_MAX)), rng, rims)
			last_x = px
			placed += 1
		x += 1


static func _dancer(root: Node3D, at: Vector3, rng: RandomNumberGenerator, rims: Array[Color]) -> void:
	var id: StringName = MODELS[rng.randi_range(0, MODELS.size() - 1)]
	var dancer: Node3D = CharacterModels.make(id, HEIGHT_M * rng.randf_range(0.94, 1.04))
	dancer.position = at
	# Mostly facing the camera, turned a little toward the floor's centre.
	dancer.rotation.y = -PI * 0.5 + rng.randf_range(-0.7, 0.7)
	var rim: Color = rims[rng.randi_range(0, rims.size() - 1)]
	for node: Node in dancer.find_children("*", "MeshInstance3D", true, false):
		var mesh := node as MeshInstance3D
		mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		for surface: int in mesh.mesh.get_surface_count():
			var mat := mesh.get_surface_override_material(surface) as ShaderMaterial
			if mat != null and mat.shader == CharacterModels.TOON_SHADER:
				mat.set_shader_parameter("rim_color", rim)
				mat.set_shader_parameter("rim_strength", 0.7)
	root.add_child(dancer)
	if dancer.has_meta("animator"):
		var player := dancer.get_meta("animator") as AnimationPlayer
		var move: String = MOVES[rng.randi_range(0, MOVES.size() - 1)]
		if player.has_animation(move):
			player.play(move)
			player.speed_scale = rng.randf_range(0.9, 1.1)
			player.seek(rng.randf() * player.current_animation_length, true)
