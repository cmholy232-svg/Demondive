extends Node
## Plays sound effects from a small pool so overlapping hits don't cut each other off.

const POOL_SIZE: int = 12
const SFX: Dictionary = {
	&"arcane_cast": preload("res://audio/sfx/sfx_arcane_cast.wav"),
	&"arcane_hit": preload("res://audio/sfx/sfx_arcane_hit.wav"),
	&"target_break": preload("res://audio/sfx/sfx_target_break.wav"),
	&"milo_jump": preload("res://audio/sfx/sfx_milo_jump.wav"),
	&"milo_double_jump": preload("res://audio/sfx/sfx_milo_double_jump.wav"),
	&"milo_dash": preload("res://audio/sfx/sfx_milo_dash.wav"),
	&"milo_waveland": preload("res://audio/sfx/sfx_milo_waveland.wav"),
	&"milo_land": preload("res://audio/sfx/sfx_milo_land.wav"),
}

var sfx_volume_db: float = -6.0
var _pool: Array[AudioStreamPlayer] = []
var _next: int = 0


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for i: int in POOL_SIZE:
		var player := AudioStreamPlayer.new()
		add_child(player)
		_pool.append(player)


func play_sfx(id: StringName, volume_db: float = 0.0, pitch_variance: float = 0.06) -> void:
	var stream: AudioStream = SFX.get(id) as AudioStream
	if stream == null:
		push_warning("Audio: unknown sfx '%s'" % id)
		return
	var player: AudioStreamPlayer = _pool[_next]
	_next = (_next + 1) % POOL_SIZE
	player.stream = stream
	player.volume_db = sfx_volume_db + volume_db
	player.pitch_scale = 1.0 + randf_range(-pitch_variance, pitch_variance)
	player.play()
