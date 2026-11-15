function star(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 - Math.PI / 2;
    const r = i % 2 ? size * 0.24 : size;
    ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
  }
  ctx.closePath();
  ctx.fill();
}

export function makeKeepsake(config) {
  const canvas = document.createElement("canvas");
  canvas.width = 1440;
  canvas.height = 2160;
  const c = canvas.getContext("2d");
  c.scale(2, 2);
  const background = c.createLinearGradient(0, 0, 720, 1080);
  background.addColorStop(0, config.colors.midnight);
  background.addColorStop(0.5, "#443c60");
  background.addColorStop(1, "#87758f");
  c.fillStyle = background;
  c.fillRect(0, 0, 720, 1080);
  const mist = c.createRadialGradient(360, 600, 0, 360, 600, 420);
  mist.addColorStop(0, "#c7a1bb66");
  mist.addColorStop(1, "#c7a1bb00");
  c.fillStyle = mist;
  c.fillRect(0, 0, 720, 1080);
  c.strokeStyle = "#dac29a66";
  c.lineWidth = 0.7;
  c.strokeRect(25, 25, 670, 1030);
  c.strokeRect(31, 31, 658, 1018);
  for (let i = 0; i < 130; i++) {
    const x = 40 + ((i * 137.51) % 640);
    const y = 40 + ((i * 73.7) % 960);
    c.globalAlpha = 0.25 + (i % 5) * 0.12;
    star(c, x, y, i % 12 ? 1.3 : 4.5, "#fbe6bc");
  }
  c.globalAlpha = 1;
  const text = (s, y, size, color = "#fff0d2", font = "serif") => {
    c.fillStyle = color;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = `${size}px ${font}`;
    c.fillText(s, 360, y, 595);
  };
  text("A LITTLE UNIVERSE, JUST FOR YOU", 95, 12, "#d2c0dd", "Georgia");
  star(c, 360, 154, 15, "#e9c68a");
  text(`${config.name}的${config.age}岁`, 228, 39);
  text(config.title, 285, 22, "#ddc8e4");
  // Two fireworks have independent layered outlines and their own lake reflection.
  function paintedBurst(x, y, r, color, count) {
    const off = document.createElement("canvas");
    off.width = 720;
    off.height = 1080;
    const g = off.getContext("2d");
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const length = r * (0.78 + Math.sin(i * 9.4) * 0.15);
      const inner = 0.32;
      const x1 = x + Math.cos(a) * length * inner;
      const y1 = y + Math.sin(a) * length * inner;
      const x2 = x + Math.cos(a) * length;
      const y2 = y + Math.sin(a) * length + 10;
      const grad = g.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `${color}00`);
      grad.addColorStop(1, color);
      g.strokeStyle = grad;
      g.lineWidth = 1.1;
      g.beginPath();
      g.moveTo(x1, y1);
      g.quadraticCurveTo(x2, y2 - 12, x2, y2);
      g.stroke();
      star(g, x2, y2, i % 5 ? 1.6 : 3.2, "#ffefcf");
    }
    c.drawImage(off, 0, 0);
    c.save();
    c.globalAlpha = 0.23;
    c.translate(0, 1080);
    c.scale(1, -0.38);
    c.drawImage(off, 0, 0);
    c.restore();
  }
  paintedBurst(210, 410, 111, config.colors.gold, 83);
  paintedBurst(488, 452, 92, config.colors.lavender, 65);
  text(String(config.age), 490, 132, "#fff0c9", "Georgia");
  c.fillStyle = config.colors.cream;
  c.globalAlpha = 0.94;
  c.beginPath();
  c.moveTo(120, 625);
  c.arcTo(640, 625, 640, 963, 40);
  c.arcTo(640, 963, 80, 963, 3);
  c.arcTo(80, 963, 80, 625, 3);
  c.arcTo(80, 625, 640, 625, 40);
  c.closePath();
  c.fill();
  c.globalAlpha = 1;
  text(`${config.name}，${config.age}岁生日快乐！`, 685, 28, "#624f67");
  config.letter.forEach((line, i) => text(line, 746 + i * 33, 16, "#786679"));
  text(config.signature, 909, 17, "#8d7389");
  text(
    "MADE OF LITTLE WISHES  /  " + config.age,
    1012,
    10,
    "#f2dfbf",
    "Georgia",
  );
  return canvas.toDataURL("image/png");
}
