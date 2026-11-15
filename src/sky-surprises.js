// Keep the magic in the sky: only these three small targets handle gestures.
// The rest of the sky still belongs to the fireworks and the sparkler.
function target(kind, text) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "surprise-" + kind;
  button.dataset.skySurprise = kind;
  button.setAttribute("aria-label", text);
  return button;
}
function cloudPainting() {
  const image = document.createElement("canvas");
  image.width = 390;
  image.height = 160;
  const ctx = image.getContext("2d");
  // Overlapping tapered wisps, with a light gold backlit rim.
  let seed = 71919;
  const random = () =>
    ((seed = (Math.imul(seed, 1664525) + 1013904223) | 0) >>> 0) / 4294967296;
  for (let i = 0; i < 110; i++) {
    const x = random(),
      distance = Math.sin(x * Math.PI) ** 0.65;
    const y = 87 + Math.sin(x * 8.1) * 9 - (random() - 0.23) * distance * 48;
    const span = 20 + random() * 40,
      rise = 4 + random() * 15;
    ctx.save();
    ctx.translate(15 + x * 352, y);
    ctx.scale(span, rise);
    ctx.rotate(-0.07);
    const color = y < 65 ? "252,228,204" : "210,202,233";
    const cloud = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    cloud.addColorStop(0, "rgba(" + color + ",.27)");
    cloud.addColorStop(0.55, "rgba(" + color + ",.15)");
    cloud.addColorStop(1, "rgba(" + color + ",0)");
    ctx.fillStyle = cloud;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  return image;
}

export class SkySurprises {
  constructor({
    host,
    environment,
    config,
    reduced = false,
    sound = () => {},
  }) {
    this.host = host;
    this.environment = environment;
    this.config = config;
    this.sound = sound;
    this.layer = document.createElement("div");
    this.layer.className = "sky-surprises";
    this.cloud = target(
      "cloud",
      "向两边划开薄云，读一份祝福。也可以连续轻点。",
    );
    this.cloud.innerHTML =
      '<span class="cloud-shape"></span><span class="surprise-hint">拨开薄云 <i>↔</i></span>';
    this.cloud.querySelector(".cloud-shape").append(cloudPainting());
    this.cloudNote = document.createElement("small");
    this.cloudNote.className = "surprise-cloud-note";
    this.cloudNote.setAttribute("role", "status");
    this.cloudNote.textContent =
      config.cloudBlessing || "愿每一片路过的云，都捎来一点好消息。";
    this.comet = target("comet", "接住这颗流星，抽一张祝福签。");
    this.comet.innerHTML =
      '<span class="comet-tail"></span><span class="comet-spark">✦</span><span class="surprise-hint">接住流星</span>';
    this.fortune = target("fortune", "轻点收起这张流星签");
    this.fortune.setAttribute("aria-live", "polite");
    const label = document.createElement("span");
    label.textContent = "流星捎来的签";
    this.fortuneText = document.createElement("strong");
    const dismiss = document.createElement("small");
    dismiss.textContent = "轻点收起";
    this.fortune.append(label, this.fortuneText, dismiss);
    this.water = target("water", "触碰湖面，泛起星光涟漪");
    this.water.innerHTML = '<span class="water-label"><i>≋</i> 轻点湖面</span>';
    this.layer.append(
      this.water,
      this.cloud,
      this.cloudNote,
      this.comet,
      this.fortune,
    );
    host.append(this.layer);
    this.listenerCleanup = [];
    const listen = (el, kind, cb) => {
      el.addEventListener(kind, cb);
      this.listenerCleanup.push(() => el.removeEventListener(kind, cb));
    };
    // Prevent interactions on these targets from reaching delegated handlers.
    for (const el of [this.water, this.cloud, this.comet, this.fortune]) {
      for (const type of [
        "pointerdown",
        "pointermove",
        "pointerup",
        "pointercancel",
        "click",
        "dblclick",
        "touchstart",
        "touchmove",
        "touchend",
      ]) {
        listen(el, type, (e) => e.stopPropagation());
      }
    }
    listen(this.cloud, "pointerdown", (e) => {
      if (this.cloudRest > 0 || this.drag || e.button !== 0) return;
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, distance: 0 };
      this.cloud.setPointerCapture?.(e.pointerId);
    });
    listen(this.cloud, "pointermove", (e) => {
      if (this.drag?.id !== e.pointerId || this.cloudRest > 0) return;
      const amount = Math.hypot(
        e.clientX - this.drag.x,
        (e.clientY - this.drag.y) * 0.65,
      );
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
      this.drag.distance += amount;
      this.addCloudProgress(
        amount / Math.max(64, this.cloud.clientWidth * 0.68),
      );
    });
    const stopDrag = (e) => {
      if (this.drag?.id !== e.pointerId) return;
      this.moved = this.drag.distance > 4;
      this.drag = null;
    };
    listen(this.cloud, "pointerup", stopDrag);
    listen(this.cloud, "pointercancel", stopDrag);
    listen(this.cloud, "click", (e) => {
      // Native keyboard activation has detail=0. A cloud is usable with a tap,
      // with several shorter swipes, or with a single deliberate sweep.
      if (!this.moved || e.detail === 0)
        this.addCloudProgress(e.detail === 0 ? 1 : 0.5);
      this.moved = false;
    });
    listen(this.comet, "click", () => this.catchComet());
    listen(this.fortune, "click", () => {
      this.fortune.hidden = true;
      this.fortuneRest = 0;
    });
    listen(this.water, "click", (e) => {
      const r = this.environment.canvas.getBoundingClientRect();
      const x = e.detail === 0 ? r.width * 0.3 : e.clientX - r.left;
      const y = e.detail === 0 ? r.height * 0.91 : e.clientY - r.top;
      if (this.environment.ripple(x, y)) {
        this.sound("water");
        this.waterGlint = 0.55;
        this.water.classList.add("has-ripple");
      }
    });
    this.setReduced(reduced);
    this.reset();
  }
  setReduced(value) {
    this.reduced = !!value;
    this.layer.classList.toggle("surprise-still", this.reduced);
    this.comet.style.transform = "";
    this.comet.style.opacity = "";
    this.comet.disabled = false;
    if (Number.isFinite(this.cometPhase)) this.positionComet();
  }
  reset() {
    this.time = 0;
    this.cloudRest = 0;
    this.cloudProgress = 0;
    this.fortuneRest = 0;
    this.waterGlint = 0;
    this.restingComet = 0;
    this.cometPhase = 0.78;
    this.drag = null;
    this.moved = false;
    this.bag = [];
    this.lastQuote = null;
    this.cloud.style.setProperty("--part", "0");
    this.cloud.classList.remove("is-parted");
    this.cloudNote.hidden = true;
    this.comet.hidden = false;
    this.fortune.hidden = true;
    this.fortune.style.opacity = "";
    this.cloud.setAttribute("aria-pressed", "false");
    this.water.classList.remove("has-ripple");
    this.comet.style.transform = "";
    this.environment.ripples.length = 0;
    this.positionComet();
  }
  addCloudProgress(amount) {
    if (this.cloudRest > 0 || amount <= 0) return;
    this.cloudProgress = Math.min(1, this.cloudProgress + amount);
    this.cloud.style.setProperty("--part", this.cloudProgress.toFixed(3));
    if (this.cloudProgress < 1) return;
    this.cloudRest = 6.5;
    this.cloudNote.hidden = false;
    this.cloud.classList.add("is-parted");
    this.cloud.setAttribute("aria-pressed", "true");
    this.sound("rise");
  }
  catchComet() {
    if (this.restingComet > 0) return;
    const input = Array.isArray(this.config.wishes) ? this.config.wishes : [];
    const wishes = input.filter((v) => typeof v === "string" && v.trim());
    if (!this.bag.length) {
      this.bag = [
        ...(wishes.length
          ? wishes
          : ["今天，抬头就有好运。", "愿你喜欢的事，都有下一次。"]),
      ];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
      if (
        this.bag.length > 1 &&
        this.bag[this.bag.length - 1] === this.lastQuote
      ) {
        [this.bag[0], this.bag[this.bag.length - 1]] = [
          this.bag[this.bag.length - 1],
          this.bag[0],
        ];
      }
    }
    this.lastQuote = this.bag.pop();
    this.fortuneText.textContent = this.lastQuote;
    this.fortune.setAttribute("aria-label", this.lastQuote + "。轻点收起");
    this.comet.hidden = true;
    this.fortune.hidden = false;
    this.fortune.style.opacity = "";
    this.fortuneRest = 5;
    this.restingComet = 6.1;
    this.cometPhase = 0;
    this.sound("star");
  }
  positionComet() {
    if (this.restingComet > 0) {
      this.comet.hidden = true;
      return;
    }
    // Eleven seconds per pass, followed by seven seconds of empty sky.
    // Staying inside the left 2/3 avoids the wind chimes on the far right.
    const phase = this.cometPhase;
    this.comet.hidden = !this.reduced && phase >= 11;
    if (this.comet.hidden) return;
    const fraction = this.reduced ? 0.5 : phase / 11;
    const distance = Math.min(430, this.environment.width * 0.39);
    const dx = this.reduced ? 0 : (1 - fraction) * distance;
    const dy = this.reduced
      ? 0
      : (fraction - 0.5) * this.environment.height * 0.064;
    const opacity = this.reduced
      ? 1
      : Math.min(1, phase / 0.7, (11 - phase) / 0.85);
    this.comet.style.opacity = String(Math.max(0, opacity));
    this.comet.disabled = opacity < 0.08;
    this.comet.style.transform =
      "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px)";
  }
  update(dt) {
    dt = Number.isFinite(dt) ? Math.min(0.25, Math.max(0, dt)) : 0;
    this.time += dt;
    if (this.restingComet > 0) this.restingComet -= dt;
    else if (!this.reduced) this.cometPhase = (this.cometPhase + dt) % 18;
    this.positionComet();
    if (this.cloudRest > 0 && (this.cloudRest -= dt) <= 0) {
      this.cloud.style.setProperty("--part", "0");
      this.cloudProgress = 0;
      this.cloudNote.hidden = true;
      this.cloud.classList.remove("is-parted");
      this.cloud.setAttribute("aria-pressed", "false");
    }
    if (this.fortuneRest > 0) {
      this.fortuneRest -= dt;
      if (this.fortuneRest <= 0) this.fortune.hidden = true;
      else if (!this.reduced && this.fortuneRest < 0.45)
        this.fortune.style.opacity = String(this.fortuneRest / 0.45);
    }
    if (this.waterGlint > 0 && (this.waterGlint -= dt) <= 0)
      this.water.classList.remove("has-ripple");
  }
  dispose() {
    this.listenerCleanup.forEach((fn) => fn());
    this.listenerCleanup.length = 0;
    this.drag = null;
    this.environment.ripples.length = 0;
    this.layer.remove();
  }
}
