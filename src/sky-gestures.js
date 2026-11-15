// Sky interactions share the scene's animation clock and the lake's reflected
// source. Pointer coordinates are viewport CSS pixels, just like the sky canvas.
const TAU = Math.PI * 2;
const GOLD = "#ffe1a2";
const LILAC = "#dbc4ff";
const PINK = "#ffc3d2";
const DRAG_DISTANCE = 11;
const HOLD_START = 0.31;
const FULL_CHARGE = 1.48;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const random = (min, max) => min + Math.random() * (max - min);

function star(ctx, x, y, radius, rotation = 0) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = rotation + (i * Math.PI) / 4;
    const r = i % 2 === 0 ? radius : radius * 0.26;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// Recycle retired particles. At most one trail is active, but previous strokes
// keep fading independently while a new finger press is being classified.
class SparkTrail {
  constructor() {
    this.active = [];
    this.free = [];
    this.strokeId = 0;
    this.last = null;
    this.phase = 0;
  }

  begin(x, y, reduced) {
    this.strokeId++;
    this.phase = 0;
    this.last = { x, y };
    this.sample(x, y, 0, -1, reduced, true);
  }

  move(x, y, reduced) {
    if (!this.last) return;
    const dx = x - this.last.x,
      dy = y - this.last.y;
    const distance = Math.hypot(dx, dy);
    const spacing = reduced ? 9 : 5;
    if (distance < spacing) return;
    // Sample by traveled distance, not browser event frequency. A very long
    // coalesced segment is still interpolated with a bounded number of samples.
    const n = Math.min(reduced ? 10 : 22, Math.floor(distance / spacing));
    const previous = this.last;
    const nx = -dy / distance,
      ny = dx / distance;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      this.phase++;
      this.sample(
        previous.x + dx * t,
        previous.y + dy * t,
        nx,
        ny,
        reduced,
        false,
      );
    }
    this.last = { x, y };
  }

  end() {
    this.last = null;
  }

  acquire(limit) {
    if (this.active.length >= limit) return null;
    const p = this.free.pop() || {};
    this.active.push(p);
    return p;
  }

  sample(x, y, nx, ny, reduced, first) {
    const limit = reduced ? 85 : 280;
    const stem = this.acquire(limit);
    if (!stem) return;
    const tip = this.phase % 22 < 14 ? GOLD : LILAC;
    Object.assign(stem, {
      x,
      y,
      oldX: x,
      oldY: y,
      vx: random(-1.8, 1.8),
      vy: random(-3, 1),
      gravity: reduced ? 5 : 10,
      age: 0,
      life: reduced ? 0.47 : random(0.71, 0.99),
      size: reduced ? 1.05 : 1.4,
      angle: 0,
      turn: 0,
      color: tip,
      kind: "stroke",
      id: this.strokeId,
      order: this.phase,
    });
    if (reduced && this.phase % 3 !== 0) return;
    const count = reduced ? 1 : first ? 5 : this.phase % 3 === 0 ? 3 : 1;
    for (let j = 0; j < count; j++) {
      const p = this.acquire(limit);
      if (!p) return;
      const angle = random(0, TAU);
      const speed = reduced ? random(4, 14) : random(12, 48);
      const sideways = random(-20, 20);
      const vx = Math.cos(angle) * speed + nx * sideways;
      const vy = Math.sin(angle) * speed + ny * sideways;
      const prism = this.phase % 4 === 0 || (first && j === 2);
      Object.assign(p, {
        x,
        y,
        oldX: x,
        oldY: y,
        vx,
        vy,
        gravity: reduced ? 12 : random(24, 44),
        age: 0,
        life: reduced ? 0.48 : random(0.42, 1.02),
        size: prism ? random(2.1, 3.8) : random(0.6, 1.5),
        angle,
        turn: random(-1.4, 1.4),
        color: j % 3 === 2 ? PINK : prism ? LILAC : GOLD,
        kind: prism ? "prism" : "ember",
        id: 0,
        order: 0,
      });
    }
  }

  update(dt) {
    // Preserve emission order: only consecutive registration numbers in the
    // same stroke are joined. This avoids lines bridging separate gestures.
    let w = 0;
    const drag = Math.exp(-1.55 * dt);
    for (const p of this.active) {
      p.age += dt;
      if (p.age >= p.life) {
        this.free.push(p);
        continue;
      }
      p.oldX = p.x;
      p.oldY = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= drag;
      p.vy = p.vy * drag + p.gravity * dt;
      p.angle += p.turn * dt;
      this.active[w++] = p;
    }
    this.active.length = w;
  }

  draw(ctx, reduced) {
    let previous = null;
    for (const p of this.active) {
      const u = p.age / p.life;
      const alpha = (1 - u) ** 1.06;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      if (p.kind === "stroke") {
        if (
          previous &&
          p.id === previous.id &&
          p.order === previous.order + 1
        ) {
          ctx.beginPath();
          ctx.moveTo(previous.x, previous.y);
          ctx.lineTo(p.x, p.y);
          if (!reduced) {
            ctx.lineWidth = 4.2 * (1 - u * 0.55);
            ctx.globalAlpha = alpha * 0.22;
            ctx.stroke();
          }
          ctx.lineWidth = reduced ? 1.2 : 1.35;
          ctx.globalAlpha = alpha * 0.93;
          ctx.stroke();
        }
        previous = p;
      } else if (p.kind === "prism") {
        ctx.globalAlpha = alpha * 0.88;
        star(ctx, p.x, p.y, p.size * (1 - u * 0.38), p.angle);
      } else {
        ctx.globalAlpha = alpha * 0.91;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.oldX, p.oldY);
        ctx.lineTo(p.x, p.y + 0.6);
        ctx.stroke();
      }
    }
  }

  reset() {
    for (const p of this.active) this.free.push(p);
    this.active.length = 0;
    this.last = null;
    this.strokeId = 0;
    this.phase = 0;
  }

  dispose() {
    this.reset();
    this.free.length = 0;
  }
}

export class SkyGestures {
  constructor({ surface, launch, flash = () => {}, reduced = false }) {
    this.surface = surface;
    this.launch = launch;
    this.flash = flash;
    this.reduced = Boolean(reduced);
    this.pointer = null;
    this.fingers = new Set();
    this.ignoreUntilLifted = false;
    this.trail = new SparkTrail();
    this.ripples = [];
    this.dissolved = false;
    this.listeners = [];
    this.oldTouchAction = surface.style.touchAction;
    this.oldCallout = surface.style.webkitTouchCallout;
    surface.style.touchAction = "none";
    surface.style.webkitTouchCallout = "none";
    // A second finger may land on a cloud or on the lake instead of the sky.
    // Observe it during capture without consuming the other control's event.
    this.listen(
      window,
      "pointerdown",
      (e) => {
        if (e.pointerType !== "touch") return;
        this.fingers.add(e.pointerId);
        if (this.fingers.size > 1 && (this.pointer || e.target === surface)) {
          this.ignoreUntilLifted = true;
          this.forgetPointer();
        }
      },
      true,
    );
    this.listen(surface, "pointerdown", (e) => this.down(e));
    this.listen(surface, "pointermove", (e) => this.move(e));
    this.listen(window, "pointerup", (e) => this.up(e), true);
    this.listen(window, "pointercancel", (e) => this.cancel(e.pointerId), true);
    this.listen(surface, "lostpointercapture", (e) => {
      if (this.pointer?.id === e.pointerId) this.forgetPointer();
    });
    this.listen(surface, "contextmenu", (e) => e.preventDefault());
    this.listen(surface, "click", (e) => this.click(e));
    this.listen(window, "blur", () => this.reset());
    this.listen(document, "visibilitychange", () => {
      if (document.hidden) this.reset();
    });
  }

  listen(target, type, fn, opts = false) {
    target.addEventListener(type, fn, opts);
    this.listeners.push([target, type, fn, opts]);
  }

  get mode() {
    if (this.ignoreUntilLifted) return "blocked";
    if (!this.pointer) return "idle";
    if (this.pointer.drag) return "drag";
    return this.pointer.duration >= HOLD_START ? "hold" : "press";
  }

  get charge() {
    const p = this.pointer;
    return p && !p.drag
      ? clamp((p.duration - HOLD_START) / (FULL_CHARGE - HOLD_START), 0, 1)
      : 0;
  }

  get trailCount() {
    return this.trail.active.length;
  }

  down(e) {
    if (
      this.dissolved ||
      this.surface.disabled ||
      (e.button !== 0 && e.button !== -1)
    )
      return;
    if (e.target !== this.surface) return;
    if (this.ignoreUntilLifted) return;
    if (this.pointer || (e.isPrimary === false && e.pointerType === "touch")) {
      this.ignoreUntilLifted = true;
      this.forgetPointer();
      return;
    }
    if (e.cancelable) e.preventDefault();
    this.pointer = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      startStamp: e.timeStamp,
      duration: 0,
      drag: false,
    };
    try {
      this.surface.setPointerCapture(e.pointerId);
    } catch {
      /* Synthetic pointers may lack native capture. */
    }
  }

  point(x, y) {
    const p = this.pointer;
    if (!p) return;
    if (!p.drag && Math.hypot(x - p.startX, y - p.startY) >= DRAG_DISTANCE) {
      p.drag = true;
      this.trail.begin(p.startX, p.startY, this.reduced);
    }
    p.x = x;
    p.y = y;
    if (p.drag) this.trail.move(x, y, this.reduced);
  }

  move(e) {
    const p = this.pointer;
    if (!p || p.id !== e.pointerId || this.ignoreUntilLifted) return;
    if (e.cancelable) e.preventDefault();
    const samples = e.getCoalescedEvents?.();
    if (samples?.length)
      for (const s of samples) this.point(s.clientX, s.clientY);
    this.point(e.clientX, e.clientY);
  }

  up(e) {
    this.fingers.delete(e.pointerId);
    if (this.ignoreUntilLifted) {
      if (!this.fingers.size) this.ignoreUntilLifted = false;
      return;
    }
    const p = this.pointer;
    if (!p || e.pointerId !== p.id) return;
    this.point(e.clientX, e.clientY);
    p.duration = Math.max(
      p.duration,
      Math.max(0, (e.timeStamp - p.startStamp) / 1000),
    );
    const drag = p.drag,
      q = this.charge,
      held = p.duration >= HOLD_START;
    const x = p.x,
      y = p.y;
    this.forgetPointer();
    if (!drag) this.release(x, y, held ? 1.18 + 0.4 * q : 1);
  }

  click(e) {
    // Native keyboard/assistive activations have detail=0. Physical pointer
    // releases already launched on pointerup; discard their compatibility click.
    if (
      this.surface.disabled ||
      this.ignoreUntilLifted ||
      this.pointer ||
      e.detail !== 0 ||
      e.pointerType
    )
      return;
    const b = this.surface.getBoundingClientRect();
    if (!b.width || !b.height) return;
    this.release(b.left + b.width / 2, b.top + b.height * 0.43, 1);
  }

  release(x, y, power) {
    // When the scene changes or its renderer rejects an overloaded launch,
    // omit the confirmation pulse so the sky never signals a nonexistent shell.
    if (this.launch(x, y, power) === false) return;
    const charged = power > 1.05;
    if (this.ripples.length >= 6) this.ripples.shift();
    this.ripples.push({
      x,
      y,
      age: 0,
      life: charged ? 0.48 : 0.34,
      power,
      charged,
    });
    if (charged) this.flash(x, y, GOLD, this.reduced ? 0.09 : 0.18);
  }

  forgetPointer() {
    const id = this.pointer?.id;
    this.pointer = null;
    this.trail.end();
    if (id == null) return;
    try {
      if (this.surface.hasPointerCapture(id))
        this.surface.releasePointerCapture(id);
    } catch {
      /* A cancelled or synthetic pointer may already be released. */
    }
  }

  cancel(id) {
    this.fingers.delete(id);
    if (this.pointer?.id === id) this.forgetPointer();
    if (!this.fingers.size) this.ignoreUntilLifted = false;
  }

  update(dt) {
    if (this.dissolved || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.12);
    if (this.pointer) this.pointer.duration += dt;
    this.trail.update(dt);
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.age += dt;
      if (r.age >= r.life) this.ripples.splice(i, 1);
    }
  }

  draw(ctx, w, h) {
    if (
      this.dissolved ||
      !ctx ||
      (!this.pointer && !this.trailCount && !this.ripples.length)
    )
      return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    this.trail.draw(ctx, this.reduced);
    const p = this.pointer;
    if (p?.drag) {
      ctx.globalAlpha = 0.94;
      ctx.fillStyle = GOLD;
      star(ctx, p.x, p.y, this.reduced ? 3 : 5, p.duration * 0.4);
    } else if (p && p.duration > 0.065) {
      this.drawCharge(ctx, p);
    }
    for (const r of this.ripples) {
      const u = r.age / r.life;
      const rad = 6 + Math.sin((u * Math.PI) / 2) * (r.charged ? 31 : 17);
      ctx.strokeStyle = r.charged ? GOLD : LILAC;
      ctx.globalAlpha = (1 - u) * 0.73;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, rad, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawCharge(ctx, p) {
    const charge = this.charge;
    const op = clamp((p.duration - 0.065) / 0.16, 0, 1);
    const cx = p.x,
      cy = p.y;
    const radius = 20 + charge * (this.reduced ? 3 : 8);
    const halo = ctx.createRadialGradient(cx, cy, 1, cx, cy, radius * 1.5);
    halo.addColorStop(0, "rgba(255,237,181,.59)");
    halo.addColorStop(0.29, "rgba(255,205,136,.3)");
    halo.addColorStop(0.65, "rgba(218,184,255,.11)");
    halo.addColorStop(1, "rgba(204,175,249,0)");
    ctx.globalAlpha = op * 0.86;
    ctx.fillStyle = halo;
    ctx.fillRect(cx - radius * 1.5, cy - radius * 1.5, radius * 3, radius * 3);
    ctx.strokeStyle = LILAC;
    ctx.globalAlpha = op * 0.46;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = GOLD;
    ctx.globalAlpha = op * 0.97;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      cx,
      cy,
      radius,
      -Math.PI / 2,
      -Math.PI / 2 + TAU * Math.max(0.015, charge),
    );
    ctx.stroke();
    ctx.fillStyle = GOLD;
    star(ctx, cx, cy, 3 + charge * 4);
    if (this.reduced || p.duration < HOLD_START) return;
    const count = 4 + Math.floor(charge * 6);
    for (let i = 0; i < count; i++) {
      const phase = (p.duration * 0.9 + i * 0.187) % 1;
      const a = i * 2.39996 + phase * 0.72;
      const rr = radius + 3 + (1 - phase) * 15;
      ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.75;
      ctx.fillStyle = i % 3 === 0 ? LILAC : GOLD;
      star(
        ctx,
        cx + Math.cos(a) * rr,
        cy + Math.sin(a) * rr,
        1.3 + phase * 1.3,
        a,
      );
    }
  }

  setReduced(value) {
    this.reduced = Boolean(value);
    if (this.reduced && this.trail.active.length > 85) {
      this.trail.free.push(
        ...this.trail.active.splice(0, this.trail.active.length - 85),
      );
    }
  }

  reset() {
    this.forgetPointer();
    this.ignoreUntilLifted = false;
    this.fingers.clear();
    this.ripples.length = 0;
    this.trail.reset();
  }

  dispose() {
    if (this.dissolved) return;
    this.dissolved = true;
    this.reset();
    for (const [el, type, fn, opts] of this.listeners)
      el.removeEventListener(type, fn, opts);
    this.listeners.length = 0;
    this.surface.style.touchAction = this.oldTouchAction;
    this.surface.style.webkitTouchCallout = this.oldCallout;
    this.trail.dispose();
  }
}
