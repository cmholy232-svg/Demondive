shader_type spatial;
// Procedural stone for level geometry: rock, brick or tile pattern from
// world-space noise, a lit top surface, worn bright edges, bump from the
// pattern, and darkening toward the bottom of each block. Works in the
// Compatibility renderer (no textures needed).

uniform vec4 base_color : source_color = vec4(0.12, 0.08, 0.14, 1.0);
uniform vec4 top_color : source_color = vec4(0.24, 0.16, 0.28, 1.0);
uniform vec4 seam_color : source_color = vec4(0.03, 0.02, 0.04, 1.0);
uniform vec4 edge_color : source_color = vec4(0.45, 0.32, 0.5, 1.0);
uniform vec4 glow_color : source_color = vec4(1.0, 0.2, 0.6, 1.0);
// 0 rough rock, 1 brick courses, 2 big slabs, 3 hexagonal crystal tiles
uniform int pattern = 1;
uniform float pattern_scale = 1.0;
uniform vec3 half_size = vec3(1.0, 1.0, 1.0);
uniform float edge_width = 0.07;
uniform float glow_amount = 0.0;
uniform float roughness_base = 0.78;
uniform float metal = 0.0;
uniform float bump_strength = 0.55;

varying vec3 local_pos;
varying vec3 world_pos;
varying vec3 world_normal;

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
	for (int i = 0; i < 4; i++) {
		v += vnoise(p) * a;
		p = p * 2.03 + vec2(17.1, 9.2);
		a *= 0.5;
	}
	return v;
}

// Returns (height, seam) for a surface coordinate. seam is 1 inside a joint.
vec2 pattern_at(vec2 p) {
	float grain = fbm(p * 3.0);
	if (pattern == 0) {
		float big = fbm(p * 0.7);
		float cracks = 1.0 - smoothstep(0.0, 0.035, abs(fbm(p * 1.3 + 4.0) - 0.5));
		return vec2(big * 0.7 + grain * 0.3, cracks * 0.8);
	}
	vec2 cell_size = pattern == 1 ? vec2(0.9, 0.42) : vec2(1.6, 1.6);
	if (pattern == 3) {
		cell_size = vec2(0.8, 0.8);
	}
	vec2 q = p / cell_size;
	float row = floor(q.y);
	q.x += pattern == 1 ? mod(row, 2.0) * 0.5 : (pattern == 3 ? mod(row, 2.0) * 0.5 : 0.0);
	vec2 cell = floor(q);
	vec2 f = fract(q);
	vec2 d = min(f, 1.0 - f) * cell_size;
	float jitter = hash12(cell + row * 7.0);
	float joint = pattern == 1 ? 0.035 : 0.025;
	float seam = 1.0 - smoothstep(joint * 0.5, joint * 1.6, min(d.x, d.y) + (grain - 0.5) * 0.03);
	float bevel = smoothstep(0.0, 0.12, min(d.x, d.y));
	float h = bevel * (0.75 + jitter * 0.25) - grain * 0.15;
	return vec2(h, seam);
}

void vertex() {
	local_pos = VERTEX;
	world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	world_normal = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	vec3 n = normalize(world_normal);
	vec3 an = abs(n);
	bool is_top = n.y > 0.7;
	bool is_bottom = n.y < -0.7;
	vec2 uv = an.z > an.x ? world_pos.xy : world_pos.zy;
	if (an.y > 0.7) {
		uv = world_pos.xz;
	}
	uv *= pattern_scale;
	vec2 hs = pattern_at(uv);
	vec2 e = vec2(0.02, 0.0);
	float hx = pattern_at(uv + e.xy).x - hs.x;
	float hy = pattern_at(uv + e.yx).x - hs.x;

	// Box-local distances: how near this point is to the block's outer edges.
	vec3 to_edge = half_size - abs(local_pos);
	float near_top = half_size.y - local_pos.y;
	float edge_d = an.z > 0.5 ? min(to_edge.x, to_edge.y) : (an.y > 0.5 ? min(to_edge.x, to_edge.z) : min(to_edge.z, to_edge.y));
	float edge = 1.0 - smoothstep(0.0, edge_width, edge_d);
	float top_lip = 1.0 - smoothstep(0.0, edge_width * 1.6, near_top);

	float tone = 0.78 + hs.x * 0.38;
	float stain = fbm(world_pos.xy * 0.35 + 3.0);
	vec3 col = base_color.rgb * tone * mix(0.8, 1.15, stain);
	if (is_top) {
		col = top_color.rgb * (0.85 + hs.x * 0.25);
	}
	col = mix(col, seam_color.rgb, hs.y * 0.85);
	// Darken toward the bottom of tall blocks (soft occlusion) and on undersides.
	float depth_down = clamp(near_top / 3.0, 0.0, 1.0);
	col *= mix(1.0, 0.45, depth_down * (1.0 - float(is_top)));
	if (is_bottom) {
		col *= 0.5;
	}
	// Worn, lighter edges and a bright lip where the walkable top meets the face.
	col = mix(col, edge_color.rgb, max(edge * 0.55, top_lip * 0.8) * (1.0 - hs.y));
	ALBEDO = col;
	ROUGHNESS = clamp(roughness_base - top_lip * 0.35 - float(is_top) * 0.2 + hs.y * 0.2, 0.05, 1.0);
	METALLIC = metal;
	// Faint glow in the joints of the front faces (magma or neon behind the stone).
	float glow = glow_amount * hs.y * (1.0 - float(is_top)) * smoothstep(0.2, 1.0, depth_down + 0.3);
	EMISSION = glow_color.rgb * glow * 2.5;

	vec3 bump_world = n;
	if (an.z > an.x && an.z > an.y) {
		bump_world = normalize(n - vec3(hx, hy, 0.0) * bump_strength * 25.0 * sign(n.z));
	} else if (an.y > 0.7) {
		bump_world = normalize(n - vec3(hx, 0.0, hy) * bump_strength * 25.0);
	} else {
		bump_world = normalize(n - vec3(0.0, hy, hx) * bump_strength * 25.0);
	}
	NORMAL = normalize((VIEW_MATRIX * vec4(bump_world, 0.0)).xyz);
}
