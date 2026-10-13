## Headless Level 1 playthrough (seed 42): kills each wave, takes every reward
## and walks through every door to the results screen.
## Run: godot --headless --path . -s tools/smoke/level_run.gd
extends SceneTree
var impl: RefCounted
func _initialize() -> void:
	impl = (load("res://tools/smoke/level_run_impl.gd") as GDScript).new()
	impl.call("go", self)
