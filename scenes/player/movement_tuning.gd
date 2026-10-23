class_name MovementTuning
extends Resource
## Milo's movement numbers. Profiles live in data/player/*.tres.

@export var profile_name: String = ""
@export_group("Run")
@export var run_speed: float = 360.0
@export var ground_acceleration: float = 3500.0
## Used instead of ground_acceleration while input opposes current velocity on the ground.
@export var turnaround_acceleration: float = 6400.0
@export var air_acceleration: float = 2050.0
@export var ground_friction: float = 3000.0
@export var air_friction: float = 330.0
@export_group("Jump")
@export var gravity: float = 2350.0
@export var jump_velocity: float = -760.0
## Extra gravity while rising with jump released, for variable jump height.
@export var jump_release_gravity: float = 1750.0
## Release gravity applies only while rising faster than this (px/s, upward).
@export var jump_release_min_rise: float = 210.0
## Gravity multiplier while falling, so jumps come down quicker than they go up.
@export var fall_gravity_multiplier: float = 1.0
## With jump held, gravity is scaled by apex_hang_gravity_scale while vertical speed is under this (px/s).
@export var apex_hang_speed: float = 0.0
@export var apex_hang_gravity_scale: float = 1.0
@export var fall_speed_cap: float = 1200.0
@export var fast_fall_gravity: float = 1450.0
@export var fast_fall_speed_cap: float = 1450.0
@export var air_jumps: int = 1
@export var coyote_seconds: float = 0.13
@export var jump_buffer_seconds: float = 0.15
@export var drop_through_seconds: float = 0.24
## How far (px) Milo slides sideways around a ceiling corner that clips his head on the way up.
@export var corner_correction_px: float = 0.0
@export_group("Dash")
@export var dash_speed: float = 890.0
@export var dash_duration_seconds: float = 0.18
@export var dash_cooldown_seconds: float = 0.09
@export var dash_charges: int = 1
@export var dash_invulnerable_seconds: float = 0.38
## Share of dash speed kept when a dash ends: sideways, and upward.
@export var dash_end_speed_ratio: float = 1.0
@export var dash_end_rise_ratio: float = 1.0
@export_group("Waveland")
@export var waveland_speed: float = 780.0
@export var waveland_duration_seconds: float = 0.3
## Dash must point at least this far downward, and this far sideways, to become a waveland on touchdown.
@export var waveland_min_down: float = 0.15
@export var waveland_min_side: float = 0.35
@export var wave_slide_speed_cap: float = 820.0
@export var wave_slide_friction: float = 520.0
