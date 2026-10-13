extends Node
## Top of the game: title screen, then the Hellroom and dives, forever.

const RUN_SCRIPT: GDScript = preload("res://scenes/run/run.gd")

var _current: Node


func _ready() -> void:
	_show_title()


func _show_title() -> void:
	var title := TitleScreen.new()
	title.play_pressed.connect(_start_run)
	_swap(title)
	Audio.play_music(&"title")


func _start_run() -> void:
	Game.start_run()
	var run: Run = RUN_SCRIPT.new() as Run
	run.finished.connect(func(_won: bool) -> void: _show_title.call_deferred())
	_swap(run)


func _swap(next: Node) -> void:
	if _current != null:
		_current.queue_free()
	RoomView3D.active = false
	_current = next
	add_child(next)
