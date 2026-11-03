import { MOTION, isTouchDevice } from './motion.js';

// The sky behind the wall (main-bg-1) is drawn on a WebGL canvas and kept
// gently billowing: its picture is warped by slowly drifting noise (a noise
// field bent by a second one, so the clouds swirl rather than wobble), with
// a faint shading that rolls through them — and drifting slowly left to
// right, the picture repeating seamlessly. Scrolling stirs it up — the
// clouds churn faster and a little harder, then settle back. Without WebGL,
// or when the visitor prefers reduced motion, the still picture (the
// backdrop's CSS background) shows instead.

const IMAGE = '/img/main-bg-1.webp';
// The most pixels the canvas draws per frame (a full-HD screen's).
const MAX_PIXELS = 1920 * 1080;
// At rest a frame is drawn at most this often, ms (≈ 30 a second).
const REST_FRAME = 30;

// How far the picture is pushed about, as a share of its size, at rest and
// on top of that at the fastest scroll.
const WARP = 0.03;
const WARP_SCROLL = 0.02;
// How fast the clouds move at rest, and how many times faster when stirred.
const SPEED = 3.5;
const SPEED_SCROLL = 5.5;
// Scroll speed (px/s) that counts as fully stirred; how fast it builds up
// and dies down again (share per frame).
const STIR_AT = 1800;
const STIR_UP = 0.15;
const STIR_DOWN = 0.025;
const MAX_DPR = 1.25;
// The clouds also drift left to right: DRIFT picture widths a second at rest
// (a little faster when stirred). The picture repeats sideways; where it
// runs out it melts into its own start over SEAM of its width.
const DRIFT = 0.002;
const DRIFT_SCROLL = 0.3;
const SEAM = 0.18;

const VERTEX = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAGMENT = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec2 u_cover;   // how much of the picture shows (background-size: cover)
uniform float u_time;
uniform float u_warp;
uniform float u_drift;
const float SEAM = ${SEAM.toFixed(3)};

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

// The picture repeated sideways with a period of 1 - SEAM: over the first
// SEAM of each period it fades from the picture's end into its start, so
// the repeat never shows an edge.
vec3 picture(vec2 c) {
  float period = 1.0 - SEAM;
  float s = mod(c.x, period);
  float y = clamp(c.y, 0.001, 0.999);
  vec3 col = texture2D(u_image, vec2(s, y)).rgb;
  if (s < SEAM) {
    vec3 end = texture2D(u_image, vec2(s + period, y)).rgb;
    col = mix(end, col, smoothstep(0.0, 1.0, s / SEAM));
  }
  return col;
}

void main() {
  // The picture's coordinates, cropped like CSS background-size: cover.
  vec2 uv = (v_uv - 0.5) * u_cover + 0.5;
  uv.y = 1.0 - uv.y;

  // A drifting field, bent by another one: swirling rather than waving.
  // Drifting right: we look further left into the picture as time goes on.
  uv.x -= u_drift;
  vec2 p = uv * vec2(3.0, 1.7);
  float t = u_time;
  vec2 bend = vec2(fbm(p + vec2(0.05 * t, 0.02 * t)), fbm(p + vec2(5.2 - 0.03 * t, 1.3 + 0.04 * t)));
  vec2 q = p + 1.6 * bend;
  vec2 warp = vec2(fbm(q + vec2(0.02 * t, -0.03 * t)), fbm(q + vec2(3.1, 7.7) + vec2(-0.025 * t, 0.02 * t))) - 0.5;

  vec3 sky = picture(uv + warp * u_warp);
  // A soft light rolling through the clouds with the same field.
  sky *= 0.965 + 0.07 * fbm(q * 0.8 - vec2(0.01 * t));
  gl_FragColor = vec4(sky, 1.0);
}
`;

export function setupSky() {
  const canvas = document.querySelector('.backdrop-sky');
  if (!canvas || !matchMedia(MOTION).matches) return;
  // Phones and tablets get the still picture (the .backdrop's own
  // background, the same image): a full-screen shader every frame costs them
  // battery and smoothness for little.
  // (html.no-sky, set before first paint in index.html, gives them the
  // merged picture as the background.)
  if (isTouchDevice()) {
    document.documentElement.classList.add('no-sky');
    canvas.hidden = true;
    return;
  }
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: true });
  if (!gl) return;
  const program = link(gl, VERTEX, FRAGMENT);
  if (!program) return;
  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const uCover = gl.getUniformLocation(program, 'u_cover');
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uWarp = gl.getUniformLocation(program, 'u_warp');
  const uDrift = gl.getUniformLocation(program, 'u_drift');

  const image = new Image();
  image.src = IMAGE;
  image.decode().then(() => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Not a power of two: clamp and no mipmaps (WebGL 1).
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

    const resize = () => {
      // Soft clouds don't need every pixel of a 4K screen: the canvas is
      // capped at MAX_PIXELS and the browser scales it up.
      const dpr = Math.min(devicePixelRatio || 1, MAX_DPR, Math.sqrt(MAX_PIXELS / (innerWidth * innerHeight)));
      canvas.width = Math.round(innerWidth * dpr);
      canvas.height = Math.round(innerHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      // cover: the picture fills the screen, cropped on the overflowing axis.
      const screen = innerWidth / innerHeight;
      const picture = image.naturalWidth / image.naturalHeight;
      gl.uniform2f(uCover, screen > picture ? 1 : screen / picture, screen > picture ? picture / screen : 1);
    };
    resize();
    addEventListener('resize', resize);

    let time = 0;
    let drift = 0;
    let stir = 0;
    let last = performance.now();
    let lastScroll = scrollY;
    const frame = (now) => {
      requestAnimationFrame(frame);
      // At rest the clouds only drift: every other frame is plenty. While
      // the page scrolls (and they billow) every frame is drawn.
      if (stir < 0.02 && scrollY === lastScroll && now - last < REST_FRAME) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const speed = dt ? Math.abs(scrollY - lastScroll) / dt : 0;
      lastScroll = scrollY;
      const target = Math.min(speed / STIR_AT, 1);
      stir += (target - stir) * (target > stir ? STIR_UP : STIR_DOWN);
      time += dt * SPEED * (1 + stir * SPEED_SCROLL);
      drift = (drift + dt * DRIFT * (1 + stir * DRIFT_SCROLL)) % 1000;

      gl.uniform1f(uTime, time);
      gl.uniform1f(uDrift, drift);
      gl.uniform1f(uWarp, WARP + WARP_SCROLL * stir);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    requestAnimationFrame(frame);
  });
}

function link(gl, vertex, fragment) {
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vs = compile(gl.VERTEX_SHADER, vertex);
  const fs = compile(gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}
