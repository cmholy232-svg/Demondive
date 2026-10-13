extends Node
## All player-facing text goes through here. Never put raw IDs on screen.

const STRINGS_PATH: String = "res://data/strings/en.json"

var _table: Dictionary = {}


func _ready() -> void:
	load_table(STRINGS_PATH)


func load_table(path: String) -> void:
	_table.clear()
	var file: FileAccess = FileAccess.open(path, FileAccess.READ)
	if file == null:
		push_error("Strings: could not open %s" % path)
		return
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if parsed is Dictionary:
		_table = parsed
	else:
		push_error("Strings: %s is not a JSON object" % path)


## Returns the text for key. A missing key returns an empty string, so a typo
## never leaks an internal ID to the player; it is reported as a warning instead.
func text(key: String) -> String:
	if _table.has(key):
		return str(_table[key])
	push_warning("Strings: missing key '%s'" % key)
	return ""


func has_key(key: String) -> bool:
	return _table.has(key)
