class_name ArcaneHarmony
extends RefCounted
## Milo's cast sound, ported from Alpha 8.2's arcane audio: one D-minor blast,
## plus a pitched copy of a harmonic sample for each boon held. Every boon
## owns a note of D natural minor, so a build is heard as a chord that grows
## from a dry blast (tier 1) to a seven-voice "unbound" chord (tier 5).
## Sound only: nothing here touches damage or timing.

## Semitones above D3 for each boon-giver (D natural minor, about three octaves).
const NOTE_SEMITONES: Dictionary = {
	&"pyrra": 0, &"maris": 3, &"gaia": 5, &"zephyra": 7, &"flora": 10,
	&"voltara": 12, &"crya": 14, &"luna": 15, &"solara": 17, &"belladonna": 19,
	&"nerissa": 22, &"roxyne": 24, &"calyptra": 26, &"isolde": 27, &"somnia": 29,
	&"vespera": 31, &"aurelia": 34, &"noctissa": 36, &"lilith": 38, &"seraphine": 39,
}
## Harmony voices added to an ordinary cast, by tier (index 0 unused).
const VOICES_BY_TIER: Array[int] = [0, 0, 1, 2, 3, 4]
const BLAST_DB: float = -8.0
const REVEAL_STAGGER: float = 0.034

## The boon taken most recently; it leads the chord.
static var featured: StringName = &""
static var _shots: int = 0


## 1 (dry) to 5 (unbound) from the total boon stacks held.
static func tier(stacks: Dictionary) -> int:
	var total: int = _total(stacks)
	if total >= 12:
		return 5
	if total >= 8:
		return 4
	if total >= 5:
		return 3
	if total >= 2:
		return 2
	return 1


## Which boons sing on this shot: rotates through the build so repeated casts
## don't sound identical, with the featured boon first.
static func voices(stacks: Dictionary, shot_index: int, max_voices: int, lead: StringName = &"") -> Array[StringName]:
	var active: Array[StringName] = []
	for id: Variant in NOTE_SEMITONES.keys():
		if int(stacks.get(id, 0)) > 0:
			active.append(id as StringName)
	if active.is_empty():
		return active
	var total: int = _total(stacks)
	var count: int = mini(mini(active.size(), max_voices), maxi(1, 1 + int(floor(log(float(total + 1)) / log(2.0)))))
	var start: int = posmod(shot_index, active.size())
	var ordered: Array[StringName] = []
	for i: int in active.size():
		ordered.append(active[(start + i) % active.size()])
	if lead != &"" and ordered.has(lead):
		ordered.erase(lead)
		ordered.push_front(lead)
	return ordered.slice(0, count)


## Playback rate that turns the harmonic sample into this boon's note. Three
## run voicings fold some notes down an octave so runs don't all sound alike.
static func pitch_for(id: StringName, voice_index: int, voicing: int) -> float:
	var pitch_class: int = int(NOTE_SEMITONES.get(id, 0)) % 12
	var semitones: int = pitch_class
	if voicing == 1 and pitch_class >= 8:
		semitones -= 12
	if voicing == 2 and voice_index % 3 == 2 and pitch_class >= 5:
		semitones -= 12
	return clampf(pow(2.0, semitones / 12.0), 0.62, 1.9)


## Every cast: the blast, and on every second or third shot a few harmony voices.
static func cast() -> void:
	var stacks: Dictionary = _stacks()
	var shot: int = _shots
	_shots += 1
	var voicing: int = _voicing()
	var micro: Array[float] = [0.992, 1.0, 1.008]
	Audio.play_sfx_pitched(&"arcane_cast", BLAST_DB, micro[(shot + voicing) % 3])
	var current: int = tier(stacks)
	var limit: int = VOICES_BY_TIER[current]
	var cadence: int = 2 if current >= 4 else 3
	if limit == 0 or shot % cadence != 0:
		return
	var sung: Array[StringName] = voices(stacks, shot + voicing, limit, featured)
	var support: float = 0.28 / sqrt(float(maxi(1, sung.size())))
	for i: int in sung.size():
		var gain: float = 0.23 if sung[i] == featured else support
		gain *= 1.0 + minf(0.22, maxf(0.0, int(stacks.get(sung[i], 0)) - 1) * 0.035)
		Audio.play_sfx_pitched(&"arcane_harmonic", BLAST_DB + linear_to_db(gain / 0.74), pitch_for(sung[i], i, voicing))


## When a boon is taken: the whole chord, rolled up from the new boon's note.
static func reveal(new_boon: StringName, tree: SceneTree) -> void:
	featured = new_boon
	var stacks: Dictionary = _stacks()
	var voicing: int = _voicing()
	Audio.duck_music(-8.0, 0.76)
	Audio.play_sfx_pitched(&"arcane_cast", BLAST_DB + linear_to_db(0.68 / 0.74), 0.92)
	var sung: Array[StringName] = voices(stacks, voicing, mini(7, 2 + tier(stacks)), new_boon)
	var support: float = 0.48 / sqrt(float(maxi(1, sung.size())))
	for i: int in sung.size():
		var gain: float = 0.42 if sung[i] == new_boon else support
		var pitch: float = pitch_for(sung[i], i, voicing)
		tree.create_timer(REVEAL_STAGGER * i, true).timeout.connect(func() -> void:
			Audio.play_sfx_pitched(&"arcane_harmonic", BLAST_DB + linear_to_db(gain / 0.74), pitch))
	var top: float = clampf(pitch_for(new_boon, sung.size(), voicing) * 2.0, 0.72, 1.92)
	tree.create_timer(0.055 + REVEAL_STAGGER * sung.size(), true).timeout.connect(func() -> void:
		Audio.play_sfx_pitched(&"arcane_harmonic", BLAST_DB + linear_to_db(0.34 / 0.74), top))


static func _stacks() -> Dictionary:
	var stacks: Dictionary = {}
	for id: StringName in Game.boon_ids():
		stacks[id] = Game.stacks(id)
	return stacks


static func _voicing() -> int:
	return absi(Game.rng.seed) % 3


static func _total(stacks: Dictionary) -> int:
	var total: int = 0
	for id: Variant in stacks.keys():
		total += int(stacks[id])
	return total
