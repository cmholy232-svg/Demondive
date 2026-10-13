class_name DamageNumber
extends Label
## Short floating damage number. Never stacks into piles: numbers on the
## same target replace the previous one.

const LIFE_SECONDS: float = 0.55
const RISE_SPEED: float = 90.0

var _age: float = 0.0


static func spawn(owner_node: Node, at: Vector2, amount: float, broke: bool, critical: bool = false) -> void:
	if owner_node.has_meta("damage_number"):
		var existing: Object = owner_node.get_meta("damage_number")
		if is_instance_valid(existing):
			(existing as Node).queue_free()
	var number := DamageNumber.new()
	number.text = Strings.text("combat.ko") if broke else str(roundi(amount))
	number.add_theme_font_size_override("font_size", 26 if broke or critical else 20)
	var tint: Color = Color(1.0, 0.85, 0.35) if broke else (Color(1.0, 0.45, 0.6) if critical else Color.WHITE)
	number.add_theme_color_override("font_color", tint)
	number.add_theme_color_override("font_outline_color", Color.BLACK)
	number.add_theme_constant_override("outline_size", 5)
	number.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	number.size = Vector2(80.0, 30.0)
	number.position = at - number.size * 0.5
	number.z_index = 50
	owner_node.get_parent().add_child(number)
	owner_node.set_meta("damage_number", number)


func _process(delta: float) -> void:
	_age += delta
	position.y -= RISE_SPEED * delta
	modulate.a = 1.0 - clampf((_age - LIFE_SECONDS * 0.5) / (LIFE_SECONDS * 0.5), 0.0, 1.0)
	if _age >= LIFE_SECONDS:
		queue_free()
