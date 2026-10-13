extends TestCase
## Guards for CLAUDE.md rules that a script can check.

const MAX_LINES: int = 400


func test_no_script_over_400_lines() -> void:
	for path: String in _scripts("res://"):
		var lines: int = FileAccess.get_file_as_string(path).count("\n")
		check(lines <= MAX_LINES, "%s has %d lines" % [path, lines])


func test_every_strings_key_used_in_code_exists() -> void:
	var regex := RegEx.create_from_string("(?:Strings\\.text|Debug\\.watch)\\(\"([^\"]+)\"")
	for path: String in _scripts("res://"):
		for found: RegExMatch in regex.search_all(FileAccess.get_file_as_string(path)):
			var key: String = found.get_string(1)
			check(Strings.has_key(key), "%s uses missing string key '%s'" % [path, key])


func _scripts(dir: String) -> PackedStringArray:
	var found: PackedStringArray = []
	for sub: String in DirAccess.get_directories_at(dir):
		if sub.begins_with(".") or sub == "tests":
			continue
		found.append_array(_scripts(dir.path_join(sub)))
	for file: String in DirAccess.get_files_at(dir):
		if file.ends_with(".gd"):
			found.append(dir.path_join(file))
	return found
