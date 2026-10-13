class_name Bartender
extends Boss
## The Bottomless Bartender, Level 1 mini-boss. Teaches what Belladonna
## tests: watch the floor, read the wind-up, and don't stand in the pour.
##   Glass Arc   - raises a tray, then lobs exploding glasses in an arc.
##   Pour        - tips the bottle; a lane of the floor under Milo floods.
##   Bar Rush    - plants a foot, then slides the length of the bar.
##   Bottle Snap - flicks a fast bottle straight at Milo.
## Last Call (66%) brings two regulars; The Tab Doubles (32%) adds a ring of shots.

const GLASS_COLOR: Color = Color(0.4, 0.92, 0.85)
const AMBER: Color = Color(1.0, 0.78, 0.35)

var _rush_left: float = 0.0


func _setup() -> void:
	kind = &"bartender"
	title_key = "boss.bartender"
	size = Vector2(110.0, 190.0)
	max_health = 560.0
	contact_damage = 18.0
	milestones = [0.66, 0.32]


func _think(delta: float) -> void:
	apply_gravity(delta)
	if _rush_left > 0.0:
		_rush_left -= delta
		if is_on_wall():
			_rush_left = 0.0
			velocity.x = 0.0
			GameCamera.impact_in(get_tree(), GameCamera.Tier.HEAVY, Vector2(facing, 0.0))
		return
	if is_winding_up():
		velocity.x = move_toward(velocity.x, 0.0, 2400.0 * delta)
		return
	velocity.x = move_toward(velocity.x, facing * 110.0, 300.0 * delta)
	if think_timer > 0.0:
		return
	attack_count += 1
	var pattern: int = attack_count % 4
	if pattern == 1:
		telegraph(&"windup_tray", 0.6, _glass_arc)
	elif pattern == 2:
		telegraph(&"windup_pour", 0.5, _pour)
	elif pattern == 3:
		telegraph(&"windup_rush", 0.55, _bar_rush)
	else:
		telegraph(&"windup_throw", 0.35, _bottle_snap)
	think_timer = maxf(1.1, 2.1 - (1.0 - health_ratio()) * 0.9)


func _glass_arc() -> void:
	set_pose(&"attack_tray", 0.45)
	var count: int = 5 + phase * 2
	for i: int in count:
		var spread: float = float(i) - float(count - 1) * 0.5
		var shot: EnemyShot = shoot(Vector2.ZERO, 0.0, 13.0, GLASS_COLOR if i % 2 == 0 else AMBER, 13.0)
		shot.velocity = Vector2(facing * (300.0 + absf(spread) * 70.0), -760.0 + spread * 50.0)
		shot.gravity_force = 1500.0
	Audio.play_sfx(&"enemy_shoot", -2.0)


func _pour() -> void:
	set_pose(&"attack_pour", 0.6)
	var target: Milo = milo()
	var lane_width: float = 520.0 if phase >= 1 else 400.0
	var center_x: float = target.global_position.x if target != null else global_position.x
	var left: float = clampf(center_x - lane_width * 0.5, arena.position.x, arena.end.x - lane_width)
	var zone := HazardZone.make(&"pour", Rect2(left, floor_y() - 30.0, lane_width, 30.0), 14.0, 0.75, 2.6 + phase * 0.5)
	zone.color = GLASS_COLOR
	add_hazard(zone)


func _bar_rush() -> void:
	set_pose(&"attack_rush", 0.9)
	velocity.x = facing * 900.0
	_rush_left = 0.9


func _bottle_snap() -> void:
	set_pose(&"attack_throw", 0.3)
	shoot(aim_at_milo(center() + Vector2(0.0, -40.0)), 620.0, 12.0, AMBER, 12.0)
	if phase >= 2:
		shoot(aim_at_milo(center()).rotated(0.2), 620.0, 12.0, AMBER, 12.0)
		shoot(aim_at_milo(center()).rotated(-0.2), 620.0, 12.0, AMBER, 12.0)


func _on_milestone(index: int) -> void:
	if index == 1:
		spawn_flash_text("boss.bartender.last_call")
		var left_x: float = clampf(global_position.x - 420.0, arena.position.x + 80.0, arena.end.x - 80.0)
		var right_x: float = clampf(global_position.x + 420.0, arena.position.x + 80.0, arena.end.x - 80.0)
		spawn_minion(Floater.new(), Vector2(left_x, floor_y() - 320.0))
		spawn_minion(Succubus.new(), Vector2(right_x, floor_y()))
		_pour()
	elif index == 2:
		spawn_flash_text("boss.bartender.tab_doubles")
		for i: int in 12:
			shoot(Vector2.RIGHT.rotated(TAU * i / 12.0), 350.0, 13.0, AMBER, 11.0)


func spawn_flash_text(key: String) -> void:
	Game.fx(&"announce", center(), AMBER, 1.0)
	BossAnnouncer.say(get_tree(), Strings.text(key))
