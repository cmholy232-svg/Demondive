class_name Pickup
extends Area2D
## Things Milo collects: Soul Shards, Demon Energy wisps, pizza (Health) and
## coffee (Energy). They pop out, fall, then drift to Milo when he's near.

const GROUP: StringName = &"pickups"
const GRAVITY: float = 1400.0

enum Kind { SHARD, ENERGY, PIZZA, COFFEE }

var kind: Kind = Kind.SHARD
var amount: float = 1.0
var velocity: Vector2 = Vector2.ZERO
var age: float = 0.0
var _resting: bool = false


static func spawn(parent: Node, at: Vector2, new_kind: Kind, value: float, pop: Vector2 = Vector2.ZERO) -> Pickup:
	var pickup := Pickup.new()
	pickup.kind = new_kind
	pickup.amount = value
	pickup.velocity = pop
	pickup.position = at
	parent.add_child.call_deferred(pickup)
	return pickup


## Drops from a defeated enemy: shards always, energy wisps, sometimes pizza.
static func drop_for(enemy: Enemy) -> void:
	var parent: Node = enemy.get_parent()
	var at: Vector2 = enemy.center()
	var rng: RandomNumberGenerator = Game.rng
	for i: int in enemy.shards_dropped:
		spawn(parent, at, Kind.SHARD, 1.0, Vector2(rng.randf_range(-220.0, 220.0), rng.randf_range(-620.0, -380.0)))
	spawn(parent, at, Kind.ENERGY, 6.0, Vector2(rng.randf_range(-160.0, 160.0), -500.0))
	if rng.randf() < 0.07 and not enemy.is_boss:
		spawn(parent, at, Kind.PIZZA, 0.12, Vector2(0.0, -560.0))


func _ready() -> void:
	add_to_group(GROUP)
	collision_layer = 0
	collision_mask = PhysicsLayers.PLAYER
	monitorable = false
	var shape := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = 22.0
	shape.shape = circle
	add_child(shape)
	body_entered.connect(_on_body_entered)


func _physics_process(delta: float) -> void:
	age += delta
	var target: Milo = get_tree().get_first_node_in_group(&"milo") as Milo
	if target != null and age > 0.35:
		var to_milo: Vector2 = target.global_position + Vector2(0.0, -60.0) - global_position
		if to_milo.length() < BoonEffects.pickup_magnet():
			velocity = velocity.lerp(to_milo.normalized() * 900.0, clampf(8.0 * delta, 0.0, 1.0))
			_resting = false
			position += velocity * delta
			return
	if _resting:
		return
	velocity.y += GRAVITY * delta
	velocity.x = move_toward(velocity.x, 0.0, 300.0 * delta)
	var space := get_world_2d().direct_space_state
	var query := PhysicsRayQueryParameters2D.create(global_position, global_position + velocity * delta + Vector2(0.0, 14.0))
	query.collision_mask = PhysicsLayers.WORLD | PhysicsLayers.ONE_WAY
	var result: Dictionary = space.intersect_ray(query)
	if not result.is_empty() and velocity.y > 0.0:
		global_position = (result["position"] as Vector2) - Vector2(0.0, 14.0)
		velocity = Vector2.ZERO
		_resting = true
		return
	position += velocity * delta


func _on_body_entered(body: Node2D) -> void:
	if not body is Milo or age < 0.2:
		return
	var was_full: bool = Game.health >= Game.max_health or Game.energy >= Game.max_energy
	match kind:
		Kind.SHARD:
			Game.add_run_shards(int(amount))
		Kind.ENERGY:
			Game.add_energy(amount)
		Kind.PIZZA:
			Game.heal(Game.max_health * amount * (1.0 + Upgrades.value(&"pizza_quality")))
		Kind.COFFEE:
			Game.add_energy(Game.max_energy * amount)
	Game.on_pickup(was_full)
	CombatFeedback.pickup(self)
	queue_free()
