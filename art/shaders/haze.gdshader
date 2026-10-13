shader_type spatial;
render_mode unshaded, blend_add, cull_disabled, depth_draw_never, shadows_disabled;
// Drifting smoke-machine haze: soft layered noise on a large quad.

uniform vec4 color : source_color = vec4(0.6, 0.15, 0.5, 1.0);
uniform float strength = 0.12;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

void fragment() {
	vec3 world = (INV_VIEW_MATRIX * vec4(VERTEX, 1.0)).xyz;
	vec2 p = world.xy * 0.25 + vec2(TIME * 0.05, 0.0);
	float n = noise(p) * 0.6 + noise(p * 2.3 - vec2(TIME * 0.08, 0.0)) * 0.4;
	float fade = smoothstep(0.0, 0.25, UV.y) * smoothstep(1.0, 0.6, UV.y);
	ALBEDO = color.rgb * strength * n * n * fade * 2.0;
}
