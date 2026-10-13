class_name Belladonna
extends Boss
## Belladonna, Demon Lord of Appetite. Tests what the Bartender taught.
##   Kiss Volley      - blows a kiss: a fan of shots, and a bite snaps shut beside Milo.
##   Temptation Trap  - drops real pizza or coffee inside a mouth that snaps shut.
##   Swallow Vortex   - inhales: a ring of shots, then she pulls Milo toward her.
##   Twin Lances      - spreads her arms: fast shots both ways along the floor.
## The crowd is hungry (72%) brings two guests; The maw opens (38%) rains maws.

const PINK: Color = Color(1.0, 0.2, 0.37)
const ORANGE: Color = Color(1.0, 0.54, 0.27)
const GOLD: Color = Color(1.0, 0.78, 0.35)
const VORTEX_PULL: float = 520.0

var vortex_left: float = 0.0
var _crowd_timer: float = 6.5


func _setup() -> void:
	kind = &"belladonna"
	title_key = "boss.belladonna"
	size = Vector2(150.0, 236.0)
	max_health = 1150.0
	contact_damage = 22.0
	milestones = [0.72, 0.38]


func _think(delta: float) -> void:
	apply_gravity(delta)
	_pull_milo(delta)
	_call_crowd(delta)
	if is_winding_up():
		velocity.x = move_toward(velocity.x, 0.0, 1500.0 * delta)
		return
	var speed: float = 85.0 + phase * 20.0
	velocity.x = move_toward(velocity.x, facing * speed, (120.0 + phase * 45.0) * delta * 4.0)
	if think_timer > 0.0:
		return
	attack_count += 1
	if attack_count % 4 == 0:
		telegraph(&"windup_inhale", 0.85, _swallow_vortex)
	elif attack_count % 3 == 0:
		telegraph(&"windup_offer", 0.6, _temptation_trap)
	elif attack_count % 5 == 2:
		telegraph(&"windup_arms", 0.55, _twin_lances)
	else:
		telegraph(&"windup_kiss", 0.45, _kiss_volley)
	think_timer = maxf(0.75, 1.5 - phase * 0.22)


func _kiss_volley() -> void:
	set_pose(&"attack_kiss", 0.34)
	var shots: int = 3 + phase * 2
	var aim: Vector2 = aim_at_milo(center() + Vector2(0.0, -60.0))
	for i: int in shots:
		var spread: float = (float(i) - float(shots - 1) * 0.5) * 0.18
		shoot(aim.rotated(spread), 390.0 + phase * 35.0, 11.0 + phase * 2.0, PINK, 12.0)
	var target: Milo = milo()
	if target == null:
		return
	var bite_left: float = target.global_position.x + (140.0 if target.global_position.x < global_position.x else -460.0)
	bite_left = clampf(bite_left, arena.position.x, arena.end.x - 320.0)
	var bite := HazardZone.make(&"bite", Rect2(bite_left, floor_y() - 140.0, 320.0, 140.0), 18.0, 0.62, 0.3)
	bite.color = PINK
	add_hazard(bite)


func _temptation_trap() -> void:
	set_pose(&"attack_offer", 0.4)
	var target: Milo = milo()
	var trap_x: float = target.global_position.x if target != null else global_position.x
	trap_x = clampf(trap_x, arena.position.x + 120.0, arena.end.x - 120.0)
	var trap := HazardZone.make(&"temptation", Rect2(trap_x - 110.0, floor_y() - 110.0, 220.0, 110.0), 16.0, 1.5, 0.35)
	trap.color = PINK
	add_hazard(trap)
	var treat: Pickup.Kind = Pickup.Kind.PIZZA if attack_count % 2 == 0 else Pickup.Kind.COFFEE
	Pickup.spawn(get_parent(), Vector2(trap_x, floor_y() - 40.0), treat, 0.1 if treat == Pickup.Kind.PIZZA else 0.3)
	shoot(Vector2.RIGHT, 540.0 + phase * 50.0, 15.0, GOLD, 13.0)
	shoot(Vector2.LEFT, 540.0 + phase * 50.0, 15.0, GOLD, 13.0)


func _swallow_vortex() -> void:
	set_pose(&"attack_inhale", 1.6)
	var shots: int = 10 + phase * 2
	for i: int in shots:
		shoot(Vector2.RIGHT.rotated(TAU * i / shots), 320.0 + phase * 30.0, 12.0 + phase, ORANGE, 12.0)
	vortex_left = 1.65 + phase * 0.25
	Audio.play_sfx(&"boss_vortex", 0.0)


func _twin_lances() -> void:
	set_pose(&"attack_arms", 0.4)
	for height: float in [40.0, 150.0]:
		for direction: Vector2 in [Vector2.LEFT, Vector2.RIGHT]:
			var shot: EnemyShot = shoot(direction, 600.0 + phase * 60.0, 14.0, GOLD, 12.0)
			shot.global_position.y = floor_y() - height


func _pull_milo(delta: float) -> void:
	if vortex_left <= 0.0:
		return
	vortex_left -= delta
	var target: Milo = milo()
	if target == null or target.is_dashing():
		return
	var toward: float = signf(global_position.x - target.global_position.x)
	target.velocity.x += toward * VORTEX_PULL * delta * 6.0
	target.velocity.x = clampf(target.velocity.x, -700.0, 700.0)


func _call_crowd(delta: float) -> void:
	_crowd_timer -= delta
	if _crowd_timer > 0.0:
		return
	_crowd_timer = 6.5
	var imps: int = 0
	for node: Node in get_tree().get_nodes_in_group(Enemy.GROUP):
		if node is Imp and not (node as Imp).dead:
			imps += 1
	if imps >= 2:
		return
	spawn_minion(Imp.new(), Vector2(clampf(global_position.x - 160.0, arena.position.x + 60.0, arena.end.x - 60.0), floor_y()))
	spawn_minion(Imp.new(), Vector2(clampf(global_position.x + 190.0, arena.position.x + 60.0, arena.end.x - 60.0), floor_y()))


func _on_milestone(index: int) -> void:
	if index == 1:
		BossAnnouncer.say(get_tree(), Strings.text("boss.belladonna.crowd"))
		spawn_minion(Siren.new(), Vector2(arena.position.x + 200.0, floor_y()))
		spawn_minion(Siren.new(), Vector2(arena.end.x - 200.0, floor_y()))
	elif index == 2:
		BossAnnouncer.say(get_tree(), Strings.text("boss.belladonna.maw"))
		var x: float = arena.position.x + 150.0
		while x < arena.end.x - 100.0:
			var maw: EnemyShot = shoot(Vector2.DOWN, 330.0, 14.0, PINK, 13.0)
			maw.global_position = Vector2(x, arena.position.y + 40.0)
			x += 140.0
