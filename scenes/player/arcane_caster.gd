class_name ArcaneCaster
extends Node2D
## Fires the Arcane Bolt from Milo's casting hand in 8 directions,
## on the ground and in the air.

signal cast(direction: Vector2)

## Hand position relative to Milo's feet when facing right and aiming forward.
const HAND_ORIGIN: Vector2 = Vector2(18.0, -76.0)
const HAND_REACH: float = 30.0
const MUZZLE_OFFSET: float = 9.0
const SPLIT_ANGLE: float = 0.16
## Somnia: echoes follow the cast this far apart, at this share of the damage.
const ECHO_DELAY: float = 0.16
const ECHO_SHARE: float = 0.5

@export var tuning: ArcaneTuning
@export var bolt_scene: PackedScene

var cooldown_timer: float = 0.0
var buffer_timer: float = 0.0
var aim: Vector2 = Vector2.RIGHT

@onready var milo: Milo = get_parent() as Milo


func _ready() -> void:
	if tuning == null:
		tuning = load("res://data/player/arcane_base.tres") as ArcaneTuning
	if bolt_scene == null:
		bolt_scene = load("res://scenes/player/arcane_bolt.tscn") as PackedScene


func _physics_process(delta: float) -> void:
	step(milo.current_input, delta)


func step(input: MiloInput, delta: float) -> void:
	cooldown_timer = maxf(0.0, cooldown_timer - delta)
	buffer_timer = maxf(0.0, buffer_timer - delta)
	if input.magic_pressed:
		buffer_timer = tuning.fire_buffer_seconds
	aim = resolve_aim(input, milo.is_on_floor(), milo.facing)
	position = hand_position(aim, milo.facing)
	var wants_fire: bool = input.magic_held or buffer_timer > 0.0
	if wants_fire and cooldown_timer <= 0.0 and not milo.is_dashing():
		fire(aim)


## 8-way aim from held directions. Down alone on the ground aims down-forward.
static func resolve_aim(input: MiloInput, on_floor: bool, facing: int) -> Vector2:
	var x: int = input.move.x
	var y: int = input.move.y
	if on_floor and y > 0 and x == 0:
		x = facing
	if x == 0 and y == 0:
		x = facing
	return Vector2(x, y).normalized()


static func hand_position(direction: Vector2, facing: int) -> Vector2:
	var origin := Vector2(HAND_ORIGIN.x * facing, HAND_ORIGIN.y)
	return origin + direction * HAND_REACH


func fire(direction: Vector2) -> ArcaneBolt:
	if direction.x != 0.0:
		milo.facing = 1 if direction.x > 0.0 else -1
		position = hand_position(direction, milo.facing)
	cooldown_timer = BoonEffects.cast_cooldown(tuning)
	buffer_timer = 0.0
	var stats: BoltStats = BoonEffects.bolt_stats(tuning)
	var bolt: ArcaneBolt = _spawn_bolt(direction, stats)
	for i: int in stats.split:
		var angle: float = SPLIT_ANGLE * (1 + i / 2) * (1.0 if i % 2 == 0 else -1.0)
		_spawn_bolt(direction.rotated(angle), stats)
	_queue_echoes(direction, stats)
	cast.emit(direction)
	Audio.play_sfx(&"arcane_cast", -8.0, 0.1)
	return bolt


## Somnia: each cast is repeated by a delayed echo, two from Lv 2 and three
## from Lv 4; from Lv 7 echoes hit as hard as the cast.
func _queue_echoes(direction: Vector2, stats: BoltStats) -> void:
	var rank: int = BoonCatalog.rank(&"somnia")
	var echoes: int = mini(3, rank)
	if echoes <= 0:
		return
	var origin: Vector2 = global_position
	var echo_stats: BoltStats = stats.duplicate_stats()
	echo_stats.damage *= 1.0 if rank >= 4 else ECHO_SHARE
	echo_stats.color = BoonCatalog.color(&"somnia")
	for i: int in echoes:
		get_tree().create_timer(ECHO_DELAY * (i + 1), false, true).timeout.connect(func() -> void:
			if is_instance_valid(milo) and milo.is_inside_tree():
				spawn_at(origin, direction, echo_stats))


func _spawn_bolt(direction: Vector2, stats: BoltStats) -> ArcaneBolt:
	return spawn_at(global_position, direction, stats)


## Fires one bolt from any point (echoes, the moon orb, the crystal clone).
func spawn_at(origin: Vector2, direction: Vector2, stats: BoltStats) -> ArcaneBolt:
	var bolt: ArcaneBolt = bolt_scene.instantiate() as ArcaneBolt
	bolt.setup_stats(direction, stats)
	bolt.global_position = origin + direction * MUZZLE_OFFSET
	milo.get_parent().add_child(bolt)
	return bolt
