// An independent vector drawing for devices without a working WebGL context.
// Its candle timing matches CakeView, including a short wisp after extinguishing.
const TAU = Math.PI * 2;
export class PaintedCake {
  constructor(host, reduced = false, age = "19") {
    this.host = host;
    this.age = age;
    this.reduced = reduced;
    this.time = 0;
    this.blow = 0;
    this.smokeAge = Infinity;
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText =
      "display:block;width:100%;height:100%;pointer-events:none";
    this.canvas.setAttribute("role", "img");
    this.canvas.setAttribute(
      "aria-label",
      "双层奶油蛋糕、草莓、金星糖和" + this.age + "岁蜡烛",
    );
    host.append(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) {
      const tile = document.createElement("div");
      tile.style.cssText =
        "height:100%;display:grid;place-content:center;text-align:center;font:2.2em Georgia;color:#ffe4aa";
      tile.innerHTML = '<span></span><span style="font-size:2.6em">🎂</span>';
      tile.firstElementChild.textContent = "✦　" + this.age + "　✦";
      host.append(tile);
      this.canvas.hidden = true;
      this.tile = tile;
    }
    this.resize();
  }
  resize() {
    this.w = Math.max(1, this.host.clientWidth);
    this.h = Math.max(1, this.host.clientHeight);
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.update(0);
  }
  setBlowProgress(p) {
    if (p >= 0.94 && this.blow < 0.94) this.smokeAge = 0;
    if (p < 0.94) this.smokeAge = Infinity;
    this.blow = p;
    if (this.tile)
      this.tile.firstElementChild.textContent =
        p >= 0.94 ? "✧　" + this.age + "　✧" : "✦　" + this.age + "　✦";
  }
  ellipse(x, y, rx, ry, fill) {
    const c = this.ctx;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, TAU);
    c.fillStyle = fill;
    c.fill();
  }
  grad(x, y, ex, ey, colors) {
    const g = this.ctx.createLinearGradient(x, y, ex, ey);
    colors.forEach((color, i) =>
      g.addColorStop(i / (colors.length - 1), color),
    );
    return g;
  }
  tier(y, rx, ry, h, cols, cream) {
    const c = this.ctx;
    const shade = this.grad(-rx, y, rx, y, cols);
    c.fillStyle = shade;
    c.beginPath();
    c.moveTo(-rx, y);
    c.ellipse(0, y, rx, ry, 0, Math.PI, TAU);
    c.lineTo(rx, y + h);
    c.ellipse(0, y + h, rx, ry, 0, 0, Math.PI);
    c.closePath();
    c.fill();
    this.ellipse(0, y, rx, ry, cream);
    c.beginPath();
    c.moveTo(-rx, y);
    for (let i = 0; i <= 100; i++) {
      let a = Math.PI - (i * Math.PI) / 100,
        x = rx * Math.cos(a),
        v = Math.sin(a);
      c.lineTo(
        x,
        y + ry * v + 7 + v * 10 * Math.pow(0.5 + 0.5 * Math.cos(13 * a), 5),
      );
    }
    c.ellipse(0, y, rx, ry, 0, 0, Math.PI);
    c.closePath();
    c.fillStyle = this.grad(0, y, 0, y + ry + 17, [cream, "#ffe5cc"]);
    c.fill();
  }
  berry(x, y, sz, tilt) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.rotate(tilt);
    c.scale(sz, sz);
    c.fillStyle = this.grad(-10, 0, 9, 3, ["#ff9a9d", "#df5a6b", "#a63e58"]);
    c.beginPath();
    c.moveTo(0, 13);
    c.bezierCurveTo(-3, 13, -12, 4, -11, -3);
    c.bezierCurveTo(-11, -15, 10, -15, 11, -3);
    c.bezierCurveTo(12, 4, 5, 12, 0, 13);
    c.fill();
    for (let j = 0; j < 4; j++)
      for (let i = 0; i < 3; i++) {
        let x = (i - 1) * 4.6 + (j % 2) * 1.1;
        this.ellipse(x, -6 + j * 4.3, 0.69, 1.2, "#ffc293");
      }
    c.fillStyle = "#668b64";
    c.beginPath();
    c.moveTo(-1, -10);
    c.lineTo(-9, -12);
    c.lineTo(-5, -8);
    c.lineTo(-11, -7);
    c.lineTo(-2, -6);
    c.lineTo(1, -9);
    c.lineTo(7, -7);
    c.lineTo(4, -10);
    c.lineTo(9, -13);
    c.closePath();
    c.fill();
    c.restore();
  }
  flower(x, y, k) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(k, k);
    for (let i = 0; i < 8; i++) {
      c.save();
      c.rotate((i * TAU) / 8);
      this.ellipse(4, 0, 6, 2.9, this.grad(0, 0, 6, 3, ["#fff5de", "#edcfb6"]));
      c.restore();
    }
    this.ellipse(0, -1, 4, 3, "#fff4db");
    c.restore();
  }
  star(x, y, r, rot) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + (i * TAU) / 10,
        rad = i % 2 ? r * 0.47 : r;
      c[i ? "lineTo" : "moveTo"](Math.cos(angle) * rad, Math.sin(angle) * rad);
    }
    c.closePath();
    c.fillStyle = this.grad(-r, -r, r, r, ["#fff0af", "#d6a55d"]);
    c.fill();
    c.strokeStyle = "#ecc088";
    c.lineWidth = 1;
    c.stroke();
    c.restore();
  }
  candle(x, digit, index) {
    const c = this.ctx,
      y = -66;
    c.fillStyle = "#ac835e";
    c.fillRect(x - 1.4, y - 1, 2.8, 8);
    c.font =
      this.age.length > 2
        ? "bold 49px Georgia,serif"
        : "bold 59px Georgia,serif";
    c.textAlign = "center";
    c.textBaseline = "alphabetic";
    c.lineJoin = "round";
    c.lineWidth = 4;
    c.strokeStyle = index % 2 ? "#b96e8a" : "#b98256";
    c.strokeText(digit, x + 0.7, y + 0.8);
    c.fillStyle = this.grad(x - 8, y - 42, x + 10, y, [
      index % 2 ? "#ffcdda" : "#ffe6a4",
      index % 2 ? "#ed9fb2" : "#edb975",
    ]);
    c.fillText(digit, x, y);
    const b = y - (c.measureText(digit).actualBoundingBoxAscent || 40);
    c.strokeStyle = "#6c514c";
    c.lineWidth = 1.7;
    c.beginPath();
    c.moveTo(x, b);
    c.lineTo(x + 0.5, b - 5);
    c.stroke();
    const u = 1 - Math.min(1, Math.max(0, (this.blow - 0.18) / 0.76));
    if (u > 0.01) {
      const wobble = this.reduced ? 0 : Math.sin(this.time * 6 + x) * 1.25;
      c.save();
      c.translate(x, b - 4);
      c.scale(u, u);
      const g = c.createRadialGradient(0, -5, 1, 0, -5, 22);
      g.addColorStop(0, "rgba(255,215,126,.74)");
      g.addColorStop(1, "rgba(255,180,84,0)");
      this.ellipse(0, -6, 22, 22, g);
      c.fillStyle = "#ffbb66";
      c.beginPath();
      c.moveTo(0, 0);
      c.bezierCurveTo(-7, -2, -2, -9, wobble + this.blow * 3, -15);
      c.bezierCurveTo(1, -9, 8, -4, 0, 0);
      c.fill();
      this.ellipse(0.1, -4.2, 1.9, 3.8, "#fff5c0");
      c.restore();
    } else if (this.smokeAge < 1.8) {
      const t = this.smokeAge / 1.8;
      c.strokeStyle = "rgba(224,213,224," + 0.58 * (1 - t) + ")";
      c.lineWidth = 1 + t;
      c.beginPath();
      c.moveTo(x, b - 4 - t * 24);
      c.bezierCurveTo(
        x - 7,
        b - 7 - t * 26,
        x + 8,
        b - 13 - t * 30,
        x + 1,
        b - 19 - t * 31,
      );
      c.stroke();
    }
  }
  update(dt = 0) {
    const c = this.ctx;
    if (!c) return;
    this.time += dt;
    this.smokeAge += dt;
    const w = this.w,
      h = this.h,
      zoom = Math.min(w / 257, h / 278);
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    c.translate(w / 2, h * 0.56);
    c.scale(zoom, zoom);
    const shadow = c.createRadialGradient(0, 100, 0, 0, 100, 100);
    shadow.addColorStop(0, "#16132966");
    shadow.addColorStop(1, "#17152e00");
    c.save();
    c.translate(0, 100);
    c.scale(1, 0.15);
    c.translate(0, -100);
    this.ellipse(0, 100, 102, 95, shadow);
    c.restore();
    this.ellipse(0, 89, 49, 9, "#cfac9a");
    this.ellipse(0, 86, 47, 9, "#f5e2d4");
    c.fillStyle = this.grad(-24, 0, 25, 0, ["#d7bbae", "#fff3e4", "#c5aaa4"]);
    c.beginPath();
    c.moveTo(-36, 66);
    c.quadraticCurveTo(-9, 79, -33, 85);
    c.quadraticCurveTo(0, 95, 33, 85);
    c.quadraticCurveTo(10, 77, 36, 66);
    c.fill();
    this.ellipse(0, 61, 110, 26, "#be9d80");
    this.ellipse(0, 58, 110, 25, "#e5c29b");
    this.ellipse(0, 55, 108, 25, "#f6e5dd");
    this.tier(9, 92, 24, 40, ["#ba9fc3", "#d7c3dd", "#a38eae"], "#fbebdf");
    c.strokeStyle = "#ead0ae";
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(0, 43, 92, 22, 0, 0, Math.PI);
    c.stroke();
    for (let i = 0; i < 20; i++) {
      let a = (TAU * i) / 20;
      this.flower(Math.cos(a) * 76, 10 + Math.sin(a) * 19, 0.7);
    }
    this.tier(-39, 63, 17, 43, ["#e9bbc2", "#f5d3cc", "#c49ba7"], "#fff1df");
    for (let i = 0; i < 10; i++) {
      let a = (TAU * i) / 10;
      this.flower(Math.cos(a) * 50, -39 + Math.sin(a) * 13, 0.7);
    }
    this.berry(-33, -52, 1.05, -0.34);
    this.berry(36, -54, 0.84, 0.28);
    this.star(-46, -56, 10, -0.23);
    [...this.age].forEach((digit, index) => {
      const x =
        2 +
        (index - (this.age.length - 1) / 2) * (this.age.length > 2 ? 24 : 26);
      this.candle(x, digit, index);
    });
    this.berry(-43, -31, 0.8, -0.26);
    this.star(36, -37, 9, 0.18);
    this.berry(70, 14, 0.78, 0.3);
    this.star(-72, 10, 8, -0.27);
    for (let i = 0; i < 27; i++) {
      let a = i * 2.399,
        top = i < 12;
      this.ellipse(
        Math.cos(a) * (top ? 39 : 75),
        (top ? -37 : 11) + Math.sin(a) * (top ? 11 : 20),
        1.75,
        1.35,
        "#dab67d",
      );
    }
  }
  snapshot() {
    return this.ctx ? this.canvas.toDataURL("image/png") : null;
  }
  dispose() {
    this.canvas.remove();
    this.tile?.remove();
  }
}
