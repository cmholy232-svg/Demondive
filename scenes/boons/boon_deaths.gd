class_name BoonDeaths
extends RefCounted
## What the boons do when an enemy dies, whatever killed it. Each line
## matches a Lv 2, 4 or 7 behaviour on the boon's card; tests check them.

const INFERNO_RADIUS: float = 120.0
const PASS_ON_RANGE: float = 320.0
## Roxyne Lv 4: Energy for killing a hunted enemy.
const FEAST_ENERGY: float = 6.0


static func on_death(enemy: Enemy) -> void:
	if Game.boons.is_empty() or enemy.get_tree() == null:
		return
	_pyrra(enemy)
	_nerissa(enemy)
	_noctissa(enemy)
	_roxyne(enemy)


## Pyrra Lv 7 Inferno: burning enemies explode when they die, so a burning
## crowd goes up in a chain.
static func _pyrra(enemy: Enemy) -> void:
	if BoonCatalog.rank(&"pyrra") < 4 or not enemy.is_burning() or enemy.get_parent() == null:
		return
	var n: int = Game.stacks(&"pyrra")
	ArcaneBlast.detonate(enemy.get_parent(), enemy.center(), INFERNO_RADIUS, 16.0 + 4.0 * n, BoonCatalog.color(&"pyrra"), 2.0)


## Nerissa Lv 2 Serenade: a charmed enemy's death charms the nearest enemy.
static func _nerissa(enemy: Enemy) -> void:
	if BoonCatalog.rank(&"nerissa") < 2 or not enemy.status.is_charmed():
		return
	for other: Enemy in BoonHooks.nearest(enemy.get_tree(), enemy.center(), 1, PASS_ON_RANGE, [enemy]):
		other.status.charm(2.0 + 0.5 * Game.stacks(&"nerissa"))
		Game.fx(&"charm", other.center(), BoonCatalog.color(&"nerissa"), 1.0)


## Noctissa Lv 4 Trace: a shade wound passes to the nearest enemy on death.
static func _noctissa(enemy: Enemy) -> void:
	if BoonCatalog.rank(&"noctissa") < 3 or enemy.status.wound_left <= 0.0:
		return
	for other: Enemy in BoonHooks.nearest(enemy.get_tree(), enemy.center(), 1, PASS_ON_RANGE, [enemy]):
		other.status.wound(enemy.status.wound_dps, maxf(enemy.status.wound_left, 2.0))
		Game.fx(&"blink", other.center(), BoonCatalog.color(&"noctissa"), 0.8)


## Roxyne Lv 4 Feast: killing a hunted enemy restores Energy.
static func _roxyne(enemy: Enemy) -> void:
	if BoonCatalog.rank(&"roxyne") >= 3 and enemy.status.has_mark(&"hunt"):
		Game.add_energy(FEAST_ENERGY)
