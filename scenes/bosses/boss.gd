class_name Boss
extends Enemy
## Shared boss rules: no knockback, a name for the boss bar, health-based
## phase milestones, and a steady rhythm of attacks that each start with a
## wind-up the player can read from the body and a sound.

signal phase_reached(index: int)

## Strings key prefix, e.g. "boss.bartender" -> .name and .title.
var title_key: String = ""
## Health ratios that trigger a milestone, highest first.
var milestones: Array[float] = []
var phase: int = 0
var attack_count: int = 0
## Area the boss may move in (set by the room), in world space.
var arena: Rect2 = Rect2(0.0, 0.0, 2400.0, 1200.0)

var _windup_left: float = 0.0
var _pending_attack: Callable = Callable()
var _milestones_hit: int = 0


func _ready() -> void:
	is_boss = true
	knock_taken = 0.0
	shards_dropped = 12
	super._ready()
	add_to_group(&"bosses")


## Starts a wind-up pose; the attack fires when it ends.
func telegraph(pose: StringName, seconds: float, attack: Callable) -> void:
	_windup_left = seconds
	_pending_attack = attack
	set_pose(pose, seconds)
	Audio.play_sfx(&"boss_windup", -4.0, 0.08)


func is_winding_up() -> bool:
	return _windup_left > 0.0


func _physics_process(delta: float) -> void:
	if is_active() and _windup_left > 0.0:
		_windup_left -= delta
		if _windup_left <= 0.0 and _pending_attack.is_valid():
			var attack: Callable = _pending_attack
			_pending_attack = Callable()
			attack.call()
	super._physics_process(delta)
	if is_active():
		_check_milestones()
		global_position.x = clampf(global_position.x, arena.position.x + size.x * 0.5, arena.end.x - size.x * 0.5)


func _check_milestones() -> void:
	while _milestones_hit < milestones.size() and health_ratio() < milestones[_milestones_hit]:
		_milestones_hit += 1
		phase = _milestones_hit
		Audio.play_sfx(&"boss_phase", 0.0)
		GameCamera.impact_in(get_tree(), GameCamera.Tier.BOSS, Vector2.DOWN)
		phase_reached.emit(_milestones_hit)
		_on_milestone(_milestones_hit)


## Subclasses: what happens when a milestone is crossed (1-based).
func _on_milestone(_index: int) -> void:
	pass


func floor_y() -> float:
	return arena.end.y


func spawn_minion(minion: Enemy, at: Vector2) -> void:
	minion.position = at
	get_parent().add_child(minion)
	Game.fx(&"portal", at + Vector2(0.0, -50.0), Color(1.0, 0.3, 0.6), 1.0)


func add_hazard(zone: HazardZone) -> HazardZone:
	get_parent().add_child(zone)
	return zone
