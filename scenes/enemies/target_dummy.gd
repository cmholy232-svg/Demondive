class_name TargetDummy
extends Area2D
## Practice target for Milestone 1. Takes hits, flashes, shows the damage,
## breaks at zero health and comes back a moment later.

signal hit(amount: float, broke: bool)

const FLASH_SECONDS: float = 0.08
const RESPAWN_SECONDS: float = 1.2
const SIZE: Vector2 = Vector2(56.0, 96.0)

@export var max_health: float = 120.0

var health: float = 0.0
var _flash_timer: float = 0.0
var _respawn_timer: float = 0.0
var _wobble: float = 0.0


func _ready() -> void:
	health = max_health
	add_to_group("hurtbox")


func is_broken() -> bool:
	return _respawn_timer > 0.0


func take_hit(amount: float, direction: Vector2) -> void:
	if is_broken():
		return
	health -= amount
	_flash_timer = FLASH_SECONDS
	_wobble = 6.0 * signf(direction.x if direction.x != 0.0 else 1.0)
	var broke: bool = health <= 0.0
	if broke:
		_respawn_timer = RESPAWN_SECONDS
		set_deferred("monitorable", false)
	DamageNumber.spawn(self, global_position + Vector2(0.0, -SIZE.y - 8.0), amount, broke)
	hit.emit(amount, broke)
	queue_redraw()


func _physics_process(delta: float) -> void:
	_flash_timer = maxf(0.0, _flash_timer - delta)
	_wobble = move_toward(_wobble, 0.0, 60.0 * delta)
	if _respawn_timer > 0.0:
		_respawn_timer = maxf(0.0, _respawn_timer - delta)
		if _respawn_timer == 0.0:
			health = max_health
			monitorable = true
	queue_redraw()


func _draw() -> void:
	if is_broken():
		draw_rect(Rect2(-SIZE.x * 0.5, -12.0, SIZE.x, 12.0), Color(0.45, 0.25, 0.25))
		return
	var body := Rect2(-SIZE.x * 0.5 + _wobble, -SIZE.y, SIZE.x, SIZE.y)
	var color := Color.WHITE if _flash_timer > 0.0 else Color(0.85, 0.3, 0.35)
	draw_rect(body, color)
	draw_rect(Rect2(body.position + Vector2(10.0, 18.0), Vector2(SIZE.x - 20.0, 10.0)), Color(0.2, 0.08, 0.1))
	var ratio: float = clampf(health / max_health, 0.0, 1.0)
	draw_rect(Rect2(-SIZE.x * 0.5, 6.0, SIZE.x, 5.0), Color(0.15, 0.1, 0.15))
	draw_rect(Rect2(-SIZE.x * 0.5, 6.0, SIZE.x * ratio, 5.0), Color(1.0, 0.75, 0.3))
