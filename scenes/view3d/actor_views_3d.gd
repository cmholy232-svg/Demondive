class_name ActorViews3D
extends Node3D
## Keeps a 3D model on every enemy, boss, cage and exit door in the room,
## and animates it from the gameplay state: idle bob, walk bounce, a squash
## and flaring eyes on every wind-up, a lunge on the attack, white on hits.

const FLASH_SHADER: String = "shader_type spatial; render_mode unshaded, blend_add; void fragment() { ALBEDO = vec3(1.0); ALPHA = 0.85; }"
const BOSS_PRESENCE: float = 1.3

var _room: Room
var _enemies: Dictionary = {}
var _doors: Dictionary = {}
var _cages: Dictionary = {}
var _flash: ShaderMaterial
var _time: float = 0.0


func _ready() -> void:
	var shader := Shader.new()
	shader.code = FLASH_SHADER
	_flash = ShaderMaterial.new()
	_flash.shader = shader


func bind_room(room: Room) -> void:
	_room = room
	for view: Variant in _enemies.values():
		(view as Node3D).queue_free()
	for view: Variant in _doors.values():
		(view as Node3D).queue_free()
	for view: Variant in _cages.values():
		(view as Node3D).queue_free()
	_enemies.clear()
	_doors.clear()
	_cages.clear()


func _process(delta: float) -> void:
	_time += delta
	if _room == null or not is_instance_valid(_room):
		return
	_sync_enemies(delta)
	_sync_doors()
	_sync_cages()


func _sync_enemies(delta: float) -> void:
	var alive: Dictionary = {}
	for node: Node in get_tree().get_nodes_in_group(Enemy.GROUP):
		var enemy := node as Enemy
		if enemy == null or enemy.dead:
			continue
		alive[enemy] = true
		if not _enemies.has(enemy):
			var model: Node3D
			if CharacterModels.has(enemy.kind):
				# Drawn a little taller than the hitbox so bosses tower over Milo.
				var tall: float = enemy.size.y / Kit3D.PX_PER_M * BOSS_PRESENCE
				model = CharacterModels.make(enemy.kind, tall)
				# Bosses get their own key light so they read against busy rooms.
				Kit3D.omni(model, Vector3(0.9, tall * 0.75, 2.2), Color(1.0, 0.88, 0.92), 2.4, 6.0)
			else:
				model = CreatureModels.make(enemy.kind)
			add_child(model)
			_enemies[enemy] = model
		_pose(_enemies[enemy] as Node3D, enemy, delta)
	for enemy: Variant in _enemies.keys():
		if not alive.has(enemy):
			(_enemies[enemy] as Node3D).queue_free()
			_enemies.erase(enemy)


func _pose(model: Node3D, enemy: Enemy, delta: float) -> void:
	model.position = Kit3D.to_3d(enemy.global_position)
	var target_yaw: float = 0.0 if enemy.facing > 0 else PI
	model.rotation.y = lerp_angle(model.rotation.y, target_yaw, clampf(14.0 * delta, 0.0, 1.0))
	var body := model.get_node("Body") as Node3D
	var pose: String = String(enemy.attack_pose)
	if model.has_meta("animator"):
		var moving: bool = absf(enemy.velocity.x) > 30.0 and not pose.begins_with("windup") and not pose.begins_with("attack")
		CharacterModels.animate(model, "move" if moving and (pose == "idle" or pose == "move") else pose)
	var squash := Vector3.ONE
	var lean: float = 0.0
	var lift: float = 0.0
	var tell: float = 1.0
	var phase: float = _time * 6.0 + float(enemy.get_instance_id() % 100)
	if enemy.spawn_timer > 0.0:
		var grow: float = 1.0 - enemy.spawn_timer / Enemy.SPAWN_SECONDS
		squash = Vector3.ONE * maxf(0.05, grow)
	elif pose.begins_with("windup"):
		var shake: float = sin(_time * 60.0) * 0.015
		squash = Vector3(1.12, 0.84, 1.12)
		lean = -0.25
		lift = shake
		tell = 4.0
	elif pose.begins_with("attack"):
		squash = Vector3(1.15, 0.95, 0.95)
		lean = 0.3
		tell = 2.5
	elif pose == "hurt":
		lean = -0.2
	elif pose == "move" or absf(enemy.velocity.x) > 30.0:
		lift = absf(sin(phase * 1.6)) * 0.06
		lean = 0.08
	else:
		squash = Vector3(1.0, 1.0 + sin(phase * 0.5) * 0.025, 1.0)
	if enemy.flies:
		lift += sin(phase * 0.6) * 0.08
	body.scale = body.scale.lerp(squash, clampf(18.0 * delta, 0.0, 1.0))
	body.rotation.z = lerpf(body.rotation.z, -lean, clampf(12.0 * delta, 0.0, 1.0))
	body.position.y = lift
	if not model.has_meta("meshes"):
		model.set_meta("meshes", body.find_children("*", "MeshInstance3D", true, false))
	for node: Node in model.get_meta("meshes") as Array:
		var mesh := node as MeshInstance3D
		if mesh == null:
			continue
		mesh.material_overlay = _flash if enemy.is_flashing() else null
		if mesh.is_in_group(&"tell"):
			mesh.scale = Vector3.ONE * lerpf(mesh.scale.x, tell, clampf(10.0 * delta, 0.0, 1.0))


func _sync_doors() -> void:
	for door: ExitDoor in _room.exits:
		if not _doors.has(door):
			_doors[door] = DoorModel3D.make(door)
			add_child(_doors[door] as Node3D)
		DoorModel3D.update(_doors[door] as Node3D, door, _time)


func _sync_cages() -> void:
	for node: Node in get_tree().get_nodes_in_group(&"cages"):
		var cage := node as BoonCage
		if cage == null:
			continue
		if not _cages.has(cage):
			var model: Node3D = DoorModel3D.make_cage(cage)
			add_child(model)
			_cages[cage] = model
		var view := _cages[cage] as Node3D
		view.visible = not cage.broken
		for child: Node in view.get_children():
			var mesh := child as MeshInstance3D
			if mesh != null:
				mesh.material_overlay = _flash if cage.flash_timer > 0.0 else null
