class_name ArcaneBlast
extends RefCounted
## Instant round explosion that damages every enemy inside it (Pyrra's
## blooms, Flame Nova, Stone Barrier shards).


static func detonate(parent: Node, at: Vector2, radius: float, damage: float, color: Color, burn_seconds: float = 0.0) -> int:
	var hits: int = 0
	for node: Node in parent.get_tree().get_nodes_in_group(Enemy.GROUP):
		var enemy := node as Enemy
		if enemy == null or not enemy.is_active():
			continue
		var to_enemy: Vector2 = enemy.center() - at
		if to_enemy.length() > radius + enemy.size.x * 0.5:
			continue
		var hit := Hit.make(damage, to_enemy, 180.0)
		hit.source = &"blast"
		if burn_seconds > 0.0:
			hit.burn_seconds = burn_seconds
			hit.burn_dps = damage * 0.25
		enemy.take_hit(hit)
		hits += 1
	Game.fx(&"blast", at, color, radius / 100.0)
	GameCamera.impact_in(parent.get_tree(), GameCamera.Tier.HIT, Vector2.ZERO)
	return hits
