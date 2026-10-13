extends TestCase

const ACTIONS: PackedStringArray = [
	"move_left", "move_right", "move_up", "move_down",
	"jump", "magic", "special", "dash", "interact", "pause", "debug_toggle",
]


func test_physics_runs_at_60_hz_with_interpolation() -> void:
	check_equal(Engine.physics_ticks_per_second, 60, "physics tick rate")
	check(ProjectSettings.get_setting("physics/common/physics_interpolation"), "physics interpolation on")


func test_every_action_has_bindings() -> void:
	for action: String in ACTIONS:
		check(InputMap.has_action(action), "action %s exists" % action)
		if InputMap.has_action(action):
			check(not InputMap.action_get_events(action).is_empty(), "action %s has bindings" % action)


func test_debug_overlay_starts_hidden() -> void:
	check(not Debug.overlay_visible, "debug overlay hidden at start")
