import { environmentColors } from "./config.js";

// The sky, fireworks and landscape are composed once. The lake samples that
// very buffer, so even fast-changing rockets have a matching reflection.
const HORIZON = 0.8;
const TAU = Math.PI * 2;
const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a) => a * a * (3 - 2 * a);
const rgb = (values) => "rgb(" + values.map(Math.round).join(",") + ")";
const rgba = (r, g, b, a) => "rgba(" + r + "," + g + "," + b + "," + a + ")";

const COLORS = {};
for (const [stage, palette] of Object.entries(environmentColors)) {
  COLORS[stage] = palette.map((hex) => {
    const channels = hex.slice(1).match(/../g);
    return channels.map((channel) => Number.parseInt(channel, 16));
  });
}
const NIGHT = {
  gift: 0.09,
  opening: 0.29,
  cake: 0.67,
  wish: 0.86,
  blow: 0.91,
  fireworks: 1,
  ending: 0.22,
};

function generator(seed) {
  return () =>
    ((seed = (Math.imul(seed, 1664525) + 1013904223) | 0) >>> 0) / 4294967296;
}
function surface() {
  return document.createElement("canvas");
}
function makeNoise() {
  const random = generator(0x32673);
  const values = Float32Array.from({ length: 256 * 256 }, random);
  const sample = (x, y) => values[((y & 255) << 8) | (x & 255)];
  function noise(x, y) {
    const i = Math.floor(x),
      j = Math.floor(y),
      u = smooth(x - i),
      v = smooth(y - j);
    return lerp(
      lerp(sample(i, j), sample(i + 1, j), u),
      lerp(sample(i, j + 1), sample(i + 1, j + 1), u),
      v,
    );
  }
  return (x, y) =>
    noise(x, y) * 0.52 +
    noise(x * 2.13 + 11, y * 2.13) * 0.275 +
    noise(x * 4.21, y * 4.21 + 19) * 0.14 +
    noise(x * 8.43 + 5, y * 8.43) * 0.065;
}

function atmosphericTexture(kind, noise) {
  const layer = surface();
  layer.width = 576;
  layer.height = 300;
  const ctx = layer.getContext("2d"),
    image = ctx.createImageData(layer.width, layer.height);
  const pixels = image.data;
  for (let y = 0; y < layer.height; y++) {
    const v = y / layer.height;
    for (let x = 0; x < layer.width; x++) {
      const u = x / layer.width,
        k = (y * layer.width + x) * 4;
      if (kind === "galaxy") {
        const ridge = 0.96 - 0.86 * u + 0.07 * Math.sin(5 * u + 1);
        const cross = v - ridge;
        const veil = Math.exp((-cross * cross) / 0.026);
        const cloud = noise(10 * u + v * 3, 13 * v);
        const luminous = Math.max(0, cloud - 0.32) * veil;
        const blue = clamp(0.65 * u + noise(4 * u, 4 * v) * 0.45);
        pixels[k] = lerp(255, 173, blue);
        pixels[k + 1] = lerp(190, 195, blue);
        pixels[k + 2] = lerp(161, 255, blue);
        pixels[k + 3] = Math.min(91, luminous * 194);
      } else if (kind === "aurora") {
        // Folds are taller than they are wide, like a veil hanging from a
        // shifting magnetic arc. Both edges taper without a hard outline.
        const lower =
          0.46 + 0.11 * Math.sin(8.4 * u) + 0.045 * Math.cos(17 * u);
        const d = lower - v,
          fold = noise(31 * u + v, 3 * v + 24);
        const beam =
          Math.exp(-Math.max(0, d) * 19) * Math.exp(-Math.max(0, -d) * 88);
        const fade = clamp(1 - ((u - 0.45) / 0.55) ** 2);
        pixels[k] = lerp(154, 194, u);
        pixels[k + 1] = lerp(224, 179, u);
        pixels[k + 2] = 227;
        pixels[k + 3] = Math.min(40, (0.06 + fold ** 2) * beam * fade * 93);
      } else {
        const field = noise(u * 4.8 + 15, v * 18.6 + 22);
        const curled = noise(9 * u + field * 1.9, 18 * v + field * 3.2 + 3);
        const band =
          0.48 * Math.exp(-((v - 0.46) ** 2) / 0.034) +
          0.82 * Math.exp(-((v - 0.81) ** 2) / 0.011);
        const softness = smooth(
          clamp((field * 0.58 + curled * 0.42 - 0.34) / 0.39),
        );
        pixels[k] = 253;
        pixels[k + 1] = lerp(236, 193, 1 - v);
        pixels[k + 2] = lerp(220, 242, 1 - v);
        pixels[k + 3] = Math.min(170, band * softness * 201);
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  return layer;
}

function ridge(u, layer, noise) {
  const horizons = [0.701, 0.741, 0.775],
    amps = [0.078, 0.068, 0.052];
  const sides = clamp(Math.abs(u - 0.52) * 2.05);
  const peaks = noise(u * (3.6 + layer * 0.7) + 13 * layer, 7 + layer * 9);
  return (
    horizons[layer] -
    amps[layer] * (0.32 + sides * 0.82) * peaks -
    sides * sides * (0.015 + layer * 0.012) +
    0.009 * Math.cos(u * 9 + layer * 2.8)
  );
}

// Shoreline paths are deterministic and reused until the viewport changes.
function landscape(w, h, noise) {
  const paths = [],
    random = generator(11556);
  for (let j = 0; j < 3; j++) {
    const p = new Path2D(),
      step = Math.max(1.5, w / 570);
    p.moveTo(0, h * HORIZON + 1);
    for (let x = 0; x <= w + step; x += step)
      p.lineTo(x, ridge(x / w, j, noise) * h);
    p.lineTo(w + step, h * HORIZON + 1);
    p.closePath();
    if (j > 0) {
      for (let x = -4; x < w + 5; ) {
        const side = Math.abs(x / w - 0.5) * 2,
          cluster = noise((x / w) * 15 + j, j * 5);
        const base = ridge(x / w, j, noise) * h + 1;
        const ht =
          (j === 2 ? 1.0 : 0.46) *
          h *
          (0.004 + 0.021 * side * side) *
          (0.36 + random() * 0.82) *
          (0.36 + cluster);
        const breadth = ht * (0.13 + 0.056 * random());
        p.moveTo(x - breadth, base);
        p.lineTo(x - 0.42 * breadth, base - ht * 0.42);
        p.lineTo(x - 0.67 * breadth, base - ht * 0.38);
        p.lineTo(x, base - ht);
        p.lineTo(x + 0.58 * breadth, base - ht * 0.35);
        p.lineTo(x + 0.38 * breadth, base - ht * 0.38);
        p.lineTo(x + breadth, base);
        p.closePath();
        x += Math.max(1.4, breadth * (1 + random()));
      }
    }
    paths.push(p);
  }
  return paths;
}

function makeMoon() {
  const canvas = surface();
  canvas.width = canvas.height = 160;
  const ctx = canvas.getContext("2d"),
    random = generator(919);
  ctx.beginPath();
  ctx.arc(80, 80, 72, 0, TAU);
  ctx.clip();
  const face = ctx.createRadialGradient(58, 58, 5, 75, 85, 85);
  face.addColorStop(0, "#fffce9");
  face.addColorStop(0.66, "#f5e9d6");
  face.addColorStop(1, "#d0c3d7");
  ctx.fillStyle = face;
  ctx.fillRect(0, 0, 160, 160);
  for (let i = 0; i < 65; i++) {
    const x = random() * 160,
      y = random() * 160,
      r = 1 + random() ** 2 * 12;
    const crater = ctx.createRadialGradient(x, y, 0, x, y, r);
    crater.addColorStop(0, "rgba(126,121,151,.13)");
    crater.addColorStop(0.7, "rgba(148,141,156,.08)");
    crater.addColorStop(1, "rgba(148,141,156,0)");
    ctx.fillStyle = crater;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  return canvas;
}
function glint(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + 0.13 * size, y - 0.14 * size, x + 0.66 * size, y);
  ctx.quadraticCurveTo(x + 0.13 * size, y + 0.14 * size, x, y + size);
  ctx.quadraticCurveTo(x - 0.13 * size, y + 0.14 * size, x - 0.66 * size, y);
  ctx.quadraticCurveTo(x - 0.13 * size, y - 0.14 * size, x, y - size);
  ctx.fill();
}

export class Environment {
  constructor(canvas, { reduced = false } = {}) {
    this.canvas = canvas;
    this.reduced = reduced;
    this.context = canvas.getContext("2d", { alpha: false });
    this.sky = surface();
    this.skyContext = this.sky.getContext("2d", { alpha: false });
    this.noise = makeNoise();
    this.galaxy = atmosphericTexture("galaxy", this.noise);
    this.clouds = atmosphericTexture("clouds", this.noise);
    this.aurora = atmosphericTexture("aurora", this.noise);
    this.moon = makeMoon();
    const random = generator(190809);
    this.stars = Array.from({ length: 186 }, (_, i) => ({
      x: random(),
      y: random() * 0.754,
      z: i % 3,
      phi: random() * TAU,
      r: 0.4 + random() * 0.67,
      color: ["#fff0c7", "#f1eaff", "#d7e8ff"][i % 3],
      cross: random() > 0.91,
    }));
    this.dust = Array.from({ length: 38 }, () => ({
      x: random(),
      y: random(),
      phi: random() * TAU,
      s: random(),
    }));
    this.streaks = Array.from({ length: 128 }, () => ({
      x: random(),
      y: random(),
      s: random(),
      phase: random() * TAU,
    }));
    this.flashes = [];
    this.ripples = [];
    this.time = 0;
    this.stage = "gift";
    this.night = NIGHT.gift;
    this.palette = COLORS.gift.map((c) => [...c]);
    this.quality = 1;
    this.resize();
  }
  get width() {
    return this._width;
  }
  get height() {
    return this._height;
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    this._width = Math.max(1, Math.round(r.width || innerWidth));
    this._height = Math.max(1, Math.round(r.height || innerHeight));
    const dpr = clamp(
      Math.min(
        window.devicePixelRatio || 1,
        this.maxDpr || 1.5,
        this.reduced ? 1 : 1.5,
        Math.sqrt(1750000 / (this.width * this.height)),
      ),
      0.75,
      1.5,
    );
    this.canvas.width = this.sky.width = Math.round(this.width * dpr);
    this.canvas.height = this.sky.height = Math.round(this.height * dpr);
    this.sx = this.sky.width / this.width;
    this.sy = this.sky.height / this.height;
    this.paths = landscape(this.width, this.height, this.noise);
  }
  update(dt, time, stage = this.stage, progress = 0) {
    if (!Number.isFinite(dt)) dt = 0;
    this.time = this.reduced
      ? 0
      : Number.isFinite(time)
        ? time
        : this.time + dt;
    this.stage = COLORS[stage] ? stage : "gift";
    const blend =
      1 - Math.exp(-Math.min(0.25, Math.max(0, dt)) * (this.reduced ? 9 : 2.2));
    const opening = this.stage === "opening" ? clamp(Number(progress) || 0) : 0;
    const desired = COLORS[this.stage];
    this.night = lerp(
      this.night,
      lerp(NIGHT[this.stage], NIGHT.cake, opening),
      blend,
    );
    for (let i = 0; i < this.palette.length; i++)
      for (let j = 0; j < 3; j++) {
        this.palette[i][j] = lerp(
          this.palette[i][j],
          lerp(desired[i][j], COLORS.cake[i][j], opening),
          blend,
        );
      }
    for (const f of this.flashes) f.age += Math.max(0, dt);
    this.flashes = this.flashes.filter((f) => f.age < 1);
    for (const wave of this.ripples) wave.age += Math.max(0, dt);
    this.ripples = this.ripples.filter((wave) => wave.age < wave.life);
    this.quality = lerp(
      this.quality,
      dt > 0.04 ? 0.45 : 1,
      dt > 0.04 ? 0.07 : 0.006,
    );
  }
  flash(x, y, color = "#f3d69c", power = 1) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const normalized = x >= 0 && x <= 1 && y >= 0 && y <= 1;
    this.flashes.push({
      x: normalized ? x : x / this.width,
      y: normalized ? y : y / this.height,
      color,
      power: clamp(power, 0, 2),
      age: 0,
    });
    if (this.flashes.length > 5) this.flashes.shift();
  }
  ripple(x, y) {
    // CSS-pixel input in the same coordinate system as flash and the sky.
    if (!Number.isFinite(x) || !Number.isFinite(y) || y < this.height * HORIZON)
      return false;
    this.ripples.push({
      x: clamp(x / this.width),
      y: clamp(y / this.height),
      age: 0,
      life: this.reduced ? 0.85 : 1.85,
    });
    if (this.ripples.length > 4) this.ripples.shift();
    return true;
  }
  _atmosphere(ctx, w, h, t, n) {
    const g = ctx.createLinearGradient(0, 0, 0, h * HORIZON);
    g.addColorStop(0, rgb(this.palette[0]));
    g.addColorStop(0.52, rgb(this.palette[1]));
    g.addColorStop(1, rgb(this.palette[2]));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Warm lower atmosphere and the broad, asymmetrical cloud banks.
    const dawn = ctx.createRadialGradient(
      0.24 * w,
      0.7 * h,
      0,
      0.24 * w,
      0.7 * h,
      0.64 * Math.max(w, h),
    );
    dawn.addColorStop(0, rgba(255, 211, 170, 0.22 * (1 - n)));
    dawn.addColorStop(1, "rgba(255,211,170,0)");
    ctx.fillStyle = dawn;
    ctx.fillRect(0, 0, w, h * HORIZON);
    const drift = Math.sin(t * 0.019);
    ctx.globalAlpha = 0.26 + 0.55 * n;
    ctx.drawImage(
      this.galaxy,
      -w * (0.034 + drift * 0.014),
      -h * 0.05,
      w * 1.1,
      h * 0.9,
    );
    ctx.globalAlpha = 0.82 - 0.48 * n;
    ctx.drawImage(
      this.clouds,
      -w * (0.06 - drift * 0.028),
      h * 0.02,
      w * 1.13,
      h * 0.87,
    );
    ctx.globalAlpha = 1;
    const mx = w * (w / h > 1 ? 0.8 : 0.84),
      my = h * (w / h > 1 ? 0.21 : 0.255);
    const mr = clamp(Math.min(w, h) * 0.028, 7, 20);
    const halo = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 6);
    halo.addColorStop(0, rgba(255, 238, 204, 0.36));
    halo.addColorStop(0.32, rgba(249, 222, 197, 0.12));
    halo.addColorStop(1, "rgba(235,218,225,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(mx - mr * 6, my - mr * 6, mr * 12, mr * 12);
    ctx.globalAlpha = 0.5 + 0.45 * n;
    ctx.drawImage(this.moon, mx - mr, my - mr, mr * 2, mr * 2);
    ctx.globalAlpha = 1;

    const count = this.reduced
      ? 74
      : Math.min(
          this.stars.length,
          Math.round((w < 540 ? 124 : 186) * (0.7 + 0.3 * this.quality)),
        );
    for (let i = 0; i < count; i++) {
      const s = this.stars[i],
        speed = (s.z + 1) * 0.024;
      const x = (s.x * w + Math.sin(t * speed + s.phi) * (s.z * 0.8) + w) % w;
      const y = s.y * h + Math.cos(t * speed + s.phi) * s.z * 0.5;
      const twinkle = 0.65 + 0.35 * Math.sin(t * (0.42 + s.z * 0.19) + s.phi);
      const brilliance =
        (0.19 + 0.78 * n) *
        twinkle *
        lerp(0.52, 1, s.z * 0.5) *
        (1 - smooth(clamp((s.y - 0.55) / 0.2)));
      ctx.globalAlpha = brilliance;
      ctx.fillStyle = n > 0.32 ? s.color : s.z === 2 ? "#ae91ae" : "#fff9ed";
      if (s.cross && s.z > 0) {
        glint(ctx, x, y, 2 + s.z * 1.1);
      } else {
        const size = s.r * (0.65 + 0.28 * s.z);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    if (n > 0.49) {
      ctx.globalAlpha = (n - 0.49) * 1.62;
      ctx.drawImage(
        this.aurora,
        (-0.1 + drift * 0.03) * w,
        0.014 * h,
        w * 1.14,
        h * 0.64,
      );
      ctx.globalAlpha = 1;
    }
    if (!this.reduced) {
      this._meteor(ctx, w, h, t, n);
      this._comet(ctx, w, h, t, n);
    }
  }
  _comet(ctx, w, h, t, n) {
    const cycle = Math.floor((t + 13) / 43),
      phase = (t + 13) % 43;
    if (n < 0.42 || phase > 16) return;
    const progress = phase / 16;
    const x = (0.65 - 0.12 * progress - (cycle % 2) * 0.41) * w,
      y = (0.12 + 0.047 * progress) * h;
    const dx = Math.min(w * 0.059, 42),
      dy = Math.min(h * 0.025, 13);
    const tail = ctx.createLinearGradient(x, y, x + dx, y - dy);
    tail.addColorStop(0, "#dcdde9");
    tail.addColorStop(1, "rgba(191,192,224,0)");
    ctx.globalAlpha = 0.45 * n * Math.sin(Math.PI * progress);
    ctx.fillStyle = tail;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + dx * 0.33, y - dy * 0.58, x + dx, y - dy - 1.5);
    ctx.quadraticCurveTo(x + dx * 0.51, y - dy * 0.36, x, y + 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#eff5ff";
    ctx.beginPath();
    ctx.arc(x, y, 0.95, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  _meteor(ctx, w, h, t, n) {
    const cycle = Math.floor(t / 14),
      phase = t % 14;
    if (phase < 3.6 || phase > 5.5) return;
    const a = (phase - 3.6) / 1.9,
      flip = cycle % 2 === 1;
    const x = w * (flip ? 0.67 - 0.29 * a : 0.08 + 0.34 * a),
      y = h * (0.1 + ((cycle * 7) % 11) * 0.009 + 0.2 * a);
    const dx = (flip ? -1 : 1) * Math.min(w * 0.11, 105),
      dy = h * 0.065;
    const glow = ctx.createLinearGradient(x - dx, y - dy, x, y);
    glow.addColorStop(0, "rgba(255,236,199,0)");
    glow.addColorStop(1, "#fff4d9");
    ctx.globalAlpha = (0.21 + 0.6 * n) * Math.sin(a * Math.PI);
    ctx.strokeStyle = glow;
    ctx.lineWidth = 1.45;
    ctx.beginPath();
    ctx.moveTo(x - dx, y - dy);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = "#fff8e7";
    glint(ctx, x, y, 3);
    ctx.globalAlpha = 1;
  }
  _land(ctx, w, h) {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = rgb(this.palette[3 + i]);
      ctx.fill(this.paths[i]);
    }
    for (const f of this.flashes) {
      const x = f.x * w,
        y = f.y * h,
        r = Math.max(w * 0.25, h * 0.25);
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
      glow.addColorStop(0, f.color);
      glow.addColorStop(1, "transparent");
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha =
        0.12 * Math.exp(-4.2 * f.age) * f.power * (this.reduced ? 0.4 : 1);
      ctx.fillStyle = glow;
      ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
      const horizonGlow = ctx.createRadialGradient(
        x,
        0.73 * h,
        0,
        x,
        0.73 * h,
        r * 0.7,
      );
      horizonGlow.addColorStop(0, f.color);
      horizonGlow.addColorStop(1, "transparent");
      ctx.fillStyle = horizonGlow;
      ctx.globalAlpha *= 0.7;
      ctx.fillRect(x - r, h * 0.61, r * 2, h * 0.19);
      ctx.restore();
    }
  }
  _lake(ctx, w, h, t, n) {
    const shore = h * HORIZON,
      water = h - shore;
    ctx.fillStyle = rgb(this.palette[6]);
    ctx.fillRect(0, shore, w, water + 1);
    const rows = this.reduced ? 30 : Math.round(35 + this.quality * 16);
    const span = water / rows,
      sy = this.sy,
      sw = this.sky.width;
    // Vertical magnification changes with distance. Each band mirrors the sky
    // above its own x position; small horizontal offsets simulate wave slopes.
    for (let i = 0; i < rows; i++) {
      const u = i / rows,
        v = (i + 1) / rows;
      const sourceTop = shore - h * 0.775 * v ** 1.12,
        sourceBottom = shore - h * 0.775 * u ** 1.12;
      const waviness =
        (0.2 + u * 2.9) *
        Math.sin(u * 52 + t * 1.12 + 0.95 * Math.sin(u * 15 - t * 0.46));
      ctx.globalAlpha =
        (0.85 - 0.37 * u) * (0.97 + 0.03 * Math.sin(39 * u - t * 0.49));
      // Flip within the band too: bright points stay continuous at its edges.
      const top = Math.round((shore + i * span) * sy) / sy,
        bottom = Math.round((shore + (i + 1) * span) * sy) / sy;
      ctx.save();
      ctx.translate(waviness, bottom);
      ctx.scale(1, -1);
      const midY = (top + bottom) * 0.5;
      const covered = this.ripples.some(
        (wave) => Math.abs(wave.y * h - midY) < (9 + wave.age * 67) * 0.28 + 3,
      );
      if (!covered) {
        ctx.drawImage(
          this.sky,
          0,
          sourceTop * sy,
          sw,
          (sourceBottom - sourceTop) * sy,
          -4,
          0,
          w + 8,
          bottom - top,
        );
      } else {
        // Refraction re-samples the live sky texture on both sides of each
        // wave crest. The rest of the scanline is copied in a single pass.
        const changed = this.ripples.filter(
          (q) => Math.abs(q.y * h - midY) < (9 + q.age * 67) * 0.28 + 3,
        );
        const left = Math.max(
          -4,
          Math.min(...changed.map((q) => q.x * w - (23 + q.age * 67))),
        );
        const right = Math.min(
          w + 4,
          Math.max(...changed.map((q) => q.x * w + (23 + q.age * 67))),
        );
        const stamp = (a, b, offsetX = 0, offsetY = 0) => {
          if (b <= a) return;
          const sampleWidth = ((b - a) * sw) / (w + 8);
          const sampleX = clamp(
            ((a + 4 + offsetX) * sw) / (w + 8),
            0,
            sw - sampleWidth,
          );
          const sampleHeight = (sourceBottom - sourceTop) * sy;
          const sampleY = clamp(
            (sourceTop + offsetY) * sy,
            0,
            this.sky.height - sampleHeight,
          );
          ctx.drawImage(
            this.sky,
            sampleX,
            sampleY,
            sampleWidth,
            sampleHeight,
            a,
            0,
            b - a,
            bottom - top,
          );
        };
        stamp(-4, left);
        for (let a = left; a < right; a += 8) {
          const b = Math.min(a + 8, right),
            x = (a + b) * 0.5;
          let dx = 0,
            dy = 0;
          for (const q of changed) {
            const vx = x - q.x * w,
              vy = (midY - q.y * h) / 0.28,
              d = Math.hypot(vx, vy);
            const phase = d - (9 + q.age * 67);
            const wave =
              Math.exp((-phase * phase) / 235) *
              Math.sin(phase * 0.36) *
              (1 - q.age / q.life) *
              (this.reduced ? 0.35 : 1);
            dx += (wave * 5 * vx) / (d || 1);
            dy += (wave * 12 * vy) / (d || 1);
          }
          stamp(a, b, dx, dy);
        }
        stamp(right, w + 4);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    const glaze = ctx.createLinearGradient(0, shore, 0, h);
    glaze.addColorStop(0, rgba(79, 68, 101, 0.055));
    glaze.addColorStop(1, rgba(30, 33, 55, 0.1 + 0.18 * n));
    ctx.fillStyle = glaze;
    ctx.fillRect(0, shore, w, water);
    ctx.lineWidth = 0.65;
    ctx.beginPath();
    ctx.moveTo(0, shore);
    ctx.lineTo(w, shore);
    ctx.strokeStyle = rgba(255, 227, 194, 0.3 - 0.17 * n);
    ctx.stroke();
    const count = this.reduced ? 56 : 98;
    for (let i = 0; i < count; i++) {
      const s = this.streaks[i],
        y = shore + water * s.y;
      const x = s.x * w + Math.sin(t * 0.32 + s.phase) * (0.4 + 2 * s.y);
      const length =
        (0.8 + s.s * 7) * (0.4 + s.y) * Math.max(0.9, Math.sqrt(w / 410));
      ctx.fillStyle = rgba(
        251,
        222,
        209,
        (0.07 + 0.1 * s.s) * (0.59 + 0.41 * Math.sin(s.phase + t * 0.41)),
      );
      ctx.fillRect(x, y, length, 0.5 + s.y * 0.3);
    }
    if (this.ripples.length) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, shore, w, water);
      ctx.clip();
      for (const q of this.ripples) {
        const radius = 5 + q.age * 67,
          fade = (1 - q.age / q.life) ** 1.8;
        for (let j = 0; j < 3; j++) {
          const r = radius - j * 8;
          if (r < 2) continue;
          ctx.strokeStyle = rgba(244, 225, 212, fade * (0.42 - j * 0.085));
          ctx.lineWidth = j ? 0.65 : 1.05;
          ctx.beginPath();
          ctx.ellipse(q.x * w, q.y * h, r, r * 0.28, 0, 0, TAU);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
  _foreground(ctx, w, h, t, n) {
    const count = this.reduced ? 6 : Math.round(15 + 6 * this.quality);
    for (let i = 0; i < count; i++) {
      const s = this.dust[i],
        cycle = (s.y + t * (0.0012 + s.s * 0.0017)) % 1;
      let x = s.x * w + Math.sin(s.phi + t * 0.18) * 9,
        y = h * (1.04 - cycle * 0.73);
      if (n > 0.55) y = h * (1.02 - cycle * 0.41);
      const alpha =
        (0.035 + 0.27 * Math.sin(Math.PI * cycle) ** 2) *
        (0.5 + 0.5 * Math.sin(t * 0.62 + s.phi) ** 2);
      ctx.globalAlpha = alpha;
      if (n > 0.48) {
        ctx.fillStyle = "#f8dc9c";
        ctx.beginPath();
        ctx.arc(x, y, 0.7 + s.s * 0.85, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = alpha * 0.21;
        ctx.beginPath();
        ctx.arc(x, y, 2.5 + s.s * 1.6, 0, TAU);
        ctx.fill();
      } else {
        ctx.fillStyle = i % 3 ? "#fff9e2" : "#ac8aaf";
        ctx.beginPath();
        ctx.ellipse(
          x,
          y,
          0.8 + s.s * 1.7,
          0.5 + s.s * 0.6,
          s.phi + t * 0.16,
          0,
          TAU,
        );
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  render(skyOverlay = null) {
    if (!this.context) return;
    const w = this.width,
      h = this.height,
      ctx = this.context,
      s = this.skyContext,
      t = this.time,
      n = this.night;
    s.setTransform(this.sx, 0, 0, this.sy, 0, 0);
    s.globalAlpha = 1;
    s.globalCompositeOperation = "source-over";
    this._atmosphere(s, w, h, t, n);
    if (skyOverlay) {
      s.save();
      s.beginPath();
      s.rect(0, 0, w, h * HORIZON);
      s.clip();
      skyOverlay(s, w, h);
      s.restore();
    }
    this._land(s, w, h);
    ctx.setTransform(this.sx, 0, 0, this.sy, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(
      this.sky,
      0,
      0,
      this.sky.width,
      h * HORIZON * this.sy,
      0,
      0,
      w,
      h * HORIZON + 0.5,
    );
    this._lake(ctx, w, h, t, n);
    this._foreground(ctx, w, h, t, n);
  }
  dispose() {
    this.flashes.length = 0;
    this.ripples.length = 0;
    this.paths = [];
    this.stars = [];
    this.dust = [];
    this.streaks = [];
    for (const layer of [
      this.sky,
      this.galaxy,
      this.clouds,
      this.aurora,
      this.moon,
    ])
      layer.width = layer.height = 1;
    this.context = null;
    this.skyContext = null;
  }
}
