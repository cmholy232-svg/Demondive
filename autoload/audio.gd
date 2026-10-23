extends Node
## Sound effects from a small pool so overlapping hits don't cut each other
## off, and music with crossfades. Sounds load by name from audio/sfx; music
## from audio/music, or, in the web build, from a music/ folder next to the
## page so the game download stays small.
##
## The mix follows Alpha 8.2's music director (data/audio/mix.json): each
## situation has its own fade, the hub and exploration tracks pick up where
## they left off, big hits briefly duck the music, and music sits lower and
## softer while the game is paused for dialogue or a menu.

const POOL_SIZE: int = 16
const SFX_PATH: String = "res://audio/sfx/sfx_%s.wav"
const BOON_SFX_PATH: String = "res://audio/sfx/boons/sfx_boon_%s.wav"
const MUSIC_PATH: String = "res://audio/music/%s.ogg"
const WEB_MUSIC_URL: String = "music/%s.ogg"
const MIX_PATH: String = "res://data/audio/mix.json"
const MUSIC_BUS: StringName = &"Music"
const SFX_BUS: StringName = &"SFX"
const DEFAULT_FADE: float = 0.9
const DUCK_ATTACK: float = 0.035
const DUCK_RELEASE: float = 0.25
const MAX_DUCK_HOLD: float = 0.72
const OPEN_LOWPASS_HZ: float = 20500.0

var sfx_volume_db: float = -6.0
var music_volume_db: float = -8.0
var mix: Dictionary = {}
var _pool: Array[AudioStreamPlayer] = []
var _next: int = 0
var _cache: Dictionary = {}
var _music: Array[AudioStreamPlayer] = []
var _music_index: int = 0
var _music_id: StringName = &""
var _music_cache: Dictionary = {}
## Where each track was when it faded out, so it can resume there.
var _playheads: Dictionary = {}
var _resume_next: bool = false
var _music_tween: Tween
var _warned: Dictionary = {}
var _last_played: Dictionary = {}
var _duck_db: float = 0.0
var _duck_hold: float = 0.0
var _bus_duck_db: float = 0.0
var _lowpass: AudioEffectLowPassFilter


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	mix = _load_mix()
	_make_buses()
	for i: int in POOL_SIZE:
		var player := AudioStreamPlayer.new()
		player.bus = SFX_BUS
		add_child(player)
		_pool.append(player)
	for i: int in 2:
		var music := AudioStreamPlayer.new()
		music.volume_db = -80.0
		music.bus = MUSIC_BUS
		add_child(music)
		_music.append(music)
	apply_settings()


func _process(delta: float) -> void:
	var paused: bool = get_tree().paused
	_duck_hold = maxf(0.0, _duck_hold - delta)
	var target: float = minf(_duck_db if _duck_hold > 0.0 else 0.0, float(mix.get("paused_duck_db", -6.0)) if paused else 0.0)
	var tau: float = DUCK_ATTACK if target < _bus_duck_db else DUCK_RELEASE
	_bus_duck_db = lerpf(_bus_duck_db, target, minf(1.0, delta / tau))
	if _duck_hold <= 0.0:
		_duck_db = 0.0
	var bus: int = AudioServer.get_bus_index(MUSIC_BUS)
	AudioServer.set_bus_volume_db(bus, _bus_duck_db)
	var cutoff: float = float(mix.get("paused_lowpass_hz", 3200.0)) if paused else OPEN_LOWPASS_HZ
	_lowpass.cutoff_hz = lerpf(_lowpass.cutoff_hz, cutoff, minf(1.0, delta * 8.0))
	AudioServer.set_bus_effect_enabled(bus, 0, _lowpass.cutoff_hz < OPEN_LOWPASS_HZ - 100.0)


func apply_settings() -> void:
	var master: float = float(Save.setting("master"))
	sfx_volume_db = linear_to_db(maxf(0.001, master * float(Save.setting("sfx")))) - 2.0
	music_volume_db = linear_to_db(maxf(0.001, master * float(Save.setting("music")))) - 2.0
	if _music_id != &"":
		_music[_music_index].volume_db = music_volume_db


## Plays a named sound. Repeats inside the sound's minimum gap, or past its
## voice cap, are dropped so dense fights stay readable. Never affects gameplay.
func play_sfx(id: StringName, volume_db: float = 0.0, pitch_variance: float = 0.06) -> void:
	play_sfx_pitched(id, volume_db, 1.0 + randf_range(-pitch_variance, pitch_variance))


func play_sfx_pitched(id: StringName, volume_db: float, pitch: float) -> void:
	var stream: AudioStream = _sfx(id)
	if stream == null or not _admit(id, stream):
		return
	_start(stream, volume_db, pitch)
	var rule: Dictionary = sfx_rule(id)
	var duck: float = float(rule.get("duck", 0.0))
	if duck < 0.0:
		duck_music(duck, minf(MAX_DUCK_HOLD, stream.get_length() + 0.1))


func play_boon(boon: StringName, volume_db: float = 0.0) -> void:
	var path: String = BOON_SFX_PATH % boon
	if not _cache.has(path):
		_cache[path] = load(path) if ResourceLoader.exists(path) else null
	var stream: AudioStream = _cache[path] as AudioStream
	if stream != null:
		_start(stream, volume_db, 1.0)
		duck_music(-5.0, MAX_DUCK_HOLD)


## Dips the music for a moment under an important sound.
func duck_music(db: float, seconds: float) -> void:
	_duck_db = minf(db, _duck_db) if _duck_hold > 0.0 else db
	_duck_hold = maxf(_duck_hold, seconds)


func sfx_rule(id: StringName) -> Dictionary:
	return ((mix.get("sfx", {}) as Dictionary).get(String(id), {})) as Dictionary


func music_fade(situation: String) -> float:
	return float((mix.get("music_fade", {}) as Dictionary).get(situation, DEFAULT_FADE))


func _admit(id: StringName, stream: AudioStream) -> bool:
	var rule: Dictionary = sfx_rule(id)
	var now: float = Time.get_ticks_msec() / 1000.0
	if _last_played.has(id) and now - float(_last_played[id]) < float(rule.get("gap", 0.0)):
		return false
	var voices: int = int(rule.get("voices", 0))
	if voices > 0:
		var playing: int = 0
		for player: AudioStreamPlayer in _pool:
			if player.playing and player.stream == stream:
				playing += 1
		if playing >= voices:
			return false
	_last_played[id] = now
	return true


func _start(stream: AudioStream, volume_db: float, pitch: float) -> void:
	var player: AudioStreamPlayer = _pool[_next]
	_next = (_next + 1) % POOL_SIZE
	player.stream = stream
	player.volume_db = sfx_volume_db + volume_db
	player.pitch_scale = pitch
	player.play()


func _sfx(id: StringName) -> AudioStream:
	if _cache.has(id):
		return _cache[id] as AudioStream
	var path: String = SFX_PATH % id
	var stream: AudioStream = load(path) as AudioStream if ResourceLoader.exists(path) else null
	if stream == null and not _warned.has(id):
		_warned[id] = true
		push_warning("Audio: unknown sfx '%s'" % id)
	_cache[id] = stream
	return stream


# --- Music ------------------------------------------------------------------

## Crossfades to a track. situation picks the fade from mix.json (explore,
## boss, ...); hub and explore tracks resume where they were left.
func play_music(id: StringName, situation: String = "") -> void:
	if id == _music_id or id == &"":
		return
	var key: String = situation if situation != "" else String(id)
	var fade: float = music_fade(key)
	_resume_next = (mix.get("resume_music", []) as Array).has(key)
	_music_id = id
	if _music_cache.has(id):
		_crossfade(_music_cache[id] as AudioStream, fade)
		return
	var path: String = MUSIC_PATH % id
	if ResourceLoader.exists(path):
		_music_cache[id] = load(path)
		_crossfade(_music_cache[id] as AudioStream, fade)
	elif OS.has_feature("web"):
		_fetch_music(id, fade)


## Fades the music out; "silence" uses the after-a-boss fade from mix.json.
func stop_music(situation: String = "silence") -> void:
	_music_id = &""
	_crossfade(null, music_fade(situation))


func current_music() -> StringName:
	return _music_id


func _fetch_music(id: StringName, fade: float) -> void:
	var request := HTTPRequest.new()
	add_child(request)
	request.request_completed.connect(func(result: int, code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
		request.queue_free()
		if result != HTTPRequest.RESULT_SUCCESS or code != 200:
			return
		var stream: AudioStreamOggVorbis = AudioStreamOggVorbis.load_from_buffer(body)
		if stream == null:
			return
		stream.loop = true
		_music_cache[id] = stream
		if _music_id == id:
			_crossfade(stream, fade))
	# HTTPRequest needs an absolute URL; resolve the folder against the page.
	var url: String = str(JavaScriptBridge.eval("new URL('%s', document.baseURI).href" % (WEB_MUSIC_URL % id)))
	request.request(url)


func _remember_playhead() -> void:
	var current: AudioStreamPlayer = _music[_music_index]
	if current.playing and current.stream != null:
		for id: Variant in _music_cache.keys():
			if _music_cache[id] == current.stream:
				_playheads[id] = current.get_playback_position()


func _crossfade(stream: AudioStream, fade: float) -> void:
	_remember_playhead()
	if _music_tween != null and _music_tween.is_valid():
		_music_tween.kill()
	var old: AudioStreamPlayer = _music[_music_index]
	_music_index = 1 - _music_index
	var fresh: AudioStreamPlayer = _music[_music_index]
	var seconds: float = maxf(0.05, fade)
	_music_tween = create_tween().set_parallel(true)
	_music_tween.tween_property(old, "volume_db", -80.0, seconds)
	if stream != null:
		if stream is AudioStreamOggVorbis:
			(stream as AudioStreamOggVorbis).loop = true
		var start: float = float(_playheads.get(_music_id, 0.0)) if _resume_next else 0.0
		if start >= stream.get_length() - 0.25:
			start = 0.0
		fresh.stream = stream
		fresh.volume_db = -40.0
		fresh.play(start)
		_music_tween.tween_property(fresh, "volume_db", music_volume_db, seconds)
	_music_tween.chain().tween_callback(old.stop)


# --- Setup ------------------------------------------------------------------

func _load_mix() -> Dictionary:
	if not FileAccess.file_exists(MIX_PATH):
		return {}
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(MIX_PATH))
	return parsed as Dictionary if parsed is Dictionary else {}


## A Music bus (with a low-pass for paused moments) and an SFX bus, so the
## music can duck without touching the sound effects.
func _make_buses() -> void:
	for bus_name: StringName in [MUSIC_BUS, SFX_BUS]:
		if AudioServer.get_bus_index(bus_name) == -1:
			AudioServer.add_bus()
			var index: int = AudioServer.bus_count - 1
			AudioServer.set_bus_name(index, bus_name)
			AudioServer.set_bus_send(index, &"Master")
	var music_bus: int = AudioServer.get_bus_index(MUSIC_BUS)
	_lowpass = AudioEffectLowPassFilter.new()
	_lowpass.cutoff_hz = OPEN_LOWPASS_HZ
	AudioServer.add_bus_effect(music_bus, _lowpass, 0)
	AudioServer.set_bus_effect_enabled(music_bus, 0, false)
