shader_type spatial;
render_mode unshaded, fog_disabled, cull_disabled;
// Far backdrop behind every level: a vertical gradient with a hot horizon,
// slow drifting smoke and faint distant flickers. Drawn on one huge quad.

uniform vec4 sky_top : source_color = vec4(0.02, 0.01, 0.04, 1.0);
uniform vec4 sky_low : source_color = vec4(0.2, 0.04, 0.12, 1.0);
uniform vec4 horizon : source_color = vec4(1.0, 0.3, 0.5, 1.0);
uniform float horizon_y = 0.0;
uniform float span = 40.0;
uniform float smoke = 0.6;
uniform float horizon_glow = 0.9;

varying vec3 world_pos;

float hash12(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * 0.1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
	float v = 0.0;
	float a = 0.5;
	for (int i = 0; i < 5; i++) {
		v += vnoise(p) * a;
		p = p * 2.02 + vec2(5.3, 1.7);
		a *= 0.5;
	}
	return v;
}

void vertex() {
	world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

void fragment() {
	float h = (world_pos.y - horizon_y) / span;
	vec3 col = mix(sky_low.rgb, sky_top.rgb, smoothstep(-0.1, 1.0, h));
	float band = exp(-abs(h) * 6.0);
	col += horizon.rgb * band * horizon_glow * 0.55;
	vec2 p = world_pos.xy * 0.035;
	float s = fbm(p + vec2(TIME * 0.006, TIME * 0.002));
	float s2 = fbm(p * 2.3 - vec2(TIME * 0.01, 0.0));
	float clouds = smoothstep(0.42, 0.8, s * 0.7 + s2 * 0.4);
	col = mix(col, col * 0.35, clouds * smoke);
	col += horizon.rgb * smoothstep(0.55, 0.85, s2) * smoothstep(0.6, -0.2, h) * 0.18 * smoke;
	// Distant flickers: tiny sparks high in the gloom.
	vec2 cell = floor(world_pos.xy * 0.6);
	float r = hash12(cell);
	float star = step(0.985, r) * smoothstep(0.5, 0.0, length(fract(world_pos.xy * 0.6) - 0.5)) * (0.5 + 0.5 * sin(TIME * (1.0 + r * 3.0) + r * 40.0));
	col += mix(horizon.rgb, vec3(1.0), 0.5) * star * smoothstep(0.1, 0.6, h) * 0.8;
	ALBEDO = col;
}
