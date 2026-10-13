shader_type spatial;
render_mode unshaded, blend_add, cull_disabled, depth_draw_never, shadows_disabled;
// Additive volumetric-looking spotlight cone: bright at the source, fading out
// along its length and towards its silhouette edges, with drifting dust.

uniform vec4 color : source_color = vec4(1.0, 0.3, 0.7, 1.0);
uniform float strength = 0.35;

float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743); }

void fragment() {
	float along = UV.y;
	float edge = pow(abs(dot(NORMAL, VIEW)), 1.6);
	vec2 dust_uv = UV * vec2(18.0, 30.0) + vec2(0.0, -TIME * 0.4);
	float dust = step(0.985, hash(floor(dust_uv))) * 2.0;
	ALBEDO = color.rgb * strength * (1.0 - along) * edge * (1.0 + dust);
}
