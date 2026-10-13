class_name Lobber
extends Enemy
## Area denial: plants itself, swells, and lobs a high arcing glob that
## lands where Milo is standing. Keeps him moving between platforms.


func _setup() -> void:
	kind = &"lobber"
	size = Vector2(90.0, 84.0)
	max_health = 60.0
	contact_damage = 10.0
	knock_taken = 0.4


func _think(delta: float) -> void:
	apply_gravity(delta)
	velocity.x = move_toward(velocity.x, 0.0, 1200.0 * delta)
	if think_timer > 0.0:
		return
	if attack_pose != &"windup":
		set_pose(&"windup", 0.55)
		think_timer = 0.55
		return
	var target: Milo = milo()
	if target == null:
		return
	# Solve a lob that peaks above both and lands on Milo after `flight` seconds.
	var from: Vector2 = center() + Vector2(facing * 20.0, -30.0)
	var flight: float = clampf(absf(target.global_position.x - from.x) / 420.0, 0.7, 1.5)
	var gravity: float = 1400.0
	var to: Vector2 = target.global_position + Vector2(0.0, -30.0)
	var v := Vector2((to.x - from.x) / flight, (to.y - from.y - 0.5 * gravity * flight * flight) / flight)
	var glob: EnemyShot = shoot(v.normalized(), v.length() * speed_scale, 13.0, shot_color(Color(0.6, 1.0, 0.3)), 15.0)
	glob.global_position = from
	glob.gravity_force = gravity * speed_scale * speed_scale
	set_pose(&"attack", 0.35)
	think_timer = rng.randf_range(1.7, 2.3)
