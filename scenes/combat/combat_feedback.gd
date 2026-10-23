class_name CombatFeedback
extends RefCounted
## Hit pause, camera kick, sound, damage number and effect for every hit,
## scaled in four tiers from footstep to boss kill.


static func enemy_hit(enemy: Enemy, hit: Hit, killed: bool) -> void:
	var tree: SceneTree = enemy.get_tree()
	if hit.source == &"burn" or hit.source == &"wound":
		Game.fx(&"ember", enemy.center(), BoonCatalog.color(&"pyrra" if hit.source == &"burn" else &"noctissa"), 0.6)
		if killed:
			_kill(enemy, tree, hit)
		return
	if hit.source == &"bolt":
		Game.add_energy(BoonEffects.energy_on_hit())
	if bool(Save.setting("damage_numbers")):
		DamageNumber.spawn(enemy, enemy.global_position + Vector2(0.0, -enemy.size.y - 12.0), hit.damage, killed, hit.critical)
	if killed:
		_kill(enemy, tree, hit)
		return
	Audio.play_sfx(&"arcane_hit", -3.0)
	Game.fx(&"hit", enemy.center(), Color.WHITE, 1.0 + (0.5 if hit.critical else 0.0))
	var tier: GameCamera.Tier = GameCamera.Tier.HEAVY if hit.critical or enemy.is_boss and hit.damage > 40.0 else GameCamera.Tier.HIT
	GameCamera.impact_in(tree, tier, hit.direction)


static func _kill(enemy: Enemy, tree: SceneTree, hit: Hit) -> void:
	var tier: GameCamera.Tier = GameCamera.Tier.BOSS if enemy.is_boss else GameCamera.Tier.HEAVY
	GameCamera.impact_in(tree, tier, hit.direction)
	if enemy.is_boss:
		Audio.play_sfx(&"boss_phase", 0.0)
		Audio.duck_music(-9.0, 0.72)
	Audio.play_sfx(&"enemy_die", -2.0)
	Game.fx(&"death", enemy.center(), Color(1.0, 0.45, 0.35), enemy.size.y / 90.0)


static func milo_hurt(milo: Milo, amount: float) -> void:
	GameCamera.impact_in(milo.get_tree(), GameCamera.Tier.HEAVY, Vector2.DOWN)
	Audio.play_sfx(&"milo_hurt", 0.0)
	Game.fx(&"hurt", milo.global_position + Vector2(0.0, -64.0), Color(1.0, 0.2, 0.3), clampf(amount / 15.0, 0.6, 2.0))


static func perfect_dodge(milo: Milo) -> void:
	Audio.play_sfx(&"perfect_dodge", -2.0)
	Game.fx(&"dodge", milo.global_position + Vector2(0.0, -64.0), Color(0.85, 1.0, 1.0), 1.0)


static func pickup(item: Pickup) -> void:
	var sound: StringName = &"pickup_shard" if item.kind == Pickup.Kind.SHARD else &"pickup_heal"
	Audio.play_sfx(sound, -6.0, 0.15)
	Game.fx(&"sparkle", item.global_position, Color(0.6, 0.9, 1.0) if item.kind == Pickup.Kind.SHARD else Color(1.0, 0.8, 0.4), 0.6)
