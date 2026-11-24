import { BAYER4 } from './bayer'

const bayerTable = BAYER4.flat().map((n) => `${n}.0`).join(', ')

/**
 * Fragment source for the PS1 effect. Order: fringe, vignette, gamma, grain,
 * 6-bit quantize with Bayer dither, back to linear. Mirrors ps1Math.ts and bayer.ts.
 */
export const PS1_FRAGMENT_SHADER = /* glsl */ `
uniform float fringe;
uniform float vignette;
uniform float noise;
uniform float seed;
uniform vec2 invRes;

const float BAYER[16] = float[16](${bayerTable});

float bayer4(vec2 p) {
  int x = int(mod(floor(p.x), 4.0));
  int y = int(mod(floor(p.y), 4.0));
  return (BAYER[y * 4 + x] + 0.5) / 16.0;
}

float hash2(vec2 p, float s) {
  float v = sin(p.x * 12.9898 + p.y * 78.233 + s * 37.719) * 43758.5453;
  return v - floor(v);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // 1. chromatic fringing
  vec2 offset = (uv - 0.5) * fringe * 0.012;
  vec3 c = vec3(texture2D(inputBuffer, uv - offset).r, texture2D(inputBuffer, uv).g, texture2D(inputBuffer, uv + offset).b);
  // 2. vignette
  vec2 v = uv * 2.0 - 1.0;
  c *= clamp(1.0 - dot(v, v) * vignette * 0.55, 0.0, 1.0);
  // 3. gamma space
  c = pow(max(c, vec3(0.0)), vec3(1.0 / 2.2));
  // 4. film grain
  vec2 px = floor(uv / invRes);
  c += (hash2(px, seed) - 0.5) * noise * 0.03;
  // 5. 6-bit quantize with ordered dither
  c = floor(clamp(c, 0.0, 1.0) * 63.0 + bayer4(px)) / 63.0;
  // 6. back to linear
  outputColor = vec4(pow(clamp(c, 0.0, 1.0), vec3(2.2)), inputColor.a);
}
`
