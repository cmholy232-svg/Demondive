class_name Store
extends RefCounted
## The one doorway to real-money purchases. Products are cosmetic only
## (locked canon: no gacha, no paid randomness, no FOMO, nothing that changes
## gameplay). Each platform plugs in a backend; the web build has none, so
## the store simply reports itself unavailable.
##
## To add a platform: subclass StoreBackend (Steam via GodotSteam, Google Play
## Billing, StoreKit), and pick it in _backend(). Prices always come from the
## platform; the game never hard-codes them.

const PRODUCTS_PATH: String = "res://data/products.json"

static var _active: StoreBackend


static func backend() -> StoreBackend:
	if _active == null:
		_active = StoreBackend.new()
	return _active


static func set_backend(next: StoreBackend) -> void:
	_active = next


static func products() -> Dictionary:
	return JSON.parse_string(FileAccess.get_file_as_string(PRODUCTS_PATH)) as Dictionary


static func available() -> bool:
	return backend().available()


## Price text from the platform, or "" when the store isn't available.
static func price_text(product: StringName) -> String:
	return backend().price_text(product)


## Starts a purchase. The backend calls Save.grant_product on success, which
## unlocks every cosmetic that names this product.
static func purchase(product: StringName, done: Callable) -> void:
	if not available():
		done.call(false)
		return
	backend().purchase(product, func(ok: bool) -> void:
		if ok:
			Save.grant_product(product)
		done.call(ok))


static func restore() -> void:
	backend().restore(func(owned: Array[StringName]) -> void:
		for product: StringName in owned:
			Save.grant_product(product))
