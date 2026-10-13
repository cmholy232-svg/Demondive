class_name ReversalTimer
extends RefCounted
## Measures a full left-right reversal on the ground: from full run speed one
## way to full run speed the other way. Shown on the F3 overlay.

const THRESHOLD: float = 0.999

var last_seconds: float = 0.0
var _elapsed: float = -1.0
var _from_sign: float = 0.0


func update(milo: Milo, delta: float) -> void:
	var speed: float = milo.tuning.run_speed * THRESHOLD
	var vx: float = milo.velocity.x
	if _elapsed >= 0.0:
		_elapsed += delta
		if not milo.is_on_floor():
			_elapsed = -1.0
		elif signf(vx) == -_from_sign and absf(vx) >= speed:
			last_seconds = _elapsed
			_elapsed = -1.0
		return
	var input_x: int = milo.current_input.move.x
	if milo.is_on_floor() and absf(vx) >= speed and input_x != 0 and float(input_x) != signf(vx):
		_from_sign = signf(vx)
		_elapsed = delta
