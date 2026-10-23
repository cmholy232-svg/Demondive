class_name BoonCallouts
extends RefCounted
## Short HUD callouts when a boon reaches a new level behaviour or a pair
## synergy switches on, so the player sees the build change.


static func announce(tree: SceneTree, id: StringName, before: int, after: int, synergies_before: Array[StringName]) -> void:
	if tree == null:
		return
	var lines: PackedStringArray = []
	var rank: int = BoonCatalog.rank_at(id, after)
	if rank > BoonCatalog.rank_at(id, before) and rank >= 2:
		lines.append(rank_line(id, rank))
	for synergy: StringName in Synergies.all_active():
		if not synergies_before.has(synergy):
			lines.append(Strings.text("synergy.callout") % Synergies.text(synergy, "name"))
	if not lines.is_empty():
		BossAnnouncer.say(tree, "   ·   ".join(lines))


## "Pyrra Lv 2: Bloom"
static func rank_line(id: StringName, rank: int) -> String:
	return Strings.text("boon.rank_callout") % [BoonCatalog.text(id, "name"), level_for(id, rank), BoonCatalog.text(id, "rank%d_name" % rank)]


## The stack count that unlocks a rank (Lv 2, 4 or 7 by default).
static func level_for(id: StringName, rank: int) -> int:
	var at: Array[int] = BoonCatalog.thresholds(id)
	return at[clampi(rank - 1, 0, at.size() - 1)]
