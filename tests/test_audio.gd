extends TestCase
## Music, sound and dialogue carried over from Alpha 8.2 are all present and
## wired: every track and beat a level names exists, every sound the code
## plays has a file, and the arcane harmony follows the Alpha rules.

const LEVELS_PATH: String = "res://data/levels/levels.json"
const BEATS_PATH: String = "res://data/dialogue/beats.json"
## Caged boon-givers the Alpha never wrote a rescue scene for. Their rescue
## plays no dialogue until Chris writes or approves one.
const UNWRITTEN_RESCUES: Array[String] = ["luna", "solara", "aurelia", "noctissa", "seraphine"]


func _json(path: String) -> Variant:
	return JSON.parse_string(FileAccess.get_file_as_string(path))


## Level configs in order, from levels.json's "1".."9" keys.
func _levels() -> Array:
	var data: Dictionary = _json(LEVELS_PATH) as Dictionary
	var levels: Array = []
	for number: int in range(1, data.size() + 1):
		levels.append(data.get(str(number), {}))
	return levels


func test_every_level_track_exists() -> void:
	check_equal(_levels().size(), 9, "nine levels")
	for level: Variant in _levels():
		var music: Dictionary = (level as Dictionary).get("music", {}) as Dictionary
		for key: String in ["explore", "miniboss", "boss"]:
			check(music.has(key), "level %s names a %s track" % [str((level as Dictionary).get("dir", "?")), key])
		for track: Variant in music.values():
			check(ResourceLoader.exists("res://audio/music/%s.ogg" % str(track)), "music file %s exists" % str(track))


func test_hub_title_and_victory_tracks_exist() -> void:
	for track: String in ["hub", "title", "victory"]:
		check(ResourceLoader.exists("res://audio/music/%s.ogg" % track), "music file %s exists" % track)


func test_the_hollow_has_a_final_phase_track() -> void:
	var levels: Array = _levels()
	check_equal(levels.size(), 9, "nine levels")
	if levels.is_empty():
		return
	var last: Dictionary = levels.back() as Dictionary
	var music: Dictionary = last.get("music", {}) as Dictionary
	check_equal(str(music.get("boss", "")), "self_below_mirror", "Hollow opens on Mirror Self")
	check_equal(str(music.get("final", "")), "self_below_boss", "Hollow's last phase plays the final fight")


func test_every_level_beat_exists() -> void:
	var beats: Dictionary = _json(BEATS_PATH) as Dictionary
	for level: Variant in _levels():
		for key: String in ["entrance_beat", "miniboss_beat", "boss_beat", "aftermath_beat"]:
			var beat: String = str((level as Dictionary).get(key, ""))
			if beat != "":
				check(beats.has(beat), "dialogue beat %s exists" % beat)
		for boon: Variant in (level as Dictionary).get("cages", []):
			if not UNWRITTEN_RESCUES.has(str(boon)):
				check(beats.has("rescue_%s" % str(boon)), "rescue beat for %s exists" % str(boon))


func test_every_dialogue_line_has_a_speaker_and_text() -> void:
	var beats: Dictionary = _json(BEATS_PATH) as Dictionary
	check_equal(beats.size(), 44, "all 44 Alpha dialogue scenes are present")
	var lines: int = 0
	for beat: Variant in beats.values():
		for line: Variant in (beat as Dictionary).get("lines", []):
			lines += 1
			check(str((line as Dictionary).get("speaker", "")) != "", "line %s has a speaker" % str((line as Dictionary).get("id")))
			check(str((line as Dictionary).get("text", "")) != "", "line %s has text" % str((line as Dictionary).get("id")))
	check_equal(lines, 131, "all 131 Alpha dialogue lines are present")


func test_every_sound_the_code_plays_exists() -> void:
	var pattern := RegEx.create_from_string("play_sfx(?:_pitched)?\\(&\"([a-z0-9_]+)\"")
	var ids: Dictionary = {}
	for dir: String in ["res://scenes", "res://autoload"]:
		_collect_sfx(dir, pattern, ids)
	for id: Variant in ((Audio.mix.get("sfx", {}) as Dictionary).keys()):
		ids[str(id)] = true
	check(ids.size() > 20, "found the sounds the game plays")
	for id: Variant in ids.keys():
		check(ResourceLoader.exists("res://audio/sfx/sfx_%s.wav" % str(id)), "sound file for %s exists" % str(id))


func _collect_sfx(dir: String, pattern: RegEx, ids: Dictionary) -> void:
	for sub: String in DirAccess.get_directories_at(dir):
		_collect_sfx(dir.path_join(sub), pattern, ids)
	for file: String in DirAccess.get_files_at(dir):
		if file.ends_with(".gd"):
			for found: RegExMatch in pattern.search_all(FileAccess.get_file_as_string(dir.path_join(file))):
				ids[found.get_string(1)] = true


func test_every_boon_has_a_note_and_a_sound() -> void:
	check_equal(ArcaneHarmony.NOTE_SEMITONES.size(), 20, "twenty boon notes")
	for id: Variant in ArcaneHarmony.NOTE_SEMITONES.keys():
		check(ResourceLoader.exists("res://audio/sfx/boons/sfx_boon_%s.wav" % str(id)), "boon sound for %s exists" % str(id))


func test_harmony_tiers_follow_total_stacks() -> void:
	check_equal(ArcaneHarmony.tier({}), 1, "no boons is a dry blast")
	check_equal(ArcaneHarmony.tier({&"pyrra": 2}), 2, "2 stacks awaken")
	check_equal(ArcaneHarmony.tier({&"pyrra": 3, &"maris": 2}), 3, "5 stacks charge")
	check_equal(ArcaneHarmony.tier({&"pyrra": 8}), 4, "8 stacks ascend")
	check_equal(ArcaneHarmony.tier({&"pyrra": 6, &"luna": 6}), 5, "12 stacks unbind")


func test_harmony_notes_are_d_minor() -> void:
	check(is_equal_approx(ArcaneHarmony.pitch_for(&"pyrra", 0, 0), 1.0), "Pyrra is the root D")
	check(is_equal_approx(ArcaneHarmony.pitch_for(&"maris", 0, 0), pow(2.0, 3.0 / 12.0)), "Maris is F, a minor third up")
	check(is_equal_approx(ArcaneHarmony.pitch_for(&"voltara", 0, 0), 1.0), "Voltara is D an octave up, folded")
	check(ArcaneHarmony.pitch_for(&"flora", 0, 1) < 1.0, "voicing 1 folds high notes down")


func test_featured_boon_leads_the_chord() -> void:
	var stacks: Dictionary = {&"pyrra": 1, &"maris": 1, &"gaia": 1, &"luna": 2}
	var sung: Array[StringName] = ArcaneHarmony.voices(stacks, 0, 7, &"luna")
	check(not sung.is_empty() and sung[0] == &"luna", "the newest boon leads")
	check(sung.size() <= 4, "never more voices than boons held")
	check(ArcaneHarmony.voices({}, 0, 7).is_empty(), "no boons sing nothing")


func test_sound_repeats_inside_the_gap_are_dropped() -> void:
	var stream: AudioStream = load("res://audio/sfx/sfx_milo_hurt.wav") as AudioStream
	check(Audio._admit(&"milo_hurt", stream), "first hurt sound plays")
	check(not Audio._admit(&"milo_hurt", stream), "a second hurt sound in the same instant is dropped")
