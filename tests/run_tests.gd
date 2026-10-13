extends SceneTree
## Headless test runner:
##   godot --headless --path . -s tests/run_tests.gd
## Runs every test_* method in tests/test_*.gd and exits 1 if any fail.

const TEST_DIR: String = "res://tests"


func _initialize() -> void:
	_run.call_deferred()


func _run() -> void:
	await process_frame
	var passed: int = 0
	var failed: int = 0
	for file_name: String in _test_files():
		var script: GDScript = load(TEST_DIR.path_join(file_name)) as GDScript
		if script == null or not script.can_instantiate():
			failed += 1
			print("FAIL  ", file_name, " does not load")
			continue
		for method: Dictionary in script.get_script_method_list():
			var method_name: String = method["name"]
			if not method_name.begins_with("test_"):
				continue
			var test: TestCase = script.new() as TestCase
			test.tree = self
			await test.call(method_name)
			var label: String = "%s::%s" % [file_name.get_basename(), method_name]
			if test.failures.is_empty():
				passed += 1
				print("PASS  ", label)
			else:
				failed += 1
				print("FAIL  ", label)
				for failure: String in test.failures:
					print("      ", failure)
	print("\n%d passed, %d failed" % [passed, failed])
	quit(1 if failed > 0 else 0)


func _test_files() -> PackedStringArray:
	var files: PackedStringArray = []
	for file_name: String in DirAccess.get_files_at(TEST_DIR):
		if file_name.begins_with("test_") and file_name.ends_with(".gd") and file_name != "test_case.gd":
			files.append(file_name)
	files.sort()
	return files
