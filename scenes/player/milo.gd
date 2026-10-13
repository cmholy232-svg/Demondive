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

## Milo's placeholder is 128 px tall; see docs/design.md (art pipeline) for the final size.
const HEIGHT: float = 128.0
const ONE_WAY_LAYER: int = 6
const HURT_KNOCKBACK: Vector2 = Vector2(420.0, -520.0)
const PERFECT_DODGE_COOLDOWN: float = 0.7

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
var drop_timer: float = 0.0
var standing_on_one_way: bool = false
## True from the moment input opposes velocity on the ground until full speed the other way.
var turning_around: bool = false
## Seconds of hit stun after taking damage, during which input is ignored.
var hurt_timer: float = 0.0
var perfect_dodge_cooldown: float = 0.0
## False while a cutscene, menu or death animation owns Milo.
var controllable: bool = true


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


func is_dashing() -> bool:
	return dash_timer > 0.0


func is_invulnerable() -> bool:
	return invulnerable_timer > 0.0


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
	var taken: float = Game.hurt(amount)
	invulnerable_timer = Game.HURT_INVULNERABLE_SECONDS
	hurt_timer = 0.18
	dash_timer = 0.0
	var away: float = signf(global_position.x - source_x) if global_position.x != source_x else float(-facing)
	velocity = Vector2(HURT_KNOCKBACK.x * away, HURT_KNOCKBACK.y)
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
		return
	_run(input, delta, was_on_floor)
	_jump(input, delta, was_on_floor)
	_fall(input, delta)
	var fall_speed: float = velocity.y
	_move()
	if not was_on_floor and is_on_floor():
		landed.emit(fall_speed)


func _tick_timers(delta: float) -> void:
	dash_cooldown_timer = maxf(0.0, dash_cooldown_timer - delta)
	wave_slide_timer = maxf(0.0, wave_slide_timer - delta)
	invulnerable_timer = maxf(0.0, invulnerable_timer - delta)
	hurt_timer = maxf(0.0, hurt_timer - delta)
	perfect_dodge_cooldown = maxf(0.0, perfect_dodge_cooldown - delta)
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
	invulnerable_timer = maxf(invulnerable_timer, tuning.dash_invulnerable_seconds)
	jump_buffer_timer = 0.0
	dashed.emit(dash_direction)


func _dash_step(delta: float) -> void:
	dash_timer = maxf(0.0, dash_timer - delta)
	velocity = dash_direction * tuning.dash_speed
	_move()
	if is_on_floor() and dash_direction.y >= tuning.waveland_min_down:
		dash_timer = 0.0
		wave_slide_timer = tuning.waveland_duration_seconds
		velocity = Vector2(dash_direction.x * tuning.waveland_speed, 0.0)
		wavelanded.emit(absf(dash_direction.x) > 0.35)


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
		friction = tuning.ground_friction
	velocity.x = move_toward(velocity.x, 0.0, friction * delta)


func _jump(input: MiloInput, delta: float, on_floor: bool) -> void:
	if input.jump_pressed:
		if input.move.y > 0 and on_floor and standing_on_one_way:
			_drop_through()
			return
		jump_buffer_timer = tuning.jump_buffer_seconds
	if on_floor:
		coyote_timer = tuning.coyote_seconds
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
	velocity.y = minf(velocity.y + (tuning.gravity + extra) * delta, cap)


func _move() -> void:
	move_and_slide()
	standing_on_one_way = false
	for i: int in get_slide_collision_count():
		var collision: KinematicCollision2D = get_slide_collision(i)
		var collider: Node = collision.get_collider() as Node
		if collision.get_normal().y < -0.7 and collider != null and collider.is_in_group("one_way"):
			standing_on_one_way = true
