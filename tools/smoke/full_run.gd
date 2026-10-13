## Headless whole-game playthrough (seed from the command line, default 7):
## kills every wave, takes every reward and walks every door from Level 1 to
## the results screen, printing each room. Milo is kept alive.
## Run: godot --headless --path . -s tools/smoke/full_run.gd -- 7
extends SceneTree
var impl: RefCounted
func _initialize() -> void:
	impl = (load("res://tools/smoke/full_run_impl.gd") as GDScript).new()
	impl.call("go", self)
