extends Node2D
## Milestone 1 test room: platforms at several heights, a solid block,
## one-way ledges and practice targets. F2 switches between the 2D
## placeholder look and the 3D look test.

@onready var milo: Milo = $Milo
@onready var tuning_panel: DebugTuningPanel = $DebugTuningPanel
@onready var controls_hint: Label = $Hud/ControlsHint
@onready var game_camera: GameCamera = $Camera

var _reversal: ReversalTimer = ReversalTimer.new()
var _view_3d: RoomView3D


func _ready() -> void:
	controls_hint.text = Strings.text("hint.controls")
	if is_instance_valid(tuning_panel):
		tuning_panel.bind(milo)
	for dummy: Node in get_tree().get_nodes_in_group("hurtbox"):
		(dummy as TargetDummy).hit.connect(_on_target_hit.bind(dummy))
	_view_3d = RoomView3D.new()
	add_child(_view_3d)
	_view_3d.build(self, game_camera)
	_set_look_3d(true)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("look_toggle"):
		_set_look_3d(not RoomView3D.active)
		get_viewport().set_input_as_handled()


func _set_look_3d(on: bool) -> void:
	_view_3d.set_active(on)
	$Background.visible = not on
	(milo.get_node("Feedback") as CanvasItem).visible = not on
	for child: Node in get_children():
		var visual := child.get_node_or_null("Visual") as CanvasItem
		if visual != null:
			visual.visible = not on
	for node: Node in get_tree().get_nodes_in_group("hurtbox"):
		(node as CanvasItem).visible = not on
	for node: Node in get_tree().get_nodes_in_group("arcane_bolt"):
		(node as CanvasItem).visible = not on


func _physics_process(delta: float) -> void:
	_reversal.update(milo, delta)
	Debug.watch("debug.profile", milo.tuning.profile_name)
	Debug.watch("debug.player_velocity", milo.velocity.round())
	Debug.watch("debug.on_floor", milo.is_on_floor())
	Debug.watch("debug.last_reversal", "%.3f s" % _reversal.last_seconds if _reversal.last_seconds > 0.0 else "-")


func _on_target_hit(_amount: float, broke: bool, dummy: TargetDummy) -> void:
	var direction: Vector2 = (dummy.global_position - milo.global_position).normalized()
	if broke:
		Audio.play_sfx(&"target_break", -4.0)
		GameCamera.impact_in(get_tree(), GameCamera.Tier.HEAVY, direction)
	else:
		Audio.play_sfx(&"arcane_hit", -3.0)
		GameCamera.impact_in(get_tree(), GameCamera.Tier.HIT, direction)
