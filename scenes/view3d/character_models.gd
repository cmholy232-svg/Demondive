class_name CharacterModels
extends RefCounted
## Rigged characters built by tools/characters/build_lady.py (goddesses and
## Demon Lords). Each loads from art/export/<id>/chr_<id>.glb, gets the cel
## shader and ink outline, faces +x with feet at the origin, and plays its
## animations from the gameplay pose.

const TOON_SHADER: Shader = preload("res://art/shaders/toon.gdshader")
const OUTLINE_SHADER: Shader = preload("res://art/shaders/outline.gdshader")
const OUTLINE_M: float = 0.012

## Gameplay pose prefix -> animation names to try, in order.
const POSE_ANIMATIONS: Dictionary = {
	"idle": ["idle", "Idle", "Flying_Idle"], "move": ["walk", "run", "Walk", "Fast_Flying", "Flying_Idle"],
	"windup": ["windup", "cast_up", "Duck", "Yes", "idle", "Idle", "Flying_Idle"],
	"attack": ["attack", "cast_forward", "dash", "Punch", "Bite_Front", "Headbutt"],
	"hurt": ["hurt", "fall", "HitReact", "HitRecieve", "idle", "Idle", "Flying_Idle"],
}
## Material recolours by material name ("*" for every material).
const TINTS: Dictionary = {
	"better": {"jacket": "#f4efe6", "jacket_patch": "#ffd76a", "tank": "#ffffff", "jeans": "#e6dccb", "shoe": "#ffd76a", "hair": "#f2e2b0"},
	"hollow": {"*": "#16141f", "eye_white": "#9a8aff", "iris": "#ffffff"},
}

static var _scenes: Dictionary = {}


static func path(id: StringName) -> String:
	return "res://art/export/%s/chr_%s.glb" % [id, id]


static func has(id: StringName) -> bool:
	return ResourceLoader.exists(path(id))


## A root facing +x with a "Body" child holding the model, scaled to height_m.
static func make(id: StringName, height_m: float, tint: Dictionary = {}) -> Node3D:
	if not _scenes.has(id):
		_scenes[id] = load(path(id))
	var root := Node3D.new()
	var body := Node3D.new()
	body.name = "Body"
	root.add_child(body)
	var model: Node3D = (_scenes[id] as PackedScene).instantiate() as Node3D
	# Exported models face -z; turn them to face +x.
	model.rotation.y = -PI * 0.5
	body.add_child(model)
	fit_height(model, height_m)
	toonify(model, tint)
	var player := model.find_child("AnimationPlayer", true, false) as AnimationPlayer
	if player != null:
		for name: String in player.get_animation_list():
			player.get_animation(name).loop_mode = Animation.LOOP_LINEAR
		if player.has_animation("idle"):
			player.play("idle")
			player.seek(randf() * 2.0, true)
		root.set_meta("animator", player)
	return root


## A boon-giver standing for the camera: her own model, turned three-quarters
## toward the viewer, or a tinted stand-in while her model isn't built.
static func figure(id: StringName, height_m: float, color: Color, turn: float = 0.0) -> Node3D:
	if has(id):
		var root: Node3D = make(id, height_m)
		root.rotation.y = -PI * 0.5 + turn
		return root
	var stand_in: Node3D = CreatureModels.make(&"siren")
	stand_in.scale = Vector3.ONE * height_m / 1.2
	stand_in.rotation.y = PI * 0.5 + turn
	for node: Node in stand_in.find_children("*", "MeshInstance3D", true, false):
		(node as MeshInstance3D).material_override = Kit3D.toon(color.lerp(Color.WHITE, 0.15), 0.015, 1.2)
	return stand_in


## Plays the animation for a gameplay pose ("windup_kiss" -> "windup").
static func animate(root: Node3D, pose: String, speed: float = 1.0) -> void:
	if not root.has_meta("animator"):
		return
	var player := root.get_meta("animator") as AnimationPlayer
	var key: String = pose.get_slice("_", 0)
	var anim: String = "idle"
	for name: Variant in POSE_ANIMATIONS.get(key, ["idle"]) as Array:
		if player.has_animation(str(name)):
			anim = str(name)
			break
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


## Cel shading with an outline for every surface; materials named "glow*" shine
## instead. Textured parts keep their texture; faces and eyes get no outline.
## Returns [mesh, surface, colour, material name] for each recolourable surface.
static func toonify(model: Node3D, tint: Dictionary = {}) -> Array:
	var targets: Array = []
	for node: Node in model.find_children("*", "MeshInstance3D", true, false):
		var instance := node as MeshInstance3D
		for surface: int in instance.mesh.get_surface_count():
			var source := instance.mesh.surface_get_material(surface) as BaseMaterial3D
			var color: Color = source.albedo_color if source != null else Color.WHITE
			var mat_name: String = source.resource_name if source != null else ""
			if tint.has(mat_name):
				color = Color.html(str(tint[mat_name]))
			elif tint.has("*") and not mat_name.begins_with("glow"):
				color = Color.html(str(tint["*"]))
			if mat_name.begins_with("glow"):
				var glow_color: Color = color
				if source != null and source.emission_enabled:
					glow_color = source.emission
				instance.set_surface_override_material(surface, Kit3D.neon(glow_color, 2.5))
				continue
			var toon := ShaderMaterial.new()
			toon.shader = TOON_SHADER
			toon.set_shader_parameter("albedo", color)
			var texture: Texture2D = source.albedo_texture if source != null else null
			if texture != null:
				toon.set_shader_parameter("albedo_texture", texture)
				toon.set_shader_parameter("use_texture", true)
				if source.transparency != BaseMaterial3D.TRANSPARENCY_DISABLED:
					toon.set_shader_parameter("alpha_cut", 0.5)
			var lower: String = mat_name.to_lower()
			var detail: bool = lower.begins_with("eye") or lower.begins_with("face")
			if detail:
				toon.set_shader_parameter("rim_strength", 0.0)
				toon.set_shader_parameter("shade_amount", 0.2)
			elif lower.contains("_face_"):
				toon.set_shader_parameter("shade_amount", 0.25)
			if not detail:
				var outline := ShaderMaterial.new()
				outline.shader = OUTLINE_SHADER
				outline.set_shader_parameter("width", OUTLINE_M / maxf(0.01, model.scale.x))
				toon.next_pass = outline
			instance.set_surface_override_material(surface, toon)
			targets.append([instance, surface, color, mat_name])
	return targets
