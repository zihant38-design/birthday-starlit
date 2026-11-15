// Self-contained fireworks simulation. Coordinates and dimensions are CSS pixels;
// deltas and choreography are in seconds. There is no private animation loop.
// The caller can draw the transparent layer once and mirror that exact frame.
import { config } from "./config.js";
import {
  SHAPES,
  COLORS,
  resolveShape,
  chooseColor,
  emitShape,
} from "./firework-shapes.js";

export { SHAPES };
export const SHOW_DURATION = 54;
const TAU = Math.PI * 2;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const range = (min, max) => min + (max - min) * Math.random();
const finite = (value) => typeof value === "number" && Number.isFinite(value);

// Cues indicate launch time. Time-of-flight varies with the shell and its
// altitude, so the quieter spaces around the lettering are intentional.
const score = [
  // I. A single warm point answers the lantern. Leave the shoreline dark.
  [0.35, 0.34, 0.52, "peony", 1, 0.73],
  [2.95, 0.68, 0.5, "rings", 0, 0.72],
  [5.42, 0.46, 0.49, "palm", 1, 0.79],
  [8.2, 0.73, 0.55, "beads", 3, 0.68],
  [9.65, 0.25, 0.52, "chrysanthemum", 0, 0.78],
  [12.2, 0.54, 0.49, "butterfly", 2, 0.81],
  // II. The lake opens up. Alternate sharp outlines with slow cascading tails.
  [15.35, 0.24, 0.48, "willow", 1, 0.83],
  [15.94, 0.75, 0.52, "star", 3, 0.83],
  [17.55, 0.53, 0.47, "flower", 2, 0.93],
  [19.61, 0.24, 0.53, "spiral", 0, 0.81],
  [20.21, 0.76, 0.51, "crossette", 3, 0.76],
  [22.42, 0.51, 0.52, "double", 2, 0.94],
  [23.79, 0.21, 0.54, "crackle", 1, 0.72],
  [24.47, 0.77, 0.49, "beads", 0, 0.76],
  [25.92, 0.54, 0.46, "meteors", 3, 0.87],
  [27.8, 0.47, 0.62, "fan", 1, 0.9],
  [29.21, 0.19, 0.52, "palm", 2, 0.67],
  [29.64, 0.82, 0.51, "palm", 0, 0.67],
  [31.24, 0.37, 0.5, "flower", 0, 0.8],
  [31.69, 0.68, 0.5, "rings", 1, 0.78],
  [33.08, 0.52, 0.49, "text", 1, 0.99, "name"],
  // III. The flanks bloom around a central inscription. No shells cross it.
  [37.23, 0.19, 0.56, "crossette", 3, 0.68],
  [37.69, 0.82, 0.53, "crackle", 2, 0.71],
  [38.55, 0.34, 0.49, "chrysanthemum", 0, 0.83],
  [38.96, 0.69, 0.48, "peony", 3, 0.84],
  [39.91, 0.5, 0.61, "fan", 1, 0.84],
  [40.87, 0.16, 0.55, "double", 0, 0.69],
  [41.2, 0.84, 0.53, "double", 2, 0.7],
  [41.93, 0.31, 0.51, "star", 3, 0.71],
  [42.38, 0.71, 0.5, "butterfly", 2, 0.73],
  [43.4, 0.5, 0.51, "text", 1, 1.12, "age"],
  [45.02, 0.14, 0.59, "rings", 0, 0.59],
  [45.48, 0.86, 0.58, "rings", 3, 0.59],
  [47.42, 0.28, 0.5, "willow", 1, 0.78],
  [47.93, 0.72, 0.5, "willow", 1, 0.78],
  [49.27, 0.5, 0.49, "willow", 1, 0.91],
];

// Fixed allocation: a dense active array makes iteration cache-friendly. Removal
// swaps in the last slot; the displaced object and its trail return to a free
// list. The index being iterated never invalidates any external references.
class Pool {
  constructor(capacity, create) {
    this.capacity = capacity;
    this.items = [];
    this.spare = [];
    this.create = create;
    this.allocated = 0;
  }

  acquire(limit = this.capacity) {
    if (this.items.length >= limit || this.items.length >= this.capacity)
      return null;
    let item = this.spare.pop();
    if (!item) {
      item = this.create();
      this.allocated++;
    }
    this.items.push(item);
    return item;
  }

  release(index) {
    const item = this.items[index];
    const tail = this.items.pop();
    if (index < this.items.length) this.items[index] = tail;
    this.spare.push(item);
  }

  clear() {
    while (this.items.length) this.spare.push(this.items.pop());
  }

  dispose() {
    this.items.length = 0;
    this.spare.length = 0;
    this.allocated = 0;
  }
}

const TRAIL_POINTS = 13;
class Trail {
  constructor() {
    this.xy = new Float32Array(TRAIL_POINTS * 2);
    this.start = 0;
    this.length = 0;
    this.elapsed = 0;
  }

  reset(x, y) {
    this.start = 0;
    this.length = 1;
    this.elapsed = 0;
    this.xy[0] = x;
    this.xy[1] = y;
  }

  sample(x, y, dt, seconds, capacity) {
    if (seconds <= 0) return;
    const interval = seconds / Math.max(1, capacity - 1);
    this.elapsed += dt;
    if (this.elapsed < interval) return;
    this.elapsed %= interval;
    let index;
    if (this.length < capacity) {
      index = (this.start + this.length) % TRAIL_POINTS;
      this.length++;
    } else {
      this.start = (this.start + 1) % TRAIL_POINTS;
      index = (this.start + this.length - 1) % TRAIL_POINTS;
    }
    this.xy[index * 2] = x;
    this.xy[index * 2 + 1] = y;
  }

  trace(ctx, x, y, finalFraction = 1) {
    const first =
      (this.start + Math.floor((1 - finalFraction) * (this.length - 1))) %
      TRAIL_POINTS;
    const count = Math.ceil((this.length - 1) * finalFraction) + 1;
    ctx.beginPath();
    ctx.moveTo(this.xy[first * 2], this.xy[first * 2 + 1]);
    for (let i = 1; i < count; i++) {
      const k = ((first + i) % TRAIL_POINTS) * 2;
      ctx.lineTo(this.xy[k], this.xy[k + 1]);
    }
    ctx.lineTo(x, y);
  }

  resize(sx, sy) {
    for (let i = 0; i < this.length; i++) {
      const k = ((this.start + i) % TRAIL_POINTS) * 2;
      this.xy[k] *= sx;
      this.xy[k + 1] *= sy;
    }
  }
}

function particle() {
  return { trail: new Trail() };
}

function rocket() {
  return { trail: new Trail() };
}

const colorStages = new Map();
function mixChannel(a, b, t) {
  return Math.round(a + (b - a) * t)
    .toString(16)
    .padStart(2, "0");
}

function blend(hex, other, t) {
  const a = parseInt(hex.slice(1), 16),
    b = parseInt(other.slice(1), 16);
  return (
    "#" +
    mixChannel(a >> 16, b >> 16, t) +
    mixChannel((a >> 8) & 255, (b >> 8) & 255, t) +
    mixChannel(a & 255, b & 255, t)
  );
}

function palette(color) {
  if (colorStages.has(color)) return colorStages.get(color);
  const stages = {
    fresh: blend(color, "#fff6e4", 0.49),
    bloom: color,
    ember: blend(color, "#ed8b4e", 0.43),
    ash: blend(color, "#d07f60", 0.64),
  };
  if (colorStages.size >= 70) colorStages.clear();
  colorStages.set(color, stages);
  return stages;
}

function shellColor(color) {
  if (typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)) {
    const i = COLORS.indexOf(color);
    return { color, index: i < 0 ? 1 : i };
  }
  const i = Number.isInteger(color)
    ? clamp(color, 0, 3)
    : Math.floor(Math.random() * 4);
  return { color: chooseColor(i), index: i };
}

function safeCanvas(size) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return c;
}

class Sprites {
  constructor() {
    this.glows = new Map();
    this.smoke = null;
  }

  glow(color) {
    let sprite = this.glows.get(color);
    if (sprite) return sprite;
    sprite = safeCanvas(48);
    if (!sprite) return null;
    const ctx = sprite.getContext("2d");
    if (!ctx) return null;
    const g = ctx.createRadialGradient(24, 24, 0, 24, 24, 24);
    g.addColorStop(0, "#fff5e7");
    g.addColorStop(0.09, color + "ef");
    g.addColorStop(0.27, color + "62");
    g.addColorStop(0.59, color + "1a");
    g.addColorStop(1, color + "00");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 48, 48);
    if (this.glows.size > 40) this.glows.clear();
    this.glows.set(color, sprite);
    return sprite;
  }

  haze() {
    if (this.smoke) return this.smoke;
    const sprite = safeCanvas(72);
    if (!sprite) return null;
    const ctx = sprite.getContext("2d");
    if (!ctx) return null;
    const g = ctx.createRadialGradient(35, 35, 0, 36, 36, 36);
    g.addColorStop(0, "rgba(168,155,176,.52)");
    g.addColorStop(0.43, "rgba(144,134,157,.36)");
    g.addColorStop(0.83, "rgba(107,105,134,.09)");
    g.addColorStop(1, "rgba(92,93,122,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 72, 72);
    this.smoke = sprite;
    return sprite;
  }

  dispose() {
    this.glows.clear();
    this.smoke = null;
  }
}

export class Fireworks {
  constructor({
    onSound = () => {},
    onBurst = () => {},
    reduced = false,
  } = {}) {
    this.onSound = onSound;
    this.onBurst = onBurst;
    this.reduced = Boolean(reduced);
    this.width = 1;
    this.height = 1;
    this.elapsed = 0;
    this.showTime = 0;
    this.playing = false;
    this.completed = false;
    this.disposed = false;
    this.frameCost = 1 / 60;
    this.lowTime = 0;
    this.fastTime = 0;
    this.quality = this.reduced ? 0 : 2;
    this.nextCue = 0;
    this.freeIndex = 0;
    this.motion = new Pool(3000, particle);
    this.rockets = new Pool(15, rocket);
    this.clouds = new Pool(52, () => ({}));
    this.flares = new Pool(25, () => ({}));
    this.sprites = new Sprites();
    this.events = [];
    this.wind = range(-0.007, 0.007);
    this.manualLaunchTimes = [];
  }

  get done() {
    return this.completed;
  }
  get time() {
    return this.showTime;
  }
  get activeCount() {
    return (
      this.motion.items.length + this.rockets.items.length + this.events.length
    );
  }

  // Exposed so a shared scene-level quality budget can direct both water and sky.
  setQuality(level) {
    this.quality = this.reduced ? 0 : clamp(Math.floor(level), 0, 2);
  }

  get particleLimit() {
    return this.reduced ? 575 : [870, 1650, 2800][this.quality];
  }

  get density() {
    if (this.reduced) return 0.38;
    const horizontal = this.width < 650 ? 0.88 : 1;
    return [0.55, 0.79, 1][this.quality] * horizontal;
  }

  resize(width, height) {
    if (!finite(width) || !finite(height) || width <= 0 || height <= 0) return;
    if (this.disposed) return;
    const oldWidth = this.width,
      oldHeight = this.height;
    const sx = width / oldWidth,
      sy = height / oldHeight;
    this.width = width;
    this.height = height;
    for (const item of this.motion.items) {
      item.x *= sx;
      item.y *= sy;
      item.startX *= sx;
      item.startY *= sy;
      item.targetX *= sx;
      item.targetY *= sy;
      item.vx *= sx;
      item.vy *= sy;
      item.gravity *= sy;
      item.radius *= Math.min(sx, sy);
      item.trail.resize(sx, sy);
    }
    for (const r of this.rockets.items) {
      r.x *= sx;
      r.y *= sy;
      r.startX *= sx;
      r.startY *= sy;
      r.targetX *= sx;
      r.targetY *= sy;
      r.sway *= sx;
      r.trail.resize(sx, sy);
    }
    for (const p of this.clouds.items) {
      p.x *= sx;
      p.y *= sy;
      p.size *= Math.min(sx, sy);
    }
    for (const f of this.flares.items) {
      f.x *= sx;
      f.y *= sy;
      f.radius *= Math.min(sx, sy);
    }
    for (const event of this.events) {
      event.x *= sx;
      event.y *= sy;
      event.radius *= Math.min(sx, sy);
    }
  }

  startShow() {
    if (this.disposed) return;
    this.clear();
    this.showTime = 0;
    this.nextCue = 0;
    this.playing = true;
    this.completed = false;
  }

  // Unlike dispose(), clearing a replay retains the allocated trail buffers.
  clear() {
    this.motion.clear();
    this.rockets.clear();
    this.clouds.clear();
    this.flares.clear();
    this.events.length = 0;
    this.manualLaunchTimes.length = 0;
    this.freeIndex = 0;
  }

  launch(x, y, type, power = 1, color) {
    if (this.disposed || !finite(x) || !finite(y)) return false;
    if (type && typeof type === "object") {
      const options = type;
      type = options.type || options.id;
      power = options.power ?? power;
      color = options.color ?? color;
    }
    // Multiple taps still get visible flight trails; protect long-held fingers
    // and 120Hz touch sources from enqueuing an unbounded barrage.
    while (
      this.manualLaunchTimes.length &&
      this.elapsed - this.manualLaunchTimes[0] > 0.75
    ) {
      this.manualLaunchTimes.shift();
    }
    if (this.manualLaunchTimes.length >= (this.reduced ? 3 : 6)) return false;
    this.manualLaunchTimes.push(this.elapsed);
    const picked =
      type == null ? SHAPES[this.freeIndex++ % SHAPES.length].id : type;
    const letters =
      picked === "name" || picked === config.name
        ? config.name
        : String(config.age);
    return Boolean(
      this.launchShell(x, y, resolveShape(picked), power, color, letters, true),
    );
  }

  launchShell(x, y, id, power, value, text, atFinger = false) {
    const r = this.rockets.acquire(this.reduced ? 5 : 12);
    if (!r) return null;
    const { color, index } = shellColor(value);
    const w = this.width,
      h = this.height;
    r.type = id;
    r.color = color;
    r.colorIndex = index;
    r.text = text;
    r.power = clamp(finite(power) ? power : 1, 0.5, 1.58);
    r.targetX = atFinger ? clamp(x, 0, w) : clamp(x, w * 0.06, w * 0.94);
    r.targetY = atFinger ? clamp(y, 0, h * 0.8) : clamp(y, h * 0.32, h * 0.65);
    r.startX = clamp(r.targetX + range(-0.15, 0.15) * w, 0.08 * w, 0.92 * w);
    r.startY = h * 0.8;
    r.x = r.startX;
    r.y = r.startY;
    r.age = 0;
    r.life = 0.62 + ((r.startY - r.targetY) / h) * 0.62 + range(0, 0.12);
    r.sway = range(-0.023, 0.023) * w;
    r.trail.reset(r.x, r.y);
    r.emberIn = 0;
    this.onSound("launch");
    return r;
  }

  adapt(dt) {
    if (this.reduced || dt <= 0 || dt > 0.14) return;
    this.frameCost += (dt - this.frameCost) * 0.034;
    this.lowTime = this.frameCost > 0.03 ? this.lowTime + dt : 0;
    this.fastTime = this.frameCost < 0.019 ? this.fastTime + dt : 0;
    if (this.lowTime > 2 && this.quality > 0) {
      this.quality--;
      this.lowTime = this.fastTime = 0;
    } else if (this.fastTime > 12 && this.quality < 2) {
      this.quality++;
      this.lowTime = this.fastTime = 0;
    }
  }

  update(dt) {
    if (this.disposed || !finite(dt) || dt <= 0) return;
    // Do not fast-forward a minute of fireworks when a suspended tab resumes.
    dt = Math.min(0.12, dt);
    this.adapt(dt);
    let remaining = dt;
    while (remaining > 0.000001) {
      const step = Math.min(1 / 48, remaining);
      this.advance(step);
      remaining -= step;
    }
  }

  advance(dt) {
    this.elapsed += dt;
    if (this.playing) {
      this.showTime = Math.min(SHOW_DURATION, this.showTime + dt);
      while (
        this.nextCue < score.length &&
        score[this.nextCue][0] <= this.showTime
      ) {
        const cue = score[this.nextCue++];
        this.launchShell(
          cue[1] * this.width,
          cue[2] * this.height,
          cue[3],
          cue[5],
          cue[4],
          cue[6] === "name" ? config.name : String(config.age),
        );
      }
      if (this.showTime >= SHOW_DURATION) {
        this.playing = false;
        this.completed = true;
      }
    }
    this.advanceRockets(dt);
    this.advanceEvents(dt);
    this.advanceStars(dt);
    this.advanceClouds(dt);
    for (let i = this.flares.items.length - 1; i >= 0; i--) {
      const flare = this.flares.items[i];
      flare.age += dt;
      if (flare.age >= flare.life) this.flares.release(i);
    }
  }

  advanceRockets(dt) {
    for (let i = this.rockets.items.length - 1; i >= 0; i--) {
      const r = this.rockets.items[i];
      r.age += dt;
      const u = clamp(r.age / r.life, 0, 1);
      const ease = 1 - Math.pow(1 - u, 1.7);
      r.x =
        r.startX + (r.targetX - r.startX) * u + Math.sin(u * Math.PI) * r.sway;
      r.y = r.startY + (r.targetY - r.startY) * ease;
      r.trail.sample(r.x, r.y, dt, this.reduced ? 0.13 : 0.25, 10);
      r.emberIn -= dt;
      if (!this.reduced && r.emberIn <= 0 && u > 0.08 && u < 0.91) {
        r.emberIn = range(0.048, 0.1);
        this.tracerEmber(r.x, r.y, r.color);
      }
      if (u >= 1) {
        this.burst(r);
        this.rockets.release(i);
      }
    }
  }

  radiusFor(r) {
    const h = this.height,
      w = this.width;
    const base = Math.min(w * 0.194, h * 0.19) * r.power;
    const cap =
      r.type === "text" && r.text === config.name
        ? Math.min(r.x, w - r.x) * 0.56
        : Math.min(w * 0.25, h * 0.235);
    // Make shells at unusually high touch points compact enough to protect the
    // inscription area. The shared sky clip provides one final soft boundary.
    return Math.max(7, Math.min(base, cap, (r.y - h * 0.245) * 0.95));
  }

  burst(r) {
    const radius = this.radiusFor(r);
    const shell = {
      color: r.color,
      colorIndex: r.colorIndex,
      text: r.text,
      density: this.density,
      radius,
    };
    const soundPower = this.reduced ? r.power * 0.65 : r.power;
    this.onSound("burst");
    this.onBurst(r.x, r.y, r.color, soundPower);
    this.addFlare(r.x, r.y, r.color, radius * 0.56, this.reduced ? 0.13 : 0.29);
    if (!this.reduced) this.addSmoke(r.x, r.y, radius, r.power);
    emitShape(r.type, shell, (spec) => {
      if (spec.delay > 0) {
        this.events.push({
          after: spec.delay,
          x: r.x,
          y: r.y,
          radius,
          color: r.color,
          spec,
        });
      } else {
        this.spawn(r.x, r.y, radius, r.color, spec);
      }
    });
    if (r.power >= 1.16) this.chargedRings(r, radius);
  }

  // A charged touch launches one projectile. Two delayed concentric coronas
  // make its second ignition visible even near the upper safe-area boundary,
  // where the first shell's expansion radius must stay small.
  chargedRings(r, radius) {
    const charge = clamp((r.power - 1.16) / 0.42, 0, 1);
    const rings = [
      { delay: 0.26, speed: 0.68, color: "#ffe4a5", width: 1.65 },
      { delay: 0.54, speed: 1.36, color: "#d7beff", width: 1.28 },
    ];
    for (const [band, ring] of rings.entries()) {
      const total = Math.max(
        16,
        Math.round((31 + charge * 24 + band * 5) * this.density),
      );
      for (let i = 0; i < total; i++) {
        const angle = (TAU * (i + band * 0.5)) / total;
        this.events.push({
          after: ring.delay,
          x: r.x,
          y: r.y,
          radius,
          color: ring.color,
          spec: {
            vx: Math.cos(angle) * ring.speed,
            vy: Math.sin(angle) * ring.speed * 0.81,
            color: ring.color,
            drag: 1.12,
            gravity: 0.1,
            width: ring.width,
            trail: band ? 0.28 : 0.14,
            life: 1.36 + charge * 0.43,
            glint: !this.reduced && i % 7 === 0,
          },
        });
      }
    }
  }

  advanceEvents(dt) {
    for (let i = this.events.length - 1; i >= 0; i--) {
      const e = this.events[i];
      e.after -= dt;
      if (e.after > 0) continue;
      this.spawn(e.x, e.y, e.radius, e.color, e.spec);
      this.events[i] = this.events[this.events.length - 1];
      this.events.pop();
    }
  }

  spawn(originX, originY, radius, fallback, spec) {
    const p = this.motion.acquire(this.particleLimit);
    if (!p) return null;
    p.radius = radius;
    p.x = originX + (spec.x || 0) * radius;
    p.y = originY + (spec.y || 0) * radius;
    p.startX = p.x;
    p.startY = p.y;
    p.vx = (spec.vx || 0) * radius;
    p.vy = (spec.vy || 0) * radius;
    p.gravity = (spec.gravity ?? 0.2) * radius;
    p.drag = spec.drag ?? 1.15;
    p.spin = spec.spin || 0;
    p.life = spec.life || 1.68;
    p.age = 0;
    p.hold = spec.hold || 0;
    p.targetX = originX + (spec.targetX || 0) * radius;
    p.targetY = originY + (spec.targetY || 0) * radius;
    p.trailDuration = this.reduced
      ? Math.min(0.24, spec.trail ?? 0.22)
      : (spec.trail ?? 0.22);
    p.trail.reset(p.x, p.y);
    p.base = spec.color || fallback;
    p.colors = palette(p.base);
    // Scale core sizes more gently than trajectories. A one-pixel core remains
    // visible on a small phone without becoming a giant spark on a large TV.
    p.size =
      (spec.width ?? 1.26) *
      clamp(Math.pow(Math.min(this.width, this.height) / 540, 0.28), 0.8, 1.4);
    p.glint = Boolean(spec.glint);
    p.hot = spec.hot ?? 0.22;
    p.flicker = this.reduced ? 0 : (spec.flicker ?? 0.09);
    p.phase = range(0, TAU);
    p.split = spec.split || "";
    p.splitAt = spec.splitAt ?? Infinity;
    p.shed = spec.shed || "";
    p.shedPeriod = spec.shedPeriod || 0.15;
    p.shedIn = p.shedPeriod;
    p.isEmber = Boolean(spec.isEmber);
    return p;
  }

  advanceStars(dt) {
    const cap = this.reduced ? 5 : this.quality === 0 ? 7 : TRAIL_POINTS;
    const dampCache = new Map();
    for (let i = this.motion.items.length - 1; i >= 0; i--) {
      const p = this.motion.items[i];
      p.age += dt;
      if (
        p.age >= p.life ||
        p.y > this.height * 0.81 ||
        p.x < -this.width * 0.09 ||
        p.x > this.width * 1.09
      ) {
        this.motion.release(i);
        continue;
      }
      if (p.hold > 0 && p.age < p.hold) {
        this.advanceGlyph(p);
      } else {
        let damping = dampCache.get(p.drag);
        if (damping === undefined) {
          damping = Math.exp(-p.drag * dt);
          dampCache.set(p.drag, damping);
        }
        if (p.spin) {
          const angle = p.spin * dt,
            co = Math.cos(angle),
            si = Math.sin(angle);
          const vx = p.vx * co - p.vy * si;
          p.vy = p.vx * si + p.vy * co;
          p.vx = vx;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx = p.vx * damping + this.width * this.wind * dt;
        p.vy = p.vy * damping + p.gravity * dt;
      }
      p.trail.sample(p.x, p.y, dt, p.trailDuration, cap);
      if (p.split && p.age >= p.splitAt) {
        this.secondary(p);
        p.split = "";
        p.life = Math.min(p.life, p.age + 0.072);
      }
      if (p.shed && p.age < p.life * 0.84) {
        p.shedIn -= dt;
        if (p.shedIn <= 0) {
          this.shed(p);
          p.shedIn +=
            p.shedPeriod * (this.reduced ? 2.8 : this.quality === 0 ? 1.55 : 1);
        }
      }
    }
  }

  advanceGlyph(p) {
    const u = Math.min(1, p.age / 0.71);
    const ease = 1 - Math.pow(1 - u, 3);
    const spread = Math.sin(Math.PI * u) * p.radius;
    p.x =
      p.startX +
      (p.targetX - p.startX) * ease +
      Math.sin(p.phase) * spread * 0.11;
    p.y = p.startY + (p.targetY - p.startY) * ease - spread * 0.12;
    if (u >= 1) {
      p.vx = Math.sin(p.phase) * p.radius * 0.025;
      p.vy = p.radius * 0.065;
    }
  }

  tracerEmber(x, y, color) {
    if (this.motion.items.length > this.particleLimit * 0.7) return;
    this.spawn(x, y, Math.min(this.width, this.height) * 0.07, color, {
      vx: range(-0.12, 0.12),
      vy: range(0.02, 0.18),
      gravity: 0.42,
      drag: 0.65,
      life: range(0.24, 0.5),
      width: range(0.52, 0.86),
      trail: 0.13,
      color: "#ffe1a8",
      isEmber: true,
    });
  }

  shed(p) {
    if (this.motion.items.length > this.particleLimit * 0.86) return;
    if (p.shed === "bead") {
      this.spawn(p.x, p.y, p.radius, p.base, {
        vx: 0,
        vy: 0.02,
        gravity: 0.085,
        drag: 1,
        life: 0.97,
        width: 1.65,
        trail: 0,
        isEmber: true,
        flicker: 0.035,
      });
    } else if (p.shed === "leaf") {
      const side = Math.sin(p.age * 61) > 0 ? 1 : -1;
      this.spawn(p.x, p.y, p.radius, p.base, {
        vx: (p.vx / p.radius) * 0.26 + side * 0.27,
        vy: (p.vy / p.radius) * 0.3 + 0.15,
        gravity: 0.51,
        drag: 1.65,
        width: 0.85,
        trail: 0.25,
        life: range(0.45, 0.78),
        color: "#ffe6b5",
        isEmber: true,
      });
    } else {
      const gold = p.shed === "gold";
      this.spawn(p.x, p.y, p.radius, p.base, {
        vx: (p.vx / p.radius) * 0.32 + range(-0.075, 0.075),
        vy: (p.vy / p.radius) * 0.21 + range(0.035, 0.18),
        gravity: gold ? 0.48 : 0.22,
        drag: 1.4,
        life: gold ? range(0.55, 1.27) : range(0.34, 0.58),
        width: gold ? 0.83 : 0.69,
        trail: gold ? 0.2 : 0.14,
        color: gold ? "#ffc577" : "#ede2ff",
        isEmber: true,
        flicker: 0.2,
      });
    }
  }

  secondary(parent) {
    const r = parent.radius;
    if (parent.split === "cross") {
      const offset = Math.PI / 4;
      for (let j = 0; j < 4; j++) {
        const a = offset + (Math.PI / 2) * j;
        this.spawn(parent.x, parent.y, r, parent.base, {
          vx: Math.cos(a) * 0.7 + (parent.vx / r) * 0.09,
          vy: Math.sin(a) * 0.7 + (parent.vy / r) * 0.09,
          life: 0.83,
          gravity: 0.18,
          drag: 0.95,
          trail: 0.33,
          width: 1.39,
          color: parent.colors.fresh,
        });
      }
    } else if (parent.split === "crackle") {
      const pieces = Math.max(5, Math.round(14 * this.density));
      const rot = range(0, TAU);
      for (let j = 0; j < pieces; j++) {
        const a = rot + (j * TAU) / pieces,
          speed = range(0.2, 0.56);
        this.spawn(parent.x, parent.y, r, parent.base, {
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          gravity: 0.26,
          drag: 1.7,
          trail: 0.141,
          life: range(0.32, 0.68),
          width: range(0.7, 1.39),
          color: j % 3 ? parent.base : "#fff6bb",
          flicker: 0.31,
        });
      }
      this.addFlare(parent.x, parent.y, parent.base, r * 0.185, 0.14);
    } else {
      const rays = Math.max(20, Math.round(79 * this.density));
      for (let j = 0; j < rays; j++) {
        const a = (j / rays) * TAU,
          k = j % 2 ? 1.18 : 0.75;
        this.spawn(parent.x, parent.y, r, parent.base, {
          vx: Math.cos(a) * k,
          vy: Math.sin(a) * k,
          gravity: 0.16,
          drag: 1.17,
          trail: 0.27,
          life: range(1.25, 1.75),
          width: 1.46,
          color: j % 3 ? parent.base : "#fff1c4",
          glint: j % 7 === 0,
        });
      }
      this.addFlare(parent.x, parent.y, parent.base, r * 0.44, 0.22);
      this.onBurst(parent.x, parent.y, parent.base, 0.47);
      this.onSound("burst");
    }
  }

  addFlare(x, y, color, radius, life) {
    const f = this.flares.acquire(this.reduced ? 4 : 17);
    if (!f) return;
    Object.assign(f, { x, y, color, radius, life, age: 0 });
  }

  addSmoke(x, y, radius, power) {
    const count = this.quality === 0 ? 2 : 4;
    for (let i = 0; i < count; i++) {
      const p = this.clouds.acquire();
      if (!p) return;
      Object.assign(p, {
        x: x + range(-0.2, 0.2) * radius,
        y: y + range(-0.12, 0.12) * radius,
        size: range(0.26, 0.55) * radius,
        phase: range(0, TAU),
        life: range(1.3, 2.9),
        age: 0,
        opacity: 0.13 * power,
        dx: range(-0.035, 0.044) * radius,
        dy: -range(0.03, 0.094) * radius,
      });
    }
  }

  advanceClouds(dt) {
    for (let i = this.clouds.items.length - 1; i >= 0; i--) {
      const p = this.clouds.items[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.clouds.release(i);
        continue;
      }
      p.x += p.dx * dt;
      p.y += p.dy * dt;
    }
  }

  draw(ctx) {
    if (this.disposed || !ctx) return;
    ctx.save();
    // This clip applies equally to the visible sky and the reflected source.
    // The soft edge below the inscription is faded per particle, not erased
    // from the caller's canvas, which might already contain scenery.
    ctx.beginPath();
    ctx.rect(0, this.height * 0.245, this.width, this.height * 0.565);
    ctx.clip();
    this.drawHaze(ctx);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    this.drawRockets(ctx);
    this.drawParticles(ctx);
    this.drawFlares(ctx);
    ctx.restore();
  }

  drawHaze(ctx) {
    if (this.reduced || !this.clouds.items.length) return;
    const sprite = this.sprites.haze();
    if (!sprite) return;
    ctx.globalCompositeOperation = "source-over";
    for (const p of this.clouds.items) {
      const u = p.age / p.life,
        diameter = p.size * (1 + 1.85 * u);
      ctx.globalAlpha = Math.sin(Math.PI * u) * p.opacity;
      ctx.drawImage(
        sprite,
        p.x - diameter * 0.7,
        p.y - diameter * 0.5,
        diameter * 1.4,
        diameter,
      );
    }
    ctx.globalAlpha = 1;
  }

  drawRockets(ctx) {
    for (const r of this.rockets.items) {
      const u = r.age / r.life;
      const alpha = Math.min(1, 0.32 + u * 6);
      r.trail.trace(ctx, r.x, r.y);
      ctx.lineWidth = 3;
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = alpha * 0.28;
      ctx.stroke();
      r.trail.trace(ctx, r.x, r.y, 0.72);
      ctx.lineWidth = 1.18;
      ctx.strokeStyle = "#fff1d4";
      ctx.globalAlpha = alpha * 0.91;
      ctx.stroke();
      const sprite = this.sprites.glow(r.color);
      if (sprite) ctx.drawImage(sprite, r.x - 5.6, r.y - 5.6, 11.2, 11.2);
    }
  }

  drawParticles(ctx) {
    const top = this.height * 0.245,
      soft = this.height * 0.06;
    const busy = this.motion.items.length > this.particleLimit * 0.68;
    const trailBoost = !busy && this.quality > 0 && !this.reduced;
    for (const p of this.motion.items) {
      if (p.y < top || p.y > this.height * 0.803) continue;
      const u = p.age / p.life;
      const fade = u < 0.62 ? 1 : Math.pow(Math.max(0, (1 - u) / 0.38), 0.79);
      const scintillation =
        u < 0.29
          ? 1
          : 1 - p.flicker * (0.5 + 0.5 * Math.sin(p.age * 22 + p.phase));
      const alpha = fade * scintillation * clamp((p.y - top) / soft, 0, 1);
      if (alpha < 0.025) continue;
      const color =
        u < p.hot
          ? p.colors.fresh
          : u < 0.63
            ? p.colors.bloom
            : u < 0.85
              ? p.colors.ember
              : p.colors.ash;
      const diameter = p.size * (1.72 - 0.65 * u);
      if (p.trailDuration > 0 && p.trail.length > 1) {
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha * (p.isEmber ? 0.46 : 0.66);
        ctx.lineWidth = Math.max(
          0.54,
          p.size * (p.trailDuration > 0.4 ? 1.05 : 0.85),
        );
        p.trail.trace(ctx, p.x, p.y);
        ctx.stroke();
        if (trailBoost && !p.isEmber && p.trailDuration > 0.36) {
          ctx.lineWidth = Math.max(0.5, p.size * 0.61);
          ctx.strokeStyle = p.colors.fresh;
          ctx.globalAlpha = alpha * 0.74;
          p.trail.trace(ctx, p.x, p.y, 0.43);
          ctx.stroke();
        }
      }
      if (p.hold && p.age > 0.78 && p.age < p.hold && p.glint) {
        const brightness = 0.55 + 0.35 * Math.sin(p.age * 3 + p.phase);
        ctx.globalAlpha = alpha * brightness * 0.38;
        ctx.fillStyle = color;
        ctx.fillRect(p.x - diameter * 2.5, p.y - 0.48, diameter * 5, 0.96);
        ctx.fillRect(p.x - 0.48, p.y - diameter * 2.5, 0.96, diameter * 5);
      }
      if (p.glint && (!busy || p.hold) && !this.reduced) {
        const size = diameter * (p.hold ? 4.3 : 5.3);
        const sprite = this.sprites.glow(color);
        ctx.globalAlpha = alpha * 0.69;
        if (sprite)
          ctx.drawImage(sprite, p.x - size * 0.5, p.y - size * 0.5, size, size);
      }
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      if (diameter > 2.1 && !busy) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, diameter * 0.52, 0, TAU);
        ctx.fill();
      } else {
        ctx.fillRect(
          p.x - diameter * 0.5,
          p.y - diameter * 0.5,
          diameter,
          diameter,
        );
      }
    }
  }

  drawFlares(ctx) {
    for (const f of this.flares.items) {
      const u = f.age / f.life;
      const sprite = this.sprites.glow(f.color);
      if (!sprite) continue;
      const diameter = f.radius * (1 + u * 1.8);
      ctx.globalAlpha = (1 - u) * (1 - u) * (this.reduced ? 0.41 : 0.73);
      ctx.drawImage(
        sprite,
        f.x - diameter * 0.5,
        f.y - diameter * 0.5,
        diameter,
        diameter,
      );
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.playing = false;
    this.completed = true;
    this.clear();
    this.motion.dispose();
    this.rockets.dispose();
    this.flares.dispose();
    this.clouds.dispose();
    this.sprites.dispose();
    this.onBurst = () => {};
    this.onSound = () => {};
  }
}
