class_name Synergies
extends RefCounted
## Named pair synergies: a bonus while Milo holds both boons. They add to a
## build and are never needed for a boon to be good. Names and text come
## from the strings file as synergy.<id>.name / synergy.<id>.desc.

## Synergy id -> the two boons that make it.
const PAIRS: Dictionary = {
	&"steam_pressure": [&"pyrra", &"maris"],
	&"stormfront": [&"voltara", &"zephyra"],
	&"crystal_garden": [&"flora", &"crya"],
	&"eclipse_engine": [&"luna", &"solara"],
	&"gilded_appetite": [&"aurelia", &"belladonna"],
	&"mirror_dream": [&"vespera", &"somnia"],
}
const COLORS: Dictionary = {
	&"steam_pressure": "#ff8a6b", &"stormfront": "#f6df45", &"crystal_garden": "#82e69a",
	&"eclipse_engine": "#d7b7ff", &"gilded_appetite": "#ffc75a", &"mirror_dream": "#bc8cff",
}
const STEAM_DAMAGE: float = 0.15
const STEAM_SHOVE: float = 2.0
const STORM_CHAIN_SHARE: float = 0.2
const GARDEN_CRIT: float = 0.08
const GARDEN_CHILL: float = 0.5
const ECLIPSE_DISCOUNT: float = 0.12
const ECLIPSE_ECHO: float = 2.0


static func active(id: StringName) -> bool:
	var pair: Array = PAIRS.get(id, []) as Array
	return pair.size() == 2 and Game.stacks(pair[0] as StringName) > 0 and Game.stacks(pair[1] as StringName) > 0


static func all_active() -> Array[StringName]:
	var out: Array[StringName] = []
	for id: Variant in PAIRS:
		if active(id as StringName):
			out.append(id as StringName)
	return out


## The synergy a boon takes part in, or &"" (each boon has at most one).
static func for_boon(boon: StringName) -> StringName:
	for id: Variant in PAIRS:
		if (PAIRS[id] as Array).has(boon):
			return id as StringName
	return &""


static func partner(id: StringName, boon: StringName) -> StringName:
	var pair: Array = PAIRS.get(id, []) as Array
	if pair.size() != 2:
		return &""
	return (pair[1] if pair[0] == boon else pair[0]) as StringName


static func color(id: StringName) -> Color:
	return Color.html(str(COLORS.get(id, "#ffffff")))


static func text(id: StringName, field: String) -> String:
	return Strings.text("synergy.%s.%s" % [id, field])


## Bolt changes: Steam Pressure's damage, Stormfront's extra needle,
## Crystal Garden's critical chance and Mirror Dream's ricochet.
static func apply(stats: BoltStats) -> void:
	if active(&"steam_pressure"):
		stats.damage *= 1.0 + STEAM_DAMAGE
	if active(&"stormfront"):
		stats.split += 1
	if active(&"crystal_garden"):
		stats.crit_chance += GARDEN_CRIT
	if active(&"mirror_dream"):
		stats.bounces += 1
