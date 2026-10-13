shader_type spatial;
// Light-up club floor tiles: a grid that pulses between neon colours.

uniform vec4 base_color : source_color = vec4(0.05, 0.03, 0.08, 1.0);
uniform vec4 glow_a : source_color = vec4(1.0, 0.2, 0.65, 1.0);
uniform vec4 glow_b : source_color = vec4(0.2, 0.85, 1.0, 1.0);
uniform float cell = 0.64;
uniform float energy = 2.2;

void fragment() {
	vec3 world = (INV_VIEW_MATRIX * vec4(VERTEX, 1.0)).xyz;
	vec2 id = floor(world.xz / cell);
	float pick = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
	float pulse = step(0.55, fract(pick + TIME * 0.5));
	vec2 f = fract(world.xz / cell);
	float edge = step(0.06, f.x) * step(0.06, f.y) * step(f.x, 0.94) * step(f.y, 0.94);
	vec3 glow = mix(glow_a.rgb, glow_b.rgb, step(0.5, pick));
	ALBEDO = base_color.rgb;
	ROUGHNESS = 0.2;
	METALLIC = 0.3;
	EMISSION = glow * pulse * edge * energy * 0.6;
}
