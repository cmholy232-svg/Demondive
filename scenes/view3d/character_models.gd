class_name CharacterModels
extends RefCounted
## Rigged characters built by tools/characters/build_lady.py (goddesses and
## Demon Lords). Each loads from art/export/<id>/chr_<id>.glb, gets the cel
## shader and ink outline, faces +x with feet at the origin, and plays its
## animations from the gameplay pose.

const TOON_SHADER: Shader = preload("res://art/shaders/toon.gdshader")
const OUTLINE_SHADER: Shader = preload("res://art/shaders/outline.gdshader")
const OUTLINE_M: float = 0.012

## Gameplay pose prefix -> animation name.
const POSE_ANIMATIONS: Dictionary = {
	"idle": "idle", "move": "walk", "windup": "windup", "attack": "attack", "hurt": "hurt",
}

static var _scenes: Dictionary = {}


static func path(id: StringName) -> String:
	return "res://art/export/%s/chr_%s.glb" % [id, id]


static func has(id: StringName) -> bool:
	return ResourceLoader.exists(path(id))


## A root facing +x with a "Body" child holding the model, scaled to height_m.
static func make(id: StringName, height_m: float) -> Node3D:
	if not _scenes.has(id):
		_scenes[id] = load(path(id))
	var root := Node3D.new()
	var body := Node3D.new()
	body.name = "Body"
	root.add_child(body)
	var model: Node3D = (_scenes[id] as PackedScene).instantiate() as Node3D
	model.rotation.y = PI * 0.5
	body.add_child(model)
	fit_height(model, height_m)
	toonify(model)
	var player := model.find_child("AnimationPlayer", true, false) as AnimationPlayer
	if player != null:
		for name: String in player.get_animation_list():
			player.get_animation(name).loop_mode = Animation.LOOP_LINEAR
		player.play("idle")
		player.seek(randf() * 2.0, true)
		root.set_meta("animator", player)
	return root


## Plays the animation for a gameplay pose ("windup_kiss" -> "windup").
static func animate(root: Node3D, pose: String, speed: float = 1.0) -> void:
	if not root.has_meta("animator"):
		return
	var player := root.get_meta("animator") as AnimationPlayer
	var key: String = pose.get_slice("_", 0)
	var anim: String = str(POSE_ANIMATIONS.get(key, "idle"))
	if not player.has_animation(anim):
		anim = "idle"
	if player.current_animation != anim:
		player.play(anim, 0.15)
	player.speed_scale = speed


static func fit_height(model: Node3D, height_m: float) -> void:
	var skeleton := model.find_child("Skeleton3D", true, false) as Skeleton3D
	if skeleton == null:
		return
	var low: float = INF
	var high: float = -INF
	for bone: int in skeleton.get_bone_count():
		var y: float = skeleton.get_bone_global_rest(bone).origin.y
		low = minf(low, y)
		high = maxf(high, y)
	var height: float = (high - low) * 1.1
	if height > 0.0:
		model.scale = Vector3.ONE * (height_m / height)


## Cel shading with an outline for every surface; materials named "glow*" shine instead.
static func toonify(model: Node3D) -> void:
	for node: Node in model.find_children("*", "MeshInstance3D", true, false):
		var instance := node as MeshInstance3D
		for surface: int in instance.mesh.get_surface_count():
			var source := instance.mesh.surface_get_material(surface) as BaseMaterial3D
			var color: Color = source.albedo_color if source != null else Color.WHITE
			if source != null and source.resource_name.begins_with("glow"):
				instance.set_surface_override_material(surface, Kit3D.neon(color, 3.0))
				continue
			var toon := ShaderMaterial.new()
			toon.shader = TOON_SHADER
			toon.set_shader_parameter("albedo", color)
			var outline := ShaderMaterial.new()
			outline.shader = OUTLINE_SHADER
			outline.set_shader_parameter("width", OUTLINE_M / maxf(0.01, model.scale.x))
			toon.next_pass = outline
			instance.set_surface_override_material(surface, toon)
