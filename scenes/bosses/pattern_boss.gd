class_name PatternBoss
extends Boss
## A boss described in data/bosses/bosses.json: body, movement, palette, an
## attack rotation drawn from BossAttacks, and what happens at each health
## milestone. Every attack starts with a wind-up pose and sound.

const BOSSES_PATH: String = "res://data/bosses/bosses.json"

static var _table: Dictionary = {}

var spec: Dictionary = {}
var minion_kind: StringName = &""
var reflecting_left: float = 0.0
var _rotation: Array = []
var _cursor: int = 0
var _charge_left: float = 0.0
var _charge_dir: float = 1.0
var _vortex_left: float = 0.0
var _vortex_pull: float = 0.0
var _leap_spec: Dictionary = {}
var _airborne: bool = false
var _minion_timer: float = 0.0
var _hover_t: float = 0.0


static func table() -> Dictionary:
	if _table.is_empty():
		_table = JSON.parse_string(FileAccess.get_file_as_string(BOSSES_PATH)) as Dictionary
	return _table


static func has(id: StringName) -> bool:
	return table().has(String(id))


static func make(id: StringName) -> PatternBoss:
	var boss := PatternBoss.new()
	boss.spec = table()[String(id)] as Dictionary
	boss.kind = id
	return boss


func _setup() -> void:
	title_key = "boss.%s" % kind
	var body: Array = spec.get("size", [130, 210]) as Array
	size = Vector2(float(body[0]), float(body[1]))
	max_health = float(spec.get("health", 1200.0))
	contact_damage = float(spec.get("contact", 20.0))
	flies = str(spec.get("move", "walk")) == "hover"
	var marks: Array[float] = []
	for m: Variant in spec.get("milestones", [0.66, 0.33]) as Array:
		marks.append(float(m))
	milestones = marks
	palette = spec.get("palette", {}) as Dictionary
	_rotation = spec.get("attacks", []) as Array
	var minions: Dictionary = spec.get("minions", {}) as Dictionary
	minion_kind = StringName(str(minions.get("enemy", "")))
	_minion_timer = float(minions.get("every", 8.0))


func palette_color(key: String) -> Color:
	var colors: Dictionary = spec.get("colors", {}) as Dictionary
	return Color.html(str(colors.get(key, key if key.begins_with("#") else "#ff4fa0")))


func _think(delta: float) -> void:
	reflecting_left = maxf(0.0, reflecting_left - delta)
	_hover_t += delta
	_tick_vortex(delta)
	_tick_minions(delta)
	if _charge_left > 0.0:
		_charge_left -= delta
		velocity.x = _charge_dir * absf(velocity.x)
		if not flies:
			apply_gravity(delta)
		if is_on_wall():
			_charge_left = 0.0
			GameCamera.impact_in(get_tree(), GameCamera.Tier.HEAVY, Vector2(_charge_dir, 0.0))
		return
	if _airborne:
		apply_gravity(delta, 1800.0)
		if is_on_floor() and velocity.y >= 0.0:
			_airborne = false
			velocity.x = 0.0
			BossAttacks.shockwave(self, _leap_spec, phase)
		return
	_move(delta)
	if is_winding_up() or think_timer > 0.0:
		return
	var attack: Dictionary = _next_attack()
	if attack.is_empty():
		think_timer = 1.0
		return
	telegraph(StringName(str(attack.get("pose", "windup"))), float(attack.get("windup", 0.6)), func() -> void:
		set_pose(StringName(str(attack.get("attack_pose", "attack"))), 0.4)
		Audio.play_sfx(StringName(str(attack.get("sfx", "enemy_shoot"))), -3.0, 0.1)
		BossAttacks.run(self, attack))
	var timing: Array = spec.get("think", [1.5, 0.22]) as Array
	think_timer = maxf(0.6, float(timing[0]) - float(timing[1]) * phase)


func _next_attack() -> Dictionary:
	for _i: int in _rotation.size():
		var attack: Dictionary = _rotation[_cursor % _rotation.size()] as Dictionary
		_cursor += 1
		if phase >= int(attack.get("from_phase", 0)):
			if str(attack.get("kind", "")) == "gamble":
				return _gamble(attack)
			return attack
	return {}


## Calyptra: rolls one of her other attacks and says which before it lands.
func _gamble(attack: Dictionary) -> Dictionary:
	var pool: Array = attack.get("pool", []) as Array
	if pool.is_empty():
		return {}
	var pick: Dictionary = pool[rng.randi_range(0, pool.size() - 1)] as Dictionary
	BossAnnouncer.say(get_tree(), Strings.text(str(pick.get("name", "boss.roll"))))
	var rolled: Dictionary = pick.duplicate()
	rolled["windup"] = maxf(float(rolled.get("windup", 0.6)), 0.85)
	return rolled


func _move(delta: float) -> void:
	var speed: float = float(spec.get("speed", 90.0)) * (1.0 + phase * 0.2) * speed_scale
	var mode: String = str(spec.get("move", "walk"))
	var milo: Milo = milo()
	if milo == null:
		return
	var dx: float = milo.global_position.x - global_position.x
	if mode == "hover":
		var goal := Vector2(milo.global_position.x - signf(dx) * 380.0, floor_y() - float(spec.get("hover_height", 330.0)) + sin(_hover_t * 1.7) * 40.0)
		goal.x = clampf(goal.x, arena.position.x + size.x, arena.end.x - size.x)
		var to_goal: Vector2 = goal - global_position
		velocity = velocity.lerp(to_goal.limit_length(1.0) * minf(to_goal.length() * 2.0, speed * 2.2), clampf(2.5 * delta, 0.0, 1.0))
		return
	apply_gravity(delta)
	if is_winding_up():
		velocity.x = move_toward(velocity.x, 0.0, 1800.0 * delta)
		return
	var want: float = signf(dx)
	if mode == "keep_away" and absf(dx) < 460.0:
		want = -signf(dx)
	velocity.x = move_toward(velocity.x, want * speed, speed * 5.0 * delta)


func _tick_vortex(delta: float) -> void:
	if _vortex_left <= 0.0:
		return
	_vortex_left -= delta
	var milo: Milo = milo()
	if milo == null or milo.is_dashing():
		return
	milo.push.x += signf(global_position.x - milo.global_position.x) * _vortex_pull * 6.0


func _tick_minions(delta: float) -> void:
	if minion_kind == &"":
		return
	_minion_timer -= delta
	if _minion_timer > 0.0:
		return
	var minions: Dictionary = spec.get("minions", {}) as Dictionary
	_minion_timer = float(minions.get("every", 8.0))
	if minion_count() < int(minions.get("max", 2)):
		BossAttacks.summon(self, {"enemy": minion_kind, "count": 1, "max": int(minions.get("max", 2))}, phase)


func minion_count() -> int:
	var count: int = 0
	for node: Node in get_tree().get_nodes_in_group(Enemy.GROUP):
		var enemy := node as Enemy
		if enemy != null and enemy != self and not enemy.dead and not enemy.is_boss:
			count += 1
	return count


func start_charge(speed: float, seconds: float) -> void:
	_charge_left = seconds
	_charge_dir = float(facing)
	velocity.x = _charge_dir * speed
	set_pose(&"attack", seconds)


func start_leap(height: float, landing: Dictionary) -> void:
	var milo: Milo = milo()
	var target_x: float = milo.global_position.x if milo != null else global_position.x
	var rise: float = sqrt(2.0 * 1800.0 * height)
	var air_time: float = 2.0 * rise / 1800.0
	velocity = Vector2((target_x - global_position.x) / air_time, -rise)
	_airborne = true
	_leap_spec = landing
	set_pose(&"attack", air_time)


func start_vortex(pull: float, seconds: float) -> void:
	_vortex_pull = pull
	_vortex_left = seconds
	Audio.play_sfx(&"boss_vortex", 0.0)


func start_reflect(seconds: float) -> void:
	reflecting_left = seconds
	set_pose(&"attack_reflect", seconds)


func teleport_behind_milo() -> void:
	var milo: Milo = milo()
	if milo == null:
		return
	Game.fx(&"portal", center(), palette_color("a"), 1.4)
	var side: float = -float(milo.facing)
	global_position.x = clampf(milo.global_position.x + side * 300.0, arena.position.x + size.x, arena.end.x - size.x)
	if not flies:
		global_position.y = floor_y()
	reset_physics_interpolation()
	Game.fx(&"portal", center(), palette_color("a"), 1.4)


## Vespera's mirror: while it's up, bolts bounce back at Milo instead of landing.
func take_hit(hit: Hit) -> void:
	if reflecting_left > 0.0 and hit.source == &"bolt":
		var back: EnemyShot = shoot(aim_at_milo(center()), 620.0, 10.0 + phase * 2.0, palette_color("c"), 11.0)
		back.global_position = center() + aim_at_milo(center()) * size.x * 0.6
		Game.fx(&"hit", center(), palette_color("c"), 1.0)
		return
	super.take_hit(hit)


func _on_milestone(index: int) -> void:
	for event: Variant in spec.get("events", []) as Array:
		var e: Dictionary = event as Dictionary
		if int(e.get("phase", 0)) != index:
			continue
		if e.has("say"):
			BossAnnouncer.say(get_tree(), Strings.text(str(e["say"])))
		match str(e.get("do", "")):
			"summon":
				BossAttacks.summon(self, e, phase)
			"attack":
				BossAttacks.run(self, e)
			"suppress":
				Game.boons_suppressed = true
				Game.boons_changed.emit()
			"restore":
				Game.boons_suppressed = false
				Game.boons_changed.emit()
				Game.heal(Game.max_health * float(e.get("heal", 0.0)))
				Game.add_energy(Game.max_energy)


func _on_died() -> void:
	if Game.boons_suppressed:
		Game.boons_suppressed = false
		Game.boons_changed.emit()
