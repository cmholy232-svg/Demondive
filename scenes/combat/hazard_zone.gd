class_name HazardZone
extends Area2D
## Rectangle that hurts Milo while he touches it. Room hazards (spikes,
## lava) are always live. Boss attacks start with a warning phase the player
## can read, then hurt for a short active window, then vanish.

const GROUP: StringName = &"hazards"

## spikes, lava, pour, bite, temptation, shockwave...
var kind: StringName = &"spikes"
var rect: Rect2 = Rect2()
var damage: float = 14.0
var warn_seconds: float = 0.0
var active_seconds: float = -1.0
var color: Color = Color(1.0, 0.3, 0.4)
var age: float = 0.0


static func make(new_kind: StringName, area: Rect2, amount: float, warn: float = 0.0, active: float = -1.0) -> HazardZone:
	var zone := HazardZone.new()
	zone.kind = new_kind
	zone.rect = area
	zone.damage = amount
	zone.warn_seconds = warn
	zone.active_seconds = active
	return zone


func _ready() -> void:
	add_to_group(GROUP)
	collision_layer = 0
	collision_mask = PhysicsLayers.PLAYER
	monitorable = false
	position = rect.get_center()
	var shape := CollisionShape2D.new()
	var box := RectangleShape2D.new()
	box.size = rect.size
	shape.shape = box
	add_child(shape)


func is_warning() -> bool:
	return age < warn_seconds


func is_live() -> bool:
	return not is_warning() and (active_seconds < 0.0 or age < warn_seconds + active_seconds)


## 0 at the start of the warning, 1 when it becomes dangerous.
func warning_progress() -> float:
	return 1.0 if warn_seconds <= 0.0 else clampf(age / warn_seconds, 0.0, 1.0)


func _physics_process(delta: float) -> void:
	age += delta
	if active_seconds >= 0.0 and age >= warn_seconds + active_seconds:
		queue_free()
		return
	if not is_live():
		return
	for body: Node2D in get_overlapping_bodies():
		var target := body as Milo
		if target == null:
			continue
		if kind == &"lava" and target.velocity.y > 0.0:
			target.velocity.y = -1000.0
		target.take_damage(damage, global_position.x)
