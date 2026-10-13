class_name MiloInput
extends RefCounted
## One physics tick of player intent. Built from the input map in play,
## or by hand in tests.

const STICK_THRESHOLD: float = 0.5

## x: -1 left, 1 right. y: -1 up, 1 down.
var move: Vector2i = Vector2i.ZERO
var jump_held: bool = false
var jump_pressed: bool = false
var dash_pressed: bool = false
var magic_held: bool = false
var magic_pressed: bool = false
var special_pressed: bool = false
var interact_pressed: bool = false
var up_pressed: bool = false


static func from_actions() -> MiloInput:
	var input := MiloInput.new()
	input.move = Vector2i(
		_digital(Input.get_axis("move_left", "move_right")),
		_digital(Input.get_axis("move_up", "move_down")))
	input.jump_held = Input.is_action_pressed("jump")
	input.jump_pressed = Input.is_action_just_pressed("jump")
	input.dash_pressed = Input.is_action_just_pressed("dash")
	input.magic_held = Input.is_action_pressed("magic")
	input.magic_pressed = Input.is_action_just_pressed("magic")
	input.special_pressed = Input.is_action_just_pressed("special")
	input.interact_pressed = Input.is_action_just_pressed("interact")
	input.up_pressed = Input.is_action_just_pressed("move_up")
	return input


static func make(move_x: int = 0, move_y: int = 0) -> MiloInput:
	var input := MiloInput.new()
	input.move = Vector2i(move_x, move_y)
	return input


func with_jump(pressed: bool = true) -> MiloInput:
	jump_held = true
	jump_pressed = pressed
	return self


func with_dash() -> MiloInput:
	dash_pressed = true
	return self


func with_magic(pressed: bool = true) -> MiloInput:
	magic_held = true
	magic_pressed = pressed
	return self


static func _digital(value: float) -> int:
	if value >= STICK_THRESHOLD:
		return 1
	if value <= -STICK_THRESHOLD:
		return -1
	return 0
