class_name ScreenFade
extends CanvasLayer
## Full-screen fade between rooms.

var _rect: ColorRect


func _ready() -> void:
	layer = 40
	process_mode = Node.PROCESS_MODE_ALWAYS
	_rect = ColorRect.new()
	_rect.color = Color(0.02, 0.0, 0.03, 1.0)
	_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_rect)


func fade_out(seconds: float) -> void:
	var tween := create_tween()
	tween.tween_property(_rect, "color:a", 1.0, seconds)
	await tween.finished


func fade_in(seconds: float) -> void:
	_rect.color.a = 1.0
	var tween := create_tween()
	tween.tween_property(_rect, "color:a", 0.0, seconds)
