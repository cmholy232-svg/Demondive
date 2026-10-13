class_name EnemyStatus
extends RefCounted
## Crowd-control and marks the boons put on one enemy: chill that builds to a
## freeze (Crya), slow (Whiteout), root (Thorn Bind), charm (Siren Call),
## blind (Gilded Veil), stacking marks (Flora, Luna, Roxyne) and shade
## wounds (Noctissa). The enemy reads it every tick; the 3D view shows it.

const FREEZE_AT: float = 1.0
## Bosses shrug most of it off: they slow, but never freeze, root or charm.
const BOSS_SLOW_SHARE: float = 0.5

var is_boss: bool = false
var chill: float = 0.0
var frozen_left: float = 0.0
var slow_left: float = 0.0
var slow_amount: float = 0.0
var rooted_left: float = 0.0
var charmed_left: float = 0.0
var blind_left: float = 0.0
var wound_left: float = 0.0
var wound_dps: float = 0.0
## Mark name -> count (&"thorn", &"dream"); &"hunt" stays for the room.
var marks: Dictionary = {}
## Luna: damage dealt since the first dream mark.
var dream_stored: float = 0.0


func tick(delta: float) -> void:
	frozen_left = maxf(0.0, frozen_left - delta)
	slow_left = maxf(0.0, slow_left - delta)
	rooted_left = maxf(0.0, rooted_left - delta)
	charmed_left = maxf(0.0, charmed_left - delta)
	blind_left = maxf(0.0, blind_left - delta)
	wound_left = maxf(0.0, wound_left - delta)
	if frozen_left <= 0.0:
		chill = maxf(0.0, chill - delta * 0.25)


## Multiplier on movement and attack tempo.
func speed_factor() -> float:
	if frozen_left > 0.0:
		return 0.0
	var slow: float = maxf(chill * 0.4, slow_amount if slow_left > 0.0 else 0.0)
	if is_boss:
		slow *= BOSS_SLOW_SHARE
	return clampf(1.0 - slow, 0.15, 1.0)


func is_frozen() -> bool:
	return frozen_left > 0.0


func is_rooted() -> bool:
	return rooted_left > 0.0 or frozen_left > 0.0


func is_charmed() -> bool:
	return charmed_left > 0.0


func is_blind() -> bool:
	return blind_left > 0.0


## Slowed, frozen, charmed or rooted (stun is checked on the enemy).
func is_controlled() -> bool:
	return frozen_left > 0.0 or slow_left > 0.0 or chill > 0.05 or rooted_left > 0.0 or charmed_left > 0.0


## Adds chill; returns true when it tips into a freeze.
func add_chill(amount: float, freeze_seconds: float) -> bool:
	if frozen_left > 0.0:
		return false
	chill += amount
	if chill < FREEZE_AT or is_boss:
		chill = minf(chill, FREEZE_AT)
		return false
	chill = 0.0
	frozen_left = freeze_seconds
	return true


func slow(amount: float, seconds: float) -> void:
	slow_amount = maxf(slow_amount if slow_left > 0.0 else 0.0, amount)
	slow_left = maxf(slow_left, seconds)


func root(seconds: float) -> void:
	if not is_boss:
		rooted_left = maxf(rooted_left, seconds)


func charm(seconds: float) -> void:
	if not is_boss:
		charmed_left = maxf(charmed_left, seconds)


func blind(seconds: float) -> void:
	blind_left = maxf(blind_left, seconds)


func wound(dps: float, seconds: float) -> void:
	wound_dps = maxf(wound_dps if wound_left > 0.0 else 0.0, dps)
	wound_left = maxf(wound_left, seconds)


func mark(id: StringName) -> int:
	marks[id] = int(marks.get(id, 0)) + 1
	return int(marks[id])


func clear_mark(id: StringName) -> void:
	marks.erase(id)


func has_mark(id: StringName) -> bool:
	return int(marks.get(id, 0)) > 0


## The strongest status, for the 3D view's colour ring ("" for none).
func shown() -> StringName:
	if frozen_left > 0.0:
		return &"frozen"
	if charmed_left > 0.0:
		return &"charmed"
	if rooted_left > 0.0:
		return &"rooted"
	if blind_left > 0.0:
		return &"blind"
	if slow_left > 0.0 or chill > 0.3:
		return &"chilled"
	if wound_left > 0.0:
		return &"wounded"
	return &""
