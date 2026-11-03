// The mouse drags a trail of black tattoo ink behind it. Blobs are dropped
// along the pointer's path; each swells a touch, thins out and is gone within
// about a second, some running down a little as they go, and fast strokes
// flick off small droplets. One WebGL pass adds the blobs up into a single
// field (metaballs), so neighbouring blobs flow into each other like liquid,
// and lights that field from the top-left so the ink has a wet sheen. It only
// draws where there is ink and stops when there is none. Mouse only, and
// not when the visitor prefers reduced motion.

const SPACING = 6; // px of pointer travel between blobs
const WIDTH = 11; // px, half the trail's thickness at its fullest
// Blobs this close add up along the path: a row of them reaches a
// half-thickness of about π·r²/SPACING, so each blob's own radius is chosen
// to make that come out at WIDTH.
const RADIUS = Math.sqrt((WIDTH * SPACING) / Math.PI);
const LIFE = [0.75, 1.05]; // seconds a blob lasts
const DRIP_CHANCE = 0.35; // share of blobs that run down…
const DRIP = [10, 28]; // …this far (px) over their life
const SPLASH_SPEED = 1400; // px/s above which strokes flick droplets
const SPLASH_CHANCE = 0.12; // per blob, above that speed
const MAX_BLOBS = 96;
const MAX_DPR = 1.5;

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const fragment = (max) => `
precision highp float;
uniform vec2 u_res;
uniform int u_count;
uniform vec3 u_blobs[${max}];

void main() {
  vec2 p = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);
  float field = 0.0;
  vec2 slope = vec2(0.0);
  for (int i = 0; i < ${max}; i++) {
    if (i >= u_count) break;
    vec3 b = u_blobs[i];
    vec2 d = p - b.xy;
    float d2 = dot(d, d) + 1.0;
    float k = b.z * b.z / d2;
    field += k;
    slope -= 2.0 * k / d2 * d;
  }
  float alpha = smoothstep(0.9, 1.1, field);
  if (alpha <= 0.0) discard;

  // The field as a height: steep at the rim, flat inside. A light from the
  // top-left catches the rim for a wet highlight; the rest stays ink-black.
  vec3 normal = normalize(vec3(-slope * 4.0, 1.0));
  vec3 light = normalize(vec3(-0.5, -0.6, 0.8));
  float shine = pow(max(dot(reflect(-light, normal), vec3(0.0, 0.0, 1.0)), 0.0), 24.0);
  vec3 ink = vec3(0.035, 0.035, 0.045) + shine * 0.45;
  gl_FragColor = vec4(ink * alpha, alpha);
}
`;

export function setupInkTrail() {
  if (!matchMedia('(pointer: fine)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'ink-trail';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false });
  if (!gl) return;

  const max = Math.min(MAX_BLOBS, gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) - 8);
  const program = link(gl, VERTEX, fragment(max));
  if (!program) return;
  document.body.append(canvas);

  gl.useProgram(program);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(program, 'u_res');
  const uCount = gl.getUniformLocation(program, 'u_count');
  const uBlobs = gl.getUniformLocation(program, 'u_blobs');
  gl.clearColor(0, 0, 0, 0);

  let dpr = 1;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };
  resize();
  addEventListener('resize', resize);

  const blobs = [];
  const data = new Float32Array(max * 3);
  let last = null;
  let travelled = 0;
  let running = false;

  const drop = (x, y, radius, now, life) => {
    blobs.push({
      x,
      y,
      radius,
      born: now,
      life,
      drip: Math.random() < DRIP_CHANCE ? random(DRIP) : 0,
    });
    if (blobs.length > max) blobs.shift();
  };

  const move = (event) => {
    if (event.pointerType !== 'mouse') return;
    const now = performance.now() / 1000;
    for (const e of event.getCoalescedEvents?.() ?? [event]) {
      const x = e.clientX;
      const y = e.clientY;
      if (!last) {
        last = { x, y, t: now };
        continue;
      }
      const dx = x - last.x;
      const dy = y - last.y;
      const dist = Math.hypot(dx, dy);
      if (!dist) continue;
      const speed = dist / Math.max(now - last.t, 1 / 240);
      // A blob every SPACING px of travel, exactly — slow moves must not
      // pile blobs up (they would add up into a thicker line).
      travelled += dist;
      while (travelled >= SPACING) {
        travelled -= SPACING;
        const back = travelled / dist;
        const bx = x - dx * back;
        const by = y - dy * back;
        drop(bx, by, RADIUS * random([0.85, 1.15]), now, random(LIFE));
        if (speed > SPLASH_SPEED && Math.random() < SPLASH_CHANCE) {
          // A droplet flicked off sideways.
          const side = (Math.random() < 0.5 ? -1 : 1) * random([10, 26]);
          drop(bx + (-dy / dist) * side, by + (dx / dist) * side, random([2.5, 4.5]), now, random([0.45, 0.7]));
        }
      }
      last = { x, y, t: now };
    }
    if (!running) {
      running = true;
      requestAnimationFrame(frame);
    }
  };

  const frame = () => {
    const now = performance.now() / 1000;
    for (let i = blobs.length - 1; i >= 0; i--) if (now - blobs[i].born > blobs[i].life) blobs.splice(i, 1);

    gl.disable(gl.SCISSOR_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!blobs.length) {
      running = false;
      return;
    }

    // Size along the life: a quick swell, then thinning away; drips run
    // down faster towards the end.
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    blobs.forEach((b, i) => {
      const t = (now - b.born) / b.life;
      const r = b.radius * Math.min(1, 0.6 + t * 4) * Math.pow(1 - t, 0.7) * dpr;
      const x = b.x * dpr;
      const y = (b.y + b.drip * t * t) * dpr;
      data[i * 3] = x;
      data[i * 3 + 1] = y;
      data[i * 3 + 2] = r;
      x0 = Math.min(x0, x - r * 3);
      y0 = Math.min(y0, y - r * 3);
      x1 = Math.max(x1, x + r * 3);
      y1 = Math.max(y1, y + r * 3);
    });

    // Only shade the pixels around the ink (GL's y runs bottom-up).
    gl.enable(gl.SCISSOR_TEST);
    const sx = Math.max(0, Math.floor(x0));
    const sy = Math.max(0, Math.floor(canvas.height - y1));
    gl.scissor(sx, sy, Math.ceil(x1) - sx, Math.ceil(canvas.height - y0) - sy);
    gl.uniform1i(uCount, blobs.length);
    gl.uniform3fv(uBlobs, data);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(frame);
  };

  addEventListener('pointermove', move, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => (last = null));
}

function random([min, max]) {
  return min + Math.random() * (max - min);
}

function link(gl, vertex, fragmentSource) {
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vs = compile(gl.VERTEX_SHADER, vertex);
  const fs = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}
