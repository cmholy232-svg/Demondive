class_name Run
extends Node2D
## One dive: loads the level's rooms, moves Milo between them, pays out
## rewards, plays story beats, and ends in death or victory. Levels with a
## map are box rooms on a grid that Milo walks between through their gates
## (LevelMap); the rest play their rooms in a line through exit doors.

signal finished(won: bool)

const MILO_SCENE: PackedScene = preload("res://scenes/player/milo.tscn")
const ROOM_FADE: float = 0.25
## Upward speed when Milo comes up through a floor shaft into the box above.
const POP_SPEED: float = -1250.0

var plan: LevelPlan
## The level's grid of box rooms, or null on levels played as a line.
var map: LevelMap
var cell: LevelMap.Cell
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
var debug: RunDebug
var pending_reward: StringName = &""
var _index: int = -1
var _ending: bool = false
var _traveling: bool = false
## The Forever Motel replays one cleared room per level ("false awakening").
var _woke_this_level: bool = false


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
	milo.shield_check = specials.absorbs_hit
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
	debug = RunDebug.new()
	debug.run = self
	add_child(debug)
	Game.milo_died.connect(_on_milo_died)
	plan = LevelPlan.make(Game.level, Game.rng)
	_begin_level()


func _begin_level() -> void:
	map = LevelMap.make(plan, Game.rng) if LevelMap.wanted(plan.config) else null
	cell = null
	if map != null:
		_enter_cell(map.start(), "")
	else:
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
	if map != null and room.is_clear and not _traveling:
		var side: String = room.data.gate_left_by(milo.global_position)
		if side != "":
			_travel(side)
			return
	if milo.global_position.y > room.data.size_px().y + 400.0 and not _traveling:
		_rescue_fall()


func _enter_room(index: int) -> void:
	_index = index
	var data: RoomData = plan.rooms[index]
	await _open_room(data, plan.door_rewards(index, data.exits.size(), Game.rng), false)
	_roll_house_rule(data, index)
	_place_milo(data.player_start, Vector2.ZERO)
	hud.set_room_label(Strings.text("level.%d.name" % Game.level) + "  ·  " + Strings.text("hud.room") % [index + 1, plan.room_count()])
	Game.enter_room()
	Save.bump_stat("rooms")
	await _arrive(data, index)


## Map levels: enter a box through the gate on side came_in ("" = the level start).
func _enter_cell(target: LevelMap.Cell, came_in: String) -> void:
	cell = target
	_index = maxi(0, target.step)
	var first: bool = not target.visited
	target.visited = true
	var data: RoomData = RoomData.load_box(target.room.path, target.doors)
	pending_reward = &"" if target.cleared else target.reward
	var rewards: Array[StringName] = [&"level_end"] if target.kind == &"boss" else []
	await _open_room(data, rewards, target.cleared)
	RoomRules.clear()
	var velocity: Vector2 = Vector2(milo.velocity.x, maxf(milo.velocity.y, 0.0))
	if came_in == "":
		_place_milo(data.player_start if data.player_start != Vector2.ZERO else data.gate_spawn("W"), Vector2.ZERO)
	elif came_in == "S":
		# Popped up out of the floor shaft, drifting onto the floor beside it.
		var drift: float = -1.0 if data.gate_spawn("S").x > data.size_px().x * 0.5 else 1.0
		_place_milo(data.gate_spawn("S"), Vector2(drift * 380.0, POP_SPEED))
	else:
		_place_milo(data.gate_spawn(came_in), velocity if came_in != "N" else Vector2.ZERO)
	hud.set_room_label(Strings.text("level.%d.name" % Game.level))
	hud.show_map(map, target.at)
	if first:
		Game.enter_room()
		Save.bump_stat("rooms")
		await _arrive(data, 0 if target.step == 0 else 1)
	else:
		await _arrive(data, -1)


## Walks Milo out through a gate into the neighbouring box.
func _travel(side: String) -> void:
	var next: LevelMap.Cell = map.cell(cell.neighbour(side))
	if next == null:
		return
	_traveling = true
	Audio.play_sfx(&"door_open", -6.0)
	await fade.fade_out(ROOM_FADE * 0.6)
	await _enter_cell(next, LevelMap.OPPOSITE[side])
	_traveling = false


func _open_room(data: RoomData, rewards: Array[StringName], revisit: bool) -> void:
	if room != null:
		room.queue_free()
		await room.tree_exited
	_clear_leftovers()
	camera.focus = null
	if not revisit:
		_assign_cage(data)
	room = Room.new()
	room.revisit = revisit
	if cell != null and map != null:
		room.gate_hints = _gate_hints(cell)
	room.setup(data, rewards)
	room.roster = plan.config.get("roster", {}) as Dictionary
	room.miniboss_kind = StringName(str(plan.config.get("miniboss", "bartender")))
	room.boss_kind = StringName(str(plan.config.get("boss", "belladonna")))
	room.cleared.connect(_on_room_cleared)
	room.exit_chosen.connect(_on_exit_chosen)
	room.cage_freed.connect(_on_cage_freed)
	room.boss_spawned.connect(func(boss: Boss) -> void:
		hud.show_boss(boss)
		camera.focus = boss
		boss.died.connect(func(_e: Enemy) -> void: _on_boss_defeated(boss)))
	add_child(room)
	move_child(room, 0)
	view.build_room(room, plan.config.get("dir", "neon_maw") as String)


func _place_milo(at: Vector2, velocity: Vector2) -> void:
	milo.global_position = at
	milo.safe_position = at
	milo.velocity = velocity
	milo.reset_physics_interpolation()
	camera.set_room_bounds(Rect2(Vector2.ZERO, room.data.size_px()))
	camera.snap()


## Music, fade-in and the story beat, then the fight starts. index -1: a revisit, no beat.
func _arrive(data: RoomData, index: int) -> void:
	_play_room_music(data)
	fade.fade_in(ROOM_FADE)
	if index >= 0:
		await _play_room_beat(data, index)
	if RoomRules.current != &"":
		BossAnnouncer.say(get_tree(), Strings.text("rule.announce") % Strings.text("rule.%s" % RoomRules.current))
	room.start()


## The Thunder Jackpot: every fight after the first rolls a house rule, shown before it starts.
func _roll_house_rule(data: RoomData, index: int) -> void:
	RoomRules.clear()
	if bool(plan.config.get("house_rules", false)) and index > 0 and (data.kind == &"combat" or data.kind == &"entry"):
		RoomRules.roll(Game.rng)


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
	if cell != null:
		cell.cleared = true
		hud.show_map(map, cell.at)
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
	if _false_awakening():
		_enter_room(_index)
		hud.callout(Strings.text("room.false_awakening"), 2.4)
		return
	_enter_room(_index + 1)


func _false_awakening() -> bool:
	var chance: float = float(plan.config.get("false_awakening", 0.0))
	if _woke_this_level or chance <= 0.0 or _index == 0 or room.data.kind != &"combat":
		return false
	if Game.rng.randf() >= chance:
		return false
	_woke_this_level = true
	return true


func _on_cage_freed(boon: StringName) -> void:
	await get_tree().create_timer(0.6).timeout
	var beat := StringName("rescue_%s" % boon)
	if dialogue.play(beat):
		await dialogue.finished
	Save.unlock(boon)
	offer_boons(boon)


func _on_boss_defeated(boss: Boss) -> void:
	if room.rush_active():
		hud.callout(Strings.text("boss.rush.next") % room.rush_queue.size(), 1.2)
		return
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
	# One offer at a time: a cage rescue can land while a room reward is open.
	while boon_choice.visible:
		await boon_choice.chosen
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
		_woke_this_level = false
		_ending = false
		await fade.fade_out(ROOM_FADE)
		_begin_level()
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
	RoomRules.clear()
	Game.end_run(won)
	Audio.play_music(&"victory" if won else &"hub")
	results.show_results(won)
	await results.closed
	finished.emit(won)


func _rescue_fall() -> void:
	if milo.safe_position == Vector2.INF:
		milo.safe_position = room.data.player_start
	milo.hazard_respawn(10.0)


func _clear_leftovers() -> void:
	for group: StringName in [EnemyShot.GROUP, Pickup.GROUP, HazardZone.GROUP, &"arcane_bolt"]:
		for node: Node in get_tree().get_nodes_in_group(group):
			if node.get_parent() == self:
				node.queue_free()


## What each gate of here leads to, for rooms Milo hasn't been in yet.
func _gate_hints(here: LevelMap.Cell) -> Dictionary:
	var hints: Dictionary = {}
	for side: String in here.doors:
		var next: LevelMap.Cell = map.cell(here.neighbour(side))
		if next != null and not next.visited:
			hints[side] = next.reward if next.kind == &"combat" else next.kind
	return hints


func is_traveling() -> bool:
	return _traveling
