class_name TestCase
extends RefCounted
## Base for headless tests. Methods named test_* run in order; they may await.

var tree: SceneTree
var failures: PackedStringArray = []


func check(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)


func check_equal(actual: Variant, expected: Variant, message: String) -> void:
	if actual != expected:
		failures.append("%s (expected %s, got %s)" % [message, str(expected), str(actual)])
