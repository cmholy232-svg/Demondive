class_name MiloView3D
extends Node3D
## Shows a stand-in 3D character on Milo's 2D position and picks its
## animation from Milo's state. Reads Milo; never changes him.

const MODEL_PATH: String = "res://art/export/milo/chr_milo.glb"
const CAST_ANIMATIONS: Array[String] = ["cast_down", "cast_down_forward", "cast_forward", "cast_up_forward", "cast_up"]
const TARGET_HEIGHT_M: float = 1.28
## Ground speed (px/s) at which the run clip's feet match the floor.
const RUN_ANIMATION_SPEED: float = 520.0
const TURN_SPEED: float = 18.0
const CAST_POSE_SECONDS: float = 0.4

var milo: Milo
var _model: Node3D
var _animation: AnimationPlayer
var _cast_arm: CastArmModifier
var _caster: ArcaneCaster
var _yaw: float = -PI * 0.5
var _cast_timer: float = 0.0
var _trail: CPUParticles3D
var _burst: CPUParticles3D


## [mesh, surface, original colour, material name] for every toon surface.
var toon_targets: Array = []


func bind(target: Milo) -> void:
	milo = target
	_model = (load(MODEL_PATH) as PackedScene).instantiate() as Node3D
	add_child(_model)
	_fit_height(_model)
	_apply_toon(_model)
	_animation = _model.find_child("AnimationPlayer", true, false) as AnimationPlayer
	for name: String in ["run", "idle", "fall", "jump", "dash"]:
		if _animation != null and _animation.has_animation(name):
			_animation.get_animation(name).loop_mode = Animation.LOOP_LINEAR
	_build_cast_layer()
	# A warm hero light rides with Milo so he always reads against the club.
	Kit3D.omni(self, Vector3(0.6, 1.4, 1.6), Color(1.0, 0.85, 0.7), 1.6, 4.0)
	_trail = _make_particles(Color(0.5, 0.95, 1.0), 40, 0.25, false)
	_burst = _make_particles(Color(1.0, 0.7, 0.4), 24, 0.35, true)
	_caster = milo.get_node("ArcaneCaster") as ArcaneCaster
	_caster.cast.connect(func(_direction: Vector2) -> void:
		_cast_timer = CAST_POSE_SECONDS
		if _cast_arm != null:
			_cast_arm.kick())
	milo.wavelanded.connect(func(_is_wavedash: bool) -> void: _burst.restart())
	milo.landed.connect(func(speed: float) -> void:
		if speed > 600.0:
			_burst.restart())


## Scales the model so its skeleton spans TARGET_HEIGHT_M. Skinned mesh bounds
## don't include bone poses, so the bones are the reliable measure.
func _fit_height(model: Node3D) -> void:
	var skeleton := model.find_child("Skeleton3D", true, false) as Skeleton3D
	if skeleton == null:
		return
	var low: float = INF
	var high: float = -INF
	for bone: int in skeleton.get_bone_count():
		var y: float = (skeleton.global_transform * skeleton.get_bone_global_pose(bone)).origin.y
		low = minf(low, y)
		high = maxf(high, y)
	# The head extends past the top bone; 1.1 covers it.
	var height: float = (high - low) * 1.1
	if height > 0.0:
		model.scale = Vector3.ONE * (TARGET_HEIGHT_M / height)


## Cel shading and ink outline from CharacterModels, then the equipped outfit.
func _apply_toon(model: Node3D) -> void:
	toon_targets = CharacterModels.toonify(model)
	apply_outfit(Cosmetics.equipped())


## Recolours Milo's clothes for an outfit; materials it doesn't name keep their texture colours.
func apply_outfit(id: StringName) -> void:
	var colors: Dictionary = Cosmetics.colors(id)
	for target: Array in toon_targets:
		var instance := target[0] as MeshInstance3D
		var toon := instance.get_surface_override_material(int(target[1])) as ShaderMaterial
		if toon == null:
			continue
		var name: String = str(target[3])
		toon.set_shader_parameter("luma_tint", colors.has(name))
		toon.set_shader_parameter("albedo", colors.get(name, target[2]))


## A skeleton modifier that only drives the right arm, so Milo can cast while running.
func _build_cast_layer() -> void:
	if _animation == null:
		return
	var skeleton := _model.find_child("Skeleton3D", true, false) as Skeleton3D
	if skeleton == null:
		return
	_cast_arm = CastArmModifier.new()
	skeleton.add_child(_cast_arm)
	_cast_arm.load_poses(_animation, CAST_ANIMATIONS, skeleton)


func _make_particles(color: Color, amount: int, lifetime: float, one_shot: bool) -> CPUParticles3D:
	var particles := CPUParticles3D.new()
	particles.amount = amount
	particles.lifetime = lifetime
	particles.one_shot = one_shot
	particles.emitting = false
	particles.explosiveness = 0.9 if one_shot else 0.0
	particles.direction = Vector3.UP
	particles.spread = 80.0
	particles.initial_velocity_min = 1.0
	particles.initial_velocity_max = 3.0
	particles.gravity = Vector3(0.0, -4.0, 0.0)
	particles.scale_amount_min = 0.04
	particles.scale_amount_max = 0.09
	var mesh := SphereMesh.new()
	mesh.radius = 0.5
	mesh.height = 1.0
	mesh.material = Kit3D.material(Color.BLACK, 0.5, color, 6.0)
	particles.mesh = mesh
	particles.local_coords = false
	add_child(particles)
	return particles


func _process(delta: float) -> void:
	if milo == null:
		return
	position = RoomView3D.to_3d(milo.global_position)
	_cast_timer = maxf(0.0, _cast_timer - delta)
	# The model faces -z, so -90° turns it toward +x.
	var target_yaw: float = -PI * 0.5 if milo.facing > 0 else PI * 0.5
	_yaw = lerp_angle(_yaw, target_yaw, clampf(TURN_SPEED * delta, 0.0, 1.0))
	_model.rotation.y = _yaw
	_trail.emitting = milo.is_dashing() or milo.is_wave_sliding()
	_trail.position = Vector3(0.0, 0.6, 0.0)
	_burst.position = Vector3.ZERO
	_play(_pick_animation())
	_update_cast_layer()
	# Lean into dashes so they read as a burst, not a slide.
	var lean: float = 0.0
	if milo.is_dashing():
		lean = -milo.dash_direction.x * 0.35
	_model.rotation.z = lerpf(_model.rotation.z, lean, clampf(12.0 * delta, 0.0, 1.0))
	visible = Engine.get_process_frames() % 6 >= 2 or not milo.is_invulnerable()


func _pick_animation() -> String:
	if milo.is_dashing():
		return "dash"
	if not milo.is_on_floor():
		return "jump" if milo.velocity.y < -150.0 else "fall"
	return "run" if absf(milo.velocity.x) > 40.0 else "idle"


func _update_cast_layer() -> void:
	if _cast_arm == null:
		return
	var aim: Vector2 = _caster.aim
	var index: int = clampi(roundi(-aim.y * 2.0 / maxf(0.001, aim.length())) + 2, 0, 4)
	if absf(aim.x) > 0.3 and absf(aim.y) > 0.3:
		index = 3 if aim.y < 0.0 else 1
	_cast_arm.aim(index, _cast_timer > 0.0)


func _play(name: String) -> void:
	if _animation == null or not _animation.has_animation(name):
		return
	if _animation.current_animation != name:
		_animation.play(name, 0.12)
	if name == "run":
		_animation.speed_scale = clampf(absf(milo.velocity.x) / RUN_ANIMATION_SPEED, 0.6, 1.8)
	else:
		_animation.speed_scale = 1.0
