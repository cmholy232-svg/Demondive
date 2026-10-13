class_name StoreBackend
extends RefCounted
## Platform store interface. This base class is the "no store" backend used
## by the web build and tests; platform backends override every method.


func available() -> bool:
	return false


func price_text(_product: StringName) -> String:
	return ""


func purchase(_product: StringName, done: Callable) -> void:
	done.call(false)


func restore(done: Callable) -> void:
	var none: Array[StringName] = []
	done.call(none)
