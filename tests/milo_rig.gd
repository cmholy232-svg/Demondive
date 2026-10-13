class_name MiloRig
extends RefCounted
## Loads the test room and steps Milo by hand, one 60 Hz tick at a time,
## so movement tests are exact and fast.

const TICK: float = 1.0 / 60.0

var room: Node2D
var milo: Milo
var caster: ArcaneCaster


static func create(tree: SceneTree, profile_path: String = "res://data/player/movement_v2.tres") -> MiloRig:
	var rig := MiloRig.new()
	rig.room = (load("res://scenes/rooms/test_room.tscn") as PackedScene).instantiate() as Node2D
	tree.root.add_child(rig.room)
	rig.milo = rig.room.get_node("Milo") as Milo
	rig.caster = rig.milo.get_node("ArcaneCaster") as ArcaneCaster
	rig.milo.tuning = (load(profile_path) as MovementTuning).duplicate() as MovementTuning
	rig.milo.set_physics_process(false)
	rig.caster.set_physics_process(false)
	return rig


## Puts Milo at a spot and lets him settle onto whatever is below.
func place(at: Vector2) -> void:
	milo.global_position = at
	milo.velocity = Vector2.ZERO
	run(MiloInput.make(), 30)


func tick(input: MiloInput) -> void:
	milo.current_input = input
	milo.step(input, TICK)
	caster.step(input, TICK)


## Holds the same input for n ticks. Press flags only count on the first tick.
func run(input: MiloInput, ticks: int) -> void:
	for i: int in ticks:
		tick(input)
		if i == 0:
			input = _held_copy(input)


func free_room() -> void:
	room.queue_free()


static func _held_copy(input: MiloInput) -> MiloInput:
	var held := MiloInput.make(input.move.x, input.move.y)
	held.jump_held = input.jump_held
	held.magic_held = input.magic_held
	return held
