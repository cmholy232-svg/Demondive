class_name Icicle
extends Node2D
## Hangs from the ceiling. When Milo walks underneath it shivers, then drops
## a heavy shard a beat later, so the danger arrives after he has moved on
## unless he keeps going. Regrows after a few seconds.

const TRIGGER_X: float = 90.0
const SHIVER: float = 0.55
const REGROW: float = 4.5

var state: StringName = &"ready"
var timer: float = 0.0


func _physics_process(delta: float) -> void:
	match state:
		&"ready":
			var milo := get_tree().get_first_node_in_group(&"milo") as Milo
			if milo != null and absf(milo.global_position.x - global_position.x) < TRIGGER_X and milo.global_position.y > global_position.y:
				state = &"shiver"
				timer = SHIVER
				Audio.play_sfx(&"boss_windup", -12.0, 0.2)
		&"shiver":
			timer -= delta
			if timer <= 0.0:
				var shard := EnemyShot.new()
				shard.setup(Vector2(0.0, 200.0), 16.0, 16.0, Color(0.7, 0.92, 1.0))
				shard.gravity_force = 2600.0
				shard.position = global_position + Vector2(0.0, 30.0)
				get_parent().add_child(shard)
				state = &"gone"
				timer = REGROW
		&"gone":
			timer -= delta
			if timer <= 0.0:
				state = &"ready"


## 0..1 shake amount for the view.
func shiver() -> float:
	return 1.0 - timer / SHIVER if state == &"shiver" else 0.0
