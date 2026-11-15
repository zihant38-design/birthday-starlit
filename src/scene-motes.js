// Small, continuous gestures of light that live behind the DOM artwork. The
// primary wish light belongs to the existing .wish-spark animation; this module
// only catches the dust in its wake. All particles share the host animation clock.
const TAU = Math.PI * 2;
const GOLD = "#ffdc98",
  CREAM = "#fff0cf",
  VIOLET = "#d9c4fa";
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const rand = (min, max) => min + Math.random() * (max - min);
const pick = (i) => [GOLD, CREAM, VIOLET, CREAM, GOLD][i % 5];
const within = (box, x, y, pad = 0) =>
  box &&
  x >= box.left - pad &&
  x <= box.right + pad &&
  y >= box.top - pad &&
  y <= box.bottom + pad;

function rect(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 1 && r.height > 1 ? r : null;
}

function ghost(color) {
  const c = document.createElement("canvas");
  c.width = c.height = 36;
  const g = c.getContext("2d");
  if (!g) return null;
  const grad = g.createRadialGradient(18, 18, 0, 18, 18, 18);
  grad.addColorStop(0, color);
  grad.addColorStop(0.13, color + "e8");
  grad.addColorStop(0.39, color + "55");
  grad.addColorStop(1, color + "00");
  g.fillStyle = grad;
  g.fillRect(0, 0, 36, 36);
  return c;
}

export class SceneMotes {
  constructor({ reduced = false } = {}) {
    this.reduced = Boolean(reduced);
    this.stage = "gift";
    this.time = 0;
    this.pending = "";
    this.pendingMeasure = true;
    this.pool = [];
    this.free = [];
    this.lastWish = null;
    this.nextDust = 0;
    this.lastMeasure = -1;
    this.width = 1;
    this.height = 1;
    this.disposed = false;
    this.edgeGlow = 0;
    this.boxes = {};
    this.paperPath = [];
    this.paperLength = 0;
    this.sprites = new Map();
    this.nodes = {
      gift: document.querySelector(".box-interior"),
      giftHost: document.querySelector("#gift-button"),
      cake: document.querySelector("#cake-host"),
      spark: document.querySelector(".wish-spark i"),
      paper: document.querySelector(".birthday-letter"),
      header: document.querySelector(".site-header"),
      openingText: document.querySelector(".gift-heading"),
      cakeText: document.querySelector("#cake-scene .scene-heading"),
      showText: document.querySelector(".fireworks-heading"),
      cakeActions: document.querySelector(".wish-action"),
      letterActions: document.querySelector(".ending-actions"),
    };
  }

  get activeCount() {
    return this.pool.length;
  }

  setStage(stage) {
    if (this.disposed || stage === this.stage) return;
    const from = this.stage;
    this.stage = stage;
    this.time = 0;
    this.nextDust = 0;
    this.pendingMeasure = true;
    if (stage === "gift") {
      this.clear();
      this.pending = "";
      this.lastWish = null;
    } else if (stage === "opening") {
      this.clear();
      this.pending = "opening";
    } else if (stage === "cake" || (stage === "wish" && from !== "cake")) {
      this.pending = "cake";
    } else if (stage === "blow") {
      this.clear();
      this.lastWish = null;
      this.pending = "";
    } else if (stage === "fireworks") {
      this.pending = from === "blow" && this.lastWish ? "echo" : "";
      if (this.pending !== "echo") this.clear();
    } else if (stage === "ending") {
      this.clear();
      this.pending = "paper";
    }
  }

  setReduced(value) {
    this.reduced = Boolean(value);
    if (this.reduced && this.pool.length > 8)
      this.free.push(...this.pool.splice(8));
  }

  clear() {
    this.free.push(...this.pool);
    this.pool.length = 0;
    this.edgeGlow = 0;
  }

  add(type, x, y, tx, ty, dur, delay, i) {
    if (this.pool.length >= (this.reduced ? 12 : 44)) return;
    const p = this.free.pop() || {};
    Object.assign(p, {
      type,
      x,
      y,
      px: x,
      py: y,
      sx: x,
      sy: y,
      tx,
      ty,
      age: -delay,
      life: dur,
      phase: rand(0, TAU),
      color: pick(i),
      size: rand(0.86, 1.55),
      twinkle: i % 4 === 0,
      side: i % 2 ? 1 : -1,
      bend: rand(0.18, 0.32),
      opacity: 0,
      perimeter: 0,
    });
    this.pool.push(p);
    return p;
  }

  measure(w, h) {
    for (const [name, node] of Object.entries(this.nodes)) {
      if (name === "spark") continue;
      this.boxes[name] = rect(node);
    }
    if (this.boxes.paper) this.measurePaper(this.boxes.paper);
    this.width = w;
    this.height = h;
    this.lastMeasure = this.time;
    this.pendingMeasure = false;
  }

  measurePaper(b) {
    // Sample the same asymmetric rounded corners as the actual letter. A plain
    // rectangular halo would visibly cut across its tall arched shoulders.
    const style = getComputedStyle(this.nodes.paper);
    const corner = (value) => {
      const [rx, ry = rx] = value.trim().split(/\s+/).map(parseFloat);
      return [Math.min(b.width / 2, rx + 4), Math.min(b.height / 2, ry + 4)];
    };
    const [tl, tr, br, bl] = [
      "borderTopLeftRadius",
      "borderTopRightRadius",
      "borderBottomRightRadius",
      "borderBottomLeftRadius",
    ].map((k) => corner(style[k]));
    const x = b.left - 4,
      y = b.top - 4,
      r = b.right + 4,
      d = b.bottom + 4;
    const points = [];
    const add = (px, py) => {
      const last = points[points.length - 1];
      points.push({
        x: px,
        y: py,
        at: last ? last.at + Math.hypot(px - last.x, py - last.y) : 0,
      });
    };
    const curve = (cx, cy, radii, from) => {
      for (let i = 0; i <= 10; i++) {
        const a = from + (i * Math.PI) / 20;
        add(cx + Math.cos(a) * radii[0], cy + Math.sin(a) * radii[1]);
      }
    };
    add(x + tl[0], y);
    curve(r - tr[0], y + tr[1], tr, -Math.PI / 2);
    curve(r - br[0], d - br[1], br, 0);
    curve(x + bl[0], d - bl[1], bl, Math.PI / 2);
    curve(x + tl[0], y + tl[1], tl, Math.PI);
    this.paperPath = points;
    this.paperLength = points[points.length - 1].at;
  }

  openingDust() {
    const b = this.boxes.gift || this.boxes.giftHost;
    if (!b) return;
    const cx = b.left + b.width * 0.5,
      cy = b.top + b.height * 0.48;
    const sideWidth = Math.min(this.width * 0.29, 146);
    const headingBottom = this.boxes.openingText?.bottom || this.height * 0.28;
    const top = Math.min(cy - 22, Math.max(headingBottom + 17, cy - 100));
    const n = this.reduced ? 5 : 23;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const side = i % 2 ? 1 : -1;
      const sx = cx + rand(-0.23, 0.23) * b.width;
      const sy = cy + rand(-0.13, 0.13) * b.height;
      const tx = cx + side * (sideWidth + 22 * Math.sin(t * Math.PI));
      const ty = top + t * (cy - top + 32) * 0.7;
      const p = this.add(
        "opening",
        sx,
        sy,
        tx,
        ty,
        this.reduced ? 1.15 : 5.2,
        t * (this.reduced ? 0.35 : 1.3),
        i,
      );
      if (p) p.size = rand(1.12, 2.0);
    }
  }

  cakeDust() {
    const b = this.boxes.cake;
    if (!b) return;
    const cx = b.left + b.width * 0.5,
      cy = b.top + b.height * 0.57;
    const radius = Math.min(b.width * 0.37, b.height * 0.63);
    const n = this.reduced ? 5 : 20;
    // Reuse the actual visible positions from the gift, instead of snapping
    // the lit specks to a new origin when the scene element changes.
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      const a = (i / n) * Math.PI;
      const tx = cx + side * (0.67 + 0.33 * Math.sin(a)) * radius;
      const ty = cy + Math.cos(a) * b.height * 0.27;
      let p = this.pool[i];
      if (!p)
        p = this.add(
          "cake",
          cx + side * radius * 1.22,
          cy - b.height * 0.28,
          tx,
          ty,
          2.8,
          0,
          i,
        );
      if (!p) continue;
      p.sx = p.x;
      p.sy = p.y;
      p.tx = tx;
      p.ty = ty;
      p.type = "cake";
      p.age = -i * 0.013;
      p.life = this.reduced ? 1.35 : 2.8 + i * 0.048;
    }
    if (this.pool.length > n) this.free.push(...this.pool.splice(n));
  }

  wishDust() {
    // Read the same transformed six-pixel star that the browser draws. Sampling
    // only at emission time avoids a forced layout on every frame of the show.
    if (!document.body.classList.contains("spark-rise")) return;
    const r = rect(this.nodes.spark);
    if (!r) return;
    const x = r.left + r.width / 2,
      y = r.top + r.height / 2;
    if (!this.lastWish) this.lastWish = { x, y };
    if (Math.hypot(x - this.lastWish.x, y - this.lastWish.y) < 1.2) return;
    const old = this.lastWish;
    this.lastWish = { x, y };
    const i = Math.floor(this.time * 12),
      side = i % 2 ? 1 : -1;
    const p = this.add(
      "wake",
      old.x + rand(-2, 2),
      old.y + 5,
      old.x + side * rand(4, 13),
      old.y + rand(10, 25),
      rand(0.45, 0.85),
      0,
      i,
    );
    if (p) p.size = rand(0.52, 0.94);
  }

  echoDust() {
    const aimX = this.width * 0.34,
      aimY = this.height * 0.52;
    const n = this.reduced ? 2 : 6;
    for (let i = 0; i < n; i++) {
      const s = i % 2 ? 1 : -1;
      // The residual points curl in around the first peony. Their brightness
      // falls away before ignition; the shell supplies the only burst.
      this.add(
        "echo",
        this.lastWish.x + s * (3 + i),
        this.lastWish.y + i * 3,
        aimX + s * rand(5, 17),
        aimY + rand(-9, 9),
        1.07 + i * 0.032,
        i * 0.023,
        i,
      );
    }
    this.lastWish = null;
  }

  edgeAt(fraction) {
    const points = this.paperPath;
    if (!points.length) return null;
    const wanted = fraction * this.paperLength;
    let low = 0,
      high = points.length - 1;
    while (high - low > 1) {
      const mid = (low + high) >> 1;
      if (points[mid].at < wanted) low = mid;
      else high = mid;
    }
    const a = points[low],
      b = points[high],
      f = (wanted - a.at) / Math.max(0.001, b.at - a.at);
    return { x: mix(a.x, b.x, f), y: mix(a.y, b.y, f) };
  }

  paperDust() {
    if (!this.boxes.paper) return;
    const n = this.reduced ? 7 : 32;
    for (let i = 0; i < n; i++) {
      const f = (i + 0.45) / n,
        pt = this.edgeAt(f);
      const sx = clamp(pt.x + rand(-32, 32), 4, this.width - 4);
      const sy = pt.y - rand(22, 68);
      const p = this.add(
        "paper",
        sx,
        sy,
        pt.x,
        pt.y,
        this.reduced ? 1.6 : 3.5 + rand(-0.3, 0.6),
        (i % 6) * 0.08,
        i,
      );
      if (p) {
        p.perimeter = f;
        p.size = rand(0.85, 1.45);
      }
    }
  }

  update(dt) {
    if (this.disposed || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(0.1, dt);
    this.time += dt;
    if (this.stage === "blow" && this.time >= 1.95) {
      this.nextDust -= dt;
      if (this.nextDust <= 0) {
        this.wishDust();
        this.nextDust = this.reduced ? 0.19 : 0.081;
      }
    }
    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.pool[i] = this.pool[this.pool.length - 1];
        this.pool.pop();
        this.free.push(p);
        continue;
      }
      if (p.age < 0) {
        p.opacity = 0;
        continue;
      }
      this.advance(p);
    }
    if (this.stage === "ending") {
      const finish = this.reduced ? 1.95 : 4.25;
      this.edgeGlow =
        clamp(this.time / 0.83, 0, 1) *
        clamp((finish - this.time) / 1.15, 0, 1);
    }
  }

  advance(p) {
    const t = clamp(p.age / p.life, 0, 1);
    const approach =
      p.type === "opening" ? 0.47 : p.type === "paper" ? 0.62 : 0.88;
    const f = smooth(Math.min(1, t / approach));
    p.px = p.x;
    p.py = p.y;
    if (p.type === "paper") {
      const end = this.edgeAt(p.perimeter);
      if (end) {
        p.tx = end.x;
        p.ty = end.y;
      }
    }
    const amplitude = this.reduced
      ? 3
      : p.type === "wake"
        ? 3
        : p.type === "echo"
          ? 22
          : 13;
    const arc = Math.sin(f * Math.PI);
    p.x = mix(p.sx, p.tx, f) + arc * amplitude * p.side;
    p.y = mix(p.sy, p.ty, f) - arc * amplitude * p.bend;
    if (t > approach && p.type === "opening" && !this.reduced) {
      p.x += Math.sin((t - approach) * TAU + p.phase) * 3;
      p.y += Math.sin((t - approach) * TAU) * 3;
    }
    const fadeIn = Math.min(1, p.age / 0.17);
    const fadeOut = clamp((1 - t) / 0.25, 0, 1);
    p.opacity =
      fadeIn *
      fadeOut *
      (p.type === "wake" ? 0.6 : p.type === "echo" ? 0.64 : 0.87);
    if (!this.reduced) p.opacity *= 0.9 + 0.1 * Math.sin(p.phase + p.age * 3.2);
  }

  visibleAt(x, y) {
    const b = this.boxes;
    if (within(b.header, x, y, 3)) return false;
    if (this.stage === "opening") return !within(b.openingText, x, y, 8);
    if (["cake", "wish", "blow"].includes(this.stage)) {
      return !within(b.cakeText, x, y, 8) && !within(b.cakeActions, x, y, 4);
    }
    if (this.stage === "fireworks") return !within(b.showText, x, y, 9);
    if (this.stage === "ending")
      return !within(b.paper, x, y, 0) && !within(b.letterActions, x, y, 2);
    return true;
  }

  draw(ctx, w, h) {
    if (this.disposed || !ctx || w <= 0 || h <= 0) return;
    if (
      !this.pending &&
      !this.pool.length &&
      !this.edgeGlow &&
      this.stage !== "blow"
    )
      return;
    if (
      this.pendingMeasure ||
      w !== this.width ||
      h !== this.height ||
      (this.stage === "ending" && this.time - this.lastMeasure > 0.15)
    )
      this.measure(w, h);
    if (this.pending) {
      const mode = this.pending;
      this.pending = "";
      if (mode === "opening") this.openingDust();
      if (mode === "cake") this.cakeDust();
      if (mode === "echo") this.echoDust();
      if (mode === "paper") this.paperDust();
    }
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";
    if (this.edgeGlow > 0.01 && this.paperPath.length) {
      ctx.globalAlpha = 0.31 * this.edgeGlow;
      ctx.strokeStyle = GOLD;
      ctx.shadowColor = "#ffe0a9";
      ctx.shadowBlur = this.reduced ? 5 : 10;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(this.paperPath[0].x, this.paperPath[0].y);
      for (let i = 1; i < this.paperPath.length; i++)
        ctx.lineTo(this.paperPath[i].x, this.paperPath[i].y);
      ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    for (const p of this.pool) {
      if (p.opacity <= 0.015 || !this.visibleAt(p.x, p.y)) continue;
      const r = p.size;
      if (p.type === "wake" || p.type === "echo") {
        ctx.globalAlpha = p.opacity * 0.45;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      ctx.globalAlpha = p.opacity;
      if (!this.sprites.has(p.color)) this.sprites.set(p.color, ghost(p.color));
      const g = this.sprites.get(p.color);
      if (g) {
        const rr = r * (p.twinkle ? 5.1 : 3.9);
        ctx.drawImage(g, p.x - rr, p.y - rr, rr * 2, rr * 2);
      }
      ctx.fillStyle = p.color;
      if (p.twinkle && !this.reduced) {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - r * 2.55);
        ctx.lineTo(p.x + r * 0.46, p.y - r * 0.45);
        ctx.lineTo(p.x + r * 1.85, p.y);
        ctx.lineTo(p.x + r * 0.46, p.y + r * 0.45);
        ctx.lineTo(p.x, p.y + r * 2.55);
        ctx.lineTo(p.x - r * 0.46, p.y + r * 0.45);
        ctx.lineTo(p.x - r * 1.85, p.y);
        ctx.lineTo(p.x - r * 0.46, p.y - r * 0.45);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.69, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  dispose() {
    this.clear();
    this.sprites.clear();
    this.free.length = 0;
    this.disposed = true;
    this.nodes = {};
    this.boxes = {};
    this.lastWish = null;
    this.pending = "";
  }
}
