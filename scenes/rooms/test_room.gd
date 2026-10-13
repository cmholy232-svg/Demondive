extends Node2D
## Milestone 1 test room: platforms at several heights, a solid block,
## one-way ledges and practice targets.

@onready var milo: Milo = $Milo
@onready var tuning_panel: DebugTuningPanel = $DebugTuningPanel
@onready var controls_hint: Label = $Hud/ControlsHint

var _reversal: ReversalTimer = ReversalTimer.new()


func _ready() -> void:
	controls_hint.text = Strings.text("hint.controls")
	if is_instance_valid(tuning_panel):
		tuning_panel.bind(milo)
	for dummy: Node in get_tree().get_nodes_in_group("hurtbox"):
		(dummy as TargetDummy).hit.connect(_on_target_hit.bind(dummy))


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
