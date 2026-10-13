## Headless Hellroom check: title, hub (prologue beats), every station panel,
## an upgrade purchase, an outfit change, then the dive into Level 1.
## Run: godot --headless --path . -s tools/smoke/hub_flow.gd
extends SceneTree
var impl: RefCounted
func _initialize() -> void:
	impl = (load("res://tools/smoke/hub_flow_impl.gd") as GDScript).new()
	impl.call("go", self)
