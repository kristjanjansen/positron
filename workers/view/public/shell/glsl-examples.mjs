// demo/shell/glsl-examples.mjs: two short shaders to the writer's contract (mirror-shader.mjs's
// glslContract), teaching what the model reached for too rarely. The wish worker's /code puts them
// in its system prompt; glsl-writer-test.mjs and /shader/write/'s self-check check them.
// Neither is rain, so a measurement on rain grades no copy. One `hash(vec2)` in both: three
// examples with two hash signatures made the model call one with the other's argument (measured).

const HEAD = `precision highp float;
uniform float uT; uniform vec2 uRes; uniform sampler2D uPrev; uniform float uSegments;
out vec4 o;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`;

export const GLSL_EXAMPLES = [
  {
    name: 'fireflies',
    teaches: 'feedback through uPrev (the last frame, drifted and faded, so what is drawn leaves a trail), soft dots with smoothstep',
    body: `${HEAD}
void main() {
  vec2 uv = gl_FragCoord.xy / uRes, p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 c = texture(uPrev, uv - vec2(0.0, 1.0 / uRes.y)).rgb * 0.95;  // last frame, risen a pixel, faded
  for (int i = 0; i < 8; i++) {
    vec2 r = vec2(hash(vec2(i, 1)), hash(vec2(i, 2)));
    vec2 at = 0.45 * sin(uT * (0.3 + r) + 6.2831 * r.yx);
    c += vec3(1.0, 0.8, 0.3) * smoothstep(0.02, 0.0, length(p - at));  // a soft dot
  }
  o = vec4(min(c, 1.0), 1.0);
}`,
  },
  {
    name: 'ink',
    teaches: 'layered value noise (fbm) warped by itself, a cosine palette, a soft edge with smoothstep',
    body: `${HEAD}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; } return v; }
void main() {
  vec2 p = gl_FragCoord.xy / uRes.y * 3.0;
  float v = fbm(p + fbm(p + uT * 0.1));                                   // noise warped by noise
  vec3 col = 0.5 + 0.5 * cos(6.2831 * (v + uT * 0.05 + vec3(0.0, 0.1, 0.2)));  // a cosine palette
  o = vec4(col * smoothstep(0.3, 0.6, v), 1.0);                            // a soft edge, not a cut
}`,
  },
];

/** The examples as one block of a system prompt. */
export function glslExamples() {
  return [
    'Two examples of the craft. Learn the techniques, do not copy the pictures, and write as short:',
    ...GLSL_EXAMPLES.map((e) => `\n// ${e.name}: ${e.teaches}\n${e.body}`),
  ].join('\n');
}
