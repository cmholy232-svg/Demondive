class_name RunRewards
extends RefCounted
## What a door promises and how the room pays it out once it's clear.


static func label(reward: StringName) -> String:
	return Strings.text("reward.%s" % reward)


static func pay(reward: StringName, run: Run) -> void:
	var at: Vector2 = run.milo.global_position + Vector2(0.0, -220.0)
	match reward:
		&"boon":
			run.offer_boons()
		&"shards":
			var amount: int = 10 + Game.level * 4 + Game.room_index
			for i: int in amount:
				Pickup.spawn(run.room, at + Vector2(Game.rng.randf_range(-60.0, 60.0), 0.0), Pickup.Kind.SHARD, 1.0, Vector2(Game.rng.randf_range(-300.0, 300.0), Game.rng.randf_range(-700.0, -300.0)))
		&"feast":
			Pickup.spawn(run.room, at, Pickup.Kind.PIZZA, 0.4, Vector2(0.0, -300.0))
			Pickup.spawn(run.room, at + Vector2(80.0, 0.0), Pickup.Kind.COFFEE, 0.6, Vector2(120.0, -300.0))
		&"heart":
			Game.raise_max_health(15.0)
			run.hud.callout(Strings.text("reward.heart_taken"), 1.8)
			Audio.play_sfx(&"pickup_heal", 0.0)
