class_name Room
extends Node2D
## One room of a run, built from a RoomData file: geometry, enemy waves,
## pickups, a caged boon-giver, and exit doors that open once it's clear.

signal cleared
signal exit_chosen(reward: StringName)
signal cage_freed(boon: StringName)
signal boss_spawned(boss: Boss)

const WAVE_DELAY: float = 0.8

var data: RoomData
var builder: RoomBuilder = RoomBuilder.new()
var exits: Array[ExitDoor] = []
## Rewards shown on the doors, one per exit (filled by the run).
var door_rewards: Array[StringName] = []
var wave: int = 0
var is_clear: bool = false
var boss: Boss = null
var _wave_timer: float = -1.0
var _started: bool = false


func setup(room_data: RoomData, rewards: Array[StringName]) -> void:
	data = room_data
	door_rewards = rewards


func _ready() -> void:
	builder.build(data, self)
	for i: int in data.exits.size():
		var door := ExitDoor.new()
		door.position = data.exits[i]
		door.reward = door_rewards[i] if i < door_rewards.size() else &"none"
		door.chosen.connect(_on_door_chosen)
		add_child(door)
		exits.append(door)
	_place_cage()
	for at: Vector2 in data.temptations:
		Pickup.spawn(self, at + Vector2(0.0, -40.0), Pickup.Kind.PIZZA, 0.15)
		for i: int in 3:
			Pickup.spawn(self, at + Vector2(-30.0 + i * 30.0, -90.0), Pickup.Kind.SHARD, 1.0)
	for at: Vector2 in data.pizzas:
		Pickup.spawn(self, at + Vector2(0.0, -30.0), Pickup.Kind.PIZZA, 0.35)
	for at: Vector2 in data.coffees:
		Pickup.spawn(self, at + Vector2(0.0, -30.0), Pickup.Kind.COFFEE, 0.6)


## Called by the run once Milo is in place.
func start() -> void:
	_started = true
	if data.kind == &"boss" or data.kind == &"miniboss":
		_spawn_boss()
	elif data.wave_count() > 0:
		_wave_timer = 0.3
	else:
		_set_clear()


func _physics_process(delta: float) -> void:
	if not _started or is_clear:
		return
	if _wave_timer > 0.0:
		_wave_timer -= delta
		if _wave_timer <= 0.0:
			_spawn_wave(wave + 1)
		return
	if enemies_left() == 0 and _wave_timer < 0.0:
		if boss != null or wave >= data.wave_count():
			_set_clear()
		else:
			_wave_timer = WAVE_DELAY


func enemies_left() -> int:
	var count: int = 0
	for node: Node in get_tree().get_nodes_in_group(Enemy.GROUP):
		var enemy := node as Enemy
		if enemy != null and not enemy.dead and is_ancestor_of(enemy):
			count += 1
	return count


func _spawn_wave(index: int) -> void:
	wave = index
	_wave_timer = -1.0
	for spawn: Dictionary in data.spawns:
		if int(spawn["wave"]) != index:
			continue
		var enemy: Enemy = EnemyFactory.make(spawn["kind"] as StringName)
		enemy.position = spawn["at"] as Vector2
		enemy.aggro = index > 1
		_scale_enemy(enemy)
		add_child(enemy)
		if index > 1:
			Game.fx(&"portal", enemy.position + Vector2(0.0, -50.0), Color(1.0, 0.3, 0.55), 1.0)


## Later levels and deeper rooms hit a little harder.
func _scale_enemy(enemy: Enemy) -> void:
	var depth: float = (Game.level - 1) * 0.35 + Game.room_index * 0.03
	enemy.max_health *= 1.0 + depth
	enemy.contact_damage *= 1.0 + depth * 0.5


func _spawn_boss() -> void:
	var kind: StringName = &"bartender" if data.kind == &"miniboss" else &"belladonna"
	if data.boss_kind != &"":
		kind = data.boss_kind
	boss = EnemyFactory.make(kind) as Boss
	boss.position = data.boss_spawn
	boss.arena = Rect2(Vector2(RoomData.TILE, 0.0), data.size_px() - Vector2(RoomData.TILE * 2.0, RoomData.TILE * 2.0))
	boss.aggro = true
	add_child(boss)
	boss_spawned.emit(boss)


func _place_cage() -> void:
	if data.cages.is_empty() or data.cage == &"" or Save.is_unlocked(data.cage):
		return
	var cage := BoonCage.new()
	cage.boon = data.cage
	cage.position = data.cages[0]
	cage.freed.connect(func(boon: StringName) -> void: cage_freed.emit(boon))
	add_child(cage)


func _set_clear() -> void:
	if is_clear:
		return
	is_clear = true
	for door: ExitDoor in exits:
		door.open = true
	if data.kind != &"hub":
		Audio.play_sfx(&"room_clear", -2.0)
	cleared.emit()


func _on_door_chosen(door: ExitDoor) -> void:
	exit_chosen.emit(door.reward)
