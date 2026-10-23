class_name Milo
extends CharacterBody2D
## Milo's movement kit: run with fast turnaround, variable jump, double jump,
## coyote time, jump buffer, fast fall, drop-through, 8-way invulnerable dash,
## wavedash and waveland. Presentation listens to the signals below and never
## feeds back into movement.

signal jumped(is_air_jump: bool)
signal dashed(direction: Vector2)
signal wavelanded(is_wavedash: bool)
signal landed(impact_speed: float)
signal dropped_through
signal hurt(amount: float)
signal perfect_dodged
## The dash is usable again: its cooldown ran out on the ground, or a waveland reset it.
signal dash_ready

## Milo's placeholder is 128 px tall; see docs/design.md (art pipeline) for the final size.
const HEIGHT: float = 128.0
const ONE_WAY_LAYER: int = 6
const HURT_KNOCKBACK: Vector2 = Vector2(420.0, -520.0)
const PERFECT_DODGE_COOLDOWN: float = 0.7
## Share of normal grip left on ice (acceleration; friction gets a quarter of this).
const ICE_GRIP: float = 0.3

@export var tuning: MovementTuning

## Tests set this to drive Milo without the keyboard.
var input_override: MiloInput = null
## The input used on the most recent tick, read by ArcaneCaster.
var current_input: MiloInput = MiloInput.new()

var facing: int = 1
var air_jumps_left: int = 0
var dash_charges_left: int = 1
var coyote_timer: float = 0.0
var jump_buffer_timer: float = 0.0
var dash_timer: float = 0.0
var dash_cooldown_timer: float = 0.0
var dash_direction: Vector2 = Vector2.RIGHT
var wave_slide_timer: float = 0.0
var invulnerable_timer: float = 0.0
## The dash's own i-frames, kept apart so a waveland can end them at touchdown.
var dash_invulnerable_timer: float = 0.0
var drop_timer: float = 0.0
var standing_on_one_way: bool = false
## True from the moment input opposes velocity on the ground until full speed the other way.
var turning_around: bool = false
## Seconds of hit stun after taking damage, during which input is ignored.
var hurt_timer: float = 0.0
var perfect_dodge_cooldown: float = 0.0
## False while a cutscene, menu or death animation owns Milo.
var controllable: bool = true
## Acceleration from room mechanics (currents, vents) this tick; zones set it, step() spends it.
var push: Vector2 = Vector2.ZERO
## True while standing on ice: slow to start, slow to stop.
var on_ice: bool = false
## Asked before a hit lands; returns true when a Special soaks it (barrier, halo).
var shield_check: Callable = Callable()
## Seconds since the last dash ended (Vespera widens the Perfect Dodge after it).
var since_dash: float = INF
## Last solid ground Milo stood on; lava and spike pits put him back here.
var safe_position: Vector2 = Vector2.INF
var _safe_timer: float = 0.0
## Dash speed for a Special's pounce (0 = the normal dash).
var _dash_speed_override: float = 0.0
var _dash_was_ready: bool = true


func _ready() -> void:
	add_to_group(&"milo")
	if tuning == null:
		tuning = load("res://data/player/movement_v2.tres") as MovementTuning
	air_jumps_left = tuning.air_jumps
	dash_charges_left = tuning.dash_charges


func _physics_process(delta: float) -> void:
	current_input = input_override if input_override != null else MiloInput.from_actions()
	if not controllable or hurt_timer > 0.0:
		current_input = MiloInput.make()
	step(current_input, delta)


## A menu or dialogue paused the game: drop the last tick's presses so the
## press that opened it can't fire again the moment it closes.
func _notification(what: int) -> void:
	if what == NOTIFICATION_PAUSED or what == NOTIFICATION_UNPAUSED:
		current_input = MiloInput.make()


func is_dashing() -> bool:
	return dash_timer > 0.0


func is_invulnerable() -> bool:
	return invulnerable_timer > 0.0 or dash_invulnerable_timer > 0.0


func is_wave_sliding() -> bool:
	return wave_slide_timer > 0.0


## Milo's damageable box in world space.
func hurt_rect() -> Rect2:
	return Rect2(global_position + Vector2(-18.0, -112.0), Vector2(36.0, 104.0))


## Returns true if the damage landed. Dashing through an attack is a Perfect Dodge.
func take_damage(amount: float, source_x: float) -> bool:
	if Game.health <= 0.0 or not controllable:
		return false
	if is_invulnerable():
		if is_dashing() and perfect_dodge_cooldown <= 0.0:
			perfect_dodge_cooldown = PERFECT_DODGE_COOLDOWN
			Game.add_energy(8.0)
			perfect_dodged.emit()
			CombatFeedback.perfect_dodge(self)
		return false
	if since_dash < BoonEffects.dodge_grace() and perfect_dodge_cooldown <= 0.0:
		perfect_dodge_cooldown = PERFECT_DODGE_COOLDOWN
		Game.add_energy(8.0)
		perfect_dodged.emit()
		CombatFeedback.perfect_dodge(self)
		return false
	if shield_check.is_valid() and bool(shield_check.call()):
		invulnerable_timer = 0.3
		return false
	var taken: float = Game.hurt(amount)
	invulnerable_timer = Game.HURT_INVULNERABLE_SECONDS
	var recovery: float = BoonEffects.hurt_recovery()
	hurt_timer = 0.18 * recovery
	dash_timer = 0.0
	dash_invulnerable_timer = 0.0
	var away: float = signf(global_position.x - source_x) if global_position.x != source_x else float(-facing)
	velocity = Vector2(HURT_KNOCKBACK.x * away, HURT_KNOCKBACK.y) * recovery
	hurt.emit(taken)
	CombatFeedback.milo_hurt(self, taken)
	return true


## Advances Milo by one tick. Public so tests can step deterministically.
func step(input: MiloInput, delta: float) -> void:
	var was_on_floor: bool = is_on_floor()
	_tick_timers(delta)
	if was_on_floor:
		air_jumps_left = tuning.air_jumps
		if dash_cooldown_timer <= 0.0:
			dash_charges_left = tuning.dash_charges
	if input.dash_pressed and _can_dash():
		_start_dash(input)
	if is_dashing():
		_dash_step(delta)
	else:
		_run(input, delta, was_on_floor)
		_jump(input, delta, was_on_floor)
		_fall(input, delta)
		velocity += push * delta
		push = Vector2.ZERO
		var fall_speed: float = velocity.y
		_correct_corner(delta)
		_move()
		if not was_on_floor and is_on_floor():
			landed.emit(fall_speed)
	_announce_dash_ready()


## Emits dash_ready on the tick the dash comes back, so presentation can show it.
func _announce_dash_ready() -> void:
	var ready: bool = not is_dashing() and dash_cooldown_timer <= 0.0 and (dash_charges_left > 0 or is_on_floor())
	if ready and not _dash_was_ready:
		dash_ready.emit()
	_dash_was_ready = ready


func _tick_timers(delta: float) -> void:
	dash_cooldown_timer = maxf(0.0, dash_cooldown_timer - delta)
	wave_slide_timer = maxf(0.0, wave_slide_timer - delta)
	invulnerable_timer = maxf(0.0, invulnerable_timer - delta)
	dash_invulnerable_timer = maxf(0.0, dash_invulnerable_timer - delta)
	hurt_timer = maxf(0.0, hurt_timer - delta)
	perfect_dodge_cooldown = maxf(0.0, perfect_dodge_cooldown - delta)
	since_dash = 0.0 if is_dashing() else since_dash + delta
	jump_buffer_timer = maxf(0.0, jump_buffer_timer - delta)
	if drop_timer > 0.0:
		drop_timer = maxf(0.0, drop_timer - delta)
		if drop_timer == 0.0:
			set_collision_mask_value(ONE_WAY_LAYER, true)


func _can_dash() -> bool:
	return not is_dashing() and dash_charges_left > 0 and dash_cooldown_timer <= 0.0


func _start_dash(input: MiloInput) -> void:
	var direction := Vector2(input.move)
	if direction == Vector2.ZERO:
		direction = Vector2(facing, 0.0)
	dash_direction = direction.normalized()
	if dash_direction.x != 0.0:
		facing = 1 if dash_direction.x > 0.0 else -1
	dash_timer = tuning.dash_duration_seconds
	dash_cooldown_timer = tuning.dash_cooldown_seconds
	dash_charges_left -= 1
	dash_invulnerable_timer = tuning.dash_invulnerable_seconds
	jump_buffer_timer = 0.0
	dashed.emit(dash_direction)


## A Special's lunge: an invulnerable dash at its own speed.
func pounce(direction: Vector2, speed: float, seconds: float) -> void:
	dash_direction = direction.normalized()
	if dash_direction.x != 0.0:
		facing = 1 if dash_direction.x > 0.0 else -1
	dash_timer = seconds
	_dash_speed_override = speed
	invulnerable_timer = maxf(invulnerable_timer, seconds + 0.15)
	dashed.emit(dash_direction)


func _dash_step(delta: float) -> void:
	dash_timer = maxf(0.0, dash_timer - delta)
	var pouncing: bool = _dash_speed_override > 0.0
	velocity = dash_direction * (_dash_speed_override if pouncing else tuning.dash_speed)
	if dash_timer <= 0.0:
		_dash_speed_override = 0.0
	_move()
	if is_on_floor() and dash_direction.y >= tuning.waveland_min_down:
		dash_timer = 0.0
		if absf(dash_direction.x) < tuning.waveland_min_side:
			# Straight down onto the floor is just a landing: no slide, no reset.
			velocity = Vector2.ZERO
			dash_invulnerable_timer = 0.0
			return
		wave_slide_timer = tuning.waveland_duration_seconds
		velocity = Vector2(dash_direction.x * tuning.waveland_speed, 0.0)
		# A clean wavedash or waveland is the one way to skip the dash cooldown.
		# Its i-frames end at touchdown so chained wavedashes can't stay invulnerable.
		dash_cooldown_timer = 0.0
		dash_charges_left = tuning.dash_charges
		dash_invulnerable_timer = 0.0
		wavelanded.emit(absf(dash_direction.x) > 0.35)
		_dash_was_ready = true
		dash_ready.emit()
		return
	if dash_timer <= 0.0 and not pouncing:
		# Hand back control at about run speed instead of coasting at dash speed.
		velocity.x *= tuning.dash_end_speed_ratio
		if velocity.y < 0.0:
			velocity.y *= tuning.dash_end_rise_ratio


func _run(input: MiloInput, delta: float, on_floor: bool) -> void:
	var move_x: int = input.move.x
	if move_x != 0:
		var reversing: bool = velocity.x != 0.0 and signf(velocity.x) != float(move_x)
		if on_floor and reversing:
			turning_around = true
		elif not on_floor or signf(velocity.x) * velocity.x >= tuning.run_speed:
			turning_around = false
		var acceleration: float = tuning.ground_acceleration if on_floor else tuning.air_acceleration
		if turning_around:
			acceleration = tuning.turnaround_acceleration
		if on_floor and on_ice:
			acceleration *= ICE_GRIP
		velocity.x += move_x * acceleration * delta
		var cap: float = tuning.wave_slide_speed_cap if is_wave_sliding() else tuning.run_speed * BoonEffects.move_speed_multiplier()
		velocity.x = clampf(velocity.x, -cap, cap)
		facing = move_x
		return
	turning_around = false
	var friction: float = tuning.air_friction
	if is_wave_sliding():
		friction = tuning.wave_slide_friction
	elif on_floor:
		friction = tuning.ground_friction * (ICE_GRIP * 0.25 if on_ice else 1.0)
	velocity.x = move_toward(velocity.x, 0.0, friction * delta)


func _jump(input: MiloInput, delta: float, on_floor: bool) -> void:
	if input.jump_pressed:
		if input.move.y > 0 and on_floor and standing_on_one_way:
			_drop_through()
			return
		jump_buffer_timer = tuning.jump_buffer_seconds + Upgrades.value(&"training")
	if on_floor:
		coyote_timer = tuning.coyote_seconds + Upgrades.value(&"training")
	else:
		coyote_timer = maxf(0.0, coyote_timer - delta)
	if jump_buffer_timer <= 0.0:
		return
	var grounded_jump: bool = coyote_timer > 0.0
	if not grounded_jump and air_jumps_left <= 0:
		return
	if not grounded_jump:
		air_jumps_left -= 1
	velocity.y = tuning.jump_velocity
	coyote_timer = 0.0
	jump_buffer_timer = 0.0
	jumped.emit(not grounded_jump)


func _drop_through() -> void:
	drop_timer = tuning.drop_through_seconds
	set_collision_mask_value(ONE_WAY_LAYER, false)
	coyote_timer = 0.0
	velocity.y = maxf(velocity.y, 120.0)
	dropped_through.emit()


func _fall(input: MiloInput, delta: float) -> void:
	var rising_fast: bool = velocity.y < -tuning.jump_release_min_rise
	if not input.jump_held and rising_fast:
		velocity.y += tuning.jump_release_gravity * delta
	var fast_falling: bool = input.move.y > 0 and velocity.y > 30.0
	var extra: float = tuning.fast_fall_gravity if fast_falling else 0.0
	var cap: float = tuning.fast_fall_speed_cap if input.move.y > 0 else tuning.fall_speed_cap
	var gravity: float = tuning.gravity
	if input.jump_held and absf(velocity.y) < tuning.apex_hang_speed:
		gravity *= tuning.apex_hang_gravity_scale
	elif velocity.y > 0.0:
		gravity *= tuning.fall_gravity_multiplier
	velocity.y = minf(velocity.y + (gravity * RoomRules.gravity_scale() + extra) * delta, cap)


## Rising into the very edge of a ceiling nudges Milo around it instead of
## killing the jump.
func _correct_corner(delta: float) -> void:
	if tuning.corner_correction_px <= 0.0 or velocity.y >= 0.0:
		return
	var rise := Vector2(0.0, velocity.y * delta)
	if not test_move(global_transform, rise):
		return
	var first: float = float(facing) if velocity.x == 0.0 else signf(velocity.x)
	for offset: int in range(1, int(tuning.corner_correction_px) + 1):
		for side: float in [first, -first]:
			var shift := Vector2(side * offset, 0.0)
			if not test_move(global_transform, shift) and not test_move(global_transform.translated(shift), rise):
				global_position += shift
				return


func _move() -> void:
	move_and_slide()
	standing_on_one_way = false
	var iced: bool = false
	for i: int in get_slide_collision_count():
		var collision: KinematicCollision2D = get_slide_collision(i)
		var collider: Node = collision.get_collider() as Node
		if collision.get_normal().y < -0.7 and collider != null:
			standing_on_one_way = standing_on_one_way or collider.is_in_group("one_way")
			iced = iced or collider.is_in_group("ice")
	if is_on_floor():
		on_ice = iced
		_remember_safe_ground()


func _remember_safe_ground() -> void:
	var floor_body: Object = null
	for i: int in get_slide_collision_count():
		var collision: KinematicCollision2D = get_slide_collision(i)
		if collision.get_normal().y < -0.7:
			floor_body = collision.get_collider()
	if not floor_body is StaticBody2D or floor_body is AnimatableBody2D or hurt_timer > 0.0:
		return
	var space: PhysicsDirectSpaceState2D = get_world_2d().direct_space_state
	for side: float in [-26.0, 26.0]:
		var from: Vector2 = global_position + Vector2(side, -8.0)
		var query := PhysicsRayQueryParameters2D.create(from, from + Vector2(0.0, 40.0), PhysicsLayers.WORLD)
		if space.intersect_ray(query).is_empty():
			return
	safe_position = global_position


## Lava and spike pits: hurt, then put Milo back on the last safe ground.
func hazard_respawn(damage: float) -> void:
	if not controllable or Game.health <= 0.0:
		return
	var from: Vector2 = global_position
	invulnerable_timer = 0.0
	take_damage(damage, global_position.x)
	if Game.health <= 0.0:
		return
	if safe_position != Vector2.INF:
		global_position = safe_position
	velocity = Vector2.ZERO
	hurt_timer = 0.25
	dash_timer = 0.0
	dash_invulnerable_timer = 0.0
	air_jumps_left = tuning.air_jumps
	reset_physics_interpolation()
	Game.fx(&"spark", from + Vector2(0.0, -40.0), Color(1.0, 0.45, 0.15), 1.2)
