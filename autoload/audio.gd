extends Node
## Sound effects from a small pool so overlapping hits don't cut each other
## off, and music with crossfades. Sounds load by name from audio/sfx; music
## from audio/music, or, in the web build, from a music/ folder next to the
## page so the game download stays small.

const POOL_SIZE: int = 16
const SFX_PATH: String = "res://audio/sfx/sfx_%s.wav"
const BOON_SFX_PATH: String = "res://audio/sfx/boons/sfx_boon_%s.wav"
const MUSIC_PATH: String = "res://audio/music/%s.ogg"
const WEB_MUSIC_URL: String = "music/%s.ogg"
const FADE_SECONDS: float = 1.2

var sfx_volume_db: float = -6.0
var music_volume_db: float = -8.0
var _pool: Array[AudioStreamPlayer] = []
var _next: int = 0
var _cache: Dictionary = {}
var _music: Array[AudioStreamPlayer] = []
var _music_index: int = 0
var _music_id: StringName = &""
var _music_cache: Dictionary = {}
var _warned: Dictionary = {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for i: int in POOL_SIZE:
		var player := AudioStreamPlayer.new()
		add_child(player)
		_pool.append(player)
	for i: int in 2:
		var music := AudioStreamPlayer.new()
		music.volume_db = -80.0
		add_child(music)
		_music.append(music)
	apply_settings()


func apply_settings() -> void:
	var master: float = float(Save.setting("master"))
	sfx_volume_db = linear_to_db(maxf(0.001, master * float(Save.setting("sfx")))) - 2.0
	music_volume_db = linear_to_db(maxf(0.001, master * float(Save.setting("music")))) - 6.0
	if _music_id != &"":
		_music[_music_index].volume_db = music_volume_db


func play_sfx(id: StringName, volume_db: float = 0.0, pitch_variance: float = 0.06) -> void:
	var stream: AudioStream = _sfx(id)
	if stream == null:
		return
	var player: AudioStreamPlayer = _pool[_next]
	_next = (_next + 1) % POOL_SIZE
	player.stream = stream
	player.volume_db = sfx_volume_db + volume_db
	player.pitch_scale = 1.0 + randf_range(-pitch_variance, pitch_variance)
	player.play()


func play_boon(boon: StringName, volume_db: float = 0.0) -> void:
	var path: String = BOON_SFX_PATH % boon
	if not _cache.has(path):
		_cache[path] = load(path) if ResourceLoader.exists(path) else null
	var stream: AudioStream = _cache[path] as AudioStream
	if stream != null:
		var player: AudioStreamPlayer = _pool[_next]
		_next = (_next + 1) % POOL_SIZE
		player.stream = stream
		player.volume_db = sfx_volume_db + volume_db
		player.pitch_scale = 1.0
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

func play_music(id: StringName) -> void:
	if id == _music_id or id == &"":
		return
	_music_id = id
	if _music_cache.has(id):
		_crossfade(_music_cache[id] as AudioStream)
		return
	var path: String = MUSIC_PATH % id
	if ResourceLoader.exists(path):
		_music_cache[id] = load(path)
		_crossfade(_music_cache[id] as AudioStream)
	elif OS.has_feature("web"):
		_fetch_music(id)


func stop_music() -> void:
	_music_id = &""
	_crossfade(null)


func _fetch_music(id: StringName) -> void:
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
			_crossfade(stream))
	# HTTPRequest needs an absolute URL; resolve the folder against the page.
	var url: String = str(JavaScriptBridge.eval("new URL('%s', document.baseURI).href" % (WEB_MUSIC_URL % id)))
	request.request(url)


func _crossfade(stream: AudioStream) -> void:
	var old: AudioStreamPlayer = _music[_music_index]
	_music_index = 1 - _music_index
	var fresh: AudioStreamPlayer = _music[_music_index]
	var tween := create_tween().set_parallel(true)
	tween.tween_property(old, "volume_db", -80.0, FADE_SECONDS)
	if stream != null:
		if stream is AudioStreamOggVorbis:
			(stream as AudioStreamOggVorbis).loop = true
		fresh.stream = stream
		fresh.volume_db = -40.0
		fresh.play()
		tween.tween_property(fresh, "volume_db", music_volume_db, FADE_SECONDS)
	tween.chain().tween_callback(old.stop)
