class_name RoomRules
extends RefCounted
## The Thunder Jackpot's roulette: each fight room rolls one rule and
## announces it before the first wave, so the change is never hidden.
##   double_shards  every kill drops twice the Soul Shards
##   low_gravity    Milo falls slower and jumps higher
##   overcharge     everyone hits half again as hard, Milo included
##   frenzy         enemies move and attack faster

const RULES: Array[StringName] = [&"double_shards", &"low_gravity", &"overcharge", &"frenzy"]

static var current: StringName = &""


static func roll(rng: RandomNumberGenerator) -> StringName:
	current = RULES[rng.randi_range(0, RULES.size() - 1)]
	return current


static func clear() -> void:
	current = &""


static func gravity_scale() -> float:
	return 0.62 if current == &"low_gravity" else 1.0


static func milo_damage() -> float:
	return 1.5 if current == &"overcharge" else 1.0


static func enemy_damage() -> float:
	return 1.5 if current == &"overcharge" else 1.0


static func enemy_speed() -> float:
	return 1.35 if current == &"frenzy" else 1.0


static func shard_scale() -> int:
	return 2 if current == &"double_shards" else 1
