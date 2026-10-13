extends TestCase


func test_known_key_returns_text() -> void:
	check_equal(Strings.text("game.title"), "DemonDive", "game.title text")


func test_missing_key_never_shows_the_id() -> void:
	check_equal(Strings.text("no.such.key"), "", "missing key returns empty text")
