extends Node
## Top of the game: title screen, then the Hellroom and dives, forever.

const RUN_SCRIPT: GDScript = preload("res://scenes/run/run.gd")

var _current: Node


func _ready() -> void:
	Store.restore()
	add_child(TouchControls.new())
	_show_title()


func _show_title() -> void:
	var title := TitleScreen.new()
	title.play_pressed.connect(_show_hub)
	_swap(title)
	Audio.play_music(&"title")


func _show_hub() -> void:
	var hub := Hub.new()
	hub.dive_requested.connect(_start_run)
	_swap(hub)


func _start_run() -> void:
	Game.start_run()
	Game.add_boon(Save.starting_boon())
	var run: Run = RUN_SCRIPT.new() as Run
	run.finished.connect(func(_won: bool) -> void: _show_hub.call_deferred())
	_swap(run)


func _swap(next: Node) -> void:
	if _current != null:
		_current.queue_free()
	get_tree().paused = false
	RoomView3D.active = false
	_current = next
	add_child(next)
