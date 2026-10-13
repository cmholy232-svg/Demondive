class_name BossAnnouncer
extends RefCounted
## Short story callouts during a fight, shown under the boss bar.


static func say(tree: SceneTree, text: String) -> void:
	var hud: Hud = tree.get_first_node_in_group(&"hud") as Hud
	if hud != null:
		hud.callout(text)
