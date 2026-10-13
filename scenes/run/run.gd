class_name Run
extends Node2D
## One dive: loads the level's rooms in order, moves Milo between them,
## pays out door rewards, plays story beats, and ends in death or victory.

signal finished(won: bool)

const MILO_SCENE: PackedScene = preload("res://scenes/player/milo.tscn")
const ROOM_FADE: float = 0.25

var plan: LevelPlan
var room: Room
var milo: Milo
var camera: GameCamera
var view: RoomView3D
var hud: Hud
var dialogue: DialogueBox
var boon_choice: BoonChoice
var results: RunResults
var specials: Specials
var fade: ScreenFade
var pending_reward: StringName = &""
var _index: int = -1
var _ending: bool = false


func _ready() -> void:
	if not Game.in_run:
		Game.start_run()
	camera = GameCamera.new()
	camera.follow_mode = true
	add_child(camera)
	milo = MILO_SCENE.instantiate() as Milo
	add_child(milo)
	(milo.get_node("Feedback") as CanvasItem).visible = false
	camera.target = milo
	specials = Specials.new()
	specials.milo = milo
	add_child(specials)
	view = RoomView3D.new()
	add_child(view)
	view.setup(camera, milo)
	hud = Hud.new()
	add_child(hud)
	dialogue = DialogueBox.new()
	add_child(dialogue)
	boon_choice = BoonChoice.new()
	add_child(boon_choice)
	results = RunResults.new()
	add_child(results)
	fade = ScreenFade.new()
	add_child(fade)
	Game.milo_died.connect(_on_milo_died)
	plan = LevelPlan.make(Game.level, Game.rng)
	_enter_room(0)


func _physics_process(_delta: float) -> void:
	if room == null or not room.is_inside_tree():
		return
	hud.set_enemies_left(room.enemies_left() if not room.is_clear else 0)
	var near_door: bool = false
	for door: ExitDoor in room.exits:
		if door.open and door.milo_near:
			near_door = true
			hud.set_prompt(Strings.text("prompt.door") % RunRewards.label(door.reward))
	if not near_door:
		hud.set_prompt("")
	if milo.global_position.y > room.data.size_px().y + 400.0:
		_rescue_fall()


func _enter_room(index: int) -> void:
	_index = index
	if room != null:
		room.queue_free()
		await room.tree_exited
	_clear_leftovers()
	camera.focus = null
	var data: RoomData = plan.rooms[index]
	_assign_cage(data)
	room = Room.new()
	room.setup(data, plan.door_rewards(index, data.exits.size(), Game.rng))
	room.cleared.connect(_on_room_cleared)
	room.exit_chosen.connect(_on_exit_chosen)
	room.cage_freed.connect(_on_cage_freed)
	room.boss_spawned.connect(func(boss: Boss) -> void:
		hud.show_boss(boss)
		camera.focus = boss
		boss.died.connect(func(_e: Enemy) -> void: _on_boss_defeated(boss)))
	add_child(room)
	move_child(room, 0)
	milo.global_position = data.player_start
	milo.velocity = Vector2.ZERO
	camera.set_room_bounds(Rect2(Vector2.ZERO, data.size_px()))
	camera.snap()
	view.build_room(room, plan.config.get("dir", "neon_maw") as String)
	hud.set_room_label(Strings.text("level.%d.name" % Game.level) + "  ·  " + Strings.text("hud.room") % [index + 1, plan.room_count()])
	Game.enter_room()
	Save.bump_stat("rooms")
	_play_room_music(data)
	fade.fade_in(ROOM_FADE)
	await _play_room_beat(data, index)
	room.start()


func _assign_cage(data: RoomData) -> void:
	data.cage = &""
	if data.cages.is_empty():
		return
	for boon: Variant in plan.config.get("cages", []):
		var id := StringName(str(boon))
		if not Save.is_unlocked(id):
			data.cage = id
			return


func _play_room_beat(data: RoomData, index: int) -> void:
	var beat: StringName = data.beat
	if index == 0:
		beat = plan.beat("entrance_beat")
	elif data.kind == &"miniboss":
		beat = plan.beat("miniboss_beat")
	elif data.kind == &"boss":
		beat = plan.beat("boss_beat")
	if beat != &"" and dialogue.play(beat):
		await dialogue.finished


func _play_room_music(data: RoomData) -> void:
	if data.kind == &"miniboss":
		Audio.play_music(plan.music("miniboss"))
	elif data.kind == &"boss":
		Audio.play_music(plan.music("boss"))
	else:
		Audio.play_music(plan.music("explore"))


func _on_room_cleared() -> void:
	if pending_reward != &"" and (room.data.kind == &"combat" or room.data.kind == &"entry"):
		RunRewards.pay(pending_reward, self)
	elif room.data.kind == &"recovery":
		pass
	pending_reward = &""
	hud.callout(Strings.text("room.clear"), 1.4)


func _on_exit_chosen(reward: StringName) -> void:
	if _ending:
		return
	Audio.play_sfx(&"door_open", -2.0)
	if reward == &"level_end":
		_finish_level()
		return
	pending_reward = reward
	milo.controllable = false
	await fade.fade_out(ROOM_FADE)
	milo.controllable = true
	_enter_room(_index + 1)


func _on_cage_freed(boon: StringName) -> void:
	await get_tree().create_timer(0.6).timeout
	var beat := StringName("rescue_%s" % boon)
	if dialogue.play(beat):
		await dialogue.finished
	Save.unlock(boon)
	offer_boons(boon)


func _on_boss_defeated(boss: Boss) -> void:
	for node: Node in get_tree().get_nodes_in_group(Enemy.GROUP):
		var minion := node as Enemy
		if minion != null and minion != boss and not minion.dead:
			minion.die()
	Save.record_max("best_level", Game.level)
	Audio.play_music(plan.music("explore"))
	await get_tree().create_timer(1.2).timeout
	if room.data.kind == &"boss":
		var boon := StringName(str(plan.config.get("boss_boon", "")))
		if boon != &"":
			Save.unlock(boon)
		offer_boons(boon)
	else:
		offer_boons()


## Shows the boon offer and waits for the pick.
func offer_boons(forced: StringName = &"") -> void:
	var options: Array[StringName] = BoonChoice.roll(Game.rng, forced)
	if options.is_empty():
		return
	boon_choice.offer(options, forced)
	await boon_choice.chosen
	Game.heal(Game.max_health * Upgrades.value(&"boon_choice"))
	Game.add_energy(Game.max_energy * Upgrades.value(&"boon_choice"))


func _finish_level() -> void:
	_ending = true
	var beat: StringName = plan.beat("aftermath_beat")
	if beat != &"" and dialogue.play(beat):
		await dialogue.finished
	if LevelPlan.has_level(Game.level + 1):
		Game.level += 1
		plan = LevelPlan.make(Game.level, Game.rng)
		_ending = false
		await fade.fade_out(ROOM_FADE)
		_enter_room(0)
		return
	_end(true)


func _on_milo_died() -> void:
	if _ending:
		return
	_ending = true
	milo.controllable = false
	Audio.play_sfx(&"milo_die", 0.0)
	Engine.time_scale = 0.35
	await get_tree().create_timer(0.6, true, false, true).timeout
	Engine.time_scale = 1.0
	_end(false)


func _end(won: bool) -> void:
	Game.end_run(won)
	Audio.play_music(&"victory" if won else &"hub")
	results.show_results(won)
	await results.closed
	finished.emit(won)


func _rescue_fall() -> void:
	milo.take_damage(10.0, milo.global_position.x)
	milo.global_position = room.data.player_start
	milo.velocity = Vector2.ZERO


func _clear_leftovers() -> void:
	for group: StringName in [EnemyShot.GROUP, Pickup.GROUP, HazardZone.GROUP, &"arcane_bolt"]:
		for node: Node in get_tree().get_nodes_in_group(group):
			if node.get_parent() == self:
				node.queue_free()


## Debug builds only, with the F3 panel open: F6 clears the room, F7 skips
## to the next one, F8 jumps to the boss.
func _unhandled_input(event: InputEvent) -> void:
	if not Debug.enabled or not Debug.overlay_visible or not event is InputEventKey or not event.is_pressed():
		return
	match (event as InputEventKey).physical_keycode:
		KEY_F6:
			for node: Node in get_tree().get_nodes_in_group(Enemy.GROUP):
				(node as Enemy).take_hit(Hit.make(99999.0, Vector2.UP))
		KEY_F7:
			if room != null and room.exits.size() > 0 and _index + 1 < plan.room_count():
				_on_exit_chosen(room.exits[0].reward)
		KEY_F8:
			_index = plan.room_count() - 2
			_on_exit_chosen(&"boss")
