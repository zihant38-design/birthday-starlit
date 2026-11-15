const starNotes = [
  { solfege: "Do", pitch: "C5", spark: "♪" },
  { solfege: "Mi", pitch: "E5", spark: "♫" },
  { solfege: "Sol", pitch: "G5", spark: "♬" },
];

function element(tag, className, parent, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  parent.appendChild(node);
  return node;
}

export class LittleGifts {
  constructor({ skyHost, letterHost, config, audio, reduced = false }) {
    this.audio = audio;
    this.reduced = reduced;
    this.stage = "";
    this.time = 0;
    this.currentWish = "";
    this.bag = [];
    const supplied = Array.isArray(config.wishes) ? config.wishes : [];
    this.wishes = [
      ...new Set(
        supplied
          .filter((v) => typeof v === "string")
          .map((v) => v.trim())
          .filter(Boolean),
      ),
    ];
    if (!this.wishes.length)
      this.wishes.push(config.greeting || "愿今天的好心情，一直陪着你。");
    this.makeBells(skyHost);
    this.makeLetter(letterHost);
    this.setReduced(reduced);
    this.setStage("gift");
  }

  makeBells(host) {
    this.rack = element("aside", "lg-chimes", host);
    this.rack.setAttribute("aria-label", "生日星星风铃");
    const frame = element("div", "lg-chime-frame", this.rack);
    frame.setAttribute("aria-hidden", "true");
    element("i", "lg-bracket", frame);
    element("i", "lg-pin", frame);
    this.bells = starNotes.map(({ solfege, pitch, spark }, index) => {
      const string = element(
        "div",
        "lg-pendant lg-pendant-" + index,
        this.rack,
      );
      const cord = element("i", "lg-cord", string);
      cord.setAttribute("aria-hidden", "true");
      const button = element("button", "lg-star-hit", string);
      button.type = "button";
      button.title = "敲响星星 · " + solfege;
      button.setAttribute("aria-label", button.title);
      const star = element("span", "lg-gem", button);
      star.setAttribute("aria-hidden", "true");
      element("i", "lg-cut-star", star);
      element("i", "lg-drop", star);
      const note = element("span", "lg-note", button);
      note.setAttribute("aria-hidden", "true");
      note.textContent = spark;
      const item = { string, button, note, age: Infinity, index };
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.stage !== "fireworks") return;
        item.age = 0;
        this.paintBell(item);
        this.audio?.chime?.(index);
        this.status.textContent = "星星风铃，" + solfege + "，" + pitch;
      });
      return item;
    });
    const caption = element("span", "lg-chime-hint", this.rack, "轻敲星铃");
    caption.setAttribute("aria-hidden", "true");
    this.status = element("span", "lg-reader", this.rack);
    this.status.setAttribute("role", "status");
  }

  makeLetter(host) {
    this.pocket = element("div", "lg-pocket", host);
    const signature = host.querySelector(".signature");
    if (signature?.parentNode === host)
      host.insertBefore(this.pocket, signature);
    this.opener = element("button", "lg-envelope-button", this.pocket);
    this.opener.type = "button";
    this.opener.setAttribute("aria-expanded", "false");
    const envelope = element("span", "lg-envelope", this.opener);
    envelope.setAttribute("aria-hidden", "true");
    element("i", "lg-flap", envelope);
    element("i", "lg-wax", envelope, "✧");
    this.label = element(
      "span",
      "lg-open-label",
      this.opener,
      "拆一张生日礼签",
    );
    const arrow = element("span", "lg-toggle-arrow", this.opener, "⌄");
    arrow.setAttribute("aria-hidden", "true");

    this.slot = element("div", "lg-slip-slot", this.pocket);
    this.slot.hidden = true;
    const paper = element("div", "lg-slip-paper", this.slot);
    this.slip = element("p", "lg-slip-text", paper);
    this.slip.setAttribute("aria-live", "polite");
    this.slip.setAttribute("aria-atomic", "true");
    this.again = element("button", "lg-again", paper, "换一句 ↻");
    this.again.type = "button";
    this.again.hidden = this.wishes.length < 2;
    this.opener.addEventListener("click", () => {
      if (this.stage !== "ending") return;
      const open = this.slot.hidden;
      this.openPocket(open);
      if (open && !this.currentWish) this.drawWish();
    });
    this.again.addEventListener("click", () => {
      if (this.stage === "ending" && !this.slot.hidden) this.drawWish();
    });
  }

  drawWish() {
    if (!this.bag.length) {
      this.bag = [...this.wishes];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
      const last = this.bag.length - 1;
      if (last > 0 && this.bag[last] === this.currentWish) {
        [this.bag[0], this.bag[last]] = [this.bag[last], this.bag[0]];
      }
    }
    this.currentWish = this.bag.pop();
    this.slip.textContent = this.currentWish;
    this.reveal?.cancel();
    if (!this.reduced && this.slip.animate) {
      this.reveal = this.slip.animate(
        [
          { opacity: 0.15, transform: "translateY(5px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 270, easing: "ease-out" },
      );
    }
    this.audio?.chime?.(1);
  }

  openPocket(open) {
    this.slot.hidden = !open;
    this.opener.setAttribute("aria-expanded", String(open));
    this.label.textContent = open
      ? "收起生日礼签"
      : this.currentWish
        ? "看看刚才的礼签"
        : "拆一张生日礼签";
    this.pocket.classList.toggle("lg-open", open);
  }

  paintBell(bell) {
    const { string, note, age, index } = bell;
    const decay = Math.exp(-2.7 * age);
    const swing = this.reduced
      ? 0
      : 1.15 * Math.sin(this.time * 0.98 + index * 1.3) +
        (age < 2.2
          ? 16 * Math.cos(age * 13.5) * decay * (index % 2 ? -1 : 1)
          : 0);
    string.style.transform = "rotate(" + swing.toFixed(2) + "deg)";
    string.classList.toggle("lg-ringing", age < 0.66);
    note.style.opacity = age < 1 ? String(Math.min(1, (1 - age) * 1.7)) : "0";
    if (age < 1)
      note.style.transform = this.reduced
        ? "none"
        : "translate(" + -5 * age + "px," + -19 * age + "px)";
  }

  setReduced(value) {
    this.reduced = !!value;
    this.rack.classList.toggle("lg-still", this.reduced);
    this.pocket.classList.toggle("lg-still", this.reduced);
    if (this.reduced) this.reveal?.cancel();
    this.bells.forEach((bell) => this.paintBell(bell));
  }

  setStage(stage) {
    if (this.stage === stage) return;
    this.stage = stage;
    this.rack.hidden = stage !== "fireworks";
    this.pocket.hidden = stage !== "ending";
    this.time = 0;
    for (const bell of this.bells) {
      bell.age = Infinity;
      this.paintBell(bell);
    }
    this.openPocket(false);
    this.reveal?.cancel();
  }

  update(dt) {
    if (this.stage !== "fireworks" || document.hidden) return;
    const elapsed = Math.min(0.12, Math.max(0, dt || 0));
    this.time += elapsed;
    for (const bell of this.bells) {
      if (this.reduced && bell.age >= 1 && bell.note.style.opacity === "0")
        continue;
      bell.age += elapsed;
      this.paintBell(bell);
    }
  }

  dispose() {
    this.stage = "";
    this.reveal?.cancel();
    this.rack.remove();
    this.pocket.remove();
  }
}
